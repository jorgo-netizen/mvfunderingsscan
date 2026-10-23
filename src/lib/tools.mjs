/**
 * Interactieve hulpmiddelen (lead- en educatielaag).
 *
 * Gebruik in een sectie: "widget": "funderingscheck" | "vertelwatjeziet" | "situatiekeuze" | "kostenwijzer" |
 *   "dienstvergelijking" | "quickscantijdlijn" | "bouwjaarfundering" | "risicoklassen" | "stapwizard" |
 *   "aankoopcheck" | "scenario" | "meetwaarden" | "funderingsquiz" | "werkgebiedkaart" | "contactformulier"
 * Pagina's met een van deze widgets krijgen `"tools": true` (laadt /tools.css en /tools.js).
 *
 * Regels (zie CONTENT-GUIDE §8): geen diagnoses, geen verzonnen feiten, alleen bestaande prijzen,
 * elk resultaat vermeldt wat het wel en niet betekent. Alle tekst staat in de HTML; JS voegt alleen gedrag toe.
 */

const DISCLAIMER = 'Deze tool geeft alleen een indicatie op basis van de ingevulde antwoorden. Het is geen funderingsdiagnose en vervangt geen professioneel funderingsonderzoek.';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const opt = (name, value, label, type = 'radio') => `<label class="tq-opt"><input type="${type}" name="${name}" value="${value}"><span>${label}</span></label>`;

// ---------------------------------------------------------------- gedeeld leadformulier
const PRIVACY = `<p class="form-privacy tool-privacy"><strong>Privacy:</strong> we gebruiken je gegevens en eventuele foto's alleen om je vraag te beantwoorden en contact met je op te nemen. Ze worden per e-mail naar MV Funderingsscan verstuurd (via een e-maildienst) en niet op deze website opgeslagen. Foto's worden vóór verzending verkleind; daarbij worden locatie- en cameragegevens (EXIF) verwijderd. We verkopen of verhuren je gegevens niet aan derden. Vragen? Mail naar <a href="mailto:info@mideavastgoed.nl">info@mideavastgoed.nl</a>.</p>`;

function leadForm(tool, { title = 'Bespreek mijn situatie', intro = 'Laat je gegevens achter, dan nemen we contact met je op. Je antwoorden uit deze tool sturen we automatisch mee.', button = 'Verstuur', copy = true, hidden = true } = {}) {
  const id = `lf-${tool}`;
  return `
<form class="tool-lead" data-tool-lead="${tool}" id="${id}" novalidate${hidden ? ' data-collapsible' : ''}>
  <h3>${title}</h3>
  <p>${intro}</p>
  <div class="tf-grid">
    <div class="tf"><label for="${id}-naam">Naam <span aria-hidden="true">*</span></label><input id="${id}-naam" name="naam" autocomplete="name" required></div>
    <div class="tf"><label for="${id}-email">E-mail <span aria-hidden="true">*</span></label><input id="${id}-email" name="email" type="email" autocomplete="email" required></div>
    <div class="tf"><label for="${id}-tel">Telefoon <span class="field-opt">(optioneel)</span></label><input id="${id}-tel" name="telefoon" type="tel" autocomplete="tel"></div>
    <div class="tf"><label for="${id}-plaats">Plaats <span class="field-opt">(optioneel)</span></label><input id="${id}-plaats" name="plaats" autocomplete="address-level2"></div>
    <div class="tf tf-full"><label for="${id}-bericht">Toelichting <span class="field-opt">(optioneel)</span></label><textarea id="${id}-bericht" name="bericht" rows="3"></textarea></div>
  </div>
  <div class="hp-field" aria-hidden="true"><label for="${id}-website">Website</label><input id="${id}-website" name="website" tabindex="-1" autocomplete="off"></div>
  ${copy ? `<label class="check-line"><input type="checkbox" name="kopie"> <span>Stuur mij ook een kopie van mijn antwoorden en het resultaat per e-mail</span></label>` : ''}
  <label class="check-line"><input type="checkbox" name="privacy" required> <span>Ik geef toestemming om mijn gegevens te gebruiken voor het beantwoorden van mijn vraag. <span aria-hidden="true">*</span></span></label>
  ${PRIVACY}
  <p class="form-status" role="status" aria-live="polite" hidden></p>
  <button type="submit" class="btn btn-gold">${button} <span aria-hidden="true">→</span></button>
  <div class="tool-lead-success" hidden tabindex="-1"><strong>Bedankt, je bericht is verstuurd.</strong><p>We nemen zo snel mogelijk contact met je op. Liever direct contact? Bel <a href="tel:+31582037172">+31 (0) 582037172</a>.</p></div>
</form>`;
}

const meaning = (wel, niet, doen) => `<div class="tr-meaning">
  <div><h4>Wat betekent dit?</h4>${wel}</div>
  <div><h4>Wat betekent dit niet?</h4>${niet}</div>
  <div><h4>Wat kun je nu doen?</h4>${doen}</div>
</div>`;

// ---------------------------------------------------------------- 1. gratis funderingscheck
const CHECK_STEPS = [
  ['bouwjaar', 'Wat is ongeveer het bouwjaar van de woning?', [['voor1900', 'Vóór 1900'], ['1900-1930', '1900–1930'], ['1930-1970', '1930–1970'], ['1970-2000', '1970–2000'], ['na2000', 'Na 2000'], ['onbekend', 'Weet ik niet']]],
  ['provincie', 'Waar staat de woning?', [['friesland', 'Friesland'], ['groningen', 'Groningen (provincie)'], ['anders', 'Ergens anders']], true],
  ['scheuren', 'Zie je scheuren in muren of gevels?', [['nee', 'Nee'], ['binnen', 'Ja, binnen'], ['buiten', 'Ja, buiten'], ['beide', 'Ja, binnen én buiten'], ['onbekend', 'Weet ik niet']]],
  ['groei', 'Worden scheuren groter of zijn er recent nieuwe bijgekomen?', [['ja', 'Ja'], ['nee', 'Nee, ze lijken gelijk te blijven'], ['nvt', 'Geen scheuren / niet van toepassing'], ['onbekend', 'Weet ik niet']]],
  ['klemmen', 'Klemmen deuren of ramen (meer dan vroeger)?', [['ja', 'Ja'], ['nee', 'Nee'], ['onbekend', 'Weet ik niet']]],
  ['vloer', 'Zie of merk je hoogteverschillen of een scheve vloer?', [['ja', 'Ja'], ['nee', 'Nee'], ['onbekend', 'Weet ik niet']]],
  ['fundering', 'Is het funderingstype bekend?', [['houtenpalen', 'Ja, houten palen'], ['betonpalen', 'Ja, betonnen palen'], ['staal', 'Ja, op staal (zonder palen)'], ['onbekend', 'Nee / weet ik niet']]],
  ['klasse', 'Is er een KCAF-risicoklasse bekend, bijvoorbeeld uit een taxatierapport?', [['abc', 'Ja, klasse A, B of C'], ['de', 'Ja, klasse D of E'], ['onbekend', 'Nee / weet ik niet']]],
  ['onderzoek', 'Is er eerder funderingsonderzoek gedaan?', [['nee', 'Nee'], ['ok', 'Ja, zonder bijzonderheden'], ['aandacht', 'Ja, met aandachtspunten of een vastgesteld probleem'], ['onbekend', 'Weet ik niet']]],
  ['situatie', 'Wat is je situatie?', [['kopen', 'Ik wil een woning kopen'], ['verkopen', 'Ik verkoop mijn woning'], ['wonen', 'Het is mijn eigen woning'], ['taxatie', 'Het gaat om een taxatie'], ['anders', 'Anders']]],
];

