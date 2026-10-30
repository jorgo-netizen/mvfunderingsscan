/**
 * Maakt van het aangeleverde Word-rapport (rapport-sjabloon/origineel/fase0-rapport-origineel.docx)
 * het sjabloon met benoemde invulvakken: rapport-sjabloon/fase0-rapport.docx.
 *
 *   node scripts/maak-rapportsjabloon.mjs
 *
 * Werkwijze: elk invulvak wordt op zijn eigen plek (alinea-nummer + exacte verwachte tekst) vervangen door
 * een unieke markering {{naam}}. Klopt de verwachte tekst niet, dan stopt het script: zo wordt nooit
 * per ongeluk vaste tekst vervangen. Vaste teksten, opmaak, kop/voettekst en afbeeldingen blijven ongewijzigd.
 * Fotovakken krijgen de naam "mvfs-slot:<vak>:<nr>", de aanwijzer op het voorblad een variabele positie.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readZip, writeZip } from '../api/_lib/zip.js';

const SRC = new URL('../rapport-sjabloon/origineel/fase0-rapport-origineel.docx', import.meta.url);
const OUT = new URL('../rapport-sjabloon/fase0-rapport.docx', import.meta.url);
const NAVY = '0A2F41'; // kleur van de vaste gegevens in het rapport
const BEDRIJF = {
  naam: 'MV Funderingsscan B.V.',
  adres: 'Mr. P.J. Troelstraweg 149 unit 23',
  postcode_plaats: '8919 AA Leeuwarden',
  email: 'info@mvadviseurs.nl',
  kvk: '42204729',
  website: 'www.mvfunderingsquickscan.nl',
};
const LOGO = new URL('../public/assets/logo-mvfunderingsscan.png', import.meta.url);

const zip = readZip(readFileSync(SRC));
let doc = zip.get('word/document.xml').toString('utf8');

// ---------------------------------------------------------------- alinea's opsplitsen
const bodyStart = doc.indexOf('<w:body>');
const head = doc.slice(0, bodyStart); let body = doc.slice(bodyStart);
const paras = []; body = body.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (m) => { paras.push(m); return `\u0000P${paras.length - 1}\u0000`; });
const text = (p) => [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('');

/** Vervangt in alinea i de run met exact `oud` door {{tag}}. stijl: 'veld' (vet, donkerblauw) of 'tekst' (gewone lopende tekst). */
function veld(i, oud, tag, stijl = 'veld') {
  const runs = [...paras[i].matchAll(/<w:r[ >][\s\S]*?<\/w:r>/g)].map((m) => m[0]);
  const run = runs.find((r) => text(r) === oud);
  if (!run) throw new Error(`Alinea ${i}: verwachte tekst "${oud}" niet gevonden (gevonden: "${text(paras[i])}")`);
  let nieuw = run.replace(/<w:t[^>]*>[^<]*<\/w:t>/, `<w:t xml:space="preserve">{{${tag}}}</w:t>`);
  if (stijl === 'veld') nieuw = nieuw.replace(/<w:color w:val="[0-9A-Fa-f]{6}"\/>/, `<w:color w:val="${NAVY}"/>`);
  else nieuw = nieuw.replace(/<w:b\/>/g, '').replace(/<w:bCs\/>/g, '').replace(/<w:color w:val="[0-9A-Fa-f]{6}"\/>/, '');
  paras[i] = paras[i].replace(run, nieuw);
}
/** Vervangt een stuk tekst binnen een vaste zin (alleen als het exact één keer voorkomt). */
function inZin(i, oud, tag) {
  const n = paras[i].split(oud).length - 1;
  if (n !== 1) throw new Error(`Alinea ${i}: "${oud}" komt ${n} keer voor`);
  paras[i] = paras[i].replace(oud, `{{${tag}}}`);
}
function fotovak(i, vak, nr) {
  if (!paras[i].includes('<w:drawing>')) throw new Error(`Alinea ${i}: geen afbeelding (fotovak ${vak})`);
  paras[i] = paras[i].replace(/(<wp:docPr [^>]*name=")[^"]*(")/, `$1mvfs-slot:${vak}:${nr}$2`);
}

// ---------------------------------------------------------------- voorblad
veld(4, '[ Straatnaam huisnummer, postcode plaats ]', 'object_adres_volledig');
veld(6, '[ invullen ]', 'rapportnummer');
veld(8, '[ datum invullen ]', 'uitgebracht_op');
veld(20, 'Melvin Krikke / Rutger Fopma', 'adviseur_naam');
veld(22, 'CE240260817-02 / CE240260817-03', 'adviseur_certificaat');
fotovak(1, 'voorblad', 1);
// aanwijzer "Uitkomst Fase 0": horizontale positie wordt per risicocategorie ingevuld
{
  const oud = '<wp:positionH relativeFrom="margin"><wp:align>center</wp:align></wp:positionH>';
  if (!paras[24].includes('Gelijkbenige driehoek') || paras[24].split(oud).length !== 2) throw new Error('Aanwijzer op het voorblad niet gevonden');
  paras[24] = paras[24].replace(oud, '<wp:positionH relativeFrom="margin"><wp:posOffset>{{pijl_offset}}</wp:posOffset></wp:positionH>');
  paras[24] = paras[24].replace(/(<wp:docPr [^>]*name=")Gelijkbenige driehoek 55(")/, '$1mvfs-pijl$2');
}

// ---------------------------------------------------------------- A. opdracht / opname
veld(44, '[ datum + tijd invullen ]', 'inspectie_datum_tijd');
veld(46, '[ naam invullen ]', 'opdrachtgever_naam');
veld(48, '[ straat + huisnummer invullen ]', 'opdrachtgever_straat');
veld(50, '[ postcode + plaats invullen ]', 'opdrachtgever_postcode_plaats');
veld(54, '[ naam inspecteur invullen ]', 'adviseur_naam');
veld(56, 'CE240260817-02 / CE240260817-03', 'adviseur_certificaat');
// ---------------------------------------------------------------- B. object
veld(73, '[ straat + huisnummer invullen ]', 'object_straat');
veld(75, '[ postcode + plaats invullen ]', 'object_postcode_plaats');
veld(77, '[ bv. eengezinswoning, twee-onder-een-kap, ... ]', 'object_type');
veld(79, '[ jaartal invullen ]', 'object_bouwjaar');
veld(82, '[ bv. droog, matige regen, ... ]', 'weertype');
veld(84, '[ graden invullen ]', 'temperatuur');
veld(86, '[ % invullen ]', 'luchtvochtigheid');
// ---------------------------------------------------------------- C. vraagstelling
veld(90, '[ datum ]', 'vs_datum', 'tekst');
veld(90, '[ naam opdrachtgever ]', 'opdrachtgever_naam', 'tekst');
veld(90, '[ reden, bv. verkoop ]', 'vs_reden', 'tekst');
veld(90, '[ adres ]', 'object_straat', 'tekst');
veld(90, '[ plaats ]', 'object_plaats', 'tekst');
veld(90, '[ bestemming invullen ]', 'vs_bestemming', 'tekst');
// ---------------------------------------------------------------- D. conclusie
veld(108, '[ laag / midden / hoog funderingsrisico invullen ]', 'risico_tekst');
veld(110, '[ advies invullen ]', 'advies');
veld(116, '[ plaats ]', 'opmaak_plaats', 'tekst');
veld(116, '[ datum ]', 'opmaak_datum', 'tekst');
fotovak(118, 'conclusie', 1);
// ---------------------------------------------------------------- E. bouwtekeningen
inZin(121, 'fysiek / digitaal', 'bt_vorm');
veld(123, '[ jaartal invullen of N.V.T. ]', 'bt_jaartal');
veld(125, '[ soort fundering invullen ]', 'bt_fundering');
fotovak(126, 'bouwtekening', 1);
// ---------------------------------------------------------------- F. bodemdalingskaart
veld(134, '[ waarde invullen ]', 'bodemdaling');
veld(136, '[ typering invullen ]', 'bodem_typering');
fotovak(139, 'bodemdaling', 1);
// ---------------------------------------------------------------- G. omgevingsfactoren
veld(155, '[ resultaat / conclusie invullen ]', 'omgeving_resultaat');
fotovak(157, 'omgeving', 1);
// ---------------------------------------------------------------- H. lintvoegmeting
[185, 186, 187, 188].forEach((i, k) => fotovak(i, 'lintvoeg', k + 1));
veld(191, '[ gevel(s) invullen waar gemeten is ]', 'lv_meetpunten');
// ---------------------------------------------------------------- I. schietloodmeting
veld(237, '[ gevel invullen ]', 'sl_meetpunten');
fotovak(240, 'schietlood', 1);

// ---------------------------------------------------------------- bedrijfsgegevens (MV Funderingsscan B.V.)
// Het origineel is van Midea Vastgoed Adviseurs; het rapport komt nu van de eigen B.V.
/** Vervangt in alinea i vaste tekst die exact één keer voorkomt. */
function vast(i, oud, nieuw) {
  const n = paras[i].split(oud).length - 1;
  if (n !== 1) throw new Error(`Alinea ${i}: "${oud}" komt ${n} keer voor (gevonden: "${text(paras[i])}")`);
  paras[i] = paras[i].replace(oud, nieuw);
}
vast(53, '>Naam MV-Adviseur:<', '>Naam adviseur:<');
vast(11, '>Midea Vastgoed Adviseurs<', `>${BEDRIJF.naam}<`);
vast(12, '>Mr. P.J. Troelstraweg 149 unit 29, 8919 AA Leeuwarden<', `>${BEDRIJF.adres}, ${BEDRIJF.postcode_plaats}<`);
vast(13, '>E-mail. info@mideavastgoed.nl<', `>E-mail. ${BEDRIJF.email}<`);
vast(16, '>92396674<', `>${BEDRIJF.kvk}<`);
vast(63, '>Midea Vastgoed Adviseurs (MV-Adviseurs)<', `>${BEDRIJF.naam}<`);
vast(65, '>Midea Vastgoed Adviseurs<', `>${BEDRIJF.naam}<`);
vast(67, '>Mr. P.J. Troelstraweg 149 unit 29 8919 AA Leeuwarden<', `>${BEDRIJF.adres}, ${BEDRIJF.postcode_plaats}<`);
vast(90, ' heeft Midea Vastgoed Adviseurs in opdracht van ', ` heeft ${BEDRIJF.naam} in opdracht van `);
vast(116, 'Directie van Midea Vastgoed Adviseurs', `Directie van ${BEDRIJF.naam}`);
// J. Diensten: alleen wat MV Funderingsscan zelf aanbiedt
vast(254, '>Midea Vastgoed Adviseurs biedt verschillende diensten aan;<', `>${BEDRIJF.naam} biedt de volgende diensten aan:<`);
vast(255, '>Keuring<', '>Funderingsonderzoek<');
vast(256, '>- Bouwkundig onderzoeken zoals vochtproblemen, scheurvorming, hout borende insect soorten, etc<', '>- Fase 0 funderingsrisico-onderzoek (QuickScan)<');
vast(257, '>- Digitale plattegronden woning of bedrijfspanden<', '>- Fase 1 funderingsonderzoek<');
vast(258, '>- NEN2580 meetrapport<', '>- Funderingsmetingen, zoals lintvoegwaterpassing, loodmeting en vloerveldwaterpassing<');
if (text(paras[259]) !== 'Energie' || !text(paras[263]).includes('maatwerkadvies')) throw new Error('Dienstenblok Energie niet gevonden');
for (let i = 259; i <= 263; i++) paras[i] = '';
vast(265, 'kijk op website www.mideavastgoed.nl of neem', `kijk op ${BEDRIJF.website} of neem`);

// meettabellen: eerste lege rij wordt de sjabloonrij, overige lege rijen vervallen (de generator kloont per meting)
function meetrij(eersteAlinea, aantalRijen, prefix) {
  const cellen = ['omschrijving', 'meting', 'afstand', 'typering'];
  for (let r = 0; r < aantalRijen; r++) for (let c = 0; c < 4; c++) {
    const i = eersteAlinea + r * 4 + c;
    if (text(paras[i]) !== '[ ]') throw new Error(`Alinea ${i}: verwacht lege meetcel "[ ]"`);
    if (r === 0) veld(i, '[ ]', `${prefix}_${cellen[c]}`, 'tekst');
    else paras[i] = `\u0000VERWIJDER-RIJ\u0000${paras[i]}`;
  }
}
meetrij(198, 3, 'lv');
meetrij(247, 1, 'sl');

// ---------------------------------------------------------------- weer samenvoegen
body = body.replace(/\u0000P(\d+)\u0000/g, (m, i) => paras[+i]);
// rijen met gemarkeerde cellen verwijderen
body = body.replace(/<w:tr[ >][\s\S]*?<\/w:tr>/g, (tr) => (tr.includes('\u0000VERWIJDER-RIJ\u0000') ? '' : tr));
if (/\u0000/.test(body)) throw new Error('Interne markering achtergebleven');
doc = head + body;
for (const tag of ['rapportnummer', 'lv_omschrijving', 'sl_typering', 'pijl_offset', 'bt_vorm']) if (!doc.includes(`{{${tag}}}`)) throw new Error(`Markering ${tag} ontbreekt`);
if (/\[ [^\]]{0,60}\]/.test(body.replace(/<[^>]+>/g, ''))) {
  const rest = body.replace(/<[^>]+>/g, '').match(/\[ [^\]]{0,60}\]/g);
  throw new Error(`Niet alle invulhaken zijn gekoppeld: ${rest.join(', ')}`);
}
zip.set('word/document.xml', doc);

