// node valide.mjs gre|lez|lyc|intro|fin   (ou sans argument : le film entier, piece.html)
// Tableau des plans d'un segment avec les contrôles de GUIDE.md : le premier plan commence à SEG.t0, les plans se suivent, durée ≥ 0,8 s,
// chaque coupe tombe 0,05 à 0,15 s avant un début de mot (ou dans le silence de fin de phrase), événements dans leur plan et de types connus.
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import { pathToFileURL } from 'url'; import path from 'path';
import { CHROME } from './chrome.mjs';
const seg = process.argv[2] || null;
const page = seg ? `solo_${seg}.html` : 'piece.html';
if (seg && !fs.existsSync(page)) { console.error('lancer d\'abord : node solo.mjs ' + seg); process.exit(1); }
const exe = CHROME;
const br = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox'], protocolTimeout: 900000 });
const pg = await br.newPage(); pg.on('pageerror', e => console.error('PAGE ERROR', e.message));
await pg.goto(pathToFileURL(path.resolve(page)).href + '?render=1'); await pg.waitForFunction('window.READY===true', { timeout: 300000 });
const VOCAB = new Set(['ding', 'no', 'label', 'blip', 'counter', 'pop', 'scribble', 'page', 'scan', 'zoom', 'whoosh', 'reveal', 'suspense', 'wind', 'snowfall', 'frost', 'crack', 'drip', 'thaw', 'heartbeat', 'beep', 'flatline', 'glow', 'sparkle', 'ribbit', 'hop', 'step', 'sniff', 'squirt', 'splat', 'yelp', 'shake', 'sneeze', 'yip', 'run', 'ruler', 'bird', 'vote', 'endCard', 'logo', 'letters']);
const res = await pg.evaluate(() => {
  const words = WORDS.map(w => ({ w: w.w, t0: w.t0, t1: w.t1 }));
  const shots = SHOTS.filter(s => !s.id.startsWith('_')).map(s => ({
    id: s.id, t0: s.t0, t1: Math.min(s.t1, DUR), ev: (s.ev || []).map(([t, type, v]) => ({ t, type, v })), capY: s.capY || null,
  }));
  return { shots, words, seg: window.SOLO ? SEG[window.SOLO] : null, SEG, DUR, VOICE_END };
});
let warn = 0; const W = m => { warn++; console.log('  ⚠ ' + m); };
console.log('id'.padEnd(18) + 't0'.padStart(7) + 't1'.padStart(7) + 'durée'.padStart(7) + '  mot suivant (écart à la coupe)  événements');
res.shots.forEach((s, i) => {
  const next = res.words.find(w => w.t0 >= s.t0 - 0.02), d = next ? next.t0 - s.t0 : NaN, dur = s.t1 - s.t0;
  const types = {}; s.ev.forEach(e => { types[e.type] = (types[e.type] || 0) + 1; });
  console.log(s.id.padEnd(18) + s.t0.toFixed(2).padStart(7) + s.t1.toFixed(2).padStart(7) + dur.toFixed(2).padStart(7) + '  ' + (next ? (next.w + ' (+' + d.toFixed(2) + ')').padEnd(30) : ''.padEnd(30)) + Object.entries(types).map(([k, v]) => k + '×' + v).join(' '));
  if (dur < 0.8) W(`${s.id} : plan de ${dur.toFixed(2)} s (< 0,8 s)`);
  if (i > 0 && s.t0 > 0.5) { const inSilence = !res.words.some(w => w.t0 < s.t0 && w.t1 > s.t0 + 0.02); if (!(d >= 0.04 && d <= 0.18) && !(inSilence && d > 0.18)) W(`${s.id} : la coupe tombe ${isNaN(d) ? '?' : d.toFixed(2)} s avant le mot suivant et ${inSilence ? 'dans un silence' : 'au milieu d\'un mot'} (visé : 0,05 à 0,15 s avant un début de mot)`); }
  for (const e of s.ev) {
    if (!VOCAB.has(e.type)) W(`${s.id} : type d'événement inconnu « ${e.type} » (à décrire dans son_<segment>.md)`);
    if (e.t < s.t0 - 0.01 || e.t > s.t1 + 0.01) W(`${s.id} : événement ${e.type} à ${e.t.toFixed(2)} s hors du plan (${s.t0.toFixed(2)}–${s.t1.toFixed(2)})`);
  }
});
const segs = seg ? [[seg, res.seg]] : Object.entries(res.SEG).filter(([k]) => !['kit', 'flore'].includes(k));
for (const [name, S] of segs) {
  const mine = res.shots.filter(s => s.t0 >= S.t0 - 0.01 && s.t0 < S.t1 - 0.01);
  if (!mine.length) { if (seg) W(`segment ${name} : aucun plan`); continue; }
  if (Math.abs(mine[0].t0 - S.t0) > 0.011) W(`segment ${name} : le premier plan commence à ${mine[0].t0.toFixed(2)} s au lieu de ${S.t0.toFixed(2)} s`);
  const last = mine[mine.length - 1];
  if (Math.abs(last.t1 - S.t1) > 0.011 && seg) W(`segment ${name} : le dernier plan finit à ${last.t1.toFixed(2)} s au lieu de ${S.t1.toFixed(2)} s`);
  console.log(`segment ${name} : ${S.t0.toFixed(2)} → ${S.t1.toFixed(2)} (${(S.t1 - S.t0).toFixed(1)} s), ${mine.length} plans`);
}
console.log(warn ? `${warn} avertissement(s)` : 'aucun avertissement');
await br.close();
