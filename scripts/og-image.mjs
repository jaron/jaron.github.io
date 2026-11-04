// node scripts/og-image.mjs: renders scripts/og-card.html to public/og-image.png (1200 x 630), the card a shared
// link to the home page shows. --out to write elsewhere.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const i = process.argv.indexOf('--out');
const OUT = i > 0 ? process.argv[i + 1] : fileURLToPath(new URL('../public/og-image.png', import.meta.url));
const CARD = pathToFileURL(fileURLToPath(new URL('./og-card.html', import.meta.url))).href;
const CHROME = process.env.CHROME_PATH ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(CARD, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: OUT, type: 'png' });
  console.log(`wrote ${OUT}`);
} finally {
  await browser.close();
}
