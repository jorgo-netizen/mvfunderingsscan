# Contentgids MV Funderingsscan

Deze gids geldt voor ALLE pagina-content in `src/content/pages/*.json`.
Lees hem volledig voordat je schrijft. Valideer je bestand daarna met:

    node scripts/check-content.mjs src/content/pages/<jouw-bestand>.json

Het script moet zonder FOUT eindigen. WAARSCHUWINGEN over woordaantal moet je ook oplossen.

---------------------------------------------------------------------
## 1. Merk en toon

- Bedrijf: **MV Funderingsscan** (website mvfunderingsscan.nl). Specialist in funderingsonderzoek voor woningen in **Friesland en Groningen**, gevestigd in **Leeuwarden**.
- Taal: Nederlands, je-vorm, helder, deskundig, rustig. Niet schreeuwerig, geen superlatieven ("de beste", "nummer 1").
- Schrijf voor mensen. Natuurlijk zoekwoordgebruik, NOOIT keyword stuffing. Varieer formuleringen.
- **Answer-first:** elke H2 is bij voorkeur een vraag of duidelijk onderwerp. Het veld `answer` geeft direct een zelfstandig begrijpelijk antwoord in 1–2 zinnen (zo dat een AI-zoekmachine alleen dat stuk kan citeren). Daarna volgt in `body` de verdieping.
- **Geen diagnose op afstand, geen garanties, geen absolute uitspraken.** Gebruik "kan", "vaak", "in veel gevallen", "afhankelijk van de woning". Benadruk dat alleen onderzoek ter plaatse duidelijkheid geeft.
- Niet iedere scheur/klacht = funderingsschade. Leg andere mogelijke oorzaken uit (krimp, temperatuur, roestende lateien, houtwerking, vocht, slecht afgestelde deuren, aanbouw met eigen fundering, enz.).
- Onafhankelijkheid: MV Funderingsscan voert **zelf geen funderingsherstel** uit.

## 2. Feiten die je MAG gebruiken (en verder NIETS verzinnen)

Bedrijf
- Adres: Mr. P. J. Troelstraweg 149, 8919 AA Leeuwarden · Telefoon 058 - 203 71 72 (link `tel:+31582037172`) · E-mail info@mvadviseurs.nl (link `mailto:info@mvadviseurs.nl`) · Bereikbaar ma–vr 09:00–17:00.
- Werkgebied: heel Friesland en de hele provincie Groningen.
- Onderdeel van Midea Vastgoed Adviseurs (alleen noemen op /over-ons/).

Diensten en prijzen (ALTIJD als indicatief presenteren)
- **Fase 0 = Quick Scan / quickscan fundering / funderingscheck**: niet-destructief vooronderzoek. Bestaat uit archief- en bodemonderzoek (bouwjaar, beschikbare (bouw)tekeningen, vermoedelijk funderingstype, bodemopbouw, grondwater, bodemdaling) + visuele inspectie (gevels, metselwerk, scheuren en scheurpatronen, kozijnen, deuren, ramen, vloeren, scheefstand, kruipruimte voor zover toegankelijk, zichtbare funderingsdelen, vocht) + risico-inschatting + rapport met foto's, conclusie en advies.
- Fase 0 prijs: **vanaf circa €350**; bij grotere of complexere woningen kan het hoger uitvallen (indicatief tot circa €550). Definitieve prijs vooraf bekend.
- Fase 0 doorlooptijd: inspectie meestal **binnen enkele werkdagen** ingepland; rapport **binnen 5 werkdagen na de inspectie**. De duur van de inspectie ter plaatse is NIET bekend: noem geen uren/minuten.
- Uitkomsten fase 0: (1) geen directe aanleiding voor vervolgonderzoek, (2) monitoren, (3) aanvullend onderzoek adviseren (bijv. gericht naar één onderdeel, of de kruipruimte toegankelijk maken), (4) fase 1 adviseren.
- **Fase 1** = vervolgonderzoek met metingen, alleen als fase 0 daar aanleiding voor geeft. Onderdelen: lintvoegwaterpassing, scheefstandsmeting/loodmeting, vloerveldwaterpassing, vastleggen en duiden van scheurpatronen, aanvullende inspecties waar nodig. Niet-destructief, geen graafwerk. Prijs **indicatief €750 – €1.500**. Doorlooptijd hangt af van de woning; wordt bij de offerte afgestemd (noem geen dagen).
- Na fase 1 kan het advies zijn: monitoren, nader onderzoek zoals een **inspectieput** (fundering plaatselijk vrijgraven, bij houten palen eventueel houtonderzoek) – dat valt buiten fase 0/1 – of een herstelplan laten uitwerken door een gespecialiseerde partij.
- **Wat een quickscan NIET is:** geen constructieve berekening, geen vrijlegging van de fundering, geen houtonderzoek, geen herstelplan of herstelofferte, geen schademelding (bijv. gaswinning), geen bouwkundige keuring van de hele woning, geen garantie.
- Funderingsherstel kan **tienduizenden euro's** kosten, afhankelijk van type en omvang. Geef GEEN andere bedragen of prijsranges voor herstel. Voor herstelkosten heb je een offerte van een herstelspecialist nodig.

