import {
  extractJsonFromText,
  extractThreeMessagesFromPlainText,
  generateText
} from "../services/openai-client.js";
import {
  analyzeMessageQuality,
  buildHumanFallbackMessages,
  sanitizeMessageText
} from "./message-utils.js";

function uniqueMessages(messages) {
  return [...new Set(messages.map((item) => sanitizeMessageText(item)).filter(Boolean))];
}

function buildPromptLead(lead) {
  return {
    businessName: lead.businessName,
    niche: lead.niche,
    city: lead.city,
    channel: lead.channel,
    bookingMethod: lead.bookingMethod,
    hasLine: lead.hasLine,
    hasWebsite: lead.hasWebsite,
    instagramBio: lead.instagramBio,
    strengths: lead.strengths,
    painPoints: lead.painPoints,
    enrichment: lead.enrichment,
    recommendedOffer: lead.recommendedOffer
  };
}

function validateAiMessages(messages, lead) {
  const cleaned = uniqueMessages(messages);
  if (cleaned.length < 3) return [];

  return cleaned
    .map((message) => analyzeMessageQuality(message, lead))
    .filter((item) => item.score >= 55)
    .map((item) => item.text)
    .slice(0, 3);
}

export async function generateSalesMessages(lead) {
  const fallbackMessages = buildHumanFallbackMessages(lead);

  const system = `
You write Japanese first-contact outreach messages for small beauty businesses in Japan.
Your output must sound like a polite real person, not like AI, not like a sales team.
Return valid JSON only:
{
  "A": "string",
  "B": "string",
  "C": "string"
}

Rules:
- Target channel: Instagram DM or LINE first message
- Natural Japanese only
- Soft, respectful, neutral
- No pushy sales tone
- No excessive praise
- No corporate wording like 御社 or 貴サロン
- Do not sound like a proposal deck
- Do not say 改善できます, 最適化します, 導入, 効率化, 売上, 集客 unless explicitly present
- Do not assume internal problems
- Use only visible signals from the lead
- Mention the business name naturally when possible
- Keep each message 2 or 3 short sentences
- Keep each message around 90 to 160 Japanese characters
- Message A: safest and most polite
- Message B: slightly warmer and more human
- Message C: a little more value-aware, but still soft
- If LINE already exists, do not propose introducing LINE
- Prefer wording like: ご予約の流れ, 導線, 分かりやすさ, ご参考までに
- Avoid these phrases: 感動しました, 感激しました, 感銘を受けました, 魅了されています, いつも見ています, ぜひお話し, ご提案が可能です
`.trim();

  const user = `Lead: ${JSON.stringify(buildPromptLead(lead), null, 2)}`;

  try {
    const raw = await generateText({
      system,
      user,
      model: "gpt-4.1-mini",
      temperature: 0.55
    });

    const parsed = extractJsonFromText(raw);
    const candidateMessages = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? [parsed.A, parsed.B, parsed.C]
      : extractThreeMessagesFromPlainText(raw);

    const validMessages = validateAiMessages(candidateMessages, lead);
    if (validMessages.length >= 3) {
      return validMessages;
    }

    const mixed = uniqueMessages([...validMessages, ...fallbackMessages]);
    return mixed.slice(0, 3);
  } catch (error) {
    console.error("sales-manager error:", error.message);
    return fallbackMessages;
  }
}
