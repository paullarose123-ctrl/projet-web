// Niveaux (crête / RMS) par section et par phrase de la vidéo pour un fichier wav : node son_sections.mjs fichier.wav [timeline.json]
import fs from 'fs'; import { readWav, analyse, BANDS } from './son_analyse.mjs';
const [file, tl = 'build/timeline.json'] = process.argv.slice(2); const w = readWav(file), T = JSON.parse(fs.readFileSync(tl, 'utf8')), P = {}; T.phrases.forEach(p => P[p.id] = p);
const L = 0.12, VE = T.phrases[T.phrases.length - 1].t1, DUR = VE + 2 + 4.2;
const S = [['intro', 0, P.a1.t0 - L], ['idee', P.a1.t0 - L, P.b1.t0 - L], ['faux', P.b1.t0 - L, P.c1.t0 - L], ['piege', P.c1.t0 - L, P.d1.t0 - L], ['honte', P.d1.t0 - L, P.fin.t0 - L], ['fin', P.fin.t0 - L, VE], ['carton', VE, VE + 2], ['sortie', VE + 2, DUR]];
const sub = T.phrases.map(p => [p.id, p.t0, p.t1]);
const f = x => x.toFixed(1).padStart(6);
console.log('section        t0     t1   crête    RMS   bandes(' + BANDS.map(b => b[0]).join(' ') + ')');
for (const [n, a, b] of [...S, ...sub]) { const r = analyse(w, a, b); console.log(n.padEnd(8), f(a), f(b), f(r.peak), f(r.rms), '  ', r.bands.map(x => String(x).padStart(4)).join(' ')); }
