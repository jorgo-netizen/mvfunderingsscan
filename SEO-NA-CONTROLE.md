# SEO-nacontrole – 2 november 2026

Uitgevoerd na alle wijzigingen, op de gebouwde site (`npm run build`), met `npm run audit`, `npm run check`, `npm test` en een aanvullende controle per URL uit de sitemap.

## Resultaten

| Controle | Resultaat |
|---|---|
| Build | ✅ 143 pagina's zonder fouten (142 indexeerbaar + 404) |
| Inhoudscontrole (`npm run check`) | ✅ geen fouten |
| Tests (`npm test`) | ✅ 35 van 35 geslaagd |
| SEO-audit (`npm run audit`, 145 pagina's) | ✅ geen problemen: H1, koppen, title en description, canonical, Open Graph en Twitter, alt + breedte + hoogte, interne links en ankers, JSON-LD, FAQ-schema, sitemap en robots |
| Alle sitemap-URL's bestaan | ✅ 142 van 142 |
| Unieke titles | ✅ 142 van 142 |
| Unieke meta descriptions | ✅ 142 van 142 |
| Canonical gelijk aan de eigen URL (absoluut, www, met slash) | ✅ 142 van 142 |
| Open Graph compleet (`og:title`, `description`, `url`, `type`, `image`, `site_name`) | ✅ 142 van 142 |
| Precies één H1 | ✅ 142 van 142 |
| Dubbele hoofdzoekwoorden | ✅ geen (`node scripts/seo-rapport.mjs`) |
| `lastmod` per pagina | ✅ echte datums (2026-10-30 en 2026-11-02) in plaats van één vaste datum |
| robots.txt | ✅ blokkeert alleen `/api/`, `/beheer/` en `/status/`; verwijst naar `sitemap.xml` en `nieuws-sitemap.xml` |
| Structured data | ✅ geldige JSON-LD; `ProfessionalService` met adres, telefoon, e-mail, openingstijden, KvK en nu ook `GeoCoordinates` |
| GA4 | ✅ staat uit zonder ID; met een test-ID: cookiemelding op 142 pagina's, niet op Track & Trace en beheer; "Weigeren" laadt geen GA4 en plaatst geen cookies; de privacyverklaring past zich aan |
| Formulieren en functies | ✅ ongewijzigd; aanvraagformulier, contactformulier en hulpmiddelen werken (getest via `npm test`) |

**Nog te controleren op de live site na de push:**
1. `https://www.mvfunderingsquickscan.nl/sitemap.xml` en `/robots.txt` openen.
2. De homepage controleren met de **Rich Results Test** (search.google.com/test/rich-results).
3. Een meting met **PageSpeed Insights** (pagespeed.web.dev), mobiel. De API had bij het maken van dit rapport zijn daglimiet bereikt. De eigen meting op de live homepage gaf LCP 0,22 s en CLS 0.

## Resterende aandachtspunten (gegevens van jullie nodig)

1. **GA4-meet-ID.**
   - **Wat:** vul hem in bij `src/content/site.json` → `analytics.ga4_id` (begint met `G-`), of geef hem aan mij.
   - **Daarnaast:** sluit in Google Analytics de verwerkersovereenkomst af (Beheer → Accountinstellingen) en zet het bewaren van gegevens op 14 maanden of korter.
2. **Google Search Console.** De TXT-verificatie bij Hostnet en het indienen van beide sitemaps; zie de stappen die we eerder hebben doorgenomen.
3. **Deskundigheid** (telt zwaar voor Google en AI):
   - achtergrond van de adviseurs;
   - certificaten, met de uitgevende organisatie;
   - echte reviews;
   - een voorbeeldrapport;
   - links naar de profielen (Google Bedrijfsprofiel en LinkedIn) voor `sameAs`.
4. **Google Bedrijfsprofiel.** Naam, adres (unit 23), telefoon en website precies zoals op de site, met de categorie en het werkgebied inclusief Noord-Drenthe.
5. **Over 4 tot 6 weken.** Bekijk in Search Console welke zoekvragen vertoningen opleveren, en scherp dan per pagina titels en inhoud aan op echte gegevens.

## Opnieuw controleren
```
npm run audit
node scripts/seo-rapport.mjs
```
