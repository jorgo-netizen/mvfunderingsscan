/**
 * Live-controle van een gepubliceerde omgeving (alleen lezen; verandert niets).
 *
 *   node scripts/live-controle.mjs                       productie (www.mvfunderingsquickscan.nl)
 *   node scripts/live-controle.mjs --basis <url> --preview
 *                                                        een Vercel-preview: controleert alleen dat die noindex is
 *   --ci                                                 exitcode 1 bij een kritieke fout
 *
 * Productie: robots.txt (crawlers toegelaten, sitemaps vermeld), sitemap.xml en nieuws-sitemap.xml (elke URL 200,
 * geen noindex, canonical naar zichzelf), alle redirects uit vercel.json, het domein zonder www, en het IndexNow-
 * sleutelbestand (alleen als INDEXNOW_KEY is gezet; de sleutel zelf wordt niet gelogd).
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOMEIN, signalen, sitemapUrls } from './seo/pagina.mjs';
import { isSleutel } from '../api/_lib/indexnow.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const waarde = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const BASIS = (waarde('basis') || DOMEIN).replace(/\/$/, '');
const CRAWLERS = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot'];
const kritiek = []; const waarschuwing = []; const ok = [];

async function haal(url, { tekst = true } = {}) {
  for (let poging = 1; poging <= 2; poging++) {
    try {
      const r = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'MV-Funderingsscan-livecontrole/1.0' }, signal: AbortSignal.timeout(20000) });
      return { status: r.status, location: r.headers.get('location') || '', robots: r.headers.get('x-robots-tag') || '', body: tekst && r.status === 200 ? await r.text() : '' };
    } catch (err) { if (poging === 2) return { status: 0, fout: String(err.message || err) }; }
  }
}
/** Beperkt aantal gelijktijdige verzoeken, zodat de site niet belast wordt. */
async function perGroep(lijst, n, fn) { const uit = []; for (let i = 0; i < lijst.length; i += n) uit.push(...await Promise.all(lijst.slice(i, i + n).map(fn))); return uit; }

async function preview() {
  const r = await haal(`${BASIS}/`);
  if (r.status !== 200 && r.status !== 401) kritiek.push(`preview geeft status ${r.status}`);
  else if (r.status === 401) ok.push('preview is afgeschermd (Vercel-beveiliging, 401)');
  else if (!/noindex/i.test(r.robots)) kritiek.push('preview heeft geen X-Robots-Tag: noindex (kan in Google terechtkomen)');
  else ok.push('preview heeft X-Robots-Tag: noindex');
}

async function productie() {
  // robots.txt
  const robots = await haal(`${BASIS}/robots.txt`);
  if (robots.status !== 200) kritiek.push(`robots.txt geeft status ${robots.status}`);
  else {
    const blokken = robots.body.split(/\n(?=User-agent:)/i);
    for (const c of CRAWLERS) {
      const blok = blokken.find((b) => new RegExp(`^User-agent:\\s*${c}\\s*$`, 'im').test(b)) || blokken.find((b) => /^User-agent:\s*\*\s*$/im.test(b));
      if (blok && /^Disallow:\s*\/\s*$/im.test(blok)) kritiek.push(`robots.txt blokkeert ${c}`);
    }
    for (const sm of ['sitemap.xml', 'nieuws-sitemap.xml']) if (!robots.body.includes(`Sitemap: ${DOMEIN}/${sm}`)) kritiek.push(`robots.txt vermeldt ${sm} niet`);
    ok.push(`robots.txt: ${CRAWLERS.join(', ')} toegelaten`);
  }

  // sitemaps en elke URL daarin
  for (const sm of ['sitemap.xml', 'nieuws-sitemap.xml']) {
    const r = await haal(`${BASIS}/${sm}`);
    if (r.status !== 200) { kritiek.push(`${sm} geeft status ${r.status}`); continue; }
    const urls = sitemapUrls(r.body);
    if (new Set(urls).size !== urls.length) kritiek.push(`${sm} bevat dubbele URL's`);
    const fouten = (await perGroep(urls, 6, async (u) => {
      if (!u.startsWith(DOMEIN + '/')) return `${u}: ander domein`;
      const p = await haal(BASIS + u.slice(DOMEIN.length));
      if (p.status !== 200) return `${u}: status ${p.status}`;
      const s = signalen(p.body);
      if (/noindex/i.test(p.robots) || /noindex/i.test(s.robots)) return `${u}: noindex`;
      if (s.canonical !== u) return `${u}: canonical ${s.canonical || 'ontbreekt'}`;
      return null;
    })).filter(Boolean);
    fouten.forEach((f) => kritiek.push(`${sm} – ${f}`));
    ok.push(`${sm}: ${urls.length} URL's gecontroleerd, ${fouten.length} fout(en)`);
  }

  // redirects uit vercel.json (zonder has-voorwaarde) en het domein zonder www
  const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
  const redirects = (vercel.redirects || []).filter((r) => !r.has && !r.source.includes(':'));
  for (const rd of redirects) {
    const r = await haal(BASIS + rd.source, { tekst: false });
    const doel = new URL(r.location || 'x:', BASIS + '/').pathname;
    if (![301, 308].includes(r.status) || doel !== rd.destination) kritiek.push(`redirect ${rd.source} → ${rd.destination}: status ${r.status}, naar ${r.location || '–'}`);
  }
  ok.push(`${redirects.length} redirects gecontroleerd`);
  if (BASIS === DOMEIN) {
    const kaal = await haal('https://mvfunderingsquickscan.nl/prijzen/', { tekst: false });
    if (![301, 308].includes(kaal.status) || !kaal.location.startsWith(`${DOMEIN}/prijzen/`)) kritiek.push(`domein zonder www stuurt niet door naar www (status ${kaal.status})`);
    else ok.push('domein zonder www → www (permanent)');
  }

  // IndexNow-sleutelbestand
  const key = process.env.INDEXNOW_KEY;
  if (!isSleutel(key)) waarschuwing.push('INDEXNOW_KEY niet gezet: sleutelbestand niet gecontroleerd');
  else {
    const r = await haal(`${BASIS}/${key}.txt`);
    if (r.status !== 200 || r.body.trim() !== key) kritiek.push(`IndexNow-sleutelbestand niet correct bereikbaar (status ${r.status})`);
    else ok.push('IndexNow-sleutelbestand bereikbaar en correct');
  }
}

await (args.includes('--preview') ? preview() : productie());

const regels = [`Live-controle ${BASIS}`, ...ok.map((m) => `✔ ${m}`), ...waarschuwing.map((m) => `⚠ ${m}`), ...kritiek.map((m) => `✖ ${m}`),
  kritiek.length ? `✖ ${kritiek.length} kritieke fout(en)` : '✔ Geen kritieke fouten'];
console.log(regels.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Live-controle ${args.includes('--preview') ? '(preview)' : '(productie)'}\n\n${[...ok.map((m) => `- ✔ ${m}`), ...waarschuwing.map((m) => `- ⚠ ${m}`), ...kritiek.slice(0, 60).map((m) => `- ✖ ${m}`)].join('\n')}\n\n`);
}
if (kritiek.length && args.includes('--ci')) process.exitCode = 1;
