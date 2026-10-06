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
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1240) setMenu(false);
    if (heroImg && !desktopHero.matches) heroImg.style.transform = '';
  });

  /* ---------- Actieve menu-item op de homepage op basis van scrollpositie ---------- */
  const navLinks = $$('.main-nav > a');
  const isHome = location.pathname === '/' || location.pathname.endsWith('/index.html');
  if (isHome && 'IntersectionObserver' in window) {
    const linkFor = (href) => navLinks.find((a) => a.getAttribute('href') === href);
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const active = entry.target === hero ? linkFor('/') : linkFor(`/#${entry.target.id}`);
        navLinks.forEach((l) => {
          const on = l === active;
          l.classList.toggle('is-active', on);
          if (on) l.setAttribute('aria-current', l.getAttribute('href') === '/' ? 'page' : 'location');
          else l.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section').forEach((s) => spy.observe(s));
  }

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
          cta: 'Plan een gesprek of Quick Scan',
          type: 'onbekend',
        },
        mid: {
          label: 'Indicatie',
          title: 'Een funderingsscan kan interessant zijn.',
          text: 'Er zijn een of meer factoren die een funderingsscan zinvol maken – bijvoorbeeld de leeftijd van de woning of een geplande aan- of verkoop. Met een Quick Scan weet je zeker waar je staat.',
          cta: 'Vraag een Quick Scan aan',
          type: 'fase0',
        },
        low: {
          label: 'Indicatie',
          title: 'Geen directe aanleiding gevonden.',
          text: 'Op basis van je antwoorden zijn er weinig signalen. Twijfel je toch, of krijg je vragen van een taxateur of koper? Neem gerust contact op, dan denken we vrijblijvend mee.',
          cta: 'Neem contact op',
          type: 'onbekend',
        },
      }[level];

      result.dataset.level = level;
      label.textContent = copy.label;
      title.textContent = copy.title;
      text.textContent = copy.text;
      cta.firstChild.textContent = `${copy.cta} `;
      cta.dataset.type = copy.type;

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

  /* ---------- CTA's kiezen alvast het juiste type aanvraag ---------- */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href="#aanvragen"][data-type]');
    if (!link) return;
    const radio = $(`#applyForm input[name="type"][value="${link.dataset.type}"]`);
    if (radio) radio.checked = true;
  });

  /* ---------- Aanvraagformulier (demo, geen backend) ---------- */
  const form = $('#applyForm');
  const success = $('#formSuccess');
  if (form && success) {
    const fields = $$('.field input[required]', form);
    const validate = (input) => {
      const ok = input.checkValidity() && input.value.trim() !== '';
      input.closest('.field').classList.toggle('has-error', !ok);
      return ok;
    };
    fields.forEach((input) => {
      input.addEventListener('blur', () => { if (input.value) validate(input); });
      input.addEventListener('input', () => {
        if (input.closest('.field').classList.contains('has-error')) validate(input);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const invalid = fields.filter((input) => !validate(input));
      if (invalid.length) { invalid[0].focus(); return; }

      const data = new FormData(form);
      const firstName = String(data.get('naam')).trim().split(/\s+/)[0];
      const typeLabels = {
        fase0: 'een Fase 0 Quick Scan',
        fase1: 'een Fase 1 onderzoek',
        onbekend: 'advies over het juiste onderzoek',
        zakelijk: 'een zakelijke aanvraag',
      };
      $('#successText').textContent =
        `Dank je wel, ${firstName}. We hebben je aanvraag voor ${typeLabels[data.get('type')]} ontvangen ` +
        `en nemen zo snel mogelijk contact met je op via ${data.get('telefoon')} of ${data.get('email')}.`;

      // TODO: koppel hier later de echte verzending (e-mail, CRM of API-route).
      form.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
      success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    });

    $('#formReset').addEventListener('click', () => {
      form.reset();
      $$('.field', form).forEach((f) => f.classList.remove('has-error'));
      success.hidden = true;
      form.hidden = false;
    });
  }

  /* ---------- Jaartal in footer ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  onScroll();
})();
