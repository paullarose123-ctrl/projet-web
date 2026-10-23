'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════
   sc_intro.js — l'ACCROCHE de l'épisode 2 (préfixe in_), de 0 à SEG.intro.t1 (≈ 5,8 s), deux plans
     i_cases  le scientifique en lisière de prairie à l'aube ; trois cases se retournent (scarabée, basilic, anguille) avec leur pouvoir (100 °C, SUR L'EAU, 860 V) ;
              titre « 3 SUPER-POUVOIRS » ; il lève ses jumelles                                    « Voici trois animaux qui possèdent des capacités tellement incroyables »
     i_film   écran de cinéma : un petit film défile (les trois bêtes en action), puis la claquette claque sur « film »    « qu'on pourrait croire qu'ils sortent d'un film ! »
   Tout est calé sur wt() / wt1() (in_A : instants absolus des mots, remplis par buildIntro).
   ═════════════════════════════════════════════════════════════════════════════════════════════ */

const in_A = {};
const in_rel = (name, sh) => (in_A[name] ?? 0) - ((sh && sh.t0) || 0);            // instant d'un mot en secondes depuis le début du plan
function in_star(x, y, r) {                                                              // étoile de lumière à quatre branches (pixels nets, dans ui)
  if (r < 1) return;
  px(x, y, WH[3]);
  for (let k = 1; k <= r; k++) { const c = k < r * 0.6 ? WH[3] : YE[3]; px(x + k, y, c); px(x - k, y, c); px(x, y + k, c); px(x, y - k, c); }
  px(x + 1, y + 1, YE[3]); px(x - 1, y - 1, YE[3]); px(x + 1, y - 1, YE[3]); px(x - 1, y + 1, YE[3]);
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

// ── interface du plan i_cases : titre, cases du carnet qui se retournent, pouvoirs ──
const in_IC = [];                                                                       // icônes des trois bêtes (ICONES[k]) pré-dessinées à 20 × 20 pour être agrandies ×3
INITS.push(() => {
  for (let k = 0; k < 3; k++) {
    const c = mkCanvas(20, 20); L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, 20, 20); ICONES[k](10, 10); c.getContext('2d').drawImage(low, 0, 0, 20, 20, 0, 0, 20, 20); L.clearRect(0, 0, 20, 20); in_IC.push(c);
  }
});
const in_LIEUX = [['100 °C', 'amber'], ["SUR L'EAU", 'green'], ['860 V', 'blue']];
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
function in_casesUi(u, t, sh) {
  const tV = in_rel('voici', sh);
  for (let k = 0; k < 3; k++) {
    const pop = prog(u, in_rel('pop' + k, sh) - 0.02, in_rel('pop' + k, sh) + 0.2), f = prog(u, in_rel('flip' + k, sh), in_rel('flip' + k, sh) + 0.34);
    in_card(k, f, pop);
    const ta = in_rel('flip' + k, sh) + 0.3;
    if (u > ta) { const cx = in_CX + k * (in_CW + in_CG) + in_CW / 2; tagBox(cx, in_CY + in_CH + 6, in_LIEUX[k][0], in_LIEUX[k][1], Math.ceil((u - ta) * 36), true); }
  }
  const gp = (u - in_rel('animaux0', sh) - 0.62) / 0.45;
  if (gp > 0 && gp < 1) { const cx = 100 - k_pan(u, 0, -6, 'o', 2.9) * 1.1; in_star(cx + 14.7 + 0.045 * (347 - 177) + 4, 177, Math.round(6 * Math.sin(gp * Math.PI))); }
  const n = Math.max(0, Math.floor((u - tV - 0.05) * 38));
  if (n > 0) {
    const s = '3 SUPER-POUVOIRS', w = textW(s, 2), x = Math.round(135 - w / 2);
    ptext(s, x, 15, '#05040f', 2, null, n); ptext(s, x, 14, AM[8], 2, '#05040f', n);
    if (n < s.length) R(x + textW(s.slice(0, n), 2) + 2, 14, 2, 14, AM[9]);                       // le curseur de saisie disparaît dès que le texte est entièrement tapé
  }
}

