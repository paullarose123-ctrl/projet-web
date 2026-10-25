import puppeteer from 'puppeteer-core'; import { pathToFileURL } from 'url'; import path from 'path';
import { CHROME } from './chrome.mjs';
const br = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message));
await pg.goto(pathToFileURL(path.resolve('pa_lab.html')).href + '?render=1'); await pg.waitForFunction('window.READY===true', { timeout: 300000 });
const res = await pg.evaluate(() => {
  const f0 = Math.round((SHOTS.find(s => s.id === 'lab').t0 + 0.4) * FPS), out = [], times = {};
  for (const k of Object.keys(PA_FUZZ)) for (const env of ['matin', 'soir', 'crepuscule']) for (const t of [0, 0.033, 1.7, 33.3, 123.456, 1000.9]) {
    window.LAB = { name: 'fuzz_' + k, o: { env }, t };
    const a = performance.now();
    try { render(f0); } catch (e) { out.push(`${k} ${env} t=${t}: ${e.message} ${(e.stack || '').split('\n')[1] || ''}`); }
    times[k] = Math.max(times[k] || 0, performance.now() - a);
  }
  return { out, times };
});
console.log('erreurs :', res.out.length); for (const e of res.out.slice(0, 20)) console.log(e);
console.log(Object.entries(res.times).map(([k, v]) => k + ' ' + v.toFixed(0)).join(' | '));
await br.close();