function funderingscheckWidget() {
  const steps = CHECK_STEPS.map(([name, q, opts, plaats], i) => `
    <fieldset class="tq-step" data-step="${i}">
      <legend><span class="tq-num">Vraag ${i + 1} van ${CHECK_STEPS.length + 1}</span>${q}</legend>
      <div class="tq-opts">${opts.map(([v, l]) => opt(name, v, l)).join('')}</div>
      ${plaats ? '<div class="tf tq-extra"><label for="fc-plaats">Plaats <span class="field-opt">(optioneel)</span></label><input id="fc-plaats" name="plaats" autocomplete="address-level2"></div>' : ''}
    </fieldset>`).join('');
  const results = [
    ['weinig', 'Weinig signalen', 'Op basis van je antwoorden zien we momenteel weinig duidelijke signalen die direct aanleiding geven voor nader funderingsonderzoek.'],
    ['enkele', 'Enkele signalen', 'Je antwoorden bevatten enkele signalen of omstandigheden die het waard kunnen zijn om verder te bekijken.'],
    ['meerdere', 'Meerdere signalen', 'Je antwoorden bevatten meerdere signalen die aanleiding kunnen geven om het funderingsrisico nader te laten beoordelen.'],
    ['sterk', 'Sterke aanleiding', 'Je antwoorden bevatten signalen of gegevens waarbij het verstandig kan zijn om de situatie professioneel te laten beoordelen.'],
    ['onvoldoende', 'Te weinig informatie voor een indicatie', 'Je hebt veel vragen met "weet ik niet" beantwoord. Daardoor kunnen we op basis van deze antwoorden geen zinvolle indicatie geven. Dat zegt niets over de staat van de fundering.'],
  ].map(([k, t, p]) => `<div class="tr-cat" data-cat="${k}" hidden><span class="tr-badge">Indicatie</span><h3>${t}</h3><p>${p}</p></div>`).join('');
  return `
<div class="tool tool-check" data-tool="funderingscheck" id="funderingscheck">
  <div class="sim-head">
    <span class="sim-badge">Gratis Funderingscheck · ca. 2 minuten</span>
    <h3>Beantwoord ${CHECK_STEPS.length + 1} korte vragen</h3>
    <p class="sim-instruction">Je antwoorden blijven in je browser, tenzij je ze aan het eind zelf naar ons verstuurt.</p>
  </div>
  <noscript><p class="callout callout-warn">Deze check werkt met JavaScript. Je kunt je vraag ook stellen via <a href="/contact/">contact</a>.</p></noscript>
  <form class="tq" data-tq novalidate>
    <div class="tq-progress" aria-hidden="true"><span></span></div>
    <p class="tq-count" aria-live="polite"></p>
    ${steps}
    <fieldset class="tq-step" data-step="${CHECK_STEPS.length}">
      <legend><span class="tq-num">Vraag ${CHECK_STEPS.length + 1} van ${CHECK_STEPS.length + 1}</span>Wat wil je vooral weten? <span class="field-opt">(optioneel)</span></legend>
      <label class="sr-only" for="fc-doel">Wat wil je vooral weten?</label>
      <textarea id="fc-doel" name="doel" rows="3" placeholder="Bijvoorbeeld: of de scheur boven de achterdeur iets met de fundering te maken kan hebben."></textarea>
    </fieldset>
    <div class="tq-nav">
      <button type="button" class="btn btn-ghost-dark" data-tq-prev>Vorige</button>
      <button type="button" class="btn btn-gold" data-tq-next>Volgende <span aria-hidden="true">→</span></button>
      <button type="submit" class="btn btn-gold" data-tq-done hidden>Bekijk mijn indicatie <span aria-hidden="true">→</span></button>
    </div>
    <p class="tq-error" role="alert" hidden>Kies een antwoord om verder te gaan. Weet je het niet? Kies dan "Weet ik niet".</p>
  </form>
  <div class="tool-result" data-tq-result tabindex="-1" hidden aria-live="polite">
    ${results}
    <div class="tr-lists">
      <div><h4>Signalen in je antwoorden</h4><ul class="checklist" data-out="signalen"></ul></div>
      <div><h4>Omstandigheden om mee te wegen</h4><ul class="checklist" data-out="factoren"></ul></div>
    </div>
    <p class="tr-note" data-out="onbekend" hidden>Je hebt meerdere vragen met "weet ik niet" beantwoord. Daardoor is deze indicatie minder betrouwbaar.</p>
    <p class="tr-note" data-out="tegenstrijdig" hidden>Je gaf aan geen scheuren te zien, maar ook dat scheuren groter worden. Dat laatste hebben we niet meegeteld. Klopt het niet, begin dan opnieuw.</p>
    <p class="tr-note" data-out="buiten" hidden>MV Funderingsscan werkt in Friesland en Groningen. Staat de woning elders, dan kunnen we daar geen inspectie uitvoeren; de uitleg op deze pagina blijft wel bruikbaar.</p>
    <p class="tr-note" data-out="klasse-de" hidden>Je noemt klasse D of E. Volgens het NRVT moet bij een taxatie met klasse D of E in principe eerst een aanvullend (beperkt) funderingsonderzoek plaatsvinden voordat het taxatierapport wordt afgerond; daarop bestaan uitzonderingen. Stem af met je taxateur wat er nodig is. Zie <a href="/funderingsrisicoklasse-uitgelegd/">risicoklassen A tot en met E uitgelegd</a>.</p>
    ${meaning(
      '<p>Je antwoorden zijn naast elkaar gelegd: zichtbare signalen (zoals scheuren, klemmende deuren en een scheve vloer) en omstandigheden (zoals het bouwjaar en een bekend funderingstype). Hoe meer signalen samen voorkomen, hoe eerder het zinvol kan zijn om de situatie te laten beoordelen.</p>',
      '<p>Dit is geen funderingsdiagnose. Het zegt niet dat er funderingsschade is, en ook niet dat alles in orde is. Scheuren, klemmende deuren en scheve vloeren kunnen ook andere oorzaken hebben, zoals krimp, temperatuurwerking, vocht of een roestende latei.</p>',
      '<p data-out="advies"></p><p>Twijfel je? Laat je situatie vrijblijvend bekijken, of lees eerst <a href="/quickscan-fundering/">wat een quickscan fundering is</a>.</p>')}
    <div class="tr-actions">
      <button type="button" class="btn btn-gold" data-lead-open="funderingscheck">Bespreek mijn situatie <span aria-hidden="true">→</span></button>
      <a class="btn btn-ghost-dark" href="/funderingsscan-aanvragen/" data-track="cta_quickscan">Plan een Quick Scan</a>
      <button type="button" class="btn btn-link" data-tq-reset>Opnieuw beginnen</button>
    </div>
    <p class="tr-disclaimer"><strong>Let op:</strong> deze Funderingscheck geeft alleen een indicatie op basis van de ingevulde antwoorden. Het is geen funderingsdiagnose en vervangt geen professioneel funderingsonderzoek.</p>
    ${leadForm('funderingscheck')}
  </div>
</div>`;
}

// ---------------------------------------------------------------- 2. signalen + vertel ons wat je ziet (met foto's)
const SIGNALEN = [
  ['gevel', 'Scheuren in de gevel', 'Scheuren in metselwerk kunnen door zetting ontstaan, maar ook door krimp, temperatuurwerking of roestende ankers en lateien.', '/scheuren-in-gevel/', 'Scheuren in de gevel'],
  ['kozijn', 'Scheuren boven kozijnen', 'Boven ramen en deuren wijzen scheuren vaak op de latei of het metselwerk erboven; bij meerdere kozijnen kan een patroon relevant zijn.', '/kennisbank/scheuren-boven-kozijnen/', 'Scheuren boven kozijnen'],
  ['vloer', 'Scheve vloer', 'Een aflopende vloer kan met de fundering te maken hebben, maar ook met de vloerconstructie zelf of met hoe de vloer ooit is gelegd.', '/kennisbank/helling-in-vloer/', 'Helling in de vloer'],
  ['deuren', 'Deuren klemmen', 'Klemmende deuren kunnen ontstaan door vocht en seizoenswerking van hout, maar ook door vervorming van de woning.', '/kennisbank/klemmende-deuren/', 'Klemmende deuren'],
  ['ramen', 'Ramen klemmen', 'Ook bij ramen spelen vocht, scharnieren en afstelling een rol; klemmen op meerdere plekken tegelijk weegt zwaarder.', '/kennisbank/klemmende-ramen/', 'Klemmende ramen'],
  ['plinten', 'Plinten lopen niet recht', 'Een kier tussen vloer en plint kan op een zakkende vloer wijzen, maar ook op werking van de plint of een oneffen vloer.', '/kennisbank/helling-in-vloer/', 'Hellingen en hoogteverschillen in vloeren'],
  ['hoogte', 'Verschil in vloerhoogte', 'Hoogteverschillen tussen ruimtes of tussen een hoofdgebouw en een aanbouw komen vaker voor, bijvoorbeeld omdat een aanbouw een eigen fundering heeft.', '/kennisbank/scheuren-bij-aanbouw/', 'Aanbouw en hoofdgebouw'],
  ['scheef', 'Scheve gevel', 'Een gevel die uit het lood staat, kan een gevolg zijn van ongelijke zetting, maar ook van hoe er ooit is gebouwd.', '/scheefstand-woning/', 'Scheefstand van een woning'],
  ['groei', 'Scheuren worden groter', 'Groeiende scheuren laten zien dat er iets verandert. Leg ze vast met foto, datum en liniaal; dat helpt bij een beoordeling.', '/kennisbank/monitoring-scheuren/', 'Scheuren monitoren'],
  ['water', 'Waterproblemen of kelderproblematiek', 'Water in kruipruimte of kelder kan veel oorzaken hebben. De grondwaterstand is wel een factor die bij funderingen, zeker bij houten palen, een rol kan spelen.', '/kennisbank/grondwater-en-fundering/', 'Grondwater en fundering'],
];

