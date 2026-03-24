import Document from "../models/Document.js";
import mongoose from "mongoose";
import { parseFile } from "../services/parsers/parserEngine.js";

export const parseDocument = async (req, res) => {
  try {
    const { id } = req.params;


    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const doc = await Document.findById(id);


    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (!doc.fileKey) {
      console.error("Missing fileKey in document!");
      return res.status(500).json({ error: "File key missing in DB" });
    }

    const text = await parseFile(doc.fileKey, doc.fileType);

    if (!text) {
      return res.status(500).json({ error: "Failed to extract content" });
    }

    res.json({ text });

  } catch (error) {
    console.error("PARSE ERROR:", error);
    res.status(500).json({ error: "Parsing failed" });
  }
};