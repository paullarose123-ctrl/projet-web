// node score.mjs build/score.wav   (écrit aussi build/score_music.wav et build/score_sfx.wav : la musique est baissée sous la voix au mixage par rendu.sh)
// Vidéo 5 « L'homme qui a vendu la tour Eiffel » (Victor Lustig, Paris 1925) : musique d'Années folles à la parisienne, entièrement synthétisée
// (jazz-manouche et musette : guitare « pompe » aux cordes d'acier, banjo-guitare, accordéon musette à trois anches, clarinette, piano
// bastringue désaccordé, contrebasse pizzicato, balais sur caisse claire), une AMBIANCE continue par lieu (rue de Paris, terrasse de café,
// bureau du faussaire, salon d'hôtel, pied de la tour, gare, commissariat, crépuscule…) et des bruitages de tous les types d'événements de
// GUIDE.md §4 et BRIEF.md (dont les nouveaux : stamp, coins, typing, train, gasp, knock). Aucun fichier sonore, aucun droit.
// Entrées : build/events.json (node render.mjs piece.html --events) et build/timeline.json (voix.py) ; tout est calé sur les phrases de
// timeline.json (i1, i2, a1, a2, b1, b2, c1-c4, d1-d3, fin, fin2 ; wt(id, mot) : repli sur le début de la phrase si le mot manque) et sur
// les événements ; un type inconnu ou absent ne plante jamais (avertissement), seul 'logo' est obligatoire (sortie).
// Sorties : score.wav (somme) ; score_music.wav = musique + ambiances (adoucies ensemble sous la voix, avec la même libération lente du
// compresseur à sidechain : pas de pompage du fond) ; score_sfx.wav = bruitages seuls.
// Essais :  node score.mjs build/test/score.wav --events build/test/events_test.json [--timeline f] [--stems] [--only music|amb|sfx|demo] [--layer nom] [--check]
//   --stems écrit aussi _musiconly.wav, _amb.wav (mesures) ; --only ne synthétise que cette couche (essais rapides) ;
//   --check liste les attaques de musique et de bruitage qui tombent sur un mot de fin de phrase (zones à garder dégagées).

import fs from 'fs';

// ───────── arguments ─────────
const OPT = {}, POS = [];
{ const A = process.argv.slice(2); for (let i = 0; i < A.length; i++) { const a = A[i]; if (a.startsWith('--')) { const nx = A[i + 1]; if (nx !== undefined && !nx.startsWith('--')) { OPT[a.slice(2)] = nx; i++; } else OPT[a.slice(2)] = true; } else POS.push(a); } }
const OUT = POS[0] || 'build/score.wav', ONLY = typeof OPT.only === 'string' ? OPT.only : null;
const SR = 48000, TAU = Math.PI * 2;
const TRIM = { music: 1.8, amb: 1.4, sfx: 1 }; // musique +3,9 dB, ambiances +2,9 dB : musique + ambiances ≈ −23,5 dBFS RMS avant le mixage de rendu.sh

const EV = JSON.parse(fs.readFileSync(OPT.events || 'build/events.json', 'utf8'));
const TLJ = JSON.parse(fs.readFileSync(OPT.timeline || 'build/timeline.json', 'utf8'));
const EVENTS = (EV.events || []).filter(e => e && Number.isFinite(e.t)).map(e => ({ t: e.t, type: String(e.type), v: Number.isFinite(e.v) ? e.v : 1 })).sort((a, b) => a.t - b.t);
const DUR = EV.dur, N = Math.ceil((DUR + 0.3) * SR);
const WARN = new Set(); const warn = m => { if (!WARN.has(m)) { WARN.add(m); console.warn('score : ' + m); } };

// ───────── outils généraux ─────────
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, u) => a + (b - a) * u;
const dbv = d => Math.pow(10, d / 20), vdb = x => 20 * Math.log10(Math.max(x, 1e-9));
function mkRnd(seed) { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let rnd = mkRnd(12345);                                  // hasard « courant » : chaque morceau, chaque événement le réinitialise (le son d'un événement ne dépend pas des autres)
const rr = (a, b) => a + (b - a) * rnd();
const NOTE = n => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); if (!m) throw new Error('note inconnue : ' + n);
  const st = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * Math.pow(2, (12 * (+m[3] + 1) + st - 69) / 12);
};
const hz = n => typeof n === 'number' ? n : NOTE(n);

// ───────── bus audio (L R + envois de réverbération SL SR) ─────────
function mkBus(n, off = 0) { return { L: new Float32Array(n), R: new Float32Array(n), SL: new Float32Array(n), SR: new Float32Array(n), off, n, lo: 1e12, hi: -1 }; }
const BUS = { music: mkBus(N), amb: mkBus(N), sfx: mkBus(N) };
let B = BUS.music;
const PT = 1024, PL = new Float32Array(PT + 1), PR = new Float32Array(PT + 1);
for (let k = 0; k <= PT; k++) { const p = k / PT * 2 - 1; PL[k] = Math.cos((p + 1) * Math.PI / 4); PR[k] = Math.sin((p + 1) * Math.PI / 4); }
function put(i, v, pan, send) {
  i -= B.off; if (i < 0 || i >= B.n) return;
  const k = Math.round((pan < -1 ? -1 : pan > 1 ? 1 : pan) * PT / 2 + PT / 2), l = v * PL[k], r = v * PR[k];
  B.L[i] += l; B.R[i] += r; B.SL[i] += l * send; B.SR[i] += r * send;
  if (i < B.lo) B.lo = i; if (i > B.hi) B.hi = i;
}
function emit(buf, t0, pan = 0, send = 0.3, gain = 1) {       // écrit un tampon mono ; 1 ms de montée et 12 ms de descente garanties : pas de clic
  logOn(t0, 'emit', gain);
  const s0 = Math.floor(t0 * SR), len = buf.length, fo = Math.min(len, Math.floor(0.012 * SR));
  for (let i = 0; i < len; i++) { let v = buf[i] * gain; if (i < 48) v *= i / 48; if (i > len - fo) v *= (len - i) / fo; put(s0 + i, v, pan, send); }
}

// ───────── phrases de la voix, sections, événements ─────────
const PHR = TLJ.phrases, P = {}; PHR.forEach(p => P[p.id] = p);
const ORDER = ['i1', 'i2', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'c3', 'c4', 'd1', 'd2', 'd3', 'fin', 'fin2'];
const ph = id => P[id] || (() => { warn('phrase manquante : ' + id + ' (repli sur le rang)'); return PHR[Math.min(PHR.length - 1, Math.max(0, ORDER.indexOf(id)))]; })();
const END = PHR[PHR.length - 1].t1, VOICE_END = END;
const norm = s => String(s).normalize('NFC').toLowerCase().replace(/[’‘]/g, "'").replace(/[.,:;!?…]/g, '');
const strip = s => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
// mot d'une phrase : `txt` est un mot ou une liste de graphies possibles (« 1925 » ou « mille ») ; casse, ponctuation et accents tolérés
const findWord = (id, txt, k = 0) => { const W = ph(id).words; for (const a of Array.isArray(txt) ? txt : [txt]) { let c = W.filter(w => norm(w.w) === norm(a)); if (!c.length) c = W.filter(w => strip(w.w) === strip(a)); if (c[k]) return c[k]; } return null; };
const wt = (id, txt, k = 0) => { const w = findWord(id, txt, k); if (!w) { warn(`mot absent ${id} « ${Array.isArray(txt) ? txt.join('|') : txt} » : repli sur le début de la phrase`); return ph(id).t0; } return w.t0; };
const wt1 = (id, txt, k = 0) => { const w = findWord(id, txt, k); return w ? w.t1 : ph(id).t1; };
const lastW = id => { const W = ph(id).words; return W[W.length - 1]; };     // le dernier mot d'une phrase (« pas », « cher », « arnaquer »… : à garder dégagé)
const evs = type => EVENTS.filter(e => e.type === type);
const evIn = (type, a, b) => EVENTS.find(e => e.type === type && e.t >= a && e.t < b) || null;
const evT = (type, a, b, fb) => { const e = evIn(type, a, b); return e ? e.t : fb; };      // date d'un événement du plan, sinon repli sur un mot
const at = type => { const e = evs(type)[0]; if (!e) throw new Error('événement manquant : ' + type); return e.t; };
const LEAD = 0.12, CARD_T = 2.0;                         // comme shots.js
const SEG = {
  intro: [0, ph('a1').t0 - LEAD], idee: [ph('a1').t0 - LEAD, ph('b1').t0 - LEAD], faux: [ph('b1').t0 - LEAD, ph('c1').t0 - LEAD],
  piege: [ph('c1').t0 - LEAD, ph('d1').t0 - LEAD], honte: [ph('d1').t0 - LEAD, ph('fin').t0 - LEAD], fin: [ph('fin').t0 - LEAD, VOICE_END + CARD_T], sortie: [VOICE_END + CARD_T, DUR],
};
const SEGN = ['intro', 'idee', 'faux', 'piege', 'honte', 'fin'];
const segAt = t => { for (const k of SEGN) if (t < SEG[k][1]) return k; return 'sortie'; };
// Mots de fin de phrase : la reconnaissance de parole les relit mal quand une note ou un bruitage tombe dessus (leçon de l'épisode 1 : « yeux », « nez »).
// ZONES = intervalle où aucune attaque de musique n'est posée ; PROT = zone élargie où la musique et les ambiances baissent (voir la fin du fichier).
const ZONES = PHR.map(p => { const w = p.words[p.words.length - 1]; return [w.t0 - 0.06, w.t1 + 0.05]; });
const inZone = t => ZONES.find(z => t > z[0] && t < z[1]) || null;
const clearT = (t, maxShift = 0.7) => { const z = inZone(t); return z && z[1] - t <= maxShift ? z[1] + 0.01 : t; };       // un coup de musique calé sur un mot final est reporté juste après le mot
const MLOG = [], GLOG = [];                                         // --check : attaques de musique (kind, gain) avec leur date
const logOn = (t0, kind, g) => { if (OPT.check && B === BUS.music) MLOG.push([t0, kind, g]); };
// la liste des plans (events.json) : lieu de chaque plan pour les ambiances et la nature du sol sous les pas
const SHOTS_EV = (EV.shots || []).filter(s => s && Number.isFinite(s.t0) && Number.isFinite(s.t1)).map(s => ({ id: String(s.id), t0: s.t0, t1: s.t1 })).sort((a, b) => a.t0 - b.t0);
const shotT = (re, a, b) => { const s = SHOTS_EV.find(s => s.t0 >= a && s.t0 < b && re.test(s.id)); return s ? s.t0 : null; };       // début du premier plan dont l'identifiant correspond, sinon null : on se rabat sur les mots
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const midiOf = n => 69 + 12 * Math.log2(NOTE(n) / 440);


// ───────── filtres, hasard lent ─────────
class Filt {                                             // filtre à variables d'état (TPT) : lp, hp, bp (gain 1 au centre), bpn (bande normalisée en densité spectrale)
  constructor() { this.s1 = 0; this.s2 = 0; this.a1 = 0; this.a2 = 0; this.a3 = 0; this.k = 1; this.nrm = 1; this.bp = 0; this.bpn = 0; this.lp = 0; this.hp = 0; }
  set(fc, q) { fc = clamp(fc, 10, SR * 0.45); const g = Math.tan(Math.PI * fc / SR), k = 1 / q; this.k = k; this.a1 = 1 / (1 + g * (g + k)); this.a2 = g * this.a1; this.a3 = g * this.a2; this.nrm = Math.sqrt((SR / 2) / ((Math.PI / 2) * fc / q)); return this; }
  run(x) { const v3 = x - this.s2, v1 = this.a1 * this.s1 + this.a2 * v3, v2 = this.s2 + this.a2 * this.s1 + this.a3 * v3; this.s1 = 2 * v1 - this.s1; this.s2 = 2 * v2 - this.s2; this.bp = this.k * v1; this.bpn = this.bp * this.nrm; this.lp = v2; this.hp = x - this.k * v1 - v2; return this.bp; }
}
function wander(seed, rate, dt = 1 / SR) {               // valeur lente aléatoire dans [-1, 1] (interpolation douce entre points tirés au hasard)
  const r = mkRnd(seed); let a = r() * 2 - 1, b = r() * 2 - 1, p = r();
  return () => { p += rate * dt; if (p >= 1) { p -= 1; a = b; b = r() * 2 - 1; } const u = p * p * (3 - 2 * p); return a + (b - a) * u; };
}
const interp = (pts, u) => { let k = 0; while (k < pts.length - 2 && u > pts[k + 1][0]) k++; const a = pts[k], b = pts[k + 1], w = sm((u - a[0]) / (b[0] - a[0] || 1)); return a[1] * Math.pow(b[1] / a[1], w); };

// ───────── briques sonores communes ─────────
function tone(t0, dur, o = {}) {                         // sinusoïde (avec harmoniques) à glissando, enveloppe attaque / décroissance / fin
  const { f0 = 440, f1 = f0, curve = 1, gain = 0.1, att = 0.004, rel = 0.02, dec = 0, harm = [1], pan = 0, panTo = null, send = 0.3, vib = 0, vrate = 6, am = 0, arate = 10 } = o;
  logOn(t0, 'tone', gain); const s0 = Math.floor(t0 * SR), len = Math.max(2, Math.floor(dur * SR)); let ph = 0;
  for (let i = 0; i < len; i++) {
    const x = i / SR, u = i / len, f = f0 * Math.pow(f1 / f0, Math.pow(u, curve)) * (vib ? 1 + vib * Math.sin(TAU * vrate * x) : 1); ph += TAU * f / SR;
    let v = 0; for (let k = 0; k < harm.length; k++) v += harm[k] * Math.sin((k + 1) * ph);
    const e = Math.min(1, x / att) * Math.min(1, (dur - x) / rel) * (dec ? Math.exp(-x / dec) : 1) * (am ? 1 - am + am * (0.5 + 0.5 * Math.sin(TAU * arate * x)) : 1);
    put(s0 + i, gain * v * e, panTo === null ? pan : pan + (panTo - pan) * u, send);
  }
}
function nzb(t0, dur, o = {}) {                          // rafale de bruit filtré (lp / bp / hp) à fréquence glissante, enveloppe attaque / décroissance / fin, modulation d'amplitude facultative
  const { type = 'bp', f0 = 1000, f1 = f0, q = 1, gain = 0.1, att = 0.005, rel = 0.05, dec = 0, pan = 0, panTo = null, send = 0.3, curve = 1, am = 0, arate = 14, nrm = true } = o;
  logOn(t0, 'noise', gain); const s0 = Math.floor(t0 * SR), len = Math.max(2, Math.floor(dur * SR)), F = new Filt();
  for (let i = 0; i < len; i++) {
    const x = i / SR, u = i / len; if ((i & 7) === 0) F.set(f0 * Math.pow(f1 / f0, Math.pow(u, curve)), q);
    F.run(rnd() * 2 - 1); const y = type === 'lp' ? F.lp : type === 'hp' ? F.hp : (nrm ? F.bp * Math.sqrt(q) : F.bp);
    const e = Math.min(1, x / att) * Math.min(1, (dur - x) / rel) * (dec ? Math.exp(-x / dec) : 1) * (am ? 1 - am + am * Math.abs(Math.sin(Math.PI * arate * x)) : 1);
    put(s0 + i, gain * y * e, panTo === null ? pan : pan + (panTo - pan) * u, send);
  }
}
function addPartials(buf, f, parts, att = 0.002) {       // parties [rapport, amplitude, constante de temps] : oscillateurs par rotation, décroissance exponentielle
  for (const [r, a, tau] of parts) {
    const fr = f * r; if (fr > SR * 0.46) continue; const w = TAU * fr / SR, c = Math.cos(w), s = Math.sin(w), d = Math.exp(-1 / (tau * SR)); let x = 0, y = 1, amp = a;
    for (let i = 0; i < buf.length; i++) { buf[i] += amp * y * Math.min(1, i / (att * SR)); const nx = x * c - y * s; y = x * s + y * c; x = nx; amp *= d; if (amp < 1e-5) break; }
  }
}
const lpNoise = (len, a) => { const b = new Float32Array(len); let l = 0; for (let i = 0; i < len; i++) { l = l * a + (rnd() * 2 - 1) * (1 - a); b[i] = l; } return b; };


// ───────── instruments conservés de l'épisode précédent (timbres acoustiques) ─────────
function marimba(t0, n, o = {}) {                        // lame de bois : 1, ~4 (accordée), ~10, maillet feutré
  const { gain = 0.07, pan = 0, send = 0.3, tau = null } = o, f = hz(n), T = tau ?? clamp(1.1 * Math.pow(262 / f, 0.5), 0.22, 1.5), len = Math.floor(Math.min(3, T * 5) * SR), buf = new Float32Array(len);
  addPartials(buf, f, [[1, 1, T], [3.97, 0.4, T * 0.28], [9.9, 0.1, T * 0.08]]);
  const ck = lpNoise(Math.floor(0.01 * SR), 0.55); for (let i = 0; i < ck.length; i++) buf[i] += ck[i] * 0.55 * Math.exp(-i / (0.003 * SR)) * (1 - i / ck.length);
  emit(buf, t0, pan, send, gain);
}
function glass(t0, n, o = {}) {                          // cloche de verre / verre frotté : partiels du verre (1, 2,32, 4,25, 6,63), longue résonance, léger battement
  const { gain = 0.06, tau = 3, pan = 0, send = 0.65 } = o, f = hz(n), len = Math.floor(Math.min(8, tau * 3.2) * SR), buf = new Float32Array(len), P_ = [[1, 1, tau], [2.32, 0.3, tau * 0.6], [4.25, 0.18, tau * 0.4], [6.63, 0.08, tau * 0.25], [9.38, 0.04, tau * 0.15]];
  addPartials(buf, f, P_, 0.006); addPartials(buf, f * 1.0013, P_.map(([r, a, t]) => [r, a * 0.55, t]), 0.006);
  emit(buf, t0, pan, send, gain * 0.65);
}
function ksString(f, len, o = {}) {                      // corde de Karplus-Strong accordée (lecture fractionnaire), perte réglée par un temps de réverbération t60
  const { a = 0.6, t60 = 2, pos = 0.18, exc = 0.5 } = o, D = SR / f - (1 - a), M = Math.ceil(D) + 3, dl = new Float32Array(M), nI = Math.max(4, Math.floor(D)), ex = lpNoise(nI, exc);
  let mean = 0; for (let i = 0; i < nI; i++) mean += ex[i]; mean /= nI; const pk = Math.max(1, Math.round(pos * nI)); let mx = 1e-9;
  for (let i = 0; i < nI; i++) { dl[i] = (ex[i] - mean) - (i >= pk ? (ex[i - pk] - mean) : 0); mx = Math.max(mx, Math.abs(dl[i])); } for (let i = 0; i < nI; i++) dl[i] /= mx;
  const g = Math.pow(10, -3 / (t60 * f)), out = new Float32Array(len); let w = nI % M, yp = 0;
  for (let n = 0; n < len; n++) { let r = w - D; if (r < 0) r += M; const i0 = Math.floor(r), fr = r - i0, i1 = i0 + 1 === M ? 0 : i0 + 1, y = dl[i0] * (1 - fr) + dl[i1] * fr; out[n] = y; dl[w] = g * (a * y + (1 - a) * yp); yp = y; if (++w === M) w = 0; }
  { let px = 0, py = 0; for (let n = 0; n < len; n++) { const x = out[n]; py = x - px + 0.9974 * py; px = x; out[n] = py; } }       // bloque la composante continue de la pincée (écart de moyenne : certaines pincées « poussent » la corde d'un côté, ce qui fait un coup sourd inaudible mais pèse sur le niveau)
  return out;
}
function dull(buf, fStart, fEnd, tau) {                  // filtre passe-bas dont la coupure descend (une corde brillante à l'attaque devient ronde en s'éteignant)
  const F = new Filt(); for (let i = 0; i < buf.length; i++) { if ((i & 15) === 0) F.set(fEnd + (fStart - fEnd) * Math.exp(-i / SR / tau), 0.6); F.run(buf[i]); buf[i] = F.lp; }
}
function bodyRes(buf, mix = 1) {                         // caisse de guitare : résonances de table (~100, ~205, ~410 Hz)
  const F = [[100, 6, 0.5], [205, 7, 0.4], [410, 6, 0.2]].map(([f, q, a]) => ({ f: new Filt().set(f, q), a }));
  for (let i = 0; i < buf.length; i++) { const x = buf[i]; let y = x; for (const b of F) { b.f.run(x); y += b.a * b.f.bp * 3 * mix; } buf[i] = y; }
}
function harp(t0, n, o = {}) {                           // harpe : corde plus brillante et plus longue, pincée près du centre
  const { gain = 0.05, pan = 0, send = 0.5, t60 = 3.2 } = o, f = hz(n), len = Math.floor(Math.min(4, t60 * 1.2) * SR), buf = ksString(f, len, { a: 0.85, t60, pos: 0.3, exc: 0.55 });
  dull(buf, clamp(f * 12, 2500, 6500), clamp(f * 3.5, 800, 3000), 0.5); emit(buf, t0, pan, send, gain * 1.4);
}
function pad(t0, dur, notes, o = {}) {                   // nappe douce (sinusoïdes désaccordées, trémolo lent) : celle de la marque, inchangée
  const { gain = 0.06, att = 1.2, rel = 1.5, det = 7, bright = 0.2, send = 0.5, trem = 0.18 } = o;
  if (att < 0.3) logOn(t0, 'pad', gain);                  // une nappe à attaque courte compte comme une note (--check)
  const s0 = Math.floor(t0 * SR), len = Math.floor((dur + rel) * SR);
  notes.forEach((n, k) => {
    const f = hz(n), vs = [-det, 0, det].map(c => f * Math.pow(2, c / 1200)), ph = vs.map(() => rnd() * TAU), pans = [-0.55, 0, 0.55];
    for (let i = 0; i < len; i++) {
      const x = i / SR; let e = x < att ? sm(x / att) : x > dur ? Math.max(0, 1 - (x - dur) / rel) : 1; e = e * e;
      const tr = 1 + 0.12 * Math.sin(TAU * trem * x + k);
      for (let v = 0; v < 3; v++) { const p = ph[v] + TAU * vs[v] * x; put(s0 + i, gain * e * tr * (Math.sin(p) + bright * Math.sin(2 * p) * 0.5 + bright * 0.2 * Math.sin(3 * p)) / 3, pans[v] * 0.8, send); }
    }
  });
}
function drone(t0, dur, f0, f1, o = {}) {                // bourdon grave à glissando (la « tension qui descend ») : sinus + harmoniques pour rester audible sur un petit haut-parleur
  const { gain = 0.07, att = 0.8, rel = 1.6, send = 0.4, glide = [0, 1], h = [1, 0.55, 0.3, 0.12], pan = 0 } = o, s0 = Math.floor(t0 * SR), len = Math.floor((dur + rel) * SR); let ph = 0;
  for (let i = 0; i < len; i++) {
    const x = i / SR, u = clamp((x - glide[0] * dur) / ((glide[1] - glide[0]) * dur || 1)), f = f0 * Math.pow(f1 / f0, sm(u)); ph += TAU * f / SR;
    let v = 0; for (let k = 0; k < h.length; k++) v += h[k] * Math.sin((k + 1) * ph);
    const e = (x < att ? sm(x / att) : x > dur ? Math.max(0, 1 - (x - dur) / rel) : 1) * (1 + 0.06 * Math.sin(TAU * 0.4 * x)); put(s0 + i, gain * v * e * e, pan, send);
  }
}
// instruments d'origine (identiques à la vidéo 2) : sons de la marque et petites interfaces
function bell(t0, n, o = {}) {
  const { gain = 0.08, decay = 2.2, pan = 0, send = 0.6 } = o;
  const f = hz(n), parts = [[1, 1], [2.0, 0.45], [2.76, 0.32], [4.07, 0.18], [5.4, 0.1]];
  const s0 = Math.floor(t0 * SR), len = Math.floor(decay * 2.5 * SR);
  for (let i = 0; i < len; i++) { const x = i / SR; let v = 0; for (const [r, a] of parts) v += a * Math.sin(TAU * f * r * x) * Math.exp(-x * r / decay); put(s0 + i, gain * v * Math.min(1, i / 40) * Math.min(1, (len - i) / 480), pan, send); }
}
function blip(t0, f0, f1, dur, o = {}) {
  const { gain = 0.08, pan = 0, duty = 0.5, send = 0.25 } = o;
  const s0 = Math.floor(t0 * SR), len = Math.floor(dur * SR); let ph = 0, lp = 0;
  for (let i = 0; i < len; i++) {
    const x = i / len, f = f0 * Math.pow(f1 / f0, x); ph += f / SR; const sq = (ph % 1) < duty ? 1 : -1;
    lp += (sq - lp) * 0.35; put(s0 + i, gain * lp * Math.exp(-x * 3) * Math.min(1, i / 30) * Math.min(1, (len - i) / 96), pan, send);
  }
}
function noise(t0, dur, o = {}) {
  const { f0 = 800, f1 = 800, q = 1.2, gain = 0.1, att = 0.05, rel = 0.3, type = 'bp', pan = 0, send = 0.4, panTo = null } = o;
  const s0 = Math.floor(t0 * SR), len = Math.floor(dur * SR); let lo = 0, bd = 0;
  for (let i = 0; i < len; i++) {
    const x = i / SR, u = i / len, fc = Math.min(9000, f0 * Math.pow(f1 / f0, u)), f = 2 * Math.sin(Math.PI * fc / SR);
    const inp = rnd() * 2 - 1; const hi = inp - lo - bd / q; bd += f * hi; lo += f * bd;
    const y = type === 'lp' ? lo : type === 'hp' ? hi : bd;
    const env = (x < att ? x / att : x > dur - rel ? Math.max(0, (dur - x) / rel) : 1);
    put(s0 + i, gain * y * env, panTo === null ? pan : pan + (panTo - pan) * u, send);
  }
}
function sweep(t0, dur, f0, f1, o = {}) {
  const { gain = 0.2, att = 0.005, pan = 0, send = 0.3, curve = 1 } = o;
  const s0 = Math.floor(t0 * SR), len = Math.floor(dur * SR); let ph = 0;
  for (let i = 0; i < len; i++) { const u = i / len, f = f0 * Math.pow(f1 / f0, Math.pow(u, curve)); ph += TAU * f / SR; put(s0 + i, gain * Math.sin(ph) * Math.min(1, i / (att * SR + 1)) * Math.pow(1 - u, 1.5), pan, send); }
}
function thud(t0, g = 1) { sweep(t0, 0.5, 75, 30, { gain: 0.55 * g, send: 0.25 }); noise(t0, 0.25, { type: 'lp', f0: 400, f1: 120, gain: 0.35 * g, att: 0.002, rel: 0.2, send: 0.2 }); }

