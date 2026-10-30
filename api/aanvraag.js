/**
 * Vercel serverless functie: verwerkt aanvraag- en contactformulieren en mailt ze via Resend.
 *
 * Omgevingsvariabelen (Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY   API-sleutel van https://resend.com (verplicht in productie)
 *   AANVRAAG_TO      ontvanger, standaard info@mideavastgoed.nl
 *   AANVRAAG_FROM    afzender op een in Resend geverifieerd domein,
 *                    bijv. "MV Funderingsscan <noreply@mvfunderingsquickscan.nl>"
 *
 * QuickScan Track & Trace (alleen als de database is ingesteld, zie IMPLEMENTATIEHANDLEIDING-MV-FUNDERINGSSCAN.md):
 *   Een aanvraag voor een Fase 0 Quick Scan (formulier "aanvraag" of "home", type fase0) wordt geregistreerd
 *   met een dossiernummer. De klant krijgt een bevestiging met een persoonlijke trackinglink.
 *   Dubbele inzendingen (zelfde formulier-sleutel) leveren geen tweede dossier en geen tweede mail op.
 *   Zonder database werkt het formulier precies als voorheen.
 *
 * Lokaal (npm run dev) zonder RESEND_API_KEY wordt de aanvraag alleen in de terminal getoond.
 */
import { getDb } from './_lib/db.js';
import { newToken, hashToken, trackingUrl } from './_lib/tracking.js';
import { resendSend, sendLogged, trackingMail } from './_lib/mail.js';
import { logError, clientKey } from './_lib/http.js';

const MAX_REGISTRATIONS_PER_HOUR = 5; // per IP-adres; beperkt misbruik van de klantmail

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
const DETAIL_FIELDS = ['contactmoment', 'woningtype', 'bouwjaar', 'situatie', 'scheuren', 'scheefstand', 'klemmen', 'kruipruimte', 'opmerking'];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const isIdem = (s) => typeof s === 'string' && /^[A-Za-z0-9-]{16,80}$/.test(s);

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

