'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_lycaon.js — segment AFRIQUE (lycaons), 8 plans calés sur la voix (préfixe ly_)
     y1_savane   large : savane de l'Okavango à l'aube, brume, acacias, la meute au repos en contre-jour, un lycaon se lève   « En Afrique, les lycaons ont une façon très particulière de prendre des »
     y1_atchoum  plan moyen : un lycaon regarde, inspire, ÉTERNUE (gouttelettes dans la lumière rasante), un second répond   « décisions : ils éternuent ! »
     y2_reveil   les lycaons se dressent, oreilles pointées vers le soleil                                                  « Avant de partir chasser, »
     y2_rassemble  ils arrivent de toutes parts en trottant, se retrouvent en cercle, salutations, queues qui battent         « les membres de la meute se rassemblent. »
     y3_vote     le cercle : chaque éternuement fait monter le compteur ATCHOUM xN et la jauge DÉPART                        « Plus il y a d'éternuements, plus le groupe a de »
     y3_depart   la jauge est pleine : la meute part d'un seul bloc dans la poussière dorée                                   « chances de partir ! »
     y4_urne     l'urne de vote posée dans la savane (gag)                                                                  « Oui, chez les lycaons, on peut »
     y4_nez      gros plan : un énorme nez dépose le bulletin « OUI » dans l'urne, puis éternue ; case 3/3 cochée           « littéralement voter avec son nez ! »
   TOUT est calé sur wt() / wt1() (ly_A : instants absolus des mots, remplis par buildLycaon) : aucune seconde écrite en dur pour un mot ;
   les coupes tombent 0,10 s avant un début de mot. Les durées des mouvements (éternuement, pas, chute du bulletin) sont fixes, leur DÉPART est calé sur la voix.
   Sprites : sc_lycaon_sprites.js (ly_dog, ly_pack, ly_nose, ly_ballot, ly_sneezeFx, ly_atchoum) ; décor : kit.js et flore.js.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ───────────── ancres de la voix (instants ABSOLUS, remplis par buildLycaon ; repli pour le préchauffage) ─────────────
const ly_A = {};
const ly_rel = (name, sh) => (ly_A[name] ?? 0) - ((sh && sh.t0) || 0);

const LY_ENV = 'savannaDawn';

// ───────────── décor commun : la savane à l'aube (horizon constant par plan : un cache par valeur) ─────────────
// o : hz (horizon), cam, clouds, seed ; renvoie { H, sun }
function ly_back(u, t, o = {}) {
  const hz = o.hz ?? 300, cam = o.cam || 0;
  const b = k_backdrop(LY_ENV, t, { horizon: hz, cam, clouds: o.clouds ?? 3, seed: o.seed ?? 1, base: hz + 60 });
  return b;
}

