# SEO/GEO-plan MV Funderingsscan – lokale vindbaarheid

Stand: 22 oktober 2026. Gebaseerd op `src/content/urls.json`, `src/content/site.json` (gemeenten en kernen) en de gebouwde pagina's.

## Uitgangspunten

- **Werkgebied:** Friesland en Groningen. **Drenthe is geen werkgebied** (bevestigd door de eigenaar op 22-10-2026). Daarom zijn er geen Drentse pagina's gemaakt en wordt Drenthe nergens als werkgebied genoemd.
- **Geen dunne pagina's:** er komt geen pagina per dorp waarin alleen de plaatsnaam verschilt. Elke gemeente heeft één pagina met eigen lokale inhoud (bodem, bebouwing, signalen). Kernen staan op die pagina en in de plaatsenindex van `/werkgebied/`.
- **Centrale data:** gemeenten en kernen staan op één plek, in `src/content/site.json` → `gemeenten[].kernen`. Daaruit worden het kernenblok per gemeentepagina, de plaatsenindex op `/werkgebied/` en `areaServed` in de structured data opgebouwd.
- **Niets verzonnen:** geen lokale projecten, klantverhalen, vestigingen of meetresultaten.

## 1. Bestaande lokale pagina's (33)

| Niveau | Pagina's |
|---|---|
| Werkgebied | `/werkgebied/` (met plaatsenindex van alle kernen) |
| Provincie | `/funderingsonderzoek-friesland/`, `/funderingsscan-friesland/`, `/funderingsonderzoek-groningen/`, `/funderingsscan-groningen/` |
| Stad (eigen pagina) | `/funderingsonderzoek-leeuwarden/`, `/funderingsscan-leeuwarden/`, `/funderingsonderzoek-sneek/`, `/funderingsonderzoek-harlingen/`, `/funderingsonderzoek-drachten/`, `/funderingsonderzoek-heerenveen/`, `/funderingsonderzoek-franeker/`, `/funderingsonderzoek-groningen-stad/`, `/funderingsonderzoek-appingedam/`, `/funderingsonderzoek-delfzijl/`, `/funderingsonderzoek-haren/`, `/funderingsonderzoek-veendam/`, `/funderingsonderzoek-winschoten/` |
| Gemeente (Friesland) | Achtkarspelen, Dantumadiel, De Fryske Marren, Noardeast-Fryslân, Ooststellingwerf, Opsterland, Tytsjerksteradiel, Weststellingwerf |
| Gemeente (Groningen) | Eemsdelta, Het Hogeland, Midden-Groningen, Pekela, Stadskanaal, Westerkwartier, Westerwolde |

## 2. Dekking van de onderzoekslijst

Alle plaatsen uit de opdracht vallen al onder een bestaande pagina. Er is daarom **geen nieuwe lokale pagina** gemaakt.

