/**
 * AI-redactie: gedeelde regels voor de portaal-API, de bot-API en de bot op de pc.
 *
 * Kernregel: de redactie maakt alleen CONCEPTEN. Niets in deze module of in de bot zet iets op "gepubliceerd".
 * Goedkeuren (portaal) zet een concept over naar Nieuws als concept; publiceren blijft een aparte handeling
 * van een ingelogde medewerker in Nieuws.
 */
import { slugify, plainText } from './markdown.js';

export const TYPES = ['nieuws', 'weetje', 'kennis', 'zelftest', 'regionaal', 'praktijk'];
export const TYPE_LABELS = { nieuws: 'Nieuws', weetje: 'Wist je dat', kennis: 'Kennisartikel', zelftest: 'Zelftest', regionaal: 'Regionaal', praktijk: 'Praktijkvoorbeeld (fictief)' };
export const CONCEPT_STATUSSEN = ['concept', 'afgekeurd', 'goedgekeurd', 'overgezet'];

/** Standaardinstellingen; in het portaal aan te passen (tabel mvfs_redactie_instellingen). */
export const STANDAARD = {
  actief: true,
  model: 'qwen2.5:14b',
  ollama_url: 'http://localhost:11434',
  taalcontrole: true, // LanguageTool (openbare API): alleen de concepttekst gaat erheen, geen persoonsgegevens
  min_relevantie: 55,
  bewaar_dagen: 60, // niet-gebruikte nieuwsitems worden daarna opgeruimd
  // aantal concepten per periode (week of maand); 0 = uit
  // maximum aantal nieuwe concepten per periode (week of maand); 0 = uit
  frequentie: { nieuws: { aantal: 4, per: 'week' }, weetje: { aantal: 3, per: 'week' }, kennis: { aantal: 1, per: 'week' }, zelftest: { aantal: 1, per: 'maand' }, regionaal: { aantal: 2, per: 'week' }, praktijk: { aantal: 0, per: 'maand' } },
  // voorraad: zoveel concepten per soort moeten klaarstaan om na te lezen; de bot vult elke run aan (binnen het maximum hierboven)
  voorraad: { nieuws: 4, weetje: 4, kennis: 2, zelftest: 1, regionaal: 2, praktijk: 0 },
  per_run: 4, // maximaal aantal nieuwe concepten per run
  // onderwerpen voor weetjes, kennisartikelen, zelftests en praktijkvoorbeelden (de bot slaat onderwerpen over die al bestaan)
  onderwerpen: {
    weetje: ['Waarom houten funderingspalen onder water blijven zitten', 'Wat negatieve kleef met paalfunderingen doet', 'Het verschil tussen zetting en bodemdaling', 'Waarom scheuren in gevels vaak schuin lopen', 'Wat een lintvoeg vertelt over zakking', 'Waarom droge zomers funderingen kunnen raken', 'Wat een kruipruimte zegt over de fundering', 'Waarom woningen van vóór 1970 extra aandacht krijgen', 'Wat inklinking van veen betekent', 'Waarom bomen dicht bij huis invloed kunnen hebben'],
    kennis: ['Funderingsonderzoek fase 0 en fase 1 naast elkaar', 'Houten paalfunderingen: opbouw, risico\'s en onderzoek', 'Fundering op staal: hoe het werkt en waar het misgaat', 'Grondwater en funderingen in Noord-Nederland', 'Scheurvorming herkennen en vastleggen', 'De funderingsrisicoklasse in het taxatierapport'],
    zelftest: ['Heeft mijn woning mogelijk funderingsproblemen?', 'Herken jij signalen van funderingsschade?', 'Hoeveel weet jij over houten paalfunderingen?', 'Wat weet jij over funderingsrisicoklassen?', 'Is mijn woning mogelijk gevoelig voor funderingsproblemen?'],
    praktijk: ['Fictief voorbeeld: scheuren bij een jaren-dertigwoning vóór de aankoop', 'Fictief voorbeeld: een lintvoegmeting bij een hoekwoning'],
  },
};
export const instellingen = (opgeslagen = {}) => {
  const s = { ...STANDAARD, ...opgeslagen };
  s.frequentie = { ...STANDAARD.frequentie, ...(opgeslagen.frequentie || {}) };
  s.voorraad = { ...STANDAARD.voorraad, ...(opgeslagen.voorraad || {}) };
  s.onderwerpen = { ...STANDAARD.onderwerpen, ...(opgeslagen.onderwerpen || {}) };
  return s;
};

