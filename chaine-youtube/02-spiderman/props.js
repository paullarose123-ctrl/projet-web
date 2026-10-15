'use strict';
// ───────────────────────── accessoires : règle, spaghetti, fil, câble de chargeur, train, héros de face ─────────────────────────
function rulerH(x0, y, mm, pxmm, t) {                  // règle graduée en millimètres
  const w = mm * pxmm;
  R(x0 - 2, y - 2, w + 4, 22, '#05040f'); R(x0, y, w, 18, YE[2]); R(x0, y, w, 2, YE[3]); R(x0, y + 16, w, 2, YE[0]);
  for (let i = 0; i <= mm; i++) {
    const x = x0 + i * pxmm, big = i % 5 === 0;
    R(x, y + 2, 1, big ? 8 : 4, '#3a2c08');
    if (big) ptextC(String(i), x + (i === 0 ? 3 : 0), y + 22, AM[9], 1);
  }
  ptext('MM', x0 + w - 12, y + 6, '#3a2c08', 1, null);
}
function spaghettiStrand(x0, x1, y, th, t) {            // brin de spaghetti sec (horizontal), cassé aux bouts
  for (let x = x0; x < x1; x++) {
    const o = Math.round(Math.sin(x * 0.045 + 1) * 1.2), yy = y + o, k = (x - x0) / (x1 - x0), brk = x < x0 + 3 || x > x1 - 3 ? 2 : 0;
    R(x, yy - th / 2 + brk, 1, th - brk * 2, AM[8]); R(x, yy - th / 2 + brk, 1, 3, AM[10]); R(x, yy + th / 2 - 3 - brk, 1, 3, AM[6]);
    if ((x * 7 + 3) % 11 < 2) px(x, yy - 2, AM[9]); if ((x * 5) % 13 < 2) px(x, yy + 2, AM[7]);
  }
}
function silkStrandH(x0, x1, y, th, t) {                // fil de soie horizontal, avec éclat qui glisse
  for (let x = x0; x < x1; x++) {
    const o = Math.round(Math.sin(x * 0.03 + 2) * 0.8), yy = y + o;
    R(x, yy - th / 2, 1, th, CY[2]); R(x, yy - th / 2 + 2, 1, th - 4, CY[3]); R(x, yy - th / 2 + 3, 1, Math.max(2, th - 10), WH[3]); R(x, yy - th / 2, 1, 1, CY[1]);
  }
  for (let k = 0; k < 3; k++) { const gx = x0 + ((t * 80 + k * 90) % (x1 - x0)); R(gx, y - th / 2 + 1, 3, 2, WH[3]); }
}
function chargerCable(x0, x1, y, th, t) {                // câble de chargeur : gaine blanche, prise à droite
  const cap = 40;
  for (let x = x0; x < x1 - cap; x++) {
    const o = Math.round(Math.sin(x * 0.02) * 1.5), yy = y + o;
    R(x, yy - th / 2, 1, th, WH[0]); R(x, yy - th / 2, 1, 4, WH[3]); R(x, yy - th / 2 + 4, 1, 4, WH[2]); R(x, yy + th / 2 - 6, 1, 6, ST[5]); R(x, yy + th / 2 - 2, 1, 2, ST[3]);
  }
  const xe = x1 - cap;
  R(xe, y - th / 2 - 4, 22, th + 8, '#14110e'); R(xe, y - th / 2 - 4, 22, 3, ST[3]);                  // manchon
  R(xe + 22, y - 11, 22, 22, ST[6]); R(xe + 22, y - 11, 22, 3, ST[7]); R(xe + 22, y + 8, 22, 3, ST[4]); R(xe + 26, y - 5, 14, 10, '#05040f'); R(xe + 28, y - 1, 10, 2, ST[4]);
}
// train vu de face dans un tunnel. z : grandeur (0,5 → 1), brake : étincelles
function drawTunnel(t) {
  L.setTransform(1, 0, 0, 1, 0, 0);
  R(0, 0, LW, LH, NI[0]);
  // murs carrelés de chaque côté, lampes
  for (const sd of [-1, 1]) for (let y = 0; y < LH; y += 12) for (let x = 0; x < 46; x += 18) {
    const xx = sd < 0 ? x : LW - 18 - x; R(xx, y, 17, 11, ((x + y / 12) % 2 ? ST[2] : ST[1])); R(xx, y, 17, 1, ST[3]); R(xx, y, 1, 11, ST[3]);
  }
  for (let i = 0; i < 6; i++) { const y = 30 + i * 70, w = 6 + (i % 3); for (const sd of [-1, 1]) { const x = sd < 0 ? 52 : LW - 52 - w; R(x, y, w, 3, AM[10]); R(x - 1, y - 1, w + 2, 5, AM[4]); } }
  // voie : deux rails qui fuient, traverses
  for (const [a, b] of [[-0.55, 55], [0.55, 215]]) lineP(135 + a * 25, 235, b, LH, ST[5], 2);
  for (let k = 1; k < 14; k++) { const q = k / 14, y = 235 + 245 * q * q, w = 40 + 200 * q * q; R(135 - w / 2, y, w, 2, WO[2]); }
}
function drawTrainFront(cx, cy, z, t, o = {}) {
  const w = 120 * z, h = 104 * z, x = cx - w / 2, y = cy - h / 2;
  // lueur des phares
  rgrad(cx, cy + h * 0.15, 8, 190, [[0, 'rgba(255,240,180,0.85)'], [0.25, 'rgba(255,214,120,0.4)'], [1, 'rgba(255,200,100,0)']], 1, 'lighter');
  R(x - 2, y - 2, w + 4, h + 4, '#05040f'); R(x, y, w, h, ST[4]); R(x, y, w, 5 * z, ST[7]); R(x, y, 4 * z, h, ST[6]); R(x + w - 4 * z, y, 4 * z, h, ST[2]);
  R(x, y + h * 0.78, w, 6 * z, RD[3]); R(x, y + h * 0.78, w, 2 * z, RD[5]);                                // bande rouge
  R(x + 12 * z, y + 12 * z, w - 24 * z, 42 * z, NI[0]); R(x + 12 * z, y + 12 * z, w - 24 * z, 3 * z, NI[4]);    // pare-brise
  R(x + 16 * z, y + 18 * z, 22 * z, 2, ST[3]); R(x + w / 2 - 1, y + 12 * z, 2, 42 * z, ST[3]);
  R(x + 34 * z, y + 4 * z, w - 68 * z, 6 * z, AM[8]);                                                        // girouette
  for (const sd of [-1, 1]) { const hx = cx + sd * 44 * z, hy = y + h * 0.66; disc(hx, hy, Math.round(8 * z), '#05040f'); disc(hx, hy, Math.round(7 * z), AM[10]); disc(hx, hy, Math.round(4 * z), WH[3]); }
  R(x + 6 * z, y + h * 0.9, w - 12 * z, 6 * z, ST[2]);
  if (o.sparks) for (let i = 0; i < 16; i++) { const a = (i * 2.4 + t * 40) % TAU, d = 6 + ((i * 17 + t * 150) % 34); px(cx + Math.cos(a) * d * 1.6, y + h * 0.96 + Math.sin(a) * d * 0.5 - 4, i % 2 ? YE[3] : AM[8]); }
}
// héros de face : bras en l'air (poignets sur un fil) ou bras écartés. pose : { arms: 'up' | 'out', trem }
function heroFront(cx, cy, s, t, o = {}) {
  const arms = o.arms || 'up', tr = o.trem ?? 0, ll = lightLocal(0);
  layerBegin(); const c = Y; c.setTransform(s, 0, 0, s, cx, cy);
  const red = RD[3], redS = RD[1], blue = BL[2], blueS = BL[0];
  const part = (pts, lit, dark, off, bl) => { const p = polyPath(pts); shade(c, p, lit, dark, ll, off, bl); return p; };
  // jambes
  part(limb([[-5, 0], [-6.5, 15], [-7.5, 29]], [8, 7, 6]), blue, blueS, 3, 1.3); part(limb([[5, 0], [6.5, 15], [7.5, 29]], [8, 7, 6]), blue, blueS, 3, 1.3);
  part(limb([[-7.5, 25], [-7.7, 31], [-10, 33]], [7, 7, 5]), red, redS, 2, 1); part(limb([[7.5, 25], [7.7, 31], [10, 33]], [7, 7, 5]), red, redS, 2, 1);
  // torse
  part([[-13, -30], [13, -30], [11, -10], [8, 2], [-8, 2], [-11, -10]], red, redS, 4, 1.8);
  part([[-10.5, -12], [10.5, -12], [8, 2], [-8, 2]], blue, blueS, 3, 1.4);
  c.strokeStyle = RD[0]; c.lineWidth = 0.6; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, -12); c.moveTo(-12, -24); c.lineTo(12, -24); c.moveTo(-11, -18); c.quadraticCurveTo(0, -15, 11, -18); c.moveTo(-6, -30); c.lineTo(-8, -12); c.moveTo(6, -30); c.lineTo(8, -12); c.stroke();
  c.fillStyle = '#05040f'; c.beginPath(); c.ellipse(0, -20, 2.4, 3.2, 0, 0, TAU); c.fill(); c.lineWidth = 0.7; c.strokeStyle = '#05040f'; c.beginPath(); c.moveTo(-4, -23); c.lineTo(4, -17); c.moveTo(-4, -17); c.lineTo(4, -23); c.moveTo(-4.5, -20); c.lineTo(4.5, -20); c.stroke();
  // bras
  for (const sd of [-1, 1]) {
    const sh = [sd * 12, -27], tm = Math.sin(t * 38 + sd) * tr, tm2 = Math.cos(t * 41 + sd) * tr;
    let el, hd;
    if (arms === 'up') { el = [sd * 17 + tm, -45 + tm2]; hd = [sd * 5 + tm, -66 + tm2 * 1.4]; } else if (arms === 'down') { el = [sd * 17, -10]; hd = [sd * 13 + tm, 6]; } else { el = [sd * 27, -27 + 2]; hd = [sd * 41, -27 + 4 + tm]; }
    part(limb([sh, el, hd], [6.5, 5.6, 5]), red, redS, 2, 1.2);
  }
  // tête
  { const p = new Path2D(); p.ellipse(0, -39, 9.6, 10.6, 0, 0, TAU); shade(c, p, red, redS, ll, 4, 1.5);
    c.strokeStyle = RD[0]; c.lineWidth = 0.6; c.beginPath(); c.moveTo(0, -49.6); c.lineTo(0, -28.4); c.moveTo(-9.4, -39); c.quadraticCurveTo(0, -36, 9.4, -39); c.moveTo(-6.6, -46.5); c.quadraticCurveTo(0, -42, 6.6, -46.5); c.moveTo(-6.4, -32); c.quadraticCurveTo(0, -35, 6.4, -32); c.stroke(); }
  layerEnd();
  const T = (x, y) => [cx + x * s, cy + y * s]; L.setTransform(1, 0, 0, 1, 0, 0);
  for (const sd of [-1, 1]) {
    const pts = [[sd * 8.2, -42], [sd * 1.2, -38.8], [sd * 1.8, -35.4], [sd * 7.6, -37.2]].map(p => T(p[0], p[1]));
    const cx0 = pts.reduce((a, p) => a + p[0], 0) / 4, cy0 = pts.reduce((a, p) => a + p[1], 0) / 4;
    poly(pts.map(p => [cx0 + (p[0] - cx0) * 1.3, cy0 + (p[1] - cy0) * 1.3]), '#05040f'); poly(pts, WH[3]);
  }
  return T;
}

