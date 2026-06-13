import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  timeout: 30_000,
});

export async function generateDiagram(query, chunks) {
  const context = chunks
    .map((c, i) => `[${i + 1}] ${c.text}`)
    .join("\n\n---\n\n");

  const completion = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "You are a Mermaid.js diagram generator. Given document excerpts and a user question, produce a valid Mermaid graph TD diagram.\n\n" +
          "Rules:\n" +
          "- Always use graph TD syntax — no other diagram types.\n" +
          "- If the excerpts contain no relevant information, respond with exactly: NO_RELEVANT_CONTENT\n" +
          "- Use ONLY facts explicitly stated in the excerpts. Do NOT invent anything.\n" +
          "- Node IDs must be plain alphanumeric (A, B, C1, etc.). Labels go in square brackets: A[Label here]\n" +
          "- Keep labels short — 5 words max. No special characters inside labels.\n" +
          "- Do NOT use parentheses () or curly braces {} for node shapes.\n" +
          "- Return ONLY the raw Mermaid code. No markdown fences, no explanation.\n\n" +
          "Example of valid output:\n" +
          "graph TD\n" +
          "  A[Main Topic] --> B[Point One]\n" +
          "  A --> C[Point Two]\n" +
          "  B --> D[Sub Point]",
      },
      {
        role: "user",
        content: `Document excerpts:\n\n${context}\n\nUser question: ${query}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 500,
  });

  const raw = completion.choices[0].message.content.trim();
  // Strip any markdown fences the LLM adds
  const cleaned = raw.replace(/^```[\w]*\s*/i, "").replace(/\s*```$/, "").trim();
  console.log("[diagram] generated code:\n", cleaned);
  return cleaned;
}

export async function streamAnswer(query, chunks, res) {
  const context = chunks
    .map((c, i) => `[${i + 1}] Source: ${c.metadata?.fileName || "document"}\n${c.text}`)
    .join("\n\n---\n\n");

  const stream = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
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
    stream: true,
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
  }
}