/** Registreert een Fase 0-aanvraag en mailt de klant. Gooit nooit: bij een fout werkt het formulier zoals voorheen. */
async function registerTracking(db, req, form, clean, idem) {
  try {
    // Beperk het aantal nieuwe registraties per IP-adres (gehasht; het tabelveld heet success=false voor 'telt mee').
    const rateKey = `aanvraag:${clientKey(req)}`;
    if (await db.failuresSince(rateKey, new Date(Date.now() - 3600e3).toISOString()) >= MAX_REGISTRATIONS_PER_HOUR) return null;
    const token = newToken();
    const reg = await db.registerRequest({
      idempotency_key: idem, source: form, request_type: 'fase0',
      naam: clean.naam, email: clean.email.toLowerCase(), telefoon: clean.telefoon || '', adres: clean.adres || '',
      postcode: (clean.postcode || '').toUpperCase().replace(/\s+/g, ' '), huisnummer: clean.huisnummer || '', plaats: clean.plaats || '',
      details: Object.fromEntries(DETAIL_FIELDS.filter((k) => clean[k]).map((k) => [k, clean[k]])),
      token_hash: hashToken(token),
    });
    if (reg.created) await db.addLoginAttempt(rateKey, false);
    let mailToken = reg.created ? token : null;
    if (!reg.created) {
      // Dubbele inzending: alleen opnieuw mailen als de eerdere bevestiging niet is verzonden.
      const full = await db.requestById(reg.id);
      if (full?.emails?.some((e) => e.kind === 'bevestiging' && e.status === 'verzonden')) return { dossier: reg.dossier_nr, mail: 'verzonden', id: reg.id, duplicate: true };
      mailToken = newToken();
      await db.updateRequest(reg.id, { token_hash: hashToken(mailToken), token_created_at: new Date().toISOString(), token_revoked_at: null });
    }
    const m = trackingMail({ naam: clean.naam, dossier: reg.dossier_nr, url: trackingUrl(mailToken) });
    const mail = await sendLogged(db, {
      requestId: reg.id, kind: 'bevestiging', idempotencyKey: `bevestiging-${reg.id}-${hashToken(mailToken).slice(0, 12)}`,
      payload: { to: [clean.email], subject: m.subject, html: m.html, text: m.text },
    });
    // Alleen lokaal (npm run dev, niet op Vercel) zonder e-maildienst: link in de terminal om te kunnen testen.
    if (mail.skipped && !process.env.VERCEL) console.log(`[lokaal, geen e-maildienst] trackinglink voor ${reg.dossier_nr}: ${trackingUrl(mailToken)}`);
    return { dossier: reg.dossier_nr, mail: mail.skipped ? 'niet ingesteld' : mail.status, id: reg.id, duplicate: !reg.created };
  } catch (err) {
    logError('aanvraag-registratie', err);
    return null;
  }
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

  // Track & Trace: alleen voor een Fase 0 Quick Scan en alleen als de database is ingesteld.
  const db = getDb();
  const idem = typeof fields.formulier_id === 'string' ? fields.formulier_id : '';
  const tracking = db && (form === 'aanvraag' || form === 'home') && clean.type === 'fase0' && isIdem(idem)
    ? await registerTracking(db, req, form, clean, idem)
    : null;

  const rows = Object.entries(clean)
    .filter(([k, v]) => k !== 'privacy' && v)
    .map(([k, v]) => [LABELS[k], k === 'type' ? (TYPE_LABELS[v] || v) : v]);
  if (tracking) {
    rows.unshift(['Dossiernummer', tracking.dossier]);
    rows.push(['Trackingmail aan klant', tracking.mail === 'verzonden' ? 'verzonden (door Resend geaccepteerd)' : tracking.mail]);
  }
  const subject = `${FORMS[form]}${tracking ? ` ${tracking.dossier}` : ''} – ${clean.naam}${clean.plaats ? ` (${clean.plaats})` : ''}`;
  const html = `<h2 style="font-family:Arial,sans-serif;color:#102945">${esc(FORMS[form])}</h2>
<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
${rows.map(([l, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#5f7286;vertical-align:top"><strong>${esc(l)}</strong></td><td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`).join('\n')}
</table>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#8a97a5">Verstuurd via mvfunderingsquickscan.nl · toestemming privacy: ja</p>`;
  const text = rows.map(([l, v]) => `${l}: ${v}`).join('\n');
  const trackingOut = tracking ? { dossier: tracking.dossier, mail: tracking.mail } : undefined;

  if (!process.env.RESEND_API_KEY) {
    if (process.env.VERCEL_ENV === 'production') {
      console.error('RESEND_API_KEY ontbreekt – aanvraag niet verstuurd.');
      // Is de aanvraag wel geregistreerd, dan is hij niet verloren: medewerkers zien hem in het beheerportaal.
      if (tracking) return send(res, 200, { ok: true, tracking: trackingOut });
      return send(res, 503, { ok: false, error: 'Verzenden lukt nu niet. Bel of mail ons direct.' });
    }
    console.log(`\n[formulier: ${form}] ${subject}\n(niet gemaild: RESEND_API_KEY ontbreekt – lokaal is dat normaal)\n`);
    return send(res, 200, { ok: true, dev: true, tracking: trackingOut });
  }

  const r = await resendSend({
    to: [process.env.AANVRAAG_TO || 'info@mideavastgoed.nl'],
    reply_to: clean.email,
    subject,
    html,
    text,
  }, tracking ? `kantoor-${tracking.id}` : undefined);
  if (!r.ok) {
    logError('aanvraag-mail', r.error);
    if (tracking) return send(res, 200, { ok: true, tracking: trackingOut }); // geregistreerd; staat in het beheerportaal
    return send(res, 502, { ok: false, error: 'Verzenden lukt nu niet. Bel of mail ons direct.' });
  }
  return send(res, 200, { ok: true, tracking: trackingOut });
}