function vertelwatjezietWidget() {
  const items = SIGNALEN.map(([k, l]) => `<label class="tq-opt tq-opt-check"><input type="checkbox" name="signaal" value="${k}" data-label="${esc(l)}"><span>${l}</span></label>`).join('');
  const expl = SIGNALEN.map(([k, l, t, href, a]) => `<li data-signal-info="${k}"><strong>${l}</strong> – ${t} <a href="${href}">${a}</a></li>`).join('');
  return `
<div class="tool tool-signals" data-tool="vertelwatjeziet" id="vertel-wat-je-ziet">
  <div class="sim-head">
    <span class="sim-badge">Stap 1 · Welke signalen herken je?</span>
    <h3>Vink aan wat je ziet</h3>
  </div>
  <fieldset class="tq-opts tq-opts-grid" data-signals>
    <legend class="sr-only">Welke signalen herken je aan je woning?</legend>
    ${items}
    <label class="tq-opt tq-opt-check tq-opt-none"><input type="checkbox" name="signaal" value="geen" data-label="Geen van bovenstaande"><span>Geen van bovenstaande</span></label>
  </fieldset>
  <div class="tool-result tool-result-inline" data-signal-result aria-live="polite">
    <p class="tr-count"><strong data-signal-count>0</strong> mogelijke signalen geselecteerd.</p>
    <p>Afzonderlijke signalen bewijzen geen funderingsprobleem. Verschijnselen kunnen verschillende oorzaken hebben; de betekenis hangt af van de woning en de situatie. Pas het patroon en de samenhang zeggen iets, en daarvoor is onderzoek ter plaatse nodig.</p>
    <ul class="tr-signal-info">${expl}</ul>
  </div>

  <form class="tool-lead tool-photo" data-tool-lead="vertelwatjeziet" id="lf-vertelwatjeziet" novalidate>
    <span class="sim-badge">Stap 2 · Vertel ons wat je ziet</span>
    <h3>Wat valt je op aan je woning?</h3>
    <p>Beschrijf wat je ziet en voeg eventueel foto's toe. We bekijken je bericht en laten weten welke vervolgstap zinvol kan zijn. <strong>Een foto alleen is onvoldoende om de oorzaak van een scheur vast te stellen.</strong></p>
    <div class="tf-grid">
      <div class="tf tf-full"><label for="vw-wat">Wat zie je, en sinds wanneer? <span aria-hidden="true">*</span></label><textarea id="vw-wat" name="bericht" rows="4" required placeholder="Bijvoorbeeld: diagonale scheur boven de achterdeur, sinds de zomer, lijkt breder te worden."></textarea></div>
      <div class="tf"><label for="vw-bouwjaar">Bouwjaar <span class="field-opt">(optioneel)</span></label><input id="vw-bouwjaar" name="bouwjaar" inputmode="numeric"></div>
      <div class="tf"><label for="vw-plaats">Plaats <span class="field-opt">(optioneel)</span></label><input id="vw-plaats" name="plaats" autocomplete="address-level2"></div>
      <div class="tf tf-full">
        <label for="vw-fotos">Foto's <span class="field-opt">(optioneel, maximaal 3 – JPG, PNG of WebP)</span></label>
        <input id="vw-fotos" type="file" accept="image/jpeg,image/png,image/webp" multiple data-photo-input aria-describedby="vw-foto-tip">
        <p class="field-tip" id="vw-foto-tip">Tip: fotografeer de scheur recht van voren met een liniaal of meetlint ernaast, en maak ook een foto van een afstand zodat de plek in de gevel zichtbaar is.</p>
        <ul class="photo-previews" data-photo-previews aria-live="polite"></ul>
      </div>
      <div class="tf"><label for="vw-naam">Naam <span aria-hidden="true">*</span></label><input id="vw-naam" name="naam" autocomplete="name" required></div>
      <div class="tf"><label for="vw-email">E-mail <span aria-hidden="true">*</span></label><input id="vw-email" name="email" type="email" autocomplete="email" required></div>
      <div class="tf"><label for="vw-tel">Telefoon <span class="field-opt">(optioneel)</span></label><input id="vw-tel" name="telefoon" type="tel" autocomplete="tel"></div>
    </div>
    <div class="hp-field" aria-hidden="true"><label for="vw-website">Website</label><input id="vw-website" name="website" tabindex="-1" autocomplete="off"></div>
    <label class="check-line"><input type="checkbox" name="privacy" required> <span>Ik geef toestemming om mijn gegevens en foto's te gebruiken voor het beantwoorden van mijn vraag. <span aria-hidden="true">*</span></span></label>
    ${PRIVACY}
    <p class="form-status" role="status" aria-live="polite" hidden></p>
    <button type="submit" class="btn btn-gold">Vraag een beoordeling aan <span aria-hidden="true">→</span></button>
    <div class="tool-lead-success" hidden tabindex="-1"><strong>Bedankt, je bericht en foto's zijn verstuurd.</strong><p>We bekijken wat je hebt gestuurd en nemen contact met je op. Liever direct contact? Bel <a href="tel:+31582037172">+31 (0) 582037172</a>.</p></div>
  </form>
</div>`;
}

// ---------------------------------------------------------------- 3. welke situatie past bij jou (gebruikt het bestaande keuze-gedrag)
const SITUATIES = [
  ['kopen', 'Ik wil een woning kopen', 'Bij een oudere woning is het verstandig om het funderingsrisico vóór je definitieve beslissing in beeld te hebben. Sinds 1 april 2026 staat de KCAF-risicoklasse in het taxatierapport; bij klasse D of E moet volgens het NRVT in principe eerst aanvullend (beperkt) funderingsonderzoek plaatsvinden.',
    [['/huis-kopen-funderingscheck/', 'Doe de aankoop-check'], ['/funderingsonderzoek-bij-aankoop/', 'Funderingsonderzoek bij aankoop']]],
  ['eigenaar', 'Ik heb zelf een woning', 'Zie je scheuren, klemmende deuren of een scheve vloer, dan helpt het om eerst te kijken welke signalen je herkent en of ze veranderen. Afzonderlijke signalen bewijzen geen funderingsprobleem.',
    [['/vertel-wat-je-ziet/', 'Vertel ons wat je ziet'], ['/gratis-funderingscheck/', 'Doe de gratis Funderingscheck']]],
  ['verkopen', 'Ik verkoop mijn woning', 'Als verkoper moet je bekende gebreken melden. Kopers en taxateurs kijken steeds vaker naar de fundering; onderzoek vooraf kan vragen in de onderhandeling voorkomen.',
    [['/funderingsonderzoek-bij-verkoop/', 'Funderingsonderzoek bij verkoop'], ['/kennisbank/funderingsrapport-voor-verkoper/', 'Een funderingsrapport als verkoper']]],
  ['professional', 'Ik ben makelaar of taxateur', 'Bij een woning met risicoklasse D of E is in principe eerst aanvullend (beperkt) funderingsonderzoek nodig voordat de taxatie wordt afgerond (NRVT). Laat ons weten welk onderzoek er gevraagd wordt; dan hoor je vooraf of en tegen welke prijs wij dat kunnen uitvoeren.',
    [['/funderingsonderzoek-taxatie/', 'Funderingsonderzoek en taxatie'], ['/contact/', 'Neem contact op']]],
];

function situatiekeuzeWidget() {
  const buttons = SITUATIES.map(([k, l]) => `<button type="button" class="sim-choice" data-keuze="${k}" aria-pressed="false" aria-controls="sit-${k}">${l}</button>`).join('\n      ');
  const panels = SITUATIES.map(([k, l, t, links]) => `
    <div class="sim-choice-result" id="sit-${k}" data-keuze-panel="${k}">
      <span class="sim-badge">Jouw situatie</span>
      <h4>${l}</h4>
      <p>${t}</p>
      <div class="sim-choice-actions">
        <a class="btn btn-gold" href="${links[0][0]}">${links[0][1]} <span aria-hidden="true">→</span></a>
        <a class="btn btn-ghost-dark" href="${links[1][0]}">${links[1][1]}</a>
      </div>
    </div>`).join('');
  return `
<div class="sim sim-keuze" data-sim="keuze">
  <div class="sim-head">
    <span class="sim-badge">Keuzehulp</span>
    <h3>Welke situatie past bij jou?</h3>
  </div>
  <div class="sim-choices" role="group" aria-label="Welke situatie past bij jou?">
      ${buttons}
  </div>${panels}
</div>`;
}

