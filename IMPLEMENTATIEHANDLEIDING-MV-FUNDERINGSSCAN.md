# Implementatiehandleiding – nieuwsbeheer en QuickScan Track & Trace

Deze handleiding beschrijft wat er nodig is om het beheerportaal, de nieuwspagina's en Track & Trace in productie te nemen. **Zonder deze configuratie werkt de site precies als voorheen:** formulieren mailen naar kantoor, `/nieuws/` toont "nog geen berichten" (noindex) en `/beheer/` meldt dat het portaal nog niet is ingesteld.

## 1. Overzicht

| Onderdeel | Techniek |
|---|---|
| Hosting | Vercel (bestaand). Statische site en serverless functies in `api/`. |
| Database en opslag | Supabase (Postgres en Storage), EU-regio. Aangesproken via de REST-API vanuit de serverless functies, zonder extra npm-pakketten. |
| E-mail | Resend (bestaand), `RESEND_API_KEY`. |
| Inloggen | Eigen implementatie in `api/_lib/auth.js`. Wachtwoorden als scrypt-hash, sessies in de database (alleen een hash van het token), cookie `__Host-mvfs_sessie` (HttpOnly, Secure, SameSite=Strict), CSRF-token per sessie, blokkade na 5 mislukte pogingen per 15 minuten. |
| Serverless functies | `api/aanvraag.js` (bestaand, uitgebreid), `api/lead.js` (ongewijzigd), `api/status.js`, `api/beheer.js`, `api/nieuws.js` (nieuw). Totaal 5. |

## 2. Supabase inrichten (eenmalig)

1. Maak op supabase.com een project aan in een **EU-regio** (bijv. Frankfurt). Op het gratis plan pauzeert een project na een week zonder activiteit. Voor echt klantgebruik is daarom het **Pro-plan** nodig (circa $25 per maand). Controleer de actuele prijs bij Supabase.
2. Ga naar **SQL Editor**, plak de volledige inhoud van `supabase/migrations/001_mvfs_basis.sql` en klik op **Run**. Dit maakt:
   - de tabellen `mvfs_users`, `mvfs_sessions`, `mvfs_login_attempts`, `mvfs_news`, `mvfs_requests`, `mvfs_status_history`, `mvfs_notes` en `mvfs_emails`;
   - de functies `mvfs_register_request` en `mvfs_set_status`;
   - de opslagbuckets `nieuws` (openbaar, alleen afbeeldingen) en `rapporten` (**privé**, alleen PDF).
3. Controleer onder **Table Editor** dat bij alle `mvfs_`-tabellen RLS aan staat. Er horen geen policies te zijn: de publieke sleutel kan dan niets lezen of schrijven.
4. **QuickScan-rapporten:** voer daarna ook `supabase/migrations/002_mvfs_rapporten.sql` uit (SQL Editor → Run). Dit voegt de rapporttabellen, de vaste adviseurs met certificaatnummer en de privé-bucket `rapport-bestanden` toe. Zie `HANDLEIDING-QUICKSCAN-RAPPORTAGE.md`.
5. Kopieer onder **Project Settings → API** de *Project URL* en de geheime server-sleutel (*service_role*, of een *secret key* `sb_secret_…`). **Deel die sleutel nooit en zet hem nooit in de browser of in Git.**

## 3. Omgevingsvariabelen in Vercel

Zie `.env.example`. Stel in onder Vercel → Project → Settings → Environment Variables (Production, en eventueel Preview met een **aparte** testdatabase):

