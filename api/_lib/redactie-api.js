/**
 * Portaalacties voor de AI-redactie (ingelogde medewerkers). Actie via ?actie=redactie-…
 *
 * Goedkeuren en publiceren zijn twee aparte handelingen:
 *   1. redactie-goedkeuren: zet een concept over naar Nieuws, ALTIJD als concept (status 'concept').
 *   2. publiceren gebeurt daarna in Nieuws (nieuws-status) door een medewerker. Deze module publiceert nooit.
 */
import { readFileSync } from 'node:fs';
import { isUuid, logError, randomToken, siteUrl, MAX_JSON_BYTES } from './http.js';
import { slugify } from './markdown.js';
import { renderNewsArticle } from './news-render.js';
import { TYPES, CONCEPT_STATUSSEN, BEELDBANK, STANDAARD, instellingen, schoonConcept, controleer, naarNieuwsRij, isUpload, UPLOAD_PREFIX } from './redactie.js';
const uploadPad = (a) => a.slice(UPLOAD_PREFIX.length);
const JPEG = [0xff, 0xd8, 0xff];
const MAX_FOTO = 2.5 * 1024 * 1024;

const str = (v, max) => String(v ?? '').trim().slice(0, max);
const CATEGORIEEN = ['vakbron', 'overheid', 'onderzoek', 'regionaal', 'landelijk', 'zoekfeed', 'algemeen'];

let INTERN = null;
/** Bestaande pagina's van de site (voor de controle op interne links en dubbele onderwerpen). */
function internePaginas() {
  if (INTERN) return INTERN;
  try {
    const urls = JSON.parse(readFileSync(new URL('../../src/content/urls.json', import.meta.url), 'utf8'));
    INTERN = urls.map((u) => ({ url: u.path, titel: u.label, keyword: u.keyword })).concat([{ url: '/nieuws/', titel: 'Nieuws' }]);
  } catch (err) { logError('redactie-urls', err); INTERN = []; }
  return INTERN;
}

async function herControleer(db, c) {
  const paginas = internePaginas();
  const [concepten, nieuws] = await Promise.all([db.redConceptenList({}), db.newsList()]);
  const bekend = [
    ...paginas.map((p) => ({ titel: `${p.titel} ${p.keyword || ''}`, url: p.url })),
    ...concepten.filter((x) => x.id !== c.id).map((x) => ({ titel: x.titel })),
    ...nieuws.filter((n) => n.id !== c.nieuws_id).map((n) => ({ titel: n.title, url: `/nieuws/${n.slug}/` })),
  ];
  const nieuw = controleer(c, { interneUrls: new Set(paginas.map((p) => p.url)), bekend });
  // bevindingen van de bot (taalcontrole, eindredactie) blijven bewaard
  const oud = c.controle || {};
  return { ...nieuw, taal: oud.taal || [], eindredactie: oud.eindredactie || [], waarschuwingen: [...nieuw.waarschuwingen, ...(oud.eindredactie || []).map((e) => `Eindredactie: ${e}`)] };
}