// ---------------------------------------------------------------- 4. kostenwijzer (alleen bestaande prijzen)
const KOSTEN = [
  ['eerste', 'Een eerste beoordeling', 'Quick Scan (fase 0)', 'Indicatie: vanaf €350. De exacte prijs hoor je vooraf.', 'Archief- en bodemonderzoek, een visuele inspectie (kruipruimte voor zover toegankelijk) en een risico-inschatting met advies.', '/fase-0-funderingsonderzoek/'],
  ['aankoop', 'Funderingsrisico bij aankoop', 'Quick Scan bij aankoop (fase 0)', 'Indicatie: vanaf €350. De exacte prijs hoor je vooraf.', 'Dezelfde Quick Scan, ingepland rond je voorbehoud of bedenktijd.', '/fase-0-funderingsonderzoek-aankoop/'],
  ['scheuren', 'Scheuren of verzakking', 'Meestal eerst de Quick Scan; zo nodig fase 1', 'Indicatie: Quick Scan vanaf €350. Geeft die aanleiding tot metingen, dan kost fase 1 vanaf €950.', 'Fase 1 brengt met metingen de huidige scheefstand en hoogteverschillen in beeld.', '/fase-1-funderingsonderzoek/'],
  ['taxatie', 'Een vraag van de taxateur', 'Afhankelijk van wat er gevraagd wordt', 'Voor jouw situatie is vooraf een prijsinschatting nodig.', 'Welk onderzoek de taxateur nodig heeft, stem je af met de taxateur. Laat ons weten wat er gevraagd wordt; dan hoor je vooraf of en tegen welke prijs wij dat kunnen uitvoeren.', '/funderingsonderzoek-taxatie/'],
  ['uitgebreid', 'Uitgebreider onderzoek met metingen', 'Fase 1 funderingsonderzoek', 'Vanaf €950.', 'Fase 1 bouwt in de regel voort op een Quick Scan. Graafwerk voor een inspectieput valt buiten fase 0 en fase 1 en dus buiten deze prijzen.', '/fase-1-funderingsonderzoek/'],
  ['onbekend', 'Ik weet het niet', 'Laat je adviseren', 'Voor jouw situatie is vooraf een prijsinschatting nodig.', 'Beschrijf je situatie, dan laten we weten welke stap zinvol kan zijn en wat die kost. Je kunt ook eerst de stappenhulp doorlopen.', '/welke-stap-past-bij-mij/'],
];

function kostenwijzerWidget() {
  const buttons = KOSTEN.map(([k, l]) => `<button type="button" class="sim-choice" data-keuze="${k}" aria-pressed="false" aria-controls="kw-${k}">${l}</button>`).join('\n      ');
  const panels = KOSTEN.map(([k, l, dienst, prijs, wat, href]) => `
    <div class="sim-choice-result" id="kw-${k}" data-keuze-panel="${k}">
      <span class="sim-badge">Passende dienst</span>
      <h4>${dienst}</h4>
      <p class="kw-price"><strong>${prijs}</strong></p>
      <p>${wat}</p>
      <p class="kw-note">Prijzen zijn indicatief; de definitieve prijs hoor je vooraf.</p>
      <div class="sim-choice-actions">
        <button type="button" class="btn btn-gold" data-lead-open="kostenwijzer" data-lead-context="${esc(l)}">Ik wil een exacte prijs ontvangen <span aria-hidden="true">→</span></button>
        <a class="btn btn-ghost-dark" href="${href}">Meer over deze stap</a>
      </div>
    </div>`).join('');
  return `
<div class="tool" data-tool="kostenwijzer">
  <div class="sim sim-keuze" data-sim="keuze">
    <div class="sim-head">
      <span class="sim-badge">Kostenwijzer</span>
      <h3>Wat wil je laten onderzoeken?</h3>
    </div>
    <div class="sim-choices" role="group" aria-label="Wat wil je laten onderzoeken?">
      ${buttons}
    </div>${panels}
  </div>
  ${leadForm('kostenwijzer', { title: 'Ik wil een exacte prijs ontvangen', intro: 'Vertel kort om welke woning het gaat. We laten je vooraf weten wat het onderzoek kost.', button: 'Vraag prijs aan', copy: false })}
</div>`;
}

// ---------------------------------------------------------------- 5. vergelijking diensten (statisch, crawlbaar)
function dienstvergelijkingWidget() {
  const rows = [
    ['Kosten', 'Gratis', 'Vanaf €350', 'Vanaf €950'],
    ['Online vragen over je woning', '✓', '–', '–'],
    ['Archief- en bodemonderzoek', '–', '✓', 'Bouwt voort op fase 0'],
    ['Visuele inspectie ter plaatse', '–', '✓', '✓ gericht op de metingen'],
    ['Kruipruimte, voor zover toegankelijk', '–', '✓', 'Waar nodig'],
    ['Metingen (lintvoeg, lood, vloerveld)', '–', '–', '✓'],
    ['Risico-inschatting en advies', 'Alleen een indicatie', '✓', '✓'],
    ['Rapport', '–', '✓ normaal gesproken binnen 2 werkdagen na de inspectie', '✓'],
    ['Graafwerk / inspectieput', '–', '– (aparte stap)', '– (aparte stap)'],
    ['Stelt een diagnose', 'Nee', 'Nee, een onderbouwde risico-inschatting', 'Brengt de huidige toestand in beeld; of een woning nog beweegt, blijkt pas uit herhaalde metingen'],
  ];
  return `
<div class="table-wrap tool-compare"><table class="data-table">
<caption class="sr-only">Vergelijking van de gratis check, de Quick Scan en fase 1</caption>
<thead><tr><th scope="col">Onderdeel</th><th scope="col"><a href="/gratis-funderingscheck/">Gratis Funderingscheck</a></th><th scope="col"><a href="/fase-0-funderingsonderzoek/">Quick Scan (fase 0)</a></th><th scope="col"><a href="/fase-1-funderingsonderzoek/">Fase 1</a></th></tr></thead>
<tbody>${rows.map(([a, b, c, d]) => `<tr><th scope="row">${a}</th><td>${b}</td><td>${c}</td><td>${d}</td></tr>`).join('')}</tbody>
</table></div>`;
}

// ---------------------------------------------------------------- 6. tijdlijn Quick Scan (de bestaande zeven stappen van /werkwijze/)
const QS_STAPPEN = [
  ['Aanvraag', 'Je vertelt over de woning en je vraag, en hoort vooraf de prijs.'],
  ['Informatie verzamelen', 'We vragen naar bouwjaar, tekeningen, signalen en eventueel eerder onderzoek. Foto\'s van scheuren met datum en liniaal helpen.'],
  ['Archief- en bodemonderzoek', 'We onderzoeken archiefgegevens, het vermoedelijke funderingstype, de bodem en het grondwater.'],
  ['Inspectie', 'Visuele inspectie ter plaatse, meestal binnen enkele werkdagen ingepland: gevels, scheuren, kozijnen, deuren, vloeren, scheefstand en de kruipruimte voor zover toegankelijk. Er wordt niets opengebroken of afgegraven.'],
  ['Analyse', 'We combineren alle gegevens tot een risico-inschatting. Het patroon en de samenhang van signalen tellen, niet één losse waarneming.'],
  ['Rapport', 'Normaal gesproken binnen 2 werkdagen na de inspectie: bevindingen, foto\'s, risico-inschatting, conclusie en een van vier adviezen.'],
  ['Eventueel vervolgonderzoek', 'Alleen als het advies daartoe aanleiding geeft, bijvoorbeeld fase 1 met metingen.'],
];

function quickscantijdlijnWidget() {
  return `
<ol class="tool-timeline">
${QS_STAPPEN.map(([t, d], i) => `  <li><details${i === 0 ? ' open' : ''}><summary><span class="tl-num">${i + 1}</span>${t}</summary><p>${d}</p></details></li>`).join('\n')}
</ol>
<p class="tool-small">Stap 1 tot en met 6 vormen samen de Quick Scan (fase 0). Uitgebreid beschreven op de pagina <a href="/werkwijze/">werkwijze</a>.</p>`;
}

