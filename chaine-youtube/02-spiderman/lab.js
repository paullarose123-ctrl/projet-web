'use strict';
// ───────────────────────── le labo : décor, araignée, bocal, scientifique ─────────────────────────
let LABBG = null, WOODWALL = null;

// panneau de bois : planches verticales avec joints, nœuds et veines (pré-rendu)
function makeWood(w, h, seed, base, dark, light) {
  const cvs = mkCanvas(w, h), c = cvs.getContext('2d'), r = rng(seed);
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  let x = 0;
  while (x < w) {
    const pw = 10 + Math.floor(r() * 4), tone = r();
    c.fillStyle = tone < 0.33 ? dark : tone < 0.66 ? base : light; c.globalAlpha = 0.32; c.fillRect(x, 0, pw, h); c.globalAlpha = 1;
    c.fillStyle = dark; c.fillRect(x, 0, 1, h);                              // joint
    c.fillStyle = light; c.globalAlpha = 0.5; c.fillRect(x + 1, 0, 1, h); c.globalAlpha = 1;
    for (let k = 0; k < 7; k++) { const gx = x + 2 + Math.floor(r() * (pw - 3)), gy = Math.floor(r() * h), gl = 8 + Math.floor(r() * 30); c.fillStyle = r() < 0.5 ? dark : light; c.globalAlpha = 0.45; c.fillRect(gx, gy, 1, gl); c.globalAlpha = 1; }
    if (r() < 0.3) { const ky = 14 + Math.floor(r() * (h - 28)), kx = x + 3 + Math.floor(r() * (pw - 6)); c.fillStyle = dark; c.fillRect(kx, ky, 2, 3); c.fillStyle = light; c.globalAlpha = 0.6; c.fillRect(kx, ky - 1, 2, 1); c.globalAlpha = 1; }
    x += pw;
  }
  return cvs;
}
function makeLab() {
  WOODWALL = makeWood(LW, LH, 3, WO[3], WO[1], WO[5]);
}

// ───────────────────────── araignée suspendue la tête en bas (repère local : origine = attache du fil, +y vers le bas) ─────────────────────────
function drawSpider(cx, cy, s, t, o = {}) {
  const sway = o.sway ?? 0, k = (n, v) => rd(n * v), bark = o.tone === 'bark';
  const cLeg = bark ? ST[2] : WO[2], cKnee = bark ? ST[6] : AM[6], cB0 = bark ? ST[1] : WO[1], cB1 = bark ? WO[3] : AM[5], cB2 = bark ? WO[4] : AM[6], cB3 = bark ? WO[5] : AM[7], cDot = bark ? WH[0] : AM[10];
  cx = rd(cx); cy = rd(cy);
  const P = (x, y) => [cx + x * s, cy + y * s];
  // pattes : 4 par côté, genou levé
  const ang = [1.15, 0.62, -0.12, -0.78];
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const wig = Math.sin(t * (2.3 + i * 0.4) + i * 1.7 + (side > 0 ? 0 : 1.2)) * 0.12 * (o.legWig ?? 1);
    const base = [side * 3.2, 17 + i * 1.3], a = ang[i] + wig;
    const kx = base[0] + side * 8.5 * Math.cos(a - 0.7), ky = base[1] + 8.5 * Math.sin(a - 0.7);
    const fx = kx + side * 10 * Math.cos(a + 0.65), fy = ky + 10 * Math.sin(a + 0.65);
    const b = P(...base), kk = P(kx, ky), f = P(fx, fy);
    lineP(b[0], b[1], kk[0], kk[1], cLeg, Math.max(1, rd(s * 1.2)));
    lineP(kk[0], kk[1], f[0], f[1], cLeg, Math.max(1, rd(s)));
    px(kk[0], kk[1] - 1, cKnee);                                                            // reflet sur le genou
    if (s >= 2) { px(kk[0] + side, kk[1], AM[5]); }
  }
  // abdomen
  const ab = P(0, 7.5);
  ell(ab[0], ab[1], rd(7.3 * s), rd(8.6 * s), cB0);
  ell(ab[0], ab[1], rd(6.6 * s), rd(8 * s), cB1);
  ell(ab[0] - rd(0.8 * s), ab[1] - rd(0.9 * s), rd(5.3 * s), rd(6.6 * s), cB2);
  ell(ab[0] - rd(1.6 * s), ab[1] - rd(2.4 * s), rd(3 * s), rd(3.3 * s), cB3);
  if (bark) for (const sd of [-1, 1]) ell(ab[0] + sd * rd(6.4 * s), ab[1] - rd(4.6 * s), Math.max(1, rd(2 * s)), Math.max(1, rd(2.4 * s)), cB2);
  // marques crème (croix de l'épeire)
  const dots = [[0, 1, 1.2], [0, 5, 1.1], [0, 9, 1.1], [-3, 6.5, 0.9], [3, 6.5, 0.9], [-2.2, 12, 0.8], [2.2, 12, 0.8]];
  for (const [dx, dy, rr] of dots) { const q = P(dx, dy); ell(q[0], q[1], Math.max(1, rd(rr * s)), Math.max(1, rd(rr * s * 1.1)), cDot); }
  // céphalothorax
  const th = P(0, 19.2);
  ell(th[0], th[1], rd(4.6 * s), rd(4.2 * s), WO[1]); ell(th[0], th[1] - rd(0.3 * s), rd(3.9 * s), rd(3.6 * s), WO[3]); ell(th[0] - rd(0.8 * s), th[1] - rd(0.9 * s), rd(2.2 * s), rd(1.8 * s), WO[5]);
  const hd = P(0, 22.6);
  for (const dx of [-1.6, 1.6]) { const e = P(dx, 22.4); R(e[0], e[1], Math.max(1, rd(s)), Math.max(1, rd(s)), AM[10]); }
}

