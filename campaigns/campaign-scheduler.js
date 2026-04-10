import { listLeads, getLeadById, upsertLead } from '../crm/lead-store.js';
import { listCampaigns, upsertCampaign } from './campaign-store.js';
import { runOutreachWorkflow } from '../workflows/run-outreach-workflow.js';
import { appendConversationEvent } from '../crm/conversation-store.js';

export async function createCampaign({ name, leadIds = [], filters = {}, scheduledFor, channel = 'instagram_dm', sendMode = 'dry_run', autoApprove = false }) {
  const now = new Date().toISOString();
  const campaign = {
    id: `cmp_${Date.now()}`,
    name: name || `Campaign ${new Date().toLocaleString()}`,
    leadIds,
    filters,
    channel,
    sendMode,
    autoApprove,
    scheduledFor: scheduledFor || now,
    status: 'scheduled',
    createdAt: now,
    updatedAt: now,
    stats: { targeted: 0, processed: 0, sent: 0, skipped: 0, pendingApproval: 0 }
  };
  await upsertCampaign(campaign);
  return campaign;
}

async function resolveTargets(campaign) {
  if (campaign.leadIds?.length) {
    const leads = await Promise.all(campaign.leadIds.map((id) => getLeadById(id)));
    return leads.filter(Boolean);
  }
  const leads = await listLeads();
  return leads.filter((lead) => {
    if (campaign.filters?.status && lead.status !== campaign.filters.status) return false;
    if (campaign.filters?.channel && lead.channel !== campaign.filters.channel) return false;
    if (campaign.filters?.minScore && (lead.scoring?.totalScore || 0) < Number(campaign.filters.minScore)) return false;
    return true;
  });
}

export async function processCampaign(campaign) {
  const targets = await resolveTargets(campaign);
  const results = [];
  const stats = { targeted: targets.length, processed: 0, sent: 0, skipped: 0, pendingApproval: 0 };

  for (const lead of targets) {
    const result = await runOutreachWorkflow({ rawLead: { ...lead, channel: campaign.channel || lead.channel }, sendMode: campaign.sendMode || 'dry_run', autoApprove: campaign.autoApprove ?? false, campaignId: campaign.id });
    results.push({ leadId: lead.id, status: result.status, skippedReason: result.skippedReason || null });
    stats.processed += 1;
    if (result.status === 'sent') stats.sent += 1;
    else if (result.status === 'pending_approval') stats.pendingApproval += 1;
    else if (result.status === 'skipped') stats.skipped += 1;

    await appendConversationEvent(lead.id, {
      role: 'system',
      eventType: 'campaign_processed',
      campaignId: campaign.id,
      text: `Campaign ${campaign.name} processed lead with result ${result.status}`
    });
    await upsertLead(result);
  }

  const updated = {
    ...campaign,
    status: 'completed',
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    stats,
    results
  };
  await upsertCampaign(updated);
  return updated;
}

export async function processDueCampaigns(referenceIso = new Date().toISOString()) {
  const campaigns = await listCampaigns();
  const due = campaigns.filter((item) => item.status === 'scheduled' && item.scheduledFor <= referenceIso);
  const processed = [];
  for (const campaign of due) {
    processed.push(await processCampaign(campaign));
  }
  return processed;
}
