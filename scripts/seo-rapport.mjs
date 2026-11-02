/**
 * Maakt SEO-PAGINAS.md: per indexeerbare URL de SEO-titel, meta description, H1, hoofdzoekwoord,
 * zoekintentie, secundaire onderwerpen (de tussenkoppen), wijzigingsdatum en aantal inkomende interne links.
 *
 *   npm run build && node scripts/seo-rapport.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const urls = JSON.parse(readFileSync(join(ROOT, 'src/content/urls.json'), 'utf8'));
const lastmod = existsSync(join(ROOT, 'src/content/lastmod.json')) ? JSON.parse(readFileSync(join(ROOT, 'src/content/lastmod.json'), 'utf8')) : {};
const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
const paden = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);

const ent = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const tekst = (h) => ent(h.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const cel = (s) => String(s || '–').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const INTENTIE = { informatief: 'informatief', 'lokaal-commercieel': 'lokaal commercieel', commercieel: 'commercieel', transactioneel: 'transactioneel' };

const html = Object.fromEntries(paden.map((p) => [p, readFileSync(join(DIST, p, 'index.html'), 'utf8')]));
const inkomend = Object.fromEntries(paden.map((p) => [p, 0]));
for (const [p, h] of Object.entries(html)) {
  const main = (h.match(/<main[\s\S]*<\/main>/) || [''])[0];
  for (const doel of new Set([...main.matchAll(/href="(\/[^"#?]*)/g)].map((m) => m[1]))) if (doel !== p && doel in inkomend) inkomend[doel]++;
}

const rijen = paden.map((p) => {
  const h = html[p]; const u = urls.find((x) => x.path === p) || {};
  const titel = tekst((h.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
  const desc = ent((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const h1 = tekst((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '');
  const h2 = [...h.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => tekst(m[1])).filter((x) => x && !/^(Veelgestelde vragen|Meer weten|Handig om te weten|Gerelateerd)/i.test(x)).slice(0, 3);
  return { p, titel, desc, h1, kw: u.keyword || (p === '/' ? 'funderingsonderzoek' : ''), groep: u.group || 'overig', intentie: INTENTIE[u.intent] || u.intent || (p === '/' ? 'commercieel' : ''), h2, datum: lastmod[p]?.datum || '', inkomend: inkomend[p] };
});

const groepen = [...new Set(rijen.map((r) => r.groep))];
let md = `# SEO per pagina – mvfunderingsquickscan.nl

Gegenereerd uit de gebouwde site (\`node scripts/seo-rapport.mjs\`), ${new Date().toISOString().slice(0, 10)}. ${rijen.length} indexeerbare pagina's (alle URL's uit sitemap.xml).

- **SEO-titel en meta description:** zoals ze nu in de HTML staan. Elke titel en description is uniek (gecontroleerd met \`npm run audit\`).
- **Hoofdzoekwoord:** één per pagina, zonder dubbelingen (zie SEO-WIJZIGINGEN.md voor de vier opgeloste overlappen).
- **Secundaire onderwerpen:** de eerste tussenkoppen (H2) van de pagina. Dat zijn de deelvragen die de pagina beantwoordt.
- **Zoekvolumes:** hebben we niet (geen toegang tot Search Console of een zoekwoordtool). De keuzes zijn gebaseerd op zoekintentie, niet op cijfers.
- **Inkomend:** het aantal andere pagina's dat in de tekst naar deze pagina linkt (menu en footer niet meegeteld).

`;
for (const g of groepen) {
  const lijst = rijen.filter((r) => r.groep === g);
  md += `## ${g.charAt(0).toUpperCase() + g.slice(1)} (${lijst.length})\n\n| URL | SEO-titel | Meta description | H1 | Hoofdzoekwoord | Intentie | Secundaire onderwerpen | Bijgewerkt | Inkomend |\n|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of lijst) md += `| ${cel(r.p)} | ${cel(r.titel)} | ${cel(r.desc)} | ${cel(r.h1)} | ${cel(r.kw)} | ${cel(r.intentie)} | ${cel(r.h2.join(' · '))} | ${cel(r.datum)} | ${r.inkomend} |\n`;
  md += '\n';
}
writeFileSync(join(ROOT, 'SEO-PAGINAS.md'), md);
const dubbel = Object.entries(rijen.reduce((a, r) => ((a[r.kw] = (a[r.kw] || 0) + 1), a), {})).filter(([k, n]) => k && n > 1);
console.log(`✔ SEO-PAGINAS.md: ${rijen.length} pagina's${dubbel.length ? ` – LET OP dubbele hoofdzoekwoorden: ${dubbel.map(([k]) => k).join(', ')}` : ', geen dubbele hoofdzoekwoorden'}`);
const weinig = rijen.filter((r) => r.inkomend < 2 && r.p !== '/');
if (weinig.length) console.log(`ℹ ${weinig.length} pagina's met minder dan 2 inkomende links in de tekst: ${weinig.map((r) => r.p).join(', ')}`);
