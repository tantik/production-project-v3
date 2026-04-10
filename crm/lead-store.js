import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.resolve("data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(LEADS_FILE);
  } catch {
    await fs.writeFile(LEADS_FILE, "[]", "utf-8");
  }
}

async function readLeads() {
  await ensureFile();
  return JSON.parse(await fs.readFile(LEADS_FILE, "utf-8"));
}

async function writeLeads(leads) {
  await ensureFile();
  await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2), "utf-8");
}

export async function upsertLead(lead) {
  const leads = await readLeads();
  const idx = leads.findIndex((item) => item.id === lead.id);
  if (idx === -1) leads.push(lead);
  else leads[idx] = lead;
  await writeLeads(leads);
  return lead;
}

export async function listLeads() {
  return readLeads();
}
