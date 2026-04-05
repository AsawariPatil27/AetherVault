import { hybridSearch } from "../services/searchService.js";

export const searchChunks = async (req, res) => {
  try {
    const { query, sourceType, limit, topK } = req.body ?? {};
    const userId = req.user.id;

    const results = await hybridSearch(query, userId, {
      sourceType,
      limit,
      topK,
    });

    return res.json({ results, count: results.length });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error("SEARCH ERROR:", err);
    return res.status(500).json({
      error: "Search failed",
      detail:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
