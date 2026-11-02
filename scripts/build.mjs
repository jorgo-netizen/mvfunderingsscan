/**
 * Bouwt de statische site naar dist/.
 *
 *   npm run build
 *
 * - kopieert public/ (css, js, afbeeldingen) naar dist/
 * - genereert alle contentpagina's uit src/content/pages/*.json
 * - bouwt de homepage, contact, aanvragen, funderingscheck, kennisbank-overzicht en 404
 * - schrijft sitemap.xml, robots.txt, llms.txt en site.webmanifest
 *   (nieuwe pagina's komen automatisch in sitemap en llms.txt)
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DOMAIN, TODAY, NAP, GA4_ID, ORG_ID, SITE_ID, esc, img, head, header, footer, breadcrumbsHtml,
  faqItems, faqHtml, ctaBand, jsonld, orgSchema, websiteSchema, serviceSchema, breadcrumbSchema, faqSchema,
} from '../src/lib/layout.mjs';
import { render, relatedHtml } from '../src/lib/template.mjs';
import { aanvraagForm, contactForm } from '../src/lib/forms.mjs';
import { openPlaceholders, SHOW_PLACEHOLDERS, rapportvoorbeeldCard, setMedewerkers } from '../src/lib/eeat.mjs';
import { statusPage, beheerPage } from '../src/lib/portal.mjs';
import { isSleutel } from '../api/_lib/indexnow.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');
const CONTENT = join(ROOT, 'src', 'content');
const readJson = (p) => JSON.parse(readFileSync(join(CONTENT, p), 'utf8'));

const site = readJson('site.json');
const home = readJson('home.json');
const urls = readJson('urls.json');
const pages = readdirSync(join(CONTENT, 'pages'))
  .filter((f) => f.endsWith('.json'))
  .sort()
  .flatMap((f) => readJson(join('pages', f)));
const byPath = Object.fromEntries(pages.map((p) => [p.path, p]));
// Staat GA4 aan (site.json → analytics.ga4_id), dan vermeldt de privacyverklaring dat, inclusief de toestemming.
if (GA4_ID && byPath['/privacyverklaring/']) {
  const c = byPath['/privacyverklaring/'].sections.find((s) => s.id === 'cookies');
  if (c) c.body += '<p>Geef je via de cookiemelding toestemming, dan gebruiken we ook <strong>Google Analytics 4</strong>. Dat plaatst analytische cookies om te meten hoe de website wordt gebruikt, bijvoorbeeld welke pagina\u2019s worden bekeken en of een aanvraagformulier is verstuurd (zonder de ingevulde gegevens). IP-adressen worden ingekort, gegevens worden niet gedeeld voor advertenties en Google Signals staat uit. Zonder toestemming laden we Google Analytics niet. Je keuze wijzig je via \u201cCookievoorkeuren\u201d onderaan elke pagina.</p>';
}
// Praktijkvoorbeelden: alleen echte cases in src/content/cases/*.json (bestanden met _ worden genegeerd).
const CASES_DIR = join(CONTENT, 'cases');
const cases = existsSync(CASES_DIR)
  ? readdirSync(CASES_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort().map((f) => {
    const c = JSON.parse(readFileSync(join(CASES_DIR, f), 'utf8'));
    return {
      ...c,
      path: `/praktijkvoorbeelden/${c.slug}/`,
      article: true,
      og_type: 'article',
      nav_active: '/kennisbank/',
      eyebrow: `Praktijkvoorbeeld · ${c.plaats}`,
      crumbs: [{ href: '/', name: 'Home' }, { href: '/praktijkvoorbeelden/', name: 'Praktijkvoorbeelden' }, { href: `/praktijkvoorbeelden/${c.slug}/`, name: c.h1 }],
    };
  })
  : [];
const homeTemplate = readFileSync(join(ROOT, 'src', 'templates', 'home-main.html'), 'utf8').replace(/\r\n/g, '\n');

// ---------------------------------------------------------------- wijzigingsdatum per pagina
// src/content/lastmod.json bewaart per pagina een vingerafdruk van de inhoud (<main>) en de datum waarop die
// voor het laatst veranderde. Alleen een inhoudelijke wijziging geeft een nieuwe datum (niet menu, footer of
// versienummers van bestanden). Die datum komt in de sitemap, dateModified en "Laatst inhoudelijk bijgewerkt".
const LASTMOD_FILE = join(CONTENT, 'lastmod.json');
const LASTMOD = existsSync(LASTMOD_FILE) ? JSON.parse(readFileSync(LASTMOD_FILE, 'utf8')) : {};
const BOUWDATUM = new Date().toISOString().slice(0, 10);
const MAANDEN_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const datumNl = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MAANDEN_NL[m - 1]} ${y}`; };
let lastmodGewijzigd = false;
const paginaDatum = {};
function metDatum(path, html) {
  const main = (html.match(/<main[\s\S]*<\/main>/) || [''])[0]
    .replace(/<time[^>]*>[^<]*<\/time>/g, '').replace(/\?v=[\w-]+/g, '').replace(/"date(Modified|Published)": "[^"]*"/g, '');
  if (!main) return html;
  const hash = createHash('sha256').update(main).digest('hex').slice(0, 16);
  const oud = LASTMOD[path];
  const datum = oud && oud.hash === hash ? oud.datum : BOUWDATUM;
  if (!oud || oud.hash !== hash) { LASTMOD[path] = { hash, datum, eerste: oud?.eerste || datum }; lastmodGewijzigd = true; }
  paginaDatum[path] = datum;
  return html.split(`"dateModified": "${TODAY}"`).join(`"dateModified": "${datum}"`)
    .split(`"datePublished": "${TODAY}"`).join(`"datePublished": "${LASTMOD[path].eerste}"`)
    .split(`<time>${datumNl(TODAY)}</time>`).join(`<time datetime="${datum}">${datumNl(datum)}</time>`)
    .split(`property="article:modified_time" content="${TODAY}"`).join(`property="article:modified_time" content="${datum}"`)
    .split(`property="article:published_time" content="${TODAY}"`).join(`property="article:published_time" content="${LASTMOD[path].eerste}"`);
}

function write(path, content) {
  if (path.endsWith('/') && content.includes('<main')) content = metDatum(path, content);
  const target = path.endsWith('/') ? join(OUT, path, 'index.html') : join(OUT, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
}

const teaser = (s) => s.slice(0, 150).split(' ').slice(0, -1).join(' ');

function kbCards(items, cls = 'related-grid') {
  const cards = items.filter(Boolean).map((p) => `      <a class="related-card reveal" href="${p.path}">
        <strong>${esc(p.h1)}</strong>
        <span>${esc(teaser(p.description))}…</span>
        <em aria-hidden="true">→</em>
      </a>`).join('\n');
  return `<div class="${cls}">\n${cards}\n    </div>`;
}

/** Generieke pagina met eigen inhoud (contact, aanvragen, check, kennisbank-overzicht). */
function specialPage({ path, title, description, crumbs, eyebrow, h1, lead, body, type = 'WebPage', faqs = null, extraSchema = [], navActive = '', heroImage = null }) {
  const url = DOMAIN + path;
  const graph = [orgSchema(), websiteSchema(), {
    '@type': type, '@id': url + '#webpagina', url, name: title, description, inLanguage: 'nl-NL',
    isPartOf: { '@id': SITE_ID }, about: { '@id': ORG_ID }, breadcrumb: { '@id': url + '#breadcrumb' }, dateModified: TODAY,
  }, breadcrumbSchema(url, crumbs), ...extraSchema];
  if (faqs) graph.push(faqSchema(url, faqs));
  const hero = heroImage ? `<div class="page-hero-media">${img(heroImage.name, heroImage.alt, '100vw', { lazy: false })}</div>` : '';
  const html = `${header(navActive)}
<main id="main">
<section class="page-hero${hero ? ' page-hero-has-media' : ''}" aria-labelledby="page-title">
  ${hero}
  <div class="container page-hero-inner">
    <div class="page-hero-copy">
      ${breadcrumbsHtml(crumbs)}
      <p class="eyebrow eyebrow-light">${eyebrow}</p>
      <h1 id="page-title">${h1}</h1>
      <p class="page-hero-lead">${lead}</p>
    </div>
  </div>
</section>
${body}
${faqs ? faqHtml(faqs) : ''}
</main>
${footer()}`;
  write(path, head({ path, title, description, schema: jsonld(graph) }) + '\n' + html);
}

