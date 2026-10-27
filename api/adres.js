/**
 * GET /api/adres/?postcode=8919AA&huisnummer=149
 * Vult in formulieren automatisch straat, plaats en (indien bekend) bouwjaar aan, via PDOK (open data van de overheid).
 * Er wordt niets opgeslagen of gelogd. Antwoorden worden een dag in de cache van Vercel bewaard.
 */
import { sendJson, clientKey, logError } from './_lib/http.js';
import { getDb } from './_lib/db.js';
import { zoekAdres, normPostcode, splitHuisnummer } from './_lib/adres.js';

const MAX_PER_UUR = 120;

export default async function handler(req, res) {
  const headers = { 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' };
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'Alleen GET is toegestaan.' }, headers);
  const url = new URL(req.url, 'http://localhost');
  const pc = normPostcode(url.searchParams.get('postcode'));
  const hn = splitHuisnummer(url.searchParams.get('huisnummer'));
  if (!pc || !hn) return sendJson(res, 422, { ok: false, error: 'Vul een geldige postcode en een huisnummer in.' }, headers);

  const db = getDb();
  try {
    if (db) {
      const key = `adres:${clientKey(req)}`;
      if (await db.failuresSince(key, new Date(Date.now() - 3600e3).toISOString()) >= MAX_PER_UUR) {
        return sendJson(res, 429, { ok: false, error: 'Te veel zoekopdrachten. Vul het adres zelf in.' }, headers);
      }
      await db.addLoginAttempt(key, false);
    }
    const a = await zoekAdres(pc, url.searchParams.get('huisnummer'));
    const cache = { ...headers, 'Cache-Control': 'public, max-age=0, s-maxage=86400' };
    if (!a) return sendJson(res, 404, { ok: false, error: 'Dit adres hebben we niet gevonden. Controleer postcode en huisnummer, of vul het adres zelf in.' }, cache);
    if (a.meerdere) return sendJson(res, 409, { ok: false, error: 'Er zijn meerdere adressen met dit huisnummer. Vul ook de letter of toevoeging in (bijv. 12a).', opties: a.meerdere }, cache);
    const { lat, lon, ...openbaar } = a; // ligging is niet nodig in het formulier
    void lat; void lon;
    return sendJson(res, 200, { ok: true, adres: openbaar, bron: 'PDOK / BAG (Kadaster)' }, cache);
  } catch (err) {
    logError('adres', err);
    return sendJson(res, 503, { ok: false, error: 'Adres opzoeken lukt nu niet. Vul het adres zelf in.' }, headers);
  }
}
