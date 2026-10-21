'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_grenouille.js — segment ALASKA (grenouille des bois), 10 plans calés sur la voix (préfixe gr_)
     g1_alaska   large : heure bleue d'automne, grenouille sur un tronc moussu, vent, oiseaux                          « En Alaska, la grenouille des bois possède »
     g1_scan     gros plan : balayage « scanner » cyan sur la grenouille, étiquette                                    « un pouvoir digne d'un film de science-fiction ! »
     g2_gel      l'hiver : neige serrée, litière, le givre gagne le corps (pattes d'abord), thermomètre jusqu'à -15      « Pendant l'hiver, son corps gèle, »
     g2_coeur    planche du carnet : cœur qui ralentit puis s'arrête, électrocardiogramme, horloge accélérée            « son coeur s'arrête de battre »
     g2_souffle  grenouille gelée, poumons qui se vident puis s'arrêtent                                               « et elle cesse de respirer. »
     g3_sucre    planche du carnet : cellules ratatinées par la glace, le glucose les enrobe, les cristaux rebondissent « Mais grâce à un sucre qui protège ses cellules, »
     g3_survit   la grenouille gelée sous la neige, coche verte, 18 sur 18                                             « elle survit ! »
     g4_degel    le printemps : la neige recule, gouttes, la glace quitte la grenouille (la tête d'abord)               « Au printemps, elle dégèle »
     g4_coeur    planche du carnet : l'électrocardiogramme repart (le cœur d'abord)                                    « et reprend sa vie »
     g4_saut     prairie fleurie : l'œil s'ouvre, saut, réception, la grenouille respire ; case 1/3 cochée            « comme si de rien n'était ! »
   TOUT est calé sur wt() / wt1() (gr_A : instants absolus des mots, remplis par buildGrenouille) : aucune seconde écrite en dur pour un mot ;
   les coupes tombent 0,10 s avant un début de mot. Les durées des mouvements (cycle de saut, battements) sont fixes, leur DÉPART est calé sur la voix.
   Les sprites sont ceux de sc_grenouille_sprites.js (gr_frog, gr_heart, gr_ecg, gr_cells, gr_glucose, gr_icecrystal, gr_lungs).
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ───────────── ancres de la voix (instants ABSOLUS, remplis par buildGrenouille ; valeurs de repli pour le préchauffage) ─────────────
const gr_A = {};
const gr_rel = (name, sh) => (gr_A[name] ?? 0) - ((sh && sh.t0) || 0);          // instant d'un mot, en secondes depuis le début du plan
const gr_shs = {};                                                               // plans par id (t0, t1) pour les fonctions partagées

// ───────────── outils ─────────────
const gr_pre = (u, a, b) => prog(u, a, b);
function gr_ptag(x, y, s, style, u, a, speed = 60) {                              // étiquette qui se « tape » à partir de l'instant a (u) ; renvoie la largeur
  if (u < a) return 0; return tagBox(x, y, s, style, Math.ceil((u - a) * speed));
}
// ciel et fond lointain d'Alaska (réglages CONSTANTS : un cache par valeur)
function gr_backdrop(P, t, cam, o = {}) {
  const spring = P === 'alaskaSpring', h = o.h ?? 240;
  k_sky(P, t, { h, stars: o.stars ?? 0 });
  if (o.aurora) k_aurora(t, { y: 138, hmax: 84, curtains: 2, intensity: o.aurora, violet: 0.3, cam });
  k_clouds(t, { preset: P, y0: 54, y1: 150, n: 4, speed: 3, cam, seed: o.cseed ?? 11 });
  k_mountains(P, t, { y: h - 4, cam, base: 360, snow: o.snow ?? 1 });
  k_haze(h - 14, h + 26, spring ? '#e4eef8' : '#c9b4d4', 0.5, { t, cam, profile: 'bottom' });
  k_hills(P, t, { y: h + 50, amp: 22, trees: 0.55, cam, haze: spring ? 0.25 : 0.18, seed: 4, snowy: spring ? 0 : 4, par: 0.6, base: 400 });
}

