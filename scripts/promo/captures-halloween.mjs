// Capture les trois écrans du jeu montrés dans la vidéo d'Halloween (promo/captures/, hors du dépôt) :
// l'accueil, la collection avec la radio qui annonce un morceau de saison, et le duel.
// L'horloge du navigateur est fixée au soir du 31 octobre, pour que le jeu soit en mode Halloween.
// Prérequis : le site construit et servi comme en production (npm run build puis npm run preview), Playwright.
//   node scripts/promo/captures-halloween.mjs [--url http://localhost:4173/] [--dossier promo/captures]

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.lastIndexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const url = arg('url', 'http://localhost:4173/');
const dir = arg('dossier', 'promo/captures');
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.clock.setFixedTime(new Date('2026-10-31T20:00:00'));
await page.goto(url);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500);
await page.screenshot({ path: join(dir, 'accueil.png') });

// le premier geste lance la radio : elle annonce son morceau de saison en haut de l'écran pendant 7 s
await page.click('.bottomnav__item:has-text("Collection")');
await page.waitForTimeout(1800);
await page.screenshot({ path: join(dir, 'radio.png') });

await page.waitForTimeout(7500);
await page.click('.bottomnav__item:has-text("Duel")');
await page.waitForTimeout(1800);
await page.screenshot({ path: join(dir, 'duel.png') });

await browser.close();
console.log(`Captures dans ${dir}`);
