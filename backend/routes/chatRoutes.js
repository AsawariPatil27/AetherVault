import express from "express";
import { verifyUser } from "../middleware/auth.js";
import {
  createChat,
  getChats,
  getChatDocuments,
  getChatMessages,
  deleteDocument,
  updateChat,
  deleteChat,
} from "../controllers/chatController.js";

const router = express.Router();

router.get("/", verifyUser, getChats);
router.post("/", verifyUser, createChat);
router.get("/:chatId/documents", verifyUser, getChatDocuments);
router.get("/:chatId/messages", verifyUser, getChatMessages);
router.delete("/:chatId/documents/:docId", verifyUser, deleteDocument);
router.patch("/:chatId", verifyUser, updateChat);
router.delete("/:chatId", verifyUser, deleteChat);

export default router;