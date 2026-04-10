import http from 'http';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { loadEnv, getEnvSummary } from '../services/env.js';
import { initDatabase, getDatabaseKind } from '../services/db.js';
import { listLeads, getLeadById, upsertLead, findLeadByExternalIdentity } from '../crm/lead-store.js';
import { getConversation, appendConversationEvent } from '../crm/conversation-store.js';
import { listApprovalRequests, resolveApprovalRequest } from '../approvals/approval-store.js';
import { listFollowups } from '../followups/followup-store.js';
import { listSuppressed, addSuppressed } from '../suppression/suppression-store.js';
import { listInboundEvents, addInboundEvent } from '../crm/inbound-event-store.js';
import { handleLeadReply } from '../agents/reply-manager.js';
import { sendMessage } from '../channels/sender.js';
import { runOutreachWorkflow } from '../workflows/run-outreach-workflow.js';
import { leadStatuses } from '../config/lead-statuses.js';
import { createLead } from '../utils/create-lead.js';
import { isAuthenticated, requireAuth, loginWithPassword, createSessionCookie, clearSessionCookie, isAuthEnabled } from '../services/auth.js';
import { getAnalyticsSummary } from '../analytics/analytics-service.js';
import { createCampaign, processDueCampaigns } from '../campaigns/campaign-scheduler.js';
import { listCampaigns } from '../campaigns/campaign-store.js';

loadEnv();
await initDatabase();

const port = Number(process.env.PORT || 3000);
const publicDir = path.resolve('public');

function json(res, payload, status = 200, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(payload, null, 2));
}

function text(res, payload, status = 200, type = 'text/plain; charset=utf-8', headers = {}) {
  res.writeHead(status, { 'Content-Type': type, ...headers });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function parseJsonBody(buffer) {
  if (!buffer?.length) return {};
  try { return JSON.parse(buffer.toString('utf-8')); } catch { return {}; }
}

function verifyLineSignature(rawBody, signatureHeader) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return true;
  if (!signatureHeader) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  return digest === signatureHeader;
}

async function serveDashboard(res) {
  const html = await fs.readFile(path.join(publicDir, 'index.html'), 'utf-8');
  return text(res, html, 200, 'text/html; charset=utf-8');
}

async function processInboundMessage({ provider, channel, externalUserId, externalThreadId, text: inboundText, rawEvent }) {
  let lead = await findLeadByExternalIdentity({
    channel,
    target: channel === 'instagram_dm' ? externalUserId : externalThreadId,
    lineUserId: channel === 'line' ? externalUserId : null,
    instagramRecipientId: channel === 'instagram_dm' ? externalUserId : null
  });

  if (!lead) {
    lead = createLead({
      id: `lead_${provider}_${Date.now()}`,
      source: provider,
      channel,
      businessName: `${provider.toUpperCase()} inbound lead`,
      lineUserId: channel === 'line' ? externalUserId : '',
      instagramRecipientId: channel === 'instagram_dm' ? externalUserId : '',
      rawText: inboundText
    });
  }

  const inboundEvent = await addInboundEvent({
    provider, leadId: lead.id, channel, externalUserId, externalThreadId, text: inboundText, rawEvent
  });

  await appendConversationEvent(lead.id, { role: 'inbound', channel, text: inboundText, eventType: 'webhook_inbound_received', provider, inboundEventId: inboundEvent.id || null });
  const updatedLead = await handleLeadReply(lead, inboundText);
  await upsertLead(updatedLead);
  return updatedLead;
}

