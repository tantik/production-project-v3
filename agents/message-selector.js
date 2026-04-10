import { analyzeMessageQuality } from "./message-utils.js";

export async function selectBestMessage(lead, messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      ...lead,
      messages: [],
      selectedMessage: null,
      status: "no-messages"
    };
  }

  const ranked = messages.map((message, index) => {
    const analysis = analyzeMessageQuality(message, lead);
    return {
      id: `variant_${index + 1}`,
      text: analysis.text,
      score: analysis.score,
      reasons: analysis.reasons
    };
  });

  ranked.sort((a, b) => b.score - a.score);

  return {
    ...lead,
    messages: ranked,
    selectedMessage: ranked[0],
    updatedAt: new Date().toISOString(),
    status: "message-selected"
  };
}
