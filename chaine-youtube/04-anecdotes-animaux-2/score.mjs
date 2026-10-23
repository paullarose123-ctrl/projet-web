// node score.mjs build/score.wav   (écrit aussi build/score_music.wav et build/score_sfx.wav : la musique est baissée sous la voix au mixage par rendu.sh)
// Vidéo 4 « 3 anecdotes folles sur les animaux », ÉPISODE 2 (scarabée bombardier, basilic, anguille électrique) : musique douce aux timbres
// acoustiques synthétisés (cordes pincées, marimba, kalimba, flûte, verre, tambours doux ; quelques notes « électriques » pour l'anguille),
// une couleur par monde, AMBIANCES de nature continues (prairie dorée, forêt tropicale au bord d'une rivière, rivière amazonienne au
// crépuscule puis sous l'eau) et bruitages de tous les types d'événements de GUIDE.md §4 et BRIEF-EP2.md. Aucun fichier sonore, aucun droit.
// Entrées : build/events.json (node render.mjs piece.html --events) et build/timeline.json (voix.py) ; tout est calé sur les phrases de
// timeline.json (i1, b1-b4, c1-c3, e1-e3, fin ; wt(id, mot) : repli sur le début de la phrase si le mot manque) et sur les événements ; un type
// inconnu ou absent ne plante jamais (avertissement), seul 'logo' est obligatoire (sortie).
// Sorties : score.wav (somme) ; score_music.wav = musique + ambiances (adoucies ensemble sous la voix, avec la même libération lente du
// compresseur à sidechain : pas de pompage du fond) ; score_sfx.wav = bruitages seuls.
// Essais :  node score.mjs build/test/score.wav --events build/test/events_test.json [--timeline f] [--stems] [--only music|amb|sfx|demo] [--layer nom] [--check]
//   --stems écrit aussi _musiconly.wav, _amb.wav, _sfx.wav (mesures) ; --only ne synthétise que cette couche (essais rapides) ;
//   --check liste les attaques de musique et de bruitage qui tombent sur un mot de fin de phrase (zones à garder dégagées).
import fs from 'fs';

// ───────── arguments ─────────
const OPT = {}, POS = [];
{ const A = process.argv.slice(2); for (let i = 0; i < A.length; i++) { const a = A[i]; if (a.startsWith('--')) { const nx = A[i + 1]; if (nx !== undefined && !nx.startsWith('--')) { OPT[a.slice(2)] = nx; i++; } else OPT[a.slice(2)] = true; } else POS.push(a); } }
const OUT = POS[0] || 'build/score.wav', ONLY = typeof OPT.only === 'string' ? OPT.only : null;
const SR = 48000, TAU = Math.PI * 2;
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
const ORDER = ['i1', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'e1', 'e2', 'e3', 'fin'];
const ph = id => P[id] || (() => { warn('phrase manquante : ' + id + ' (repli sur le rang)'); return PHR[Math.min(PHR.length - 1, Math.max(0, ORDER.indexOf(id)))]; })();
const END = PHR[PHR.length - 1].t1, VOICE_END = END;
const norm = s => String(s).normalize('NFC').toLowerCase().replace(/[’‘]/g, "'").replace(/[.,:;!?…]/g, '');
const strip = s => norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// mot d'une phrase : `txt` est un mot ou une liste de graphies possibles (« 100 » ou « cent », « 860 » ou « huit ») ; casse, ponctuation et accents tolérés
const findWord = (id, txt, k = 0) => { const W = ph(id).words; for (const a of Array.isArray(txt) ? txt : [txt]) { let c = W.filter(w => norm(w.w) === norm(a)); if (!c.length) c = W.filter(w => strip(w.w) === strip(a)); if (c[k]) return c[k]; } return null; };
const wt = (id, txt, k = 0) => { const w = findWord(id, txt, k); if (!w) { warn(`mot absent ${id} « ${Array.isArray(txt) ? txt.join('|') : txt} » : repli sur le début de la phrase`); return ph(id).t0; } return w.t0; };
const wt1 = (id, txt, k = 0) => { const w = findWord(id, txt, k); return w ? w.t1 : ph(id).t1; };
const lastW = id => { const W = ph(id).words; return W[W.length - 1]; };     // le dernier mot d'une phrase (« degrés », « explosion », « volts »… : à garder dégagé)
const evs = type => EVENTS.filter(e => e.type === type);
const evIn = (type, a, b) => EVENTS.find(e => e.type === type && e.t >= a && e.t < b) || null;
const at = type => { const e = evs(type)[0]; if (!e) throw new Error('événement manquant : ' + type); return e.t; };
const LEAD = 0.12, CARD_T = 2.0;                         // comme shots.js
const SEG = {
  intro: [0, ph('b1').t0 - LEAD], sca: [ph('b1').t0 - LEAD, ph('c1').t0 - LEAD], bas: [ph('c1').t0 - LEAD, ph('e1').t0 - LEAD],
  ang: [ph('e1').t0 - LEAD, ph('fin').t0 - LEAD], fin: [ph('fin').t0 - LEAD, VOICE_END + CARD_T], sortie: [VOICE_END + CARD_T, DUR],
};
const segAt = t => t < SEG.intro[1] ? 'intro' : t < SEG.sca[1] ? 'sca' : t < SEG.bas[1] ? 'bas' : t < SEG.ang[1] ? 'ang' : t < SEG.fin[1] ? 'fin' : 'sortie';
// Mots de fin de phrase : la reconnaissance de parole les relit mal quand une note ou un bruitage tombe dessus (leçon de l'épisode 1 : « yeux », « nez »).
// ZONES = intervalle où aucune attaque de musique n'est posée ; PROT = zone élargie où la musique et les ambiances baissent (voir la fin du fichier).
const ZONES = PHR.map(p => { const w = p.words[p.words.length - 1]; return [w.t0 - 0.06, w.t1 + 0.05]; });
const inZone = t => ZONES.find(z => t > z[0] && t < z[1]) || null;
const clearT = (t, maxShift = 0.7) => { const z = inZone(t); return z && z[1] - t <= maxShift ? z[1] + 0.01 : t; };       // un coup de musique calé sur un mot final est reporté juste après le mot
const MLOG = [];                                         // --check : attaques de musique (kind, gain) avec leur date
const logOn = (t0, kind, g) => { if (OPT.check && B === BUS.music) MLOG.push([t0, kind, g]); };

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

// ───────── instruments de la musique (timbres acoustiques) ─────────
function kalimba(t0, n, o = {}) {                        // lamelle métallique pincée du pouce : fondamentale pure, petit « plink » inharmonique, caisse en bois
  const { gain = 0.07, decay = 1.3, pan = 0, send = 0.35, bright = 1 } = o, f = hz(n), len = Math.floor(Math.min(4, decay * 4.5) * SR), buf = new Float32Array(len);
  addPartials(buf, f, [[1, 1, decay], [2, 0.12, decay * 0.5], [3, 0.04, decay * 0.3], [5.9, 0.08 * bright, 0.06], [9.4, 0.03 * bright, 0.03]]);
  const ck = lpNoise(Math.floor(0.008 * SR), 0.3); for (let i = 0; i < ck.length; i++) buf[i] += ck[i] * 0.5 * Math.exp(-i / (0.0018 * SR)) * (1 - i / ck.length);
  emit(buf, t0, pan, send, gain);
}
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
function nylon(t0, n, o = {}) {                          // guitare à cordes nylon
  const { gain = 0.06, pan = 0, send = 0.35, t60 = 1.8, a = 0.7, dur = null } = o, f = hz(n), len = Math.floor((dur ?? Math.min(3.2, t60 * 1.5)) * SR), buf = ksString(f, len, { a, t60, pos: 0.17, exc: 0.75 });
  dull(buf, clamp(f * 11, 1100, 4200), clamp(f * 3, 380, 1400), 0.18); bodyRes(buf); emit(buf, t0, pan, send, gain * 1.6);
}
function harp(t0, n, o = {}) {                           // harpe : corde plus brillante et plus longue, pincée près du centre
  const { gain = 0.05, pan = 0, send = 0.5, t60 = 3.2 } = o, f = hz(n), len = Math.floor(Math.min(4, t60 * 1.2) * SR), buf = ksString(f, len, { a: 0.85, t60, pos: 0.3, exc: 0.55 });
  dull(buf, clamp(f * 12, 2500, 6500), clamp(f * 3.5, 800, 3000), 0.5); emit(buf, t0, pan, send, gain * 1.4);
}
function bassPluck(t0, n, o = {}) {                      // contrebasse pincée douce (jamais de basse électronique)
  const { gain = 0.07, pan = 0, send = 0.2, t60 = 1.0 } = o, f = hz(n), len = Math.floor(t60 * 1.3 * SR), buf = ksString(f, len, { a: 0.5, t60, pos: 0.12, exc: 0.8 }), L = new Filt().set(Math.max(260, f * 5), 0.7);
  for (let i = 0; i < len; i++) { L.run(buf[i]); buf[i] = L.lp; } emit(buf, t0, pan, send, gain * 1.2);
}
function flute(t0, dur, n, o = {}) {                     // flûte soufflée : sinus + 2 harmoniques, vibrato tardif, souffle et petit « chiff » d'attaque
  const { gain = 0.05, pan = 0, send = 0.55, vib = 0.006, vrate = 5.2, breath = 0.12, att = 0.07, rel = 0.16, glide = 0.02 } = o, f0 = hz(n), len = Math.floor((dur + rel) * SR), buf = new Float32Array(len), F = new Filt().set(f0 * 2.4, 1.4), C = new Filt().set(f0 * 3.1, 1.2);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const x = i / SR, f = f0 * (1 + vib * sm((x - 0.15) / 0.4) * Math.sin(TAU * vrate * x) - glide * Math.exp(-x / 0.05)); ph += TAU * f / SR;
    let e = x < att ? sm(x / att) : x > dur ? Math.max(0, 1 - (x - dur) / rel) : 1; e *= 1 + 0.03 * Math.sin(TAU * 3.3 * x);
    const nz = rnd() * 2 - 1; F.run(nz); C.run(nz);
    buf[i] = e * (0.65 * (Math.sin(ph) + 0.2 * Math.sin(2 * ph + 0.3) + 0.06 * Math.sin(3 * ph)) + breath * F.bpn * 0.35) + 0.35 * C.bpn * 0.25 * Math.exp(-x / 0.02) * (x < 0.08 ? 1 : 0);
  }
  emit(buf, t0, pan, send, gain);
}
function reed(t0, f0, f1, dur, o = {}) {                 // basson comique : scie filtrée par deux formants nasaux, vibrato lent, glissando
  const { gain = 0.07, pan = 0, send = 0.3, growl = 0 } = o, len = Math.floor((dur + 0.05) * SR), buf = new Float32Array(len), A = new Filt().set(520, 5), Bf = new Filt().set(1150, 6), L = new Filt().set(2400, 0.7); let ph = 0;
  for (let i = 0; i < len; i++) {
    const u = clamp(i / (dur * SR)), f = f0 * Math.pow(f1 / f0, u * u) * (1 + 0.012 * Math.sin(TAU * 5.4 * i / SR) * u); ph += f / SR; const saw = (ph % 1) * 2 - 1;
    A.run(saw); Bf.run(saw); L.run(saw * 0.4 + A.bp * 1.4 + Bf.bp * 0.9); const x = i / SR;
    buf[i] = L.lp * Math.min(1, x / 0.025) * Math.min(1, Math.max(0, (dur + 0.05 - x)) / 0.07) * (growl ? 1 - growl * 0.4 * (0.5 + 0.5 * Math.sin(TAU * 28 * x)) : 1);
  }
  emit(buf, t0, pan, send, gain * 1.3);
}
function pad(t0, dur, notes, o = {}) {                   // nappe douce (sinusoïdes désaccordées, trémolo lent) : celle de la marque, inchangée
  const { gain = 0.06, att = 1.2, rel = 1.5, det = 7, bright = 0.2, send = 0.5, trem = 0.18 } = o;
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
function shaker(t0, o = {}) {                            // œuf de maracas : deux petites rafales de bruit clair (la seconde plus forte), attaque rapide
  const { gain = 0.03, pan = 0, send = 0.2, accent = 1, f = 7000, len = 0.07 } = o;
  nzb(t0 - 0.028, 0.03, { type: 'bp', f0: f, q: 1.3, gain: gain * 0.35, att: 0.006, rel: 0.012, dec: 0.015, pan, send });
  nzb(t0, len, { type: 'bp', f0: f * 0.95, f1: f * 0.8, q: 1.2, gain: gain * accent, att: 0.01, rel: 0.02, dec: 0.025, pan, send });
}
function dLow(t, g = 1, o = {}) { tone(t, 0.3, { f0: 150, f1: 72, curve: 0.3, gain: 0.2 * g, att: 0.002, rel: 0.04, dec: 0.085, harm: [1, 0.3], pan: o.pan ?? -0.15, send: 0.2 }); nzb(t, 0.04, { type: 'lp', f0: 500, f1: 220, gain: 0.12 * g, att: 0.001, rel: 0.03, send: 0.15 }); }      // grave d'un djembé
function dMid(t, g = 1, o = {}) { const f = o.f ?? 230; tone(t, 0.22, { f0: f * 1.1, f1: f, curve: 0.3, gain: 0.14 * g, att: 0.002, rel: 0.03, dec: 0.07, harm: [1, 0.25, 0.1], pan: o.pan ?? 0.2, send: 0.2 }); nzb(t, 0.02, { type: 'bp', f0: 1800, q: 1.5, gain: 0.08 * g, att: 0.0008, rel: 0.012, send: 0.1, pan: o.pan ?? 0.2 }); }   // conga ouverte
function dHi(t, g = 1, o = {}) { const f = o.f ?? 360; tone(t, 0.14, { f0: f * 1.06, f1: f, curve: 0.3, gain: 0.1 * g, att: 0.001, rel: 0.02, dec: 0.04, harm: [1, 0.3], pan: o.pan ?? 0.4, send: 0.18 }); nzb(t, 0.025, { type: 'bp', f0: 2400, q: 2, gain: 0.09 * g, att: 0.0005, rel: 0.015, send: 0.1, pan: o.pan ?? 0.4 }); }   // claque aiguë
function wood(t, g = 1, f = 950, pan = 0.3) { tone(t, 0.07, { f0: f, f1: f * 0.92, gain: 0.1 * g, att: 0.0008, rel: 0.012, dec: 0.016, harm: [1, 0.4], pan, send: 0.2 }); nzb(t, 0.012, { type: 'bp', f0: f * 2.2, q: 2, gain: 0.05 * g, att: 0.0004, rel: 0.008, pan, send: 0.1 }); }
const thumpMusic = (x, g = 1) => { tone(x, 0.34, { f0: 82, f1: 46, curve: 0.6, gain: 0.12 * g, att: 0.004, rel: 0.05, dec: 0.1, harm: [1, 0.35], send: 0.15 }); tone(x + 0.25, 0.3, { f0: 66, f1: 40, curve: 0.6, gain: 0.08 * g, att: 0.004, rel: 0.05, dec: 0.09, harm: [1, 0.3], send: 0.15 }); };

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
const BIRD = {
  tsit: (t, s, o) => { const n = 3 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) chirp(t + k * 0.115 * (0.9 + 0.2 * rnd()), 0.06, [[0, 5400 * s], [1, 4300 * s]], { ...o, h2: 0.05, att: 0.3 }); },
  whistle: (t, s, o) => { chirp(t, 0.22, [[0, 2700 * s], [0.45, 3400 * s], [1, 3200 * s]], { ...o, att: 0.25, h2: 0.04 }); chirp(t + 0.3, 0.3, [[0, 3700 * s], [1, 2900 * s]], { ...o, h2: 0.03 }); },
  trill: (t, s, o) => chirp(t, 0.7, [[0, 3500 * s], [0.5, 4000 * s], [1, 3600 * s]], { ...o, am: [31, 0.85], att: 0.12, h2: 0.05 }),
  chick: (t, s, o) => { chirp(t, 0.3, [[0, 3900 * s], [1, 3850 * s]], { ...o, h2: 0, att: 0.15 }); chirp(t + 0.42, 0.38, [[0, 3350 * s], [1, 3300 * s]], { ...o, h2: 0, att: 0.15 }); },
  warble: (t, s, o) => chirp(t, 1.1, [[0, 3000 * s], [0.3, 3300 * s], [0.7, 2800 * s], [1, 3100 * s]], { ...o, fm: [11, 520 * s], fm2: [17, 240 * s], att: 0.1, h2: 0.08 }),
  coo: (t, s, o) => { [[0, 0.3, 500], [0.42, 0.2, 560], [0.7, 0.2, 550], [0.98, 0.5, 490]].forEach(([d, du, f]) => chirp(t + d, du, [[0, f * s * 1.04], [1, f * s]], { ...o, att: 0.35, h2: 0.25, h3: 0.06 })); },
  hoopoe: (t, s, o) => { for (let k = 0; k < 3; k++) chirp(t + k * 0.29, 0.14, [[0, 480 * s], [0.25, 540 * s], [1, 470 * s]], { ...o, att: 0.2, h2: 0.4, h3: 0.1 }); },
  rasp: (t, s, o) => { let x = t; for (let k = 0; k < 6; k++) { chirp(x, 0.09, [[0, 1700 * s], [1, 1250 * s]], { ...o, fm: [95, 380 * s], att: 0.2, h2: 0.6, h3: 0.3 }); x += 0.2 - k * 0.018; } },
  parrot: (t, s, o) => { chirp(t, 0.2, [[0, 2000 * s], [0.3, 2600 * s], [1, 1500 * s]], { ...o, fm: [85, 420 * s], att: 0.15, h2: 0.5, h3: 0.3 }); chirp(t + 0.27, 0.16, [[0, 2300 * s], [1, 1600 * s]], { ...o, fm: [90, 380 * s], att: 0.15, h2: 0.5, h3: 0.25, gain: (o.gain || 0.05) * 0.8 }); },
  oriole: (t, s, o) => { chirp(t, 0.36, [[0, 2300 * s], [0.3, 3000 * s], [1, 1900 * s]], { ...o, att: 0.2, h2: 0.1 }); chirp(t + 0.45, 0.28, [[0, 2100 * s], [1, 1650 * s]], { ...o, att: 0.2, h2: 0.08 }); },
  toucan: (t, s, o) => { for (let k = 0; k < 4; k++) chirp(t + k * 0.23, 0.13, [[0, 950 * s], [1, 680 * s]], { ...o, fm: [60, 240 * s], att: 0.2, h2: 0.7, h3: 0.35 }); },
  tinamou: (t, s, o) => { for (let k = 0; k < 3; k++) chirp(t + k * 1.0, 0.7, [[0, (1000 + 90 * k) * s], [1, (1080 + 90 * k) * s]], { ...o, att: 0.45, h2: 0.05 }); },
  owl: (t, s, o) => { chirp(t, 0.38, [[0, 360 * s], [0.4, 345 * s], [1, 330 * s]], { ...o, att: 0.35, h2: 0.15 }); chirp(t + 0.62, 0.55, [[0, 350 * s], [1, 300 * s]], { ...o, att: 0.3, h2: 0.15 }); },
};

