// Builds a re-typeset PDF of the 1996 thesis from the marker text.
//   node build.mjs            -> dist/index.html and dist/thesis-2026-edition.pdf
//   node build.mjs --html     -> HTML only (fast; open dist/index.html to inspect)
// Pipeline: marker markdown -> cleanup -> marked + KaTeX -> hyphenation -> Paged.js layout in headless Chrome -> PDF.
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { marked } from 'marked';
import katex from 'katex';
import hyphenEnGb from 'hyphen/en-gb/index.js';
const { hyphenateHTMLSync } = hyphenEnGb;
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const dist = join(here, 'dist');
const htmlOnly = process.argv.includes('--html');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const stats = { mathOk: 0, mathBad: [], figures: 0, captions: 0, listFixes: 0 };

// ---------------------------------------------------------------- 1. read and split into pages
const raw = readFileSync(join(repo, 'src/film/data/thesis-text/thesis.md'), 'utf8');
const parts = raw.split(/^\{(\d+)\}-+\s*$/m);
const pages = [];
for (let i = 1; i < parts.length; i += 2) pages.push({ pdf: Number(parts[i]) + 1, text: parts[i + 1] ?? '' });

// logged corrections to obvious machine-conversion errors (edition/corrections.json); source errors are left as printed
const corrections = JSON.parse(readFileSync(join(here, 'corrections.json'), 'utf8'));
let applied = 0;
for (const c of corrections) {
  const p = pages.find((x) => x.pdf === c.pdfPage);
  if (p && p.text.includes(c.find)) { p.text = p.text.replace(c.find, c.replace); applied++; }
  else console.log(`correction not applied (text not found on PDF page ${c.pdfPage}): ${c.reason.slice(0, 60)}`);
}
console.log(`${applied}/${corrections.length} corrections applied`);

// PDF p.1 is the title page (rebuilt by hand), p.4-7 the old table of contents (regenerated), p.196 is blank.
const SKIP = new Set([1, 2, 3, 4, 5, 6, 7, 196]);   // 2-3 (abstract, acknowledgements) are rendered separately below
// Original thesis pagination starts at 1 on PDF page 8 (the first chapter opener).
const origPage = (pdf) => (pdf >= 8 ? pdf - 7 : null);

// ---------------------------------------------------------------- 2. text cleanup
const WORD_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

