import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const chunkText = async (text) => {
  if (!text || typeof text !== "string") return [];

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100,
  });

  const docs = await splitter.createDocuments([text]);

  // ✅ NO aggressive filtering
  return docs
    .map((doc) => doc.pageContent.trim())
    .filter((chunk) => chunk.length > 0); // only remove empty
};