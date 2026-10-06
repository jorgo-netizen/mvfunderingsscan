/**
 * Interactieve kennismodules (educatieve simulaties).
 *
 * Gebruik in een sectie van een contentpagina: "widget": "lintvoeg" | "lood" | "keuze".
 * Alle uitleg staat als gewone HTML in de pagina; public/script.js voegt alleen de interactie toe.
 * De meetwaarden zijn FICTIEF en uitsluitend bedoeld als illustratie.
 */

// ---------------------------------------------------------------- lintvoegwaterpassing
// Fictieve simulatiewaarden (cm) langs de lintvoeg, van links naar rechts.
const LV_HEIGHTS = [102.4, 102.1, 101.8, 101.4, 100.9, 100.6, 100.8];
const LV_X = [95, 195, 295, 400, 505, 605, 705];
const LV_BASE_Y = 236;   // y-positie van de referentielijn in de tekening
const LV_SCALE = 12;     // px per cm – verticaal sterk overdreven

const nl = (n, d = 1) => n.toFixed(d).replace('.', ',');

function lintvoegWidget() {
  const ys = LV_HEIGHTS.map((h) => LV_BASE_Y + (LV_HEIGHTS[0] - h) * LV_SCALE);
  const joint = LV_X.map((x, i) => `${x},${ys[i].toFixed(1)}`);
  const jointPath = `M40,${ys[0].toFixed(1)} L${joint.join(' L')} L760,${ys.at(-1).toFixed(1)}`;
  const points = LV_HEIGHTS.map((h, i) => `
          <button type="button" class="sim-point" data-i="${i}" data-h="${h}" aria-pressed="false"
            style="left:${(LV_X[i] / 800 * 100).toFixed(2)}%;top:${(ys[i] / 380 * 100).toFixed(2)}%"
            aria-label="Meetpunt ${i + 1}"><span>${i + 1}</span></button>`).join('');
  const rows = LV_HEIGHTS.map((h, i) => `<tr><th scope="row">Meetpunt ${i + 1}</th><td>${nl(h)} cm</td></tr>`).join('');
  return `
<figure class="sim sim-lintvoeg" data-sim="lintvoeg" aria-labelledby="sim-lv-title">
  <div class="sim-head">
    <span class="sim-badge">Interactieve demonstratie</span>
    <h3 id="sim-lv-title">Probeer het zelf: een lintvoegwaterpassing</h3>
    <p class="sim-instruction">Klik of tik op de meetpunten om te zien hoe een lintvoegwaterpassing wordt opgebouwd.</p>
  </div>
  <div class="sim-stage">
    <svg class="sim-drawing" viewBox="0 0 800 380" role="img" aria-label="Schematische woninggevel met metselwerk, een doorlopende lintvoeg, een rechte referentielijn en zeven meetpunten">
      <defs>
        <pattern id="sim-bricks" width="48" height="20" patternUnits="userSpaceOnUse">
          <rect width="48" height="20" fill="#b9714f"/>
          <path d="M0 0.5H48M0 10.5H48M0.5 0V10M24.5 10V20" stroke="#e9d9c8" stroke-width="1.2"/>
        </pattern>
      </defs>
      <rect x="40" y="40" width="720" height="300" fill="url(#sim-bricks)"/>
      <path d="M30 40 L400 6 L770 40 Z" fill="#3a4a5c"/>
      <g fill="#dfe8ef" stroke="#f4f0e8" stroke-width="6">
        <rect x="95" y="80" width="130" height="100"/><rect x="335" y="80" width="130" height="100"/><rect x="575" y="80" width="130" height="100"/>
        <rect x="120" y="262" width="110" height="78"/><rect x="560" y="262" width="110" height="78"/>
      </g>
      <rect x="352" y="250" width="96" height="90" fill="#102945" stroke="#f4f0e8" stroke-width="6"/>
      <line class="sim-reference" x1="40" y1="${LV_BASE_Y}" x2="760" y2="${LV_BASE_Y}"/>
      <text class="sim-ref-label" x="748" y="${LV_BASE_Y - 8}" text-anchor="end">referentielijn</text>
      <path class="sim-joint" d="${jointPath}"/>
      <text class="sim-joint-label" x="48" y="${LV_BASE_Y + 30}">lintvoeg (doorlopende metselvoeg)</text>
      <line x1="40" y1="344" x2="760" y2="344" stroke="#7a8a99" stroke-width="3"/>
    </svg>
    <div class="sim-points">${points}
    </div>
  </div>
  <div class="sim-panel">
    <div class="sim-readout" aria-live="polite">
      <p class="sim-status" data-sim-status>Nog geen meetpunten gemeten. Kies een meetpunt in de gevel.</p>
      <ol class="sim-readings" data-sim-readings></ol>
    </div>
    <div class="sim-profile-wrap">
      <p class="sim-profile-title">Hoogteprofiel van de lintvoeg</p>
      <svg class="sim-profile" data-sim-profile viewBox="0 0 800 220" role="img" aria-label="Hoogteprofiel van de gemeten punten">
        <line x1="40" y1="200" x2="780" y2="200" class="sim-axis"/>
        <line x1="40" y1="20" x2="40" y2="200" class="sim-axis"/>
        <text x="410" y="120" text-anchor="middle" class="sim-placeholder">Selecteer minimaal twee meetpunten</text>
      </svg>
      <div class="sim-result" data-sim-result hidden>
        <div><span>Hoogste punt</span><strong data-sim-max>–</strong></div>
        <div><span>Laagste punt</span><strong data-sim-min>–</strong></div>
        <div class="sim-result-diff"><span>Hoogteverschil</span><strong data-sim-diff>–</strong></div>
      </div>
    </div>
    <div class="sim-actions">
      <button type="button" class="btn btn-gold" data-sim-all>Meet alle punten</button>
      <button type="button" class="btn btn-ghost-dark" data-sim-reset>Opnieuw</button>
    </div>
  </div>
  <div class="sim-explain">
    <div class="sim-explain-item"><strong>Wat zie je?</strong><p data-sim-explain>De lintvoeg is ooit vrijwel waterpas gemetseld. Door op meerdere punten de hoogte te meten, zie je of de voeg nog recht loopt of dat delen hoger of lager liggen dan de referentielijn.</p></div>
    <div class="sim-explain-item"><strong>Wat kan dit betekenen?</strong><p>Een hoogteverschil kan verschillende oorzaken hebben. Binnen funderingsonderzoek wordt zo'n meting daarom altijd gecombineerd met andere informatie, zoals de bouwkundige situatie, bodemgegevens, zichtbare scheuren en andere metingen.</p></div>
    <div class="sim-explain-item sim-explain-warn"><strong>Belangrijk</strong><p>Een lintvoegwaterpassing alleen stelt geen diagnose van een fundering. De meetresultaten moeten in hun context worden beoordeeld.</p></div>
  </div>
  <details class="sim-data">
    <summary>Bekijk alle simulatiewaarden</summary>
    <table class="data-table"><thead><tr><th>Meetpunt</th><th>Hoogte (fictief)</th></tr></thead><tbody>${rows}</tbody></table>
  </details>
  <figcaption class="sim-caption">Educatieve simulatie met fictieve meetwaarden; de hoogteverschillen zijn in de tekening sterk overdreven. Dit is geen professionele funderingsmeting en zegt niets over een echte woning.</figcaption>
</figure>`;
}

