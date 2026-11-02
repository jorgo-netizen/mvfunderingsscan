# SEO-wijzigingen – 2 november 2026

Er is niets verwijderd. Alle URL's, formulieren, functies, de opmaak en de interne links zijn behouden. Er zijn geen nieuwe pagina's of plaatsnamenpagina's bijgekomen.

## Technisch

| Wijziging | Bestanden | Waarom |
|---|---|---|
| **Wijzigingsdatum per pagina.** `src/content/lastmod.json` bewaart per pagina een vingerafdruk van de inhoud (`<main>`) en de datum van de laatste inhoudelijke wijziging. Die datum komt in `sitemap.xml` (`lastmod`), in `dateModified` en `datePublished` (structured data) en in "Laatst inhoudelijk bijgewerkt". Wijzigingen aan menu, footer of bestandsversies tellen niet mee. De beginstand komt uit de git-geschiedenis. | `scripts/build.mjs`, `src/content/lastmod.json` | Kloppende `lastmod`-datums, zodat Google weet welke pagina's echt veranderd zijn. De sitemap blijft automatisch actueel. |
| **Coördinaten van het kantoor** (`GeoCoordinates`, uit PDOK/BAG: Mr. P.J. Troelstraweg 149, Leeuwarden) in de bedrijfsgegevens. | `src/content/site.json`, `src/lib/layout.mjs` | Beter lokaal te plaatsen (Google Maps / lokaal zoeken). |
| **GA4 klaargezet met toestemming.** Configuratieplaats `analytics.ga4_id` in `site.json`. Is daar een ID ingevuld, dan verschijnt er een cookiemelding en laadt GA4 pas na "Accepteren". Gemeten worden: paginaweergaven, verstuurde aanvragen (`generate_lead`), ingevulde formulieren in de hulpmiddelen, telefoontikken, mailklikken en klikken naar het aanvraagformulier. Geen persoonsgegevens, IP ingekort, Google Signals en advertentiedoeleinden uit. De privacyverklaring krijgt dan automatisch een alinea over GA4. Niet actief op Track & Trace en in het beheerportaal. **Staat uit tot de meet-ID is ingevuld.** | `public/consent.js`, `src/lib/layout.mjs`, `public/script.js`, `scripts/build.mjs`, `public/styles.css`, `src/content/site.json` | Conversies meten binnen de Nederlandse cookieregels. |
| **Script `scripts/seo-rapport.mjs`**, dat `SEO-PAGINAS.md` genereert en waarschuwt bij dubbele hoofdzoekwoorden. | nieuw | Het overzicht blijft herhaalbaar en actueel. |

## Inhoud en metadata

| Pagina | Wijziging |
|---|---|
| `/` | **Title** van 82 naar 64 tekens: "Funderingsonderzoek in Friesland & Groningen \| MV Funderingsscan" (sluit aan op de H1). **Description:** "Onafhankelijk funderingsonderzoek in Friesland, Groningen en Noord-Drenthe. Quick Scan vanaf €350 incl. btw, rapport binnen 2 werkdagen. Vraag een scan aan." **Hoofdzoekwoord:** funderingsonderzoek. |
| `/quickscan-fundering/` | Doel "funderingsquickscan" toegevoegd: introductie "(ook wel funderingsquickscan genoemd)" en een nieuwe description met de prijs inclusief btw. |
| `/funderingsproblemen/` | Title "Funderingsproblemen woning: signalen en oorzaken"; hoofdzoekwoord "funderingsproblemen woning". |
| `/kennisbank/verzakking-woning/` | Hoofdzoekwoord "is mijn huis aan het verzakken" (de gids `/verzakking-woning/` houdt "verzakking woning"). De pagina's linken al naar elkaar. |
| `/kennisbank/fundering-op-staal/` | Hoofdzoekwoord "wat is fundering op staal" (de gids `/fundering-op-staal/` houdt "fundering op staal"). De pagina's linken al naar elkaar. |
| `/funderingsonderzoek-eemsdelta/` | Hoofdzoekwoord "funderingsonderzoek eemsdelta" (de stadspagina `/funderingsonderzoek-appingedam/` houdt Appingedam). De pagina's linken al naar elkaar. |
| `/welke-stap-past-bij-mij/` | Title "Stappenhulp funderingsonderzoek: welke stap past bij jou?"; hoofdzoekwoord "stappenhulp funderingsonderzoek" (het kennisbankartikel houdt "wanneer funderingsonderzoek"). |
| `/kennisbank/wanneer-funderingsonderzoek/` | Link toegevoegd naar de stappenhulp (die link ontbrak nog). |

## Eerder in dezelfde periode (al live)
- **Vercel Web Analytics** (zonder cookies) op de openbare pagina's.
- **Verbeterplan:**
  - homepage met ingang voor de taxatie en doelgroepen;
  - prijzen inclusief btw;
  - dezelfde dag teruggebeld;
  - Noord-Drenthe;
  - een eigen invalshoek voor de pagina's die met elkaar concurreerden;
  - uitleg over het funderingslabel en NHG;
  - de quiz aangevuld.
- **Sitemap:** de dubbele regel is verwijderd.

## Bewust niet gedaan
- **Geen massaal herschreven titels en descriptions.** Ze waren al uniek, hadden de juiste lengte en sloten aan op de zoekintentie (zie `SEO-PAGINAS.md`). Herschrijven zonder gegevens uit Search Console zou risico geven zonder aantoonbare winst.
- **Geen `meta keywords`.**
- **Geen nieuwe plaatsnamenpagina's.**
- **CSS niet verkleind.** De winst is klein (het bestand wordt al gecomprimeerd en gecachet), en een eigen verkleiner kan de opmaak breken.
- **Geen reviews, sterren of certificaten in de structured data**, omdat die nog niet aantoonbaar bestaan.
