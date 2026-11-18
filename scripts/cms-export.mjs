/**
 * Exporteert de site naar het importformaat van het centrale CMS (Website beheren → "Inhoud importeren (JSON)"):
 * tmp/cms-import-funderingsscan.json.
 * - 144 pagina's: type page, sjabloon fs.pagina, als concept (publish:false). De velden title/description/h1/intro/
 *   hero.alt/faqs zijn precies de waarden die de site ongewijzigd laten (zie test-cms.mjs).
 * - Gepubliceerde nieuwsberichten uit Supabase (alleen als SUPABASE_URL en SUPABASE_SERVICE_KEY gezet zijn):
 *   type news, sjabloon fs.nieuws, publish:true met de oorspronkelijke datum en dezelfde slug.
 * Gebruik: node scripts/cms-export.mjs
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { naarCms } from './cms.mjs';
import { getDb } from '../api/_lib/db.js';
import { nieuwsItem } from '../api/_lib/cms-nieuws.js';
export { nieuwsItem, mdNaarBlokken } from '../api/_lib/cms-nieuws.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'src', 'content', 'pages');
const pages = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort().flatMap((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));

const VELDEN = ['path', 'title', 'description', 'h1', 'lead', 'hero_image', 'faqs', 'eyebrow', 'crumbs', 'facts', 'services', 'sections', 'related', 'cta', 'article', 'defined_term', 'tools'];
export function paginaItem(p) {
  const d = naarCms(p);
  const meta = Object.fromEntries(Object.entries(p).filter(([k]) => !VELDEN.includes(k))); // nav_active, keyword, intent, scripts, bron_*
  const los = Object.fromEntries(['related', 'cta', 'article', 'defined_term', 'tools'].filter((k) => k in p).map((k) => [k, p[k]]));
  return {
    type: 'page', template: 'fs.pagina', slug: d.slug, rootPath: false, title: d.title, h1: d.h1, intro: d.intro, answer: '',
    seo: { title: d.seo.title, description: d.seo.description },
    blocks: [],
    fields: {
      eyebrow: p.eyebrow ?? '', hero: p.hero_image ? { mediaId: null, name: p.hero_image.name, alt: p.hero_image.alt } : null,
      crumbs: p.crumbs || [], facts: p.facts || [], services: p.services || [], sections: p.sections || [], faqs: d.faqs, ...los, meta,
    },
    publish: false,
  };
}

async function nieuws() {
  const db = getDb();
  if (!db || !process.env.SUPABASE_URL) { console.log('ℹ Nieuws overgeslagen: SUPABASE_URL en SUPABASE_SERVICE_KEY zijn niet gezet.'); return []; }
  const lijst = await db.newsList({ status: 'gepubliceerd' });
  return Promise.all(lijst.map(async (x) => nieuwsItem(await db.newsBySlug(x.slug))));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const items = [...pages.map(paginaItem), ...await nieuws()];
  mkdirSync(join(ROOT, 'tmp'), { recursive: true });
  writeFileSync(join(ROOT, 'tmp', 'cms-import-funderingsscan.json'), JSON.stringify(items, null, 1) + '\n');
  console.log(`✔ ${items.filter((i) => i.type === 'page').length} pagina's en ${items.filter((i) => i.type === 'news').length} nieuwsbericht(en) naar tmp/cms-import-funderingsscan.json`);
}