// chants d'oiseaux : glissando sinusoïdal à enveloppe en cloche, harmoniques, modulations d'amplitude (trille) et de fréquence (gazouillis)
function chirp(t0, dur, pts, o = {}) {
  const { gain = 0.05, pan = 0, send = 0.4, h2 = 0.12, h3 = 0, am = null, fm = null, att = 0.25, fm2 = null } = o;
  const s0 = Math.floor(t0 * SR), len = Math.max(8, Math.floor(dur * SR)); let ph = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len, x = i / SR; let f = interp(pts, u); if (fm) f += fm[1] * Math.sin(TAU * fm[0] * x); if (fm2) f += fm2[1] * Math.sin(TAU * fm2[0] * x + 1.3);
    ph += TAU * f / SR; const e0 = u < att ? sm(u / att) : sm((1 - u) / (1 - att)), e = e0 * (am ? 1 - am[1] * (0.5 + 0.5 * Math.cos(TAU * am[0] * x)) : 1);
    put(s0 + i, gain * e * (Math.sin(ph) + h2 * Math.sin(2 * ph) + h3 * Math.sin(3 * ph)), pan, send);
  }
}
// (les chants d'oiseaux de BIRD sont définis avec les ambiances)
const BIRD = {
  tsit: (t, s, o) => { const n = 3 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) chirp(t + k * 0.115 * (0.9 + 0.2 * rnd()), 0.06, [[0, 5400 * s], [1, 4300 * s]], { ...o, h2: 0.05, att: 0.3 }); },
  whistle: (t, s, o) => { chirp(t, 0.22, [[0, 2700 * s], [0.45, 3400 * s], [1, 3200 * s]], { ...o, att: 0.25, h2: 0.04 }); chirp(t + 0.3, 0.3, [[0, 3700 * s], [1, 2900 * s]], { ...o, h2: 0.03 }); },
  trill: (t, s, o) => chirp(t, 0.7, [[0, 3500 * s], [0.5, 4000 * s], [1, 3600 * s]], { ...o, am: [31, 0.85], att: 0.12, h2: 0.05 }),
  chick: (t, s, o) => { chirp(t, 0.3, [[0, 3900 * s], [1, 3850 * s]], { ...o, h2: 0, att: 0.15 }); chirp(t + 0.42, 0.38, [[0, 3350 * s], [1, 3300 * s]], { ...o, h2: 0, att: 0.15 }); },
  warble: (t, s, o) => chirp(t, 1.1, [[0, 3000 * s], [0.3, 3300 * s], [0.7, 2800 * s], [1, 3100 * s]], { ...o, fm: [11, 520 * s], fm2: [17, 240 * s], att: 0.1, h2: 0.08 }),
};

function hum(t0, dur, n, o = {}) {                       // ronflement électrique : fondamentale grave et harmoniques 2 à 6 (audibles sur un petit haut-parleur), battement lent, trémolo
  const { gain = 0.03, att = 1.0, rel = 1.2, send = 0.3, h = [0.45, 1, 0.8, 0.5, 0.3, 0.14], pan = 0 } = o, f = hz(n);
  logOn(t0, 'hum', gain); const s0 = Math.floor(t0 * SR), len = Math.floor((dur + rel) * SR); let p1 = 0, p2 = 0;
  for (let i = 0; i < len; i++) {
    const x = i / SR; p1 += TAU * f / SR; p2 += TAU * f * 1.0035 / SR;
    let v = 0; for (let k = 0; k < h.length; k++) v += h[k] * 0.5 * (Math.sin((k + 1) * p1) + Math.sin((k + 1) * p2 + 0.7 * k));
    const e = x < att ? sm(x / att) : x > dur ? Math.max(0, 1 - (x - dur) / rel) : 1;
    put(s0 + i, gain * v * e * e * (1 + 0.1 * Math.sin(TAU * 0.23 * x)), pan, send);
  }
}

// ───────── ambiances : tampons temporaires normalisés en RMS ─────────
function layer(a, b, o, gen) {                           // gen() dessine dans le bus temporaire B (temps absolus) ; niveau RMS réglé (dBFS avant mastering) sur la couche elle-même, sur une couche de référence de 14 s (ref : les sons rares gardent le même niveau quelle que soit la durée du plan), ou fixe (fixed : multiplicateur) ; fondus d'entrée / sortie, envoi de réverbération
  if (OPT.layer && o.name !== OPT.layer) return;
  const { fi = 1, fo = 1, rms = -34, send = 0.2, mul = null, dest = BUS.amb, ref = false, fixed = null } = o, s0 = Math.max(0, Math.floor(a * SR)), s1 = Math.min(N, Math.floor(b * SR)), len = s1 - s0; if (len <= 8) return;
  const TB = mkBus(len, s0), prev = B; B = TB; gen(TB); B = prev;
  let k;
  if (fixed !== null) k = fixed;
  else { let r0; if (ref) { if (!REFR[o.name]) { const nR = 14 * SR, RB = mkBus(nR, 0), pv = B, sv = rnd; B = RB; gen(RB); B = pv; rnd = sv; let e = 0; for (let i = 0; i < nR; i++) e += (RB.L[i] * RB.L[i] + RB.R[i] * RB.R[i]) / 2; REFR[o.name] = Math.sqrt(e / nR) || 1; } r0 = REFR[o.name]; }
    else { let e = 0; for (let i = 0; i < len; i++) e += (TB.L[i] * TB.L[i] + TB.R[i] * TB.R[i]) / 2; r0 = Math.sqrt(e / len) || 1; } k = dbv(rms) / r0; }
  const d0 = s0 - dest.off; if (d0 < 0 || d0 + len > dest.n) return;
  for (let i = 0; i < len; i++) {
    const x = i / SR, env = sm(x / fi) * sm((len / SR - x) / fo) * (mul ? mul(a + x) : 1) * k, l = TB.L[i] * env, r = TB.R[i] * env;
    dest.L[d0 + i] += l; dest.R[d0 + i] += r; dest.SL[d0 + i] += l * send + TB.SL[i] * env; dest.SR[d0 + i] += r * send + TB.SR[i] * env;
  }
  dest.lo = Math.min(dest.lo, d0); dest.hi = Math.max(dest.hi, d0 + len - 1);
}
const REFR = {};
function genWind(o) {                                    // vent : bruit en bande étroite dont la fréquence et le niveau suivent de grandes rafales lentes, sifflement, grondement ; canaux décorrélés
  const { f0 = 380, q = 2.2, whistle = 0.25, rumble = 0.5, seed = 1, depth = 1, wf = 1500, hiss = 0, rate = 1 } = o;
  return b => {
    for (let c = 0; c < 2; c++) {
      const rg = mkRnd(seed * 31 + c * 7 + 1), wc = wander(seed * 5 + 1, 0.27 * rate, 16 / SR), wl = wander(seed * 5 + 2 + c, 0.7 * rate, 16 / SR), wf_ = wander(seed * 5 + 4 + c, 1.1, 16 / SR), wh = wander(seed * 5 + 7 + c, 0.5, 16 / SR);
      const F1 = new Filt(), F2 = new Filt(), F3 = new Filt(), F4 = new Filt(), out = c ? b.R : b.L; let A = 0.5, g = 0.5;
      for (let i = 0; i < b.n; i++) {
        if ((i & 15) === 0) {
          g = clamp(0.5 + 0.85 * depth * (0.65 * wc() + 0.35 * wl()), 0, 1); A = 0.1 + 0.9 * Math.pow(g, 2);
          F1.set(f0 * (0.6 + 1.0 * g) * (1 + 0.08 * wf_()), q); F2.set(wf * (0.8 + 0.6 * g) * (1 + 0.05 * wh()), 12); F3.set(120 * (0.8 + 0.4 * g), 0.8); F4.set(4200, 0.7);
        }
        const n = rg() * 2 - 1; F1.run(n); F2.run(n); F3.run(n); F4.run(n);
        out[i] += F1.bpn * A + F2.bpn * whistle * A * A * A + F3.lp * rumble * A * 3 + F4.hp * hiss * A;
      }
    }
  };
}
function genHush(o) {                                    // souffle de neige / air : bruit haut très doux à variation lente
  const { seed = 11, f = 5200 } = o;
  return b => { for (let c = 0; c < 2; c++) { const rg = mkRnd(seed + c * 3), w = wander(seed + c, 0.3, 16 / SR), F = new Filt(), G = new Filt().set(Math.min(9500, f * 2), 0.7), out = c ? b.R : b.L; let a = 1; for (let i = 0; i < b.n; i++) { if ((i & 15) === 0) { F.set(f * (1 + 0.2 * w()), 0.7); a = 0.7 + 0.3 * w(); } F.run(rg() * 2 - 1); G.run(F.hp); out[i] += G.lp * a; } } };
}
function genCrickets(o) {                                // grillons : impulsions de porteuse 4-5 kHz regroupées en « trrr-trrr » ; chaque grillon a sa hauteur, son rythme, sa place
  const { n = 5, seed = 3, fc = [4200, 4800], rate = [1.8, 3.2], pulses = [3, 5], pr = [36, 52], spread = 0.85, mulAmp = null } = o;
  return b => {
    const rg = mkRnd(seed), t1 = (b.off + b.n) / SR;
    for (let k = 0; k < n; k++) {
      const f = lerp(fc[0], fc[1], rg()), rateG = lerp(rate[0], rate[1], rg()), np = Math.round(lerp(pulses[0], pulses[1], rg())), prate = lerp(pr[0], pr[1], rg()), pan = n > 1 ? (k / (n - 1) * 2 - 1) * spread : 0, amp = 0.55 + 0.45 * rg();
      let t = b.off / SR + rg() * 0.5; const wob = wander(seed * 13 + k, 0.15, 1 / 20);
      while (t < t1) {
        const n2 = np + (rg() < 0.3 ? 1 : 0), f2 = f * (1 + 0.004 * (rg() - 0.5) + 0.006 * wob()), ga = amp * (0.7 + 0.3 * rg()) * (mulAmp ? mulAmp(t) : 1);
        for (let p = 0; p < n2; p++) { const tp = t + p / prate, dur = 0.58 / prate, s = Math.floor(tp * SR), L = Math.floor(dur * SR), w = TAU * f2 / SR, a = ga * (0.65 + 0.35 * p / Math.max(1, n2 - 1)); for (let j = 0; j < L; j++) { const e = Math.sin(Math.PI * j / L); put(s + j, a * e * e * Math.sin(w * j), pan, 0.22); } }
        t += (1 / rateG) * (0.92 + 0.16 * rg());
      }
    }
  };
}
function genBirds(o) {                                   // oiseaux : appels tirés au hasard (Poisson) parmi des espèces pondérées ; densité variable dans le temps
  const { seed = 41, rate = () => 0.4, species = [['tsit', 1], ['whistle', 1], ['trill', 1]], gain = 0.06, far = 0.5, scale = [0.9, 1.15], sendNear = 0.5, sendFar = 0.85 } = o;
  return b => {
    const rg = mkRnd(seed), t1 = (b.off + b.n) / SR, tot = species.reduce((s, x) => s + x[1], 0); let t = b.off / SR + rg() * 0.6; const save = rnd; rnd = rg;
    while (t < t1) {
      let r = rg() * tot, sp = species[0][0]; for (const [n, w] of species) { if (r < w) { sp = n; break; } r -= w; }
      const isFar = rg() < far, s = lerp(scale[0], scale[1], rg()), g = gain * (isFar ? 0.45 : 1) * (0.6 + 0.4 * rg()), pan = rg() * 1.8 - 0.9;
      BIRD[sp](t, s, { gain: g, pan, send: isFar ? sendFar : sendNear }); if (rg() < 0.35) BIRD[sp](t + 0.9 + rg() * 0.6, s * (0.95 + 0.1 * rg()), { gain: g * 0.8, pan, send: isFar ? sendFar : sendNear });
      t += -Math.log(1 - rg()) / Math.max(0.03, rate(t));
    }
    rnd = save;
  };
}


