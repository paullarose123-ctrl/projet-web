// Rend la vidéo de la Série 2 (Mexique) au format TikTok : 1080 × 1920, 30 images/s, avec sa musique.
// Prérequis : le serveur de développement lancé (npm run dev), Playwright et ffmpeg installés.
//   node scripts/promo/mexique.mjs [--url http://localhost:5173/promo/mexique.html] [--out promo-mexique.mp4]
//   node scripts/promo/mexique.mjs --apercu 0,3,9,12.5,19   (quelques images seulement, pour vérifier)

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const url = `${arg('url', 'http://localhost:5173/promo/mexique.html')}?capture`;
const out = arg('out', 'promo-mexique.mp4');
const fps = Number(arg('fps', '30'));
const preview = arg('apercu', '');
const work = arg('dossier', join(tmpdir(), 'animalcards-promo'));

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
await page.goto(url);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
const duration = await page.evaluate(() => window.__promo.duration);

if (preview) {
  mkdirSync(work, { recursive: true });
  for (const t of preview.split(',').map(Number)) {
    await page.evaluate((time) => window.__promo.frame(time), t);
    await page.screenshot({ path: join(work, `apercu-${String(t).replace('.', '_')}.png`) });
  }
  console.log(`Aperçus dans ${work}`);
  await browser.close();
  process.exit(0);
}

rmSync(work, { recursive: true, force: true });
mkdirSync(join(work, 'images'), { recursive: true });
writeFileSync(join(work, 'musique.wav'), Buffer.from(await page.evaluate(() => window.__promo.audio()), 'base64'));
const frames = Math.round(duration * fps);
for (let i = 0; i < frames; i++) {
  await page.evaluate((time) => window.__promo.frame(time), i / fps);
  await page.screenshot({ path: join(work, 'images', `${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
  if (i % 60 === 0) console.log(`image ${i} / ${frames}`);
}
await browser.close();

execFileSync(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(work, 'images', '%05d.jpg'), '-i', join(work, 'musique.wav'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
    '-movflags', '+faststart', '-shortest', out],
  { stdio: 'inherit' },
);
console.log(`Vidéo : ${out}`);