// ───────────── plan 1 : y1_savane ─────────────
// meute au repos : [x, y, échelle, pose, graine, sens (1 : vers la droite), repos]
const LY_REST = [
  [40, 298, 0.46, 'lie', 11, 1, 0], [236, 300, 0.46, 'stand', 55, -1, 0], [134, 306, 0.6, 'sit', 22, 1, 0], [56, 344, 0.9, 'lie', 44, 1, 1], [212, 348, 0.9, 'lie', 33, -1, 0],
];
function ly_y1(u, t, sh) {
  const cam = k_pan(u, 0, -14, 'io', 3.6), hz = 266, E = LY_ENV;
  const b = ly_back(u, t, { hz, cam, clouds: 4 });
  k_birds(t, { y: 96, x: 20, speed: 9, cam, n: 7, col: DU[1] });
  fl_savannaSoil(hz, LH, { env: E, seed: 5, cam, t, depth: 0.1, cracks: 0.5, pebbles: 24 });
  fl_acacia(t, { x: 36, y: hz + 10, h: 36, env: E, depth: 0.78, sil: true, seed: 5, cam, kind: 'tortilis' });
  fl_acacia(t, { x: 216, y: hz + 8, h: 30, env: E, depth: 0.82, sil: true, seed: 2, cam, kind: 'lean' });
  k_haze(hz - 6, hz + 56, '#ffc880', 0.38, { t, cam, profile: 'top', seed: 9, wisp: 1 });
  fl_acacia(t, { x: 118, y: hz + 22, h: 66, env: E, depth: 0.5, seed: 3, cam, kind: 'tortilis', cw: 160 });
  LY_REST.forEach(([x, y, s, pose, seed, d, rest], i) => {
    let o = { pose, seed, flip: d < 0, rest, env: E, sil: 0.9, rim: 1, fog: y < 310 ? 0.2 : 0, shadow: 0.7 };
    if (i === 2) { const g = u - 2.0; if (g > 0) { o.pose = 'stand'; } if (g > 0.9) o.pose = 'look'; if (g > 0) k_dustKick(x - cam, y, t - g, t, { col: 'soil', size: 0.7 }); }
    ly_dog(x - cam, y, s, t, o);
  });
  fl_savannaGrass(346, 392, { env: E, t, cam, h: 34, seed: 2, bands: 2, depth: 0.4, depthNear: 0.15 });
  fl_grassFg(t, { env: E, kind: 'gold', side: 'both', h: 90, n: 26, seed: 5, cam, dip: 0.5 });
  k_rays(b.sun[0], b.sun[1], t, { angle: Math.PI * 0.55, spread: 1.6, len: 380, strength: 0.3, n: 10, col: AM[9], cam });
  k_dust(t, { n: 36, cam, y0: 170, y1: 440, beam: { x: b.sun[0], y: b.sun[1], angle: Math.PI * 0.55, spread: 2, len: 360 } });
}
function ly_y1Ui(u, t, sh) {
  hudTracker(2, 2, prog(u, 0.08, 0.5));
  if (u > 0.3) hudLieu(2, Math.ceil((u - 0.3) * 30));
  if (u > 1.1) tagBox(8, 36, 'BOTSWANA (OKAVANGO)', 'white', Math.ceil((u - 1.1) * 30));
}

// ───────────── plan 2 : y1_atchoum (plan moyen : inspiration, éternuement) ─────────────
let ly_last = null;                                                              // retours de ly_dog / ly_pack du plan en cours, lus par son ui
function ly_y1b(u, t, sh) {
  const cam = k_pan(u, 6, -10, 'io', 1.8), hz = 252, E = LY_ENV, tS = ly_A.sn0, b = ly_back(u, t, { hz, cam, clouds: 3, seed: 2 });
  k_birds(t, { y: 90, x: 150, speed: 8, cam, n: 5, col: DU[1] });
  fl_savannaSoil(hz, LH, { env: E, seed: 8, cam, t, depth: 0.1, cracks: 0.4, pebbles: 20 });
  fl_acacia(t, { x: 40, y: hz + 8, h: 34, env: E, depth: 0.8, sil: true, seed: 4, cam, kind: 'round' });
  fl_acacia(t, { x: 232, y: hz + 12, h: 44, env: E, depth: 0.7, sil: true, seed: 6, cam, kind: 'tortilis' });
  k_haze(hz - 4, hz + 50, '#ffc880', 0.36, { t, cam, profile: 'top', seed: 9, wisp: 1 });
  ly_dog(226 - cam, 306, 0.5, t, { pose: 'look', seed: 55, flip: true, env: E, sil: 0.9, rim: 1, fog: 0.2, shadow: 0.6 });
  const d = ly_dog(92 - cam, 352, 1.5, t, { pose: 'sneeze', seed: 8, sneeze: ly_sneezeEnv(t - tS), env: E, rim: 1, light: 1, shadow: 0.8 });
  ly_last = d;
  ly_sneezeFx(d.nose[0] + 1, d.nose[1] + 3, tS, t, { dir: 1, s: 1.9, ang: 0.9, light: 1, seed: 3 });
  fl_savannaGrass(384, 430, { env: E, t, cam, h: 40, seed: 3, bands: 2, depth: 0.25, depthNear: 0.05 });
  fl_grassFg(t, { env: E, kind: 'gold', side: 'both', h: 84, n: 24, seed: 7, cam, dip: 0.55 });
  k_rays(b.sun[0], b.sun[1], t, { angle: Math.PI * 0.55, spread: 1.6, len: 380, strength: 0.28, n: 10, col: AM[9], cam });
  k_dust(t, { n: 30, cam, y0: 170, y1: 440, beam: { x: b.sun[0], y: b.sun[1], angle: Math.PI * 0.55, spread: 2, len: 360 } });
}
function ly_y1bUi(u, t, sh) {
  hudTracker(2, 2, 1); hudLieu(2);
  const d = ly_last; if (!d) return;
  ly_atchoum(Math.min(215, d.nose[0] + 10), 118, prog(t - ly_A.sn0, 0, 1.15), { sc: 3 });
}

