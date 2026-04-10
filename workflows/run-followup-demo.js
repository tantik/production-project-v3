import { listLeads, upsertLead } from '../crm/lead-store.js';
import { scheduleFollowup, processDueFollowups } from '../followups/followup-manager.js';
import { runOutreachWorkflow } from './run-outreach-workflow.js';

async function ensureLeadWithoutReply() {
  const leads = await listLeads();
  const candidate = leads.find((item) => !item.lastInboundReply?.text && item.status === 'sent');
  if (candidate) return candidate;

  const rawLead = {
    id: 'lead_followup_demo',
    source: 'instagram',
    channel: 'instagram_dm',
    businessName: 'Followup Demo Salon',
    niche: 'nail',
    city: 'Tokyo',
    instagramHandle: '@followupdemo',
    instagramUrl: 'https://instagram.com/followupdemo',
    instagramBio: 'ご予約はDMまたはLINEから。',
    notes: 'Created by followup demo.',
    rawText: 'DM予約 / LINE予約 / 小規模サロン'
  };

  return runOutreachWorkflow({ rawLead, sendMode: 'dry_run', autoApprove: true });
}

async function main() {
  const lead = await ensureLeadWithoutReply();

  if (!lead) {
    console.log('No eligible lead found for follow-up demo.');
    return;
  }

  await scheduleFollowup(lead, {
    days: 0,
    reason: 'demo immediate followup',
    followupNumber: 1
  });

  const processed = await processDueFollowups({ mode: 'dry_run' });
  const refreshedLeads = await listLeads();
  const refreshedLead = refreshedLeads.find((item) => item.id === lead.id) || lead;
  await upsertLead(refreshedLead);

  console.log('=== FOLLOWUPS PROCESSED ===');
  console.log(JSON.stringify(processed, null, 2));
}

main();
