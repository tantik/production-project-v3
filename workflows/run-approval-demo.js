import { listApprovalRequests, resolveApprovalRequest } from "../approvals/approval-store.js";
import { listLeads, upsertLead } from "../crm/lead-store.js";
import { sendMessage } from "../channels/sender.js";
import { leadStatuses } from "../config/lead-statuses.js";

async function main() {
  const approvals = await listApprovalRequests();
  const pending = approvals.find((item) => item.status === "pending");

  if (!pending) {
    console.log("No pending approvals. Run workflow with autoApprove=false first.");
    return;
  }

  const leads = await listLeads();
  const lead = leads.find((item) => item.id === pending.leadId);

  if (!lead) {
    console.log("Lead not found for pending approval.");
    return;
  }

  const finalMessage = pending.polishedMessage;
  const approval = await resolveApprovalRequest(lead.id, "approved", {
    finalMessage,
    reviewerNote: "Approved in demo workflow"
  });

  const sentLead = await sendMessage({
    lead: {
      ...lead,
      status: leadStatuses.MESSAGE_APPROVED,
      approvalRequest: approval
    },
    text: finalMessage,
    channel: approval.channel,
    mode: "dry_run",
    stage: "first_outreach"
  });

  await upsertLead({ ...sentLead, approvalRequest: approval, updatedAt: new Date().toISOString() });

  console.log("=== APPROVAL RESOLVED ===");
  console.log(JSON.stringify(approval, null, 2));
  console.log("\n=== SENT MESSAGE ===");
  console.log(finalMessage);
}

main();