| Variabele | Verplicht | Uitleg |
|---|---|---|
| `SUPABASE_URL` | ja | Project-URL van Supabase |
| `SUPABASE_SERVICE_KEY` | ja | Geheime server-sleutel |
| `RESEND_API_KEY` | ja (bestaat al) | Ook gebruikt voor klantmails |
| `AANVRAAG_FROM` | ja | Afzender op een in Resend **geverifieerd domein**. Met het standaardadres `onboarding@resend.dev` kunnen géén mails naar klanten worden gestuurd. |
| `AANVRAAG_TO` | nee | Standaard info@mvadviseurs.nl |
| `MVFS_SITE_URL` | nee | Standaard `https://www.mvfunderingsscan.nl`. Zet dit op `https://mvfunderingsscan.vercel.app` zolang het domein nog niet gekoppeld is, anders verwijzen de trackinglinks naar een domein dat nog niet werkt. |
| `MVFS_PEPPER` | aanbevolen | Willekeurige geheime tekst (32+ tekens) voor het hashen van IP-adressen bij rate limiting |
| `DEEPL_API_KEY` | nee | Sleutel van de DeepL API. Zonder deze sleutel blijft de vertaalknop verborgen. Zie hoofdstuk 10. |
| `DEEPL_MAAND_LIMIET` | nee | Maximaal aantal tekens per maand dat naar DeepL gaat (standaard 450000). Daarboven stopt de vertaalknop tot de volgende maand. |

Na het instellen: opnieuw deployen.

## 4. Medewerkers toegang geven

Er is geen publieke registratie. Accounts maak je op je eigen computer, met de variabelen `SUPABASE_URL` en `SUPABASE_SERVICE_KEY` alleen in je terminal (niet in een bestand dat in Git komt):

```
npm run beheer:gebruiker -- --email naam@mvadviseurs.nl --naam "Voornaam Achternaam" --rol beheerder
npm run beheer:gebruiker -- --email naam@mvadviseurs.nl --nieuw-wachtwoord
npm run beheer:gebruiker -- --email naam@mvadviseurs.nl --uitschakelen
```

- **Rollen:** `beheerder` mag alles, ook aanvragen definitief verwijderen. `medewerker` mag alles behalve dat.
- **Wachtwoorden:** minimaal 12 tekens. Het script vraagt het wachtwoord zonder het te tonen.
- **Nieuw wachtwoord of uitschakelen:** daarmee eindigen ook alle bestaande sessies van dat account.

Inloggen gaat via `https://www.mvfunderingsscan.nl/beheer/`.

## 5. Hoe Track & Trace werkt

1. Een klant vraagt via het aanvraagformulier of het formulier op de homepage een **Fase 0 Quick Scan** aan.
2. `api/aanvraag.js` registreert de aanvraag. Elk ingevuld formulier heeft een eigen sleutel (`formulier_id`), zodat dubbel versturen geen tweede dossier oplevert. De aanvraag krijgt een dossiernummer (`MV-2026-0001`) en een willekeurig trackingtoken van 256 bits. In de database staat alleen `sha256(token)`.
3. De klant krijgt een e-mail met `https://www.mvfunderingsscan.nl/status/#t=<token>`. Het token staat achter `#` en wordt daardoor **niet naar de server gestuurd**: het komt niet in serverlogs, analytics of Referer-headers. De statuspagina stuurt het token in de body van een POST naar `/api/status/`.
4. De klant ziet alleen het dossiernummer, de status, de data, het bericht voor de klant en (bij "Rapport afgerond") een downloadknop. Naam, adres, e-mail, interne notities en medewerkersnamen worden nooit getoond.
5. Medewerkers wijzigen de status in `/beheer/`. Een **bericht voor de klant** is zichtbaar op de statuspagina. **Interne notities** staan in een aparte tabel en zijn nooit zichtbaar voor de klant.
6. **Rapport:** de medewerker uploadt de PDF rechtstreeks naar de privé-bucket, via een eenmalige ondertekende uploadlink. De klant krijgt pas bij de status "Rapport afgerond" een downloadlink, die **60 seconden** geldig is.
7. **Link opnieuw uitgeven of intrekken** (bijvoorbeeld als een klant de link per ongeluk heeft gedeeld): de oude link werkt direct niet meer. Een nieuwe link gaat alleen per e-mail naar de klant.

De e-mailstatus staat per aanvraag in het portaal:
- *verzonden*: Resend heeft de mail geaccepteerd. Dat zegt nog niets over aflevering.
- *mislukt*: met de foutmelding erbij.

