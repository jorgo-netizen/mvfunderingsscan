/**
 * Interactieve kennismodules (educatieve simulaties).
 *
 * Gebruik in een sectie van een contentpagina:
 *   "widget": "lintvoeg" | "lood" | "oldehove" | "scheuren" | "scheurkeuze" | "vloerveld" | "keuze"
 * Alle uitleg staat als gewone HTML in de pagina; public/script.js voegt alleen de interactie toe.
 * Alle meetwaarden zijn VOORBEELDWAARDEN en uitsluitend bedoeld als illustratie.
 */

const nl = (n, d = 1) => n.toFixed(d).replace('.', ',');
const SIM_NOTE = 'Deze visualisatie is een educatieve simulatie en vervangt geen professioneel funderingsonderzoek.';

// ================================================================ 1. lintvoegwaterpassing
// Voorbeeldwaarden (cm) langs de lintvoeg van een jaren-dertiggevel, van links (A) naar rechts (F).
const LV = [['A', 102.4], ['B', 102.1], ['C', 101.7], ['D', 100.9], ['E', 100.5], ['F', 100.1]];
const LV_X = [100, 220, 340, 460, 580, 700];
const LV_BASE_Y = 236;
const LV_SCALE = 10; // px per cm – verticaal sterk overdreven

function lintvoegWidget() {
  const ys = LV.map(([, h]) => LV_BASE_Y + (LV[0][1] - h) * LV_SCALE);
  const jointPath = `M40,${ys[0].toFixed(1)} L${LV_X.map((x, i) => `${x},${ys[i].toFixed(1)}`).join(' L')} L760,${ys.at(-1).toFixed(1)}`;
  const points = LV.map(([label, h], i) => `
          <button type="button" class="sim-point" data-i="${i}" data-h="${h}" data-label="${label}" aria-pressed="false"
            style="left:${(LV_X[i] / 800 * 100).toFixed(2)}%;top:${(ys[i] / 380 * 100).toFixed(2)}%"
            aria-label="Meetpunt ${label}"><span>${label}</span></button>`).join('');
  const rows = LV.map(([label, h]) => `<tr><th scope="row">Punt ${label}</th><td>${nl(h)} cm (voorbeeldwaarde)</td></tr>`).join('');
  return `
<figure class="sim sim-lintvoeg" data-sim="lintvoeg" aria-labelledby="sim-lv-title">
  <div class="sim-head">
    <span class="sim-badge">Interactieve demonstratie</span>
    <h3 id="sim-lv-title">Meet zelf: lintvoegwaterpassing op een jaren-dertiggevel</h3>
    <p class="sim-instruction">Klik of tik op de meetpunten A tot en met F. Je ziet per punt de hoogte van de lintvoeg en hoe daaruit het verloop over de gevel ontstaat.</p>
  </div>
  <div class="sim-stage">
    <svg class="sim-drawing" viewBox="0 0 800 380" role="img" aria-label="Schematische jaren-dertiggevel met metselwerk, erker, een doorlopende lintvoeg, een rechte referentielijn en zes meetpunten A tot en met F">
      <defs>
        <pattern id="sim-bricks" width="48" height="20" patternUnits="userSpaceOnUse">
          <rect width="48" height="20" fill="#a8583c"/>
          <path d="M0 0.5H48M0 10.5H48M0.5 0V10M24.5 10V20" stroke="#ead7c4" stroke-width="1.2"/>
        </pattern>
      </defs>
      <rect x="40" y="52" width="720" height="288" fill="url(#sim-bricks)"/>
      <path d="M24 56 L400 8 L776 56 Z" fill="#2f3d4d"/>
      <path d="M24 56 L776 56" stroke="#1b2733" stroke-width="6"/>
      <g fill="#e3ebf1" stroke="#f6f1e6" stroke-width="6">
        <rect x="90" y="88" width="120" height="92"/><rect x="330" y="88" width="120" height="92"/><rect x="570" y="88" width="120" height="92"/>
      </g>
      <g stroke="#f6f1e6" stroke-width="3" fill="none"><path d="M150 88V180M90 118H210M390 88V180M330 118H450M630 88V180M570 118H690"/></g>
      <path d="M100 262 h170 v78 h-170 z" fill="#e3ebf1" stroke="#f6f1e6" stroke-width="6"/>
      <path d="M86 258 h198" stroke="#f6f1e6" stroke-width="8"/>
      <rect x="352" y="246" width="96" height="94" rx="48" ry="0" fill="#102945" stroke="#f6f1e6" stroke-width="6"/>
      <rect x="540" y="262" width="150" height="78" fill="#e3ebf1" stroke="#f6f1e6" stroke-width="6"/>
      <line class="sim-reference" x1="40" y1="${LV_BASE_Y}" x2="760" y2="${LV_BASE_Y}"/>
      <text class="sim-ref-label" x="748" y="${LV_BASE_Y - 8}" text-anchor="end">referentielijn</text>
      <path class="sim-joint" d="${jointPath}"/>
      <text class="sim-joint-label" x="48" y="${LV_BASE_Y - 10}">lintvoeg</text>
      <line x1="30" y1="344" x2="770" y2="344" stroke="#7a8a99" stroke-width="3"/>
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
      <p class="sim-profile-title">Hoogteprofiel van de lintvoeg (voorbeeldwaarden)</p>
      <svg class="sim-profile" data-sim-profile viewBox="0 0 800 220" role="img" aria-label="Hoogteprofiel van de gemeten punten">
        <text x="410" y="120" text-anchor="middle" class="sim-placeholder">Selecteer minimaal twee meetpunten</text>
      </svg>
      <div class="sim-result" data-sim-result hidden>
        <div><span>Hoogste punt</span><strong data-sim-max>–</strong></div>
        <div><span>Laagste punt</span><strong data-sim-min>–</strong></div>
        <div class="sim-result-diff"><span>Hoogteverschil</span><strong data-sim-diff>–</strong></div>
      </div>
      <p class="sim-trend" data-sim-trend hidden></p>
    </div>
    <div class="sim-actions">
      <button type="button" class="btn btn-gold" data-sim-all>Meet alle punten</button>
      <button type="button" class="btn btn-ghost-dark" data-sim-reset>Opnieuw</button>
    </div>
  </div>
  <div class="sim-explain">
    <div class="sim-explain-item"><strong>Wat zie je?</strong><p data-sim-explain>De lintvoeg is ooit vrijwel waterpas gemetseld. Door op meerdere punten de hoogte te meten, zie je of de voeg nog recht loopt of dat delen hoger of lager liggen dan de referentielijn.</p></div>
    <div class="sim-explain-item"><strong>Wat kan dit betekenen?</strong><p>Een hoogteverschil kan verschillende oorzaken hebben. Binnen funderingsonderzoek wordt zo'n meting daarom altijd gecombineerd met andere informatie, zoals de bouwkundige situatie, bodemgegevens, zichtbare scheuren en andere metingen.</p></div>
    <div class="sim-explain-item sim-explain-warn"><strong>Belangrijk</strong><p>Een lintvoegwaterpassing alleen stelt geen diagnose van een fundering. Dit patroon kan aanleiding zijn om nader te onderzoeken wat de oorzaak is.</p></div>
  </div>
  <details class="sim-data">
    <summary>Bekijk alle voorbeeldwaarden</summary>
    <table class="data-table"><thead><tr><th>Meetpunt</th><th>Hoogte</th></tr></thead><tbody>${rows}</tbody></table>
  </details>
  <figcaption class="sim-caption">Dit is een educatieve simulatie met voorbeeldwaarden; de hoogteverschillen zijn in de tekening sterk overdreven. Een echte lintvoegwaterpassing wordt met professionele meetapparatuur uitgevoerd. ${SIM_NOTE}</figcaption>
</figure>`;
}