// ---------------------------------------------------------------- loodmeting
function loodWidget() {
  return `
<figure class="sim sim-lood" data-sim="lood" aria-labelledby="sim-lood-title">
  <div class="sim-head">
    <span class="sim-badge">Interactieve demonstratie</span>
    <h3 id="sim-lood-title">Ervaar hoe een loodmeting werkt</h3>
    <p class="sim-instruction">Gebruik de schuifregelaar om de scheefstand van de gevel te veranderen. De loodlijn blijft recht; de gevel wijkt er steeds verder van af.</p>
  </div>
  <div class="sim-lood-grid">
    <div class="sim-stage sim-stage-lood">
      <svg class="sim-drawing" viewBox="0 0 420 420" role="img" aria-label="Schematische gevel naast een verticale loodlijn; de gevel kantelt bij een grotere afwijking">
        <defs>
          <pattern id="sim-bricks-lood" width="36" height="16" patternUnits="userSpaceOnUse">
            <rect width="36" height="16" fill="#b9714f"/>
            <path d="M0 0.5H36M0 8.5H36M0.5 0V8M18.5 8V16" stroke="#e9d9c8" stroke-width="1"/>
          </pattern>
        </defs>
        <line x1="20" y1="380" x2="400" y2="380" stroke="#7a8a99" stroke-width="4"/>
        <g data-lood-wall style="transform-origin:250px 380px">
          <rect x="130" y="70" width="120" height="310" fill="url(#sim-bricks-lood)"/>
          <rect x="160" y="110" width="60" height="70" fill="#dfe8ef" stroke="#f4f0e8" stroke-width="4"/>
          <rect x="160" y="230" width="60" height="70" fill="#dfe8ef" stroke="#f4f0e8" stroke-width="4"/>
        </g>
        <line class="sim-plumb" x1="250" y1="40" x2="250" y2="372"/>
        <path class="sim-bob" d="M243 358 L257 358 L250 376 Z"/>
        <circle cx="250" cy="40" r="5" class="sim-plumb-top"/>
        <text x="258" y="34" class="sim-ref-label">loodlijn (verticaal)</text>
        <line class="sim-offset" data-lood-offset x1="250" y1="70" x2="250" y2="70"/>
        <text class="sim-offset-label" data-lood-label x="300" y="64">0 mm</text>
      </svg>
    </div>
    <div class="sim-panel">
      <div class="sim-readout" aria-live="polite">
        <p class="sim-big"><span>Gemeten afwijking</span><strong data-lood-value>0 mm</strong></p>
        <p class="sim-level" data-lood-level>Geen duidelijke afwijking</p>
      </div>
      <label class="sim-slider-label" for="sim-lood-range">Scheefstand van de gevel</label>
      <input id="sim-lood-range" class="sim-range" type="range" min="0" max="30" step="1" value="0" data-lood-range aria-describedby="sim-lood-scale">
      <div class="sim-scale" id="sim-lood-scale"><span>0 mm</span><span>grotere afwijking</span></div>
      <div class="sim-presets" role="group" aria-label="Voorbeeldwaarden">
        <button type="button" class="sim-chip" data-lood-set="0">0 mm</button>
        <button type="button" class="sim-chip" data-lood-set="8">8 mm</button>
        <button type="button" class="sim-chip" data-lood-set="18">18 mm</button>
        <button type="button" class="sim-chip" data-lood-set="30">30 mm</button>
      </div>
      <div class="sim-levels">
        <div class="sim-level-text is-active" data-level="0"><strong>Geen duidelijke afwijking</strong><p>De gevel staat in deze simulatie vrijwel loodrecht.</p></div>
        <div class="sim-level-text" data-level="1"><strong>Kleine afwijking</strong><p>De gevel wijkt enigszins af van de verticale referentie. In de praktijk wordt bekeken hoe groot de afwijking is, waar deze voorkomt en hoe deze zich verhoudt tot andere waarnemingen.</p></div>
        <div class="sim-level-text" data-level="2"><strong>Grotere afwijking</strong><p>Een grotere scheefstand kan aanleiding zijn voor nader onderzoek. De oorzaak kan echter niet op basis van alleen een loodmeting worden vastgesteld.</p></div>
      </div>
    </div>
  </div>
  <figcaption class="sim-caption">Educatieve simulatie: de kanteling is sterk overdreven en de indeling in "klein" en "groter" geldt alleen voor deze demonstratie. In werkelijkheid hangt de beoordeling af van de hoogte van de gevel, de bouwwijze en andere waarnemingen. Dit is geen professionele meting.</figcaption>
</figure>`;
}

