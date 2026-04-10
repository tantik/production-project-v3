import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.resolve("data/conversations");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function filePath(leadId) {
  return path.join(DATA_DIR, `${leadId}.json`);
}

export async function getConversation(leadId) {
  await ensureDir();
  try {
    const raw = await fs.readFile(filePath(leadId), "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      leadId,
      messages: [],
      nextAction: null,
      updatedAt: new Date().toISOString()
    };
  }
}

export async function appendConversationEvent(leadId, event) {
  const conversation = await getConversation(leadId);
  conversation.messages.push({
    ...event,
    at: event.at || new Date().toISOString()
  });
  conversation.updatedAt = new Date().toISOString();
  await fs.writeFile(filePath(leadId), JSON.stringify(conversation, null, 2), "utf-8");
  return conversation;
}

export async function setConversationNextAction(leadId, nextAction) {
  const conversation = await getConversation(leadId);
  conversation.nextAction = nextAction;
  conversation.updatedAt = new Date().toISOString();
  await fs.writeFile(filePath(leadId), JSON.stringify(conversation, null, 2), "utf-8");
  return conversation;
}
