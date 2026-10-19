// node check.mjs [pas en images]  — dessine des images tout au long du film sans rien écrire : repère les erreurs de dessin et mesure le temps par plan
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import { pathToFileURL } from 'url'; import path from 'path';
const step = +(process.argv[2] || 6);
const exe = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => fs.existsSync(p));
const br = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message));
await pg.goto(pathToFileURL(path.resolve(process.env.PAGE || 'piece.html')).href + '?render=1'); await pg.waitForFunction('window.READY===true', { timeout: 300000 });
const res = await pg.evaluate((step) => {
  const out = [], times = {};
  for (let f = 0; f < NF; f += step) {
    const S = shotAt(f / FPS), t0 = performance.now();
    try { render(f); } catch (e) { out.push(`f=${f} t=${(f / FPS).toFixed(2)} ${S.id}: ${e.message}`); }
    times[S.id] = Math.max(times[S.id] || 0, performance.now() - t0);
  }
  return { out, times, n: SHOTS.length, NF };
}, step);
console.log('plans :', res.n, ' images :', res.NF, ' erreurs :', res.out.length);
for (const e of res.out.slice(0, 20)) console.log(e);
const slow = Object.entries(res.times).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v.toFixed(0)} ms`).join(' | ');
console.log('plus lents :', slow);
await br.close();
