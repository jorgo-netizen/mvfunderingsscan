/**
 * Uitbreiding van de kennisbankpagina /kennisbank/lintvoegwaterpassing/:
 *   "lintvoegschema"   – eenvoudige uitlegtekening (statisch)
 *   "lintvoegmeting"   – rijwoninggevel met vijf bewerkbare meetpunten en live hoogteprofiel
 *   "lintvoegstappen"  – vier uitvoeringsstappen met Vorige/Volgende (zonder JS: alle stappen zichtbaar)
 * De rekenregels staan in public/lintvoegmeting.js (één bron voor browser, build en tests).
 * Pagina's met deze widgets laden /lintvoegmeting.js via `"scripts": ["/lintvoegmeting.js"]`.
 * Alle waarden zijn FICTIEVE VOORBEELDWAARDEN.
 */
import '../../public/lintvoegmeting.js';

const C = globalThis.MVFSLintvoeg;
const SIM_NOTE = 'Deze visualisatie is een educatieve simulatie en vervangt geen professioneel funderingsonderzoek.';
const X = [110, 255, 400, 545, 690];
const BASE = 232; // y van de lintvoeg bij 0 mm
const SCALE = 3; // px per mm – verticaal sterk overdreven
const yOf = (mm) => Math.min(340, Math.max(70, BASE - mm * SCALE));

// Drie aaneengesloten rijwoningen (jaren-dertigstijl): kap, ramen, deuren, plint.
function rijwoning(id) {
  const houses = [40, 280, 520].map((x, k) => `
      <g>
        <path d="M${x - 6} 80 L${x + 120} 22 L${x + 246} 80 Z" fill="${k === 1 ? '#34465a' : '#2f3d4d'}"/>
        <rect x="${x + 22}" y="104" width="78" height="72" fill="#e3ebf1" stroke="#f6f1e6" stroke-width="5"/>
        <rect x="${x + 140}" y="104" width="78" height="72" fill="#e3ebf1" stroke="#f6f1e6" stroke-width="5"/>
        <path d="M${x + 61} 104V176M${x + 179} 104V176" stroke="#f6f1e6" stroke-width="3"/>
        <rect x="${x + 22}" y="258" width="112" height="78" fill="#e3ebf1" stroke="#f6f1e6" stroke-width="5"/>
        <rect x="${x + 160}" y="250" width="56" height="90" fill="#102945" stroke="#f6f1e6" stroke-width="5"/>
      </g>`).join('');
  return `
      <defs>
        <pattern id="${id}" width="40" height="16" patternUnits="userSpaceOnUse">
          <rect width="40" height="16" fill="#a8583c"/>
          <path d="M0 0.5H40M0 8.5H40M0.5 0V8M20.5 8V16" stroke="#ead7c4" stroke-width="1"/>
        </pattern>
      </defs>
      <rect x="40" y="80" width="720" height="260" fill="url(#${id})"/>${houses}
      <path d="M280 80V340M520 80V340" stroke="#8a4630" stroke-width="3"/>
      <rect x="40" y="326" width="720" height="14" fill="#6c7a86"/>
      <line x1="24" y1="342" x2="776" y2="342" stroke="#4d5a66" stroke-width="3"/>`;
}

