import axios from "axios";

const WHISPER_URL = process.env.WHISPER_SERVER_URL || "http://localhost:5003";

export const parseVideo = async (fileUrl) => {
  try {
    const { data } = await axios.post(
      `${WHISPER_URL}/transcribe`,
      { url: fileUrl },
      { timeout: 120_000 }
    );
    return data.text || "";
  } catch (error) {
    console.error("Video parsing error:", error.message);
    return "";
  }
};