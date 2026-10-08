// Reports the pacing of every screen of the film: when it starts, how long it takes to finish drawing (the last visible
// change, measured from rendered frames) and how long it then holds before the next screen. Needs the dev server:
//   npm run dev     then:   npm run report:pacing [-- --url <page>] [-- --step 0.2]
// A frame is a pure function of time, so this renders the whole film in order at a fixed step, reduces each frame to a
// coarse grid of brightness blocks and compares neighbours. Whole-frame fades (in and out) are normalised away, so only
// content that appears, moves or changes counts. Slow ambient motion (a pulsing ellipsis, a glow) is under the threshold
// unless it is large; the "peak" column shows how big the last change was, so a small value means a pulse, not drawing.
import { chromium } from 'playwright-core';
import { existsSync, writeFileSync } from 'node:fs';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const url = arg('--url', 'http://localhost:4321/thesis');
const STEP = Number(arg('--step', '0.2'));
const THRESH = Number(arg('--threshold', '2.5'));   // mean absolute change per block, on a 0-255 scale
const CHROME = process.env.CHROME_PATH ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
if (!CHROME) { console.error('No Chrome found. Set CHROME_PATH.'); process.exit(2); }

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('page error:', String(e).slice(0, 200)));
await page.goto(url);
await page.waitForFunction('window.__film && window.__film.engine', null, { timeout: 60000 });
const info = await page.evaluate(async () => {
  window.film.pause();
  const o = await import('/src/film/data/outro.ts');
  return { duration: window.__film.duration, spans: window.film.spans.map((s) => ({ id: s.id, label: s.label, start: s.start, end: s.end, beats: s.beats ?? [] })), outro: o.outroTimes() };
});

// every screen: [name, absolute start, absolute end]
const screens = [];
for (const s of info.spans) {
  if (s.id === 'outro') {
    if (info.outro[0].start > 0) screens.push({ scene: 'outro', name: 'quotation', start: s.start, end: s.start + info.outro[0].start });
    info.outro.forEach((p, i) => screens.push({ scene: 'outro', name: `page ${i + 1}`, start: s.start + p.start, end: s.start + p.end, tail: p.last ? 0 : 1.0 }));   // a page clears (0.6 s + 0.4 s gap) before the next
  } else if (!s.beats.length) {
    screens.push({ scene: s.id, name: 'whole scene', start: s.start, end: s.end });
  } else {
    for (const b of s.beats) if (b.end > b.start) screens.push({ scene: s.id, name: b.name, start: s.start + b.start, end: s.start + b.end, tail: b.name === 'chain' ? 1.3 : 0 });   // the chain fades out over its last 1.3 s
  }
}

// render the film at a fixed step and keep a normalised 48x27 brightness grid per frame
const N = Math.floor(info.duration / STEP);
const grids = [];
const CHUNK = 200;
for (let c0 = 0; c0 < N; c0 += CHUNK) {
  const part = await page.evaluate(({ c0, c1, step }) => {
    const out = [];
    const eng = window.__film.engine;
    const W = 1920, H = 1080, GX = 48, GY = 27, bw = W / GX, bh = H / GY;
    for (let i = c0; i < c1; i++) {
      eng.render(i * step, 1 / 60);
      const px = eng.readPixels();
      const g = new Float32Array(GX * GY);
      for (let by = 0; by < GY; by++) for (let bx = 0; bx < GX; bx++) {
        let sum = 0, n = 0;
        for (let y = by * bh; y < (by + 1) * bh; y += 6) for (let x = bx * bw; x < (bx + 1) * bw; x += 6) {
          const k = (y * W + x) * 4; sum += px[k] + px[k + 1] + px[k + 2]; n += 3;
        }
        g[by * GX + bx] = sum / n;
      }
      out.push(Array.from(g));
    }
    return out;
  }, { c0, c1: Math.min(N, c0 + CHUNK), step: STEP });
  grids.push(...part);
  process.stdout.write(`\rrendered ${grids.length}/${N} frames`);
}
await browser.close();
console.log('');

// normalise out whole-frame fades, then measure change between neighbouring frames
const norm = grids.map((g) => { const m = g.reduce((a, b) => a + b, 0) / g.length || 1; return g.map((v) => (v / m) * 20); });
const change = new Float32Array(N), peak = new Float32Array(N);
for (let i = 1; i < N; i++) { let mx = 0, s = 0; for (let k = 0; k < norm[i].length; k++) { const d = Math.abs(norm[i][k] - norm[i - 1][k]); s += d; if (d > mx) mx = d; } peak[i] = mx; change[i] = s / norm[i].length; }

const f1 = (x) => x.toFixed(1);
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const rows = screens.map((sc) => {
  let last = sc.start;
  for (let i = Math.ceil(sc.start / STEP); i * STEP < sc.end - (sc.tail ?? 0) && i < N; i++) if (peak[i] > THRESH) last = i * STEP;
  return { ...sc, last, draw: last - sc.start, hold: sc.end - last, len: sc.end - sc.start };
});

let md = `# Film pacing\n\nGenerated by \`npm run report:pacing\` (step ${STEP} s, change threshold ${THRESH}). "Draw" is from the start of the screen to its last visible change; "hold" is what is left before the next screen (a chain's closing fade and an outro page's clearing are counted as hold, not drawing). Whole-film length ${mmss(info.duration)} (${f1(info.duration)} s).\n\n| Scene | Screen | Starts | Length | Draw | Hold |\n|---|---|---|---|---|---|\n`;
for (const r of rows) md += `| ${r.scene} | ${r.name} | ${mmss(r.start)} | ${f1(r.len)} s | ${f1(r.draw)} s | ${f1(r.hold)} s |\n`;
writeFileSync(new URL('../docs/pacing.md', import.meta.url), md);
console.log(md);
