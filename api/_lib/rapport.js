/**
 * QuickScan-rapport (Fase 0 Funderingsrisico-onderzoek): invulvelden, volledigheidscontrole,
 * Word-generatie op basis van rapport-sjabloon/fase0-rapport.docx en een inhoudelijk voorbeeld (HTML).
 *
 * Regels: vaste teksten komen alleen uit het Word-sjabloon; de applicatie bepaalt nooit zelf het
 * funderingsrisico (de adviseur kiest en bevestigt). Meetwaarden worden alleen rekenkundig gecontroleerd.
 */
import { readFileSync } from 'node:fs';
import { readZip, writeZip } from './zip.js';

const TEMPLATE_URL = new URL('../../rapport-sjabloon/fase0-rapport.docx', import.meta.url);
export const TEMPLATE_VERSION = (() => {
  try { return JSON.parse(readFileSync(new URL('../../rapport-sjabloon/sjabloon-versie.json', import.meta.url), 'utf8')).versie; } catch { return 'onbekend'; }
})();

export const STATUSES = [
  ['concept', 'Concept'], ['in_uitvoering', 'In uitvoering'], ['wacht_op_info', 'Wacht op aanvullende informatie'],
  ['gereed_voor_controle', 'Gereed voor controle'], ['definitief', 'Definitief'], ['verzonden', 'Verzonden aan klant'],
];
export const EDIT_STATUSES = ['concept', 'in_uitvoering', 'wacht_op_info', 'gereed_voor_controle'];
export const RISKS = { laag: 'Laag funderingsrisico', midden: 'Midden funderingsrisico', hoog: 'Hoog funderingsrisico' };
// Maximaal aantal foto's per fotovak (minimaal 1 is verplicht, zie controle). Het voorblad heeft één vaste foto.
export const SLOTS = { voorblad: 1, conclusie: 4, bouwtekening: 4, bodemdaling: 4, omgeving: 4, lintvoeg: 4, schietlood: 4 };
// Aantal fotovakken dat in het Word-sjabloon zelf staat; extra foto's komen in een alinea direct eronder.
const SJABLOON_VAKKEN = { lintvoeg: 4 };

/** Vaste keuzelijsten (geen vrije invoer). De waarde komt letterlijk in het rapport. */
export const KEUZES = {
  'object.type': ['Tussenwoning', 'Hoekwoning', 'Twee-onder-een-kap', 'Vrijstaande woning', 'Geschakelde woning', 'Boven- of benedenwoning', 'Appartement', 'Boerderij', 'Bedrijfspand'],
  'object.weertype': ['Zonnig', 'Half bewolkt', 'Bewolkt', 'Motregen', 'Regen', 'Onweer', 'Mist', 'Sneeuw'],
  'vraagstelling.reden': ['aankoop', 'verkoop', 'taxatie', 'financiering', 'verbouwing', 'renovatie', 'verduurzaming'],
  'vraagstelling.bestemming': ['woonfunctie', 'bedrijfsfunctie', 'gemengde functie (wonen en bedrijf)', 'agrarische functie'],
  'bouwtekeningen.fundering': ['Houten paalfundering', 'Houten palen met betonnen oplangers', 'Betonnen paalfundering', 'Fundering op staal', 'Strokenfundering', 'Plaatfundering', 'Niet aangegeven op de bouwtekening'],
  'bodem.typering': ['Klein', 'Groot'],
  typering: ['Zeer klein', 'Klein', 'Matig', 'Groot', 'Zeer groot'],
};
const inLijst = (sleutel, v) => KEUZES[sleutel].includes(s(v));

// Rotatieklassen uit het rapport (F3O), alleen gebruikt om de ingevulde schadetypering op consistentie te controleren.
const KLASSEN = [[300, 'Zeer klein'], [200, 'Klein'], [100, 'Matig'], [75, 'Groot'], [0, 'Zeer groot']];
export function rotatie(metingMm, afstandMm) {
  const m = Math.abs(Number(metingMm)); const a = Number(afstandMm);
  if (!(m > 0) || !(a > 0)) return null;
  const n = a / m; // 1 : n
  const naam = n > 300 ? 'Zeer klein' : n > 200 ? 'Klein' : n > 100 ? 'Matig' : n >= 75 ? 'Groot' : 'Zeer groot';
  return { n, tekst: `1:${Math.round(n)}`, naam };
}
void KLASSEN;