// ───────────────────────── plan 3 : i_film ─────────────────────────
// salle de cinéma : rideaux rouges, grand écran où défilent les trois bêtes en action (coupes franches sur les mots), faisceau du projecteur, têtes du public ;
// sur « film » la claquette claque (ui, couleurs exactes) et l'écran blanchit une image.
const in_SX = 20, in_SY = 38, in_SW = 230, in_SH = 178;
function in_scene(k, t, tS, tt) {
  const x = in_SX, y = in_SY, w = in_SW, h = in_SH, gy = y + 142;
  L.save(); L.beginPath(); L.rect(x, y, w, h); L.clip();
  if (k === 0) {                                                       // scarabée : terre de fin d'après-midi, il tire sur un crapaud
    vgrad(x, y, w, h, [[0, DU[3]], [0.3, RD[4]], [0.6, AM[7]], [1, YE[3]]]);
    disc(x + 176, y + 70, 15, YE[3]); disc(x + 176, y + 70, 11, WH[3]);
    poly([[x, y + 100], [x, y + 86], [x + 30, y + 82], [x + 40, y + 74], [x + 70, y + 74], [x + 80, y + 88], [x + 120, y + 92], [x + 150, y + 98], [x + w, y + 90], [x + w, y + 110]], OC[1]);
    R(x, y + 108, w, h - 108, OC[3]); ditherRect(x, y + 108, w, 14, OC[2], 0.55); ditherRect(x, y + 130, w, h - 130, OC[2], 0.4);
    ell(x + 112, gy + 6, 100, 11, OC[2]); ell(x + 112, gy + 3, 96, 8, OC[4]);
    const r = sb_beetle(x + 70, gy + 2, 1.5, t, { pose: 'aim', tip: 1, hot: 0.7, fire: sm(prog(tt, 0.12, 0.2)) * (1 - prog(tt, 0.5, 0.6)), light: 1, shadow: 0.5 });
    const hit = tt > 0.34;
    sb_toad(x + 188, gy + 3, 0.95, t, { flip: false, recoil: hit ? sm(prog(tt, 0.34, 0.44)) : 0, squint: hit ? 1 : 0, shake: hit ? Math.sin(tt * 90) * 0.5 : 0, shadow: 0.5 });
    sb_jet(r.tip[0], r.tip[1], Math.atan2(r.tipDir[1], r.tipDir[0]) + 0.1, t, tS + 0.12, { dur: 0.45, len: 96, hz: 14, size: 0.9 });
    if (tt > 0.34) sb_splashHit(x + 160, gy - 30, t, tS + 0.34, { dir: 2.6 });
  } else if (k === 1) {                                                // basilic : il traverse la rivière en courant sur l'eau
    vgrad(x, y, w, h, [[0, GR[0]], [0.3, GR[1]], [0.5, LM[1]], [0.62, CY[3]], [1, CY[1]]]);
    for (const [bx, bh] of [[14, 110], [58, 96], [150, 118], [204, 100]]) { R(x + bx, y + 120 - bh, 6, bh, GR[0]); ell(x + bx + 3, y + 120 - bh, 20, 9, GR[2]); }
    ell(x + 110, y + 28, 90, 22, GR[2]); ell(x + 84, y + 22, 40, 12, LM[3]); ell(x + 160, y + 34, 40, 14, GR[1]);
    const wy = y + 128; R(x, wy, w, h - 128, CY[2]); ditherRect(x, wy, w, 8, LM[3], 0.5); ditherRect(x, wy + 20, w, h - 148, CY[1], 0.5);
    for (let i = 0; i < 9; i++) lineP(x + 6 + i * 25 + ((t * 10 + i * 3) % 7), wy + 6 + (i % 4) * 9, x + 22 + i * 25 + ((t * 10 + i * 3) % 7), wy + 6 + (i % 4) * 9, WH[2], 1);
    const hipX = x + 30 + 128 * clamp(tt / 0.58), fx = { t0: tS, ph0: 0, f: 3.3, x0: hipX - 150 * tt, v: 150, dir: 1, s: 0.85, wy, size: 0.9 };
    ba_runFx(t, { ...fx, layer: 'under' });
    ba_lizard(0, 0, 0.85, t, { pose: 'run', spd: 1, hip: [hipX, wy - 24], light: [0.5, -0.86], rim: 1 });
    ba_runFx(t, { ...fx, layer: 'over' });
  } else {                                                             // anguille : eau trouble d'Amazonie, rayons de lumière, décharge
    vgrad(x, y, w, h, [[0, CY[1]], [0.5, BL[2]], [1, NI[3]]]);
    for (let i = 0; i < 5; i++) poly([[x + 8 + i * 48, y], [x + 30 + i * 48, y], [x + 4 + i * 48, y + 130], [x - 24 + i * 48, y + 130]], CY[3]);
    ditherRect(x, y + 128, w, h - 128, NI[1], 0.7);
    for (let i = 0; i < 20; i++) { const gx = x + 4 + i * 11; lineP(gx, y + h, gx + Math.sin(t * 1.5 + i) * 3, y + 140 - (i * 7) % 22, i % 2 ? GR[1] : GR[2], 1); }
    const I = an_pulse(t, tS + 0.06, 0.36, 1);
    const e = an_eel(x + 210, y + 80, 0.78, t, { pose: 'zap', zap: I });
    an_halo(e, t, I, { reach: 60 }); an_discharge(e, t, I, { reach: 70, n: 4 });
  }
  L.restore();
}
function in_filmDraw(u, t, sh) {
  const ts = [in_A.f0, in_A.f1, in_A.f2], k = t >= in_A.f2 ? 2 : t >= in_A.f1 ? 1 : 0, tS = ts[k], tt = t - tS;
  vgrad(0, 0, LW, LH, [[0, NI[1]], [1, NI[0]]]);
  // faisceau du projecteur (au fond, du bas vers l'écran) puis rideaux
  L.save(); L.globalAlpha = 0.16; poly([[118, LH], [152, LH], [in_SX + in_SW, in_SY + in_SH], [in_SX, in_SY + in_SH]], WH[2]); L.restore();
  for (const [x0, sd] of [[0, 1], [LW, -1]]) { for (let i = 0; i < 6; i++) { const xx = x0 + sd * i * 5 - (sd < 0 ? 5 : 0), c = i % 2 ? RD[1] : RD[2]; R(xx, 0, 5, 300, c); R(xx + (sd < 0 ? 0 : 3), 0, 2, 300, RD[0]); } }
  R(in_SX - 3, in_SY - 3, in_SW + 6, in_SH + 6, '#05040f'); R(in_SX - 2, in_SY - 2, in_SW + 4, in_SH + 4, ST[3]);
  in_scene(k, t, tS, tt);
  // lueur de l'écran sur la salle, cadre lumineux
  k_glints(t, { n: 18, y0: in_SY, y1: in_SY + in_SH, col: WH[3], col2: YE[3], rate: 1.2, seed: 9 });
  // public : rangées de têtes sombres vues de dos, qui se découpent sur le faisceau
  for (let row = 0; row < 3; row++) {
    const yy = 262 + row * 34, r = rng(30 + row);
    for (let i = -1; i < 9; i++) {
      const xx = Math.round(i * 34 + (row % 2) * 17 + r() * 4 - 2), hh = 13 + Math.round(r() * 3);
      ell(xx + 12, yy, 11, 10, NI[0]); R(xx, yy + 4, 25, 60, NI[0]); R(xx + 3, yy - 3 + (row === 1 ? 1 : 0), 18, 2, NI[1]);
    }
  }
  k_dust(t, { n: 26, y0: 60, y1: 340 });
  k_vignetteWarm(0.3);
}
// claquette (ui) : arrive d'en haut, s'ouvre, et claque sur « film » ; texte pixel ; flash blanc d'une image
function in_clapUi(u, t, sh) {
  const tc = in_A.film, t0 = tc - 0.30, p = prog(t, t0, t0 + 0.26);
  if (t >= tc - 0.04 && t < tc + 0.07) { L.save(); L.globalAlpha = t < tc ? 0.35 : 0.8 * (1 - (t - tc) / 0.07); R(0, 0, LW, LH, WH[3]); L.restore(); }
  if (p <= 0) return;
  const bx = 36, w = 198, h = 118, by = 168 + Math.round((1 - eob(p)) * -240) + (t > tc && t < tc + 0.18 ? Math.round(Math.sin((t - tc) * 60) * 2) : 0), sticks = 24;
  const open = (t < tc - 0.02 ? 0.5 : 0) * sm(prog(t, t0 + 0.12, t0 + 0.3)) + (t >= tc - 0.02 && t < tc ? 0.5 * (1 - (t - (tc - 0.02)) / 0.02) : 0);   // 0,5 rad ouvert → 0 fermé en un instant
  const ink = '#05040f', nStripe = 7;
  R(bx - 2, by - 2, w + 4, h + 4, ink); R(bx, by + sticks + 4, w, h - sticks - 4, NI[2]);                                     // corps
  R(bx, by + sticks + 4, w, 2, ST[5]); R(bx, by + sticks + 4 + 26, w, 1, ST[5]); R(bx, by + sticks + 4 + 58, w, 1, ST[5]); R(bx + 100, by + sticks + 4, 1, 26, ST[5]);
  ptext('SCENE', bx + 6, by + sticks + 9, WH[3], 2, null); ptext('1', bx + 6 + 72, by + sticks + 9, AM[8], 2, null); ptext('PRISE', bx + 108, by + sticks + 9, WH[3], 2, null); ptext('1', bx + 108 + 72, by + sticks + 9, AM[8], 2, null);
  ptext('3 ANIMAUX', bx + 6, by + sticks + 36, WH[2], 2, null);
  ptext('ACTION !', bx + 6, by + sticks + 68, AM[8], 3, null);
  // barre fixe (en bas) puis barre mobile (articulée à gauche, cisaillée par colonnes)
  for (const [off, ang] of [[0, 0], [-sticks - 2, open]]) {
    for (let i = 0; i < w; i++) {
      const dy = Math.round(-Math.sin(ang) * i), yy = by + off + dy;
      for (let j = 0; j < sticks; j++) R(bx + i, yy + j, 1, 1, (((i + j + (off ? 4 : 0)) >> 3) & 1) ? ink : WH[3]);
      R(bx + i, yy, 1, 1, ink); R(bx + i, yy + sticks - 1, 1, 1, ink);
    }
    R(bx, by + off + 0, 1, sticks, ink); R(bx + w - 1, by + off + Math.round(-Math.sin(ang) * w), 1, sticks, ink);
  }
  R(bx - 1, by - sticks - 2 + 2, 3, 3, ST[3]);
}
// préchauffage : les sprites des trois scènes se construisent une fois avant le premier plan
INITS.push(() => { const f = 0.0; for (const k of [0, 1, 2]) { in_scene(k, 3 + k, 3 + k - 0.3, 0.3); in_scene(k, 4 + k, 4 + k - 0.5, 0.5); } clearL(); });

