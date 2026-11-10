/* MV Funderingsscan – interactieve hulpmiddelen (alleen geladen op pagina's met tools).
   Geen diagnoses: resultaten zijn indicaties. Antwoorden verlaten de browser alleen als de bezoeker
   zelf het formulier verstuurt. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nl = (n, d = 1) => Number(n).toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
  const summaries = {}; // tool → tekstuele samenvatting voor het leadformulier

  // Analytics: alleen als er al een dataLayer is (geen eigen tracking, geen cookies).
  const track = (event, data = {}) => {
    try {
      if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event, ...data });
      document.dispatchEvent(new CustomEvent('mvfs:event', { detail: { event, ...data } }));
    } catch { /* nooit de tool laten falen op tracking */ }
  };
  const focusEl = (el) => { el.focus({ preventScroll: true }); el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); };
  const radioVal = (form, name) => { const r = $(`input[name="${name}"]:checked`, form); return r ? r.value : null; };
  const radioLabel = (form, name) => { const r = $(`input[name="${name}"]:checked`, form); return r ? r.parentElement.textContent.trim() : '–'; };

  /* ------------------------------------------------------------------ Gratis Funderingscheck */
  $$('[data-tool="funderingscheck"]').forEach((tool) => {
    const form = $('[data-tq]', tool);
    const steps = $$('.tq-step', form);
    const prev = $('[data-tq-prev]', form);
    const next = $('[data-tq-next]', form);
    const done = $('[data-tq-done]', form);
    const err = $('.tq-error', form);
    const bar = $('.tq-progress span', form);
    const count = $('.tq-count', form);
    const result = $('[data-tq-result]', tool);
    let i = 0; let started = false;

    const show = () => {
      steps.forEach((s, k) => { s.hidden = k !== i; });
      prev.hidden = i === 0;
      next.hidden = i === steps.length - 1;
      done.hidden = i !== steps.length - 1;
      bar.style.width = `${Math.round((i / steps.length) * 100)}%`;
      count.textContent = `Vraag ${i + 1} van ${steps.length}`;
      err.hidden = true;
    };
    const answered = () => {
      const radios = $$('input[type="radio"]', steps[i]);
      return !radios.length || radios.some((r) => r.checked);
    };
    const groeiStep = steps.findIndex((s) => $('input[name="groei"]', s));
    const go = (d) => {
      if (d > 0 && !answered()) { err.hidden = false; $('input', steps[i])?.focus(); return; }
      if (!started) { started = true; track('funderingscheck_started'); }
      i = Math.max(0, Math.min(steps.length - 1, i + d));
      // Geen scheuren: de vraag of scheuren groter worden is niet van toepassing en wordt overgeslagen.
      if (i === groeiStep && radioVal(form, 'scheuren') === 'nee') {
        $('input[name="groei"][value="nvt"]', form).checked = true;
        i = Math.max(0, Math.min(steps.length - 1, i + d));
      }
      show();
      const first = $('input:checked, input, textarea', steps[i]);
      if (first) first.focus({ preventScroll: true });
    };
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    // Automatisch door na een keuze (behalve op de laatste stap), zodat het snel invult.
    form.addEventListener('change', (e) => {
      if (e.target.type === 'radio' && i < steps.length - 1) setTimeout(() => go(1), reduceMotion ? 0 : 180);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      for (let k = 0; k < steps.length; k++) {
        const radios = $$('input[type="radio"]', steps[k]);
        if (radios.length && !radios.some((r) => r.checked)) { i = k; show(); err.hidden = false; return; }
      }
      const a = Object.fromEntries(['bouwjaar', 'provincie', 'scheuren', 'groei', 'klemmen', 'vloer', 'fundering', 'klasse', 'onderzoek', 'situatie'].map((n) => [n, radioVal(form, n)]));
      // Signalen (zichtbare verschijnselen) en omstandigheden (context) – nooit een diagnose.
      const signalen = []; const factoren = [];
      if (a.scheuren === 'binnen' || a.scheuren === 'buiten') signalen.push(`Scheuren (${a.scheuren})`);
      if (a.scheuren === 'beide') signalen.push('Scheuren binnen én buiten');
      const tegenstrijdig = a.scheuren === 'nee' && a.groei === 'ja';
      if (a.groei === 'ja' && !tegenstrijdig) signalen.push('Scheuren worden groter of zijn recent ontstaan');
      if (a.klemmen === 'ja') signalen.push('Klemmende deuren of ramen');
      if (a.vloer === 'ja') signalen.push('Hoogteverschillen of een scheve vloer');
      if (['voor1900', '1900-1930', '1930-1970'].includes(a.bouwjaar)) factoren.push('Bouwjaar van vóór circa 1970: in die periode zijn houten palen en funderingen op staal gebruikelijk');
      if (a.fundering === 'houtenpalen') factoren.push('Houten funderingspalen: de grondwaterstand speelt dan een rol');
      if (a.klasse === 'de') factoren.push('KCAF-risicoklasse D of E');
      if (a.onderzoek === 'aandacht') factoren.push('Eerder onderzoek met aandachtspunten of een vastgesteld probleem');
      let S = signalen.length + (a.scheuren === 'beide' ? 1 : 0);
      const F = factoren.length;
      const unknown = Object.values(a).filter((v) => v === 'onbekend').length;
      let cat = 'weinig';
      if (a.klasse === 'de' || a.onderzoek === 'aandacht' || S >= 4) cat = 'sterk';
      else if (S >= 2) cat = 'meerdere';
      else if (S === 1 || F >= 2) cat = 'enkele';
      // Veel onbekend en niets gevonden: geen (geruststellende) indicatie geven.
      if (cat === 'weinig' && unknown >= 4) cat = 'onvoldoende';

      $$('.tr-cat', result).forEach((c) => { c.hidden = c.dataset.cat !== cat; });
      const fill = (key, list, empty) => { $(`[data-out="${key}"]`, result).innerHTML = (list.length ? list : [empty]).map((x) => `<li>${x}</li>`).join(''); };
      fill('signalen', signalen, 'Geen van de gevraagde signalen');
      fill('factoren', factoren, 'Geen bijzondere omstandigheden in je antwoorden');
      $('[data-out="onbekend"]', result).hidden = unknown < 3 || cat === 'onvoldoende';
      $('[data-out="tegenstrijdig"]', result).hidden = !tegenstrijdig;
      $('[data-out="buiten"]', result).hidden = a.provincie !== 'anders';
      $('[data-out="klasse-de"]', result).hidden = a.klasse !== 'de';
      const advies = {
        kopen: 'Koop je een woning? Bekijk wat een <a href="/fase-0-funderingsonderzoek-aankoop/">Quick Scan bij aankoop</a> inhoudt en doe ook de <a href="/huis-kopen-funderingscheck/">aankoop-check</a>.',
        verkopen: 'Verkoop je? Lees wat <a href="/funderingsonderzoek-bij-verkoop/">funderingsonderzoek bij verkoop</a> kan opleveren.',
        taxatie: 'Gaat het om een taxatie? Lees <a href="/funderingsonderzoek-taxatie/">funderingsonderzoek en taxatie</a> en stem af met je taxateur.',
        wonen: signalen.length
          ? 'Zie je signalen aan je eigen woning? Beschrijf ze en voeg foto\'s toe via <a href="/vertel-wat-je-ziet/">vertel ons wat je ziet</a>.'
          : 'Wil je weten welke stap bij jouw woning past? Doorloop de <a href="/welke-stap-past-bij-mij/">stappenhulp</a>.',
      }[a.situatie] || 'Wil je weten welke stap bij jou past? Doorloop de <a href="/welke-stap-past-bij-mij/">stappenhulp</a>.';
      $('[data-out="advies"]', result).innerHTML = advies;

      const plaats = ($('[name="plaats"]', form)?.value || '').trim();
      const doel = ($('[name="doel"]', form)?.value || '').trim();
      summaries.funderingscheck = [
        `Indicatie: ${$(`.tr-cat[data-cat="${cat}"] h3`, result).textContent}`,
        ...['bouwjaar', 'provincie', 'scheuren', 'groei', 'klemmen', 'vloer', 'fundering', 'klasse', 'onderzoek', 'situatie'].map((n) => `${$(`input[name="${n}"]`, form).closest('fieldset').querySelector('legend').childNodes[1].textContent.trim()} ${radioLabel(form, n)}`),
        plaats ? `Plaats: ${plaats}` : '',
        doel ? `Wil vooral weten: ${doel}` : '',
      ].filter(Boolean).join('\n');
      const lp = $('[name="plaats"]', $('[data-tool-lead="funderingscheck"]', tool));
      if (lp && plaats && !lp.value) lp.value = plaats;

      form.hidden = true;
      result.hidden = false;
      focusEl(result);
      track('funderingscheck_completed', { result: cat });
      track('result_viewed', { tool: 'funderingscheck', result: cat });
    });
    $('[data-tq-reset]', result).addEventListener('click', () => {
      form.reset(); i = 0; show(); result.hidden = true; form.hidden = false; focusEl(form);
    });
    show();
  });

  /* ------------------------------------------------------------------ signalen-checklist */
  $$('[data-tool="vertelwatjeziet"]').forEach((tool) => {
    const boxes = $$('[data-signals] input', tool);
    const count = $('[data-signal-count]', tool);
    const infos = $$('[data-signal-info]', tool);
    infos.forEach((li) => { li.hidden = true; });
    const update = (changed) => {
      if (changed?.value === 'geen' && changed.checked) boxes.forEach((b) => { if (b !== changed) b.checked = false; });
      if (changed && changed.value !== 'geen' && changed.checked) boxes.find((b) => b.value === 'geen').checked = false;
      const sel = boxes.filter((b) => b.checked && b.value !== 'geen');
      count.textContent = String(sel.length);
      infos.forEach((li) => { li.hidden = !sel.some((b) => b.value === li.dataset.signalInfo); });
      summaries.vertelwatjeziet = sel.length ? `Herkende signalen: ${sel.map((b) => b.dataset.label).join(', ')}` : 'Geen signalen aangevinkt';
    };
    boxes.forEach((b) => b.addEventListener('change', () => update(b)));
    update();
  });

  /* ------------------------------------------------------------------ foto's (verkleinen = EXIF weg) */
  const MAX_FILES = 3; const MAX_INPUT = 20 * 1024 * 1024; const MAX_SIDE = 1600;
  const photoStore = new WeakMap(); // form → [{name, data}]
  const resize = (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
  $$('[data-photo-input]').forEach((input) => {
    const form = input.closest('form');
    const list = $('[data-photo-previews]', form);
    const status = $('.form-status', form);
    photoStore.set(form, []);
    const render = () => {
      const items = photoStore.get(form);
      list.innerHTML = items.map((p, k) => `<li><img src="${p.data}" alt="Voorbeeld van foto ${k + 1}"><button type="button" class="btn btn-link" data-remove="${k}">Verwijder foto ${k + 1}</button></li>`).join('');
    };
    list.addEventListener('click', (e) => {
      const k = e.target.dataset.remove; if (k == null) return;
      photoStore.get(form).splice(Number(k), 1); render(); input.focus();
    });
    input.addEventListener('change', async () => {
      const items = photoStore.get(form);
      const files = Array.from(input.files || []);
      const msgs = [];
      track('photo_upload_started', { count: files.length });
      for (const f of files) {
        if (items.length >= MAX_FILES) { msgs.push(`Je kunt maximaal ${MAX_FILES} foto's toevoegen.`); break; }
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { msgs.push(`"${f.name}" heeft een formaat dat we niet kunnen verwerken. Gebruik JPG, PNG of WebP.`); continue; }
        if (f.size > MAX_INPUT) { msgs.push(`"${f.name}" is groter dan 20 MB. Kies een kleinere foto.`); continue; }
        try { items.push({ name: f.name.replace(/\.[^.]+$/, '') + '.jpg', data: await resize(f) }); track('photo_uploaded'); }
        catch { msgs.push(`Er ging iets mis bij het verwerken van "${f.name}". Probeer het opnieuw of kies een andere foto.`); }
      }
      input.value = '';
      render();
      status.hidden = !msgs.length; status.textContent = msgs.join(' '); status.classList.toggle('is-error', !!msgs.length);
    });
  });

  /* ------------------------------------------------------------------ leadformulieren */
  $$('[data-lead-open]').forEach((btn) => btn.addEventListener('click', () => {
    const tool = btn.dataset.leadOpen;
    const form = $(`[data-tool-lead="${tool}"]`);
    if (!form) return;
    if (btn.dataset.leadContext) summaries[tool] = `Vraag over: ${btn.dataset.leadContext}`;
    form.classList.add('is-open');
    track('lead_form_started', { tool });
    focusEl(form);
    $('input[name="naam"]', form)?.focus({ preventScroll: true });
  }));

  $$('[data-tool-lead]').forEach((form) => {
    const tool = form.dataset.toolLead;
    const status = $('.form-status', form);
    const btn = $('button[type="submit"]', form);
    const ok = $('.tool-lead-success', form);
    let started = false;
    form.addEventListener('input', () => { if (!started) { started = true; track('lead_form_started', { tool }); } }, { once: true });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const fields = Object.fromEntries(['naam', 'email', 'telefoon', 'plaats', 'bericht', 'bouwjaar', 'website'].map((k) => [k, String(fd.get(k) || '').trim()]));
      fields.privacy = fd.get('privacy') ? 'on' : '';
      fields.kopie = fd.get('kopie') ? 'on' : '';
      const problems = [];
      if (!fields.naam) problems.push('vul je naam in');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email)) problems.push('vul een geldig e-mailadres in');
      if (form.classList.contains('tool-photo') && !fields.bericht) problems.push('beschrijf kort wat je ziet');
      if (!fields.privacy) problems.push('geef toestemming om je gegevens te gebruiken');
      if (problems.length) {
        status.hidden = false; status.classList.add('is-error');
        status.textContent = `Bijna klaar: ${problems.join(', ')}.`;
        return;
      }
      const photos = (photoStore.get(form) || []).map((p) => ({ name: p.name, data: p.data.split(',')[1] }));
      btn.disabled = true; btn.classList.add('is-loading');
      status.hidden = false; status.classList.remove('is-error');
      status.textContent = photos.length ? 'Bezig met versturen van je bericht en foto\'s…' : 'Bezig met versturen…';
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 30000);
        const r = await fetch('/api/lead/', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
          body: JSON.stringify({ tool, page: location.pathname, fields, samenvatting: summaries[tool] || '', photos }),
        });
        clearTimeout(timer);
        const res = await r.json().catch(() => ({}));
        if (!r.ok || !res.ok) throw new Error(res.error || '');
        form.classList.add('is-sent'); // CSS verbergt alles behalve de bevestiging
        status.hidden = true;
        ok.hidden = false; ok.focus();
        track('lead_form_completed', { tool, photos: photos.length });
      } catch (err) {
        status.classList.add('is-error');
        status.innerHTML = `${err.message && err.name !== 'AbortError' ? err.message : 'Er ging iets mis bij het versturen.'} Probeer het opnieuw, of bel <a href="tel:+31582037172">+31 (0) 582037172</a> of mail naar <a href="mailto:info@mideavastgoed.nl">info@mideavastgoed.nl</a>.`;
      } finally {
        btn.disabled = false; btn.classList.remove('is-loading');
      }
    });
  });

  /* ------------------------------------------------------------------ stappenhulp (beslisboom) */
  $$('[data-tool="stapwizard"]').forEach((wz) => {
    const nodes = $$('.wz-node', wz);
    const back = $('[data-wz-back]', wz);
    const reset = $('[data-wz-reset]', wz);
    const path = $('[data-wz-path]', wz);
    const hist = ['start']; const answers = [];
    const show = (id) => {
      nodes.forEach((n) => { n.removeAttribute('data-hidden'); n.hidden = n.dataset.node !== id; });
      back.hidden = hist.length < 2; reset.hidden = hist.length < 2;
      path.textContent = answers.length ? `Jouw keuzes: ${answers.join(' → ')}` : '';
      const cur = nodes.find((n) => n.dataset.node === id);
      if (hist.length > 1) { cur.setAttribute('tabindex', '-1'); cur.focus({ preventScroll: true }); }
      if (cur.classList.contains('wz-result')) track('service_wizard_completed', { result: id });
    };
    wz.addEventListener('click', (e) => {
      const b = e.target.closest('[data-next]'); if (!b) return;
      hist.push(b.dataset.next); answers.push(b.textContent.trim()); show(b.dataset.next);
    });
    back.addEventListener('click', () => { if (hist.length > 1) { hist.pop(); answers.pop(); show(hist[hist.length - 1]); } });
    reset.addEventListener('click', () => { hist.length = 1; answers.length = 0; show('start'); $('[data-node="start"] button', wz).focus(); });
    show('start');
  });

  /* ------------------------------------------------------------------ bouwjaar-tijdlijn */
  $$('[data-tool="bouwjaarfundering"]').forEach((tool) => {
    const form = $('[data-bj-form]', tool);
    const err = $('.tq-error', form);
    const result = $('[data-bj-result]', tool);
    const marker = $('[data-bj-marker]', tool);
    const pos = (y) => (y <= 1850 ? 2 : y < 1930 ? 2 + ((y - 1850) / 80) * 28 : y < 1970 ? 30 + ((y - 1930) / 40) * 25 : 55 + ((Math.min(y, 2026) - 1970) / 56) * 43);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const y = parseInt($('[name="jaar"]', form).value, 10);
      if (!(y >= 1500 && y <= 2026)) { err.hidden = false; return; }
      err.hidden = true;
      const period = y < 1930 ? 'oud' : y < 1970 ? 'mid' : 'nieuw';
      $$('[data-period]', result).forEach((p) => { p.hidden = p.dataset.period !== period; });
      const doc = radioVal(form, 'doc');
      $('[data-doc="ja"]', result).hidden = doc !== 'ja';
      $('[data-doc="anders"]', result).hidden = doc === 'ja';
      marker.hidden = false; marker.style.left = `${pos(y)}%`; marker.textContent = String(y);
      result.hidden = false; focusEl(result);
      track('result_viewed', { tool: 'bouwjaarfundering', period });
    });
  });

  /* ------------------------------------------------------------------ aankoop-check */
  $$('[data-tool="aankoopcheck"]').forEach((tool) => {
    const form = $('[data-ak-form]', tool);
    const err = $('.tq-error', form);
    const result = $('[data-ak-result]', tool);
    const names = ['bouwjaar', 'klasse', 'signalen', 'info', 'verbouw', 'voorbehoud'];
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const a = Object.fromEntries(names.map((n) => [n, radioVal(form, n)]));
      if (Object.values(a).some((v) => !v)) { err.hidden = false; return; }
      err.hidden = true;
      const on = new Set();
      if (a.klasse === 'de') on.add('klasse-de');
      if (a.klasse === 'onbekend') on.add('klasse-onbekend');
      if (a.bouwjaar === 'oud') on.add('oud');
      if (a.signalen === 'ja') on.add('signalen');
      if (a.info === 'rapport') on.add('rapport');
      if (a.info === 'nee') on.add('geen-info');
      if (a.info === 'mondeling') on.add('mondeling');
      if (a.bouwjaar === 'onbekend') on.add('bouwjaar-onbekend');
      if (a.signalen === 'onbekend') on.add('signalen-onbekend');
      if (a.verbouw === 'ja') on.add('verbouw');
      if (a.voorbehoud === 'ja') on.add('voorbehoud');
      if (a.voorbehoud === 'nee') on.add('geen-voorbehoud');
      if (!on.size) on.add('geen');
      $$('[data-point]', result).forEach((li) => { li.hidden = !on.has(li.dataset.point); });
      summaries.aankoopcheck = ['Aankoop-check', ...$$('.ak-q', form).map((fs) => `${$('legend', fs).textContent.trim()}: ${$('input:checked', fs).parentElement.textContent.trim()}`)].join('\n');
      result.hidden = false; focusEl(result);
      track('purchase_check_completed');
    });
  });

  /* ------------------------------------------------------------------ meetwaarden */
  $$('[data-tool="meetwaarden"]').forEach((tool) => {
    const form = $('[data-mw-form]', tool);
    const err = $('.tq-error', form);
    const out = (k) => $(`[data-mw="${k}"]`, tool);
    const calc = () => {
      const mm = parseFloat(String($('[name="mm"]', form).value).replace(',', '.'));
      const m = parseFloat(String($('[name="m"]', form).value).replace(',', '.'));
      if (!(mm >= 0) || !(m > 0)) { err.hidden = false; return; }
      err.hidden = true;
      const perM = mm / m;
      out('mmm').textContent = `${nl(perM, perM < 10 ? 1 : 0)} mm/m`;
      out('ratio').textContent = perM > 0 ? `1 : ${Math.round(1000 / perM).toLocaleString('nl-NL')}` : 'geen afwijking';
      out('pct').textContent = `${nl(perM / 10, 2)}%`;
      out('deg').textContent = `${nl((Math.atan(perM / 1000) * 180) / Math.PI, 2)}°`;
    };
    form.addEventListener('input', calc);
    form.addEventListener('submit', (e) => { e.preventDefault(); calc(); });
    calc();
  });

  /* ------------------------------------------------------------------ quiz */
  $$('[data-tool="funderingsquiz"]').forEach((tool) => {
    const form = $('[data-qz-form]', tool);
    const qs = $$('.qz-q', form);
    const result = $('[data-qz-result]', tool);
    let started = false;
    form.addEventListener('change', (e) => {
      const q = e.target.closest('.qz-q'); if (!q || q.dataset.done) return;
      if (!started) { started = true; track('quiz_started'); }
      q.dataset.done = '1';
      const right = e.target.dataset.ok === '1';
      q.dataset.ok = right ? '1' : '0';
      $$('input', q).forEach((r) => { r.disabled = true; r.parentElement.classList.toggle('is-right', r.dataset.ok === '1'); });
      if (!right) e.target.parentElement.classList.add('is-wrong');
      const fb = $('[data-qz-feedback]', q);
      $('[data-qz-verdict]', fb).textContent = right ? 'Goed.' : 'Niet helemaal.';
      fb.hidden = false;
      if (qs.every((x) => x.dataset.done)) {
        const score = qs.filter((x) => x.dataset.ok === '1').length;
        $('[data-qz-score]', result).textContent = String(score);
        result.hidden = false;
        track('quiz_completed', { score });
      }
    });
    $('[data-qz-reset]', result).addEventListener('click', () => {
      form.reset();
      qs.forEach((q) => { delete q.dataset.done; delete q.dataset.ok; $('[data-qz-feedback]', q).hidden = true; $$('input', q).forEach((r) => { r.disabled = false; r.parentElement.classList.remove('is-right', 'is-wrong'); }); });
      result.hidden = true; focusEl(qs[0]);
    });
  });

  /* ------------------------------------------------------------------ zelftest in een nieuwsbericht (punten tellen, geen goed/fout) */
  $$('[data-tool="zelftest"]').forEach((tool) => {
    const form = $('[data-zt-form]', tool);
    const qs = $$('.qz-q', form);
    const result = $('[data-zt-result]', tool);
    let started = false;
    form.addEventListener('change', (e) => {
      const q = e.target.closest('.qz-q'); if (!q) return;
      if (!started) { started = true; track('zelftest_started'); }
      const uitleg = $('[data-zt-uitleg]', q); if (uitleg) uitleg.hidden = false;
      const gekozen = qs.map((x) => $('input:checked', x));
      if (gekozen.some((x) => !x)) return;
      const score = gekozen.reduce((som, x) => som + Number(x.dataset.punten || 0), 0);
      const blokken = $$('[data-zt-uitslag]', result);
      // past de score in geen enkele band, dan de dichtstbijzijnde band
      const afstand = (b) => Math.max(0, Number(b.dataset.min) - score, score - Number(b.dataset.max));
      const beste = blokken.reduce((a, b) => (afstand(b) < afstand(a) ? b : a), blokken[0]);
      blokken.forEach((b) => { b.hidden = b !== beste; });
      $('[data-zt-score]', result).textContent = String(score);
      if (result.hidden) { result.hidden = false; track('zelftest_completed', { score }); }
    });
    $('[data-zt-reset]', result).addEventListener('click', () => {
      form.reset();
      qs.forEach((q) => { const u = $('[data-zt-uitleg]', q); if (u) u.hidden = true; });
      result.hidden = true; focusEl(qs[0]);
    });
  });

  /* ------------------------------------------------------------------ CTA-klikken */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-track]');
    if (a) track(a.dataset.track, { page: location.pathname });
  });
})();
