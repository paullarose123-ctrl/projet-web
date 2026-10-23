// PAGE=solo_fin.html node still.mjs <t en s depuis le début du film> [x y w h en pixels du canevas 270×480] [sortie.png] — une image pleine définition (×4), éventuellement recadrée
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import { pathToFileURL } from 'url'; import path from 'path'; import { spawnSync } from 'child_process';
import { CHROME } from './chrome.mjs';
const [t, x = 0, y = 0, w = 270, h = 480, out = 'build/still.png'] = process.argv.slice(2);
const br = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message));
await pg.goto(pathToFileURL(path.resolve(process.env.PAGE || 'piece.html')).href + '?render=1'); await pg.waitForFunction('window.READY===true', { timeout: 300000 });
const url = await pg.evaluate(f => { render(f); return document.querySelector('canvas').toDataURL('image/png'); }, Math.round(+t * 30));
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
await br.close();
spawnSync('python3', ['-c', `from PIL import Image
im=Image.open('${out}'); im.crop((${x}*4,${y}*4,(${x}+${w})*4,(${y}+${h})*4)).save('${out}')`]);
console.log(out);
