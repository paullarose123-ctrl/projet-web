// node score.mjs build/score.wav   (écrit aussi build/score_music.wav et build/score_sfx.wav : la musique est baissée sous la voix au mixage, pas les bruitages)
// Musique et bruitages synthétisés (aucun fichier, aucun droit), calés sur les mêmes temps que l'image (vidéo 2) :
// build/events.json (node render.mjs piece.html --events) et build/timeline.json (voix.py).
import fs from 'fs';
const OUT = process.argv[2] || 'build/score.wav';
const SR = 48000;
const EV = JSON.parse(fs.readFileSync('build/events.json', 'utf8'));
const TLJ = JSON.parse(fs.readFileSync('build/timeline.json', 'utf8'));
const DUR = EV.dur, N = Math.ceil((DUR + 0.3) * SR);
const mk = () => ({ L: new Float32Array(N), R: new Float32Array(N), SL: new Float32Array(N), SR: new Float32Array(N) });
const BUS = { music: mk(), sfx: mk() };
let B = BUS.music;
const P = {}; TLJ.phrases.forEach(p => P[p.id] = p);
const evs = type => EV.events.filter(e => e.type === type);
const at = type => { const e = evs(type)[0]; if (!e) throw new Error('événement manquant : ' + type); return e.t; };
const END = TLJ.phrases[TLJ.phrases.length - 1].t1, VOICE_END = END;
const norm = s => s.toLowerCase().replace(/[.,:;!?…]/g, '');
const wt = (id, txt, k = 0) => { const w = P[id].words.filter(w => norm(w.w) === norm(txt))[k]; if (!w) throw new Error('mot ' + id + ' ' + txt); return w.t0; };
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const NOTE = n => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); if (!m) throw new Error('note inconnue : ' + n);
  const st = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * Math.pow(2, (12 * (+m[3] + 1) + st - 69) / 12);
};
const TAU = Math.PI * 2;
function put(i, v, pan, send) {
  if (i < 0 || i >= N) return;
  const l = v * Math.cos((pan + 1) * Math.PI / 4), r = v * Math.sin((pan + 1) * Math.PI / 4);
  B.L[i] += l; B.R[i] += r; B.SL[i] += l * send; B.SR[i] += r * send;
}
const env = (x, a, d, len) => x < a ? x / a : x > len - d ? Math.max(0, (len - x) / d) : 1;

