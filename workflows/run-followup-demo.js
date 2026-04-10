import { listLeads, upsertLead } from "../crm/lead-store.js";
import { scheduleFollowup, processDueFollowups } from "../followups/followup-manager.js";

async function main() {
  const leads = await listLeads();
  const lead = leads[0];

  if (!lead) {
    console.log("No leads found. Run npm run start first.");
    return;
  }

  await scheduleFollowup(lead, {
    days: 0,
    reason: "demo immediate followup",
    followupNumber: 1
  });

  const processed = await processDueFollowups({ mode: "dry_run" });
  const refreshedLeads = await listLeads();
  const refreshedLead = refreshedLeads.find((item) => item.id === lead.id) || lead;
  await upsertLead(refreshedLead);

  console.log("=== FOLLOWUPS PROCESSED ===");
  console.log(JSON.stringify(processed, null, 2));
}

main();