// ───────────── plan 3 : y2_reveil (ils se dressent, oreilles pointées vers le soleil) ─────────────
function ly_y2a(u, t, sh) {
  const cam = k_pan(u, 4, -8, 'io', 1.4), hz = 262, E = LY_ENV, b = ly_back(u, t, { hz, cam, clouds: 3, seed: 3 });
  fl_savannaSoil(hz, LH, { env: E, seed: 11, cam, t, depth: 0.1, cracks: 0.5, pebbles: 22 });
  fl_acacia(t, { x: 214, y: hz + 12, h: 40, env: E, depth: 0.78, sil: true, seed: 8, cam, kind: 'lean' });
  k_haze(hz - 4, hz + 50, '#ffc880', 0.36, { t, cam, profile: 'top', seed: 9, wisp: 1 });
  const lk = (a, b2) => clamp(lerp(a, b2, eo(prog(u, 0.1, 0.8))), -1, 1);
  ly_dog(214 - cam, 318, 0.58, t, { pose: 'look', seed: 33, env: E, rim: 1, fog: 0.15, shadow: 0.6 });
  ly_dog(150 - cam, 338, 0.82, t, { pose: 'stand', seed: 44, look: lk(0, 0.5), env: E, rim: 1, shadow: 0.7 });
  ly_dog(76 - cam, 362, 1.05, t, { pose: 'look', seed: 22, env: E, rim: 1, shadow: 0.8, ear: 1 });
  fl_savannaGrass(380, 430, { env: E, t, cam, h: 40, seed: 5, bands: 2, depth: 0.25, depthNear: 0.05 });
  fl_grassFg(t, { env: E, kind: 'gold', side: 'both', h: 84, n: 24, seed: 9, cam, dip: 0.55 });
  k_rays(b.sun[0], b.sun[1], t, { angle: Math.PI * 0.55, spread: 1.6, len: 380, strength: 0.28, n: 10, col: AM[9], cam });
  k_dust(t, { n: 30, cam, y0: 170, y1: 440, beam: { x: b.sun[0], y: b.sun[1], angle: Math.PI * 0.55, spread: 2, len: 360 } });
}
function ly_hudOn(u, t) { hudTracker(2, 2, 1); hudLieu(2); }

// ───────────── plan 4 : y2_rassemble (ils arrivent de toutes parts, cercle, salutations) ─────────────
const LY_RALLY = { n: 6, seed: 4, x0: -90, x1: 360, y0: 312, y1: 352, s0: 0.52, s1: 0.68, fog0: 0.15, fog1: 0, ring: { cx: 135, cy: 334, rx: 74, ry: 22, a0: 0.5 }, moveGait: 'trot', ringPose: 'greet', env: LY_ENV, rim: 1, dog: { shadow: 0.7 } };
function ly_y2b(u, t, sh) {
  const cam = k_pan(u, 3, -6, 'io', 2.0), hz = 262, E = LY_ENV, b = ly_back(u, t, { hz, cam, clouds: 3, seed: 4 });
  fl_savannaSoil(hz, LH, { env: E, seed: 12, cam, t, depth: 0.1, cracks: 0.5, pebbles: 22 });
  fl_acacia(t, { x: 40, y: hz + 12, h: 40, env: E, depth: 0.78, sil: true, seed: 4, cam, kind: 'tortilis' });
  k_haze(hz - 4, hz + 50, '#ffc880', 0.36, { t, cam, profile: 'top', seed: 9, wisp: 1 });
  const g0 = sh.t0 + 0.05, gp = tt => clamp((tt - g0) / 1.45);                    // l'arrivée : 1,45 s de trot, puis salutations
  // poussière derrière chaque pas de trot
  for (let k = 0; k < 7; k++) { const tk = g0 + 0.1 + k * 0.17; if (t < tk) break; const Lk = ly_packLayout({ ...LY_RALLY, mode: 'ring', gather: gp(tk) }, tk); for (const e of Lk) if (gp(tk) < 0.9) k_dustKick(e.x, e.y, tk, t, { col: 'soil', dir: e.flip ? 1 : -1, size: 0.55 * e.s / 0.6, n: 5, dur: 0.9 }); }
  const P_ = ly_pack(t, { ...LY_RALLY, mode: 'ring', gather: gp(t), cam: cam * 0, each: (e, tt) => (e.pose === 'greet' ? { tail: 1 } : {}) });
  ly_last = P_;
  fl_savannaGrass(392, 440, { env: E, t, cam, h: 40, seed: 6, bands: 2, depth: 0.25, depthNear: 0.05 });
  fl_grassFg(t, { env: E, kind: 'gold', side: 'both', h: 80, n: 24, seed: 3, cam, dip: 0.55 });
  k_rays(b.sun[0], b.sun[1], t, { angle: Math.PI * 0.55, spread: 1.6, len: 380, strength: 0.28, n: 10, col: AM[9], cam });
  k_dust(t, { n: 40, cam, y0: 170, y1: 440, beam: { x: b.sun[0], y: b.sun[1], angle: Math.PI * 0.55, spread: 2, len: 360 } });
}

