// Rend le flyer à imprimer : un PDF A4 (impression) et une image PNG (partage).
// Prérequis : le serveur de développement lancé (npm run dev), Playwright installé.
//   node scripts/promo/flyer.mjs [--url http://localhost:5173/promo/flyer.html] [--out flyer-animalcards]

import { chromium } from 'playwright';

const arg = (name, fallback) => {
  const i = process.argv.lastIndexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const url = arg('url', 'http://localhost:5173/promo/flyer.html');
const out = arg('out', 'flyer-animalcards');

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 3 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}.png` });
await page.pdf({ path: `${out}.pdf`, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await browser.close();
console.log(`Flyer : ${out}.pdf et ${out}.png`);
