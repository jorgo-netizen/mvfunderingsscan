/**
 * Vertaalknop (NL → EN) via DeepL.
 *   GET  /api/vertaal/                → { beschikbaar }  (is DEEPL_API_KEY ingesteld?)
 *   POST /api/vertaal/ { segmenten }  → { vertalingen }  (zelfde volgorde)
 *
 * Een segment is een stuk HTML van één blok tekst op de pagina (bijv. een alinea met een link erin), zodat DeepL
 * hele zinnen vertaalt in plaats van losse woorden. Elke vertaling wordt bewaard (database of geheugen): dezelfde
 * tekst wordt maar één keer naar DeepL gestuurd. Er gaan alleen teksten van de website naar DeepL, geen ingevulde
 * formuliergegevens. Een maandlimiet (DEEPL_MAAND_LIMIET, standaard 450.000 tekens) beschermt tegen onverwachte kosten.
 */
import { sendJson, readJson, clientKey, logError, sha256, sameOrigin } from './_lib/http.js';
import { getDb } from './_lib/db.js';

const DOEL = 'EN-GB';
const MAX_SEGMENTEN = 50;
const MAX_SEGMENT = 6000;
const MAX_TOTAAL = 60000;
const MAX_AANROEPEN_PER_UUR = 200; // aanroepen die DeepL nodig hebben, per IP-adres
const MERKEN = ['MV Funderingsscan B.V.', 'MV Funderingsscan', 'Track &amp; Trace', 'Track & Trace'];
const geheugen = new Map(); // fallback-cache zonder database (per serverinstantie)

const maand = () => new Date().toISOString().slice(0, 7);
const sleutel = (h) => sha256(`${DOEL}\n${h}`);
// Merknamen niet laten vertalen: tijdelijk in een tag die DeepL overslaat.
const bescherm = (h) => MERKEN.reduce((s, m) => s.split(m).join(`<x-keep>${m}</x-keep>`), h);
const herstel = (h) => h.replace(/<x-keep>([\s\S]*?)<\/x-keep>/g, '$1');

// Alleen lokaal (npm run dev): zet tekst in hoofdletters in plaats van DeepL aan te roepen, om de knop te testen.
const testModus = () => process.env.MVFS_VERTAAL_TEST === '1' && process.env.VERCEL_ENV !== 'production';
function testVertaling(h) {
  let keep = 0;
  return bescherm(h).split(/(<[^>]+>)/).map((d) => {
    if (d.startsWith('<')) { if (/^<x-keep/.test(d)) keep++; else if (/^<\/x-keep/.test(d)) keep--; return d; }
    return keep ? d : d.toUpperCase();
  }).join('');
}

async function deepl(teksten) {
  if (testModus()) return teksten.map((t) => herstel(testVertaling(t)));
  const key = process.env.DEEPL_API_KEY;
  const base = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const r = await fetch(`${base}/v2/translate`, {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: teksten.map(bescherm), source_lang: 'NL', target_lang: DOEL,
      tag_handling: 'html', ignore_tags: ['x-keep'], preserve_formatting: true, formality: 'prefer_less',
    }),
  });
  if (r.status === 456) throw Object.assign(new Error('DeepL-tegoed op'), { status: 503 });
  if (!r.ok) throw Object.assign(new Error(`DeepL ${r.status}`), { status: 502 });
  const data = await r.json();
  return (data.translations || []).map((t) => herstel(t.text));
}

export default async function handler(req, res) {
  const headers = { 'X-Robots-Tag': 'noindex, nofollow' };
  const aan = !!process.env.DEEPL_API_KEY || testModus();
  if (req.method === 'GET') return sendJson(res, 200, { ok: true, beschikbaar: aan }, { ...headers, 'Cache-Control': 'public, max-age=300' });
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Alleen GET of POST.' }, headers);
  if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'Niet toegestaan.' }, headers);
  if (!aan) return sendJson(res, 503, { ok: false, error: 'Vertalen is nog niet ingesteld.' }, headers);

  let body;
  try { body = await readJson(req, 200 * 1024); } catch (e) { return sendJson(res, e.status || 400, { ok: false, error: 'Ongeldig verzoek.' }, headers); }
  const seg = Array.isArray(body.segmenten) ? body.segmenten : null;
  if (!seg || !seg.length || seg.length > MAX_SEGMENTEN || seg.some((s) => typeof s !== 'string' || !s.trim() || s.length > MAX_SEGMENT)
    || seg.reduce((n, s) => n + s.length, 0) > MAX_TOTAAL) {
    return sendJson(res, 422, { ok: false, error: 'Ongeldige segmenten.' }, headers);
  }

  const db = getDb();
  try {
    const keys = seg.map(sleutel);
    const bekend = new Map();
    if (db?.translationsGet) for (const t of await db.translationsGet([...new Set(keys)])) bekend.set(t.key, t.html);
    else for (const k of keys) if (geheugen.has(k)) bekend.set(k, geheugen.get(k));

    const nodig = [...new Map(seg.map((s, i) => [keys[i], s])).entries()].filter(([k]) => !bekend.has(k));
    if (nodig.length) {
      const tekens = nodig.reduce((n, [, s]) => n + s.length, 0);
      const limiet = Number(process.env.DEEPL_MAAND_LIMIET) || 450000;
      if (db) {
        const rk = `vertaal:${clientKey(req)}`;
        if (await db.failuresSince(rk, new Date(Date.now() - 3600e3).toISOString()) >= MAX_AANROEPEN_PER_UUR) {
          return sendJson(res, 429, { ok: false, error: 'Te veel vertaalverzoeken. Probeer het later opnieuw.' }, headers);
        }
        await db.addLoginAttempt(rk, false);
        if (db.translationUsage && (await db.translationUsage(maand())) + tekens > limiet) {
          return sendJson(res, 503, { ok: false, error: 'De vertaalfunctie is deze maand niet meer beschikbaar.' }, headers);
        }
      }
      const uit = await deepl(nodig.map(([, s]) => s));
      const rijen = nodig.map(([k, s], i) => ({ key: k, target: DOEL, html: uit[i] ?? s, chars: s.length }));
      for (const r of rijen) bekend.set(r.key, r.html);
      if (db?.translationsPut) {
        await db.translationsPut(rijen);
        await db.translationUsageAdd(maand(), tekens);
      } else for (const r of rijen) geheugen.set(r.key, r.html);
    }
    return sendJson(res, 200, { ok: true, vertalingen: keys.map((k) => bekend.get(k)) }, headers);
  } catch (err) {
    logError('vertaal', err);
    return sendJson(res, err.status === 503 ? 503 : 502, { ok: false, error: 'Vertalen lukt nu niet.' }, headers);
  }
}