// ───────────── plans 1 et 2 : g1_alaska (large) et g1_scan (gros plan) ─────────────
// heure bleue d'automne : première neige sur la litière, tronc moussu avec la grenouille (lumière à gauche : le liseré est sur son dos)
let gr_last = null;                                                              // dernier retour de gr_frog (masque, boîte) : lu par l'ui du même plan
function gr_g1(u, t, sh, close) {
  const P = 'alaskaDusk', cam = close ? k_pan(u, -6, 8, 'io', 2.6) : k_pan(u, 0, 16, 'io', 2.2);
  gr_backdrop(P, t, cam, { aurora: 0.45, stars: 40 });
  fl_spruceForest(t, { env: P, y: 300, bands: 2, h: 56, seed: 3, cam, snow: 0.55 });
  fl_snowGround(298, 480, { env: P, seed: 7, cam, t, melt: 0.3, under: 'litter' });
  if (!close) {
    fl_birch(t, { x: 246, y: 342, h: 204, env: P, depth: 0.0, leaf: 0, snow: 0.1, seed: 5, cam });             // vrai tronc de bouleau (blanc, marques sombres, branches), plus la fine tige qui ressemblait à un poteau
    fl_spruce(t, { x: 26, y: 326, h: 92, env: P, depth: 0.3, seed: 2, cam, snow: 0.7 });
    fl_leafLitter(10, 340, 262, 420, { env: P, snow: 0.4, seed: 3, cam, scale: 1.4 });
    fl_log(6, 354, 258, 34, { env: P, moss: 0.85, snow: 0.2, seed: 6, end: 'left', cam, depth: 0.1 });
    k_shadow(130 - cam * 1.1, 352, 80, 4, 0.3, { col: '30,36,80' });
    gr_last = gr_frog(130 - cam * 1.1, 331, 3.6, t, { pose: 'sit', light: -1, rim: NE[4], seed: 3, shadow: 0.2 });
    k_breath(gr_last.mouth[0], gr_last.mouth[1], t, { dir: 1, period: 2.2, size: 0.85, phase: 0.2, strength: 0.95 });               // buée du souffle de la grenouille (soir froid)
    fl_moss(34 - cam * 1.1, 404, 44, { env: P, seed: 4, depth: 0.1, cam });
    fl_ferns(t, { x: 252, y: 440, h: 30, n: 6, env: P, depth: 0.1, seed: 4, cam, unfurl: 0.1 });
    fl_grassFg(t, { env: P, kind: 'dry', side: 'bottom', h: 50, n: 26, seed: 8, cam });
    fl_branchFg(t, { env: P, corner: 'tr', kind: 'spruce', len: 120, seed: 6, snow: 0.5, cam });
  } else {
    fl_leafLitter(0, 360, 270, 440, { env: P, snow: 0.4, seed: 5, cam, scale: 2 });
    fl_log(-34, 366, 350, 52, { env: P, moss: 0.9, snow: 0.15, seed: 9, end: 'none', cam, depth: 0.05 });
    k_shadow(135 - cam * 1.1, 354, 100, 5, 0.3, { col: '30,36,80' });
    gr_last = gr_frog(135 - cam * 1.1, 335, 5.2, t, { pose: 'sit', light: -1, rim: NE[4], seed: 3, shadow: 0.2 });
    k_breath(gr_last.mouth[0], gr_last.mouth[1], t, { dir: 1, period: 2.2, size: 1.0, phase: 0.2, strength: 0.95 });
    fl_grassFg(t, { env: P, kind: 'dry', side: 'bottom', h: 60, n: 22, seed: 4, cam });
    fl_branchFg(t, { env: P, corner: 'tl', kind: 'spruce', len: 110, seed: 3, snow: 0.5, cam });
  }
  k_birds(t, { y: 112, x: 30, speed: 12, cam, n: 6, col: NI[2] });
  k_snow(t, { cam, wind: 4, density: 0.6, par: [0.3, 0.6, 1.2] });
  k_glints(t, { y0: 300, y1: 470, n: 12, cam });
  k_vignetteWarm(0.4, { cold: true });
}
function gr_g1Ui(u, t, sh) {
  hudTracker(0, 0, prog(u, 0.08, 0.5));
  if (u > 0.3) hudLieu(0, Math.ceil((u - 0.3) * 30));
}
function gr_tight(m) {                                                           // boîte serrée de la silhouette (le bbox du sprite peut couvrir toute la page) : balayage du masque de 2 en 2
  const [x0, y0, w, h] = m.bbox; let ax = 1e9, ay = 1e9, bx = -1, by = -1;
  for (let y = y0; y < y0 + h; y += 2) for (let x = x0; x < x0 + w; x += 2) if (m.mask(x, y)) { if (x < ax) ax = x; if (x > bx) bx = x; if (y < ay) ay = y; if (y > by) by = y; }
  return bx < 0 ? [0, 0, 0, 0] : [ax - 1, ay - 1, bx - ax + 3, by - ay + 3];
}
// balayage « scanner » : la ligne descend sur la grenouille de « digne » à « science-fiction », remonte pendant « science-fiction » ; la partie déjà balayée se couvre d'une grille cyan
function gr_scanUi(u, t, sh) {
  const m = gr_last; hudTracker(0, 0, 1); hudLieu(0);
  if (!m) return;
  const [bx, by, bw, bh] = gr_tight(m), a = gr_rel('digne', sh), b = gr_rel('sf', sh), c = gr_rel('sf1', sh) + 0.05;
  const y1 = by - 6, y2 = by + bh + 6;
  const ys = u < a ? y1 - 40 : u < b ? lerp(y1, y2, sm(prog(u, a, b))) : lerp(y2, y1, sm(prog(u, b, c)));
  const down = u >= a && u < b, pass = u >= a;
  // zone balayée : à la descente, les pixels du masque au-dessus de la ligne ; ensuite toute la silhouette reste quadrillée, et la remontée la « verrouille » (bord blanc, trame plus claire) sous la ligne
  if (pass) {
    const k = m.mask, y0 = by, yb = Math.min(by + bh, Math.ceil(u < b ? ys : y2)), lock = u >= b ? ys : 1e9;
    for (let y = y0; y < yb; y++) for (let x = bx; x < bx + bw; x++) {
      if (!k(x, y)) continue;
      const edge = !k(x - 1, y) || !k(x + 1, y) || !k(x, y - 1) || !k(x, y + 1), on = y >= lock;
      if (edge) px(x, y, on ? WH[3] : CY[4]);
      else if ((y % 6) === 0 || (x % 8) === 0) px(x, y, on ? CY[4] : CY[3]);
      else if (((x + y) & 1) === 0 && ((y >> 1) & 1) === 0 && !on) px(x, y, CY[2]);
    }
  }
  if (u >= a - 0.1 && u < c + 0.25) {                                                // la ligne et sa lueur
    const f = u < a ? 0 : u > c ? 1 - prog(u, c, c + 0.25) : 1;
    if (f > 0) {
      R(0, ys - 1, LW, 2, CY[4]); R(0, ys, LW, 1, WH[3]);
      for (let d = 2; d <= 7; d++) { ditherRect(0, ys - d - 1, LW, 1, CY[3], 0.62 - d * 0.08); ditherRect(0, ys + d, LW, 1, CY[3], 0.62 - d * 0.08); }
      for (let x = 6; x < LW; x += 18) px(x, ys - 3 - ((x * 7) % 3), WH[3]);
    }
  }
  // cadre de visée autour de la grenouille (coins) et mesures sur le côté, après le passage
  const fr = prog(u, a + 0.3, a + 0.8);
  if (fr > 0) {
    const x0 = bx - 4, x1 = bx + bw + 3, y0 = by - 4, y1b = by + bh + 3, l = Math.round(10 * eo(fr));
    for (const [cx0, cy0, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1b, 1, -1], [x1, y1b, -1, -1]]) { R(cx0, cy0, sx * l, 1, CY[4]); R(cx0, cy0, 1, sy * l, CY[4]); if (sx > 0) R(cx0, cy0, sx * l, 1, CY[4]); }
    for (let i = 0; i < 6; i++) { const yy = y0 + 8 + i * Math.round((y1b - y0 - 16) / 5); R(x1 + 6, yy, i % 2 ? 4 : 7, 1, CY[3]); }
  }
  gr_ptag(8, 40, 'GRENOUILLE DES BOIS', 'blue', u, a + 0.05);
}

