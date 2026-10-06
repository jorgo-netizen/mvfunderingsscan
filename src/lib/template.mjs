/** Template voor dienst-, regio- en kennisbankpagina's. */
import {
  DOMAIN, TODAY, ORG_ID, SITE_ID, NAP, DEFAULT_SIDE, esc, img, head, header, footer,
  breadcrumbsHtml, faqHtml, ctaBand, jsonld, orgSchema, websiteSchema, serviceSchema,
  breadcrumbSchema, faqSchema,
} from './layout.mjs';

function factsCard(facts, title = 'In het kort') {
  const rows = facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${f.value}</dd></div>`).join('');
  return `<aside class="facts-card" aria-label="${esc(title)}">
        <p class="facts-title">${esc(title)}</p>
        <dl>${rows}</dl>
        <a class="btn btn-gold btn-block" href="/contact/">Vraag een scan aan <span aria-hidden="true">→</span></a>
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

function sideHtml(links) {
  const items = links.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join('');
  return `<aside class="content-side">
        <div class="side-card side-card-navy">
          <p class="side-title">Direct duidelijkheid</p>
          <p>Quick Scan vanaf ca. €350, vaste prijs vooraf en rapport binnen 5 werkdagen na de inspectie.</p>
          <a class="btn btn-gold btn-block" href="/contact/">Scan aanvragen <span aria-hidden="true">→</span></a>
          <a class="side-phone" href="${NAP.phone_href}">Of bel ${NAP.phone_display}</a>
        </div>
        <nav class="side-card" aria-label="Gerelateerde pagina's">
          <p class="side-title">Op deze site</p>
          <ul class="side-links">${items}</ul>
        </nav>
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
  for (const key of p.services || []) graph.push(serviceSchema(key));
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
  if (p.faqs && p.faqs.length) graph.push(faqSchema(url, p.faqs));
  const page = { ...p, schema: jsonld(graph) };

  const heroImg = p.hero_image
    ? `<div class="page-hero-media">${img(p.hero_image.name, p.hero_image.alt, '100vw', { lazy: false })}</div>`
    : '';
  const buttons = p.hero_buttons || `<a class="btn btn-gold btn-lg" href="/contact/">Vraag een funderingsscan aan <span aria-hidden="true">→</span></a>
          <a class="btn btn-outline-light btn-lg" href="${NAP.phone_href}">Bel ${NAP.phone_display}</a>`;
  const facts = p.facts ? factsCard(p.facts) : '';
  const sections = p.sections.map(sectionHtml).join('\n');
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
${sections}
    </article>
    ${sideHtml(p.side_links || DEFAULT_SIDE)}
  </div>
</section>

${faq}

${relatedHtml(p.related, p.related_title || 'Verder lezen')}

${ctaBand(...(p.cta || []))}

</main>
${footer()}`;
  return head(page) + '\n' + body;
}
