# MV Funderingsscan – mvfunderingsscan.nl

Statische website voor MV Funderingsscan. De pagina's worden met Node gegenereerd
uit JSON-content en templates. Er zijn **geen externe dependencies** nodig.

## Snel starten

Vereist: Node.js 20 of nieuwer.

```bash
npm install
npm run dev
```

Open daarna **http://localhost:3000/**. Pas je iets aan in `src/` of `public/`,
dan wordt de site automatisch opnieuw gebouwd en ververst de browser vanzelf.

## Scripts

| Commando          | Wat het doet                                                                  |
|-------------------|-------------------------------------------------------------------------------|
| `npm run dev`     | Bouwt de site, start de dev-server op poort 3000 met live reload              |
| `npm run build`   | Bouwt de productieversie naar `dist/`                                         |
| `npm run preview` | Bouwt en serveert `dist/` zonder live reload, net als in productie            |
| `npm run audit`   | Bouwt en controleert SEO/GEO: H1, titles, descriptions, canonicals, links, alt-teksten, JSON-LD, FAQ-schema, sitemap en robots |
| `npm run clean`   | Verwijdert `dist/`                                                            |

Een andere poort: `npm run dev -- --port 4000`.

De dev-server gedraagt zich als Vercel:
- `/fase-0` gaat door naar `/fase-0/`
- `/fase-0/index.html` gaat door naar `/fase-0/`
- een onbekende URL geeft `404.html` met status 404

## Mappenstructuur

```
src/
  content/
    site.json                 bedrijfsgegevens (NAP), navigatie, diensten, afbeeldingen
    home.json                 FAQ van de homepage en uitgelichte kennisbankartikelen
    pages/services.json       /funderingsscan/, /fase-0/, /fase-1/, /contact/
    pages/local.json          regiopagina's (Friesland, Groningen, Leeuwarden, Sneek, Groningen stad)
    pages/kennisbank.json     kennisbankartikelen
    pages/kennisbank-index.json
  templates/home-main.html    inhoud van de homepage ({{...}} wordt bij de build gevuld)
  lib/layout.mjs              head/meta, header, footer, JSON-LD-bouwstenen
  lib/template.mjs            template voor dienst-, regio- en kennisbankpagina's
public/                       wordt 1-op-1 naar dist/ gekopieerd
  styles.css  script.js  assets/ (logo's, iconen, WebP-foto's)
scripts/
  build.mjs  dev.mjs  audit.mjs
vercel.json                   build-instellingen, nette URL's, redirects, headers
```

## Content aanpassen

- **Bedrijfsgegevens** (adres, telefoon, e-mail, openingstijden) staan alleen in
  `src/content/site.json`. Ze worden overal gebruikt: header, footer, contactpagina,
  structured data en `llms.txt`. Houd ze exact gelijk aan je Google Bedrijfsprofiel.
- **Een pagina aanpassen:** zoek de pagina op `path` in `src/content/pages/*.json`.
  Je kunt onder meer deze velden aanpassen: `title`, `description`, `h1`, `lead`,
  `sections` (met `h2`, `answer` en `body`), `faqs` en `related`.
- **Nieuwe pagina:** voeg een object toe aan het juiste JSON-bestand. Hij komt
  automatisch in de sitemap en `llms.txt`. Draai daarna `npm run audit`.
- **FAQ's:** de zichtbare FAQ en het FAQPage-schema komen uit dezelfde bron, dus ze
  lopen nooit uit elkaar.

Draai na wijzigingen altijd `npm run audit`. Bij problemen geeft het commando
exit-code 1.

## Publiceren op Vercel

1. Vercel → **Add New Project** → kies de GitHub-repo.
2. **Root Directory:** `mvfunderingsscan`. Build command en output staan al in `vercel.json`.
3. **Domains:** voeg `mvfunderingsscan.nl` en `www.mvfunderingsscan.nl` toe. De
   www-variant wordt via `vercel.json` naar het hoofddomein doorgestuurd.
4. Meld de sitemap aan in Google Search Console en Bing Webmaster Tools:
   `https://mvfunderingsscan.nl/sitemap.xml`.

## Aanvraagformulier

Het formulier toont nu alleen een succesmelding en verstuurt nog niets. De plek om
later e-mail, een CRM of een API te koppelen staat in `public/script.js` (zoek op `TODO`).
