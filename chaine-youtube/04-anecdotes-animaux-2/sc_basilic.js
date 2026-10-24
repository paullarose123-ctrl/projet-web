'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_basilic.js — segment BASILIC (Amérique centrale), plans calés sur la voix (préfixe ba_)
   (en-tête complété à la fin)
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ───────────────────────── décor : forêt tropicale au bord d'une rivière ─────────────────────────
// Bandes périodiques (cache) pour le lointain, feuilles dessinées à chaque image pour le premier plan (elles ploient au vent).
const BA_PW = 540;                                                   // période des bandes (px du monde)
const ba_bandM = new Map();
function ba_band(key, w, h, fn) { let b = ba_bandM.get(key); if (!b) { const c = mkCanvas(w, h), x = c.getContext('2d'); fn(x, w, h); b = c; ba_bandM.set(key, b); } return b; }
function ba_putBand(cv, y, par, cam, alpha = 1) {
  const w = cv.width, off = (((cam * par) % w) + w) % w; L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = alpha;
  for (let x = -Math.round(off); x < LW; x += w) L.drawImage(cv, x, Math.round(y)); L.restore();
}
const ba_wrap = (x, w, fn) => { for (const dx of [-w, 0, w]) fn(x + dx); };

// touffe de feuillage : petites feuilles dans une ellipse, éclairées en haut à droite ; T = tons du sombre au clair
function ba_foliage(c, cx, cy, rx, ry, T, seed, n, size) {
  const r = rng(seed), it = [];
  for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()); it.push([cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d * 0.9, size * (0.75 + 0.6 * r()), r(), r() * Math.PI]); }
  it.sort((p, q) => p[1] - q[1]);
  for (const [x, y, sz, q, rt] of it) {
    const lit = clamp(0.42 + ((x - cx) / rx) * 0.32 - ((y - cy) / ry) * 0.55 + (q - 0.5) * 0.45), k = Math.min(T.length - 1, Math.floor(lit * T.length));
    c.fillStyle = T[0]; c.beginPath(); c.ellipse(x, y + 0.5, sz + 0.9, sz * 0.62 + 0.9, rt, 0, TAU); c.fill();
    c.fillStyle = T[Math.max(1, k)]; c.beginPath(); c.ellipse(x, y, sz, sz * 0.58, rt, 0, TAU); c.fill();
    if (k >= T.length - 2) { c.fillStyle = T[T.length - 1]; c.beginPath(); c.ellipse(x + sz * 0.25, y - sz * 0.22, sz * 0.5, sz * 0.2, rt, 0, TAU); c.fill(); }
  }
}
// tronc : fût effilé, contreforts, écorce striée, mousse, liseré de lumière à droite
function ba_trunk(c, x, yb, yt, w0, w1, seed, o = {}) {
  const r = rng(seed), lean = o.lean ?? 0, T = o.T || [WO[0], WO[1], WO[2], WO[3], WO[5]], mist = o.mist || null;
  const pts = [], N = 10;
  for (let i = 0; i <= N; i++) { const f = i / N, yy = lerp(yb, yt, f), xx = x + lean * f * f + Math.sin(f * 4 + seed) * 1.2, ww = lerp(w0, w1, Math.pow(f, 0.8)) * (1 + (f < 0.15 ? 0.9 * (1 - f / 0.15) : 0)); pts.push([xx, yy, ww]); }
  const left = pts.map(p => [p[0] - p[2] / 2, p[1]]), right = pts.map(p => [p[0] + p[2] / 2, p[1]]);
  c.fillStyle = T[0]; c.beginPath(); left.forEach((p, i) => i ? c.lineTo(p[0] - 1, p[1]) : c.moveTo(p[0] - 1, p[1])); right.slice().reverse().forEach(p => c.lineTo(p[0] + 1, p[1])); c.closePath(); c.fill();
  c.fillStyle = T[1]; c.beginPath(); left.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); right.slice().reverse().forEach(p => c.lineTo(p[0], p[1])); c.closePath(); c.fill();
  // moitié éclairée (droite), liseré
  c.fillStyle = T[2]; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0] + p[2] * 0.05, p[1]) : c.moveTo(p[0] + p[2] * 0.05, p[1])); right.slice().reverse().forEach(p => c.lineTo(p[0], p[1])); c.closePath(); c.fill();
  c.fillStyle = T[4]; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0] + p[2] * 0.36, p[1]) : c.moveTo(p[0] + p[2] * 0.36, p[1])); right.slice().reverse().forEach(p => c.lineTo(p[0], p[1])); c.closePath(); c.fill();
  c.strokeStyle = T[0]; c.lineWidth = 0.8;                                           // stries d'écorce
  for (let k = 0; k < 7; k++) { const f0 = r() * 0.6, f1 = f0 + 0.1 + r() * 0.25, u = (r() - 0.5) * 0.8, p0 = pts[Math.floor(f0 * N)], p1 = pts[Math.min(N, Math.floor(f1 * N))]; c.beginPath(); c.moveTo(p0[0] + u * p0[2] / 2, p0[1]); c.lineTo(p1[0] + u * p1[2] / 2, p1[1]); c.stroke(); }
  c.fillStyle = GR[2];                                                                 // mousse sur le côté ombre
  for (let k = 0; k < 6; k++) { const p = pts[Math.floor(r() * N)]; c.beginPath(); c.ellipse(p[0] - p[2] * 0.25, p[1], p[2] * 0.22, 2 + r() * 3, 0, 0, TAU); c.fill(); }
}
// feuille large (bananier, héliconia) : nervure courbe, deux demi-limbes de tons différents, nervures secondaires, bord déchiré
function ba_leaf(c, x, y, len, ang, wid, T, o = {}) {
  const bend = o.bend ?? 0.3, sd = o.seed ?? 1, N = 14, lightSide = o.light ?? 1;
  const ca = Math.cos(ang), sa = Math.sin(ang), tip = [x + ca * len, y + sa * len + bend * len * 0.45], ctrl = [x + ca * len * 0.55, y + sa * len * 0.55 - bend * len * 0.2];
  const rib = [], nor = [];
  for (let i = 0; i <= N; i++) { const f = i / N, p = bez([x, y], ctrl, tip, f), q = bez([x, y], ctrl, tip, Math.min(1, f + 0.02)), p0 = bez([x, y], ctrl, tip, Math.max(0, f - 0.02)), tx = q[0] - p0[0], ty = q[1] - p0[1], l = Math.hypot(tx, ty) || 1; rib.push(p); nor.push([-ty / l, tx / l]); }
  const w = f => wid * Math.sin(Math.PI * Math.pow(f, 0.62)) * (1 - 0.18 * f) * (0.82 + 0.18 * Math.cos(f * 21 + sd * 3) * (f > 0.25 ? 1 : 0.2));
  const side = s => { const e = []; for (let i = 0; i <= N; i++) { const f = i / N; e.push([rib[i][0] + nor[i][0] * s * w(f), rib[i][1] + nor[i][1] * s * w(f)]); } return e; };
  const A = side(1), B = side(-1);
  const half = (E, col) => { c.fillStyle = col; c.beginPath(); rib.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); E.slice().reverse().forEach(p => c.lineTo(p[0], p[1])); c.closePath(); c.fill(); };
  // contour sombre, puis les deux moitiés (la moitié tournée vers la lumière est plus claire)
  c.fillStyle = T[0]; c.beginPath(); A.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); B.slice().reverse().forEach(p => c.lineTo(p[0], p[1])); c.closePath(); c.fill(); c.lineWidth = 1.6; c.strokeStyle = T[0]; c.lineJoin = 'round'; c.stroke();
  const upSide = (nor[Math.floor(N / 2)][1] < 0) === (lightSide > 0) ? A : B, dnSide = upSide === A ? B : A;
  half(upSide, T[3]); half(dnSide, T[2]);
  c.lineWidth = 0.7;
  for (let i = 2; i < N; i++) { for (const E of [A, B]) { c.strokeStyle = E === upSide ? T[2] : T[1]; c.beginPath(); c.moveTo(rib[i][0], rib[i][1]); const e = E[Math.min(N, i + 1)]; c.lineTo(rib[i][0] + (e[0] - rib[i][0]) * 0.92, rib[i][1] + (e[1] - rib[i][1]) * 0.92); c.stroke(); } }
  c.strokeStyle = T[4]; c.lineWidth = 1.1; c.beginPath(); rib.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
}
// palme : rachis courbe, folioles fines de chaque côté (longueur max au milieu)
function ba_frond(c, x, y, len, ang, T, o = {}) {
  const bend = o.bend ?? 0.5, N = 16, ca = Math.cos(ang), sa = Math.sin(ang), tip = [x + ca * len, y + sa * len + bend * len * 0.5], ctrl = [x + ca * len * 0.6, y + sa * len * 0.6 - bend * len * 0.15];
  c.lineCap = 'round';
  for (let i = 1; i <= N; i++) {
    const f = i / N, p = bez([x, y], ctrl, tip, f), q = bez([x, y], ctrl, tip, Math.min(1, f + 0.03)), p0 = bez([x, y], ctrl, tip, Math.max(0, f - 0.03)), tx = q[0] - p0[0], ty = q[1] - p0[1], l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l;
    const ll = (len * 0.3) * Math.sin(Math.PI * Math.pow(f, 0.7)) + 2;
    for (const s of [-1, 1]) { const dn = 0.55 + 0.25 * (1 - f); c.strokeStyle = s * (o.light ?? 1) > 0 ? T[2] : T[1]; c.lineWidth = 1.5; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0] + nx * s * ll * 0.8 + tx / l * ll * 0.4, p[1] + ny * s * ll * 0.8 + ty / l * ll * 0.4 + ll * dn * 0.3); c.stroke(); }
  }
  c.strokeStyle = T[3]; c.lineWidth = 1; c.beginPath(); for (let i = 0; i <= N; i++) { const p = bez([x, y], ctrl, tip, i / N); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke();
}
// liane qui pend : courbe douce et quelques feuilles
function ba_vine(c, x, y0, len, seed, col, col2) {
  const r = rng(seed); c.strokeStyle = col; c.lineWidth = 1.2; c.beginPath(); let px_ = x;
  for (let i = 0; i <= 12; i++) { const yy = y0 + len * i / 12, xx = x + Math.sin(i * 0.5 + seed) * 3 + Math.sin(i * 0.17 + seed * 2) * 2; i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); px_ = xx; }
  c.stroke();
  c.fillStyle = col2; for (let i = 0; i < len / 14; i++) { const f = r(), yy = y0 + len * f, xx = x + Math.sin(f * 12 * 0.5 + seed) * 3 + Math.sin(f * 12 * 0.17 + seed * 2) * 2; c.beginPath(); c.ellipse(xx + (r() < 0.5 ? -2 : 2), yy, 2.4, 1.1, r() * 2, 0, TAU); c.fill(); }
}