// ---------------------------------------------------------------- 7. bouwjaar & fundering
function bouwjaarfunderingWidget() {
  return `
<div class="tool tool-bouwjaar" data-tool="bouwjaarfundering">
  <div class="sim-head">
    <span class="sim-badge">Bouwjaar-tijdlijn</span>
    <h3>Welke funderingswijzen kunnen bij jouw bouwjaar voorkomen?</h3>
  </div>
  <form class="bj-form" data-bj-form novalidate>
    <div class="tf"><label for="bj-jaar">Bouwjaar</label><input id="bj-jaar" name="jaar" type="number" min="1500" max="2026" inputmode="numeric" placeholder="bijv. 1928"></div>
    <fieldset class="tf"><legend>Is er documentatie over de fundering (bouwtekening, archief, eerder onderzoek)?</legend>
      <div class="tq-opts tq-opts-row">${opt('doc', 'ja', 'Ja')}${opt('doc', 'nee', 'Nee')}${opt('doc', 'onbekend', 'Weet ik niet')}</div>
    </fieldset>
    <button type="submit" class="btn btn-gold">Toon op de tijdlijn</button>
    <p class="tq-error" role="alert" hidden>Vul een bouwjaar in tussen 1500 en 2026, of lees hieronder de uitleg per periode.</p>
  </form>
  <div class="bj-line" aria-hidden="true">
    <div class="bj-seg bj-seg-a"><span>Houten palen of op staal (tot ca. 1970)</span></div>
    <div class="bj-seg bj-seg-b"><span>Ook houten palen met betonnen oplanger (ca. 1930–1970)</span></div>
    <div class="bj-seg bj-seg-c"><span>Bij paalfunderingen vooral betonnen palen (vanaf ca. 1970)</span></div>
    <span class="bj-marker" data-bj-marker hidden></span>
    <div class="bj-axis"><span>eerder</span><span>1930</span><span>1970</span><span>2026</span></div>
  </div>
  <div class="tool-result" data-bj-result aria-live="polite" tabindex="-1" hidden>
    <div class="bj-period" data-period="oud" hidden><h4>Vóór circa 1930</h4><p>In deze periode werden woningen onder meer op houten palen of op staal (zonder palen) gefundeerd. Welke funderingswijze is toegepast, hangt onder meer af van de ondergrond en verschilt per woning.</p></div>
    <div class="bj-period" data-period="mid" hidden><h4>Circa 1930 tot 1970</h4><p>Ook in deze periode komen houten palen en funderingen op staal voor. Daarnaast werden houten palen met een betonnen oplanger toegepast. Welke funderingswijze onder jouw woning zit, verschilt per woning.</p></div>
    <div class="bj-period" data-period="nieuw" hidden><h4>Vanaf circa 1970</h4><p>Bij paalfunderingen werden vanaf ongeveer 1970 in veruit de meeste gevallen betonnen palen gebruikt. Afhankelijk van de ondergrond komen ook funderingen op staal voor. De overgang verliep geleidelijk; ook rond 1970 kan een woning nog houten palen hebben.</p></div>
    <p class="bj-doc" data-doc="ja" hidden>Je hebt documentatie: die geeft een betere aanwijzing dan het bouwjaar. Laat de gegevens bij een onderzoek meenemen.</p>
    <p class="bj-doc" data-doc="anders" hidden>Zonder documentatie kan archiefonderzoek helpen. In de Quick Scan zoeken we uit wat er over de woning bekend is.</p>
    ${meaning('<p>Het bouwjaar geeft een aanwijzing welke funderingswijzen in die periode gebruikelijk waren.</p>', '<p>Het bouwjaar alleen is onvoldoende om vast te stellen welke fundering er onder jouw woning zit, en zegt niets over de staat ervan.</p>', '<p>Wil je weten welke fundering er werkelijk onder je woning aanwezig is? Archiefonderzoek is een eerste stap; het is onderdeel van de <a href="/fase-0-funderingsonderzoek/">Quick Scan</a>.</p>')}
  </div>
  <p class="tool-small">Vereenvoudigde weergave; overgangen verliepen geleidelijk. Bron: brochure van RVO en KCAF voor woningeigenaren (zie <a href="/bronnen-en-richtlijnen/">bronnen</a>).</p>
</div>`;
}

// ---------------------------------------------------------------- 8. risicoklassen A–E (letterlijk KCAF)
const KLASSEN = [
  ['A', 'Geen risico', '<p>Op basis van de beschikbare gegevens geeft het model geen funderingsrisico aan.</p>', '<p>Het is een modelmatige inschatting, geen garantie en geen vaststelling van de staat van de fundering.</p>', '<p>NHG heeft aangekondigd dat vanaf 2027 bij klasse A, B of C geen rekening hoeft te worden gehouden met funderingsrisico. Zie je zelf signalen, dan kan een beoordeling toch zinvol zijn.</p>'],
  ['B', 'Licht risico', '<p>Het model ziet een licht verhoogd risico op basis van gegevens zoals funderingstype, bodem en grondwater.</p>', '<p>Het betekent niet dat er een probleem is. Het is een inschatting op basis van gegevens, soms afgeleid van buurpanden of het bouwjaar.</p>', '<p>Aanvullend onderzoek is in de regel vrijwillig. Het kan zinvol zijn als je signalen ziet of een oudere woning koopt.</p>'],
  ['C', 'Verhoogd risico of onzekerheid', '<p>Er is een verhoogd risico, of er is onvoldoende informatie om het risico goed in te schatten.</p>', '<p>Het betekent niet dat er funderingsschade is. Onzekerheid kan ook komen door ontbrekende gegevens.</p>', '<p>Onderzoek is in de regel vrijwillig, maar een <a href="/quickscan-fundering/">Quick Scan</a> kan helpen om de onzekerheid voor jouw woning te verkleinen.</p>'],
  ['D', 'Hoog risico → nader onderzoek passend', '<p>Het model ziet een hoog risico. KCAF geeft aan dat nader onderzoek passend is.</p>', '<p>Het betekent niet automatisch dat de fundering slecht is; het blijft een inschatting op basis van gegevens.</p>', '<p>Bij een taxatie moet volgens het NRVT in principe eerst een aanvullend (beperkt) funderingsonderzoek plaatsvinden voordat het taxatierapport wordt afgerond (met uitzonderingen). NHG heeft aangekondigd dat vanaf 1 januari 2027 bij D of E een verkennend funderingsonderzoek verplicht is voor een lening met NHG. Stem af met je taxateur.</p>'],
  ['E', 'Vastgesteld funderingsprobleem', '<p>Volgens de KCAF-omschrijving is er bij deze woning een funderingsprobleem vastgesteld. Het funderingsrisicorapport gebruikt daarvoor beschikbare gegevens, waaronder eerder funderingsonderzoek als dat bekend is.</p>', '<p>De klasse zegt niet hoe ernstig het probleem is, welke maatregel nodig is of wat die kost.</p>', '<p>Ook bij E geldt bij een taxatie in principe eerst aanvullend (beperkt) funderingsonderzoek (NRVT), en de NHG-aankondiging voor 2027. Vraag naar bestaande onderzoeksrapporten en laat die beoordelen.</p>'],
];

function risicoklassenWidget() {
  const buttons = KLASSEN.map(([k, l]) => `<button type="button" class="sim-choice rk-btn rk-${k.toLowerCase()}" data-keuze="${k}" aria-pressed="false" aria-controls="rk-${k}"><strong>${k}</strong><span>${l}</span></button>`).join('\n      ');
  const panels = KLASSEN.map(([k, l, wel, niet, doen]) => `
    <div class="sim-choice-result" id="rk-${k}" data-keuze-panel="${k}">
      <span class="sim-badge">Klasse ${k} · officiële KCAF-omschrijving</span>
      <h4>“${l}”</h4>
      ${meaning(wel, niet, doen)}
      <p class="tool-small">Bron: KCAF, funderingsrisico en onderzoeken; NRVT, nieuw model taxatierapport per 1 april 2026; NHG, voorwaarden en normen 2027 (aankondiging). Zie <a href="/bronnen-en-richtlijnen/">bronnen en richtlijnen</a>.</p>
    </div>`).join('');
  return `
<div class="sim sim-keuze tool-klassen" data-sim="keuze">
  <div class="sim-head">
    <span class="sim-badge">Klik op een klasse</span>
    <h3>KCAF-risicoklassen A tot en met E</h3>
  </div>
  <div class="sim-choices rk-row" role="group" aria-label="Kies een risicoklasse">
      ${buttons}
  </div>${panels}
</div>`;
}

