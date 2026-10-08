// Renders the film's sound offline (the same voices and mix the player uses) to WAV files, and measures it, so the
// sound can be listened to and checked without playing the film. Needs the dev server:  npm run dev
//   npm run render:audio [-- --url <page>] [-- --out sound-check]
// Writes sound-check/film.wav (the whole film) and a few short clips, and prints peak and loudness (K-weighted,
// gated, after ITU-R BS.1770; YouTube normalises to about -14 LUFS, and -16 is a good target for a film like this).
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const url = arg('--url', 'http://localhost:4321/thesis');
const outDir = arg('--out', 'sound-check');
const music = !process.argv.includes('--no-music');  // --no-music leaves out the outro's music, to compare
const bed = !process.argv.includes('--no-bed');         // --no-bed renders the sounds alone, to compare
const RATE = 48000, TAIL = 3, CHUNK = 60;
const CHROME = process.env.CHROME_PATH ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
if (!CHROME) { console.error('No Chrome found. Set CHROME_PATH.'); process.exit(2); }

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('page error:', String(e).slice(0, 200)));
await page.goto(url);
await page.waitForFunction('window.__film && window.__film.renderAudio', null, { timeout: 60000 });
const { duration, spans } = await page.evaluate(() => { window.film.pause(); return { duration: window.__film.duration, spans: window.film.spans.map((s) => ({ id: s.id, start: s.start, end: s.end })) }; });

const render = async (t0, t1) => {
  const { left, right } = await page.evaluate(([a, b, w, m]) => window.__film.renderAudio(a, b, w, m), [t0, t1, bed, music]);
  return [Float32Array.from(left), Float32Array.from(right)];
};
function wav(l, r) {
  const len = l.length, buf = Buffer.alloc(44 + len * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + len * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(len * 4, 40);
  for (let i = 0; i < len; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(l[i] * 32767))), 44 + i * 4);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(r[i] * 32767))), 46 + i * 4);
  }
  return buf;
}
// K-weighting (BS.1770) at 48 kHz, then 400 ms blocks with the absolute (-70) and relative (-10 LU) gates
function biquad(x, b, a) { const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; }
const kw = (x) => biquad(biquad(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]), [1, -2, 1], [1, -1.99004745483398, 0.99007225036621]);
function stats(l, r) {
  let peak = 0; for (let i = 0; i < l.length; i++) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  const kl = kw(l), kr = kw(r), blk = Math.round(0.4 * RATE), hop = Math.round(0.1 * RATE), ms = [];
  for (let s = 0; s + blk <= l.length; s += hop) { let a = 0, b = 0; for (let i = s; i < s + blk; i++) { a += kl[i] * kl[i]; b += kr[i] * kr[i]; } ms.push((a + b) / blk); }
  const lufs = (v) => -0.691 + 10 * Math.log10(v);
  const abs = ms.filter((v) => lufs(v) > -70);
  if (!abs.length) return { peak, lufs: -Infinity };
  const rel = lufs(abs.reduce((p, c) => p + c, 0) / abs.length) - 10;
  const gated = abs.filter((v) => lufs(v) > rel);
  return { peak, lufs: lufs(gated.reduce((p, c) => p + c, 0) / gated.length) };
}
const db = (x) => (x > 0 ? (20 * Math.log10(x)).toFixed(1) : '-inf');
mkdirSync(outDir, { recursive: true });
// short clips are rendered in one piece (so the bed is continuous) and made louder (peak at -3 dBFS) to be easy to listen to,
// since the film's sounds are deliberately quiet; the numbers printed are always for the sound as rendered
const span = (id) => spans.find((s) => s.id === id);
const clips = [
  ['1-cold-open', 0, span('cold-open').end],
  ['2-scene-1', span('s01-understanding').start, span('s01-understanding').end],
  ['3-scene-4', span('s04-tool-calling').start, span('s04-tool-calling').end],
  ['4-outro', span('outro').start, duration],
];
for (const [name, t0, t1] of clips) {
  const [l, r] = await render(t0, t1 + 2);
  const len = Math.round((t1 - t0 + 2) * RATE), ll = l.slice(0, len), rr = r.slice(0, len), s = stats(ll, rr);
  if (s.peak > 0) { const g = 0.708 / s.peak; for (let i = 0; i < len; i++) { ll[i] *= g; rr[i] *= g; } }
  writeFileSync(`${outDir}/${name}.wav`, wav(ll, rr));
  console.log(`${name.padEnd(14)} ${(t1 - t0).toFixed(0).padStart(4)} s   peak ${db(s.peak)} dBFS   loudness ${s.lufs.toFixed(1)} LUFS   (clip normalised to -3 dBFS peak)`);
}
// the whole film, in 60 s pieces, for the overall measurements only (no file: the pieces would not join seamlessly)
{
  const n = Math.ceil((duration + TAIL) * RATE), L = new Float32Array(n), R = new Float32Array(n);
  for (let t0 = 0; t0 < duration; t0 += CHUNK) {
    const [l, r] = await render(t0, Math.min(duration, t0 + CHUNK));
    const off = Math.round(t0 * RATE);
    for (let i = 0; i < l.length && off + i < n; i++) { L[off + i] += l[i]; R[off + i] += r[i]; }
  }
  const s = stats(L, R);
  console.log(`${'whole film'.padEnd(14)} ${duration.toFixed(0).padStart(4)} s   peak ${db(s.peak)} dBFS   loudness ${s.lufs.toFixed(1)} LUFS${bed ? '' : '   (no bed)'}`);
}
await browser.close();
