/**
 * Adres en bouwjaar opzoeken bij postcode + huisnummer, via de open data van de overheid (PDOK):
 *   - Locatieserver: straat, plaats, gemeente, provincie en ligging;
 *   - BAG (Basisregistratie Adressen en Gebouwen): bouwjaar en gebruiksdoel van het pand.
 * Weergegevens voor het rapport komen van Open-Meteo (modeldata, ter controle door de adviseur).
 * Geen API-sleutels nodig. Alle aanroepen gaan via onze server: de bezoeker praat niet rechtstreeks met derden.
 */
const LOCATIESERVER = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free';
const BAG = 'https://api.pdok.nl/kadaster/bag/ogc/v2/collections';
const TIMEOUT = 4000;

export const normPostcode = (pc) => {
  const m = /^\s*([1-9][0-9]{3})\s?([A-Za-z]{2})\s*$/.exec(String(pc || ''));
  return m ? `${m[1]}${m[2].toUpperCase()}` : null;
};
/** "12", "12a", "12 A", "12-2", "12 bis" → { nummer: 12, letter: 'A', toevoeging: '' } */
export function splitHuisnummer(v) {
  const m = /^\s*(\d{1,5})\s*[-\s]?\s*([A-Za-z])?\s*[-\s]?\s*([A-Za-z0-9]{1,4})?\s*$/.exec(String(v || ''));
  if (!m) return null;
  return { nummer: Number(m[1]), letter: (m[2] || '').toUpperCase(), toevoeging: (m[3] || '').toUpperCase() };
}

async function getJson(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw Object.assign(new Error(`bron ${r.status}`), { status: 502 });
    return await r.json();
  } finally { clearTimeout(t); }
}

/** Zoekt het adres. Geeft null als het adres niet bestaat. Gooit bij een storing van de bron. */
export async function zoekAdres(postcode, huisnummer, { metBouwjaar = true } = {}) {
  const pc = normPostcode(postcode); const hn = splitHuisnummer(huisnummer);
  if (!pc || !hn) return null;
  const fl = 'weergavenaam,straatnaam,huisnummer,huisletter,huisnummertoevoeging,postcode,woonplaatsnaam,gemeentenaam,provincienaam,centroide_ll,adresseerbaarobject_id';
  const url = `${LOCATIESERVER}?q=${encodeURIComponent(`postcode:${pc} and huisnummer:${hn.nummer}`)}&fq=type:adres&rows=30&fl=${fl}`;
  const docs = (await getJson(url))?.response?.docs || [];
  const passend = (d) => String(d.huisletter || '').toUpperCase() === hn.letter && String(d.huisnummertoevoeging || '').toUpperCase() === hn.toevoeging;
  // Zonder toevoeging ingevuld maar alleen adressen mét letter/toevoeging: dan kiezen we niet zelf.
  const doc = docs.find(passend) || (hn.letter && !hn.toevoeging ? docs.find((d) => String(d.huisnummertoevoeging || '').toUpperCase() === hn.letter && !d.huisletter) : null);
  if (!doc) return docs.length ? { meerdere: docs.slice(0, 10).map((d) => d.weergavenaam) } : null;
  const nr = `${doc.huisnummer}${doc.huisletter || ''}${doc.huisnummertoevoeging ? `-${doc.huisnummertoevoeging}` : ''}`;
  const [lon, lat] = (/POINT\(([-\d.]+) ([-\d.]+)\)/.exec(doc.centroide_ll || '') || []).slice(1).map(Number);
  const uit = {
    straat: doc.straatnaam, huisnummer: nr, straat_huisnummer: `${doc.straatnaam} ${nr}`,
    postcode: `${doc.postcode.slice(0, 4)} ${doc.postcode.slice(4)}`, plaats: doc.woonplaatsnaam,
    gemeente: doc.gemeentenaam, provincie: doc.provincienaam, lat: lat || null, lon: lon || null, bouwjaar: null, gebruiksdoel: null,
  };
  if (metBouwjaar && doc.adresseerbaarobject_id) {
    try {
      const vbo = (await getJson(`${BAG}/verblijfsobject/items?identificatie=${encodeURIComponent(doc.adresseerbaarobject_id)}&f=json`))?.features?.[0]?.properties;
      uit.gebruiksdoel = vbo?.gebruiksdoel || null;
      const pandUrl = Array.isArray(vbo?.['pand.href']) ? vbo['pand.href'][0] : null;
      if (pandUrl && pandUrl.startsWith(`${BAG}/pand/items/`)) {
        const pand = (await getJson(`${pandUrl}?f=json`))?.properties;
        if (pand?.bouwjaar && pand.bouwjaar > 1000 && pand.bouwjaar <= new Date().getFullYear() + 1) uit.bouwjaar = pand.bouwjaar;
      }
    } catch { /* bouwjaar is een extraatje: zonder blijft het adres bruikbaar */ }
  }
  return uit;
}

/** Zoekt de ligging bij een vrij ingevuld adres (straat + huisnummer + postcode). */
export async function zoekLigging(tekst) {
  const url = `${LOCATIESERVER}?q=${encodeURIComponent(tekst)}&fq=type:adres&rows=1&fl=centroide_ll,weergavenaam`;
  const doc = (await getJson(url))?.response?.docs?.[0];
  const m = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(doc?.centroide_ll || '');
  return m ? { lon: Number(m[1]), lat: Number(m[2]), adres: doc.weergavenaam } : null;
}

// WMO-weercode → keuzelijst van het rapport
export function weertypeVanCode(c) {
  if (c === 0) return 'Zonnig';
  if (c === 1 || c === 2) return 'Half bewolkt';
  if (c === 3) return 'Bewolkt';
  if (c === 45 || c === 48) return 'Mist';
  if (c >= 51 && c <= 57) return 'Motregen';
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return 'Regen';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'Sneeuw';
  if (c >= 95) return 'Onweer';
  return null;
}

/**
 * Weer op een datum en uur (Europe/Amsterdam). Ligging afgerond op ca. 1 km: er gaat geen exact adres naar de bron.
 * Recente dagen via de voorspellings-API (met terugblik), oudere via het archief.
 */
export async function weerOp({ lat, lon, datum, tijd }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum || '')) return null;
  const uur = /^(\d{1,2}):\d{2}$/.test(tijd || '') ? Number(tijd.split(':')[0]) : 12;
  const la = Math.round(lat * 100) / 100; const lo = Math.round(lon * 100) / 100;
  const dagen = Math.floor((Date.now() - Date.parse(`${datum}T12:00:00Z`)) / 864e5);
  if (dagen < -15) return null;
  const vars = 'hourly=temperature_2m,relative_humidity_2m,weather_code&timezone=Europe%2FAmsterdam';
  const url = dagen > 60
    ? `https://archive-api.open-meteo.com/v1/archive?latitude=${la}&longitude=${lo}&start_date=${datum}&end_date=${datum}&${vars}`
    : `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&start_date=${datum}&end_date=${datum}&${vars}`;
  const d = await getJson(url);
  const i = (d?.hourly?.time || []).findIndex((t) => t === `${datum}T${String(uur).padStart(2, '0')}:00`);
  if (i < 0) return null;
  const temp = d.hourly.temperature_2m[i]; const vocht = d.hourly.relative_humidity_2m[i]; const code = d.hourly.weather_code[i];
  if (temp == null) return null;
  return { temperatuur: String(Math.round(temp * 10) / 10).replace('.', ','), luchtvochtigheid: vocht == null ? '' : String(Math.round(vocht)), weertype: weertypeVanCode(code), uur };
}
