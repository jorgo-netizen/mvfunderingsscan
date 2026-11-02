# SEO-inventaris – mvfunderingsquickscan.nl

*Opgesteld op 2 november 2026 op basis van de lokale projectcode (`C:\Users\Gebruiker\Desktop\mvfunderingsscan\mvfunderingsscan`, branch `main`, laatste commit `b48e18a`) en de lokaal gebouwde uitvoer in `dist/` (build van 2 november 2026, 13:22).*

> **Let op – momentopname van werk in uitvoering.** Tijdens deze analyse werd er tegelijk aan het project gewerkt. Tussen 13:18 en 13:22 zijn `src/lib/layout.mjs`, `src/content/site.json`, `public/script.js` en `public/styles.css` gewijzigd. Daarnaast verscheen het nieuwe bestand `public/consent.js` en is `dist/` opnieuw gebouwd. De werkmap bevat **niet-gecommitte wijzigingen** in `AUDIT.md`, `scripts/build.mjs`, `src/content/pages/kennisbank-g.json`, `src/content/pages/tools-u.json`, `src/content/site.json`, `src/content/urls.json`, `src/lib/layout.mjs`, `public/script.js` en `public/styles.css`, plus de nieuwe bestanden `public/consent.js` en `src/content/lastmod.json`. Dit rapport beschrijft de **lokale stand** inclusief die wijzigingen. De **live site** kan afwijken zolang die wijzigingen niet gecommit en gedeployd zijn. De live site zelf is voor dit rapport **niet** bezocht.
>
> Voor deze inventaris is niets aan de website gewijzigd. Er is ook geen nieuwe build gedraaid; de bestaande `dist/` is alleen gelezen.

## Werkwijze en bronnen

- Broncode gelezen: `scripts/build.mjs`, `src/lib/layout.mjs`, `src/lib/template.mjs`, `src/lib/portal.mjs`, `api/nieuws.js`, `api/_lib/news-render.js`, `api/vertaal.js`, `vercel.json`, `src/content/site.json`, `src/content/urls.json`, `src/content/eeat.json`, `public/consent.js`.
- Alle 145 HTML-bestanden in `dist/` zijn met een script geanalyseerd. Per pagina zijn de `<title>`, meta description, meta robots, canonical, H1, Open Graph, JSON-LD, `<img>`-tags en `<a href>`-links uitgelezen. Daarnaast zijn `dist/sitemap.xml` en `dist/robots.txt` gelezen.
- Gegevens uit de **database (Supabase)** zijn niet beschikbaar. Dat geldt voor nieuwsberichten, medewerkers en het aantal gepubliceerde berichten. Waar die invloed hebben, staat dat er uitdrukkelijk bij.

---

## 1. Framework en projectstructuur

**Framework:** er is geen extern framework. Het is een **eigen statische sitegenerator in Node.js** (ES-modules, Node ≥ 20) zonder npm-dependencies (`package.json` heeft geen `dependencies`). Hosting en serverless functies draaien op **Vercel** (`vercel.json`: `framework: null`, `buildCommand: npm run build`, `outputDirectory: dist`). De database en opslag zijn **Supabase** (`supabase/migrations/`).

| Map / bestand | Functie |
|---|---|
| `scripts/build.mjs` | Bouwt de hele site naar `dist/`: homepage, speciale pagina’s, alle contentpagina’s, 404, portaalpagina’s, `sitemap.xml`, `robots.txt`, `llms.txt`, `site.webmanifest`. |
| `src/lib/layout.mjs` | Gedeelde `<head>` (title, description, robots, canonical, OG, Twitter), header/menu, footer, JSON-LD-bouwstenen (Organisatie, WebSite, Service, Breadcrumb, FAQ). |
| `src/lib/template.mjs` | Template voor alle contentpagina’s (dienst, regio, kennisbank, hulpmiddelen), met o.a. Article-, DefinedTerm- en FAQ-schema. |
| `src/lib/portal.mjs` | Statische schil van `/status/` (Track & Trace) en `/beheer/` (beheerportaal). |
| `src/lib/eeat.mjs`, `forms.mjs`, `widgets.mjs`, `tools.mjs`, `lintvoeg-ext.mjs` | E-E-A-T-blokken (adviseurs, reviews, voorbeeldrapport), formulieren, interactieve widgets en hulpmiddelen. |
| `src/templates/home-main.html` | HTML-sjabloon van de homepage met placeholders. |
| `src/content/pages/*.json` (23 bestanden) | Inhoud van 137 contentpagina’s (title, description, H1, secties, FAQ, links). |
| `src/content/site.json` | Domein, NAP-gegevens, afbeeldingen, menu, diensten, gemeenten, kennisbankgroepen, `analytics.ga4_id`. |
| `src/content/urls.json` | URL-register (142 regels) met groep, zoekwoord, intentie en minimum aantal woorden; bepaalt ook de volgorde in de sitemap. |
| `src/content/home.json`, `eeat.json` | FAQ en kennisbank-highlights op de homepage; E-E-A-T-gegevens (grotendeels nog placeholders, zie §12). |
| `src/content/cases/` | Praktijkvoorbeelden. Er staat alleen `_voorbeeld.json` (wordt genegeerd), dus er worden **geen** praktijkvoorbeeldpagina’s gebouwd. |
| `src/content/lastmod.json` | *(nieuw, niet gecommit)* Vingerafdruk en wijzigingsdatum per pagina, gebruikt voor `<lastmod>` en `dateModified`. |
| `public/` | Statische assets (CSS, JS, afbeeldingen), worden 1-op-1 naar `dist/` gekopieerd. |
| `api/*.js` | Vercel serverless functies (aanvragen, leads, adres, nieuws, beheer, redactie, status, vertaling). |
| `scripts/dev.mjs` | Lokale ontwikkelserver die de rewrites en headers uit `vercel.json` nabootst. |
| `scripts/check-content.mjs`, `scripts/audit.mjs` | Inhouds- en SEO-controles (`npm run check`, `npm run audit`). |
| `vercel.json` | Redirects, rewrites, security- en robots-headers, `cleanUrls: true`, `trailingSlash: true`. |

**Domein (canoniek):** `https://www.mvfunderingsquickscan.nl` (`site.json` → `domain`). Het domein zonder www wordt met een 301 doorgestuurd naar www (`vercel.json`).

---

## 2. Alle bestaande pagina’s en routes

### 2a. Statisch gebouwde pagina’s (145 HTML-bestanden in `dist/`)

- 137 contentpagina’s uit `src/content/pages/*.json`
- 5 met de hand gebouwde pagina’s in `build.mjs`: `/`, `/funderingsscan-aanvragen/`, `/contact/`, `/kennisbank/`, `/kennisbank/begrippenlijst/`
  (`/gratis-funderingscheck/` staat zowel in de handmatige lijst als in de JSON; de sitemap ontdubbelt dat)
- `/404.html`, `/status/`, `/beheer/`

Alle routes gegroepeerd (groep volgens `src/content/urls.json`):

**Home** (1)

- `/`

**Over ons, vertrouwen en juridisch** (7)

- `/contact/`
- `/funderingsscan-aanvragen/`
- `/over-ons/`
- `/bronnen-en-richtlijnen/`
- `/werkwijze/`
- `/privacyverklaring/`
- `/algemene-voorwaarden/`

**Kennisbank** (67)

- `/kennisbank/`
- `/kennisbank/wat-is-een-funderingsscan/`
- `/kennisbank/wat-is-een-quickscan-fundering/`
- `/kennisbank/wat-is-fase-0/`
- `/kennisbank/wat-is-fase-1/`
- `/kennisbank/verschil-fase-0-en-fase-1/`
- `/kennisbank/wat-kost-een-funderingsscan/`
- `/kennisbank/wat-kost-fase-0/`
- `/kennisbank/hoe-lang-duurt-funderingsonderzoek/`
- `/kennisbank/wat-wordt-onderzocht/`
- `/kennisbank/wanneer-funderingsonderzoek/`
- `/kennisbank/heb-ik-een-funderingsscan-nodig/`
- `/kennisbank/funderingsscan-bij-aankoop/`
- `/kennisbank/funderingsscan-bij-verkoop/`
- `/kennisbank/funderingsscan-en-taxatie/`
- `/kennisbank/funderingsscan-en-hypotheek/`
- `/kennisbank/funderingsrapport-lezen/`
- `/kennisbank/wat-na-een-quickscan/`
- `/kennisbank/wanneer-fase-1/`
- `/kennisbank/scheuren-in-woning/`
- `/kennisbank/scheuren-in-gevel/`
- `/kennisbank/scheuren-in-metselwerk/`
- `/kennisbank/verzakking-woning/`
- `/kennisbank/scheefstand/`
- `/kennisbank/klemmende-deuren/`
- `/kennisbank/kruipruimte-inspectie/`
- `/kennisbank/houten-paalfundering/`
- `/kennisbank/fundering-op-staal/`
- `/kennisbank/veenbodem/`
- `/kennisbank/kleibodem/`
- `/kennisbank/bodemdaling/`
- `/kennisbank/grondwater-en-fundering/`
- `/kennisbank/funderingsrisico/`
- `/kennisbank/funderingsherstel/`
- `/kennisbank/kosten-funderingsherstel/`
- `/kennisbank/funderingsproblemen-friesland/`
- `/kennisbank/funderingsproblemen-groningen/`
- `/kennisbank/lintvoegwaterpassing/`
- `/kennisbank/loodmeting/`
- `/kennisbank/vloerveldwaterpassing/`
- `/kennisbank/scheurpatronen/`
- `/kennisbank/scheefstandsmeting/`
- `/kennisbank/hoogtemeting/`
- `/kennisbank/zettingsmeting/`
- `/kennisbank/scheurmeting/`
- `/kennisbank/monitoring-scheuren/`
- `/kennisbank/maaiveldhoogte/`
- `/kennisbank/grondwatermeting/`
- `/kennisbank/wat-is-funderingsonderzoek/`
- `/kennisbank/archiefonderzoek-fundering/`
- `/kennisbank/visuele-funderingsinspectie/`
- `/kennisbank/funderingsrisico-inschatting/`
- `/kennisbank/zetting/`
- `/kennisbank/ongelijke-zetting/`
- `/kennisbank/paalfundering/`
- `/kennisbank/paalrot/`
- `/kennisbank/zandbodem/`
- `/kennisbank/peilverschillen/`
- `/kennisbank/scheuren-boven-kozijnen/`
- `/kennisbank/scheuren-bij-aanbouw/`
- `/kennisbank/klemmende-ramen/`
- `/kennisbank/helling-in-vloer/`
- `/kennisbank/funderingsonderzoek-voor-bod/`
- `/kennisbank/funderingsrisico-bij-aankoop/`
- `/kennisbank/funderingsrapport-voor-verkoper/`
- `/kennisbank/kosten-fase-1/`
- `/kennisbank/begrippenlijst/`

**Diensten** (9)

- `/funderingsscan/`
- `/quickscan-fundering/`
- `/fase-0-funderingsonderzoek/`
- `/fase-1-funderingsonderzoek/`
- `/funderingsinspectie/`
- `/funderingsmetingen/`
- `/funderingsrapport/`
- `/prijzen/`
- `/fase-0-funderingsonderzoek-aankoop/`

**Kopen, verkopen en taxatie** (6)

- `/funderingsonderzoek-woning/`
- `/funderingsonderzoek-bij-aankoop/`
- `/funderingsonderzoek-bij-verkoop/`
- `/funderingsonderzoek-taxatie/`
- `/woningeigenaren/`
- `/makelaars-en-taxateurs/`

**Funderingsproblemen** (9)

- `/funderingsproblemen/`
- `/scheuren-in-gevel/`
- `/verzakking-woning/`
- `/scheefstand-woning/`
- `/klemmende-deuren-en-ramen/`
- `/problemen-met-houten-palen/`
- `/fundering-op-staal/`
- `/funderingsproblemen-veen/`
- `/funderingsproblemen-klei/`

**Werkgebied (provincies, gemeenten, plaatsen)** (33)

- `/werkgebied/`
- `/funderingsonderzoek-friesland/`
- `/funderingsscan-friesland/`
- `/funderingsonderzoek-groningen/`
- `/funderingsscan-groningen/`
- `/funderingsonderzoek-leeuwarden/`
- `/funderingsonderzoek-sneek/`
- `/funderingsonderzoek-harlingen/`
- `/funderingsonderzoek-drachten/`
- `/funderingsonderzoek-heerenveen/`
- `/funderingsonderzoek-groningen-stad/`
- `/funderingsonderzoek-appingedam/`
- `/funderingsonderzoek-delfzijl/`
- `/funderingsonderzoek-franeker/`
- `/funderingsonderzoek-haren/`
- `/funderingsonderzoek-veendam/`
- `/funderingsonderzoek-winschoten/`
- `/funderingsscan-leeuwarden/`
- `/funderingsonderzoek-achtkarspelen/`
- `/funderingsonderzoek-dantumadiel/`
- `/funderingsonderzoek-de-fryske-marren/`
- `/funderingsonderzoek-noardeast-fryslan/`
- `/funderingsonderzoek-ooststellingwerf/`
- `/funderingsonderzoek-opsterland/`
- `/funderingsonderzoek-tytsjerksteradiel/`
- `/funderingsonderzoek-weststellingwerf/`
- `/funderingsonderzoek-eemsdelta/`
- `/funderingsonderzoek-het-hogeland/`
- `/funderingsonderzoek-midden-groningen/`
- `/funderingsonderzoek-pekela/`
- `/funderingsonderzoek-stadskanaal/`
- `/funderingsonderzoek-westerkwartier/`
- `/funderingsonderzoek-westerwolde/`

**Interactieve hulpmiddelen** (10)

- `/hulpmiddelen/`
- `/gratis-funderingscheck/`
- `/vertel-wat-je-ziet/`
- `/welke-stap-past-bij-mij/`
- `/kosten-funderingsonderzoek-berekenen/`
- `/welke-fundering-heeft-mijn-woning/`
- `/funderingsrisicoklasse-uitgelegd/`
- `/huis-kopen-funderingscheck/`
- `/meetwaarden-uitgelegd/`
- `/funderingsquiz/`

**Foutpagina** (1)

- `/404.html`

**Afgeschermde portaalpagina’s** (2)

- `/beheer/`
- `/status/`

### 2b. Dynamische routes (niet als los bestand in `dist/`)

| Route | Bron | Wat het is | SEO-relevantie |
|---|---|---|---|
| `/nieuws/` | rewrite → `api/nieuws.js` | Nieuwsoverzicht, server-side gerenderd uit Supabase (CDN-cache 60 s) | Openbaar en in het hoofdmenu. **Zonder gepubliceerde berichten krijgt de pagina `noindex, follow`.** Hoeveel berichten live staan, is uit de code niet af te leiden. |
| `/nieuws/<slug>/` | rewrite → `api/nieuws.js?slug=` | Nieuwsartikel (alleen status `gepubliceerd`, anders 404 met noindex) | Indexeerbaar, met eigen canonical, `NewsArticle`-schema en `og:type=article`. Het aantal en de inhoud van de artikelen staan in de database en ontbreken in dit rapport. |
| `/nieuws-sitemap.xml` | rewrite → `api/nieuws.js?sitemap=1` | Aparte sitemap met gepubliceerde berichten | Staat in `robots.txt`. Bij nul berichten is dit een lege `<urlset>`. |
| `/api/aanvraag`, `/api/lead`, `/api/adres`, `/api/status`, `/api/beheer`, `/api/redactie`, `/api/vertaal` | `api/*.js` | JSON-endpoints (formulieren, adrescontrole, Track & Trace, beheer, AI-redactie, DeepL-vertaling) | Geen pagina’s. `Disallow: /api/` in robots.txt en `X-Robots-Tag: noindex, nofollow`. |
| `/status/#…` | `public/status.js` | Track & Trace. Het persoonlijke token staat in het #-fragment, dus het is één URL voor de server | noindex, nofollow, niet in de sitemap |
| `/beheer/#/nieuws`, `#/aanvragen`, `#/rapporten`, `#/redactie`, `#/medewerkers` | `public/beheer.js` | Hash-routes binnen het beheerportaal | noindex, nofollow, niet in de sitemap |
| Vertaalknop “EN” | `public/script.js` + `/api/vertaal/` | Vertaalt de pagina in de browser naar het Engels (DeepL). **Er ontstaat geen aparte URL** | Geen Engelse URL’s, geen `hreflang`. Zoekmachines zien alleen Nederlands. |
| `/praktijkvoorbeelden/` en `/praktijkvoorbeelden/<slug>/` | `build.mjs` (alleen als er cases zijn) | Overzicht en detail van praktijkvoorbeelden | **Bestaan op dit moment niet**: er zijn geen echte case-bestanden. |

### 2c. Redirects (301, `vercel.json`)

| Van | Naar |
|---|---|
| `mvfunderingsquickscan.nl/*` (zonder www) | `https://www.mvfunderingsquickscan.nl/*` |
| `/index.html` | `/` |
| `/fase-0/`, `/fase0/` | `/fase-0-funderingsonderzoek/` |
| `/fase-1/`, `/fase1/` | `/fase-1-funderingsonderzoek/` |
| `/quickscan/` | `/quickscan-fundering/` |
| `/aanvragen/` | `/funderingsscan-aanvragen/` |
| `/kennisbank/wat-is-fase-0-funderingsonderzoek/` | `/kennisbank/wat-is-fase-0/` |
| `/kennisbank/wat-is-fase-1-funderingsonderzoek/` | `/kennisbank/wat-is-fase-1/` |
| `/kennisbank/wat-kost-een-funderingsonderzoek/` | `/kennisbank/wat-kost-een-funderingsscan/` |
| `/kennisbank/funderingsonderzoek-bij-aankoop/` | `/kennisbank/funderingsscan-bij-aankoop/` |
| `/kennisbank/scheuren-in-de-gevel-en-fundering/` | `/kennisbank/scheuren-in-gevel/` |
| `/woningkopers/` | `/funderingsonderzoek-bij-aankoop/` |
| `/verkopers/` | `/funderingsonderzoek-bij-verkoop/` |
| `/funderingsscan-check/` | `/gratis-funderingscheck/` |

Alle interne redirect-bestemmingen bestaan als pagina. Daarnaast gelden `cleanUrls: true` (geen `.html` in de URL) en `trailingSlash: true` (URL’s zonder slash worden naar de versie met slash doorgestuurd).

---

## 3. Title-tag, meta description en H1 per pagina

Tekens geteld na het decoderen van HTML-entiteiten. De volgorde volgt `urls.json`, die ook de sitemapvolgorde bepaalt.

