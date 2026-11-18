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
      if (regels.every((r) => /^[-*]\s+/.test(r))) { blokken.push({ type: 'list', ordered: false, items: regels.map((r) => r.replace(/^[-*]\s+/, '')) }); continue; }
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

// ---------------------------------------------------------------- nieuws lezen uit het CMS
export const CMS_BASE = 'https://www.mideavastgoed.app/api/cms/v1/funderingsscan'; // met www: de kale domeinnaam stuurt door en dan valt de Authorization-header weg

/** CMS-blokken → de beperkte Markdown die de nieuwsweergave al kent. Afbeelding en tabel kent die niet: overgeslagen. */
export function blokkenNaarMd(blocks = []) {
  return (Array.isArray(blocks) ? blocks : []).map((b) => {
    if (b?.type === 'heading') return `${b.level === 3 ? '###' : '##'} ${b.text}`;
    // eerdere export zette "## Kop" + lijst zonder witregel als één alinea "- [a](..) - [b](..)": weer een lijst van maken
    if (b?.type === 'paragraph') return /^[-*]\s+\[/.test(b.text) ? b.text.split(/\s+(?=[-*]\s+\[)/).join('\n') : b.text;
    if (b?.type === 'list') return (b.items || []).map((x, i) => (b.ordered ? `${i + 1}. ${x}` : `- ${x}`)).join('\n');
    if (b?.type === 'button' && b.href) return `[${b.label}](${b.href})`;
    if (b?.type === 'faq') return (b.items || []).map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n');
    return '';
  }).filter((x) => x && String(x).trim()).join('\n\n');
}

/** Zelftest uit het CMS-veld terug naar de Markdown die leesZelftest() leest (met de eigen intro). */
function zelftestMd(z) {
  const pt = (n) => `${n} ${n === 1 ? 'punt' : 'punten'}`;
  return ['## Doe de zelftest', z.intro || 'Kies bij elke vraag het antwoord dat het best bij je woning past. Na de laatste vraag zie je je uitslag.',
    ...z.vragen.map((v, i) => [`### ${i + 1}. ${v.vraag}`, (v.opties || []).map((o) => `- ${o.tekst} (**${pt(Number(o.punten))}**)`).join('\n'), v.uitleg ? `*Uitleg:* ${v.uitleg}` : ''].filter(Boolean).join('\n\n')),
    (z.uitslagen || []).length ? ['## Wat betekent je score?', ...z.uitslagen.map((u) => `### ${u.min}–${u.max} punten: ${u.titel}\n\n${u.tekst}`)].join('\n\n') : '',
    z.disclaimer ? `> ${z.disclaimer}` : ''].filter(Boolean).join('\n\n');
}

/** Eén CMS-nieuwsstuk (vorm van GET /content/{slug}?type=news) → bericht zoals de nieuwsweergave het verwacht. */
export function cmsNaarPost(x) {
  const f = x.fields || {}; const afb = f.afbeelding || null;
  const mediaUrl = afb?.mediaId ? x.media?.[afb.mediaId]?.url : null;
  let content = blokkenNaarMd(x.blocks);
  if (f.zelftest?.vragen?.length) {
    // zelfde volgorde als naarNieuwsMarkdown(): inhoud, zelftest, FAQ, Lees ook, Bronnen, slot-CTA
    const z = zelftestMd(f.zelftest); const m = content.match(/^(## (Veelgestelde vragen|Lees ook|Bronnen)\s*$|Twijfel je over de fundering van een woning)/m);
    content = m ? `${content.slice(0, m.index)}${z}\n\n${content.slice(m.index)}` : `${content}\n\n${z}`;
  }
  return {
    id: x.id, slug: String(x.slug || '').split('/').pop(), title: x.h1 || x.title, excerpt: x.intro || '',
    meta_description: x.seo?.description || '', content: content.trim(),
    featured_image: mediaUrl || afb?.name || afb?.pad || null, featured_image_alt: afb?.alt || '',
    status: 'gepubliceerd', show_author: !!x.author, author: x.author ? { name: x.author } : null,
    published_at: x.publishedAt, updated_at: x.updatedAt || x.publishedAt, created_at: x.publishedAt,
  };
}

/**
 * Nieuws-"database" met het CMS als bron (zelfde methodes die api/nieuws.js gebruikt). Zonder CMS_API_KEY,
 * bij een storing of een lege lijst: terugvallen op de bestaande database (Supabase).
 */
export function cmsNieuwsDb(fallback, { key = process.env.CMS_API_KEY, fetchFn = fetch } = {}) {
  if (!key) return fallback;
  const get = async (pad) => {
    const r = await fetchFn(CMS_BASE + pad, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`CMS ${pad.split('?')[0]} ${r.status}`);
    return r.json();
  };
  const detail = async (slug) => cmsNaarPost(await get(`/content/${encodeURIComponent(slug)}?type=news`));
  const publicUrl = (bucket, path) => (/^https?:\/\//.test(path) ? path : fallback ? fallback.publicUrl(bucket, path)
    : `${String(process.env.SUPABASE_URL || '').replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${path}`);
  return {
    publicUrl,
    async newsList() {
      try {
        const r = await get('/content?type=news&limit=200'); const items = Array.isArray(r) ? r : r.items || r.data || [];
        if (!items.length) throw new Error('lege nieuwslijst');
        const posts = await Promise.all(items.slice(0, 200).map((x) => detail(x.slug)));
        return posts.sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)));
      } catch (err) {
        if (!fallback) throw err;
        console.warn(`⚠ nieuws uit de database i.p.v. het CMS (${err.message})`);
        return fallback.newsList({ status: 'gepubliceerd' });
      }
    },
    async newsBySlug(slug) {
      try { return await detail(slug); } catch (err) {
        if (/ 404$/.test(err.message) || !fallback) return null; // niet (meer) gepubliceerd in het CMS
        console.warn(`⚠ nieuwsbericht uit de database i.p.v. het CMS (${err.message})`);
        return fallback.newsBySlug(slug);
      }
    },
  };
}
