// Fabrique les fichiers d'événements d'essai du sonorisateur (dans build/test/) :
//   events_test.json   un exemplaire de chaque type d'événement, espacés de 1,5 s (+ un type inconnu), 3 « step » sur les 3 sols
//   events_reel.json   un jeu d'événements plausible calé sur la vraie timeline (plans de CONCEPT.md), pour écouter... mesurer le film entier
//   solo_<type>.json   un seul événement, pour les mesures de clic / de fin
//   node son_essai.mjs
import fs from 'fs';
const TL = JSON.parse(fs.readFileSync('build/timeline.json', 'utf8')), P = {}; TL.phrases.forEach(p => P[p.id] = p);
const norm = s => s.normalize('NFC').toLowerCase().replace(/[.,:;!?…]/g, '');
const w = (id, t) => (P[id].words.find(x => norm(x.w) === norm(t)) || { t0: P[id].t0 }).t0;
const VOICE_END = TL.phrases[TL.phrases.length - 1].t1, DUR = VOICE_END + 2.0 + 4.2, T0 = VOICE_END + 2.0;
fs.mkdirSync('build/test', { recursive: true });
const shots = [];   // plans (facultatif pour le son)
// ─ un exemplaire de chaque type
const types = [['ding'], ['no'], ['label'], ['blip'], ['counter', 3], ['pop'], ['scribble', 0.8], ['page'], ['scan', 1.0], ['zoom', 1.0], ['whoosh', 0.5], ['reveal'], ['suspense', 1.2], ['wind', 1.5], ['snowfall', 1.5], ['frost', 1.2],
  ['crack', 1], ['crack', 0.3], ['drip', 1], ['drip', 0.3], ['thaw', 1.5], ['heartbeat', 1], ['heartbeat', 0.5], ['beep'], ['flatline', 1.0], ['glow', 1.5], ['sparkle'], ['ribbit', 1], ['ribbit', 0.8], ['ribbit', 1.3], ['hop'], ['sniff'],
  ['squirt', 0.6], ['splat'], ['yelp'], ['shake'], ['sneeze', 0.8], ['sneeze', 1.0], ['sneeze', 1.3], ['yip'], ['run', 2.0], ['ruler', 12], ['bird', 0], ['bird', 1], ['bird', 2], ['bird', 3], ['vote'], ['endCard'], ['letters'], ['bogus']];