// ───────── instruments ─────────
function pad(t0, dur, notes, o = {}) {
  const { gain = 0.06, att = 1.2, rel = 1.5, det = 7, bright = 0.2, send = 0.5, trem = 0.18 } = o;
  const s0 = Math.floor(t0 * SR), len = Math.floor((dur + rel) * SR);
  notes.forEach((n, k) => {
    const f = typeof n === 'number' ? n : NOTE(n);
    const vs = [-det, 0, det].map(c => f * Math.pow(2, c / 1200));
    const ph = vs.map(() => rnd() * TAU), pans = [-0.55, 0, 0.55];
    for (let i = 0; i < len; i++) {
      const x = i / SR; let e = x < att ? sm(x / att) : x > dur ? Math.max(0, 1 - (x - dur) / rel) : 1; e = e * e;
      const tr = 1 + 0.12 * Math.sin(TAU * trem * x + k);
      for (let v = 0; v < 3; v++) {
        const p = ph[v] + TAU * vs[v] * x;
        put(s0 + i, gain * e * tr * (Math.sin(p) + bright * Math.sin(2 * p) * 0.5 + bright * 0.2 * Math.sin(3 * p)) / 3, pans[v] * 0.8, send);
      }
    }
  });
}
function sm(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
function pluck(t0, n, o = {}) {
  const { gain = 0.05, decay = 0.996, pan = 0, send = 0.4, len = 2.5, soft = 0.6 } = o;
  const f = typeof n === 'number' ? n : NOTE(n), m = Math.max(2, Math.round(SR / f)), buf = new Float32Array(m);
  let lp = 0; for (let i = 0; i < m; i++) { lp = lp * soft + (rnd() * 2 - 1) * (1 - soft); buf[i] = lp * 2; }
  const s0 = Math.floor(t0 * SR); let idx = 0;
  for (let i = 0; i < len * SR; i++) { const a = buf[idx], b = buf[(idx + 1) % m]; buf[idx] = (a + b) * 0.5 * decay; idx = (idx + 1) % m; put(s0 + i, a * gain * Math.min(1, i / 60), pan, send); }
}
function bell(t0, n, o = {}) {
  const { gain = 0.08, decay = 2.2, pan = 0, send = 0.6 } = o;
  const f = typeof n === 'number' ? n : NOTE(n), parts = [[1, 1], [2.0, 0.45], [2.76, 0.32], [4.07, 0.18], [5.4, 0.1]];
  const s0 = Math.floor(t0 * SR), len = Math.floor(decay * 2.5 * SR);
  for (let i = 0; i < len; i++) { const x = i / SR; let v = 0; for (const [r, a] of parts) v += a * Math.sin(TAU * f * r * x) * Math.exp(-x * r / decay); put(s0 + i, gain * v * Math.min(1, i / 40), pan, send); }
}
function blip(t0, f0, f1, dur, o = {}) {
  const { gain = 0.08, pan = 0, duty = 0.5, send = 0.25 } = o;
  const s0 = Math.floor(t0 * SR), len = Math.floor(dur * SR); let ph = 0, lp = 0;
  for (let i = 0; i < len; i++) {
    const x = i / len, f = f0 * Math.pow(f1 / f0, x); ph += f / SR; const sq = (ph % 1) < duty ? 1 : -1;
    lp += (sq - lp) * 0.35; put(s0 + i, gain * lp * Math.exp(-x * 3) * Math.min(1, i / 30), pan, send);
  }
}
function noise(t0, dur, o = {}) {
  const { f0 = 800, f1 = 800, q = 1.2, gain = 0.1, att = 0.05, rel = 0.3, type = 'bp', pan = 0, send = 0.4, panTo = null } = o;
  const s0 = Math.floor(t0 * SR), len = Math.floor(dur * SR); let lo = 0, bd = 0;
  for (let i = 0; i < len; i++) {
    const x = i / SR, u = i / len, fc = Math.min(9000, f0 * Math.pow(f1 / f0, u)), f = 2 * Math.sin(Math.PI * fc / SR);
    const inp = rnd() * 2 - 1; const hi = inp - lo - bd / q; bd += f * hi; lo += f * bd;
    const y = type === 'lp' ? lo : type === 'hp' ? hi : bd;
    put(s0 + i, gain * y * env(x, att, rel, dur), panTo === null ? pan : pan + (panTo - pan) * u, send);
  }
}
function sweep(t0, dur, f0, f1, o = {}) {
  const { gain = 0.2, att = 0.005, pan = 0, send = 0.3, curve = 1 } = o;
  const s0 = Math.floor(t0 * SR), len = Math.floor(dur * SR); let ph = 0;
  for (let i = 0; i < len; i++) { const u = i / len, f = f0 * Math.pow(f1 / f0, Math.pow(u, curve)); ph += TAU * f / SR; put(s0 + i, gain * Math.sin(ph) * Math.min(1, i / (att * SR + 1)) * Math.pow(1 - u, 1.5), pan, send); }
}
function thud(t0, g = 1) { sweep(t0, 0.5, 75, 30, { gain: 0.55 * g, send: 0.25 }); noise(t0, 0.25, { type: 'lp', f0: 400, f1: 120, gain: 0.35 * g, att: 0.002, rel: 0.2, send: 0.2 }); }
const FOOT_GAIN = 0.32;
function moan(t0, dur, pts, o = {}) { // chant de baleine
  const { gain = 0.05, pan = 0, send = 0.9 } = o;
  const s0 = Math.floor(t0 * SR), len = Math.floor(dur * SR); let ph = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len; let k = 0; while (k < pts.length - 2 && u > pts[k + 1][0]) k++;
    const a = pts[k], b = pts[k + 1], w = sm((u - a[0]) / (b[0] - a[0])), f = a[1] * Math.pow(b[1] / a[1], w) * (1 + 0.006 * Math.sin(TAU * 5 * i / SR));
    ph += TAU * f / SR; const e = Math.sin(Math.PI * u) ** 1.5;
    put(s0 + i, gain * e * (Math.sin(ph) + 0.35 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph)), pan, send);
  }
}
function bloops(t0, span, n, o = {}) { const { gain = 0.05, lo = 250, hi = 900 } = o; for (let k = 0; k < n; k++) { const t = t0 + rnd() * span, f = lo + rnd() * (hi - lo); sweep(t, 0.05 + rnd() * 0.05, f, f * 2.2, { gain, pan: rnd() * 1.6 - 0.8, send: 0.5, curve: 0.6 }); } }

