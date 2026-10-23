# Handleiding – QuickScan-rapporten in het beheerportaal

Met deze module stel je in het beheerportaal (`/beheer/` → **Rapporten**) het rapport *Fase 0 Funderingsrisico-onderzoek (QuickScan)* op. Het Word-bestand dat het portaal maakt volgt het originele rapport (`rapport-sjabloon/origineel/fase0-rapport-origineel.docx`). Vaste teksten, opmaak, tabellen, kop- en voetteksten blijven gelijk. Alleen de velden, foto's en meetregels die jij invult, worden aangevuld.

> **Belangrijk.** De applicatie bepaalt nooit zelf het funderingsrisico, de schadetypering of het advies. Dat doet de adviseur. Het portaal controleert alleen of alles is ingevuld en wijst op mogelijke inconsistenties.

---

## 1. Eenmalig inrichten

1. **Database.** Open in Supabase de **SQL Editor**, plak de inhoud van `supabase/migrations/002_mvfs_rapporten.sql` en klik op **Run**. Dit doe je na `001_mvfs_basis.sql`, en het mag vaker worden uitgevoerd. Het script maakt:
   - de tabellen `mvfs_advisors`, `mvfs_reports`, `mvfs_report_images` en `mvfs_report_versions`;
   - de nummering `QS-<jaar>-<volgnummer>`;
   - de privé-opslagmap `rapport-bestanden`.

   De adviseurs Melvin Krikke (CE240260817-02) en Rutger Fopma (CE240260817-03) worden er direct in gezet.
2. **Vercel.** Er zijn geen nieuwe omgevingsvariabelen nodig. Je gebruikt dezelfde `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` en `RESEND_API_KEY` als bij Track & Trace. In `vercel.json` krijgt de beheerfunctie het rapportsjabloon mee (`includeFiles`).
3. **Adviseur koppelen aan een account.** Ga naar **Rapporten → Adviseurs** (alleen beheerder) en kies bij elke adviseur het bijbehorende medewerkersaccount. Maak het account eerst aan met `npm run beheer:gebruiker` (zie de implementatiehandleiding).
   - Alleen het gekoppelde account of een beheerder mag een rapport van die adviseur **definitief maken**, de **PDF vastleggen**, **versturen** en een **nieuwe versie** starten.
   - Iedere medewerker mag rapporten aanmaken en invullen.

## 2. Een rapport maken

1. Klik op **Rapporten → Nieuw rapport**.
2. Kies de bijbehorende QuickScan-aanvraag. Naam, adres, postcode, plaats, e-mailadres en (indien bekend) woningtype en bouwjaar worden dan overgenomen. Je kunt ook zonder aanvraag beginnen.
3. Het rapportnummer wordt automatisch en uniek toegekend.

Het rapport opent als stappenformulier in de volgorde van het rapport:

| Stap | Wat je invult | Komt in het rapport op |
|---|---|---|
| Voorblad | objectadres, postcode, plaats, datum uitgebracht, adviseur (certificaatnummer volgt automatisch), status, foto voorblad | voorblad, kop- en voettekst, ondertekening |
| A. Opdracht / opname | inspectiedatum en -tijd, gegevens opdrachtgever, e-mailadres (alleen voor verzending) | hoofdstuk Algemeen |
| B. Object | type woning (keuzelijst), bouwjaar, weertype (keuzelijst), temperatuur, luchtvochtigheid | hoofdstuk Object |
| C. Vraagstelling | datum (leeg = inspectiedatum), reden en bestemming (keuzelijsten). Je ziet direct hoe de zin wordt. | hoofdstuk Vraagstelling |
| D. Conclusie | risicocategorie laag / midden / hoog **plus bevestiging**, advies, plaats en datum van opmaak, 1 tot 4 foto's | hoofdstuk Conclusie, pijltje op het voorblad |
| E. Bouwtekeningen | ontvangen ja/nee, fysiek/digitaal, jaartal, soort fundering (keuzelijst), 1 tot 4 afbeeldingen | hoofdstuk Archief – bouwtekeningen |
| F. Bodemdalingskaart | mm per jaar en typering (keuzelijst), of "niet beschikbaar" met toelichting; bron en datum (intern), 1 tot 4 afbeeldingen | hoofdstuk Archief – bodemdalingskaart |
| G. Omgevingsfactoren | resultaat, 1 tot 4 afbeeldingen | hoofdstuk Omgevingsfactoren |
| H. Lintvoegmeting | meetpunten, meetregels, 1 tot 4 foto's, of "niet uitgevoerd" met motivatie | hoofdstuk Lintvoegmeting |
| I. Schietloodmeting | meetpunten, meetregels, 1 tot 4 foto's, of "niet uitgevoerd" met motivatie | hoofdstuk Schietloodmeting |
| Uitkomst en afronden | controle, voorbeeld, Word, definitief, PDF, versturen, versies | – |

