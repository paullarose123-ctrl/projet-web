'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_anguille.js — segment AMAZONIE (anguille électrique), 7 plans calés sur la voix (préfixe an_)
     e1_surface   la rivière au crépuscule vue en coupe : ciel orange et rose, lisière, nénuphars ; sous l'eau, une ombre longue passe   « En Amazonie, une espèce »
     e1_anguille  l'anguille (ondulation d'un bout à l'autre) dans l'eau trouble ; premiers crépitements                               « d'anguille électrique peut produire des décharges allant »
     e1_volts     elle se tend et décharge : arcs ramifiés, eau éclairée, compteur 860 V qui monte jusqu'à « volts »                    « jusqu'à 860 volts ! »
     e2_prise     planche : barre ANGUILLE 860 V, pile de quatre prises (230 V chacune), prise dessinée, « ≈ 4 × UNE PRISE »          « C'est presque quatre fois la tension d'une prise électrique française ! »
     e3_chasse    elle s'approche d'un banc de tétras, se tend                                                                      « Elle utilise cette capacité pour »
     e3_proie     la décharge frappe les tétras : ils se figent, se retournent, flottent                                             « paralyser ses proies »
     e3_defense   un caïman fonce, l'anguille décharge, il recule en tremblant ; case 3/3 cochée ; respiration jusqu'à S.t1         « et se défendre ! »
   TOUT est calé sur wt() / wt1() (an_A : instants absolus des mots, remplis par buildAnguille) : aucune seconde écrite en dur pour un mot ;
   les coupes tombent 0,10 s avant un début de mot. Les durées des mouvements (impulsions, bascule du tétra, recul du caïman) sont fixes, leur DÉPART est calé sur la voix.
   Sprites et décors : sc_anguille_sprites.js (an_eel, an_tetra, an_caiman, an_bolt, an_discharge, an_back, an_sky, an_forest, an_surface, an_counter, an_bar, an_socket) ; kit.js pour les rayons, les poussières, les nuages.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

const an_A = {};
const an_rel = (name, sh) => (an_A[name] ?? 0) - ((sh && sh.t0) || 0);
const an_ptag = (x, y, s, style, u, a, speed = 55, center = false) => u < a ? 0 : tagBox(x, y, s, style, Math.ceil((u - a) * speed), center);
function an_hud(u, t, sh, o = {}) { hudTracker(2, o.done ? 3 : 2, 1); hudLieu(2); }
// pose de repli pour les plans chargés avant la voix (préchauffage)
const AN_FAR = { dark: 0 };

// ───────────── plan 1 : e1_surface ─────────────
function an_p1(u, t, sh) {
  const cam = u * 7, wl = 188, sun = 196;
  an_sky(t, { wl, cam, sunX: sun });
  an_forest(t, { y: wl, cam, sunX: sun });
  an_surface(t, { wl, cam, sunX: sun });
  an_trunks(t, { cam, top: wl, par: 0.5, list: AN_THIN });
  k_rays(sun, wl, t, { angle: Math.PI * 0.56, spread: 1.0, len: 400, n: 8, strength: 0.3, col: '#e8c890', cam, par: 0.1 });
  an_roots(t, { cam, y0: wl + 1, n: 12, len: 50 });
  an_bed(t, { cam, y: 440 });
  an_blades(t, { cam, y: 450, n: 36, h: 56 });
  an_shoal(t, { x0: 30, y0: 262, n: 5, s: 0.55, fog: 0.5, cam, speed: 12 });
  const hx = 150 + 85 * clamp(u / (sh.t1 - sh.t0));
  an_eel(hx, 312 + 4 * Math.sin(u * 2), 0.85, t, { pose: 'cruise', fog: 0.42, rot: -0.04, amp: 0.34 });
  k_dust(t, { n: 26, cam, y0: wl + 10, y1: 440, cols: [CY[1], GR[3], CY[3], WH[2]], par: 0.8 });
  an_bubbles(t, { cam, y0: wl, n: 10 });
  k_glints(t, { n: 14, y0: wl - 2, y1: wl + 6, rate: 2, cam, par: 0.9, col: WH[3], col2: AM[9] });
  vignette(0.35, 130, 320, 135, 260, '8,10,40');
}
function an_p1Ui(u, t, sh) {
  hudTracker(2, 2, prog(u, 0.08, 0.5));
  if (u > 0.3) hudLieu(2, Math.ceil((u - 0.3) * 40));
}