// ---------------------------------------------------------------- 9. stappenhulp / beslisboom
const WZ = {
  start: ['Wat wil je bereiken?', [['Ik wil een huis kopen', 'kopen'], ['Ik zie signalen in mijn woning', 'signalen'], ['Mijn taxateur of geldverstrekker vraagt om informatie', 'taxateur'], ['Ik verkoop mijn woning', 'r-verkoop'], ['Ik wil weten of mijn woning risico loopt', 'r-risico']]],
  kopen: ['Is er een KCAF-risicoklasse bekend, bijvoorbeeld uit de taxatie?', [['Ja, klasse D of E', 'r-kopen-de'], ['Ja, klasse A, B of C', 'kopen-sig'], ['Nog niet bekend', 'kopen-sig']]],
  'kopen-sig': ['Is de woning van vóór circa 1970, of zag je signalen bij de bezichtiging?', [['Ja', 'r-kopen-scan'], ['Nee', 'r-kopen-laag'], ['Weet ik niet', 'r-kopen-scan']]],
  signalen: ['Worden de signalen groter, of zijn ze recent ontstaan?', [['Ja', 'r-sig-ja'], ['Nee, ze lijken stabiel', 'r-sig-stabiel'], ['Weet ik niet', 'r-sig-onbekend']]],
  taxateur: ['Wat vraagt de taxateur?', [['Aanvullend onderzoek omdat de woning klasse D of E heeft', 'r-tax-de'], ['Iets anders / weet ik niet precies', 'r-tax-anders']]],
};
const WZ_RESULT = {
  'r-kopen-de': ['Aanvullend onderzoek kan in deze situatie relevant zijn', 'Bij klasse D of E moet volgens het NRVT in principe eerst een aanvullend (beperkt) funderingsonderzoek plaatsvinden voordat de taxatie wordt afgerond (met uitzonderingen). Stem met je taxateur af welk onderzoek nodig is en plan het vroeg, zeker als er een voorbehoud loopt.', [['/funderingsonderzoek-taxatie/', 'Funderingsonderzoek en taxatie'], ['/fase-0-funderingsonderzoek-aankoop/', 'Quick Scan bij aankoop']]],
  'r-kopen-scan': ['Een Quick Scan bij aankoop kan zinvol zijn', 'Bij een oudere woning of zichtbare signalen helpt een Quick Scan om het funderingsrisico vóór je beslissing beter in beeld te krijgen. Plan hem bij voorkeur binnen je voorbehoud.', [['/fase-0-funderingsonderzoek-aankoop/', 'Quick Scan bij aankoop'], ['/huis-kopen-funderingscheck/', 'Doe de aankoop-check']]],
  'r-kopen-laag': ['Er lijkt geen directe aanleiding, maar let op', 'Bij een woning van na circa 1970 zonder signalen is er vaak minder aanleiding voor funderingsonderzoek. Een bouwkundige keuring kijkt breder naar de woning. Twijfel je toch, dan kun je je vraag aan ons voorleggen.', [['/kennisbank/heb-ik-een-funderingsscan-nodig/', 'Heb ik een funderingsscan nodig?'], ['/contact/', 'Stel je vraag']]],
  'r-sig-ja': ['Laat de situatie beoordelen', 'Signalen die groter worden of recent zijn ontstaan, zijn een reden om de woning te laten bekijken. Een Quick Scan brengt in beeld of er aanwijzingen zijn dat de fundering een rol speelt.', [['/vertel-wat-je-ziet/', 'Vertel ons wat je ziet'], ['/funderingsscan-aanvragen/', 'Plan een Quick Scan']]],
  'r-sig-stabiel': ['Leg vast en houd in de gaten', 'Signalen die gelijk blijven, zijn vaak minder zorgelijk, maar een oordeel is zonder onderzoek niet te geven. Leg scheuren vast met foto, datum en liniaal en herhaal dat na enkele maanden. Bij twijfel kun je een Quick Scan laten doen.', [['/kennisbank/monitoring-scheuren/', 'Scheuren monitoren'], ['/vertel-wat-je-ziet/', 'Vertel ons wat je ziet']]],
  'r-sig-onbekend': ['Begin met vastleggen', 'Weet je niet of signalen veranderen, leg ze dan nu vast met foto, datum en liniaal. Dan kun je later vergelijken. Wil je niet wachten, dan kun je je situatie aan ons voorleggen.', [['/kennisbank/monitoring-scheuren/', 'Scheuren monitoren'], ['/vertel-wat-je-ziet/', 'Vertel ons wat je ziet']]],
  'r-tax-de': ['Stem het gevraagde onderzoek af', 'Volgens het NRVT moet bij klasse D of E in principe eerst een aanvullend (beperkt) funderingsonderzoek plaatsvinden. Vraag je taxateur welk onderzoek nodig is. Laat ons weten wat er gevraagd wordt; dan hoor je vooraf of en tegen welke prijs wij dat kunnen uitvoeren.', [['/funderingsonderzoek-taxatie/', 'Funderingsonderzoek en taxatie'], ['/contact/', 'Neem contact op']]],
  'r-tax-anders': ['Vraag na wat er precies nodig is', 'Vraag je taxateur of geldverstrekker welke informatie over de fundering nodig is. Daarna kunnen we aangeven of een Quick Scan of ander onderzoek past.', [['/funderingsonderzoek-taxatie/', 'Funderingsonderzoek en taxatie'], ['/contact/', 'Neem contact op']]],
  'r-verkoop': ['Onderzoek vooraf kan helpen', 'Als verkoper moet je bekende gebreken melden. Een funderingsrapport vooraf kan vragen van kopers en taxateurs voor zijn en geeft je zelf inzicht in je woning.', [['/funderingsonderzoek-bij-verkoop/', 'Funderingsonderzoek bij verkoop'], ['/funderingsscan-aanvragen/', 'Plan een Quick Scan']]],
  'r-risico': ['Begin met een indicatie of een Quick Scan', 'De gratis Funderingscheck geeft een eerste indicatie op basis van je antwoorden. Een Quick Scan onderzoekt je woning zelf: archief, bodem en een inspectie ter plaatse.', [['/gratis-funderingscheck/', 'Doe de gratis Funderingscheck'], ['/fase-0-funderingsonderzoek/', 'Quick Scan (fase 0)']]],
};

function stapwizardWidget() {
  const nodes = Object.entries(WZ).map(([id, [q, answers]]) => `
    <div class="wz-node" data-node="${id}"${id === 'start' ? '' : ' data-hidden'}>
      <p class="wz-q">${q}</p>
      <div class="sim-choices">${answers.map(([l, next]) => `<button type="button" class="sim-choice" data-next="${next}">${l}</button>`).join('')}</div>
    </div>`).join('');
  const results = Object.entries(WZ_RESULT).map(([id, [t, p, links]]) => `
    <div class="wz-node wz-result" data-node="${id}" data-hidden>
      <span class="sim-badge">Mogelijke vervolgstap</span>
      <h4>${t}</h4>
      <p>${p}</p>
      <p class="tool-small">Dit is een informatieve route, geen technisch oordeel.</p>
      <div class="sim-choice-actions"><a class="btn btn-gold" href="${links[0][0]}">${links[0][1]} <span aria-hidden="true">→</span></a><a class="btn btn-ghost-dark" href="${links[1][0]}">${links[1][1]}</a></div>
    </div>`).join('');
  return `
<div class="sim tool-wizard" data-tool="stapwizard">
  <div class="sim-head">
    <span class="sim-badge">Stappenhulp</span>
    <h3>Welke stap past bij jouw situatie?</h3>
  </div>
  <p class="wz-path" data-wz-path aria-live="polite"></p>
  ${nodes}${results}
  <button type="button" class="btn btn-link" data-wz-back hidden>← Vorige vraag</button>
  <button type="button" class="btn btn-link" data-wz-reset hidden>Opnieuw beginnen</button>
</div>`;
}

// ---------------------------------------------------------------- 10. aankoop-check
const AANKOOP = [
  ['bouwjaar', 'Bouwjaar van de woning', [['oud', 'Vóór circa 1970'], ['nieuw', 'Circa 1970 of later'], ['onbekend', 'Weet ik niet']]],
  ['klasse', 'Risicoklasse uit het taxatierapport of KCAF', [['abc', 'A, B of C'], ['de', 'D of E'], ['onbekend', 'Nog niet bekend']]],
  ['signalen', 'Zag je bij de bezichtiging scheuren, scheefstand of klemmende deuren?', [['ja', 'Ja'], ['nee', 'Nee'], ['onbekend', 'Niet op gelet']]],
  ['info', 'Heeft de verkoper informatie over de fundering?', [['rapport', 'Ja, een onderzoeksrapport'], ['mondeling', 'Alleen mondeling'], ['nee', 'Nee / onbekend']]],
  ['verbouw', 'Heb je verbouwplannen, zoals een opbouw of aanbouw?', [['ja', 'Ja'], ['nee', 'Nee']]],
  ['voorbehoud', 'Heb je een voorbehoud of ontbindende voorwaarde?', [['ja', 'Ja'], ['nee', 'Nee'], ['onbekend', 'Weet ik nog niet']]],
];
const AANKOOP_PUNTEN = [
  ['klasse-de', 'Risicoklasse D of E', 'Volgens het NRVT moet bij D of E in principe eerst een aanvullend (beperkt) funderingsonderzoek plaatsvinden voordat de taxatie wordt afgerond. NHG heeft aangekondigd dat dit vanaf 1 januari 2027 een voorwaarde wordt voor een lening met NHG. Plan dit vroeg.'],
  ['klasse-onbekend', 'Risicoklasse nog onbekend', 'De taxateur neemt sinds 1 april 2026 de KCAF-risicoklasse op in het taxatierapport. Vraag ernaar zodra de taxatie loopt.'],
  ['oud', 'Woning van vóór circa 1970', 'Woningen uit deze periode staan vaker op houten palen of op staal. Dat is geen probleem op zich, maar het maakt het funderingsrisico relevanter om te kennen.'],
  ['signalen', 'Signalen gezien', 'Scheuren, scheefstand of klemmende deuren kunnen verschillende oorzaken hebben. Laat ze beoordelen voordat je je definitief vastlegt.'],
  ['rapport', 'Er is een onderzoeksrapport', 'Vraag het volledige rapport op en laat de conclusie en de datum meewegen. Een rapport is een momentopname.'],
  ['geen-info', 'Geen funderingsinformatie', 'Zonder informatie kan archief- en bodemonderzoek een eerste beeld geven.'],
  ['mondeling', 'Alleen mondelinge informatie', 'Vraag de verkoper of er iets op papier staat, zoals een onderzoeksrapport, facturen van herstel of correspondentie met de gemeente. Mondelinge informatie is lastig te controleren.'],
  ['bouwjaar-onbekend', 'Bouwjaar onbekend', 'Het bouwjaar staat meestal in de verkoopinformatie of het Kadaster. Het geeft een aanwijzing welke funderingswijzen in die periode gebruikelijk waren.'],
  ['signalen-onbekend', 'Niet op signalen gelet', 'Let bij een tweede bezichtiging op scheuren in gevels en muren, klemmende deuren en ramen, scheve vloeren en de kruipruimte, en maak foto’s.'],
  ['verbouw', 'Verbouwplannen', 'Bij een verbouwing kan de belasting op de fundering veranderen. Laat dat bij een constructeur of onderzoek meenemen.'],
  ['voorbehoud', 'Voorbehoud loopt', 'Plan onderzoek binnen de termijn van je voorbehoud. De Quick Scan-inspectie wordt meestal binnen enkele werkdagen ingepland; het rapport volgt normaal gesproken binnen 2 werkdagen daarna.'],
  ['geen-voorbehoud', 'Geen voorbehoud', 'Zonder voorbehoud is het lastiger om na onderzoek nog terug te komen op de koop. Overleg met je aankoopmakelaar.'],
];