/** Beeldbank: alleen echte foto's van de eigen site. De bot kiest; een medewerker kan vervangen. */
export const BEELDBANK = [
  { naam: 'funderingsinspectie-woning-gevel', alt: 'Inspectie van de gevel van een woning tijdens funderingsonderzoek', thema: ['inspectie', 'onderzoek', 'quickscan', 'fase', 'gevel', 'scheur', 'kennis'] },
  { naam: 'funderingsmeting-laser-tablet', alt: 'Meting met lasermeetapparatuur en een tablet in een woning', thema: ['meting', 'meten', 'lintvoeg', 'vloer', 'scheefstand', 'fase 1', 'zakking'] },
  { naam: 'jaren-dertig-woningen-straat', alt: 'Rij jaren-dertigwoningen met bakstenen gevels', thema: ['woning', 'aankoop', 'verkoop', 'taxatie', 'woningmarkt', 'paal', 'houten', 'regio', 'gemeente'] },
  { naam: 'metselwerk-gevel-detail', alt: 'Close-up van metselwerk en voegen in een bakstenen gevel', thema: ['scheur', 'metselwerk', 'gevel', 'voeg', 'schade'] },
  { naam: 'vooroorlogse-woning-voordeur', alt: 'Voordeur in een vooroorlogse bakstenen gevel', thema: ['oud', 'vooroorlogs', 'eigenaar', 'droogte', 'grondwater', 'bodem'] },
];
export function kiesAfbeelding(tekst) {
  const t = String(tekst || '').toLowerCase();
  let best = BEELDBANK[0]; let score = -1;
  for (const b of BEELDBANK) { const sc = b.thema.filter((w) => t.includes(w)).length; if (sc > score) { best = b; score = sc; } }
  return best;
}

// ---------------------------------------------------------------- invoer opschonen (bot én portaal)
const str = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').trim().slice(0, max);
const httpsUrl = (u) => { try { const x = new URL(String(u)); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href.slice(0, 1000) : ''; } catch { return ''; } };
const lijst = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);

/** Eigen foto bij een concept: "upload:<pad in de bucket nieuws>" (alleen via het beheerportaal te zetten). */
export const UPLOAD_PREFIX = 'upload:';
export const isUpload = (a) => typeof a === 'string' && /^upload:redactie\/\d{4}\/[A-Za-z0-9_-]{8,40}\.jpg$/.test(a);

/** Maakt een concept veilig: alleen bekende velden, beperkte lengtes. Status en beoordeling komen NOOIT uit de invoer. */
export function schoonConcept(input = {}) {
  const type = TYPES.includes(input.type) ? input.type : 'nieuws';
  const titel = str(input.titel, 140);
  const c = {
    type, titel,
    slug: slugify(str(input.slug, 90) || titel).slice(0, 90),
    seo_titel: str(input.seo_titel, 80), meta_description: str(input.meta_description, 170),
    hoofdzoekwoord: str(input.hoofdzoekwoord, 80),
    zoekwoorden: lijst(input.zoekwoorden, 12).map((z) => str(z, 60)).filter(Boolean),
    intro: str(input.intro, 600), inhoud: str(input.inhoud, 60000),
    faqs: lijst(input.faqs, 10).map((f) => ({ vraag: str(f?.vraag, 200), antwoord: str(f?.antwoord, 1200) })).filter((f) => f.vraag && f.antwoord),
    bronnen: lijst(input.bronnen, 12).map((b) => ({ titel: str(b?.titel, 200), url: httpsUrl(b?.url), uitgever: str(b?.uitgever, 120), datum: str(b?.datum, 30) })).filter((b) => b.titel && b.url),
    interne_links: lijst(input.interne_links, 12).map((l) => ({ url: str(l?.url, 200), tekst: str(l?.tekst, 120) })).filter((l) => /^\/[a-z0-9\-/]*$/.test(l.url) && l.tekst),
    afbeelding: BEELDBANK.some((b) => b.naam === input.afbeelding) ? input.afbeelding : '',
    afbeelding_alt: str(input.afbeelding_alt, 200),
    onderwerp: str(input.onderwerp, 160),
    model: str(input.model, 80),
    controle: input.controle && typeof input.controle === 'object' && JSON.stringify(input.controle).length <= 20000 ? JSON.parse(JSON.stringify(input.controle)) : {},
    item_ids: lijst(input.item_ids, 10).filter((x) => typeof x === 'string' && /^[0-9a-f-]{36}$/.test(x)),
    zelftest: type === 'zelftest' ? schoonZelftest(input.zelftest) : null,
  };
  return c;
}