// ================================================================ 2a. loodmeting (gevel, mm)
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
        <g data-lood-wall>
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
  <figcaption class="sim-caption">Educatieve simulatie: de kanteling is sterk overdreven en de indeling in "klein" en "groter" geldt alleen voor deze demonstratie. ${SIM_NOTE}</figcaption>
</figure>`;
}

// ================================================================ 2b. Oldehove (loodmeting op een scheve toren)
// Gepubliceerde scheefstand van de Oldehove: circa 4,2° uit het lood; hoogte circa 39 meter.
const OL_DEG = 4.2;
const OL_HEIGHT_M = 39;
const OL_PX_PER_M = 7.9; // 39 m → 308 px: van de voet tot de bovenkant van de rechtergevel
// Het silhouet helt zelf al: de rechtergevel staat in de afbeelding 1,87° scheef. Die gevel is het meetvlak.
const OL_IMG_LEAN = 1.87;
const OL_PIVOT_X = 255; // voet van de rechtergevel in de tekening
const OL_HEIGHTS = [10, 20, 30, 39];
const olOffset = (h) => h * Math.tan(OL_DEG * Math.PI / 180); // horizontale afwijking in meters

function oldehoveWidget() {
  // Silhouet van de Oldehove (aangeleverd door MV Funderingsscan), transparante PNG in public/assets/img.
  // 214 x 455 px → in de tekening 360 hoog; voet van de rechtergevel ligt 157,7 px rechts van de linkerrand van de afbeelding.
  const OL_H = 360;
  const OL_W = Math.round(OL_H * 214 / 455 * 10) / 10;
  const img = (cls) => `<image class="${cls}" href="/assets/img/oldehove-silhouet.png" x="${(OL_PIVOT_X - 157.7).toFixed(1)}" y="${440 - OL_H}" width="${OL_W}" height="${OL_H}" preserveAspectRatio="xMidYMax meet"/>`;
  // Beginstand (ook zonder JavaScript): meting op 39 m, ware hoek.
  const h0 = OL_HEIGHT_M;
  const y0 = 440 - h0 * OL_PX_PER_M;
  const x0 = OL_PIVOT_X + h0 * OL_PX_PER_M * Math.tan(OL_DEG * Math.PI / 180);
  const rows = OL_HEIGHTS.map((h) => `<tr><th scope="row">${h} m</th><td>${nl(olOffset(h), 2)} m</td><td>${nl(OL_DEG)}°</td></tr>`).join('');
  return `
