/** Tests voor de CMS-koppeling (scripts/cms.mjs), zonder echte verzoeken. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { naarCms, overlay, laadCms } from './cms.mjs';
import { render } from '../src/lib/template.mjs';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'pages');
const laad = () => readdirSync(DIR).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));
/** Zoals de API het teruggeeft als het CMS precies de huidige inhoud bevat. */
const alsApi = (d) => ({ template: 'fs.pagina', h1: d.h1, intro: d.intro, seo: { title: d.seo.title, description: d.seo.description }, blocks: [], fields: { hero: d.heroAlt ? { name: 'x', alt: d.heroAlt } : null, faqs: d.faqs } });

test('CMS: ongewijzigde inhoud laat alle pagina\'s byte-voor-byte gelijk', () => {
  for (const p of laad()) {
    const voor = render(structuredClone(p)); const q = structuredClone(p);
    assert.deepEqual(overlay(q, alsApi(naarCms(p))), [], p.path);
    assert.equal(render(q), voor, p.path);
  }
});

test('CMS: gewijzigde velden worden veilig overgenomen, de rest blijft', () => {
  const p = laad().find((x) => x.path === '/funderingsonderzoek-leeuwarden/'); const d = naarCms(p);
  d.h1 = 'Nieuwe <script>kop</script>'; d.intro = 'Lees [meer](/prijzen/) **nu**'; d.seo.description = 'Nieuwe omschrijving';
  d.faqs = [d.faqs[0], { q: 'Nieuwe vraag?', a: '- punt een\n- punt twee' }];
  const q = structuredClone(p);
  assert.deepEqual(overlay(q, alsApi(d)), ['description', 'h1', 'lead', 'faqs']);
  assert.equal(q.h1, 'Nieuwe &lt;script&gt;kop&lt;/script&gt;');
  assert.equal(q.lead, 'Lees <a href="/prijzen/">meer</a> <strong>nu</strong>');
  assert.deepEqual(q.faqs[0], p.faqs[0]); // ongewijzigde vraag houdt haar eigen HTML
  assert.equal(q.faqs[1].a, '<ul><li>punt een</li><li>punt twee</li></ul>');
  assert.equal(q.title, p.title); assert.deepEqual(q.sections, p.sections); assert.deepEqual(q.facts, p.facts);
});

test('CMS: standaard-description van de website overschrijft nooit een eigen description', () => {
  const p = laad()[0]; const d = naarCms(p); d.seo.description = 'Standaard';
  assert.deepEqual(overlay(structuredClone(p), alsApi(d), { defaultDescription: 'Standaard' }), []);
});

test('CMS: zonder sleutel of bij een storing blijft de lokale inhoud staan', async () => {
  const pages = laad(); const voor = JSON.stringify(pages);
  assert.equal(await laadCms(pages, { env: {}, fetchFn: () => assert.fail('geen verzoek zonder sleutel') }), 0);
  assert.equal(await laadCms(pages, { env: { CMS_API_KEY: 'x' }, quiet: true, fetchFn: async () => { throw new Error('offline'); } }), 0);
  assert.equal(await laadCms(pages, { env: { CMS_API_KEY: 'x' }, quiet: true, fetchFn: async () => ({ ok: false, status: 500 }) }), 0);
  assert.equal(JSON.stringify(pages), voor);
});

test('CMS: alleen bestaande pagina\'s worden aangepast, met de sleutel in de header', async () => {
  const pages = laad(); const p = pages.find((x) => x.path === '/prijzen/') || pages[0]; const d = naarCms(p); d.h1 = 'Andere kop';
  const headers = [];
  const fetchFn = async (url, opt) => {
    headers.push(opt.headers.Authorization);
    const pad = url.split('/funderingsscan')[1];
    const body = pad === '/site' ? {} : pad.startsWith('/content?') ? { items: [{ slug: d.slug }, { slug: 'bestaat-niet' }] } : alsApi(d);
    return { ok: true, json: async () => body };
  };
  assert.equal(await laadCms(pages, { env: { CMS_API_KEY: 'geheim' }, fetchFn, quiet: true }), 1);
  assert.equal(p.h1, 'Andere kop');
  assert.ok(headers.every((h) => h === 'Bearer geheim'));
});

test('CMS: zonder sjabloon komt de FAQ uit het eerste faq-blok', () => {
  const p = laad()[0]; const d = naarCms(p); const q = structuredClone(p);
  assert.deepEqual(overlay(q, { h1: d.h1, intro: d.intro, seo: d.seo, blocks: [{ type: 'faq', items: [{ q: 'Vraag?', a: 'Antwoord.' }] }] }), ['faqs']);
  assert.deepEqual(q.faqs, [{ q: 'Vraag?', a: '<p>Antwoord.</p>' }]);
});

test('CMS-export: pagina-item verliest geen velden en komt als concept binnen', async () => {
  const { paginaItem } = await import('./cms-export.mjs');
  for (const p of laad()) {
    const it = paginaItem(p); const f = it.fields;
    assert.equal(it.publish, false); assert.equal(`/${it.slug}/`, p.path); assert.equal(it.seo.title, p.title); assert.ok(it.seo.description);
    for (const k of Object.keys(p)) assert.ok(['path', 'title', 'description', 'h1', 'lead', 'hero_image', 'faqs'].includes(k) || k in f || k in f.meta, `${p.path}: ${k}`);
    assert.deepEqual(f.sections, p.sections); assert.deepEqual(f.facts, p.facts || []);
  }
});

test('CMS-export: nieuws met zelftest wordt blokken plus zelftestveld', async () => {
  const { nieuwsItem, mdNaarBlokken } = await import('./cms-export.mjs');
  const { zelftestMarkdown } = await import('../api/_lib/redactie.js');
  const z = { vragen: [{ vraag: 'Klemmen deuren?', opties: [{ tekst: 'Nee', punten: 0 }, { tekst: 'Ja', punten: 2 }], uitleg: 'Let op.' }], uitslagen: [{ min: 0, max: 2, titel: 'Laag', tekst: 'Weinig signalen.' }], disclaimer: 'Geen advies.' };
  const it = nieuwsItem({ title: 'T', slug: 't', excerpt: 'E', content: `Inleiding met [link](/prijzen/).\n\n${zelftestMarkdown(z)}\n\n## Bronnen\n\n- [Bron](https://example.org)`, published_at: '2026-11-01T10:00:00Z' });
  assert.equal(it.fields.zelftest.vragen[0].opties[1].punten, 2);
  assert.equal(it.fields.zelftest.uitslagen[0].max, 2);
  assert.deepEqual(it.blocks, [{ type: 'paragraph', text: 'Inleiding met [link](/prijzen/).' }, { type: 'heading', level: 2, text: 'Bronnen' }, { type: 'list', ordered: false, items: ['[Bron](https://example.org)'] }]);
  assert.equal(it.publish, true); assert.equal(it.publishedAt, '2026-11-01T10:00:00Z');
  assert.deepEqual(mdNaarBlokken('### Kop\nTekst'), [{ type: 'heading', level: 3, text: 'Kop' }, { type: 'paragraph', text: 'Tekst' }]);
});
