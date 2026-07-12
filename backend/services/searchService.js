import Chunk from "../models/Chunk.js";
import { embedChunks, embedClipText } from "./etl/embeddingService.js";
import { getSignedFileUrl } from "../utils/s3SignedUrl.js";
import mongoose from "mongoose";

// ✅ Separate indexes
const VECTOR_INDEX = process.env.ATLAS_VECTOR_INDEX || "chunks_hybrid";
const TEXT_INDEX = process.env.ATLAS_TEXT_INDEX || "chunks_text";

const SOURCE_TYPES = new Set(["pdf", "image", "audio", "video"]);
const RRF_K = 60;

function buildSearchFilter(userId, chatId, sourceType) {
  const filter = [{ equals: { path: "userId", value: userId } }];
  filter.push({
    equals: {
      path: "chatId",
      value: new mongoose.Types.ObjectId(chatId),
    },
  });
  if (sourceType) {
    filter.push({
      equals: { path: "metadata.sourceType", value: sourceType },
    });
  }
  return { compound: { filter } };
}

// 🔹 RRF Fusion
function reciprocalRankFusion(vectorHits, textHits, clipHits = [], limit) {
  const scores = new Map();
  const docs = new Map();

  const processHits = (hits) => {
    hits.forEach((doc, rank) => {
      const id = String(doc._id);
      const existing = docs.get(id);
      docs.set(id, existing ? { ...existing, ...doc } : doc);
      scores.set(id, (scores.get(id) || 0) + 1 / (RRF_K + rank + 1));
    });
  };

  processHits(vectorHits);
  processHits(textHits);
  processHits(clipHits);

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => {
      const doc = docs.get(id);
      return {
        ...doc,
        hybridScore: score,
      };
    });
}

// 🔹 VECTOR SEARCH
async function runVectorSearch(queryVector, userId, chatId, sourceType, limit) {
  const numCandidates = Math.min(Math.max(limit * 20, 150), 2000);

  return Chunk.aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX,
        path: "embedding",
        queryVector,
        numCandidates,
        limit,
        filter: {
          userId: userId,
          chatId: new mongoose.Types.ObjectId(chatId),
          ...(sourceType && { "metadata.sourceType": sourceType }),
        },
      },
    },
    {
      $project: {
        embedding: 0,
        vectorScore: { $meta: "vectorSearchScore" },
      },
    },
    {
      $match: {
        vectorScore: { $gte: 0.62 },
      },
    },
  ]);
}

// 🔹 CLIP VECTOR SEARCH
async function runClipVectorSearch(queryVector, userId, chatId, limit) {
  const numCandidates = Math.min(Math.max(limit * 20, 150), 2000);

  return Chunk.aggregate([
    {
      $vectorSearch: {
        index: "chunks_clip",
        path: "clipEmbedding",
        queryVector,
        numCandidates,
        limit,
        filter: {
          userId: userId,
          chatId: new mongoose.Types.ObjectId(chatId),
        },
      },
    },
    {
      $project: {
        embedding: 0,
        clipEmbedding: 0,
        vectorScore: { $meta: "vectorSearchScore" },
      },
    },
    {
      $match: {
        vectorScore: { $gte: 0.18 },
      },
    },
  ]);
}

// 🔹 TEXT SEARCH
async function runTextSearch(query, userId, chatId, sourceType, limit) {
  return Chunk.aggregate([
    {
      $search: {
        index: TEXT_INDEX,
        compound: {
          filter: buildSearchFilter(userId, chatId, sourceType).compound.filter,
          should: [
            {
              text: {
                query,
                path: "text",
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    },
    {
      $addFields: {
        textScore: { $meta: "searchScore" },
      },
    },
    { $sort: { textScore: -1 } },
    { $limit: limit },
    {
      $project: {
        embedding: 0,
      },
    },
  ]);
}

// 🔹 Attach media URLs
async function attachMediaUrls(results) {
  return Promise.all(
    results.map(async (doc) => {
      let mediaUrl = null;

      if (doc.metadata?.fileKey) {
        try {
          mediaUrl = await getSignedFileUrl(doc.metadata.fileKey);
        } catch (err) {
          console.warn("Signed URL failed:", err.message);
        }
      }

      return { ...doc, mediaUrl };
    })
  );
}

// 🔥 MAIN HYBRID SEARCH
export async function hybridSearch(query, userId, options = {}) {
  const raw = (query || "").trim();
  if (!raw) {
    const err = new Error("query is required");
    err.statusCode = 400;
    throw err;
  }

  const rawChatId =
    typeof options.chatId === "string" ? options.chatId.trim() : "";
  if (!rawChatId) {
    const err = new Error("chatId is required");
    err.statusCode = 400;
    throw err;
  }
  if (!mongoose.Types.ObjectId.isValid(rawChatId)) {
    const err = new Error("Invalid chatId");
    err.statusCode = 400;
    throw err;
  }

  let sourceType = options.sourceType;
  if (sourceType && !SOURCE_TYPES.has(sourceType)) {
    const err = new Error("Invalid sourceType");
    err.statusCode = 400;
    throw err;
  }

  const parsedLimit = Number(options.limit ?? options.topK ?? 8);
  const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 8, 1), 20);

  // Text search needs no embedding — start it immediately
  const textResultsPromise = runTextSearch(raw, userId, rawChatId, sourceType, limit * 2);

  // Embed the query, then kick off vector search (overlaps with text search above)
  let vectorResultsPromise = Promise.resolve([]);
  try {
    const vectors = await embedChunks([raw]);
    const queryVector = vectors?.[0];
    if (queryVector?.length) {
      vectorResultsPromise = runVectorSearch(queryVector, userId, rawChatId, sourceType, limit * 2);
    }
  } catch (err) {
    console.warn("Embedding failed, falling back to text-only search:", err.message);
  }

  // Embed the query for CLIP if we want images
  let clipResultsPromise = Promise.resolve([]);
  if (!sourceType || sourceType === "image") {
    try {
      const clipTextVector = await embedClipText(raw);
      if (clipTextVector?.length) {
        clipResultsPromise = runClipVectorSearch(clipTextVector, userId, rawChatId, limit * 2);
      }
    } catch (err) {
      console.warn("CLIP text embedding failed, ignoring CLIP search:", err.message);
    }
  }

  const [vectorResults, textResults, clipResults] = await Promise.all([
    vectorResultsPromise,
    textResultsPromise,
    clipResultsPromise,
  ]);

  const merged = reciprocalRankFusion(vectorResults, textResults, clipResults, limit);
  return attachMediaUrls(merged);
}