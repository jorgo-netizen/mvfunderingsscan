# SEO-, Local SEO-, GEO- en conversie-eindrapport – MV Funderingsscan

Datum: 2 november 2026. Basis: de bestaande audit (`SEO-AUDIT.md`, `SEO-WIJZIGINGEN.md`), de huidige codebase, marktonderzoek op internet en metingen op de gebouwde en de live site.

---

## Concurrentie en kansen (samenvatting van het marktonderzoek)

| Bevinding | Bron | Wat het betekent voor MV |
|---|---|---|
| Een QuickScan kost bij een landelijke aanbieder "meestal € 600 tot € 1.200" voor een eengezinswoning. DeeLing (regio Noord) rekent € 399 exclusief btw. | zoekresultaten van commerciële aanbieders; deelingfunderingscheck.nl | € 350 **inclusief** btw is scherp. Het staat nu overal duidelijk, inclusief btw. We claimen niet "goedkoopst". |
| Volgens de KCAF-richtlijn voor de QuickScan moet de beoordeling worden gedaan door een deskundige van een **erkend** bedrijf. De Friese subsidie eist een bureau op de **KCAF-erkenningslijst**. | KCAF-richtlijn (addendum 2025/2026); Subsidieregeling Funderingsonderzoek Fries Veenweidegebied | **De belangrijkste autoriteitskans en het grootste risico.** Of MV op de erkenningslijst staat, is niet bekend; de site claimt het nergens. Zie open actie 1. |
| Concurrenten schrijven nauwelijks over **subsidie** voor funderingsonderzoek. Ook MV had er geen pagina over. | eigen controle (0 pagina's) | Nieuw artikel met de officiële voorwaarden, zie A. |
| Concurrenten zoals DeeLing werken met **namen en gezichten** (adviseurs met direct nummer). | eerdere vergelijking | De namen staan erin. Foto's en achtergrond ontbreken nog (open actie 3). |
| De meeste regionale concurrenten hebben weinig of geen kennisbank. | eerdere vergelijking | MV heeft 68 kennisartikelen, een sterke basis voor zowel GEO als SEO. |

Er is geen tekst van concurrenten overgenomen.

---

## Keyword mapping (hoofdpagina's)

Het volledige overzicht van alle 144 URL's staat in `SEO-PAGINAS.md`, dat opnieuw te maken is met `node scripts/seo-rapport.mjs`. Er zijn geen dubbele hoofdzoekwoorden.

| URL | Primair zoekwoord | Secundaire zoekwoorden | Intentie | Prioriteit |
|---|---|---|---|---|
| / | funderingsonderzoek | funderingsscan, onafhankelijk funderingsonderzoek, Friesland, Groningen, Noord-Drenthe | commercieel | 1 |
| /funderingsscan/ | funderingsscan | funderingsscan woning, wat is een funderingsscan | commercieel | 1 |
| /quickscan-fundering/ | quickscan fundering (funderingsquickscan) | quick scan fundering, funderingsquickscan | commercieel | 1 |
| /fase-0-funderingsonderzoek/ | fase 0 funderingsonderzoek | funderingsrisico-onderzoek, vooronderzoek fundering | commercieel/informatief | 1 |
| /fase-1-funderingsonderzoek/ | fase 1 funderingsonderzoek | lintvoegwaterpassing, loodmeting, vloerveldwaterpassing | commercieel | 1 |
| /funderingsinspectie/ | funderingsinspectie | inspectie fundering, kruipruimte | commercieel | 2 |
| /funderingsonderzoek-woning/ | funderingsonderzoek woning | woning laten onderzoeken | commercieel | 2 |
| /prijzen/ | prijzen funderingsscan | funderingsonderzoek kosten, inclusief btw | commercieel | 1 |
| /kosten-funderingsonderzoek-berekenen/ | kosten funderingsonderzoek | kostenwijzer | commercieel/tool | 2 |
| /funderingsscan-aanvragen/ | funderingsscan aanvragen | funderingsonderzoek aanvragen | transactioneel | 1 |
| /funderingsonderzoek-bij-aankoop/ | funderingsonderzoek bij aankoop | woning kopen fundering, voorbehoud | commercieel | 1 |
| /funderingsonderzoek-bij-verkoop/ | funderingsonderzoek bij verkoop | verkoop woning fundering, mededelingsplicht | commercieel | 2 |
| /funderingsonderzoek-taxatie/ | funderingsonderzoek taxatie | risicoklasse D of E, funderingslabel | commercieel | 1 |
| /makelaars-en-taxateurs/ | funderingsonderzoek makelaar taxateur | taxatierapport fundering | commercieel B2B | 2 |
| /woningeigenaren/ | funderingsonderzoek woningeigenaar | scheuren, twijfel over fundering | commercieel | 2 |
| /funderingsproblemen/ | funderingsproblemen woning | funderingsschade, signalen | informatief/commercieel | 1 |
| /scheuren-in-gevel/ | scheuren in gevel | scheur door verzakking, scheurpatronen | informatief | 1 |
| /verzakking-woning/ | verzakking woning | verzakkende woning, zetting | informatief | 2 |
| /problemen-met-houten-palen/ | problemen houten palen | paalrot, houten funderingspalen | informatief | 2 |
| /kennisbank/funderingsrisico/ | funderingsrisico | funderingsrisico woning | informatief | 2 |
| /funderingsrisicoklasse-uitgelegd/ | funderingsrisicoklasse funderingslabel | label A–E | informatief | 2 |
| /kennisbank/bodemdaling/ | bodemdaling | grondwaterstand en fundering | informatief | 3 |
| /kennisbank/subsidie-funderingsonderzoek-friesland/ | subsidie funderingsonderzoek friesland | veenweidegebied, KCAF-erkenningslijst | informatief | 2 (nieuw) |
| /funderingsonderzoek-friesland/ | funderingsonderzoek friesland | veen, klei, houten palen Friesland | lokaal commercieel | 1 |
| /funderingsscan-friesland/ | funderingsscan friesland | Quick Scan Friesland aanvragen | lokaal transactioneel | 2 |
| /funderingsonderzoek-groningen/ | funderingsonderzoek groningen | provincie Groningen, gaswinning, Hondsrug | lokaal commercieel | 1 |
| /funderingsscan-groningen/ | funderingsscan groningen | scan los van schademelding | lokaal transactioneel | 2 |
| /funderingsonderzoek-noord-drenthe/ | funderingsonderzoek noord-drenthe | Assen, Roden, Zuidlaren, zand en veen | lokaal commercieel | 1 (nieuw) |
| /funderingsonderzoek-leeuwarden/ | funderingsonderzoek leeuwarden | houten palen Leeuwarden, binnenstad | lokaal commercieel | 1 |
| /funderingsscan-leeuwarden/ | funderingsscan leeuwarden | Quick Scan Leeuwarden | lokaal transactioneel | 2 |

---

## A. Uitgevoerde verbeteringen

### Technische SEO
| Wat | Bestanden |
|---|---|
| **robots.txt:** `/beheer/` en `/status/` worden niet meer geblokkeerd. Ze houden noindex (meta-tag en `X-Robots-Tag`), en dat kan Google nu ook lezen. Alleen `/api/` blijft dicht. | `scripts/build.mjs` |
| **Vercel-previews:** alle `*.vercel.app`-adressen, ook previewdeploys, krijgen `X-Robots-Tag: noindex`. | `vercel.json` |
| **Lange titels:** titels boven 60 tekens verliezen in de HTML de toevoeging " \| MV Funderingsscan" (de merknaam staat al in `og:site_name` en in de sitenaam die Google toont). Dat raakt 63 pagina's. De bronteksten zijn niet veranderd. | `src/lib/layout.mjs` |
| **Open Graph:** kennisbankartikelen hebben `og:type` article met `article:published_time` en `article:modified_time`. Pagina's met een eigen foto hebben een eigen deelafbeelding van 1200×630 (`/assets/og/`) in plaats van de algemene. | `src/lib/layout.mjs`, `src/lib/template.mjs`, `scripts/build.mjs`, `public/assets/og/` |
| **Wijzigingsdatums** (vorige ronde): per pagina, alleen bij een inhoudelijke wijziging; nu ook in de article-tijden. De vaste datum in `site.json` dient alleen nog als reserve. | `scripts/build.mjs`, `src/content/lastmod.json` |
| **Inhoudscontrole:** bedragen anders dan €350 en €950 mogen alleen als een pagina ze letterlijk uit een bron overneemt (`bron_bedragen` + `bron_url`). De bescherming tegen verzonnen prijzen blijft dus staan. | `scripts/check-content.mjs` |

### On-page en interne links
- **Contextuele links naar pagina's met te weinig inkomende links:**

  | Pagina | Inkomende links, van → naar |
  |---|---|
  | `/kennisbank/kosten-fase-1/` | 2 → 5 |
  | `/woningeigenaren/` | 3 → 6 |
  | `/makelaars-en-taxateurs/` | 3 → 5 |
  | `/funderingsscan-leeuwarden/` | 2 → 4 |

  Bronpagina's: prijzen, de kostenartikelen, scheuren in de gevel, verzakking, wanneer funderingsonderzoek, taxatie, aankoop, Funderingsscan Friesland en werkgebied.
- **Vorige ronde:** de vier overlappende zoekwoordparen zijn opgelost; de homepage heeft een kortere titel en een betere description; "funderingsquickscan" en "funderingsproblemen woning" hebben een doelpagina.

### Local SEO
- **Nieuwe pagina `/funderingsonderzoek-noord-drenthe/`.** Jullie werkgebied, maar er was nog geen eigen pagina.
  - Gemeenten: Assen, Tynaarlo, Noordenveld en Aa en Hunze.
  - Bodem: Hondsrug, Drents Plateau, beekdalen en de veenkoloniale dorpen, voorzichtig geformuleerd.
  - Woningtypen, werkwijze en taxatie.
  - Gelinkt vanaf de homepage, het werkgebied, de pagina Groningen en de footer.
- **Coördinaten van het kantoor** in de bedrijfsgegevens (vorige ronde).
- **De regiopagina's zijn onderscheidend:** hooguit 15% gelijke tekst tussen twee pagina's, gemiddeld 8,6% (gemeten op reeksen van 5 woorden). Samenvoegen of noindex is niet nodig.

### GEO en deskundigheid
- **Nieuw kennisartikel `/kennisbank/subsidie-funderingsonderzoek-friesland/`.** Uitsluitend gebaseerd op de officiële regeling, met een link naar lokaleregelgeving.overheid.nl. Het artikel noemt de bedragen, wie in aanmerking komt, de eisen (KCAF-erkend bureau, onderzoek volgens de KCAF-richtlijnen) en de stappen, en zegt eerlijk dat een Quick Scan een vooronderzoek is. Er wordt niet gesuggereerd dat MV erkend is.
- **Al aanwezig en gecontroleerd:**
  - antwoordgerichte opbouw: elke sectie begint met een direct antwoord (`answer-first`);
  - een pagina met bronnen en richtlijnen;
  - llms.txt met kernfeiten: prijzen inclusief btw, Noord-Drenthe, terugbellen, adviseurs;
  - robots.txt die zoekmachines en AI-crawlers toelaat.

### Conversie en meting
- **Nieuw signaal "aanvraag_gestart"** bij de eerste invoer in een aanvraag- of contactformulier. Het meetplan dekt daarmee:
  - aanvraag gestart;
  - aanvraag verstuurd;
  - formulier in de hulpmiddelen verstuurd;
  - telefoonklik;
  - mailklik;
  - klik naar het aanvraagformulier.
- **GA4 laadt alleen na toestemming** en staat uit tot de meet-ID is ingevuld (vorige ronde). In de signalen zitten geen persoonsgegevens.

---

## B. Kwaliteitscontrole

| Controle | Resultaat |
|---|---|
| Productiebuild | ✅ 145 pagina's (144 indexeerbaar + 404), geen fouten |
| Inhoudscontrole (`npm run check`) | ✅ geen fouten |
| Tests (`npm test`) | ✅ 35 van 35, waarvan één test aangepast aan de nieuwe robots-strategie: hij controleert nu de noindex via meta-tag en header, en noindex op alle vercel.app-adressen |
| SEO-audit (`npm run audit`, 147 pagina's) | ✅ geen problemen: één H1, unieke title en description, canonicals, Open Graph, alt-teksten, interne links en ankers, JSON-LD, FAQ-schema, sitemap en robots |
| Sitemap | ✅ 144 URL's, alleen indexeerbare canonieke pagina's, met een wijzigingsdatum per pagina |
| Onbedoelde noindex | ✅ alleen `/404.html`, `/beheer/` en `/status/` (bewust) |
| Dubbele hoofdzoekwoorden | ✅ geen |
| Prijzen en bedrijfsclaims | ✅ ongewijzigd: €350 en €950 inclusief btw. De subsidiebedragen staan alleen op het subsidieartikel, met bron. |
| Mobiele weergave | ✅ nieuwe pagina gecontroleerd op 375 px: geen horizontaal scrollen, afbeeldingen laden, één H1 |
| Formulieren | ✅ ongewijzigd; formulier- en API-tests geslaagd |
| Redirects | ✅ ongewijzigd (16), geen ketens |

**Nog op de live site doen na de push:**
- de **Rich Results Test** op de homepage en op `/kennisbank/subsidie-funderingsonderzoek-friesland/`;
- **PageSpeed Insights** (mobiel). De API had zijn daglimiet bereikt; de eigen meting gaf LCP 0,22 s en CLS 0.

---

## C. Openstaande acties

### Informatie die ontbreekt (alleen jullie kunnen dit leveren)
1. **KCAF-erkenning.** Staat MV Funderingsscan B.V. (of staan de adviseurs) op de erkenningslijst van het KCAF? Zo ja: dat is het sterkste bewijs van deskundigheid, en het kan dan op de site, in de structured data en in het subsidieartikel. Zo nee: overweeg erkenning aan te vragen. Het wordt steeds vaker gevraagd, ook voor subsidie.
2. **De certificaatnummers** CE240260817-02/-03: van welke organisatie zijn die?
3. **De adviseurs:** foto (via het portaal), opleiding, ervaring, LinkedIn.
4. **Echte reviews**, met toestemming, met de bron erbij (bijvoorbeeld Google).
5. **Een voorbeeldrapport** (geanonimiseerd of duidelijk fictief) en **echte cases** met toestemming.
6. **De GA4-meet-ID.**

### Acties buiten GitHub
- **Google Search Console:**
  - domein verifiëren (TXT bij Hostnet);
  - `sitemap.xml` en `nieuws-sitemap.xml` indienen;
  - de belangrijkste pagina's laten indexeren.
- **Bing Webmaster Tools:** importeren vanuit Search Console. Bing voedt ook Copilot en ChatGPT Search.
- **Google Bedrijfsprofiel:**
  - naam MV Funderingsscan;
  - adres Mr. P.J. Troelstraweg 149 unit 23;
  - telefoon +31 (0) 582037172;
  - website www.mvfunderingsquickscan.nl;
  - hoofdcategorie in de lijn van "bouwkundig adviesbureau" (kies de best passende uit Google's lijst);
  - werkgebied Friesland, Groningen en Noord-Drenthe;
  - echte foto's;
  - openingstijden ma–vr 9–17.
- **Bing Places:** importeren vanuit het Google Bedrijfsprofiel.
- **Bedrijvengidsen:** alleen relevante, met naam, adres en telefoon precies gelijk aan de site (bijvoorbeeld Telefoonboek, Openingstijden.nl en de regionale ondernemersvereniging).
- **Vakvermeldingen:** de KCAF-erkenningslijst, als die er komt. Een vermelding bij het Fries Funderingsloket kan alleen als zij aanbieders vermelden, en dat moet je navragen.
- **Samenwerkingen met makelaars of taxateurs:** alleen als ze echt bestaan; dan eventueel een vermelding op hun site.
- **Reviews vragen:** na elk opgeleverd rapport, met een link in de rapportmail.

### Echte foto's met de meeste waarde
De site gebruikt nu vijf foto's. Echte foto's van eigen werk zijn het waardevolst op:
- `/funderingsinspectie/` en `/fase-0-funderingsonderzoek/`: een inspectie, de kruipruimte, het opmeten van een scheur;
- `/fase-1-funderingsonderzoek/` en de kennisbankartikelen over metingen (lintvoeg, lood, vloerveld): de instrumenten in gebruik;
- `/over-ons/` en `/contact/`: de adviseurs en het kantoor;
- `/funderingsonderzoek-leeuwarden/`, `/funderingsonderzoek-groningen-stad/` en `/funderingsonderzoek-noord-drenthe/`: herkenbare straatbeelden, zonder huisnummers;
- `/funderingsrapport/`: een (geanonimiseerde) rapportpagina.

Lever ze aan via mij. Ik zet ze dan in WebP met `srcset` en alt-teksten erin, en ook als deelafbeelding.

---

## D. Meetplan

De site staat sinds eind oktober 2026 op dit domein. Er is dus nog **geen historische data**. Technische verbeteringen zijn nu klaar; resultaten in Google en in AI-antwoorden zie je pas na indexering en na een paar weken meten.

| Moment | Wat bekijken | Waar | Werkt de strategie als… |
|---|---|---|---|
| **Dag 0–7** | Domein geverifieerd, sitemaps ingediend; 0 fouten bij Pagina-indexering. Google Bedrijfsprofiel aangemaakt en geverifieerd. GA4 actief (als de ID er is). | Search Console, Bing, Google Bedrijfsprofiel | …sitemaps "geslaagd" zijn en er geen crawl- of indexeringsfouten zijn. |
| **Dag 30** | Hoeveel van de 144 pagina's zijn geïndexeerd; eerste **vertoningen** en zoekvragen; Core Web Vitals (veldgegevens zodra die er zijn); aanvragen in het portaal; Vercel-bezoekers. | Search Console (Prestaties, Pagina's), Vercel Analytics, portaal | …de meeste pagina's geïndexeerd zijn en er vertoningen zijn op merk-, regio- en dienstzoekwoorden. Weinig klikken is normaal; posities zijn nog onrustig. |
| **Dag 60** | Zoekvragen met veel vertoningen maar weinig klikken; per pagina de positie en CTR. Aandeel organisch verkeer in de aanvragen. Lokale zichtbaarheid in Google Maps (statistieken van het Bedrijfsprofiel). | Search Console, Google Bedrijfsprofiel, GA4 | …regio- en dienstpagina's in de top 20 tot 30 staan op hun hoofdzoekwoord. Zo niet: titel, introductie en interne links per pagina aanscherpen op de echte zoekvragen. |
| **Dag 90** | Trend in klikken en aanvragen; welke pagina's aanvragen opleveren (`generate_lead` per landingspagina); vermeldingen in AI-antwoorden (handmatig steekproeven: stel ChatGPT, Perplexity en Copilot dezelfde 10 vragen, zoals "funderingsonderzoek Leeuwarden" en "wat kost een funderingsscan", en noteer of MV genoemd of gelinkt wordt); aantal en score van reviews. | Search Console, GA4, Bedrijfsprofiel, steekproef in AI-diensten | …organische klikken en aanvragen maand op maand stijgen. Daarna: content uitbreiden waar de vraag aantoonbaar is (nieuwe zoekvragen uit Search Console), niet op gevoel. |

---

## E. Eerlijke beoordeling

| Onderdeel | Beoordeling |
|---|---|
| **Technische SEO** | **Sterk.** Statische, snelle site (LCP 0,22 s, CLS 0 gemeten). Juiste canonicals, sitemap met echte datums, robots en noindex op orde, previews afgeschermd, geldige structured data. Weinig over om te verbeteren. |
| **On-page SEO** | **Goed.** Unieke titels en descriptions, één H1, antwoordgerichte opbouw en geen overlap tussen hoofdzoekwoorden. Verder verbeteren vraagt gegevens uit Search Console, geen giswerk. |
| **Local SEO** | **Goed op de site, zwak daarbuiten.** 34 onderscheidende regiopagina's (nu ook Noord-Drenthe), adres, coördinaten en werkgebied in de structured data. Maar het Google Bedrijfsprofiel, reviews en lokale vermeldingen ontbreken nog, en juist die wegen zwaar in Maps en de lokale resultaten. |
| **GEO-gereedheid** | **Goed.** Duidelijke, consistente bedrijfsfeiten, directe antwoorden, bronnen, llms.txt en open voor AI-crawlers. Of AI-diensten MV ook noemen, hangt vooral af van externe vermeldingen en autoriteit, en die zijn er nog nauwelijks. |
| **Contentkwaliteit** | **Sterk.** 68 kennisartikelen met een eigen invalshoek, regiopagina's met lokale bodeminformatie en een nieuw, gesourced subsidieartikel. Aandachtspunt: de kennisbank is groot voor een nieuwe site. Voeg alleen nog toe waar Search Console vraag laat zien. |
| **Deskundigheid en betrouwbaarheid** | **Matig, en dat is nu de grootste beperking.** Namen van de adviseurs, KvK-nummer, adres en onafhankelijkheid zijn duidelijk. Maar foto's, achtergrond, certificaten of KCAF-erkenning, reviews, een voorbeeldrapport en cases ontbreken. Dat is het eerste wat Google, AI-diensten en klanten missen. |
| **Conversie** | **Goed.** Prijs inclusief btw zichtbaar, dezelfde dag terugbellen, korte aanvraagroute, rapport binnen 2 werkdagen, mobiele belknop en een eerlijke uitleg van Quick Scan tegenover fase 1. Meten kan zodra GA4 actief is. |
| **Resterende risico's** | (1) **KCAF-erkenning:** concurrenten en subsidies werken met die lijst. Zonder erkenning kan MV voor een deel van de klanten (subsidie, sommige taxaties) minder geschikt zijn. Wees daar transparant over. (2) **Nieuw domein:** autoriteit moet nog worden opgebouwd. (3) **De AI-redactie:** concepten moeten altijd door een mens worden gecontroleerd, om fouten en een stapel dunne inhoud te voorkomen. (4) **Weinig eigen foto's.** |

Geen scores of posities geclaimd: er zijn nog geen meetgegevens.
