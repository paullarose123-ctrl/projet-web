// Fabrique les fichiers d'événements d'essai du sonorisateur (dans build/test/) :
//   events_test.json   un exemplaire de chaque type d'événement (espacés de 1,5 s, + un type inconnu), des « step » sur chaque sol, un « logo » en fin
//   solo_<type>.json   un seul événement (1 s après la fin de la voix : aucune parole dessous, donc pas de baisse de niveau), pour les mesures de clic / de fin
//   node son_essai.mjs [timeline.json]
import fs from 'fs';
const TL = JSON.parse(fs.readFileSync(process.argv[2] || 'build/timeline.json', 'utf8')), P = {}; TL.phrases.forEach(p => P[p.id] = p);
const VOICE_END = TL.phrases[TL.phrases.length - 1].t1, OUT = 'build/test';
fs.mkdirSync(OUT, { recursive: true });
const types = [['ding'], ['no'], ['label'], ['blip'], ['counter', 3], ['pop'], ['scribble', 0.8], ['page'], ['whoosh', 0.5], ['whoosh', 0.7], ['reveal'], ['suspense', 1.4], ['wind', 1.5], ['crack', 0.8], ['crack', 0.3], ['heartbeat', 1], ['heartbeat', 0.6], ['glow', 0.6], ['sparkle'], ['hop'], ['step'], ['steam', 1.2], ['run', 1.1], ['bird', 0], ['bird', 1], ['bird', 2], ['bird', 3],
  ['stamp', 0.8], ['stamp', 1], ['stamp', 1.6], ['stamp', 1.8], ['coins', 1.0], ['coins', 1.6], ['typing', 0.8], ['typing', 2], ['train', 2.6], ['train', 1.2], ['gasp'], ['knock'], ['knock', 3], ['shake'], ['endCard'], ['letters'], ['bogus']];
const ev = []; let t = 1.0; for (const [type, v] of types) { ev.push({ t: +t.toFixed(3), type, v: v ?? 1 }); t += 2.2; }
const endT = t + 1; ev.push({ t: endT + 0.5, type: 'logo', v: 1 }); ev.sort((a, b) => a.t - b.t);
fs.writeFileSync(`${OUT}/events_test.json`, JSON.stringify({ dur: endT + 6, fps: 30, events: ev, shots: [] }, null, 1));
const seen = new Set(); for (const [type, v] of types) { if (seen.has(type) || type === 'bogus') continue; seen.add(type); fs.writeFileSync(`${OUT}/solo_${type}.json`, JSON.stringify({ dur: VOICE_END + 14, fps: 30, events: [{ t: VOICE_END + 1, type, v: v ?? 1 }, { t: VOICE_END + 12, type: 'logo', v: 1 }], shots: [] })); }
console.log('events_test.json', ev.length, 'événements, durée', (endT + 6).toFixed(1), '| solos', seen.size);