// ---------------------------------------------------------------- uitlegtekening
function lintvoegschemaWidget() {
  return `
<figure class="lvm-schema">
  <svg viewBox="0 0 800 300" role="img" aria-labelledby="lvm-schema-t lvm-schema-d">
    <title id="lvm-schema-t">Uitlegtekening lintvoegwaterpassing</title>
    <desc id="lvm-schema-d">Een stuk metselwerk met één doorlopende horizontale voeg tussen twee steenlagen gemarkeerd als lintvoeg, drie meetpunten op die voeg en een meetinstrument op statief dat de hoogte van elk punt vergelijkt met een vaste referentie.</desc>
    <defs>
      <pattern id="lvm-schema-bricks" width="60" height="24" patternUnits="userSpaceOnUse">
        <rect width="60" height="24" fill="#a8583c"/>
        <path d="M0 0.5H60M0 12.5H60M0.5 0V12M30.5 12V24" stroke="#ead7c4" stroke-width="1.6"/>
      </pattern>
    </defs>
    <rect x="30" y="40" width="560" height="216" fill="url(#lvm-schema-bricks)"/>
    <line x1="30" y1="148.5" x2="590" y2="148.5" class="lvm-schema-joint"/>
    <g class="lvm-schema-pt"><circle cx="110" cy="148.5" r="11"/><circle cx="310" cy="148.5" r="11"/><circle cx="510" cy="148.5" r="11"/></g>
    <g class="lvm-schema-ptl"><text x="110" y="153" text-anchor="middle">A</text><text x="310" y="153" text-anchor="middle">B</text><text x="510" y="153" text-anchor="middle">C</text></g>
    <text x="40" y="132" class="lvm-schema-lbl">lintvoeg</text>
    <line x1="30" y1="264" x2="590" y2="264" stroke="#4d5a66" stroke-width="3"/>
    <g class="lvm-schema-instr">
      <path d="M700 150 L670 262 M700 150 L730 262 M700 150 L700 262" stroke="#102945" stroke-width="4" fill="none"/>
      <rect x="672" y="122" width="56" height="26" rx="5" fill="#102945"/>
      <circle cx="680" cy="135" r="6" fill="#e3b866"/>
    </g>
    <line x1="666" y1="135" x2="122" y2="148.5" class="lvm-schema-sight"/>
    <text x="700" y="108" text-anchor="middle" class="lvm-schema-lbl2">meetinstrument</text>
    <text x="400" y="290" text-anchor="middle" class="lvm-schema-lbl2">Elk meetpunt wordt vergeleken met dezelfde vaste referentie</text>
  </svg>
  <figcaption>Schematische tekening (niet op schaal). De lintvoeg is een doorlopende horizontale voeg tussen twee steenlagen. Op die voeg worden meetpunten gekozen; van elk punt wordt de hoogte ten opzichte van één vaste referentie bepaald.</figcaption>
</figure>`;
}

