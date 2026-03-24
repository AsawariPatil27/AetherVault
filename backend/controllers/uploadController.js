import Document from "../models/Document.js";
import mongoose from "mongoose";

export const uploadHandler = async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const userId = req.user.id;

    const savedDocs = [];

    for (const file of files) {


      let type = "unknown";

      if (file.mimetype === "application/pdf") type = "pdf";
      else if (file.mimetype.startsWith("image/")) type = "image";
      else if (file.mimetype.startsWith("audio/")) type = "audio";
      else if (file.mimetype.startsWith("video/")) type = "video";

      // ✅ SAFETY: ensure key exists
      const fileKey = file.key || file.location;

      if (!fileKey) {
        console.error("File key missing!");
        return res.status(500).json({ error: "File upload failed (no key)" });
      }

      const doc = await Document.create({
        userId,
        fileName: file.originalname,
        fileKey: fileKey, // ✅ ALWAYS store this
        fileType: type,
        chatId: new mongoose.Types.ObjectId()
      });

      savedDocs.push(doc);
    }

    res.json({
      message: "Files uploaded successfully",
      documents: savedDocs
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ error: "Upload failed" });
  }
};