/**
 * E-E-A-T-gegevens (deskundige, bedrijfsprofielen, reviews) uit src/content/eeat.json.
 *
 * Regel: niets verzinnen. Een waarde met [VIERKANTE HAKEN] is een placeholder.
 * - Productie (`npm run build`): blokken met placeholders worden overgeslagen; er komt niets verzonnens online.
 * - Ontwikkeling (`npm run dev`, MVFS_PLACEHOLDERS=1): placeholders worden als gele gestippelde vakken getoond.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const EEAT = JSON.parse(readFileSync(join(ROOT, 'src/content/eeat.json'), 'utf8'));
export const SHOW_PLACEHOLDERS = process.env.MVFS_PLACEHOLDERS === '1';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const isPlaceholder = (v) => typeof v === 'string' && /\[[^\]]+\]/.test(v);
export const filled = (v) => typeof v === 'string' && v.trim() !== '' && !isPlaceholder(v);
const filledList = (arr) => (arr || []).filter(filled);
const phBox = (label, items) => `<div class="placeholder-box" role="note"><strong>Placeholder – alleen zichtbaar in npm run dev</strong><p>${esc(label)}</p>${items.length ? `<ul>${items.map((i) => `<li><code>${esc(i)}</code></li>`).join('')}</ul>` : ''}</div>`;

/** Alle open placeholders, als lijst "pad: waarde" (voor build/audit-meldingen). */
export function openPlaceholders(obj = EEAT, path = '') {
  const out = [];
  if (Array.isArray(obj)) obj.forEach((v, i) => out.push(...openPlaceholders(v, `${path}[${i}]`)));
  else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) if (!k.startsWith('_')) out.push(...openPlaceholders(v, path ? `${path}.${k}` : k));
  } else if (isPlaceholder(obj)) out.push(`${path}: ${obj}`);
  return out;
}

const E = EEAT.expert || {};
export const EXPERT_OK = filled(E.naam) && filled(E.functie);
export const PERSON_ID_SUFFIX = '/over-ons/#deskundige';

/** Person-schema, alleen als naam en functie echt zijn ingevuld. */
export function personSchema(domain, orgId) {
  if (!EXPERT_OK) return null;
  const sameAs = filled(E.linkedin) ? [E.linkedin] : [];
  return {
    '@type': 'Person',
    '@id': domain + PERSON_ID_SUFFIX,
    name: E.naam,
    jobTitle: E.functie,
    worksFor: { '@id': orgId },
    url: domain + '/over-ons/#deskundige',
    ...(filled(E.foto) ? { image: E.foto.startsWith('http') ? E.foto : domain + E.foto } : {}),
    ...(filledList(E.specialisaties).length ? { knowsAbout: filledList(E.specialisaties) } : {}),
    ...(filledList(E.certificaten).length ? { hasCredential: filledList(E.certificaten).map((c) => ({ '@type': 'EducationalOccupationalCredential', name: c })) } : {}),
    ...(filledList(E.lidmaatschappen).length ? { memberOf: filledList(E.lidmaatschappen).map((m) => ({ '@type': 'Organization', name: m })) } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** sameAs-profielen van het bedrijf: alleen echte URL's. */
export const ORG_SAME_AS = filledList(EEAT.bedrijf?.sameAs).filter((u) => /^https?:\/\//.test(u));

/** Sectie "Wie voert het onderzoek uit?" voor /over-ons/. Null in productie zolang de gegevens ontbreken. */
export function expertSection() {
  const base = { id: 'deskundige', h2: 'Wie voert het onderzoek uit?' };
  if (!EXPERT_OK) {
    if (!SHOW_PLACEHOLDERS) return null;
    return { ...base, answer: '', body: phBox('Vul in src/content/eeat.json de gegevens van de deskundige in. Zolang die ontbreken, staat deze sectie niet op de live site.', openPlaceholders(E, 'expert')) };
  }
  const rows = [
    ['Opleiding', filledList(E.opleiding)],
    ['Ervaring', filled(E.ervaring) ? [E.ervaring] : []],
    ['Specialisaties', filledList(E.specialisaties)],
    ['Certificaten en erkenningen', filledList(E.certificaten)],
    ['Lidmaatschappen', filledList(E.lidmaatschappen)],
  ].filter(([, v]) => v.length);
  const photo = filled(E.foto) ? `<img class="expert-photo" src="${esc(E.foto)}" alt="Portret van ${esc(E.naam)}" width="160" height="160" loading="lazy">` : '';
  const body = `<div class="expert-card">${photo}<div>
<p class="expert-name"><strong>${esc(E.naam)}</strong><br><span>${esc(E.functie)}</span></p>
${filled(E.introductie) ? `<p>${esc(E.introductie)}</p>` : ''}
${rows.length ? `<dl class="def-list">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v.map(esc).join('<br>')}</dd></div>`).join('')}</dl>` : ''}
${filled(E.linkedin) ? `<p><a href="${esc(E.linkedin)}" rel="me noopener" target="_blank">Profiel van ${esc(E.naam)} op LinkedIn</a></p>` : ''}
</div></div>`;
  return { ...base, answer: `Het onderzoek wordt uitgevoerd door ${esc(E.naam)}, ${esc(E.functie)} bij MV Funderingsscan.`, body };
}

/** Echte reviews (alleen volledig ingevulde). Geen AggregateRating-schema: eigen reviews komen daar niet voor in aanmerking. */
export function reviewsSection() {
  const real = (EEAT.reviews || []).filter((r) => filled(r.tekst) && filled(r.naam) && filled(r.bron));
  if (!real.length) {
    if (!SHOW_PLACEHOLDERS) return null;
    return { id: 'ervaringen', h2: 'Ervaringen van klanten', answer: '', body: phBox('Voeg in src/content/eeat.json alleen echte reviews toe, met toestemming en bron. Zonder echte reviews staat deze sectie niet op de live site.', []) };
  }
  const items = real.map((r) => `<figure class="review"><blockquote><p>${esc(r.tekst)}</p></blockquote><figcaption>${esc(r.naam)}${filled(r.plaats) ? `, ${esc(r.plaats)}` : ''}${filled(r.datum) ? ` · ${esc(r.datum)}` : ''} · ${filled(r.bron_url) ? `<a href="${esc(r.bron_url)}" rel="noopener" target="_blank">${esc(r.bron)}</a>` : esc(r.bron)}</figcaption></figure>`).join('');
  return { id: 'ervaringen', h2: 'Ervaringen van klanten', answer: `Hieronder staan ${real.length === 1 ? 'een echte review' : 'echte reviews'} van opdrachtgevers, met de bron waar ze zijn geplaatst.`, body: `<div class="reviews">${items}</div>` };
}

/** Regel onder kennisartikelen: wie heeft het gecontroleerd en wanneer bijgewerkt. */
export function bylineHtml(dateNl) {
  const who = EXPERT_OK
    ? `Inhoud gecontroleerd door <a href="/over-ons/#deskundige">${esc(E.naam)}</a>, ${esc(E.functie)}. `
    : (SHOW_PLACEHOLDERS ? '<span class="placeholder-inline">[Gecontroleerd door: NAAM DESKUNDIGE INVULLEN in eeat.json]</span> ' : '');
  return `<p class="byline">${who}Laatst inhoudelijk bijgewerkt: <time>${dateNl}</time>. <a href="/bronnen-en-richtlijnen/">Bronnen en werkwijze</a></p>`;
}
