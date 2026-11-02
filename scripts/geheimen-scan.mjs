/**
 * Zoekt in alle bestanden die Git bijhoudt naar sleutels en wachtwoorden die daar niet horen
 * (Resend, Supabase service-sleutels, JWT's, GitHub-/Vercel-tokens, private keys, .env-bestanden).
 *
 *   node scripts/geheimen-scan.mjs        exitcode 1 als er iets gevonden is
 *
 * Gevonden waarden worden nooit volledig getoond, alleen bestand, regel en soort.
 * Bewust openbaar en dus toegestaan: de IndexNow-sleutel (sleutelbestand in public/), de Supabase-URL en
 * de publieke anon-/publishable-sleutel horen niet in deze lijst.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATRONEN = [
  ['Resend API-sleutel', /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}\b/],
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{20,}/],
  ['JWT (bijv. Supabase service_role)', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ['GitHub-token', /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['Vercel-token', /\bvc[pk]_[A-Za-z0-9]{24,}\b/],
  ['OpenAI/Anthropic-sleutel', /\b(sk-(ant-|proj-)?[A-Za-z0-9_-]{30,})\b/],
  ['Google API-sleutel', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['private key', /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/],
  ['wachtwoord of token in een toewijzing', /\b(PASSWORD|SECRET|SERVICE_KEY|API_KEY|TOKEN)\s*[:=]\s*["'][^"'\s]{12,}["']/i],
];
const OVERSLAAN = /\.(png|jpe?g|webp|gif|ico|pdf|woff2?|ttf|zip|mp4)$|^package-lock\.json$|^scripts\/geheimen-scan\.mjs$/i;

const bestanden = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const vondsten = [];
for (const f of bestanden) {
  if (/(^|\/)\.env(\.|$)/.test(f) && !/\.example$/.test(f)) { vondsten.push(`${f}: .env-bestand staat in Git`); continue; }
  if (OVERSLAAN.test(f)) continue;
  let tekst; try { tekst = readFileSync(f, 'utf8'); } catch { continue; }
  tekst.split('\n').forEach((regel, i) => {
    for (const [soort, re] of PATRONEN) {
      const m = regel.match(re);
      if (!m) continue;
      if (soort.startsWith('wachtwoord') && /process\.env|placeholder|voorbeeld|example|xxx|\.\.\.|<.*>/i.test(regel)) continue;
      vondsten.push(`${f}:${i + 1}: ${soort} (${m[0].slice(0, 6)}…)`);
    }
  });
}
if (vondsten.length) {
  console.log(`✖ ${vondsten.length} mogelijke geheim(en) gevonden in bestanden die Git bijhoudt:\n  ${vondsten.join('\n  ')}\n` +
    'Verwijder de waarde, zet hem als omgevingsvariabele in Vercel of als GitHub Secret, en vervang (roteer) de sleutel bij de leverancier.');
  process.exitCode = 1;
} else console.log(`✔ Geen geheimen gevonden in ${bestanden.length} bestanden`);
