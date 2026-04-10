const positiveInterestPatterns = [
  "詳しく",
  "詳細",
  "興味",
  "話を聞きたい",
  "教えて",
  "どんな",
  "内容",
  "お願いします"
];

const busyLaterPatterns = [
  "今は",
  "また今度",
  "忙しく",
  "後日",
  "時間がなく",
  "タイミング",
  "落ち着いたら"
];

const noNeedPatterns = [
  "間に合って",
  "今のままで",
  "すでに",
  "導入済み",
  "必要ない",
  "大丈夫です"
];

const rejectionPatterns = [
  "不要",
  "結構です",
  "お断り",
  "興味ありません",
  "必要ありません",
  "ご遠慮"
];

function containsAny(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

export function classifyReply(text) {
  const normalized = String(text || "").trim();

  if (!normalized) {
    return { intent: "unclear", confidence: 0.2, reason: "empty reply" };
  }

  if (containsAny(normalized, rejectionPatterns)) {
    return { intent: "rejection", confidence: 0.95, reason: "clear rejection wording" };
  }

  if (containsAny(normalized, noNeedPatterns)) {
    return { intent: "no_need", confidence: 0.9, reason: "already solved / no need" };
  }

  if (containsAny(normalized, busyLaterPatterns)) {
    return { intent: "busy_later", confidence: 0.82, reason: "timing objection" };
  }

  if (containsAny(normalized, positiveInterestPatterns)) {
    return { intent: "positive_interest", confidence: 0.88, reason: "asks for more detail" };
  }

  if (normalized.endsWith("？") || normalized.includes("どういう") || normalized.includes("具体的")) {
    return { intent: "neutral_curious", confidence: 0.75, reason: "question asked" };
  }

  return { intent: "unclear", confidence: 0.45, reason: "fallback classification" };
}
