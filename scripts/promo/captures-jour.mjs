import { chromium } from 'playwright';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
// Enregistre une vraie partie pour la pub « 30 jours » (promo/captures/, hors du dépôt) : l'accueil et ses boosters
// des deux séries, l'ouverture d'un booster, la première carte et sa fiche « Le savais-tu ? », l'album et le duel.
// Le hasard du jeu est fixé (--graine) pour retrouver le même booster. Les extraits gardés et leurs légendes sont dans
// src/promo/jour-partie.json (en secondes de l'enregistrement) ; les deux images fixes servent à l'arrivée et au départ
// du téléphone. Prérequis : npm run build puis npm run preview, Playwright et ffmpeg.
//   node scripts/promo/captures-jour.mjs [--url http://localhost:4173/] [--graine 3]
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.lastIndexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const url = arg('url', 'http://localhost:4173/');
const seed = Number(arg('graine', '3'));
const dir = 'promo/captures';
const frames = join(dir, 'images');
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((s) => { let a = s >>> 0; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, seed);
const page = await ctx.newPage();
// l'enregistrement vidéo de Playwright reste en pixels CSS : on filme l'écran en pixels réels (×2) image par image
const cdp = await ctx.newCDPSession(page);
const shots = [];
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const file = join(frames, `${String(shots.length).padStart(5, '0')}.jpg`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  shots.push({ file, at: metadata.timestamp });
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1688 });
const T0 = Date.now() / 1000;
const marks = {};
const mark = (m) => { marks[m] = Date.now() / 1000 - T0; console.log(marks[m].toFixed(2), m); };
mark('start');
await page.goto(url);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3000); mark('home');
await page.click('.btn--booster', { force: true }); mark('ouvrir');
await page.waitForTimeout(1300);
await page.click('.opening__pack3d', { force: true }); mark('pack');
await page.waitForTimeout(2200);
await page.click('.opening button:has-text("Retourner")', { force: true }); mark('retourner');
await page.waitForTimeout(3500);
await page.click('.opening button:has-text("Tout révéler")', { force: true }); mark('tout');
await page.waitForTimeout(2000);
await page.click('.opening button:has-text("Terminer")', { force: true }); mark('terminer');
await page.waitForTimeout(800);
await page.click('.bottomnav__item:has-text("Collection")', { force: true }); mark('collection');
await page.waitForTimeout(2200);
await page.click('.bottomnav__item:has-text("Duel")', { force: true }); mark('duel');
await page.waitForTimeout(2200);
mark('fin');
await cdp.send('Page.stopScreencast');
await browser.close();
// une image dure jusqu'à la suivante : vidéo à 30 images/s, en secondes depuis T0 (comme les repères)
const list = shots.map((s, i) => `file '${s.file.split('/').pop()}'\nduration ${((shots[i + 1]?.at ?? s.at + 0.5) - s.at).toFixed(4)}`);
writeFileSync(join(frames, 'liste.txt'), `${list.join('\n')}\nfile '${shots[shots.length - 1].file.split('/').pop()}'\n`);
const out = join(dir, 'jour-partie.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-i', join(frames, 'liste.txt'),
  '-vf', `tpad=start_duration=${Math.max(0, shots[0].at - T0).toFixed(3)}:start_mode=clone,fps=30,scale=780:1688,format=yuv420p`,
  '-c:v', 'libx264', '-crf', '16', out]);
writeFileSync(join(dir, 'jour-partie.json'), JSON.stringify(marks, null, 1));
const segments = JSON.parse(readFileSync('src/promo/jour-partie.json', 'utf8')).segments;
const still = (time, name) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(time), '-i', out, '-frames:v', '1', join(dir, name)]);
still(segments[0].from, 'jour-debut.png');
still(segments[segments.length - 1].to, 'jour-fin.png');
console.log(`Partie enregistrée : ${out}`);
