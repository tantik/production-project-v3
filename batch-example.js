import { runOutreachWorkflow } from "./workflows/run-outreach-workflow.js";

const leads = [
  {
    id: "lead_101",
    source: "instagram",
    channel: "instagram_dm",
    businessName: "Lash Atelier Miu",
    niche: "eyelash",
    city: "Yokohama",
    instagramHandle: "@lashateliermiu",
    instagramUrl: "https://instagram.com/lashateliermiu",
    instagramBio: "まつげパーマ・アイブロウ。ご予約はDMまたはLINEから。",
    notes: "Elegant eyelash salon.",
    rawText: "DM予約 / LINE予約 / 小規模サロン"
  },
  {
    id: "lead_102",
    source: "google_maps",
    channel: "line",
    businessName: "Spa Haru",
    niche: "spa",
    city: "Tokyo",
    instagramHandle: "",
    instagramUrl: "",
    instagramBio: "",
    lineUrl: "https://line.me/example",
    notes: "Relaxation spa, website is simple, booking path unclear.",
    rawText: "LINE導線あり / 外部予約は弱い"
  }
];

async function main() {
  const results = [];

  for (const rawLead of leads) {
    const result = await runOutreachWorkflow({
      rawLead,
      sendMode: "dry_run",
      autoApprove: true
    });
    results.push({
      id: result.id,
      businessName: result.businessName,
      status: result.status,
      score: result.scoring?.totalScore,
      selectedMessage: result.selectedMessage?.text,
      channel: result.salesStrategy?.primaryChannel,
      approval: result.approvalRequest?.status
    });
  }

  console.log("=== BATCH RESULTS ===");
  console.table(results);
}

main();