// =================================================================== homepage
const HOME_ABOUT = `<!-- ============ OVER ONS ============ -->
<section class="section" id="over-ons" aria-labelledby="about-title">
  <div class="container about-grid">
    <div class="reveal">
      <p class="eyebrow">Over MV Funderingsscan</p>
      <h2 class="section-title" id="about-title">Wie is MV Funderingsscan?</h2>
      <p class="answer-first">MV Funderingsscan is een gespecialiseerde aanbieder van funderingsonderzoek voor woningen in Friesland, Groningen en Noord-Drenthe, gevestigd in Leeuwarden.</p>
      <p>We richten ons uitsluitend op funderingen: van de eerste Quick Scan tot onderzoek met metingen. Elk onderzoek volgt dezelfde vaste opbouw – vooronderzoek in archieven en bodemgegevens, een inspectie op locatie en een rapport met een duidelijke conclusie. We voeren zelf geen funderingsherstel uit, zodat ons advies onafhankelijk blijft.</p>
      <p><a class="text-link" href="/over-ons/">Meer over MV Funderingsscan</a></p>
    </div>
    <aside class="facts-card facts-card-light reveal" aria-label="Bedrijfsgegevens">
      <p class="facts-title">Bedrijfsgegevens</p>
      <dl>
        <div><dt>Naam</dt><dd>${NAP.name}</dd></div>
        <div><dt>Adres</dt><dd>${NAP.street}, ${NAP.postal} ${NAP.city}</dd></div>
        <div><dt>Telefoon</dt><dd><a href="${NAP.phone_href}">${NAP.phone_display}</a></dd></div>
        <div><dt>E-mail</dt><dd><a href="mailto:${NAP.email}">${NAP.email}</a></dd></div>
        <div><dt>Openingstijden</dt><dd>${NAP.hours_display}</dd></div>
        <div><dt>Werkgebied</dt><dd><a href="/werkgebied/">Friesland, Groningen en Noord-Drenthe</a></dd></div>
      </dl>
    </aside>
  </div>
</section>`;