// ───────────────────────── bocal de labo avec une branche ─────────────────────────
function drawJar(x, y, w, h, t, o = {}) {
  // intérieur légèrement bleuté, fond de bocal
  R(x, y, w, h, '#0e1a22'); ditherRect(x, y, w, h, '#16303a', 0.35);
  // lumière chaude de la lampe sur la paroi de gauche
  for (let i = 0; i < w; i++) { const a = 0.45 * Math.max(0, 1 - i / (w * 0.8)); ditherRect(x + i, y, 1, h, AM[5], a * 0.55); }
  // reflets verticaux du verre
  R(x + 3, y + 6, 2, h - 14, ST[6]); R(x + 6, y + 6, 1, h - 24, ST[7]); R(x + w - 6, y + 10, 1, h - 30, ST[5]);
  // contour du verre
  R(x - 1, y - 1, w + 2, 1, ST[6]); R(x - 1, y - 1, 1, h + 2, ST[5]); R(x + w, y - 1, 1, h + 2, ST[3]); R(x - 1, y + h, w + 2, 1, ST[4]);
  // couvercle métallique
  R(x - 3, y - 9, w + 6, 8, ST[4]); R(x - 3, y - 9, w + 6, 2, ST[7]); R(x - 3, y - 3, w + 6, 2, ST[2]); for (let i = 0; i < w + 6; i += 3) px(x - 3 + i, y - 6, ST[3]);
  // terre et mousse au fond
  R(x + 1, y + h - 12, w - 1, 11, WO[1]); ditherRect(x + 1, y + h - 12, w - 1, 11, WO[3], 0.4);
  for (let i = 0; i < w - 4; i += 2) { const hh = 2 + ((i * 7) % 5); R(x + 2 + i, y + h - 12 - hh, 2, hh, GR[2 + (i % 3 === 0 ? 1 : 0)]); }
}

