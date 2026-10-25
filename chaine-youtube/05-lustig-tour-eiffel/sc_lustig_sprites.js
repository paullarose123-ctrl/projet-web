'use strict';
// ════════════════════════════════════════════════════════════════════════════════════════
// 0. OUTILS (maths, splines, calque lisse → pixels nets)
// ════════════════════════════════════════════════════════════════════════════════════════
const lu_rgbM = {};
function lu_rgb(c) { if (Array.isArray(c)) return c; return lu_rgbM[c] || (lu_rgbM[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]); }
function lu_h(i, s = 0) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
const lu_bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
const lu_ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lu_fin = (v, d = 0) => Number.isFinite(v) ? v : d;
const lu_mixc = (a, b, f) => { a = lu_rgb(a); b = lu_rgb(b); return '#' + [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * f).toString(16).padStart(2, '0')).join(''); };
const lu_lerpA = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
// interpolation de Catmull-Rom dans une table [[x, v], …] (x croissants)
const lu_tab = (T, x) => tab(T, x);

// spline de Catmull-Rom → Path2D (fermée ou non)
function lu_spline(pts, closed = true, path = new Path2D()) {
  const n = pts.length, g = i => pts[((i % n) + n) % n];
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = closed ? g(i - 1) : pts[Math.max(0, i - 1)], p1 = pts[i], p2 = closed ? g(i + 1) : pts[i + 1], p3 = closed ? g(i + 2) : pts[Math.min(n - 1, i + 2)];
    path.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) path.closePath();
  return path;
}
function lu_curve(pts, k = 6) {                       // courbe de Catmull-Rom échantillonnée (k points par intervalle)
  const out = [], n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let j = 0; j < k; j++) {
      const u = j / k, u2 = u * u, u3 = u2 * u;
      out.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]);
    }
  }
  out.push(pts[n - 1]);
  return out;
}
// segment lisse à largeur variable et bouts arrondis : UN seul polygone simple
function lu_seg(pts, ws, path = new Path2D(), k = 6) {
  const dense = [], dw = [], n = pts.length;
  if (n === 2) { for (let q = 0; q <= 5; q++) { const u = q / 5; dense.push([pts[0][0] + (pts[1][0] - pts[0][0]) * u, pts[0][1] + (pts[1][1] - pts[0][1]) * u]); dw.push(ws[0] + (ws[1] - ws[0]) * u); } }
  else {
    const cv = lu_curve(pts, k);
    for (let q = 0; q < cv.length; q++) { const f = q / k, i = Math.min(n - 2, Math.floor(f)), u = q === cv.length - 1 ? 1 : f - i; dense.push(cv[q]); dw.push(ws[i] + (ws[i + 1] - ws[i]) * u); }
  }
  const m = dense.length, Lp = [], Rp = [], tn = [];
  for (let i = 0; i < m; i++) {
    const a = dense[Math.max(0, i - 1)], b = dense[Math.min(m - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; tn.push([tx, ty]);
    Lp.push([dense[i][0] - ty * dw[i] / 2, dense[i][1] + tx * dw[i] / 2]); Rp.push([dense[i][0] + ty * dw[i] / 2, dense[i][1] - tx * dw[i] / 2]);
  }
  const th = i => Math.atan2(tn[i][1], tn[i][0]), arc = (c, a0, w) => { const out = []; for (let q = 1; q < 8; q++) { const a = a0 - q * Math.PI / 8; out.push([c[0] + Math.cos(a) * w / 2, c[1] + Math.sin(a) * w / 2]); } return out; };
  polyPath(Lp.concat(arc(dense[m - 1], th(m - 1) + Math.PI / 2, dw[m - 1]), Rp.reverse(), arc(dense[0], th(0) - Math.PI / 2, dw[0])), path);
  return path;
}
const lu_ell = (cx, cy, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); return p; };
const lu_fill = (c, path, col) => { c.fillStyle = col; c.fill(path); };
function lu_stroke(c, pts, w, col, closed = false) { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(lu_spline(pts, closed)); }
function lu_line(c, pts, w, col) { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); }
// croissant de lumière : la partie de `path` située à moins de w du bord tourné vers la lumière ll (inv : du côté de l'ombre)
function lu_cres(c, path, ll, w, col, inv = false) {
  c.save(); c.clip(path);
  const p = new Path2D(); p.rect(-900, -900, 1800, 1800);
  const k = inv ? 1 : -1;
  p.addPath(path, new DOMMatrix([1, 0, 0, 1, k * ll[0] * w, k * ll[1] * w]));
  c.fillStyle = col; c.fill(p, 'evenodd'); c.restore();
}
// IK à deux segments en 3D : renvoie le coude/genou ; pole = direction vers laquelle l'articulation se plie
function lu_ik3(S, T, L1, L2, pole) {
  let dx = T[0] - S[0], dy = T[1] - S[1], dz = T[2] - S[2]; const d0 = Math.hypot(dx, dy, dz) || 0.001;
  const mx = L1 + L2 - 0.02, mn = Math.abs(L1 - L2) + 0.05, d = clamp(d0, mn, mx);
  const ax = dx / d0, ay = dy / d0, az = dz / d0;
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  let px_ = pole[0], py_ = pole[1], pz_ = pole[2]; const dp = px_ * ax + py_ * ay + pz_ * az; px_ -= dp * ax; py_ -= dp * ay; pz_ -= dp * az;
  let pl = Math.hypot(px_, py_, pz_); if (pl < 1e-4) { px_ = 0; py_ = 0; pz_ = 1; const dq = az; px_ -= dq * ax; py_ -= dq * ay; pz_ = 1 - dq * az; pl = Math.hypot(px_, py_, pz_) || 1; }
  px_ /= pl; py_ /= pl; pz_ /= pl;
  return { k: [S[0] + ax * a + px_ * h, S[1] + ay * a + py_ * h, S[2] + az * a + pz_ * h], a: [S[0] + ax * d, S[1] + ay * d, S[2] + az * d], d: d0 };
}
const lu_rot2 = (x, y, px, py, a) => { const dx = x - px, dy = y - py, c = Math.cos(a), s = Math.sin(a); return [px + dx * c - dy * s, py + dx * s + dy * c]; };

// ── matrices 3×3 (colonne x : latéral, y : haut, z : devant), repère corps : x vers la GAUCHE du personnage, z vers l'avant
const lu_I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const lu_Ry = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };      // lacet : x' = c x + s z ; z' = −s x + c z (positif : tourne vers la droite de l'écran)
const lu_Rx = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };      // inclinaison avant : y' = c y − s z ; z' = s y + c z
const lu_Rz = a => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, -s, c, 0, 0, 0, 1]; };      // roulis : x' = c x + s y ; y' = −s x + c y
function lu_mm(A, B) { const r = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return r; }
function lu_xf(M, T) {
  return { M, T, ap(p) { return [M[0] * p[0] + M[1] * p[1] + M[2] * p[2] + T[0], M[3] * p[0] + M[4] * p[1] + M[5] * p[2] + T[1], M[6] * p[0] + M[7] * p[1] + M[8] * p[2] + T[2]]; },
    rt(p) { return [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]]; } };
}

// ── contexte de dessin de l'appel en cours (un seul à la fois)
let lu_G = null;
// projection : p = [X, Y (haut), Z (vers la caméra)] monde → [x écran (px à s = 1), y écran (vers le bas), profondeur]
function lu_pj(p) {
  const G = lu_G, x = p[0], y = -p[1] * G.ca + p[2] * G.sa;
  if (x < G.bb[0]) G.bb[0] = x; if (x > G.bb[2]) G.bb[2] = x; if (y < G.bb[1]) G.bb[1] = y; if (y > G.bb[3]) G.bb[3] = y;
  return [x, y, p[2] * G.ca + p[1] * G.sa];
}

// ── loft : corps à sections elliptiques. levels = [[y, a, zf, zb], …] (y croissants, repère local) ; a : demi-largeur, zf / zb : surface avant / arrière
function lu_lvFn(levels) {
  const A = levels.map(l => [l[0], l[1]]), F = levels.map(l => [l[0], l[2]]), B = levels.map(l => [l[0], l[3]]);
  return y => [lu_tab(A, y), lu_tab(F, y), lu_tab(B, y)];
}
const lu_ysOf = (levels, n) => { const y0 = levels[0][0], y1 = levels[levels.length - 1][0], out = []; for (let i = 0; i < n; i++) out.push(y0 + (y1 - y0) * i / (n - 1)); return out; };
function lu_surf(levels, xf) { return { lv: lu_lvFn(levels), xf, y0: levels[0][0], y1: levels[levels.length - 1][0], levels }; }
// point de la surface à la hauteur y (local) et à l'angle phi (0 : devant, + : vers la gauche du personnage) : [x, y, prof, vis]
function lu_sp(S, y, phi, grow = 0) {
  const [a, zf, zb] = S.lv(y), c = (zf - zb) / 2 + grow, zc = (zf + zb) / 2, aa = a + grow;
  const p = lu_pj(S.xf.ap([aa * Math.sin(phi), y, zc + c * Math.cos(phi)]));
  return p;
}
// orientation visible : φ0 tel que cos(φ − φ0) > 0 ⇔ face tournée vers la caméra, pour la section à la hauteur y
function lu_phi0(S, y) {
  const G = lu_G, [a, zf, zb] = S.lv(y), c = (zf - zb) / 2, M = S.xf.M;
  const A = (M[3] * G.sa + M[6] * G.ca) / a, B = (M[5] * G.sa + M[8] * G.ca) / c;
  return Math.atan2(A, B);
}
const lu_wrap = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
// silhouette d'un loft : polygone [[x, y], …] (sens horaire écran)
function lu_outline(S, n = 11, N = 16, grow = 0) {
  const rows = [], ys = lu_ysOf(S.levels, n);
  for (const y of ys) {
    const pts = [];
    for (let k = 0; k < N; k++) pts.push(lu_sp(S, y, k * TAU / N, grow));
    let iMin = 0, iMax = 0; for (let k = 1; k < N; k++) { if (pts[k][0] < pts[iMin][0]) iMin = k; if (pts[k][0] > pts[iMax][0]) iMax = k; }
    const cy = pts.reduce((s, p) => s + p[1], 0) / N;
    rows.push({ pts, L: pts[iMin], R: pts[iMax], cy });
  }
  const top = rows[rows.length - 1], bot = rows[0];                  // y local croissant vers le haut : la dernière ligne est le haut
  const out = [];
  for (let i = rows.length - 1; i >= 0; i--) out.push(rows[i].L);                                      // côté gauche (écran), du haut vers le bas
  const lowArc = bot.pts.filter(p => p[1] >= bot.cy && p[0] > bot.L[0] && p[0] < bot.R[0]).sort((a, b) => a[0] - b[0]);
  for (const p of lowArc) out.push(p);
  for (let i = 0; i < rows.length; i++) out.push(rows[i].R);                                          // côté droit, du bas vers le haut
  const upArc = top.pts.filter(p => p[1] < top.cy && p[0] > top.L[0] && p[0] < top.R[0]).sort((a, b) => b[0] - a[0]);
  for (const p of upArc) out.push(p);
  return out;
}
// bande sur la surface : région entre phiA(y) et phiB(y) (phiA < phiB) pour y de ya à yb ; renvoie un polygone [[x, y], …] ou null (rien de visible)
function lu_band(S, ya, yb, phiA, phiB, n = 8, grow = 0) {
  const Lp = [], Rp = [];
  for (let i = 0; i < n; i++) {
    const y = ya + (yb - ya) * i / (n - 1), p0 = lu_phi0(S, y);
    let a = phiA(y), b = phiB(y);
    if (b <= a + 1e-4) continue;
    // ramène a et b dans (p0 − π, p0 + π) puis coupe à ±π/2 (visible)
    let ra = lu_wrap(a - p0), rb = lu_wrap(b - p0);
    if (rb < ra) rb += TAU;                                         // intervalle [ra, rb] sur le cercle
    const lo = Math.max(ra, -Math.PI / 2 + 0.02), hi = Math.min(rb, Math.PI / 2 - 0.02);
    if (hi <= lo) continue;
    Lp.push(lu_sp(S, y, p0 + lo, grow)); Rp.push(lu_sp(S, y, p0 + hi, grow));
  }
  if (Lp.length < 2) return null;
  return Lp.concat(Rp.reverse());
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 1. TONS ET PASSAGE PIXEL : tout ce qui est dessiné dans le calque est ramené aux tons de la fiche du personnage
//    (pas de mélange parasite aux jonctions), liseré de contre-jour, ombre portée projetée, puis contour net (layerEnd)
// ════════════════════════════════════════════════════════════════════════════════════════
const lu_INK = '#05040f';
const lu_palNear = (r, g, b) => { const p = PAL[LUT[((clamp(r, 0, 255) >> 3) << 10) | ((clamp(g, 0, 255) >> 3) << 5) | (clamp(b, 0, 255) >> 3)]]; return [p[0], p[1], p[2]]; };
// prépare une fiche : liste de tons, table de recherche 15 bits → ton
function lu_prep(spec) {
  const map = new Map(), add = h => { if (!map.has(h)) map.set(h, map.size); };
  add(lu_INK);
  for (const k in spec.mats) spec.mats[k].forEach(add);
  (spec.extra || []).forEach(add);
  spec.tones = [...map.keys()]; spec.ti = {}; spec.tones.forEach((h, i) => spec.ti[h] = i);
  spec.trgb = spec.tones.map(lu_rgb);
  const lut = new Uint8Array(32768), T = spec.trgb;
  for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
    const R_ = r * 8.23, G_ = g * 8.23, B_ = b * 8.23; let best = 0, bd = 1e9;
    for (let i = 0; i < T.length; i++) { const p = T[i], rm = (R_ + p[0]) / 2, dr = R_ - p[0], dg = G_ - p[1], db = B_ - p[2], d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; if (d < bd) { bd = d; best = i; } }
    lut[(r << 10) | (g << 5) | b] = best;
  }
  spec.lut = lut; spec.rimCache = {}; spec.lm = lu_landmarks(spec);
  // luminance de chaque ton (pour savoir lesquels sont sombres)
  spec.tlum = T.map(p => 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2]);
  return spec;
}
function lu_rimTable(spec, sun) {
  const key = sun; if (spec.rimCache[key]) return spec.rimCache[key];
  const sc = lu_rgb(sun), tb = spec.trgb.map((p, i) => {
    const k = spec.tlum[i] < 30 ? 0.62 : 0.5;                   // les tons très sombres prennent plus de couleur du soleil : le liseré se voit
    return lu_palNear(p[0] + (sc[0] - p[0]) * k, p[1] + (sc[1] - p[1]) * k, p[2] + (sc[2] - p[2]) * k);
  });
  return spec.rimCache[key] = tb;
}
const lu_hexOf = p => '#' + p.map(v => v.toString(16).padStart(2, '0')).join('');

