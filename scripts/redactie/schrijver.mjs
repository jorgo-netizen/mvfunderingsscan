/**
 * De schrijver: maakt met het lokale model een concept per soort artikel, laat het daarna nakijken
 * (eindredactie + taalcontrole) en geeft een concept terug dat het portaal kan opslaan.
 * Bronnen en interne links worden door de code gezet, niet door het model: zo kan het model geen links verzinnen.
 */
import { readFileSync } from 'node:fs';
import { vraagJson } from './ollama.mjs';
import { schoonConcept, controleer, kiesAfbeelding, lijkenOp, TYPE_LABELS } from '../../api/_lib/redactie.js';

const ROOT = new URL('../../', import.meta.url);
const SITE = JSON.parse(readFileSync(new URL('src/content/site.json', ROOT), 'utf8'));
const URLS = JSON.parse(readFileSync(new URL('src/content/urls.json', ROOT), 'utf8'));
export const PAGINAS = URLS.map((u) => ({ url: u.path, titel: u.label, keyword: u.keyword || '' })).concat([{ url: '/nieuws/', titel: 'Nieuws', keyword: 'nieuws fundering' }]);
export const INTERNE_URLS = new Set(PAGINAS.map((p) => p.url));

// ---------------------------------------------------------------- vaste kennis over het bedrijf (alleen wat op de site staat)
const NAP = SITE.nap || {};
export const BEDRIJF = `Over MV Funderingsscan (gebruik alleen deze feiten over het bedrijf, verzin niets):
- MV Funderingsscan B.V. in Leeuwarden doet onafhankelijk funderingsonderzoek aan woningen in Friesland, Groningen en Noord-Drenthe (gemeenten Assen, Tynaarlo, Noordenveld en Aa en Hunze).
- Diensten: Quick Scan (fase 0) en fase 1 funderingsonderzoek met metingen (lintvoegwaterpassing, loodmeting, vloerveldwaterpassing). Beide voeren we zelf uit. We doen geen funderingsherstel.
- Een Quick Scan (fase 0) is een vooronderzoek: archief- en bodemonderzoek, visuele inspectie (kruipruimte voor zover toegankelijk) en een risico-inschatting met advies. Zonder graafwerk. Het is géén uitgebreid funderingsonderzoek en stelt de staat van de palen niet vast.
- Prijzen: fase 0 vanaf €350, fase 1 vanaf €950, beide inclusief btw. Noem geen andere bedragen van MV Funderingsscan.
- Na een aanvraag bellen we dezelfde dag terug. Het rapport volgt binnen 2 werkdagen na de opname.
- Contact: ${NAP.phone_display || '+31 (0) 582037172'}, ${NAP.email || 'info@mideavastgoed.nl'}.
- Noem geen certificeringen, erkenningen, garanties, keurmerken of samenwerkingen.`;

const REGELS = `Schrijfregels:
- Schrijf in correct, natuurlijk Nederlands en spreek de lezer aan met "je". Deskundig, toegankelijk, niet commercieel.
- Doelgroep: Nederlandse huiseigenaren, kopers, verkopers, makelaars en taxateurs.
- Gebruik alleen feiten uit de aangeleverde bron(nen) en de bedrijfsfeiten. Verzin geen cijfers, data, namen, citaten, regels of onderzoeksresultaten.
- Twijfel je over een feit, zet er dan [CONTROLEREN] achter. Een medewerker kijkt dat na.
- Neem geen zinnen letterlijk over uit de bron; schrijf het in eigen woorden en noem de bron.
- Begin met een direct antwoord of de kern in de introductie (2–4 zinnen). Leg vaktermen kort uit.
- Geen medische, juridische of bouwkundige zekerheden. Een Quick Scan vervangt geen uitgebreid funderingsonderzoek.
- Gebruik in de tekst alleen interne links uit de aangeleverde lijst, in de vorm [ankertekst](/pad/).
- Opmaak in de tekstvelden: gewone alinea's, eventueel een opsomming met "- ". Geen HTML en geen koppen in de tekstvelden zelf.`;

