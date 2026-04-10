import fs from 'fs/promises';
import path from 'path';
import { BaseChannelAdapter } from './base-adapter.js';

const OUTBOX_DIR = path.resolve('data/outbox/email');

export class EmailAdapter extends BaseChannelAdapter {
  constructor() {
    super('email');
  }

  async send({ lead, text, mode = 'dry_run' }) {
    await fs.mkdir(OUTBOX_DIR, { recursive: true });
    const payload = {
      leadId: lead.id,
      businessName: lead.businessName,
      channel: this.channel,
      target: lead.email || lead.contactEmail || lead.websiteEmail || lead.websiteUrl || lead.businessName,
      text,
      mode,
      provider: mode === 'live' ? 'email-adapter-live-not-configured' : 'email-adapter',
      simulated: mode !== 'live',
      sentAt: new Date().toISOString()
    };

    const filePath = path.join(OUTBOX_DIR, `${lead.id}-${Date.now()}.json`);
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');

    if (mode === 'live') {
      throw new Error('Live email sending is not configured in v5. Use LINE or Instagram live adapters, or keep email in dry_run mode.');
    }

    return {
      ok: true,
      provider: payload.provider,
      mode,
      target: payload.target,
      artifact: filePath,
      simulated: true,
      text
    };
  }
}
