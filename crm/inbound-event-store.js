import { insertRow, listRows } from '../services/db.js';

export async function addInboundEvent(event) {
  const record = {
    id: event.id || `${event.provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    provider: event.provider,
    lead_id: event.leadId || null,
    channel: event.channel || null,
    external_thread_id: event.externalThreadId || null,
    external_user_id: event.externalUserId || null,
    event_type: event.eventType || 'message',
    text: event.text || '',
    received_at: event.receivedAt || new Date().toISOString(),
    data: {
      ...event,
      receivedAt: event.receivedAt || new Date().toISOString()
    }
  };

  await insertRow('inbound_events', record);
  return record.data;
}

export async function listInboundEvents(limit = 100) {
  return listRows('inbound_events', { orderBy: 'received_at DESC', limit });
}