// synthèse vocale d'animal : source glottale (scie adoucie ou impulsions) + souffle, filtrée par des formants en parallèle, normalisée en crête
function voc(t0, dur, o = {}) {
  const { f0pts = [[0, 400], [1, 300]], forms = [[700, 6, 1], [1500, 8, 0.6], [2800, 10, 0.3]], gain = 0.1, breath = 0.04, vib = 0.02, vrate = 20, pan = 0, send = 0.3, att = 0.01, rel = 0.04, fs = 1, src = 'saw', smooth = 0.5 } = o;
  const len = Math.floor(dur * SR), buf = new Float32Array(len), Fs = forms.map(([f, q]) => new Filt().set(f * fs, q)); let ph = 0, lp = 0, mx = 1e-9;
  for (let i = 0; i < len; i++) {
    const u = i / len, x = i / SR, f = interp(f0pts, u) * (1 + vib * Math.sin(TAU * vrate * x)); ph += f * fs / SR; if (ph >= 1) ph -= 1;
    const s = src === 'imp' ? (ph < f * fs / SR ? 1 : 0) : (ph * 2 - 1); lp += (s - lp) * (1 - smooth); const ex = lp + breath * (rnd() * 2 - 1);
    let y = 0; Fs.forEach((F, k) => { F.run(ex); y += F.bp * forms[k][2]; });
    const e = Math.min(1, x / att) * Math.min(1, Math.max(0, dur - x) / rel); buf[i] = y * e; mx = Math.max(mx, Math.abs(buf[i]));
  }
  emit(buf, t0, pan, send, gain / mx);
}

// ───────── instruments de l'épisode 2 ─────────
function pizz(t0, n, o = {}) {                           // corde pincée d'orchestre (violoncelle / alto) : Karplus-Strong court, claquement du doigt, un peu de caisse
  const { gain = 0.06, pan = 0, send = 0.3, t60 = 0.5, a = 0.58, bright = 1 } = o, f = hz(n), len = Math.floor(Math.min(1.8, t60 * 1.7 + 0.15) * SR), buf = ksString(f, len, { a, t60, pos: 0.14, exc: 0.85 });
  dull(buf, clamp(f * 9 * bright, 1200, 5200), clamp(f * 2.2, 260, 1300), 0.07); bodyRes(buf, 0.5);
  const sn = lpNoise(Math.floor(0.004 * SR), 0.1); for (let i = 0; i < sn.length; i++) buf[i] += sn[i] * 0.3 * (1 - i / sn.length);
  let e = 1e-12; for (let i = 0; i < 7200 && i < len; i++) e += buf[i] * buf[i]; const r0 = Math.sqrt(e / 7200), lim = 3.5 * r0;       // niveau normalisé (RMS des 150 premières ms, pointes écrêtées en douceur) : chaque note a le même niveau quel que soit le hasard de la pincée
  e = 1e-12; for (let i = 0; i < len; i++) { buf[i] = lim * Math.tanh(buf[i] / lim); if (i < 7200) e += buf[i] * buf[i]; }
  emit(buf, t0, pan, send, gain * 1.5 * 0.1 / Math.sqrt(e / 7200));
}
function boing(t0, f0, o = {}) {                         // ressort : sinus à vibrato de hauteur rapide qui s'amortit (« boi-oi-oing »), harmoniques creuses, ressort métallique (partiels légèrement désaccordés)
  const { gain = 0.06, dur = 0.75, pan = 0, send = 0.4, depth = 0.55, rate = 12.5, tau = 0.28 } = o;
  logOn(t0, 'boing', gain); const s0 = Math.floor(t0 * SR), len = Math.floor(dur * SR); let p1 = 0, p2 = 0;
  for (let i = 0; i < len; i++) {
    const x = i / SR, f = f0 * (1 + depth * Math.exp(-x / (tau * 0.8)) * Math.sin(TAU * rate * x * (1 + 0.5 * x)));
    p1 += TAU * f / SR; p2 += TAU * f * 2.01 / SR;
    const e = Math.min(1, x / 0.004) * Math.exp(-x / tau) * Math.min(1, (dur - x) / 0.05);
    put(s0 + i, gain * e * (Math.sin(p1) + 0.45 * Math.sin(p2) + 0.2 * Math.sin(1.5 * p1 + 0.5)), pan, send);
  }
}
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
function zing(t0, f, o = {}) {                           // petite note aiguë qui crépite : ping très bref (sinus + harmonique) et micro-étincelles de 1 à 3 ms
  const { gain = 0.04, pan = 0, send = 0.45, sparks = 4, dec = 0.05 } = o;
  tone(t0, dec * 5, { f0: f, gain, att: 0.0008, rel: 0.012, dec, harm: [1, 0.25], pan, send });
  for (let k = 0; k < sparks; k++) { const tk = t0 + 0.004 + k * (0.006 + 0.012 * rnd()); tone(tk, 0.012, { f0: Math.min(f * (1.2 + 1.8 * rnd()), 11000), gain: gain * (0.3 + 0.5 * rnd()), att: 0.0004, rel: 0.005, dec: 0.003, pan: clamp(pan + rr(-0.3, 0.3), -1, 1), send }); }
}
const semi = (n, st) => hz(n) * Math.pow(2, st / 12);    // note décalée de `st` demi-tons
const pent = (root, st) => i => semi(root, 12 * Math.floor(i / 5) + st[((i % 5) + 5) % 5]);       // gamme pentatonique : degré i (négatif accepté) → fréquence
const P_MIN = [0, 3, 5, 7, 10], P_MAJ = [0, 2, 4, 7, 9];