// ───────────── fond sous-marin commun aux plans 2, 3, 5, 6, 7 ─────────────
function an_under(u, t, o = {}) {
  const cam = o.cam || 0;
  an_back(t, { cam, dark: o.dark ?? 0, rays: o.rays ?? 0.34, trunks: o.trunks, seed: o.seed ?? 3, floor: o.floor ?? 440 });
  if (o.shoal !== false) an_shoal(t, { x0: o.shoalX ?? 150, y0: o.shoalY ?? 120, n: 6, s: 0.5, fog: 0.55, cam, par: 0.6, speed: 9, dir: o.shoalDir ?? -1, seed: o.seed ?? 3 });
}
function an_overlay(u, t, o = {}) {
  const cam = o.cam || 0;
  k_dust(t, { n: o.dust ?? 36, cam, y0: 10, y1: 450, cols: [CY[1], GR[3], CY[3], WH[2]], par: 0.8, seed: o.seed ?? 4 });
  an_bubbles(t, { cam, y0: 0, n: o.bubbles ?? 14, seed: o.seed ?? 6 });
  an_blades(t, { cam, y: 492, n: 9, h: 120, par: 1.5, cols: [NI[0], GR[0], GR[0]], rim: GR[1], seed: 11 });
  vignette(o.vig ?? 0.5, 120, 300, 135, 240, '4,14,24');
}

// ───────────── plan 2 : e1_anguille (l'anguille nage, premiers crépitements) ─────────────
function an_p2(u, t, sh) {
  const cam = u * 30;
  const Z = Math.max(an_pulse(t, an_A.z1, 0.3, 0.5), an_pulse(t, an_A.z2, 0.5, 0.9), an_pulse(t, an_A.z3, 0.22, 0.55));
  an_under(u, t, { cam, rays: 0.34 + 0.15 * Z });
  const hx = 238 + 14 * sm(clamp(u / 2.2)), hy = 262 - 28 * sm(clamp(u / 2.2)) + 3 * Math.sin(u * 1.6);
  const e = an_eel(hx, hy, 1.15, t, { pose: 'swim', amp: 0.8, freq: 1.05, rot: -0.2, fog: 0.03, zap: Z });
  an_flash(Z * 0.5);
  an_discharge(e, t, Z, { reach: 80, seed: 3, n: Math.round(2 + 4 * Z) });
  an_overlay(u, t, { cam });
}

// ───────────── plan 3 : e1_volts (décharge, compteur 860 V) ─────────────
const an_VOLT = 860;
function an_voltValue(t) {
  const p = prog(t, an_A.c0, an_A.c1);
  if (t >= an_A.c1) return an_VOLT;
  const noise = (an_h(Math.floor(t * 30), 3) - 0.5) * 2 * 34 * (1 - p);                  // les chiffres vibrent tant que ça monte
  return clamp(Math.round(an_VOLT * (1 - Math.pow(1 - p, 2.1)) + noise), 0, an_VOLT - 1);
}
function an_zapLevel3(t) {
  let Z = 0.4 * prog(t, an_A.c0, an_A.c1);
  for (const [k, tt] of an_A.zs.entries()) Z = Math.max(Z, an_pulse(t, tt, k === an_A.zs.length - 1 ? 0.62 : 0.2, k === an_A.zs.length - 1 ? 1.0 : 0.7 + 0.05 * k));
  if (t > an_A.c1 + 0.6) Z = Math.max(Z * 0.4, an_pulse(t, an_A.c1 + 0.7, 0.4, 0.45));
  return Z;
}
function an_p3(u, t, sh) {
  const cam = u * 8, Z = an_zapLevel3(t), push = 1 + 0.06 * sm(prog(u, 0, 1.6));
  an_under(u, t, { cam, rays: 0.3 + 0.3 * Z, dark: 0.1 });
  const e = an_eel(236, 236, 1.08 * push, t, { pose: 'zap', rot: 0.04, fog: 0, zap: Math.min(1, Z + 0.1), bend: 1.5, ph: 0.2 });
  an_flash(Z);
  an_discharge(e, t, Math.min(1, Z + 0.05), { reach: 105, seed: 7, n: Math.round(3 + 6 * Z), from: 0.08, to: 0.92 });
  an_counterGlow(135, 70, clamp(0.3 + Z), t);
  an_overlay(u, t, { cam, vig: 0.55, dust: 24 });
}
function an_p3Ui(u, t, sh) {
  an_hud(u, t, sh);
  const v = an_voltValue(t), lock = t >= an_A.c1 ? t - an_A.c1 : 0;
  an_counter(135, 46, v, { lock: lock > 0 ? lock / 0.9 : 0, t });
}