// tons de feuillage (du sombre au clair) selon la distance : mist 0 = net, 1 = fondu dans la brume
const BA_MIST = '#94d098';
function ba_tones(mist, kind = 'a') {
  const base = kind === 'a' ? [GR[0], GR[1], GR[2], GR[3], GR[4], GR[5], LM[5]] : [GR[0], GR[1], GR[2], GR[3], LM[2], LM[3], LM[4]];
  return base.map(c => mist > 0 ? ba_mix(c, BA_MIST, mist) : c);
}

// lointain : la forêt de l'autre rive dans la brume dorée (h = 190 px, de y = 40 à 230)
function ba_buildFar(c, w, h) {
  const r = rng(11);
  for (let i = 0; i < 20; i++) {                                                         // troncs fins et cimes qui dépassent
    const x = r() * w, ty = 6 + r() * 70, tw = 2.5 + r() * 4, T = ba_tones(0.42 + 0.15 * r());
    ba_wrap(x, w, X => { ba_trunk(c, X, h, ty + 10, tw * 1.6, tw, 100 + i, { T: [ba_mix(WO[0], BA_MIST, 0.6), ba_mix(WO[1], BA_MIST, 0.6), ba_mix(WO[2], BA_MIST, 0.55), ba_mix(WO[3], BA_MIST, 0.5), ba_mix(WO[5], BA_MIST, 0.4)] }); ba_foliage(c, X, ty, 18 + r() * 20, 10 + r() * 9, T, 200 + i, 46, 4); });
  }
  for (let x = 0; x < w; x += 22) { const T = ba_tones(0.32 + 0.1 * r()); ba_wrap(x, w, X => ba_foliage(c, X + r() * 8, h - 38 + r() * 14, 26, 22, T, 300 + x, 54, 4.5)); }
  c.globalCompositeOperation = 'source-atop'; const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(148,208,152,0.2)'); g.addColorStop(0.7, 'rgba(148,208,152,0.3)'); g.addColorStop(1, 'rgba(148,208,152,0.5)'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over';
}
// plan moyen : grands arbres, sous-étage, lianes, palmes (h = 215 px, de y = 20 à 235)
function ba_buildMid(c, w, h) {
  const r = rng(23);
  const xs = [30, 120, 205, 300, 395, 470];
  xs.forEach((x0, i) => {
    const x = x0 + (r() - 0.5) * 30, wd = 11 + r() * 12, lean = (r() - 0.5) * 14, M = 0.1 + 0.1 * r();
    const T = [ba_mix(WO[0], BA_MIST, M * 0.4), ba_mix(WO[1], BA_MIST, M * 0.5), ba_mix(WO[2], BA_MIST, M * 0.6), ba_mix(WO[3], BA_MIST, M * 0.5), ba_mix(AM[6], BA_MIST, M * 0.2)];
    ba_wrap(x, w, X => ba_trunk(c, X, h, 6, wd, wd * 0.62, 400 + i, { lean, T }));
  });
  for (let i = 0; i < 9; i++) {                                                          // feuillage du sous-étage et masses du haut
    const x = r() * w, y = 8 + r() * 60, T = ba_tones(0.06 + 0.08 * r(), i % 2 ? 'a' : 'b');
    ba_wrap(x, w, X => ba_foliage(c, X, y, 30 + r() * 26, 15 + r() * 14, T, 500 + i, 96, 6.4));
  }
  for (let i = 0; i < 10; i++) { const x = r() * w, y = h - 20 - r() * 40, T = ba_tones(0.04 + 0.06 * r(), 'b'); ba_wrap(x, w, X => ba_foliage(c, X, y, 28 + r() * 20, 16 + r() * 10, T, 600 + i, 80, 6.2)); }
  for (let i = 0; i < 7; i++) { const x = r() * w; ba_wrap(x, w, X => ba_vine(c, X, 0, 70 + r() * 90, 700 + i, ba_mix(GR[1], BA_MIST, 0.2), ba_mix(LM[3], BA_MIST, 0.15))); }
  for (let i = 0; i < 9; i++) { const x = r() * w, y = h - 8 - r() * 70, T = ba_tones(0.15, 'a'); ba_wrap(x, w, X => ba_frond(c, X, y, 38 + r() * 24, -Math.PI / 2 + (r() - 0.5) * 2.2, [GR[0], GR[2], GR[3], GR[4]], { bend: 0.5 + r() * 0.4 })); }
  c.globalCompositeOperation = 'source-atop'; const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(148,208,152,0.0)'); g.addColorStop(0.8, 'rgba(148,208,152,0.08)'); g.addColorStop(1, 'rgba(148,208,152,0.2)'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over';
}
// berge lointaine : racines, fougères, boue, reflets de feuilles (h = 40 px)
function ba_buildBank(c, w, h) {
  const r = rng(37);
  for (let x = 0; x < w; x += 16) { const T = ba_tones(0, 'a'); ba_wrap(x, w, X => ba_foliage(c, X + r() * 8, h - 20 + r() * 6, 20, 14, T, 800 + x, 40, 4.6)); }
  for (let i = 0; i < 11; i++) { const x = r() * w; ba_wrap(x, w, X => ba_frond(c, X, h - 6, 24 + r() * 14, -Math.PI / 2 + (r() - 0.5) * 2.4, [GR[0], GR[2], LM[2], LM[4]], { bend: 0.6 })); }
  c.fillStyle = WO[1]; c.fillRect(0, h - 5, w, 5); c.fillStyle = WO[0]; c.fillRect(0, h - 3, w, 3);
  c.fillStyle = WO[3]; for (let i = 0; i < 40; i++) c.fillRect(Math.floor(r() * w), h - 5 + Math.floor(r() * 2), 2 + Math.floor(r() * 4), 1);
}


