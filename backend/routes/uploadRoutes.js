import express from "express";
import { upload } from "../services/storage/s3Service.js";
import { uploadHandler } from "../controllers/uploadController.js";
import { verifyUser } from "../middleware/auth.js"; // 🔥 ADD

const router = express.Router();

router.post("/", verifyUser, upload.array("files"), uploadHandler);

export default router;