import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import { hybridSearch } from "../services/searchService.js";
import { generateAnswer } from "../services/ai/groqService.js";

export const askQuestion = async (req, res) => {
  try {
    const { query, chatId } = req.body ?? {};
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

    if (!chunks.length) {
      return res.json({
        answer: "I couldn't find any relevant content in your uploaded documents for that question.",
        sources: [],
      });
    }

    console.log("[ask] calling Groq...");
    const answer = await generateAnswer(query, chunks);
    console.log("[ask] Groq responded");

    return res.json({
      answer,
      sources: chunks.map((c) => ({
        text: c.text,
        fileName: c.metadata?.fileName,
        sourceType: c.metadata?.sourceType,
        chunkIndex: c.metadata?.chunkIndex,
        hybridScore: c.hybridScore,
        mediaUrl: c.mediaUrl,
      })),
    });
  } catch (err) {
    console.error("ASK ERROR:", err);
    return res.status(500).json({ error: "Failed to generate answer", detail: err.message });
  }
};
