/**
 * SEO/GEO-regressiecontrole: vergelijkt de gebouwde site (dist/) met de vastgelegde nulmeting (seo/nulmeting.json).
 *
 *   node scripts/seo-regressie.mjs              controleren (na npm run build)
 *   node scripts/seo-regressie.mjs --ci         idem; exitcode 1 bij een KRITIEKE fout (gebruikt in de Vercel-build)
 *   node scripts/seo-regressie.mjs --nulmeting  de huidige stand vastleggen als nieuwe nulmeting (bewust, na een gewenste wijziging)
 *
 * Kritiek (blokkeert): verdwenen URL zonder redirect, verkeerde canonical, onbedoelde noindex, ontbrekende title/description/H1,
 *   ongeldige JSON-LD, ontbrekende bedrijfsgegevens in JSON-LD, kapotte interne link of afbeelding, sitemap- of robotsfout,
 *   verdwenen redirect, zoek- of AI-crawler geblokkeerd.
 * Waarschuwing (blokkeert niet): gewijzigde title/description/H1, structured-data-type verdwenen, gewijzigde og:image.
 * Info: nieuwe URL's, inhoudelijk gewijzigde pagina's.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOMEIN, signalen, vingerafdruk, leesDist, sitemapUrls, indexeerbaar } from './seo/pagina.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const NULMETING = join(ROOT, 'seo', 'nulmeting.json');
const args = process.argv.slice(2);
const CRAWLERS = ['*', 'Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot'];

if (!existsSync(join(DIST, 'sitemap.xml'))) { console.error('dist/ ontbreekt – voer eerst `npm run build` uit.'); process.exit(1); }
const paginas = leesDist(DIST);
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
const sitemap = sitemapUrls(readFileSync(join(DIST, 'sitemap.xml'), 'utf8'));

function stand() {
  const urls = {};
  for (const p of Object.keys(paginas).sort()) {
    const s = signalen(paginas[p]);
    urls[p] = { canonical: s.canonical, robots: s.robots, title: s.title, description: s.description, h1: s.h1, jsonld: s.jsonldTypes, ogImage: s.og.image, hash: vingerafdruk(paginas[p]) };
  }
  return {
    gemaakt: new Date().toISOString(),
    urls,
    sitemap: [...sitemap].sort(),
    redirects: (vercel.redirects || []).map((r) => ({ source: r.source, destination: r.destination, has: r.has || null })),
    robots: robots.split('\n').filter((r) => /^(User-agent|Disallow|Allow|Sitemap):/i.test(r)),
  };
}

if (args.includes('--nulmeting')) {
  mkdirSync(dirname(NULMETING), { recursive: true });
  const s = stand();
  writeFileSync(NULMETING, JSON.stringify(s, null, 1) + '\n');
  console.log(`✔ Nulmeting vastgelegd: ${Object.keys(s.urls).length} pagina's, ${s.sitemap.length} URL's in de sitemap, ${s.redirects.length} redirects → seo/nulmeting.json`);
  process.exit(0);
}

const kritiek = []; const waarschuwing = []; const info = [];
const K = (m) => kritiek.push(m); const W = (m) => waarschuwing.push(m); const I = (m) => info.push(m);
const nul = existsSync(NULMETING) ? JSON.parse(readFileSync(NULMETING, 'utf8')) : null;
if (!nul) W('Geen nulmeting gevonden (seo/nulmeting.json): alleen de controles zonder vergelijking zijn uitgevoerd.');
const nu = stand();
const redirectBronnen = new Set((vercel.redirects || []).filter((r) => !r.has).map((r) => r.source.replace(/:path\*$/, '')));
const indexPaden = indexeerbaar(paginas);
const isIndexeerbaar = (p) => indexPaden.includes(p);

// ---------------------------------------------------------------- per pagina (alleen indexeerbare en bewust noindex-pagina's)
for (const [p, h] of Object.entries(paginas)) {
  const s = signalen(h);
  const noindex = /noindex/i.test(s.robots);
  if (s.jsonFouten.length) K(`${p}: ongeldige JSON-LD (${s.jsonFouten[0]})`);
  if (noindex) continue; // 404, beheer en status: bewust noindex
  if (!s.title) K(`${p}: title ontbreekt`);
  if (!s.description) K(`${p}: meta description ontbreekt`);
  if (s.h1.length !== 1) K(`${p}: ${s.h1.length} H1-elementen (verwacht 1)`);
  if (s.canonical !== DOMEIN + p) K(`${p}: canonical is "${s.canonical}" (verwacht ${DOMEIN + p})`);
  for (const t of ['ProfessionalService', 'WebSite']) if (!s.jsonldTypes.includes(t)) K(`${p}: ${t} ontbreekt in de structured data`);
  // interne links en afbeeldingen
  const main = (h.match(/<body[\s\S]*<\/body>/) || [''])[0];
  for (const m of main.matchAll(/href="(\/[^"#?]*)/g)) {
    const doel = m[1];
    if (/\.(pdf|xml|txt|webmanifest|png|jpe?g|webp|svg|ico|css|js)$/i.test(doel) || /^\/(api|nieuws|beheer|status|teamfoto|_vercel)\//.test(doel) || doel === '/nieuws/') continue;
    if (!paginas[doel] && !redirectBronnen.has(doel)) K(`${p}: interne link naar ${doel} bestaat niet`);
  }
  for (const m of main.matchAll(/(?:src|srcset)="([^"]+)"/g)) {
    for (const deel of m[1].split(',')) {
      const src = deel.trim().split(/\s+/)[0];
      if (src.startsWith('/') && !src.startsWith('//') && !src.startsWith('/_vercel/') && !existsSync(join(DIST, src.split('?')[0]))) K(`${p}: afbeelding of bestand ${src} ontbreekt`);
    }
  }
}

// ---------------------------------------------------------------- sitemap
const sitemapPaden = sitemap.map((u) => u.replace(DOMEIN, ''));
if (new Set(sitemap).size !== sitemap.length) K('sitemap.xml bevat dubbele URL\'s');
for (const u of sitemap) {
  const p = u.replace(DOMEIN, '');
  if (!u.startsWith(DOMEIN + '/')) K(`sitemap.xml bevat een URL van een ander domein: ${u}`);
  else if (!paginas[p]) K(`sitemap.xml bevat ${p}, maar die pagina bestaat niet`);
  else if (!isIndexeerbaar(p)) K(`sitemap.xml bevat ${p}, maar die is noindex of heeft een andere canonical`);
}
for (const p of indexPaden) if (!sitemapPaden.includes(p)) K(`${p} is indexeerbaar maar staat niet in sitemap.xml`);
const lastmods = [...readFileSync(join(DIST, 'sitemap.xml'), 'utf8').matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
if (lastmods.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d) || d > new Date().toISOString().slice(0, 10))) K('sitemap.xml bevat een ongeldige of toekomstige lastmod');

// ---------------------------------------------------------------- robots.txt
const blokken = robots.split(/\n(?=User-agent:)/i);
for (const crawler of CRAWLERS) {
  const blok = blokken.find((b) => new RegExp(`^User-agent:\\s*${crawler.replace('*', '\\*')}\\s*$`, 'im').test(b)) || blokken.find((b) => /^User-agent:\s*\*\s*$/im.test(b));
  if (blok && /^Disallow:\s*\/\s*$/im.test(blok)) K(`robots.txt blokkeert de hele site voor ${crawler}`);
}
for (const p of indexPaden) {
  for (const regel of robots.matchAll(/^Disallow:\s*(\S+)/gim)) if (regel[1] !== '/' && p.startsWith(regel[1])) K(`robots.txt blokkeert de indexeerbare pagina ${p} (${regel[1]})`);
}
for (const sm of ['sitemap.xml', 'nieuws-sitemap.xml']) if (!robots.includes(`Sitemap: ${DOMEIN}/${sm}`)) K(`robots.txt verwijst niet naar ${sm}`);

// ---------------------------------------------------------------- vergelijking met de nulmeting
if (nul) {
  for (const [p, oud] of Object.entries(nul.urls)) {
    const nieuw = nu.urls[p];
    if (!nieuw) { if (!redirectBronnen.has(p)) K(`${p} bestond in de nulmeting maar is verdwenen, zonder redirect`); else I(`${p} is vervangen door een redirect`); continue; }
    if (!/noindex/i.test(oud.robots) && /noindex/i.test(nieuw.robots)) K(`${p} is nu noindex (was indexeerbaar)`);
    if (oud.canonical !== nieuw.canonical) K(`${p}: canonical gewijzigd van ${oud.canonical} naar ${nieuw.canonical}`);
    if (oud.title !== nieuw.title) W(`${p}: title gewijzigd ("${oud.title}" → "${nieuw.title}")`);
    if (oud.description !== nieuw.description) W(`${p}: meta description gewijzigd`);
    if (JSON.stringify(oud.h1) !== JSON.stringify(nieuw.h1)) W(`${p}: H1 gewijzigd ("${oud.h1[0] || ''}" → "${nieuw.h1[0] || ''}")`);
    for (const t of oud.jsonld) if (!nieuw.jsonld.includes(t)) W(`${p}: structured-data-type ${t} is verdwenen`);
    if (oud.ogImage !== nieuw.ogImage) I(`${p}: og:image gewijzigd`);
    if (oud.hash !== nieuw.hash) I(`${p}: inhoud gewijzigd`);
  }
  for (const p of Object.keys(nu.urls)) if (!nul.urls[p]) I(`${p}: nieuwe pagina`);
  for (const r of nul.redirects) if (!nu.redirects.some((x) => x.source === r.source && x.destination === r.destination)) K(`redirect ${r.source} → ${r.destination} is verdwenen of gewijzigd`);
  for (const p of nul.sitemap) if (!nu.sitemap.includes(p) && !redirectBronnen.has(p.replace(DOMEIN, ''))) K(`${p} stond in de sitemap van de nulmeting en ontbreekt nu`);
}

// ---------------------------------------------------------------- rapport
const regels = [
  `SEO/GEO-regressiecontrole – ${Object.keys(paginas).length} pagina's, ${sitemap.length} URL's in sitemap.xml`,
  ...kritiek.map((m) => `✖ KRITIEK  ${m}`), ...waarschuwing.map((m) => `⚠ waarschuwing  ${m}`),
  ...(args.includes('--uitgebreid') ? info.map((m) => `ℹ ${m}`) : info.length ? [`ℹ ${info.length} informatieve meldingen (nieuwe of inhoudelijk gewijzigde pagina's); zie --uitgebreid`] : []),
  kritiek.length ? `✖ ${kritiek.length} kritieke fout(en)` : `✔ Geen kritieke fouten (${waarschuwing.length} waarschuwingen)`,
];
console.log(regels.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### SEO/GEO-regressiecontrole\n\n| Kritiek | Waarschuwingen | Info |\n|---|---|---|\n| ${kritiek.length} | ${waarschuwing.length} | ${info.length} |\n\n${[...kritiek.map((m) => `- ✖ ${m}`), ...waarschuwing.map((m) => `- ⚠ ${m}`)].slice(0, 60).join('\n')}\n`);
}
if (kritiek.length && args.includes('--ci')) process.exit(1);