// ---------------------------------------------------------------- hulpfuncties
const s = (v) => (v === undefined || v === null ? '' : String(v).trim());
const isNum = (v) => s(v) !== '' && /^-?\d+([.,]\d+)?$/.test(s(v));
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export function datumNl(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s(iso));
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : s(iso);
}
const getal = (v) => s(v).replace('.', ',');

/** Leest breedte/hoogte uit een JPEG of PNG (voor een correcte beeldverhouding in Word). */
export function imageSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { mime: 'image/png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let p = 2;
    while (p < buf.length - 9) {
      if (buf[p] !== 0xff) { p++; continue; }
      const marker = buf[p + 1]; const len = buf.readUInt16BE(p + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { mime: 'image/jpeg', height: buf.readUInt16BE(p + 5), width: buf.readUInt16BE(p + 7) };
      p += 2 + len;
    }
  }
  return null;
}

// ---------------------------------------------------------------- volledigheidscontrole
/**
 * Geeft { fouten: [{stap, veld, melding}], aandacht: [{stap, melding}] }.
 * fouten blokkeren "definitief maken"; aandachtspunten vragen inhoudelijke controle maar blokkeren niet.
 */
export function controle(data, { advisor, images = [] } = {}) {
  const d = data || {}; const fouten = []; const aandacht = [];
  const eis = (stap, veld, ok, melding) => { if (!ok) fouten.push({ stap, veld, melding }); };
  const foto = (slot) => images.filter((i) => i.slot === slot).length;
  const v = d.voorblad || {}; const a = d.algemeen || {}; const o = d.object || {}; const q = d.vraagstelling || {};
  const c = d.conclusie || {}; const b = d.bouwtekeningen || {}; const bd = d.bodem || {}; const g = d.omgeving || {};

  eis('voorblad', 'object_straat', s(v.object_straat), 'Vul straat en huisnummer van het object in.');
  eis('voorblad', 'object_postcode', /^\s*[1-9][0-9]{3}\s?[A-Za-z]{2}\s*$/.test(s(v.object_postcode)), 'Vul een geldige postcode van het object in (bijv. 8919 AA).');
  eis('voorblad', 'object_plaats', s(v.object_plaats), 'Vul de plaats van het object in.');
  eis('voorblad', 'uitgebracht_op', /^\d{4}-\d{2}-\d{2}$/.test(s(v.uitgebracht_op)), 'Vul de datum in waarop het rapport wordt uitgebracht.');
  eis('voorblad', 'advisor_id', !!advisor, 'Kies de adviseur.');
  eis('voorblad', 'foto', foto('voorblad') >= 1, 'Voeg de foto voor het voorblad toe.');

  eis('algemeen', 'inspectie_datum', /^\d{4}-\d{2}-\d{2}$/.test(s(a.inspectie_datum)), 'Vul de inspectiedatum in.');
  eis('algemeen', 'inspectie_tijd', /^\d{1,2}:\d{2}$/.test(s(a.inspectie_tijd)), 'Vul de inspectietijd in (uu:mm).');
  eis('algemeen', 'opdrachtgever_naam', s(a.opdrachtgever_naam), 'Vul de naam van de opdrachtgever in.');
  eis('algemeen', 'opdrachtgever_straat', s(a.opdrachtgever_straat), 'Vul straat en huisnummer van de opdrachtgever in.');
  eis('algemeen', 'opdrachtgever_postcode', s(a.opdrachtgever_postcode), 'Vul de postcode van de opdrachtgever in.');
  eis('algemeen', 'opdrachtgever_plaats', s(a.opdrachtgever_plaats), 'Vul de plaats van de opdrachtgever in.');

  eis('object', 'type', inLijst('object.type', o.type), 'Kies het type woning of object.');
  eis('object', 'bouwjaar', /^\d{4}$/.test(s(o.bouwjaar)) || /^onbekend$/i.test(s(o.bouwjaar)), 'Vul het bouwjaar in (vier cijfers) of "onbekend".');
  eis('object', 'weertype', inLijst('object.weertype', o.weertype), 'Kies het weertype tijdens de inspectie.');
  eis('object', 'temperatuur', isNum(o.temperatuur) && Math.abs(parseFloat(getal(o.temperatuur).replace(',', '.'))) <= 50, 'Vul de temperatuur in graden Celsius in (getal).');
  eis('object', 'luchtvochtigheid', isNum(o.luchtvochtigheid) && +s(o.luchtvochtigheid).replace(',', '.') >= 0 && +s(o.luchtvochtigheid).replace(',', '.') <= 100, 'Vul de luchtvochtigheid in procenten in (0–100).');

  eis('vraagstelling', 'datum', /^\d{4}-\d{2}-\d{2}$/.test(s(q.datum) || s(a.inspectie_datum)), 'Vul de datum van de vraagstelling in.');
  eis('vraagstelling', 'reden', inLijst('vraagstelling.reden', q.reden), 'Kies de reden van het onderzoek.');
  eis('vraagstelling', 'bestemming', inLijst('vraagstelling.bestemming', q.bestemming), 'Kies de bestemming van het pand.');
  aandacht.push({ stap: 'vraagstelling', melding: 'De vaste zin "Met betrekking tot de fundering dient te worden aangetoond dat de fundering geen risico heeft op funderingsproblemen" is stellig voor een Fase 0-onderzoek. Laat deze formulering inhoudelijk goedkeuren; de applicatie past hem niet aan.' });

  eis('conclusie', 'risico', !!RISKS[c.risico], 'Kies het geconstateerde funderingsrisico (laag, midden of hoog).');
  eis('conclusie', 'risico_bevestigd', c.risico_bevestigd === true, 'Bevestig de risicocategorie op basis van het uitgevoerde onderzoek.');
  eis('conclusie', 'advies', s(c.advies).length >= 10, 'Vul het advies in.');
  eis('conclusie', 'opmaak_plaats', s(c.opmaak_plaats), 'Vul de plaats van opmaak in.');
  eis('conclusie', 'opmaak_datum', /^\d{4}-\d{2}-\d{2}$/.test(s(c.opmaak_datum)), 'Vul de datum van opmaak in.');
  eis('conclusie', 'foto', foto('conclusie') >= 1, 'Voeg minimaal één foto (maximaal 4) bij de conclusie toe.');

  eis('bouwtekeningen', 'ontvangen', ['ja', 'nee'].includes(b.ontvangen), 'Geef aan of de bouwtekeningen zijn ontvangen.');
  if (b.ontvangen === 'ja') eis('bouwtekeningen', 'vorm', ['fysiek', 'digitaal'].includes(b.vorm), 'Geef aan of de bouwtekeningen fysiek of digitaal beschikbaar zijn gesteld.');
  if (b.ontvangen === 'nee') aandacht.push({ stap: 'bouwtekeningen', melding: 'De vaste tekst van hoofdstuk E zegt dat de bouwtekeningen zijn ontvangen. Bouwtekeningen zijn als "niet ontvangen" gemarkeerd: controleer of de tekst inhoudelijk klopt voordat je het rapport verstuurt.' });
  eis('bouwtekeningen', 'jaartal', /^\d{4}$/.test(s(b.jaartal)) || /^n\.?v\.?t\.?$/i.test(s(b.jaartal)), 'Vul het jaartal van de bouwtekeningen in, of N.V.T.');
  eis('bouwtekeningen', 'fundering', inLijst('bouwtekeningen.fundering', b.fundering), 'Kies de soort fundering.');
  eis('bouwtekeningen', 'foto', foto('bouwtekening') >= 1, 'Voeg minimaal één afbeelding (maximaal 4) van de bouwtekening toe.');

  if (bd.niet_beschikbaar === true) {
    eis('bodem', 'motivatie', s(bd.motivatie).length >= 5, 'Licht toe waarom er geen bodemdalingsgegevens beschikbaar zijn.');
  } else {
    eis('bodem', 'mm_per_jaar', isNum(bd.mm_per_jaar), 'Vul de bodemdaling in mm per jaar in, of markeer de gegevens als niet beschikbaar.');
    eis('bodem', 'typering', inLijst('bodem.typering', bd.typering), 'Kies de typering van de bodemdaling.');
    eis('bodem', 'foto', foto('bodemdaling') >= 1, 'Voeg minimaal één afbeelding (maximaal 4) van de bodemdalingskaart toe.');
    const mm = Math.abs(parseFloat(s(bd.mm_per_jaar).replace(',', '.')));
    if (mm > 2 && mm <= 3) aandacht.push({ stap: 'bodem', melding: 'De rapporttekst noemt tot 2 mm/jaar "klein" en meer dan 3 mm/jaar "groot"; voor 2–3 mm/jaar geeft de tekst geen typering. Controleer de ingevulde typering inhoudelijk.' });
    aandacht.push({ stap: 'bodem', melding: 'Let op: het vaste stroomschema op pagina 8 hanteert 0–2 / 2–4 / >4 mm per jaar, de tekst van hoofdstuk F "tot 2 mm klein, > 3 mm groot". Laat dit verschil inhoudelijk afstemmen.' });
  }

  eis('omgeving', 'resultaat', s(g.resultaat).length >= 3, 'Vul het resultaat van de omgevingsfactoren in.');
  eis('omgeving', 'foto', foto('omgeving') >= 1, 'Voeg minimaal één afbeelding (maximaal 4) bij de omgevingsfactoren toe.');

  for (const [stap, key, naam, slot] of [['lintvoeg', 'lintvoeg', 'lintvoegmeting', 'lintvoeg'], ['schietlood', 'schietlood', 'schietloodmeting', 'schietlood']]) {
    const m = d[key] || {};
    if (m.nvt === true) { eis(stap, 'motivatie', s(m.nvt_motivatie).length >= 5, `Licht toe waarom de ${naam} niet van toepassing is.`); continue; }
    eis(stap, 'meetpunten', s(m.meetpunten), `Vul de meetpunten (locaties) van de ${naam} in.`);
    const rijen = (m.rijen || []).filter((r) => s(r.omschrijving) || s(r.meting) || s(r.afstand) || s(r.typering));
    eis(stap, 'rijen', rijen.length >= 1, `Vul minimaal één meetregel van de ${naam} in.`);
    rijen.forEach((r, i) => {
      eis(stap, `rij${i}`, s(r.omschrijving) && isNum(r.meting) && isNum(r.afstand) && inLijst('typering', r.typering), `Meetregel ${i + 1} van de ${naam}: vul omschrijving, meting (mm) en afstand (mm) in en kies de schadetypering.`);
      const rot = rotatie(s(r.meting).replace(',', '.'), s(r.afstand).replace(',', '.'));
      if (rot && s(r.typering) && s(r.typering).toLowerCase() !== rot.naam.toLowerCase()) aandacht.push({ stap, melding: `Meetregel ${i + 1} van de ${naam}: ${s(r.meting)} mm over ${s(r.afstand)} mm is ${rot.tekst}, volgens de tabel in het rapport "${rot.naam}". Ingevuld is "${s(r.typering)}". Controleer dit.` });
    });
    eis(stap, 'foto', foto(slot) >= 1, `Voeg minimaal één foto (maximaal 4) bij de ${naam} toe.`);
  }
  return { fouten, aandacht };
}

