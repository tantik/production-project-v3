import fs from 'fs/promises';
import path from 'path';
import { BaseChannelAdapter } from './base-adapter.js';
import { loadEnv } from '../../services/env.js';

loadEnv();

const OUTBOX_DIR = path.resolve('data/outbox/instagram');
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v23.0';

export class InstagramAdapter extends BaseChannelAdapter {
  constructor() {
    super('instagram_dm');
  }

  async send({ lead, text, mode = 'dry_run' }) {
    if (mode !== 'live') {
      await fs.mkdir(OUTBOX_DIR, { recursive: true });
      const payload = {
        leadId: lead.id,
        businessName: lead.businessName,
        channel: this.channel,
        target: lead.instagramRecipientId || lead.instagramHandle || lead.instagramUrl || lead.businessName,
        text,
        mode,
        provider: 'instagram-adapter',
        simulated: true,
        sentAt: new Date().toISOString()
      };
      const filePath = path.join(OUTBOX_DIR, `${lead.id}-${Date.now()}.json`);
      await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      return { ok: true, provider: payload.provider, mode, target: payload.target, artifact: filePath, simulated: true, text };
    }

    const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
    const igBusinessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    const recipientId = lead.instagramRecipientId;

    if (!accessToken) throw new Error('META_PAGE_ACCESS_TOKEN is required for live Instagram sending');
    if (!igBusinessAccountId) throw new Error('INSTAGRAM_BUSINESS_ACCOUNT_ID is required for live Instagram sending');
    if (!recipientId) throw new Error('lead.instagramRecipientId is required for live Instagram sending');

    const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${igBusinessAccountId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        messaging_type: 'RESPONSE',
        access_token: accessToken
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Instagram send failed: ${response.status} ${body}`);
    }

    return {
      ok: true,
      provider: 'instagram-adapter',
      mode,
      target: recipientId,
      artifact: null,
      simulated: false,
      text
    };
  }
}
