import { businessTypes } from "../config/business-types.js";
import { runSalesPipeline } from "../pipeline/run-sales-pipeline.js";
import { generateSalesMessages } from "../agents/sales-manager.js";
import { polishSalesMessage } from "../agents/message-polisher.js";
import { buildSalesStrategy } from "../agents/sales-strategy.js";
import { upsertLead } from "../crm/lead-store.js";
import { appendConversationEvent } from "../crm/conversation-store.js";
import { sendMessage } from "../channels/sender.js";
import { leadStatuses } from "../config/lead-statuses.js";
import { createApprovalRequest, resolveApprovalRequest } from "../approvals/approval-store.js";

export async function runOutreachWorkflow({ rawLead, sendMode = "dry_run", autoApprove = true }) {
  let lead = await runSalesPipeline({
    rawLead,
    businessTypes,
    generateMessages: generateSalesMessages,
    polishMessage: polishSalesMessage
  });

  lead = buildSalesStrategy(lead);

  await appendConversationEvent(lead.id, {
    role: "system",
    eventType: "lead_prepared",
    text: `Lead prepared with score ${lead.scoring?.totalScore || 0}`
  });

  lead = {
    ...lead,
    status: leadStatuses.READY_TO_MESSAGE,
    updatedAt: new Date().toISOString()
  };

  const approvalRequest = await createApprovalRequest({
    id: `${lead.id}-approval`,
    leadId: lead.id,
    businessName: lead.businessName,
    channel: lead.salesStrategy?.primaryChannel || lead.channel,
    candidateMessages: lead.messages || [],
    selectedMessage: lead.selectedMessage || null,
    polishedMessage: lead.polishedMessage || lead.selectedMessage?.text || "",
    salesStrategy: lead.salesStrategy,
    stage: "first_outreach"
  });

  lead = {
    ...lead,
    approvalRequest,
    status: leadStatuses.PENDING_APPROVAL,
    updatedAt: new Date().toISOString()
  };

  if (!autoApprove) {
    await upsertLead(lead);
    return lead;
  }

  const approval = await resolveApprovalRequest(lead.id, "approved", {
    finalMessage: lead.polishedMessage || lead.selectedMessage?.text || "",
    reviewerNote: "Auto-approved in workflow"
  });

  lead = {
    ...lead,
    approvalRequest: approval,
    status: leadStatuses.MESSAGE_APPROVED,
    updatedAt: new Date().toISOString()
  };

  if (approval?.finalMessage) {
    lead = await sendMessage({
      lead,
      text: approval.finalMessage,
      channel: lead.salesStrategy?.primaryChannel || lead.channel,
      mode: sendMode,
      stage: "first_outreach"
    });
  }

  await upsertLead(lead);
  return lead;
}
