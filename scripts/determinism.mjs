// Verifies that every frame of the film is a pure function of time, in a clean headless Chrome (the same setup the
// export will use). Needs the dev server running:  npm run dev   then:  npm run check:determinism [-- --url <page>]
// It loads the page in 3 fresh browsers, and in each renders a spread of times in order, then reversed with
// repeats, comparing frame hashes. Any mismatch means a frame depended on something other than its time.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:4321/thesis';
const CHROME = process.env.CHROME_PATH ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
if (!CHROME) { console.error('No Chrome found. Set CHROME_PATH.'); process.exit(2); }

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
let bad = 0, renders = 0;
for (let load = 0; load < 3; load++) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('page error:', String(e).slice(0, 200)));
  await page.goto(`${url}${url.includes('?') ? '&' : '?'}det=${load}`);
  await page.waitForFunction('window.__film && window.__film.determinism', null, { timeout: 60000 });
  const duration = await page.evaluate(() => { window.film.pause(); return window.__film.duration; });
  // a spread over the whole film, always including the first frames
  const times = [0.2, 1.0, 2.6, 3.9, 6.5, 11, 14, 18, 24, 30, 36, 38, 39.6, 44, 50, 58, 64, 70, 78, 80.5, 82.5, 84.8, 86.5, 87.4, 88.6, 90.4, 93.5, 97, 101, 105, 108, 110.6, 114, duration - 0.5].filter((t) => t < duration);
  for (let k = 0; k < 4; k++) {
    const r = await page.evaluate((t) => window.__film.determinism(t), times);
    renders += r.checked * 2;
    if (r.mismatches.length) { bad += r.mismatches.length; console.log(`load ${load} run ${k}: mismatches at`, r.mismatches.map((m) => m.t)); }
  }
  await page.close();
}
await browser.close();
console.log(bad ? `FAIL: ${bad} mismatching frame(s) in about ${renders} renders` : `OK: no mismatches in about ${renders} renders over 3 fresh browsers`);
process.exit(bad ? 1 : 0);
