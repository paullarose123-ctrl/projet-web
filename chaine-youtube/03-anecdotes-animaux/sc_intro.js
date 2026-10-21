'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_intro.js — l'ACCROCHE (préfixe in_), de 0 à SEG.intro.t1 (≈ 6,7 s), deux plans
     i_gel    forêt boréale à l'heure bleue, la neige tombe ; GROS PLAN d'un bloc de glace avec la grenouille des bois gelée dedans ;
              sur « revenir à la vie » une fissure court, une lueur chaude monte, deux battements font vibrer la scène      « Tu savais que certains animaux peuvent revenir à la vie après avoir gelé ? »
     i_trois  le scientifique (blouse, jumelles au cou, carnet de terrain) en lisière de prairie à l'aube ; trois cases se retournent :
              grenouille, lézard, lycaon ; titre « 3 ANECDOTES FOLLES » ; il ouvre ses jumelles et regarde à droite       « Voici trois anecdotes incroyables sur les animaux ! »
   Tout est calé sur wt() / wt1() (in_A : instants absolus des mots, remplis par buildIntro) : aucune seconde écrite en dur pour un mot.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

const in_A = { beats: [] };                                                                  // instants absolus des mots (remplis par buildIntro)
const in_rel = (name, sh) => (in_A[name] ?? 0) - ((sh && sh.t0) || 0);            // instant d'un mot en secondes depuis le début du plan

// ───────────────────────── outils ─────────────────────────
// impulsion de battement « toum-doum » : valeur 0..1 à l'instant t pour des battements aux instants absolus bs
function in_beat(t, bs) {
  let v = 0;
  for (const b of bs) {
    const d = t - b;
    if (d >= 0 && d < 0.2) v = Math.max(v, d < 0.05 ? sm(d / 0.05) : 1 - 0.35 * sm((d - 0.05) / 0.15));        // toum
    else if (d >= 0.2 && d < 0.55) { const e = d - 0.2; v = Math.max(v, 0.6 * (e < 0.05 ? sm(e / 0.05) : 1 - sm((e - 0.05) / 0.3))); }   // doum
  }
  return v;
}
// vibration de toute l'image : recopie L sur elle-même décalée de quelques pixels entiers (les bords gardent l'image d'origine)
let in_FG = null;                                                                                    // dernier dessin de la grenouille (masque, boîte) : lu par l'ui du même plan
function in_shakeOff(u, t) { const p = in_beat(t, in_A.beats); return [Math.round(p * 2 * Math.sin(u * 70)), Math.round(p * 1.6 * Math.cos(u * 83))]; }       // décalage de la vibration (pixels entiers)
const in_tnC = mkCanvas(), in_tn = in_tnC.getContext('2d');
function in_tintFrog(fr, a) {                                                                        // voile brun sombre posé sur la silhouette de la grenouille (par son masque)
  const [x0, y0, w, h] = fr.bbox; if (w <= 0 || h <= 0) return;
  const id = in_tn.createImageData(w, h), d = id.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (fr.mask(x0 + i, y0 + j)) { const q = (j * w + i) * 4; d[q] = 52; d[q + 1] = 28; d[q + 2] = 18; d[q + 3] = Math.round(255 * a); }
  in_tnC.width = w; in_tnC.height = h; in_tn.putImageData(id, 0, 0);
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(in_tnC, x0, y0); L.restore();
}
function in_shake(dx, dy) {
  dx = Math.round(dx); dy = Math.round(dy); if (!dx && !dy) return;
  L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(low, dx, dy);
}

