/** Template voor dienst-, regio- en kennisbankpagina's. */
import {
  DOMAIN, TODAY, ORG_ID, SITE_ID, NAP, DEFAULT_SIDE, esc, img, head, header, footer,
  breadcrumbsHtml, faqHtml, ctaBand, jsonld, orgSchema, websiteSchema, serviceSchema,
  breadcrumbSchema, faqSchema, GEMEENTEN, gemeenteArea,
} from './layout.mjs';

function factsCard(facts, title = 'In het kort') {
  const rows = facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${f.value}</dd></div>`).join('');
  return `<aside class="facts-card" aria-label="${esc(title)}">
        <p class="facts-title">${esc(title)}</p>
        <dl>${rows}</dl>
        <a class="btn btn-gold btn-block" href="/funderingsscan-aanvragen/">Vraag een scan aan <span aria-hidden="true">→</span></a>
      </aside>`;
}

function sectionHtml(s) {
  const sid = s.id ? ` id="${s.id}"` : '';
  const answer = s.answer ? `<p class="answer-first">${s.answer}</p>` : '';
  return `        <section class="prose-section reveal"${sid}>
          <h2>${s.h2}</h2>
          ${answer}
          ${s.body || ''}
        </section>`;
}

// Kernen met een eigen pagina krijgen een link.
const KERN_LINKS = {
  Leeuwarden: '/funderingsonderzoek-leeuwarden/', Sneek: '/funderingsonderzoek-sneek/', Harlingen: '/funderingsonderzoek-harlingen/',
  Drachten: '/funderingsonderzoek-drachten/', Heerenveen: '/funderingsonderzoek-heerenveen/', Franeker: '/funderingsonderzoek-franeker/',
  Groningen: '/funderingsonderzoek-groningen-stad/', Haren: '/funderingsonderzoek-haren/', Appingedam: '/funderingsonderzoek-appingedam/',
  Delfzijl: '/funderingsonderzoek-delfzijl/', Veendam: '/funderingsonderzoek-veendam/', Winschoten: '/funderingsonderzoek-winschoten/',
};

function kernenHtml(g, path) {
  const chips = g.kernen.map((k) => (KERN_LINKS[k] && KERN_LINKS[k] !== path ? `<li><a href="${KERN_LINKS[k]}">${esc(k)}</a></li>` : `<li>${esc(k)}</li>`)).join('');
  const prov = g.provincie === 'Friesland' ? '/funderingsonderzoek-friesland/' : '/funderingsonderzoek-groningen/';
  return `
        <section class="prose-section reveal" id="kernen-gemeente">
          <h2>Kernen in de gemeente ${esc(g.naam)}</h2>
          <p class="answer-first">MV Funderingsscan voert funderingsonderzoek uit in alle kernen van de gemeente ${esc(g.naam)}, waaronder ${esc(g.kernen.slice(0, -1).join(', '))} en ${esc(g.kernen.at(-1))}.</p>
          <ul class="town-chips">${chips}</ul>
          <p>Woon je in een andere plaats in de provincie ${g.provincie}? Bekijk <a href="${prov}">funderingsonderzoek in ${g.provincie}</a> of het <a href="/werkgebied/">volledige werkgebied</a>.</p>
        </section>`;
}

const PROVINCIE_PAGES = { '/funderingsonderzoek-friesland/': 'Friesland', '/funderingsonderzoek-groningen/': 'Groningen' };

function gemeentenHtml(prov) {
  const list = GEMEENTEN.filter((g) => g.provincie === prov).sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
  return `
        <section class="prose-section reveal" id="gemeenten">
          <h2>Funderingsonderzoek per gemeente in ${prov}</h2>
          <p class="answer-first">MV Funderingsscan werkt in alle ${list.length} gemeenten van ${prov}${prov === 'Friesland' ? ' op het vasteland' : ''}. Kies je gemeente voor lokale informatie over bodem, woningen en de kernen waar we onderzoek doen.</p>
          <div class="place-index">
          ${list.map((g) => `<div class="place-index-item">
            <h3><a href="${g.href}">Gemeente ${esc(g.naam)}</a></h3>
            <p>${g.kernen.map(esc).join(' · ')}</p>
          </div>`).join('\n          ')}
          </div>
        </section>`;
}

function plaatsenIndexHtml() {
  const block = (prov) => GEMEENTEN.filter((g) => g.provincie === prov).sort((a, b) => a.naam.localeCompare(b.naam, 'nl')).map((g) => `<div class="place-index-item">
            <h3><a href="${g.href}">Gemeente ${esc(g.naam)}</a></h3>
            <p>${g.kernen.map(esc).join(' · ')}</p>
          </div>`).join('\n          ');
  return `
        <section class="prose-section reveal" id="plaatsenindex">
          <h2>Plaatsenindex: alle gemeenten en kernen</h2>
          <p class="answer-first">MV Funderingsscan werkt in ${GEMEENTEN.length} gemeenten in Friesland en Groningen. Zoek je plaats op in de lijst en klik op de gemeente voor lokale informatie over bodem, woningen en funderingsonderzoek.</p>
          <h3 class="place-index-title">Friesland</h3>
          <div class="place-index">
          ${block('Friesland')}
          </div>
          <h3 class="place-index-title">Groningen</h3>
          <div class="place-index">
          ${block('Groningen')}
          </div>
          <p>Staat jouw plaats er niet bij? Neem <a href="/contact/">contact</a> op; we kijken graag of we je kunnen helpen.</p>
        </section>`;
}

export function relatedHtml(related, title = 'Verder lezen') {
  if (!related || !related.length) return '';
  const cards = related.map((r) => `      <a class="related-card reveal" href="${r.href}">
        <strong>${r.label}</strong>
        <span>${r.text}</span>
        <em aria-hidden="true">→</em>
      </a>`).join('\n');
  return `<section class="section section-tight" aria-labelledby="related-title">
  <div class="container">
    <h2 class="section-title section-title-sm" id="related-title">${title}</h2>
    <div class="related-grid">
${cards}
    </div>
  </div>
</section>`;
}

function tocHtml(sections) {
  if (sections.length < 5) return '';
  const items = sections.map((s) => `<li><a href="#${s.id}">${esc(s.h2)}</a></li>`).join('');
  return `<nav class="side-card side-toc" aria-label="Op deze pagina">
          <p class="side-title">Op deze pagina</p>
          <ol class="toc-list">${items}</ol>
        </nav>`;
}

function sideHtml(links, sections, path) {
  const items = links.filter((l) => l.href !== path).map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join('');
  return `<aside class="content-side">
        <nav class="side-card" aria-label="Gerelateerde pagina's">
          <p class="side-title">Meer over funderingsonderzoek</p>
          <ul class="side-links">${items}</ul>
        </nav>
        <div class="side-sticky">
        ${tocHtml(sections)}
        <div class="side-card side-card-navy">
          <p class="side-title">Direct duidelijkheid</p>
          <p>Quick Scan vanaf ca. €350, vaste prijs vooraf en rapport binnen 5 werkdagen na de inspectie.</p>
          <a class="btn btn-gold btn-block" href="/funderingsscan-aanvragen/">Scan aanvragen <span aria-hidden="true">→</span></a>
          <a class="side-phone" href="${NAP.phone_href}">Of bel ${NAP.phone_display}</a>
        </div>
        </div>
      </aside>`;
}

export function render(p) {
  const url = DOMAIN + p.path;
  const graph = [orgSchema(), websiteSchema(), {
    '@type': p.webpage_type || 'WebPage',
    '@id': url + '#webpagina',
    url,
    name: p.title,
    description: p.description,
    inLanguage: 'nl-NL',
    isPartOf: { '@id': SITE_ID },
    about: { '@id': ORG_ID },
    breadcrumb: { '@id': url + '#breadcrumb' },
    dateModified: TODAY,
  }, breadcrumbSchema(url, p.crumbs)];
  const gemeente = GEMEENTEN.find((g) => g.href === p.path);
  for (const key of p.services || []) graph.push(serviceSchema(key, gemeente ? gemeenteArea(gemeente) : null));
  if (p.article) {
    graph.push({
      '@type': 'Article',
      '@id': url + '#artikel',
      headline: p.h1,
      description: p.description,
      inLanguage: 'nl-NL',
      mainEntityOfPage: { '@id': url + '#webpagina' },
      author: { '@id': ORG_ID },
      publisher: { '@id': ORG_ID },
      datePublished: TODAY,
      dateModified: TODAY,
      image: `${DOMAIN}/assets/img/og-mv-funderingsscan.jpg`,
    });
  }
  if (p.defined_term) {
    graph.push({
      '@type': 'DefinedTerm',
      '@id': url + '#begrip',
      name: p.defined_term.name,
      description: p.defined_term.description,
      url,
      inDefinedTermSet: { '@id': `${DOMAIN}/kennisbank/begrippenlijst/#begrippen` },
    });
  }
  if (p.faqs && p.faqs.length) graph.push(faqSchema(url, p.faqs));
  const page = { ...p, schema: jsonld(graph) };

  const heroImg = p.hero_image
    ? `<div class="page-hero-media">${img(p.hero_image.name, p.hero_image.alt, '100vw', { lazy: false })}</div>`
    : '';
  const buttons = p.hero_buttons || `<a class="btn btn-gold btn-lg" href="/funderingsscan-aanvragen/">Vraag een funderingsscan aan <span aria-hidden="true">→</span></a>
          <a class="btn btn-outline-light btn-lg" href="${NAP.phone_href}">Bel ${NAP.phone_display}</a>`;
  const facts = p.facts ? factsCard(p.facts) : '';
  const sections = p.sections.map(sectionHtml).join('\n') + (gemeente ? kernenHtml(gemeente, p.path) : '') + (p.path === '/werkgebied/' ? plaatsenIndexHtml() : '') + (PROVINCIE_PAGES[p.path] ? gemeentenHtml(PROVINCIE_PAGES[p.path]) : '');
  const faq = p.faqs && p.faqs.length
    ? faqHtml(p.faqs, { title: p.faq_title || 'Veelgestelde vragen', headingId: 'faq-title' })
    : '';

  const body = `${header(p.nav_active || '')}
<main id="main">

<section class="page-hero${heroImg ? ' page-hero-has-media' : ''}" aria-labelledby="page-title">
  ${heroImg}
  <div class="container page-hero-inner">
    <div class="page-hero-copy">
      ${breadcrumbsHtml(p.crumbs)}
      <p class="eyebrow eyebrow-light">${p.eyebrow}</p>
      <h1 id="page-title">${p.h1}</h1>
      <p class="page-hero-lead">${p.lead}</p>
      <div class="hero-buttons">
        ${buttons}
      </div>
    </div>
    ${facts}
  </div>
</section>

<section class="section">
  <div class="container content-layout">
    <article class="prose">
${p.defined_term ? `        <div class="definition-box reveal">
          <span class="definition-label">Definitie</span>
          <p><dfn>${esc(p.defined_term.name)}</dfn>: ${esc(p.defined_term.description)}</p>
          <a href="/kennisbank/begrippenlijst/">Bekijk alle begrippen</a>
        </div>
` : ''}${sections}
    </article>
    ${sideHtml(p.side_links || DEFAULT_SIDE, p.sections, p.path)}
  </div>
</section>

${faq}

${relatedHtml(p.related, p.related_title || 'Verder lezen')}

${ctaBand(...(p.cta || []))}

</main>
${footer()}`;
  return head(page) + '\n' + body;
}
