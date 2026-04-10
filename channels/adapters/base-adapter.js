export class BaseChannelAdapter {
  constructor(channel) {
    this.channel = channel;
  }

  async send({ lead, text, mode }) {
    return {
      ok: true,
      provider: `${this.channel}-adapter`,
      mode,
      target: lead.businessName,
      artifact: null,
      simulated: true,
      text
    };
  }
}
