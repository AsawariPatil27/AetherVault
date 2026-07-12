import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  timeout: 30_000,
});

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

function buildUserMessage(query, chunks) {
  const hasImages = chunks.some((c) => c.metadata?.sourceType === "image" && c.mediaUrl);

  if (!hasImages) {
    // Text-only path — same as before
    const context = chunks
      .map((c, i) => {
        const source = c.metadata?.fileName || "document";
        const type = c.metadata?.sourceType || "";
        return `[${i + 1}] ${source}${type ? ` (${type})` : ""}\n${c.text.trim()}`;
      })
      .join("\n\n---\n\n");

    return {
      role: "user",
      content: `Document excerpts:\n\n${context}\n\nQuestion: ${query}`,
    };
  }

  // Multimodal path — inline images + text excerpts as a content array
  const contentParts = [];

  contentParts.push({ type: "text", text: "Here are the relevant document excerpts and images:\n" });

  chunks.forEach((c, i) => {
    const source = c.metadata?.fileName || "document";
    const type = c.metadata?.sourceType || "";
    const label = `[${i + 1}] ${source}${type ? ` (${type})` : ""}`;

    if (type === "image" && c.mediaUrl) {
      contentParts.push({ type: "text", text: `${label}:` });
      contentParts.push({ type: "image_url", image_url: { url: c.mediaUrl } });
    } else {
      contentParts.push({ type: "text", text: `${label}\n${c.text.trim()}` });
    }
  });

  contentParts.push({ type: "text", text: `\nQuestion: ${query}` });

  return { role: "user", content: contentParts };
}

function sanitizeDiagram(raw) {
  return raw.replace(/^```[\w]*\s*/i, "").replace(/\s*```$/, "").trim();
}

// Mermaid chokes on parentheses, quotes, and < > inside node labels.
// Strip them after generation since the LLM often ignores the system prompt rule.
function sanitizeLabels(code) {
  const labelCleaned = code.replace(/\[([^\]]+)\]/g, (_, label) => {
    const clean = label
      .replace(/[()]/g, "")
      .replace(/["']/g, "")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return `[${clean}]`;
  });

  // Remove any trailing incomplete edges caused by token truncation (e.g. "A -->")
  return labelCleaned
    .split("\n")
    .filter((line) => !/-->\s*$/.test(line.trim()))
    .join("\n");
}

export async function generateDiagram(query, chunks, history = []) {
  const context = chunks.map((c, i) => `[${i + 1}] ${c.text}`).join("\n\n---\n\n");

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are a Mermaid.js diagram generator. Output ONLY valid graph TD syntax.\n\n" +
          "STRICT RULES:\n" +
          "- First line must be exactly: graph TD\n" +
          "- Every node: ID[Label] where ID is letters only (A, B, ROOT, etc.)\n" +
          "- Every edge: A --> B or A --> B[Label]\n" +
          "- Labels: max 5 words, no quotes, no special chars, no parentheses\n" +
          "- No subgraphs, no styling, no classDef\n" +
          "- If excerpts have no relevant info, output exactly: NO_RELEVANT_CONTENT\n" +
          "- No markdown fences, no explanation, ONLY the graph TD code\n\n" +
          "VALID EXAMPLE:\n" +
          "graph TD\n" +
          "  ROOT[Main Topic]\n" +
          "  ROOT --> A[First Point]\n" +
          "  ROOT --> B[Second Point]\n" +
          "  A --> A1[Sub Detail]\n" +
          "  B --> B1[Sub Detail]",
      },
      ...history,
      {
        role: "user",
        content: `Excerpts:\n\n${context}\n\nQuestion: ${query}`,
      },
    ],
    temperature: 0.0,
    max_tokens: 1200,
  });

  const cleaned = sanitizeLabels(sanitizeDiagram(completion.choices[0].message.content.trim()));
  console.log("[diagram] generated:\n", cleaned);

  // Basic validity check — must start with graph and have at least one arrow
  if (!cleaned.startsWith("graph") || !cleaned.includes("-->")) {
    return "NO_RELEVANT_CONTENT";
  }

  return cleaned;
}

export async function generateTitle(query) {
  const completion = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "Write a concise 3-5 word chat title for the user's question.\n" +
          "Rules:\n" +
          "- Use specific keywords from the question, not generic phrases\n" +
          "- Never write: 'Document Analysis', 'Chat About', 'Question About', 'Help With'\n" +
          "- Title case only\n" +
          "- No quotes, no punctuation\n" +
          "Examples:\n" +
          "Q: What are the key findings in section 3? → Section 3 Key Findings\n" +
          "Q: How does the billing system work? → Billing System Overview\n" +
          "Q: What is RRF in hybrid search? → RRF Hybrid Search Explained\n" +
          "Return ONLY the title.",
      },
      { role: "user", content: query },
    ],
    temperature: 0.1,
    max_tokens: 15,
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}

const ANSWER_PRIMARY  = "llama-3.3-70b-versatile";
const ANSWER_FALLBACK = "llama-3.1-8b-instant";

export async function streamAnswer(query, chunks, history = [], res) {
  const hasImages = chunks.some((c) => c.metadata?.sourceType === "image" && c.mediaUrl);
  const userMessage = buildUserMessage(query, chunks);

  // Use vision model when images are present; otherwise use the text primary/fallback pair
  const primaryModel = hasImages ? VISION_MODEL : ANSWER_PRIMARY;
  const fallbackModel = hasImages ? VISION_MODEL : ANSWER_FALLBACK;

  const messages = [
    {
      role: "system",
      content:
        "You are AetherVault, an expert document assistant. Your job is to give accurate, detailed, well-structured answers based strictly on the provided document excerpts and images.\n\n" +
        "RULES:\n" +
        "- For greetings or small talk, respond warmly and briefly — no citations needed.\n" +
        "- For general knowledge, arithmetic/math, or reasoning questions that are completely unrelated to your uploaded documents, answer them directly using your internal knowledge, but DO NOT include any citations and prefix the answer with: \"*(Answered from general knowledge)*\".\n" +
        "- For all other questions, answer strictly using the provided excerpts and images.\n" +
        "- Be comprehensive and detailed — never truncate an explanation if the source material has more information.\n" +
        "- Cite facts ONLY when they are directly backed by the provided document excerpts using [1], [2], etc. Never cite the excerpts for claims, calculations, or general knowledge not explicitly mentioned in them.\n" +
        "- Use markdown formatting: **bold** for key terms, bullet points for lists, numbered steps for processes.\n" +
        "- If a question is partially answered by the excerpts, share what IS available and clearly state what is missing.\n" +
        "- Never guess or hallucinate — if the answer is genuinely not in the excerpts, say so directly.",
    },
    ...history,
    userMessage,
  ];

  let stream;
  try {
    stream = await client.chat.completions.create({
      model: primaryModel,
      messages,
      temperature: 0.15,
      max_tokens: 2048,
      stream: true,
    });
  } catch (err) {
    if (err.status === 429) {
      console.warn("[groq] primary model rate-limited, falling back to", fallbackModel);
      stream = await client.chat.completions.create({
        model: fallbackModel,
        messages,
        temperature: 0.15,
        max_tokens: 2048,
        stream: true,
      });
    } else {
      throw err;
    }
  }

  let fullContent = "";
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) {
      fullContent += token;
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
  }
  return fullContent;
}
