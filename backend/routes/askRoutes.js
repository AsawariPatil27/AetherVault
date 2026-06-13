import express from "express";
import { askQuestion } from "../controllers/askController.js";
import { verifyUser } from "../middleware/auth.js";

const router = express.Router();
router.post("/", verifyUser, askQuestion);
export default router;
