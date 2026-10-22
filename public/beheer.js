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
  function render(...nodes) { view.textContent = ''; view.append(...nodes); }
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
  function route() {
    if (!me) return;
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    document.querySelectorAll('[data-nav-link]').forEach((a) => a.classList.toggle('is-active', a.dataset.navLink === (parts[0] || 'dashboard')));
    const go = parts[0] === 'nieuws' ? (parts[1] ? editNews(parts[1]) : listNews())
      : parts[0] === 'aanvragen' ? (parts[1] ? showRequest(parts[1]) : listRequests())
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
        : h('p', { class: 'portal-muted', text: 'Nog geen rapport geüpload. Zonder rapport ziet de klant bij "Rapport afgerond" dat hij het rapport op de afgesproken manier ontvangt.' }),
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
        h('div', {}, linkBox, report, mails, notes, del)),
    );
  }

  // ---------------------------------------------------------------- start
  api('ik').then((r) => { csrf = r.csrf; me = r.user; startApp(); }).catch((err) => {
    if (err.message === 'niet ingelogd') return;
    if (err.status === 503) render(h('div', { class: 'portal-card' }, h('h1', { class: 'portal-h1', text: 'Beheer nog niet beschikbaar' }), h('p', { text: err.message })));
    else showLogin();
  });
})();