// ---------------------------------------------------------------- JSON-schema's voor het model
const S = (o) => ({ type: 'string', ...o });
const ARTIKEL = {
  type: 'object',
  properties: {
    titel: S({ description: 'Pakkende, feitelijke titel, max. 90 tekens' }),
    seo_titel: S({ description: 'Max. 60 tekens, met het hoofdzoekwoord' }),
    meta_description: S({ description: '120–155 tekens, uitnodigend en feitelijk' }),
    hoofdzoekwoord: S(), zoekwoorden: { type: 'array', items: S(), maxItems: 8 },
    intro: S({ description: 'Direct antwoord / kern in 2–4 zinnen (40–80 woorden)' }),
    secties: { type: 'array', minItems: 2, items: { type: 'object', properties: { kop: S(), tekst: S(), subsecties: { type: 'array', items: { type: 'object', properties: { kop: S(), tekst: S() }, required: ['kop', 'tekst'] } } }, required: ['kop', 'tekst'] } },
    kader: { type: 'object', properties: { titel: S(), tekst: S() }, required: ['titel', 'tekst'] },
    faqs: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'object', properties: { vraag: S(), antwoord: S() }, required: ['vraag', 'antwoord'] } },
    interne_links: { type: 'array', maxItems: 5, items: { type: 'object', properties: { url: S(), tekst: S() }, required: ['url', 'tekst'] } },
  },
  required: ['titel', 'seo_titel', 'meta_description', 'hoofdzoekwoord', 'intro', 'secties', 'kader', 'faqs', 'interne_links'],
};
const ZELFTEST = {
  type: 'object',
  properties: {
    titel: S(), seo_titel: S(), meta_description: S(), hoofdzoekwoord: S(), intro: S(),
    vragen: { type: 'array', minItems: 6, maxItems: 10, items: { type: 'object', properties: { vraag: S(), opties: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'object', properties: { tekst: S(), punten: { type: 'integer', minimum: 0, maximum: 3 } }, required: ['tekst', 'punten'] } }, uitleg: S() }, required: ['vraag', 'opties', 'uitleg'] } },
    uitslagen: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', properties: { min: { type: 'integer' }, max: { type: 'integer' }, titel: S(), tekst: S() }, required: ['min', 'max', 'titel', 'tekst'] } },
  },
  required: ['titel', 'seo_titel', 'meta_description', 'hoofdzoekwoord', 'intro', 'vragen', 'uitslagen'],
};
const REVIEW = { type: 'object', properties: { problemen: { type: 'array', maxItems: 12, items: S() } }, required: ['problemen'] };

const OPDRACHT = {
  nieuws: 'Schrijf een origineel nieuwsartikel (400–650 woorden) over de ontwikkeling hieronder. Leg uit wat er speelt, waarom het relevant is voor woningeigenaren en wat je er als eigenaar of koper mee kunt. Gebruik 3–4 secties met een duidelijke kop.',
  regionaal: 'Schrijf een origineel regionaal artikel (400–650 woorden) over de ontwikkeling hieronder, voor lezers in Friesland, Groningen en Noord-Drenthe. Noem alleen lokale feiten die in de bron staan. Gebruik 3–4 secties.',
  weetje: 'Schrijf een kort "Wist je dat"-artikel (200–350 woorden) over het onderwerp. Begin de titel met "Wist je dat". Eén verrassend feit, helder uitgelegd, met wat het betekent voor een woning. 2 secties.',
  kennis: 'Schrijf een uitgebreid kennisartikel (900–1300 woorden) over het onderwerp. Leg de begrippen helder uit, gebruik 4–6 secties (eventueel met subsecties), en eindig met wanneer onderzoek verstandig is.',
  praktijk: 'Schrijf een FICTIEF praktijkvoorbeeld (400–600 woorden) ter uitleg. Zet "Fictief voorbeeld:" aan het begin van de titel en zeg in de introductie duidelijk dat het een verzonnen situatie is. Gebruik geen echte adressen of namen. 3 secties: de situatie, het onderzoek, wat je ervan kunt leren.',
};

function linkKandidaten(tekst, n = 14) {
  return PAGINAS.map((p) => ({ ...p, sc: lijkenOp(`${p.titel} ${p.keyword}`, tekst) })).sort((a, b) => b.sc - a.sc).slice(0, n)
    .concat(['/fase-0-funderingsonderzoek/', '/prijzen/', '/funderingsscan-aanvragen/'].map((u) => PAGINAS.find((p) => p.url === u)).filter(Boolean))
    .filter((p, i, a) => a.findIndex((x) => x.url === p.url) === i);
}