export async function redactieActies(db, req, res, actie, user, url, { json, fail, readJson, sendHtml, NOINDEX }) {
  const id = url.searchParams.get('id');

  // ------------------------------------------------------------ lezen
  if (actie === 'redactie-overzicht') {
    const [concepten, items, runs, inst] = await Promise.all([db.redConceptenList({}), db.redItemsList({ status: 'nieuw', limit: 500 }), db.redRunsList(30), db.redInstellingen()]);
    const perType = Object.fromEntries(TYPES.map((t) => [t, concepten.filter((c) => c.type === t && c.status === 'concept').length]));
    const perStatus = Object.fromEntries(CONCEPT_STATUSSEN.map((s) => [s, concepten.filter((c) => c.status === s).length]));
    return json(res, 200, {
      ok: true, per_type: perType, per_status: perStatus, nieuwe_items: items.length,
      regenereren: concepten.filter((c) => c.regenereren).length,
      runs, laatste_run: runs[0] || null, fouten: runs.filter((r) => r.status !== 'ok').slice(0, 10), instellingen: instellingen(inst),
    });
  }
  if (actie === 'redactie-items') {
    const status = ['nieuw', 'gebruikt', 'genegeerd'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : 'nieuw';
    return json(res, 200, { ok: true, items: await db.redItemsList({ status, limit: 300 }) });
  }
  if (actie === 'redactie-concepten') {
    const type = TYPES.includes(url.searchParams.get('type')) ? url.searchParams.get('type') : undefined;
    const status = CONCEPT_STATUSSEN.includes(url.searchParams.get('status')) ? url.searchParams.get('status') : undefined;
    return json(res, 200, { ok: true, items: await db.redConceptenList({ type, status }) });
  }
  if (actie === 'redactie-concept') {
    const c = isUuid(id) ? await db.redConceptGet(id) : null;
    if (!c) return fail(res, 404, 'Concept niet gevonden.');
    const items = await db.redItemsByIds(c.item_ids || []);
    const afbeelding_url = isUpload(c.afbeelding) ? db.publicUrl('nieuws', uploadPad(c.afbeelding)) : null;
    return json(res, 200, { ok: true, concept: c, items, beeldbank: BEELDBANK, interne_paginas: internePaginas(), afbeelding_url });
  }
  if (actie === 'redactie-voorbeeld') {
    const c = isUuid(id) ? await db.redConceptGet(id) : null;
    if (!c) return fail(res, 404, 'Concept niet gevonden.');
    const rij = naarNieuwsRij(c);
    const post = { ...rij, featured_image: c.afbeelding ? 'beeldbank' : null, created_at: c.created_at, updated_at: c.updated_at };
    const viaBeeldbank = { ...db, publicUrl: () => (isUpload(c.afbeelding) ? db.publicUrl('nieuws', uploadPad(c.afbeelding)) : `/assets/img/${c.afbeelding}-1024.webp`) };
    return sendHtml(res, 200, renderNewsArticle(viaBeeldbank, post, { preview: true }), { headers: NOINDEX });
  }
  if (actie === 'redactie-bronnen') return json(res, 200, { ok: true, items: await db.redBronnen(), categorieen: CATEGORIEEN });
  if (actie === 'redactie-instellingen') return json(res, 200, { ok: true, instellingen: instellingen(await db.redInstellingen()), standaard: STANDAARD });
  if (actie === 'redactie-runs') return json(res, 200, { ok: true, items: await db.redRunsList(100) });

  if (req.method !== 'POST') return fail(res, 405, 'Alleen POST is toegestaan.');
  const body = await readJson(req, actie === 'redactie-afbeelding' ? MAX_JSON_BYTES : 512 * 1024);
  const laad = async () => (isUuid(body.id) ? db.redConceptGet(body.id) : null);

  // ------------------------------------------------------------ concepten
  if (actie === 'redactie-concept-opslaan') {
    const c = await laad(); if (!c) return fail(res, 404, 'Concept niet gevonden.');
    if (c.status === 'overgezet') return fail(res, 409, 'Dit concept staat al in Nieuws. Bewerk het daar.');
    const nieuw = schoonConcept({ ...c, ...body.concept, type: c.type, controle: c.controle, item_ids: c.item_ids, model: c.model });
    // eigen foto blijft staan zolang de medewerker hem niet vervangt door een beeldbankfoto of "geen afbeelding"
    if (isUpload(c.afbeelding) && body.concept?.afbeelding === c.afbeelding) nieuw.afbeelding = c.afbeelding;
    else if (isUpload(c.afbeelding)) await db.removeObject('nieuws', uploadPad(c.afbeelding)).catch((e) => logError('redactie-afbeelding', e));
    nieuw.controle = await herControleer(db, { ...c, ...nieuw });
    const opgeslagen = await db.redConceptUpdate(c.id, nieuw);
    return json(res, 200, { ok: true, concept: opgeslagen });
  }
  if (actie === 'redactie-afbeelding') {
    const c = await laad(); if (!c) return fail(res, 404, 'Concept niet gevonden.');
    // goedgekeurde zelftests blijven in Redactie staan, dus daar mag de foto ook nog wisselen
    if (!['concept', 'afgekeurd'].includes(c.status) && !(c.type === 'zelftest' && c.status === 'goedgekeurd')) return fail(res, 409, 'Dit concept kun je niet meer wijzigen.');
    const bytes = Buffer.from(String(body.data || ''), 'base64');
    if (!bytes.length || bytes.length > MAX_FOTO) return fail(res, 422, 'De afbeelding is leeg of groter dan 2,5 MB.');
    if (!JPEG.every((b, i) => bytes[i] === b)) return fail(res, 422, 'Het bestand is geen geldige afbeelding.');
    const pad = `redactie/${new Date().getFullYear()}/${randomToken(12)}.jpg`;
    await db.putObject('nieuws', pad, bytes, 'image/jpeg');
    if (isUpload(c.afbeelding)) await db.removeObject('nieuws', uploadPad(c.afbeelding)).catch((e) => logError('redactie-afbeelding', e));
    const alt = str(body.alt, 200);
    await db.redConceptUpdate(c.id, { afbeelding: UPLOAD_PREFIX + pad, ...(alt ? { afbeelding_alt: alt } : {}) });
    return json(res, 200, { ok: true, afbeelding: UPLOAD_PREFIX + pad, afbeelding_url: db.publicUrl('nieuws', pad) });
  }
  if (actie === 'redactie-regenereren') {
    const c = await laad(); if (!c) return fail(res, 404, 'Concept niet gevonden.');
    if (c.status !== 'concept') return fail(res, 409, 'Alleen een concept kan opnieuw worden gegenereerd.');
    await db.redConceptUpdate(c.id, { regenereren: true, regenereer_notitie: str(body.notitie, 500) });
    return json(res, 200, { ok: true });
  }
  if (actie === 'redactie-afkeuren') {
    const c = await laad(); if (!c) return fail(res, 404, 'Concept niet gevonden.');
    if (c.status === 'overgezet') return fail(res, 409, 'Dit concept staat al in Nieuws.');
    await db.redConceptUpdate(c.id, { status: body.terug === true ? 'concept' : 'afgekeurd', regenereren: false, beoordeeld_door: user.id, beoordeeld_op: new Date().toISOString() });
    return json(res, 200, { ok: true });
  }
  if (actie === 'redactie-verwijderen') {
    const c = await laad(); if (!c) return fail(res, 404, 'Concept niet gevonden.');
    if (body.bevestig !== true) return fail(res, 422, 'Bevestig het verwijderen.');
    if (isUpload(c.afbeelding) && c.status !== 'overgezet') await db.removeObject('nieuws', uploadPad(c.afbeelding)).catch((e) => logError('redactie-afbeelding', e));
    await db.redConceptDelete(c.id);
    return json(res, 200, { ok: true });
  }
  if (actie === 'redactie-goedkeuren') {
    const c = await laad(); if (!c) return fail(res, 404, 'Concept niet gevonden.');
    // eerder goedgekeurde zelftests (uit de tijd dat ze in Redactie bleven) kunnen alsnog naar Nieuws
    if (c.status !== 'concept' && !(c.type === 'zelftest' && c.status === 'goedgekeurd')) return fail(res, 409, 'Alleen een concept kan worden goedgekeurd.');
    const controle = await herControleer(db, c);
    if (controle.fouten.length && body.fouten_gecontroleerd !== true) return fail(res, 422, `Er staan nog ${controle.fouten.length} punten open in de controle. Los ze op of bevestig dat je ze hebt gecontroleerd.`);
    const stempel = { beoordeeld_door: user.id, beoordeeld_op: new Date().toISOString(), controle, regenereren: false };
    // overzetten naar Nieuws als CONCEPT (nooit gepubliceerd)
    const rij = naarNieuwsRij(c);
    let slug = rij.slug || slugify(rij.title);
    const bestaand = new Set((await db.newsList()).map((n) => n.slug));
    for (let i = 2; bestaand.has(slug) && i < 50; i++) slug = `${rij.slug}-${i}`.slice(0, 90);
    const nieuws = await db.newsCreate({ ...rij, slug, status: 'concept', author_id: user.id });
    if (isUpload(c.afbeelding)) await db.newsUpdate(nieuws.id, { featured_image: uploadPad(c.afbeelding) });
    else if (c.afbeelding) {
      try {
        const r = await fetch(`${siteUrl()}/assets/img/${c.afbeelding}-1024.webp`);
        if (r.ok) {
          const bytes = Buffer.from(await r.arrayBuffer());
          const pad = `${new Date().getFullYear()}/${randomToken(12)}.webp`;
          await db.putObject('nieuws', pad, bytes, 'image/webp');
          await db.newsUpdate(nieuws.id, { featured_image: pad });
        }
      } catch (err) { logError('redactie-afbeelding', err); } // zonder afbeelding gaat het bericht gewoon door
    }
    await db.redConceptUpdate(c.id, { ...stempel, status: 'overgezet', nieuws_id: nieuws.id });
    return json(res, 200, { ok: true, status: 'overgezet', nieuws_id: nieuws.id });
  }

  // ------------------------------------------------------------ nieuwsitems
  if (actie === 'redactie-item-status') {
    if (!isUuid(body.id) || !['nieuw', 'genegeerd'].includes(body.status)) return fail(res, 422, 'Ongeldige gegevens.');
    await db.redItemUpdate(body.id, { status: body.status });
    return json(res, 200, { ok: true });
  }

  // ------------------------------------------------------------ bronnen
  if (actie === 'redactie-bron-opslaan') {
    const row = {
      naam: str(body.naam, 120), url: str(body.url, 500), categorie: CATEGORIEEN.includes(body.categorie) ? body.categorie : 'algemeen',
      betrouwbaarheid: Math.max(1, Math.min(5, parseInt(body.betrouwbaarheid, 10) || 3)), regio: str(body.regio, 60),
      pagina_ophalen: body.pagina_ophalen === true, actief: body.actief !== false,
    };
    if (row.naam.length < 2) return fail(res, 422, 'Vul een naam in.');
    if (!/^https:\/\/[^\s]+$/.test(row.url)) return fail(res, 422, 'Vul een https-adres van een RSS- of Atom-feed in.');
    try {
      const b = isUuid(body.id) ? await db.redBronUpdate(body.id, row) : await db.redBronCreate(row);
      return json(res, 200, { ok: true, item: b });
    } catch (err) { if (err.status === 409) return fail(res, 409, 'Deze bron bestaat al.'); throw err; }
  }
  if (actie === 'redactie-bron-verwijderen') {
    if (!isUuid(body.id)) return fail(res, 422, 'Ongeldige bron.');
    await db.redBronDelete(body.id);
    return json(res, 200, { ok: true });
  }

  // ------------------------------------------------------------ instellingen
  if (actie === 'redactie-instellingen-opslaan') {
    const w = body.instellingen || {};
    const zet = async (k, v) => db.redInstellingZet(k, v);
    if (typeof w.actief === 'boolean') await zet('actief', w.actief);
    if (typeof w.taalcontrole === 'boolean') await zet('taalcontrole', w.taalcontrole);
    if (w.model !== undefined) { const m = str(w.model, 80); if (!/^[\w.:/-]{2,80}$/.test(m)) return fail(res, 422, 'Ongeldige modelnaam.'); await zet('model', m); }
    if (w.ollama_url !== undefined) { const u = str(w.ollama_url, 200); if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(u)) return fail(res, 422, 'Ollama moet op deze pc draaien (http://localhost:11434).'); await zet('ollama_url', u); }
    if (w.min_relevantie !== undefined) await zet('min_relevantie', Math.max(0, Math.min(100, parseInt(w.min_relevantie, 10) || 0)));
    if (w.bewaar_dagen !== undefined) await zet('bewaar_dagen', Math.max(14, Math.min(365, parseInt(w.bewaar_dagen, 10) || 60)));
    if (w.per_run !== undefined) await zet('per_run', Math.max(1, Math.min(8, parseInt(w.per_run, 10) || 4)));
    if (w.voorraad && typeof w.voorraad === 'object') {
      const v = {}; for (const t of TYPES) if (w.voorraad[t] !== undefined) v[t] = Math.max(0, Math.min(20, parseInt(w.voorraad[t], 10) || 0));
      await zet('voorraad', v);
    }
    if (w.frequentie && typeof w.frequentie === 'object') {
      const f = {};
      for (const t of TYPES) {
        const x = w.frequentie[t]; if (!x) continue;
        f[t] = { aantal: Math.max(0, Math.min(14, parseInt(x.aantal, 10) || 0)), per: x.per === 'maand' ? 'maand' : 'week' };
      }
      await zet('frequentie', f);
    }
    if (w.onderwerpen && typeof w.onderwerpen === 'object') {
      const o = {};
      for (const t of ['weetje', 'kennis', 'zelftest', 'praktijk']) if (Array.isArray(w.onderwerpen[t])) o[t] = w.onderwerpen[t].map((x) => str(x, 160)).filter(Boolean).slice(0, 60);
      await zet('onderwerpen', o);
    }
    return json(res, 200, { ok: true, instellingen: instellingen(await db.redInstellingen()) });
  }
  return null;
}
