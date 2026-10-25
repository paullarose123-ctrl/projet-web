// pa_view.mjs : banc d'essai de sc_paris_sprites.js (à supprimer à la fin)
// node pa_view.mjs jobs.json   où jobs = [{ name, o, t, out, crop:[x,y,w,h], scale }]  (une seule ouverture de Chrome)
// name = clé de PA_LAB (pa_lab.js) ; t = temps d'animation ; o = options ; scale = agrandissement final (défaut 4, 1 = taille du canevas 270×480)
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import { pathToFileURL } from 'url'; import path from 'path'; import { spawnSync } from 'child_process';
import { CHROME } from './chrome.mjs';
const jobs = JSON.parse(fs.readFileSync(process.argv[2] || 'pa_jobs.json', 'utf8'));
const br = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message)); pg.on('console', m => { if (m.type() === 'error' || m.type() === 'log') console.log('page:', m.text()); });
await pg.goto(pathToFileURL(path.resolve('pa_lab.html')).href + '?render=1'); await pg.waitForFunction('window.READY===true', { timeout: 300000 });
const f0 = await pg.evaluate(() => Math.round((SHOTS.find(s => s.id === 'lab').t0 + 0.4) * FPS));
for (const j of jobs) {
  const r = await pg.evaluate(({ f, name, o, t }) => {
    window.LAB = { name, o: o || {}, t }; const t0 = performance.now(); let err = null;
    try { render(f); } catch (e) { err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
    return { url: document.querySelector('canvas').toDataURL('image/png'), ms: performance.now() - t0, err };
  }, { f: f0, name: j.name, o: j.o, t: j.t ?? 0 });
  if (r.err) console.log('ERREUR', j.name, r.err);
  const out = j.out || `build/pa/${j.name}.png`; fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64'));
  const [x, y, w, h] = j.crop || [0, 0, 270, 480], sc = j.scale ?? 4;
  spawnSync('python3', ['-c', `from PIL import Image
im=Image.open('${out}'); im=im.crop((${x}*4,${y}*4,(${x}+${w})*4,(${y}+${h})*4))
s=${sc}
if s!=4: im=im.resize((int(im.width*s/4),int(im.height*s/4)),Image.NEAREST)
im.save('${out}')`]);
  console.log(out, r.ms.toFixed(0) + ' ms');
}
await br.close();
