// node ho_view.mjs sortie.png "scene@u[:x,y,w,h][:z]" ...  — planche de contact (banc d'essai ho_lab.html)
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import { pathToFileURL } from 'url'; import path from 'path'; import { spawnSync } from 'child_process';
import { CHROME } from './chrome.mjs';
const [out, ...specs] = process.argv.slice(2);
const br = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message)); pg.on('console', m => { if (m.type() === 'error') console.log('page:', m.text()); });
await pg.goto(pathToFileURL(path.resolve('ho_lab.html')).href + '?render=1'); await pg.waitForFunction('window.READY===true', { timeout: 300000 });
const dir = 'build/ho_tmp'; fs.mkdirSync(dir, { recursive: true });
const items = [];
let k = 0;
for (const sp of specs) {
  const [a, crop, z] = sp.split(':'); const [name, u = '0'] = a.split('@');
  if (name === 'time') { const [sc, uu, n] = [crop, z, 10]; console.log('ms', await pg.evaluate((s, u, n) => hoTime(s, u, n), sc, +uu || 0, n)); continue; }
  const url = await pg.evaluate((n, u) => hoRender(n, u), name, +u);
  const f = `${dir}/i${k++}.png`; fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
  items.push({ f, crop: crop ? crop.split(',').map(Number) : [0, 0, 270, 480], z: +(z || 0) });
}
await br.close();
fs.writeFileSync(`${dir}/items.json`, JSON.stringify(items));
spawnSync('python3', ['-c', `
import json
from PIL import Image
it=json.load(open('${dir}/items.json'))
ims=[]
for i in it:
    im=Image.open(i['f']).convert('RGB'); x,y,w,h=i['crop']
    im=im.crop((x*4,y*4,(x+w)*4,(y+h)*4))
    z=i['z'] or (0.5 if w*h>40000 else 1)
    z=z/1.0
    # i['z'] is the final scale relative to 4x native: z=1 -> x4
    im=im.resize((max(1,int(im.width*z/1)),max(1,int(im.height*z/1))),Image.NEAREST)
    ims.append(im)
W=sum(i.width for i in ims)+4*(len(ims)-1); H=max(i.height for i in ims)
sh=Image.new('RGB',(W,H),(40,40,40)); x=0
for im in ims: sh.paste(im,(x,0)); x+=im.width+4
sh.save('${out}')
import os,glob
for f in glob.glob('${dir}/*'): os.remove(f)
`]);
try { fs.rmdirSync(dir); } catch (e) { }
console.log(out);
