// Classes de hauteur (chroma) de la musique seule par fenêtres : node son_chroma.mjs musiconly.wav t0 t1 [pas=1.0]
// affiche pour chaque fenêtre les 5 classes les plus fortes (nom, % de l'énergie) : sert à vérifier les accords et la tonalité
import { readWav } from './son_analyse.mjs';
const [f, a0, a1, pas = 1] = process.argv.slice(2), w = readWav(f), N = 16384, NM = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function fft(re, im) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } } for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const u = i + k, v = i + k + len / 2, tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr; re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti; const nc = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nc; } } } }
for (let t = +a0; t < +a1; t += +pas) {
  const s0 = Math.floor(t * w.sr), re = new Float64Array(N), im = new Float64Array(N), len = Math.min(N, Math.floor(+pas * w.sr)); let e = 0;
  for (let i = 0; i < len; i++) { const v = (w.L[s0 + i] + w.R[s0 + i]) / 2; re[i] = v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / len)); e += v * v; }
  fft(re, im); const ch = new Float64Array(12); let tot = 0;
  for (let k = Math.floor(70 * N / w.sr); k < Math.floor(1500 * N / w.sr); k++) { const f = k * w.sr / N, m = Math.round(12 * Math.log2(f / 440) + 69), p = ((m % 12) + 12) % 12, x = re[k] * re[k] + im[k] * im[k]; ch[p] += x; tot += x; }
  const top = [...ch].map((x, i) => [x / (tot || 1), NM[i]]).sort((a, b) => b[0] - a[0]).slice(0, 5).map(([x, n]) => `${n} ${(x * 100).toFixed(0)}%`).join('  ');
  console.log(t.toFixed(2).padStart(6), (10 * Math.log10(e / len + 1e-12)).toFixed(0).padStart(4) + ' dB  ', top);
}