// voettekst: object, rapportnummer en datum
let foot = zip.get('word/footer1.xml').toString('utf8');
for (const [oud, nieuw] of [['>[ adres invullen ]<', '>{{object_adres_volledig}}<'], ['>Rapportnummer: [ invullen ]<', '>Rapportnummer: {{rapportnummer}}<'], ['>Datum: [ invullen ]<', '>Datum: {{uitgebracht_op}}<']]) {
  if (foot.split(oud).length !== 2) throw new Error(`Voettekst: "${oud}" niet precies één keer gevonden`);
  foot = foot.replace(oud, nieuw);
}
foot = foot.replace(/(\{\{[a-z_]+\}\}<\/w:t>)/g, '$1'); // tekst blijft in dezelfde opmaak
zip.set('word/footer1.xml', foot);

// koptekst: logo van MV Funderingsscan in plaats van het Midea-logo (de naam staat in het logo zelf)
{
  let hdr = zip.get('word/header1.xml').toString('utf8');
  const rels = zip.get('word/_rels/header1.xml.rels').toString('utf8');
  if (!rels.includes('Target="media/image13.png"') || hdr.split('cx="438150" cy="390525"').length !== 3 || !hdr.includes('>   MIDEA Vastgoed Adviseurs<')) throw new Error('Koptekst: logo of naam niet gevonden');
  const png = readFileSync(LOGO);
  const breedte = 1620000; // ca. 4,5 cm
  const hoogte = Math.round(breedte * png.readUInt32BE(20) / png.readUInt32BE(16));
  hdr = hdr.replaceAll('cx="438150" cy="390525"', `cx="${breedte}" cy="${hoogte}"`).replace('>   MIDEA Vastgoed Adviseurs<', '><');
  zip.set('word/header1.xml', hdr);
  zip.set('word/media/image13.png', png);
}

// Word vraagt bij openen om velden (inhoudsopgave, paginanummers) bij te werken
let settings = zip.get('word/settings.xml').toString('utf8');
if (!settings.includes('<w:updateFields')) settings = settings.replace(/(<w:settings[^>]*>)/, '$1<w:updateFields w:val="true"/>');
zip.set('word/settings.xml', settings);

const out = writeZip(zip);
writeFileSync(OUT, out);
const versie = createHash('sha256').update(readFileSync(SRC)).update(readFileSync(new URL(import.meta.url))).update(readFileSync(LOGO)).digest('hex').slice(0, 12);
writeFileSync(new URL('../rapport-sjabloon/sjabloon-versie.json', import.meta.url), JSON.stringify({ versie: `fase0-${versie}`, bron: 'origineel/fase0-rapport-origineel.docx', gemaakt: new Date().toISOString().slice(0, 10) }, null, 2) + '\n');
console.log(`✔ Sjabloon gemaakt: rapport-sjabloon/fase0-rapport.docx (versie fase0-${versie})`);
