// Rend l'affiche de la Série 2 (Mexique) : une image de 1080 × 1920, à poster telle quelle.
// Prérequis : le serveur de développement lancé (npm run dev), Playwright installé.
//   node scripts/promo/affiche.mjs [--url http://localhost:5173/promo/affiche.html] [--out affiche-mexique.png]

import { chromium } from 'playwright';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const url = arg('url', 'http://localhost:5173/promo/affiche.html');
const out = arg('out', 'affiche-mexique.png');

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
await page.goto(url);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
await page.screenshot({ path: out, type: out.endsWith('.jpg') ? 'jpeg' : 'png', ...(out.endsWith('.jpg') ? { quality: 95 } : {}) });
await browser.close();
console.log(`Affiche : ${out}`);
