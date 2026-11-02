/**
 * Beheerportaal-API (alleen voor ingelogde medewerkers). Eén functie, actie via ?actie=…
 *
 * Elke actie controleert server-side: geldige sessie, rol (waar nodig) en bij wijzigingen het CSRF-token
 * (header X-MVFS-CSRF) plus dezelfde herkomst. Rollen: 'beheerder' (alles) en 'medewerker'
 * (alles behalve het definitief verwijderen van aanvragen).
 */
import { getDb } from './_lib/db.js';
import { login, logout, requireUser } from './_lib/auth.js';
import { sendJson, sendHtml, readJson, randomToken, isUuid, logError } from './_lib/http.js';
import { STATUS_KEYS, statusInfo, newToken, hashToken, trackingUrl } from './_lib/tracking.js';
import { sendLogged, trackingMail } from './_lib/mail.js';
import { slugify, isSlug, plainText } from './_lib/markdown.js';
import { renderNewsArticle } from './_lib/news-render.js';
import { rapportActies } from './_lib/rapport-api.js';
import { redactieActies } from './_lib/redactie-api.js';
import { meldIndexNow, INDEXNOW_HOST } from './_lib/indexnow.js';

const NOINDEX = { 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' };
const json = (res, status, body) => sendJson(res, status, body, NOINDEX);
const fail = (res, status, error) => json(res, status, { ok: false, error });
const str = (v, max) => String(v ?? '').trim().slice(0, max);

const IMAGE_TYPES = { 'image/jpeg': [[0xff, 0xd8, 0xff]], 'image/png': [[0x89, 0x50, 0x4e, 0x47]], 'image/webp': [[0x52, 0x49, 0x46, 0x46]] };
const MAX_IMAGE = 2.5 * 1024 * 1024;
const MAX_REPORT = 50 * 1024 * 1024;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// ---------------------------------------------------------------- nieuws
function validateNews(input, { publishing }) {
  const title = str(input.title, 140);
  const slug = str(input.slug, 90) || slugify(title);
  const row = {
    title, slug,
    excerpt: str(input.excerpt, 400),
    meta_description: str(input.meta_description, 170),
    content: String(input.content ?? '').replace(/\r\n?/g, '\n').slice(0, 60000),
    featured_image_alt: str(input.featured_image_alt, 200),
    show_author: input.show_author === true,
  };
  const errors = [];
  if (title.length < 3) errors.push('Vul een titel in van minimaal 3 tekens.');
  if (!isSlug(slug)) errors.push('De URL mag alleen kleine letters, cijfers en streepjes bevatten (bijv. nieuwe-regels-funderingsonderzoek).');
  if (publishing) {
    if (!row.excerpt) errors.push('Vul een korte introductie in voordat je publiceert.');
    if (plainText(row.content).length < 200) errors.push('De artikeltekst is te kort om te publiceren (minimaal ongeveer 200 tekens).');
  }
  return { row, errors };
}

/**
 * Meldt gewijzigde nieuws-URL's bij IndexNow. Alleen op productie, met een korte time-out; een fout blokkeert nooit het
 * opslaan of publiceren (meldIndexNow gooit niet, en eventuele fouten worden alleen gelogd).
 */
async function meldNieuws(...slugs) {
  if (process.env.VERCEL_ENV !== 'production') return;
  const urls = [...slugs.filter(Boolean).map((s) => `https://${INDEXNOW_HOST}/nieuws/${s}/`), `https://${INDEXNOW_HOST}/nieuws/`];
  const r = await meldIndexNow(urls, { timeoutMs: 4000 });
  if (r.fout && !/ontbreekt/.test(r.fout)) logError('indexnow', new Error(r.fout));
}

const publicNews = (n) => n && ({ ...n, author: undefined, author_name: n.author?.name || null });

async function newsActions(db, req, res, actie, user, url) {
  if (actie === 'nieuws-lijst') return json(res, 200, { ok: true, items: await db.newsList() });
  if (actie === 'nieuws') {
    const n = isUuid(url.searchParams.get('id')) ? await db.newsById(url.searchParams.get('id')) : null;
    return n ? json(res, 200, { ok: true, item: { ...publicNews(n), image_url: n.featured_image ? db.publicUrl('nieuws', n.featured_image) : null } }) : fail(res, 404, 'Bericht niet gevonden.');
  }
  if (actie === 'nieuws-voorbeeld') {
    const n = isUuid(url.searchParams.get('id')) ? await db.newsById(url.searchParams.get('id')) : null;
    if (!n) return fail(res, 404, 'Bericht niet gevonden.');
    return sendHtml(res, 200, renderNewsArticle(db, n, { preview: true }), { headers: NOINDEX });
  }
  if (req.method !== 'POST') return fail(res, 405, 'Alleen POST is toegestaan.');
  const body = await readJson(req);

  if (actie === 'nieuws-opslaan') {
    const existing = body.id ? (isUuid(body.id) ? await db.newsById(body.id) : null) : null;
    if (body.id && !existing) return fail(res, 404, 'Bericht niet gevonden.');
    const { row, errors } = validateNews(body, { publishing: existing?.status === 'gepubliceerd' });
    if (errors.length) return json(res, 422, { ok: false, error: errors.join(' '), errors });
    if (!existing) row.author_id = user.id;
    try {
      const saved = existing ? await db.newsUpdate(existing.id, row) : await db.newsCreate({ ...row, status: 'concept' });
      if (existing?.status === 'gepubliceerd') await meldNieuws(saved.slug, existing.slug !== saved.slug ? existing.slug : null);
      return json(res, 200, { ok: true, item: publicNews(saved) });
    } catch (err) {
      if (err.status === 409) return fail(res, 409, 'Deze URL (slug) is al in gebruik door een ander bericht. Kies een andere.');
      throw err;
    }
  }
  if (actie === 'nieuws-status') {
    const n = isUuid(body.id) ? await db.newsById(body.id) : null;
    if (!n) return fail(res, 404, 'Bericht niet gevonden.');
    if (body.status === 'gepubliceerd') {
      const { errors } = validateNews(n, { publishing: true });
      if (n.featured_image && !n.featured_image_alt) errors.push('Vul een beschrijving (alt-tekst) van de afbeelding in.');
      if (errors.length) return json(res, 422, { ok: false, error: errors.join(' '), errors });
      const saved = await db.newsUpdate(n.id, { status: 'gepubliceerd', published_at: n.published_at || new Date().toISOString() });
      await meldNieuws(saved.slug);
      return json(res, 200, { ok: true, item: publicNews(saved) });
    }
    if (body.status === 'concept') {
      const saved = await db.newsUpdate(n.id, { status: 'concept' });
      if (n.status === 'gepubliceerd') await meldNieuws(n.slug); // de URL geeft nu 404
      return json(res, 200, { ok: true, item: publicNews(saved) });
    }
    return fail(res, 422, 'Onbekende status.');
  }
  if (actie === 'nieuws-verwijderen') {
    if (body.bevestig !== true) return fail(res, 422, 'Bevestig het verwijderen.');
    const n = isUuid(body.id) ? await db.newsById(body.id) : null;
    if (!n) return fail(res, 404, 'Bericht niet gevonden.');
    if (n.featured_image) await db.removeObject('nieuws', n.featured_image).catch((e) => logError('nieuws-afbeelding', e));
    await db.newsDelete(n.id);
    if (n.status === 'gepubliceerd') await meldNieuws(n.slug);
    return json(res, 200, { ok: true });
  }
  if (actie === 'nieuws-afbeelding') {
    const n = isUuid(body.id) ? await db.newsById(body.id) : null;
    if (!n) return fail(res, 404, 'Sla het bericht eerst op.');
    if (body.verwijderen === true) {
      if (n.featured_image) await db.removeObject('nieuws', n.featured_image).catch((e) => logError('nieuws-afbeelding', e));
      await db.newsUpdate(n.id, { featured_image: null });
      return json(res, 200, { ok: true });
    }
    const type = String(body.type || '');
    if (!IMAGE_TYPES[type]) return fail(res, 422, 'Alleen JPEG, PNG of WebP is toegestaan.');
    const bytes = Buffer.from(String(body.data || ''), 'base64');
    if (!bytes.length || bytes.length > MAX_IMAGE) return fail(res, 422, 'De afbeelding is leeg of groter dan 2,5 MB.');
    if (!IMAGE_TYPES[type].some((sig) => sig.every((b, i) => bytes[i] === b))) return fail(res, 422, 'Het bestand is geen geldige afbeelding.');
    const path = `${new Date().getFullYear()}/${randomToken(12)}.${EXT[type]}`;
    await db.putObject('nieuws', path, bytes, type);
    if (n.featured_image) await db.removeObject('nieuws', n.featured_image).catch((e) => logError('nieuws-afbeelding', e));
    const alt = str(body.alt, 200);
    await db.newsUpdate(n.id, { featured_image: path, ...(alt ? { featured_image_alt: alt } : {}) });
    return json(res, 200, { ok: true, image_url: db.publicUrl('nieuws', path) });
  }
  return null;
}

// ---------------------------------------------------------------- QuickScan-aanvragen
const adminRequest = (r) => {
  const { token_hash, idempotency_key, ...rest } = r;
  return { ...rest, link_actief: !!token_hash && !r.token_revoked_at };
};

async function requestActions(db, req, res, actie, user, url) {
  if (actie === 'aanvragen') {
    const status = STATUS_KEYS.includes(url.searchParams.get('status')) ? url.searchParams.get('status') : null;
    const search = str(url.searchParams.get('q'), 80);
    const items = await db.requestsList({ status, search });
    return json(res, 200, { ok: true, items: items.map(adminRequest) });
  }
  if (actie === 'aanvraag') {
    const full = isUuid(url.searchParams.get('id')) ? await db.requestById(url.searchParams.get('id')) : null;
    if (!full) return fail(res, 404, 'Aanvraag niet gevonden.');
    return json(res, 200, { ok: true, request: adminRequest(full.request), history: full.history, notes: full.notes, emails: full.emails, statuses: STATUS_KEYS.map((k) => ({ key: k, label: statusInfo(k).label })) });
  }
  if (req.method !== 'POST') return fail(res, 405, 'Alleen POST is toegestaan.');
  const body = await readJson(req, 64 * 1024);
  const full = isUuid(body.id) ? await db.requestById(body.id) : null;
  if (!full) return fail(res, 404, 'Aanvraag niet gevonden.');
  const r = full.request;

  if (actie === 'aanvraag-status') {
    if (!STATUS_KEYS.includes(body.status)) return fail(res, 422, 'Onbekende status.');
    const msg = str(body.bericht, 1000);
    await db.setStatus(r.id, body.status, msg, user.id);
    return json(res, 200, { ok: true });
  }
  if (actie === 'aanvraag-notitie') {
    const note = str(body.notitie, 4000);
    if (!note) return fail(res, 422, 'Vul een notitie in.');
    await db.addNote({ request_id: r.id, note, author_id: user.id });
    return json(res, 200, { ok: true });
  }
  if (actie === 'aanvraag-link') {
    // Nieuwe link uitgeven: de oude werkt direct niet meer. De nieuwe gaat alleen per e-mail naar de klant.
    const token = newToken();
    await db.updateRequest(r.id, { token_hash: hashToken(token), token_created_at: new Date().toISOString(), token_revoked_at: null });
    const m = trackingMail({ naam: r.naam, dossier: r.dossier_nr, url: trackingUrl(token), nieuweLink: true });
    const mail = await sendLogged(db, { requestId: r.id, kind: 'nieuwe_link', idempotencyKey: `link-${r.id}-${hashToken(token).slice(0, 12)}`, payload: { to: [r.email], subject: m.subject, html: m.html, text: m.text } });
    return json(res, 200, { ok: true, mail: mail.skipped ? 'niet ingesteld' : mail.status });
  }
  if (actie === 'aanvraag-link-intrekken') {
    await db.updateRequest(r.id, { token_revoked_at: new Date().toISOString() });
    return json(res, 200, { ok: true });
  }
  if (actie === 'aanvraag-rapport-upload') {
    const size = Number(body.grootte);
    if (body.type !== 'application/pdf' || !Number.isFinite(size) || size <= 0 || size > MAX_REPORT) return fail(res, 422, 'Alleen een PDF-bestand tot 50 MB is toegestaan.');
    const path = `${r.id}/${randomToken(16)}.pdf`;
    return json(res, 200, { ok: true, upload_url: await db.signedUploadUrl('rapporten', path), pad: path });
  }
  if (actie === 'aanvraag-rapport-bevestig') {
    const path = String(body.pad || '');
    if (!new RegExp(`^${r.id}/[A-Za-z0-9_-]{22}\\.pdf$`).test(path)) return fail(res, 422, 'Ongeldig bestand.');
    const info = await db.objectInfo('rapporten', path);
    if (!info) return fail(res, 422, 'Het rapport is niet (volledig) geüpload. Probeer het opnieuw.');
    if (r.report_path && r.report_path !== path) await db.removeObject('rapporten', r.report_path).catch((e) => logError('rapport', e));
    await db.updateRequest(r.id, { report_path: path, report_name: `rapport-${r.dossier_nr}.pdf`, report_uploaded_at: new Date().toISOString() });
    return json(res, 200, { ok: true });
  }
  if (actie === 'aanvraag-rapport-verwijderen') {
    if (r.report_path) await db.removeObject('rapporten', r.report_path).catch((e) => logError('rapport', e));
    await db.updateRequest(r.id, { report_path: null, report_name: null, report_uploaded_at: null });
    return json(res, 200, { ok: true });
  }
  if (actie === 'aanvraag-rapport-bekijken') {
    if (!r.report_path) return fail(res, 404, 'Geen rapport.');
    return json(res, 200, { ok: true, url: await db.signedUrl('rapporten', r.report_path, 60, r.report_name) });
  }
  if (actie === 'aanvraag-verwijderen') {
    if (user.role !== 'beheerder') return fail(res, 403, 'Alleen een beheerder kan aanvragen verwijderen.');
    if (body.bevestig !== r.dossier_nr) return fail(res, 422, 'Typ ter bevestiging het dossiernummer.');
    if (r.report_path) await db.removeObject('rapporten', r.report_path).catch((e) => logError('rapport', e));
    await db.deleteRequest(r.id);
    return json(res, 200, { ok: true });
  }
  return null;
}

// ---------------------------------------------------------------- router
export default async function handler(req, res) {
  const db = getDb();
  if (!db) return fail(res, 503, 'Het beheerportaal is nog niet ingesteld (database ontbreekt).');
  const url = new URL(req.url, 'http://localhost');
  const actie = url.searchParams.get('actie') || '';
  const isWrite = req.method === 'POST';
  if (!['GET', 'POST'].includes(req.method)) return fail(res, 405, 'Methode niet toegestaan.');

  try {
    if (actie === 'inloggen') {
      if (!isWrite) return fail(res, 405, 'Alleen POST is toegestaan.');
      const body = await readJson(req, 8 * 1024);
      const r = await login(db, req, body.email, body.wachtwoord);
      if (!r.ok) return fail(res, r.status, r.error);
      return sendJson(res, 200, { ok: true, user: r.user, csrf: r.csrf }, { ...NOINDEX, 'Set-Cookie': r.cookie });
    }
    if (actie === 'uitloggen') {
      if (!isWrite) return fail(res, 405, 'Alleen POST is toegestaan.');
      const auth = await requireUser(db, req, { write: true });
      if (auth.error && auth.status !== 401) return fail(res, auth.status, auth.error);
      const c = await logout(db, req);
      return sendJson(res, 200, { ok: true }, { ...NOINDEX, 'Set-Cookie': c });
    }

    const auth = await requireUser(db, req, { write: isWrite });
    if (auth.error) return fail(res, auth.status, auth.error);
    const { user } = auth;

    if (actie === 'ik') return json(res, 200, { ok: true, user, csrf: auth.csrf });
    if (actie === 'dashboard') {
      const [news, counts, recent] = await Promise.all([db.newsList(), db.requestCounts(), db.requestsList({})]);
      return json(res, 200, {
        ok: true, user,
        nieuws: { gepubliceerd: news.filter((n) => n.status === 'gepubliceerd').length, concept: news.filter((n) => n.status === 'concept').length, recent: news.slice(0, 5) },
        aanvragen: { per_status: counts, open: Object.entries(counts).filter(([k]) => k !== 'afgerond').reduce((a, [, v]) => a + v, 0), recent: recent.slice(0, 5).map(adminRequest) },
      });
    }
    if (actie.startsWith('nieuws')) {
      const out = await newsActions(db, req, res, actie, user, url);
      if (out !== null) return out;
    }
    if (actie.startsWith('rapport')) {
      const out = await rapportActies(db, req, res, actie, user, url, { json, fail, readJson, sendHtml, NOINDEX });
      if (out !== null) return out;
    }
    if (actie.startsWith('redactie')) {
      const out = await redactieActies(db, req, res, actie, user, url, { json, fail, readJson, sendHtml, NOINDEX });
      if (out !== null) return out;
    }
    if (actie.startsWith('aanvra')) {
      const out = await requestActions(db, req, res, actie, user, url);
      if (out !== null) return out;
    }
    return fail(res, 404, 'Onbekende actie.');
  } catch (err) {
    if (err.status === 413) return fail(res, 413, 'Het verzoek is te groot.');
    if (err.status === 400) return fail(res, 400, 'Ongeldige gegevens.');
    logError(`beheer:${actie}`, err);
    return fail(res, 500, 'Er ging iets mis. Probeer het opnieuw.');
  }
}
