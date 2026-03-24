import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },

  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat", // 👈 reference
    required: true,
  },

  fileName: String,

  fileKey: {
    type: String,
    required: true,
  },

  fileType: {
    type: String,
    enum: ["pdf", "image", "audio", "video"],
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Document", documentSchema);
