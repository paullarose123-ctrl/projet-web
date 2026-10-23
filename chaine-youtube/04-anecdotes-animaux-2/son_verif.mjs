// Vérifications des ambiances (contenu fréquentiel attendu) sur des couches isolées :
//   for l in wind_prairie river ... ; do node score.mjs build/test/l_$l.wav --events build/test/events_reel.json --only amb --layer $l; done ; node son_verif.mjs
// (le fichier de couche est l_<nom>_music.wav : les ambiances partent dans le stem « musique »)
import fs from 'fs'; import { readWav, analyse, BANDS } from './son_analyse.mjs';
const T = JSON.parse(fs.readFileSync('build/timeline.json', 'utf8')), P = {}; T.phrases.forEach(p => P[p.id] = p);
const W = { wind_prairie: [0.5, 5], crickets_prairie: [0.5, 5], hoppers_prairie: [0.5, 10], flies: [0.5, 20], birds_prairie: [0.5, 20], hush_prairie: [0.5, 5],
  river: [24, 36], cicadas_jungle: [24, 36], cicadas_hi_jungle: [24, 36], frogs_jungle: [24, 36], birds_jungle: [24, 36], drops_jungle: [24, 36], leaves_jungle: [24, 36],
  water_dusk: [37.55, 38.3], frogs_dusk: [37.55, 38.3], insects_dusk: [37.55, 38.3], birds_dusk: [37.55, 38.3], wind_dusk: [37.55, 38.3],
  uw_hum: [39, 50], uw_flow: [39, 50], uw_bubbles: [39, 50], uw_crackle: [39, 50], wind_fin: [51, 55], birds_fin: [51, 55], crickets_fin: [51, 55], hush_fin: [51, 55] };
console.log('couche              fenêtre        RMS    crête   pic(Hz)  bandes(<100 100-300 300-1k 1-3k 3-6k 6k+)');
for (const [l, [a, b]] of Object.entries(W)) { let w; try { w = readWav(`build/test/l_${l}_music.wav`); } catch { continue; } const r = analyse(w, a, b); console.log(l.padEnd(19), `${a}-${b}`.padEnd(12), r.rms.toFixed(1).padStart(7), r.peak.toFixed(1).padStart(7), String(r.pkf).padStart(7), '  ', r.bands.map(x => String(x).padStart(4)).join(' ')); }
function fftm(x) { const n = x.length, re = Float64Array.from(x), im = new Float64Array(n); for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const u = i + k, v = i + k + len / 2, tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr; re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
  return Array.from({ length: n / 2 }, (_, k) => Math.hypot(re[k], im[k])); }
// enveloppe d'une porteuse (insectes) : pic spectral entre f1 et f2, démodulation, puis spectre de l'enveloppe (rythme des impulsions et des « trrr »)
function envSpectrum(file, t0, label, f1 = 3000, f2 = 7500) {
  let w; try { w = readWav(file); } catch { return; } const N = 1 << 18, s0 = Math.floor(t0 * w.sr), x = new Float64Array(N); for (let i = 0; i < N; i++) x[i] = (w.L[s0 + i] + w.R[s0 + i]) / 2;
  const X = fftm(x); let kp = 0, mx = 0; for (let k = Math.floor(f1 * N / w.sr); k < Math.floor(f2 * N / w.sr); k++) if (X[k] > mx) { mx = X[k]; kp = k; }
  const fc = kp * w.sr / N, wn = Math.floor(0.004 * w.sr), env = new Float64Array(N), re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; i++) { re[i] = x[i] * Math.cos(2 * Math.PI * fc * i / w.sr); im[i] = x[i] * Math.sin(2 * Math.PI * fc * i / w.sr); }
  let ar = 0, ai = 0; for (let i = 0; i < N; i++) { ar += re[i] - (i >= wn ? re[i - wn] : 0); ai += im[i] - (i >= wn ? im[i - wn] : 0); env[i] = Math.hypot(ar, ai) / wn; }
  const dec = 48, e2 = []; for (let i = 0; i < N / dec; i++) e2.push(env[i * dec]); const m = e2.reduce((a, b) => a + b, 0) / e2.length, n2 = 1 << Math.floor(Math.log2(e2.length)), E = fftm(e2.slice(0, n2).map(v => v - m)), sr2 = w.sr / dec, pk = [];
  for (let k = 2; k < n2 / 2; k++) { const f = k * sr2 / n2; if (f > 1 && f < 120) pk.push([E[k], f]); } pk.sort((a, b) => b[0] - a[0]);
  const lo = pk.filter(p => p[1] < 8).slice(0, 2), hi = pk.filter(p => p[1] >= 20).slice(0, 3);
  console.log(`${label} : porteuse ${fc.toFixed(0)} Hz ; modulation d'enveloppe : groupes (« trrr ») ${lo.map(p => p[1].toFixed(1)).join(', ')} Hz, impulsions ${hi.map(p => p[1].toFixed(0)).join(', ')} Hz`);
}
envSpectrum('build/test/l_crickets_prairie_music.wav', 0.6, 'grillons de la prairie', 3000, 5200); envSpectrum('build/test/l_hoppers_prairie_music.wav', 0.6, 'sauterelles de la prairie', 5000, 7500);