// ───────── ambiances : tampons temporaires normalisés en RMS ─────────
function layer(a, b, o, gen) {                           // gen() dessine dans le bus temporaire B (temps absolus) ; on règle le niveau RMS (dBFS avant mastering), fondus d'entrée / sortie, envoi de réverbération
  if (OPT.layer && o.name !== OPT.layer) return;
  const { fi = 1, fo = 1, rms = -34, send = 0.2, mul = null, dest = BUS.amb } = o, s0 = Math.max(0, Math.floor(a * SR)), s1 = Math.min(N, Math.floor(b * SR)), len = s1 - s0; if (len <= 8) return;
  const TB = mkBus(len, s0), prev = B; B = TB; gen(TB); B = prev;
  let e = 0; for (let i = 0; i < len; i++) e += (TB.L[i] * TB.L[i] + TB.R[i] * TB.R[i]) / 2;
  const r0 = Math.sqrt(e / len) || 1, k = dbv(rms) / r0;
  const d0 = s0 - dest.off; if (d0 < 0 || d0 + len > dest.n) return;
  for (let i = 0; i < len; i++) {
    const x = i / SR, env = sm(x / fi) * sm((len / SR - x) / fo) * (mul ? mul(a + x) : 1) * k, l = TB.L[i] * env, r = TB.R[i] * env;
    dest.L[d0 + i] += l; dest.R[d0 + i] += r; dest.SL[d0 + i] += l * send + TB.SL[i] * env; dest.SR[d0 + i] += r * send + TB.SR[i] * env;
  }
  dest.lo = Math.min(dest.lo, d0); dest.hi = Math.max(dest.hi, d0 + len - 1);
}
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
function genSparkle(o) {                                 // cristaux de neige : minuscules tintements aigus épars
  const { seed = 21, rate = 4, f = [3500, 9000] } = o;
  return b => { const rg = mkRnd(seed); let t = b.off / SR + rg() * 0.3; const t1 = (b.off + b.n) / SR; while (t < t1) { const fr = f[0] * Math.pow(f[1] / f[0], rg()), pan = rg() * 1.6 - 0.8, am = 0.3 + 0.7 * rg(); tone(t, 0.06, { f0: fr, gain: am, att: 0.0008, rel: 0.01, dec: 0.012, pan, send: 0.3 }); t += -Math.log(1 - rg()) / rate; } };
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
function genCicada(o) {                                  // cigale lointaine : bruit étroit vers 6 kHz haché à ~100 Hz, en vagues de 2 à 4 s
  const { seed = 5, f = 6200, bursts = [] } = o;
  return b => { for (const [t, d, g, pan] of bursts) { const rg = mkRnd(seed + Math.floor(t * 10)), F = new Filt().set(f, 7), s0 = Math.floor(t * SR), L = Math.floor(d * SR), r = 85 + 30 * rg(); for (let i = 0; i < L; i++) { const x = i / SR, u = i / L; F.run(rg() * 2 - 1); const pul = Math.pow(0.5 + 0.5 * Math.sin(TAU * r * x), 1.5), e = Math.pow(Math.sin(Math.PI * u), 1.4); put(s0 + i, g * F.bpn * pul * e * 0.35, pan, 0.4); } } };
}
function genStream(o) {                                  // cours d'eau : bruit filtré à modulation rapide + bulles qui montent en fréquence + gouttes (rivière : fa / fb plus graves, moins de bulles)
  const { seed = 31, bubbles = 60, drips = 0.35, fa = 2400, fb = 900, hiss = 0.1, bubF = 450, dripF = [1100, 2600] } = o;
  return b => {
    for (let c = 0; c < 2; c++) {
      const rg = mkRnd(seed + c * 5), w1 = wander(seed + c * 17, 17, 8 / SR), w2 = wander(seed + c * 17 + 3, 6, 8 / SR), w3 = wander(seed + c * 29, 0.4, 8 / SR), F1 = new Filt(), F2 = new Filt(), F3 = new Filt(), out = c ? b.R : b.L; let m1 = 1, m2 = 1;
      for (let i = 0; i < b.n; i++) {
        if ((i & 7) === 0) { m1 = clamp(0.65 + 0.5 * w1(), 0.1, 1.6); m2 = clamp(0.7 + 0.5 * w2(), 0.1, 1.5); F1.set(fa * (0.85 + 0.2 * w3()), 0.8); F2.set(fb * (0.9 + 0.15 * w3()), 0.9); F3.set(5200, 0.9); }
        const n = rg() * 2 - 1; F1.run(n); F2.run(n); F3.run(n); out[i] += F1.bpn * m1 * 0.7 + F2.bpn * m2 * 0.9 + F3.hp * hiss * m1;
      }
    }
    const rg = mkRnd(seed + 99), t1 = (b.off + b.n) / SR; let t = b.off / SR;
    while (t < t1) {                                     // bulles : sinus qui monte vite, amorti
      const f = bubF * Math.pow(5, rg()), d = 0.014 + 0.03 * rg(), a = 0.25 + 0.75 * rg() * rg(), pan = rg() * 1.8 - 0.9, s0 = Math.floor(t * SR), L = Math.floor(d * 4 * SR); let ph = 0;
      for (let i = 0; i < L; i++) { const x = i / SR, fr = f * (1 + 1.1 * (1 - Math.exp(-x / (d * 0.5)))); ph += TAU * fr / SR; put(s0 + i, a * 0.45 * Math.sin(ph) * Math.exp(-x / d) * Math.min(1, i / 12), pan, 0.25); }
      t += -Math.log(1 - rg()) / bubbles;
    }
    t = b.off / SR + rg() * 2; while (t < t1) { const f = dripF[0] + (dripF[1] - dripF[0]) * rg(), pan = rg() * 1.4 - 0.7; tone(t, 0.16, { f0: f, f1: f * 1.9, curve: 0.5, gain: 0.3 + 0.2 * rg(), att: 0.002, rel: 0.02, dec: 0.045, pan, send: 0.7 }); t += -Math.log(1 - rg()) / drips; }
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
function genFlies(o) {                                   // mouches : bourdonnement de vol (battement ≈ 150-240 Hz, harmoniques adoucis vers 1,5 kHz) qui passe, tourne, s'éloigne
  const { seed = 71, rate = 0.3 } = o;
  return b => {
    const rg = mkRnd(seed), t1 = (b.off + b.n) / SR; let t = b.off / SR + rg() * 2;
    while (t < t1) {
      const d = 0.9 + 2.4 * rg(), f0 = 150 + 95 * rg(), p0 = rg() * 2 - 1, p1 = rg() * 2 - 1, amp = 0.3 + 0.7 * rg(), nz = mkRnd(Math.floor(seed * 7919 + t * 100)), wob = wander(Math.floor(seed + t * 10), 3, 1 / SR), F = new Filt().set(900, 0.8);
      const s0 = Math.floor(t * SR), L = Math.floor(d * SR), tn = rg() * 0.5; let ph = 0;
      for (let i = 0; i < L; i++) {
        const x = i / SR, u = i / L, f = f0 * (1 + 0.07 * wob() + 0.015 * Math.sin(TAU * 11 * x)), near = 0.18 + 0.82 * Math.pow(Math.sin(Math.PI * clamp(u * (0.55 + tn))), 1.5);
        ph += TAU * f / SR; let v = 0; for (let h = 1; h <= 9; h++) v += Math.sin(h * ph + h * h * 0.05) / Math.pow(h, 0.7);
        F.run(v); put(s0 + i, 0.5 * amp * near * (F.lp * 0.6 + F.bp * 0.7) * Math.min(1, i / 480) * Math.min(1, (L - i) / 960), p0 + (p1 - p0) * u, 0.2);
      }
      t += -Math.log(1 - rg()) / rate;
    }
  };
}
function genTreeFrogs(o) {                               // rainettes : « tink-tink-tink » (sinus 1,7-3,4 kHz, 40 ms) en séries rapides, chacune sa hauteur, son rythme, sa place ; quelques coassements graves lointains
  const { n = 6, seed = 81, f = [2100, 3400], rate = [5, 9], series = [4, 10], gap = [1.2, 4.5], croakers = 2, mulAmp = null } = o;
  return b => {
    const rg = mkRnd(seed), t1 = (b.off + b.n) / SR, save = rnd;
    for (let k = 0; k < n; k++) {
      const fk = lerp(f[0], f[1], rg()), rk = lerp(rate[0], rate[1], rg()), pan = n > 1 ? (k / (n - 1) * 2 - 1) * 0.85 : 0, amp = 0.45 + 0.55 * rg(); let t = b.off / SR + rg() * 3;
      while (t < t1) {
        const m = Math.round(lerp(series[0], series[1], rg())), ga = amp * (0.7 + 0.3 * rg()) * (mulAmp ? mulAmp(t) : 1);
        for (let j = 0; j < m; j++) { const tj = t + j / rk * (0.96 + 0.08 * rg()), fj = fk * (1 + 0.012 * (rg() - 0.5)); tone(tj, 0.045, { f0: fj * 0.95, f1: fj * 1.06, gain: ga * (j < 2 ? 0.55 : 1) * (0.85 + 0.15 * rg()), att: 0.004, rel: 0.014, dec: 0.017, harm: [1, 0.3], pan, send: 0.3 }); }
        t += m / rk + lerp(gap[0], gap[1], rg());
      }
    }
    rnd = mkRnd(seed + 5);
    for (let k = 0; k < croakers; k++) {
      let t = b.off / SR + rg() * 4; const pan = rg() * 1.6 - 0.8, sc = 0.85 + 0.3 * rg();
      while (t < t1) { const ga = (mulAmp ? mulAmp(t) : 1); croak(t, 0.1, 55 * sc, 68 * sc, 360 * sc, 1200 * sc, 0.28 * ga); croak(t + 0.16, 0.14, 62 * sc, 85 * sc, 430 * sc, 1500 * sc, 0.3 * ga); t += lerp(2.5, 7, rg()); }
    }
    rnd = save;
  };
}
function genDrops(o) {                                   // gouttes qui tombent des grandes feuilles : « plip » qui monte vite, parfois une grosse goutte plus grave
  const { seed = 91, rate = 0.8, f = [900, 2200], mulAmp = null } = o;
  return b => { const rg = mkRnd(seed), t1 = (b.off + b.n) / SR; let t = b.off / SR + rg(); while (t < t1) { const big = rg() < 0.2, fr = lerp(f[0], f[1], rg()) * (big ? 0.55 : 1), pan = rg() * 1.6 - 0.8; tone(t, 0.2, { f0: fr * 0.9, f1: fr * 1.9, curve: 0.45, gain: (big ? 0.5 : 0.25) * (0.4 + 0.6 * rg()) * (mulAmp ? mulAmp(t) : 1), att: 0.002, rel: 0.02, dec: big ? 0.07 : 0.04, harm: [1, 0.15], pan, send: 0.7 }); t += -Math.log(1 - rg()) / rate; } };
}
function genUWHum(o) {                                   // sous l'eau : bourdonnement sourd et étouffé (bruit passe-bas ≈ 230 Hz, résonance ≈ 95 Hz) + ronflements à 58, 87 et 131 Hz qui battent lentement
  const { seed = 101 } = o;
  return b => {
    for (let c = 0; c < 2; c++) {
      const rg = mkRnd(seed + c * 3), w = wander(seed + c, 0.12, 16 / SR), w2 = wander(seed + 7 + c, 0.35, 16 / SR), F = new Filt(), G = new Filt(), out = c ? b.R : b.L; let p1 = 0, p2 = 0, p3 = 0, a = 1;
      for (let i = 0; i < b.n; i++) {
        if ((i & 15) === 0) { F.set(230 * (1 + 0.3 * w()), 0.7); G.set(95 * (1 + 0.1 * w2()), 1.6); a = 0.75 + 0.25 * w2(); }
        const n = rg() * 2 - 1; F.run(n); G.run(n); p1 += TAU * (58 + 0.4 * c) / SR; p2 += TAU * (87 + 0.5 * c) / SR; p3 += TAU * (131 - 0.6 * c) / SR;
        out[i] += (F.lp * 1.4 + G.bpn * 0.5) * a + 0.12 * Math.sin(p1) + 0.09 * Math.sin(p2 + 1) * (0.6 + 0.4 * w()) + 0.06 * Math.sin(p3 + 2) * (0.6 + 0.4 * w2());
      }
    }
  };
}
function genUWBubbles(o) {                               // sous l'eau : bulles étouffées (graves, lentes), en petites grappes qui montent
  const { seed = 111, rate = 0.9 } = o;
  return b => {
    const rg = mkRnd(seed), t1 = (b.off + b.n) / SR; let t = b.off / SR + rg();
    while (t < t1) {
      const m = 2 + Math.floor(rg() * 7), pan = rg() * 1.6 - 0.8; let tb = t, f = 240 + 500 * rg();
      for (let j = 0; j < m; j++) { const d = 0.03 + 0.07 * rg(), s0 = Math.floor(tb * SR), L = Math.floor(d * 4 * SR), a = 0.3 + 0.7 * rg(); let ph = 0; for (let i = 0; i < L; i++) { const x = i / SR, fr = f * (1 + 0.9 * (1 - Math.exp(-x / (d * 0.6)))); ph += TAU * fr / SR; put(s0 + i, a * 0.4 * Math.sin(ph) * Math.exp(-x / d) * Math.min(1, i / 16), pan + 0.1 * Math.sin(j), 0.6); } tb += 0.05 + 0.16 * rg(); f *= 1.04 + 0.1 * rg(); }
      t += -Math.log(1 - rg()) / rate;
    }
  };
}
function genFarCrackle(o) {                              // sous l'eau : petits craquements électriques lointains (grappes de micro-claquements 1,2-3,2 kHz, très réverbérés, et un « zzt » sourd)
  const { seed = 121, rate = 0.5, mulAmp = null } = o;
  return b => {
    const rg = mkRnd(seed), t1 = (b.off + b.n) / SR, save = rnd; rnd = rg; let t = b.off / SR + rg() * 2;
    while (t < t1) {
      const ga = mulAmp ? mulAmp(t) : 1, m = 4 + Math.floor(rg() * 11), span = 0.12 + 0.4 * rg(), pan = rg() * 1.8 - 0.9;
      for (let j = 0; j < m; j++) { const tj = t + span * Math.pow(rg(), 1.4); tone(tj, 0.012, { f0: 800 + 1500 * rg(), gain: ga * (0.25 + 0.75 * rg()), att: 0.0006, rel: 0.004, dec: 0.002, pan: clamp(pan + rr(-0.2, 0.2), -1, 1), send: 0.8 }); }
      nzb(t, span + 0.04, { f0: 700, f1: 1100, q: 1.2, gain: 0.05 * ga, att: 0.01, rel: 0.05, am: 0.9, arate: 38, pan, send: 0.7 });
      t += -Math.log(1 - rg()) / rate;
    }
    rnd = save;
  };
}
function genHoots(o) { const { seed = 51, times = [], gain = 0.05, f = 1 } = o; return b => { const save = rnd; rnd = mkRnd(seed); for (const [t, pan] of times) BIRD.owl(t, f, { gain, pan, send: 0.9 }); rnd = save; }; }

// ───────── musique ─────────
const grid = (a, b, nominal) => { const n = Math.max(1, Math.round((b - a) / nominal)), d = (b - a) / n; return { n, d, t: k => a + k * d }; };      // pas élastiques : un nombre entier de temps entre deux repères de la voix
const firstEv = (types, a, b) => { for (const ty of types) { const e = evIn(ty, a, b); if (e) return e.t; } return null; };
const lastEv = (types, a, b) => { let r = null; for (const e of EVENTS) if (types.includes(e.type) && e.t >= a && e.t < b) r = e.t; return r; };
const beatsOf = (a, b, bpm) => { const r = []; let t = a; while (t < b - 1e-6) { r.push(t); t += 60 / (typeof bpm === 'function' ? bpm(t) : bpm); } return r; };
const T_LOGO = at('logo');                               // seul événement obligatoire : le son de marque
const rise = (u, k = 1.6) => Math.pow(clamp(u), k);

function musIntro() {                                    // INTRO : curieuse, cinématographique (« comme dans un film ») : cordes pincées et verre, une petite montée ; ré dorien
  rnd = mkRnd(101); B = BUS.music; const [, s1] = SEG.intro, F = lastW('i1'), w = (x, k) => wt('i1', x, k), tTell = w('tellement'), tRise = F.t0 - 0.2;
  pad(0, s1 + 0.2, ['D2', 'A2', 'C3', 'F3', 'A3'], { gain: 0.04, att: 1.6, rel: 1.3, bright: 0.12, trem: 0.1 });
  glass(0.12, 'A5', { gain: 0.05, pan: -0.3 }); glass(w('trois'), 'D6', { gain: 0.045, pan: 0.3 }); glass(w('animaux'), 'F6', { gain: 0.04, pan: -0.15 });
  pizz(0.3, 'D3', { gain: 0.1, t60: 0.8 }); pizz(w('possèdent'), 'A2', { gain: 0.1, t60: 0.8 });
  { const fig = ['D4', null, 'F4', 'A4', null, 'G4', 'E4', null, 'F4', 'A4', 'C5', null], g = grid(w('Voici') + 0.3, tTell - 0.05, 0.36);        // figure curieuse, avec des silences
    for (let k = 0; k < g.n; k++) if (fig[k % fig.length]) pizz(g.t(k), fig[k % fig.length], { gain: 0.05 + 0.012 * k / g.n, pan: 0.45 * Math.sin(k * 1.9), t60: 0.35 }); }
  { const up = ['D5', 'F5', 'A5', 'C6', 'D6', 'F6', 'A6', 'C7'];                                        // la petite montée, de « tellement » à « d'un » : harpe puis verre
    up.forEach((n, k) => { const t = tTell + (tRise - tTell) * k / (up.length - 1), g = 0.032 + 0.028 * k / (up.length - 1); if (k < 4) harp(t, n, { gain: g * 1.1, pan: -0.4 + 0.2 * k, t60: 1.6 }); else glass(t, n, { gain: g, pan: -0.5 + 0.15 * k, tau: 2.2 }); });
    tone(tTell, tRise - tTell + 0.1, { f0: 220, f1: 1760, curve: 1.8, gain: 0.014, att: (tRise - tTell) * 0.6, rel: 0.12, harm: [1, 0.2, 0.05], am: 0.4, arate: 5, send: 0.5 });
    nzb(tTell, tRise - tTell + 0.05, { type: 'hp', f0: 3000, f1: 8000, gain: 0.008, att: (tRise - tTell) * 0.7, rel: 0.1, send: 0.5 }); }
  const t = F.t1 + 0.07;                                 // après « film ! » : le titre
  glass(t, 'D6', { gain: 0.06, tau: 3 }); glass(t + 0.03, 'A5', { gain: 0.045, tau: 3, pan: -0.2 }); harp(t + 0.05, 'D4', { gain: 0.05 });
}

function musSca() {                                      // SCARABÉE : sous-bois doré ; pizzicato malicieux et marimba (mi mineur pentatonique) ; la tension monte au mélange, claquement sec, soulagement comique (sol majeur)
  rnd = mkRnd(202); B = BUS.music; const [s0, s1] = SEG.sca, b1 = ph('b1'), b2 = ph('b2'), b3 = ph('b3'), b4 = ph('b4'), L1 = lastW('b1'), L2 = lastW('b2'), L3 = lastW('b3'), L4 = lastW('b4');
  const w1 = (x, k) => wt('b1', x, k), w2 = (x, k) => wt('b2', x, k), w3 = (x, k) => wt('b3', x, k), w4 = (x, k) => wt('b4', x, k), Ep = pent('E4', P_MIN);         // E4 G4 A4 B4 D5 | E5 G5 A5 B5 D6
  const tip = (t, g = 1, pan = 0) => [[0, 0], [0.15, 1], [0.30, 3], [0.52, 1], [0.67, 5]].forEach(([d, i]) => marimba(t + d, Ep(i), { gain: 0.046 * g, tau: 0.22, pan: pan + 0.1 * i }));      // le thème malicieux (sur la pointe des pieds)
  // b1 : « Tu savais qu'un petit scarabée pouvait projeter du liquide à 100 degrés ? » : sparse, puis le thermomètre monte
  pad(s0 - 0.1, L1.t0 - s0 - 0.15, ['E2', 'B2', 'D3', 'G3'], { gain: 0.036, att: 0.9, rel: 0.6, bright: 0.12 });
  pizz(b1.t0 + 0.02, 'E2', { gain: 0.1, t60: 0.7 }); pizz(w1('pouvait'), 'B2', { gain: 0.09, t60: 0.6 }); pizz(w1('projeter'), 'E2', { gain: 0.08, t60: 0.6 });
  tip(w1('petit'), 1, -0.3);
  { const tLiq = w1('liquide'), t100 = w1(['100', 'cent']); for (let k = 0; k < 6; k++) marimba(tLiq + (t100 - 0.05 - tLiq) * k / 5, Ep(k), { gain: 0.036 + 0.008 * k, tau: 0.3, pan: -0.2 + 0.08 * k }); glass(t100 + 0.02, 'E6', { gain: 0.04, tau: 2.2, pan: 0.2 }); }
  marimba(L1.t1 + 0.08, 'B4', { gain: 0.04, tau: 0.3 }); marimba(L1.t1 + 0.2, 'E5', { gain: 0.045, tau: 0.5, pan: 0.2 });
  // b2 : « C'est le cas du scarabée bombardier ! » : le scarabée se redresse fièrement ; le mot final reste libre
  pizz(b2.t0, 'E3', { gain: 0.1, t60: 0.6 }); marimba(w2('cas'), Ep(1), { gain: 0.05, tau: 0.3, pan: -0.2 });
  [0, 2, 3, 5].forEach((i, k) => marimba(w2('scarabée') + 0.1 * k, Ep(i + 3), { gain: 0.046, tau: 0.3, pan: 0.1 * k }));
  pizz(L2.t1 + 0.07, 'E2', { gain: 0.14, t60: 0.9 }); marimba(L2.t1 + 0.07, 'E3', { gain: 0.06, tau: 0.5 });        // « bom ! »
  // b3 : le prédateur s'approche (pas lourds, demi-ton qui gronde), puis le mélange : deux lignes qui se rejoignent, roulement qui accélère, silence sur « explosion », claquement sec
  const tPred = w3('prédateur'), tMel = w3('mélange'), tAbd = w3('abdomen'), tExp = L3.t0, tEnd = tExp - 0.14;
  pad(b3.t0 - 0.05, tMel - b3.t0 + 0.1, ['E2', 'F2', 'B2', 'C#3'], { gain: 0.032, att: 0.5, rel: 0.4, bright: 0.05 });
  { const g = grid(b3.t0 + 0.05, tMel - 0.1, 0.5); for (let k = 0; k < g.n; k++) { bassPluck(g.t(k), k % 2 ? 'F2' : 'E2', { gain: 0.11, t60: 0.7 }); if (k) wood(g.t(k) - g.d / 2, 0.22, 900, 0.3); } }
  { const n = 6, dt = (tAbd - tMel) / (n - 1); for (let k = 0; k < n; k++) { marimba(tMel + k * dt, Ep(k), { gain: 0.04 + 0.005 * k, tau: 0.3, pan: -0.55 }); if (k < n - 1) marimba(tMel + (k + 0.5) * dt, Ep(10 - k), { gain: 0.04 + 0.005 * k, tau: 0.3, pan: 0.55 }); } }
  pad(tMel, tEnd - tMel + 0.05, ['E2', 'B2', 'F3', 'Bb3'], { gain: 0.034, att: (tEnd - tMel) * 0.85, rel: 0.12, bright: 0.1 });
  { const a = tAbd + 0.05; let t = a, k = 0; while (t < tEnd) { const u = (t - a) / (tEnd - a); marimba(t, Ep(5 + Math.min(5, Math.floor(u * 6))), { gain: 0.03 + 0.04 * u, tau: 0.16, pan: 0.3 * Math.sin(k * 2.1) }); t += 1 / lerp(6, 22, rise(u, 1.4)); k++; } }
  tone(tAbd, tEnd - tAbd, { f0: 330, f1: 1320, curve: 1.6, gain: 0.022, att: (tEnd - tAbd) * 0.8, rel: 0.06, harm: [1, 0.3], am: 0.5, arate: 11, send: 0.4 });
  nzb(tAbd, tEnd - tAbd, { f0: 500, f1: 3500, q: 1.1, gain: 0.035, att: (tEnd - tAbd) * 0.8, rel: 0.06, curve: 1.6, send: 0.4 });
  { let t = tAbd; while (t < tEnd - 0.1) { const u = (t - tAbd) / (tEnd - tAbd); dLow(t, 0.45 + 0.35 * u); t += lerp(0.55, 0.22, u); } }
  { const tb = lastEv(['bang'], b3.t0, b4.t0), tS = clearT(tb ?? tExp, 0.8), tSnap = Math.max(tS, tEnd + 0.02);       // « claquement sec » sur la réaction (reporté après « explosion » si le bang tombe sur le mot)
    wood(tSnap, 1.1, 1700, 0); tone(tSnap, 0.06, { f0: 2700, f1: 1700, gain: 0.07, att: 0.0005, rel: 0.02, dec: 0.014, harm: [1, 0.5] }); nzb(tSnap, 0.03, { type: 'hp', f0: 3000, gain: 0.12, att: 0.0004, rel: 0.02, send: 0.15 }); dHi(tSnap, 0.9); }
  // b4 : le jet (crépitement de marimba qui monte d'un cran à chaque mot-clé), puis la reculade du prédateur (pizzicati qui descendent en ralentissant) : soulagement comique, sol majeur
  const tPro = w4('projette'), tJet = w4('jet'), tBr = w4('brûlant'), tPour = w4('pour'), tFuir = w4('fuir');
  pad(b4.t0 + 0.1, tPour - b4.t0 + 0.2, ['E2', 'B2', 'E3', 'G3'], { gain: 0.034, att: 0.8, rel: 0.5, bright: 0.15 });
  { let t = tPro, k = 0; while (t < tPour - 0.05) { const u = (t - tPro) / (tPour - tPro); marimba(t, Ep(t < tJet ? 5 : t < tBr ? 6 : 8), { gain: 0.03 + 0.03 * u, tau: 0.14, pan: 0.35 * Math.sin(k * 1.7) }); t += 1 / 13; k++; } }
  { const g = grid(tPro, tPour, 0.09); for (let k = 0; k < g.n; k++) shaker(g.t(k), { gain: 0.012 + 0.02 * k / g.n, pan: 0.4 * Math.sin(k) }); }
  dLow(tJet, 0.75); dMid(tBr, 0.5);
  { const down = ['B3', 'A3', 'G3', 'F#3', 'E3', 'D3'], lim = L4.t0 - 0.1; let t = tPour + 0.03; down.forEach((n, k) => { if (t < lim) pizz(t, n, { gain: 0.085, t60: 0.4, pan: 0.2 - 0.07 * k }); t += 0.09 + 0.02 * k * k * 0.5; }); if (tFuir + 0.12 < lim) wood(tFuir + 0.12, 0.4, 700, -0.2); }
  { const t = L4.t1 + 0.07;                              // l'ennemi est parti : sol majeur, le scarabée repart tranquillement
    pad(t - 0.04, Math.max(0.3, s1 - t + 0.5), ['G2', 'D3', 'G3', 'B3', 'D4'], { gain: 0.04, att: 0.15, rel: 0.8, bright: 0.25 });
    [['G4', 0], ['D5', 0.1], ['G5', 0.2], ['B5', 0.3]].forEach(([n, d], k) => marimba(t + d, n, { gain: 0.045, tau: 0.5, pan: -0.2 + 0.15 * k })); pizz(t, 'G2', { gain: 0.1, t60: 0.9 }); glass(t + 0.05, 'D6', { gain: 0.035, tau: 2 }); }
}

function musBas() {                                      // BASILIC : jungle ; tambours doux, kalimba rapide qui accompagne la course, flûte légère ; accélération sur l'eau, soulagement sur l'autre rive (la majeur pentatonique)
  rnd = mkRnd(303); B = BUS.music; const [s0, s1] = SEG.bas, c1 = ph('c1'), c2 = ph('c2'), c3 = ph('c3'), L1 = lastW('c1'), L2 = lastW('c2'), L3 = lastW('c3');
  const w1 = (x, k) => wt('c1', x, k), w2 = (x, k) => wt('c2', x, k), w3 = (x, k) => wt('c3', x, k), Ap = pent('A3', P_MAJ);          // A3 B3 C#4 E4 F#4 | A4 B4 C#5 E5 F#5 | A5 B5 C#6
  const cell = [5, 7, 8, 7, 5, 6, 7, 8, 10, 8, 7, 5, 6, 7, 5, 3];                                    // 16 doubles croches (A4 C#5 E5 C#5 | A4 B4 C#5 E5 | A5 E5 C#5 A4 | B4 C#5 A4 E4)
  const kal16 = (t, k, g, oct = 0, pan = 0) => { const i = cell[k % 16]; kalimba(t, oct ? semi(Ap(i), 12) : Ap(i), { gain: g * (k % 4 === 0 ? 1.25 : k % 2 ? 0.75 : 1), decay: 0.65, pan: pan + 0.3 * Math.sin(k * 0.9), send: 0.3, bright: 0.7 }); };
  // c1 : la rivière en forêt, puis « il peut courir sur l'eau » : le tempo s'emballe ; silence sur « l'eau »
  const tPeut = w1('peut'), lim1 = L1.t0 - 0.1;
  pad(s0 - 0.1, tPeut - s0 + 0.3, ['A2', 'E3', 'A3', 'C#4', 'E4'], { gain: 0.036, att: 0.8, rel: 0.5, bright: 0.2 });
  beatsOf(s0 + 0.1, tPeut - 0.1, 94).forEach((t, k) => { if (k % 2 === 0) dLow(t, k % 4 === 0 ? 0.55 : 0.4); else dMid(t, 0.28, { f: 210 }); shaker(t + 30 / 94, { gain: 0.012, pan: -0.3 + 0.6 * (k % 2) }); });
  flute(w1('Amérique'), 0.55, 'E5', { gain: 0.04 }); flute(w1('centrale'), 0.75, 'F#5', { gain: 0.04 });
  [['lézard', 5], ['possède', 7], ['capacité', 8], ['folle', 10]].forEach(([wd, i], k) => kalimba(w1(wd), Ap(i), { gain: 0.05, decay: 1.1, pan: -0.3 + 0.2 * k }));
  { const a = tPeut - 0.05, b = L1.t0 - 0.12, bpm = t => lerp(100, 152, sm((t - a) / (b - a))); let k = 0; for (const t of beatsOf(a, b, bpm)) { const u = (t - a) / (b - a); dLow(t, 0.5 + 0.3 * u); for (let j = 0; j < 4; j++) { const tt = t + j * 60 / bpm(t) / 4; if (tt > lim1 || (u < 0.5 && j % 2)) continue; kal16(tt, k * 4 + j, 0.036 + 0.02 * u); } if (u > 0.4) dHi(t + 30 / bpm(t), 0.35 + 0.3 * u); k++; } }
  // c2 : la course, 128 bpm ; « Jésus-Christ » : un instant de grâce (verre, la course se retient) ; elle s'arrête avant « rivières » ; petit roulement ensuite
  const tJes = w2('Jésus-Christ'), tRiv = L2.t0, limC = tRiv - 0.12, hold = t => t > tJes - 0.04 && t < tJes + 0.55;
  pad(c2.t0 - 0.05, tRiv - c2.t0 - 0.05, ['A2', 'E3', 'A3', 'B3', 'E4'], { gain: 0.034, att: 0.4, rel: 0.5, bright: 0.2 });
  { let k = 0; for (const t of beatsOf(c2.t0 - 0.02, limC, 128)) { const bt = 60 / 128; if (!hold(t)) { if (k % 4 === 0 || k % 4 === 2) dLow(t, k % 4 === 0 ? 0.6 : 0.45); else dMid(t, 0.38, { f: 215 + 18 * (k % 8 === 1) }); if (t + bt / 2 <= limC) shaker(t + bt / 2, { gain: 0.016, pan: -0.3 + 0.6 * (k % 2) }); } for (let j = 0; j < 4; j++) { const tt = t + j * bt / 4; if (tt > limC || hold(tt)) continue; kal16(tt, k * 4 + j, 0.04, 0); } k++; } }
  [['E6', 0], ['A6', 0.09], ['C#7', 0.18], ['E7', 0.27]].forEach(([n, d], k) => glass(tJes + d, n, { gain: 0.03, tau: 1.8, pan: -0.3 + 0.2 * k })); flute(tJes + 0.05, 0.5, 'A5', { gain: 0.036 });
  { const t = L2.t1 + 0.07; dMid(t, 0.5, { f: 230 }); dMid(t + 0.12, 0.5, { f: 260 }); dLow(t + 0.24, 0.7); }
  // c3 : l'ombre du rapace (danger, la mineure), puis la fuite à 150 bpm vers l'autre rive ; le mot final reste libre, soulagement ensuite
  const tEch = w3('échapper'), lim3 = L3.t0 - 0.1;
  pad(c3.t0 - 0.02, tEch - c3.t0 + 0.2, ['A2', 'E3', 'A3', 'C4'], { gain: 0.036, att: 0.15, rel: 0.3, bright: 0.1 });
  dLow(c3.t0 + 0.02, 0.55); dLow(w3('ça'), 0.5); flute(w3('tout'), 0.45, 'C5', { gain: 0.032, vib: 0.012 });
  { let k = 0; for (const t of beatsOf(tEch - 0.04, lim3, 150)) { const u = clamp((t - tEch) / (lim3 - tEch)); dLow(t, 0.6); dMid(t + 60 / 300, 0.36, { f: 230 }); for (let j = 0; j < 4; j++) { const tt = t + j * 60 / 150 / 4; if (tt > lim3) continue; kal16(tt, k * 4 + j, 0.036 + 0.014 * u, 1); } k++; } }
  { const t = L3.t1 + 0.07;                              // l'autre rive : ouf
    ['E6', 'C#6', 'A5', 'E5', 'C#5', 'A4'].forEach((n, k) => kalimba(t + 0.04 + 0.13 * k, n, { gain: 0.05 - 0.005 * k, decay: 1.2, pan: 0.25 - 0.08 * k })); glass(t, 'A5', { gain: 0.04, tau: 2.4 }); glass(t + 0.04, 'C#6', { gain: 0.03, tau: 2.4, pan: 0.2 }); glass(t + 0.08, 'E6', { gain: 0.03, tau: 2.4, pan: -0.2 });
    flute(t + 0.1, 0.5, 'A5', { gain: 0.036 }); dLow(t, 0.4); pad(t - 0.04, Math.max(0.2, s1 - t), ['A2', 'E3', 'A3', 'C#4'], { gain: 0.034, att: 0.2, rel: 0.5, bright: 0.2 }); }
}

function musAng() {                                      // ANGUILLE : mystérieuse, grave et électrique ; nappe grave, ronflement, verre, petites notes aiguës qui crépitent ; montée avec les volts, ressort sur la prise, coup final sur la décharge (sol mineur)
  rnd = mkRnd(404); B = BUS.music; const [s0, s1] = SEG.ang, e1 = ph('e1'), e2 = ph('e2'), e3 = ph('e3'), L1 = lastW('e1'), L2 = lastW('e2'), L3 = lastW('e3');
  const w1 = (x, k) => wt('e1', x, k), w2 = (x, k) => wt('e2', x, k), w3 = (x, k) => wt('e3', x, k), Gp = pent('G2', P_MIN);          // G2 Bb2 C3 D3 F3 | G3 Bb3 C4 D4 F4 | G4 ... | G5 Bb5 C6 D6 F6 | G6 Bb6 C7 D7 F7
  // e1 : nappe grave, gouttes de verre, premières étincelles à « électrique », puis la montée jusqu'à « 860 » ; silence sur « volts », cascade ensuite
  const tAma = w1('Amazonie'), tAng = w1("d'anguille"), tEle = w1('électrique'), tPeut = w1('peut'), t860 = w1(['860', 'huit']), tVol = L1.t0, tTop = tVol - 0.12;
  pad(s0 - 0.1, L2.t1 - s0 + 0.2, ['G2', 'D3', 'G3', 'Bb3', 'D4'], { gain: 0.036, att: 1.4, rel: 0.9, bright: 0.18, trem: 0.14 });
  hum(s0, e1.t1 - s0 - 0.2, 'G2', { gain: 0.03, att: 1.2, rel: 0.9 });
  glass(tAma, 'D6', { gain: 0.045, tau: 3.2, pan: -0.3 }); glass(w1('espèce'), 'G5', { gain: 0.035, tau: 3, pan: 0.3 }); glass(tAng, 'Bb5', { gain: 0.04, tau: 3, pan: 0 });
  pizz(tAng, 'G2', { gain: 0.11, t60: 1.0 }); pizz(tEle, 'D2', { gain: 0.1, t60: 1.0 });
  { let t = tEle, k = 0; while (t < tTop) { const u = clamp((t - tEle) / (tTop - tEle)); zing(t, Gp(15 + Math.min(7, Math.floor(u * 8))), { gain: 0.022 + 0.03 * u, pan: Math.sin(k * 2.3) * 0.7, sparks: 2 + Math.round(4 * u) }); t += lerp(0.5, 0.085, rise(u, 0.9)); k++; } }
  tone(tPeut, tTop - tPeut, { f0: 98, f1: 880, curve: 1.8, gain: 0.02, att: (tTop - tPeut) * 0.85, rel: 0.06, harm: [1, 0.4, 0.2], am: 0.45, arate: 9, send: 0.4 });
  nzb(tPeut, tTop - tPeut, { type: 'hp', f0: 2500, f1: 9000, gain: 0.012, att: (tTop - tPeut) * 0.85, rel: 0.05, am: 0.7, arate: 30, send: 0.4 });
  { let t = w1('produire'); while (t < tTop - 0.1) { const u = clamp((t - tPeut) / (tTop - tPeut)); dLow(t, 0.4 + 0.4 * u); t += lerp(0.6, 0.2, u); } }
  { const t = L1.t1 + 0.07;                              // la décharge est annoncée : cascade qui retombe
    [24, 22, 21, 20, 18, 16].forEach((i, k) => zing(t + 0.07 * k, Gp(i), { gain: 0.04 - 0.004 * k, pan: 0.6 - 0.2 * k, sparks: 3 })); glass(t, 'G6', { gain: 0.04, tau: 2, pan: 0.2 }); pizz(t, 'G2', { gain: 0.1, t60: 1.2 }); }
  // e2 : « presque quatre fois la tension d'une prise » : le ressort (la barre bondit), un second rebond sur « prise » ; mot final libre
  const tQua = w2('quatre'), tPri = w2('prise');
  { const g = grid(e2.t0, L2.t0 - 0.12, 0.5); for (let k = 0; k < g.n; k++) pizz(g.t(k), k % 2 ? 'D3' : 'G2', { gain: 0.085, t60: 0.5, pan: -0.15 }); }
  boing(tQua, NOTE('G4'), { gain: 0.05, dur: 0.8 }); boing(tPri + 0.02, NOTE('D5'), { gain: 0.036, dur: 0.55, depth: 0.45 }); zing(tPri + 0.45, Gp(21), { gain: 0.03, pan: 0.3 });
  glass(w2('presque'), 'D6', { gain: 0.03, tau: 2.2, pan: -0.3 });
  zing(L2.t1 + 0.07, Gp(23), { gain: 0.03, pan: -0.4 });
  // e3 : « paralyser » : tout se fige (un seul fil de verre) ; « proies » : étincelles clairsemées ; « et se » : la menace monte ; silence sur « défendre » ; coup final sur la décharge
  const tPar = w3('paralyser'), tPro = w3('proies'), tEt = w3('et'), tDef = L3.t0, tTop3 = tDef - 0.12;
  pad(e3.t0 - 0.05, tPar - e3.t0 + 0.1, ['G2', 'D3', 'Bb3', 'Db4'], { gain: 0.034, att: 0.4, rel: 0.3, bright: 0.1 });
  { const g = grid(e3.t0, tPar - 0.05, 0.55); for (let k = 0; k < g.n; k++) bassPluck(g.t(k), k % 2 ? 'D2' : 'G2', { gain: 0.1, t60: 0.8 }); }
  zing(tPar, Gp(22), { gain: 0.05, sparks: 6 }); zing(tPar + 0.06, Gp(24), { gain: 0.035, sparks: 4, pan: 0.5 }); glass(tPar + 0.1, 'D7', { gain: 0.03, tau: 3.5, pan: -0.3 });
  [[tPro + 0.1, 20], [tPro + 0.38, 23], [tPro + 0.7, 21]].forEach(([t, i], k) => { if (t < tEt - 0.05) zing(t, Gp(i), { gain: 0.022, pan: 0.5 - 0.5 * k, sparks: 3 }); });
  hum(tPar + 0.1, tTop3 - tPar, 'G2', { gain: 0.03, att: 0.4, rel: 0.2 });
  tone(tEt, tTop3 - tEt, { f0: 98, f1: 392, curve: 1.6, gain: 0.025, att: (tTop3 - tEt) * 0.8, rel: 0.05, harm: [1, 0.5, 0.25], am: 0.5, arate: 8, send: 0.4 });
  nzb(tEt, tTop3 - tEt, { f0: 300, f1: 3000, q: 1, gain: 0.04, att: (tTop3 - tEt) * 0.85, rel: 0.05, curve: 1.5, send: 0.4 });
  { let t = tEt; while (t < tTop3 - 0.1) { const u = clamp((t - tEt) / (tTop3 - tEt)); dLow(t, 0.5 + 0.35 * u); t += lerp(0.38, 0.17, u); } }
  { const tz = lastEv(['zap'], e3.t0, SEG.ang[1]), t = Math.max(clearT(tz ?? tDef, 0.8), tTop3 + 0.1);      // le coup final (reporté juste après « défendre » s'il tombe sur le mot)
    thud(t, 0.5); dLow(t, 1); tone(t, 0.5, { f0: 98, f1: 49, curve: 0.5, gain: 0.12, att: 0.003, rel: 0.1, dec: 0.18, harm: [1, 0.5, 0.25], send: 0.25 });
    [['G6', 0, -0.3], ['Bb6', 0.03, 0.3], ['D7', 0.06, 0]].forEach(([n, d, p]) => glass(t + d, n, { gain: 0.045, tau: 1.3, pan: p })); [24, 23, 22, 20, 18, 16, 15].forEach((i, k) => zing(t + 0.05 * k, Gp(i), { gain: 0.045 - 0.004 * k, pan: -0.6 + 0.2 * k, sparks: 4 }));
    pad(t - 0.02, Math.max(0.2, s1 - t), ['G2', 'D3', 'G3', 'Bb3'], { gain: 0.04, att: 0.05, rel: 0.7, bright: 0.2 }); }
}

function musFin() {                                      // QUESTION FINALE : légère, curieuse, suspendue (sur la dominante de ré) ; la marque résout en ré majeur
  rnd = mkRnd(505); B = BUS.music; const [s0, s1] = SEG.fin, F = lastW('fin'), w = (x, k) => wt('fin', x, k), tSup = w('super-pouvoir');
  pad(s0 - 0.1, T_LOGO - s0 - 0.5, ['A2', 'E3', 'B3', 'E4'], { gain: 0.05, att: 0.7, rel: 0.35, bright: 0.2 });
  [['Alors', 'E5', -0.3], ['lequel', 'A5', 0.3], ['trois', 'B5', -0.2], ['animaux', 'E5', 0.2]].forEach(([wd, n, p]) => kalimba(w(wd), n, { gain: 0.05, pan: p, decay: 1.3 }));
  kalimba(w('plus'), 'A4', { gain: 0.045 }); kalimba(tSup, 'A5', { gain: 0.055, decay: 1.6 }); kalimba(tSup + 0.22, 'B5', { gain: 0.06, decay: 2.2 });
  glass(w('possède'), 'E6', { gain: 0.03, tau: 3, pan: 0.2 });
  const t = F.t1 + 0.07;                                 // après « impressionnant ? » : la question reste en l'air (le si)
  glass(t, 'B6', { gain: 0.04, tau: 3.2, pan: 0.2 }); flute(t + 0.05, Math.max(0.6, T_LOGO - t - 0.6), 'E5', { gain: 0.035, send: 0.7 }); glass(Math.min(s1 - 0.8, t + 1.0), 'A6', { gain: 0.03, tau: 2.5, pan: -0.2 });
}
function musSortie() {                                   // SORTIE : l'accord de ré de la marque (comme la vidéo 2) qui résout la suspension
  rnd = mkRnd(606); B = BUS.music;
  pad(T_LOGO - 0.04, DUR - 1.0 - T_LOGO + 0.04, ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], { gain: 0.07, att: 0.25, rel: 1.2, bright: 0.45 });
}

// ───────── ambiances de la vidéo : sections et sous-sections ─────────
function cicadaBursts(a, b, seed, g0 = 1) {              // vagues de cigales qui se chevauchent (3 à 6 s chacune) entre a et b
  const rg = mkRnd(seed), out = []; let t = a - rg() * 2;
  while (t < b) { const d = 3 + 3 * rg(); out.push([t, d, g0 * (0.6 + 0.4 * rg()), rg() * 1.2 - 0.6]); t += d * (0.35 + 0.3 * rg()); }
  return out;
}
function diveTime() {                                    // instant où l'on passe sous l'eau dans le segment de l'anguille (plan « sous l'eau » de la liste des plans, sinon premier splash / bulles / décharge, sinon « une espèce »)
  const [aS, aE] = SEG.ang, e1 = ph('e1'), limit = wt('e1', "d'anguille") + 0.2;
  const shot = (EV.shots || []).find(s => s && Number.isFinite(s.t0) && s.t0 > aS + 0.3 && s.t0 < aE - 1 && /sous|under|dive|plong|subm|immerg|fond|subaqu|water|eau/i.test(String(s.id)) && !/^e1_(surf|ciel|crep)/i.test(String(s.id)));
  if (shot) return shot.t0;
  const sp = evIn('splash', aS, e1.t1), bu = evIn('bubbles', aS, e1.t1), zp = evIn('zap', aS, e1.t1), c = [sp && sp.t, bu && bu.t - 0.1, zp && zp.t - 0.25].filter(x => Number.isFinite(x) && x > aS + 0.4);
  return c.length ? Math.min(limit, ...c) : wt('e1', 'une') - 0.1;
}
function ambiances() {
  B = BUS.amb; const [, iE] = SEG.intro, [sS, sE] = SEG.sca, [bS, bE] = SEG.bas, [aS, aE] = SEG.ang, [fS, fE] = SEG.fin;
  const tPred = wt('b3', 'prédateur'), tFuir = wt('b4', 'fuir'), tEch = wt('c3', 'échapper'), dive = diveTime();
  // ─ prairie / sous-bois doré (intro et scarabée) : vent doux dans l'herbe, grillons et sauterelles, mouches qui passent, oiseaux lointains ; les insectes se taisent quand le prédateur arrive
  const pE = sE + 0.25, calm = x => x < tPred ? 1 : x < tFuir + 0.3 ? lerp(1, 0.4, sm((x - tPred) / 0.6)) : lerp(0.4, 1, sm((x - tFuir - 0.3) / 1.6));
  layer(0, pE, { name: 'wind_prairie', rms: -37, fi: 0.8, fo: 0.5, send: 0.3 }, genWind({ f0: 430, q: 1.3, whistle: 0.04, rumble: 0.25, seed: 211, depth: 0.7, hiss: 0.12, wf: 1800, rate: 0.8 }));
  layer(0, pE, { name: 'crickets_prairie', rms: -39.5, fi: 0.8, fo: 0.5, send: 0.2, mul: calm }, genCrickets({ n: 5, seed: 212, fc: [3700, 4500], rate: [1.5, 2.8], pulses: [3, 5], pr: [34, 48] }));
  layer(0, pE, { name: 'hoppers_prairie', rms: -46, fi: 1, fo: 0.5, send: 0.3, mul: calm }, genCrickets({ n: 3, seed: 213, fc: [5600, 6800], rate: [0.45, 0.8], pulses: [14, 26], pr: [70, 100] }));
  layer(0, pE, { name: 'flies', rms: -41.5, fi: 0.6, fo: 0.5, send: 0.25, mul: x => calm(x) }, genFlies({ seed: 214, rate: 0.4 }));
  layer(0, pE, { name: 'birds_prairie', rms: -44.5, fi: 0.8, fo: 0.5, send: 0, mul: calm }, genBirds({ seed: 215, rate: () => 0.4, species: [['whistle', 1], ['chick', 1], ['warble', 0.8], ['tsit', 1], ['trill', 0.7]], gain: 0.06, far: 0.6, scale: [0.9, 1.1] }));
  layer(0, pE, { name: 'hush_prairie', rms: -48, fi: 0.8, fo: 0.5, send: 0.3 }, genHush({ seed: 216, f: 3000 }));
  // ─ forêt tropicale au bord d'une rivière (basilic) : rivière, cigales, rainettes, oiseaux tropicaux, gouttes sur les grandes feuilles, vent dans les feuilles larges ; tout se tait un peu quand le rapace passe
  const jS = bS - 0.25, jE = bE + 0.25, hawk = x => x < tEch ? 1 : lerp(1, 0.45, sm((x - tEch) / 0.5));
  layer(jS, jE, { name: 'river', rms: -38, fi: 0.5, fo: 0.5, send: 0.3 }, genStream({ seed: 231, bubbles: 28, drips: 0.2, fa: 1500, fb: 480, hiss: 0.08, bubF: 260, dripF: [800, 1800] }));
  layer(jS, jE, { name: 'cicadas_jungle', rms: -43, fi: 0.8, fo: 0.5, send: 0.4, mul: hawk }, genCicada({ seed: 232, f: 4700, bursts: cicadaBursts(jS, jE, 232) }));
  layer(jS, jE, { name: 'cicadas_hi_jungle', rms: -49, fi: 0.8, fo: 0.5, send: 0.4, mul: hawk }, genCicada({ seed: 233, f: 7100, bursts: cicadaBursts(jS, jE, 233, 0.9) }));
  layer(jS, jE, { name: 'frogs_jungle', rms: -44, fi: 0.8, fo: 0.5, send: 0.3, mul: hawk }, genTreeFrogs({ n: 6, seed: 234, f: [1900, 3300], rate: [5, 9], series: [3, 9], gap: [1.5, 5], croakers: 3 }));
  layer(jS, jE, { name: 'birds_jungle', rms: -44.5, fi: 0.8, fo: 0.5, send: 0, mul: hawk }, genBirds({ seed: 235, rate: () => 0.75, species: [['parrot', 1], ['oriole', 1.2], ['toucan', 0.7], ['tinamou', 0.35], ['whistle', 0.8], ['warble', 0.8], ['tsit', 0.5]], gain: 0.07, far: 0.5, scale: [0.85, 1.15] }));
  layer(jS, jE, { name: 'drops_jungle', rms: -49, fi: 0.8, fo: 0.5, send: 0.6 }, genDrops({ seed: 236, rate: 1.0 }));
  layer(jS, jE, { name: 'leaves_jungle', rms: -42, fi: 0.8, fo: 0.5, send: 0.3 }, genWind({ f0: 1000, q: 0.8, whistle: 0, rumble: 0.05, seed: 237, depth: 0.8, hiss: 0.5, wf: 2600, rate: 0.9 }));
  // ─ Amazonie au crépuscule, à la surface (grenouilles, insectes, eau qui clapote, un oiseau au loin), puis SOUS L'EAU (bourdonnement sourd étouffé, bulles, petits craquements électriques lointains)
  const sfE = dive + 0.35, uS = dive - 0.2, uE = aE + 0.25;
  if (sfE > aS - 0.15 + 0.3) {
    layer(aS - 0.15, sfE, { name: 'water_dusk', rms: -38, fi: 0.5, fo: 0.35, send: 0.3 }, genStream({ seed: 241, bubbles: 14, drips: 0.15, fa: 1100, fb: 380, hiss: 0.05, bubF: 220, dripF: [700, 1500] }));
    layer(aS - 0.15, sfE, { name: 'frogs_dusk', rms: -41, fi: 0.5, fo: 0.35, send: 0.3 }, genTreeFrogs({ n: 7, seed: 242, f: [1700, 2900], rate: [4, 7], series: [4, 12], gap: [0.8, 3], croakers: 5 }));
    layer(aS - 0.15, sfE, { name: 'insects_dusk', rms: -43, fi: 0.5, fo: 0.35, send: 0.2 }, genCrickets({ n: 5, seed: 243, fc: [3300, 4200], rate: [1.3, 2.4], pulses: [4, 7], pr: [28, 40] }));
    layer(aS - 0.15, sfE, { name: 'birds_dusk', rms: -50, fi: 0.5, fo: 0.35, send: 0 }, genBirds({ seed: 244, rate: () => 0.5, species: [['oriole', 1], ['tinamou', 0.6], ['whistle', 1]], gain: 0.06, far: 0.8, scale: [0.85, 1.05], sendFar: 0.9, sendNear: 0.9 }));
    layer(aS - 0.15, sfE, { name: 'wind_dusk', rms: -43, fi: 0.5, fo: 0.35, send: 0.3 }, genWind({ f0: 700, q: 1, whistle: 0, rumble: 0.1, seed: 245, depth: 0.6, hiss: 0.3, wf: 2000, rate: 0.7 }));
  }
  layer(uS, uE, { name: 'uw_hum', rms: -37.5, fi: 0.45, fo: 0.5, send: 0.4 }, genUWHum({ seed: 251 }));
  layer(uS, uE, { name: 'uw_flow', rms: -42.5, fi: 0.45, fo: 0.5, send: 0.3 }, genWind({ f0: 170, q: 0.8, whistle: 0, rumble: 0.9, seed: 252, depth: 0.9, hiss: 0, rate: 0.6 }));
  layer(uS, uE, { name: 'uw_bubbles', rms: -43.5, fi: 0.45, fo: 0.5, send: 0.6 }, genUWBubbles({ seed: 253, rate: 0.9 }));
  layer(uS, uE, { name: 'uw_crackle', rms: -49, fi: 0.8, fo: 0.5, send: 0.7, mul: x => lerp(0.6, 1.3, sm((x - uS) / Math.max(1, aE - uS))) }, genFarCrackle({ seed: 254, rate: 0.5 }));
  // ─ question finale : une prairie légère (vent, oiseaux, quelques grillons) qui s'éteint dans la seconde qui suit la dernière parole : le plan de sortie est propre
  const qS = fS - 0.25, qE = fE - 0.8, fade = x => x < VOICE_END ? 1 : lerp(1, 0.55, sm((x - VOICE_END) / 0.6));
  layer(qS, qE, { name: 'wind_fin', rms: -36.5, fi: 0.5, fo: 0.9, send: 0.3, mul: fade }, genWind({ f0: 480, q: 1.2, whistle: 0.04, rumble: 0.2, seed: 261, depth: 0.7, hiss: 0.12, wf: 1900, rate: 0.8 }));
  layer(qS, qE, { name: 'birds_fin', rms: -42.5, fi: 0.5, fo: 0.9, send: 0, mul: fade }, genBirds({ seed: 262, rate: () => 0.55, species: [['whistle', 1], ['chick', 1], ['warble', 0.8], ['tsit', 1]], gain: 0.06, far: 0.5, scale: [0.9, 1.1] }));
  layer(qS, qE, { name: 'crickets_fin', rms: -41, fi: 0.5, fo: 0.9, send: 0.2, mul: fade }, genCrickets({ n: 4, seed: 263, fc: [3700, 4400], rate: [1.4, 2.4], pulses: [3, 5], pr: [34, 48] }));
  layer(qS, qE, { name: 'hush_fin', rms: -48, fi: 0.5, fo: 0.9, send: 0.3, mul: fade }, genHush({ seed: 264, f: 3000 }));
}

// ───────── bruitages : un son par type d'événement (crête finale visée en dBFS dans LV) ─────────
const LV = {                                             // niveau de l'événement avant mastering, exprimé en « crête finale visée » (dBFS) corrigée de l'écart mesuré dû à la réverbération : la crête finale mesurée est dans son_notes.md
  ding: -11.8, no: -10, label: -10, blip: -12, counter: -10, pop: -10, scribble: -12.8, page: -10.1, scan: -11.9, zoom: -11.2, whoosh: -8.4, reveal: -7.5, suspense: -11.3, wind: -11, snowfall: -14, frost: -11.7, crack: -7, drip: -10, thaw: -12.9,
  heartbeat: -8, beep: -10.4, flatline: -11.8, glow: -11.3, sparkle: -11.3, ribbit: -7, hop: -10, step: -10, sniff: -10.1, squirt: -7, splat: -6, yelp: -7.1, shake: -9, sneeze: -6, yip: -8.1, run: -10, ruler: -10.2, bird: -12.3, vote: -8.1,
  zap: -5.5, splash: -7.5, slap: -10, steam: -10.5, bang: -6.5, bubbles: -13, flop: -9, heat: -11.5, buzz: -12.5,       // épisode 2
  endCard: -9.6, logo: -5.6, letters: -8.7, swoosh: -9, thud: -7, stamp: -8,
};
const surfaceAt = t => { const sg = segAt(t); return sg === 'bas' ? (t >= wt('c1', 'courir') - 0.2 ? 'water' : 'wet') : sg === 'ang' ? 'wet' : 'grass'; };       // herbe et litière (prairie, intro, fin), boue de berge, eau peu profonde (le basilic court), fond vaseux
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
  scan(x, v) { const d = durOf(v, 1.2); tone(x, d, { f0: 500, f1: 2600, curve: 1.4, gain: 0.07, att: 0.03, rel: 0.12, harm: [1, 0.3], pan: -0.7, panTo: 0.7, am: 0.3, arate: 22, send: 0.4 }); tone(x, d, { f0: 505 * 1.006, f1: 2600 * 1.006, curve: 1.4, gain: 0.045, att: 0.03, rel: 0.12, pan: -0.7, panTo: 0.7, send: 0.4 }); nzb(x, d, { type: 'hp', f0: 6000, gain: 0.02, att: 0.1, rel: 0.2, pan: -0.7, panTo: 0.7 }); for (let k = 0; k < 10; k++) { const u = k / 10; tone(x + u * d, 0.05, { f0: 3000 + 3000 * u, gain: 0.03, att: 0.002, rel: 0.01, dec: 0.015, pan: -0.7 + 1.4 * u }); } glass(x + d - 0.04, 'E6', { gain: 0.08, tau: 1.2, pan: 0.6 }); },
  zoom(x, v) { const d = durOf(v, 1.0); nzb(x, d, { f0: 2800, f1: 220, q: 1.4, gain: 0.13, att: 0.05, rel: d * 0.3, curve: 0.7, send: 0.4 }); tone(x, d, { f0: 700, f1: 140, curve: 1.4, gain: 0.07, att: 0.04, rel: 0.1, send: 0.4 }); for (let k = 0; k < 8; k++) tone(x + rnd() * d, 0.04, { f0: 500 + 700 * rnd(), f1: 1200 + 800 * rnd(), gain: 0.03, att: 0.002, rel: 0.01, dec: 0.012, pan: rr(-0.6, 0.6) }); thud(x + d - 0.04, 0.25); },
  whoosh(x, v) { const d = durOf(v, 0.5); nzb(x, d, { f0: 300, f1: 1500, q: 1.1, gain: 0.14, att: d * 0.45, rel: d * 0.5, pan: -0.6, panTo: 0.6, send: 0.3, curve: 0.8 }); },
  reveal(x) { ['D5', 'A5', 'B5', 'E6', 'A6'].forEach((n, k) => glass(x + k * 0.05, n, { gain: 0.06, tau: 2.2, pan: -0.4 + 0.2 * k })); tone(x - 0.2, 0.3, { f0: 300, f1: 1500, curve: 1.3, gain: 0.03, att: 0.1, rel: 0.05, send: 0.4 }); nzb(x - 0.1, 0.5, { type: 'hp', f0: 6000, gain: 0.02, att: 0.1, rel: 0.35, send: 0.4 }); harp(x + 0.05, 'D4', { gain: 0.05 }); harp(x + 0.15, 'A4', { gain: 0.04 }); },
  suspense(x, v) { const d = durOf(v, 2); tone(x, d, { f0: 55, f1: 87, curve: 1.2, gain: 0.1, att: d * 0.5, rel: 0.12, harm: [1, 0.6, 0.35, 0.2], am: 0.35, arate: 7, send: 0.4 }); nzb(x, d, { f0: 400, f1: 2600, q: 1.1, gain: 0.06, att: d * 0.8, rel: 0.1, curve: 1.6, send: 0.4 }); tone(x, d, { f0: 880, f1: 1320, curve: 1.5, gain: 0.02, att: d * 0.7, rel: 0.1, am: 0.6, arate: 14 }); },
  // météo, saisons
  wind(x, v) { const d = durOf(v, 2.5); nzb(x, d, { f0: 250, f1: 650, q: 1.5, gain: 0.12, att: d * 0.45, rel: d * 0.45, pan: -0.4, panTo: 0.4, send: 0.3, curve: 1.2 }); nzb(x + d * 0.1, d * 0.8, { f0: 1400, f1: 1800, q: 14, gain: 0.04, att: d * 0.4, rel: d * 0.4, pan: 0.3, panTo: -0.3 }); },
  snowfall(x, v) { const d = durOf(v, 3); nzb(x, d, { type: 'hp', f0: 6000, gain: 0.04, att: d * 0.35, rel: d * 0.3, send: 0.3 }); nzb(x, d, { f0: 520, q: 0.8, gain: 0.03, att: d * 0.4, rel: d * 0.4 }); for (let k = 0; k < Math.round(10 * d); k++) tone(x + rnd() * d, 0.04, { f0: 4000 + 5000 * rnd(), gain: 0.025 * rnd(), att: 0.0008, rel: 0.01, dec: 0.01, pan: rr(-0.8, 0.8), send: 0.4 }); },
  frost(x, v) { const d = durOf(v, 1.5); nzb(x, d, { type: 'hp', f0: 5000, f1: 8000, gain: 0.05, att: d * 0.7, rel: d * 0.3, send: 0.4 }); const n = Math.round(6 + 9 * d); for (let k = 0; k < n; k++) tone(x + d * Math.sqrt(rnd()), 0.03, { f0: 2500 + 4500 * rnd(), gain: 0.05, att: 0.0006, rel: 0.008, dec: 0.007, pan: rr(-0.7, 0.7), send: 0.4 }); glass(x + d * 0.6, 'E7', { gain: 0.03, tau: 1.4, pan: 0.3 }); glass(x + d * 0.9, 'B6', { gain: 0.03, tau: 1.4, pan: -0.3 }); },
  crack(x, v) { const f = clamp(v, 0.15, 1); nzb(x, 0.01, { type: 'hp', f0: 2500, gain: 0.4, att: 0.0003, rel: 0.007, send: 0.3 }); tone(x, 0.12, { f0: 2400, f1: 2300, gain: 0.07, att: 0.0005, rel: 0.02, dec: 0.04, harm: [1, 0.5], send: 0.4 }); tone(x, 0.12, { f0: 3900, f1: 3800, gain: 0.04, att: 0.0005, rel: 0.02, dec: 0.03, send: 0.4 });
    const n = 2 + Math.round(4 * f); for (let k = 0; k < n; k++) { const t = x + 0.03 + k * 0.045 * (0.7 + 0.6 * rnd()), f0 = 2200 + 2200 * rnd(); tone(t, 0.04, { f0, f1: f0 * 0.3, gain: 0.1 * (1 - k / (n + 1)), att: 0.0005, rel: 0.01, dec: 0.012, pan: rr(-0.5, 0.5), send: 0.35 }); nzb(t, 0.008, { type: 'hp', f0: 3500, gain: 0.08, att: 0.0003, rel: 0.005, pan: rr(-0.5, 0.5) }); }
    for (let k = 0; k < 2 + Math.round(2 * f); k++) glass(x + 0.12 + 0.28 * rnd() + k * 0.08, ['E6', 'A6', 'B6', 'D7', 'E7'][Math.floor(rnd() * 5)], { gain: 0.03, tau: 0.5, pan: rr(-0.5, 0.5), send: 0.5 }); if (f > 0.55) { nzb(x, 0.3, { type: 'lp', f0: 300, f1: 80, gain: 0.3 * f, att: 0.002, rel: 0.2, send: 0.5 }); tone(x, 0.35, { f0: 95, f1: 48, curve: 0.6, gain: 0.2 * f, att: 0.003, rel: 0.1, dec: 0.1, harm: [1, 0.3] }); } return 0.4 + 0.6 * f; },
  drip(x, v) { const s = clamp(v, 0.1, 1), f = 1500 - 700 * s; tone(x, 0.18, { f0: f * 0.9, f1: f * 2.1, curve: 0.45, gain: 0.14, att: 0.002, rel: 0.03, dec: 0.045 + 0.03 * s, harm: [1, 0.15], send: 0.65 }); tone(x + 0.13, 0.1, { f0: f * 1.15, f1: f * 2.4, curve: 0.45, gain: 0.04, att: 0.002, rel: 0.02, dec: 0.03, send: 0.8 }); nzb(x, 0.006, { type: 'hp', f0: 4000, gain: 0.012, att: 0.0003, rel: 0.004 }); return 0.5 + 0.5 * s; },
  thaw(x, v) { const d = durOf(v, 2); layer(x, x + d, { rms: -24, fi: d * 0.3, fo: d * 0.4, send: 0.2, dest: B }, genStream({ seed: 61 + Math.floor(x), bubbles: 55, drips: 0.8 })); },
  // cœur, monitoring, magie
  heartbeat(x, v) { const s = clamp(v, 0.3, 1.2); tone(x, 0.34, { f0: 95, f1: 46, curve: 0.55, gain: 0.5 * s, att: 0.004, rel: 0.06, dec: 0.1, harm: [1, 0.3, 0.1], send: 0.18 }); tone(x + 0.24, 0.3, { f0: 80, f1: 42, curve: 0.55, gain: 0.34 * s, att: 0.004, rel: 0.06, dec: 0.09, harm: [1, 0.3, 0.1], send: 0.18 }); nzb(x, 0.07, { type: 'lp', f0: 220, f1: 110, gain: 0.3 * s, att: 0.002, rel: 0.05 }); nzb(x + 0.24, 0.06, { type: 'lp', f0: 200, f1: 100, gain: 0.2 * s, att: 0.002, rel: 0.04 }); return 0.55 + 0.45 * clamp(s, 0.3, 1); },
  beep(x) { tone(x, 0.14, { f0: 1000, gain: 0.2, att: 0.004, rel: 0.012, send: 0.1 }); },
  flatline(x, v) { const d = durOf(v, 2); tone(x, d, { f0: 1000, gain: 0.14, att: 0.006, rel: 0.04, send: 0.1 }); },
  glow(x, v) { const d = durOf(v, 2); ['A5', 'D6', 'E6', 'A6'].forEach((n, k) => tone(x + 0.05 * k, d, { f0: hz(n), gain: 0.03, att: d * 0.45, rel: d * 0.45, vib: 0.004, vrate: 4 + k, harm: [1, 0.15], pan: -0.4 + 0.27 * k, send: 0.6 })); tone(x, d, { f0: hz('A4'), gain: 0.03, att: d * 0.5, rel: d * 0.4, harm: [1, 0.4, 0.15], send: 0.5 }); nzb(x, d, { type: 'hp', f0: 6500, gain: 0.015, att: d * 0.5, rel: d * 0.4 }); for (let k = 0; k < 4 + Math.round(2 * d); k++) glass(x + d * 0.15 + (d * 0.7) * rnd(), ['A5', 'D6', 'E6', 'B5', 'A6', 'E7'][Math.floor(rnd() * 6)], { gain: 0.03, tau: 0.9, pan: rr(-0.6, 0.6) }); },
  sparkle(x) { const sc = ['B6', 'D7', 'E7', 'G7', 'A7', 'B7'], up = rnd() < 0.5; for (let k = 0; k < 4; k++) glass(x + k * 0.055, sc[up ? 1 + k : 4 - k], { gain: 0.05, tau: 0.45, pan: rr(-0.6, 0.6), send: 0.5 }); },
  // grenouille, déplacements
  ribbit(x, v) { const s = clamp(v, 0.7, 1.4); croak(x, 0.1, 58 * s, 70 * s, 380 * s, 1300 * s, 0.9); croak(x + 0.16, 0.14, 66 * s, 92 * s, 470 * s, 1600 * s, 1); nzb(x + 0.1, 0.06, { type: 'lp', f0: 260, gain: 0.03, att: 0.01, rel: 0.03 }); },
  hop(x) { const sf = surfaceAt(x); tone(x, 0.12, { f0: 130, f1: 70, curve: 0.5, gain: 0.12, att: 0.002, rel: 0.03, dec: 0.04, send: 0.15 }); if (sf === 'water') { nzb(x, 0.12, { f0: 1300, f1: 500, q: 0.8, gain: 0.14, att: 0.002, rel: 0.07, send: 0.3 }); tone(x + 0.01, 0.12, { f0: 200, f1: 520, curve: 0.5, gain: 0.07, att: 0.002, rel: 0.03, dec: 0.04, send: 0.4 }); } else { nzb(x, 0.1, { f0: 2200, f1: 1500, q: 1, gain: 0.1, att: 0.003, rel: 0.07 }); for (let k = 0; k < 5; k++) nzb(x + 0.01 + 0.02 * k * (0.5 + rnd()), 0.012, { type: 'hp', f0: 3000 + 2000 * rnd(), gain: 0.04, att: 0.0005, rel: 0.007, pan: rr(-0.4, 0.4) }); } },
  step(x) {
    const sf = surfaceAt(x), s = 0.85 + 0.3 * rnd(), pan = rr(-0.25, 0.25);
    if (sf === 'water') { nzb(x, 0.1, { f0: 1100 * s, f1: 500, q: 0.9, gain: 0.14, att: 0.002, rel: 0.06, pan, send: 0.3 }); tone(x + 0.01, 0.07, { f0: 260, f1: 540, gain: 0.05, att: 0.002, rel: 0.02, dec: 0.02, pan, send: 0.4 }); for (let k = 0; k < 3; k++) tone(x + 0.03 + 0.02 * k, 0.03, { f0: 1800 + 1500 * rnd(), f1: 1000, gain: 0.025, att: 0.0008, rel: 0.01, dec: 0.008, pan: rr(-0.5, 0.5), send: 0.4 }); }
    else if (sf === 'wet') { nzb(x, 0.1, { type: 'lp', f0: 900 * s, f1: 300, gain: 0.15, att: 0.004, rel: 0.07, pan }); tone(x + 0.03, 0.06, { f0: 200, f1: 420, gain: 0.04, att: 0.002, rel: 0.02, dec: 0.02, pan }); tone(x, 0.1, { f0: 110, f1: 70, gain: 0.08, att: 0.003, rel: 0.03, dec: 0.04, pan }); }
    else { nzb(x, 0.13, { f0: 2500 * s, f1: 1600, q: 0.6, gain: 0.07, att: 0.01, rel: 0.09, pan }); tone(x, 0.1, { f0: 120, f1: 70, gain: 0.08, att: 0.003, rel: 0.03, dec: 0.04, pan }); for (let k = 0; k < 3; k++) nzb(x + 0.02 * k, 0.01, { type: 'hp', f0: 4000, gain: 0.03, att: 0.0004, rel: 0.006, pan }); }
  },
  sniff(x) { for (let k = 0; k < 3; k++) { const t = x + k * 0.135, g = 1 - 0.22 * k; nzb(t, 0.09, { f0: 1700 + 150 * k, f1: 3200, q: 1.2, gain: 0.13 * g, att: 0.015, rel: 0.045, pan: 0.1 * k, send: 0.15 }); nzb(t, 0.08, { f0: 500, q: 2, gain: 0.04 * g, att: 0.012, rel: 0.04 }); } },
  // lézard, coyote
  squirt(x, v) { const d = durOf(v, 0.5); nzb(x, 0.045, { type: 'hp', f0: 2500, gain: 0.2, att: 0.002, rel: 0.03, pan: 0.1 }); nzb(x, d, { type: 'hp', f0: 4000, f1: 6500, gain: 0.1, att: 0.03, rel: 0.1, am: 0.3, arate: 50, pan: 0, panTo: 0.35, send: 0.3 }); nzb(x + 0.02, d, { f0: 3200, f1: 2700, q: 12, gain: 0.05, att: 0.04, rel: 0.12, pan: 0.1 }); tone(x + 0.02, d, { f0: 3300, f1: 2700, gain: 0.02, att: 0.04, rel: 0.1, vib: 0.01, vrate: 80, pan: 0.1 });
    for (let k = 0; k < 11; k++) { const t = x + d * 0.4 + rnd() * (d * 0.8 + 0.3), f = 1400 + 1300 * rnd(); tone(t, 0.04, { f0: f, f1: f * 0.6, gain: 0.04 * (0.5 + 0.5 * rnd()), att: 0.001, rel: 0.01, dec: 0.01, pan: rr(0, 0.8), send: 0.3 }); nzb(t, 0.006, { type: 'hp', f0: 3000, gain: 0.03, att: 0.0003, rel: 0.004, pan: rr(0, 0.8) }); } },
  splat(x) { nzb(x, 0.12, { type: 'lp', f0: 1400, f1: 220, gain: 0.3, att: 0.001, rel: 0.09, send: 0.25 }); tone(x, 0.12, { f0: 260, f1: 90, curve: 0.6, gain: 0.15, att: 0.002, rel: 0.03, dec: 0.05 }); nzb(x + 0.01, 0.1, { f0: 1000, f1: 420, q: 3, gain: 0.07, att: 0.002, rel: 0.06 }); for (let k = 0; k < 6; k++) tone(x + 0.06 + k * 0.045 * (0.6 + 0.8 * rnd()), 0.05, { f0: 500 + 700 * rnd(), f1: 1300 + 900 * rnd(), curve: 0.5, gain: 0.04, att: 0.002, rel: 0.01, dec: 0.015, pan: rr(-0.5, 0.5), send: 0.3 }); },
  yelp(x) { voc(x, 0.26, { f0pts: [[0, 600], [0.3, 1100], [0.65, 900], [1, 560]], forms: [[700, 6, 1], [1700, 8, 0.6], [3000, 10, 0.25]], gain: 0.2, breath: 0.03, vib: 0.03, vrate: 22, send: 0.35, pan: -0.1 }); voc(x + 0.33, 0.2, { f0pts: [[0, 700], [0.35, 1250], [1, 650]], forms: [[800, 6, 1], [1800, 8, 0.6], [3100, 10, 0.25]], gain: 0.15, breath: 0.03, vib: 0.03, vrate: 22, send: 0.35, pan: -0.1 }); },
  shake(x) { nzb(x, 0.4, { f0: 1000, f1: 1900, q: 1.2, gain: 0.12, att: 0.03, rel: 0.12, dec: 0.3, am: 0.8, arate: 16, pan: -0.3, panTo: 0.3 }); tone(x, 0.4, { f0: 90, gain: 0.03, att: 0.03, rel: 0.1, harm: [1, 0.6, 0.4], am: 0.8, arate: 16, dec: 0.3 }); for (let k = 0; k < 4; k++) tone(x + 0.04 + 0.08 * k, 0.04, { f0: 600 + 300 * rnd(), f1: 1100, curve: 0.5, gain: 0.04, att: 0.002, rel: 0.01, dec: 0.012, pan: rr(-0.5, 0.5) }); },
  // lycaons
  sneeze(x, v) { const s = clamp(v, 0.75, 1.35), pan = rr(-0.2, 0.2); nzb(x, 0.07, { f0: 2200 * Math.sqrt(s), f1: 3200, q: 1, gain: 0.11, att: 0.006, rel: 0.035, pan }); nzb(x, 0.05, { type: 'hp', f0: 5000, gain: 0.02, att: 0.004, rel: 0.03, pan });
    const bl = 0.15, F1 = new Filt().set(900 * s, 5), F2 = new Filt().set(2400 * s, 7), buf = new Float32Array(Math.floor(bl * SR)); for (let i = 0; i < buf.length; i++) { const e = Math.min(1, i / (0.012 * SR)) * Math.pow(Math.max(0, 1 - i / buf.length), 1.3), n = rnd() * 2 - 1; F1.run(n); F2.run(n); buf[i] = (F1.bp * 1.2 + F2.bp * 0.8) * e; } let mx = 1e-9; for (const b of buf) mx = Math.max(mx, Math.abs(b)); emit(buf, x + 0.05, pan, 0.2, 0.17 / mx);
    tone(x + 0.17, 0.11, { f0: 1500 * s, f1: 2300 * s, curve: 0.7, gain: 0.07, att: 0.006, rel: 0.03, dec: 0.06, harm: [1, 0.2], pan, send: 0.3 }); tone(x + 0.24, 0.07, { f0: 2300 * s, f1: 1700 * s, gain: 0.05, att: 0.004, rel: 0.02, dec: 0.04, pan }); },
  yip(x) { const n = 5 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) { const t = x + k * (0.08 + 0.05 * rnd()), f = 1300 + 700 * rnd(); voc(t, 0.08 + 0.04 * rnd(), { f0pts: [[0, f], [1, f * 1.55]], forms: [[1300, 6, 1], [3200, 8, 0.5]], gain: 0.1 * (0.6 + 0.4 * rnd()), breath: 0.02, vib: 0.02, vrate: 30, pan: rr(-0.7, 0.7), send: 0.4, att: 0.008, rel: 0.02 }); } for (let k = 0; k < 3; k++) voc(x + 0.05 + k * 0.17, 0.12, { f0pts: [[0, 850], [1, 1300]], forms: [[900, 6, 1], [2400, 8, 0.5]], gain: 0.05, breath: 0.02, pan: rr(-0.8, 0.8), send: 0.5 }); },
  run(x, v) { const d = durOf(v, 2.5), nR = 5, step = 0.17;
    for (let r = 0; r < nR; r++) { const off = rnd() * step, pan = -0.7 + 1.4 * r / (nR - 1); for (let t = off; t < d; t += step * (0.96 + 0.08 * rnd())) { const e = sm(t / (d * 0.35)) * sm((d - t) / (d * 0.3)); if (e < 0.02) continue; tone(x + t, 0.09, { f0: 100, f1: 58, gain: 0.07 * e, att: 0.003, rel: 0.03, dec: 0.035, pan, send: 0.25 }); nzb(x + t, 0.08, { f0: 1800 + 400 * rnd(), q: 0.7, gain: 0.04 * e, att: 0.003, rel: 0.05, pan }); } }
    nzb(x, d, { f0: 1200, f1: 1600, q: 0.5, gain: 0.03, att: d * 0.35, rel: d * 0.35, pan: -0.5, panTo: 0.5, send: 0.3 }); },
  ruler(x, v) { const n = v >= 3 ? Math.round(v) : 12, sp = 0.045; for (let k = 0; k < n; k++) { const major = k % 5 === 0, t = x + k * sp; if (major) { tone(t, 0.05, { f0: 1500, f1: 1150, gain: 0.1, att: 0.0008, rel: 0.01, dec: 0.014, harm: [1, 0.4], pan: 0.1, send: 0.2 }); } nzb(t, 0.01, { f0: 3200 + 60 * k, q: 3, gain: 0.07, att: 0.0003, rel: 0.007, pan: 0.1 }); } nzb(x, n * sp, { f0: 1500, f1: 2600, q: 0.8, gain: 0.02, att: 0.05, rel: 0.1 }); },
  bird(x, v) { const ty = Math.round(clamp(v, 0, 3)), sc = segAt(x), s = sc === 'bas' ? 0.88 : sc === 'ang' ? 0.95 : 1.05, o = { gain: 0.12, pan: rr(-0.5, 0.5), send: 0.5 };
    if (ty === 0) BIRD.tsit(x, s, o); else if (ty === 1) BIRD.whistle(x, s, o); else if (ty === 2) BIRD.trill(x, s, o);
    else { nzb(x, 0.35, { f0: 900, f1: 2400, q: 0.8, gain: 0.1, att: 0.01, rel: 0.15, am: 0.9, arate: 14, pan: -0.3, panTo: 0.5, send: 0.3 }); BIRD.chick(x + 0.12, s, o); } },
  vote(x) { nzb(x, 0.16, { f0: 2500, f1: 1200, q: 1, gain: 0.08, att: 0.01, rel: 0.08, pan: -0.2, panTo: 0.1 }); tone(x + 0.16, 0.12, { f0: 160, f1: 90, curve: 0.5, gain: 0.18, att: 0.002, rel: 0.03, dec: 0.05, harm: [1, 0.4], send: 0.2 }); nzb(x + 0.16, 0.05, { type: 'lp', f0: 500, gain: 0.1, att: 0.001, rel: 0.03 }); marimba(x + 0.28, 'G5', { gain: 0.08, tau: 0.4 }); marimba(x + 0.37, 'D6', { gain: 0.08, tau: 0.5 }); },
  // ─ épisode 2 : électricité, eau, vapeur, insecte
  zap(x, v) {                                            // décharge électrique : claquement large bande, arc (dent de scie nasale hachée par un papillotement irrégulier + bruit clair), zip descendant, étincelles ; grondement si forte ; v = intensité 0,5 à 2
    const s = clamp(v, 0.4, 2.2), d = 0.2 + 0.16 * s;
    nzb(x, 0.009, { type: 'hp', f0: 1800, gain: 0.4, att: 0.0002, rel: 0.006, send: 0.2 });
    { const len = Math.floor(d * SR), buf = new Float32Array(len), A = new Filt().set(1700, 1.4), Bq = new Filt().set(3900, 1.2), C = new Filt().set(600, 2); let ph = 0, gl = 0, mx = 1e-9;
      for (let i = 0; i < len; i++) { const xs = i / SR, u = i / len, f = 125 * (1 - 0.3 * u) * (1 + 0.04 * Math.sin(TAU * 31 * xs)); ph += f / SR; if (ph >= 1) ph -= 1; gl += ((rnd() * 2 - 1) - gl) * 0.035; const gate = clamp(0.5 + 5 * gl, 0.08, 1), saw = ph * 2 - 1, nz = rnd() * 2 - 1;
        A.run(saw + nz * 0.5); Bq.run(nz); C.run(saw); buf[i] = (A.bp + 0.55 * Bq.bp + 0.5 * C.bp) * gate * Math.min(1, i / 24) * Math.pow(1 - u, 0.8); mx = Math.max(mx, Math.abs(buf[i])); }
      emit(buf, x + 0.004, rr(-0.15, 0.15), 0.25, 0.3 / mx); }
    tone(x + 0.002, 0.07, { f0: 4200, f1: 700, curve: 0.5, gain: 0.07, att: 0.0005, rel: 0.02, dec: 0.03, harm: [1, 0.3], pan: 0.1, send: 0.3 });
    const n = Math.round(6 + 12 * s); for (let k = 0; k < n; k++) { const t = x + 0.01 + (d + 0.08) * Math.pow(rnd(), 1.3); tone(t, 0.01, { f0: 1500 + 5500 * rnd(), gain: 0.06 * (0.3 + 0.7 * rnd()), att: 0.0004, rel: 0.004, dec: 0.002, pan: rr(-0.8, 0.8), send: 0.3 }); nzb(t, 0.004, { type: 'hp', f0: 4000, gain: 0.05, att: 0.0003, rel: 0.003, pan: rr(-0.8, 0.8) }); }
    if (s > 1.05) tone(x, 0.3, { f0: 95, f1: 48, curve: 0.55, gain: 0.2 * (s - 0.9), att: 0.002, rel: 0.08, dec: 0.09, harm: [1, 0.4], send: 0.2 });
    return 0.5 + 0.5 * clamp((s - 0.5) / 1.5); },
  splash(x, v) {                                         // éclaboussure d'eau : « plouf » (bruit 350-1800 Hz qui retombe), bulle grave qui monte, gerbe de gouttelettes qui retombent ; v = taille (grave et longue si grande)
    const s = clamp(v, 0.4, 2.2), f = 1 / Math.pow(s, 0.35);
    nzb(x, 0.04 + 0.05 * s, { f0: 1800 * f, f1: 500 * f, q: 0.8, gain: 0.25, att: 0.002, rel: 0.03, dec: 0.02 + 0.015 * s, send: 0.3 });
    nzb(x + 0.005, 0.12 + 0.18 * s, { type: 'lp', f0: 1400 * f, f1: 250, gain: 0.2, att: 0.004, rel: 0.09, dec: 0.07 + 0.05 * s, send: 0.3 });
    tone(x + 0.012, 0.18 + 0.12 * s, { f0: 140 * f, f1: 430 * f, curve: 0.5, gain: 0.1, att: 0.003, rel: 0.04, dec: 0.05 + 0.03 * s, harm: [1, 0.2], send: 0.4 });
    nzb(x, 0.1 + 0.22 * s, { type: 'hp', f0: 3500, gain: 0.05, att: 0.004, rel: 0.08, dec: 0.05 + 0.05 * s, send: 0.3 });
    const n = Math.round(8 + 14 * s); for (let k = 0; k < n; k++) { const t = x + 0.04 + (0.15 + 0.45 * s) * Math.pow(rnd(), 1.2), fr = 1200 + 2300 * rnd(); tone(t, 0.05, { f0: fr, f1: fr * 0.6, gain: 0.04 * (0.4 + 0.6 * rnd()), att: 0.001, rel: 0.012, dec: 0.012, pan: rr(-0.7, 0.7), send: 0.35 }); } },
  slap(x) {                                              // pied qui claque l'eau : « plac » bref (claquement 900-1500 Hz, petit « bloc » grave, quelques gouttes)
    nzb(x, 0.03, { f0: 1500, f1: 900, q: 1.1, gain: 0.25, att: 0.0008, rel: 0.02, dec: 0.01, pan: rr(-0.2, 0.2), send: 0.2 });
    tone(x, 0.06, { f0: 520, f1: 240, curve: 0.5, gain: 0.1, att: 0.001, rel: 0.02, dec: 0.02, harm: [1, 0.25], send: 0.25 });
    nzb(x + 0.012, 0.06, { type: 'hp', f0: 3500, gain: 0.05, att: 0.002, rel: 0.03, dec: 0.02, send: 0.2 });
    for (let k = 0; k < 3; k++) tone(x + 0.03 + 0.02 * k, 0.03, { f0: 2000 + 1500 * rnd(), f1: 1200, gain: 0.03, att: 0.0008, rel: 0.01, dec: 0.008, pan: rr(-0.5, 0.5), send: 0.35 }); },
  steam(x, v) {                                          // vapeur qui siffle : bruit 3-9 kHz pulsé, filet sifflé étroit vers 5 kHz, souffle grave, quelques bulles qui éclatent ; durée v
    const d = durOf(v, 1);
    nzb(x, d, { type: 'hp', f0: 3200, f1: 4500, gain: 0.1, att: 0.04, rel: d * 0.45, am: 0.35, arate: 24, pan: -0.15, panTo: 0.15, send: 0.3 });
    nzb(x, d, { f0: 5200, f1: 4300, q: 14, gain: 0.07, att: 0.06, rel: d * 0.4, send: 0.2 });
    nzb(x, d, { f0: 1800, f1: 900, q: 0.7, gain: 0.04, att: 0.05, rel: d * 0.5 });
    for (let k = 0; k < Math.round(3 + 6 * d); k++) tone(x + d * 0.8 * rnd(), 0.05, { f0: 500 + 700 * rnd(), f1: 1500 + 800 * rnd(), curve: 0.5, gain: 0.03, att: 0.001, rel: 0.01, dec: 0.014, pan: rr(-0.6, 0.6), send: 0.4 }); },
  bang(x) {                                              // petite détonation sèche : claquement, corps 2,6 → 0,9 kHz, « boum » 230 → 70 Hz très bref, presque sans réverbération
    nzb(x, 0.012, { type: 'hp', f0: 1500, gain: 0.5, att: 0.0002, rel: 0.008, send: 0.1 });
    nzb(x, 0.09, { f0: 2600, f1: 900, q: 0.7, gain: 0.3, att: 0.0005, rel: 0.05, dec: 0.02, send: 0.12 });
    tone(x, 0.12, { f0: 230, f1: 70, curve: 0.45, gain: 0.3, att: 0.001, rel: 0.04, dec: 0.035, harm: [1, 0.4], send: 0.1 });
    nzb(x + 0.015, 0.12, { type: 'lp', f0: 700, f1: 200, gain: 0.12, att: 0.003, rel: 0.07, dec: 0.04, send: 0.2 }); },
  bubbles(x, v) {                                        // grappe de bulles qui montent (sinus 350-2100 Hz qui montent vite, plus serrées au début) ; durée v
    const d = durOf(v, 1), n = Math.round(10 + 14 * d);
    for (let k = 0; k < n; k++) { const t = x + d * Math.pow(rnd(), 1.5), f = 350 * Math.pow(6, rnd()), dd = 0.02 + 0.05 * rnd(); tone(t, dd * 4, { f0: f, f1: f * (1.8 + 0.4 * rnd()), curve: 0.5, gain: 0.2 * (0.3 + 0.7 * rnd() * rnd()), att: 0.001, rel: 0.01, dec: dd, pan: rr(-0.7, 0.7), send: 0.4 }); }
    nzb(x, d, { f0: 700, q: 0.8, gain: 0.02, att: d * 0.3, rel: d * 0.4, am: 0.8, arate: 9, send: 0.3 }); },
  flop(x, v) {                                           // poisson qui se débat : claquements mouillés irréguliers, de plus en plus faibles, éclaboussures ; v = intensité
    const s = clamp(v, 0.5, 2), n = 3 + Math.round(2 * s); let t = x;
    for (let k = 0; k < n; k++) { const g = Math.pow(0.8, k), pan = rr(-0.4, 0.4);
      nzb(t, 0.045, { f0: 900 + 500 * rnd(), f1: 500, q: 0.9, gain: 0.2 * g, att: 0.0015, rel: 0.03, dec: 0.015, pan, send: 0.25 }); tone(t, 0.1, { f0: 160, f1: 80, gain: 0.1 * g, att: 0.002, rel: 0.03, dec: 0.03, send: 0.2 });
      nzb(t + 0.02, 0.1, { type: 'hp', f0: 3000, gain: 0.05 * g, att: 0.003, rel: 0.06, dec: 0.025, pan, send: 0.3 }); for (let j = 0; j < 2; j++) tone(t + 0.04 + 0.02 * j, 0.03, { f0: 1500 + 1500 * rnd(), f1: 900, gain: 0.03 * g, att: 0.0008, rel: 0.01, dec: 0.008, pan: rr(-0.6, 0.6), send: 0.4 });
      t += 0.07 + 0.09 * rnd(); } },
  heat(x, v) {                                           // montée de chaleur : sifflement grave qui monte et grossit (bruit étroit 220 → 1100 Hz), grondement 70 → 150 Hz, crépitements de plus en plus serrés ; durée v
    const d = durOf(v, 1.2);
    nzb(x, d, { f0: 220, f1: 1100, q: 9, gain: 0.1, att: d * 0.8, rel: d * 0.15, curve: 1.3, send: 0.3 }); nzb(x, d, { f0: 330, f1: 1700, q: 7, gain: 0.05, att: d * 0.8, rel: d * 0.15, curve: 1.3, pan: 0.2 });
    tone(x, d, { f0: 70, f1: 150, curve: 1.2, gain: 0.07, att: d * 0.7, rel: d * 0.2, harm: [1, 0.5, 0.25], am: 0.3, arate: 6 });
    const n = Math.round(6 + 10 * d); for (let k = 0; k < n; k++) tone(x + d * (1 - Math.pow(rnd(), 1.5)), 0.01, { f0: 1800 + 2700 * rnd(), gain: 0.04 * (0.3 + 0.7 * rnd()), att: 0.0004, rel: 0.004, dec: 0.003, pan: rr(-0.6, 0.6), send: 0.3 }); },
  buzz(x, v) {                                           // battements d'ailes d'insecte : ronflement ≈ 150-220 Hz aux harmoniques adoucis, vibrato lent, passage de gauche à droite ; durée v
    const d = durOf(v, 1), f0 = 150 + 70 * rnd(), len = Math.floor(d * SR), s0 = Math.floor(x * SR), F = new Filt().set(1100, 0.9), p0 = rr(-0.7, -0.2), p1 = rr(0.2, 0.7); let ph = 0;
    for (let i = 0; i < len; i++) { const xs = i / SR, u = i / len, f = f0 * (1 + 0.06 * Math.sin(TAU * 5.3 * xs) + 0.03 * Math.sin(TAU * 11 * xs + 1)); ph += TAU * f / SR; let w = 0; for (let h = 1; h <= 9; h++) w += Math.sin(h * ph + h * h * 0.05) / Math.pow(h, 0.7);
      F.run(w); put(s0 + i, 0.15 * (F.lp * 0.6 + F.bp * 0.7) * sm(xs / 0.04) * sm((d - xs) / 0.12) * (0.78 + 0.22 * Math.sin(TAU * 3 * xs)), p0 + (p1 - p0) * u, 0.2); } },
  // marque (identique à la vidéo 2)
  endCard(x) { for (let k = 0; k < 28; k++) blip(x + k / 26, 2400, 2200, 0.012, { gain: 0.012 }); bell(x + 0.2, 'D5', { gain: 0.05, decay: 3 }); },
  logo(x) { thud(x, 0.4); thud(x + 0.36, 0.16); thud(x + 0.58, 0.08); [['D5', 0], ['F#5', 0.07], ['A5', 0.14], ['D6', 0.21]].forEach(([n, d]) => bell(x + d, n, { gain: 0.055, decay: 1.8 })); noise(x, 0.4, { type: 'hp', f0: 6000, f1: 9000, gain: 0.03, att: 0.01, rel: 0.3 }); },
  letters(x) { for (let k = 0; k < 7; k++) blip(x + k * 0.07, 900 + k * 70, 1200 + k * 70, 0.04, { gain: 0.05, pan: -0.3 + k * 0.1 }); },
};
SFX.swoosh = (x, v) => SFX.whoosh(x, 0.8);               // anciens types de la vidéo 2 conservés par prudence
SFX.thud = x => { thud(x, 0.6); };
SFX.stamp = x => { thud(x, 0.5); noise(x, 0.07, { type: 'hp', f0: 2500, f1: 2500, gain: 0.1, att: 0.001, rel: 0.05 }); };
function croak(t0, dur, r0, r1, f1, f2, g) {             // coassement : impulsions graves (≈ 60-90 Hz) qui font sonner deux résonances de la gorge
  const len = Math.floor((dur + 0.06) * SR), buf = new Float32Array(len), A = new Filt().set(f1, 7), Bq = new Filt().set(f2, 9), C = new Filt().set(f1 * 0.45, 5); let ph = 0, lp = 0, mx = 1e-9;
  for (let i = 0; i < len; i++) { const u = clamp(i / (dur * SR)), r = lerp(r0, r1, u); ph += r / SR; let s = 0; if (ph >= 1) { ph -= 1; s = 1; } lp += (s - lp) * 0.6; A.run(lp); Bq.run(lp); C.run(lp); const e = Math.min(1, i / (0.006 * SR)) * Math.pow(sm(1 - u), 0.6) * (0.55 + 0.45 * u); buf[i] = (A.bp + 0.5 * Bq.bp + 0.8 * C.bp) * e; mx = Math.max(mx, Math.abs(buf[i])); }
  emit(buf, t0, rr(-0.1, 0.1), 0.2, 0.3 * g / mx);
}

