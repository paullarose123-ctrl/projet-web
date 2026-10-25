// Fabrique des variantes de timeline / d'événements pour les essais de robustesse (build/test/var_*.json) :
//   node son_variante.mjs        écrit var_<nom>_timeline.json et var_<nom>_events.json pour : court (voix ×0,85), long (×1,15), mots (« cent », « huit cent soixante » éclatés),
//   sansc2 (phrase c2 absente), vide (aucun événement sauf logo), sale (types inconnus, v absent / nul / négatif / NaN, t hors film, événements en désordre)
import fs from 'fs';
const TL = JSON.parse(fs.readFileSync('build/timeline.json', 'utf8')), EV = JSON.parse(fs.readFileSync('build/test/events_reel.json', 'utf8'));
const scaleTL = k => { const T = JSON.parse(JSON.stringify(TL)); for (const p of T.phrases) { p.t0 = +(p.t0 * k).toFixed(3); p.t1 = +(p.t1 * k).toFixed(3); for (const w of p.words) { w.t0 = +(w.t0 * k).toFixed(3); w.t1 = +(w.t1 * k).toFixed(3); } } T.duration = +(T.duration * k).toFixed(3); return T; };
const scaleEV = (k, T) => { const E = JSON.parse(JSON.stringify(EV)), ve = T.phrases[T.phrases.length - 1].t1; const old = EV.dur - (TL.phrases[TL.phrases.length - 1].t1); E.dur = +(ve + old).toFixed(3); const vo = TL.phrases[TL.phrases.length - 1].t1; for (const e of E.events) e.t = e.t <= vo + 0.01 ? +(e.t * k).toFixed(3) : +(e.t - vo + ve).toFixed(3); E.shots = []; return E; };
const out = (n, T, E) => { fs.writeFileSync(`build/test/var_${n}_timeline.json`, JSON.stringify(T)); fs.writeFileSync(`build/test/var_${n}_events.json`, JSON.stringify(E)); };
for (const [n, k] of [['court', 0.85], ['long', 1.15]]) { const T = scaleTL(k); out(n, T, scaleEV(k, T)); }
{ const T = JSON.parse(JSON.stringify(TL)); const b1 = T.phrases.find(p => p.id === 'b1'), e1 = T.phrases.find(p => p.id === 'e1');
  b1.words.find(w => w.w === '100').w = 'cent'; const i = e1.words.findIndex(w => w.w === '860'), w = e1.words[i], d = (w.t1 - w.t0) / 3; e1.words.splice(i, 1, { w: 'huit', t0: w.t0, t1: w.t0 + d }, { w: 'cent', t0: w.t0 + d, t1: w.t0 + 2 * d }, { w: 'soixante', t0: w.t0 + 2 * d, t1: w.t1 }); out('mots', T, EV); }
{ const T = JSON.parse(JSON.stringify(TL)); T.phrases = T.phrases.filter(p => p.id !== 'c2'); out('sansc2', T, EV); }
{ const E = JSON.parse(JSON.stringify(EV)); E.events = E.events.filter(e => e.type === 'logo'); E.shots = undefined; out('vide', TL, E); }
{ const E = JSON.parse(JSON.stringify(EV)); E.events = [...E.events.slice(0, 40), { t: 3, type: 'nimportequoi', v: 1 }, { t: 5, type: 'zap' }, { t: 6, type: 'zap', v: 0 }, { t: 7, type: 'splash', v: -3 }, { t: 8, type: 'steam', v: null }, { t: 9, type: 'bubbles', v: 'abc' }, { t: 10, type: 'heat', v: 1e9 }, { t: 11, type: 'buzz', v: 1e-9 }, { t: -2, type: 'bang', v: 1 }, { t: 9999, type: 'bang', v: 1 }, { t: 'x', type: 'zap', v: 1 }, null, { type: 'zap' }, ...E.events.slice(40)]; E.shots = [{ id: null }, 5]; out('sale', TL, E); }
console.log('variantes écrites : court long mots sansc2 vide sale');
