/**
 * Vercel serverless functie: verwerkt aanvraag- en contactformulieren en mailt ze via Resend.
 *
 * Omgevingsvariabelen (Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY   API-sleutel van https://resend.com (verplicht in productie)
 *   AANVRAAG_TO      ontvanger, standaard info@mvadviseurs.nl
 *   AANVRAAG_FROM    afzender op een in Resend geverifieerd domein,
 *                    bijv. "MV Funderingsscan <aanvraag@mvfunderingsscan.nl>"
 *
 * Lokaal (npm run dev) zonder RESEND_API_KEY wordt de aanvraag alleen in de terminal getoond.
 */

const MAX_LEN = 4000;
const FORMS = {
  aanvraag: 'Nieuwe aanvraag funderingsscan',
  contact: 'Nieuwe vraag via contactformulier',
  home: 'Nieuwe aanvraag via de homepage',
};
const LABELS = {
  naam: 'Naam', email: 'E-mail', telefoon: 'Telefoon', contactmoment: 'Voorkeur contactmoment',
  adres: 'Adres', postcode: 'Postcode', huisnummer: 'Huisnummer', plaats: 'Plaats',
  woningtype: 'Type woning', bouwjaar: 'Bouwjaar', type: 'Type aanvraag', situatie: 'Situatie',
  scheuren: 'Scheuren', scheefstand: 'Scheefstand / hellende vloeren', klemmen: 'Klemmende deuren of ramen',
  kruipruimte: 'Kruipruimte', onderwerp: 'Onderwerp', vraag: 'Vraag', opmerking: 'Opmerking',
};
const TYPE_LABELS = { fase0: 'Fase 0 Quick Scan', fase1: 'Fase 1 onderzoek', onbekend: 'Weet ik nog niet', zakelijk: 'Zakelijke aanvraag' };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Alleen POST is toegestaan.' });

  let data;
  try { data = await readBody(req); } catch { return send(res, 400, { ok: false, error: 'Ongeldige gegevens.' }); }

  const form = FORMS[data.form] ? data.form : 'aanvraag';
  const fields = data.fields && typeof data.fields === 'object' ? data.fields : {};

  // Honeypot: bots vullen dit verborgen veld in. Doe alsof het gelukt is.
  if (fields.website) return send(res, 200, { ok: true });

  const clean = {};
  for (const [k, v] of Object.entries(fields)) {
    if (!LABELS[k] && k !== 'privacy') continue;
    clean[k] = String(v ?? '').trim().slice(0, MAX_LEN);
  }
  if (!clean.naam || !isEmail(clean.email || '')) {
    return send(res, 422, { ok: false, error: 'Vul in elk geval je naam en een geldig e-mailadres in.' });
  }
  if (clean.privacy !== 'on' && clean.privacy !== 'true') {
    return send(res, 422, { ok: false, error: 'Geef toestemming om je gegevens te gebruiken voor deze aanvraag.' });
  }

  const rows = Object.entries(clean)
    .filter(([k, v]) => k !== 'privacy' && v)
    .map(([k, v]) => [LABELS[k], k === 'type' ? (TYPE_LABELS[v] || v) : v]);
  const subject = `${FORMS[form]} – ${clean.naam}${clean.plaats ? ` (${clean.plaats})` : ''}`;
  const html = `<h2 style="font-family:Arial,sans-serif;color:#102945">${esc(FORMS[form])}</h2>
<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
${rows.map(([l, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#5f7286;vertical-align:top"><strong>${esc(l)}</strong></td><td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`).join('\n')}
</table>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#8a97a5">Verstuurd via mvfunderingsscan.nl · toestemming privacy: ja</p>`;
  const text = rows.map(([l, v]) => `${l}: ${v}`).join('\n');

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.VERCEL_ENV === 'production') {
      console.error('RESEND_API_KEY ontbreekt – aanvraag niet verstuurd.');
      return send(res, 503, { ok: false, error: 'Verzenden lukt nu niet. Bel of mail ons direct.' });
    }
    console.log(`\n[formulier: ${form}] ${subject}\n${text}\n(niet gemaild: RESEND_API_KEY ontbreekt – lokaal is dat normaal)\n`);
    return send(res, 200, { ok: true, dev: true });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.AANVRAAG_FROM || 'MV Funderingsscan <onboarding@resend.dev>',
        to: [process.env.AANVRAAG_TO || 'info@mvadviseurs.nl'],
        reply_to: clean.email,
        subject,
        html,
        text,
      }),
    });
    if (!r.ok) {
      console.error('Resend-fout', r.status, await r.text());
      return send(res, 502, { ok: false, error: 'Verzenden lukt nu niet. Bel of mail ons direct.' });
    }
    return send(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    return send(res, 502, { ok: false, error: 'Verzenden lukt nu niet. Bel of mail ons direct.' });
  }
}
