/**
 * Gedeelde layout, metadata en structured data voor mvfunderingsscan.nl.
 *
 * Alle bedrijfsgegevens (NAP) komen uit src/content/site.json, zodat ze op
 * elke pagina, in de JSON-LD en in het Google Bedrijfsprofiel exact gelijk zijn.
 */
import { readFileSync } from 'node:fs';

const site = JSON.parse(readFileSync(new URL('../content/site.json', import.meta.url), 'utf8'));

import { ORG_SAME_AS } from './eeat.mjs';
export const DOMAIN = site.domain;
export const TODAY = site.today;
export const NAP = site.nap;
export const IMAGES = site.images;
export const NAV = site.nav;
export const SERVICES = site.services;
export const DEFAULT_SIDE = site.defaultSide;
export const GEMEENTEN = site.gemeenten || [];
export const ORG_ID = `${DOMAIN}/#organisatie`;
export const SITE_ID = `${DOMAIN}/#website`;

/** HTML-escape (gelijk aan Python html.escape met quote=True). */
export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** Responsive <img> met srcset uit de vaste WebP-varianten in public/assets/img. */
export function img(name, alt, sizes, { lazy = true, priority = false, cls = null } = {}) {
  const { widths, width, height } = IMAGES[name];
  const srcset = widths.map((x) => `/assets/img/${name}-${x}.webp ${x}w`).join(', ');
  const def = `/assets/img/${name}-${widths.length > 1 ? widths[1] : widths[0]}.webp`;
  const attrs = [
    `src="${def}"`,
    `srcset="${srcset}"`,
    `sizes="${sizes}"`,
    `width="${width}" height="${height}"`,
    `alt="${esc(alt)}"`,
    'decoding="async"',
  ];
  if (lazy) attrs.push('loading="lazy"');
  if (priority) attrs.push('fetchpriority="high"');
  if (cls) attrs.push(`class="${cls}"`);
  return '<img ' + attrs.join(' ') + '>';
}

export const ICON_PHONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.57 3.6a1 1 0 0 1-.25 1z"/></svg>';
export const ICON_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/></svg>';

// ---------------------------------------------------------------- structured data

const PROVINCE = (name) => ({ '@type': 'AdministrativeArea', name, containedInPlace: { '@type': 'Country', name: 'Nederland' } });
const AREA = () => [PROVINCE('Friesland'), PROVINCE('Groningen')];

/** Werkgebied op gemeenteniveau (voor de organisatie). */
const AREA_DETAILED = () => [
  ...AREA(),
  ...GEMEENTEN.map((g) => ({ '@type': 'AdministrativeArea', name: `Gemeente ${g.naam}`, containedInPlace: { '@type': 'AdministrativeArea', name: g.provincie } })),
];

/** Werkgebied voor één gemeente, inclusief kernen. */
export function gemeenteArea(g) {
  return [
    { '@type': 'AdministrativeArea', name: `Gemeente ${g.naam}`, containedInPlace: { '@type': 'AdministrativeArea', name: g.provincie } },
    ...g.kernen.map((k) => ({ '@type': 'Place', name: k.replace(/ \(Gn\)$/, ''), containedInPlace: { '@type': 'AdministrativeArea', name: `Gemeente ${g.naam}` } })),
  ];
}

export function orgSchema() {
  return {
    '@type': 'ProfessionalService',
    '@id': ORG_ID,
    name: NAP.name,
    legalName: NAP.name,
    alternateName: NAP.brand,
    ...(ORG_SAME_AS.length ? { sameAs: ORG_SAME_AS } : {}),
    url: `${DOMAIN}/`,
    logo: { '@type': 'ImageObject', url: `${DOMAIN}/assets/logo-midea.png`, width: 480, height: 137 },
    image: `${DOMAIN}/assets/img/og-mv-funderingsscan.jpg`,
    description: 'MV Funderingsscan voert onafhankelijk funderingsonderzoek uit voor woningen in Friesland en Groningen: een Quick Scan (fase 0) en, waar nodig, vervolgonderzoek met metingen (fase 1).',
    telephone: NAP.phone_intl,
    email: NAP.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: NAP.street,
      postalCode: NAP.postal,
      addressLocality: NAP.city,
      addressRegion: NAP.region,
      addressCountry: NAP.country,
    },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '17:00',
    }],
    areaServed: AREA_DETAILED(),
    knowsAbout: [
      'Funderingsonderzoek', 'Funderingsscan', 'Quick Scan fundering (fase 0)',
      'Funderingsonderzoek fase 1', 'Lintvoegwaterpassing', 'Loodmeting',
      'Vloerveldwaterpassing', 'Scheurpatronen in gevels', 'Funderingsrisico bij taxatie',
    ],
    priceRange: '€350 – €1.500',
  };
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: `${DOMAIN}/`,
    name: NAP.brand,
    inLanguage: 'nl-NL',
    publisher: { '@id': ORG_ID },
  };
}

