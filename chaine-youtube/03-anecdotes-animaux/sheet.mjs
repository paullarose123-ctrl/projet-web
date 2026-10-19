// node sheet.mjs [fraction] [dossier]  — une image par plan (à la fraction donnée de sa durée, 0,55 par défaut) dans build/sheet/ (ou le dossier donné), pour contrôler le film d'un coup d'œil
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import { pathToFileURL } from 'url'; import path from 'path';
const frac = +(process.argv[2] || 0.55), OUT = process.argv[3] || 'build/sheet';
const exe = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => fs.existsSync(p));
const br = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message));
await pg.goto(pathToFileURL(path.resolve(process.env.PAGE || 'piece.html')).href + '?render=1'); await pg.waitForFunction('window.READY===true', { timeout: 300000 });
const shots = await pg.evaluate(() => SHOTS.map(s => ({ id: s.id, t0: s.t0, t1: Math.min(s.t1, DUR) })));
fs.mkdirSync(OUT, { recursive: true });
let i = 0;
for (const s of shots) {
  const t = s.t0 + (s.t1 - s.t0) * frac, f = Math.round(t * 30);
  const url = await pg.evaluate(f => { render(f); return document.querySelector('canvas').toDataURL('image/png'); }, f);
  fs.writeFileSync(`${OUT}/${String(i).padStart(2, '0')}_${s.id}.png`, Buffer.from(url.split(',')[1], 'base64')); i++;
}
console.log(shots.map((s, k) => `${k} ${s.id} ${s.t0.toFixed(2)}-${s.t1.toFixed(2)}`).join('\n'));
await br.close();
