import { createLead } from "../utils/create-lead.js";
import { enrichLead } from "../agents/lead-enricher.js";
import { scoreLead } from "../agents/lead-scorer.js";
import { selectBestMessage } from "../agents/message-selector.js";
import { savePipelineResult } from "../services/logger.js";

export async function runSalesPipeline({ rawLead, businessTypes, generateMessages, polishMessage }) {
  let lead = createLead(rawLead);
  lead = await enrichLead(lead, businessTypes);
  lead = await scoreLead(lead);

  if (lead.scoring.grade === "D") {
    lead.status = "skipped";
    await savePipelineResult(lead);
    return lead;
  }

  const generatedMessages = await generateMessages(lead);
  lead = await selectBestMessage(lead, generatedMessages);

  if (lead.selectedMessage?.text) {
    const polished = await polishMessage(lead, lead.selectedMessage.text);
    lead = {
      ...lead,
      polishedMessage: polished,
      updatedAt: new Date().toISOString(),
      status: "completed"
    };
  }

  await savePipelineResult(lead);
  return lead;
}
