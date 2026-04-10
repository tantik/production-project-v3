import fs from "fs/promises";
import path from "path";
import { BaseChannelAdapter } from "./base-adapter.js";

const OUTBOX_DIR = path.resolve("data/outbox/line");

export class LineAdapter extends BaseChannelAdapter {
  constructor() {
    super("line");
  }

  async send({ lead, text, mode = "dry_run" }) {
    await fs.mkdir(OUTBOX_DIR, { recursive: true });
    const payload = {
      leadId: lead.id,
      businessName: lead.businessName,
      channel: this.channel,
      target: lead.lineUrl || lead.businessName,
      text,
      mode,
      provider: "line-adapter",
      simulated: true,
      sentAt: new Date().toISOString()
    };

    const filePath = path.join(OUTBOX_DIR, `${lead.id}-${Date.now()}.json`);
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");

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