<figure class="sim sim-oldehove" data-sim="oldehove" data-deg="${OL_DEG}" data-px="${OL_PX_PER_M}" data-lean="${OL_IMG_LEAN}" data-pivot="${OL_PIVOT_X}" aria-labelledby="sim-ol-title">
  <div class="sim-head">
    <span class="sim-badge">Interactieve demonstratie · Leeuwarden</span>
    <h3 id="sim-ol-title">Meet zelf: loodmeting op de Oldehove (4,2° uit het lood)</h3>
    <p class="sim-instruction">De Oldehove staat circa 4,2 graden uit het lood. Kies een meethoogte en zie hoe ver de rechtergevel van de toren daar van de zuiver verticale loodlijn af staat. Uit die afwijking en de hoogte bereken je de scheefstand – precies zoals bij een loodmeting.</p>
  </div>
  <div class="sim-lood-grid">
    <div class="sim-stage sim-stage-lood">
      <svg class="sim-drawing" viewBox="0 0 420 480" role="img" aria-label="Silhouet van de Oldehove; de rechtergevel staat 4,2 graden uit het lood. Een verticale loodlijn loopt vanaf de voet van die gevel omhoog, met een meetlijn op de gekozen hoogte">
        <rect x="0" y="440" width="420" height="40" fill="#cfd8df"/>
        <g class="ol-ghost" data-ol-ghost transform="rotate(${-OL_IMG_LEAN} ${OL_PIVOT_X} 440)">${img('ol-img-ghost')}</g>
        <g data-ol-tower transform="rotate(${(OL_DEG - OL_IMG_LEAN).toFixed(2)} ${OL_PIVOT_X} 440)">${img('ol-img')}</g>
        <line class="sim-plumb" x1="${OL_PIVOT_X}" y1="96" x2="${OL_PIVOT_X}" y2="440"/>
        <circle cx="${OL_PIVOT_X}" cy="96" r="5" class="sim-plumb-top"/>
        <text x="${OL_PIVOT_X - 6}" y="88" class="sim-ref-label" text-anchor="end">loodlijn</text>
        <g class="ol-height" data-ol-hdim>
          <line class="ol-dim" data-ol-hline x1="60" y1="440" x2="60" y2="${y0.toFixed(1)}"/>
          <line class="ol-dim" data-ol-htick x1="52" y1="${y0.toFixed(1)}" x2="68" y2="${y0.toFixed(1)}"/>
          <line class="ol-dim" x1="52" y1="440" x2="68" y2="440"/>
          <text class="ol-dim-label" data-ol-hlabel x="50" y="${((440 + y0) / 2).toFixed(1)}" text-anchor="end">${h0} m</text>
          <line class="ol-guide" data-ol-guide x1="68" y1="${y0.toFixed(1)}" x2="${OL_PIVOT_X}" y2="${y0.toFixed(1)}"/>
        </g>
        <line class="sim-offset" data-ol-offset x1="${OL_PIVOT_X}" y1="${y0.toFixed(1)}" x2="${x0.toFixed(1)}" y2="${y0.toFixed(1)}"/>
        <circle class="ol-hit" data-ol-dot cx="${x0.toFixed(1)}" cy="${y0.toFixed(1)}" r="5"/>
        <text class="sim-offset-label" data-ol-label x="${(x0 + 10).toFixed(1)}" y="${(y0 + 5).toFixed(1)}">${nl(olOffset(h0), 2)} m</text>
        <text x="12" y="468" class="sim-small-label">Silhouet van de Oldehove (Leeuwarden)</text>
      </svg>
    </div>
    <div class="sim-panel">
      <div class="sim-readout ol-readout" aria-live="polite">
        <div><span>Meethoogte</span><strong data-ol-h>${h0} m</strong></div>
        <div><span>Afwijking t.o.v. loodlijn</span><strong data-ol-d>${nl(olOffset(h0), 2)} m</strong></div>
        <div class="ol-result"><span>Berekende scheefstand</span><strong data-ol-angle>${nl(OL_DEG)}°</strong></div>
      </div>
      <p class="ol-formula" data-ol-formula>Scheefstand = arctan(afwijking ÷ hoogte) = arctan(${nl(olOffset(h0), 2)} ÷ ${h0}) ≈ ${nl(OL_DEG)}°</p>
      <label class="sim-slider-label" for="sim-ol-range">Meethoogte boven de voet van de toren</label>
      <input id="sim-ol-range" class="sim-range sim-range-neutral" type="range" min="1" max="${OL_HEIGHT_M}" step="1" value="${h0}" data-ol-range aria-describedby="sim-ol-scale">
      <div class="sim-scale" id="sim-ol-scale"><span>1 m</span><span>${OL_HEIGHT_M} m (top)</span></div>
      <div class="sim-presets" role="group" aria-label="Meethoogtes">
        ${OL_HEIGHTS.map((h) => `<button type="button" class="sim-chip" data-ol-set="${h}" aria-pressed="${h === h0}">${h} m</button>`).join('\n        ')}
      </div>
      <div class="sim-actions">
        <button type="button" class="btn btn-gold" data-ol-log>Leg meetpunt vast</button>
        <button type="button" class="btn btn-ghost-dark" data-ol-reset>Opnieuw</button>
      </div>
      <label class="ol-toggle"><input type="checkbox" data-ol-exag> Overdrijf de kanteling ×3 in de tekening (de meetwaarden blijven gelijk)</label>
      <label class="ol-toggle"><input type="checkbox" data-ol-ghost-toggle checked> Toon de toren rechtop ter vergelijking</label>
      <ol class="ol-log" data-ol-loglist aria-label="Vastgelegde meetpunten"></ol>
      <div class="sim-explain-item"><strong>Wat zie je?</strong><p data-ol-explain>Hoe hoger je meet, hoe groter de afwijking ten opzichte van de loodlijn. De berekende hoek blijft steeds circa 4,2°: de toren staat als geheel scheef. Bij een gevel die bol staat of een knik heeft, zou de hoek per meethoogte juist verschillen.</p></div>
    </div>
  </div>
  <details class="sim-data">
    <summary>Bekijk de meetwaarden per hoogte</summary>
    <table class="data-table"><thead><tr><th>Meethoogte</th><th>Afwijking t.o.v. loodlijn</th><th>Berekende scheefstand</th></tr></thead><tbody>${rows}</tbody></table>
  </details>
  <figcaption class="sim-caption">De simulatie gaat uit van de gepubliceerde scheefstand van circa 4,2° en een hoogte van circa 39 meter; de afwijkingen zijn daaruit berekend en zijn geen eigen meting van MV Funderingsscan. Bij een woning werkt een loodmeting hetzelfde, maar gaat het om millimeters over de hoogte van een gevel. ${SIM_NOTE}</figcaption>
