import puppeteer from 'puppeteer-core'; import fs from 'fs'; import { pathToFileURL } from 'url'; import path from 'path';
import { CHROME } from './chrome.mjs';
const names = JSON.parse(process.argv[2]);
const br = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message));
await pg.goto(pathToFileURL(path.resolve('pa_lab.html')).href + '?render=1'); await pg.waitForFunction('window.READY===true', { timeout: 300000 });
const f0 = await pg.evaluate(() => Math.round((SHOTS.find(s => s.id === 'lab').t0 + 0.4) * FPS));
for (const [name, o] of names) {
  const r = await pg.evaluate(({ f, name, o }) => { window.LAB = { name, o, t: 1 }; const a = performance.now(); render(f); const cold = performance.now() - a; let tot = 0, mx = 0; for (let i = 1; i <= 12; i++) { window.LAB.t = 1 + i * 0.37; const b = performance.now(); render(f); const d = performance.now() - b; tot += d; mx = Math.max(mx, d); } return { cold, avg: tot / 12, mx }; }, { f: f0, name, o });
  console.log(name.padEnd(10), JSON.stringify(o).slice(0, 40).padEnd(42), 'froid', r.cold.toFixed(0).padStart(4), 'ms  moyen', r.avg.toFixed(1).padStart(5), ' max', r.mx.toFixed(1).padStart(5));
}
await br.close();
