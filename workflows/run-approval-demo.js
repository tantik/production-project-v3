import { listApprovalRequests, resolveApprovalRequest } from '../approvals/approval-store.js';
import { listLeads, upsertLead } from '../crm/lead-store.js';
import { sendMessage } from '../channels/sender.js';
import { leadStatuses } from '../config/lead-statuses.js';
import { runOutreachWorkflow } from './run-outreach-workflow.js';

async function ensurePendingApproval() {
  const approvals = await listApprovalRequests();
  const existing = approvals.find((item) => item.status === 'pending');
  if (existing) return existing;

  const rawLead = {
    id: 'lead_manual_approval_demo',
    source: 'instagram',
    channel: 'instagram_dm',
    businessName: 'Manual Approval Salon',
    niche: 'nail',
    city: 'Tokyo',
    instagramHandle: '@manualapprovalsalon',
    instagramUrl: 'https://instagram.com/manualapprovalsalon',
    instagramBio: 'ご予約はDMから。',
    notes: 'Created by approval demo.',
    rawText: 'DM予約 / 小規模サロン'
  };

  const lead = await runOutreachWorkflow({ rawLead, sendMode: 'dry_run', autoApprove: false });
  return lead.approvalRequest;
}

async function main() {
  const pending = await ensurePendingApproval();

  if (!pending) {
    console.log('Unable to create pending approval.');
    return;
  }

  const leads = await listLeads();
  const lead = leads.find((item) => item.id === pending.leadId);

  if (!lead) {
    console.log('Lead not found for pending approval.');
    return;
  }

  const finalMessage = pending.polishedMessage;
  const approval = await resolveApprovalRequest(lead.id, 'approved', {
    finalMessage,
    reviewerNote: 'Approved in demo workflow',
    approvalSource: 'manual'
  });

  const sentLead = await sendMessage({
    lead: {
      ...lead,
      status: leadStatuses.MESSAGE_APPROVED,
      approvalRequest: approval
    },
    text: finalMessage,
    channel: approval.channel,
    mode: 'dry_run',
    stage: 'first_outreach'
  });

  await upsertLead({ ...sentLead, approvalRequest: approval, updatedAt: new Date().toISOString() });

  console.log('=== APPROVAL RESOLVED ===');
  console.log(JSON.stringify(approval, null, 2));
  console.log('\n=== SENT MESSAGE ===');
  console.log(finalMessage);
}

main();
