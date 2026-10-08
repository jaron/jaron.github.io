// Renders the film offline to an MP4: headless Chrome renders every frame (a frame is a pure function of time, so the
// result does not depend on how fast or in what order it is rendered), streams the pixels to ffmpeg, and the film's
// sound (rendered offline through the same voices and mix as the player) is loudness-normalised and muxed in.
// Needs the dev server (npm run dev), Chrome and ffmpeg.
//   npm run render:video -- --url http://localhost:4321/thesis [options]
// Options:
//   --scale 2        1 = 1920x1080, 2 = 3840x2160 (default 2)
//   --fps 60         frames per second (default 60)
//   --samples auto   motion-blur sub-frames: 1 (none), a number, or auto (adaptive, 4 to 36). Default auto
//   --grain 0.5      scale on the film grain: 1 is the live look; the upload master turns it down (default 0.5)
//   --loudness -23   target integrated loudness in LUFS; peaks are limited to -1.5 dBTP (default -23)
//   --crf 14         x264 quality (lower is better and bigger); --preset slow|medium|fast
//   --from 0 --to 20 render only this part of the film, in seconds (for tests)
//   --out exports/film.mp4
import { chromium } from 'playwright-core';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const url = arg('--url', 'http://localhost:4321/thesis');
const scale = Number(arg('--scale', '2')), fps = Number(arg('--fps', '60'));
const samplesArg = arg('--samples', 'auto');
const grain = Number(arg('--grain', '0.5')), loudness = Number(arg('--loudness', '-23'));
const crf = arg('--crf', '14'), preset = arg('--preset', 'medium');
const out = arg('--out', 'exports/film.mp4');
const noAudio = process.argv.includes('--no-audio');
const W = 1920 * scale, H = 1080 * scale, RATE = 48000;
const CHROME = process.env.CHROME_PATH ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
if (!CHROME) { console.error('No Chrome found. Set CHROME_PATH.'); process.exit(2); }
mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('page error:', String(e).slice(0, 300)));
await page.goto(`${url}${url.includes('?') ? '&' : '?'}scale=${scale}`);
await page.waitForFunction('window.__film && window.__film.engine && window.__film.renderAudioFull', null, { timeout: 120000 });
const duration = await page.evaluate((g) => { window.film.pause(); window.__film.engine.post.grainScale = g; return window.__film.duration; }, grain);
const from = Number(arg('--from', '0')), to = Math.min(duration, Number(arg('--to', String(duration))));
const frames = Math.round((to - from) * fps);
const samples = samplesArg === 'auto' ? { min: 4, max: 36, tol: 1 } : Number(samplesArg);
console.log(`${W}x${H} at ${fps} fps, ${frames} frames (${from.toFixed(1)}s to ${to.toFixed(1)}s), samples ${samplesArg}, grain x${grain}, ${noAudio ? 'no audio' : `loudness ${loudness} LUFS`}`);

// ---- the sound, rendered once, sliced to the range
let wavPath = null, audioFilter = null;
if (!noAudio) {
  process.stdout.write('rendering the sound... ');
  const n = await page.evaluate(() => window.__film.renderAudioFull());
  const a = Math.round(from * RATE), b = Math.min(n, Math.round(to * RATE)), parts = [];
  for (let s = a; s < b; s += RATE * 10) parts.push(Buffer.from(await page.evaluate(([f, c]) => window.__film.audioChunk(f, c), [s, Math.min(RATE * 10, b - s)]), 'base64'));
  const pcm = Buffer.concat(parts), hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
  hdr.writeUInt32LE(RATE, 24); hdr.writeUInt32LE(RATE * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
  wavPath = out.replace(/\.mp4$/, '') + '-audio.wav';
  writeFileSync(wavPath, Buffer.concat([hdr, pcm]));
  // two-pass loudness normalisation: measure the sound, then apply one linear gain with the true peak held at -1.5 dBTP
  const tgt = `I=${loudness}:TP=-1.5:LRA=11`;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', wavPath, '-af', `loudnorm=${tgt}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' });
  const m = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf('{'), r.stderr.lastIndexOf('}') + 1));
  audioFilter = `loudnorm=${tgt}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  console.log(`done. As rendered: ${m.input_i} LUFS, true peak ${m.input_tp} dBTP; gain ${m.target_offset} dB to reach ${loudness} LUFS`);
}

// ---- the picture: every frame goes to ffmpeg over HTTP (the page posts the raw RGBA pixels)
const ff = spawn('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-framerate', String(fps), '-i', 'pipe:0',
  ...(wavPath ? ['-i', wavPath] : []),
  // the engine's rows run bottom-up; full-range sRGB becomes BT.709 limited-range video, as YouTube expects
  '-vf', 'vflip,scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p',
  ...(audioFilter ? ['-af', audioFilter, '-c:a', 'aac', '-b:a', '320k', '-ar', String(RATE)] : []),
  '-c:v', 'libx264', '-preset', preset, '-crf', crf, '-profile:v', 'high', '-g', String(Math.round(fps / 2)), '-bf', '2',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-movflags', '+faststart', '-shortest', out,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => { ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited with ${c}`)))); });
ff.stdin.on('error', () => {});
const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') { res.end(); return; }
  req.on('data', (d) => { if (!ff.stdin.write(d)) { req.pause(); ff.stdin.once('drain', () => req.resume()); } });
  req.on('end', () => res.end('ok'));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const renderFrame = (t) => page.evaluate(async ({ t, dt, samples, port }) => {
  const eng = window.__film.engine;
  const n = eng.render(t, dt, false, samples);
  const px = eng.readPixels();
  await fetch(`http://127.0.0.1:${port}/frame`, { method: 'POST', body: new Blob([px]) });      // a Blob uploads about 8 times faster than the typed array itself
  return n;
}, { t, dt: 1 / fps, samples, port });
// the very first renders in a fresh browser can differ by a level on a few pixels (cold GPU and text pipelines): render and discard a few
await page.evaluate(({ t, dt, samples }) => { for (let k = 0; k < 3; k++) window.__film.engine.render(t + k * dt, dt, false, samples); }, { t: from, dt: 1 / fps, samples });
await new Promise((r) => setTimeout(r, 1500));
await page.evaluate(({ t, dt, samples }) => { window.__film.engine.render(t, dt, false, samples); }, { t: Math.max(0, from - 1), dt: 1 / fps, samples });   // and come back to the start as a seek

const t0 = Date.now(); let sub = 0;
for (let i = 0; i < frames; i++) {
  sub += await renderFrame(from + i / fps);
  if ((i + 1) % 120 === 0 || i === frames - 1) {
    const el = (Date.now() - t0) / 1000, perFrame = el / (i + 1), left = perFrame * (frames - i - 1);
    process.stdout.write(`\rframe ${i + 1}/${frames}  ${(1 / perFrame).toFixed(2)} fps  avg ${(sub / (i + 1)).toFixed(1)} sub-frames  ${Math.floor(left / 60)}m ${Math.round(left % 60)}s left   `);
  }
}
console.log('');
ff.stdin.end();
await done;
server.close(); await browser.close();
console.log(`wrote ${out}`);