// ---------------------------------------------------------------- interactieve gevel
const UITLEG = {
  A: 'Referentiepunt. Alle andere punten worden hiermee vergeleken.',
  B: 'Iets lager dan A.',
  C: 'Laagste punt in dit voorbeeld.',
  D: 'Lager dan A, maar hoger dan C.',
  E: 'Hoogste punt in dit voorbeeld.',
};
function lintvoegmetingWidget() {
  const v = C.DEMO;
  const path = `M40,${yOf(v[0]).toFixed(1)} ` + X.map((x, i) => `L${x},${yOf(v[i]).toFixed(1)}`).join(' ') + ` L760,${yOf(v.at(-1)).toFixed(1)}`;
  const points = C.LABELS.map((l, i) => `
        <button type="button" class="sim-point" data-i="${i}" data-x="${X[i]}" aria-pressed="${i === 0}" aria-controls="lvm-info"
          style="left:${(X[i] / 800 * 100).toFixed(2)}%;top:${(yOf(v[i]) / 380 * 100).toFixed(2)}%"
          aria-label="Meetpunt ${l}"><span>${l}</span></button>`).join('');
  const rows = C.LABELS.map((l, i) => `
          <tr><th scope="row">Punt ${l}</th>
            <td><label class="lvm-input"><span class="sr-only">Hoogte meetpunt ${l} in mm ten opzichte van punt A</span><input type="number" inputmode="numeric" step="1" min="${C.MIN}" max="${C.MAX}" value="${v[i]}" data-lvm-input data-i="${i}"${i === 0 ? ' readonly aria-describedby="lvm-ref-note"' : ''}><span aria-hidden="true">mm</span></label></td>
            <td class="lvm-uitleg">${UITLEG[l]}</td></tr>`).join('');
  const max = Math.max(...v); const min = Math.min(...v);
  return `
<figure class="sim sim-lintvoeg sim-lvm" data-sim="lintvoegmeting" data-base="${BASE}" data-scale="${SCALE}" aria-labelledby="lvm-title">
  <div class="sim-head">
    <span class="sim-badge">Interactieve demonstratie · fictieve voorbeeldwaarden</span>
    <h3 id="lvm-title">Probeer het zelf: vijf meetpunten op een rijwoninggevel</h3>
    <p class="sim-instruction">Kies een meetpunt in de gevel om te zien wat de waarde betekent. Pas daaronder de waarden aan: de lintvoeg in de tekening, het hoogteprofiel en de uitleg rekenen direct mee.</p>
  </div>
  <div class="sim-stage">
    <svg class="sim-drawing" viewBox="0 0 800 380" role="img" aria-label="Schematische gevel van drie Nederlandse rijwoningen met metselwerk, een doorlopende lintvoeg, een rechte referentielijn op 0 mm en vijf meetpunten A tot en met E">
      ${rijwoning('lvm-bricks')}
      <line class="sim-reference" x1="40" y1="${BASE}" x2="760" y2="${BASE}"/>
      <text class="sim-ref-label lvm-ref-label" x="752" y="${BASE + 26}" text-anchor="end">referentie 0 mm (punt A)</text>
      <path class="sim-joint" data-lvm-joint d="${path}"/>
      <text class="sim-joint-label" x="48" y="${BASE - 14}">lintvoeg</text>
    </svg>
    <div class="sim-points">${points}
    </div>
  </div>
  <p class="lvm-scale-note">Hoogteverschillen in de tekening zijn sterk overdreven (circa 1 mm = 3 px), anders zijn ze niet te zien.</p>
  <div class="lvm-info" id="lvm-info" data-lvm-info aria-live="polite">
    <strong>Meetpunt A – referentiepunt (0 mm)</strong><p>Alle andere hoogtes worden met dit punt vergeleken. Een andere keuze van het referentiepunt verandert de getallen, maar niet de onderlinge verschillen.</p>
  </div>
  <div class="lvm-grid">
    <div class="lvm-table-wrap">
      <table class="data-table lvm-table">
        <caption>Fictieve voorbeeldwaarden, relatief ten opzichte van punt A</caption>
        <thead><tr><th scope="col">Meetpunt</th><th scope="col">Hoogte t.o.v. A</th><th scope="col">Toelichting bij de beginwaarde</th></tr></thead>
        <tbody>${rows}
        </tbody>
      </table>
      <p class="lvm-ref-note" id="lvm-ref-note">Punt A is het referentiepunt en blijft 0 mm. Invoer: hele millimeters van ${C.MIN} tot +${C.MAX}.</p>
      <p class="lvm-error" data-lvm-error role="alert" hidden>Vul een getal in tussen ${C.MIN} en +${C.MAX} mm. De tekening gebruikt zolang de laatste geldige waarde.</p>
      <div class="sim-actions"><button type="button" class="btn btn-ghost-dark" data-lvm-reset>Voorbeeldwaarden herstellen</button></div>
    </div>
    <div class="sim-profile-wrap">
      <p class="sim-profile-title">Hoogteprofiel van de lintvoeg</p>
      <p class="sim-unit-note">Relatieve hoogte in mm ten opzichte van punt A (0 mm). Dit zijn hoogteverschillen: geen helling, geen absolute hoogte (NAP) en geen oorzaak.</p>
      <svg class="sim-profile" data-lvm-profile viewBox="0 0 800 250" role="img" aria-label="Profiel van de lintvoeg: ${C.LABELS.map((l, i) => `${l} ${C.signed(v[i])} mm`).join(', ')}"></svg>
      <div class="sim-result">
        <div><span>Hoogste punt</span><strong data-lvm-max>Punt ${C.LABELS[v.indexOf(max)]} · ${C.signed(max)} mm</strong></div>
        <div><span>Laagste punt</span><strong data-lvm-min>Punt ${C.LABELS[v.indexOf(min)]} · ${C.signed(min)} mm</strong></div>
        <div class="sim-result-diff"><span>Verschil hoogste – laagste</span><strong data-lvm-range>${C.range(v)} mm</strong></div>
      </div>
      <p class="lvm-pattern" data-lvm-pattern aria-live="polite">${C.describe(v)}</p>
    </div>
  </div>
  <div class="sim-explain">
    <div class="sim-explain-item"><strong>Hoogteverschil</strong><p>Hoeveel millimeter een punt hoger of lager ligt dan een ander punt. Dat is wat deze demo laat zien.</p></div>
    <div class="sim-explain-item"><strong>Helling</strong><p>Een verschil gedeeld door de afstand tussen de punten (bijvoorbeeld mm per meter). Daarvoor moet je de afstanden kennen; die zitten niet in deze demo.</p></div>
    <div class="sim-explain-item sim-explain-warn"><strong>Oorzaak</strong><p>Een metselvoeg is niet altijd volmaakt waterpas gemetseld. Uit de getallen alleen blijkt niet of een verschil bij de bouw is ontstaan of later, en waardoor.</p></div>
  </div>
  <figcaption class="sim-caption">Alle waarden zijn fictief en alleen bedoeld om het principe uit te leggen. Er zijn bewust geen grenswaarden of kleuren als "goed" of "fout" gebruikt: zo'n oordeel hangt af van de woning en de overige gegevens. ${SIM_NOTE}</figcaption>
</figure>`;
}

