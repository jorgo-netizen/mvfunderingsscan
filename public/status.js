/* MV Funderingsscan – QuickScan Track & Trace (klantpagina /status/).
   Het token staat in het #-fragment van de link en gaat alleen in de body van een POST naar /api/status.
   Alle tekst wordt met textContent geplaatst (geen HTML uit de API). */
(function () {
  'use strict';
  const app = document.querySelector('[data-status-app]');
  if (!app) return;
  const state = (name) => {
    app.querySelectorAll('[data-state]').forEach((el) => { el.hidden = el.dataset.state !== name; });
    app.setAttribute('aria-busy', String(name === 'laden'));
  };
  const field = (k) => app.querySelector(`[data-veld="${k}"]`);
  const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const fmt = (iso, withTime) => {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).formatToParts(d);
    const g = (t) => (parts.find((p) => p.type === t) || {}).value;
    return `${g('day')} ${MONTHS[Number(g('month')) - 1]} ${g('year')}${withTime ? ` om ${g('hour')}:${g('minute')}` : ''}`;
  };

  const token = (new URLSearchParams(location.hash.slice(1)).get('t') || '').trim();
  if (!token) { state('geen-link'); return; }

  const post = (body) => fetch('/api/status/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
  }).then((r) => r.json().catch(() => ({ ok: false })).then((b) => ({ status: r.status, body: b })));

  function render(d) {
    field('dossier').textContent = d.dossier;
    field('label').textContent = d.label;
    field('text').textContent = d.text;
    field('message-wrap').hidden = !d.message;
    field('message').textContent = d.message || '';
    const t = field('updated'); t.dateTime = d.updated_at; t.textContent = fmt(d.updated_at, true);
    field('report').hidden = !d.report.available;
    field('report-later').hidden = !(d.status === 'afgerond' && !d.report.available);
    const list = field('steps'); list.textContent = '';
    d.steps.forEach((s, i) => {
      const li = document.createElement('li');
      li.className = `status-step${s.reached ? ' is-done' : ''}${s.current ? ' is-current' : ''}`;
      if (s.current) li.setAttribute('aria-current', 'step');
      const dot = document.createElement('span'); dot.className = 'status-step-dot'; dot.setAttribute('aria-hidden', 'true'); dot.textContent = s.reached && !s.current ? '✓' : String(i + 1);
      const body = document.createElement('div');
      const strong = document.createElement('strong'); strong.textContent = s.label;
      const small = document.createElement('span'); small.className = 'status-step-meta';
      small.textContent = s.current ? `Huidige stap${s.at ? ` · sinds ${fmt(s.at)}` : ''}` : s.reached ? (s.at ? `Bereikt op ${fmt(s.at)}` : 'Bereikt') : 'Nog niet bereikt';
      body.append(strong, small);
      li.append(dot, body);
      list.appendChild(li);
    });
    state('status');
    document.title = `Dossier ${d.dossier} – voortgang | MV Funderingsscan`;
  }

  post({ token }).then(({ status, body }) => {
    if (body.ok) return render(body);
    app.querySelector('[data-fout-tekst]').textContent = body.error || (status === 429 ? 'Te veel pogingen. Probeer het later opnieuw.' : 'Deze link is ongeldig of niet meer actief.');
    state('fout');
  }).catch(() => {
    app.querySelector('[data-fout-tekst]').textContent = 'De voortgang kan nu niet worden opgehaald. Controleer je internetverbinding en vernieuw de pagina.';
    state('fout');
  });

  const btn = app.querySelector('[data-rapport]');
  const err = app.querySelector('[data-rapport-fout]');
  if (btn) btn.addEventListener('click', () => {
    btn.disabled = true; err.hidden = true;
    post({ token, actie: 'rapport' }).then(({ body }) => {
      if (!body.ok || !body.url) throw new Error(body.error || 'Downloaden lukt nu niet.');
      window.location.assign(body.url);
    }).catch((e) => { err.textContent = `${e.message} Probeer het opnieuw of neem contact met ons op.`; err.hidden = false; })
      .finally(() => { btn.disabled = false; });
  });
})();
