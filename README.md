# MV Funderingsscan – mvfunderingsscan.nl

Specialistische website en kennisplatform over funderingsonderzoek: de funderingsscan,
de quickscan (fase 0), fase 1, funderingsproblemen en het werkgebied Friesland en Groningen.
Het gaat om 128 pagina's en ongeveer 186.000 woorden, met lokale pagina's voor 24 gemeenten (146 kernen), waaronder een kennisbank met meer dan 60 artikelen en een begrippenlijst.

Het is een statische site die met Node wordt gegenereerd uit JSON-content. Er zijn
**geen externe dependencies** nodig.

## Snel starten

Vereist: Node.js 20 of nieuwer.

```bash
npm install
npm run dev
```

Open daarna **http://localhost:3000/**. Pas je iets aan in `src/` of `public/`, dan bouwt
de site automatisch opnieuw en ververst de browser vanzelf.

## Scripts

| Commando          | Wat het doet |
|-------------------|--------------|
| `npm run dev`     | Bouwt de site en start de dev-server (poort 3000) met live reload |
| `npm run build`   | Bouwt de productieversie naar `dist/` |
| `npm run preview` | Bouwt en serveert `dist/` zonder live reload, zoals in productie |
| `npm run check`   | Controleert alle content in `src/content/pages/` tegen `CONTENT-GUIDE.md`: velden, lengtes, links, toegestane bedragen, verboden tekst, woordaantallen en uniekheid |
| `npm run audit`   | Bouwt de site, controleert SEO/GEO van elke pagina en schrijft het eindoverzicht naar `AUDIT.md` |
| `npm run autolink` | Legt bij de eerste vermelding van vakbegrippen (lintvoegwaterpassing, loodmeting, zetting, enz.) automatisch een interne link naar de kennispagina. Gebruik `npm run autolink -- --dry` om eerst te zien wat er verandert |
| `npm test` | Rekentests van de vier meetdemo's (lintvoeg, loodmeting/Oldehove, vloerveld, scheuren) met de ingebouwde `node:test`; geen extra dependencies |
| `npm run clean`   | Verwijdert `dist/` |

Een andere poort: `npm run dev -- --port 4000`.

De dev-server gedraagt zich als Vercel:
- `/fase-0` gaat door naar `/fase-0/`
- een unieke URL zonder slash krijgt er een, en de redirects uit `vercel.json` werken ook lokaal
- een onbekende URL geeft `404.html` met status 404

## Mappenstructuur

```
src/
  content/
    site.json            bedrijfsgegevens (NAP), menu (met dropdowns), diensten, kennisbankgroepen
    urls.json            masterlijst van alle URL's: groep, zoekwoord, zoekintentie, minimaal woordaantal
    home.json            FAQ van de homepage en uitgelichte kennisbankartikelen
    pages/*.json         alle contentpagina's (diensten, situaties, problemen, regio, kennisbank)
  templates/home-main.html   inhoud van de homepage ({{...}} wordt bij de build gevuld)
  lib/layout.mjs        head/meta, header, footer en JSON-LD-bouwstenen
  lib/template.mjs      template voor contentpagina's (hero, inhoudsopgave, FAQ, gerelateerd, CTA)
  lib/forms.mjs         aanvraagformulier, contactformulier en funderingscheck
public/                 wordt 1-op-1 naar dist/ gekopieerd (styles.css, script.js, assets/)
scripts/                build.mjs, dev.mjs, audit.mjs, check-content.mjs
CONTENT-GUIDE.md        schrijfregels: toegestane feiten, toon, componenten, JSON-structuur
AUDIT.md                laatste eindoverzicht: URL, title, H1, zoekwoord, intentie, links, schema, woorden
vercel.json             build-instellingen, nette URL's, redirects en headers
```

## Content aanpassen of toevoegen

1. Lees eerst `CONTENT-GUIDE.md`. Daar staan de feiten die je mag gebruiken en de
   HTML-componenten (callout, tabel, infokaarten, tabs, afvinklijst en meer).
