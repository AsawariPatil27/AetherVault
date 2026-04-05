import Chat from "../models/Chat.js";

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