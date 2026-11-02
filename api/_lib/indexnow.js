/**
 * IndexNow: wijzigingen melden aan zoekmachines (Bing, Yandex, Seznam, Naver …; Google doet niet mee).
 * "Gemeld" betekent alleen dat de zoekmachine het verzoek heeft ontvangen, niet dat de URL gecrawld of geïndexeerd is.
 *
 * De sleutel staat in INDEXNOW_KEY (Vercel en GitHub Secret). Het sleutelbestand /<sleutel>.txt wordt bij de build
 * gemaakt; de sleutel is bij IndexNow per definitie openbaar, maar staat zo niet in Git.
 */
export const INDEXNOW_HOST = 'www.mvfunderingsquickscan.nl';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
export const isSleutel = (k) => typeof k === 'string' && /^[A-Za-z0-9-]{8,128}$/.test(k);

/** Alleen https-URL's van het productiedomein, ontdubbeld. */
export function schoneUrls(urls) {
  const uit = new Set();
  for (const u of urls || []) {
    try {
      const x = new URL(String(u));
      if (x.protocol === 'https:' && x.host === INDEXNOW_HOST && !x.search && !x.hash) uit.add(x.href);
    } catch { /* ongeldige URL overslaan */ }
  }
  return [...uit];
}

/**
 * Meldt URL's (max. 10.000 per verzoek volgens IndexNow; wij versturen kleine batches van 500).
 * Geeft { gemeld, batches: [{ status, aantal }], fout } terug en gooit nooit.
 */
export async function meldIndexNow(urls, { key = process.env.INDEXNOW_KEY, fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  const lijst = schoneUrls(urls);
  if (!isSleutel(key)) return { gemeld: 0, batches: [], fout: 'INDEXNOW_KEY ontbreekt of is ongeldig' };
  if (!lijst.length) return { gemeld: 0, batches: [], fout: null };
  const batches = []; let gemeld = 0; let fout = null;
  for (let i = 0; i < lijst.length; i += 500) {
    const deel = lijst.slice(i, i + 500);
    try {
      const r = await fetchImpl(ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host: INDEXNOW_HOST, key, keyLocation: `https://${INDEXNOW_HOST}/${key}.txt`, urlList: deel }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      batches.push({ status: r.status, aantal: deel.length });
      if (r.status === 200 || r.status === 202) gemeld += deel.length;
      else {
        fout = { 400: 'ongeldig verzoek', 403: 'sleutel niet geldig of sleutelbestand niet gevonden', 422: 'URL hoort niet bij de host of sleutel', 429: 'te veel verzoeken (later opnieuw)' }[r.status] || `status ${r.status}`;
        if (r.status === 429 || r.status === 403) break; // niet doorgaan met de volgende batches
      }
    } catch (err) {
      batches.push({ status: 0, aantal: deel.length }); fout = `netwerkfout: ${String(err.message || err).slice(0, 100)}`; break;
    }
  }
  return { gemeld, batches, fout };
}
