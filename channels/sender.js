import { appendConversationEvent } from '../crm/conversation-store.js';
import { leadStatuses } from '../config/lead-statuses.js';
import { InstagramAdapter } from './adapters/instagram-adapter.js';
import { LineAdapter } from './adapters/line-adapter.js';
import { EmailAdapter } from './adapters/email-adapter.js';
import { canSendMessage, getSendLogSummary, recordSentMessage } from '../guards/send-guard.js';
import { canLiveSend } from '../config/live-approval-policy.js';

const adapters = {
  instagram_dm: new InstagramAdapter(),
  line: new LineAdapter(),
  email: new EmailAdapter()
};

function getAdapter(channel) {
  return adapters[channel] || adapters.email;
}

export async function sendMessage({ lead, text, channel, mode = 'dry_run', stage = 'first_outreach', approvalRequest = null }) {
  if (mode === 'live') {
    const livePolicy = canLiveSend({ approvalRequest: approvalRequest || lead.approvalRequest || null });
    if (!livePolicy.allowed) {
      await appendConversationEvent(lead.id, {
        role: 'system', channel, text: `Live message blocked: ${livePolicy.reason}`,
        mode, eventType: 'message_blocked', stage, livePolicy
      });
      return {
        ...lead,
        outreach: { ...(lead.outreach || {}), channel, mode, stage, blockedAt: new Date().toISOString(), lastBlockedReason: livePolicy.reason },
        skippedReason: livePolicy.reason,
        status: leadStatuses.PENDING_APPROVAL,
        updatedAt: new Date().toISOString()
      };
    }
  }

  const guard = await canSendMessage({ lead, channel, mode });
  if (!guard.allowed) {
    await appendConversationEvent(lead.id, {
      role: 'system', channel, text: `Message blocked: ${guard.reason}`,
      mode, eventType: 'message_blocked', stage, guard
    });
    return {
      ...lead,
      outreach: { ...(lead.outreach || {}), channel, mode, stage, blockedAt: new Date().toISOString(), lastBlockedReason: guard.reason },
      skippedReason: guard.reason,
      status: leadStatuses.SKIPPED,
      updatedAt: new Date().toISOString()
    };
  }

  const adapter = getAdapter(channel);
  const result = await adapter.send({ lead, text, mode });
  await recordSentMessage({ lead, channel, mode, stage, artifact: result.artifact, provider: result.provider });
  const sendLogSummary = await getSendLogSummary(mode);

  await appendConversationEvent(lead.id, {
    role: 'outbound', channel, text, mode, eventType: 'message_sent', stage,
    provider: result.provider, artifact: result.artifact, simulated: result.simulated, sendLogSummary
  });

  return {
    ...lead,
    outreach: {
      ...(lead.outreach || {}), channel, mode, stage, provider: result.provider, target: result.target,
      sentAt: new Date().toISOString(), lastMessage: text, sendArtifact: result.artifact,
      totalSent: (lead.outreach?.totalSent || 0) + 1
    },
    status: leadStatuses.SENT,
    updatedAt: new Date().toISOString()
  };
}
