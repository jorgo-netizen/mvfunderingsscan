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

test('CMS-export: pagina-item verliest geen velden en wordt direct gepubliceerd', async () => {
  const { paginaItem } = await import('./cms-export.mjs');
  for (const p of laad()) {
    const it = paginaItem(p); const f = it.fields;
    assert.equal(it.publish, true); assert.equal(`/${it.slug}/`, p.path); assert.equal(it.seo.title, p.title); assert.ok(it.seo.description);
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

test('CMS fase 2: de geïmporteerde inhoud (alle velden) laat alle pagina\'s byte-voor-byte gelijk', async () => {
  const { paginaItem } = await import('./cms-export.mjs');
  for (const p of laad()) {
    const voor = render(structuredClone(p)); const q = structuredClone(p); const it = paginaItem(p);
    assert.deepEqual(overlay(q, { template: it.template, h1: it.h1, intro: it.intro, seo: it.seo, fields: structuredClone(it.fields) }), [], p.path);
    assert.equal(render(q), voor, p.path);
  }
});

test('CMS fase 2: sectietekst, nieuwe sectie en volgorde; id\'s, widgets en facts blijven', async () => {
  const { paginaItem } = await import('./cms-export.mjs');
  const p = laad().find((x) => x.sections.some((s) => s.widget)); const it = paginaItem(p); const f = structuredClone(it.fields);
  const w = f.sections.findIndex((s) => s.widget);
  f.sections[w].h2 = 'Nieuwe kop'; f.sections[w].widget = 'iets-anders'; f.sections[w].id = 'ander-id';
  f.sections.push({ h2: 'Een nieuwe sectie', answer: 'Kort.', body: '<p>Tekst</p>' });
  f.eyebrow = 'Nieuw label';
  const q = structuredClone(p);
  assert.deepEqual(overlay(q, { template: 'fs.pagina', h1: it.h1, intro: it.intro, seo: it.seo, fields: f }), ['eyebrow', 'sections']);
  const nieuw = q.sections.at(-1);
  assert.equal(nieuw.id, 'een-nieuwe-sectie'); assert.equal(nieuw.h2, 'Een nieuwe sectie');
  assert.deepEqual(q.facts, p.facts);
  // onbekend id = nieuwe sectie zonder widget; het oude id verdwijnt dan uit de pagina
  assert.ok(!q.sections.some((s) => s.widget === 'iets-anders'));
});

test('CMS fase 2: onveilige HTML of links worden niet overgenomen', async () => {
  const { paginaItem } = await import('./cms-export.mjs');
  const p = laad()[0]; const it = paginaItem(p);
  for (const kwaad of ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<a href="javascript:alert(1)">x</a>']) {
    const f = structuredClone(it.fields); f.sections[0].body = kwaad;
    const q = structuredClone(p);
    assert.deepEqual(overlay(q, { template: 'fs.pagina', h1: it.h1, intro: it.intro, seo: it.seo, fields: f }), []);
  }
  const f = structuredClone(it.fields); f.related = [{ href: 'https://evil.example/', label: 'x', text: 'y' }];
  assert.deepEqual(overlay(structuredClone(p), { template: 'fs.pagina', h1: it.h1, intro: it.intro, seo: it.seo, fields: f }), []);
});

test('CMS: markeringen voor de bewerkmodus alleen met _cms, live HTML ongewijzigd', () => {
  const p = laad().find((x) => x.hero_image && x.faqs.length);
  assert.ok(!render(structuredClone(p)).includes('data-cms-field'));
  const q = structuredClone(p); q._cms = true; q.sections.forEach((s, i) => { s._cmsIndex = i; }); q.faqs.forEach((f, i) => { f._cmsIndex = i; });
  const h = render(q);
  for (const v of ['h1', 'intro', 'fields.eyebrow', 'fields.hero', 'fields.sections.0.h2', 'fields.sections.0.body', 'fields.faqs.0.q', 'fields.faqs.0.a']) assert.ok(h.includes(`data-cms-field="${v}"`), v);
});

test('CMS-bewerkmodus: concept met markeringen, bridge en entry; zonder concept de lokale pagina', async () => {
  const { previewHtml } = await import('../api/cms-preview.js');
  const { paginaItem } = await import('./cms-export.mjs');
  const p = laad().find((x) => x.path === '/funderingsonderzoek-leeuwarden/'); const it = paginaItem(p);
  const verzoeken = [];
  const fetchFn = async (url) => {
    verzoeken.push(url);
    if (url.includes('/preview/page') && url.includes(encodeURIComponent(p.path))) return { ok: true, status: 200, json: async () => ({ entryId: 'e1"x', template: 'fs.pagina', h1: 'Concept-kop', intro: it.intro, seo: it.seo, fields: it.fields }) };
    if (url.includes('/preview/page')) return { ok: false, status: 404 };
    if (url.startsWith('https://www.mvfunderingsquickscan.nl/contact/')) return { ok: true, status: 200, text: async () => '<html><body class="x"><main>Contact</main></body></html>' };
    return { ok: false, status: 404 };
  };
  const h = await previewHtml('tok-1234567890', p.path, { fetchFn });
  assert.ok(h.includes('<body data-cms-entry="e1&quot;x">') || /<body[^>]* data-cms-entry="e1&quot;x"/.test(h));
  assert.ok(h.includes('data-cms-field="h1">Concept-kop</h1>'));
  assert.ok(h.includes('data-cms-field="fields.sections.0.h2"') && h.includes('data-cms-field="fields.faqs.0.a"'));
  assert.ok(h.includes('src="https://www.mideavastgoed.app/cms-bridge.js"'));
  assert.ok(verzoeken[0].startsWith('https://www.mideavastgoed.app/api/cms/v1/preview/page?token=tok-1234567890&path=%2Ffunderingsonderzoek-leeuwarden%2F'));
  const zonder = await previewHtml('tok-1234567890', '/prijzen/', { fetchFn });
  assert.ok(!zonder.includes('data-cms-entry') && zonder.includes('cms-bridge.js') && zonder.includes('data-cms-field="h1"'));
  const contact = await previewHtml('tok-1234567890', '/contact/', { fetchFn });
  assert.ok(contact.includes('<main>Contact</main>') && contact.includes('cms-bridge.js'));
  assert.equal(await previewHtml('tok-1234567890', '/bestaat-niet/', { fetchFn }), null);
});

test('CMS-bewerkmodus: headers en invoercontrole', async () => {
  const { default: handler } = await import('../api/cms-preview.js');
  const call = async (url) => { const out = { headers: {} }; await handler({ method: 'GET', url }, { set statusCode(v) { out.status = v; }, setHeader(k, v) { out.headers[k.toLowerCase()] = v; }, end(b) { out.body = b; } }); return out; };
  assert.equal((await call('/api/cms-preview?token=x&path=/')).status, 400);
  assert.equal((await call('/api/cms-preview?token=tok-1234567890&path=/../etc/')).status, 400);
  const orig = globalThis.fetch; globalThis.fetch = async () => ({ ok: false, status: 401 });
  try {
    const r = await call('/api/cms-preview?token=tok-1234567890&path=/prijzen/');
    assert.equal(r.status, 502);
    assert.match(r.headers['content-security-policy'], /frame-ancestors https:\/\/www\.mideavastgoed\.app https:\/\/mideavastgoed\.app/);
    assert.match(r.headers['x-robots-tag'], /noindex/); assert.equal(r.headers['cache-control'], 'no-store'); assert.equal(r.headers['x-frame-options'], undefined);
  } finally { globalThis.fetch = orig; }
});

test('CMS-nieuws: blokken en zelftest terug naar Markdown in de oorspronkelijke volgorde', async () => {
  const { nieuwsItem, cmsNaarPost } = await import('../api/_lib/cms-nieuws.js');
  const { zelftestMarkdown, naarNieuwsMarkdown } = await import('../api/_lib/redactie.js');
  const z = { vragen: [{ vraag: 'Klemmen deuren?', opties: [{ tekst: 'Nee', punten: 0 }, { tekst: 'Ja', punten: 2 }], uitleg: 'Let op.' }], uitslagen: [{ min: 0, max: 2, titel: 'Laag', tekst: 'Weinig signalen.' }], disclaimer: 'Geen advies.' };
  const content = naarNieuwsMarkdown({ type: 'zelftest', inhoud: 'Inleiding met [link](/prijzen/).', zelftest: z, interne_links: [{ url: '/fase-0-funderingsonderzoek/', tekst: 'Fase 0' }], bronnen: [{ titel: 'Bron', url: 'https://example.org' }] });
  const post = { title: 'T', slug: 't', excerpt: 'E', content, published_at: '2026-11-01T10:00:00Z', featured_image: 'a/b.jpg', featured_image_alt: 'Alt' };
  const it = nieuwsItem(post);
  const terug = cmsNaarPost({ ...it, fields: { ...it.fields, afbeelding: { name: 'a/b.jpg', alt: 'Alt' } }, publishedAt: it.publishedAt });
  const vorm = (x) => x.replace(/Kies bij elke vraag[^\n]*/, '').replace(/\n+/g, '\n'); // witregels maken voor de weergave niet uit
  assert.equal(vorm(terug.content), vorm(content));
  assert.equal(terug.featured_image, 'a/b.jpg'); assert.equal(terug.slug, 't');
  assert.ok(zelftestMarkdown(z));
});
