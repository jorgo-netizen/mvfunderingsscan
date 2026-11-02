/**
 * Tests voor de SEO-automatisering: IndexNow (zonder echte verzoeken) en de hulpfuncties van de regressiecontrole.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schoneUrls, meldIndexNow, isSleutel } from '../api/_lib/indexnow.js';
import { signalen, vingerafdruk, indexeerbaar, sitemapUrls, DOMEIN } from './seo/pagina.mjs';

const KEY = 'testsleutel1234';
const pagina = ({ pad = '/', robots = 'index, follow', canonical = DOMEIN + pad, main = '<p>Tekst</p>', datum = '2026-01-01' } = {}) =>
  `<html><head><title>Titel</title><meta name="description" content="Omschrijving"><meta name="robots" content="${robots}">` +
  `<link rel="canonical" href="${canonical}"><script type="application/ld+json">{"@type":"WebPage","dateModified": "${datum}"}</script></head>` +
  `<body><main><h1>Kop</h1><time datetime="${datum}">${datum}</time>${main}<img src="/a.webp?v=${datum}"></main></body></html>`;

test('IndexNow: alleen https-URL\'s van het productiedomein, ontdubbeld', () => {
  assert.deepEqual(schoneUrls([
    'https://www.mvfunderingsquickscan.nl/prijzen/', 'https://www.mvfunderingsquickscan.nl/prijzen/',
    'http://www.mvfunderingsquickscan.nl/', 'https://mvfunderingsquickscan.nl/', 'https://example.com/',
    'https://www.mvfunderingsquickscan.nl/?utm=1', 'geen url',
  ]), ['https://www.mvfunderingsquickscan.nl/prijzen/']);
});

test('IndexNow: sleutelcontrole', () => {
  assert.equal(isSleutel(KEY), true);
  assert.equal(isSleutel('kort'), false);
  assert.equal(isSleutel('met spatie erin'), false);
  assert.equal(isSleutel(undefined), false);
});

test('IndexNow: verstuurt host, sleutel, keyLocation en URL\'s; 200/202 is gemeld', async () => {
  const verzoeken = [];
  const fetchImpl = async (url, opt) => { verzoeken.push({ url, body: JSON.parse(opt.body) }); return { status: 202 }; };
  const r = await meldIndexNow(['https://www.mvfunderingsquickscan.nl/'], { key: KEY, fetchImpl });
  assert.equal(r.gemeld, 1); assert.equal(r.fout, null);
  assert.equal(verzoeken[0].url, 'https://api.indexnow.org/indexnow');
  assert.deepEqual(verzoeken[0].body, { host: 'www.mvfunderingsquickscan.nl', key: KEY, keyLocation: `https://www.mvfunderingsquickscan.nl/${KEY}.txt`, urlList: ['https://www.mvfunderingsquickscan.nl/'] });
});

test('IndexNow: zonder sleutel of URL\'s geen verzoek; fouten worden teruggegeven, niet gegooid', async () => {
  let aantal = 0; const tel = async () => { aantal++; return { status: 200 }; };
  assert.equal((await meldIndexNow(['https://www.mvfunderingsquickscan.nl/'], { key: '', fetchImpl: tel })).gemeld, 0);
  assert.equal((await meldIndexNow([], { key: KEY, fetchImpl: tel })).gemeld, 0);
  assert.equal(aantal, 0);
  const r = await meldIndexNow(['https://www.mvfunderingsquickscan.nl/'], { key: KEY, fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal(r.gemeld, 0); assert.match(r.fout, /netwerkfout/);
});

test('IndexNow: batches van 500 en stoppen bij 429', async () => {
  const urls = Array.from({ length: 1200 }, (_, i) => `https://www.mvfunderingsquickscan.nl/p${i}/`);
  let aantal = 0;
  const r = await meldIndexNow(urls, { key: KEY, fetchImpl: async () => ({ status: ++aantal === 1 ? 200 : 429 }) });
  assert.equal(aantal, 2); assert.equal(r.gemeld, 500); assert.match(r.fout, /te veel/);
});

test('Vingerafdruk negeert datums en bestandsversies, maar ziet inhoud, title en robots', () => {
  const basis = vingerafdruk(pagina());
  assert.equal(vingerafdruk(pagina({ datum: '2026-05-05' })), basis);
  assert.notEqual(vingerafdruk(pagina({ main: '<p>Andere tekst</p>' })), basis);
  assert.notEqual(vingerafdruk(pagina({ robots: 'noindex' })), basis);
});

test('Signalen en indexeerbare pagina\'s', () => {
  const s = signalen(pagina());
  assert.equal(s.title, 'Titel'); assert.deepEqual(s.h1, ['Kop']); assert.equal(s.canonical, DOMEIN + '/');
  assert.deepEqual(s.jsonldTypes, ['WebPage']); assert.deepEqual(s.jsonFouten, []);
  assert.equal(signalen('<script type="application/ld+json">{kapot</script>').jsonFouten.length, 1);
  assert.deepEqual(indexeerbaar({
    '/': pagina(), '/a/': pagina({ pad: '/a/', robots: 'noindex' }), '/b/': pagina({ pad: '/b/', canonical: DOMEIN + '/' }),
  }), ['/']);
  assert.deepEqual(sitemapUrls('<url><loc> https://x/a/ </loc></url><url><loc>https://x/b/</loc></url>'), ['https://x/a/', 'https://x/b/']);
});
