/**
 * Lokale ontwikkelserver – geen dependencies nodig.
 *
 *   npm run dev       bouwt de site, start http://localhost:3000 en herbouwt
 *                     automatisch + ververst de browser bij elke wijziging in
 *                     src/ of public/
 *   npm run preview   serveert de bestaande dist/ zonder watcher (zoals productie)
 *
 * Opties:  --port 4000   --no-watch
 * Gedrag zoals op Vercel (cleanUrls + trailingSlash): /fase-0 -> /fase-0/,
 * /fase-0/ -> dist/fase-0/index.html, onbekende URL -> dist/404.html (status 404).
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch, existsSync, readFileSync, realpathSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, extname, normalize, dirname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// realpath: voorkomt problemen met korte Windows-padnamen (bv. GEBRUI~1) bij fs.watch
const ROOT = realpathSync.native(join(dirname(fileURLToPath(import.meta.url)), '..'));
const DIST = join(ROOT, 'dist');
const args = process.argv.slice(2);
const WATCH = !args.includes('--no-watch');
const portArg = args.indexOf('--port');
let port = Number(portArg >= 0 ? args[portArg + 1] : process.env.PORT || 3000);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

// Redirects zonder host-voorwaarde uit vercel.json, zodat lokaal hetzelfde gedrag geldt.
const REDIRECTS = new Map(
  (JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')).redirects || [])
    .filter((r) => !r.has && !r.source.includes(':'))
    .map((r) => [r.source, r.destination]),
);

// Rewrites uit vercel.json (bijv. /nieuws/:slug/ -> /api/nieuws?slug=:slug).
const REWRITES = (JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')).rewrites || []).map((r) => {
  const names = [];
  const re = new RegExp(`^${r.source.replace(/[.]/g, '[.]').replace(/:([a-z]+)/g, (m, n) => { names.push(n); return '([^/]+)'; })}$`);
  return { re, names, destination: r.destination };
});
function rewrite(pathname) {
  for (const r of REWRITES) {
    const m = pathname.match(r.re);
    if (m) return r.names.reduce((d, n, i) => d.replace(`:${n}`, encodeURIComponent(m[i + 1])), r.destination);
  }
  return null;
}

// Alleen lokaal met MVFS_DB=memory: nagebootste bestandsopslag (in productie: Supabase Storage).
const DEV_STORAGE = resolve(ROOT, process.env.MVFS_DEV_STORAGE || 'tmp/dev-storage');
async function devStorage(req, res, pathname, url) {
  const isUpload = pathname.startsWith('/__dev-upload/');
  const rel = decodeURIComponent(pathname.replace(/^\/__dev-(upload|storage)\//, ''));
  const abs = resolve(DEV_STORAGE, rel);
  if (!abs.startsWith(DEV_STORAGE + sep)) { res.writeHead(403); return res.end(); }
  if (isUpload) {
    if (req.method !== 'PUT') { res.writeHead(405); return res.end(); }
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > 50 * 1024 * 1024) { res.writeHead(413); return res.end(); } chunks.push(c); }
    mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, Buffer.concat(chunks));
    res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"Key":"ok"}');
  }
  if (rel.startsWith('rapporten/') && !(Number(url.searchParams.get('verloopt')) > Date.now())) { res.writeHead(403); return res.end('Link verlopen'); }
  if (!existsSync(abs)) { res.writeHead(404); return res.end(); }
  const name = url.searchParams.get('download');
  res.writeHead(200, { 'Content-Type': TYPES[extname(abs).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', ...(name ? { 'Content-Disposition': `attachment; filename="${name.replace(/[^\w.-]/g, '_')}"` } : {}) });
  return res.end(readFileSync(abs));
}

// ---------------------------------------------------------------- bouwen
function runBuild() {
  // Apart proces, zodat gewijzigde JSON/templates altijd vers worden ingelezen.
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'build.mjs')], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, MVFS_PLACEHOLDERS: '1' } });
  if (r.status !== 0) {
    console.error('\n✖ Build mislukt:\n' + (r.stderr || r.stdout));
    return false;
  }
  process.stdout.write(r.stdout);
  return true;
}

if (WATCH || !existsSync(DIST)) {
  if (!runBuild() && !existsSync(DIST)) process.exit(1);
}

// ---------------------------------------------------------------- live reload
const clients = new Set();
const RELOAD_SNIPPET = `<script>(()=>{const es=new EventSource('/__livereload');es.onmessage=e=>{if(e.data==='reload')location.reload()};})();</script>`;

function notifyReload() {
  for (const res of clients) res.write('data: reload\n\n');
}

if (WATCH) {
  let timer = null;
  const schedule = (dir, file) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log(`↻ wijziging in ${dir}/${String(file ?? '').replace(/\\/g, '/')} – opnieuw bouwen…`);
      if (runBuild()) notifyReload();
    }, 120);
  };
  for (const dir of ['src', 'public']) {
    watch(join(ROOT, dir), { recursive: true }, (_evt, file) => schedule(dir, file));
  }
}

// ---------------------------------------------------------------- server
async function fileIfExists(p) {
  try {
    const s = await stat(p);
    return s.isFile() ? p : null;
  } catch {
    return null;
  }
}

// Headers uit vercel.json (zonder host-voorwaarde), zodat o.a. de Content-Security-Policy lokaal ook geldt.
const HEADER_RULES = (JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')).headers || [])
  .filter((r) => !r.has)
  .map((r) => ({ re: new RegExp(`^${r.source.replace(/[.]/g, '[.]').replace(/[(][.][*][)]/g, '(.*)')}$`), headers: r.headers }));
function vercelHeaders(pathname) {
  const out = {};
  for (const r of HEADER_RULES) if (r.re.test(pathname)) for (const h of r.headers) out[h.key] = h.value;
  delete out['Cache-Control'];
  return out;
}

async function send(res, path, status = 200, pathname = '') {
  let body = await readFile(path);
  const type = TYPES[extname(path).toLowerCase()] || 'application/octet-stream';
  const extra = vercelHeaders(pathname);
  // live-reload is een inline script; niet invoegen op pagina's met een strikte CSP (/beheer/, /status/)
  if (WATCH && type.startsWith('text/html') && !extra['Content-Security-Policy']) {
    body = Buffer.from(body.toString('utf8').replace('</body>', `${RELOAD_SNIPPET}\n</body>`));
  }
  res.writeHead(status, { ...extra, 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === '/__livereload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': verbonden\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    if (process.env.MVFS_DB === 'memory' && /^\/__dev-(upload|storage)\//.test(pathname)) return devStorage(req, res, pathname, url);

    // Rewrites (nieuws) -> serverless functie met querystring, zoals op Vercel
    const rewritten = rewrite(pathname);
    if (rewritten) {
      const target = new URL(rewritten, 'http://localhost');
      for (const [k, v] of url.searchParams) target.searchParams.set(k, v);
      req.url = target.pathname + target.search;
      pathname = target.pathname;
    }

    // Serverless functies uit api/ lokaal uitvoeren (zoals Vercel dat in productie doet)
    if (pathname.startsWith('/api/')) {
      const name = pathname.slice(5).replace(/\/$/, '');
      const file = join(ROOT, 'api', `${name}.js`);
      if (!/^[a-z0-9-]+$/.test(name) || !existsSync(file)) { res.writeHead(404); return res.end('Onbekende API'); }
      const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
      return mod.default(req, res);
    }

    // redirects uit vercel.json (exacte paden, met of zonder slash)
    const target = REDIRECTS.get(pathname) || REDIRECTS.get(pathname + '/');
    if (target) { res.writeHead(308, { Location: target + url.search }); return res.end(); }

    // padtraversal voorkomen
    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    const abs = join(DIST, safe);
    if (!abs.startsWith(DIST)) { res.writeHead(403); return res.end('Verboden'); }

    // cleanUrls: /pagina.html -> /pagina/ (behalve 404.html)
    if (pathname.endsWith('/index.html')) {
      res.writeHead(308, { Location: pathname.slice(0, -'index.html'.length) + url.search });
      return res.end();
    }

    const direct = await fileIfExists(abs);
    if (direct && !pathname.endsWith('/')) return send(res, direct, 200, pathname);

    if (pathname.endsWith('/')) {
      const index = await fileIfExists(join(abs, 'index.html'));
      if (index) return send(res, index, 200, pathname);
    } else if (await fileIfExists(join(abs, 'index.html'))) {
      // trailingSlash: /fase-0 -> /fase-0/
      res.writeHead(308, { Location: pathname + '/' + url.search });
      return res.end();
    }

    const notFound = join(DIST, '404.html');
    if (await fileIfExists(notFound)) return send(res, notFound, 404);
    res.writeHead(404); res.end('Niet gevonden');
  } catch (err) {
    console.error(err);
    res.writeHead(500); res.end('Serverfout');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Poort ${port} is bezet, probeer ${port + 1}…`);
    port += 1;
    server.listen(port);
  } else {
    throw err;
  }
});

server.on('listening', () => {
  console.log(`\n  MV Funderingsscan ${WATCH ? 'dev-server (live reload)' : 'preview'}`);
  console.log(`  ➜  http://localhost:${port}/\n`);
  if (WATCH) console.log('  Wijzig bestanden in src/ of public/ – de site herbouwt en ververst automatisch.\n');
});

server.listen(port);
