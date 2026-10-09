/**
 * Rekentests voor de vier interactieve meetdemo's (lintvoeg, loodmeting/Oldehove, vloerveld, scheuren).
 * Zonder dependencies: `npm test` (node:test). Controleert de voorbeelddata, de formules en de HTML-haken
 * waar public/script.js op rekent. Browsergedrag zelf wordt hier niet getest.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_DATA, widgetHtml } from '../src/lib/widgets.mjs';

const { LV, VV, OL_DEG, OL_HEIGHT_M, olOffset, CRACKS, PATRONEN, SIM_NOTE } = DEMO_DATA;
const mm = (cm) => Math.round(cm * 10);
const count = (html, re) => (html.match(re) || []).length;

test('lintvoeg: voorbeeldwaarden A–F en hoogteverschil', () => {
  assert.deepEqual(LV.map(([l]) => l), ['A', 'B', 'C', 'D', 'E', 'F']);
  const h = LV.map(([, v]) => v);
  assert.equal(mm(Math.max(...h) - Math.min(...h)), 23, 'hoogteverschil tussen hoogste en laagste punt is 23 mm');
  // relatief t.o.v. punt A (referentiepunt van de referentielijn)
  assert.deepEqual(h.map((v) => mm(v - h[0])), [0, -3, -7, -15, -19, -23]);
  // grootste stap tussen opeenvolgende punten: C → D, 8 mm
  const steps = h.slice(1).map((v, i) => mm(h[i] - v));
  assert.equal(Math.max(...steps), 8);
  assert.equal(steps.indexOf(8), 2);
});

test('lintvoeg: HTML bevat zes bedienbare meetpunten met de juiste waarden', () => {
  const html = widgetHtml('lintvoeg');
  assert.equal(count(html, /<button type="button" class="sim-point"/g), 6);
  for (const [l, v] of LV) assert.ok(html.includes(`data-h="${v}" data-label="${l}"`), `punt ${l}`);
  assert.ok(html.includes('t.o.v. punt A'), 'tabel toont verschil t.o.v. referentiepunt');
  assert.ok(html.includes(SIM_NOTE));
});

test('loodmeting gevel: afwijking = hoogte × tan(hoek)', () => {
  const H = 6; // m, voorbeeldgevel in de demo
  const hoek = (afwijkingMm) => (Math.atan(afwijkingMm / (H * 1000)) * 180) / Math.PI;
  assert.equal(Math.round(hoek(30) * 100) / 100, 0.29);
  assert.equal(30 / H, 5, '30 mm over 6 m = 5 mm/m');
  // terugrekenen: H × tan(hoek) geeft de afwijking weer terug
  assert.ok(Math.abs(H * 1000 * Math.tan((hoek(18) * Math.PI) / 180) - 18) < 1e-9);
  const html = widgetHtml('lood');
  assert.ok(html.includes('data-gevel="6"') && html.includes('data-lood-extra'));
  assert.ok(html.includes('geen normwaarden'));
});

test('Oldehove: 4,2° over 39 m geeft circa 2,86 m afwijking', () => {
  assert.equal(OL_DEG, 4.2);
  assert.equal(OL_HEIGHT_M, 39);
  assert.equal(Math.round(olOffset(39) * 100) / 100, 2.86);
  assert.equal(Math.round(olOffset(10) * 100) / 100, 0.73);
  for (const h of [1, 10, 20, 39]) {
    const deg = (Math.atan(olOffset(h) / h) * 180) / Math.PI;
    assert.ok(Math.abs(deg - 4.2) < 1e-9, `hoek blijft 4,2° op ${h} m`);
  }
});

test('vloerveld: raster 5 × 5 en hoogteverschil 7 mm', () => {
  assert.equal(VV.length, 5);
  assert.ok(VV.every((r) => r.length === 5));
  const all = VV.flat();
  assert.equal(mm(Math.max(...all) - Math.min(...all)), 7);
  assert.equal(all[0], Math.max(...all), 'A1 is het hoogste punt');
  assert.equal(all[24], Math.min(...all), 'E5 is het laagste punt');
  // geen enkel punt ligt hoger dan het vorige in dezelfde rij of kolom (geleidelijk aflopend)
  for (let r = 0; r < 5; r++) for (let c = 1; c < 5; c++) assert.ok(VV[r][c] <= VV[r][c - 1]);
  for (let c = 0; c < 5; c++) for (let r = 1; r < 5; r++) assert.ok(VV[r][c] <= VV[r - 1][c]);
  const html = widgetHtml('vloerveld');
  assert.equal(count(html, /class="vv-cell"/g), 25);
  assert.equal(count(html, /data-vv-row="/g), 5);
});

test('scheuren: acht klikbare scheuren met eigen uitleg en vijf patronen', () => {
  assert.equal(CRACKS.length, 8);
  const html = widgetHtml('scheuren');
  for (const [id] of CRACKS) {
    assert.ok(html.includes(`data-crack="${id}" role="button" tabindex="0"`), `scheur ${id} is bedienbaar`);
    assert.ok(html.includes(`data-crack-panel="${id}"`), `uitleg voor ${id}`);
  }
  assert.equal(PATRONEN.length, 5);
  assert.equal(count(html, /class="tab-panel"/g), 5);
  assert.ok(/niet automatisch/.test(html), 'vermeldt dat een scheur niet automatisch een funderingsprobleem is');
  // geen diagnose-taal
  assert.ok(!/(bewijst|zeker weten|altijd funderingsschade)/i.test(html));
});
