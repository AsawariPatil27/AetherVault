import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import Document from "../models/Document.js";
import Chunk from "../models/Chunk.js";
import Message from "../models/Message.js";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

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

export const deleteDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId, docId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(docId))
      return res.status(400).json({ error: "Invalid id" });

    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const doc = await Document.findOne({ _id: docId, chatId });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // Delete from S3, MongoDB chunks, and document record in parallel
    await Promise.all([
      s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: doc.fileKey })).catch(() => {}),
      Chunk.deleteMany({ documentId: doc._id }),
      Document.deleteOne({ _id: doc._id }),
    ]);

    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE DOC ERROR:", err);
    return res.status(500).json({ error: "Failed to delete document" });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId))
      return res.status(400).json({ error: "Invalid chatId" });

    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const messages = await Message.find({ chatId }).sort({ createdAt: 1 }).limit(200);
    return res.json({ messages });
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
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
      { returnDocument: "after" }
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

    const documents = await Document.find({ chatId });

    await Promise.all([
      ...documents.map((doc) =>
        s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: doc.fileKey })).catch(() => {})
      ),
      Chunk.deleteMany({ chatId }),
      Document.deleteMany({ chatId }),
    ]);

    await Chat.deleteOne({ _id: chatId });

    return res.json({ ok: true });
  } catch (error) {
    console.error("DELETE CHAT ERROR:", error);
    return res.status(500).json({ error: "Failed to delete chat" });
  }
};