// ───────────── plans 5 et 6 : y3_vote (le cercle éternue, compteur et jauge) et y3_depart (départ d'un seul bloc) ─────────────
const LY_RING = { n: 6, seed: 4, mode: 'ring', gather: 1, x0: 20, x1: 250, y0: 312, y1: 352, s0: 0.62, s1: 0.8, fog0: 0.1, fog1: 0, ring: { cx: 135, cy: 336, rx: 80, ry: 22, a0: 0.5 }, ringPose: 'sneeze', env: LY_ENV, rim: 1, dog: { shadow: 0.7 } };
const LY_SN_DOG = [2, 0, 4, 1, 5, 3, 0, 4];                                       // quel chien éternue à chaque cran du compteur
function ly_snCount(t) { let n = 0; for (const ts of ly_A.sn) if (t >= ts + 0.04) n++; return n; }
function ly_ringScene(u, t, sh, go) {
  const cam = k_pan(u, 3, -5, 'io', 3.4), hz = 262, E = LY_ENV, b = ly_back(u, t, { hz, cam, clouds: 3, seed: 5 });
  fl_savannaSoil(hz, LH, { env: E, seed: 13, cam, t, depth: 0.1, cracks: 0.5, pebbles: 22 });
  fl_acacia(t, { x: 224, y: hz + 12, h: 40, env: E, depth: 0.78, sil: true, seed: 5, cam, kind: 'round' });
  k_haze(hz - 4, hz + 50, '#ffc880', 0.36, { t, cam, profile: 'top', seed: 9, wisp: 1 });
  const entries = ly_packLayout(LY_RING, t), sn = ly_A.sn, tGo = go ? ly_A.go : 1e9;
  const out = [];
  if (go && t >= tGo - 0.01) for (const e of entries) k_dustKick(e.x, e.y, tGo + 0.02 * e.i, t, { col: 'soil', dir: -1, size: 1.1, n: 8, dur: 1.0 });
  for (const e of entries) {
    const k = LY_SN_DOG.indexOf(e.i), ks = sn.map((ts, q) => LY_SN_DOG[q] === e.i ? q : -1).filter(q => q >= 0);
    let env = 0; for (const q of ks) env += ly_sneezeEnv(t - sn[q]);
    let o = { pose: 'sneeze', sneeze: env, seed: e.seed, flip: e.flip, fog: e.fog, env: E, rim: 1, shadow: 0.7 };
    let x = e.x, y = e.y;
    if (go && t >= tGo) {                                                         // départ : tous tournés vers le soleil, galop, accélération
      const a = t - tGo - 0.03 * e.i, ga = Math.max(0, a); o = { ...o, pose: 'run', sneeze: 0, flip: false, gblend: sm(clamp(ga / 0.22)), ph: ly_gait(ga, { gait: 'run' }).ph + ly_h(e.i, 3) * 0.3 };
      const v = ly_gait(0.0001 + ga * 0, { gait: 'run' }); x = e.x + e.s * (ly_gait(Math.max(0, ga - 0.1), { gait: 'run' }).x) * sm(clamp(ga / 0.5)) * 0.8 + e.s * 40 * ga * ga;
    }
    const r = ly_dog(x - cam * 0, y, e.s, t, o); out.push({ e, r });
  }
  ly_last = out;
  sn.forEach((ts, q) => { const dd = out.find(o => o.e.i === LY_SN_DOG[q]); if (dd && t >= ts - 0.02 && t < ts + 1.5) ly_sneezeFx(dd.r.nose[0] + 1, dd.r.nose[1] + 3, ts, t, { dir: dd.e.flip ? -1 : 1, s: dd.e.s * 1.7, ang: 0.8, light: 1, seed: q + 2 }); });
  fl_savannaGrass(392, 440, { env: E, t, cam, h: 40, seed: 7, bands: 2, depth: 0.25, depthNear: 0.05 });
  fl_grassFg(t, { env: E, kind: 'gold', side: 'both', h: 80, n: 24, seed: 4, cam, dip: 0.55 });
  k_rays(b.sun[0], b.sun[1], t, { angle: Math.PI * 0.55, spread: 1.6, len: 380, strength: 0.28, n: 10, col: AM[9], cam });
  k_dust(t, { n: 36, cam, y0: 170, y1: 440, beam: { x: b.sun[0], y: b.sun[1], angle: Math.PI * 0.55, spread: 2, len: 360 } });
}
function ly_y3a(u, t, sh) { ly_ringScene(u, t, sh, false); }
function ly_y3b(u, t, sh) { ly_ringScene(u, t, sh, true); }
function ly_gaugeV(t) { let v = 0; ly_A.sn.forEach(ts => { v += eo(prog(t, ts + 0.04, ts + 0.3)) / ly_A.sn.length; }); return v; }
function ly_y3Ui(u, t, sh, depart) {
  hudTracker(2, 2, 1); hudLieu(2);
  const n = ly_snCount(t), v = ly_gaugeV(t);
  counter(205, 10, 'ATCHOUM ×' + n, 1, '#ffe08a');
  const full = v > 0.985;
  gauge(160, 36, v, depart && t > ly_A.go - 0.1 ? '' : 'DÉPART', { redFrom: 0.8, style: 'amber' });
  if (depart && t > ly_A.go + 0.05) tagBox(135, 76, 'DE 3 À 10 ÉTERNUEMENTS', 'amber', Math.ceil((t - ly_A.go - 0.05) * 40), true);
  const out = ly_last || [];
  ly_A.sn.forEach((ts, q) => { const dd = out.find(o => o.e.i === LY_SN_DOG[q]); if (!dd) return; const p = prog(t - ts, 0, 0.9); if (p > 0 && p < 1) { const sc = dd.e.s >= 0.7 ? 2 : 1; ly_atchoum(clamp(dd.r.nose[0] + (dd.e.flip ? -14 : 14), 24, 246), dd.r.nose[1] - 40 - (q % 2) * 10, p, { sc }); } });
}

