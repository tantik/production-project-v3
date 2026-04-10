import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.resolve("data");
const RESULTS_FILE = path.join(DATA_DIR, "results.json");

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(RESULTS_FILE);
  } catch {
    await fs.writeFile(RESULTS_FILE, "[]", "utf-8");
  }
}

export async function savePipelineResult(result) {
  await ensureFile();
  const fileContent = await fs.readFile(RESULTS_FILE, "utf-8");
  const parsed = JSON.parse(fileContent);
  parsed.push(result);
  await fs.writeFile(RESULTS_FILE, JSON.stringify(parsed, null, 2), "utf-8");
}
