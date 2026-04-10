const BANNED_PHRASES = [
  "感動しました",
  "感激しました",
  "感銘を受けました",
  "貴サロン",
  "御社",
  "こんにちは",
  "はじめまして",
  "気軽に",
  "必ず",
  "絶対",
  "売上アップ",
  "集客改善",
  "自動化できます",
  "導入することで",
  "大変かと思います"
];

const SALESY_PHRASES = [
  "ご提案が可能です",
  "ぜひお話し",
  "商談",
  "導入",
  "課題解決",
  "改善できます",
  "最適化します",
  "成果",
  "効率化"
];

const HUMAN_SOFT_PHRASES = [
  "拝見し",
  "見ていて",
  "もし差し支えなければ",
  "もしご興味があれば",
  "差し支えない範囲で",
  "少しだけ",
  "ご参考までに",
  "かなと思い",
  "かもしれません",
  "かと思い"
];

function normalizeWhitespace(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/ 。/g, "。")
    .replace(/ 、/g, "、")
    .trim();
}

export function sanitizeMessageText(text) {
  let result = normalizeWhitespace(text)
    .replace(/^['"「]+|['"」]+$/g, "")
    .replace(/！/g, "")
    .replace(/!+/g, "")
    .replace(/\?+/g, "")
    .replace(/いつも/g, "")
    .replace(/魅了されています/g, "素敵だなと感じました")
    .replace(/感心しております/g, "素敵だなと感じました")
    .replace(/お話しできれば嬉しいです/g, "ご参考までにお伝えできればと思いました")
    .replace(/ご提案が可能です/g, "お役に立てそうな点があるかもしれないと思いました")
    .replace(/ぜひ/g, "")
    .trim();

  result = result
    .replace(/。。+/g, "。")
    .replace(/、、+/g, "、")
    .replace(/\s+。/g, "。")
    .replace(/\s+、/g, "、")
    .trim();

  return result;
}

export function buildObservation(lead) {
  const strengths = lead.strengths || [];
  const bio = String(lead.instagramBio || "");

  if (strengths.some((item) => item.includes("季節"))) {
    return "季節感のあるデザインが素敵でした";
  }
  if (strengths.some((item) => item.includes("作品") || item.includes("デザイン"))) {
    return "デザインの雰囲気がとても素敵でした";
  }
  if (bio.includes("丁寧")) {
    return "丁寧なご案内の雰囲気が印象的でした";
  }
  return "雰囲気がとても素敵でした";
}

export function buildOfferLine(lead) {
  if (lead.hasLine && lead.bookingMethod === "instagram_dm") {
    return "DMやLINEでのご予約の導線を、今の雰囲気のままもう少し分かりやすく整えるお手伝いができるかもしれません";
  }
  if (lead.hasLine) {
    return "LINEを含めたご予約導線を、無理のない形で整えるお手伝いができるかもしれません";
  }
  if (lead.bookingMethod === "instagram_dm") {
    return "DMでのご予約の流れを、やわらかい形でもう少し分かりやすくできる余地があるかもしれません";
  }
  return "ご予約まわりの導線を、やわらかい形で見直せる余地があるかもしれません";
}

export function buildSoftCloser() {
  return "もしご興味があれば、差し支えない範囲で少しだけお話しできればうれしいです。";
}

export function buildHumanFallbackMessages(lead) {
  const name = lead.businessName ? `${lead.businessName}様` : "サロン様";
  const observation = buildObservation(lead);
  const offer = buildOfferLine(lead);

  const offerForMessage2 = offer.replace(/できるかもしれません$/, "できるかもしれないと思い")
    .replace(/余地があるかもしれません$/, "余地があるかもしれないと思い");

  return [
    `${name}のInstagramを拝見し、${observation}。${offer}。ご参考までに一度ご連絡しました。`,
    `${name}の投稿を拝見して、雰囲気づくりがとても丁寧だなと感じました。${offerForMessage2}、失礼ながらDMしました。`,
    `${name}のInstagramを見ていて、世界観を崩さずにご予約の流れを整えられたら、さらに分かりやすくなりそうだなと感じました。${buildSoftCloser()}`
  ].map(sanitizeMessageText);
}

export function analyzeMessageQuality(message, lead) {
  const text = sanitizeMessageText(message);
  let score = 50;
  const reasons = [];

  if (lead.businessName && text.includes(lead.businessName)) {
    score += 8;
    reasons.push("business name included");
  }

  if (text.includes("Instagram")) {
    score += 6;
    reasons.push("channel context visible");
  }

  if (text.includes("DM") || text.includes("LINE")) {
    score += 8;
    reasons.push("booking context visible");
  }

  if (text.includes("予約") || text.includes("導線") || text.includes("流れ")) {
    score += 10;
    reasons.push("specific topic");
  }

  if (text.includes("ご参考までに") || text.includes("差し支えない範囲") || text.includes("かもしれません")) {
    score += 8;
    reasons.push("soft CTA");
  }

  HUMAN_SOFT_PHRASES.forEach((phrase) => {
    if (text.includes(phrase)) score += 2;
  });

  BANNED_PHRASES.forEach((phrase) => {
    if (text.includes(phrase)) {
      score -= 18;
      reasons.push(`banned phrase: ${phrase}`);
    }
  });

  SALESY_PHRASES.forEach((phrase) => {
    if (text.includes(phrase)) {
      score -= 8;
      reasons.push(`too salesy: ${phrase}`);
    }
  });

  if (text.includes("魅了されています")) {
    score -= 8;
    reasons.push("too strong praise");
  }

  if (text.includes("いつも")) {
    score -= 5;
    reasons.push("sounds assumptive");
  }

  if (text.length < 75) {
    score -= 8;
    reasons.push("too short");
  }

  if (text.length > 180) {
    score -= 6;
    reasons.push("too long for DM");
  }

  const sentenceCount = text.split("。").filter(Boolean).length;
  if (sentenceCount >= 4) {
    score -= 4;
    reasons.push("slightly long structure");
  }

  return {
    text,
    score: Math.max(0, Math.min(100, score)),
    reasons
  };
}
