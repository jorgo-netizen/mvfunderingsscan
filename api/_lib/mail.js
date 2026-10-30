/**
 * E-mail via Resend (bestaande integratie). Elke klantmail wordt vastgelegd in mvfs_emails met status
 * voorbereid → verzonden (= door Resend geaccepteerd, NIET: afgeleverd) of mislukt.
 * Een Idempotency-Key voorkomt dubbele verzending bij een nieuwe poging.
 */
import { esc, siteUrl, logError } from './http.js';

const NAP = { phone: '+31 (0) 582037172', phoneHref: 'tel:+31582037172', email: 'info@mideavastgoed.nl' };

export async function resendSend(payload, idempotencyKey) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true, error: 'RESEND_API_KEY ontbreekt' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      // Antwoorden van klanten komen altijd bij info@mideavastgoed.nl, ook als de afzender een noreply-adres is.
      body: JSON.stringify({ from: process.env.AANVRAAG_FROM || 'MV Funderingsscan <onboarding@resend.dev>', reply_to: process.env.AANVRAAG_REPLY_TO || NAP.email, ...payload }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: `Resend ${r.status}: ${String(body.message || body.name || '').slice(0, 200)}` };
    return { ok: true, id: body.id || null };
  } catch (err) {
    return { ok: false, error: String(err.message || err).slice(0, 200) };
  }
}

/** Verstuurt een klantmail en legt de status vast. Gooit nooit; geeft de e-mailstatus terug. */
export async function sendLogged(db, { requestId, kind, idempotencyKey, payload }) {
  let log = null;
  try { log = await db.emailCreate({ request_id: requestId, kind, status: 'voorbereid' }); } catch (err) { logError('mail-log', err); }
  const result = await resendSend(payload, idempotencyKey);
  const status = result.ok ? 'verzonden' : 'mislukt';
  if (log) {
    try { await db.emailUpdate(log.id, { status, provider_id: result.id || null, error: result.ok ? null : (result.skipped ? 'Niet verzonden: e-maildienst niet ingesteld' : result.error) }); } catch (err) { logError('mail-log', err); }
  }
  if (!result.ok && !result.skipped) logError('mail', result.error);
  return { status, skipped: !!result.skipped };
}

const wrap = (title, inner) => `<!doctype html><html lang="nl"><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1d2b3a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#102945;padding:22px 28px;color:#ffffff;font-size:18px;font-weight:bold">MV Funderingsscan</td></tr>
<tr><td style="height:4px;background:#c99b3e"></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;color:#102945">${esc(title)}</h1>
${inner}
</td></tr>
<tr><td style="padding:18px 28px;background:#f4f6f8;font-size:13px;color:#5f7286;line-height:1.5">
MV Funderingsscan B.V. · Mr. P.J. Troelstraweg 149 unit 23, 8919 AA Leeuwarden<br>
<a href="${NAP.phoneHref}" style="color:#102945">${NAP.phone}</a> · <a href="mailto:${NAP.email}" style="color:#102945">${NAP.email}</a> · <a href="${siteUrl()}/" style="color:#102945">mvfunderingsquickscan.nl</a>
</td></tr></table></td></tr></table></body></html>`;

const p = (t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${t}</p>`;
const button = (href, label) => `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:#c99b3e;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:8px">${esc(label)}</a></p>`;

/** Bevestiging na registratie, of een nieuwe link na het opnieuw uitgeven van de trackinglink. */
export function trackingMail({ naam, dossier, url, nieuweLink = false }) {
  const first = String(naam || '').trim().split(/\s+/)[0] || '';
  const subject = nieuweLink
    ? `Nieuwe link om je QuickScan te volgen – dossier ${dossier}`
    : `We hebben je QuickScan-aanvraag ontvangen – dossier ${dossier}`;
  const intro = nieuweLink
    ? 'Je ontvangt een nieuwe persoonlijke link om de voortgang van je QuickScan te volgen. Een eerder ontvangen link werkt niet meer.'
    : 'Bedankt voor je aanvraag voor een Fase 0 Quick Scan. We hebben je aanvraag ontvangen en geregistreerd. We nemen zo snel mogelijk contact met je op om je aanvraag door te nemen.';
  const html = wrap(nieuweLink ? 'Nieuwe link voor je QuickScan' : 'Je aanvraag is ontvangen', [
    p(`Beste ${esc(first || 'aanvrager')},`),
    p(intro),
    p(`Je dossiernummer is <strong>${esc(dossier)}</strong>.`),
    p('Via je persoonlijke link zie je op elk moment de actuele stand van zaken, zodra wij een nieuwe stap bijwerken:'),
    button(url, 'Bekijk de voortgang'),
    `<p style="margin:0 0 14px;font-size:13px;line-height:1.5;color:#5f7286">Werkt de knop niet? Kopieer dan deze link in je browser:<br><span style="word-break:break-all">${esc(url)}</span></p>`,
    p('<strong>Let op:</strong> deze link is persoonlijk. Iedereen die de link heeft, kan de voortgang van dit dossier zien. Deel hem daarom niet met anderen. De pagina toont alleen het dossiernummer en de status, geen adres of andere persoonsgegevens.'),
    p('Heb je een vraag? Bel of mail ons gerust en vermeld je dossiernummer.'),
  ].join('\n'));
  const text = [
    `Beste ${first || 'aanvrager'},`, '', intro, '', `Dossiernummer: ${dossier}`, '',
    `Bekijk de voortgang via je persoonlijke link: ${url}`, '',
    'Let op: deze link is persoonlijk. Iedereen die de link heeft, kan de voortgang van dit dossier zien. Deel hem niet met anderen.', '',
    `MV Funderingsscan · ${NAP.phone} · ${NAP.email}`,
  ].join('\n');
  return { subject, html, text };
}