export function schoonZelftest(z) {
  if (!z || typeof z !== 'object') return null;
  const vragen = lijst(z.vragen, 15).map((v) => ({
    vraag: str(v?.vraag, 250),
    opties: lijst(v?.opties, 5).map((o) => ({ tekst: str(o?.tekst, 160), punten: Math.max(0, Math.min(3, parseInt(o?.punten, 10) || 0)) })).filter((o) => o.tekst),
    uitleg: str(v?.uitleg, 600),
  })).filter((v) => v.vraag && v.opties.length >= 2);
  const uitslagen = lijst(z.uitslagen, 5).map((u) => ({ min: parseInt(u?.min, 10) || 0, max: parseInt(u?.max, 10) || 0, titel: str(u?.titel, 120), tekst: str(u?.tekst, 800) })).filter((u) => u.titel && u.tekst);
  return { vragen, uitslagen, disclaimer: str(z.disclaimer, 400) || 'Deze zelftest is een hulpmiddel en geen funderingsonderzoek. De uitkomst zegt niets zeker over je woning en stelt geen risicoklasse vast.' };
}

// ---------------------------------------------------------------- kwaliteitscontrole (deterministisch)
const TOEGESTANE_BEDRAGEN = new Set(['350', '950']);
const RISICOVOL = [
  [/\bgarant(ie|eren|eert|eerd)\b/i, 'Bevat een garantie-claim.'],
  [/\b(gecertificeerd|certificering|erkend|keurmerk)\b/i, 'Noemt een certificering of erkenning; die mag alleen als hij aantoonbaar klopt.'],
  [/\b100\s?%/i, 'Bevat "100%"; vermijd absolute claims.'],
  [/\b(altijd veilig|geen enkel risico|zeker weten|nooit problemen)\b/i, 'Bevat een absolute zekerheid.'],
  [/\b(nummer 1|de beste|marktleider)\b/i, 'Bevat een superlatief over het bedrijf.'],
  [/\[CONTROLEREN[^\]]*\]/, 'De schrijver heeft passages gemarkeerd met [CONTROLEREN].'],
];
const MIN_WOORDEN = { nieuws: 300, weetje: 150, kennis: 700, regionaal: 300, praktijk: 300, zelftest: 0 };
const woorden = (t) => (plainText(t).match(/\S+/g) || []).length;
const tokens = (t) => new Set(String(t).toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 3));
export function lijkenOp(a, b) {
  const A = tokens(a); const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}

/**
 * Controleert een concept. Geeft { fouten, waarschuwingen, seo, geo, woorden } terug.
 * fouten: moeten opgelost of bewust geaccepteerd worden voor goedkeuren; waarschuwingen: menselijk nakijken.
 * interneUrls: Set met bestaande paden van de site; bekend: [{titel, url}] van bestaande pagina's en concepten;
 * bronTekst: tekst van de gebruikte bronnen (om getallen te controleren).
 */
