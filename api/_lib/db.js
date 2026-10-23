/**
 * Gegevenslaag. Kiest één van twee implementaties met dezelfde functies:
 *   - Supabase (productie): SUPABASE_URL + SUPABASE_SERVICE_KEY, via de REST- en Storage-API (zonder extra pakketten).
 *   - Geheugen (alleen lokaal en in tests): MVFS_DB=memory. Wordt in productie geweigerd.
 * Zonder configuratie geeft getDb() null: de site werkt dan als voorheen, zonder opslag.
 */
import { memoryDb } from './db-memory.js';

export class DbError extends Error {
  constructor(message, status = 500, code = '') { super(message); this.status = status; this.code = code; }
}

let cached = null;
export function getDb() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_KEY;
  if (url && key) return (cached = supabaseDb(url.replace(/\/$/, ''), key));
  if (process.env.MVFS_DB === 'memory' && process.env.VERCEL_ENV !== 'production') return (cached = memoryDb());
  return null;
}
/** Alleen voor tests: opnieuw kiezen na het wijzigen van omgevingsvariabelen. */
export function resetDbForTests() { cached = null; }

export const NEWS_LIST_FIELDS = 'id,title,slug,excerpt,featured_image,featured_image_alt,status,show_author,author_id,created_at,updated_at,published_at';
const REQUEST_LIST_FIELDS = 'id,dossier_nr,naam,plaats,postcode,request_type,status,status_updated_at,created_at,token_hash,token_revoked_at,report_path';

