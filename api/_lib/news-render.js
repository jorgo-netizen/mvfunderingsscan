/**
 * Openbare nieuwspagina's, opgebouwd met dezelfde layout als de statische site (src/lib/layout.mjs).
 */
import {
  head, header, footer, breadcrumbsHtml, ctaBand, orgSchema, websiteSchema, breadcrumbSchema,
  esc, DOMAIN, ORG_ID, SITE_ID,
} from '../../src/lib/layout.mjs';
import { renderMarkdown, plainText } from './markdown.js';

/** JSON-LD met door medewerkers ingevoerde tekst: '<' escapen, zodat '</script>' het blok niet kan beëindigen. */
const jsonld = (graph) => `<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 1).replace(/</g, '\\u003c')}
</script>`;

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export const dateNl = (iso) => {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d);
  const get = (t) => Number(p.find((x) => x.type === t).value);
  return `${get('day')} ${MONTHS[get('month') - 1]} ${get('year')}`;
};
const isoDate = (iso) => new Date(iso).toISOString();
const clip = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);

export const NEWS_TITLE = 'Nieuws over funderingen | MV Funderingsscan';
const NEWS_DESC = 'Nieuws en achtergronden van MV Funderingsscan over funderingsonderzoek, regelgeving en woningen in Friesland en Groningen.';

function imageUrl(db, path) {
  return path ? db.publicUrl('nieuws', path) : null;
}

function hero({ crumbs, eyebrow, h1, lead, meta = '' }) {
  return `<section class="page-hero" aria-labelledby="page-title">
  <div class="container page-hero-inner">
    <div class="page-hero-copy">
      ${breadcrumbsHtml(crumbs)}
      <p class="eyebrow eyebrow-light">${eyebrow}</p>
      <h1 id="page-title">${h1}</h1>
      ${lead ? `<p class="page-hero-lead">${lead}</p>` : ''}${meta}
    </div>
  </div>
</section>`;
}

/** Overzichtspagina /nieuws/. Zonder berichten: nette lege staat en noindex (geen dunne pagina in Google). */
export function renderNewsIndex(db, posts) {
  const url = `${DOMAIN}/nieuws/`;
  const crumbs = [{ href: '/', name: 'Home' }, { href: '/nieuws/', name: 'Nieuws' }];
  const graph = [orgSchema(), websiteSchema(), {
    '@type': 'CollectionPage', '@id': `${url}#webpagina`, url, name: NEWS_TITLE, description: NEWS_DESC,
    inLanguage: 'nl-NL', isPartOf: { '@id': SITE_ID }, about: { '@id': ORG_ID }, breadcrumb: { '@id': `${url}#breadcrumb` },
  }, breadcrumbSchema(url, crumbs)];
  const cards = posts.map((p) => {
    const img = imageUrl(db, p.featured_image);
    return `      <article class="news-card">
        ${img ? `<a class="news-card-media" href="/nieuws/${p.slug}/" tabindex="-1" aria-hidden="true"><img src="${esc(img)}" alt="" loading="lazy" decoding="async" width="640" height="360"></a>` : ''}
        <div class="news-card-body">
          <p class="news-date"><time datetime="${isoDate(p.published_at)}">${dateNl(p.published_at)}</time></p>
          <h2 class="news-card-title"><a href="/nieuws/${p.slug}/">${esc(p.title)}</a></h2>
          ${p.excerpt ? `<p>${esc(clip(p.excerpt, 260))}</p>` : ''}
          <a class="news-more" href="/nieuws/${p.slug}/" aria-label="Lees verder: ${esc(p.title)}">Lees verder <span aria-hidden="true">→</span></a>
        </div>
      </article>`;
  }).join('\n');
  const empty = `<div class="news-empty">
        <h2>Er zijn nog geen nieuwsberichten</h2>
        <p>Op deze pagina verschijnen binnenkort berichten van MV Funderingsscan. Tot die tijd vind je uitleg over funderingen, onderzoek en regelgeving in de <a href="/kennisbank/">kennisbank</a>.</p>
      </div>`;
  const page = {
    path: '/nieuws/', title: NEWS_TITLE, description: NEWS_DESC, schema: jsonld(graph),
    robots: posts.length ? undefined : 'noindex, follow',
  };
  return `${head(page)}
${header('/nieuws/')}
<main id="main">
${hero({ crumbs, eyebrow: 'Nieuws', h1: 'Nieuws over funderingen', lead: 'Berichten van MV Funderingsscan over funderingsonderzoek, regelgeving en ontwikkelingen die van belang zijn voor woningeigenaren en kopers in Friesland en Groningen.' })}
<section class="section">
  <div class="container">
    ${posts.length ? `<div class="news-grid">\n${cards}\n    </div>` : empty}
  </div>
</section>
${ctaBand()}
</main>
${footer()}`;
}

