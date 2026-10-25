import puppeteer from 'puppeteer-core'; import { pathToFileURL } from 'url'; import path from 'path';
import { CHROME } from './chrome.mjs';
const br = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message));
await pg.goto(pathToFileURL(path.resolve('ho_lab.html')).href + '?render=1');
await pg.waitForFunction('window.READY===true', { timeout: 120000 });
const out = await pg.evaluate(() => { const r = []; for (const id of ['lab_p5', 'lab_fuzz5', 'lab_p1']) { const s = SHOTS.find(x => x.id === id); for (let k = 0; k < 6; k++) { const f = Math.round((s.t0 + k * 0.3) * 30), t0 = performance.now(); render(f); r.push(id + ' ' + k + ' ' + (performance.now() - t0).toFixed(1)); } } return r; });
console.log(out.join('\n'));
await br.close();
