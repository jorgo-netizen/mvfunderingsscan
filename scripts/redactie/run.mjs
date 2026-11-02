/**
 * AI-redactie: draait op de pc (Windows Taakplanner), nooit op Vercel.
 *
 *   npm run redactie                 verzamelen + schrijven volgens de planning in het portaal
 *   npm run redactie -- --verzamelen alleen nieuws verzamelen
 *   npm run redactie -- --type weetje   één concept van dit soort maken (los van de planning)
 *   npm run redactie -- --droog      alles doen, maar niets naar het portaal sturen (concepten in tmp/redactie/)
 *   --ollama <url>  ander Ollama-adres · --zonder-taal  geen LanguageTool · --max <n>  max. concepten per run
 *
 * Instellingen staan in het bestand redactie.env in de projectmap (staat in .gitignore):
 *   REDACTIE_TOKEN=…   (zelfde waarde als in Vercel)
 *   REDACTIE_API=https://www.mvfunderingsquickscan.nl/api/redactie/   (optioneel)
 *
 * De bot kan alleen concepten aanleveren. Publiceren kan hij niet: daar heeft hij geen toegang toe.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { leesFeed, leesPagina, beoordeel } from './feeds.mjs';
import { ollamaBeschikbaar } from './ollama.mjs';
import { schrijf } from './schrijver.mjs';
import { lijkenOp } from '../../api/_lib/redactie.js';

const ROOT = new URL('../../', import.meta.url);
const args = process.argv.slice(2);
const vlag = (n) => args.includes(`--${n}`);
const waarde = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const DROOG = vlag('droog');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ---------------------------------------------------------------- configuratie
const envFile = new URL('redactie.env', ROOT);
if (existsSync(envFile)) for (const regel of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = regel.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const API = process.env.REDACTIE_API || 'https://www.mvfunderingsquickscan.nl/api/redactie/';
const TOKEN = process.env.REDACTIE_TOKEN || '';

async function api(actie, data = {}) {
  if (DROOG && actie !== 'context') return { ok: true, droog: true };
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ actie, ...data }), signal: AbortSignal.timeout(60000) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.ok) throw new Error(`portaal (${actie}): ${body.error || r.status}`);
  return body;
}

// ---------------------------------------------------------------- stap 1: verzamelen
async function verzamelen(ctx) {
  const items = []; const bronStatus = []; let fouten = 0;
  for (const bron of ctx.bronnen) {
    try {
      const lijst = await leesFeed(bron.url);
      for (const i of lijst) {
        const b = beoordeel(i, bron);
        if (b.relevantie < 20) continue; // ruis niet opslaan
        items.push({ bron_id: bron.id, bron_naam: i.uitgever || bron.naam, titel: i.titel, url: i.url, samenvatting: i.samenvatting, gepubliceerd_op: i.datum, onderwerp: b.onderwerp, regio: b.regionaal ? b.regio : '', relevantie: b.relevantie, betrouwbaarheid: bron.betrouwbaarheid });
      }
      bronStatus.push({ id: bron.id });
      log(`  ${bron.naam}: ${lijst.length} items gelezen`);
    } catch (err) {
      fouten++; bronStatus.push({ id: bron.id, fout: err.message });
      log(`  ${bron.naam}: FOUT ${err.message}`);
    }
  }
  const r = await api('items', { items, bronnen: bronStatus });
  return { gelezen: items.length, opgeslagen: r.opgeslagen ?? items.length, bronfouten: fouten };
}

// ---------------------------------------------------------------- stap 2: kiezen wat er geschreven wordt
const lijktBekend = (titel, bekend) => bekend.some((b) => lijkenOp(titel, b.titel) >= 0.75);

function kiesTaken(ctx, alleenType) {
  const inst = ctx.instellingen; const taken = [];
  const vrij = ctx.items.filter((i) => i.status === 'nieuw' && i.relevantie >= inst.min_relevantie && !lijktBekend(i.titel, ctx.bekend))
    .sort((a, b) => b.relevantie - a.relevantie || b.betrouwbaarheid - a.betrouwbaarheid);
  const gebruikt = new Set();
  const types = alleenType ? [alleenType] : ['nieuws', 'regionaal', 'weetje', 'kennis', 'zelftest', 'praktijk'];
  for (const type of types) {
    const t = ctx.tellingen[type] || { aantal: 0, doel: 0 };
    // schrijven zolang de voorraad niet vol is én het maximum voor deze week/maand niet is bereikt
    if (!alleenType && (t.aantal >= t.doel || (t.open ?? 0) >= (t.voorraad ?? t.doel))) continue;
    if (type === 'nieuws' || type === 'regionaal') {
      const item = vrij.find((i) => !gebruikt.has(i.id) && (type === 'regionaal' ? i.regio : true));
      if (!item) { log(`  ${type}: geen geschikt nieuwsitem (relevantie ≥ ${inst.min_relevantie})`); continue; }
      gebruikt.add(item.id);
      taken.push({ type, items: [item], onderwerp: item.titel });
    } else {
      const onderwerp = (inst.onderwerpen[type] || []).find((o) => !lijktBekend(o, ctx.bekend));
      if (!onderwerp) { log(`  ${type}: geen nieuw onderwerp meer in de lijst (vul aan in het portaal)`); continue; }
      taken.push({ type, onderwerp });
    }
  }
  return taken;
}

// ---------------------------------------------------------------- hoofdprogramma
async function main() {
  const gestart = new Date().toISOString();
  const aantallen = { gelezen: 0, opgeslagen: 0, concepten: 0, bronfouten: 0 };
  const meldingen = [];
  if (!TOKEN && !DROOG) throw new Error('REDACTIE_TOKEN ontbreekt. Zet hem in redactie.env (zie docs/redactie.md).');

  log('Context ophalen bij het portaal…');
  let ctx = DROOG && !TOKEN ? { instellingen: (await import('../../api/_lib/redactie.js')).instellingen({}), bronnen: [], items: [], bekend: [], regenereer: [], tellingen: {} } : await api('context');
  if (ctx.instellingen.actief === false && !waarde('type')) { log('De redactie staat uit in het portaal (Instellingen). Klaar.'); return; }

  if (!waarde('type')) {
    log('Nieuws verzamelen…');
    Object.assign(aantallen, await verzamelen(ctx));
    if (aantallen.bronfouten) meldingen.push(`${aantallen.bronfouten} bron(nen) gaven een fout.`);
    if (!DROOG) { await api('opruimen'); ctx = await api('context'); }
  }
  if (vlag('verzamelen')) { await logRun('verzamelen', gestart, aantallen, meldingen); return; }

  const { model, taalcontrole } = ctx.instellingen;
  const basis = waarde('ollama') || ctx.instellingen.ollama_url;
  const check = await ollamaBeschikbaar(basis, model);
  if (!check.ok) throw new Error(check.reden);

  const taken = [
    ...ctx.regenereer.map((c) => ({ type: c.type, onderwerp: c.onderwerp || c.titel, vervangt: c.id, notitie: c.regenereer_notitie, items: c.items || [] })),
    ...kiesTaken(ctx, waarde('type')),
  ].slice(0, Number(waarde('max') || ctx.instellingen.per_run || 4));
  if (!taken.length) log('Niets te schrijven volgens de planning.');

  for (const taak of taken) {
    try {
      for (const item of taak.items || []) {
        const bron = ctx.bronnen.find((b) => b.id === item.bron_id);
        if (bron?.pagina_ophalen) { try { item.paginatekst = await leesPagina(item.url); } catch { /* samenvatting volstaat */ } }
      }
      const concept = await schrijf(taak, { basis, model, bekend: ctx.bekend, taal: taalcontrole !== false && !vlag('zonder-taal'), log });
      if (DROOG) {
        mkdirSync(new URL('tmp/redactie/', ROOT), { recursive: true });
        writeFileSync(new URL(`tmp/redactie/${concept.type}-${concept.slug || Date.now()}.json`, ROOT), JSON.stringify(concept, null, 2));
      } else {
        await api('concept', { concept, ...(taak.vervangt ? { vervangt: taak.vervangt } : {}) });
      }
      aantallen.concepten++;
      ctx.bekend.push({ titel: concept.titel });
      log(`  ✔ concept "${concept.titel}" (${concept.controle.fouten.length} fouten, ${concept.controle.waarschuwingen.length} waarschuwingen)`);
    } catch (err) {
      meldingen.push(`${taak.type}: ${err.message}`);
      log(`  ✖ ${taak.type}: ${err.message}`);
    }
  }
  await logRun('schrijven', gestart, aantallen, meldingen);
}

async function logRun(taak, gestart, aantallen, meldingen) {
  const status = meldingen.some((m) => /mislukt|fout|✖/i.test(m)) && !aantallen.concepten ? 'fout' : meldingen.length ? 'waarschuwing' : 'ok';
  log(`Klaar: ${JSON.stringify(aantallen)}${meldingen.length ? ` – ${meldingen.join(' | ')}` : ''}`);
  await api('run', { taak, status, melding: meldingen.join('\n').slice(0, 2000), aantallen, gestart_op: gestart }).catch((e) => log('Logregel niet opgeslagen:', e.message));
}

main().catch(async (err) => {
  log('FOUT:', err.message);
  if (TOKEN && !DROOG) await api('run', { taak: 'redactie', status: 'fout', melding: err.message.slice(0, 2000) }).catch(() => {});
  process.exitCode = 1;
});
