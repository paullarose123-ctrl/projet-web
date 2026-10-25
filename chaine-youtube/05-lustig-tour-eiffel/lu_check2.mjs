import puppeteer from 'puppeteer-core'; import { pathToFileURL } from 'url'; import path from 'path';
import { CHROME } from './chrome.mjs';
const br = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'] });
const pg = await br.newPage(); pg.on('pageerror', e => console.log('PAGE ERROR', e.message)); pg.on('console', m => { if (m.type() === 'error') console.log('console error', m.text()); });
await pg.goto(pathToFileURL(path.resolve('lu_lab2.html')).href); await new Promise(r => setTimeout(r, 1500));
console.log('OK =', await pg.evaluate('window.OK'), ' DONE =', await pg.evaluate('window.DONE'));
await br.close();