// ---------------------------------------------------------------- invulwaarden
export function waarden(data, { advisor, report }) {
  const d = data || {}; const v = d.voorblad || {}; const a = d.algemeen || {}; const o = d.object || {}; const q = d.vraagstelling || {};
  const c = d.conclusie || {}; const b = d.bouwtekeningen || {}; const bd = d.bodem || {}; const g = d.omgeving || {};
  const pcPlaats = (pc, pl) => [s(pc).toUpperCase().replace(/\s*(\d{4})\s*([A-Z]{2})\s*/, '$1 $2'), s(pl)].filter(Boolean).join(' ');
  const objAdres = [s(v.object_straat), pcPlaats(v.object_postcode, v.object_plaats)].filter(Boolean).join(', ');
  const nvt = (m, naam) => (m.nvt === true ? `N.v.t. – ${s(m.nvt_motivatie)}` : s(m.meetpunten));
  return {
    object_adres_volledig: objAdres,
    rapportnummer: report.report_nr,
    uitgebracht_op: datumNl(v.uitgebracht_op),
    adviseur_naam: advisor?.name || '',
    adviseur_certificaat: advisor?.certificate || '',
    inspectie_datum_tijd: [datumNl(a.inspectie_datum), s(a.inspectie_tijd) ? `${s(a.inspectie_tijd)} uur` : ''].filter(Boolean).join(', '),
    opdrachtgever_naam: s(a.opdrachtgever_naam),
    opdrachtgever_straat: s(a.opdrachtgever_straat),
    opdrachtgever_postcode_plaats: pcPlaats(a.opdrachtgever_postcode, a.opdrachtgever_plaats),
    object_straat: s(v.object_straat),
    object_postcode_plaats: pcPlaats(v.object_postcode, v.object_plaats),
    object_plaats: s(v.object_plaats),
    object_type: s(o.type),
    object_bouwjaar: s(o.bouwjaar),
    weertype: s(o.weertype),
    temperatuur: isNum(o.temperatuur) ? `${getal(o.temperatuur)} °C` : '',
    luchtvochtigheid: isNum(o.luchtvochtigheid) ? `${getal(o.luchtvochtigheid)}%` : '',
    vs_datum: datumNl(s(q.datum) || s(a.inspectie_datum)),
    vs_reden: s(q.reden),
    vs_bestemming: s(q.bestemming),
    risico_tekst: RISKS[c.risico] || '',
    advies: s(c.advies),
    opmaak_plaats: s(c.opmaak_plaats),
    opmaak_datum: datumNl(c.opmaak_datum),
    bt_vorm: b.ontvangen === 'ja' && ['fysiek', 'digitaal'].includes(b.vorm) ? b.vorm : (b.ontvangen === 'nee' ? 'niet' : 'fysiek / digitaal'),
    bt_jaartal: /^n\.?v\.?t\.?$/i.test(s(b.jaartal)) ? 'N.V.T.' : s(b.jaartal),
    bt_fundering: s(b.fundering),
    bodemdaling: bd.niet_beschikbaar === true ? `Niet beschikbaar – ${s(bd.motivatie)}` : (isNum(bd.mm_per_jaar) ? `${getal(bd.mm_per_jaar)} mm per jaar` : ''),
    bodem_typering: bd.niet_beschikbaar === true ? 'N.v.t.' : s(bd.typering),
    omgeving_resultaat: s(g.resultaat),
    lv_meetpunten: nvt(d.lintvoeg || {}, 'lintvoegmeting'),
    sl_meetpunten: nvt(d.schietlood || {}, 'schietloodmeting'),
  };
}

