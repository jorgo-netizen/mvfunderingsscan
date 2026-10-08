/**
 * Vercel serverless functie voor de interactieve hulpmiddelen (funderingscheck, aankoop-check,
 * kostenwijzer, "vertel ons wat je ziet" met foto's). Mailt de aanvraag via Resend naar MV Funderingsscan.
 * Er wordt niets op de server opgeslagen.
 *
 * Gebruikt dezelfde omgevingsvariabelen als api/aanvraag.js: RESEND_API_KEY, AANVRAAG_TO, AANVRAAG_FROM.
 * Foto's: maximaal 3, door de browser al verkleind tot JPEG (daarmee zijn EXIF-gegevens verwijderd).
 */

const TOOLS = {
  funderingscheck: 'Gratis Funderingscheck',
  aankoopcheck: 'Aankoop-check',
  kostenwijzer: 'Kostenwijzer – prijsaanvraag',
  vertelwatjeziet: 'Vertel ons wat je ziet (met foto\'s)',
  algemeen: 'Vraag via hulpmiddelen',
};
const LABELS = { naam: 'Naam', email: 'E-mail', telefoon: 'Telefoon', plaats: 'Plaats', bouwjaar: 'Bouwjaar', bericht: 'Toelichting' };
const MAX_LEN = 4000;
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024; // na verkleinen ruim voldoende

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

async function resend(key, payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Alleen POST is toegestaan.' });

  let data;
  try { data = await readBody(req); } catch { return send(res, 400, { ok: false, error: 'Ongeldige gegevens.' }); }

  const tool = TOOLS[data.tool] ? data.tool : 'algemeen';
  const f = data.fields && typeof data.fields === 'object' ? data.fields : {};
  if (f.website) return send(res, 200, { ok: true }); // honeypot

  const clean = {};
  for (const k of Object.keys(LABELS)) clean[k] = String(f[k] ?? '').trim().slice(0, MAX_LEN);
  if (!clean.naam || !isEmail(clean.email)) return send(res, 422, { ok: false, error: 'Vul in elk geval je naam en een geldig e-mailadres in.' });
  if (f.privacy !== 'on') return send(res, 422, { ok: false, error: 'Geef toestemming om je gegevens te gebruiken voor je vraag.' });
  const kopie = f.kopie === 'on';
  const samenvatting = String(data.samenvatting || '').slice(0, 6000);
  const page = String(data.page || '').slice(0, 200);

  // Foto's controleren: alleen JPEG (FF D8 FF), maximaal 3, beperkte grootte.
  const photos = Array.isArray(data.photos) ? data.photos.slice(0, MAX_PHOTOS + 1) : [];
  if (photos.length > MAX_PHOTOS) return send(res, 422, { ok: false, error: `Je kunt maximaal ${MAX_PHOTOS} foto's meesturen.` });
  const attachments = [];
  for (const [i, p] of photos.entries()) {
    const b64 = String(p?.data || '');
    if (!/^[A-Za-z0-9+/=]+$/.test(b64)) return send(res, 422, { ok: false, error: 'Een van de foto\'s kon niet worden verwerkt. Probeer het opnieuw.' });
    const buf = Buffer.from(b64, 'base64');
    if (buf.length > MAX_PHOTO_BYTES || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
      return send(res, 422, { ok: false, error: 'Een van de foto\'s kon niet worden verwerkt. Probeer een andere foto.' });
    }
    attachments.push({ filename: `foto-${i + 1}.jpg`, content: b64 });
  }

  const rows = Object.entries(clean).filter(([, v]) => v).map(([k, v]) => [LABELS[k], v]);
  const subject = `${TOOLS[tool]} – ${clean.naam}${clean.plaats ? ` (${clean.plaats})` : ''}`;
  const table = (list) => `<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">${list.map(([l, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#5f7286;vertical-align:top"><strong>${esc(l)}</strong></td><td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</table>`;
  const html = `<h2 style="font-family:Arial,sans-serif;color:#102945">${esc(TOOLS[tool])}</h2>
${table(rows)}
${samenvatting ? `<h3 style="font-family:Arial,sans-serif;color:#102945">Antwoorden uit de tool</h3><pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${esc(samenvatting)}</pre>` : ''}
<p style="font-family:Arial,sans-serif;font-size:12px;color:#8a97a5">Pagina: ${esc(page)} · foto's: ${attachments.length} · kopie naar bezoeker: ${kopie ? 'ja' : 'nee'} · toestemming privacy: ja</p>`;
  const text = `${rows.map(([l, v]) => `${l}: ${v}`).join('\n')}\n\n${samenvatting}`;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.VERCEL_ENV === 'production') {
      console.error('RESEND_API_KEY ontbreekt – lead niet verstuurd.');
      return send(res, 503, { ok: false, error: 'Verzenden lukt nu niet.' });
    }
    console.log(`\n[hulpmiddel: ${tool}] ${subject}\n${text}\n(foto's: ${attachments.length}; niet gemaild: RESEND_API_KEY ontbreekt – lokaal is dat normaal)\n`);
    return send(res, 200, { ok: true, dev: true });
  }

  const from = process.env.AANVRAAG_FROM || 'MV Funderingsscan <onboarding@resend.dev>';
  try {
    await resend(key, { from, to: [process.env.AANVRAAG_TO || 'info@mideavastgoed.nl'], reply_to: clean.email, subject, html, text, attachments });
  } catch (err) {
    console.error(err);
    return send(res, 502, { ok: false, error: 'Verzenden lukt nu niet.' });
  }
  if (kopie && samenvatting) {
    // Kopie voor de bezoeker; mislukt dit, dan is de aanvraag zelf wel binnen.
    try {
      await resend(key, {
        from, to: [clean.email], subject: 'Je antwoorden en indicatie – MV Funderingsscan',
        html: `<p style="font-family:Arial,sans-serif">Hallo ${esc(clean.naam)},</p><p style="font-family:Arial,sans-serif">Hieronder staan je antwoorden en het resultaat van de ${esc(TOOLS[tool])}. We nemen contact met je op.</p><pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${esc(samenvatting)}</pre><p style="font-family:Arial,sans-serif;font-size:13px;color:#5f7286">Let op: dit is een indicatie op basis van je antwoorden, geen funderingsdiagnose. Het vervangt geen professioneel funderingsonderzoek.</p>`,
        text: `${samenvatting}\n\nLet op: dit is een indicatie op basis van je antwoorden, geen funderingsdiagnose.`,
      });
    } catch (err) { console.error('Kopie naar bezoeker mislukt', err); }
  }
  return send(res, 200, { ok: true });
}