// ───────── l'orchestre des Années folles (tous les timbres sont synthétisés) ─────────
// `gain` de chaque instrument = niveau RMS visé de la note sur ses 150 premières ms (nrm) : on règle l'équilibre de l'orchestre sans surprise.
function nrm(buf, win = 7200, lim = 3.5, from = 0) {      // normalise un tampon (RMS des `win` échantillons qui suivent `from` = 1 ; `from` saute l'attaque des notes à montée lente), écrête doucement les pointes ; renvoie le gain à appliquer
  from = Math.min(Math.max(0, from), Math.max(0, buf.length - 2)); const n = Math.max(1, Math.min(win, buf.length - from)); let e = 1e-12; for (let i = from; i < from + n; i++) e += buf[i] * buf[i];
  const L = lim * Math.sqrt(e / n); e = 1e-12; for (let i = 0; i < buf.length; i++) { buf[i] = L * Math.tanh(buf[i] / L); if (i >= from && i < from + n) e += buf[i] * buf[i]; }
  return 1 / Math.sqrt(e / n);
}
const cap = (L, t0, o) => o.until ? Math.min(L, Math.max(16, Math.floor((o.until - t0) * SR))) : L;       // `until` : la note est coupée à cette date (une coupure franche ne laisse rien sonner après elle)
function gstring(f, len, o = {}) {                        // corde d'acier de guitare manouche : Karplus-Strong brillant, qui s'arrondit en s'éteignant
  const { t60 = 0.9, a = 0.78, pos = 0.14, exc = 0.88, bright = 1, tau = 0.12 } = o, buf = ksString(f, len, { a, t60, pos, exc });
  dull(buf, clamp(f * 13 * bright, 1800, 7000), clamp(f * 3.2, 450, 2000), tau); return buf;
}
function gtr(t0, f, o = {}) {                             // une note de guitare (solo, arpège, pizzicato)
  const { gain = 0.03, pan = -0.2, send = 0.25, t60 = 0.9, bright = 1, len = null } = o, L = cap(Math.floor((len ?? Math.min(2.2, t60 * 1.6 + 0.1)) * SR), t0, o), buf = gstring(f, L, { t60, bright });
  bodyRes(buf, 0.6); emit(buf, t0, pan, send, gain * nrm(buf));
}
function gtrStrum(t0, fs, o = {}) {                       // accord de guitare : cordes pincées l'une après l'autre (haut → bas si dir < 0), étouffé comme dans la « pompe » (t60 court) + petit claquement des doigts
  const { gain = 0.03, dir = 1, st = 0.006, t60 = 0.32, pan = -0.25, send = 0.2, bright = 1, tau = 0.05, chuck = 0.5 } = o;
  const order = dir >= 0 ? fs : fs.slice().reverse(), n = order.length, L = cap(Math.floor((t60 * 1.5 + 0.06) * SR), t0, o);
  order.forEach((f, i) => { const buf = gstring(f, L, { t60, bright, tau, a: 0.72 }); bodyRes(buf, 0.5); emit(buf, t0 + i * st * (0.8 + 0.4 * rnd()), pan + 0.12 * (i / Math.max(1, n - 1) - 0.5), send, gain * nrm(buf) * (0.8 + 0.4 * rnd()) / Math.sqrt(n)); });
  if (chuck > 0) nzb(t0, 0.014, { type: 'bp', f0: 2300, q: 1.1, gain: gain * 0.9 * chuck, att: 0.0008, rel: 0.008, pan, send: 0.08 });
}
function banjo(t0, f, o = {}) {                           // banjo-guitare : corde vive et sèche, la peau tendue sonne dessous (résonances 560 et 1 180 Hz), claquement du médiator
  const { gain = 0.03, t60 = 0.3, pan = 0.3, send = 0.15, bright = 1 } = o, L = cap(Math.floor(Math.min(1.0, t60 * 1.8 + 0.06) * SR), t0, o), buf = ksString(f, L, { a: 0.9, t60, pos: 0.07, exc: 0.97 });
  dull(buf, clamp(f * 18 * bright, 3500, 9500), clamp(f * 6, 1200, 4000), 0.04);
  const H1 = new Filt().set(560, 6), H2 = new Filt().set(1180, 7);
  for (let i = 0; i < L; i++) { const x = buf[i]; H1.run(x); H2.run(x); buf[i] = x * 0.75 + (H1.bp * 0.9 + H2.bp * 0.5) * 0.6; }
  const pk = lpNoise(Math.floor(0.003 * SR), 0.05); for (let i = 0; i < pk.length; i++) buf[i] += pk[i] * 0.6 * (1 - i / pk.length);
  emit(buf, t0, pan, send, gain * nrm(buf, 4800));
}
function banjoStrum(t0, fs, o = {}) { const { gain = 0.03, dir = 1, st = 0.005 } = o, order = dir >= 0 ? fs : fs.slice().reverse(); order.forEach((f, i) => banjo(t0 + i * st, f, { ...o, gain: gain / Math.sqrt(order.length) * 1.3, pan: (o.pan ?? 0.3) + 0.08 * (i - order.length / 2) / order.length })); }
const blep = (t, dt) => t < dt ? (t /= dt, t + t - t * t - 1) : t > 1 - dt ? (t = (t - 1) / dt, t * t + t + t + 1) : 0;       // correction PolyBLEP : pas de repliement sur les anches aiguës
function acc(t0, dur, fs, o = {}) {                       // accordéon musette : trois anches par note (désaccordées de ± det cents : le « tremblé » des Années folles) + une anche grave ; soufflet (vibrato, tremblement, gonflement)
  const { gain = 0.03, att = 0.05, rel = 0.12, det = 11, vib = 0.004, vrate = 5.4, trem = 0, trate = 7, pan = 0, send = 0.35, bright = 1, swell = 0, low = 0.22, air = 1 } = o;
  const len = Math.floor((dur + rel) * SR), s0 = Math.floor(t0 * SR), nF = fs.length; logOn(t0, 'acc', gain);
  fs.forEach((f0, k) => {
    for (const [cents, pn, lv] of [[-det, -0.4, 1], [0, 0, 1], [det, 0.4, 1], [-1200, 0, low]]) {
      const f = f0 * Math.pow(2, cents / 1200), F = new Filt().set(clamp(f * 6.5 * bright, 500, 3600), 0.7), G = new Filt().set(clamp(f * 3.1, 900, 2600), 2.2), dph = f / SR; let ph = rnd();
      for (let i = 0; i < len; i++) {
        const x = i / SR; ph += dph * (1 + vib * Math.sin(TAU * vrate * x + k)); if (ph >= 1) ph -= 1;
        const saw = ph * 2 - 1 - blep(ph, dph), pul = (ph < 0.3 ? 1 : -1) + blep(ph, dph) - blep((ph - 0.3 + 1) % 1, dph), w = 0.6 * saw + 0.4 * pul;
        F.run(w); G.run(w);
        const e = (x < att ? sm(x / att) : x > dur ? Math.max(0, 1 - (x - dur) / rel) : 1) * (1 + swell * Math.sin(Math.PI * clamp(x / dur))) * (trem ? 1 - trem * (0.5 + 0.5 * Math.sin(TAU * trate * x)) : 1);
        put(s0 + i, gain * lv * e * (F.lp * 0.8 + G.bp * 0.3) / Math.sqrt(nF) * 1.4, pan + pn * 0.6, send);
      }
    }
  });
  if (air > 0) nzb(t0, 0.07, { type: 'bp', f0: 2200, q: 0.8, gain: gain * 0.35 * air, att: 0.01, rel: 0.04, pan, send: 0.2 });          // le souffle du soufflet à l'attaque
}
function clar(t0, dur, f0, o = {}) {                      // clarinette : harmoniques impaires, souffle, vibrato tardif ; scoop = attaque par en dessous (demi-tons), fall = chute en fin de note, drift = dérive de hauteur (cents) sur la note
  const { gain = 0.035, pan = 0.25, send = 0.4, vib = 0.006, vrate = 5.3, vdel = 0.3, att = 0.035, rel = 0.07, breath = 0.05, scoop = 0, fall = 0, bright = 1, drift = 0, detune = 0, fallAt = null, fallDur = 0.25, h = [1, 0, 0.5, 0, 0.3, 0, 0.14, 0, 0.08, 0, 0.04] } = o;
  const len = Math.floor((dur + rel) * SR), buf = new Float32Array(len), BR = new Filt().set(f0 * 3.2, 1.2), LP = new Filt().set(clamp(f0 * 8 * bright, 1200, 6000), 0.6); let ph = 0; logOn(t0, 'clar', gain);
  for (let i = 0; i < len; i++) {
    const x = i / SR, bend = scoop * Math.exp(-x / 0.07) - fall * sm((x - (fallAt ?? dur - fallDur)) / fallDur) + (detune + drift * clamp(x / dur)) / 100, f = f0 * Math.pow(2, bend / 12) * (1 + vib * sm((x - vdel) / 0.3) * Math.sin(TAU * vrate * x));
    ph += TAU * f / SR; let v = 0; for (let k = 0; k < h.length; k++) if (h[k]) v += h[k] * Math.sin((k + 1) * ph);
    const e = x < att ? sm(x / att) : x > dur ? Math.max(0, 1 - (x - dur) / rel) : 1; BR.run(rnd() * 2 - 1); LP.run(v);
    buf[i] = e * (LP.lp * 0.75 + BR.bpn * breath * 0.4) * (1 + 0.04 * Math.sin(TAU * 4.1 * x));
  }
  const tk = lpNoise(Math.floor(0.004 * SR), 0.2); for (let i = 0; i < tk.length; i++) buf[i] += tk[i] * 0.25 * (1 - i / tk.length);        // coup de langue
  emit(buf, t0, pan, send, gain * nrm(buf, 7200, 3, Math.floor(Math.min(att + 0.02, dur * 0.5) * SR)));
}
function piano(t0, f, o = {}) {                           // piano bastringue : trois cordes par note désaccordées (± 9 / 7 cents), partiels un peu inharmoniques, marteau sec
  const { gain = 0.04, pan = 0, send = 0.3, dm = 1, honky = 1.5, bright = 1, B_ = 0.0005 } = o;
  const T = clamp(1.4 * Math.pow(262 / f, 0.55), 0.18, 2.2) * dm, len = cap(Math.floor(Math.min(2.8, T * 3.4) * SR), t0, o), buf = new Float32Array(len), parts = [];
  for (let k = 1; k <= 9; k++) parts.push([k * Math.sqrt(1 + B_ * k * k), (k === 1 ? 1 : 0.9 / Math.pow(k, 0.65)) * (k >= 3 && k <= 6 ? bright : 1), T / (1 + 0.55 * (k - 1))]);
  addPartials(buf, f, parts, 0.0015); addPartials(buf, f * Math.pow(2, 9 * honky / 1200), parts.map(([r, a, t]) => [r, a * 0.85, t * 0.9]), 0.0015); addPartials(buf, f * Math.pow(2, -7 * honky / 1200), parts.map(([r, a, t]) => [r, a * 0.8, t * 0.95]), 0.0015);
  const hm = lpNoise(Math.floor(0.007 * SR), 0.3); for (let i = 0; i < hm.length; i++) buf[i] += hm[i] * 0.7 * (1 - i / hm.length);
  emit(buf, t0, pan, send, gain * nrm(buf, 4800));
}
function pianoChord(t0, fs, o = {}) { const { gain = 0.04, roll = 0.012 } = o; fs.forEach((f, i) => piano(t0 + i * roll * (0.7 + 0.6 * rnd()), f, { ...o, gain: gain / Math.sqrt(fs.length) * 1.2, pan: (o.pan ?? 0) + 0.1 * (i - fs.length / 2) / fs.length })); }
function dbass(t0, f, o = {}) {                           // contrebasse pizzicato : corde grave filtrée + fondamentale et 2e / 3e harmoniques qui sonnent un instant (présence sur un petit haut-parleur) + claquement de la corde sur la touche
  const { gain = 0.05, pan = -0.05, send = 0.12, t60 = 0.75 } = o, L = cap(Math.floor(Math.min(1.6, t60 * 1.5) * SR), t0, o), buf = ksString(f, L, { a: 0.5, t60, pos: 0.1, exc: 0.8 }), F = new Filt().set(Math.max(380, f * 7), 0.7);
  for (let i = 0; i < L; i++) { F.run(buf[i]); buf[i] = F.lp; }
  addPartials(buf, f, [[1, 0.5, 0.22], [2, 0.35, 0.16], [3, 0.2, 0.1]], 0.004);
  const tk = lpNoise(Math.floor(0.005 * SR), 0.45); for (let i = 0; i < tk.length; i++) buf[i] += tk[i] * 0.5 * (1 - i / tk.length);
  emit(buf, t0, pan, send, gain * nrm(buf, 4800));
}
// balais et caisse claire
function brushSwish(t0, dur, o = {}) { const { gain = 0.02, pan = 0.1, send = 0.12, f = 5200 } = o; logOn(t0, 'brush', gain); nzb(t0, dur, { type: 'bp', f0: f * 0.8, f1: f * 1.25, q: 0.7, gain, att: dur * 0.55, rel: dur * 0.35, pan, send }); nzb(t0, dur, { type: 'hp', f0: 3200, gain: gain * 0.55, att: dur * 0.65, rel: dur * 0.3, pan, send }); }
function brushTap(t0, g = 1, o = {}) { const { pan = 0.15, send = 0.12 } = o; logOn(t0, 'tap', g); nzb(t0, 0.035, { type: 'bp', f0: 2700, q: 0.6, gain: 0.05 * g, att: 0.0006, rel: 0.02, dec: 0.012, pan, send }); nzb(t0, 0.07, { type: 'hp', f0: 5200, gain: 0.03 * g, att: 0.001, rel: 0.04, dec: 0.02, pan, send }); tone(t0, 0.07, { f0: 200, f1: 165, gain: 0.035 * g, att: 0.001, rel: 0.02, dec: 0.02, pan, send }); }
function brushRoll(t0, dur, o = {}) { const { gain = 0.02, pan = 0.1, from = 0.3, to = 1.2, rate = 26 } = o; logOn(t0, 'roll', gain); nzb(t0, dur, { type: 'bp', f0: 3500, f1: 5500, q: 0.6, gain, att: dur * 0.2, rel: 0.05, pan, am: 0.85, arate: rate, send: 0.12, curve: 1 }); const n = Math.round(dur * rate); for (let k = 0; k < n; k++) { const u = k / n; brushTap(t0 + dur * u, (from + (to - from) * u) * 0.35, { pan }); } }
function kickS(t, g = 1) { logOn(t, 'kick', g); tone(t, 0.26, { f0: 115, f1: 52, curve: 0.35, gain: 0.16 * g, att: 0.002, rel: 0.05, dec: 0.07, harm: [1, 0.25], send: 0.12 }); nzb(t, 0.02, { type: 'lp', f0: 800, f1: 300, gain: 0.08 * g, att: 0.001, rel: 0.012, send: 0.1 }); }
function rimS(t, g = 1, pan = 0.1) { logOn(t, 'rim', g); nzb(t, 0.03, { type: 'bp', f0: 1900, q: 0.8, gain: 0.12 * g, att: 0.0005, rel: 0.02, pan }); tone(t, 0.09, { f0: 330, f1: 250, gain: 0.07 * g, att: 0.001, rel: 0.02, dec: 0.03, harm: [1, 0.5], pan }); nzb(t, 0.07, { type: 'hp', f0: 5500, gain: 0.04 * g, att: 0.001, rel: 0.04, dec: 0.025, pan }); }


// ───────── ambiances : générateurs (tampons temporaires normalisés en RMS par layer()) ─────────
// oiseaux de Paris (en plus des chants de chirp) : pigeon qui roucoule, battements d'ailes, martinet qui crie, moineau
BIRD.coo = (t, s, o) => { [[0, 0.3, 500], [0.42, 0.2, 560], [0.7, 0.2, 550], [0.98, 0.5, 490]].forEach(([d, du, f]) => chirp(t + d, du, [[0, f * s * 1.04], [1, f * s]], { ...o, att: 0.35, h2: 0.25, h3: 0.06 })); };
BIRD.flap = (t, s, o) => { const n = 7 + Math.floor(rnd() * 5); let x = t, iv = 0.055; for (let k = 0; k < n; k++) { nzb(x, 0.03, { type: 'bp', f0: 650 * s, q: 0.8, gain: (o.gain || 0.05) * 1.6 * (1 - 0.5 * k / n), att: 0.003, rel: 0.018, pan: o.pan, send: o.send ?? 0.4 }); x += iv; iv *= 1.07; } };
BIRD.swift = (t, s, o) => { chirp(t, 0.42, [[0, 4600 * s], [0.35, 6100 * s], [1, 5000 * s]], { ...o, fm: [24, 360 * s], att: 0.3, h2: 0.05 }); };
BIRD.sparrow = (t, s, o) => { const n = 3 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) chirp(t + k * 0.16 * (0.85 + 0.3 * rnd()), 0.085, [[0, (3100 + 500 * rnd()) * s], [0.5, 3500 * s], [1, 2900 * s]], { ...o, h2: 0.1, att: 0.3 }); };
function genMurmur(o) {                                  // murmure de voix indistinctes : source glottale (hauteurs différentes), trois formants qui changent de voyelle à chaque syllabe, phrases de 0,7 à 2,7 s séparées de pauses
  const { n = 5, seed = 301, pitch = [95, 240], rate = [2.4, 4.6], gap = [0.5, 2.2], lp = 3000, mulAmp = null, spread = 0.9, send = 0.3, breathy = 0.25 } = o;
  const VOW = [[700, 1220], [530, 1840], [270, 2290], [570, 840], [300, 870], [400, 1600], [450, 1000]];
  return b => {
    const t1 = (b.off + b.n) / SR;
    for (let k = 0; k < n; k++) {
      const rg = mkRnd(seed + k * 13), f0 = lerp(pitch[0], pitch[1], rg()), pan = n > 1 ? (k / (n - 1) * 2 - 1) * spread : 0, amp = 0.5 + 0.5 * rg(); let t = b.off / SR - 2.7 * rg();       // chaque voix a déjà commencé à parler quand le plan commence
      while (t < t1) {
        const dur = 0.7 + 2.0 * rg(), L = Math.floor(dur * SR), s0 = Math.floor(t * SR), sr_ = lerp(rate[0], rate[1], rg()), ph0 = rg(), ga = amp * (mulAmp ? mulAmp(t) : 1);
        const F1 = new Filt(), F2 = new Filt(), F3 = new Filt(), FR = new Filt().set(3600, 0.7), LP = new Filt().set(lp, 0.7); let ph = 0, c1 = 600, c2 = 1500, lastSyl = -1, v1 = VOW[0], pause = 0, fc = f0, pt = f0, fric = 0;
        for (let i = 0; i < L; i++) {
          const x = i / SR, sx = x * sr_ + ph0, syl = Math.floor(sx);
          if (syl !== lastSyl) { lastSyl = syl; v1 = VOW[Math.floor(rg() * VOW.length)]; pause = rg() < 0.16 ? 1 : 0; pt = f0 * (0.82 + 0.4 * rg()); fric = rg() < 0.35 ? 1 : 0; }       // chaque syllabe a sa hauteur, sa voyelle, parfois une consonne sifflante au début
          c1 += (v1[0] - c1) * 0.0015; c2 += (v1[1] - c2) * 0.0015;
          if ((i & 15) === 0) { F1.set(c1, 5); F2.set(c2, 6); F3.set(2700, 7); }
          fc += (pt - fc) * 0.0012; ph += fc * (1 + 0.03 * Math.sin(TAU * 5.5 * x + k)) / SR; if (ph >= 1) ph -= 1;
          const s = sx - syl, nz = rg() * 2 - 1, src = (ph * 2 - 1) * (1 - breathy) + nz * breathy;
          FR.run(nz); F1.run(src); F2.run(src); F3.run(src); LP.run(F1.bp + 0.7 * F2.bp + 0.25 * F3.bp + (fric && s < 0.18 ? 0.5 * FR.hp * (1 - s / 0.18) : 0));
          const env = Math.pow(Math.sin(Math.PI * s), 1.2) * (pause ? 0.12 : 1) * sm(x / 0.12) * sm((dur - x) / 0.2);
          put(s0 + i, LP.lp * env * ga, pan, send);
        }
        t += dur + lerp(gap[0], gap[1], rg());
      }
    }
  };
}
function stepSnd(t, g, pan, kind, send = 0.2, soft = 1) {         // un pas de chaussure à semelle dure, selon le sol : pavé, quai (dalle creuse, plus d'écho), bois (parquet), sable (crissement), tapis (feutré)
  const s = 0.85 + 0.3 * rnd();
  if (kind === 'bois') { nzb(t, 0.03, { f0: 700 * s, q: 1.5, gain: 0.12 * g, att: 0.001, rel: 0.015, dec: 0.01, pan, send }); tone(t, 0.1, { f0: 170 * s, f1: 110, gain: 0.14 * g, att: 0.001, rel: 0.02, dec: 0.03, pan, send }); tone(t, 0.15, { f0: 280 * s, gain: 0.04 * g, att: 0.002, rel: 0.03, dec: 0.05, pan, send: send * 1.5 }); }
  else if (kind === 'tapis') { nzb(t, 0.08, { type: 'lp', f0: 700 * s, f1: 250, gain: 0.12 * g, att: 0.004, rel: 0.05, dec: 0.03, pan, send }); tone(t, 0.08, { f0: 110 * s, f1: 75, gain: 0.08 * g, att: 0.003, rel: 0.02, dec: 0.03, pan, send }); }
  else if (kind === 'sable') { nzb(t, 0.13, { f0: 2400 * s, f1: 1500, q: 0.6, gain: 0.08 * g, att: 0.012, rel: 0.09, pan, send }); nzb(t + 0.02, 0.06, { type: 'hp', f0: 3800, gain: 0.03 * g, att: 0.006, rel: 0.04, am: 0.9, arate: 70, pan, send }); tone(t, 0.1, { f0: 120 * s, f1: 75, gain: 0.07 * g, att: 0.003, rel: 0.03, dec: 0.035, pan, send }); }
  else if (kind === 'quai') { nzb(t, 0.012, { type: 'hp', f0: 2200, gain: 0.1 * g * soft, att: 0.0003, rel: 0.007, pan, send: send * 1.6 }); nzb(t, 0.05, { f0: 1100 * s, q: 1.4, gain: 0.08 * g * (0.4 + 0.6 * soft), att: 0.0005, rel: 0.025, dec: 0.015, pan, send: send * 1.6 }); tone(t, 0.14, { f0: 190 * s, f1: 120, gain: 0.09 * g, att: 0.001, rel: 0.03, dec: 0.04, pan, send: send * 1.6 }); }
  else { nzb(t, 0.012, { type: 'hp', f0: 2500, gain: 0.1 * g * soft, att: 0.0003, rel: 0.007, pan, send }); nzb(t, 0.04, { f0: 1500 * s, q: 1.2, gain: 0.09 * g * (0.4 + 0.6 * soft), att: 0.0005, rel: 0.02, dec: 0.012, pan, send }); tone(t, 0.08, { f0: 140 * s, f1: 90, gain: 0.07 * g, att: 0.001, rel: 0.02, dec: 0.02, pan, send }); }
}
function genWalkers(o) {                                 // passants : arrivées au hasard (Poisson), 4 à 11 pas à la cadence d'un promeneur (0,5-0,62 s), qui traversent le champ stéréo et s'éloignent
  const { seed = 311, rate = 0.15, kind = 'pave', cad = [0.5, 0.62], steps = [4, 11], mulAmp = null, far = 0.5, send = 0.25, soft = 0.4 } = o;
  return b => {
    const rg = mkRnd(seed), t1 = (b.off + b.n) / SR, save = rnd; rnd = rg; let t = b.off / SR + rg() * 1.5;
    while (t < t1) {
      const n = Math.round(lerp(steps[0], steps[1], rg())), c = lerp(cad[0], cad[1], rg()), p0 = rg() * 1.8 - 0.9, p1 = rg() * 1.8 - 0.9, dist = lerp(far, 1, rg());
      for (let k = 0; k < n; k++) { const u = k / Math.max(1, n - 1), tt = t + k * c * (0.96 + 0.08 * rg()), env = Math.pow(Math.sin(Math.PI * (0.1 + 0.8 * u)), 1.2); stepSnd(tt, env * dist * (mulAmp ? mulAmp(tt) : 1), p0 + (p1 - p0) * u, kind, send, soft); }
      t += n * c + (-Math.log(1 - rg()) / rate);
    }
    rnd = save;
  };
}
function genCups(o) {                                    // vaisselle de café et d'hôtel : tasses sur soucoupes (partiels de porcelaine), cuillère qui tourne, couverts sur assiette, chaise qui racle
  const { seed = 321, rate = 0.8, mulAmp = null, chairs = 0.1, glass = 0.2 } = o;
  return b => {
    const rg = mkRnd(seed), t1 = (b.off + b.n) / SR, save = rnd; rnd = rg; let t = b.off / SR + rg();
    while (t < t1) {
      const ga = (0.4 + 0.6 * rg()) * (mulAmp ? mulAmp(t) : 1), pan = rg() * 1.8 - 0.9, kd = rg();
      if (kd < 0.4) { const f = 2300 + 1500 * rg(); tone(t, 0.3, { f0: f, f1: f * 0.997, gain: 0.5 * ga, att: 0.0005, rel: 0.02, dec: 0.07, pan, send: 0.45 }); tone(t + 0.003, 0.2, { f0: f * 1.62, gain: 0.25 * ga, att: 0.0005, rel: 0.01, dec: 0.04, pan, send: 0.4 }); tone(t, 0.12, { f0: f * 2.7, gain: 0.1 * ga, att: 0.0004, rel: 0.01, dec: 0.02, pan }); if (rg() < 0.5) tone(t + 0.08 + 0.1 * rg(), 0.18, { f0: f * 1.03, gain: 0.3 * ga, att: 0.0005, rel: 0.01, dec: 0.05, pan, send: 0.4 }); }
      else if (kd < 0.6) { const m = 4 + Math.floor(rg() * 5); for (let j = 0; j < m; j++) tone(t + j * 0.075 * (0.9 + 0.2 * rg()), 0.04, { f0: 3400 + 1200 * rg(), gain: 0.2 * ga * (1 - j / m * 0.5), att: 0.0004, rel: 0.008, dec: 0.008, pan, send: 0.3 }); }
      else if (kd < 0.6 + glass) { const f = 3200 + 3200 * rg(); tone(t, 0.5, { f0: f, gain: 0.3 * ga, att: 0.0005, rel: 0.02, dec: 0.16, harm: [1, 0.2], pan, send: 0.55 }); tone(t, 0.25, { f0: f * 2.32, gain: 0.1 * ga, att: 0.0005, rel: 0.02, dec: 0.07, pan, send: 0.5 }); }
      else if (kd < 0.6 + glass + chairs) { nzb(t, 0.22, { f0: 380, f1: 520, q: 2, gain: 0.25 * ga, att: 0.03, rel: 0.12, am: 0.6, arate: 17, pan, send: 0.25 }); tone(t + 0.22, 0.08, { f0: 130, f1: 90, gain: 0.2 * ga, att: 0.002, rel: 0.02, dec: 0.03, pan }); }
      else { nzb(t, 0.012, { type: 'hp', f0: 4000, gain: 0.2 * ga, att: 0.0003, rel: 0.007, pan, send: 0.3 }); tone(t, 0.1, { f0: 5200 + 1500 * rg(), gain: 0.15 * ga, att: 0.0004, rel: 0.01, dec: 0.025, pan, send: 0.4 }); }
      t += -Math.log(1 - rg()) / rate;
    }
    rnd = save;
  };
}
function genPendule(o) {                                 // tic-tac de pendule : « tic » sec et aigu, « tac » plus grave, la caisse de bois répond
  const { seed = 331, step = 0.5, f = 1, pan = 0.35 } = o;
  return b => { const rg = mkRnd(seed), t1 = (b.off + b.n) / SR; let t = b.off / SR + 0.1, k = 0;
    while (t < t1) { const hi = k % 2 === 0; tone(t, 0.04, { f0: (hi ? 2100 : 1550) * f, f1: (hi ? 1900 : 1400) * f, gain: hi ? 0.5 : 0.4, att: 0.0003, rel: 0.006, dec: 0.006, harm: [1, 0.4], pan, send: 0.25 }); tone(t, 0.12, { f0: (hi ? 640 : 520) * f, gain: 0.18, att: 0.0005, rel: 0.02, dec: 0.03, pan, send: 0.3 }); nzb(t, 0.004, { type: 'hp', f0: 4000, gain: 0.15, att: 0.0002, rel: 0.003, pan }); t += step * (1 + 0.004 * (rg() - 0.5)); k++; } };
}
function genHonks(o) {                                   // klaxon d'époque à poire, au loin (« pouët » nasal, deux tons), très rare ; jamais pendant un mot final
  const { seed = 341, rate = 0.07, f = 360, mulAmp = null } = o;
  return b => { const rg = mkRnd(seed), t1 = (b.off + b.n) / SR; let t = b.off / SR + 1 + rg() * (1 / rate);
    while (t < t1) { const pan = rg() * 1.4 - 0.7, g = (mulAmp ? mulAmp(t) : 1) * (0.7 + 0.3 * rg()), ff = f * (0.92 + 0.2 * rg()), d = 0.22 + 0.2 * rg(); if (!inZone(t)) { tone(t, d, { f0: ff * 0.95, f1: ff, curve: 0.2, gain: 0.4 * g, att: 0.012, rel: 0.05, harm: [1, 0.7, 0.5, 0.35, 0.25, 0.15, 0.1], pan, send: 0.7 }); tone(t, d, { f0: ff * 1.26 * 0.95, f1: ff * 1.26, curve: 0.2, gain: 0.25 * g, att: 0.012, rel: 0.05, harm: [1, 0.6, 0.4, 0.2], pan, send: 0.7 }); if (rg() < 0.4) { const t2 = t + d + 0.12; tone(t2, d, { f0: ff * 0.95, f1: ff, curve: 0.2, gain: 0.4 * g, att: 0.012, rel: 0.05, harm: [1, 0.7, 0.5, 0.35, 0.25, 0.15, 0.1], pan, send: 0.7 }); } }
      t += -Math.log(1 - rg()) / rate; } };
}
function genCreaks(o) {                                  // grincements de fer et de bois : une dent de scie grave qui glisse, passée dans deux résonances nasales (700-1 300 Hz), enveloppe irrégulière
  const { seed = 351, rate = 0.25, f = [90, 220], mulAmp = null, dur = [0.3, 1.1] } = o;
  return b => { const rg = mkRnd(seed), t1 = (b.off + b.n) / SR; let t = b.off / SR - 0.4 + rg() * 0.9;          // le premier grincement tombe dans les premières secondes du plan
    while (t < t1) { const d = lerp(dur[0], dur[1], rg()), L = Math.floor(d * SR), s0 = Math.floor(t * SR), fa = lerp(f[0], f[1], rg()), fb = fa * (0.7 + 0.6 * rg()), pan = rg() * 1.6 - 0.8, ga = (mulAmp ? mulAmp(t) : 1) * (0.5 + 0.5 * rg()), A = new Filt(), Bq = new Filt(), r1 = 700 + 600 * rg(), r2 = 1500 + 800 * rg(), w = wander(Math.floor(seed + t * 7), 14 + 10 * rg(), 1 / SR); let ph = 0;
      for (let i = 0; i < L; i++) { const x = i / SR, u = i / L, fq = (fa + (fb - fa) * u) * (1 + 0.05 * w()); ph += fq / SR; if (ph >= 1) ph -= 1; const s = ph * 2 - 1; if ((i & 15) === 0) { A.set(r1 * (1 + 0.15 * u), 9); Bq.set(r2, 8); } A.run(s); Bq.run(s);
        const e = Math.pow(Math.sin(Math.PI * u), 0.8) * (0.55 + 0.45 * Math.abs(w())); put(s0 + i, (A.bp + 0.5 * Bq.bp) * e * ga, pan, 0.35); }
      t += -Math.log(1 - rg()) / rate; } };
}
function genEngine(o) {                                  // moteur de voiture d'époque au ralenti : explosions irrégulières (≈ 23 Hz) qui font sonner deux résonances du bloc et un « putt » d'échappement
  const { seed = 361, hz_ = 23.5 } = o;
  return b => { for (let c = 0; c < 2; c++) { const rg = mkRnd(seed + c * 7), A = new Filt().set(110, 6), Bq = new Filt().set(260, 5), E = new Filt().set(520, 0.7), out = c ? b.R : b.L, w = wander(seed + c, 0.4, 1 / SR); let next = rg() / hz_, env = 0;
      for (let i = 0; i < b.n; i++) { const x = i / SR; let imp = 0; if (x >= next) { imp = (0.6 + 0.4 * rg()) * (rg() < 0.06 ? 0.2 : 1); next += (1 / (hz_ * (1 + 0.04 * w()))) * (0.92 + 0.16 * rg()); env = 1; }
        const nz = rg() * 2 - 1; A.run(imp); Bq.run(imp); E.run(nz * env); env *= 0.9985; out[i] += (A.bp * 1.2 + Bq.bp * 0.8) * 4 + E.lp * 0.25; } } };
}
function genFlags(o) {                                   // drapeaux qui claquent : bruit 500-1 600 Hz haché à 5-10 Hz au rythme des rafales + claquements secs
  const { seed = 371 } = o;
  return b => { for (let c = 0; c < 2; c++) { const rg = mkRnd(seed + c * 5), g = wander(seed + c, 0.3, 16 / SR), F = new Filt(), G = new Filt(), out = c ? b.R : b.L; let a = 0.3, ph = 0;
      for (let i = 0; i < b.n; i++) { if ((i & 15) === 0) { a = clamp(0.5 + 0.8 * g(), 0, 1); F.set(700 + 600 * a, 1); G.set(2400, 1.2); } ph += (4 + 6 * a) / SR; const n = rg() * 2 - 1; F.run(n); G.run(n); const fl = Math.pow(Math.abs(Math.sin(Math.PI * ph)), 3);
        out[i] += (F.bpn * 0.8 + G.bpn * 0.3) * fl * a * a; } } };
}
function genSteamHiss(o) {                               // vapeur qui s'échappe : bouffées de 0,8 à 2 s (bruit clair, filet sifflé), irrégulières
  const { seed = 381, rate = 0.25, mulAmp = null } = o;
  return b => { const rg = mkRnd(seed), t1 = (b.off + b.n) / SR; let t = b.off / SR + rg() * 2;
    while (t < t1) { const d = 0.8 + 1.2 * rg(), pan = rg() * 1.4 - 0.7, ga = (mulAmp ? mulAmp(t) : 1) * (0.6 + 0.4 * rg()); nzb(t, d, { type: 'hp', f0: 3200, f1: 4200, gain: 0.5 * ga, att: 0.06, rel: d * 0.6, dec: d * 0.5, pan, send: 0.4 }); nzb(t, d, { f0: 5000, f1: 4400, q: 12, gain: 0.25 * ga, att: 0.08, rel: d * 0.6, dec: d * 0.5, pan, send: 0.4 }); nzb(t, d, { f0: 1600, f1: 800, q: 0.7, gain: 0.2 * ga, att: 0.08, rel: d * 0.6, dec: d * 0.6, pan, send: 0.3 });
      t += d + -Math.log(1 - rg()) / rate; } };
}
function genWhistles(o) {                                // sifflet de locomotive au loin : deux tuyaux (≈ 620 et 780 Hz), souffle, vibrato, très réverbéré ; rare, jamais pendant un mot final
  const { seed = 391, rate = 0.06, mulAmp = null } = o;
  return b => { const rg = mkRnd(seed), t1 = (b.off + b.n) / SR; let t = b.off / SR + 2 + rg() * (1 / rate);
    while (t < t1) { const d = 0.6 + 0.8 * rg(), pan = rg() * 1.4 - 0.7, g = (mulAmp ? mulAmp(t) : 1) * (0.7 + 0.3 * rg()); if (!inZone(t) && !inZone(t + d)) { for (const [fr, lv] of [[620, 1], [780, 0.8]]) tone(t, d, { f0: fr * 0.99, f1: fr, curve: 0.2, gain: 0.3 * g * lv, att: 0.12, rel: d * 0.5, harm: [1, 0.5, 0.3, 0.15], vib: 0.01, vrate: 5.5, pan, send: 0.85 }); nzb(t, d, { f0: 3800, q: 2, gain: 0.05 * g, att: 0.1, rel: d * 0.5, pan, send: 0.8 }); }
      t += -Math.log(1 - rg()) / rate; } };
}
function genKeys(o) {                                    // machine à écrire dans la pièce voisine : rafales de 5 à 14 frappes assourdies, pauses de 2 à 6 s, clochette de fin de ligne parfois
  const { seed = 401, mulAmp = null, far = 1 } = o;
  return b => { const rg = mkRnd(seed), t1 = (b.off + b.n) / SR; let t = b.off / SR + 0.5 + rg() * 2;
    while (t < t1) { const m = 5 + Math.floor(rg() * 10), pan = rg() * 1.4 - 0.7, ga = (mulAmp ? mulAmp(t) : 1) * (0.6 + 0.4 * rg()); let x = t;
      for (let k = 0; k < m; k++) { nzb(x, 0.012, { f0: 1800 / far, q: 1, gain: 0.18 * ga, att: 0.0004, rel: 0.007, pan, send: 0.3 }); tone(x, 0.05, { f0: 160, f1: 110, gain: 0.12 * ga, att: 0.0008, rel: 0.012, dec: 0.012, pan, send: 0.3 }); x += (1 / 10) * (0.5 + 0.9 * rg()); }
      if (rg() < 0.35) tone(x + 0.03, 0.8, { f0: 2350, gain: 0.07 * ga, att: 0.0006, rel: 0.2, dec: 0.25, harm: [1, 0.2], pan, send: 0.5 });
      t = x + 2 + 4 * rg(); } };
}
function genDoors(o) {                                   // porte qui s'ouvre et se referme au loin : léger grincement, « toc » du battant, loquet
  const { seed = 411, rate = 0.1, mulAmp = null } = o;
  return b => { const rg = mkRnd(seed), t1 = (b.off + b.n) / SR; let t = b.off / SR + 1.5 + rg() * 3;
    while (t < t1) { const pan = rg() * 1.4 - 0.7, ga = (mulAmp ? mulAmp(t) : 1) * (0.6 + 0.4 * rg()); if (!inZone(t)) { nzb(t, 0.35, { f0: 600, f1: 1100, q: 6, gain: 0.12 * ga, att: 0.05, rel: 0.12, am: 0.6, arate: 21, pan, send: 0.35 }); const tc = t + 0.4 + 0.5 * rg(); tone(tc, 0.12, { f0: 120, f1: 80, gain: 0.3 * ga, att: 0.001, rel: 0.03, dec: 0.04, pan, send: 0.3 }); nzb(tc, 0.03, { f0: 500, q: 1.4, gain: 0.2 * ga, att: 0.0008, rel: 0.02, dec: 0.01, pan }); nzb(tc + 0.02, 0.01, { type: 'hp', f0: 3000, gain: 0.1 * ga, att: 0.0003, rel: 0.006, pan }); }
      t += -Math.log(1 - rg()) / rate; } };
}
function genRails(o) {                                   // roulement de roues sur les rails : « tac-tac » aux joints (cadence a(t) en coups par seconde), caisse de bois qui grince, vapeur qui souffle
  const { seed = 421, rateF = x => 3, mulAmp = null } = o;
  return b => { const rg = mkRnd(seed), t1 = (b.off + b.n) / SR, save = rnd; rnd = rg; let t = b.off / SR;
    while (t < t1) { const r = rateF(t), ga = (mulAmp ? mulAmp(t) : 1); const g = ga * (0.7 + 0.3 * rg()); nzb(t, 0.018, { f0: 1300, q: 1.5, gain: 0.3 * g, att: 0.0004, rel: 0.01, pan: -0.15, send: 0.2 }); tone(t, 0.07, { f0: 150, f1: 100, gain: 0.3 * g, att: 0.001, rel: 0.02, dec: 0.02, pan: -0.1, send: 0.15 }); nzb(t + 0.045 * (4 / Math.max(2, r)), 0.016, { f0: 1500, q: 1.5, gain: 0.22 * g, att: 0.0004, rel: 0.009, pan: 0.15, send: 0.2 }); t += 1 / (r * 1.0) * (0.97 + 0.06 * rg()); }
    rnd = save; };
}
function genRustle(o) {                                  // froissement de papier-monnaie : petites rafales de bruit 2,5-4,5 kHz de 20 à 60 ms, irrégulières
  const { seed = 431, rate = 14 } = o;
  return b => { const rg = mkRnd(seed), t1 = (b.off + b.n) / SR; let t = b.off / SR; while (t < t1) { const d = 0.02 + 0.04 * rg(); nzb(t, d, { f0: 2500 + 2000 * rg(), q: 0.9, gain: 0.3 * (0.3 + 0.7 * rg()), att: 0.004, rel: d * 0.5, pan: rg() * 1.2 - 0.6, send: 0.2 }); t += -Math.log(1 - rg()) / rate; } };
}
function genClangs(o) {                                  // chantier au loin : coups de marteau sur l'acier (partiels inharmoniques d'une poutre), irréguliers, très réverbérés
  const { seed = 441, rate = 0.5 } = o;
  return b => { const rg = mkRnd(seed), t1 = (b.off + b.n) / SR; let t = b.off / SR + rg() * 1.5; while (t < t1) { const f = 420 + 500 * rg(), g = 0.5 + 0.5 * rg(), pan = rg() * 1.6 - 0.8; for (const [r, a, d] of [[1, 1, 0.35], [2.76, 0.5, 0.2], [5.4, 0.25, 0.1], [8.9, 0.1, 0.05]]) tone(t, d * 4, { f0: f * r, gain: 0.3 * g * a, att: 0.0004, rel: 0.02, dec: d, pan, send: 0.7 }); nzb(t, 0.01, { type: 'hp', f0: 2500, gain: 0.2 * g, att: 0.0003, rel: 0.006, pan, send: 0.5 }); t += -Math.log(1 - rg()) / rate; } };
}

