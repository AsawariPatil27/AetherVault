import { Redis } from "@upstash/redis";
import Message from "../models/Message.js";

let _redis = null;
const getRedis = () => {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
};

const KEY = (chatId) => `hist:${chatId}`;
const MAX_TURNS = 5;   // 5 user + 5 assistant = 10 messages sent to LLM
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function getHistory(chatId) {
  try {
    const raw = await getRedis().get(KEY(chatId));
    console.log(`[history] Redis GET hist:${chatId} →`, raw ? `${Array.isArray(raw) ? raw.length : 0} msgs` : "empty");
    return Array.isArray(raw) ? raw : [];
  } catch (err) {
    console.error("[history] Redis GET failed:", err.message);
    return [];
  }
}

export async function saveHistory(chatId, userId, userText, assistantText, sources, mode = "text") {
  // 1. Update Redis (LLM context window) — skip mind maps, raw diagram code confuses the LLM
  if (mode !== "image") {
    try {
      const existing = await getHistory(chatId);
      const updated = [
        ...existing,
        { role: "user", content: userText },
        { role: "assistant", content: assistantText },
      ].slice(-(MAX_TURNS * 2));

      await getRedis().set(KEY(chatId), updated, { ex: TTL_SECONDS });
      console.log(`[history] Redis SET hist:${chatId} → ${updated.length} msgs`);
    } catch (err) {
      console.error("[history] Redis SET failed:", err.message);
    }
  }

  // 2. Persist to MongoDB permanently — fire and forget, never blocks response
  Message.insertMany([
    { chatId, userId, role: "user", content: userText },
    {
      chatId,
      userId,
      role: "assistant",
      content: assistantText,
      metadata: {
        mode,
        sources: sources.map((s) => ({
          fileName: s.fileName,
          fileType: s.sourceType,
          fileKey: s.fileKey,
        })),
      },
    },
  ]).catch((err) => console.warn("[history] MongoDB save failed:", err.message));
}
