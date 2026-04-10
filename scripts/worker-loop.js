import { loadEnv } from '../services/env.js';
import { initDatabase } from '../services/db.js';
import { processDueCampaigns } from '../campaigns/campaign-scheduler.js';
import { processDueFollowups } from '../followups/followup-manager.js';

loadEnv();
await initDatabase();

const once = process.argv.includes('--once');
const intervalMs = Number(process.env.WORKER_INTERVAL_MS || 30000);
const sendMode = process.env.WORKER_SEND_MODE || process.env.DEFAULT_SEND_MODE || 'dry_run';

async function runCycle() {
  const now = new Date().toISOString();
  const campaigns = await processDueCampaigns(now);
  const followups = await processDueFollowups({ mode: sendMode, nowIso: now });
  const summary = {
    at: now,
    campaignsProcessed: campaigns.length,
    followupsProcessed: followups.length,
    sendMode
  };
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

if (once) {
  await runCycle();
  process.exit(0);
}

console.log(`Worker started. Interval: ${intervalMs}ms. Mode: ${sendMode}`);
await runCycle();
setInterval(() => {
  runCycle().catch((error) => console.error('worker cycle error:', error?.message || error));
}, intervalMs);