function cleanPage(p) {
  let t = p.text;
  t = t.replace(/<span id="page-[^"]*"><\/span>/g, '');
  t = t.replace(/^\s*---\s*$/gm, '');                         // marker's rules around headings
  t = t.replace(/^(#{1,6}) \*\*(.+?)\*\*\s*$/gm, '$1 $2');      // bold inside headings
  // duplicated list numbering from the scan: "1. 1) text" -> "1. text"
  t = t.replace(/^(\s*)(\d+)\. (\d+)\) /gm, (_m, sp, n) => { stats.listFixes++; return `${sp}${n}. `; });
  return t.trim();
}

let body = '';
for (const p of pages) {
  if (SKIP.has(p.pdf)) continue;
  const op = origPage(p.pdf);
  const txt = cleanPage(p);
  if (!txt) continue;
  // a zero-height block carrying the original page number (shown small in the margin)
  body += (op ? `\n<div class="op" data-p="${op}"></div>\n\n` : '\n') + txt + '\n\n';
}

// chapter openers: "# Chapter One" + "## Introduction"  ->  an HTML block (kept as one page by CSS)
body = body.replace(/(<div class="op"[^>]*><\/div>\s*)?^# +Chapter (One|Two|Three|Four|Five|Six|Seven|Eight)\s*\n+## +(.+?)\s*\n([\s\S]*?)(?=\n<div class="op"|$(?![\s\S]))/gim,
  (_m, op, w, title, rest) => {
    const n = WORD_NUM[w.toLowerCase()];
    return `\n<!--ENDUNIT-->\n<div class="chapter-open" data-n="${n}">${op ?? ''}<p class="chapter-label">Chapter</p><p class="chapter-num">${n}</p>`
      + `<h1 id="chapter-${n}" class="chapter-title" data-chapter="${n}">${title.replace(/\*+/g, '')}</h1></div>\n\n<div class="epigraph">\n\n${rest.trim()}\n\n</div>\n\n<!--UNIT:${n}:${title.replace(/\*+/g, '').replace(/-->/g, '')}-->\n\n`;
  });

body = body.replace(/^# +(Bibliography)\s*$/gim, '\n<!--ENDUNIT-->\n<!--UNIT:bib:Bibliography-->\n\n# $1').replace(/^# +(Appendices)\s*$/gim, '\n<!--ENDUNIT-->\n<!--UNIT:app:Appendices-->\n\n# $1');

// ---------------------------------------------------------------- 3. markdown -> HTML (math, headings, figures)
const slug = new Map();
const idFor = (text) => {
  const base = text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'h';
  const n = (slug.get(base) ?? 0) + 1;
  slug.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
};

const renderMath = (tex, display) => {
  try {
    const out = katex.renderToString(tex.trim(), { displayMode: display, throwOnError: true, output: 'html', strict: 'ignore' });
    stats.mathOk++;
    return out;
  } catch (e) {
    stats.mathBad.push(tex.trim().slice(0, 80));
    return `<code class="math-fallback">${tex.replace(/</g, '&lt;')}</code>`;
  }
};

marked.use({
  gfm: true,
  extensions: [
    {
      name: 'blockMath', level: 'block',
      start: (s) => s.indexOf('$$'),
      tokenizer(s) { const m = /^\$\$([\s\S]+?)\$\$[ \t]*(?:\n|$)/.exec(s); if (m) return { type: 'blockMath', raw: m[0], tex: m[1] }; },
      renderer: (t) => `<div class="eq">${renderMath(t.tex, true)}</div>\n`,
    },
    {
      name: 'inlineMath', level: 'inline',
      start: (s) => s.indexOf('$'),
      tokenizer(s) { const m = /^\$(?!\s)((?:\\.|[^$\\\n])+?)\$/.exec(s); if (m) return { type: 'inlineMath', raw: m[0], tex: m[1] }; },
      renderer: (t) => renderMath(t.tex, false),
    },
  ],
  renderer: {
    heading({ tokens, depth }) {
      const inner = this.parser.parseInline(tokens);
      const id = idFor(inner);
      const num = /^(\d+(?:\.\d+)*)\s+(.*)$/s.exec(inner.replace(/<[^>]+>/g, '').trim());
      const html = num ? `<span class="num">${num[1]}</span>${inner.replace(/^\s*\d+(?:\.\d+)*\s+/, '')}` : inner;
      return `<h${depth} id="${id}"${depth === 1 ? ' class="unnumbered"' : ''}${num ? ` data-num="${num[1]}"` : ''}>${html}</h${depth}>\n`;
    },
    image({ href, text }) {
      stats.figures++;
      return `<img src="images/${href}" alt="${(text ?? '').replace(/"/g, '&quot;')}">`;
    },
  },
});

let html = marked.parse(body);

// image + "▪ Figure 5.4 : caption" paragraph  ->  <figure>
html = html.replace(/<p>(<img [^>]*>)<\/p>\s*(?:<div class="op"[^>]*><\/div>\s*)?<p>(?:[▪•■·]\s*)?((?:Figure|Table)\s+[\d.]+[\s\S]*?)<\/p>/g, (_m, img, cap) => {
  stats.captions++;
  const c = cap.replace(/^((?:Figure|Table)\s+[\d.]+)\s*[-:–]?\s*/, '<span class="fig-no">$1</span> ');
  return `<figure>${img}<figcaption>${c}</figcaption></figure>`;
});
html = html.replace(/<p>(<img [^>]*>)<\/p>\s*<ul>\s*<li>(?:▪\s*)?((?:Figure|Table)\s+[\d.]+[\s\S]*?)<\/li>\s*<\/ul>/g, (_m, img, cap) => {
  stats.captions++;
  return `<figure>${img}<figcaption>${cap.replace(/^((?:Figure|Table)\s+[\d.]+)\s*[-:–]?\s*/, '<span class="fig-no">$1</span> ')}</figcaption></figure>`;
});
html = html.replace(/<p>(<img [^>]*>)<\/p>/g, '<figure class="bare">$1</figure>');

const units = [];
let openUnit = false;
html = html.replace(/<!--(?:UNIT:([^:]+):([^>]*?)|ENDUNIT)-->/g, (_m, key, title) => {
  if (key === undefined) { const r = openUnit ? '</section>' : ''; openUnit = false; return r; }
  units.push({ key, title });
  const r = (openUnit ? '</section>' : '') + `<section class="unit" data-unit="${key}">`;
  openUnit = true;
  return r;
});
if (openUnit) html += '</section>';
const unitCss = units.map((u) => `.unit[data-unit="${u.key}"] { page: unit-${u.key}; }
@page unit-${u.key}:right { @top-right { content: "${u.title.replace(/"/g, '\\"')}"; font: 500 6.8pt "Archivo", sans-serif; letter-spacing: 0.16em; text-transform: uppercase; color: #5d636c; vertical-align: bottom; padding-bottom: 6mm; white-space: nowrap; text-align: right; } }`).join('\n');

let bibEntries = 0;
html = html.replace(/(<section class="unit" data-unit="bib">)([\s\S]*?)(<\/section>)/, (_m, a, inner, c) =>
  a + inner.replace(/<p>\[([^\]]+)\]\s*([\s\S]*?)<\/p>/g, (_p, key, rest) => {
    bibEntries++;
    const [title, ...meta] = rest.split(/<br\s*\/?>\s*/);
    return `<p class="bib"><span class="bib-key">[${key}]</span><span class="bib-title">${title}</span>${meta.map((x) => `<span class="bib-meta">${x}</span>`).join('')}</p>`;
  }) + c);
console.log(`${bibEntries} bibliography entries structured`);

// front matter pages (abstract, acknowledgements) rendered on their own, without their scan headings
const frontText = (pdf) => cleanPage(pages.find((p) => p.pdf === pdf)).replace(/^# .*\n/, '');
const frontAbstract = marked.parse(frontText(2));
const frontAck = marked.parse(frontText(3));

// table of contents from the headings
const toc = [];
const headingRe = /<h([123]) id="([^"]+)"([^>]*)>([\s\S]*?)<\/h\1>/g;
let mm;
while ((mm = headingRe.exec(html))) {
  const [whole, lvl, id, attrs, inner] = mm;
  const text = inner.replace(/<span class="num">[^<]*<\/span>/, '').replace(/<[^>]+>/g, '').replace(/\u00AD/g, '').trim();
  if (/class="chapter-title"/.test(whole)) { toc.push({ lvl: 1, id, num: `Chapter ${/data-chapter="(\d+)"/.exec(attrs)[1]}`, text }); continue; }
  if (lvl === '1') { if (/^(Bibliography|Appendices)$/i.test(text)) toc.push({ lvl: 1, id, num: '', text }); continue; }
  const num = /data-num="([^"]+)"/.exec(attrs)?.[1] ?? '';
  const depth = num.split('.').length;
  if (depth === 2) toc.push({ lvl: 2, id, num, text });       // 1.1
  else if (depth === 3) toc.push({ lvl: 3, id, num, text });  // 1.1.1
}
const tocHtml = `<nav class="toc"><h1 id="contents" class="unnumbered">Contents</h1>${toc.map((e) =>
  `<p class="toc-${e.lvl}"><a href="#${e.id}"><span class="toc-num">${e.num}</span><span class="toc-text">${e.text}</span><span class="toc-lead"></span><span class="toc-page">%%P:${e.id}%%</span></a></p>`).join('')}</nav>`;

