import axios from "axios";

const EMBEDDING_URL = process.env.EMBEDDING_SERVER_URL || "http://localhost:5002";

export const parsePdf = async (fileUrl) => {
  try {
    const { data } = await axios.post(
      `${EMBEDDING_URL}/parse-pdf`,
      { url: fileUrl },
      { timeout: 120_000 }
    );
    return data.text || "";
  } catch (error) {
    console.error("Docling PDF parsing error:", error.message);
    return "";
  }
};
