// Niveaux (crête / RMS) par section de la vidéo pour un fichier wav : node son_sections.mjs fichier.wav [timeline.json]
import fs from 'fs'; import { readWav, analyse, BANDS } from './son_analyse.mjs';
const [file, tl = 'build/timeline.json'] = process.argv.slice(2); const w = readWav(file), T = JSON.parse(fs.readFileSync(tl, 'utf8')), P = {}; T.phrases.forEach(p => P[p.id] = p);
const L = 0.12, VE = T.phrases[T.phrases.length - 1].t1, S = [['intro', 0, P.g1.t0 - L], ['gre', P.g1.t0 - L, P.l1.t0 - L], ['lez', P.l1.t0 - L, P.y1.t0 - L], ['lyc', P.y1.t0 - L, P.fin.t0 - L], ['fin', P.fin.t0 - L, VE + 2], ['sortie', VE + 2, VE + 6.2]];
const sub = [['q', P.q.t0, P.q.t1], ['trois', P.trois.t0, P.trois.t1], ['g1', P.g1.t0, P.g1.t1], ['g2', P.g2.t0, P.g2.t1], ['g3', P.g3.t0, P.g3.t1], ['g4', P.g4.t0, P.g4.t1], ['l1', P.l1.t0, P.l1.t1], ['l2', P.l2.t0, P.l2.t1], ['l3', P.l3.t0, P.l3.t1], ['l4', P.l4.t0, P.l4.t1], ['y1', P.y1.t0, P.y1.t1], ['y2', P.y2.t0, P.y2.t1], ['y3', P.y3.t0, P.y3.t1], ['y4', P.y4.t0, P.y4.t1], ['fin', P.fin.t0, P.fin.t1]];
const f = x => x.toFixed(1).padStart(6);
console.log('section        t0     t1   crête    RMS   bandes(' + BANDS.map(b => b[0]).join(' ') + ')');
for (const [n, a, b] of [...S, ...sub]) { const r = analyse(w, a, b); console.log(n.padEnd(8), f(a), f(b), f(r.peak), f(r.rms), '  ', r.bands.map(x => String(x).padStart(4)).join(' ')); }
