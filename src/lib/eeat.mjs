/**
 * E-E-A-T-gegevens (deskundige, bedrijfsprofielen, reviews) uit src/content/eeat.json.
 *
 * Regel: niets verzinnen. Een waarde met [VIERKANTE HAKEN] is een placeholder.
 * - Productie (`npm run build`): blokken met placeholders worden overgeslagen; er komt niets verzonnens online.
 * - Ontwikkeling (`npm run dev`, MVFS_PLACEHOLDERS=1): placeholders worden als gele gestippelde vakken getoond.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
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

/**
 * Adviseurs. Bron: de medewerkers uit het beheerportaal (zie setMedewerkers, aangeroepen door de build),
 * anders eeat.json → "experts". Alleen wie naam en functie echt ingevuld heeft, telt mee.
 */
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let ALL = EEAT.experts || (EEAT.expert ? [EEAT.expert] : []);
const maak = (lijst) => lijst.filter((e) => filled(e.naam) && filled(e.functie)).map((e) => ({ ...e, slug: slug(e.naam) }));
export let EXPERTS = maak(ALL);
export let EXPERT_OK = EXPERTS.length > 0;
/** Vervangt de adviseurs door de medewerkers uit het portaal: [{ naam, functie, introductie, foto }]. */
export function setMedewerkers(lijst) {
  ALL = lijst;
  EXPERTS = maak(lijst);
  EXPERT_OK = EXPERTS.length > 0;
}
export const PERSON_ID_SUFFIX = '/over-ons/#deskundige';
const personId = (domain, e) => `${domain}/over-ons/#${e.slug}`;

const naamLijst = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`);

/** Person-schema per adviseur, alleen als naam en functie echt zijn ingevuld. */
export function personSchemas(domain, orgId) {
  return EXPERTS.map((E) => {
    const sameAs = filled(E.linkedin) ? [E.linkedin] : [];
    return {
      '@type': 'Person',
      '@id': personId(domain, E),
      name: E.naam,
      jobTitle: E.functie,
      worksFor: { '@id': orgId },
      url: personId(domain, E),
      ...(filled(E.foto) ? { image: E.foto } : {}),
      ...(filledList(E.specialisaties).length ? { knowsAbout: filledList(E.specialisaties) } : {}),
      ...(filledList(E.certificaten).length ? { hasCredential: filledList(E.certificaten).map((c) => ({ '@type': 'EducationalOccupationalCredential', name: c })) } : {}),
      ...(filledList(E.lidmaatschappen).length ? { memberOf: filledList(E.lidmaatschappen).map((m) => ({ '@type': 'Organization', name: m })) } : {}),
      ...(sameAs.length ? { sameAs } : {}),
    };
  });
}

/** sameAs-profielen van het bedrijf: alleen echte URL's. */
export const ORG_SAME_AS = filledList(EEAT.bedrijf?.sameAs).filter((u) => /^https?:\/\//.test(u));

/** Sectie "Wie voert het onderzoek uit?" voor /over-ons/. Null in productie zolang de gegevens ontbreken. */
export function expertSection() {
  const base = { id: 'deskundige', h2: 'Wie voert het onderzoek uit?' };
  if (!EXPERT_OK) {
    if (!SHOW_PLACEHOLDERS) return null;
    return { ...base, answer: '', body: phBox('Vul in src/content/eeat.json de gegevens van de adviseurs in. Zolang die ontbreken, staat deze sectie niet op de live site.', openPlaceholders(ALL, 'experts')) };
  }
  const card = (E) => {
    const rows = [
      ['Opleiding', filledList(E.opleiding)],
      ['Ervaring', filled(E.ervaring) ? [E.ervaring] : []],
      ['Specialisaties', filledList(E.specialisaties)],
      ['Certificaten en erkenningen', filledList(E.certificaten)],
      ['Lidmaatschappen', filledList(E.lidmaatschappen)],
    ].filter(([, v]) => v.length);
    const initialen = E.naam.split(/\s+/).filter(Boolean).map((w) => w[0]).filter((c) => /[A-Z]/.test(c)).slice(0, 2).join('');
    const open = SHOW_PLACEHOLDERS ? openPlaceholders(E) : [];
    return `<div class="expert-card" id="${E.slug}"><span class="expert-avatar" aria-hidden="true">${esc(initialen)}${filled(E.foto) ? `<img class="expert-photo" src="${esc(E.foto)}" alt="" width="120" height="120" loading="lazy" decoding="async">` : ''}</span><div>