// ───────────── décor d'hiver / de printemps du terrier : même endroit pour g2_gel, g2_souffle, g3_survit (hiver) et g4_degel (printemps) ─────────────
// P = 'alaskaDusk' (heure bleue, lumière à gauche) ou 'alaskaSpring' (matin, lumière à droite) ; la grenouille est posée par l'appelant en (gr_BX, gr_BY)
const gr_BX = 128, gr_BY = 340;
function gr_burrow(u, t, P, cam, o = {}) {
  const spring = P === 'alaskaSpring', snow = o.snow ?? 1;
  gr_backdrop(P, t, cam, { aurora: spring ? 0 : 0.3, stars: spring ? 0 : 30, cseed: 13, snow: spring ? 0.8 : 1 });
  fl_spruceForest(t, { env: P, y: 300, bands: 2, h: 58, seed: 8, cam, snow: spring ? 0.25 : 0.9, fog: spring ? 0.55 : 0.6 });
  if (!spring) fl_snowGround(298, 480, { env: P, seed: 11, cam, t, melt: 0, under: 'litter', leafK: 3,
    shadows: [{ x: 40, y: 330, len: 90, w: 10 }, { x: 236, y: 336, len: 110, w: 12 }] });
  else fl_snowGround(298, 480, { env: P, seed: 11, cam, t, melt: o.melt ?? 0.5, under: 'litter', leafK: 3 });
  fl_spruce(t, { x: 230, y: 330, h: 96, env: P, depth: 0.3, seed: 4, cam, snow: spring ? 0.25 : 0.95 });
  fl_spruce(t, { x: 20, y: 324, h: 78, env: P, depth: 0.4, seed: 6, cam, snow: spring ? 0.25 : 0.95 });
  fl_leafLitter(26, 322, 244, 378, { env: P, snow: o.litterSnow ?? (spring ? 0.2 : 0.12), scale: 3.2, seed: 2, cam });
  fl_deadBranches(t, { x: 205, y: 352, h: 30, n: 4, kind: 'fallen', env: P, depth: 0.2, seed: 5, cam, snow: spring ? 0.1 : 0.9 });
  fl_rock(228, 372, 40, 26, 'round', 5, { env: P, mat: 'stone', depth: 0.15, cam, snow: spring ? 0.15 : 0.9, moss: 0.5 });
}
function gr_burrowFg(u, t, P, cam, o = {}) {
  const spring = P === 'alaskaSpring';
  fl_deadBranches(t, { x: 40, y: 452, h: 54, n: 5, env: P, depth: 0.0, seed: 3, cam, snow: spring ? 0.1 : 0.9 });
  fl_branchFg(t, { env: P, corner: 'tl', kind: 'spruce', len: 120, seed: 8, snow: spring ? 0.2 : 0.9, cam });
  fl_branchFg(t, { env: P, corner: 'br', kind: 'spruce', len: 100, seed: 2, snow: spring ? 0.15 : 0.9, cam });       // au printemps : c'est la pointe de cette branche qui goutte dans la mare
}

// ───────────── plan 3 : g2_gel ─────────────
// le givre gagne le corps de « Pendant l'hiver » à la fin de « gèle » : pattes d'abord, tête en dernier ; la gorge se fige à mesure ; thermomètre jusqu'à -15
function gr_gelIce(u, sh) { return 0.74 * Math.pow(sm(prog(u, 0.15, gr_rel('gele1', sh) + 0.1)), 1.25); }
function gr_g2gel(u, t, sh) {
  const P = 'alaskaDusk', cam = k_pan(u, -4, 8, 'io', 2.2), ice = gr_gelIce(u, sh);
  gr_burrow(u, t, P, cam);
  k_shadow(gr_BX - cam * 1.1, gr_BY + 2, 74, 4, 0.34, { col: '30,36,80' });
  // le dégel à l'envers : 'thaw' de ph 1 (assise) à ph 0,12 (ramassée, gelée) : la posture se fige en même temps que le givre gagne (le clignement de réflexe du dégel est coupé)
  const ph = 1 - 0.88 * sm(prog(u, 0.25, gr_rel('gele1', sh) + 0.1));
  gr_last = gr_frog(gr_BX - cam * 1.1, gr_BY, 4.4, t, { pose: 'thaw', ph, light: -1, rim: NE[4], seed: 3, shadow: 0.2, ice, blink: 0, breath: gr_breath(t, 1.25, gr_h(3, 1)) * (1 - prog(ice, 0.1, 0.55)) });
  gr_burrowFg(u, t, P, cam);
  k_snow(t, { cam, wind: 7, density: 1.7, speed: 1.1, par: [0.3, 0.6, 1.2], gust: { t0: sh.t0 + 0.2, t1: sh.t0 + 1.0, push: 30 } });
  k_glints(t, { y0: 300, y1: 470, n: 14, cam });
  k_vignetteWarm(0.45, { cold: true });
}
// thermomètre vertical (ui) : colonne qui descend de 0 à -15 ; couleurs exactes
function gr_thermo(x, y, h, v, label) {                                          // v : 0 (0 °C) → 1 (-15 °C)
  R(x - 1, y - 1, 9, h + 2, '#05040f'); R(x, y, 7, h, ST[2]); R(x + 1, y + 1, 5, h - 2, NI[1]);
  const fill = Math.round((h - 4) * (1 - 0.85 * v));
  R(x + 2, y + h - 2 - fill, 3, fill, v < 0.35 ? RD[4] : v < 0.7 ? SK[4] : CY[3]); R(x + 2, y + h - 2 - fill, 1, fill, WH[3]);
  disc(x + 3, y + h + 4, 5, '#05040f'); disc(x + 3, y + h + 4, 4, v < 0.35 ? RD[3] : v < 0.7 ? SK[3] : CY[2]); px(x + 2, y + h + 3, WH[3]);
  for (const [i, lab] of [[0, '0'], [1, '-5'], [2, '-10'], [3, '-15']]) { const yy = y + 3 + Math.round((h - 8) * (i / 3) * 0.85); R(x - 5, yy, 4, 1, ST[6]); ptextR(lab, x - 7, yy - 3, i === 3 && v > 0.9 ? CY[4] : ST[6], 1, null); }
  if (label) ptextC(label, x + 3, y + h + 14, v > 0.8 ? CY[4] : WH[2], 1, '#05040f');
}
function gr_g2gelUi(u, t, sh) {
  hudTracker(0, 0, 1); hudLieu(0);
  const gl = gr_rel('gele', sh), v = sm(prog(u, gr_rel('hiver', sh) + 0.1, gr_rel('gele1', sh) + 0.1));
  gr_thermo(244, 62, 100, v, (v < 0.05 ? '0' : '-' + Math.round(v * 15)) + ' °C');
  gr_ptag(8, 40, "≈ 2/3 DE L'EAU EN GLACE", 'blue', u, gr_rel('corps', sh) - 0.05);
}

