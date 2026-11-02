/* MV Funderingsscan – beheerportaal (/beheer/).
   Alle gegevens komen van /api/beheer/; autorisatie gebeurt daar, server-side.
   Gegevens worden uitsluitend met textContent in de pagina gezet (geen innerHTML met gebruikersinvoer). */
(function () {
  'use strict';
  const API = '/api/beheer/';
  const view = document.querySelector('[data-view]');
  const main = document.getElementById('main');
  let csrf = ''; let me = null; let md = null;
  const STATUS_LABELS = { ontvangen: 'Aanvraag ontvangen', in_behandeling: 'QuickScan in behandeling', info_nodig: 'Aanvullende informatie nodig', rapport_opstellen: 'Rapport wordt opgesteld', afgerond: 'Rapport afgerond' };
  const MAIL_LABELS = { voorbereid: 'voorbereid', verzonden: 'verzonden (door Resend geaccepteerd)', mislukt: 'mislukt' };
  const KIND_LABELS = { bevestiging: 'Bevestiging met trackinglink', nieuwe_link: 'Nieuwe trackinglink' };

  // ---------------------------------------------------------------- hulpfuncties
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const fmt = (iso) => {
    if (!iso) return '–';
    const p = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(iso));
    const g = (t) => (p.find((x) => x.type === t) || {}).value;
    return `${g('day')} ${MONTHS[Number(g('month')) - 1]} ${g('year')} ${g('hour')}:${g('minute')}`;
  };
  async function api(actie, { method = 'GET', body, params = {} } = {}) {
    const qs = new URLSearchParams({ actie, ...params }).toString();
    const r = await fetch(`${API}?${qs}`, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: method === 'POST' ? { 'Content-Type': 'application/json', 'X-MVFS-CSRF': csrf } : {},
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({ ok: false, error: 'Onverwacht antwoord van de server.' }));
    if (r.status === 401 && actie !== 'inloggen') { me = null; showLogin(actie === 'ik' ? '' : 'Je sessie is verlopen. Log opnieuw in.'); throw new Error('niet ingelogd'); }
    if (!data.ok) throw Object.assign(new Error(data.error || 'Er ging iets mis.'), { status: r.status });
    return data;
  }
  function render(...nodes) { view.textContent = ''; view.append(...nodes.filter((n) => n != null && n !== false)); }
  function flash(el, msg, kind = 'ok') { el.textContent = msg; el.className = `portal-flash portal-flash-${kind}`; el.hidden = !msg; }
  const flashEl = () => h('p', { class: 'portal-flash', role: 'status', hidden: true });
  function busy(btn, on) { btn.disabled = on; btn.classList.toggle('is-loading', on); }
  const badge = (status) => h('span', { class: `portal-badge portal-badge-${status}`, text: STATUS_LABELS[status] || (status === 'gepubliceerd' ? 'Gepubliceerd' : status === 'concept' ? 'Concept' : status) });
  const field = (label, input, hint) => h('div', { class: 'portal-field' }, h('label', { for: input.id, text: label }), input, hint ? h('p', { class: 'portal-hint', id: `${input.id}-hint`, text: hint }) : null);

  // ---------------------------------------------------------------- inloggen
  function showLogin(message) {
    document.querySelector('[data-nav]').hidden = true;
    document.querySelector('[data-user]').hidden = true;
    const msg = flashEl();
    const email = h('input', { id: 'login-email', type: 'email', autocomplete: 'username', required: true });
    const pw = h('input', { id: 'login-pw', type: 'password', autocomplete: 'current-password', required: true });
    const btn = h('button', { type: 'submit', class: 'btn btn-gold btn-block', text: 'Inloggen' });
    const form = h('form', { class: 'portal-card portal-login', novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      if (!email.value || !pw.value) return flash(msg, 'Vul je e-mailadres en wachtwoord in.', 'error');
      busy(btn, true);
      try {
        const r = await api('inloggen', { method: 'POST', body: { email: email.value, wachtwoord: pw.value } });
        csrf = r.csrf; me = r.user; pw.value = '';
        startApp();
      } catch (err) { flash(msg, err.message, 'error'); pw.value = ''; pw.focus(); } finally { busy(btn, false); }
    } },
    h('h1', { class: 'portal-h1', text: 'Inloggen beheer' }),
    h('p', { text: 'Alleen voor medewerkers van MV Funderingsscan.' }),
    field('E-mailadres', email), field('Wachtwoord', pw), msg, btn);
    render(form);
    if (message) flash(msg, message, 'error');
    email.focus();
  }

  function startApp() {
    document.querySelector('[data-nav]').hidden = false;
    document.querySelector('[data-user]').hidden = false;
    document.querySelector('[data-user-name]').textContent = `${me.name} (${me.role})`;
    route();
  }

  document.querySelector('[data-uitloggen]').addEventListener('click', async () => {
    try { await api('uitloggen', { method: 'POST', body: {} }); } catch { /* sessie was al weg */ }
    csrf = ''; me = null; location.hash = '#/'; showLogin('Je bent uitgelogd.');
  });

  // ---------------------------------------------------------------- router
  async function route() {
    if (!me) return;
    if (leaveGuard) { const g = leaveGuard; leaveGuard = null; window.onbeforeunload = null; await g(); }
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    document.querySelectorAll('[data-nav-link]').forEach((a) => a.classList.toggle('is-active', a.dataset.navLink === (parts[0] || 'dashboard')));
    const go = parts[0] === 'nieuws' ? (parts[1] ? editNews(parts[1]) : listNews())
      : parts[0] === 'aanvragen' ? (parts[1] ? showRequest(parts[1]) : listRequests())
        : parts[0] === 'rapporten' ? (parts[1] === 'nieuw' ? newReportDialog() : parts[1] ? editReport(parts[1].split('?')[0], parts[2]) : listReports())
          : parts[0] === 'medewerkers' || parts[0] === 'adviseurs' ? medewerkersPage()
          : parts[0] === 'redactie' ? redactie(parts)
            : dashboard();
    Promise.resolve(go).then(() => main.focus({ preventScroll: true })).catch((err) => { if (err.message !== 'niet ingelogd') render(h('div', { class: 'portal-card' }, h('p', { class: 'portal-error', text: err.message }))); });
  }
  window.addEventListener('hashchange', route);

  // ---------------------------------------------------------------- dashboard
  async function dashboard() {
    render(h('div', { class: 'portal-card' }, h('p', { text: 'Bezig met laden…' })));
    const d = await api('dashboard');
    const stat = (n, label, href) => h('a', { class: 'portal-stat', href }, h('strong', { text: String(n) }), h('span', { text: label }));
    render(
      h('div', { class: 'portal-toolbar' }, h('h1', { class: 'portal-h1', text: `Welkom, ${me.name}` }), h('a', { class: 'btn btn-gold', href: '#/nieuws/nieuw', text: 'Nieuw nieuwsbericht' })),
      h('div', { class: 'portal-stats' },
        stat(d.nieuws.gepubliceerd, 'gepubliceerde berichten', '#/nieuws'),
        stat(d.nieuws.concept, 'concepten', '#/nieuws'),
        stat(d.aanvragen.open, 'openstaande aanvragen', '#/aanvragen'),
        stat(d.aanvragen.per_status.info_nodig || 0, 'wachten op informatie', '#/aanvragen')),
      h('div', { class: 'portal-grid-2' },
        h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Recente nieuwsberichten' }),
          d.nieuws.recent.length ? h('ul', { class: 'portal-list' }, d.nieuws.recent.map((n) => h('li', {}, h('a', { href: `#/nieuws/${n.id}`, text: n.title }), ' ', badge(n.status)))) : h('p', { class: 'portal-muted', text: 'Nog geen berichten.' })),
        h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Recente aanvragen' }),
          d.aanvragen.recent.length ? h('ul', { class: 'portal-list' }, d.aanvragen.recent.map((r) => h('li', {}, h('a', { href: `#/aanvragen/${r.id}`, text: `${r.dossier_nr} – ${r.naam}` }), ' ', badge(r.status)))) : h('p', { class: 'portal-muted', text: 'Nog geen aanvragen.' }))),
    );
  }

  // ---------------------------------------------------------------- nieuws
  async function listNews() {
    const d = await api('nieuws-lijst');
    const rows = d.items.map((n) => h('tr', {},
      h('td', {}, h('a', { href: `#/nieuws/${n.id}`, text: n.title })),
      h('td', {}, badge(n.status)),
      h('td', { text: n.published_at ? fmt(n.published_at) : '–' }),
      h('td', { text: fmt(n.updated_at) })));
    render(
      h('div', { class: 'portal-toolbar' }, h('h1', { class: 'portal-h1', text: 'Nieuwsberichten' }), h('a', { class: 'btn btn-gold', href: '#/nieuws/nieuw', text: 'Nieuw bericht' })),
      d.items.length
        ? h('div', { class: 'portal-card portal-table-wrap' }, h('table', { class: 'portal-table' }, h('thead', {}, h('tr', {}, ['Titel', 'Status', 'Gepubliceerd', 'Laatst gewijzigd'].map((t) => h('th', { scope: 'col', text: t })))), h('tbody', {}, rows)))
        : h('div', { class: 'portal-card' }, h('p', { text: 'Er zijn nog geen nieuwsberichten. Maak je eerste bericht aan.' })),
    );
  }

  const slugify = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' en ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90).replace(/-+$/g, '');

  async function editNews(id) {
    const isNew = id === 'nieuw';
    let item = isNew ? { title: '', slug: '', excerpt: '', meta_description: '', content: '', featured_image_alt: '', show_author: false, status: 'concept' } : (await api('nieuws', { params: { id } })).item;
    if (!md) { try { md = await import('/beheer-markdown.js'); } catch { md = null; } }
    let slugTouched = !isNew;
    const msg = flashEl();
    const title = h('input', { id: 'n-title', type: 'text', maxlength: 140, value: item.title, required: true });
    const slug = h('input', { id: 'n-slug', type: 'text', maxlength: 90, value: item.slug, 'aria-describedby': 'n-slug-hint', pattern: '[a-z0-9]+(-[a-z0-9]+)*' });
    const excerpt = h('textarea', { id: 'n-excerpt', rows: 3, maxlength: 400, 'aria-describedby': 'n-excerpt-hint' }); excerpt.value = item.excerpt;
    const meta = h('textarea', { id: 'n-meta', rows: 2, maxlength: 170, 'aria-describedby': 'n-meta-hint' }); meta.value = item.meta_description;
    const content = h('textarea', { id: 'n-content', rows: 18, class: 'portal-editor', 'aria-describedby': 'n-content-hint' }); content.value = item.content;
    const alt = h('input', { id: 'n-alt', type: 'text', maxlength: 200, value: item.featured_image_alt, 'aria-describedby': 'n-alt-hint' });
    const showAuthor = h('input', { id: 'n-author', type: 'checkbox', checked: item.show_author });
    const preview = h('div', { class: 'portal-preview prose', 'aria-label': 'Voorbeeld van de tekst' });
    const urlInfo = h('p', { class: 'portal-hint' });
    const updatePreview = () => {
      urlInfo.textContent = `Adres: /nieuws/${slug.value || '…'}/`;
      if (md) { preview.innerHTML = md.renderMarkdown(content.value).html; } // renderMarkdown escapet alle invoer
      else preview.textContent = 'Voorbeeld niet beschikbaar.';
    };
    title.addEventListener('input', () => { if (!slugTouched) slug.value = slugify(title.value); updatePreview(); });
    slug.addEventListener('input', () => { slugTouched = true; updatePreview(); });
    content.addEventListener('input', updatePreview);

    const wrapSel = (before, after = before, placeholder = 'tekst') => {
      const { selectionStart: a, selectionEnd: b, value } = content;
      const sel = value.slice(a, b) || placeholder;
      content.setRangeText(`${before}${sel}${after}`, a, b, 'end');
      content.focus(); updatePreview();
    };
    const linePrefix = (prefix) => {
      const { selectionStart: a, value } = content;
      const start = value.lastIndexOf('\n', a - 1) + 1;
      content.setRangeText(prefix, start, start, 'end'); content.focus(); updatePreview();
    };
    const tool = (label, title2, fn) => h('button', { type: 'button', class: 'portal-tool', title: title2, 'aria-label': title2, onclick: fn, text: label });
    const toolbar = h('div', { class: 'portal-tools', role: 'toolbar', 'aria-label': 'Opmaak' },
      tool('H2', 'Tussenkop', () => linePrefix('## ')), tool('H3', 'Kleinere kop', () => linePrefix('### ')),
      tool('B', 'Vet', () => wrapSel('**')), tool('I', 'Cursief', () => wrapSel('*')),
      tool('• Lijst', 'Opsomming', () => linePrefix('- ')), tool('1. Lijst', 'Genummerde lijst', () => linePrefix('1. ')),
      tool('Link', 'Link invoegen', () => { const u = window.prompt('Adres van de link (bijv. /fase-0-funderingsonderzoek/ of https://…)'); if (u) wrapSel('[', `](${u.trim()})`, 'linktekst'); }));

    // afbeelding
    const imgBox = h('div', { class: 'portal-image' });
    const imgMsg = flashEl();
    const fileInput = h('input', { id: 'n-image', type: 'file', accept: 'image/jpeg,image/png,image/webp', disabled: isNew });
    const drawImage = (url) => {
      imgBox.textContent = '';
      if (url) imgBox.append(h('img', { src: url, alt: '' }), h('button', { type: 'button', class: 'btn btn-ghost-dark btn-sm', text: 'Afbeelding verwijderen', onclick: async () => {
        if (!window.confirm('Afbeelding verwijderen?')) return;
        try { await api('nieuws-afbeelding', { method: 'POST', body: { id: item.id, verwijderen: true } }); item.image_url = null; drawImage(null); } catch (e) { flash(imgMsg, e.message, 'error'); }
      } }));
    };
    drawImage(item.image_url);
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files[0]; if (!f) return;
      flash(imgMsg, 'Afbeelding wordt verkleind en geüpload…');
      try {
        const data = await resizeImage(f, 1600);
        const r = await api('nieuws-afbeelding', { method: 'POST', body: { id: item.id, type: 'image/jpeg', data, alt: alt.value } });
        item.image_url = r.image_url; drawImage(r.image_url); flash(imgMsg, 'Afbeelding opgeslagen. Vergeet de beschrijving (alt-tekst) niet.');
      } catch (e) { flash(imgMsg, e.message, 'error'); }
      fileInput.value = '';
    });

    const collect = () => ({ id: item.id, title: title.value, slug: slug.value, excerpt: excerpt.value, meta_description: meta.value, content: content.value, featured_image_alt: alt.value, show_author: showAuthor.checked });
    const save = async (btn) => {
      busy(btn, true);
      try {
        const r = await api('nieuws-opslaan', { method: 'POST', body: collect() });
        flash(msg, 'Opgeslagen.');
        if (isNew) { location.hash = `#/nieuws/${r.item.id}`; return null; }
        item = { ...item, ...r.item }; return r.item;
      } catch (e) { flash(msg, e.message, 'error'); return null; } finally { busy(btn, false); }
    };
    const saveBtn = h('button', { type: 'button', class: 'btn btn-gold', text: isNew ? 'Opslaan als concept' : 'Opslaan', onclick: () => save(saveBtn) });
    const pubBtn = h('button', { type: 'button', class: 'btn btn-ghost-dark', text: item.status === 'gepubliceerd' ? 'Terug naar concept' : 'Publiceren', hidden: isNew, onclick: async () => {
      const to = item.status === 'gepubliceerd' ? 'concept' : 'gepubliceerd';
      if (to === 'gepubliceerd' && !window.confirm('Dit bericht publiceren? Het is daarna binnen ongeveer een minuut openbaar zichtbaar.')) return;
      if (!(await save(pubBtn))) return;
      busy(pubBtn, true);
      try {
        const r = await api('nieuws-status', { method: 'POST', body: { id: item.id, status: to } });
        item = { ...item, ...r.item };
        statusBadge.replaceWith(statusBadge = badge(item.status));
        pubBtn.textContent = item.status === 'gepubliceerd' ? 'Terug naar concept' : 'Publiceren';
        viewLink.hidden = item.status !== 'gepubliceerd'; viewLink.href = `/nieuws/${item.slug}/`;
        flash(msg, item.status === 'gepubliceerd' ? 'Gepubliceerd.' : 'Teruggezet naar concept; het bericht is niet meer openbaar.');
      } catch (e) { flash(msg, e.message, 'error'); } finally { busy(pubBtn, false); }
    } });
    const previewLink = h('a', { class: 'btn btn-ghost-dark', href: isNew ? '#' : `${API}?actie=nieuws-voorbeeld&id=${encodeURIComponent(item.id)}`, target: '_blank', rel: 'noopener', hidden: isNew, text: 'Voorbeeld bekijken' });
    const viewLink = h('a', { class: 'btn btn-ghost-dark', href: `/nieuws/${item.slug}/`, target: '_blank', rel: 'noopener', hidden: item.status !== 'gepubliceerd', text: 'Bekijk online' });
    const delBtn = h('button', { type: 'button', class: 'btn btn-danger', text: 'Verwijderen', hidden: isNew, onclick: async () => {
      if (!window.confirm(`"${item.title}" definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
      try { await api('nieuws-verwijderen', { method: 'POST', body: { id: item.id, bevestig: true } }); location.hash = '#/nieuws'; } catch (e) { flash(msg, e.message, 'error'); }
    } });
    let statusBadge = badge(item.status);

    render(
      h('div', { class: 'portal-toolbar' }, h('h1', { class: 'portal-h1', text: isNew ? 'Nieuw nieuwsbericht' : 'Bericht bewerken' }), statusBadge),
      h('p', {}, h('a', { href: '#/nieuws', text: '← Alle berichten' })),
      h('div', { class: 'portal-grid-editor' },
        h('div', { class: 'portal-card' },
          field('Titel', title),
          field('URL (slug)', slug, 'Kleine letters, cijfers en streepjes. Wijzig je dit na publicatie, dan werkt het oude adres niet meer.'), urlInfo,
          field('Introductie', excerpt, 'Korte samenvatting (max. 400 tekens). Verschijnt in het overzicht en bovenaan het artikel.'),
          field('Meta description (optioneel)', meta, 'Tekst voor zoekmachines, max. 170 tekens. Leeg = de introductie.'),
          h('div', { class: 'portal-field' }, h('label', { for: 'n-content', text: 'Artikeltekst' }), toolbar, content,
            h('p', { class: 'portal-hint', id: 'n-content-hint', text: 'Opmaak: ## tussenkop, ### kleinere kop, **vet**, *cursief*, - opsomming, 1. genummerd, [linktekst](/pagina/). HTML wordt niet uitgevoerd. Verzin geen feiten, data of bronnen.' })),
          h('div', { class: 'portal-field' }, h('label', { for: 'n-image', text: 'Uitgelichte afbeelding (optioneel)' }), isNew ? h('p', { class: 'portal-hint', text: 'Sla het bericht eerst op om een afbeelding toe te voegen.' }) : null, fileInput, imgBox, imgMsg),
          field('Beschrijving van de afbeelding (alt-tekst)', alt, 'Beschrijf wat er op de afbeelding te zien is. Verplicht bij publiceren met afbeelding.'),
          h('div', { class: 'portal-check' }, showAuthor, h('label', { for: 'n-author', text: 'Toon de naam van de auteur bij het bericht' })),
          msg,
          h('div', { class: 'portal-actions' }, saveBtn, pubBtn, previewLink, viewLink, delBtn)),
        h('div', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Voorbeeld van de tekst' }), preview)),
    );
    updatePreview();
    title.focus();
  }

  function resizeImage(file, max) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('Kies een JPEG-, PNG- of WebP-afbeelding.'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85).split(',')[1]); // opnieuw opgeslagen als JPEG: EXIF-gegevens verdwijnen
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('De afbeelding kan niet worden gelezen.')); };
      img.src = url;
    });
  }

  // ---------------------------------------------------------------- QuickScan-rapporten
  const RSTATUS = { concept: 'Concept', in_uitvoering: 'In uitvoering', wacht_op_info: 'Wacht op aanvullende informatie', gereed_voor_controle: 'Gereed voor controle', definitief: 'Definitief', verzonden: 'Verzonden aan klant' };
  const RISICO = { laag: 'Laag risico', midden: 'Midden risico', hoog: 'Hoog risico' };
  const STAPPEN = [
    ['voorblad', 'Voorblad'], ['algemeen', 'A. Opdracht / opname'], ['object', 'B. Object'], ['vraagstelling', 'C. Vraagstelling'],
    ['conclusie', 'D. Conclusie'], ['bouwtekeningen', 'E. Bouwtekeningen'], ['bodem', 'F. Bodemdalingskaart'], ['omgeving', 'G. Omgevingsfactoren'],
    ['lintvoeg', 'H. Lintvoegmeting'], ['schietlood', 'I. Schietloodmeting'], ['afronden', 'Uitkomst en afronden'],
  ];
  let leaveGuard = null; // wordt aangeroepen voordat je het rapport verlaat (automatisch opslaan)
  const rbadge = (st) => h('span', { class: `portal-badge portal-badge-r-${st}`, text: RSTATUS[st] || st });
  const riskBadge = (r) => (r ? h('span', { class: `portal-badge portal-risk-${r}`, text: RISICO[r] }) : h('span', { class: 'portal-muted', text: '–' }));
  const datumKort = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.split('-').reverse().join('-') : '–');

  async function listReports() {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const q = h('input', { id: 'rp-q', type: 'search', value: params.get('q') || '', placeholder: 'Rapportnummer, adres of opdrachtgever' });
    const st = h('select', { id: 'rp-status' }, h('option', { value: '', text: 'Alle statussen' }), Object.entries(RSTATUS).map(([k, v]) => h('option', { value: k, text: v })));
    st.value = params.get('status') || '';
    const msg = flashEl();
    const results = h('div', { class: 'portal-card portal-table-wrap', 'aria-live': 'polite' }, h('p', { text: 'Bezig met laden…' }));
    const load = async () => {
      const d = await api('rapporten', { params: { q: q.value.trim(), status: st.value } });
      results.textContent = '';
      if (!d.items.length) {
        results.append(h('div', { class: 'portal-empty' }, h('p', { text: q.value || st.value ? 'Geen rapporten gevonden.' : 'Er zijn nog geen QuickScan-rapporten.' }), q.value || st.value ? null : h('p', { class: 'portal-muted', text: 'Klik op "Nieuw rapport" om het eerste rapport te maken.' })));
        return;
      }
      results.append(h('table', { class: 'portal-table' },
        h('thead', {}, h('tr', {}, ['Rapportnummer', 'Adres object', 'Opdrachtgever', 'Inspectie', 'Adviseur', 'Status', 'Risico', 'Gewijzigd', ''].map((t) => h('th', { scope: 'col', text: t })))),
        h('tbody', {}, d.items.map((r) => h('tr', {},
          h('td', {}, h('a', { href: `#/rapporten/${r.id}`, text: r.report_nr })), h('td', { text: r.adres || '–' }), h('td', { text: r.opdrachtgever || '–' }),
          h('td', { text: datumKort(r.inspectiedatum) }), h('td', { text: r.adviseur || '–' }), h('td', {}, rbadge(r.status)), h('td', {}, riskBadge(r.risk)),
          h('td', { text: fmt(r.updated_at) }), h('td', {}, h('a', { class: 'btn btn-ghost-dark btn-sm', href: `#/rapporten/${r.id}`, text: 'Openen' })))))));
    };
    const form = h('form', { class: 'portal-filter', role: 'search', onsubmit: (e) => { e.preventDefault(); load().catch((err) => flash(msg, err.message, 'error')); } },
      field('Zoeken', q), field('Status', st), h('button', { type: 'submit', class: 'btn btn-gold', text: 'Zoeken' }));
    st.addEventListener('change', () => form.requestSubmit());
    render(
      h('div', { class: 'portal-toolbar' }, h('h1', { class: 'portal-h1', text: 'QuickScan-rapporten' }),
        h('div', { class: 'portal-actions' },
          h('a', { class: 'btn btn-ghost-dark', href: '#/medewerkers', text: 'Medewerkers' }),
          h('a', { class: 'btn btn-gold', href: '#/rapporten/nieuw', text: 'Nieuw rapport' }))),
      h('div', { class: 'portal-card' }, form, msg), results);
    await load();
  }

  async function newReportDialog() {
    const msg = flashEl();
    const sel = h('select', { id: 'nr-aanvraag' }, h('option', { value: '', text: 'Zonder aanvraag (handmatig invullen)' }));
    try {
      const d = await api('aanvragen');
      d.items.forEach((r) => sel.append(h('option', { value: r.id, text: `${r.dossier_nr} – ${r.naam}${r.plaats ? `, ${r.plaats}` : ''}` })));
    } catch { /* geen aanvragen beschikbaar */ }
    const btn = h('button', { type: 'submit', class: 'btn btn-gold', text: 'Rapport aanmaken' });
    render(h('form', { class: 'portal-card portal-narrow', onsubmit: async (e) => {
      e.preventDefault(); busy(btn, true);
      try { const r = await api('rapport-nieuw', { method: 'POST', body: { request_id: sel.value || undefined } }); location.hash = `#/rapporten/${r.id}/voorblad`; }
      catch (err) { flash(msg, err.message, 'error'); busy(btn, false); }
    } },
    h('h1', { class: 'portal-h1', text: 'Nieuw QuickScan-rapport' }),
    h('p', { text: 'Koppel het rapport aan een bestaande QuickScan-aanvraag. Naam, adres en contactgegevens worden dan overgenomen. Het rapportnummer wordt automatisch toegekend.' }),
    field('QuickScan-aanvraag', sel), msg, h('div', { class: 'portal-actions' }, btn, h('a', { class: 'btn btn-ghost-dark', href: '#/rapporten', text: 'Annuleren' }))));
  }

  async function editReport(id, stap, melding) {
    stap = STAPPEN.some(([k]) => k === stap) ? stap : 'voorblad';
    const d = await api('rapport', { params: { id } });
    const r = d.report;
    const data = JSON.parse(JSON.stringify(r.data || {}));
    for (const [k] of STAPPEN) if (k !== 'afronden' && k !== 'voorblad') data[k] = data[k] || {};
    data.voorblad = data.voorblad || {};
    let advisorId = r.advisor_id || '';
    let status = r.status;
    let controle = d.controle;
    let dirty = false;
    const kanBewerken = d.bewerkbaar;
    const opslagKey = `mvfs-rapport-${r.id}-v${r.version}`;
    // Herstel van niet-opgeslagen invoer (bijv. na een verbroken verbinding)
    try {
      const lokaal = JSON.parse(localStorage.getItem(opslagKey) || 'null');
      if (lokaal && kanBewerken && lokaal.t > Date.parse(r.updated_at) && window.confirm('Er staan niet-opgeslagen wijzigingen van dit rapport in deze browser. Wil je die terugzetten?')) Object.assign(data, lokaal.data);
      else if (lokaal) localStorage.removeItem(opslagKey);
    } catch { /* geen lokale opslag */ }
    const markeer = () => { dirty = true; try { localStorage.setItem(opslagKey, JSON.stringify({ t: Date.now(), data })); } catch { /* */ } saveState.textContent = 'Niet opgeslagen wijzigingen'; };
    const saveState = h('span', { class: 'portal-muted portal-savestate', text: 'Opgeslagen' });
    const msg = flashEl();

    async function opslaan(stil) {
      if (!kanBewerken || !dirty) return true;
      saveState.textContent = 'Bezig met opslaan…';
      try {
        const res = await api('rapport-opslaan', { method: 'POST', body: { id: r.id, data, advisor_id: advisorId || null, status } });
        controle = res.controle; dirty = false; saveState.textContent = `Opgeslagen om ${fmt(new Date().toISOString()).split(' ').pop()}`;
        try { localStorage.removeItem(opslagKey); } catch { /* */ }
        updateNav();
        return true;
      } catch (err) {
        saveState.textContent = 'Opslaan mislukt'; if (!stil) flash(msg, `${err.message} Je invoer staat nog in deze browser.`, 'error');
        return false;
      }
    }
    leaveGuard = () => opslaan(true);
    window.onbeforeunload = () => (dirty ? 'Er zijn niet-opgeslagen wijzigingen.' : undefined);

    // --- invoervelden (gekoppeld aan data[sectie][veld])
    const inp = (sectie, veld, label, opts = {}) => {
      const fid = `f-${sectie}-${veld}`;
      const el = opts.textarea ? h('textarea', { id: fid, rows: opts.rows || 4, maxlength: opts.max || 400 }) : h('input', { id: fid, type: opts.type || 'text', maxlength: opts.max || 160, inputmode: opts.inputmode || null, placeholder: opts.placeholder || null });
      el.value = (data[sectie] || {})[veld] || '';
      el.disabled = !kanBewerken;
      el.addEventListener('input', () => { data[sectie][veld] = el.value; markeer(); opts.onInput && opts.onInput(); });
      const fout = (controle.fouten || []).some((f) => f.stap === sectie && f.veld === veld);
      const wrap = field(label, el, opts.hint);
      if (fout) wrap.classList.add('portal-field-missing');
      return wrap;
    };
    const keuze = (sectie, veld, label, opties, onChange) => {
      const name = `k-${sectie}-${veld}`;
      const fs = h('fieldset', { class: 'portal-field portal-choice' }, h('legend', { text: label }),
        opties.map(([v, l]) => {
          const radio = h('input', { type: 'radio', name, value: v, checked: (data[sectie] || {})[veld] === v, disabled: !kanBewerken });
          radio.addEventListener('change', () => { data[sectie][veld] = v; markeer(); onChange && onChange(); });
          return h('label', { class: 'portal-radio' }, radio, ' ', l);
        }));
      if ((controle.fouten || []).some((f) => f.stap === sectie && f.veld === veld)) fs.classList.add('portal-field-missing');
      return fs;
    };
    // Vaste keuzelijst (opties komen van de server, zodat formulier en controle gelijk blijven)
    const kies = (sectie, veld, label, sleutel, opts = {}) => {
      const fid = `f-${sectie}-${veld}`;
      const opties = (d.keuzes || {})[sleutel] || [];
      const huidig = (data[sectie] || {})[veld] || '';
      const sel = h('select', { id: fid, disabled: !kanBewerken }, h('option', { value: '', text: 'Kies…' }),
        opties.map((o) => h('option', { value: o, text: o })),
        huidig && !opties.includes(huidig) ? h('option', { value: huidig, text: `${huidig} (eerder ingevuld, kies opnieuw)` }) : null);
      sel.value = huidig;
      sel.addEventListener('change', () => { data[sectie][veld] = sel.value; markeer(); opts.onInput && opts.onInput(); });
      const wrap = field(label, sel, opts.hint);
      if ((controle.fouten || []).some((f) => f.stap === sectie && f.veld === veld)) wrap.classList.add('portal-field-missing');
      return wrap;
    };
    const vinkje = (sectie, veld, label, onChange) => {
      const c = h('input', { type: 'checkbox', id: `v-${sectie}-${veld}`, checked: data[sectie][veld] === true, disabled: !kanBewerken });
      c.addEventListener('change', () => { data[sectie][veld] = c.checked; markeer(); onChange && onChange(); });
      return h('div', { class: 'portal-check' }, c, h('label', { for: c.id, text: label }));
    };
    const vast = (rows) => h('dl', { class: 'portal-dl portal-vast' }, rows.map(([k, v]) => h('div', { class: 'portal-dl-row' }, h('dt', { text: k }), h('dd', { text: v }))));

    // --- fotovakken
    const fotos = d.fotos;
    const fotoVak = (slot, position, label, naWijziging) => {
      const box = h('div', { class: 'portal-avatar' });
      const teken = () => {
        box.textContent = '';
        const f = fotos.find((x) => x.slot === slot && x.position === position);
        const fmsg = flashEl();
        const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', id: `foto-${slot}-${position}`, disabled: !kanBewerken });
        file.addEventListener('change', async () => {
          const fl = file.files[0]; if (!fl) return;
          flash(fmsg, 'Foto wordt verkleind en geüpload…');
          try {
            const b64 = await resizeImage(fl, 2000);
            const res = await api('rapport-foto', { method: 'POST', body: { id: r.id, slot, position, type: 'image/jpeg', data: b64, caption: f?.caption || '' } });
            const i = fotos.findIndex((x) => x.slot === slot && x.position === position);
            if (i >= 0) fotos.splice(i, 1);
            fotos.push(res.foto); (naWijziging || teken)(); refreshControle();
          } catch (err) { flash(fmsg, err.message, 'error'); }
          file.value = '';
        });
        box.append(h('p', { class: 'portal-foto-label', text: label }));
        if (f) {
          const cap = h('input', { type: 'text', maxlength: 200, value: f.caption || '', placeholder: 'Bijschrift (optioneel)', 'aria-label': `Bijschrift ${label}`, disabled: !kanBewerken });
          cap.addEventListener('change', () => api('rapport-foto-bijschrift', { method: 'POST', body: { id: r.id, foto_id: f.id, caption: cap.value } }).then(() => { f.caption = cap.value; flash(fmsg, 'Bijschrift opgeslagen.'); }).catch((err) => flash(fmsg, err.message, 'error')));
          box.append(h('img', { src: f.url, alt: label }), cap,
            kanBewerken ? h('div', { class: 'portal-actions' },
              h('label', { class: 'btn btn-ghost-dark btn-sm portal-file', for: file.id }, 'Vervangen'), file,
              h('button', { type: 'button', class: 'btn btn-danger btn-sm', text: 'Verwijderen', onclick: async () => {
                if (!window.confirm('Deze foto verwijderen?')) return;
                try { await api('rapport-foto-verwijderen', { method: 'POST', body: { id: r.id, foto_id: f.id } }); fotos.splice(fotos.indexOf(f), 1); (naWijziging || teken)(); refreshControle(); } catch (err) { flash(fmsg, err.message, 'error'); }
              } })) : null, fmsg);
        } else {
          box.append(h('div', { class: 'portal-foto-leeg', text: 'Nog geen foto' }), kanBewerken ? h('label', { class: 'btn btn-gold btn-sm portal-file', for: file.id }, 'Foto kiezen') : null, file, fmsg);
        }
      };
      teken();
      return box;
    };
    // Reeks foto's bij één onderdeel: ingevulde foto's plus één leeg vak, tot het maximum (4).
    const fotoReeks = (slot, label) => {
      const max = (d.slots || {})[slot] || 1;
      const box = h('div', { class: 'portal-foto-reeks' });
      const teken = () => {
        box.textContent = '';
        const lijst = fotos.filter((x) => x.slot === slot).sort((a, b) => a.position - b.position);
        const rij = h('div', { class: 'portal-foto-rij' }, lijst.map((f, i) => fotoVak(slot, f.position, `${label} ${i + 1}`, teken)));
        if (lijst.length < max && kanBewerken) {
          const vrij = [1, 2, 3].find((n) => n <= max && !lijst.some((x) => x.position === n));
          rij.append(fotoVak(slot, vrij, lijst.length ? `${label} ${lijst.length + 1} (optioneel)` : `${label} 1 (verplicht)`, teken));
        }
        box.append(h('p', { class: 'portal-label', text: label === 'Foto' ? 'Foto\'s' : 'Afbeeldingen' }),
          h('p', { class: 'portal-hint', text: `Minimaal 1, maximaal ${max} (${lijst.length} van ${max} toegevoegd). In het rapport komen ze naast elkaar onderaan dit hoofdstuk.` }), rij);
      };
      teken();
      return box;
    };
    const refreshControle = async () => { try { const x = await api('rapport', { params: { id: r.id } }); controle = x.controle; updateNav(); } catch { /* */ } };

    // --- meettabel
    const meettabel = (sectie, minRijen) => {
      data[sectie].rijen = Array.isArray(data[sectie].rijen) && data[sectie].rijen.length ? data[sectie].rijen : Array.from({ length: minRijen }, () => ({ omschrijving: '', meting: '', afstand: '', typering: '' }));
      const tbody = h('tbody');
      const rot = (m, a) => { const mm = Math.abs(parseFloat(String(m).replace(',', '.'))); const af = parseFloat(String(a).replace(',', '.')); if (!(mm > 0) || !(af > 0)) return ''; const n = af / mm; return `1:${Math.round(n)} → tabel: ${n > 300 ? 'Zeer klein' : n > 200 ? 'Klein' : n > 100 ? 'Matig' : n >= 75 ? 'Groot' : 'Zeer groot'}`; };
      const teken = () => {
        tbody.textContent = '';
        data[sectie].rijen.forEach((rij, i) => {
          const hint = h('span', { class: 'portal-hint', text: rot(rij.meting, rij.afstand) });
          const typSel = () => {
            const opties = (d.keuzes || {}).typering || [];
            const e = h('select', { 'aria-label': `Schadetypering regel ${i + 1}`, disabled: !kanBewerken }, h('option', { value: '', text: 'Kies…' }), opties.map((o) => h('option', { value: o, text: o })),
              rij.typering && !opties.includes(rij.typering) ? h('option', { value: rij.typering, text: `${rij.typering} (kies opnieuw)` }) : null);
            e.value = rij.typering || '';
            e.addEventListener('change', () => { rij.typering = e.value; markeer(); });
            return e;
          };
          const cel = (k, ph, num) => { const e = h('input', { type: 'text', value: rij[k] || '', placeholder: ph, inputmode: num ? 'decimal' : null, 'aria-label': `${ph} regel ${i + 1}`, disabled: !kanBewerken }); e.addEventListener('input', () => { rij[k] = e.value; markeer(); hint.textContent = rot(rij.meting, rij.afstand); }); return e; };
          tbody.append(h('tr', {}, h('td', {}, cel('omschrijving', 'Omschrijving')), h('td', {}, cel('meting', 'mm', true)), h('td', {}, cel('afstand', 'mm', true)),
            h('td', {}, typSel(), hint),
            h('td', {}, kanBewerken ? h('button', { type: 'button', class: 'btn btn-link', text: 'Verwijderen', 'aria-label': `Meetregel ${i + 1} verwijderen`, onclick: () => { data[sectie].rijen.splice(i, 1); markeer(); teken(); } }) : null)));
        });
      };
      teken();
      return h('div', { class: 'portal-field' },
        h('p', { class: 'portal-label', text: 'Meetgegevens' }),
        h('div', { class: 'portal-table-wrap' }, h('table', { class: 'portal-table portal-meet' }, h('thead', {}, h('tr', {}, ['Omschrijving', 'Meting (mm)', 'Afstand (mm)', 'Schadetypering', ''].map((t) => h('th', { scope: 'col', text: t })))), tbody)),
        kanBewerken ? h('button', { type: 'button', class: 'btn btn-ghost-dark btn-sm', text: '+ Meetregel toevoegen', onclick: () => { data[sectie].rijen.push({ omschrijving: '', meting: '', afstand: '', typering: '' }); markeer(); teken(); } }) : null,
        h('p', { class: 'portal-hint', text: 'Ter controle staat de verhouding (afstand ÷ meting) en de klasse volgens de tabel in het rapport erbij. De schadetypering kies je zelf; de applicatie bepaalt die niet.' }));
    };

    // --- stappen
    const adviseurSel = h('select', { id: 'f-adviseur', disabled: !kanBewerken }, h('option', { value: '', text: 'Kies adviseur' }), d.advisors.map((a) => h('option', { value: a.id, text: a.name })));
    adviseurSel.value = advisorId;
    const certTekst = h('p', { class: 'portal-hint' });
    const toonCert = () => { const a = d.advisors.find((x) => x.id === adviseurSel.value); certTekst.textContent = a ? `Certificaatnummer: ${a.certificate}` : 'Het certificaatnummer wordt automatisch ingevuld.'; };
    adviseurSel.addEventListener('change', () => { advisorId = adviseurSel.value; toonCert(); markeer(); });
    toonCert();
    const statusSel = h('select', { id: 'f-status', disabled: !kanBewerken }, Object.entries(RSTATUS).filter(([k]) => ['concept', 'in_uitvoering', 'wacht_op_info', 'gereed_voor_controle'].includes(k)).map(([k, v]) => h('option', { value: k, text: v })));
    if (kanBewerken) statusSel.value = status;
    statusSel.addEventListener('change', () => { status = statusSel.value; markeer(); });

    const vsZin = h('p', { class: 'portal-preview-zin' });
    const zin = () => { const q = data.vraagstelling || {}; const a = data.algemeen || {}; const v = data.voorblad || {}; const x = (t, ph) => t || `[ ${ph} ]`; const dNl = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? new Date(`${iso}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : iso);
      vsZin.textContent = `Op ${x(dNl(q.datum || a.inspectie_datum), 'datum')} heeft MV Funderingsscan B.V. in opdracht van ${x(a.opdrachtgever_naam, 'naam opdrachtgever')} een funderingsrisico Fase 0 (QuickScan) uitgevoerd in verband met ${x(q.reden, 'reden')} van het pand ${x(v.object_straat, 'adres')} te ${x(v.object_plaats, 'plaats')}. Het omvat een bestaand pand met een ${x(q.bestemming, 'bestemming')}. Met betrekking tot de fundering dient te worden aangetoond dat de fundering geen risico heeft op funderingsproblemen.`; };

    // Adres aanvullen op postcode + huisnummer (open data: PDOK/BAG). Vult alleen in; de adviseur controleert.
    const nrUit = (straat) => (/(\d+\s*[A-Za-z]?(?:-\s*\w{1,4})?)\s*$/.exec(String(straat || '')) || [])[1] || '';
    const adresZoeker = (sectie, velden) => {
      const hn = h('input', { type: 'text', id: `hn-${sectie}`, maxlength: 12, placeholder: 'bijv. 12a', value: nrUit(data[sectie][velden.straat]), disabled: !kanBewerken });
      const zmsg = flashEl();
      const knop = h('button', { type: 'button', class: 'btn btn-ghost-dark btn-sm', text: 'Adres opzoeken', disabled: !kanBewerken, onclick: async () => {
        const pc = data[sectie][velden.postcode] || '';
        if (!pc.trim() || !hn.value.trim()) { flash(zmsg, 'Vul eerst de postcode en het huisnummer in.', 'error'); return; }
        busy(knop, true);
        try {
          const antw = await fetch(`/api/adres/?postcode=${encodeURIComponent(pc)}&huisnummer=${encodeURIComponent(hn.value)}`, { headers: { Accept: 'application/json' } });
          const b = await antw.json();
          if (!b.ok) { flash(zmsg, b.error || 'Adres niet gevonden.', 'error'); return; }
          const a = b.adres;
          data[sectie][velden.straat] = a.straat_huisnummer; data[sectie][velden.postcode] = a.postcode; data[sectie][velden.plaats] = a.plaats;
          const extra = [];
          if (velden.bouwjaar && a.bouwjaar && !data.object.bouwjaar) { data.object.bouwjaar = String(a.bouwjaar); extra.push(`bouwjaar ${a.bouwjaar} (BAG) bij B. Object ingevuld`); }
          markeer(); await opslaan(true);
          await editReport(r.id, stap, `Adres ingevuld: ${a.straat_huisnummer}, ${a.postcode} ${a.plaats}${extra.length ? `; ${extra.join('; ')}` : ''}. Controleer de gegevens.`);
        } catch { flash(zmsg, 'Adres opzoeken lukt nu niet. Vul het adres zelf in.', 'error'); } finally { busy(knop, false); }
      } });
      return h('div', { class: 'portal-lookup' }, field('Huisnummer (om op te zoeken)', hn), knop, zmsg);
    };
    const weerKnop = () => {
      const wmsg = flashEl();
      const knop = h('button', { type: 'button', class: 'btn btn-ghost-dark btn-sm', text: 'Weergegevens ophalen', disabled: !kanBewerken, onclick: async () => {
        busy(knop, true);
        try {
          await opslaan(true);
          const w = await api('rapport-weer', { params: { id: r.id } });
          data.object.weertype = w.weer.weertype || data.object.weertype; data.object.temperatuur = w.weer.temperatuur; data.object.luchtvochtigheid = w.weer.luchtvochtigheid;
          markeer(); await opslaan(true);
          await editReport(r.id, 'object', `Weergegevens ingevuld voor ${w.weer.uur}:00 uur (${w.bron}). Dit zijn modelgegevens voor de omgeving: controleer ze en pas aan als je ter plaatse iets anders hebt gemeten.`);
        } catch (err) { flash(wmsg, err.message, 'error'); } finally { busy(knop, false); }
      } });
      return h('div', { class: 'portal-lookup' }, knop, h('p', { class: 'portal-hint', text: 'Haalt weertype, temperatuur en luchtvochtigheid op voor de inspectiedatum en -tijd bij het objectadres (Open-Meteo).' }), wmsg);
    };

    const STAP = {
      voorblad: () => [
        h('h2', { class: 'portal-h2', text: 'Voorblad' }),
        d.aanvraag ? h('p', { class: 'portal-note' }, `Gekoppeld aan QuickScan-aanvraag ${d.aanvraag.dossier_nr}. Gegevens uit de aanvraag zijn overgenomen.`) : null,
        h('div', { class: 'portal-grid-form' },
          inp('voorblad', 'object_straat', 'Straat en huisnummer (object)'), inp('voorblad', 'object_postcode', 'Postcode (object)', { max: 10, placeholder: '8919 AA' }),
          inp('voorblad', 'object_plaats', 'Plaats (object)'), inp('voorblad', 'uitgebracht_op', 'Uitgebracht op', { type: 'date' })),
        adresZoeker('voorblad', { straat: 'object_straat', postcode: 'object_postcode', plaats: 'object_plaats', bouwjaar: true }),
        h('div', { class: 'portal-grid-form' },
          field('Naam adviseur', adviseurSel), h('div', {}, certTekst), field('Status van het rapport', statusSel)),
        fotoVak('voorblad', 1, 'Foto voorblad'),
      ],
      algemeen: () => [
        h('h2', { class: 'portal-h2', text: 'A. Opdracht / opname' }),
        h('div', { class: 'portal-grid-form' },
          inp('algemeen', 'inspectie_datum', 'Inspectiedatum', { type: 'date', onInput: zin }), inp('algemeen', 'inspectie_tijd', 'Inspectietijd', { type: 'time' }),
          inp('algemeen', 'opdrachtgever_naam', 'Naam opdrachtgever'), inp('algemeen', 'opdrachtgever_straat', 'Straat en huisnummer opdrachtgever'),
          inp('algemeen', 'opdrachtgever_postcode', 'Postcode opdrachtgever', { max: 10 }), inp('algemeen', 'opdrachtgever_plaats', 'Plaats opdrachtgever')),
        h('div', { class: 'portal-actions' }, adresZoeker('algemeen', { straat: 'opdrachtgever_straat', postcode: 'opdrachtgever_postcode', plaats: 'opdrachtgever_plaats' }),
          kanBewerken ? h('button', { type: 'button', class: 'btn btn-link portal-link-plain', text: 'Zelfde adres als het object', onclick: async () => {
            Object.assign(data.algemeen, { opdrachtgever_straat: data.voorblad.object_straat || '', opdrachtgever_postcode: data.voorblad.object_postcode || '', opdrachtgever_plaats: data.voorblad.object_plaats || '' });
            markeer(); await opslaan(true); await editReport(r.id, 'algemeen');
          } }) : null),
        h('p', { class: 'portal-label', text: 'Vaste gegevens in het rapport' }),
        vast([['Onderzoeksmethode', 'Fase 0 Funderingsrisico-onderzoek'], ['Toegepaste richtlijn', 'KCAF (Quickscan)'], ['Afmeldorganisatie', 'MV Funderingsscan B.V.'], ['Naam kantoor', 'MV Funderingsscan B.V.'], ['Adres kantoor', 'Mr. P.J. Troelstraweg 149 unit 23, 8919 AA Leeuwarden'], ['Telefoon kantoor', '058 – 2037 172']]),
      ],
      object: () => [
        h('h2', { class: 'portal-h2', text: 'B. Object' }),
        h('p', { class: 'portal-hint', text: `Adres: ${[data.voorblad.object_straat, data.voorblad.object_postcode, data.voorblad.object_plaats].filter(Boolean).join(', ') || 'vul het adres in bij het voorblad'}` }),
        h('div', { class: 'portal-grid-form' },
          kies('object', 'type', 'Type woning / object', 'object.type'), inp('object', 'bouwjaar', 'Bouwjaar', { max: 10, inputmode: 'numeric', placeholder: 'jaartal of "onbekend"' }),
          kies('object', 'weertype', 'Weertype', 'object.weertype'), inp('object', 'temperatuur', 'Temperatuur (°C)', { max: 6, inputmode: 'decimal' }),
          inp('object', 'luchtvochtigheid', 'Luchtvochtigheid (%)', { max: 6, inputmode: 'decimal' })),
        kanBewerken ? weerKnop() : null,
      ],
      vraagstelling: () => { zin(); return [
        h('h2', { class: 'portal-h2', text: 'C. Vraagstelling' }),
        h('div', { class: 'portal-grid-form' },
          inp('vraagstelling', 'datum', 'Datum', { type: 'date', onInput: zin, hint: 'Leeg = de inspectiedatum.' }), kies('vraagstelling', 'reden', 'Reden van het onderzoek', 'vraagstelling.reden', { onInput: zin }),
          kies('vraagstelling', 'bestemming', 'Bestemming van het pand', 'vraagstelling.bestemming', { onInput: zin })),
        h('p', { class: 'portal-label', text: 'Zo komt de tekst in het rapport' }), vsZin,
        h('p', { class: 'portal-note portal-note-warn' }, 'Aandachtspunt: de vaste slotzin ("…dient te worden aangetoond dat de fundering geen risico heeft…") is stellig voor een Fase 0-onderzoek. Laat deze formulering inhoudelijk goedkeuren; de applicatie past hem niet aan.'),
      ]; },
      conclusie: () => [
        h('h2', { class: 'portal-h2', text: 'D. Conclusie' }),
        h('p', { text: 'Uit de visuele opname, de meetgegevens en het onderzoek maken wij het volgende op:' }),
        keuze('conclusie', 'risico', 'Geconstateerd funderingsrisico', [['laag', 'Laag funderingsrisico'], ['midden', 'Midden funderingsrisico'], ['hoog', 'Hoog funderingsrisico']], () => { data.conclusie.risico_bevestigd = false; bevestig.checked = false; }),
        (() => { return h('div', {}, vinkje('conclusie', 'risico_bevestigd', 'Ik bevestig deze risicocategorie op basis van het uitgevoerde onderzoek.')); })(),
        inp('conclusie', 'advies', 'Advies', { textarea: true, rows: 6, max: 4000 }),
        h('div', { class: 'portal-grid-form' }, inp('conclusie', 'opmaak_plaats', 'Plaats van opmaak'), inp('conclusie', 'opmaak_datum', 'Datum van opmaak', { type: 'date' })),
        h('p', { class: 'portal-hint', text: 'De vaste teksten (beperkingen, geldigheidsduur van 6 maanden, klimaatverandering en ondertekening) komen ongewijzigd uit het rapportsjabloon. Het pijltje op het voorblad volgt de gekozen categorie.' }),
      ],
      bouwtekeningen: () => [
        h('h2', { class: 'portal-h2', text: 'E. Archief – bouwtekeningen' }),
        keuze('bouwtekeningen', 'ontvangen', 'Bouwtekeningen ontvangen?', [['ja', 'Ja'], ['nee', 'Nee']]),
        keuze('bouwtekeningen', 'vorm', 'Beschikbaar gesteld als', [['fysiek', 'Fysiek'], ['digitaal', 'Digitaal']]),
        h('div', { class: 'portal-grid-form' }, inp('bouwtekeningen', 'jaartal', 'Bouwtekeningen (jaartal)', { max: 8, placeholder: 'jaartal of N.V.T.' }), kies('bouwtekeningen', 'fundering', 'Soort fundering', 'bouwtekeningen.fundering')),
        fotoReeks('bouwtekening', 'Afbeelding'),
      ],
      bodem: () => [
        h('h2', { class: 'portal-h2', text: 'F. Archief – bodemdalingskaart' }),
        vinkje('bodem', 'niet_beschikbaar', 'Er zijn geen bodemdalingsgegevens beschikbaar'),
        h('div', { class: 'portal-grid-form' }, inp('bodem', 'mm_per_jaar', 'Bodemdaling (mm per jaar)', { max: 8, inputmode: 'decimal' }), kies('bodem', 'typering', 'Typering', 'bodem.typering', { hint: 'Rapporttekst: tot 2 mm/jaar klein, meer dan 3 mm/jaar groot. Voor 2–3 mm geeft de tekst geen typering: beoordeel zelf.' }),
          inp('bodem', 'bron', 'Bron van de gegevens (intern)', { max: 200 }), inp('bodem', 'peildatum', 'Datum van de gegevens (intern)', { type: 'date' })),
        h('p', { class: 'portal-hint', text: 'Bron en datum worden bij het dossier bewaard; ze staan niet in het rapportsjabloon. Vul alleen gegevens in die echt bij dit object horen.' }),
        fotoReeks('bodemdaling', 'Afbeelding'),
      ],
      omgeving: () => [
        h('h2', { class: 'portal-h2', text: 'G. Omgevingsfactoren' }),
        h('p', { class: 'portal-label', text: 'Bevinding 1' }),
        inp('omgeving', 'resultaat', 'Resultaat / conclusie', { textarea: true, rows: 4, max: 2000 }),
        fotoReeks('omgeving', 'Afbeelding'),
      ],
      lintvoeg: () => [
        h('h2', { class: 'portal-h2', text: 'H. Lintvoegmeting' }),
        vinkje('lintvoeg', 'nvt', 'Niet uitgevoerd / niet van toepassing'),
        inp('lintvoeg', 'meetpunten', 'Meetpunten (locaties)', { placeholder: 'gevel(s) waar gemeten is', max: 300 }),
        meettabel('lintvoeg', 3),
        fotoReeks('lintvoeg', 'Foto'),
      ],
      schietlood: () => [
        h('h2', { class: 'portal-h2', text: 'I. Schietloodmeting' }),
        vinkje('schietlood', 'nvt', 'Niet uitgevoerd / niet van toepassing'), inp('schietlood', 'nvt_motivatie', 'Motivatie (alleen bij niet van toepassing)', { max: 400 }),
        inp('schietlood', 'meetpunten', 'Meetpunten (locaties)', { placeholder: 'gevel waarop gemeten is', max: 300 }),
        meettabel('schietlood', 1),
        fotoReeks('schietlood', 'Foto'),
      ],
      afronden: () => afronden(),
    };
    let bevestig = { checked: false };

    function afronden() {
      const ctl = h('div');
      const fout = controle.fouten || []; const aand = controle.aandacht || [];
      ctl.append(fout.length
        ? h('div', { class: 'portal-note portal-note-warn' }, h('strong', { text: `Nog ${fout.length} ${fout.length === 1 ? 'punt' : 'punten'} in te vullen voordat het rapport definitief kan worden:` }),
          h('ul', {}, fout.map((f) => h('li', {}, h('a', { href: `#/rapporten/${r.id}/${f.stap}`, text: STAPPEN.find(([k]) => k === f.stap)?.[1] || f.stap }), `: ${f.melding}`))))
        : h('p', { class: 'portal-flash portal-flash-ok', text: 'Alle verplichte onderdelen zijn ingevuld.' }));
      if (aand.length) ctl.append(h('div', { class: 'portal-note' }, h('strong', { text: 'Aandachtspunten voor inhoudelijke controle (blokkeren niet):' }), h('ul', {}, aand.map((a) => h('li', { text: a.melding })))));
      const amsg = flashEl();
      const download = async (versie) => { try { const x = await api('rapport-word', { params: { id: r.id, ...(versie ? { versie } : {}) } }); window.location.assign(x.url); } catch (err) { flash(amsg, err.message, 'error'); } };
      const acties = h('div', { class: 'portal-actions' },
        h('a', { class: 'btn btn-ghost-dark', href: `${API}?actie=rapport-voorbeeld&id=${encodeURIComponent(r.id)}`, target: '_blank', rel: 'noopener', text: 'Voorbeeld rapport bekijken' }),
        kanBewerken ? h('button', { type: 'button', class: 'btn btn-ghost-dark', text: 'Download Word (concept)', onclick: async () => { await opslaan(); download(); } }) : null,
        kanBewerken ? h('button', { type: 'button', class: 'btn btn-gold', text: 'Definitief maken', disabled: !!fout.length, onclick: async (e) => {
          if (!(await opslaan())) return;
          const keus = data.conclusie.risico;
          if (!window.confirm(`Rapport ${r.report_nr} definitief maken met uitkomst "${RISICO[keus] || '?'}"?\n\nDaarna kun je het niet meer wijzigen zonder een nieuwe versie te starten.`)) return;
          busy(e.target, true);
          try { await api('rapport-definitief', { method: 'POST', body: { id: r.id, bevestig_risico: keus } }); dirty = false; await editReport(r.id, 'afronden'); }
          catch (err) { flash(amsg, err.message, 'error'); busy(e.target, false); }
        } }) : null);

      // versies, PDF en versturen
      const versies = h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Definitieve versies' }));
      if (!d.versions.length) versies.append(h('p', { class: 'portal-muted', text: 'Nog geen definitieve versie.' }));
      d.versions.forEach((v) => {
        const huidig = v.version === r.version && !kanBewerken;
        const pdfIn = h('input', { type: 'file', accept: 'application/pdf', id: `pdf-${v.version}` });
        const vmsg = flashEl();
        pdfIn.addEventListener('change', async () => {
          const f = pdfIn.files[0]; if (!f) return;
          if (f.type !== 'application/pdf') { flash(vmsg, 'Kies een PDF-bestand.', 'error'); return; }
          flash(vmsg, 'PDF wordt geüpload…');
          try {
            const u = await api('rapport-pdf-upload', { method: 'POST', body: { id: r.id, type: f.type, grootte: f.size } });
            const put = await fetch(u.upload_url, { method: 'PUT', headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'false' }, body: f });
            if (!put.ok) throw new Error('Uploaden is mislukt.');
            await api('rapport-pdf-bevestig', { method: 'POST', body: { id: r.id, pad: u.pad } });
            await editReport(r.id, 'afronden');
          } catch (err) { flash(vmsg, err.message, 'error'); }
        });
        const email = h('input', { type: 'email', id: `mail-${v.version}`, value: data.algemeen?.opdrachtgever_email || d.aanvraag?.email || '' });
        const email2 = h('input', { type: 'email', id: `mail2-${v.version}`, autocomplete: 'off' });
        const koppel = h('input', { type: 'checkbox', id: `koppel-${v.version}`, checked: !!d.aanvraag });
        const stuur = h('button', { type: 'button', class: 'btn btn-gold', text: v.sent_at ? 'Opnieuw versturen' : 'Rapport naar klant versturen', onclick: async () => {
          if (!window.confirm(`Rapport ${r.report_nr} (versie ${v.version}) versturen naar ${email.value}?`)) return;
          busy(stuur, true);
          try {
            await api('rapport-versturen', { method: 'POST', body: { id: r.id, email: email.value, bevestig_email: email2.value, koppel_tracking: koppel.checked, opnieuw: !!v.sent_at } });
            await editReport(r.id, 'afronden');
          } catch (err) { flash(vmsg, err.message, 'error'); busy(stuur, false); }
        } });
        versies.append(h('div', { class: 'portal-versie' },
          h('p', {}, h('strong', { text: `Versie ${v.version}` }), ' ', riskBadge(v.risk), h('span', { class: 'portal-muted', text: ` · definitief ${fmt(v.finalized_at)}${v.finalizer?.name ? ` door ${v.finalizer.name}` : ''} · sjabloon ${v.template_version}` })),
          v.sent_at ? h('p', { class: 'portal-muted', text: `Verstuurd op ${fmt(v.sent_at)} naar ${v.sent_to}${v.sender?.name ? ` door ${v.sender.name}` : ''}.` }) : null,
          h('div', { class: 'portal-actions' },
            h('button', { type: 'button', class: 'btn btn-ghost-dark btn-sm', text: 'Download Word', onclick: () => download(v.version) }),
            h('a', { class: 'btn btn-ghost-dark btn-sm', href: `${API}?actie=rapport-voorbeeld&id=${encodeURIComponent(r.id)}&versie=${v.version}`, target: '_blank', rel: 'noopener', text: 'Voorbeeld' }),
            v.pdf_path ? h('button', { type: 'button', class: 'btn btn-ghost-dark btn-sm', text: 'Download PDF', onclick: async () => { try { const x = await api('rapport-pdf-bekijken', { method: 'POST', body: { id: r.id, versie: v.version } }); window.location.assign(x.url); } catch (err) { flash(vmsg, err.message, 'error'); } } }) : null),
          huidig && !v.sent_at ? h('div', { class: 'portal-field' },
            h('p', { class: 'portal-label', text: v.pdf_path ? `PDF geüpload op ${fmt(v.pdf_uploaded_at)}. Ander PDF-bestand uploaden:` : 'PDF uploaden' }),
            h('p', { class: 'portal-hint', text: 'Open het Word-bestand van deze versie in Word, controleer het en kies Bestand → Opslaan als → PDF. Upload die PDF hier.' }),
            pdfIn) : null,
          huidig && v.pdf_path ? h('div', { class: 'portal-send' },
            h('p', { class: 'portal-label', text: 'Versturen naar de klant' }),
            h('div', { class: 'portal-grid-form' }, field('E-mailadres ontvanger', email), field('Typ het e-mailadres nogmaals ter controle', email2)),
            d.aanvraag ? h('div', { class: 'portal-check' }, koppel, h('label', { for: koppel.id, text: `Rapport ook beschikbaar maken op de trackingpagina van aanvraag ${d.aanvraag.dossier_nr} en de status op "Rapport afgerond" zetten` })) : null,
            stuur) : null,
          vmsg));
      });
      if (!kanBewerken) versies.append(h('div', { class: 'portal-actions' }, h('button', { type: 'button', class: 'btn btn-ghost-dark', text: 'Nieuwe versie starten', onclick: async () => {
        if (!window.confirm('Een nieuwe versie starten? De huidige definitieve versie blijft bewaard en ongewijzigd.')) return;
        try { await api('rapport-nieuwe-versie', { method: 'POST', body: { id: r.id } }); await editReport(r.id, 'voorblad'); } catch (err) { flash(amsg, err.message, 'error'); }
      } })));
      const mails = d.emails.length ? h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Verzendhistorie' }), h('ul', { class: 'portal-list' }, d.emails.map((m) => h('li', { text: `${m.kind}: ${m.status === 'verzonden' ? 'verzonden (door de e-maildienst geaccepteerd)' : m.status} · ${fmt(m.updated_at || m.created_at)}${m.error ? ` · ${m.error}` : ''}` })))) : null;
      const del = me.role === 'beheerder' ? h('section', { class: 'portal-card portal-danger' }, h('h2', { class: 'portal-h2', text: 'Rapport verwijderen' }),
        h('p', { text: 'Verwijdert het rapport, alle versies, foto\'s en bestanden definitief.' }),
        h('button', { type: 'button', class: 'btn btn-danger', text: 'Definitief verwijderen', onclick: async () => {
          const ans = window.prompt(`Typ ter bevestiging het rapportnummer (${r.report_nr}):`); if (ans === null) return;
          try { await api('rapport-verwijderen', { method: 'POST', body: { id: r.id, bevestig: ans.trim() } }); dirty = false; location.hash = '#/rapporten'; } catch (err) { flash(amsg, err.message, 'error'); }
        } })) : null;
      return [h('h2', { class: 'portal-h2', text: 'Uitkomst en afronden' }),
        data.conclusie?.risico ? h('p', {}, 'Uitkomst Fase 0: ', riskBadge(data.conclusie.risico), data.conclusie.risico_bevestigd ? ' (bevestigd)' : ' (nog niet bevestigd)') : h('p', { class: 'portal-muted', text: 'Nog geen risicocategorie gekozen (stap D. Conclusie).' }),
        ctl, acties, amsg, versies, mails, del];
    }

    // --- opbouw scherm
    const nav = h('ol', { class: 'portal-steps' });
    function updateNav() {
      nav.textContent = '';
      STAPPEN.forEach(([k, l], i) => {
        const open = (controle.fouten || []).filter((f) => f.stap === k).length;
        nav.append(h('li', { class: `${k === stap ? 'is-current' : ''} ${k === 'afronden' ? '' : open ? 'is-open' : 'is-done'}` },
          h('a', { href: `#/rapporten/${r.id}/${k}`, 'aria-current': k === stap ? 'step' : null },
            h('span', { class: 'portal-step-num', 'aria-hidden': 'true', text: k === 'afronden' ? '✓' : String(i) }), l,
            k !== 'afronden' ? h('span', { class: 'sr-only', text: open ? ` (nog ${open} open)` : ' (ingevuld)' }) : null,
            k !== 'afronden' && open ? h('span', { class: 'portal-step-open', 'aria-hidden': 'true', text: String(open) }) : null)));
      });
    }
    updateNav();
    const idx = STAPPEN.findIndex(([k]) => k === stap);
    const inhoud = STAP[stap]();
    const naar = (i) => { location.hash = `#/rapporten/${r.id}/${STAPPEN[i][0]}`; };
    render(
      h('div', { class: 'portal-toolbar' },
        h('div', {}, h('h1', { class: 'portal-h1', text: `Rapport ${r.report_nr}` }), h('p', { class: 'portal-muted', text: `Versie ${r.version} · ${RSTATUS[r.status]}${r.risk ? ` · ${RISICO[r.risk]}` : ''}` })),
        h('div', { class: 'portal-actions' }, saveState, kanBewerken ? h('button', { type: 'button', class: 'btn btn-gold', text: 'Opslaan', onclick: () => opslaan() }) : null)),
      h('p', {}, h('a', { href: '#/rapporten', text: '← Alle rapporten' })),
      !kanBewerken ? h('p', { class: 'portal-note' }, `Dit rapport is ${RSTATUS[r.status].toLowerCase()} en kan niet meer worden gewijzigd. Start een nieuwe versie (bij "Uitkomst en afronden") om aanpassingen te doen; de definitieve versie blijft bewaard.`) : null,
      msg,
      h('div', { class: 'portal-rapport' },
        h('nav', { class: 'portal-card portal-steps-wrap', 'aria-label': 'Hoofdstukken' }, nav),
        h('div', { class: 'portal-card portal-rapport-main' }, ...inhoud.flat().filter(Boolean),
          h('div', { class: 'portal-actions portal-stepnav' },
            idx > 0 ? h('button', { type: 'button', class: 'btn btn-ghost-dark', text: `← ${STAPPEN[idx - 1][1]}`, onclick: () => naar(idx - 1) }) : null,
            idx < STAPPEN.length - 1 ? h('button', { type: 'button', class: 'btn btn-gold', text: `${STAPPEN[idx + 1][1]} →`, onclick: () => naar(idx + 1) }) : null))),
    );
    if (stap === 'conclusie') bevestig = document.getElementById('v-conclusie-risico_bevestigd') || bevestig;
    if (melding) flash(msg, melding);
  }

  // ---------------------------------------------------------------- medewerkers (ook op /over-ons/)
  const WEBSITE_MELDING = {
    gestart: 'Opgeslagen. De website wordt bijgewerkt; over 1 à 2 minuten staat het op de pagina Over ons.',
    niet_ingesteld: 'Opgeslagen. Let op: automatisch bijwerken van de website is nog niet ingesteld (VERCEL_DEPLOY_HOOK), dus de pagina Over ons verandert pas bij de volgende deploy.',
    mislukt: 'Opgeslagen, maar het bijwerken van de website kon niet worden gestart. Probeer het later nog eens of start in Vercel een nieuwe deploy.',
  };
  async function medewerkersPage() {
    const d = await api('rapport-adviseurs');
    const msg = flashEl();
    const items = [...d.items].sort((a, b) => (a.volgorde ?? 0) - (b.volgorde ?? 0) || a.name.localeCompare(b.name));
    const foto = (a) => {
      const box = h('div', { class: 'portal-avatar' });
      const toon = (url) => {
        box.replaceChildren(url ? h('img', { src: url, alt: `Foto van ${a.name}`, width: 72, height: 72 }) : h('span', { class: 'portal-avatar-leeg', text: a.name.split(/\s+/).map((w) => w[0]).filter((c) => /[A-Z]/.test(c)).slice(0, 2).join('') || '?' }));
        if (url) box.append(h('button', { type: 'button', class: 'btn btn-ghost-dark btn-sm', text: 'Foto verwijderen', onclick: async () => {
          if (!window.confirm(`Foto van ${a.name} verwijderen? Op de website verschijnen dan de initialen.`)) return;
          try { const r = await api('rapport-adviseur-foto', { method: 'POST', body: { id: a.id, verwijderen: true } }); toon(null); flash(msg, WEBSITE_MELDING[r.website] || 'Foto verwijderd.', 'ok'); }
          catch (err) { flash(msg, err.message, 'error'); }
        } }));
      };
      const kies = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', id: `foto-mw-${a.id}`, class: 'portal-avatar-input' });
      kies.addEventListener('change', async () => {
        const file = kies.files[0]; if (!file) return;
        try {
          const data = await resizeImage(file, 640);
          const r = await api('rapport-adviseur-foto', { method: 'POST', body: { id: a.id, type: 'image/jpeg', data } });
          toon(r.foto_url); flash(msg, WEBSITE_MELDING[r.website] || 'Foto opgeslagen.', 'ok');
        } catch (err) { flash(msg, err.message, 'error'); }
        kies.value = '';
      });
      toon(a.foto_url);
      return h('div', { class: 'portal-field' }, h('label', { for: kies.id, text: 'Portretfoto (wordt verkleind, zonder locatiegegevens opgeslagen)' }), box, kies);
    };
    const kaart = (a = {}) => {
      const key = a.id || 'nieuw';
      const naam = h('input', { id: `mw-naam-${key}`, type: 'text', value: a.name || '', maxlength: 120, required: true });
      const functie = h('input', { id: `mw-functie-${key}`, type: 'text', value: a.functie || 'Bouwkundig adviseur', maxlength: 80 });
      const intro = h('textarea', { id: `mw-intro-${key}`, rows: 3, maxlength: 600 }); intro.value = a.introductie || '';
      const cert = h('input', { id: `mw-cert-${key}`, type: 'text', value: a.certificate || '', maxlength: 60 });
      const volgorde = h('input', { id: `mw-volgorde-${key}`, type: 'number', min: 0, max: 99, value: a.volgorde ?? 0 });
      const opSite = h('input', { id: `mw-site-${key}`, type: 'checkbox', checked: a.op_site !== false });
      const actief = h('input', { id: `mw-actief-${key}`, type: 'checkbox', checked: a.active !== false });
      const opslaan = h('button', { type: 'button', class: 'btn btn-gold', text: a.id ? 'Opslaan' : 'Medewerker toevoegen', onclick: async (e) => {
        if (a.id && cert.value.trim() !== (a.certificate || '') && !window.confirm('Certificaatnummer wijzigen? Het nieuwe nummer komt in nieuwe rapporten van deze medewerker.')) return;
        busy(e.target, true);
        try {
          const r = await api('rapport-adviseur-opslaan', { method: 'POST', body: { id: a.id, name: naam.value, functie: functie.value, introductie: intro.value, certificate: cert.value, volgorde: volgorde.value, op_site: opSite.checked, active: actief.checked } });
          await medewerkersPage(); flash(document.querySelector('.portal-flash'), WEBSITE_MELDING[r.website] || 'Opgeslagen.', 'ok');
        } catch (err) { flash(msg, err.message, 'error'); busy(e.target, false); }
      } });
      return h('section', { class: 'portal-card' },
        h('h2', { class: 'portal-h2', text: a.id ? a.name : 'Nieuwe medewerker' }),
        h('div', { class: 'portal-grid-form' },
          field('Naam', naam), field('Functie', functie, 'Zo staat het op de website, bijvoorbeeld "Bouwkundig adviseur".'),
          field('Certificaatnummer', cert, 'Komt in het rapport bij deze adviseur. Nodig om een rapport definitief te maken.'),
          field('Volgorde op de website', volgorde, 'Lager nummer staat eerder.')),
        field('Korte introductie (optioneel)', intro, 'Twee of drie zinnen, alleen feiten. Verschijnt op de pagina Over ons.'),
        h('div', { class: 'portal-check' }, opSite, h('label', { for: opSite.id, text: 'Tonen op de website (pagina Over ons)' })),
        h('div', { class: 'portal-check' }, actief, h('label', { for: actief.id, text: 'Actief: te kiezen bij een nieuw rapport' })),
        a.id ? foto(a) : h('p', { class: 'portal-hint', text: 'Na het toevoegen kun je een foto uploaden.' }),
        h('div', { class: 'portal-actions' }, opslaan));
    };
    render(h('div', { class: 'portal-toolbar' }, h('h1', { class: 'portal-h1', text: 'Medewerkers' })),
      h('div', { class: 'portal-card' },
        h('p', { class: 'portal-hint', text: 'Medewerkers met "Tonen op de website" staan op de pagina Over ons, met naam, functie, foto en introductie. Actieve medewerkers kies je bij een rapport als adviseur; hun certificaatnummer komt dan in het rapport. Iemand die uit dienst gaat: zet beide vinkjes uit. Oude rapporten blijven dan ongewijzigd.' }),
        msg),
      ...items.map((a) => kaart(a)), kaart());
  }

  // ---------------------------------------------------------------- aanvragen
  async function listRequests() {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const q = h('input', { id: 'r-q', type: 'search', value: params.get('q') || '', placeholder: 'Dossiernummer, naam, plaats of postcode' });
    const st = h('select', { id: 'r-status' }, h('option', { value: '', text: 'Alle statussen' }), Object.entries(STATUS_LABELS).map(([k, v]) => h('option', { value: k, text: v })));
    st.value = params.get('status') || '';
    const results = h('div', { class: 'portal-card portal-table-wrap', 'aria-live': 'polite' }, h('p', { text: 'Bezig met laden…' }));
    const load = async () => {
      const d = await api('aanvragen', { params: { q: q.value.trim(), status: st.value } });
      results.textContent = '';
      if (!d.items.length) { results.append(h('p', { text: q.value || st.value ? 'Geen aanvragen gevonden.' : 'Er zijn nog geen aanvragen.' })); return; }
      results.append(h('table', { class: 'portal-table' },
        h('thead', {}, h('tr', {}, ['Dossier', 'Naam', 'Plaats', 'Status', 'Status bijgewerkt', 'Link', 'Rapport'].map((t) => h('th', { scope: 'col', text: t })))),
        h('tbody', {}, d.items.map((r) => h('tr', {},
          h('td', {}, h('a', { href: `#/aanvragen/${r.id}`, text: r.dossier_nr })),
          h('td', { text: r.naam }), h('td', { text: r.plaats || r.postcode || '–' }), h('td', {}, badge(r.status)),
          h('td', { text: fmt(r.status_updated_at) }), h('td', { text: r.link_actief ? 'actief' : 'niet actief' }), h('td', { text: r.report_path ? 'ja' : '–' }))))));
    };
    const form = h('form', { class: 'portal-filter', role: 'search', onsubmit: (e) => { e.preventDefault(); load().catch((err) => flash(msg, err.message, 'error')); } },
      field('Zoeken', q), field('Status', st), h('button', { type: 'submit', class: 'btn btn-gold', text: 'Zoeken' }));
    const msg = flashEl();
    st.addEventListener('change', () => form.requestSubmit());
    render(h('div', { class: 'portal-toolbar' }, h('h1', { class: 'portal-h1', text: 'QuickScan-aanvragen' })), h('div', { class: 'portal-card' }, form, msg), results);
    await load();
  }

  async function showRequest(id) {
    const d = await api('aanvraag', { params: { id } });
    const r = d.request;
    const msg = flashEl();
    const reload = () => showRequest(id);
    const row = (label, value) => (value ? h('div', { class: 'portal-dl-row' }, h('dt', { text: label }), h('dd', { text: value })) : null);
    const details = r.details || {};

    // status wijzigen
    const stSel = h('select', { id: 's-status' }, d.statuses.map((s) => h('option', { value: s.key, text: s.label }))); stSel.value = r.status;
    const stMsg = h('textarea', { id: 's-msg', rows: 3, maxlength: 1000, 'aria-describedby': 's-msg-hint' });
    const stBtn = h('button', { type: 'submit', class: 'btn btn-gold', text: 'Status opslaan' });
    const statusForm = h('form', { class: 'portal-card', onsubmit: async (e) => {
      e.preventDefault(); busy(stBtn, true);
      try { await api('aanvraag-status', { method: 'POST', body: { id: r.id, status: stSel.value, bericht: stMsg.value } }); await reload(); }
      catch (err) { flash(msg, err.message, 'error'); busy(stBtn, false); }
    } }, h('h2', { class: 'portal-h2', text: 'Status wijzigen' }),
    field('Nieuwe status', stSel),
    field('Bericht voor de klant (optioneel)', stMsg, 'ZICHTBAAR VOOR DE KLANT op de trackingpagina. Gebruik dit bijvoorbeeld om te vragen welke informatie nodig is. Zet hier geen interne opmerkingen in.'),
    stBtn);

    // interne notities
    const note = h('textarea', { id: 'n-note', rows: 3, maxlength: 4000 });
    const noteBtn = h('button', { type: 'submit', class: 'btn btn-ghost-dark', text: 'Notitie toevoegen' });
    const notes = h('section', { class: 'portal-card portal-internal' },
      h('h2', { class: 'portal-h2', text: 'Interne notities' }),
      h('p', { class: 'portal-hint', text: 'Alleen zichtbaar voor medewerkers. Nooit zichtbaar voor de klant.' }),
      d.notes.length ? h('ul', { class: 'portal-notes' }, d.notes.map((n) => h('li', {}, h('p', { text: n.note }), h('span', { class: 'portal-muted', text: `${n.user?.name || 'onbekend'} · ${fmt(n.created_at)}` })))) : h('p', { class: 'portal-muted', text: 'Nog geen notities.' }),
      h('form', { onsubmit: async (e) => {
        e.preventDefault(); if (!note.value.trim()) return;
        busy(noteBtn, true);
        try { await api('aanvraag-notitie', { method: 'POST', body: { id: r.id, notitie: note.value } }); await reload(); } catch (err) { flash(msg, err.message, 'error'); busy(noteBtn, false); }
      } }, field('Nieuwe interne notitie', note), noteBtn));

    // trackinglink
    const linkBox = h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Trackinglink' }),
      h('p', {}, 'Status: ', h('strong', { text: r.link_actief ? 'actief' : (r.token_revoked_at ? `ingetrokken op ${fmt(r.token_revoked_at)}` : 'geen geldige link') })),
      h('p', { class: 'portal-hint', text: 'De link zelf is alleen per e-mail aan de klant verstuurd en wordt nergens bewaard. Bij een nieuwe link werkt de oude direct niet meer.' }),
      h('div', { class: 'portal-actions' },
        h('button', { type: 'button', class: 'btn btn-ghost-dark', text: 'Nieuwe link mailen naar de klant', onclick: async (e) => {
          if (!window.confirm(`Een nieuwe link mailen naar ${r.email}? De huidige link werkt dan niet meer.`)) return;
          busy(e.target, true);
          try { const x = await api('aanvraag-link', { method: 'POST', body: { id: r.id } }); window.alert(`Nieuwe link aangemaakt. E-mail: ${MAIL_LABELS[x.mail] || x.mail}.`); await reload(); } catch (err) { flash(msg, err.message, 'error'); busy(e.target, false); }
        } }),
        r.link_actief ? h('button', { type: 'button', class: 'btn btn-danger', text: 'Link intrekken', onclick: async () => {
          if (!window.confirm('De trackinglink intrekken? De klant kan de voortgang dan niet meer bekijken tot je een nieuwe link stuurt.')) return;
          try { await api('aanvraag-link-intrekken', { method: 'POST', body: { id: r.id } }); await reload(); } catch (err) { flash(msg, err.message, 'error'); }
        } }) : null));

    // rapport
    const pdf = h('input', { id: 'r-pdf', type: 'file', accept: 'application/pdf' });
    const repMsg = flashEl();
    const report = h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Rapport' }),
      r.report_path
        ? h('div', {}, h('p', { text: `Rapport geüpload op ${fmt(r.report_uploaded_at)}. ${r.status === 'afgerond' ? 'De klant kan het downloaden via de trackingpagina.' : 'De klant kan het downloaden zodra de status "Rapport afgerond" is.'}` }),
          h('div', { class: 'portal-actions' },
            h('button', { type: 'button', class: 'btn btn-ghost-dark', text: 'Bekijken', onclick: async () => { try { const x = await api('aanvraag-rapport-bekijken', { method: 'POST', body: { id: r.id } }); window.open(x.url, '_blank', 'noopener'); } catch (err) { flash(repMsg, err.message, 'error'); } } }),
            h('button', { type: 'button', class: 'btn btn-danger', text: 'Rapport verwijderen', onclick: async () => { if (!window.confirm('Het rapport verwijderen? De klant kan het dan niet meer downloaden.')) return; try { await api('aanvraag-rapport-verwijderen', { method: 'POST', body: { id: r.id } }); await reload(); } catch (err) { flash(repMsg, err.message, 'error'); } } })))
        : h('p', { class: 'portal-muted', text: 'Nog geen rapport geüpload. Zonder rapport ziet de klant bij "Rapport afgerond" dat het rapport op de afgesproken manier wordt bezorgd.' }),
      field(r.report_path ? 'Ander rapport uploaden (vervangt het huidige)' : 'Rapport uploaden (PDF, max. 50 MB)', pdf), repMsg);
    pdf.addEventListener('change', async () => {
      const f = pdf.files[0]; if (!f) return;
      if (f.type !== 'application/pdf') { flash(repMsg, 'Kies een PDF-bestand.', 'error'); return; }
      flash(repMsg, 'Rapport wordt geüpload…');
      try {
        const u = await api('aanvraag-rapport-upload', { method: 'POST', body: { id: r.id, type: f.type, grootte: f.size } });
        const put = await fetch(u.upload_url, { method: 'PUT', headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'false' }, body: f });
        if (!put.ok) throw new Error('Uploaden is mislukt. Probeer het opnieuw.');
        await api('aanvraag-rapport-bevestig', { method: 'POST', body: { id: r.id, pad: u.pad } });
        await reload();
      } catch (err) { flash(repMsg, err.message, 'error'); }
    });

    // e-mails
    const mails = h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'E-mails aan de klant' }),
      d.emails.length ? h('ul', { class: 'portal-list' }, d.emails.map((m) => h('li', { text: `${KIND_LABELS[m.kind] || m.kind}: ${MAIL_LABELS[m.status] || m.status} · ${fmt(m.updated_at || m.created_at)}${m.error ? ` · ${m.error}` : ''}` })))
        : h('p', { class: 'portal-muted', text: 'Nog geen e-mails.' }),
      h('p', { class: 'portal-hint', text: '"Verzonden" betekent dat de e-maildienst het bericht heeft geaccepteerd. Of het ook is afgeleverd, is daarmee niet vastgesteld.' }));

    // geschiedenis
    const history = h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Statusgeschiedenis' }),
      h('ol', { class: 'portal-history' }, d.history.map((x) => h('li', {}, badge(x.status), ' ', h('span', { class: 'portal-muted', text: `${fmt(x.changed_at)}${x.user?.name ? ` · ${x.user.name}` : ''}` }), x.customer_message ? h('p', { text: `Bericht aan klant: ${x.customer_message}` }) : null))));

    const del = me.role === 'beheerder' ? h('section', { class: 'portal-card portal-danger' }, h('h2', { class: 'portal-h2', text: 'Aanvraag verwijderen' }),
      h('p', { text: 'Verwijdert de aanvraag, de geschiedenis, notities, e-maillog en het rapport definitief. Gebruik dit bijvoorbeeld bij een verwijderverzoek of na afloop van de bewaartermijn.' }),
      h('button', { type: 'button', class: 'btn btn-danger', text: 'Definitief verwijderen', onclick: async () => {
        const answer = window.prompt(`Typ ter bevestiging het dossiernummer (${r.dossier_nr}):`);
        if (answer === null) return;
        try { await api('aanvraag-verwijderen', { method: 'POST', body: { id: r.id, bevestig: answer.trim() } }); location.hash = '#/aanvragen'; } catch (err) { flash(msg, err.message, 'error'); }
      } })) : null;

    // QuickScan-rapport bij deze aanvraag: openen als het er al is, anders aanmaken met de gegevens uit de aanvraag
    const qsMsg = flashEl();
    const bestaand = await api('rapporten').then((x) => x.items.filter((i) => i.request_id === r.id)).catch(() => []);
    const qsKnop = h('button', { type: 'button', class: 'btn btn-gold', text: bestaand.length ? 'Nog een rapport maken' : 'QuickScan-rapport maken', onclick: async (e) => {
      if (bestaand.length && !window.confirm('Er is al een rapport bij deze aanvraag. Toch een nieuw rapport maken?')) return;
      busy(e.target, true);
      try { const x = await api('rapport-nieuw', { method: 'POST', body: { request_id: r.id } }); location.hash = `#/rapporten/${x.id}/voorblad`; }
      catch (err) { flash(qsMsg, err.message, 'error'); busy(e.target, false); }
    } });
    const qsRapport = h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'QuickScan-rapport' }),
      bestaand.length
        ? h('ul', {}, bestaand.map((x) => h('li', {}, h('a', { href: `#/rapporten/${x.id}/voorblad`, text: `${x.report_nr}` }), ` · ${RSTATUS[x.status] || x.status}`)))
        : h('p', { class: 'portal-hint', text: 'Naam, e-mail, adres, type woning, bouwjaar en reden worden uit deze aanvraag overgenomen in het rapport.' }),
      qsMsg, h('div', { class: 'portal-actions' }, qsKnop));

    render(
      h('div', { class: 'portal-toolbar' }, h('h1', { class: 'portal-h1', text: `Dossier ${r.dossier_nr}` }), badge(r.status)),
      h('p', {}, h('a', { href: '#/aanvragen', text: '← Alle aanvragen' })), msg,
      h('div', { class: 'portal-grid-2' },
        h('div', {},
          h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Aanvraag' }),
            h('dl', { class: 'portal-dl' },
              row('Naam', r.naam), row('E-mail', r.email), row('Telefoon', r.telefoon),
              row('Adres', [r.adres, [r.postcode, r.huisnummer].filter(Boolean).join(' '), r.plaats].filter(Boolean).join(', ')),
              row('Ontvangen', fmt(r.created_at)), row('Status bijgewerkt', fmt(r.status_updated_at)),
              ...Object.entries(details).map(([k, v]) => row(k.charAt(0).toUpperCase() + k.slice(1), v)))),
          statusForm, history),
        h('div', {}, qsRapport, linkBox, report, mails, notes, del)),
    );
  }

  // ---------------------------------------------------------------- AI-redactie
  // De bot op de pc levert alleen concepten aan. Hier keurt een medewerker goed (= overzetten naar Nieuws als concept);
  // publiceren gebeurt daarna apart in Nieuws.
  const RTYPE = { nieuws: 'Nieuws', weetje: 'Wist je dat', kennis: 'Kennisartikel', zelftest: 'Zelftest', regionaal: 'Regionaal', praktijk: 'Praktijkvoorbeeld (fictief)' };
  const RSTAT = { concept: 'Concept', afgekeurd: 'Afgekeurd', goedgekeurd: 'Goedgekeurd', overgezet: 'In Nieuws (concept)' };
  const rBadge = (st) => h('span', { class: `portal-badge portal-badge-red-${st}`, text: RSTAT[st] || st });
  const rNav = (actief) => h('nav', { class: 'portal-subnav', 'aria-label': 'Redactie' },
    [['', 'Overzicht'], ['concepten', 'Concepten'], ['items', 'Nieuwsitems'], ['bronnen', 'Bronnen'], ['instellingen', 'Instellingen en planning'], ['logboek', 'Logboek en fouten']]
      .map(([p, t]) => h('a', { href: `#/redactie${p ? `/${p}` : ''}`, class: actief === p ? 'is-active' : null, text: t })));
  const controleTelling = (c) => {
    const k = c.controle || {};
    const f = (k.fouten || []).length; const w = (k.waarschuwingen || []).length + (k.taal || []).length;
    return h('span', { class: f ? 'portal-red-fout' : w ? 'portal-red-let' : 'portal-red-ok', text: f ? `${f} fout${f > 1 ? 'en' : ''}` : w ? `${w} aandachtspunt${w > 1 ? 'en' : ''}` : 'in orde' });
  };

  async function redactie(parts) {
    const sub = (parts[1] || '').split('?')[0];
    if (sub === 'concept' && parts[2]) return redactieConcept(parts[2]);
    if (sub === 'concepten') return redactieConcepten();
    if (sub === 'items') return redactieItems();
    if (sub === 'bronnen') return redactieBronnen();
    if (sub === 'instellingen') return redactieInstellingen();
    if (sub === 'logboek') return redactieLogboek();
    return redactieOverzicht();
  }

  async function redactieOverzicht() {
    const d = await api('redactie-overzicht');
    const kaart = (titel, waarde, href) => h('a', { class: 'portal-stat', href }, h('strong', { text: String(waarde) }), h('span', { text: titel }));
    const lr = d.laatste_run;
    render(h('div', { class: 'portal-toolbar' }, h('h1', { class: 'portal-h1', text: 'AI-redactie' })), rNav(''),
      h('p', { class: 'portal-note' }, 'De redactiebot op de pc verzamelt nieuws en schrijft concepten. Hij kan niets publiceren. Jij keurt goed (het concept gaat dan als concept naar Nieuws) en publiceert daarna zelf in Nieuws.'),
      d.instellingen.actief === false ? h('p', { class: 'portal-note portal-note-warn' }, 'De redactie staat uit. Zet hem aan bij Instellingen en planning.') : null,
      h('div', { class: 'portal-stats red-stats' },
        Object.entries(RTYPE).map(([t, l]) => kaart(`${l} – concepten`, d.per_type[t] || 0, `#/redactie/concepten?type=${t}&status=concept`)),
        kaart('Nieuwe nieuwsitems', d.nieuwe_items, '#/redactie/items'),
        kaart('Wacht op nieuwe versie', d.regenereren, '#/redactie/concepten?status=concept')),
      h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Laatste run van de bot' }),
        lr ? h('p', {}, `${fmt(lr.gestart_op)} · ${lr.taak} · `, h('strong', { text: lr.status }), ` · ${Object.entries(lr.aantallen || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}`)
          : h('p', { class: 'portal-hint', text: 'De bot heeft nog niet gedraaid. Zie Instellingen en planning voor het installeren.' }),
        d.fouten.length ? h('div', {}, h('p', { class: 'portal-label', text: 'Recente fouten en waarschuwingen' }), h('ul', {}, d.fouten.map((r) => h('li', { text: `${fmt(r.gestart_op)} – ${r.status}: ${r.melding || '–'}` })))) : null),
      h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Concepten per status' }),
        h('ul', {}, Object.entries(RSTAT).map(([s, l]) => h('li', {}, h('a', { href: `#/redactie/concepten?status=${s}`, text: `${l}: ${d.per_status[s] || 0}` }))))));
  }

  async function redactieConcepten() {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const type = h('select', { id: 'rc-type' }, h('option', { value: '', text: 'Alle soorten' }), Object.entries(RTYPE).map(([k, v]) => h('option', { value: k, text: v })));
    const status = h('select', { id: 'rc-status' }, h('option', { value: '', text: 'Alle statussen' }), Object.entries(RSTAT).map(([k, v]) => h('option', { value: k, text: v })));
    type.value = params.get('type') || ''; status.value = params.get('status') || '';
    const zoek = () => { location.hash = `#/redactie/concepten?${new URLSearchParams({ type: type.value, status: status.value })}`; };
    type.addEventListener('change', zoek); status.addEventListener('change', zoek);
    const d = await api('redactie-concepten', { params: { type: type.value, status: status.value } });
    render(h('div', { class: 'portal-toolbar' }, h('h1', { class: 'portal-h1', text: 'Concepten' })), rNav('concepten'),
      h('div', { class: 'portal-card portal-filters' }, field('Soort', type), field('Status', status)),
      h('div', { class: 'portal-card' }, d.items.length ? h('div', { class: 'portal-table-wrap' }, h('table', { class: 'portal-table' },
        h('thead', {}, h('tr', {}, ['Soort', 'Titel', 'Status', 'Controle', 'Gemaakt'].map((t) => h('th', { scope: 'col', text: t })))),
        h('tbody', {}, d.items.map((c) => h('tr', {},
          h('td', { text: RTYPE[c.type] || c.type }),
          h('td', {}, h('a', { href: `#/redactie/concept/${c.id}`, text: c.titel }), c.regenereren ? h('span', { class: 'portal-muted', text: ' · nieuwe versie gevraagd' }) : null),
          h('td', {}, rBadge(c.status)), h('td', {}, controleTelling(c)), h('td', { text: fmt(c.created_at) }))))))
        : h('p', { class: 'portal-muted', text: 'Geen concepten gevonden.' })));
  }

  function zelftestVoorbeeld(z) {
    if (!z || !z.vragen) return h('p', { class: 'portal-muted', text: 'Geen vragen.' });
    const keuzes = {};
    const uitslag = h('div', { class: 'portal-note', hidden: true });
    const box = h('div', { class: 'red-zelftest' }, z.vragen.map((v, i) => h('fieldset', { class: 'portal-card' },
      h('legend', { text: `${i + 1}. ${v.vraag}` }),
      v.opties.map((o, j) => h('label', { class: 'portal-check' }, h('input', { type: 'radio', name: `zt-${i}`, value: String(j), onchange: () => { keuzes[i] = o.punten; } }), ` ${o.tekst} `, h('span', { class: 'portal-muted', text: `(${o.punten} pt)` }))),
      h('p', { class: 'portal-hint', text: `Uitleg: ${v.uitleg}` }))),
    h('button', { type: 'button', class: 'btn btn-ghost-dark', text: 'Bekijk uitslag', onclick: () => {
      const tot = Object.values(keuzes).reduce((a, b) => a + b, 0);
      const u = (z.uitslagen || []).find((x) => tot >= x.min && tot <= x.max);
      uitslag.hidden = false; uitslag.textContent = `${tot} punten – ${u ? `${u.titel}: ${u.tekst}` : 'geen uitslag voor deze score (pas de grenzen aan)'}`;
    } }), uitslag, h('p', { class: 'portal-hint', text: z.disclaimer || '' }));
    return box;
  }

  async function redactieConcept(id) {
    const d = await api('redactie-concept', { params: { id } });
    const c = d.concept;
    const msg = flashEl();
    const bewerkbaar = c.status === 'concept' || c.status === 'afgekeurd';
    const inp = (key, label, opts = {}) => {
      const el = h(opts.textarea ? 'textarea' : 'input', { id: `rc-${key}`, type: opts.textarea ? undefined : 'text', maxlength: opts.max || 200, rows: opts.rows, disabled: !bewerkbaar });
      el.value = c[key] || '';
      const teller = opts.teller ? h('span', { class: 'portal-hint', text: `${el.value.length} tekens` }) : null;
      if (teller) el.addEventListener('input', () => { teller.textContent = `${el.value.length} tekens${opts.teller ? ` (doel ${opts.teller})` : ''}`; });
      return { el, veld: h('div', {}, field(label, el, opts.hint), teller) };
    };
    const titel = inp('titel', 'Titel (H1)', { max: 140 });
    const slug = inp('slug', 'URL (slug)', { max: 90, hint: 'Wordt /nieuws/<slug>/' });
    const seo = inp('seo_titel', 'SEO-titel', { max: 80, teller: 'max. 60' });
    const meta = inp('meta_description', 'Meta description', { max: 170, teller: '120–160', textarea: true, rows: 2 });
    const kw = inp('hoofdzoekwoord', 'Hoofdzoekwoord', { max: 80 });
    const zw = h('input', { id: 'rc-zw', type: 'text', value: (c.zoekwoorden || []).join(', '), disabled: !bewerkbaar });
    const intro = inp('intro', 'Introductie (direct antwoord, komt bovenaan)', { max: 600, textarea: true, rows: 3 });
    const inhoud = inp('inhoud', 'Tekst (Markdown: ## kop, ### subkop, - opsomming, > uitgelicht blok, [tekst](/pagina/))', { max: 60000, textarea: true, rows: 22 });
    // FAQ, bronnen, interne links als bewerkbare rijen
    const rijen = (lijst, velden, leeg) => {
      const box = h('div', { class: 'red-rijen' });
      const teken = () => {
        box.replaceChildren(...lijst.map((r, i) => h('div', { class: 'red-rij' },
          velden.map(([k, l, max, area]) => { const e = h(area ? 'textarea' : 'input', { 'aria-label': l, placeholder: l, maxlength: max, rows: area ? 3 : undefined, disabled: !bewerkbaar }); e.value = r[k] || ''; e.addEventListener('input', () => { r[k] = e.value; }); return e; }),
          bewerkbaar ? h('button', { type: 'button', class: 'btn btn-ghost-dark btn-sm', text: 'Weg', onclick: () => { lijst.splice(i, 1); teken(); } }) : null)),
        bewerkbaar ? h('button', { type: 'button', class: 'btn btn-ghost-dark btn-sm', text: '+ Toevoegen', onclick: () => { lijst.push({ ...leeg }); teken(); } }) : null);
      };
      teken(); return box;
    };
    const faqs = JSON.parse(JSON.stringify(c.faqs || [])); const bronnen = JSON.parse(JSON.stringify(c.bronnen || [])); const links = JSON.parse(JSON.stringify(c.interne_links || []));
    const paginaLijst = h('datalist', { id: 'rc-paginas' }, (d.interne_paginas || []).map((p) => h('option', { value: p.url, text: p.titel })));
    const afb = h('select', { id: 'rc-afb', disabled: !bewerkbaar }, h('option', { value: '', text: 'Geen afbeelding' }), d.beeldbank.map((b) => h('option', { value: b.naam, text: b.alt })));
    afb.value = c.afbeelding || '';
    const afbImg = h('img', { class: 'red-afb', alt: '', width: 320, height: 180 });
    const toonAfb = () => { afbImg.hidden = !afb.value; if (afb.value) afbImg.src = `/assets/img/${afb.value}-640.webp`; };
    const alt = inp('afbeelding_alt', 'Alt-tekst van de afbeelding', { max: 200 });
    afb.addEventListener('change', () => { toonAfb(); const b = d.beeldbank.find((x) => x.naam === afb.value); if (b) alt.el.value = b.alt; });
    toonAfb();
    let zelftestTekst = null;
    if (c.type === 'zelftest') { zelftestTekst = h('textarea', { id: 'rc-zt', rows: 14, disabled: !bewerkbaar }); zelftestTekst.value = JSON.stringify(c.zelftest || {}, null, 2); }

    const verzamel = () => {
      const out = {
        titel: titel.el.value, slug: slug.el.value, seo_titel: seo.el.value, meta_description: meta.el.value, hoofdzoekwoord: kw.el.value,
        zoekwoorden: zw.value.split(',').map((x) => x.trim()).filter(Boolean), intro: intro.el.value, inhoud: inhoud.el.value,
        faqs, bronnen, interne_links: links, afbeelding: afb.value, afbeelding_alt: alt.el.value,
      };
      if (zelftestTekst) out.zelftest = JSON.parse(zelftestTekst.value);
      return out;
    };
    const opslaan = async (stil) => {
      try { const r = await api('redactie-concept-opslaan', { method: 'POST', body: { id: c.id, concept: verzamel() } }); if (!stil) await redactieConcept(c.id); return r; }
      catch (err) { flash(msg, err.message, 'error'); return null; }
    };

    // controlepaneel
    const k = c.controle || {};
    const blok = (titelTekst, lijst, cls) => (lijst && lijst.length ? h('div', { class: `red-controle ${cls}` }, h('p', { class: 'portal-label', text: `${titelTekst} (${lijst.length})` }), h('ul', {}, lijst.map((x) => h('li', { text: x })))) : null);
    const controle = h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Kwaliteitscontrole' }),
      h('p', { class: 'portal-hint', text: `${k.woorden ?? '?'} woorden · gecontroleerd ${fmt(k.gecontroleerd_op)} · model: ${c.model || '–'}. Controleer altijd zelf de feiten en de bronnen; de bot kan zich vergissen.` }),
      blok('Moet opgelost of bewust geaccepteerd worden', k.fouten, 'is-fout'),
      blok('Nakijken', k.waarschuwingen, 'is-let'),
      blok('Spelling en grammatica (LanguageTool)', k.taal, 'is-let'),
      blok('SEO', k.seo, 'is-info'), blok('GEO (gevonden worden door AI-diensten)', k.geo, 'is-info'),
      !((k.fouten || []).length + (k.waarschuwingen || []).length + (k.taal || []).length + (k.seo || []).length + (k.geo || []).length) ? h('p', { class: 'portal-red-ok', text: 'Geen bevindingen.' }) : null);

    const bronItems = (d.items || []).length ? h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Gebruikte nieuwsitems' }),
      h('ul', {}, d.items.map((i) => h('li', {}, h('a', { href: i.url, target: '_blank', rel: 'noopener noreferrer', text: i.titel }), ` · ${i.bron_naam} · ${fmt(i.gepubliceerd_op)}`, h('p', { class: 'portal-hint', text: i.samenvatting }))))) : null;

    // acties
    const akkoord = h('input', { type: 'checkbox', id: 'rc-akkoord' });
    const knoppen = h('div', { class: 'portal-actions' },
      bewerkbaar ? h('button', { type: 'button', class: 'btn btn-gold', text: 'Opslaan en opnieuw controleren', onclick: async (e) => { busy(e.target, true); await opslaan(false); } }) : null,
      c.type !== 'zelftest' ? h('a', { class: 'btn btn-ghost-dark', href: `${API}?actie=redactie-voorbeeld&id=${encodeURIComponent(c.id)}`, target: '_blank', rel: 'noopener', text: 'Voorbeeld op de site bekijken' }) : null,
      c.status === 'concept' ? h('button', { type: 'button', class: 'btn btn-ghost-dark', text: 'Opnieuw laten schrijven', onclick: async () => {
        const notitie = window.prompt('Wat moet er anders in de nieuwe versie? (optioneel, bijv. "korter", "meer over grondwater")', '');
        if (notitie === null) return;
        try { await api('redactie-regenereren', { method: 'POST', body: { id: c.id, notitie } }); flash(msg, 'De bot maakt bij de volgende run een nieuwe versie van dit concept.', 'ok'); } catch (err) { flash(msg, err.message, 'error'); }
      } }) : null,
      c.status === 'concept' ? h('button', { type: 'button', class: 'btn btn-ghost-dark', text: 'Afkeuren', onclick: async () => { try { await api('redactie-afkeuren', { method: 'POST', body: { id: c.id } }); await redactieConcept(c.id); } catch (err) { flash(msg, err.message, 'error'); } } }) : null,
      c.status === 'afgekeurd' ? h('button', { type: 'button', class: 'btn btn-ghost-dark', text: 'Terugzetten naar concept', onclick: async () => { try { await api('redactie-afkeuren', { method: 'POST', body: { id: c.id, terug: true } }); await redactieConcept(c.id); } catch (err) { flash(msg, err.message, 'error'); } } }) : null,
      c.status !== 'overgezet' ? h('button', { type: 'button', class: 'btn btn-danger', text: 'Verwijderen', onclick: async () => {
        if (!window.confirm('Dit concept definitief verwijderen?')) return;
        try { await api('redactie-verwijderen', { method: 'POST', body: { id: c.id, bevestig: true } }); location.hash = '#/redactie/concepten'; } catch (err) { flash(msg, err.message, 'error'); }
      } }) : null);
    const goedkeuren = c.status === 'concept' ? h('section', { class: 'portal-card portal-red-goedkeuren' },
      h('h2', { class: 'portal-h2', text: 'Goedkeuren' }),
      h('p', { text: c.type === 'zelftest'
        ? 'Goedkeuren markeert deze zelftest als goedgekeurd. Zelftests worden nog niet op de site getoond.'
        : 'Goedkeuren zet dit artikel over naar Nieuws, als concept. Het staat dan nog NIET op de site. Publiceren doe je daarna apart in Nieuws.' }),
      (k.fouten || []).length ? h('div', { class: 'portal-check' }, akkoord, h('label', { for: 'rc-akkoord', text: 'Ik heb de openstaande punten uit de controle zelf gecontroleerd en akkoord bevonden.' })) : null,
      h('button', { type: 'button', class: 'btn btn-navy', text: c.type === 'zelftest' ? 'Zelftest goedkeuren' : 'Goedkeuren en naar Nieuws (als concept)', onclick: async (e) => {
        if (bewerkbaar && !(await opslaan(true))) return;
        if (!window.confirm(c.type === 'zelftest' ? 'Deze zelftest goedkeuren?' : 'Dit artikel als concept naar Nieuws zetten? Het wordt nog niet gepubliceerd.')) return;
        busy(e.target, true);
        try {
          const r = await api('redactie-goedkeuren', { method: 'POST', body: { id: c.id, fouten_gecontroleerd: akkoord.checked } });
          if (r.nieuws_id) location.hash = `#/nieuws/${r.nieuws_id}`; else await redactieConcept(c.id);
        } catch (err) { flash(msg, err.message, 'error'); busy(e.target, false); }
      } })) : null;

    render(h('div', { class: 'portal-toolbar' }, h('h1', { class: 'portal-h1', text: `${RTYPE[c.type] || c.type}: ${c.titel}` }), rBadge(c.status)),
      rNav('concepten'), h('p', {}, h('a', { href: '#/redactie/concepten', text: '← Alle concepten' })),
      c.regenereren ? h('p', { class: 'portal-note' }, `Nieuwe versie gevraagd${c.regenereer_notitie ? `: "${c.regenereer_notitie}"` : ''}. De bot maakt die bij de volgende run.`) : null,
      c.status === 'overgezet' && c.nieuws_id ? h('p', { class: 'portal-note' }, 'Dit artikel staat als concept in Nieuws. ', h('a', { href: `#/nieuws/${c.nieuws_id}`, text: 'Open het in Nieuws om het na te lezen en te publiceren.' })) : null,
      c.type === 'praktijk' ? h('p', { class: 'portal-note portal-note-warn' }, 'Praktijkvoorbeeld: dit is een fictieve situatie en moet ook zo heten. Presenteer het nooit als echte klantcase.') : null,
      msg, controle,
      h('div', { class: 'portal-grid-editor' },
        h('section', { class: 'portal-card' },
          titel.veld, slug.veld, intro.veld, inhoud.veld,
          c.type === 'zelftest' ? h('div', {}, h('h2', { class: 'portal-h2', text: 'Zelftest' }), zelftestVoorbeeld(c.zelftest), field('Vragen en uitslagen (geavanceerd, JSON)', zelftestTekst, 'Pas hier vragen, punten en uitslagen aan. Een uitslag mag nooit een risicoklasse noemen.')) : null,
          h('h2', { class: 'portal-h2', text: 'Veelgestelde vragen' }), rijen(faqs, [['vraag', 'Vraag', 200], ['antwoord', 'Antwoord', 1200, true]], { vraag: '', antwoord: '' }),
          h('h2', { class: 'portal-h2', text: 'Bronnen' }), h('p', { class: 'portal-hint', text: 'Controleer of elke link werkt en de bron zegt wat in het artikel staat.' }),
          rijen(bronnen, [['titel', 'Titel', 200], ['url', 'https://…', 1000], ['uitgever', 'Uitgever', 120], ['datum', 'Datum', 30]], { titel: '', url: '', uitgever: '', datum: '' }),
          h('h2', { class: 'portal-h2', text: 'Interne links (Lees ook)' }), paginaLijst,
          rijen(links, [['url', '/pagina/', 200], ['tekst', 'Linktekst', 120]], { url: '', tekst: '' })),
        h('section', { class: 'portal-card' },
          h('h2', { class: 'portal-h2', text: 'SEO' }), seo.veld, meta.veld, kw.veld, field('Gerelateerde zoekwoorden (komma-gescheiden)', zw),
          h('h2', { class: 'portal-h2', text: 'Afbeelding' }), field('Uit de beeldbank van de site', afb), afbImg, alt.veld,
          h('p', { class: 'portal-hint', text: 'Alleen echte foto\'s van de site. Een andere foto? Upload die na het goedkeuren in Nieuws.' }), bronItems)),
      knoppen, goedkeuren);
    // datalist koppelen aan de url-velden van de interne links
    view.querySelectorAll('.red-rijen input[placeholder="/pagina/"]').forEach((e) => e.setAttribute('list', 'rc-paginas'));
  }

  async function redactieItems() {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const st = params.get('status') || 'nieuw';
    const d = await api('redactie-items', { params: { status: st } });
    const msg = flashEl();
    const keuze = h('select', { id: 'ri-status' }, [['nieuw', 'Nieuw'], ['gebruikt', 'Gebruikt in een concept'], ['genegeerd', 'Genegeerd']].map(([k, v]) => h('option', { value: k, text: v })));
    keuze.value = st; keuze.addEventListener('change', () => { location.hash = `#/redactie/items?status=${keuze.value}`; });
    render(h('div', { class: 'portal-toolbar' }, h('h1', { class: 'portal-h1', text: 'Verzamelde nieuwsitems' })), rNav('items'),
      h('p', { class: 'portal-hint', text: 'De bot bewaart alleen titel, link en een korte samenvatting. Relevantie: 0–100 op basis van vakwoorden, regio, actualiteit en betrouwbaarheid van de bron. Negeer items die niet bruikbaar zijn; de bot slaat ze dan over.' }),
      h('div', { class: 'portal-card portal-filters' }, field('Status', keuze)), msg,
      h('div', { class: 'portal-card' }, d.items.length ? h('div', { class: 'portal-table-wrap' }, h('table', { class: 'portal-table' },
        h('thead', {}, h('tr', {}, ['Relevantie', 'Titel', 'Bron', 'Datum', 'Onderwerp / regio', ''].map((t) => h('th', { scope: 'col', text: t })))),
        h('tbody', {}, d.items.map((i) => h('tr', {},
          h('td', { text: String(i.relevantie) }),
          h('td', {}, h('a', { href: i.url, target: '_blank', rel: 'noopener noreferrer', text: i.titel })),
          h('td', { text: `${i.bron_naam} (${'★'.repeat(i.betrouwbaarheid)})` }), h('td', { text: fmt(i.gepubliceerd_op || i.verzameld_op) }),
          h('td', { text: [i.onderwerp, i.regio].filter(Boolean).join(' · ') || '–' }),
          h('td', {}, i.status !== 'gebruikt' ? h('button', { type: 'button', class: 'btn btn-ghost-dark btn-sm', text: i.status === 'genegeerd' ? 'Terugzetten' : 'Negeren', onclick: async () => {
            try { await api('redactie-item-status', { method: 'POST', body: { id: i.id, status: i.status === 'genegeerd' ? 'nieuw' : 'genegeerd' } }); await redactieItems(); } catch (err) { flash(msg, err.message, 'error'); }
          } }) : null))))))
        : h('p', { class: 'portal-muted', text: 'Geen items.' })));
  }

  async function redactieBronnen() {
    const d = await api('redactie-bronnen');
    const msg = flashEl();
    const rij = (b = {}) => {
      const naam = h('input', { type: 'text', value: b.naam || '', maxlength: 120, 'aria-label': 'Naam' });
      const url = h('input', { type: 'url', value: b.url || '', maxlength: 500, 'aria-label': 'Feed-adres', placeholder: 'https://…/rss' });
      const cat = h('select', { 'aria-label': 'Categorie' }, d.categorieen.map((x) => h('option', { value: x, text: x }))); cat.value = b.categorie || 'algemeen';
      const betr = h('select', { 'aria-label': 'Betrouwbaarheid' }, [1, 2, 3, 4, 5].map((n) => h('option', { value: String(n), text: `${n} ${'★'.repeat(n)}` }))); betr.value = String(b.betrouwbaarheid || 3);
      const regio = h('input', { type: 'text', value: b.regio || '', maxlength: 60, 'aria-label': 'Regio' });
      const pagina = h('input', { type: 'checkbox', checked: !!b.pagina_ophalen, 'aria-label': 'Volledige pagina lezen' });
      const actief = h('input', { type: 'checkbox', checked: b.actief !== false, 'aria-label': 'Actief' });
      return h('tr', {}, h('td', {}, naam), h('td', {}, url, b.laatste_fout ? h('p', { class: 'portal-red-fout', text: `Fout: ${b.laatste_fout}` }) : b.laatste_check ? h('p', { class: 'portal-hint', text: `Gelezen ${fmt(b.laatste_check)}` }) : null),
        h('td', {}, cat), h('td', {}, betr), h('td', {}, regio), h('td', {}, pagina), h('td', {}, actief),
        h('td', {}, h('button', { type: 'button', class: 'btn btn-gold btn-sm', text: b.id ? 'Opslaan' : 'Toevoegen', onclick: async () => {
          try { await api('redactie-bron-opslaan', { method: 'POST', body: { id: b.id, naam: naam.value, url: url.value, categorie: cat.value, betrouwbaarheid: betr.value, regio: regio.value, pagina_ophalen: pagina.checked, actief: actief.checked } }); await redactieBronnen(); }
          catch (err) { flash(msg, err.message, 'error'); }
        } }), b.id ? h('button', { type: 'button', class: 'btn btn-ghost-dark btn-sm', text: 'Verwijderen', onclick: async () => {
          if (!window.confirm(`Bron "${b.naam}" verwijderen?`)) return;
          try { await api('redactie-bron-verwijderen', { method: 'POST', body: { id: b.id } }); await redactieBronnen(); } catch (err) { flash(msg, err.message, 'error'); }
        } }) : null));
    };
    render(h('div', { class: 'portal-toolbar' }, h('h1', { class: 'portal-h1', text: 'Bronnen' })), rNav('bronnen'),
      h('p', { class: 'portal-hint', text: 'RSS- of Atom-feeds die de bot elke run leest. "Volledige pagina" alleen aanzetten bij open bronnen (zoals KCAF), niet bij nieuwssites met een betaalmuur. Betrouwbaarheid telt mee in de relevantie.' }),
      msg, h('div', { class: 'portal-card' }, h('div', { class: 'portal-table-wrap' }, h('table', { class: 'portal-table' },
        h('thead', {}, h('tr', {}, ['Naam', 'Feed-adres', 'Categorie', 'Betrouwbaarheid', 'Regio', 'Volledige pagina', 'Actief', ''].map((t) => h('th', { scope: 'col', text: t })))),
        h('tbody', {}, d.items.map((b) => rij(b)), rij())))));
  }

  async function redactieInstellingen() {
    const d = await api('redactie-instellingen');
    const s = d.instellingen;
    const msg = flashEl();
    const actief = h('input', { type: 'checkbox', id: 'ri-actief', checked: s.actief !== false });
    const taal = h('input', { type: 'checkbox', id: 'ri-taal', checked: s.taalcontrole !== false });
    const model = h('input', { type: 'text', id: 'ri-model', value: s.model, maxlength: 80 });
    const ollama = h('input', { type: 'text', id: 'ri-ollama', value: s.ollama_url, maxlength: 200 });
    const minRel = h('input', { type: 'number', id: 'ri-minrel', min: 0, max: 100, value: s.min_relevantie });
    const bewaar = h('input', { type: 'number', id: 'ri-bewaar', min: 14, max: 365, value: s.bewaar_dagen });
    const freq = {};
    const perRun = h('input', { type: 'number', id: 'ri-perrun', min: 1, max: 8, value: s.per_run ?? 4 });
    const freqRijen = Object.entries(RTYPE).map(([t, l]) => {
      const voorraad = h('input', { type: 'number', min: 0, max: 20, value: s.voorraad?.[t] ?? 0, 'aria-label': `${l} voorraad` });
      const aantal = h('input', { type: 'number', min: 0, max: 14, value: s.frequentie[t]?.aantal ?? 0, 'aria-label': `${l} aantal` });
      const per = h('select', { 'aria-label': `${l} per` }, h('option', { value: 'week', text: 'per week' }), h('option', { value: 'maand', text: 'per maand' })); per.value = s.frequentie[t]?.per || 'week';
      freq[t] = { aantal, per, voorraad };
      return h('tr', {}, h('td', { text: l }), h('td', {}, voorraad), h('td', {}, aantal), h('td', {}, per));
    });
    const onderwerpen = {};
    const ondVelden = ['weetje', 'kennis', 'zelftest', 'praktijk'].map((t) => {
      const ta = h('textarea', { id: `ri-ond-${t}`, rows: 6 }); ta.value = (s.onderwerpen[t] || []).join('\n'); onderwerpen[t] = ta;
      return field(`Onderwerpen ${RTYPE[t]} (één per regel; de bot neemt het eerste onderwerp dat nog niet bestaat)`, ta);
    });
    render(h('div', { class: 'portal-toolbar' }, h('h1', { class: 'portal-h1', text: 'Instellingen en planning' })), rNav('instellingen'), msg,
      h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Algemeen' }),
        h('div', { class: 'portal-check' }, actief, h('label', { for: 'ri-actief', text: 'Redactie actief (uit = de bot slaat geplande runs over)' })),
        h('div', { class: 'portal-check' }, taal, h('label', { for: 'ri-taal', text: 'Spelling- en grammaticacontrole via LanguageTool (alleen de concepttekst wordt verstuurd)' })),
        h('div', { class: 'portal-grid-form' },
          field('AI-model in Ollama', model, 'Bijvoorbeeld qwen2.5:14b of gemma3:12b. Eerst installeren met: ollama pull <model>'),
          field('Adres van Ollama', ollama, 'Op deze pc: http://localhost:11434'),
          field('Minimale relevantie voor een nieuwsartikel (0–100)', minRel), field('Ongebruikte nieuwsitems bewaren (dagen)', bewaar))),
      h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Planning: hoeveel concepten' }),
        h('p', { class: 'portal-hint', text: 'Voorraad: zoveel concepten per soort staan altijd klaar om na te lezen. Elke run vult de bot aan (hoogstens één per soort), zolang het maximum voor de week of maand niet is bereikt. Zo staat er ook werk klaar als jij er niet bent, zonder stapels oppervlakkige artikelen.' }),
        h('table', { class: 'portal-table' }, h('thead', {}, h('tr', {}, ['Soort', 'Voorraad klaarzetten', 'Maximaal nieuw', 'Per'].map((x) => h('th', { scope: 'col', text: x })))), h('tbody', {}, freqRijen)),
        field('Maximaal aantal nieuwe concepten per run (per ochtend)', perRun)),
      h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'Onderwerpen' }), ondVelden),
      h('div', { class: 'portal-actions' }, h('button', { type: 'button', class: 'btn btn-gold', text: 'Instellingen opslaan', onclick: async (e) => {
        busy(e.target, true);
        try {
          await api('redactie-instellingen-opslaan', { method: 'POST', body: { instellingen: {
            actief: actief.checked, taalcontrole: taal.checked, model: model.value, ollama_url: ollama.value, min_relevantie: minRel.value, bewaar_dagen: bewaar.value,
            frequentie: Object.fromEntries(Object.entries(freq).map(([t, x]) => [t, { aantal: x.aantal.value, per: x.per.value }])),
            voorraad: Object.fromEntries(Object.entries(freq).map(([t, x]) => [t, x.voorraad.value])), per_run: perRun.value,
            onderwerpen: Object.fromEntries(Object.entries(onderwerpen).map(([t, ta]) => [t, ta.value.split('\n').map((x) => x.trim()).filter(Boolean)])),
          } } });
          flash(msg, 'Opgeslagen. De bot gebruikt dit bij de volgende run.', 'ok');
        } catch (err) { flash(msg, err.message, 'error'); }
        busy(e.target, false);
      } })),
      h('section', { class: 'portal-card' }, h('h2', { class: 'portal-h2', text: 'De bot op de pc' }),
        h('p', { text: 'De bot draait op de pc met Ollama, elke ochtend via Windows Taakplanner. Installatie en het commando voor Taakplanner staan in docs/redactie.md in de projectmap. Handmatig starten (in de projectmap):' }),
        h('pre', { class: 'portal-code', text: 'npm run redactie' }),
        h('p', { class: 'portal-hint', text: 'Alleen verzamelen: npm run redactie -- --verzamelen · Eén weetje maken: npm run redactie -- --type weetje' })));
  }

  async function redactieLogboek() {
    const d = await api('redactie-runs');
    render(h('div', { class: 'portal-toolbar' }, h('h1', { class: 'portal-h1', text: 'Logboek en fouten' })), rNav('logboek'),
      h('div', { class: 'portal-card' }, d.items.length ? h('div', { class: 'portal-table-wrap' }, h('table', { class: 'portal-table' },
        h('thead', {}, h('tr', {}, ['Gestart', 'Taak', 'Status', 'Aantallen', 'Melding'].map((t) => h('th', { scope: 'col', text: t })))),
        h('tbody', {}, d.items.map((r) => h('tr', {}, h('td', { text: fmt(r.gestart_op) }), h('td', { text: r.taak }),
          h('td', {}, h('span', { class: r.status === 'ok' ? 'portal-red-ok' : r.status === 'fout' ? 'portal-red-fout' : 'portal-red-let', text: r.status })),
          h('td', { text: Object.entries(r.aantallen || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || '–' }), h('td', { class: 'red-melding', text: r.melding || '–' }))))))
        : h('p', { class: 'portal-muted', text: 'Nog geen runs.' })));
  }

  // ---------------------------------------------------------------- start
  api('ik').then((r) => { csrf = r.csrf; me = r.user; startApp(); }).catch((err) => {
    if (err.message === 'niet ingelogd') return;
    if (err.status === 503) render(h('div', { class: 'portal-card' }, h('h1', { class: 'portal-h1', text: 'Beheer nog niet beschikbaar' }), h('p', { text: err.message })));
    else showLogin();
  });
})();
