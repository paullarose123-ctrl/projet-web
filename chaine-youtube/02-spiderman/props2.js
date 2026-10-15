'use strict';
// ───────────────────────── accessoires, suite : fenêtre sous la pluie, bactéries, ver à soie, cuves, cocon ─────────────────────────
// agrandit un pictogramme (dessiné au centre d'un carré de 44 px) en gros pixels : cartes-titres
function bigIcon(fn, cx, cy, k) {
  const sz = 44, save = L.getImageData(0, 0, sz, sz);
  L.setTransform(1, 0, 0, 1, 0, 0); L.fillStyle = '#ff00ff'; L.fillRect(0, 0, sz, sz);
  fn(22, 22);
  const d = L.getImageData(0, 0, sz, sz).data;
  L.putImageData(save, 0, 0);
  for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) {
    const i = (y * sz + x) * 4; if (d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 255) continue;
    L.fillStyle = `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`; L.fillRect(Math.round(cx + (x - 22) * k - k / 2), Math.round(cy + (y - 22) * k - k / 2), k, k);
  }
}
// fenêtre de labo : ciel de nuit, lumières floues de la ville, pluie, gouttes qui coulent, éclair
function drawWindow(x, y, w, h, t, o = {}) {
  R(x - 8, y - 8, w + 16, h + 16, WO[1]); R(x - 6, y - 6, w + 12, h + 12, WO[4]); R(x - 6, y - 6, w + 12, 2, WO[6]);
  L.save(); L.beginPath(); L.rect(x, y, w, h); L.clip();
  vgrad(x, y, w, h, [[0, NI[1]], [0.55, NI[3]], [1, DU[3]]]);
  const r = rng(12);
  for (let i = 0; i < 46; i++) { const bx = x + r() * w, by = y + h * 0.45 + r() * h * 0.55, br = 2 + r() * 4; L.globalAlpha = 0.35; disc(bx, by, Math.round(br), r() < 0.7 ? AM[7] : CY[3]); L.globalAlpha = 1; }
  if (o.rain !== false) {
    const rr = rng(33);
    for (let i = 0; i < 70; i++) { const x0 = x + rr() * (w + 30) - 10, v = 260 + rr() * 200, ph = rr() * 5, yy = y + (((rr() * h + (t + ph) * v) % (h + 30)) - 10); lineP(x0, yy, x0 - 3, yy - 9, rr() < 0.4 ? CY[4] : CY[2]); }
  }
  if (o.flash) { L.globalAlpha = clamp(o.flash) * 0.85; R(x, y, w, h, '#cfd8ff'); L.globalAlpha = 1; }
  L.restore();
  // meneaux
  R(x + (w >> 1) - 2, y, 4, h, WO[3]); R(x + (w >> 1) - 2, y, 1, h, WO[5]); R(x, y + (h >> 1) - 2, w, 4, WO[3]); R(x, y + (h >> 1) - 2, w, 1, WO[5]);
  // gouttes sur la vitre (devant les meneaux)
  const rg = rng(71);
  for (let i = 0; i < 14; i++) { const gx = x + 6 + rg() * (w - 12), g0 = rg() * 6, gy = y + ((t * (10 + rg() * 20) + g0 * 40) % (h - 8)) + 3; ell(gx, gy, 1, 2, CY[4]); R(gx, gy - 12, 1, 10, CY[2]); px(gx, gy - 2, WH[3]); }
  R(x - 10, y + h + 6, w + 20, 6, WO[5]); R(x - 10, y + h + 6, w + 20, 1, WO[6]); R(x - 10, y + h + 11, w + 20, 2, WO[1]);
}
// bactérie (bâtonnet) : x, y centre, ang, taille k
function drawBacterium(x, y, ang, k, t, ph) {
  const c = Math.cos(ang), s = Math.sin(ang), len = 9 * k, w = 3.4 * k;
  for (let i = -len; i <= len; i++) {
    const px0 = x + c * i, py0 = y + s * i, edge = Math.abs(i) > len - 2.5 ? 0.6 : 1;
    disc(px0, py0, Math.max(1, Math.round(w * edge)), GR[1]); 
  }
  for (let i = -len + 1; i <= len - 1; i += 1) disc(x + c * i - s * 0.5, y + s * i + c * 0.5, Math.max(1, Math.round(w * 0.65)), GR[3]);
  for (let i = -len + 2; i <= len - 2; i += 1) px(x + c * i - s * w * 0.35, y + s * i + c * w * 0.35, GR[5]);
  // flagelle ondulante
  const fx = x - c * (len + 1), fy = y - s * (len + 1);
  for (let i = 0; i < 9; i++) px(fx - c * i * 1.2 + s * Math.sin(t * 9 + i * 0.9 + ph) * 2, fy - s * i * 1.2 - c * Math.sin(t * 9 + i * 0.9 + ph) * 2, GR[5]);
}
// ver à soie sur une feuille de mûrier. x, y : centre de la tête (le ver va vers la droite)
function drawLeaf(x, y, w, h, t) {
  const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU; pts.push([x + Math.cos(a) * w * (1 + 0.08 * Math.sin(a * 5)), y + Math.sin(a) * h * (1 + 0.08 * Math.cos(a * 4))]); }
  poly(pts, GR[3]); poly(pts.map(p => [lerp(x, p[0], 0.92), lerp(y, p[1], 0.92) - 1]), GR[4]);
  lineP(x - w, y, x + w, y, GR[2], 2); for (let i = -4; i <= 4; i++) { if (!i) continue; lineP(x + i * w / 5, y, x + i * w / 5 + 8, y - h * 0.85, GR[2], 1); lineP(x + i * w / 5, y, x + i * w / 5 + 8, y + h * 0.85, GR[2], 1); }
}
function drawWorm(x, y, t, s = 1) {
  const n = 9;
  for (let i = n - 1; i >= 0; i--) {
    const px0 = x - i * 8 * s, py0 = y + Math.sin(t * 5 - i * 0.9) * 2.2 * s, r = Math.max(3, rd((7.5 - i * 0.35) * s));
    disc(px0, py0 + 1, r, WH[0]); disc(px0, py0, r, WH[1]); disc(px0 - 1, py0 - 2, Math.max(2, r - 3), WH[2]); R(px0 + r - 2, py0 - r + 1, 1, r * 2 - 2, WH[0]);
    px(px0, py0 + r, WO[3]);
  }
  disc(x + 4 * s, y - 1, 5 * s, WH[1]); disc(x + 3 * s, y - 2, 4 * s, WH[2]); R(x + 6 * s, y - 2, 2, 2, '#05040f'); R(x + 9 * s, y + 1, 2, 2, WO[3]);
  // fil de soie qui sort de la bouche
  lineP(x + 10 * s, y + 2, x + 30 * s, y - 14 + Math.sin(t * 6) * 3, WH[3], 1);
}
// cuve de bioréacteur en inox avec hublot (bulles), x, y = bas au centre
function drawVat(x, y, w, h, t, tone = 0) {
  const x0 = x - w / 2;
  R(x0 - 1, y - h - 1, w + 2, h + 2, '#05040f'); R(x0, y - h, w, h, ST[4]); R(x0, y - h, w, 3, ST[7]); R(x0, y - h, 5, h, ST[6]); R(x0 + w - 6, y - h, 6, h, ST[2]);
  ell(x, y - h, w / 2, 7, ST[5]); ell(x, y - h - 1, w / 2 - 2, 5, ST[7]);
  for (let yy = y - h + 14; yy < y; yy += 22) R(x0, yy, w, 2, ST[3]);
  // hublot
  const wy = y - h * 0.55, wr = Math.max(8, Math.round(w * 0.22));
  disc(x, wy, wr + 2, ST[2]); disc(x, wy, wr, tone ? '#0a2a18' : '#0a1a26'); 
  L.save(); L.beginPath(); L.arc(x, wy, wr, 0, TAU); L.clip();
  R(x - wr, wy - 2, wr * 2, wr + 4, tone ? GR[3] : CY[2]); R(x - wr, wy - 2, wr * 2, 2, WH[3]);
  for (let i = 0; i < 7; i++) { const bx = x - wr + 3 + ((i * 37) % (wr * 2 - 5)), by = wy + wr - ((t * (18 + i * 5) + i * 13) % (wr * 1.7)); disc(bx, by, 1 + (i % 2), WH[3]); }
  L.restore();
  px(x - wr * 0.5, wy - wr * 0.5, WH[3]);
  R(x - 8, y - 14, 16, 8, ST[2]); R(x - 6, y - 12, 12, 4, AM[7]);
  R(x0 + w, y - h + 10, 18, 4, ST[5]); R(x0 + w + 14, y - h + 10, 4, 40, ST[5]);                       // tuyau
}
// cocon : p de 0 à 1, silhouette en bandes de fil qui monte du bas ; (cx, cy) = pieds au centre, s = échelle du scientifique
function drawCocoon(cx, cy, s, p, t) {
  const top = cy - 90 * s, hgt = (cy - top) * clamp(p), yTop = cy - hgt;
  const hw = y => { const k = (cy - y) / (cy - top); return (16 + 7 * Math.sin(Math.min(1, k * 1.15) * Math.PI * 0.9) + 1.5) * s; };
  for (let y = Math.round(yTop); y < cy; y++) {
    const w = hw(y), fill = clamp(p * 1.4 - (cy - y) / (cy - top) * 0.4);
    L.fillStyle = WH[1]; L.fillRect(Math.round(cx - w), y, Math.round(w * 2), 1);
    L.fillStyle = WH[0]; L.fillRect(Math.round(cx + w * 0.45), y, Math.round(w * 0.55), 1);
    L.fillStyle = WH[3]; L.fillRect(Math.round(cx - w * 0.75), y, Math.max(1, Math.round(w * 0.22)), 1);
    L.fillStyle = WH[0]; L.fillRect(Math.round(cx - w), y, 1, 1); L.fillRect(Math.round(cx + w) - 1, y, 1, 1);
    if (((y + (t * 14) | 0) % 5) === 0) { L.fillStyle = ST[6]; L.fillRect(Math.round(cx - w + 1), y, Math.round(w * 2) - 2, 1); }
  }
  // brin qui s'échappe du flacon rangé sur l'étagère (à droite) et vient s'enrouler en haut du cocon
  const hy = yTop;
  if (p > 0.02) { lineP(233, 118, cx + hw(hy) * 0.9, hy + 2, WH[3], 1); lineP(234, 118, cx + hw(hy) * 0.9 + 1, hy + 2, CY[2], 1); }
}
