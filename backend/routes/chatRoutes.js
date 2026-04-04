import express from "express";
import { verifyUser } from "../middleware/auth.js";
import { createChat } from "../controllers/chatController.js";

const router = express.Router();

router.post("/", verifyUser, createChat);

export default router;
