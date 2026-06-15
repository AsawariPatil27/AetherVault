import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { stripLoneSurrogates } from "../../utils/textSanitize.js";

const FIXED_SIZE = 1800;
const FIXED_OVERLAP = 350;
const MAX_SECTION = 2000; // split sections larger than this further
const MIN_SECTION = 120;  // discard sections smaller than this

async function fixedSizeChunk(text) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: FIXED_SIZE,
    chunkOverlap: FIXED_OVERLAP,
  });
  const docs = await splitter.createDocuments([text]);
  return docs
    .map((doc) => stripLoneSurrogates(doc.pageContent.trim()))
    .filter((c) => c.length > 0);
}

async function structureAwareChunk(text) {
  // Split at every markdown heading (## Introduction, ### SQUARE, etc.)
  const sections = text.split(/(?=^#{1,4}\s)/m).map((s) => s.trim()).filter((s) => s.length >= MIN_SECTION);

  if (sections.length < 3) return null; // not enough structure — caller falls back

  const chunks = [];
  for (const section of sections) {
    if (section.length > MAX_SECTION) {
      // Oversized section — split further but keep heading in first sub-chunk
      const sub = await fixedSizeChunk(section);
      chunks.push(...sub);
    } else {
      chunks.push(stripLoneSurrogates(section));
    }
  }
  return chunks.filter((c) => c.length > 0);
}

export const chunkText = async (text, sourceType = "unknown") => {
  if (!text || typeof text !== "string") return [];
  text = stripLoneSurrogates(text);
  if (!text.trim()) return [];

  if (sourceType === "pdf") {
    const hasHeaders = /^#{1,4}\s/m.test(text);
    if (hasHeaders) {
      const structured = await structureAwareChunk(text);
      if (structured && structured.length >= 2) {
        console.log(`[chunker] structure-aware: ${structured.length} chunks`);
        return structured;
      }
    }
    console.log("[chunker] no headers found — using fixed-size");
  }

  const chunks = await fixedSizeChunk(text);
  console.log(`[chunker] fixed-size (${sourceType}): ${chunks.length} chunks`);
  return chunks;
};