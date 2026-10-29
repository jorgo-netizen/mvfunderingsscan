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

    // Telt zichtbare signalen (scheuren, klemmen, scheefstand) apart van omstandigheden (bouwjaar) en context
    // (aan- of verkoop). "Weet ik niet" telt niet als signaal. Nooit een diagnose; zelfde categorieën als de
    // uitgebreide Funderingscheck (/gratis-funderingscheck/).
    const evaluate = () => {
      let answered = 0;
      let signals = 0; let unknownSignals = 0; let oldHouse = false; let transaction = false;
      questions.forEach((q) => {
        const checked = $('input:checked', q);
        q.classList.toggle('is-answered', !!checked);
        if (!checked) return;
        answered++;
        const kind = q.dataset.kind;
        if (kind === 'signaal' && checked.value === 'yes') signals++;
        if (kind === 'signaal' && checked.value === 'unknown') unknownSignals++;
        if (kind === 'factor' && checked.value === 'yes') oldHouse = true;
        if (kind === 'transactie' && checked.value === 'yes') transaction = true;
      });

      bar.style.width = `${(answered / questions.length) * 100}%`;
      count.textContent = answered === questions.length
        ? 'Alle vragen beantwoord'
        : `${answered} van ${questions.length} vragen beantwoord`;

      if (answered < questions.length) { result.hidden = true; return; }

      let cat;
      if (signals >= 2) cat = 'meerdere';
      else if (signals === 1 || oldHouse) cat = 'enkele';
      else if (unknownSignals >= 2) cat = 'onvoldoende';
      else cat = 'weinig';

      const copy = {
        meerdere: {
          level: 'high',
          title: 'Meerdere signalen',
          text: 'Je noemt meerdere signalen. Die kunnen verschillende oorzaken hebben, zoals krimp, vocht of temperatuurwerking, maar samen zijn ze een reden om het funderingsrisico te laten beoordelen. Een Quick Scan brengt in beeld of er aanwijzingen zijn dat de fundering een rol speelt.',
          cta: 'Vraag een Quick Scan aan',
          href: '/funderingsscan-aanvragen/',
          type: 'fase0',
        },
        enkele: {
          level: 'mid',
          title: 'Enkele signalen of aandachtspunten',
          text: oldHouse && signals === 0
            ? 'Je ziet geen signalen, maar de woning is van vóór circa 1970. In die periode zijn houten palen en funderingen op staal gebruikelijk; dat is geen probleem op zich, maar het maakt het funderingsrisico relevanter om te kennen.'
            : 'Je noemt één signaal. Een losse aanwijzing bewijst geen funderingsprobleem en kan ook een andere oorzaak hebben. Het kan wel de moeite waard zijn om verder te kijken, bijvoorbeeld met de uitgebreide Funderingscheck.',
          cta: 'Doe de uitgebreide Funderingscheck',
          href: '/gratis-funderingscheck/',
          type: 'onbekend',
        },
        onvoldoende: {
          level: 'low',
          title: 'Te weinig informatie voor een indicatie',
          text: 'Je hebt meerdere vragen met "weet ik niet" beantwoord. Daardoor kunnen we geen zinvolle indicatie geven; dat zegt niets over de staat van de fundering. Kijk bij gelegenheid naar gevels, deuren en vloeren, of leg je vraag aan ons voor.',
          cta: 'Bespreek je situatie',
          href: '/contact/',
          type: 'onbekend',
        },
        weinig: {
          level: 'low',
          title: 'Weinig signalen',
          text: 'Op basis van je antwoorden zien we weinig signalen die direct aanleiding geven voor funderingsonderzoek. Dat is geen garantie dat de fundering in orde is. Twijfel je toch, neem dan gerust contact op.',
          cta: 'Bespreek je situatie',
          href: '/contact/',
          type: 'onbekend',
        },
      }[cat];
      if (transaction) copy.text += ' Koop of verkoop je de woning? Dan is het verstandig om het funderingsrisico vóór de transactie in beeld te hebben, zeker bij een oudere woning.';
      copy.label = 'Indicatie';
      const level = copy.level;

      result.dataset.level = level;
      result.dataset.cat = cat;
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
      // Eén sleutel per ingevuld formulier: voorkomt een dubbel dossier bij opnieuw versturen.
      if (!form.dataset.formulierId) form.dataset.formulierId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      fields.formulier_id = form.dataset.formulierId;
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
          if (textEl && body.tracking && body.tracking.dossier) {
            textEl.textContent += ` Je dossiernummer is ${body.tracking.dossier}.${body.tracking.mail === 'verzonden' ? ' Je ontvangt een bevestiging per e-mail met een persoonlijke link waarmee je de voortgang kunt volgen.' : ''}`;
          }
          form.hidden = true;
          success.hidden = false;
          success.focus({ preventScroll: true });
          success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        })
        .catch((err) => {
          if (statusEl) {
            statusEl.innerHTML = `${err.message && err.message !== 'Failed to fetch' ? err.message : 'Verzenden lukt nu niet.'} Bel ons op <a href="tel:+31582037172">+31 (0) 582037172</a> of mail naar <a href="mailto:info@mvadviseurs.nl">info@mvadviseurs.nl</a>.`;
            statusEl.hidden = false;
          }
        })
        .finally(() => { button.disabled = false; button.classList.remove('is-loading'); });
    });

    $$('[data-form-reset], #formReset', success).forEach((btn) => btn.addEventListener('click', () => {
      form.reset();
      delete form.dataset.formulierId; // nieuw formulier = nieuwe aanvraag
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
  /* ---------- Adres automatisch aanvullen (postcode + huisnummer, via /api/adres/ en PDOK) ---------- */
  $$('form').forEach((form) => {
    const pc = $('input[name="postcode"]', form);
    const hn = $('input[name="huisnummer"]', form);
    if (!pc || !hn) return;
    const adres = $('input[name="adres"]', form);
    const plaats = $('input[name="plaats"]', form);
    const bouwjaar = $('input[name="bouwjaar"]', form);
    // Formulieren zonder adresvelden (homepage): verborgen velden zodat kantoor het volledige adres krijgt
    const verborgen = (name) => { const el = document.createElement('input'); el.type = 'hidden'; el.name = name; form.appendChild(el); return el; };
    const adresEl = adres || verborgen('adres');
    const plaatsEl = plaats || verborgen('plaats');
    const melding = document.createElement('p');
    melding.className = 'address-lookup';
    melding.setAttribute('aria-live', 'polite');
    melding.hidden = true;
    (hn.closest('.field') || hn.parentElement).after(melding);
    const auto = new WeakSet(); // velden die wij hebben ingevuld (die mogen we overschrijven)
    const zet = (el, v) => {
      if (!el || !v || (el.value.trim() && !auto.has(el))) return;
      el.value = v; auto.add(el);
      const holder = el.closest('.field'); if (holder) holder.classList.remove('has-error');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    [adres, plaats, bouwjaar].forEach((el) => el && el.addEventListener('input', (e) => { if (e.isTrusted) auto.delete(el); }));
    let timer = null; let laatste = '';
    const zoek = () => {
      const p = pc.value.replace(/\s+/g, '').toUpperCase(); const n = hn.value.trim();
      if (!/^[1-9][0-9]{3}[A-Z]{2}$/.test(p) || !/^\d/.test(n)) { melding.hidden = true; return; }
      const sleutel = `${p}|${n}`;
      if (sleutel === laatste) return;
      laatste = sleutel;
      melding.hidden = false; melding.className = 'address-lookup is-busy'; melding.textContent = 'Adres opzoeken…';
      fetch(`/api/adres/?postcode=${encodeURIComponent(p)}&huisnummer=${encodeURIComponent(n)}`, { headers: { Accept: 'application/json' } })
        .then((r) => r.json().then((b) => ({ status: r.status, b })))
        .then(({ status, b }) => {
          if (sleutel !== laatste) return;
          if (!b.ok) {
            melding.className = 'address-lookup is-warn';
            melding.textContent = status === 409 ? b.error : (adres ? 'Adres niet gevonden. Vul straat en plaats zelf in.' : 'Adres niet gevonden. Controleer postcode en huisnummer.');
            return;
          }
          const a = b.adres;
          zet(adresEl, a.straat_huisnummer); zet(plaatsEl, a.plaats);
          if (a.bouwjaar) zet(bouwjaar, String(a.bouwjaar));
          melding.className = 'address-lookup is-ok';
          melding.textContent = `✓ ${a.straat_huisnummer}, ${a.postcode} ${a.plaats}${a.bouwjaar && bouwjaar ? ` · bouwjaar ${a.bouwjaar} (BAG)` : ''}`;
        })
        .catch(() => { if (sleutel === laatste) { melding.hidden = true; laatste = ''; } });
    };
    [pc, hn].forEach((el) => el.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(zoek, 450); }));
    form.addEventListener('reset', () => { laatste = ''; melding.hidden = true; });
  });

  /* ---------- Vertaalknop NL → EN (DeepL via /api/vertaal/) ---------- */
  const langBtn = $('[data-lang-toggle]');
  if (langBtn) {
    const KEY = 'mvfs-taal';
    const opslag = { get: () => { try { return localStorage.getItem(KEY); } catch { return null; } }, set: (v) => { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch { /* */ } } };
    const SKIP = 'script,style,noscript,svg,textarea,code,pre,select,template,iframe,[data-no-translate],[translate="no"]';
    const INTERACTIEF = 'input,select,textarea,button,svg,iframe,video,canvas';
    const gedaan = new WeakSet();
    let actief = false; let observer = null; let bezig = 0; let dynamisch = 0;
    const MAX_DYNAMISCH = 300; // plafond voor tekst die na het laden verschijnt (bijv. uitslagen van hulpmiddelen)
    const heeftWoorden = (h) => /[A-Za-zÀ-ÿ]{2,}/.test(h.replace(/<[^>]+>/g, ' '));
    const isInline = (el) => { const d = getComputedStyle(el).display; return d === 'inline' || d === 'contents'; };
    const blokVan = (node) => { let el = node.parentElement; while (el && el !== document.body && isInline(el)) el = el.parentElement; return el; };
    const tekstUit = (html) => { const t = document.createElement('template'); t.innerHTML = html; return t.content.textContent; };
    const escTekst = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Verzamelt vertaalklussen: per blok de HTML (met genummerde elementen), anders losse tekst.
    function verzamel(root) {
      const klussen = []; const blokken = new Set(); const losse = [];
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (!n.nodeValue.trim() || gedaan.has(n) || !n.parentElement || n.parentElement.closest(SKIP) || n.parentElement.closest('[data-lang-toggle]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      });
      for (let n = w.nextNode(); n; n = w.nextNode()) { const b = blokVan(n); if (b) blokken.add(b); else losse.push(n); }
      for (const b of blokken) {
        // Bevat het blok zelf weer blokken met tekst (bijv. een lijst in een lijst)? Dan alleen de eigen tekstdelen los.
        const genest = Array.from(b.querySelectorAll('*')).some((el) => !el.closest(SKIP) && !isInline(el) && !el.matches(INTERACTIEF) && Array.from(el.childNodes).some((c) => c.nodeType === 3 && c.nodeValue.trim()));
        if (genest) { Array.from(b.childNodes).forEach((c) => { if (c.nodeType === 3 && c.nodeValue.trim() && !gedaan.has(c)) losse.push(c); }); continue; }
        const orig = Array.from(b.querySelectorAll('*'));
        const kloon = b.cloneNode(true);
        Array.from(kloon.querySelectorAll('*')).forEach((el, i) => {
          if (el.matches(SKIP) || el.matches(INTERACTIEF)) { const k = document.createElement('x-keep'); k.setAttribute('data-k', i); el.replaceWith(k); return; }
          for (const a of Array.from(el.attributes)) el.removeAttribute(a.name);
          el.setAttribute('data-k', i);
        });
        // Elementen binnen vervangen x-keep zijn uit de kloon verdwenen; de nummering blijft gelijk aan 'orig'.
        klussen.push({ soort: 'blok', el: b, orig, html: kloon.innerHTML.trim() });
      }
      for (const n of losse) klussen.push({ soort: 'tekst', node: n, html: escTekst(n.nodeValue.trim()) });
      // attributen die bezoekers zien of horen
      Array.from(root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label],img[alt],input[type="submit"][value],input[type="button"][value]') : []).forEach((el) => {
        if (el.closest('[data-no-translate],[translate="no"],[data-lang-toggle]')) return;
        ['placeholder', 'title', 'aria-label', 'alt', 'value'].forEach((a) => {
          if (a === 'value' && !/^(submit|button)$/.test(el.type)) return;
          const v = el.getAttribute(a); if (!v || !v.trim() || gedaan.has(el.attributes[a])) return;
          klussen.push({ soort: 'attr', el, attr: a, html: escTekst(v.trim()) });
        });
      });
      if (root.querySelectorAll) Array.from(root.querySelectorAll('select option')).forEach((o) => { if (o.text.trim() && !gedaan.has(o)) klussen.push({ soort: 'optie', el: o, html: escTekst(o.text.trim()) }); });
      return klussen;
    }

    function pasToe(k, vertaald) {
      if (k.soort === 'tekst') {
        const v = k.node.nodeValue; const lead = v.match(/^\s*/)[0]; const trail = v.match(/\s*$/)[0];
        k.node.nodeValue = lead + tekstUit(vertaald) + trail; gedaan.add(k.node); return;
      }
      if (k.soort === 'attr') { k.el.setAttribute(k.attr, tekstUit(vertaald)); gedaan.add(k.el.attributes[k.attr]); return; }
      if (k.soort === 'optie') { k.el.text = tekstUit(vertaald); gedaan.add(k.el); return; }
      // blok: vertaalde structuur opnieuw opbouwen met de ORIGINELE elementen (attributen, links en knoppen blijven werken)
      const t = document.createElement('template'); t.innerHTML = vertaald;
      const bronK = (k.html.match(/data-k="\d+"/g) || []).length;
      const uitK = t.content.querySelectorAll('[data-k]').length;
      if (bronK !== uitK) { // structuur niet herkenbaar: dan alleen de losse teksten
        const w = document.createTreeWalker(k.el, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.trim()) gedaan.add(n);
        return;
      }
      const bouw = (node) => {
        if (node.nodeType === 3) { const tn = document.createTextNode(node.nodeValue); gedaan.add(tn); return tn; }
        if (node.nodeType !== 1) return null;
        const el = k.orig[Number(node.getAttribute('data-k'))];
        if (!el) { const tn = document.createTextNode(node.textContent); gedaan.add(tn); return tn; }
        if (node.localName === 'x-keep') return el; // svg, knop of invoerveld: ongewijzigd terugzetten
        el.replaceChildren(...Array.from(node.childNodes).map(bouw).filter(Boolean));
        return el;
      };
      k.el.replaceChildren(...Array.from(t.content.childNodes).map(bouw).filter(Boolean));
    }

    async function vertaal(root, { na = false } = {}) {
      let klussen = verzamel(root).filter((k) => heeftWoorden(k.html));
      if (na) { klussen = klussen.slice(0, Math.max(0, MAX_DYNAMISCH - dynamisch)); dynamisch += klussen.length; }
      if (!klussen.length) return;
      bezig++; document.documentElement.classList.add('is-translating');
      if (observer) observer.disconnect();
      try {
        const sessie = (() => { try { return JSON.parse(sessionStorage.getItem('mvfs-vt') || '{}'); } catch { return {}; } })();
        const open = klussen.filter((k) => !(k.html in sessie));
        const uniek = [...new Set(open.map((k) => k.html))];
        const pakketten = [];
        for (let i = 0, p = [], n = 0; i < uniek.length; i++) {
          p.push(uniek[i]); n += uniek[i].length;
          if (p.length === 40 || n > 40000 || i === uniek.length - 1) { pakketten.push(p); p = []; n = 0; }
        }
        for (let i = 0; i < pakketten.length; i += 3) {
          await Promise.all(pakketten.slice(i, i + 3).map((p) => fetch('/api/vertaal/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ segmenten: p }) })
            .then((r) => r.json()).then((b) => { if (!b.ok) throw new Error(b.error); p.forEach((h, j) => { sessie[h] = b.vertalingen[j]; }); })));
        }
        try { sessionStorage.setItem('mvfs-vt', JSON.stringify(sessie)); } catch { /* vol: niet erg */ }
        for (const k of klussen) if (k.html in sessie) pasToe(k, sessie[k.html]);
      } finally {
        bezig--; if (!bezig) document.documentElement.classList.remove('is-translating');
        if (actief && observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      }
    }

    async function zetEngels() {
      actief = true;
      document.documentElement.lang = 'en';
      (langBtn.querySelector('[data-lang-label]') || langBtn).textContent = 'NL'; langBtn.setAttribute('aria-label', 'Terug naar Nederlands'); langBtn.title = 'Terug naar Nederlands'; langBtn.setAttribute('aria-pressed', 'true');
      // Titel van de pagina
      try {
        const r = await fetch('/api/vertaal/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ segmenten: [escTekst(document.title)] }) });
        const b = await r.json(); if (b.ok) document.title = tekstUit(b.vertalingen[0]);
      } catch { /* titel blijft Nederlands */ }
      // Nieuwe tekst op de pagina (meldingen, uitslagen van hulpmiddelen) ook vertalen
      let wacht = null; const nieuw = new Set();
      observer = new MutationObserver((muts) => {
        for (const m of muts) {
          const t = m.type === 'characterData' ? m.target.parentElement : m.target;
          if (t && !(m.type === 'characterData' && gedaan.has(m.target))) nieuw.add(t);
        }
        clearTimeout(wacht);
        wacht = setTimeout(() => { const roots = [...nieuw].filter((n) => n.isConnected); nieuw.clear(); roots.forEach((r) => vertaal(r, { na: true }).catch(() => {})); }, 300);
      });
      try { await vertaal(document.body); } catch {
        langBtn.title = 'Vertalen lukt nu niet.';
      }
    }

    langBtn.addEventListener('click', () => {
      if (actief) { opslag.set(null); location.reload(); return; }
      opslag.set('en'); zetEngels();
    });
    const toon = () => { langBtn.hidden = false; if (opslag.get() === 'en') zetEngels(); };
    fetch('/api/vertaal/').then((r) => r.json()).then((b) => { if (b.ok && b.beschikbaar) toon(); }).catch(() => {});
  }

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Portretfoto's adviseurs: geen foto in het portaal → initialen blijven zichtbaar ---------- */
  $$('img.expert-photo').forEach((img) => {
    const weg = () => img.remove();
    if (img.complete && !img.naturalWidth) weg(); else img.addEventListener('error', weg);
  });

  onScroll();
})();
