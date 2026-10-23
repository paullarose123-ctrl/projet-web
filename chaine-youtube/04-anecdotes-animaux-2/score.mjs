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
function genStream(o) {                                  // ruisseau de fonte : bruit filtré à modulation rapide + bulles qui montent en fréquence + gouttes
  const { seed = 31, bubbles = 60, drips = 0.35 } = o;
  return b => {
    for (let c = 0; c < 2; c++) {
      const rg = mkRnd(seed + c * 5), w1 = wander(seed + c * 17, 17, 8 / SR), w2 = wander(seed + c * 17 + 3, 6, 8 / SR), w3 = wander(seed + c * 29, 0.4, 8 / SR), F1 = new Filt(), F2 = new Filt(), F3 = new Filt(), out = c ? b.R : b.L; let m1 = 1, m2 = 1;
      for (let i = 0; i < b.n; i++) {
        if ((i & 7) === 0) { m1 = clamp(0.65 + 0.5 * w1(), 0.1, 1.6); m2 = clamp(0.7 + 0.5 * w2(), 0.1, 1.5); F1.set(2400 * (0.85 + 0.2 * w3()), 0.8); F2.set(900 * (0.9 + 0.15 * w3()), 0.9); F3.set(5200, 0.9); }
        const n = rg() * 2 - 1; F1.run(n); F2.run(n); F3.run(n); out[i] += F1.bpn * m1 * 0.7 + F2.bpn * m2 * 0.9 + F3.hp * 0.1 * m1;
      }
    }
    const rg = mkRnd(seed + 99), t1 = (b.off + b.n) / SR; let t = b.off / SR;
    while (t < t1) {                                     // bulles : sinus qui monte vite, amorti
      const f = 450 * Math.pow(5, rg()), d = 0.014 + 0.03 * rg(), a = 0.25 + 0.75 * rg() * rg(), pan = rg() * 1.8 - 0.9, s0 = Math.floor(t * SR), L = Math.floor(d * 4 * SR); let ph = 0;
      for (let i = 0; i < L; i++) { const x = i / SR, fr = f * (1 + 1.1 * (1 - Math.exp(-x / (d * 0.5)))); ph += TAU * fr / SR; put(s0 + i, a * 0.45 * Math.sin(ph) * Math.exp(-x / d) * Math.min(1, i / 12), pan, 0.25); }
      t += -Math.log(1 - rg()) / bubbles;
    }
    t = b.off / SR + rg() * 2; while (t < t1) { const f = 1100 + 1500 * rg(), pan = rg() * 1.4 - 0.7; tone(t, 0.16, { f0: f, f1: f * 1.9, curve: 0.5, gain: 0.3 + 0.2 * rg(), att: 0.002, rel: 0.02, dec: 0.045, pan, send: 0.7 }); t += -Math.log(1 - rg()) / drips; }
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
function genHoots(o) { const { seed = 51, times = [], gain = 0.05, f = 1 } = o; return b => { const save = rnd; rnd = mkRnd(seed); for (const [t, pan] of times) BIRD.owl(t, f, { gain, pan, send: 0.9 }); rnd = save; }; }

// ───────── musique ─────────
const grid = (a, b, nominal) => { const n = Math.max(1, Math.round((b - a) / nominal)), d = (b - a) / n; return { n, d, t: k => a + k * d }; };      // pas élastiques : un nombre entier de temps entre deux repères de la voix
const firstEv = (types, a, b) => { for (const ty of types) { const e = evIn(ty, a, b); if (e) return e.t; } return null; };
function finger(a, b, chord, o = {}) {                   // arpège de guitare nylon sur une grille élastique de croches
  const { nominal = 0.395, pat = [0, 2, 3, 4, 3, 2, 3, 2], gain = 0.05, accent = 1.35, pan = 0.12, fadeIn = 0, t60 = 1.8 } = o, g = grid(a, b, nominal);
  for (let k = 0; k < g.n; k++) { const idx = pat[k % pat.length]; if (idx === null) continue; const nt = chord[Math.min(idx, chord.length - 1)], e = k % 8 === 0 ? accent : k % 4 === 0 ? 1.1 : 1; nylon(g.t(k), nt, { gain: gain * e * (fadeIn ? 0.5 + 0.5 * k / g.n : 1), pan: pan + 0.12 * Math.sin(k * 1.7), t60, send: 0.35 }); }
}
const PENTA_A = ['A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
const T_LOGO = at('logo');                               // seul événement obligatoire : le son de marque

function musIntro() {                                    // INTRO : curiosité, quelque chose de cristallin et de mystérieux, un cœur qui bat doucement
  rnd = mkRnd(101); B = BUS.music; const [, s1] = SEG.intro, tT = ph('trois').t0, tRev = wt('q', 'revenir'), tVie = wt('q', 'vie');
  pad(0, tT - 0.15, ['A2', 'E3', 'B3', 'C4'], { gain: 0.05, att: 1.6, rel: 1.4, bright: 0.12, trem: 0.1 });
  pad(tT - 0.15, s1 - tT + 0.35, ['F2', 'C3', 'A3', 'E4', 'G4'], { gain: 0.05, att: 0.6, rel: 1.7, bright: 0.2 });
  for (let x = 0.35, k = 0; x < tRev - 0.2; x += 1.1, k++) thumpMusic(x, 0.5 + 0.5 * Math.min(1, k / 2));                    // cœur doux (le battement visible est un événement)
  glass(wt('q', 'savais'), 'E5', { gain: 0.05, pan: -0.3 }); glass(wt('q', 'certains'), 'B5', { gain: 0.045, pan: 0.3 }); glass(wt('q', 'animaux'), 'A5', { gain: 0.045, pan: -0.2 });
  [['E5', 0, -0.3], ['A5', 0.12, 0], ['C6', 0.24, 0.3]].forEach(([n, d, p]) => glass(tRev + d, n, { gain: 0.05, pan: p }));       // « revenir » : petite montée
  glass(tVie, 'E6', { gain: 0.075, tau: 3.6, pan: 0.1 }); glass(tVie + 0.03, 'A5', { gain: 0.05, tau: 3.6, pan: -0.2 }); harp(tVie + 0.06, 'E4', { gain: 0.05 }); harp(tVie + 0.2, 'A4', { gain: 0.04 });       // reflet chaud
  glass(wt('q', 'après'), 'B5', { gain: 0.035, pan: 0.25 }); glass(wt('q', 'gelé'), 'A5', { gain: 0.035, pan: -0.25 });
  // « Voici trois anecdotes… » : kalimba curieux sur la pentatonique de la mineur
  const seq = ['A3', 'E4', 'C4', 'E4', 'A4', 'E4', 'C4', 'D4'], g = grid(tT + 0.05, wt('trois', 'animaux') - 0.1, 0.36);
  for (let k = 0; k < g.n; k++) kalimba(g.t(k), seq[k % seq.length], { gain: 0.045 + 0.02 * k / g.n, pan: Math.sin(k * 1.5) * 0.4, decay: 1.1 });
  flute(wt('trois', 'incroyables'), 0.5, 'E5', { gain: 0.04 }); flute(wt('trois', 'incroyables') + 0.55, 0.5, 'A5', { gain: 0.042 });
  kalimba(wt('trois', 'animaux'), 'A5', { gain: 0.06, decay: 2 }); kalimba(wt('trois', 'animaux') + 0.14, 'E6', { gain: 0.04, decay: 2 });
}
function musAlaska() {                                   // ALASKA : cristalline et froide ; tension qui descend au grave quand le cœur s'arrête ; lumière majeure au dégel
  rnd = mkRnd(202); B = BUS.music; const [s0, s1] = SEG.gre, tg1 = ph('g1').t0, tg2 = ph('g2').t0, tg3 = ph('g3').t0, tg4 = ph('g4').t0;
  const tCoeur = wt('g2', 'cœur'), tArr = wt('g2', "s'arrête"), tResp = wt1('g2', 'respirer'), tSuc = wt('g3', 'sucre'), tSurv = wt('g3', 'survit');
  pad(s0 + 0.2, tCoeur - s0 + 0.0, ['A2', 'D3', 'F3', 'A3'], { gain: 0.048, att: 1.6, rel: 1.2, bright: 0.12 });
  // g1 : gouttes de verre, lentes
  [[0.2, 'A5', -0.3], [1.0, 'F5', 0.25], [1.8, 'D6', -0.1], [2.85, 'C6', 0.3], [3.55, 'A5', -0.25]].forEach(([d, n, p]) => glass(s0 + d, n, { gain: 0.05, pan: p }));
  harp(s0 + 0.3, 'D3', { gain: 0.045 }); harp(s0 + 2.4, 'A3', { gain: 0.04 });
  const tSF = wt('g1', 'science-fiction'); [['A5', 0], ['D6', 0.11], ['F6', 0.22], ['A6', 0.33]].forEach(([n, d], k) => glass(tSF + d, n, { gain: 0.045 + 0.005 * k, pan: -0.3 + 0.2 * k, tau: 2.6 }));
  // g2 : le givre gagne (cloches descendantes), puis le cœur s'arrête : tout s'efface vers le grave
  [['A5', 'corps'], ['F5', 'gèle'], ['D5', 'son']].forEach(([n, w], k) => glass(wt('g2', w, w === 'son' ? 0 : 0), n, { gain: 0.045, pan: 0.2 - 0.2 * k }));
  pad(tg2 + 0.2, tArr - tg2 + 0.2, ['A2', 'D3', 'F3', 'C4'], { gain: 0.045, att: 0.7, rel: 0.9, bright: 0.05 });
  glass(tCoeur, 'C5', { gain: 0.045, tau: 1.8 });
  drone(tArr - 0.1, 3.0, NOTE('D3'), NOTE('D1'), { gain: 0.08, att: 0.2, rel: 1.8, glide: [0.0, 0.55], send: 0.5, h: [0.45, 0.75, 0.45, 0.2] });             // tension qui descend au grave
  glass(tArr + 0.04, 'D7', { gain: 0.03, tau: 1.2, pan: 0.4 });
  glass(tResp + 0.45, 'A6', { gain: 0.03, tau: 3.5, pan: -0.2 });                                                                    // un dernier tintement suspendu
  // g3 : l'espoir (sucre protecteur) — la nappe se rouvre, la harpe monte
  pad(tg3 - 0.1, tSurv - tg3 + 0.15, ['A2', 'E3', 'A3', 'B3'], { gain: 0.05, att: 1.0, rel: 0.8, bright: 0.25 });          // ré sus2 : ouvert, ni majeur ni mineur
  ['D4', 'A4', 'B4', 'D5', 'E5', 'A5', 'B5', 'D6'].forEach((n, k) => harp(tSuc + 0.12 + k * 0.17, n, { gain: 0.04 + 0.002 * k, pan: -0.5 + k * 0.14, t60: 2.2 }));
  glass(wt('g3', 'cellules') + 0.02, 'E6', { gain: 0.04, tau: 2.2, pan: 0.2 });
  pad(tSurv - 0.05, tg4 - tSurv + 0.25, ['A2', 'E3', 'A3', 'C#4', 'E4'], { gain: 0.06, att: 0.18, rel: 0.5, bright: 0.4 });
  [['A5', 0, -0.3], ['C#6', 0.04, 0], ['E6', 0.08, 0.3]].forEach(([n, d, p]) => glass(tSurv + d, n, { gain: 0.06, pan: p, tau: 2.4 }));
  // g4 : lumière — ré majeur, kalimba, harpe, flûte
  pad(tg4 - 0.1, s1 - tg4 + 0.8, ['A2', 'D3', 'F#3', 'A3', 'E4'], { gain: 0.058, att: 0.25, rel: 1.4, bright: 0.38 });
  glass(tg4 + 0.02, 'D6', { gain: 0.07, tau: 3 }); glass(tg4 + 0.06, 'A6', { gain: 0.05, tau: 3, pan: 0.2 });
  const mel = ['D5', 'F#5', 'A5', null, 'B5', 'A5', 'F#5', null, 'D5', 'F#5', 'A5', 'B5', 'D6', null, 'A5', 'F#5'], gm = grid(tg4 + 0.4, s1 - 0.5, 0.31);
  for (let k = 0; k < gm.n; k++) if (mel[k % mel.length]) kalimba(gm.t(k), mel[k % mel.length], { gain: 0.05, pan: Math.sin(k * 1.3) * 0.5, decay: 1.2 });
  const hp = ['D3', 'A3', 'F#4', 'A3'], gh = grid(tg4 + 0.2, s1 - 0.4, 0.62); for (let k = 0; k < gh.n; k++) harp(gh.t(k), hp[k % 4], { gain: 0.04, pan: -0.25 });
  const tD = wt('g4', 'dégèle'); [['D7', 0, 0.3], ['A6', 0.07, -0.2], ['F#6', 0.14, 0.15], ['E6', 0.21, -0.35]].forEach(([n, d, p]) => glass(tD + d, n, { gain: 0.035, tau: 1.8, pan: p }));
  flute(tD + 0.05, 0.55, 'F#5', { gain: 0.045 }); flute(wt('g4', 'reprend'), 0.5, 'A5', { gain: 0.045 }); flute(wt('g4', 'vie'), 0.45, 'B5', { gain: 0.045 }); flute(wt('g4', 'rien'), 0.4, 'D6', { gain: 0.045 }); flute(wt('g4', "n'était"), 1.0, 'A5', { gain: 0.05 });
}
function musMexique() {                                  // MEXIQUE : chaude ; guitare nylon, shaker, pulsation tranquille ; un peu de mystère ; montée au jet puis coup comique
  rnd = mkRnd(303); B = BUS.music; const [s0, s1] = SEG.lez, tl1 = ph('l1').t0, tl2 = ph('l2').t0, tl3 = ph('l3').t0, tl4 = ph('l4').t0;
  const AM = ['A2', 'E3', 'A3', 'C4', 'E4'], GM = ['G2', 'D3', 'G3', 'B3', 'D4'], FM = ['F2', 'C3', 'F3', 'A3', 'C4'], EM = ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'];
  const tSq = firstEv(['squirt'], tl2, tl3) ?? wt('l2', 'yeux'), tGr = firstEv(['yelp', 'shake', 'splat'], tl4, SEG.lyc[0]) ?? wt('l4', 'désagréable');
  // l1 : le désert au crépuscule (andalouse : la sol fa mi)
  const c1 = [[tl1, wt('l1', 'lézards'), AM, 0.045], [wt('l1', 'lézards'), wt('l1', 'arme'), GM, 0.045], [wt('l1', 'arme'), wt('l1', 'improbable'), FM, 0.045], [wt('l1', 'improbable'), tl2 - 0.05, EM, 0.05]];
  c1.forEach(([a, b, ch, g], k) => finger(a, b, ch, { gain: g, fadeIn: k === 0, pat: [0, 2, 3, null, 4, 3, 2, null] }));
  for (let x = tl1 + 0.1; x < tl2 - 0.3; x += 0.79 * 2) dLow(x, 0.5);
  { const g = grid(tl1 + 0.3, tl2 - 0.2, 0.395); for (let k = 0; k < g.n; k++) shaker(g.t(k), { gain: 0.022 * (k % 2 ? 1.15 : 0.7), pan: k % 2 ? 0.3 : -0.3, accent: k % 2 ? 1.2 : 0.8 }); }
  flute(wt('l1', 'improbable'), 1.3, 'E4', { gain: 0.04, vib: 0.01 }); glass(wt('l1', 'improbable') + 0.2, 'G#5', { gain: 0.03, pan: 0.3 });
  // l2 : la menace (la-sib), puis montée jusqu'au jet
  const tIls = wt('l2', 'ils'); pad(tl2 - 0.1, tSq - tl2 - 0.1, ['A2', 'Bb2', 'F3', 'D4'], { gain: 0.04, att: 0.9, rel: 0.4, bright: 0.05 });
  [0, 0.4, 0.8, 1.2].forEach((d, k) => nylon(tl2 + 0.1 + d, k % 2 ? 'Bb2' : 'A2', { gain: 0.055, t60: 1.2 }));
  { const g = grid(tIls, tSq, 0.32); const up = ['A2', 'E3', 'A3', 'C4', 'E4', 'A4', 'C5', 'E5', 'A5', 'C6', 'E6']; for (let k = 0; k < g.n; k++) { const u = k / g.n; nylon(g.t(k), up[Math.min(up.length - 1, Math.floor(u * up.length))], { gain: 0.045 + 0.02 * u, t60: 1.2 }); shaker(g.t(k) + 0.1, { gain: 0.012 + 0.03 * u, accent: 1 }); if (k > g.n * 0.4) shaker(g.t(k) + 0.05, { gain: 0.012 + 0.025 * u }); } }
  { const g = grid(wt('l2', 'projeter'), tSq - 0.05, 0.14); for (let k = 0; k < g.n; k++) dHi(g.t(k), 0.2 + 0.5 * k / g.n, { f: 300 + 14 * k }); }
  [['A2', 0], ['E3', 0.012], ['A3', 0.024], ['C4', 0.036], ['E4', 0.048], ['A4', 0.06]].forEach(([n, d]) => nylon(tSq + d, n, { gain: 0.08, t60: 2.4 }));      // accord plaqué au jet
  dMid(tSq, 0.9); dLow(tSq, 0.8); glass(tSq + 0.02, 'A5', { gain: 0.04, tau: 2 }); glass(tSq + 0.05, 'E6', { gain: 0.03, tau: 2, pan: 0.3 });
  // l3 : la règle, gamme pentatonique qui monte jusqu'à « mètre »
  { const a = wt('l3', 'jet'), b = wt('l3', 'mètre'), n = 6, idx = [0, 1, 2, 3, 4, 5]; idx.forEach((i, k) => marimba(a + (b - a) * k / n, PENTA_A[i + 3], { gain: 0.06, pan: -0.3 + 0.12 * k }));
    marimba(b, PENTA_A[9], { gain: 0.07 }); glass(b + 0.02, 'A5', { gain: 0.04, tau: 2.4 }); finger(b, tl4 - 0.05, AM, { gain: 0.045, nominal: 0.395 }); }
  // l4 : « Et le plus fou ? » — pizzicati malicieux ; la grimace du coyote : coup comique
  const tCe = wt('l4', 'Ce');
  [['E3', 0], ['A2', 0.4]].forEach(([n, d]) => bassPluck(tl4 + 0.05 + d, n, { gain: 0.13, t60: 0.9 })); wood(wt('l4', 'fou') + 0.05, 0.6, 900, -0.2);
  { const g = grid(tCe, tGr - 0.15, 0.395); const ns = ['A2', 'C3', 'E3', 'G3', 'A3']; for (let k = 0; k < g.n; k++) { nylon(g.t(k), ns[k % ns.length], { gain: 0.045, t60: 1 }); if (k % 2) wood(g.t(k) + 0.1, 0.35, 1100, 0.3); } }
  reed(tGr, NOTE('Bb3'), NOTE('A3'), 0.22, { gain: 0.07 }); reed(tGr + 0.26, NOTE('A3'), NOTE('Ab3'), 0.22, { gain: 0.07 }); reed(tGr + 0.52, NOTE('Ab3'), NOTE('G3'), 0.22, { gain: 0.07 }); reed(tGr + 0.78, NOTE('G3'), NOTE('E3'), 0.85, { gain: 0.08, growl: 0.5 });
  wood(tGr, 0.8, 800, 0); dLow(tGr + 0.02, 0.7);
  { const t2 = tGr + 1.7, a = Math.min(t2, s1 - 1.2); ['E5', 'D5', 'C5', 'A4'].forEach((n, k) => marimba(a + k * 0.14, n, { gain: 0.04, pan: 0.2 })); }
  const tPre = wt('l4', 'prédateurs'); [['A2', 0], ['E3', 0.02], ['A3', 0.04], ['C#4', 0.06], ['E4', 0.08]].forEach(([n, d]) => nylon(tPre + d, n, { gain: 0.06, t60: 2.4 })); wood(tPre + 0.5, 0.6, 1000);
  pad(tPre - 0.1, s1 - tPre + 0.5, ['A2', 'E3', 'A3', 'C#4'], { gain: 0.04, att: 0.5, rel: 1.2, bright: 0.2 });
}
function musAfrique() {                                  // AFRIQUE : kalimba et marimba (pentatonique de sol), petits tambours qui accélèrent, pulsation de marche qui s'emballe
  rnd = mkRnd(404); B = BUS.music; const [s0, s1] = SEG.lyc, ty1 = ph('y1').t0, ty2 = ph('y2').t0, ty3 = ph('y3').t0, ty4 = ph('y4').t0;
  const tRun = firstEv(['run'], ty4 - 1, s1) ?? wt('y4', 'nez'), tOui = ty4;
  pad(s0 + 0.4, ty2 - s0 - 0.1, ['D3', 'A3', 'B3', 'G3'], { gain: 0.04, att: 1.3, rel: 1.0, bright: 0.12 });
  // y1 : l'aube, très clairsemé ; un appel de flûte lointain
  flute(s0 + 0.3, 1.3, 'D5', { gain: 0.032, send: 0.85 }); flute(s0 + 1.7, 1.2, 'B4', { gain: 0.03, send: 0.85 }); flute(s0 + 3.0, 1.6, 'G4', { gain: 0.03, send: 0.85 });
  [['Afrique', 'D5', -0.3], ['lycaons', 'A4', 0.3], ['façon', 'E5', -0.2], ['particulière', 'B4', 0.25], ['décisions', 'D5', 0]].forEach(([w, n, p]) => kalimba(wt('y1', w), n, { gain: 0.05, pan: p, decay: 1.5 }));
  [['G3', 0], ['B3', 0.12], ['D4', 0.24]].forEach(([n, d]) => marimba(wt('y1', 'éternuent') + d, n, { gain: 0.05 })); dLow(wt('y1', 'éternuent') + 0.05, 0.6);
  // tempo : 84 à 108 ; à la course de la meute, ça s'emballe
  const bpm = t => t < ty3 ? 84 : t < tRun ? lerp(84, 112, sm((t - ty3) / (tRun - ty3))) : lerp(128, 142, clamp((t - tRun) / 3));
  const beats = []; { let t = ty2 - 0.1; while (t < s1 - 0.1) { beats.push(t); t += 60 / bpm(t); } }
  pad(ty2 - 0.1, s1 - ty2 + 0.4, ['D3', 'G3', 'B3', 'D4'], { gain: 0.036, att: 0.7, rel: 1.0, bright: 0.2 });
  beats.forEach((t, k) => {
    const u = clamp((t - ty2) / (s1 - ty2)), run = t >= tRun;
    if (k % 2 === 0) dLow(t, 0.55 + 0.25 * u + (run ? 0.1 : 0), { pan: -0.2 }); else dMid(t, 0.4 + 0.2 * u, { f: 215 + 20 * (k % 4 === 1 ? 1 : 0), pan: 0.25 });
    const half = 30 / bpm(t); shaker(t + half, { gain: 0.016 + 0.014 * u, pan: -0.3 + 0.6 * (k % 2), accent: 1 }); if (bpm(t) > 105) { shaker(t + half / 2, { gain: 0.012 }); shaker(t + half * 1.5, { gain: 0.012 }); }
    if (t > ty3 - 0.1 && k % 2 === 1) wood(t + half, 0.4 + 0.2 * u, 1150, 0.35);
    const o8 = ['G3', 'B3', 'D4', 'G3', 'B3', 'D4', 'E4', 'D4'];                                                                       // 3 + 3 + 2 sur huit croches
    for (let j = 0; j < 2; j++) { const tt = t + j * half, st = (k * 2 + j) % 8; if (t < ty2 + 0.1 && j === 0) continue; const hi = run ? 12 : 0; marimba(tt, hi ? NOTE(o8[st]) * 2 : o8[st], { gain: (st % 3 === 0 ? 0.05 : 0.036) * (0.7 + 0.5 * u), pan: -0.25 + 0.5 * (st / 7) }); }
  });
  // appels du kalimba, de plus en plus hauts avec les éternuements
  [['rassemblent', 'D6'], ['rassemblent', 'B5', 0.3], ['rassemblent', 'G5', 0.6]].forEach(([w, n, d = 0]) => kalimba(wt('y2', w) + d, n, { gain: 0.05, pan: 0.3, decay: 1.4 }));
  [["d'éternuements", 'A5'], ['plus', 'B5', 1], ['groupe', 'D6'], ['chances', 'E6'], ['partir', 'G6']].forEach(([w, n, k = 0], i) => kalimba(wt('y3', w, k), n, { gain: 0.05 + 0.004 * i, pan: -0.3 + 0.15 * i, decay: 1.2 }));
  for (const e of EVENTS) if (e.type === 'sneeze' && e.t >= ty3 && e.t < ty4) dHi(e.t + 0.12, 0.5, { f: 330 * Math.pow(1.06, clamp(e.v, 0.8, 1.3) * 4) });
  // y4 : le gag (« voter avec son nez ») puis la meute file vers le soleil
  [['Oui', 'G5'], ['lycaons', 'E6'], ['voter', 'D6'], ['nez', 'G6']].forEach(([w, n], i) => kalimba(wt('y4', w) + (w === 'nez' || w === 'voter' ? 0.30 : 0), n, { gain: 0.055, pan: -0.3 + 0.2 * i, decay: 1.3 }));
  flute(tRun - 0.05, 0.35, 'E5', { gain: 0.04 }); flute(tRun + 0.4, 0.35, 'D5', { gain: 0.04 }); flute(tRun + 0.8, 0.35, 'B4', { gain: 0.04 }); flute(tRun + 1.2, 0.3, 'D5', { gain: 0.04 });
  const tNez = wt('y4', 'nez'); [['G2', 0], ['D3', 0.02], ['G3', 0.04], ['B3', 0.06], ['D4', 0.08]].forEach(([n, d]) => nylon(Math.max(tNez + 0.3, tRun) + d + 0.1, n, { gain: 0.06, t60: 2.4 }));      // l'accord arrive APRÈS « nez » (il le couvrait)
  glass(Math.max(tNez + 0.3, tRun) + 0.12, 'G6', { gain: 0.04, tau: 2.4 });
}
function musFin() {                                      // QUESTION FINALE : légère, curieuse, suspendue (sur la dominante ; la marque résout en ré)
  rnd = mkRnd(505); B = BUS.music; const [s0, s1] = SEG.fin, tf = ph('fin').t0, tSur = wt('fin', 'surpris');
  pad(s0 - 0.1, T_LOGO - s0 - 0.5, ['A2', 'E3', 'B3', 'E4'], { gain: 0.05, att: 0.7, rel: 0.35, bright: 0.2 });
  [['Alors', 'E5', -0.3], ['laquelle', 'A5', 0.3], ['trois', 'B5', -0.2], ['anecdotes', 'E5', 0.2]].forEach(([w, n, p]) => kalimba(wt('fin', w), n, { gain: 0.05, pan: p, decay: 1.3 }));
  kalimba(wt('fin', 'plus'), 'A4', { gain: 0.045 }); kalimba(tSur, 'A5', { gain: 0.055, decay: 1.6 }); kalimba(tSur + 0.22, 'B5', { gain: 0.06, decay: 2.2 });
  glass(tSur + 0.5, 'E6', { gain: 0.04, tau: 3.2, pan: 0.2 }); flute(tSur + 0.3, Math.max(0.6, s1 - tSur - 0.5), 'E5', { gain: 0.035, send: 0.7 });
  glass(s1 - 0.8, 'A6', { gain: 0.03, tau: 2.5, pan: -0.2 });
}
function musSortie() {                                   // SORTIE : l'accord de ré de la marque (comme la vidéo 2) qui résout la suspension
  rnd = mkRnd(606); B = BUS.music;
  pad(T_LOGO - 0.04, DUR - 1.0 - T_LOGO + 0.04, ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], { gain: 0.07, att: 0.25, rel: 1.2, bright: 0.45 });
}

// ───────── ambiances de la vidéo : sections et sous-sections ─────────
function ambiances() {
  B = BUS.amb; const [, iEnd] = SEG.intro, [gS, gE] = SEG.gre, [lS, lE] = SEG.lez, [yS, yE] = SEG.lyc, [fS, fE] = SEG.fin;
  const tTrois = ph('trois').t0, tg2 = ph('g2').t0, tg3 = ph('g3').t0, tg4 = ph('g4').t0, tCoeur = wt('g2', 'cœur'), tArr = wt('g2', "s'arrête"), tResp = wt1('g2', 'respirer'), tSurv = wt('g3', 'survit');
  const tSpring = tg4 - 0.12, tSq = firstEv(['squirt'], ph('l2').t0, ph('l3').t0) ?? wt('l2', 'yeux'), tMen = wt('l2', 'menacés'), tIls = wt('l2', 'ils');
  // ─ hiver : vent froid + souffle de neige (intro, g1, g2, g3) ; le vent retombe quand le cœur s'arrête
  const hiverEnd = tSpring + 0.9, dip = x => x < tTrois ? 1 : x < tCoeur ? lerp(1, 0.85, sm((x - tTrois) / 0.5)) : x < tArr + 0.8 ? lerp(0.85, 0.5, sm((x - tCoeur) / (tArr + 0.8 - tCoeur))) : x < tg3 ? 0.5 : x < tSurv ? lerp(0.5, 0.65, sm((x - tg3) / (tSurv - tg3))) : lerp(0.65, 0.08, sm((x - tSurv) / (tSpring - tSurv + 0.5)));
  layer(0, hiverEnd, { name: 'wind_hiver', rms: -33.5, fi: 0.4, fo: 0.5, send: 0.3, mul: dip }, genWind({ f0: 330, q: 2.2, whistle: 0.3, rumble: 0.5, seed: 11, depth: 1.0, hiss: 0.02 }));
  layer(0, hiverEnd, { name: 'hush_hiver', rms: -47, fi: 0.4, fo: 0.8, send: 0.25, mul: x => dip(x) * 0.9 + 0.1 }, genHush({ seed: 12 }));
  layer(0, hiverEnd, { name: 'sparkle_hiver', rms: -55, fi: 1, fo: 1, send: 0.4, mul: x => x < tCoeur || x > tResp ? 1 : 0.3 }, genSparkle({ seed: 13, rate: 2.2 }));
  // plan « trois » (aube en lisière de prairie) : quelques oiseaux très lointains par-dessus le vent froid
  layer(tTrois - 0.1, iEnd + 0.3, { name: 'birds_trois', rms: -54, fi: 0.5, fo: 0.4, send: 0, mul: null }, genBirds({ seed: 14, rate: () => 0.9, species: [['tsit', 1], ['whistle', 1], ['chick', 1]], gain: 0.05, far: 0.9, scale: [0.85, 1.0], sendFar: 0.9, sendNear: 0.9 }));
  // ─ dégel : ruisseau de fonte, gouttes, oiseaux de printemps de plus en plus nombreux, léger vent doux
  const sprS = tSurv - 0.8, sprE = gE + 0.25;
  layer(sprS, sprE, { name: 'stream', rms: -38, fi: 1.6, fo: 0.5, send: 0.25, mul: x => 0.2 + 0.8 * sm((x - sprS) / (tg4 + 1 - sprS)) }, genStream({ seed: 31, bubbles: 70, drips: 0.5 }));
  layer(tg4 - 0.2, sprE, { name: 'birds_print', rms: -44, fi: 0.5, fo: 0.5, send: 0, mul: null }, genBirds({ seed: 42, rate: x => lerp(0.5, 1.2, clamp((x - tg4) / (gE - tg4))), species: [['tsit', 1.2], ['whistle', 1], ['trill', 0.8], ['chick', 0.8], ['warble', 0.6]], gain: 0.07, far: 0.45, scale: [0.9, 1.15] }));
  layer(tg4 - 0.1, sprE, { name: 'wind_print', rms: -47, fi: 1, fo: 0.5, send: 0.3 }, genWind({ f0: 520, q: 1.2, whistle: 0.05, rumble: 0.2, seed: 15, depth: 0.7 }));
  // ─ désert du soir : grillons, cigales, vent chaud, sable, un hibou au loin ; les grillons se taisent quand le coyote approche
  const dS = lS - 0.15, dE = lE + 0.25, hush = x => x < tMen ? 1 : x < tSq + 1.2 ? 0.28 : lerp(0.28, 1, sm((x - tSq - 1.2) / 1.2));
  layer(dS, dE, { name: 'crickets_d', rms: -41, fi: 0.5, fo: 0.5, send: 0.2, mul: hush }, genCrickets({ n: 6, seed: 3, fc: [4150, 4850], rate: [1.7, 3.1], pulses: [3, 5], pr: [36, 52] }));
  layer(dS, dE, { name: 'cicada_d', rms: -48, fi: 0.8, fo: 0.8, send: 0.5, mul: hush }, genCicada({ seed: 5, bursts: [[lS + 1.0, 3.6, 1, -0.5], [lS + 6.8, 3.0, 0.9, 0.55], [tSq + 2.2, 3.4, 1, -0.4], [lE - 5.2, 3.2, 1, 0.4]] }));
  layer(dS, dE, { name: 'wind_d', rms: -35.5, fi: 0.6, fo: 0.6, send: 0.3 }, genWind({ f0: 280, q: 1.6, whistle: 0.08, rumble: 0.4, seed: 16, depth: 0.8, wf: 1000, rate: 0.8 }));
  layer(dS, dE, { name: 'hush_d', rms: -47, fi: 0.8, fo: 0.8, send: 0.3 }, genHush({ seed: 17, f: 3200 }));
  layer(dS, dE, { name: 'hoots_d', rms: -54, fi: 0.1, fo: 0.1, send: 0 }, genHoots({ seed: 18, times: [[lS + 3.2, -0.6], [lE - 3.0, 0.6]], gain: 0.06, f: 1 }));
  // ─ savane à l'aube : insectes qui s'éteignent, oiseaux qui s'éveillent, vent dans les herbes (se lève quand la meute court)
  const aS = yS - 0.15, aE = fE - 0.8, tRun = firstEv(['run'], ph('y4').t0 - 1, yE) ?? wt('y4', 'nez'), fade = x => x < yE ? 1 : lerp(1, 0.55, sm((x - yE) / 0.6));
  layer(aS, aE, { name: 'crickets_s', rms: -41, fi: 0.5, fo: 0.9, send: 0.2, mul: x => lerp(1, 0.4, sm((x - yS) / (yE - yS))) * fade(x) }, genCrickets({ n: 5, seed: 7, fc: [3200, 3800], rate: [1.2, 2.2], pulses: [4, 7], pr: [26, 38] }));
  layer(aS, aE, { name: 'cicada_s', rms: -48, fi: 0.8, fo: 0.8, send: 0.5, mul: x => lerp(1, 0.4, sm((x - yS) / (yE - yS))) * fade(x) }, genCicada({ seed: 8, f: 5600, bursts: [[yS + 0.8, 3.4, 1, -0.45], [yS + 5.5, 3.2, 0.9, 0.5], [yS + 10, 3.0, 0.8, -0.3]] }));
  layer(aS, aE, { name: 'birds_s', rms: -42.5, fi: 0.5, fo: 0.9, send: 0.3, mul: x => lerp(0.6, 1, sm((x - yS) / (yE - yS))) * fade(x) }, genBirds({ seed: 43, rate: x => lerp(0.5, 0.9, clamp((x - yS) / (yE - yS))), species: [['coo', 1], ['hoopoe', 0.8], ['rasp', 0.7], ['whistle', 1], ['trill', 0.8], ['tsit', 1]], gain: 0.07, far: 0.7, scale: [0.85, 1.1] }));
  layer(aS, aE, { name: 'wind_s', rms: -37.5, fi: 0.6, fo: 0.9, send: 0.3, mul: x => (x < tRun ? lerp(0.8, 1, sm((x - yS) / (yE - yS))) : 1.25) * fade(x) }, genWind({ f0: 760, q: 0.9, whistle: 0.03, rumble: 0.25, seed: 19, depth: 0.9, hiss: 0.1, wf: 2300, rate: 0.9 }));
  layer(aS, aE, { name: 'hush_s', rms: -48, fi: 0.8, fo: 0.9, send: 0.3, mul: x => (x < tRun ? 0.7 : 1.3) * fade(x) }, genHush({ seed: 20, f: 2600 }));
}

// ───────── bruitages : un son par type d'événement (crête finale visée en dBFS dans LV) ─────────
const LV = {                                             // niveau de l'événement avant mastering, exprimé en « crête finale visée » (dBFS) corrigée de l'écart mesuré dû à la réverbération : la crête finale mesurée est dans son_notes.md
  ding: -11.8, no: -10, label: -10, blip: -12, counter: -10, pop: -10, scribble: -12.8, page: -10.1, scan: -11.9, zoom: -11.2, whoosh: -8.4, reveal: -7.5, suspense: -11.3, wind: -11, snowfall: -14, frost: -11.7, crack: -7, drip: -10, thaw: -12.9,
  heartbeat: -8, beep: -10.4, flatline: -11.8, glow: -11.3, sparkle: -11.3, ribbit: -7, hop: -10, step: -10, sniff: -10.1, squirt: -7, splat: -6, yelp: -7.1, shake: -9, sneeze: -6, yip: -8.1, run: -10, ruler: -10.2, bird: -12.3, vote: -8.1,
  endCard: -9.6, logo: -5.6, letters: -8.7, swoosh: -9, thud: -7, stamp: -8,
};
const surfaceAt = t => { const s = segAt(t); return s === 'lez' ? 'sand' : t < ph('trois').t0 ? 'snow' : s === 'intro' ? 'grass' : s === 'gre' ? (t < ph('g4').t0 - 0.2 ? 'snow' : 'wet') : 'grass'; };
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
  hop(x) { const sf = surfaceAt(x); tone(x, 0.12, { f0: 130, f1: 70, curve: 0.5, gain: 0.12, att: 0.002, rel: 0.03, dec: 0.04, send: 0.15 }); if (sf === 'snow') nzb(x, 0.08, { type: 'lp', f0: 1500, f1: 400, gain: 0.07, att: 0.003, rel: 0.05 }); else { nzb(x, 0.1, { f0: 2200, f1: 1500, q: 1, gain: 0.1, att: 0.003, rel: 0.07 }); for (let k = 0; k < 5; k++) nzb(x + 0.01 + 0.02 * k * (0.5 + rnd()), 0.012, { type: 'hp', f0: 3000 + 2000 * rnd(), gain: 0.04, att: 0.0005, rel: 0.007, pan: rr(-0.4, 0.4) }); } },
  step(x) {
    const sf = surfaceAt(x), s = 0.85 + 0.3 * rnd(), pan = rr(-0.25, 0.25);
    if (sf === 'snow') { nzb(x, 0.14, { f0: 1500 * s, f1: 700, q: 0.9, gain: 0.12, att: 0.004, rel: 0.09, pan }); for (let k = 0; k < 6; k++) nzb(x + 0.01 + k * 0.016 * (0.6 + 0.8 * rnd()), 0.01, { type: 'hp', f0: 2500 + 2500 * rnd(), gain: 0.05, att: 0.0004, rel: 0.006, pan }); tone(x, 0.1, { f0: 110, f1: 70, gain: 0.07, att: 0.003, rel: 0.03, dec: 0.04, pan }); }
    else if (sf === 'sand') { nzb(x, 0.16, { f0: 3500 * s, f1: 2200, q: 0.6, gain: 0.07, att: 0.006, rel: 0.1, pan }); tone(x, 0.09, { f0: 100, f1: 65, gain: 0.07, att: 0.003, rel: 0.03, dec: 0.04, pan }); nzb(x + 0.02, 0.08, { type: 'lp', f0: 900, f1: 300, gain: 0.05, att: 0.01, rel: 0.05, pan }); }
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
  bird(x, v) { const ty = Math.round(clamp(v, 0, 3)), sc = segAt(x), s = sc === 'lez' ? 0.85 : sc === 'lyc' ? 0.95 : 1.05, o = { gain: 0.12, pan: rr(-0.5, 0.5), send: 0.5 };
    if (ty === 0) BIRD.tsit(x, s, o); else if (ty === 1) BIRD.whistle(x, s, o); else if (ty === 2) BIRD.trill(x, s, o);
    else { nzb(x, 0.35, { f0: 900, f1: 2400, q: 0.8, gain: 0.1, att: 0.01, rel: 0.15, am: 0.9, arate: 14, pan: -0.3, panTo: 0.5, send: 0.3 }); BIRD.chick(x + 0.12, s, o); } },
  vote(x) { nzb(x, 0.16, { f0: 2500, f1: 1200, q: 1, gain: 0.08, att: 0.01, rel: 0.08, pan: -0.2, panTo: 0.1 }); tone(x + 0.16, 0.12, { f0: 160, f1: 90, curve: 0.5, gain: 0.18, att: 0.002, rel: 0.03, dec: 0.05, harm: [1, 0.4], send: 0.2 }); nzb(x + 0.16, 0.05, { type: 'lp', f0: 500, gain: 0.1, att: 0.001, rel: 0.03 }); marimba(x + 0.28, 'G5', { gain: 0.08, tau: 0.4 }); marimba(x + 0.37, 'D6', { gain: 0.08, tau: 0.5 }); },
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
// Bruitages en retrait sous la voix : −11 dB quand le début du bruitage tombe sur un mot (la fin d'une phrase est souvent très douce : mesuré sur le film, le jet de sang
// couvrait « yeux » de 17 dB et la reconnaissance de parole lisait « l'heure » ; l'urne et l'éternuement couvraient « nez »). Les sons de réussite et de marque restent entiers.
const DUCK_EXEMPT = new Set(['ding', 'no', 'endCard', 'logo', 'letters']);
const WORDS_ALL = TLJ.phrases.flatMap(p => p.words);
function duckFactor(t, type) {
  if (DUCK_EXEMPT.has(type)) return 1;
  let ov = 0; const a = t, b = t + 0.9;
  for (const w of WORDS_ALL) { const x0 = w.t0 - 0.04, x1 = w.t1 + 0.10; ov += Math.max(0, Math.min(b, x1) - Math.max(a, x0)); }
  return Math.pow(10, -11 * Math.min(1, ov / 0.9) / 20);
}
// les bruitages « de bruit » (éternuement, jet, éclaboussure, couinement, reniflement, secousse, urne) dont le début tombe DANS un mot sont retardés jusqu'à la fin du mot (au plus 0,35 s) :
// mesuré, l'éternuement tombait sur « nez » (la chute de la blague) et la reconnaissance de parole lisait « nom ».
const SHIFT_TYPES = new Set(['sneeze', 'squirt', 'splat', 'yelp', 'sniff', 'shake', 'vote']);
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
    const et = shiftOffWord(e.t, e.type), off = Math.max(0, Math.floor((et - 0.4) * SR)); CAP.off = off; CAP.lo = 1e12; CAP.hi = -1; B = CAP;
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
  add('shaker', null, t => { for (let k = 0; k < 4; k++) shaker(t + k * 0.3, { gain: 0.03 }); }); add('drums', null, t => { dLow(t); dMid(t + 0.5); dHi(t + 1); wood(t + 1.5); }); add('heart', null, t => thumpMusic(t));
  for (const b of Object.keys(BIRD)) add('bird_' + b, null, t => BIRD[b](t, 1, { gain: 0.1, pan: 0, send: 0.3 }));
  fs.mkdirSync('build/test', { recursive: true }); fs.writeFileSync('build/test/demo.json', JSON.stringify(list, null, 1));
}
const want = k => !ONLY || ONLY === k;
if (ONLY === 'demo') demo();
if (ONLY !== 'demo' && want('music')) { musIntro(); musAlaska(); musMexique(); musAfrique(); musFin(); musSortie(); }
if (ONLY !== 'demo' && want('amb')) ambiances();
if (ONLY !== 'demo' && want('sfx')) runSfx();

// ───────── la chute de la blague : musique et ambiances baissées de 8 dB sur « nez » ─────────
// (mesuré : musique et ambiances ensemble faisaient lire « nom » par la reconnaissance de parole, alors que chacune seule laisse lire « nez »)
{
  const nez = P.y4.words.filter(w => norm(w.w) === 'nez')[0];
  if (nez) {
    const a0 = nez.t0 - 0.25, a1 = nez.t1 + 0.35, ramp = 0.06, lo = Math.pow(10, -8 / 20);
    for (const k of ['music', 'amb']) {
      const b = BUS[k];
      for (let i = Math.max(0, Math.floor((a0 - ramp) * SR)); i < Math.min(N, Math.floor((a1 + ramp) * SR)); i++) {
        const x = i / SR, f = Math.min(1, Math.max(0, (x - (a0 - ramp)) / ramp), Math.max(0, (a1 + ramp - x) / ramp)), g = 1 - (1 - lo) * f;
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
const TRIM = { music: 1, amb: 1, sfx: 1 };
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
console.log('score :', OUT, (N / SR).toFixed(2), 's, crête', peak.toFixed(3), g < 1 ? '(baissée de ' + vdb(g).toFixed(1) + ' dB)' : '');
