import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import { hybridSearch } from "../services/searchService.js";
import { streamAnswer, generateDiagram, generateTitle } from "../services/ai/groqService.js";
import { getHistory, saveHistory } from "../services/historyService.js";

const MIN_SCORE = 0.005; // filter out weakly-related chunks

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

    // Image mode — regular JSON, no SSE needed
    if (mode === "image") {
      const [history, chunks] = await Promise.all([
        getHistory(chatId),
        hybridSearch(query, userId, { chatId }),
      ]);
      const relevant = chunks.filter((c) => c.hybridScore >= MIN_SCORE);

      if (!relevant.length) {
        return res.json({
          mode: "image",
          answer: "I couldn't find relevant content in your documents for that question.",
          sources: [],
        });
      }

      const diagram = await generateDiagram(query, relevant, history);
      if (diagram === "NO_RELEVANT_CONTENT") {
        return res.json({
          mode: "image",
          answer: "I couldn't find relevant content in your documents to generate a diagram.",
          sources: [],
        });
      }

      const sources = buildSources(relevant);
      saveHistory(chatId, userId, query, diagram, sources, "image");

      let newTitle = null;
      if (history.length === 0) {
        newTitle = await generateTitle(query).catch(() => null);
        if (newTitle) await Chat.findByIdAndUpdate(chatId, { title: newTitle }).catch(() => {});
      }

      return res.json({ mode: "image", diagram, sources, ...(newTitle && { title: newTitle }) });
    }

    // Text / Audio — SSE streaming
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sse = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);
    const sseEnd = (payload) => { sse(payload); res.end(); };

    // Step 1: searching
    sse({ status: "searching" });

    const [history, chunks] = await Promise.all([
      getHistory(chatId),
      hybridSearch(query, userId, { chatId }),
    ]);

    const relevant = chunks.filter((c) => c.hybridScore >= MIN_SCORE);

    if (!relevant.length) {
      sse({ token: "I couldn't find any relevant content in your uploaded documents for that question." });
      return sseEnd({ done: true, sources: [] });
    }

    const sourcesPayload = buildSources(relevant);

    // Step 2: generating
    sse({ status: "generating" });

    try {
      const fullAnswer = await streamAnswer(query, relevant, history, res);
      saveHistory(chatId, userId, query, fullAnswer, sourcesPayload);

      let newTitle = null;
      if (history.length === 0) {
        newTitle = await generateTitle(query).catch(() => null);
        if (newTitle) await Chat.findByIdAndUpdate(chatId, { title: newTitle }).catch(() => {});
      }

      return sseEnd({ done: true, sources: sourcesPayload, ...(newTitle && { title: newTitle }) });
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