// ───────────── planches du carnet (g2_coeur, g3_sucre, g4_coeur) ─────────────
function gr_plateBg() {
  vgrad(0, 0, LW, LH, [[0, NI[1]], [1, NI[2]]]);
  for (let x = 0; x < LW; x += 18) R(x, 0, 1, LH, NI[2]); for (let y = 0; y < LH; y += 18) R(0, y, LW, 1, NI[2]);
  for (const [x, y, sx, sy] of [[3, 36, 1, 1], [LW - 4, 36, -1, 1], [3, 352, 1, -1], [LW - 4, 352, -1, -1]]) { R(x, y, sx * 8, 1, ST[3]); R(x, y, 1, sy * 8, ST[3]); }
}
// battements : la liste ABSOLUE est construite par buildGrenouille ; impulsion du cœur 0..1 (montée rapide, retour lent)
function gr_pulse(t, bs) { let v = 0; for (const b of bs) { const d = t - b; if (d >= 0 && d < 0.5) v = Math.max(v, d < 0.08 ? sm(d / 0.08) : 1 - sm((d - 0.08) / 0.36)); } return v; }
// coupe du sol de la forêt (bas des planches, y ≥ 394) : neige, litière de feuilles, terre, racines ; la grenouille y repose dans une poche sombre
const gr_SY = 394;
function gr_strip(t, o = {}) {
  const y0 = gr_SY, snow = o.snow ?? 1, r = rng(77), cx = o.cx ?? 135;
  R(0, y0, LW, LH - y0, WO[1]); vgrad(0, y0 + 8, LW, LH - y0 - 8, [[0, WO[2]], [0.5, WO[1]], [1, WO[0]]]);
  const leaves = [WO[3], OC[2], WO[2], OC[1], WO[4], OC[3], WO[1]];
  for (let i = 0; i < 90; i++) { const x = r() * LW, y = y0 + 6 + r() * 78, w = 3 + r() * 6, h = 1 + r() * 1.5, c = leaves[i % 7]; ell(x, y, w, Math.ceil(h), c); if (r() < 0.4) px(x - w * 0.5, y - 1, leaves[(i + 3) % 7]); }
  for (let i = 0; i < 5; i++) { const x = r() * LW, y = y0 + 40 + r() * 40; lineP(x, y, x + 14 + r() * 18, y + 6 - r() * 12, WO[0], 1); }
  for (let i = 0; i < 12; i++) { const x = r() * LW, y = y0 + 50 + r() * 34; ell(x, y, 2 + r() * 2, 1 + r(), ST[2]); px(x - 1, y - 1, ST[4]); }
  ell(cx, y0 + 52, 60, 28, NI[0]); ell(cx, y0 + 50, 57, 25, NI[1]);                    // la poche où la grenouille s'est tapie
  // neige en dessus (coupe) : bord inférieur ondulé, plus épais côté ombre ; fond et dérive
  const th = x => Math.round(snow * (8 + 3 * Math.sin(x * 0.09 + 1) + 2 * Math.sin(x * 0.23)) + (snow > 0 ? 1 : 0));
  for (let x = 0; x < LW; x++) { const h = th(x); if (h <= 0) continue; R(x, y0, 1, h, NE[3]); R(x, y0, 1, 2, NE[4]); R(x, y0 + h - 2, 1, 1, NE[1]); R(x, y0 + h - 1, 1, 1, ST[5]); if ((x + y0) % 7 === 0) px(x, y0 + 3, NE[2]); }
  if (snow < 0.5) for (let x = 3; x < LW; x += 5) { const hh = 4 + Math.round(3 * k_h(x, 4)); lineP(x, y0, x + (k_h(x, 5) < 0.5 ? -1 : 1), y0 - hh, k_h(x, 6) < 0.5 ? LM[3] : LM[4], 1); }
  R(0, y0 - 1, LW, 1, snow > 0.5 ? NE[4] : LM[2]);
}
// la grenouille du carnet dans sa poche + cercle sur la poitrine + trait pointillé jusqu'à l'organe agrandi (target)
function gr_plateFrog(t, o, target, snow = 1) {
  gr_strip(t, { snow });
  const s = 2.5, cx = 135, cy = gr_SY + 76, m = gr_frog(cx, cy, s, t, { light: 1, rim: NE[4], shadow: 0, seed: 3, ...o });
  const hx = m.throat[0] + (m.hip[0] - m.throat[0]) * 0.38, hy = m.throat[1] + (m.hip[1] - m.throat[1]) * 0.2 - 1.5 * s, r = 7;
  for (let a = 0; a < 44; a += 2) px(hx + Math.cos(a / 44 * TAU) * r, hy + Math.sin(a / 44 * TAU) * r * 0.85, AM[8]);
  if (target) for (let k = 0; k < 40; k++) { const f = k / 39, x = hx + (target[0] - hx) * f, y = hy - r * 0.9 + (target[1] - hy + r * 0.9) * f; if (k % 2 === 0 && y < gr_SY - 2) px(x, y, AM[7]); }
  return m;
}

// ───────────── plan 4 : g2_coeur ─────────────
// le dernier battement tombe pendant « battre » ; les précédents sont de plus en plus serrés vers le passé (la planche est une accélération : l'horloge compte les heures depuis le début du gel, ≈ 20 h)
const gr_HB = [0, 0.46, 0.82, 1.12, 1.38, 1.6, 1.8, 1.98, 2.15, 2.3];                    // écarts (s) entre chaque battement et le dernier
function gr_beatsHeart(last) { return gr_HB.slice().reverse().map(d => last - d); }
function gr_g2coeur(u, t, sh) {
  const bs = gr_A.hbeats || [], stop = gr_A.stop, nb = bs.length, st = t < bs[nb - 2] + 0.3 ? 'live' : t < stop ? 'slow' : 'stopped';
  gr_plateBg();
  gr_ecg(16, 68, 238, 56, t, { beats: bs, speed: 84, now: 0.88, alarm: t >= stop });
  gr_heart(135, 224, 2.1, t, { state: st, beat: gr_pulse(t, bs), light: 1 });
  gr_plateFrog(t, { pose: 'frozen', ice: 0.72 }, [135, 282], 1);
}
function gr_g2coeurUi(u, t, sh) {
  hudTracker(0, 0, 1); hudLieu(0);
  const stop = gr_A.stop, H = Math.round(20 * sm(prog(t, sh.t0, stop)));
  ptext('ÉLECTROCARDIOGRAMME', 16, 57, GR[5], 1, null);
  ptext('DEPUIS LE GEL', 16, 134, ST[6], 1, null); counter(206, 128, H + ' H', 2, AM[8]);
  gr_ptag(8, 40, 'COEUR : 0 BATTEMENT', 'red', u, gr_A.battre - sh.t0 - 0.05);
}

// ───────────── plan 5 : g2_souffle ─────────────
// grenouille gelée dans son terrier ; à « cesse » les poumons (planche en haut à droite) se vident et s'arrêtent ; « RESPIRATION : 0 » à « respirer »
function gr_g2souffle(u, t, sh) {
  const P = 'alaskaDusk', cam = k_pan(u, 6, -2, 'io', 1.6), ice = 0.74 + 0.08 * sm(prog(u, 0, gr_rel('respirer', sh)));
  gr_burrow(u, t, P, cam);
  k_shadow(gr_BX - cam * 1.1, gr_BY + 2, 74, 4, 0.34, { col: '30,36,80' });
  gr_frog(gr_BX - cam * 1.1, gr_BY, 4.4, t, { pose: 'frozen', light: -1, rim: NE[4], seed: 3, shadow: 0.2, ice });
  gr_burrowFg(u, t, P, cam);
  k_snow(t, { cam, wind: 5, density: 1.2, speed: 1.0, par: [0.3, 0.6, 1.2] });
  k_glints(t, { y0: 300, y1: 470, n: 16, cam, rate: 1.3 });
  k_vignetteWarm(0.45, { cold: true });
  // fenêtre « poumons » (dessinée ici car les poumons sont des sprites tramés)
  R(163, 52, 100, 92, ST[4]); R(164, 53, 98, 90, '#05040f'); vgrad(165, 54, 96, 88, [[0, NI[2]], [1, NI[1]]]);
  const cs = gr_rel('cesse', sh), live = u < cs, k = live ? 0.5 - 0.5 * Math.cos((u / 0.72) * TAU) : 0;
  gr_lungs(213, 102, 1.15, t, { inflate: live ? k : Math.max(0, k), state: u < cs + 0.1 ? 'live' : 'stopped' });
}
function gr_g2souffleUi(u, t, sh) {
  hudTracker(0, 0, 1); hudLieu(0);
  ptext('POUMONS', 168, 57, ST[6], 1, null);
  gr_ptag(8, 40, 'RESPIRATION : 0', 'red', u, gr_rel('respirer', sh) - 0.05);
}