export function serviceSchema(key, area = null) {
  const s = SERVICES[key];
  const out = {
    '@type': 'Service',
    '@id': s.url + '#dienst',
    name: s.name,
    ...(s.alternateName ? { alternateName: s.alternateName } : {}),
    serviceType: s.serviceType,
    description: s.description,
    url: s.url,
    provider: { '@id': ORG_ID },
    areaServed: area || AREA(),
  };
  if (s.offers) {
    const spec = { '@type': 'PriceSpecification', priceCurrency: 'EUR', ...s.offers };
    out.offers = { '@type': 'Offer', priceCurrency: 'EUR', priceSpecification: spec, url: s.url };
  }
  return out;
}

export function breadcrumbSchema(url, crumbs) {
  return {
    '@type': 'BreadcrumbList',
    '@id': url + '#breadcrumb',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: DOMAIN + c.href })),
  };
}

const plain = (h) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** FAQPage-schema: altijd uit dezelfde bron als de zichtbare FAQ. */
export function faqSchema(url, faqs) {
  return {
    '@type': 'FAQPage',
    '@id': url + '#faq',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: plain(f.a) },
    })),
  };
}

export function jsonld(graph) {
  const data = { '@context': 'https://schema.org', '@graph': graph };
  return '<script type="application/ld+json">\n' + JSON.stringify(data, null, 1) + '\n</script>';
}

// ---------------------------------------------------------------- html-blokken

// Extra CSS/JS voor de interactieve hulpmiddelen; alleen op pagina's met `tools: true`.
const TOOLS_ASSETS = `<link rel="stylesheet" href="/tools.css">
  <script src="/tools.js" defer></script>
  `;

export function head(page) {
  const url = DOMAIN + page.path;
  const ogImg = `${DOMAIN}/assets/img/og-mv-funderingsscan.jpg`;
  const preload = page.preload || '';
  const robots = page.robots || 'index, follow, max-image-preview:large, max-snippet:-1';
  const canonical = page.canonical !== false ? `<link rel="canonical" href="${url}">\n  ` : '';
  const ogTitle = esc(page.og_title || page.title);
  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.description)}">
  <meta name="robots" content="${robots}">
  ${canonical}<meta name="theme-color" content="#102945">
  <meta property="og:type" content="${page.og_type || 'website'}">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:site_name" content="MV Funderingsscan">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ogImg}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Persoon met een waterpas bij de gevel van een woning">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${esc(page.description)}">
  <meta name="twitter:image" content="${ogImg}">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
  <link rel="icon" type="image/png" sizes="256x256" href="/assets/favicon.png">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  ${preload}<link rel="stylesheet" href="/styles.css">
  ${(page.styles || []).map((href) => `<link rel="stylesheet" href="${href}">
  `).join('')}${page.tools ? TOOLS_ASSETS : ''}${(page.scripts || []).map((src) => `<script src="${src}" defer></script>
  `).join('')}<script>document.documentElement.classList.add('js');</script>
  ${page.schema}
</head>`;
}

const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z"/></svg>';

/** Hoofdnavigatie met dropdowns. Alle links staan in de HTML (crawlbaar, ook zonder JS). */
export function header(active) {
  const nav = NAV.map((item, i) => {
    const kidsActive = (item.children || []).some((c) => c.href === active);
    const isActive = item.href === active || kidsActive;
    const self = item.href === active ? ' aria-current="page"' : '';
    if (!item.children) {
      return `<a class="nav-link${isActive ? ' is-active' : ''}" href="${item.href}"${self}>${item.label}</a>`;
    }
    const kids = item.children.map((c) => `<li><a href="${c.href}"${c.href === active ? ' aria-current="page"' : ''}>${c.label}</a></li>`).join('');
    return `<div class="nav-item${isActive ? ' is-active' : ''}">
        <a class="nav-link" href="${item.href}"${self}>${item.label}</a>
        <button class="nav-sub-toggle" type="button" aria-expanded="false" aria-controls="sub-${i}" aria-label="Submenu ${item.label}">${CHEVRON}</button>
        <ul class="nav-dropdown" id="sub-${i}">${kids}</ul>
      </div>`;
  }).join('\n      ');
  return `<body>
<a class="skip-link" href="#main">Direct naar de inhoud</a>

