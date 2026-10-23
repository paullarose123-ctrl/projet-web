// Fabrique les fichiers d'événements d'essai du sonorisateur (dans build/test/) :
//   events_test.json   un exemplaire de chaque type d'événement (anciens et nouveaux), espacés de 1,5 s (+ un type inconnu), des « step » sur les sols, un « logo » en fin
//   events_reel.json   un jeu d'événements plausible calé sur build/timeline.json (plans de BRIEF-EP2.md), pour mesurer le film entier
//   solo_<type>.json   un seul événement (1 s après la fin de la voix : aucune parole dessous, donc pas de baisse de niveau), pour les mesures de clic / de fin
//   node son_essai.mjs [timeline.json]
import fs from 'fs';
const TLF = process.argv[2] || 'build/timeline.json';
const TL = JSON.parse(fs.readFileSync(TLF, 'utf8')), P = {}; TL.phrases.forEach(p => P[p.id] = p);
const norm = s => s.normalize('NFC').toLowerCase().replace(/[’‘]/g, "'").replace(/[.,:;!?…]/g, '');
const w = (id, t) => { for (const a of Array.isArray(t) ? t : [t]) { const x = P[id].words.find(x => norm(x.w) === norm(a)); if (x) return x.t0; } return P[id].t0; };
const w1 = (id, t) => { for (const a of Array.isArray(t) ? t : [t]) { const x = P[id].words.find(x => norm(x.w) === norm(a)); if (x) return x.t1; } return P[id].t1; };
const last = id => P[id].words[P[id].words.length - 1];
const VOICE_END = TL.phrases[TL.phrases.length - 1].t1, DUR = VOICE_END + 2.0 + 4.2, T0 = VOICE_END + 2.0;
const OUTDIR = process.env.OUTDIR || 'build/test';
fs.mkdirSync(OUTDIR, { recursive: true });
const shots = (() => { const L = 0.12, S = [['i', 0], ['b1_a', P.b1.t0 - L], ['c1_a', P.c1.t0 - L], ['e1_surface', P.e1.t0 - L], ['e1_sous_eau', w('e1', 'une') - 0.1], ['fin_a', P.fin.t0 - L], ['outro', T0]]; return S.map(([id, t0], i) => ({ id, t0, t1: S[i + 1] ? S[i + 1][1] : DUR })); })();
// ─ un exemplaire de chaque type
const types = [['ding'], ['no'], ['label'], ['blip'], ['counter', 3], ['pop'], ['scribble', 0.8], ['page'], ['scan', 1.0], ['zoom', 1.0], ['whoosh', 0.5], ['reveal'], ['suspense', 1.2], ['wind', 1.5], ['snowfall', 1.5], ['frost', 1.2],
  ['crack', 1], ['crack', 0.3], ['drip', 1], ['drip', 0.3], ['thaw', 1.5], ['heartbeat', 1], ['heartbeat', 0.5], ['beep'], ['flatline', 1.0], ['glow', 1.5], ['sparkle'], ['ribbit', 1], ['ribbit', 0.8], ['ribbit', 1.3], ['hop'], ['sniff'],
  ['squirt', 0.6], ['splat'], ['yelp'], ['shake'], ['sneeze', 1.0], ['yip'], ['run', 2.0], ['ruler', 12], ['bird', 0], ['bird', 1], ['bird', 2], ['bird', 3], ['vote'],
  ['zap', 0.5], ['zap', 1], ['zap', 2], ['splash', 0.5], ['splash', 1], ['splash', 2], ['slap'], ['steam', 0.6], ['steam', 1.5], ['bang'], ['bubbles', 0.6], ['bubbles', 1.5], ['flop'], ['heat', 0.8], ['heat', 1.6], ['buzz', 0.6], ['buzz', 1.5],
  ['endCard'], ['letters'], ['bogus']];
