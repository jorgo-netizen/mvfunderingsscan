# Artikelen importeren

**Waar:** Beheer → Redactie → Concepten → **Artikelen importeren (JSON)**.

Elk artikel wordt een **concept** en krijgt meteen de kwaliteitscontrole voor SEO, GEO, prijzen en bronnen. Er wordt niets gepubliceerd. De volgorde is altijd: concept nakijken → **Goedkeuren** (gaat naar Nieuws) → **Publiceren**.

- Met **Voorbeeldbestand downloaden** krijg je een bestand dat je als basis kunt gebruiken.
- Per bestand kun je maximaal 50 artikelen importeren.

## Velden per artikel

| Veld | Verplicht | Richtlijn voor de beste SEO/GEO |
|---|---|---|
| `titel` | ja | Het hoofdzoekwoord vooraan, bij voorkeur maximaal 55 tekens. Dit is ook de titel in Google: `{titel} \| MV Funderingsscan`. |
| `slug` | nee | Kort, kleine letters, met koppeltekens. Het hoofdzoekwoord erin, zonder datum. Laat je het leeg, dan wordt de slug uit de titel gemaakt. |
| `seo_titel` | aanbevolen | Maximaal 60 tekens. Wordt nu alleen in de controle gebruikt. Op de site telt de `titel`. |
| `meta_description` | ja | 120–160 tekens, met het hoofdzoekwoord, een voordeel voor de lezer en de regio. |
| `hoofdzoekwoord` | ja | Eén zoekterm, bijvoorbeeld `funderingsonderzoek leeuwarden`. Moet in de titel of de intro staan. |
| `zoekwoorden` (of `tags`) | nee | 3–8 verwante termen, als lijst of komma-gescheiden. |
| `type` (of `categorie`) | ja | `nieuws`, `regionaal`, `kennis`, `weetje`, `praktijk` of `zelftest`. |
| `intro` | ja | Een direct antwoord van **25–90 woorden**. AI-zoekmachines citeren deze alinea het vaakst. |
| `inhoud_html` (of `inhoud` in Markdown) | ja | Minstens 2 tussenkoppen (`<h2>`), korte alinea's en lijsten. Gebruik geen `<h1>`, die maakt de site zelf. |
| `faqs` | aanbevolen | 3–6 vragen `{ "vraag", "antwoord" }`. Elk antwoord moet los leesbaar zijn: noem de plaats en MV Funderingsscan. |
| `bronnen` | nieuws: ja | `{ "titel", "url", "uitgever", "datum" }`. Gebruik officiële bronnen, zoals KCAF, de Rijksoverheid, de provincie, de gemeente of STOWA. |
| `interne_links` | aanbevolen | 2–4 links `{ "url": "/pagina/", "tekst": "…" }` naar diensten- of plaatspagina's. |
| `afbeelding` + `afbeelding_alt` | aanbevolen | Een naam uit de beeldbank, of laat het leeg en upload daarna een eigen foto in het concept. De alt-tekst beschrijft wat er op de foto te zien is. |

**Minimale lengte per type:**

| Type | Minimaal |
|---|---|
| nieuws, regionaal, praktijk | 300 woorden |
| weetje | 150 woorden |
| kennis | 700 woorden |

**Wat wel en niet werkt in de tekst:**
- **Wel:** HTML-koppen, alinea's, lijsten, vet, cursief, links en citaten. Links naar `https://www.mvfunderingsquickscan.nl/...` worden automatisch interne links.
- **Niet:** andere HTML, zoals tabellen, afbeeldingen en scripts. Die verdwijnt.
- **Bedragen:** alleen €350 en €950, anders krijg je een open punt in de controle.
- **Praktijkvoorbeelden:** die moeten "fictief" heten, tenzij het een echte case is.

## Opdracht voor een AI-schrijver (ChatGPT, Claude)

> Schrijf een artikel voor MV Funderingsscan (onafhankelijk funderingsonderzoek in Friesland, Groningen en Noord-Drenthe; Quick Scan vanaf €350, fase 1 vanaf €950, geen herstelwerk). Onderwerp: …, hoofdzoekwoord: …, type: kennis. Lever **alleen** JSON in dit formaat: `{"artikelen":[{ "type","titel","slug","seo_titel","meta_description","hoofdzoekwoord","zoekwoorden":[],"intro","inhoud_html","faqs":[{"vraag","antwoord"}],"bronnen":[{"titel","url","uitgever","datum"}],"interne_links":[{"url","tekst"}] }]}`. Eisen:
> - Schrijf in de je-vorm en in helder Nederlands.
> - Begin met een intro van 25–90 woorden die direct antwoord geeft.
> - Gebruik minstens 2 `<h2>`-koppen.
> - Schrijf 3–5 FAQ's met antwoorden die los leesbaar zijn.
> - Gebruik alleen echte, controleerbare bronnen met een werkende URL.
> - Verzin geen cijfers, klanten of reviews.
> - Gebruik als interne links alleen bestaande pagina's, zoals /fase-0-funderingsonderzoek/, /prijzen/, /funderingsscan-aanvragen/, /problemen-met-houten-palen/ en /funderingsonderzoek-leeuwarden/.

Controleer de feiten en bronnen altijd zelf in het concept voordat je goedkeurt.