// ---------------------------------------------------------------- keuzehulp
const KEUZES = [
  ['scheuren', 'Scheuren in de gevel', 'Scheuren in de gevel',
    'Bij scheuren kijkt een onderzoeker eerst naar het patroon: richting, breedte, plaats en of de scheur groeit. Vaak is een Quick Scan (fase 0) de eerste stap; als het patroon wijst op ongelijke zetting, kunnen metingen zoals een lintvoegwaterpassing in fase 1 meer duidelijkheid geven.',
    '/kennisbank/scheurpatronen/', 'Lees wat scheurpatronen vertellen'],
  ['scheef', 'Gevel lijkt scheef te staan', 'Gevel lijkt scheef te staan',
    'Een loodmeting kan helpen om de mate en richting van scheefstand inzichtelijk te maken. Afhankelijk van de situatie kunnen aanvullende metingen relevant zijn, zoals een lintvoegwaterpassing om hoogteverschillen in dezelfde gevel te vergelijken.',
    '/kennisbank/loodmeting/', 'Lees meer over loodmeting'],
  ['vloer', 'Vloer loopt schuin', 'Vloer loopt schuin',
    'Met een vloerveldwaterpassing worden hoogtes in een raster over de vloer gemeten. Zo wordt zichtbaar of de vloer als geheel helt of plaatselijk doorbuigt. Een schuine vloer kan ook door de vloerconstructie zelf komen; daarom wordt de meting gecombineerd met andere waarnemingen.',
    '/kennisbank/vloerveldwaterpassing/', 'Lees meer over vloerveldwaterpassing'],
  ['klemmen', 'Deuren of ramen klemmen', 'Deuren of ramen klemmen',
    'Klemmende deuren en ramen hebben vaak een onschuldige oorzaak, zoals vocht of hang- en sluitwerk. Klemmen meerdere deuren of ramen tegelijk, of zie je ook scheuren of scheefstand, dan is een Quick Scan (fase 0) een logische eerste stap. Metingen volgen alleen als de signalen daar aanleiding voor geven.',
    '/klemmende-deuren-en-ramen/', 'Lees meer over klemmende deuren en ramen'],
  ['onbekend', 'Ik weet het niet', 'Ik weet het niet',
    'Twijfel je wat je ziet? Begin dan met een Quick Scan (fase 0). Daarin worden archief- en bodemgegevens gecombineerd met een inspectie van de woning, en hoor je of metingen zinvol zijn. Je kunt ook eerst de online funderingscheck doen.',
    '/fase-0-funderingsonderzoek/', 'Lees meer over fase 0 funderingsonderzoek'],
];

