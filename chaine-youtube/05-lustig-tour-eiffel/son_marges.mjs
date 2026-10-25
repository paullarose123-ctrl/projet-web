// Marges voix / fond sur tout le film (après la simulation de rendu.sh par son_mix.mjs) : fenêtres de 0,3 s où la voix parle, écart voix − (musique + ambiances) et voix − bruitages ;
// liste les fenêtres où l'écart est inférieur à un seuil (par défaut 9 dB) : node son_marges.mjs [seuil=9] [dossier=build/test]
import { readWav, analyse } from './son_analyse.mjs';
const seuil = +(process.argv[2] ?? 9), dir = process.argv[3] ?? 'build/test', V = readWav(`${dir}/mix_voice.wav`), M = readWav(`${dir}/mix_mus.wav`), F = readWav(`${dir}/mix_fx.wav`), pas = 0.3;
const bad = []; let nV = 0, worst = 99, worstT = 0;
for (let t = 0; t + pas < V.n / V.sr; t += pas) { const v = analyse(V, t, t + pas).rms; if (v < -34) continue; nV++; const m = analyse(M, t, t + pas).rms, f = analyse(F, t, t + pas).rms, fond = 10 * Math.log10(Math.pow(10, m / 10) + Math.pow(10, f / 10)), mg = v - fond;
  if (mg < worst) { worst = mg; worstT = t; } if (mg < seuil) bad.push(`${t.toFixed(1)} s : voix ${v.toFixed(1)}, musique+amb ${m.toFixed(1)}, bruitages ${f.toFixed(1)} → écart ${mg.toFixed(1)} dB`); }
console.log(`${nV} fenêtres de parole ; plus petit écart ${worst.toFixed(1)} dB à ${worstT.toFixed(1)} s ; ${bad.length} sous ${seuil} dB`); bad.forEach(b => console.log('  ' + b));