// ───────── instruments supplémentaires ─────────
function buzz(t0, dur, o = {}) {                         // bourdonnement d'une mouche : scie vibrante, battement d'ailes à ~52 Hz
  const { gain = 0.06, f = 185, pan = -0.6, panTo = 0.3, send = 0.2 } = o;
  const s0 = Math.floor(t0 * SR), len = Math.floor(dur * SR); let ph = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len, fv = f * (1 + 0.07 * Math.sin(TAU * 9 * i / SR) + 0.03 * Math.sin(TAU * 23 * i / SR) + 0.25 * u);
    ph += TAU * fv / SR; const saw = ((ph / TAU) % 1) * 2 - 1, wing = 0.55 + 0.45 * Math.sin(TAU * 52 * i / SR);
    put(s0 + i, gain * saw * wing * env(u * dur, 0.05, 0.08, dur), pan + (panTo - pan) * u, send);
  }
}
function boing(t0, o = {}) {                             // ressort : sinus dont la hauteur oscille et retombe
  const { gain = 0.16, f = 270, dur = 1.1, pan = 0, send = 0.3 } = o;
  const s0 = Math.floor(t0 * SR), len = Math.floor(dur * SR); let ph = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len, w = 1 + 0.55 * Math.exp(-4 * u) * Math.sin(TAU * 13 * u * (1 + u)), fv = f * w * (1 - 0.35 * u);
    ph += TAU * fv / SR; put(s0 + i, gain * (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * Math.exp(-3.2 * u) * Math.min(1, i / 30), pan, send);
  }
}
function squeal(t0, dur, o = {}) {                       // crissement de freins : deux scies désaccordées qui glissent, plus un souffle
  const { gain = 0.07, f0 = 1500, f1 = 620, send = 0.35 } = o;
  const s0 = Math.floor(t0 * SR), len = Math.floor(dur * SR); let p1 = 0, p2 = 0, lo = 0, bd = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len, f = f0 * Math.pow(f1 / f0, u) * (1 + 0.025 * Math.sin(TAU * 11 * i / SR) + 0.012 * Math.sin(TAU * 37 * i / SR));
    p1 += f / SR; p2 += f * 1.013 / SR; const a = ((p1 % 1) * 2 - 1) + ((p2 % 1) * 2 - 1);
    const fc = 2 * Math.sin(Math.PI * Math.min(9000, 2600 - 1200 * u) / SR), inp = rnd() * 2 - 1, hi = inp - lo - bd / 6; bd += fc * hi; lo += fc * bd;
    put(s0 + i, gain * (a * 0.35 + bd * 1.3) * env(u * dur, 0.06, 0.25, dur), 0, send);
  }
}
function horn(t0, f0, f1, dur, o = {}) {                 // cuivre bouché : scie adoucie, vibrato lent, glissando (trombone « raté »)
  const { gain = 0.1, pan = 0, send = 0.3 } = o;
  const s0 = Math.floor(t0 * SR), len = Math.floor(dur * SR); let ph = 0, lp = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len, f = f0 * Math.pow(f1 / f0, u * u) * (1 + 0.018 * Math.sin(TAU * 5.2 * i / SR) * u);
    ph += f / SR; const saw = (ph % 1) * 2 - 1; lp += (saw - lp) * (0.08 + 0.1 * Math.sin(Math.PI * u));
    put(s0 + i, gain * lp * env(u * dur, 0.03, 0.08, dur), pan, send);
  }
}
function rumble(t0, dur, o = {}) { const { gain = 0.25 } = o; sweep(t0, dur * 0.7, 70, 32, { gain, send: 0.3 }); noise(t0, dur, { type: 'lp', f0: 380, f1: 70, q: 0.7, gain: gain * 0.9, att: 0.04, rel: dur * 0.7, send: 0.8 }); }
function wind(a, b, o = {}) { noise(a, b - a, { type: 'bp', f0: o.f0 ?? 420, f1: o.f1 ?? 300, q: 0.6, gain: o.gain ?? 0.045, att: 0.8, rel: 1.0, send: 0.25, pan: -0.5, panTo: 0.5 }); }
function room(a, b, o = {}) { noise(a, b - a, { type: 'lp', f0: o.f0 ?? 160, f1: o.f1 ?? 160, q: 0.7, gain: o.gain ?? 0.04, att: 0.6, rel: 0.8, send: 0.2 }); }
function rainBed(a, b, g = 0.05) { noise(a, b - a, { type: 'hp', f0: 5200, f1: 5200, q: 0.8, gain: g, att: 0.4, rel: 0.6, send: 0.3 }); noise(a, b - a, { type: 'bp', f0: 1500, f1: 1200, q: 0.5, gain: g * 0.5, att: 0.4, rel: 0.6, send: 0.3 }); }
function taps(a, b, n, g = 0.04) { for (let k = 0; k < n; k++) { const x = a + rnd() * (b - a); blip(x, 900 + rnd() * 700, 500, 0.012, { gain: g, pan: rnd() * 1.6 - 0.8, duty: 0.3 }); } }
function woodKnock(x, g = 0.12, f = 190) { noise(x, 0.07, { type: 'bp', f0: f * 1.6, f1: f, q: 2, gain: g, att: 0.001, rel: 0.05, send: 0.15 }); blip(x, f, f * 0.6, 0.05, { gain: g * 0.6, duty: 0.5 }); }

