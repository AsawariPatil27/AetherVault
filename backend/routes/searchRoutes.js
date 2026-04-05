import express from "express";
import { verifyUser } from "../middleware/auth.js";
import { searchChunks } from "../controllers/searchController.js";

const router = express.Router();

router.post("/", verifyUser, searchChunks);

export default router;
