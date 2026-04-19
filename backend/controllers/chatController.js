import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import Document from "../models/Document.js";
import Chunk from "../models/Chunk.js";

export const createChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const chat = await Chat.create({ userId });
    return res.status(201).json({ chatId: chat._id.toString() });
  } catch (error) {
    console.error("CREATE CHAT ERROR:", error);
    return res.status(500).json({ error: "Failed to create chat" });
  }
};

export const getChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const chats = await Chat.find({ userId }).sort({ createdAt: -1 });
    return res.json({ chats });
  } catch (error) {
    console.error("GET CHATS ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch chats" });
  }
};

export const getChatDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: "Invalid chatId" });
    }

    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const documents = await Document.find({ chatId }).sort({ createdAt: -1 });
    return res.json({ documents });
  } catch (error) {
    console.error("GET CHAT DOCUMENTS ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch documents" });
  }
};

export const updateChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const title =
      typeof req.body?.title === "string" ? req.body.title.trim() : "";

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: "Invalid chatId" });
    }
    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: "title too long (max 200)" });
    }

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, userId },
      { title },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    return res.json({ chat });
  } catch (error) {
    console.error("UPDATE CHAT ERROR:", error);
    return res.status(500).json({ error: "Failed to update chat" });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: "Invalid chatId" });
    }

    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    await Chunk.deleteMany({ chatId });
    await Document.deleteMany({ chatId });
    await Chat.deleteOne({ _id: chatId });

    return res.json({ ok: true });
  } catch (error) {
    console.error("DELETE CHAT ERROR:", error);
    return res.status(500).json({ error: "Failed to delete chat" });
  }
};