function buildIntro(S) {
  const w = m => wt('i1', m), w1 = m => wt1('i1', m);
  const tV = w('Voici'), tQ = w("qu'on"), t1 = tQ - 0.1;
  in_A.voici = tV; in_A.pop0 = tV; in_A.pop1 = w('trois'); in_A.pop2 = w('animaux');
  in_A.flip0 = w('possèdent'); in_A.flip1 = w('capacités'); in_A.flip2 = w('tellement');
  in_A.animaux0 = w('incroyables'); in_A.animaux1 = w1('incroyables');
  in_A.f0 = t1; in_A.f1 = w('croire') - 0.02; in_A.f2 = w('sortent') - 0.02; in_A.film = w('film');
  shot('i_cases', S.t0, {
    draw: in_troisDraw, ui: in_casesUi,
    ev: [[S.t0 + 0.02, 'whoosh', 0.3], [S.t0, 'wind', t1 - S.t0], [S.t0 + 0.3, 'page', 1], [S.t0 + 0.4, 'bird', 1],
      [tV + 0.05, 'label', 1], [tV + 0.3, 'scribble', in_A.animaux0 + 0.3 - tV],
      [in_A.pop0 - 0.02, 'pop', 1], [in_A.pop1 - 0.02, 'pop', 1], [in_A.pop2 - 0.02, 'pop', 1],
      [in_A.flip0 + 0.16, 'pop', 1], [in_A.flip1 + 0.16, 'pop', 1], [in_A.flip2 + 0.16, 'pop', 1],
      [in_A.flip0 + 0.3, 'label', 1], [in_A.flip1 + 0.3, 'label', 1], [in_A.flip2 + 0.3, 'label', 1], [in_A.flip2 + 0.2, 'reveal', 1],
      [in_A.animaux0 + 0.1, 'whoosh', 0.45], [in_A.animaux0 + 0.62, 'sparkle', 1]],
  });
  shot('i_film', t1, {
    draw: in_filmDraw, ui: in_clapUi,
    ev: [[in_A.f0 + 0.12, 'squirt', 1], [in_A.f0 + 0.34, 'splat', 1], [in_A.f1 + 0.1, 'splash', 1], [in_A.f1 + 0.3, 'splash', 1], [in_A.f2 + 0.06, 'zap', 1], [in_A.film - 0.3, 'whoosh', 0.3], [in_A.film, 'slap', 1], [in_A.film + 0.05, 'reveal', 1]],
  });
}