// voûte de la canopée : masses sombres aux bords éclairés, trouées de ciel, lianes (h = 125 px, collée en haut)
function ba_buildCanopy(c, w, h) {
  const r = rng(51);
  const T = [GR[0], GR[1], GR[2], LM[2], LM[3], LM[4], LM[5]], Tb = [GR[0], GR[0], GR[1], GR[2], GR[3], LM[3], LM[4]];
  for (let i = 0; i < 20; i++) { const x = (i + 0.5) / 20 * w + (r() - 0.5) * 20, y = 8 + r() * 40, rx = 28 + r() * 20, ry = 14 + r() * 22; ba_wrap(x, w, X => ba_foliage(c, X, y, rx, ry, i % 3 ? Tb : T, 900 + i, 90, 7.5)); }
  for (let i = 0; i < 8; i++) { const x = r() * w; ba_wrap(x, w, X => ba_leaf(c, X, 6 + r() * 20, 36 + r() * 24, Math.PI / 2 + (r() - 0.5) * 1.6, 11 + r() * 5, [GR[0], GR[1], GR[2], GR[3], GR[4]], { seed: i, bend: -0.2 })); }
  for (let i = 0; i < 9; i++) { const x = r() * w; ba_wrap(x, w, X => ba_vine(c, X, 20, 40 + r() * 75, 950 + i, GR[1], LM[2])); }
}
// berge proche (h = 110 px) : boue sombre, fougères, feuillage ; défile plus vite que tout le reste
function ba_buildNear(c, w, h) {
  const r = rng(63);
  c.fillStyle = WO[0]; c.fillRect(0, 26, w, h - 26); c.fillStyle = WO[1]; c.fillRect(0, 26, w, 3);
  for (let x = 0; x < w; x += 18) { ba_wrap(x, w, X => ba_foliage(c, X + r() * 8, 34 + r() * 14, 24, 18, [GR[0], GR[0], GR[1], GR[2], GR[3], LM[3], LM[4]], 1100 + x, 50, 6)); }
  for (let i = 0; i < 9; i++) { const x = r() * w; ba_wrap(x, w, X => ba_frond(c, X, 52 + r() * 18, 36 + r() * 26, -Math.PI / 2 + (r() - 0.5) * 2.0, [GR[0], GR[1], GR[3], LM[3]], { bend: 0.55 })); }
  for (let i = 0; i < 6; i++) { const x = r() * w; ba_wrap(x, w, X => ba_leaf(c, X, h, 50 + r() * 20, -Math.PI / 2 + (r() - 0.5) * 1.6, 15 + r() * 6, [GR[0], GR[1], GR[2], GR[3], GR[5]], { seed: 20 + i, bend: 0.4 })); }
}

// ───────────────────────── eau ─────────────────────────
K_WATER.ba = { tint: [34, 64, 26], a0: 0.34, a1: 0.64, hi: LM[5], lo: GR[1], deep: GR[0] };
// traînées claires et sombres qui défilent avec la caméra (la surface bouge avec le monde), feuilles flottantes
function ba_waterFx(y0, y1, t, cam, o = {}) {
  const sd = o.seed ?? 3, H = y1 - y0, n = Math.round(o.n ?? 110), flow = o.flow ?? 6;
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = Math.pow(ba_h(i, sd), 0.8), y = Math.round(y0 + d * H), pr = 0.35 + d * 0.95, len = Math.round((4 + 22 * ba_h(i, sd + 1)) * pr), per = LW + 70;
    const x = (((ba_h(i, sd + 2) * per * 1.4 - cam * (0.55 + 0.45 * d) - t * flow * (0.4 + d)) % per) + per) % per - 35, kind = ba_h(i, sd + 3);
    L.fillStyle = kind < 0.1 ? AM[8] : kind < 0.3 ? LM[4] : kind < 0.55 ? GR[4] : kind < 0.8 ? GR[1] : GR[0];
    L.globalAlpha = kind < 0.55 ? 0.4 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.6 + i)) : 0.5; L.fillRect(Math.round(x), y, len, 1);
    if (kind < 0.12) L.fillRect(Math.round(x + len * 0.3), y + 1, Math.max(1, Math.round(len * 0.4)), 1);
  }
  L.globalAlpha = 1;
  for (let i = 0; i < 7; i++) {                                                              // feuilles mortes qui dérivent
    const d = ba_h(i, sd + 9), y = y0 + 8 + d * (H - 14), per = LW + 60, x = (((ba_h(i, sd + 10) * per * 1.6 - cam * (0.6 + 0.4 * d) - t * 4 * (0.5 + d)) % per) + per) % per - 30, sz = 2 + d * 3;
    L.fillStyle = '#05040f'; L.beginPath(); L.ellipse(x, y + 0.6, sz + 0.8, sz * 0.38 + 0.7, 0.1, 0, TAU); L.fill();
    L.fillStyle = i % 2 ? AM[5] : WO[5]; L.beginPath(); L.ellipse(x, y, sz, sz * 0.38, 0.1, 0, TAU); L.fill();
  }
  L.restore();
}

// ───────────────────────── monde ─────────────────────────
// ba_world(t, cam, o) : le ciel brumeux, la forêt de l'autre rive, la rivière (qui reflète la forêt). o : camY (tilt), wy0 (début de l'eau, 232), wy1 (fin de l'eau, 410), rays (1), seed
// Premier plan (feuilles qui ploient) : ba_fgLeaves(t, cam, o) ; poussières, papillons, brume : dans les plans.
const BA_WY0 = 232;
function ba_world(t, cam, o = {}) {
  const cy = o.camY || 0, wy0 = o.wy0 ?? BA_WY0, wy1 = o.wy1 ?? 424, sx = o.sunX ?? 218;
  vgrad(0, -200, LW, 200 + wy0 + 6 - cy * 0.05, [[0, '#eaf4a4'], [0.3, '#c4ecb8'], [0.6, '#94d098'], [1, '#3f8a5a']]);
  k_glow(sx - cam * 0.04, 10 - cy * 0.05, 110, '255,240,170', 0.4);
  ba_putBand(ba_band('far', BA_PW, 190, ba_buildFar), 40 - cy * 0.08, 0.1, cam);
  k_haze(150 - cy * 0.1, 232 - cy * 0.1, '#b8e4a0', 0.34, { t, cam, profile: 'bottom', seed: 4, par: 0.12, speed: 3 });
  ba_putBand(ba_band('mid', BA_PW, 215, ba_buildMid), 22 - cy * 0.2, 0.28, cam);
  ba_putBand(ba_band('canopy', BA_PW, 125, ba_buildCanopy), -16 - cy * 0.3, 0.45, cam);
  k_haze(170 - cy * 0.2, 240 - cy * 0.2, '#a8d890', 0.22, { t, cam, profile: 'bottom', seed: 9, par: 0.3, speed: 5, wisp: 1 });
  ba_putBand(ba_band('bank', BA_PW, 40, ba_buildBank), wy0 - 34 - cy * 0.5, 0.55, cam);
  // eau : reflet de la forêt (k_pond) + traînées qui défilent
  k_pond(wy0 + 6 - cy * 0.5, wy1, { t, preset: 'ba', axis: wy0 + 5 - cy * 0.5, k: 0.9, ripple: 0.9, density: 1.1, cam, par: 1, seed: o.seed ?? 3, bank: false });
  ba_waterFx(wy0 + 8 - cy * 0.5, wy1, t, cam, { seed: 5, n: o.fxN ?? 120, flow: o.flow ?? 6 });
  if (o.near !== false) ba_putBand(ba_band('near', BA_PW, 110, ba_buildNear), wy1 - 26 - cy, 1.15, cam);
}

