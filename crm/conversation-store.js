import { getRow, upsertRow } from '../services/db.js';

function defaultConversation(leadId) {
  return {
    leadId,
    messages: [],
    nextAction: null,
    updatedAt: new Date().toISOString()
  };
}

function toRow(conversation) {
  return {
    lead_id: conversation.leadId,
    updated_at: conversation.updatedAt || new Date().toISOString(),
    data: conversation
  };
}

export async function getConversation(leadId) {
  return (await getRow('conversations', 'lead_id', leadId)) || defaultConversation(leadId);
}

export async function appendConversationEvent(leadId, event) {
  const conversation = await getConversation(leadId);
  conversation.messages.push({
    ...event,
    at: event.at || new Date().toISOString()
  });
  conversation.updatedAt = new Date().toISOString();
  await upsertRow('conversations', toRow(conversation));
  return conversation;
}

export async function setConversationNextAction(leadId, nextAction) {
  const conversation = await getConversation(leadId);
  conversation.nextAction = nextAction;
  conversation.updatedAt = new Date().toISOString();
  await upsertRow('conversations', toRow(conversation));
  return conversation;
}