// ───────── lieux : une ambiance continue par lieu, coupée net au changement de lieu (plans de events.json, repli sur les segments) ─────────
const PLACE_RULES = [
  [/^i_(paris|tour)$/, 'rue'], [/^i_pas$/, 'tour_pied'], [/^i_dossier$/, 'dossier'],
  [/^a1_(journal|titre)$/, 'cafe'], [/^a1_tour$/, 'tour_haut'], [/^a2_/, 'chambre'],
  [/^b1_(machine|tampon)$/, 'bureau'], [/^b1_invitations$/, 'crepuscule'], [/^b1_hotel$/, 'hotel_rue'], [/^b2_demolition$/, 'demolition'], [/^b2_/, 'salon'],
  [/^c[12]_/, 'salon'], [/^c[34]_/, 'tour_pied'],
  [/^d[12]_/, 'commissariat'], [/^d3_(train|argent)$/, 'train'], [/^d3_/, 'gare'],
  [/^f_police$/, 'commissariat'], [/^f_fuite$/, 'rue'], [/^f_tour$/, 'crepuscule'],
];
const placeOfShot = id => { const r = PLACE_RULES.find(([re]) => re.test(id)); return r ? r[1] : null; };
const PLACE_SEG = { intro: 'rue', idee: 'cafe', faux: 'bureau', piege: 'salon', honte: 'commissariat', fin: 'crepuscule' };
const PLACES = (() => {                                  // [{p, a, b}] couvrant [0, fin de la carte finale] ; repli : un lieu par segment
  const out = [], endA = SEG.fin[1];
  const sh = SHOTS_EV.filter(s => placeOfShot(s.id));
  if (sh.length >= 8) { for (const s of sh) { const p = placeOfShot(s.id), a = Math.max(0, s.t0), b = Math.min(endA, s.t1); if (b <= a) continue; const l = out[out.length - 1]; if (l && l.p === p && Math.abs(l.b - a) < 0.05) l.b = b; else out.push({ p, a, b }); } if (out.length) out[0].a = 0; }
  if (!out.length) for (const sg of SEGN) out.push({ p: PLACE_SEG[sg], a: SEG[sg][0], b: SEG[sg][1] });
  return out;
})();
const placeAt = t => { const s = PLACES.find(s => t >= s.a - 0.001 && t < s.b); return s ? s.p : (PLACE_SEG[segAt(t)] || 'rue'); };
const SOIL = { rue: 'pave', cafe: 'pave', crepuscule: 'pave', commissariat: 'pave', tour_pied: 'sable', tour_haut: 'pave', gare: 'quai', train: 'bois', salon: 'tapis', chambre: 'tapis', bureau: 'bois', hotel_rue: 'pave', dossier: 'bois', demolition: 'tapis' };
const soilAt = t => SOIL[placeAt(t)] || 'pave';
function placeAmb(p, a, b, fi, fo, M) {                  // les couches d'un lieu ; M(x) = multiplicateur de niveau (gros plan, fondu…) facultatif
  const L = (nm, rms, gen, extra = {}) => layer(a, b, { name: nm, rms, fi, fo, send: 0.25, mul: M, ...extra }, gen);
  const HK = (nm, seed, f, gain, rate = 0.07) => L(nm, 0, genHonks({ seed, rate, f }), { fixed: gain, send: 0.5 });
  switch (p) {
    case 'rue':
      L('wind_rue', -38, genWind({ f0: 520, q: 1.2, whistle: 0.05, rumble: 0.3, seed: 501, depth: 0.6, hiss: 0.15, wf: 1700, rate: 0.7 }));
      L('walk_rue', -50, genWalkers({ seed: 502, rate: 0.35, kind: 'pave', far: 0.45 }), { ref: true });
      L('murmur_rue', -43, genMurmur({ n: 4, seed: 503, lp: 2000, pitch: [90, 200] }), { ref: true });
      L('birds_rue', -49, genBirds({ seed: 504, rate: () => 0.25, species: [['coo', 1], ['flap', 0.35], ['sparrow', 1], ['tsit', 0.4]], gain: 0.06, far: 0.5 }), { send: 0, ref: true });
      L('city_rue', -47, genHush({ seed: 505, f: 700 })); HK('honk_rue', 506, 360, 0.02); break;
    case 'cafe':
      L('murmur_cafe', -39, genMurmur({ n: 6, seed: 511, lp: 2600, pitch: [90, 230], rate: [2.2, 4.2] }), { ref: true });
      L('cups_cafe', -46, genCups({ seed: 512, rate: 0.9, chairs: 0.12, glass: 0.1 }), { ref: true });
      L('walk_cafe', -51, genWalkers({ seed: 513, rate: 0.3, kind: 'pave', far: 0.35 }), { ref: true });
      L('wind_cafe', -44, genWind({ f0: 480, q: 1.1, whistle: 0.03, rumble: 0.3, seed: 514, depth: 0.5, hiss: 0.12, wf: 1600, rate: 0.7 }));
      L('birds_cafe', -50, genBirds({ seed: 515, rate: () => 0.25, species: [['coo', 1], ['flap', 0.3], ['sparrow', 1]], gain: 0.06, far: 0.5 }), { send: 0, ref: true }); HK('honk_cafe', 516, 380, 0.015); break;
    case 'tour_pied':
      L('wind_iron', -36, genWind({ f0: 600, q: 1.5, whistle: 0.55, rumble: 0.2, seed: 521, depth: 1, hiss: 0.1, wf: 950, rate: 0.6 }));
      L('crowd_far', -42, genMurmur({ n: 9, seed: 522, lp: 1500, pitch: [90, 230], rate: [2.2, 4], spread: 1 }), { ref: true });
      L('birds_tour', -45, genBirds({ seed: 523, rate: () => 0.35, species: [['swift', 1], ['sparrow', 0.8], ['tsit', 0.5], ['flap', 0.25], ['coo', 0.5]], gain: 0.06, far: 0.6 }), { send: 0, ref: true });
      L('creaks_tour', -48, genCreaks({ seed: 524, rate: 0.12, f: [80, 160] }), { ref: true });
      L('walk_sable', -52, genWalkers({ seed: 525, rate: 0.12, kind: 'sable', far: 0.4 }), { ref: true }); break;
    case 'tour_haut':
      L('wind_haut', -37, genWind({ f0: 450, q: 1.4, whistle: 0.5, rumble: 0.35, seed: 531, depth: 1.2, hiss: 0.15, wf: 800, rate: 0.9 }));
      L('creaks_haut', -45, genCreaks({ seed: 532, rate: 0.5, f: [90, 260] }), { ref: true });
      L('strokes_haut', -48, genRustle({ seed: 533, rate: 5 }));
      L('city_haut', -47, genHush({ seed: 534, f: 600 })); break;
    case 'chambre':
      L('pendule_ch', -48, genPendule({ seed: 541, step: 0.5, f: 0.9 }));
      L('hush_ch', -47, genHush({ seed: 542, f: 650 }));
      L('street_ch', -48, genMurmur({ n: 3, seed: 543, lp: 900, pitch: [90, 180] }), { ref: true }); HK('honk_ch', 544, 340, 0.012, 0.05); break;
    case 'bureau':
      L('pendule_bu', -47, genPendule({ seed: 551, step: 0.5, f: 1 }));
      L('lamp_bu', -49, b => hum(b.off / SR, b.n / SR - 0.16, 'G2', { gain: 0.05, att: 0.1, rel: 0.1, h: [0.5, 1, 0.6, 0.3], send: 0.2 }));
      L('keys_bu', -51, genKeys({ seed: 552, far: 1 }), { ref: true });
      L('city_bu', -49, genMurmur({ n: 2, seed: 553, lp: 800, pitch: [90, 170] }), { ref: true }); break;
    case 'dossier':
      L('pendule_do', -49, genPendule({ seed: 561, step: 0.5, f: 1.1 }));
      L('hush_do', -47, genHush({ seed: 562, f: 900 })); break;
    case 'crepuscule':
      L('wind_cr', -40, genWind({ f0: 480, q: 1.1, whistle: 0.03, rumble: 0.25, seed: 571, depth: 0.6, hiss: 0.15, wf: 1700, rate: 0.7 }));
      L('crickets_cr', -47, genCrickets({ n: 2, seed: 572, fc: [3300, 4000], rate: [0.5, 1.1], pulses: [3, 5], pr: [34, 46] }));
      L('swifts_cr', -46, genBirds({ seed: 573, rate: () => 0.35, species: [['swift', 1], ['sparrow', 0.4], ['coo', 0.4], ['flap', 0.2]], gain: 0.06, far: 0.6 }), { send: 0, ref: true });
      L('city_cr', -46, genMurmur({ n: 4, seed: 574, lp: 1200, pitch: [90, 200] }), { ref: true }); HK('honk_cr', 575, 350, 0.015); break;
    case 'hotel_rue':
      L('engine_ho', -41, genEngine({ seed: 581 }));
      L('flags_ho', -44, genFlags({ seed: 582 }));
      L('wind_ho', -43, genWind({ f0: 480, q: 1.1, whistle: 0.03, rumble: 0.25, seed: 583, depth: 0.6, hiss: 0.15, wf: 1700, rate: 0.7 }));
      L('city_ho', -46, genMurmur({ n: 4, seed: 584, lp: 1200, pitch: [90, 200] }), { ref: true }); HK('honk_ho', 585, 360, 0.018, 0.09); break;
    case 'salon':
      L('murmur_sa', -39, genMurmur({ n: 7, seed: 591, lp: 1700, pitch: [90, 220], rate: [2, 3.8], spread: 0.8 }), { ref: true });
      L('cups_sa', -49, genCups({ seed: 592, rate: 0.55, chairs: 0.03, glass: 0.4 }), { ref: true });
      L('pendule_sa', -51, genPendule({ seed: 593, step: 0.5, f: 0.85 }));
      L('hush_sa', -50, genHush({ seed: 594, f: 1200 })); break;
    case 'demolition': {                                 // le murmure du salon retombe, remplacé par le chantier lointain (acier qui grince, coups sur la poutre) pendant la chute de la tour ; le tout s'éteint avant la pluie de pièces
      const tc = evT('coins', a, b, a + 1.2) - 0.3, ch = x => sm((x - a + 0.05) / 0.35) * (1 - sm((x - tc) / 0.4));
      L('murmur_de', -39, genMurmur({ n: 7, seed: 595, lp: 1700, pitch: [90, 220], rate: [2, 3.8], spread: 0.8 }), { ref: true, mul: x => 1 - sm((x - a - 0.1) / 0.8) });
      L('creaks_de', -42, genCreaks({ seed: 596, rate: 1.1, f: [70, 150], dur: [0.4, 1.4] }), { ref: true, mul: ch });
      L('clangs_de', -44, genClangs({ seed: 597, rate: 0.8 }), { ref: true, mul: ch });
      L('wind_de', -45, genWind({ f0: 400, q: 1.3, whistle: 0.4, rumble: 0.4, seed: 598, depth: 0.8, hiss: 0.1, wf: 800, rate: 0.7 }), { mul: ch });
      L('hush_de', -52, genHush({ seed: 599, f: 800 })); break; }
    case 'commissariat':
      L('lamp_co', -50, b => hum(b.off / SR, b.n / SR - 0.16, 'G2', { gain: 0.05, att: 0.1, rel: 0.1, h: [0.5, 1, 0.5, 0.25], send: 0.2 }));
      L('cars_co', -45, genHush({ seed: 601, f: 450 }));
      L('walk_co', -51, genWalkers({ seed: 602, rate: 0.1, kind: 'pave', far: 0.4 }), { ref: true });
      L('keys_co', -51, genKeys({ seed: 603, far: 2.2 }), { ref: true });
      L('murmur_co', -45, genMurmur({ n: 3, seed: 604, lp: 800, pitch: [90, 200] }), { ref: true });
      L('doors_co', 0, genDoors({ seed: 605, rate: 0.12 }), { fixed: 0.05 });
      L('wind_co', -46, genWind({ f0: 450, q: 1.2, whistle: 0.02, rumble: 0.25, seed: 606, depth: 0.5, hiss: 0.1, wf: 1600, rate: 0.6 })); HK('honk_co', 607, 350, 0.012, 0.06); break;
    case 'train':
      L('rails_tr', -43, genRails({ seed: 611, rateF: x => TRAIN_RATE(x) }), { ref: true });
      L('creaks_tr', -46, genCreaks({ seed: 612, rate: 0.6, f: [120, 260] }), { ref: true });
      L('steam_tr', -48, genSteamHiss({ seed: 613, rate: 0.5 }), { ref: true });
      L('quai_tr', -47, genMurmur({ n: 4, seed: 614, lp: 1500, pitch: [90, 220] }), { ref: true, mul: x => (M ? M(x) : 1) * (1 - 0.9 * sm((x - a) / 2.0)) });
      break;
    case 'gare':
      L('murmur_ga', -39, genMurmur({ n: 8, seed: 621, lp: 2200, pitch: [90, 230], rate: [2.2, 4], spread: 1 }), { ref: true });
      L('steam_ga', -48, genSteamHiss({ seed: 622, rate: 0.3 }), { ref: true });
      L('walk_ga', -48, genWalkers({ seed: 623, rate: 0.35, kind: 'quai', far: 0.45, send: 0.4 }), { ref: true });
      L('annonce_ga', -48, genMurmur({ n: 1, seed: 624, lp: 1800, pitch: [120, 135], rate: [3, 3.8], gap: [6, 12], spread: 0, send: 0.9 }), { ref: true });
      L('whistles_ga', 0, genWhistles({ seed: 625, rate: 0.12 }), { fixed: 0.035 });
      L('hall_ga', -49, genHush({ seed: 626, f: 500 })); break;
  }
}
let TRAIN_RATE = x => 3;
function ambiances() {
  B = BUS.amb; if (OPT.check) console.log('lieux : ' + PLACES.map(s => `${s.p} ${s.a.toFixed(2)}-${s.b.toFixed(2)}`).join(' | '));
  const sh = (re) => SHOTS_EV.find(s => re.test(s.id)) || null;
  // trains : cadence des joints (coups par seconde) qui s'accélère avec la locomotive (événement `train` du plan d3_train), retombe à l'arrivée
  { const tr = evs('train'), t0 = tr[0] ? tr[0].t : wt('d3', 'Victor') - 0.1, dd = tr[0] ? durOf(tr[0].v, 2.6) : 2.6, t1 = tr[1] ? tr[1].t : t0 + dd;
    TRAIN_RATE = x => x < t0 ? 2 : x < t0 + dd ? lerp(2.2, 5.5, sm((x - t0) / dd)) : lerp(5.5, 3, sm((x - t0 - dd) / 0.8)); }
  const closeUp = sh(/^c1_marchand$/) && sh(/^c2_affaire$/) ? x => { const a = sh(/^c1_marchand$/), b = sh(/^c2_affaire$/); return sm((x - a.t0 + 0.05) / 0.2) * (1 - sm((x - b.t1 + 0.05) / 0.25)); } : x => 0;
  const cutC4 = (() => { const c4 = sh(/^c4_/), t = evT('stamp', c4 ? c4.t0 : wt('c4', 'Il') - 0.1, ph('c4').t1, wt('c4', 'arnaquer')); return t - 0.012; })();
  if (cutC4 > SEG.piege[0] && cutC4 < SEG.piege[1]) CUTS.amb.push([cutC4, SEG.piege[1], 0.03]);                       // le monde se coupe net à `arnaquer`, silence jusqu'à `honte`
  for (const s of PLACES) {
    let a = s.a, b = s.b, fi = 0.12, fo = 0.12, M = null;
    if (s.p === 'salon') { M = x => 1 - 0.45 * closeUp(x); }
    if (s.p === 'demolition') fo = 0.3;
    if (s.p === 'tour_pied' && cutC4 > a && cutC4 < b + 0.3) { b = cutC4; fo = 0.03; const c4 = sh(/^c4_/), t4 = c4 ? c4.t0 : cutC4 - 1.5, tD = Math.min(t4 - 0.3, wt('c3', 'découvre') - 0.1); M = x => x < tD ? 1 : x < t4 ? lerp(1, 0.55, sm((x - tD) / (t4 - tD))) : lerp(0.55, 0.12, sm((x - t4) / Math.max(0.5, cutC4 - t4))); }      // la nappe se resserre dans c4 puis se coupe net à `arnaquer`
    if (s.p === 'commissariat' && s.a >= SEG.honte[0] - 0.05 && s.a < SEG.honte[0] + 0.3) { fi = 0.7; }           // après le silence du tampon, la rue revient doucement
    if (s.p === 'crepuscule' && s.b > VOICE_END) { fo = 1.3; const e = VOICE_END; M = x => x < e ? 1 : lerp(1, 0, sm((x - e) / 1.1)); }                 // éteinte avant le plan de sortie
    if (s.p === 'train') { const arg = sh(/^d3_argent$/); if (arg) M = x => 1 - 0.55 * sm((x - arg.t0 + 0.05) / 0.2); }
    placeAmb(s.p, a, b, fi, fo, M);
    if (s.p === 'train') { const arg = sh(/^d3_argent$/); if (arg) layer(arg.t0 - 0.1, arg.t1 + 0.1, { name: 'rustle_tr', rms: -46, fi: 0.15, fo: 0.2, send: 0.2 }, genRustle({ seed: 615, rate: 16 })); }
  }
}

