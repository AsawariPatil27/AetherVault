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

    // ✅ Dynamic MIME detection
    const mimeType = response.headers["content-type"] || "image/jpeg";

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,  // 🔥 works for jpg, png, webp, etc.
          data: base64Image
        }
      },
      {
        text: `
Extract the following:
1. All visible text
2. What the image contains (objects, scene)

Return format:
TEXT:
...
CONTEXT:
...`
      }
    ]);

    return result.response.text();

  } catch (error) {
    console.error("Gemini Error:", error);
    return "";
  }
};