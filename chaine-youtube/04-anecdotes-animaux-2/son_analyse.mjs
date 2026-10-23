// Outil d'analyse du sonorisateur (mesures à la place de l'écoute) :
//   node son_analyse.mjs stats  fichier.wav [t0 t1]           crête / RMS (dBFS) et énergie par bandes de fréquences
//   node son_analyse.mjs events fichier.wav events.json [out] une ligne par événement (fenêtre jusqu'à l'événement suivant)
//   node son_analyse.mjs timeline fichier.wav [pas]          niveau RMS court-terme dans le temps (pas en s)
//   node son_analyse.mjs spec fichier.wav sortie.png [t0 t1]  spectrogramme (ffmpeg)
import fs from 'fs'; import { execFileSync } from 'child_process';
export function readWav(p) {
  const b = fs.readFileSync(p); const ch = b.readUInt16LE(22), sr = b.readUInt32LE(24), bits = b.readUInt16LE(34);
  let o = 12; while (o < b.length && b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const n = Math.floor(b.readUInt32LE(o + 4) / (ch * bits / 8)), L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = b.readInt16LE(o + 8 + i * ch * 2) / 32768; R[i] = b.readInt16LE(o + 8 + i * ch * 2 + (ch > 1 ? 2 : 0)) / 32768; }
  return { sr, n, L, R };
}
const db = x => 20 * Math.log10(Math.max(x, 1e-9));
function fft(re, im) {
  const n = re.length; for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]];[im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const u = i + k, v = i + k + len / 2, tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr; re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
}
export const BANDS = [['<100', 0, 100], ['100-300', 100, 300], ['300-1k', 300, 1000], ['1-3k', 1000, 3000], ['3-6k', 3000, 6000], ['6k+', 6000, 24000]];
export function analyse(w, t0, t1) {
  const a = Math.max(0, Math.floor(t0 * w.sr)), b = Math.min(w.n, Math.floor(t1 * w.sr));
  let pk = 0, e = 0, pkAt = 0; for (let i = a; i < b; i++) { const m = (w.L[i] + w.R[i]) / 2; for (const v of [w.L[i], w.R[i]]) if (Math.abs(v) > pk) { pk = Math.abs(v); pkAt = i; } e += (w.L[i] * w.L[i] + w.R[i] * w.R[i]) / 2; }
  const rms = Math.sqrt(e / Math.max(1, b - a));
  // spectre moyen (Hann, 4096)
  const NF = 4096, ps = new Float64Array(NF / 2); let cnt = 0;
  for (let s = a; s + NF <= b; s += NF / 2) { const re = new Float64Array(NF), im = new Float64Array(NF); for (let i = 0; i < NF; i++) re[i] = (w.L[s + i] + w.R[s + i]) / 2 * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / NF)); fft(re, im); for (let k = 0; k < NF / 2; k++) ps[k] += re[k] * re[k] + im[k] * im[k]; cnt++; }
  const bands = BANDS.map(([n, lo, hi]) => { let s = 0; for (let k = 0; k < NF / 2; k++) { const f = k * w.sr / NF; if (f >= lo && f < hi) s += ps[k]; } return s; });
  const tot = bands.reduce((p, q) => p + q, 0) || 1; let pkf = 0, pm = 0; for (let k = 2; k < NF / 2; k++) if (ps[k] > pm) { pm = ps[k]; pkf = k * w.sr / NF; }
  return { peak: db(pk), rms: db(rms), pkAt: pkAt / w.sr, bands: bands.map(s => +(10 * Math.log10(s / tot + 1e-12)).toFixed(0)), pkf: Math.round(pkf), cnt };
}
const f2 = x => (x >= 0 ? ' ' : '') + x.toFixed(1);
if (process.argv[1] && process.argv[1].endsWith('son_analyse.mjs')) {
  const [cmd, file, ...r] = process.argv.slice(2);
  if (cmd === 'stats') { const w = readWav(file), t0 = +(r[0] ?? 0), t1 = +(r[1] ?? w.n / w.sr); const a = analyse(w, t0, t1); console.log(`${file} [${t0}-${t1.toFixed(2)}] crête ${f2(a.peak)} dBFS  RMS ${f2(a.rms)} dBFS  pic spectral ${a.pkf} Hz  bandes(${BANDS.map(b => b[0]).join(' ')}) ${a.bands.join(' ')}`); }
  else if (cmd === 'events') {
    const w = readWav(file), ev = JSON.parse(fs.readFileSync(r[0], 'utf8')).events; const types = new Set(); console.log('type          t       crête   RMS    pic(Hz)  bandes dB rel. (' + BANDS.map(b => b[0]).join(' ') + ')');
    ev.forEach((e, i) => { const t1 = Math.min(e.t + 1.3, ev[i + 1] ? ev[i + 1].t - 0.02 : 1e9); const a = analyse(w, e.t - 0.05, t1); console.log(`${e.type.padEnd(12)} ${e.t.toFixed(2).padStart(6)} ${f2(a.peak)} ${f2(a.rms)}  ${String(a.pkf).padStart(6)}   ${a.bands.map(x => String(x).padStart(4)).join(' ')}`); });
  } else if (cmd === 'timeline') { const w = readWav(file), step = +(r[0] ?? 1); let line = ''; for (let t = 0; t < w.n / w.sr; t += step) { const a = analyse(w, t, t + step); line += `${t.toFixed(0).padStart(3)}s ${f2(a.rms)}${a.peak > -1 ? '!' : ' '}|`; if ((t / step) % 8 === 7) { console.log(line); line = ''; } } console.log(line); }
  else if (cmd === 'band') {    // niveau d'une bande de fréquences dans le temps : node son_analyse.mjs band f.wav lo hi pas t0 t1
    const w = readWav(file), [lo, hi, step = 0.25, t0 = 0, t1 = w.n / w.sr] = r.map(Number), NF = 4096, out = [];
    for (let t = t0; t + step <= t1; t += step) { const s0 = Math.floor(t * w.sr); let e = 0, c = 0; for (let s = s0; s + NF <= s0 + step * w.sr || c === 0; s += NF / 2) { const re = new Float64Array(NF), im = new Float64Array(NF); for (let i = 0; i < NF; i++) re[i] = (w.L[s + i] + w.R[s + i]) / 2 * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / NF)); fft(re, im); for (let k = 0; k < NF / 2; k++) { const f = k * w.sr / NF; if (f >= lo && f < hi) e += re[k] * re[k] + im[k] * im[k]; } c++; } out.push(10 * Math.log10(e / c / (NF * NF / 8) + 1e-12)); }
    const mx = Math.max(...out), mn = Math.min(...out), sd = Math.sqrt(out.reduce((a, b) => a + (b - out.reduce((x, y) => x + y, 0) / out.length) ** 2, 0) / out.length);
    console.log(`bande ${lo}-${hi} Hz, pas ${step} s, ${out.length} points : min ${mn.toFixed(1)} max ${mx.toFixed(1)} dB (écart ${(mx - mn).toFixed(1)} dB, écart-type ${sd.toFixed(1)} dB)`); console.log(out.map(x => x.toFixed(0)).join(' ')); }
  else if (cmd === 'spec') { const [out, t0, t1] = r; const args = ['-y', '-loglevel', 'error']; if (t0 !== undefined) args.push('-ss', t0, '-t', String(+t1 - +t0)); const fmax = +(process.env.FMAX || 8000); args.push('-i', file, '-lavfi', `aresample=${fmax * 2},volume=${process.env.VOL || 18}dB,showspectrumpic=s=${process.env.SIZE || '1200x400'}:legend=${process.env.LEGEND ?? 1}:scale=log:fscale=lin:drange=${process.env.DR || 80}:limit=0:color=viridis:win_func=hann`, out); execFileSync('ffmpeg', args); console.log(out); }
}
