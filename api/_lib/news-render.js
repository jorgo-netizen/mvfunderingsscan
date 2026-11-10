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

/**
 * Zelftest in een bericht (zoals Redactie die als tekst schrijft, en zoals een medewerker hem in Nieuws kan aanpassen):
 *   ## Doe de zelftest / intro / ### 1. Vraag / - Antwoord (**2 punten**) / *Uitleg:* … /
 *   ## Wat betekent je score? / ### 0–4 punten: Titel / tekst / > disclaimer
 * Geeft { voor, test, na } terug, of null als het blok er niet (volledig) in staat; dan blijft het gewone tekst.
 */
export function leesZelftest(content) {
  const regels = String(content || '').replace(/\r\n?/g, '\n').split('\n');
  const start = regels.findIndex((r) => r.trim() === '## Doe de zelftest');
  if (start < 0) return null;
  const vragen = []; const uitslagen = []; const intro = []; let disclaimer = ''; let deel = 'vragen'; let eind = regels.length;
  for (let i = start + 1; i < regels.length; i++) {
    const r = regels[i].trim(); let m;
    if (r === '## Wat betekent je score?') { deel = 'uitslagen'; continue; }
    if (r.startsWith('## ')) { eind = i; break; }
    if (deel === 'uitslagen' && r.startsWith('> ')) { disclaimer = r.slice(2); eind = i + 1; break; }
    if (deel === 'vragen' && (m = r.match(/^###\s+\d+\.\s+(.+)$/))) vragen.push({ vraag: m[1], opties: [], uitleg: '' });
    else if (deel === 'vragen' && vragen.length && (m = r.match(/^-\s+(.+?)\s+\(\*\*(\d+)\s+punt(?:en)?\*\*\)$/))) vragen.at(-1).opties.push({ tekst: m[1], punten: Number(m[2]) });
    else if (deel === 'vragen' && vragen.length && (m = r.match(/^\*Uitleg:\*\s*(.+)$/))) vragen.at(-1).uitleg = m[1];
    else if (deel === 'vragen' && !vragen.length && r) intro.push(r);
    else if (deel === 'uitslagen' && (m = r.match(/^###\s+(\d+)\s*[–-]\s*(\d+)\s+punten?:\s*(.+)$/))) uitslagen.push({ min: Number(m[1]), max: Number(m[2]), titel: m[3], tekst: '' });
    else if (deel === 'uitslagen' && uitslagen.length && r) uitslagen.at(-1).tekst = `${uitslagen.at(-1).tekst} ${r}`.trim();
  }
  if (!vragen.length || vragen.some((v) => v.opties.length < 2) || !uitslagen.length) return null;
  return { voor: regels.slice(0, start).join('\n'), na: regels.slice(eind).join('\n'), test: { intro: intro.join(' '), vragen, uitslagen, disclaimer } };
}

/** Klikbare zelftest; dezelfde opmaak als de funderingsquiz (tools.css), het gedrag staat in tools.js. */
function zelftestHtml(t) {
  const n = t.vragen.length;
  const qs = t.vragen.map((v, i) => `
    <fieldset class="qz-q">
      <legend><span class="tq-num">${i + 1}/${n}</span>${esc(v.vraag)}</legend>
      <div class="tq-opts">${v.opties.map((o, j) => `<label class="tq-opt"><input type="radio" name="zt${i}" value="${j}" data-punten="${o.punten}"><span>${esc(o.tekst)}</span></label>`).join('')}</div>
      ${v.uitleg ? `<p class="qz-feedback" data-zt-uitleg hidden>${esc(v.uitleg)}</p>` : ''}
    </fieldset>`).join('');
  const uitslagen = t.uitslagen.map((u) => `<div data-zt-uitslag data-min="${u.min}" data-max="${u.max}" hidden><h3>${esc(u.titel)}</h3><p>${esc(u.tekst)}</p></div>`).join('');
  return `
<div class="tool tool-quiz" data-tool="zelftest">
  <div class="sim-head">
    <span class="sim-badge">Zelftest · ${n} vragen</span>
    <h3>Doe de zelftest</h3>
    <p class="sim-instruction">${esc(t.intro || 'Kies bij elke vraag het antwoord dat het best bij je woning past.')}</p>
  </div>
  <form class="qz-form" data-zt-form novalidate>${qs}</form>
  <div class="tool-result tool-result-inline" data-zt-result aria-live="polite" hidden>
    <p class="tr-count">Je score: <strong data-zt-score>0</strong> punten.</p>
    ${uitslagen}
    ${t.disclaimer ? `<p><em>${esc(t.disclaimer)}</em></p>` : ''}
    <div class="tr-actions"><a class="btn btn-gold" href="/funderingsscan-aanvragen/">Vraag een funderingsscan aan <span aria-hidden="true">→</span></a><a class="btn btn-ghost-dark" href="/fase-0-funderingsonderzoek/">Wat is een Quick Scan?</a><button type="button" class="btn btn-link" data-zt-reset>Opnieuw</button></div>
  </div>
</div>`;
}

/** Detailpagina /nieuws/<slug>/. preview=true: concept-weergave voor medewerkers (noindex, met banner). */
export function renderNewsArticle(db, post, { preview = false } = {}) {
  const url = `${DOMAIN}/nieuws/${post.slug}/`;
  const crumbs = [{ href: '/', name: 'Home' }, { href: '/nieuws/', name: 'Nieuws' }, { href: `/nieuws/${post.slug}/`, name: post.title }];
  const zt = leesZelftest(post.content);
  const html = zt ? `${renderMarkdown(zt.voor).html}${zelftestHtml(zt.test)}${renderMarkdown(zt.na).html}` : renderMarkdown(post.content).html;
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
    og_type: 'article', tools: !!zt, robots: preview ? 'noindex, nofollow' : undefined, canonical: preview ? false : undefined,
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
