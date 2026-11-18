/**
 * Nieuwsbericht (rij uit mvfs_news) → importformaat van het centrale CMS (sjabloon fs.nieuws).
 * Gebruikt door scripts/cms-export.mjs en de beheeractie "nieuws-cms-export".
 */
import { leesZelftest } from './news-render.js';

/** Beperkte Markdown van het nieuws → CMS-blokken (kop 2/3, alinea, lijst). Citaten worden een alinea. */
export function mdNaarBlokken(md) {
  const blokken = [];
  for (const deel of String(md || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const regels = deel.split('\n').map((r) => r.trim()).filter(Boolean);
    if (!regels.length) continue;
    let m;
    if (regels.length === 1 && (m = regels[0].match(/^(#{2,3})\s+(.+)$/))) blokken.push({ type: 'heading', level: m[1].length, text: m[2] });
    else if (regels.every((r) => /^[-*]\s+/.test(r))) blokken.push({ type: 'list', ordered: false, items: regels.map((r) => r.replace(/^[-*]\s+/, '')) });
    else if (regels.every((r) => /^\d{1,3}[.)]\s+/.test(r))) blokken.push({ type: 'list', ordered: true, items: regels.map((r) => r.replace(/^\d{1,3}[.)]\s+/, '')) });
    else {
      // een kop direct gevolgd door tekst zonder witregel: kop apart houden
      if ((m = regels[0].match(/^(#{2,3})\s+(.+)$/))) { blokken.push({ type: 'heading', level: m[1].length, text: m[2] }); regels.shift(); }
      blokken.push({ type: 'paragraph', text: regels.map((r) => r.replace(/^>\s?/, '')).join(' ') });
    }
  }
  return blokken;
}

export function nieuwsItem(post) {
  const z = leesZelftest(post.content);
  return {
    type: 'news', template: 'fs.nieuws', slug: post.slug, rootPath: false, title: post.title, h1: post.title, intro: post.excerpt || '', answer: '',
    author: post.show_author && post.author?.name ? post.author.name : '',
    seo: { title: post.title, description: post.meta_description || post.excerpt || '' },
    blocks: mdNaarBlokken(z ? [z.voor, z.na].join('\n\n') : post.content),
    // zelftest in de vorm die de site nu gebruikt (vragen met uitleg, uitslagen met min/max, intro, disclaimer)
    fields: { afbeelding: post.featured_image ? { pad: post.featured_image, alt: post.featured_image_alt || '' } : null, zelftest: z ? z.test : null },
    publish: true, publishedAt: post.published_at,
  };
}