const HOME_PROBLEMS = `<!-- ============ SIGNALEN ============ -->
<section class="section" id="signalen" aria-labelledby="signals-title">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Funderingsproblemen herkennen</p>
      <h2 class="section-title" id="signals-title">Welke signalen kunnen op de fundering wijzen?</h2>
      <p class="answer-first">Scheuren, verzakking, scheefstand en klemmende deuren of ramen kúnnen op funderingsproblemen wijzen, maar hebben vaak ook een andere oorzaak. Pas de combinatie van signalen en een inspectie ter plaatse geven duidelijkheid.</p>
    </div>
    <div class="related-grid">
${[
    ['/scheuren-in-gevel/', 'Scheuren in de gevel', 'Verticaal, diagonaal of trapvormig: wat zeggen scheuren wel en niet?'],
    ['/verzakking-woning/', 'Verzakking van de woning', 'Het verschil tussen normale zetting en een funderingsprobleem.'],
    ['/scheefstand-woning/', 'Scheefstand', 'Gevels of kozijnen uit het lood: waar let je op?'],
    ['/klemmende-deuren-en-ramen/', 'Klemmende deuren en ramen', 'Vaak onschuldig, soms een signaal van vervorming.'],
    ['/problemen-met-houten-palen/', 'Houten paalfundering', 'Grondwater, droogstand en paalrot uitgelegd.'],
    ['/funderingsproblemen/', 'Alle funderingsproblemen', 'Overzicht van signalen, oorzaken en de juiste vervolgstap.'],
  ].map(([h, l, t]) => `      <a class="related-card reveal" href="${h}">
        <strong>${l}</strong>
        <span>${t}</span>
        <em aria-hidden="true">→</em>
      </a>`).join('\n')}
    </div>
  </div>
</section>`;

function buildHome() {
  const bySlug = Object.fromEntries(pages.filter((p) => p.path.startsWith('/kennisbank/')).map((p) => [p.path.split('/')[2], p]));
  const fill = {
    '{{IMG_HERO}}': img('funderingsmeting-laser-tablet',
      'Persoon met een tablet en lasermeetapparatuur bij een meting op de vloer van een woning',
      '(min-width: 1181px) 80vw, 100vw', { lazy: false, priority: true }),
    '{{IMG_GEVEL}}': img('metselwerk-gevel-detail', 'Close-up van metselwerk en voegen in een bakstenen gevel', '(min-width: 901px) 590px, 100vw'),
    '{{IMG_STRAAT}}': img('jaren-dertig-woningen-straat', 'Rij vooroorlogse bakstenen woningen in een groene straat', '(min-width: 901px) 590px, 100vw'),
    '{{IMG_VOORDEUR}}': img('vooroorlogse-woning-voordeur', 'Klassieke voordeur in een vooroorlogse bakstenen gevel', '(min-width: 901px) 560px, 100vw'),
    '{{IMG_STRAAT_WIDE}}': img('jaren-dertig-woningen-straat',
      'Jaren-dertigwoningen met bakstenen gevels, een type woning waarbij funderingsonderzoek vaak zinvol is', '(min-width: 901px) 600px, 100vw'),
    '{{HOME_FAQ}}': faqItems(home.faqs),
    '{{HOME_ABOUT}}': HOME_ABOUT,
    '{{HOME_PROBLEMS}}': HOME_PROBLEMS,
    '{{HOME_KB}}': `<!-- ============ KENNISBANK ============ -->
<section class="section section-alt" id="kennisbank" aria-labelledby="kb-title">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Kennisbank</p>
      <h2 class="section-title" id="kb-title">Meer weten over funderingen?</h2>
      <p class="section-intro">Korte, feitelijke antwoorden op de vragen die we het vaakst krijgen. <a class="inline-link" href="/kennisbank/">Bekijk de hele kennisbank</a>.</p>
    </div>
    ${kbCards(home.kbHighlights.map((s) => bySlug[s]))}
  </div>
</section>`,
  };
  let s = homeTemplate;
  for (const [k, v] of Object.entries(fill)) s = s.replace(k, () => v);
  if (s.includes('{{')) throw new Error('Onvervangen placeholder in home-main.html');

  const url = DOMAIN + '/';
  const title = 'Funderingsonderzoek in Friesland & Groningen | MV Funderingsscan';
  const graph = [orgSchema(), websiteSchema(), {
    '@type': 'WebPage', '@id': url + '#webpagina', url, name: title,
    inLanguage: 'nl-NL', isPartOf: { '@id': SITE_ID }, about: { '@id': ORG_ID },
    primaryImageOfPage: `${DOMAIN}/assets/img/funderingsmeting-laser-tablet-1536.webp`, dateModified: TODAY,
  }, serviceSchema('funderingsscan'), serviceSchema('fase0'), serviceSchema('fase1'), faqSchema(url, home.faqs)];
  write('/', head({
    path: '/', title,
    description: 'Onafhankelijk funderingsonderzoek in Friesland, Groningen en Noord-Drenthe. Quick Scan vanaf €350 incl. btw, rapport binnen 2 werkdagen. Vraag een scan aan.',
    schema: jsonld(graph),
    preload: '<link rel="preload" as="image" type="image/webp" fetchpriority="high" imagesrcset="/assets/img/funderingsmeting-laser-tablet-640.webp 640w, /assets/img/funderingsmeting-laser-tablet-1024.webp 1024w, /assets/img/funderingsmeting-laser-tablet-1536.webp 1536w" imagesizes="(min-width: 1181px) 80vw, 100vw">\n  ',
  }) + '\n' + header('/') + s + footer());
}

