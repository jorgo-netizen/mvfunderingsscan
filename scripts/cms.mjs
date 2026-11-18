/**
 * Koppeling met het centrale Midea Vastgoed CMS (mideavastgoed.app/marketing).
 *
 * Bij de build haalt de site de GEPUBLICEERDE pagina's op en neemt per bestaande pagina deze velden over:
 * fase 1: SEO-title, meta description, H1, intro (lead), ALT van de hero-afbeelding en de FAQ's;
 * fase 2 (sjabloon fs.pagina): eyebrow, kruimelpad, diensten, secties (kop, kort antwoord, tekst) en "Verder lezen".
 * - Een veld wordt alleen overgenomen als het in het CMS echt anders is dan de huidige inhoud
 *   (vergeleken in CMS-vorm), dus ongewijzigde velden blijven byte-voor-byte gelijk.
 * - Layout, facts/prijzen, widgets, sectie-id's (ankers), URL's, redirects en structured data blijven uit de site zelf komen.
 * - Geen CMS_API_KEY, API onbereikbaar of fout antwoord: de lokale JSON blijft de bron; de build faalt nooit.
 * De sleutel staat alleen als env CMS_API_KEY in Vercel (server-side bij de build), nooit in code of output.
 */
import { renderMarkdown, slugify } from '../api/_lib/markdown.js';
import { htmlNaarMarkdown } from '../api/_lib/redactie.js';

export const CMS_BASE = 'https://www.mideavastgoed.app/api/cms/v1/funderingsscan'; // met www: de kale domeinnaam stuurt door en dan valt de Authorization-header weg
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
      ?? { q: f.q, a: renderMarkdown(f.a).html }); // q wordt bij het renderen ge-escaped
    gewijzigd.push('faqs');
  }
  if (cms.template === 'fs.pagina' && cms.fields) fase2(p, cms.fields, gewijzigd);
  return gewijzigd;
}

// HTML uit het CMS is daar al gesaneerd; dit is een tweede slot: nooit scripts, event-handlers of javascript:-links.
const veilig = (h) => typeof h === 'string' && h.length <= 60000 && !/<\/?(script|iframe|object|embed|style)\b|\son[a-z]+\s*=|javascript:/i.test(h);
const intern = (href) => typeof href === 'string' && /^\/[\w\-./#]*$/.test(href);
const json = (x) => JSON.stringify(x);

function fase2(p, f, gewijzigd) {
  const eb = regel(f.eyebrow, 200);
  if (eb && veilig(eb) && eb !== norm(p.eyebrow)) { p.eyebrow = eb; gewijzigd.push('eyebrow'); }
  if (Array.isArray(f.crumbs) && f.crumbs.length && f.crumbs.every((c) => intern(c?.href) && regel(c?.name, 120))) {
    const c = f.crumbs.map((x) => ({ href: x.href, name: norm(x.name) }));
    if (json(c) !== json(p.crumbs.map((x) => ({ href: x.href, name: norm(x.name) })))) { p.crumbs = c; gewijzigd.push('crumbs'); }
  }
  if (Array.isArray(f.services) && f.services.every((x) => ['funderingsscan', 'fase0', 'fase1'].includes(x)) && json(f.services) !== json(p.services || [])) {
    p.services = [...new Set(f.services)]; gewijzigd.push('services');
  }
  if (Array.isArray(f.related) && f.related.every((x) => intern(x?.href) && veilig(x.label) && veilig(x.text ?? ''))) {
    const rel = f.related.map((x) => ({ href: x.href, label: x.label, text: x.text ?? '' }));
    if (json(rel.map((x) => [x.href, norm(x.label), norm(x.text)])) !== json((p.related || []).map((x) => [x.href, norm(x.label), norm(x.text)]))) { p.related = rel; gewijzigd.push('related'); }
  }
  if (Array.isArray(f.sections) && f.sections.length) {
    const oud = new Map(p.sections.map((x) => [x.id, x])); const ids = new Set(); const nieuw = [];
    for (const x of f.sections) {
      const h2 = tekst(x?.h2, 300); const answer = typeof x?.answer === 'string' ? x.answer.trim() : ''; const body = typeof x?.body === 'string' ? x.body : '';
      if (!h2 || ![h2, answer, body].every(veilig)) return console.warn(`⚠ CMS: ${p.path} secties niet overgenomen (ongeldige of onveilige inhoud).`);
      const o = typeof x.id === 'string' ? oud.get(x.id) : undefined;
      // id = anker van interne links: bestaande blijven, een nieuwe sectie krijgt er een uit de kop.
      let id = o?.id || (typeof x.id === 'string' && /^[a-z0-9-]{1,80}$/.test(x.id) ? x.id : slugify(h2.replace(/<[^>]+>/g, '')).slice(0, 60) || 'sectie');
      for (let n = 2; ids.has(id); n++) id = `${id.replace(/-\d+$/, '')}-${n}`;
      ids.add(id);
      const s = o ? { ...o } : { id, h2, answer, body };
      if (o && norm(h2) !== norm(o.h2)) s.h2 = h2;
      if (o && norm(answer) !== norm(o.answer)) s.answer = answer;
      if (o && norm(body) !== norm(o.body)) s.body = body;
      nieuw.push(s);
    }
    if (json(nieuw) !== json(p.sections)) { p.sections = nieuw; gewijzigd.push('sections'); }
  }
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