// ---------------------------------------------------------------- Word-generatie
/** Begin en einde van de run (<w:r>…</w:r>) rond positie i; `sluit` is het element dat de inhoud afsluit. */
function runRond(doc, i, sluit) {
  if (i < 0) throw new Error('Vak niet gevonden in sjabloon');
  const a = Math.max(doc.lastIndexOf('<w:r>', i), doc.lastIndexOf('<w:r ', i));
  const b = doc.indexOf('</w:r>', doc.indexOf(sluit, i)) + '</w:r>'.length;
  if (a < 0 || b < '</w:r>'.length) throw new Error('Run niet gevonden in sjabloon');
  return [a, b];
}
const xmlEsc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Meerregelige tekst: regels met een regeleinde binnen dezelfde run (opmaak blijft gelijk).
const tekstXml = (t) => xmlEsc(t).split(/\r?\n/).join('</w:t><w:br/><w:t xml:space="preserve">');

// Midden van de vakken Laag/Midden/Hoog in de afbeelding op het voorblad (gemeten op de afbeelding zelf),
// omgerekend naar de positie van de driehoek ten opzichte van de marge (EMU).
const PIJL = (() => {
  const marge = (11906 - 2000) * 635; const breed = 6103620; const links = (marge - breed) / 2; const half = 373380 / 2;
  const x = (f) => Math.round(links + f * breed - half);
  return { laag: x(0.1673), midden: x(0.5014), hoog: x(0.8345) };
})();

