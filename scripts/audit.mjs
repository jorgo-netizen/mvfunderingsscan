/**
 * SEO/GEO-controle van de gebouwde site in dist/.
 *
 *   npm run audit     (bouwt eerst, controleert daarna)
 *
 * Controleert per pagina: één H1, kopstructuur, unieke title/description en
 * lengte, canonical, noindex, Open Graph/Twitter, alt + width/height + bestaan
 * van afbeeldingen, interne links en ankers, trailing slashes, geldige JSON-LD,
 * FAQPage-schema == zichtbare FAQ, sitemap == pagina's, robots.txt en
 * inkomende interne links. Exit-code 1 bij problemen (handig voor CI).
 */
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const DOMAIN = JSON.parse(readFileSync(join(ROOT, 'src/content/site.json'), 'utf8')).domain;
const problems = [];

if (!existsSync(DIST)) {
  console.error('dist/ bestaat niet – voer eerst `npm run build` uit.');
  process.exit(1);
}

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
const norm = (s) => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : null;
};

function parse(html) {
  const p = {};
  p.headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => [Number(m[1]), norm(m[2])]);
  p.title = norm((html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1]);
  p.meta = {};
  for (const m of html.matchAll(/<meta\s[^>]*>/g)) {
    const key = attr(m[0], 'name') || attr(m[0], 'property');
    if (key) p.meta[key] = decode(attr(m[0], 'content') || '');
  }
  const canon = html.match(/<link rel="canonical" href="([^"]+)">/);
  p.canonical = canon ? canon[1] : null;
  p.links = [...html.matchAll(/<a\s[^>]*href="([^"]+)"/g)].map((m) => decode(m[1]));
  p.imgs = [...html.matchAll(/<img\s[^>]*>/g)].map((m) => m[0]);
  p.ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  p.jsonld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  p.faqQ = [...html.matchAll(/<details class="faq-item"[^>]*>\s*<summary>([\s\S]*?)<\/summary>/g)].map((m) => norm(m[1]));
  p.faqA = [...html.matchAll(/<div class="faq-body">([\s\S]*?)<\/div>\s*<\/details>/g)].map((m) => norm(m[1]));
  return p;
}

const pages = {};
for (const file of walk(DIST).filter((f) => f.endsWith('.html'))) {
  const rel = '/' + relative(DIST, file).split('\\').join('/');
  const path = rel.endsWith('index.html') ? rel.slice(0, -'index.html'.length) : rel;
  pages[path] = parse(readFileSync(file, 'utf8'));
}

// Persoonlijke/afgeschermde pagina's (noindex, niet in de sitemap) en dynamische routes via vercel.json-rewrites.
const PRIVATE = new Set(['/404.html', '/status/', '/beheer/']);
const DYNAMIC = new Set(['/nieuws/']);

