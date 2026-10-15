'use strict';
// ───────────────────────── planches (ambre sur noir) et pictogrammes ─────────────────────────
// pictogrammes dessinés au pixel près, centrés en (cx, cy), environ 18 px de large
function iconBurger(cx, cy) {
  ell(cx, cy - 3, 8, 4, AM[7]); R(cx - 6, cy - 6, 6, 1, AM[9]); px(cx - 3, cy - 4, AM[10]); px(cx + 2, cy - 5, AM[10]); px(cx + 4, cy - 3, AM[10]); px(cx - 1, cy - 2, AM[10]);
  R(cx - 8, cy, 17, 1, AM[5]);
  R(cx - 9, cy + 1, 19, 2, GR[4]); for (let i = -9; i < 10; i += 3) px(cx + i, cy + 3, GR[3]);
  R(cx - 8, cy + 3, 17, 1, RD[4]);
  R(cx - 8, cy + 4, 17, 3, WO[2]); R(cx - 7, cy + 4, 14, 1, WO[4]);
  R(cx - 8, cy + 7, 17, 2, AM[6]); R(cx - 7, cy + 9, 15, 1, AM[4]);
}
function iconSpray(cx, cy) {
  R(cx - 10, cy - 3, 9, 7, ST[3]); R(cx - 10, cy - 3, 9, 1, ST[6]); R(cx - 10, cy - 3, 1, 7, ST[5]); R(cx - 10, cy + 3, 9, 1, ST[1]);
  R(cx - 8, cy - 1, 4, 2, RD[3]);
  R(cx - 1, cy - 1, 3, 3, ST[6]);
  for (const [dx, dy, c] of [[4, 0, CY[4]], [6, -1, CY[3]], [8, -1, CY[4]], [9, 0, CY[3]], [10, 2, CY[4]], [7, 3, CY[3]], [11, 5, CY[3]], [8, 6, CY[4]], [5, 5, CY[2]]]) px(cx + dx, cy + dy, c);
}
function iconCloud(cx, cy) {
  ell(cx - 4, cy - 2, 5, 4, ST[6]); ell(cx + 3, cy - 3, 6, 5, ST[7]); R(cx - 9, cy - 1, 19, 4, ST[6]); R(cx - 9, cy + 2, 19, 2, ST[5]);
  R(cx - 8, cy + 3, 17, 1, ST[4]);
  for (const dx of [-6, -1, 4, 8]) { lineP(cx + dx, cy + 6, cx + dx - 1, cy + 8, CY[3]); }
  px(cx + 2, cy + 9, CY[4]); px(cx - 4, cy + 9, CY[4]);
}
function iconThread(cx, cy) {
  R(cx - 8, cy - 9, 16, 3, WO[5]); R(cx - 8, cy - 9, 16, 1, WO[6]); R(cx - 8, cy + 7, 16, 3, WO[4]);
  R(cx - 6, cy - 6, 12, 13, CY[2]); for (let y = cy - 5; y < cy + 7; y += 2) { R(cx - 6, y, 12, 1, WH[3]); R(cx - 6, y + 1, 12, 1, CY[3]); }
  R(cx - 6, cy - 6, 2, 13, CY[1]); R(cx + 4, cy - 6, 2, 13, CY[4]); lineP(cx + 6, cy + 3, cx + 11, cy + 8, WH[3], 1);
}
function iconMask(cx, cy) {
  ell(cx, cy, 8, 9, RD[1]); ell(cx, cy, 7, 8, RD[3]); ell(cx - 2, cy - 3, 4, 3, RD[5]);
  for (const sd of [-1, 1]) { poly([[cx + sd * 6, cy - 3], [cx + sd * 1, cy - 1], [cx + sd * 1.5, cy + 2], [cx + sd * 5.5, cy + 1]], '#05040f'); poly([[cx + sd * 5.2, cy - 2.2], [cx + sd * 1.8, cy - 0.7], [cx + sd * 2.1, cy + 1.1], [cx + sd * 5, cy + 0.3]], WH[3]); }
  lineP(cx, cy - 8, cx, cy + 8, RD[0], 1); lineP(cx - 6, cy + 5, cx + 6, cy + 5, RD[0], 1);
}
function iconBolt(cx, cy) { poly([[cx + 2, cy - 8], [cx - 4, cy + 1], [cx, cy + 1], [cx - 2, cy + 9], [cx + 5, cy - 2], [cx + 1, cy - 2]], YE[2]); }
// case d'inventaire 24 × 24 avec un pictogramme et, si besoin, une pastille ✗ ou ✓
function slot(x, y, kind, state = null, p = 1) {
  if (p <= 0) return;
  R(x - 1, y - 1, 26, 26, '#05040f'); R(x, y, 24, 24, ST[3]); R(x + 1, y + 1, 22, 22, NI[1]); R(x + 1, y + 1, 22, 1, NI[3]);
  const cx = x + 12, cy = y + 12;
  if (kind === 'burger') iconBurger(cx, cy); else if (kind === 'spray') iconSpray(cx, cy); else if (kind === 'cloud') iconCloud(cx, cy); else if (kind === 'thread') iconThread(cx, cy);
  if (state) mark(x + 21, y + 21, state, p, 6);
}

