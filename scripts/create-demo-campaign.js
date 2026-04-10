import { loadEnv } from '../services/env.js';
import { initDatabase } from '../services/db.js';
import { createCampaign } from '../campaigns/campaign-scheduler.js';
import { upsertLead } from '../crm/lead-store.js';
import { createLead } from '../utils/create-lead.js';

loadEnv();
await initDatabase();

const lead = createLead({
  id: `campaign_demo_${Date.now()}`,
  source: 'instagram',
  channel: 'instagram_dm',
  businessName: 'Campaign Demo Salon',
  niche: 'nail',
  city: 'Tokyo',
  instagramHandle: '@campaigndemo',
  instagramBio: 'DM予約対応しています。',
  rawText: 'Campaign demo lead'
});
await upsertLead(lead);
const campaign = await createCampaign({ name: 'Demo Campaign', leadIds: [lead.id], scheduledFor: new Date().toISOString(), sendMode: 'dry_run', autoApprove: false });
console.log(JSON.stringify(campaign, null, 2));