</figure>`;
}

// ================================================================ 3a. scheuren in een gevel
const CRACKS = [
  ['verticaal', 'Verticale scheur', 'M732 92 l4 22 l-5 18 l6 24 l-4 20 l5 26 l-3 22', [736, 84],
    'Een verticale scheur loopt (vrijwel) recht van boven naar beneden. Zo\'n scheur ontstaat vaak op plekken waar materialen werken door temperatuur of krimp, bijvoorbeeld in lange gevels zonder dilatatie, maar kan ook wijzen op een plaatselijk verschil in zakking.'],
  ['horizontaal', 'Horizontale scheur', 'M512 282 h34 l4 3 h40 l3 -3 h44 l3 2 h40', [500, 270],
    'Een horizontale scheur volgt meestal een voeg. Mogelijke oorzaken zijn onder meer uitzetting van het metselwerk, roestend ijzerwerk of een verschil in belasting. Juist bij horizontale scheuren kijkt een onderzoeker naar de lengte en of de gevel op die plek uitbuigt.'],
  ['diagonaal', 'Diagonale scheur', 'M250 432 l14 -18 l6 -16 l16 -14 l8 -20 l16 -16 l10 -22 l14 -14', [244, 412],
    'Een diagonale scheur kan verschillende oorzaken hebben. De richting, locatie, breedte, ouderdom en ontwikkeling van de scheur zijn belangrijk bij de beoordeling. Diagonale scheuren die naar een hoek van de woning wijzen, kunnen passen bij ongelijke zetting – maar dat is pas vast te stellen in samenhang met andere waarnemingen.'],
  ['trapvormig', 'Trapvormige scheur in het metselwerk', 'M500 436 h20 v-10 h24 v-10 h24 v-10 h24 v-10 h24 v-10 h24 v-10', [496, 414],
    'Een trapvormige scheur loopt langs de stoot- en lintvoegen, als een trap door het metselwerk. Dit patroon wordt vaak in verband gebracht met beweging in de constructie, zoals ongelijke zetting, maar kan ook ontstaan door krimp of werking rond openingen.'],
  ['raamhoek', 'Scheur vanuit een raamhoek', 'M450 180 l12 10 l6 14 l14 10 l6 16 l12 12', [440, 208],
    'Hoeken van ramen en deuren zijn zwakke plekken in het metselwerk: daar komen spanningen samen. Een scheur die vanuit een hoek schuin wegloopt kan door werking van materialen of door vervorming van de gevel ontstaan.'],
  ['boven-kozijn', 'Scheur boven een kozijn', 'M150 86 l3 -10 l-2 -10 l4 -10 l-3 -10', [176, 62],
    'Een scheur direct boven een kozijn wijst vaak op de constructie boven de opening, zoals een latei of rollaag. Een roestende stalen latei kan het metselwerk omhoog drukken; ook doorbuiging speelt mee. Een funderingsprobleem is daarbij één van de mogelijke, maar niet de enige verklaring.'],
  ['breed-onderin', 'Bredere scheur onderin de gevel', 'M700 440 l6 -14 l-3 -14 l7 -16 l-2 -16', [726, 420],
    'Een bredere scheur onderin de gevel, vlak boven het maaiveld, krijgt in een onderzoek extra aandacht omdat ze dicht bij de fundering ligt. Toch kan ook hier een andere oorzaak spelen, zoals vocht, vorst of een aanbouw met een eigen fundering.'],
  ['parallel', 'Meerdere parallelle scheuren', 'M238 122 l24 34 M260 114 l24 34 M282 106 l24 34', [300, 176],
    'Meerdere scheuren in dezelfde richting dicht bij elkaar vormen samen een patroon. Een onderzoeker kijkt dan niet naar één scheur, maar naar het geheel: waar ligt het patroon, in welke richting lopen de scheuren en worden ze breder.'],
];

function scheurenWidget() {
  const cracks = CRACKS.map(([id, label, d, [bx, by]], i) => `
        <g class="crack" data-crack="${id}" role="button" tabindex="0" aria-pressed="false" aria-label="${label}">
          <path class="crack-hit" d="${d}"/>
          <path class="crack-line${id === 'breed-onderin' ? ' crack-wide' : ''}" d="${d}"/>
          <circle class="crack-badge" cx="${bx}" cy="${by}" r="13"/>
          <text class="crack-num" x="${bx}" y="${by + 5}" text-anchor="middle">${i + 1}</text>
        </g>`).join('');
  const panels = CRACKS.map(([id, label, , , text], i) => `
      <div class="crack-info" data-crack-panel="${id}">
        <span class="sim-badge">Scheur ${i + 1}</span>
        <h4>${label}</h4>
        <p>${text}</p>
      </div>`).join('');
  return `
