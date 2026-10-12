/* MV Funderingsscan – interactie (vanilla JS) */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Sticky header, voortgangsbalk, mobiele CTA ---------- */
  const header = $('.site-header');
  const progress = $('#scrollProgress');
  const mobileCta = $('#mobileCta');
  const hero = $('.hero');
  const applySection = $('#aanvragen');
  const heroImg = $('#heroMedia img');
  const desktopHero = window.matchMedia('(min-width: 1181px)');

  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 20);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;

    if (mobileCta) {
      const ref = hero || $('.page-hero');
      const pastHero = ref ? y > ref.offsetTop + ref.offsetHeight - 120 : y > 400;
      const rect = applySection ? applySection.getBoundingClientRect() : null;
      const atForm = rect ? rect.top < window.innerHeight && rect.bottom > 0 : false;
      mobileCta.classList.toggle('is-visible', pastHero && !atForm);
    }

    if (heroImg && !reduceMotion && desktopHero.matches && y < window.innerHeight) {
      heroImg.style.setProperty('--py', `${y * 0.12}px`);
      applyHeroTransform();
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });

  /* ---------- Hero-parallax (scroll + muis) ---------- */
  let mx = 0, my = 0;
  function applyHeroTransform() {
    const py = parseFloat(heroImg.style.getPropertyValue('--py')) || 0;
    heroImg.style.transform = `scale(1.06) translate3d(${mx}px, ${py + my}px, 0)`;
  }
  if (hero && heroImg && !reduceMotion && desktopHero.matches && window.matchMedia('(hover: hover)').matches) {
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * -14;
      my = ((e.clientY - r.top) / r.height - 0.5) * -8;
      applyHeroTransform();
    });
    hero.addEventListener('mouseleave', () => { mx = 0; my = 0; applyHeroTransform(); });
  }

  /* ---------- Mobiel menu ---------- */
  const toggle = $('#navToggle');
  const nav = $('#mainNav');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
    document.body.classList.toggle('nav-open', open);
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  const mobileNav = window.matchMedia('(max-width: 1420px)');
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1420) setMenu(false);
    if (heroImg && !desktopHero.matches) heroImg.style.transform = '';
  });

  /* ---------- Dropdowns in het hoofdmenu ---------- */
  $$('.nav-item').forEach((item) => {
    const btn = $('.nav-sub-toggle', item);
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      $$('.nav-item.is-open').forEach((o) => { if (o !== item) { o.classList.remove('is-open'); $('.nav-sub-toggle', o).setAttribute('aria-expanded', 'false'); } });
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && item.classList.contains('is-open')) { item.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    });
  });
  document.addEventListener('click', (e) => {
    if (mobileNav.matches || e.target.closest('.nav-item')) return;
    $$('.nav-item.is-open').forEach((o) => { o.classList.remove('is-open'); $('.nav-sub-toggle', o).setAttribute('aria-expanded', 'false'); });
  });

  /* ---------- Inhoudsopgave: huidige sectie markeren ---------- */
  const tocLinks = $$('.toc-list a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(tocLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        tocLinks.forEach((a) => a.classList.remove('is-current'));
        const a = byId.get(entry.target.id);
        if (a) a.classList.add('is-current');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    byId.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------- Tabs (zonder JS staan alle panelen onder elkaar) ---------- */
  $$('.tabs').forEach((tabs, t) => {
    const panels = $$(':scope > .tab-panel', tabs);
    if (panels.length < 2) return;
    const list = document.createElement('div');
    list.className = 'tab-list';
    list.setAttribute('role', 'tablist');
    const buttons = panels.map((panel, i) => {
      const id = `tab-${t}-${i}`;
      panel.id = panel.id || `${id}-panel`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab-btn';
      b.id = id;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', panel.id);
      b.textContent = panel.dataset.tab || $('h3', panel)?.textContent || `Tab ${i + 1}`;
      list.appendChild(b);
      return b;
    });
    const select = (i) => {
      buttons.forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
      panels.forEach((p, j) => { p.hidden = i !== j; });
    };
    buttons.forEach((b, i) => {
      b.addEventListener('click', () => select(i));
      b.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        select(n); buttons[n].focus();
      });
    });
    tabs.prepend(list);
    tabs.classList.add('is-ready');
    select(0);
  });

  /* ---------- Afvinkbare checklists ---------- */
  $$('.check-interactive').forEach((ul) => {
    const items = $$('li', ul);
    const progress = document.createElement('p');
    progress.className = 'check-interactive-progress';
    progress.setAttribute('aria-live', 'polite');
    const update = () => {
      const n = items.filter((li) => li.classList.contains('is-checked')).length;
      progress.textContent = `${n} van ${items.length} afgevinkt`;
    };
    items.forEach((li) => {
      li.setAttribute('role', 'checkbox');
      li.setAttribute('aria-checked', 'false');
      li.tabIndex = 0;
      const toggleItem = () => {
        const on = !li.classList.contains('is-checked');
        li.classList.toggle('is-checked', on);
        li.setAttribute('aria-checked', String(on));
        update();
      };
      li.addEventListener('click', toggleItem);
      li.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleItem(); } });
    });
    ul.after(progress);
    update();
  });

  /* ---------- Scroll reveal ---------- */
  $$('.steps .step').forEach((el, i) => el.style.setProperty('--i', i));
  ['.usp-grid', '.audience-grid', '.method-grid', '.investigate-grid', '.price-grid', '.phase-cards'].forEach((group) => {
    $$(`${group} > .reveal`).forEach((el, i) => { el.style.transitionDelay = `${i * 90}ms`; });
  });
  const reveals = $$('.reveal, .risk-scale');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Geanimeerde tellers ---------- */
  const counters = $$('[data-count]');
  const runCounter = (el) => {
    const target = parseInt(el.dataset.count, 10);
    // Jaartallen tellen vanaf een logisch startpunt, niet vanaf 0.
    const start = target > 1000 ? target - 70 : 0;
    const duration = 1400;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { runCounter(entry.target); co.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => co.observe(el));
  }

  /* ---------- FAQ-accordeon: één tegelijk open, vloeiende hoogte ---------- */
  const faqItems = $$('.faq-item');
  faqItems.forEach((item) => {
    const summary = $('summary', item);
    const body = $('.faq-body', item);
    summary.addEventListener('click', (e) => {
      if (reduceMotion) return;
      e.preventDefault();
      const isOpen = item.open;
      if (!isOpen) {
        faqItems.forEach((other) => { if (other !== item && other.open) closeItem(other); });
        item.open = true;
        const h = body.scrollHeight;
        body.animate([{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
      } else {
        closeItem(item);
      }
    });
  });
  function closeItem(item) {
    const body = $('.faq-body', item);
    const anim = body.animate([{ height: `${body.scrollHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 260, easing: 'ease' });
    anim.onfinish = () => { item.open = false; };
  }

  /* ---------- Interactieve funderingscheck ---------- */
  const checkForm = $('#checkForm');
  if (checkForm) {
    const questions = $$('.q', checkForm);
    const bar = $('#checkBar');
    const count = $('#checkCount');
    const result = $('#checkResult');
    const label = $('#resultLabel');
    const title = $('#resultTitle');
    const text = $('#resultText');
    const cta = $('#resultCta');

    const evaluate = () => {
      let answered = 0;
      let score = 0;
      let strongSignals = 0;
      questions.forEach((q) => {
        const checked = $('input:checked', q);
        q.classList.toggle('is-answered', !!checked);
        if (!checked) return;
        answered++;
        const w = parseFloat(q.dataset.weight);
        if (checked.value === 'yes') { score += w; if (w >= 1.5) strongSignals++; }
        if (checked.value === 'unknown') score += w * 0.4;
      });

      bar.style.width = `${(answered / questions.length) * 100}%`;
      count.textContent = answered === questions.length
        ? 'Alle vragen beantwoord'
        : `${answered} van ${questions.length} vragen beantwoord`;

      if (answered < questions.length) { result.hidden = true; return; }

      let level;
      if (strongSignals >= 2 || score >= 4) level = 'high';
      else if (score >= 1) level = 'mid';
      else level = 'low';

      const copy = {
        high: {
          label: 'Duidelijke signalen',
          title: 'Bespreek je situatie met een specialist.',
          text: 'Je noemt meerdere signalen die kunnen wijzen op beweging in de fundering. Het is verstandig om dit goed te laten onderzoeken. Een Quick Scan geeft snel duidelijkheid over de ernst en de beste vervolgstap.',
          cta: 'Bespreek je situatie',
          href: '/contact/',
          type: 'onbekend',
        },
        mid: {
          label: 'Indicatie',
          title: 'Een funderingsscan kan interessant zijn.',
          text: 'Er zijn een of meer factoren die een funderingsscan zinvol maken – bijvoorbeeld de leeftijd van de woning of een geplande aan- of verkoop. Met een Quick Scan weet je zeker waar je staat.',
          cta: 'Vraag een Quick Scan aan',
          href: '/funderingsscan-aanvragen/',
          type: 'fase0',
        },
        low: {
          label: 'Indicatie',
          title: 'Geen directe aanleiding gevonden.',
          text: 'Op basis van je antwoorden zijn er weinig signalen. Twijfel je toch, of krijg je vragen van een taxateur of koper? Neem gerust contact op, dan denken we vrijblijvend mee.',
          cta: 'Bespreek je situatie',
          href: '/contact/',
          type: 'onbekend',
        },
      }[level];

      result.dataset.level = level;
      label.textContent = copy.label;
      title.textContent = copy.title;
      text.textContent = copy.text;
      cta.firstChild.textContent = `${copy.cta} `;
      cta.dataset.type = copy.type;
      cta.setAttribute('href', copy.href);

      const wasHidden = result.hidden;
      result.hidden = false;
      if (wasHidden) {
        result.style.animation = 'none';
        void result.offsetWidth;
        result.style.animation = '';
        result.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
      }
    };

    checkForm.addEventListener('change', evaluate);
    $('#checkReset').addEventListener('click', () => {
      checkForm.reset();
      evaluate();
      questions[0].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    });
  }

  /* ---------- CTA's onthouden het gekozen type aanvraag (zonder query-string in de URL) ---------- */
  const store = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* opslag niet beschikbaar */ } },
  };
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-type]');
    if (link) store.set('mvfs-type', link.dataset.type);
  });
  const savedType = store.get('mvfs-type');
  if (savedType) {
    $$(`form input[name="type"][value="${savedType}"]`).forEach((r) => { r.checked = true; });
  }

  /* ---------- Formulieren (demo, nog geen verzending) ---------- */
  const typeLabels = {
    fase0: 'een fase 0 Quick Scan',
    fase1: 'een fase 1 onderzoek',
    onbekend: 'advies over het juiste onderzoek',
    zakelijk: 'een zakelijke aanvraag',
  };
  $$('#applyForm, form.js-form').forEach((form) => {
    const wrap = form.parentElement;
    const success = $('[data-form-success], #formSuccess', wrap);
    const controls = $$('input[required], select[required], textarea[required]', form);
    const holder = (el) => el.closest('.field, .consent') || el.parentElement;
    const validate = (el) => {
      const ok = el.type === 'checkbox' ? el.checked : el.checkValidity() && el.value.trim() !== '';
      holder(el).classList.toggle('has-error', !ok);
      return ok;
    };
    controls.forEach((el) => {
      el.addEventListener('blur', () => { if (el.value && el.type !== 'checkbox') validate(el); });
      el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', () => {
        if (holder(el).classList.contains('has-error')) validate(el);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const invalid = controls.filter((el) => !validate(el));
      if (invalid.length) { invalid[0].focus(); return; }

      const data = new FormData(form);
      const firstName = String(data.get('naam') || '').trim().split(/\s+/)[0];
      const type = data.get('type');
      const contact = [data.get('telefoon'), data.get('email')].filter(Boolean).join(' of ');
      const textEl = $('[data-success-text], #successText', success);
      if (textEl) {
        textEl.textContent = type
          ? `Dank je wel, ${firstName}. We hebben je aanvraag voor ${typeLabels[type] || 'funderingsonderzoek'} ontvangen en nemen zo snel mogelijk contact met je op via ${contact}.`
          : `Dank je wel, ${firstName}. We hebben je bericht ontvangen en nemen zo snel mogelijk contact met je op via ${contact}.`;
      }

      // Verzenden naar de serverless functie /api/aanvraag (mailt via Resend).
      const statusEl = $('.form-status', form);
      const button = $('button[type="submit"]', form);
      const fields = {};
      for (const [k, v] of data.entries()) fields[k] = typeof v === 'string' ? v : '';
      button.disabled = true;
      button.classList.add('is-loading');
      if (statusEl) { statusEl.hidden = true; statusEl.textContent = ''; }

      fetch('/api/aanvraag/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form: form.dataset.formName || 'aanvraag', fields }),
      })
        .then((r) => r.json().catch(() => ({ ok: false })).then((body) => ({ ok: r.ok && body.ok, body })))
        .then(({ ok, body }) => {
          if (!ok) throw new Error(body.error || 'Verzenden mislukt');
          form.hidden = true;
          success.hidden = false;
          success.focus({ preventScroll: true });
          success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        })
        .catch((err) => {
          if (statusEl) {
            statusEl.innerHTML = `${err.message && err.message !== 'Failed to fetch' ? err.message : 'Verzenden lukt nu niet.'} Bel ons op <a href="tel:+31582037172">+31 (0) 582037172</a> of mail naar <a href="mailto:info@mideavastgoed.nl">info@mideavastgoed.nl</a>.`;
            statusEl.hidden = false;
          }
        })
        .finally(() => { button.disabled = false; button.classList.remove('is-loading'); });
    });

    $$('[data-form-reset], #formReset', success).forEach((btn) => btn.addEventListener('click', () => {
      form.reset();
      $$('.has-error', form).forEach((f) => f.classList.remove('has-error'));
      success.hidden = true;
      form.hidden = false;
    }));
  });

  /* ---------- Interactieve kennismodules (educatieve simulaties) ---------- */
  const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, text) => {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (text != null) el.textContent = text;
    return el;
  };

  // Lintvoegwaterpassing: meetpunten selecteren → hoogteprofiel en hoogteverschil
  $$('[data-sim="lintvoeg"]').forEach((sim) => {
    const points = $$('.sim-point', sim);
    const heights = points.map((p) => parseFloat(p.dataset.h));
    const labels = points.map((p, i) => p.dataset.label || String(i + 1));
    const trend = $('[data-sim-trend]', sim);
    const selected = new Set();
    const readings = $('[data-sim-readings]', sim);
    const status = $('[data-sim-status]', sim);
    const profile = $('[data-sim-profile]', sim);
    const result = $('[data-sim-result]', sim);
    const explain = $('[data-sim-explain]', sim);
    const explainDefault = explain.textContent;
    const N = points.length;

    const drawProfile = (idx) => {
      // Smalle schermen krijgen een hogere verhouding en minder labels.
      const narrow = profile.getBoundingClientRect().width < 520;
      const W = narrow ? 400 : 800;
      const H = narrow ? 300 : 220;
      const L = narrow ? 34 : 40;          // linkermarge
      const R = W - (narrow ? 14 : 20);    // rechterrand
      const T = narrow ? 44 : 20;          // bovenrand plotgebied
      const B = H - (narrow ? 34 : 20);    // basislijn
      const x0 = L + (narrow ? 22 : 30);
      const xStep = (R - 10 - x0) / (N - 1);
      profile.setAttribute('viewBox', `0 0 ${W} ${H}`);
      profile.classList.toggle('is-narrow', narrow);
      profile.innerHTML = '';
      profile.appendChild(svgEl('line', { x1: L, y1: B, x2: R, y2: B, class: 'sim-axis' }));
      profile.appendChild(svgEl('line', { x1: L, y1: T, x2: L, y2: B, class: 'sim-axis' }));
      const xOf = (i) => x0 + i * xStep;
      for (let i = 0; i < N; i++) {
        profile.appendChild(svgEl('line', { x1: xOf(i), y1: T, x2: xOf(i), y2: B, class: 'sim-grid' }));
        profile.appendChild(svgEl('text', { x: xOf(i), y: B + (narrow ? 24 : 16), 'text-anchor': 'middle', class: 'sim-tick' }, labels[i]));
      }
      if (idx.length < 2) {
        profile.appendChild(svgEl('text', { x: W / 2, y: (T + B) / 2, 'text-anchor': 'middle', class: 'sim-placeholder' },
          idx.length ? 'Selecteer nog een meetpunt' : 'Selecteer minimaal twee meetpunten'));
        return;
      }
      const vals = idx.map((i) => heights[i]);
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      const span = Math.max(max - min, 0.2);
      const top = T + (narrow ? 24 : 20);
      const yOf = (h) => top + ((max - h) / span) * (B - top - 20);
      // referentie op het hoogste punt
      profile.appendChild(svgEl('line', { x1: L, y1: yOf(max), x2: R, y2: yOf(max), class: 'sim-profile-ref' }));
      const line = svgEl('polyline', { points: idx.map((i) => `${xOf(i)},${yOf(heights[i])}`).join(' '), class: 'sim-profile-line' });
      profile.appendChild(line);
      if (!reduceMotion && line.getTotalLength) {
        const len = line.getTotalLength();
        line.style.strokeDasharray = len;
        line.style.strokeDashoffset = len;
        requestAnimationFrame(() => { line.style.transition = 'stroke-dashoffset .6s ease'; line.style.strokeDashoffset = 0; });
      }
      idx.forEach((i) => {
        const h = heights[i];
        const extreme = h === max || h === min;
        const cls = h === max ? 'sim-dot sim-dot-max' : h === min ? 'sim-dot sim-dot-min' : 'sim-dot';
        profile.appendChild(svgEl('circle', { cx: xOf(i), cy: yOf(h), r: narrow ? 6 : 7, class: cls }));
        if (!narrow || extreme || idx.length <= 3) {
          profile.appendChild(svgEl('text', { x: xOf(i), y: yOf(h) - 14, 'text-anchor': 'middle', class: 'sim-dot-label' }, `${fmt(h)} cm`));
        }
      });
    };
    let lastIdx = [];
    window.addEventListener('resize', () => drawProfile(lastIdx));

    const update = () => {
      const idx = [...selected].sort((a, b) => a - b);
      points.forEach((p, i) => {
        const on = selected.has(i);
        p.classList.toggle('is-selected', on);
        p.setAttribute('aria-pressed', String(on));
        p.setAttribute('aria-label', on ? `Meetpunt ${labels[i]}, hoogte ${fmt(heights[i])} centimeter` : `Meetpunt ${labels[i]}`);
        let tip = $('.sim-point-value', p);
        if (on && !tip) { tip = document.createElement('em'); tip.className = 'sim-point-value'; tip.textContent = `${fmt(heights[i])} cm`; p.appendChild(tip); }
        if (!on && tip) tip.remove();
      });
      // Relatief: verschil t.o.v. punt A (het referentiepunt waar de referentielijn door loopt), in mm.
      const rel = (i) => { const d = Math.round((heights[i] - heights[0]) * 10); return i === 0 ? 'referentiepunt' : `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)} mm t.o.v. A`; };
      readings.innerHTML = idx.map((i) => `<li><span>Punt ${labels[i]}</span><strong>${fmt(heights[i])} cm</strong> <span>(${rel(i)})</span></li>`).join('');
      lastIdx = idx;
      drawProfile(idx);
      if (idx.length >= 2) {
        const vals = idx.map((i) => heights[i]);
        const max = Math.max(...vals);
        const min = Math.min(...vals);
        const iMax = idx[vals.indexOf(max)];
        const iMin = idx[vals.indexOf(min)];
        const mm = Math.round((max - min) * 10);
        $('[data-sim-max]', sim).textContent = `Punt ${labels[iMax]} · ${fmt(max)} cm (${rel(iMax)})`;
        $('[data-sim-min]', sim).textContent = `Punt ${labels[iMin]} · ${fmt(min)} cm (${rel(iMin)})`;
        $('[data-sim-diff]', sim).textContent = `${mm} mm`;
        result.hidden = false;
        status.textContent = `${idx.length} van ${N} meetpunten gemeten. Hoogteverschil tussen de gemeten punten: ${mm} mm.`;
        // verloop: richting en grootste stap tussen opeenvolgende gemeten punten
        const steps = idx.slice(1).map((i, n) => ({ from: idx[n], to: i, d: heights[i] - heights[idx[n]] }));
        const down = steps.every((st) => st.d <= 0);
        const up = steps.every((st) => st.d >= 0);
        const big = steps.reduce((a, b) => (Math.abs(b.d) > Math.abs(a.d) ? b : a));
        const dir = down ? `loopt van links (punt ${labels[idx[0]]}) naar rechts (punt ${labels[idx.at(-1)]}) geleidelijk af`
          : up ? 'loopt van links naar rechts geleidelijk op' : 'loopt niet gelijkmatig: er zitten zowel dalingen als stijgingen in';
        trend.innerHTML = `<strong>Verloop:</strong> de lintvoeg ${dir}. De grootste stap zit tussen punt ${labels[big.from]} en punt ${labels[big.to]} (${Math.round(Math.abs(big.d) * 10)} mm).`;
        trend.hidden = false;
        explain.textContent = idx.length === N
          ? `De meetpunten liggen niet allemaal op dezelfde hoogte. Tussen punt ${labels[iMax]} (hoogste) en punt ${labels[iMin]} (laagste) zit ${mm} mm verschil. Juist het verloop over de hele gevel – een geleidelijke daling of juist een knik – zegt meer dan één los getal.`
          : `De meetpunten liggen niet allemaal op dezelfde hoogte. Het verschil tussen punt ${labels[iMax]} (hoogste) en punt ${labels[iMin]} (laagste) is ${mm} mm. Meet meer punten om het verloop van de hele voeg te zien.`;
      } else {
        result.hidden = true;
        trend.hidden = true;
        status.textContent = idx.length ? `Punt ${labels[idx[0]]} gemeten: ${fmt(heights[idx[0]])} cm. Meet nog een punt om te vergelijken.` : 'Nog geen meetpunten gemeten. Kies een meetpunt in de gevel.';
        explain.textContent = explainDefault;
      }
    };

    points.forEach((p, i) => p.addEventListener('click', () => {
      if (selected.has(i)) selected.delete(i); else selected.add(i);
      update();
    }));
    $('[data-sim-reset]', sim).addEventListener('click', () => { selected.clear(); update(); });
    $('[data-sim-all]', sim).addEventListener('click', () => {
      const todo = points.map((_, i) => i).filter((i) => !selected.has(i));
      if (reduceMotion) { todo.forEach((i) => selected.add(i)); update(); return; }
      todo.forEach((i, n) => setTimeout(() => { selected.add(i); update(); }, n * 180));
    });
    update();
  });

  // Loodmeting: schuifregelaar → gevel kantelt, loodlijn blijft recht
  $$('[data-sim="lood"]').forEach((sim) => {
    const range = $('[data-lood-range]', sim);
    const wall = $('[data-lood-wall]', sim);
    const offset = $('[data-lood-offset]', sim);
    const label = $('[data-lood-label]', sim);
    const value = $('[data-lood-value]', sim);
    const level = $('[data-lood-level]', sim);
    const texts = $$('.sim-level-text', sim);
    const chips = $$('[data-lood-set]', sim);
    const WALL_H = 310;
    const extra = $('[data-lood-extra]', sim);
    const GEVEL_M = parseFloat(sim.dataset.gevel || '6');
    const DEG_PER_MM = 0.35; // sterk overdreven weergave
    let current = 0;
    let anim = null;

    const render = (mm) => {
      const deg = mm * DEG_PER_MM;
      wall.setAttribute('transform', `rotate(${-deg} 250 380)`);
      const topX = 250 - WALL_H * Math.sin(deg * Math.PI / 180);
      const topY = 380 - WALL_H * Math.cos(deg * Math.PI / 180);
      offset.setAttribute('x2', topX.toFixed(1));
      offset.setAttribute('y1', topY.toFixed(1));
      offset.setAttribute('y2', topY.toFixed(1));
      const rounded = Math.round(mm);
      label.textContent = `${rounded} mm`;
      label.setAttribute('x', String(Math.min(topX, 250) - 8));
      label.setAttribute('y', String(topY - 10));
      label.setAttribute('text-anchor', 'end');
      value.textContent = `${rounded} mm`;
      if (extra) {
        // Afwijking = H × tan(hoek)  →  hoek = arctan(afwijking ÷ H), met H = meethoogte van de gevel.
        const perM = rounded / GEVEL_M;
        const deg = (Math.atan(rounded / (GEVEL_M * 1000)) * 180) / Math.PI;
        extra.textContent = rounded ? `Over ${fmt(GEVEL_M, 0)} m gevelhoogte: ${fmt(perM, 1)} mm/m, een hoek van ${fmt(deg, 2)}°.` : `Over ${fmt(GEVEL_M, 0)} m gevelhoogte: geen afwijking van de loodlijn.`;
      }
      const lvl = rounded <= 3 ? 0 : rounded < 15 ? 1 : 2;
      level.textContent = ['Geen duidelijke afwijking', 'Kleine afwijking', 'Grotere afwijking'][lvl];
      level.dataset.level = String(lvl);
      texts.forEach((t) => t.classList.toggle('is-active', t.dataset.level === String(lvl)));
      chips.forEach((c) => c.setAttribute('aria-pressed', String(Number(c.dataset.loodSet) === rounded)));
    };
    const animateTo = (target) => {
      cancelAnimationFrame(anim);
      if (reduceMotion) { current = target; render(current); return; }
      const from = current;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.max(0, Math.min((now - t0) / 450, 1));
        current = from + (target - from) * (1 - Math.pow(1 - p, 3));
        render(current);
        if (p < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    };
    range.addEventListener('input', () => { cancelAnimationFrame(anim); current = Number(range.value); render(current); });
    chips.forEach((c) => c.addEventListener('click', () => { range.value = c.dataset.loodSet; animateTo(Number(c.dataset.loodSet)); }));
    render(0);
  });

  // Oldehove: loodmeting op een toren van 4,2° – schietlood op een hoogte ophangen, onderaan de afstand meten, hoek berekenen
  $$('[data-sim="oldehove"]').forEach((sim) => {
    const DEG = parseFloat(sim.dataset.deg);
    const PX = parseFloat(sim.dataset.px);
    const FOOT = parseFloat(sim.dataset.foot);
    const GROUND = parseFloat(sim.dataset.ground);
    const TAN = Math.tan(DEG * Math.PI / 180);
    const range = $('[data-ol-range]', sim);
    const chips = $$('[data-ol-set]', sim);
    const log = $('[data-ol-loglist]', sim);
    const explain = $('[data-ol-explain]', sim);
    const el = (k) => $(`[data-ol-${k}]`, sim);
    const set = (k, attrs) => Object.entries(attrs).forEach(([a, v]) => el(k).setAttribute(a, typeof v === 'number' ? v.toFixed(1) : v));
    const logged = new Map();
    let h = Number(range.value);
    let drop = 1; // 0 = lood nog bovenaan, 1 = lood hangt tot vlak boven het maaiveld
    let anim = null;

    const draw = () => {
      const d = h * TAN; // afstand onderaan in meters
      const y = GROUND - h * PX; // ophangpunt op de meetlijn
      const x = FOOT + d * PX; // het lood hangt zuiver verticaal onder het ophangpunt
      const yb = y + (GROUND - 12 - y) * drop; // onderkant van het touw
      set('string', { x1: x, y1: y, x2: x, y2: yb });
      set('hook', { cx: x, cy: y });
      set('bob', { d: `M${(x - 6).toFixed(1)} ${(yb - 2).toFixed(1)} h12 l-6 12 z` });
      set('plumblabel', { x: x + 10, y: y + 4 });
      set('offset', { x2: x });
      set('tick', { x1: x, x2: x });
      set('label', { x: x + 8 });
      el('label').textContent = `${fmt(d, 2)} m`;
      el('offset').style.opacity = drop >= 1 ? '1' : '0';
      el('label').style.opacity = drop >= 1 ? '1' : '0';
      set('hline', { y2: y });
      set('htick', { y1: y, y2: y });
      set('guide', { y1: y, y2: y, x2: x });
      set('hlabel', { y: (GROUND + y) / 2 + 4 });
      el('hlabel').textContent = `${h} m`;
      el('h').textContent = `${h} m`;
      el('d').textContent = `${fmt(d, 2)} m`;
      el('angle').textContent = `${fmt(Math.atan(d / h) * 180 / Math.PI)}°`;
      el('formula').textContent = `Scheefstand = arctan(afstand ÷ hoogte) = arctan(${fmt(d, 2)} ÷ ${h}) ≈ ${fmt(Math.atan(d / h) * 180 / Math.PI)}°`;
      range.setAttribute('aria-valuetext', `${h} meter, afstand onderaan ${fmt(d, 2)} meter`);
      chips.forEach((c) => c.setAttribute('aria-pressed', String(Number(c.dataset.olSet) === h)));
    };

    // Het lood zakt van het ophangpunt naar beneden (bij elke nieuwe hoogte opnieuw).
    const lower = () => {
      cancelAnimationFrame(anim);
      if (reduceMotion) { drop = 1; draw(); return; }
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.max(0, Math.min((now - t0) / 700, 1));
        drop = 1 - Math.pow(1 - p, 3);
        draw();
        if (p < 1) anim = requestAnimationFrame(step);
      };
      drop = 0; draw();
      anim = requestAnimationFrame(step);
    };

    const renderLog = () => {
      const items = [...logged.keys()].sort((a, b) => a - b);
      log.innerHTML = items.map((k) => `<li><span>${k} m</span><strong>${fmt(k * TAN, 2)} m</strong><em>${fmt(DEG)}°</em></li>`).join('');
      if (items.length >= 2) {
        explain.textContent = `Je hebt ${items.length} metingen vastgelegd. De afstand onderaan groeit van ${fmt(items[0] * TAN, 2)} m naar ${fmt(items.at(-1) * TAN, 2)} m, maar de berekende hoek blijft ${fmt(DEG)}°: de toren staat als één geheel scheef. Bij een gevel die bol staat of een knik heeft, zou de hoek per meethoogte juist verschillen.`;
      }
    };

    range.addEventListener('input', () => { h = Number(range.value); drop = 1; draw(); });
    range.addEventListener('change', lower);
    chips.forEach((c) => c.addEventListener('click', () => { h = Number(c.dataset.olSet); range.value = h; lower(); }));
    el('log').addEventListener('click', () => { logged.set(h, true); renderLog(); });
    el('reset').addEventListener('click', () => {
      logged.clear(); log.innerHTML = ''; h = Number(range.max); range.value = h;
      explain.textContent = explain.dataset.default; lower();
    });
    explain.dataset.default = explain.textContent;
    draw();
    if ('IntersectionObserver' in window && !reduceMotion) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { io.disconnect(); lower(); }
      }, { threshold: 0.35 });
      io.observe(sim);
    }
  });

  // Scheuren: klikbare scheuren in de gevel → infopaneel
  $$('[data-sim="scheuren"]').forEach((sim) => {
    const cracks = $$('[data-crack]', sim);
    const panels = $$('[data-crack-panel]', sim);
    panels.forEach((p) => { p.hidden = p.dataset.crackPanel !== 'start'; });
    sim.classList.add('is-ready');
    const select = (g) => {
      cracks.forEach((c) => { c.classList.toggle('is-active', c === g); c.setAttribute('aria-pressed', String(c === g)); });
      panels.forEach((p) => { p.hidden = p.dataset.crackPanel !== g.dataset.crack; });
      if (window.matchMedia('(max-width: 900px)').matches) {
        const panel = panels.find((p) => !p.hidden);
        if (panel) panel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
      }
    };
    cracks.forEach((g) => {
      g.addEventListener('click', () => select(g));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(g); }
      });
    });
  });

  // Vloerveldwaterpassing: raster aanklikken → kleur, hoogteverschil en doorsnede
  $$('[data-sim="vloerveld"]').forEach((sim) => {
    const cells = $$('.vv-cell', sim);
    const status = $('[data-vv-status]', sim);
    const result = $('[data-vv-result]', sim);
    const profile = $('[data-vv-profile]', sim);
    const rowBtns = $$('[data-vv-row]', sim);
    const all = cells.map((c) => parseFloat(c.dataset.h));
    const gMax = Math.max(...all); const gMin = Math.min(...all);
    const ROWS = 'ABCDE';
    const id = (c) => `${ROWS[c.dataset.r]}${Number(c.dataset.c) + 1}`;
    const selected = new Set();
    let row = 2;
    const color = (h) => {
      const t = (gMax - h) / Math.max(gMax - gMin, 0.01); // 0 = hoog, 1 = laag
      return `hsl(${(205 - t * 170).toFixed(0)} ${(45 + t * 20).toFixed(0)}% ${(80 - t * 22).toFixed(0)}%)`;
    };
    const drawRow = () => {
      const vals = cells.filter((c) => Number(c.dataset.r) === row).map((c) => parseFloat(c.dataset.h));
      profile.innerHTML = '';
      const L = 20; const R = 380; const T = 34; const B = 110;
      const xOf = (i) => L + 30 + i * ((R - L - 60) / 4);
      const yOf = (h) => T + ((gMax - h) / Math.max(gMax - gMin, 0.01)) * (B - T);
      profile.appendChild(svgEl('line', { x1: L, y1: yOf(gMax), x2: R, y2: yOf(gMax), class: 'sim-profile-ref' }));
      profile.appendChild(svgEl('text', { x: R, y: yOf(gMax) - 8, 'text-anchor': 'end', class: 'sim-tick' }, 'waterpas'));
      const pts = vals.map((h, i) => `${xOf(i)},${yOf(h)}`);
      profile.appendChild(svgEl('polygon', { points: `${L},${B + 26} ${L},${yOf(vals[0])} ${pts.join(' ')} ${R},${yOf(vals[4])} ${R},${B + 26}`, class: 'vv-slab' }));
      profile.appendChild(svgEl('polyline', { points: `${L},${yOf(vals[0])} ${pts.join(' ')} ${R},${yOf(vals[4])}`, class: 'sim-profile-line' }));
      vals.forEach((h, i) => {
        profile.appendChild(svgEl('circle', { cx: xOf(i), cy: yOf(h), r: 5, class: 'sim-dot' }));
        profile.appendChild(svgEl('text', { x: xOf(i), y: B + 50, 'text-anchor': 'middle', class: 'sim-tick' }, `${ROWS[row]}${i + 1}`));
        profile.appendChild(svgEl('text', { x: xOf(i), y: yOf(h) - 12, 'text-anchor': 'middle', class: 'sim-dot-label' }, fmt(h)));
      });
      const d = Math.round((Math.max(...vals) - Math.min(...vals)) * 10);
      profile.setAttribute('aria-label', `Doorsnede rij ${ROWS[row]}: ${d} mm verschil tussen het hoogste en laagste punt van deze rij`);
      rowBtns.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.vvRow) === row)));
    };
    const update = () => {
      cells.forEach((c, i) => {
        const on = selected.has(i);
        c.classList.toggle('is-measured', on);
        c.setAttribute('aria-pressed', String(on));
        c.style.background = on ? color(all[i]) : '';
        c.setAttribute('aria-label', on ? `Meetpunt ${id(c)}, ${fmt(all[i])} centimeter` : `Meetpunt ${id(c)}`);
      });
      const idx = [...selected];
      if (idx.length >= 2) {
        const vals = idx.map((i) => all[i]);
        const max = Math.max(...vals); const min = Math.min(...vals);
        const cMax = cells[idx[vals.indexOf(max)]]; const cMin = cells[idx[vals.indexOf(min)]];
        const mm = Math.round((max - min) * 10);
        const relv = (h) => { const d = Math.round((h - all[0]) * 10); return d === 0 ? 'gelijk aan A1' : `${d > 0 ? '+' : '−'}${Math.abs(d)} mm t.o.v. A1`; };
        $('[data-vv-max]', sim).textContent = `${id(cMax)} · ${fmt(max)} cm (${relv(max)})`;
        $('[data-vv-min]', sim).textContent = `${id(cMin)} · ${fmt(min)} cm (${relv(min)})`;
        $('[data-vv-diff]', sim).textContent = `${mm} mm`;
        result.hidden = false;
        status.textContent = `${idx.length} van ${cells.length} meetpunten gemeten. Hoogteverschil tussen hoogste en laagste meetpunt: ${mm} mm.`
          + (idx.length === cells.length ? ' In deze simulatie loopt de vloer geleidelijk af van hoek A1 naar hoek E5.' : '');
      } else {
        result.hidden = true;
        status.textContent = idx.length ? `Meetpunt ${id(cells[idx[0]])}: ${fmt(all[idx[0]])} cm. Meet nog een punt om te vergelijken.` : 'Nog geen meetpunten gemeten.';
      }
    };
    sim.classList.add('is-ready');
    cells.forEach((c, i) => c.addEventListener('click', () => {
      if (selected.has(i)) selected.delete(i); else selected.add(i);
      row = Number(c.dataset.r); drawRow();
      update();
    }));
    rowBtns.forEach((b) => b.addEventListener('click', () => { row = Number(b.dataset.vvRow); drawRow(); }));
    $('[data-vv-reset]', sim).addEventListener('click', () => { selected.clear(); update(); });
    $('[data-vv-all]', sim).addEventListener('click', () => {
      const todo = cells.map((_, i) => i).filter((i) => !selected.has(i));
      if (reduceMotion) { todo.forEach((i) => selected.add(i)); update(); return; }
      todo.forEach((i, n) => setTimeout(() => { selected.add(i); update(); }, n * 45));
    });
    drawRow();
    update();
  });

  // Keuzehulpen (situatie en scheuranalyse)
  $$('[data-sim="keuze"]').forEach((sim) => {
    const buttons = $$('[data-keuze]', sim);
    const panels = $$('[data-keuze-panel]', sim);
    panels.forEach((p) => { p.hidden = true; });
    buttons.forEach((b) => b.addEventListener('click', () => {
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      panels.forEach((p) => { p.hidden = p.dataset.keuzePanel !== b.dataset.keuze; });
      const panel = panels.find((p) => !p.hidden);
      if (panel) panel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    }));
  });

  /* ---------- Jaartal in footer ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  onScroll();
})();