| # | URL | Groep | Title-tag | Tekens | Meta description | Tekens | H1 |
|---|---|---|---|---|---|---|---|
| 1 | `/` | home | Funderingsonderzoek in Friesland & Groningen \| MV Funderingsscan | 64 | Onafhankelijk funderingsonderzoek in Friesland, Groningen en Noord-Drenthe. Quick Scan vanaf €350 incl. btw, rapport binnen 2 werkdagen. Vraag een scan aan. | 156 | Funderingsonderzoek in Friesland en Groningen |
| 2 | `/contact/` | over | Contact \| MV Funderingsscan Leeuwarden \| +31 (0) 582037172 | 58 | Neem contact op met MV Funderingsscan in Leeuwarden. Bel +31 (0) 582037172: je spreekt Melvin of Rutger, en via het formulier bellen we dezelfde dag terug. | 155 | Contact met MV Funderingsscan |
| 3 | `/funderingsscan-aanvragen/` | over | Funderingsscan aanvragen \| Prijs vooraf bekend \| MV Funderingsscan | 66 | Vraag online een funderingsscan aan voor je woning in Friesland, Groningen of Noord-Drenthe. We bellen je dezelfde dag terug en noemen vooraf de prijs. | 151 | Funderingsscan aanvragen |
| 4 | `/kennisbank/` | kennisbank | Kennisbank funderingsonderzoek \| Antwoorden \| MV Funderingsscan | 63 | 65 heldere artikelen over funderingsscans, fase 0 en 1, metingen zoals lintvoegwaterpassing, scheuren, zetting, bodem en kosten. | 128 | Kennisbank funderingsonderzoek |
| 5 | `/funderingsscan/` | diensten | Funderingsscan voor je woning \| MV Funderingsscan | 49 | Onafhankelijke funderingsscan voor je woning in Friesland of Groningen: zonder graafwerk, vanaf €350 en het rapport normaal gesproken binnen 2 werkdagen. | 153 | Funderingsscan |
| 6 | `/quickscan-fundering/` | diensten | Quickscan fundering in Friesland en Groningen \| MV Funderingsscan | 65 | Wat is een quickscan fundering (funderingsquickscan)? Lees wat wel en niet wordt onderzocht, wat het oplevert en wat het kost: vanaf €350 incl. btw. | 148 | Quickscan fundering |
| 7 | `/fase-0-funderingsonderzoek/` | diensten | Fase 0 funderingsonderzoek: werkwijze \| MV Funderingsscan | 57 | Wat houdt fase 0 funderingsonderzoek in? Lees hoe archief, bodem en inspectie leiden tot één van vier adviezen. Vanaf €350 in Friesland en Groningen. | 149 | Fase 0 funderingsonderzoek |
| 8 | `/fase-1-funderingsonderzoek/` | diensten | Fase 1 funderingsonderzoek met metingen \| MV Funderingsscan | 59 | Fase 1 funderingsonderzoek: metingen aan lintvoegen, scheefstand en vloeren als fase 0 daar aanleiding voor geeft. Lees wat het oplevert en kost. | 145 | Fase 1 funderingsonderzoek: meten wat je in fase 0 zag |
| 9 | `/funderingsinspectie/` | diensten | Funderingsinspectie ter plaatse \| MV Funderingsscan | 51 | Wat bekijkt de inspecteur bij een funderingsinspectie buiten, binnen en in de kruipruimte? Lees hoe je je voorbereidt en wat wel en niet zichtbaar is. | 150 | Funderingsinspectie: zo verloopt het bezoek aan je woning |
| 10 | `/funderingsmetingen/` | diensten | Funderingsmetingen uitgelegd: zie hoe funderingsonderzoek werkt | 63 | Interactief uitgelegd: lintvoegwaterpassing, loodmeting, scheurpatronen en vloerveldwaterpassing. Zie welke meting past bij jouw woning. | 136 | Funderingsmetingen uitgelegd: zie hoe funderingsonderzoek werkt |
| 11 | `/funderingsrapport/` | diensten | Funderingsrapport: inhoud en uitkomsten \| MV Funderingsscan | 59 | Wat staat er in een funderingsrapport, hoe lees je de conclusie en de vier uitkomsten, en wat doe je ermee bij aankoop, verkoop, taxatie of verbouwing? | 151 | Het funderingsrapport: wat erin staat en wat je ermee doet |
| 12 | `/prijzen/` | diensten | Prijzen funderingsscan fase 0 en 1, incl. btw \| MV Funderingsscan | 65 | Prijzen funderingsscan: fase 0 vanaf €350 en fase 1 vanaf €950, inclusief btw. Lees wat er bij de prijs inbegrepen is en waar de exacte prijs van afhangt. | 154 | Prijzen funderingsscan: fase 0 en fase 1, inclusief btw |
| 13 | `/funderingsonderzoek-woning/` | aankoop | Funderingsonderzoek voor je woning \| MV Funderingsscan | 54 | Funderingsonderzoek voor je woning bij aankoop, verkoop, taxatie of twijfel. Lees welk onderzoek past en wat je als eigenaar zelf al kunt signaleren. | 149 | Funderingsonderzoek woning: welk onderzoek past bij jouw situatie? |
| 14 | `/funderingsonderzoek-bij-aankoop/` | aankoop | Funderingsonderzoek bij aankoop woning \| MV Funderingsscan | 58 | Funderingsonderzoek bij aankoop: waar let je op tijdens de bezichtiging, hoe gebruik je het rapport bij je bod en wanneer plan je het onderzoek in? | 147 | Funderingsonderzoek bij aankoop van een woning |
| 15 | `/funderingsonderzoek-bij-verkoop/` | aankoop | Funderingsonderzoek bij verkoop woning \| MV Funderingsscan | 58 | Funderingsonderzoek bij verkoop van je woning: kopers vooraf duidelijkheid geven, vragen voor zijn en onzekerheid in de onderhandeling verkleinen. | 146 | Funderingsonderzoek bij verkoop van je woning |
| 16 | `/funderingsonderzoek-taxatie/` | aankoop | Funderingsonderzoek bij taxatie: klasse D of E? \| MV Funderingsscan | 67 | Klasse D of E in je taxatierapport? Zo regel je het aanvullende funderingsonderzoek: wat het taxatiemodel vraagt, wat het niet vraagt en hoe MV helpt. | 150 | Funderingsonderzoek voor je taxatie: wat doe je bij klasse D of E? |
| 17 | `/woningeigenaren/` | aankoop | Funderingsonderzoek voor woningeigenaren \| MV Funderingsscan | 60 | Woon je al in je huis en twijfel je over de fundering? Lees welke signalen ertoe doen, wat een Quick Scan onderzoekt en wanneer vervolgonderzoek past. | 150 | Funderingsonderzoek voor woningeigenaren |
| 18 | `/makelaars-en-taxateurs/` | aankoop | Funderingsonderzoek voor makelaars en taxateurs | 47 | Funderingsonderzoek voor makelaars en taxateurs in Friesland en Groningen: wat een Quick Scan oplevert, wat niet en hoe je het voor een klant regelt. | 149 | Funderingsonderzoek voor makelaars en taxateurs |
| 19 | `/over-ons/` | over | Over ons: onafhankelijk funderingsonderzoek \| MV Funderingsscan | 63 | MV Funderingsscan uit Leeuwarden doet uitsluitend funderingsonderzoek voor woningen in Friesland en Groningen, onafhankelijk en zonder eigen herstelwerk. | 153 | Over MV Funderingsscan |
| 20 | `/bronnen-en-richtlijnen/` | over | Bronnen en richtlijnen funderingsonderzoek \| MV Funderingsscan | 62 | Welke officiële bronnen MV Funderingsscan gebruikt (KCAF, NRVT, NHG, RVO) en wat de regels rond funderingsrisico A–E en taxatie in 2026 zijn. | 141 | Bronnen en richtlijnen achter onze informatie |
| 21 | `/werkwijze/` | over | Werkwijze funderingsonderzoek in 7 stappen \| MV Funderingsscan | 62 | Zo verloopt funderingsonderzoek bij MV Funderingsscan: van aanvraag en archiefonderzoek tot inspectie, analyse, rapport en eventueel vervolgonderzoek. | 150 | Werkwijze: zo verloopt funderingsonderzoek bij MV Funderingsscan |
| 22 | `/funderingsproblemen/` | problemen | Funderingsproblemen woning: signalen en oorzaken \| MV Funderingsscan | 68 | Funderingsproblemen in Friesland en Groningen: welke signalen en combinaties aanleiding geven tot onderzoek, mogelijke oorzaken en wat je zelf kunt doen. | 153 | Funderingsproblemen: signalen, oorzaken en wat je kunt doen |
| 23 | `/scheuren-in-gevel/` | problemen | Scheuren in gevel: soorten, oorzaken en advies \| MV Funderingsscan | 66 | Scheuren in je gevel? Uitgebreide gids over verticale, horizontale, diagonale en trapvormige scheuren, mogelijke oorzaken en wanneer inspectie zinvol is. | 153 | Scheuren in de gevel: wat ze kunnen betekenen en wat je doet |
| 24 | `/verzakking-woning/` | problemen | Verzakking woning: signalen en oorzaken \| MV Funderingsscan | 59 | Verzakt je woning? Lees het verschil tussen zetting en verzakking, welke signalen je ziet, mogelijke oorzaken en wat een quickscan je kan vertellen. | 148 | Verzakking van een woning: zetting, signalen en wanneer je laat onderzoeken |
| 25 | `/scheefstand-woning/` | problemen | Scheefstand woning: oorzaken en meting \| MV Funderingsscan | 58 | Staat je woning scheef? Lees waar je scheefstand ziet, welke oorzaken mogelijk zijn, waarom oude gevels soms nooit te lood stonden en hoe je het meet. | 150 | Scheefstand van een woning: wat het is en hoe je het laat beoordelen |
| 26 | `/klemmende-deuren-en-ramen/` | problemen | Klemmende deuren en ramen: fundering of niet? \| MV Funderingsscan | 65 | Klemmen je deuren of ramen? Vaak ligt het aan vocht, scharnieren of houtwerking. Lees welke signalen op vervorming wijzen en doe zelf de check. | 143 | Klemmende deuren en ramen: onschuldig of een signaal van de fundering? |
| 27 | `/problemen-met-houten-palen/` | problemen | Problemen met houten palen onder je woning \| MV Funderingsscan | 62 | Houten paalfundering en problemen: hoe grondwater, droogstand en paalrot samenhangen, wat fase 0 kan zeggen en wanneer een inspectieput nodig is. | 145 | Problemen met een houten paalfundering: oorzaken, risico’s en onderzoek |
| 28 | `/fundering-op-staal/` | problemen | Fundering op staal: werking en risico’s \| MV Funderingsscan | 59 | Wat is een fundering op staal, wanneer werd hij toegepast en hoe spelen bodem, zetting en leeftijd van de woning mee? Uitgebreide gids met advies. | 146 | Fundering op staal: hoe hij werkt en wanneer inspectie verstandig is |
| 29 | `/funderingsproblemen-veen/` | problemen | Funderingsproblemen op veen en bodemdaling \| MV Funderingsscan | 62 | Hoe veen inklinkt, oxideert en de bodem laat dalen, wat dat kan betekenen voor je fundering en waar veengebieden liggen in Friesland en Groningen. | 146 | Funderingsproblemen op veen: hoe de bodem je woning kan beïnvloeden |
| 30 | `/funderingsproblemen-klei/` | problemen | Funderingsproblemen op klei: krimp en zwel \| MV Funderingsscan | 62 | Klei krimpt bij droogte en zwelt bij nat weer. Lees wat dat kan betekenen voor je fundering, hoe ongelijke zetting ontstaat en waar klei voorkomt. | 146 | Funderingsproblemen op klei: krimp, zwel en ongelijke zetting |
| 31 | `/werkgebied/` | regio | Werkgebied: Friesland, Groningen, Noord-Drenthe \| MV Funderingsscan | 67 | Waar voert MV Funderingsscan funderingsonderzoek uit? In heel Friesland, de hele provincie Groningen en Noord-Drenthe, vanuit Leeuwarden. Bekijk de plaatsen. | 157 | Ons werkgebied: Friesland, Groningen en Noord-Drenthe |
| 32 | `/funderingsonderzoek-friesland/` | regio | Funderingsonderzoek in Friesland \| MV Funderingsscan | 52 | Funderingsonderzoek in Friesland: van zeeklei in het noorden tot veen rond Heerenveen en Drachten. Lees wat er per streek speelt en hoe we te werk gaan. | 152 | Funderingsonderzoek in Friesland |
| 33 | `/funderingsscan-friesland/` | regio | Funderingsscan Friesland aanvragen \| MV Funderingsscan | 54 | Funderingsscan in Friesland: Quick Scan vanaf €350, inspectie meestal binnen enkele werkdagen en rapport meestal binnen 2 werkdagen. Zo vraag je hem aan. | 153 | Funderingsscan in Friesland: de Quick Scan voor je woning |
| 34 | `/funderingsonderzoek-groningen/` | regio | Funderingsonderzoek provincie Groningen \| MV Funderingsscan | 59 | Funderingsonderzoek in de provincie Groningen: klei op het Hogeland, veen in de Veenkoloniën, zand op de Hondsrug en gaswinning. Lees hoe we werken. | 148 | Funderingsonderzoek in de provincie Groningen |
| 35 | `/funderingsscan-groningen/` | regio | Funderingsscan Groningen aanvragen \| MV Funderingsscan | 54 | Funderingsscan in Groningen: onafhankelijke Quick Scan vanaf €350, geen schademelding. Rapport meestal binnen 2 werkdagen na inspectie. Zo werkt het. | 149 | Funderingsscan in Groningen aanvragen |
| 36 | `/funderingsonderzoek-leeuwarden/` | regio | Funderingsonderzoek Leeuwarden \| MV Funderingsscan | 50 | Funderingsonderzoek in Leeuwarden, door een onafhankelijk bureau uit de stad. Terpen, zachte ondergrond en vooroorlogse wijken: lees waar we op letten. | 151 | Funderingsonderzoek in Leeuwarden |
| 37 | `/funderingsonderzoek-sneek/` | regio | Funderingsonderzoek in Sneek \| MV Funderingsscan | 48 | Funderingsonderzoek in Sneek: panden langs het water, grachten en een bodem van klei en veen. Lees wat dat betekent en hoe een Quick Scan je verder helpt. | 154 | Funderingsonderzoek in Sneek, de Friese waterstad |
| 38 | `/funderingsonderzoek-harlingen/` | regio | Funderingsonderzoek in Harlingen \| MV Funderingsscan | 52 | Funderingsonderzoek in Harlingen: zeeklei, bodemdaling door zoutwinning en historische grachtenpanden. Ontdek hoe we je woning aan de Waddenzee onderzoeken. | 156 | Funderingsonderzoek in Harlingen |
| 39 | `/funderingsonderzoek-drachten/` | regio | Funderingsonderzoek in Drachten \| MV Funderingsscan | 51 | Funderingsonderzoek in Drachten: veen- en zandgronden, oudere kernen en naoorlogse wijken. Lees wat er bij jouw woning speelt en hoe een Quick Scan werkt. | 154 | Funderingsonderzoek in Drachten |
| 40 | `/funderingsonderzoek-heerenveen/` | regio | Funderingsonderzoek Heerenveen \| MV Funderingsscan | 50 | Funderingsonderzoek in Heerenveen, een voormalige veenkolonie. Lees waarom veen in de ondergrond aandacht vraagt en hoe we je woning onderzoeken. | 145 | Funderingsonderzoek in Heerenveen: wonen op veen |
| 41 | `/funderingsonderzoek-groningen-stad/` | regio | Funderingsonderzoek Groningen stad \| MV Funderingsscan | 54 | Funderingsonderzoek in de stad Groningen en Haren. Zand op de Hondsrug, klei en veen in lagere delen: het risico verschilt per wijk. Lees hoe we onderzoeken. | 157 | Funderingsonderzoek in de stad Groningen |
| 42 | `/funderingsonderzoek-appingedam/` | regio | Funderingsonderzoek in Appingedam \| MV Funderingsscan | 53 | Funderingsonderzoek in Appingedam: historische stad aan het Damsterdiep, kleibodem en gaswinning. Onafhankelijke Quick Scan, los van een schademelding. | 151 | Funderingsonderzoek in Appingedam |
| 43 | `/funderingsonderzoek-delfzijl/` | regio | Funderingsonderzoek in Delfzijl \| MV Funderingsscan | 51 | Funderingsonderzoek in Delfzijl, havenstad aan de Eems op klei in het aardbevingsgebied. Lees wat een Quick Scan je oplevert, ook na versterking. | 145 | Funderingsonderzoek in Delfzijl |
| 44 | `/kennisbank/wat-is-een-funderingsscan/` | kennisbank | Wat is een funderingsscan? Heldere uitleg \| MV Funderingsscan | 61 | Wat is een funderingsscan precies? Lees in gewone taal wat er gebeurt, wat het oplevert en wanneer zo'n eerste onderzoek naar je fundering zinvol is. | 149 | Wat is een funderingsscan? |
| 45 | `/kennisbank/wat-is-een-quickscan-fundering/` | kennisbank | Wat is een quickscan fundering? \| MV Funderingsscan | 51 | Quickscan, funderingscheck of fase 0: wat betekenen deze termen en hoe hangen ze samen? Uitleg over de quickscan fundering en wat je ervan mag verwachten. | 154 | Wat is een quickscan fundering? |
| 46 | `/kennisbank/wat-is-fase-0/` | kennisbank | Wat is fase 0 bij funderingsonderzoek? \| MV Funderingsscan | 58 | Wat is fase 0 bij funderingsonderzoek? Een compacte definitie, de drie onderdelen van het vooronderzoek en wat het je oplevert als huiseigenaar of koper. | 153 | Wat is fase 0 bij funderingsonderzoek? |
| 47 | `/kennisbank/wat-is-fase-1/` | kennisbank | Wat is fase 1 funderingsonderzoek? \| MV Funderingsscan | 54 | Fase 1 is het vervolgonderzoek met metingen na een quickscan. Lees welke metingen erbij horen, wat ze laten zien en wanneer fase 1 wordt geadviseerd. | 149 | Wat is fase 1 bij funderingsonderzoek? |
| 48 | `/kennisbank/verschil-fase-0-en-fase-1/` | kennisbank | Verschil tussen fase 0 en fase 1 \| MV Funderingsscan | 52 | Fase 0 of fase 1: wat is het verschil? Een vergelijkingstabel van beide fasen van funderingsonderzoek plus een eenvoudige beslishulp voor jouw situatie. | 152 | Wat is het verschil tussen fase 0 en fase 1? |
| 49 | `/kennisbank/wat-kost-een-funderingsscan/` | kennisbank | Wat kost een funderingsscan en wat levert het op? | 49 | Wat kost een funderingsscan en wat levert het op? Prijzen inclusief btw voor fase 0 en fase 1, wat de prijs bepaalt en hoe het zich verhoudt tot herstel. | 153 | Wat kost een funderingsscan en wat levert het op? |
| 50 | `/kennisbank/wat-kost-fase-0/` | kennisbank | Wat kost fase 0? Prijs en inhoud van de Quick Scan | 50 | Wat kost fase 0 funderingsonderzoek? Lees wat je krijgt voor de indicatieve prijs vanaf €350 en waarom de prijs per woning kan verschillen. | 139 | Wat kost fase 0 funderingsonderzoek en wat zit erin? |
| 51 | `/kennisbank/hoe-lang-duurt-funderingsonderzoek/` | kennisbank | Hoe lang duurt funderingsonderzoek? \| MV Funderingsscan | 55 | Hoe lang duurt funderingsonderzoek? De doorlooptijd van fase 0 en fase 1 op een rij, en welke factoren de planning van het onderzoek beïnvloeden. | 145 | Hoe lang duurt funderingsonderzoek? |
| 52 | `/kennisbank/wat-wordt-onderzocht/` | kennisbank | Wat wordt onderzocht bij funderingsonderzoek? | 45 | Wat wordt er onderzocht bij funderingsonderzoek? Een volledige lijst van alle onderdelen in fase 0 en fase 1, van archief en bodem tot metingen en scheuren. | 156 | Wat wordt er onderzocht bij funderingsonderzoek? |
| 53 | `/kennisbank/wanneer-funderingsonderzoek/` | kennisbank | Wanneer is funderingsonderzoek nodig? \| MV Funderingsscan | 57 | Wanneer is funderingsonderzoek verstandig? Acht situaties op een rij, van aankoop en verkoop tot scheuren, scheefstand, bodemdaling en taxatie. | 143 | Wanneer is funderingsonderzoek verstandig? |
| 54 | `/kennisbank/heb-ik-een-funderingsscan-nodig/` | kennisbank | Heb ik een funderingsscan nodig? Zelftest \| MV Funderingsscan | 61 | Heb je een funderingsscan nodig? Loop deze vragen langs en vink af wat op jouw woning van toepassing is. Zo zie je snel of onderzoek zinvol kan zijn. | 149 | Heb ik een funderingsscan nodig? |
| 55 | `/kennisbank/funderingsscan-bij-aankoop/` | kennisbank | Funderingsscan bij aankoop: timing en voorbehoud | 48 | Een funderingsscan bij aankoop: wanneer plan je hem, hoe past hij in je termijnen en waarom een voorbehoud voor funderingsonderzoek het overwegen waard is. | 155 | Funderingsscan bij aankoop: wanneer en hoe? |
| 56 | `/kennisbank/funderingsscan-bij-verkoop/` | kennisbank | Funderingsscan bij verkoop: de voordelen \| MV Funderingsscan | 60 | Waarom een funderingsscan bij verkoop zinvol kan zijn: duidelijkheid voor kopers, minder onzekerheid bij de onderhandeling en een goed voorbereide verkoop. | 155 | Funderingsscan bij verkoop: wat heb je eraan? |
| 57 | `/kennisbank/funderingsscan-en-taxatie/` | kennisbank | Funderingsparagraaf taxatierapport uitgelegd \| MV Funderingsscan | 64 | Wat staat er in de funderingsparagraaf van het taxatierapport? Over de KCAF-risicoklasse A tot en met E, het funderingslabel en de rol van een funderingsscan. | 158 | De funderingsparagraaf in het taxatierapport: zo werkt het |
| 58 | `/kennisbank/funderingsscan-en-hypotheek/` | kennisbank | Funderingsscan en hypotheek \| MV Funderingsscan | 47 | Wat heeft een funderingsscan met je hypotheek te maken? Uitleg over de route van taxatie naar financiering en waarom je dit afstemt met je geldverstrekker. | 155 | Funderingsscan en hypotheek: hoe hangt het samen? |
| 59 | `/kennisbank/funderingsrapport-lezen/` | kennisbank | Hoe lees je een funderingsrapport? \| MV Funderingsscan | 54 | Hoe lees je een funderingsrapport? Uitleg over de onderdelen, hoe je de conclusie en het advies interpreteert en welke vragen je daarna kunt stellen. | 149 | Hoe lees je een funderingsrapport? |
| 60 | `/kennisbank/wat-na-een-quickscan/` | kennisbank | Wat na een quickscan fundering? \| MV Funderingsscan | 51 | Je hebt een quickscan laten doen, en nu? Per uitkomst lees je wat je doet: van geen directe aanleiding en monitoren tot aanvullend onderzoek of fase 1. | 151 | Wat doe je na een quickscan fundering? |
| 61 | `/kennisbank/wanneer-fase-1/` | kennisbank | Wanneer is fase 1 funderingsonderzoek nodig? | 44 | Wanneer wordt fase 1 funderingsonderzoek geadviseerd? De signalen en situaties die na een quickscan tot vervolgonderzoek met metingen kunnen leiden. | 148 | Wanneer is fase 1 funderingsonderzoek nodig? |
| 62 | `/kennisbank/scheuren-in-woning/` | kennisbank | Scheuren in je woning: binnenmuren en plafonds \| MV Funderingsscan | 66 | Scheuren in binnenmuren, plafonds of rond deuren? Lees wanneer een scheur in je woning vaak onschuldig is en wanneer het verstandig is om verder te kijken. | 155 | Scheuren in je woning: wanneer zorgwekkend, wanneer onschuldig? |
| 63 | `/kennisbank/scheuren-in-gevel/` | kennisbank | Gevelscheur zelf beoordelen en monitoren \| MV Funderingsscan | 60 | Een scheur in je gevel gezien? Kort antwoord op wat zo'n scheur kan betekenen, plus een eenvoudige methode om de scheur zelf te monitoren. | 138 | Scheur in de gevel: wat betekent het en hoe monitor je hem? |
| 64 | `/kennisbank/scheuren-in-metselwerk/` | kennisbank | Scheuren in metselwerk: voeg, steen en latei \| MV Funderingsscan | 64 | Scheurt de voeg of de steen zelf? Uitleg over scheuren in metselwerk door krimp, uitzetting en roestende lateien, en wanneer de fundering een rol speelt. | 153 | Scheuren in metselwerk: voeg, steen, krimp en lateien |
| 65 | `/kennisbank/verzakking-woning/` | kennisbank | Is mijn huis aan het verzakken? Signalen \| MV Funderingsscan | 60 | Vraag je je af of je huis verzakt? Lees welke signalen kunnen wijzen op verzakking, wat ook andere oorzaken kunnen zijn en wat een verstandige eerste stap is. | 158 | Is mijn huis aan het verzakken? Signalen en een eerste stap |
| 66 | `/kennisbank/scheefstand/` | kennisbank | Scheefstand herkennen: wat kun je zelf zien? \| MV Funderingsscan | 64 | Hoe herken je scheefstand van een woning? Eenvoudige observaties die je zelf kunt doen, wat ze wel en niet zeggen en wanneer een meting zinvol is. | 146 | Scheefstand herkennen: eenvoudige observaties en wanneer meten |
| 67 | `/kennisbank/klemmende-deuren/` | kennisbank | Klemmende deuren en je fundering \| MV Funderingsscan | 52 | Klemt je deur? Vaak is het vocht of een losse scharnier, soms de fundering. Lees hoe je het verschil herkent en wanneer verder kijken zinvol is. | 144 | Klemmende deuren: wanneer zegt het iets over de fundering? |
| 68 | `/kennisbank/kruipruimte-inspectie/` | kennisbank | Kruipruimte-inspectie: wat wordt er bekeken? \| MV Funderingsscan | 64 | Wat wordt er bij een kruipruimte-inspectie bekeken, wat als de kruipruimte niet toegankelijk is en hoe bereid je je voor? Praktische uitleg voor eigenaren. | 155 | Kruipruimte-inspectie: wat wordt er bekeken en hoe bereid je je voor? |
| 69 | `/kennisbank/houten-paalfundering/` | kennisbank | Houten paalfundering: hoe zit die in elkaar? \| MV Funderingsscan | 64 | Wat is een houten paalfundering en hoe is hij opgebouwd? Uitleg over palen, kespen, slieten en waarom het grondwater zo belangrijk is voor de constructie. | 154 | Houten paalfundering: wat het is en hoe het werkt |
| 70 | `/kennisbank/fundering-op-staal/` | kennisbank | Wat is fundering op staal? Uitleg en herkenning \| MV Funderingsscan | 67 | Fundering op staal betekent: zonder palen, direct op de ondergrond. Lees wat dat inhoudt, hoe je het herkent en waarom de bodem eronder zo belangrijk is. | 153 | Wat is fundering op staal? |
| 71 | `/kennisbank/veenbodem/` | kennisbank | Veenbodem: wat is veen en waarom telt het? \| MV Funderingsscan | 62 | Wat is veen, hoe ontstaat het en waarom is een veenbodem belangrijk voor bouwen? Uitleg over inklinking, oxidatie en wat het betekent voor je woning. | 149 | Veenbodem: wat is veen en waarom is het belangrijk voor bouwen? |
| 72 | `/kennisbank/kleibodem/` | kennisbank | Kleibodem: krimp en zwel uitgelegd \| MV Funderingsscan | 54 | Wat is klei en waarom krimpt en zwelt het? Uitleg over een kleibodem, het effect van droogte en nat weer en wat dat betekent voor de fundering van je woning. | 157 | Kleibodem: wat is klei en hoe werken krimp en zwel? |
| 73 | `/kennisbank/bodemdaling/` | kennisbank | Bodemdaling: oorzaken en gevolgen voor je woning \| MV Funderingsscan | 68 | Waardoor daalt de bodem en wat betekent bodemdaling voor je woning? Uitleg over veenoxidatie, inklinking en delfstofwinning, met de gevolgen voor funderingen. | 158 | Bodemdaling: oorzaken en gevolgen voor woningen |
| 74 | `/kennisbank/grondwater-en-fundering/` | kennisbank | Grondwater en fundering: waarom het peil telt \| MV Funderingsscan | 65 | Waarom is grondwater belangrijk voor je fundering? Uitleg over peilbeheer, droogte en houten palen, en wat een dalende grondwaterstand kan betekenen. | 149 | Grondwater en fundering: de rol van peil, droogte en houten palen |
| 75 | `/kennisbank/funderingsrisico/` | kennisbank | Funderingsrisico: wat betekent het precies? \| MV Funderingsscan | 63 | Wat is funderingsrisico en wat is het verschil met funderingsschade? Uitleg over risico-inschatting, de KCAF-risicoklassen A t/m E en wat je ermee doet. | 152 | Funderingsrisico: wat betekent het en wat is het verschil met schade? |
| 76 | `/kennisbank/funderingsherstel/` | kennisbank | Funderingsherstel: wat houdt het globaal in? \| MV Funderingsscan | 64 | Wat is funderingsherstel, welke aanpakken bestaan er globaal en wie voert het uit? Lees waarom onderzoek vooraf de basis is voor een goed herstelplan. | 150 | Funderingsherstel: wat houdt het in en wie doet het? |
| 77 | `/kennisbank/kosten-funderingsherstel/` | kennisbank | Kosten funderingsherstel: wat bepaalt de prijs? \| MV Funderingsscan | 67 | Funderingsherstel kan tienduizenden euro's kosten. Lees wat de kosten bepaalt, waarom eerst onderzoek verstandig is en hoe je tot een goede offerte komt. | 153 | Kosten funderingsherstel: wat bepaalt de prijs? |
| 78 | `/kennisbank/funderingsproblemen-friesland/` | kennisbank | Funderingsproblemen in Friesland: achtergrond \| MV Funderingsscan | 65 | Waarom spelen funderingsproblemen in Friesland? Achtergrond over klei, veen, peilbeheer, bodemdaling en zoutwinning, en wat dat betekent voor je woning. | 152 | Funderingsproblemen in Friesland: de achtergrond |
| 79 | `/kennisbank/funderingsproblemen-groningen/` | kennisbank | Funderingsproblemen in Groningen: achtergrond \| MV Funderingsscan | 65 | Waarom spelen funderingsproblemen in Groningen? Achtergrond over zeeklei, veen, de Hondsrug en gaswinning, en waar je gaswinningsschade meldt (IMG). | 148 | Funderingsproblemen in Groningen: de achtergrond |
| 80 | `/kennisbank/lintvoegwaterpassing/` | kennisbank | Lintvoegwaterpassing: uitleg en demo \| MV Funderingsscan | 56 | Wat is lintvoegwaterpassing? Uitleg in vier stappen, een interactieve gevel met voorbeeldwaarden en wat de meting wel en niet zegt, ook in Friesland. | 149 | Wat is een lintvoegwaterpassing? |
| 81 | `/kennisbank/loodmeting/` | kennisbank | Wat is een loodmeting? Scheefstand gevel meten \| MV Funderingsscan | 66 | Een loodmeting laat zien of een gevel of wand afwijkt van de verticaal. Lees hoe scheefstand wordt gemeten, vastgelegd en wat het zegt over de fundering. | 153 | Wat is een loodmeting? |
| 82 | `/kennisbank/vloerveldwaterpassing/` | kennisbank | Vloerveldwaterpassing: wat is het? \| MV Funderingsscan | 54 | Wat is een vloerveldwaterpassing en wat zeggen hoogteverschillen in je vloer over zakking van de woning? Uitleg over meetraster, hoogtekaart en beperkingen. | 156 | Wat is een vloerveldwaterpassing? |
| 83 | `/kennisbank/scheurpatronen/` | kennisbank | Scheurpatronen: wat zeggen scheuren? \| MV Funderingsscan | 56 | Horizontale, verticale, diagonale of trapsgewijze scheuren: lees wat scheurpatronen kunnen zeggen, welke oorzaken mogelijk zijn en hoe ze worden onderzocht. | 156 | Scheurpatronen in woningen: wat vertellen scheuren over de fundering? |
| 84 | `/kennisbank/scheefstandsmeting/` | kennisbank | Scheefstand van een gevel meten: zo werkt het \| MV Funderingsscan | 65 | Hoe meet je scheefstand van een gevel? Overzicht van observatie, loodmeting en afleiden uit hoogteverschillen, en wanneer welke methode zinvol is. | 146 | Hoe meet je scheefstand van een gevel? |
| 85 | `/kennisbank/hoogtemeting/` | kennisbank | Hoogtemeting bij een woning: waterpassen \| MV Funderingsscan | 60 | Hoogtemeting bij een woning: wat waterpassen is, het verschil tussen relatief en NAP, het referentiepunt en de toepassing op lintvoeg, vloer en maaiveld. | 153 | Hoogtemeting bij een woning: het principe achter waterpassen |
| 86 | `/kennisbank/zettingsmeting/` | kennisbank | Zettingsmeting: zakking van je woning volgen \| MV Funderingsscan | 64 | Wat is een zettingsmeting? Waarom één meting een momentopname is en je pas met herhaalmetingen ziet of een woning nog zakt. Uitleg, aanpak en beperkingen. | 154 | Zettingsmeting: zien of een woning nog beweegt |
| 87 | `/kennisbank/scheurmeting/` | kennisbank | Scheurmeting: een scheur goed vastleggen \| MV Funderingsscan | 60 | Wat is een scheurmeting? Zo leg je locatie, richting, lengte, breedte en verloop van een scheur vast, met welke hulpmiddelen, en wat dat wel en niet zegt. | 154 | Scheurmeting: een scheur op één moment nauwkeurig vastleggen |
| 88 | `/kennisbank/monitoring-scheuren/` | kennisbank | Scheuren monitoren: zo volg je een scheur \| MV Funderingsscan | 61 | Scheuren monitoren? Met een stappenlijst, foto-logboek en meetmerkjes volg je zelf of een scheur groeit. Plus: wanneer je een specialist inschakelt. | 148 | Scheuren monitoren: een scheur in de tijd volgen |
| 89 | `/kennisbank/maaiveldhoogte/` | kennisbank | Maaiveldhoogte rond je woning: wat zegt het? \| MV Funderingsscan | 64 | Wat is maaiveldhoogte en wat betekent een verzakt maaiveld rond je woning? Over bodemdaling, inklinking en wat het wel en niet zegt over je fundering. | 150 | Maaiveldhoogte: wat een verzakt terrein rond je woning wel en niet zegt |
| 90 | `/kennisbank/grondwatermeting/` | kennisbank | Grondwatermeting en je fundering: peilbuizen \| MV Funderingsscan | 64 | Hoe wordt de grondwaterstand gemeten? Over peilbuizen, meetnetten van overheden en waterschap, en waarom grondwater ertoe doet voor houten palen en zetting. | 156 | Grondwatermeting: hoe de grondwaterstand wordt gemeten en waarom dat telt |
| 91 | `/kennisbank/wat-is-funderingsonderzoek/` | kennisbank | Wat is funderingsonderzoek? Fasen en keuzes \| MV Funderingsscan | 63 | Wat is funderingsonderzoek en welke stap past bij jouw woning? Uitleg over fase 0, fase 1, nader onderzoek en herstelplan, plus wie wat doet en wanneer. | 152 | Wat is funderingsonderzoek? Alle stappen op een rij |
| 92 | `/kennisbank/archiefonderzoek-fundering/` | kennisbank | Archiefonderzoek fundering: wat zoeken we uit? \| MV Funderingsscan | 66 | Wat levert archiefonderzoek op bij funderingsonderzoek? Lees welke gegevens over bouwjaar, funderingstype, bodem en grondwater worden gezocht, en waarom. | 153 | Archiefonderzoek bij funderingsonderzoek: wat zoeken we uit? |
| 93 | `/kennisbank/visuele-funderingsinspectie/` | kennisbank | Visuele funderingsinspectie: waar let je op? \| MV Funderingsscan | 64 | Wat wordt er bekeken bij een visuele funderingsinspectie? Van gevels en scheuren tot vloeren, kozijnen en kruipruimte, plus de grenzen van wat je ziet. | 151 | Visuele funderingsinspectie: wat wordt er buiten en binnen bekeken? |
| 94 | `/kennisbank/funderingsrisico-inschatting/` | kennisbank | Funderingsrisico-inschatting: zo werkt het \| MV Funderingsscan | 62 | Hoe komt een funderingsrisico-inschatting tot stand? Lees hoe bodem, bouwjaar, funderingstype en zichtbare signalen samen worden gewogen tot een advies. | 152 | Funderingsrisico-inschatting: hoe komen we tot een oordeel? |
| 95 | `/kennisbank/zetting/` | kennisbank | Zetting van een woning: wat is het? \| MV Funderingsscan | 55 | Wat is zetting, waarom zakt elke woning een beetje en wanneer wordt het een probleem? Heldere uitleg over gelijkmatige en ongelijke zetting van woningen. | 153 | Zetting van een woning: waarom elk huis een beetje zakt |
| 96 | `/kennisbank/ongelijke-zetting/` | kennisbank | Ongelijke zetting: oorzaken en gevolgen \| MV Funderingsscan | 59 | Ongelijke zetting ontstaat als delen van een woning verschillend zakken. Lees welke oorzaken er zijn, welke schade het geeft en hoe je het laat vaststellen. | 156 | Ongelijke zetting: als delen van je woning verschillend zakken |
| 97 | `/kennisbank/paalfundering/` | kennisbank | Paalfundering: wat is het en welke soorten? \| MV Funderingsscan | 63 | Wat is een paalfundering, welke soorten palen zijn er en waarom wordt op palen gebouwd? Plus: zo achterhaal je welke fundering jouw woning heeft. | 145 | Paalfundering: hoe een woning op palen rust |
| 98 | `/kennisbank/paalrot/` | kennisbank | Paalrot: oorzaken, signalen en onderzoek \| MV Funderingsscan | 60 | Wat is paalrot, hoe ontstaat het en hoe wordt het onderzocht? Lees waarom houten palen niet automatisch problemen geven en wat een quickscan wel en niet zegt. | 158 | Paalrot: aantasting van houten funderingspalen |
| 99 | `/kennisbank/zandbodem/` | kennisbank | Zandbodem en fundering: wat moet je weten? \| MV Funderingsscan | 62 | Is een zandbodem stabiel voor je woning? Lees hoe zand verschilt van veen en klei, waarom ook op zand zakking mogelijk is en wat de Hondsrug betekent. | 150 | Zandbodem en fundering: stabiel, maar niet zonder aandachtspunten |
| 100 | `/kennisbank/peilverschillen/` | kennisbank | Peilverschillen en grondwaterpeil \| MV Funderingsscan | 53 | Hoe grondwaterpeil, polderpeil en peilbeheer door het waterschap je fundering kunnen raken, wat dalende peilen doen en wat je als eigenaar zelf kunt doen. | 154 | Peilverschillen: wat het grondwaterpeil met je fundering doet |
| 101 | `/kennisbank/scheuren-boven-kozijnen/` | kennisbank | Scheuren boven kozijnen: oorzaken \| MV Funderingsscan | 53 | Een scheur boven een raam of deur? Lees waarom kozijnen een zwakke plek zijn, hoe een roestende latei verschilt van zetting en wanneer onderzoek zinvol is. | 155 | Scheuren boven kozijnen: waarom juist daar, en wat zegt het? |
| 102 | `/kennisbank/scheuren-bij-aanbouw/` | kennisbank | Scheur bij aanbouw of uitbouw \| MV Funderingsscan | 49 | Scheur tussen huis en aanbouw? Vaak komt dat door een eigen, ondiepere fundering. Lees wanneer het normaal is en wanneer onderzoek verstandig is. | 145 | Scheur bij een aanbouw: normaal of reden tot zorg? |
| 103 | `/kennisbank/klemmende-ramen/` | kennisbank | Klemmende ramen: oorzaken en signalen \| MV Funderingsscan | 57 | Klemt je raam? Meestal komt het door vocht, verf of hang- en sluitwerk. Lees wanneer klemmende ramen een signaal van vervorming zijn en wat je dan doet. | 152 | Klemmende ramen: houtwerking, hang- en sluitwerk of vervorming? |
| 104 | `/kennisbank/helling-in-vloer/` | kennisbank | Scheve of hellende vloer: oorzaken \| MV Funderingsscan | 54 | Loopt je vloer af? Lees welke oorzaken een scheve vloer kan hebben, van balklaag tot fundering, hoe je het zelf bekijkt en hoe het wordt gemeten. | 145 | Scheve vloer: waar komt een helling in de vloer vandaan? |
| 105 | `/kennisbank/funderingsonderzoek-voor-bod/` | kennisbank | Funderingsonderzoek vóór je bod: wat kan al? \| MV Funderingsscan | 64 | Wat kun je vóór je bod al uitzoeken over de fundering, en wat regel je pas na het bod met een voorbehoud? Met tijdlijn, vragen en praktische tips. | 146 | Funderingsonderzoek vóór je bod: wat kun je al doen? |
| 106 | `/kennisbank/funderingsrisico-bij-aankoop/` | kennisbank | Funderingsrisico bij aankoop beoordelen \| MV Funderingsscan | 59 | Hoe beoordeel je als koper het funderingsrisico van een woning? Over signalen, bouwjaar, bodem, de KCAF-klasse in de taxatie en wat een rapport toevoegt. | 153 | Funderingsrisico bij aankoop: hoe beoordeel je het als koper? |
| 107 | `/kennisbank/funderingsrapport-voor-verkoper/` | kennisbank | Funderingsrapport als verkoper: wat doe je ermee? | 49 | Wat doe je als verkoper met een funderingsrapport? Wanneer je het laat maken, hoe je het deelt met makelaar en kopers, en wat te doen als er iets in staat. | 155 | Funderingsrapport voor de verkoper: laten maken, delen en gebruiken |
| 108 | `/kennisbank/kosten-fase-1/` | kennisbank | Kosten fase 1 funderingsonderzoek \| MV Funderingsscan | 53 | Wat kost fase 1 funderingsonderzoek? Vanaf €950. Lees wat de prijs bepaalt, wat erin zit en waarom fase 0 er in de regel aan voorafgaat. | 136 | Kosten fase 1 funderingsonderzoek: wat betaal je en waarvoor? |
| 109 | `/fase-0-funderingsonderzoek-aankoop/` | diensten | Fase 0 funderingsonderzoek bij aankoop \| MV Funderingsscan | 58 | Fase 0 Quick Scan voor kopers in Friesland en Groningen: vanaf €350, gepland rond je voorbehoud, rapport meestal binnen 2 werkdagen na de inspectie. | 148 | Fase 0 funderingsonderzoek bij aankoop van een woning |
| 110 | `/funderingsonderzoek-franeker/` | regio | Funderingsonderzoek in Franeker \| MV Funderingsscan | 51 | Funderingsonderzoek in Franeker: wat de zeeklei en oude panden in de binnenstad voor je fundering betekenen, en hoe een Quick Scan meer duidelijkheid geeft. | 156 | Funderingsonderzoek in Franeker |
| 111 | `/funderingsonderzoek-haren/` | regio | Funderingsonderzoek in Haren \| MV Funderingsscan | 48 | Funderingsonderzoek in Haren: wonen op de Hondsrug of in een lager deel, vrijstaande en oudere woningen. Zo brengt een Quick Scan je fundering in beeld. | 152 | Funderingsonderzoek in Haren |
| 112 | `/funderingsonderzoek-veendam/` | regio | Funderingsonderzoek in Veendam \| MV Funderingsscan | 50 | Funderingsonderzoek in Veendam: wonen in de Veenkoloniën, op veen boven zand. Ontdek wat vervening voor je fundering betekent en hoe een Quick Scan helpt. | 154 | Funderingsonderzoek in Veendam en de Veenkoloniën |
| 113 | `/funderingsonderzoek-winschoten/` | regio | Funderingsonderzoek in Winschoten \| MV Funderingsscan | 53 | Funderingsonderzoek in Winschoten: wat de zware klei van het Oldambt met je fundering doet en hoe een onafhankelijke Quick Scan je woning in beeld brengt. | 154 | Funderingsonderzoek in Winschoten |
| 114 | `/funderingsscan-leeuwarden/` | regio | Funderingsscan Leeuwarden aanvragen \| MV Funderingsscan | 55 | Funderingsscan in Leeuwarden: de Quick Scan vanuit ons kantoor in de stad. Wat je krijgt, wat het kost, hoe je je voorbereidt en hoe snel je terechtkunt. | 153 | Funderingsscan in Leeuwarden: de Quick Scan vanuit de stad |
| 115 | `/kennisbank/begrippenlijst/` | kennisbank | Begrippenlijst funderingsonderzoek \| MV Funderingsscan | 54 | Alle vaktermen rond funderingsonderzoek helder uitgelegd: van lintvoegwaterpassing en loodmeting tot zetting, paalrot en fase 0. 33 begrippen met definitie. | 156 | Begrippenlijst funderingsonderzoek |
| 116 | `/funderingsonderzoek-achtkarspelen/` | regio | Funderingsonderzoek Buitenpost en Surhuisterveen \| MV Funderingsscan | 68 | Funderingsonderzoek in de gemeente Achtkarspelen: Buitenpost, Surhuisterveen, Harkema en Twijzel. Onafhankelijke Quick Scan met rapport en helder advies. | 153 | Funderingsonderzoek in Achtkarspelen |
| 117 | `/funderingsonderzoek-dantumadiel/` | regio | Funderingsonderzoek Damwâld en Feanwâlden \| MV Funderingsscan | 61 | Funderingsonderzoek in Dantumadiel, van Damwâld en Feanwâlden tot Rinsumageast en Driezum. Start met een Quick Scan vanaf €350, rapport in 2 werkdagen. | 151 | Funderingsonderzoek in Dantumadiel |
| 118 | `/funderingsonderzoek-de-fryske-marren/` | regio | Funderingsonderzoek Joure, Lemmer en Balk \| MV Funderingsscan | 61 | Funderingsonderzoek in De Fryske Marren: Joure, Lemmer, Balk, Sloten en Woudsend. Onafhankelijke Quick Scan voor woningen op veen en klei in het merengebied. | 157 | Funderingsonderzoek in De Fryske Marren |
| 119 | `/funderingsonderzoek-noardeast-fryslan/` | regio | Funderingsonderzoek Dokkum, Kollum en Holwerd \| MV Funderingsscan | 65 | Funderingsonderzoek in Noardeast-Fryslân: Dokkum, Kollum, Holwerd, Ternaard en Anjum. Quick Scan voor woningen in het kleigebied langs de Waddenkust. | 149 | Funderingsonderzoek in Dokkum en Noardeast-Fryslân |
| 120 | `/funderingsonderzoek-ooststellingwerf/` | regio | Funderingsonderzoek Oosterwolde en Appelscha \| MV Funderingsscan | 64 | Funderingsonderzoek in Ooststellingwerf: Oosterwolde, Appelscha, Haulerwijk, Makkinga en Donkerbroek. Quick Scan vanaf €350 met rapport en advies. | 146 | Funderingsonderzoek in Oosterwolde en Ooststellingwerf |
| 121 | `/funderingsonderzoek-opsterland/` | regio | Funderingsonderzoek Gorredijk en Beetsterzwaag \| MV Funderingsscan | 66 | Funderingsonderzoek in Opsterland: Gorredijk, Beetsterzwaag, Ureterp, Bakkeveen en Lippenhuizen. Onafhankelijke Quick Scan op zand- en veengrond. | 145 | Funderingsonderzoek in Opsterland |
| 122 | `/funderingsonderzoek-tytsjerksteradiel/` | regio | Funderingsonderzoek Burgum en Hurdegaryp \| MV Funderingsscan | 60 | Funderingsscan in Tytsjerksteradiel: Burgum, Hurdegaryp, Suameer, Garyp en meer. Onafhankelijk vooronderzoek op zand, veen en klei, met rapport en advies. | 154 | Funderingsonderzoek in Tytsjerksteradiel |
| 123 | `/funderingsonderzoek-weststellingwerf/` | regio | Funderingsonderzoek Wolvega en Noordwolde \| MV Funderingsscan | 61 | Funderingsonderzoek in Weststellingwerf, zoals Wolvega, Noordwolde, Oldeberkoop en De Blesse. Quick Scan op zandgrond en in beekdalen, rapport in 2 werkdagen. | 158 | Funderingsonderzoek in Weststellingwerf |
| 124 | `/funderingsonderzoek-eemsdelta/` | regio | Funderingsonderzoek Eemsdelta: Delfzijl, Appingedam, Loppersum | 62 | Funderingsonderzoek in Eemsdelta: Loppersum, Farmsum, Termunten, 't Zandt, Wirdum, Appingedam en Delfzijl. Onafhankelijke scan op klei, los van IMG. | 148 | Funderingsonderzoek in Eemsdelta |
| 125 | `/funderingsonderzoek-het-hogeland/` | regio | Funderingsonderzoek Winsum, Uithuizen en Bedum \| MV Funderingsscan | 66 | Funderingsonderzoek in Het Hogeland: Winsum, Uithuizen, Bedum, Warffum, Leens en meer. Onafhankelijke Quick Scan voor woningen op zware zeeklei. | 144 | Funderingsonderzoek in Het Hogeland |
| 126 | `/funderingsonderzoek-midden-groningen/` | regio | Funderingsonderzoek Hoogezand en Slochteren \| MV Funderingsscan | 63 | Funderingsonderzoek in Midden-Groningen: Hoogezand, Sappemeer, Slochteren en dorpen. Onafhankelijke Quick Scan op veen en klei, los van een IMG-melding. | 152 | Funderingsonderzoek in Midden-Groningen |
| 127 | `/funderingsonderzoek-pekela/` | regio | Funderingsonderzoek Oude en Nieuwe Pekela \| MV Funderingsscan | 61 | Funderingsonderzoek in de gemeente Pekela, in Oude Pekela en Nieuwe Pekela. Lees hoe je scheuren in een lintwoning duidt en wanneer een Quick Scan helpt. | 153 | Funderingsonderzoek in Pekela |
| 128 | `/funderingsonderzoek-stadskanaal/` | regio | Funderingsonderzoek Stadskanaal, Musselkanaal \| MV Funderingsscan | 65 | Funderingsonderzoek in de gemeente Stadskanaal: Stadskanaal, Musselkanaal, Onstwedde en meer. Handig bij aankoop, taxatie of twijfel over je woning. | 148 | Funderingsonderzoek in Stadskanaal |
| 129 | `/funderingsonderzoek-westerkwartier/` | regio | Funderingsonderzoek Zuidhorn, Leek en Grootegast \| MV Funderingsscan | 68 | Funderingsonderzoek in Westerkwartier: Zuidhorn, Leek, Grootegast, Marum en dorpen. Klei in het noorden, zand en veen in het zuiden. Start met een Quick Scan. | 158 | Funderingsonderzoek in Westerkwartier |
| 130 | `/funderingsonderzoek-westerwolde/` | regio | Funderingsonderzoek Ter Apel en Vlagtwedde \| MV Funderingsscan | 62 | Funderingsonderzoek in Westerwolde: Ter Apel, Vlagtwedde, Bellingwolde, Sellingen en Bourtange. Ook op zandgrond geeft een Quick Scan meer duidelijkheid. | 153 | Funderingsonderzoek in Westerwolde |
| 131 | `/hulpmiddelen/` | hulpmiddelen | Hulpmiddelen fundering: checks, keuzehulpen en uitleg | 53 | Interactieve hulpmiddelen over funderingen: gratis Funderingscheck, signalen-checklist, kostenwijzer, risicoklassen A–E en meer. Indicatief, geen diagnose. | 155 | Hulpmiddelen: begrijp eerst wat er speelt |
| 132 | `/gratis-funderingscheck/` | hulpmiddelen | Gratis Funderingscheck: indicatie in 11 vragen | 46 | Doe de gratis Funderingscheck: beantwoord 11 vragen over je woning en krijg een voorzichtige indicatie met uitleg wat die wel en niet betekent. Geen diagnose. | 158 | Gratis Funderingscheck: zijn er signalen om verder te kijken? |
| 133 | `/vertel-wat-je-ziet/` | hulpmiddelen | Scheur of signaal? Vertel ons wat je ziet, met foto | 51 | Vink aan welke signalen je herkent, zoals scheuren of klemmende deuren, en stuur je vraag met foto's. We laten weten welke vervolgstap zinvol kan zijn. | 151 | Heb je een scheur of ander signaal? Vertel ons wat je ziet |
| 134 | `/welke-stap-past-bij-mij/` | hulpmiddelen | Stappenhulp funderingsonderzoek: welke stap past bij jou? | 57 | Wanneer is funderingsonderzoek zinvol? Doorloop de stappenhulp voor kopen, verkopen, taxatie of signalen in je woning, en bekijk drie voorbeeldscenario's. | 154 | Welke stap past bij jouw situatie? |
| 135 | `/kosten-funderingsonderzoek-berekenen/` | hulpmiddelen | Kostenwijzer funderingsonderzoek: welke dienst past? | 52 | Kostenwijzer: kies wat je wilt laten onderzoeken en zie welke dienst past, met de indicatieve prijs. Plus een vergelijking van check, Quick Scan en fase 1. | 155 | Kostenwijzer: welk onderzoek past en wat kost het? |
| 136 | `/welke-fundering-heeft-mijn-woning/` | hulpmiddelen | Welke fundering heeft mijn woning? Bouwjaar-tijdlijn | 52 | Welke funderingswijzen kunnen bij jouw bouwjaar voorkomen? Vul het bouwjaar in en lees waarom het bouwjaar alleen het funderingstype niet vaststelt. | 148 | Welke fundering heeft mijn woning? |
| 137 | `/funderingsrisicoklasse-uitgelegd/` | hulpmiddelen | Funderingsrisicoklasse (funderingslabel) A tot en met E uitgelegd | 65 | Wat betekent funderingsrisicoklasse (funderingslabel) A, B, C, D of E? Klik op een klasse voor de KCAF-omschrijving, wat het betekent en de vervolgstap. | 152 | Funderingsrisicoklasse A tot en met E: wat betekent jouw funderingslabel? |
| 138 | `/huis-kopen-funderingscheck/` | hulpmiddelen | Huis kopen? Doe eerst de funderingscheck voor kopers | 52 | Een huis kopen? Beantwoord zes vragen over bouwjaar, risicoklasse, signalen en je voorbehoud, en zie welke funderingsonderwerpen voor jou relevant zijn. | 152 | Een huis kopen? Doe eerst deze funderingscheck |
| 139 | `/meetwaarden-uitgelegd/` | hulpmiddelen | Meetwaarden fundering uitgelegd: wat betekent 12 mm/m? | 54 | Wat betekent een scheefstand van 12 mm/m? Reken meetwaarden om naar verhouding, procent en graden, en lees waarom context belangrijker is dan één getal. | 152 | Wat betekent mijn meetgegeven? |
| 140 | `/funderingsquiz/` | hulpmiddelen | Funderingsquiz: hoeveel weet jij over funderingen? | 50 | Test je kennis in tien vragen over droogstand, zetting, negatieve kleef, risicoklassen en meer. Bij elk antwoord krijg je direct een korte uitleg met bron. | 155 | Hoeveel weet jij over funderingen? |
| 141 | `/privacyverklaring/` | over | Privacyverklaring \| MV Funderingsscan B.V. | 42 | Hoe MV Funderingsscan B.V. omgaat met je persoonsgegevens: welke gegevens, waarvoor, hoe lang, met wie en welke rechten je hebt. | 128 | Privacyverklaring |
| 142 | `/algemene-voorwaarden/` | over | Algemene voorwaarden \| MV Funderingsscan B.V. | 45 | De algemene voorwaarden van MV Funderingsscan B.V. voor offertes, Fase 0 QuickScan, Fase 1 funderingsonderzoek en rapporten. | 124 | Algemene voorwaarden |
| – | `/404.html` | foutpagina | Pagina niet gevonden \| MV Funderingsscan | 40 | Deze pagina bestaat niet (meer). Ga naar de homepage of bekijk onze funderingsscan. | 83 | Deze pagina bestaat niet |
| – | `/beheer/` | portaal | Beheer \| MV Funderingsscan | 26 | Beheerportaal voor medewerkers van MV Funderingsscan. | 53 | **ontbreekt** |
| – | `/status/` | portaal | Voortgang van je QuickScan \| MV Funderingsscan | 46 | Bekijk met je persoonlijke link de voortgang van je QuickScan-aanvraag bij MV Funderingsscan. | 93 | Voortgang van je QuickScan |

