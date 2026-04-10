import { listLeads } from '../crm/lead-store.js';
import { listApprovalRequests } from '../approvals/approval-store.js';
import { listFollowups } from '../followups/followup-store.js';
import { listInboundEvents } from '../crm/inbound-event-store.js';
import { listCampaigns } from '../campaigns/campaign-store.js';
import { listRows } from '../services/db.js';

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export async function getAnalyticsSummary() {
  const [leads, approvals, followups, inbound, campaigns, sendLogs] = await Promise.all([
    listLeads(),
    listApprovalRequests(),
    listFollowups(),
    listInboundEvents(),
    listCampaigns(),
    listRows('send_logs', { orderBy: 'sent_at DESC' })
  ]);

  return {
    totals: {
      leads: leads.length,
      approvals: approvals.length,
      pendingApprovals: approvals.filter((a) => a.status === 'pending').length,
      followups: followups.length,
      pendingFollowups: followups.filter((f) => f.status === 'pending').length,
      inboundEvents: inbound.length,
      campaigns: campaigns.length,
      sentMessages: sendLogs.length,
      replies: leads.filter((lead) => Boolean(lead.lastInboundReply)).length,
      interested: leads.filter((lead) => lead.status === 'interested').length
    },
    leadsByStatus: countBy(leads, (item) => item.status),
    approvalsByStatus: countBy(approvals, (item) => item.status),
    followupsByStatus: countBy(followups, (item) => item.status),
    campaignsByStatus: countBy(campaigns, (item) => item.status),
    sendsByChannel: countBy(sendLogs, (item) => item.channel),
    sendsByMode: countBy(sendLogs, (item) => item.mode),
    topRecentInbound: inbound.slice(0, 10)
  };
}
