// node score.mjs build/score.wav   (écrit aussi build/score_music.wav et build/score_sfx.wav : la musique est baissée sous la voix au mixage, pas les bruitages)
// Musique et bruitages synthétisés (aucun fichier, aucun droit), calés sur les mêmes temps que l'image :
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
const END = TLJ.phrases[TLJ.phrases.length - 1].t1;
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

// ───────── harmonie : accords calés sur les phrases ─────────
const ch = (a, b, notes, o) => ({ a, b, notes, o });
const t = { surf: P.humain.t0, q: P.quetzal.t0, arg: P.argentino.t0, mega: P.megalodon.t0, fil: P.fillette.t0, ich: P.ichthyo.t0, mais: P.mais.t0, bal: P.baleine.t0, dbl: P.poids.t0, ch: P.chasse.t0, rev: P.revient.t0, fin: P.fin.t0 };
const CHORDS = [
  ch(t.surf - 0.3, t.q + 0.2, ['D3', 'F3', 'A3', 'E4']),
  ch(t.q - 0.2, t.q + 3.4, ['Bb2', 'D3', 'F3', 'A3']),
  ch(t.q + 3.2, t.arg + 0.2, ['F2', 'C3', 'A3', 'C4']),
  ch(t.arg - 0.2, t.arg + 3.0, ['G2', 'D3', 'G3', 'Bb3']),
  ch(t.arg + 2.8, t.mega - 0.2, ['A2', 'D3', 'F3', 'A3']),
  ch(t.mega - 0.4, t.mega + 2.4, ['Bb2', 'F3', 'D4']),
  ch(t.mega + 2.2, t.fil + 0.2, ['A2', 'E3', 'C#4', 'G3']),
  ch(t.fil - 0.2, t.ich + 0.2, ['D3', 'A3', 'F4']),
  ch(t.ich - 0.2, t.ich + 2.2, ['Bb2', 'F3', 'D4']),
  ch(t.ich + 2.0, t.mais + 0.5, ['C3', 'G3', 'E4']),
  ch(t.bal, t.bal + 3.2, ['D2', 'A2', 'D3', 'F#3', 'A3'], { gain: 0.075, bright: 0.45, att: 0.25 }),
  ch(t.bal + 3.0, t.dbl, ['B2', 'F#3', 'D4', 'A3'], { bright: 0.35 }),
  ch(t.dbl - 0.1, t.ch + 0.3, ['G2', 'D3', 'B3', 'G3'], { bright: 0.35 }),
  ch(t.ch, t.rev + 0.3, ['D2', 'A2', 'F3'], { gain: 0.05, bright: 0.05 }),
  ch(t.rev - 0.2, t.rev + 1.4, ['Bb2', 'F3', 'D4']),
  ch(t.rev + 1.2, t.fin + 0.2, ['F2', 'C3', 'A3', 'F3']),
  ch(t.fin - 0.2, t.fin + 2.2, ['G2', 'D3', 'Bb3', 'G3']),
  ch(t.fin + 2.0, END - 0.6, ['A2', 'E3', 'D4', 'A3']),
  ch(END - 0.8, DUR - 1.2, ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], { gain: 0.07, bright: 0.4, rel: 1.2 }),
];
// nappe de fond
pad(0, t.surf + 0.2, ['D2', 'A2'], { gain: 0.11, att: 1.0, bright: 0.05, send: 0.7 });
pad(t.mais + 0.2, t.bal - t.mais - 0.2, ['D1', 'A1'], { gain: 0.06, att: 1.6, rel: 0.4, bright: 0, send: 0.6 });
for (const c of CHORDS) pad(c.a, c.b - c.a, c.notes, { gain: 0.05, ...(c.o || {}) });
// arpèges (pincés) sur les notes de l'accord en cours
function chordAt(x) { let c = null; for (const k of CHORDS) if (x >= k.a && x < k.b) c = k; return c; }
const arpZones = [[t.surf + 0.4, t.mais], [t.bal + 0.3, t.ch], [t.rev, DUR - 1.6]];
for (const [a, b] of arpZones) {
  const step = 0.3; let k = 0;
  for (let x = a; x < b; x += step, k++) {
    const c = chordAt(x); if (!c) continue;
    const ns = c.notes.map(NOTE).sort((p, q) => p - q), f = ns[(k * 2 + (k >> 2)) % ns.length] * (k % 8 < 4 ? 2 : 1);
    pluck(x, f, { gain: 0.032 + (k % 4 === 0 ? 0.012 : 0), pan: Math.sin(k * 1.3) * 0.5, send: 0.45 });
  }
}
// chant de baleine : l'accroche, la reprise, la révélation, la fin
moan(0.9, 3.2, [[0, 160], [0.4, 230], [0.8, 140], [1, 120]], { gain: 0.035, pan: -0.3 });
moan(at('eyeOpen2') - 0.6, 2.4, [[0, 150], [0.5, 210], [1, 130]], { gain: 0.03, pan: 0.3 });
moan(t.bal + 0.6, 3.6, [[0, 294], [0.35, 440], [0.7, 370], [1, 294]], { gain: 0.03, pan: -0.2 });
moan(t.fin + 0.4, 3.4, [[0, 220], [0.5, 330], [1, 294]], { gain: 0.028, pan: 0.25 });
// ambiances : vent sur la falaise, grondement sous l'eau
noise(t.surf - 0.6, t.mega - t.surf + 1.6, { type: 'lp', f0: 500, f1: 350, q: 0.7, gain: 0.05, att: 0.8, rel: 1.2, send: 0.2, pan: -0.4, panTo: 0.4 });
noise(0, t.surf, { type: 'lp', f0: 180, f1: 300, q: 0.7, gain: 0.07, att: 0.3, rel: 0.6, send: 0.3 });
noise(t.mega + 0.8, t.mais + 0.6 - t.mega - 0.8, { type: 'lp', f0: 220, f1: 160, q: 0.7, gain: 0.05, att: 1.0, rel: 1.2, send: 0.3 });
noise(t.bal - 0.4, DUR - t.bal + 0.4, { type: 'lp', f0: 200, f1: 160, q: 0.7, gain: 0.05, att: 1.2, rel: 1.5, send: 0.3 });