// fond de planche : presque noir, lueur ambre au centre, poussières
function plateBG(t, o = {}) {
  L.setTransform(1, 0, 0, 1, 0, 0);
  vgrad(0, 0, LW, LH, [[0, '#0a0503'], [1, '#100804']]);
  rgrad(LW / 2, o.glowY ?? 210, 10, 250, [[0, 'rgba(160,90,26,0.30)'], [1, 'rgba(160,90,26,0)']], o.glow ?? 1);
  const r = rng(9);
  for (let i = 0; i < 46; i++) { const x = (r() * 270 + t * (1 + r() * 3)) % 270, y = (r() * 480 + t * (2 + r() * 3) * (i % 2 ? -1 : 1) + 480) % 480; px(x, y, r() < 0.3 ? AM[4] : AM[2]); }
}
// ellipse remplie d'une matière liquide qui ondule (gel) : trois tons selon un bruit de sinus
function gelFill(cx, cy, rx, ry, t, cols, o = {}) {
  cx = rd(cx); cy = rd(cy);
  for (let y = -ry; y <= ry; y++) {
    const hw = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.5))));
    for (let x = -hw; x <= hw; x++) {
      const n = Math.sin(x * 0.33 + t * 1.7) + Math.sin(y * 0.27 - t * 1.3) + Math.sin((x + y) * 0.19 + t * 0.9) + (o.lit ? (-x / rx) * 0.8 - (y / ry) * 0.4 : 0);
      L.fillStyle = n > 1.15 ? cols[2] : n > -0.25 ? cols[1] : cols[0]; L.fillRect(cx + x, cy + y, 1, 1);
    }
  }
}
function ellRing(cx, cy, rx, ry, col, th = 1) {
  for (let a = 0; a < 720; a++) { const q = a * Math.PI / 360; const x = cx + Math.cos(q) * rx, y = cy + Math.sin(q) * ry; for (let k = 0; k < th; k++) px(x - Math.cos(q) * k, y - Math.sin(q) * k, col); }
}
// petite protéine : trait en zigzag (pelote) ou droit (aligné). q : 0 = pelote, 1 = aligné
function protein(x, y, ang, q, col, len = 5) {
  const c = Math.cos(ang), s = Math.sin(ang);
  let px0 = x - c * len / 2, py0 = y - s * len / 2;
  for (let i = 1; i <= 4; i++) {
    const k = i / 4, zz = (i % 2 ? 1 : -1) * (1 - q) * 2.2;
    const qx = x + c * (k - 0.5) * len - s * zz, qy = y + s * (k - 0.5) * len + c * zz;
    lineP(px0, py0, qx, qy, col); px0 = qx; py0 = qy;
  }
}

