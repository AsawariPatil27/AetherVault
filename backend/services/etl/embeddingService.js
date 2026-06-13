import axios from "axios";

const EMBEDDING_URL = process.env.EMBEDDING_SERVER_URL || "http://localhost:5002";

export const embedChunks = async (chunks) => {
  if (!chunks || !Array.isArray(chunks) || chunks.length === 0) return [];

  const { data } = await axios.post(
    `${EMBEDDING_URL}/embed`,
    { texts: chunks },
    { timeout: 10_000 }
  );

  const embeddings = data.embeddings;
  if (!Array.isArray(embeddings) || embeddings.length !== chunks.length) {
    throw new Error("Embedding count mismatch with chunks");
  }

  return embeddings;
};
