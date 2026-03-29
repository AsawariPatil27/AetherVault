import mongoose from "mongoose";
import Chunk from "../models/Chunk.js";

export const parseDocument = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const chunks = await Chunk.find({ documentId: id }).sort({
      "metadata.chunkIndex": 1
    });

    if (!chunks || chunks.length === 0) {
      return res.status(404).json({ error: "No chunks found for this document" });
    }

    res.json({
      documentId: id,
      chunks
    });

  } catch (error) {
    console.error("FETCH CHUNKS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch chunks" });
  }
};