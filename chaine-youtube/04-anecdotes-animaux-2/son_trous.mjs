// Contrôles sur un film complet : plus grand saut d'échantillon (clics), premiers et derniers échantillons, silences réels de la musique seule (< −45 dB sur ≥ 0,2 s), NaN
//   node son_trous.mjs build/test/real  (lit real.wav, real_musiconly.wav, real_amb.wav, real_sfx.wav)
import { readWav } from './son_analyse.mjs';
const pre = process.argv[2] || 'build/test/real';
for (const [nom, f] of [['somme', ''], ['musique seule', '_musiconly'], ['ambiances', '_amb'], ['bruitages', '_sfx']]) {
  let w; try { w = readWav(`${pre}${f}.wav`); } catch { continue; }
  let pk = 0, jump = 0, jt = 0, nan = 0; for (let i = 0; i < w.n; i++) { for (const v of [w.L[i], w.R[i]]) { if (!Number.isFinite(v)) nan++; pk = Math.max(pk, Math.abs(v)); } if (i) { const d = Math.max(Math.abs(w.L[i] - w.L[i - 1]), Math.abs(w.R[i] - w.R[i - 1])); if (d > jump) { jump = d; jt = i / w.sr; } } }
  console.log(`${nom.padEnd(14)} crête ${(20 * Math.log10(pk)).toFixed(1)} dBFS, plus grand saut ${jump.toFixed(3)} à ${jt.toFixed(2)} s, NaN ${nan}, premier / dernier échantillon ${w.L[0].toFixed(5)} / ${w.L[w.n - 1].toFixed(5)}`);
  if (f === '_musiconly') { const win = Math.floor(0.05 * w.sr), sil = []; let a = null; for (let i = 0; i + win <= w.n; i += win) { let e = 0; for (let j = i; j < i + win; j++) e += (w.L[j] ** 2 + w.R[j] ** 2) / 2; const db = 10 * Math.log10(e / win + 1e-14); if (db < -45) { if (a === null) a = i / w.sr; } else if (a !== null) { if (i / w.sr - a >= 0.2) sil.push([a, i / w.sr]); a = null; } }
    console.log('   silences de la musique (< −45 dB, ≥ 0,2 s) : ' + (sil.map(([x, y]) => `${x.toFixed(2)}–${y.toFixed(2)}`).join('  ') || 'aucun')); }
}
