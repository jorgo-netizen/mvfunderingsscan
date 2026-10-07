/**
 * Formulieren en de interactieve funderingscheck.
 * Alle formulieren zijn voorlopig demo's (geen verzending); zie public/script.js (TODO).
 */
import { NAP } from './layout.mjs';

const field = (id, name, label, { type = 'text', required = true, auto = '', pattern = '', error = 'Vul dit veld in', full = false, inputmode = '' } = {}) => `
          <div class="field${full ? ' field-full' : ''}">
            <input id="${id}" name="${name}" type="${type}"${auto ? ` autocomplete="${auto}"` : ''}${inputmode ? ` inputmode="${inputmode}"` : ''} placeholder=" "${required ? ' required' : ''}${pattern ? ` pattern="${pattern}"` : ''}>
            <label for="${id}">${label}${required ? '' : ' <span class="opt">(optioneel)</span>'}</label>
            <span class="field-error">${error}</span>
          </div>`;

const select = (id, name, label, options, { required = false, full = false } = {}) => `
          <div class="field field-select${full ? ' field-full' : ''}">
            <label for="${id}">${label}${required ? '' : ' <span class="opt">(optioneel)</span>'}</label>
            <select id="${id}" name="${name}"${required ? ' required' : ''}>
              <option value="">Maak een keuze</option>
${options.map((o) => `              <option>${o}</option>`).join('\n')}
            </select>
            <span class="field-error">Maak een keuze</span>
          </div>`;

const pills = (name, legend, options, { full = true } = {}) => `
          <fieldset class="pill-group${full ? ' field-full' : ''}">
            <legend>${legend}</legend>
            <div class="q-options">
${options.map((o) => `              <label><input type="radio" name="${name}" value="${o}"><span>${o}</span></label>`).join('\n')}
            </div>
          </fieldset>`;

const typeOptions = `
          <fieldset class="type-select field-full">
            <legend>Waarvoor wil je onderzoek?</legend>
            <div class="type-options">
              <label><input type="radio" name="type" value="fase0" checked><span><strong>Fase 0</strong>Quick Scan</span></label>
              <label><input type="radio" name="type" value="fase1"><span><strong>Fase 1</strong>Onderzoek met metingen</span></label>
              <label><input type="radio" name="type" value="onbekend"><span><strong>Weet ik nog niet</strong>Adviseer mij</span></label>
              <label><input type="radio" name="type" value="zakelijk"><span><strong>Zakelijk</strong>Makelaar, taxateur, belegger</span></label>
            </div>
          </fieldset>`;

const privacy = (id) => `
          <div class="consent field-full">
            <input type="checkbox" id="${id}" name="privacy" required>
            <label for="${id}">Ik ga ermee akkoord dat MV Funderingsscan mijn gegevens gebruikt om contact met mij op te nemen over deze aanvraag.</label>
            <span class="field-error">Geef toestemming om je aanvraag te kunnen behandelen</span>
          </div>`;

const success = (id, title, text) => `
      <div class="form-success" id="${id}" hidden tabindex="-1" data-form-success>
        <span class="success-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg></span>
        <h3>${title}</h3>
        <p data-success-text>${text}</p>
        <div class="result-actions">
          <a class="btn btn-gold" href="/kennisbank/">Ondertussen: lees de kennisbank</a>
          <button type="button" class="btn btn-ghost-dark" data-form-reset>Nieuw formulier</button>
        </div>
      </div>`;

export const PRIVACY_TEXT = `<p class="form-privacy"><strong>Privacy:</strong> we gebruiken je gegevens alleen om je aanvraag te behandelen en contact met je op te nemen. We verkopen of verhuren je gegevens niet aan derden. Vragen hierover? Mail naar <a href="mailto:${NAP.email}">${NAP.email}</a>.</p>`;

