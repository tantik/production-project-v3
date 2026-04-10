import crypto from 'crypto';
import { loadEnv } from './env.js';

loadEnv();

const COOKIE_NAME = 'ppv7_auth';

function getSecret() {
  return process.env.DASHBOARD_SESSION_SECRET || process.env.DASHBOARD_PASSWORD || 'dev-secret';
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

export function isAuthEnabled() {
  return Boolean(process.env.DASHBOARD_PASSWORD);
}

export function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').map((part) => part.trim()).filter(Boolean).reduce((acc, item) => {
    const idx = item.indexOf('=');
    if (idx === -1) return acc;
    acc[item.slice(0, idx)] = decodeURIComponent(item.slice(idx + 1));
    return acc;
  }, {});
}

export function createSessionCookie() {
  const payload = `ok.${Date.now()}`;
  const token = `${payload}.${sign(payload)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax${secure}; Max-Age=43200`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax${secure}; Max-Age=0`;
}

export function isAuthenticated(req) {
  if (!isAuthEnabled()) return true;
  const token = parseCookies(req.headers.cookie || '')[COOKIE_NAME];
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length < 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  return sign(payload) === parts[2];
}

export function requireAuth(req, res) {
  if (isAuthenticated(req)) return true;
  res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Authentication required' }));
  return false;
}

export function loginWithPassword(password) {
  if (!isAuthEnabled()) return { ok: true, disabled: true };
  return { ok: password === process.env.DASHBOARD_PASSWORD };
}