// « step » (et « hop ») changent de sol selon le monde : herbe (intro, prairie, fin), boue puis eau (basilic), fond vaseux (anguille)
const steps = [['step', 3.0], ['step', P.b3.t0 + 0.2], ['step', P.c1.t0 + 0.2], ['step', P.c2.t0 + 1.0], ['step', P.e2.t0 + 0.2], ['hop', P.c2.t0 + 2.0], ['hop', P.b2.t0 + 0.2]];
const ev = []; let t = 1.0; for (const [type, v] of types) { while (steps.some(s => Math.abs(t - s[1]) < 0.8)) t += 1.5; ev.push({ t: +t.toFixed(3), type, v: v ?? 1 }); t += 1.5; }
for (const [type, tt] of steps) ev.push({ t: +tt.toFixed(3), type, v: 1 });
const endT = Math.max(...ev.map(e => e.t)) + 3;
ev.push({ t: endT + 0.5, type: 'logo', v: 1 }); ev.sort((a, b) => a.t - b.t);
fs.writeFileSync(`${OUTDIR}/events_test.json`, JSON.stringify({ dur: endT + 6, fps: 30, events: ev, shots }, null, 1));
// ─ jeu plausible calé sur la timeline (un événement par chose visible, à l'instant des mots)
const E = [], a = (t, type, v = 1) => E.push({ t: +t.toFixed(3), type, v });
// accroche : le scientifique, trois silhouettes puis « comme dans un film »
a(0.15, 'whoosh', 0.5); a(w('i1', 'trois') + 0.05, 'pop'); a(w('i1', 'animaux') + 0.02, 'pop'); a(w('i1', 'incroyables'), 'sparkle'); a(w('i1', 'sortent'), 'scan', 0.8); a(last('i1').t0, 'reveal');
// scarabée
a(P.b1.t0 + 0.05, 'pop'); a(P.b1.t0 + 0.3, 'label'); a(w('b1', 'petit'), 'step'); a(w('b1', 'petit') + 0.25, 'step'); a(w('b1', 'scarabée') + 0.2, 'buzz', 0.9); a(w('b1', 'liquide') - 0.1, 'heat', 0.7); a(w('b1', ['100', 'cent']) - 0.15, 'bubbles', 0.6); a(w('b1', ['100', 'cent']), 'label'); a(last('b1').t0, 'steam', 0.7);
a(P.b2.t0 + 0.2, 'whoosh', 0.3); a(w('b2', 'scarabée') + 0.05, 'label'); a(w('b2', 'bombardier'), 'ding');
a(w('b3', 'prédateur') - 0.3, 'hop'); a(w('b3', 'prédateur'), 'step'); a(w('b3', "l'attaque") + 0.1, 'whoosh', 0.3); a(w('b3', 'il') - 0.1, 'page'); a(w('b3', 'mélange'), 'scribble', 0.6); a(w('b3', 'deux') + 0.1, 'label'); a(w('b3', 'substances') + 0.2, 'label');
a(w('b3', 'chimiques'), 'heat', 1.6); a(w('b3', 'abdomen'), 'suspense', 1.5); a(w('b3', 'provoque'), 'zap', 0.8); a(w('b3', 'petite') + 0.1, 'bang'); a(last('b3').t0, 'bang');
a(P.b4.t0 - 0.1, 'page'); a(w('b4', 'jet'), 'squirt', 1.3); a(w('b4', 'jet') + 0.02, 'steam', 1.2); a(w('b4', 'brûlant'), 'splat'); a(w('b4', 'irritant'), 'shake'); a(w('b4', 'fuir'), 'hop'); a(w('b4', 'fuir') + 0.25, 'step'); a(P.b4.t1 + 0.2, 'ding');
// basilic
a(P.c1.t0 + 0.05, 'pop'); a(P.c1.t0 + 0.3, 'label'); a(w('c1', 'Amérique'), 'bird', 1); a(w('c1', 'lézard') + 0.2, 'bird', 0); a(w('c1', 'peut'), 'hop'); a(w('c1', 'courir'), 'splash', 1.3); a(w('c1', 'courir') + 0.05, 'whoosh', 0.6); a(w('c1', 'sur'), 'slap'); a(w('c1', 'sur') + 0.18, 'slap');
a(P.c2.t0 + 0.1, 'whoosh', 0.4); a(w('c2', 'Jésus-Christ'), 'label');
for (let k = 0; k < 16; k++) { const tt = P.c2.t0 + 0.4 + k * 0.2; if (tt < last('c2').t0 + 0.3) { a(tt, 'slap'); if (k % 3 === 0) a(tt + 0.02, 'splash', 0.5); if (k % 2 === 1) a(tt + 0.1, 'step'); } }
a(w('c2', 'pattes'), 'zoom', 0.8); a(w('c2', 'surface'), 'label'); a(last('c2').t0, 'splash', 0.8);
a(w('c3', 'échapper') - 0.1, 'bird', 3); a(w('c3', 'échapper'), 'whoosh', 0.6); a(w('c3', 'ses') - 0.05, 'splash', 1.6); a(last('c3').t0, 'hop'); a(P.c3.t1 + 0.2, 'ding');
// anguille
a(P.e1.t0 + 0.05, 'pop'); a(P.e1.t0 + 0.3, 'label'); a(w('e1', 'une') - 0.15, 'splash', 1.0); a(w('e1', 'une') - 0.05, 'bubbles', 1.2); a(w('e1', "d'anguille") + 0.1, 'bubbles', 0.8);
a(w('e1', 'électrique'), 'zap', 0.6); a(w('e1', 'décharges'), 'zap', 1.0); a(w('e1', "jusqu'à"), 'zap', 1.3); [0, 1, 2, 3, 4, 5].forEach(k => a(w('e1', ['860', 'huit']) + 0.12 * k, 'counter', k + 3)); a(last('e1').t0, 'zap', 2.0);
a(w('e2', 'presque'), 'label'); a(w('e2', 'quatre'), 'zap', 0.5); a(w('e2', 'prise'), 'label'); a(w('e2', 'tension') + 0.1, 'pop'); a(last('e2').t0, 'label');
a(w('e3', 'paralyser'), 'zap', 1.2); a(w('e3', 'paralyser') + 0.2, 'flop'); a(w('e3', 'proies'), 'bubbles', 0.8); a(w('e3', 'se') - 0.1, 'splash', 1.4); a(w('e3', 'se'), 'whoosh', 0.5); a(last('e3').t0, 'zap', 2.0); a(last('e3').t0 + 0.12, 'flop', 1.5); a(P.e3.t1 + 0.1, 'ding');
// question finale et sortie
a(w('fin', 'Alors'), 'pop'); a(w('fin', 'trois'), 'pop'); a(w('fin', 'animaux'), 'pop'); a(w('fin', 'super-pouvoir'), 'blip'); a(VOICE_END + 0.05, 'endCard');
a(T0 + 0.48, 'logo'); a(T0 + 0.98, 'letters'); a(T0 + 1.8, 'label');
E.sort((x, y) => x.t - y.t);
fs.writeFileSync(`${OUTDIR}/events_reel.json`, JSON.stringify({ dur: DUR, fps: 30, events: E, shots }, null, 1));
// ─ un événement seul, par type (mesure du début / de la fin, sans musique)
types.push(['step']); const seen = new Set(); for (const [type, v] of types) { if (seen.has(type) || type === 'bogus') continue; seen.add(type); fs.writeFileSync(`${OUTDIR}/solo_${type}.json`, JSON.stringify({ dur: VOICE_END + 14, fps: 30, events: [{ t: VOICE_END + 1, type, v: v ?? 1 }, { t: VOICE_END + 12, type: 'logo', v: 1 }], shots: [] }, null, 1)); }
console.log('events_test.json', ev.length, 'événements, durée', (endT + 6).toFixed(1), '| events_reel.json', E.length, 'événements, durée', DUR.toFixed(2), '| solos', seen.size);