// ───────────────────────── plan 1 : i_gel ─────────────────────────
const in_BLOCK = { x: 22, y: 150, w: 212, h: 192 };                                 // face avant du bloc de glace
function in_backdropGel(t, cam) {
  const P = 'alaskaDusk', h = 240;
  k_sky(P, t, { h, stars: 46 });
  k_aurora(t, { y: 122, hmax: 112, curtains: 2, intensity: 0.8, violet: 0.35, cam });
  k_clouds(t, { preset: P, y0: 54, y1: 150, n: 4, speed: 3, cam, seed: 11 });
  k_mountains(P, t, { y: h - 4, cam, base: 360 });
  k_haze(h - 14, h + 26, '#c9b4d4', 0.5, { t, cam, profile: 'bottom' });
  k_hills(P, t, { y: h + 50, amp: 22, trees: 0.55, cam, haze: 0.18, seed: 4, snowy: 4, par: 0.6, base: 400 });
  fl_spruceForest(t, { env: P, y: 300, bands: 2, h: 56, seed: 3, cam, snow: 0.7 });
  fl_snowGround(298, 480, { env: P, seed: 7, cam, t, melt: 0, under: 'litter', leafK: 2 });
}
// corps de la glace : le décor vu à travers une glace épaisse (flou, teinte cyan, plus sombre en bas) ; dessiné AVANT la grenouille
function in_iceBody(x, y, w, h, t) {
  const c = 7;
  L.save(); L.beginPath();
  L.moveTo(x + c, y + 1); L.lineTo(x + w - c, y + 1); L.lineTo(x + w - 1, y + c); L.lineTo(x + w - 1, y + h - c); L.lineTo(x + w - c, y + h - 1); L.lineTo(x + c, y + h - 1); L.lineTo(x + 1, y + h - c); L.lineTo(x + 1, y + c); L.closePath(); L.clip();
  const sx = Math.max(0, Math.floor(x) - 6), sy = Math.max(0, Math.floor(y) - 6), sw = Math.min(LW - sx, Math.ceil(w) + 12), shh = Math.min(LH - sy, Math.ceil(h) + 12);
  L.filter = 'blur(2.5px)'; L.drawImage(low, sx, sy, sw, shh, sx, sy, sw, shh); L.filter = 'none';              // seule la zone du bloc est floutée (3 fois moins de pixels)
  const g = L.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(206,228,246,0.62)'); g.addColorStop(0.55, 'rgba(120,176,214,0.5)'); g.addColorStop(1, 'rgba(36,104,148,0.66)');
  L.fillStyle = g; L.fillRect(x, y, w, h);
  L.restore();
}
function in_gelDraw(u, t, sh) {
  const P = 'alaskaDusk', cam = k_pan(u, 0, 8, 'o', 3.8), B = in_BLOCK;
  const tRev = in_rel('revenir', sh), tVie = in_rel('vie', sh), tGele = in_rel('gelé', sh);
  const beats = in_A.beats.map(b => b);
  const pulse = in_beat(t, beats);
  in_backdropGel(t, cam);
  fl_spruce(t, { x: 20, y: 322, h: 96, env: P, depth: 0.3, seed: 2, cam, snow: 0.8 });
  fl_spruce(t, { x: 252, y: 330, h: 110, env: P, depth: 0.3, seed: 5, cam, snow: 0.8 });
  const bx = B.x - cam * 1.1, by = B.y;
  in_iceBody(bx, by, B.w, B.h, t);
  fl_leafLitter(bx + 8, by + B.h - 52, bx + B.w - 8, by + B.h - 8, { env: P, snow: 0.12, scale: 2.4, seed: 4, cam: 0, depth: 0.1 });
  const wv = clamp(sm(prog(u, tRev + 0.05, tVie + 0.3)) * (0.62 + 0.38 * pulse) + 0.22 * sm(prog(u, tVie + 0.3, tGele + 0.3)));                // la lueur chaude naît DERRIÈRE la grenouille
  const fcx = bx + B.w * 0.5, fcy = by + B.h - 40, heart = [fcx + 8, fcy - 26];                                                                     // pied de la grenouille et son cœur
  if (wv > 0.01) {                                                                                                  // lueur ronde centrée sur le cœur : cœur jaune clair, bord orange qui s'éteint avant la glace
    L.save(); L.beginPath(); L.rect(bx + 3, by + 3, B.w - 6, B.h - 6); L.clip();
    L.translate(heart[0], heart[1] - 6); L.scale(1, 0.8);
    rgrad(0, 0, 3, 142, [[0, 'rgba(255,240,180,1)'], [0.32, 'rgba(255,204,106,0.98)'], [0.62, 'rgba(255,152,66,0.72)'], [0.86, 'rgba(255,120,52,0.28)'], [1, 'rgba(255,110,50,0)']], clamp(wv * 1.25), 'source-over');
    L.restore();
  }
  // le sujet d'abord : la grenouille gelée, au pied du bloc ; elle reste plus sombre que la lueur (brune, jamais crème)
  const ph = 0.3 * sm(prog(u, tVie - 0.1, tGele + 0.5)), wake = sm(prog(u, tVie - 0.1, tGele + 0.4));
  const fr = gr_frog(fcx, fcy, 3.6, t, { pose: 'thaw', ph, light: -1, rim: wv > 0.35 ? AM[9] : NE[4], seed: 3, shadow: 0.25, blink: 0, breath: 0, ice: 0, pale: 0.5 - 0.4 * wake, dull: 0.3 });
  const off = in_shakeOff(u, t); in_FG = { info: fr, cx: fcx, cy: fcy, s: 3.6, ph, off, wake };
  in_tintFrog(fr, 0.3 + 0.12 * wv);                                                                                 // corps plus sombre : il se détache de la glace et de la lueur
  // le voile de glace par-dessus : fissure qui court, lueur chaude qui monte et bat
  const crack = tab([[0.9, 0], [1.25, 0.05], [tRev - 0.05, 0.09], [tRev + 0.2, 0.26], [tRev + 0.55, 0.3], [tVie, 0.5], [tVie + 0.2, 0.62], [tGele - 0.1, 0.84], [tGele + 0.12, 1]], u);
  const warm = 0.13 * wv;
  k_iceBlock(bx, by, B.w, B.h, { t, preset: P, seed: 5, alpha: 0.6, frost: 0.7, crack: clamp(crack), warm, beatHz: 0, window: [0.52, 0.66, 0.4, 0.34], warmAt: heart });
  // reflet qui balaie la glace (un éclat blanc oblique qui passe de gauche à droite)
  const sw = prog(u, 0.3, 1.3);
  if (sw > 0 && sw < 1) {
    const xc = bx - 30 + sw * (B.w + 60), k = 0.42 * B.h;
    L.save(); L.beginPath(); L.rect(bx + 2, by - 14, B.w + 10, B.h + 14); L.clip();
    L.fillStyle = 'rgba(255,255,255,0.30)'; L.beginPath(); L.moveTo(xc, by - 14); L.lineTo(xc + 14, by - 14); L.lineTo(xc + 14 - k, by + B.h); L.lineTo(xc - k, by + B.h); L.closePath(); L.fill();
    L.fillStyle = 'rgba(255,255,255,0.42)'; L.beginPath(); L.moveTo(xc + 4, by - 14); L.lineTo(xc + 8, by - 14); L.lineTo(xc + 8 - k, by + B.h); L.lineTo(xc + 4 - k, by + B.h); L.closePath(); L.fill();
    L.restore();
  }
  fl_bush(t, { x: 214 - cam * 1.1, y: 448, w: 50, h: 34, kind: 'winter', snow: 0.9, seed: 3, depth: 0.1, cam });
  fl_deadBranches(t, { x: 40, y: 462, h: 46, n: 5, env: P, depth: 0.0, seed: 3, cam, snow: 0.9 });
  fl_grassFg(t, { env: P, kind: 'dry', side: 'bottom', h: 34, n: 22, seed: 8, cam });
  fl_branchFg(t, { env: P, corner: 'tr', kind: 'spruce', len: 120, seed: 6, snow: 0.8, cam });
  fl_branchFg(t, { env: P, corner: 'bl', kind: 'spruce', len: 80, seed: 9, snow: 0.8, cam });
  k_glints(t, { y0: 340, y1: 470, n: 14, cam });
  k_snow(t, { cam, wind: 5, density: 2.0, par: [0.3, 0.6, 1.2] });
  k_vignetteWarm(0.42, { cold: true });
  in_shake(off[0], off[1]);
}
function in_star(x, y, r) {                                                              // étoile de lumière à quatre branches (pixels nets, dans ui)
  x = Math.round(x); y = Math.round(y); if (r < 1) return;
  px(x, y, WH[3]);
  for (let i = 1; i <= r; i++) { const c = i <= 1 ? WH[3] : i <= 3 ? NE[4] : CY[4]; px(x - i, y, c); px(x + i, y, c); px(x, y - i, c); px(x, y + i, c); }
  if (r >= 3) { px(x - 1, y - 1, NE[3]); px(x + 1, y - 1, NE[3]); px(x - 1, y + 1, NE[3]); px(x + 1, y + 1, NE[3]); }
}
// la tête de la grenouille, redessinée NETTE par-dessus le tramage : masque sombre, tympan, lèvre claire, œil doré brillant avec son reflet ; le contour sombre est épaissi
function in_frogUi(u, t, sh) {
  const g = in_FG; if (!g) return;
  const fr = g.info, [ox, oy] = g.off, m = (x, y) => fr.mask(x - ox, y - oy), [bx0, by0, bw, bh] = fr.bbox;
  const x0 = bx0 + ox - 3, y0 = by0 + oy - 3, W = bw + 6, H = bh + 6, DARK = '#05040f';
  // 1. contour : deux pixels de brun-noir autour de la silhouette (le corps se détache de la glace)
  const occ = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) occ[j * W + i] = m(x0 + i, y0 + j) ? 1 : 0;
  const at = (i, j) => i >= 0 && j >= 0 && i < W && j < H && occ[j * W + i];
  L.fillStyle = DARK;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (occ[j * W + i]) continue;
    if (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1)) { L.fillRect(x0 + i, y0 + j, 1, 1); continue; }
    if (at(i - 2, j) || at(i + 2, j) || at(i, j - 2) || at(i, j + 2) || at(i - 1, j - 1) || at(i + 1, j - 1) || at(i - 1, j + 1) || at(i + 1, j + 1)) L.fillRect(x0 + i, y0 + j, 1, 1);
  }
  // 2. tête nette (mêmes gabarits que le sprite : masque du museau à l'oreille, tympan, lèvre claire), limitée à la silhouette
  const K = gr_poseAt('thaw', g.ph), s = g.s, P = (x, y) => { const q = gr_hmap(K, x, y); return [g.cx + s * q[0] + ox, g.cy + s * q[1] + oy]; };
  const hx0 = Math.floor(P(0, -17)[0]) - 4, hx1 = Math.ceil(P(23, -3)[0]) + 4, hy0 = Math.floor(P(8, -19)[1]) - 4, hy1 = Math.ceil(P(7, 0)[1]) + 4, hw = hx1 - hx0, hh = hy1 - hy0;
  if (hw > 0 && hh > 0) {
    L.setTransform(1, 0, 0, 1, 0, 0);
    const snap = L.getImageData(hx0, hy0, hw, hh);
    const mask = [[16.3, -9.6], [14.2, -11.2], [11.8, -11.9], [9.4, -11.7], [6.4, -12.2], [3.4, -11.3], [1.7, -9.2], [2.4, -7.0], [5.4, -6.8], [10, -7.4], [14.4, -8.0], [16.8, -8.3]].map(q => P(q[0], q[1]));
    poly(mask, WO[2]);
    for (const [a, b] of [[16.3, -9.6, 14.2, -11.2], [14.2, -11.2, 11.8, -11.9], [11.8, -11.9, 9.4, -11.7]].map(v => [P(v[0], v[1]), P(v[2], v[3])])) lineP(a[0], a[1] + 1, b[0], b[1] + 1, WO[4], 1);       // arête haute du masque
    const tym = P(4.0, -9.2), tr = Math.max(3, Math.round(2.3 * s)); disc(tym[0], tym[1], tr, WO[3]); disc(tym[0], tym[1], Math.round(tr * 0.78), WO[1]); px(tym[0] - Math.round(tr * 0.35), tym[1] - Math.round(tr * 0.45), WO[4]); px(tym[0] - Math.round(tr * 0.35) + 1, tym[1] - Math.round(tr * 0.45), WO[3]);
    const up = [[20.5, -8.4], [16.4, -7.75], [11.6, -7.0], [7.4, -6.5], [4.8, -6.0]].map(q => P(q[0], q[1])), mo = [[20.4, -7.3], [16.4, -6.7], [11.6, -6.0], [7.4, -5.55], [4.6, -5.0], [3.2, -3.9]].map(q => P(q[0], q[1]));
    poly(up.concat(mo.slice(0, 5).reverse()), WH[2]);                                                       // lèvre claire sous le masque
    for (let i = 0; i < up.length - 1; i++) lineP(up[i][0], up[i][1], up[i + 1][0], up[i + 1][1], SK[4], 1);          // liseré chaud entre masque et lèvre
    for (const seg of [[19.8, -8.05, 13.6, -7.05], [10.8, -6.7, 6.2, -6.05]]) { const a = P(seg[0], seg[1]), b = P(seg[2], seg[3]); lineP(a[0], a[1] + 1, b[0], b[1] + 1, WH[3], 1); }      // reflet humide sur la lèvre
    for (let i = 0; i < mo.length - 1; i++) lineP(mo[i][0], mo[i][1], mo[i + 1][0], mo[i + 1][1], WO[0], 1);        // la bouche : une ligne sombre qui descend à l'arrière
    const dn = L.getImageData(hx0, hy0, hw, hh), A = snap.data, D = dn.data;
    for (let j = 0; j < hh; j++) for (let i = 0; i < hw; i++) if (!m(hx0 + i, hy0 + j)) { const q = (j * hw + i) * 4; D[q] = A[q]; D[q + 1] = A[q + 1]; D[q + 2] = A[q + 2]; D[q + 3] = A[q + 3]; }
    L.putImageData(dn, hx0, hy0);
    // 3. l'œil : globe sombre brillant, iris doré, pupille horizontale, reflet ; mi-clos tant que la bête dort, il s'ouvre, cligne une fois (réflexe) puis reste grand ouvert
    const tRev = in_rel('revenir', sh), tVie = in_rel('vie', sh), tb = tVie + 0.16, blink = clamp(1 - Math.abs(u - tb) / 0.07);
    const E = P(8.8, -14.6), open = 0.8 + 0.2 * sm(prog(u, tRev, tVie)), dull = 0.2 - 0.12 * g.wake;
    gr_eye(E[0], E[1], 2.85 * s, { open, blink, dull, flip: 1, Ls: [-0.62 / 0.9965, -0.78 / 0.9965], ice: 0, info: fr, s, seed: 3, t, pale: 0, sil: false });
  }
  // 3 bis. frémissement de givre : trois éclats brefs courent sur le dos et la tête (le plan ne reste jamais figé)
  if (u < in_rel('revenir', sh) + 0.3) for (let k = 0; k < 3; k++) {
    const sl = Math.floor(u * 7) * 3 + k, r = rng(sl * 17 + 5), f = (u * 7) % 1, a = Math.sin(Math.PI * f); if (a < 0.3) continue;
    const xx = Math.round(bx0 + ox + 8 + r() * (bw - 16)); let yy = by0 + oy; while (yy < by0 + oy + bh && !m(xx, yy)) yy++; if (yy >= by0 + oy + bh) continue;
    px(xx, yy, WH[3]); if (a > 0.7) { px(xx - 1, yy, NE[4]); px(xx + 1, yy, NE[4]); px(xx, yy - 1, NE[4]); }
  }
}
function in_gelUi(u, t, sh) {
  if (u > 0.8) {                                                                                  // température : -15 °C = la moyenne des minimums mesurée en Alaska (-14,6 arrondi), gros caractères
    const txt = '-15 °C', sub = 'MINIMUM MOYEN', n = Math.ceil((u - 0.8) * 30), w = Math.max(textW(txt, 3), textW(sub, 1) + 2) + 14, h = 44;
    R(9, 20, w + 2, h + 2, '#05040f'); R(10, 21, w, h, CY[3]); R(11, 22, w - 2, h - 2, NI[1]); R(11, 22, w - 2, 1, CY[2]);
    ptext(txt, 17, 27, WH[3], 3, '#05040f', n); ptext(sub, 17, 53, CY[4], 1, null, Math.max(0, n - 6));
  }
  in_frogUi(u, t, sh);
  const B = in_BLOCK, cam = k_pan(u, 0, 8, 'o', 3.8), bx = B.x - cam * 1.1, by = B.y, tGele = in_rel('gelé', sh);
  // éclats sur les arêtes de la glace (un nouveau toutes les 0,5 s environ), puis une gerbe quand le cœur repart
  const S = [[0.22, bx + 10, by - 12, 5], [0.62, bx + B.w * 0.8, by - 16, 4], [0.98, bx + 3, by + B.h * 0.5, 5], [1.42, bx + B.w + 9, by + 34, 4], [1.8, bx + B.w * 0.3, by - 15, 4], [2.2, bx + 14, by + B.h - 6, 3]];
  for (const [t0, x, y, r] of S) { const p = (u - t0) / 0.42; if (p > 0 && p < 1) in_star(x, y, Math.round(r * Math.sin(p * Math.PI))); }
  for (const [d, x, y, r] of [[0, 0.42, 0.36, 6], [0.08, 0.7, 0.5, 5], [0.16, 0.26, 0.62, 4], [0.22, 0.58, 0.8, 4]]) { const p = (u - tGele - d) / 0.4; if (p > 0 && p < 1) in_star(bx + B.w * x, by + B.h * y, Math.round(r * Math.sin(p * Math.PI))); }
}