// ───────── musique ─────────
const grid = (a, b, nominal) => { const n = Math.max(1, Math.round((b - a) / nominal)), d = (b - a) / n; return { n, d, t: k => a + k * d }; };      // pas élastiques : un nombre entier de temps entre deux repères de la voix
const T_LOGO = at('logo');                               // seul événement obligatoire : le son de marque


// ───────── musique : harmonie, groove « pompe » à la manouche, lignes mélodiques ─────────
const PCN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const CHF = { '': [0, 4, 7], m: [0, 3, 7], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], '7b9': [0, 4, 7, 10, 13], sus7: [0, 5, 7, 10], maj7: [0, 4, 7, 11], '69': [0, 4, 7, 9, 14], m9: [0, 3, 7, 10, 14] };
function parseChord(sym) { const m = /^([A-G])(#|b)?(.*)$/.exec(sym); if (!m) throw new Error('accord inconnu : ' + sym); return { root: (PCN[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12, tones: CHF[m[3]] || CHF['']}; }
function voice(sym, lo, n = 4) {                         // accord en position rapprochée dans l'octave [lo, lo+11] : la tierce et la sixte / septième d'abord, puis la fondamentale et la quinte
  const { root, tones } = parseChord(sym), pri = [1, 3, 0, 2, 4].filter(i => i < tones.length);
  return pri.slice(0, Math.min(n, pri.length)).map(i => (root + tones[i]) % 12).map(pc => lo + (((pc - lo) % 12) + 12) % 12).sort((a, b) => a - b);
}
const bassRoot = sym => 33 + ((parseChord(sym).root - 33) % 12 + 12) % 12;      // fondamentale dans la tessiture de la contrebasse (A1 à G#2)
function mkSegs(n, loop, tail = []) {                    // suite d'accords {k0, len, sym} sur n temps : `loop` répétée, puis `tail` aux derniers temps
  const tl = tail.reduce((s, x) => s + x[1], 0), body = Math.max(0, n - tl), out = []; let k = 0;
  while (k < body) for (const [sym, len] of loop) { if (k >= body) break; const l = Math.min(len, body - k); out.push({ k0: k, len: l, sym }); k += l; }
  for (const [sym, len] of tail) { out.push({ k0: k, len, sym }); k += len; }
  return out;
}
function bassFor(segs, nextSym = null, mode = 'walk') {  // ligne de contrebasse : marche (fondamentale, tierce / quinte, approche chromatique de la fondamentale suivante) ou pédale (fondamentale, quinte)
  const out = []; let prev = 38;
  const near = (pc, p) => { let best = null; for (let m = 31; m <= 50; m++) if (m % 12 === pc && (best === null || Math.abs(m - p) < Math.abs(best - p))) best = m; return best; };
  segs.forEach((s, i) => {
    const { root, tones } = parseChord(s.sym), nx = segs[i + 1] ? parseChord(segs[i + 1].sym).root : (nextSym ? parseChord(nextSym).root : null);
    const pcs = [root, (root + tones[1]) % 12, (root + tones[2]) % 12], shape = i % 2 ? [0, 2, 1] : [0, 1, 2];
    for (let b = 0; b < s.len; b++) {
      let m;
      if (b === 0) m = near(root, prev);
      else if (mode === 'pedal') m = near(b % 2 ? pcs[2] : root, prev);
      else if (b === s.len - 1 && nx !== null) { const tgt = near(nx, prev); m = tgt + (prev > tgt ? 1 : -1); }
      else m = near(pcs[shape[Math.min(b, 2)]], prev);
      out.push({ k: s.k0 + b, midi: m }); prev = m;
    }
  });
  return out;
}
const lvl = pts => t => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (t - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0] || 1)); return pts[pts.length - 1][1]; };
const lv_ = (x, t) => typeof x === 'function' ? x(t) : (x ?? 0);
// groove : de a à b, sur un nombre entier de temps (tempo ≈ nom s par temps, ajusté pour tomber sur les repères de la voix) ; chaque instrument a un niveau (nombre ou fonction du temps) ; aucune attaque dans une zone de dernier mot ni dans `gaps`
function groove(a, b, o = {}) {
  const { nom = 0.4, loop = [['Am6', 4]], tail = [], next = null, gaps = [], sw = 0.63, bassMode = 'walk', pan = 0, tapOff = 0.25 } = o;
  const g = grid(a, b, nom), n = g.n, d = g.d, T = g.t, segs = mkSegs(n, loop, tail); if (OPT.check) GLOG.push(`groove ${a.toFixed(2)}-${b.toFixed(2)} : ${n} temps de ${d.toFixed(3)} s (${(60 / d).toFixed(0)} par minute)`);
  const chAt = k => { for (const s of segs) if (k >= s.k0 && k < s.k0 + s.len) return s.sym; return segs[segs.length - 1].sym; };
  const bmap = {}; if (o.bass) bassFor(segs, next, bassMode).forEach(x => bmap[x.k] = x.midi);
  const ok = t => !inZone(t) && !gaps.some(([x, y]) => t > x && t < y);
  for (let k = 0; k < n; k++) {
    const t = k === 0 ? T(0) : T(k) + (rnd() - 0.5) * 0.012, sym = chAt(k), tOff = t + sw * d, gG = lv_(o.gtr, t), gB = lv_(o.bass, t), gR = lv_(o.brush, t), gJ = lv_(o.bj, t), gP = lv_(o.pno, t), gA = lv_(o.accp, t);
    if (gG > 0) { const fv = voice(sym, 52, 4).map(mtof), ac = k % 2 ? 1 : 0.72;
      if (ok(t)) gtrStrum(t, fv, { gain: 0.034 * gG * ac, pan: -0.25 + pan, t60: 0.3 });
      if (k % 2 && ok(tOff)) gtrStrum(tOff, fv.slice(1), { dir: -1, gain: 0.034 * gG * 0.38, pan: -0.25 + pan, t60: 0.2, st: 0.004, chuck: 0.3 }); }
    if (gB > 0 && bmap[k] !== undefined && ok(t)) dbass(t, mtof(bmap[k]), { gain: 0.05 * gB * (k % 2 ? 0.85 : 1) });
    if (gR > 0) { if (ok(t)) brushSwish(t, d * 0.92, { gain: 0.016 * gR, pan: 0.15 + pan * 0.5 }); if (k % 2 && ok(t)) brushTap(t, 0.8 * gR); else if (tapOff > 0 && ok(tOff)) brushTap(tOff, tapOff * gR); }
    if (gJ > 0) { const bv = voice(sym, 62, 3).map(mtof); if (k % 4 === 0 && ok(t)) banjoStrum(t, bv, { gain: 0.032 * gJ, t60: 0.2 }); if (k % 4 === 1 && ok(tOff)) banjoStrum(tOff, bv, { gain: 0.026 * gJ, t60: 0.18 }); }
    if (gP > 0) { if (k % 2 === 0 && ok(t)) piano(t, mtof(bassRoot(sym) + 12), { gain: 0.04 * gP, dm: 0.7 }); if (k % 2 === 1 && ok(t)) pianoChord(t, voice(sym, 58, 3).map(mtof), { gain: 0.035 * gP, dm: 0.5 }); }
    if (gA > 0 && k % 2 === 1 && ok(tOff)) acc(tOff, d * 0.3, voice(sym, 57, 3).map(mtof), { gain: 0.022 * gA, att: 0.01, rel: 0.05, air: 0.3, pan: 0.15 });        // anches musette en contretemps
  }
  return { n, d, T, segs, chAt };
}
// valse musette : mesures à trois temps (basse sur 1, deux accords sur 2 et 3), de a à b sur un nombre entier de mesures
function waltz(a, b, o = {}) {
  const { nom = 0.43, loop = [['Am', 3]], tail = [], gaps = [], pan = 0 } = o, g = grid(a, b, nom * 3), bars = g.n, d = g.d / 3, T = k => a + k * d, n = bars * 3, segs = mkSegs(n, loop, tail);
  const chAt = k => { for (const s of segs) if (k >= s.k0 && k < s.k0 + s.len) return s.sym; return segs[segs.length - 1].sym; };
  const ok = t => !inZone(t) && !gaps.some(([x, y]) => t > x && t < y);
  for (let k = 0; k < n; k++) {
    const t = T(k), sym = chAt(k), pos = k % 3, gG = lv_(o.gtr, t), gB = lv_(o.bass, t), gJ = lv_(o.bj, t), gA = lv_(o.accp, t), gR = lv_(o.brush, t);
    if (!ok(t)) continue;
    if (pos === 0 && gB > 0) dbass(t, mtof(bassRoot(sym)), { gain: 0.05 * gB });
    if (pos === 0 && gG > 0) gtrStrum(t, [mtof(bassRoot(sym) + 12)], { gain: 0.03 * gG, t60: 0.5, chuck: 0.2, pan: -0.2 + pan });
    if (pos > 0 && gG > 0) gtrStrum(t, voice(sym, 55, 4).map(mtof), { gain: 0.03 * gG, t60: 0.26, pan: -0.25 + pan });
    if (pos > 0 && gJ > 0) banjoStrum(t, voice(sym, 64, 3).map(mtof), { gain: 0.024 * gJ, t60: 0.18 });
    if (pos > 0 && gA > 0) acc(t, d * 0.5, voice(sym, 57, 3).map(mtof), { gain: 0.02 * gA, att: 0.012, rel: 0.06, air: 0.3, pan: 0.15 });
    if (gR > 0) { if (pos === 0) brushSwish(t, d * 2.9, { gain: 0.015 * gR }); else brushTap(t, 0.5 * gR); }
  }
  return { n, bars, d, T, segs, chAt };
}
// lignes mélodiques : "A4:1 r:1 C5:2 …" (durées en croches ; r = silence ; les croches de rang impair sont retardées par le swing) ; fn(t, durée, Hz, position, longueur)
function playLine(t0, d, s, fn, o = {}) {
  const sw = o.swing ?? 0.62, pos2t = p => t0 + (Math.floor(p / 2) + (p % 2 ? sw : 0)) * d; let pos = 0;
  for (const tok of s.replace(/\|/g, ' ').trim().split(/\s+/)) { const [n, l] = tok.split(':'), len = +l || 1; if (n !== 'r') { const tt = pos2t(pos), te = pos2t(pos + len); if (o.gate === false || !inZone(tt)) fn(tt, te - tt, NOTE(n), pos, len); } pos += len; }
  return pos;
}
function hit(t, sym, g = 1, o = {}) {                    // coup d'orchestre : piano bastringue (accord plein + basse), accordéon, guitare, contrebasse, grosse caisse feutrée (+ caisse claire) ; reporté juste après un mot final
  t = o.keep ? t : clearT(t);
  const u = { until: o.until };
  pianoChord(t, voice(sym, 55, 4).map(mtof), { gain: 0.05 * g, dm: o.dm ?? 0.9, ...u }); piano(t, mtof(bassRoot(sym) + 12), { gain: 0.05 * g, ...u });
  acc(t, o.hold ?? 0.3, voice(sym, 57, 4).map(mtof), { gain: 0.03 * g, att: 0.008, rel: o.rel ?? 0.2, pan: 0.1 });
  gtrStrum(t, voice(sym, 52, 4).map(mtof), { gain: 0.04 * g, t60: 0.6, ...u }); dbass(t, mtof(bassRoot(sym)), { gain: 0.06 * g, ...u }); kickS(t, 0.7 * g); if (o.rim) rimS(t, 0.8 * g);
}


// ───────── les sections ─────────
const TH_A = 'E5:1 A4:1 C5:2 E5:1 D5:1 C5:1 B4:1 | G#4:2 B4:1 D5:1 E5:4 | F5:1 E5:1 D5:1 C5:1 B4:2 A4:2 | G#4:1 A4:1 B4:1 C5:1 A4:4';       // le thème de Lustig (la mineur harmonique), 4 mesures
const CUTS = { music: [], amb: [] };                     // silences francs (fermés après la réverbération) : [a, b, rampe]

function musIntro() {                                    // INTRO : Années folles, légère et complice (la mineur) ; le coup de tampon sur « Eiffel » arrête l'orchestre (stop-time)
  rnd = mkRnd(101); B = BUS.music; const [s0, s1] = SEG.intro, F1 = lastW('i1'), tAlors = wt('i1', 'alors'), tSt = evT('stamp', 2, 5, wt('i1', 'Eiffel'));
  // 1) deux mesures (Am6 | E7) qui montent vers « Eiffel » : balais en crescendo, la guitare se tait juste avant le coup
  groove(s0, tSt, { nom: 0.42, loop: [['Am6', 4], ['E7', 4]], next: 'Am6', gtr: lvl([[s0, 0.7], [tSt, 1]]), bass: 0.9, brush: lvl([[s0, 0.45], [tSt - 0.3, 1.1]]), bj: 0.7, gaps: [[tSt - 0.17, tSt]] });
  // 2) le « chok » du tampon est seul, la réponse de l'orchestre (piano bastringue, accordéon, guitare, grosse caisse) tombe une fraction de seconde après
  hit(tSt + 0.05, 'Am6', 1.05, { keep: true, hold: 0.5, rel: 0.5 });
  // 3) « alors qu'elle ne lui appartenait même pas » : groove léger ; l'accord de fin reste suspendu (Esus7)
  const g2 = groove(tAlors - 0.02, s1, { nom: 0.4, loop: [['Am6', 4], ['E7', 2], ['Dm6', 2], ['Esus7', 2]], next: 'Am6', gtr: lvl([[tAlors, 0.55], [s1 - 1.5, 0.45]]), bass: 0.8, brush: 0.5, tapOff: 0 });
  // 4) après « pas ! » : une petite chute de clarinette (arpège de mi7 qui descend), puis l'accordéon gonfle l'accord suspendu sous « Et voici comment il a fait »
  playLine(F1.t1 + 0.07, 0.16, 'E5:1 D5:1 B4:1 G#4:1 E4:4', (t, du, f, pos) => clar(t, Math.max(0.1, du * 0.9), f, { gain: 0.03, scoop: pos === 0 ? 1.5 : 0 }), { swing: 0.5, gate: false });
  acc(ph('i2').t0 + 0.03, s1 - ph('i2').t0 + 0.1, voice('Esus7', 52, 4).map(mtof), { gain: 0.026, att: 0.9, rel: 0.4, swell: 0.3, trem: 0.15, trate: 6 });
}

