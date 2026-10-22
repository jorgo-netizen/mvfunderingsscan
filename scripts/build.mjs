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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DOMAIN, TODAY, NAP, ORG_ID, SITE_ID, esc, img, head, header, footer, breadcrumbsHtml,
  faqItems, faqHtml, ctaBand, jsonld, orgSchema, websiteSchema, serviceSchema, breadcrumbSchema, faqSchema,
} from '../src/lib/layout.mjs';
import { render, relatedHtml } from '../src/lib/template.mjs';
import { aanvraagForm, contactForm, checkForm } from '../src/lib/forms.mjs';
import { openPlaceholders, SHOW_PLACEHOLDERS } from '../src/lib/eeat.mjs';
import { statusPage, beheerPage } from '../src/lib/portal.mjs';

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

function write(path, content) {
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
      <p class="answer-first">MV Funderingsscan is een gespecialiseerde aanbieder van funderingsonderzoek voor woningen in Friesland en Groningen, gevestigd in Leeuwarden.</p>
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
        <div><dt>Werkgebied</dt><dd><a href="/werkgebied/">Friesland en Groningen</a></dd></div>
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
  const title = 'Funderingsscan & funderingsonderzoek | Friesland & Groningen | MV Funderingsscan';
  const graph = [orgSchema(), websiteSchema(), {
    '@type': 'WebPage', '@id': url + '#webpagina', url, name: title,
    inLanguage: 'nl-NL', isPartOf: { '@id': SITE_ID }, about: { '@id': ORG_ID },
    primaryImageOfPage: `${DOMAIN}/assets/img/funderingsmeting-laser-tablet-1536.webp`, dateModified: TODAY,
  }, serviceSchema('funderingsscan'), serviceSchema('fase0'), serviceSchema('fase1'), faqSchema(url, home.faqs)];
  write('/', head({
    path: '/', title,
    description: 'Funderingsscan en funderingsonderzoek in Friesland en Groningen. Onafhankelijk onderzoek naar het funderingsrisico van je woning. Vraag een scan aan.',
    schema: jsonld(graph),
    preload: '<link rel="preload" as="image" type="image/webp" fetchpriority="high" imagesrcset="/assets/img/funderingsmeting-laser-tablet-640.webp 640w, /assets/img/funderingsmeting-laser-tablet-1024.webp 1024w, /assets/img/funderingsmeting-laser-tablet-1536.webp 1536w" imagesizes="(min-width: 1181px) 80vw, 100vw">\n  ',
  }) + '\n' + header('/') + s + footer());
}

