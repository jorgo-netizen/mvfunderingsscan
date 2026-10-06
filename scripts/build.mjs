/**
 * Bouwt de statische site naar dist/.
 *
 *   npm run build
 *
 * - kopieert public/ (css, js, afbeeldingen) naar dist/
 * - genereert alle pagina's uit src/content/*.json + src/templates
 * - schrijft sitemap.xml, robots.txt, llms.txt en site.webmanifest
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DOMAIN, TODAY, NAP, ORG_ID, SITE_ID, esc, img, head, header, footer, breadcrumbsHtml,
  faqItems, ctaBand, jsonld, orgSchema, websiteSchema, serviceSchema, breadcrumbSchema, faqSchema,
} from '../src/lib/layout.mjs';
import { render } from '../src/lib/template.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, 'src', 'content', p), 'utf8'));

const services = readJson('pages/services.json');
const local = readJson('pages/local.json');
const kb = readJson('pages/kennisbank.json');
const kbIndex = readJson('pages/kennisbank-index.json');
const home = readJson('home.json');
// Regeleinden normaliseren, zodat de output op Windows en Vercel identiek is.
const homeTemplate = readFileSync(join(ROOT, 'src', 'templates', 'home-main.html'), 'utf8').replace(/\r\n/g, '\n');

function write(path, content) {
  const target = path.endsWith('/') ? join(OUT, path, 'index.html') : join(OUT, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
}

// Afkappen op woordgrens, gelijk aan de oorspronkelijke Python-versie.
const teaser = (s) => s.slice(0, 150).split(' ').slice(0, -1).join(' ');

function kbCards(items, cls = 'related-grid') {
  const cards = items.map((p) => `      <a class="related-card reveal" href="${p.path}">
        <strong>${esc(p.h1)}</strong>
        <span>${esc(teaser(p.description))}…</span>
        <em aria-hidden="true">→</em>
      </a>`).join('\n');
  return `<div class="${cls}">\n${cards}\n    </div>`;
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
      <p>MV Funderingsscan is onderdeel van Midea Vastgoed Adviseurs.</p>
    </div>
    <aside class="facts-card facts-card-light reveal" aria-label="Bedrijfsgegevens">
      <p class="facts-title">Bedrijfsgegevens</p>
      <dl>
        <div><dt>Naam</dt><dd>${NAP.name}</dd></div>
        <div><dt>Adres</dt><dd>${NAP.street}, ${NAP.postal} ${NAP.city}</dd></div>
        <div><dt>Telefoon</dt><dd><a href="${NAP.phone_href}">${NAP.phone_display}</a></dd></div>
        <div><dt>E-mail</dt><dd><a href="mailto:${NAP.email}">${NAP.email}</a></dd></div>
        <div><dt>Openingstijden</dt><dd>${NAP.hours_display}</dd></div>
        <div><dt>Werkgebied</dt><dd>Friesland en Groningen</dd></div>
      </dl>
    </aside>
  </div>
</section>`;

function buildHome() {
  const fill = {
    '{{IMG_HERO}}': img('funderingsinspectie-woning-gevel',
      'Funderingsspecialist van MV Funderingsscan met waterpas bij de gevel van een woning',
      '(min-width: 1181px) 114vw, 100vw', { lazy: false, priority: true }),
    '{{IMG_GEVEL}}': img('metselwerk-gevel-detail', 'Close-up van metselwerk en voegen in een bakstenen gevel',
      '(min-width: 901px) 590px, 100vw'),
    '{{IMG_STRAAT}}': img('jaren-dertig-woningen-straat', 'Rij vooroorlogse bakstenen woningen in een groene straat',
      '(min-width: 901px) 590px, 100vw'),
    '{{IMG_VOORDEUR}}': img('vooroorlogse-woning-voordeur', 'Klassieke voordeur in een vooroorlogse bakstenen gevel',
      '(min-width: 901px) 560px, 100vw'),
    '{{IMG_STRAAT_WIDE}}': img('jaren-dertig-woningen-straat',
      'Jaren-dertigwoningen met bakstenen gevels, een type woning waarbij funderingsonderzoek vaak zinvol is',
      '(min-width: 901px) 600px, 100vw'),
    '{{HOME_FAQ}}': faqItems(home.faqs),
    '{{HOME_ABOUT}}': HOME_ABOUT,
  };
  const bySlug = Object.fromEntries(kb.map((p) => [p.path.split('/')[2], p]));
  fill['{{HOME_KB}}'] = `<!-- ============ KENNISBANK ============ -->
<section class="section" id="kennisbank" aria-labelledby="kb-title">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Kennisbank</p>
      <h2 class="section-title" id="kb-title">Meer weten over funderingen?</h2>
      <p class="section-intro">Korte, feitelijke antwoorden op de vragen die we het vaakst krijgen. <a class="inline-link" href="/kennisbank/">Bekijk de hele kennisbank</a>.</p>
    </div>
    ${kbCards(home.kbHighlights.map((s) => bySlug[s]))}
  </div>
</section>`;

  let s = homeTemplate;
  for (const [k, v] of Object.entries(fill)) s = s.replace(k, () => v);
  if (s.includes('{{')) throw new Error('Onvervangen placeholder in home-main.html');

  const url = DOMAIN + '/';
  const title = 'Funderingsscan & funderingsonderzoek | Friesland & Groningen | MV Funderingsscan';
  const graph = [orgSchema(), websiteSchema(), {
    '@type': 'WebPage', '@id': url + '#webpagina', url,
    name: title,
    inLanguage: 'nl-NL', isPartOf: { '@id': SITE_ID }, about: { '@id': ORG_ID },
    primaryImageOfPage: `${DOMAIN}/assets/img/funderingsinspectie-woning-gevel-1600.webp`,
    dateModified: TODAY,
  }, serviceSchema('funderingsscan'), serviceSchema('fase0'), serviceSchema('fase1'),
  faqSchema(url, home.faqs)];
  const page = {
    path: '/',
    title,
    description: 'Funderingsscan en funderingsonderzoek in Friesland en Groningen. Onafhankelijk onderzoek naar de staat en risico\'s van de fundering. Vraag een scan aan.',
    schema: jsonld(graph),
    preload: '<link rel="preload" as="image" type="image/webp" fetchpriority="high" imagesrcset="/assets/img/funderingsinspectie-woning-gevel-640.webp 640w, /assets/img/funderingsinspectie-woning-gevel-1024.webp 1024w, /assets/img/funderingsinspectie-woning-gevel-1600.webp 1600w, /assets/img/funderingsinspectie-woning-gevel-2000.webp 2000w" imagesizes="(min-width: 1181px) 114vw, 100vw">\n  ',
  };
  write('/', head(page) + '\n' + header('/') + s + footer());
}

// =================================================================== contact
function extractForm() {
  const a = homeTemplate.indexOf('<div class="apply-card reveal">');
  const b = homeTemplate.indexOf('</section>', a);
  const block = homeTemplate.slice(a, b);
  // laatste twee </div> (apply-card + apply-layout) eraf, één terug voor apply-card
  const parts = block.split('</div>');
  return parts.slice(0, -2).join('</div>') + '</div>';
}

function buildContact(p) {
  const url = DOMAIN + p.path;
  const graph = [orgSchema(), websiteSchema(), {
    '@type': 'ContactPage', '@id': url + '#webpagina', url, name: p.title,
    description: p.description, inLanguage: 'nl-NL', isPartOf: { '@id': SITE_ID },
    about: { '@id': ORG_ID }, breadcrumb: { '@id': url + '#breadcrumb' }, dateModified: TODAY,
  }, breadcrumbSchema(url, p.crumbs)];
  const page = { ...p, schema: jsonld(graph) };
  const body = `${header('')}
<main id="main">
<section class="page-hero" aria-labelledby="page-title">
  <div class="container page-hero-inner">
    <div class="page-hero-copy">
      ${breadcrumbsHtml(p.crumbs)}
      <p class="eyebrow eyebrow-light">Contact &amp; aanvraag</p>
      <h1 id="page-title">Funderingsscan aanvragen</h1>
      <p class="page-hero-lead">Vraag een funderingsscan aan of stel je vraag over funderingsonderzoek in Friesland of Groningen. We nemen zo snel mogelijk contact met je op en je ontvangt vooraf een vaste prijs.</p>
    </div>
  </div>
</section>

<section class="section section-navy apply" id="aanvragen" aria-labelledby="apply-title">
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
        <a href="mailto:${NAP.email}?subject=Aanvraag%20funderingsscan"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/></svg>${NAP.email}</a>
      </div>
      <p class="nap-hours">Bereikbaar: ${NAP.hours_display}</p>
      <ul class="apply-points">
        <li><span>1</span>Persoonlijk contact over je situatie</li>
        <li><span>2</span>Vaste prijs vooraf</li>
        <li><span>3</span>Inspectie meestal binnen enkele werkdagen</li>
      </ul>
      <p>Werkgebied: <a href="/funderingsonderzoek-friesland/">Friesland</a> en <a href="/funderingsonderzoek-groningen/">Groningen</a>.</p>
    </div>

    ${extractForm()}
  </div>
</section>
</main>
${footer()}`;
  write(p.path, head(page) + '\n' + body);
}

// =================================================================== kennisbank-overzicht
function buildKbIndex() {
  const p = kbIndex;
  const url = DOMAIN + p.path;
  const graph = [orgSchema(), websiteSchema(), {
    '@type': 'CollectionPage', '@id': url + '#webpagina', url, name: p.title,
    description: p.description, inLanguage: 'nl-NL', isPartOf: { '@id': SITE_ID },
    about: { '@id': ORG_ID }, breadcrumb: { '@id': url + '#breadcrumb' }, dateModified: TODAY,
    hasPart: kb.map((i) => ({ '@id': DOMAIN + i.path + '#artikel' })),
  }, breadcrumbSchema(url, p.crumbs), {
    '@type': 'ItemList', '@id': url + '#overzicht',
    itemListElement: kb.map((i, n) => ({ '@type': 'ListItem', position: n + 1, url: DOMAIN + i.path, name: i.h1 })),
  }];
  const page = { ...p, schema: jsonld(graph) };
  const groups = [
    ['Basis', ['wat-is-een-funderingsscan', 'wat-is-fase-0-funderingsonderzoek', 'wat-is-fase-1-funderingsonderzoek', 'wat-kost-een-funderingsonderzoek']],
    ['Situaties', ['wanneer-funderingsonderzoek', 'funderingsonderzoek-bij-aankoop', 'scheuren-in-de-gevel-en-fundering']],
    ['Regio', ['funderingsproblemen-friesland', 'funderingsproblemen-groningen']],
  ];
  const bySlug = Object.fromEntries(kb.map((i) => [i.path.split('/')[2], i]));
  const blocks = groups.map(([title, slugs]) => `    <h2 class="kb-group-title reveal">${title}</h2>
    ${kbCards(slugs.map((s) => bySlug[s]))}`).join('\n');
  const body = `${header('/kennisbank/')}
<main id="main">
<section class="page-hero" aria-labelledby="page-title">
  <div class="container page-hero-inner">
    <div class="page-hero-copy">
      ${breadcrumbsHtml(p.crumbs)}
      <p class="eyebrow eyebrow-light">${p.eyebrow}</p>
      <h1 id="page-title">${p.h1}</h1>
      <p class="page-hero-lead">${p.lead}</p>
    </div>
  </div>
</section>
<section class="section">
  <div class="container">
${blocks}
  </div>
</section>
${ctaBand()}
</main>
${footer()}`;
  write(p.path, head(page) + '\n' + body);
}

// =================================================================== 404
function build404() {
  const page = {
    path: '/404.html', title: 'Pagina niet gevonden | MV Funderingsscan',
    description: 'Deze pagina bestaat niet (meer). Ga naar de homepage of bekijk onze funderingsscan.',
    robots: 'noindex, follow', canonical: false, schema: '',
  };
  const body = `${header('')}
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
      <li><a href="/fase-0/">Fase 0 · Quick Scan</a></li>
      <li><a href="/fase-1/">Fase 1 · metingen</a></li>
      <li><a href="/funderingsonderzoek-friesland/">Funderingsonderzoek Friesland</a></li>
      <li><a href="/funderingsonderzoek-groningen/">Funderingsonderzoek Groningen</a></li>
      <li><a href="/kennisbank/">Kennisbank</a></li>
      <li><a href="/contact/">Contact</a></li>
    </ul>
  </div>
</section>
</main>
${footer()}`;
  write('/404.html', head(page) + '\n' + body);
}

// =================================================================== crawler-bestanden
function buildMetaFiles(paths) {
  write('/robots.txt', `# robots.txt – mvfunderingsscan.nl
# Alle zoekmachines en AI-zoekdiensten zijn welkom.

User-agent: *
Allow: /

# Expliciet: OpenAI zoekcrawler en gebruikersverzoeken vanuit ChatGPT
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Googlebot
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml
`);

  const priority = (path) => (path === '/' ? '1.0'
    : ['/funderingsscan/', '/fase-0/', '/fase-1/'].includes(path) ? '0.9'
      : path.startsWith('/funderingsonderzoek-') ? '0.8'
        : path === '/contact/' ? '0.6' : '0.7');
  const urls = paths.map((path) => `  <url>\n    <loc>${DOMAIN}${path}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <priority>${priority(path)}</priority>\n  </url>`);
  write('/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n');

  // llms.txt: compacte, feitelijke samenvatting voor AI-zoekdiensten
  const line = (p) => `- [${p.h1}](${DOMAIN}${p.path}): ${p.description}`;
  write('/llms.txt', `# MV Funderingsscan

> MV Funderingsscan voert onafhankelijk funderingsonderzoek uit voor woningen in Friesland en Groningen, vanuit Leeuwarden. Het onderzoek begint met een Quick Scan (fase 0, indicatief vanaf ca. €350, rapport binnen 5 werkdagen na inspectie) en wordt alleen bij een verhoogd risico gevolgd door fase 1 met metingen (indicatief €750 – €1.500). MV Funderingsscan voert zelf geen funderingsherstel uit.

Contact: ${NAP.name}, ${NAP.street}, ${NAP.postal} ${NAP.city}. Telefoon ${NAP.phone_display}. E-mail ${NAP.email}. Bereikbaar ${NAP.hours_display}.

## Diensten
${services.filter((p) => p.h1).map(line).join('\n')}

## Werkgebied
${local.map(line).join('\n')}

## Kennisbank
${kb.map(line).join('\n')}

## Overig
- [Contact en aanvraag](${DOMAIN}/contact/): adres, telefoon, e-mail en aanvraagformulier.
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
  const paths = ['/'];
  for (const p of services) {
    if (p.special === 'contact') buildContact(p);
    else write(p.path, render(p));
    paths.push(p.path);
  }
  for (const p of local) { write(p.path, render(p)); paths.push(p.path); }
  buildKbIndex();
  paths.push(kbIndex.path);
  for (const p of kb) { write(p.path, render(p)); paths.push(p.path); }
  build404();
  buildMetaFiles(paths);
  if (!quiet) console.log(`✔ ${paths.length} pagina's gebouwd in dist/ (${Date.now() - t0} ms)`);
  return paths;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) build();
