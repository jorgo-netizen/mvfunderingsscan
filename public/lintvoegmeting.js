/* MV Funderingsscan – uitgebreide lintvoegwaterpassing (alleen geladen op de lintvoegpagina).
   Rekenregels staan in LV.calc (ook gebruikt door scripts/test-demos.mjs); de rest is weergave.
   Alle waarden zijn relatieve hoogtes in mm ten opzichte van referentiepunt A (= 0 mm). */
(function (root) {
  'use strict';
  const DEMO = [0, -3, -7, -5, 2];
  const LABELS = ['A', 'B', 'C', 'D', 'E'];
  const MIN = -50; const MAX = 50;

  const TEXT = {
    vlak: 'De punten liggen binnen enkele millimeters van elkaar. In deze voorbeeldwaarden is nauwelijks een verloop te zien.',
    aflopend: 'De voeg loopt in deze voorbeeldwaarden van links naar rechts geleidelijk af.',
    oplopend: 'De voeg loopt in deze voorbeeldwaarden van links naar rechts geleidelijk op.',
    kom: 'Het middendeel ligt in deze voorbeeldwaarden lager dan de uiteinden: de voeg vormt een flauwe kom.',
    bolling: 'Het middendeel ligt in deze voorbeeldwaarden hoger dan de uiteinden: de voeg vormt een flauwe bolling.',
    onregelmatig: 'De voeg gaat in deze voorbeeldwaarden afwisselend op en neer; er is geen eenduidig verloop.',
  };

  const calc = {
    DEMO, LABELS, MIN, MAX, TEXT,
    /** Grootste minus kleinste waarde (mm). */
    range(v) { return Math.max(...v) - Math.min(...v); },
    /** Verschil tussen opeenvolgende punten, positief = volgend punt ligt hoger. */
    steps(v) { return v.slice(1).map((x, i) => x - v[i]); },
    /** Beschrijving van het patroon – een beschrijving van de getallen, geen oordeel over de oorzaak. */
    pattern(v) {
      const r = calc.range(v);
      const st = calc.steps(v);
      const iMin = v.indexOf(Math.min(...v)); const iMax = v.indexOf(Math.max(...v)); const last = v.length - 1;
      if (r <= 2) return 'vlak';
      if (st.every((s) => s <= 0)) return 'aflopend';
      if (st.every((s) => s >= 0)) return 'oplopend';
      // kom: eerst (niet-stijgend) omlaag naar het laagste punt, daarna (niet-dalend) weer omhoog; bolling omgekeerd
      const down = (a, b) => st.slice(a, b).every((x) => x <= 0); const up = (a, b) => st.slice(a, b).every((x) => x >= 0);
      if (iMin > 0 && iMin < last && down(0, iMin) && up(iMin)) return 'kom';
      if (iMax > 0 && iMax < last && up(0, iMax) && down(iMax)) return 'bolling';
      return 'onregelmatig';
    },
    /** Grootste stap tussen twee buurpunten: [index van, index naar, verschil in mm]. */
    biggestStep(v) {
      const st = calc.steps(v);
      let k = 0; st.forEach((s, i) => { if (Math.abs(s) > Math.abs(st[k])) k = i; });
      return [k, k + 1, st[k]];
    },
    /** Waarde uit een invoerveld: geheel getal binnen het bereik, anders null. */
    parse(text) {
      const t = String(text).trim(); if (t === '') return null;
      const n = Number(t.replace(',', '.').replace('−', '-'));
      if (!Number.isFinite(n) || n < MIN || n > MAX) return null;
      return Math.round(n);
    },
    /** Volledige patroonuitleg zoals die in de demo staat. */
    describe(v) {
      const [a, b, d] = calc.biggestStep(v);
      return `${TEXT[calc.pattern(v)]} De grootste stap tussen twee buurpunten zit tussen ${LABELS[a]} en ${LABELS[b]} (${Math.abs(d)} mm). Dit beschrijft alleen de getallen; het is geen conclusie over de oorzaak of over de fundering.`;
    },
    signed(n) { return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0'; },
  };
  root.MVFSLintvoeg = calc;
  if (typeof module === 'object' && module.exports) module.exports = calc;
  if (typeof document === 'undefined') return;

  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text != null) e.textContent = text; return e; };

  function init(sim) {
    const $ = (s) => sim.querySelector(s); const $$ = (s) => Array.from(sim.querySelectorAll(s));
    const points = $$('.sim-point');
    const inputs = $$('[data-lvm-input]');
    const joint = $('[data-lvm-joint]');
    const profile = $('[data-lvm-profile]');
    const info = $('[data-lvm-info]');
    const err = $('[data-lvm-error]');
    const X = points.map((p) => parseFloat(p.dataset.x));
    const BASE = parseFloat(sim.dataset.base); const SCALE = parseFloat(sim.dataset.scale);
    let values = DEMO.slice(); let active = 0;
    const yOf = (mm) => Math.min(340, Math.max(70, BASE - mm * SCALE)); // tekening begrenzen bij extreme invoer

    const drawFacade = () => {
      joint.setAttribute('d', `M40,${yOf(values[0]).toFixed(1)} ` + X.map((x, i) => `L${x},${yOf(values[i]).toFixed(1)}`).join(' ') + ` L760,${yOf(values.at(-1)).toFixed(1)}`);
      points.forEach((p, i) => { p.style.top = `${(yOf(values[i]) / 380 * 100).toFixed(2)}%`; });
    };
    const drawProfile = () => {
      const narrow = profile.clientWidth > 0 && profile.clientWidth < 520;
      const W = narrow ? 420 : 800; const Hh = narrow ? 300 : 250;
      const L = narrow ? 52 : 70; const R = W - 20; const T = 34; const B = Hh - 40;
      profile.setAttribute('viewBox', `0 0 ${W} ${Hh}`); profile.classList.toggle('is-narrow', narrow);
      const lim = Math.max(5, ...values.map(Math.abs)) + 2;
      const xOf = (i) => L + 30 + i * ((R - L - 60) / (values.length - 1));
      const yP = (mm) => T + ((lim - mm) / (2 * lim)) * (B - T);
      profile.innerHTML = '';
      profile.appendChild(el('line', { x1: L, y1: yP(0), x2: R, y2: yP(0), class: 'sim-profile-ref' }));
      profile.appendChild(el('text', { x: L - 8, y: yP(0) + 4, 'text-anchor': 'end', class: 'sim-tick' }, '0 mm'));
      profile.appendChild(el('text', { x: L - 8, y: T + 4, 'text-anchor': 'end', class: 'sim-tick' }, `+${lim}`));
      profile.appendChild(el('text', { x: L - 8, y: B + 4, 'text-anchor': 'end', class: 'sim-tick' }, `−${lim}`));
      profile.appendChild(el('line', { x1: L, y1: T, x2: L, y2: B, class: 'sim-axis' }));
      profile.appendChild(el('polyline', { points: values.map((v, i) => `${xOf(i)},${yP(v)}`).join(' '), class: 'sim-profile-line' }));
      values.forEach((v, i) => {
        profile.appendChild(el('circle', { cx: xOf(i), cy: yP(v), r: i === active ? 9 : 7, class: i === 0 ? 'sim-dot lvm-ref-dot' : 'sim-dot' }));
        profile.appendChild(el('text', { x: xOf(i), y: yP(v) - 14, 'text-anchor': 'middle', class: 'sim-dot-label' }, `${calc.signed(v)} mm`));
        profile.appendChild(el('text', { x: xOf(i), y: B + 28, 'text-anchor': 'middle', class: 'sim-tick' }, LABELS[i]));
      });
      profile.setAttribute('aria-label', `Profiel van de lintvoeg: ${values.map((v, i) => `${LABELS[i]} ${calc.signed(v)} mm`).join(', ')}`);
    };
    const showInfo = () => {
      const v = values[active]; const l = LABELS[active];
      let t;
      if (active === 0) t = `<strong>Meetpunt A – referentiepunt (0 mm)</strong><p>Alle andere hoogtes worden met dit punt vergeleken. Een andere keuze van het referentiepunt verandert de getallen, maar niet de onderlinge verschillen.</p>`;
      else {
        const d = v - values[active - 1];
        const rel = v === 0 ? 'ligt even hoog als punt A' : `ligt ${Math.abs(v)} mm ${v > 0 ? 'hoger' : 'lager'} dan punt A`;
        const nb = d === 0 ? `even hoog als punt ${LABELS[active - 1]}` : `${Math.abs(d)} mm ${d > 0 ? 'hoger' : 'lager'} dan punt ${LABELS[active - 1]}`;
        t = `<strong>Meetpunt ${l} – ${calc.signed(v)} mm (voorbeeldwaarde)</strong><p>De lintvoeg ${rel} en ${nb}. Dat is een hoogteverschil, geen helling en geen absolute hoogte. Of het verschil bij de bouw is ontstaan of later, en wat de oorzaak is, blijkt niet uit deze waarde alleen.</p>`;
      }
      info.innerHTML = t;
      points.forEach((p, i) => { p.classList.toggle('is-selected', i === active); p.setAttribute('aria-pressed', String(i === active)); });
    };
    const summary = () => {
      const max = Math.max(...values); const min = Math.min(...values);
      $('[data-lvm-max]').textContent = `Punt ${LABELS[values.indexOf(max)]} · ${calc.signed(max)} mm`;
      $('[data-lvm-min]').textContent = `Punt ${LABELS[values.indexOf(min)]} · ${calc.signed(min)} mm`;
      $('[data-lvm-range]').textContent = `${calc.range(values)} mm`;
      $('[data-lvm-pattern]').textContent = calc.describe(values);
    };
    const update = () => { drawFacade(); drawProfile(); showInfo(); summary(); };

    points.forEach((p, i) => p.addEventListener('click', () => { active = i; showInfo(); drawProfile(); }));
    inputs.forEach((inp) => inp.addEventListener('input', () => {
      const i = Number(inp.dataset.i); const n = calc.parse(inp.value);
      if (n === null) { inp.setAttribute('aria-invalid', 'true'); err.hidden = false; return; }
      inp.removeAttribute('aria-invalid');
      if (!inputs.some((x) => x.getAttribute('aria-invalid'))) err.hidden = true;
      values[i] = n; active = i; update();
    }));
    $('[data-lvm-reset]').addEventListener('click', () => {
      values = DEMO.slice(); active = 0;
      inputs.forEach((inp) => { inp.value = String(values[Number(inp.dataset.i)]); inp.removeAttribute('aria-invalid'); });
      err.hidden = true; update();
    });
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawProfile, 150); });
    sim.classList.add('is-ready');
    update();
  }

  function initSteps(box) {
    const steps = Array.from(box.querySelectorAll('[data-lvs-step]'));
    const prev = box.querySelector('[data-lvs-prev]'); const next = box.querySelector('[data-lvs-next]');
    const count = box.querySelector('[data-lvs-count]'); const dots = Array.from(box.querySelectorAll('[data-lvs-dot]'));
    let i = 0;
    const show = (focus) => {
      steps.forEach((s, k) => { s.hidden = k !== i; });
      dots.forEach((d, k) => { d.setAttribute('aria-current', k === i ? 'step' : 'false'); });
      prev.disabled = i === 0; next.disabled = i === steps.length - 1;
      count.textContent = `Stap ${i + 1} van ${steps.length}`;
      if (focus) steps[i].focus({ preventScroll: true });
    };
    prev.addEventListener('click', () => { if (i > 0) { i--; show(true); } });
    next.addEventListener('click', () => { if (i < steps.length - 1) { i++; show(true); } });
    dots.forEach((d, k) => d.addEventListener('click', () => { i = k; show(true); }));
    box.classList.add('is-ready');
    show(false);
  }

  const start = () => {
    document.querySelectorAll('[data-sim="lintvoegmeting"]').forEach(init);
    document.querySelectorAll('[data-lvs]').forEach(initSteps);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