const titles = new Map();
const descs = new Map();
for (const [path, p] of Object.entries(pages).sort()) {
  if (path === '/beheer/') continue; // app-schil voor medewerkers: inhoud komt via JavaScript, getest in scripts/test-backend.mjs
  const tag = `[${path}]`;
  const h1 = p.headings.filter(([l]) => l === 1);
  if (h1.length !== 1) problems.push(`${tag} ${h1.length} H1's`);
  let prev = 1;
  for (const [lvl, txt] of p.headings) {
    if (lvl > prev + 1) problems.push(`${tag} kopsprong h${prev}->h${lvl}: ${txt.slice(0, 50)}`);
    prev = lvl;
  }
  const d = p.meta.description || '';
  if (!PRIVATE.has(path)) {
    titles.set(p.title, [...(titles.get(p.title) || []), path]);
    descs.set(d, [...(descs.get(d) || []), path]);
    if (p.title.length < 30 || p.title.length > 80) problems.push(`${tag} titel ${p.title.length} tekens`);
    if (d.length < 110 || d.length > 165) problems.push(`${tag} description ${d.length} tekens`);
    if (p.canonical !== DOMAIN + path) problems.push(`${tag} canonical ${p.canonical}`);
    if ((p.meta.robots || '').includes('noindex')) problems.push(`${tag} noindex!`);
    if (!p.jsonld.length) problems.push(`${tag} geen JSON-LD`);
  }
  for (const k of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'twitter:card']) {
    if (!p.meta[k]) problems.push(`${tag} mist ${k}`);
  }
  for (const im of p.imgs) {
    const src = attr(im, 'src') || '';
    if (!attr(im, 'alt')) problems.push(`${tag} img zonder alt ${src}`);
    if (!attr(im, 'width') || !attr(im, 'height')) problems.push(`${tag} img zonder width/height ${src}`);
    if (src.startsWith('http')) problems.push(`${tag} externe afbeelding ${src}`);
    else if (!existsSync(join(DIST, src))) problems.push(`${tag} ontbrekende afbeelding ${src}`);
    for (const part of (attr(im, 'srcset') || '').split(',')) {
      const u = part.trim().split(' ')[0];
      if (u && !existsSync(join(DIST, u))) problems.push(`${tag} ontbrekende srcset ${u}`);
    }
  }
  for (const href of p.links) {
    if (/^(tel:|mailto:|https?:)/.test(href)) continue;
    const [base, frag] = href.split('#');
    const target = base === '' ? path : base;
    if (!pages[target] && !DYNAMIC.has(target)) problems.push(`${tag} kapotte link ${href}`);
    else if (frag && !pages[target].ids.has(frag)) problems.push(`${tag} kapot anker ${href}`);
    if (base && !base.endsWith('/') && !base.endsWith('.html')) problems.push(`${tag} link zonder trailing slash ${href}`);
  }
  for (const raw of p.jsonld) {
    let data;
    try { data = JSON.parse(raw); } catch (e) { problems.push(`${tag} JSON-LD ongeldig: ${e.message}`); continue; }
    for (const node of data['@graph'] || []) {
      if (node['@type'] !== 'FAQPage') continue;
      const qs = node.mainEntity.map((q) => q.name);
      const as = node.mainEntity.map((q) => q.acceptedAnswer.text.replace(/\s+/g, ' ').trim());
      if (JSON.stringify(qs) !== JSON.stringify(p.faqQ)) problems.push(`${tag} FAQ-vragen schema != zichtbaar`);
      if (JSON.stringify(as) !== JSON.stringify(p.faqA)) problems.push(`${tag} FAQ-antwoorden schema != zichtbaar`);
    }
  }
}
for (const [t, ps] of titles) if (ps.length > 1) problems.push(`dubbele titel "${t}": ${ps.join(', ')}`);
for (const [d, ps] of descs) if (ps.length > 1) problems.push(`dubbele description: ${ps.join(', ')}`);