function musIdee() {                                     // IDÉE : le matin à Paris, jazz-manouche léger et complice qui s'installe ; clarinette curieuse (titre), accordéon inquiet (la tour), pizzicati malicieux (miroir), accord complice tenu qui retombe sur la coche
  rnd = mkRnd(202); B = BUS.music; const [s0, s1] = SEG.idee;
  const tTitre = shotT(/^a1_titre$/, s0, s1) ?? wt('a1', 'que') - 0.1, tTour = shotT(/^a1_tour$/, s0, s1) ?? wt('a1', 'coûte') - 0.1, tMir = shotT(/^a2_miroir$/, s0, s1) ?? wt('a2', 'Il') - 0.1, tSou = shotT(/^a2_sourire$/, s0, s1) ?? wt('a2', 'haut') - 0.1;
  const tD = evT('ding', tSou, s1, ph('a2').t1 - 0.25);
  const g = groove(s0, tD, { nom: 0.4, loop: [['Am6', 4], ['Dm6', 4], ['E7', 4], ['Am6', 4], ['Dm6', 2], ['E7', 2], ['Am6', 2]], next: 'Am6',
    gtr: lvl([[s0, 0.55], [tTitre, 0.8], [tMir, 0.9], [tSou, 0.5], [tD - 0.3, 0.15]]), bass: lvl([[s0, 0.7], [tMir, 0.95], [tSou, 0.7], [tD - 0.3, 0.2]]), brush: lvl([[s0, 0.5], [tSou, 0.6], [tD - 0.3, 0.15]]), bj: lvl([[tMir - 0.01, 0], [tMir, 0.6], [tSou, 0]]) });
  playLine(g.T(4), g.d, 'F4:1 A4:1 D5:3', (t, du, f) => clar(t, du * 0.95, f, { gain: 0.022 }));                                                // a1_titre : petit motif curieux
  acc(g.T(8) + 0.02, g.T(12) - g.T(8) - 0.1, voice('E7', 59, 4).map(mtof), { gain: 0.024, att: 0.35, rel: 0.5, swell: 0.35, trem: 0.28, trate: 6.5 });         // a1_tour : l'accordéon tient, la tension monte
  playLine(g.T(12), g.d, 'A4:1 r:1 C5:1 r:1 E5:1 r:1 F#5:1 E5:1 | D5:1 r:1 B4:1 A4:1 | G#4:1 r:1 B4:1 D5:1', (t, du, f) => gtr(t, f, { gain: 0.03, t60: 0.35, pan: -0.1, bright: 1.1 }));   // a2_miroir : pizzicati malicieux
  acc(tSou + 0.1, tD - tSou + 0.2, voice('Am6', 57, 4).map(mtof), { gain: 0.026, att: 0.45, rel: 0.7, swell: 0.2 });                                           // a2_sourire : l'accord complice tenu
  { const t = lastW('a2').t1 + 0.07; pianoChord(t, voice('Am6', 64, 4).map(mtof), { gain: 0.035, dm: 0.6 }); gtr(t + 0.02, mtof(57), { gain: 0.022, t60: 0.5 }); }          // un dernier « plink » après « français »
}

function musFaux() {                                     // FAUX PAPIERS : bureau du faussaire (contrebasse qui marche, stop-time sur le tampon), enveloppes (banjo, accordéon, clarinette), hôtel noble, SECRET (silence), chute de la tour, VENDUE
  rnd = mkRnd(303); B = BUS.music; const [s0, s1] = SEG.faux, Fb = lastW('b2');
  const tSt1 = evT('stamp', s0, s0 + 2.5, wt('b1', 'officiels')), tHot = evT('reveal', tSt1, tSt1 + 4, wt('b1', 'hôtel')), tB2 = ph('b2').t0 - 0.1, tSec = wt('b2', 'secrète');
  const tSusp = evT('suspense', tHot, tHot + 4, wt('b2', 'totalement') - 0.05), tSt2 = evT('stamp', tSec, tSec + 2.5, wt('b2', 'tour')), tCrack = evT('crack', tSt2, tSt2 + 2.5, wt('b2', 'détruite'));
  const tVend = evT('stamp', tCrack - 0.2, tCrack + 1.2, wt('b2', 'vendue')), tDing = evT('ding', tVend, s1, s1 - 0.5), tStop = tSec - 0.12;
  // a) bureau : trois temps de contrebasse qui marche, guitare qui plaque ; elle se tait juste avant le tampon, un accord de piano bastringue répond
  groove(s0, tSt1, { nom: 0.42, loop: [['Am6', 2], ['E7', 1]], next: 'Am6', gtr: 0.55, bass: 0.85, brush: 0.4, gaps: [[tSt1 - 0.2, tSt1]] });
  pianoChord(tSt1 + 0.045, voice('Am6', 55, 4).map(mtof), { gain: 0.06, dm: 0.9 }); piano(tSt1 + 0.045, mtof(45), { gain: 0.05 }); dbass(tSt1 + 0.045, mtof(33), { gain: 0.05 });
  // b) enveloppes : le banjo pique une note à chaque passage, la mélodie légère de l'accordéon et de la clarinette démarre et débouche sur l'hôtel
  const gB = groove(tSt1 + 0.06, tHot - 0.02, { nom: 0.4, loop: [['Am6', 2], ['E7', 2], ['Am6', 2]], next: 'Dm6', gtr: 0.8, bass: 1, brush: 0.6, bj: lvl([[tSt1, 0], [tHot, 0.8]]) });
  { const env = evs('whoosh').filter(e => e.t > tSt1 + 0.5 && e.t < tHot - 0.1).map(e => e.t), notes = ['A5', 'C6', 'E6', 'D6', 'C6', 'E6']; env.forEach((t, i) => { if (!inZone(t)) banjo(t, NOTE(notes[i % notes.length]), { gain: 0.026, t60: 0.35, pan: i % 2 ? 0.45 : -0.1, bright: 1.1 }); }); }
  playLine(gB.T(4), gB.d, TH_A.split('|')[0], (t, du, f) => clar(t, du * 0.95, f, { gain: 0.024 }));
  // c) hôtel : l'orchestre s'étoffe et devient noble (accord tenu de l'accordéon, balais), puis s'allège
  const gH = groove(tHot - 0.02, tB2, { nom: 0.42, loop: [['Dm6', 2], ['E7', 1]], next: 'E7', gtr: 0.6, bass: 0.9, brush: 1, accp: 0.5 });
  acc(tHot, 1.6, voice('Dm6', 55, 4).map(mtof), { gain: 0.026, att: 0.25, rel: 0.5, swell: 0.3 });
  // d) secret : basse seule et pizzicati, pédale de mi, tension dans le grave qui monte avec `suspense` ; la musique s'arrête net avant « secrète »
  const gS = groove(tB2, tStop, { nom: 0.45, loop: [['E7', 4]], bass: 0.8, bassMode: 'pedal', tapOff: 0, brush: 0.25 });
  gtr(gS.T(1), mtof(56), { gain: 0.022, t60: 0.4 }); gtr(gS.T(3), mtof(62), { gain: 0.022, t60: 0.4 });
  drone(tSusp - 0.1, tStop - tSusp, mtof(28), mtof(40), { gain: 0.035, att: 0.6, rel: 0.12, send: 0.3 });
  // e) SECRET : un roulement de balais, une note de piano sur le coup de tampon
  brushRoll(tSt2 - 0.45, 0.43, { gain: 0.02, from: 0.2, to: 1 });
  piano(tSt2 + 0.045, mtof(52), { gain: 0.05, dm: 1.2 }); piano(tSt2 + 0.06, mtof(59), { gain: 0.035, dm: 1.2 });
  // f) chute de la tour : l'accordéon tremble en crescendo (mi7b9), roulement de balais, puis l'accord plein sur VENDUE
  acc(tSt2 + 0.1, tVend - 0.03 - tSt2 - 0.1, voice('E7b9', 52, 5).map(mtof), { gain: 0.03, att: 1.1, rel: 0.06, trem: 0.5, trate: 9, bright: 1.1 });
  brushRoll(tCrack + 0.05, tVend - tCrack - 0.1, { gain: 0.022, from: 0.3, to: 1.2, rate: 30 });
  hit(tVend + 0.045, 'A6', 1.3, { keep: true, hold: 0.55, rel: 0.8, rim: true });
  // g) la pluie de pièces : le jazz-manouche reprend avec malice (après « métal »), puis une note tenue s'étire jusqu'à `piege`
  { const t = Fb.t1 + 0.07, g2 = groove(t, s1 + 0.02, { nom: 0.39, loop: [['E7', 2]], bass: 1, gtr: 0.9, bj: 0.8, brush: 0.7 });
    playLine(t, 0.19, 'E5:1 F5:1 E5:1 C5:1 B4:2', (tt, du, f) => clar(tt, Math.max(0.08, du * 0.6), f, { gain: 0.026, att: 0.015, bright: 1.1 }), { swing: 0.6, gate: false });
    acc(tDing + 0.05, 2.0, [mtof(52), mtof(59), mtof(64)], { gain: 0.02, att: 0.4, rel: 1.0, swell: 0.2 }); }
}

function musPiege() {                                    // LE PIÈGE : salon doré, de plus en plus complice (clarinette qui tombe d'une quarte, thème joyeux « un peu trop »), point haut sur VENDUE, puis le vide au pied de la tour : une clarinette un peu fausse, un accord grave, le coup de tampon, silence
  rnd = mkRnd(404); B = BUS.music; const [s0, s1] = SEG.piege, F2 = lastW('c2');
  const tMar = shotT(/^c1_marchand$/, s0, s1) ?? wt('c1', 'tombe') - 0.1, tAff = shotT(/^c2_affaire$/, s0, s1) ?? wt('c2', 'Convaincu') - 0.1, tVal = shotT(/^c2_valise$/, s0, s1) ?? wt('c2', 'il') - 0.1, tVen = shotT(/^c2_vendue$/, s0, s1) ?? wt('c2', 'à') - 0.1;
  const tDec = shotT(/^c3_decouverte$/, s0, s1) ?? wt('c3', 'Mais') - 0.1, tArn = shotT(/^c4_arnaque$/, s0, s1) ?? wt('c4', 'Il') - 0.1, tCoin = evT('coins', tVal, tVen, wt('c2', 'somme')), tSt = evT('stamp', tArn, s1, lastW('c4').t0);
  // 1) c1 : la musique de `faux` en un peu plus complice (guitare, contrebasse, balais), la clarinette tombe d'une quarte sur « piège » puis tient une note chaude
  groove(s0, tAff - 0.02, { nom: 0.45, loop: [['Am6', 2], ['E7', 2], ['Am6', 1]], next: 'A6', gtr: 0.75, bass: 0.9, brush: 0.6 });
  { const tc = wt('c1', 'dans') - 0.05; clar(tc, 1.8, mtof(74), { gain: 0.03, fall: 5, fallAt: wt('c1', 'piège') - 0.03 - tc, fallDur: 0.32, vdel: 0.6, att: 0.08, bright: 0.8 }); }
  // 2) c2 : le thème prend de l'ampleur en la majeur (accordéon musette, banjo, pulsation joyeuse, « un peu trop joyeuse »)
  groove(tAff - 0.02, tVal - 0.02, { nom: 0.42, loop: [['A6', 2], ['F#m7', 2]], next: 'B7', gtr: 1, bass: 1, brush: 0.8, bj: 0.8, accp: 0.9 });
  acc(tVal, tVen - tVal - 0.1, voice('B7', 54, 4).map(mtof), { gain: 0.024, att: 0.3, rel: 0.25, swell: 0.2, trem: 0.3, trate: 7 });                    // la mallette : l'accordéon tient un accord de si7
  brushRoll(tCoin - 0.65, 0.63, { gain: 0.02, from: 0.2, to: 1.2, rate: 28 });                                                                          // roulement qui s'arrête net sur le « chling » des pièces
  // 3) le contrat : l'accord gonfle sous le tampon (la majeur), le coup de caisse claire et l'accord plein juste après « Lustig » (le point haut)
  acc(tVen - 0.12, tDec - tVen - 0.1, voice('A6', 57, 4).map(mtof), { gain: 0.028, att: 0.45, rel: 0.1, swell: 0.1 });
  hit(F2.t1 + 0.07, 'A6', 1.4, { hold: 0.25, rel: 0.1, rim: true, dm: 0.7, until: tDec - 0.04 });
  CUTS.music.push([tDec - 0.03, tDec + 0.37, 0.025]);   // coupure nette de la musique du salon à l'arrivée au pied de la tour
  // 4) c3 : la clarinette seule, une note longue et un peu fausse (haute de 22 cents, qui dérive de 15 de plus) ; la guitare n'ose pas revenir
  clar(tDec + 0.42, 2.2, mtof(71), { gain: 0.022, detune: 22, drift: 15, vib: 0.01, vrate: 4.3, vdel: 0.8, att: 0.25, rel: 0.35, bright: 0.7, send: 0.6, breath: 0.08 });
  drone(wt('c3', 'découvre') - 0.05, tSt - wt('c3', 'découvre') - 0.1, mtof(33), mtof(33), { gain: 0.022, att: 1.6, rel: 0.03, send: 0.3 });       // sous « découvre la vérité » : un bourdon grave (la) qui monte doucement
  // 5) c4 : un seul accord grave tenu (la mineur) qui gonfle sous le tampon, puis plus rien
  acc(tArn + 0.05, tSt - tArn - 0.08, [mtof(45), mtof(52), mtof(57), mtof(60)], { gain: 0.036, att: 0.7, rel: 0.03, bright: 0.6, low: 0.5, swell: 0, air: 0.4 });
  CUTS.music.push([tSt - 0.035, s1 + 0.05, 0.03]);
}

function musHonte() {                                    // LA HONTE : après le silence, le thème de honte (clarinette basse, piano bastringue très lent), puis le jazz-manouche se réveille avec le train, plus malicieux au retour ; reste ouvert sur « arnaque ! »
  rnd = mkRnd(505); B = BUS.music; const [s0, s1] = SEG.honte, Fd1 = lastW('d1'), Fd2 = lastW('d2'), Fd3 = lastW('d3');
  const tHon = shotT(/^d2_honte$/, s0, s1) ?? wt('d2', 'Le') - 0.1, tTal = shotT(/^d2_talons$/, s0, s1) ?? wt('d2', 'même') - 0.1, tTrain = shotT(/^d3_train$/, s0, s1) ?? wt('d3', 'Victor') - 0.1, tArg = shotT(/^d3_argent$/, s0, s1) ?? wt('d3', 'avec') - 0.1;
  const tGare = shotT(/^d3_gare$/, s0, s1) ?? wt('d3', 'avant') - 0.1, tRet = shotT(/^d3_retour$/, s0, s1) ?? wt('d3', 'Paris') + 0.1, tCoin = evT('coins', tArg, tGare, wt('d3', "l'argent")), tDing = evT('ding', tRet, s1, s1 - 0.3);
  // 1) d1 : quelques notes de piano bastringue très lentes, une note de clarinette basse sur le « ? » ; la suspension reste ouverte (mi)
  piano(s0 + 0.14, mtof(57), { gain: 0.035, dm: 1.4, honky: 1.6 }); piano(s0 + 0.4, mtof(60), { gain: 0.03, dm: 1.4, honky: 1.6 });
  clar(Fd1.t0 - 0.2, Fd1.t1 - Fd1.t0 + 0.5, mtof(52), { gain: 0.03, att: 0.15, rel: 0.4, bright: 0.45, vib: 0.008, vdel: 0.4, send: 0.5 });
  piano(Fd1.t1 + 0.08, mtof(64), { gain: 0.03, dm: 1.6, honky: 1.6 });
  // 2) d2 : une tenue très grave, un petit motif descendant de clarinette basse sur « honteux »
  drone(Fd1.t1 + 0.1, tTal - Fd1.t1 - 0.1, mtof(33), mtof(33), { gain: 0.03, att: 0.5, rel: 0.2, send: 0.35 });
  { const t = wt('d2', 'honteux') + 0.06; [[60, 0], [59, 0.26], [57, 0.52], [56, 0.78]].forEach(([m, dt], i) => clar(t + dt, 0.3, mtof(m), { gain: 0.024, att: 0.03, rel: 0.12, bright: 0.5, fall: i === 3 ? 1 : 0, vdel: 0.1, send: 0.45 })); }
  // 3) d2_talons : le coup de caisse claire (juste après « plainte »), puis une phrase de clarinette qui retombe
  rimS(clearT(evT('stamp', tTal, tTrain, Fd2.t0 + 0.07)), 0.9);
  playLine(Fd2.t1 + 0.09, 0.2, 'E4:1 D4:1 C4:3', (t, du, f, pos) => clar(t, du * 0.9, f, { gain: 0.026, att: 0.02, rel: 0.1, fall: pos === 4 ? 2.5 : 0, bright: 0.7 }), { swing: 0.5, gate: false });
  // 4) d3_train : la contrebasse se met à marcher, le tempo se réveille (balais, guitare) ; « chling » de caisse claire sur l'argent
  groove(tTrain, tGare, { nom: 0.38, loop: [['Am', 2], ['E7', 2], ['Am', 2], ['E7', 2]], next: 'E7', gtr: lvl([[tTrain, 0], [tTrain + 0.7, 0.5], [tGare, 1]]), bass: lvl([[tTrain, 0.5], [tTrain + 0.4, 1]]), brush: lvl([[tTrain, 0.3], [tGare, 1.1]]), tapOff: 0.15 });
  rimS(tCoin, 0.8);
  // 5) d3_gare : le tempo ralentit comme le train, la guitare relance un motif espiègle
  groove(tGare, tRet, { nom: 0.5, loop: [['E7', 2]], next: 'Am6', gtr: 0.8, bass: 0.8, brush: 0.5, tapOff: 0 });
  playLine(tGare + 0.2, 0.27, 'E4:1 G#4:1 B4:1 E5:1 | D5:2', (t, du, f) => gtr(t, f, { gain: 0.026, t60: 0.35, pan: -0.1 }));
  // 6) d3_retour : reprise malicieuse du thème (accordéon + guitare), il s'arrête sur une note en suspens (si) après « arnaque » ; le ding, puis le silence
  const tEnd = Fd3.t1 + 0.07, gR = groove(tRet, tEnd, { nom: 0.45, loop: [['Am6', 2], ['E7', 2]], next: 'E7', gtr: 1, bass: 1, brush: 0.7, bj: 0.6, accp: 0.6 });
  playLine(gR.T(0), gR.d, TH_A.split('|')[0], (t, du, f) => { acc(t, du * 0.9, [f], { gain: 0.026, att: 0.015, rel: 0.05, air: 0.3, pan: 0.1 }); gtr(t, f, { gain: 0.022, t60: 0.4, pan: -0.15 }); });
  clar(tEnd, 0.55, mtof(71), { gain: 0.03, att: 0.08, rel: 0.2, send: 0.5 }); acc(tEnd, 0.55, [mtof(52), mtof(59)], { gain: 0.016, att: 0.1, rel: 0.2 });
}

function musFin() {                                      // FIN : le marchand court au commissariat (basse sur ses pas), la fuite (course comique) coupée par « échoue » (le « wah-wah »), valse musette légère sur « Cet homme a donc réussi… », la musique se fige sur JAMAIS, accord suspendu (mi sus), résolution sur le carton
  rnd = mkRnd(606); B = BUS.music; const [s0, s1] = SEG.fin, f2 = ph('fin2'), Fe = lastW('fin'), Ff = lastW('fin2');
  const tFui = shotT(/^f_fuite$/, s0, s1) ?? wt('fin', 'son') - 0.1, tTour = shotT(/^f_tour$/, s0, s1) ?? f2.t0 - 0.1, tSans = wt('fin2', 'sans'), tRes = Ff.t1 + 0.08;
  // 1) f_police : une note de contrebasse sur chacun de ses pas (A2, B2, C3 : ça monte), puis le silence du coup à la porte
  { const stp = EVENTS.filter(e => e.type === 'step' && e.t >= s0 && e.t < tFui).map(e => e.t); const ts = stp.length ? stp : [s0 + 0.1, s0 + 0.4, s0 + 0.7]; ts.forEach((t, i) => { if (!inZone(t)) dbass(t, mtof([45, 47, 48, 50][i % 4]), { gain: 0.055, t60: 0.5 }); }); piano(wt('fin', 'Mais') + 0.02, mtof(45), { gain: 0.03, dm: 1.2 }); }
  // 2) f_fuite : course comique (gamme de la mineur harmonique à toute vitesse à la clarinette et à la guitare, roulement de balais, basse en galop), arrêtée par « échoue »
  { const t = tFui + 0.04, tz = Fe.t0 - 0.07, d = (tz - t) / 4.4;
    playLine(t, d, 'A4:1 B4:1 C5:1 D5:1 E5:1 F5:1 G#5:1 A5:2', (tt, du, f) => { clar(tt, Math.max(0.04, du * 0.8), f, { gain: 0.02, att: 0.01, rel: 0.02, bright: 1.2, vib: 0 }); gtr(tt, f, { gain: 0.015, t60: 0.2, pan: -0.2 }); }, { swing: 0.5, gate: false });
    brushRoll(tFui, tz - tFui, { gain: 0.014, from: 0.3, to: 1.3, rate: 32 });
    for (let k = 0; k < 6; k++) dbass(tFui + 0.05 + k * (tz - tFui - 0.1) / 6, mtof(k % 2 ? 52 : 45), { gain: 0.035, t60: 0.2 }); }
  { const t = Fe.t1 + 0.07; [[71, 0], [69, 0.17], [68, 0.34]].forEach(([m, dt], i) => clar(t + dt, 0.2, mtof(m), { gain: 0.03, att: 0.03, rel: 0.05, fall: 1.5, fallAt: 0.06, fallDur: 0.14, bright: 0.55, vdel: 0.05, send: 0.4 })); }       // « wah-wah-wah » : l'échec
  // 3) f_tour : valse musette (la mineur), l'accordéon chante, guitare et banjo « pah-pah », basse sur le premier temps
  const gW = waltz(f2.t0 - 0.02, tSans - 0.25, { nom: 0.43, loop: [['Am', 3], ['Dm', 3], ['E7', 3]], gtr: 0.8, bass: 0.9, bj: 0.5, accp: 0.7, brush: 0.4 });
  playLine(gW.T(0), gW.d, 'A4:2 C5:2 E5:2 | F5:2 D5:2 A4:2 | G#4:2 B4:2 D5:2', (t, du, f) => acc(t, du * 0.95, [f], { gain: 0.03, att: 0.03, rel: 0.1, swell: 0.1, air: 0.4, pan: 0.1 }), { swing: 0.5 });
  // 4) la musique se fige : accord suspendu (mi sus 7) qui gonfle sous « sans jamais en être propriétaire », puis la résolution (la majeur) au moment du carton final
  acc(tSans + 0.05, tRes - tSans - 0.05, voice('Esus7', 52, 4).map(mtof), { gain: 0.042, att: 0.7, rel: 0.08, swell: 0.4, trem: 0.22, trate: 6.5, low: 0.4 });
  drone(tSans, tRes - tSans - 0.1, mtof(28), mtof(28), { gain: 0.032, att: 0.6, rel: 0.1, send: 0.3 });
  hit(tRes, 'A', 1.35, { keep: true, hold: 1.7, rel: 1.4, dm: 1.5 });
}

function musSortie() {                                   // SORTIE : l'accord de ré de la marque (comme la vidéo 2) qui résout la suspension
  rnd = mkRnd(606); B = BUS.music;
  pad(T_LOGO - 0.04, DUR - 1.0 - T_LOGO + 0.04, ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], { gain: 0.07 * 1.15 / TRIM.music, att: 0.25, rel: 1.2, bright: 0.45 });
}


