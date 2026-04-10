import fs from 'fs';
import path from 'path';

let loaded = false;

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) return null;
  const key = trimmed.slice(0, eqIndex).trim();
  let value = trimmed.slice(eqIndex + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf-8');
  for (const line of raw.split(/\r?\n/)) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    if (!(parsed.key in process.env)) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

export function loadEnv() {
  if (loaded) return;
  loaded = true;
  [path.resolve('.env.local'), path.resolve('.env')].forEach(loadEnvFile);
}

function masked(value) {
  if (!value) return null;
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function getEnvSummary() {
  loadEnv();
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 3000),
    database: process.env.DATABASE_URL ? 'postgres' : 'sqlite',
    sqlitePath: process.env.DATABASE_URL ? null : (process.env.SQLITE_PATH || path.resolve('data/app.db')),
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    hasLineAccessToken: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    hasLineChannelSecret: Boolean(process.env.LINE_CHANNEL_SECRET),
    hasLineWebhookVerify: Boolean(process.env.LINE_WEBHOOK_VERIFY_TOKEN),
    hasMetaAccessToken: Boolean(process.env.META_PAGE_ACCESS_TOKEN),
    hasInstagramWebhookVerify: Boolean(process.env.INSTAGRAM_VERIFY_TOKEN),
    hasSmtpHost: Boolean(process.env.SMTP_HOST),
    authEnabled: Boolean(process.env.DASHBOARD_PASSWORD),
    masked: {
      openai: masked(process.env.OPENAI_API_KEY || ''),
      lineAccessToken: masked(process.env.LINE_CHANNEL_ACCESS_TOKEN || ''),
      metaAccessToken: masked(process.env.META_PAGE_ACCESS_TOKEN || '')
    }
  };
}
