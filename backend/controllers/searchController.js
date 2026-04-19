import { hybridSearch } from "../services/searchService.js";
import mongoose from "mongoose";
import Chat from "../models/Chat.js";

export const searchChunks = async (req, res) => {
  try {
    const { query, chatId, sourceType, limit, topK } = req.body ?? {};
    const userId = req.user.id;

    const rawChatId = typeof chatId === "string" ? chatId.trim() : "";
    if (!rawChatId) {
      return res.status(400).json({ error: "chatId is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(rawChatId)) {
      return res.status(400).json({ error: "Invalid chatId" });
    }

    const chat = await Chat.findOne({ _id: rawChatId, userId });
    if (!chat) {
      return res.status(404).json({ error: "Chat not found for this user" });
    }

    const results = await hybridSearch(query, userId, {
      chatId: rawChatId,
      sourceType,
      limit,
      topK,
    });

    return res.json({ results, count: results.length });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error("SEARCH ERROR:", err);
    return res.status(500).json({
      error: "Search failed",
      detail:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
