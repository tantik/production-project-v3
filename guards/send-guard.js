import { getSendLimits } from '../config/send-limits.js';
import { isSuppressed } from '../suppression/suppression-store.js';
import { insertRow, listRows } from '../services/db.js';

function startOfDayIso(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function canSendMessage({ lead, channel, mode = 'dry_run' }) {
  const target = lead.instagramHandle || lead.instagramRecipientId || lead.lineUserId || lead.lineUrl || lead.websiteUrl || lead.businessName;
  if (await isSuppressed({ leadId: lead.id, channel, target })) {
    return { allowed: false, reason: 'suppressed' };
  }

  const limits = getSendLimits(mode);
  const todayStart = startOfDayIso();
  const todayEvents = await listRows('send_logs', {
    where: [
      { field: 'mode', op: '=', value: mode },
      { field: 'sent_at', op: '>=', value: todayStart }
    ],
    orderBy: 'sent_at DESC'
  });

  if (todayEvents.length >= limits.dailyTotal) {
    return { allowed: false, reason: 'daily_total_limit_reached', limits };
  }

  const channelEvents = todayEvents.filter((item) => item.channel === channel);
  const channelLimit = limits.perChannel[channel] ?? limits.dailyTotal;
  if (channelEvents.length >= channelLimit) {
    return { allowed: false, reason: 'channel_limit_reached', limits };
  }

  const lastForLead = (await listRows('send_logs', {
    where: [
      { field: 'lead_id', op: '=', value: lead.id },
      { field: 'channel', op: '=', value: channel }
    ],
    orderBy: 'sent_at DESC',
    limit: 1
  }))[0];

  if (lastForLead) {
    const hoursSince = (Date.now() - new Date(lastForLead.sent_at || lastForLead.sentAt).getTime()) / (1000 * 60 * 60);
    if (hoursSince < limits.minHoursBetweenMessagesToSameLead) {
      return {
        allowed: false,
        reason: 'cooldown_active',
        retryAfterHours: Math.ceil(limits.minHoursBetweenMessagesToSameLead - hoursSince)
      };
    }
  }

  return { allowed: true };
}

export async function recordSentMessage({ lead, channel, mode = 'dry_run', stage = 'first_outreach', artifact = null, provider = null }) {
  const sentAt = new Date().toISOString();
  await insertRow('send_logs', {
    id: `${lead.id}-${channel}-${Date.now()}`,
    lead_id: lead.id,
    business_name: lead.businessName,
    channel,
    mode,
    stage,
    artifact,
    sent_at: sentAt,
    data: {
      leadId: lead.id,
      businessName: lead.businessName,
      channel,
      mode,
      stage,
      artifact,
      provider,
      sentAt
    }
  });
}

export async function getSendLogSummary(mode = 'dry_run') {
  const todayStart = startOfDayIso();
  const today = await listRows('send_logs', {
    where: [
      { field: 'mode', op: '=', value: mode },
      { field: 'sent_at', op: '>=', value: todayStart }
    ],
    orderBy: 'sent_at DESC'
  });
  const byChannel = today.reduce((acc, item) => {
    acc[item.channel] = (acc[item.channel] || 0) + 1;
    return acc;
  }, {});
  return { totalToday: today.length, byChannel, limits: getSendLimits(mode) };
}
