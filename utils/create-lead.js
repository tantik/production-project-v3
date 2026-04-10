function containsAny(text, patterns = []) {
  if (!text) return false;
  const normalized = String(text).toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

function inferHasLine(rawLead) {
  if (rawLead.hasLine === true) return true;
  if (rawLead.lineUrl) return true;

  const text = [rawLead.instagramBio, rawLead.notes, rawLead.rawText]
    .filter(Boolean)
    .join(" ");

  return containsAny(text, [
    "line",
    "line予約",
    "line official",
    "line公式",
    "公式line",
    "lineから",
    "ライン"
  ]);
}

function inferHasWebsite(rawLead) {
  if (rawLead.hasWebsite === true) return true;

  const websiteUrl = String(rawLead.websiteUrl || "")
    .trim()
    .toLowerCase();

  if (
    websiteUrl &&
    !websiteUrl.includes("instagram.com") &&
    !websiteUrl.includes("line.me")
  ) {
    return true;
  }

  const text = [rawLead.instagramBio, rawLead.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return containsAny(text, [
    "ホームページ",
    "website",
    "web site",
    "webサイト",
    "公式サイト",
    "予約フォーム",
    "予約ページ"
  ]);
}

export function createLead(rawLead = {}) {
  const now = new Date().toISOString();
  const hasInstagram = Boolean(rawLead.instagramHandle || rawLead.instagramUrl);
  const hasLine = inferHasLine(rawLead);
  const hasWebsite = inferHasWebsite(rawLead);

  return {
    id: rawLead.id || `lead_${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    source: rawLead.source || "instagram",
    channel: rawLead.channel || "instagram_dm",
    businessName: rawLead.businessName || "",
    niche: rawLead.niche || "",
    city: rawLead.city || "",
    instagramHandle: rawLead.instagramHandle || "",
    instagramUrl: rawLead.instagramUrl || "",
    instagramBio: rawLead.instagramBio || "",
    instagramRecipientId: rawLead.instagramRecipientId || "",
    websiteUrl: rawLead.websiteUrl || "",
    email: rawLead.email || rawLead.contactEmail || "",
    lineUrl: rawLead.lineUrl || "",
    lineUserId: rawLead.lineUserId || "",
    notes: rawLead.notes || "",
    rawText: rawLead.rawText || "",
    hasInstagram,
    hasLine,
    hasWebsite,
    bookingMethod: rawLead.bookingMethod || "",
    postingFrequency: rawLead.postingFrequency || "",
    strengths: Array.isArray(rawLead.strengths) ? rawLead.strengths : [],
    painPoints: Array.isArray(rawLead.painPoints) ? rawLead.painPoints : [],
    enrichment: null,
    scoring: null,
    messages: [],
    selectedMessage: null,
    polishedMessage: null,
    recommendedOffer: "",
    salesStrategy: null,
    outreach: null,
    lastInboundReply: null,
    replyPlan: null,
    status: "new"
  };
}
