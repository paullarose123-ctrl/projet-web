// PAGE=solo_gre.html OUT=build/gre node strip.mjs plan [n=8] [dt=0.25] [début en s depuis le début du plan]  — une bande d'images successives d'un plan : build/strip_<plan>.png (contrôle du mouvement)
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import { pathToFileURL } from 'url'; import path from 'path'; import { spawnSync } from 'child_process';
const [id, n = 8, dt = 0.25, off = 0] = process.argv.slice(2);
const exe = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => fs.existsSync(p));
const br = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message));
await pg.goto(pathToFileURL(path.resolve(process.env.PAGE || 'piece.html')).href + '?render=1'); await pg.waitForFunction('window.READY===true', { timeout: 300000 });
const t0 = await pg.evaluate(id => (SHOTS.find(s => s.id === id) || {}).t0, id);
if (t0 == null) { console.log('plan inconnu'); process.exit(1); }
const OUT = process.env.OUT || 'build';
fs.mkdirSync(OUT + '/strip_tmp', { recursive: true });
for (let k = 0; k < +n; k++) {
  const f = Math.round((t0 + +off + k * +dt) * 30);
  const url = await pg.evaluate(f => { render(f); return document.querySelector('canvas').toDataURL('image/png'); }, f);
  fs.writeFileSync(`${OUT}/strip_tmp/f${String(k).padStart(2, '0')}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
await br.close();
spawnSync('python3', ['-c', `
from PIL import Image
import glob
fs=sorted(glob.glob('${OUT}/strip_tmp/f*.png'))
ims=[Image.open(f).resize((216,384),Image.NEAREST) for f in fs]
sh=Image.new('RGB',(216*len(ims),384))
for i,im in enumerate(ims): sh.paste(im,(i*216,0))
sh.save('${OUT}/strip_${id}.png')
`]);
fs.readdirSync(OUT + '/strip_tmp').forEach(f => fs.unlinkSync(OUT + '/strip_tmp/' + f)); fs.rmdirSync(OUT + '/strip_tmp');
console.log(OUT + '/strip_' + id + '.png');
