/**
 * Afgeschermde en persoonlijke pagina's, als statische schil gebouwd (de gegevens komen via de API):
 *   /status/  – QuickScan Track & Trace voor klanten (token in het #-fragment, nooit naar de server in de URL)
 *   /beheer/  – beheerportaal voor medewerkers (inloggen, nieuws, aanvragen)
 * Beide: noindex, geen externe scripts, strenge Content-Security-Policy en Referrer-Policy (zie vercel.json).
 */
import { head, header, footer, breadcrumbsHtml, NAP } from './layout.mjs';

export function statusPage() {
  const page = {
    path: '/status/', title: 'Voortgang van je QuickScan | MV Funderingsscan',
    description: 'Bekijk met je persoonlijke link de voortgang van je QuickScan-aanvraag bij MV Funderingsscan.',
    robots: 'noindex, nofollow', canonical: false, schema: '',
    preload: '<meta name="referrer" content="no-referrer">\n  ', styles: ['/portaal.css'], scripts: ['/status.js'],
  };
  return `${head(page)}
${header('')}
<main id="main">
<section class="page-hero page-hero-compact" aria-labelledby="page-title">
  <div class="container page-hero-inner">
    <div class="page-hero-copy">
      ${breadcrumbsHtml([{ href: '/', name: 'Home' }, { href: '/status/', name: 'Voortgang QuickScan' }])}
      <p class="eyebrow eyebrow-light">Track &amp; Trace</p>
      <h1 id="page-title">Voortgang van je QuickScan</h1>
      <p class="page-hero-lead">Hier zie je de actuele stand van zaken van je aanvraag. De pagina toont alleen je dossiernummer en de status, geen adres of andere persoonsgegevens.</p>
    </div>
  </div>
</section>
<section class="section">
  <div class="container status-wrap">
    <noscript><div class="portal-note portal-note-warn"><strong>JavaScript staat uit.</strong> Zet JavaScript aan om de voortgang te bekijken, of bel ons op <a href="${NAP.phone_href}">${NAP.phone_display}</a>.</div></noscript>
    <div class="status-app" data-status-app aria-live="polite" aria-busy="true">
      <div class="portal-card status-loading" data-state="laden"><p>De voortgang wordt opgehaald…</p></div>
      <div class="portal-card" data-state="geen-link" hidden>
        <h2>Open de link uit je e-mail</h2>
        <p>Na je aanvraag voor een Fase 0 Quick Scan ontvang je een e-mail met een persoonlijke link naar deze pagina. Open die link om de voortgang te bekijken.</p>
        <p>Geen e-mail ontvangen? Kijk in je map met ongewenste e-mail of neem contact met ons op: <a href="${NAP.phone_href}">${NAP.phone_display}</a> of <a href="mailto:${NAP.email}">${NAP.email}</a>.</p>
      </div>
      <div class="portal-card" data-state="fout" hidden>
        <h2>Deze link werkt niet</h2>
        <p data-fout-tekst>Deze link is ongeldig of niet meer actief.</p>
        <p>Neem contact met ons op als je je dossier wilt volgen: <a href="${NAP.phone_href}">${NAP.phone_display}</a> of <a href="mailto:${NAP.email}">${NAP.email}</a>. We kunnen je een nieuwe link sturen.</p>
      </div>
      <div data-state="status" hidden>
        <div class="portal-card status-current">
          <p class="status-dossier">Dossier <strong data-veld="dossier"></strong></p>
          <p class="status-label-small">Huidige status</p>
          <h2 class="status-current-title" data-veld="label"></h2>
          <p data-veld="text"></p>
          <div class="portal-note" data-veld="message-wrap" hidden><strong>Bericht van MV Funderingsscan</strong><p data-veld="message"></p></div>
          <p class="status-updated">Laatst bijgewerkt: <time data-veld="updated"></time></p>
          <div class="status-uitkomst" data-veld="uitkomst" hidden>
            <p class="status-uitkomst-titel">Uitkomst Fase 0 – Funderingsrisico-onderzoek</p>
            <ol class="status-uitkomst-schaal" aria-label="Uitkomst">
              <li data-risico="laag"><span>Laag risico</span></li>
              <li data-risico="midden"><span>Midden risico</span></li>
              <li data-risico="hoog"><span>Hoog risico</span></li>
            </ol>
            <p class="status-uitkomst-tekst" data-veld="uitkomst-tekst"></p>
          </div>
          <div class="status-report" data-veld="report" hidden>
            <p><strong>Je rapport staat klaar.</strong> De downloadlink is één minuut geldig en wordt pas gemaakt als je op de knop klikt.</p>
            <button type="button" class="btn btn-gold" data-rapport>Download het rapport (PDF)</button>
            <p class="portal-error" data-rapport-fout role="alert" hidden></p>
          </div>
          <p class="status-report-later" data-veld="report-later" hidden>Het rapport is afgerond. Je ontvangt het rapport van ons zoals met je is afgesproken; heb je het nog niet ontvangen, neem dan contact met ons op.</p>
        </div>
        <div class="portal-card">
          <h2 class="portal-h2">Stappen</h2>
          <ol class="status-steps" data-veld="steps"></ol>
          <p class="status-hint">Deze pagina toont de stand op het moment dat je hem opent. Vernieuw de pagina om de laatste stand te zien. We vermelden geen opleverdatum zolang die niet vaststaat.</p>
        </div>
        <div class="portal-note">
          <strong>Je link is persoonlijk.</strong> Iedereen met deze link kan de voortgang van dit dossier zien. Deel hem daarom niet. Vragen? Bel <a href="${NAP.phone_href}">${NAP.phone_display}</a> of mail <a href="mailto:${NAP.email}">${NAP.email}</a> en vermeld je dossiernummer.
        </div>
      </div>
    </div>
  </div>
</section>
</main>
${footer()}`;
}

