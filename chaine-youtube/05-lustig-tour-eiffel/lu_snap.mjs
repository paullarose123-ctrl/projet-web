// node lu_snap.mjs '<json jobs>'  — jobs: [{sheet, t, out, crop:[x,y,w,h], zoom, args}] ; produit des PNG ; chaque job : appelle window.lu_sheet(sheet, t, args) puis quantize()
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import { pathToFileURL } from 'url'; import path from 'path';
import { CHROME } from './chrome.mjs';
const jobs = JSON.parse(process.argv[2].startsWith('@') ? fs.readFileSync(process.argv[2].slice(1), 'utf8') : process.argv[2]);
const br = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message)); pg.on('console', m => { if (m.type() === 'error' || m.text().startsWith('LU:')) console.log('console:', m.text()); });
await pg.setViewport({ width: 1100, height: 1950 });
await pg.goto(pathToFileURL(path.resolve('lu_lab.html')).href);
await pg.waitForFunction('window.LU_READY===true||window.LU_ERR', { timeout: 120000 });
const err = await pg.evaluate('window.LU_ERR||null'); if (err) { console.error('ERREUR', err); await br.close(); process.exit(1); }
for (const j of jobs) {
  const r = await pg.evaluate(j => window.lu_snap(j), j);
  if (r.err) { console.error('job', j.out, 'ERREUR', r.err); continue; }
  fs.mkdirSync(path.dirname(j.out), { recursive: true }); fs.writeFileSync(j.out, Buffer.from(r.url.split(',')[1], 'base64'));
  console.log(j.out, r.ms != null ? r.ms.toFixed(1) + ' ms' : '');
}
await br.close();
