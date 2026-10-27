# Voorbeeldrapport op de site

Op drie plekken staat een blok **Bekijk een voorbeeldrapport**:

- `/kennisbank/` (bovenaan, onder de gidsen)
- `/kennisbank/funderingsrapport-lezen/` (na "Uit welke onderdelen bestaat een funderingsrapport?")
- `/funderingsrapport/` (na "Wat staat er in een funderingsrapport?")

Zolang er geen pdf is ingesteld, staat het blok **niet** op de live site. Met `npm run dev` zie je een geel placeholdervak.

## Zo zet je het online

1. Kies een echt, afgerond rapport en vraag de opdrachtgever om toestemming (liefst schriftelijk of per mail).
2. Maak een geanonimiseerde kopie (zie de checklist hieronder) en exporteer die als pdf.
3. Zet de pdf in `public/assets/`, bijvoorbeeld `public/assets/voorbeeldrapport.pdf`. Gebruik een naam zonder adres of klantnaam.
4. Vul in `src/content/eeat.json` in: `"rapportvoorbeeld": "/assets/voorbeeldrapport.pdf"`.
5. Draai `npm run build`. Staat het bestand er niet, dan stopt de build met een melding, zodat er nooit een kapotte link online komt.

De bestandsgrootte wordt automatisch bij de knop gezet. Houd de pdf liefst onder 5 MB (foto's comprimeren bij het exporteren).

## Checklist anonimiseren

Haal weg of maak onherkenbaar:

- [ ] Naam, adres, telefoon en e-mail van de opdrachtgever
- [ ] Straat, huisnummer en postcode van het object. Plaats of regio mag blijven als dat niet herleidbaar is (bijvoorbeeld "Leeuwarden" wel, een klein dorp met één straat liever niet)
- [ ] Kadastrale aanduiding, BAG-ID, coördinaten, kaartuitsneden en luchtfoto's
- [ ] Ordernummer, dossiernummer en factuurgegevens
- [ ] Op foto's: huisnummers, naambordjes, kentekens, gezichten, post en papieren, en herkenbare gevels of straatbeelden
- [ ] Namen van makelaar, notaris, taxateur of andere betrokkenen
- [ ] Precieze inspectiedatum (vervang eventueel door maand en jaar)
- [ ] Verborgen gegevens in de pdf: auteur, titel en opmerkingen (Word: Bestand → Info → Document inspecteren, vóór het exporteren)

Pas **geen** meetwaarden, bevindingen of conclusies aan. Het moet een echt rapport blijven; alleen herleidbare gegevens gaan eruit. Zet op het voorblad bijvoorbeeld "Voorbeeldrapport, geanonimiseerd".

Controleer de pdf daarna nog één keer in zijn geheel, inclusief bijlagen en kop- en voetteksten.
