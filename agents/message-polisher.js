import { generateText } from "../services/openai-client.js";
import { analyzeMessageQuality, sanitizeMessageText } from "./message-utils.js";

function localPolish(message) {
  return sanitizeMessageText(message)
    .replace(/ご連絡いたしました。$/, "ご参考までにご連絡しました。")
    .replace(/^(.+?)ご参考までに一度ご連絡しました。$/, "$1ご参考までにご連絡しました。")
    .replace(/ご参考までにご参考までに/g, "ご参考までに")
    .replace(/思いました。思いました。/g, "思いました。")
    .replace(/できるかもしれません。ご参考までに/g, "できるかもしれません。ご参考までに")
    .trim();
}

export async function polishSalesMessage(lead, message) {
  const fallback = localPolish(message);

  const system = `
You lightly polish a Japanese outreach DM.
Return only the final Japanese message text.

Rules:
- Keep the same meaning
- Keep it human, soft, and modest
- Make only light edits
- Remove anything that sounds too formal, too salesy, or too AI-like
- Keep it short enough for Instagram DM
- Do not add new claims
- Do not add 集客, 売上, 効率化, 改善できます, 導入
- Prefer natural phrases like ご参考までに, もしご興味があれば, 差し支えない範囲で
`.trim();

  const user = `Lead context: ${JSON.stringify(
    {
      businessName: lead.businessName,
      channel: lead.channel,
      hasLine: lead.hasLine,
      bookingMethod: lead.bookingMethod
    },
    null,
    2
  )}\nOriginal message: ${message}`;

  try {
    const result = await generateText({
      system,
      user,
      model: "gpt-4.1-mini",
      temperature: 0.15
    });

    const polished = localPolish(result);
    const polishedScore = analyzeMessageQuality(polished, lead).score;
    const originalScore = analyzeMessageQuality(fallback, lead).score;

    return polishedScore >= originalScore ? polished : fallback;
  } catch {
    return fallback;
  }
}
