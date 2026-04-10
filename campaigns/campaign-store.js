import { getRow, listRows, upsertRow } from '../services/db.js';

function toRow(campaign) {
  return {
    id: campaign.id,
    status: campaign.status || 'scheduled',
    scheduled_for: campaign.scheduledFor || campaign.createdAt || new Date().toISOString(),
    created_at: campaign.createdAt || new Date().toISOString(),
    updated_at: campaign.updatedAt || new Date().toISOString(),
    data: campaign
  };
}

export async function upsertCampaign(campaign) {
  await upsertRow('campaigns', toRow(campaign));
  return campaign;
}

export async function getCampaign(campaignId) {
  return getRow('campaigns', 'id', campaignId);
}

export async function listCampaigns() {
  return listRows('campaigns', { orderBy: 'updated_at DESC' });
}

export async function listDueCampaigns(referenceIso = new Date().toISOString()) {
  return listRows('campaigns', {
    where: [
      { field: 'status', op: '=', value: 'scheduled' },
      { field: 'scheduled_for', op: '<=', value: referenceIso }
    ],
    orderBy: 'scheduled_for ASC'
  });
}
