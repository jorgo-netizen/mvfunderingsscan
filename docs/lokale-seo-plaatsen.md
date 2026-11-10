# Lokale SEO/GEO: plaatspagina's Friesland, Groningen en Noord-Drenthe

Uitbreiding van november 2026. Layout, CSS, componenten en URL's van bestaande pagina's zijn niet veranderd. Bestaande tekst is niet herschreven; er zijn alleen secties en FAQ's toegevoegd.

## Wat is er veranderd

| Onderdeel | Wijziging |
|---|---|
| 33 bestaande plaatspagina's | Uitgebreid naar 1.300 tot 1.700 woorden. Elke pagina heeft nu typische funderingsrisico's, de mogelijke uitkomsten, voorbereiding, wat de scan niet doet, en 5–6 FAQ's die ook in het FAQPage-schema staan. Wijkpagina's: Leeuwarden (11 wijken), Groningen-stad (10 wijken plus Ten Boer), Drachten en Assen. Gemeentepagina's hebben nu een eigen alinea per hoofdkern. Het gaat om de drie provinciehubs, 12 stadspagina's en 18 gemeentepagina's. |
| Nieuwe pagina's | `/funderingsonderzoek-assen/`, `/funderingsonderzoek-tynaarlo/`, `/funderingsonderzoek-noordenveld/` en `/funderingsonderzoek-aa-en-hunze/`. Ze staan in `src/content/pages/gemeenten-x.json`. |
| Noord-Drenthe | Telt nu als volwaardig werkgebied: de 4 gemeenten staan in `site.json` en de hub toont automatisch de gemeentelijst. Er is een derde kolom in het menu Werkgebied, Noord-Drenthe staat in de plaatsenindex op `/werkgebied/`, en Assen staat in de footer. |
| Schema | Elke plaatspagina krijgt een extra Service "Funderingsonderzoek {plaats}" met de gemeente en de kernen als werkgebied. In de organisatie-schema's komen geen Drentse gemeenten dubbel voor. |
| Titels | Drie titels waren langer dan 60 tekens en zijn ingekort: `/funderingsmetingen/`, `/funderingsrisicoklasse-uitgelegd/` en `/funderingsonderzoek-eemsdelta/`. De overige lange titels hoefden niet ingekort te worden: het sjabloon haalt daar de merknaam al automatisch weg. |
| Sitemap en llms.txt | De nieuwe pagina's worden automatisch opgenomen. `seo/nulmeting.json` is opnieuw vastgelegd. |

## Nog te bevestigen door MV Funderingsscan

Deze feiten zijn voorzichtig verwoord, maar niet tegen een bron gecontroleerd. Klopt iets niet, dan pas je de zin aan in het betreffende JSON-bestand in `src/content/pages/`.

**Friesland**
- **Leeuwarden, bouwperiodes:**
  - Vrijheidswijk: kort na de Tweede Wereldoorlog
  - Bilgaard: jaren '60 en '70
  - Aldlân: jaren '60
  - Nijlân: jaren '70
  - Camminghaburen: jaren '70 en '80
  - Huizum, Hollanderwijk en Oldegalileën: vooroorlogs
  - Zuiderburen: een van de jongere wijken
- **Leeuwarden, overig:** Grou ligt aan het Pikmeer, Stiens is ontstaan op een terp.
- **Drachten:** De Wiken en De Folgeren zijn naoorlogs, Drachten-Azeven is jong.
- **Sneek en Heerenveen:** er staan geen wijken op de pagina; de schrijver wist de namen niet zeker. Lever wijknamen aan als je die wilt.
- **Gemeentepagina's:** de korte typeringen van kernen, zoals Gorredijk aan de Compagnonsvaart, Haulerwijk als ontginningsdorp en Balk aan de rand van Gaasterland.
- **Friesland-hub:** de indeling van gemeenten in klei, veen en zand.

**Groningen**
- **Groningen-stad, bouwperiodes:**
  - Oosterpoort: rond 1900
  - Oosterparkwijk: tussen de wereldoorlogen
  - Selwerd: jaren '60
  - Paddepoel: jaren '60 en '70
  - Lewenborg: vanaf de jaren '70
  - Beijum: eind jaren '70 en '80
  - Helpman: zandige ondergrond
- **Schilderswijk of Schildersbuurt:** welke naam gebruik je?
- **Gaswinning:** de tekst noemt alleen Loppersum, Appingedam, Delfzijl, Ten Boer en Slochteren expliciet als gebied boven het Groningenveld.
- **Loppersum:** de zin "bij een deel van de woningen is in het kader van de versterking al onderzoek gedaan".
- **Kernen:** de korte typeringen, zoals Winsum aan het Reitdiep, Warffum als wierdedorp en Vlagtwedde en Sellingen aan de Ruiten Aa.

**Noord-Drenthe**
- **Assen:** de bouwperiodes van Assen-Oost, Pittelo en Marsdijk.
- **Ligging:** Zuidlaren ten opzichte van het Zuidlaardermeer, en of Gieten, Annen, Gasselte en Eext op de Hondsrug liggen.
- **Veenhuizen:** de monumenten, en het advies om vooraf met de gemeente te overleggen.

**Echte gegevens die de pagina's sterker maken (niet verzonnen):**
- praktijkcases per plaats, geanonimiseerd, via `src/content/cases/`;
- welke funderingstypes en uitkomsten je per regio in de praktijk ziet;
- echte reviews via `eeat.json`.