// ───────── harmonie : accords calés sur les phrases ─────────
const ch = (a, b, notes, o) => ({ a, b, notes, o });
const p0 = id => P[id].t0;
const t = { oui: p0('oui'), trois: p0('trois'), soie: p0('soie'), etire: p0('etire'), zoom: p0('zoom'), briques: p0('briques'), acier: p0('acier'), chocs: p0('chocs'), darwin: p0('darwin'), bas: p0('bas'), spag: p0('spaghetti'), metro: p0('metro'), bras: p0('bras'), prob: p0('probleme'), prot: p0('proteine'), app: p0('appetit'), fab: p0('fabrication'), jet: p0('jet'), pluie: p0('pluie'), gal: p0('galere'), ver: p0('verdict'), fic: p0('fiction'), labos: p0('labos'), bact: p0('bacteries'), coc: p0('cocon') };
const CHORDS = [
  ch(0, t.oui - 0.15, ['D2', 'A2', 'D3', 'F3', 'C4'], { gain: 0.062, bright: 0.25 }),
  ch(t.oui - 0.1, t.trois - 0.15, ['D3', 'F#3', 'A3', 'D4', 'E4'], { gain: 0.06, bright: 0.45, att: 0.2 }),
  ch(t.trois - 0.1, t.soie - 0.15, ['G2', 'D3', 'Bb3', 'F4'], { gain: 0.06, bright: 0.2 }),
  ch(t.soie - 0.1, t.etire - 0.1, ['D3', 'A3', 'E4', 'F4']),
  ch(t.etire - 0.1, t.zoom - 0.1, ['Bb2', 'F3', 'D4', 'A4']),
  ch(t.zoom - 0.1, t.briques - 0.1, ['G2', 'D3', 'Bb3', 'D4']),
  ch(t.briques - 0.1, t.acier - 0.1, ['A2', 'E3', 'C#4', 'G4']),
  ch(t.acier - 0.1, t.chocs - 0.1, ['F2', 'C3', 'A3', 'C4', 'E4']),
  ch(t.chocs - 0.1, t.darwin - 0.1, ['Bb2', 'D3', 'F3', 'A3', 'C4']),
  ch(t.darwin - 0.1, t.bas - 0.1, ['C3', 'G3', 'E4', 'B4', 'D4'], { gain: 0.058, bright: 0.4 }),
  ch(t.bas - 0.1, t.spag - 0.1, ['D2', 'A2', 'F3', 'D4'], { gain: 0.062 }),
  ch(t.spag - 0.1, t.metro - 0.1, ['F2', 'A2', 'C3', 'E4']),
  ch(t.metro - 0.1, wt('metro', 'ça') - 0.1, ['G2', 'D3', 'Bb3', 'Db4'], { gain: 0.06, bright: 0.1 }),
  ch(wt('metro', 'ça') - 0.1, t.bras - 0.1, ['D3', 'F#3', 'A3', 'D4'], { gain: 0.062, bright: 0.45 }),
  ch(t.bras - 0.1, t.prob - 0.1, ['Bb2', 'F3', 'D4', 'A3'], { gain: 0.05 }),
  ch(t.prob - 0.1, t.app - 0.1, ['D2', 'A2', 'D3', 'F3'], { gain: 0.062, bright: 0.1 }),
  ch(t.app - 0.1, t.fab - 0.1, ['Bb1', 'F2', 'D3', 'Bb3'], { gain: 0.06 }),
  ch(t.fab - 0.1, t.jet - 0.1, ['E2', 'B2', 'G3', 'D4'], { gain: 0.058, bright: 0.1 }),
  ch(t.jet - 0.1, t.pluie - 0.1, ['A2', 'E3', 'C#4', 'G4'], { gain: 0.058 }),
  ch(t.pluie - 0.1, t.gal - 0.1, ['D2', 'A2', 'F3', 'C4'], { gain: 0.062, bright: 0.05 }),
  ch(t.gal - 0.1, t.ver - 0.1, ['Bb2', 'F3', 'Db4', 'Ab3'], { gain: 0.05, bright: 0.1 }),
  ch(t.ver - 0.1, t.fic - 0.1, ['D3', 'F#3', 'A3', 'D4', 'E4'], { gain: 0.066, bright: 0.5 }),
  ch(t.fic - 0.1, t.labos - 0.1, ['B2', 'F#3', 'D4', 'A3'], { gain: 0.058, bright: 0.2 }),
  ch(t.labos - 0.1, t.bact - 0.1, ['G2', 'D3', 'A3', 'B3', 'D4'], { gain: 0.06, bright: 0.4 }),
  ch(t.bact - 0.1, t.coc - 0.1, ['E3', 'B3', 'G#4', 'D4'], { gain: 0.056, bright: 0.3 }),
  ch(t.coc - 0.1, END - 0.2, ['D3', 'A3', 'F#4', 'C#4'], { gain: 0.055, bright: 0.3 }),
  ch(END - 0.3, DUR - 1.0, ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], { gain: 0.075, bright: 0.45, rel: 1.2 }),
];
for (const c of CHORDS) pad(c.a, c.b - c.a, c.notes, { gain: 0.05, ...(c.o || {}) });
function chordAt(x) { let c = null; for (const k of CHORDS) if (x >= k.a && x < k.b) c = k; return c; }
// arpèges pincés (petite mélodie qui avance) ; pas de 0,3 s, accent sur le premier temps
const arpZones = [[t.soie, t.acier - 0.4, 0.034], [t.acier, t.metro - 0.2, 0.03], [t.metro + 2.4, t.bras - 0.2, 0.026], [t.ver, DUR - 1.8, 0.032]];
for (const [a, b, gn] of arpZones) {
  const step = 0.3; let k = 0;
  for (let x = a; x < b; x += step, k++) {
    const c = chordAt(x); if (!c) continue;
    const ns = c.notes.map(NOTE).sort((p, q) => p - q), f = ns[(k * 2 + (k >> 2)) % ns.length] * (k % 8 < 4 ? 2 : 1);
    pluck(x, f, { gain: gn + (k % 4 === 0 ? 0.012 : 0), pan: Math.sin(k * 1.3) * 0.5, send: 0.45 });
  }
}
// petite basse pulsée dans les moments « données » (ténacité, verdict)
for (const [a, b] of [[t.chocs, t.darwin], [t.ver, t.labos]]) for (let x = a; x < b; x += 0.6) { const c = chordAt(x); if (c) pluck(x, NOTE(c.notes[0]) , { gain: 0.04, decay: 0.994, len: 0.7, soft: 0.8, send: 0.2 }); }
// battement de cœur dans l'accroche, puis dans la pluie (tension)
for (const [a, b] of [[0.2, t.oui - 0.2], [t.pluie, t.gal - 0.2]]) for (let x = a; x < b; x += 0.9) { sweep(x, 0.3, 70, 38, { gain: 0.09, send: 0.15 }); sweep(x + 0.22, 0.25, 62, 34, { gain: 0.06, send: 0.15 }); }
// ambiances : vent dans la ville, ronronnement de labo, pluie
wind(0, t.oui, { gain: 0.05 }); wind(t.trois - 0.1, t.soie, { gain: 0.04 });
room(t.soie, t.zoom, { gain: 0.04 }); room(t.app, t.fab, { gain: 0.03 });
wind(t.bas - 0.1, t.spag, { gain: 0.05 }); wind(t.bras - 0.1, wt('bras', 'ce'), { gain: 0.04 });
rainBed(t.pluie - 0.1, t.ver - 0.1, 0.03);
room(t.labos - 0.1, t.coc, { gain: 0.035, f0: 220, f1: 220 });