<p class="expert-name"><strong>${esc(E.naam)}</strong><br><span>${esc(E.functie)}</span></p>
${filled(E.introductie) ? `<p>${esc(E.introductie)}</p>` : ''}
${rows.length ? `<dl class="def-list">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v.map(esc).join('<br>')}</dd></div>`).join('')}</dl>` : ''}
${filled(E.linkedin) ? `<p><a href="${esc(E.linkedin)}" rel="me noopener" target="_blank">Profiel van ${esc(E.naam)} op LinkedIn</a></p>` : ''}
${open.length ? phBox(`Nog in te vullen voor ${E.naam} (optioneel):`, open) : ''}
</div></div>`;
  };
  const wie = naamLijst(EXPERTS.map((E) => esc(E.naam)));
  const functies = [...new Set(EXPERTS.map((E) => E.functie.toLowerCase()))];
  const answer = EXPERTS.length === 1
    ? `Het onderzoek wordt uitgevoerd door ${wie}, ${esc(functies[0])} bij MV Funderingsscan.`
    : `Het onderzoek wordt uitgevoerd door ${wie}${functies.length === 1 ? `, ${esc(functies[0].replace(/adviseur$/, 'adviseurs'))}` : ''} bij MV Funderingsscan.`;
  return { ...base, answer, body: `<div class="expert-list">${EXPERTS.map(card).join('')}</div>` };
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

/**
 * Geanonimiseerd voorbeeldrapport (pdf), pad of URL in eeat.json → "rapportvoorbeeld".
 * Een lokaal pad (bijv. /assets/voorbeeldrapport.pdf) moet in public/ bestaan, anders stopt de build:
 * zo staat er nooit een kapotte downloadlink online.
 */
export const RAPPORTVOORBEELD = (() => {
  const v = EEAT.rapportvoorbeeld;
  if (!filled(v)) return null;
  if (/^https:\/\//.test(v)) return { href: v, size: '' };
  if (!/^\/[\w/.-]+\.pdf$/i.test(v)) throw new Error(`eeat.json rapportvoorbeeld: gebruik een pad als /assets/voorbeeldrapport.pdf of een https-URL (nu: ${v})`);
  const file = join(ROOT, 'public', v);
  if (!existsSync(file)) throw new Error(`eeat.json rapportvoorbeeld: ${v} bestaat niet. Zet de pdf in public${v}.`);
  const mb = statSync(file).size / 1048576;
  return { href: v, size: mb < 1 ? `${Math.max(1, Math.round(mb * 1024))} kB` : `${mb.toFixed(1).replace('.', ',')} MB` };
})();

const RV_ANSWER = 'Wil je zien wat je krijgt? Bekijk een geanonimiseerd rapport van MV Funderingsscan. Namen, adres en andere gegevens waaraan de woning of de opdrachtgever te herkennen is, zijn weggelaten.';
const rvButton = () => `<a class="btn btn-navy" href="${esc(RAPPORTVOORBEELD.href)}" target="_blank" rel="noopener" type="application/pdf">Voorbeeldrapport openen <span class="rv-meta">(pdf${RAPPORTVOORBEELD.size ? `, ${RAPPORTVOORBEELD.size}` : ''})</span></a>`;
const RV_NOTE = '<p class="rv-note">Elke woning is anders. De bevindingen en het advies in dit voorbeeld gelden alleen voor die ene woning.</p>';

/** Sectie "Bekijk een voorbeeldrapport" voor rapportpagina's. Null in productie zolang er geen pdf is. */
export function rapportvoorbeeldSection() {
  const base = { id: 'voorbeeldrapport', h2: 'Bekijk een voorbeeldrapport' };
  if (!RAPPORTVOORBEELD) {
    if (!SHOW_PLACEHOLDERS) return null;
    return { ...base, answer: '', body: phBox('Zet een geanonimiseerd rapport (pdf) in public/assets/ en vul het pad in bij "rapportvoorbeeld" in src/content/eeat.json. Zolang dat ontbreekt, staat deze sectie niet op de live site.', []) };
  }
  return { ...base, answer: RV_ANSWER, body: `<div class="rv-card"><span class="rv-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg></span><div>${rvButton()}${RV_NOTE}</div></div>` };
}

/** Blok voor het kennisbank-overzicht. Leeg in productie zolang er geen pdf is. */
export function rapportvoorbeeldCard() {
  const s = rapportvoorbeeldSection();
  if (!s) return '';
  if (!RAPPORTVOORBEELD) return `<div class="kb-guides reveal">${s.body}</div>`;
  return `<div class="kb-guides kb-rapport reveal">
      <p class="facts-title">Voorbeeldrapport</p>
      <p>${RV_ANSWER}</p>
      ${rvButton()}
      ${RV_NOTE}
    </div>`;
}

/** Regel onder kennisartikelen: wie het onderzoek doen en wanneer bijgewerkt. */
export function bylineHtml(dateNl) {
  const who = EXPERT_OK
    ? `Funderingsonderzoek door ${naamLijst(EXPERTS.map((E) => `<a href="/over-ons/#${E.slug}">${esc(E.naam)}</a>`))}${EXPERTS.length > 1 && new Set(EXPERTS.map((E) => E.functie)).size === 1 ? `, ${esc(EXPERTS[0].functie.toLowerCase().replace(/adviseur$/, 'adviseurs'))}` : EXPERTS.length === 1 ? `, ${esc(EXPERTS[0].functie.toLowerCase())}` : ''}. `
    : (SHOW_PLACEHOLDERS ? '<span class="placeholder-inline">[ADVISEURS INVULLEN in eeat.json]</span> ' : '');
  return `<p class="byline">${who}Laatst inhoudelijk bijgewerkt: <time>${dateNl}</time>. <a href="/bronnen-en-richtlijnen/">Bronnen en werkwijze</a></p>`;
}
