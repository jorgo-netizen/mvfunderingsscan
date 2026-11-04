/**
 * Stuurt een aanvraag door naar het Mideavastgoed-portaal, waar er automatisch een opdracht van
 * wordt gemaakt (inplannen, afronden en factureren gebeurt daar).
 *
 * Omgevingsvariabelen (Vercel → Project → Settings → Environment Variables):
 *   PORTAAL_INTAKE_URL     bijv. https://portaal.mideavastgoed.nl/api/intake/mvfunderingsscan
 *   PORTAAL_INTAKE_SECRET  lange geheime tekst (min. 32 tekens); dezelfde waarde staat in het
 *                          portaal als INTAKE_FUNDERINGSSCAN_SECRET.
 *
 * Beveiliging: het verzoek is ondertekend (HMAC-SHA256 over "<tijdstip>.<body>"), het portaal
 * weigert alles zonder geldige, verse handtekening. Zonder instellingen gebeurt er niets.
 * Gooit nooit: lukt het doorsturen niet, dan werkt het formulier gewoon (de mail naar het kantoor
 * gaat altijd), en de fout staat in die mail en in de log.
 */
import { createHmac, randomBytes } from 'node:crypto';
import { logError } from './http.js';

const TIMEOUT_MS = 6000;

export function portaalConfigured() {
  return !!(process.env.PORTAAL_INTAKE_URL && (process.env.PORTAAL_INTAKE_SECRET || '').length >= 32);
}

export function signBody(secret, timestamp, body) {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/**
 * @param {{ externalId?: string, form: string, type?: string, dossierNr?: string|null, fields: Record<string,string>, details: Record<string,string> }} a
 * @returns {Promise<{ status: 'niet ingesteld' | 'doorgestuurd' | 'mislukt', orderNumber?: string|null, portaalStatus?: string, error?: string }>}
 */
export async function forwardToPortaal(a) {
  if (!portaalConfigured()) return { status: 'niet ingesteld' };
  const f = a.fields;
  const body = JSON.stringify({
    externalId: a.externalId && /^[A-Za-z0-9._:-]{8,100}$/.test(a.externalId) ? a.externalId : `mvfs-${Date.now()}-${randomBytes(6).toString('hex')}`,
    form: a.form,
    type: f.type || '',
    dossierNr: a.dossierNr || null,
    naam: f.naam,
    email: f.email,
    telefoon: f.telefoon || '',
    adres: f.adres || '',
    huisnummer: f.huisnummer || '',
    postcode: f.postcode || '',
    plaats: f.plaats || '',
    details: a.details,
  });
  const ts = String(Date.now());
  try {
    const r = await fetch(process.env.PORTAAL_INTAKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Intake-Timestamp': ts, 'X-Intake-Signature': signBody(process.env.PORTAAL_INTAKE_SECRET, ts, body) },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) {
      logError('portaal-doorsturen', `${r.status} ${j.error || ''}`);
      return { status: 'mislukt', error: `${r.status} ${j.error || ''}`.trim() };
    }
    return { status: 'doorgestuurd', orderNumber: j.orderNumber || null, portaalStatus: j.status };
  } catch (err) {
    logError('portaal-doorsturen', err);
    return { status: 'mislukt', error: String(err?.message || err).slice(0, 200) };
  }
}
