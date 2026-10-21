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
// ATCHOUM dans le cadre : centre x ramené pour que le texte (largeur sc) reste entre 4 et LW - 4
const ly_atx = (x, sc, txt = 'ATCHOUM', m = 4) => clamp(x, textW(txt, sc) / 2 + m, LW - textW(txt, sc) / 2 - m);

// ───────────── décor commun : la savane à l'aube (horizon constant par plan : un cache par valeur) ─────────────
// o : hz (horizon), cam, clouds, seed ; renvoie { H, sun }
function ly_back(u, t, o = {}) {
  // décor de k_backdrop('savannaDawn') SANS baobabs (faits.md : acacias et mopane, pas de baobab dans le delta) : mêmes ciel, soleil, nuages, reliefs
  const H = o.hz ?? 300, cam = o.cam || 0, sd = o.seed ?? 1, base = H + 60, E = 'savannaDawn';
  const skyH = H - 44, sp3 = k_sunPos(E, { h: skyH }), out = { H, sun: [sp3[0], sp3[1], sp3[2]], skyH };
  k_sky(E, t, { h: skyH, cam });
  k_sun(out.sun[0], out.sun[1], out.sun[2], { t, cam });
  k_clouds(t, { preset: E, y0: 50, y1: H - 160, cam, n: o.clouds ?? 3, seed: 11 + sd });
  for (const l of k_horizonLayers({ y: H - 42, seed: sd })) k_ridge(E, t, { ...l, baobab: 0, cam, base });
  return out;
}


