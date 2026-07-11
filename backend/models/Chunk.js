import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },

  chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat", // 👈 reference
      required: true,
    },

  documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document", // 👈 reference
      required: true,
    },

  text: {
    type: String,
    required: true
  },

  embedding: {
    type: [Number],   // vector
    required: true
  },

  clipEmbedding: {
    type: [Number],   // CLIP vector (512 dimensions)
    required: false
  },

  metadata: {
    chunkIndex: Number,
    sourceType: {
      type: String,
      enum: ["pdf", "image", "audio", "video"],
    },
    fileKey: String,
    fileName: String,
    page: Number,
    timestamp: Number   // for audio/video
  }
});

export default mongoose.model("Chunk", chunkSchema);
