// Fabrique des variantes de timeline / d'événements pour les essais de robustesse (build/test/var_*.json) :
//   node son_variante.mjs   écrit var_<nom>_timeline.json et var_<nom>_events.json pour : court (voix ×0,85), long (×1,15), mots (mots clés renommés : repli sur le début de la phrase),
//   sansc3 (phrase c3 absente), noev (aucun des événements qui servent de repères : stamp, crack, ding, reveal, suspense, coins, train), noshots (pas de liste de plans),
//   vide (aucun événement sauf logo), sale (types inconnus, v absent / nul / négatif / NaN / énorme, t hors film, événements en désordre)
import fs from 'fs';
const TL = JSON.parse(fs.readFileSync('build/timeline.json', 'utf8')), EV = JSON.parse(fs.readFileSync(process.env.EVF || 'build/test/events_plans.json', 'utf8'));
const scaleTL = k => { const T = JSON.parse(JSON.stringify(TL)); for (const p of T.phrases) { p.t0 = +(p.t0 * k).toFixed(3); p.t1 = +(p.t1 * k).toFixed(3); for (const w of p.words) { w.t0 = +(w.t0 * k).toFixed(3); w.t1 = +(w.t1 * k).toFixed(3); } } T.duration = +(T.duration * k).toFixed(3); return T; };
const scaleEV = (k, T) => { const E = JSON.parse(JSON.stringify(EV)), ve = T.phrases[T.phrases.length - 1].t1, vo = TL.phrases[TL.phrases.length - 1].t1; E.dur = +(ve + (EV.dur - vo)).toFixed(3);
  const f = t => t <= vo + 0.01 ? +(t * k).toFixed(3) : +(t - vo + ve).toFixed(3); for (const e of E.events) e.t = f(e.t); for (const s of E.shots) { s.t0 = f(s.t0); s.t1 = f(s.t1); } return E; };
const out = (n, T, E) => { fs.writeFileSync(`build/test/var_${n}_timeline.json`, JSON.stringify(T)); fs.writeFileSync(`build/test/var_${n}_events.json`, JSON.stringify(E)); };
for (const [n, k] of [['court', 0.85], ['long', 1.15]]) { const T = scaleTL(k); out(n, T, scaleEV(k, T)); }
const ren = (T, id, from, to) => { const w = T.phrases.find(p => p.id === id).words.find(x => x.w.toLowerCase().startsWith(from)); if (w) w.w = to; else console.warn('mot introuvable', id, from); };
{ const T = JSON.parse(JSON.stringify(TL)); ren(T, 'b2', 'secrète', 'discret'); ren(T, 'b2', 'vendue', 'cédée'); ren(T, 'd2', 'honteux', 'gêné'); ren(T, 'i1', 'alors', 'tandis'); ren(T, 'fin2', 'sans', 'avec'); ren(T, 'c1', 'dans', 'vers'); ren(T, 'c1', 'piège', 'filet'); out('mots', T, EV); }
{ const T = JSON.parse(JSON.stringify(TL)); T.phrases = T.phrases.filter(p => p.id !== 'c3'); out('sansc3', T, EV); }
{ const E = JSON.parse(JSON.stringify(EV)); E.events = E.events.filter(e => !['stamp', 'crack', 'ding', 'reveal', 'suspense', 'coins', 'train', 'step', 'whoosh'].includes(e.type)); out('noev', TL, E); }
{ const E = JSON.parse(JSON.stringify(EV)); E.shots = undefined; out('noshots', TL, E); }
{ const E = JSON.parse(JSON.stringify(EV)); E.events = E.events.filter(e => e.type === 'logo'); E.shots = undefined; out('vide', TL, E); }
{ const E = JSON.parse(JSON.stringify(EV)); E.events = [...E.events.slice(0, 40), { t: 3, type: 'nimportequoi', v: 1 }, { t: 5, type: 'stamp' }, { t: 6, type: 'coins', v: 0 }, { t: 7, type: 'typing', v: -3 }, { t: 8, type: 'train', v: null }, { t: 9, type: 'knock', v: 'abc' }, { t: 10, type: 'stamp', v: 1e9 }, { t: 11, type: 'coins', v: 1e-9 }, { t: -2, type: 'gasp', v: 1 }, { t: 9999, type: 'gasp', v: 1 }, { t: 'x', type: 'stamp', v: 1 }, null, { type: 'stamp' }, ...E.events.slice(40)]; E.shots = [{ id: null }, 5]; out('sale', TL, E); }
console.log('variantes écrites : court long mots sansc3 noev noshots vide sale');
