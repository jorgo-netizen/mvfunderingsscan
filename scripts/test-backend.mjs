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
process.env.MVFS_SITE_URL = 'https://www.mvfunderingsscan.nl';
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_KEY; delete process.env.VERCEL_ENV;

const { getDb, resetDbForTests } = await import('../api/_lib/db.js');
const { hashPassword, verifyPassword, SESSION_COOKIE } = await import('../api/_lib/auth.js');
const { renderMarkdown } = await import('../api/_lib/markdown.js');
const aanvraag = (await import('../api/aanvraag.js')).default;
const status = (await import('../api/status.js')).default;
const beheer = (await import('../api/beheer.js')).default;
const nieuws = (await import('../api/nieuws.js')).default;

// ---------------------------------------------------------------- hulpmiddelen
let mails = []; let resendFails = false;
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).startsWith('https://api.resend.com/')) {
    const body = JSON.parse(opts.body);
    mails.push({ ...body, idem: opts.headers['Idempotency-Key'] });
    if (resendFails) return new Response(JSON.stringify({ message: 'testfout' }), { status: 500 });
    return new Response(JSON.stringify({ id: `re_${mails.length}` }), { status: 200 });
  }
  throw new Error(`Onverwachte fetch in test: ${url}`);
};

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
  mails = []; resendFails = false;
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
  assert.ok(page.body.includes('<link rel="canonical" href="https://www.mvfunderingsscan.nl/nieuws/nieuwe-regels-funderingsonderzoek/">'));
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
  const office = mails.find((m) => m.to[0] === 'info@mideavastgoed.nl');
  assert.ok(customer && office, 'klantmail en kantoormail');
  assert.ok(customer.idem && office.idem, 'Idempotency-Key bij beide mails');
  assert.ok(office.text.includes(r.json.tracking.dossier));
  const token = tokenFromMail(customer);
  assert.ok(token, 'link met token in de mail');
  assert.ok(customer.text.includes(`https://www.mvfunderingsscan.nl/status/#t=${token}`), 'token in #-fragment, niet in querystring');
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