function ditherEll(cx, cy, rx, ry, col, dens) {
  cx = rd(cx); cy = rd(cy); L.fillStyle = col;
  for (let y = -ry; y <= ry; y++) {
    const hw = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.5))));
    for (let x = -hw; x <= hw; x++) { const xx = cx + x, yy = cy + y; if (BAYER[(yy & 3) * 4 + (xx & 3)] < dens) L.fillRect(xx, yy, 1, 1); }
  }
}

// ───────────────────────── microscope : disque, trois grossissements, fondu en zoom ─────────────────────────
const MV = { cx: 135, cy: 205, r: 122 };
const snapA = mkCanvas(), SA = snapA.getContext('2d', { willReadFrequently: true });
function viewportMask(o = {}) {                       // noir hors du disque, anneau de verre
  const { cx, cy, r } = MV;
  L.setTransform(1, 0, 0, 1, 0, 0); L.fillStyle = '#05040f';
  for (let y = 0; y < LH; y++) {
    const dy = y - cy, h2 = r * r - dy * dy;
    if (h2 <= 0) { L.fillRect(0, y, LW, 1); continue; }
    const hw = Math.floor(Math.sqrt(h2)); L.fillRect(0, y, Math.max(0, cx - hw), 1); L.fillRect(cx + hw + 1, y, LW, 1);
  }
  ellRing(cx, cy, r, r, ST[3], 2); ellRing(cx, cy, r + 1, r + 1, ST[1], 1);
  for (let a = 200; a < 260; a += 1) { const q = a * Math.PI / 180; px(cx + Math.cos(q) * (r - 2), cy + Math.sin(q) * (r - 2), ST[7]); }
  for (let a = 20; a < 60; a += 1) { const q = a * Math.PI / 180; px(cx + Math.cos(q) * (r - 2), cy + Math.sin(q) * (r - 2), ST[5]); }
}
function fieldBG(t, c0, c1) {                         // fond du champ du microscope + vignette de bord
  const { cx, cy, r } = MV;
  L.setTransform(1, 0, 0, 1, 0, 0);
  const g = L.createRadialGradient(cx, cy, 10, cx, cy, r); g.addColorStop(0, c0); g.addColorStop(1, c1); L.fillStyle = g; L.fillRect(cx - r, cy - r, r * 2, r * 2);
}
function stageThread(t) {                             // ×100 : un fil qui traverse le champ, poussières
  fieldBG(t, NI[5], NI[3]);
  const r = rng(21);
  for (let i = 0; i < 40; i++) { const x = (r() * 300 + t * (2 + r() * 5)) % 300 - 15, y = r() * 300 + 55, k = r(); if (k < 0.25) ditherEll(x, y, 5 + r() * 6, 5 + r() * 6, NI[7], 0.3); else px(x, y, k < 0.6 ? NI[2] : NI[8]); }
  const pts = []; for (let i = 0; i <= 24; i++) { const s = i / 24; pts.push([lerp(10, 262, s), lerp(330, 90, s) + Math.sin(s * 9 + t * 1.2) * 3]); }
  const poly1 = limb(pts, pts.map(() => 11)); poly(poly1, CY[1]);
  poly(limb(pts.map(p => [p[0] + 0.5, p[1] - 0.5]), pts.map(() => 8)), CY[3]); poly(limb(pts.map(p => [p[0] + 0.5, p[1] - 1.2]), pts.map(() => 4)), WH[3]);
  for (let i = 1; i < pts.length; i += 2) px(pts[i][0] + 3, pts[i][1] + 3, CY[0]);
}
function stageFibrils(t) {                            // ×10 000 : le fil est un faisceau de fibrilles parallèles
  fieldBG(t, NI[4], NI[2]);
  for (let i = 0; i < 6; i++) {
    const x0 = 28 + i * 40, wob = Math.sin(t * 0.8 + i * 1.3) * 2;
    for (let y = 70; y < 345; y++) {
      const x = x0 + Math.sin(y * 0.03 + i + t * 0.6) * 3 + wob;
      L.fillStyle = CY[0]; L.fillRect(Math.round(x), y, 28, 1);
      L.fillStyle = CY[1]; L.fillRect(Math.round(x) + 2, y, 24, 1);
      L.fillStyle = CY[2]; L.fillRect(Math.round(x) + 5, y, 17, 1);
      L.fillStyle = (y + i * 3) % 14 < 2 ? CY[3] : CY[4]; L.fillRect(Math.round(x) + 8, y, 4, 1);
    }
  }
}
const BRICK = { w: 30, h: 16 };
function brick(x, y, hi) {                            // brique rigide (bleue), x, y = centre
  x = rd(x); y = rd(y); const hw = BRICK.w / 2, hh = BRICK.h / 2;
  R(x - hw - 1, y - hh - 1, BRICK.w + 2, BRICK.h + 2, '#05040f'); R(x - hw, y - hh, BRICK.w, BRICK.h, hi ? CY[3] : BL[2]);
  R(x - hw, y - hh, BRICK.w, 2, hi ? CY[4] : BL[4]); R(x - hw, y - hh, 2, BRICK.h, hi ? CY[4] : BL[3]); R(x - hw, y + hh - 2, BRICK.w, 2, hi ? CY[1] : BL[0]); R(x + hw - 2, y - hh, 2, BRICK.h, hi ? CY[1] : BL[0]);
  for (let i = -hw + 5; i < hw - 3; i += 5) px(x + i, y, hi ? WH[3] : BL[3]);
  for (let i = -hw + 7; i < hw - 3; i += 5) px(x + i, y + 3, hi ? CY[4] : BL[3]);
}
function chain(x0, y0, x1, y1, amp, ph, hi) {         // chaîne souple (orange) en zigzag, de plus en plus droite quand elle s'étire
  const n = 8, dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  let prev = [x0, y0];
  for (let i = 1; i <= n; i++) { const k = i / n, w = (i === n ? 0 : (i % 2 ? 1 : -1) * amp), q = [x0 + dx * k + nx * w, y0 + dy * k + ny * w]; lineP(prev[0] + 1, prev[1] + 1, q[0] + 1, q[1] + 1, AM[3], 2); lineP(prev[0], prev[1], q[0], q[1], hi ? AM[10] : AM[7], 2); prev = q; }
}
// réseau de briques et de chaînes. s : étirement 0..1, hiB / hiC : surbrillance briques / chaînes
function molecules(t, s, hiB, hiC, o = {}) {
  fieldBG(t, NI[4], NI[1]);
  const { cx, cy } = MV, cols = [-84, -28, 28, 84], rows = 5, ch = lerp(15, 36, s), pitch = BRICK.h + ch, amp = lerp(8, 1.5, s);
  const jit = (i, j, k) => Math.sin(t * 3 + i * 2.1 + j * 1.3 + k) * 0.5 * (1 - s * 0.5);
  // liaisons latérales entre colonnes
  for (let j = 0; j < rows; j++) { const y = cy + (j - 2) * pitch; for (let i = 0; i < 3; i++) chain(cx + cols[i] + BRICK.w / 2, y + jit(i, j, 1), cx + cols[i + 1] - BRICK.w / 2, y + jit(i + 1, j, 1), 4, i, hiC); }
  // chaînes verticales + briques
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < rows - 1; j++) { const y0 = cy + (j - 2) * pitch + BRICK.h / 2, y1 = cy + (j - 1) * pitch - BRICK.h / 2; chain(cx + cols[i] + jit(i, j, 0), y0, cx + cols[i] + jit(i, j + 1, 0), y1, amp, j, hiC); }
    for (let j = 0; j < rows; j++) brick(cx + cols[i] + jit(i, j, 0), cy + (j - 2) * pitch, hiB);
  }
}
// fondu en zoom : l'ancienne image grossit et se dissout (tramage) sur la nouvelle
function zoomThrough(drawA, drawB, k, tA, tB) {
  clearL(); drawA(tA); SA.clearRect(0, 0, LW, LH); SA.drawImage(low, 0, 0);
  clearL(); drawB(tB); const B = L.getImageData(0, 0, LW, LH), b = B.data;
  clearL(); const z = 1 + eio(k) * 3.2; L.imageSmoothingEnabled = false; L.drawImage(snapA, MV.cx - MV.cx * z, MV.cy - MV.cy * z, LW * z, LH * z);
  const A = L.getImageData(0, 0, LW, LH), a = A.data, keep = 1 - clamp((k - 0.15) / 0.7);
  for (let y = 0, i = 0; y < LH; y++) for (let x = 0; x < LW; x++, i += 4) { if (!(keep > BAYER[(y & 3) * 4 + (x & 3)])) { a[i] = b[i]; a[i + 1] = b[i + 1]; a[i + 2] = b[i + 2]; } }
  L.putImageData(A, 0, 0);
}