// ───────── bruitages : un son par type d'événement (crête finale visée en dBFS dans LV) ─────────
const LV = {                                             // niveau de l'événement avant mastering, exprimé en « crête finale visée » (dBFS) corrigée de l'écart mesuré dû à la réverbération : la crête finale mesurée est dans son_notes.md
  ding: -11.8, no: -10, label: -10, blip: -12, counter: -10, pop: -10, scribble: -12.8, page: -10.1, whoosh: -8.4, reveal: -7.5, suspense: -11.3, wind: -11, heartbeat: -8, glow: -11.3, sparkle: -11.3, steam: -10.5,
  step: -10, hop: -10, bird: -12.3, run: -10, crack: -6.5, shake: -9.5,       // retouchés pour la vidéo 5
  stamp: -3.5, coins: -10.5, typing: -11.5, train: -9.5, gasp: -12.5, knock: -8,       // nouveaux types
  endCard: -9.6, logo: -5.6, letters: -8.7, swoosh: -9, thud: -7,
};
const shotIdAt = t => { const s = SHOTS_EV.find(s => t >= s.t0 - 0.001 && t < s.t1); return s ? s.id : ''; };
const durOf = (v, d = 1) => clamp(v > 0 ? v : d, 0.12, 12);
const SFX = {
  // interface (celles de la chaîne)
    ding(x) { bell(x, 'A5', { gain: 0.07, decay: 1.4 }); bell(x + 0.09, 'E6', { gain: 0.045, decay: 1.2 }); },
    no(x) { blip(x, 160, 105, 0.2, { gain: 0.11, duty: 0.5 }); noise(x, 0.12, { type: 'lp', f0: 600, f1: 200, gain: 0.04, att: 0.003, rel: 0.1 }); },
    label(x) { blip(x, 880, 1320, 0.07, { gain: 0.085 }); for (let k = 1; k < 14; k++) blip(x + k / 22, 2400, 2200, 0.012, { gain: 0.02, pan: 0.2 }); },
    blip(x) { blip(x, 1320, 1320, 0.05, { gain: 0.05, pan: 0.2 }); },
    counter(x, v) { const sc = ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5', 'B5', 'D6', 'E6'], i = Math.max(0, Math.round(v) - 1); marimba(x, sc[i % sc.length], { gain: 0.14, tau: 0.35, send: 0.2 }); nzb(x, 0.012, { type: 'bp', f0: 3000, q: 2, gain: 0.05, att: 0.0004, rel: 0.008, send: 0.1 }); },
    pop(x) { tone(x, 0.1, { f0: 260, f1: 900, curve: 0.5, gain: 0.14, att: 0.002, rel: 0.02, dec: 0.03, harm: [1, 0.2], send: 0.25 }); nzb(x, 0.015, { type: 'hp', f0: 3500, gain: 0.015, att: 0.0005, rel: 0.01 }); },
  // carnet
    scribble(x, v) { const d = durOf(v, 0.8), n = Math.max(2, Math.round(d * 11)); for (let k = 0; k < n; k++) { const t = x + k * d / n * (1 + 0.1 * rnd()), up = k % 2; nzb(t, 0.07, { type: 'bp', f0: 2800 + 900 * rnd(), f1: up ? 4200 : 2400, q: 1.2, gain: 0.05 * (0.6 + 0.4 * rnd()), att: 0.012, rel: 0.03, pan: 0.15 * Math.sin(k), send: 0.1 }); } nzb(x, d, { type: 'lp', f0: 700, q: 0.8, gain: 0.01, att: 0.05, rel: 0.1, am: 0.7, arate: 5.5 }); },
    page(x) { nzb(x, 0.22, { f0: 1800, f1: 3600, q: 0.9, gain: 0.12, att: 0.02, rel: 0.12, pan: -0.3, panTo: 0.3, send: 0.2 }); nzb(x + 0.2, 0.05, { f0: 650, q: 1.5, gain: 0.07, att: 0.002, rel: 0.03, send: 0.15 }); for (let k = 0; k < 4; k++) nzb(x + 0.04 + k * 0.045, 0.012, { type: 'hp', f0: 4500, gain: 0.03, att: 0.0005, rel: 0.007, pan: rr(-0.4, 0.4) }); },
  whoosh(x, v) { const d = durOf(v, 0.5), appr = EVENTS.some(e => e.type === 'stamp' && e.t > x + d * 0.6 && e.t < x + d + 0.2);       // si un coup de tampon suit : le froissement d'air grossit jusqu'au contact (le tampon qui arrive)
    if (appr) { nzb(x, d, { f0: 250, f1: 2200, q: 1.1, gain: 0.14, att: d * 0.88, rel: d * 0.1, pan: -0.3, panTo: 0.3, send: 0.2, curve: 0.9 }); tone(x, d, { f0: 110, f1: 170, gain: 0.04, att: d * 0.9, rel: d * 0.08, send: 0.15 }); } else nzb(x, d, { f0: 300, f1: 1500, q: 1.1, gain: 0.14, att: d * 0.45, rel: d * 0.5, pan: -0.6, panTo: 0.6, send: 0.3, curve: 0.8 });
    if (/invit/.test(shotIdAt(x))) { nzb(x, d, { f0: 2200, f1: 3400, q: 1.6, gain: 0.05, att: d * 0.4, rel: d * 0.5, am: 0.9, arate: 19, pan: -0.5, panTo: 0.5, send: 0.3 }); for (let k = 0; k < 5; k++) nzb(x + d * (0.1 + 0.7 * rnd()), 0.02, { type: 'hp', f0: 3200, gain: 0.05, att: 0.002, rel: 0.012, pan: rr(-0.6, 0.6) }); } },       // les enveloppes : froufrou de papier en plus
    reveal(x) { ['D5', 'A5', 'B5', 'E6', 'A6'].forEach((n, k) => glass(x + k * 0.05, n, { gain: 0.06, tau: 2.2, pan: -0.4 + 0.2 * k })); tone(x - 0.2, 0.3, { f0: 300, f1: 1500, curve: 1.3, gain: 0.03, att: 0.1, rel: 0.05, send: 0.4 }); nzb(x - 0.1, 0.5, { type: 'hp', f0: 6000, gain: 0.02, att: 0.1, rel: 0.35, send: 0.4 }); harp(x + 0.05, 'D4', { gain: 0.05 }); harp(x + 0.15, 'A4', { gain: 0.04 }); },
    suspense(x, v) { const d = durOf(v, 2); tone(x, d, { f0: 55, f1: 87, curve: 1.2, gain: 0.1, att: d * 0.5, rel: 0.12, harm: [1, 0.6, 0.35, 0.2], am: 0.35, arate: 7, send: 0.4 }); nzb(x, d, { f0: 400, f1: 2600, q: 1.1, gain: 0.06, att: d * 0.8, rel: 0.1, curve: 1.6, send: 0.4 }); tone(x, d, { f0: 880, f1: 1320, curve: 1.5, gain: 0.02, att: d * 0.7, rel: 0.1, am: 0.6, arate: 14 }); },
    wind(x, v) { const d = durOf(v, 2.5); nzb(x, d, { f0: 250, f1: 650, q: 1.5, gain: 0.12, att: d * 0.45, rel: d * 0.45, pan: -0.4, panTo: 0.4, send: 0.3, curve: 1.2 }); nzb(x + d * 0.1, d * 0.8, { f0: 1400, f1: 1800, q: 14, gain: 0.04, att: d * 0.4, rel: d * 0.4, pan: 0.3, panTo: -0.3 }); },
    heartbeat(x, v) { const s = clamp(v, 0.3, 1.2); tone(x, 0.34, { f0: 95, f1: 46, curve: 0.55, gain: 0.5 * s, att: 0.004, rel: 0.06, dec: 0.1, harm: [1, 0.3, 0.1], send: 0.18 }); tone(x + 0.24, 0.3, { f0: 80, f1: 42, curve: 0.55, gain: 0.34 * s, att: 0.004, rel: 0.06, dec: 0.09, harm: [1, 0.3, 0.1], send: 0.18 }); nzb(x, 0.07, { type: 'lp', f0: 220, f1: 110, gain: 0.3 * s, att: 0.002, rel: 0.05 }); nzb(x + 0.24, 0.06, { type: 'lp', f0: 200, f1: 100, gain: 0.2 * s, att: 0.002, rel: 0.04 }); return 0.55 + 0.45 * clamp(s, 0.3, 1); },
    glow(x, v) { const d = durOf(v, 2); ['A5', 'D6', 'E6', 'A6'].forEach((n, k) => tone(x + 0.05 * k, d, { f0: hz(n), gain: 0.03, att: d * 0.45, rel: d * 0.45, vib: 0.004, vrate: 4 + k, harm: [1, 0.15], pan: -0.4 + 0.27 * k, send: 0.6 })); tone(x, d, { f0: hz('A4'), gain: 0.03, att: d * 0.5, rel: d * 0.4, harm: [1, 0.4, 0.15], send: 0.5 }); nzb(x, d, { type: 'hp', f0: 6500, gain: 0.015, att: d * 0.5, rel: d * 0.4 }); for (let k = 0; k < 4 + Math.round(2 * d); k++) glass(x + d * 0.15 + (d * 0.7) * rnd(), ['A5', 'D6', 'E6', 'B5', 'A6', 'E7'][Math.floor(rnd() * 6)], { gain: 0.03, tau: 0.9, pan: rr(-0.6, 0.6) }); },
    sparkle(x) { const sc = ['B6', 'D7', 'E7', 'G7', 'A7', 'B7'], up = rnd() < 0.5; for (let k = 0; k < 4; k++) glass(x + k * 0.055, sc[up ? 1 + k : 4 - k], { gain: 0.05, tau: 0.45, pan: rr(-0.6, 0.6), send: 0.5 }); },
    steam(x, v) {                                          // vapeur qui siffle : bruit 3-9 kHz pulsé, filet sifflé étroit vers 5 kHz, souffle grave, quelques bulles qui éclatent ; durée v
      const d = durOf(v, 1);
      nzb(x, d, { type: 'hp', f0: 3200, f1: 4500, gain: 0.1, att: 0.04, rel: d * 0.45, am: 0.35, arate: 24, pan: -0.15, panTo: 0.15, send: 0.3 });
      nzb(x, d, { f0: 5200, f1: 4300, q: 14, gain: 0.07, att: 0.06, rel: d * 0.4, send: 0.2 });
      nzb(x, d, { f0: 1800, f1: 900, q: 0.7, gain: 0.04, att: 0.05, rel: d * 0.5 });
      for (let k = 0; k < Math.round(3 + 6 * d); k++) tone(x + d * 0.8 * rnd(), 0.05, { f0: 500 + 700 * rnd(), f1: 1500 + 800 * rnd(), curve: 0.5, gain: 0.03, att: 0.001, rel: 0.01, dec: 0.014, pan: rr(-0.6, 0.6), send: 0.4 }); },
  // pas, saut, course : le sol dépend du lieu (pavé, sable au pied de la tour, quai, parquet, tapis)
  step(x) { stepSnd(x, 1.8, rr(-0.25, 0.25), soilAt(x), 0.2); },
  hop(x) { const sf = soilAt(x); tone(x, 0.12, { f0: 130, f1: 70, curve: 0.5, gain: 0.12, att: 0.002, rel: 0.03, dec: 0.04, send: 0.15 }); stepSnd(x, 1.5, 0, sf, 0.2); },
  run(x, v) { const d = durOf(v, 1.2);       // trois paires de chaussures sur le pavé (Lustig léger et rapide, deux agents plus lourds), vêtements qui brassent l'air
    for (const [i, c, g, p0] of [[0, 0.27, 1, 0.3], [1, 0.31, 1.15, -0.2], [2, 0.3, 1.15, -0.55]]) { let t = x + 0.02 * i + 0.05 * rnd(), k = 0; while (t < x + d) { const e = sm((t - x) / 0.15) * (1 - 0.4 * sm((t - x - d * 0.7) / (d * 0.3))); stepSnd(t, g * e, p0 + 0.1 * Math.sin(k), 'pave', 0.22); t += c * (0.95 + 0.1 * rnd()); k++; } }
    nzb(x, d, { f0: 1800, f1: 1200, q: 0.5, gain: 0.02, att: 0.1, rel: 0.2, send: 0.2 }); },
  bird(x, v) { const ty = Math.round(clamp(v, 0, 3)), o = { gain: 0.12, pan: rr(-0.5, 0.5), send: 0.5 };       // 0 moineau, 1 pigeon qui s'envole (battements d'ailes + roucoulement), 2 martinet, 3 envol de pigeon et sifflement
    if (ty === 0) BIRD.sparrow(x, 1.05, o); else if (ty === 1) { BIRD.flap(x, 1, { ...o, gain: 0.1 }); BIRD.coo(x + 0.35, 1, { ...o, gain: 0.08 }); } else if (ty === 2) { BIRD.swift(x, 1.05, o); BIRD.swift(x + 0.3, 0.95, { ...o, pan: -o.pan }); } else { BIRD.flap(x, 1.1, { ...o, gain: 0.1 }); BIRD.whistle(x + 0.25, 1.05, o); } },
  // ─ nouveaux types de la vidéo 5
  stamp(x, v) {                                          // coup de tampon : bois sur papier, mat (aucune résonance qui sonne), petite pièce autour (deux réflexions assourdies) ; v = force
    const s = clamp(v, 0.5, 2.2), h = clamp((s - 0.5) / 1.7);
    tone(x, 0.16, { f0: 205 - 70 * h, f1: 120 - 35 * h, curve: 0.5, gain: 0.15, att: 0.0008, rel: 0.03, dec: 0.03 + 0.012 * h, harm: [1, 0.35], send: 0.1 });       // le corps : le manche et la table qui encaissent
    nzb(x, 0.05, { f0: 850, f1: 600, q: 0.9, gain: 0.5, att: 0.0005, rel: 0.03, dec: 0.014, send: 0.08 });
    nzb(x, 0.03, { f0: 1500, f1: 1100, q: 1.2, gain: 0.3, att: 0.0004, rel: 0.02, dec: 0.009, send: 0.05 });                                                       // le « chok » du bois
    nzb(x, 0.014, { f0: 3300, q: 0.7, gain: 0.11, att: 0.0003, rel: 0.009, send: 0.05 });                                                                          // le claquement du papier (mat : pas d'aigus au-delà de 5 kHz)
    nzb(x + 0.003, 0.035, { f0: 1700, q: 1.3, gain: 0.07, att: 0.0005, rel: 0.02, dec: 0.01 });                                                                    // le caoutchouc qui s'écrase
    if (h > 0.2) tone(x, 0.3, { f0: 80, f1: 46, curve: 0.5, gain: 0.13 * h, att: 0.002, rel: 0.06, dec: 0.06, harm: [1, 0.3], send: 0.1 });                           // le poids, quand il est lourd
    for (const [dt, g] of [[0.009, 0.3], [0.019, 0.17]]) { nzb(x + dt, 0.04, { type: 'lp', f0: 1500, f1: 700, gain: 0.2 * g, att: 0.001, rel: 0.025, dec: 0.012, pan: dt > 0.01 ? 0.3 : -0.3 }); tone(x + dt, 0.1, { f0: 190, f1: 130, gain: 0.1 * g, att: 0.001, rel: 0.02, dec: 0.03, pan: dt > 0.01 ? 0.3 : -0.3 }); }
    return 0.6 + 0.4 * clamp(s / 1.6); },
  coins(x, v) {                                          // pièces d'or qui tintent et se répandent + liasses de billets froissées ; v = durée (la densité des tintements décroît)
    const d = durOf(v, 1.2), n = Math.round(20 + 38 * d);
    for (let k = 0; k < n; k++) { const t = x + d * Math.pow(rnd(), 1.5), f = 2300 + 3600 * Math.pow(rnd(), 0.8), g = 0.35 + 0.65 * rnd(), pan = rr(-0.8, 0.8), tail = 0.05 + 0.18 * rnd();
      tone(t, tail * 3, { f0: f, f1: f * 0.99, gain: 0.11 * g, att: 0.0004, rel: 0.01, dec: tail, pan, send: 0.3 }); tone(t, tail * 2, { f0: f * 2.78, gain: 0.05 * g, att: 0.0004, rel: 0.01, dec: tail * 0.5, pan, send: 0.3 }); tone(t, tail, { f0: f * 5.1, gain: 0.02 * g, att: 0.0004, rel: 0.008, dec: tail * 0.25, pan });
      if (rnd() < 0.5) nzb(t, 0.012, { type: 'hp', f0: 3500, gain: 0.05 * g, att: 0.0003, rel: 0.007, pan }); if (rnd() < 0.3) tone(t, 0.06, { f0: 700 + 600 * rnd(), f1: 450, gain: 0.05 * g, att: 0.0006, rel: 0.012, dec: 0.02, pan }); }
    nzb(x, 0.07, { type: 'hp', f0: 3000, gain: 0.12, att: 0.0005, rel: 0.04, pan: 0.1 });
    nzb(x, d + 0.2, { f0: 2800, f1: 2200, q: 0.7, gain: 0.03, att: 0.05, rel: d * 0.5, am: 0.9, arate: 23, send: 0.2 }); },
  typing(x, v) {                                         // machine à écrire : frappes irrégulières (~11 par seconde), clochette et retour du chariot en fin de ligne ; v = durée
    const d = durOf(v, 1.0); let t = x; const ks = []; while (t < x + d) { ks.push(t); t += (1 / 11) * (0.55 + 0.9 * rnd()); }
    ks.forEach((tk, i) => { const g = 0.7 + 0.3 * rnd(), pan = rr(-0.12, 0.12), big = i % 7 === 6; nzb(tk, 0.006, { type: 'hp', f0: 3200, gain: 0.16 * g, att: 0.0002, rel: 0.004, pan, send: 0.08 }); tone(tk, 0.05, { f0: (big ? 130 : 170) + 60 * rnd(), f1: 110, gain: (big ? 0.18 : 0.12) * g, att: 0.0006, rel: 0.012, dec: 0.012, pan }); nzb(tk + 0.002, 0.03, { f0: 1500 + 1200 * rnd(), q: 3, gain: 0.07 * g, att: 0.0004, rel: 0.015, dec: 0.008, pan }); });
    if (d >= 0.7) { const tb = x + d + 0.04; tone(tb, 1.0, { f0: 2350, f1: 2340, gain: 0.07, att: 0.0005, rel: 0.2, dec: 0.28, harm: [1, 0.25], send: 0.35 }); tone(tb, 0.5, { f0: 2350 * 2.43, gain: 0.025, att: 0.0005, rel: 0.1, dec: 0.12, send: 0.35 }); }
    if (d >= 1.5) nzb(x + d + 0.3, 0.3, { f0: 900, f1: 1500, q: 1, gain: 0.06, att: 0.01, rel: 0.05, am: 0.9, arate: 55, pan: -0.2, panTo: 0.2 }); },
  gasp(x) {                                              // inspiration brusque de surprise : souffle filtré par la gorge (formants ≈ 450, 900 et 2 400 Hz), attaque raide, coupé net (on retient son souffle) ; deux voix décalées
    for (const [dt, fs, g, pan] of [[0, 1, 1, rr(-0.1, 0.1)], [0.028, 1.18, 0.5, rr(0.3, 0.5)]]) { const L = Math.floor(0.34 * SR), buf = new Float32Array(L), A = new Filt().set(900 * fs, 3), Bq = new Filt().set(2400 * fs, 2.5), C = new Filt().set(450 * fs, 2); let mx = 1e-9;
      for (let i = 0; i < L; i++) { const xs = i / SR, u = xs / 0.34, nz = rnd() * 2 - 1; A.run(nz); Bq.run(nz); C.run(nz); const e = Math.min(1, xs / 0.02) * (u < 0.62 ? 0.55 + 0.45 * u / 0.62 : Math.max(0, 1 - (u - 0.62) / 0.06)) * (1 + 0.15 * Math.sin(TAU * 9 * xs)); buf[i] = (A.bp * 0.7 + Bq.bp * 0.9 + C.bp * 0.4) * e; mx = Math.max(mx, Math.abs(buf[i])); }
      emit(buf, x + dt, pan, 0.2, 0.3 * g / mx); }
    tone(x, 0.012, { f0: 600, f1: 500, gain: 0.03, att: 0.0005, rel: 0.004, dec: 0.004 }); },
  knock(x, v) {                                          // coups à une porte de bois (deux « toc » ; v ≥ 2 : v coups) : le battant qui encaisse, le « tok » de la phalange, la porte creuse qui répond
    const n = v >= 2 ? Math.round(clamp(v, 2, 5)) : 2;
    for (let k = 0; k < n; k++) { const t = x + k * 0.17 * (0.95 + 0.1 * rnd()), g = k === 0 ? 1 : 0.85; tone(t, 0.16, { f0: 150, f1: 95, gain: 0.3 * g, att: 0.0008, rel: 0.03, dec: 0.035, harm: [1, 0.3], send: 0.2 }); nzb(t, 0.03, { f0: 720, q: 2.5, gain: 0.2 * g, att: 0.0004, rel: 0.02, dec: 0.01, send: 0.15 }); tone(t, 0.2, { f0: 310, gain: 0.1 * g, att: 0.001, rel: 0.04, dec: 0.07, send: 0.3 }); nzb(t, 0.008, { type: 'hp', f0: 2500, gain: 0.08 * g, att: 0.0003, rel: 0.005 }); } },
  train(x, v) {                                          // locomotive à vapeur : v ≥ 2 s = départ (« chuff » qui s'accélèrent, roues sur les joints, coup de sifflet) ; v < 2 s = arrivée (les « chuff » ralentissent, crissement des freins, sifflement de la vapeur) ; v = durée
    const d = durOf(v, 2.5), arr = d < 2, chuff = (t, g, pan) => { nzb(t, 0.16, { f0: 900, f1: 420, q: 0.7, gain: 0.2 * g, att: 0.012, rel: 0.1, dec: 0.06, pan, send: 0.2 }); nzb(t, 0.1, { type: 'lp', f0: 400, f1: 150, gain: 0.2 * g, att: 0.006, rel: 0.06, dec: 0.04, pan }); tone(t, 0.14, { f0: 70, f1: 45, gain: 0.2 * g, att: 0.004, rel: 0.04, dec: 0.05, harm: [1, 0.4], pan }); nzb(t + 0.04, 0.1, { type: 'hp', f0: 3000, gain: 0.03 * g, att: 0.01, rel: 0.06, pan }); };
    let t = x; while (t < x + d) { const u = (t - x) / d, iv = arr ? lerp(0.17, 0.5, u * u) : lerp(0.55, 0.19, u * u), g = arr ? 1 - 0.4 * u : 0.6 + 0.4 * u, pan = arr ? -0.5 + 0.5 * u : -0.15 + 0.3 * u; chuff(t, g, pan); t += iv * (0.96 + 0.08 * rnd()); }
    if (d >= 1.2) { let tc = x + 0.4; while (tc < x + d) { const u = (tc - x) / d; nzb(tc, 0.014, { f0: 1300, q: 1.5, gain: 0.07 * (arr ? 1.4 - u : 0.4 + u), att: 0.0004, rel: 0.009, pan: 0.3, send: 0.2 }); tc += arr ? lerp(0.17, 0.45, u) : lerp(0.5, 0.17, u); } }
    if (!arr) { for (const [fr, lv] of [[640, 1], [800, 0.8]]) tone(x + 0.05, 0.9, { f0: fr * 0.99, f1: fr, curve: 0.2, gain: 0.12 * lv, att: 0.07, rel: 0.4, harm: [1, 0.5, 0.3, 0.15], vib: 0.008, vrate: 5.5, send: 0.4 }); nzb(x + 0.05, 0.9, { f0: 3800, q: 2, gain: 0.02, att: 0.07, rel: 0.4, send: 0.4 }); }
    else { const tb = x + d * 0.4, db = d * 0.6; nzb(tb, db, { f0: 2900, f1: 1500, q: 9, gain: 0.07, att: db * 0.3, rel: db * 0.4, am: 0.4, arate: 38, pan: -0.1, send: 0.35, curve: 0.8 }); nzb(tb, db, { f0: 4300, f1: 2300, q: 12, gain: 0.03, att: db * 0.3, rel: db * 0.4, send: 0.35, curve: 0.8 }); nzb(tb + db * 0.5, db * 0.6, { type: 'hp', f0: 3500, gain: 0.04, att: db * 0.2, rel: db * 0.3, send: 0.3 }); } },
  shake(x) {                                             // l'image tremble après un choc : grave qui roule, objets qui vibrent sur la table
    tone(x, 0.5, { f0: 62, f1: 40, curve: 0.5, gain: 0.25, att: 0.004, rel: 0.12, dec: 0.13, harm: [1, 0.4], send: 0.2 }); nzb(x, 0.35, { type: 'lp', f0: 220, f1: 90, gain: 0.2, att: 0.004, rel: 0.2, dec: 0.1 });
    for (let k = 0; k < 7; k++) nzb(x + 0.03 + 0.4 * Math.pow(rnd(), 1.4), 0.01, { f0: 1100 + 1400 * rnd(), q: 2, gain: 0.06 * (1 - 0.1 * k), att: 0.0004, rel: 0.006, dec: 0.004, pan: rr(-0.6, 0.6) }); },
  crack(x, v) {                                          // le boulet de démolition frappe la poutre d'acier : choc sourd, acier qui sonne (partiels inharmoniques d'une poutre), métal qui se tord, éclats et débris ; v = force
    const f = clamp(v, 0.2, 1);
    nzb(x, 0.012, { type: 'hp', f0: 1500, gain: 0.5, att: 0.0002, rel: 0.008, send: 0.2 }); tone(x, 0.5, { f0: 95, f1: 45, curve: 0.5, gain: 0.35 * f, att: 0.002, rel: 0.1, dec: 0.1, harm: [1, 0.4, 0.2], send: 0.2 });
    [[310, 0.12, 0.35], [540, 0.09, 0.28], [890, 0.07, 0.2], [1430, 0.05, 0.14], [2250, 0.035, 0.1]].forEach(([fq, g, dc]) => tone(x, dc * 4, { f0: fq * (0.98 + 0.04 * rnd()), gain: g * f * 2, att: 0.0005, rel: 0.03, dec: dc, pan: rr(-0.3, 0.3), send: 0.45 }));
    nzb(x + 0.03, 0.5, { f0: 1200, f1: 400, q: 6, gain: 0.1 * f, att: 0.02, rel: 0.2, am: 0.6, arate: 18, send: 0.3 });
    for (let k = 0; k < 8; k++) { const t = x + 0.06 + 0.8 * Math.pow(rnd(), 1.3), fq = 1800 + 3500 * rnd(); tone(t, 0.1, { f0: fq, f1: fq * 0.7, gain: 0.07 * f * (1 - 0.5 * k / 8), att: 0.0004, rel: 0.012, dec: 0.025, pan: rr(-0.7, 0.7), send: 0.4 }); nzb(t, 0.006, { type: 'hp', f0: 3500, gain: 0.06 * f, att: 0.0003, rel: 0.004, pan: rr(-0.7, 0.7) }); }
    return 0.5 + 0.5 * f; },
  // marque (identique aux vidéos précédentes)
    endCard(x) { for (let k = 0; k < 28; k++) blip(x + k / 26, 2400, 2200, 0.012, { gain: 0.012 }); bell(x + 0.2, 'D5', { gain: 0.05, decay: 3 }); },
    logo(x) { thud(x, 0.4); thud(x + 0.36, 0.16); thud(x + 0.58, 0.08); [['D5', 0], ['F#5', 0.07], ['A5', 0.14], ['D6', 0.21]].forEach(([n, d]) => bell(x + d, n, { gain: 0.055, decay: 1.8 })); noise(x, 0.4, { type: 'hp', f0: 6000, f1: 9000, gain: 0.03, att: 0.01, rel: 0.3 }); },
    letters(x) { for (let k = 0; k < 7; k++) blip(x + k * 0.07, 900 + k * 70, 1200 + k * 70, 0.04, { gain: 0.05, pan: -0.3 + k * 0.1 }); },
};
SFX.swoosh = (x, v) => SFX.whoosh(x, 0.8);               // anciens types conservés par prudence
SFX.thud = x => { thud(x, 0.6); };


// ───────── exécution ─────────
const finalToPre = d => Math.atanh(clamp(dbv(d), 0, 0.98)) / 1.4;     // crête finale visée (après tanh(1,4 x)) → crête avant mastering
const CAP = mkBus(Math.floor(16 * SR), 0);
// Bruitages en retrait sous la voix : −11 dB quand le début du bruitage tombe sur un mot (la fin d'une phrase est souvent très douce : sur l'épisode 1, un jet couvrait « yeux » de 17 dB
// et la reconnaissance de parole lisait « l'heure »), −5 dB de plus sur le DERNIER mot d'une phrase (« pas », « cher », « Lustig », « arnaquer », « propriétaire »…) et jusqu'à −8 dB de plus
// quand plusieurs bruitages s'empilent sur ce mot (la puissance totale reste bornée). Les sons de réussite (ding, no) ne sont pas baissés par les mots mais le sont de −9 dB sur un mot final ;
// la marque reste entière ; le coup de tampon (fil conducteur de la vidéo) est moins baissé (DUCK_SOFT). Aucun bruitage n'est retardé : tous sont posés sur l'image.
const DUCK_EXEMPT = new Set(['ding', 'no', 'endCard', 'logo', 'letters']);
const DUCK_SOFT = { stamp: [-3, -4] };                     // [sur un mot, en plus sur un dernier mot] : le coup de tampon est le fil conducteur, bref (≈ 70 ms de corps) et grave : moins baissé que les autres bruitages
const WORDS_ALL = TLJ.phrases.flatMap(p => p.words);
const FINALS = TLJ.phrases.map(p => p.words[p.words.length - 1]);
const BRAND = new Set(['endCard', 'logo', 'letters']);
const crowdDb = t => { const w = FINALS.find(w => t > w.t0 - 0.05 && t < w.t1 + 0.06); if (!w) return 0; const n = EVENTS.filter(e => !BRAND.has(e.type) && e.t > w.t0 - 0.05 && e.t < w.t1 + 0.06).length; return n > 1 ? -Math.min(8, 10 * Math.log10(n)) : 0; };
function duckDb(t, type) {
  if (BRAND.has(type)) return 0;
  let ov = 0, ovF = 0; const a = t, b = t + 0.9;
  for (const w of WORDS_ALL) { const x0 = w.t0 - 0.04, x1 = w.t1 + 0.10; ov += Math.max(0, Math.min(b, x1) - Math.max(a, x0)); }
  for (const w of FINALS) ovF += Math.max(0, Math.min(t + 0.5, w.t1 + 0.05) - Math.max(t, w.t0 - 0.04));
  const fin = Math.min(1, ovF / 0.3);
  if (DUCK_EXEMPT.has(type)) return -9 * fin + (fin > 0 ? crowdDb(t) : 0);
  const dk = DUCK_SOFT[type] || [-11, -5];
  return dk[0] * Math.min(1, ov / 0.9) + dk[1] * fin + (fin > 0 ? crowdDb(t) : 0);
}
const duckFactor = (t, type) => Math.pow(10, duckDb(t, type) / 20);
const SLOG = [];                                         // --check : bruitages dont le début tombe sur un mot final
// les bruitages « de bruit » (éternuement, jet, éclaboussure, couinement, reniflement, secousse, urne) dont le début tombe DANS un mot sont retardés jusqu'à la fin du mot (au plus 0,35 s) :
// mesuré, l'éternuement tombait sur « nez » (la chute de la blague) et la reconnaissance de parole lisait « nom ».
const SHIFT_TYPES = new Set([]);                           // rien n'est retardé dans cette vidéo : tous les bruitages sont posés sur l'image (voir son_notes.md)
function shiftOffWord(t, type) {
  if (!SHIFT_TYPES.has(type)) return t;
  for (const w of WORDS_ALL) if (t > w.t0 + 0.02 && t < w.t1 - 0.03 && w.t1 + 0.03 - t <= 0.35) return w.t1 + 0.03;
  return t;
}
function runSfx() {
  const sfxBus = BUS.sfx; let idx = 0; const unknown = {};
  for (const e of EVENTS) {
    idx++; const fn = SFX[e.type]; if (!fn) { unknown[e.type] = (unknown[e.type] || 0) + 1; continue; }
    rnd = mkRnd(7000 + idx * 7919 + e.type.length * 31);
    const et = shiftOffWord(e.t, e.type), off = Math.max(0, Math.floor((et - 0.4) * SR)); if (OPT.check) { const z = inZone(et) || inZone(et + 0.05); if (z) SLOG.push(`${e.type} @${e.t.toFixed(2)}${et !== e.t ? ' → ' + et.toFixed(2) : ''} (${duckDb(et, e.type).toFixed(1)} dB)`); } CAP.off = off; CAP.lo = 1e12; CAP.hi = -1; B = CAP;
    let rel = 1; try { const r = fn(et, e.v); if (typeof r === 'number') rel = r; if (e.type === 'label' && e.t >= SEG.sortie[0]) rel = 0.65; } catch (err) { warn(`bruitage ${e.type} @${e.t} : ${err.message}`); }
    B = BUS.music; if (CAP.hi < 0) continue;
    let pk = 0; for (let i = CAP.lo; i <= CAP.hi; i++) pk = Math.max(pk, Math.abs(CAP.L[i]), Math.abs(CAP.R[i]));
    if (pk > 1e-9) { const k = finalToPre(LV[e.type] ?? -12) * rel / pk * duckFactor(et, e.type); for (let i = CAP.lo; i <= CAP.hi; i++) { const j = off + i; if (j >= N) break; sfxBus.L[j] += CAP.L[i] * k; sfxBus.R[j] += CAP.R[i] * k; sfxBus.SL[j] += CAP.SL[i] * k; sfxBus.SR[j] += CAP.SR[i] * k; } }
    for (let i = CAP.lo; i <= CAP.hi; i++) { CAP.L[i] = 0; CAP.R[i] = 0; CAP.SL[i] = 0; CAP.SR[i] = 0; }
  }
  for (const [t, n] of Object.entries(unknown)) warn(`type d'événement inconnu ignoré : ${t} (${n} fois)`);
}
function demo() {                                        // --only demo : un exemplaire de chaque instrument, toutes les 2,5 s (écrit build/test/demo.json : nom, temps, note) pour mesurer hauteur, durée, timbre
  rnd = mkRnd(77); B = BUS.music; const list = []; let t = 1; const add = (name, note, fn) => { list.push({ name, t, note: note ?? null }); fn(t); t += 2.5; };
  for (const n of ['A2', 'A3', 'E4']) add('gtr', n, t => gtr(t, NOTE(n), {})); add('gtrStrum', 'Am6', t => gtrStrum(t, voice('Am6', 52, 4).map(mtof), {})); add('gtrStrum', 'Am6', t => { for (let k = 0; k < 4; k++) gtrStrum(t + k * 0.4, voice('Am6', 52, 4).map(mtof), { gain: 0.034 * (k % 2 ? 1 : 0.72) }); });
  for (const n of ['A4', 'E5', 'A5']) add('banjo', n, t => banjo(t, NOTE(n), {})); add('acc', 'A3', t => acc(t, 1.2, [NOTE('A3')], {})); add('acc', 'Am6', t => acc(t, 1.2, voice('Am6', 57, 4).map(mtof), {}));
  for (const n of ['E4', 'A4', 'E5']) add('clar', n, t => clar(t, 1.0, NOTE(n), {})); for (const n of ['A2', 'A3', 'A4']) add('piano', n, t => piano(t, NOTE(n), {})); add('pianoChord', 'Am6', t => pianoChord(t, voice('Am6', 55, 4).map(mtof), {}));
  for (const n of ['A1', 'E2', 'A2']) add('dbass', n, t => dbass(t, NOTE(n), {})); add('brush', null, t => { for (let k = 0; k < 4; k++) { brushSwish(t + k * 0.4, 0.37, {}); if (k % 2) brushTap(t + k * 0.4, 0.8); } }); add('kick+rim', null, t => { kickS(t); rimS(t + 0.5); });
  add('glass', 'A5', t => glass(t, 'A5')); add('harp', 'A4', t => harp(t, 'A4')); add('pad', 'D3', t => pad(t, 1.6, ['D3', 'A3', 'F#4'], { gain: 0.06 })); add('drone', 'A1', t => drone(t, 1.5, NOTE('A1'), NOTE('A1')));
  for (const b of ['coo', 'flap', 'swift', 'sparrow']) add('bird_' + b, null, t => BIRD[b](t, 1, { gain: 0.1, pan: 0, send: 0.3 }));
  fs.mkdirSync('build/test', { recursive: true }); fs.writeFileSync('build/test/demo.json', JSON.stringify(list, null, 1));
}
const want = k => !ONLY || ONLY === k;
if (ONLY === 'demo') demo();
if (ONLY !== 'demo' && want('music')) { musIntro(); musIdee(); musFaux(); musPiege(); musHonte(); musFin(); musSortie(); }
if (ONLY !== 'demo' && want('amb')) ambiances();
if (ONLY !== 'demo' && want('sfx')) runSfx();

// ───────── mots de fin de phrase : musique et ambiances baissées autour du dernier mot (−8 dB musique, −5 dB ambiances, rampes de 70 ms) ─────────
// (épisode 1, mesuré : musique et ambiances ensemble faisaient lire « nom » pour « nez » alors que chacune seule laissait lire « nez » ; ici c'est systématique, sur tous les mots finaux)
{
  const ramp = 0.07;
  for (const [k, dB] of [['music', -8], ['amb', -5]]) {
    const b = BUS[k], lo = dbv(dB);
    for (const w of FINALS) {
      const a0 = w.t0 - 0.06, a1 = w.t1 + 0.10;
      for (let i = Math.max(0, Math.floor((a0 - ramp) * SR)); i < Math.min(N, Math.floor((a1 + ramp) * SR)); i++) {
        const x = i / SR, f = Math.min(1, Math.max(0, (x - (a0 - ramp)) / ramp), Math.max(0, (a1 + ramp - x) / ramp)), g = 1 - (1 - lo) * sm(f);
        b.L[i] *= g; b.R[i] *= g; b.SL[i] *= g; b.SR[i] *= g;
      }
    }
  }
}
// ───────── réverbération (type Freeverb) ─────────
class Comb { constructor(n) { this.b = new Float32Array(n); this.i = 0; this.f = 0; } p(x, fb, d) { const y = this.b[this.i]; this.f = y * (1 - d) + this.f * d; this.b[this.i] = x + this.f * fb; this.i = (this.i + 1) % this.b.length; return y; } }
class AP { constructor(n) { this.b = new Float32Array(n); this.i = 0; } p(x) { const bo = this.b[this.i], y = -x + bo; this.b[this.i] = x + bo * 0.5; this.i = (this.i + 1) % this.b.length; return y; } }
const sc = SR / 44100, CB = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], AB = [556, 441, 341, 225];
function verb(inp, spread, i0 = 0, i1 = N, out = new Float32Array(N)) {      // réverbération de i0 à i1 (états neufs : la queue s'arrête franchement en i1, avec 20 ms de descente)
  const cs = CB.map(n => new Comb(Math.round((n + spread) * sc))), as = AB.map(n => new AP(Math.round((n + spread) * sc))), fo = Math.floor(0.02 * SR);
  for (let i = i0; i < i1; i++) { const x = inp[i] * 0.015; let y = 0; for (const c of cs) y += c.p(x, 0.86, 0.25); for (const a of as) y = a.p(y); out[i] = y * Math.min(1, (i1 - i) / fo); }
  return out;
}
function verbCut(inp, spread, cuts) {                    // réverbération coupée net aux silences francs `cuts` [a, b, rampe] : ce qui sonne avant un silence ne revient pas après
  const out = new Float32Array(N); let from = 0;
  for (const [a, b] of cuts.slice().sort((x, y) => x[0] - y[0])) { const i1 = Math.min(N, Math.floor(a * SR)); if (i1 > from) verb(inp, spread, from, i1, out); from = Math.max(from, Math.floor(b * SR)); }
  if (N > from) verb(inp, spread, from, N, out); return out;
}
// ───────── master : chaque bus a sa réverbération, un adoucisseur tanh, le même gain final pour toutes les pistes ─────────
const mast = {};
// la musique est surtout grave (contrebasse, grosse caisse, accords du piano) : un plateau grave (−5 dB sous 140 Hz) et un filtre coupe-bas à 45 Hz avant la réverbération, pour laisser la place à la voix et au petit haut-parleur
function lowShelf(b) {
  const a = 1 - Math.exp(-TAU * 140 / SR), h = 1 - Math.exp(-TAU * 45 / SR);
  const w0 = Math.floor((T_LOGO - 0.35) * SR), w1 = Math.floor((T_LOGO - 0.05) * SR);       // l'accord de ré de la marque (plan de sortie) reste identique à celui des vidéos précédentes : le filtre s'efface juste avant lui
  for (const ch of ['L', 'R', 'SL', 'SR']) { const x = b[ch]; let lp = 0, dc = 0; for (let i = 0; i < x.length; i++) { const v = x[i]; dc += (v - dc) * h; const u = v - dc; lp += (u - lp) * a; const y = u - 0.45 * lp, wr = i <= w0 ? 0 : i >= w1 ? 1 : sm((i - w0) / (w1 - w0)); x[i] = y + (v - y) * wr; } }
}
lowShelf(BUS.music);
const cutGain = (list) => { const G = new Float32Array(N).fill(1); for (const [a, b, r] of list) for (let i = Math.max(0, Math.floor((a - r) * SR)); i < Math.min(N, Math.floor((b + r) * SR)); i++) { const x = i / SR, f = Math.min(1, Math.max(0, (x - (a - r)) / r), Math.max(0, (b + r - x) / r)); G[i] *= 1 - sm(f); } return G; };
for (const k of ['music', 'amb', 'sfx']) {
  const b = BUS[k], cuts = CUTS[k] || [], WL = cuts.length ? verbCut(b.SL, 0, cuts) : verb(b.SL, 0), WR = cuts.length ? verbCut(b.SR, 23, cuts) : verb(b.SR, 23), ML = new Float32Array(N), MR = new Float32Array(N), CG = cutGain(CUTS[k] || []);
  for (let i = 0; i < N; i++) {
    const fade = Math.min(1, (N - i) / (0.8 * SR)) * CG[i];
    ML[i] = Math.tanh((b.L[i] + WL[i] * 3.2) * 1.4 * TRIM[k]) * fade; MR[i] = Math.tanh((b.R[i] + WR[i] * 3.2) * 1.4 * TRIM[k]) * fade;
    if (!Number.isFinite(ML[i]) || !Number.isFinite(MR[i])) throw new Error(`NaN (${k}) à ` + (i / SR).toFixed(3) + ' s');
  }
  mast[k] = [ML, MR];
}
const stems = { music: [mast.music, mast.amb], sfx: [mast.sfx] };      // la musique et les ambiances partent ensemble dans score_music.wav
let peak = 0, energy = 0;
for (let i = 0; i < N; i++) { const l = mast.music[0][i] + mast.amb[0][i] + mast.sfx[0][i], r = mast.music[1][i] + mast.amb[1][i] + mast.sfx[1][i]; peak = Math.max(peak, Math.abs(l), Math.abs(r)); energy += l * l; }
if (peak < 1e-4 || energy / N < 1e-8) throw new Error('mix silencieux');
const g = Math.min(1, 0.89 / peak);                      // jamais de gain en plus : les niveaux visés sont ceux de LV ; si la somme dépasse 0,89 on baisse tout d'un même gain
function wav(path, chans) {
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) { let v = 0; for (const ch of chans) v += ch[c][i]; buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * g)) * 32767), 44 + i * 4 + c * 2); }
  fs.mkdirSync(OUT.replace(/[^/]*$/, '') || '.', { recursive: true }); fs.writeFileSync(path, buf);
}
wav(OUT, [mast.music, mast.amb, mast.sfx]);
wav(OUT.replace(/\.wav$/, '_music.wav'), stems.music);
wav(OUT.replace(/\.wav$/, '_sfx.wav'), stems.sfx);
if (OPT.stems) { wav(OUT.replace(/\.wav$/, '_musiconly.wav'), [mast.music]); wav(OUT.replace(/\.wav$/, '_amb.wav'), [mast.amb]); }
if (OPT.check) {
  const hits = MLOG.filter(([t, k, g]) => inZone(t) && g > 0).sort((x, y) => x[0] - y[0]);
  console.log(`--check : ${hits.length} attaque(s) de musique sur un mot final` + (hits.length ? ' :' : ' (zones dégagées)')); for (const [t, k, g] of hits) console.log(`   musique ${k} @${t.toFixed(2)} gain ${g}`);
  console.log(`--check : ${SLOG.length} bruitage(s) dont le début tombe sur un mot final` + (SLOG.length ? ' :' : '')); for (const l of SLOG) console.log('   ' + l);
  console.log(GLOG.join('\n'));
  console.log('mots finaux : ' + FINALS.map(w => `${w.w} ${w.t0.toFixed(2)}-${w.t1.toFixed(2)}`).join(' · '));
}
console.log('score :', OUT, (N / SR).toFixed(2), 's, crête', peak.toFixed(3), g < 1 ? '(baissée de ' + vdb(g).toFixed(1) + ' dB)' : '');