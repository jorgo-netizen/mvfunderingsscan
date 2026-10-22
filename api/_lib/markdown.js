/**
 * Veilige, beperkte Markdown voor nieuwsberichten. Er wordt GEEN HTML opgeslagen of doorgelaten:
 * alle tekst wordt ge-escaped en alleen deze opmaak wordt omgezet:
 *   ## Tussenkop   ### Kleinere kop   - opsomming   1. genummerde lijst   > citaat
 *   **vet**   *cursief*   [linktekst](https://… | /pagina/ | mailto:…)
 * Links naar andere sites krijgen rel="noopener noreferrer nofollow".
 */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function safeHref(raw) {
  const href = String(raw).trim();
  if (/^\/(?!\/)[\w\-./#?=&%]*$/.test(href)) return { href, external: false };
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(href)) return { href, external: false };
  try {
    const u = new URL(href);
    if (u.protocol === 'https:' || u.protocol === 'http:') {
      const internal = /(^|\.)mvfunderingsscan\.nl$/i.test(u.hostname);
      return { href: u.href, external: !internal };
    }
  } catch { /* ongeldig */ }
  return null;
}

/** Inline opmaak op al ge-escapete tekst. */
function inline(text) {
  let s = esc(text);
  // links: [tekst](url) – de url is ge-escaped; terugzetten van &amp; voor de URL-parser
  s = s.replace(/\[([^\]\n]{1,200})\]\(([^)\s]{1,500})\)/g, (m, label, url) => {
    const h = safeHref(url.replace(/&amp;/g, '&'));
    if (!h) return label;
    return `<a href="${esc(h.href)}"${h.external ? ' rel="noopener noreferrer nofollow"' : ''}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  return s;
}

export function renderMarkdown(src) {
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  const out = []; let para = []; let list = null; let quote = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; } };
  const flushQuote = () => { if (quote.length) { out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`); quote = []; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };
  const headings = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flushAll(); continue; }
    if ((m = line.match(/^(#{2,3})\s+(.{1,160})$/))) {
      flushAll();
      const level = m[1].length; const text = m[2].trim();
      const id = slugify(text).slice(0, 60) || `kop-${headings.length + 1}`;
      headings.push({ level, text, id });
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      continue;
    }
    if ((m = line.match(/^\s*[-*]\s+(.+)$/))) {
      flushPara(); flushQuote();
      if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; }
      list.items.push(m[1]); continue;
    }
    if ((m = line.match(/^\s*\d{1,3}[.)]\s+(.+)$/))) {
      flushPara(); flushQuote();
      if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; }
      list.items.push(m[1]); continue;
    }
    if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); continue; }
    flushList(); flushQuote();
    para.push(line.trim());
  }
  flushAll();
  return { html: out.join('\n'), headings };
}

/** Platte tekst (voor meta description en woordentelling). */
export function plainText(src) {
  return String(src || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#>*_`]/g, '').replace(/\s+/g, ' ').trim();
}

export function slugify(s) {
  return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' en ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90).replace(/-+$/g, '');
}
export const isSlug = (s) => typeof s === 'string' && s.length <= 90 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
