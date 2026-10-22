/**
 * Openbare nieuwspagina's (via rewrites in vercel.json):
 *   /nieuws/                → overzicht van gepubliceerde berichten
 *   /nieuws/<slug>/         → artikel (alleen als het gepubliceerd is; concepten geven 404)
 *   /nieuws-sitemap.xml     → sitemap met gepubliceerde berichten
 * Nieuwe of gewijzigde berichten zijn binnen ongeveer een minuut zichtbaar (CDN-cache van 60 s).
 */
import { getDb } from './_lib/db.js';
import { sendHtml, sendText, logError } from './_lib/http.js';
import { renderNewsIndex, renderNewsArticle, newsSitemap } from './_lib/news-render.js';
import { isSlug } from './_lib/markdown.js';
import { head, header, footer, esc } from '../src/lib/layout.mjs';

const CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600';

function notFound(res) {
  const html = `${head({ path: '/nieuws/', title: 'Bericht niet gevonden | MV Funderingsscan', description: 'Dit nieuwsbericht bestaat niet (meer).', robots: 'noindex, follow', canonical: false, schema: '' })}
${header('/nieuws/')}
<main id="main"><section class="section"><div class="container prose">
  <h1>Bericht niet gevonden</h1>
  <p>Dit nieuwsbericht bestaat niet of is niet (meer) gepubliceerd.</p>
  <p><a href="/nieuws/">${esc('Bekijk alle nieuwsberichten')}</a> of ga naar de <a href="/">homepage</a>.</p>
</div></section></main>
${footer()}`;
  return sendHtml(res, 404, html, { cache: 'public, max-age=0, s-maxage=60' });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Alleen GET is toegestaan.');
  const url = new URL(req.url, 'http://localhost');
  const db = getDb();
  try {
    // Vercel geeft bij rewrites de parameters in req.query; lokaal staan ze in de URL.
    const param = (k) => (req.query && typeof req.query[k] === 'string' ? req.query[k] : url.searchParams.get(k));
    const fromPath = url.pathname.match(/^\/nieuws\/([^/]+)\/?$/);
    if (param('sitemap') === '1' || url.pathname === '/nieuws-sitemap.xml') {
      const posts = db ? await db.newsList({ status: 'gepubliceerd' }) : [];
      return sendText(res, 200, newsSitemap(posts), 'application/xml; charset=utf-8', CACHE);
    }
    const slug = param('slug') || (fromPath ? decodeURIComponent(fromPath[1]) : null);
    if (slug) {
      if (!isSlug(slug) || !db) return notFound(res);
      const post = await db.newsBySlug(slug);
      if (!post || post.status !== 'gepubliceerd') return notFound(res);
      return sendHtml(res, 200, renderNewsArticle(db, post), { cache: CACHE });
    }
    const posts = db ? await db.newsList({ status: 'gepubliceerd' }) : [];
    return sendHtml(res, 200, renderNewsIndex(db, posts), { cache: CACHE });
  } catch (err) {
    logError('nieuws', err);
    return sendHtml(res, 503, '<!doctype html><meta charset="utf-8"><title>Tijdelijk niet beschikbaar</title><p>Het nieuws kan nu niet worden geladen. Probeer het later opnieuw.</p>', { cache: 'no-store' });
  }
}
