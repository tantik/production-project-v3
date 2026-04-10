import fs from 'fs/promises';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { loadEnv } from './env.js';

loadEnv();

const DATA_DIR = path.resolve('data');
const DEFAULT_SQLITE_PATH = path.join(DATA_DIR, 'app.db');
let driver = null;

function normalizeValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function maybeParseJson(value) {
  if (typeof value !== 'string') return value;
  if (!value) return value;
  try { return JSON.parse(value); } catch { return value; }
}

function rowToObject(row) {
  if (!row) return null;
  const next = { ...row };
  if ('data' in next) next.data = maybeParseJson(next.data);
  return next;
}

function mergeRecord(row) {
  if (!row) return null;
  return row.data && typeof row.data === 'object' ? row.data : row;
}

function buildWhere(where = [], dialect = 'sqlite', offset = 0) {
  const clauses = [];
  const values = [];
  const items = Array.isArray(where) ? where : Object.entries(where).map(([field, value]) => ({ field, op: '=', value }));
  items.forEach((item, index) => {
    clauses.push(`${item.field} ${item.op || '='} ${dialect === 'postgres' ? `$${offset + index + 1}` : '?'}`);
    values.push(normalizeValue(item.value));
  });
  return { sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', values };
}

async function createSqliteDriver() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const sqlitePath = process.env.SQLITE_PATH ? path.resolve(process.env.SQLITE_PATH) : DEFAULT_SQLITE_PATH;
  const db = new DatabaseSync(sqlitePath);
  db.exec('PRAGMA journal_mode = DELETE');

  const run = async (sql, params = []) => db.prepare(sql).run(...params);
  const get = async (sql, params = []) => rowToObject(db.prepare(sql).get(...params) || null);
  const all = async (sql, params = []) => db.prepare(sql).all(...params).map(rowToObject);
  const init = async () => {
    const statements = [
      `CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, business_name TEXT, channel TEXT, status TEXT, created_at TEXT, updated_at TEXT, data TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS conversations (lead_id TEXT PRIMARY KEY, updated_at TEXT, data TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS approvals (lead_id TEXT PRIMARY KEY, id TEXT, business_name TEXT, channel TEXT, status TEXT, stage TEXT, created_at TEXT, updated_at TEXT, data TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS followups (id TEXT PRIMARY KEY, lead_id TEXT, status TEXT, due_at TEXT, created_at TEXT, updated_at TEXT, data TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS suppression (id TEXT PRIMARY KEY, lead_id TEXT, business_name TEXT, channel TEXT, target TEXT, reason TEXT, source TEXT, created_at TEXT, updated_at TEXT, data TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS send_logs (id TEXT PRIMARY KEY, lead_id TEXT, business_name TEXT, channel TEXT, mode TEXT, stage TEXT, artifact TEXT, sent_at TEXT, data TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS inbound_events (id TEXT PRIMARY KEY, provider TEXT, lead_id TEXT, channel TEXT, external_thread_id TEXT, external_user_id TEXT, event_type TEXT, text TEXT, received_at TEXT, data TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, status TEXT, scheduled_for TEXT, created_at TEXT, updated_at TEXT, data TEXT NOT NULL)`
    ];
    statements.forEach((statement) => db.exec(statement));
  };
  return { kind: 'sqlite', init, run, get, all };
}

