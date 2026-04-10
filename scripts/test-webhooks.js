import { createLead } from '../utils/create-lead.js';
import { upsertLead } from '../crm/lead-store.js';
import { handleLeadReply } from '../agents/reply-manager.js';

const lead = createLead({
  id: 'webhook_test_lead',
  businessName: 'Webhook Test Salon',
  channel: 'line',
  source: 'line',
  lineUserId: 'U_TEST_123',
  rawText: 'created for webhook ingestion test'
});

await upsertLead(lead);
const updated = await handleLeadReply(lead, 'ありがとうございます。詳しく教えてください。');
await upsertLead(updated);
console.log(JSON.stringify({ ok: true, leadId: updated.id, status: updated.status, replyPlan: updated.replyPlan }, null, 2));
