import { loadEnv, getEnvSummary } from '../services/env.js';
import { initDatabase, getDatabaseKind } from '../services/db.js';
import fs from 'fs';
import path from 'path';

loadEnv();
await initDatabase();
const env = getEnvSummary();
const rootEnvPath = path.resolve('.env');
const checks = {
  envFilePresent: fs.existsSync(rootEnvPath),
  hasOpenAIKey: env.hasOpenAIKey,
  authEnabled: env.authEnabled,
  database: await getDatabaseKind(),
  serverPort: env.port,
  liveApprovalRequired: String(process.env.LIVE_REQUIRE_MANUAL_APPROVAL || 'true'),
  liveAutoApproveBlocked: String(process.env.LIVE_BLOCK_AUTO_APPROVE || 'true')
};
console.log('=== PREFLIGHT CHECK ===');
console.log(JSON.stringify(checks, null, 2));
