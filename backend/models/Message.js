import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",   // 👈 reference
    required: true
  },

  userId: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true
  },

  content: {
    type: String,
    required: true
  },

  metadata: {

    sources: [
      {
        documentId: mongoose.Schema.Types.ObjectId,
        chunkId: mongoose.Schema.Types.ObjectId,
        fileName: String,
        fileType: String,
        fileKey: String   // 🔥 IMPORTANT (S3 reference)
      }
    ]
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Message", messageSchema);