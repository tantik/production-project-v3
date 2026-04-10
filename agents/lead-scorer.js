import { scoringRules } from "../config/scoring-rules.js";

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function calculateNicheFit(lead) {
  return scoringRules.supportedNiches.includes(lead.niche) ? 100 : 20;
}

function calculateDigitalPresence(lead) {
  let score = 0;
  if (lead.hasInstagram) score += 50;
  if (lead.hasLine) score += 25;
  if (lead.hasWebsite) score += 25;
  return clamp(score);
}

function calculateBookingProblem(lead) {
  let score = 0;
  if (lead.bookingMethod === "instagram_dm") score += 60;
  if (lead.bookingMethod === "unknown") score += 40;
  if (!lead.hasWebsite) score += 15;
  if (!lead.hasLine) score += 10;
  if (lead.hasLine && lead.bookingMethod === "instagram_dm") score += 20;
  return clamp(score);
}

function calculateAutomationPotential(lead) {
  let score = 30;
  const joinedPainPoints = (lead.painPoints || []).join(" ");
  if (joinedPainPoints.includes("予約導線")) score += 20;
  if (joinedPainPoints.includes("整理")) score += 15;
  if (joinedPainPoints.includes("DM")) score += 20;
  if (!lead.hasWebsite) score += 10;
  if (lead.hasLine) score += 5;
  return clamp(score);
}

function calculateActivitySignal(lead) {
  if (lead.postingFrequency === "high") return 100;
  if (lead.postingFrequency === "medium") return 70;
  if (lead.postingFrequency === "low") return 45;
  return 40;
}

function weightedScore(parts) {
  const { weights } = scoringRules;
  return Math.round(
    (parts.nicheFit * weights.nicheFit +
      parts.digitalPresence * weights.digitalPresence +
      parts.bookingProblem * weights.bookingProblem +
      parts.automationPotential * weights.automationPotential +
      parts.activitySignal * weights.activitySignal) /
      100
  );
}

function resolveGrade(totalScore) {
  const { grading } = scoringRules;
  if (totalScore >= grading.A) return "A";
  if (totalScore >= grading.B) return "B";
  if (totalScore >= grading.C) return "C";
  return "D";
}

function buildReasons(lead, parts) {
  const reasons = [];
  if (parts.nicheFit >= 80) reasons.push("supported niche");
  if (lead.hasInstagram) reasons.push("active digital presence on Instagram");
  if (lead.hasLine) reasons.push("LINE presence detected");
  if (!lead.hasLine) reasons.push("LINE opportunity detected");
  if (lead.bookingMethod === "instagram_dm") reasons.push("reservation flow may rely on DM entry point");
  if (!lead.hasWebsite) reasons.push("no clear external booking page");
  if (parts.automationPotential >= 65) reasons.push("good fit for workflow optimization");
  return reasons;
}

function recommendOffer(lead) {
  if (!lead.hasLine && lead.bookingMethod === "instagram_dm") {
    return "line_booking_automation";
  }
  if (lead.hasLine && lead.bookingMethod === "instagram_dm") {
    return "line_flow_optimization";
  }
  if (!lead.hasWebsite) {
    return "simple_booking_lp";
  }
  return "sales_automation_support";
}

export async function scoreLead(lead) {
  const parts = {
    nicheFit: calculateNicheFit(lead),
    digitalPresence: calculateDigitalPresence(lead),
    bookingProblem: calculateBookingProblem(lead),
    automationPotential: calculateAutomationPotential(lead),
    activitySignal: calculateActivitySignal(lead)
  };

  const totalScore = weightedScore(parts);
  const grade = resolveGrade(totalScore);
  const reasons = buildReasons(lead, parts);
  const recommendedOffer = recommendOffer(lead);
  const scoring = { parts, totalScore, grade, reasons, recommendedOffer };

  return {
    ...lead,
    scoring,
    recommendedOffer,
    updatedAt: new Date().toISOString(),
    status: "scored"
  };
}