export function controleer(c, { interneUrls = null, bekend = [], bronTekst = '' } = {}) {
  const fouten = []; const waarschuwingen = []; const seo = []; const geo = [];
  const tekst = [c.titel, c.intro, c.inhoud, ...(c.faqs || []).flatMap((f) => [f.vraag, f.antwoord])].join('\n');
  const n = woorden([c.intro, c.inhoud].join('\n'));

  if (c.type !== 'zelftest' && n < (MIN_WOORDEN[c.type] || 0)) fouten.push(`Te kort: ${n} woorden (minimaal ${MIN_WOORDEN[c.type]} voor dit soort artikel).`);
  if (['nieuws', 'regionaal'].includes(c.type) && !(c.bronnen || []).length) fouten.push('Geen bron: een nieuwsartikel moet minimaal één bron met link hebben.');
  for (const m of tekst.matchAll(/€\s?(\d{1,3}(?:\.\d{3})*)/g)) if (!TOEGESTANE_BEDRAGEN.has(m[1])) fouten.push(`Bedrag €${m[1]} staat niet in de prijzen van MV Funderingsscan (alleen €350 en €950). Controleer of het uit een bron komt.`);
  for (const [re, melding] of RISICOVOL) if (re.test(tekst)) waarschuwingen.push(melding);
  if (c.type === 'praktijk' && !/fictief/i.test(`${c.titel} ${c.intro}`)) fouten.push('Een praktijkvoorbeeld moet in titel of introductie duidelijk "fictief" heten.');
  if (c.type === 'zelftest') {
    const z = c.zelftest || {};
    if ((z.vragen || []).length < 5) fouten.push('Een zelftest heeft minimaal 5 vragen nodig.');
    if ((z.uitslagen || []).length < 2) fouten.push('Een zelftest heeft minimaal 2 uitslagen nodig.');
    if ((z.vragen || []).some((v) => !v.uitleg)) waarschuwingen.push('Niet elke vraag heeft een uitleg.');
    if (/risicoklasse\s+[A-E]\b/i.test(JSON.stringify(z.uitslagen || []))) fouten.push('Een uitslag noemt een risicoklasse; een zelftest mag geen risicoklasse vaststellen.');
  }

  // interne links
  if (interneUrls) {
    const gebruikt = [...String(c.inhoud).matchAll(/\]\((\/[^)\s#]*)/g)].map((m) => m[1]).concat((c.interne_links || []).map((l) => l.url));
    for (const u of new Set(gebruikt)) if (!interneUrls.has(u)) fouten.push(`Interne link naar een pagina die niet bestaat: ${u}`);
    if (c.type !== 'zelftest' && new Set(gebruikt).size < 2) seo.push('Minder dan 2 interne links naar bestaande pagina\'s.');
  }
  // getallen die niet in de bron staan (alleen bij nieuws)
  if (['nieuws', 'regionaal'].includes(c.type) && bronTekst) {
    const inBron = new Set((String(bronTekst).match(/\d+(?:[.,]\d+)?/g) || []));
    const nieuw = [...new Set((plainText(c.inhoud).match(/\b\d{2,}(?:[.,]\d+)?\b/g) || []))].filter((g) => !inBron.has(g) && !/^(19|20)\d\d$/.test(g) && !TOEGESTANE_BEDRAGEN.has(g));
    if (nieuw.length) waarschuwingen.push(`Getallen die niet in de bron voorkomen: ${nieuw.slice(0, 8).join(', ')}. Controleer ze.`);
  }
  // dubbele content
  for (const b of bekend) {
    const sc = lijkenOp(c.titel, b.titel);
    if (sc >= 0.75) waarschuwingen.push(`Lijkt sterk op bestaande inhoud: "${b.titel}"${b.url ? ` (${b.url})` : ''}.`);
  }
  // SEO
  if (!c.seo_titel) seo.push('SEO-titel ontbreekt.'); else if (c.seo_titel.length > 60) seo.push(`SEO-titel is ${c.seo_titel.length} tekens (liefst maximaal 60).`);
  if (c.meta_description.length < 120 || c.meta_description.length > 160) seo.push(`Meta description is ${c.meta_description.length} tekens (liefst 120–160).`);
  if (!c.hoofdzoekwoord) seo.push('Hoofdzoekwoord ontbreekt.');
  else if (!`${c.titel} ${c.intro}`.toLowerCase().includes(c.hoofdzoekwoord.toLowerCase())) seo.push('Het hoofdzoekwoord staat niet in de titel of de introductie.');
  if (!c.afbeelding) seo.push('Geen afbeelding gekozen.');
  // GEO: direct antwoord, structuur, FAQ, bronnen
  const introW = woorden(c.intro);
  if (c.type !== 'zelftest') {
    if (introW < 25 || introW > 90) geo.push(`De introductie is ${introW} woorden; een direct antwoord van 25–90 woorden werkt het best.`);
    if ((String(c.inhoud).match(/^##\s/gm) || []).length < 2) geo.push('Minder dan 2 tussenkoppen (##).');
    if ((c.faqs || []).length < 3) geo.push('Minder dan 3 veelgestelde vragen.');
    if (!['nieuws', 'regionaal'].includes(c.type) && !(c.bronnen || []).length) geo.push('Geen externe bron; een betrouwbare bron versterkt het artikel.');
  }
  // leesbaarheid
  const zinnen = plainText(c.inhoud).split(/(?<=[.!?])\s+/).filter((z) => z.split(/\s+/).length > 2);
  const gem = zinnen.length ? zinnen.reduce((a, z) => a + z.split(/\s+/).length, 0) / zinnen.length : 0;
  if (gem > 22) waarschuwingen.push(`Gemiddeld ${Math.round(gem)} woorden per zin; maak zinnen korter (liefst onder 20).`);
  return { fouten, waarschuwingen, seo, geo, woorden: n, gecontroleerd_op: new Date().toISOString() };
}

// ---------------------------------------------------------------- van concept naar nieuwsbericht (Markdown)
const CTA = 'Twijfel je over de fundering van een woning in Friesland, Groningen of Noord-Drenthe? Met een [Quick Scan (fase 0)](/fase-0-funderingsonderzoek/) krijg je een onafhankelijk beeld. [Vraag een funderingsscan aan](/funderingsscan-aanvragen/) of bekijk eerst [wat het kost](/prijzen/).';

/** Bouwt de Markdown voor mvfs_news uit een concept: tekst, uitgelicht blok, FAQ, bronnen, lees ook en CTA. */
/** Zelftest als leesbare tekst in een nieuwsbericht: vragen met punten, daarna wat je score betekent. */
export function zelftestMarkdown(z) {
  if (!z || !(z.vragen || []).length) return '';
  const pt = (n) => `${n} ${n === 1 ? 'punt' : 'punten'}`;
  const vragen = z.vragen.map((v, i) => [`### ${i + 1}. ${v.vraag}`, v.opties.map((o) => `- ${o.tekst} (**${pt(o.punten)}**)`).join('\n'), v.uitleg ? `*Uitleg:* ${v.uitleg}` : ''].filter(Boolean).join('\n\n'));
  const uitslagen = (z.uitslagen || []).map((u) => `### ${u.min}–${u.max} punten: ${u.titel}\n\n${u.tekst}`);
  return ['## Doe de zelftest', 'Kies bij elke vraag het antwoord dat het best bij je woning past. Na de laatste vraag zie je je uitslag.', ...vragen,
    uitslagen.length ? ['## Wat betekent je score?', ...uitslagen].join('\n\n') : '', `> ${z.disclaimer}`].filter(Boolean).join('\n\n');
}

export function naarNieuwsMarkdown(c) {
  const delen = [];
  if (c.type === 'praktijk') delen.push('> **Fictief voorbeeld:** dit is een verzonnen situatie ter uitleg, geen echte klantcase.');
  delen.push(String(c.inhoud || '').trim());
  if (c.type === 'zelftest') delen.push(zelftestMarkdown(c.zelftest));
  if ((c.faqs || []).length) delen.push(['## Veelgestelde vragen', ...c.faqs.map((f) => `### ${f.vraag}\n\n${f.antwoord}`)].join('\n\n'));
  const links = (c.interne_links || []).filter((l) => !String(c.inhoud).includes(`](${l.url})`));
  if (links.length) delen.push(['## Lees ook', ...links.map((l) => `- [${l.tekst}](${l.url})`)].join('\n'));
  if ((c.bronnen || []).length) delen.push(['## Bronnen', ...c.bronnen.map((b) => `- [${b.titel}](${b.url})${[b.uitgever, b.datum].filter(Boolean).length ? ` – ${[b.uitgever, b.datum].filter(Boolean).join(', ')}` : ''}`)].join('\n'));
  delen.push(CTA);
  return delen.filter(Boolean).join('\n\n');
}

/** Gegevens voor de nieuwsrij (altijd status "concept"). */
export function naarNieuwsRij(c) {
  const excerpt = (c.intro || plainText(c.inhoud).slice(0, 380)).slice(0, 400);
  return {
    title: c.titel.slice(0, 140),
    slug: slugify(c.slug || c.titel).slice(0, 90),
    excerpt,
    meta_description: (c.meta_description || excerpt).slice(0, 170),
    content: naarNieuwsMarkdown(c).slice(0, 60000),
    featured_image_alt: (c.afbeelding_alt || BEELDBANK.find((b) => b.naam === c.afbeelding)?.alt || '').slice(0, 200),
    show_author: false,
    status: 'concept',
  };
}
