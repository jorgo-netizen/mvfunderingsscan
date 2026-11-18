/**
 * Koppeling met het centrale Midea Vastgoed CMS (mideavastgoed.app/marketing), fase 1.
 *
 * Bij de build haalt de site de GEPUBLICEERDE pagina's op en neemt per bestaande pagina alleen deze velden over:
 * SEO-title, meta description, H1, intro (lead), ALT van de hero-afbeelding en de FAQ's.
 * - Een veld wordt alleen overgenomen als het in het CMS echt anders is dan de huidige inhoud
 *   (vergeleken in CMS-vorm), dus ongewijzigde velden blijven byte-voor-byte gelijk.
 * - Layout, secties, facts, prijzen, URL's, redirects en structured data blijven uit de site zelf komen.
 * - Geen CMS_API_KEY, API onbereikbaar of fout antwoord: de lokale JSON blijft de bron; de build faalt nooit.
 * De sleutel staat alleen als env CMS_API_KEY in Vercel (server-side bij de build), nooit in code of output.
 */
import { renderMarkdown } from '../api/_lib/markdown.js';
import { htmlNaarMarkdown } from '../api/_lib/redactie.js';

export const CMS_BASE = 'https://mideavastgoed.app/api/cms/v1/funderingsscan';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const tekst = (v, max) => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);
const regel = (v, max) => (tekst(v, max) ? norm(v) : null);
/** Site-pad (met slash aan het eind) → CMS-slug. */
export const cmsSlug = (path) => path.replace(/^\/|\/$/g, '');

/** Huidige pagina → CMS-document (voor het eenmalig vullen van het CMS én voor de vergelijking bij de overlay). */
export function naarCms(p) {
  return {
    slug: cmsSlug(p.path),
    title: p.h1,
    h1: p.h1,
    intro: htmlNaarMarkdown(p.lead),
    seo: { title: p.title, description: p.description },
    heroAlt: p.hero_image?.alt ?? null,
    faqs: (p.faqs || []).map((f) => ({ q: htmlNaarMarkdown(f.q), a: htmlNaarMarkdown(f.a) })),
  };
}

const inlineHtml = (md) => renderMarkdown(md).html.replace(/^<p>([\s\S]*)<\/p>$/, '$1');

/** Legt één gepubliceerd CMS-stuk over een pagina. Geeft de namen van de gewijzigde velden terug. */
export function overlay(p, cms, { defaultDescription = '' } = {}) {
  const nu = naarCms(p); const gewijzigd = [];
  const title = regel(cms.seo?.title, 200);
  if (title && title !== norm(nu.seo.title)) { p.title = title; gewijzigd.push('title'); }
  const desc = regel(cms.seo?.description, 400);
  // De API vult een lege description aan met de standaard van de website: die nooit over een eigen description zetten.
  if (desc && desc !== norm(defaultDescription) && desc !== norm(nu.seo.description)) { p.description = desc; gewijzigd.push('description'); }
  const h1 = regel(cms.h1, 200);
  if (h1 && h1 !== norm(nu.h1)) { p.h1 = esc(h1); gewijzigd.push('h1'); }
  const intro = tekst(cms.intro, 2000);
  if (intro && norm(intro) !== norm(nu.intro)) { p.lead = inlineHtml(intro); gewijzigd.push('lead'); }
  const alt = regel(cms.fields?.hero?.alt ?? cms.featuredImage?.alt, 300);
  if (alt && p.hero_image && alt !== norm(nu.heroAlt)) { p.hero_image = { ...p.hero_image, alt }; gewijzigd.push('hero-alt'); }
  // Sjabloon fs.pagina: FAQ in fields.faqs; anders het eerste faq-blok.
  const bron = cms.template === 'fs.pagina' ? cms.fields?.faqs : (cms.blocks || []).find((b) => b?.type === 'faq')?.items;
  const items = !Array.isArray(bron) ? [] : bron.map((f) => ({ q: regel(f?.q, 500), a: tekst(f?.a, 5000) })).filter((f) => f.q && f.a);
  const zelfde = items.length === nu.faqs.length && items.every((f, i) => f.q === norm(nu.faqs[i].q) && norm(f.a) === norm(nu.faqs[i].a));
  if (items.length && !zelfde) {
    // Ongewijzigde vragen houden hun huidige HTML; alleen nieuwe of aangepaste worden uit Markdown opgebouwd.
    p.faqs = items.map((f) => p.faqs.find((o, i) => f.q === norm(nu.faqs[i].q) && norm(f.a) === norm(nu.faqs[i].a))
      ?? { q: esc(f.q), a: renderMarkdown(f.a).html });
    gewijzigd.push('faqs');
  }
  return gewijzigd;
}

/** Haalt gepubliceerde CMS-pagina's op en past ze toe op `pages` (in place). Geeft het aantal aangepaste pagina's. */
export async function laadCms(pages, { env = process.env, fetchFn = fetch, quiet = false } = {}) {
  const key = env.CMS_API_KEY;
  if (!key) return 0;
  const get = async (pad) => {
    const r = await fetchFn(CMS_BASE + pad, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`${pad.split('?')[0]} ${r.status}`);
    return r.json();
  };
  try {
    const site = await get('/site').catch(() => ({}));
    const defaultDescription = site?.settings?.seoDefaults?.description || '';
    const lijst = [];
    for (let offset = 0; offset < 5000; offset += 200) {
      const r = await get(`/content?type=page&limit=200&offset=${offset}`);
      const items = Array.isArray(r) ? r : r.items || r.data || [];
      lijst.push(...items);
      if (items.length < 200) break;
    }
    const byPath = new Map(pages.map((p) => [p.path, p]));
    const doel = lijst.filter((x) => typeof x?.slug === 'string' && byPath.has(`/${cmsSlug(x.slug)}/`));
    let n = 0;
    for (let i = 0; i < doel.length; i += 8) {
      await Promise.all(doel.slice(i, i + 8).map(async (x) => {
        const pad = `/${cmsSlug(x.slug)}/`;
        try {
          const g = overlay(byPath.get(pad), await get(`/content/${cmsSlug(x.slug)}?type=page`), { defaultDescription });
          if (g.length) { n++; if (!quiet) console.log(`ℹ CMS: ${pad} (${g.join(', ')})`); }
        } catch (err) { console.warn(`⚠ CMS: ${pad} niet geladen (${err.message}); lokale inhoud blijft staan.`); }
      }));
    }
    if (!quiet) console.log(`ℹ CMS: ${doel.length} gepubliceerde pagina('s) gevonden, ${n} met wijzigingen overgenomen.`);
    return n;
  } catch (err) {
    console.warn(`⚠ CMS niet bereikbaar (${err.message}); de lokale inhoud wordt gebruikt.`);
    return 0;
  }
}