function aankoopcheckWidget() {
  const qs = AANKOOP.map(([n, q, opts]) => `<fieldset class="ak-q"><legend>${q}</legend><div class="tq-opts tq-opts-row">${opts.map(([v, l]) => opt(n, v, l)).join('')}</div></fieldset>`).join('');
  const punten = AANKOOP_PUNTEN.map(([k, t, p]) => `<li data-point="${k}" hidden><strong>${t}</strong> – ${p}</li>`).join('');
  return `
<div class="tool tool-aankoop" data-tool="aankoopcheck">
  <div class="sim-head">
    <span class="sim-badge">Aankoop-check</span>
    <h3>Een huis kopen? Doe eerst deze funderingscheck</h3>
  </div>
  <form class="ak-form" data-ak-form novalidate>
    ${qs}
    <button type="submit" class="btn btn-gold">Toon wat voor mij relevant is</button>
    <p class="tq-error" role="alert" hidden>Beantwoord alle vragen; kies "weet ik niet" als je het niet weet.</p>
  </form>
  <div class="tool-result" data-ak-result tabindex="-1" aria-live="polite" hidden>
    <h3>Wat is voor jou relevant?</h3>
    <ul class="checklist">${punten}<li data-point="geen" hidden><strong>Geen specifieke aandachtspunten</strong> – op basis van je antwoorden springen er geen bijzondere punten uit. Dat zegt niets over de staat van de fundering; bij twijfel kun je een onderzoek laten doen.</li></ul>
    <p>Funderingsrisico kan bij aankoop gevolgen hebben voor onder andere onderzoek, mogelijke herstelmaatregelen, financiering, verkoopbaarheid en je onderhandelingspositie.</p>
    ${meaning('<p>Je ziet welke onderwerpen in jouw situatie aandacht verdienen voordat je je definitief vastlegt.</p>', '<p>Het zegt niets over de staat van de fundering van deze woning. Dat blijkt alleen uit onderzoek.</p>', '<p>Een <a href="/fase-0-funderingsonderzoek-aankoop/">Quick Scan bij aankoop</a> brengt het funderingsrisico van deze woning in beeld. Overleg ook met je aankoopmakelaar en taxateur.</p>')}
    <div class="tr-actions">
      <button type="button" class="btn btn-gold" data-lead-open="aankoopcheck">Bespreek mijn situatie <span aria-hidden="true">→</span></button>
      <a class="btn btn-ghost-dark" href="/funderingsscan-aanvragen/" data-track="cta_quickscan">Plan een Quick Scan</a>
    </div>
    <p class="tr-disclaimer">${DISCLAIMER}</p>
    ${leadForm('aankoopcheck', { intro: 'Laat je gegevens achter. We sturen je antwoorden automatisch mee en nemen contact met je op, ook over de planning rond je voorbehoud.' })}
  </div>
</div>`;
}

// ---------------------------------------------------------------- 11. scenario's (gebruikt de bestaande tabs)
function scenarioWidget() {
  const sc = [
    ['Scenario A · Geen duidelijke signalen', 'Uit onderzoek komen geen duidelijke signalen naar voren.', ['Er zijn bij de inspectie en in de gegevens geen aanwijzingen gevonden voor een funderingsprobleem.'], ['Hoe de fundering zich in de toekomst gedraagt; een onderzoek is een momentopname.', 'Wat er onder de grond niet zichtbaar was.'], 'Geen directe aanleiding voor vervolgonderzoek. Bewaar het rapport en let op veranderingen.'],
    ['Scenario B · Nader onderzoek gewenst', 'Er zijn signalen die meer duidelijkheid vragen.', ['Welke signalen er zijn en waar ze zitten.', 'Dat de samenhang van signalen aanleiding geeft om verder te kijken.'], ['Of de fundering de oorzaak is.', 'Of de woning nog beweegt; dat blijkt pas uit herhaalde metingen.'], 'Monitoren, gericht aanvullend onderzoek of fase 1 met metingen, afhankelijk van het advies.'],
    ['Scenario C · Funderingsprobleem vastgesteld', 'Onderzoek heeft een funderingsprobleem vastgesteld.', ['Dat er een probleem is, en welke aanwijzingen daarvoor zijn gevonden.'], ['Welke herstelmethode passend is en wat die kost; dat werkt een gespecialiseerde partij uit.', 'Welke regelingen in jouw situatie mogelijk zijn.'], 'Een herstelplan en offerte laten maken door een gespecialiseerde partij, en informeren naar regelingen zoals het Fonds Duurzaam Funderingsherstel en, in het Friese veenweidegebied, het Funderingsloket Fryslân.'],
  ];
  return `
<div class="tabs tool-scenario">
${sc.map(([t, intro, weet, niet, stap]) => `  <section class="tab-panel" data-tab="${t.split(' · ')[0]}">
    <h3>${t}</h3>
    <p>${intro}</p>
    <div class="tr-meaning">
      <div><h4>Wat weet je?</h4><ul class="checklist">${weet.map((x) => `<li>${x}</li>`).join('')}</ul></div>
      <div><h4>Wat weet je nog niet?</h4><ul class="checklist">${niet.map((x) => `<li>${x}</li>`).join('')}</ul></div>
      <div><h4>Welke vervolgstap kan logisch zijn?</h4><p>${stap}</p></div>
    </div>
  </section>`).join('\n')}
</div>
<p class="tool-small">Educatieve voorbeelden; geen uitkomsten van een echte woning.</p>`;
}

// ---------------------------------------------------------------- 12. meetwaarden
function meetwaardenWidget() {
  return `
<div class="tool tool-meet" data-tool="meetwaarden">
  <div class="sim-head">
    <span class="sim-badge">Rekenhulp</span>
    <h3>Wat betekent mijn meetgegeven?</h3>
    <p class="sim-instruction">Vul een afwijking en de lengte of hoogte waarover die is gemeten in. Je ziet dezelfde waarde in andere eenheden.</p>
  </div>
  <form class="mw-form" data-mw-form novalidate>
    <div class="tf"><label for="mw-mm">Afwijking in millimeters</label><input id="mw-mm" name="mm" type="number" step="0.1" min="0" value="12" inputmode="decimal"></div>
    <div class="tf"><label for="mw-m">Over een lengte of hoogte van (meter)</label><input id="mw-m" name="m" type="number" step="0.01" min="0.01" value="1" inputmode="decimal"></div>
    <p class="tq-error" role="alert" hidden>Vul een afwijking van 0 of meer en een lengte groter dan 0 in.</p>
  </form>
  <dl class="mw-out" aria-live="polite">
    <div><dt>Per meter</dt><dd data-mw="mmm">12 mm/m</dd></div>
    <div><dt>Als verhouding</dt><dd data-mw="ratio">1 : 83</dd></div>
    <div><dt>Als percentage</dt><dd data-mw="pct">1,2%</dd></div>
    <div><dt>Als hoek</dt><dd data-mw="deg">0,69°</dd></div>
  </dl>
  ${meaning('<p>Een scheefstand van bijvoorbeeld 12 mm/m betekent dat een gevel, wand of vloer over elke meter 12 millimeter afwijkt van de loodlijn of het waterpas. Dat is hetzelfde als een verhouding van ongeveer 1 : 83.</p>', '<p>Er is geen universele grens waarboven een waarde “slecht” is. Een meting zegt niets over de oorzaak: oude woningen zijn niet altijd recht gebouwd, en de afwijking kan al decennia oud en stabiel zijn.</p>', '<p>Onderzoekers beoordelen meetwaarden in samenhang: met andere metingen, scheurpatronen, bouwjaar, funderingstype en bodem, en met herhaalde metingen als je wilt weten of iets nog verandert. Lees meer over <a href="/funderingsmetingen/">funderingsmetingen</a>.</p>')}
</div>`;
}

