// node bords.mjs  — repère les textes pixel dessinés en dehors du cadre (à n'importe quel moment du film)
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import { pathToFileURL } from 'url'; import path from 'path';
import { CHROME } from './chrome.mjs';
const exe = CHROME;
const br = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message));
await pg.goto(pathToFileURL(path.resolve(process.env.PAGE || 'piece.html')).href + '?render=1'); await pg.waitForFunction('window.READY===true', { timeout: 300000 });
const res = await pg.evaluate(() => {
  const seen = {}, orig = ptext;
  window.ptext = function (s, x, y, col, sc = 1, outline, n = Infinity) {
    const shown = String(s).slice(0, Math.min(String(s).length, n)), w = textW(String(s), sc);
    if (n > 0 && (x < 0 || x + w > LW || y < 0 || y + 7 * sc > LH)) { const S = shotAt(window.__t); const k = S.id + ' « ' + s + ' » x=' + Math.round(x) + '..' + Math.round(x + w); seen[k] = (seen[k] || 0) + 1; }
    return orig.apply(this, arguments);
  };
  for (let f = 0; f < NF; f += 3) { window.__t = f / FPS; render(f); }
  return seen;
});
const keys = Object.keys(res); console.log(keys.length ? keys.join('\n') : 'aucun texte hors cadre');
await br.close();