- **Opslaan.**
  - Klik op **Opslaan**, of ga naar een andere stap; dan wordt automatisch opgeslagen.
  - Valt de verbinding weg, dan blijft je invoer in de browser bewaard. Bij het opnieuw openen vraagt het portaal of je die wilt terugzetten.
- **Keuzelijsten.** Type woning, weertype, reden, bestemming, soort fundering, typering bodemdaling en schadetypering kies je uit een vaste lijst; vrije tekst is daar niet mogelijk. De lijsten staan op één plek in `api/_lib/rapport.js` (`KEUZES`). Moet er een optie bij, dan pas je die lijst aan.
- **Foto's.**
  - Bij elk hoofdstuk met foto's voeg je er minimaal 1 en maximaal 4 toe (het voorblad heeft één vaste foto). Na elke foto verschijnt een nieuw leeg vak tot het maximum is bereikt.
  - Per vak kies je een foto. Die wordt in de browser verkleind (max. 2000 px) en zonder EXIF-gegevens (zoals GPS-locatie) als JPEG opgeslagen.
  - Je kunt een bijschrift toevoegen; dat komt cursief onder de foto in het rapport.
  - In Word komt de eerste foto passend in het originele fotovak, met behoud van de verhouding. Extra foto's komen direct eronder, twee naast elkaar (ca. 8 × 6 cm), met de bijschriften als "Foto 2: …" eronder. Bij de lintvoegmeting staan de vier vakken al in het sjabloon.
- **Meetregels.**
  - Per regel zie je ter controle de verhouding (afstand ÷ meting) en de klasse uit de tabel van het rapport.
  - De schadetypering kies je zelf (Zeer klein, Klein, Matig, Groot of Zeer groot, zoals in de tabel van het rapport).

## 3. Controleren

Op **Uitkomst en afronden** zie je twee soorten meldingen:

- **Nog in te vullen.** Verplichte onderdelen die ontbreken, met een link naar de juiste stap. Zolang deze er zijn, kan het rapport niet definitief worden.
- **Aandachtspunten.** Deze blokkeren niet, maar vragen om inhoudelijke controle:
  - de stellige slotzin van de vraagstelling;
  - het verschil tussen de bodemdalingstekst en het stroomschema;
  - bodemdaling tussen 2 en 3 mm per jaar;
  - een schadetypering die afwijkt van de rotatieklasse;
  - bouwtekeningen gemarkeerd als "niet ontvangen".

**Voorbeeld rapport bekijken** opent een leesbare weergave van de tekst. Dat is geen exacte paginaweergave; **Download Word (concept)** geeft het echte document. Ontbrekende velden staan daarin in rood als `[ veldnaam ]`.

Bij het openen vraagt Word of velden moeten worden bijgewerkt. Kies **Ja**, dan kloppen de paginanummers in de inhoudsopgave.

## 4. Definitief maken

1. Kies **Definitief maken** en bevestig de getoonde risicocategorie.
2. Het portaal maakt het Word-bestand van deze versie en bewaart het samen met een kopie van alle ingevulde gegevens, de foto's en de sjabloonversie.
3. Een definitieve versie wordt **nooit overschreven**. Wil je iets aanpassen, kies dan **Nieuwe versie starten**. Er komt dan versie 2 bij en versie 1 blijft ongewijzigd beschikbaar.

## 5. PDF en versturen