// ───────── bruitages ─────────
B = BUS.sfx;
for (const e of EV.events) {
  const x = e.t;
  switch (e.type) {
    case 'ding': bell(x, 'A5', { gain: 0.07, decay: 1.4 }); bell(x + 0.09, 'E6', { gain: 0.045, decay: 1.2 }); break;
    case 'no': blip(x, 160, 105, 0.2, { gain: 0.11, duty: 0.5 }); noise(x, 0.12, { type: 'lp', f0: 600, f1: 200, gain: 0.04, att: 0.003, rel: 0.1 }); break;
    case 'label': blip(x, 880, 1320, 0.07, { gain: 0.085 }); for (let k = 1; k < 14; k++) blip(x + k / 22, 2400, 2200, 0.012, { gain: 0.02, pan: 0.2 }); break;
    case 'blip': blip(x, 1320, 1320, 0.05, { gain: 0.05, pan: 0.2 }); break;
    case 'bars': for (let k = 0; k < 14; k++) blip(x + k * 0.1, 600 + k * 60, 600 + k * 60, 0.03, { gain: 0.03 }); break;
    case 'zoom': noise(x - 0.3, 0.9, { type: 'bp', f0: 300, f1: 4200, q: 1.4, gain: 0.1, att: 0.7, rel: 0.12, send: 0.4 }); sweep(x - 0.3, 0.85, 260, 1700, { gain: 0.06, curve: 2 }); bell(x + 0.58, 'E6', { gain: 0.03, decay: 0.8 }); break;
    case 'stretch': sweep(x, 0.9, 180, 520, { gain: 0.07, curve: 1.2 }); sweep(x + 1.1, 0.9, 520, 180, { gain: 0.07, curve: 0.8 }); break;
    case 'clank': bell(x, 'C5', { gain: 0.06, decay: 0.7 }); thud(x, 0.35); noise(x, 0.05, { type: 'hp', f0: 3000, f1: 3000, gain: 0.12, att: 0.001, rel: 0.04 }); break;
    case 'fly': buzz(x, 2.2, { gain: 0.05 }); break;
    case 'boing': boing(x, { gain: 0.12 }); noise(x, 0.08, { type: 'hp', f0: 3000, f1: 2000, gain: 0.1, att: 0.001, rel: 0.06 }); break;
    case 'swoosh': noise(x - 0.4, 0.9, { type: 'bp', f0: 300, f1: 1100, q: 0.9, gain: 0.12, att: 0.4, rel: 0.45, send: 0.35, pan: -0.5, panTo: 0.5 }); break;
    case 'train': noise(x, 2.2, { type: 'lp', f0: 120, f1: 300, q: 0.8, gain: 0.08, att: 1.8, rel: 0.2, send: 0.4 }); for (let k = 0; k < 14; k++) thud(x + 0.2 + k * 0.15, 0.04 + k * 0.008); break;
    case 'screech': squeal(x, 1.5, { gain: 0.05 }); noise(x, 1.5, { type: 'hp', f0: 4000, f1: 2500, gain: 0.04, att: 0.1, rel: 0.5 }); break;
    case 'strain': sweep(x, 0.5, 300, 440, { gain: 0.05, curve: 0.8 }); sweep(x + 0.55, 0.5, 440, 280, { gain: 0.05, curve: 1.2 }); for (let k = 0; k < 5; k++) blip(x + 0.2 + k * 0.28, 2400, 1800, 0.015, { gain: 0.03 }); break;
    case 'liquid': for (let k = 0; k < 14; k++) blip(x + k * 0.09, 500 + (k % 4) * 90, 900 + (k % 3) * 80, 0.05, { gain: 0.04, pan: Math.sin(k) * 0.4 }); break;
    case 'pizza': for (let k = 0; k < 9; k++) woodKnock(x + k * 0.1, 0.06, 170 + k * 14); break;
    case 'thud': thud(x, 0.6); break;
    case 'spray': noise(x, 1.0, { type: 'hp', f0: 3000, f1: 5200, gain: 0.06, att: 0.03, rel: 0.25, send: 0.3 }); for (let k = 0; k < 10; k++) blip(x + 0.5 + k * 0.1, 1800 - k * 40, 900, 0.025, { gain: 0.03, pan: 0.5 }); break;
    case 'thunder': noise(x - 0.02, 0.06, { type: 'hp', f0: 2000, f1: 2000, gain: 0.2 * e.v, att: 0.001, rel: 0.05 }); rumble(x + 0.02, 2.8, { gain: 0.15 * e.v }); break;
    case 'rain': break;
    case 'creak': sweep(x, 0.8, 520, 160, { gain: 0.08, curve: 0.7 }); for (let k = 0; k < 6; k++) blip(x + k * 0.13, 2600 - k * 150, 2000, 0.02, { gain: 0.035 }); break;
    case 'sad': horn(x, NOTE('Bb3'), NOTE('A3'), 0.28, { gain: 0.07 }); horn(x + 0.3, NOTE('A3'), NOTE('Ab3'), 0.28, { gain: 0.07 }); horn(x + 0.6, NOTE('Ab3'), NOTE('G3'), 0.28, { gain: 0.07 }); horn(x + 0.9, NOTE('G3'), NOTE('E3'), 0.9, { gain: 0.08 }); break;
    case 'stamp': thud(x, 0.5); noise(x, 0.07, { type: 'hp', f0: 2500, f1: 2500, gain: 0.1, att: 0.001, rel: 0.05 }); break;
    case 'hum': break;
    case 'bubbles': bloops(x - 1.0, 1.6, 36, { gain: 0.04 }); break;
    case 'chomp': noise(x - 0.05, 0.08, { type: 'bp', f0: 900, f1: 500, q: 2, gain: 0.2, att: 0.002, rel: 0.06 }); noise(x + 0.12, 0.08, { type: 'bp', f0: 800, f1: 450, q: 2, gain: 0.18, att: 0.002, rel: 0.06 }); thud(x + 0.18, 0.5); horn(x + 0.3, NOTE('F3'), NOTE('F3'), 0.25, { gain: 0.06 }); break;
    case 'shelf': blip(x, 420, 300, 0.05, { gain: 0.07, duty: 0.4 }); bell(x + 0.03, 'C7', { gain: 0.025, decay: 0.5 }); break;
    case 'wrap': noise(x, 1.5, { type: 'hp', f0: 4500, f1: 7500, gain: 0.07, att: 0.15, rel: 0.4 }); for (let k = 0; k < 9; k++) pluck(x + k * 0.16, NOTE(['D4', 'F#4', 'A4', 'D5', 'F#5'][k % 5]) , { gain: 0.03, pan: -0.4 + k * 0.1 }); break;
    case 'endCard': for (let k = 0; k < 28; k++) blip(x + k / 26, 2400, 2200, 0.012, { gain: 0.012 }); bell(x + 0.2, 'D5', { gain: 0.05, decay: 3 }); break;
  }
}
// tic-tac discret de l'horloge du labo, dans les plans de labo
for (const [a, b] of [[t.soie - 0.1, wt('soie', 'protéines') - 0.2], [wt('fabrication', 'une'), t.jet - 0.1], [wt('labos', 'pas'), t.bact - 0.1], [t.coc - 0.1, VOICE_END]]) for (let x = a; x < b; x += 1.0) blip(x, 2200, 2000, 0.008, { gain: 0.016, pan: 0.6, duty: 0.3 });
// pluie sur la vitre
taps(t.pluie - 0.1, wt('pluie', 'mouillée,') - 0.1, 30, 0.045);