// ───────────── plan 6 : g3_sucre ─────────────
// cellules ratatinées par la glace (« Mais grâce à un »), le glucose arrive sur « sucre », les enrobe sur « protège », les cristaux rebondissent sur « cellules »
function gr_g3sucre(u, t, sh) {
  const su = gr_rel('sucre', sh), pr = gr_rel('protege', sh), ce = gr_rel('cellules', sh);
  gr_plateBg();
  const shrink = 0.9 * sm(prog(u, 0.0, su)), glu = sm(prog(u, su, ce)), bounce = prog(u, pr, pr + 0.9);
  gr_cells(10, 150, 250, 190, t, { shrink, glucose: glu, ice: shrink, bounce, molecules: glu, seed: 5, n: 8 });
  const a = eob(prog(u, su - 0.35, su + 0.05)), fl = bump(u, su - 0.05, su + 0.1, su + 0.3, su + 0.9);
  if (a > 0) gr_glucose(135, 96, 0.6 + 1.8 * a, t, { glow: 0.5 + fl, spin: 0.7, rot: 0.3 });
  gr_plateFrog(t, { pose: 'frozen', ice: 0.72 }, [135, 344], 1);
  if (u > su && u < su + 0.5) { const f = 1 - prog(u, su, su + 0.5); for (let k = 0; k < 10; k++) { const an = k / 10 * TAU + 0.3, r = 20 + 50 * (1 - f); px(135 + Math.cos(an) * r, 96 + Math.sin(an) * r * 0.7, k % 2 ? AM[9] : WH[3]); } }
}
function gr_g3sucreUi(u, t, sh) {
  hudTracker(0, 0, 1); hudLieu(0);
  ptext('CELLULES', 14, 138, ST[6], 1, null);
  gr_ptag(8, 40, 'SUCRE : GLUCOSE', 'amber', u, gr_rel('sucre', sh));
  ptext('GLACE', 14, 346, CY[4], 1, null); ptext('GLUCOSE', 14 + textW('GLACE  '), 346, AM[8], 1, null);
}

// ───────────── plan 7 : g3_survit ─────────────
function gr_g3survit(u, t, sh) {
  const P = 'alaskaDusk', cam = k_pan(u, -5, 7, 'io', 1.0), sv = gr_rel('survit', sh);
  gr_burrow(u, t, P, cam);
  k_shadow(gr_BX - cam * 1.1, gr_BY + 2, 74, 4, 0.34, { col: '30,36,80' });
  gr_frog(gr_BX - cam * 1.1, gr_BY, 4.4, t, { pose: 'frozen', light: -1, rim: NE[4], seed: 3, shadow: 0.2, ice: 0.82 });
  // lueur ambre qui pulse (≈ 1,7 Hz, comme un cœur qui se prépare) dès le début du plan ; l'éclat de « survit » s'y ajoute ; deux halos : un large, un serré sur le ventre
  const e = sm(prog(u, 0.02, 0.28)), pu = 0.5 + 0.5 * Math.sin((u - 0.1) * TAU * 1.7), fl = bump(u, sv - 0.05, sv + 0.1, sv + 0.4, sv + 0.7);
  k_glow(gr_BX - cam * 1.1, gr_BY - 22, 150, '255,170,70', e * (0.12 + 0.08 * pu + 0.1 * fl));
  k_glow(gr_BX - cam * 1.1 + 6, gr_BY - 20, 70, '255,214,130', e * (0.13 + 0.1 * pu + 0.12 * fl));
  gr_burrowFg(u, t, P, cam);
  k_snow(t, { cam, wind: 4, density: 1.0, speed: 1.0, par: [0.3, 0.6, 1.2] });
  k_glints(t, { y0: 300, y1: 470, n: 16, cam, rate: 1.4 });
  k_glints(t, { x0: 40, x1: 215, y0: 262, y1: 352, n: 14, cam, par: 1.1, rate: 2.6, seed: 21, col: YE[3], col2: AM[7] });   // le givre de la grenouille scintille, tiré vers l'ambre par la lueur
  k_vignetteWarm(0.45, { cold: true });
}
function gr_g3survitUi(u, t, sh) {
  hudTracker(0, 0, 1); hudLieu(0);
  const sv = gr_rel('survit', sh);
  if (u >= sv) { mark(206, 120, 'yes', prog(u, sv, sv + 0.35), 16); gr_ptag(8, 40, '18 SUR 18 SURVIVENT', 'green', u, sv + 0.05); }
}