async function handleProtected(req, res, pathname, url) {
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET' && pathname === '/api/health') return json(res, { ok: true, db: await getDatabaseKind() });
  if (req.method === 'GET' && pathname === '/api/ready') return json(res, { ok: true, db: await getDatabaseKind(), env: getEnvSummary() });
  if (req.method === 'GET' && pathname === '/api/env') return json(res, { ...getEnvSummary(), authEnabled: isAuthEnabled(), db: await getDatabaseKind() });
  if (req.method === 'GET' && pathname === '/api/leads') return json(res, await listLeads());
  if (req.method === 'GET' && pathname.startsWith('/api/leads/')) return json(res, await getLeadById(pathname.split('/').pop()));
  if (req.method === 'GET' && pathname.startsWith('/api/conversations/')) return json(res, await getConversation(pathname.split('/').pop()));
  if (req.method === 'GET' && pathname === '/api/approvals') return json(res, await listApprovalRequests());
  if (req.method === 'GET' && pathname === '/api/followups') return json(res, await listFollowups());
  if (req.method === 'GET' && pathname === '/api/suppression') return json(res, await listSuppressed());
  if (req.method === 'GET' && pathname === '/api/inbound-events') return json(res, await listInboundEvents());
  if (req.method === 'GET' && pathname === '/api/campaigns') return json(res, await listCampaigns());
  if (req.method === 'GET' && pathname === '/api/analytics') return json(res, await getAnalyticsSummary());

  if (req.method === 'POST' && pathname === '/api/login') return json(res, { ok: true });
  if (req.method === 'POST' && pathname === '/api/logout') return json(res, { ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });

  if (req.method === 'POST' && pathname.startsWith('/api/approvals/') && pathname.endsWith('/approve')) {
    const leadId = pathname.split('/')[3];
    const body = parseJsonBody(await readBody(req));
    const lead = await getLeadById(leadId);
    const approval = await resolveApprovalRequest(leadId, 'approved', {
      finalMessage: body.finalMessage || lead?.polishedMessage || lead?.selectedMessage?.text || '',
      reviewerNote: body.reviewerNote || 'Approved in dashboard',
      approvalSource: 'manual'
    });
    let updatedLead = lead;
    if (approval?.finalMessage && lead) {
      updatedLead = await sendMessage({ lead, text: approval.finalMessage, channel: lead.salesStrategy?.primaryChannel || lead.channel, mode: body.mode || 'dry_run', stage: approval.stage || 'first_outreach', approvalRequest: approval });
      updatedLead = { ...updatedLead, approvalRequest: approval, status: updatedLead.status || leadStatuses.SENT, updatedAt: new Date().toISOString() };
      await upsertLead(updatedLead);
    }
    return json(res, { ok: true, approval, lead: updatedLead });
  }

  if (req.method === 'POST' && pathname.startsWith('/api/approvals/') && pathname.endsWith('/reject')) {
    const leadId = pathname.split('/')[3];
    const body = parseJsonBody(await readBody(req));
    const approval = await resolveApprovalRequest(leadId, 'rejected', { reviewerNote: body.reviewerNote || 'Rejected in dashboard', approvalSource: 'manual' });
    const lead = await getLeadById(leadId);
    if (lead) await upsertLead({ ...lead, approvalRequest: approval, status: leadStatuses.SKIPPED, skippedReason: 'rejected_in_dashboard', updatedAt: new Date().toISOString() });
    return json(res, { ok: true, approval });
  }

  if (req.method === 'POST' && pathname === '/api/outreach/run') {
    const body = parseJsonBody(await readBody(req));
    return json(res, await runOutreachWorkflow({ rawLead: body.rawLead || body, sendMode: body.sendMode || 'dry_run', autoApprove: body.autoApprove ?? false }));
  }

  if (req.method === 'POST' && pathname === '/api/replies/manual') {
    const body = parseJsonBody(await readBody(req));
    const lead = await getLeadById(body.leadId);
    if (!lead) return json(res, { error: 'Lead not found' }, 404);
    const updatedLead = await handleLeadReply(lead, body.text || '');
    await upsertLead(updatedLead);
    return json(res, updatedLead);
  }

  if (req.method === 'POST' && pathname === '/api/operator/send') {
    const body = parseJsonBody(await readBody(req));
    const lead = await getLeadById(body.leadId);
    if (!lead) return json(res, { error: 'Lead not found' }, 404);
    const updatedLead = await sendMessage({ lead, text: body.text || '', channel: body.channel || lead.channel, mode: body.mode || 'dry_run', stage: body.stage || 'operator_reply', approvalRequest: lead.approvalRequest || null });
    await upsertLead(updatedLead);
    return json(res, updatedLead);
  }

  if (req.method === 'POST' && pathname === '/api/suppression') {
    const body = parseJsonBody(await readBody(req));
    return json(res, await addSuppressed(body || {}), 201);
  }

  if (req.method === 'POST' && pathname === '/api/campaigns') {
    const body = parseJsonBody(await readBody(req));
    const campaign = await createCampaign(body || {});
    return json(res, campaign, 201);
  }

  if (req.method === 'POST' && pathname === '/api/campaigns/process-due') {
    return json(res, await processDueCampaigns());
  }

  if (req.method === 'GET' && pathname === '/') return serveDashboard(res);
  return json(res, { error: 'Not found' }, 404);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    if (req.method === 'POST' && pathname === '/api/login') {
      const body = parseJsonBody(await readBody(req));
      const result = loginWithPassword(body.password || '');
      if (!result.ok) return json(res, { ok: false, error: 'Invalid password' }, 401);
      return json(res, { ok: true }, 200, isAuthEnabled() ? { 'Set-Cookie': createSessionCookie() } : {});
    }

    if (req.method === 'GET' && pathname === '/api/health') return json(res, { ok: true, authEnabled: isAuthEnabled(), authenticated: isAuthenticated(req) });
    if (req.method === 'GET' && pathname === '/api/ready') return json(res, { ok: true, authEnabled: isAuthEnabled(), authenticated: isAuthenticated(req), db: await getDatabaseKind(), env: getEnvSummary() });

    if (req.method === 'GET' && pathname === '/webhooks/instagram') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      if (mode === 'subscribe' && token && token === process.env.INSTAGRAM_VERIFY_TOKEN) return text(res, challenge || '', 200);
      return text(res, 'Forbidden', 403);
    }
    if (req.method === 'POST' && pathname === '/webhooks/instagram') {
      const body = parseJsonBody(await readBody(req));
      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          const messageText = event.message?.text;
          if (!messageText) continue;
          await processInboundMessage({ provider: 'instagram', channel: 'instagram_dm', externalUserId: event.sender?.id, externalThreadId: event.recipient?.id, text: messageText, rawEvent: event });
        }
      }
      return text(res, 'OK', 200);
    }
    if (req.method === 'POST' && pathname === '/webhooks/line') {
      const rawBody = await readBody(req);
      if (!verifyLineSignature(rawBody, req.headers['x-line-signature'])) return text(res, 'Invalid signature', 401);
      const body = parseJsonBody(rawBody);
      for (const event of body.events || []) {
        if (event.type !== 'message' || event.message?.type !== 'text') continue;
        await processInboundMessage({ provider: 'line', channel: 'line', externalUserId: event.source?.userId, externalThreadId: event.replyToken, text: event.message.text, rawEvent: event });
      }
      return text(res, 'OK', 200);
    }

    if (req.method === 'GET' && pathname === '/') {
      if (!isAuthenticated(req) && isAuthEnabled()) return serveDashboard(res);
      return serveDashboard(res);
    }

    return handleProtected(req, res, pathname, url);
  } catch (error) {
    return json(res, { error: error.message, stack: error.stack }, 500);
  }
});

server.listen(port, () => {
  console.log(`Dashboard/API running on http://localhost:${port}`);
});