const steps = [10.0, 30.0, 50.0];
const ev = []; let t = 1.0; for (const [type, v] of types) { while (steps.some(s => Math.abs(t - s) < 0.8)) t += 1.5; ev.push({ t: +t.toFixed(3), type, v: v ?? 1 }); t += 1.5; }
for (const s of steps) ev.push({ t: s, type: 'step', v: 1 });
const endT = Math.max(...ev.map(e => e.t)) + 3;
ev.push({ t: endT + 0.5, type: 'logo', v: 1 }); ev.sort((a, b) => a.t - b.t);
fs.writeFileSync('build/test/events_test.json', JSON.stringify({ dur: endT + 6, fps: 30, events: ev, shots }, null, 1));
// ─ jeu plausible calé sur la timeline réelle
const E = [], a = (t, type, v = 1) => E.push({ t: +t.toFixed(3), type, v });
a(0.2, 'snowfall', 3.5); a(1.2, 'frost', 1.5); a(2.2, 'crack', 0.4); a(2.7, 'glow', 1.0); a(w('q', 'vie'), 'heartbeat', 1); a(w('q', 'vie') + 0.9, 'heartbeat', 0.6); a(w('q', 'vie') + 0.05, 'sparkle');
a(w('trois', 'Voici') + 0.1, 'pop'); a(w('trois', 'trois') + 0.1, 'pop'); a(w('trois', 'anecdotes') + 0.1, 'pop'); a(w('trois', 'animaux'), 'whoosh', 0.4); a(w('trois', 'animaux') + 0.3, 'page');
a(w('g1', 'En') + 0.1, 'pop'); a(w('g1', 'Alaska'), 'label'); a(w('g1', 'pouvoir'), 'scan', 1.8); a(w('g1', 'science-fiction') + 0.3, 'sparkle');
a(w('g2', 'Pendant') + 0.05, 'snowfall', 2.5); a(w('g2', 'gèle'), 'frost', 1.8); a(w('g2', 'cœur') - 0.3, 'heartbeat', 1); a(w('g2', 'cœur') + 0.3, 'heartbeat', 0.7); a(w('g2', "s'arrête"), 'beep'); a(w('g2', "s'arrête") + 0.5, 'flatline', 2.0);
a(w('g3', 'Mais') + 0.05, 'zoom', 1.0); a(w('g3', 'sucre'), 'glow', 2.2); a(w('g3', 'cellules'), 'sparkle'); a(w('g3', 'survit'), 'ding');
a(w('g4', 'Au') - 0.1, 'thaw', 2.5); a(w('g4', 'printemps'), 'bird', 0); a(w('g4', 'printemps') + 0.4, 'drip', 0.5); a(w('g4', 'dégèle') - 0.2, 'crack', 1.0); a(w('g4', 'dégèle') + 0.1, 'crack', 0.6); a(w('g4', 'reprend'), 'heartbeat', 1); a(w('g4', 'reprend') + 0.7, 'beep'); a(w('g4', 'vie') - 0.1, 'hop'); a(w('g4', 'vie') + 0.3, 'ribbit', 1); a(w('g4', 'rien'), 'bird', 1);
a(w('l1', 'Au') + 0.05, 'pop'); a(w('l1', 'Mexique'), 'label'); a(w('l1', 'lézards') + 0.2, 'step'); a(w('l1', 'cornes') + 0.2, 'step'); a(w('l1', 'arme'), 'wind', 1.5); a(w('l1', 'improbable'), 'bird', 2);
a(w('l2', "Lorsqu'ils"), 'sniff'); a(w('l2', "Lorsqu'ils") + 0.5, 'step'); a(w('l2', "Lorsqu'ils") + 0.7, 'step'); a(w('l2', 'menacés'), 'whoosh', 0.3); a(w('l2', 'peuvent'), 'suspense', 1.4); a(w('l2', 'sang'), 'squirt', 0.6); a(w('l2', 'sang') + 0.6, 'splat'); a(w('l2', 'sang') + 0.7, 'yelp');
a(w('l3', 'jet') + 0.1, 'ruler', 12); a(w('l3', 'mètre'), 'label');
a(w('l4', 'goût'), 'sniff'); a(w('l4', 'désagréable'), 'shake'); a(w('l4', 'désagréable') + 0.05, 'yelp'); a(w('l4', 'certains') + 0.1, 'step'); a(w('l4', 'certains') + 0.35, 'step'); a(w('l4', 'prédateurs'), 'ding');
a(w('y1', 'En') + 0.05, 'pop'); a(w('y1', 'Afrique'), 'label'); a(w('y1', 'lycaons') + 0.3, 'bird', 3); a(w('y1', 'éternuent'), 'sneeze', 1.0); a(w('y1', 'éternuent') + 0.4, 'yip');
a(w('y2', 'Avant') + 0.2, 'step'); a(w('y2', 'partir'), 'step'); a(w('y2', 'meute'), 'step'); a(w('y2', 'meute') + 0.2, 'step'); a(w('y2', 'rassemblent'), 'yip');
[['Plus', 1, 0.9], ["d'éternuements", 2, 1.0], ['groupe', 3, 1.12], ['chances', 4, 1.2], ['partir', 5, 1.3]].forEach(([wd, n, v]) => { a(w('y3', wd), 'sneeze', v); a(w('y3', wd) + 0.05, 'counter', n); });
a(w('y3', 'partir') + 0.5, 'ding');
a(w('y4', 'voter'), 'vote'); a(w('y4', 'voter') + 0.4, 'yip'); a(w('y4', 'nez') - 0.1, 'sniff'); a(w('y4', 'nez') + 0.2, 'run', 2.4); a(w('y4', 'nez') + 0.3, 'whoosh', 0.5);
a(w('fin', 'Alors'), 'pop'); a(w('fin', 'trois'), 'pop'); a(w('fin', 'anecdotes'), 'pop'); a(w('fin', 'surpris'), 'blip'); a(VOICE_END + 0.05, 'endCard');
a(T0 + 0.48, 'logo'); a(T0 + 0.98, 'letters'); a(T0 + 1.8, 'label');
E.sort((x, y) => x.t - y.t);
fs.writeFileSync('build/test/events_reel.json', JSON.stringify({ dur: DUR, fps: 30, events: E, shots }, null, 1));
// ─ un événement seul, par type (mesure du début / de la fin, sans musique)
types.push(['step']); const seen = new Set(); for (const [type, v] of types) { if (seen.has(type) || type === 'bogus') continue; seen.add(type); fs.writeFileSync(`build/test/solo_${type}.json`, JSON.stringify({ dur: 12, fps: 30, events: [{ t: 1, type, v: v ?? 1 }, { t: 11, type: 'logo', v: 1 }], shots }, null, 1)); }
console.log('events_test.json', ev.length, 'événements, durée', (endT + 6).toFixed(1), '| events_reel.json', E.length, 'événements, durée', DUR.toFixed(2), '| solos', seen.size);
