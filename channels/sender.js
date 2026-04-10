import { appendConversationEvent } from "../crm/conversation-store.js";
import { leadStatuses } from "../config/lead-statuses.js";
import { InstagramAdapter } from "./adapters/instagram-adapter.js";
import { LineAdapter } from "./adapters/line-adapter.js";
import { EmailAdapter } from "./adapters/email-adapter.js";

const adapters = {
  instagram_dm: new InstagramAdapter(),
  line: new LineAdapter(),
  email: new EmailAdapter()
};

function getAdapter(channel) {
  return adapters[channel] || adapters.email;
}

export async function sendMessage({ lead, text, channel, mode = "dry_run", stage = "first_outreach" }) {
  const adapter = getAdapter(channel);
  const result = await adapter.send({ lead, text, mode });

  await appendConversationEvent(lead.id, {
    role: "outbound",
    channel,
    text,
    mode,
    eventType: "message_sent",
    stage,
    provider: result.provider,
    artifact: result.artifact,
    simulated: result.simulated
  });

  return {
    ...lead,
    outreach: {
      ...(lead.outreach || {}),
      channel,
      mode,
      stage,
      provider: result.provider,
      target: result.target,
      sentAt: new Date().toISOString(),
      lastMessage: text,
      sendArtifact: result.artifact,
      totalSent: (lead.outreach?.totalSent || 0) + 1
    },
    status: leadStatuses.SENT,
    updatedAt: new Date().toISOString()
  };
}