<figure class="sim sim-scheuren" data-sim="scheuren" aria-labelledby="sim-sc-title">
  <div class="sim-head">
    <span class="sim-badge">Interactieve demonstratie</span>
    <h3 id="sim-sc-title">Klik op een scheur en lees waar een onderzoeker op let</h3>
    <p class="sim-instruction">In deze gevel zijn acht soorten scheuren getekend. Klik of tik op een scheur (of gebruik Tab en Enter) voor uitleg.</p>
  </div>
  <div class="sim-sc-grid">
    <div class="sim-stage">
      <svg class="sim-drawing" viewBox="0 0 800 460" aria-label="Illustratie van een woninggevel met acht klikbare scheuren">
        <defs>
          <pattern id="sc-bricks" width="48" height="20" patternUnits="userSpaceOnUse">
            <rect width="48" height="20" fill="#b06a4a"/>
            <path d="M0 0.5H48M0 10.5H48M0.5 0V10M24.5 10V20" stroke="#ead7c4" stroke-width="1.2"/>
          </pattern>
        </defs>
        <rect x="40" y="40" width="720" height="400" fill="url(#sc-bricks)"/>
        <rect x="30" y="20" width="740" height="22" fill="#2f3d4d"/>
        <g fill="#e3ebf1" stroke="#f6f1e6" stroke-width="6">
          <rect x="90" y="90" width="130" height="100"/><rect x="330" y="80" width="120" height="100"/><rect x="560" y="90" width="130" height="100"/>
          <rect x="100" y="260" width="120" height="100"/>
        </g>
        <path d="M84 88 h142 M324 78 h132 M554 88 h142" stroke="#f6f1e6" stroke-width="8"/>
        <rect x="380" y="320" width="90" height="120" fill="#102945" stroke="#f6f1e6" stroke-width="6"/>
        <line x1="20" y1="444" x2="780" y2="444" stroke="#7a8a99" stroke-width="4"/>
        ${cracks}
      </svg>
    </div>
    <div class="crack-panel" aria-live="polite">
      <div class="crack-info crack-info-start" data-crack-panel="start">
        <strong>Kies een scheur</strong>
        <p>Een scheur betekent niet automatisch dat er een funderingsprobleem is. Mogelijke oorzaken zijn onder andere werking van materialen, droog- of krimpscheuren, zetting, ongelijke belasting, constructieve beweging en funderingsgerelateerde beweging.</p>
      </div>${panels}
    </div>
  </div>
  <figcaption class="sim-caption">Educatieve illustratie: de scheuren zijn schematisch getekend en zeggen niets over een bestaande woning. ${SIM_NOTE}</figcaption>