<header class="site-header" id="top">
  <div class="header-inner">
    <a class="brand" href="/" aria-label="MV Funderingsscan – home">
      <picture>
        <source srcset="/assets/logo-midea.webp" type="image/webp">
        <img class="brand-logo" src="/assets/logo-midea.png" width="480" height="137" alt="MV Funderingsscan – Midea Vastgoed Adviseurs">
      </picture>
    </a>

    <nav class="main-nav" id="mainNav" aria-label="Hoofdmenu">
      ${nav}
      <div class="nav-mobile-extra">
        <a class="btn btn-gold btn-block" href="/funderingsscan-aanvragen/">Vraag een funderingsscan aan <span aria-hidden="true">→</span></a>
        <a class="btn btn-ghost-dark btn-block" href="${NAP.phone_href}">Bel ${NAP.phone_display}</a>
      </div>
    </nav>

    <div class="header-actions">
      <a class="header-phone" href="${NAP.phone_href}" aria-label="Bel ${NAP.phone_display}">
        ${ICON_PHONE}
        <span>${NAP.phone_display}</span>
      </a>
      <a class="btn btn-gold header-cta" href="/funderingsscan-aanvragen/"><span class="cta-long">Vraag een funderingsscan aan</span><span class="cta-short">Scan aanvragen</span></a>
      <button class="nav-toggle" id="navToggle" type="button" aria-label="Menu openen" aria-expanded="false" aria-controls="mainNav">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
  <div class="scroll-progress" id="scrollProgress" aria-hidden="true"></div>
</header>
`;
}

const FOOTER_COLS = [
  ['Onderzoek', [
    ['/funderingsscan/', 'Funderingsscan'], ['/quickscan-fundering/', 'Quickscan fundering'],
    ['/fase-0-funderingsonderzoek/', 'Fase 0 funderingsonderzoek'], ['/fase-1-funderingsonderzoek/', 'Fase 1 funderingsonderzoek'],
    ['/funderingsinspectie/', 'Funderingsinspectie'], ['/funderingsmetingen/', 'Funderingsmetingen'],
    ['/funderingsrapport/', 'Funderingsrapport'], ['/prijzen/', 'Prijzen']]],
  ['Situaties & problemen', [
    ['/funderingsonderzoek-bij-aankoop/', 'Onderzoek bij aankoop'], ['/funderingsonderzoek-bij-verkoop/', 'Onderzoek bij verkoop'],
    ['/funderingsonderzoek-taxatie/', 'Funderingsonderzoek en taxatie'], ['/funderingsproblemen/', 'Funderingsproblemen'],
    ['/scheuren-in-gevel/', 'Scheuren in de gevel'], ['/verzakking-woning/', 'Verzakking woning'],
    ['/problemen-met-houten-palen/', 'Houten palen'], ['/funderingsscan-check/', 'Online funderingscheck'],
    ['/kennisbank/lintvoegwaterpassing/', 'Lintvoegwaterpassing'], ['/kennisbank/loodmeting/', 'Loodmeting'],
    ['/kennisbank/vloerveldwaterpassing/', 'Vloerveldwaterpassing'], ['/kennisbank/scheurpatronen/', 'Scheurpatronen'], ['/kennisbank/begrippenlijst/', 'Begrippenlijst']]],
  ['Werkgebied', [
    ['/funderingsonderzoek-friesland/', 'Funderingsonderzoek Friesland'], ['/funderingsonderzoek-groningen/', 'Funderingsonderzoek Groningen'],
    ['/funderingsonderzoek-leeuwarden/', 'Leeuwarden'], ['/funderingsonderzoek-sneek/', 'Sneek'],
    ['/funderingsonderzoek-harlingen/', 'Harlingen'], ['/funderingsonderzoek-drachten/', 'Drachten'],
    ['/funderingsonderzoek-heerenveen/', 'Heerenveen'], ['/funderingsonderzoek-groningen-stad/', 'Groningen stad'],
    ['/funderingsonderzoek-appingedam/', 'Appingedam'], ['/funderingsonderzoek-delfzijl/', 'Delfzijl'],
    ['/funderingsonderzoek-franeker/', 'Franeker'], ['/funderingsonderzoek-haren/', 'Haren'], ['/funderingsonderzoek-veendam/', 'Veendam'],
    ['/funderingsonderzoek-winschoten/', 'Winschoten'], ['/funderingsscan-leeuwarden/', 'Funderingsscan Leeuwarden']]],
];

export function footer() {
  const cols = FOOTER_COLS.map(([title, links]) => `    <div>
      <h2 class="footer-title">${title}</h2>
      <ul>