// feuilles du premier plan : dessinées à chaque image, elles ploient avec le vent et défilent avec la caméra (périodiques : 620 px de monde)
const BA_FGL = [   // x (monde), y, longueur, angle, largeur, ton (0 sombre, 1 clair), graine, courbure
  [-10, 500, 120, -1.05, 21, 0, 3, 0.5], [14, 495, 105, -0.55, 18, 1, 4, 0.55], [-6, 505, 95, -1.5, 16, 1, 5, 0.3],
  [285, 500, 125, -2.1, 22, 1, 6, 0.5], [262, 498, 100, -2.65, 18, 0, 7, 0.55], [292, 505, 90, -1.7, 16, 0, 8, 0.3],
  [450, 505, 110, -1.3, 20, 0, 9, 0.4], [150, 512, 70, -1.25, 15, 1, 10, 0.3],
];
function ba_fgLeaves(t, cam, o = {}) {
  const cy = o.camY || 0, par = o.par ?? 1.35, W = ba_wind(t), PER = 620, T = [GR[0], GR[1], GR[2], GR[3], GR[5]], T2 = [GR[0], GR[2], LM[2], LM[3], LM[5]];
  const only = o.only;                                                                      // 'l' | 'r' : un seul côté (plans fixes)
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0);
  for (const [x, y, len, ang, wid, tn, sd, bend] of BA_FGL) {
    if (only === 'l' && x > 200) continue; if (only === 'r' && x < 200) continue;
    const xs = ((((x + 150) - cam * par) % PER) + PER) % PER - 150;
    if (xs < -140 || xs > LW + 140) continue;
    ba_leaf(L, xs, y - cy, len * (o.k ?? 1), ang + W * 0.06 * Math.sin(t * 1.3 + sd), wid * (o.k ?? 1), tn ? T2 : T, { seed: sd, bend });
  }
  L.restore();
}
const ba_wind = t => 0.5 * Math.sin(t * 1.1) + 0.3 * Math.sin(t * 2.3 + 1.7);

// ───────────────────────── la branche au-dessus de l'eau ─────────────────────────
// bande de 330 px de long (monde x −60 → 270), dessus de la branche à y = 40 dans la bande ; épaisseur 34 → 20 ; bout brisé à droite
const BA_BR = { x0: -60, w: 330, h: 120, top: 40 };
function ba_buildBranch(c, w, h) {
  const r = rng(77), N = 30, top = BA_BR.top, E = [], B = [];
  const th = f => lerp(36, 21, Math.pow(f, 1.2));
  for (let i = 0; i <= N; i++) { const f = i / N, x = f * (w - 28), ty = top + Math.sin(f * 5 + 1) * 1.8 - f * 5; E.push([x, ty]); B.push([x, ty + th(f) + Math.sin(f * 9) * 1.4]); }
  const path = (a, b) => { c.beginPath(); a.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); b.slice().reverse().forEach(p => c.lineTo(p[0], p[1])); c.closePath(); };
  // bout brisé : éclats
  const tipx = w - 28, tipT = E[N][1], tipB = B[N][1];
  c.fillStyle = '#05040f'; path(E, B); c.lineWidth = 3; c.strokeStyle = '#05040f'; c.lineJoin = 'round'; c.stroke(); c.fill();
  c.fillStyle = WO[2]; path(E, B); c.fill();
  // ombre sous la branche, lumière dessus
  const g = c.createLinearGradient(0, top - 4, 0, top + 38); g.addColorStop(0, 'rgba(199,143,82,0.95)'); g.addColorStop(0.18, 'rgba(133,80,46,0.9)'); g.addColorStop(0.55, 'rgba(72,41,26,0.85)'); g.addColorStop(1, 'rgba(29,18,12,0.95)');
  c.save(); path(E, B); c.clip(); c.fillStyle = g; c.fillRect(0, top - 6, w, 50);
  // stries d'écorce
  c.lineWidth = 1; for (let k = 0; k < 70; k++) { const f0 = r() * 0.95, f1 = f0 + 0.03 + r() * 0.1, u = r(), x0 = f0 * (w - 28), x1 = f1 * (w - 28), y0 = lerp(E[Math.floor(f0 * N)][1], B[Math.floor(f0 * N)][1], u), y1 = lerp(E[Math.min(N, Math.floor(f1 * N))][1], B[Math.min(N, Math.floor(f1 * N))][1], u); c.strokeStyle = u < 0.4 ? WO[4] : WO[0]; c.globalAlpha = 0.55; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1 + (r() - 0.5)); c.stroke(); }
  c.globalAlpha = 1;
  // mousse sur le dessus, surtout à gauche, plaques sur le flanc
  for (let i = 0; i < 26; i++) { const f = r() * 0.97, k = Math.floor(f * N), x = f * (w - 28), y = E[k][1] + 1 + r() * 4, rx = 6 + r() * 12; c.fillStyle = r() < 0.5 ? GR[1] : GR[2]; c.beginPath(); c.ellipse(x, y, rx, 2.6 + r() * 2, 0, 0, TAU); c.fill(); c.fillStyle = GR[3]; c.beginPath(); c.ellipse(x + rx * 0.2, y - 1.2, rx * 0.55, 1.1, 0, 0, TAU); c.fill(); }
  for (let i = 0; i < 9; i++) { const f = r() * 0.9, k = Math.floor(f * N), x = f * (w - 28), y = lerp(E[k][1], B[k][1], 0.45 + r() * 0.4); c.fillStyle = GR[1]; c.beginPath(); c.ellipse(x, y, 5 + r() * 7, 2 + r() * 2, 0, 0, TAU); c.fill(); c.fillStyle = GR[3]; c.beginPath(); c.ellipse(x + 1, y - 1, 3 + r() * 4, 1, 0, 0, TAU); c.fill(); }
  c.restore();
  // liseré de lumière sur l'arête haute
  c.strokeStyle = AM[8]; c.lineWidth = 1.2; c.beginPath(); E.forEach((p, i) => i ? c.lineTo(p[0], p[1] + 0.8) : c.moveTo(p[0], p[1] + 0.8)); c.stroke();
  c.strokeStyle = YE[3]; c.lineWidth = 0.7; c.beginPath(); E.forEach((p, i) => i > 3 && i < N - 3 && (r() < 0.9) ? c.lineTo(p[0], p[1] + 0.2) : c.moveTo(p[0], p[1] + 0.2)); c.stroke();
  // épiphytes (broméliacées, fougères) sur le dessus, à gauche ; pousses feuillues au bout brisé
  for (const [f, hh, n] of [[0.1, 20, 5], [0.27, 15, 4], [0.5, 12, 4]]) { const k = Math.floor(f * N), x = f * (w - 28), y = E[k][1] + 2; for (let q = 0; q < n; q++) ba_leaf(c, x + (q - n / 2) * 2.5, y, hh + r() * 6, -Math.PI / 2 + (q - (n - 1) / 2) * 0.5, 3.4, [GR[0], GR[2], GR[3], LM[3], LM[5]], { seed: q, bend: 0.4 }); }
  for (let q = 0; q < 3; q++) ba_leaf(c, tipx - 4 - q * 2, tipT + 3, 26 - q * 3, -Math.PI / 2 + 0.7 - q * 0.45, 7, [GR[0], GR[1], GR[2], GR[3], GR[5]], { seed: 30 + q, bend: 0.25 });
  // éclats du bout cassé
  c.fillStyle = '#05040f'; c.beginPath(); c.moveTo(tipx - 2, tipT - 1); c.lineTo(tipx + 8, tipT + 3); c.lineTo(tipx + 3, tipT + 8); c.lineTo(tipx + 11, tipT + 12); c.lineTo(tipx + 2, tipB - 6); c.lineTo(tipx + 5, tipB + 2); c.lineTo(tipx - 3, tipB + 1); c.closePath(); c.fill();
  c.fillStyle = WO[5]; c.beginPath(); c.moveTo(tipx - 1, tipT + 1); c.lineTo(tipx + 6, tipT + 4); c.lineTo(tipx + 2, tipT + 9); c.lineTo(tipx + 8, tipT + 12); c.lineTo(tipx + 1, tipB - 7); c.lineTo(tipx + 3, tipB); c.lineTo(tipx - 2, tipB - 1); c.closePath(); c.fill();
  c.fillStyle = WO[3]; c.beginPath(); c.moveTo(tipx + 1, tipT + 9); c.lineTo(tipx + 8, tipT + 12); c.lineTo(tipx + 1, tipB - 7); c.closePath(); c.fill();
  // lianes qui pendent sous la branche
  for (const [f, len] of [[0.18, 38], [0.42, 22], [0.7, 46], [0.9, 30]]) { const k = Math.floor(f * N); ba_vine(c, f * (w - 28), B[k][1] - 2, len, 40 + k, GR[1], LM[2]); }
}
// dessine la branche : (x, y) = abscisse monde du bord gauche de la bande et ordonnée du DESSUS de la branche à y = top
function ba_drawBranch(cam, camY, ytop) { L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(ba_band('branch', BA_BR.w, BA_BR.h, ba_buildBranch), Math.round(BA_BR.x0 - cam), Math.round(ytop - BA_BR.top - camY)); L.restore(); }