**Opvallend:**
- Geen dubbele titles, geen dubbele meta descriptions en geen dubbele H1’s tussen pagina’s.
- Elke pagina heeft precies één H1, behalve `/beheer/` (0 H1, noindex).
- Alle meta descriptions zijn maximaal 160 tekens. Alleen de drie noindex-pagina’s zitten onder de 110.
- **62 titles zijn langer dan 60 tekens** en worden in Google mogelijk afgekapt (zie §12).

---

## 4. Canonical URL’s en 5. indexeerbaarheid

**Hoe het werkt:** `head()` in `src/lib/layout.mjs` zet standaard een zelf-refererende canonical (`DOMAIN + path`) en `index, follow, max-image-preview:large, max-snippet:-1`. Pagina’s kunnen dat met `canonical: false` en een eigen `robots` overschrijven.

Aanvullende signalen buiten de HTML:
- `robots.txt`: `Disallow: /api/`, `/beheer/`, `/status/`.
- `X-Robots-Tag: noindex, nofollow` op `/beheer/*`, `/status/*` en `/api/*` (`vercel.json`).
- `X-Robots-Tag: noindex` op **alle** URL’s van host `mvfunderingsscan.vercel.app`, zodat het Vercel-standaarddomein niet wordt geïndexeerd.

| URL | Canonical | Meta robots | Indexeerbaar | In sitemap.xml |
|---|---|---|---|---|
| `/` | https://www.mvfunderingsquickscan.nl/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/contact/` | https://www.mvfunderingsquickscan.nl/contact/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsscan-aanvragen/` | https://www.mvfunderingsquickscan.nl/funderingsscan-aanvragen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/` | https://www.mvfunderingsquickscan.nl/kennisbank/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsscan/` | https://www.mvfunderingsquickscan.nl/funderingsscan/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/quickscan-fundering/` | https://www.mvfunderingsquickscan.nl/quickscan-fundering/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/fase-0-funderingsonderzoek/` | https://www.mvfunderingsquickscan.nl/fase-0-funderingsonderzoek/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/fase-1-funderingsonderzoek/` | https://www.mvfunderingsquickscan.nl/fase-1-funderingsonderzoek/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsinspectie/` | https://www.mvfunderingsquickscan.nl/funderingsinspectie/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsmetingen/` | https://www.mvfunderingsquickscan.nl/funderingsmetingen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsrapport/` | https://www.mvfunderingsquickscan.nl/funderingsrapport/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/prijzen/` | https://www.mvfunderingsquickscan.nl/prijzen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-woning/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-woning/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-bij-aankoop/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-bij-aankoop/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-bij-verkoop/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-bij-verkoop/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-taxatie/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-taxatie/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/woningeigenaren/` | https://www.mvfunderingsquickscan.nl/woningeigenaren/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/makelaars-en-taxateurs/` | https://www.mvfunderingsquickscan.nl/makelaars-en-taxateurs/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/over-ons/` | https://www.mvfunderingsquickscan.nl/over-ons/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/bronnen-en-richtlijnen/` | https://www.mvfunderingsquickscan.nl/bronnen-en-richtlijnen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/werkwijze/` | https://www.mvfunderingsquickscan.nl/werkwijze/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsproblemen/` | https://www.mvfunderingsquickscan.nl/funderingsproblemen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/scheuren-in-gevel/` | https://www.mvfunderingsquickscan.nl/scheuren-in-gevel/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/verzakking-woning/` | https://www.mvfunderingsquickscan.nl/verzakking-woning/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/scheefstand-woning/` | https://www.mvfunderingsquickscan.nl/scheefstand-woning/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/klemmende-deuren-en-ramen/` | https://www.mvfunderingsquickscan.nl/klemmende-deuren-en-ramen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/problemen-met-houten-palen/` | https://www.mvfunderingsquickscan.nl/problemen-met-houten-palen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/fundering-op-staal/` | https://www.mvfunderingsquickscan.nl/fundering-op-staal/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsproblemen-veen/` | https://www.mvfunderingsquickscan.nl/funderingsproblemen-veen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsproblemen-klei/` | https://www.mvfunderingsquickscan.nl/funderingsproblemen-klei/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/werkgebied/` | https://www.mvfunderingsquickscan.nl/werkgebied/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-friesland/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-friesland/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsscan-friesland/` | https://www.mvfunderingsquickscan.nl/funderingsscan-friesland/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-groningen/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-groningen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsscan-groningen/` | https://www.mvfunderingsquickscan.nl/funderingsscan-groningen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-leeuwarden/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-leeuwarden/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-sneek/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-sneek/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-harlingen/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-harlingen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-drachten/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-drachten/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-heerenveen/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-heerenveen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-groningen-stad/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-groningen-stad/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-appingedam/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-appingedam/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-delfzijl/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-delfzijl/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/wat-is-een-funderingsscan/` | https://www.mvfunderingsquickscan.nl/kennisbank/wat-is-een-funderingsscan/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/wat-is-een-quickscan-fundering/` | https://www.mvfunderingsquickscan.nl/kennisbank/wat-is-een-quickscan-fundering/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/wat-is-fase-0/` | https://www.mvfunderingsquickscan.nl/kennisbank/wat-is-fase-0/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/wat-is-fase-1/` | https://www.mvfunderingsquickscan.nl/kennisbank/wat-is-fase-1/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/verschil-fase-0-en-fase-1/` | https://www.mvfunderingsquickscan.nl/kennisbank/verschil-fase-0-en-fase-1/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/wat-kost-een-funderingsscan/` | https://www.mvfunderingsquickscan.nl/kennisbank/wat-kost-een-funderingsscan/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/wat-kost-fase-0/` | https://www.mvfunderingsquickscan.nl/kennisbank/wat-kost-fase-0/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/hoe-lang-duurt-funderingsonderzoek/` | https://www.mvfunderingsquickscan.nl/kennisbank/hoe-lang-duurt-funderingsonderzoek/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/wat-wordt-onderzocht/` | https://www.mvfunderingsquickscan.nl/kennisbank/wat-wordt-onderzocht/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/wanneer-funderingsonderzoek/` | https://www.mvfunderingsquickscan.nl/kennisbank/wanneer-funderingsonderzoek/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/heb-ik-een-funderingsscan-nodig/` | https://www.mvfunderingsquickscan.nl/kennisbank/heb-ik-een-funderingsscan-nodig/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/funderingsscan-bij-aankoop/` | https://www.mvfunderingsquickscan.nl/kennisbank/funderingsscan-bij-aankoop/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/funderingsscan-bij-verkoop/` | https://www.mvfunderingsquickscan.nl/kennisbank/funderingsscan-bij-verkoop/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/funderingsscan-en-taxatie/` | https://www.mvfunderingsquickscan.nl/kennisbank/funderingsscan-en-taxatie/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/funderingsscan-en-hypotheek/` | https://www.mvfunderingsquickscan.nl/kennisbank/funderingsscan-en-hypotheek/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/funderingsrapport-lezen/` | https://www.mvfunderingsquickscan.nl/kennisbank/funderingsrapport-lezen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/wat-na-een-quickscan/` | https://www.mvfunderingsquickscan.nl/kennisbank/wat-na-een-quickscan/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/wanneer-fase-1/` | https://www.mvfunderingsquickscan.nl/kennisbank/wanneer-fase-1/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/scheuren-in-woning/` | https://www.mvfunderingsquickscan.nl/kennisbank/scheuren-in-woning/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/scheuren-in-gevel/` | https://www.mvfunderingsquickscan.nl/kennisbank/scheuren-in-gevel/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/scheuren-in-metselwerk/` | https://www.mvfunderingsquickscan.nl/kennisbank/scheuren-in-metselwerk/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/verzakking-woning/` | https://www.mvfunderingsquickscan.nl/kennisbank/verzakking-woning/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/scheefstand/` | https://www.mvfunderingsquickscan.nl/kennisbank/scheefstand/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/klemmende-deuren/` | https://www.mvfunderingsquickscan.nl/kennisbank/klemmende-deuren/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/kruipruimte-inspectie/` | https://www.mvfunderingsquickscan.nl/kennisbank/kruipruimte-inspectie/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/houten-paalfundering/` | https://www.mvfunderingsquickscan.nl/kennisbank/houten-paalfundering/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/fundering-op-staal/` | https://www.mvfunderingsquickscan.nl/kennisbank/fundering-op-staal/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/veenbodem/` | https://www.mvfunderingsquickscan.nl/kennisbank/veenbodem/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/kleibodem/` | https://www.mvfunderingsquickscan.nl/kennisbank/kleibodem/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/bodemdaling/` | https://www.mvfunderingsquickscan.nl/kennisbank/bodemdaling/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/grondwater-en-fundering/` | https://www.mvfunderingsquickscan.nl/kennisbank/grondwater-en-fundering/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/funderingsrisico/` | https://www.mvfunderingsquickscan.nl/kennisbank/funderingsrisico/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/funderingsherstel/` | https://www.mvfunderingsquickscan.nl/kennisbank/funderingsherstel/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/kosten-funderingsherstel/` | https://www.mvfunderingsquickscan.nl/kennisbank/kosten-funderingsherstel/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/funderingsproblemen-friesland/` | https://www.mvfunderingsquickscan.nl/kennisbank/funderingsproblemen-friesland/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/funderingsproblemen-groningen/` | https://www.mvfunderingsquickscan.nl/kennisbank/funderingsproblemen-groningen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/lintvoegwaterpassing/` | https://www.mvfunderingsquickscan.nl/kennisbank/lintvoegwaterpassing/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/loodmeting/` | https://www.mvfunderingsquickscan.nl/kennisbank/loodmeting/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/vloerveldwaterpassing/` | https://www.mvfunderingsquickscan.nl/kennisbank/vloerveldwaterpassing/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/scheurpatronen/` | https://www.mvfunderingsquickscan.nl/kennisbank/scheurpatronen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/scheefstandsmeting/` | https://www.mvfunderingsquickscan.nl/kennisbank/scheefstandsmeting/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/hoogtemeting/` | https://www.mvfunderingsquickscan.nl/kennisbank/hoogtemeting/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/zettingsmeting/` | https://www.mvfunderingsquickscan.nl/kennisbank/zettingsmeting/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/scheurmeting/` | https://www.mvfunderingsquickscan.nl/kennisbank/scheurmeting/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/monitoring-scheuren/` | https://www.mvfunderingsquickscan.nl/kennisbank/monitoring-scheuren/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/maaiveldhoogte/` | https://www.mvfunderingsquickscan.nl/kennisbank/maaiveldhoogte/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/grondwatermeting/` | https://www.mvfunderingsquickscan.nl/kennisbank/grondwatermeting/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/wat-is-funderingsonderzoek/` | https://www.mvfunderingsquickscan.nl/kennisbank/wat-is-funderingsonderzoek/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/archiefonderzoek-fundering/` | https://www.mvfunderingsquickscan.nl/kennisbank/archiefonderzoek-fundering/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/visuele-funderingsinspectie/` | https://www.mvfunderingsquickscan.nl/kennisbank/visuele-funderingsinspectie/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/funderingsrisico-inschatting/` | https://www.mvfunderingsquickscan.nl/kennisbank/funderingsrisico-inschatting/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/zetting/` | https://www.mvfunderingsquickscan.nl/kennisbank/zetting/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/ongelijke-zetting/` | https://www.mvfunderingsquickscan.nl/kennisbank/ongelijke-zetting/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/paalfundering/` | https://www.mvfunderingsquickscan.nl/kennisbank/paalfundering/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/paalrot/` | https://www.mvfunderingsquickscan.nl/kennisbank/paalrot/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/zandbodem/` | https://www.mvfunderingsquickscan.nl/kennisbank/zandbodem/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/peilverschillen/` | https://www.mvfunderingsquickscan.nl/kennisbank/peilverschillen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/scheuren-boven-kozijnen/` | https://www.mvfunderingsquickscan.nl/kennisbank/scheuren-boven-kozijnen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/scheuren-bij-aanbouw/` | https://www.mvfunderingsquickscan.nl/kennisbank/scheuren-bij-aanbouw/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/klemmende-ramen/` | https://www.mvfunderingsquickscan.nl/kennisbank/klemmende-ramen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/helling-in-vloer/` | https://www.mvfunderingsquickscan.nl/kennisbank/helling-in-vloer/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/funderingsonderzoek-voor-bod/` | https://www.mvfunderingsquickscan.nl/kennisbank/funderingsonderzoek-voor-bod/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/funderingsrisico-bij-aankoop/` | https://www.mvfunderingsquickscan.nl/kennisbank/funderingsrisico-bij-aankoop/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/funderingsrapport-voor-verkoper/` | https://www.mvfunderingsquickscan.nl/kennisbank/funderingsrapport-voor-verkoper/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/kosten-fase-1/` | https://www.mvfunderingsquickscan.nl/kennisbank/kosten-fase-1/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/fase-0-funderingsonderzoek-aankoop/` | https://www.mvfunderingsquickscan.nl/fase-0-funderingsonderzoek-aankoop/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-franeker/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-franeker/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-haren/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-haren/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-veendam/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-veendam/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-winschoten/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-winschoten/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsscan-leeuwarden/` | https://www.mvfunderingsquickscan.nl/funderingsscan-leeuwarden/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kennisbank/begrippenlijst/` | https://www.mvfunderingsquickscan.nl/kennisbank/begrippenlijst/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-achtkarspelen/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-achtkarspelen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-dantumadiel/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-dantumadiel/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-de-fryske-marren/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-de-fryske-marren/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-noardeast-fryslan/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-noardeast-fryslan/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-ooststellingwerf/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-ooststellingwerf/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-opsterland/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-opsterland/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-tytsjerksteradiel/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-tytsjerksteradiel/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-weststellingwerf/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-weststellingwerf/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-eemsdelta/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-eemsdelta/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-het-hogeland/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-het-hogeland/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-midden-groningen/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-midden-groningen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-pekela/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-pekela/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-stadskanaal/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-stadskanaal/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-westerkwartier/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-westerkwartier/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsonderzoek-westerwolde/` | https://www.mvfunderingsquickscan.nl/funderingsonderzoek-westerwolde/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/hulpmiddelen/` | https://www.mvfunderingsquickscan.nl/hulpmiddelen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/gratis-funderingscheck/` | https://www.mvfunderingsquickscan.nl/gratis-funderingscheck/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/vertel-wat-je-ziet/` | https://www.mvfunderingsquickscan.nl/vertel-wat-je-ziet/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/welke-stap-past-bij-mij/` | https://www.mvfunderingsquickscan.nl/welke-stap-past-bij-mij/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/kosten-funderingsonderzoek-berekenen/` | https://www.mvfunderingsquickscan.nl/kosten-funderingsonderzoek-berekenen/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/welke-fundering-heeft-mijn-woning/` | https://www.mvfunderingsquickscan.nl/welke-fundering-heeft-mijn-woning/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsrisicoklasse-uitgelegd/` | https://www.mvfunderingsquickscan.nl/funderingsrisicoklasse-uitgelegd/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/huis-kopen-funderingscheck/` | https://www.mvfunderingsquickscan.nl/huis-kopen-funderingscheck/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/meetwaarden-uitgelegd/` | https://www.mvfunderingsquickscan.nl/meetwaarden-uitgelegd/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/funderingsquiz/` | https://www.mvfunderingsquickscan.nl/funderingsquiz/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/privacyverklaring/` | https://www.mvfunderingsquickscan.nl/privacyverklaring/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/algemene-voorwaarden/` | https://www.mvfunderingsquickscan.nl/algemene-voorwaarden/ (zelf-refererend) | `index, follow, max-image-preview:large, max-snippet:-1` | Ja | Ja |
| `/404.html` | – (geen canonical) | `noindex, follow` | Nee (noindex) | Nee |
| `/beheer/` | – (geen canonical) | `noindex, nofollow` | Nee (noindex) | Nee |
| `/status/` | – (geen canonical) | `noindex, nofollow` | Nee (noindex) | Nee |

**Samenvatting:** 142 pagina’s zijn indexeerbaar, hebben een zelf-refererende canonical en staan in `sitemap.xml`. Drie pagina’s zijn bewust noindex: `/404.html`, `/status/` en `/beheer/`. Er zijn geen canonicals die naar een andere URL wijzen.

---

## 6. Interne links

### Sitebrede links (op elke openbare pagina)
- **Header/hoofdmenu:** 65 unieke interne links. Het menu bevat Funderingsscan (8 subitems), Kopen & verkopen (4), Problemen (9), Werkgebied (megamenu met 2 kolommen Friesland/Groningen), Kennisbank (9), Nieuws, Werkwijze en Contact, plus de knop “Vraag een funderingsscan aan”. Alle links staan in de HTML en zijn crawlbaar zonder JavaScript (`layout.mjs` → `header()`).
- **Footer:** 45 unieke interne links in 3 kolommen (Onderzoek, Situaties & problemen, Werkgebied) plus een metabalk (Over ons, Werkwijze, Kennisbank, Nieuws, Contact, Aanvragen, Privacy, Voorwaarden en **Inloggen → `/beheer/` met `rel="nofollow"`**).
- **Breadcrumbs** op alle content- en speciale pagina’s, behalve de homepage en `/404.html`.
- **Zijbalk** (contentpagina’s): “Meer over funderingsonderzoek” (`side_links` of `defaultSide` uit `site.json`) en, bij 5 of meer secties, een inhoudsopgave met ankerlinks.

### Controle
- **Kapotte interne links: 0.** Elk intern `href` verwijst naar een bestaand bestand in `dist/` of naar de dynamische `/nieuws/`-route.
- **Interne links naar een redirect: 0.**
- **Interne links zonder slash aan het eind: 0.**
- **Externe links:** 14 unieke URL’s (zie onder).

### Links per pagina

¹ *Inkomend contextueel*: aantal andere pagina’s dat vanuit de inhoud (`<main>`, dus zonder header en footer) naar deze pagina linkt.
² *Inkomend totaal*: aantal andere pagina’s met een link naar deze pagina, inclusief menu en footer.
³ *Uitgaand contextueel*: aantal unieke interne links in `<main>`, inclusief breadcrumbs, zijbalk, gerelateerde kaarten en CTA-band.
⁴ *Externe links*: aantal unieke externe URL’s op de pagina.

