const positiveInterestPatterns = [
  "詳しく",
  "詳細",
  "興味",
  "話を聞きたい",
  "教えて",
  "どんな",
  "内容",
  "お願いします",
  "イメージ",
  "もう少し",
  "具体的"
];

const busyLaterPatterns = [
  "今は",
  "また今度",
  "忙しく",
  "後日",
  "時間がなく",
  "タイミング",
  "落ち着いたら",
  "改めて",
  "今月は",
  "来月",
  "また連絡"
];

const noNeedPatterns = [
  "間に合って",
  "今のままで",
  "すでに",
  "導入済み",
  "必要ない",
  "大丈夫です",
  "足りて",
  "困っていません"
];

const rejectionPatterns = [
  "不要",
  "結構です",
  "お断り",
  "興味ありません",
  "必要ありません",
  "ご遠慮",
  "案内は不要",
  "営業は不要"
];

const alreadyHasSystemPatterns = [
  "予約システムがあります",
  "すでにシステム",
  "既存のシステム",
  "今のシステムで",
  "別のサービスを使って"
];

const notDecisionMakerPatterns = [
  "担当ではない",
  "担当者に",
  "確認します",
  "オーナーに",
  "責任者に",
  "私では判断",
  "私ではわかりかねます"
];

const redirectPatterns = [
  "LINEで",
  "メールで",
  "問い合わせフォーム",
  "フォームから",
  "こちらにご連絡",
  "HPから"
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
    return { intent: "rejection", confidence: 0.96, reason: "clear rejection wording" };
  }

  if (containsAny(normalized, alreadyHasSystemPatterns)) {
    return { intent: "already_has_system", confidence: 0.91, reason: "already using another system" };
  }

  if (containsAny(normalized, notDecisionMakerPatterns)) {
    return { intent: "not_decision_maker", confidence: 0.85, reason: "reply indicates another decision maker" };
  }

  if (containsAny(normalized, redirectPatterns)) {
    return { intent: "channel_redirect", confidence: 0.83, reason: "asks to continue on another channel" };
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