// ───────────────────────── plan 1 : c1_branche ─────────────────────────
const ba_A = {};                                                      // instants ABSOLUS de la voix, remplis par buildBasilic
function ba_atmos(t, cam, camY, o = {}) {                             // rayons de la canopée, poussière dorée, brume, insectes : commun à tous les plans
  k_rays(o.sx ?? 224, -14, t, { angle: Math.PI * (o.ang ?? 0.57), spread: 1.05, len: 430, strength: o.rays ?? 0.34, n: 8, col: AM[9], canopy: 0.55, cam, camY, seed: 5 });
  k_dust(t, { n: o.dust ?? 34, cam, y0: 60, y1: 400, x0: -20, x1: LW + 60, par: 0.9, seed: 7, beam: { x: (o.sx ?? 224) - cam * 0.04, y: -14, angle: Math.PI * (o.ang ?? 0.57), spread: 1.4, len: 420 } });
}
function ba_sitAct(u, t) {                                            // mouvements du basilic assis : respiration (dans le sprite), tête qui dodeline, langue, plumet qui se dresse
  const A = ba_A, tl = t - A.tongue, flick = tl > 0 && tl < 0.26 ? Math.sin(tl / 0.26 * Math.PI) : 0, fl2 = t - (A.tongue + 1.1), flick2 = fl2 > 0 && fl2 < 0.22 ? Math.sin(fl2 / 0.22 * Math.PI) : 0, f = Math.max(flick, flick2);
  const flare = bump(t, A.flare, A.flare + 0.25, A.flare + 0.75, A.flare + 1.3);
  return { ha: -0.2 + 0.05 * Math.sin(u * 1.5) + 0.12 * bump(t, A.look, A.look + 0.4, A.look + 1.0, A.look + 1.5), na: -0.62 + 0.04 * Math.sin(u * 1.5 + 0.7), mouth: f * 0.4, tongue: f, sail: 1 + 0.25 * flare, crest: 1 + 0.3 * flare };
}
function ba_c1a(u, t, sh) {
  const dur = Math.max(1, sh.t1 - sh.t0), cam = k_pan(u, 0, 20, 'io', dur), cy = k_pan(u, -40, 0, 'o', Math.min(1.5, dur * 0.5)), yTop = 264;
  ba_world(t, cam, { camY: cy });
  ba_atmos(t, cam, cy);
  k_insects(t, { cx: 70 - cam * 0.9, cy: 300 - cy, r: 40, n: 14, seed: 3 });
  k_butterfly(160 - cam, 190 - cy + 14 * Math.sin(u * 0.9), t, { col: CY[4], col2: BL[3], s: 1.2, phase: 1, rate: 5.2, flutter: 5 });
  k_butterfly(60 - cam * 1.1, 330 - cy + 10 * Math.sin(u * 0.7 + 2), t, { col: YE[2], col2: AM[6], s: 1.0, phase: 3.2, rate: 6.4, flutter: 4 });
  ba_drawBranch(cam, cy, yTop);
  const act = ba_sitAct(u, t);
  k_glow(BA_J.x0 + 40 - cam, yTop - cy - 36, 80, '255,224,138', 0.32);
  ba_lizard(BA_J.x0 + 17 * 2.0 - cam, yTop - cy + 0.6, 2.0, t, { pose: 'sit', over: act, tongue: act.tongue, seed: 1 });
  ba_fgLeaves(t, cam, { camY: cy, par: 1.25 });
  k_leaves(t, { n: 5, cam, wind: 5, y0: 0, y1: 400, cols: [GR[4], LM[4], AM[6]], seed: 3 });
  vignette(0.5, 120, 330, LW / 2, LH / 2 - 20, '5,20,16');
}
function ba_c1aUi(u, t, sh) {
  hudTracker(1, 1, prog(u, 0.15, 0.6));
  if (u > 0.3) hudLieu(1, Math.ceil((u - 0.3) * 32));
}

// séquence de poses : keys [[t, pose, ease?], …] → { pose, pose2, mix }
function ba_seq(t, keys) {
  if (t <= keys[0][0]) return { pose: keys[0][1] };
  for (let i = 0; i < keys.length - 1; i++) if (t < keys[i + 1][0]) { const q = (t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]); return { pose: keys[i][1], pose2: keys[i + 1][1], mix: (keys[i + 1][2] || sm)(clamp(q)) }; }
  return { pose: keys[keys.length - 1][1] };
}

// ───────────────────────── plan 2 : c1_saut (« il peut courir sur l'eau ! » : il se ramasse, bondit, claque l'eau et file) ─────────────────────────
const BA_J = { s: 2.0, wy: 322, x0: 100, yTop: 264, v: 250, cam0: 20, f: 3.3 };
let ba_J = null;                                                        // trajectoire du plan (calculée par buildBasilic)
function ba_jumpInit() {
  const A = ba_A, J = BA_J, tD = A.eau, T = Math.max(0.46, Math.min(0.66, tD - (A.courir - 0.05))), tL = tD - T;
  const hipL = [J.x0, J.yTop - 6.2 * J.s], vx = 262, hipD = [J.x0 + vx * T, J.wy - 28 * J.s];
  ba_J = { tL, tD, T, hipL, hipD, vx, arc: 40 };
}
function ba_jumpAt(t) {                                                  // hanche (monde, y écran), pose, phase de course, caméra
  const J = BA_J, K = ba_J, A = ba_A, f = J.f; let hip, rot = 0, air = false;
  if (t < K.tL) hip = [J.x0, J.yTop - 6.2 * J.s];
  else if (t < K.tD) { const q = (t - K.tL) / K.T; air = true; hip = [lerp(K.hipL[0], K.hipD[0], q), lerp(K.hipL[1], K.hipD[1], q) - 4 * K.arc * q * (1 - q)]; const vy = (K.hipD[1] - K.hipL[1]) / K.T - 4 * K.arc * (1 - 2 * q) / K.T; rot = clamp(0.4 * Math.atan2(vy, K.vx), -0.3, 0.3); }
  else hip = [K.hipD[0] + J.v * (t - K.tD), J.wy - 28 * J.s];
  const keys = [[A.il - 0.1, 'sit'], [A.il + 0.12, 'crouch', eo], [K.tL - 0.02, 'crouch'], [K.tL + 0.1, 'leap', eo], [K.tD - 0.22, 'leap'], [K.tD - 0.04, 'fall', eio], [K.tD + 0.0, 'run']];
  const ps = ba_seq(t, keys), ph = 0.05 + f * (t - K.tD);
  // caméra : fixe tant que le basilic est ramassé, puis elle le suit (le basilic passe de 90 à 118 px de l'écran)
  const scr = lerp(J.x0 - J.cam0, 128, sm(prog(t, K.tL - 0.05, K.tD + 0.5)));
  const camX = t < K.tL - 0.05 ? J.cam0 : hip[0] - scr;
  return { hip, rot, air, ph, cam: Math.max(J.cam0, camX), ...ps };
}
function ba_c1b(u, t, sh) {
  const J = BA_J, K = ba_J, st = ba_jumpAt(t), cam = st.cam, s = J.s;
  ba_world(t, cam, { camY: 0 });
  ba_atmos(t, cam, 0, { dust: 40 });
  k_butterfly(190 - cam, 200 + 10 * Math.sin(u * 3), t, { col: CY[4], col2: BL[3], s: 1.2, phase: 1, rate: 5.2, flutter: 5 });
  ba_drawBranch(cam, 0, J.yTop);
  if (t < ba_J.tD) k_glow(BA_J.x0 + 40 - cam, J.yTop - 36, 80, '255,224,138', 0.3 * (1 - prog(t, ba_J.tL, ba_J.tD)));
  const act = ba_sitAct(u + (sh.t0 - ba_A.t0), t);
  const o = { pose: st.pose, pose2: st.pose2, mix: st.mix ?? 0, ph: st.ph, rot: st.rot, spd: 1, over: st.pose === 'sit' && !st.pose2 ? act : (st.pose === 'sit' ? { sail: lerp(act.sail, 0.9, st.mix) } : undefined), seed: 1 };
  // claquements de l'eau (anneaux avant le basilic, gerbes après)
  const fx = { t0: K.tD, ph0: 0.05, f: J.f, x0: K.hipD[0], v: J.v, dir: 1, s, wy: J.wy, cam, tFrom: K.tD - 0.01, ahead: 22 };
  if (t >= K.tD) ba_runFx(t, { ...fx, layer: 'under' });
  const lz = st.air || t < K.tD ? ba_lizard(0, 0, s, t, { ...o, hip: [st.hip[0] - cam, st.hip[1]] }) : ba_lizard(st.hip[0] - cam, J.wy, s, t, { ...o, tint: [J.wy, '14,40,34', 0.5], reflect: { y: J.wy, a: 0.4, depth: 120 } });
  if (t >= K.tD) ba_runFx(t, { ...fx, layer: 'over' });
  if (t >= K.tD - 0.02) ba_slap(K.hipD[0] + s * 22, J.wy + 3, K.tD, t, { size: 1.5, dir: 1, cam, seed: 99, layer: 'both' });
  ba_fgLeaves(t, cam, { camY: 0, par: 1.25 });
  k_leaves(t, { n: 5, cam, wind: 5, y0: 0, y1: 400, cols: [GR[4], LM[4], AM[6]], seed: 3 });
  vignette(0.5, 120, 330, LW / 2, LH / 2 - 20, '5,20,16');
}
function ba_c1bUi(u, t, sh) { hudTracker(1, 1, 1); hudLieu(1); }

