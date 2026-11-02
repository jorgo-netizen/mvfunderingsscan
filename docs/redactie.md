# AI-redactie: installatie, configuratie en beveiliging

De AI-redactie verzamelt nieuws over funderingen, schrijft concepten en zet ze klaar in het beheerportaal onder **Redactie**. Een medewerker leest na, past aan en keurt goed. Goedkeuren zet het artikel als **concept** in **Nieuws**. Publiceren is daarna een aparte handeling in Nieuws.

**De bot publiceert nooit.** Hij heeft er technisch geen toegang toe (zie Beveiliging).

## Hoe het werkt

```
[ RSS-feeds ]  →  bot op de pc (Ollama)  →  /api/redactie (token)  →  Supabase: concepten
                                                                     ↓
                     medewerker in het portaal: nalezen, aanpassen, Goedkeuren
                                                                     ↓
                                   Nieuws (status: concept)  →  medewerker: Publiceren
```

| Onderdeel | Waar | Wat |
|---|---|---|
| Bot | deze pc, `scripts/redactie/` | feeds lezen, relevantie bepalen, schrijven met Ollama, eindredactie, taalcontrole, aanleveren |
| Koppeling | Vercel, `api/redactie.js` | alleen: context lezen, items opslaan, concepten aanleveren, logregels |
| Portaal | Vercel, `api/_lib/redactie-api.js` + `public/beheer.js` | overzicht, concepten, bronnen, instellingen, logboek, goedkeuren |
| Opslag | Supabase, migratie `006_mvfs_redactie.sql` | bronnen, items, concepten, logboek, instellingen |

Soorten concepten: **Nieuws**, **Wist je dat**, **Kennisartikel**, **Zelftest**, **Regionaal** en **Praktijkvoorbeeld** (altijd duidelijk fictief, standaard uit). Goedgekeurde artikelen komen alleen op `/nieuws/`. Zelftests worden goedgekeurd en bewaard, maar nog niet op de site getoond.

## Eenmalig installeren

### 1. Supabase
SQL Editor → plak `supabase/migrations/006_mvfs_redactie.sql` → **Run**. Dit maakt de tabellen en zet 12 gecontroleerde startbronnen klaar.

### 2. Token voor de koppeling
Maak een lange willekeurige sleutel aan. Voer in de projectmap uit:
```
node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"
```
- **Vercel → Settings → Environment Variables:** `REDACTIE_TOKEN` = die waarde (Production). Daarna **Redeploy**.
- **Op de pc:** maak in de projectmap een bestand `redactie.env` met:
  ```
  REDACTIE_TOKEN=dezelfde waarde
  ```
  `redactie.env` staat in `.gitignore` en komt dus niet in GitHub.

### 3. Ollama en een model
1. Installeer Ollama via **ollama.com** (gratis).
2. Download een model, bijvoorbeeld:
   ```
   ollama pull qwen2.5:14b
   ```
   Dat is ongeveer 9 GB. Het past op de RTX 3060 (12 GB) en schrijft redelijk Nederlands. Alternatieven: `gemma3:12b` (ook goed in Nederlands) of `qwen2.5:7b` (sneller, minder nauwkeurig). Het model kies je in het portaal onder **Redactie → Instellingen en planning**.
3. Test het in de projectmap:
   ```
   npm run redactie -- --type weetje
   ```
   Daarna staat er een weetje onder **Redactie → Concepten**.

### 4. Elke ochtend automatisch (Windows Taakplanner)
Open PowerShell en pas het pad aan als de projectmap ergens anders staat:
```
$actie = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c cd /d C:\Users\Gebruiker\Desktop\mvfunderingsscan\mvfunderingsscan && npm run redactie >> tmp\redactie.log 2>&1"
$tijd = New-ScheduledTaskTrigger -Daily -At 7:30
$inst = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName "MV Funderingsscan redactie" -Action $actie -Trigger $tijd -Settings $inst
```
- **De pc staat om 7:30 in slaapstand?** Dankzij "WakeToRun" maakt Windows de pc wakker voor de taak (als dat in het energiebeheer is toegestaan). Is de pc helemaal uit, dan draait de taak zodra hij weer aangaat ("StartWhenAvailable"). Ben je langer weg: zet de pc in slaapstand in plaats van uit.
- **Ollama:** moet draaien. Dat doet het standaard na installatie; het start mee met Windows.
- **Uitzetten:** zet in het portaal "Redactie actief" uit, of verwijder de taak in Taakplanner.