// =================================================================== aanvragen
function buildAanvragen() {
  specialPage({
    path: '/funderingsscan-aanvragen/',
    title: 'Funderingsscan aanvragen | Prijs vooraf bekend | MV Funderingsscan',
    description: 'Vraag online een funderingsscan aan voor je woning in Friesland of Groningen. Vul de gegevens in; je hoort vooraf wat fase 0 of fase 1 kost.',
    crumbs: [{ href: '/', name: 'Home' }, { href: '/funderingsscan-aanvragen/', name: 'Funderingsscan aanvragen' }],
    eyebrow: 'Aanvragen',
    h1: 'Funderingsscan aanvragen',
    lead: 'Vraag hier een funderingsscan aan voor een woning in Friesland of Groningen. Hoe meer je vertelt over de woning en je situatie, hoe beter we je kunnen adviseren. Je hoort altijd eerst wat het onderzoek kost.',
    navActive: '',
    body: `<section class="section section-navy apply" id="aanvragen" aria-labelledby="apply-title">
  <div class="container apply-layout apply-layout-wide">
    <div class="apply-copy reveal">
      <h2 class="section-title" id="apply-title">Zo werkt je aanvraag</h2>
      <ol class="mini-steps mini-steps-dark">
        <li><strong>Formulier invullen</strong><span>Gegevens van jou en de woning, en wat je ziet.</span></li>
        <li><strong>Persoonlijk contact</strong><span>We bespreken je situatie en adviseren welke fase past.</span></li>
        <li><strong>Prijs vooraf bekend</strong><span>Pas na jouw akkoord plannen we de inspectie, meestal binnen enkele werkdagen.</span></li>
        <li><strong>Rapport</strong><span>Normaal gesproken binnen 5 werkdagen na de inspectie, met conclusie en advies.</span></li>
      </ol>
      <p>Liever eerst overleggen? Bel <a href="${NAP.phone_href}">${NAP.phone_display}</a> of <a href="/contact/">stel je vraag via het contactformulier</a>.</p>
      <p>Twijfel je of onderzoek nodig is? <a href="/funderingsscan-check/">Doe eerst de online funderingscheck</a> of lees <a href="/quickscan-fundering/">wat een quickscan fundering inhoudt</a> en <a href="/prijzen/">wat het kost</a>.</p>
    </div>
    ${aanvraagForm()}
  </div>
</section>`,
    faqs: [
      { q: 'Wat gebeurt er nadat ik de aanvraag heb verstuurd?', a: '<p>We nemen contact met je op om je situatie te bespreken. Daarna hoor je wat het onderzoek kost. Pas als je akkoord bent, plannen we het onderzoek in – meestal binnen enkele werkdagen.</p>' },
      { q: 'Zit ik ergens aan vast als ik dit formulier invul?', a: '<p>Nee. Het formulier is een aanvraag, geen opdracht. Je beslist pas nadat je de prijs weet.</p>' },
      { q: 'Wat als ik niet weet welke fase ik nodig heb?', a: '<p>Kies dan "Weet ik nog niet". We adviseren je op basis van je situatie. In de meeste gevallen begint het onderzoek met <a href="/fase-0-funderingsonderzoek/">fase 0, de Quick Scan</a>.</p>' },
      { q: 'Wat kost een funderingsscan?', a: '<p>Een fase 0 funderingsscan begint indicatief vanaf circa €350; fase 1 kost indicatief €750 – €1.500. Zie <a href="/prijzen/">prijzen</a>.</p>' },
    ],
  });
}