Taxatie (formuleer voorzichtig, "volgens de huidige richtlijnen", "stem af met je taxateur/geldverstrekker")
- Sinds **1 april 2026** werkt het model Taxatierapport Woonruimte (NRVT) met een vaste **funderingsparagraaf**.
- Basis is het funderingsrisicorapport van het **KCAF** (Kenniscentrum Aanpak Funderingsproblematiek) met risicoklassen **A (laag) t/m E (hoog)**.
- Bij **klasse D of E** is aanvullend funderingsonderzoek nodig voordat de taxatie kan worden afgerond. Zonder afgeronde taxatie geen hypotheek.
- Klasse A–C: aanvullend onderzoek in de regel vrijwillig.

Algemene vakkennis (mag, maar zonder getallen/normen)
- Woningen van vóór circa 1970 hebben vaker een fundering op houten palen of op staal (op staal = op de ondergrond, zonder palen; vaak gemetselde of betonnen strook/voet).
- Houten palen blijven goed zolang ze permanent onder water staan; bij lage grondwaterstand kunnen paalkoppen droog komen te staan → schimmels/bacteriën (paalrot) kunnen hout aantasten. Ook onder water kan bacteriële aantasting langzaam optreden. Een woning met houten palen heeft NIET automatisch problemen.
- Veen klinkt in en oxideert bij droogvallen → bodemdaling; klei krimpt bij droogte en zwelt bij nat weer; zand is meestal stabieler. Ongelijke zetting is schadelijker dan gelijkmatige.
- Zetting = normaal samendrukken van grond onder belasting; vooral na de bouw. Verzakking/ongelijke zetting kan wijzen op een probleem.
- Lintvoeg = doorlopende horizontale metselvoeg die destijds (vrijwel) waterpas is gemetseld; hoogteverschillen tonen ongelijke zakking. Loodmeting = afwijking van gevels/wanden t.o.v. verticaal. Vloerveldwaterpassing = raster van hoogtemetingen op de begane grondvloer. Noem GEEN normwaarden, grenswaarden of millimeters.
- Scheurtypes (verticaal, horizontaal, diagonaal, trapvormig) kunnen verschillende oorzaken hebben; patroon, breedte, verloop in de tijd en combinatie met andere signalen zijn bepalend. Zelf monitoren: foto met liniaal/meetlint, datum, herhalen na enkele maanden.
- Aanbouwen hebben vaak een eigen (ondiepere) fundering → scheur op de aansluiting kan daardoor ontstaan.