## Instellen in het portaal (Redactie → Instellingen en planning)
- **Voorraad en planning:** per soort stel je in hoeveel concepten er altijd klaar moeten staan om na te lezen (voorraad) en hoeveel er hoogstens per week of maand bij komen. Elke run vult de bot de voorraad aan, met hoogstens één concept per soort en hoogstens het ingestelde aantal per run (standaard 4). Standaard: voorraad 4 nieuws, 4 weetjes, 2 kennisartikelen, 2 regionaal en 1 zelftest; maximaal 4 nieuws, 3 weetjes, 1 kennisartikel en 2 regionaal per week, plus 1 zelftest per maand.
- **Minimale relevantie:** onder deze score (0–100) gebruikt de bot een nieuwsitem niet voor een artikel. Standaard is dat 55.
- **Onderwerpen:** de lijsten voor weetjes, kennisartikelen, zelftests en praktijkvoorbeelden. De bot slaat onderwerpen over die al op de site of in een concept staan.
- **Model en Ollama-adres.**
- **Taalcontrole:** gebruikt de openbare LanguageTool-API. Alleen de concepttekst gaat daarheen, nooit persoonsgegevens. Gratis, met een limiet van circa 20 controles per minuut. Zet hem uit als je geen tekst naar buiten wilt sturen.
- **Bronnen:** feeds toevoegen, uitzetten of de betrouwbaarheid (1–5) aanpassen. "Volledige pagina lezen" zet je alleen aan bij open bronnen, zoals KCAF en STOWA.

## Werken met concepten
1. Ga naar **Redactie → Concepten** en open een concept.
2. Lees de **kwaliteitscontrole**:
   - **rood:** moet opgelost of bewust geaccepteerd worden, bijvoorbeeld een bedrag dat niet in de prijzen staat, een ontbrekende bron of een link naar een pagina die niet bestaat;
   - **geel:** nakijken, bijvoorbeeld getallen die niet in de bron staan, opmerkingen van de eindredactie of [CONTROLEREN]-markeringen;
   - **blauw:** SEO en GEO.
3. Pas zo nodig de tekst, de SEO-gegevens, de veelgestelde vragen, de bronnen, de interne links en de afbeelding aan, en klik **Opslaan en opnieuw controleren**.
4. Klik **Voorbeeld op de site bekijken** om het artikel te zien zoals het op /nieuws/ komt.
5. Niet goed? Gebruik **Opnieuw laten schrijven**; je kunt er een opmerking bij geven. Je kunt het ook **Afkeuren** of **Verwijderen**.
6. **Goedkeuren** zet het artikel als concept in Nieuws. Open het daar, lees het een laatste keer na en klik **Publiceren**.

**Controleer altijd zelf de feiten en de bronnen.** Een lokaal model kan zich vergissen, en de automatische controles vangen niet alles. Praktijkvoorbeelden zijn altijd fictief en moeten zo blijven heten.

## Beveiliging
- **Geen databasesleutel op de pc.** De bot gebruikt alleen `REDACTIE_TOKEN` en `/api/redactie`.
- **Wat `/api/redactie` toestaat:** context lezen, nieuwsitems opslaan, concepten aanleveren, logregels schrijven en oude items opruimen. Er is **geen** actie voor Nieuws of voor publiceren. Een concept krijgt altijd status `concept`, wat de bot ook meestuurt. Opnieuw genereren kan alleen bij een concept dat een medewerker daarvoor heeft teruggestuurd.
- **Token:** wordt in constante tijd vergeleken. Mislukte pogingen tellen mee (gehasht IP); na 10 per uur wordt het IP geblokkeerd. Zonder token van minimaal 32 tekens staat de koppeling dicht.
- **Goedkeuren** (ingelogd, met CSRF-controle) maakt het nieuwsbericht altijd aan met status `concept`. **Publiceren** kan alleen via Nieuws → Publiceren door een ingelogde medewerker. Dat zijn twee aparte handelingen.
- **Supabase:** RLS staat aan op alle redactietabellen, zonder policies. Alleen de server kan erbij.
- **Invoer:** alles wordt opgeschoond (bekende velden, maximale lengtes). Afbeeldingen kunnen alleen uit de eigen beeldbank komen. Interne links moeten bestaande paden zijn, en bronnen moeten http(s)-links zijn.
- **Tests:** `npm test` controleert onder meer dat de bot niet kan publiceren, dat een meegestuurde status wordt genegeerd en dat goedkeuren alleen een concept oplevert.
- **Logging:** elke run komt in **Redactie → Logboek en fouten**.
- **Back-ups:** die lopen via Supabase. Op het Pro-plan maakt Supabase dagelijkse back-ups.

## Kosten
| Onderdeel | Kosten |
|---|---|
| Ollama en het model | gratis (draait op de eigen pc; stroom) |
| LanguageTool (openbare API) | gratis, met een limiet; uit te zetten |
| RSS-feeds | gratis |
| Vercel en Supabase | bestaande abonnementen. Een extra serverfunctie (`api/redactie.js`) past binnen de Hobby-limiet van 12 functies |

## Problemen oplossen
- **"Ollama is niet bereikbaar":** start Ollama; het icoon moet in het systeemvak staan.
- **"Model … is niet geïnstalleerd":** voer `ollama pull <model>` uit.
- **"portaal (context): Niet geautoriseerd":** het token in `redactie.env` is niet gelijk aan dat in Vercel, of je hebt na het instellen niet opnieuw gedeployd.
- **Een bron geeft een fout:** zie **Redactie → Bronnen**. Het feed-adres kan veranderd zijn.
- **Droog testen zonder iets aan te leveren:** `npm run redactie -- --droog --type nieuws`. De concepten komen dan in `tmp/redactie/`.