const cover = `
<section class="cover">
  <p class="cover-kicker">The Queen’s University of Belfast <span>·</span> Faculty of Engineering</p>
  <h1 class="cover-title">An Application of Artificial Intelligence to <em>Quantitative Problem Solving</em> in Engineering</h1>
  <div class="cover-meta">
    <p class="cover-degree">A thesis submitted in fulfilment of the requirements for the degree of Doctor of Philosophy</p>
    <p class="cover-author">Jaron Clements Collis<span>, BSc.</span></p>
    <p class="cover-date">September 1996</p>
  </div>
  <p class="cover-edition">Re-typeset edition <span>·</span> 2026 <span>·</span> thirty years on</p>
</section>`;

const colophon = `
<section class="front colophon">
  <h1 class="unnumbered" id="about-this-edition">About this edition</h1>
  <p>This is a re-typeset copy of a thesis completed in September 1996, prepared on its thirtieth anniversary. The aim is simply a version that is easier to read: modern typography, scalable text, and real equations in place of the low-resolution scan.</p>
  <p><strong>It is not yet proofread.</strong> The text was converted from a scan of the original by machine (the <em>marker</em> OCR tool) and typeset automatically. Misread characters are likely, especially in equations, symbols and tables. For example, a capital <em>I</em> and a lowercase <em>l</em> are easily confused. Where exactness matters, treat the original as the authority.</p>
  <p>The figures are the original raster images from 1996 and will look soft at high magnification. The appendices of solver output traces were not part of the source file and are not included.</p>
  <p>The small numbers in the left margin give the page numbers of the original thesis, so that citations to it can be followed. A short log of corrections made to obvious conversion errors is kept with the build files.</p>
  <p class="colophon-small">Set in Source Serif 4, Archivo and IBM Plex Mono (SIL Open Font License), with equations in KaTeX. Laid out with HTML, CSS paged media and Paged.js; rendered to PDF with Chrome.</p>
</section>`;

