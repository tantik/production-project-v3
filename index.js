import { loadEnv, getEnvSummary } from "./services/env.js";
import { runOutreachWorkflow } from "./workflows/run-outreach-workflow.js";

loadEnv();

const rawLead = {
  id: "lead_001",
  source: "instagram",
  channel: "instagram_dm",
  businessName: "Nail Salon Sakura",
  niche: "nail",
  city: "Tokyo",
  instagramHandle: "@nailsakura",
  instagramUrl: "https://instagram.com/example_salon",
  instagramBio: "丁寧なネイルケアと季節のデザイン。ご予約はDMまたはLINEから。",
  websiteUrl: "",
  lineUrl: "",
  notes: "Beautiful nail portfolio. Reservation entry seems to include DM and LINE.",
  rawText: `
Instagram:
https://instagram.com/example_salon

Описание:
- небольшой nail salon
- в bio есть LINE予約
- полноценной внешней онлайн-системы записи не видно
- посты с красивым дизайном
- не сеть
`
};

async function main() {
  try {
    const result = await runOutreachWorkflow({ rawLead, sendMode: "dry_run", autoApprove: true });

    console.log("=== ENV SUMMARY ===");
    console.log(JSON.stringify(getEnvSummary(), null, 2));

    console.log("\n=== OUTREACH RESULT ===");
    console.log(JSON.stringify(result, null, 2));

    console.log("\n=== SALES STRATEGY ===");
    console.log(JSON.stringify(result.salesStrategy || null, null, 2));

    console.log("\n=== OUTBOUND MESSAGE ===");
    console.log(result.polishedMessage || result.selectedMessage?.text || "No outbound message");

    console.log("\n=== STATUS ===");
    console.log(result.status || "unknown");

    console.log("\n=== OUTBOX FILE ===");
    console.log(result.outreach?.sendArtifact || "No outbox artifact");

    console.log("\n=== APPROVAL STATUS ===");
    console.log(result.approvalRequest?.status || "no approval request");
  } catch (error) {
    console.error("Workflow error:", error);
    process.exitCode = 1;
  }
}

main();
