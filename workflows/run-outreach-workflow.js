import { businessTypes } from '../config/business-types.js';
import { runSalesPipeline } from '../pipeline/run-sales-pipeline.js';
import { generateSalesMessages } from '../agents/sales-manager.js';
import { polishSalesMessage } from '../agents/message-polisher.js';
import { buildSalesStrategy } from '../agents/sales-strategy.js';
import { upsertLead } from '../crm/lead-store.js';
import { appendConversationEvent } from '../crm/conversation-store.js';
import { sendMessage } from '../channels/sender.js';
import { leadStatuses } from '../config/lead-statuses.js';
import { createApprovalRequest, resolveApprovalRequest } from '../approvals/approval-store.js';
import { outreachRules } from '../config/outreach-rules.js';
import { getLiveApprovalPolicy } from '../config/live-approval-policy.js';

function buildSkippedLead(lead, skippedReason) {
  return { ...lead, skippedReason, status: leadStatuses.SKIPPED, updatedAt: new Date().toISOString() };
}

export async function runOutreachWorkflow({ rawLead, sendMode = 'dry_run', autoApprove = true, campaignId = null }) {
  let lead = await runSalesPipeline({
    rawLead,
    businessTypes,
    generateMessages: generateSalesMessages,
    polishMessage: polishSalesMessage
  });

  lead = buildSalesStrategy(lead);

  await appendConversationEvent(lead.id, {
    role: 'system', eventType: 'lead_prepared', campaignId,
    text: `Lead prepared with score ${lead.scoring?.totalScore || 0}`
  });

  const hasMessageCandidate = Boolean(lead.polishedMessage || lead.selectedMessage?.text || lead.messages?.length);
  const score = lead.scoring?.totalScore || 0;

  if (score < outreachRules.minimumScoreToMessage) {
    const skippedLead = buildSkippedLead(lead, 'score_below_minimum_threshold');
    await appendConversationEvent(lead.id, { role: 'system', eventType: 'lead_skipped', campaignId, text: `Lead skipped because score ${score} is below threshold ${outreachRules.minimumScoreToMessage}` });
    await upsertLead(skippedLead);
    return skippedLead;
  }

  if (!hasMessageCandidate) {
    const skippedLead = buildSkippedLead(lead, 'no_message_candidate');
    await appendConversationEvent(lead.id, { role: 'system', eventType: 'lead_skipped', campaignId, text: 'Lead skipped because no message candidate was available' });
    await upsertLead(skippedLead);
    return skippedLead;
  }

  lead = { ...lead, status: leadStatuses.READY_TO_MESSAGE, updatedAt: new Date().toISOString() };

  const approvalRequest = await createApprovalRequest({
    id: `${lead.id}-approval`,
    leadId: lead.id,
    businessName: lead.businessName,
    channel: lead.salesStrategy?.primaryChannel || lead.channel,
    candidateMessages: lead.messages || [],
    selectedMessage: lead.selectedMessage || null,
    polishedMessage: lead.polishedMessage || lead.selectedMessage?.text || '',
    salesStrategy: lead.salesStrategy,
    stage: 'first_outreach'
  });

  lead = { ...lead, approvalRequest, status: leadStatuses.PENDING_APPROVAL, updatedAt: new Date().toISOString() };

  const livePolicy = getLiveApprovalPolicy();
  const mustWaitForManualApproval = sendMode === 'live' && livePolicy.blockAutoApproveInLive;
  if (!autoApprove || mustWaitForManualApproval) {
    await upsertLead(lead);
    return lead;
  }

  const approval = await resolveApprovalRequest(lead.id, 'approved', {
    finalMessage: lead.polishedMessage || lead.selectedMessage?.text || '',
    reviewerNote: 'Auto-approved in workflow',
    approvalSource: 'auto'
  });

  lead = { ...lead, approvalRequest: approval, status: leadStatuses.MESSAGE_APPROVED, updatedAt: new Date().toISOString() };

  if (approval?.finalMessage) {
    lead = await sendMessage({
      lead,
      text: approval.finalMessage,
      channel: lead.salesStrategy?.primaryChannel || lead.channel,
      mode: sendMode,
      stage: 'first_outreach',
      approvalRequest: approval
    });
  }

  await upsertLead(lead);
  return lead;
}
