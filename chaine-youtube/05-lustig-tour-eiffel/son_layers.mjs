// Mesure chaque couche d'ambiance seule (rendu --only amb --layer nom) : crête, RMS, facteur de crête, bandes, sur la fenêtre où la couche est active
//   node son_layers.mjs [nom ...]   (par défaut toutes les couches de score.mjs)
import fs from 'fs'; import { execFileSync } from 'child_process'; import { readWav, analyse, BANDS } from './son_analyse.mjs';
const src = fs.readFileSync('score.mjs', 'utf8'), names = process.argv.length > 2 ? process.argv.slice(2) : [...new Set([...src.matchAll(/(?:L|layer\([^,]*,[^,]*,\s*\{ name:\s*)\(?'([a-z_]+_[a-z]+)'/g)].map(m => m[1]))];
const EVF = process.env.EVF || 'build/test/events_plans.json';
console.log('couche              actif(s)      crête    RMS   facteur  bandes(' + BANDS.map(b => b[0]).join(' ') + ')');
for (const n of names) {
  try { execFileSync('node', ['score.mjs', `build/test/l_${n}.wav`, '--events', EVF, '--only', 'amb', '--layer', n], { stdio: ['ignore', 'ignore', 'ignore'] }); } catch { console.log(n.padEnd(19), 'échec'); continue; }
  const w = readWav(`build/test/l_${n}_music.wav`); let a = -1, b = -1; const win = 4800; for (let i = 0; i + win < w.n; i += win) { let e = 0; for (let j = i; j < i + win; j++) e += w.L[j] * w.L[j] + w.R[j] * w.R[j]; if (e > 1e-9) { if (a < 0) a = i / w.sr; b = (i + win) / w.sr; } }
  if (a < 0) { console.log(n.padEnd(19), 'silence'); continue; }
  const r = analyse(w, a, b); console.log(n.padEnd(19), `${a.toFixed(1)}-${b.toFixed(1)}`.padEnd(12), r.peak.toFixed(1).padStart(6), r.rms.toFixed(1).padStart(7), (r.peak - r.rms).toFixed(1).padStart(7), '  ', r.bands.map(x => String(x).padStart(4)).join(' '));
  fs.unlinkSync(`build/test/l_${n}.wav`); fs.unlinkSync(`build/test/l_${n}_music.wav`); try { fs.unlinkSync(`build/test/l_${n}_sfx.wav`); } catch { }
}