function bouwInhoud(a) {
  const delen = [];
  (a.secties || []).forEach((s, i) => {
    delen.push(`## ${String(s.kop).replace(/^#+\s*/, '').trim()}`, String(s.tekst).trim());
    for (const sub of s.subsecties || []) delen.push(`### ${String(sub.kop).replace(/^#+\s*/, '').trim()}`, String(sub.tekst).trim());
    if (i === 0 && a.kader?.tekst) delen.push(`> **${String(a.kader.titel || 'Goed om te weten').trim()}:** ${String(a.kader.tekst).replace(/\n+/g, ' ').trim()}`);
  });
  return delen.join('\n\n');
}

/** Taalcontrole via de openbare LanguageTool-API (alleen de concepttekst). */
export async function taalcontrole(tekst) {
  const r = await fetch('https://api.languagetool.org/v2/check', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ text: tekst.slice(0, 18000), language: 'nl' }), signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`LanguageTool ${r.status}`);
  const d = await r.json();
  return (d.matches || []).filter((m) => !/WHITESPACE|UPPERCASE_SENTENCE_START/.test(m.rule?.id || '')).slice(0, 20)
    .map((m) => `${m.message} – "…${m.context.text.slice(m.context.offset, m.context.offset + m.context.length)}…"${m.replacements?.[0]?.value ? ` → ${m.replacements[0].value}` : ''}`);
}

/**
 * Schrijft één concept. taak: { type, onderwerp?, items?: [{titel, url, bron_naam, gepubliceerd_op, samenvatting, paginatekst}], notitie? }
 * Geeft een concept (schoonConcept) met controle terug.
 */
