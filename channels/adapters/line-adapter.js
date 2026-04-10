import fs from 'fs/promises';
import path from 'path';
import { BaseChannelAdapter } from './base-adapter.js';
import { loadEnv } from '../../services/env.js';

loadEnv();

const OUTBOX_DIR = path.resolve('data/outbox/line');
const LINE_API_BASE = process.env.LINE_API_BASE || 'https://api.line.me';

export class LineAdapter extends BaseChannelAdapter {
  constructor() {
    super('line');
  }

  async send({ lead, text, mode = 'dry_run' }) {
    if (mode !== 'live') {
      await fs.mkdir(OUTBOX_DIR, { recursive: true });
      const payload = {
        leadId: lead.id,
        businessName: lead.businessName,
        channel: this.channel,
        target: lead.lineUserId || lead.lineUrl || lead.businessName,
        text,
        mode,
        provider: 'line-adapter',
        simulated: true,
        sentAt: new Date().toISOString()
      };
      const filePath = path.join(OUTBOX_DIR, `${lead.id}-${Date.now()}.json`);
      await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      return { ok: true, provider: payload.provider, mode, target: payload.target, artifact: filePath, simulated: true, text };
    }

    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const to = lead.lineUserId || lead.lineTargetId;
    if (!accessToken) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is required for live LINE sending');
    }
    if (!to) {
      throw new Error('lead.lineUserId or lead.lineTargetId is required for live LINE sending');
    }

    const response = await fetch(`${LINE_API_BASE}/v2/bot/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        to,
        messages: [{ type: 'text', text }]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LINE push failed: ${response.status} ${body}`);
    }

    return {
      ok: true,
      provider: 'line-adapter',
      mode,
      target: to,
      artifact: null,
      simulated: false,
      text
    };
  }
}