2. **Een pagina aanpassen:** zoek het `path` op in `src/content/pages/*.json`.
3. **Een nieuwe pagina toevoegen:**
   - Zet het pad eerst in `src/content/urls.json`.
   - Voeg daarna het pagina-object toe aan een JSON-bestand in `src/content/pages/`.
   - De pagina komt automatisch in de sitemap, `llms.txt` en, bij een kennisbankartikel, in het kennisbankoverzicht.
4. Draai `npm run autolink` (optioneel), dan `npm run check` en daarna `npm run audit`. Beide moeten zonder fouten eindigen.
5. **Definities:** geef een pagina een `defined_term` (`name` + `description`). Die verschijnt als definitieblok op de pagina, als DefinedTerm-schema en automatisch in `/kennisbank/begrippenlijst/`. Losse begrippen zonder eigen pagina staan in `site.json` onder `glossaryExtra`.

**Bedrijfsgegevens** (adres, telefoon, e-mail en openingstijden) staan alleen in
`src/content/site.json`. Houd ze exact gelijk aan je Google Bedrijfsprofiel.

## Publiceren op Vercel

1. Vercel → **Add New Project** → kies de GitHub-repo.
2. **Root Directory:** leeg laten (de site staat in de root van de repository). Build command en output staan al in `vercel.json`.
3. **Domains:** voeg `mvfunderingsscan.nl` en `www.mvfunderingsscan.nl` toe. De www-variant
   wordt naar het hoofddomein doorgestuurd.
4. Meld `https://www.mvfunderingsscan.nl/sitemap.xml` aan in Google Search Console en Bing
   Webmaster Tools.

## Formulieren

Alle formulieren (homepage, `/funderingsscan-aanvragen/`, `/contact/`) versturen naar de
serverless functie `api/aanvraag.js`, die de aanvraag via [Resend](https://resend.com) mailt.
De functie heeft validatie, een verborgen honeypot-veld tegen spam en een terugvaloptie (telefoon/e-mail)
als het verzenden mislukt.

- **Lokaal** (`npm run dev`): zonder `RESEND_API_KEY` verschijnt de aanvraag alleen in de terminal.
- **Productie**: stel in Vercel `RESEND_API_KEY`, `AANVRAAG_TO` en `AANVRAAG_FROM` in. Zie `docs/livegang-checklist.md`.

## Interactieve kennismodules

`src/lib/widgets.mjs` bevat zeven interactieve modules: lintvoegwaterpassing (punten A–F), loodmeting (gevel), loodmeting op de Oldehove (4,2°, silhouet), klikbare scheuren met scheurpatronen, scheuranalyse-keuzehulp, vloerveldwaterpassing (raster met doorsnede) en de keuzehulp "Welke meting past bij mijn situatie?". Ze staan samen op `/funderingsmetingen/` en los op de kennisbankpagina's over lintvoegwaterpassing, loodmeting, vloerveldwaterpassing en scheurpatronen. Toevoegen aan een pagina: zet in een sectie `"widget": "lintvoeg" | "lood" | "oldehove" | "scheuren" | "scheurkeuze" | "vloerveld" | "keuze"`. Alle uitleg en FAQ's staan in de HTML; JavaScript voegt alleen de interactie toe. De meetwaarden zijn fictief en als zodanig gelabeld.

## Lokale SEO

- `src/content/site.json` → `gemeenten`: alle gemeenten met hun kernen. Hieruit worden automatisch
  het blok "Kernen in de gemeente" op elke gemeente- of stadspagina, de plaatsenindex op `/werkgebied/`,
  `areaServed` in de structured data en de werkgebiedlijst in `llms.txt` gemaakt.
- Een kern toevoegen = één regel in `site.json`. Een nieuwe gemeentepagina = een entry in `urls.json`
  plus een pagina in `src/content/pages/`.

## Praktijkvoorbeelden

Zie `src/content/cases/LEESMIJ.md`. Zodra er een echte case is, verschijnen `/praktijkvoorbeelden/`
en de casepagina automatisch, inclusief sitemap.

## Documentatie

- `docs/livegang-checklist.md` – alles wat na de deploy moet gebeuren
- `docs/google-bedrijfsprofiel.md` – kant-en-klare teksten voor het Google Bedrijfsprofiel
- `docs/reviews.md` – reviews vragen en beantwoorden
