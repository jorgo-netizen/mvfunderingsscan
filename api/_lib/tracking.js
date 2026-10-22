/**
 * QuickScan Track & Trace: statussen, trackingtokens en de gegevens die een klant mag zien.
 *
 * Token: 32 willekeurige bytes (256 bits), base64url. In de database staat alleen sha256(token).
 * De link gebruikt een #-fragment (https://…/status/#t=TOKEN): het fragment wordt door browsers niet naar
 * de server gestuurd en komt dus niet in serverlogs, analytics of Referer-headers. De statuspagina stuurt
 * het token in de body van een POST naar /api/status.
 */
import { randomToken, sha256, siteUrl } from './http.js';

/** Volgorde en teksten. 'info_nodig' is optioneel en verschijnt alleen als die stap echt is gezet. */
export const STATUSES = [
  { key: 'ontvangen', label: 'Aanvraag ontvangen', optional: false,
    text: 'We hebben je aanvraag voor een Fase 0 Quick Scan ontvangen en geregistreerd. We nemen zo snel mogelijk contact met je op om je aanvraag door te nemen.' },
  { key: 'in_behandeling', label: 'QuickScan in behandeling', optional: false,
    text: 'We zijn bezig met de QuickScan: het verzamelen en beoordelen van de beschikbare informatie over je woning. Zodra er een nieuwe stap is bereikt, wordt deze pagina bijgewerkt.' },
  { key: 'info_nodig', label: 'Aanvullende informatie nodig', optional: true,
    text: 'We hebben aanvullende informatie van je nodig om verder te kunnen. Je ziet hieronder wat we nodig hebben, of we nemen contact met je op.' },
  { key: 'rapport_opstellen', label: 'Rapport wordt opgesteld', optional: false,
    text: 'De beoordeling is afgerond en we stellen het rapport op.' },
  { key: 'afgerond', label: 'Rapport afgerond', optional: false,
    text: 'Het rapport is afgerond.' },
];
export const STATUS_KEYS = STATUSES.map((s) => s.key);
export const statusInfo = (key) => STATUSES.find((s) => s.key === key) || null;

export const newToken = () => randomToken(32);
export const hashToken = (token) => sha256(`mvfs-tracking:${token}`);
export const isTokenShape = (t) => typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);
export const trackingUrl = (token) => `${siteUrl()}/status/#t=${token}`;

/**
 * Bouwt de klantweergave: alleen dossiernummer, status, data en klantberichten. Geen naam, adres,
 * e-mail, interne notities of medewerkersnamen.
 */
export function customerView({ request, history }) {
  const current = statusInfo(request.status);
  const reached = new Set(history.map((h) => h.status));
  const steps = STATUSES.filter((s) => !s.optional || reached.has(s.key) || s.key === request.status).map((s) => {
    const last = [...history].reverse().find((h) => h.status === s.key);
    return { key: s.key, label: s.label, reached: reached.has(s.key), current: s.key === request.status, at: last?.changed_at || null };
  });
  const lastMessage = [...history].reverse().find((h) => h.status === request.status && h.customer_message);
  return {
    dossier: request.dossier_nr,
    status: request.status,
    label: current?.label || request.status,
    text: current?.text || '',
    message: lastMessage?.customer_message || '',
    updated_at: request.status_updated_at,
    registered_at: request.created_at,
    steps,
    report: request.status === 'afgerond' && request.report_path ? { available: true, name: request.report_name || 'rapport.pdf' } : { available: false },
  };
}
