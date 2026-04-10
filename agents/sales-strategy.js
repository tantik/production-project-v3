function detectPrimaryChannel(lead) {
  if (lead.channel) return lead.channel;
  if (lead.hasInstagram) return "instagram_dm";
  if (lead.hasLine) return "line";
  return "email";
}

function detectBackupChannel(lead) {
  if (lead.hasLine && detectPrimaryChannel(lead) !== "line") return "line";
  if (lead.hasWebsite) return "email";
  return null;
}

function buildPersonalizationPoints(lead) {
  const points = [];
  const strengths = lead.strengths || [];
  const bio = String(lead.instagramBio || "");

  if (strengths.some((item) => item.includes("季節"))) points.push("seasonal design");
  if (strengths.some((item) => item.includes("丁寧"))) points.push("careful brand tone");
  if (strengths.some((item) => item.includes("デザイン") || item.includes("作品"))) points.push("visual portfolio");
  if (bio.includes("LINE") || lead.hasLine) points.push("LINE visible");
  if (lead.bookingMethod === "instagram_dm") points.push("DM booking visible");
  return [...new Set(points)].slice(0, 4);
}

function resolveOfferType(lead) {
  if (lead.recommendedOffer) return lead.recommendedOffer;
  if (lead.hasLine && lead.bookingMethod === "instagram_dm") return "line_flow_optimization";
  if (lead.bookingMethod === "instagram_dm") return "dm_booking_flow";
  return "soft_sales_automation";
}

export function buildSalesStrategy(lead) {
  const primaryChannel = detectPrimaryChannel(lead);
  const strategy = {
    primaryChannel,
    backupChannel: detectBackupChannel(lead),
    approachType: "soft_observation",
    offerType: resolveOfferType(lead),
    pressureLevel: "very_low",
    personalizationPoints: buildPersonalizationPoints(lead),
    firstMessageGoal: "get_reply_not_sell",
    ctaType: "soft_permission",
    followupPolicy: {
      enabled: true,
      maxFollowups: 2,
      firstFollowupAfterDays: 4,
      secondFollowupAfterDays: 10
    }
  };

  return {
    ...lead,
    salesStrategy: strategy,
    updatedAt: new Date().toISOString()
  };
}