| URL | Inkomend contextueel¹ | Inkomend totaal² | Uitgaand contextueel³ | Externe links⁴ |
|---|---|---|---|---|
| `/` | 143 | 143 | 57 | 0 |
| `/contact/` | 142 | 143 | 9 | 0 |
| `/funderingsscan-aanvragen/` | 141 | 143 | 8 | 0 |
| `/kennisbank/` | 74 | 143 | 75 | 0 |
| `/funderingsscan/` | 139 | 143 | 48 | 2 |
| `/quickscan-fundering/` | 140 | 143 | 35 | 1 |
| `/fase-0-funderingsonderzoek/` | 140 | 143 | 42 | 0 |
| `/fase-1-funderingsonderzoek/` | 139 | 143 | 27 | 0 |
| `/funderingsinspectie/` | 10 | 143 | 17 | 0 |
| `/funderingsmetingen/` | 29 | 143 | 45 | 0 |
| `/funderingsrapport/` | 19 | 143 | 21 | 2 |
| `/prijzen/` | 140 | 143 | 22 | 0 |
| `/funderingsonderzoek-woning/` | 6 | 143 | 27 | 0 |
| `/funderingsonderzoek-bij-aankoop/` | 45 | 143 | 35 | 0 |
| `/funderingsonderzoek-bij-verkoop/` | 21 | 143 | 23 | 0 |
| `/funderingsonderzoek-taxatie/` | 37 | 143 | 24 | 2 |
| `/woningeigenaren/` | 3 | 3 | 26 | 0 |
| `/makelaars-en-taxateurs/` | 3 | 3 | 18 | 0 |
| `/over-ons/` | 69 | 143 | 25 | 0 |
| `/bronnen-en-richtlijnen/` | 77 | 77 | 14 | 10 |
| `/werkwijze/` | 45 | 143 | 25 | 0 |
| `/funderingsproblemen/` | 24 | 143 | 28 | 1 |
| `/scheuren-in-gevel/` | 40 | 143 | 22 | 0 |
| `/verzakking-woning/` | 24 | 143 | 31 | 0 |
| `/scheefstand-woning/` | 18 | 143 | 23 | 0 |
| `/klemmende-deuren-en-ramen/` | 18 | 143 | 14 | 0 |
| `/problemen-met-houten-palen/` | 26 | 143 | 27 | 0 |
| `/fundering-op-staal/` | 18 | 143 | 25 | 0 |
| `/funderingsproblemen-veen/` | 21 | 143 | 29 | 0 |
| `/funderingsproblemen-klei/` | 20 | 143 | 28 | 1 |
| `/werkgebied/` | 44 | 143 | 49 | 0 |
| `/funderingsonderzoek-friesland/` | 30 | 143 | 38 | 1 |
| `/funderingsscan-friesland/` | 5 | 5 | 20 | 0 |
| `/funderingsonderzoek-groningen/` | 27 | 143 | 38 | 2 |
| `/funderingsscan-groningen/` | 6 | 6 | 26 | 1 |
| `/funderingsonderzoek-leeuwarden/` | 19 | 143 | 23 | 0 |
| `/funderingsonderzoek-sneek/` | 17 | 143 | 25 | 0 |
| `/funderingsonderzoek-harlingen/` | 12 | 143 | 25 | 0 |
| `/funderingsonderzoek-drachten/` | 13 | 143 | 28 | 0 |
| `/funderingsonderzoek-heerenveen/` | 14 | 143 | 26 | 0 |
| `/funderingsonderzoek-groningen-stad/` | 19 | 143 | 26 | 1 |
| `/funderingsonderzoek-appingedam/` | 14 | 143 | 25 | 1 |
| `/funderingsonderzoek-delfzijl/` | 13 | 143 | 26 | 2 |
| `/kennisbank/wat-is-een-funderingsscan/` | 4 | 4 | 19 | 0 |
| `/kennisbank/wat-is-een-quickscan-fundering/` | 4 | 4 | 16 | 0 |
| `/kennisbank/wat-is-fase-0/` | 5 | 5 | 21 | 0 |
| `/kennisbank/wat-is-fase-1/` | 5 | 5 | 22 | 0 |
| `/kennisbank/verschil-fase-0-en-fase-1/` | 9 | 9 | 21 | 0 |
| `/kennisbank/wat-kost-een-funderingsscan/` | 8 | 8 | 15 | 0 |
| `/kennisbank/wat-kost-fase-0/` | 6 | 6 | 19 | 0 |
| `/kennisbank/hoe-lang-duurt-funderingsonderzoek/` | 5 | 5 | 17 | 0 |
| `/kennisbank/wat-wordt-onderzocht/` | 8 | 8 | 24 | 0 |
| `/kennisbank/wanneer-funderingsonderzoek/` | 6 | 6 | 21 | 0 |
| `/kennisbank/heb-ik-een-funderingsscan-nodig/` | 7 | 7 | 16 | 0 |
| `/kennisbank/funderingsscan-bij-aankoop/` | 9 | 9 | 18 | 0 |
| `/kennisbank/funderingsscan-bij-verkoop/` | 3 | 3 | 18 | 0 |
| `/kennisbank/funderingsscan-en-taxatie/` | 7 | 7 | 19 | 2 |
| `/kennisbank/funderingsscan-en-hypotheek/` | 8 | 8 | 18 | 0 |
| `/kennisbank/funderingsrapport-lezen/` | 20 | 20 | 19 | 0 |
| `/kennisbank/wat-na-een-quickscan/` | 19 | 19 | 18 | 0 |
| `/kennisbank/wanneer-fase-1/` | 6 | 6 | 27 | 0 |
| `/kennisbank/scheuren-in-woning/` | 7 | 7 | 19 | 0 |
| `/kennisbank/scheuren-in-gevel/` | 7 | 7 | 17 | 0 |
| `/kennisbank/scheuren-in-metselwerk/` | 7 | 7 | 17 | 0 |
| `/kennisbank/verzakking-woning/` | 6 | 6 | 18 | 0 |
| `/kennisbank/scheefstand/` | 14 | 14 | 20 | 0 |
| `/kennisbank/klemmende-deuren/` | 8 | 8 | 17 | 0 |
| `/kennisbank/kruipruimte-inspectie/` | 12 | 12 | 19 | 0 |
| `/kennisbank/houten-paalfundering/` | 83 | 83 | 18 | 0 |
| `/kennisbank/fundering-op-staal/` | 47 | 47 | 18 | 0 |
| `/kennisbank/veenbodem/` | 34 | 34 | 19 | 0 |
| `/kennisbank/kleibodem/` | 28 | 28 | 19 | 0 |
| `/kennisbank/bodemdaling/` | 66 | 66 | 18 | 1 |
| `/kennisbank/grondwater-en-fundering/` | 25 | 25 | 18 | 0 |
| `/kennisbank/funderingsrisico/` | 11 | 11 | 24 | 2 |
| `/kennisbank/funderingsherstel/` | 10 | 10 | 21 | 0 |
| `/kennisbank/kosten-funderingsherstel/` | 9 | 9 | 14 | 2 |
| `/kennisbank/funderingsproblemen-friesland/` | 7 | 7 | 28 | 0 |
| `/kennisbank/funderingsproblemen-groningen/` | 7 | 7 | 25 | 1 |
| `/kennisbank/lintvoegwaterpassing/` | 47 | 143 | 38 | 0 |
| `/kennisbank/loodmeting/` | 33 | 143 | 26 | 0 |
| `/kennisbank/vloerveldwaterpassing/` | 37 | 143 | 24 | 0 |
| `/kennisbank/scheurpatronen/` | 64 | 143 | 27 | 0 |
| `/kennisbank/scheefstandsmeting/` | 5 | 5 | 22 | 0 |
| `/kennisbank/hoogtemeting/` | 7 | 7 | 19 | 0 |
| `/kennisbank/zettingsmeting/` | 10 | 10 | 20 | 0 |
| `/kennisbank/scheurmeting/` | 4 | 4 | 18 | 1 |
| `/kennisbank/monitoring-scheuren/` | 16 | 16 | 16 | 0 |
| `/kennisbank/maaiveldhoogte/` | 4 | 4 | 19 | 0 |
| `/kennisbank/grondwatermeting/` | 6 | 6 | 20 | 0 |
| `/kennisbank/wat-is-funderingsonderzoek/` | 4 | 143 | 28 | 0 |
| `/kennisbank/archiefonderzoek-fundering/` | 27 | 27 | 27 | 0 |
| `/kennisbank/visuele-funderingsinspectie/` | 45 | 45 | 28 | 0 |
| `/kennisbank/funderingsrisico-inschatting/` | 43 | 43 | 29 | 1 |
| `/kennisbank/zetting/` | 39 | 143 | 27 | 0 |
| `/kennisbank/ongelijke-zetting/` | 46 | 46 | 26 | 0 |
| `/kennisbank/paalfundering/` | 6 | 6 | 21 | 0 |
| `/kennisbank/paalrot/` | 14 | 14 | 25 | 0 |
| `/kennisbank/zandbodem/` | 13 | 13 | 22 | 0 |
| `/kennisbank/peilverschillen/` | 3 | 3 | 24 | 0 |
| `/kennisbank/scheuren-boven-kozijnen/` | 8 | 8 | 19 | 0 |
| `/kennisbank/scheuren-bij-aanbouw/` | 12 | 12 | 23 | 0 |
| `/kennisbank/klemmende-ramen/` | 3 | 3 | 19 | 0 |
| `/kennisbank/helling-in-vloer/` | 11 | 11 | 20 | 0 |
| `/kennisbank/funderingsonderzoek-voor-bod/` | 5 | 5 | 19 | 1 |
| `/kennisbank/funderingsrisico-bij-aankoop/` | 4 | 4 | 26 | 0 |
| `/kennisbank/funderingsrapport-voor-verkoper/` | 4 | 4 | 16 | 0 |
| `/kennisbank/kosten-fase-1/` | 2 | 2 | 22 | 0 |
| `/fase-0-funderingsonderzoek-aankoop/` | 6 | 6 | 33 | 1 |
| `/funderingsonderzoek-franeker/` | 11 | 143 | 24 | 0 |
| `/funderingsonderzoek-haren/` | 10 | 143 | 26 | 1 |
| `/funderingsonderzoek-veendam/` | 15 | 143 | 27 | 0 |
| `/funderingsonderzoek-winschoten/` | 13 | 143 | 26 | 1 |
| `/funderingsscan-leeuwarden/` | 2 | 143 | 20 | 0 |
| `/kennisbank/begrippenlijst/` | 28 | 143 | 36 | 0 |
| `/funderingsonderzoek-achtkarspelen/` | 3 | 143 | 20 | 0 |
| `/funderingsonderzoek-dantumadiel/` | 5 | 143 | 21 | 0 |
| `/funderingsonderzoek-de-fryske-marren/` | 2 | 143 | 21 | 0 |
| `/funderingsonderzoek-noardeast-fryslan/` | 3 | 143 | 23 | 0 |
| `/funderingsonderzoek-ooststellingwerf/` | 4 | 143 | 23 | 0 |
| `/funderingsonderzoek-opsterland/` | 3 | 143 | 24 | 0 |
| `/funderingsonderzoek-tytsjerksteradiel/` | 2 | 143 | 25 | 0 |
| `/funderingsonderzoek-weststellingwerf/` | 3 | 143 | 24 | 0 |
| `/funderingsonderzoek-eemsdelta/` | 3 | 143 | 26 | 1 |
| `/funderingsonderzoek-het-hogeland/` | 3 | 143 | 23 | 1 |
| `/funderingsonderzoek-midden-groningen/` | 2 | 143 | 25 | 1 |
| `/funderingsonderzoek-pekela/` | 3 | 143 | 26 | 0 |
| `/funderingsonderzoek-stadskanaal/` | 4 | 143 | 31 | 1 |
| `/funderingsonderzoek-westerkwartier/` | 2 | 143 | 24 | 0 |
| `/funderingsonderzoek-westerwolde/` | 3 | 143 | 27 | 0 |
| `/hulpmiddelen/` | 10 | 10 | 39 | 0 |
| `/gratis-funderingscheck/` | 140 | 143 | 16 | 0 |
| `/vertel-wat-je-ziet/` | 5 | 5 | 21 | 0 |
| `/welke-stap-past-bij-mij/` | 3 | 3 | 22 | 0 |
| `/kosten-funderingsonderzoek-berekenen/` | 5 | 5 | 16 | 0 |
| `/welke-fundering-heeft-mijn-woning/` | 4 | 4 | 16 | 0 |
| `/funderingsrisicoklasse-uitgelegd/` | 8 | 8 | 14 | 1 |
| `/huis-kopen-funderingscheck/` | 4 | 4 | 15 | 0 |
| `/meetwaarden-uitgelegd/` | 3 | 3 | 17 | 0 |
| `/funderingsquiz/` | 3 | 3 | 16 | 0 |
| `/privacyverklaring/` | 3 | 143 | 11 | 1 |
| `/algemene-voorwaarden/` | 1 | 143 | 11 | 0 |
| `/404.html` | 0 | 0 | 10 | 0 |
| `/beheer/` | 0 | 144 | 0 | 0 |
| `/status/` | 0 | 0 | 1 | 0 |

**Laagste aantal inkomende contextuele links** (openbare pagina’s): `/algemene-voorwaarden/` (1), `/funderingsonderzoek-de-fryske-marren/`, `/funderingsonderzoek-midden-groningen/`, `/funderingsonderzoek-tytsjerksteradiel/`, `/funderingsonderzoek-westerkwartier/`, `/funderingsscan-leeuwarden/` en `/kennisbank/kosten-fase-1/` (elk 2). Geen enkele openbare pagina is volledig wees: ze worden allemaal minstens vanuit het menu, de footer of een overzichtspagina gelinkt.

### Externe links

| Externe URL | Gelinkt vanaf |
|---|---|
| <https://www.nrvt.nl/> | `/funderingsscan/`, `/funderingsonderzoek-taxatie/`, `/kennisbank/funderingsscan-en-taxatie/`, `/kennisbank/funderingsrisico/` |
| <https://www.schadedoormijnbouw.nl/> | `/funderingsscan/`, `/quickscan-fundering/`, `/funderingsrapport/`, `/funderingsproblemen/`, `/funderingsproblemen-klei/`, `/funderingsonderzoek-groningen/`, `/funderingsscan-groningen/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-delfzijl/`, `/kennisbank/bodemdaling/`, `/kennisbank/kosten-funderingsherstel/`, `/kennisbank/funderingsproblemen-groningen/`, `/kennisbank/scheurmeting/`, `/fase-0-funderingsonderzoek-aankoop/`, `/funderingsonderzoek-haren/`, `/funderingsonderzoek-winschoten/`, `/funderingsonderzoek-eemsdelta/`, `/funderingsonderzoek-het-hogeland/`, `/funderingsonderzoek-midden-groningen/` |
| <https://www.kcaf.nl/> | `/funderingsrapport/`, `/funderingsonderzoek-taxatie/`, `/funderingsonderzoek-friesland/`, `/funderingsonderzoek-groningen/`, `/funderingsonderzoek-delfzijl/`, `/kennisbank/funderingsscan-en-taxatie/`, `/kennisbank/funderingsrisico/`, `/kennisbank/kosten-funderingsherstel/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/funderingsonderzoek-voor-bod/`, `/funderingsonderzoek-stadskanaal/`, `/funderingsrisicoklasse-uitgelegd/` |
| <https://www.kcaf.nl/wp-content/uploads/2023/01/Richtlijnen-onderzoek-funderingen-onder-gebouwen.pdf> | `/bronnen-en-richtlijnen/` |
| <https://www.kcaf.nl/funderingsrisico-onderzoeken/> | `/bronnen-en-richtlijnen/` |
| <https://www.kcaf.nl/erkenningsregeling/> | `/bronnen-en-richtlijnen/` |
| <https://www.nrvt.nl/over-nrvt/nieuws/nieuw-model-taxatierapport-woonruimte-per-1-april-2026-wat-betekent-dit-in-de-praktijk> | `/bronnen-en-richtlijnen/` |
| <https://www.nhg.nl/nhg-actueel/funderingsrisico-in-het-taxatierapport-wat-verandert-er-vanaf-1-april/> | `/bronnen-en-richtlijnen/` |
| <https://www.nhg.nl/kennis-innovatie/voorwaarden-en-normen-2027/> | `/bronnen-en-richtlijnen/` |
| <https://www.kcaf.nl/wp-content/uploads/2022/11/74323-RVO-RPAF-22-Brochure_Woningeigenaren_TGPDFA.pdf> | `/bronnen-en-richtlijnen/` |
| <https://www.rijksoverheid.nl/actueel/nieuws/2025/07/04/kabinet-van-start-met-meerjarenaanpak-voor-funderingsproblematiek> | `/bronnen-en-richtlijnen/` |
| <https://veenweidefryslan.frl/uploads/Downloads/4107-veenweideprogramma-2021-2030-bijlage-lr.pdf> | `/bronnen-en-richtlijnen/` |
| <https://historischcentrumleeuwarden.nl/images/Educatie/CanonvanLeeuwarden/Canon_van_Leeuwarden_-_De_Oldehove.pdf> | `/bronnen-en-richtlijnen/` |
| <https://www.autoriteitpersoonsgegevens.nl/> | `/privacyverklaring/` |

### Alle contextuele interne links per pagina (uitklapbaar)

<details><summary><code>/</code> – 57 contextuele interne links</summary>

`/funderingsscan-aanvragen/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`, `/vertel-wat-je-ziet/`, `/huis-kopen-funderingscheck/`, `/funderingsrisicoklasse-uitgelegd/`, `/hulpmiddelen/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/scheurpatronen/`, `/funderingsmetingen/`, `/kennisbank/begrippenlijst/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-taxatie/`, `/funderingsonderzoek-bij-verkoop/`, `/makelaars-en-taxateurs/`, `/woningeigenaren/`, `/contact/`, `/werkwijze/`, `/scheuren-in-gevel/`, `/verzakking-woning/`, `/scheefstand-woning/`, `/klemmende-deuren-en-ramen/`, `/problemen-met-houten-palen/`, `/funderingsproblemen/`, `/prijzen/`, `/bronnen-en-richtlijnen/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-harlingen/`, `/funderingsonderzoek-drachten/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-franeker/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-haren/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-delfzijl/`, `/funderingsonderzoek-veendam/`, `/funderingsonderzoek-winschoten/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/funderingsonderzoek-groningen/`, `/kennisbank/`, `/kennisbank/wat-is-een-funderingsscan/`, `/kennisbank/wat-kost-een-funderingsscan/`, `/kennisbank/scheuren-in-gevel/`, `/kennisbank/funderingsscan-bij-aankoop/`, `/kennisbank/funderingsproblemen-friesland/`, `/kennisbank/funderingsproblemen-groningen/`, `/over-ons/`

</details>
<details><summary><code>/contact/</code> – 9 contextuele interne links</summary>

`/`, `/funderingsonderzoek-friesland/`, `/funderingsonderzoek-groningen/`, `/werkgebied/`, `/funderingsscan-aanvragen/`, `/privacyverklaring/`, `/kennisbank/`, `/prijzen/`, `/werkwijze/`

</details>
<details><summary><code>/funderingsscan-aanvragen/</code> – 8 contextuele interne links</summary>

`/`, `/contact/`, `/gratis-funderingscheck/`, `/quickscan-fundering/`, `/prijzen/`, `/privacyverklaring/`, `/kennisbank/`, `/fase-0-funderingsonderzoek/`

</details>
<details><summary><code>/kennisbank/</code> – 75 contextuele interne links</summary>

`/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/funderingsproblemen/`, `/funderingsonderzoek-bij-aankoop/`, `/kennisbank/wat-is-funderingsonderzoek/`, `/kennisbank/wat-is-een-funderingsscan/`, `/kennisbank/wat-is-een-quickscan-fundering/`, `/kennisbank/wat-is-fase-0/`, `/kennisbank/wat-is-fase-1/`, `/kennisbank/verschil-fase-0-en-fase-1/`, `/kennisbank/wanneer-funderingsonderzoek/`, `/kennisbank/heb-ik-een-funderingsscan-nodig/`, `/kennisbank/wanneer-fase-1/`, `/kennisbank/hoe-lang-duurt-funderingsonderzoek/`, `/kennisbank/wat-wordt-onderzocht/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/kruipruimte-inspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/funderingsrapport-lezen/`, `/kennisbank/wat-na-een-quickscan/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/scheurpatronen/`, `/kennisbank/scheurmeting/`, `/kennisbank/monitoring-scheuren/`, `/kennisbank/scheefstandsmeting/`, `/kennisbank/hoogtemeting/`, `/kennisbank/zettingsmeting/`, `/kennisbank/maaiveldhoogte/`, `/kennisbank/grondwatermeting/`, `/kennisbank/scheuren-in-woning/`, `/kennisbank/scheuren-in-gevel/`, `/kennisbank/scheuren-in-metselwerk/`, `/kennisbank/scheuren-boven-kozijnen/`, `/kennisbank/scheuren-bij-aanbouw/`, `/kennisbank/verzakking-woning/`, `/kennisbank/scheefstand/`, `/kennisbank/klemmende-deuren/`, `/kennisbank/klemmende-ramen/`, `/kennisbank/helling-in-vloer/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/funderingsrisico/`, `/kennisbank/paalfundering/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/paalrot/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/zetting/`, `/kennisbank/veenbodem/`, `/kennisbank/kleibodem/`, `/kennisbank/zandbodem/`, `/kennisbank/bodemdaling/`, `/kennisbank/grondwater-en-fundering/`, `/kennisbank/peilverschillen/`, `/kennisbank/funderingsscan-bij-aankoop/`, `/kennisbank/funderingsonderzoek-voor-bod/`, `/kennisbank/funderingsrisico-bij-aankoop/`, `/kennisbank/funderingsscan-en-hypotheek/`, `/kennisbank/funderingsscan-en-taxatie/`, `/kennisbank/funderingsscan-bij-verkoop/`, `/kennisbank/funderingsrapport-voor-verkoper/`, `/kennisbank/wat-kost-een-funderingsscan/`, `/kennisbank/wat-kost-fase-0/`, `/kennisbank/kosten-fase-1/`, `/kennisbank/kosten-funderingsherstel/`, `/kennisbank/funderingsherstel/`, `/kennisbank/funderingsproblemen-friesland/`, `/kennisbank/funderingsproblemen-groningen/`, `/funderingsscan-aanvragen/`, `/gratis-funderingscheck/`, `/contact/`

</details>
<details><summary><code>/funderingsscan/</code> – 48 contextuele interne links</summary>

`/`, `/funderingsscan-aanvragen/`, `/fase-0-funderingsonderzoek/`, `/quickscan-fundering/`, `/kennisbank/bodemdaling/`, `/kennisbank/scheurpatronen/`, `/kennisbank/wat-wordt-onderzocht/`, `/kennisbank/heb-ik-een-funderingsscan-nodig/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-bij-verkoop/`, `/funderingsonderzoek-taxatie/`, `/bronnen-en-richtlijnen/`, `/scheuren-in-gevel/`, `/kennisbank/houten-paalfundering/`, `/gratis-funderingscheck/`, `/kennisbank/wanneer-funderingsonderzoek/`, `/werkwijze/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/kruipruimte-inspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/wat-na-een-quickscan/`, `/funderingsrapport/`, `/kennisbank/funderingsrapport-lezen/`, `/kennisbank/wanneer-fase-1/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/verschil-fase-0-en-fase-1/`, `/prijzen/`, `/kennisbank/wat-kost-een-funderingsscan/`, `/kennisbank/hoe-lang-duurt-funderingsonderzoek/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-harlingen/`, `/funderingsonderzoek-drachten/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-franeker/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-delfzijl/`, `/funderingsonderzoek-haren/`, `/funderingsonderzoek-veendam/`, `/funderingsonderzoek-winschoten/`, `/werkgebied/`, `/funderingsscan-friesland/`, `/funderingsscan-groningen/`, `/contact/`, `/problemen-met-houten-palen/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/visuele-funderingsinspectie/`

Extern: <https://www.nrvt.nl/>, <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/quickscan-fundering/</code> – 35 contextuele interne links</summary>

`/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/gratis-funderingscheck/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-bij-verkoop/`, `/kennisbank/wanneer-funderingsonderzoek/`, `/kennisbank/houten-paalfundering/`, `/problemen-met-houten-palen/`, `/fundering-op-staal/`, `/scheuren-in-gevel/`, `/kennisbank/zetting/`, `/verzakking-woning/`, `/scheefstand-woning/`, `/klemmende-deuren-en-ramen/`, `/funderingsproblemen/`, `/kennisbank/bodemdaling/`, `/kennisbank/scheurpatronen/`, `/kennisbank/wat-wordt-onderzocht/`, `/funderingsrapport/`, `/prijzen/`, `/kennisbank/wat-kost-fase-0/`, `/funderingsonderzoek-friesland/`, `/funderingsonderzoek-groningen/`, `/funderingsonderzoek-leeuwarden/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/vloerveldwaterpassing/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/wat-na-een-quickscan/`, `/contact/`, `/kennisbank/wat-is-een-quickscan-fundering/`, `/funderingsonderzoek-taxatie/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/heb-ik-een-funderingsscan-nodig/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/fase-0-funderingsonderzoek/</code> – 42 contextuele interne links</summary>

`/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/quickscan-fundering/`, `/kennisbank/scheurpatronen/`, `/fase-1-funderingsonderzoek/`, `/bronnen-en-richtlijnen/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-taxatie/`, `/kennisbank/houten-paalfundering/`, `/fundering-op-staal/`, `/kennisbank/ongelijke-zetting/`, `/funderingsproblemen-veen/`, `/funderingsproblemen-klei/`, `/kennisbank/bodemdaling/`, `/funderingsinspectie/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/kruipruimte-inspectie/`, `/funderingsmetingen/`, `/funderingsproblemen/`, `/kennisbank/funderingsrisico/`, `/scheuren-in-gevel/`, `/kennisbank/zetting/`, `/kennisbank/lintvoegwaterpassing/`, `/verzakking-woning/`, `/kennisbank/loodmeting/`, `/scheefstand-woning/`, `/klemmende-deuren-en-ramen/`, `/kennisbank/vloerveldwaterpassing/`, `/problemen-met-houten-palen/`, `/kennisbank/grondwater-en-fundering/`, `/kennisbank/wat-na-een-quickscan/`, `/funderingsrapport/`, `/kennisbank/funderingsrapport-lezen/`, `/kennisbank/verschil-fase-0-en-fase-1/`, `/contact/`, `/prijzen/`, `/kennisbank/wat-kost-fase-0/`, `/gratis-funderingscheck/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico-inschatting/`

</details>
<details><summary><code>/fase-1-funderingsonderzoek/</code> – 27 contextuele interne links</summary>

`/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/verschil-fase-0-en-fase-1/`, `/funderingsonderzoek-taxatie/`, `/kennisbank/wanneer-fase-1/`, `/funderingsmetingen/`, `/kennisbank/ongelijke-zetting/`, `/scheefstand-woning/`, `/scheuren-in-gevel/`, `/kennisbank/scheurpatronen/`, `/funderingsrapport/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/funderingsherstel/`, `/kennisbank/visuele-funderingsinspectie/`, `/quickscan-fundering/`, `/prijzen/`, `/contact/`, `/gratis-funderingscheck/`, `/kennisbank/loodmeting/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/kosten-fase-1/`, `/kennisbank/zettingsmeting/`, `/kennisbank/monitoring-scheuren/`

</details>
<details><summary><code>/funderingsinspectie/</code> – 17 contextuele interne links</summary>

`/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/quickscan-fundering/`, `/kennisbank/bodemdaling/`, `/scheuren-in-gevel/`, `/klemmende-deuren-en-ramen/`, `/kennisbank/kruipruimte-inspectie/`, `/kennisbank/houten-paalfundering/`, `/problemen-met-houten-palen/`, `/funderingsrapport/`, `/prijzen/`, `/gratis-funderingscheck/`, `/contact/`, `/fase-1-funderingsonderzoek/`, `/funderingsmetingen/`

</details>
<details><summary><code>/funderingsmetingen/</code> – 45 contextuele interne links</summary>

`/`, `/funderingsscan/`, `/fase-1-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/scheurpatronen/`, `/kennisbank/zetting/`, `/kennisbank/zettingsmeting/`, `/kennisbank/scheefstandsmeting/`, `/scheefstand-woning/`, `/funderingsproblemen/`, `/verzakking-woning/`, `/scheuren-in-gevel/`, `/kennisbank/monitoring-scheuren/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/scheuren-bij-aanbouw/`, `/quickscan-fundering/`, `/kennisbank/helling-in-vloer/`, `/kennisbank/klemmende-deuren/`, `/kennisbank/`, `/kennisbank/begrippenlijst/`, `/kennisbank/scheuren-in-metselwerk/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-harlingen/`, `/funderingsonderzoek-drachten/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-franeker/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-delfzijl/`, `/funderingsonderzoek-veendam/`, `/kennisbank/veenbodem/`, `/funderingsonderzoek-winschoten/`, `/kennisbank/kleibodem/`, `/funderingsonderzoek-friesland/`, `/funderingsonderzoek-groningen/`, `/prijzen/`, `/gratis-funderingscheck/`, `/contact/`

</details>
<details><summary><code>/funderingsrapport/</code> – 21 contextuele interne links</summary>

`/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/bodemdaling/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/scheurpatronen/`, `/kennisbank/funderingsrapport-lezen/`, `/fase-1-funderingsonderzoek/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-bij-verkoop/`, `/kennisbank/funderingsherstel/`, `/prijzen/`, `/contact/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`, `/funderingsinspectie/`, `/funderingsonderzoek-taxatie/`

Extern: <https://www.schadedoormijnbouw.nl/>, <https://www.kcaf.nl/>

</details>
<details><summary><code>/prijzen/</code> – 22 contextuele interne links</summary>

`/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/bodemdaling/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/scheurpatronen/`, `/funderingsinspectie/`, `/funderingsmetingen/`, `/contact/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-bij-verkoop/`, `/funderingsonderzoek-taxatie/`, `/kennisbank/kosten-funderingsherstel/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/wat-kost-een-funderingsscan/`

</details>
<details><summary><code>/funderingsonderzoek-woning/</code> – 27 contextuele interne links</summary>

`/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-bij-verkoop/`, `/funderingsonderzoek-taxatie/`, `/funderingsproblemen/`, `/contact/`, `/fase-1-funderingsonderzoek/`, `/scheuren-in-gevel/`, `/klemmende-deuren-en-ramen/`, `/gratis-funderingscheck/`, `/woningeigenaren/`, `/werkwijze/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/houten-paalfundering/`, `/problemen-met-houten-palen/`, `/fundering-op-staal/`, `/kennisbank/bodemdaling/`, `/kennisbank/ongelijke-zetting/`, `/funderingsonderzoek-friesland/`, `/funderingsonderzoek-groningen/`, `/prijzen/`, `/quickscan-fundering/`

</details>
<details><summary><code>/funderingsonderzoek-bij-aankoop/</code> – 35 contextuele interne links</summary>

`/`, `/funderingsonderzoek-woning/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/kennisbank/houten-paalfundering/`, `/funderingsonderzoek-friesland/`, `/funderingsonderzoek-groningen/`, `/kennisbank/fundering-op-staal/`, `/problemen-met-houten-palen/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/zetting/`, `/funderingsproblemen-veen/`, `/funderingsproblemen-klei/`, `/kennisbank/bodemdaling/`, `/scheuren-in-gevel/`, `/gratis-funderingscheck/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/funderingsrapport-lezen/`, `/funderingsrapport/`, `/fase-1-funderingsonderzoek/`, `/contact/`, `/kennisbank/scheurpatronen/`, `/werkwijze/`, `/kennisbank/funderingsscan-bij-aankoop/`, `/bronnen-en-richtlijnen/`, `/funderingsonderzoek-taxatie/`, `/huis-kopen-funderingscheck/`, `/quickscan-fundering/`, `/prijzen/`, `/funderingsscan/`, `/kennisbank/kruipruimte-inspectie/`, `/kennisbank/funderingsonderzoek-voor-bod/`, `/fase-0-funderingsonderzoek-aankoop/`, `/kennisbank/funderingsrisico-bij-aankoop/`, `/funderingsonderzoek-bij-verkoop/`

</details>
<details><summary><code>/funderingsonderzoek-bij-verkoop/</code> – 23 contextuele interne links</summary>

`/`, `/funderingsonderzoek-woning/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/funderingsonderzoek-taxatie/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-1-funderingsonderzoek/`, `/scheuren-in-gevel/`, `/verzakking-woning/`, `/werkwijze/`, `/kennisbank/funderingsrapport-lezen/`, `/funderingsrisicoklasse-uitgelegd/`, `/makelaars-en-taxateurs/`, `/prijzen/`, `/funderingsscan/`, `/kennisbank/funderingsrapport-voor-verkoper/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsrapport/`, `/kennisbank/funderingsscan-bij-verkoop/`, `/contact/`

</details>
<details><summary><code>/funderingsonderzoek-taxatie/</code> – 24 contextuele interne links</summary>

`/`, `/funderingsonderzoek-woning/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/bronnen-en-richtlijnen/`, `/kennisbank/houten-paalfundering/`, `/funderingsonderzoek-friesland/`, `/funderingsonderzoek-groningen/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-bij-verkoop/`, `/makelaars-en-taxateurs/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-1-funderingsonderzoek/`, `/funderingsrisicoklasse-uitgelegd/`, `/kennisbank/bodemdaling/`, `/gratis-funderingscheck/`, `/contact/`, `/funderingsrapport/`, `/kennisbank/funderingsscan-en-hypotheek/`, `/prijzen/`, `/funderingsscan/`, `/quickscan-fundering/`, `/kennisbank/funderingsscan-en-taxatie/`

Extern: <https://www.kcaf.nl/>, <https://www.nrvt.nl/>

</details>
<details><summary><code>/woningeigenaren/</code> – 26 contextuele interne links</summary>

`/`, `/funderingsscan-aanvragen/`, `/gratis-funderingscheck/`, `/scheuren-in-gevel/`, `/verzakking-woning/`, `/scheefstand-woning/`, `/klemmende-deuren-en-ramen/`, `/vertel-wat-je-ziet/`, `/kennisbank/scheurpatronen/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/funderingsonderzoek-friesland/`, `/funderingsonderzoek-groningen/`, `/fase-0-funderingsonderzoek/`, `/quickscan-fundering/`, `/kennisbank/monitoring-scheuren/`, `/funderingsmetingen/`, `/werkwijze/`, `/prijzen/`, `/contact/`, `/funderingsscan/`, `/fase-1-funderingsonderzoek/`, `/welke-fundering-heeft-mijn-woning/`, `/werkgebied/`, `/funderingsproblemen/`, `/funderingsonderzoek-woning/`

</details>
<details><summary><code>/makelaars-en-taxateurs/</code> – 18 contextuele interne links</summary>

`/`, `/funderingsscan-aanvragen/`, `/bronnen-en-richtlijnen/`, `/funderingsonderzoek-taxatie/`, `/funderingsrisicoklasse-uitgelegd/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-bij-verkoop/`, `/fase-1-funderingsonderzoek/`, `/funderingsrapport/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/contact/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`

</details>
<details><summary><code>/over-ons/</code> – 25 contextuele interne links</summary>

`/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/lintvoegwaterpassing/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/houten-paalfundering/`, `/werkwijze/`, `/prijzen/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-harlingen/`, `/funderingsonderzoek-drachten/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-delfzijl/`, `/funderingsonderzoek-franeker/`, `/funderingsonderzoek-veendam/`, `/funderingsonderzoek-winschoten/`, `/werkgebied/`, `/contact/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`

</details>
<details><summary><code>/bronnen-en-richtlijnen/</code> – 14 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/funderingsonderzoek-taxatie/`, `/funderingsonderzoek-bij-aankoop/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/begrippenlijst/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/over-ons/`, `/contact/`

Extern: <https://www.kcaf.nl/wp-content/uploads/2023/01/Richtlijnen-onderzoek-funderingen-onder-gebouwen.pdf>, <https://www.kcaf.nl/funderingsrisico-onderzoeken/>, <https://www.kcaf.nl/erkenningsregeling/>, <https://www.nrvt.nl/over-nrvt/nieuws/nieuw-model-taxatierapport-woonruimte-per-1-april-2026-wat-betekent-dit-in-de-praktijk>, <https://www.nhg.nl/nhg-actueel/funderingsrisico-in-het-taxatierapport-wat-verandert-er-vanaf-1-april/>, <https://www.nhg.nl/kennis-innovatie/voorwaarden-en-normen-2027/>, <https://www.kcaf.nl/wp-content/uploads/2022/11/74323-RVO-RPAF-22-Brochure_Woningeigenaren_TGPDFA.pdf>, <https://www.rijksoverheid.nl/actueel/nieuws/2025/07/04/kabinet-van-start-met-meerjarenaanpak-voor-funderingsproblematiek>, <https://veenweidefryslan.frl/uploads/Downloads/4107-veenweideprogramma-2021-2030-bijlage-lr.pdf>, <https://historischcentrumleeuwarden.nl/images/Educatie/CanonvanLeeuwarden/Canon_van_Leeuwarden_-_De_Oldehove.pdf>

</details>
<details><summary><code>/werkwijze/</code> – 25 contextuele interne links</summary>