// ───────────── plan 8 : g4_degel ─────────────
// matin de printemps, même terrier : la neige recule, les gouttes tombent d'une branche, la glace quitte la grenouille (la tête d'abord) pendant « dégèle »
// goutte de fonte : un renflement s'accroche à la pointe de la branche (0,35 s), se détache, tombe en accélérant (g ≈ 420 px/s²) et touche l'eau à td ;
// à l'impact : deux anneaux clairs sur filet sombre (lisibles sur le reflet), quelques gouttelettes. (x, y0) = pointe ; y1 = surface de l'eau.
const gr_G = 420;
const gr_PX = 160, gr_PY = 445, gr_TX = 181, gr_TY = 416;                       // mare (centre) et pointe de branche qui goutte
function gr_dropFall(y0, y1) { return Math.sqrt(2 * Math.max(1, y1 - y0) / gr_G); }
function gr_dripFx(x, y0, y1, td, t, pond) {                                       // pond : [cx, rx, ry] de la mare (les anneaux sont coupés à son bord)
  const T = gr_dropFall(y0, y1), a = t - (td - T), age = t - td;
  if (a < -0.4 || age > 0.8) return;
  const dk = CY[1], hi = WH[3], col = CY[4];
  if (a < 0) {                                                                    // renflement qui gonfle à la pointe
    const q = (a + 0.4) / 0.4;
    if (q < 0.3) { px(x, y0 + 1, dk); px(x, y0 + 1, col); }
    else if (q < 0.65) { px(x - 1, y0 + 1, dk); px(x, y0 + 1, hi); px(x + 1, y0 + 1, dk); px(x, y0 + 2, dk); }
    else { px(x - 1, y0 + 1, dk); px(x, y0 + 1, hi); px(x + 1, y0 + 1, dk); px(x - 1, y0 + 2, dk); px(x, y0 + 2, col); px(x + 1, y0 + 2, dk); px(x, y0 + 3, dk); if (q > 0.88) px(x, y0 + 4, dk); }
  } else if (age < 0) {                                                           // chute : tête 3 × 4 à liseré sombre + traînée qui s'allonge avec la vitesse
    const yy = Math.round(y0 + 2 + 0.5 * gr_G * a * a), tail = Math.min(14, 2 + Math.round(gr_G * a * 0.03));
    for (let s_ = 3; s_ <= tail + 2; s_++) px(x, yy - s_, s_ < 6 ? col : (s_ % 2 ? CY[3] : dk));
    px(x, yy - 1, dk); px(x - 1, yy, dk); px(x, yy, hi); px(x + 1, yy, dk); px(x - 1, yy + 1, dk); px(x, yy + 1, col); px(x + 1, yy + 1, dk); px(x, yy + 2, dk);
  } else {                                                                        // impact : anneaux (liseré sombre dessous, trait clair dessus) + gouttelettes
    L.save(); L.beginPath(); L.ellipse(pond[0], y1 - 1, pond[1] - 1, pond[2] - 1, 0, 0, TAU); L.clip();
    for (let k = 0; k < 2; k++) {
      const b = age - k * 0.13; if (b <= 0) continue;
      const r = 2 + 24 * eo(clamp(b / 0.55, 0, 1)), f = 1 - b / 0.62; if (f <= 0) continue;
      const n = Math.ceil(r * 7), ry = r * 0.34;
      for (let q = 0; q < n; q++) {
        const an = q / n * TAU, X = x + Math.cos(an) * r, Y = y1 + Math.sin(an) * ry;
        if (k_bay(q, k + 3) > f * 1.5) continue;
        px(X, Y + 1, dk); px(X, Y, f > 0.55 ? hi : col);
      }
    }
    L.restore();
    if (age < 0.3) for (let i = 0; i < 5; i++) {
      const vx = (i - 2) * 9 + (k_h(i, 9) - 0.5) * 5, vy = -46 - 22 * k_h(i, 10), X = x + vx * age, Y = y1 + vy * age + 0.5 * 230 * age * age;
      if (Y > y1 + 1) continue; px(X, Y, age < 0.15 ? hi : col); if (age < 0.12) px(X, Y - 1, col);
    }
  }
}
function gr_degelIce(u, sh) { return 0.74 - 0.14 * sm(prog(u, 0.3, gr_rel('degele', sh))) - 0.5 * sm(prog(u, gr_rel('degele', sh), gr_rel('degele1', sh) + 0.05)); }
function gr_runoff(m, t, tStart) {                                                // gouttes de fonte qui glissent sur la glace de la grenouille (surface lue dans le masque)
  const [x0, y0, w, h] = gr_tight(m); if (t < tStart || w <= 0) return;
  for (let i = 0; i < 7; i++) {
    const per = 0.8 + 0.5 * gr_h(i, 21), loc = (((t - tStart) / per + gr_h(i, 22)) % 1 + 1) % 1, x = Math.round(x0 + w * (0.15 + 0.7 * gr_h(i, 23)));
    let yt = y0; while (yt < y0 + h && !m.mask(x, yt)) yt++;
    const y = Math.round(yt + 2 + loc * 16); if (!m.mask(x, y)) continue;
    px(x, y, WH[3]); px(x, y + 1, CY[4]); if (loc > 0.15) px(x, y - 1, CY[3]); if (loc > 0.4) px(x, y - 3, NE[4]);
  }
}
function gr_g4degel(u, t, sh) {
  const P = 'alaskaSpring', cam = k_pan(u, 12, -6, 'io', 1.9), melt = 0.15 + 0.6 * sm(prog(u, 0, 1.5)), ice = gr_degelIce(u, sh), dg = gr_rel('degele', sh), dg1 = gr_rel('degele1', sh);
  gr_burrow(u, t, P, cam, { melt: Math.round(melt * 40) / 40, litterSnow: 0.35 * (1 - melt) });
  k_rays(262 - cam * 0.04, -20, t, { angle: 2.0, spread: 0.9, len: 430, strength: 0.3, n: 8, col: WH[2], col2: YE[3], cam });
  const D = (gr_A.drips || []);
  k_puddle(gr_PX - cam * 1.1, gr_PY, 46, 11, t, { preset: P, drips: [], axis: 170 });        // mare dégagée (plus de branches mortes devant) : elle reflète le ciel bleu, les anneaux y tranchent
  k_shadow(gr_BX - cam * 1.1, gr_BY + 2, 74, 4, 0.34, { col: '40,30,20' });
  const ph = 0.55 * sm(prog(u, dg + 0.1, dg1 + 0.1));
  gr_last = gr_frog(gr_BX - cam * 1.1, gr_BY, 4.4, t, { pose: 'thaw', ph, light: 1, rim: '#fff8e8', seed: 3, shadow: 0.2, ice, iceFrom: 'head' });
  if (ice > 0.1) gr_runoff(gr_last, t, sh.t0 + 0.2);
  gr_burrowFg(u, t, P, cam);
  const tx = gr_TX - Math.max(-10, Math.min(10, cam * 0.54)), ty = gr_TY;                  // pointe de la branche (premier plan, avant bas droit) qui goutte
  for (const d of D) gr_dripFx(tx, ty, gr_PY + 1, d, t, [gr_PX - cam * 1.1, 46, 11]);
  k_birds(t, { y: 100, x: 200, speed: 14, cam, n: 4, col: NI[3], dir: -1 });
  k_pollen(t, { n: 22, y0: 120, y1: 330, cam, beam: { x: 262, y: -20, angle: 2.0, spread: 1.1, len: 520 } });
  k_glints(t, { y0: 300, y1: 440, n: 14, cam, col2: CY[4] });
}
function gr_g4degelUi(u, t, sh) {
  hudTracker(0, 0, 1); hudLieu(0);
  gr_ptag(8, 40, 'GELÉE ≈ 6 MOIS', 'blue', u, gr_rel('printemps', sh));
}

// ───────────── plan 9 : g4_coeur ─────────────
// le cœur repart en premier : anneau doré à chaque battement, tracé qui reprend, l'œil de la grenouille du carnet se rallume
function gr_g4coeur(u, t, sh) {
  const bs = gr_A.rbeats || [], first = bs[0], st = t < first - 0.02 ? 'stopped' : 'restart';
  gr_plateBg();
  gr_ecg(16, 68, 238, 56, t, { beats: bs, speed: 84, now: 0.88, alarm: t < first - 0.02 });
  gr_heart(135, 224, 2.1, t, { state: st, beat: gr_pulse(t, bs), light: 1 });
  const k = sm(prog(t, first, first + 0.7));
  gr_plateFrog(t, { pose: 'thaw', ph: 0.4 + 0.3 * k, ice: 0.5 * (1 - k), iceFrom: 'head' }, [135, 282], 0.35);
}
function gr_g4coeurUi(u, t, sh) {
  hudTracker(0, 0, 1); hudLieu(0);
  const bs = gr_A.rbeats || [], n = bs.filter(b => b <= t).length;
  ptext('ÉLECTROCARDIOGRAMME', 16, 57, GR[5], 1, null);
  ptext('BATTEMENTS', 16, 134, ST[6], 1, null); counter(206, 128, String(n), 2, n ? '#ff5a48' : '#7a7a8a');
  gr_ptag(8, 40, 'DÉGEL : LE COEUR REPART EN PREMIER', 'green', u, 0.02, 80);
}

