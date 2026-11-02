/**
 * IndexNow na een productiedeploy: meldt alleen pagina's die echt nieuw, inhoudelijk gewijzigd of verwijderd zijn.
 *
 *   node scripts/indexnow.mjs --diff <vorige-sha>    vergelijk de build van <vorige-sha> met de huidige build (dist/)
 *   node scripts/indexnow.mjs --vorige-deploy        zoek de vorige geslaagde productiedeploy via de GitHub API (in GitHub Actions)
 *   node scripts/indexnow.mjs --urls <url> [<url>…]  losse URL's melden (handmatig)
 *   node scripts/indexnow.mjs --alles --bevestig     de hele sitemap melden (alleen bewust, eenmalig)
 *   --droog                                          alles controleren, niets versturen
 *
 * Elke URL wordt eerst op productie gecontroleerd: nieuw/gewijzigd = 200, canonical naar zichzelf en geen noindex;
 * verwijderd = 404, 410 of een redirect. Het script eindigt altijd met exitcode 0: IndexNow mag nooit een deploy blokkeren.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync, appendFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { DOMEIN, signalen, vingerafdruk, leesDist, indexeerbaar, sitemapUrls } from './seo/pagina.mjs';
import { meldIndexNow, isSleutel } from '../api/_lib/indexnow.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const vlag = (n) => args.includes(`--${n}`);
const waarde = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const DROOG = vlag('droog');
const MAX_ZONDER_BEVESTIGING = 150; // voorkomt per ongeluk een bulkmelding van de hele site
const KEY = process.env.INDEXNOW_KEY || '';
const log = (...a) => console.log(...a);
const samenvatting = [];

// ---------------------------------------------------------------- welke URL's?
function bouwOud(sha) {
  const map = mkdtempSync(join(tmpdir(), 'mvfs-oud-'));
  try {
    execFileSync('git', ['worktree', 'add', '--detach', map, sha], { cwd: ROOT, stdio: 'ignore' });
    execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: map, stdio: 'ignore', env: { ...process.env, VERCEL: '1', SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '' } });
    return leesDist(join(map, 'dist'));
  } finally {
    try { execFileSync('git', ['worktree', 'remove', '--force', map], { cwd: ROOT, stdio: 'ignore' }); } catch { rmSync(map, { recursive: true, force: true }); }
  }
}

function verschil(oud, nieuw) {
  const oudIdx = new Set(indexeerbaar(oud)); const nieuwIdx = new Set(indexeerbaar(nieuw));
  const nieuwe = [...nieuwIdx].filter((p) => !oudIdx.has(p));
  const gewijzigd = [...nieuwIdx].filter((p) => oudIdx.has(p) && vingerafdruk(oud[p]) !== vingerafdruk(nieuw[p]));
  const verwijderd = [...oudIdx].filter((p) => !nieuwIdx.has(p));
  return { nieuwe, gewijzigd, verwijderd };
}

async function vorigeDeploySha() {
  const repo = process.env.GITHUB_REPOSITORY; const token = process.env.GITHUB_TOKEN; const huidig = process.env.DEPLOY_SHA || process.env.GITHUB_SHA;
  if (!repo || !token) return null;
  const gh = async (pad) => { const r = await fetch(`https://api.github.com/repos/${repo}/${pad}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }); return r.ok ? r.json() : []; };
  // Vercel noemt de omgeving "Production" of "Production – <project>"
  const deploys = (await gh('deployments?per_page=50')).filter((d) => /^Production/.test(d.environment || ''));
  for (const d of deploys) {
    if (d.sha === huidig) continue;
    const st = await gh(`deployments/${d.id}/statuses?per_page=5`);
    if (st.some((s) => s.state === 'success')) return d.sha;
  }
  return null;
}

// ---------------------------------------------------------------- controle op productie
async function haal(url) {
  try {
    const r = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'MV-Funderingsscan-IndexNow-controle/1.0' }, signal: AbortSignal.timeout(20000) });
    return { status: r.status, header: r.headers.get('x-robots-tag') || '', html: r.status === 200 ? await r.text() : '' };
  } catch (err) { return { status: 0, fout: String(err.message || err) }; }
}
async function controleerLive(paden, soort) {
  const ok = []; const afgewezen = [];
  for (const p of paden) {
    const url = DOMEIN + p; const r = await haal(url);
    if (soort === 'verwijderd') {
      if ([404, 410, 301, 308].includes(r.status)) ok.push(url); else afgewezen.push(`${p} (status ${r.status}, verwacht 404/410/redirect)`);
      continue;
    }
    const s = r.html ? signalen(r.html) : null;
    if (r.status !== 200) afgewezen.push(`${p} (status ${r.status})`);
    else if (/noindex/i.test(r.header) || /noindex/i.test(s.robots)) afgewezen.push(`${p} (noindex)`);
    else if (s.canonical !== url) afgewezen.push(`${p} (canonical ${s.canonical || 'ontbreekt'})`);
    else ok.push(url);
  }
  return { ok, afgewezen };
}

// ---------------------------------------------------------------- hoofdprogramma
async function main() {
  let lijsten = { nieuwe: [], gewijzigd: [], verwijderd: [] };
  if (vlag('urls')) {
    lijsten.gewijzigd = args.slice(args.indexOf('--urls') + 1).filter((a) => !a.startsWith('--')).map((u) => u.replace(DOMEIN, ''));
  } else if (vlag('alles')) {
    if (!vlag('bevestig')) { log('Gebruik --alles alleen samen met --bevestig: dit meldt de hele sitemap.'); return; }
    lijsten.gewijzigd = sitemapUrls(readFileSync(join(ROOT, 'dist', 'sitemap.xml'), 'utf8')).map((u) => u.replace(DOMEIN, ''));
  } else {
    const sha = waarde('diff') || (vlag('vorige-deploy') ? await vorigeDeploySha() : null);
    if (!sha) { log('Geen vorige productiedeploy gevonden: er wordt niets gemeld (zo komt er geen bulkmelding bij de eerste deploy).'); samenvatting.push('Geen vorige productiedeploy gevonden; niets gemeld.'); return; }
    if (!existsSync(join(ROOT, 'dist', 'sitemap.xml'))) throw new Error('dist/ ontbreekt; bouw eerst de huidige versie.');
    log(`Vergelijken met ${sha.slice(0, 7)}…`);
    lijsten = verschil(bouwOud(sha), leesDist(join(ROOT, 'dist')));
  }
  const totaal = lijsten.nieuwe.length + lijsten.gewijzigd.length + lijsten.verwijderd.length;
  log(`Nieuw: ${lijsten.nieuwe.length} · inhoudelijk gewijzigd: ${lijsten.gewijzigd.length} · verwijderd: ${lijsten.verwijderd.length}`);
  samenvatting.push(`| Nieuwe URL's | ${lijsten.nieuwe.length} |`, `| Inhoudelijk gewijzigd | ${lijsten.gewijzigd.length} |`, `| Verwijderd | ${lijsten.verwijderd.length} |`);
  if (!totaal) return;
  if (totaal > MAX_ZONDER_BEVESTIGING && !vlag('bevestig')) { log(`Meer dan ${MAX_ZONDER_BEVESTIGING} URL's: niet automatisch gemeld. Controleer en meld zo nodig met --alles --bevestig.`); samenvatting.push(`| Niet gemeld | meer dan ${MAX_ZONDER_BEVESTIGING} URL's; handmatige bevestiging nodig |`); return; }

  // sleutel en sleutelbestand (bij --droog niet nodig: dan alleen de controle op productie)
  if (!DROOG && !isSleutel(KEY)) { log('INDEXNOW_KEY ontbreekt: niets gemeld.'); samenvatting.push('| IndexNow | niet ingesteld (INDEXNOW_KEY ontbreekt) |'); return; }
  const sleutelbestand = DROOG && !isSleutel(KEY) ? { status: 200, html: '' } : await haal(`${DOMEIN}/${KEY}.txt`);
  if (sleutelbestand.status !== 200 || (!DROOG && sleutelbestand.html.trim() !== KEY)) { log(`Sleutelbestand niet bereikbaar (status ${sleutelbestand.status}): niets gemeld.`); samenvatting.push(`| Sleutelbestand | niet bereikbaar (status ${sleutelbestand.status}) |`); return; }

  const a = await controleerLive([...lijsten.nieuwe, ...lijsten.gewijzigd], 'live');
  const b = await controleerLive(lijsten.verwijderd, 'verwijderd');
  const melden = [...a.ok, ...b.ok];
  for (const x of [...a.afgewezen, ...b.afgewezen]) log(`  overgeslagen: ${x}`);
  samenvatting.push(`| Gecontroleerd en klaar om te melden | ${melden.length} |`, `| Overgeslagen na controle | ${a.afgewezen.length + b.afgewezen.length} |`);
  if (DROOG) { log(`--droog: ${melden.length} URL's zouden worden gemeld:\n  ${melden.join('\n  ')}`); samenvatting.push('| Verstuurd | nee (--droog) |'); return; }
  const r = await meldIndexNow(melden, { key: KEY });
  log(`IndexNow: ${r.gemeld} van ${melden.length} URL's gemeld${r.fout ? ` – fout: ${r.fout}` : ''}. (Gemeld ≠ gecrawld ≠ geïndexeerd.)`);
  samenvatting.push(`| IndexNow-verzoeken | ${r.batches.length} (status ${r.batches.map((x) => x.status).join(', ') || '–'}) |`, `| URL's gemeld | ${r.gemeld} |`, `| IndexNow-fout | ${r.fout || 'geen'} |`);
}

main().catch((err) => { log(`IndexNow overgeslagen door een fout: ${err.message}`); samenvatting.push(`| Fout | ${err.message} |`); })
  .finally(() => {
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### IndexNow\n\n| | |\n|---|---|\n${samenvatting.join('\n')}\n\n*Gemeld betekent: door IndexNow ontvangen. Of en wanneer een zoekmachine de URL crawlt of indexeert, bepaalt die zoekmachine zelf.*\n`);
    process.exitCode = 0;
  });
