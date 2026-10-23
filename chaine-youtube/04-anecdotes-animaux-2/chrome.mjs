// Chemin du Chrome / Chromium / Edge installé (Linux, macOS, Windows) ; sinon définir la variable CHROME.
import fs from 'fs';
const e = process.env;
export const CHROME = [e.CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
  e.LOCALAPPDATA && e.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
if (!CHROME) throw new Error('Chrome / Chromium introuvable : installer Chrome ou définir CHROME=/chemin/vers/chrome');