// =================================================================== aanvragen
function buildAanvragen() {
  specialPage({
    path: '/funderingsscan-aanvragen/',
    title: 'Funderingsscan aanvragen | Prijs vooraf bekend | MV Funderingsscan',
    description: 'Vraag online een funderingsscan aan voor je woning in Friesland, Groningen of Noord-Drenthe. We bellen je dezelfde dag terug en noemen vooraf de prijs.',
    crumbs: [{ href: '/', name: 'Home' }, { href: '/funderingsscan-aanvragen/', name: 'Funderingsscan aanvragen' }],
    eyebrow: 'Aanvragen',
    h1: 'Funderingsscan aanvragen',
    lead: 'Vraag hier een funderingsscan aan voor een woning in Friesland, Groningen of Noord-Drenthe. Het invullen duurt een paar minuten en we bellen je dezelfde dag terug. Hoe meer je vertelt over de woning en je situatie, hoe beter we je kunnen adviseren. Je hoort altijd eerst wat het onderzoek kost.',
    navActive: '',
    body: `<section class="section section-navy apply" id="aanvragen" aria-labelledby="apply-title">
  <div class="container apply-layout apply-layout-wide">
    <div class="apply-copy reveal">
      <h2 class="section-title" id="apply-title">Zo werkt je aanvraag</h2>
      <ol class="mini-steps mini-steps-dark">
        <li><strong>Formulier invullen</strong><span>Gegevens van jou en de woning, en wat je ziet.</span></li>
        <li><strong>Persoonlijk contact</strong><span>We bellen je dezelfde dag terug, bespreken je situatie en adviseren welke fase past.</span></li>
        <li><strong>Prijs vooraf bekend</strong><span>Pas na jouw akkoord plannen we de inspectie, meestal binnen enkele werkdagen.</span></li>
        <li><strong>Rapport</strong><span>Binnen 2 werkdagen na de opname, met conclusie en advies.</span></li>
      </ol>
      <p>Liever eerst overleggen? Bel <a href="${NAP.phone_href}">${NAP.phone_display}</a> of <a href="/contact/">stel je vraag via het contactformulier</a>.</p>
      <p>Twijfel je of onderzoek nodig is? <a href="/gratis-funderingscheck/">Doe eerst de online funderingscheck</a> of lees <a href="/quickscan-fundering/">wat een quickscan fundering inhoudt</a> en <a href="/prijzen/">wat het kost</a>.</p>
    </div>
    ${aanvraagForm()}
  </div>
</section>`,
    faqs: [
      { q: 'Wat gebeurt er nadat ik de aanvraag heb verstuurd?', a: '<p>We bellen je dezelfde dag terug om je situatie te bespreken. Je spreekt Melvin Krikke of Rutger Fopma, de bouwkundig adviseurs die het onderzoek ook uitvoeren. Daarna hoor je wat het onderzoek kost. Pas als je akkoord bent, plannen we het onderzoek in – meestal binnen enkele werkdagen.</p>' },
      { q: 'Zit ik ergens aan vast als ik dit formulier invul?', a: '<p>Nee. Het formulier is een aanvraag, geen opdracht. Je beslist pas nadat je de prijs weet.</p>' },
      { q: 'Wat als ik niet weet welke fase ik nodig heb?', a: '<p>Kies dan "Weet ik nog niet". We adviseren je op basis van je situatie. In de meeste gevallen begint het onderzoek met <a href="/fase-0-funderingsonderzoek/">fase 0, de Quick Scan</a>.</p>' },
      { q: 'Wat kost het onderzoek dat ik hier aanvraag?', a: '<p>Een fase 0 funderingsscan begint vanaf €350; fase 1 kost vanaf €950. Beide prijzen zijn inclusief btw. Zie <a href="/prijzen/">prijzen</a>.</p>' },
    ],
  });
}

// =================================================================== contact
function buildContact() {
  specialPage({
    path: '/contact/',
    title: 'Contact | MV Funderingsscan Leeuwarden | +31 (0) 582037172',
    description: 'Neem contact op met MV Funderingsscan in Leeuwarden. Bel +31 (0) 582037172: je spreekt Melvin of Rutger, en via het formulier bellen we dezelfde dag terug.',
    crumbs: [{ href: '/', name: 'Home' }, { href: '/contact/', name: 'Contact' }],
    eyebrow: 'Contact',
    h1: 'Contact met MV Funderingsscan',
    lead: 'Heb je een vraag over funderingsonderzoek, weet je niet welke fase je nodig hebt of wil je een prijs? Bel, mail of stuur je vraag via het formulier. Je spreekt Melvin Krikke of Rutger Fopma, de bouwkundig adviseurs die het onderzoek ook uitvoeren. MV Funderingsscan werkt in Friesland, Groningen en Noord-Drenthe.',
    type: 'ContactPage',
    navActive: '/contact/',
    body: `<section class="section section-navy apply" id="contact-formulier" aria-labelledby="apply-title">
  <div class="container apply-layout">
    <div class="apply-copy reveal">
      <h2 class="section-title" id="apply-title">Contactgegevens</h2>
      <address class="nap-block">
        <strong>${NAP.name}</strong><br>
        ${NAP.street}<br>
        ${NAP.postal} ${NAP.city}
      </address>
      <div class="apply-contact">
        <a href="${NAP.phone_href}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.57 3.6a1 1 0 0 1-.25 1z"/></svg>${NAP.phone_display}</a>
        <a href="mailto:${NAP.email}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/></svg>${NAP.email}</a>
      </div>
      <p class="nap-hours">Bereikbaar: ${NAP.hours_display}. Laat je via het formulier je gegevens achter, dan bellen we je dezelfde dag terug.</p>
      <p><strong>Werkgebied:</strong> <a href="/funderingsonderzoek-friesland/">Friesland</a>, <a href="/funderingsonderzoek-groningen/">Groningen</a> en <a href="/werkgebied/#noord-drenthe">Noord-Drenthe</a> – zie <a href="/werkgebied/">ons werkgebied</a>.</p>
      <p>Direct een onderzoek aanvragen? Gebruik het <a href="/funderingsscan-aanvragen/">uitgebreide aanvraagformulier</a>.</p>
    </div>
    ${contactForm()}
  </div>
</section>
${relatedHtml([
    { href: '/funderingsscan-aanvragen/', label: 'Funderingsscan aanvragen', text: 'Het uitgebreide formulier met gegevens over de woning.' },
    { href: '/prijzen/', label: 'Bekijk prijzen', text: 'Indicatieve prijzen voor fase 0 en fase 1.' },
    { href: '/werkwijze/', label: 'Onze werkwijze', text: 'Van aanvraag tot rapport in zeven stappen.' },
  ], 'Handig om te weten')}`,
  });
}