// ───────────── plans 7 et 8 : y4_urne et y4_nez (le gag : voter avec son nez) ─────────────
function ly_y4a(u, t, sh) {
  const cam = k_pan(u, 6, -6, 'io', 1.6), hz = 262, E = LY_ENV, b = ly_back(u, t, { hz, cam, clouds: 3, seed: 6 });
  fl_savannaSoil(hz, LH, { env: E, seed: 14, cam, t, depth: 0.1, cracks: 0.5, pebbles: 24 });
  fl_acacia(t, { x: 52, y: hz + 12, h: 38, env: E, depth: 0.78, sil: true, seed: 3, cam, kind: 'tortilis' });
  k_haze(hz - 4, hz + 50, '#ffc880', 0.36, { t, cam, profile: 'top', seed: 9, wisp: 1 });
  ly_pack(t, { n: 5, seed: 6, mode: 'run', run: { t0: sh.t0 - 0.2, dir: 1, gait: 'run', x0: 30, gap: 34, jitter: 6 }, y0: 292, y1: 304, s0: 0.26, s1: 0.32, fog0: 0.4, fog1: 0.3, env: E, sil: 0.9, rim: 1, dog: { shadow: 0.3 } });
  ly_ballot(150 - cam, 366, 1.5, t, { env: E, light: 1 });
  fl_savannaGrass(380, 430, { env: E, t, cam, h: 40, seed: 8, bands: 2, depth: 0.25, depthNear: 0.05 });
  fl_grassFg(t, { env: E, kind: 'gold', side: 'both', h: 84, n: 24, seed: 6, cam, dip: 0.55 });
  k_rays(b.sun[0], b.sun[1], t, { angle: Math.PI * 0.55, spread: 1.6, len: 380, strength: 0.28, n: 10, col: AM[9], cam });
  k_dust(t, { n: 36, cam, y0: 170, y1: 440, beam: { x: b.sun[0], y: b.sun[1], angle: Math.PI * 0.55, spread: 2, len: 360 } });
}
const LY_NOSE = { NS: 0.8, BX: 196, BY: 338, BS: 1.1 };
function ly_y4b(u, t, sh) {
  const hz = 272, E = LY_ENV, A = ly_A, b = k_backdrop(E, t, { horizon: hz, cam: 0, clouds: 3, seed: 7 });
  fl_savannaSoil(hz, LH, { env: E, seed: 4, cam: 0, t, depth: 0.1, cracks: 0.5, pebbles: 20 });
  k_haze(hz - 4, hz + 40, '#ffc880', 0.3, { t, profile: 'top', seed: 9, wisp: 1 });
  const { NS, BX, BY, BS } = LY_NOSE, v = u, tr = A.vote - sh.t0;                  // tr : instant (depuis le début du plan) où le bulletin passe la fente
  const approach = eo(prog(v, 0, 0.62)), dip = eio(prog(v, 0.5, tr - 0.22)), lift = eo(prog(v, tr - 0.1, tr + 0.45));
  const nx = lerp(-30, 150, approach) + 46 * dip - 60 * lift, ny = 150 + 76 * dip - 70 * lift + 3 * Math.sin(v * 5) * (1 - dip);
  const holding = v < tr - 0.3;
  const paperHeld = [nx, ny + 29.5 * NS];
  let paper = null;
  if (!holding) { const f = prog(v, tr - 0.3, tr), yEnd = 308; paper = { x: BX + Math.sin(f * 7) * 2 * (1 - f), y: lerp(paperHeld[1], yEnd, Math.pow(f, 1.4)) }; }
  const bump = holding ? 0 : sm(prog(v, tr - 0.02, tr + 0.04)) * (1 - sm(prog(v, tr + 0.04, tr + 0.3)));
  ly_ballot(BX, BY, BS, t, { paper: v < tr + 0.02 ? paper : null, fall: v >= tr + 0.02 ? 1 : undefined, bump, env: E, light: 1 });
  fl_savannaGrass(402, 446, { env: E, t, cam: 0, h: 36, seed: 9, bands: 2, depth: 0.2, depthNear: 0.05 });
  ly_nose(nx, ny, NS, t, { ballot: holding ? 1 : 0, sneeze: ly_sneezeEnv(t - A.sn_nez), seed: 5 });
  ly_sneezeFx(nx, ny + 12, A.sn_nez, t, { dir: 1, s: 2.4, ang: 1.0, light: 1 });
  fl_grassFg(t, { env: E, kind: 'gold', side: 'both', h: 56, n: 20, seed: 6, dip: 0.6 });
  k_dust(t, { n: 30, y0: 170, y1: 440, beam: { x: b.sun[0], y: b.sun[1], angle: Math.PI * 0.55, spread: 2, len: 360 } });
}
function ly_y4bUi(u, t, sh) {
  hudTracker(2, 2, 1); hudLieu(2);
  mark(60 + 18, 8 + 18, 'yes', prog(t, ly_A.tick, ly_A.tick + 0.25), 5);
  ly_atchoum(110, 220, prog(t - ly_A.sn_nez, 0, 1.1), { sc: 3 });
}

