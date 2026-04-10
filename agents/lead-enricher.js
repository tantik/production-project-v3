import { extractJsonFromText, generateText } from "../services/openai-client.js";

function sanitizeArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function fallbackPainPoints(lead) {
  const painPoints = [];

  if (lead.bookingMethod === "instagram_dm") {
    painPoints.push("Instagram DM経由の予約導線が見受けられる");
  }

  if (lead.hasLine && !lead.hasWebsite) {
    painPoints.push("LINEやDMを含めた予約導線を整理できる余地があるかもしれない");
  }

  if (!lead.hasLine && !lead.hasWebsite) {
    painPoints.push("予約導線をより分かりやすくできる余地があるかもしれない");
  }

  if (!lead.hasWebsite) {
    painPoints.push("外部予約ページの見せ方に改善余地がある可能性");
  }

  return [...new Set(painPoints)];
}

function fallbackStrengths(lead) {
  const strengths = [];
  const text = [lead.instagramBio, lead.notes, lead.rawText].join(" ");

  if (text.includes("丁寧")) strengths.push("丁寧な印象");
  if (text.includes("デザイン")) strengths.push("デザイン訴求が分かりやすい");
  if (text.includes("季節")) strengths.push("季節感のある訴求");
  if (text.toLowerCase().includes("portfolio")) strengths.push("作品訴求がしっかりしている");
  if (text.includes("LINE") || text.includes("DM")) strengths.push("LINEやDMでの予約導線が見える");

  return [...new Set(strengths)];
}

function fallbackBookingMethod(lead) {
  if (lead.bookingMethod) return lead.bookingMethod;

  const text = [lead.instagramBio, lead.notes, lead.rawText]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasDm = text.includes("dm");
  const hasLine = text.includes("line");

  if (hasDm) return "instagram_dm";
  if (hasLine) return "line";
  if (text.includes("予約フォーム") || text.includes("website") || text.includes("web")) {
    return "website_form";
  }

  return "unknown";
}

function fallbackPostingFrequency(lead) {
  const text = [lead.instagramBio, lead.notes, lead.rawText]
    .filter(Boolean)
    .join(" ");

  if (text.includes("毎日") || text.toLowerCase().includes("daily")) return "high";
  if (text.includes("週") || text.toLowerCase().includes("weekly")) return "medium";

  return "unknown";
}

export async function enrichLead(lead, businessTypes) {
  const nicheConfig = businessTypes[lead.niche] || {};
  const inferredBookingMethod = fallbackBookingMethod(lead);
  const inferredPostingFrequency = fallbackPostingFrequency(lead);

  const system = `
You analyze Japanese beauty and wellness leads for polite AI sales outreach.
Return ONLY valid JSON.

Required format:
{
  "bookingMethod": "line | instagram_dm | website_form | phone | unknown",
  "postingFrequency": "high | medium | low | unknown",
  "strengths": ["string"],
  "painPoints": ["string"],
  "summary": "string",
  "recommendedAngle": "string"
}

Important rules:
- Use only externally visible signals
- Do not invent internal operations
- Do not claim that the business lacks LINE if lead.hasLine is true
- If DM is explicitly visible, prefer bookingMethod = "instagram_dm"
- Do not drift into broad marketing advice unless directly relevant
- Prefer pain points around: 予約導線 受付の流れ 外部予約ページ LINEやDMの整理
- Prefer soft wording such as: "〜が見受けられる" "〜余地があるかもしれない" "〜を整理できる可能性"
- Keep strengths and painPoints practical and short
- Output JSON only
`.trim();

  const user = `Lead data: ${JSON.stringify(
    {
      businessName: lead.businessName,
      niche: lead.niche,
      city: lead.city,
      instagramBio: lead.instagramBio,
      notes: lead.notes,
      rawText: lead.rawText,
      hasInstagram: lead.hasInstagram,
      hasLine: lead.hasLine,
      hasWebsite: lead.hasWebsite,
      inferredBookingMethod,
      inferredPostingFrequency,
      nicheConfig
    },
    null,
    2
  )}`;

  let parsed;

  try {
    const raw = await generateText({
      system,
      user,
      model: "gpt-4.1-mini",
      temperature: 0.2
    });
    parsed = extractJsonFromText(raw);
  } catch {
    parsed = null;
  }

  const bookingMethod = parsed?.bookingMethod || inferredBookingMethod;
  const postingFrequency = parsed?.postingFrequency || inferredPostingFrequency;
  const strengths = sanitizeArray(parsed?.strengths).length
    ? sanitizeArray(parsed.strengths)
    : fallbackStrengths(lead);
  const painPoints = sanitizeArray(parsed?.painPoints).length
    ? sanitizeArray(parsed.painPoints).filter(
        (item) => !item.includes("集客") && !item.includes("売上") && !item.includes("投稿頻度")
      )
    : fallbackPainPoints({ ...lead, bookingMethod });

  const enrichment = {
    nicheLabel: nicheConfig.label || lead.niche,
    tone: nicheConfig.tone || "soft",
    offerHint: nicheConfig.offerHint || "automation",
    bookingMethod,
    postingFrequency,
    strengths,
    painPoints,
    summary:
      parsed?.summary ||
      `${lead.businessName || "このリード"}は${nicheConfig.label || lead.niche || "対象業種"}として、外部から見える範囲では予約導線や見せ方を整理できる可能性があります。`,
    recommendedAngle:
      parsed?.recommendedAngle ||
      (lead.hasLine
        ? "既存のLINEやDMを含めた予約導線を分かりやすく整える提案"
        : "予約導線を分かりやすくし、対応負担を軽くする提案")
  };

  return {
    ...lead,
    bookingMethod,
    postingFrequency,
    strengths,
    painPoints,
    enrichment,
    updatedAt: new Date().toISOString(),
    status: "enriched"
  };
}