1. Klik bij de versie op **Download Word**, open het bestand in Word, controleer het en kies **Bestand → Opslaan als → PDF**.
2. Upload die PDF bij **PDF uploaden**. Het portaal controleert of het echt een PDF is.
3. Bij **Versturen naar de klant** staat het e-mailadres uit het rapport of de aanvraag. Typ het adres **nogmaals** ter controle. Daarna bevestig je de verzending.
4. Als het rapport aan een aanvraag is gekoppeld, kun je aanvinken dat het rapport ook op de **trackingpagina** van de klant komt. De status van de aanvraag wordt dan "Rapport afgerond".
5. Een verstuurde versie kan niet per ongeluk nog eens worden verstuurd. Wil je dat wel, gebruik dan bewust **Opnieuw versturen**.
6. Elke verzending staat in de **Verzendhistorie**, met ontvanger, tijdstip en medewerker. Ook een mislukte poging wordt vastgelegd.

## 6. Pijltje uitkomst Fase 0

- **Voorblad.** Het pijltje staat boven Laag, Midden of Hoog risico, volgens de bevestigde keuze van de adviseur. Zolang er geen keuze is, staat er geen pijltje.
- **Trackingpagina.** Zodra het rapport van een gekoppelde aanvraag definitief is, ziet de klant daar dezelfde balk met het pijltje en de tekst van de uitkomst. Op de openbare homepage staat geen uitkomst; daar horen geen klantgegevens.

## 7. Inhoudelijke aandachtspunten (niet door de applicatie aangepast)

De vaste teksten zijn letterlijk overgenomen uit het aangeleverde rapport. Laat deze punten inhoudelijk beoordelen:

1. **Vraagstelling.** De vaste slotzin "Met betrekking tot de fundering dient te worden aangetoond dat de fundering geen risico heeft op funderingsproblemen" is stellig voor een visueel Fase 0-onderzoek.
2. **Bodemdaling.**
   - De tekst noemt tot 2 mm/jaar "klein" en meer dan 3 mm/jaar "groot". Voor 2–3 mm/jaar is er geen typering.
   - Het stroomschema hanteert 0–2 / 2–4 / >4 mm/jaar.
3. **Rotatieklassen.** De tabel van hoofdstuk H en I (F3O) wordt alleen gebruikt om een afwijkende schadetypering te signaleren. De applicatie kiest de typering niet.
4. **Bouwtekeningen.** De vaste tekst van hoofdstuk E gaat ervan uit dat tekeningen zijn ontvangen.
5. **Bedrijfsnaam.** In het rapport staan de vaste teksten met "Midea Vastgoed Adviseurs". Dat is zo gelaten.

## 8. Sjabloon aanpassen

Wijzig je het originele Word-rapport, doe dan het volgende:

1. Vervang `rapport-sjabloon/origineel/fase0-rapport-origineel.docx`.
2. Voer `node scripts/maak-rapportsjabloon.mjs` uit. Het script controleert de verwachte teksten per alinea en stopt met een duidelijke melding als de structuur is veranderd.
3. Er ontstaat een nieuwe sjabloonversie (`rapport-sjabloon/sjabloon-versie.json`). Elke definitieve versie onthoudt met welke sjabloonversie ze is gemaakt.

## 9. Technisch overzicht

- **Bestanden.**

  | Bestand | Rol |
  |---|---|
  | `api/_lib/rapport.js` | controle, Word-generatie, voorbeeld |
  | `api/_lib/rapport-api.js` | beheeracties |
  | `api/_lib/zip.js` | zip lezen en schrijven, zonder externe pakketten |
  | `public/beheer.js` | schermen |
  | `public/portaal.css` | opmaak |

- **Rechten.** Alle acties lopen via `/api/beheer/` met sessie, rol en CSRF-controle. Alleen bekende velden met een maximale lengte worden bewaard.
- **Opslag.** Bestanden staan in de privé-opslagmap `rapport-bestanden` en zijn alleen bereikbaar via kortlopende links (2 minuten voor downloads, 15 minuten voor foto's in het portaal).
- **Tests.** `npm test` bevat tests voor:
  - veldfiltering, rapportnummers en de volledigheidscontrole;
  - rechten bij definitief maken;
  - Word-inhoud;
  - PDF-controle;
  - versturen met adrescontrole en blokkade van dubbele verzending;
  - versiebeheer;
  - de uitkomst op de trackingpagina.

  Ze draaien tegen de lokale testdatabase. De koppeling met Supabase zelf controleer je na livegang met één testrapport. Gebruik daarvoor fictieve gegevens en je eigen e-mailadres als ontvanger.