// ───────────────────────── plan 2 : i_trois ─────────────────────────
// ── le scientifique : sprite de scientist.js dessiné dans un calque (fond mis de côté), bras remplacés par des bras articulés, jumelles, carnet de terrain, sourire,
//    liseré de l'aube sur le bord droit et contour sombre ; le calque peut être « tourné » (écrasé en largeur) au début du plan.
const in_snC = mkCanvas(), in_sn = in_snC.getContext('2d', { willReadFrequently: true });
const in_lyC = mkCanvas(), in_ly = in_lyC.getContext('2d', { willReadFrequently: true });
function in_ik(sx, sy, hx, hy, l1, l2, out) {                                      // coude d'un bras à deux segments : de deux solutions, la plus basse à l'écran (out = ±1 : celle qui s'écarte du corps, à droite ou à gauche)
  const dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1, dd = Math.min(d, l1 + l2 - 0.5), a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / d, uy = dy / d, e1 = [sx + ux * a - uy * h, sy + uy * a + ux * h], e2 = [sx + ux * a + uy * h, sy + uy * a - ux * h];
  if (out) return e1[0] * out > e2[0] * out ? e1 : e2;
  return e1[1] > e2[1] ? e1 : e2;
}
function in_sleeve(x0, y0, x1, y1, th, coat) {                                        // un segment de manche : corps, pli d'ombre côté gauche, lumière côté droit (soleil à droite), traits de contour
  lineP(x0, y0, x1, y1, coat[0], th);
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1; let nx = -dy / l, ny = dx / l; if (nx < 0 || (nx === 0 && ny > 0)) { nx = -nx; ny = -ny; }       // normale tournée vers la lumière (droite / haut)
  const o = th / 2 - 0.5;
  lineP(x0 - nx * (o - 2), y0 - ny * (o - 2), x1 - nx * (o - 2), y1 - ny * (o - 2), coat[1], 2);                       // pli d'ombre
  lineP(x0 + nx * (o - 1), y0 + ny * (o - 1), x1 + nx * (o - 1), y1 + ny * (o - 1), coat[2], 1);                       // lumière
  lineP(x0 - nx * o, y0 - ny * o, x1 - nx * o, y1 - ny * o, ST[3], 1); lineP(x0 + nx * o, y0 + ny * o, x1 + nx * o, y1 + ny * o, ST[5], 1);               // contours
}
function in_hand(x, y, s, open) {                                                      // main : disque de peau, ombre et éclat
  const r = Math.max(2, Math.round(3 * s)); disc(x, y, r, SK[3]); px(x - 1, y + 1, SK[2]); px(x - 1, y + 2, SK[2]); px(x + 1, y - 1, SK[4]); px(x, y - 1, SK[4]);
}
// carnet de terrain ouvert, tourné vers le spectateur : couverture brun, deux pages, reliure, lignes d'écriture (lines : 0..1 progression des notes)
function in_book(cx, cy, w, h, lines, t) {
  R(cx - w / 2 - 2, cy - h / 2 - 2, w + 4, h + 4, '#05040f'); R(cx - w / 2 - 1, cy - h / 2 - 1, w + 2, h + 2, WO[2]); R(cx - w / 2 - 1, cy + h / 2 - 1, w + 2, 2, WO[1]);          // couverture
  R(cx - w / 2 + 1, cy - h / 2 + 1, w - 2, h - 2, WH[2]); R(cx - w / 2 + 1, cy - h / 2 + 1, w / 2 - 2, h - 2, WH[1]);                                                       // pages (gauche à l'ombre)
  R(cx - 1, cy - h / 2 + 1, 2, h - 2, WO[3]); R(cx, cy - h / 2 + 1, 1, h - 2, WH[0]);                                                                                         // reliure
  const n = 5; for (let k = 0; k < n; k++) {
    const yy = cy - h / 2 + 5 + k * Math.floor((h - 8) / n), f = clamp(lines * (n + 1) - k);
    if (f > 0) { R(cx - w / 2 + 4, yy, Math.round((w / 2 - 8) * f * (k === 2 ? 0.6 : 1)), 1, ST[3]); }
    const g = clamp(lines * (n + 1) - k - 1); if (g > 0) R(cx + 4, yy, Math.round((w / 2 - 8) * g * (k === 3 ? 0.5 : 0.9)), 1, ST[3]);
  }
  R(cx + w / 2 - 6, cy - h / 2 + 1, 3, 4, RD[3]); R(cx + w / 2 - 6, cy - h / 2 + 4, 3, 1, RD[1]);                                                                              // signet
  px(cx - w / 2 + 1, cy - h / 2 + 1, WH[3]);
}
// jumelles : accrochées au cou (bino 0) ou levées vers la droite (bino 1)
function in_binoHang(cx, cy, s, coat) {
  const X = v => Math.round(cx + v * s), Yy = v => Math.round(cy + v * s), S = v => Math.max(1, Math.round(v * s));
  lineP(X(-4), Yy(-65), X(-5), Yy(-56), ST[1], 1); lineP(X(4), Yy(-65), X(5), Yy(-56), ST[1], 1); lineP(X(-3), Yy(-65), X(-4), Yy(-56), ST[2], 1); lineP(X(3), Yy(-65), X(4), Yy(-56), ST[2], 1);   // sangle
  for (const sd of [-1, 1]) {
    const bx = X(sd * 4.6 - 2.5), by = Yy(-56), w = S(5), h = S(10);
    R(bx - 1, by - 1, w + 2, h + 2, '#05040f'); R(bx, by, w, h, ST[2]); R(bx, by, Math.max(1, S(1.4)), h, ST[1]); R(bx + w - Math.max(1, S(1.4)), by, Math.max(1, S(1.4)), h - S(2), ST[5]);       // tube : ombre à gauche, lumière à droite
    R(bx, by + h - S(2.4), w, S(2.4), ST[0]); R(bx + 1, by + h - S(2), w - 2, S(1.4), CY[2]); px(bx + w - 2, by + h - S(2), WH[3]);                                                          // objectif
    R(bx, by, w, Math.max(1, S(1.2)), ST[4]);
  }
  R(X(-1.4), Yy(-53), S(2.8), S(2), ST[1]); R(X(-1.4), Yy(-53), S(2.8), 1, ST[4]);
}
function in_binoUp(cx, cy, s, k) {                                                       // vues de face, devant les lunettes ; k : 0 tubes joints → 1 écartés (on les ouvre)
  const X = v => Math.round(cx + v * s), Yy = v => Math.round(cy + v * s), r = Math.max(4, Math.round(4.8 * s)), dx = 4.6 + 2.4 * k, y = Yy(-76);
  R(X(-dx), y - r + 1, X(dx) - X(-dx), Math.max(3, Math.round(2.6 * s)), '#05040f'); R(X(-dx), y - r + 2, X(dx) - X(-dx), Math.max(1, Math.round(1.6 * s)), ST[2]);                       // le pont entre les tubes
  for (const sd of [-1, 1]) {
    const x = X(sd * dx);
    disc(x, y, r + 1, '#05040f'); disc(x, y, r, ST[1]); disc(x, y, r - 1, ST[2]); disc(x + 1, y, r - 2, ST[3]);                                                                             // corps du tube vu de face
    disc(x, y, r - 3, ST[0]); disc(x, y, r - 4, CY[1]); disc(x - 1, y - 1, Math.max(1, r - 6), CY[2]);                                                                                      // lentille
    px(x + 1, y - 2, WH[3]); px(x + 2, y - 2, CY[4]); px(x + 1, y - 1, CY[4]); lineP(x - r + 3, y + r - 3, x - 1, y + r - 2, CY[3], 1);                                                       // reflets du ciel dans le verre
    for (let a = -0.6; a < 1.1; a += 0.3) px(x + Math.cos(a - 1.1) * (r - 0.5), y + Math.sin(a - 1.1) * (r - 0.5), ST[6]);                                                                   // liseré de lumière côté soleil
  }
}
function in_sci(cx, cy, s, t, o = {}) {
  const turn = o.turn ?? 1, smile = o.smile ?? 0, book = o.book ?? 0, pt = o.point ?? 0, bino = o.bino ?? 0, hs = o.headDy ?? 0;
  const X0 = v => rd(cx + v * s), Y0 = v => rd(cy + v * s), S = v => Math.max(1, rd(v * s));
  const coat = [WH[1], WH[0], WH[2]];
  // 1. le fond est mis de côté, L devient transparent
  in_sn.setTransform(1, 0, 0, 1, 0, 0); in_sn.clearRect(0, 0, LW, LH); in_sn.drawImage(low, 0, 0);
  L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, LW, LH);
  // 2. le sprite (bras effacés ensuite et remplacés)
  drawScientist(cx, cy, s, t, { hairStyle: 'curlyFade', sway: o.sway ?? 1, headDy: hs });
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? X0(-19) : X0(15), w = sd < 0 ? X0(-15) - X0(-19) : X0(19) - X0(15) + 1;
    L.clearRect(x0, Y0(-63), w, Y0(-32) - Y0(-63));                                                              // la manche pendante (hors du buste)
    R(sd < 0 ? X0(-15) : X0(13), Y0(-62), X0(-13) - X0(-15), Y0(-32) - Y0(-62), sd < 0 ? coat[1] : coat[2]);       // le bord du buste est restitué
  }
  L.clearRect(X0(-19), Y0(-35), X0(19) - X0(-19), 0);
  // sourire : on recouvre la bouche d'un trait de peau et on dessine une courbe vers le haut
  const hx = X0(0), hy = Y0(-76 + hs);
  if (smile > 0) {
    R(hx - S(3.5), hy + S(4.6), S(7), S(2.6), SK[4]);
    const m = SK[1], k = Math.max(1, Math.round(s * 0.6));
    R(hx - S(2.4), hy + S(6.2), S(4.8), k, m); R(hx - S(3.2), hy + S(5.2), k, k, m); R(hx + S(3.2) - k, hy + S(5.2), k, k, m);
    R(hx - S(1.6), hy + S(6.2) + k, S(3.2), 1, WH[3]);
  }
  // jumelles au cou (sous les bras)
  if (bino < 0.5) in_binoHang(cx, cy, s, coat);
  // bras gauche (de l'écran) : le long du corps, ou tendu vers le haut pour montrer les cases, ou levé vers les jumelles
  const shL = [X0(-16), Y0(-58)], shR = [X0(16), Y0(-58)];
  const lh = [lerp(lerp(-19, -26, pt), -12, bino), lerp(lerp(-33, -85, pt), -66, bino)];
  const lE = in_ik(shL[0], shL[1], X0(lh[0]), Y0(lh[1]), lerp(15, 11, bino) * s, lerp(13.5, 19, bino) * s);
  // bras droit : le carnet, bas puis levé
  const bp = [lerp(21, 33, book), lerp(-44, -79, book)], rh = [bp[0] + lerp(-4, -1, book), bp[1] + lerp(7, 12, book)];
  // le carnet derrière la main
  if (book > 0 || o.showBook) in_book(X0(bp[0]), Y0(bp[1]), S(lerp(28, 36, book)), S(lerp(20, 25, book)), o.lines ?? 0, t);
  const rE = in_ik(shR[0], shR[1], X0(rh[0]), Y0(rh[1]), 15 * s, 13.5 * s, 1);               // le coude droit reste à l'extérieur : le bras ne traverse jamais le torse
  in_sleeve(shR[0], shR[1], rE[0], rE[1], S(5.2), coat); in_sleeve(rE[0], rE[1], X0(rh[0]), Y0(rh[1]), S(4.6), coat); in_hand(X0(rh[0]), Y0(rh[1]), s);
  if (bino > 0) in_binoUp(cx, cy, s, bino);
  in_sleeve(shL[0], shL[1], lE[0], lE[1], S(4.8), coat); in_sleeve(lE[0], lE[1], X0(lh[0]), Y0(lh[1]), S(4.4), coat); in_hand(X0(lh[0]), Y0(lh[1]), s);
  if (pt > 0.5 && bino < 0.3) { const dx = lh[0] - lE[0] / s * 0 - (lE[0] - cx) / s, dy = lh[1] - (lE[1] - cy) / s, l = Math.hypot(dx, dy) || 1, hx0 = X0(lh[0]), hy0 = Y0(lh[1]); lineP(hx0, hy0, hx0 + dx / l * S(6), hy0 + dy / l * S(6), SK[3], 2); px(hx0 + dx / l * S(6), hy0 + dy / l * S(6), SK[4]); }       // l'index tendu dans le prolongement de l'avant-bras
  // 3. contour sombre et liseré de l'aube (soleil à droite)
  const id = L.getImageData(0, 0, LW, LH), d = id.data, A = (x, y) => (x < 0 || y < 0 || x >= LW || y >= LH) ? 0 : d[(y * LW + x) * 4 + 3];
  const add = [], rim = [];
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
    if (A(x, y) > 0) { if (!A(x + 1, y) && A(x, y) === 255) rim.push([x, y, A(x, y - 1) ? 0 : 1]); }
    else if (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1)) add.push([x, y]);
  }
  for (const [x, y] of add) { const q = (y * LW + x) * 4; d[q] = 5; d[q + 1] = 4; d[q + 2] = 15; d[q + 3] = 255; }
  const rc = [255, 224, 138], rc2 = [255, 242, 196];
  for (const [x, y, top] of rim) { const q = (y * LW + x) * 4, c = top ? rc2 : rc; if (BAYER[((y & 3) << 2) | (x & 3)] < 0.85) { d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2]; } }
  L.putImageData(id, 0, 0);
  in_ly.setTransform(1, 0, 0, 1, 0, 0); in_ly.clearRect(0, 0, LW, LH); in_ly.drawImage(low, 0, 0);
  // 4. fond restitué, puis le calque (éventuellement écrasé en largeur autour de l'axe)
  L.clearRect(0, 0, LW, LH); L.drawImage(in_snC, 0, 0);
  L.save(); L.imageSmoothingEnabled = false; L.translate(cx, 0); L.scale(turn, 1); L.translate(-cx, 0);
  const lean = o.lean ?? 0;
  if (!lean) L.drawImage(in_lyC, 0, 0);
  else for (let y = 0; y < LH; y += 1) { const dxs = Math.round((cy - y) * lean); if (y > cy + 4 || y < cy - 100 * s / 1) { if (y <= cy + 4) { } } L.drawImage(in_lyC, 0, y, LW, 1, y < cy ? dxs : 0, y, LW, 1); }
  L.restore();
  L.setTransform(1, 0, 0, 1, 0, 0);
}