export function beheerPage() {
  const page = {
    path: '/beheer/', title: 'Beheer | MV Funderingsscan', description: 'Beheerportaal voor medewerkers van MV Funderingsscan.',
    robots: 'noindex, nofollow', canonical: false, schema: '',
    preload: '<meta name="referrer" content="no-referrer">\n  ', styles: ['/portaal.css'], scripts: ['/beheer.js'],
  };
  return `${head(page)}
<body class="portal-body">
<a class="skip-link" href="#main">Direct naar de inhoud</a>
<header class="portal-header">
  <div class="portal-header-inner">
    <a class="portal-brand" href="/beheer/"><img src="/assets/logo-mvfunderingsscan-wit.png" width="694" height="96" alt="MV Funderingsscan"><span>Beheer</span></a>
    <nav class="portal-nav" aria-label="Beheer" data-nav hidden>
      <a href="#/" data-nav-link="dashboard">Dashboard</a>
      <a href="#/nieuws" data-nav-link="nieuws">Nieuws</a>
      <a href="#/aanvragen" data-nav-link="aanvragen">Aanvragen</a>
      <a href="#/rapporten" data-nav-link="rapporten">Rapporten</a>
      <a href="#/redactie" data-nav-link="redactie">Redactie</a>
      <a href="#/medewerkers" data-nav-link="medewerkers">Medewerkers</a>
    </nav>
    <div class="portal-user" data-user hidden><span data-user-name></span><button type="button" class="btn btn-outline-light btn-sm" data-uitloggen>Uitloggen</button></div>
  </div>
</header>
<main id="main" class="portal-main" tabindex="-1">
  <noscript><div class="portal-note portal-note-warn">Het beheerportaal werkt alleen met JavaScript.</div></noscript>
  <div data-view aria-live="polite"><div class="portal-card"><p>Bezig met laden…</p></div></div>
</main>
</body>
</html>
`;
}