Dubbele mails worden voorkomen met een `Idempotency-Key` bij Resend.

**Beperkingen tegen misbruik:**
- maximaal 5 nieuwe dossiers per uur per IP-adres; daarboven gaat het formulier nog wel naar kantoor, maar zonder dossier of klantmail;
- maximaal 30 ongeldige trackingpogingen per uur per IP-adres.

## 6. Nieuws

- **Plaats:** berichten beheer je onder `/beheer/` → Nieuws.
- **Tekst:** beperkte Markdown (`##` kop, `**vet**`, `- lijst`, `[link](/pagina/)`). Er wordt nooit HTML opgeslagen of uitgevoerd.
- **Afbeeldingen:** worden in de browser verkleind en opnieuw opgeslagen als JPEG; daarbij verdwijnen EXIF- en locatiegegevens. Op de server worden type en inhoud gecontroleerd.
- **Publiceren:** vereist een introductie en voldoende tekst. Bij een afbeelding is een alt-tekst verplicht.
- **Zichtbaarheid:** gepubliceerde berichten staan binnen ongeveer een minuut online (CDN-cache van 60 seconden) en in `/nieuws-sitemap.xml`. Concepten geven een 404.
- **Auteur:** standaard is de organisatie de auteur. De naam van de medewerker verschijnt alleen als die het vinkje "Toon de naam van de auteur" aanzet.

## 7. Beveiliging (samenvatting)

- **Autorisatie:** elke beheeractie wordt server-side gecontroleerd op sessie, rol en CSRF-token (header `X-MVFS-CSRF`) plus dezelfde herkomst.
- **`/beheer/` en `/status/`:**
  - strenge Content-Security-Policy, zonder externe scripts;
  - `X-Frame-Options: DENY`;
  - `Referrer-Policy: no-referrer`;
  - `noindex` en `no-store`.
- **Logs:** bevatten geen persoonsgegevens, tokens of wachtwoorden. IP-adressen worden alleen gehasht gebruikt.
- **Inloggen:** foutmeldingen zijn algemeen (niet te achterhalen of een account bestaat). Na 5 mislukte pogingen per 15 minuten volgt een blokkade.

## 8. Lokaal testen

```
npm test                         # 24 tests: demo's, inloggen, nieuws, Track & Trace (geheugen-database)
MVFS_DB=memory MVFS_DB_FILE=tmp/dev-db.json npm run dev
```

Met `MVFS_DB=memory` werkt alles lokaal zonder Supabase. Zonder `RESEND_API_KEY` verschijnt de trackinglink dan in de terminal; dat gebeurt nooit op Vercel. Een lokaal account maak je met dezelfde variabelen en `npm run beheer:gebruiker`.

## 9. Nog te doen vóór productiegebruik

1. **Privacyverklaring publiceren.** Er is nu geen privacyverklaring op de site, terwijl er nu persoonsgegevens en woninggegevens worden opgeslagen. Zie `docs/privacyverklaring-concept.md`. Laat die beoordelen en vul hem aan; neem daarin onder meer bewaartermijnen en verwerkers (Supabase, Resend, Vercel) op.
2. **Verwerkersovereenkomsten (DPA)** afsluiten met Supabase, Resend en Vercel.
3. **Bewaartermijn** vaststellen. Verwijderen kan nu handmatig per aanvraag (rol beheerder). Automatisch opschonen is nog **niet** gebouwd.
4. **Supabase-koppeling na livegang controleren.** De logica is getest tegen een nagebootste database, niet tegen een echte Supabase-omgeving. Doe na het instellen één keer de volledige ronde op een Preview-omgeving met een testdatabase:
   - aanvraag doen;
   - e-mail ontvangen;
   - statuspagina openen;
   - status wijzigen;
   - rapport uploaden en downloaden;
   - nieuwsbericht publiceren.