// =================================================================== kennisbank-overzicht
function buildKbIndex() {
  const path = '/kennisbank/';
  const url = DOMAIN + path;
  const kb = pages.filter((p) => p.path.startsWith('/kennisbank/'));
  const bySlug = Object.fromEntries(kb.map((p) => [p.path.split('/')[2], p]));
  const grouped = new Set(site.kbGroups.flatMap(([, s]) => s));
  const rest = kb.filter((p) => !grouped.has(p.path.split('/')[2]));
  const groups = [...site.kbGroups, ...(rest.length ? [['Overig', rest.map((p) => p.path.split('/')[2])]] : [])];
  const blocks = groups.map(([title, slugs]) => `    <h2 class="kb-group-title reveal">${title}</h2>
    ${kbCards(slugs.map((s) => bySlug[s]))}`).join('\n');
  const guides = [
    ['/funderingsscan/', 'Funderingsscan', 'Alles over de dienst, van aanvraag tot rapport.'],
    ['/quickscan-fundering/', 'Quickscan fundering', 'Wanneer en waarom een quickscan.'],
    ['/fase-0-funderingsonderzoek/', 'Fase 0 funderingsonderzoek', 'De methodiek en uitkomsten in detail.'],
    ['/fase-1-funderingsonderzoek/', 'Fase 1 funderingsonderzoek', 'Metingen en vervolgadvies.'],
    ['/funderingsproblemen/', 'Funderingsproblemen', 'Signalen, oorzaken en vervolgstappen.'],
    ['/funderingsonderzoek-bij-aankoop/', 'Funderingsonderzoek bij aankoop', 'Meer inzicht voordat je tekent.'],
  ];
  specialPage({
    path,
    title: 'Kennisbank funderingsonderzoek | Antwoorden | MV Funderingsscan',
    description: `${kb.length} heldere artikelen over funderingsscans, fase 0 en 1, metingen zoals lintvoegwaterpassing, scheuren, zetting, bodem en kosten.`,
    crumbs: [{ href: '/', name: 'Home' }, { href: path, name: 'Kennisbank' }],
    eyebrow: 'Kennisbank',
    h1: 'Kennisbank funderingsonderzoek',
    lead: 'Korte, feitelijke antwoorden op vrijwel elke basisvraag over funderingsscans, de quickscan, fase 0 en fase 1, funderingsproblemen en de bodem in Friesland en Groningen. Elk artikel begint met een direct antwoord.',
    type: 'CollectionPage',
    navActive: '/kennisbank/',
    extraSchema: [{
      '@type': 'ItemList', '@id': url + '#overzicht',
      itemListElement: kb.map((i, n) => ({ '@type': 'ListItem', position: n + 1, url: DOMAIN + i.path, name: i.h1 })),
    }],
    body: `<section class="section">
  <div class="container">
    <div class="kb-guides reveal">
      <p class="facts-title">Uitgebreide gidsen</p>
      <ul class="town-chips">${guides.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul>
    </div>
    ${rapportvoorbeeldCard()}
${blocks}
  </div>
</section>
${ctaBand()}`,
  });
}