const front = `
<section class="front">
  <h1 class="unnumbered" id="abstract">Abstract</h1>${frontAbstract}
</section>
<section class="front">
  <h1 class="unnumbered" id="acknowledgements">Acknowledgements</h1>${frontAck}
</section>
${tocHtml}`;

html = front + '\n' + html;

// ---------------------------------------------------------------- 5. hyphenation (soft hyphens, en-GB)
html = hyphenateHTMLSync(html, { minWordLength: 7 })
  .replace(/<(h[1-4]|figcaption|th|nav)\b[\s\S]*?<\/\1>/g, (m) => m.replace(/\u00AD/g, ''));   // headings, captions, tables heads, contents stay unhyphenated
html = cover + colophon + html;

// ---------------------------------------------------------------- 6. write the page
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'fonts'), { recursive: true });
cpSync(join(repo, 'source/marker'), join(dist, 'images'), { recursive: true });
cpSync(join(here, 'node_modules/katex/dist/fonts'), join(dist, 'katex-fonts'), { recursive: true });
const sf = join(here, 'node_modules/@fontsource-variable/source-serif-4/files');
for (const f of ['latin', 'latin-ext', 'greek'].flatMap((s) => [`source-serif-4-${s}-opsz-normal.woff2`, `source-serif-4-${s}-opsz-italic.woff2`])) cpSync(join(sf, f), join(dist, 'fonts', f));
cpSync(join(repo, 'public/fonts/src/Archivo[wdth,wght].ttf'), join(dist, 'fonts/Archivo-Var.ttf'));
cpSync(join(repo, 'public/fonts/src/Archivo-Italic[wdth,wght].ttf'), join(dist, 'fonts/Archivo-Italic-Var.ttf'));
for (const f of ['IBMPlexMono-Regular.ttf', 'IBMPlexMono-Medium.ttf']) cpSync(join(repo, 'public/fonts/src', f), join(dist, 'fonts', f));
cpSync(join(here, 'node_modules/pagedjs/dist/paged.polyfill.js'), join(dist, 'paged.polyfill.js'));
const katexCss = readFileSync(join(here, 'node_modules/katex/dist/katex.min.css'), 'utf8').replace(/url\(fonts\//g, 'url(katex-fonts/');
writeFileSync(join(dist, 'katex.css'), katexCss);
cpSync(join(here, 'style.css'), join(dist, 'style.css'));

const writeIndex = (pageMap) => writeFileSync(join(dist, 'index.html'), `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>An Application of Artificial Intelligence to Quantitative Problem Solving in Engineering</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="katex.css">
<link rel="stylesheet" href="style.css">
<style>
${unitCss}
</style>
<script>window.PagedConfig = { auto: true, after: () => { window.__paged = true; } };</script>
<script src="paged.polyfill.js"></script>
</head>
<body>
${html.replace(/%%P:([^%]+)%%/g, (_m, id) => pageMap?.[id] ?? '')}
</body>
</html>`);
writeIndex(null);

console.log(`html written: ${stats.figures} figures (${stats.captions} captioned), math ${stats.mathOk} ok / ${stats.mathBad.length} failed, ${stats.listFixes} list fixes, ${toc.length} contents entries`);
if (stats.mathBad.length) console.log('math failures (first 12):\n  ' + stats.mathBad.slice(0, 12).join('\n  '));
if (htmlOnly) process.exit(0);

// ---------------------------------------------------------------- 7. layout + PDF
if (!existsSync(CHROME)) { console.error('Google Chrome not found at ' + CHROME); process.exit(1); }
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const path = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const ext = path.slice(path.lastIndexOf('.'));
    const data = await readFile(path);
    res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream' });
    res.end(data);
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const LAYOUT_TIMEOUT = 6 * 60 * 1000;

/** Writes the page labels: i, ii, iii... from the colophon, then 1, 2, 3... from the first chapter opener. */
async function setFolios(page) {
  return page.evaluate(() => {
    const pages = [...document.querySelectorAll('.pagedjs_page')];
    const roman = (n) => ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'][n] ?? String(n);
    const colophon = pages.findIndex((p) => p.querySelector('.colophon'));
    const opener = pages.findIndex((p) => p.querySelector('.chapter-open[data-n="1"]'));
    const rules = [];
    pages.forEach((p, i) => {
      if (p.classList.contains('pagedjs_blank_page') || i < colophon || p.querySelector('.chapter-open')) return;   // no folio on blanks or chapter openers
      const label = i < opener ? roman(i - colophon + 1) : String(i - opener + 1);
      const n = p.dataset.pageNumber;
      for (const side of ['left', 'right'])
        rules.push(`.pagedjs_page[data-page-number="${n}"] .pagedjs_margin-bottom-${side} > .pagedjs_margin-content::after { content: "${label}" !important; }`);
    });
    const st = document.createElement('style');
    st.textContent = rules.join('\n');
    document.head.appendChild(st);
    return { colophon, opener, labelled: rules.length / 2 };
  });
}

async function layout() {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('browser:', m.text().slice(0, 200)); });
  const t0 = Date.now();
  await page.goto(`http://localhost:${port}/index.html`);
  await page.waitForFunction('window.__paged === true', null, { timeout: LAYOUT_TIMEOUT });
  const n = await page.evaluate(() => document.querySelectorAll('.pagedjs_page').length);
  console.log(`layout done in ${((Date.now() - t0) / 1000).toFixed(0)}s: ${n} pages`);
  return page;
}

// pass 1: measure which page each heading lands on (folio restarts at 1 on the first chapter opener)
let page = await layout();
const pageMap = await page.evaluate(() => {
  const pages = [...document.querySelectorAll('.pagedjs_page')];
  const first = pages.findIndex((p) => p.querySelector('.chapter-open[data-n="1"]'));
  const out = {};
  document.querySelectorAll('h1[id], h2[id], h3[id]').forEach((h) => {
    const p = h.closest('.pagedjs_page');
    if (p && first >= 0 && !(h.id in out)) out[h.id] = pages.indexOf(p) - first + 1;
  });
  return out;
});
await page.close();
const missing = toc.filter((e) => !(e.id in pageMap));
console.log(`page map: ${Object.keys(pageMap).length} headings, ${missing.length} contents entries without a page`);

// pass 2: the same layout with the real page numbers in the contents
writeIndex(pageMap);
page = await layout();
console.log('folios:', JSON.stringify(await setFolios(page)));
await page.pdf({ path: join(dist, 'thesis-2026-edition.pdf'), preferCSSPageSize: true, printBackground: true });
await browser.close();
server.close();
console.log('wrote dist/thesis-2026-edition.pdf');