</figure>
${scheurPatronen()}`;
}

const PATRONEN = [
  ['Losse scheur', 'Eén enkele scheur, zonder andere signalen in de buurt.',
    ['krimp of droging van metselwerk of pleisterwerk', 'temperatuurwerking', 'een plaatselijke spanning, bijvoorbeeld rond een opening'],
    'Breedte, lengte, of de scheur oud of nieuw is en of ze groeit. Een losse, stabiele haarscheur is vaak onschuldig.',
    '<a href="/kennisbank/monitoring-scheuren/">De scheur een tijd volgen</a>; meestal is meten niet direct nodig.'],
  ['Meerdere scheuren', 'Verschillende scheuren verspreid over de gevel of de woning.',
    ['ongelijke zetting', 'werking van een grote gevel zonder dilatatie', 'een combinatie van oorzaken'],
    'Of de scheuren samen een richting of zone aanwijzen, en of er ook scheefstand of klemmende deuren zijn.',
    'Een <a href="/fase-0-funderingsonderzoek/">Quick Scan (fase 0)</a>; bij een duidelijk patroon eventueel een <a href="/kennisbank/lintvoegwaterpassing/">lintvoegwaterpassing</a>.'],
  ['Trapvormig patroon', 'Scheuren die trapsgewijs langs de voegen door het metselwerk lopen.',
    ['ongelijke zetting van een deel van de gevel', 'vervorming van de constructie', 'krimp rond openingen'],
    'De richting van de trap: wijst die naar een hoek of naar het midden van de gevel? En is het patroon aan beide zijden van de woning zichtbaar?',
    'Een <a href="/kennisbank/lintvoegwaterpassing/">lintvoegwaterpassing</a> om hoogteverschillen in dezelfde gevel te vergelijken.'],
  ['Gevelscheuren rond kozijnen', 'Scheuren die vanuit hoeken van ramen en deuren of direct boven kozijnen ontstaan.',
    ['een roestende stalen latei', 'doorbuiging boven een opening', 'spanningsconcentratie in hoeken', 'vervorming van de gevel'],
    'Of het om één opening gaat of om meerdere, en of kozijnen ook klemmen of scheef staan.',
    'Inspectie van lateien en kozijnen; bij scheefstand een <a href="/kennisbank/loodmeting/">loodmeting</a>.'],
  ['Verticale scheuren', 'Rechte scheuren van boven naar beneden.',
    ['uitzetting en krimp in lange gevels', 'een overgang tussen twee bouwdelen', 'een plaatselijk verschil in zakking'],
    'Of de scheur boven breder is dan onder (of andersom) en of hij op de aansluiting van een aanbouw ligt.',
    'Bij een aanbouw: lees <a href="/kennisbank/scheuren-bij-aanbouw/">scheuren bij een aanbouw</a>; bij twijfel een <a href="/quickscan-fundering/">quickscan fundering</a>.'],
];

function scheurPatronen() {
  return `
<div class="sim sim-patronen" data-sim="patronen">
  <div class="sim-head">
    <span class="sim-badge">Scheurpatronen</span>
    <h3>Vijf patronen en hoe een onderzoeker ze bekijkt</h3>
  </div>
  <div class="tabs">
${PATRONEN.map(([name, desc, causes, look, measure]) => `    <section class="tab-panel" data-tab="${name}">
      <h4>${name}</h4>
      <p>${desc}</p>
      <div class="two-col-list">
        <div><h5>Mogelijke oorzaken</h5><ul class="checklist">${causes.map((c) => `<li>${c}</li>`).join('')}</ul></div>
        <div><h5>Waar een onderzoeker op let</h5><p>${look}</p><h5>Mogelijk relevante vervolgstap</h5><p>${measure}</p></div>
      </div>
    </section>`).join('\n')}
  </div>
</div>`;
}

// ================================================================ 3b. scheuranalyse-keuzehulp
const SCHEURKEUZE = [
  ['een', 'Ik zie één kleine scheur', 'Eén kleine scheur heeft vaak een onschuldige oorzaak, zoals krimp of temperatuurwerking. Leg de scheur vast met een foto met liniaal en kijk na een paar maanden of hij groeit. Twijfel je, of zie je ook andere signalen, dan kan een Quick Scan meer duidelijkheid geven.'],
  ['meerdere', 'Ik zie meerdere scheuren', 'Bij meerdere of terugkerende scheuren kan het verstandig zijn om niet alleen naar de scheur zelf te kijken, maar ook naar het patroon en mogelijke beweging van de constructie.'],
  ['diagonaal', 'Ik zie diagonale scheuren', 'Diagonale scheuren worden vaak in verband gebracht met ongelijke zetting, maar ook vervorming rond openingen kan een rol spelen. De richting van de scheuren en de plek in de gevel zijn belangrijk om te bepalen of nader onderzoek zinvol is.'],
  ['kozijnen', 'De scheuren zitten vooral bij kozijnen', 'Scheuren bij kozijnen hebben vaak met de constructie boven de opening te maken, zoals een latei. Klemmen ramen of deuren ook, of zie je scheefstand, dan is het verstandig om breder te laten kijken.'],
  ['trap', 'De scheuren lopen trapvormig door het metselwerk', 'Een trapvormig patroon kan passen bij beweging van (een deel van) de gevel. Dit patroon kan aanleiding zijn om nader te onderzoeken wat de oorzaak is, bijvoorbeeld met een lintvoegwaterpassing in fase 1.'],
  ['beweging', 'Ik zie ook verzakking of scheefstand', 'Scheuren in combinatie met verzakking of scheefstand zijn een reden om de woning als geheel te laten beoordelen. Een Quick Scan (fase 0) brengt in kaart of metingen in fase 1 zinvol zijn.'],
];

function scheurkeuzeWidget() {
  const buttons = SCHEURKEUZE.map(([k, label]) => `<button type="button" class="sim-choice" data-keuze="${k}" aria-pressed="false" aria-controls="sk-${k}">${label}</button>`).join('\n      ');
  const panels = SCHEURKEUZE.map(([k, label, text]) => `
    <div class="sim-choice-result" id="sk-${k}" data-keuze-panel="${k}">
      <span class="sim-badge">Informatieve route</span>
      <h4>${label}</h4>
      <p>${text}</p>
      <div class="sim-choice-actions">
        <a class="btn btn-gold" href="/funderingsscan/">Bekijk wat een funderingsscan inhoudt <span aria-hidden="true">→</span></a>
        <a class="btn btn-ghost-dark" href="/fase-0-funderingsonderzoek/">Bekijk fase 0 funderingsonderzoek</a>
      </div>
    </div>`).join('');
  return `