`/`, `/quickscan-fundering/`, `/funderingsscan-aanvragen/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-0-funderingsonderzoek/`, `/gratis-funderingscheck/`, `/contact/`, `/kennisbank/archiefonderzoek-fundering/`, `/funderingsonderzoek-bij-aankoop/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/problemen-met-houten-palen/`, `/funderingsproblemen-veen/`, `/kennisbank/scheurpatronen/`, `/scheuren-in-gevel/`, `/funderingsrapport/`, `/kennisbank/wat-na-een-quickscan/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/vloerveldwaterpassing/`, `/prijzen/`, `/funderingsscan/`, `/kennisbank/hoe-lang-duurt-funderingsonderzoek/`, `/over-ons/`

</details>
<details><summary><code>/funderingsproblemen/</code> – 28 contextuele interne links</summary>

`/`, `/quickscan-fundering/`, `/funderingsscan-aanvragen/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/zetting/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/paalrot/`, `/gratis-funderingscheck/`, `/fase-0-funderingsonderzoek/`, `/contact/`, `/kennisbank/bodemdaling/`, `/kennisbank/grondwater-en-fundering/`, `/scheuren-in-gevel/`, `/verzakking-woning/`, `/scheefstand-woning/`, `/klemmende-deuren-en-ramen/`, `/problemen-met-houten-palen/`, `/fundering-op-staal/`, `/funderingsproblemen-veen/`, `/funderingsproblemen-klei/`, `/funderingsonderzoek-friesland/`, `/funderingsonderzoek-groningen/`, `/kennisbank/visuele-funderingsinspectie/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/woningeigenaren/`, `/funderingsscan/`, `/kennisbank/funderingsrisico/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/scheuren-in-gevel/</code> – 22 contextuele interne links</summary>

`/`, `/funderingsproblemen/`, `/quickscan-fundering/`, `/funderingsscan-aanvragen/`, `/kennisbank/scheuren-in-gevel/`, `/kennisbank/scheuren-in-woning/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/visuele-funderingsinspectie/`, `/gratis-funderingscheck/`, `/kennisbank/scheuren-in-metselwerk/`, `/klemmende-deuren-en-ramen/`, `/kennisbank/zetting/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/contact/`, `/funderingsscan/`, `/kennisbank/scheurpatronen/`, `/kennisbank/scheuren-boven-kozijnen/`, `/kennisbank/scheuren-bij-aanbouw/`, `/kennisbank/scheurmeting/`, `/verzakking-woning/`

</details>
<details><summary><code>/verzakking-woning/</code> – 31 contextuele interne links</summary>

`/`, `/funderingsproblemen/`, `/quickscan-fundering/`, `/funderingsscan-aanvragen/`, `/kennisbank/verzakking-woning/`, `/kennisbank/bodemdaling/`, `/scheuren-in-gevel/`, `/scheefstand-woning/`, `/kennisbank/houten-paalfundering/`, `/problemen-met-houten-palen/`, `/fundering-op-staal/`, `/funderingsproblemen-veen/`, `/funderingsproblemen-klei/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/scheurpatronen/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-1-funderingsonderzoek/`, `/contact/`, `/funderingsscan/`, `/prijzen/`, `/gratis-funderingscheck/`, `/funderingsonderzoek-bij-verkoop/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/zetting/`, `/klemmende-deuren-en-ramen/`, `/kennisbank/helling-in-vloer/`, `/kennisbank/grondwater-en-fundering/`, `/kennisbank/paalrot/`, `/kennisbank/scheuren-bij-aanbouw/`, `/funderingsmetingen/`

</details>
<details><summary><code>/scheefstand-woning/</code> – 23 contextuele interne links</summary>

`/`, `/funderingsproblemen/`, `/fase-1-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/kennisbank/scheefstand/`, `/kennisbank/houten-paalfundering/`, `/verzakking-woning/`, `/fase-0-funderingsonderzoek/`, `/funderingsmetingen/`, `/scheuren-in-gevel/`, `/kennisbank/visuele-funderingsinspectie/`, `/gratis-funderingscheck/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/kennisbank/loodmeting/`, `/kennisbank/scheefstandsmeting/`, `/klemmende-deuren-en-ramen/`, `/kennisbank/helling-in-vloer/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/wat-na-een-quickscan/`, `/contact/`

</details>
<details><summary><code>/klemmende-deuren-en-ramen/</code> – 14 contextuele interne links</summary>

`/`, `/funderingsproblemen/`, `/quickscan-fundering/`, `/funderingsscan-aanvragen/`, `/kennisbank/klemmende-deuren/`, `/scheuren-in-gevel/`, `/scheefstand-woning/`, `/gratis-funderingscheck/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/contact/`, `/funderingsscan/`, `/prijzen/`, `/funderingsinspectie/`

</details>
<details><summary><code>/problemen-met-houten-palen/</code> – 27 contextuele interne links</summary>

`/`, `/funderingsproblemen/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/bodemdaling/`, `/kennisbank/grondwater-en-fundering/`, `/kennisbank/paalrot/`, `/scheuren-in-gevel/`, `/kennisbank/funderingsrisico/`, `/quickscan-fundering/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/scheurpatronen/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/funderingsherstel/`, `/gratis-funderingscheck/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-groningen-stad/`, `/contact/`, `/funderingsscan/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/kennisbank/kosten-funderingsherstel/`, `/funderingsproblemen-veen/`

</details>
<details><summary><code>/fundering-op-staal/</code> – 25 contextuele interne links</summary>

`/`, `/funderingsproblemen/`, `/quickscan-fundering/`, `/funderingsscan-aanvragen/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/bodemdaling/`, `/kennisbank/ongelijke-zetting/`, `/funderingsproblemen-klei/`, `/funderingsproblemen-veen/`, `/kennisbank/zetting/`, `/verzakking-woning/`, `/kennisbank/paalrot/`, `/problemen-met-houten-palen/`, `/werkgebied/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/scheurpatronen/`, `/fase-1-funderingsonderzoek/`, `/contact/`, `/funderingsscan/`, `/prijzen/`, `/gratis-funderingscheck/`, `/scheuren-in-gevel/`, `/kennisbank/kleibodem/`

</details>
<details><summary><code>/funderingsproblemen-veen/</code> – 29 contextuele interne links</summary>

`/`, `/funderingsproblemen/`, `/quickscan-fundering/`, `/funderingsscan-aanvragen/`, `/kennisbank/veenbodem/`, `/kennisbank/bodemdaling/`, `/fundering-op-staal/`, `/kennisbank/houten-paalfundering/`, `/problemen-met-houten-palen/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/zetting/`, `/verzakking-woning/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-drachten/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-veendam/`, `/scheuren-in-gevel/`, `/scheefstand-woning/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/visuele-funderingsinspectie/`, `/gratis-funderingscheck/`, `/funderingsscan/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/kennisbank/grondwater-en-fundering/`, `/funderingsproblemen-klei/`, `/funderingsonderzoek-friesland/`, `/contact/`

</details>
<details><summary><code>/funderingsproblemen-klei/</code> – 28 contextuele interne links</summary>

`/`, `/funderingsproblemen/`, `/quickscan-fundering/`, `/funderingsscan-aanvragen/`, `/kennisbank/kleibodem/`, `/scheuren-in-gevel/`, `/verzakking-woning/`, `/fundering-op-staal/`, `/problemen-met-houten-palen/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/bodemdaling/`, `/funderingsonderzoek-harlingen/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-delfzijl/`, `/funderingsonderzoek-franeker/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/visuele-funderingsinspectie/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/gratis-funderingscheck/`, `/funderingsscan/`, `/prijzen/`, `/funderingsproblemen-veen/`, `/funderingsonderzoek-groningen/`, `/contact/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/werkgebied/</code> – 49 contextuele interne links</summary>

`/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/funderingsonderzoek-friesland/`, `/funderingsonderzoek-groningen/`, `/kennisbank/zetting/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/houten-paalfundering/`, `/fundering-op-staal/`, `/kennisbank/bodemdaling/`, `/funderingsproblemen-veen/`, `/funderingsproblemen-klei/`, `/funderingsscan-friesland/`, `/funderingsscan-groningen/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-harlingen/`, `/funderingsonderzoek-drachten/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-delfzijl/`, `/funderingsonderzoek-franeker/`, `/funderingsonderzoek-haren/`, `/funderingsonderzoek-veendam/`, `/funderingsonderzoek-winschoten/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/prijzen/`, `/gratis-funderingscheck/`, `/contact/`, `/funderingsonderzoek-achtkarspelen/`, `/funderingsonderzoek-dantumadiel/`, `/funderingsonderzoek-de-fryske-marren/`, `/funderingsonderzoek-noardeast-fryslan/`, `/funderingsonderzoek-ooststellingwerf/`, `/funderingsonderzoek-opsterland/`, `/funderingsonderzoek-tytsjerksteradiel/`, `/funderingsonderzoek-weststellingwerf/`, `/funderingsonderzoek-eemsdelta/`, `/funderingsonderzoek-het-hogeland/`, `/funderingsonderzoek-midden-groningen/`, `/funderingsonderzoek-pekela/`, `/funderingsonderzoek-stadskanaal/`, `/funderingsonderzoek-westerkwartier/`, `/funderingsonderzoek-westerwolde/`, `/quickscan-fundering/`

</details>
<details><summary><code>/funderingsonderzoek-friesland/</code> – 38 contextuele interne links</summary>

`/`, `/werkgebied/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/kennisbank/bodemdaling/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/funderingsproblemen-friesland/`, `/problemen-met-houten-palen/`, `/verzakking-woning/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/scheurpatronen/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/werkwijze/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-harlingen/`, `/funderingsonderzoek-drachten/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-franeker/`, `/funderingsscan-friesland/`, `/funderingsonderzoek-taxatie/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsscan-leeuwarden/`, `/funderingsonderzoek-achtkarspelen/`, `/funderingsonderzoek-dantumadiel/`, `/funderingsonderzoek-de-fryske-marren/`, `/funderingsonderzoek-noardeast-fryslan/`, `/funderingsonderzoek-ooststellingwerf/`, `/funderingsonderzoek-opsterland/`, `/funderingsonderzoek-tytsjerksteradiel/`, `/funderingsonderzoek-weststellingwerf/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/funderingsproblemen-veen/`, `/contact/`

Extern: <https://www.kcaf.nl/>

</details>
<details><summary><code>/funderingsscan-friesland/</code> – 20 contextuele interne links</summary>

`/`, `/werkgebied/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/kennisbank/bodemdaling/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/scheurpatronen/`, `/kennisbank/funderingsrisico-inschatting/`, `/funderingsscan/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`, `/kennisbank/heb-ik-een-funderingsscan-nodig/`, `/scheuren-in-gevel/`, `/prijzen/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/kennisbank/houten-paalfundering/`, `/funderingsonderzoek-friesland/`, `/kennisbank/wat-na-een-quickscan/`, `/contact/`

</details>
<details><summary><code>/funderingsonderzoek-groningen/</code> – 38 contextuele interne links</summary>

`/`, `/werkgebied/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/kennisbank/bodemdaling/`, `/funderingsproblemen-veen/`, `/funderingsproblemen-klei/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/zetting/`, `/problemen-met-houten-palen/`, `/fundering-op-staal/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/scheurpatronen/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/werkwijze/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-delfzijl/`, `/funderingsonderzoek-haren/`, `/funderingsonderzoek-veendam/`, `/funderingsonderzoek-winschoten/`, `/funderingsscan-groningen/`, `/kennisbank/funderingsproblemen-groningen/`, `/funderingsonderzoek-taxatie/`, `/funderingsonderzoek-eemsdelta/`, `/funderingsonderzoek-het-hogeland/`, `/funderingsonderzoek-midden-groningen/`, `/funderingsonderzoek-pekela/`, `/funderingsonderzoek-stadskanaal/`, `/funderingsonderzoek-westerkwartier/`, `/funderingsonderzoek-westerwolde/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/contact/`

Extern: <https://www.schadedoormijnbouw.nl/>, <https://www.kcaf.nl/>

</details>
<details><summary><code>/funderingsscan-groningen/</code> – 26 contextuele interne links</summary>

`/`, `/werkgebied/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/kennisbank/visuele-funderingsinspectie/`, `/scheuren-in-gevel/`, `/klemmende-deuren-en-ramen/`, `/gratis-funderingscheck/`, `/kennisbank/bodemdaling/`, `/kennisbank/scheurpatronen/`, `/funderingsscan/`, `/funderingsinspectie/`, `/kennisbank/fundering-op-staal/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-delfzijl/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-bij-verkoop/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/kennisbank/houten-paalfundering/`, `/funderingsonderzoek-groningen/`, `/werkwijze/`, `/quickscan-fundering/`, `/kennisbank/funderingsrapport-lezen/`, `/contact/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/funderingsonderzoek-leeuwarden/</code> – 23 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/zetting/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/scheurpatronen/`, `/kennisbank/archiefonderzoek-fundering/`, `/problemen-met-houten-palen/`, `/fundering-op-staal/`, `/scheuren-in-gevel/`, `/scheefstand-woning/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/prijzen/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsscan-leeuwarden/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`, `/contact/`

</details>
<details><summary><code>/funderingsonderzoek-sneek/</code> – 25 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/bodemdaling/`, `/funderingsproblemen-klei/`, `/funderingsproblemen-veen/`, `/kennisbank/scheurpatronen/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-harlingen/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/funderingsscan/`, `/werkwijze/`, `/kennisbank/funderingsrapport-lezen/`, `/gratis-funderingscheck/`, `/contact/`, `/quickscan-fundering/`, `/prijzen/`, `/kennisbank/grondwater-en-fundering/`

</details>
<details><summary><code>/funderingsonderzoek-harlingen/</code> – 25 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/bodemdaling/`, `/kennisbank/fundering-op-staal/`, `/funderingsproblemen-klei/`, `/klemmende-deuren-en-ramen/`, `/kennisbank/scheurpatronen/`, `/problemen-met-houten-palen/`, `/funderingsonderzoek-bij-aankoop/`, `/prijzen/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/funderingsonderzoek-franeker/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-sneek/`, `/contact/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`

</details>
<details><summary><code>/funderingsonderzoek-drachten/</code> – 28 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/zetting/`, `/funderingsproblemen-veen/`, `/kennisbank/veenbodem/`, `/kennisbank/fundering-op-staal/`, `/fundering-op-staal/`, `/verzakking-woning/`, `/klemmende-deuren-en-ramen/`, `/kennisbank/bodemdaling/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/funderingsscan/`, `/funderingsonderzoek-taxatie/`, `/funderingsonderzoek-bij-verkoop/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-sneek/`, `/contact/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`

</details>
<details><summary><code>/funderingsonderzoek-heerenveen/</code> – 26 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/bodemdaling/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/archiefonderzoek-fundering/`, `/problemen-met-houten-palen/`, `/fundering-op-staal/`, `/kennisbank/grondwater-en-fundering/`, `/funderingsproblemen-veen/`, `/funderingsonderzoek-bij-aankoop/`, `/scheuren-in-gevel/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/funderingsonderzoek-drachten/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-leeuwarden/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/contact/`

</details>
<details><summary><code>/funderingsonderzoek-groningen-stad/</code> – 26 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-groningen/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/houten-paalfundering/`, `/funderingsonderzoek-haren/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/archiefonderzoek-fundering/`, `/problemen-met-houten-palen/`, `/fundering-op-staal/`, `/scheuren-in-gevel/`, `/klemmende-deuren-en-ramen/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/bodemdaling/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-taxatie/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/funderingsrisico/`, `/contact/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/funderingsonderzoek-appingedam/</code> – 25 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-groningen/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/scheurpatronen/`, `/kennisbank/houten-paalfundering/`, `/fundering-op-staal/`, `/funderingsproblemen-klei/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-bij-verkoop/`, `/funderingsonderzoek-taxatie/`, `/scheuren-in-gevel/`, `/fase-1-funderingsonderzoek/`, `/funderingsscan/`, `/werkwijze/`, `/funderingsonderzoek-delfzijl/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-veendam/`, `/funderingsonderzoek-winschoten/`, `/contact/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/funderingsonderzoek-delfzijl/</code> – 26 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-groningen/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/funderingsonderzoek-bij-aankoop/`, `/gratis-funderingscheck/`, `/kennisbank/fundering-op-staal/`, `/funderingsproblemen-klei/`, `/kennisbank/kleibodem/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/ongelijke-zetting/`, `/scheefstand-woning/`, `/verzakking-woning/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/funderingsonderzoek-taxatie/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-winschoten/`, `/funderingsonderzoek-veendam/`, `/quickscan-fundering/`, `/prijzen/`, `/contact/`

Extern: <https://www.schadedoormijnbouw.nl/>, <https://www.kcaf.nl/>

</details>
<details><summary><code>/kennisbank/wat-is-een-funderingsscan/</code> – 19 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/scheurpatronen/`, `/kennisbank/houten-paalfundering/`, `/funderingsproblemen/`, `/kennisbank/bodemdaling/`, `/funderingsscan/`, `/fase-1-funderingsonderzoek/`, `/gratis-funderingscheck/`, `/prijzen/`, `/quickscan-fundering/`, `/kennisbank/wat-is-een-quickscan-fundering/`, `/kennisbank/wat-wordt-onderzocht/`, `/contact/`

</details>
<details><summary><code>/kennisbank/wat-is-een-quickscan-fundering/</code> – 16 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/funderingsscan/`, `/gratis-funderingscheck/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/quickscan-fundering/`, `/funderingsonderzoek-bij-aankoop/`, `/prijzen/`, `/kennisbank/wat-is-fase-0/`, `/kennisbank/wat-na-een-quickscan/`, `/contact/`

</details>
<details><summary><code>/kennisbank/wat-is-fase-0/</code> – 21 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/bodemdaling/`, `/kennisbank/scheurpatronen/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/wat-na-een-quickscan/`, `/kennisbank/wat-kost-fase-0/`, `/contact/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/verschil-fase-0-en-fase-1/`, `/kennisbank/wat-is-fase-1/`

</details>
<details><summary><code>/kennisbank/wat-is-fase-1/</code> – 22 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/scheurpatronen/`, `/funderingsmetingen/`, `/kennisbank/zetting/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/wanneer-fase-1/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/contact/`, `/funderingsscan/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`

</details>
<details><summary><code>/kennisbank/verschil-fase-0-en-fase-1/</code> – 21 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/scheurpatronen/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/contact/`, `/funderingsonderzoek-bij-aankoop/`, `/prijzen/`, `/funderingsscan/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`, `/kennisbank/wat-is-fase-0/`, `/kennisbank/wat-is-fase-1/`

</details>
<details><summary><code>/kennisbank/wat-kost-een-funderingsscan/</code> – 15 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/prijzen/`, `/kosten-funderingsonderzoek-berekenen/`, `/kennisbank/wat-kost-fase-0/`, `/fase-1-funderingsonderzoek/`, `/gratis-funderingscheck/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/kosten-funderingsherstel/`, `/contact/`

</details>
<details><summary><code>/kennisbank/wat-kost-fase-0/</code> – 19 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/wat-kost-een-funderingsscan/`, `/prijzen/`, `/kosten-funderingsonderzoek-berekenen/`, `/kennisbank/bodemdaling/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/scheurpatronen/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-0-funderingsonderzoek/`, `/gratis-funderingscheck/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/wat-is-fase-0/`, `/contact/`

</details>
<details><summary><code>/kennisbank/hoe-lang-duurt-funderingsonderzoek/</code> – 17 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/fase-0-funderingsonderzoek/`, `/werkwijze/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/wat-na-een-quickscan/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/funderingsscan-bij-aankoop/`, `/contact/`

</details>
<details><summary><code>/kennisbank/wat-wordt-onderzocht/</code> – 24 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/scheurpatronen/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/bodemdaling/`, `/scheuren-in-gevel/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/fase-1-funderingsonderzoek/`, `/funderingsmetingen/`, `/kennisbank/fundering-op-staal/`, `/gratis-funderingscheck/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/funderingsinspectie/`, `/kennisbank/funderingsrapport-lezen/`, `/contact/`

</details>
<details><summary><code>/kennisbank/wanneer-funderingsonderzoek/</code> – 21 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/bodemdaling/`, `/welke-stap-past-bij-mij/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-bij-verkoop/`, `/funderingsproblemen/`, `/werkgebied/`, `/gratis-funderingscheck/`, `/kennisbank/heb-ik-een-funderingsscan-nodig/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/contact/`, `/funderingsonderzoek-woning/`

</details>
<details><summary><code>/kennisbank/heb-ik-een-funderingsscan-nodig/</code> – 16 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/bodemdaling/`, `/gratis-funderingscheck/`, `/kennisbank/scheuren-in-woning/`, `/kennisbank/funderingsscan-bij-aankoop/`, `/funderingsscan/`, `/contact/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/kennisbank/wanneer-funderingsonderzoek/`

</details>
<details><summary><code>/kennisbank/funderingsscan-bij-aankoop/</code> – 18 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/scheurpatronen/`, `/funderingsscan/`, `/kennisbank/funderingsscan-en-taxatie/`, `/kennisbank/wat-wordt-onderzocht/`, `/funderingsonderzoek-bij-aankoop/`, `/prijzen/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/gratis-funderingscheck/`, `/kennisbank/funderingsscan-en-hypotheek/`, `/kennisbank/hoe-lang-duurt-funderingsonderzoek/`, `/contact/`

</details>
<details><summary><code>/kennisbank/funderingsscan-bij-verkoop/</code> – 18 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/funderingsonderzoek-bij-verkoop/`, `/kennisbank/funderingsrisico-inschatting/`, `/funderingsscan/`, `/kennisbank/wat-na-een-quickscan/`, `/kennisbank/archiefonderzoek-fundering/`, `/prijzen/`, `/contact/`, `/kennisbank/funderingsrapport-voor-verkoper/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/gratis-funderingscheck/`, `/kennisbank/funderingsrapport-lezen/`

</details>
<details><summary><code>/kennisbank/funderingsscan-en-taxatie/</code> – 19 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/funderingsrisicoklasse-uitgelegd/`, `/funderingsonderzoek-taxatie/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/funderingsscan-bij-aankoop/`, `/contact/`, `/kennisbank/funderingsscan-en-hypotheek/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/funderingsrisico/`

Extern: <https://www.nrvt.nl/>, <https://www.kcaf.nl/>

</details>
<details><summary><code>/kennisbank/funderingsscan-en-hypotheek/</code> – 18 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/funderingsscan-en-taxatie/`, `/funderingsonderzoek-taxatie/`, `/kennisbank/hoe-lang-duurt-funderingsonderzoek/`, `/kennisbank/kosten-funderingsherstel/`, `/kennisbank/wat-kost-een-funderingsscan/`, `/contact/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/funderingsonderzoek-bij-aankoop/`

</details>
<details><summary><code>/kennisbank/funderingsrapport-lezen/</code> – 19 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/bodemdaling/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/funderingsrapport/`, `/kennisbank/wat-na-een-quickscan/`, `/contact/`, `/fase-1-funderingsonderzoek/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/wat-wordt-onderzocht/`

</details>
<details><summary><code>/kennisbank/wat-na-een-quickscan/</code> – 18 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/contact/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/scheurpatronen/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/wanneer-fase-1/`, `/kennisbank/funderingsrapport-lezen/`, `/quickscan-fundering/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`

</details>
<details><summary><code>/kennisbank/wanneer-fase-1/</code> – 27 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/fase-0-funderingsonderzoek/`, `/scheefstand-woning/`, `/verzakking-woning/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/veenbodem/`, `/problemen-met-houten-palen/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/scheurpatronen/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/wat-na-een-quickscan/`, `/kennisbank/verschil-fase-0-en-fase-1/`, `/prijzen/`, `/contact/`, `/funderingsscan/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`, `/kennisbank/wat-is-fase-1/`, `/funderingsmetingen/`

</details>
<details><summary><code>/kennisbank/scheuren-in-woning/</code> – 19 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/funderingsproblemen/`, `/funderingsinspectie/`, `/quickscan-fundering/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/scheurpatronen/`, `/fase-0-funderingsonderzoek/`, `/gratis-funderingscheck/`, `/contact/`, `/kennisbank/scheuren-in-gevel/`, `/funderingsscan/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/scheuren-in-gevel/`, `/klemmende-deuren-en-ramen/`

</details>
<details><summary><code>/kennisbank/scheuren-in-gevel/</code> – 17 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/scheuren-in-gevel/`, `/kennisbank/scheuren-in-woning/`, `/funderingsscan/`, `/kennisbank/scheurpatronen/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/lintvoegwaterpassing/`, `/prijzen/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/gratis-funderingscheck/`, `/contact/`, `/kennisbank/scheuren-in-metselwerk/`

</details>
<details><summary><code>/kennisbank/scheuren-in-metselwerk/</code> – 17 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/funderingsmetingen/`, `/kennisbank/lintvoegwaterpassing/`, `/quickscan-fundering/`, `/kennisbank/scheurpatronen/`, `/scheuren-in-gevel/`, `/contact/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/scheuren-in-gevel/`

</details>
<details><summary><code>/kennisbank/verzakking-woning/</code> – 18 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/zetting/`, `/verzakking-woning/`, `/kennisbank/funderingsrapport-lezen/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/visuele-funderingsinspectie/`, `/fase-1-funderingsonderzoek/`, `/gratis-funderingscheck/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/kennisbank/scheefstand/`, `/contact/`

</details>
<details><summary><code>/kennisbank/scheefstand/</code> – 20 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/scheefstand-woning/`, `/kennisbank/loodmeting/`, `/kennisbank/lintvoegwaterpassing/`, `/funderingsmetingen/`, `/kennisbank/vloerveldwaterpassing/`, `/prijzen/`, `/quickscan-fundering/`, `/kennisbank/verzakking-woning/`, `/contact/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/gratis-funderingscheck/`, `/kennisbank/klemmende-deuren/`

</details>
<details><summary><code>/kennisbank/klemmende-deuren/</code> – 17 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/klemmende-deuren-en-ramen/`, `/quickscan-fundering/`, `/kennisbank/scheurpatronen/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/scheefstand/`, `/gratis-funderingscheck/`, `/funderingsscan/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/kennisbank/scheuren-in-woning/`, `/funderingsinspectie/`, `/contact/`

</details>
<details><summary><code>/kennisbank/kruipruimte-inspectie/</code> – 19 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/funderingsrapport/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/prijzen/`, `/contact/`, `/funderingsscan/`, `/fase-1-funderingsonderzoek/`, `/gratis-funderingscheck/`, `/funderingsinspectie/`, `/kennisbank/wat-wordt-onderzocht/`, `/kennisbank/grondwater-en-fundering/`

</details>
<details><summary><code>/kennisbank/houten-paalfundering/</code> – 18 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/paalrot/`, `/kennisbank/grondwater-en-fundering/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan/`, `/kennisbank/visuele-funderingsinspectie/`, `/problemen-met-houten-palen/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/fundering-op-staal/`, `/contact/`

</details>
<details><summary><code>/kennisbank/fundering-op-staal/</code> – 18 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/quickscan-fundering/`, `/kennisbank/kruipruimte-inspectie/`, `/kennisbank/kleibodem/`, `/kennisbank/veenbodem/`, `/fundering-op-staal/`, `/funderingsscan/`, `/contact/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/houten-paalfundering/`

</details>
<details><summary><code>/kennisbank/veenbodem/</code> – 19 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/houten-paalfundering/`, `/funderingsproblemen-veen/`, `/kennisbank/funderingsproblemen-friesland/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/bodemdaling/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/kleibodem/`, `/kennisbank/grondwater-en-fundering/`, `/contact/`

</details>
<details><summary><code>/kennisbank/kleibodem/</code> – 19 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/houten-paalfundering/`, `/funderingsproblemen-klei/`, `/kennisbank/funderingsproblemen-groningen/`, `/quickscan-fundering/`, `/kennisbank/veenbodem/`, `/prijzen/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/gratis-funderingscheck/`, `/kennisbank/grondwater-en-fundering/`, `/contact/`

</details>
<details><summary><code>/kennisbank/bodemdaling/</code> – 18 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/veenbodem/`, `/kennisbank/funderingsproblemen-groningen/`, `/kennisbank/houten-paalfundering/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/grondwater-en-fundering/`, `/funderingsscan/`, `/contact/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/funderingsproblemen-veen/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/kennisbank/grondwater-en-fundering/</code> – 18 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/paalrot/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/veenbodem/`, `/kennisbank/kleibodem/`, `/kennisbank/bodemdaling/`, `/fase-0-funderingsonderzoek/`, `/problemen-met-houten-palen/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/contact/`

</details>
<details><summary><code>/kennisbank/funderingsrisico/</code> – 24 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/bodemdaling/`, `/kennisbank/grondwater-en-fundering/`, `/kennisbank/funderingsscan-en-taxatie/`, `/kennisbank/funderingsrapport-lezen/`, `/funderingsscan/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-0-funderingsonderzoek/`, `/funderingsonderzoek-taxatie/`, `/contact/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/heb-ik-een-funderingsscan-nodig/`, `/kennisbank/funderingsscan-en-hypotheek/`

Extern: <https://www.nrvt.nl/>, <https://www.kcaf.nl/>

</details>
<details><summary><code>/kennisbank/funderingsherstel/</code> – 21 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/quickscan-fundering/`, `/kennisbank/kosten-funderingsherstel/`, `/funderingsrapport/`, `/funderingsscan/`, `/prijzen/`, `/gratis-funderingscheck/`, `/funderingsproblemen/`, `/kennisbank/wat-na-een-quickscan/`, `/contact/`

</details>
<details><summary><code>/kennisbank/kosten-funderingsherstel/</code> – 14 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/funderingsscan/`, `/kennisbank/funderingsherstel/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`, `/kennisbank/funderingsscan-bij-aankoop/`, `/contact/`

Extern: <https://www.kcaf.nl/>, <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/kennisbank/funderingsproblemen-friesland/</code> – 28 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/kleibodem/`, `/kennisbank/veenbodem/`, `/kennisbank/bodemdaling/`, `/kennisbank/grondwater-en-fundering/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-harlingen/`, `/funderingsonderzoek-drachten/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-franeker/`, `/funderingsonderzoek-friesland/`, `/funderingsscan-friesland/`, `/werkgebied/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/funderingsproblemen-veen/`, `/kennisbank/funderingsproblemen-groningen/`, `/contact/`

</details>
<details><summary><code>/kennisbank/funderingsproblemen-groningen/</code> – 25 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/kleibodem/`, `/kennisbank/veenbodem/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-delfzijl/`, `/funderingsonderzoek-haren/`, `/funderingsonderzoek-veendam/`, `/funderingsonderzoek-winschoten/`, `/funderingsonderzoek-groningen/`, `/funderingsscan-groningen/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/werkgebied/`, `/funderingsproblemen-klei/`, `/kennisbank/funderingsproblemen-friesland/`, `/contact/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/kennisbank/lintvoegwaterpassing/</code> – 38 contextuele interne links</summary>

`/`, `/kennisbank/`, `/kennisbank/ongelijke-zetting/`, `/fase-1-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/funderingsmetingen/`, `/kennisbank/zetting/`, `/kennisbank/scheurpatronen/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/funderingsrisico/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/veenbodem/`, `/kennisbank/kleibodem/`, `/kennisbank/bodemdaling/`, `/kennisbank/grondwater-en-fundering/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-drachten/`, `/funderingsonderzoek-harlingen/`, `/funderingsonderzoek-friesland/`, `/kennisbank/funderingsproblemen-friesland/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/scheefstand/`, `/kennisbank/verschil-fase-0-en-fase-1/`, `/kennisbank/houten-paalfundering/`, `/prijzen/`, `/kennisbank/hoogtemeting/`, `/kennisbank/zettingsmeting/`, `/contact/`, `/funderingsscan/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`, `/verzakking-woning/`

</details>
<details><summary><code>/kennisbank/loodmeting/</code> – 26 contextuele interne links</summary>

`/`, `/kennisbank/`, `/kennisbank/scheefstand/`, `/fase-1-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/scheefstand-woning/`, `/funderingsmetingen/`, `/kennisbank/scheefstandsmeting/`, `/kennisbank/wat-is-funderingsonderzoek/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/fundering-op-staal/`, `/verzakking-woning/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/helling-in-vloer/`, `/kennisbank/scheurpatronen/`, `/kennisbank/funderingsrapport-lezen/`, `/fase-0-funderingsonderzoek/`, `/contact/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`

</details>
<details><summary><code>/kennisbank/vloerveldwaterpassing/</code> – 24 contextuele interne links</summary>