| Plaats | Valt onder | URL |
|---|---|---|
| Leeuwarden, Grou, Stiens | gemeente Leeuwarden | `/funderingsonderzoek-leeuwarden/` |
| Sneek, Bolsward | Súdwest-Fryslân | `/funderingsonderzoek-sneek/` |
| Heerenveen | Heerenveen | `/funderingsonderzoek-heerenveen/` |
| Drachten | Smallingerland | `/funderingsonderzoek-drachten/` |
| Harlingen | Harlingen | `/funderingsonderzoek-harlingen/` |
| Franeker | Waadhoeke | `/funderingsonderzoek-franeker/` |
| Dokkum | Noardeast-Fryslân | `/funderingsonderzoek-noardeast-fryslan/` |
| Joure, Lemmer | De Fryske Marren | `/funderingsonderzoek-de-fryske-marren/` |
| Wolvega | Weststellingwerf | `/funderingsonderzoek-weststellingwerf/` |
| Burgum | Tytsjerksteradiel | `/funderingsonderzoek-tytsjerksteradiel/` |
| Oosterwolde | Ooststellingwerf | `/funderingsonderzoek-ooststellingwerf/` |
| Groningen, Haren | gemeente Groningen | `/funderingsonderzoek-groningen-stad/` (Haren ook: `/funderingsonderzoek-haren/`) |
| Hoogezand | Midden-Groningen | `/funderingsonderzoek-midden-groningen/` |
| Veendam | Veendam | `/funderingsonderzoek-veendam/` |
| Stadskanaal | Stadskanaal | `/funderingsonderzoek-stadskanaal/` |
| Winschoten | Oldambt | `/funderingsonderzoek-winschoten/` |
| Delfzijl, Appingedam | Eemsdelta | `/funderingsonderzoek-eemsdelta/` (ook eigen pagina's Delfzijl en Appingedam) |
| Zuidhorn, Leek | Westerkwartier | `/funderingsonderzoek-westerkwartier/` |
| Uithuizen, Bedum | Het Hogeland | `/funderingsonderzoek-het-hogeland/` |
| Assen, Emmen, Hoogeveen, Meppel, Coevorden, Roden, Beilen, Klazienaveen, Borger, Zuidlaren, Smilde, Diever | Drenthe – **geen werkgebied** | niet aangemaakt |

## 3. Voorgestelde nieuwe pagina's

Geen. Een aparte pagina voor bijvoorbeeld Joure of Dokkum voegt op dit moment weinig toe naast de gemeentepagina die die plaats al behandelt. Een losse plaatspagina is pas zinvol als er **echte, controleerbare lokale inhoud** is die niet op de gemeentepagina past, bijvoorbeeld:

- (geanonimiseerde) praktijkvoorbeelden uit die plaats;
- openbare gemeentelijke informatie over funderingen, zoals een funderingsloket of subsidieregeling, met bronvermelding.

## 4. Mogelijk samenvoegen (nog niet uitgevoerd: eerst Search Console bekijken)

Deze paren richten zich op bijna dezelfde zoekvraag en kunnen elkaar beconcurreren (kannibalisatie). Beslis pas over samenvoegen met een 301-redirect als de Search Console-data na livegang laat zien welke pagina rankt.

| Paar | Advies |
|---|---|
| `/funderingsonderzoek-friesland/` ↔ `/funderingsscan-friesland/` | Houden zolang de zoekintentie verschilt (onderzoek of scan). Zijn de vertoningen laag of overlappend, dan samenvoegen. |
| `/funderingsonderzoek-groningen/` ↔ `/funderingsscan-groningen/` | Idem. |
| `/funderingsonderzoek-leeuwarden/` ↔ `/funderingsscan-leeuwarden/` | Idem. |
| `/funderingsonderzoek-delfzijl/` en `/funderingsonderzoek-appingedam/` ↔ `/funderingsonderzoek-eemsdelta/` | Overlap met de gemeentepagina. Kandidaat om samen te voegen in de Eemsdelta-pagina. |
| `/funderingsonderzoek-haren/` ↔ `/funderingsonderzoek-groningen-stad/` | Haren is sinds 2019 deel van de gemeente Groningen. Kandidaat om samen te voegen. |

## 5. Pagina's die nog niet gepubliceerd moeten worden

- Alle Drentse pagina's (geen werkgebied).
- Plaatspagina's zonder eigen controleerbare lokale inhoud.
- `/praktijkvoorbeelden/` verschijnt pas automatisch zodra er echte cases in `src/content/cases/` staan.

## 6. Nieuw: nieuws (GEO en SEO)

| Route | Doel | Zoekintentie | Structured data | Indexering |
|---|---|---|---|---|
| `/nieuws/` | Overzicht van gepubliceerde berichten | informatief / actueel | `CollectionPage`, `BreadcrumbList` | `noindex` zolang er geen berichten zijn, daarna index |
| `/nieuws/<slug>/` | Artikel | informatief | `NewsArticle` (auteur alleen als de medewerker dat aanzet, anders de organisatie), `BreadcrumbList` | index; concepten geven 404 |
| `/nieuws-sitemap.xml` | Sitemap met gepubliceerde berichten | – | – | vermeld in `robots.txt` |

- **Interne links:** het nieuwsoverzicht staat in de footer van elke pagina. Medewerkers linken vanuit artikelen naar diensten en kennisbankpagina's met `[tekst](/pagina/)`.
- **Advies:** schrijf alleen nieuws met een echte aanleiding, zoals nieuwe regelgeving (NRVT/NHG) of gemeentelijke regelingen in Friesland en Groningen, met bron. Elk bericht linkt naar minstens één dienst- of kennisbankpagina.

## 7. Bewust niet geïndexeerd

`/status/` (Track & Trace), `/beheer/` en `/api/`: `noindex` via meta-tag en `X-Robots-Tag`, geblokkeerd in `robots.txt` en niet opgenomen in de sitemap.