// ───────────────────────── plans de course (c2_course, c2_pattes, c3_ombre) : le basilic file à la surface, la caméra le suit ─────────────────────────
// C : t0 (début du plan), x0 (abscisse monde de la hanche à t0), v (px/s), s, wy (surface sous le basilic), f (cycles/s), ph0 (phase à t0), scr0 → scr1 (abscisse écran de la hanche), tScr (durée du glissement)
function ba_runState(t, C) {
  const hip = C.x0 + C.v * (t - C.t0), ph = C.ph0 + C.f * (t - C.t0), scr = lerp(C.scr0, C.scr1, eio(prog(t, C.t0, C.t0 + (C.tScr ?? 1.2))));
  return { hip, ph, cam: hip - scr, scr };
}
function ba_footTimes(C, tA, tB) {                                         // instants des claquements dans [tA, tB[ (pour les événements de bruitage)
  const out = []; for (let n = Math.floor((C.ph0 - 0.05) / 0.5) - 1; ; n++) { const tn = C.t0 + (0.05 + n * 0.5 - C.ph0) / C.f; if (tn >= tB) break; if (tn >= tA) out.push([tn, n]); } return out;
}
function ba_runScene(t, C, hooks = {}) {
  const st = ba_runState(t, C), cam = st.cam, s = C.s;
  ba_world(t, cam, { camY: 0, flow: 6 });
  ba_atmos(t, cam, 0, { dust: C.dust ?? 38, rays: C.rays ?? 0.3 });
  if (hooks.back) hooks.back(t, cam, st);
  const fx = { t0: C.t0, ph0: C.ph0, f: C.f, x0: C.x0, v: C.v, dir: 1, s, wy: C.wy, cam, ahead: 22, size: s * 0.8 };
  ba_runFx(t, { ...fx, layer: 'under' });
  const K = ba_lizard(st.scr, C.wy, s, t, { pose: 'run', ph: st.ph, spd: 1, over: hooks.over && hooks.over(t, st), tint: [C.wy, '14,40,34', 0.6], reflect: { y: C.wy, a: 0.4, depth: 52 * s + 40 }, seed: 2 });
  ba_runFx(t, { ...fx, layer: 'over' });
  if (hooks.front) hooks.front(t, cam, st, K);
  ba_fgLeaves(t, cam, { camY: 0, par: 1.3 });
  k_leaves(t, { n: 4, cam, wind: 9, y0: 0, y1: 400, cols: [GR[4], LM[4], AM[6]], seed: 3 });
  vignette(0.5, 120, 330, LW / 2, LH / 2 - 20, '5,20,16');
  return { st, K, cam };
}
let ba_C2 = null, ba_C3 = null, ba_C2b = null;

// plan 3 : c2_course — le lézard Jésus-Christ, en entier, à pleine vitesse
function ba_c2a(u, t, sh) { ba_runScene(t, ba_C2); }
function ba_c2aUi(u, t, sh) {
  const A = ba_A; hudTracker(1, 1, 1); hudLieu(1);
  if (t > A.jc) tagBox(8, 38, 'LE LÉZARD JÉSUS-CHRIST', 'white', Math.ceil((t - A.jc) * 40));
}
// plan 4 : c2_pattes — gros plan sur les longues pattes arrière
function ba_c2b(u, t, sh) { ba_runScene(t, ba_C2b); }
function ba_c2bUi(u, t, sh) {
  const A = ba_A; hudTracker(1, 1, 1); hudLieu(1);
  if (t > A.pattes) tagBox(8, 38, '20 PAS PAR SECONDE', 'blue', Math.ceil((t - A.pattes) * 40));
}

// plan 5 : c2_pas — la poche d'air, en coupe et au ralenti
function ba_c2cState(u, sh) { const dur = sh.t1 - sh.t0, p = clamp(u / (dur * 0.86)); return { p: eio(p) * 0.65 + p * 0.35 }; }
function ba_c2c(u, t, sh) {
  const { p } = ba_c2cState(u, sh), wy = 282, sm = 2.7, phi = lerp(0.0, 0.74, p), X0 = 104, f05 = ba_footWater(0.05), xOrig = X0 - f05.ax * sm, pan = 0.5 * BA_HIPV * phi * sm;
  // fond : forêt floue, lumière
  vgrad(0, 0, LW, LH, [[0, '#c4ecb8'], [0.5, '#62ae72'], [1, '#2a6648']]);
  ba_putBand(ba_band('far', BA_PW, 190, ba_buildFar), 30, 0.1, pan * 0.3);
  ba_putBand(ba_band('mid', BA_PW, 215, ba_buildMid), 0, 0.28, pan * 0.5);
  { const c = ba_tmpCv || (ba_tmpCv = mkCanvas()), x = ba_tmpCv.getContext('2d'); x.clearRect(0, 0, LW, LH); x.drawImage(low, 0, 0, LW, wy); L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.fillStyle = '#62ae72'; L.fillRect(0, 0, LW, wy); L.filter = 'blur(2.2px)'; L.drawImage(c, 0, 0, LW, wy, 0, 0, LW, wy); L.filter = 'none'; L.restore(); }
  k_glow(150, 70, 100, '255,240,170', 0.3);
  // eau en coupe : dégradé du vert sous la surface au bleu profond, rayons, particules
  vgrad(0, wy, LW, LH - wy, [[0, '#2a6648'], [0.12, '#1f7a96'], [0.45, '#124a66'], [1, '#10102e']]);
  for (let i = 0; i < 14; i++) { const x = ((ba_h(i, 4) * 340 - pan * 0.7 + t * 4 * (0.3 + ba_h(i, 5))) % 340 + 340) % 340 - 35, y = wy + 14 + ba_h(i, 6) * 150; px(x, y, i % 3 ? CY[2] : CY[3]); }
  for (let i = 0; i < 6; i++) { const x = ((ba_h(i, 14) * 300 - pan * 0.5) % 300 + 300) % 300 - 20, w = 2 + ba_h(i, 15) * 6; R(x, wy + 6 + i * 3 + ba_h(i, 16) * 5, w, 1, CY[3]); }
  ba_pocket(xOrig + f05.ax * sm - pan, wy, sm, phi, t);
  const dx2 = 0.5 * BA_HIPV * sm; if (phi > 0.5) ba_pocket(xOrig + f05.ax * sm + dx2 - pan, wy, sm, phi - 0.5, t);
  L.save(); L.translate(0, 0);
  ba_lizard(xOrig + BA_HIPV * phi * sm - pan, wy, sm, t, { pose: 'run', ph: phi, spd: 0.3, seed: 2, rim: 1, noEye: false });
  L.restore();
  // surface : liseré clair, rides vues par la tranche, gerbe, jet de l'effondrement
  const sx = xOrig + f05.ax * sm - pan;
  R(0, wy - 1, LW, 1, CY[4]); R(0, wy, LW, 1, WH[3]); for (let x = 0; x < LW; x += 3) if (ba_h(x, 9) < 0.5) px(x + ((t * 20) | 0) % 3, wy + 1, CY[3]);
  if (phi > 0.05) ba_slap(sx + pan, wy, 0, (phi - 0.05) * 1.5, { size: 2.2, dir: 1, cam: pan, seed: 5, sq: 0.07, layer: 'over' });
  vignette(0.45, 120, 330, LW / 2, LH / 2 - 20, '5,10,24');
}
let ba_tmpCv = null;
function ba_c2cUi(u, t, sh) {
  const A = ba_A, { p } = ba_c2cState(u, sh);
  tagBox(8, 14, 'RALENTI', 'blue', Math.ceil(u * 40));
  if (p > 0.16) tagBox(8, 34, "PAS D'AIR SOUS LE PIED", 'white', Math.ceil((p - 0.16) * 120));
}

