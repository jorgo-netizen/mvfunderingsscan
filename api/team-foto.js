/**
 * Openbare portretfoto van een adviseur (via rewrite in vercel.json): /teamfoto/<naam-slug>/
 * Stuurt door naar de foto die in het beheerportaal (Adviseurs) is ingesteld, of geeft 404.
 * Op /over-ons/ toont de site dan de initialen. Wijzigingen zijn binnen ongeveer een minuut zichtbaar.
 */
import { getDb } from './_lib/db.js';
import { sendText, logError } from './_lib/http.js';

const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const CACHE = 'public, max-age=300, s-maxage=60, stale-while-revalidate=600';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Alleen GET is toegestaan.');
  const url = new URL(req.url, 'http://localhost');
  const naam = (req.query && typeof req.query.naam === 'string' ? req.query.naam : url.searchParams.get('naam')) || '';
  const db = getDb();
  try {
    const a = db && /^[a-z0-9-]{2,80}$/.test(naam) ? (await db.advisorsList()).find((x) => x.active && x.photo_path && slug(x.name) === naam) : null;
    if (!a) return sendText(res, 404, 'Geen foto.', 'text/plain; charset=utf-8', CACHE);
    res.statusCode = 302;
    res.setHeader('Location', db.publicUrl('nieuws', a.photo_path));
    res.setHeader('Cache-Control', CACHE);
    return res.end();
  } catch (err) {
    logError('team-foto', err);
    return sendText(res, 404, 'Geen foto.', 'text/plain; charset=utf-8', 'no-store');
  }
}
