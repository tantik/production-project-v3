import { getRow, listRows, upsertRow } from '../services/db.js';

function toRow(request) {
  return {
    lead_id: request.leadId,
    id: request.id,
    business_name: request.businessName || '',
    channel: request.channel || '',
    status: request.status || 'pending',
    stage: request.stage || 'first_outreach',
    created_at: request.createdAt || new Date().toISOString(),
    updated_at: request.updatedAt || new Date().toISOString(),
    data: request
  };
}

export async function createApprovalRequest(payload) {
  const request = {
    id: payload.id,
    leadId: payload.leadId,
    businessName: payload.businessName,
    channel: payload.channel,
    stage: payload.stage || 'first_outreach',
    candidateMessages: payload.candidateMessages || [],
    selectedMessage: payload.selectedMessage || null,
    polishedMessage: payload.polishedMessage || '',
    salesStrategy: payload.salesStrategy || null,
    status: 'pending',
    approvalSource: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await upsertRow('approvals', toRow(request));
  return request;
}

export async function getApprovalRequest(leadId) {
  return getRow('approvals', 'lead_id', leadId);
}

export async function listApprovalRequests() {
  return listRows('approvals', { orderBy: 'created_at DESC' });
}

export async function resolveApprovalRequest(leadId, decision, overrides = {}) {
  const request = await getApprovalRequest(leadId);
  if (!request) return null;
  const updated = {
    ...request,
    status: decision,
    decision,
    approvalSource: overrides.approvalSource || request.approvalSource || 'manual',
    finalMessage: overrides.finalMessage || request.polishedMessage,
    decidedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewerNote: overrides.reviewerNote || ''
  };
  await upsertRow('approvals', toRow(updated));
  return updated;
}