<div class="sim sim-keuze" data-sim="keuze">
  <div class="sim-head">
    <span class="sim-badge">Scheuranalyse</span>
    <h3>Wat zie je aan de woning?</h3>
    <p class="sim-instruction">Kies wat het meest op jouw situatie lijkt. Je krijgt een informatieve route, geen diagnose.</p>
  </div>
  <div class="sim-choices" role="group" aria-label="Wat zie je aan de woning?">
      ${buttons}
  </div>${panels}
  <p class="sim-caption">${SIM_NOTE} Alleen onderzoek ter plaatse laat zien wat de oorzaak van scheuren is.</p>
</div>`;
}

// ================================================================ 4. vloerveldwaterpassing
// 5 x 5 raster voorbeeldwaarden (cm) ten opzichte van een referentiepunt; rijen A–E, kolommen 1–5.
const VV = [
  [100.0, 99.9, 99.9, 99.8, 99.7],
  [99.9, 99.8, 99.8, 99.7, 99.6],
  [99.8, 99.8, 99.7, 99.6, 99.5],
  [99.8, 99.7, 99.6, 99.5, 99.4],
  [99.7, 99.6, 99.5, 99.4, 99.3],
];
const ROWS = ['A', 'B', 'C', 'D', 'E'];

function vloerveldWidget() {
  const cells = VV.flatMap((row, r) => row.map((h, c) => `<button type="button" class="vv-cell" data-r="${r}" data-c="${c}" data-h="${h}" aria-pressed="false" aria-label="Meetpunt ${ROWS[r]}${c + 1}"><span class="vv-id">${ROWS[r]}${c + 1}</span><span class="vv-val">${nl(h)}</span></button>`)).join('');
  const table = VV.map((row, r) => `<tr><th scope="row">${ROWS[r]}</th>${row.map((h) => `<td>${nl(h)}</td>`).join('')}</tr>`).join('');
  return `
<figure class="sim sim-vloerveld" data-sim="vloerveld" aria-labelledby="sim-vv-title">
  <div class="sim-head">
    <span class="sim-badge">Interactieve demonstratie</span>
    <h3 id="sim-vv-title">Meet zelf: vloerveldwaterpassing in een woonkamer</h3>
    <p class="sim-instruction">Je kijkt van bovenaf op een vloer met een raster van 25 meetpunten. Tik op meetpunten om hun hoogte te zien, of meet het hele veld in één keer.</p>
  </div>
  <div class="sim-vv-grid">
    <div class="vv-floor-wrap">
      <div class="vv-floor" data-vv-floor role="group" aria-label="Meetraster vloer, rijen A tot en met E, kolommen 1 tot en met 5">${cells}</div>
      <div class="vv-legend" aria-hidden="true"><span>hoog</span><i></i><span>laag</span></div>
    </div>
    <div class="sim-panel">
      <div class="sim-readout" aria-live="polite">
        <p class="sim-status" data-vv-status>Nog geen meetpunten gemeten.</p>
      </div>
      <div class="sim-result sim-result-light" data-vv-result hidden>
        <div><span>Hoogste punt</span><strong data-vv-max>–</strong></div>
        <div><span>Laagste punt</span><strong data-vv-min>–</strong></div>
        <div class="sim-result-diff"><span>Hoogteverschil tussen hoogste en laagste meetpunt</span><strong data-vv-diff>–</strong></div>
      </div>
      <div class="sim-actions">
        <button type="button" class="btn btn-gold" data-vv-all>Meet het hele vloerveld</button>
        <button type="button" class="btn btn-ghost-dark" data-vv-reset>Opnieuw</button>
      </div>
      <div class="vv-section">
        <p class="sim-profile-title">Doorsnede van de vloer</p>
        <div class="sim-presets" role="group" aria-label="Kies een doorsnede">
          ${ROWS.map((r, i) => `<button type="button" class="sim-chip" data-vv-row="${i}" aria-pressed="${i === 2}">Rij ${r}</button>`).join('')}
        </div>
        <svg class="vv-profile" data-vv-profile viewBox="0 0 400 170" role="img" aria-label="Doorsnede van de gekozen rij meetpunten"></svg>
      </div>
    </div>
  </div>
  <details class="sim-data">
    <summary>Bekijk alle voorbeeldwaarden (cm)</summary>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Rij</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead><tbody>${table}</tbody></table></div>
  </details>
  <figcaption class="sim-caption">Educatieve simulatie met voorbeeldwaarden. Een vloer hoeft niet overal exact even hoog te zijn: afwerklagen, de vloerconstructie zelf en bouwtoleranties spelen mee. ${SIM_NOTE}</figcaption>
