import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.resolve("data/followups");
const FILE_PATH = path.join(DATA_DIR, "queue.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(FILE_PATH);
  } catch {
    await fs.writeFile(FILE_PATH, "[]", "utf-8");
  }
}

async function readQueue() {
  await ensureFile();
  return JSON.parse(await fs.readFile(FILE_PATH, "utf-8"));
}

async function writeQueue(queue) {
  await ensureFile();
  await fs.writeFile(FILE_PATH, JSON.stringify(queue, null, 2), "utf-8");
}

export async function upsertFollowup(task) {
  const queue = await readQueue();
  const idx = queue.findIndex((item) => item.id === task.id);
  if (idx === -1) queue.push(task);
  else queue[idx] = task;
  await writeQueue(queue);
  return task;
}

export async function listFollowups() {
  return readQueue();
}

export async function getDueFollowups(referenceIso = new Date().toISOString()) {
  const queue = await readQueue();
  return queue.filter((item) => item.status === "pending" && item.dueAt <= referenceIso);
}

export async function cancelPendingFollowupsForLead(leadId, reason = "cancelled") {
  const queue = await readQueue();
  let changed = false;

  const updated = queue.map((item) => {
    if (item.leadId !== leadId || item.status !== "pending") return item;
    changed = true;
    return {
      ...item,
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      cancelReason: reason
    };
  });

  if (changed) {
    await writeQueue(updated);
  }

  return updated.filter((item) => item.leadId === leadId);
}
