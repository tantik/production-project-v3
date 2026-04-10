import { loadEnv } from '../services/env.js';
import { initDatabase } from '../services/db.js';
import { processDueCampaigns } from '../campaigns/campaign-scheduler.js';

loadEnv();
await initDatabase();

const processed = await processDueCampaigns();
console.log(JSON.stringify(processed, null, 2));