// =================================================================== begrippenlijst
function buildGlossary() {
  const path = '/kennisbank/begrippenlijst/';
  const url = DOMAIN + path;
  // Elke pagina met een defined_term komt automatisch in de lijst, aangevuld met losse begrippen uit site.json.
  const terms = [
    ...pages.filter((p) => p.defined_term).map((p) => ({ ...p.defined_term, href: p.path })),
    ...(site.glossaryExtra || []),
  ].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const letters = [...new Set(terms.map((t) => t.name[0].toUpperCase()))];
  const groups = letters.map((L) => `    <section class="glossary-group reveal" id="letter-${L.toLowerCase()}" aria-labelledby="h-${L.toLowerCase()}">
      <h2 class="glossary-letter" id="h-${L.toLowerCase()}">${L}</h2>
      <dl class="def-list glossary-list">
${terms.filter((t) => t.name[0].toUpperCase() === L).map((t) => `        <div id="${slug(t.name)}"><dt><dfn>${esc(t.name)}</dfn></dt><dd>${esc(t.description)} <a href="${t.href}">Lees meer over ${esc(t.name.toLowerCase().startsWith('kcaf') || t.name.startsWith('NAP') ? t.name : t.name.toLowerCase())}</a></dd></div>`).join('\n')}
      </dl>
    </section>`).join('\n');
  specialPage({
    path,
    title: 'Begrippenlijst funderingsonderzoek | MV Funderingsscan',
    description: `Alle vaktermen rond funderingsonderzoek helder uitgelegd: van lintvoegwaterpassing en loodmeting tot zetting, paalrot en fase 0. ${terms.length} begrippen met definitie.`.slice(0, 158),
    crumbs: [{ href: '/', name: 'Home' }, { href: '/kennisbank/', name: 'Kennisbank' }, { href: path, name: 'Begrippenlijst' }],
    eyebrow: 'Kennisbank · Begrippen',
    h1: 'Begrippenlijst funderingsonderzoek',
    lead: `Wat betekent zetting, wat is een lintvoeg en wat is het verschil tussen fase 0 en fase 1? In deze begrippenlijst staan ${terms.length} vaktermen uit funderingsonderzoek, elk met een korte definitie en een link naar de uitgebreide uitleg.`,
    type: 'CollectionPage',
    navActive: '/kennisbank/',
    extraSchema: [{
      '@type': 'DefinedTermSet',
      '@id': url + '#begrippen',
      name: 'Begrippenlijst funderingsonderzoek',
      url,
      inLanguage: 'nl-NL',
      hasDefinedTerm: terms.map((t) => ({ '@type': 'DefinedTerm', name: t.name, description: t.description, url: DOMAIN + t.href })),
    }],
    body: `<section class="section">
  <div class="container">
    <nav class="glossary-nav reveal" aria-label="Begrippen per letter">${letters.map((L) => `<a href="#letter-${L.toLowerCase()}">${L}</a>`).join('')}</nav>
${groups}
  </div>
</section>
${ctaBand('Een begrip toegepast zien op jouw woning?', 'Met een fase 0 funderingsscan vertalen we deze begrippen naar de situatie van jouw woning, met een helder rapport en advies.')}`,
  });
  return path;
}

// =================================================================== 404
function build404() {
  const page = {
    path: '/404.html', title: 'Pagina niet gevonden | MV Funderingsscan',
    description: 'Deze pagina bestaat niet (meer). Ga naar de homepage of bekijk onze funderingsscan.',
    robots: 'noindex, follow', canonical: false, schema: '',
  };
  const links = [['/funderingsscan/', 'Funderingsscan'], ['/quickscan-fundering/', 'Quickscan fundering'], ['/fase-0-funderingsonderzoek/', 'Fase 0'], ['/fase-1-funderingsonderzoek/', 'Fase 1'],
    ['/prijzen/', 'Prijzen'], ['/funderingsproblemen/', 'Funderingsproblemen'], ['/werkgebied/', 'Werkgebied'], ['/kennisbank/', 'Kennisbank'], ['/contact/', 'Contact']];
  write('/404.html', head(page) + '\n' + `${header('')}
<main id="main">
<section class="page-hero page-hero-404" aria-labelledby="page-title">
  <div class="container page-hero-inner">
    <div class="page-hero-copy">
      <p class="eyebrow eyebrow-light">Foutcode 404</p>
      <h1 id="page-title">Deze pagina bestaat niet</h1>
      <p class="page-hero-lead">Misschien is de pagina verplaatst of is de link niet helemaal goed. Hieronder vind je de belangrijkste pagina's.</p>
      <div class="hero-buttons">
        <a class="btn btn-gold btn-lg" href="/">Naar de homepage <span aria-hidden="true">→</span></a>
        <a class="btn btn-outline-light btn-lg" href="/funderingsscan/">Bekijk de funderingsscan</a>
      </div>
    </div>
  </div>
</section>
<section class="section section-tight">
  <div class="container">
    <ul class="side-links side-links-grid">
${links.map(([h, l]) => `      <li><a href="${h}">${l}</a></li>`).join('\n')}
    </ul>
  </div>
</section>
</main>
${footer()}`);
}