// calque de dessin remis à zéro
function lu_layer() {
  layerBegin(); const c = Y;
  c.lineCap = 'butt'; c.lineJoin = 'miter'; c.miterLimit = 10; c.lineWidth = 1; c.setLineDash([]); c.lineDashOffset = 0; c.shadowBlur = 0; c.fillStyle = '#000000'; c.strokeStyle = '#000000'; c.textAlign = 'left';
}
// ombre au sol : tache sombre sous les pieds
function lu_blob(x, y, rx, ry, a = 0.4, col = '5,4,15') {
  if (a <= 0) return;
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0);
  for (const [k, q] of [[1, 0.5], [0.72, 0.6]]) { L.fillStyle = `rgba(${col},${a * q})`; L.beginPath(); L.ellipse(x, y, Math.max(0.5, rx * k), Math.max(0.3, ry * k), 0, 0, TAU); L.fill(); }
  L.restore();
}
const lu_shC = (() => { const c = document.createElement('canvas'); c.width = LW; c.height = LH; return c; })();
// passage pixel : box = [x0, y0, x1, y1] ; st = { spec, Ls (lumière écran, unitaire, vers la source), sun, sil, rimW, shadow: {a, kx, ky, gy, col}, blush: [[cx, cy, rx, ry, k]] }
function lu_finish(box, st) {
  const spec = st.spec, x0 = Math.max(0, Math.floor(box[0])), y0 = Math.max(0, Math.floor(box[1])), x1 = Math.min(LW, Math.ceil(box[2])), y1 = Math.min(LH, Math.ceil(box[3])), w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) { layerEnd({ outline: lu_INK }); return { mask: () => false, bbox: [x0, y0, 0, 0], occ: null }; }
  const id = Y.getImageData(x0, y0, w, h), d = id.data, n = w * h, occ = new Uint8Array(n), ix = new Uint8Array(n), lut = spec.lut, amp = st.amp ?? 5;
  const sil = st.sil ? lu_rgb(st.sil) : null;
  for (let j = 0, p = 0; j < h; j++) for (let i = 0; i < w; i++, p++) {
    if (d[p * 4 + 3] < 128) { d[p * 4 + 3] = 0; continue; }
    occ[p] = 1; const of = (lu_bay(x0 + i, y0 + j) - 0.5) * amp;
    ix[p] = lut[((clamp(d[p * 4] + of, 0, 255) >> 3) << 10) | ((clamp(d[p * 4 + 1] + of, 0, 255) >> 3) << 5) | (clamp(d[p * 4 + 2] + of, 0, 255) >> 3)];
  }
  const Ls = st.Ls, rx = Math.round(Ls[0] * 1.3), ry = Math.round(Ls[1] * 1.3), rw = st.rimW ?? 1, rim = lu_rimTable(spec, st.sun || AM[9]);
  const keep = new Uint8Array(n);
  if (!sil && st.rimK !== 0) for (let j = 0, p = 0; j < h; j++) for (let i = 0; i < w; i++, p++) {
    if (!occ[p]) continue;
    const a = (i + rx < 0 || j + ry < 0 || i + rx >= w || j + ry >= h) ? 0 : occ[(j + ry) * w + i + rx];
    if (!a) keep[p] = 1;
    else if (rw > 1) { const b2 = (i + 2 * rx < 0 || j + 2 * ry < 0 || i + 2 * rx >= w || j + 2 * ry >= h) ? 0 : occ[(j + 2 * ry) * w + i + 2 * rx]; if (!b2 && lu_bay(x0 + i, y0 + j) < 0.6) keep[p] = 1; }
  }
  // joues rouges (demi-teintes tramées sur les pixels de peau)
  if (st.blush && st.skinTones) for (const [bx, by, brx, bry, bk, bc] of st.blush) {
    const col = lu_rgb(bc || RD[5]);
    for (let j = Math.max(0, Math.floor(by - bry - y0)); j < Math.min(h, Math.ceil(by + bry - y0) + 1); j++) for (let i = Math.max(0, Math.floor(bx - brx - x0)); i < Math.min(w, Math.ceil(bx + brx - x0) + 1); i++) {
      const p = j * w + i; if (!occ[p] || !st.skinTones.has(ix[p])) continue;
      const q = 1 - (((x0 + i + 0.5 - bx) / brx) ** 2 + ((y0 + j + 0.5 - by) / bry) ** 2); if (q <= 0) continue;
      if (lu_bay(x0 + i, y0 + j) < bk * Math.min(1, q * 1.7)) { d[p * 4] = col[0]; d[p * 4 + 1] = col[1]; d[p * 4 + 2] = col[2]; keep[p] = 2; }
    }
  }
  for (let p = 0; p < n; p++) {
    if (!occ[p]) { d[p * 4 + 3] = 0; continue; }
    if (keep[p] === 2) { d[p * 4 + 3] = 255; continue; }
    let c = sil || spec.trgb[ix[p]];
    if (keep[p] && !sil) c = rim[ix[p]];
    d[p * 4] = c[0]; d[p * 4 + 1] = c[1]; d[p * 4 + 2] = c[2]; d[p * 4 + 3] = 255;
  }
  Y.putImageData(id, x0, y0);
  // ombre portée projetée sur le sol (silhouette cisaillée), peinte AVANT le personnage
  const sh = st.shadow;
  if (sh && sh.a > 0) {
    const g = lu_shC.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, LW, LH);
    const sid = g.createImageData(w, h), sd = sid.data, sc = lu_rgb(sh.col || '#2e1a56');
    for (let p = 0; p < n; p++) if (occ[p]) { sd[p * 4] = sc[0]; sd[p * 4 + 1] = sc[1]; sd[p * 4 + 2] = sc[2]; sd[p * 4 + 3] = 255; }
    g.putImageData(sid, x0, y0);
    // un pixel de l'ombre à la hauteur hh : x' = x + kx·(gy − y), y' = gy + ky·(gy − y)
    L.save(); L.setTransform(1, 0, -sh.kx * 0 , 1, 0, 0);
    const kx = sh.kx, ky = sh.ky, gy = sh.gy;
    L.setTransform(1, 0, -kx, -ky, kx * gy, gy * (1 + ky)); L.globalAlpha = sh.a;
    L.drawImage(lu_shC, 0, 0); L.restore(); L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1;
  }
  layerEnd({ outline: st.outline ?? lu_INK });
  return { x0, y0, w, h, occ, ix, bbox: [x0, y0, w, h], mask: (qx, qy) => { const i = Math.round(qx) - x0, j = Math.round(qy) - y0; return i >= 0 && j >= 0 && i < w && j < h && occ[j * w + i] > 0; } };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 2. FICHES DES PERSONNAGES (mesures en px à s = 1, repère corps : x vers la gauche du personnage, y vers le haut, z vers l'avant ; sol y = 0)
// ════════════════════════════════════════════════════════════════════════════════════════
const lu_mat = (b, l1, l2, d1, d2) => [b, l1, l2, d1, d2];
const lu_MATS = {
  anthracite: lu_mat(ST[2], ST[3], ST[4], ST[1], ST[0]),
  anthraciteL: lu_mat(ST[3], ST[4], ST[5], ST[2], ST[1]),           // revers de satin : un peu plus clair
  cream: lu_mat(WH[0], WH[1], WH[2], ST[6], ST[5]),                  // gilet clair, ombres froides
  shirt: lu_mat(WH[2], WH[3], WH[3], WH[1], WH[0]),
  skin: lu_mat(SK[3], SK[4], SK[4], SK[2], SK[1]),
  patent: lu_mat(ST[0], ST[2], ST[6], NI[0], NI[0]),
  felt: lu_mat(ST[2], ST[3], ST[5], ST[1], ST[0]),
  ribbon: lu_mat(NI[0], ST[0], ST[2], NI[0], NI[0]),
  brass: lu_mat(YE[1], YE[2], YE[3], AM[5], AM[4]),
  wood: lu_mat(WO[2], WO[3], WO[5], WO[1], WO[0]),
  hairDark: lu_mat(WO[1], WO[2], WO[4], WO[0], NI[0]),
  red: lu_mat(RD[1], RD[2], RD[3], RD[0], RD[0]),
  brown: lu_mat(WO[3], WO[4], WO[5], WO[2], WO[1]),
  brownL: lu_mat(WO[4], WO[5], WO[6], WO[3], WO[2]),
  tan: lu_mat(WO[5], WO[6], SK[4], WO[4], WO[3]),
  bowler: lu_mat(ST[1], ST[2], ST[4], ST[0], NI[0]),
};

function lu_scaleLv(lv, k) { return lv.map(l => [l[0] * k, l[1] * k, l[2] * k, l[3] * k]); }
// tête : sections (y, a, zf, zb) dans le repère de la tête (origine au centre du crâne)
const lu_HEAD0 = lu_scaleLv([[-11, 2.0, 5.6, -2.0], [-9.9, 3.4, 6.7, -3.6], [-8.8, 4.4, 7.2, -5.2], [-6.6, 5.7, 7.3, -8.0], [-4.4, 6.5, 7.3, -9.6], [-2.2, 7.2, 7.6, -10.3], [0, 7.7, 7.9, -10.7],
  [2.2, 7.9, 8.2, -10.9], [4.4, 7.9, 7.9, -10.7], [6.6, 7.4, 7.0, -9.8], [8.8, 5.9, 5.5, -7.8], [10.2, 4.0, 3.5, -5.2], [10.9, 2.0, 1.6, -3.0], [11.2, 0.5, 0.3, -1.0]], 1.07);

function lu_mk(base, over) {                                    // fiche dérivée (fusion profonde, sauf tableaux)
  const out = {};
  for (const k in base) out[k] = base[k];
  for (const k in over) { const v = over[k]; out[k] = (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) ? lu_mk(base[k], v) : v; }
  return out;
}

const lu_SPEC_LUSTIG = {
  id: 'lustig', H: 176,
  hipY: 93, hipSep: 8.4, thigh: 44.6, shin: 42.4, ankle: 6.2, kneeOut: 0.2,
  leg: { w: [16.2, 12.6, 12.2, 9.8], cuff: 10.6 },                 // largeurs : haut de cuisse, genou (fin cuisse), genou (début tibia), bas de pantalon
  // veston : sections (y local depuis le pivot du bassin, a, zf, zb)
  torso: [[-6, 15.6, 9.8, -9.0], [0, 16.4, 10.4, -9.4], [12, 14.8, 9.2, -8.4], [26, 16.6, 10.2, -9.2], [38, 17.8, 10.8, -9.6], [46, 18.4, 9.8, -8.8], [51, 18.0, 8.4, -7.6], [54, 14.0, 7.0, -6.4], [57, 9.2, 6.2, -5.6], [59.5, 6.8, 5.6, -5.2]],
  shY: 46.8, shX: 17.2, shZ: -0.5,
  arm: { U: 29.6, F: 25.2, hand: 17.0, w: [11.6, 10.0, 8.4], cuff: 9.0 },
  neck: { y0: 55, y1: 64, a: 4.3, zf: 5.0, zb: -4.2 },
  head: { pivotY: 59.5, pivotZ: 0.6, up: 13.4, fwd: 0.5, levels: lu_HEAD0, scale: 1.0, nose: 4.3, noseW: 2.5, jaw: 1.0, earY: -0.8 },
  hat: { style: 'homburg', seat: 7.0, back: -0.9, tilt: [0.06, -0.06] },
  tie: { w: [[20, 0.6], [22, 2.4], [28, 3.2], [36, 2.8], [44, 2.2], [52, 1.8]], yEnd: 20.5 }, vestButtons: [12, 20, 28, 36],
  facial: { mous: 'pencil' }, pocketSq: true, flower: true, hairStyle: 'slick',
  walk: { T: 1.08, duty: 0.6, S: 54, lift: 7.5, bob: 3.7, bob0: 0.5, sway: 1.2, twist: 0.09, tilt: 0.03, lean: 0.045, armA: 0.34, bend: 0.12, heelUp: 0.32, toeOff: 0.5, wide: 0.2 },
  run: { T: 0.5, duty: 0.36, S: 78, lift: 20, lean: 0.34 },
  foot: { toe: 18.5, heel: -5.4, w: 8.2, h: 6.2 },
  // ouverture du veston (demi-angle sur la surface, selon y local) : se referme au bouton (y = 17), s'évase au-dessus et au-dessous
  open: [[-6, 0.62], [0, 0.46], [8, 0.3], [14, 0.2], [18, 0.14], [24, 0.22], [32, 0.34], [40, 0.44], [47, 0.5], [53, 0.54], [60, 0.54]],
  lapel: [[17, 0.0], [22, 0.14], [30, 0.26], [38, 0.33], [46, 0.35], [51, 0.28], [55, 0.1], [57, 0.0]],
  mats: { jacket: lu_MATS.anthracite, lapel: lu_MATS.anthraciteL, vest: lu_MATS.cream, shirt: lu_MATS.shirt, skin: lu_MATS.skin, shoe: lu_MATS.patent, hat: lu_mat(ST[3], ST[4], ST[6], ST[2], ST[1]), ribbon: lu_MATS.ribbon, hair: lu_MATS.hairDark, tie: lu_MATS.red, brass: lu_MATS.brass, wood: lu_MATS.wood },
  extra: [RD[3], YE[3]],
};

// repères du corps dans le repère du torse, relatifs à l'épaule (o : vers l'extérieur, u : haut, f : avant) : servent aux poses
function lu_landmarks(sp) {
  const H = sp.head, hc = H.pivotY + H.up, zh = H.pivotZ + H.fwd, so = -(sp.shX - 0.8), su = sp.shY, sf = sp.shZ;
  const tieY = sp.tieY ?? (sp.shY + 8.5);
  return {
    chin: [so, hc - 10.6 - su, zh + 9.0 - sf], lips: [so, hc - 6.9 - su, zh + 10.6 - sf], knot: [so, tieY - su, sp.torso[sp.torso.length - 4][2] - sf + 2.2],
    hatFront: [so * 0.75, hc + sp.hat.seat - su + 1.6, zh + 13 - sf], hatL: [-(sp.shX - 11.8), hc + sp.hat.seat - su - 0.6, zh + 1 - sf],
    brimFront: [so * 0.72, hc + sp.hat.seat - su + 0.4, zh + 12.5 - sf], chest: [so * 0.7, 8 - sf, 12], head: [so, hc - su, zh],
  };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 3. POSES : paramètres numériques (interpolables), puis squelette 3D
// ════════════════════════════════════════════════════════════════════════════════════════
const lu_ELEV = 0.12;                                               // élévation de la caméra (rad) : les cercles horizontaux (bords de chapeau, semelles) s'ouvrent en ellipses
function lu_baseArm(sp) { return { o: 0.6, u: -(sp.arm.U + sp.arm.F) * 0.985, f: 1.5, el: [0.35, -0.25, -0.8], hand: { curl: 0.32, thumb: 0.25, point: 0, spread: 0.1, bend: 0, hv: -1, roll: 0 }, zb: 0, glove: 0 }; }
function lu_baseLeg(sp, side) { return { x: side * (sp.hipSep - 0.2), z: 0, h: 0, pitch: 0, yawF: -side * 0.16 }; }
function lu_base(sp) {
  return {
    yaw: 0.75, twistP: 0, twistT: 0, lean: 0, sway: 0, hipTilt: 0, hipX: 0, hipZ: 0, drop: 0, bob: 0, shrug: 0, chest: 0,
    head: { yaw: 0, pitch: 0, roll: 0 },
    gaze: [0, 0],
    face: { lid: 0.8, brow: 0, browIn: 0, browAsym: 0, smile: 0, smileAsym: 0, mouth: 0, jaw: 0, blush: 0, squint: 0, lip: 0, wide: 0, shine: 0, pupil: 1 },
    hatHeld: 0,
    hat: { dx: 0, dy: 0, dz: 0, pitch: (sp.hat && sp.hat.tilt ? sp.hat.tilt[0] : 0), roll: (sp.hat && sp.hat.tilt ? sp.hat.tilt[1] : 0) },
    L: lu_baseArm(sp), R: lu_baseArm(sp),
    legL: lu_baseLeg(sp, 1), legR: lu_baseLeg(sp, -1),
  };
}
function lu_blend(A, B, m) {                                        // interpolation de deux structures de poses (les nombres seulement)
  if (typeof A === 'number') return A + (B - A) * m;
  if (Array.isArray(A)) return A.map((v, i) => lu_blend(v, B[i], m));
  if (A && typeof A === 'object') { const o = {}; for (const k in A) o[k] = lu_blend(A[k], B[k], m); return o; }
  return m < 0.5 ? A : B;
}

// hauteur de la cheville pour que la semelle (talon ou bout) touche le sol quand le pied est incliné de `pitch` (bout vers le haut > 0)
function lu_ankleY(sp, pitch) {
  const F = sp.foot, c = Math.cos(pitch), s_ = Math.sin(pitch), yh = -F.h * c + F.heel * s_, yt = -F.h * c + (F.toe - 0.6) * s_;
  return -Math.min(yh, yt);
}
// ── squelette : positions monde [X, Y haut, Z vers la caméra]
function lu_rotv(M, p) { return [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]]; }
const lu_add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], lu_sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], lu_mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const lu_nrm3 = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lu_cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const lu_dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function lu_skeleton(sp, P) {
  const ya = P.yaw, Rb = lu_Ry(ya), K = { P };
  const pel = [P.hipX, sp.hipY - P.drop + P.bob, P.hipZ], Pw = lu_rotv(Rb, pel);
  const Mp = lu_mm(lu_Ry(ya + P.twistP), lu_Rz(P.hipTilt)), Mt = lu_mm(lu_Ry(ya + P.twistT), lu_mm(lu_Rx(P.lean), lu_Rz(P.sway)));
  const xfT = lu_xf(Mt, Pw), xfP = lu_xf(Mp, Pw);
  K.Pw = Pw; K.Mt = Mt; K.xfT = xfT; K.xfP = xfP; K.Rb = Rb;
  K.hip = { L: xfP.ap([sp.hipSep, 0, 0]), R: xfP.ap([-sp.hipSep, 0, 0]) };
  K.sh = { L: xfT.ap([sp.shX, sp.shY + P.shrug, sp.shZ]), R: xfT.ap([-sp.shX, sp.shY + P.shrug, sp.shZ]) };
  K.kn = {}; K.an = {}; K.el = {}; K.wr = {}; K.hd = {}; K.hdir = {};
  // jambes
  for (const [sd, lg, sg] of [['L', P.legL, 1], ['R', P.legR, -1]]) {
    const an = lu_rotv(Rb, [lg.x, lu_ankleY(sp, lg.pitch) + lg.h, lg.z]);
    const pole = lu_rotv(Rb, [sg * sp.kneeOut, 0.12, 1]);
    const r = lu_ik3(K.hip[sd], an, sp.thigh, sp.shin, pole);
    K.kn[sd] = r.k; K.an[sd] = r.a;
  }
  // bras : cible = poignet, ou bout des doigts si ar.tip (le poignet est alors reculé de la longueur de la main) ; ar.hd : axe de la main dans le repère du torse (sinon : prolonge l'avant-bras)
  for (const [sd, ar, sg] of [['L', P.L, 1], ['R', P.R, -1]]) {
    const tg = lu_add3(K.sh[sd], lu_rotv(Mt, [sg * ar.o, ar.u, ar.f]));
    const pole = lu_rotv(Mt, [sg * ar.el[0], ar.el[1], ar.el[2]]);
    let r = lu_ik3(K.sh[sd], tg, sp.arm.U, sp.arm.F, pole), hax = null;
    if (ar.hd) hax = lu_nrm3(lu_rotv(Mt, [sg * ar.hd[0], ar.hd[1], ar.hd[2]]));
    if (ar.tip) {
      const hl = sp.arm.hand * (ar.tipK ?? 0.8);
      for (let it = 0; it < 4; it++) {
        const fd = hax || lu_nrm3(lu_sub3(r.a, r.k));
        r = lu_ik3(K.sh[sd], lu_sub3(tg, lu_mul3(fd, hl)), sp.arm.U, sp.arm.F, pole);
      }
    }
    K.el[sd] = r.k; K.wr[sd] = r.a;
    const fd = lu_nrm3(lu_sub3(r.a, r.k)); K.hdir[sd] = hax || fd; K.fdir = K.fdir || {}; K.fdir[sd] = fd;
    K.hd[sd] = lu_add3(r.a, lu_mul3(K.hdir[sd], sp.arm.hand));
  }
  // tête
  const Mh = lu_mm(lu_Ry(ya + P.head.yaw), lu_mm(lu_Rx(P.head.pitch), lu_Rz(P.head.roll)));
  const hp = sp.head, pv = xfT.ap([0, hp.pivotY, hp.pivotZ]);
  K.Mh = Mh; K.neckTop = pv; K.headC = lu_add3(pv, lu_rotv(Mh, [0, hp.up, hp.fwd]));
  K.xfH = lu_xf(Mh, K.headC);
  return K;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 4. DESSIN DES PARTIES (tout en repère du modèle ; le contexte c est mis à l'échelle par lu_figure)
// ════════════════════════════════════════════════════════════════════════════════════════
function lu_part(D, path, m, wl = [2.2, 1.0], ws = [2.6, 1.1]) {
  const c = D.c, ll = D.ll;
  lu_fill(c, path, m[0]);
  lu_cres(c, path, ll, wl[0], m[1]); lu_cres(c, path, ll, wl[1], m[2]);
  lu_cres(c, path, ll, ws[0], m[3], true); lu_cres(c, path, ll, ws[1], m[4], true);
}
const lu_edge = (D, path, col, k = 1) => { const c = D.c; c.strokeStyle = col; c.lineWidth = D.cw * k; c.lineJoin = 'round'; c.stroke(path); };
const lu_P2 = p => [p[0], p[1]];
const lu_dir2 = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };

// ── jambes et chaussures
function lu_footPts(D, sd) {
  const sp = D.sp, P = D.P, K = D.K, lg = sd === 'L' ? P.legL : P.legR, F = sp.foot;
  const M = lu_mm(lu_Ry(P.yaw + lg.yawF), lu_Rx(-lg.pitch)), xf = lu_xf(M, K.an[sd]);
  // profil de la chaussure (z devant, y haut), demi-largeur
  const prof = [[F.heel, -F.h, 3.0], [F.heel - 0.2, -1.6, 3.1], [F.heel + 1.6, 1.0, 3.2], [-0.5, 0.6, 3.6], [3.0, -1.2, 3.9], [8.4, -3.0, 4.1], [F.toe * 0.72, -4.2, 4.1], [F.toe * 0.9, -5.0, 3.3], [F.toe, -5.8, 2.0], [F.toe - 0.6, -F.h, 2.3], [F.heel + 3.0, -F.h, 3.0]];
  const pts = [];
  for (const [z, y, w] of prof) { pts.push(lu_pj(xf.ap([w, y, z])), lu_pj(xf.ap([-w, y, z]))); }
  return { pts, xf, prof };
}
function lu_hull(pts) {                                            // enveloppe convexe (algorithme de Andrew), points [x, y, …]
  const p = pts.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop(); return lo.concat(up);
}
function lu_drawLeg(D, sd) {
  const { c, K, sp } = D, M = sp.mats, W = sp.leg;
  // chaussure
  const fp = lu_footPts(D, sd), hull = lu_hull(fp.pts), shoe = polyPath(hull);
  lu_part(D, shoe, M.shoe, [1.2, 0.7], [1.3, 0.7]);
  lu_edge(D, shoe, M.shoe[4], 1);
  // reflet sur le bout (cuir verni) : un petit éclat le long du dessus
  { const a = lu_pj(fp.xf.ap([0, -1.2, 5])), b = lu_pj(fp.xf.ap([0, -3.4, sp.foot.toe * 0.8])); lu_line(c, [[a[0], a[1] - 0.2], [b[0], b[1] - 0.3]], Math.max(0.8, D.cw * 0.9), M.shoe[2]); }
  // pantalon
  const hp = K.hip[sd], kn = K.kn[sd], an = K.an[sd], dsh = lu_nrm3(lu_sub3(an, kn)), hem = lu_add3(an, lu_mul3(dsh, -2.4));
  const A = lu_pj(hp), B = lu_pj(kn), C = lu_pj(hem);
  const leg = lu_seg([lu_P2(A), lu_P2(B), lu_P2(C)], [W.w[0], (W.w[1] + W.w[2]) / 2, W.cuff], new Path2D(), 7);
  lu_part(D, leg, M.jacket, [2.0, 0.9], [2.6, 1.1]);
  lu_edge(D, leg, M.jacket[4], 1);
  // revers : fine ligne sombre en bas du pantalon
  const dd = lu_dir2(B, C), nx = -dd[1], ny = dd[0], w2 = W.cuff / 2;
  lu_line(c, [[C[0] - nx * w2, C[1] - ny * w2], [C[0] + nx * w2, C[1] + ny * w2]], D.cw * 1.1, M.jacket[4]);
  return leg;
}

// ── torse : veston, gilet, chemise, cravate
const lu_ang = (tbl) => y => lu_tab(tbl, y);
function lu_drawTorso(D) {
  const { c, K, sp, P } = D, M = sp.mats, S = D.surfT;
  const outl = lu_outline(S, 13, 18), path = polyPath(outl);
  lu_part(D, path, M.jacket, [4.4, 1.9], [4.6, 1.9]);
  c.save(); c.clip(path);
  // ouverture du veston : fond de pantalon, gilet, chemise
  const T = sp.torso[sp.torso.length - 1][0], y0o = D.crop ? sp.lapel[0][0] - 3 : sp.torso[0][0];
  const openF = lu_ang(sp.open);
  const opening = lu_band(S, y0o, T - 1.5, y => -openF(y), y => openF(y), 15);
  if (opening) {
    const op = polyPath(opening);
    lu_fill(c, op, M.jacket[3]);
    // gilet : pointe en bas, bord arrondi
    const vy0 = sp.vestTip ?? -1.5, vestF = y => clamp((y - vy0) * 0.26, 0, 1.3);
    const vest = lu_band(S, vy0, T - 8, y => -Math.min(vestF(y), openF(y) + 0.02), y => Math.min(vestF(y), openF(y) + 0.02), 14);
    if (vest) { const vp = polyPath(vest); lu_part(D, vp, M.vest, [1.8, 0.8], [3.0, 1.2]); lu_edge(D, vp, M.vest[4], 0.8); }
    // chemise au col
    const sh = lu_band(S, T - 19, T - 1.5, y => -Math.max(0.01, (y - T + 19) * 0.04), y => Math.max(0.01, (y - T + 19) * 0.04), 7, 0.25);
    if (sh) { const shp = polyPath(sh); lu_part(D, shp, M.shirt, [1.2, 0.5], [1.2, 0.5]); }
    // cravate : lame sur le gilet, pointe arrondie ; le nœud se dessine avec le col
    if (sp.tie) {
      const tw = lu_tab(sp.tie.w, 30);
      const tp = lu_band(S, sp.tie.yEnd, T - 7.5, y => -lu_tab(sp.tie.w, y) / 17.5, y => lu_tab(sp.tie.w, y) / 17.5, 12, 0.7);
      if (tp) { const tpp = polyPath(tp); lu_part(D, tpp, M.tie, [1.0, 0.5], [1.3, 0.6]); lu_edge(D, tpp, M.tie[4], 0.8); }
    }
    // boutons du gilet
    if (sp.vestButtons) for (const y of sp.vestButtons) { const q = lu_sp(S, y, 0.0, 0.8), ph = lu_phi0(S, y); if (Math.cos(lu_wrap(0 - ph)) > 0.15) { const b = lu_ell(q[0], q[1], 1.0, 1.0); lu_part(D, b, M.brass || M.vest, [0.4, 0.2], [0.4, 0.2]); } }
    // ombre portée par les revers sur le gilet
    c.save(); c.clip(op); const sd = lu_band(S, 20, 48, y => -openF(y), y => -openF(y) + 0.1, 8); if (sd) lu_fill(c, polyPath(sd), M.vest[4]); const sd2 = lu_band(S, 20, 48, y => openF(y) - 0.1, y => openF(y), 8); if (sd2) lu_fill(c, polyPath(sd2), M.vest[3]); c.restore();
    lu_edge(D, op, M.jacket[4], 1);
  }
  // revers
  for (const sg of [-1, 1]) {
    const lp = lu_band(S, sp.lapel[0][0], T - 3.5, y => sg < 0 ? -(openF(y) + lu_ang(sp.lapel)(y)) : openF(y), y => sg < 0 ? -openF(y) : openF(y) + lu_ang(sp.lapel)(y), 12, 0.25);
    if (lp) { const lpp = polyPath(lp); lu_part(D, lpp, M.lapel, [1.6, 0.7], [1.8, 0.8]); lu_edge(D, lpp, M.lapel[4], 0.9); }
  }
  // détails de couture : pochette, boutonnière, rabats de poches (côté visible seulement)
  const onS = (y, phi, grow = 0.5) => { const ph0 = lu_phi0(S, y); return Math.cos(lu_wrap(phi - ph0)) > 0.22 ? lu_sp(S, y, phi, grow) : null; };
  if (sp.pocketSq) {
    const bl = onS(34.0, 0.40), br = onS(35.2, 0.80), p1 = onS(38.6, 0.47, 0.8), p2 = onS(37.6, 0.62, 0.8), p3 = onS(38.2, 0.74, 0.8);
    if (bl && br && p1 && p2 && p3) { const sq = polyPath([lu_P2(bl), lu_P2(p1), [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2 + 0.6], lu_P2(p2), lu_P2(p3), lu_P2(br)]); lu_part(D, sq, M.shirt, [0.6, 0.3], [0.7, 0.3]); lu_edge(D, sq, M.shirt[4], 0.7);
      const w = lu_line(c, [lu_P2(bl), lu_P2(br)], D.cw * 1.3, M.jacket[4]); }
  }
  if (sp.flower) { const f = onS(44.5, 0.56, 0.8); if (f) { const e = lu_ell(f[0], f[1], 1.5, 1.5); lu_part(D, e, lu_MATS.red, [0.5, 0.3], [0.5, 0.3]); lu_fill(c, lu_ell(f[0] - 0.2, f[1] - 0.2, 0.6, 0.6), RD[4]); } }
  for (const sg of [-1, 1]) { const a = onS(2.5, sg * 1.02, 0.3), b = onS(1.0, sg * 0.82, 0.3); if (a && b) lu_line(c, [lu_P2(a), lu_P2(b)], D.cw * 1.4, M.jacket[4]); }
  c.restore();
  lu_edge(D, path, M.jacket[4], 1);
}

// ── bras, mains
// une main en 3D (paume + quatre doigts + pouce), projetée : renvoie les ancrages
function lu_handGeom(D, sd) {
  const { K, sp } = D, P = D.P, ar = sd === 'L' ? P.L : P.R, hp = ar.hand, hs = sd === 'L' ? 1 : -1, A = sp.arm, k = A.hand / 17;
  const W3 = K.wr[sd], a = K.hdir[sd];
  let pn0 = lu_rotv(K.Mt, [-hs, 0, 0]);                                // paume tournée vers l'axe du corps (bras ballant)
  if (hp.pn) pn0 = lu_rotv(K.Mt, [hs * hp.pn[0], hp.pn[1], hp.pn[2]]);
  let pn = lu_sub3(pn0, lu_mul3(a, lu_dot3(pn0, a))); pn = lu_nrm3(pn);
  if (hp.roll) { // rotation de pn autour de a
    const c_ = Math.cos(hp.roll), s_ = Math.sin(hp.roll), q = lu_cross3(a, pn); pn = lu_add3(lu_mul3(pn, c_), lu_mul3(q, s_));
  }
  const t3 = lu_mul3(lu_nrm3(lu_cross3(a, pn)), -hs);                   // direction du pouce
  return { W3, a, pn, t3, hs, hp, k };
}
function lu_drawHand(D, sd, over = {}) {
  const { c, K, sp } = D, P = D.P, ar = sd === 'L' ? P.L : P.R, M = sp.mats, hg = lu_handGeom(D, sd), { W3, a, pn, t3, hp, k } = hg;
  const skin = ar.glove ? (sp.mats.glove || M.skin) : M.skin, edgeC = skin[4];
  const palmL = 8.4 * k, wpw = 3.1 * k, wk = 4.0 * k;
  const G = D.G;
  const P3 = (base, ...terms) => { let p = base; for (const [v, f] of terms) p = lu_add3(p, lu_mul3(v, f)); return p; };
  const Kc = P3(W3, [a, palmL]);
  // paume : quadrilatère (poignet → articulations)
  const palm = [P3(W3, [t3, wpw * 0.85]), P3(Kc, [t3, wk]), P3(Kc, [t3, -wk]), P3(W3, [t3, -wpw * 0.85])];
  const palm2 = palm.map(p => lu_pj(p));
  const palmPath = lu_spline([[lu_pj(P3(W3, [a, -0.6]))[0], lu_pj(P3(W3, [a, -0.6]))[1]]].concat(palm2.map(lu_P2)), true);
  // doigts
  const fl = [0.93, 1.0, 0.95, 0.78], lat = [0.74, 0.26, -0.24, -0.72], curlK = clamp(hp.curl), pt = clamp(hp.point), spread = hp.spread;
  const fingers = [];
  for (let i = 0; i < 4; i++) {
    const cu = i === 0 ? curlK * (1 - pt) : curlK * (1 - 0.0) * (1 - 0 * pt);
    const L1 = 3.9 * k * fl[i], L2 = 2.7 * k * fl[i], L3 = 2.1 * k * fl[i];
    const th1 = 1.15 * cu, th2 = 1.45 * cu, th3 = 0.95 * cu;
    let b = P3(Kc, [t3, lat[i] * wk]);
    const sp_ = (lat[i] > 0 ? 1 : -1) * spread * 0.22 * (Math.abs(lat[i]) > 0.5 ? 1.3 : 0.7);
    const dirOf = th => lu_nrm3(lu_add3(lu_add3(lu_mul3(a, Math.cos(th)), lu_mul3(pn, Math.sin(th))), lu_mul3(t3, sp_ * Math.cos(th))));
    const d1 = dirOf(th1), d2 = dirOf(th1 + th2), d3 = dirOf(th1 + th2 + th3);
    const p1 = P3(b, [d1, L1]), p2 = P3(p1, [d2, L2]), p3 = P3(p2, [d3, L3]);
    fingers.push({ pts: [b, p1, p2, p3].map(p => lu_pj(p)), depth: (lu_pj(p2)[2]), i });
  }
  // pouce
  const tb = P3(W3, [a, palmL * 0.28], [t3, wpw * 0.9]);
  const th = clamp(hp.thumb), tdirOf = (f) => lu_nrm3(lu_add3(lu_add3(lu_mul3(a, 0.55 + 0.35 * (1 - th)), lu_mul3(t3, 0.15 + 0.8 * th)), lu_mul3(pn, 0.15 + 0.2 * (1 - th) + 0.35 * curlK * (1 - th) + 0.3 * f)));
  const td1 = tdirOf(0), td2 = lu_nrm3(lu_add3(td1, lu_mul3(pn, 0.3 * (1 - th) + 0.1))), tp1 = P3(tb, [td1, 3.9 * k]), tp2 = P3(tp1, [td2, 3.2 * k]);
  const thumb = [tb, tp1, tp2].map(p => lu_pj(p));
  // ordre : paume visible (paume vers la caméra) → doigts devant ; sinon la paume recouvre les doigts repliés
  const view = [0, Math.sin(D.G.elev), Math.cos(D.G.elev)], palmFacing = lu_dot3(pn, view) > 0;
  const fw = [2.7 * k, 2.4 * k, 1.9 * k, 1.6 * k];
  const drawF = f => {
    const path = lu_seg(f.pts.map(lu_P2), [fw[0] * (f.i === 3 ? 0.88 : 1), fw[1] * (f.i === 3 ? 0.88 : 1), fw[2] * (f.i === 3 ? 0.88 : 1), fw[3]], new Path2D(), 4);
    lu_part(D, path, skin, [0.8, 0.4], [0.9, 0.4]); lu_edge(D, path, edgeC, 0.8);
  };
  const drawT = () => { const path = lu_seg(thumb.map(lu_P2), [3.2 * k, 2.8 * k, 2.1 * k], new Path2D(), 4); lu_part(D, path, skin, [0.9, 0.4], [1.0, 0.4]); lu_edge(D, path, edgeC, 0.8); };
  const drawP = () => { lu_part(D, palmPath, skin, [1.2, 0.5], [1.4, 0.6]); lu_edge(D, palmPath, edgeC, 0.8); };
  const tDepth = lu_pj(tp1)[2], pDepth = lu_pj(P3(W3, [a, palmL * 0.5]))[2];
  const fs = fingers.slice().sort((p, q) => p.depth - q.depth);
  if (over.fingersOnly) { fs.forEach(drawF); drawT(); }
  else {
    if (tDepth < pDepth - 0.5) drawT();
    if (palmFacing) { drawP(); fs.forEach(drawF); } else { fs.forEach(drawF); drawP(); }
    if (tDepth >= pDepth - 0.5) drawT();
  }
  const grip = lu_pj(P3(W3, [a, palmL * 0.55], [pn, 2.2 * k]));
  return { x: grip[0], y: grip[1], palm: lu_pj(P3(W3, [a, palmL * 0.5])), tip: fingers.map(f => f.pts[3]), W: lu_pj(W3), dir: lu_dir2(lu_pj(W3), lu_pj(P3(W3, [a, 10]))) };
}
function lu_drawArm(D, sd) {
  const { c, K, sp } = D, M = sp.mats, A = sp.arm, ar = sd === 'L' ? D.P.L : D.P.R;
  const Sx = lu_pj(K.sh[sd]), E = lu_pj(K.el[sd]), W = lu_pj(K.wr[sd]);
  const fd = lu_dir2(E, W), hem = [W[0] - fd[0] * 2.4, W[1] - fd[1] * 2.4];
  const sleeve = lu_seg([lu_P2(Sx), lu_P2(E), hem], [A.w[0], A.w[1], A.w[2]], new Path2D(), 7);
  // manchette de chemise
  const cuffP = lu_seg([[W[0] - fd[0] * 3.6, W[1] - fd[1] * 3.6], [W[0] + fd[0] * 0.8, W[1] + fd[1] * 0.8]], [A.cuff, A.cuff - 0.3], new Path2D(), 4);
  lu_part(D, sleeve, M.jacket, [2.2, 1.0], [2.6, 1.1]); lu_edge(D, sleeve, M.jacket[4], 1);
  lu_part(D, cuffP, ar.glove ? (M.glove || M.shirt) : M.shirt, [0.9, 0.4], [1.0, 0.5]); lu_edge(D, cuffP, M.shirt[4], 0.8);
  // la main (dessinée après la manche) ; l'ordre manche / main : la manche recouvre le poignet
  const hnd = lu_drawHand(D, sd);
  // petit pli au coude
  return hnd;
}

// ── cou et tête
function lu_drawNeck(D) {
  const { c, K, sp } = D, M = sp.mats, N = sp.neck;
  const a = lu_pj(K.xfT.ap([0, N.y0, 0.5])), b = lu_pj(K.xfH.ap([0, -8.0, -0.6]));
  const path = lu_seg([lu_P2(a), lu_P2(b)], [N.a * 2, N.a * 1.96], new Path2D(), 4);
  lu_part(D, path, M.skin, [1.6, 0.7], [3.2, 1.4]);
  // ombre portée de la tête (mâchoire) sur le cou
  if (D.headOutline) { c.save(); c.clip(path); const sh = new Path2D(); sh.addPath(lu_spline(D.headOutline, true), new DOMMatrix([1, 0, 0, 1, -D.ll[0] * 1.8, -D.ll[1] * 1.8 + 2.3])); c.fillStyle = M.skin[3]; c.fill(sh); const sh2 = new Path2D(); sh2.addPath(lu_spline(D.headOutline, true), new DOMMatrix([1, 0, 0, 1, -D.ll[0] * 1.0, -D.ll[1] * 1.0 + 1.1])); c.fillStyle = M.skin[4]; c.fill(sh2); c.restore(); }
  lu_edge(D, path, M.skin[4], 0.8);
  return path;
}
function lu_hairlinePhi(sp) {
  // angle à partir duquel les cheveux recouvrent la rangée y (repère de la tête) : table y → φ
  return sp.head.hairline || [[-5.4, 3.2], [-4.0, 2.2], [-3.2, 1.62], [-0.5, 1.5], [1.6, 1.34], [3.4, 1.0], [4.8, 0.6], [5.8, 0.25], [6.6, 0.0], [11.5, 0.0]];
}
function lu_drawHead(D) {
  const { c, K, sp, P } = D, M = sp.mats, H = sp.head, S = D.surfH;
  const outl = D.headOutline || lu_outline(S, 15, 20), path = lu_spline(outl, true);
  // oreilles (derrière la tête côté éloigné d'abord)
  const ears = [];
  for (const sg of [-1, 1]) {
    const e0 = lu_sp(S, H.earY, sg * 1.5708, 0.0), phi0 = lu_phi0(S, H.earY), vis = Math.cos(lu_wrap(sg * 1.5708 - phi0));
    ears.push({ sg, vis, e0 });
  }
  ears.sort((p, q) => p.vis - q.vis);
  const drawEar = e => {
    const yawE = Math.abs(lu_wrap(P.yaw + P.head.yaw - e.sg * 0.0)), sn = Math.abs(Math.sin(yawE)), p = lu_pj(K.xfH.ap([e.sg * (S.lv(H.earY)[0] + 0.2), H.earY, -1.6]));
    const ear = lu_ell(p[0], p[1], 0.9 + 1.7 * sn, 3.0, 0);
    lu_part(D, ear, M.skin, [0.8, 0.4], [0.9, 0.4]); lu_edge(D, ear, M.skin[4], 0.8);
    if (sn > 0.5) { const inner = lu_ell(p[0] + 0.1, p[1] + 0.1, 0.7 * sn, 1.6, 0); lu_fill(D.c, inner, M.skin[3]); }
  };
  if (ears[0].vis < 0.0) drawEar(ears[0]);
  lu_part(D, path, M.skin, [3.0, 1.4], [3.4, 1.5]);
  lu_edge(D, path, M.skin[4], 0.9);
  if (ears[1].vis > 0.0) drawEar(ears[1]);
  const faceInfo = lu_faceVec(D);
  // cheveux : tout ce qui est au-dessus de la ligne d'implantation
  const hl = lu_hairlinePhi(sp), rows = [];
  c.save(); c.clip(path);
  const hairP = [];
  // bande de cheveux : rangées du haut vers le bas, de chaque côté de la face
  const yTop = 11.5, yBot = -7;
  const bald = sp.head.bald;
  for (const sg of [-1, 1]) {
    const poly = lu_band(S, yBot, yTop, y => sg < 0 ? -Math.PI + 0.001 : lu_tab(hl, y), y => sg < 0 ? -lu_tab(hl, y) : Math.PI - 0.001, 16, 0.55);
    if (poly) hairP.push(poly);
  }
  // calotte
  const cap = bald ? null : lu_band(S, 6.2, 11.6, y => -Math.PI + 0.001, y => Math.PI - 0.001, 6, 0.55);
  if (cap) hairP.push(cap);
  for (const poly of hairP) { const hp = polyPath(poly); lu_part(D, hp, M.hair, [1.4, 0.7], [1.6, 0.7]); }
  // mèches plaquées en arrière : lignes claires du front vers la nuque, sur un ellipsoïde un peu plus grand que le crâne
  if (sp.hairStyle === 'slick') {
    const hm = M.hair, ax = 7.9 * 1.07 + 0.5, ay = 10.6 * 1.07, az = 10.3 * 1.07, cyE = 0.7, czE = -1.2, view = [0, Math.sin(D.G.elev), Math.cos(D.G.elev)];
    const R3 = K.xfH;
    for (let i = 0; i < 7; i++) {
      const xi = (i - 3) / 3.6, pts = [], vis = [];
      for (let b = 0; b <= 9; b++) {
        const be = 0.32 + b * 0.27, cr = Math.sqrt(Math.max(0.01, 1 - xi * xi));
        const lx = xi * ax, ly = cyE + ay * Math.sin(be) * cr, lz = czE + az * Math.cos(be) * cr;
        const wp = R3.ap([lx, ly, lz]), n = lu_nrm3(R3.rt([lx / (ax * ax), (ly - cyE) / (ay * ay), (lz - czE) / (az * az)]));
        if (ly < 3.4 || lu_dot3(n, view) < 0.12) { vis.push(false); pts.push(null); continue; }
        vis.push(true); pts.push(lu_P2(lu_pj(wp)));
      }
      let run = [];
      const flush = () => { if (run.length > 2) { lu_line(c, run, D.cw * (i % 2 ? 0.8 : 1.1), i % 2 ? hm[1] : hm[2]); } run = []; };
      for (const p of pts) { if (p) run.push(p); else flush(); } flush();
    }
  }
  c.restore();
  return { path, faceInfo };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 8. VISAGE : nez en facettes, moustache, chapeau (vecteur dans le calque) ; yeux, sourcils, bouche en pixels (après le passage pixel)
// ════════════════════════════════════════════════════════════════════════════════════════
// ton d'une facette selon l'angle avec la lumière (mat = [base, l1, l2, d1, d2])
function lu_facetTone(D, p3, m) {
  const n = lu_nrm3(lu_cross3(lu_sub3(p3[1], p3[0]), lu_sub3(p3[2], p3[0]))), L3 = D.L3, d = lu_dot3(n, L3);
  return d > 0.62 ? m[2] : d > 0.2 ? m[1] : d > -0.25 ? m[0] : d > -0.65 ? m[3] : m[4];
}
function lu_facet(D, pts3, m, flipN) {                                 // pts3 : points 3D monde ; dessinée si elle regarde la caméra
  const G = D.G, a = pts3[0], b = pts3[1], c3 = pts3[2];
  let n = lu_cross3(lu_sub3(b, a), lu_sub3(c3, a)); if (flipN) n = lu_mul3(n, -1);
  const view = [0, Math.sin(G.elev), Math.cos(G.elev)];
  if (lu_dot3(n, view) <= 0) return false;
  const nn = lu_nrm3(n), d = lu_dot3(nn, D.L3), tone = d > 0.62 ? m[2] : d > 0.2 ? m[1] : d > -0.25 ? m[0] : d > -0.65 ? m[3] : m[4];
  const path = polyPath(pts3.map(p => lu_P2(lu_pj(p))));
  D.c.fillStyle = tone; D.c.fill(path); D.c.strokeStyle = tone; D.c.lineWidth = D.cw * 0.6; D.c.lineJoin = 'round'; D.c.stroke(path);
  return true;
}
function lu_headPt(D, x, y, z) { return D.K.xfH.ap([x, y, z]); }
const lu_zf = (S, y) => S.lv(y)[1];
function lu_drawNose(D) {
  const { c, K, sp } = D, M = sp.mats, S = D.surfH, H = sp.head, n = H.nose, w = H.noseW;
  const zr = lu_zf(S, 1.2) - 0.1, zt = lu_zf(S, -2.8) + n, za = lu_zf(S, -2.9) + 0.9, zb = lu_zf(S, -3.3) + 1.2;
  const R0 = lu_headPt(D, 0, 1.4, zr), T = lu_headPt(D, 0, -2.7, zt), Bm = lu_headPt(D, 0, -0.6, lu_zf(S, -0.6) + n * 0.45);
  const Al = lu_headPt(D, w, -3.0, za), Ar = lu_headPt(D, -w, -3.0, za), Ct = lu_headPt(D, 0, -3.5, zb);
  const Rl = lu_headPt(D, w * 0.55, 0.2, lu_zf(S, 0.2) + 0.2), Rr = lu_headPt(D, -w * 0.55, 0.2, lu_zf(S, 0.2) + 0.2);
  // côtés du nez (deux triangles) puis dessous
  lu_facet(D, [R0, T, Al], M.skin); lu_facet(D, [R0, Ar, T], M.skin);
  lu_facet(D, [Ct, Al, T], [M.skin[3], M.skin[3], M.skin[3], M.skin[4], M.skin[4]]); lu_facet(D, [Ct, T, Ar], [M.skin[3], M.skin[3], M.skin[3], M.skin[4], M.skin[4]]);
  return { T: lu_pj(T), Al: lu_pj(Al), Ar: lu_pj(Ar), R0: lu_pj(R0), Ct: lu_pj(Ct) };
}
// une rangée de la surface du visage : point (y, phi) → [x, y, prof]
const lu_fs = (D, y, phi, grow = 0) => lu_sp(D.surfH, y, phi, grow);
function lu_faceVec(D) {
  const { c, K, sp, P } = D, M = sp.mats, S = D.surfH, F = sp.face || {}, fc = P.face;
  const info = {};
  info.nose = lu_drawNose(D);
  // rides et creux (traits fins dans le ton d'ombre de la peau) : sillons du nez à la bouche, poches sous les yeux, front quand les sourcils montent
  const crease = (pts, w = 0.5, col = M.skin[3]) => { const vis = pts.every(p => Math.cos(lu_wrap(p[0] - lu_phi0(S, p[1]))) > 0.2); if (vis) lu_line(c, pts.map(p => lu_P2(lu_sp(S, p[1], p[0], 0.1))), D.cw * w * 1.6, col); };
  if (sp.age !== 0) for (const sg of [-1, 1]) {
    crease([[sg * 0.42, -3.7], [sg * 0.55, -5.4], [sg * 0.62, -7.0]], 0.5);
    crease([[sg * 0.40, -1.2], [sg * 0.72, -1.4]], 0.4);
    if (F.brow > 0.3 || fc.brow > 0.3) { crease([[sg * 0.1, 5.6], [sg * 0.55, 5.9]], 0.45); crease([[sg * 0.12, 4.7], [sg * 0.45, 4.9]], 0.4); }
  }
  lu_drawFacial(D);
  return info;
}

// ── pixels du visage (après le passage pixel : on ne peint que sur les pixels de peau du calque)
function lu_faceFx(D, fin, info) {
  const { sp, P, K, s, flip, cx, cy, o } = D, S = D.surfH, F = P.face, M = sp.mats, ti = sp.ti;
  const scr = p => [Math.round(cx + flip * s * p[0]), Math.round(cy + s * p[1])];
  const skin = new Set(M.skin.map(h => ti[h]));
  const isSkin = (x, y) => { const i = x - fin.x0, j = y - fin.y0; if (i < 0 || j < 0 || i >= fin.w || j >= fin.h) return false; const p = j * fin.w + i; return fin.occ[p] > 0 && skin.has(fin.ix[p]); };
  const put = (x, y, col) => { if (isSkin(x, y)) { L.fillStyle = col; L.fillRect(x, y, 1, 1); } };
  const hrow = (x0, x1, y, col) => { for (let x = x0; x <= x1; x++) put(x, y, col); };
  const E = o.eye && typeof o.eye === 'object' ? o.eye : {}, lidIn = typeof o.eye === 'number' ? o.eye : (E.lid ?? F.lid);
  const gaze = E.look || o.look || P.gaze;
  const fr = Math.round(D.t * 30), bl = lu_blink(D.t, sp.blinkSeed || 3);
  const blink = Math.max(bl, E.blink || 0, F.squint * 0.6);
  const eyeCol = sp.eyeCol || WO[2], browCol = sp.browCol || WO[1], lidCol = sp.lidCol || WO[0];
  const tb = s >= 2.6 ? 2 : 1;
  const eyes = [];
  for (const sg of [-1, 1]) {
    const y0e = 0.5, phi = sg * 0.56, ph0 = lu_phi0(S, y0e), nD = Math.cos(lu_wrap(phi - ph0));
    if (nD < 0.16) continue;
    const q = lu_sp(S, y0e, phi), [ex, ey] = scr(q);
    const ew = Math.max(3, Math.round(3.8 * s * (1 + 0.28 * F.wide) * Math.min(1, 0.25 + nD * 0.85)));
    let open = clamp(lidIn * (1 - blink)); const eh0 = Math.max(1, Math.round(ew * (0.34 + 0.12 * F.wide))), eh = open < 0.12 ? 0 : Math.max(ew >= 3 ? 2 : 1, Math.round(eh0 * (0.4 + 0.75 * open)));
    eyes.push({ sg, ex, ey, ew, eh, nD });
  }
  for (const e of eyes) {
    const { sg, ex, ey, ew, eh } = e, x0 = ex - Math.floor(ew / 2), x1 = x0 + ew - 1, y0 = ey - Math.floor(eh / 2), y1 = y0 + eh - 1;
    if (eh > 0) {
      for (let y = y0; y <= y1; y++) hrow(x0, x1, y, WH[1]);
      if (ew >= 6 && eh >= 3) { put(x0, y0, M.skin[0]); put(x1, y0, M.skin[0]); }
      const iw = Math.max(1, Math.round(ew * 0.4 * F.pupil)), gx = clamp(gaze[0], -1, 1), gy = clamp(gaze[1], -1, 1);
      const ix0 = Math.round(x0 + (ew - iw) / 2 + gx * (ew - iw) / 2 * 0.9) , ih = eh, iy0 = Math.round(y0 + gy * 0.4);
      // l'iris est rogné par la paupière (haut) : la paupière couvre sa première rangée quand l'œil est mi-clos
      for (let y = y0; y <= y1; y++) for (let x = ix0; x < ix0 + iw; x++) put(x, y, eyeCol);
      if (iw >= 3 && eh >= 2) put(ix0 + (iw >> 1), y0 + (eh > 2 ? 1 : 0), NI[0]);
      if (iw >= 3 && eh >= 3) put(ix0, y0 + 1, WH[3]);
      if (F.shine > 0.3 && eh >= 3) { put(ix0 + iw - 1, y1 - 0, WH[3]); put(ix0 + 1, y0, WH[3]); }
    }
    // paupière supérieure : trait sombre qui déborde un peu à l'angle extérieur
    const outer = sg > 0 ? 1 : 0; // (le côté « extérieur » dépend de la vue : on déborde des deux côtés si l'œil est large)
    hrow(x0 - (ew >= 6 ? 1 : 0), x1 + (ew >= 6 ? 1 : 0), y0 - 1, lidCol);
    if (tb > 1) hrow(x0, x1, y0 - 2, lidCol);
    if (ew >= 6) hrow(x0 + 1, x1 - 1, y0 - 1 - tb - 0, M.skin[3]);              // pli de la paupière
    if (eh > 0 && ew >= 5) hrow(x0 + 1, x1 - 1, y1 + 1, M.skin[3]);               // paupière inférieure
    e.y0 = y0; e.x0 = x0; e.x1 = x1;
  }
  // lunettes rondes : un anneau fin autour de chaque œil, un pont, une branche vers l'oreille
  if (sp.glasses && eyes.length) {
    const fc = sp.glassCol || NI[0], any = (x, y, col) => { const i = x - fin.x0, j = y - fin.y0; if (i >= 0 && j >= 0 && i < fin.w && j < fin.h && fin.occ[j * fin.w + i]) { L.fillStyle = col; L.fillRect(x, y, 1, 1); } };
    for (const e of eyes) {
      const r = Math.max(2.5, e.ew * 0.78), cx_ = e.ex, cy_ = e.y0 + (e.eh - 1) / 2;
      for (let a = 0; a < 40; a++) { const th = a / 40 * TAU; any(Math.round(cx_ + Math.cos(th) * r), Math.round(cy_ + Math.sin(th) * r * 0.92), fc); }
      if (s >= 2) any(Math.round(cx_ - r * 0.45), Math.round(cy_ - r * 0.5), WH[3]);
    }
    if (eyes.length === 2) { const a = eyes[0], b = eyes[1]; const y_ = Math.round(a.y0 + (a.eh - 1) / 2) - 1; const x0_ = Math.min(a.ex, b.ex) + Math.round(Math.max(2.5, a.ew * 0.78)), x1_ = Math.max(a.ex, b.ex) - Math.round(Math.max(2.5, b.ew * 0.78)); for (let x = x0_; x <= x1_; x++) any(x, y_, fc); }
  }
  // sourcils
  const br = F.brow, bIn = F.browIn;
  for (const sg of [-1, 1]) {
    const phiA = sg * 0.13, ph0 = lu_phi0(S, 3.2), nD = Math.cos(lu_wrap(sg * 0.5 - ph0)); if (nD < 0.16) continue;
    const asym = sg > 0 ? F.browAsym : -F.browAsym;
    const yb = 3.2 + br * 1.8 + asym * 1.0;
    const q1 = scr(lu_sp(S, yb + bIn * 1.2, phiA)), q2 = scr(lu_sp(S, yb + 0.55 + br * 0.3 + bIn * 0.3, sg * 0.5)), q3 = scr(lu_sp(S, yb - 0.25 - bIn * 0.5, sg * 0.88));
    const bc = sp.browCol || WO[1], btk = tb;
    for (const [a, b] of [[q1, q2], [q2, q3]]) {
      // trait épais d'un côté : on pose le trait puis on double d'un pixel au-dessus
      const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
      for (let i = 0; i <= n; i++) { const x = Math.round(a[0] + (b[0] - a[0]) * i / n), y = Math.round(a[1] + (b[1] - a[1]) * i / n); for (let k = 0; k < btk; k++) put(x, y - k, bc); }
    }
  }
  // bouche : un trait ferme, coins relevés par le sourire ; ouverture éventuelle
  const yc = (sp.mouthY ?? -7.0) - F.jaw * 0.5, mo = o.mouth !== undefined && typeof o.mouth === 'number' ? o.mouth : (o.mouth && o.mouth.open !== undefined ? o.mouth.open : F.mouth);
  const sm_ = (o.mouth && typeof o.mouth === 'object' && o.mouth.smile !== undefined) ? o.mouth.smile : F.smile;
  const phM = lu_phi0(S, yc), nM = Math.cos(lu_wrap(0 - phM));
  if (nM > 0.1) {
    const half = 0.27;
    const pL = lu_sp(S, yc - sm_ * 0.0 + (sm_ + F.smileAsym) * 0.85 * 0 , half), pC = lu_sp(S, yc - 0.3 * mo, 0);
    const cl = scr(lu_sp(S, yc + (sm_ + F.smileAsym) * 0.8, half)), cr = scr(lu_sp(S, yc + (sm_ - F.smileAsym) * 0.8, -half)), cm = scr(lu_sp(S, yc - 0.15, 0));
    const lipC = sp.lipCol || SK[1];
    const seg_ = (a, b, col) => { const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1); for (let i = 0; i <= n; i++) put(Math.round(a[0] + (b[0] - a[0]) * i / n), Math.round(a[1] + (b[1] - a[1]) * i / n), col); };
    if (mo > 0.08) {
      const hgt = Math.max(1, Math.round(mo * 2.4 * s)), wd = Math.max(2, Math.round(2.6 * s * nM));
      for (let j = 0; j < hgt; j++) hrow(cm[0] - (wd >> 1) + (j === hgt - 1 && hgt > 2 ? 1 : 0), cm[0] + (wd >> 1) - (j === hgt - 1 && hgt > 2 ? 1 : 0), cm[1] + j, NI[1]);
      if (hgt >= 2) hrow(cm[0] - (wd >> 1) + 1, cm[0] + (wd >> 1) - 1, cm[1], WH[2]);
    } else { seg_(cl, cm, lipC); seg_(cm, cr, lipC); }
    // lèvre inférieure : un pixel plus clair dessous
    if (s >= 1.8 && mo <= 0.08) { const a = Math.min(cl[0], cr[0]) + 1, b = Math.max(cl[0], cr[0]) - 1; hrow(a, b, cm[1] + 1, M.skin[1]); }
  }
  return eyes;
}
const lu_blink = (t, seed) => { const per = 3.4 + lu_h(seed, 5) * 1.2, ph = ((t + lu_h(seed, 9) * per) % per), k = (ph - (per - 0.2)) / 0.2; return k > 0 ? Math.sin(Math.PI * clamp(k)) : 0; };

// ── pilosité du visage : moustaches (pencil, chevron, walrus, handlebar), barbes (goatee, full, chops) : bandes sur la surface de la tête
function lu_surfCurve(D, pts, ws, mat, grow = 0.6) {                    // courbe tracée sur le visage : pts = [[phi, y], …] ; seulement les parties visibles
  const S = D.surfH, out = [], ph0 = i => lu_phi0(S, pts[i][1]);
  const P2 = pts.map((p, i) => lu_sp(S, p[1], p[0], grow));
  const vis = pts.map((p, i) => Math.cos(lu_wrap(p[0] - ph0(i))) > 0.12);
  if (!vis.every(v => v)) { // garde les segments visibles (au moins 2 points d'affilée)
    let run = []; const runs = [];
    for (let i = 0; i < pts.length; i++) { if (vis[i]) run.push(i); else { if (run.length > 1) runs.push(run); run = []; } }
    if (run.length > 1) runs.push(run);
    for (const r of runs) lu_surfCurve(D, r.map(i => pts[i]), r.map(i => ws[i]), mat, grow);
    return;
  }
  const path = lu_seg(P2.map(lu_P2), ws, new Path2D(), 4);
  lu_part(D, path, mat, [0.5, 0.3], [0.6, 0.3]); lu_edge(D, path, mat[4], 0.5);
}
function lu_drawFacial(D) {
  const { sp } = D, S = D.surfH, M = sp.mats, F = sp.facial; if (!F) return;
  const hair = M.hair, mousM = M.mous || M.hair, beardM = M.beard || M.hair;
  const bandSym = (y0, y1, phiTop, phiBot, mat, grow = 0.5, n = 6, noEdge = false) => {
    const b = lu_band(S, y0, y1, y => -(phiBot + (phiTop - phiBot) * (y - y0) / (y1 - y0)), y => (phiBot + (phiTop - phiBot) * (y - y0) / (y1 - y0)), n, grow);
    if (b) { const p = polyPath(b); lu_part(D, p, mat, [0.6, 0.3], [0.7, 0.3]); if (!noEdge) lu_edge(D, p, mat[4], 0.5); }
  };
  const bandSide = (sg, y0, y1, p0, p1, mat, grow = 0.5, n = 6) => {
    const b = lu_band(S, y0, y1, y => sg < 0 ? -p1 : p0, y => sg < 0 ? -p0 : p1, n, grow);
    if (b) { const p = polyPath(b); lu_part(D, p, mat, [0.6, 0.3], [0.7, 0.3]); lu_edge(D, p, mat[4], 0.5); }
  };
  const k = F.mous || 'none', bd = F.beard || 'none';
  // barbes : dessous, puis moustache par-dessus
  if (bd === 'goatee') { bandSym(-11.4, -8.4, 0.34, 0.2, beardM, 0.9, 6); }
  if (bd === 'full') { bandSide(1, -11.6, -3.2, 0.75, 1.62, beardM, 0.75, 8); bandSide(-1, -11.6, -3.2, 0.75, 1.62, beardM, 0.75, 8); bandSym(-11.6, -8.0, 0.78, 0.6, beardM, 0.85, 6); bandSym(-8.0, -7.0, 0.8, 0.7, beardM, 0.8, 3); }
  if (bd === 'chops') { for (const sg of [-1, 1]) bandSide(sg, -7.6, 1.6, 1.0, 1.55, beardM, 0.55, 7); }
  if (k === 'pencil') bandSym(-5.4, -4.75, 0.42, 0.4, mousM, 0.4, 4, true);
  else if (k === 'chevron') bandSym(-6.6, -4.3, 0.62, 0.5, mousM, 0.65, 5);
  else if (k === 'walrus') { bandSym(-7.6, -4.1, 0.76, 0.55, mousM, 0.8, 6); for (const sg of [-1, 1]) bandSide(sg, -9.0, -5.4, 0.42, 0.88, mousM, 0.7, 5); }
  else if (k === 'handlebar') {
    bandSym(-6.4, -4.3, 0.62, 0.5, mousM, 0.65, 5);
    for (const sg of [-1, 1]) lu_surfCurve(D, [[sg * 0.5, -5.4], [sg * 0.8, -6.0], [sg * 1.0, -5.0], [sg * 1.08, -3.6]], [2.6, 2.2, 1.6, 1.0], mousM, 0.8);
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 9. CHAPEAUX (feutre, haut-de-forme, melon, canotier, casquette) : 3D simple, repère du chapeau : origine au centre du plan du bord, y vers le haut
// ════════════════════════════════════════════════════════════════════════════════════════
const lu_HATS = {
  homburg: { rx: 12.2, rz: 13.0, curl: 1.3, snap: 0.9, crown: [[0, 8.8, 10.1, -10.3], [3, 8.8, 10.1, -10.3], [9, 8.4, 9.7, -9.8], [11.6, 8.0, 9.2, -9.3], [12.2, 6.9, 8.0, -8.1], [12.5, 5.5, 6.7, -6.8]], band: [0.4, 2.8], top: 'dent', topY: 12.5, bow: true },
  top: { rx: 11.8, rz: 12.8, curl: 2.0, crown: [[0, 8.7, 9.8, -9.8], [8, 8.8, 9.9, -9.9], [15, 9.2, 10.3, -10.3], [17.2, 8.6, 9.7, -9.7], [17.8, 6.5, 7.6, -7.6]], band: [0.4, 3.6], top: 'flat', topY: 17.8 },
  bowler: { rx: 11.8, rz: 12.8, curl: 1.3, crown: [[0, 9.8, 10.8, -10.9], [3, 9.9, 10.9, -11.0], [6.2, 9.2, 10.2, -10.3], [9.2, 7.4, 8.4, -8.7], [11.2, 4.4, 5.2, -5.8], [11.9, 1.4, 2.0, -2.4]], band: [0.4, 2.6], top: 'round', topY: 11.9 },
  fedora: { rx: 14.0, rz: 14.8, curl: 1.0, crown: [[0, 9.4, 10.4, -10.6], [5, 9.3, 10.3, -10.5], [9.5, 8.6, 9.6, -9.8], [11.5, 7.0, 8.0, -8.4], [12.2, 4.6, 5.4, -5.8]], band: [0.5, 3.4], top: 'dent', topY: 12.2 },
  boater: { rx: 13.6, rz: 14.0, curl: 0.0, crown: [[0, 9.2, 10.2, -10.4], [4, 9.2, 10.2, -10.4], [6.6, 9.0, 10.0, -10.2], [7.1, 7.6, 8.6, -8.8]], band: [0.4, 2.4], top: 'flat', topY: 7.1 },
  cap: { rx: 10.8, rz: 11.6, curl: 0.0, crown: [[0, 9.6, 10.6, -10.8], [2.4, 9.8, 10.8, -11.0], [5, 8.8, 9.8, -10.0], [6.2, 6.4, 7.2, -7.6]], band: [0, 0.01], top: 'round', topY: 6.2, visor: true },
};
// dessine un chapeau ; xf : repère du chapeau → monde ; mats : { hat, ribbon } ; renvoie le chemin du chapeau
function lu_hatRing(xf, g, off = 0, grow = 0) {
  const N = 32, pts = [];
  for (let k = 0; k < N; k++) { const ph = k * TAU / N, sx = Math.sin(ph), cz = Math.cos(ph); let rz = g.rz; if (g.visor) rz = cz > 0 ? g.rz * 1.18 : g.rz * 0.92; pts.push(lu_P2(lu_pj(xf.ap([(g.rx + grow) * sx, g.curl * sx * sx + off - (g.snap || 0) * cz, (rz + grow) * cz])))); }
  return pts;
}
function lu_drawHatGeom(D, xf, style, mats, opt = {}) {
  const c = D.c, g = lu_HATS[style] || lu_HATS.homburg, G = D.G, view = [0, Math.sin(G.elev), Math.cos(G.elev)];
  const up = xf.rt([0, 1, 0]), topVis = lu_dot3(up, view) > -0.02;
  const ring = (off = 0, grow = 0) => lu_hatRing(xf, g, off, grow);
  if (g.curl !== undefined && !opt.noBrim) {
    const under = polyPath(ring(-1.1)); lu_fill(c, under, mats.hat[4]);
    const top = polyPath(ring(0)); lu_part(D, top, topVis ? mats.hat : [mats.hat[3], mats.hat[3], mats.hat[3], mats.hat[4], mats.hat[4]], [2.0, 0.9], [2.2, 1.0]); lu_edge(D, top, mats.hat[4], 0.9);
    // arête du bord : bord épais côté caméra
    c.save(); c.clip(top); const ring2 = ring(0, -1.4); c.restore();
  }
  // calotte
  const S = lu_surf(g.crown, xf), outl = lu_outline(S, 12, 22), cp = polyPath(outl);
  lu_part(D, cp, mats.hat, [2.8, 1.2], [3.0, 1.3]);
  c.save(); c.clip(cp);
  // ruban
  const rb = lu_band(S, g.band[0], g.band[1], y => -Math.PI + 0.001, y => Math.PI - 0.001, 5, 0.18);
  if (rb && g.band[1] > g.band[0] + 0.1) { const rp = polyPath(rb); lu_part(D, rp, mats.ribbon, [0.7, 0.3], [0.8, 0.3]); }
  // pli du feutre : sillon vertical à l'avant de la calotte
  if (g.top === 'dent') {
    const fr = lu_band(S, g.topY * 0.55, g.topY + 0.2, y => -0.06 - 0.26 * (y - g.topY * 0.55) / (g.topY * 0.45), y => 0.06 + 0.26 * (y - g.topY * 0.55) / (g.topY * 0.45), 5, 0.2);
    if (fr) { const fp = polyPath(fr); lu_fill(c, fp, mats.hat[3]); lu_cres(c, fp, D.ll, 0.5, mats.hat[4], true); }
    const fr2 = lu_band(S, g.topY * 0.6, g.topY + 0.2, y => 0.07 + 0.25 * (y - g.topY * 0.6) / (g.topY * 0.4), y => 0.14 + 0.4 * (y - g.topY * 0.6) / (g.topY * 0.4), 5, 0.2); if (fr2) lu_fill(c, polyPath(fr2), mats.hat[2]);
  }
  // dessus : ellipse du plateau, avec le pli central du feutre
  const yT = g.topY, [aT, zfT, zbT] = S.lv(yT - 0.05);
  const tp = []; for (let k = 0; k < 24; k++) { const ph = k * TAU / 24; tp.push(lu_P2(lu_pj(xf.ap([aT * Math.sin(ph), yT, (zfT + zbT) / 2 + (zfT - zbT) / 2 * Math.cos(ph)])))); }
  if (topVis) {
    const tpath = polyPath(tp); lu_fill(c, tpath, mats.hat[1]); lu_cres(c, tpath, D.ll, 1.4, mats.hat[2]); lu_cres(c, tpath, D.ll, 1.6, mats.hat[3], true);
    if (g.top === 'dent') { const a = lu_P2(lu_pj(xf.ap([0, yT - 0.5, zfT - 0.8]))), b = lu_P2(lu_pj(xf.ap([0, yT - 0.5, zbT + 0.8]))); lu_line(c, [a, b], D.cw * 1.4, mats.hat[3]); }
  }
  c.restore();
  lu_edge(D, cp, mats.hat[4], 1);
  // bosse : petite pince au milieu du ruban (pas dans l'ombre)
  return cp;
}
function lu_hatXf(D) {                                                  // repère du chapeau posé sur la tête
  const { K, P, sp } = D, h = P.hat, Mh = K.Mh, M = lu_mm(Mh, lu_mm(lu_Rz(h.roll), lu_Rx(h.pitch)));
  const o = lu_add3(K.headC, lu_rotv(Mh, [h.dx, sp.hat.seat + h.dy, sp.hat.back + h.dz]));
  return lu_xf(M, o);
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 5. LE PERSONNAGE : assemblage (lumière, pose, squelette, ordre de peinture, passage pixel, ancrages)
// ════════════════════════════════════════════════════════════════════════════════════════
const lu_POSES = {};
const lu_CROPS = { waist: 105, chest: 128, belly: 98, hips: 90 };
function lu_poseOf(sp, o, t) {
  const get = name => { const f = lu_POSES[name || 'stand'] || lu_POSES.stand; return f(sp, o.u ?? t, o, lu_base(sp), t); };
  let P = get(o.pose);
  if (o.pose2 && o.mix > 0) P = o.mix >= 1 ? get(o.pose2) : lu_blend(P, get(o.pose2), (o.ease === false) ? o.mix : sm(clamp(o.mix)));
  // assis : bassin posé sur un siège de 46 px, cuisses à l'horizontale, pieds à plat devant
  if (o.sit) {
    const k = clamp(o.sit === true ? 1 : o.sit), seat = o.seat ?? 46, d = sp.hipY - (seat + 2);
    P.drop = lerp(P.drop, d, k); P.hipZ = lerp(P.hipZ, -3, k); P.hipX = lerp(P.hipX, 0, k); P.hipTilt = lerp(P.hipTilt, 0, k); P.twistP = lerp(P.twistP, 0, k);
    const th = sp.thigh * 0.92;
    P.legL = { x: lerp(P.legL.x, sp.hipSep + 1.0, k), z: lerp(P.legL.z, th, k), h: lerp(P.legL.h, 0, k), pitch: lerp(P.legL.pitch, 0, k), yawF: lerp(P.legL.yawF, -0.1, k) };
    P.legR = { x: lerp(P.legR.x, -(sp.hipSep + 1.0), k), z: lerp(P.legR.z, th + 3, k), h: lerp(P.legR.h, 0, k), pitch: lerp(P.legR.pitch, 0, k), yawF: lerp(P.legR.yawF, 0.1, k) };
  }
  return P;
}
function lu_figure(cx, cy, s, t, o, sp) {
  o = o || {};
  if (!sp.tones) lu_prep(sp);
  const flip = o.flip ? -1 : 1, sil = o.sil || null;
  let Lx, Ly; if (Array.isArray(o.light)) { Lx = o.light[0]; Ly = o.light[1]; } else { Lx = 0.8 * (o.light ?? 1); Ly = -0.6; }
  const ln = Math.hypot(Lx, Ly) || 1, Ls = [Lx / ln, Ly / ln], ll = [Ls[0] * flip, Ls[1]];
  const elev = o.elev ?? lu_ELEV, ca = Math.cos(elev);
  const P = lu_poseOf(sp, o, t);
  if (o.yaw !== undefined) P.yaw = o.yaw;
  if (o.lookX) P.head.yaw += o.lookX;
  if (o.bend) P.lean += o.bend;
  if (o.gloves) { P.L.glove = 1; P.R.glove = 1; }
  const cropY = o.crop ? (typeof o.crop === 'number' ? o.crop : (lu_CROPS[o.crop] || lu_CROPS.waist)) : 0;
  const gcy = cy + cropY * ca * s;                                   // ordonnée écran du sol sous le bassin
  const G = lu_G = { s, flip, elev, ca, sa: Math.sin(elev), bb: [1e9, 1e9, -1e9, -1e9], ll, Ls, cw: Math.max(1.25 / s, 0.5) };
  const K = lu_skeleton(sp, P);
  lu_layer(); const c = Y; c.setTransform(flip * s, 0, 0, s, cx, gcy);
  const L3 = lu_nrm3([ll[0], -ll[1], 0.55]);
  const D = { c, sp, P, K, G, ll, cw: G.cw, o, t, s, flip, cx, cy: gcy, L3, crop: cropY, Ls_x: () => Ls[0] };
  D.surfT = lu_surf(cropY ? lu_cropLevels(sp.torso) : sp.torso, K.xfT); D.surfH = lu_surf(sp.head.levels, K.xfH);
  D.hands = {};
  // ordre de peinture
  const dp = p => lu_pj(p)[2];
  const items = [];
  const legK = sd => dp(K.an[sd]);
  if (!cropY) for (const sd of legK('L') < legK('R') ? ['L', 'R'] : ['R', 'L']) items.push({ k: -1e4 + legK(sd), f: () => lu_drawLeg(D, sd) });
  const tk = dp(lu_add3(K.Pw, lu_rotv(K.Mt, [0, 30, 0])));
  items.push({ k: tk, f: () => lu_drawTorso(D) });
  const legMin = cropY ? -1e3 : Math.min(legK('L'), legK('R'));
  for (const sd of ['L', 'R']) { const ar = sd === 'L' ? P.L : P.R; let k = (dp(K.el[sd]) + dp(K.wr[sd])) / 2 + ar.zb; if (ar.zb === 0 && k < legMin - 3) k = -2e4 + k; items.push({ k, f: () => { D.hands[sd] = lu_drawArm(D, sd); } }); }
  items.push({ k: dp(K.headC) + 0.5, f: () => lu_drawHeadGroup(D) });
  if (P.hatHeld > 0.5 && sp.hat && o.hat !== false) items.push({ k: 1e3, f: () => lu_drawHeldHat(D) });
  items.sort((a, b) => a.k - b.k);
  for (const it of items) it.f();
  // coupe éventuelle (une table devant lui)
  if (o.clipY !== undefined) { Y.setTransform(1, 0, 0, 1, 0, 0); Y.clearRect(0, o.clipY, LW, LH); }
  const bb = G.bb, mg = 7;
  const box = [cx + (flip > 0 ? bb[0] : -bb[2]) * s - mg, gcy + bb[1] * s - mg, cx + (flip > 0 ? bb[2] : -bb[0]) * s + mg, gcy + bb[3] * s + mg];
  // ombre portée projetée sur le sol (silhouette cisaillée par la lumière)
  const shA = (o.shadow ?? 0.42) * (sil || cropY ? 0 : 1);
  let shadow = null;
  if (shA > 0) {
    const kk = o.shadowK || [-clamp(Ls[0] / (Math.abs(Ls[1]) + 0.25), -2.4, 2.4) * 0.85 * flip * 0 + -clamp(Ls[0] / (Math.abs(Ls[1]) + 0.25), -2.4, 2.4) * 0.85, 0.2];
    shadow = { a: shA, kx: kk[0], ky: kk[1], gy: gcy, col: o.shadowCol || DU[1] };
    lu_blob(cx, gcy + 1.5 * s, 21 * s, 3.4 * s, shA * 0.9);
  }
  const skinTones = new Set(sp.mats.skin.map(h => sp.ti[h]));
  const cheeks = lu_cheeks(D);
  const info = lu_finish(box, { spec: sp, Ls, sun: o.rim, sil, rimW: s >= 3.2 ? 2 : 1, shadow, blush: cheeks, skinTones });
  D.fin = info;
  const eyes = sil ? [] : lu_faceFx(D, info);
  const res = lu_anchors(D, info, eyes);
  // objet tenu : le plan dessine (appel de fonction), puis les doigts repassent par-dessus
  lu_holdPass(D, res, box, { spec: sp, Ls, sun: o.rim, sil, rimW: s >= 3.2 ? 2 : 1 });
  return res;
}
// joues qui rougissent : ellipses (x, y, rx, ry, densité) en pixels écran
function lu_cheeks(D) {
  const { P, sp, s, flip, cx, cy } = D, b = clamp((D.o.blush ?? P.face.blush) || 0); if (b <= 0.01) return null;
  const S = D.surfH, out = [];
  for (const sg of [-1, 1]) {
    const y = -3.6, phi = sg * 0.85, ph0 = lu_phi0(S, y), nD = Math.cos(lu_wrap(phi - ph0)); if (nD < 0.2) continue;
    const q = lu_sp(S, y, phi), X = cx + flip * s * q[0], Y_ = cy + s * q[1];
    out.push([X, Y_, 3.4 * s * (0.45 + 0.6 * nD), 2.7 * s, b * 0.62, sp.blushCol || RD[5]]);
  }
  return out;
}
function lu_cropLevels(lv) {                                         // torse sans jambes (derrière une table) : on prolonge le veston vers le bas
  const out = lv.map(l => l.slice()); const f = out[0];
  return [[-40, f[1] * 0.96, f[2], f[3]], [-18, f[1], f[2], f[3]]].concat(out);
}
function lu_anchors(D, info, eyes) {
  const { K, P, s, flip, cx, cy, sp } = D, S = D.surfH;
  const X = p => cx + flip * s * p[0], Yy = p => cy + s * p[1], A = p => [X(p), Yy(p)];
  const hands = {};
  for (const sd of ['L', 'R']) { const h = D.hands[sd]; if (h) hands[sd] = { x: X([h.x]), y: Yy([0, h.y]), palm: [X(h.palm), Yy(h.palm)], wrist: [X(h.W), Yy(h.W)], dir: [h.dir[0] * flip, h.dir[1]], ang: Math.atan2(h.dir[1], h.dir[0] * flip), tips: h.tip.map(q => [X(q), Yy(q)]) }; }
  const headC = lu_pj(K.headC), eyeM = lu_sp(S, 0.5, 0), mouth = lu_sp(S, -7.0, 0), nose = lu_sp(S, -2.7, 0, sp.head.nose);
  const feet = (() => { const a = lu_pj(K.an.L), b = lu_pj(K.an.R); return [(X(a) + X(b)) / 2, cy + s * (a[1] + b[1]) / 2 + sp.ankle * D.G.ca * s]; })();
  const hat = D.hatInfo || null;
  return {
    head: A(headC), eye: A(eyeM), mouth: A(mouth), nose: A(nose),
    handL: hands.L ? [hands.L.x, hands.L.y] : null, handR: hands.R ? [hands.R.x, hands.R.y] : null, hands,
    hat: hat ? [hat.x, hat.y, hat.rot] : null, feet,
    bbox: info.bbox, mask: info.mask, scale: s, flip,
  };
}
function lu_holdPass(D, res, box, st) {
  const o = D.o; if (!o.hold && !o.cane) return;
  const fns = typeof o.hold === 'function' ? { [o.holdHand || D.P.hold || 'R']: o.hold } : (o.hold || {});
  if (o.cane && !fns.R && !fns.L) fns[o.holdHand || 'R'] = (x, y, info) => lu_cane(D, x, y, info);
  for (const sd in fns) {
    const h = res.hands[sd]; if (!h) continue;
    const info = { sd, x: h.x, y: h.y, ang: h.ang, dir: h.dir, palm: h.palm, wrist: h.wrist, tips: h.tips, scale: D.s, flip: D.flip, back: [-h.dir[1], h.dir[0]] };
    L.setTransform(1, 0, 0, 1, 0, 0);
    fns[sd](h.x, h.y, info);
    // les doigts repassent par-dessus l'objet
    lu_layer(); Y.setTransform(D.flip * D.s, 0, 0, D.s, D.cx, D.cy); lu_G = D.G; D.c = Y;
    lu_drawHand(D, sd, { fingersOnly: true });
    const bb = [h.x - 22 * D.s, h.y - 22 * D.s, h.x + 22 * D.s, h.y + 22 * D.s];
    lu_finish(bb, Object.assign({}, st, { shadow: null, rimK: 1 }));
  }
}
function lu_drawHeadGroup(D) {
  const { c, K, sp, P } = D, M = sp.mats, S = D.surfT, T = sp.torso[sp.torso.length - 1][0], tn = sp.neck.a;
  // col du veston (dos et côtés) puis cou puis col de chemise, nœud, tête, chapeau
  const Sc = lu_surf([[T - 9.5, tn + 2.3, tn + 2.3, -(tn + 1.5)], [T + 2.5, tn + 1.9, tn + 1.9, -(tn + 1.3)]], K.xfT);
  for (const sg of [-1, 1]) { const jb = lu_band(Sc, T - 7, T - 1, y => sg < 0 ? -Math.PI + 0.01 : 0.7, y => sg < 0 ? -0.7 : Math.PI - 0.01, 6); if (jb) { const jp = polyPath(jb); lu_part(D, jp, M.jacket, [1.4, 0.6], [1.6, 0.6]); lu_edge(D, jp, M.jacket[4], 0.8); } }
  D.headOutline = lu_outline(D.surfH, 15, 20);
  lu_drawNeck(D);
  const Sh = lu_surf([[T - 7.5, tn + 0.9, tn + 1.0, -(tn + 0.9)], [T + 3.5, tn + 0.6, tn + 0.8, -(tn + 0.8)]], K.xfT);
  for (const sg of [-1, 1]) { const cb = lu_band(Sh, T - 2.6, T + 0.2, y => sg < 0 ? -2.6 : 0.2, y => sg < 0 ? -0.2 : 2.6, 6); if (cb) { const cp = polyPath(cb); lu_part(D, cp, M.shirt, [0.9, 0.4], [1.1, 0.5]); lu_edge(D, cp, M.shirt[4], 0.8); } }
  // nœud de cravate
  if (sp.tie) { const kn = lu_band(S, T - 7.9, T - 2.3, y => -0.2, y => 0.2, 5, 0.9); if (kn) { const kp = polyPath(kn); lu_part(D, kp, M.tie, [0.8, 0.4], [1.0, 0.5]); lu_edge(D, kp, M.tie[4], 0.8); } }
  const hd = lu_drawHead(D);
  // chapeau
  const o = D.o;
  if (sp.hat && sp.hat.style !== 'none' && o.hat !== false) {
    const style = o.hatStyle || sp.hat.style;
    let xf = lu_hatXf(D);
    if (P.hatHeld > 0.5) return;
    if (typeof o.hat === 'number' && o.hat > 0) xf = lu_hatFlight(D, xf, o.hat);
    const o0 = lu_pj(xf.T);
    D.hatInfo = { x: D.cx + D.flip * D.s * o0[0], y: D.cy + D.s * o0[1], rot: Math.atan2(xf.rt([1, 0, 0])[1] * -1, xf.rt([1, 0, 0])[0]) * D.flip };
    // ombre du bord sur le front
    if (typeof o.hat !== 'number' || o.hat === 0) {
      const g = lu_HATS[style] || lu_HATS.homburg, ring = lu_hatRing(xf, g, 0, 0).map(p => [p[0], p[1] + 2.6]);
      c.save(); c.clip(lu_spline(D.headOutline, true)); c.fillStyle = 'rgba(5,4,15,0.42)'; c.fill(polyPath(ring)); c.restore();
    }
    lu_drawHatGeom(D, xf, style, { hat: M.hat, ribbon: M.ribbon });
  }
}
// trajectoire du chapeau emporté : monte, recule et tourne (f de 0 à 1,4) ; le repère de départ est celui du chapeau sur la tête
function lu_hatFlight(D, xf0, f) {
  const ya = D.P.yaw, back = [-Math.sin(ya), 0, -Math.cos(ya) * 0.4], dist = 78 * f, up = 120 * f - 105 * f * f;
  const R = lu_mm(lu_Rz(f * 3.4), lu_Rx(f * 2.2));
  return lu_xf(lu_mm(R, xf0.M), lu_add3(xf0.T, [back[0] * dist, up, back[2] * dist]));
}

// chapeau tenu à deux mains par le bord (devant le ventre, honte, respect)
function lu_drawHeldHat(D) {
  const { K, sp, P } = D, M = sp.mats, A = sp.arm;
  const g = sd => lu_add3(K.wr[sd], lu_mul3(K.hdir[sd], A.hand * 0.45));
  const a = g('L'), b = g('R'), mid = lu_mul3(lu_add3(a, b), 0.5), up = [0, 3.6, 0];
  const ya = P.yaw, M3 = lu_mm(lu_Ry(ya * 0.4), lu_Rx(P.heldTilt ?? 0.5));
  const xf = lu_xf(M3, lu_add3(mid, up));
  lu_drawHatGeom(D, xf, D.o.hatStyle || sp.hat.style, { hat: M.hat, ribbon: M.ribbon });
  for (const sd of ['L', 'R']) lu_drawHand(D, sd, { fingersOnly: true });
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 10. ACCESSOIRES : canne, chapeau seul
// ════════════════════════════════════════════════════════════════════════════════════════
// canne tenue par la main (x, y) : plantée devant lui (le manche dépasse un peu au-dessus de la main)
function lu_cane(D, x, y, info) {
  const s = D.s, gy = D.cy, fw = (Math.sin(D.P.yaw) >= 0 ? 1 : -1) * D.flip, Lc = (D.sp.H * 0.52) * s, grip = Lc * 0.8, dyg = gy - y;
  const dx = Math.sqrt(Math.max(1, grip * grip - Math.min(dyg, grip * 0.98) ** 2)) * fw * (D.o.caneLean ?? 1);
  const tip = [x + dx, y + Math.min(dyg, grip * 0.98)], top = [x - dx * 0.25, y - Lc * 0.2 * Math.sqrt(1 - (dx / grip) ** 2 * 0.0) * 0.98];
  const dir = lu_dir2(tip, top), up = [x + (top[0] - x), y + (top[1] - y)];
  const w = Math.max(1.6, 1.9 * s);
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.lineCap = 'round';
  L.strokeStyle = NI[0]; L.lineWidth = w + 1.4; L.beginPath(); L.moveTo(tip[0], tip[1]); L.lineTo(up[0], up[1]); L.stroke();
  L.strokeStyle = NI[2]; L.lineWidth = w; L.beginPath(); L.moveTo(tip[0], tip[1]); L.lineTo(up[0], up[1]); L.stroke();
  L.strokeStyle = ST[4]; L.lineWidth = Math.max(0.8, w * 0.35); L.beginPath(); L.moveTo(tip[0] + D.Ls_x() * w * 0.25, tip[1]); L.lineTo(up[0] + D.Ls_x() * w * 0.25, up[1]); L.stroke();
  // bout ferré
  L.strokeStyle = ST[6]; L.lineWidth = w; L.beginPath(); L.moveTo(tip[0], tip[1]); L.lineTo(tip[0] + (up[0] - tip[0]) * 0.05, tip[1] + (up[1] - tip[1]) * 0.05); L.stroke();
  // pommeau
  const r = Math.max(2, 2.7 * s);
  L.fillStyle = NI[0]; L.beginPath(); L.arc(up[0], up[1], r + 0.8, 0, TAU); L.fill();
  L.fillStyle = ST[6]; L.beginPath(); L.arc(up[0], up[1], r, 0, TAU); L.fill();
  L.fillStyle = WH[3]; L.beginPath(); L.arc(up[0] + D.Ls_x() * r * 0.35, up[1] - r * 0.35, Math.max(0.8, r * 0.35), 0, TAU); L.fill();
  L.restore();
}
// chapeau seul (sur une table, au sol, en l'air) : lu_hat(cx, cy, s, rot, o) ; (cx, cy) = centre du plan du bord ; rot = rotation dans l'image (rad) ;
// o.who 'lustig' (feutre gris), 'marchand' (melon brun-noir), 'm1'..'m5' ; o.style ; o.yaw (vue : 0 de face, 1,57 de profil) ; o.pitch (bout du bord vers le bas > 0) ; o.roll ; o.light ; o.rim ; o.flip ; o.shadow
function lu_hat(cx, cy, s, rot, o) {
  o = o || {};
  const sp = lu_WHO[o.who || 'lustig'] || lu_SPEC_LUSTIG;
  if (!sp.tones) lu_prep(sp);
  const flip = o.flip ? -1 : 1;
  let Lx, Ly; if (Array.isArray(o.light)) { Lx = o.light[0]; Ly = o.light[1]; } else { Lx = 0.8 * (o.light ?? 1); Ly = -0.6; }
  const ln = Math.hypot(Lx, Ly) || 1, Ls = [Lx / ln, Ly / ln];
  const rr = rot || 0, c_ = Math.cos(rr), s_ = Math.sin(rr);
  // lumière dans le repère du modèle : on annule la rotation et la symétrie
  const lx0 = Ls[0], ly0 = Ls[1], lxm = (lx0 * c_ + ly0 * s_) * flip, lym = -lx0 * s_ + ly0 * c_, ll = [lxm, lym];
  const elev = o.elev ?? lu_ELEV;
  const G = lu_G = { s, flip, elev, ca: Math.cos(elev), sa: Math.sin(elev), bb: [1e9, 1e9, -1e9, -1e9], ll, Ls, cw: Math.max(1.25 / s, 0.5) };
  lu_layer(); const c = Y; c.setTransform(1, 0, 0, 1, 0, 0); c.translate(cx, cy); c.rotate(rr); c.scale(flip * s, s);
  const D = { c, sp, G, ll, cw: G.cw, o, s, flip, L3: lu_nrm3([ll[0], -ll[1], 0.55]) };
  const xf = lu_xf(lu_mm(lu_Ry(o.yaw ?? 0.55), lu_mm(lu_Rz(o.roll || 0), lu_Rx(o.pitch || 0))), [0, 0, 0]);
  lu_drawHatGeom(D, xf, o.style || sp.hat.style, { hat: sp.mats.hat, ribbon: sp.mats.ribbon });
  const bb = G.bb, R_ = Math.max(Math.abs(bb[0]), Math.abs(bb[2]), Math.abs(bb[1]), Math.abs(bb[3])) * s * 1.15 + 8;
  lu_finish([cx - R_, cy - R_, cx + R_, cy + R_], { spec: sp, Ls, sun: o.rim, rimW: s >= 3.2 ? 2 : 1, shadow: null });
  return { x: cx, y: cy };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 11. ANDRÉ POISSON (marchand de ferraille) : rond, cinquantaine, moustache épaisse, melon, costume brun un peu serré, chaîne de montre
// ════════════════════════════════════════════════════════════════════════════════════════
const lu_HEAD_P = lu_scaleLv([[-11.5, 3.0, 5.4, -2.4], [-10.3, 4.6, 6.6, -4.2], [-9, 5.8, 7.4, -5.8], [-6.6, 7.0, 8.0, -8.4], [-4.4, 7.9, 8.4, -9.8], [-2.2, 8.5, 8.6, -10.6], [0, 8.8, 8.8, -11.0], [2.2, 8.9, 8.8, -11.2],
  [4.4, 8.7, 8.4, -11.0], [6.6, 8.0, 7.5, -10.0], [8.8, 6.4, 5.8, -8.0], [10.4, 4.2, 3.7, -5.4], [11.2, 2.2, 1.8, -3.2], [11.6, 0.6, 0.3, -1.0]], 1.1);
const lu_SPEC_POISSON = lu_mk(lu_SPEC_LUSTIG, {
  id: 'poisson', H: 163,
  hipY: 80, hipSep: 9.4, thigh: 38.2, shin: 36.0, ankle: 5.8, kneeOut: 0.5,
  leg: { w: [21.0, 16.2, 15.6, 13.0], cuff: 13.6 },
  torso: [[-9, 19.4, 14.0, -10.6], [0, 21.4, 17.8, -11.4], [10, 23.0, 21.4, -11.6], [20, 23.6, 22.0, -11.2], [30, 22.2, 17.4, -10.4], [38, 20.6, 12.4, -9.4], [44, 19.0, 10.0, -8.4], [48, 16.6, 8.6, -7.6], [51, 12.2, 7.4, -6.8], [53.4, 8.6, 6.8, -6.4]],
  shY: 39.6, shX: 18.2, shZ: -1.0,
  arm: { U: 26.4, F: 22.4, hand: 15.6, w: [14.2, 12.4, 10.6], cuff: 11.4 },
  neck: { y0: 49.0, y1: 57, a: 6.2, zf: 6.6, zb: -5.8 },
  head: { pivotY: 52.6, pivotZ: 0.2, up: 13.4, fwd: 0.6, levels: lu_HEAD_P, nose: 3.2, noseW: 3.1, jaw: 1.2, earY: -0.8, hairline: [[-4.2, 3.2], [-3.2, 2.4], [-2.4, 1.7], [-0.5, 1.55], [1.6, 1.42], [3.0, 1.3], [4.6, 1.0], [5.8, 0.7], [6.6, 0.3], [7.2, 0.0], [11.5, 0.0]] },
  hat: { style: 'bowler', seat: 6.6, back: -0.7 },
  foot: { toe: 17.2, heel: -5.0, w: 8.8, h: 5.8 },
  open: [[-9, 0.6], [0, 0.42], [10, 0.28], [20, 0.2], [28, 0.22], [36, 0.3], [44, 0.36], [50, 0.4], [58, 0.4]],
  lapel: [[24, 0.0], [30, 0.12], [36, 0.24], [42, 0.3], [47, 0.26], [51, 0.1], [53, 0.0]],
  tie: { w: [[26, 0.6], [28, 2.2], [34, 3.0], [42, 2.6], [48, 1.9]], yEnd: 26.4 }, vestButtons: [6, 13, 20, 27, 34], vestTip: -2,
  facial: { mous: 'handlebar' },
  walk: { T: 0.98, duty: 0.62, S: 44, lift: 6.2, bob: 3.0, bob0: 0.4, sway: 2.2, twist: 0.11, tilt: 0.045, lean: 0.06, armA: 0.26, bend: 0.1, heelUp: 0.28, toeOff: 0.42, wide: 1.2 },
  run: { T: 0.55, duty: 0.4, S: 62, lift: 16, lean: 0.28 },
  mats: {
    jacket: lu_MATS.brown, lapel: lu_MATS.brownL, vest: lu_mat(WO[5], WO[6], SK[4], WO[4], WO[3]), shirt: lu_mat(WH[1], WH[2], WH[3], WH[0], ST[6]), tie: lu_mat(GR[1], GR[2], GR[3], GR[0], GR[0]),
    hat: lu_MATS.bowler, ribbon: lu_MATS.ribbon, hair: lu_mat(ST[3], ST[4], ST[6], ST[2], ST[1]), beard: lu_mat(WO[2], WO[3], WO[5], WO[1], WO[0]), shoe: lu_mat(WO[1], WO[3], WO[5], WO[0], NI[0]),
  },
  mouthY: -8.6, eyeCol: WO[2], browCol: WO[2], lipCol: RD[1], blinkSeed: 11, blushCol: RD[4],
  extra: [RD[3], YE[3], RD[5], RD[4]],
});

// ════════════════════════════════════════════════════════════════════════════════════════
// 7. API
// ════════════════════════════════════════════════════════════════════════════════════════
const lu_WHO = { lustig: lu_SPEC_LUSTIG, marchand: lu_SPEC_POISSON };
INITS.push(() => { lu_prep(lu_SPEC_LUSTIG); lu_prep(lu_SPEC_POISSON); lu_GROUP.forEach(lu_prep); });
function lu_lustig(cx, cy, s, t, o) { return lu_figure(cx, cy, s, t, o, lu_SPEC_LUSTIG); }
function lu_marchand(cx, cy, s, t, o) { return lu_figure(cx, cy, s, t, o, lu_SPEC_POISSON); }

// ════════════════════════════════════════════════════════════════════════════════════════
// 12. LES CINQ AUTRES MARCHANDS (demi-corps autour d'une table) : variantes de la fiche de base, chacune lisible en silhouette
// ════════════════════════════════════════════════════════════════════════════════════════
// fiche dérivée par homothéties : kx largeur du torse, kz épaisseur, kh hauteur du buste, kl longueur des jambes, kHead taille de la tête
function lu_variant(base, id, v) {
  const sc = (lv, kx, kz) => lv.map(l => [l[0], l[1] * kx, l[2] * kz, l[3] * kz]);
  const o = Object.assign({}, v);
  const sp = lu_mk(base, Object.assign({ id }, o.over || {}));
  sp.torso = sc(base.torso, o.kx ?? 1, o.kz ?? 1).map(l => [l[0] * (o.kh ?? 1) + (l[0] > 30 ? (o.dy || 0) : 0), l[1], l[2], l[3]]);
  const khh = o.kh ?? 1;
  sp.shX = base.shX * (o.kx ?? 1); sp.shY = base.shY * khh;
  sp.head = lu_mk(base.head, { pivotY: base.head.pivotY * khh, levels: o.headLv ? o.headLv : lu_scaleLv(base.head.levels, o.kHead ?? 1) });
  if (o.hair) sp.head.hairline = o.hair;
  if (o.bald) sp.head.bald = true;
  sp.lapel = base.lapel.map(l => [l[0] * khh, l[1]]); sp.open = base.open.map(l => [l[0] * khh, l[1]]);
  sp.tie = base.tie ? { w: base.tie.w.map(w => [w[0] * khh, w[1]]), yEnd: base.tie.yEnd * khh } : null;
  sp.arm = lu_mk(base.arm, { w: base.arm.w.map(w => w * (o.kx ?? 1) * 0.5 + w * 0.5) });
  sp.mats = Object.assign({}, base.mats, o.mats || {});
  Object.assign(sp, o.set || {});
  return sp;
}
const lu_SKIN_OLD = lu_mat(SK[3], SK[4], SK[4], SK[2], SK[1]);
const lu_GROUP = [
  // A : le grand maigre, haut-de-forme, bouc, redingote noire, nœud papillon
  lu_variant(lu_SPEC_LUSTIG, 'm1', { kx: 0.88, kz: 0.92, kh: 1.03, kHead: 0.97, mats: { jacket: lu_mat(ST[1], ST[2], ST[3], ST[0], NI[0]), lapel: lu_mat(ST[2], ST[3], ST[4], ST[1], ST[0]), vest: lu_mat(ST[5], ST[6], ST[7], ST[4], ST[3]), hat: lu_mat(ST[1], ST[2], ST[4], ST[0], NI[0]), tie: lu_mat(NI[1], ST[1], ST[2], NI[0], NI[0]), hair: lu_mat(ST[4], ST[5], ST[6], ST[3], ST[2]), beard: lu_mat(ST[4], ST[5], ST[6], ST[3], ST[2]) },
    set: { hat: { style: 'top', seat: 7.2, back: -0.9 }, facial: { beard: 'goatee' }, eyeCol: ST[2], browCol: ST[3], blinkSeed: 21, walk: lu_SPEC_LUSTIG.walk } }),
  // B : le carré, casquette, grosse moustache en guidon, tweed olive
  lu_variant(lu_SPEC_POISSON, 'm2', { kx: 0.92, kz: 0.8, kh: 1.0, kHead: 0.96, mats: { jacket: lu_mat(LM[1], LM[2], LM[3], LM[0], LM[0]), lapel: lu_mat(LM[2], LM[3], LM[4], LM[1], LM[0]), vest: lu_mat(WO[4], WO[5], WO[6], WO[3], WO[2]), hat: lu_mat(ST[2], ST[3], ST[4], ST[1], ST[0]), tie: lu_mat(RD[1], RD[2], RD[3], RD[0], RD[0]), hair: lu_mat(WO[0], WO[1], WO[2], NI[0], NI[0]) },
    set: { hat: { style: 'cap', seat: 6.0, back: -0.4 }, facial: { mous: 'walrus' }, eyeCol: ST[2], browCol: WO[0], blinkSeed: 33, mouthY: -8.4, tie: { w: [[26, 0.6], [28, 2.2], [34, 3.0], [42, 2.6], [48, 1.9]], yEnd: 26.4 } } }),
  // C : le chauve à lunettes, grande barbe blanche, costume bleu nuit
  lu_variant(lu_SPEC_LUSTIG, 'm3', { kx: 0.98, kz: 1.02, kh: 0.97, kHead: 1.04, bald: true, hair: [[-5.4, 3.14], [-3.6, 2.6], [-2.6, 1.9], [-1.0, 1.6], [1.4, 1.5], [2.4, 3.14], [11.5, 3.14]], mats: { jacket: lu_mat(NI[3], NI[4], NI[5], NI[2], NI[1]), lapel: lu_mat(NI[4], NI[5], BL[1], NI[3], NI[2]), vest: lu_mat(ST[4], ST[5], ST[6], ST[3], ST[2]), hair: lu_mat(ST[6], ST[7], WH[2], ST[5], ST[4]), beard: lu_mat(ST[7], WH[1], WH[2], ST[6], ST[5]), tie: lu_mat(YE[0], YE[1], YE[2], AM[4], AM[4]) },
    set: { hat: { style: 'none' }, facial: { beard: 'full', mous: 'chevron' }, glasses: true, eyeCol: BL[2], browCol: ST[6], blinkSeed: 45, mouthY: -7.4 } }),
  // D : le jeune canotier, fine moustache rousse, costume sable
  lu_variant(lu_SPEC_LUSTIG, 'm4', { kx: 0.94, kz: 0.96, kh: 0.98, kHead: 0.99, mats: { jacket: lu_mat(WO[6], SK[4], WH[1], WO[5], WO[4]), lapel: lu_mat(SK[4], WH[1], WH[2], WO[6], WO[5]), vest: lu_mat(WH[1], WH[2], WH[3], WH[0], ST[6]), hat: lu_mat(SK[4], WH[1], WH[2], WO[6], WO[5]), ribbon: lu_mat(RD[2], RD[3], RD[4], RD[1], RD[0]), tie: lu_mat(CY[1], CY[2], CY[3], CY[0], CY[0]), hair: lu_mat(OC[3], OC[4], OC[5], OC[2], OC[1]) },
    set: { hat: { style: 'boater', seat: 7.2, back: -0.6 }, facial: { mous: 'pencil' }, eyeCol: GR[3], browCol: OC[2], blinkSeed: 57 } }),
  // E : le bourru, feutre brun, favoris, gros sourcils, costume gris clair
  lu_variant(lu_SPEC_POISSON, 'm5', { kx: 0.86, kz: 0.75, kh: 0.97, kHead: 0.97, mats: { jacket: lu_mat(ST[4], ST[5], ST[6], ST[3], ST[2]), lapel: lu_mat(ST[5], ST[6], ST[7], ST[4], ST[3]), vest: lu_mat(WH[1], WH[2], WH[3], WH[0], ST[6]), hat: lu_mat(WO[3], WO[4], WO[5], WO[2], WO[1]), ribbon: lu_mat(NI[0], WO[0], WO[1], NI[0], NI[0]), tie: lu_mat(RD[1], RD[2], RD[3], RD[0], RD[0]), hair: lu_mat(WO[1], WO[2], WO[3], WO[0], NI[0]), beard: lu_mat(WO[1], WO[2], WO[3], WO[0], NI[0]) },
    set: { hat: { style: 'fedora', seat: 6.8, back: -0.7 }, facial: { mous: 'chevron', beard: 'chops' }, eyeCol: WO[3], browCol: WO[0], blinkSeed: 69, mouthY: -7.6, tie: { w: [[26, 0.6], [28, 2.2], [34, 3.0], [42, 2.6], [48, 1.9]], yEnd: 26.4 } } }),
];
// décalages de style de chaque marchand (sans les jambes : inutiles derrière la table)
for (const g of lu_GROUP) { g.walk = g.walk || lu_SPEC_LUSTIG.walk; g.run = lu_SPEC_LUSTIG.run; }
lu_WHO.m1 = lu_GROUP[0]; lu_WHO.m2 = lu_GROUP[1]; lu_WHO.m3 = lu_GROUP[2]; lu_WHO.m4 = lu_GROUP[3]; lu_WHO.m5 = lu_GROUP[4];

// ── pose « écoute » des marchands : assis à la table, ils se penchent, murmurent, hochent la tête ; o.k = rang (0..4)
lu_POSES.listen = (sp, u, o, B, t) => {
  lu_idle(sp, t, B, o);
  const k = o.k || 0, lean = o.lean ?? 0, nod = o.nod ?? 0, mur = o.murmur ?? 0, ph = k * 1.7 + 0.6;
  B.yaw = o.yaw ?? 0; B.lean = 0.02 + 0.3 * lean; B.head.pitch = 0.03 + 0.05 * lean;
  const talk = mur * Math.max(0, Math.sin(0.85 * t + ph * 1.9) * 0.6 + 0.5) * (0.5 + 0.5 * Math.sin(0.37 * t + ph));
  B.face.mouth = 0.22 * talk * (0.45 + 0.55 * Math.abs(Math.sin(TAU * 3.1 * t + ph)));
  const nd = nod * Math.max(0, Math.sin(TAU * 0.55 * t + ph)) * Math.pow(Math.max(0, Math.sin(TAU * 1.9 * t + ph * 0.6)), 1);
  B.head.pitch += 0.17 * nod * Math.max(0, Math.sin(TAU * 1.5 * (t + 0.13 * k))) ** 2;
  B.head.yaw += (o.look ?? 0) + 0.1 * Math.sin(0.5 * t + ph) * mur;
  B.gaze = [clamp((o.lookG ?? 0.5), -1, 1), 0.05];
  Object.assign(B.face, { lid: 0.78 + 0.1 * mur, brow: 0.08 * mur * talk, smile: 0.1 * (k % 2) });
  const hv = [{ o: -9, u: -30, f: 26, curl: 0.55 }, null, { o: 1, u: -31, f: 27, curl: 0.4 }, { o: -11, u: -26, f: 22, curl: 0.6 }, null][k];
  const arm = (sd, v, mir) => lu_arm(B, sd, { o: v.o, u: v.u, f: v.f, el: [0.6, -1, -0.3], hand: { curl: v.curl, thumb: 0.3, spread: 0.1 } });
  if (hv) { arm('L', hv); arm('R', hv); }
  else if (k === 1) {                                                              // main au menton, l'autre bras en travers
    lu_arm(B, 'R', { tip: true, o: -16, u: sp.lm.chin[1] - 0.5, f: sp.lm.chin[2] + 1.5, hd: [-0.3, 1, 0.25], el: [0.3, -1, 0.2], hand: { curl: 0.6, thumb: 0.1 } });
    lu_arm(B, 'L', { o: -28, u: -26, f: 15, el: [0.2, -0.6, -0.6], hand: { curl: 0.5, thumb: 0.3 } });
  } else {                                                                          // k = 4 : se caresse les favoris
    lu_arm(B, 'L', { tip: true, o: -17, u: sp.lm.chin[1] + 2, f: sp.lm.chin[2] + 0.5, hd: [-0.2, 1, 0.3], el: [0.4, -1, 0.1], hand: { curl: 0.65, thumb: 0.2 } });
    lu_arm(B, 'R', { o: -9, u: -30, f: 26, el: [0.6, -1, -0.3], hand: { curl: 0.5, thumb: 0.3 } });
  }
  B.R.zb = 30; B.L.zb = 30;
  return B;
};
// groupe : lu_groupe(x, y, s, t, o) ; (x, y) = milieu de la rangée de devant, à la ceinture (la table, dessinée par le plan, cache le bas)
// o.lean 0..1 (penchés vers la cible) ; o.aim = abscisse (px à s = 1, relative à x) de la personne regardée : 0 = vers le spectateur, + vers la droite ;
// o.nod, o.murmur 0..1 ; o.who = tableau d'indices pour n'en montrer que certains ; o.clipY ; o.light ; o.rim ; o.flip ; o.shadow est ignoré
const lu_GROUP_LAYOUT = [[-78, -17, 0.93, 0], [0, -22, 0.93, 2], [78, -17, 0.93, 4], [-41, 0, 1.0, 1], [41, 0, 1.0, 3]];   // [dx, dy, échelle, indice du marchand]
function lu_groupe(x, y, s, t, o) {
  o = o || {};
  const aim = (o.aim ?? 0), flip = o.flip ? -1 : 1, res = { members: [] };
  const order = lu_GROUP_LAYOUT.slice().sort((a, b) => a[1] - b[1]);                // fond d'abord
  const only = o.who || null;
  for (const [dx, dy, k, idx] of order) {
    if (only && only.indexOf(idx) < 0) continue;
    const sp = lu_GROUP[idx];
    const dir = (aim - dx) * flip, yaw = clamp(Math.atan2(dir, 85), -1.25, 1.25) * (o.turn ?? 1);
    const oo = { pose: 'listen', k: idx, yaw, lean: o.lean ?? 0, nod: o.nod ?? 0, murmur: o.murmur ?? 0, crop: 'waist', light: o.light, rim: o.rim, flip: o.flip, clipY: o.clipY, shadow: 0, hat: o.hat, look: -yaw * 0.15, lookG: clamp(Math.sign(dir) * 0.6, -1, 1) };
    const r = lu_figure(x + dx * s * flip, y + dy * s, s * k, t, oo, sp);
    res.members[idx] = r;
  }
  res.head = res.members.map(m => m && m.head); res.mouth = res.members.map(m => m && m.mouth);
  return res;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 13. ICÔNE DU CARNET : ICONES[3] (17 × 17, couleurs exactes) : un petit train à vapeur vu de côté (la fuite)
// ════════════════════════════════════════════════════════════════════════════════════════
const lu_ICOL = { w: WH[2], W: WH[0], g: ST[6], d: ST[1], C: ST[5], c: ST[3], a: AM[8], y: YE[2], Y: YE[3], r: RD[2], R: RD[3], k: '#05040f', e: WH[3] };
const lu_ICON = [
  '.........wwW.....',
  '.......wwwWW.....',
  '.....WwwW..wW....',
  '............gggg.',
  'RRRRRRRR.....dd..',
  '.rrrrrr.Yy...dd..',
  '.rYYrdr.yy...dd..',
  '.rYYrdrCCCCCCCCd.',
  '.rrrrrrcccccycca.',
  '.rrrrrrcccccycca.',
  '.rrrrrrcccccyccd.',
  '.rrrrrrddddddddd.',
  '.ddgggddgggddddd.',
  '..gdddggdddg.....',
  '..gdyyyyyydg.ggg.',
  '..gdddggdddg.gdg.',
  '...ggg..ggg..ggg.',
];
ICONES[3] = function (cx, cy) {
  const N = 17, g = lu_ICON, x0 = Math.round(cx) - 8, y0 = Math.round(cy) - 8, fillp = (x, y) => x >= 0 && y >= 0 && x < N && y < N && g[y][x] !== '.';
  for (let y = -1; y <= N; y++) for (let x = -1; x <= N; x++) if (!fillp(x, y) && (fillp(x - 1, y) || fillp(x + 1, y) || fillp(x, y - 1) || fillp(x, y + 1))) R(x0 + x, y0 + y, 1, 1, '#05040f');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const ch = g[y][x]; if (ch !== '.') R(x0 + x, y0 + y, 1, 1, lu_ICOL[ch]); }
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 6. POSES (chaque fonction renvoie la structure complète des paramètres ; u = temps local de l'action, t = temps absolu)
// ════════════════════════════════════════════════════════════════════════════════════════
const lu_arm = (B, sd, v) => { const a = B[sd]; for (const k in v) { if (k === 'hand') Object.assign(a.hand, v.hand); else a[k] = v[k]; } return a; };
const lu_ease = x => x * x * (3 - 2 * x);
const lu_pk = (T, u) => lu_tab(T, u);                               // courbe d'animation [[temps, valeur], …]
const lu_wave = (u, f, p = 0) => Math.sin(TAU * f * u + p);
// repos : bras ballants, jambes en contrapposto, respiration et légère dérive ; appelé par la plupart des poses comme point de départ
function lu_idle(sp, t, B, o) {
  const br = Math.sin(t * 1.9), sw = Math.sin(t * 0.55 + 1);
  B.chest = br * 0.4; B.shrug = br * 0.25;
  B.sway = 0.02 + 0.006 * sw; B.hipTilt = 0.03; B.hipX = -1.2 + 0.3 * sw; B.lean = 0.015 + 0.01 * br;
  B.legR = { x: -(sp.hipSep - 0.4), z: -1.2, h: 0, pitch: 0, yawF: 0.2 }; B.legL = { x: sp.hipSep + 1.2, z: sp.H * 0.026, h: 0, pitch: 0, yawF: -0.3 };
  B.head.yaw = -0.05 + 0.03 * Math.sin(t * 0.43); B.head.pitch = 0.02 + 0.012 * br;
  lu_arm(B, 'L', { o: 0.8, u: -(sp.arm.U + sp.arm.F) * 0.985, f: 2.6, el: [0.4, -0.2, -0.9], hand: { curl: 0.4, thumb: 0.15 } });
  lu_arm(B, 'R', { o: 0.8, u: -(sp.arm.U + sp.arm.F) * 0.985, f: 2.6, el: [0.4, -0.2, -0.9], hand: { curl: 0.4, thumb: 0.15 } });
  return B;
}
lu_POSES.stand = (sp, u, o, B, t) => { B.yaw = 0.75; return lu_idle(sp, t, B, o); };

// ── marche : légèrement différente pour chaque fiche (sp.walk = { T, duty, S, lift, bob, armA })
function lu_gait(sp, B, p, W) {
  p = ((p % 1) + 1) % 1;
  const S = W.S, D = W.duty, leg = (q, sg) => {
    let z, h, pitch;
    if (q < D) { const u = q / D; z = S / 2 - S * u; h = 0; pitch = W.heelUp * Math.max(0, 1 - u / 0.2) - W.toeOff * lu_ss(0.7, 1, u); }
    else { const r = (q - D) / (1 - D); z = -S / 2 + S * lu_ss(0, 1, r); h = W.lift * Math.pow(Math.sin(Math.PI * r), 0.9); pitch = -W.toeOff * (1 - lu_ss(0, 0.4, r)) + W.heelUp * lu_ss(0.55, 1, r); }
    return { x: sg * (sp.hipSep - 0.4 + W.wide), z, h, pitch, yawF: -sg * 0.12 };
  };
  B.legR = leg(p % 1, -1); B.legL = leg((p + 0.5) % 1, 1);
  B.drop = W.bob * (0.5 + 0.5 * Math.cos(4 * Math.PI * p)) + W.bob0;
  B.hipX = W.sway * Math.sin(2 * Math.PI * p + Math.PI);
  B.twistP = W.twist * Math.cos(2 * Math.PI * p); B.twistT = -W.twist * 1.3 * Math.cos(2 * Math.PI * p);
  B.hipTilt = W.tilt * Math.sin(2 * Math.PI * p); B.sway = -W.tilt * 0.9 * Math.sin(2 * Math.PI * p);
  B.lean = W.lean; B.head.yaw = -B.twistT - B.twistP * 0; B.head.pitch = -W.lean * 0.5 + 0.02;
  // bras : balancier opposé à la jambe du même côté
  const L0 = (sp.arm.U + sp.arm.F);
  for (const [sd, sg] of [['L', 1], ['R', -1]]) {
    const ang = -sg * W.armA * Math.cos(2 * Math.PI * p);                       // + : la main va vers l'avant
    const rr = L0 * (0.97 - W.bend * Math.max(0, Math.sin(ang)) - W.bend * 0.3 * Math.max(0, -Math.sin(ang)));
    lu_arm(B, sd, { o: 1.2, u: -rr * Math.cos(ang), f: 1.5 + rr * Math.sin(ang), el: [0.5, -0.1, -1.0], hand: { curl: 0.4, thumb: 0.15 } });
  }
  return B;
}
lu_POSES.walk = (sp, u, o, B, t) => {
  const W = sp.walk, p = o.ph !== undefined ? o.ph : t / W.T;
  B.yaw = o.yaw ?? 1.5;
  lu_gait(sp, B, p, W);
  return B;
};

// ── lecture : journal tenu devant soi (le journal est dessiné par le plan : voir o.hold et le champ `paper` renvoyé)
lu_POSES.read = (sp, u, o, B, t) => {
  lu_idle(sp, t, B, o);
  B.yaw = 0.6; B.lean = -0.03; B.head.pitch = 0.2 + 0.02 * Math.sin(t * 0.6); B.head.yaw = 0.12; B.gaze = [0.1, -0.5 - 0.0 * t];
  // le regard court le long des colonnes : très lentement de gauche à droite puis ligne suivante
  const ln = (t * 0.45) % 1; B.gaze = [-0.5 + 1.0 * ln, -0.6 + 0.12 * Math.floor((t * 0.45) % 4)];
  B.face.lid = 0.62; B.face.brow = -0.05;
  lu_arm(B, 'R', { o: -9, u: -4, f: 26, el: [0.5, -1, -0.2], hand: { curl: 0.7, thumb: 0.5, roll: 0.0 } });
  if (o.both) lu_arm(B, 'L', { o: -9, u: -4, f: 26, el: [0.5, -1, -0.2], hand: { curl: 0.7, thumb: 0.5 } });
  else lu_arm(B, 'L', { o: 0.5, u: -(sp.arm.U + sp.arm.F) * 0.985, f: 3, el: [0.4, -0.2, -0.9], hand: { curl: 0.45 } });
  B.R.zb = 40;
  return B;
};
// ── réflexion : main au menton, l'autre bras en travers soutient le coude
lu_POSES.think = (sp, u, o, B, t) => {
  lu_idle(sp, t, B, o);
  B.yaw = 0.7; B.lean = -0.02; B.head.pitch = 0.1; B.head.yaw = 0.12; B.head.roll = -0.06; B.gaze = [0.35, 0.55 + 0.15 * Math.sin(t * 0.8)];
  B.face.lid = 0.7; B.face.brow = 0.08; B.face.browIn = 0.1; B.face.smile = 0.05;
  lu_arm(B, 'R', { tip: true, o: -16, u: 13, f: 11, hd: [-0.3, 1, 0.25], el: [0.3, -1, 0.2], hand: { curl: 0.6, thumb: 0.1, point: 0, roll: -0.2 } });
  lu_arm(B, 'L', { o: -29, u: -25, f: 13, el: [0.2, -0.6, -0.6], hand: { curl: 0.5, thumb: 0.3 } });
  B.R.zb = 30; B.L.zb = 20;
  return B;
};
// ── sourire (net, ou en coin avec o.corner) : la main gauche tient le revers
lu_POSES.smile = (sp, u, o, B, t) => {
  lu_idle(sp, t, B, o);
  const k = o.corner ? 1 : 0;
  B.yaw = 0.55; B.head.yaw = -0.22; B.head.roll = 0.05; B.head.pitch = -0.02; B.gaze = [0.2, 0.05];
  B.face.smile = o.corner ? 0.55 : 0.8; B.face.smileAsym = o.corner ? 0.55 : 0.15; B.face.lid = 0.7; B.face.brow = 0.12; B.face.browAsym = o.corner ? 0.5 : 0; B.face.squint = 0.12;
  lu_arm(B, 'L', { tip: true, o: -9, u: -9, f: 11, hd: [-0.6, 0.55, 0.5], el: [0.4, -1, -0.5], hand: { curl: 0.55, thumb: 0.45, roll: 0.0 } });
  return B;
};
// ── doigt sur les lèvres, penché en avant (chuchote)
lu_POSES.whisper = (sp, u, o, B, t) => {
  lu_idle(sp, t, B, o);
  const k = lu_ss(0, 0.6, o.u !== undefined ? o.u : 1);
  B.yaw = 1.05; B.lean = 0.36 * k; B.drop = 3 * k; B.hipZ = -2 * k; B.head.pitch = 0.08 * k; B.head.yaw = 0.18 * k; B.head.roll = 0.04; B.gaze = [0.7, -0.05];
  B.face.lid = 0.62; B.face.smile = 0.18; B.face.smileAsym = 0.25; B.face.brow = 0.1; B.face.browAsym = 0.4;
  lu_arm(B, 'R', { tip: k > 0.01, o: lerp(0.8, -15, k), u: lerp(-54, 19, k), f: lerp(2, 12, k), hd: [-0.3, 1, 0.15], el: [0.7, -1, 0.1], hand: { curl: 0.85, thumb: 0.2, point: 1, roll: -0.15 } });
  B.R.zb = 40;
  lu_arm(B, 'L', { o: 4, u: lerp(-54, -40, k), f: lerp(2, 28, k), el: [0.5, -0.6, -0.5], hand: { curl: 0.2, thumb: 0.4, spread: 0.4 } });
  return B;
};
// ── poignée de main : bras droit tendu vers l'avant, main ouverte pouce en haut ; o.pump (0..1) : les secousses
lu_POSES.handshake = (sp, u, o, B, t) => {
  lu_idle(sp, t, B, o);
  const k = lu_ss(0, 0.5, o.u !== undefined ? o.u : 1), pump = (o.pump || 0) * Math.sin(TAU * 2.4 * t) * 3.2;
  B.yaw = 1.2; B.lean = 0.07 * k; B.head.yaw = 0.1; B.gaze = [0.7, 0.0]; B.head.pitch = 0.03;
  B.face.smile = 0.5; B.face.smileAsym = 0.2; B.face.lid = 0.75; B.face.brow = 0.12;
  lu_arm(B, 'R', { o: lerp(0.8, -7, k), u: lerp(-54, -16, k) + pump, f: lerp(2, 42, k), el: [0.5, -1, -0.1], hand: { curl: lerp(0.4, 0.15, k), thumb: lerp(0.15, 0.9, k), roll: 0, spread: 0.2 * k } });
  B.R.zb = 40;
  return B;
};
// ── se recoiffe : cravate, puis chapeau (face à la caméra) ; u en secondes depuis le début
lu_POSES.dress = (sp, u, o, B, t) => {
  lu_idle(sp, t, B, o);
  const T = [0, 0.4, 1.4, 1.9, 3.0, 3.5];
  const tie = lu_pk([[0, 0], [0.4, 1], [1.4, 1], [1.8, 0]], u), hat = lu_pk([[1.4, 0], [1.9, 1], [3.0, 1], [3.45, 0]], u);
  const hatUp = hat, tieUp = tie;
  B.yaw = 0.16 + 0.04 * Math.sin(t * 0.5); B.head.yaw = -0.04; B.lean = 0.0;
  B.gaze = [0, lerp(0.0, -0.45, tieUp) + 0.0];                                      // il se regarde dans le miroir (caméra), puis baisse les yeux sur la cravate
  B.face.lid = 0.75;
  const pinch = Math.sin(TAU * 2.1 * u) * 0.8, fid = Math.sin(TAU * 3.1 * u + 1) * 0.6;
  lu_arm(B, 'R', { tip: true, o: lerp(0.8, -16.5, tieUp), u: lerp(-54, 2.6, tieUp) + pinch * tieUp, f: lerp(2, 10, tieUp), hd: [-0.35, 1, 0.1], el: [0.8, -1, 0.0], hand: { curl: lerp(0.4, 0.8, tieUp), thumb: lerp(0.15, 0.5, tieUp), point: 0 } });
  lu_arm(B, 'L', { tip: true, o: lerp(0.8, -17.5, tieUp), u: lerp(-54, 1.6, tieUp) + fid * tieUp * 0.7, f: lerp(2, 10, tieUp), hd: [-0.35, 1, 0.1], el: [0.8, -1, 0.0], hand: { curl: lerp(0.4, 0.5, tieUp), thumb: lerp(0.15, 0.3, tieUp) } });
  // le chapeau : les deux mains prennent les bords, ajustent (inclinaison), relâchent
  const tilt = Math.sin(TAU * 0.9 * (u - 1.9)) * 0.06 * hatUp;
  if (hat > 0) {
    for (const [sd, sg] of [['L', 1], ['R', -1]]) lu_arm(B, sd, { tip: true, o: lerp(sd === 'R' ? -16.5 : -17.5, -5.5, hat), u: lerp(sd === 'R' ? 2.6 : 1.6, 33.0, hat), f: lerp(10, 3.5, hat), hd: [lerp(-0.35, -0.55, hat), 1, 0.1], el: [0.9, -1, -0.1], hand: { curl: 0.65, thumb: 0.6, roll: sg * 0.3 * hat } });
  }
  B.hat.dy = 0.8 * hatUp; B.hat.roll = tilt; B.hat.pitch = 0.05 * hatUp * Math.sin(TAU * 0.9 * (u - 1.9) + 1);
  B.L.zb = 40; B.R.zb = 40;
  const fin = lu_ss(3.0, 3.6, u);
  B.face.smile = 0.5 * fin; B.face.smileAsym = 0.5 * fin; B.face.brow = 0.06 * fin;
  return B;
};
// ── salue du chapeau
lu_POSES.tipHat = (sp, u, o, B, t) => {
  lu_idle(sp, t, B, o);
  const up = lu_pk([[0, 0], [0.3, 0.55], [0.55, 1], [1.25, 1], [1.7, 0]], u), nod = lu_pk([[0, 0], [0.5, 0], [0.8, 1], [1.1, 1], [1.5, 0]], u);
  B.yaw = 0.42; B.head.pitch = 0.1 * nod; B.head.yaw = 0.05 - 0.1 * up; B.gaze = [0.35, 0.0];
  B.face.smile = 0.6 * lu_ss(0.25, 0.7, u) * (1 - lu_ss(1.3, 1.7, u)); B.face.smileAsym = 0.2; B.face.lid = 0.74; B.face.brow = 0.1 * up;
  lu_arm(B, 'R', { tip: up > 0.01, o: lerp(0.8, -7.5, up), u: lerp(-54, 34.0, up), f: lerp(2, 12.5, up), hd: [-0.8, 0.8, 0.45], el: [0.6, -1, 0.0], hand: { curl: lerp(0.4, 0.78, up), thumb: lerp(0.15, 0.55, up), roll: -0.2 * up } });
  B.R.zb = 40;
  B.hat.dy = 4.2 * up; B.hat.dz = 2.4 * up; B.hat.pitch = -0.34 * up; B.hat.dx = 0;
  return B;
};
// ── course : il s'enfuit (le chapeau s'envole avec o.hat = 0..1)
lu_POSES.run = (sp, u, o, B, t) => {
  const W = sp.run, p = o.ph !== undefined ? o.ph : t / W.T;
  B.yaw = o.yaw ?? 1.3;
  const pp = ((p % 1) + 1) % 1, S = W.S, D = W.duty;
  const leg = (q, sg) => {
    let z, h, pitch;
    if (q < D) { const uu = q / D; z = S * 0.3 - S * 0.78 * uu; h = 0; pitch = 0.2 * Math.max(0, 1 - uu / 0.25) - 0.55 * lu_ss(0.55, 1, uu); }
    else { const r = (q - D) / (1 - D); z = lerp(-S * 0.48, S * 0.3, lu_ss(0, 1, r)); h = W.lift * Math.pow(Math.sin(Math.PI * r), 0.85) + 4 * Math.sin(Math.PI * r); pitch = -0.7 * (1 - lu_ss(0, 0.5, r)) + 0.1 * lu_ss(0.6, 1, r); }
    return { x: sg * (sp.hipSep - 1.2), z, h, pitch, yawF: -sg * 0.05 };
  };
  B.legR = leg(pp % 1, -1); B.legL = leg((pp + 0.5) % 1, 1);
  const stanceR = pp < D ? Math.sin(Math.PI * pp / D) : 0, stanceL = ((pp + 0.5) % 1) < D ? Math.sin(Math.PI * ((pp + 0.5) % 1) / D) : 0;
  B.drop = 4.8 * Math.max(stanceR, stanceL) - 1.4; B.hipX = 0;
  B.twistP = 0.18 * Math.cos(TAU * pp); B.twistT = -0.28 * Math.cos(TAU * pp); B.lean = W.lean; B.sway = 0.03 * Math.sin(TAU * pp);
  B.head.yaw = o.lookBack !== undefined ? -o.lookBack * 1.3 - B.twistT : -B.twistT * 0.8; B.head.pitch = -0.1; B.head.roll = 0.04 * Math.sin(TAU * pp);
  for (const [sd, sg] of [['L', 1], ['R', -1]]) {
    const c = -sg * Math.cos(TAU * pp);                                              // + : la main va vers l'avant
    lu_arm(B, sd, { o: 2 - 4 * Math.max(0, c), u: lerp(-34, 2, lu_ss(-1, 1, c)), f: lerp(-16, 24, lu_ss(-1, 1, c)), el: [0.8, -1, -0.4], hand: { curl: 0.85, thumb: 0.3 } });
  }
  B.face.lid = 1.0; B.face.brow = 0.8; B.face.browIn = 0.85; B.face.mouth = 0.3; B.face.smile = -0.15; B.gaze = [0.2, 0.0];
  return B;
};

// ════════ Poisson ════════
const lu_P_ARMS = (sp) => -(sp.arm.U + sp.arm.F) * 0.985;
// il se frotte les mains, yeux brillants, penché vers l'affaire
lu_POSES.eager = (sp, u, o, B, t) => {
  lu_idle(sp, t, B, o);
  const k = lu_ss(0, 0.4, o.u !== undefined ? o.u : 1), rub = Math.sin(TAU * 3.0 * t) * 1.9 * (o.rub ?? 1);
  B.yaw = 0.78; B.lean = 0.2 * k; B.drop = 1.2 * k; B.hipZ = -1.2 * k; B.head.pitch = -0.05 * k; B.head.yaw = 0.14 * k; B.gaze = [0.55, 0.05];
  Object.assign(B.face, { lid: 1.0, wide: 0.55 * k, shine: 1, brow: 0.6 * k, browIn: 0.35 * k, smile: 0.75 * k, smileAsym: 0.1, mouth: 0.18 * k, blush: 0.22 * k, pupil: 1 });
  for (const [sd, sgn] of [['R', 1], ['L', -1]]) lu_arm(B, sd, { tip: true, tipK: 0.5, o: lerp(1.2, -11, k), u: lerp(lu_P_ARMS(sp), -20, k), f: lerp(2, 17, k) + sgn * rub * k, hd: [-0.5, 0.25, 1], el: [0.6, -1, -0.3], hand: { curl: lerp(0.4, 0.55, k), thumb: 0.5, spread: 0.1, roll: sgn * 0.2 * k } });
  B.R.zb = 40; B.L.zb = 41;
  return B;
};
// mallette tendue à deux mains (le plan dessine la mallette dans o.hold ; la main R tient la poignée)
lu_POSES.handover = (sp, u, o, B, t) => {
  lu_idle(sp, t, B, o);
  const k = lu_ss(0, 0.45, o.u !== undefined ? o.u : 1);
  B.yaw = 1.0; B.lean = 0.1 * k; B.head.pitch = 0.06 * k; B.head.yaw = 0.12; B.gaze = [0.6, 0.1];
  Object.assign(B.face, { lid: 0.95, wide: 0.2, smile: 0.5, brow: 0.3 * k, browIn: 0.2, mouth: 0.05, blush: 0.15 * k });
  lu_arm(B, 'R', { o: lerp(1.2, -5, k), u: lerp(lu_P_ARMS(sp), -23, k), f: lerp(2, 30, k), el: [0.5, -1, -0.2], hand: { curl: 0.9, thumb: 0.6, roll: 0.0 } });
  lu_arm(B, 'L', { o: lerp(1.2, -5, k), u: lerp(lu_P_ARMS(sp), -26, k), f: lerp(2, 30, k), el: [0.5, -1, -0.2], hand: { curl: 0.7, thumb: 0.3, roll: 0.0 } });
  B.R.zb = 40; B.L.zb = 41;
  return B;
};
// stupeur : tête en arrière, yeux écarquillés, mâchoire qui tombe, chapeau qui se soulève (o.u : temps depuis le choc)
lu_POSES.shock = (sp, u, o, B, t) => {
  lu_idle(sp, t, B, o);
  const uu = o.u !== undefined ? o.u : 1, k = lu_ss(0, 0.16, uu), rec = k * (1 - 0.35 * lu_ss(0.3, 1.2, uu)), tr = Math.sin(TAU * 11 * t) * (o.tremble ?? 0.5);
  B.yaw = 0.6; B.lean = -0.1 * rec; B.hipZ = 1.5 * rec; B.head.pitch = -0.12 * rec; B.head.yaw = 0.1; B.gaze = [0.2, 0.0]; B.shrug = 2.4 * rec;
  Object.assign(B.face, { lid: 1.0, wide: 1.0 * k, brow: 1.0 * k, browIn: 0.35 * k, mouth: 0.95 * k, jaw: 1 * k, pupil: lerp(1, 0.55, k), smile: -0.1 * k, blush: 0 });
  B.hat.dy = 5.5 * k + 0.6 * tr * k; B.hat.pitch = -0.38 * k; B.hat.dz = -0.5 * k;
  for (const [sd, sg] of [['R', -1], ['L', 1]]) lu_arm(B, sd, { o: lerp(1.2, 8, k), u: lerp(lu_P_ARMS(sp), -14, k) + tr * 0.5 * k, f: lerp(2, 20, k), el: [0.9, -0.5, -0.4], hand: { curl: 0.12 * k + 0.4 * (1 - k), thumb: 1, spread: 1.0 * k, roll: sg * -0.5 * k } });
  B.R.zb = 40; B.L.zb = 41;
  return B;
};
// honte : tête basse, chapeau tenu à deux mains devant le ventre, joues rouges (o.blush 0..1)
lu_POSES.ashamed = (sp, u, o, B, t) => {
  lu_idle(sp, t, B, o);
  const k = lu_ss(0, 0.5, o.u !== undefined ? o.u : 1);
  B.yaw = 0.7; B.lean = 0.14 * k; B.shrug = -1.6 * k; B.drop = 1.0 * k; B.head.pitch = 0.42 * k; B.head.yaw = 0.3 * k; B.head.roll = -0.07 * k; B.gaze = [-0.35, 0.9];
  Object.assign(B.face, { lid: lerp(0.9, 0.5, k), brow: 0.25 * k, browIn: 0.85 * k, smile: -0.45 * k, mouth: 0, blush: o.blush ?? k, squint: 0.1 * k });
  B.hatHeld = k > 0.4 ? 1 : 0; B.heldTilt = 0.5;
  for (const [sd, sg] of [['R', -1], ['L', 1]]) lu_arm(B, sd, { tip: true, tipK: 0.45, o: lerp(1.2, -9.5, k), u: lerp(lu_P_ARMS(sp), -38, k), f: lerp(2, 20, k), hd: [-0.7, 0.1, 1], el: [0.9, -1, -0.4], hand: { curl: 0.75, thumb: 0.5, roll: sg * 0.2 } });
  B.R.zb = 40; B.L.zb = 41;
  return B;
};
// il brandit un papier (le plan le dessine dans o.hold) et proteste ; o.shake (0..1) fait trembler le papier
lu_POSES.point = (sp, u, o, B, t) => {
  lu_idle(sp, t, B, o);
  const k = lu_ss(0, 0.3, o.u !== undefined ? o.u : 1), sh = Math.sin(TAU * 4.6 * t) * 2.6 * (o.shake ?? 0.6) * k;
  B.yaw = 0.85; B.lean = 0.12 * k; B.head.pitch = -0.04; B.head.yaw = 0.15 * k; B.gaze = [0.6, 0.1];
  Object.assign(B.face, { lid: 0.9, wide: 0.1, brow: 0.0, browIn: -0.9 * k, smile: -0.3 * k, mouth: 0.55 * k * (0.6 + 0.4 * Math.abs(Math.sin(TAU * 2.3 * t))), blush: 0.7 * k, squint: 0.15 * k });
  lu_arm(B, 'R', { tip: true, tipK: 0.5, o: lerp(1.2, -5, k), u: lerp(lu_P_ARMS(sp), 28, k) + sh, f: lerp(2, 24, k), hd: [-0.1, 1, 0.3], el: [0.9, -1, -0.2], hand: { curl: 0.88, thumb: 0.5 } });
  lu_arm(B, 'L', { o: 4, u: lerp(lu_P_ARMS(sp), -50, k), f: 4, el: [0.7, -0.2, -0.8], hand: { curl: 0.9, thumb: 0.6 } });
  B.R.zb = 40;
  return B;
};