5. **Resend:** afzenderdomein `mvfunderingsscan.nl` verifiëren (SPF/DKIM).
6. **Statusteksten:** de teksten in `api/_lib/tracking.js` beschrijven de stappen algemeen. Controleer of ze aansluiten op de echte werkwijze.

## 10. Automatisch invullen en de vertaalknop

**Adres automatisch invullen (geen instellingen nodig).** In het aanvraagformulier, het formulier op de homepage en in het rapport in het beheerportaal worden straat, plaats en (indien bekend) het bouwjaar opgezocht zodra postcode en huisnummer zijn ingevuld. De gegevens komen uit open data van de overheid (PDOK: Locatieserver en BAG van het Kadaster) via `api/adres.js`. Er is geen sleutel of account nodig. Bezoekers kunnen het ingevulde adres altijd zelf aanpassen.

**Weergegevens in het rapport (geen instellingen nodig).** In stap B. Object haalt de knop *Weergegevens ophalen* weertype, temperatuur en luchtvochtigheid op bij de inspectiedatum en -tijd, via Open-Meteo. Dit zijn modelgegevens voor de omgeving; de adviseur controleert ze.

**Vertaalknop (DeepL).** Links onderaan elke pagina staat een knop *EN*. Die vertaalt de pagina met DeepL naar het Engels; volgende pagina's worden ook in het Engels getoond tot de bezoeker op *NL* klikt. Elke zin gaat maar één keer naar DeepL: vertalingen worden bewaard in de database (tabel `mvfs_translations`).

Aanzetten:

1. Maak op deepl.com een account voor de **DeepL API** (niet het gewone DeepL Pro-abonnement voor de app). *API Free* is gratis tot 500.000 tekens per maand; *API Pro* rekent per teken. Controleer de actuele prijzen op de site van DeepL.
2. Kopieer onder *Account → API Keys* de sleutel. Een gratis sleutel eindigt op `:fx`; de site herkent dat automatisch.
3. Voer in Supabase (SQL Editor) `supabase/migrations/003_mvfs_vertalingen.sql` uit.
4. Zet in Vercel `DEEPL_API_KEY` (Production) en deploy opnieuw. Optioneel: `DEEPL_MAAND_LIMIET`.

Kosten: de hele site in één keer vertalen is ongeveer 2 miljoen tekens (inclusief menu en footer, die maar één keer worden vertaald). Met *API Free* lukt dat in een paar maanden, doordat alleen bezochte pagina's worden vertaald en elke zin maar één keer. Met *API Pro* is het een eenmalig bedrag; daarna vertaal je alleen nog nieuwe of gewijzigde teksten.

Goed om te weten:
- Vertaald wordt wat de bezoeker ziet. Ingevulde formuliergegevens gaan nooit naar DeepL.
- De merknaam *MV Funderingsscan* wordt niet vertaald.
- De vertaling is niet zichtbaar voor zoekmachines (die zien de Nederlandse pagina). Wil je later ook in Google gevonden worden op Engelse zoekwoorden, dan zijn aparte Engelse pagina's nodig.
- Lokaal testen zonder DeepL: start de server met `MVFS_VERTAAL_TEST=1` (dan wordt tekst in hoofdletters gezet in plaats van vertaald). Dit werkt nooit in productie.

## 11. Adviseurs op de website en hun foto

Op `/over-ons/` staan de adviseurs uit `src/content/eeat.json` (`experts`): naam en functie verplicht, opleiding, ervaring, certificaten en LinkedIn optioneel. Alleen ingevulde velden (zonder [vierkante haken]) komen online.

De portretfoto beheer je in het beheerportaal: *Rapporten → Adviseurs → Foto op website*. Eenmalig nodig: voer in Supabase (SQL Editor) `supabase/migrations/004_mvfs_adviseur_foto.sql` uit. De foto wordt verkleind tot 640 px, zonder EXIF-gegevens opgeslagen en is binnen enkele minuten zichtbaar. Zonder foto toont de site de initialen.

De koppeling gaat op naam: de naam in het portaal moet gelijk zijn aan de naam in `eeat.json`.