Regio – ALLEEN deze lokale feiten gebruiken (verder algemeen blijven)
- Friesland: noorden en westen vooral zeeklei (o.a. rond Franeker, Harlingen, Bolsward); midden en zuidoosten grote veengebieden (richting Heerenveen, Drachten); peilbeheer door het waterschap (Wetterskip Fryslân); veenweidegebied met bodemdaling; rond Harlingen bodemdaling door zoutwinning; op enkele plekken gaswinning.
- Leeuwarden: ontstaan op terpen; zachte ondergrond; de Oldehove begon al tijdens de bouw in de 16e eeuw scheef te zakken en is nooit afgebouwd; vooroorlogse wijken o.a. Huizum, Vosseparkwijk, Transvaalwijk, Oranjewijk; historische binnenstad met grachten.
- Sneek: waterstad, historische binnenstad met grachten, de Waterpoort; panden langs het water; klei/veen; gemeente Súdwest-Fryslân.
- Harlingen: havenstad aan de Waddenzee, historische binnenstad met grachten, zeeklei, bodemdaling door zoutwinning.
- Drachten: ontwikkeld mede door vervening (veenontginning, Drachtster Compagnie, 17e eeuw); veen- en zandgronden in de omgeving; veel naoorlogse wijken naast oudere kernen.
- Heerenveen: ontstaan als veenkolonie in de 16e eeuw (vervening); veen in de ondergrond/omgeving.
- Groningen (provincie): noorden (Hogeland) vooral zware zeeklei; oosten/zuidoosten (Veenkoloniën, rond Veendam) van oorsprong veen; Hondsrug (zand) in het zuiden; bodembeweging door gaswinning (aardbevingen, bodemdaling); schade door gaswinning meld je bij het **Instituut Mijnbouwschade Groningen (IMG)** – een funderingsscan is GEEN schademelding.
- Groningen stad: ligt aan de noordpunt van de Hondsrug; delen op zand, lagere delen op klei/veen → risico kan per wijk verschillen; vooroorlogse wijken o.a. Oosterpoort, Schildersbuurt, Korrewegwijk, Herewegbuurt, Badstratenbuurt; Haren hoort bij de gemeente Groningen.
- Appingedam: historische stad aan het Damsterdiep, bekend om de hangende keukens; kleigebied; ligt in het gebied met aardbevingen door gaswinning.
- Delfzijl: havenstad aan de Eems; kleigebied; in het aardbevingsgebied; er is veel versterkingswerk aan woningen geweest/gaande.
- Andere plaatsen in het werkgebied (alleen noemen): Grou, Franeker, Bolsward, Haren, Veendam, Winschoten, Winsum, Zuidhorn.

## 3. Wat je NOOIT doet

- Niets verzinnen: geen reviews, sterren, klantaantallen, jaren ervaring, certificaten, keurmerken, namen van medewerkers, statistieken, percentages, normwaarden, extra prijzen, doorlooptijden die hierboven niet staan.
- Niet kopiëren of parafraseren van mvadviseurs-preview.vercel.app of fundexa.nl.
- Geen `#`-links, geen lege links. Interne links ALLEEN naar paden uit `src/content/urls.json` (met slash aan het eind). Geen links naar de eigen pagina.
- Externe links alleen naar: https://www.kcaf.nl/ , https://www.nrvt.nl/ , https://www.schadedoormijnbouw.nl/ (IMG) – spaarzaam, met `rel="noopener"` en `target="_blank"`.
- Geen placeholders (lorem ipsum, "hier komt tekst", TODO, "binnenkort").
- Geen tekst die alleen bij hover zichtbaar is.
- Geen dubbele content: elke pagina heeft een eigen invalshoek (zie je opdracht). Herhaal niet letterlijk alinea's van andere pagina's.

## 4. JSON-structuur

Elk bestand is een JSON-array met pagina-objecten:

```json
{
  "path": "/funderingsscan/",
  "title": "Funderingsscan voor je woning | MV Funderingsscan",
  "description": "120-158 tekens, uniek, natuurlijk, met het hoofdzoekwoord en een reden om te klikken.",
  "keyword": "funderingsscan",
  "intent": "commercieel",
  "nav_active": "/funderingsscan/",
  "crumbs": [{"href": "/", "name": "Home"}, {"href": "/funderingsscan/", "name": "Funderingsscan"}],
  "eyebrow": "Korte bovenregel, bv. 'Dienst · Funderingsscan'",
  "h1": "Eén duidelijke H1 met het hoofdzoekwoord",
  "lead": "DIRECT ANTWOORD (1–3 zinnen, 35–80 woorden): wat, voor wie, waar. Mag <a> en <strong> bevatten.",
  "hero_image": {"name": "funderingsinspectie-woning-gevel", "alt": "Beschrijvende alt-tekst zonder keyword stuffing"},
  "facts": [{"label": "Prijs", "value": "vanaf ca. €350"}, {"label": "Rapport", "value": "binnen 5 werkdagen"}],
  "services": ["fase0"],
  "article": true,
  "sections": [
    {"id": "wat-is-een-funderingsscan", "h2": "Wat is een funderingsscan?", "answer": "Direct antwoord, 1-2 zinnen.", "body": "<p>Verdieping…</p>"}
  ],
  "faqs": [{"q": "Vraag?", "a": "<p>Eerste zin is het directe antwoord. Daarna verdieping.</p>"}],
  "related": [{"href": "/fase-0-funderingsonderzoek/", "label": "Lees meer over fase 0", "text": "Korte omschrijving (max ~90 tekens)."}],
  "cta": ["Optionele CTA-titel", "Optionele CTA-tekst"]
}
```

Regels per veld
- `title`: uniek, 40–68 tekens, bij voorkeur eindigend op ` | MV Funderingsscan` als dat binnen 68 tekens past.
- `description`: uniek, 120–158 tekens.
- `keyword` + `intent`: neem over uit `src/content/urls.json`.
- `nav_active`: het hoofdmenu-item: één van `/funderingsscan/`, `/funderingsonderzoek-woning/`, `/funderingsproblemen/`, `/werkgebied/`, `/kennisbank/`, `/werkwijze/`, `/contact/`.
- `crumbs`: begint met Home, eindigt met de pagina zelf. Ouders: diensten onder `/funderingsscan/`; aankoop/verkoop/taxatie onder `/funderingsonderzoek-woning/`; probleempagina's onder `/funderingsproblemen/`; regio onder `/werkgebied/` (+ `/funderingsonderzoek-friesland/` of `/funderingsonderzoek-groningen/` voor steden); kennisbank onder `/kennisbank/`. Gebruik in `crumbs` alleen bestaande paden.
- `hero_image.name`: één van `funderingsinspectie-woning-gevel`, `jaren-dertig-woningen-straat`, `vooroorlogse-woning-voordeur`, `metselwerk-gevel-detail` (optioneel; alt-tekst moet het beeld beschrijven: respectievelijk specialist met waterpas bij gevel / rij jaren-dertigwoningen in groene straat / klassieke voordeur in bakstenen gevel / close-up metselwerk en voegen).
- `facts`: optioneel, 3–4 regels, alleen toegestane feiten.
- `services`: alleen op dienstpagina's: `funderingsscan`, `fase0`, `fase1`.
- `article: true` op alle kennisbankartikelen (en alleen daar).
- `sections[].id`: unieke kebab-case slug binnen de pagina (wordt gebruikt voor de inhoudsopgave).
- `sections[].h2`: platte tekst, geen HTML.
- `faqs`: 3–8 per pagina (pillar- en kernpagina's: 10–12; grote meet- en begrippenpagina's: 8–10, zie 7.4); vragen uniek binnen de pagina; antwoord begint met een directe zin in `<p>`. Alleen `<p>`, `<a>`, `<strong>`, `<ul><li>` in antwoorden.
- `related`: precies 3 relevante interne links met beschrijvende labels (nooit "klik hier").

## 5. HTML-componenten voor `body` (gebruik exact deze markup)

Gebruik waar nuttig – visueel afwisselend, maar niet overdadig.

