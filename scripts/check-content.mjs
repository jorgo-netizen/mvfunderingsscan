/**
 * Valideert content-bestanden in src/content/pages/ tegen CONTENT-GUIDE.md.
 *
 *   node scripts/check-content.mjs                 (alle bestanden)
 *   node scripts/check-content.mjs <bestand.json>  (één bestand + uniekheid t.o.v. de rest)
 *
 * FOUT = moet opgelost; WAARSCHUWING = bij voorkeur oplossen.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WIDGET_NAMES } from '../src/lib/widgets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES_DIR = join(ROOT, 'src', 'content', 'pages');
const urls = JSON.parse(readFileSync(join(ROOT, 'src', 'content', 'urls.json'), 'utf8'));
const urlMap = new Map(urls.map((u) => [u.path, u]));
const IMAGES = ['funderingsinspectie-woning-gevel', 'jaren-dertig-woningen-straat', 'vooroorlogse-woning-voordeur', 'metselwerk-gevel-detail'];
const SERVICES = ['funderingsscan', 'fase0', 'fase1'];
const NAV = ['/funderingsscan/', '/funderingsonderzoek-woning/', '/funderingsproblemen/', '/werkgebied/', '/kennisbank/', '/werkwijze/', '/contact/'];
const EXTERNAL_OK = ['https://www.kcaf.nl/', 'https://www.nrvt.nl/', 'https://www.schadedoormijnbouw.nl/', 'https://www.nhg.nl/', 'https://www.rijksoverheid.nl/', 'https://veenweidefryslan.frl/', 'https://www.veenweidefryslan.frl/', 'https://lokaleregelgeving.overheid.nl/', 'https://historischcentrumleeuwarden.nl/', 'https://www.autoriteitpersoonsgegevens.nl/'];
const ALLOWED_EURO = new Set(['350', '950']); // fase 0 vanaf €350, fase 1 vanaf €950 (oktober 2026)
const FORBIDDEN = [/lorem/i, /ipsum/i, /coming soon/i, /hier komt/i, /\bTODO\b/, /binnenkort beschikbaar/i,
  /\b100\s?%/, /nummer\s?1\b/i, /fundexa/i, /recensie/i, /\bwe garanderen\b/i];

const target = process.argv[2] ? resolve(process.argv[2]) : null;
const files = readdirSync(PAGES_DIR).filter((f) => f.endsWith('.json')).map((f) => join(PAGES_DIR, f));
const errors = [];
const warns = [];
const all = [];

for (const file of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    if (!target || resolve(file) === target) errors.push(`${basename(file)}: ongeldige JSON – ${e.message}`);
    continue;
  }
  if (!Array.isArray(data)) { errors.push(`${basename(file)}: moet een JSON-array zijn`); continue; }
  for (const p of data) all.push({ ...p, __file: file });
}

const strip = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
const words = (h) => (strip(h).match(/\S+/g) || []).length;

function checkPage(p) {
  const tag = `[${p.path}]`;
  const E = (m) => errors.push(`${tag} ${m}`);
  const W = (m) => warns.push(`${tag} ${m}`);
  const u = urlMap.get(p.path);
  if (!u) return E('pad staat niet in urls.json');
  for (const k of ['title', 'description', 'keyword', 'intent', 'nav_active', 'crumbs', 'eyebrow', 'h1', 'lead', 'sections', 'faqs', 'related']) {
    if (p[k] === undefined || p[k] === '' || (Array.isArray(p[k]) && !p[k].length)) E(`veld ontbreekt: ${k}`);
  }
  if (p.title && (p.title.length < 40 || p.title.length > 68)) E(`title ${p.title.length} tekens (40–68)`);
  if (p.description && (p.description.length < 120 || p.description.length > 158)) E(`description ${p.description.length} tekens (120–158)`);
  if (p.nav_active && !NAV.includes(p.nav_active)) E(`nav_active ongeldig: ${p.nav_active}`);
  if (p.hero_image && !IMAGES.includes(p.hero_image.name)) E(`hero_image onbekend: ${p.hero_image.name}`);
  if (p.hero_image && !p.hero_image.alt) E('hero_image zonder alt');
  for (const s of p.services || []) if (!SERVICES.includes(s)) E(`service onbekend: ${s}`);
  if (p.defined_term) {
    const d = p.defined_term;
    if (!d.name || !d.description) E('defined_term vereist name en description');
    else if (words(d.description) < 12 || words(d.description) > 50) E(`defined_term.description ${words(d.description)} woorden (12–50)`);
  }
  if (p.path.startsWith('/kennisbank/') && !p.article) E('kennisbankartikel mist "article": true');
  if (!p.path.startsWith('/kennisbank/') && p.article) E('"article" alleen op kennisbankartikelen');
  if (Array.isArray(p.crumbs)) {
    if (p.crumbs[0]?.href !== '/') E('crumbs moeten met Home (/) beginnen');
    if (p.crumbs.at(-1)?.href !== p.path) E('laatste crumb moet de pagina zelf zijn');
    for (const c of p.crumbs) if (!urlMap.has(c.href)) E(`crumb naar onbekend pad ${c.href}`);
  }
  const ids = new Set();
  for (const s of p.sections || []) {
    if (!s.id || !/^[a-z0-9-]+$/.test(s.id)) E(`sectie zonder geldige id: ${s.h2}`);
    if (ids.has(s.id)) E(`dubbele sectie-id ${s.id}`);
    ids.add(s.id);
    if (/<[^>]+>/.test(s.h2 || '')) E(`HTML in h2: ${s.h2}`);
    if (!s.answer) W(`sectie zonder answer: ${s.h2}`);
    if (s.widget && !WIDGET_NAMES.includes(s.widget)) E(`onbekende widget: ${s.widget}`);
  }
  const qs = new Set();
  for (const f of p.faqs || []) {
    if (qs.has(f.q)) E(`dubbele FAQ-vraag: ${f.q}`);
    qs.add(f.q);
    if (!/^<p>/.test(f.a || '')) E(`FAQ-antwoord moet met <p> beginnen: ${f.q}`);
  }
  if ((p.faqs || []).length < 3) W('minder dan 3 FAQ\'s');
  if ((p.related || []).length !== 3) W(`related heeft ${(p.related || []).length} items (verwacht 3)`);

  // alle HTML samen
  const html = [p.lead, ...(p.sections || []).flatMap((s) => [s.answer, s.body]),
    ...(p.faqs || []).map((f) => f.a), ...(p.facts || []).map((f) => f.value)].join('\n');
  const text = [p.title, p.description, p.h1, p.eyebrow, ...(p.sections || []).map((s) => s.h2),
    ...(p.faqs || []).map((f) => f.q), ...(p.related || []).flatMap((r) => [r.label, r.text]), html].join('\n');
  for (const re of FORBIDDEN) if (re.test(strip(text))) E(`verboden/risicovolle tekst gevonden: ${re}`);
  for (const m of strip(text).matchAll(/€\s?(\d{1,3}(?:\.\d{3})*)/g)) if (!ALLOWED_EURO.has(m[1])) E(`niet-toegestaan bedrag €${m[1]}`);

  const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]).concat((p.related || []).map((r) => r.href));
  let internal = 0;
  for (const h of hrefs) {
    if (h === '' || h.startsWith('#')) { E(`lege of #-link: "${h}"`); continue; }
    if (/^(tel:\+31582037172|mailto:info@mideavastgoed\.nl)/.test(h)) continue;
    if (/^https?:/.test(h)) { if (!EXTERNAL_OK.some((x) => h.startsWith(x))) E(`externe link niet toegestaan: ${h}`); continue; }
    const base = h.split('#')[0];
    if (!urlMap.has(base)) E(`interne link naar onbekend pad: ${h}`);
    else if (base === p.path) E(`link naar zichzelf: ${h}`);
    else internal++;
  }
  const inText = [...html.matchAll(/href="(\/[^"]*)"/g)].length;
  if (inText < 4) W(`slechts ${inText} interne links in de tekst (minimaal 4)`);
  if ((html.match(/<a\s/g) || []).length !== (html.match(/<\/a>/g) || []).length) E('ongelijk aantal <a> en </a>');
  for (const tagName of ['div', 'ul', 'ol', 'table', 'section', 'p']) {
    const open = (html.match(new RegExp(`<${tagName}[\\s>]`, 'g')) || []).length;
    const close = (html.match(new RegExp(`</${tagName}>`, 'g')) || []).length;
    if (open !== close) E(`ongebalanceerde <${tagName}>: ${open} open, ${close} dicht`);
  }

  const n = words(html) + words((p.sections || []).map((s) => s.h2).join(' ')) + words((p.faqs || []).map((f) => f.q).join(' '));
  p.__words = n;
  if (u.minWords && n < u.minWords * 0.9) W(`te kort: ${n} woorden (doel ≥ ${u.minWords})`);
}

const selected = target ? all.filter((p) => resolve(p.__file) === target) : all;
for (const p of selected) checkPage(p);

// uniekheid over alle bestanden
const dupe = (key) => {
  const seen = new Map();
  for (const p of all) {
    const v = p[key];
    if (!v) continue;
    if (seen.has(v) && (!target || [resolve(p.__file), resolve(seen.get(v).__file)].includes(target))) {
      errors.push(`dubbele ${key} tussen ${seen.get(v).path} en ${p.path}: "${v}"`);
    }
    seen.set(v, p);
  }
};
dupe('path'); dupe('title'); dupe('description'); dupe('h1');

console.log(`${selected.length} pagina's gecontroleerd${target ? ` in ${basename(target)}` : ''}`);
for (const p of selected) console.log(`  ${String(p.__words ?? '?').padStart(5)} woorden  ${p.path}`);
if (warns.length) console.log('\nWAARSCHUWINGEN:\n' + warns.map((w) => '  ! ' + w).join('\n'));
if (errors.length) {
  console.log('\nFOUTEN:\n' + errors.map((e) => '  ✖ ' + e).join('\n'));
  process.exit(1);
}
console.log('\n✔ Geen fouten');
if (!target) {
  const missing = urls.filter((u) => u.file !== '(handgebouwd)' && !all.some((p) => p.path === u.path));
  if (missing.length) console.log(`\nNog niet geschreven (${missing.length}): ${missing.map((m) => m.path).join(', ')}`);
}
