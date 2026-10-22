/**
 * QuickScan Track & Trace – openbare API voor de klantpagina /status/.
 * POST { token }                    → status van het dossier (alleen klantzichtbare gegevens)
 * POST { token, actie: 'rapport' }  → kortlopende downloadlink (60 s) voor het afgeronde rapport
 *
 * Het token komt in de body (nooit in de URL) en wordt niet gelogd. Een ongeldig, ingetrokken of
 * onbekend token geeft altijd dezelfde melding, zodat niet te achterhalen is of een dossier bestaat.
 */
import { getDb } from './_lib/db.js';
import { sendJson, readJson, clientKey, logError } from './_lib/http.js';
import { hashToken, isTokenShape, customerView } from './_lib/tracking.js';

const NOT_FOUND = { ok: false, error: 'Deze link is ongeldig of niet meer actief. Neem contact met ons op als je je dossier wilt volgen.' };
const MAX_INVALID_PER_HOUR = 30;

export default async function handler(req, res) {
  const headers = { 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Alleen POST is toegestaan.' }, headers);
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'Het volgen van aanvragen is nog niet beschikbaar.' }, headers);

  let body;
  try { body = await readJson(req, 4096); } catch (e) { return sendJson(res, e.status || 400, { ok: false, error: 'Ongeldig verzoek.' }, headers); }

  try {
    const rateKey = `status:${clientKey(req)}`;
    const since = new Date(Date.now() - 3600e3).toISOString();
    if (await db.failuresSince(rateKey, since) >= MAX_INVALID_PER_HOUR) {
      return sendJson(res, 429, { ok: false, error: 'Te veel pogingen. Probeer het later opnieuw.' }, headers);
    }
    const token = body.token;
    const found = isTokenShape(token) ? await db.requestByTokenHash(hashToken(token)) : null;
    if (!found) {
      await db.addLoginAttempt(rateKey, false);
      return sendJson(res, 404, NOT_FOUND, headers);
    }

    if (body.actie === 'rapport') {
      const r = found.request;
      if (r.status !== 'afgerond' || !r.report_path) return sendJson(res, 404, { ok: false, error: 'Er is (nog) geen rapport beschikbaar.' }, headers);
      const url = await db.signedUrl('rapporten', r.report_path, 60, r.report_name || `rapport-${r.dossier_nr}.pdf`);
      return sendJson(res, 200, { ok: true, url, expires_in: 60 }, headers);
    }
    return sendJson(res, 200, { ok: true, ...customerView(found) }, headers);
  } catch (err) {
    logError('status', err);
    return sendJson(res, 500, { ok: false, error: 'De status kan nu niet worden opgehaald. Probeer het later opnieuw.' }, headers);
  }
}