// ── décor : lisière d'une prairie à l'aube ──
function in_backdropAube(t, cam) {
  const P = 'savannaDawn', h = 250, sp = k_sunPos(P, { h });
  k_sky(P, t, { h });
  k_sun(sp[0], sp[1] - 4, sp[2], { t, cam });
  k_clouds(t, { preset: P, y0: 150, y1: 235, n: 4, speed: 3, cam, seed: 23 });
  k_birds(t, { y: 176, x: 20, speed: 11, cam, n: 5, col: DU[1] });
  k_hills(P, t, { y: h + 6, amp: 18, trees: 0.5, treeH: 12, cam, haze: 0.4, seed: 6, par: 0.25, base: 340 });
  k_hills(P, t, { y: h + 30, amp: 14, trees: 0.7, treeH: 14, cam, haze: 0.22, seed: 9, par: 0.4, base: 360 });
  k_haze(h - 6, h + 44, '#f6b6a8', 0.35, { t, cam, profile: 'bottom' });
  fl_grassSpring(h + 30, 480, { env: P, grow: 0.85, seed: 3, cam, t, h: 10, density: 0.5 });
  fl_flowers(0, h + 44, LW, 400, { kind: 'mix', density: 0.5, seed: 4, t, cam });
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0); vgrad(0, h + 30, LW, 480 - h - 30, [[0, 'rgba(255,214,120,0.34)'], [0.45, 'rgba(255,170,90,0.12)'], [1, 'rgba(40,30,70,0.12)']]); L.restore();       // la lumière rasante dore le pré
}
// touffes d'herbe devant les pieds (elles ploient avec le vent du décor)
function in_tufts(cx, cy, t, cam) {
  const r = rng(77);
  for (let i = 0; i < 18; i++) {
    const x = cx - 34 + r() * 68, y = cy + 1 + r() * 5, h = 6 + r() * 9, w = k_wind(t, x, i) * 2.5, dark = i % 3 === 0;
    lineP(x, y, x + w, y - h, dark ? LM[1] : LM[3], 1); if (r() < 0.6) px(x + w + 1, y - h, LM[5]);
  }
}
function in_pose(u, t, sh) {                                                           // pose du scientifique à l'instant u du plan
  const tV = in_rel('voici', sh), tAn = in_rel('animaux0', sh);
  const turn = 0.55 + 0.45 * eob(prog(u, 0, 0.3)), smile = sm(prog(u, 0.22, 0.5));
  const book = Math.min(1.06, eob(prog(u, 0.12, 0.62))) * (1 - 0.86 * sm(prog(u, tAn + 0.02, tAn + 0.4)));
  const pt = bump(u, in_rel('flip0', sh) - 0.25, in_rel('flip0', sh) + 0.05, in_rel('flip2', sh) + 0.35, tAn + 0.1);
  const bino = sm(prog(u, tAn + 0.12, tAn + 0.55));
  const lines = prog(u, tV + 0.3, tAn + 0.3);
  return { lean: bino * (0.045 + 0.012 * Math.sin(u * 3.2)), turn: lerp(turn, 1, bino), smile: smile * (1 - 0.3 * bino), book, point: pt, bino, lines };
}
function in_troisDraw(u, t, sh) {
  const P = 'savannaDawn', cam = k_pan(u, 0, -6, 'o', 2.9), pz = in_pose(u, t, sh), cx = 100 - cam * 1.1;
  in_backdropAube(t, cam);
  fl_acacia(t, { x: 232, y: 300, h: 86, env: P, depth: 0.45, seed: 2, cam });
  // l'aube vit : oiseaux, rosée qui brille, poussière de pollen dans la lumière
  const bu = u - 0.35; if (bu > 0 && bu < 2.4) k_bird(-14 + bu * 118, 214 - bu * 14 + 4 * Math.sin(bu * 5), t, { kind: 'small', dir: 1, s: 1.1, col: DU[1], rim: AM[8], rate: 3.6 });
  const bu2 = u - 0.5; if (bu2 > 0 && bu2 < 2.1) k_bird(290 - bu2 * 150, 152 + 4 * Math.sin(bu2 * 4.3), t, { kind: 'small', dir: -1, s: 0.9, col: DU[1], rim: AM[8], rate: 3.2, phase: 1.7 });
  k_shadow(cx - 12, 349, 40, 4, 0.42, { col: '46,26,86' });
  in_sci(cx, 347 + Math.round(0.7 * Math.sin(t * 2.6)), 2.1, t, pz);
  in_tufts(cx, 347, t, cam);
  k_glints(t, { y0: 300, y1: 440, n: 22, cam, col: WH[3], col2: AM[9] });
  k_pollen(t, { n: 30, y0: 160, y1: 340, cam, beam: { x: 232, y: 232, angle: 2.2, spread: 1.3, len: 300 } });
  fl_grassFg(t, { env: P, kind: 'green', side: 'bottom', h: 44, n: 26, seed: 5, cam });
  k_vignetteWarm(0.3);
}
// ── interface du plan : titre, cases du carnet qui se retournent, lieux ──
const in_IC = [];                                                                       // icônes des trois bêtes (ICONES[k]) pré-dessinées à 20 × 20 pour être agrandies ×3
INITS.push(() => {
  for (let k = 0; k < 3; k++) {
    const c = mkCanvas(20, 20); L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, 20, 20); ICONES[k](10, 10); c.getContext('2d').drawImage(low, 0, 0, 20, 20, 0, 0, 20, 20); L.clearRect(0, 0, 20, 20); in_IC.push(c);
  }
});
const in_LIEUX = [['ALASKA', 'blue'], ['MEXIQUE', 'amber'], ['AFRIQUE', 'green']];
const in_CW = 70, in_CH = 82, in_CG = 8, in_CX = 22, in_CY = 40;
function in_card(k, f, pop) {                                                           // f : 0 face cachée (« ? ») → 1 retournée (la bête) ; pop : 0 → 1 apparition
  if (pop <= 0) return;
  const x0 = in_CX + k * (in_CW + in_CG), sc = Math.max(0.05, eob(clamp(pop))), w = in_CW, h = Math.round(in_CH * sc), y0 = in_CY + (in_CH - h) - Math.round(5 * Math.sin(Math.PI * clamp(f)));
  const front = f > 0.5, wf = front ? sm(clamp((f - 0.5) / 0.5)) * (1 + 0.1 * Math.sin(clamp((f - 0.5) / 0.5) * Math.PI)) : 1 - sm(clamp(f / 0.5));
  const fw = Math.max(2, Math.round(w * Math.min(1.1, wf))), fx = Math.round(x0 + w / 2 - fw / 2), B = BETES[k];
  R(fx + 2, y0 + h + 1, fw, 3, 'rgba(5,4,15,0.35)');
  R(fx - 1, y0 - 1, fw + 2, h + 2, '#05040f');
  if (front) {
    R(fx, y0, fw, h, B.clair); R(fx + 1, y0 + 1, fw - 2, h - 2, B.fond);
    if (fw > 8) { R(fx + 1, y0 + 1, fw - 2, 2, B.clair); R(fx + 3, y0 + 4, fw - 6, 1, 'rgba(255,255,255,0.16)'); }
    if (fw > 12 && h > 40) { L.save(); L.imageSmoothingEnabled = false; L.globalAlpha = 1; L.drawImage(in_IC[k], 0, 0, 20, 20, Math.round(x0 + w / 2 - 30 * (fw / w)), y0 + Math.round(h / 2 - 32), Math.round(60 * (fw / w)), 60); L.restore(); }
  } else {
    R(fx, y0, fw, h, ST[5]); R(fx + 1, y0 + 1, fw - 2, h - 2, NI[2]);
    if (fw > 20 && h > 40) {
      for (let q = 0; q < 6; q++) for (let r = 0; r < 7; r++) if ((q + r) % 2 === 0) R(fx + 6 + q * Math.floor((fw - 14) / 5.5), y0 + 6 + r * Math.floor((h - 16) / 6.5), 3, 3, NI[3]);
      ptextC('?', fx + fw / 2, y0 + h / 2 - 12, AM[8], 4, '#05040f');
    }
  }
}
function in_troisUi(u, t, sh) {
  const tV = in_rel('voici', sh);
  for (let k = 0; k < 3; k++) {
    const pop = prog(u, 0.04 + 0.07 * k, 0.22 + 0.07 * k), f = prog(u, in_rel('flip' + k, sh), in_rel('flip' + k, sh) + 0.34);
    in_card(k, f, pop);
    const ta = in_rel('flip' + k, sh) + 0.3;
    if (u > ta) { const cx = in_CX + k * (in_CW + in_CG) + in_CW / 2; tagBox(cx, in_CY + in_CH + 6, in_LIEUX[k][0], in_LIEUX[k][1], Math.ceil((u - ta) * 36), true); }
  }
  const gp = (u - in_rel('animaux0', sh) - 0.62) / 0.45;
  if (gp > 0 && gp < 1) { const cx = 100 - k_pan(u, 0, -6, 'o', 2.9) * 1.1; in_star(cx + 14.7 + 0.045 * (347 - 177) + 4, 177, Math.round(6 * Math.sin(gp * Math.PI))); }
  const n = Math.max(0, Math.floor((u - tV - 0.05) * 38));
  if (n > 0) {
    const s = '3 ANECDOTES FOLLES', w = textW(s, 2), x = Math.round(135 - w / 2);
    ptext(s, x, 15, '#05040f', 2, null, n); ptext(s, x, 14, AM[8], 2, '#05040f', n);
    if (n < s.length) R(x + textW(s.slice(0, n), 2) + 2, 14, 2, 14, AM[9]);                       // le curseur de saisie disparaît dès que le texte est entièrement tapé
  }
}