// ───────── exécution ─────────
const finalToPre = d => Math.atanh(clamp(dbv(d), 0, 0.98)) / 1.4;     // crête finale visée (après tanh(1,4 x)) → crête avant mastering
const CAP = mkBus(Math.floor(16 * SR), 0);
// Bruitages en retrait sous la voix : −11 dB quand le début du bruitage tombe sur un mot (la fin d'une phrase est souvent très douce : épisode 1, mesuré, le jet de sang
// couvrait « yeux » de 17 dB et la reconnaissance de parole lisait « l'heure » ; l'urne et l'éternuement couvraient « nez »), et −5 dB de plus sur le DERNIER mot d'une phrase
// (« degrés », « explosion », « volts »…). Les sons de réussite et de marque restent entiers.
const DUCK_EXEMPT = new Set(['ding', 'no', 'endCard', 'logo', 'letters']);
const WORDS_ALL = TLJ.phrases.flatMap(p => p.words);
const FINALS = TLJ.phrases.map(p => p.words[p.words.length - 1]);
function duckDb(t, type) {
  if (DUCK_EXEMPT.has(type)) return 0;
  let ov = 0, ovF = 0; const a = t, b = t + 0.9;
  for (const w of WORDS_ALL) { const x0 = w.t0 - 0.04, x1 = w.t1 + 0.10; ov += Math.max(0, Math.min(b, x1) - Math.max(a, x0)); }
  for (const w of FINALS) ovF += Math.max(0, Math.min(t + 0.5, w.t1 + 0.05) - Math.max(t, w.t0 - 0.04));
  return -11 * Math.min(1, ov / 0.9) - 5 * Math.min(1, ovF / 0.3);
}
const duckFactor = (t, type) => Math.pow(10, duckDb(t, type) / 20);
const SLOG = [];                                         // --check : bruitages dont le début tombe sur un mot final
// les bruitages « de bruit » (éternuement, jet, éclaboussure, couinement, reniflement, secousse, urne) dont le début tombe DANS un mot sont retardés jusqu'à la fin du mot (au plus 0,35 s) :
// mesuré, l'éternuement tombait sur « nez » (la chute de la blague) et la reconnaissance de parole lisait « nom ».
const SHIFT_TYPES = new Set(['squirt', 'splat', 'yelp', 'sniff', 'shake', 'vote', 'steam', 'bubbles', 'flop', 'buzz']);
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
  add('kalimba', 'A4', t => kalimba(t, 'A4')); add('kalimba', 'D6', t => kalimba(t, 'D6')); add('marimba', 'A4', t => marimba(t, 'A4')); add('marimba', 'G3', t => marimba(t, 'G3')); add('glass', 'A5', t => glass(t, 'A5')); add('glass', 'E6', t => glass(t, 'E6'));
  add('nylon', 'A2', t => nylon(t, 'A2')); add('nylon', 'A3', t => nylon(t, 'A3')); add('nylon', 'E4', t => nylon(t, 'E4')); add('harp', 'A4', t => harp(t, 'A4')); add('harp', 'D6', t => harp(t, 'D6')); add('bass', 'A1', t => bassPluck(t, 'A1'));
  add('flute', 'A5', t => flute(t, 1.2, 'A5')); add('flute', 'E4', t => flute(t, 1.2, 'E4')); add('reed', 'A3', t => reed(t, NOTE('A3'), NOTE('G3'), 0.9)); add('pad', 'D3', t => pad(t, 1.6, ['D3', 'A3', 'F#4'], { gain: 0.06 })); add('drone', 'D2', t => drone(t, 1.5, NOTE('D3'), NOTE('D1')));
  for (const n of ['D2', 'G2', 'B2', 'D3', 'E3', 'G3', 'A3', 'B3', 'D4', 'E4', 'A4']) add('pizz', n, t => pizz(t, n)); add('boing', 'G4', t => boing(t, NOTE('G4'))); add('hum', 'G2', t => hum(t, 1.2, 'G2')); add('zing', 'G6', t => zing(t, NOTE('G6'))); add('zing', 'D7', t => zing(t, NOTE('D7')));
  add('shaker', null, t => { for (let k = 0; k < 4; k++) shaker(t + k * 0.3, { gain: 0.03 }); }); add('drums', null, t => { dLow(t); dMid(t + 0.5); dHi(t + 1); wood(t + 1.5); }); add('heart', null, t => thumpMusic(t));
  for (const b of Object.keys(BIRD)) add('bird_' + b, null, t => BIRD[b](t, 1, { gain: 0.1, pan: 0, send: 0.3 }));
  fs.mkdirSync('build/test', { recursive: true }); fs.writeFileSync('build/test/demo.json', JSON.stringify(list, null, 1));
}
const want = k => !ONLY || ONLY === k;
if (ONLY === 'demo') demo();
if (ONLY !== 'demo' && want('music')) { musIntro(); musSca(); musBas(); musAng(); musFin(); musSortie(); }
if (ONLY !== 'demo' && want('amb')) ambiances();
if (ONLY !== 'demo' && want('sfx')) runSfx();

