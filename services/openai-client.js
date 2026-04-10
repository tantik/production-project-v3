let openaiModulePromise = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;

  if (!openaiModulePromise) {
    openaiModulePromise = import("openai").catch(() => null);
  }

  const imported = await openaiModulePromise;
  if (!imported?.default) return null;

  return new imported.default({ apiKey: process.env.OPENAI_API_KEY });
}

export function extractJsonFromText(text) {
  if (!text || typeof text !== "string") return null;

  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // ignore
  }

  const fencedJsonMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedJsonMatch?.[1]) {
    try {
      return JSON.parse(fencedJsonMatch[1]);
    } catch {
      // ignore
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const maybeObject = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(maybeObject);
    } catch {
      // ignore
    }
  }

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const maybeArray = trimmed.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(maybeArray);
    } catch {
      // ignore
    }
  }

  return null;
}

export function extractThreeMessagesFromPlainText(text) {
  if (!text || typeof text !== "string") return [];

  const cleaned = text.trim();
  const patterns = [
    /A[:：]\s*([\s\S]*?)(?=\n\s*B[:：]|\n\s*B[)]|\n\s*B\.|$)/i,
    /B[:：]\s*([\s\S]*?)(?=\n\s*C[:：]|\n\s*C[)]|\n\s*C\.|$)/i,
    /C[:：]\s*([\s\S]*?)$/i
  ];

  const extracted = patterns
    .map((regex) => cleaned.match(regex)?.[1]?.trim() || "")
    .filter(Boolean);

  if (extracted.length >= 2) return extracted;

  const blocks = cleaned
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (blocks.length >= 3) return blocks.slice(0, 3);

  return [];
}

export async function generateText({
  system,
  user,
  model = "gpt-4.1-mini",
  temperature = 0.7,
  retries = 2
}) {
  const client = await getClient();
  if (!client) {
    throw new Error("OpenAI client is unavailable. Set OPENAI_API_KEY and install dependencies.");
  }

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await client.responses.create({
        model,
        temperature,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: system }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: user }]
          }
        ]
      });

      return String(response.output_text || "").trim();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(700 * (attempt + 1));
      }
    }
  }

  throw lastError;
}