`/`, `/kennisbank/`, `/fase-1-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/lintvoegwaterpassing/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/helling-in-vloer/`, `/funderingsmetingen/`, `/kennisbank/hoogtemeting/`, `/verzakking-woning/`, `/kennisbank/zetting/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/zettingsmeting/`, `/kennisbank/loodmeting/`, `/quickscan-fundering/`, `/kennisbank/funderingsrapport-lezen/`, `/kennisbank/scheurpatronen/`, `/contact/`, `/funderingsscan/`, `/prijzen/`, `/gratis-funderingscheck/`

</details>
<details><summary><code>/kennisbank/scheurpatronen/</code> – 27 contextuele interne links</summary>

`/`, `/kennisbank/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/visuele-funderingsinspectie/`, `/scheuren-in-gevel/`, `/kennisbank/scheuren-in-metselwerk/`, `/funderingsmetingen/`, `/kennisbank/monitoring-scheuren/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/scheuren-bij-aanbouw/`, `/quickscan-fundering/`, `/kennisbank/scheuren-boven-kozijnen/`, `/funderingsproblemen/`, `/kennisbank/zetting/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/scheurmeting/`, `/verzakking-woning/`, `/fase-1-funderingsonderzoek/`, `/funderingsscan/`, `/contact/`, `/prijzen/`, `/gratis-funderingscheck/`

</details>
<details><summary><code>/kennisbank/scheefstandsmeting/</code> – 22 contextuele interne links</summary>

`/`, `/kennisbank/`, `/kennisbank/loodmeting/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/scheefstand/`, `/kennisbank/begrippenlijst/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/scheurpatronen/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/zettingsmeting/`, `/fase-0-funderingsonderzoek/`, `/funderingsmetingen/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/scheefstand-woning/`, `/funderingsscan/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`, `/contact/`

</details>
<details><summary><code>/kennisbank/hoogtemeting/</code> – 19 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/maaiveldhoogte/`, `/kennisbank/bodemdaling/`, `/kennisbank/zettingsmeting/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/funderingsmetingen/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/helling-in-vloer/`, `/contact/`

</details>
<details><summary><code>/kennisbank/zettingsmeting/</code> – 20 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/zetting/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/monitoring-scheuren/`, `/kennisbank/hoogtemeting/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/funderingsmetingen/`, `/kennisbank/veenbodem/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/contact/`

</details>
<details><summary><code>/kennisbank/scheurmeting/</code> – 18 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/scheurpatronen/`, `/kennisbank/monitoring-scheuren/`, `/kennisbank/scheuren-boven-kozijnen/`, `/kennisbank/scheuren-bij-aanbouw/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/funderingsmetingen/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/scheuren-in-gevel/`, `/contact/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/kennisbank/monitoring-scheuren/</code> – 16 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/scheurmeting/`, `/kennisbank/zettingsmeting/`, `/fase-0-funderingsonderzoek/`, `/scheuren-in-gevel/`, `/gratis-funderingscheck/`, `/contact/`, `/fase-1-funderingsonderzoek/`, `/funderingsmetingen/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`

</details>
<details><summary><code>/kennisbank/maaiveldhoogte/</code> – 19 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/hoogtemeting/`, `/kennisbank/bodemdaling/`, `/kennisbank/veenbodem/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/grondwatermeting/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/funderingsmetingen/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/contact/`

</details>
<details><summary><code>/kennisbank/grondwatermeting/</code> – 20 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/grondwater-en-fundering/`, `/kennisbank/peilverschillen/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/paalrot/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/bodemdaling/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/funderingsmetingen/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/contact/`

</details>
<details><summary><code>/kennisbank/wat-is-funderingsonderzoek/</code> – 28 contextuele interne links</summary>

`/`, `/kennisbank/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/verschil-fase-0-en-fase-1/`, `/kennisbank/bodemdaling/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/scheurpatronen/`, `/funderingsmetingen/`, `/kennisbank/wanneer-funderingsonderzoek/`, `/funderingsonderzoek-taxatie/`, `/gratis-funderingscheck/`, `/contact/`, `/kennisbank/houten-paalfundering/`, `/funderingsscan/`, `/prijzen/`, `/kennisbank/wat-is-een-funderingsscan/`, `/kennisbank/funderingsherstel/`

</details>
<details><summary><code>/kennisbank/archiefonderzoek-fundering/</code> – 27 contextuele interne links</summary>

`/`, `/kennisbank/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/scheuren-bij-aanbouw/`, `/kennisbank/veenbodem/`, `/kennisbank/kleibodem/`, `/kennisbank/zandbodem/`, `/kennisbank/paalrot/`, `/kennisbank/grondwatermeting/`, `/kennisbank/grondwater-en-fundering/`, `/kennisbank/bodemdaling/`, `/kennisbank/maaiveldhoogte/`, `/kennisbank/funderingsrisico-inschatting/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/funderingsrapport-lezen/`, `/kennisbank/funderingsproblemen-friesland/`, `/contact/`

</details>
<details><summary><code>/kennisbank/visuele-funderingsinspectie/</code> – 28 contextuele interne links</summary>

`/`, `/kennisbank/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/funderingsinspectie/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/klemmende-deuren/`, `/kennisbank/helling-in-vloer/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/scheuren-boven-kozijnen/`, `/kennisbank/kruipruimte-inspectie/`, `/kennisbank/scheurpatronen/`, `/kennisbank/monitoring-scheuren/`, `/kennisbank/loodmeting/`, `/kennisbank/scheefstand/`, `/kennisbank/zetting/`, `/kennisbank/ongelijke-zetting/`, `/fase-1-funderingsonderzoek/`, `/gratis-funderingscheck/`, `/kennisbank/funderingsrisico-inschatting/`, `/funderingsrapport/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/contact/`, `/kennisbank/scheuren-in-woning/`

</details>
<details><summary><code>/kennisbank/funderingsrisico-inschatting/</code> – 29 contextuele interne links</summary>

`/`, `/kennisbank/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico/`, `/kennisbank/bodemdaling/`, `/kennisbank/scheurpatronen/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/veenbodem/`, `/kennisbank/funderingsscan-en-taxatie/`, `/kennisbank/monitoring-scheuren/`, `/kennisbank/lintvoegwaterpassing/`, `/funderingsrapport/`, `/kennisbank/funderingsrapport-lezen/`, `/kennisbank/wat-na-een-quickscan/`, `/fase-1-funderingsonderzoek/`, `/contact/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/wat-is-funderingsonderzoek/`, `/kennisbank/funderingsherstel/`, `/kennisbank/kosten-funderingsherstel/`

Extern: <https://www.kcaf.nl/>

</details>
<details><summary><code>/kennisbank/zetting/</code> – 27 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/paalfundering/`, `/kennisbank/scheefstand/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/verzakking-woning/`, `/funderingsproblemen/`, `/kennisbank/veenbodem/`, `/kennisbank/kleibodem/`, `/kennisbank/zandbodem/`, `/kennisbank/grondwater-en-fundering/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/hoogtemeting/`, `/kennisbank/zettingsmeting/`, `/funderingsscan/`, `/contact/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/monitoring-scheuren/`

</details>
<details><summary><code>/kennisbank/ongelijke-zetting/</code> – 26 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/zetting/`, `/kennisbank/veenbodem/`, `/kennisbank/kleibodem/`, `/kennisbank/scheuren-bij-aanbouw/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/grondwater-en-fundering/`, `/kennisbank/scheurpatronen/`, `/kennisbank/scheefstand/`, `/kennisbank/klemmende-deuren/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/vloerveldwaterpassing/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/contact/`, `/fase-1-funderingsonderzoek/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/scheefstand-woning/`

</details>
<details><summary><code>/kennisbank/paalfundering/</code> – 21 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/zetting/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/kruipruimte-inspectie/`, `/problemen-met-houten-palen/`, `/kennisbank/paalrot/`, `/funderingsscan/`, `/contact/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`

</details>
<details><summary><code>/kennisbank/paalrot/</code> – 25 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/begrippenlijst/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/grondwater-en-fundering/`, `/kennisbank/peilverschillen/`, `/kennisbank/bodemdaling/`, `/kennisbank/grondwatermeting/`, `/kennisbank/scheefstand/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/lintvoegwaterpassing/`, `/problemen-met-houten-palen/`, `/funderingsscan/`, `/contact/`, `/fase-0-funderingsonderzoek/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/kosten-funderingsherstel/`, `/kennisbank/paalfundering/`

</details>
<details><summary><code>/kennisbank/zandbodem/</code> – 22 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/zetting/`, `/kennisbank/bodemdaling/`, `/kennisbank/veenbodem/`, `/kennisbank/kleibodem/`, `/kennisbank/scheuren-bij-aanbouw/`, `/kennisbank/ongelijke-zetting/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-haren/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/contact/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/paalfundering/`, `/kennisbank/grondwater-en-fundering/`

</details>
<details><summary><code>/kennisbank/peilverschillen/</code> – 24 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/grondwater-en-fundering/`, `/kennisbank/grondwatermeting/`, `/kennisbank/bodemdaling/`, `/kennisbank/paalrot/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/veenbodem/`, `/kennisbank/kleibodem/`, `/quickscan-fundering/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/contact/`, `/funderingsscan/`, `/prijzen/`, `/gratis-funderingscheck/`, `/funderingsproblemen-veen/`

</details>
<details><summary><code>/kennisbank/scheuren-boven-kozijnen/</code> – 19 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/zetting/`, `/kennisbank/scheuren-in-metselwerk/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/scheurpatronen/`, `/kennisbank/monitoring-scheuren/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/quickscan-fundering/`, `/contact/`, `/funderingsscan/`, `/prijzen/`, `/gratis-funderingscheck/`, `/scheuren-in-gevel/`, `/kennisbank/klemmende-ramen/`

</details>
<details><summary><code>/kennisbank/scheuren-bij-aanbouw/</code> – 23 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/zetting/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/bodemdaling/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/scheuren-in-woning/`, `/kennisbank/helling-in-vloer/`, `/quickscan-fundering/`, `/kennisbank/scheurpatronen/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/funderingsonderzoek-bij-aankoop/`, `/contact/`, `/funderingsscan/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/scheuren-in-metselwerk/`, `/verzakking-woning/`

</details>
<details><summary><code>/kennisbank/klemmende-ramen/</code> – 19 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/klemmende-deuren/`, `/klemmende-deuren-en-ramen/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/scheuren-boven-kozijnen/`, `/kennisbank/helling-in-vloer/`, `/kennisbank/scheurpatronen/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/quickscan-fundering/`, `/contact/`, `/funderingsscan/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/scheefstand/`

</details>
<details><summary><code>/kennisbank/helling-in-vloer/</code> – 20 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/zetting/`, `/kennisbank/kruipruimte-inspectie/`, `/kennisbank/verzakking-woning/`, `/kennisbank/scheefstand/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-0-funderingsonderzoek/`, `/quickscan-fundering/`, `/contact/`, `/funderingsscan/`, `/prijzen/`, `/gratis-funderingscheck/`, `/verzakking-woning/`

</details>
<details><summary><code>/kennisbank/funderingsonderzoek-voor-bod/</code> – 19 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/quickscan-fundering/`, `/kennisbank/funderingsrisico-bij-aankoop/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/archiefonderzoek-fundering/`, `/gratis-funderingscheck/`, `/kennisbank/funderingsrapport-lezen/`, `/funderingsonderzoek-bij-aankoop/`, `/kennisbank/funderingsscan-bij-aankoop/`, `/fase-0-funderingsonderzoek-aankoop/`, `/prijzen/`, `/contact/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`

Extern: <https://www.kcaf.nl/>

</details>
<details><summary><code>/kennisbank/funderingsrisico-bij-aankoop/</code> – 26 contextuele interne links</summary>

`/`, `/kennisbank/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/bodemdaling/`, `/kennisbank/funderingsrisico/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/zetting/`, `/kennisbank/ongelijke-zetting/`, `/funderingsproblemen/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/veenbodem/`, `/kennisbank/kleibodem/`, `/funderingsonderzoek-taxatie/`, `/kennisbank/funderingsonderzoek-voor-bod/`, `/kennisbank/visuele-funderingsinspectie/`, `/fase-0-funderingsonderzoek-aankoop/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/contact/`

</details>
<details><summary><code>/kennisbank/funderingsrapport-voor-verkoper/</code> – 16 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/kennisbank/funderingsscan-bij-verkoop/`, `/funderingsonderzoek-bij-verkoop/`, `/kennisbank/funderingsrapport-lezen/`, `/fase-1-funderingsonderzoek/`, `/contact/`, `/prijzen/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/gratis-funderingscheck/`, `/funderingsrapport/`

</details>
<details><summary><code>/kennisbank/kosten-fase-1/</code> – 22 contextuele interne links</summary>

`/`, `/kennisbank/`, `/funderingsscan-aanvragen/`, `/over-ons/`, `/bronnen-en-richtlijnen/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/scheurpatronen/`, `/funderingsmetingen/`, `/kennisbank/loodmeting/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/verschil-fase-0-en-fase-1/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/kosten-funderingsherstel/`, `/funderingsscan/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`, `/kennisbank/wat-kost-een-funderingsscan/`, `/kennisbank/wanneer-fase-1/`, `/contact/`

</details>
<details><summary><code>/fase-0-funderingsonderzoek-aankoop/</code> – 33 contextuele interne links</summary>

`/`, `/funderingsonderzoek-woning/`, `/funderingsscan-aanvragen/`, `/fase-0-funderingsonderzoek/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-drachten/`, `/funderingsonderzoek-franeker/`, `/funderingsonderzoek-haren/`, `/werkgebied/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/bodemdaling/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/scheurpatronen/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/wat-wordt-onderzocht/`, `/funderingsrapport/`, `/kennisbank/funderingsonderzoek-voor-bod/`, `/kennisbank/wat-na-een-quickscan/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/vloerveldwaterpassing/`, `/fase-1-funderingsonderzoek/`, `/funderingsonderzoek-taxatie/`, `/kennisbank/funderingsscan-en-hypotheek/`, `/bronnen-en-richtlijnen/`, `/prijzen/`, `/kennisbank/wat-kost-fase-0/`, `/contact/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsscan/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/funderingsonderzoek-franeker/</code> – 24 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/kleibodem/`, `/funderingsproblemen-klei/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/archiefonderzoek-fundering/`, `/scheuren-in-gevel/`, `/kennisbank/bodemdaling/`, `/fase-0-funderingsonderzoek/`, `/werkwijze/`, `/kennisbank/lintvoegwaterpassing/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/funderingsonderzoek-harlingen/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-sneek/`, `/contact/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`

</details>
<details><summary><code>/funderingsonderzoek-haren/</code> – 26 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-groningen/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/bodemdaling/`, `/kennisbank/zandbodem/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/zetting/`, `/kennisbank/scheuren-bij-aanbouw/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/kruipruimte-inspectie/`, `/funderingsonderzoek-groningen-stad/`, `/kennisbank/funderingsrisico-inschatting/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-bij-verkoop/`, `/kennisbank/visuele-funderingsinspectie/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/prijzen/`, `/contact/`, `/funderingsonderzoek-veendam/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/funderingsonderzoek-veendam/</code> – 27 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-groningen/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/veenbodem/`, `/kennisbank/zandbodem/`, `/kennisbank/bodemdaling/`, `/funderingsproblemen-veen/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/paalrot/`, `/kennisbank/grondwater-en-fundering/`, `/verzakking-woning/`, `/kennisbank/scheurpatronen/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/prijzen/`, `/funderingsonderzoek-winschoten/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-haren/`, `/contact/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`, `/funderingsonderzoek-bij-aankoop/`

</details>
<details><summary><code>/funderingsonderzoek-winschoten/</code> – 26 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-groningen/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/kleibodem/`, `/funderingsproblemen-klei/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/monitoring-scheuren/`, `/kennisbank/scheurpatronen/`, `/funderingsonderzoek-taxatie/`, `/kennisbank/bodemdaling/`, `/kennisbank/lintvoegwaterpassing/`, `/fase-0-funderingsonderzoek/`, `/werkwijze/`, `/prijzen/`, `/funderingsonderzoek-veendam/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-delfzijl/`, `/contact/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/gratis-funderingscheck/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/funderingsscan-leeuwarden/</code> – 20 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/funderingsscan-aanvragen/`, `/kennisbank/bodemdaling/`, `/kennisbank/scheurpatronen/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-leeuwarden/`, `/kennisbank/wat-na-een-quickscan/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/lintvoegwaterpassing/`, `/prijzen/`, `/contact/`, `/werkwijze/`, `/funderingsscan-friesland/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`

</details>
<details><summary><code>/kennisbank/begrippenlijst/</code> – 36 contextuele interne links</summary>

`/`, `/kennisbank/`, `/kennisbank/bodemdaling/`, `/kennisbank/wat-is-fase-0/`, `/kennisbank/wat-is-fase-1/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/funderingsherstel/`, `/kennisbank/wat-is-funderingsonderzoek/`, `/kennisbank/funderingsscan-en-taxatie/`, `/kennisbank/funderingsrisico/`, `/kennisbank/wat-is-een-funderingsscan/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/wat-na-een-quickscan/`, `/funderingsonderzoek-taxatie/`, `/kennisbank/kleibodem/`, `/kennisbank/kruipruimte-inspectie/`, `/kennisbank/scheuren-boven-kozijnen/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/maaiveldhoogte/`, `/kennisbank/monitoring-scheuren/`, `/kennisbank/hoogtemeting/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/paalfundering/`, `/kennisbank/paalrot/`, `/kennisbank/grondwatermeting/`, `/kennisbank/wat-is-een-quickscan-fundering/`, `/kennisbank/scheefstand/`, `/kennisbank/scheurpatronen/`, `/kennisbank/veenbodem/`, `/kennisbank/verzakking-woning/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/zetting/`, `/funderingsscan-aanvragen/`, `/gratis-funderingscheck/`, `/contact/`

</details>
<details><summary><code>/funderingsonderzoek-achtkarspelen/</code> – 20 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/zandbodem/`, `/kennisbank/veenbodem/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-taxatie/`, `/werkwijze/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/funderingsonderzoek-dantumadiel/`, `/contact/`

</details>
<details><summary><code>/funderingsonderzoek-dantumadiel/</code> – 21 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/quickscan-fundering/`, `/funderingsscan-aanvragen/`, `/funderingsonderzoek-bij-aankoop/`, `/kennisbank/bodemdaling/`, `/kennisbank/veenbodem/`, `/kennisbank/kleibodem/`, `/kennisbank/houten-paalfundering/`, `/funderingsonderzoek-achtkarspelen/`, `/funderingsonderzoek-noardeast-fryslan/`, `/kennisbank/fundering-op-staal/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/funderingsscan/`, `/prijzen/`, `/gratis-funderingscheck/`, `/funderingsonderzoek-taxatie/`, `/contact/`

</details>
<details><summary><code>/funderingsonderzoek-de-fryske-marren/</code> – 21 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/veenbodem/`, `/kennisbank/bodemdaling/`, `/kennisbank/kleibodem/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-bij-aankoop/`, `/kennisbank/visuele-funderingsinspectie/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/gratis-funderingscheck/`, `/contact/`, `/quickscan-fundering/`, `/prijzen/`, `/kennisbank/scheuren-in-gevel/`

</details>
<details><summary><code>/funderingsonderzoek-noardeast-fryslan/</code> – 23 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/zetting/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/kleibodem/`, `/funderingsproblemen-klei/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/quickscan-fundering/`, `/scheuren-in-gevel/`, `/kennisbank/scheurpatronen/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/funderingsherstel/`, `/funderingsonderzoek-dantumadiel/`, `/contact/`

</details>
<details><summary><code>/funderingsonderzoek-ooststellingwerf/</code> – 23 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/zandbodem/`, `/kennisbank/veenbodem/`, `/kennisbank/ongelijke-zetting/`, `/funderingsonderzoek-weststellingwerf/`, `/funderingsonderzoek-opsterland/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/funderingsonderzoek-bij-aankoop/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/scheurpatronen/`, `/werkwijze/`, `/contact/`, `/prijzen/`, `/quickscan-fundering/`, `/gratis-funderingscheck/`, `/kennisbank/funderingsrapport-lezen/`

</details>
<details><summary><code>/funderingsonderzoek-opsterland/</code> – 24 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/bodemdaling/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/zetting/`, `/kennisbank/scheurpatronen/`, `/kennisbank/zandbodem/`, `/kennisbank/veenbodem/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/houten-paalfundering/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-drachten/`, `/funderingsonderzoek-ooststellingwerf/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/contact/`

</details>
<details><summary><code>/funderingsonderzoek-tytsjerksteradiel/</code> – 25 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/quickscan-fundering/`, `/funderingsscan-aanvragen/`, `/funderingsonderzoek-leeuwarden/`, `/kennisbank/bodemdaling/`, `/kennisbank/zetting/`, `/kennisbank/zandbodem/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/veenbodem/`, `/kennisbank/kleibodem/`, `/gratis-funderingscheck/`, `/scheuren-in-gevel/`, `/kennisbank/scheurpatronen/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/archiefonderzoek-fundering/`, `/prijzen/`, `/funderingsscan/`, `/funderingsonderzoek-taxatie/`, `/funderingsonderzoek-dantumadiel/`, `/contact/`

</details>
<details><summary><code>/funderingsonderzoek-weststellingwerf/</code> – 24 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-friesland/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan-aanvragen/`, `/kennisbank/zetting/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/zandbodem/`, `/kennisbank/veenbodem/`, `/funderingsonderzoek-ooststellingwerf/`, `/kennisbank/fundering-op-staal/`, `/funderingsonderzoek-bij-verkoop/`, `/kennisbank/bodemdaling/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/vloerveldwaterpassing/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/funderingsherstel/`, `/contact/`

</details>
<details><summary><code>/funderingsonderzoek-eemsdelta/</code> – 26 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-groningen/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-delfzijl/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/kleibodem/`, `/funderingsproblemen-klei/`, `/kennisbank/visuele-funderingsinspectie/`, `/kennisbank/funderingsrisico-inschatting/`, `/kennisbank/archiefonderzoek-fundering/`, `/funderingsonderzoek-taxatie/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/kruipruimte-inspectie/`, `/kennisbank/funderingsproblemen-groningen/`, `/funderingsonderzoek-het-hogeland/`, `/contact/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/funderingsonderzoek-het-hogeland/</code> – 23 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-groningen/`, `/quickscan-fundering/`, `/funderingsscan-aanvragen/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/zetting/`, `/kennisbank/kleibodem/`, `/funderingsproblemen-klei/`, `/funderingsonderzoek-eemsdelta/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/bodemdaling/`, `/kennisbank/scheurpatronen/`, `/kennisbank/funderingsrisico-inschatting/`, `/fase-1-funderingsonderzoek/`, `/fase-0-funderingsonderzoek/`, `/werkwijze/`, `/funderingsscan/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/scheuren-in-gevel/`, `/contact/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/funderingsonderzoek-midden-groningen/</code> – 25 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-groningen/`, `/funderingsscan/`, `/funderingsscan-aanvragen/`, `/kennisbank/bodemdaling/`, `/kennisbank/zetting/`, `/kennisbank/ongelijke-zetting/`, `/kennisbank/veenbodem/`, `/kennisbank/kleibodem/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/archiefonderzoek-fundering/`, `/fundering-op-staal/`, `/problemen-met-houten-palen/`, `/funderingsonderzoek-bij-aankoop/`, `/funderingsonderzoek-taxatie/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/funderingsonderzoek-veendam/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/funderingsscan-groningen/`, `/contact/`

Extern: <https://www.schadedoormijnbouw.nl/>

</details>
<details><summary><code>/funderingsonderzoek-pekela/</code> – 26 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-groningen/`, `/funderingsscan-aanvragen/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/veenbodem/`, `/kennisbank/zandbodem/`, `/kennisbank/bodemdaling/`, `/kennisbank/ongelijke-zetting/`, `/scheuren-in-gevel/`, `/kennisbank/scheuren-bij-aanbouw/`, `/kennisbank/monitoring-scheuren/`, `/funderingsonderzoek-bij-verkoop/`, `/gratis-funderingscheck/`, `/kennisbank/scheurpatronen/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/funderingsonderzoek-veendam/`, `/funderingsonderzoek-winschoten/`, `/funderingsonderzoek-stadskanaal/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/funderingsproblemen-veen/`, `/contact/`

</details>
<details><summary><code>/funderingsonderzoek-stadskanaal/</code> – 31 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-groningen/`, `/funderingsscan-aanvragen/`, `/funderingsonderzoek-taxatie/`, `/funderingsonderzoek-bij-aankoop/`, `/kennisbank/funderingsscan-en-hypotheek/`, `/kennisbank/bodemdaling/`, `/kennisbank/ongelijke-zetting/`, `/funderingsproblemen-veen/`, `/kennisbank/veenbodem/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/zetting/`, `/kennisbank/houten-paalfundering/`, `/fundering-op-staal/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/kennisbank/scheurpatronen/`, `/funderingsmetingen/`, `/kennisbank/lintvoegwaterpassing/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/funderingsonderzoek-pekela/`, `/funderingsonderzoek-westerwolde/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/funderingsscan-bij-aankoop/`, `/contact/`

Extern: <https://www.kcaf.nl/>

</details>
<details><summary><code>/funderingsonderzoek-westerkwartier/</code> – 24 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-groningen/`, `/funderingsscan-aanvragen/`, `/kennisbank/bodemdaling/`, `/kennisbank/kleibodem/`, `/kennisbank/zandbodem/`, `/kennisbank/veenbodem/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/funderingsrisico-inschatting/`, `/problemen-met-houten-palen/`, `/funderingsproblemen-klei/`, `/gratis-funderingscheck/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/funderingsrapport/`, `/funderingsscan-groningen/`, `/contact/`

</details>
<details><summary><code>/funderingsonderzoek-westerwolde/</code> – 27 contextuele interne links</summary>

`/`, `/werkgebied/`, `/funderingsonderzoek-groningen/`, `/funderingsscan-aanvragen/`, `/kennisbank/zandbodem/`, `/kennisbank/zetting/`, `/kennisbank/houten-paalfundering/`, `/fundering-op-staal/`, `/kennisbank/archiefonderzoek-fundering/`, `/kennisbank/scheurpatronen/`, `/scheuren-in-gevel/`, `/klemmende-deuren-en-ramen/`, `/gratis-funderingscheck/`, `/funderingsonderzoek-bij-aankoop/`, `/kennisbank/visuele-funderingsinspectie/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/lintvoegwaterpassing/`, `/kennisbank/loodmeting/`, `/kennisbank/vloerveldwaterpassing/`, `/fase-1-funderingsonderzoek/`, `/werkwijze/`, `/funderingsonderzoek-stadskanaal/`, `/funderingsonderzoek-winschoten/`, `/funderingsscan/`, `/quickscan-fundering/`, `/prijzen/`, `/contact/`

</details>
<details><summary><code>/hulpmiddelen/</code> – 39 contextuele interne links</summary>

`/`, `/funderingsscan-aanvragen/`, `/welke-stap-past-bij-mij/`, `/huis-kopen-funderingscheck/`, `/funderingsonderzoek-bij-aankoop/`, `/vertel-wat-je-ziet/`, `/gratis-funderingscheck/`, `/funderingsonderzoek-bij-verkoop/`, `/kennisbank/funderingsrapport-voor-verkoper/`, `/funderingsonderzoek-taxatie/`, `/contact/`, `/kosten-funderingsonderzoek-berekenen/`, `/funderingsrisicoklasse-uitgelegd/`, `/welke-fundering-heeft-mijn-woning/`, `/meetwaarden-uitgelegd/`, `/funderingsquiz/`, `/funderingsmetingen/`, `/funderingsonderzoek-friesland/`, `/funderingsonderzoek-groningen/`, `/funderingsonderzoek-harlingen/`, `/funderingsonderzoek-franeker/`, `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-drachten/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-haren/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-delfzijl/`, `/funderingsonderzoek-veendam/`, `/funderingsonderzoek-winschoten/`, `/werkgebied/`, `/quickscan-fundering/`, `/bronnen-en-richtlijnen/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/kennisbank/`

</details>
<details><summary><code>/gratis-funderingscheck/</code> – 16 contextuele interne links</summary>

`/`, `/hulpmiddelen/`, `/funderingsscan-aanvragen/`, `/contact/`, `/funderingsrisicoklasse-uitgelegd/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/funderingsonderzoek-bij-aankoop/`, `/vertel-wat-je-ziet/`, `/funderingsonderzoek-taxatie/`, `/kosten-funderingsonderzoek-berekenen/`, `/welke-fundering-heeft-mijn-woning/`, `/funderingsquiz/`, `/funderingsscan/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`

</details>
<details><summary><code>/vertel-wat-je-ziet/</code> – 21 contextuele interne links</summary>

`/`, `/hulpmiddelen/`, `/funderingsscan-aanvragen/`, `/scheuren-in-gevel/`, `/kennisbank/scheuren-boven-kozijnen/`, `/kennisbank/helling-in-vloer/`, `/kennisbank/klemmende-deuren/`, `/kennisbank/klemmende-ramen/`, `/kennisbank/scheuren-bij-aanbouw/`, `/scheefstand-woning/`, `/kennisbank/monitoring-scheuren/`, `/kennisbank/grondwater-en-fundering/`, `/funderingsproblemen/`, `/quickscan-fundering/`, `/funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/scheurpatronen/`, `/contact/`

</details>
<details><summary><code>/welke-stap-past-bij-mij/</code> – 22 contextuele interne links</summary>

`/`, `/hulpmiddelen/`, `/funderingsscan-aanvragen/`, `/funderingsonderzoek-taxatie/`, `/bronnen-en-richtlijnen/`, `/fase-0-funderingsonderzoek-aankoop/`, `/huis-kopen-funderingscheck/`, `/kennisbank/heb-ik-een-funderingsscan-nodig/`, `/contact/`, `/vertel-wat-je-ziet/`, `/kennisbank/monitoring-scheuren/`, `/funderingsonderzoek-bij-verkoop/`, `/gratis-funderingscheck/`, `/fase-0-funderingsonderzoek/`, `/werkwijze/`, `/kennisbank/wat-na-een-quickscan/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/kennisbank/wanneer-funderingsonderzoek/`, `/kosten-funderingsonderzoek-berekenen/`

</details>
<details><summary><code>/kosten-funderingsonderzoek-berekenen/</code> – 16 contextuele interne links</summary>

`/`, `/hulpmiddelen/`, `/funderingsscan-aanvragen/`, `/prijzen/`, `/kennisbank/wat-kost-een-funderingsscan/`, `/fase-0-funderingsonderzoek/`, `/fase-0-funderingsonderzoek-aankoop/`, `/fase-1-funderingsonderzoek/`, `/funderingsonderzoek-taxatie/`, `/welke-stap-past-bij-mij/`, `/meetwaarden-uitgelegd/`, `/gratis-funderingscheck/`, `/werkwijze/`, `/funderingsscan/`, `/quickscan-fundering/`, `/contact/`

</details>
<details><summary><code>/welke-fundering-heeft-mijn-woning/</code> – 16 contextuele interne links</summary>

`/`, `/hulpmiddelen/`, `/funderingsscan-aanvragen/`, `/kennisbank/houten-paalfundering/`, `/kennisbank/fundering-op-staal/`, `/kennisbank/paalfundering/`, `/fase-0-funderingsonderzoek/`, `/bronnen-en-richtlijnen/`, `/kennisbank/archiefonderzoek-fundering/`, `/funderingsquiz/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/contact/`

</details>
<details><summary><code>/funderingsrisicoklasse-uitgelegd/</code> – 14 contextuele interne links</summary>

`/`, `/hulpmiddelen/`, `/funderingsscan-aanvragen/`, `/bronnen-en-richtlijnen/`, `/quickscan-fundering/`, `/funderingsonderzoek-taxatie/`, `/kennisbank/funderingsscan-en-hypotheek/`, `/kennisbank/funderingsrisico/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/contact/`

Extern: <https://www.kcaf.nl/>

</details>
<details><summary><code>/huis-kopen-funderingscheck/</code> – 15 contextuele interne links</summary>

`/`, `/hulpmiddelen/`, `/funderingsscan-aanvragen/`, `/funderingsonderzoek-bij-aankoop/`, `/kennisbank/funderingsrisico-bij-aankoop/`, `/fase-0-funderingsonderzoek-aankoop/`, `/kennisbank/funderingsonderzoek-voor-bod/`, `/funderingsrisicoklasse-uitgelegd/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/contact/`

</details>
<details><summary><code>/meetwaarden-uitgelegd/</code> – 17 contextuele interne links</summary>

`/`, `/hulpmiddelen/`, `/funderingsscan-aanvragen/`, `/funderingsmetingen/`, `/kennisbank/lintvoegwaterpassing/`, `/welke-fundering-heeft-mijn-woning/`, `/kennisbank/loodmeting/`, `/kennisbank/zettingsmeting/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/gratis-funderingscheck/`, `/kennisbank/scheefstandsmeting/`, `/funderingsrapport/`, `/contact/`

</details>
<details><summary><code>/funderingsquiz/</code> – 16 contextuele interne links</summary>

`/`, `/hulpmiddelen/`, `/funderingsscan-aanvragen/`, `/kennisbank/begrippenlijst/`, `/meetwaarden-uitgelegd/`, `/kennisbank/paalrot/`, `/kennisbank/zetting/`, `/bronnen-en-richtlijnen/`, `/gratis-funderingscheck/`, `/kennisbank/`, `/fase-0-funderingsonderzoek/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/contact/`

</details>
<details><summary><code>/privacyverklaring/</code> – 11 contextuele interne links</summary>

`/`, `/funderingsscan-aanvragen/`, `/contact/`, `/gratis-funderingscheck/`, `/algemene-voorwaarden/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/over-ons/`

Extern: <https://www.autoriteitpersoonsgegevens.nl/>

</details>
<details><summary><code>/algemene-voorwaarden/</code> – 11 contextuele interne links</summary>

`/`, `/funderingsscan-aanvragen/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/werkwijze/`, `/gratis-funderingscheck/`, `/privacyverklaring/`, `/funderingsscan/`, `/quickscan-fundering/`, `/contact/`

</details>
<details><summary><code>/404.html</code> – 10 contextuele interne links</summary>

`/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/fase-1-funderingsonderzoek/`, `/prijzen/`, `/funderingsproblemen/`, `/werkgebied/`, `/kennisbank/`, `/contact/`

</details>
<details><summary><code>/status/</code> – 1 contextuele interne links</summary>

`/`

</details>

---

## 7. Afbeeldingen en alt-teksten

**Bronbestanden in `dist/assets/`:**
- 5 contentfoto’s, elk in 3–4 WebP-breedtes: `funderingsinspectie-woning-gevel`, `funderingsmeting-laser-tablet`, `jaren-dertig-woningen-straat`, `metselwerk-gevel-detail`, `vooroorlogse-woning-voordeur`.
- `og-mv-funderingsscan.jpg` (1200 × 630, gecontroleerd), alleen gebruikt als OG/Twitter-afbeelding en in JSON-LD.
- `oldehove-scheef.png` en `oldehove-silhouet.png`, gebruikt via CSS/JS (`styles.css`, `script.js`) op o.a. `/funderingsmetingen/` en `/kennisbank/loodmeting/`. Het zijn **geen** `<img>`-tags, dus ze hebben geen alt-attribuut. Of ze informatief of decoratief zijn, is niet beoordeeld.
- Logo’s (`logo-mvfunderingsscan(.png/.webp)`, `-wit`) en favicons/app-iconen.

**Resultaat van de `<img>`-controle over alle 145 pagina’s:**
- **Ontbrekende alt-attributen: 0.**
- **Lege alt (`alt=""`): 0** in de statische pagina’s.
- Alle `<img>`-tags hebben `width` en `height`. Op hero-afbeeldingen na laden ze `loading="lazy"`; de homepage-hero heeft `fetchpriority="high"` en een preload.
- Het logo (header en footer) heeft alt `MV Funderingsscan` en staat op elke pagina.
- Alle foto’s gebruiken `srcset`/`sizes` met WebP. Er is geen JPEG/PNG-fallback in `<picture>` voor de contentfoto’s; de logo’s hebben die wel.

**Dynamische pagina’s (niet te controleren zonder database):** in `/nieuws/` krijgen kaartafbeeldingen bewust `alt=""` met `aria-hidden` (decoratief, de titel staat ernaast). Op `/nieuws/<slug>/` komt de alt uit het databaseveld `featured_image_alt`. **Als dat leeg is, wordt de alt leeg.** Of dat bij gepubliceerde berichten zo is, valt uit de code niet af te leiden.

### Gebruik per foto

| Afbeelding | Aantal pagina’s (in content) |
|---|---|
| `/assets/img/jaren-dertig-woningen-straat-1024.webp` | 33 |
| `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | 33 |
| `/assets/img/metselwerk-gevel-detail-1024.webp` | 23 |
| `/assets/img/vooroorlogse-woning-voordeur-800.webp` | 23 |
| `/assets/img/funderingsmeting-laser-tablet-1024.webp` | 1 |

