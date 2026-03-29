import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const parseImage = async (imageUrl) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer"
    });

    const base64Image = Buffer.from(response.data).toString("base64");
    const mimeType = response.headers["content-type"] || "image/jpeg";

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Image
        }
      },
      {
        text: `
Extract ALL visible text exactly as it appears.

Rules:
- Do NOT explain
- Do NOT summarize
- Do NOT add context
- If no text, return empty string
`
      }
    ]);

    return result?.response?.text()?.trim() || "";

  } catch (error) {
    console.error("Gemini Error:", error);
    return "";
  }
};