// ---------------------------------------------------------------- uitvoeringsstappen
const STAPPEN = [
  ['De gevel bekijken', 'Eerst wordt gekeken welke gevels geschikt zijn: is er een doorlopende lintvoeg te volgen, zijn er latere aanpassingen zoals nieuwe kozijnen, een aanbouw of vervangen metselwerk, en zijn er scheuren of andere zichtbare signalen? Dat bepaalt waar een meting iets zegt en waar niet.'],
  ['Meetpunten bepalen', 'Op dezelfde lintvoeg worden meetpunten gekozen, meestal verdeeld over de hele lengte van de gevel en waar mogelijk ook bij hoeken en woningscheidende muren. De plek van elk punt wordt vastgelegd, bijvoorbeeld op een schets of foto, zodat de meting later op dezelfde punten herhaald kan worden.'],
  ['Hoogten meten', 'Met een meetinstrument wordt van elk punt de hoogte ten opzichte van één vaste referentie bepaald. Welk instrument en welke werkwijze passend is, hangt af van de situatie en de onderzoeker; daar bestaat niet één vaste procedure voor.'],
  ['Resultaten vergelijken', 'De hoogtes worden omgerekend naar verschillen ten opzichte van een referentiepunt en uitgezet in een profiel. Daarna wordt gekeken naar het patroon en hoe dat past bij de andere gegevens: scheuren, bouwjaar, funderingstype, bodem en eventuele eerdere metingen.'],
];
function lintvoegstappenWidget() {
  const dots = STAPPEN.map(([t], i) => `<li><button type="button" class="lvs-dot" data-lvs-dot aria-current="${i === 0 ? 'step' : 'false'}"><span class="sr-only">Stap ${i + 1}: </span><span aria-hidden="true">${i + 1}</span><span class="lvs-dot-t">${t}</span></button></li>`).join('');
  const steps = STAPPEN.map(([t, p], i) => `
    <li class="lvs-step" data-lvs-step tabindex="-1">
      <span class="lvs-num" aria-hidden="true">${i + 1}</span>
      <div><h3>Stap ${i + 1}: ${t}</h3><p>${p}</p></div>
    </li>`).join('');
  return `
<div class="lvs" data-lvs>
  <ol class="lvs-dots" aria-label="Stappen">${dots}</ol>
  <ol class="lvs-steps">${steps}
  </ol>
  <div class="lvs-nav">
    <button type="button" class="btn btn-ghost-dark" data-lvs-prev>← Vorige stap</button>
    <span class="lvs-count" data-lvs-count aria-live="polite">Stap 1 van ${STAPPEN.length}</span>
    <button type="button" class="btn btn-gold" data-lvs-next>Volgende stap →</button>
  </div>
</div>`;
}

export const LINTVOEG_EXT_WIDGETS = { lintvoegschema: lintvoegschemaWidget, lintvoegmeting: lintvoegmetingWidget, lintvoegstappen: lintvoegstappenWidget };
export const LINTVOEG_EXT_DATA = { calc: C, X, BASE, SCALE, STAPPEN };
