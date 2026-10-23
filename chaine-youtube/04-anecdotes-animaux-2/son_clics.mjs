// Contrôle des clics et des fins de chaque bruitage : un fichier solo par type (node son_essai.mjs), rendu seul (--only sfx), puis mesures :
//   crête, durée jusqu'à -60 dB sous la crête, niveau de la queue (avant le 'logo' de 11 s), plus grand saut d'échantillon (relatif à la crête) et dans les 3 premières ms.
import fs from 'fs'; import { execFileSync } from 'child_process'; import { readWav } from './son_analyse.mjs';
const only = process.argv[2]; const files = fs.readdirSync('build/test').filter(f => /^solo_.*\.json$/.test(f)).sort();
console.log('type        crête   fin(-60dB)  queue@10.5s  saut max/crête   saut 3 ms initiales / crête');
for (const f of files) {
  const type = f.replace(/^solo_|\.json$/g, ''); if (only && only !== type) continue; const out = `build/test/solo_${type}.wav`;
  execFileSync('node', ['score.mjs', out, '--events', `build/test/${f}`, '--only', 'sfx'], { stdio: ['ignore', 'ignore', 'inherit'] });
  const w = readWav(`build/test/solo_${type}_sfx.wav`), a = Math.floor(0.9 * w.sr), b = Math.floor(10.5 * w.sr); let pk = 0; for (let i = a; i < b; i++) pk = Math.max(pk, Math.abs(w.L[i]), Math.abs(w.R[i]));
  let end = a; for (let i = a; i < b; i++) if (Math.abs(w.L[i]) > pk * 0.001 || Math.abs(w.R[i]) > pk * 0.001) end = i; let jump = 0, jump0 = 0, tail = 0;
  for (let i = a + 1; i < b; i++) { const d = Math.max(Math.abs(w.L[i] - w.L[i - 1]), Math.abs(w.R[i] - w.R[i - 1])); jump = Math.max(jump, d); if (i < Math.floor(1.0 * w.sr) + Math.floor(0.003 * w.sr) + 24) jump0 = Math.max(jump0, d); }
  for (let i = Math.floor(10.4 * w.sr); i < b; i++) tail = Math.max(tail, Math.abs(w.L[i]), Math.abs(w.R[i]));
  const db = x => (20 * Math.log10(Math.max(x, 1e-9))).toFixed(1).padStart(6);
  console.log(type.padEnd(11), db(pk), ((end - Math.floor(1 * w.sr)) / w.sr).toFixed(2).padStart(8) + ' s', db(tail).padStart(9), '  ', (jump / pk).toFixed(2).padStart(8), '            ', (jump0 / pk).toFixed(2).padStart(8));
}
