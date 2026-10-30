/**
 * Tests voor nieuwsbeheer, inloggen en QuickScan Track & Trace (npm test).
 * Draaien tegen de geheugen-database (MVFS_DB=memory) met een nagebootste e-maildienst:
 * er wordt niets echt verstuurd en er is geen Supabase nodig. De Supabase-koppeling zelf
 * (api/_lib/db.js) wordt hier NIET getest; zie IMPLEMENTATIEHANDLEIDING voor de controle na livegang.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.MVFS_DB = 'memory';
process.env.MVFS_DEV_STORAGE = mkdtempSync(join(tmpdir(), 'mvfs-test-'));
process.env.MVFS_SITE_URL = 'https://www.mvfunderingsquickscan.nl';
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_KEY; delete process.env.VERCEL_ENV;

const { getDb, resetDbForTests } = await import('../api/_lib/db.js');
const { hashPassword, verifyPassword, SESSION_COOKIE } = await import('../api/_lib/auth.js');
const { renderMarkdown } = await import('../api/_lib/markdown.js');
const aanvraag = (await import('../api/aanvraag.js')).default;
const status = (await import('../api/status.js')).default;
const beheer = (await import('../api/beheer.js')).default;
const nieuws = (await import('../api/nieuws.js')).default;
const adresApi = (await import('../api/adres.js')).default;
const vertaalApi = (await import('../api/vertaal.js')).default;

// ---------------------------------------------------------------- hulpmiddelen
let mails = []; let resendFails = false;
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).startsWith('https://api.resend.com/')) {
    const body = JSON.parse(opts.body);
    mails.push({ ...body, idem: opts.headers['Idempotency-Key'] });
    if (resendFails) return new Response(JSON.stringify({ message: 'testfout' }), { status: 500 });
    return new Response(JSON.stringify({ id: `re_${mails.length}` }), { status: 200 });
  }
  for (const [prefix, fn] of extraFetch) if (String(url).startsWith(prefix)) return fn(String(url), opts);
  throw new Error(`Onverwachte fetch in test: ${url}`);
};
let extraFetch = []; // per test: [[url-begin, handler]] voor PDOK, DeepL enz.
const jsonResp = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let ipCounter = 0;
async function call(handler, { method = 'GET', url = '/', body, cookie = '', csrf, ip, origin } = {}) {
  const headers = { host: 'localhost:3000', 'x-forwarded-for': ip || `10.0.0.${++ipCounter % 250}` };
  if (cookie) headers.cookie = cookie;
  if (csrf) headers['x-mvfs-csrf'] = csrf;
  if (origin) headers.origin = origin;
  const req = { method, url, headers, body, socket: {} };
  const out = { status: 200, headers: {}, body: '' };
  const res = {
    set statusCode(v) { out.status = v; }, get statusCode() { return out.status; },
    setHeader(k, v) { out.headers[k.toLowerCase()] = v; },
    end(b) { out.body = b === undefined ? '' : String(b); },
  };
  await handler(req, res);
  try { out.json = JSON.parse(out.body); } catch { out.json = null; }
  return out;
}

async function newUser(role = 'beheerder', email = `${role}@test.nl`) {
  await getDb().createUser({ email, name: role === 'beheerder' ? 'Test Beheerder' : 'Test Medewerker', role, password_hash: await hashPassword('correct-horse-battery') });
}
async function loginAs(email) {
  const r = await call(beheer, { method: 'POST', url: '/api/beheer/?actie=inloggen', body: { email, wachtwoord: 'correct-horse-battery' } });
  assert.equal(r.status, 200, r.body);
  const cookie = r.headers['set-cookie'].split(';')[0];
  return { cookie, csrf: r.json.csrf };
}
const admin = (s, actie, opts = {}) => call(beheer, { ...opts, url: `/api/beheer/?actie=${actie}${opts.query || ''}`, cookie: s.cookie, csrf: opts.method === 'POST' ? s.csrf : undefined });

const formFields = (extra = {}) => ({ naam: 'Jan de Vries', email: 'jan@example.com', telefoon: '0612345678', adres: 'Voorbeeldstraat 1', postcode: '8911 AA', plaats: 'Leeuwarden', type: 'fase0', privacy: 'on', formulier_id: `test-${Math.random().toString(36).slice(2)}-${Date.now()}`, ...extra });
const tokenFromMail = (m) => (m.text.match(/#t=([A-Za-z0-9_-]{43})/) || [])[1];

beforeEach(() => {
  for (const k of Object.keys(globalThis)) if (k.startsWith('__mvfsMemoryDb')) delete globalThis[k];
  resetDbForTests();
  mails = []; resendFails = false; extraFetch = [];
  delete process.env.DEEPL_API_KEY; delete process.env.MVFS_VERTAAL_TEST;
  process.env.RESEND_API_KEY = 're_test';
});

// ---------------------------------------------------------------- Markdown
test('markdown: geen HTML of scripts, alleen veilige links', () => {
  const { html } = renderMarkdown('## Kop\n<script>alert(1)</script>\n\n[x](javascript:alert(1)) [ok](/fase-0-funderingsonderzoek/) [ext](https://example.com/a?b=1&c=2)\n\n- **vet** en *cursief*\n\n[x" onmouseover="alert(1)](/a/)');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!/href="javascript/i.test(html));
  assert.ok(html.includes('<a href="/fase-0-funderingsonderzoek/">ok</a>'));
  assert.ok(html.includes('rel="noopener noreferrer nofollow"'));
  assert.ok(html.includes('<h2 id="kop">Kop</h2>'));
  assert.ok(html.includes('<strong>vet</strong>') && html.includes('<em>cursief</em>'));
  assert.ok(!/<a [^>]*onmouseover/i.test(html), 'geen extra attributen via linktekst');
});

// ---------------------------------------------------------------- inloggen
test('wachtwoorden: scrypt-hash, nooit leesbaar opgeslagen', async () => {
  const h = await hashPassword('correct-horse-battery');
  assert.ok(h.startsWith('scrypt$') && !h.includes('correct-horse'));
  assert.equal(await verifyPassword('correct-horse-battery', h), true);
  assert.equal(await verifyPassword('fout-wachtwoord-123', h), false);
  await assert.rejects(hashPassword('kort'));
});

test('inloggen: geldige login, algemene foutmelding, beveiligde cookie en blokkade na 5 pogingen', async () => {
  await newUser('beheerder');
  const ok = await call(beheer, { method: 'POST', url: '/api/beheer/?actie=inloggen', body: { email: 'beheerder@test.nl', wachtwoord: 'correct-horse-battery' } });
  assert.equal(ok.status, 200);
  const c = ok.headers['set-cookie'];
  assert.ok(c.startsWith(`${SESSION_COOKIE}=`) && /HttpOnly/.test(c) && /Secure/.test(c) && /SameSite=Strict/.test(c));
  const wrong = await call(beheer, { method: 'POST', url: '/api/beheer/?actie=inloggen', body: { email: 'beheerder@test.nl', wachtwoord: 'verkeerd-wachtwoord' } });
  const unknown = await call(beheer, { method: 'POST', url: '/api/beheer/?actie=inloggen', body: { email: 'bestaat-niet@test.nl', wachtwoord: 'verkeerd-wachtwoord' } });
  assert.equal(wrong.status, 401); assert.equal(unknown.status, 401);
  assert.equal(wrong.json.error, unknown.json.error, 'zelfde melding: niet te achterhalen of een account bestaat');
  for (let i = 0; i < 4; i++) await call(beheer, { method: 'POST', url: '/api/beheer/?actie=inloggen', body: { email: 'beheerder@test.nl', wachtwoord: 'x-verkeerd-wachtwoord' } });
  const blocked = await call(beheer, { method: 'POST', url: '/api/beheer/?actie=inloggen', body: { email: 'beheerder@test.nl', wachtwoord: 'correct-horse-battery' } });
  assert.equal(blocked.status, 429, 'ook met juist wachtwoord geblokkeerd na 5 fouten');
});

test('autorisatie: geen toegang zonder login, CSRF verplicht, rol gecontroleerd, uitloggen werkt', async () => {
  assert.equal((await call(beheer, { url: '/api/beheer/?actie=dashboard' })).status, 401);
  assert.equal((await call(beheer, { url: '/api/beheer/?actie=aanvragen' })).status, 401);
  assert.equal((await call(beheer, { url: '/api/beheer/?actie=aanvragen', cookie: `${SESSION_COOKIE}=verzonnen-token` })).status, 401);
  await newUser('medewerker');
  const s = await loginAs('medewerker@test.nl');
  assert.equal((await admin(s, 'dashboard')).status, 200);
  const noCsrf = await call(beheer, { method: 'POST', url: '/api/beheer/?actie=nieuws-opslaan', cookie: s.cookie, body: { title: 'Test titel' } });
  assert.equal(noCsrf.status, 403, 'POST zonder CSRF-token wordt geweigerd');
  const otherOrigin = await call(beheer, { method: 'POST', url: '/api/beheer/?actie=nieuws-opslaan', cookie: s.cookie, csrf: s.csrf, origin: 'https://evil.example', body: { title: 'Test titel' } });
  assert.equal(otherOrigin.status, 403, 'POST van een andere site wordt geweigerd');
  // medewerker mag geen aanvraag verwijderen
  await call(aanvraag, { method: 'POST', url: '/api/aanvraag/', body: { form: 'aanvraag', fields: formFields() } });
  const [req] = await getDb().requestsList({});
  const del = await admin(s, 'aanvraag-verwijderen', { method: 'POST', body: { id: req.id, bevestig: req.dossier_nr } });
  assert.equal(del.status, 403);
  const out = await admin(s, 'uitloggen', { method: 'POST', body: {} });
  assert.equal(out.status, 200);
  assert.equal((await admin(s, 'dashboard')).status, 401, 'sessie is na uitloggen ongeldig');
});

// ---------------------------------------------------------------- nieuws
test('nieuws: concept, unieke slug, publiceren, aanpassen, depubliceren, verwijderen', async () => {
  await newUser('medewerker');
  const s = await loginAs('medewerker@test.nl');
  const content = '## Wat verandert er?\n\nDit is een testbericht met voldoende tekst om te kunnen publiceren. '.repeat(4) + '\n\nLees meer over [fase 0](/fase-0-funderingsonderzoek/).';
  const evil = await admin(s, 'nieuws-opslaan', { method: 'POST', body: { title: 'x</script><script>alert(1)</script>', slug: 'xss-test', excerpt: 'Intro', content } });
  await admin(s, 'nieuws-status', { method: 'POST', body: { id: evil.json.item.id, status: 'gepubliceerd' } });
  const evilPage = await call(nieuws, { url: '/api/nieuws?slug=xss-test' });
  assert.equal(evilPage.status, 200);
  assert.ok(!evilPage.body.includes('<script>alert(1)'), 'titel kan geen script injecteren (ook niet via JSON-LD)');
  await admin(s, 'nieuws-verwijderen', { method: 'POST', body: { id: evil.json.item.id, bevestig: true } });
  const created = await admin(s, 'nieuws-opslaan', { method: 'POST', body: { title: 'Nieuwe regels <b>funderingsonderzoek</b>', content } });
  assert.equal(created.status, 200, created.body);
  const item = created.json.item;
  assert.equal(item.status, 'concept');
  assert.equal(item.slug, 'nieuwe-regels-b-funderingsonderzoek-b');
  const dup = await admin(s, 'nieuws-opslaan', { method: 'POST', body: { title: 'Ander bericht', slug: item.slug, content } });
  assert.equal(dup.status, 409, 'dubbele slug geweigerd');
  // concept is niet openbaar
  assert.equal((await call(nieuws, { url: `/api/nieuws?slug=${item.slug}` })).status, 404);
  const sm0 = await call(nieuws, { url: '/api/nieuws?sitemap=1' });
  assert.ok(!sm0.body.includes(item.slug));
  // publiceren zonder introductie mislukt
  const noIntro = await admin(s, 'nieuws-status', { method: 'POST', body: { id: item.id, status: 'gepubliceerd' } });
  assert.equal(noIntro.status, 422);
  await admin(s, 'nieuws-opslaan', { method: 'POST', body: { id: item.id, title: item.title, slug: 'nieuwe-regels-funderingsonderzoek', excerpt: 'Korte introductie.', content } });
  const pub = await admin(s, 'nieuws-status', { method: 'POST', body: { id: item.id, status: 'gepubliceerd' } });
  assert.equal(pub.status, 200, pub.body);
  assert.ok(pub.json.item.published_at);
  const page = await call(nieuws, { url: '/api/nieuws?slug=nieuwe-regels-funderingsonderzoek' });
  assert.equal(page.status, 200);
  assert.ok(page.body.includes('Nieuwe regels &lt;b&gt;funderingsonderzoek&lt;/b&gt;'), 'titel ge-escaped');
  assert.ok(!page.body.includes('<b>funderingsonderzoek</b>'), 'ook niet onge-escaped in JSON-LD');
  assert.ok(page.body.includes('"@type":"NewsArticle"') || page.body.includes('"@type": "NewsArticle"'));
  assert.ok(page.body.includes('<link rel="canonical" href="https://www.mvfunderingsquickscan.nl/nieuws/nieuwe-regels-funderingsonderzoek/">'));
  assert.ok(page.body.includes('href="/fase-0-funderingsonderzoek/"'));
  const index = await call(nieuws, { url: '/api/nieuws' });
  assert.ok(index.body.includes('/nieuws/nieuwe-regels-funderingsonderzoek/') && !index.body.includes('noindex'));
  assert.ok((await call(nieuws, { url: '/api/nieuws?sitemap=1' })).body.includes('/nieuws/nieuwe-regels-funderingsonderzoek/'));
  // aanpassen na publicatie
  const upd = await admin(s, 'nieuws-opslaan', { method: 'POST', body: { id: item.id, title: 'Aangepaste titel', slug: 'nieuwe-regels-funderingsonderzoek', excerpt: 'Korte introductie.', content } });
  assert.equal(upd.status, 200);
  assert.ok((await call(nieuws, { url: '/api/nieuws?slug=nieuwe-regels-funderingsonderzoek' })).body.includes('Aangepaste titel'));
  // voorbeeld: noindex
  const prev = await admin(s, 'nieuws-voorbeeld', { query: `&id=${item.id}` });
  assert.ok(prev.body.includes('noindex'));
  // depubliceren
  await admin(s, 'nieuws-status', { method: 'POST', body: { id: item.id, status: 'concept' } });
  assert.equal((await call(nieuws, { url: '/api/nieuws?slug=nieuwe-regels-funderingsonderzoek' })).status, 404);
  assert.ok(!(await call(nieuws, { url: '/api/nieuws?sitemap=1' })).body.includes('nieuwe-regels'));
  assert.ok((await call(nieuws, { url: '/api/nieuws' })).body.includes('noindex'), 'lege nieuwspagina niet indexeren');
  // verwijderen vraagt bevestiging
  assert.equal((await admin(s, 'nieuws-verwijderen', { method: 'POST', body: { id: item.id } })).status, 422);
  assert.equal((await admin(s, 'nieuws-verwijderen', { method: 'POST', body: { id: item.id, bevestig: true } })).status, 200);
  assert.equal((await admin(s, 'nieuws', { query: `&id=${item.id}` })).status, 404);
});

test('nieuws: afbeelding wordt gecontroleerd op type en inhoud', async () => {
  await newUser('medewerker');
  const s = await loginAs('medewerker@test.nl');
  const { json } = await admin(s, 'nieuws-opslaan', { method: 'POST', body: { title: 'Bericht met afbeelding' } });
  const fake = Buffer.from('<svg onload=alert(1)>').toString('base64');
  assert.equal((await admin(s, 'nieuws-afbeelding', { method: 'POST', body: { id: json.item.id, type: 'image/jpeg', data: fake } })).status, 422);
  assert.equal((await admin(s, 'nieuws-afbeelding', { method: 'POST', body: { id: json.item.id, type: 'image/svg+xml', data: fake } })).status, 422);
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200)]).toString('base64');
  const ok = await admin(s, 'nieuws-afbeelding', { method: 'POST', body: { id: json.item.id, type: 'image/jpeg', data: jpeg, alt: 'Gevel met scheur' } });
  assert.equal(ok.status, 200, ok.body);
  assert.match(ok.json.image_url, /^\/__dev-storage\/nieuws\/\d{4}\/[A-Za-z0-9_-]{16}\.jpg$/, 'willekeurige bestandsnaam');
});

// ---------------------------------------------------------------- Track & Trace
test('aanvraag: Fase 0 wordt geregistreerd, klant krijgt trackinglink, dubbele inzending geeft geen tweede dossier of mail', async () => {
  const fields = formFields();
  const r = await call(aanvraag, { method: 'POST', url: '/api/aanvraag/', body: { form: 'aanvraag', fields } });
  assert.equal(r.status, 200);
  assert.match(r.json.tracking.dossier, /^MV-\d{4}-0001$/);
  assert.equal(r.json.tracking.mail, 'verzonden');
  const customer = mails.find((m) => m.to[0] === 'jan@example.com');
  const office = mails.find((m) => m.to[0] === 'info@mvadviseurs.nl');
  assert.ok(customer && office, 'klantmail en kantoormail');
  assert.ok(customer.idem && office.idem, 'Idempotency-Key bij beide mails');
  assert.ok(office.text.includes(r.json.tracking.dossier));
  const token = tokenFromMail(customer);
  assert.ok(token, 'link met token in de mail');
  assert.ok(customer.text.includes(`https://www.mvfunderingsquickscan.nl/status/#t=${token}`), 'token in #-fragment, niet in querystring');
  // token staat alleen gehasht in de database
  const db = getDb();
  const raw = JSON.stringify(db._data);
  assert.ok(!raw.includes(token), 'token zelf niet opgeslagen');
  // dubbele inzending
  mails = [];
  const again = await call(aanvraag, { method: 'POST', url: '/api/aanvraag/', body: { form: 'aanvraag', fields } });
  assert.equal(again.json.tracking.dossier, r.json.tracking.dossier);
  assert.equal(db._data.requests.length, 1);
  assert.ok(!mails.some((m) => m.to[0] === 'jan@example.com'), 'geen tweede klantmail');
});

test('aanvraag: alleen Fase 0 en alleen met database; contactformulier ongewijzigd', async () => {
  await call(aanvraag, { method: 'POST', url: '/api/aanvraag/', body: { form: 'aanvraag', fields: formFields({ type: 'fase1' }) } });
  await call(aanvraag, { method: 'POST', url: '/api/aanvraag/', body: { form: 'contact', fields: { naam: 'A', email: 'a@example.com', vraag: 'Vraag', privacy: 'on' } } });
  assert.equal(getDb()._data.requests.length, 0);
  assert.equal(mails.length, 2, 'beide nog wel naar kantoor gemaild');
  // zonder database: oude gedrag
  process.env.MVFS_DB = ''; resetDbForTests();
  const r = await call(aanvraag, { method: 'POST', url: '/api/aanvraag/', body: { form: 'aanvraag', fields: formFields() } });
  assert.equal(r.status, 200); assert.equal(r.json.tracking, undefined);
  process.env.MVFS_DB = 'memory'; resetDbForTests();
});

test('aanvraag: mislukte klantmail wordt vastgelegd als mislukt; formulier blijft werken', async () => {
  resendFails = true;
  const r = await call(aanvraag, { method: 'POST', url: '/api/aanvraag/', body: { form: 'home', fields: formFields() } });
  assert.equal(r.status, 200, 'aanvraag is geregistreerd, dus niet verloren');
  assert.equal(r.json.tracking.mail, 'mislukt');
  const e = getDb()._data.emails[0];
  assert.equal(e.status, 'mislukt'); assert.ok(e.error);
  // opnieuw versturen na fout: nu wel een mail met een NIEUWE geldige link
  resendFails = false; mails = [];
  const again = await call(aanvraag, { method: 'POST', url: '/api/aanvraag/', body: { form: 'home', fields: { ...formFields(), formulier_id: getDb()._data.requests[0].idempotency_key } } });
  assert.equal(again.json.tracking.mail, 'verzonden');
  const token = tokenFromMail(mails.find((m) => m.to[0] === 'jan@example.com'));
  assert.equal((await call(status, { method: 'POST', url: '/api/status/', body: { token } })).status, 200);
});

test('aanvraag: maximaal 5 nieuwe dossiers per uur per IP-adres', async () => {
  for (let i = 0; i < 7; i++) await call(aanvraag, { method: 'POST', url: '/api/aanvraag/', ip: '192.0.2.7', body: { form: 'aanvraag', fields: formFields() } });
  assert.equal(getDb()._data.requests.length, 5);
});

test('trackingpagina: juiste status, geen persoonsgegevens, ongeldige link afgewezen, geen toegang tot andere dossiers', async () => {
  await call(aanvraag, { method: 'POST', url: '/api/aanvraag/', body: { form: 'aanvraag', fields: formFields() } });
  const tokenA = tokenFromMail(mails.find((m) => m.to[0] === 'jan@example.com'));
  await call(aanvraag, { method: 'POST', url: '/api/aanvraag/', body: { form: 'aanvraag', fields: formFields({ naam: 'Piet', email: 'piet@example.com', adres: 'Andere straat 9' }) } });
  const tokenB = tokenFromMail(mails.find((m) => m.to[0] === 'piet@example.com'));
  const a = await call(status, { method: 'POST', url: '/api/status/', body: { token: tokenA } });
  assert.equal(a.status, 200);
  assert.equal(a.json.status, 'ontvangen');
  assert.equal(a.json.label, 'Aanvraag ontvangen');
  assert.equal(a.headers['referrer-policy'], 'no-referrer');
  for (const secret of ['Jan', 'jan@example.com', 'Voorbeeldstraat', '0612345678', '8911']) assert.ok(!a.body.includes(secret), `geen ${secret} in klantweergave`);
  const b = await call(status, { method: 'POST', url: '/api/status/', body: { token: tokenB } });
  assert.notEqual(a.json.dossier, b.json.dossier, 'elk token alleen het eigen dossier');
  const bad = await call(status, { method: 'POST', url: '/api/status/', body: { token: 'A'.repeat(43) } });
  const malformed = await call(status, { method: 'POST', url: '/api/status/', body: { token: '1' } });
  assert.equal(bad.status, 404); assert.equal(malformed.status, 404);
  assert.equal(bad.json.error, malformed.json.error);
  assert.equal((await call(status, { method: 'GET', url: '/api/status/' })).status, 405, 'token nooit via GET/URL');
});

test('statusbeheer: wijziging zichtbaar voor klant, interne notitie niet, link opnieuw uitgeven en intrekken, rapport veilig beschikbaar', async () => {
  await newUser('beheerder');
  const s = await loginAs('beheerder@test.nl');
  await call(aanvraag, { method: 'POST', url: '/api/aanvraag/', body: { form: 'aanvraag', fields: formFields() } });
  const token = tokenFromMail(mails.find((m) => m.to[0] === 'jan@example.com'));
  const [req] = (await admin(s, 'aanvragen')).json.items;
  assert.equal(req.token_hash, undefined, 'hash niet naar de browser');
  assert.equal(req.link_actief, true);
  const view = async (t = token) => call(status, { method: 'POST', url: '/api/status/', body: { token: t } });

  // zoeken
  assert.equal((await admin(s, 'aanvragen', { query: `&q=${req.dossier_nr}` })).json.items.length, 1);
  assert.equal((await admin(s, 'aanvragen', { query: '&q=onbekend-xyz' })).json.items.length, 0);

  assert.equal((await admin(s, 'aanvraag-status', { method: 'POST', body: { id: req.id, status: 'verzonnen' } })).status, 422);
  await admin(s, 'aanvraag-status', { method: 'POST', body: { id: req.id, status: 'in_behandeling' } });
  await admin(s, 'aanvraag-status', { method: 'POST', body: { id: req.id, status: 'info_nodig', bericht: 'Wil je de bouwtekening mailen?' } });
  await admin(s, 'aanvraag-notitie', { method: 'POST', body: { id: req.id, notitie: 'INTERN: klant was lastig bereikbaar' } });
  let v = await view();
  assert.equal(v.json.status, 'info_nodig');
  assert.equal(v.json.message, 'Wil je de bouwtekening mailen?');
  assert.ok(!v.body.includes('INTERN'), 'interne notitie niet zichtbaar');
  assert.ok(!v.body.includes('Test Beheerder'), 'naam medewerker niet zichtbaar');
  assert.deepEqual(v.json.steps.map((x) => x.key), ['ontvangen', 'in_behandeling', 'info_nodig', 'rapport_opstellen', 'afgerond']);
  assert.ok(!('eta' in v.json) && !('opleverdatum' in v.json), 'geen verzonnen opleverdatum');
  await admin(s, 'aanvraag-status', { method: 'POST', body: { id: req.id, status: 'rapport_opstellen' } });
  v = await view();
  assert.equal(v.json.message, '', 'oud klantbericht verdwijnt bij nieuwe status');

  // rapport: uploaden, pas downloadbaar bij 'afgerond'
  const up = await admin(s, 'aanvraag-rapport-upload', { method: 'POST', body: { id: req.id, type: 'application/pdf', grootte: 1234 } });
  assert.equal(up.status, 200);
  await getDb().putObject('rapporten', up.json.pad, Buffer.from('%PDF-1.4 test'), 'application/pdf');
  assert.equal((await admin(s, 'aanvraag-rapport-bevestig', { method: 'POST', body: { id: req.id, pad: '../../etc/passwd' } })).status, 422);
  assert.equal((await admin(s, 'aanvraag-rapport-bevestig', { method: 'POST', body: { id: req.id, pad: up.json.pad } })).status, 200);
  assert.equal((await call(status, { method: 'POST', url: '/api/status/', body: { token, actie: 'rapport' } })).status, 404, 'nog niet afgerond');
  await admin(s, 'aanvraag-status', { method: 'POST', body: { id: req.id, status: 'afgerond' } });
  v = await view();
  assert.equal(v.json.report.available, true);
  const dl = await call(status, { method: 'POST', url: '/api/status/', body: { token, actie: 'rapport' } });
  assert.equal(dl.status, 200);
  assert.ok(dl.json.expires_in <= 60 && /verloopt=\d+/.test(dl.json.url), 'kortlopende link');
  assert.ok(!dl.json.url.includes(token));

  // link opnieuw uitgeven: oude werkt niet meer, nieuwe wel
  mails = [];
  assert.equal((await admin(s, 'aanvraag-link', { method: 'POST', body: { id: req.id } })).json.mail, 'verzonden');
  assert.equal((await view()).status, 404, 'oude link ingetrokken');
  const newToken = tokenFromMail(mails[0]);
  assert.equal((await view(newToken)).status, 200);
  // intrekken
  await admin(s, 'aanvraag-link-intrekken', { method: 'POST', body: { id: req.id } });
  assert.equal((await view(newToken)).status, 404);
  // e-maillog
  const detail = await admin(s, 'aanvraag', { query: `&id=${req.id}` });
  assert.deepEqual(detail.json.emails.map((e) => [e.kind, e.status]), [['bevestiging', 'verzonden'], ['nieuwe_link', 'verzonden']]);
  assert.equal(detail.json.request.token_hash, undefined);
  // verwijderen door beheerder (met dossiernummer als bevestiging)
  assert.equal((await admin(s, 'aanvraag-verwijderen', { method: 'POST', body: { id: req.id, bevestig: 'fout' } })).status, 422);
  assert.equal((await admin(s, 'aanvraag-verwijderen', { method: 'POST', body: { id: req.id, bevestig: req.dossier_nr } })).status, 200);
  assert.equal(getDb()._data.requests.length + getDb()._data.history.length + getDb()._data.notes.length + getDb()._data.emails.length, 0);
});

// ---------------------------------------------------------------- statische pagina's
// ---------------------------------------------------------------- QuickScan-rapporten
const { crc32, readZip } = await import('../api/_lib/zip.js');
const { deflateSync } = await import('node:zlib');
function testPng(w = 80, hgt = 60) {
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(hgt, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * hgt, 0x80); for (let y = 0; y < hgt; y++) raw[y * (w * 3 + 1)] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const FOTOVAKKEN = [['voorblad', 1], ['conclusie', 1], ['bouwtekening', 1], ['bodemdaling', 1], ['omgeving', 1], ['lintvoeg', 1]];
const volledig = () => ({
  voorblad: { object_straat: 'Voorbeeldstraat 1', object_postcode: '8911 AA', object_plaats: 'Leeuwarden', uitgebracht_op: '2026-10-20' },
  algemeen: { inspectie_datum: '2026-10-15', inspectie_tijd: '10:30', opdrachtgever_naam: 'Testpersoon', opdrachtgever_straat: 'Teststraat 2', opdrachtgever_postcode: '8911 AB', opdrachtgever_plaats: 'Leeuwarden', opdrachtgever_email: 'klant@example.com' },
  object: { type: 'Tussenwoning', bouwjaar: '1930', weertype: 'Bewolkt', temperatuur: '12', luchtvochtigheid: '70' },
  vraagstelling: { reden: 'verkoop', bestemming: 'woonfunctie' },
  conclusie: { risico: 'midden', risico_bevestigd: true, advies: 'Testadvies voor dit fictieve testrapport.', opmaak_plaats: 'Leeuwarden', opmaak_datum: '2026-10-20' },
  bouwtekeningen: { ontvangen: 'ja', vorm: 'digitaal', jaartal: '1930', fundering: 'Houten paalfundering' },
  bodem: { mm_per_jaar: '1', typering: 'Klein' },
  omgeving: { resultaat: 'Testresultaat omgeving.' },
  lintvoeg: { meetpunten: 'voorgevel', rijen: [{ omschrijving: 'meting 1', meting: '5', afstand: '2000', typering: 'Zeer klein' }] },
  schietlood: { nvt: true, nvt_motivatie: 'Niet uitgevoerd in deze test.' },
});
async function fotosToevoegen(s, id) {
  for (const [slot, position] of FOTOVAKKEN) {
    const f = await admin(s, 'rapport-foto', { method: 'POST', body: { id, slot, position, data: testPng().toString('base64') } });
    assert.equal(f.status, 200, f.body);
  }
}
async function rapportKlaar(s) {
  const adv = (await admin(s, 'rapport-adviseurs')).json.items.sort((a, b) => a.name.localeCompare(b.name));
  const nieuw = await admin(s, 'rapport-nieuw', { method: 'POST', body: {} });
  assert.equal(nieuw.status, 200, nieuw.body);
  const id = nieuw.json.id;
  const opslaan = await admin(s, 'rapport-opslaan', { method: 'POST', body: { id, data: volledig(), advisor_id: adv[0].id, status: 'in_uitvoering' } });
  assert.equal(opslaan.status, 200, opslaan.body);
  await fotosToevoegen(s, id);
  return { id, nr: nieuw.json.report_nr, adv };
}

test('rapporten: vaste adviseurs, uniek rapportnummer, alleen bekende velden, controle blokkeert onvolledig rapport', async () => {
  await newUser('beheerder'); const s = await loginAs('beheerder@test.nl');
  const adv = (await admin(s, 'rapport-adviseurs')).json.items;
  assert.deepEqual(adv.map((a) => [a.name, a.certificate]).sort(), [['Melvin Krikke', 'CE240260817-02'], ['Rutger Fopma', 'CE240260817-03']]);
  const a = await admin(s, 'rapport-nieuw', { method: 'POST', body: {} });
  const b = await admin(s, 'rapport-nieuw', { method: 'POST', body: {} });
  assert.match(a.json.report_nr, /^QS-\d{4}-\d{4}$/);
  assert.notEqual(a.json.report_nr, b.json.report_nr);
  const o = await admin(s, 'rapport-opslaan', { method: 'POST', body: { id: a.json.id, data: { voorblad: { object_straat: 'x'.repeat(500), onbekend: 'weg' }, extra: { a: 1 }, conclusie: { risico: 'zeerhoog' } } } });
  assert.equal(o.status, 200);
  assert.equal(o.json.report.data.voorblad.object_straat.length, 120);
  assert.equal(o.json.report.data.voorblad.onbekend, undefined);
  assert.equal(o.json.report.data.extra, undefined);
  assert.equal(o.json.report.data.conclusie.risico, '', 'geen onbekende risicocategorie');
  assert.ok(o.json.controle.fouten.some((f) => f.stap === 'conclusie' && f.veld === 'risico'));
  assert.equal((await admin(s, 'rapport-definitief', { method: 'POST', body: { id: a.json.id, bevestig_risico: '' } })).status, 422);
  // foto: alleen echte afbeeldingen in bestaande fotovakken
  assert.equal((await admin(s, 'rapport-foto', { method: 'POST', body: { id: a.json.id, slot: 'voorblad', position: 1, data: Buffer.from('<script>').toString('base64') } })).status, 422);
  assert.equal((await admin(s, 'rapport-foto', { method: 'POST', body: { id: a.json.id, slot: 'onbekend', position: 1, data: testPng().toString('base64') } })).status, 422);
  assert.equal((await admin(s, 'rapport-foto', { method: 'POST', body: { id: a.json.id, slot: 'lintvoeg', position: 5, data: testPng().toString('base64') } })).status, 422);
  // zoeken op rapportnummer
  const lijst = await admin(s, 'rapporten', { query: `&q=${encodeURIComponent(a.json.report_nr)}` });
  assert.deepEqual(lijst.json.items.map((x) => x.report_nr), [a.json.report_nr]);
  // onbekend id
  assert.equal((await admin(s, 'rapport', { query: '&id=00000000-0000-4000-8000-000000000000' })).status, 404);
});

test('rapporten: risicocategorie komt alleen van de adviseur en moet worden bevestigd; Word volgt het sjabloon', async () => {
  await newUser('beheerder'); const s = await loginAs('beheerder@test.nl');
  const db = getDb();
  const { id, nr } = await rapportKlaar(s);
  let d = await admin(s, 'rapport', { query: `&id=${id}` });
  assert.deepEqual(d.json.controle.fouten, [], JSON.stringify(d.json.controle.fouten));
  assert.equal((await admin(s, 'rapport-definitief', { method: 'POST', body: { id, bevestig_risico: 'laag' } })).status, 422, 'andere categorie dan gekozen');
  const data = volledig(); data.conclusie.risico_bevestigd = false;
  await admin(s, 'rapport-opslaan', { method: 'POST', body: { id, data } });
  assert.equal((await admin(s, 'rapport-definitief', { method: 'POST', body: { id, bevestig_risico: 'midden' } })).status, 422, 'onbevestigd risico blokkeert');
  await admin(s, 'rapport-opslaan', { method: 'POST', body: { id, data: volledig() } });
  const w = await admin(s, 'rapport-word', { query: `&id=${id}` });
  assert.equal(w.status, 200, w.body);
  assert.match(w.json.url, /verloopt=/);
  const def = await admin(s, 'rapport-definitief', { method: 'POST', body: { id, bevestig_risico: 'midden' } });
  assert.equal(def.status, 200, def.body);
  d = await admin(s, 'rapport', { query: `&id=${id}` });
  assert.equal(d.json.report.status, 'definitief');
  assert.equal(d.json.report.risk, 'midden');
  assert.equal(d.json.bewerkbaar, false);
  const docx = readZip(await db.getObject('rapport-bestanden', d.json.versions[0].docx_path));
  const xml = [...docx.entries()].filter(([k]) => /^word\/(document|footer\d*)\.xml$/.test(k)).map(([, v]) => v.toString('utf8')).join('');
  assert.ok(!xml.includes('{{'), 'geen open sjabloonvelden');
  for (const t of ['Melvin Krikke', 'CE240260817-02', 'Voorbeeldstraat 1', nr, 'MV Funderingsscan B.V.', '42204729', 'Testadvies voor dit fictieve testrapport.']) assert.ok(xml.includes(t), `ontbreekt: ${t}`);
  assert.ok(xml.includes('mvfs-pijl'), 'pijl op het voorblad');
  // definitief = niet meer te wijzigen
  assert.equal((await admin(s, 'rapport-opslaan', { method: 'POST', body: { id, data: volledig() } })).status, 409);
  assert.equal((await admin(s, 'rapport-foto', { method: 'POST', body: { id, slot: 'voorblad', position: 1, data: testPng().toString('base64') } })).status, 409);
  const vb = await admin(s, 'rapport-voorbeeld', { query: `&id=${id}&versie=1` });
  assert.equal(vb.status, 200);
  assert.ok(vb.body.includes('Melvin Krikke'));
  assert.ok(vb.headers['content-security-policy'].includes("default-src 'none'"));
});

test('rapporten: keuzelijsten verplicht, 1 tot 4 foto\'s per onderdeel, extra foto\'s in Word', async () => {
  await newUser('beheerder'); const s = await loginAs('beheerder@test.nl');
  const db = getDb();
  const { id } = await rapportKlaar(s);
  const keuzes = (await admin(s, 'rapport', { query: `&id=${id}` })).json.keuzes;
  assert.ok(keuzes['object.type'].includes('Tussenwoning') && keuzes['object.weertype'].length > 3);
  // vrije tekst in een keuzeveld wordt niet geaccepteerd
  const vrij = volledig(); vrij.object.type = 'kasteel'; vrij.object.weertype = 'lekker'; vrij.lintvoeg.rijen[0].typering = 'erg';
  const o = await admin(s, 'rapport-opslaan', { method: 'POST', body: { id, data: vrij } });
  for (const [stap, veld] of [['object', 'type'], ['object', 'weertype'], ['lintvoeg', 'rij0']]) assert.ok(o.json.controle.fouten.some((f) => f.stap === stap && f.veld === veld), `${stap}.${veld}`);
  await admin(s, 'rapport-opslaan', { method: 'POST', body: { id, data: volledig() } });
  // maximaal 4 foto's per onderdeel, voorblad 1
  for (const position of [2, 3, 4]) assert.equal((await admin(s, 'rapport-foto', { method: 'POST', body: { id, slot: 'conclusie', position, data: testPng(120 + position, 90).toString('base64'), caption: `bijschrift ${position}` } })).status, 200);
  assert.equal((await admin(s, 'rapport-foto', { method: 'POST', body: { id, slot: 'conclusie', position: 5, data: testPng().toString('base64') } })).status, 422);
  assert.equal((await admin(s, 'rapport-foto', { method: 'POST', body: { id, slot: 'voorblad', position: 2, data: testPng().toString('base64') } })).status, 422);
  assert.equal((await admin(s, 'rapport-definitief', { method: 'POST', body: { id, bevestig_risico: 'midden' } })).status, 200);
  const d = await admin(s, 'rapport', { query: `&id=${id}` });
  const docx = readZip(await db.getObject('rapport-bestanden', d.json.versions[0].docx_path));
  const xml = docx.get('word/document.xml').toString('utf8');
  for (const p of [1, 2, 3, 4]) assert.ok(docx.get(`word/media/mvfs_conclusie_${p}.png`), `conclusiefoto ${p}`);
  assert.ok(xml.includes('Foto 3: bijschrift 3'), 'bijschriften extra foto\'s');
  const ids = [...xml.matchAll(/<wp:docPr id="(\d+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'unieke tekening-id\'s');
});

test('rapporten: definitief maken alleen door gekoppelde adviseur of beheerder; adviseurs alleen door beheerder', async () => {
  await newUser('beheerder'); await newUser('medewerker'); await newUser('medewerker', 'melvin@test.nl');
  const s = await loginAs('beheerder@test.nl'); const m = await loginAs('medewerker@test.nl'); const mk = await loginAs('melvin@test.nl');
  const { id, adv } = await rapportKlaar(m);
  assert.equal((await admin(m, 'rapport-definitief', { method: 'POST', body: { id, bevestig_risico: 'midden' } })).status, 403);
  assert.equal((await admin(m, 'rapport-adviseur-opslaan', { method: 'POST', body: { id: adv[0].id, name: 'X', certificate: 'Y-123' } })).status, 403);
  assert.equal((await admin(m, 'rapport-gebruikers')).status, 403);
  const users = (await admin(s, 'rapport-gebruikers')).json.items;
  const melvinUser = users.find((u) => u.email === 'melvin@test.nl');
  assert.ok(melvinUser && !('password_hash' in melvinUser));
  assert.equal((await admin(s, 'rapport-adviseur-opslaan', { method: 'POST', body: { id: adv[0].id, name: adv[0].name, certificate: adv[0].certificate, user_id: melvinUser.id } })).status, 200);
  assert.equal((await admin(m, 'rapport-definitief', { method: 'POST', body: { id, bevestig_risico: 'midden' } })).status, 403, 'andere medewerker nog steeds niet');
  assert.equal((await admin(mk, 'rapport-definitief', { method: 'POST', body: { id, bevestig_risico: 'midden' } })).status, 200);
  assert.equal((await admin(m, 'rapport-verwijderen', { method: 'POST', body: { id, bevestig: 'x' } })).status, 403);
  // portretfoto voor de website: alleen beheerder, alleen echte afbeeldingen
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]).toString('base64');
  assert.equal((await admin(m, 'rapport-adviseur-foto', { method: 'POST', body: { id: adv[0].id, type: 'image/jpeg', data: jpeg } })).status, 403);
  assert.equal((await admin(s, 'rapport-adviseur-foto', { method: 'POST', body: { id: adv[0].id, type: 'image/jpeg', data: Buffer.from('<svg>').toString('base64') } })).status, 422);
  const foto = await admin(s, 'rapport-adviseur-foto', { method: 'POST', body: { id: adv[0].id, type: 'image/jpeg', data: jpeg } });
  assert.equal(foto.status, 200); assert.match(foto.json.foto_url, /team\/[\w-]+\.jpg$/);
  assert.ok((await admin(s, 'rapport-adviseurs')).json.items.find((a) => a.id === adv[0].id).foto_url);
  assert.equal((await admin(s, 'rapport-adviseur-foto', { method: 'POST', body: { id: adv[0].id, verwijderen: true } })).json.foto_url, null);
});

test('rapporten: PDF vastleggen, versturen met adrescontrole, geen dubbele verzending, nieuwe versie overschrijft niets, uitkomst op trackingpagina', async () => {
  await newUser('beheerder'); const s = await loginAs('beheerder@test.nl');
  const db = getDb();
  await call(aanvraag, { method: 'POST', url: '/api/aanvraag/', body: { form: 'aanvraag', fields: formFields() } });
  const token = tokenFromMail(mails.find((m) => m.to[0] === 'jan@example.com')); const req = db._data.requests[0];
  const nieuw = await admin(s, 'rapport-nieuw', { method: 'POST', body: { request_id: req.id } });
  const id = nieuw.json.id;
  let d = await admin(s, 'rapport', { query: `&id=${id}` });
  assert.equal(d.json.report.data.algemeen.opdrachtgever_naam, 'Jan de Vries', 'gegevens uit de aanvraag overgenomen');
  assert.equal(d.json.aanvraag.dossier_nr, req.dossier_nr);
  await admin(s, 'rapport-opslaan', { method: 'POST', body: { id, data: volledig(), advisor_id: d.json.advisors[0].id } });
  await fotosToevoegen(s, id);
  const view = () => call(status, { method: 'POST', url: '/api/status/', body: { token } });
  assert.equal((await view()).json.uitkomst, null, 'geen uitkomst zolang het rapport niet definitief is');
  assert.equal((await admin(s, 'rapport-versturen', { method: 'POST', body: { id, email: 'klant@example.com', bevestig_email: 'klant@example.com' } })).status, 409);
  assert.equal((await admin(s, 'rapport-definitief', { method: 'POST', body: { id, bevestig_risico: 'midden' } })).status, 200);
  assert.equal((await view()).json.uitkomst, 'midden', 'uitkomst zichtbaar na definitief');
  assert.equal((await admin(s, 'rapport-versturen', { method: 'POST', body: { id, email: 'klant@example.com', bevestig_email: 'klant@example.com' } })).status, 422, 'eerst PDF');
  // PDF: alleen echte PDF, alleen het eigen pad
  assert.equal((await admin(s, 'rapport-pdf-upload', { method: 'POST', body: { id, type: 'image/png', grootte: 10 } })).status, 422);
  const up = await admin(s, 'rapport-pdf-upload', { method: 'POST', body: { id, type: 'application/pdf', grootte: 20 } });
  assert.equal(up.status, 200);
  await db.putObject('rapport-bestanden', up.json.pad, Buffer.from('geen pdf'));
  assert.equal((await admin(s, 'rapport-pdf-bevestig', { method: 'POST', body: { id, pad: up.json.pad } })).status, 422);
  const up2 = await admin(s, 'rapport-pdf-upload', { method: 'POST', body: { id, type: 'application/pdf', grootte: 20 } });
  await db.putObject('rapport-bestanden', up2.json.pad, Buffer.from('%PDF-1.7 test'));
  assert.equal((await admin(s, 'rapport-pdf-bevestig', { method: 'POST', body: { id, pad: '../rapporten/x.pdf' } })).status, 422);
  assert.equal((await admin(s, 'rapport-pdf-bevestig', { method: 'POST', body: { id, pad: up2.json.pad } })).status, 200);
  // versturen: e-mailadres twee keer gelijk
  mails = [];
  assert.equal((await admin(s, 'rapport-versturen', { method: 'POST', body: { id, email: 'klant@example.com', bevestig_email: 'klant@exampel.com' } })).status, 422);
  assert.equal(mails.length, 0);
  const send = await admin(s, 'rapport-versturen', { method: 'POST', body: { id, email: 'klant@example.com', bevestig_email: 'KLANT@example.com', koppel_tracking: true } });
  assert.equal(send.status, 200, send.body);
  assert.equal(mails.length, 1);
  assert.deepEqual(mails[0].to, ['klant@example.com']);
  assert.equal(Buffer.from(mails[0].attachments[0].content, 'base64').toString(), '%PDF-1.7 test');
  // dubbel versturen geblokkeerd, tenzij bewust opnieuw
  assert.equal((await admin(s, 'rapport-versturen', { method: 'POST', body: { id, email: 'klant@example.com', bevestig_email: 'klant@example.com' } })).status, 409);
  assert.equal(mails.length, 1);
  assert.equal((await admin(s, 'rapport-pdf-upload', { method: 'POST', body: { id, type: 'application/pdf', grootte: 20 } })).status, 409, 'verzonden PDF niet vervangen');
  const v = await view();
  assert.equal(v.json.status, 'afgerond');
  assert.equal(v.json.report.available, true);
  d = await admin(s, 'rapport', { query: `&id=${id}` });
  assert.equal(d.json.report.status, 'verzonden');
  assert.deepEqual(d.json.emails.map((e) => [e.kind, e.status]), [['rapport_v1', 'verzonden']]);
  assert.equal(d.json.versions[0].sent_to, 'klant@example.com');
  // nieuwe versie: versie 1 blijft ongewijzigd bewaard
  const v1Docx = await db.getObject('rapport-bestanden', d.json.versions[0].docx_path);
  assert.equal((await admin(s, 'rapport-nieuwe-versie', { method: 'POST', body: { id } })).status, 200);
  const data2 = volledig(); data2.conclusie.risico = 'hoog';
  await admin(s, 'rapport-opslaan', { method: 'POST', body: { id, data: data2 } });
  assert.equal((await admin(s, 'rapport-definitief', { method: 'POST', body: { id, bevestig_risico: 'hoog' } })).status, 200);
  d = await admin(s, 'rapport', { query: `&id=${id}` });
  assert.deepEqual(d.json.versions.map((x) => [x.version, x.risk]), [[2, 'hoog'], [1, 'midden']]);
  assert.ok((await db.getObject('rapport-bestanden', d.json.versions[1].docx_path)).equals(v1Docx), 'versie 1 ongewijzigd');
  assert.equal((await view()).json.uitkomst, 'hoog');
  // verwijderen met rapportnummer als bevestiging
  assert.equal((await admin(s, 'rapport-verwijderen', { method: 'POST', body: { id, bevestig: 'fout' } })).status, 422);
  assert.equal((await admin(s, 'rapport-verwijderen', { method: 'POST', body: { id, bevestig: nieuw.json.report_nr } })).status, 200);
  assert.equal((await admin(s, 'rapport', { query: `&id=${id}` })).status, 404);
});

// ---------------------------------------------------------------- adres opzoeken en vertalen
const PDOK = 'https://api.pdok.nl/';
function pdokMock(calls) {
  return [PDOK, (url) => {
    calls.push(url);
    if (url.includes('/locatieserver/')) {
      if (url.includes('9999ZZ')) return jsonResp({ response: { docs: [] } });
      return jsonResp({ response: { docs: [
        { straatnaam: 'Teststraat', huisnummer: 12, postcode: '8911AA', woonplaatsnaam: 'Leeuwarden', gemeentenaam: 'Leeuwarden', provincienaam: 'Fryslân', centroide_ll: 'POINT(5.8 53.2)', adresseerbaarobject_id: '0080010000000001', weergavenaam: 'Teststraat 12, 8911AA Leeuwarden' },
        { straatnaam: 'Teststraat', huisnummer: 12, huisletter: 'a', postcode: '8911AA', woonplaatsnaam: 'Leeuwarden', gemeentenaam: 'Leeuwarden', provincienaam: 'Fryslân', centroide_ll: 'POINT(5.8 53.2)', adresseerbaarobject_id: '0080010000000002', weergavenaam: 'Teststraat 12a, 8911AA Leeuwarden' },
      ] } });
    }
    if (url.includes('/verblijfsobject/items')) return jsonResp({ features: [{ properties: { gebruiksdoel: 'woonfunctie', 'pand.href': ['https://api.pdok.nl/kadaster/bag/ogc/v2/collections/pand/items/abc'] } }] });
    if (url.includes('/pand/items/abc')) return jsonResp({ properties: { bouwjaar: 1932 } });
    return jsonResp({}, 404);
  }];
}

test('adres: postcode + huisnummer geeft straat, plaats en bouwjaar (BAG); ongeldige invoer en onbekend adres netjes afgehandeld', async () => {
  const calls = []; extraFetch = [pdokMock(calls)];
  let r = await call(adresApi, { url: '/api/adres/?postcode=8911%20aa&huisnummer=12' });
  assert.equal(r.status, 200, r.body);
  assert.deepEqual([r.json.adres.straat_huisnummer, r.json.adres.postcode, r.json.adres.plaats, r.json.adres.bouwjaar], ['Teststraat 12', '8911 AA', 'Leeuwarden', 1932]);
  assert.equal(r.json.adres.lat, undefined, 'geen ligging naar de browser');
  assert.match(r.headers['cache-control'], /s-maxage/);
  r = await call(adresApi, { url: '/api/adres/?postcode=8911AA&huisnummer=12a' });
  assert.equal(r.json.adres.straat_huisnummer, 'Teststraat 12a');
  assert.equal((await call(adresApi, { url: '/api/adres/?postcode=8911AA&huisnummer=12b' })).status, 409, 'onbekende toevoeging: kiezen we niet zelf');
  assert.equal((await call(adresApi, { url: '/api/adres/?postcode=9999ZZ&huisnummer=1' })).status, 404);
  assert.equal((await call(adresApi, { url: '/api/adres/?postcode=abc&huisnummer=1' })).status, 422);
  assert.equal((await call(adresApi, { url: '/api/adres/?postcode=8911AA&huisnummer=' })).status, 422);
  assert.ok(calls.every((u) => u.startsWith(PDOK)), 'alleen PDOK');
  extraFetch = [[PDOK, () => { throw new Error('storing'); }]];
  assert.equal((await call(adresApi, { url: '/api/adres/?postcode=8911AA&huisnummer=14' })).status, 503);
});

test('vertalen: knop verborgen zonder sleutel; DeepL alleen voor nieuwe tekst; merknaam blijft; andere sites geweigerd; maandlimiet', async () => {
  let r = await call(vertaalApi, { url: '/api/vertaal/' });
  assert.equal(r.json.beschikbaar, false);
  assert.equal((await call(vertaalApi, { method: 'POST', url: '/api/vertaal/', body: { segmenten: ['Hallo'] } })).status, 503);

  process.env.DEEPL_API_KEY = 'test-sleutel:fx';
  const verzoeken = [];
  extraFetch = [['https://api-free.deepl.com/', (url, opts) => {
    const b = JSON.parse(opts.body); verzoeken.push(b);
    assert.equal(opts.headers.Authorization, 'DeepL-Auth-Key test-sleutel:fx');
    return jsonResp({ translations: b.text.map((t) => ({ text: t.replace('Funderingsonderzoek', 'Foundation survey').replace('<x-keep>MV Funderingsscan</x-keep>', '<x-keep>MV Funderingsscan</x-keep>') })) });
  }]];
  assert.equal((await call(vertaalApi, { url: '/api/vertaal/' })).json.beschikbaar, true);
  const seg = ['Funderingsonderzoek door <a data-k="0">MV Funderingsscan</a>', 'Funderingsonderzoek'];
  r = await call(vertaalApi, { method: 'POST', url: '/api/vertaal/', body: { segmenten: seg } });
  assert.equal(r.status, 200, r.body);
  assert.deepEqual(r.json.vertalingen, ['Foundation survey door <a data-k="0">MV Funderingsscan</a>', 'Foundation survey']);
  assert.equal(verzoeken.length, 1);
  assert.equal(verzoeken[0].target_lang, 'EN-GB'); assert.equal(verzoeken[0].tag_handling, 'html');
  assert.ok(verzoeken[0].text[0].includes('<x-keep>MV Funderingsscan</x-keep>'), 'merknaam beschermd');
  // tweede keer: uit de cache, geen DeepL-aanroep
  r = await call(vertaalApi, { method: 'POST', url: '/api/vertaal/', body: { segmenten: [seg[1], seg[0]] } });
  assert.deepEqual(r.json.vertalingen, ['Foundation survey', 'Foundation survey door <a data-k="0">MV Funderingsscan</a>']);
  assert.equal(verzoeken.length, 1, 'niet opnieuw naar DeepL');
  // andere website, te veel of ongeldige segmenten
  assert.equal((await call(vertaalApi, { method: 'POST', url: '/api/vertaal/', origin: 'https://evil.example', body: { segmenten: ['Nieuw'] } })).status, 403);
  assert.equal((await call(vertaalApi, { method: 'POST', url: '/api/vertaal/', body: { segmenten: Array(51).fill('x') } })).status, 422);
  assert.equal((await call(vertaalApi, { method: 'POST', url: '/api/vertaal/', body: { segmenten: [{ x: 1 }] } })).status, 422);
  // maandlimiet
  process.env.DEEPL_MAAND_LIMIET = '20';
  try {
    assert.equal((await call(vertaalApi, { method: 'POST', url: '/api/vertaal/', body: { segmenten: ['Een heel nieuwe zin die nog niet vertaald is'] } })).status, 503);
    assert.equal(verzoeken.length, 1);
  } finally { delete process.env.DEEPL_MAAND_LIMIET; }
});

test('trackingpagina en beheer: noindex, geen externe scripts, niet in de sitemap', () => {
  const dist = join(import.meta.dirname, '..', 'dist');
  for (const p of ['status', 'beheer']) {
    const html = readFileSync(join(dist, p, 'index.html'), 'utf8');
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'), `${p} noindex`);
    assert.ok(!/<script[^>]+src="https?:/i.test(html), `${p} geen externe scripts`);
    assert.ok(html.includes('<meta name="referrer" content="no-referrer">'));
  }
  const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
  assert.ok(!sitemap.includes('/status/') && !sitemap.includes('/beheer/'));
  const robots = readFileSync(join(dist, 'robots.txt'), 'utf8');
  assert.ok(robots.includes('Disallow: /beheer/') && robots.includes('nieuws-sitemap.xml'));
});