// =================================================================== contact
function buildContact() {
  specialPage({
    path: '/contact/',
    title: 'Contact | MV Funderingsscan Leeuwarden | +31 (0) 582037172',
    description: 'Neem contact op met MV Funderingsscan in Leeuwarden voor funderingsonderzoek in Friesland en Groningen. Bel +31 (0) 582037172 of stel je vraag online.',
    crumbs: [{ href: '/', name: 'Home' }, { href: '/contact/', name: 'Contact' }],
    eyebrow: 'Contact',
    h1: 'Contact met MV Funderingsscan',
    lead: 'Heb je een vraag over funderingsonderzoek, weet je niet welke fase je nodig hebt of wil je een prijs? Bel, mail of stuur je vraag via het formulier. MV Funderingsscan werkt in heel Friesland en Groningen.',
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
      <p class="nap-hours">Bereikbaar: ${NAP.hours_display}</p>
      <p><strong>Werkgebied:</strong> <a href="/funderingsonderzoek-friesland/">Friesland</a> en <a href="/funderingsonderzoek-groningen/">Groningen</a> – zie <a href="/werkgebied/">ons werkgebied</a>.</p>
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

// =================================================================== funderingscheck
function buildCheck() {
  specialPage({
    path: '/funderingsscan-check/',
    title: 'Online funderingscheck | Is een funderingsscan zinvol?',
    description: 'Twijfel je over je fundering? Beantwoord 8 korte vragen en zie direct of een funderingsscan zinvol kan zijn. Indicatief, geen technisch oordeel.',
    crumbs: [{ href: '/', name: 'Home' }, { href: '/funderingsscan-check/', name: 'Funderingscheck' }],
    eyebrow: 'Online funderingscheck',
    h1: 'Online funderingscheck: is een funderingsscan zinvol?',
    lead: 'Met acht korte vragen krijg je een eerste indicatie of een funderingsscan voor jouw woning zinvol kan zijn. Deze online check is geen technisch oordeel en vervangt geen funderingsonderzoek.',
    navActive: '/funderingsscan/',
    body: `<section class="section" id="check" aria-labelledby="check-title">
  <div class="container">
    ${checkForm()}
  </div>
</section>
<section class="section section-alt section-tight" aria-labelledby="check-uitleg">
  <div class="container prose prose-center">
    <h2 id="check-uitleg">Hoe werkt de funderingscheck?</h2>
    <p class="answer-first">De check telt signalen en omstandigheden op die vaker samengaan met funderingsrisico's, zoals een bouwjaar van vóór circa 1970, scheuren en scheefstand. Zware signalen tellen zwaarder dan omstandigheden.</p>
    <p>Een hoge uitkomst betekent niet dat de fundering slecht is, en een lage uitkomst betekent niet dat alles in orde is. Scheuren kunnen bijvoorbeeld ook door krimp of temperatuurwerking ontstaan, en een deur kan klemmen door vocht. Alleen een inspectie ter plaatse geeft duidelijkheid. Lees meer over <a href="/funderingsproblemen/">funderingsproblemen herkennen</a>, <a href="/quickscan-fundering/">wat een quickscan fundering is</a> en <a href="/kennisbank/heb-ik-een-funderingsscan-nodig/">of je een funderingsscan nodig hebt</a>.</p>
    <div class="phase-mini">
      <a href="/fase-0-funderingsonderzoek/" class="phase-mini-card"><span class="phase-tag">Fase 0</span><strong>Quick Scan</strong><span>Archief, inspectie en risico-inschatting. Vanaf ca. €350.</span></a>
      <a href="/fase-1-funderingsonderzoek/" class="phase-mini-card"><span class="phase-tag phase-tag-navy">Fase 1</span><strong>Onderzoek met metingen</strong><span>Alleen bij verhoogd risico. Indicatief €750 – €1.500.</span></a>
    </div>
  </div>
</section>
${ctaBand('Bespreek je situatie', 'Twijfel je na de check nog? Leg je situatie aan ons voor, dan adviseren we welke vervolgstap past.')}`,
    faqs: [
      { q: 'Is de online funderingscheck een technisch oordeel?', a: '<p>Nee. Deze online check is geen technisch oordeel en vervangt geen funderingsonderzoek. Hij helpt je alleen inschatten of het zinvol is om de fundering te laten bekijken.</p>' },
      { q: 'Wat doe ik als de check een hoge uitkomst geeft?', a: '<p>Bespreek je situatie met ons of vraag een <a href="/fase-0-funderingsonderzoek/">fase 0 funderingsonderzoek</a> aan. Daarmee wordt duidelijk of de signalen werkelijk met de fundering te maken hebben.</p>' },
      { q: 'Worden mijn antwoorden opgeslagen?', a: '<p>Nee. De check werkt alleen in je eigen browser; je antwoorden worden niet verstuurd of bewaard.</p>' },
    ],
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
  write('/robots.txt', `# robots.txt – mvfunderingsscan.nl
# Alle zoekmachines en AI-zoekdiensten zijn welkom.

User-agent: *
Allow: /
Disallow: /api/
Disallow: /beheer/
Disallow: /status/

# Expliciet: OpenAI zoekcrawler en gebruikersverzoeken vanuit ChatGPT
User-agent: OAI-SearchBot
Allow: /
Disallow: /api/
Disallow: /beheer/
Disallow: /status/

User-agent: ChatGPT-User
Allow: /
Disallow: /api/
Disallow: /beheer/
Disallow: /status/

User-agent: PerplexityBot
Allow: /
Disallow: /api/
Disallow: /beheer/
Disallow: /status/

User-agent: Bingbot
Allow: /
Disallow: /api/
Disallow: /beheer/
Disallow: /status/

User-agent: Googlebot
Allow: /
Disallow: /api/
Disallow: /beheer/
Disallow: /status/

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
  const urlsXml = paths.map((path) => `  <url>\n    <loc>${DOMAIN}${path}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <priority>${priority(path)}</priority>\n  </url>`);
  write('/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urlsXml.join('\n') + '\n</urlset>\n');

  const line = (p) => `- [${p.h1}](${DOMAIN}${p.path}): ${p.description}`;
  const groupLines = (g) => pages.filter((p) => meta[p.path]?.group === g).map(line).join('\n');
  write('/llms.txt', `# MV Funderingsscan

> MV Funderingsscan is een dienst van MV Adviseurs (Leeuwarden) voor onafhankelijk funderingsonderzoek aan woningen in Friesland en Groningen. Het onderzoek begint in de regel met een Quick Scan (fase 0, indicatief vanaf ca. €350, rapport normaal gesproken binnen 5 werkdagen na inspectie). Geeft die daar aanleiding toe, dan volgt fase 1 met metingen (indicatief €750 – €1.500). MV Funderingsscan voert zelf geen funderingsherstel uit.

## Kernfeiten (gecontroleerd ${TODAY}; bronnen: ${DOMAIN}/bronnen-en-richtlijnen/)
- Onafhankelijk: MV Funderingsscan doet uitsluitend onderzoek en voert geen funderingsherstel uit.
- Werkgebied: heel Friesland en de hele provincie Groningen, vanuit Leeuwarden.
- Prijs: fase 0 vanaf ca. €350 (grotere of complexere woningen tot ca. €550), fase 1 indicatief €750 – €1.500; de definitieve prijs hoor je vooraf.
- Fase 0 (Quick Scan): archief- en bodemonderzoek, visuele inspectie (kruipruimte voor zover toegankelijk) en een risico-inschatting met advies. Zonder graafwerk. Kan niet vaststellen: de exacte conditie van houten palen, verborgen gebreken, constructieve capaciteit, resterende levensduur of exacte herstelkosten.
- Fase 1: metingen zoals lintvoegwaterpassing, loodmeting en vloerveldwaterpassing. Brengt de huidige scheefstand en hoogteverschillen in beeld; of een woning nog beweegt, blijkt pas uit herhaalde metingen (monitoring). Een inspectieput (graven) is een aparte, verdergaande stap.
- Fasenamen verschillen per bron: de KCAF-richtlijn spreekt van onderdelen; deze site gebruikt de indeling van MV Funderingsscan.
- KCAF-risicoklassen: A geen risico, B licht risico, C verhoogd risico of onzekerheid, D hoog risico (nader onderzoek passend), E vastgesteld funderingsprobleem. Een modelmatige inschatting, geen vaststelling van de staat van de fundering.
- Taxatie (NRVT, sinds 1 april 2026): de taxateur neemt de KCAF-risicoklasse op; bij klasse D of E moet in principe eerst een aanvullend (beperkt) funderingsonderzoek plaatsvinden voordat de taxatie wordt afgerond, met uitzonderingen.
- NHG heeft aangekondigd dat vanaf 1 januari 2027 bij klasse D of E een verkennend funderingsonderzoek verplicht is voor een lening met NHG.
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
- [Online funderingscheck](${DOMAIN}/funderingsscan-check/): indicatieve check in 8 vragen (geen technisch oordeel).
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
  buildCheck();
  buildKbIndex();
  const paths = ['/', '/funderingsscan-aanvragen/', '/contact/', '/funderingsscan-check/', '/kennisbank/', buildGlossary()];
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
  if (!quiet) console.log(`✔ ${paths.length} pagina's gebouwd in dist/ (${Date.now() - t0} ms)`);
  const open = openPlaceholders();
  if (!quiet && open.length) {
    console.log(`ℹ ${open.length} E-E-A-T-placeholders nog niet ingevuld in src/content/eeat.json – ${SHOW_PLACEHOLDERS ? 'zichtbaar als gele vakken (dev)' : 'deze blokken staan NIET op de live site'}:`);
    for (const o of open) console.log(`   · ${o}`);
  }
  return paths;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) build();
