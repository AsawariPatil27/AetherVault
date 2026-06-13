import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import { hybridSearch } from "../services/searchService.js";
import { streamAnswer, generateDiagram } from "../services/ai/groqService.js";

const buildSources = (chunks) =>
  chunks.map((c) => ({
    text: c.text,
    fileName: c.metadata?.fileName,
    sourceType: c.metadata?.sourceType,
    chunkIndex: c.metadata?.chunkIndex,
    hybridScore: c.hybridScore,
    mediaUrl: c.mediaUrl,
  }));

export const askQuestion = async (req, res) => {
  try {
    const { query, chatId, mode = "text" } = req.body ?? {};
    const userId = req.user.id;

    if (!query?.trim()) return res.status(400).json({ error: "query is required" });
    if (!chatId?.trim()) return res.status(400).json({ error: "chatId is required" });
    if (!mongoose.Types.ObjectId.isValid(chatId))
      return res.status(400).json({ error: "Invalid chatId" });

    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    console.log(`[ask] retrieval start — query: "${query}"`);
    const chunks = await hybridSearch(query, userId, { chatId });
    console.log(`[ask] retrieval done — ${chunks.length} chunks`);

    // Image mode — regular JSON response (Mermaid needs full code, no streaming)
    if (mode === "image") {
      if (!chunks.length) {
        return res.json({
          mode: "image",
          answer: "I couldn't find any relevant content in your uploaded documents for that question.",
          sources: [],
        });
      }

      const sourcesPayload = buildSources(chunks);
      console.log("[ask] generating Mermaid diagram...");
      const diagram = await generateDiagram(query, chunks);

      if (diagram === "NO_RELEVANT_CONTENT") {
        return res.json({
          mode: "image",
          answer: "I couldn't find relevant content in your documents to generate a diagram for that question.",
          sources: [],
        });
      }

      console.log("[ask] diagram ready");
      return res.json({ mode: "image", diagram, sources: sourcesPayload });
    }

    // Text / Audio — SSE streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sseEnd = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      res.end();
    };

    if (!chunks.length) {
      res.write(`data: ${JSON.stringify({ token: "I couldn't find any relevant content in your uploaded documents for that question." })}\n\n`);
      return sseEnd({ done: true, sources: [] });
    }

    const sourcesPayload = buildSources(chunks);

    try {
      console.log("[ask] streaming Groq...");
      await streamAnswer(query, chunks, res);
      console.log("[ask] stream complete");
      return sseEnd({ done: true, sources: sourcesPayload });
    } catch (streamErr) {
      console.error("[ask] stream error:", streamErr);
      return sseEnd({ error: streamErr.message || "Failed to generate answer" });
    }
  } catch (err) {
    console.error("ASK ERROR:", err);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: err.message || "Server error" })}\n\n`);
      return res.end();
    }
    return res.status(500).json({ error: "Failed to generate answer", detail: err.message });
  }
};
