import Document from "../models/Document.js";
import mongoose from "mongoose";
import { parseFile } from "../services/parsers/parserEngine.js";
import { chunkText } from "../services/etl/chunker.js";
import { embedChunks } from "../services/etl/embeddingService.js";
import Chunk from "../models/Chunk.js";
import Chat from "../models/Chat.js";

export const uploadHandler = async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const userId = req.user.id;

    const rawChatId =
      typeof req.body?.chatId === "string" ? req.body.chatId.trim() : "";

    if (!rawChatId) {
      return res.status(400).json({ error: "chatId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(rawChatId)) {
      return res.status(400).json({ error: "Invalid chatId" });
    }

    const chat = await Chat.findById(rawChatId);

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (chat.userId !== userId) {
      return res.status(403).json({ error: "Chat does not belong to this user" });
    }

    const chatId = chat._id;

    const savedDocs = [];

    for (const file of files) {
      let type = "unknown";

      if (file.mimetype === "application/pdf") type = "pdf";
      else if (file.mimetype.startsWith("image/")) type = "image";
      else if (file.mimetype.startsWith("audio/")) type = "audio";
      else if (file.mimetype.startsWith("video/")) type = "video";

      const fileKey = file.key || file.location;

      if (!fileKey) {
        return res.status(500).json({ error: "File upload failed (no key)" });
      }

      const doc = await Document.create({
        userId,
        chatId,
        fileName: file.originalname,
        fileKey,
        fileType: type,
      });

      savedDocs.push(doc);

      // 🚀 BACKGROUND PIPELINE
      setImmediate(async () => {
        try {
          console.log(`🔄 Processing: ${doc.fileName}`);

          // ✅ STEP 1: PARSE
          const text = await parseFile(doc.fileKey, doc.fileType);

          console.log("📄 RAW TEXT:", text);
          console.log("📏 TEXT LENGTH:", text?.length);

          if (!text || text.trim().length === 0) {
            console.warn(`⚠️ No text extracted: ${doc.fileName}`);
            return;
          }

          // ✅ STEP 2: CHUNK
          const chunks = await chunkText(text);

          console.log("✂️ CHUNKS:", chunks);
          console.log("🔢 CHUNK COUNT:", chunks.length);

          // ✅ FALLBACK (VERY IMPORTANT)
          if (!chunks.length) {
            console.warn(`⚠️ Using fallback chunk for: ${doc.fileName}`);

            let embedding = [];
            try {
              const vectors = await embedChunks([text]);
              embedding = vectors[0] || [];
            } catch (embedErr) {
              console.error("❌ Embedding failed (fallback chunk):", embedErr);
            }

            await Chunk.create({
              userId,
              chatId,
              documentId: doc._id,
              text: text,
              embedding,
              metadata: { chunkIndex: 0 },
            });

            return;
          }

          // ✅ STEP 3: EMBED
          let embeddings = [];
          try {
            embeddings = await embedChunks(chunks);
          } catch (embedErr) {
            console.error("❌ Embedding failed:", embedErr);
            embeddings = chunks.map(() => []);
          }

          // ✅ STEP 4: STORE
          const chunkDocs = chunks.map((chunk, index) => ({
            userId,
            chatId,
            documentId: doc._id,
            text: chunk,
            embedding: embeddings[index] || [],
            metadata: {
              chunkIndex: index,
            },
          }));

          await Chunk.insertMany(chunkDocs);

          console.log(`✅ Done: ${doc.fileName} | Chunks: ${chunks.length}`);
        } catch (err) {
          console.error("❌ Pipeline error:", err);
        }
      });
    }

    res.json({
      message: "Upload successful, processing started 🚀",
      chatId: chatId.toString(),
      documents: savedDocs,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ error: "Upload failed" });
  }
};
