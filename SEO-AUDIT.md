# SEO-audit – mvfunderingsquickscan.nl (uitgangssituatie, 2 november 2026)

Onderzocht in de codebase en op de gebouwde site (`dist/`), met `npm run audit` (bestaande controle van alle pagina's), een eigen inventarisatie en een meting op de live site met mobiele schermgrootte.

## 1. Techniek en routing

| Onderdeel | Bevinding |
|---|---|
| Framework | Geen Next.js: een eigen statische sitegenerator in Node (`scripts/build.mjs`). Pagina's worden opgebouwd uit `src/content/pages/*.json`, `src/templates/home-main.html` en `src/lib/*.mjs`. Uitvoer naar `dist/`. |
| Hosting | Vercel (GitHub → automatische deploy). `cleanUrls` en `trailingSlash: true`. |
| Dynamische routes | `/nieuws/` en `/nieuws/<slug>/` (serverless, uit Supabase) en `/nieuws-sitemap.xml`. Daarnaast API's onder `/api/` (formulieren, Track & Trace, beheer, redactie, vertaling). |
| Pagina's | **142 indexeerbare pagina's** in `sitemap.xml`, plus nieuwsberichten via `nieuws-sitemap.xml`. Niet indexeerbaar (bewust, `noindex`): `/404.html`, `/beheer/` en `/status/`. |
| Verdeling | home 1, over 7, kennisbank 67, diensten 9, aankoop 6, problemen 9, regio 33, hulpmiddelen 10 |
| Redirects | 16 permanente redirects in `vercel.json`: kaal domein → www, `/index.html` → `/`, en korte oude adressen (bijv. `/fase-0/`). Geen redirectketens gevonden. |
| robots.txt | Aanwezig. Blokkeert alleen `/api/`, `/beheer/` en `/status/`. Zoekmachines en AI-crawlers zijn toegestaan. Verwijst naar beide sitemaps. |
| Canonical | Elke indexeerbare pagina heeft een absolute canonical op `https://www.mvfunderingsquickscan.nl/…/` (met slash). Het vercel.app-adres stuurt `X-Robots-Tag: noindex`. |

## 2. Metadata, koppen en Open Graph

`npm run audit` controleert per pagina: precies één H1, een logische kopstructuur, een unieke title en description met de juiste lengte, canonical, noindex, Open Graph en Twitter, alt-tekst plus breedte en hoogte bij afbeeldingen, interne links en ankers, geldige JSON-LD, FAQ-schema dat overeenkomt met de zichtbare FAQ, en of de sitemap overeenkomt met de pagina's.

**Uitkomst: geen problemen** op alle 145 gecontroleerde pagina's. Open Graph (`og:title`, `og:description`, `og:url`, `og:type`, `og:image`, `og:site_name`, `og:locale`) staat op elke pagina, met `og-mv-funderingsscan.jpg` als standaardafbeelding.

## 3. Structured data

- **Op elke pagina:**
  - `ProfessionalService` (een subtype van LocalBusiness) met naam, KvK-nummer, adres, telefoon, e-mail, openingstijden (ma–vr 09:00–17:00), logo en werkgebied, inclusief de gemeenten in Noord-Drenthe;
  - `WebSite`;
  - `WebPage` en `BreadcrumbList`.
- **Waar het past:** `Service` met `Offer` (prijs inclusief btw), `FAQPage`, `Article` (kennisbank), `DefinedTerm` (begrippen), `NewsArticle` (nieuws) en `Person` (adviseurs op Over ons).
- **Bewust niet:** geen beoordelingen of sterren (er zijn nog geen echte reviews), geen certificaten.

## 4. Afbeeldingen en snelheid

- **Afbeeldingen:** 400 `<img>`-elementen; alle hebben een alt-tekst. De foto's zijn WebP met `srcset` (640, 1024, 1600 en 2000 px), de afbeeldingen onder de vouw laden *lazy*, en de hero-afbeelding wordt vooraf geladen met `fetchpriority`. Het logo wordt via `<picture>` als WebP geleverd (28 kB).
- **Lettertypen:** geen externe lettertypen (systeemfonts).
- **JavaScript:** alles met `defer`.
- **Meting op de live homepage (mobiel, 375 px):**
  - LCP 0,22 s, CLS 0,000;
  - TTFB 43 ms, HTML 21 kB.

  De PageSpeed Insights-API had zijn daglimiet bereikt; een Lighthouse-score staat daarom niet in dit rapport. Doe die meting zelf via pagespeed.web.dev.
- **Grootste resterende bestand:** `styles.css` (121 kB onverkleind, compact via gzip/brotli). Het blokkeert de weergave, zoals bij elke CSS, maar wordt gecachet.

## 5. Gevonden problemen

| # | Probleem | Ernst |
|---|---|---|
| 1 | **Alle 142 URL's hadden in de sitemap dezelfde `lastmod` (2026-10-07)**, ook pagina's die later zijn aangepast. Ook `dateModified` in de structured data en "Laatst inhoudelijk bijgewerkt" gebruikten die vaste datum. | middel |
| 2 | **Vier paren pagina's met hetzelfde hoofdzoekwoord**, die met elkaar konden concurreren: `verzakking woning`, `fundering op staal`, `funderingsonderzoek appingedam` (Appingedam en Eemsdelta) en `wanneer funderingsonderzoek` (kennisbank en stappenhulp). | middel |
| 3 | **Twee doelzoekwoorden zonder eigen pagina als doel:** "funderingsquickscan" en "funderingsproblemen woning". Het hoofdzoekwoord van de homepage was "funderingsscan friesland groningen" in plaats van "funderingsonderzoek". | middel |
| 4 | **De titel van de homepage was 82 tekens** (Google toont ongeveer 60) en de description noemde Noord-Drenthe niet. | laag |
| 5 | **Geen geo-coördinaten** in de bedrijfsgegevens. | laag |
| 6 | **Geen GA4 en geen conversiemeting.** Vercel Web Analytics (zonder cookies) telt alleen bezoekers en pagina's. | wens |
| 7 | **Ontbrekend bewijs van deskundigheid:** achtergrond van de adviseurs, certificaten, een voorbeeldrapport, echte reviews en `sameAs`-profielen. Die blokken staan klaar, maar worden niet getoond zolang ze leeg zijn. | inhoud (gegevens van de opdrachtgever nodig) |
| 8 | **`/algemene-voorwaarden/` heeft weinig inkomende links in de tekst.** Dat is normaal voor een juridische pagina; hij staat wel in de footer. | geen actie |

## 6. Doelzoekwoorden → pagina

| Zoekwoord | Pagina |
|---|---|
| funderingsonderzoek | `/` (homepage) |
| funderingsonderzoek Friesland | `/funderingsonderzoek-friesland/` |
| funderingsonderzoek Groningen | `/funderingsonderzoek-groningen/` (provincie); de stad: `/funderingsonderzoek-groningen-stad/` |
| funderingsonderzoek Leeuwarden | `/funderingsonderzoek-leeuwarden/` |
| funderingsscan | `/funderingsscan/` |
| funderingsquickscan | `/quickscan-fundering/` |
| kosten funderingsonderzoek | `/kosten-funderingsonderzoek-berekenen/` (kostenwijzer); prijzen: `/prijzen/` |
| funderingsonderzoek bij aankoop woning | `/funderingsonderzoek-bij-aankoop/` |
| funderingsonderzoek bij verkoop woning | `/funderingsonderzoek-bij-verkoop/` |
| fase 0 funderingsonderzoek | `/fase-0-funderingsonderzoek/` |
| fase 1 funderingsonderzoek | `/fase-1-funderingsonderzoek/` |
| funderingsproblemen woning | `/funderingsproblemen/` |
| scheuren in gevel door verzakking | `/scheuren-in-gevel/` (gids); verzakking: `/verzakking-woning/` |
| funderingsonderzoek taxatie | `/funderingsonderzoek-taxatie/` |
| funderingsrisico woning | `/kennisbank/funderingsrisico/` |

**Zoekvolumes en posities:** er is geen toegang tot Google Search Console of een zoekwoordtool, dus er zijn geen cijfers over volumes of posities. Na een paar weken Search Console kunnen we op echte gegevens bijsturen.
