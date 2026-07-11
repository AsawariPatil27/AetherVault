import Document from "../models/Document.js";
import mongoose from "mongoose";
import { parseFile } from "../services/parsers/parserEngine.js";
import { chunkText } from "../services/etl/chunker.js";
import { embedChunks, embedImage } from "../services/etl/embeddingService.js";
import Chunk from "../models/Chunk.js";
import Chat from "../models/Chat.js";
import { getSignedFileUrl } from "../utils/s3SignedUrl.js";

export const uploadHandler = async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0)
      return res.status(400).json({ error: "No files uploaded" });

    const userId = req.user.id;
    const rawChatId = typeof req.body?.chatId === "string" ? req.body.chatId.trim() : "";

    if (!rawChatId) return res.status(400).json({ error: "chatId is required" });
    if (!mongoose.Types.ObjectId.isValid(rawChatId))
      return res.status(400).json({ error: "Invalid chatId" });

    const chat = await Chat.findById(rawChatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (chat.userId !== userId) return res.status(403).json({ error: "Chat does not belong to this user" });

    const chatId = chat._id;

    // Save all Document records first
    const savedDocs = [];
    for (const file of files) {
      let type = "unknown";
      if (file.mimetype === "application/pdf") type = "pdf";
      else if (file.mimetype.startsWith("image/")) type = "image";
      else if (file.mimetype.startsWith("audio/")) type = "audio";
      else if (file.mimetype.startsWith("video/")) type = "video";

      const fileKey = file.key || file.location;
      if (!fileKey) return res.status(500).json({ error: "File upload failed (no key)" });

      const doc = await Document.create({ userId, chatId, fileName: file.originalname, fileKey, fileType: type });
      savedDocs.push({ doc, type });
    }

    // Switch to SSE for pipeline progress
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sse = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

    sse({ event: "saved", documents: savedDocs.map(({ doc }) => ({ _id: doc._id, fileName: doc.fileName, fileType: doc.fileType, createdAt: doc.createdAt })) });

    // Process each file sequentially with live updates
    for (const { doc, type } of savedDocs) {
      const name = doc.fileName;

      try {
        // ── IMAGE FAST PATH ──────────────────────────────────────────────────
        // Images skip parse / chunk / BAAI-embed entirely.
        // CLIP embeds the raw pixels; the vision LLM reads the image at query time.
        if (type === "image") {
          sse({ event: "step", file: name, step: "embedding", message: `Generating CLIP embedding for ${name}…` });

          let clipEmbedding;
          try {
            const signedUrl = await getSignedFileUrl(doc.fileKey);
            clipEmbedding = await embedImage(signedUrl);
          } catch (err) {
            console.warn(`[upload] CLIP embedding failed for ${name}:`, err.message);
          }

          sse({ event: "step", file: name, step: "storing", message: `Saving to database…` });
          await Chunk.create({
            userId, chatId,
            documentId: doc._id,
            text: `[image: ${name}]`,
            embedding: [],
            clipEmbedding,
            metadata: { chunkIndex: 0, sourceType: "image", fileKey: doc.fileKey, fileName: name },
          });

          sse({ event: "file_done", file: name, chunks: 1 });
          continue;
        }

        // ── TEXT / AUDIO / VIDEO PATH ────────────────────────────────────────
        // Step 1: Parse
        sse({ event: "step", file: name, step: "parsing", message: `Parsing ${name}…` });
        const text = await parseFile(doc.fileKey, type);

        if (!text || text.trim().length === 0) {
          sse({ event: "step", file: name, step: "warning", message: `No text extracted from ${name}` });
          sse({ event: "file_done", file: name, chunks: 0 });
          continue;
        }

        // Step 2: Chunk
        sse({ event: "step", file: name, step: "chunking", message: `Splitting ${name} into chunks…` });
        let chunks = await chunkText(text, type);
        if (!chunks.length) chunks = [text];

        // Step 3: Embed
        sse({ event: "step", file: name, step: "embedding", message: `Embedding ${chunks.length} chunk${chunks.length !== 1 ? "s" : ""}…` });
        let embeddings = [];
        try {
          embeddings = await embedChunks(chunks);
        } catch {
          embeddings = chunks.map(() => []);
        }

        // Step 4: Store
        sse({ event: "step", file: name, step: "storing", message: `Saving to database…` });
        await Chunk.insertMany(chunks.map((chunk, index) => ({
          userId, chatId,
          documentId: doc._id,
          text: chunk,
          embedding: embeddings[index] || [],
          metadata: { chunkIndex: index, sourceType: type, fileKey: doc.fileKey, fileName: name },
        })));

        sse({ event: "file_done", file: name, chunks: chunks.length });
      } catch (err) {
        console.error(`❌ Pipeline error for ${name}:`, err);
        sse({ event: "file_error", file: name, message: err.message });
      }
    }

    sse({ event: "done" });
    res.end();
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ event: "error", message: error.message })}\n\n`);
      return res.end();
    }
    res.status(500).json({ error: "Upload failed" });
  }
};
