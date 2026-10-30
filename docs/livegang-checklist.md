# Livegang-checklist mvfunderingsquickscan.nl

Werk deze lijst van boven naar beneden af. De volgorde is bewust: eerst moeten aanvragen
binnenkomen, daarna pas verkeer genereren.

## 1. Formulieren laten mailen (Resend)

- [ ] Maak een gratis account op https://resend.com.
- [ ] Voeg het domein `mvfunderingsquickscan.nl` toe en zet de DNS-records die Resend toont bij je domeinbeheerder (SPF/DKIM). Wacht tot het domein "verified" is.
- [ ] Maak een API-sleutel aan.
- [ ] Vercel → project → Settings → Environment Variables:
  - `RESEND_API_KEY` = de sleutel
  - `AANVRAAG_TO` = het adres dat de aanvragen moet ontvangen (standaard `info@mideavastgoed.nl`)
  - `AANVRAAG_FROM` = `MV Funderingsscan <noreply@mvfunderingsquickscan.nl>` (een mailbox voor dit adres is niet nodig; antwoorden gaan naar info@mideavastgoed.nl)
- [ ] Opnieuw deployen en een testaanvraag doen via `/funderingsscan-aanvragen/`, `/contact/` en de homepage.

Zolang de sleutel ontbreekt, toont het formulier in productie een melding met telefoonnummer en
e-mailadres, zodat er geen aanvragen ongemerkt verloren gaan.

## 2. Publiceren

- [ ] Vercel → Add New Project → kies de GitHub-repo van MV Funderingsscan → Root Directory leeg laten.
- [ ] Domains: voeg `www.mvfunderingsquickscan.nl` toe als **primair** domein en `mvfunderingsquickscan.nl` als tweede domein. `vercel.json` stuurt het kale domein al met een 301 door naar www.
- [ ] Controleer: `https://www.mvfunderingsquickscan.nl/robots.txt`, `/sitemap.xml`, `/llms.txt` en een paar pagina's. Canonicals, sitemap en structured data gebruiken al `https://www.mvfunderingsquickscan.nl`.
- [ ] **Pas als www.mvfunderingsquickscan.nl werkt:** laat ook de Vercel-URL permanent doorsturen. Zet deze regel bovenaan `redirects` in `vercel.json`:

  ```json
  { "source": "/:path*", "has": [{ "type": "host", "value": "mvfunderingsscan.vercel.app" }], "destination": "https://www.mvfunderingsquickscan.nl/:path*", "permanent": true }
  ```

  Tot die tijd krijgt `mvfunderingsscan.vercel.app` een `X-Robots-Tag: noindex`-header, zodat de Vercel-URL geen concurrerende geïndexeerde versie wordt. Haal die header-regel weg zodra de redirect actief is.
- [ ] Vul de E-E-A-T-gegevens in `src/content/eeat.json` in (deskundige, KvK, profielen, echte reviews). `npm run build` toont wat nog open staat.

## 3. Zoekmachines

- [ ] Google Search Console: domeineigendom verifiëren (DNS), sitemap `https://www.mvfunderingsquickscan.nl/sitemap.xml` indienen.
- [ ] Bing Webmaster Tools: site toevoegen (kan via import uit Search Console), sitemap indienen. Belangrijk voor ChatGPT Search en Copilot.
- [ ] In Search Console de belangrijkste URL's handmatig laten indexeren: `/`, `/funderingsscan/`, `/quickscan-fundering/`, `/fase-0-funderingsonderzoek/`, `/kennisbank/lintvoegwaterpassing/`.

## 4. Lokaal

- [ ] Google Bedrijfsprofiel inrichten met `docs/google-bedrijfsprofiel.md`.
- [ ] Bing Places en Apple Business Connect met exact dezelfde gegevens.
- [ ] Na elke opdracht om een review vragen (`docs/reviews.md`).

## 5. Inhoud blijven uitbreiden

- [ ] Elke maand één echte, geanonimiseerde praktijkcase (`src/content/cases/LEESMIJ.md`).
- [ ] Elke maand in Search Console kijken welke zoekvragen vertoningen krijgen zonder goede pagina → nieuw kennisbankartikel.
- [ ] Bij wijzigingen in taxatieregels of prijzen: pagina's bijwerken en `today` in `src/content/site.json` aanpassen.
- [ ] Na elke wijziging: `npm run audit`.

## 6. Meten (maandelijks)

- [ ] Search Console: vertoningen en posities op plaatsnamen en vragen.
- [ ] Bedrijfsprofiel: zoekopdrachten, routeverzoeken, telefoontjes.
- [ ] AI-test: stel in ChatGPT, Perplexity en Google vragen als "wie doet funderingsonderzoek in Drachten?" en "wat is een lintvoegwaterpassing?" en noteer of MV Funderingsscan wordt genoemd.
