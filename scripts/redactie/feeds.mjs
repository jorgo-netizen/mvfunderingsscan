/**
 * RSS/Atom lezen zonder extra pakketten, en de relevantie van een nieuwsitem voor MV Funderingsscan bepalen.
 * We bewaren alleen titel, link, datum en een korte samenvatting (nooit hele artikelen).
 */
const UA = 'MV-Funderingsscan-redactie/1.0 (+https://www.mvfunderingsquickscan.nl/)';

const decode = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n)))
  .replace(/\s+/g, ' ').trim();
const tag = (xml, naam) => { const m = xml.match(new RegExp(`<${naam}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${naam}>`, 'i')); return m ? m[1] : ''; };

/** Haalt een feed op en geeft [{titel, url, datum, samenvatting}] terug. */
export async function leesFeed(url, { timeoutMs = 20000 } = {}) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`feed ${r.status}`);
  const xml = await r.text();
  const blokken = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blokken.slice(0, 100).map((b) => {
    const link = decode(tag(b, 'link')) || (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
    const datum = decode(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'));
    const d = datum ? new Date(datum) : null;
    return {
      titel: decode(tag(b, 'title')).slice(0, 300),
      url: link.trim(),
      datum: d && !Number.isNaN(d.getTime()) ? d.toISOString() : null,
      samenvatting: decode(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')).slice(0, 900),
      uitgever: decode(tag(b, 'source')).slice(0, 120),
    };
  }).filter((i) => i.titel && /^https?:\/\//.test(i.url));
}

/** Leesbare tekst van een open webpagina (alleen bij bronnen waar dat mag), maximaal ca. 6000 tekens. */
export async function leesPagina(url, { timeoutMs = 20000 } = {}) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`pagina ${r.status}`);
  let html = await r.text();
  html = html.replace(/<(script|style|nav|header|footer|aside|form|noscript)[\s\S]*?<\/\1>/gi, ' ');
  const main = (html.match(/<(article|main)[\s>][\s\S]*?<\/\1>/i) || [html])[0];
  return decode(main.replace(/<\/(p|h[1-6]|li)>/gi, '\n')).slice(0, 6000);
}

// ---------------------------------------------------------------- relevantie
// [patroon, gewicht, sterk]: alleen een "sterk" woord maakt een bericht inhoudelijk relevant; zwakke woorden tellen pas mee als er ook een sterk woord in staat
const KERN = [
  [/fundering|funderings/i, 30, true], [/paalrot|houten pal|paalfundering|heipal/i, 25, true], [/bodemdaling|inklinking|\bzetting\b|verzakk/i, 20, true],
  [/\bkcaf\b|funderingslabel|risicoklasse|funderingsrisico/i, 25, true], [/funderingsherstel|funderingsproblem/i, 25, true],
  [/scheur(en|vorming)? in (de )?(gevel|muur|muren|woning)|scheefstand|kraken onder/i, 15, true],
  [/grondwater|droogte|droge zomer|grondwaterpeil/i, 10, false], [/\bveen(grond|weide|gebied)?\b|\bklei(grond)?\b|ondergrond/i, 5, false],
  [/aardbevingsschade|versterkingsoperatie|mijnbouwschade|gaswinning/i, 10, false],
  [/taxatie|taxateur|\bnhg\b|hypotheek/i, 5, false], [/subsidie|regeling|lening/i, 5, false],
];
const ONDERWERPEN = [
  [/paalrot|houten pal|paalfundering/i, 'houten paalfunderingen'], [/bodemdaling|inklink|zetting/i, 'bodemdaling'],
  [/funderingsherstel/i, 'funderingsherstel'], [/kcaf|funderingslabel|risicoklasse|funderingsrisico/i, 'funderingsrisico'],
  [/grondwater|droogte/i, 'grondwater en droogte'], [/subsidie|regeling|lening/i, 'subsidies en regelingen'],
  [/aardbeving|versterking|mijnbouw|gaswinning/i, 'gaswinning en aardbevingen'], [/taxatie|nhg|hypotheek/i, 'taxatie en financiering'],
  [/fundering/i, 'funderingen'],
];
export const PLAATSEN = ['Leeuwarden', 'Sneek', 'Heerenveen', 'Drachten', 'Harlingen', 'Franeker', 'Dokkum', 'Bolsward', 'Groningen', 'Haren', 'Appingedam', 'Delfzijl', 'Veendam', 'Winschoten', 'Stadskanaal', 'Hoogezand', 'Assen', 'Roden', 'Eelde', 'Zuidlaren', 'Vries', 'Gieten', 'Friesland', 'Fryslân', 'Drenthe'];
const REGIO_OK = /friesland|fryslân|groningen|drenthe|leeuwarden|sneek|heerenveen|drachten|harlingen|franeker|dokkum|bolsward|haren|appingedam|delfzijl|veendam|winschoten|stadskanaal|hoogezand|assen|roden|eelde|zuidlaren|vries|gieten|noorden/i;

/** Score 0–100 op basis van vakwoorden, regio, actualiteit en betrouwbaarheid van de bron. */
export function beoordeel(item, bron) {
  const t = `${item.titel} ${item.samenvatting}`;
  const kern = KERN.some(([re, , sterk]) => sterk && re.test(t));
  let score = 0;
  if (kern) for (const [re, w] of KERN) if (re.test(t)) score += w;
  const plaats = PLAATSEN.find((p) => new RegExp(`\\b${p}\\b`, 'i').test(t)) || '';
  if (plaats && kern) score += 10;
  if (item.datum) { const dagen = (Date.now() - new Date(item.datum).getTime()) / 864e5; score += dagen <= 7 ? 10 : dagen <= 30 ? 5 : dagen > 180 ? -20 : 0; }
  score += ((bron.betrouwbaarheid || 3) - 3) * 5;
  // algemene en regionale feeds: zonder vakwoord niet relevant
  if (!kern) score = 0;
  const onderwerp = (ONDERWERPEN.find(([re]) => re.test(t)) || [, ''])[1];
  const regio = plaats || (REGIO_OK.test(t) ? 'Noord-Nederland' : bron.regio || '');
  return { relevantie: Math.max(0, Math.min(100, score)), onderwerp, regio, regionaal: Boolean(plaats || REGIO_OK.test(t)) };
}
