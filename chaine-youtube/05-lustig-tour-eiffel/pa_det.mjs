import puppeteer from 'puppeteer-core'; import { pathToFileURL } from 'url'; import path from 'path'; import crypto from 'crypto';
import { CHROME } from './chrome.mjs';
async function run(order) {
  const br = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
  const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await pg.goto(pathToFileURL(path.resolve('pa_lab.html')).href + '?render=1'); await pg.waitForFunction('window.READY===true', { timeout: 300000 });
  const res = await pg.evaluate((order) => {
    const f0 = Math.round((SHOTS.find(s => s.id === 'lab').t0 + 0.4) * FPS), out = {};
    const keys = Object.keys(PA_FUZZ); const seq = order === 'rev' ? keys.slice().reverse() : keys;
    for (const k of seq) for (const env of ['matin', 'crepuscule']) { window.LAB = { name: 'fuzz_' + k, o: { env }, t: 2.3 }; render(f0); const d = document.querySelector('canvas').toDataURL('image/png'); let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d.charCodeAt(i)) | 0; out[k + '|' + env] = h; }
    return out;
  }, order);
  await br.close(); return res;
}
const a = await run('fwd'), b = await run('rev'); let bad = 0;
for (const k of Object.keys(a)) if (a[k] !== b[k]) { console.log('DIFFERENT', k); bad++; }
console.log('éléments comparés :', Object.keys(a).length, ' différents :', bad);
