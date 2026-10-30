/**
 * Beheeracties voor QuickScan-rapporten (aangeroepen vanuit api/beheer.js, na de sessie- en CSRF-controle).
 *
 * Rechten: iedere ingelogde medewerker mag rapporten aanmaken en invullen. Definitief maken, de PDF
 * vastleggen, versturen en een nieuwe versie starten mag alleen een beheerder of het account dat aan de
 * gekozen adviseur is gekoppeld. Adviseurs (naam + certificaatnummer) beheren en rapporten verwijderen:
 * alleen beheerder.
 */
import { randomToken, isUuid, isEmail, sha256, logError, esc } from './http.js';
import { STATUSES, EDIT_STATUSES, RISKS, SLOTS, KEUZES, TEMPLATE_VERSION, controle, maakDocx, docxNaarHtml, imageSize, waarden } from './rapport.js';
import { resendSend } from './mail.js';
import { zoekLigging, weerOp } from './adres.js';

const BUCKET = 'rapport-bestanden';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const str = (v, max) => String(v ?? '').trim().slice(0, max);
/**
 * Laat Vercel de site opnieuw bouwen, zodat gewijzigde medewerkers op /over-ons/ komen.
 * Vereist VERCEL_DEPLOY_HOOK (Vercel → Settings → Git → Deploy Hooks). Zonder die variabele gebeurt er niets.
 */