// ───────────── plan 4 : e2_prise (planche : barres de comparaison) ─────────────
const AN_YB = 322, AN_HE = 230, AN_U = 230 * 230 / 860;                    // pied des barres, hauteur de la barre de l'anguille (860 V), hauteur d'une prise (230 V)
const AN_XP = 46, AN_WP = 64, AN_XE = 160, AN_WE = 68;
function an_plateBg() {
  vgrad(0, 0, LW, LH, [[0, NI[1]], [1, NI[2]]]);
  for (let x = 0; x < LW; x += 18) R(x, 0, 1, LH, NI[2]); for (let y = 0; y < LH; y += 18) R(0, y, LW, 1, NI[2]);
  for (const [x, y, sx, sy] of [[3, 36, 1, 1], [LW - 4, 36, -1, 1], [3, 352, 1, -1], [LW - 4, 352, -1, -1]]) { R(x, y, sx * 8, 1, ST[3]); R(x, y, 1, sy * 8, ST[3]); }
}
// bloc fantôme (tiret + trame bleue) : une prise de plus dans la pile
function an_ghost(x, y, w, h, a) {
  if (h < 2 || a <= 0) return;
  ditherRect(x, y, w, h, BL[3], 0.22 * a); ditherRect(x, y, w, h, BL[2], 0.1 * a);
  for (let i = 0; i < w; i++) if ((i >> 1) % 2 === 0) { px(x + i, y, BL[4]); px(x + i, y + h - 1, BL[4]); }
  for (let j = 0; j < h; j++) if ((j >> 1) % 2 === 0) { px(x, y + j, BL[4]); px(x + w - 1, y + j, BL[4]); }
}
function an_p4(u, t, sh) {
  const T = an_A, rise = 0.3 + 0.7 * eob(prog(t, T.p0 + 0.0, T.p0 + 0.42));
  an_plateBg();
  rgrad(AN_XE + AN_WE / 2, AN_YB - AN_HE / 2, 10, 150, [[0, 'rgba(70,190,230,0.22)'], [1, 'rgba(20,80,120,0)']], rise, 'lighter');
  R(20, AN_YB, LW - 40, 1, ST[4]); R(20, AN_YB + 1, LW - 40, 3, NI[0]);
  // pile des prises : la première est la vraie barre bleue, les trois suivantes arrivent en fantômes
  const unitT = [T.q0, T.q2, T.q3, T.q4], hP = AN_U;
  an_bar(AN_XP, AN_YB, AN_WP, hP * eob(prog(t, T.q0, T.q0 + 0.28)), 'prise', { t });
  for (let k = 1; k < 4; k++) { const a = eob(prog(t, unitT[k] - 0.03, unitT[k] + 0.18)), hh = (k < 3 ? hP : hP * (860 / 230 - 3)) * a; an_ghost(AN_XP, Math.round(AN_YB - hP * k - hh), AN_WP, Math.round(hh), 1); }
  // repère : le haut de la pile et le haut de la barre de l'anguille sont au même niveau
  const ay = Math.round(AN_YB - AN_HE), la = prog(t, T.tension - 0.05, T.tension + 0.4);
  if (la > 0) for (let x = AN_XP + AN_WP + 2; x < AN_XE + 4; x += 3) if (((x - AN_XP) / 3 | 0) % 2 === 0 && x < AN_XP + AN_WP + 2 + (AN_XE - AN_XP - AN_WP) * la) px(x, ay, YE[3]);
  an_bar(AN_XE, AN_YB, AN_WE, AN_HE * rise, 'eel', { t });
  // prise dessinée sur la barre bleue
  const sk = prog(t, T.prise, T.prise + 0.35);
  if (sk > 0) an_socket(AN_XP + AN_WP / 2 - 2, AN_YB - hP / 2 + 3, 1.1 * eob(sk), t, { spark: prog(t, T.elec, T.elec + 0.1) * (1 - prog(t, T.fr + 0.4, T.fr + 0.8)) * 0.8 });
  // étincelles au sommet de la barre de l'anguille
  const fr = Math.floor(t * 30); for (let k = 0; k < 3; k++) if (an_h(fr + k, 8) < 0.55 * rise) an_bolt(AN_XE + AN_WE / 2 - 2, ay - 5, AN_XE + AN_WE / 2 - 2 + (an_h(fr, 10 + k) - 0.5) * 50, ay - 10 - an_h(fr, 12 + k) * 18, fr * 3 + k, { w: 0.6, branch: 0.3, jag: 0.3, step: 5, glow: 0.4 });
  // petit drapeau tricolore sur sa hampe, posé sur la ligne de base à côté de la prise (« française »)
  const fa = eob(prog(t, T.fr, T.fr + 0.3)); if (fa > 0) { const fx = AN_XP + AN_WP + 8, fh = Math.round(34 * fa), fy = AN_YB - fh; R(fx - 1, fy - 1, 3, fh + 1, '#05040f'); R(fx, fy, 1, fh, ST[6]); R(fx - 1, fy - 3, 3, 2, YE[2]); if (fa > 0.5) { R(fx + 1, fy - 1, 22, 15, '#05040f'); for (let i = 0; i < 20; i++) { const w = Math.round(Math.sin(t * 8 + i * 0.45) * 1.0 * (i / 20)); R(fx + 2 + i, fy + w, 1, 13, i < 7 ? BL[3] : i < 14 ? WH[3] : RD[3]); } } }
  k_glints(t, { n: 10, y0: 60, y1: 330, rate: 1.5, col: WH[3], col2: CY[3] });
}
function an_p4Ui(u, t, sh) {
  an_hud(u, t, sh);
  const T = an_A, ea = prog(t, T.p0 + 0.1, T.p0 + 0.35);
  if (ea > 0) { ptextC('ANGUILLE : 860 V', AN_XE + AN_WE / 2, AN_YB + 12, YE[3], 1, '#05040f', Math.ceil(ea * 30)); ptextC('860 V', AN_XE + AN_WE / 2 - 2, AN_YB - AN_HE - 27, CY[4], 2, '#05040f'); }
  const pa = prog(t, T.prise, T.prise + 0.3); if (pa > 0) ptextC('PRISE : 230 V', AN_XP + AN_WP / 2, AN_YB + 12, BL[4], 1, '#05040f', Math.ceil(pa * 30));
  const labs = ['×1', '×2', '×3', '≈ ×4'], ts = [T.q0, T.q2, T.q3, T.q4];
  for (let k = 0; k < 4; k++) { if (k === 0 && t >= T.prise) continue; if (t < ts[k] + 0.1) continue; const hh = k < 3 ? AN_U : AN_U * (860 / 230 - 3), y = AN_YB - AN_U * k - hh / 2 - 3; ptextC(labs[k], AN_XP + AN_WP / 2, y, k === 3 ? YE[3] : BL[5 - 1], 1, '#05040f'); }
  if (t >= T.fois) tagBox(104, 66, '≈ 4 × UNE PRISE', 'amber', Math.ceil((t - T.fois) * 50), true);
}

