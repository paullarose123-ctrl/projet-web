// node render.mjs piece.html out.mp4 [fromSec toSec]   |   node render.mjs piece.html --stills 0.5 3 7   |   node render.mjs piece.html --events
// Rend piece.html image par image avec le Chrome/Chromium installé, puis encode avec ffmpeg.
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import { spawn } from 'child_process'; import { pathToFileURL } from 'url'; import path from 'path';
const [page, out, ...rest] = process.argv.slice(2);
const exe = [process.env.CHROME, process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => p && fs.existsSync(p));
const br = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
const pg = await br.newPage(); pg.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exit(1) });
pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('page:', m.text()) });
await pg.goto(pathToFileURL(path.resolve(page)).href + '?render=1'); await pg.waitForFunction('window.READY===true', { timeout: 300000 });
const { FPS: fps, NF: nf } = await pg.evaluate(() => ({ FPS, NF }));
const grab = async f => Buffer.from((await pg.evaluate(f => { render(f); return document.querySelector('canvas').toDataURL('image/png') }, f)).split(',')[1], 'base64');
if (out === '--events') { fs.mkdirSync('build', { recursive: true }); fs.writeFileSync('build/events.json', JSON.stringify(await pg.evaluate(() => ({ dur: window.DUR, fps: FPS, events: window.EVENTS })), null, 1)); }
else if (out === '--stills') { fs.mkdirSync('build/stills', { recursive: true }); for (const s of rest) fs.writeFileSync(`build/stills/s_${s}.png`, await grab(Math.round(+s * fps))); }
else { const [a, b] = rest.map(Number), f0 = a ? Math.round(a * fps) : 0, f1 = b ? Math.min(nf, Math.round(b * fps)) : nf;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = f0; f < f1; f++) { if (!ff.stdin.write(await grab(f))) await new Promise(r => ff.stdin.once('drain', r)); if (f % 60 === 0) console.log('frame', f); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); }
await br.close();