- Alinea's/tussenkoppen: `<p>…</p>`, `<h3>…</h3>` (H3 alleen binnen een sectie).
- Checklist: `<ul class="checklist"><li>…</li></ul>`
- Callout: `<div class="callout callout-note"><strong>Titel</strong><p>Tekst</p></div>` – varianten `callout-note` (info), `callout-tip` (praktische tip), `callout-warn` (let op / beperking).
- Tabel: `<div class="table-wrap"><table class="data-table"><thead><tr><th>…</th><th>…</th></tr></thead><tbody><tr><td>…</td><td>…</td></tr></tbody></table></div>`
- Infokaarten (2–4): `<div class="info-cards"><div class="info-card"><h3>Titel</h3><p>Tekst</p></div>…</div>`
- Stappen: `<ol class="mini-steps"><li><strong>Titel</strong><span>Uitleg</span></li>…</ol>`
- Uitkomsten: `<div class="mini-outcomes"><div class="mini-outcome mini-ok"><strong>…</strong><span>…</span></div><div class="mini-outcome mini-watch">…</div><div class="mini-outcome mini-extra">…</div><div class="mini-outcome mini-next">…</div></div>` (ok=groen, watch=goud, extra=lichtblauw, next=navy)
- Twee kolommen: `<div class="two-col-list"><div><h3>…</h3><ul class="checklist"><li>…</li></ul></div><div><h3>…</h3>…</div></div>`
- Linkkaarten naar fasen/diensten: `<div class="phase-mini"><a href="/fase-0-funderingsonderzoek/" class="phase-mini-card"><span class="phase-tag">Fase 0</span><strong>Quick Scan</strong><span>Korte uitleg.</span></a><a href="/fase-1-funderingsonderzoek/" class="phase-mini-card"><span class="phase-tag phase-tag-navy">Fase 1</span><strong>…</strong><span>…</span></a></div>`
- Plaatsen: `<ul class="town-chips"><li><a href="/funderingsonderzoek-leeuwarden/">Leeuwarden</a></li><li>Grou</li></ul>`
- Definitielijst: `<dl class="def-list"><div><dt>Term</dt><dd>Uitleg</dd></div></dl>`
- Tabs (alle inhoud blijft in HTML; zonder JS staan panelen onder elkaar): `<div class="tabs"><section class="tab-panel" data-tab="Label"><h3>Label</h3><p>…</p></section>…</div>` (2–5 panelen)
- Interactieve checklist (bezoeker kan afvinken): `<ul class="check-interactive"><li>…</li></ul>`

Inline links in tekst: `<a href="/pad/">beschrijvende ankertekst</a>`.

## 6. Interne linking (verplicht)

- Elke pagina linkt in de tekst naar minimaal 4 andere relevante pagina's (los van `related`).
- Clusterregels: fase 0 ↔ quickscan ↔ fase 1 ↔ prijzen ↔ aanvragen; probleempagina's → /funderingsproblemen/, /quickscan-fundering/, /fase-0-funderingsonderzoek/; aankoop/verkoop/taxatie → /funderingsscan/, /fase-0-funderingsonderzoek/, /prijzen/; regio → /funderingsscan/, /fase-0-funderingsonderzoek/, /werkgebied/, een provinciepagina; kennisbank → de bijbehorende pillar/dienstpagina.
- Conversielinks: `/funderingsscan-aanvragen/` (aanvragen), `/contact/` (vraag stellen / "Weet je niet welke fase je nodig hebt?"), `/funderingsscan-check/` (online check), `/prijzen/`.

---------------------------------------------------------------------
## 7. Aanvulling kennisplatform (meetmethoden, begrippen, definities)