// ───────────────────────── plans 6 et 7 : c3_ombre, c3_fuite ─────────────────────────
// Une seule action continue (ba_c3At) montrée en deux plans : l'ombre d'un oiseau de proie rattrape le basilic ; le caïman jaillit, le basilic bondit sur le tronc de l'autre rive et grimpe.
const BA_L3 = { s: 1.3, wy: 322, v: 268, f: 3.5, ang: -0.3, logTop: 318 };
let ba_L3 = null;
function ba_c3Init(S) {
  const A = ba_A, tR0 = A.c3 - 0.1, tP = A.pred, tJ = tP - 0.14, K = BA_L3, tLand = tJ + 0.34, tEnd = S.t1;
  const xLb = 700, hipJ = xLb - 40;                                         // pointe du tronc (monde) ; hanche au début du bond
  ba_L3 = { tR0, tP, tJ, tLand, tEnd, xLb, hipJ, x0: hipJ - K.v * (tJ - tR0), dLand: 60, dEnd: 168, tClimb: 0.95 };
}
function ba_logPt(d, h) { const a = BA_L3.ang; return [ba_L3.xLb + d * Math.cos(a) + h * Math.sin(a), BA_L3.logTop + d * Math.sin(a) - h * Math.cos(a)]; }
function ba_c3At(t) {
  const L3 = ba_L3, K = BA_L3, s = K.s, a = K.ang, climbT = t - L3.tLand;
  let hip, pose, pose2, mix, rot = 0, ph = 0.1 + K.f * (t - L3.tR0), onLog = false, air = false;
  const hAbove = 7.8 * s;
  if (t < L3.tJ) { hip = [L3.x0 + K.v * (t - L3.tR0), K.wy - 28 * s]; pose = 'run'; }
  else if (t < L3.tLand) {                                                  // bond du bas du tronc : accroupi → étiré → reçu sur le dos du tronc
    const q = (t - L3.tJ) / (L3.tLand - L3.tJ), p0 = [L3.hipJ, K.wy - 28 * s], p1 = ba_logPt(L3.dLand, hAbove); air = true;
    hip = [lerp(p0[0], p1[0], q), lerp(p0[1], p1[1], eo(q) ) - 4 * 22 * q * (1 - q)];
    const ps = ba_seq(t, [[L3.tJ - 0.001, 'run'], [L3.tJ + 0.1, 'leap', eo], [L3.tLand - 0.12, 'leap'], [L3.tLand, 'crouch', eio]]); pose = ps.pose; pose2 = ps.pose2; mix = ps.mix; rot = lerp(0, a, sm(q));
  } else {                                                                    // il grimpe : suite de petits bonds (accroupi ↔ étiré), puis il se dresse
    const e = 1 - Math.pow(1 - clamp(climbT / L3.tClimb), 2.4), d = lerp(L3.dLand, L3.dEnd, e), hop = Math.abs(Math.sin(climbT * TAU * 2.1)) * (1 - e) * 5 * s;
    const p1 = ba_logPt(d, hAbove + hop); hip = p1; onLog = true; rot = a;
    const cyc = 0.5 - 0.5 * Math.cos(climbT * TAU * 2.1), settle = sm(prog(climbT, L3.tClimb * 0.82, L3.tClimb * 1.1));
    if (climbT < L3.tClimb * 0.9) { pose = 'crouch'; pose2 = 'leap'; mix = cyc * (1 - e * 0.6); } else { pose = 'crouch'; pose2 = 'look'; mix = settle; }
  }
  const camJ = L3.hipJ - 150, camA = t < L3.tJ ? hip[0] - 150 : camJ + K.v * 0.15 * (1 - Math.exp(-(t - L3.tJ) / 0.15)), cam = t < L3.tJ ? camA : Math.max(camA, hip[0] - 190), scr = hip[0] - cam;
  return { hip, pose, pose2, mix, rot, ph, air, onLog, cam, scr, climbT };
}
function ba_c3Cam(t) { const L3 = ba_L3, K = BA_L3, st = ba_c3At(t); return st.cam; }
// la caméra ne doit pas sauter d'un régime à l'autre : on la calcule avec la hanche de la COURSE tant que le basilic court, puis avec la hanche réelle
function ba_c3Draw(u, t, sh, o = {}) {
  const L3 = ba_L3, K = BA_L3, s = K.s, st = ba_c3At(t), cam = st.cam, wy = K.wy, A = ba_A;
  ba_world(t, cam, { camY: 0, flow: 7 });
  ba_atmos(t, cam, 0, { dust: 34, rays: 0.3 });
  // l'oiseau de proie : dans la trouée lumineuse, puis son ombre rattrape le basilic par la gauche
  const u0 = t - L3.tR0, bx = -40 + 175 * u0, shx = bx - 25 + 20 * Math.sin(u0 * 2);
  if (o.bird !== false) { k_bird(bx + 30 * 0 - cam * 0, 66 + 5 * Math.sin(u0 * 2.3), t, { kind: 'soar', dir: 1, s: 1.7, col: NI[0], col2: ST[1], rim: AM[9], cam: 0, par: 0 }); }
  const dimK = clamp(1 - Math.abs((st.hip[0] - cam) - shx) / 70) * (t < L3.tJ + 0.1 ? 1 : 0);                        // le basilic traverse l'ombre : plus sombre
  const shadowA = 0.5 * (1 - clamp(prog(t, L3.tJ, L3.tJ + 0.4)));
  // tronc de l'autre rive (monde) : branche retournée et inclinée, pointe cassée dans l'eau
  const lx = L3.xLb - cam;
  if (lx < LW + 40) {
    L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.translate(lx, K.logTop); L.rotate(K.ang); L.scale(-1, 1);
    L.drawImage(ba_band('branch', BA_BR.w, BA_BR.h, ba_buildBranch), -(BA_BR.w - 28), -BA_BR.top); L.restore();
    for (let i = 0; i < 9; i++) { const ang = i / 9 * TAU + 0.4, rr = 10 + 6 * Math.sin(t * 1.4 + i); px(lx + 2 + Math.cos(ang) * rr * 1.4, K.wy + 4 + Math.sin(ang) * rr * 0.28, (i + ((t * 5) | 0)) % 3 ? CY[4] : WH[3]); }   // écume au pied du tronc
  }
  // caïman : approche en rase-eau (yeux et narines), puis jaillit
  const tE = L3.tP - 0.1, rise = t < tE ? 0.04 + 0.04 * Math.sin(t * 4) : t < L3.tP + 0.2 ? lerp(0.08, 1, eob(prog(t, tE, L3.tP + 0.18))) : 1 - sm(prog(t, L3.tP + 0.62, L3.tP + 1.15));
  const lunge = eo(prog(t, tE, L3.tP + 0.32)), runLine = L3.x0 + K.v * (Math.min(t, tE) - L3.tR0);
  const caiX = runLine - 130 + (L3.xLb - 100 - (L3.x0 + K.v * (tE - L3.tR0) - 130)) * lunge - cam;
  const caiOpen = t < L3.tP ? 0 : t < L3.tP + 0.38 ? sm(prog(t, L3.tP, L3.tP + 0.22)) : 1 - eo(prog(t, L3.tP + 0.38, L3.tP + 0.5));
  if (t > L3.tR0 && caiX > -140) {
    if (t < L3.tP + 1.4) {
      ba_slap(caiX + cam + 70, wy - 4, L3.tP - 0.12, t, { size: 2.3, dir: 1, cam, seed: 12, layer: 'under', sq: 0.26 });
      if (t < tE + 0.1) { for (let k = 0; k < 4; k++) ba_slap(caiX + cam + 20 + k * 6 + 70, wy - 4, t - 0.2 - k * 0.11, t, { size: 0.9, dir: 1, cam, seed: 3 + k, layer: 'under' }); }
      const g = ba_caiman(caiX, wy - 4, 1.3, t, { rise, open: caiOpen, pitch: -0.5 + 0.12 * lunge });
      if (rise > 0.3) ba_slap(caiX + cam + 40, wy - 4, L3.tP - 0.12, t, { size: 2.1, dir: -1, cam, seed: 12, layer: 'over' });
    }
  }
  if (shadowA > 0.02 && o.shadow !== false) ba_birdShadow(shx, wy + 8, t, { s: 1.5, dir: 1, a: shadowA, squash: 0.5 });
  // le basilic : sa course, son bond, sa grimpée
  const fx = { t0: L3.tR0, ph0: 0.1, f: K.f, x0: L3.x0, v: K.v, dir: 1, s, wy, cam, ahead: 22, size: s * 0.8 };
  if (t < L3.tJ + 0.05) ba_runFx(t, { ...fx, layer: 'under', tFrom: L3.tR0 - 2 });
  const lo = { pose: st.pose, pose2: st.pose2, mix: st.mix ?? 0, ph: st.ph, rot: st.rot, spd: 1, seed: 2, dim: dimK * 0.55 };
  if (st.onLog || st.air) ba_lizard(0, 0, s, t, { ...lo, hip: [st.hip[0] - cam, st.hip[1]], tint: st.air && st.hip[1] > wy - 10 ? [wy, '14,40,34', 0.6] : undefined });
  else ba_lizard(st.hip[0] - cam, wy, s, t, { ...lo, over: { }, tint: [wy, '14,40,34', 0.6], reflect: { y: wy, a: 0.4, depth: 52 * s + 40 } });
  if (t < L3.tJ + 0.05) ba_runFx(t, { ...fx, layer: 'over', tFrom: L3.tR0 - 2 });
  if (t > L3.tJ - 0.02 && t < L3.tJ + 0.8) ba_slap(L3.hipJ + 20, wy + 2, L3.tJ, t, { size: 1.7, dir: 1, cam, seed: 31, layer: 'both' });      // la dernière poussée sur l'eau
  ba_fgLeaves(t, cam, { camY: 0, par: 1.3 });
  k_leaves(t, { n: 4, cam, wind: 9, y0: 0, y1: 400, cols: [GR[4], LM[4], AM[6]], seed: 3 });
  vignette(0.5, 120, 330, LW / 2, LH / 2 - 20, '5,20,16');
}
function ba_c3aUi(u, t, sh) { hudTracker(1, 1, 1); hudLieu(1); if (t < ba_A.c3 + 0.9) tagBox(8, 38, '≈ 1,5 M/S', 'blue', Math.ceil((t - ba_A.c3 + 0.1) * 40)); }
function ba_c3bUi(u, t, sh) {
  const L3 = ba_L3, tick = Math.max(wt1('c3', 'prédateurs'), L3.tLand + 0.7);
  hudTracker(1, t > tick ? 2 : 1, 1); hudLieu(1);
  if (t > tick) { const p = prog(t, tick, tick + 0.4); }
}
const ba_c3a = (u, t, sh) => ba_c3Draw(u, t, sh);
const ba_c3b = (u, t, sh) => ba_c3Draw(u, t, sh);

