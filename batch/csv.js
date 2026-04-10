import fs from 'fs/promises';
import path from 'path';

function escapeCsv(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return '"' + text.replaceAll('"', '""') + '"';
  }
  return text;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  values.push(current);
  return values;
}

export async function importLeadsFromCsv(filePath) {
  const absolute = path.resolve(filePath);
  const raw = await fs.readFile(absolute, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]).map((item) => item.trim());

  return lines.slice(1).map((line, index) => {
    const row = parseCsvLine(line);
    const item = Object.fromEntries(headers.map((header, idx) => [header, row[idx] ?? '']));
    if (!item.id) item.id = `lead_csv_${index + 1}`;
    return item;
  });
}

export async function exportObjectsToCsv(filePath, rows) {
  const absolute = path.resolve(filePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  if (!rows.length) {
    await fs.writeFile(absolute, '', 'utf-8');
    return absolute;
  }

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(','));
  }
  await fs.writeFile(absolute, lines.join('\n'), 'utf-8');
  return absolute;
}
