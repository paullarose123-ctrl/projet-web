// Enveloppe d'un événement : RMS (dB) par fenêtre de `pas` ms à partir de t0 : node son_env.mjs fichier.wav t0 [pas_ms=5] [n=40]
import { readWav } from './son_analyse.mjs';
const [f, t0, pas = 5, n = 40] = process.argv.slice(2), w = readWav(f), P = Math.floor(+pas / 1000 * w.sr); let out = [];
for (let k = 0; k < +n; k++) { const a = Math.floor(+t0 * w.sr) + k * P; let e = 0, pk = 0; for (let i = a; i < a + P; i++) { const v = (w.L[i] + w.R[i]) / 2; e += v * v; pk = Math.max(pk, Math.abs(v)); } out.push((10 * Math.log10(e / P + 1e-14)).toFixed(0) + '/' + (20 * Math.log10(pk + 1e-9)).toFixed(0)); }
console.log(`RMS/crête dB par ${pas} ms depuis ${t0} s :`, out.join(' '));