// ───────────── plan 10 : g4_saut ─────────────
// prairie fleurie : l'œil s'ouvre (fin du dégel), accroupie, saut décollant sur « rien », réception sur « n'était », puis elle respire, cligne et coasse ; case 1/3 cochée à la fin de « n'était »
const gr_JD = 86, gr_JT = 0.9;                                                    // distance (px) et durée (s) du saut
function gr_jump(u, sh) {                                                         // { lph : phase du saut 0..1, hx : avance en px, tL : début du cycle }
  const tL = Math.max(0.3, gr_rel('rien', sh) - 0.26 * gr_JT), lph = prog(u, tL, tL + gr_JT);
  return { tL, lph, hx: gr_hopX(lph, gr_JD) };
}
function gr_g4saut(u, t, sh) {
  const P = 'alaskaSpring', J = gr_jump(u, sh), cam = 3 * u + 0.62 * J.hx, fx = 98 + J.hx - cam, fy = 342;
  const ee = gr_rel('etait1', sh), rib = Math.max(bump(u, ee + 0.08, ee + 0.14, ee + 0.2, ee + 0.28), bump(u, ee + 0.3, ee + 0.36, ee + 0.42, ee + 0.5));
  gr_backdrop(P, t, cam, { cseed: 17, snow: 0.7 });
  fl_spruceForest(t, { env: P, y: 302, bands: 2, h: 56, seed: 12, cam, snow: 0.05, fog: 0.5, depthNear: 0.5 });
  fl_grassSpring(300, 480, { env: P, t, cam, grow: 1, seed: 8, h: 14 });
  fl_birch(t, { x: 252, y: 330, h: 126, env: P, depth: 0.4, leaf: 0.85, seed: 8, cam });       // tronc loin du museau d'arrivée (pas de tangente)
  fl_birch(t, { x: 30, y: 326, h: 112, env: P, depth: 0.45, leaf: 0.8, seed: 3, cam, stems: 2 });
  fl_flowers(8, 322, 262, 362, { env: P, t, cam, seed: 4, density: 0.8, zmin: 0.7, zmax: 1.0, depth: 0.25 });
  k_rays(262 - cam * 0.04, -20, t, { angle: 2.0, spread: 0.9, len: 430, strength: 0.26, n: 8, col: WH[2], col2: YE[3], cam });
  k_shadow(fx, fy + 1, 52, 4, 0.3, { col: '20,40,10' });
  const tl = sh.t0 + J.tL + 0.8 * gr_JT;                                           // poussière à la réception : derrière la grenouille (sinon elle tramerait de vert sa gorge claire)
  k_dustKick(98 + gr_JD, fy + 1, tl, t, { col: 'grass', dir: 0, size: 1.3, n: 9, cam });
  const o = { light: 1, rim: '#fff8e8', seed: 3, shadow: 0.2, hop: 9 };
  if (u < J.tL) gr_frog(fx, fy, 2.6, t, { ...o, pose: 'thaw', ph: 0.62 + 0.38 * sm(prog(u, 0, 0.28)) });
  else gr_frog(fx, fy, 2.6, t, { ...o, pose: 'leap', ph: J.lph, ...(rib > 0 ? { breath: Math.max(0.15, rib) } : {}) });
  fl_ferns(t, { x: 236 - cam * 0.0, y: 410, h: 36, n: 7, env: P, depth: 0.1, seed: 5, cam, unfurl: 0.4 });
  fl_flowers(6, 392, 266, 470, { env: P, t, cam, seed: 8, density: 1.0, zmin: 0.9, zmax: 1.5, depth: 0.1 });
  fl_grassFg(t, { env: P, kind: 'spring', side: 'both', h: 120, n: 34, seed: 2, cam, dip: 0.8 });
  fl_grassFg(t, { env: P, kind: 'green', side: 'bottom', h: 50, n: 30, seed: 7, cam, dip: 0.25 });
  fl_branchFg(t, { env: P, corner: 'tl', kind: 'leafy', len: 120, seed: 6, blossom: true, cam });
  k_butterfly(150 - cam + 14 * Math.sin(u * 2.2), 262 + 10 * Math.sin(u * 3.1), t, { col: YE[2], col2: AM[6], flutter: 3 });
  k_butterfly(238 - cam * 0.9, 268 + 8 * Math.sin(u * 2.6 + 1), t, { col: WH[3], col2: CY[3], phase: 2 });
  k_birds(t, { y: 96, x: 120, speed: 10, cam, n: 5, col: NI[3], dir: 1 });
  k_pollen(t, { n: 24, y0: 100, y1: 340, cam, beam: { x: 262, y: -20, angle: 2.0, spread: 1.1, len: 520 } });
}
function gr_g4sautUi(u, t, sh) {
  const ee = gr_rel('etait1', sh);
  hudTracker(0, 0, 1); hudLieu(0);
  if (u >= ee) {                                                                   // coche de fin d'anecdote : pastille plus grande (r 7), rebond, halo vert qui s'étend sur 0,35 s
    const h = prog(u, ee, ee + 0.35);
    if (h > 0 && h < 1) { const r = 8 + 11 * eo(h), n = Math.ceil(r * 7); for (let q = 0; q < n; q++) { if (((q * 7) % 5) / 5 > 1 - h) continue; const an = q / n * TAU; px(27 + Math.cos(an) * r, 27 + Math.sin(an) * r, h < 0.5 ? GR[5] : GR[3]); if (h < 0.4) px(27 + Math.cos(an) * (r - 1), 27 + Math.sin(an) * (r - 1), GR[4]); } }
    mark(27, 27, 'yes', prog(u, ee, ee + 0.3), 7);
  }
}

// ───────────── la page : préchauffage des caches des bibliothèques ─────────────
const gr_DRAW = { g1_alaska: gr_g1, g1_scan: (u, t, sh) => gr_g1(u, t, sh, true), g2_gel: gr_g2gel, g2_coeur: gr_g2coeur, g2_souffle: gr_g2souffle, g3_sucre: gr_g3sucre, g3_survit: gr_g3survit,
  g4_degel: gr_g4degel, g4_coeur: gr_g4coeur, g4_saut: gr_g4saut };