### 7.1 Extra toegestane vakkennis over meetmethoden (algemeen, ZONDER getallen of normen)
- **Lintvoegwaterpassing:** hoogtemeting langs één doorlopende horizontale metselvoeg (lintvoeg), op meerdere punten verdeeld over de gevel (o.a. bij hoeken, naast kozijnen, bij aansluitingen, op regelmatige afstanden). Uitgevoerd met een waterpasinstrument of vergelijkbaar (digitaal/laser) meetinstrument; alle punten worden ten opzichte van één referentiepunt bepaald. Resultaat: een hoogteprofiel/grafiek of tekening met relatieve hoogteverschillen. Interpretatie: het patroon (bijv. een hoek die lager ligt, een geleidelijk aflopende lijn, een knik) is belangrijker dan één punt. Beperkingen: een lintvoeg is bij de bouw nooit perfect waterpas gemetseld (bouwtoleranties), latere verbouwingen/hermetselen kunnen de voeg verstoren; één meting zegt niets over of beweging nog doorgaat (daarvoor herhaalmeting/monitoring); de meting toont vervorming van de gevel, niet de oorzaak en niet de staat van palen of hout.
- **Loodmeting:** meet de afwijking van een gevel, wand of kozijnstijl ten opzichte van de verticaal (het lood), meestal op meerdere hoogtes en plekken; vroeger met een schietlood, tegenwoordig vaak met (laser)meetinstrumenten. Vastgelegd als afwijking en richting (bijv. voorover, achterover, naar links/rechts). Beperkingen: gevels zijn niet altijd te lood gebouwd; uitbuiging van metselwerk of houtwerk kan andere oorzaken hebben; ook hier is één meting een momentopname.
- **Vloerveldwaterpassing:** raster van meetpunten over de (begane grond)vloer per vertrek, hoogtes t.o.v. één referentiepunt; resultaat vaak als hoogtekaart met hoogtelijnen of kleurvlakken. Een "vloerveld" is het vloeroppervlak van een vertrek of een deel tussen dragende muren. Beperkingen: vloeren zijn niet altijd vlak gelegd, afwerklagen kunnen verschillen, houten vloeren kunnen doorbuigen of zakken door de balklaag zelf, losse vloerbedekking/meubels beperken de meetpunten.
- **Scheurpatronen/scheurmeting:** vastleggen van locatie, richting, lengte, breedte (ook verloop van breed naar smal) en ontwikkeling in de tijd, met foto's (met maatstok/liniaal) en schetsen of plattegronden. Hulpmiddelen voor monitoring zijn bijv. een scheurmeter of meetmerkjes aan weerszijden van een scheur. Noem geen grenswaarden.
- **Zetting/monitoring:** zetting = het samendrukken van de ondergrond onder belasting, vooral in de eerste jaren na de bouw; ongelijke zetting = verschillende delen zakken verschillend → vervorming, scheuren. Of zetting nog doorgaat blijkt pas uit herhaalde metingen over een langere periode (monitoring).
- **Hoogtemeting / maaiveld:** hoogtes worden onderling (relatief) of t.o.v. NAP (Normaal Amsterdams Peil) bepaald. Maaiveld = de hoogte van het terrein rondom de woning; een verzakt maaiveld kan wijzen op bodemdaling/inklinking maar zegt niet automatisch iets over de fundering.
- **Grondwater:** grondwaterstanden worden gemeten in peilbuizen; gemeenten, waterschappen en provincies beheren vaak meetnetten; peilbeheer in polders gebeurt door het waterschap. Relevant voor houten palen (droogstand) en voor zetting van veen en klei.
- **Archiefonderzoek:** bronnen kunnen o.a. zijn: (gemeentelijk) bouwarchief met bouwvergunningen en -tekeningen, gegevens over bouwjaar, eerdere verbouwingen/aanbouwen, eventuele eerdere funderingsrapporten of herstel, bodemkaarten en openbare gegevens over grondwater en bodemdaling. Niet bij elke woning is alles beschikbaar; ontbrekende gegevens worden als beperking genoemd.
- **Kosten:** losse meetmethoden hebben GEEN eigen prijs; ze maken deel uit van fase 1 (indicatief €750 – €1.500 totaal). Zeg dat de prijs afhangt van welke metingen nodig zijn en vooraf wordt afgestemd.

### 7.2 Nieuwe velden
- `defined_term` (alleen als je opdracht dat noemt): `{"name": "Lintvoegwaterpassing", "description": "Eén heldere definitiezin van 20–40 woorden."}` – wordt zichtbaar als definitieblok bovenaan de pagina én als DefinedTerm-schema. De definitie moet inhoudelijk overeenkomen met de lead.

### 7.3 Extra component "Wat betekent dit?"
`<div class="term-box"><strong>Wat betekent ongelijke zetting?</strong><p>Korte uitleg in 1–3 zinnen.</p><a href="/kennisbank/ongelijke-zetting/">Lees meer over ongelijke zetting</a></div>`
Gebruik deze blokken voor moeilijke begrippen (1–3 per pagina). De link is optioneel en moet naar een bestaand pad uit urls.json gaan (niet naar de eigen pagina).