// préchauffage : le premier dessin de chaque plan (sols, ciels, sprites en cache) est fait avant le premier plan, puis effacé (aucun pixel ne change)
const ly_PLANS = { y1_savane: ly_y1, y1_atchoum: ly_y1b, y2_reveil: ly_y2a, y2_rassemble: ly_y2b, y3_vote: ly_y3a, y3_depart: ly_y3b, y4_urne: ly_y4a, y4_nez: ly_y4b };

function buildLycaon(S) {
  const W = (id, w, k) => wt(id, w, k);
  const A = ly_A;
  A.tB = W('y1', 'décisions') - 0.1; A.tC = W('y2', 'Avant') - 0.1; A.tD = W('y2', 'les') - 0.1; A.tE = W('y3', 'Plus') - 0.1; A.tF = W('y3', 'chances') - 0.1;
  A.tG = W('y4', 'Oui') - 0.1; A.tH = W('y4', 'on') - 0.1;
  A.sn0 = W('y1', 'éternuent') + 0.14;                                              // saccade du plan 2 : dans « éternuent »
  A.go = W('y3', 'partir') + 0.12;                                                  // départ de la meute
  // 8 éternuements du cercle : de « Plus » à « partir » (les 6 premiers dans y3_vote, les 2 derniers dans y3_depart)
  const s0 = W('y3', 'Plus') + 0.45, s7 = A.go - 0.12, nS = 8; A.sn = []; for (let k = 0; k < nS; k++) A.sn.push(+(s0 + (s7 - s0) * k / (nS - 1)).toFixed(3));
  A.vote = W('y4', 'voter') + 0.12;                                                 // le bulletin passe la fente
  A.sn_nez = W('y4', 'nez') + 0.04;                                                 // saccade du gros nez
  A.tick = W1('y4', 'nez') + 0.1;                                                   // la case 3/3 se coche
  const E1 = [[S.t0 + 0.08, 'pop', 1], [S.t0 + 0.1, 'wind', 3.5], [S.t0 + 0.35, 'label', 1], [S.t0 + 0.55, 'bird', 1], [W('y1', 'Afrique') + 0.6, 'bird', 2], [S.t0 + 1.4, 'label', 1]];
  shot('y1_savane', S.t0, { draw: ly_y1, ui: ly_y1Ui, ev: E1 });
  shot('y1_atchoum', A.tB, { draw: ly_y1b, ui: ly_y1bUi, ev: [[A.tB, 'wind', 1.7], [A.sn0 - 0.4, 'suspense', 0.4], [A.sn0, 'sneeze', 1.0]] });
  shot('y2_reveil', A.tC, { draw: ly_y2a, ui: ly_hudOn, ev: [[A.tC + 0.05, 'bird', 0], [A.tC + 0.4, 'yip', 1]] });
  shot('y2_rassemble', A.tD, { draw: ly_y2b, ui: ly_hudOn, ev: [[A.tD, 'run', 1.4], [A.tD + 0.3, 'step', 1], [A.tD + 0.9, 'yip', 1], [A.tD + 1.5, 'yip', 1], [A.tD + 1.8, 'yip', 1]] });
  const ev3 = []; A.sn.forEach((ts, k) => { ev3.push([ts, 'sneeze', 0.9 + 0.35 * ((k * 5) % 4) / 3], [ts + 0.04, 'counter', k + 1]); });
  shot('y3_vote', A.tE, { draw: ly_y3a, ui: (u, t, sh) => ly_y3Ui(u, t, sh, false), ev: ev3.filter(e => e[0] < A.tF).concat([[A.tE + 0.05, 'pop', 1]]) });
  shot('y3_depart', A.tF, { draw: ly_y3b, ui: (u, t, sh) => ly_y3Ui(u, t, sh, true), ev: ev3.filter(e => e[0] >= A.tF).concat([[A.go - 0.02, 'ding', 1], [A.go, 'run', 1.2], [A.go + 0.05, 'whoosh', 0.6], [A.go + 0.1, 'yip', 1], [A.go + 0.1, 'label', 1]]) });
  shot('y4_urne', A.tG, { draw: ly_y4a, ui: ly_hudOn, ev: [[A.tG, 'wind', 1.3], [A.tG + 0.5, 'pop', 1]] });
  shot('y4_nez', A.tH, { draw: ly_y4b, ui: ly_y4bUi, ev: [[A.tH + 0.1, 'whoosh', 0.5], [A.vote, 'vote', 1], [A.sn_nez - 0.35, 'suspense', 0.4], [A.sn_nez, 'sneeze', 1.2], [A.tick, 'ding', 1], [A.tick, 'pop', 1], [A.tick + 0.05, 'reveal', 1]] });
}
INITS.push(() => { for (const id in ly_PLANS) { try { ly_PLANS[id](0.5, 0.5, { t0: 0 }); } catch (e) { } } clearL(); });