### Contentafbeeldingen per pagina (alleen `<img>` binnen `<main>`)

| Pagina | Afbeelding (src) | Alt-tekst | Laden |
|---|---|---|---|
| `/` | `/assets/img/funderingsmeting-laser-tablet-1024.webp` | Persoon met een tablet en lasermeetapparatuur bij een meting op de vloer van een woning | eager |
| `/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | lazy |
| `/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij vooroorlogse bakstenen woningen in een groene straat | lazy |
| `/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een vooroorlogse bakstenen gevel | lazy |
| `/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Jaren-dertigwoningen met bakstenen gevels, een type woning waarbij funderingsonderzoek vaak zinvol is | lazy |
| `/funderingsscan/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon houdt een waterpas tegen de bakstenen gevel van een woning | eager |
| `/quickscan-fundering/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/fase-0-funderingsonderzoek/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning tijdens een funderingsinspectie | eager |
| `/fase-1-funderingsonderzoek/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon houdt een waterpas tegen de gevel van een woning tijdens funderingsonderzoek | eager |
| `/funderingsinspectie/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/funderingsmetingen/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/funderingsrapport/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een vooroorlogse woning | eager |
| `/prijzen/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/funderingsonderzoek-woning/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/funderingsonderzoek-bij-aankoop/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een oudere woning | eager |
| `/funderingsonderzoek-bij-verkoop/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/funderingsonderzoek-taxatie/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/woningeigenaren/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een oudere woning | eager |
| `/makelaars-en-taxateurs/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/over-ons/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/werkwijze/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/funderingsproblemen/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon houdt een waterpas tegen de bakstenen gevel van een woning | eager |
| `/scheuren-in-gevel/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van bakstenen metselwerk met voegen in een gevel | eager |
| `/verzakking-woning/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/scheefstand-woning/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke houten voordeur in een bakstenen gevel van een vooroorlogse woning | eager |
| `/problemen-met-houten-palen/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/fundering-op-staal/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon houdt een waterpas tegen de bakstenen gevel van een woning | eager |
| `/werkgebied/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/funderingsonderzoek-friesland/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een oudere woning | eager |
| `/funderingsscan-friesland/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met waterpas bij de gevel van een woning | eager |
| `/funderingsonderzoek-groningen/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/funderingsscan-groningen/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de bakstenen gevel van een woning | eager |
| `/funderingsonderzoek-leeuwarden/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/funderingsonderzoek-sneek/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel | eager |
| `/funderingsonderzoek-harlingen/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen van een oude gevel | eager |
| `/funderingsonderzoek-drachten/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met waterpas bij de gevel van een woning | eager |
| `/funderingsonderzoek-heerenveen/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij oudere woningen in een straat met bomen | eager |
| `/funderingsonderzoek-groningen-stad/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene stadsstraat | eager |
| `/funderingsonderzoek-appingedam/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een historische gevel | eager |
| `/funderingsonderzoek-delfzijl/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel | eager |
| `/kennisbank/wat-is-een-funderingsscan/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon houdt een waterpas tegen de gevel van een woning tijdens een inspectie | eager |
| `/kennisbank/wat-is-fase-1/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/kennisbank/wat-wordt-onderzocht/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een vooroorlogse woning | eager |
| `/kennisbank/funderingsscan-bij-aankoop/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/funderingsscan-bij-verkoop/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een vooroorlogse woning | eager |
| `/kennisbank/funderingsrapport-lezen/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/kennisbank/scheuren-in-woning/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een vooroorlogse woning | eager |
| `/kennisbank/scheuren-in-gevel/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/kennisbank/scheuren-in-metselwerk/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/kennisbank/verzakking-woning/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon houdt een waterpas tegen de gevel van een woning | eager |
| `/kennisbank/scheefstand/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/klemmende-deuren/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een vooroorlogse woning | eager |
| `/kennisbank/kruipruimte-inspectie/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon houdt een waterpas tegen de gevel van een woning | eager |
| `/kennisbank/houten-paalfundering/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/fundering-op-staal/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een vooroorlogse woning | eager |
| `/kennisbank/veenbodem/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/kleibodem/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/bodemdaling/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon houdt een waterpas tegen de gevel van een woning | eager |
| `/kennisbank/grondwater-en-fundering/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/funderingsrisico/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/funderingsherstel/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon houdt een waterpas tegen de gevel van een woning | eager |
| `/kennisbank/kosten-funderingsherstel/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/funderingsproblemen-friesland/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/funderingsproblemen-groningen/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/lintvoegwaterpassing/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van bakstenen metselwerk met doorlopende horizontale voegen in een gevel | eager |
| `/kennisbank/loodmeting/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon houdt een waterpas tegen de bakstenen gevel van een woning | eager |
| `/kennisbank/vloerveldwaterpassing/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/kennisbank/scheurpatronen/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/kennisbank/scheefstandsmeting/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/kennisbank/hoogtemeting/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/kennisbank/zettingsmeting/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/scheurmeting/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/kennisbank/monitoring-scheuren/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/kennisbank/maaiveldhoogte/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/grondwatermeting/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een vooroorlogse woning | eager |
| `/kennisbank/wat-is-funderingsonderzoek/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/kennisbank/archiefonderzoek-fundering/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een oudere woning | eager |
| `/kennisbank/visuele-funderingsinspectie/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/kennisbank/funderingsrisico-inschatting/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/zetting/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/kennisbank/ongelijke-zetting/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/kennisbank/paalfundering/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/paalrot/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een oudere woning | eager |
| `/kennisbank/zandbodem/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat met bomen | eager |
| `/kennisbank/peilverschillen/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/scheuren-boven-kozijnen/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/kennisbank/scheuren-bij-aanbouw/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/kennisbank/klemmende-ramen/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel | eager |
| `/kennisbank/helling-in-vloer/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/kennisbank/funderingsonderzoek-voor-bod/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/kennisbank/funderingsrisico-bij-aankoop/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een oudere woning | eager |
| `/kennisbank/funderingsrapport-voor-verkoper/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/fase-0-funderingsonderzoek-aankoop/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/funderingsonderzoek-franeker/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een oudere woning | eager |
| `/funderingsonderzoek-haren/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/funderingsonderzoek-veendam/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/funderingsonderzoek-winschoten/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen van een bakstenen gevel | eager |
| `/funderingsscan-leeuwarden/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/funderingsonderzoek-achtkarspelen/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon houdt een waterpas tegen de bakstenen gevel van een woning | eager |
| `/funderingsonderzoek-dantumadiel/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een oudere woning | eager |
| `/funderingsonderzoek-de-fryske-marren/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van oud metselwerk en voegen in een bakstenen gevel | eager |
| `/funderingsonderzoek-noardeast-fryslan/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/funderingsonderzoek-ooststellingwerf/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/funderingsonderzoek-opsterland/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon houdt een waterpas tegen de gevel van een woning tijdens een funderingsinspectie | eager |
| `/funderingsonderzoek-tytsjerksteradiel/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/funderingsonderzoek-weststellingwerf/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/funderingsonderzoek-eemsdelta/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een oudere woning | eager |
| `/funderingsonderzoek-het-hogeland/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon meet met een waterpas langs de gevel van een woning | eager |
| `/funderingsonderzoek-midden-groningen/` | `/assets/img/funderingsinspectie-woning-gevel-1024.webp` | Persoon met een waterpas bij de gevel van een woning | eager |
| `/funderingsonderzoek-pekela/` | `/assets/img/metselwerk-gevel-detail-1024.webp` | Close-up van metselwerk en voegen in een bakstenen gevel | eager |
| `/funderingsonderzoek-stadskanaal/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel | eager |
| `/funderingsonderzoek-westerkwartier/` | `/assets/img/jaren-dertig-woningen-straat-1024.webp` | Rij jaren-dertigwoningen in een groene straat | eager |
| `/funderingsonderzoek-westerwolde/` | `/assets/img/vooroorlogse-woning-voordeur-800.webp` | Klassieke voordeur in een bakstenen gevel van een oudere woning | eager |

**Pagina’s zonder contentafbeelding** (alleen het logo): `/contact/`, `/funderingsscan-aanvragen/`, `/kennisbank/`, `/bronnen-en-richtlijnen/`, `/klemmende-deuren-en-ramen/`, `/funderingsproblemen-veen/`, `/funderingsproblemen-klei/`, `/kennisbank/wat-is-een-quickscan-fundering/`, `/kennisbank/wat-is-fase-0/`, `/kennisbank/verschil-fase-0-en-fase-1/`, `/kennisbank/wat-kost-een-funderingsscan/`, `/kennisbank/wat-kost-fase-0/`, `/kennisbank/hoe-lang-duurt-funderingsonderzoek/`, `/kennisbank/wanneer-funderingsonderzoek/`, `/kennisbank/heb-ik-een-funderingsscan-nodig/`, `/kennisbank/funderingsscan-en-taxatie/`, `/kennisbank/funderingsscan-en-hypotheek/`, `/kennisbank/wat-na-een-quickscan/`, `/kennisbank/wanneer-fase-1/`, `/kennisbank/kosten-fase-1/`, `/kennisbank/begrippenlijst/`, `/hulpmiddelen/`, `/gratis-funderingscheck/`, `/vertel-wat-je-ziet/`, `/welke-stap-past-bij-mij/`, `/kosten-funderingsonderzoek-berekenen/`, `/welke-fundering-heeft-mijn-woning/`, `/funderingsrisicoklasse-uitgelegd/`, `/huis-kopen-funderingscheck/`, `/meetwaarden-uitgelegd/`, `/funderingsquiz/`, `/privacyverklaring/`, `/algemene-voorwaarden/`, `/404.html`, `/beheer/`, `/status/`

---

## 8. sitemap.xml en robots.txt

### sitemap.xml (`dist/sitemap.xml`, gegenereerd door `buildMetaFiles()` in `build.mjs`)
- **142 URL’s.** Dat zijn precies alle indexeerbare statische pagina’s, zonder dubbele regels. Niet opgenomen: `/404.html`, `/status/`, `/beheer/` (correct).
- Absolute URL’s met `https://www.` en een slash aan het eind, gelijk aan de canonicals.
- `<priority>`: 1.0 (home), 0.9 (`/funderingsscan/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`), 0.8 (diensten, aankoop, aanvragen), 0.7 (regio, problemen), 0.6 (overig). Google negeert `priority`.
- `<lastmod>` komt sinds de **niet-gecommitte** wijziging in `build.mjs` uit `src/content/lastmod.json`: de datum wijzigt alleen als de inhoud van `<main>` wijzigt. In de huidige build hebben 132 URL’s `2026-10-30` en 10 URL’s `2026-11-02`.
- **Geen `<image:image>`-uitbreiding** en geen sitemap-index. De nieuws-sitemap is een apart bestand.
- `/nieuws/` zelf staat **niet** in `sitemap.xml`. Het komt alleen in `/nieuws-sitemap.xml` als er minstens één gepubliceerd bericht is.

### nieuws-sitemap.xml (dynamisch)
- Wordt op aanvraag gegenereerd door `api/nieuws.js` uit gepubliceerde berichten, met `<lastmod>` als volledige ISO-tijd. Hoeveel URL’s erin staan, is onbekend (database).

### robots.txt (`dist/robots.txt`)
```
User-agent: *            Allow: /   Disallow: /api/  /beheer/  /status/
User-agent: OAI-SearchBot | ChatGPT-User | PerplexityBot | Bingbot | Googlebot
                         (elk dezelfde regels, expliciet herhaald)
Sitemap: https://www.mvfunderingsquickscan.nl/sitemap.xml
Sitemap: https://www.mvfunderingsquickscan.nl/nieuws-sitemap.xml
```
Er zijn geen regels voor AI-trainingscrawlers als `GPTBot`, `Google-Extended`, `CCBot` of `ClaudeBot`. Die vallen onder `*` en mogen dus alles behalve `/api/`, `/beheer/` en `/status/`. Of dat de bedoeling is, blijkt niet uit de code; het commentaar zegt “Alle zoekmachines en AI-zoekdiensten zijn welkom.”

### Overige crawlerbestanden
- `llms.txt`: samenvatting en kernfeiten voor AI-zoekdiensten, met links naar alle pagina’s per groep.
- `site.webmanifest`: naam, iconen 192/512 en theme-color.

---

## 9. Structured data (JSON-LD)

Elke openbare pagina heeft één `<script type="application/ld+json">` met een `@graph`. Alle 142 blokken zijn geldig JSON (0 parsefouten). Validatie tegen de Google Rich Results Test is **niet** uitgevoerd.

**Types en aantallen over de hele site:**

| Type | Aantal pagina’s | Bron / opmerking |
|---|---|---|
| `ProfessionalService` (organisatie, `@id …/#organisatie`) | 142 | Naam, legalName, KvK-nummer, logo, image, telefoon, e-mail, adres, **geo** (nieuw, niet gecommit: 53.2152, 5.7799), openingstijden ma–vr 09–17, areaServed (provincies + Noord-Drentse gemeenten + alle gemeenten uit `site.json`), knowsAbout, priceRange. `sameAs` alleen als ingevuld; nu **leeg**, want `eeat.json` heeft alleen placeholders. |
| `WebSite` | 142 | Naam, taal, publisher. **Geen `SearchAction`** (de site heeft geen zoekfunctie). |
| `WebPage` / `ContactPage` / `CollectionPage` | 139 / 1 / 2 | Per pagina, met `dateModified`, breadcrumb-koppeling en `about`. |
| `BreadcrumbList` | 141 | Alle pagina’s behalve de homepage. |
| `FAQPage` | 139 | Uit dezelfde bron als de zichtbare FAQ. |
| `Service` | 87 | Diensten (funderingsscan, fase 0, fase 1, enz.) met `Offer`/`PriceSpecification` in EUR incl. btw. Op gemeentepagina’s krijgt `areaServed` de gemeente en kernen. |
| `Article` | 65 | Kennisbankartikelen. **Auteur = de organisatie**, niet een persoon. Image = de generieke OG-afbeelding. |
| `DefinedTerm` / `DefinedTermSet` | 23 / 1 | Begripspagina’s en de begrippenlijst. |
| `ItemList` | 1 | Kennisbank-overzicht. |
| `Person` | 2 | Alleen op `/over-ons/` (Melvin Krikke, Rutger Fopma). |
| `NewsArticle` | dynamisch | Op `/nieuws/<slug>/`. Auteur is een persoon als `show_author` aan staat, anders de organisatie. |

Per pagina:

| URL | Schema.org-types (JSON-LD @graph) |
|---|---|
| `/` | ProfessionalService, WebSite, WebPage, Service×3, FAQPage |
| `/contact/` | ProfessionalService, WebSite, ContactPage, BreadcrumbList |
| `/funderingsscan-aanvragen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/kennisbank/` | ProfessionalService, WebSite, CollectionPage, BreadcrumbList, ItemList |
| `/funderingsscan/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×3, FAQPage |
| `/quickscan-fundering/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| `/fase-0-funderingsonderzoek/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| `/fase-1-funderingsonderzoek/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| `/funderingsinspectie/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| `/funderingsmetingen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| `/funderingsrapport/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/prijzen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-woning/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| `/funderingsonderzoek-bij-aankoop/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| `/funderingsonderzoek-bij-verkoop/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| `/funderingsonderzoek-taxatie/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| `/woningeigenaren/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| `/makelaars-en-taxateurs/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/over-ons/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Person×2, FAQPage |
| `/bronnen-en-richtlijnen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/werkwijze/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/funderingsproblemen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/scheuren-in-gevel/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/verzakking-woning/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/scheefstand-woning/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/klemmende-deuren-en-ramen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/problemen-met-houten-palen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/fundering-op-staal/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/funderingsproblemen-veen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/funderingsproblemen-klei/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/werkgebied/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/funderingsonderzoek-friesland/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsscan-friesland/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-groningen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsscan-groningen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-leeuwarden/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-sneek/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-harlingen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-drachten/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-heerenveen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-groningen-stad/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-appingedam/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-delfzijl/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/kennisbank/wat-is-een-funderingsscan/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/wat-is-een-quickscan-fundering/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/wat-is-fase-0/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/wat-is-fase-1/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/verschil-fase-0-en-fase-1/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/wat-kost-een-funderingsscan/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/wat-kost-fase-0/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/hoe-lang-duurt-funderingsonderzoek/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/wat-wordt-onderzocht/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/wanneer-funderingsonderzoek/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/heb-ik-een-funderingsscan-nodig/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/funderingsscan-bij-aankoop/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/funderingsscan-bij-verkoop/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/funderingsscan-en-taxatie/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/funderingsscan-en-hypotheek/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/funderingsrapport-lezen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/wat-na-een-quickscan/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/wanneer-fase-1/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/scheuren-in-woning/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/scheuren-in-gevel/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/scheuren-in-metselwerk/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/verzakking-woning/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/scheefstand/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/klemmende-deuren/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/kruipruimte-inspectie/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/houten-paalfundering/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/fundering-op-staal/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/veenbodem/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/kleibodem/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/bodemdaling/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/grondwater-en-fundering/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/funderingsrisico/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/funderingsherstel/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/kosten-funderingsherstel/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/funderingsproblemen-friesland/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/funderingsproblemen-groningen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/lintvoegwaterpassing/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/loodmeting/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/vloerveldwaterpassing/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/scheurpatronen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/scheefstandsmeting/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/hoogtemeting/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/zettingsmeting/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/scheurmeting/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/monitoring-scheuren/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/maaiveldhoogte/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/grondwatermeting/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/wat-is-funderingsonderzoek/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/archiefonderzoek-fundering/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/visuele-funderingsinspectie/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/funderingsrisico-inschatting/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/zetting/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/ongelijke-zetting/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/paalfundering/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/paalrot/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| `/kennisbank/zandbodem/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/peilverschillen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/scheuren-boven-kozijnen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/scheuren-bij-aanbouw/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/klemmende-ramen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/helling-in-vloer/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/funderingsonderzoek-voor-bod/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/funderingsrisico-bij-aankoop/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/funderingsrapport-voor-verkoper/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/kennisbank/kosten-fase-1/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| `/fase-0-funderingsonderzoek-aankoop/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| `/funderingsonderzoek-franeker/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-haren/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-veendam/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-winschoten/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsscan-leeuwarden/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/kennisbank/begrippenlijst/` | ProfessionalService, WebSite, CollectionPage, BreadcrumbList, DefinedTermSet |
| `/funderingsonderzoek-achtkarspelen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-dantumadiel/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-de-fryske-marren/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-noardeast-fryslan/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-ooststellingwerf/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-opsterland/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-tytsjerksteradiel/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-weststellingwerf/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-eemsdelta/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-het-hogeland/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-midden-groningen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-pekela/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-stadskanaal/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-westerkwartier/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/funderingsonderzoek-westerwolde/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| `/hulpmiddelen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/gratis-funderingscheck/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/vertel-wat-je-ziet/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/welke-stap-past-bij-mij/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/kosten-funderingsonderzoek-berekenen/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/welke-fundering-heeft-mijn-woning/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/funderingsrisicoklasse-uitgelegd/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/huis-kopen-funderingscheck/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/meetwaarden-uitgelegd/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/funderingsquiz/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/privacyverklaring/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/algemene-voorwaarden/` | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/404.html` | – (geen) |
| `/beheer/` | – (geen) |
| `/status/` | – (geen) |

---

## 10. Open Graph en Twitter Cards

Ingesteld in `head()` (`src/lib/layout.mjs`) en voor alle pagina’s gelijk opgebouwd:

| Tag | Waarde |
|---|---|
| `og:type` | `website` op **alle 145** statische pagina’s, ook op de 65 kennisbankartikelen. Alleen nieuwsartikelen (dynamisch) en praktijkvoorbeelden (bestaan niet) krijgen `article`. |
| `og:locale` | `nl_NL` |
| `og:site_name` | `MV Funderingsscan` |
| `og:title` | Gelijk aan de `<title>` (op alle pagina’s; `og_title` wordt nergens overschreven) |
| `og:description` | Gelijk aan de meta description |
| `og:url` | Gelijk aan de canonical URL |
| `og:image` | **Op elke pagina dezelfde**: `https://www.mvfunderingsquickscan.nl/assets/img/og-mv-funderingsscan.jpg` (1200 × 630). Nieuwsartikelen gebruiken de uitgelichte afbeelding als die er is. |
| `og:image:width` / `height` | 1200 / 630 (klopt met het bestand) |
| `og:image:alt` | Op elke pagina `Persoon met een waterpas bij de gevel van een woning`. Of dit klopt met de afbeelding, is niet visueel gecontroleerd. |
| `twitter:card` | `summary_large_image` |
| `twitter:title` / `description` / `image` | Gelijk aan de OG-waarden |

Niet aanwezig: `article:published_time`, `article:modified_time`, `article:author` (ook niet op nieuwsartikelen), `fb:app_id`, `twitter:site`.

---

## 11. Google Analytics en andere meetintegraties

| Integratie | Status in de lokale code |
|---|---|
| **Google Analytics 4** | **Niet actief.** Er is ondersteuning toegevoegd, maar die is **nog niet gecommit**: `public/consent.js` (cookiemelding + GA4) en een aanpassing in `head()` die `consent.js` met `data-ga="<ID>"` laadt **als** `site.json → analytics.ga4_id` een geldig `G-…`-ID bevat. Dat veld is nu **leeg** (`"ga4_id": ""`), dus de gebouwde pagina’s bevatten geen GA-code en geen cookiemelding. Volgens `consent.js` laadt GA4 pas na “Accepteren”, met `anonymize_ip`, zonder Google Signals en advertentiepersonalisatie, en stuurt het `generate_lead` bij verzonden formulieren. **Een meet-ID is nergens in de repository te vinden.** |
| Universal Analytics / Google Tag Manager-container | Niet aanwezig. Er is geen `UA-…`- of `GTM-…`-ID gevonden. `googletagmanager.com/gtag/js` wordt alleen dynamisch geladen door `consent.js`, na toestemming. |
| **Vercel Web Analytics** | **Actief** op alle openbare pagina’s (143 HTML-bestanden, waaronder `/404.html`): `<script defer src="/_vercel/insights/script.js">`. Cookieloos. Uitgeschakeld op `/status/` en `/beheer/` (`analytics: false`). Sinds commit `b48e18a`. |
| Google Search Console-verificatie | **Geen** `google-site-verification`-metatag en geen verificatiebestand in `public/`. Verificatie kan via DNS lopen; dat is uit de code niet af te leiden. |
| Bing Webmaster Tools | Geen `msvalidate.01`-tag of `BingSiteAuth.xml` gevonden. |
| Google Bedrijfsprofiel | Er is documentatie (`docs/google-bedrijfsprofiel.md`). De profiel-URL is nog een placeholder in `eeat.json` en staat daardoor niet in `sameAs`. |

---

## 12. Mogelijke technische SEO-problemen

Gesorteerd van meer naar minder relevant. Het zijn **bevindingen uit de code**; impact op de live ranking is niet gemeten.

1. **Niet-gecommitte wijzigingen; `lastmod.json` staat niet in git.** `src/content/lastmod.json` is untracked. `build.mjs` schrijft dat bestand alleen buiten Vercel (`!process.env.VERCEL`). Als het niet wordt gecommit, bestaat het op Vercel niet en krijgt **elke pagina bij elke deploy de builddatum** als `<lastmod>` en `dateModified`. Juist dat moet het nieuwe mechanisme voorkomen. Ook de nieuwe titles en descriptions (o.a. homepage, `/welke-stap-past-bij-mij/`), de `geo`-coördinaten en GA4/consent staan nog niet live.
2. **62 van de 145 titles zijn langer dan 60 tekens.** Google kort titles vaak af rond 580 px (circa 55–60 tekens), waardoor het merk “| MV Funderingsscan” of belangrijke woorden kunnen wegvallen. Lijst:

   | URL | Title | Tekens |
   |---|---|---|
| `/` | Funderingsonderzoek in Friesland & Groningen \| MV Funderingsscan | 64 |
| `/funderingsscan-aanvragen/` | Funderingsscan aanvragen \| Prijs vooraf bekend \| MV Funderingsscan | 66 |
| `/kennisbank/` | Kennisbank funderingsonderzoek \| Antwoorden \| MV Funderingsscan | 63 |
| `/quickscan-fundering/` | Quickscan fundering in Friesland en Groningen \| MV Funderingsscan | 65 |
| `/funderingsmetingen/` | Funderingsmetingen uitgelegd: zie hoe funderingsonderzoek werkt | 63 |
| `/prijzen/` | Prijzen funderingsscan fase 0 en 1, incl. btw \| MV Funderingsscan | 65 |
| `/funderingsonderzoek-taxatie/` | Funderingsonderzoek bij taxatie: klasse D of E? \| MV Funderingsscan | 67 |
| `/over-ons/` | Over ons: onafhankelijk funderingsonderzoek \| MV Funderingsscan | 63 |
| `/bronnen-en-richtlijnen/` | Bronnen en richtlijnen funderingsonderzoek \| MV Funderingsscan | 62 |
| `/werkwijze/` | Werkwijze funderingsonderzoek in 7 stappen \| MV Funderingsscan | 62 |
| `/funderingsproblemen/` | Funderingsproblemen woning: signalen en oorzaken \| MV Funderingsscan | 68 |
| `/scheuren-in-gevel/` | Scheuren in gevel: soorten, oorzaken en advies \| MV Funderingsscan | 66 |
| `/klemmende-deuren-en-ramen/` | Klemmende deuren en ramen: fundering of niet? \| MV Funderingsscan | 65 |
| `/problemen-met-houten-palen/` | Problemen met houten palen onder je woning \| MV Funderingsscan | 62 |
| `/funderingsproblemen-veen/` | Funderingsproblemen op veen en bodemdaling \| MV Funderingsscan | 62 |
| `/funderingsproblemen-klei/` | Funderingsproblemen op klei: krimp en zwel \| MV Funderingsscan | 62 |
| `/werkgebied/` | Werkgebied: Friesland, Groningen, Noord-Drenthe \| MV Funderingsscan | 67 |
| `/kennisbank/wat-is-een-funderingsscan/` | Wat is een funderingsscan? Heldere uitleg \| MV Funderingsscan | 61 |
| `/kennisbank/heb-ik-een-funderingsscan-nodig/` | Heb ik een funderingsscan nodig? Zelftest \| MV Funderingsscan | 61 |
| `/kennisbank/funderingsscan-en-taxatie/` | Funderingsparagraaf taxatierapport uitgelegd \| MV Funderingsscan | 64 |
| `/kennisbank/scheuren-in-woning/` | Scheuren in je woning: binnenmuren en plafonds \| MV Funderingsscan | 66 |
| `/kennisbank/scheuren-in-metselwerk/` | Scheuren in metselwerk: voeg, steen en latei \| MV Funderingsscan | 64 |
| `/kennisbank/scheefstand/` | Scheefstand herkennen: wat kun je zelf zien? \| MV Funderingsscan | 64 |
| `/kennisbank/kruipruimte-inspectie/` | Kruipruimte-inspectie: wat wordt er bekeken? \| MV Funderingsscan | 64 |
| `/kennisbank/houten-paalfundering/` | Houten paalfundering: hoe zit die in elkaar? \| MV Funderingsscan | 64 |
| `/kennisbank/fundering-op-staal/` | Wat is fundering op staal? Uitleg en herkenning \| MV Funderingsscan | 67 |
| `/kennisbank/veenbodem/` | Veenbodem: wat is veen en waarom telt het? \| MV Funderingsscan | 62 |
| `/kennisbank/bodemdaling/` | Bodemdaling: oorzaken en gevolgen voor je woning \| MV Funderingsscan | 68 |
| `/kennisbank/grondwater-en-fundering/` | Grondwater en fundering: waarom het peil telt \| MV Funderingsscan | 65 |
| `/kennisbank/funderingsrisico/` | Funderingsrisico: wat betekent het precies? \| MV Funderingsscan | 63 |
| `/kennisbank/funderingsherstel/` | Funderingsherstel: wat houdt het globaal in? \| MV Funderingsscan | 64 |
| `/kennisbank/kosten-funderingsherstel/` | Kosten funderingsherstel: wat bepaalt de prijs? \| MV Funderingsscan | 67 |
| `/kennisbank/funderingsproblemen-friesland/` | Funderingsproblemen in Friesland: achtergrond \| MV Funderingsscan | 65 |
| `/kennisbank/funderingsproblemen-groningen/` | Funderingsproblemen in Groningen: achtergrond \| MV Funderingsscan | 65 |
| `/kennisbank/loodmeting/` | Wat is een loodmeting? Scheefstand gevel meten \| MV Funderingsscan | 66 |
| `/kennisbank/scheefstandsmeting/` | Scheefstand van een gevel meten: zo werkt het \| MV Funderingsscan | 65 |
| `/kennisbank/zettingsmeting/` | Zettingsmeting: zakking van je woning volgen \| MV Funderingsscan | 64 |
| `/kennisbank/monitoring-scheuren/` | Scheuren monitoren: zo volg je een scheur \| MV Funderingsscan | 61 |
| `/kennisbank/maaiveldhoogte/` | Maaiveldhoogte rond je woning: wat zegt het? \| MV Funderingsscan | 64 |
| `/kennisbank/grondwatermeting/` | Grondwatermeting en je fundering: peilbuizen \| MV Funderingsscan | 64 |
| `/kennisbank/wat-is-funderingsonderzoek/` | Wat is funderingsonderzoek? Fasen en keuzes \| MV Funderingsscan | 63 |
| `/kennisbank/archiefonderzoek-fundering/` | Archiefonderzoek fundering: wat zoeken we uit? \| MV Funderingsscan | 66 |
| `/kennisbank/visuele-funderingsinspectie/` | Visuele funderingsinspectie: waar let je op? \| MV Funderingsscan | 64 |
| `/kennisbank/funderingsrisico-inschatting/` | Funderingsrisico-inschatting: zo werkt het \| MV Funderingsscan | 62 |
| `/kennisbank/paalfundering/` | Paalfundering: wat is het en welke soorten? \| MV Funderingsscan | 63 |
| `/kennisbank/zandbodem/` | Zandbodem en fundering: wat moet je weten? \| MV Funderingsscan | 62 |
| `/kennisbank/funderingsonderzoek-voor-bod/` | Funderingsonderzoek vóór je bod: wat kan al? \| MV Funderingsscan | 64 |
| `/funderingsonderzoek-achtkarspelen/` | Funderingsonderzoek Buitenpost en Surhuisterveen \| MV Funderingsscan | 68 |
| `/funderingsonderzoek-dantumadiel/` | Funderingsonderzoek Damwâld en Feanwâlden \| MV Funderingsscan | 61 |
| `/funderingsonderzoek-de-fryske-marren/` | Funderingsonderzoek Joure, Lemmer en Balk \| MV Funderingsscan | 61 |
| `/funderingsonderzoek-noardeast-fryslan/` | Funderingsonderzoek Dokkum, Kollum en Holwerd \| MV Funderingsscan | 65 |
| `/funderingsonderzoek-ooststellingwerf/` | Funderingsonderzoek Oosterwolde en Appelscha \| MV Funderingsscan | 64 |
| `/funderingsonderzoek-opsterland/` | Funderingsonderzoek Gorredijk en Beetsterzwaag \| MV Funderingsscan | 66 |
| `/funderingsonderzoek-weststellingwerf/` | Funderingsonderzoek Wolvega en Noordwolde \| MV Funderingsscan | 61 |
| `/funderingsonderzoek-eemsdelta/` | Funderingsonderzoek Eemsdelta: Delfzijl, Appingedam, Loppersum | 62 |
| `/funderingsonderzoek-het-hogeland/` | Funderingsonderzoek Winsum, Uithuizen en Bedum \| MV Funderingsscan | 66 |
| `/funderingsonderzoek-midden-groningen/` | Funderingsonderzoek Hoogezand en Slochteren \| MV Funderingsscan | 63 |
| `/funderingsonderzoek-pekela/` | Funderingsonderzoek Oude en Nieuwe Pekela \| MV Funderingsscan | 61 |
| `/funderingsonderzoek-stadskanaal/` | Funderingsonderzoek Stadskanaal, Musselkanaal \| MV Funderingsscan | 65 |
| `/funderingsonderzoek-westerkwartier/` | Funderingsonderzoek Zuidhorn, Leek en Grootegast \| MV Funderingsscan | 68 |
| `/funderingsonderzoek-westerwolde/` | Funderingsonderzoek Ter Apel en Vlagtwedde \| MV Funderingsscan | 62 |
| `/funderingsrisicoklasse-uitgelegd/` | Funderingsrisicoklasse (funderingslabel) A tot en met E uitgelegd | 65 |

