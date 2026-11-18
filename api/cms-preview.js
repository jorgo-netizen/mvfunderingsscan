/**
 * Bewerkmodus voor het centrale CMS ("Website bewerken" in mideavastgoed.app/marketing, docs/marketing-cms.md §7).
 *   GET /api/cms-preview?token=…&path=/pad/
 * Haalt het concept op bij het CMS (token, geen API-sleutel nodig) en rendert de pagina met de eigen templates,
 * met data-cms-entry/data-cms-field-markeringen en cms-bridge.js. Alleen in een frame van mideavastgoed.app,
 * nooit gecachet of geïndexeerd. Formulieren worden in de bewerkmodus door cms-bridge.js geblokkeerd.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './_lib/db.js';
import { sendHtml, sendText, logError } from './_lib/http.js';
import { renderNewsArticle } from './_lib/news-render.js';
import { cmsNaarPost, cmsNieuwsDb } from './_lib/cms-nieuws.js';
import { render } from '../src/lib/template.mjs';
import { overlay } from '../scripts/cms.mjs';

const PREVIEW_API = 'https://www.mideavastgoed.app/api/cms/v1/preview/page';
const BRIDGE = '<script src="https://www.mideavastgoed.app/cms-bridge.js" defer></script>';
const SITE = 'https://www.mvfunderingsquickscan.nl';
const HEADERS = {
  'Content-Security-Policy': 'frame-ancestors https://www.mideavastgoed.app https://mideavastgoed.app',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
};
const PAGES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'pages');
let pages = null;
const pagina = (path) => {
  pages ||= new Map(readdirSync(PAGES_DIR).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(readFileSync(join(PAGES_DIR, f), 'utf8'))).map((p) => [p.path, p]));
  return pages.get(path);
};
const attr = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** body-markering + bridge-script toevoegen. */
export function metBridge(html, entryId) {
  const body = entryId ? html.replace(/<body\b([^>]*)>/, `<body$1 data-cms-entry="${attr(entryId)}">`) : html;
  return body.includes('</body>') ? body.replace('</body>', `${BRIDGE}\n</body>`) : body + BRIDGE;
}

async function concept(token, path, fetchFn) {
  const r = await fetchFn(`${PREVIEW_API}?token=${encodeURIComponent(token)}&path=${encodeURIComponent(path)}`, { signal: AbortSignal.timeout(8000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`preview ${r.status}`);
  return r.json();
}

export async function previewHtml(token, path, { fetchFn = fetch } = {}) {
  const c = await concept(token, path, fetchFn);
  const nieuws = path.match(/^\/nieuws\/([a-z0-9-]+)\/$/);
  if (nieuws) {
    const db = cmsNieuwsDb(getDb(), { fetchFn }) || { // geen CMS-sleutel en geen database (lokaal)
      newsBySlug: async () => null,
      publicUrl: (b, p) => (/^https?:\/\//.test(p) ? p : `${String(process.env.SUPABASE_URL || '').replace(/\/$/, '')}/storage/v1/object/public/${b}/${p}`),
    };
    const post = c ? cmsNaarPost(c) : await db.newsBySlug(nieuws[1]);
    if (!post) return null;
    const html = renderNewsArticle(db, post, { preview: true })
      .replace(/<h1\b/, '<h1 data-cms-field="h1"');
    return metBridge(html, c?.entryId);
  }
  const p0 = pagina(path);
  if (p0) {
    const p = structuredClone(p0);
    if (c) overlay(p, c);
    p._cms = true;
    p.sections.forEach((s, i) => { s._cmsIndex = i; });
    (p.faqs || []).forEach((f, i) => { f._cmsIndex = i; });
    return metBridge(render(p), c?.entryId);
  }
  // Handgebouwde pagina's (homepage, contact, aanvragen …): de live pagina in de bewerkmodus tonen.
  const r = await fetchFn(SITE + path, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  return metBridge(await r.text(), c?.entryId);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Alleen GET is toegestaan.');
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token') || '';
  const path = (url.searchParams.get('path') || '/').split(/[?#]/)[0].replace(/\/?$/, '/'); // site-paden eindigen op /
  if (!/^[\w.~-]{10,4000}$/.test(token) || !/^\/([a-z0-9-]+\/)*$/.test(path)) return sendText(res, 400, 'Ongeldig token of pad.');
  try {
    const html = await previewHtml(token, path);
    if (!html) return sendHtml(res, 404, '<!doctype html><meta charset="utf-8"><title>Niet gevonden</title><p>Deze pagina bestaat niet.</p>', { headers: HEADERS });
    return sendHtml(res, 200, html, { headers: HEADERS });
  } catch (err) {
    logError('cms-preview', err);
    return sendHtml(res, 502, '<!doctype html><meta charset="utf-8"><title>Preview niet beschikbaar</title><p>Het concept kon niet worden geladen. Probeer het opnieuw vanuit het portaal.</p>', { headers: HEADERS });
  }
}