// ───────── mots de fin de phrase : musique et ambiances baissées autour du dernier mot (−7 dB musique, −4 dB ambiances, rampes de 70 ms) ─────────
// (épisode 1, mesuré : musique et ambiances ensemble faisaient lire « nom » pour « nez » alors que chacune seule laissait lire « nez » ; ici c'est systématique, sur tous les mots finaux)
{
  const ramp = 0.07;
  for (const [k, dB] of [['music', -7], ['amb', -4]]) {
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
function verb(inp, spread) {
  const cs = CB.map(n => new Comb(Math.round((n + spread) * sc))), as = AB.map(n => new AP(Math.round((n + spread) * sc)));
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) { const x = inp[i] * 0.015; let y = 0; for (const c of cs) y += c.p(x, 0.86, 0.25); for (const a of as) y = a.p(y); out[i] = y; }
  return out;
}
// ───────── master : chaque bus a sa réverbération, un adoucisseur tanh, le même gain final pour toutes les pistes ─────────
const TRIM = { music: 1.15, amb: 1, sfx: 1 };       // musique +1,2 dB : musique + ambiances ≈ −23 dBFS RMS avant le mixage de rendu.sh
const mast = {};
for (const k of ['music', 'amb', 'sfx']) {
  const b = BUS[k], WL = verb(b.SL, 0), WR = verb(b.SR, 23), ML = new Float32Array(N), MR = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const fade = Math.min(1, (N - i) / (0.8 * SR));
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
  console.log('mots finaux : ' + FINALS.map(w => `${w.w} ${w.t0.toFixed(2)}-${w.t1.toFixed(2)}`).join(' · '));
}
console.log('score :', OUT, (N / SR).toFixed(2), 's, crête', peak.toFixed(3), g < 1 ? '(baissée de ' + vdb(g).toFixed(1) + ' dB)' : '');