// tronc épais de l'acacia central (le tronc du sprite de flore.js est trop fin et se perd dans la brume) : fût qui s'évase au pied, deux maîtresses branches, ombre à gauche, liseré du soleil à droite
function ly_trunk(x, y0, y1, w0, w1, o = {}) {
  const E = fl_env({ env: LY_ENV }), mist = o.mist ?? 0.18, lean = o.lean ?? 0, C = k => ly_mix(k, E.mist, mist);
  const hw = w0 / 2, tw = w1 / 2, xt = x + lean;
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0);
  const body = new Path2D();
  body.moveTo(x - hw - 3, y0 + 1); body.bezierCurveTo(x - hw, y0 - 6, x - tw - 1 + lean * 0.3, y1 + (y0 - y1) * 0.5, xt - tw, y1);
  body.lineTo(xt + tw, y1); body.bezierCurveTo(x + tw + 1 + lean * 0.3, y1 + (y0 - y1) * 0.5, x + hw, y0 - 6, x + hw + 3, y0 + 1); body.closePath();
  L.fillStyle = '#05040f'; L.fill(body); L.lineWidth = 2; L.strokeStyle = '#05040f'; L.stroke(body);
  L.fillStyle = C(WO[0]); L.fill(body);
  L.save(); L.clip(body);
  L.fillStyle = C(WO[1]); L.fillRect(x - hw * 0.2, y1 - 2, hw * 1.4, y0 - y1 + 6);                // côté soleil (contre-jour : encore sombre)
  L.fillStyle = C(WO[2]); L.fillRect(x + hw * 0.55, y1 - 2, hw, y0 - y1 + 6);
  L.fillStyle = ly_snap(E.rim); L.fillRect(x + hw * 0.85, y1 - 2, 3, y0 - y1 + 6);                // liseré
  L.fillStyle = C(WO[2]); for (let k = 0; k < 7; k++) L.fillRect(x - hw * 0.3 + (k % 3) * hw * 0.45, y1 + 3 + k * (y0 - y1) / 7.5, 1, 3);   // fissures d'écorce
  L.restore();
  for (const sd of [-1, 1]) {                                                                       // maîtresses branches
    const b = new Path2D(), ex = xt + sd * (o.spread ?? 34), ey = y1 - (o.rise ?? 20);
    b.moveTo(xt - tw * 0.9, y1 + 2); b.quadraticCurveTo(xt + sd * 8, y1 - 8, ex - 2, ey); b.lineTo(ex + 3, ey - 2); b.quadraticCurveTo(xt + sd * 12, y1 - 3, xt + tw * 0.9, y1 + 2); b.closePath();
    L.fillStyle = '#05040f'; L.fill(b); L.lineWidth = 2; L.strokeStyle = '#05040f'; L.stroke(b); L.fillStyle = C(sd > 0 ? WO[1] : WO[0]); L.fill(b);
  }
  L.restore();
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
    k_haze(hz - 6, hz + 56, '#ffc880', 0.38, { t, cam, profile: 'top', seed: 9, wisp: 1 });
  fl_acacia(t, { x: 190, y: hz + 22, h: 66, env: E, depth: 0.5, seed: 3, cam, kind: 'tortilis', cw: 150 });
  ly_trunk(190 - cam * 0.9, hz + 24, hz - 8, 10, 6, { lean: 1, spread: 24, rise: 16 });
  k_haze(hz + 18, hz + 62, '#ffc880', 0.3, { t, cam, profile: 'mid', seed: 4, wisp: 1, speed: 4 });
  LY_REST.forEach(([x, y, s, pose, seed, d, rest], i) => {
    let o = { pose, seed, flip: d < 0, rest, env: E, sil: y < 310 ? 0.3 : 0.26, rim: 1, fog: y < 310 ? 0.1 : 0, shadow: 0.7 };
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
  ly_dog(246 - cam, 306, 0.46, t, { pose: 'look', seed: 55, flip: true, env: E, sil: 0.9, rim: 1, fog: 0.2, shadow: 0.6 });
  const d = ly_dog(70 - cam, 352, 1.5, t, { pose: 'sneeze', seed: 8, sneeze: ly_sneezeEnv(t - tS), look: (1 - prog(t, tS - 0.5, tS - 0.3)) * 0.35 * Math.sin(u * 3.4 + 0.6), env: E, rim: 1, light: 1, shadow: 0.8 });
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
  ly_atchoum(ly_atx(150, 3, 'ATCHOUM', 8), 138, prog(t - ly_A.sn0, 0, 1.15), { sc: 3 });
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

// ───────────── plans 4, 5, 6 : la meute en cercle (y2_rassemble, y3_vote, y3_depart) ─────────────
// Six lycaons en trois paires de salutation, étagées en profondeur (derrière, milieu, devant) : 20 à 30 px d'air entre les corps, têtes basses, museaux qui se touchent (paires du fond et de devant), queues qui battent.
// x, y = sol sous le tronc ; s = échelle ; flip = tourné vers la gauche ; x0 = point de départ hors cadre ; dl = retard d'arrivée (s) ; dur = durée du trajet (s)
const LY_SLOTS = [
  { x: 92, y: 358, s: 0.62, flip: false, seed: 41, x0: -70, dl: 0.06, dur: 0.95 },      // 0 devant, à gauche  (nez contre nez avec 1)
  { x: 176, y: 358, s: 0.62, flip: true, seed: 44, x0: 340, dl: 0.2, dur: 0.95 },       // 1 devant, à droite
  { x: 42, y: 327, s: 0.5, flip: false, seed: 43, x0: -80, dl: 0.0, dur: 1.05 },        // 2 plan moyen, flanc gauche
  { x: 238, y: 327, s: 0.47, flip: true, seed: 46, x0: 350, dl: 0.12, dur: 1.05 },       // 3 plan moyen, flanc droit
  { x: 106, y: 306, s: 0.4, flip: false, seed: 45, x0: -90, dl: 0.3, dur: 0.95 },       // 4 au fond (nez contre nez avec 5)
  { x: 164, y: 306, s: 0.4, flip: true, seed: 42, x0: 320, dl: 0.24, dur: 0.95 },       // 5
];
const LY_DRAW_ORDER = [4, 5, 2, 3, 0, 1];                                                  // du fond vers le devant
const LY_SN_DOG = [2, 5, 0, 3, 4, 1, 2, 5];                                                // quel chien éternue à chaque cran du compteur (les deux derniers : y3_depart)
function ly_snCount(t) { let n = 0; for (const ts of ly_A.sn) if (t >= ts + 0.04) n++; return n; }
// arrivée en trot : trajet décéléré, phase de pas = distance parcourue (les pieds ne patinent pas), allure fondue en position debout à l'arrivée
function ly_slotState(k, t, g0) {
  const S = LY_SLOTS[k], p = clamp((t - g0 - S.dl) / S.dur), pe = 1 - Math.pow(1 - p, 1.7), x = lerp(S.x0, S.x, pe), dist = Math.abs(x - S.x0);
  return { x, p, ph: dist / (LY_GAITS.trot.D * S.s) + ly_h(k, 4), gb: 1 - sm(clamp((p - 0.7) / 0.3)) };
}
// attitude d'un lycaon du cercle : tête basse (salutation) ; s'il éternue, il se redresse (inspire, tête haute) puis plonge, puis revient
function ly_ringAtt(k, t) {
  let w = 0; ly_A.sn.forEach((ts, q) => { if (LY_SN_DOG[q] === k) w = Math.max(w, sm(prog(t, ts - 0.62, ts - 0.26)) * (1 - sm(prog(t, ts + 0.5, ts + 0.95)))); });
  return { w, att: w > 0.001 ? ly_attBlend('greet', 'stand', w, { dip: -3, an: -0.62, ear: 0.7, wag: 0.1 }) : null };
}
// calcule et dessine un lycaon du cercle ; renvoie { e, r } (e : place ; r : retour de ly_dog)
function ly_ringDog(k, t, o) {
  const S = LY_SLOTS[k], E = LY_ENV, goT = o.go, rank = S.x > 135 ? 0 : 1;
  let x = S.x, y = S.y, flip = S.flip, d;
  if (o.gather != null) { const st = ly_slotState(k, t, o.gather); x = st.x; d = { pose: 'greet', gait: st.p < 1 ? 'trot' : undefined, ph: st.ph, gblend: st.gb, flip: st.p < 1 ? S.x > S.x0 ? false : true : S.flip }; }
  else d = { pose: 'greet', flip: S.flip };
  // balancement des museaux après l'arrivée (salutation), nul pendant le vote (seul l'éternueur bouge)
  const nuz = (o.nuz ?? 0) * (o.gather != null ? sm(prog(t, o.gather + S.dl + S.dur * 0.8, o.gather + S.dl + S.dur + 0.15)) : 1);
  const look = nuz * Math.sin(TAU * 1.5 * t + k * 2.1) * 0.6;
  let env = 0; ly_A.sn.forEach((ts, q) => { if (LY_SN_DOG[q] === k) env += ly_sneezeEnv(t - ts); });
  const ra = ly_ringAtt(k, t);
  let od = { ...d, seed: S.seed, env: E, rim: 1, shadow: 0.7, fog: k >= 4 ? 0.1 : 0, tail: o.tail ?? 0.9, look: look + (ra.att ? 0 : 0), sneeze: env };
  if (ra.att) od.att = ra.att;
  if (goT != null && t >= goT) {                                                                // départ : tous tournés vers le soleil, galop, accélération
    const dl = rank ? 0.04 + 0.02 * (k % 3) : 0.0, a = Math.max(0, t - goT - dl), V = 520 * S.s * (rank ? 1.45 : 1.0), T = 0.34, q = Math.min(1, a / T);
    const dd = a < T ? V * T * (q * q * q - q * q * q * q / 2) : V * T * 0.5 + V * (a - T);
    x = S.x + dd; od = { pose: 'run', seed: S.seed, env: E, rim: 1, shadow: 0.7, fog: od.fog, flip: false, ph: dd / (LY_GAITS.run.D * S.s) + ly_h(k, 6) * 0.3, gblend: sm(clamp(a / 0.2)), look: 0 };
    if (a <= 0) { od = { ...od, pose: 'greet', ph: undefined, gblend: 1, flip: S.flip, att: ly_attBlend('greet', 'stand', 0.6, { dip: 3 }) }; x = S.x; }
  }
  const r = ly_dog(x, y, S.s, t, od);
  return { e: { i: k, s: S.s, flip: od.flip, x, y }, r };
}
function ly_ringScene(u, t, sh, mode) {
  const cam = k_pan(u, 3, -5, 'io', 3.4), hz = 262, E = LY_ENV, b = ly_back(u, t, { hz, cam, clouds: 3, seed: mode === 'rally' ? 4 : 5 });
  fl_savannaSoil(hz, LH, { env: E, seed: 12 + (mode === 'rally' ? 0 : 1), cam, t, depth: 0.1, cracks: 0.5, pebbles: 22 });
  fl_acacia(t, { x: mode === 'rally' ? 40 : 224, y: hz + 12, h: 40, env: E, depth: 0.78, sil: true, seed: 4, cam, kind: mode === 'rally' ? 'tortilis' : 'round' });
  k_haze(hz - 4, hz + 50, '#ffc880', 0.36, { t, cam, profile: 'top', seed: 9, wisp: 1 });
  k_haze(hz + 26, hz + 66, '#ffc880', 0.26, { t, cam, profile: 'mid', seed: 6, wisp: 1, speed: 4 });
  const rally = mode === 'rally', g0 = sh.t0 - 0.35, tGo = mode === 'go' ? ly_A.go : null, out = [];
  if (rally) for (let k = 0; k < 6; k++) { const S = LY_SLOTS[k];                                  // poussière derrière les pas du trot
    for (let q = 0; q < 4; q++) { const tk = g0 + S.dl + S.dur * (0.12 + 0.2 * q); if (t < tk) break; const st = ly_slotState(k, tk, g0); if (st.p < 0.9) k_dustKick(st.x, S.y, tk, t, { col: 'soil', dir: S.x > S.x0 ? -1 : 1, size: 0.55 * S.s / 0.6, n: 5, dur: 0.9 }); } }
  if (tGo != null && t >= tGo - 0.01) for (const k of LY_DRAW_ORDER) { const S = LY_SLOTS[k], dl = (S.x > 135 ? 0.04 + 0.02 * (k % 3) : 0.0); k_dustKick(S.x, S.y, tGo + dl, t, { col: 'soil', dir: -1, size: 1.0 * S.s / 0.6, n: 8, dur: 0.9 }); }
  for (const k of LY_DRAW_ORDER) out.push(ly_ringDog(k, t, { gather: rally ? g0 : undefined, go: tGo, nuz: rally ? 1 : 0, tail: rally ? 1 : 0.5 }));
  ly_last = out;
  ly_A.sn.forEach((ts, q) => { const dd = out.find(o => o.e.i === LY_SN_DOG[q]); if (dd && t >= ts - 0.02 && t < ts + 1.5) ly_sneezeFx(dd.r.nose[0] + dd.e.s * 2 * (dd.e.flip ? -1 : 1), dd.r.nose[1] + 3, ts, t, { dir: dd.e.flip ? -1 : 1, s: dd.e.s * 1.9, ang: 0.8, light: 1, seed: q + 2 }); });
  fl_savannaGrass(392, 440, { env: E, t, cam, h: 40, seed: 7, bands: 2, depth: 0.25, depthNear: 0.05 });
  fl_grassFg(t, { env: E, kind: 'gold', side: 'both', h: 80, n: 24, seed: 4, cam, dip: 0.55 });
  k_rays(b.sun[0], b.sun[1], t, { angle: Math.PI * 0.55, spread: 1.6, len: 380, strength: 0.28, n: 10, col: AM[9], cam });
  k_dust(t, { n: 36, cam, y0: 170, y1: 440, beam: { x: b.sun[0], y: b.sun[1], angle: Math.PI * 0.55, spread: 2, len: 360 } });
}
function ly_y2b(u, t, sh) { ly_ringScene(u, t, sh, 'rally'); }
function ly_y3a(u, t, sh) { ly_ringScene(u, t, sh, 'vote'); }
function ly_y3b(u, t, sh) { ly_ringScene(u, t, sh, 'go'); }
function ly_gaugeV(t) { let v = 0; ly_A.sn.forEach(ts => { v += eo(prog(t, ts + 0.04, ts + 0.22)) / ly_A.sn.length; }); return v; }
// étiquette de nuance « DE 3 À 10 ÉTERNUEMENTS » : tapée vite à partir de « chances », reste pleine jusqu'à la fin du plan y4_urne (≥ 0,8 s lisible)
function ly_nuance(t) { const t0 = ly_A.tLab; if (t < t0) return; tagBox(135, 76, 'DE 3 À 10 ÉTERNUEMENTS', 'amber', Math.ceil((t - t0) * 120), true); }
function ly_y3Ui(u, t, sh, depart) {
  hudTracker(2, 2, 1); hudLieu(2);
  const n = ly_snCount(t), v = ly_gaugeV(t);
  counter(205, 10, 'ATCHOUM ×' + n, 1, '#ffe08a');
  gauge(160, 36, v, 'DÉPART', { redFrom: 0.8, style: 'amber' });
  if (depart) ly_nuance(t);
  const out = ly_last || [];
  ly_A.sn.forEach((ts, q) => {                                                    // un ATCHOUM (échelle 2) au-dessus de la tête de l'éternueur, 0,62 s
    const dd = out.find(o => o.e.i === LY_SN_DOG[q]); if (!dd) return; const p = prog(t - ts, 0, 0.62); if (p <= 0 || p >= 1) return;
    const S = LY_SLOTS[dd.e.i], yy = clamp(S.y - 84 * S.s - 30 - (dd.e.i % 2) * 8, 92, 300);
    ly_atchoum(ly_atx(S.x + (S.flip ? -6 : 6), 2, 'ATCHOUM', 4), yy, p, { sc: 2 });
  });
}

// ───────────── plans 7 et 8 : y4_urne et y4_nez (le gag : voter avec son nez) ─────────────
function ly_y4a(u, t, sh) {
  const cam = k_pan(u, 6, -6, 'io', 1.6), hz = 262, E = LY_ENV, b = ly_back(u, t, { hz, cam, clouds: 3, seed: 6 });
  fl_savannaSoil(hz, LH, { env: E, seed: 14, cam, t, depth: 0.1, cracks: 0.5, pebbles: 24 });
  fl_acacia(t, { x: 52, y: hz + 12, h: 38, env: E, depth: 0.78, sil: true, seed: 3, cam, kind: 'tortilis' });
  k_haze(hz - 4, hz + 50, '#ffc880', 0.36, { t, cam, profile: 'top', seed: 9, wisp: 1 });
  ly_pack(t, { n: 5, seed: 6, mode: 'run', run: { t0: sh.t0 - 0.2, dir: 1, gait: 'run', x0: 30, gap: 34, jitter: 6 }, y0: 292, y1: 304, s0: 0.26, s1: 0.32, fog0: 0.4, fog1: 0.3, env: E, sil: 0.9, rim: 1, dog: { shadow: 0.3 } });
  ly_ballot(150 - cam, 350, 1.4, t, { env: E, light: 1 });
  fl_savannaGrass(380, 430, { env: E, t, cam, h: 40, seed: 8, bands: 2, depth: 0.25, depthNear: 0.05 });
  fl_grassFg(t, { env: E, kind: 'gold', side: 'both', h: 84, n: 24, seed: 6, cam, dip: 0.55 });
  k_rays(b.sun[0], b.sun[1], t, { angle: Math.PI * 0.55, spread: 1.6, len: 380, strength: 0.28, n: 10, col: AM[9], cam });
  k_dust(t, { n: 36, cam, y0: 170, y1: 440, beam: { x: b.sun[0], y: b.sun[1], angle: Math.PI * 0.55, spread: 2, len: 360 } });
}
// ───────────── y4_nez : le lycaon se tient DERRIÈRE l'urne, pattes avant posées sur le plateau, et vote avec le nez ─────────────
const LY_NOSE = { NS: 0.75, BX: 135, BY: 350, BS: 1.4 };
const LY_BUST_SH = 262;                                                           // ligne des épaules (le tronc passe derrière le plateau de l'urne)
// torse, cou et épaules, DERRIÈRE l'urne : encolure étroite sous la tête, épaules qui s'évasent, plastron blanc, taches, poils ; (nx, ny) = truffe, s = échelle de ly_nose
function ly_bustBack(nx, ny, s, t) {
  const C = ly_pal(LY_ENV, 0, 0), nw = 32 * s / 0.75, sw = 62 * s / 0.75, y0 = ny + 14 * s, shY = LY_BUST_SH, yb = 300, lx = C.E.light >= 0 ? 1 : -1, hh = Math.max(4, shY - y0);
  const path = new Path2D();
  path.moveTo(nx - nw, y0); path.bezierCurveTo(nx - nw - 1, y0 + hh * 0.55, nx - sw + 8, shY - hh * 0.25, nx - sw, shY + 6);
  path.bezierCurveTo(nx - sw - 2, shY + 22, nx - sw + 2, yb - 6, nx - sw + 10, yb); path.lineTo(nx + sw - 10, yb); path.bezierCurveTo(nx + sw - 2, yb - 6, nx + sw + 2, shY + 22, nx + sw, shY + 6);
  path.bezierCurveTo(nx + sw - 8, shY - hh * 0.25, nx + nw + 1, y0 + hh * 0.55, nx + nw, y0); path.closePath();
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0);
  const g = L.createLinearGradient(nx - sw, 0, nx + sw, 0);
  g.addColorStop(0, lx > 0 ? C.tan.lo : C.tan.hi); g.addColorStop(0.55, C.tan.mid); g.addColorStop(1, lx > 0 ? C.tan.hi : C.tan.lo);
  L.fillStyle = g; L.fill(path);
  L.save(); L.clip(path);
  const r = rng(77), blobs = [[-46, 0.35, 15, 9, 0.3, 'blk'], [40, 0.5, 14, 9, -0.4, 'blk'], [-22, 0.8, 12, 7, 0.1, 'blk'], [28, 0.92, 11, 6, 0.3, 'wht'], [-52, 1.0, 10, 6, 0, 'wht']];
  for (const [ox, fy, rx, ry, rot, col] of blobs) { L.fillStyle = col === 'wht' ? C.wht.mid : C.blk.mid; L.fill(ly_smooth(ly_blob(r, nx + ox * s / 0.75, y0 + (shY - y0) * fy, rx, ry, rot, 12))); }
  L.fillStyle = C.wht.mid; L.fill(ly_smooth(ly_blob(r, nx, y0 + hh * 0.55, 16 * s / 0.75, hh * 0.5 + 6, 0, 12)));       // plastron blanc au milieu du poitrail
  L.fillStyle = C.wht.hi; L.fill(ly_ell(nx + 5, y0 + hh * 0.5, 5, hh * 0.3, 0));
  for (let i = 0; i < 120; i++) { const fx = nx + (r() - 0.5) * 2 * sw, fy = y0 + r() * (yb - y0), c2 = r() < 0.5 ? C.tan.lo : C.tan.hi, ln = 2 + r() * 3; L.strokeStyle = c2; L.lineWidth = 1; L.beginPath(); L.moveTo(fx, fy); L.lineTo(fx + (r() - 0.5) * 1.5, fy + ln); L.stroke(); }
  L.restore();
  L.lineJoin = 'round'; L.strokeStyle = C.line; L.lineWidth = 1.8; L.stroke(path);
  // liseré du soleil sur le côté éclairé de l'épaule
  const rim = new Path2D(); const sx = lx > 0 ? 1 : -1; rim.moveTo(nx + sx * nw, y0 + 2); rim.bezierCurveTo(nx + sx * (nw + 1), y0 + hh * 0.55, nx + sx * (sw - 8), shY - hh * 0.25, nx + sx * (sw - 1), shY + 4);
  L.strokeStyle = C.rim; L.lineWidth = 1.4; L.stroke(rim);
  L.restore();
}
// pattes avant posées sur le plateau de l'urne, de chaque côté de la fente (APRÈS l'urne) ; press 0..1 : appui quand le bulletin passe
function ly_bustPaws(nx, ny, s, t, o = {}) {
  const C = ly_pal(LY_ENV, 0, 0), { BX, BY, BS } = LY_NOSE, px_ = 40 * BS / 1.4, topY = BY - 62 * BS, shY = LY_BUST_SH, press = o.press || 0, lx = C.E.light >= 0 ? 1 : -1;
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.lineJoin = 'round';
  for (const sd of [-1, 1]) {
    const pcx = nx + sd * px_ * 1.08, pcy = topY + 8 + press * 1.5, sh0 = [nx + sd * 52 * s / 0.75, shY - 22];
    const limbP = ly_limb([sh0, [sh0[0] + (pcx - sh0[0]) * 0.5 + sd * 2, (sh0[1] + pcy) / 2], [pcx, pcy - 6]], [15, 11.5, 9.5]);
    L.fillStyle = C.line; L.save(); L.lineWidth = 3.2; L.strokeStyle = C.line; L.stroke(limbP); L.restore();
    L.fillStyle = C.tan.mid; L.fill(limbP);
    L.save(); L.clip(limbP);
    L.fillStyle = C.wht.mid; L.fillRect(pcx - 14, pcy - 12, 28, 16);                                  // chaussette blanche
    L.fillStyle = (sd === lx) ? C.tan.hi : C.tan.lo; L.fillRect(sd === lx ? pcx + 3 : pcx - 14, sh0[1] - 4, 11, 40);
    L.restore();
    const paw = ly_ell(pcx, pcy + 1.5, 9.5, 5.2, 0); L.lineWidth = 2.6; L.strokeStyle = C.line; L.stroke(paw); L.fillStyle = C.wht.mid; L.fill(paw);
    L.strokeStyle = C.tan.lo; L.lineWidth = 1; for (const k of [-3.5, 0, 3.5]) { L.beginPath(); L.moveTo(pcx + k, pcy + 0.5); L.lineTo(pcx + k, pcy + 5.5); L.stroke(); }
    if (lx * sd > 0) { L.strokeStyle = C.rim; L.lineWidth = 1; L.beginPath(); L.ellipse(pcx, pcy + 1.5, 9.5, 5.2, 0, Math.PI * 1.1, Math.PI * 1.85); L.stroke(); }
  }
  L.restore();
}
function ly_y4b(u, t, sh) {
  const hz = 272, E = LY_ENV, A = ly_A, b = ly_back(u, t, { hz, cam: 0, clouds: 3, seed: 7 });
  fl_savannaSoil(hz, LH, { env: E, seed: 4, cam: 0, t, depth: 0.1, cracks: 0.5, pebbles: 20 });
  k_haze(hz - 4, hz + 40, '#ffc880', 0.3, { t, profile: 'top', seed: 9, wisp: 1 });
  const { NS, BX, BY, BS } = LY_NOSE, v = u, tr = A.vote - sh.t0, slotY = BY - 52 * BS;      // tr : instant (depuis le début du plan) où le bulletin passe la fente
  const REST = 172, DIP = slotY - 38 * NS - 1;                                          // hauteur de la truffe : en haut, puis au-dessus de la fente
  const approach = eo(prog(v, 0, 0.6)), dip = eio(prog(v, 0.5, tr - 0.22)), lift = eo(prog(v, tr - 0.06, tr + 0.5));
  const se = ly_sneezeEnv(t - A.sn_nez), inh = Math.max(0, -se), ex = Math.max(0, se);
  const nx = lerp(-70, BX, approach) + 2.5 * Math.sin(v * 9) * (1 - approach) + 1.5 * ex * Math.sin(t * 90);
  const ny = lerp(REST, DIP, dip) - (DIP - REST - 14) * 0 - 0 + (-(DIP - REST - 24)) * lift + (v < 0.7 ? 3 * Math.sin(v * 7) * (1 - approach) : 0) - 9 * inh * 2.5 + 10 * ex;
  const holding = v < tr - 0.3;
  const paperHeld = [nx, ny + 29.5 * NS];
  let paper = null;
  if (!holding) { const f = prog(v, tr - 0.3, tr), yEnd = slotY + 14; paper = { x: BX + Math.sin(f * 7) * 2 * (1 - f), y: lerp(paperHeld[1], yEnd, Math.pow(f, 1.4)) }; }
  const bump = holding ? 0 : sm(prog(v, tr - 0.02, tr + 0.04)) * (1 - sm(prog(v, tr + 0.04, tr + 0.3)));
  ly_bustBack(nx, ny, NS, t);
  ly_ballot(BX, BY, BS, t, { paper: v < tr + 0.02 ? paper : null, fall: v >= tr + 0.02 ? 1 : undefined, bump, env: E, light: 1 });
  ly_bustPaws(nx, ny, NS, t, { press: bump });
  // expression : déterminé en portant le bulletin (un seul sourcil haussé), rictus content après le vote, yeux fermés à l'éternuement (géré par ly_nose)
  const plot = sm(prog(v, 0.25, 0.62)) * (1 - prog(v, tr + 0.05, tr + 0.2)), happy = sm(prog(v, tr + 0.2, tr + 0.5));
  ly_nose(nx, ny, NS, t, { ballot: holding ? 1 : 0, sneeze: se, seed: 5, eye: se !== 0 ? undefined : clamp(0.62 + 0.38 * happy), browL: -0.2 * plot + 0.25 * happy, browR: 0.95 * plot + 0.7 * happy, smirk: Math.max(plot * 0.6, happy) * (1 - clamp(ex * 3)) });
  ly_sneezeFx(nx + 4, ny + 16, A.sn_nez, t, { dir: 1, s: 3.2, ang: 1.0, light: 1, seed: 6 });
  fl_savannaGrass(402, 446, { env: E, t, cam: 0, h: 36, seed: 9, bands: 2, depth: 0.2, depthNear: 0.05 });
  fl_grassFg(t, { env: E, kind: 'gold', side: 'both', h: 56, n: 20, seed: 6, dip: 0.6 });
  k_dust(t, { n: 30, y0: 170, y1: 440, beam: { x: b.sun[0], y: b.sun[1], angle: Math.PI * 0.55, spread: 2, len: 360 } });
  ly_last = { nx, ny };
}
function ly_y4bUi(u, t, sh) {
  hudTracker(2, 2, 1); hudLieu(2);
  mark(60 + 18, 8 + 18, 'yes', prog(t, ly_A.tick, ly_A.tick + 0.25), 5);
  const h = ly_last; if (h) ly_atchoum(ly_atx(h.nx, 3, 'ATCHOUM', 6), clamp(h.ny + 40, 160, 249), prog(t - ly_A.sn_nez, 0, 1.1), { sc: 3 });
}

// préchauffage : le premier dessin de chaque plan (sols, ciels, sprites en cache) est fait avant le premier plan, puis effacé (aucun pixel ne change)
const ly_PLANS = { y1_savane: ly_y1, y1_atchoum: ly_y1b, y2_reveil: ly_y2a, y2_rassemble: ly_y2b, y3_vote: ly_y3a, y3_depart: ly_y3b, y4_urne: ly_y4a, y4_nez: ly_y4b };

function buildLycaon(S) {
  const W = (id, w, k) => wt(id, w, k), W1 = (id, w, k) => wt1(id, w, k);
  const A = ly_A;
  A.tB = W('y1', 'décisions') - 0.1; A.tC = W('y2', 'Avant') - 0.1; A.tD = W('y2', 'les') - 0.1; A.tE = W('y3', 'Plus') - 0.1; A.tF = W('y3', 'chances') - 0.1;
  A.tG = W('y4', 'Oui') - 0.1; A.tH = W('y4', 'on') - 0.1;
  A.sn0 = W('y1', 'éternuent') + 0.14;                                              // saccade du plan 2 : dans « éternuent »
  A.go = W('y3', 'partir') + 0.04;                                                  // départ de la meute
  // 8 éternuements du cercle : de « Plus » à « partir » (les 6 premiers dans y3_vote, les 2 derniers dans y3_depart)
  const s0 = W('y3', 'Plus') + 0.5, s7 = A.go - 0.2, nS = 8; A.sn = []; for (let k = 0; k < nS; k++) A.sn.push(+(s0 + (s7 - s0) * k / (nS - 1)).toFixed(3));
  A.tLab = W('y3', 'chances') + 0.0;                                                 // l'étiquette de nuance commence à « chances »
  A.vote = W('y4', 'voter') + 0.12;                                                 // le bulletin passe la fente
  A.sn_nez = W('y4', 'nez') + 0.04;                                                 // saccade du gros nez
  A.tick = W1('y4', 'nez') + 0.1;                                                   // la case 3/3 se coche
  const E1 = [[S.t0 + 0.08, 'pop', 1], [S.t0 + 0.1, 'wind', 3.5], [S.t0 + 0.38, 'label', 1], [S.t0 + 0.55, 'bird', 1], [W('y1', 'Afrique') + 0.6, 'bird', 2], [S.t0 + 1.1, 'label', 1]];
  shot('y1_savane', S.t0, { draw: ly_y1, ui: ly_y1Ui, ev: E1 });
  shot('y1_atchoum', A.tB, { draw: ly_y1b, ui: ly_y1bUi, ev: [[A.tB, 'wind', 1.7], [A.sn0 - 0.4, 'suspense', 0.4], [A.sn0, 'sneeze', 1.0]] });
  shot('y2_reveil', A.tC, { draw: ly_y2a, ui: ly_hudOn, ev: [[A.tC + 0.05, 'bird', 0], [A.tC + 0.4, 'yip', 1]] });
  shot('y2_rassemble', A.tD, { draw: ly_y2b, ui: ly_hudOn, ev: [[A.tD, 'run', 1.4], [A.tD + 0.25, 'step', 1], [A.tD + 0.59, 'step', 1], [A.tD + 0.93, 'step', 1], [A.tD + 1.27, 'step', 1], [A.tD + 0.9, 'yip', 1], [A.tD + 1.5, 'yip', 1], [A.tD + 1.8, 'yip', 1]] });
  const ev3 = []; A.sn.forEach((ts, k) => { ev3.push([ts, 'sneeze', 0.9 + 0.35 * ((k * 5) % 4) / 3], [ts + 0.04, 'counter', k + 1]); });
  shot('y3_vote', A.tE, { draw: ly_y3a, ui: (u, t, sh) => ly_y3Ui(u, t, sh, false), ev: ev3.filter(e => e[0] < A.tF).concat([[A.tE + 0.05, 'pop', 1]]) });
  shot('y3_depart', A.tF, { draw: ly_y3b, ui: (u, t, sh) => ly_y3Ui(u, t, sh, true), ev: ev3.filter(e => e[0] >= A.tF).concat([[A.sn[7] + 0.24, 'ding', 1], [A.go, 'run', 1.2], [A.go + 0.05, 'whoosh', 0.6], [A.go + 0.1, 'yip', 1], [A.tLab, 'label', 1]]) });
  shot('y4_urne', A.tG, { draw: ly_y4a, ui: (u, t, sh) => { ly_hudOn(u, t); if (u < 0.95) ly_nuance(t); }, ev: [[A.tG, 'wind', 1.3], [A.tG + 0.05, 'run', 1.3]] });
  shot('y4_nez', A.tH, { draw: ly_y4b, ui: ly_y4bUi, ev: [[A.tH + 0.1, 'whoosh', 0.5], [A.vote, 'vote', 1], [A.sn_nez - 0.35, 'suspense', 0.4], [A.sn_nez, 'sneeze', 1.2], [A.tick, 'ding', 1], [A.tick, 'pop', 1], [A.tick + 0.05, 'reveal', 1]] });
}
INITS.push(() => { for (const id in ly_PLANS) { try { ly_PLANS[id](0.5, 0.5, { t0: 0 }); } catch (e) { } } clearL(); });