// ───────────── plan 5 : e3_chasse (elle s'approche du banc, par derrière) ─────────────
const AN_PREY = [[222, 172, 1.5, 0.0], [248, 204, 1.2, 0.7], [206, 210, 1.0, 1.4], [250, 150, 0.9, 2.1]];            // x, y, échelle, phase (tétras du banc visé)
function an_preyPos(i, t, u) {
  const [x, y, s, ph] = AN_PREY[i];
  return [x + 5 * u + 4 * Math.sin(t * 1.3 + ph) + 3 * Math.sin(t * 0.7 + ph * 2), y + 3 * Math.sin(t * 1.1 + ph), s];
}
function an_p5(u, t, sh) {
  const cam = u * 10, dur = sh.t1 - sh.t0, f = clamp(u / dur), tense = sm(prog(u, dur - 0.6, dur));
  an_under(u, t, { cam, rays: 0.34, shoal: true, shoalY: 360, shoalX: 40, shoalDir: 1 });
  const hx = 136 + 40 * eio(f), hy = 268 - 30 * eio(f);
  an_eel(hx, hy, 0.88, t, { pose: 'stalk', pose2: 'tense', mix: tense, rot: -0.42, fog: 0, zap: 0.14 * tense, amp: 0.2 });
  for (let i = 0; i < AN_PREY.length; i++) { const [x, y, s] = an_preyPos(i, t, u); an_tetra(x - cam * 0.2, y, s, t, { ph: i * 0.37, fog: 0.1, amp: 0.9 }); }
  an_overlay(u, t, { cam });
}