// ───────────────────────── scientifique (blouse blanche, lunettes), de face ─────────────────────────
// origine : pieds au centre (cx, cy), taille ≈ 78 px à l'échelle 1
function drawScientist(cx, cy, s, t, o = {}) {
  const coat = o.coat || [WH[1], WH[0], WH[2]], hair = o.hair || WO[1], hairL = o.hairL || WO[3];
  const X0 = (x) => rd(cx + x * s), Y0 = (y) => rd(cy + y * s), S = v => Math.max(1, rd(v * s));
  const sway = Math.sin(t * 1.4) * 0.6 * (o.sway ?? 1), hy = o.headDy ?? 0;
  // jambes et chaussures
  R(X0(-8), Y0(-30), S(6), S(26), ST[2]); R(X0(2), Y0(-30), S(6), S(26), ST[2]); R(X0(-8), Y0(-30), S(2), S(26), ST[1]);
  R(X0(-9), Y0(-5), S(8), S(5), WO[2]); R(X0(1), Y0(-5), S(8), S(5), WO[2]); R(X0(-9), Y0(-5), S(8), S(1), WO[4]); R(X0(1), Y0(-5), S(8), S(1), WO[4]);
  // blouse
  R(X0(-15), Y0(-62), S(30), S(32), coat[0]); R(X0(-15), Y0(-62), S(5), S(32), coat[1]); R(X0(10), Y0(-62), S(5), S(32), coat[2]);
  R(X0(-1), Y0(-62), S(1), S(32), coat[1]);                                                              // boutonnage
  R(X0(-12), Y0(-50), S(7), S(6), coat[1]); R(X0(-12), Y0(-50), S(7), S(1), ST[5]);                       // poche
  R(X0(-2), Y0(-62), S(4), S(8), WO[3]);                                                               // cravate
  // bras
  const arm = o.armUp ?? 0;
  R(X0(-19), Y0(-62), S(6), S(24 - arm * 10), coat[0]); R(X0(13), Y0(-62 + arm * 6), S(6), S(22 - arm * 10), coat[0]);
  R(X0(-19), Y0(-38 + arm * 10), S(6), S(5), SK[3]); R(X0(13), Y0(-40 + arm * 4), S(6), S(5), SK[3]);
  // cou et tête
  R(X0(-3), Y0(-66), S(6), S(5), SK[2]);
  const hx = X0(0 + sway * 0.3), hyy = Y0(-76 + hy);
  ell(hx, hyy, S(9), S(10), SK[3]); ell(hx - S(1), hyy - S(1), S(7), S(8), SK[4]);
  R(hx - S(9), hyy - S(10), S(18), S(5), hair); R(hx - S(9), hyy - S(10), S(18), S(1), hairL);        // cheveux
  R(hx - S(9), hyy - S(6), S(3), S(5), hair); R(hx + S(6), hyy - S(6), S(3), S(5), hair);
  // lunettes
  R(hx - S(7), hyy - S(2), S(6), S(5), '#05040f'); R(hx + S(1), hyy - S(2), S(6), S(5), '#05040f');
  R(hx - S(6), hyy - S(1), S(4), S(3), CY[4]); R(hx + S(2), hyy - S(1), S(4), S(3), CY[4]); R(hx - S(1), hyy - S(1), S(2), S(1), '#05040f');
  px(hx - S(5), hyy - S(1), WH[3]); px(hx + S(3), hyy - S(1), WH[3]);
  R(hx - S(2), hyy + S(5), S(4), S(1), SK[1]);                                                         // bouche
}