// préchauffage : un premier dessin de chaque plan remplit les caches de sprites (le résultat est effacé ; aucun pixel ne change)
INITS.push(() => {
  in_gelDraw(0.5, 0.5, { t0: 0 }); in_gelDraw(2.6, 2.6, { t0: 0 }); in_troisDraw(1.0, 4.8, { t0: 3.77 }); in_troisDraw(2.4, 6.1, { t0: 3.77 });
  clearL();
});
function buildIntro(S) {
  const tVoici = wt('trois', 'Voici');
  in_A.revenir = wt('q', 'revenir'); in_A.vie = wt('q', 'vie'); in_A['gelé'] = wt('q', 'gelé');
  in_A.beats = [in_A.vie - 0.02, in_A['gelé'] + 0.12];
  const t1 = tVoici - 0.1, tAn = wt('trois', 'anecdotes');
  in_A.voici = tVoici; in_A.flip0 = wt('trois', 'trois'); in_A.flip1 = tAn; in_A.flip2 = tAn + 0.5 * (wt1('trois', 'anecdotes') - tAn);
  in_A.animaux0 = wt('trois', 'animaux'); in_A.animaux1 = wt1('trois', 'animaux');
  shot('i_gel', S.t0, {
    draw: in_gelDraw, ui: in_gelUi,
    ev: [[S.t0 + 0.04, 'snowfall', t1 - S.t0], [S.t0 + 0.1, 'wind', 2.5], [S.t0 + 0.22, 'sparkle', 1], [S.t0 + 0.62, 'sparkle', 1], [S.t0 + 0.98, 'sparkle', 1], [S.t0 + 0.8, 'label', 1], [S.t0 + 1.42, 'sparkle', 1], [S.t0 + 1.8, 'sparkle', 1],
      [Math.max(S.t0 + 1.2, in_A.revenir - 0.45), 'crack', 0.1], [in_A.revenir, 'crack', 0.3], [in_A.revenir + 0.05, 'glow', in_A.vie - in_A.revenir + 0.6], [in_A.vie - 0.02, 'heartbeat', 1], [in_A.vie, 'crack', 0.6], [in_A['gelé'] - 0.05, 'crack', 1], [in_A['gelé'] + 0.12, 'heartbeat', 1], [in_A['gelé'] + 0.14, 'sparkle', 1]],
  });
  shot('i_trois', t1, {
    draw: in_troisDraw, ui: in_troisUi,
    ev: [[t1 + 0.02, 'whoosh', 0.3], [t1, 'wind', S.t1 - t1], [t1 + 0.3, 'page', 1], [t1 + 0.4, 'bird', 1],
      [tVoici + 0.05, 'label', 1], [tVoici + 0.3, 'scribble', in_A.animaux0 + 0.3 - tVoici],
      [in_A.flip0 + 0.16, 'pop', 1], [in_A.flip1 + 0.16, 'pop', 1], [in_A.flip2 + 0.16, 'pop', 1],
      [in_A.flip0 + 0.3, 'label', 1], [in_A.flip1 + 0.3, 'label', 1], [in_A.flip2 + 0.3, 'label', 1], [in_A.flip2 + 0.2, 'reveal', 1],
      [t1 + 0.55, 'bird', 2], [in_A.animaux0 + 0.1, 'whoosh', 0.45], [in_A.animaux0 + 0.62, 'sparkle', 1]],
  });
}
