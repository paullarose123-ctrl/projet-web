// Lit les événements et la liste des plans déclarés par les artistes SANS écrire build/events.json (qui appartient au chef de projet) : écrit build/test/events_plans.json
//   node son_events.mjs [page = piece.html]
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import { pathToFileURL } from 'url'; import path from 'path'; import { CHROME } from './chrome.mjs';
const page = process.argv[2] || 'piece.html';
const br = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message));
await pg.goto(pathToFileURL(path.resolve(page)).href + '?render=1'); await pg.waitForFunction('window.READY===true', { timeout: 300000 });
const r = await pg.evaluate(() => ({ dur: window.DUR, fps: FPS, events: window.EVENTS, shots: window.SHOTLIST }));
fs.mkdirSync('build/test', { recursive: true }); fs.writeFileSync('build/test/events_plans.json', JSON.stringify(r, null, 1));
const c = {}; for (const e of r.events) c[e.type] = (c[e.type] || 0) + 1; console.log('plans :', r.shots.length, '| événements :', r.events.length, '| durée', r.dur.toFixed(2), '\n', JSON.stringify(c));
await br.close();