// ---------------------------------------------------------------- Supabase
function supabaseDb(URL, KEY) {
  const headers = (extra = {}) => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, ...extra });
  const q = encodeURIComponent;

  async function rest(method, path, { body, prefer } = {}) {
    const r = await fetch(`${URL}/rest/v1/${path}`, {
      method,
      headers: headers({ 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) }),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await r.text();
    const data = text ? JSON.parse(text) : null;
    if (!r.ok) {
      const code = data?.code || '';
      throw new DbError(code === '23505' ? 'bestaat al' : `database ${r.status}`, code === '23505' ? 409 : 500, code);
    }
    return data;
  }
  const one = (rows) => (Array.isArray(rows) ? rows[0] || null : rows);
  const nowIso = () => new Date().toISOString();

  async function storage(method, path, { body, type, json } = {}) {
    const r = await fetch(`${URL}/storage/v1/${path}`, {
      method,
      headers: headers(json !== undefined ? { 'Content-Type': 'application/json' } : type ? { 'Content-Type': type, 'x-upsert': 'false' } : {}),
      body: json !== undefined ? JSON.stringify(json) : body,
    });
    const text = await r.text();
    if (!r.ok) throw new DbError(`opslag ${r.status}`, 502);
    return text ? JSON.parse(text) : null;
  }

  return {
    kind: 'supabase',
    // medewerkers en sessies
    userByEmail: async (email) => one(await rest('GET', `mvfs_users?email=eq.${q(email)}&select=*`)),
    userById: async (id) => one(await rest('GET', `mvfs_users?id=eq.${q(id)}&select=id,email,name,role,active`)),
    usersList: async () => rest('GET', 'mvfs_users?select=id,email,name,role,active&order=name.asc'),
    createUser: async (u) => one(await rest('POST', 'mvfs_users', { body: u, prefer: 'return=representation' })),
    updateUser: async (id, f) => one(await rest('PATCH', `mvfs_users?id=eq.${q(id)}`, { body: f, prefer: 'return=representation' })),
    createSession: async (s) => { await rest('POST', 'mvfs_sessions', { body: s }); },
    sessionWithUser: async (tokenHash) => {
      const s = one(await rest('GET', `mvfs_sessions?token_hash=eq.${q(tokenHash)}&expires_at=gt.${q(nowIso())}&select=token_hash,csrf,expires_at,user:mvfs_users(id,email,name,role,active)`));
      return s && s.user ? { session: s, user: s.user } : null;
    },
    deleteSession: async (tokenHash) => { await rest('DELETE', `mvfs_sessions?token_hash=eq.${q(tokenHash)}`); },
    deleteUserSessions: async (userId) => { await rest('DELETE', `mvfs_sessions?user_id=eq.${q(userId)}`); },
    deleteExpiredSessions: async () => { await rest('DELETE', `mvfs_sessions?expires_at=lt.${q(nowIso())}`); },
    addLoginAttempt: async (keyHash, success) => { await rest('POST', 'mvfs_login_attempts', { body: { key_hash: keyHash, success } }); },
    failuresSince: async (keyHash, sinceIso) => (await rest('GET', `mvfs_login_attempts?key_hash=eq.${q(keyHash)}&success=is.false&created_at=gt.${q(sinceIso)}&select=id`)).length,

    // nieuws
    newsList: async ({ status } = {}) => rest('GET', `mvfs_news?select=${NEWS_LIST_FIELDS}${status ? `&status=eq.${q(status)}` : ''}&order=published_at.desc.nullsfirst,updated_at.desc&limit=500`),
    newsById: async (id) => one(await rest('GET', `mvfs_news?id=eq.${q(id)}&select=*,author:mvfs_users(name)`)),
    newsBySlug: async (slug) => one(await rest('GET', `mvfs_news?slug=eq.${q(slug)}&select=*,author:mvfs_users(name)`)),
    newsCreate: async (row) => one(await rest('POST', 'mvfs_news', { body: row, prefer: 'return=representation' })),
    newsUpdate: async (id, row) => one(await rest('PATCH', `mvfs_news?id=eq.${q(id)}`, { body: { ...row, updated_at: nowIso() }, prefer: 'return=representation' })),
    newsDelete: async (id) => { await rest('DELETE', `mvfs_news?id=eq.${q(id)}`); },

    // QuickScan-aanvragen
    registerRequest: async (row) => one(await rest('POST', 'rpc/mvfs_register_request', { body: { p: row } })),
    requestByTokenHash: async (hash) => {
      const r = one(await rest('GET', `mvfs_requests?token_hash=eq.${q(hash)}&token_revoked_at=is.null&select=id,dossier_nr,status,status_updated_at,created_at,report_path,report_name,report_uploaded_at`));
      if (!r) return null;
      const history = await rest('GET', `mvfs_status_history?request_id=eq.${q(r.id)}&select=status,customer_message,changed_at&order=changed_at.asc,id.asc`);
      return { request: r, history };
    },
    requestsList: async ({ status, search } = {}) => {
      let path = `mvfs_requests?select=${REQUEST_LIST_FIELDS}&order=created_at.desc&limit=200`;
      if (status) path += `&status=eq.${q(status)}`;
      if (search) {
        const s = search.replace(/[(),*]/g, ' ').trim();
        path += `&or=(${['dossier_nr', 'naam', 'plaats', 'postcode', 'email'].map((c) => `${c}.ilike.*${q(s)}*`).join(',')})`;
      }
      return rest('GET', path);
    },
    requestById: async (id) => {
      const request = one(await rest('GET', `mvfs_requests?id=eq.${q(id)}&select=*`));
      if (!request) return null;
      const [history, notes, emails] = await Promise.all([
        rest('GET', `mvfs_status_history?request_id=eq.${q(id)}&select=id,status,customer_message,changed_at,user:mvfs_users(name)&order=changed_at.asc,id.asc`),
        rest('GET', `mvfs_notes?request_id=eq.${q(id)}&select=id,note,created_at,user:mvfs_users(name)&order=created_at.asc`),
        rest('GET', `mvfs_emails?request_id=eq.${q(id)}&select=id,kind,status,error,created_at,updated_at&order=created_at.asc`),
      ]);
      return { request, history, notes, emails };
    },
    setStatus: async (id, status, message, userId) => rest('POST', 'rpc/mvfs_set_status', { body: { p_request: id, p_status: status, p_message: message || '', p_user: userId || null } }),
    updateRequest: async (id, f) => one(await rest('PATCH', `mvfs_requests?id=eq.${q(id)}`, { body: { ...f, updated_at: nowIso() }, prefer: 'return=representation' })),
    addNote: async (row) => { await rest('POST', 'mvfs_notes', { body: row }); },
    deleteRequest: async (id) => { await rest('DELETE', `mvfs_requests?id=eq.${q(id)}`); },
    requestCounts: async () => {
      const rows = await rest('GET', 'mvfs_requests?select=status&limit=10000');
      return rows.reduce((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {});
    },

    // e-maillog
    emailCreate: async (row) => one(await rest('POST', 'mvfs_emails', { body: row, prefer: 'return=representation' })),
    emailUpdate: async (id, f) => { await rest('PATCH', `mvfs_emails?id=eq.${q(id)}`, { body: { ...f, updated_at: nowIso() } }); },

    // QuickScan-rapporten
    advisorsList: async () => rest('GET', 'mvfs_advisors?select=*&order=name.asc'),
    advisorById: async (id) => one(await rest('GET', `mvfs_advisors?id=eq.${q(id)}&select=*`)),
    advisorCreate: async (row) => one(await rest('POST', 'mvfs_advisors', { body: row, prefer: 'return=representation' })),
    advisorUpdate: async (id, f) => one(await rest('PATCH', `mvfs_advisors?id=eq.${q(id)}`, { body: { ...f, updated_at: nowIso() }, prefer: 'return=representation' })),
    nextReportNr: async () => rest('POST', 'rpc/mvfs_next_report_nr', { body: {} }),
    reportCreate: async (row) => one(await rest('POST', 'mvfs_reports', { body: row, prefer: 'return=representation' })),
    reportsList: async ({ status, search } = {}) => {
      let path = 'mvfs_reports?select=id,report_nr,status,risk,version,request_id,updated_at,created_at,data,advisor:mvfs_advisors(name)&order=updated_at.desc&limit=200';
      if (status) path += `&status=eq.${q(status)}`;
      if (search) {
        const s = search.replace(/[(),*]/g, ' ').trim();
        path += `&or=(report_nr.ilike.*${q(s)}*,data->voorblad->>object_straat.ilike.*${q(s)}*,data->voorblad->>object_plaats.ilike.*${q(s)}*,data->algemeen->>opdrachtgever_naam.ilike.*${q(s)}*)`;
      }
      return rest('GET', path);
    },
    reportById: async (id) => one(await rest('GET', `mvfs_reports?id=eq.${q(id)}&select=*`)),
    reportUpdate: async (id, f) => one(await rest('PATCH', `mvfs_reports?id=eq.${q(id)}`, { body: { ...f, updated_at: nowIso() }, prefer: 'return=representation' })),
    reportDelete: async (id) => { await rest('DELETE', `mvfs_reports?id=eq.${q(id)}`); },
    reportImages: async (reportId) => rest('GET', `mvfs_report_images?report_id=eq.${q(reportId)}&select=*&order=slot.asc,position.asc`),
    reportImageById: async (id) => one(await rest('GET', `mvfs_report_images?id=eq.${q(id)}&select=*`)),
    reportImageCreate: async (row) => one(await rest('POST', 'mvfs_report_images', { body: row, prefer: 'return=representation' })),
    reportImageUpdate: async (id, f) => one(await rest('PATCH', `mvfs_report_images?id=eq.${q(id)}`, { body: f, prefer: 'return=representation' })),
    reportImageDelete: async (id) => { await rest('DELETE', `mvfs_report_images?id=eq.${q(id)}`); },
    versionCreate: async (row) => one(await rest('POST', 'mvfs_report_versions', { body: row, prefer: 'return=representation' })),
    versionsList: async (reportId) => rest('GET', `mvfs_report_versions?report_id=eq.${q(reportId)}&select=id,version,risk,template_version,docx_path,pdf_path,pdf_uploaded_at,finalized_at,sent_at,sent_to,finalizer:mvfs_users!mvfs_report_versions_finalized_by_fkey(name),sender:mvfs_users!mvfs_report_versions_sent_by_fkey(name)&order=version.desc`),
    versionGet: async (reportId, version) => one(await rest('GET', `mvfs_report_versions?report_id=eq.${q(reportId)}&version=eq.${q(version)}&select=*`)),
    versionUpdate: async (id, f) => one(await rest('PATCH', `mvfs_report_versions?id=eq.${q(id)}`, { body: f, prefer: 'return=representation' })),
    reportEmails: async (reportId) => rest('GET', `mvfs_emails?report_id=eq.${q(reportId)}&select=id,kind,status,error,created_at,updated_at&order=created_at.asc`),
    finalRiskForRequest: async (requestId) => one(await rest('GET', `mvfs_reports?request_id=eq.${q(requestId)}&status=in.(definitief,verzonden)&select=risk,report_nr,version&order=updated_at.desc&limit=1`)),
    getObject: async (bucket, path) => {
      const r = await fetch(`${URL}/storage/v1/object/${bucket}/${path}`, { headers: headers() });
      if (!r.ok) throw new DbError(`opslag ${r.status}`, 502);
      return Buffer.from(await r.arrayBuffer());
    },

    // opslag
    putObject: async (bucket, path, bytes, type) => { await storage('POST', `object/${bucket}/${path}`, { body: bytes, type }); },
    publicUrl: (bucket, path) => `${URL}/storage/v1/object/public/${bucket}/${path}`,
    signedUrl: async (bucket, path, seconds, downloadName) => {
      const d = await storage('POST', `object/sign/${bucket}/${path}`, { json: { expiresIn: seconds } });
      const u = `${URL}/storage/v1${d.signedURL || d.signedUrl}`;
      return downloadName ? `${u}&download=${q(downloadName)}` : u;
    },
    signedUploadUrl: async (bucket, path) => {
      const d = await storage('POST', `object/upload/sign/${bucket}/${path}`, { json: {} });
      return `${URL}/storage/v1${d.url}`;
    },
    objectInfo: async (bucket, path) => {
      const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      const name = path.slice(path.lastIndexOf('/') + 1);
      const list = await storage('POST', `object/list/${bucket}`, { json: { prefix: dir, search: name, limit: 10 } });
      const f = (list || []).find((o) => o.name === name);
      return f ? { size: f.metadata?.size ?? null, type: f.metadata?.mimetype ?? null } : null;
    },
    removeObject: async (bucket, path) => { await storage('DELETE', `object/${bucket}`, { json: { prefixes: [path] } }); },
  };
}