/**
 * Bouwt het Word-bestand. images: [{slot, position, buf, mime, width, height, caption}].
 * concept=true: ontbrekende waarden blijven zichtbaar als rode invulhaak "[ … ]" en lege fotovakken blijven staan.
 */
export function maakDocx({ data, advisor, report, images = [], concept = false }) {
  const zip = readZip(readFileSync(TEMPLATE_URL));
  const val = waarden(data, { advisor, report });
  const vul = (xml) => xml.replace(/\{\{([a-z_]+)\}\}/g, (m, k) => {
    if (k === 'pijl_offset') return m;
    const v = val[k];
    if (v) return tekstXml(v);
    // concept: ontbrekend veld rood en vet zichtbaar laten (zoals de invulhaken in het originele sjabloon)
    return concept ? `</w:t></w:r><w:r><w:rPr><w:b/><w:color w:val="C00000"/></w:rPr><w:t xml:space="preserve">[ ${k.replace(/_/g, ' ')} ]</w:t></w:r><w:r><w:t xml:space="preserve">` : '';
  });
  let doc = zip.get('word/document.xml').toString('utf8');
  let rels = zip.get('word/_rels/document.xml.rels').toString('utf8');
  let types = zip.get('[Content_Types].xml').toString('utf8');

  // meettabellen: sjabloonrij klonen per meting
  for (const [prefix, key] of [['lv', 'lintvoeg'], ['sl', 'schietlood']]) {
    const m = (data && data[key]) || {};
    const rijen = m.nvt === true ? [{ omschrijving: 'Niet uitgevoerd', meting: '–', afstand: '–', typering: 'N.v.t.' }]
      : (m.rijen || []).filter((r) => s(r.omschrijving) || s(r.meting) || s(r.afstand) || s(r.typering));
    doc = doc.replace(/<w:tr[ >](?:(?!<\/w:tr>)[\s\S])*?<\/w:tr>/g, (tr) => {
      if (!tr.includes(`{{${prefix}_omschrijving}}`)) return tr;
      const lijst = rijen.length ? rijen : [{}];
      return lijst.map((r) => tr
        .replace(`{{${prefix}_omschrijving}}`, xmlEsc(s(r.omschrijving) || (concept ? '[ ]' : '')))
        .replace(`{{${prefix}_meting}}`, xmlEsc(getal(r.meting) || (concept ? '[ ]' : '')))
        .replace(`{{${prefix}_afstand}}`, xmlEsc(getal(r.afstand) || (concept ? '[ ]' : '')))
        .replace(`{{${prefix}_typering}}`, xmlEsc(s(r.typering) || (concept ? '[ ]' : '')))).join('');
    });
  }

  // aanwijzer op het voorblad
  const risk = data?.conclusie?.risico;
  if (PIJL[risk]) doc = doc.replace('{{pijl_offset}}', String(PIJL[risk]));
  else { const [a, b] = runRond(doc, doc.indexOf('name="mvfs-pijl"'), '</mc:AlternateContent>'); doc = doc.slice(0, a) + doc.slice(b); } // nog geen uitkomst: geen pijl

  // foto's (per vak op volgorde van positie; gaten na verwijderen tellen niet mee)
  let n = 0;
  const perVak = (slot) => images.filter((i) => i.slot === slot).sort((x, y) => Number(x.position) - Number(y.position));
  const heeftType = (ext) => new RegExp(`Extension="${ext}"`, 'i').test(types);
  // Basis voor extra foto's: een eenvoudige foto in de tekstregel (inline), zodat foto's nooit over elkaar heen vallen.
  const inlineBasis = '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="1" cy="1"/><wp:effectExtent l="0" t="0" r="0" b="0"/>'
    + '<wp:docPr id="1" name="foto"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
    + '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
    + '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="foto"/><pic:cNvPicPr/></pic:nvPicPr>'
    + '<pic:blipFill><a:blip r:embed="rIdLeeg"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
    + '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1" cy="1"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  const EXTRA_VAK = [2880000, 2160000]; // ca. 8 x 6 cm: twee foto's naast elkaar
  const plaatsFoto = (run, img, { vak, bijschrift = true } = {}) => {
    n++;
    const ext = img.mime === 'image/png' ? 'png' : 'jpeg';
    const name = `media/mvfs_${img.slot}_${img.position}.${ext}`;
    zip.set(`word/${name}`, img.buf);
    const rid = `rIdMvfs${n}`;
    rels = rels.replace('</Relationships>', `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${name}"/></Relationships>`);
    if (!heeftType(ext)) types = types.replace('</Types>', `<Default Extension="${ext}" ContentType="image/${ext}"/></Types>`);
    // passend binnen het fotovak, met behoud van de beeldverhouding
    const [cx, cy] = vak || run.match(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/).slice(1).map(Number);
    const scale = Math.min(cx / img.width, cy / img.height);
    const w = Math.round(img.width * scale); const h = Math.round(img.height * scale);
    let out = run.replace(/r:embed="[^"]+"/, `r:embed="${rid}"`)
      .replace(/<wp:extent cx="\d+" cy="\d+"\/>/, `<wp:extent cx="${w}" cy="${h}"/>`)
      .replace(/(<pic:spPr>[\s\S]*?<a:ext )cx="\d+" cy="\d+"/, `$1cx="${w}" cy="${h}"`)
      .replace(/<wp:docPr id="\d+"/, `<wp:docPr id="${9000 + n}"`)
      .replace(/name="mvfs-slot:[^"]*"/g, `name="Foto ${n}"`);
    if (bijschrift && s(img.caption)) out += `<w:r><w:br/></w:r><w:r><w:rPr><w:i/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${xmlEsc(img.caption)}</w:t></w:r>`;
    return out;
  };
  for (let i = doc.indexOf('name="mvfs-slot:'); i >= 0; i = doc.indexOf('name="mvfs-slot:', i + 1)) {
    const [, slot, pos] = doc.slice(i).match(/^name="mvfs-slot:([a-z]+):(\d)"/);
    const lijst = perVak(slot);
    const img = lijst[Number(pos) - 1];
    const [a, b] = runRond(doc, i, '</w:drawing>');
    const nieuw = img ? plaatsFoto(doc.slice(a, b), img) : (concept && pos === '1' ? doc.slice(a, b) : ''); // leeg vak: in concept het eerste vak zichtbaar laten
    doc = doc.slice(0, a) + nieuw + doc.slice(b);
    i = a + Math.max(0, nieuw.length - 1);
    const vakken = SJABLOON_VAKKEN[slot] || 1;
    if (pos === String(vakken) && lijst.length > vakken) {
      // extra foto's in een eigen alinea direct onder het fotovak, met de bijschriften eronder
      const extra = lijst.slice(vakken);
      const runs = extra.map((x) => plaatsFoto(inlineBasis, x, { vak: EXTRA_VAK, bijschrift: false })).join('<w:r><w:t xml:space="preserve">   </w:t></w:r>');
      const onderschriften = extra.map((x, k) => (s(x.caption) ? `Foto ${vakken + k + 1}: ${s(x.caption)}` : '')).filter(Boolean);
      let invoeg = `<w:p><w:pPr><w:spacing w:before="120" w:after="60"/><w:jc w:val="center"/></w:pPr>${runs}</w:p>`;
      if (onderschriften.length) invoeg += `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${tekstXml(onderschriften.join('\n'))}</w:t></w:r></w:p>`;
      const pe = doc.indexOf('</w:p>', a + nieuw.length) + '</w:p>'.length;
      doc = doc.slice(0, pe) + invoeg + doc.slice(pe);
      i = pe + invoeg.length - 1;
    }
  }

  doc = vul(doc);
  zip.set('word/document.xml', doc);
  zip.set('word/footer1.xml', vul(zip.get('word/footer1.xml').toString('utf8')));
  zip.set('word/_rels/document.xml.rels', rels);
  zip.set('[Content_Types].xml', types);
  if (/\{\{[a-z_]+\}\}/.test(doc)) throw new Error('Niet alle invulvelden zijn verwerkt');
  return writeZip(zip);
}

