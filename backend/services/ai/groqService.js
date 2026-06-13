import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  timeout: 30_000,
});

export async function generateAnswer(query, chunks) {
  const context = chunks
    .map((c, i) => `[${i + 1}] Source: ${c.metadata?.fileName || "document"}\n${c.text}`)
    .join("\n\n---\n\n");

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are AetherVault, a friendly document assistant. " +
          "If the user sends a greeting or small talk (hi, hello, how are you, thanks, etc.), respond warmly and briefly — no citations needed. " +
          "For all other questions, answer using ONLY the provided document excerpts and cite sources inline like [1] or [2]. " +
          "If the answer is not in the excerpts, say so clearly without guessing.",
      },
      {
        role: "user",
        content: `Document excerpts:\n\n${context}\n\nQuestion: ${query}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 1024,
  });

  return completion.choices[0].message.content;
}
