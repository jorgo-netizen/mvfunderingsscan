# Automatisering SEO/GEO, IndexNow, GitHub en Vercel

Dit document legt uit wat er automatisch gebeurt bij elke wijziging, wat je zelf eenmalig moet instellen en hoe je alles handmatig kunt draaien. Het eindrapport (A–K) staat onderaan.

**Uitgangspunt:** de automatisering verandert niets aan de site. URL's, canonicals, redirects, teksten, titels, descriptions, koppen, interne links, JSON-LD, OG, sitemaps, robots.txt, afbeeldingen, ontwerp en functies blijven zoals ze zijn. Alles hieronder controleert of meldt alleen.

---

## 1. Wat gebeurt er automatisch?

| Moment | Wat | Waar | Kan het iets tegenhouden? |
|---|---|---|---|
| Elke push naar `main` en elke pull request | Geheimen-scan, inhoudscontrole, build, audit, tests, SEO/GEO-regressie tegen de nulmeting | GitHub Actions → **Kwaliteit** | Ja: de check wordt rood. Vercel publiceert nu nog wél (zie §5). |
| Na elke geslaagde **productiedeploy** op Vercel | Live-controle (robots, beide sitemaps met elke URL, redirects, www-doorsturing, sleutelbestand) en daarna IndexNow voor alleen nieuwe, inhoudelijk gewijzigde en verwijderde pagina's | GitHub Actions → **Na deploy** → `productie` | Nee. De site is dan al live; IndexNow staat op *continue-on-error*. |
| Na elke geslaagde **preview**-deploy | Controle dat de preview `X-Robots-Tag: noindex` heeft (of afgeschermd is) | **Na deploy** → `preview` | Nee, alleen een rode melding. |
| Nieuwsbericht publiceren, wijzigen (als het al gepubliceerd is), terugzetten naar concept of verwijderen | IndexNow-melding van dat bericht en `/nieuws/` | `api/beheer.js` (alleen op productie) | Nee: maximaal 4 seconden, fouten worden alleen gelogd. |

Elke run in GitHub Actions heeft een **samenvatting** (tabblad *Summary*) met de uitkomst per controle en per IndexNow-melding.

### Gemeld ≠ gecrawld ≠ geïndexeerd

- **Gemeld:** IndexNow heeft het verzoek ontvangen (HTTP 200 of 202). Dat staat in de samenvatting.
- **Gecrawld:** de zoekmachine heeft de pagina opgehaald. Dat zie je in Bing Webmaster Tools (URL-inspectie) of in de serverlogs.
- **Geïndexeerd:** de pagina staat in de zoekresultaten. Dat zie je in Bing Webmaster Tools en Google Search Console.

Google doet niet mee aan IndexNow. Voor Google tellen de sitemap, de interne links en Search Console.

---

## 2. Eenmalig instellen (door jou)

De sleutel stuur je nooit naar Claude en hij komt niet in de code. Een IndexNow-sleutel is wel openbaar zodra het sleutelbestand online staat; dat is zo bedoeld. Het sleutelbestand dat je via GitHub in `public/` hebt gezet, gebruik je gewoon verder.

1. **GitHub Secret:** repository → *Settings* → *Secrets and variables* → *Actions* → *New repository secret*. Naam `INDEXNOW_KEY`, waarde: de naam van het `.txt`-bestand in `public/`, zonder `.txt`.
2. **Vercel (voor nieuwsberichten):** project → *Settings* → *Environment Variables*. Naam `INDEXNOW_KEY`, dezelfde waarde, alleen voor **Production**. Doe daarna een redeploy.
3. **Actions-rechten:** repository → *Settings* → *Actions* → *General* → *Workflow permissions* op **Read repository contents** laten staan. De workflows vragen zelf alleen `contents: read` en `deployments: read`.
4. **Optioneel:** zet *Kwaliteit* als verplichte check op `main` (*Settings* → *Branches*). Dat werkt alleen als je via pull requests werkt.

---

## 3. Handmatig draaien