export async function schrijf(taak, { basis, model, bekend = [], taal = true, log = () => {} }) {
  const { type } = taak;
  const items = taak.items || [];
  const bronTekst = items.map((i, k) => `Bron ${k + 1}: ${i.bron_naam || i.uitgever || ''}, ${i.gepubliceerd_op ? i.gepubliceerd_op.slice(0, 10) : 'datum onbekend'}\nTitel: ${i.titel}\nSamenvatting: ${i.samenvatting}\n${i.paginatekst ? `Tekst van de pagina (uittreksel):\n${i.paginatekst}` : ''}`).join('\n\n');
  const onderwerp = taak.onderwerp || items[0]?.titel || '';
  const kandidaten = linkKandidaten(`${onderwerp} ${items.map((i) => i.samenvatting).join(' ')}`);
  const linkLijst = kandidaten.map((p) => `- ${p.url} (${p.titel})`).join('\n');
  const systeem = `Je bent de redacteur van MV Funderingsscan, een onafhankelijk bureau voor funderingsonderzoek in Noord-Nederland.\n\n${BEDRIJF}\n\n${REGELS}`;
  const extra = taak.notitie ? `\n\nOpmerking van de medewerker voor deze nieuwe versie: ${taak.notitie}` : '';

  let ruw; let inhoud = ''; let zelftest = null;
  if (type === 'zelftest') {
    log(`  zelftest schrijven: ${onderwerp}`);
    ruw = await vraagJson({ basis, model, systeem, schema: ZELFTEST, temperatuur: 0.5, prompt: `Maak een interactieve zelftest met de titel/het onderwerp: "${onderwerp}".
- 6 tot 10 meerkeuzevragen over herkenbare signalen of kennis. Per optie 0–3 punten (hoger = meer reden om te laten onderzoeken of meer kennis).
- Bij elke vraag een korte uitleg (2–3 zinnen) die iets leert.
- Precies 3 uitslagen die samen alle mogelijke puntentotalen dekken (min/max), met een eerlijk advies.
- De test mag NOOIT een risicoklasse (A–E) of een diagnose geven en vervangt geen funderingsonderzoek. Verwijs bij een hoge score naar een Quick Scan.${extra}` });
    zelftest = { vragen: ruw.vragen, uitslagen: ruw.uitslagen, disclaimer: 'Deze zelftest is een hulpmiddel en geen funderingsonderzoek. De uitkomst zegt niets zeker over je woning en stelt geen risicoklasse vast.' };
    inhoud = `## Over deze zelftest\n\n${ruw.intro}\n\nDeze test vervangt geen funderingsonderzoek. Twijfel je na de test, lees dan meer over de [Quick Scan (fase 0)](/fase-0-funderingsonderzoek/).`;
  } else {
    log(`  ${TYPE_LABELS[type].toLowerCase()} schrijven: ${onderwerp}`);
    ruw = await vraagJson({ basis, model, systeem, schema: ARTIKEL, prompt: `${OPDRACHT[type]}

Onderwerp: ${onderwerp}
${bronTekst ? `\nBronmateriaal (alleen deze feiten gebruiken):\n${bronTekst}\n` : '\nEr is geen nieuwsbron: gebruik alleen algemeen aanvaarde vakkennis (KCAF, F3O-richtlijnen) en de bedrijfsfeiten, en markeer twijfel met [CONTROLEREN].\n'}
Toegestane interne links (kies er 2–4 die echt passen):
${linkLijst}

Geef ook 3–5 veelgestelde vragen met korte, directe antwoorden, en een kader "Goed om te weten" met één praktische tip.${extra}` });
    inhoud = bouwInhoud(ruw);
  }

  const afb = kiesAfbeelding(`${onderwerp} ${ruw.titel} ${ruw.hoofdzoekwoord}`);
  const concept = schoonConcept({
    type, titel: ruw.titel, seo_titel: ruw.seo_titel, meta_description: ruw.meta_description, hoofdzoekwoord: ruw.hoofdzoekwoord,
    zoekwoorden: ruw.zoekwoorden || [], intro: ruw.intro, inhoud, faqs: ruw.faqs || [],
    bronnen: items.map((i) => ({ titel: i.titel, url: i.url, uitgever: i.bron_naam || i.uitgever || '', datum: i.gepubliceerd_op ? i.gepubliceerd_op.slice(0, 10) : '' })),
    interne_links: (ruw.interne_links || []).filter((l) => INTERNE_URLS.has(l.url)),
    afbeelding: afb.naam, afbeelding_alt: afb.alt, onderwerp, model, item_ids: items.map((i) => i.id).filter(Boolean), zelftest,
  });

  // eindredactie door het model: beweringen zonder grond en taalfouten
  let eindredactie = [];
  try {
    const rev = await vraagJson({ basis, model, schema: REVIEW, temperatuur: 0.1, systeem: `Je bent een strenge eindredacteur.\n\n${BEDRIJF}`, prompt: `Controleer dit concept. Noem kort (max. 12 punten): beweringen die niet worden gedekt door het bronmateriaal of de bedrijfsfeiten, mogelijk onjuiste vakinhoud, misleidende claims, en duidelijke spel- of grammaticafouten. Geen opmerkingen over stijl. Geen problemen? Geef een lege lijst.

${bronTekst ? `Bronmateriaal:\n${bronTekst}\n\n` : ''}Concept:\nTitel: ${concept.titel}\nIntro: ${concept.intro}\n${concept.inhoud}\n${concept.faqs.map((f) => `V: ${f.vraag}\nA: ${f.antwoord}`).join('\n')}${zelftest ? `\n${JSON.stringify(zelftest)}` : ''}` });
    eindredactie = (rev.problemen || []).map((p) => String(p).slice(0, 300));
  } catch (err) { eindredactie = [`Eindredactie mislukt: ${err.message}`]; }

  let taalFouten = [];
  if (taal) {
    try { taalFouten = await taalcontrole([concept.titel, concept.intro, concept.inhoud, ...concept.faqs.flatMap((f) => [f.vraag, f.antwoord])].join('\n\n').replace(/[#>*[\]]|\(\/[^)]*\)/g, '')); } catch (err) { taalFouten = [`Taalcontrole niet uitgevoerd: ${err.message}`]; }
  }

  const c = controleer(concept, { interneUrls: INTERNE_URLS, bekend: [...PAGINAS.map((p) => ({ titel: `${p.titel} ${p.keyword}`, url: p.url })), ...bekend], bronTekst });
  concept.controle = { ...c, waarschuwingen: [...c.waarschuwingen, ...eindredactie.map((e) => `Eindredactie: ${e}`)], eindredactie, taal: taalFouten };
  return concept;
}