// ───────────── plan 6 : e3_proie (la décharge frappe, les tétras se figent) ─────────────
function an_stun(t, t0, k) { return clamp((t - t0 - k * 0.07) / 0.5); }
function an_p6(u, t, sh) {
  const cam = 10 + u * 6, hit = an_A.hit, Z = Math.max(an_pulse(t, hit, 0.5, 1.0), an_pulse(t, hit + 0.55, 0.3, 0.5) * 0.7);
  an_under(u, t, { cam, rays: 0.32 + 0.3 * Z, shoal: false });
  // l'ombre du caïman glisse au fond, à droite (elle annonce le plan suivant)
  const sh7 = prog(t, hit + 0.45, an_A.tDef);
  if (sh7 > 0) an_caiman(336 - 96 * eo(sh7), 306, 0.9, t, { flip: true, pose: 'stalk', fog: 0.5, open: 0 });
  const e = an_eel(150, 262, 1.0, t, { pose: 'zap', rot: -0.4, zap: Z, bend: 0.8, ph: 0.4, amp: 0.1 });
  an_flash(Z * 0.8);
  // les tétras visés : plus grands qu'au plan précédent (gros plan) ; tournés comme le banc (vers la droite) ; ils se raidissent, se retournent et montent en flottant
  const fish = [[214, 190, 2.3, 0.0, 0.15], [242, 256, 1.8, 0.7, -0.45], [196, 138, 1.4, 1.4, 0.55]], tg = [];
  fish.forEach(([x, y, s, ph, r0], i) => {
    const st = an_stun(t, hit, i), fl = prog(t, hit + 0.3 + i * 0.07, hit + 1.2), drift = fl * (16 + 6 * i);
    const o = an_tetra(x + 3 * Math.sin(t * 0.9 + ph) * (1 - st) + 6 * fl, y - drift + 2 * Math.sin(t * 0.7 + ph) * (1 - st), s, t, { ph, stun: st, rot: r0 * st, fog: 0.05, tremble: st > 0 && st < 1 ? 0.8 : 0.12 * st });
    tg.push(o.body);
  });
  an_discharge(e, t, Z, { reach: 120, seed: 9, targets: Z > 0.05 ? tg.map(p => [p[0], p[1]]) : [], n: Math.round(1 + 2 * Z), crackle: 3, sparks: 8, from: 0.04, to: 0.5 });
  an_overlay(u, t, { cam, vig: 0.55 });
}

