import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  timeout: 30_000,
});

async function extractText(base64Image, mimeType) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Image } },
    {
      text:
        "Extract ALL visible text exactly as it appears. " +
        "Do NOT explain, summarize, or add context. " +
        "If no text is visible, return an empty string.",
    },
  ]);
  return result?.response?.text()?.trim() || "";
}

async function describeImage(imageUrl) {
  const completion = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Describe this image in detail. Include: what is shown, any charts/diagrams/tables and their data, colours, layout, and any visual context that would help someone understand the content without seeing it. Be thorough.",
          },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    temperature: 0.2,
    max_completion_tokens: 1024,
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}

export const parseImage = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const base64Image = Buffer.from(response.data).toString("base64");
    const mimeType = response.headers["content-type"] || "image/jpeg";

    // Run OCR and description in parallel
    const [extractedText, description] = await Promise.all([
      extractText(base64Image, mimeType).catch((err) => {
        console.warn("[imageParser] OCR failed:", err.message);
        return "";
      }),
      describeImage(imageUrl).catch((err) => {
        console.warn("[imageParser] Description failed:", err.message);
        return "";
      }),
    ]);

    const parts = [];
    if (extractedText) parts.push(`[Extracted Text]\n${extractedText}`);
    if (description) parts.push(`[Image Description]\n${description}`);

    return parts.join("\n\n");
  } catch (error) {
    console.error("[imageParser] Error:", error.message);
    return "";
  }
};
