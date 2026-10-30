# Meten en monitoren

De site bevat bewust **geen** trackingcode. Analytics met cookies vraagt om een cookiebanner en
toestemming; dat is een keuze voor de eigenaar. Hieronder staat wat je kunt meten en hoe.

## 1. Google Search Console (zonder cookies, aanbevolen)

1. Voeg `https://www.mvfunderingsquickscan.nl` toe als **domeineigendom** (DNS-verificatie).
2. Dien `https://www.mvfunderingsquickscan.nl/sitemap.xml` in.
3. Bekijk maandelijks:
   - **Prestaties** → klikken, vertoningen, CTR en positie per zoekopdracht en per pagina;
   - filter op plaatsnamen (Leeuwarden, Sneek, Groningen …) en op vragen ("wat is", "wat kost");
   - **Pagina's** → welke pagina's zijn geïndexeerd en waarom andere niet;
   - **Core Web Vitals** → mobiel en desktop.
4. Doe hetzelfde in **Bing Webmaster Tools** (importeren uit Search Console kan). Bing voedt ook ChatGPT Search en Copilot.

## 2. Conversies meten

| Wat | Hoe |
|---|---|
| Aanvragen via het formulier | Elke aanvraag komt als e-mail binnen (Resend). Tel ze per maand en noteer de bron die de klant opgeeft. |
| Telefoontjes | Vraag aan de telefoon "Hoe heeft u ons gevonden?" en noteer het. |
| Klikken op telefoon/e-mail | Alleen meetbaar met analytics (zie 3). |

## 3. Google Analytics 4 (optioneel)

Wil je GA4 gebruiken, dan:

- heb je een **cookiebanner met toestemming** nodig (AVG/Telecommunicatiewet), tenzij je een
  privacyvriendelijk alternatief kiest zonder cookies, zoals Plausible of Simple Analytics;
- meet je als gebeurtenissen: `generate_lead` (formulier verzonden), `click_phone` (tel:-link),
  `click_email` (mailto:-link);
- voeg je het script alleen toe na akkoord van de eigenaar. Het hoort in `src/lib/layout.mjs`, in de `head()`-functie.

## 4. AI-zichtbaarheid (handmatig, maandelijks)

Stel in ChatGPT, Perplexity, Copilot en Google (AI-overzicht) vragen als:

- "Wie doet funderingsonderzoek in Leeuwarden?"
- "Wat kost een funderingsscan in Friesland?"
- "Wat is het verschil tussen fase 0 en fase 1 funderingsonderzoek?"
- "Wat betekent funderingsrisico D bij een taxatie?"

Noteer of MV Funderingsscan genoemd of geciteerd wordt, en welke pagina.
