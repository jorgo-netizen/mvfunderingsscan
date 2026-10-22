/**
 * Gedeelde HTTP-hulpfuncties voor de serverless functies (map met _ wordt door Vercel niet als route gepubliceerd).
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const MAX_JSON_BYTES = 3 * 1024 * 1024; // ruim voor een verkleinde nieuwsafbeelding (base64)

export function sendJson(res, status, body, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export function sendHtml(res, status, html, { cache = 'no-store', headers = {} } = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(html);
}

export function sendText(res, status, text, type = 'text/plain; charset=utf-8', cache = 'no-store') {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', cache);
  res.end(text);
}

/** Leest een JSON-body met een maximale grootte. Gooit een fout met .status bij te groot of ongeldig. */
export async function readJson(req, max = MAX_JSON_BYTES) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') {
    if (req.body.length > max) throw Object.assign(new Error('Te groot'), { status: 413 });
    return JSON.parse(req.body || '{}');
  }
  const chunks = []; let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > max) throw Object.assign(new Error('Te groot'), { status: 413 });
    chunks.push(c);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw Object.assign(new Error('Ongeldige gegevens'), { status: 400 }); }
}

export function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers?.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function cookie(name, value, { maxAge, path = '/' } = {}) {
  let c = `${name}=${encodeURIComponent(value)}; Path=${path}; HttpOnly; Secure; SameSite=Strict`;
  if (maxAge !== undefined) c += `; Max-Age=${maxAge}`;
  return c;
}

export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export function safeEqual(a, b) {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/** IP-adres alleen gehasht gebruiken (rate limiting), nooit opslaan of loggen. */
export function clientKey(req) {
  const ip = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'onbekend';
  return sha256(`ip:${ip}:${process.env.MVFS_PEPPER || ''}`);
}

/** Verzoek moet van dezelfde site komen (aanvullend op SameSite=Strict en het CSRF-token). */
export function sameOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return true; // sommige browsers sturen bij same-origin GET geen Origin; POST-acties eisen daarnaast het CSRF-token
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return new URL(origin).host === host;
  } catch { return false; }
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const isEmail = (s) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(String(s));
export const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s));

/** Basis-URL van de site voor links in e-mails. */
export function siteUrl() {
  return (process.env.MVFS_SITE_URL || 'https://www.mvfunderingsscan.nl').replace(/\/$/, '');
}

/** Foutmelding loggen zonder persoonsgegevens: alleen een korte code en de technische melding. */
export function logError(where, err) {
  console.error(`[${where}]`, err?.status || '', String(err?.message || err).slice(0, 300));
}