// ───────────────────────── acier contre soie : câbles, charges, coupes, balance ─────────────────────────
function cable(x, y0, y1, w, kind, t) {                // câble vertical centré en x
  x = rd(x); const h = y1 - y0, x0 = x - (w >> 1);
  if (kind === 'steel') {
    R(x0, y0, w, h, ST[5]); R(x0, y0, 1, h, ST[3]); R(x0 + w - 1, y0, 1, h, ST[2]); R(x0 + 1, y0, 1, h, ST[7]);
    for (let y = y0; y < y1; y += 4) lineP(x0, y + 3, x0 + w - 1, y, ST[7], 1);
  } else {
    R(x0, y0, w, h, CY[2]); R(x0 + 1, y0, w - 2, h, CY[3]); R(x - 1, y0, 2, h, WH[3]);
    for (let k = 0; k < 4; k++) { const y = y0 + ((t * 55 + k * h / 4) % h); px(x - 1, y, CY[4]); px(x, y - 1, WH[3]); px(x, y + 1, CY[4]); }
  }
}
function weightBlock(cx, top, w, h, label, hot = 0) {  // charge suspendue, anneau en haut
  cx = rd(cx);
  R(cx - 3, top - 5, 6, 5, '#05040f'); R(cx - 2, top - 4, 4, 4, ST[6]); R(cx - 1, top - 3, 2, 3, '#05040f');
  R(cx - w / 2 - 1, top - 1, w + 2, h + 2, '#05040f'); R(cx - w / 2, top, w, h, ST[3]); R(cx - w / 2, top, w, 3, ST[6]); R(cx - w / 2, top, 3, h, ST[5]); R(cx + w / 2 - 3, top, 3, h, ST[1]); R(cx - w / 2, top + h - 3, w, 3, ST[1]);
  if (label) ptextC(label, cx, top + (h >> 1) - 3, hot ? RD[5] : WH[3], 1, ST[1]);
}
function crossSection(cx, cy, r, kind, t) {
  disc(cx, cy, r + 2, '#05040f'); disc(cx, cy, r + 1, kind === 'steel' ? ST[7] : CY[4]);
  if (kind === 'steel') { disc(cx, cy, r, ST[5]); ditherEll(cx, cy, r, r, ST[3], 0.4); disc(cx - r * 0.3, cy - r * 0.3, Math.round(r * 0.45), ST[6]); for (let i = 0; i < 18; i++) px(cx + Math.cos(i * 2.4) * r * 0.7 * ((i % 3) / 3 + 0.3), cy + Math.sin(i * 2.4) * r * 0.7 * ((i % 3) / 3 + 0.3), ST[7]); }
  else { disc(cx, cy, r, CY[1]); const q = [[0, 0], [1, 0], [-1, 0], [0.5, 0.87], [-0.5, 0.87], [0.5, -0.87], [-0.5, -0.87], [1.5, 0.87], [-1.5, 0.87], [1.5, -0.87], [-1.5, -0.87], [0, 1.74], [0, -1.74]]; const sp = r * 0.3; for (const [a, b] of q) { const x = cx + a * sp * 2.1, y = cy + b * sp * 2.1; if (Math.hypot(x - cx, y - cy) < r - 1.5) { disc(x, y, Math.max(1, Math.round(r * 0.16)), WH[3]); } } }
}
function cube(x, y, a, kind) {                          // cube vu de face (x, y = coin haut gauche)
  R(x - 1, y - 1, a + 2, a + 2, '#05040f');
  if (kind === 'steel') { R(x, y, a, a, ST[4]); R(x, y, a, 3, ST[7]); R(x, y, 3, a, ST[6]); R(x + a - 3, y, 3, a, ST[2]); R(x, y + a - 3, a, 3, ST[2]); ditherRect(x + 3, y + 3, a - 6, a - 6, ST[3], 0.4); }
  else { R(x, y, a, a, WH[1]); R(x, y, a, 2, WH[3]); R(x, y, 2, a, WH[3]); R(x + a - 2, y, 2, a, CY[3]); R(x, y + a - 2, a, 2, CY[2]); for (let i = 3; i < a - 3; i += 4) for (let j = 3; j < a - 3; j += 4) px(x + i + (j % 8 ? 1 : 0), y + j, CY[4]); }
}
function balance(cx, cy, tilt, nSilk, t) {
  R(cx - 36, cy + 150, 72, 8, ST[3]); R(cx - 36, cy + 150, 72, 2, ST[6]); R(cx - 6, cy - 10, 12, 160, ST[4]); R(cx - 6, cy - 10, 3, 160, ST[6]); R(cx + 3, cy - 10, 3, 160, ST[2]);
  const Lb = 84, a = tilt, A = [cx - Math.cos(a) * Lb, cy - 12 - Math.sin(a) * Lb], B = [cx + Math.cos(a) * Lb, cy - 12 + Math.sin(a) * Lb];
  lineP(A[0], A[1], B[0], B[1], '#05040f', 5); lineP(A[0], A[1], B[0], B[1], ST[5], 3); lineP(A[0], A[1] - 1, B[0], B[1] - 1, ST[7], 1);
  disc(cx, cy - 12, 8, '#05040f'); disc(cx, cy - 12, 7, ST[6]); disc(cx, cy - 12, 3, ST[2]);
  const pan = (E, w, py, fn) => {
    const pxx = E[0], pyy = E[1] + py;
    lineP(E[0], E[1], pxx - w / 2, pyy, ST[6], 1); lineP(E[0], E[1], pxx + w / 2, pyy, ST[6], 1);
    R(pxx - w / 2, pyy, w, 3, ST[6]); R(pxx - w / 2 + 3, pyy + 3, w - 6, 2, ST[4]); R(pxx - w / 2 + 6, pyy + 5, w - 12, 1, ST[2]);
    fn(pxx, pyy);
  };
  pan(A, 44, 80, (x, y) => cube(rd(x - 10), y - 20, 20, 'steel'));
  pan(B, 72, 80, (x, y) => {
    const a2 = 20; let n = 0;
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) { if (n++ >= nSilk) return; cube(rd(x - 31 + col * 21), y - 21 - row * 21, a2, 'silk'); }
  });
}

// signe « environ égal » en deux vagues
function approx(cx, cy, w, col, th = 3) {
  for (const dy of [-5, 5]) for (let i = -w / 2; i <= w / 2; i++) R(cx + i, cy + dy + Math.round(2.2 * Math.sin(i * 0.55)), 1, th, col);
}
// courbe pixel par pixel : f(x) → y ; remplissage dessous (tramé) de x0 à xp
function plotCurve(pts, xp, col, fillCol, base, dens = 0.55) {
  for (let x = pts[0][0]; x <= xp; x++) {
    const y = tab(pts, x);
    if (fillCol) { L.fillStyle = fillCol; for (let yy = Math.round(y); yy <= base; yy++) if (BAYER[(yy & 3) * 4 + (x & 3)] < dens) L.fillRect(x, yy, 1, 1); }
    L.fillStyle = col; L.fillRect(x, Math.round(y), 1, 2);
  }
}
