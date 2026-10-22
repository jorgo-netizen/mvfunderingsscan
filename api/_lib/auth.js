/**
 * Inloggen voor medewerkers: scrypt-wachtwoordhashes, sessies in de database (alleen een hash van het token),
 * HttpOnly/Secure/SameSite=Strict-cookie, CSRF-token per sessie en beperking van mislukte inlogpogingen.
 * Er is geen publieke registratie: accounts maak je met scripts/beheer-gebruiker.mjs.
 */
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { parseCookies, cookie, sha256, randomToken, safeEqual, clientKey, sameOrigin } from './http.js';

export const SESSION_COOKIE = '__Host-mvfs_sessie';
export const SESSION_HOURS = 8;
export const MAX_FAILURES = 5; // per 15 minuten, per e-mailadres én per IP-adres
const WINDOW_MS = 15 * 60 * 1000;
const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64 };
export const MIN_PASSWORD = 12;

const scryptAsync = (pw, salt, o) => new Promise((ok, fail) => scrypt(pw, salt, o.keylen, { N: o.N, r: o.r, p: o.p, maxmem: 128 * o.N * o.r * 2 }, (e, k) => (e ? fail(e) : ok(k))));

export async function hashPassword(password) {
  if (String(password).length < MIN_PASSWORD) throw new Error(`Wachtwoord moet minimaal ${MIN_PASSWORD} tekens hebben.`);
  const salt = randomBytes(16);
  const key = await scryptAsync(String(password).normalize('NFKC'), salt, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64');
  const key = await scryptAsync(String(password).normalize('NFKC'), Buffer.from(salt, 'base64'), { N: +N, r: +r, p: +p, keylen: expected.length });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Dummy-hash zodat een onbekend e-mailadres even lang duurt als een fout wachtwoord.
let dummyHash = null;
const getDummy = async () => (dummyHash ||= await hashPassword(randomToken(18)));

/**
 * Probeert in te loggen. Geeft { ok, user, cookie, csrf } of { ok:false, status, error } met een algemene melding.
 */
export async function login(db, req, email, password) {
  const mail = String(email || '').trim().toLowerCase();
  const emailKey = sha256(`email:${mail}`);
  const ipKey = clientKey(req);
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const [f1, f2] = await Promise.all([db.failuresSince(emailKey, since), db.failuresSince(ipKey, since)]);
  if (f1 >= MAX_FAILURES || f2 >= MAX_FAILURES * 4) {
    return { ok: false, status: 429, error: 'Te veel mislukte pogingen. Probeer het over 15 minuten opnieuw.' };
  }
  const user = mail ? await db.userByEmail(mail) : null;
  const valid = user ? await verifyPassword(password, user.password_hash) : (await verifyPassword(password, await getDummy()), false);
  if (!valid || !user.active) {
    await Promise.all([db.addLoginAttempt(emailKey, false), db.addLoginAttempt(ipKey, false)]);
    return { ok: false, status: 401, error: 'E-mailadres of wachtwoord is onjuist.' };
  }
  await db.addLoginAttempt(emailKey, true);
  const token = randomToken(32);
  const csrf = randomToken(24);
  await db.createSession({ token_hash: sha256(token), user_id: user.id, csrf, expires_at: new Date(Date.now() + SESSION_HOURS * 3600e3).toISOString() });
  await db.updateUser(user.id, { last_login_at: new Date().toISOString() });
  db.deleteExpiredSessions().catch(() => {});
  return { ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role }, csrf, cookie: cookie(SESSION_COOKIE, token, { maxAge: SESSION_HOURS * 3600 }) };
}

export async function logout(db, req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) await db.deleteSession(sha256(token));
  return cookie(SESSION_COOKIE, '', { maxAge: 0 });
}

/**
 * Controleert sessie, rol en (bij wijzigende verzoeken) het CSRF-token. Altijd server-side.
 * Geeft { user, csrf } of { error, status }.
 */
export async function requireUser(db, req, { role = null, write = false } = {}) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return { status: 401, error: 'Niet ingelogd.' };
  const found = await db.sessionWithUser(sha256(token));
  if (!found || !found.user.active) return { status: 401, error: 'Niet ingelogd.' };
  if (write) {
    if (!sameOrigin(req) || !safeEqual(req.headers['x-mvfs-csrf'] || '', found.session.csrf)) return { status: 403, error: 'Verzoek geweigerd.' };
  }
  if (role && found.user.role !== role) return { status: 403, error: 'Hiervoor heb je geen rechten.' };
  return { user: found.user, csrf: found.session.csrf };
}