export function aanvraagForm() {
  return `<div class="apply-card apply-card-wide reveal">
      <form id="aanvraagForm" class="js-form" novalidate data-form-name="aanvraag">
        <h2 class="form-step-title"><span>1</span>Jouw gegevens</h2>
        <div class="form-grid">${field('a-naam', 'naam', 'Naam', { auto: 'name', error: 'Vul je naam in' })}${field('a-email', 'email', 'E-mail', { type: 'email', auto: 'email', error: 'Vul een geldig e-mailadres in' })}${field('a-tel', 'telefoon', 'Telefoon', { type: 'tel', auto: 'tel', pattern: '[0-9+()\\s\\-]{10,}', error: 'Vul een geldig telefoonnummer in' })}${select('a-contact', 'contactmoment', 'Voorkeur contactmoment', ['Ochtend (09:00 – 12:00)', 'Middag (12:00 – 17:00)', 'Maakt niet uit', 'Liever per e-mail'])}
        </div>

        <h2 class="form-step-title"><span>2</span>De woning</h2>
        <div class="form-grid">${field('a-adres', 'adres', 'Straat en huisnummer', { auto: 'street-address', error: 'Vul het adres van de woning in', full: true })}${field('a-postcode', 'postcode', 'Postcode', { auto: 'postal-code', pattern: '\\s*[1-9][0-9]{3}\\s?[A-Za-z]{2}\\s*', error: 'Bijv. 8919 AA' })}${field('a-plaats', 'plaats', 'Plaats', { auto: 'address-level2', error: 'Vul de plaats in' })}${select('a-woningtype', 'woningtype', 'Type woning', ['Tussenwoning', 'Hoekwoning', 'Twee-onder-een-kap', 'Vrijstaande woning', 'Boven- of benedenwoning', 'Boerderij', 'Bedrijfspand', 'Anders'])}${field('a-bouwjaar', 'bouwjaar', 'Bouwjaar (ongeveer)', { required: false, inputmode: 'numeric' })}
        </div>

        <h2 class="form-step-title"><span>3</span>Je situatie</h2>
        <div class="form-grid">${typeOptions}${pills('situatie', 'Het gaat om', ['Een woning die ik wil kopen', 'Een woning die ik verkoop', 'Mijn eigen woning', 'Zakelijk'])}${pills('scheuren', 'Zie je scheuren in gevels of muren?', ['Ja', 'Nee', 'Weet ik niet'])}${pills('scheefstand', 'Zie je scheefstand of hellende vloeren?', ['Ja', 'Nee', 'Weet ik niet'])}${pills('klemmen', 'Klemmen er deuren of ramen?', ['Ja', 'Nee', 'Weet ik niet'])}${pills('kruipruimte', 'Is er een kruipruimte?', ['Ja, toegankelijk', 'Ja, niet toegankelijk', 'Nee', 'Weet ik niet'])}
          <div class="field field-full">
            <textarea id="a-opmerking" name="opmerking" rows="4" placeholder=" "></textarea>
            <label for="a-opmerking">Opmerking, bijv. deadline van een voorbehoud <span class="opt">(optioneel)</span></label>
          </div>${privacy('a-privacy')}
          <div class="hp-field" aria-hidden="true"><label for="a-website">Laat dit veld leeg</label><input id="a-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
        </div>
        <button class="btn btn-gold btn-lg btn-block" type="submit">Verstuur aanvraag <span aria-hidden="true">→</span></button>
        <p class="form-status" role="alert" hidden></p>
        ${PRIVACY_TEXT}
      </form>
${success('aanvraagSuccess', 'Bedankt voor je aanvraag!', 'We nemen zo snel mogelijk contact met je op om je situatie te bespreken en je te laten weten wat het onderzoek kost.')}
    </div>`;
}