// ───────────── plan 7 : e3_defense (le caïman recule, la case se coche) ─────────────
function an_p7(u, t, sh) {
  const cam = 14 + u * 4, hit = an_A.def, d = t - hit, f0 = sh.t0;
  const Z = Math.max(an_pulse(t, hit, 0.6, 1.0), an_pulse(t, hit + 0.15, 0.35, 0.8) * 0.8, an_pulse(t, hit + 0.45, 0.2, 0.5));
  an_under(u, t, { cam, rays: 0.32 + 0.3 * Z, shoal: false, dark: 0.04 });
  // les tétras paralysés flottent en haut, ventre en l'air
  [[58, 112, 1.2, 0.2], [112, 82, 1.0, 0.9], [26, 160, 1.0, 1.6]].forEach(([x, y, s, ph], i) => an_tetra(x - cam * 0.3, y - 2 * Math.sin(t * 0.8 + ph) - 4 * u, s, t, { stun: 1, rot: 0.25 + 0.12 * i + 0.05 * Math.sin(t + ph), ph, fog: 0.15, tremble: 0.1 }));
  // le caïman fonce vers la gauche, l'anguille décharge, il recule en tremblant, gueule ouverte, et sort du cadre
  const go = eo(prog(t, f0, hit)), back = sm(prog(t, hit + 0.03, hit + 1.25));
  const cx0 = 306 - 150 * go + 135 * back, cy0 = 208 + 4 * Math.sin(u * 3) - 10 * back;
  const trem = clamp(d / 0.08) * (1 - 0.6 * prog(t, hit + 0.6, hit + 1.3)), open = 0.25 + 0.6 * sm(prog(t, hit - 0.3, hit)) * (1 - 0.35 * prog(t, hit + 0.5, hit + 1.1));
  const calm = prog(t, hit + 1.0, hit + 1.4);
  const e = an_eel(128, 268, 0.88, t, { pose: Z > 0.1 ? 'zap' : 'tense', mix: calm, pose2: 'swim', rot: -0.3, zap: Z, bend: Z > 0.1 ? 0.9 : 0.4, fog: 0, ph: 0.8, amp: 0.1 + 0.2 * calm });
  an_flash(Z * 0.9);
  const c = an_caiman(cx0, cy0, 1.3, t, { flip: true, pose: d > 0 ? 'recoil' : 'swim', open, tremble: trem, fog: 0.2 - 0.12 * Z, ph: 0.3 });
  an_discharge(e, t, Z, { reach: 125, seed: 5, targets: Z > 0.05 && c.head[0] < 300 ? [c.E(0.2, -0.2), c.E(0.36, 0.5), c.E(0.5, -0.3)] : [], n: Math.round(1 + 3 * Z), crackle: 3, sparks: 8, from: 0.06, to: 0.5 });
  an_overlay(u, t, { cam, vig: 0.55 });
}
function an_p7Ui(u, t, sh) {
  hudTracker(2, 2, 1); hudLieu(2);
  mark(60 + 18, 8 + 18, 'yes', prog(t, an_A.tick, an_A.tick + 0.25), 5);
}

// ───────────── préchauffage ─────────────
const AN_PLANS = { e1_surface: an_p1, e1_anguille: an_p2, e1_volts: an_p3, e2_prise: an_p4, e3_chasse: an_p5, e3_proie: an_p6, e3_defense: an_p7 };