// ───────────────────────── accessoires de labo ─────────────────────────
// (x, y) = coin bas gauche
function bottle(x, y, w, h, tone, o = {}) {
  const [c0, c1, c2] = tone;                                                // ombre, base, reflet
  R(x, y - h, w, h, c1); R(x, y - h, 1, h, c2); R(x + w - 1, y - h, 1, h, c0); R(x, y - 1, w, 1, c0);
  const nw = Math.max(2, rd(w * 0.4)); R(x + ((w - nw) >> 1), y - h - 3, nw, 3, c1); R(x + ((w - nw) >> 1), y - h - 4, nw, 1, WO[5]);
  if (o.label !== false) { R(x + 1, y - rd(h * 0.6), w - 2, Math.max(2, rd(h * 0.2)), WH[1]); R(x + 2, y - rd(h * 0.55), w - 4, 1, ST[4]); }
  if (o.liquid) R(x + 1, y - rd(h * 0.35), w - 2, rd(h * 0.35) - 1, o.liquid);
}
function flask(x, y, h, liquid, t = 0) {                                    // fiole d'Erlenmeyer, base en (x, y)
  const w = rd(h * 0.9);
  poly([[x - w / 2, y], [x + w / 2, y], [x + 2, y - h * 0.65], [x - 2, y - h * 0.65]], ST[5]);
  poly([[x - w / 2 + 2, y - 1], [x + w / 2 - 2, y - 1], [x + 2, y - h * 0.5], [x - 2, y - h * 0.5]], liquid);
  R(x - 2, y - h, 5, h * 0.35, ST[6]); R(x - 3, y - h - 1, 7, 2, ST[7]);
  R(x - w / 2 + 1, y - 2, 2, 1, WH[3]);
  if (t) { const b = (Math.floor(t * 3) % 3); px(x - 1 + b, y - h * 0.3 - ((t * 9) % 6), WH[3]); }
}
function bookStack(x, y, n = 3, seed = 1) {
  const r = rng(seed), cols = [RD[2], BL[2], GR[3], AM[5], DU[3]];
  let yy = y;
  for (let i = 0; i < n; i++) { const w = 28 + rd(r() * 10), h = 5 + rd(r() * 3), c = cols[Math.floor(r() * cols.length)], dx = rd((r() - 0.5) * 4); R(x + dx, yy - h, w, h, c); R(x + dx, yy - h, w, 1, WH[1]); R(x + dx + 2, yy - h + 2, w - 4, 1, WO[2]); R(x + dx, yy - 1, w, 1, '#05040f'); yy -= h; }
}
function deskLamp(x, y, t) {                                                // lampe articulée, socle en (x, y)
  R(x - 8, y - 3, 16, 3, ST[3]); R(x - 8, y - 3, 16, 1, ST[6]);
  lineP(x, y - 3, x + 10, y - 38, ST[5], 2); lineP(x + 10, y - 38, x - 8, y - 56, ST[5], 2); disc(x + 10, y - 38, 2, ST[7]);
  poly([[x - 18, y - 52], [x - 4, y - 60], [x - 2, y - 52], [x - 12, y - 44]], ST[4]); poly([[x - 18, y - 52], [x - 4, y - 60], [x - 6, y - 58], [x - 17, y - 53]], ST[7]);
  disc(x - 11, y - 48, 3, AM[10]);
}
function wallClock(cx, cy, t) {
  disc(cx, cy, 9, '#05040f'); disc(cx, cy, 8, ST[6]); disc(cx, cy, 7, WH[2]);
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; px(cx + Math.sin(a) * 6, cy - Math.cos(a) * 6, ST[2]); }
  const a1 = t * TAU / 60, a2 = t * TAU / 720 + 1; lineP(cx, cy, cx + Math.sin(a1) * 6, cy - Math.cos(a1) * 6, RD[3]); lineP(cx, cy, cx + Math.sin(a2) * 4, cy - Math.cos(a2) * 4, '#05040f', 2);
}
// mur de labo : bois, étagère de flacons, horloge, lueur de lampe
function drawLabWall(t, o = {}) {
  L.setTransform(1, 0, 0, 1, 0, 0);
  L.drawImage(WOODWALL, 0, 0);
  L.globalAlpha = o.dim ?? 0.5; R(0, 0, LW, LH, WO[0]); L.globalAlpha = 1;
  // étagère
  if (o.shelf !== false) {
    const sy = o.shelfY ?? 78;
    bottle(18, sy, 10, 22, [GR[1], GR[3], GR[5]], { liquid: GR[4] }); bottle(32, sy, 13, 16, [BL[0], BL[2], BL[4]]); bottle(50, sy, 9, 26, [RD[1], RD[3], RD[5]], { liquid: RD[4] });
    bottle(66, sy, 12, 19, [AM[3], AM[6], AM[9]], { liquid: AM[7] }); flask(100, sy, 22, CY[3], t); bottle(122, sy, 8, 14, [ST[2], ST[4], ST[6]]);
    R(10, sy, 130, 3, WO[5]); R(10, sy + 3, 130, 1, WO[1]); R(10, sy, 130, 1, WO[6]);
    wallClock(228, o.clockY ?? 40, t);
  }
}