/** Detailpagina /nieuws/<slug>/. preview=true: concept-weergave voor medewerkers (noindex, met banner). */
export function renderNewsArticle(db, post, { preview = false } = {}) {
  const url = `${DOMAIN}/nieuws/${post.slug}/`;
  const crumbs = [{ href: '/', name: 'Home' }, { href: '/nieuws/', name: 'Nieuws' }, { href: `/nieuws/${post.slug}/`, name: post.title }];
  const { html } = renderMarkdown(post.content);
  const desc = clip(post.meta_description || post.excerpt || plainText(post.content), 158);
  const img = imageUrl(db, post.featured_image);
  const absImg = img && img.startsWith('http') ? img : img ? `${DOMAIN}${img}` : `${DOMAIN}/assets/img/og-mv-funderingsscan.jpg`;
  const author = post.show_author && post.author?.name ? post.author.name : null;
  const published = post.published_at || post.updated_at || post.created_at;
  const graph = [orgSchema(), websiteSchema(), {
    '@type': 'WebPage', '@id': `${url}#webpagina`, url, name: post.title, description: desc, inLanguage: 'nl-NL',
    isPartOf: { '@id': SITE_ID }, breadcrumb: { '@id': `${url}#breadcrumb` },
  }, breadcrumbSchema(url, crumbs), {
    '@type': 'NewsArticle', '@id': `${url}#artikel`, headline: post.title.slice(0, 110), description: desc, inLanguage: 'nl-NL',
    mainEntityOfPage: { '@id': `${url}#webpagina` },
    author: author ? { '@type': 'Person', name: author } : { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    datePublished: isoDate(published), dateModified: isoDate(post.updated_at || published),
    image: absImg,
  }];
  const page = {
    path: `/nieuws/${post.slug}/`, title: `${clip(post.title, 50)} | MV Funderingsscan`, description: desc, schema: preview ? '' : jsonld(graph),
    og_type: 'article', robots: preview ? 'noindex, nofollow' : undefined, canonical: preview ? false : undefined,
  };
  const meta = `<p class="news-hero-meta"><time datetime="${isoDate(published)}">${preview && !post.published_at ? 'Nog niet gepubliceerd' : dateNl(published)}</time>${author ? ` · ${esc(author)}` : ''}</p>`;
  return `${head(page)}
${header('/nieuws/')}
<main id="main">
${preview ? `<div class="news-preview-banner" role="status"><div class="container">Voorbeeld – ${post.status === 'gepubliceerd' ? 'dit bericht is gepubliceerd' : 'dit is een concept en niet openbaar zichtbaar'}.</div></div>` : ''}
${hero({ crumbs, eyebrow: 'Nieuws', h1: esc(post.title), lead: post.excerpt ? esc(post.excerpt) : '', meta })}
<section class="section">
  <div class="container news-article-wrap">
    <article class="prose news-article">
      ${img ? `<figure class="news-figure"><img src="${esc(img)}" alt="${esc(post.featured_image_alt || '')}" width="1200" height="675" decoding="async"></figure>` : ''}
${html}
      <p class="news-back"><a href="/nieuws/"><span aria-hidden="true">←</span> Terug naar het nieuwsoverzicht</a></p>
    </article>
  </div>
</section>
${ctaBand()}
</main>
${footer()}`;
}

/** Aparte sitemap voor nieuws (de statische sitemap.xml wordt bij de build gemaakt). */
export function newsSitemap(posts) {
  const urls = posts.map((p) => `  <url><loc>${DOMAIN}/nieuws/${p.slug}/</loc><lastmod>${isoDate(p.updated_at || p.published_at)}</lastmod></url>`);
  if (posts.length) urls.unshift(`  <url><loc>${DOMAIN}/nieuws/</loc><lastmod>${isoDate(posts[0].updated_at || posts[0].published_at)}</lastmod></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