// =================================================================== crawler-bestanden
function buildMetaFiles(paths) {
  write('/robots.txt', `# robots.txt – mvfunderingsquickscan.nl
# Alle zoekmachines en AI-zoekdiensten zijn welkom.
# /beheer/ en /status/ zijn bewust NIET geblokkeerd: ze hebben noindex (meta en X-Robots-Tag), en dat kan Google alleen lezen als hij de pagina mag ophalen.

User-agent: *
Allow: /
Disallow: /api/

# Expliciet: OpenAI zoekcrawler en gebruikersverzoeken vanuit ChatGPT
User-agent: OAI-SearchBot
Allow: /
Disallow: /api/

User-agent: ChatGPT-User
Allow: /
Disallow: /api/

User-agent: PerplexityBot
Allow: /
Disallow: /api/

User-agent: Bingbot
Allow: /
Disallow: /api/

User-agent: Googlebot
Allow: /
Disallow: /api/

Sitemap: ${DOMAIN}/sitemap.xml
Sitemap: ${DOMAIN}/nieuws-sitemap.xml
`);

  const meta = Object.fromEntries(urls.map((u) => [u.path, u]));
  const priority = (path) => {
    if (path === '/') return '1.0';
    if (['/funderingsscan/', '/quickscan-fundering/', '/fase-0-funderingsonderzoek/'].includes(path)) return '0.9';
    const g = meta[path]?.group;
    if (g === 'diensten' || g === 'aankoop' || path === '/funderingsscan-aanvragen/') return '0.8';
    if (g === 'regio' || g === 'problemen') return '0.7';
    return '0.6';
  };
  const urlsXml = [...new Set(paths)].map((path) => `  <url>\n    <loc>${DOMAIN}${path}</loc>\n    <lastmod>${paginaDatum[path] || TODAY}</lastmod>\n    <priority>${priority(path)}</priority>\n  </url>`);
  write('/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urlsXml.join('\n') + '\n</urlset>\n');

  const line = (p) => `- [${p.h1}](${DOMAIN}${p.path}): ${p.description}`;
  const groupLines = (g) => pages.filter((p) => meta[p.path]?.group === g).map(line).join('\n');
  write('/llms.txt', `# MV Funderingsscan

> MV Funderingsscan B.V. (Leeuwarden) voert onafhankelijk funderingsonderzoek uit aan woningen in Friesland, Groningen en Noord-Drenthe. Het onderzoek begint in de regel met een Quick Scan (fase 0, vanaf €350 incl. btw, rapport binnen 2 werkdagen na de opname). Geeft die daar aanleiding toe, dan volgt fase 1 met metingen (vanaf €950 incl. btw). Beide fases voert MV Funderingsscan zelf uit; funderingsherstel doet het niet.

## Kernfeiten (gecontroleerd ${TODAY}; bronnen: ${DOMAIN}/bronnen-en-richtlijnen/)
- Onafhankelijk: MV Funderingsscan doet uitsluitend onderzoek en voert geen funderingsherstel uit.
- Werkgebied: heel Friesland, de hele provincie Groningen en Noord-Drenthe (gemeenten Assen, Tynaarlo, Noordenveld en Aa en Hunze), vanuit Leeuwarden.
- Prijs: fase 0 vanaf €350, fase 1 vanaf €950, beide inclusief btw; de definitieve prijs hoor je vooraf.
- Contact: na een aanvraag bellen we dezelfde dag terug. Het onderzoek wordt uitgevoerd door de bouwkundig adviseurs Melvin Krikke en Rutger Fopma. Telefoon +31 (0) 582037172, e-mail info@mideavastgoed.nl.
- Fase 0 (Quick Scan): archief- en bodemonderzoek, visuele inspectie (kruipruimte voor zover toegankelijk) en een risico-inschatting met advies. Zonder graafwerk. Kan niet vaststellen: de exacte conditie van houten palen, verborgen gebreken, constructieve capaciteit, resterende levensduur of exacte herstelkosten.
- Fase 1: metingen zoals lintvoegwaterpassing, loodmeting en vloerveldwaterpassing. Brengt de huidige scheefstand en hoogteverschillen in beeld; of een woning nog beweegt, blijkt pas uit herhaalde metingen (monitoring). Een inspectieput (graven) is een aparte, verdergaande stap.
- Fasenamen verschillen per bron: de KCAF-richtlijn spreekt van onderdelen; deze site gebruikt de indeling van MV Funderingsscan.
- KCAF-risicoklassen: A geen risico, B licht risico, C verhoogd risico of onzekerheid, D hoog risico (nader onderzoek passend), E vastgesteld funderingsprobleem. Een modelmatige inschatting, geen vaststelling van de staat van de fundering.
- Taxatie (NRVT, sinds 1 april 2026): de taxateur neemt de KCAF-risicoklasse op; bij klasse D of E moet in principe eerst een aanvullend (beperkt) funderingsonderzoek plaatsvinden voordat de taxatie wordt afgerond, met uitzonderingen.
- NHG heeft aangekondigd dat vanaf 1 januari 2027 bij klasse D of E een verkennend funderingsonderzoek verplicht is voor een lening met NHG, en dat geldverstrekkers bij een hoog funderingsrisico de verwachte herstelkosten meewegen bij de maximale hypotheek.
- "Funderingslabel" is de gangbare term voor de funderingsrisicoklasse A-E. Gratis indicaties per postcode op internet beschrijven een gebied, niet een pand; de KCAF-klasse in het taxatierapport is een modelmatige inschatting per pand; alleen onderzoek ter plaatse (fase 0, fase 1) kijkt naar de woning zelf.
- Er is geen algemene wettelijke plicht tot funderingsonderzoek bij koop of verkoop; de verkoper heeft een mededelingsplicht en de koper een onderzoeksplicht.

Contact: ${NAP.name}, ${NAP.street}, ${NAP.postal} ${NAP.city}. Telefoon ${NAP.phone_display}. E-mail ${NAP.email}. Bereikbaar ${NAP.hours_display}.

## Diensten
${groupLines('diensten')}

## Kopen, verkopen en taxatie
${groupLines('aankoop')}

## Funderingsproblemen
${groupLines('problemen')}

## Werkgebied
${groupLines('regio')}

## Werkgebied per gemeente (alle kernen)
${(site.gemeenten || []).map((g) => `- Gemeente ${g.naam} (${g.provincie}): ${g.kernen.join(', ')} – ${DOMAIN}${g.href}`).join('\n')}

## Kennisbank
${groupLines('kennisbank')}

## Interactieve hulpmiddelen (indicaties en uitleg, geen diagnose)
${groupLines('hulpmiddelen')}

## Over MV Funderingsscan
${groupLines('over')}
- [Funderingsscan aanvragen](${DOMAIN}/funderingsscan-aanvragen/): aanvraagformulier; de prijs hoor je vooraf.
- [Contact](${DOMAIN}/contact/): adres, telefoon, e-mail en contactformulier.
`);

  write('/site.webmanifest', JSON.stringify({
    name: 'MV Funderingsscan', short_name: 'MV Funderingsscan', lang: 'nl',
    start_url: '/', display: 'browser', background_color: '#ffffff', theme_color: '#102945',
    icons: [
      { src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }, null, 2) + '\n');
}

// =================================================================== main
export function build({ quiet = false } = {}) {
  const t0 = Date.now();
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  cpSync(join(ROOT, 'public'), OUT, { recursive: true });

  buildHome();
  buildAanvragen();
  buildContact();
  buildKbIndex();
  const paths = ['/', '/funderingsscan-aanvragen/', '/contact/', '/gratis-funderingscheck/', '/kennisbank/', buildGlossary()];
  // volgorde van urls.json aanhouden voor een logische sitemap
  const order = new Map(urls.map((u, i) => [u.path, i]));
  for (const p of [...pages].sort((a, b) => (order.get(a.path) ?? 999) - (order.get(b.path) ?? 999))) {
    write(p.path, render(p));
    paths.push(p.path);
  }
  if (cases.length) {
    for (const c of cases) { write(c.path, render(c)); paths.push(c.path); }
    specialPage({
      path: '/praktijkvoorbeelden/',
      title: 'Praktijkvoorbeelden funderingsonderzoek | MV Funderingsscan',
      description: `Geanonimiseerde voorbeelden van funderingsonderzoek in Friesland en Groningen: welke vraag er speelde, wat we onderzochten en wat het advies was.`,
      crumbs: [{ href: '/', name: 'Home' }, { href: '/praktijkvoorbeelden/', name: 'Praktijkvoorbeelden' }],
      eyebrow: 'Praktijkvoorbeelden',
      h1: 'Praktijkvoorbeelden van funderingsonderzoek',
      lead: 'Hoe verloopt funderingsonderzoek in de praktijk? Hier vind je geanonimiseerde voorbeelden uit Friesland en Groningen, met de vraag, de bevindingen en het advies.',
      type: 'CollectionPage',
      navActive: '/kennisbank/',
      body: `<section class="section"><div class="container">${kbCards(cases)}</div></section>${ctaBand()}`,
    });
    paths.push('/praktijkvoorbeelden/');
  }
  build404();
  // Track & Trace en beheerportaal: statische schil, noindex, niet in de sitemap
  write('/status/', statusPage());
  write('/beheer/', beheerPage());
  // veilige Markdown-weergave ook in de browser (live voorbeeld in de nieuwseditor)
  write('/beheer-markdown.js', readFileSync(join(ROOT, 'api', '_lib', 'markdown.js'), 'utf8'));
  buildMetaFiles(paths);
  // IndexNow-sleutelbestand (/<sleutel>.txt) alleen als INDEXNOW_KEY is ingesteld; zo staat de sleutel niet in Git
  if (isSleutel(process.env.INDEXNOW_KEY)) write(`/${process.env.INDEXNOW_KEY}.txt`, process.env.INDEXNOW_KEY);
  if (lastmodGewijzigd && !process.env.VERCEL) writeFileSync(LASTMOD_FILE, JSON.stringify(Object.fromEntries(Object.entries(LASTMOD).sort()), null, 1) + '\n');
  if (!quiet) console.log(`✔ ${paths.length} pagina's gebouwd in dist/ (${Date.now() - t0} ms)`);
  const open = openPlaceholders();
  if (!quiet && open.length) {
    console.log(`ℹ ${open.length} E-E-A-T-placeholders nog niet ingevuld in src/content/eeat.json – ${SHOW_PLACEHOLDERS ? 'zichtbaar als gele vakken (dev)' : 'deze blokken staan NIET op de live site'}:`);
    for (const o of open) console.log(`   · ${o}`);
  }
  return paths;
}

/**
 * Medewerkers uit het beheerportaal (Supabase) voor /over-ons/. Alleen als SUPABASE_URL en SUPABASE_SERVICE_KEY
 * bij de build beschikbaar zijn (op Vercel wel, lokaal meestal niet). Lukt het niet, dan blijft eeat.json de bron.
 */
export async function laadMedewerkers({ quiet = false } = {}) {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, ''); const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return false;
  try {
    const r = await fetch(`${url}/rest/v1/mvfs_advisors?select=name,functie,introductie,photo_path,op_site,volgorde,active&op_site=is.true`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) throw new Error(`database ${r.status}`);
    const rows = (await r.json()).sort((a, b) => (a.volgorde ?? 0) - (b.volgorde ?? 0) || a.name.localeCompare(b.name));
    setMedewerkers(rows.map((m) => ({
      naam: m.name, functie: m.functie || 'Bouwkundig adviseur', introductie: m.introductie || '',
      foto: m.photo_path ? `${url}/storage/v1/object/public/nieuws/${m.photo_path}` : '',
    })));
    if (!quiet) console.log(`ℹ ${rows.length} medewerker(s) uit het beheerportaal op /over-ons/`);
    return true;
  } catch (err) {
    console.warn(`⚠ Medewerkers uit het portaal niet geladen (${err.message}); eeat.json wordt gebruikt.`);
    return false;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await laadMedewerkers();
  build();
}
