import fs from "fs";
import path from "path";

let loaded = false;

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) return null;

  const key = trimmed.slice(0, eqIndex).trim();
  let value = trimmed.slice(eqIndex + 1).trim();

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    if (!(parsed.key in process.env)) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

export function loadEnv() {
  if (loaded) return;
  loaded = true;

  const candidates = [
    path.resolve(".env.local"),
    path.resolve(".env")
  ];

  for (const filePath of candidates) {
    loadEnvFile(filePath);
  }
}

export function getEnvSummary() {
  loadEnv();
  return {
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    nodeEnv: process.env.NODE_ENV || "development"
  };
}