3. **Eén generieke OG-afbeelding voor alle pagina’s**, en `og:type=website` ook op 65 artikelen. Bij delen op sociale media en in chatapps ziet elke pagina er hetzelfde uit.
4. **E-E-A-T-gegevens zijn grotendeels placeholders** (`src/content/eeat.json`): introductie, opleiding, ervaring, certificaten en LinkedIn van beide adviseurs, `sameAs` (LinkedIn, Google Bedrijfsprofiel, Facebook) en het voorbeeldrapport. Volgens `eeat.mjs` verschijnen die blokken niet in productie. Gevolg: geen `sameAs` in het Organisatie-schema, en `Article.author` is de organisatie in plaats van een deskundige. Reviews zijn niet gecontroleerd op aanwezigheid; `docs/reviews.md` bestaat.
5. **FAQPage-schema op 139 pagina’s.** Google toont FAQ-rich results sinds 2023 alleen nog voor gezaghebbende overheids- en zorgwebsites. Het schema is niet schadelijk, maar levert hier waarschijnlijk geen zichtbaar rich result op.
6. **`/nieuws/` staat in het hoofdmenu en de footer van elke pagina, maar is noindex zolang er geen gepubliceerde berichten zijn.** Dan linkt de hele site naar een lege, niet-indexeerbare pagina. Het werkelijke aantal berichten is onbekend (database).
7. **Nieuwsartikelen: de alt-tekst van de uitgelichte afbeelding kan leeg zijn** (`featured_image_alt` is optioneel) en `article:*`-OG-tags ontbreken. Niet te controleren zonder database.
8. **`noindex` op preview-deploys geldt alleen voor host `mvfunderingsscan.vercel.app`.** Andere Vercel-URL’s (preview- en branchdeploys op `*-<team>.vercel.app`) krijgen die header niet. Volgens de Vercel-documentatie krijgen preview-deploys standaard al `X-Robots-Tag: noindex`; dat is hier niet gecontroleerd.
9. **`robots.txt` blokkeert `/status/` en `/beheer/` én die pagina’s hebben `noindex`.** Door de `Disallow` kan Google de noindex niet lezen. Een URL kan dan zonder snippet in de index komen als er extern naar gelinkt wordt. Kleine kans: de footerlink naar `/beheer/` is `nofollow`.
10. **Weinig variatie in beeld:** 5 foto’s worden over 109 pagina’s hergebruikt (zie §7). Er zijn geen eigen projectfoto’s. Dat is relevant voor Google Afbeeldingen en de geloofwaardigheid van de content.
11. **Regio- en gemeentepagina’s met weinig inkomende contextuele links:** `/funderingsonderzoek-de-fryske-marren/`, `-midden-groningen/`, `-tytsjerksteradiel/`, `-westerkwartier/`, `/funderingsscan-leeuwarden/` (elk 2), en `/kennisbank/kosten-fase-1/` (2). Ze zijn wel bereikbaar via het megamenu. Of de 33 regiopagina’s inhoudelijk genoeg verschillen om niet als *doorway pages* te worden gezien, is in deze inventaris **niet** gemeten.
12. **`site.json → today` staat vast op `2026-10-07`.** Die datum wordt nog gebruikt als fallback voor `<lastmod>`/`dateModified` (pagina’s zonder `<main>`) en in `llms.txt` (“gecontroleerd 2026-10-07”). Hij wordt niet automatisch bijgewerkt.
13. **Geen `hreflang` en geen Engelse URL’s.** De EN-vertaalknop werkt alleen in de browser. Dat is geen fout, maar Engelstalige zoekers vinden de site zo niet.
14. **Pagina’s met weinig tekst in `<main>`** (onder 400 woorden): `/contact/` (297), `/404.html` (43), `/beheer/` (9), `/status/` (278). Voor `/contact/` is dat normaal; de andere zijn noindex.
15. **Geen `SearchAction`** in WebSite-schema (logisch, er is geen zoekfunctie) en **geen image-sitemap**.
16. **Search Console- en Bing-verificatie zijn niet in de code terug te vinden.** Of de site in Search Console staat, is onbekend.

**Wat technisch in orde is** (gecontroleerd): geen kapotte interne links, geen interne links naar redirects, consequent HTTPS + www + slash aan het eind, zelf-refererende canonicals die gelijk zijn aan de sitemap-URL’s, unieke titles, descriptions en H1’s, één H1 per pagina, alle `<img>` met alt, width en height, responsive WebP met lazy loading, preload van de hero, geldige JSON-LD, 301-redirects voor oude URL’s en het domein zonder www, `noindex` op 404 en portaal, menu volledig crawlbaar zonder JavaScript.

---

## 13. Overzichtstabel: alle bestaande pagina’s

*Groep* uit `urls.json`; *Title/Descr.* = aantal tekens (⚠ = title > 60); *Canonical* “zelf” = zelf-refererend; *Inkomend context.* = aantal andere pagina’s dat vanuit de inhoud linkt; *Content-afb.* = aantal `<img>` in `<main>`. Dynamische nieuwspagina’s staan hier niet in, omdat ze niet uit de code te halen zijn (zie §2b).

| # | URL | Groep | Title (tekens) | Descr. (tekens) | H1 aanwezig | Canonical | Indexeerbaar | Sitemap | Priority | Lastmod | Woorden in <main> | H2’s | Content-afb. | Alt ontbreekt | Inkomend context. | Structured data |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `/` | home | 64 ⚠ | 156 | Ja | zelf | Ja | Ja | 1.0 | 2026-10-30 | 3761 | 16 | 5 | 0 | 143 | ProfessionalService, WebSite, WebPage, Service×3, FAQPage |
| 2 | `/contact/` | over | 58 | 155 | Ja | zelf | Ja | Ja | 0.6 | 2026-11-02 | 297 | 2 | 0 | 0 | 142 | ProfessionalService, WebSite, ContactPage, BreadcrumbList |
| 3 | `/funderingsscan-aanvragen/` | over | 66 ⚠ | 151 | Ja | zelf | Ja | Ja | 0.8 | 2026-11-02 | 596 | 5 | 0 | 0 | 141 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 4 | `/kennisbank/` | kennisbank | 63 ⚠ | 128 | Ja | zelf | Ja | Ja | 0.6 | 2026-11-02 | 2190 | 11 | 0 | 0 | 74 | ProfessionalService, WebSite, CollectionPage, BreadcrumbList, ItemList |
| 5 | `/funderingsscan/` | diensten | 49 | 153 | Ja | zelf | Ja | Ja | 0.9 | 2026-10-30 | 4107 | 19 | 1 | 0 | 139 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×3, FAQPage |
| 6 | `/quickscan-fundering/` | diensten | 65 ⚠ | 148 | Ja | zelf | Ja | Ja | 0.9 | 2026-11-02 | 3242 | 15 | 1 | 0 | 140 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| 7 | `/fase-0-funderingsonderzoek/` | diensten | 57 | 149 | Ja | zelf | Ja | Ja | 0.9 | 2026-10-30 | 5441 | 25 | 1 | 0 | 140 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| 8 | `/fase-1-funderingsonderzoek/` | diensten | 59 | 145 | Ja | zelf | Ja | Ja | 0.8 | 2026-10-30 | 2895 | 12 | 1 | 0 | 139 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| 9 | `/funderingsinspectie/` | diensten | 51 | 150 | Ja | zelf | Ja | Ja | 0.8 | 2026-10-30 | 1645 | 10 | 1 | 0 | 10 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| 10 | `/funderingsmetingen/` | diensten | 63 ⚠ | 136 | Ja | zelf | Ja | Ja | 0.8 | 2026-10-30 | 6674 | 30 | 1 | 0 | 29 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| 11 | `/funderingsrapport/` | diensten | 59 | 151 | Ja | zelf | Ja | Ja | 0.8 | 2026-11-02 | 1602 | 10 | 1 | 0 | 19 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 12 | `/prijzen/` | diensten | 65 ⚠ | 154 | Ja | zelf | Ja | Ja | 0.8 | 2026-10-30 | 1274 | 10 | 1 | 0 | 140 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 13 | `/funderingsonderzoek-woning/` | aankoop | 54 | 149 | Ja | zelf | Ja | Ja | 0.8 | 2026-10-30 | 1977 | 10 | 1 | 0 | 6 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| 14 | `/funderingsonderzoek-bij-aankoop/` | aankoop | 58 | 147 | Ja | zelf | Ja | Ja | 0.8 | 2026-10-30 | 3712 | 17 | 1 | 0 | 45 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| 15 | `/funderingsonderzoek-bij-verkoop/` | aankoop | 58 | 146 | Ja | zelf | Ja | Ja | 0.8 | 2026-10-30 | 2027 | 14 | 1 | 0 | 21 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| 16 | `/funderingsonderzoek-taxatie/` | aankoop | 67 ⚠ | 150 | Ja | zelf | Ja | Ja | 0.8 | 2026-10-30 | 2108 | 10 | 1 | 0 | 37 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| 17 | `/woningeigenaren/` | aankoop | 60 | 150 | Ja | zelf | Ja | Ja | 0.8 | 2026-10-30 | 1305 | 12 | 1 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| 18 | `/makelaars-en-taxateurs/` | aankoop | 47 | 149 | Ja | zelf | Ja | Ja | 0.8 | 2026-10-30 | 1274 | 11 | 1 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 19 | `/over-ons/` | over | 63 ⚠ | 153 | Ja | zelf | Ja | Ja | 0.6 | 2026-11-02 | 1008 | 10 | 1 | 0 | 69 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Person×2, FAQPage |
| 20 | `/bronnen-en-richtlijnen/` | over | 62 ⚠ | 141 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1482 | 11 | 0 | 0 | 77 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 21 | `/werkwijze/` | over | 62 ⚠ | 150 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1722 | 11 | 1 | 0 | 45 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 22 | `/funderingsproblemen/` | problemen | 68 ⚠ | 153 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 2283 | 10 | 1 | 0 | 24 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 23 | `/scheuren-in-gevel/` | problemen | 66 ⚠ | 153 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 3639 | 12 | 1 | 0 | 40 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 24 | `/verzakking-woning/` | problemen | 59 | 148 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 2058 | 10 | 1 | 0 | 24 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 25 | `/scheefstand-woning/` | problemen | 58 | 150 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1927 | 9 | 1 | 0 | 18 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 26 | `/klemmende-deuren-en-ramen/` | problemen | 65 ⚠ | 143 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1395 | 8 | 0 | 0 | 18 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 27 | `/problemen-met-houten-palen/` | problemen | 62 ⚠ | 145 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1944 | 11 | 1 | 0 | 26 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 28 | `/fundering-op-staal/` | problemen | 59 | 146 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1780 | 9 | 1 | 0 | 18 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 29 | `/funderingsproblemen-veen/` | problemen | 62 ⚠ | 146 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1470 | 9 | 0 | 0 | 21 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 30 | `/funderingsproblemen-klei/` | problemen | 62 ⚠ | 146 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1404 | 9 | 0 | 0 | 20 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 31 | `/werkgebied/` | regio | 67 ⚠ | 157 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1853 | 10 | 1 | 0 | 44 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 32 | `/funderingsonderzoek-friesland/` | regio | 52 | 152 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1650 | 10 | 1 | 0 | 30 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 33 | `/funderingsscan-friesland/` | regio | 54 | 153 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1364 | 10 | 1 | 0 | 5 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 34 | `/funderingsonderzoek-groningen/` | regio | 59 | 148 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1509 | 10 | 1 | 0 | 27 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 35 | `/funderingsscan-groningen/` | regio | 54 | 149 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1332 | 11 | 1 | 0 | 6 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 36 | `/funderingsonderzoek-leeuwarden/` | regio | 50 | 151 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1379 | 11 | 1 | 0 | 19 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 37 | `/funderingsonderzoek-sneek/` | regio | 48 | 154 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1336 | 11 | 1 | 0 | 17 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 38 | `/funderingsonderzoek-harlingen/` | regio | 52 | 156 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1308 | 11 | 1 | 0 | 12 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 39 | `/funderingsonderzoek-drachten/` | regio | 51 | 154 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1324 | 11 | 1 | 0 | 13 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 40 | `/funderingsonderzoek-heerenveen/` | regio | 50 | 145 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1371 | 11 | 1 | 0 | 14 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 41 | `/funderingsonderzoek-groningen-stad/` | regio | 54 | 157 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1354 | 11 | 1 | 0 | 19 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 42 | `/funderingsonderzoek-appingedam/` | regio | 53 | 151 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1298 | 10 | 1 | 0 | 14 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 43 | `/funderingsonderzoek-delfzijl/` | regio | 51 | 145 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1270 | 10 | 1 | 0 | 13 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 44 | `/kennisbank/wat-is-een-funderingsscan/` | kennisbank | 61 ⚠ | 149 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1308 | 9 | 1 | 0 | 4 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 45 | `/kennisbank/wat-is-een-quickscan-fundering/` | kennisbank | 51 | 154 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1098 | 9 | 0 | 0 | 4 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 46 | `/kennisbank/wat-is-fase-0/` | kennisbank | 58 | 153 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1094 | 9 | 0 | 0 | 5 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 47 | `/kennisbank/wat-is-fase-1/` | kennisbank | 54 | 149 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1109 | 9 | 1 | 0 | 5 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 48 | `/kennisbank/verschil-fase-0-en-fase-1/` | kennisbank | 52 | 152 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1078 | 9 | 0 | 0 | 9 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 49 | `/kennisbank/wat-kost-een-funderingsscan/` | kennisbank | 49 | 153 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 999 | 9 | 0 | 0 | 8 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 50 | `/kennisbank/wat-kost-fase-0/` | kennisbank | 50 | 139 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1011 | 9 | 0 | 0 | 6 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 51 | `/kennisbank/hoe-lang-duurt-funderingsonderzoek/` | kennisbank | 55 | 145 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1019 | 9 | 0 | 0 | 5 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 52 | `/kennisbank/wat-wordt-onderzocht/` | kennisbank | 45 | 156 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1079 | 11 | 1 | 0 | 8 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 53 | `/kennisbank/wanneer-funderingsonderzoek/` | kennisbank | 57 | 143 | Ja | zelf | Ja | Ja | 0.6 | 2026-11-02 | 1088 | 10 | 0 | 0 | 6 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 54 | `/kennisbank/heb-ik-een-funderingsscan-nodig/` | kennisbank | 61 ⚠ | 149 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1033 | 10 | 0 | 0 | 7 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 55 | `/kennisbank/funderingsscan-bij-aankoop/` | kennisbank | 48 | 155 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1060 | 10 | 1 | 0 | 9 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 56 | `/kennisbank/funderingsscan-bij-verkoop/` | kennisbank | 60 | 155 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1059 | 10 | 1 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 57 | `/kennisbank/funderingsscan-en-taxatie/` | kennisbank | 64 ⚠ | 158 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1248 | 10 | 0 | 0 | 7 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 58 | `/kennisbank/funderingsscan-en-hypotheek/` | kennisbank | 47 | 155 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1126 | 10 | 0 | 0 | 8 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 59 | `/kennisbank/funderingsrapport-lezen/` | kennisbank | 54 | 149 | Ja | zelf | Ja | Ja | 0.6 | 2026-11-02 | 1006 | 10 | 1 | 0 | 20 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 60 | `/kennisbank/wat-na-een-quickscan/` | kennisbank | 51 | 151 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1028 | 11 | 0 | 0 | 19 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 61 | `/kennisbank/wanneer-fase-1/` | kennisbank | 44 | 148 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1049 | 10 | 0 | 0 | 6 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 62 | `/kennisbank/scheuren-in-woning/` | kennisbank | 66 ⚠ | 155 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1088 | 8 | 1 | 0 | 7 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 63 | `/kennisbank/scheuren-in-gevel/` | kennisbank | 60 | 138 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1168 | 9 | 1 | 0 | 7 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 64 | `/kennisbank/scheuren-in-metselwerk/` | kennisbank | 64 ⚠ | 153 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1036 | 8 | 1 | 0 | 7 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 65 | `/kennisbank/verzakking-woning/` | kennisbank | 60 | 158 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1023 | 9 | 1 | 0 | 6 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 66 | `/kennisbank/scheefstand/` | kennisbank | 64 ⚠ | 146 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1080 | 9 | 1 | 0 | 14 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 67 | `/kennisbank/klemmende-deuren/` | kennisbank | 52 | 144 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1011 | 8 | 1 | 0 | 8 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 68 | `/kennisbank/kruipruimte-inspectie/` | kennisbank | 64 ⚠ | 155 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1046 | 9 | 1 | 0 | 12 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 69 | `/kennisbank/houten-paalfundering/` | kennisbank | 64 ⚠ | 154 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1073 | 9 | 1 | 0 | 83 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 70 | `/kennisbank/fundering-op-staal/` | kennisbank | 67 ⚠ | 153 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1052 | 10 | 1 | 0 | 47 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 71 | `/kennisbank/veenbodem/` | kennisbank | 62 ⚠ | 149 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1075 | 10 | 1 | 0 | 34 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 72 | `/kennisbank/kleibodem/` | kennisbank | 54 | 157 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1042 | 9 | 1 | 0 | 28 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 73 | `/kennisbank/bodemdaling/` | kennisbank | 68 ⚠ | 158 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1067 | 10 | 1 | 0 | 66 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 74 | `/kennisbank/grondwater-en-fundering/` | kennisbank | 65 ⚠ | 149 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1048 | 10 | 1 | 0 | 25 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 75 | `/kennisbank/funderingsrisico/` | kennisbank | 63 ⚠ | 152 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1115 | 9 | 1 | 0 | 11 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 76 | `/kennisbank/funderingsherstel/` | kennisbank | 64 ⚠ | 150 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1029 | 9 | 1 | 0 | 10 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 77 | `/kennisbank/kosten-funderingsherstel/` | kennisbank | 67 ⚠ | 153 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1054 | 10 | 1 | 0 | 9 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 78 | `/kennisbank/funderingsproblemen-friesland/` | kennisbank | 65 ⚠ | 152 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1010 | 10 | 1 | 0 | 7 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 79 | `/kennisbank/funderingsproblemen-groningen/` | kennisbank | 65 ⚠ | 148 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1019 | 9 | 1 | 0 | 7 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 80 | `/kennisbank/lintvoegwaterpassing/` | kennisbank | 56 | 149 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 4340 | 25 | 1 | 0 | 47 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 81 | `/kennisbank/loodmeting/` | kennisbank | 66 ⚠ | 153 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 3289 | 20 | 1 | 0 | 33 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 82 | `/kennisbank/vloerveldwaterpassing/` | kennisbank | 54 | 156 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 2768 | 19 | 1 | 0 | 37 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 83 | `/kennisbank/scheurpatronen/` | kennisbank | 56 | 156 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 3495 | 17 | 1 | 0 | 64 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 84 | `/kennisbank/scheefstandsmeting/` | kennisbank | 65 ⚠ | 146 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1566 | 11 | 1 | 0 | 5 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 85 | `/kennisbank/hoogtemeting/` | kennisbank | 60 | 153 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1466 | 12 | 1 | 0 | 7 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 86 | `/kennisbank/zettingsmeting/` | kennisbank | 64 ⚠ | 154 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1439 | 11 | 1 | 0 | 10 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 87 | `/kennisbank/scheurmeting/` | kennisbank | 60 | 154 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1312 | 11 | 1 | 0 | 4 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 88 | `/kennisbank/monitoring-scheuren/` | kennisbank | 61 ⚠ | 148 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1402 | 11 | 1 | 0 | 16 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 89 | `/kennisbank/maaiveldhoogte/` | kennisbank | 64 ⚠ | 150 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1179 | 9 | 1 | 0 | 4 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 90 | `/kennisbank/grondwatermeting/` | kennisbank | 64 ⚠ | 156 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1144 | 9 | 1 | 0 | 6 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 91 | `/kennisbank/wat-is-funderingsonderzoek/` | kennisbank | 63 ⚠ | 152 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1709 | 12 | 1 | 0 | 4 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 92 | `/kennisbank/archiefonderzoek-fundering/` | kennisbank | 66 ⚠ | 153 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1976 | 16 | 1 | 0 | 27 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 93 | `/kennisbank/visuele-funderingsinspectie/` | kennisbank | 64 ⚠ | 151 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1970 | 14 | 1 | 0 | 45 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 94 | `/kennisbank/funderingsrisico-inschatting/` | kennisbank | 62 ⚠ | 152 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1743 | 13 | 1 | 0 | 43 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 95 | `/kennisbank/zetting/` | kennisbank | 55 | 153 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1611 | 12 | 1 | 0 | 39 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 96 | `/kennisbank/ongelijke-zetting/` | kennisbank | 59 | 156 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1427 | 10 | 1 | 0 | 46 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 97 | `/kennisbank/paalfundering/` | kennisbank | 63 ⚠ | 145 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1452 | 10 | 1 | 0 | 6 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 98 | `/kennisbank/paalrot/` | kennisbank | 60 | 158 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1541 | 11 | 1 | 0 | 14 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, DefinedTerm, FAQPage |
| 99 | `/kennisbank/zandbodem/` | kennisbank | 62 ⚠ | 150 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1067 | 9 | 1 | 0 | 13 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 100 | `/kennisbank/peilverschillen/` | kennisbank | 53 | 154 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1402 | 11 | 1 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 101 | `/kennisbank/scheuren-boven-kozijnen/` | kennisbank | 53 | 155 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1385 | 9 | 1 | 0 | 8 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 102 | `/kennisbank/scheuren-bij-aanbouw/` | kennisbank | 49 | 145 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1308 | 9 | 1 | 0 | 12 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 103 | `/kennisbank/klemmende-ramen/` | kennisbank | 57 | 152 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1241 | 9 | 1 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 104 | `/kennisbank/helling-in-vloer/` | kennisbank | 54 | 145 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1465 | 10 | 1 | 0 | 11 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 105 | `/kennisbank/funderingsonderzoek-voor-bod/` | kennisbank | 64 ⚠ | 146 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1490 | 10 | 1 | 0 | 5 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 106 | `/kennisbank/funderingsrisico-bij-aankoop/` | kennisbank | 59 | 153 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1383 | 10 | 1 | 0 | 4 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 107 | `/kennisbank/funderingsrapport-voor-verkoper/` | kennisbank | 49 | 155 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1167 | 10 | 1 | 0 | 4 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 108 | `/kennisbank/kosten-fase-1/` | kennisbank | 53 | 136 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1126 | 10 | 0 | 0 | 2 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Article, FAQPage |
| 109 | `/fase-0-funderingsonderzoek-aankoop/` | diensten | 58 | 148 | Ja | zelf | Ja | Ja | 0.8 | 2026-10-30 | 1754 | 12 | 1 | 0 | 6 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service, FAQPage |
| 110 | `/funderingsonderzoek-franeker/` | regio | 51 | 156 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1334 | 11 | 1 | 0 | 11 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 111 | `/funderingsonderzoek-haren/` | regio | 48 | 152 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1314 | 10 | 1 | 0 | 10 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 112 | `/funderingsonderzoek-veendam/` | regio | 50 | 154 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1326 | 11 | 1 | 0 | 15 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 113 | `/funderingsonderzoek-winschoten/` | regio | 53 | 154 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1319 | 11 | 1 | 0 | 13 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 114 | `/funderingsscan-leeuwarden/` | regio | 55 | 153 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1207 | 11 | 1 | 0 | 2 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 115 | `/kennisbank/begrippenlijst/` | kennisbank | 54 | 156 | Ja | zelf | Ja | Ja | 0.6 | 2026-11-02 | 1131 | 15 | 0 | 0 | 28 | ProfessionalService, WebSite, CollectionPage, BreadcrumbList, DefinedTermSet |
| 116 | `/funderingsonderzoek-achtkarspelen/` | regio | 68 ⚠ | 153 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1286 | 10 | 1 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 117 | `/funderingsonderzoek-dantumadiel/` | regio | 61 ⚠ | 151 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1203 | 9 | 1 | 0 | 5 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 118 | `/funderingsonderzoek-de-fryske-marren/` | regio | 61 ⚠ | 157 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1261 | 10 | 1 | 0 | 2 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 119 | `/funderingsonderzoek-noardeast-fryslan/` | regio | 65 ⚠ | 149 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1161 | 9 | 1 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 120 | `/funderingsonderzoek-ooststellingwerf/` | regio | 64 ⚠ | 146 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1161 | 10 | 1 | 0 | 4 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 121 | `/funderingsonderzoek-opsterland/` | regio | 66 ⚠ | 145 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1335 | 10 | 1 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 122 | `/funderingsonderzoek-tytsjerksteradiel/` | regio | 60 | 154 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1273 | 10 | 1 | 0 | 2 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 123 | `/funderingsonderzoek-weststellingwerf/` | regio | 61 ⚠ | 158 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1226 | 10 | 1 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 124 | `/funderingsonderzoek-eemsdelta/` | regio | 62 ⚠ | 148 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1322 | 10 | 1 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 125 | `/funderingsonderzoek-het-hogeland/` | regio | 66 ⚠ | 144 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1221 | 10 | 1 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 126 | `/funderingsonderzoek-midden-groningen/` | regio | 63 ⚠ | 152 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1459 | 11 | 1 | 0 | 2 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 127 | `/funderingsonderzoek-pekela/` | regio | 61 ⚠ | 153 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1357 | 11 | 1 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 128 | `/funderingsonderzoek-stadskanaal/` | regio | 65 ⚠ | 148 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1272 | 11 | 1 | 0 | 4 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 129 | `/funderingsonderzoek-westerkwartier/` | regio | 68 ⚠ | 158 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1184 | 10 | 1 | 0 | 2 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 130 | `/funderingsonderzoek-westerwolde/` | regio | 62 ⚠ | 153 | Ja | zelf | Ja | Ja | 0.7 | 2026-10-30 | 1305 | 11 | 1 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, Service×2, FAQPage |
| 131 | `/hulpmiddelen/` | hulpmiddelen | 53 | 155 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1036 | 8 | 0 | 0 | 10 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 132 | `/gratis-funderingscheck/` | hulpmiddelen | 46 | 158 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1510 | 7 | 0 | 0 | 140 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 133 | `/vertel-wat-je-ziet/` | hulpmiddelen | 51 | 151 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1120 | 6 | 0 | 0 | 5 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 134 | `/welke-stap-past-bij-mij/` | hulpmiddelen | 57 | 154 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1329 | 5 | 0 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 135 | `/kosten-funderingsonderzoek-berekenen/` | hulpmiddelen | 52 | 155 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1139 | 6 | 0 | 0 | 5 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 136 | `/welke-fundering-heeft-mijn-woning/` | hulpmiddelen | 52 | 148 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 750 | 5 | 0 | 0 | 4 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 137 | `/funderingsrisicoklasse-uitgelegd/` | hulpmiddelen | 65 ⚠ | 152 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1298 | 6 | 0 | 0 | 8 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 138 | `/huis-kopen-funderingscheck/` | hulpmiddelen | 52 | 152 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 1303 | 5 | 0 | 0 | 4 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 139 | `/meetwaarden-uitgelegd/` | hulpmiddelen | 54 | 152 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 554 | 5 | 0 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 140 | `/funderingsquiz/` | hulpmiddelen | 50 | 155 | Ja | zelf | Ja | Ja | 0.6 | 2026-10-30 | 892 | 5 | 0 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 141 | `/privacyverklaring/` | over | 42 | 128 | Ja | zelf | Ja | Ja | 0.6 | 2026-11-02 | 1899 | 15 | 0 | 0 | 3 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| 142 | `/algemene-voorwaarden/` | over | 45 | 124 | Ja | zelf | Ja | Ja | 0.6 | 2026-11-02 | 2209 | 20 | 0 | 0 | 1 | ProfessionalService, WebSite, WebPage, BreadcrumbList, FAQPage |
| – | `/404.html` | foutpagina | 40 | 83 | Ja | – | Nee (noindex) | Nee | – | – | 43 | 0 | 0 | 0 | 0 | – (geen) |
| – | `/beheer/` | portaal | 26 | 53 | **Nee** | – | Nee (noindex) | Nee | – | – | 9 | 0 | 0 | 0 | 0 | – (geen) |
| – | `/status/` | portaal | 46 | 93 | Ja | – | Nee (noindex) | Nee | – | – | 278 | 4 | 0 | 0 | 0 | – (geen) |

---

### Wat ontbreekt in dit rapport (niet beschikbaar uit de code)
- Live HTTP-statuscodes, live headers en de daadwerkelijk gedeployde versie (de live site is niet bezocht).
- Aantal en inhoud van gepubliceerde nieuwsberichten, en medewerkers uit Supabase.
- Gegevens uit Search Console, Google Analytics of Vercel Analytics (indexatiestatus, verkeer, zoektermen).
- Core Web Vitals en laadtijden (niet gemeten).
- Inhoudelijke kwaliteit en uniekheid van teksten (niet beoordeeld; alleen woordenaantallen).
- Externe backlinks.