// ───────── réverbération (type Freeverb) ─────────
class Comb { constructor(n) { this.b = new Float32Array(n); this.i = 0; this.f = 0; } p(x, fb, d) { const y = this.b[this.i]; this.f = y * (1 - d) + this.f * d; this.b[this.i] = x + this.f * fb; this.i = (this.i + 1) % this.b.length; return y; } }
class AP { constructor(n) { this.b = new Float32Array(n); this.i = 0; } p(x) { const bo = this.b[this.i], y = -x + bo; this.b[this.i] = x + bo * 0.5; this.i = (this.i + 1) % this.b.length; return y; } }
const sc = SR / 44100, CB = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], AB = [556, 441, 341, 225];
function verb(inp, spread) {
  const cs = CB.map(n => new Comb(Math.round((n + spread) * sc))), as = AB.map(n => new AP(Math.round((n + spread) * sc)));
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) { const x = inp[i] * 0.015; let y = 0; for (const c of cs) y += c.p(x, 0.86, 0.25); for (const a of as) y = a.p(y); out[i] = y; }
  return out;
}
// ───────── master (même gain pour les deux pistes) ─────────
const stems = {};
for (const k of ['music', 'sfx']) {
  const b = BUS[k], WL = verb(b.SL, 0), WR = verb(b.SR, 23), ML = new Float32Array(N), MR = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const fade = Math.min(1, (N - i) / (0.8 * SR));
    ML[i] = Math.tanh((b.L[i] + WL[i] * 3.2) * 1.4) * fade; MR[i] = Math.tanh((b.R[i] + WR[i] * 3.2) * 1.4) * fade;
    if (!Number.isFinite(ML[i]) || !Number.isFinite(MR[i])) throw new Error(`NaN (${k}) à ` + (i / SR).toFixed(3) + ' s');
  }
  stems[k] = [ML, MR];
}
let peak = 0, energy = 0;
for (let i = 0; i < N; i++) { const l = stems.music[0][i] + stems.sfx[0][i], r = stems.music[1][i] + stems.sfx[1][i]; peak = Math.max(peak, Math.abs(l), Math.abs(r)); energy += l * l; }
if (peak < 1e-4 || energy / N < 1e-8) throw new Error('mix silencieux');
const g = 0.89 / peak;
function wav(path, chans) {
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) { let v = 0; for (const ch of chans) v += ch[c][i]; buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * g)) * 32767), 44 + i * 4 + c * 2); }
  fs.writeFileSync(path, buf);
}
wav(OUT, [stems.music, stems.sfx]);
wav(OUT.replace(/\.wav$/, '_music.wav'), [stems.music]);
wav(OUT.replace(/\.wav$/, '_sfx.wav'), [stems.sfx]);
console.log('score :', OUT, (N / SR).toFixed(2), 's, crête', peak.toFixed(3));
