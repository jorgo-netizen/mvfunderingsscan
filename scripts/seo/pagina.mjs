/**
 * Gedeelde hulpfuncties voor de SEO-automatisering (regressiecontrole, IndexNow, live-controle).
 * Alleen lezen: deze module verandert niets aan de site.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export const DOMEIN = 'https://www.mvfunderingsquickscan.nl';
export const HOST = 'www.mvfunderingsquickscan.nl';

const ent = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const tekst = (h) => ent(String(h || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Leest de belangrijkste SEO-signalen uit één HTML-pagina. */
export function signalen(html) {
  const meta = (naam) => ent((html.match(new RegExp(`<meta name="${naam}" content="([^"]*)"`)) || [])[1] || '');
  const prop = (naam) => ent((html.match(new RegExp(`<meta property="${naam}" content="([^"]*)"`)) || [])[1] || '');
  const jsonld = []; const jsonFouten = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { jsonld.push(JSON.parse(m[1])); } catch (e) { jsonFouten.push(String(e.message).slice(0, 120)); }
  }
  const types = new Set();
  const loop = (o) => { if (Array.isArray(o)) o.forEach(loop); else if (o && typeof o === 'object') { if (o['@type']) [].concat(o['@type']).forEach((t) => types.add(t)); Object.values(o).forEach(loop); } };
  jsonld.forEach(loop);
  return {
    title: tekst((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1]),
    description: meta('description'),
    robots: meta('robots'),
    canonical: (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || '',
    h1: [...html.matchAll(/<h1[\s>][\s\S]*?<\/h1>/g)].map((m) => tekst(m[0])),
    og: { type: prop('og:type'), url: prop('og:url'), image: prop('og:image'), title: prop('og:title') },
    jsonldTypes: [...types].sort(),
    jsonFouten,
  };
}

/**
 * Vingerafdruk van wat voor zoekmachines inhoudelijk telt: <main>, title, description, canonical, robots.
 * Menu, footer, bestandsversies (?v=…) en datums tellen niet mee, zodat alleen echte wijzigingen een nieuwe melding geven.
 */
export function vingerafdruk(html) {
  const s = signalen(html);
  const main = (html.match(/<main[\s\S]*<\/main>/) || [''])[0]
    .replace(/<time[^>]*>[^<]*<\/time>/g, '').replace(/\?v=[\w-]+/g, '').replace(/"date(Modified|Published)": "[^"]*"/g, '');
  return createHash('sha256').update([main, s.title, s.description, s.canonical, s.robots].join('\u0000')).digest('hex').slice(0, 20);
}

/** Alle HTML-pagina's in een dist-map als { '/pad/': html }. */
export function leesDist(dist) {
  const uit = {};
  const loop = (map) => {
    for (const f of readdirSync(map)) {
      const p = join(map, f);
      if (statSync(p).isDirectory()) loop(p);
      else if (f === 'index.html') {
        const rel = p.slice(dist.length).replace(/\\/g, '/').replace(/index\.html$/, '');
        uit[rel || '/'] = readFileSync(p, 'utf8');
      }
    }
  };
  if (existsSync(dist)) loop(dist);
  return uit;
}

/** URL's uit een sitemap (absolute URL's). */
export const sitemapUrls = (xml) => [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

/** Paden die in de sitemap horen: indexeerbaar en met canonical naar zichzelf. */
export function indexeerbaar(paden) {
  return Object.entries(paden).filter(([p, h]) => {
    const s = signalen(h);
    return !/noindex/i.test(s.robots) && s.canonical === DOMEIN + p;
  }).map(([p]) => p).sort();
}
