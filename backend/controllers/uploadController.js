import Document from "../models/Document.js";
import mongoose from "mongoose";
export const uploadHandler = async (req, res) => {
  try {
    const files = req.files;

    const userId = req.user.id; // 🔥 TAKE FROM JWT (NOT BODY)

    const savedDocs = [];

    for (const file of files) {
      let type = "unknown";

      if (file.mimetype === "application/pdf") type = "pdf";
      else if (file.mimetype.startsWith("image/")) type = "image";
      else if (file.mimetype.startsWith("audio/")) type = "audio";
      else if (file.mimetype.startsWith("video/")) type = "video";

      const doc = await Document.create({
        userId,
        fileName: file.originalname,
        fileUrl: file.location,
        fileType: type,
        chatId: new mongoose.Types.ObjectId() // TEMP (until chat added)
      });

      savedDocs.push(doc);
    }

    res.json({
      message: "Files uploaded successfully",
      documents: savedDocs
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
};