// sitemap en robots
const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
const locs = new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].replace(DOMAIN, '')));
const indexable = Object.keys(pages).filter((p) => !PRIVATE.has(p));
const missing = indexable.filter((p) => !locs.has(p));
const extra = [...locs].filter((p) => !pages[p]);
if (missing.length || extra.length) problems.push(`sitemap: mist [${missing}] extra [${extra}]`);
const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
if (/^Disallow:\s*\/\s*$/m.test(robots)) problems.push('robots.txt blokkeert de site');
if (!/User-agent: OAI-SearchBot\r?\nAllow: \//.test(robots)) problems.push('OAI-SearchBot niet expliciet toegestaan');
if (!robots.includes(`Sitemap: ${DOMAIN}/sitemap.xml`)) problems.push('robots.txt verwijst niet naar sitemap');

// inkomende interne links
const inbound = Object.fromEntries(Object.keys(pages).map((p) => [p, 0]));
for (const [path, p] of Object.entries(pages)) {
  for (const href of new Set(p.links)) {
    const base = href.split('#')[0];
    if (base in inbound && base !== path) inbound[base] += 1;
  }
}
for (const [p, n] of Object.entries(inbound)) {
  if (n < 2 && !PRIVATE.has(p)) problems.push(`weinig inkomende links (${n}) naar ${p}`);
}

// ---------------------------------------------------------------- eindoverzicht (AUDIT.md)
const urlMeta = Object.fromEntries(JSON.parse(readFileSync(join(ROOT, 'src', 'content', 'urls.json'), 'utf8')).map((u) => [u.path, u]));
const rows = [];
for (const [path, p] of Object.entries(pages).sort((a, b) => a[0].localeCompare(b[0]))) {
  if (PRIVATE.has(path)) continue;
  const html = readFileSync(join(DIST, path === '/' ? 'index.html' : join(path, 'index.html')), 'utf8');
  const main = (html.match(/<main[\s\S]*?<\/main>/) || [''])[0];
  const words = (norm(main.replace(/<script[\s\S]*?<\/script>/g, '')).match(/\S+/g) || []).length;
  if (/lorem|ipsum|coming soon|hier komt tekst/i.test(main) || /VUL IN|INVULLEN]|placeholder-box|placeholder-inline/.test(html)) problems.push(`[${path}] placeholdertekst gevonden`);
  if (/href="#"/.test(html)) problems.push(`[${path}] lege #-link`);
  if (/javascript:void/i.test(html)) problems.push(`[${path}] javascript:void-link`);
  if (/<a(?![^>]*\shref=)(?:\s[^>]*)?>/.test(html)) problems.push(`[${path}] <a> zonder href`);
  if (/href=""/.test(html)) problems.push(`[${path}] lege href`);
  if (words < 250) problems.push(`[${path}] pagina lijkt leeg (${words} woorden)`);
  const internal = new Set(p.links.filter((h) => h.startsWith('/') && h.split('#')[0] !== path).map((h) => h.split('#')[0])).size;
  const types = new Set();
  for (const raw of p.jsonld) {
    try { for (const n of JSON.parse(raw)['@graph'] || []) types.add(n['@type']); } catch { /* al gemeld */ }
  }
  const indexable = !(p.meta.robots || '').includes('noindex') && p.canonical === DOMAIN + path && locs.has(path);
  const h1 = (p.headings.find(([l]) => l === 1) || [, ''])[1];
  rows.push({ path, title: p.title, h1, keyword: urlMeta[path]?.keyword || '', intent: urlMeta[path]?.intent || '', internal, schema: [...types].join(', '), indexable, words });
}
const cell = (s) => String(s).replace(/\|/g, '\\|');
const report = `# SEO/GEO-audit mvfunderingsscan.nl

Gegenereerd door \`npm run audit\` op ${new Date().toISOString().slice(0, 10)} – ${rows.length} indexeerbare pagina's, ${rows.reduce((a, r) => a + r.words, 0).toLocaleString('nl-NL')} woorden in totaal.

| URL | Title | H1 | Primair zoekwoord | Zoekintentie | Interne links | Schema | Indexeerbaar | Woorden |
|---|---|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.path} | ${cell(r.title)} | ${cell(r.h1)} | ${cell(r.keyword)} | ${r.intent} | ${r.internal} | ${r.schema} | ${r.indexable ? 'ja' : 'NEE'} | ${r.words} |`).join('\n')}
`;
writeFileSync(join(ROOT, 'AUDIT.md'), report, 'utf8');
console.log(`Eindoverzicht geschreven naar AUDIT.md (${rows.length} pagina's, ${rows.reduce((a, r) => a + r.words, 0)} woorden)`);

console.log(`${Object.keys(pages).length} pagina's gecontroleerd`);
if (problems.length) {
  console.log(problems.map((x) => '  ✖ ' + x).join('\n'));
  process.exit(1);
}
console.log('✔ Geen problemen gevonden');