async function createPostgresDriver() {
  const mod = await import('pg');
  const { Pool } = mod.default || mod;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const run = async (sql, params = []) => pool.query(sql, params);
  const get = async (sql, params = []) => rowToObject((await pool.query(sql, params)).rows[0] || null);
  const all = async (sql, params = []) => (await pool.query(sql, params)).rows.map(rowToObject);
  const init = async () => {
    const statements = [
      `CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, business_name TEXT, channel TEXT, status TEXT, created_at TEXT, updated_at TEXT, data JSONB NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS conversations (lead_id TEXT PRIMARY KEY, updated_at TEXT, data JSONB NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS approvals (lead_id TEXT PRIMARY KEY, id TEXT, business_name TEXT, channel TEXT, status TEXT, stage TEXT, created_at TEXT, updated_at TEXT, data JSONB NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS followups (id TEXT PRIMARY KEY, lead_id TEXT, status TEXT, due_at TEXT, created_at TEXT, updated_at TEXT, data JSONB NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS suppression (id TEXT PRIMARY KEY, lead_id TEXT, business_name TEXT, channel TEXT, target TEXT, reason TEXT, source TEXT, created_at TEXT, updated_at TEXT, data JSONB NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS send_logs (id TEXT PRIMARY KEY, lead_id TEXT, business_name TEXT, channel TEXT, mode TEXT, stage TEXT, artifact TEXT, sent_at TEXT, data JSONB NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS inbound_events (id TEXT PRIMARY KEY, provider TEXT, lead_id TEXT, channel TEXT, external_thread_id TEXT, external_user_id TEXT, event_type TEXT, text TEXT, received_at TEXT, data JSONB NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, status TEXT, scheduled_for TEXT, created_at TEXT, updated_at TEXT, data JSONB NOT NULL)`
    ];
    for (const statement of statements) await pool.query(statement);
  };
  return { kind: 'postgres', init, run, get, all };
}

async function getDriver() {
  if (driver) return driver;
  driver = process.env.DATABASE_URL ? await createPostgresDriver() : await createSqliteDriver();
  await driver.init();
  return driver;
}

function buildInsertStatement(table, row, dialect) {
  const columns = Object.keys(row);
  const values = columns.map((key) => normalizeValue(row[key]));
  const placeholders = columns.map((_, index) => (dialect === 'postgres' ? `$${index + 1}` : '?')).join(', ');
  const conflictKey = ['conversations', 'approvals'].includes(table) ? 'lead_id' : 'id';
  const updateColumns = columns.filter((column) => column !== conflictKey).map((column) => `${column}=excluded.${column}`).join(', ');
  return { sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT(${conflictKey}) DO UPDATE SET ${updateColumns}`, values };
}

export async function initDatabase() { await getDriver(); }
export async function getDatabaseKind() { return (await getDriver()).kind; }

export async function upsertRow(table, row) {
  const db = await getDriver();
  const { sql, values } = buildInsertStatement(table, row, db.kind);
  await db.run(sql, values);
  return row;
}

export async function insertRow(table, row) {
  const db = await getDriver();
  const columns = Object.keys(row);
  const values = columns.map((key) => normalizeValue(row[key]));
  const placeholders = columns.map((_, index) => (db.kind === 'postgres' ? `$${index + 1}` : '?')).join(', ');
  await db.run(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values);
  return row;
}

export async function getRow(table, keyField, keyValue) {
  const db = await getDriver();
  const row = await db.get(`SELECT * FROM ${table} WHERE ${keyField} = ${db.kind === 'postgres' ? '$1' : '?'} LIMIT 1`, [normalizeValue(keyValue)]);
  return mergeRecord(row);
}

export async function listRows(table, { where = [], orderBy = 'updated_at DESC', limit = null } = {}) {
  const db = await getDriver();
  const builtWhere = buildWhere(where, db.kind);
  const limitClause = limit ? ` LIMIT ${Number(limit)}` : '';
  const rows = await db.all(`SELECT * FROM ${table}${builtWhere.sql} ORDER BY ${orderBy}${limitClause}`, builtWhere.values);
  return rows.map(mergeRecord);
}

export async function updateRows(table, patch, where) {
  const db = await getDriver();
  const patchEntries = Object.entries(patch);
  if (!patchEntries.length) return;
  const setSql = patchEntries.map(([field], index) => `${field} = ${db.kind === 'postgres' ? `$${index + 1}` : '?'}`).join(', ');
  const whereBuilt = buildWhere(where, db.kind, patchEntries.length);
  const params = [...patchEntries.map(([, value]) => normalizeValue(value)), ...whereBuilt.values];
  await db.run(`UPDATE ${table} SET ${setSql}${whereBuilt.sql}`, params);
}

export async function deleteRows(table, where) {
  const db = await getDriver();
  const whereBuilt = buildWhere(where, db.kind);
  await db.run(`DELETE FROM ${table}${whereBuilt.sql}`, whereBuilt.values);
}
