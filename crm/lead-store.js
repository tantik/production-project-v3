import { getRow, listRows, upsertRow } from '../services/db.js';

function toLeadRow(lead) {
  return {
    id: lead.id,
    business_name: lead.businessName || '',
    channel: lead.channel || '',
    status: lead.status || '',
    created_at: lead.createdAt || new Date().toISOString(),
    updated_at: lead.updatedAt || new Date().toISOString(),
    data: lead
  };
}

export async function upsertLead(lead) {
  await upsertRow('leads', toLeadRow(lead));
  return lead;
}

export async function listLeads() {
  return listRows('leads', { orderBy: 'updated_at DESC' });
}

export async function getLeadById(leadId) {
  return getRow('leads', 'id', leadId);
}

export async function findLeadByExternalIdentity({ channel, target, lineUserId, instagramRecipientId }) {
  const leads = await listLeads();
  return leads.find((lead) => {
    if (lineUserId && lead.lineUserId === lineUserId) return true;
    if (instagramRecipientId && lead.instagramRecipientId === instagramRecipientId) return true;
    if (channel === 'instagram_dm' && target && (lead.instagramHandle === target || lead.instagramUrl === target)) return true;
    if (channel === 'line' && target && (lead.lineUrl === target || lead.lineUserId === target)) return true;
    return false;
  }) || null;
}