async function herbouwSite() {
  const hook = process.env.VERCEL_DEPLOY_HOOK;
  if (!hook || !/^https:\/\/api\.vercel\.com\//.test(hook)) return 'niet_ingesteld';
  try { const r = await fetch(hook, { method: 'POST' }); return r.ok ? 'gestart' : 'mislukt'; }
  catch (err) { logError('deploy-hook', err); return 'mislukt'; }
}
const FOTO_TYPES = { 'image/jpeg': [0xff, 0xd8, 0xff], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/webp': [0x52, 0x49, 0x46, 0x46] };
const STATUS_KEYS = STATUSES.map(([k]) => k);

/** Alleen bekende velden met beperkte lengte bewaren (geen willekeurige JSON). */
const SCHEMA = {
  voorblad: { object_straat: 120, object_postcode: 10, object_plaats: 80, uitgebracht_op: 10 },
  algemeen: { inspectie_datum: 10, inspectie_tijd: 5, opdrachtgever_naam: 120, opdrachtgever_straat: 120, opdrachtgever_postcode: 10, opdrachtgever_plaats: 80, opdrachtgever_email: 160 },
  object: { type: 120, bouwjaar: 10, weertype: 80, temperatuur: 6, luchtvochtigheid: 6 },
  vraagstelling: { datum: 10, reden: 120, bestemming: 120 },
  conclusie: { risico: 6, risico_bevestigd: 'bool', advies: 4000, opmaak_plaats: 80, opmaak_datum: 10 },
  bouwtekeningen: { ontvangen: 3, vorm: 8, jaartal: 8, fundering: 160 },
  bodem: { mm_per_jaar: 8, typering: 120, bron: 200, peildatum: 10, niet_beschikbaar: 'bool', motivatie: 400 },
  omgeving: { resultaat: 2000 },
  lintvoeg: { meetpunten: 300, nvt: 'bool', nvt_motivatie: 400, rijen: 'rijen' },
  schietlood: { meetpunten: 300, nvt: 'bool', nvt_motivatie: 400, rijen: 'rijen' },
};
export function schoon(input) {
  const out = {};
  for (const [sectie, velden] of Object.entries(SCHEMA)) {
    const src = (input && typeof input[sectie] === 'object' && input[sectie]) || {};
    out[sectie] = {};
    for (const [veld, max] of Object.entries(velden)) {
      if (max === 'bool') out[sectie][veld] = src[veld] === true;
      else if (max === 'rijen') out[sectie][veld] = (Array.isArray(src[veld]) ? src[veld] : []).slice(0, 30).map((r) => ({ omschrijving: str(r?.omschrijving, 120), meting: str(r?.meting, 10), afstand: str(r?.afstand, 10), typering: str(r?.typering, 60) }));
      else out[sectie][veld] = str(src[veld], max);
    }
  }
  if (!RISKS[out.conclusie.risico]) out.conclusie.risico = '';
  return out;
}

function lijstItem(r) {
  const d = r.data || {};
  return {
    id: r.id, report_nr: r.report_nr, status: r.status, risk: r.risk, version: r.version, updated_at: r.updated_at, request_id: r.request_id,
    adres: [d.voorblad?.object_straat, d.voorblad?.object_plaats].filter(Boolean).join(', '),
    opdrachtgever: d.algemeen?.opdrachtgever_naam || '', inspectiedatum: d.algemeen?.inspectie_datum || '', adviseur: r.advisor?.name || '',
  };
}

/** Gegevens uit een QuickScan-aanvraag overnemen (geen dubbele invoer). */
function vanAanvraag(req) {
  const det = req.details || {};
  const sit = String(det.situatie || '').toLowerCase();
  const straat = [req.adres, !req.adres && req.huisnummer ? req.huisnummer : ''].filter(Boolean).join(' ');
  return {
    voorblad: { object_straat: straat, object_postcode: req.postcode || '', object_plaats: req.plaats || '' },
    algemeen: { opdrachtgever_naam: req.naam || '', opdrachtgever_straat: straat, opdrachtgever_postcode: req.postcode || '', opdrachtgever_plaats: req.plaats || '', opdrachtgever_email: req.email || '' },
    object: { type: KEUZES['object.type'].includes(det.woningtype) ? det.woningtype : '', bouwjaar: /^\d{4}$/.test(String(det.bouwjaar || '')) ? String(det.bouwjaar) : '' },
    vraagstelling: { reden: sit.includes('verkoop') ? 'verkoop' : sit.includes('kopen') ? 'aankoop' : '' },
  };
}


export async function rapportActies(db, req, res, actie, user, url, { json, fail, readJson, sendHtml, NOINDEX }) {
  const id = url.searchParams.get('id');
  const laad = async (rid) => (isUuid(rid) ? db.reportById(rid) : null);

  // ------------------------------------------------------------ lezen
  if (actie === 'rapporten') {
    const status = STATUS_KEYS.includes(url.searchParams.get('status')) ? url.searchParams.get('status') : null;
    const items = await db.reportsList({ status, search: str(url.searchParams.get('q'), 80) });
    return json(res, 200, { ok: true, items: items.map(lijstItem), statussen: STATUSES });
  }
  if (actie === 'rapport-adviseurs') return json(res, 200, { ok: true, items: (await db.advisorsList()).map((a) => ({ ...a, foto_url: a.photo_path ? db.publicUrl('nieuws', a.photo_path) : null })) });
  if (actie === 'rapport') {
    const r = await laad(id); if (!r) return fail(res, 404, 'Rapport niet gevonden.');
    const [advisors, images, versions, emails] = await Promise.all([db.advisorsList(), db.reportImages(r.id), db.versionsList(r.id), db.reportEmails(r.id)]);
    const advisor = advisors.find((a) => a.id === r.advisor_id) || null;
    const fotos = await Promise.all(images.map(async (i) => ({ id: i.id, slot: i.slot, position: i.position, caption: i.caption, url: await db.signedUrl(BUCKET, i.path, 900) })));
    const request = r.request_id ? (await db.requestById(r.request_id))?.request : null;
    return json(res, 200, {
      ok: true, report: { ...r, data: r.data }, advisors: advisors.filter((a) => a.active || a.id === r.advisor_id), fotos, versions, emails,
      controle: controle(r.data, { advisor, images }), statussen: STATUSES, bewerkbaar: EDIT_STATUSES.includes(r.status),
      slots: SLOTS, keuzes: KEUZES,
      aanvraag: request ? { id: request.id, dossier_nr: request.dossier_nr, status: request.status, email: request.email } : null,
    });
  }
  if (actie === 'rapport-weer') {
    const r = await laad(id); if (!r) return fail(res, 404, 'Rapport niet gevonden.');
    const v = r.data?.voorblad || {}; const a = r.data?.algemeen || {};
    if (!v.object_straat || !v.object_postcode) return fail(res, 422, 'Vul eerst het adres van het object in (voorblad).');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.inspectie_datum || '')) return fail(res, 422, 'Vul eerst de inspectiedatum in (A. Opdracht / opname).');
    try {
      const plek = await zoekLigging(`${v.object_straat} ${v.object_postcode} ${v.object_plaats || ''}`);
      if (!plek) return fail(res, 404, 'De ligging van het adres is niet gevonden.');
      const weer = await weerOp({ lat: plek.lat, lon: plek.lon, datum: a.inspectie_datum, tijd: a.inspectie_tijd });
      if (!weer) return fail(res, 404, 'Voor deze datum zijn (nog) geen weergegevens beschikbaar.');
      return json(res, 200, { ok: true, weer, bron: 'Open-Meteo' });
    } catch (err) { logError('rapport-weer', err); return fail(res, 503, 'Weergegevens ophalen lukt nu niet.'); }
  }
  if (actie === 'rapport-word' || actie === 'rapport-voorbeeld') {
    const r = await laad(id); if (!r) return fail(res, 404, 'Rapport niet gevonden.');
    const versie = Number(url.searchParams.get('versie')) || 0;
    let buf; let pad; let fotos;
    if (versie) {
      const v = await db.versionGet(r.id, versie); if (!v) return fail(res, 404, 'Versie niet gevonden.');
      pad = v.docx_path; fotos = v.images || [];
      if (actie === 'rapport-voorbeeld') buf = await db.getObject(BUCKET, pad);
    } else {
      fotos = await db.reportImages(r.id);
      buf = await genereer(db, r, { concept: true, images: fotos });
      if (actie === 'rapport-word') {
        // Vercel-functies mogen max. 4,5 MB terugsturen: het bestand gaat via de privé-opslag en een kortlopende link.
        pad = `${r.id}/concept/${r.report_nr}-concept.docx`;
        await db.removeObject(BUCKET, pad).catch(() => {});
        await db.putObject(BUCKET, pad, buf, DOCX);
      }
    }
    if (actie === 'rapport-word') {
      return json(res, 200, { ok: true, url: await db.signedUrl(BUCKET, pad, 120, `${r.report_nr}${versie ? `-v${versie}` : '-concept'}.docx`) });
    }
    // Foto's in het voorbeeld via kortlopende links (niet in de pagina zelf, i.v.m. de maximale omvang).
    const links = {};
    for (const f of fotos) links[`mvfs_${f.slot}_${f.position}`] = await db.signedUrl(BUCKET, f.path, 900);
    const { html, voettekst } = docxNaarHtml(buf, { media: (naam) => links[naam.replace(/^media\//, '').replace(/\.(jpeg|jpg|png)$/, '')] || null });
    return sendHtml(res, 200, voorbeeldPagina(r, html, voettekst, versie), { headers: { ...NOINDEX, 'Content-Security-Policy': "default-src 'none'; img-src data: 'self' https://*.supabase.co; style-src 'unsafe-inline'; frame-ancestors 'none'" } });
  }

  if (req.method !== 'POST') return fail(res, 405, 'Alleen POST is toegestaan.');
  const body = await readJson(req, 3 * 1024 * 1024);

  // ------------------------------------------------------------ medewerkers (ook getoond op /over-ons/)
  if (actie === 'rapport-adviseur-opslaan') {
    const cert = str(body.certificate, 60);
    const row = {
      name: str(body.name, 120), functie: str(body.functie, 80) || 'Bouwkundig adviseur', introductie: str(body.introductie, 600) || null,
      certificate: cert || null, active: body.active !== false, op_site: body.op_site !== false,
      volgorde: Math.max(0, Math.min(99, parseInt(body.volgorde, 10) || 0)),
    };
    if (row.name.length < 2) return fail(res, 422, 'Vul de naam in.');
    if (cert && cert.length < 3) return fail(res, 422, 'Het certificaatnummer is te kort.');
    try {
      const a = isUuid(body.id) ? await db.advisorUpdate(body.id, row) : await db.advisorCreate(row);
      return json(res, 200, { ok: true, item: a, website: await herbouwSite() });
    } catch (err) { if (err.status === 409) return fail(res, 409, 'Deze medewerker bestaat al.'); throw err; }
  }
  // Portretfoto voor /over-ons/ (openbaar, bucket 'nieuws' onder team/)
  if (actie === 'rapport-adviseur-foto') {
    const a = isUuid(body.id) ? await db.advisorById(body.id) : null;
    if (!a) return fail(res, 404, 'Medewerker niet gevonden.');
    if (body.verwijderen === true) {
      if (a.photo_path) await db.removeObject('nieuws', a.photo_path).catch((e) => logError('adviseur-foto', e));
      await db.advisorUpdate(a.id, { photo_path: null });
      return json(res, 200, { ok: true, foto_url: null, website: await herbouwSite() });
    }
    const type = String(body.type || '');
    if (!FOTO_TYPES[type]) return fail(res, 422, 'Alleen JPEG, PNG of WebP is toegestaan.');
    const bytes = Buffer.from(String(body.data || ''), 'base64');
    if (!bytes.length || bytes.length > 2 * 1024 * 1024) return fail(res, 422, 'De foto is leeg of groter dan 2 MB.');
    if (!FOTO_TYPES[type].every((b, i) => bytes[i] === b)) return fail(res, 422, 'Het bestand is geen geldige afbeelding.');
    const path = `team/${randomToken(12)}.${type.split('/')[1].replace('jpeg', 'jpg')}`;
    await db.putObject('nieuws', path, bytes, type);
    if (a.photo_path) await db.removeObject('nieuws', a.photo_path).catch((e) => logError('adviseur-foto', e));
    await db.advisorUpdate(a.id, { photo_path: path });
    return json(res, 200, { ok: true, foto_url: db.publicUrl('nieuws', path), website: await herbouwSite() });
  }

  // ------------------------------------------------------------ nieuw rapport
  if (actie === 'rapport-nieuw') {
    let data = schoon({}); let requestId = null;
    if (body.request_id) {
      const full = isUuid(body.request_id) ? await db.requestById(body.request_id) : null;
      if (!full) return fail(res, 404, 'Aanvraag niet gevonden.');
      data = schoon(vanAanvraag(full.request)); requestId = full.request.id;
    }
    const nr = await db.nextReportNr();
    const r = await db.reportCreate({ report_nr: nr, request_id: requestId, status: 'concept', data, created_by: user.id, updated_by: user.id });
    return json(res, 200, { ok: true, id: r.id, report_nr: r.report_nr });
  }

  const r = await laad(body.id);
  if (!r) return fail(res, 404, 'Rapport niet gevonden.');
  const advisor = r.advisor_id ? await db.advisorById(r.advisor_id) : null;
  const bewerkbaar = EDIT_STATUSES.includes(r.status);

  if (actie === 'rapport-opslaan') {
    if (!bewerkbaar) return fail(res, 409, 'Dit rapport is definitief. Start een nieuwe versie om het te wijzigen.');
    const data = schoon(body.data);
    let advisorId = r.advisor_id;
    if (body.advisor_id !== undefined) {
      const a = isUuid(body.advisor_id) ? await db.advisorById(body.advisor_id) : null;
      if (body.advisor_id && (!a || !a.active)) return fail(res, 422, 'Onbekende of inactieve adviseur.');
      advisorId = a ? a.id : null;
    }
    const status = EDIT_STATUSES.includes(body.status) ? body.status : r.status;
    const saved = await db.reportUpdate(r.id, { data, advisor_id: advisorId, status, updated_by: user.id });
    const adv = advisorId ? await db.advisorById(advisorId) : null;
    return json(res, 200, { ok: true, report: saved, controle: controle(data, { advisor: adv, images: await db.reportImages(r.id) }) });
  }

  if (actie === 'rapport-foto') {
    if (!bewerkbaar) return fail(res, 409, 'Dit rapport is definitief. Start een nieuwe versie om foto\'s te wijzigen.');
    const slot = String(body.slot || ''); const position = Number(body.position);
    if (!SLOTS[slot] || !(position >= 1 && position <= SLOTS[slot])) return fail(res, 422, 'Onbekend fotovak.');
    const buf = Buffer.from(String(body.data || ''), 'base64');
    if (!buf.length || buf.length > 2 * 1024 * 1024) return fail(res, 422, 'De foto is leeg of groter dan 2 MB.');
    const info = imageSize(buf);
    if (!info || info.width < 50 || info.height < 50) return fail(res, 422, 'Het bestand is geen geldige JPEG- of PNG-afbeelding.');
    const path = `${r.id}/fotos/${randomToken(12)}.${info.mime === 'image/png' ? 'png' : 'jpg'}`;
    await db.putObject(BUCKET, path, buf, info.mime);
    const oud = (await db.reportImages(r.id)).find((i) => i.slot === slot && i.position === position);
    if (oud) { await db.reportImageDelete(oud.id); await db.removeObject(BUCKET, oud.path).catch((e) => logError('rapport-foto', e)); }
    const img = await db.reportImageCreate({ report_id: r.id, slot, position, path, mime: info.mime, width: info.width, height: info.height, caption: str(body.caption, 200) });
    await db.reportUpdate(r.id, { updated_by: user.id });
    return json(res, 200, { ok: true, foto: { id: img.id, slot, position, caption: img.caption, url: await db.signedUrl(BUCKET, path, 900) } });
  }
  if (actie === 'rapport-foto-bijschrift' || actie === 'rapport-foto-verwijderen') {
    if (!bewerkbaar) return fail(res, 409, 'Dit rapport is definitief. Start een nieuwe versie om foto\'s te wijzigen.');
    const img = isUuid(body.foto_id) ? await db.reportImageById(body.foto_id) : null;
    if (!img || img.report_id !== r.id) return fail(res, 404, 'Foto niet gevonden.');
    if (actie === 'rapport-foto-bijschrift') { await db.reportImageUpdate(img.id, { caption: str(body.caption, 200) }); return json(res, 200, { ok: true }); }
    await db.reportImageDelete(img.id); await db.removeObject(BUCKET, img.path).catch((e) => logError('rapport-foto', e));
    return json(res, 200, { ok: true });
  }

  if (actie === 'rapport-definitief') {
    if (!bewerkbaar) return fail(res, 409, 'Dit rapport is al definitief.');
    const images = await db.reportImages(r.id);
    const chk = controle(r.data, { advisor, images });
    if (chk.fouten.length) return json(res, 422, { ok: false, error: 'Het rapport is nog niet compleet.', controle: chk });
    if (body.bevestig_risico !== r.data.conclusie.risico) return fail(res, 422, 'Bevestig de risicocategorie.');
    const buf = await genereer(db, r, { concept: false, images });
    const docxPath = `${r.id}/v${r.version}/${r.report_nr}-v${r.version}.docx`;
    await db.putObject(BUCKET, docxPath, buf, DOCX);
    await db.versionCreate({
      report_id: r.id, version: r.version, data: r.data, images: images.map(({ slot, position, path, mime, width, height, caption }) => ({ slot, position, path, mime, width, height, caption })),
      risk: r.data.conclusie.risico, template_version: TEMPLATE_VERSION, docx_path: docxPath, finalized_by: user.id,
    });
    await db.reportUpdate(r.id, { status: 'definitief', risk: r.data.conclusie.risico, updated_by: user.id });
    return json(res, 200, { ok: true });
  }

  if (actie === 'rapport-nieuwe-versie') {
    if (bewerkbaar) return fail(res, 409, 'Dit rapport is nog niet definitief.');
    await db.reportUpdate(r.id, { status: 'concept', version: r.version + 1, updated_by: user.id });
    return json(res, 200, { ok: true, version: r.version + 1 });
  }

  if (actie === 'rapport-pdf-upload' || actie === 'rapport-pdf-bevestig') {
    if (bewerkbaar) return fail(res, 409, 'Maak het rapport eerst definitief; de PDF hoort bij de definitieve versie.');
    const v = await db.versionGet(r.id, r.version);
    if (!v) return fail(res, 404, 'Definitieve versie niet gevonden.');
    if (v.sent_at) return fail(res, 409, 'Deze versie is al verstuurd. Start een nieuwe versie om de PDF te vervangen.');
    if (actie === 'rapport-pdf-upload') {
      const size = Number(body.grootte);
      if (body.type !== 'application/pdf' || !(size > 0 && size <= 50 * 1024 * 1024)) return fail(res, 422, 'Alleen een PDF-bestand tot 50 MB is toegestaan.');
      const pad = `${r.id}/v${r.version}/${randomToken(16)}.pdf`;
      return json(res, 200, { ok: true, upload_url: await db.signedUploadUrl(BUCKET, pad), pad });
    }
    const pad = String(body.pad || '');
    if (!new RegExp(`^${r.id}/v${r.version}/[A-Za-z0-9_-]{22}\\.pdf$`).test(pad)) return fail(res, 422, 'Ongeldig bestand.');
    if (!(await db.objectInfo(BUCKET, pad))) return fail(res, 422, 'De PDF is niet (volledig) geüpload. Probeer het opnieuw.');
    const pdf = await db.getObject(BUCKET, pad);
    if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') { await db.removeObject(BUCKET, pad).catch(() => {}); return fail(res, 422, 'Het bestand is geen geldige PDF.'); }
    if (v.pdf_path && v.pdf_path !== pad) await db.removeObject(BUCKET, v.pdf_path).catch((e) => logError('rapport-pdf', e));
    await db.versionUpdate(v.id, { pdf_path: pad, pdf_uploaded_at: new Date().toISOString() });
    return json(res, 200, { ok: true });
  }
  if (actie === 'rapport-pdf-bekijken') {
    const v = await db.versionGet(r.id, Number(body.versie) || r.version);
    if (!v?.pdf_path) return fail(res, 404, 'Er is nog geen PDF.');
    return json(res, 200, { ok: true, url: await db.signedUrl(BUCKET, v.pdf_path, 120, `${r.report_nr}-v${v.version}.pdf`) });
  }

  if (actie === 'rapport-versturen') {
    if (!['definitief', 'verzonden'].includes(r.status)) return fail(res, 409, 'Alleen een definitief rapport kan worden verstuurd.');
    const v = await db.versionGet(r.id, r.version);
    if (!v?.pdf_path) return fail(res, 422, 'Upload eerst de PDF van dit rapport.');
    const to = str(body.email, 160).toLowerCase();
    if (!isEmail(to)) return fail(res, 422, 'Vul een geldig e-mailadres in.');
    if (str(body.bevestig_email, 160).toLowerCase() !== to) return fail(res, 422, 'Bevestig het e-mailadres van de ontvanger door het nogmaals te typen.');
    if (v.sent_at && body.opnieuw !== true) return fail(res, 409, `Deze versie is al verstuurd naar ${v.sent_to}. Kies "Opnieuw versturen" als dat de bedoeling is.`);
    const pdf = await db.getObject(BUCKET, v.pdf_path);
    if (pdf.length > 35 * 1024 * 1024) return fail(res, 422, 'De PDF is te groot om als bijlage te versturen (max. 35 MB).');
    const naam = str(r.data?.algemeen?.opdrachtgever_naam, 120);
    const val = waarden(r.data, { advisor, report: r });
    const mail = rapportMail({ naam, nr: r.report_nr, adres: val.object_adres_volledig });
    let log = null;
    try { log = await db.emailCreate({ report_id: r.id, kind: `rapport_v${v.version}`, status: 'voorbereid' }); } catch (e) { logError('rapport-mail-log', e); }
    const result = await resendSend({
      to: [to], subject: mail.subject, html: mail.html, text: mail.text,
      attachments: [{ filename: `${r.report_nr}.pdf`, content: pdf.toString('base64') }],
    }, `rapport-${r.id}-v${v.version}-${sha256(to).slice(0, 10)}${body.opnieuw === true ? `-${Date.now()}` : ''}`);
    const status = result.ok ? 'verzonden' : 'mislukt';
    if (log) await db.emailUpdate(log.id, { status, provider_id: result.id || null, error: result.ok ? null : (result.skipped ? 'Niet verzonden: e-maildienst niet ingesteld' : result.error) }).catch((e) => logError('rapport-mail-log', e));
    if (!result.ok) return fail(res, 502, result.skipped ? 'De e-maildienst is niet ingesteld; het rapport is niet verstuurd.' : 'Versturen is mislukt. Probeer het later opnieuw.');
    await db.versionUpdate(v.id, { sent_at: new Date().toISOString(), sent_by: user.id, sent_to: to });
    await db.reportUpdate(r.id, { status: 'verzonden', updated_by: user.id });
    // Gekoppelde QuickScan-aanvraag: rapport beschikbaar maken op de trackingpagina (op verzoek van de adviseur)
    let tracking = null;
    if (body.koppel_tracking === true && r.request_id) {
      const full = await db.requestById(r.request_id);
      if (full) {
        const pad = `${r.request_id}/${randomToken(16)}.pdf`;
        await db.putObject('rapporten', pad, pdf, 'application/pdf');
        if (full.request.report_path) await db.removeObject('rapporten', full.request.report_path).catch(() => {});
        await db.updateRequest(r.request_id, { report_path: pad, report_name: `rapport-${full.request.dossier_nr}.pdf`, report_uploaded_at: new Date().toISOString() });
        if (full.request.status !== 'afgerond') await db.setStatus(r.request_id, 'afgerond', '', user.id);
        tracking = 'bijgewerkt';
      }
    }
    return json(res, 200, { ok: true, mail: 'verzonden', tracking });
  }

  if (actie === 'rapport-verwijderen') {
    if (user.role !== 'beheerder') return fail(res, 403, 'Alleen een beheerder kan rapporten verwijderen.');
    if (body.bevestig !== r.report_nr) return fail(res, 422, 'Typ ter bevestiging het rapportnummer.');
    const images = await db.reportImages(r.id); const versions = await Promise.all((await db.versionsList(r.id)).map((v) => db.versionGet(r.id, v.version)));
    for (const p of [...images.map((i) => i.path), ...versions.flatMap((v) => [v.docx_path, v.pdf_path]).filter(Boolean)]) await db.removeObject(BUCKET, p).catch((e) => logError('rapport-verwijderen', e));
    await db.reportDelete(r.id);
    return json(res, 200, { ok: true });
  }
  if (actie === 'rapport-status') {
    if (!bewerkbaar || !EDIT_STATUSES.includes(body.status)) return fail(res, 422, 'Deze status kan hier niet worden gekozen.');
    await db.reportUpdate(r.id, { status: body.status, updated_by: user.id });
    return json(res, 200, { ok: true });
  }
  return null;
}

/** Word-bestand met de huidige gegevens en foto's van het rapport. */
async function genereer(db, r, { concept, images } = {}) {
  const imgs = images || await db.reportImages(r.id);
  const withBuf = await Promise.all(imgs.map(async (i) => ({ ...i, buf: await db.getObject(BUCKET, i.path) })));
  const advisor = r.advisor_id ? await db.advisorById(r.advisor_id) : null;
  return maakDocx({ data: r.data, advisor, report: r, images: withBuf, concept });
}

function voorbeeldPagina(r, html, voettekst, versie) {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta name="referrer" content="no-referrer">
<title>Voorbeeld ${esc(r.report_nr)}</title>
<style>body{margin:0;background:#e9edf1;font-family:Calibri,Arial,sans-serif;color:#1d2b3a}.rv-bar{position:sticky;top:0;background:#102945;color:#fff;padding:10px 18px;font-size:14px}.rv-bar strong{color:#dfb65a}
.rv-doc{max-width:794px;margin:18px auto;background:#fff;padding:48px 56px;box-shadow:0 6px 20px rgba(0,0,0,.12);font-size:13px;line-height:1.45}
.rv-doc h2{color:#0a2f41;font-size:15px;margin:22px 0 8px}.rv-doc img{max-width:100%;height:auto;display:block;margin:6px 0}.rv-doc p{margin:4px 0}
.rv-table{border-collapse:collapse;width:100%;margin:8px 0}.rv-table td{border:1px solid #c9d1d9;padding:3px 6px;vertical-align:top}.rv-table img{max-width:160px}
.rv-page{border:0;border-top:2px dashed #c9d1d9;margin:26px -56px}.rv-open{color:#c00000}.rv-foot{max-width:794px;margin:0 auto 30px;font-size:12px;color:#5f7286}</style></head>
<body><div class="rv-bar">Voorbeeld <strong>${esc(r.report_nr)}${versie ? ` · versie ${versie} (definitief)` : ' · concept'}</strong> – inhoudelijke controle van teksten, tabellen en foto's. De exacte opmaak en paginering zie je in het Word-bestand. Rood = nog niet ingevuld.</div>
<div class="rv-doc">${html}</div><p class="rv-foot">Voettekst: ${voettekst}</p></body></html>`;
}

function rapportMail({ naam, nr, adres }) {
  const first = String(naam || '').trim();
  const subject = `Uw funderingsrapport ${nr}${adres ? ` – ${adres}` : ''}`;
  const html = `<!doctype html><html lang="nl"><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1d2b3a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#102945;padding:22px 28px;color:#fff;font-size:18px;font-weight:bold">MV Funderingsscan</td></tr><tr><td style="height:4px;background:#c99b3e"></td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6">
<p style="margin:0 0 14px">Beste ${esc(first || 'opdrachtgever')},</p>
<p style="margin:0 0 14px">In de bijlage vindt u het rapport van het Fase 0 Funderingsrisico-onderzoek (QuickScan)${adres ? ` voor ${esc(adres)}` : ''}, rapportnummer <strong>${esc(nr)}</strong>.</p>
<p style="margin:0 0 14px">Heeft u vragen over de uitkomst of het advies? Neem dan gerust contact met ons op en vermeld het rapportnummer.</p>
<p style="margin:0">Met vriendelijke groet,<br>MV Funderingsscan</p>
</td></tr><tr><td style="padding:18px 28px;background:#f4f6f8;font-size:13px;color:#5f7286">MV Funderingsscan B.V. · Mr. P.J. Troelstraweg 149 unit 23, 8919 AA Leeuwarden · +31 (0) 582037172 · info@mvadviseurs.nl</td></tr>
</table></td></tr></table></body></html>`;
  const text = `Beste ${first || 'opdrachtgever'},\n\nIn de bijlage vindt u het rapport van het Fase 0 Funderingsrisico-onderzoek (QuickScan)${adres ? ` voor ${adres}` : ''}, rapportnummer ${nr}.\n\nHeeft u vragen? Neem contact op en vermeld het rapportnummer.\n\nMet vriendelijke groet,\nMV Funderingsscan\n+31 (0) 582037172 · info@mvadviseurs.nl`;
  return { subject, html, text };
}
