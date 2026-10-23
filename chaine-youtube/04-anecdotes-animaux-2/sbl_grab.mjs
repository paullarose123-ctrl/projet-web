// outil temporaire (à supprimer) : PAGE=solo_sbl.html node sbl_grab.mjs sortie scale plan@u [plan@u ...]
// sauve des images basse résolution (270x480 agrandies) ; plan@u = secondes depuis le début du plan ; "t=12.5" = temps absolu
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import { pathToFileURL } from 'url'; import path from 'path';
import { CHROME } from './chrome.mjs';
const [out, scale, ...specs] = process.argv.slice(2);
const br = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message));
pg.on('console', m => { if (m.type() === 'error') console.log('page:', m.text()); });
await pg.goto(pathToFileURL(path.resolve(process.env.PAGE || 'solo_sbl.html')).href + '?render=1'); await pg.waitForFunction('window.READY===true', { timeout: 300000 });
const sc = +scale || 3;
let k = 0; const files = [];
for (const sp of specs) {
  const [id, us] = sp.split('@');
  const url = await pg.evaluate(([id, u, sc]) => {
    let t; if (id === 't') t = u; else { const S = SHOTS.find(s => s.id === id); if (!S) return 'ERR plan inconnu ' + id; t = S.t0 + u; }
    const t0 = performance.now(); render(Math.round(t * 30));
    const c = document.createElement('canvas'); c.width = 270 * sc; c.height = 480 * sc; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(low, 0, 0, 270 * sc, 480 * sc);
    window.__ms = performance.now() - t0; return c.toDataURL('image/png');
  }, [id, +us, sc]);
  if (url.startsWith('ERR')) { console.log(url); continue; }
  const f = `${out}_${String(k++).padStart(2, '0')}.png`; fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); files.push(f);
  console.log(f, sp, (await pg.evaluate(() => window.__ms)).toFixed(0) + ' ms');
}
await br.close();