// préchauffage : chaque plan est dessiné une fois (les sprites des bibliothèques se mettent en cache) ; puis tous les paliers de fonte de la neige du plan g4_degel (1/40 : 40 ms chacun au premier appel)
INITS.push(() => {
  for (const id in gr_DRAW) gr_DRAW[id](0.85, 3, { t0: 0 });
  for (let k = 6; k <= 30; k++) gr_burrow(0, 3, 'alaskaSpring', 0, { melt: k / 40, litterSnow: 0.35 * (1 - k / 40) });
  clearL();
});

function buildGrenouille(S) {
  const A = gr_A;
  Object.assign(A, {
    alaska: wt('g1', 'Alaska'), grenouille: wt('g1', 'grenouille'), un: wt('g1', 'un'), pouvoir: wt('g1', 'pouvoir'), film: wt('g1', 'film'), digne: wt('g1', 'digne'), sf: wt('g1', 'science-fiction'), sf1: wt1('g1', 'science-fiction'),
    pendant: wt('g2', 'Pendant'), hiver: wt('g2', "l'hiver"), corps: wt('g2', 'corps'), gele: wt('g2', 'gèle'), gele1: wt1('g2', 'gèle'), son2: wt('g2', 'son', 1), arrete: wt('g2', "s'arrête"), battre: wt('g2', 'battre'), battre1: wt1('g2', 'battre'), et: wt('g2', 'et'), cesse: wt('g2', 'cesse'), respirer: wt('g2', 'respirer'), respirer1: wt1('g2', 'respirer'),
    mais: wt('g3', 'Mais'), sucre: wt('g3', 'sucre'), protege: wt('g3', 'protège'), cellules: wt('g3', 'cellules,'), elle3: wt('g3', 'elle'), survit: wt('g3', 'survit'),
    au: wt('g4', 'Au'), printemps: wt('g4', 'printemps'), elle4: wt('g4', 'elle'), degele: wt('g4', 'dégèle'), degele1: wt1('g4', 'dégèle'), et4: wt('g4', 'et'), reprend: wt('g4', 'reprend'), vie: wt('g4', 'vie'), comme: wt('g4', 'comme'), rien: wt('g4', 'rien'), etait: wt('g4', "n'était"), etait1: wt1('g4', "n'était"),
  });
  shot('g1_alaska', S.t0, { draw: (u, t, sh) => gr_g1(u, t, sh), ui: gr_g1Ui, ev: [[S.t0 + 0.15, 'wind', 2], [S.t0 + 0.4, 'bird', 0], [S.t0 + 0.1, 'pop', 1], [S.t0 + 0.3, 'label', 1]] });
  shot('g1_scan', A.un - 0.1, { draw: (u, t, sh) => gr_g1(u, t, sh, true), ui: gr_scanUi, ev: [[A.un - 0.1, 'suspense', A.digne - A.un + 0.1], [A.digne, 'scan', A.sf1 - A.digne], [A.digne + 0.05, 'label', 1]] });
  shot('g2_gel', A.pendant - 0.1, { draw: gr_g2gel, ui: gr_g2gelUi, ev: [[A.pendant - 0.1, 'snowfall', A.son2 - A.pendant], [A.pendant, 'wind', 2], [A.pendant + 0.1, 'frost', A.gele1 - A.pendant], [A.gele - 0.05, 'label', 1], [A.gele1 - 0.2, 'crack', 0.3]] });
  A.stop = A.battre + 0.1; A.hbeats = gr_beatsHeart(A.arrete + 0.25);                                      // battements du cœur qui s'arrête (le dernier pendant « battre »)
  A.rbeats = [A.et4 + 0.05, A.et4 + 0.45];                                          // le cœur repart pendant « et » : deux battements espacés de 0,4 s (le plan ne dure que 0,8 s)
  const t3 = A.mais - 0.1, t3s = A.elle3 - 0.1, t4 = A.au - 0.1, t4c = A.et4 - 0.1, t4s = A.comme - 0.1, t2c = A.son2 - 0.1, t2s = A.et - 0.1;
  A.drips = [t4 + 0.46, t4 + 0.86, t4 + 1.26, t4 + 1.66];                         // impacts ; chaque goutte se forme à la pointe 0,4 s avant de tomber (0,37 s de chute)
  shot('g2_coeur', t2c, { draw: gr_g2coeur, ui: gr_g2coeurUi, ev: [[t2c, 'zoom', 0.5], ...A.hbeats.filter(b => b >= t2c).flatMap((b, i, a) => [[b, 'heartbeat', 1 - 0.2 * i], [b, 'beep', 1]]), [A.stop, 'flatline', t2s - A.stop], [A.battre - 0.05, 'label', 1]] });
  shot('g2_souffle', t2s, { draw: gr_g2souffle, ui: gr_g2souffleUi, ev: [[t2s, 'wind', 1.5], [A.cesse, 'suspense', A.respirer1 - A.cesse], [A.respirer - 0.05, 'label', 1]] });
  shot('g3_sucre', t3, { draw: gr_g3sucre, ui: gr_g3sucreUi, ev: [[t3, 'zoom', 0.6], [A.sucre, 'label', 1], [A.sucre, 'glow', A.cellules - A.sucre], [A.protege + 0.2, 'sparkle', 1], [A.protege + 0.6, 'sparkle', 1]] });
  shot('g3_survit', t3s, { draw: gr_g3survit, ui: gr_g3survitUi, ev: [[A.survit, 'ding', 1], [A.survit, 'reveal', 1], [A.survit + 0.05, 'label', 1]] });
  shot('g4_degel', t4, { draw: gr_g4degel, ui: gr_g4degelUi, ev: [[t4, 'bird', 1], [A.printemps, 'label', 1], [A.printemps, 'thaw', A.degele1 - A.printemps], ...A.drips.map(d => [d, 'drip', 0.6]), [A.degele + 0.15, 'crack', 0.6], [A.degele + 0.45, 'crack', 0.8], [A.degele1, 'sparkle', 1]] });
  shot('g4_saut', t4s, { draw: gr_g4saut, ui: gr_g4sautUi, ev: [[t4s + 0.05, 'bird', 2], [t4s + gr_jump(0, { t0: t4s }).tL + 0.26 * gr_JT - 0.05, 'whoosh', 0.35], [t4s + gr_jump(0, { t0: t4s }).tL + 0.8 * gr_JT, 'hop', 1], [A.etait1 + 0.08, 'ribbit', 1], [A.etait1 + 0.3, 'ribbit', 1.1], [A.etait1 + 0.02, 'ding', 1], [A.etait1 + 0.05, 'pop', 1]] });
  shot('g4_coeur', t4c, { draw: gr_g4coeur, ui: gr_g4coeurUi, ev: [[t4c + 0.02, 'label', 1], ...A.rbeats.flatMap((b, i) => [[b, 'heartbeat', i ? 0.7 : 1], [b, 'beep', 1]]), [A.rbeats[0], 'glow', 0.6]] });
}