// versions verticales (posées sur une règle) : fil de soie, spaghetti, câble de chargeur ; y1 = bas, h = hauteur, x0 = bord gauche
function spaghettiV(x0, y1, h, th, g, t) {
  const hh = Math.round(h * g);
  for (let y = y1 - hh; y < y1; y++) { const o = Math.round(Math.sin(y * 0.045 + 1) * 1.0);
    R(x0 + o, y, th, 1, AM[8]); R(x0 + o, y, 3, 1, AM[10]); R(x0 + o + th - 3, y, 3, 1, AM[6]);
    if ((y * 7 + 3) % 11 < 2) px(x0 + o + 5, y, AM[9]); if ((y * 5) % 13 < 2) px(x0 + o + th - 6, y, AM[7]); }
}
function silkV(x0, y1, h, th, g, t) {
  const hh = Math.round(h * g);
  for (let y = y1 - hh; y < y1; y++) { const o = Math.round(Math.sin(y * 0.03 + 2) * 0.7);
    R(x0 + o, y, th, 1, CY[2]); R(x0 + o + 2, y, th - 4, 1, CY[3]); R(x0 + o + 5, y, Math.max(2, th - 10), 1, WH[3]); R(x0 + o, y, 1, 1, CY[1]); }
  for (let k = 0; k < 3; k++) { const gy = y1 - ((t * 60 + k * 70) % Math.max(10, hh)); R(x0 + 4, gy, 3, 3, WH[3]); }
}
function chargerV(x0, y1, h, th, g, t) {                 // câble vertical, prise USB vers le haut
  const hh = Math.round(h * g), top = y1 - hh, cap = 44;
  for (let y = top + cap; y < y1; y++) { const o = Math.round(Math.sin(y * 0.02) * 1.5);
    R(x0 + o, y, th, 1, WH[0]); R(x0 + o, y, 4, 1, WH[3]); R(x0 + o + 4, y, 4, 1, WH[2]); R(x0 + o + th - 6, y, 6, 1, ST[5]); R(x0 + o + th - 2, y, 2, 1, ST[3]); }
  if (hh > cap + 4) {
    const cx = x0 + th / 2, y0 = top;
    R(cx - 14, y0 + 20, 28, 24, '#14110e'); R(cx - 14, y0 + 20, 3, 24, ST[3]);
    R(cx - 11, y0, 22, 20, ST[6]); R(cx - 11, y0, 22, 3, ST[7]); R(cx - 11, y0, 3, 20, ST[7]); R(cx + 8, y0, 3, 20, ST[4]); R(cx - 5, y0 + 4, 10, 12, '#05040f'); R(cx - 1, y0 + 6, 2, 8, ST[4]);
  }
}