${links.map(([h, l]) => `        <li><a href="${h}">${l}</a></li>`).join('\n')}
      </ul>
    </div>`).join('\n');
  return `
<footer class="site-footer">
  <div class="container footer-grid footer-grid-wide">
    <div class="footer-brand">
      <picture>
        <source srcset="/assets/logo-midea-wit.webp" type="image/webp">
        <img src="/assets/logo-midea-wit.png" width="480" height="137" loading="lazy" alt="MV Funderingsscan – Midea Vastgoed Adviseurs">
      </picture>
      <p>MV Funderingsscan is een dienst van MV Adviseurs en voert onafhankelijk funderingsonderzoek uit voor woningen in Friesland en Groningen – van Quick Scan tot onderzoek met metingen.</p>
      <address>
        <strong>${NAP.name}</strong><br>
        ${NAP.street}<br>
        ${NAP.postal} ${NAP.city}<br>
        <a href="${NAP.phone_href}">${NAP.phone_display}</a><br>
        <a href="mailto:${NAP.email}">${NAP.email}</a><br>
        ${NAP.hours_display}
      </address>
    </div>
${cols}
  </div>
  <div class="container footer-bottom">
    <span>© <span id="year">2026</span> MV Adviseurs · MV Funderingsscan · mvfunderingsscan.nl</span>
    <nav class="footer-meta" aria-label="Overige pagina's"><a href="/over-ons/">Over ons</a><a href="/werkwijze/">Werkwijze</a><a href="/kennisbank/">Kennisbank</a><a href="/nieuws/">Nieuws</a><a href="/contact/">Contact</a><a href="/funderingsscan-aanvragen/">Aanvragen</a></nav>
  </div>
</footer>

<div class="mobile-cta" id="mobileCta">
  <a class="btn btn-outline-light" href="${NAP.phone_href}" aria-label="Bel ${NAP.phone_display}">Bellen</a>
  <a class="btn btn-gold" href="/funderingsscan-aanvragen/">Vraag scan aan <span aria-hidden="true">→</span></a>
</div>

<script src="/script.js" defer></script>
</body>
</html>
`;
}

export function breadcrumbsHtml(crumbs) {
  const items = crumbs.map((c, i) => (i === crumbs.length - 1
    ? `<li aria-current="page">${esc(c.name)}</li>`
    : `<li><a href="${c.href}">${esc(c.name)}</a></li>`));
  return '<nav class="breadcrumbs" aria-label="Kruimelpad"><ol>' + items.join('') + '</ol></nav>';
}

export function faqItems(faqs, openFirst = true) {
  return faqs.map((f, i) => `      <details class="faq-item"${i === 0 && openFirst ? ' open' : ''}>
        <summary>${esc(f.q)}</summary>
        <div class="faq-body">${f.a}</div>
      </details>`).join('\n');
}

export function faqHtml(faqs, { title = 'Veelgestelde vragen', intro = null, headingId = 'faq-title' } = {}) {
  const introHtml = intro ? `<p class="section-intro">${intro}</p>` : '';
  return `<section class="section section-alt" id="faq" aria-labelledby="${headingId}">
  <div class="container faq-single">
    <div class="section-head reveal">
      <p class="eyebrow">Veelgestelde vragen</p>
      <h2 class="section-title" id="${headingId}">${title}</h2>
      ${introHtml}
    </div>
    <div class="faq-list reveal">
${faqItems(faqs)}
    </div>
  </div>
</section>`;
}

export function ctaBand(
  title = 'Weten hoe jouw fundering ervoor staat?',
  text = 'Vraag een Quick Scan aan. Je hoort vooraf wat het kost en ontvangt normaal gesproken binnen vijf werkdagen na de inspectie een helder rapport.',
  button = 'Vraag een funderingsscan aan',
) {
  return `<section class="cta-band" aria-labelledby="cta-title">
  <div class="container cta-band-inner reveal">
    <div>
      <p class="eyebrow eyebrow-light">MV Funderingsscan</p>
      <h2 id="cta-title">${title}</h2>
      <p>${text}</p>
    </div>
    <div class="cta-band-actions">
      <a class="btn btn-gold btn-lg" href="/funderingsscan-aanvragen/">${button} <span aria-hidden="true">→</span></a>
      <a class="btn btn-outline-light btn-lg" href="${NAP.phone_href}">Bel ${NAP.phone_display}</a>
    </div>
  </div>
  <p class="container cta-band-note">Twijfel je nog? <a href="/funderingsscan-check/">Doe de online funderingscheck</a> of <a href="/contact/">stel je vraag</a>.</p>
</section>`;
}