function keuzeWidget() {
  const buttons = KEUZES.map(([k, label]) => `<button type="button" class="sim-choice" data-keuze="${k}" aria-pressed="false" aria-controls="keuze-${k}">${label}</button>`).join('\n      ');
  const panels = KEUZES.map(([k, , title, text, href, cta]) => `
    <div class="sim-choice-result" id="keuze-${k}" data-keuze-panel="${k}">
      <span class="sim-badge">Mogelijk interessant onderzoek</span>
      <h4>${title}</h4>
      <p>${text}</p>
      <a class="btn btn-gold" href="${href}">${cta} <span aria-hidden="true">→</span></a>
    </div>`).join('');
  return `
<div class="sim sim-keuze" data-sim="keuze">
  <div class="sim-head">
    <span class="sim-badge">Keuzehulp</span>
    <h3>Wat zie je aan je woning?</h3>
    <p class="sim-instruction">Kies wat het meest op jouw situatie lijkt. Je ziet direct welk onderzoek mogelijk interessant is.</p>
  </div>
  <div class="sim-choices" role="group" aria-label="Wat zie je aan je woning?">
      ${buttons}
  </div>${panels}
  <p class="sim-caption">Dit is een algemene indicatie en geen technisch advies. Alleen onderzoek ter plaatse laat zien wat er met jouw woning aan de hand is.</p>
</div>`;
}

const WIDGETS = { lintvoeg: lintvoegWidget, lood: loodWidget, keuze: keuzeWidget };
export const WIDGET_NAMES = Object.keys(WIDGETS);

export function widgetHtml(name) {
  if (!name) return '';
  const fn = WIDGETS[name];
  if (!fn) throw new Error(`Onbekende widget: ${name}`);
  return fn();
}
