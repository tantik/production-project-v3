import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.resolve("data/approvals");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function approvalPath(leadId) {
  return path.join(DATA_DIR, `${leadId}.json`);
}

export async function createApprovalRequest(payload) {
  await ensureDir();
  const request = {
    id: payload.id,
    leadId: payload.leadId,
    businessName: payload.businessName,
    channel: payload.channel,
    stage: payload.stage || "first_outreach",
    candidateMessages: payload.candidateMessages || [],
    selectedMessage: payload.selectedMessage || null,
    polishedMessage: payload.polishedMessage || "",
    salesStrategy: payload.salesStrategy || null,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await fs.writeFile(approvalPath(payload.leadId), JSON.stringify(request, null, 2), "utf-8");
  return request;
}

export async function getApprovalRequest(leadId) {
  await ensureDir();
  try {
    return JSON.parse(await fs.readFile(approvalPath(leadId), "utf-8"));
  } catch {
    return null;
  }
}

export async function listApprovalRequests() {
  await ensureDir();
  const files = await fs.readdir(DATA_DIR);
  const items = await Promise.all(
    files.filter((name) => name.endsWith(".json")).map(async (name) => {
      const raw = await fs.readFile(path.join(DATA_DIR, name), "utf-8");
      return JSON.parse(raw);
    })
  );
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function resolveApprovalRequest(leadId, decision, overrides = {}) {
  const request = await getApprovalRequest(leadId);
  if (!request) return null;

  const updated = {
    ...request,
    status: decision,
    decision,
    finalMessage: overrides.finalMessage || request.polishedMessage,
    decidedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewerNote: overrides.reviewerNote || ""
  };

  await fs.writeFile(approvalPath(leadId), JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}