// ---------------------------------------------------------------- inhoudelijk voorbeeld (HTML)
/**
 * Zet het gegenereerde Word-bestand om naar eenvoudige HTML om de inhoud te controleren
 * (teksten, tabellen, foto's en paginawisselingen). De exacte opmaak bekijk je in Word.
 */
export function docxNaarHtml(docxBuf, { media } = {}) {
  const zip = readZip(docxBuf);
  const doc = zip.get('word/document.xml').toString('utf8');
  const rels = Object.fromEntries([...zip.get('word/_rels/document.xml.rels').toString('utf8').matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const para = (p) => {
    let html = '';
    for (const r of p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) || []) {
      const emb = r.match(/r:embed="([^"]+)"/);
      if (emb && rels[emb[1]] && !/mvfs-pijl|Gelijkbenige/.test(r)) {
        const naam = rels[emb[1]];
        const link = media && media(naam);
        const f = zip.get(`word/${naam}`); const ext = naam.split('.').pop().replace('jpg', 'jpeg');
        if (link) html += `<img src="${link.replace(/"/g, '&quot;')}" alt="">`;
        else if (f && f.length < 400 * 1024) html += `<img src="data:image/${ext};base64,${f.toString('base64')}" alt="">`;
        else if (f) html += '<span class="rv-open">[ afbeelding uit het sjabloon ]</span>';
        continue;
      }
      if (/w:type="page"/.test(r)) { html += '</p><hr class="rv-page"><p>'; continue; }
      const t = [...r.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>|<w:br\/>/g)].map((m) => (m[0] === '<w:br/>' ? '<br>' : m[1])).join('');
      if (!t) continue;
      const red = /w:color w:val="C00000"/.test(r);
      html += /<w:b\/>/.test(r) ? `<strong${red ? ' class="rv-open"' : ''}>${t}</strong>` : (red ? `<span class="rv-open">${t}</span>` : t);
    }
    const kop = /<w:pStyle w:val="Heading1"\/>/.test(p);
    return html.trim() ? (kop ? `<h2>${html}</h2>` : `<p>${html}</p>`) : (/w:type="page"/.test(p) ? '<hr class="rv-page">' : '');
  };
  const body = doc.slice(doc.indexOf('<w:body>'), doc.lastIndexOf('<w:sectPr'));
  const out = body.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, (tbl) => {
    if (/<w:tbl>[\s\S]*<w:tbl>/.test(tbl)) return '';
    const rows = (tbl.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []).map((tr) => `<tr>${(tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).map((tc) => `<td>${(tc.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map(para).join('')}</td>`).join('')}</tr>`).join('');
    return `\u0001<table class="rv-table">${rows}</table>\u0001`;
  }).split('\u0001').map((part) => (part.startsWith('<table') ? part : (part.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map(para).join('\n'))).join('\n');
  const foot = [...zip.get('word/footer1.xml').toString('utf8').matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('').replace(/Pagina:.*$/, '');
  return { html: out, voettekst: foot };
}