// ───────── bruitages ─────────
B = BUS.sfx;
for (const e of EV.events) {
  const x = e.t;
  switch (e.type) {
    case 'eyeOpen': bell(x, 'A4', { gain: 0.06, decay: 2.5 }); noise(x, 0.6, { type: 'lp', f0: 300, f1: 900, gain: 0.04, att: 0.2, rel: 0.3 }); break;
    case 'eyeClose': noise(x, 0.35, { type: 'lp', f0: 600, f1: 200, gain: 0.05, att: 0.05, rel: 0.25 }); break;
    case 'bubbles': bloops(x, 1.4, 46, { gain: 0.045 }); break;
    case 'riser': noise(x, 1.3, { type: 'bp', f0: 200, f1: 3000, q: 1.5, gain: 0.12, att: 1.0, rel: 0.2, send: 0.4 }); sweep(x, 1.3, 90, 380, { gain: 0.05, curve: 2 }); break;
    case 'surface': noise(x, 0.7, { type: 'lp', f0: 6000, f1: 700, gain: 0.22, att: 0.01, rel: 0.5, send: 0.3 }); bloops(x, 0.4, 10, { gain: 0.03, lo: 500, hi: 1400 }); break;
    case 'label': blip(x, 880, 1320, 0.07, { gain: 0.085 }); for (let k = 1; k < 14; k++) blip(x + k / 22, 2400, 2200, 0.012, { gain: 0.02, pan: 0.2 }); break;
    case 'blipSmall': blip(x, 1320, 1320, 0.05, { gain: 0.04, pan: 0.3 }); break;
    case 'dim': blip(x, 5200, 5000, 0.02, { gain: 0.022, pan: -0.3 }); blip(x + 0.45, 5200, 5000, 0.02, { gain: 0.022, pan: 0.3 }); break;
    case 'eleph': blip(x, NOTE(['C5', 'D5', 'E5', 'G5', 'A5'][e.v % 5]) * (e.v >= 5 ? 2 : 1), NOTE(['C5', 'D5', 'E5', 'G5', 'A5'][e.v % 5]) * (e.v >= 5 ? 2 : 1), 0.07, { gain: 0.05, pan: -0.5 + e.v * 0.1 }); break;
    case 'foot': thud(x, e.v * FOOT_GAIN); break;
    case 'wing': noise(x, 0.8, { type: 'bp', f0: 500, f1: 160, q: 0.9, gain: 0.08, att: 0.25, rel: 0.4, send: 0.3, pan: 0.3, panTo: -0.3 }); break;
    case 'finSplash': noise(x, 1.4, { type: 'hp', f0: 2500, f1: 1500, gain: 0.05, att: 0.1, rel: 0.6, pan: 0.5 }); noise(x, 0.6, { type: 'lp', f0: 4000, f1: 800, gain: 0.12, att: 0.01, rel: 0.4, pan: 0.5 }); break;
    case 'dive': noise(x, 0.9, { type: 'lp', f0: 900, f1: 150, gain: 0.12, att: 0.02, rel: 0.7 }); bloops(x, 0.6, 12, { gain: 0.03 }); break;
    case 'snap': noise(x, 0.03, { type: 'hp', f0: 3000, f1: 3000, gain: 0.35, att: 0.001, rel: 0.02, send: 0.5 }); sweep(x, 0.25, 160, 50, { gain: 0.3 }); noise(x, 0.12, { type: 'bp', f0: 1800, f1: 700, q: 2, gain: 0.2, att: 0.001, rel: 0.1 }); break;
    case 'toothFall': { const d = at('toothLand') - x; for (let k = 0; k * 0.14 < d - 0.1; k++) blip(x + k * 0.14, 1400 * Math.pow(0.32, k * 0.14 / d), 1300 * Math.pow(0.32, k * 0.14 / d), 0.04, { gain: 0.022, pan: Math.sin(k) * 0.4 }); break; }
    case 'toothLand': bell(x, 'E6', { gain: 0.07, decay: 1.2 }); noise(x, 0.6, { type: 'lp', f0: 1500, f1: 300, gain: 0.06, att: 0.005, rel: 0.5 }); break;
    case 'glint': ['D6', 'F#6', 'A6', 'D7'].forEach((n, k) => bell(x + k * 0.06, n, { gain: 0.03, decay: 1.0, pan: -0.3 + k * 0.2 })); break;
    case 'bones': for (let k = 0; k < 18; k++) bell(x + k * 0.11, ['D5', 'F5', 'G5', 'A5', 'C6', 'D6'][k % 6], { gain: 0.022, decay: 0.35, pan: -0.6 + k * 0.07, send: 0.4 }); break;
    case 'flesh': noise(x, 1.6, { type: 'lp', f0: 250, f1: 900, gain: 0.04, att: 1.2, rel: 0.4 }); break;
    case 'eyeOpen2': bell(x, 'A4', { gain: 0.07, decay: 3 }); break;
    case 'reveal':
      noise(x - 1.0, 1.0, { type: 'bp', f0: 150, f1: 2500, q: 1.2, gain: 0.1, att: 0.95, rel: 0.05, send: 0.5 });
      sweep(x - 0.04, 2.2, 110, 28, { gain: 0.22, send: 0.2 }); noise(x - 0.04, 1.8, { type: 'lp', f0: 2200, f1: 150, gain: 0.07, att: 0.003, rel: 1.6, send: 0.8 }); bell(x, 'D4', { gain: 0.06, decay: 4 }); break;
    case 'bars': for (let k = 0; k < 6; k++) blip(x + k * 0.07, 600 + k * 60, 600 + k * 60, 0.03, { gain: 0.03 }); for (let k = 0; k < 14; k++) blip(x + 0.4 + k * 0.1, 600 + k * 60, 600 + k * 60, 0.03, { gain: 0.03 }); break;
    case 'counter': { const d = at('counterEnd') - x; let y = 0, k = 0; while (y < d) { const u = y / d; blip(x + y, 1600 * Math.pow(0.22, u), 1600 * Math.pow(0.22, u), 0.02, { gain: 0.03, pan: (k % 2) * 0.4 - 0.2 }); y += 0.05 + 0.25 * u * u; k++; } break; }
    case 'counterEnd': thud(x, 0.6); bell(x, 'D4', { gain: 0.05, decay: 3 }); bell(x + 0.02, 'F4', { gain: 0.035, decay: 3 }); break;
    case 'recover': ['D4', 'F4', 'A4', 'D5', 'F5'].forEach((n, k) => pluck(x + k * 0.16, n, { gain: 0.05, pan: -0.4 + k * 0.2 })); break;
    case 'spout': noise(x, 1.6, { type: 'bp', f0: 500, f1: 2600, q: 0.8, gain: 0.2, att: 0.05, rel: 1.2, send: 0.5 }); noise(x + 0.3, 2.6, { type: 'hp', f0: 4000, f1: 3000, gain: 0.05, att: 0.4, rel: 1.6, send: 0.6 }); break;
    case 'endCard': for (let k = 0; k < 32; k++) blip(x + k / 26, 2400, 2200, 0.012, { gain: 0.012 }); bell(x + 0.2, 'D5', { gain: 0.05, decay: 3 }); break;
  }
}

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