// ---------------------------------------------------------------- 13. quiz
const QUIZ = [
  ['Wat is droogstand?', [['De grondwaterstand ligt onder de bovenkant van houten funderingspalen', 1], ['De kelder of kruipruimte is helemaal droog', 0], ['Er staat te weinig water in de gracht', 0]], 'Droogstand is volgens de KCAF-richtlijn de situatie waarbij de grondwaterstand beneden de bovenkant van de houten paalfundering ligt. Dan kan schimmelaantasting (paalrot) ontstaan.'],
  ['Welke aantasting kan houten palen ook onder water treffen?', [['Schimmelaantasting', 0], ['Bacteriële aantasting', 1], ['Geen enkele: onder water is hout altijd veilig', 0]], 'Bacteriële aantasting ontstaat onder water en kan de paal over de hele lengte aantasten. Grenen is daar gevoeliger voor dan vuren.'],
  ['Tot ongeveer welk jaar werden houten funderingspalen in de woningbouw gebruikt?', [['Tot ongeveer 1900', 0], ['Tot ongeveer 1970', 1], ['Tot ongeveer 2000', 0]], 'Volgens de brochure van RVO en KCAF werden houten funderingspalen in de woningbouw gebruikt tot ongeveer 1970.'],
  ['Wat is een fundering op staal?', [['Een fundering met stalen palen', 0], ['Een fundering zonder palen, die direct op de ondergrond rust', 1], ['Een stalen frame onder de begane grondvloer', 0]], 'Een fundering op staal is een fundering zonder palen, ook wel ondiepe fundering genoemd. Het woord “staal” verwijst niet naar het materiaal.'],
  ['Betekent een scheur in de gevel automatisch funderingsschade?', [['Ja', 0], ['Nee', 1]], 'Nee. Scheuren kunnen onder meer ontstaan door krimp, temperatuurwerking, roestende lateien of ankers. Pas het patroon en de samenhang met andere signalen zeggen iets.'],
  ['Wat is zetting?', [['Het samendrukken van de grond onder het gewicht van een gebouw, waardoor het iets zakt', 1], ['Het opnieuw zetten van een gevel', 0], ['Een ander woord voor paalrot', 0]], 'Zetting is het samendrukken van de grond onder belasting. Gelijkmatige zetting na de bouw is normaal; ongelijke zetting kan tot scheuren en scheefstand leiden.'],
  ['Wat is negatieve kleef?', [['Extra belasting op een paal doordat de grond langs de paal omlaag zakt', 1], ['Een paal die loslaat van de vloer', 0], ['Lijm die niet hecht aan beton', 0]], 'Negatieve kleef is volgens de KCAF-richtlijn de extra belasting op een funderingspaal door wrijving van langs de paalschacht zakkende grond.'],
  ['Wat betekent KCAF-risicoklasse D?', [['Hoog risico, nader onderzoek passend', 1], ['Vastgesteld funderingsprobleem', 0], ['Geen risico', 0]], 'KCAF omschrijft klasse D als “hoog risico → nader onderzoek passend”. Klasse E is “vastgesteld funderingsprobleem”.'],
  ['Is funderingsonderzoek wettelijk verplicht bij de koop van een woning?', [['Ja, altijd', 0], ['Nee, er is geen algemene wettelijke plicht', 1]], 'Er is geen algemene wettelijke plicht. Wel heeft de verkoper een mededelingsplicht en de koper een onderzoeksplicht, en kan de taxatie bij klasse D of E in principe aanvullend onderzoek vragen.'],
  ['Kan één meting laten zien of een woning nog zakt?', [['Ja', 0], ['Nee, daarvoor zijn herhaalde metingen nodig', 1]], 'Eén meting is een momentopname. Of een woning nog beweegt, blijkt pas als je dezelfde punten na verloop van tijd opnieuw meet.'],
];

function funderingsquizWidget() {
  const qs = QUIZ.map(([q, opts, uitleg], i) => `
    <fieldset class="qz-q" data-qz="${i}">
      <legend><span class="tq-num">${i + 1}/${QUIZ.length}</span>${q}</legend>
      <div class="tq-opts">${opts.map(([l, ok], j) => `<label class="tq-opt"><input type="radio" name="qz${i}" value="${j}" data-ok="${ok}"><span>${l}</span></label>`).join('')}</div>
      <p class="qz-feedback" data-qz-feedback hidden><strong data-qz-verdict></strong> ${uitleg}</p>
    </fieldset>`).join('');
  return `
<div class="tool tool-quiz" data-tool="funderingsquiz">
  <div class="sim-head">
    <span class="sim-badge">Mini-quiz · ${QUIZ.length} vragen</span>
    <h3>Hoeveel weet jij over funderingen?</h3>
    <p class="sim-instruction">Kies een antwoord; je ziet direct de uitleg.</p>
  </div>
  <form class="qz-form" data-qz-form novalidate>${qs}</form>
  <div class="tool-result tool-result-inline" data-qz-result aria-live="polite" hidden>
    <p class="tr-count">Je score: <strong data-qz-score>0</strong> van ${QUIZ.length}.</p>
    <p>Wil je weten wat dit betekent voor jouw eigen woning? Een quiz zegt daar niets over; een onderzoek wel.</p>
    <div class="tr-actions"><a class="btn btn-gold" href="/gratis-funderingscheck/">Doe de gratis Funderingscheck <span aria-hidden="true">→</span></a><a class="btn btn-ghost-dark" href="/kennisbank/">Naar de kennisbank</a><button type="button" class="btn btn-link" data-qz-reset>Opnieuw</button></div>
  </div>
</div>`;
}

// ---------------------------------------------------------------- 14. werkgebiedkaart (schematisch, posities bij benadering)
const PLAATSEN = [
  ['Harlingen', 53.17, 5.42, '/funderingsonderzoek-harlingen/'], ['Franeker', 53.19, 5.54, '/funderingsonderzoek-franeker/'],
  ['Leeuwarden', 53.20, 5.80, '/funderingsonderzoek-leeuwarden/'], ['Sneek', 53.03, 5.66, '/funderingsonderzoek-sneek/'],
  ['Heerenveen', 52.96, 5.92, '/funderingsonderzoek-heerenveen/'], ['Drachten', 53.11, 6.10, '/funderingsonderzoek-drachten/'],
  ['Groningen', 53.22, 6.57, '/funderingsonderzoek-groningen-stad/'], ['Haren', 53.17, 6.61, '/funderingsonderzoek-haren/'],
  ['Appingedam', 53.32, 6.86, '/funderingsonderzoek-appingedam/'], ['Delfzijl', 53.33, 6.92, '/funderingsonderzoek-delfzijl/'],
  ['Veendam', 53.10, 6.88, '/funderingsonderzoek-veendam/'], ['Winschoten', 53.14, 7.03, '/funderingsonderzoek-winschoten/'],
];

function werkgebiedkaartWidget() {
  const [lon0, lon1, lat0, lat1] = [5.25, 7.2, 52.9, 53.42];
  const W = 800, H = 360;
  const xy = (lat, lon) => [((lon - lon0) / (lon1 - lon0)) * (W - 80) + 40, ((lat1 - lat) / (lat1 - lat0)) * (H - 80) + 40];
  const dots = PLAATSEN.map(([n, lat, lon, href]) => {
    const [x, y] = xy(lat, lon);
    const below = ['Sneek', 'Haren', 'Delfzijl', 'Heerenveen', 'Harlingen'].includes(n);
    return `<a href="${href}" class="map-dot"><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="8"/><text x="${x.toFixed(0)}" y="${(below ? y + 26 : y - 14).toFixed(0)}" text-anchor="middle">${n}</text></a>`;
  }).join('');
  return `
<figure class="tool tool-map">
  <svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Schematische kaart van plaatsen met een eigen pagina in Friesland en Groningen">
    <text x="190" y="${H - 18}" class="map-prov">Friesland</text>
    <text x="600" y="${H - 18}" class="map-prov">Groningen</text>
    ${dots}
  </svg>
  <figcaption class="tool-small">Schematische weergave; posities bij benadering. Klik op een plaats voor lokale informatie. Bekijk het hele <a href="/werkgebied/">werkgebied</a>.</figcaption>
  <ul class="town-chips map-list">${PLAATSEN.map(([n, , , href]) => `<li><a href="${href}">${n}</a></li>`).join('')}</ul>
</figure>`;
}

function contactformulierWidget() {
  return leadForm('algemeen', { title: 'Stel je vraag', intro: 'Beschrijf je situatie. We nemen contact met je op en laten weten welke stap zinvol kan zijn.', copy: false, hidden: false });
}

export const TOOL_WIDGETS = {
  funderingscheck: funderingscheckWidget, vertelwatjeziet: vertelwatjezietWidget, situatiekeuze: situatiekeuzeWidget,
  kostenwijzer: kostenwijzerWidget, dienstvergelijking: dienstvergelijkingWidget, quickscantijdlijn: quickscantijdlijnWidget,
  bouwjaarfundering: bouwjaarfunderingWidget, risicoklassen: risicoklassenWidget, stapwizard: stapwizardWidget,
  aankoopcheck: aankoopcheckWidget, scenario: scenarioWidget, meetwaarden: meetwaardenWidget,
  funderingsquiz: funderingsquizWidget, werkgebiedkaart: werkgebiedkaartWidget, contactformulier: contactformulierWidget,
};
