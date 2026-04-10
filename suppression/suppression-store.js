import { listRows, upsertRow } from '../services/db.js';

function normalizeEntry(payload) {
  const id = payload.id || payload.leadId || `${payload.channel || 'unknown'}:${payload.target || payload.businessName || Date.now()}`;
  return {
    id,
    leadId: payload.leadId || null,
    businessName: payload.businessName || '',
    channel: payload.channel || null,
    target: payload.target || null,
    reason: payload.reason || 'suppressed',
    source: payload.source || 'system',
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function toRow(entry) {
  return {
    id: entry.id,
    lead_id: entry.leadId,
    business_name: entry.businessName,
    channel: entry.channel,
    target: entry.target,
    reason: entry.reason,
    source: entry.source,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
    data: entry
  };
}

export async function listSuppressed() {
  return listRows('suppression', { orderBy: 'created_at DESC' });
}

export async function addSuppressed(payload) {
  const entry = normalizeEntry(payload);
  await upsertRow('suppression', toRow(entry));
  return entry;
}

export async function isSuppressed({ leadId, channel, target }) {
  const items = await listSuppressed();
  return items.some((item) => (leadId && item.leadId === leadId) || (channel && target && item.channel === channel && item.target === target));
}
