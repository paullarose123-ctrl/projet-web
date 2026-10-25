import puppeteer from 'puppeteer-core'; import { pathToFileURL } from 'url'; import path from 'path';
import { CHROME } from './chrome.mjs';
const br = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message)); pg.on('console', m => console.log('console', m.type(), m.text())); pg.on('requestfailed', r => console.log('reqfail', r.url()));
await pg.goto(pathToFileURL(path.resolve('ho_lab.html')).href + '?render=1');
await new Promise(r => setTimeout(r, 8000));
console.log(await pg.evaluate(() => ({ ready: window.READY, shots: typeof SHOTS !== 'undefined' ? SHOTS.length : -1 })));
await br.close();
