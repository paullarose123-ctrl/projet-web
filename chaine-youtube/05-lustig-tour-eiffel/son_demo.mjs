// Mesure les instruments (build/test/demo.wav + demo.json écrits par node score.mjs ... --only demo) : crête, hauteur (FFT) et erreur en cents, durée avant -40 dB
import fs from 'fs'; import { readWav, analyse } from './son_analyse.mjs';
const w = readWav(process.argv[2] || 'build/test/demo_music.wav'), list = JSON.parse(fs.readFileSync('build/test/demo.json', 'utf8'));
const NOTE = n => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); const st = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return 440 * Math.pow(2, (12 * (+m[3] + 1) + st - 69) / 12); };
console.log('nom         note   t     crête   RMS   pic Hz  attendu  cents   t(-40dB)  centroïde');
for (const it of list) {
  const a = analyse(w, it.t - 0.02, it.t + 1.0), exp = it.note && /^[A-G][#b]?-?\d$/.test(it.note) ? NOTE(it.note) : null;
  // durée : dernier instant où l'enveloppe (fenêtres de 20 ms) dépasse crête - 40 dB
  const pk = Math.pow(10, a.peak / 20); let last = 0; for (let k = 0; k < 2.4 * 50; k++) { const t0 = it.t + k * 0.02; let m = 0; for (let i = Math.floor(t0 * w.sr); i < Math.floor((t0 + 0.02) * w.sr); i++) m = Math.max(m, Math.abs(w.L[i]), Math.abs(w.R[i])); if (m > pk * 0.01) last = k * 0.02; }
  // centroïde et hauteur fine : interpolation parabolique
  const NF = 16384, re = new Float64Array(NF), s0 = Math.floor((it.t + 0.03) * w.sr); for (let i = 0; i < NF; i++) re[i] = (w.L[s0 + i] + w.R[s0 + i]) / 2 * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / NF));
  const spec = fftMag(re); let k0 = 2, mx = 0, cs = 0, ws = 0; for (let k = 2; k < NF / 2; k++) { if (spec[k] > mx) { mx = spec[k]; k0 = k; } cs += k * spec[k] * spec[k]; ws += spec[k] * spec[k]; }
  const y1 = Math.log(spec[k0 - 1] + 1e-12), y2 = Math.log(spec[k0] + 1e-12), y3 = Math.log(spec[k0 + 1] + 1e-12), d = 0.5 * (y1 - y3) / (y1 - 2 * y2 + y3), f = (k0 + d) * w.sr / NF;
  console.log(it.name.padEnd(11), String(it.note ?? '-').padEnd(5), it.t.toFixed(1).padStart(5), a.peak.toFixed(1).padStart(6), a.rms.toFixed(1).padStart(6), f.toFixed(1).padStart(8), exp ? exp.toFixed(1).padStart(8) : '       -', exp ? (1200 * Math.log2(f / exp)).toFixed(0).padStart(6) : '     -', last.toFixed(2).padStart(8), Math.round(cs / ws * w.sr / NF).toString().padStart(8));
}
function fftMag(re) { const n = re.length, im = new Float64Array(n); for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const u = i + k, v = i + k + len / 2, tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr; re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
  const out = new Float64Array(n / 2); for (let k = 0; k < n / 2; k++) out[k] = Math.hypot(re[k], im[k]); return out; }
