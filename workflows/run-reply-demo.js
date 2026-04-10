import { listLeads, upsertLead } from "../crm/lead-store.js";
import { handleLeadReply } from "../agents/reply-manager.js";

async function main() {
  const leads = await listLeads();
  const lead = leads[0];

  if (!lead) {
    console.log("No leads found. Run npm run start first.");
    return;
  }

  const inboundText = "ありがとうございます。どういうイメージか、もう少し詳しく教えていただけますか？";
  const updatedLead = await handleLeadReply(lead, inboundText);
  await upsertLead(updatedLead);

  console.log("=== REPLY CLASSIFICATION ===");
  console.log(JSON.stringify(updatedLead.lastInboundReply, null, 2));
  console.log("\n=== DRAFT RESPONSE ===");
  console.log(updatedLead.replyPlan?.draftReply || "No reply draft");
  console.log("\n=== NEXT ACTION ===");
  console.log(JSON.stringify(updatedLead.replyPlan?.nextAction || null, null, 2));
}

main();
