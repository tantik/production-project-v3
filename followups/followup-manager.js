import { upsertFollowup, getDueFollowups, cancelPendingFollowupsForLead } from "./followup-store.js";
import { appendConversationEvent } from "../crm/conversation-store.js";
import { sendMessage } from "../channels/sender.js";
import { upsertLead, listLeads } from "../crm/lead-store.js";
import { leadStatuses } from "../config/lead-statuses.js";

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString();
}

export function buildFollowupMessage(lead, followupNumber = 1) {
  if (followupNumber === 1) {
    return `${lead.businessName}様、先日は突然のご連絡失礼しました。もし今のご予約の流れについて、差し支えない範囲で少しだけ見直してみたいタイミングがあれば、短くお伝えできます。ご不要でしたらどうぞお気になさらないでください。`;
  }

  return `${lead.businessName}様、重ねて失礼いたします。こちらで最後にしますが、DMやLINEでのご予約導線について、今の雰囲気を崩さずに整理できそうな点があれば短くお伝えできます。必要なければご放念ください。`;
}

function hasInboundReply(lead) {
  return Boolean(lead.lastInboundReply?.text);
}

function hasReachedFollowupLimit(lead, task) {
  const maxFollowups = lead.salesStrategy?.followupPolicy?.maxFollowups ?? 2;
  return task.followupNumber > maxFollowups;
}

export async function scheduleFollowup(lead, { days, reason, followupNumber = 1 }) {
  const task = {
    id: `${lead.id}-followup-${followupNumber}`,
    leadId: lead.id,
    businessName: lead.businessName,
    channel: lead.salesStrategy?.primaryChannel || lead.channel,
    dueAt: addDays(new Date(), days),
    followupNumber,
    reason,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  await upsertFollowup(task);
  await appendConversationEvent(lead.id, {
    role: "system",
    eventType: "followup_scheduled",
    text: `Follow-up #${followupNumber} scheduled in ${days} days`,
    followupTaskId: task.id,
    reason
  });

  return {
    ...lead,
    status: leadStatuses.FOLLOWUP_PENDING,
    updatedAt: new Date().toISOString()
  };
}

export async function processDueFollowups({ mode = "dry_run", nowIso = new Date().toISOString() } = {}) {
  const dueTasks = await getDueFollowups(nowIso);
  const leads = await listLeads();
  const processed = [];

  for (const task of dueTasks) {
    const lead = leads.find((item) => item.id === task.leadId);
    if (!lead) continue;

    if ([leadStatuses.DO_NOT_CONTACT, leadStatuses.LOST, leadStatuses.WON].includes(lead.status)) {
      await upsertFollowup({ ...task, status: "cancelled", cancelledAt: new Date().toISOString(), cancelReason: "lead_in_terminal_status" });
      continue;
    }

    if (hasInboundReply(lead)) {
      await upsertFollowup({ ...task, status: "cancelled", cancelledAt: new Date().toISOString(), cancelReason: "inbound_reply_already_received" });
      continue;
    }

    if (hasReachedFollowupLimit(lead, task)) {
      await upsertFollowup({ ...task, status: "cancelled", cancelledAt: new Date().toISOString(), cancelReason: "followup_limit_reached" });
      continue;
    }

    const text = buildFollowupMessage(lead, task.followupNumber);
    const sentLead = await sendMessage({
      lead,
      text,
      channel: task.channel,
      mode,
      stage: `followup_${task.followupNumber}`
    });

    await upsertFollowup({ ...task, status: "completed", completedAt: new Date().toISOString() });
    await upsertLead({ ...sentLead, status: leadStatuses.SENT, updatedAt: new Date().toISOString() });
    processed.push({ leadId: lead.id, followupNumber: task.followupNumber, text });
  }

  return processed;
}

export { cancelPendingFollowupsForLead };
