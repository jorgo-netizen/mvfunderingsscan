/**
 * Interne links naar vakbegrippen automatisch aanvullen.
 *
 *   npm run autolink            (wijzigt src/content/pages/*.json)
 *   npm run autolink -- --dry   (toont alleen wat er zou veranderen)
 *
 * Regels:
 * - alleen de EERSTE vermelding van een begrip per pagina, alleen in lopende tekst (<p>, <li>, <dd>, <td>)
 * - niet in koppen, niet binnen bestaande links, niet in <strong>/<dfn>/<summary>
 * - niet als de pagina al naar die bestemming linkt, en nooit naar de pagina zelf
 * - maximaal MAX_PER_PAGE nieuwe links per pagina
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'src', 'content', 'pages');
const DRY = process.argv.includes('--dry');
const MAX_PER_PAGE = 5;
const urls = new Set(JSON.parse(readFileSync(join(ROOT, 'src', 'content', 'urls.json'), 'utf8')).map((u) => u.path));

// Volgorde = prioriteit (langere/specifiekere termen eerst).
const TERMS = [
  ['lintvoegwaterpassing', '/kennisbank/lintvoegwaterpassing/'],
  ['vloerveldwaterpassing', '/kennisbank/vloerveldwaterpassing/'],
  ['loodmeting', '/kennisbank/loodmeting/'],
  ['scheurpatronen', '/kennisbank/scheurpatronen/'],
  ['scheurpatroon', '/kennisbank/scheurpatronen/'],
  ['archiefonderzoek', '/kennisbank/archiefonderzoek-fundering/'],
  ['visuele inspectie', '/kennisbank/visuele-funderingsinspectie/'],
  ['risico-inschatting', '/kennisbank/funderingsrisico-inschatting/'],
  ['ongelijke zetting', '/kennisbank/ongelijke-zetting/'],
  ['paalrot', '/kennisbank/paalrot/'],
  ['fundering op staal', '/kennisbank/fundering-op-staal/'],
  ['houten palen', '/kennisbank/houten-paalfundering/'],
  ['bodemdaling', '/kennisbank/bodemdaling/'],
  ['zetting', '/kennisbank/zetting/'],
].filter(([, href]) => urls.has(href));

const TEXT_TAGS = new Set(['p', 'li', 'dd', 'td']);
const BLOCK_TAGS = new Set(['a', 'h1', 'h2', 'h3', 'h4', 'strong', 'dfn', 'summary', 'th', 'dt', 'em']);

function linkFirst(html, term, href) {
  // Tokeniseer in tags en tekst; houd bij of we in toegestane tekst zitten.
  const re = new RegExp(`(?<![\\p{L}-])(${term})(?![\\p{L}-])`, 'iu');
  const parts = html.split(/(<[^>]+>)/);
  const stack = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith('<')) {
      const m = part.match(/^<\/?([a-z0-9]+)/i);
      if (!m) continue;
      const tag = m[1].toLowerCase();
      if (part.startsWith('</')) { const idx = stack.lastIndexOf(tag); if (idx >= 0) stack.splice(idx); }
      else if (!part.endsWith('/>') && !['br', 'img', 'input', 'hr'].includes(tag)) stack.push(tag);
      continue;
    }
    const inText = stack.some((t) => TEXT_TAGS.has(t));
    const blocked = stack.some((t) => BLOCK_TAGS.has(t));
    if (!inText || blocked) continue;
    const m = part.match(re);
    if (!m) continue;
    parts[i] = part.slice(0, m.index) + `<a href="${href}">${m[1]}</a>` + part.slice(m.index + m[1].length);
    return parts.join('');
  }
  return null;
}

let total = 0;
for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const path = join(DIR, file);
  const pages = JSON.parse(readFileSync(path, 'utf8'));
  let changed = false;
  for (const p of pages) {
    const allHtml = () => [p.lead, ...p.sections.flatMap((s) => [s.answer, s.body]), ...(p.faqs || []).map((f) => f.a)].join(' ');
    let added = 0;
    for (const [term, href] of TERMS) {
      if (added >= MAX_PER_PAGE) break;
      if (href === p.path || allHtml().includes(`href="${href}"`)) continue;
      // eerst in sectie-bodies, dan in antwoorden
      for (const s of p.sections) {
        const res = linkFirst(s.body || '', term, href);
        if (res) { s.body = res; added++; total++; changed = true; if (DRY) console.log(`${p.path}: "${term}" → ${href}`); break; }
      }
    }
  }
  if (changed && !DRY) writeFileSync(path, JSON.stringify(pages, null, 2) + '\n', 'utf8');
}
console.log(`${DRY ? '(proef) ' : ''}${total} interne links toegevoegd`);
