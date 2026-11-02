/* MV Funderingsscan – cookiemelding en Google Analytics 4.
   Wordt alleen geladen als in src/content/site.json een GA4-meet-ID is ingevuld (analytics.ga4_id).
   GA4 laadt pas NA toestemming ("Accepteren"). Weigeren = geen GA4, geen analytische cookies.
   De keuze staat in de lokale opslag van de browser; via "Cookievoorkeuren" in de footer is hij te wijzigen. */
(() => {
  'use strict';
  const script = document.currentScript;
  const ID = script && script.dataset.ga;
  if (!ID || !/^G-[A-Z0-9]{4,15}$/.test(ID)) return;
  const SLEUTEL = 'mvfs-cookiekeuze';
  const lees = () => { try { return localStorage.getItem(SLEUTEL); } catch { return null; } };
  const bewaar = (v) => { try { localStorage.setItem(SLEUTEL, v); } catch { /* geen opslag: keuze geldt alleen deze pagina */ } };

  // ---------------------------------------------------------------- GA4 laden (alleen na toestemming)
  let geladen = false;
  function laadGa() {
    if (geladen) return; geladen = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', ID, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
    const s = document.createElement('script');
    s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`;
    document.head.append(s);
  }
  const ev = (naam, data = {}) => { if (geladen && window.gtag) window.gtag('event', naam, data); };

  // conversies en belangrijke klikken (geen persoonsgegevens: alleen soort formulier en paginapad)
  document.addEventListener('mvfs:event', (e) => {
    const d = (e && e.detail) || {};
    const naam = String(d.event || '').replace(/[^a-z0-9_]/gi, '_').slice(0, 40);
    if (!naam) return;
    const { event, ...rest } = d;
    const veilig = Object.fromEntries(Object.entries(rest).filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v)).map(([k, v]) => [k.slice(0, 40), typeof v === 'string' ? v.slice(0, 100) : v]));
    ev(naam === 'aanvraag_verzonden' || naam === 'lead_form_completed' ? 'generate_lead' : naam, { ...veilig, mvfs_event: naam });
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('tel:')) ev('telefoon_klik', { pagina: location.pathname });
    else if (href.startsWith('mailto:')) ev('mail_klik', { pagina: location.pathname });
    else if (/^\/funderingsscan-aanvragen\/?(\?|#|$)/.test(href)) ev('aanvraag_klik', { pagina: location.pathname, knop: (a.textContent || '').trim().slice(0, 60) });
  }, { capture: true });

  // ---------------------------------------------------------------- melding
  let melding = null;
  function toonMelding() {
    if (melding) { melding.hidden = false; return; }
    melding = document.createElement('div');
    melding.className = 'cookie-melding';
    melding.setAttribute('role', 'dialog');
    melding.setAttribute('aria-live', 'polite');
    melding.setAttribute('aria-label', 'Cookies');
    const p = document.createElement('p');
    p.append('We willen met Google Analytics meten hoe de website wordt gebruikt, zodat we hem kunnen verbeteren. Daarvoor zijn analytische cookies nodig. Mogen we die plaatsen? ');
    const link = document.createElement('a'); link.href = '/privacyverklaring/#cookies'; link.textContent = 'Meer in de privacyverklaring'; p.append(link, '.');
    const knoppen = document.createElement('div'); knoppen.className = 'cookie-knoppen';
    const ja = document.createElement('button'); ja.type = 'button'; ja.className = 'btn btn-gold'; ja.textContent = 'Accepteren';
    const nee = document.createElement('button'); nee.type = 'button'; nee.className = 'btn btn-ghost-dark'; nee.textContent = 'Weigeren';
    ja.addEventListener('click', () => { bewaar('ja'); melding.hidden = true; laadGa(); });
    nee.addEventListener('click', () => {
      const wasJa = lees() === 'ja'; bewaar('nee'); melding.hidden = true;
      if (wasJa) location.reload(); // GA4 was al geladen: opnieuw laden zonder
    });
    knoppen.append(nee, ja);
    melding.append(p, knoppen);
    document.body.append(melding);
  }

  // link "Cookievoorkeuren" onderaan elke pagina
  function voorkeurLink() {
    const plek = document.querySelector('.site-footer .footer-bottom, .site-footer');
    if (!plek || plek.querySelector('.cookie-voorkeur')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'cookie-voorkeur'; b.textContent = 'Cookievoorkeuren';
    b.addEventListener('click', toonMelding);
    plek.append(b);
  }

  const start = () => {
    voorkeurLink();
    const keuze = lees();
    if (keuze === 'ja') laadGa();
    else if (keuze !== 'nee') toonMelding();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