### 7.4 FAQ's op kennispagina's
- Grote meet- en begrippenpagina's: 8–10 echte zoekvragen ("mensen vragen ook").
- Overige nieuwe kennisbankpagina's: 5–8 FAQ's.
- Antwoord altijd met een directe eerste zin.

### 7.5 Werkbestanden
Gebruik voor tijdelijke scripts een eigen map buiten `src/` (bijv. `tmp/<jouwnaam>/`; `tmp/` staat in .gitignore).

### 7.6 Extra lokale feiten (alleen deze, verder algemeen blijven)
- Franeker: historische Friese stad in het kleigebied in het noordwesten van Friesland; historische binnenstad; bekend om het Eise Eisinga Planetarium; voormalige universiteitsstad.
- Haren: sinds 2019 onderdeel van de gemeente Groningen; ligt op de Hondsrug (zandrug), met in de omgeving ook lager gelegen gebieden; veel vrijstaande en oudere woningen.
- Veendam: ligt in de Veenkoloniën en is ontstaan door vervening (veenontginning); ondergrond in de omgeving van oorsprong veen op zand.
- Winschoten: stad in Oost-Groningen, gemeente Oldambt; het Oldambt staat bekend om zware kleigronden.
- Leeuwarden (funderingsscan-pagina): zie de eerdere feiten in sectie 2; kantoor van MV Funderingsscan staat in Leeuwarden (Mr. P. J. Troelstraweg 149).

### 7.7 Gemeentepagina's – toegestane feiten (formuleer voorzichtig: "in grote delen", "kan per kern verschillen")
- De kernen per gemeente staan in `src/content/site.json` onder `gemeenten`. Noem ALLEEN die kernen (geen andere dorpen verzinnen). Onder de pagina wordt automatisch een blok "Kernen in de gemeente" getoond; jouw tekst noemt de kernen ook natuurlijk in de lopende tekst.
- **Friese Wouden** (Achtkarspelen, Tytsjerksteradiel, Dantumadiel, Opsterland, delen van Smallingerland): coulisselandschap met houtwallen; ondergrond vooral zand en veen, richting het noorden ook klei.
- **Stellingwerven** (Ooststellingwerf, Weststellingwerf): overwegend zandgronden met beekdalen en plaatselijk veen; Appelscha ligt bij een bos- en heidegebied.
- **De Fryske Marren**: merengebied in zuidwest-Friesland; veen en klei; historische stadjes zoals Sloten; Lemmer aan het IJsselmeer.
- **Noardeast-Fryslân**: noordelijk kleigebied langs de Waddenkust; Dokkum is een historische vestingstad.
- **Eemsdelta**: Appingedam, Delfzijl en Loppersum; kleigebied; ligt in het gebied met aardbevingen door gaswinning; Loppersum ligt dicht bij het centrum van het Groningenveld.
- **Het Hogeland**: noordelijk zeekleigebied (zie gids sectie 2); wierden (terpen) en karakteristieke dorpskerken; delen liggen in het gebied met bodembeweging door gaswinning.
- **Midden-Groningen**: Hoogezand-Sappemeer en Slochteren; bij Slochteren werd in 1959 het Groningen-gasveld ontdekt; veen- en kleigronden; bodembeweging door gaswinning.
- **Pekela, Stadskanaal**: Veenkoloniën, ontstaan door vervening, lange kanalen en lintbebouwing; ondergrond van oorsprong veen op zand.
- **Westerkwartier**: in het noorden klei, in het zuiden zand en veen; mix van dorpen en het groeikerngebied Leek/Zuidhorn.
- **Westerwolde**: zandgronden met esdorpen; Bourtange is een gerestaureerde vestingstad; Ter Apel bekend om het klooster.
- Gaswinning: alleen benoemen waar hierboven genoemd; altijd met de nuance dat een funderingsscan geen schademelding is (IMG).