</figure>`;
}

// ================================================================ 5. keuzehulp: welke meting past bij mijn situatie?
const KEUZES = [
  ['scheuren', 'A · Ik zie scheuren in de gevel', ['visuele inspectie van de woning', 'scheurpatroon beoordelen', 'eventueel een lintvoegwaterpassing', 'eventueel een loodmeting', 'eventueel fase 1 funderingsonderzoek'],
    'Bij scheuren begint het met kijken: waar zitten ze, hoe lopen ze en groeien ze? Pas als het patroon daar aanleiding voor geeft, volgen metingen.',
    [['/scheuren-in-gevel/', 'Lees hoe scheuren in gevels beoordeeld worden'], ['/kennisbank/scheurpatronen/', 'Wat scheurpatronen vertellen']]],
  ['scheef', 'B · De woning lijkt scheef te staan', ['loodmeting van gevels of wanden', 'aanvullende beoordeling in samenhang met scheuren en hoogteverschillen'],
    'Een loodmeting maakt de mate en richting van scheefstand inzichtelijk. Oudere gevels zijn niet altijd te lood gebouwd; daarom wordt de afwijking altijd in samenhang beoordeeld.',
    [['/kennisbank/loodmeting/', 'Lees wat een loodmeting meet'], ['/scheefstand-woning/', 'Scheefstand van een woning']]],
  ['vloer', 'C · De vloer lijkt af te lopen', ['vloerveldwaterpassing', 'beoordeling van de vloerconstructie en eventuele zetting'],
    'Met een vloerveldwaterpassing wordt het verloop van de vloer in een raster vastgelegd. Een hellende vloer kan ook door de vloerconstructie zelf komen.',
    [['/kennisbank/vloerveldwaterpassing/', 'Lees hoe een vloerveldwaterpassing werkt'], ['/kennisbank/helling-in-vloer/', 'Helling in de vloer']]],
  ['hoogte', 'D · Ik zie hoogteverschillen in de gevel', ['lintvoegwaterpassing', 'eventueel aangevuld met een loodmeting'],
    'Hoogteverschillen in de gevel worden vastgelegd met een lintvoegwaterpassing langs een doorlopende metselvoeg. Het verloop zegt meer dan één los punt.',
    [['/kennisbank/lintvoegwaterpassing/', 'Lees wat een lintvoegwaterpassing meet'], ['/verzakking-woning/', 'Verzakking van een woning']]],
  ['risico', 'E · Ik wil weten of mijn woning funderingsrisico heeft', ['fase 0 / quickscan fundering', 'pas bij een verhoogd risico: fase 1 met metingen'],
    'Wil je weten of er aanwijzingen zijn voor een funderingsrisico, dan is de Quick Scan vaak een goede eerste stap: archief- en bodemonderzoek plus een inspectie, met advies over de vervolgstap.',
    [['/fase-0-funderingsonderzoek/', 'Bekijk wat fase 0 funderingsonderzoek inhoudt'], ['/quickscan-fundering/', 'Quickscan fundering']]],
];

function keuzeWidget() {
  const buttons = KEUZES.map(([k, label]) => `<button type="button" class="sim-choice" data-keuze="${k}" aria-pressed="false" aria-controls="keuze-${k}">${label}</button>`).join('\n      ');
  const panels = KEUZES.map(([k, label, route, text, links]) => `
    <div class="sim-choice-result" id="keuze-${k}" data-keuze-panel="${k}">
      <span class="sim-badge">Mogelijke onderzoeksroute</span>
      <h4>${label.replace(/^[A-E] · /, '')}</h4>
      <p>${text}</p>
      <ol class="route-list">${route.map((r) => `<li>${r}</li>`).join('')}</ol>
      <div class="sim-choice-actions">
        <a class="btn btn-gold" href="${links[0][0]}">${links[0][1]} <span aria-hidden="true">→</span></a>
        <a class="btn btn-ghost-dark" href="${links[1][0]}">${links[1][1]}</a>
      </div>
    </div>`).join('');
  return `
<div class="sim sim-keuze" data-sim="keuze">
  <div class="sim-head">
    <span class="sim-badge">Keuzehulp</span>
    <h3>Kies je situatie</h3>
    <p class="sim-instruction">Je ziet direct welke onderzoeksstappen logisch kunnen zijn. Dit is een informatieve route, geen technische diagnose.</p>
  </div>
  <div class="sim-choices" role="group" aria-label="Kies je situatie">
      ${buttons}
  </div>${panels}
  <p class="sim-caption">Algemene indicatie. Alleen onderzoek ter plaatse laat zien wat er met jouw woning aan de hand is.</p>
</div>`;
}

const WIDGETS = {
  lintvoeg: lintvoegWidget, lood: loodWidget, oldehove: oldehoveWidget, scheuren: scheurenWidget,
  scheurkeuze: scheurkeuzeWidget, vloerveld: vloerveldWidget, keuze: keuzeWidget,
};
export const WIDGET_NAMES = Object.keys(WIDGETS);

export function widgetHtml(name) {
  if (!name) return '';
  const fn = WIDGETS[name];
  if (!fn) throw new Error(`Onbekende widget: ${name}`);
  return fn();
}