export function contactForm() {
  return `<div class="apply-card reveal">
      <form id="contactForm" class="js-form" novalidate data-form-name="contact">
        <div class="form-grid">${field('c-naam', 'naam', 'Naam', { auto: 'name', error: 'Vul je naam in' })}${field('c-email', 'email', 'E-mail', { type: 'email', auto: 'email', error: 'Vul een geldig e-mailadres in' })}${field('c-tel', 'telefoon', 'Telefoon', { type: 'tel', auto: 'tel', required: false })}${field('c-plaats', 'plaats', 'Plaats van de woning', { required: false })}${select('c-onderwerp', 'onderwerp', 'Onderwerp', ['Vraag over een funderingsscan', 'Welke fase heb ik nodig?', 'Prijs of planning', 'Zakelijke samenwerking', 'Iets anders'], { required: true, full: true })}
          <div class="field field-full">
            <textarea id="c-vraag" name="vraag" rows="5" placeholder=" " required></textarea>
            <label for="c-vraag">Je vraag</label>
            <span class="field-error">Vul je vraag in</span>
          </div>${privacy('c-privacy')}
          <div class="hp-field" aria-hidden="true"><label for="c-website">Laat dit veld leeg</label><input id="c-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
        </div>
        <button class="btn btn-gold btn-lg btn-block" type="submit">Verstuur je vraag <span aria-hidden="true">→</span></button>
        <p class="form-status" role="alert" hidden></p>
        ${PRIVACY_TEXT}
      </form>
${success('contactSuccess', 'Bedankt voor je bericht!', 'We nemen zo snel mogelijk contact met je op.')}
    </div>`;
}

// ---------------------------------------------------------------- funderingscheck
export const CHECK_QUESTIONS = [
  ['q1', 'Is de woning ouder dan circa 1970?', 1, true],
  ['q2', 'Zie je scheuren in gevels of muren?', 2, true],
  ['q3', 'Zijn deuren of ramen gaan klemmen?', 1.5, true],
  ['q4', 'Zie je scheefstand in gevels of kozijnen?', 2, true],
  ['q5', 'Zijn vloeren ongelijk of hellend?', 1.5, true],
  ['q6', 'Heeft de woning een kruipruimte?', 0.5, true],
  ['q7', 'Ga je de woning kopen?', 1, false],
  ['q8', 'Ga je de woning verkopen?', 1, false],
];

export function checkForm() {
  const qs = CHECK_QUESTIONS.map(([name, q, w, unknown], i) => `        <fieldset class="q" data-weight="${w}">
          <legend><span>${i + 1}</span>${q}</legend>
          <div class="q-options">
            <label><input type="radio" name="${name}" value="yes"><span>Ja</span></label>
            <label><input type="radio" name="${name}" value="no"><span>Nee</span></label>${unknown ? `
            <label><input type="radio" name="${name}" value="unknown"><span>Weet ik niet</span></label>` : ''}
          </div>
        </fieldset>`).join('\n');
  return `<div class="check-wrap check-wrap-page reveal">
      <div class="check-intro">
        <p class="eyebrow">Funderingscheck · 8 vragen</p>
        <h2 class="section-title" id="check-title">Doe de check</h2>
        <p>Beantwoord de vragen. Na de laatste vraag zie je direct een indicatie.</p>
        <div class="check-progress" aria-hidden="true"><span id="checkBar"></span></div>
        <p class="check-count" id="checkCount">0 van ${CHECK_QUESTIONS.length} vragen beantwoord</p>
        <div class="callout callout-warn"><strong>Let op</strong><p>Deze online check is geen technisch oordeel en vervangt geen funderingsonderzoek.</p></div>
      </div>
      <form class="check-form" id="checkForm" novalidate>
${qs}
        <div class="check-result" id="checkResult" role="status" aria-live="polite" hidden>
          <span class="result-label" id="resultLabel"></span>
          <h3 id="resultTitle"></h3>
          <p id="resultText"></p>
          <div class="result-actions">
            <a class="btn btn-gold" href="/contact/" id="resultCta" data-type="onbekend">Bespreek je situatie <span aria-hidden="true">→</span></a>
            <button type="button" class="btn btn-ghost-dark" id="checkReset">Opnieuw beginnen</button>
          </div>
          <p class="disclaimer">Deze online check is geen technisch oordeel en vervangt geen funderingsonderzoek.</p>
        </div>
      </form>
    </div>`;
}
