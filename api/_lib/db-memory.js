/**
 * Geheugen-implementatie van de gegevenslaag, ALLEEN voor lokaal ontwikkelen (npm run dev) en tests.
 * Bootst dezelfde regels na als supabase/migrations/001_mvfs_basis.sql: unieke slugs en e-mailadressen,
 * idempotente registratie, statusgeschiedenis, cascade bij verwijderen.
 * Optioneel bewaard in een JSON-bestand (MVFS_DB_FILE), bestanden in MVFS_DEV_STORAGE (standaard tmp/dev-storage).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const conflict = () => Object.assign(new Error('bestaat al'), { status: 409, code: '23505' });
const now = () => new Date().toISOString();
const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));

export function memoryDb() {
  const FILE = process.env.MVFS_DB_FILE || '';
  const STORE_DIR = resolve(process.env.MVFS_DEV_STORAGE || 'tmp/dev-storage');
  const key = `__mvfsMemoryDb:${FILE}`;
  if (!globalThis[key]) {
    let data = { users: [], sessions: [], attempts: [], news: [], requests: [], history: [], notes: [], emails: [], seq: 0, ids: 0 };
    if (FILE && existsSync(FILE)) data = { ...data, ...JSON.parse(readFileSync(FILE, 'utf8')) };
    globalThis[key] = data;
  }
  const D = globalThis[key];
  const save = () => { if (FILE) { mkdirSync(dirname(FILE), { recursive: true }); writeFileSync(FILE, JSON.stringify(D, null, 1)); } };
  const nextId = () => ++D.ids;
  const userName = (id) => (id ? { name: D.users.find((u) => u.id === id)?.name ?? null } : null);
  const objPath = (bucket, path) => {
    const p = resolve(STORE_DIR, bucket, path);
    if (!p.startsWith(STORE_DIR)) throw new Error('ongeldig pad');
    return p;
  };

  return {
    kind: 'memory',
    _data: D,
    userByEmail: async (email) => clone(D.users.find((u) => u.email === email) || null),
    userById: async (id) => { const u = D.users.find((x) => x.id === id); return u ? clone({ id: u.id, email: u.email, name: u.name, role: u.role, active: u.active }) : null; },
    createUser: async (u) => {
      if (D.users.some((x) => x.email === u.email)) throw conflict();
      const row = { id: randomUUID(), role: 'medewerker', active: true, created_at: now(), last_login_at: null, ...u };
      D.users.push(row); save(); return clone(row);
    },
    updateUser: async (id, f) => { const u = D.users.find((x) => x.id === id); if (u) Object.assign(u, f); save(); return clone(u || null); },
    createSession: async (s) => { D.sessions.push({ created_at: now(), ...s }); save(); },
    sessionWithUser: async (tokenHash) => {
      const s = D.sessions.find((x) => x.token_hash === tokenHash && x.expires_at > now());
      if (!s) return null;
      const u = D.users.find((x) => x.id === s.user_id);
      return u ? clone({ session: s, user: { id: u.id, email: u.email, name: u.name, role: u.role, active: u.active } }) : null;
    },
    deleteSession: async (tokenHash) => { D.sessions = D.sessions.filter((x) => x.token_hash !== tokenHash); save(); },
    deleteUserSessions: async (userId) => { D.sessions = D.sessions.filter((x) => x.user_id !== userId); save(); },
    deleteExpiredSessions: async () => { D.sessions = D.sessions.filter((x) => x.expires_at > now()); save(); },
    addLoginAttempt: async (keyHash, success) => { D.attempts.push({ id: nextId(), key_hash: keyHash, success, created_at: now() }); save(); },
    failuresSince: async (keyHash, sinceIso) => D.attempts.filter((a) => a.key_hash === keyHash && !a.success && a.created_at > sinceIso).length,

    newsList: async ({ status } = {}) => clone(D.news.filter((n) => !status || n.status === status)
      .sort((a, b) => (a.published_at === b.published_at ? (b.updated_at > a.updated_at ? 1 : -1) : !a.published_at ? -1 : !b.published_at ? 1 : b.published_at > a.published_at ? 1 : -1))
      .map(({ content, meta_description, ...rest }) => rest)),
    newsById: async (id) => { const n = D.news.find((x) => x.id === id); return n ? clone({ ...n, author: userName(n.author_id) }) : null; },
    newsBySlug: async (slug) => { const n = D.news.find((x) => x.slug === slug); return n ? clone({ ...n, author: userName(n.author_id) }) : null; },
    newsCreate: async (row) => {
      if (D.news.some((x) => x.slug === row.slug)) throw conflict();
      const n = { id: randomUUID(), excerpt: '', meta_description: '', content: '', featured_image: null, featured_image_alt: '', status: 'concept', show_author: false, author_id: null, created_at: now(), updated_at: now(), published_at: null, ...row };
      D.news.push(n); save(); return clone(n);
    },
    newsUpdate: async (id, row) => {
      const n = D.news.find((x) => x.id === id); if (!n) return null;
      if (row.slug && D.news.some((x) => x.slug === row.slug && x.id !== id)) throw conflict();
      Object.assign(n, row, { updated_at: now() }); save(); return clone(n);
    },
    newsDelete: async (id) => { D.news = D.news.filter((x) => x.id !== id); save(); },

    registerRequest: async (row) => {
      const existing = D.requests.find((r) => r.idempotency_key === row.idempotency_key);
      if (existing) return { id: existing.id, dossier_nr: existing.dossier_nr, created: false };
      D.seq += 1;
      const r = {
        id: randomUUID(), dossier_nr: `MV-${new Date().getFullYear()}-${String(D.seq).padStart(4, '0')}`,
        source: 'aanvraag', request_type: 'fase0', telefoon: '', adres: '', postcode: '', huisnummer: '', plaats: '', details: {},
        ...row, status: 'ontvangen', status_updated_at: now(), token_created_at: row.token_hash ? now() : null, token_revoked_at: null,
        report_path: null, report_name: null, report_uploaded_at: null, created_at: now(), updated_at: now(),
      };
      D.requests.push(r);
      D.history.push({ id: nextId(), request_id: r.id, status: 'ontvangen', customer_message: '', changed_by: null, changed_at: r.created_at });
      save();
      return { id: r.id, dossier_nr: r.dossier_nr, created: true };
    },
    requestByTokenHash: async (hash) => {
      const r = D.requests.find((x) => x.token_hash === hash && !x.token_revoked_at);
      if (!r) return null;
      const { id, dossier_nr, status, status_updated_at, created_at, report_path, report_name, report_uploaded_at } = r;
      return clone({
        request: { id, dossier_nr, status, status_updated_at, created_at, report_path, report_name, report_uploaded_at },
        history: D.history.filter((h) => h.request_id === r.id).map(({ status: s, customer_message, changed_at }) => ({ status: s, customer_message, changed_at })),
      });
    },
    requestsList: async ({ status, search } = {}) => {
      const s = String(search || '').toLowerCase();
      return clone(D.requests.filter((r) => (!status || r.status === status) && (!s || ['dossier_nr', 'naam', 'plaats', 'postcode', 'email'].some((c) => String(r[c]).toLowerCase().includes(s))))
        .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
        .map(({ id, dossier_nr, naam, plaats, postcode, request_type, status: st, status_updated_at, created_at, token_hash, token_revoked_at, report_path }) => ({ id, dossier_nr, naam, plaats, postcode, request_type, status: st, status_updated_at, created_at, token_hash, token_revoked_at, report_path })));
    },
    requestById: async (id) => {
      const request = D.requests.find((r) => r.id === id);
      if (!request) return null;
      return clone({
        request,
        history: D.history.filter((h) => h.request_id === id).map((h) => ({ ...h, user: userName(h.changed_by) })),
        notes: D.notes.filter((n) => n.request_id === id).map((n) => ({ id: n.id, note: n.note, created_at: n.created_at, user: userName(n.author_id) })),
        emails: D.emails.filter((e) => e.request_id === id),
      });
    },
    setStatus: async (id, status, message, userId) => {
      const r = D.requests.find((x) => x.id === id);
      if (!r) throw Object.assign(new Error('aanvraag niet gevonden'), { status: 404 });
      const t = now();
      Object.assign(r, { status, status_updated_at: t, updated_at: t });
      D.history.push({ id: nextId(), request_id: id, status, customer_message: message || '', changed_by: userId || null, changed_at: t });
      save(); return t;
    },
    updateRequest: async (id, f) => {
      const r = D.requests.find((x) => x.id === id); if (!r) return null;
      if (f.token_hash && D.requests.some((x) => x.token_hash === f.token_hash && x.id !== id)) throw conflict();
      Object.assign(r, f, { updated_at: now() }); save(); return clone(r);
    },
    addNote: async (row) => { D.notes.push({ id: nextId(), created_at: now(), ...row }); save(); },
    deleteRequest: async (id) => {
      D.requests = D.requests.filter((r) => r.id !== id);
      for (const t of ['history', 'notes', 'emails']) D[t] = D[t].filter((x) => x.request_id !== id);
      save();
    },
    requestCounts: async () => D.requests.reduce((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {}),

    emailCreate: async (row) => { const e = { id: nextId(), status: 'voorbereid', provider_id: null, error: null, created_at: now(), updated_at: now(), ...row }; D.emails.push(e); save(); return clone(e); },
    emailUpdate: async (id, f) => { const e = D.emails.find((x) => x.id === id); if (e) Object.assign(e, f, { updated_at: now() }); save(); },

    // opslag op schijf; de lokale dev-server (scripts/dev.mjs) serveert /__dev-storage/ en accepteert PUT op /__dev-upload/
    putObject: async (bucket, path, bytes) => { const p = objPath(bucket, path); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, bytes); },
    publicUrl: (bucket, path) => `/__dev-storage/${bucket}/${path}`,
    signedUrl: async (bucket, path, seconds, downloadName) => `/__dev-storage/${bucket}/${path}?verloopt=${Date.now() + seconds * 1000}${downloadName ? `&download=${encodeURIComponent(downloadName)}` : ''}`,
    signedUploadUrl: async (bucket, path) => `/__dev-upload/${bucket}/${path}`,
    objectInfo: async (bucket, path) => { const p = objPath(bucket, path); return existsSync(p) ? { size: statSync(p).size, type: 'application/pdf' } : null; },
    removeObject: async (bucket, path) => { const p = objPath(bucket, path); if (existsSync(p)) rmSync(p); },
  };
}