function buildBasilic(S) {
  const A = ba_A;
  A.t0 = S.t0; A.il = wt('c1', 'il'); A.courir = wt('c1', 'courir'); A.sur = wt('c1', 'sur'); A.eau = wt('c1', "l'eau"); A.c2 = wt('c2', 'Surnommé');
  A.tongue = wt('c1', 'lézard') + 0.1; A.flare = wt('c1', 'complètement'); A.look = wt('c1', 'capacité');
  A.jc = wt('c2', 'Jésus-Christ'); A.utilise = wt('c2', 'utilise'); A.pattes = wt('c2', 'pattes'); A.pour = wt('c2', 'pour'); A.c3 = wt('c3', 'Et');
  A.ech = wt('c3', 'échapper'); A.pred = wt('c3', 'prédateurs');
  ba_jumpInit(); ba_c3Init(S);
  const K = ba_J, J = BA_J, evSlaps = [];
  for (let n = 0; ; n++) { const tn = K.tD + n * 0.5 / J.f; if (tn >= A.c2 - 0.1) break; evSlaps.push([tn, 'slap', 1]); }
  shot('c1_branche', S.t0, { draw: ba_c1a, ui: ba_c1aUi, ev: [[A.tongue + 0.05, 'blip', 0.5]] });
  shot('c1_saut', A.il - 0.1, { draw: ba_c1b, ui: ba_c1bUi, ev: [[K.tL + 0.02, 'hop', 1], [K.tL + 0.05, 'whoosh', 0.5], [K.tD, 'splash', 1.3], ...evSlaps] });
  const tA = A.c2 - 0.1, tB = A.utilise - 0.1, tC = A.pour - 0.1, tD = A.c3 - 0.1, tE = A.ech - 0.1;
  ba_C2 = { t0: tA, x0: 0, v: 250, s: 1.55, wy: 320, f: 3.3, ph0: 0.2, scr0: 150, scr1: 128, tScr: 1.3, dust: 40 };
  ba_C2b = { t0: tB, x0: ba_C2.x0 + 250 * (tB - tA), v: 250, s: 2.25, wy: 338, f: 3.3, ph0: ba_C2.ph0 + 3.3 * (tB - tA), scr0: 100, scr1: 92, tScr: 1.6, dust: 30 };
  const ev2 = ba_footTimes(ba_C2, tA, tB).flatMap(([tn, n]) => [[tn, 'slap', 1], ...(n % 2 === 0 ? [[tn + 0.01, 'splash', 0.6]] : [])]);
  const ev2b = ba_footTimes(ba_C2b, tB, tC).flatMap(([tn, n]) => [[tn, 'slap', 1], ...(n % 2 === 0 ? [[tn + 0.01, 'splash', 0.7]] : [])]);
  shot('c2_course', tA, { draw: ba_c2a, ui: ba_c2aUi, ev: [[tA + 0.02, 'whoosh', 1.2], [A.jc, 'label', 1], ...ev2] });
  shot('c2_pattes', tB, { draw: ba_c2b, ui: ba_c2bUi, ev: [[A.pattes, 'label', 1], ...ev2b] });
  shot('c2_pas', tC, { draw: ba_c2c, ui: ba_c2cUi, ev: [[tC + 0.1, 'label', 1]] });
  const L3 = ba_L3, evA = ba_footTimes({ t0: L3.tR0, ph0: 0.1, f: BA_L3.f }, tD, tE).flatMap(([tn, n]) => [[tn, 'slap', 1], ...(n % 2 === 0 ? [[tn + 0.01, 'splash', 0.6]] : [])]);
  const evB = ba_footTimes({ t0: L3.tR0, ph0: 0.1, f: BA_L3.f }, tE, L3.tJ).flatMap(([tn, n]) => [[tn, 'slap', 1], ...(n % 2 === 0 ? [[tn + 0.01, 'splash', 0.6]] : [])]);
  const tick = Math.max(wt1('c3', 'prédateurs'), L3.tLand + 0.7);
  shot('c3_ombre', tD, { draw: ba_c3a, ui: ba_c3aUi, ev: [[tD + 0.05, 'whoosh', 1], [tD + 0.1, 'label', 1], [tD + 0.35, 'bird', 2], ...evA] });
  shot('c3_fuite', tE, { draw: ba_c3b, ui: ba_c3bUi, ev: [...evB, [L3.tJ, 'hop', 1], [L3.tJ + 0.02, 'splash', 1.2], [L3.tP - 0.05, 'splash', 1.6], [L3.tP + 0.38, 'bang', 1], [L3.tP + 0.4, 'splash', 1.4], [L3.tLand, 'hop', 1], [tick, 'ding', 1]] });
}
