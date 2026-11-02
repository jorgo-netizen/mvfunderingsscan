/**
 * Koppeling voor de redactiebot op de pc (scripts/redactie). Beveiligd met REDACTIE_TOKEN (Bearer).
 *
 * De bot mag hier ALLEEN:
 *   - context ophalen (bronnen, instellingen, tellingen, bestaande titels, regeneratieverzoeken)
 *   - verzamelde nieuwsitems opslaan en de status van een bron bijwerken
 *   - concepten aanleveren (altijd status "concept") en een regeneratie terugzetten
 *   - een logregel schrijven en oude items opruimen
 * Er is geen actie om nieuwsberichten te maken, te wijzigen of te publiceren. Dat is bewust en wordt getest.
 */
import { getDb } from './_lib/db.js';
import { sendJson, readJson, safeEqual, clientKey, logError, isUuid } from './_lib/http.js';
import { schoonConcept, instellingen, TYPES } from './_lib/redactie.js';

const NOINDEX = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' };
const json = (res, status, body) => sendJson(res, status, body, NOINDEX);
const fail = (res, status, error) => json(res, status, { ok: false, error });
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const MAX_FOUTEN_PER_UUR = 10;

/** Begin van de periode (week begint op maandag, Nederlandse tijd benaderd met UTC). */
function periodeStart(per, nu = new Date()) {
  const d = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), nu.getUTCDate()));
  if (per === 'maand') d.setUTCDate(1); else d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Alleen POST is toegestaan.');
  const db = getDb();
  const token = process.env.REDACTIE_TOKEN || '';
  if (!db) return fail(res, 503, 'Database niet ingesteld.');
  if (token.length < 32) return fail(res, 503, 'De redactiekoppeling is niet ingesteld (REDACTIE_TOKEN ontbreekt of is te kort).');

  // Rate limiting op mislukte pogingen (gehasht IP), daarna token controleren in constante tijd
  const key = `redactie:${clientKey(req)}`;
  try {
    if (await db.failuresSince(key, new Date(Date.now() - 3600e3).toISOString()) >= MAX_FOUTEN_PER_UUR) return fail(res, 429, 'Te veel mislukte pogingen. Probeer het later opnieuw.');
  } catch (err) { logError('redactie-rate', err); }
  const auth = String(req.headers?.authorization || '');
  const gegeven = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!gegeven || !safeEqual(gegeven, token)) {
    await db.addLoginAttempt(key, false).catch(() => {});
    return fail(res, 401, 'Niet geautoriseerd.');
  }

  try {
    const body = await readJson(req, 1024 * 1024);
    const actie = String(body.actie || '');

    if (actie === 'context') {
      const inst = instellingen(await db.redInstellingen());
      const [bronnen, concepten, nieuws, items] = await Promise.all([db.redBronnen(), db.redConceptenList({}), db.newsList(), db.redItemsList({ status: 'nieuw', limit: 300 })]);
      const tellingen = {};
      for (const t of TYPES) {
        const per = inst.frequentie[t]?.per === 'maand' ? 'maand' : 'week';
        const vanaf = periodeStart(per);
        tellingen[t] = {
          per, aantal: concepten.filter((c) => c.type === t && c.created_at >= vanaf).length, doel: Math.max(0, parseInt(inst.frequentie[t]?.aantal, 10) || 0),
          open: concepten.filter((c) => c.type === t && c.status === 'concept').length, voorraad: Math.max(0, parseInt(inst.voorraad[t], 10) || 0),
        };
      }
      const regenereer = [];
      for (const c of concepten.filter((x) => x.regenereren && x.status === 'concept')) {
        const vol = await db.redConceptGet(c.id);
        regenereer.push({ ...vol, items: await db.redItemsByIds(vol.item_ids || []) });
      }
      return json(res, 200, {
        ok: true, instellingen: inst, bronnen: bronnen.filter((b) => b.actief), tellingen, regenereer, items,
        bekend: [...concepten.map((c) => ({ titel: c.titel, type: c.type, status: c.status })), ...nieuws.map((n) => ({ titel: n.title, url: `/nieuws/${n.slug}/` }))],
      });
    }

    if (actie === 'items') {
      const rows = (Array.isArray(body.items) ? body.items : []).slice(0, 300).map((i) => ({
        bron_id: isUuid(i.bron_id) ? i.bron_id : null, bron_naam: str(i.bron_naam, 120), titel: str(i.titel, 300),
        url: str(i.url, 1000), samenvatting: str(i.samenvatting, 1000),
        gepubliceerd_op: /^\d{4}-\d{2}-\d{2}T/.test(String(i.gepubliceerd_op || '')) ? i.gepubliceerd_op : null,
        onderwerp: str(i.onderwerp, 80), regio: str(i.regio, 60),
        relevantie: Math.max(0, Math.min(100, parseInt(i.relevantie, 10) || 0)), betrouwbaarheid: Math.max(1, Math.min(5, parseInt(i.betrouwbaarheid, 10) || 3)),
      })).filter((i) => i.titel.length >= 3 && /^https?:\/\//.test(i.url));
      const nieuw = await db.redItemsInsert(rows);
      for (const b of (Array.isArray(body.bronnen) ? body.bronnen : []).slice(0, 50)) {
        if (isUuid(b.id)) await db.redBronUpdate(b.id, { laatste_check: new Date().toISOString(), laatste_fout: b.fout ? str(b.fout, 300) : null });
      }
      return json(res, 200, { ok: true, opgeslagen: nieuw.length });
    }

    if (actie === 'concept') {
      const c = schoonConcept(body.concept || {});
      if (c.titel.length < 3) return fail(res, 422, 'Titel ontbreekt.');
      let opgeslagen;
      if (body.vervangt) {
        // regeneratie: alleen een concept dat een medewerker heeft teruggestuurd en nog concept is
        const oud = isUuid(body.vervangt) ? await db.redConceptGet(body.vervangt) : null;
        if (!oud || oud.status !== 'concept' || !oud.regenereren) return fail(res, 409, 'Dit concept staat niet klaar om opnieuw te genereren.');
        opgeslagen = await db.redConceptUpdate(oud.id, { ...c, regenereren: false, regenereer_notitie: '' });
      } else {
        opgeslagen = await db.redConceptCreate({ ...c, status: 'concept' });
      }
      for (const id of c.item_ids) await db.redItemUpdate(id, { status: 'gebruikt' }).catch(() => {});
      return json(res, 200, { ok: true, id: opgeslagen.id, status: opgeslagen.status });
    }

    if (actie === 'run') {
      const status = ['ok', 'waarschuwing', 'fout'].includes(body.status) ? body.status : 'fout';
      const aantallen = body.aantallen && typeof body.aantallen === 'object' && JSON.stringify(body.aantallen).length < 2000 ? body.aantallen : {};
      await db.redRunCreate({ taak: str(body.taak, 60) || 'onbekend', status, melding: str(body.melding, 2000), aantallen, gestart_op: /^\d{4}-/.test(String(body.gestart_op || '')) ? body.gestart_op : new Date().toISOString(), klaar_op: new Date().toISOString() });
      return json(res, 200, { ok: true });
    }

    if (actie === 'opruimen') {
      const dagen = Math.max(14, Math.min(365, parseInt(instellingen(await db.redInstellingen()).bewaar_dagen, 10) || 60));
      await db.redItemsDeleteBefore(new Date(Date.now() - dagen * 864e5).toISOString());
      return json(res, 200, { ok: true });
    }

    return fail(res, 404, 'Onbekende actie.');
  } catch (err) {
    if (err.status === 413) return fail(res, 413, 'Het verzoek is te groot.');
    if (err.status === 400) return fail(res, 400, 'Ongeldige gegevens.');
    logError('redactie', err);
    return fail(res, 500, 'Er ging iets mis.');
  }
}
