// Montage de la pub « 30 jours » : incruste la vraie partie (promo/captures/jour-partie.mp4, enregistrée par
// scripts/promo/captures-jour.mjs) dans l'écran du téléphone de la vidéo rendue par scripts/promo/video.mjs.
// Les extraits gardés, leur vitesse et leurs légendes sont dans src/promo/jour-partie.json ; l'heure d'arrivée et la
// position de l'écran sont lues sur la page (window.__jour), pour rester calées sur la vidéo.
// Prérequis : npm run dev, Playwright et ffmpeg.
//   node scripts/promo/jour-montage.mjs --video promo-30-jours-sans-jeu.mp4 --out promo-30-jours.mp4

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const arg = (name, fallback) => {
  const i = process.argv.lastIndexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const url = arg('url', 'http://localhost:5173/promo/jour.html');
const video = arg('video', 'promo-30-jours-sans-jeu.mp4');
const partie = arg('partie', 'promo/captures/jour-partie.mp4');
const out = arg('out', 'promo-30-jours.mp4');
const SCALE = 2; // la page fait 540 × 960, la vidéo 1080 × 1920

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
await page.goto(`${url}?capture`);
const { clipAt, clipLength, screen } = await page.evaluate(() => window.__jour);
await browser.close();

const { segments } = JSON.parse(readFileSync('src/promo/jour-partie.json', 'utf8'));
const w = screen.w * SCALE;
const h = screen.h * SCALE;
const r = 24 * SCALE; // coins de l'écran (voir .jour__phone img)
const parts = segments.map(
  (s, i) => `[1:v]trim=start=${s.from}:end=${s.to},setpts=(PTS-STARTPTS)/${s.speed},fps=30,scale=${w}:${h}[s${i}]`,
);
const filter = [
  ...parts,
  `${segments.map((_, i) => `[s${i}]`).join('')}concat=n=${segments.length}:v=1:a=0,format=yuva420p[clip]`,
  `color=black:s=${w}x${h}:d=${clipLength + 1},format=gray,geq=lum='255*lte(hypot(max(0\\,max(${r}-X\\,X-(W-1-${r})))\\,max(0\\,max(${r}-Y\\,Y-(H-1-${r}))))\\,${r})'[mask]`,
  `[clip][mask]alphamerge,setpts=PTS+${clipAt}/TB[ecran]`,
  `[0:v][ecran]overlay=${screen.x * SCALE}:${screen.y * SCALE}:enable='between(t,${clipAt},${clipAt + clipLength})':eof_action=pass[v]`,
].join(';');

execFileSync(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-i', video, '-i', partie, '-filter_complex', filter, '-map', '[v]', '-map', '0:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', out],
  { stdio: 'inherit' },
);
console.log(`Vidéo : ${out} (partie incrustée de ${clipAt.toFixed(2)} s à ${(clipAt + clipLength).toFixed(2)} s)`);