function buildAnguille(S) {
  const W = (id, w, k) => wt(id, w, k), W1 = (id, w, k) => wt1(id, w, k), A = an_A;
  A.tEel = W('e1', "d'anguille") - 0.1; A.tVolts = W('e1', "jusqu'à") - 0.1; A.tPrise = W('e2', "C'est") - 0.1;
  A.tChasse = W('e3', 'Elle') - 0.1; A.tProie = W('e3', 'paralyser') - 0.1; A.tDef = W('e3', 'et') - 0.1;
  // plan 2 : crépitements sur « électrique », « décharges », « allant »
  A.z1 = W('e1', 'électrique') + 0.05; A.z2 = W('e1', 'décharges') + 0.02; A.z3 = W('e1', 'allant') + 0.02;
  // plan 3 : le compteur monte de « jusqu'à » à « volts » ; à chaque pulsation un `zap`
  A.c0 = A.tVolts + 0.06; A.c1 = W('e1', 'volts');
  A.zs = []; { const n = 7, a = A.c0 + 0.05, b = A.c1 - 0.18; for (let k = 0; k < n; k++) A.zs.push(+(a + (b - a) * Math.pow(k / (n - 1), 0.85)).toFixed(3)); A.zs.push(A.c1 + 0.0); }
  // plan 4 : pile de prises, prise dessinée
  A.p0 = A.tPrise; A.q0 = W('e2', 'presque') - 0.02; A.q2 = W('e2', 'quatre') - 0.03; A.q3 = A.q2 + 0.16; A.q4 = W('e2', 'fois') - 0.02; A.fois = W('e2', 'fois') + 0.02;
  A.tension = W('e2', 'tension'); A.prise = W('e2', 'prise') - 0.05; A.elec = W('e2', 'électrique'); A.fr = W('e2', 'française');
  // plan 6 et 7
  A.hit = W('e3', 'paralyser') + 0.04; A.def = W('e3', 'défendre') - 0.06; A.tick = W1('e3', 'défendre') + 0.05;
  // événements
  const ev1 = [[S.t0 + 0.08, 'pop', 1], [S.t0 + 0.1, 'bubbles', 1.2], [S.t0 + 0.12, 'bird', 1], [S.t0 + 0.3, 'label', 1], [S.t0 + 0.9, 'bird', 2], [A.tEel - 0.35, 'bubbles', 0.8]];
  const ev2 = [[A.tEel, 'whoosh', 0.8], [A.tEel + 0.1, 'bubbles', 1.0], [A.z1, 'zap', 0.6], [A.z2, 'zap', 1.1], [A.z3, 'zap', 0.8]];
  const ev3 = A.zs.map((tt, k) => [tt, 'zap', k === A.zs.length - 1 ? 2 : 0.7 + 0.1 * k]);
  for (let k = 0; k < 9; k++) ev3.push([+(A.c0 + (A.c1 - A.c0) * (k + 1) / 9).toFixed(3), 'counter', k + 1]);
  ev3.push([A.c1, 'ding', 1], [A.c1 + 0.04, 'reveal', 1], [A.c1 + 0.2, 'sparkle', 1], [A.tVolts, 'suspense', 1.2]);
  const ev4 = [[A.p0 + 0.02, 'whoosh', 0.5], [A.p0 + 0.05, 'pop', 1], [A.p0 + 0.1, 'label', 1], [A.q0, 'pop', 1], [A.q0, 'counter', 1], [A.q2, 'pop', 1], [A.q2, 'counter', 2], [A.q3, 'pop', 1], [A.q3, 'counter', 3], [A.q4, 'pop', 1], [A.q4, 'counter', 4], [A.fois, 'label', 1],
    [A.tension, 'blip', 1], [A.prise, 'pop', 1], [A.prise + 0.02, 'label', 1], [A.elec, 'zap', 0.7], [A.elec + 0.22, 'zap', 0.5], [A.fr, 'pop', 1], [A.fr + 0.3, 'blip', 1]];
  const ev5 = [[A.tChasse, 'whoosh', 0.6], [A.tChasse + 0.05, 'bubbles', 1.0], [A.tProie - 0.5, 'suspense', 0.5]];
  const ev6 = [[A.hit, 'zap', 1.6], [A.hit + 0.15, 'flop', 0.6], [A.hit + 0.28, 'flop', 0.4], [A.hit + 0.55, 'zap', 0.7], [A.hit + 0.7, 'flop', 0.3]];
  const ev7 = [[A.tDef, 'whoosh', 1.0], [A.tDef + 0.05, 'bubbles', 1.0], [A.def, 'zap', 2], [A.def + 0.03, 'shake', 1], [A.def + 0.15, 'zap', 1.2], [A.def + 0.1, 'whoosh', 0.7], [A.def + 0.45, 'zap', 0.8], [A.tick, 'ding', 1], [A.tick, 'pop', 1], [A.tick + 0.05, 'reveal', 1], [A.tick + 0.1, 'bubbles', 0.6]];
  shot('e1_surface', S.t0, { draw: an_p1, ui: an_p1Ui, ev: ev1 });
  shot('e1_anguille', A.tEel, { draw: an_p2, ui: an_hud, ev: ev2 });
  shot('e1_volts', A.tVolts, { draw: an_p3, ui: an_p3Ui, ev: ev3 });
  shot('e2_prise', A.tPrise, { draw: an_p4, ui: an_p4Ui, ev: ev4 });
  shot('e3_chasse', A.tChasse, { draw: an_p5, ui: an_hud, ev: ev5 });
  shot('e3_proie', A.tProie, { draw: an_p6, ui: an_hud, ev: ev6 });
  shot('e3_defense', A.tDef, { draw: an_p7, ui: an_p7Ui, ev: ev7 });
}
INITS.push(() => { /* préchauffage : après buildAnguille (les ancres de la voix ne sont connues qu'à ce moment-là) */ });