```bash
npm run seo:regressie                    # na npm run build: vergelijken met de nulmeting
npm run seo:nulmeting                    # nieuwe nulmeting vastleggen (alleen na een bewuste SEO-wijziging)
npm run live-controle                    # productie live controleren
npm run geheimen                         # geheimen-scan
node scripts/indexnow.mjs --diff <sha> --droog          # wat zou er gemeld worden t.o.v. versie <sha>?
node scripts/indexnow.mjs --urls <url> <url> --droog    # losse URL's controleren
```

In GitHub kun je ook **Actions** → **Na deploy** → **Run workflow** gebruiken met een lijst URL's. *Droog* staat standaard aan.

Het script meldt nooit meer dan 150 URL's zonder `--bevestig`, en meldt niets als er geen vorige productiedeploy bekend is. Zo komt er geen bulkmelding bij de eerste deploy.

---

## 4. Regressiecontrole: wat blokkeert wel en wat niet

**Kritiek** (de check wordt rood):
- een URL uit de nulmeting is verdwenen zonder redirect;
- een canonical is gewijzigd of verkeerd;
- een pagina is onbedoeld noindex;
- title, description of H1 ontbreekt (of er zijn meerdere H1's);
- de JSON-LD is ongeldig, of ProfessionalService of WebSite ontbreekt;
- een interne link of afbeelding is kapot;
- de sitemap bevat dubbele, vreemde of noindex-URL's, mist een indexeerbare pagina of heeft een lastmod in de toekomst;
- een redirect is verdwenen;
- robots.txt blokkeert Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot of ClaudeBot, of vermeldt een sitemap niet.

**Waarschuwing** (blokkeert niet): title, description of H1 is gewijzigd, of er is een structured-data-type verdwenen.

**Info:** nieuwe pagina's, inhoudelijk gewijzigde pagina's, een gewijzigde og:image.

Pas je bewust titels of URL's aan? Draai dan `npm run build` en `npm run seo:nulmeting`, en commit `seo/nulmeting.json` mee.

---

## 5. Open beslissing: regressie blokkerend maken in Vercel

Nu bouwt Vercel met `npm run build`. Als je `buildCommand` in `vercel.json` verandert in `npm run build && node scripts/seo-regressie.mjs --ci`, zet Vercel een versie met een kritieke SEO-fout niet live. De vorige versie blijft dan gewoon online.

Dit is **nog niet** aangepast; het wacht op jouw akkoord.

---

# Eindrapport automatisering

## A. Samenvatting
De automatisering controleert en meldt alleen; aan de site zelf (inhoud en SEO-signalen) is niets veranderd. Er draait een kwaliteitscontrole bij elke push en een live-controle met IndexNow na elke productiedeploy. Nieuwsberichten worden direct bij IndexNow gemeld. Een regressiecontrole vergelijkt elke build met een vastgelegde nulmeting. Alle controles zijn lokaal geslaagd.

## B. Nulmeting
`seo/nulmeting.json` bevat 146 pagina's, 144 sitemap-URL's, 16 redirects en de robots-regels. Per pagina zijn canonical, robots, title, description, H1, JSON-LD-types, og:image en een inhouds-vingerafdruk vastgelegd.

## C. IndexNow
- **`api/_lib/indexnow.js`:** gebruikt alleen https op de productiehost, zonder query, ontdubbeld. Verstuurt batches van 500 en stopt bij 403/429. Gooit nooit een fout.
- **`scripts/indexnow.mjs`:** vergelijkt de build met de vorige productiedeploy. Datums en `?v=` tellen niet als wijziging. Controleert elke URL live: 200, geen noindex en een canonical naar zichzelf, of voor verwijderde pagina's 404/410/301/308. Controleert ook het sleutelbestand.
- **Beveiligingen:** maximaal 150 URL's zonder bevestiging; niets bij de eerste deploy; exitcode altijd 0.
- **Nieuws:** wordt gemeld vanuit `api/beheer.js` bij publiceren, wijzigen, depubliceren en verwijderen, alleen als `VERCEL_ENV=production`.
- **Sleutel:** komt uit `INDEXNOW_KEY` (GitHub Secret en Vercel-variabele) en wordt nooit gelogd. Als de variabele bij de build gezet is, schrijft de build het sleutelbestand mee.

## D. GitHub Actions
- **`.github/workflows/kwaliteit.yml`** en **`.github/workflows/na-deploy.yml`.**
- **Rechten:** alleen `contents: read` (plus `deployments: read` in Na deploy).
- **Versies:** actions vastgepind op commit-SHA, geverifieerd tegen de tags: checkout v7.0.1, setup-node v7.1.0.
- **Overig:** `persist-credentials: false`, concurrency per branch of omgeving, time-outs.

## E. Vercel
- **Ongewijzigd:** `vercel.json`.
- **Gecontroleerd en in orde:**
  - cleanUrls en trailingSlash;
  - 16 redirects, waarvan 15 zonder voorwaarde;
  - www-doorsturing (permanent);
  - `X-Robots-Tag: noindex` op `/beheer/`, `/status/` en alle `*.vercel.app`-hosts. Live getest: de preview-host geeft noindex.
- **Open punt:** de blokkerende buildstap, zie §5.

## F. Regressiecontrole
`scripts/seo-regressie.mjs` deelt meldingen in als kritiek, waarschuwing of info (zie §4). Het schrijft naar de GitHub-samenvatting. De huidige stand: 0 kritiek en 0 waarschuwingen.

## G. Sitemaps en crawlers
De live-controle controleert elke URL in `sitemap.xml` en `nieuws-sitemap.xml` op status 200, geen noindex en een canonical naar zichzelf. Resultaat nu op productie: 142 + 2 URL's, 0 fouten. robots.txt laat Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User en PerplexityBot toe en vermeldt beide sitemaps.

## H. Monitoring per deploy
Na elke productiedeploy staat een samenvatting in GitHub Actions met de live-controle en een IndexNow-tabel:
- aantal nieuw, gewijzigd en verwijderd;
- aantal gecontroleerd en overgeslagen;
- verzoeken met statuscodes;
- aantal gemeld.

De samenvatting maakt het onderscheid tussen gemeld, gecrawld en geïndexeerd expliciet (§1).

## I. Beveiliging
- **Geheimen-scan:** `scripts/geheimen-scan.mjs` zoekt in alle bestanden die Git bijhoudt naar Resend-, Supabase-, JWT-, GitHub-, Vercel- en AI-sleutels, private keys en `.env`-bestanden. Gevonden waarden worden afgekapt getoond. Er is niets gevonden en de scan is getest met een geplant nepgeheim.
- **Dependencies:** het project heeft geen npm-dependencies, dus er zijn ook geen blinde updates.
- **Workflows:** draaien zonder schrijfrechten.

## J. Tests
- `npm test`: 42/42 geslaagd, waarvan 7 nieuw in `scripts/test-seo.mjs`. Die dekken de URL-filter, de sleutel, het verzoekformaat, de foutafhandeling zonder throw, batches en de stop bij 429, de vingerafdruk en de indexeerbaarheid.
- **Overige checks:** check, build, audit (147 pagina's, geen problemen), regressie (0 kritiek) en de geheimen-scan zijn geslaagd.
- **Live getest:** de live-controle tegen productie en de preview-controle tegen een vercel.app-host.

## K. Open punten en advies
1. Zet `INDEXNOW_KEY` als GitHub Secret en als Vercel-variabele (§2).
2. Beslis of de regressiecontrole deploys mag blokkeren (§5).
3. Controleer na de eerste productiedeploy met de nieuwe workflow de samenvatting. Bij de SEO-ronde 2-wijzigingen worden ongeveer 70 inhoudelijk gewijzigde pagina's gemeld; dat is onder de grens van 150.
4. Koppel Bing Webmaster Tools (BingSiteAuth.xml staat al in `public/`) om te zien wat gecrawld en geïndexeerd is.
