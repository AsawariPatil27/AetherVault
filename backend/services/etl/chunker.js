import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { stripLoneSurrogates } from "../../utils/textSanitize.js";

export const chunkText = async (text) => {
  if (!text || typeof text !== "string") return [];

  text = stripLoneSurrogates(text);
  if (!text.trim()) return [];

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,
    chunkOverlap: 200,
  });

  const docs = await splitter.createDocuments([text]);

  // ✅ NO aggressive filtering
  return docs
    .map((doc) => stripLoneSurrogates(doc.pageContent.trim()))
    .filter((chunk) => chunk.length > 0); // only remove empty
};