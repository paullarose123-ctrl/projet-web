'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_basilic_sprites.js — le BASILIC À PLUMET (Basiliscus plumifrons, mâle), l'eau qu'il frappe, ses prédateurs. Préfixe ba_.
   (en cours d'écriture : l'en-tête d'API est complété à la fin)
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ───────────────────────── outils ─────────────────────────
const ba_rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ba_hex = r => '#' + r.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function ba_snap(h) { const r = ba_rgb(h); return PAL_HEX[LUT[((r[0] >> 3) << 10) | ((r[1] >> 3) << 5) | (r[2] >> 3)]]; }
function ba_mix(a, b, k) { const A = ba_rgb(a), B = ba_rgb(b); return ba_snap(ba_hex(A.map((v, i) => v + (B[i] - v) * k))); }
function ba_h(i, s = 0) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
const ba_frac = v => v - Math.floor(v);
const ba_scr = mkCanvas(), ba_S = ba_scr.getContext('2d', { willReadFrequently: true });
let ba_BB = [0, 0, LW, LH];                                          // zone de travail (pixels écran) : limite le coût du calque et des croissants

function ba_layerBegin() { Y.setTransform(1, 0, 0, 1, 0, 0); Y.globalAlpha = 1; Y.globalCompositeOperation = 'source-over'; Y.filter = 'none'; const B = ba_BB; Y.clearRect(B[0] - 2, B[1] - 2, B[2] - B[0] + 4, B[3] - B[1] + 4); }
// o.outline : couleur du contour ; o.tint : [y, couleur 'r,g,b', alpha] teinte ce qui est SOUS l'ordonnée y (partie immergée vue à travers l'eau)
function ba_layerEnd(o = {}) {
  const B = ba_BB, x0 = Math.max(0, B[0] - 1), y0 = Math.max(0, B[1] - 1), x1 = Math.min(LW, B[2] + 1), y1 = Math.min(LH, B[3] + 1), w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  const id = Y.getImageData(x0, y0, w, h), d = id.data;
  for (let i = 3; i < d.length; i += 4) { const a = d[i]; if (a) d[i] = a >= 128 ? 255 : 0; }
  if (o.outline) {
    const oc = ba_rgb(o.outline), add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = y * w + x; if (d[p * 4 + 3]) continue; if ((x > 0 && d[(p - 1) * 4 + 3]) || (x < w - 1 && d[(p + 1) * 4 + 3]) || (y > 0 && d[(p - w) * 4 + 3]) || (y < h - 1 && d[(p + w) * 4 + 3])) add.push(p); }
    for (const p of add) { d[p * 4] = oc[0]; d[p * 4 + 1] = oc[1]; d[p * 4 + 2] = oc[2]; d[p * 4 + 3] = 255; }
  }
  Y.putImageData(id, x0, y0);
  if (o.tint) {
    const ty = Math.round(o.tint[0]); Y.globalCompositeOperation = 'source-atop'; Y.globalAlpha = o.tint[2]; Y.fillStyle = `rgb(${o.tint[1]})`;
    Y.fillRect(x0, ty, w, Math.max(0, y1 - ty)); Y.globalCompositeOperation = 'source-over'; Y.globalAlpha = 1;
  }
  L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(lay, x0, y0, w, h, x0, y0, w, h);
}
// croissant : la partie de path qui n'est PAS couverte par path décalé de (dx, dy) (donc du côté opposé au décalage), bornée à path.
// crisp : alpha seuillé (liseré net, pixels purs de la palette)
function ba_cres(c, path, col, dx, dy, alpha = 1, crisp = false) {
  const S = ba_S, B = ba_BB, w = B[2] - B[0], h = B[3] - B[1];
  S.setTransform(1, 0, 0, 1, 0, 0); S.globalCompositeOperation = 'source-over'; S.filter = 'none'; S.globalAlpha = 1; S.clearRect(B[0], B[1], w, h);
  S.setTransform(c.getTransform());
  S.fillStyle = col; S.fill(path);
  S.globalCompositeOperation = 'destination-out'; S.translate(dx, dy); S.fill(path);
  S.globalCompositeOperation = 'source-over'; S.setTransform(1, 0, 0, 1, 0, 0);
  if (crisp) { const id = S.getImageData(B[0], B[1], w, h), dd = id.data; for (let i = 3; i < dd.length; i += 4) dd[i] = dd[i] >= 110 ? 255 : 0; S.putImageData(id, B[0], B[1]); }
  c.save(); c.clip(path); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = alpha; c.drawImage(ba_scr, B[0], B[1], w, h, B[0], B[1], w, h); c.restore();
}
// courbe de Catmull-Rom ouverte : n points par intervalle
function ba_cr(pts, n = 4) {
  const out = [], m = pts.length;
  for (let i = 0; i < m - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(m - 1, i + 2)];
    for (let k = 0; k < n; k++) { const f = k / n, f2 = f * f, f3 = f2 * f; out.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * f + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * f2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * f3))); }
  }
  out.push(pts[m - 1].slice()); return out;
}
// polygone d'orientation constante (pour que l'union de plusieurs sous-chemins en remplissage non nul ne fasse pas de trous)
function ba_poly(pts) {
  let A = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; A += a[0] * b[1] - b[0] * a[1]; }
  const q = A < 0 ? pts.slice().reverse() : pts, p = new Path2D(); p.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) p.lineTo(q[i][0], q[i][1]); p.closePath(); return p;
}
function ba_union(...polys) {
  const p = new Path2D();
  for (const pts of polys) { let A = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; A += a[0] * b[1] - b[0] * a[1]; } const q = A < 0 ? pts.slice().reverse() : pts; p.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) p.lineTo(q[i][0], q[i][1]); p.closePath(); }
  return p;
}
function ba_limbPts(pts, ws, n = 4) {                                            // patte / queue / cou : ligne médiane et largeurs interpolées → contour (liste de points)
  const cp = ba_cr(pts, n), wp = ba_cr(ws.map((w, i) => [i, w]), n).map(q => Math.max(0.3, q[1]));
  return limb(cp, wp);
}
function ba_elp(cx, cy, rx, ry, rot = 0, n = 20) { const o = [], c = Math.cos(rot), s = Math.sin(rot); for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * c - y * s, cy + x * s + y * c]); } return o; }
function ba_ik(a, b, l1, l2, bend) {                                              // deux os : articulation intermédiaire (bend ±1 : de quel côté elle plie)
  const dx = b[0] - a[0], dy = b[1] - a[1], dd = Math.hypot(dx, dy) || 0.001, d = Math.max(0.001, Math.min(dd, 0.97 * (l1 + l2))), k = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - k * k)), ux = dx / dd, uy = dy / dd;
  return [a[0] + ux * k - uy * h * bend, a[1] + uy * k + ux * h * bend];
}
const ba_ang = (a, l) => [Math.cos(a) * l, Math.sin(a) * l];

// ───────────────────────── couleurs (toutes ramenées d'avance à la palette) ─────────────────────────
// vert vif du dos (LM), flanc, ombre froide (GR), ventre pâle, œil doré, franges clair ; dim : 0..1 vers l'ombre (sous-bois, ombre d'un oiseau)
const ba_palM = new Map();
function ba_pal(dim = 0, far = 0) {
  const dq = Math.round(clamp(dim) * 10) / 10, fq = Math.round(clamp(far) * 10) / 10, key = dq + '|' + fq;
  let C = ba_palM.get(key); if (C) return C;
  const T = (c, extra = 0) => { let r = c; const k = clamp(dq + fq * 0.55 + extra); if (k > 0) r = ba_mix(r, '#0e2a22', k * 0.8); return r; };
  C = {
    line: '#05040f', deep: T(GR[1]), dark: T(GR[2]), shade: T(GR[3]), base: T(LM[3]), lit: T(LM[4]), hi: T(LM[5]), top: T(LM[6]),
    belly: T(LM[5]), bellyHi: T(LM[6]), stripe: T(WH[1]), spot: T(CY[3]), spot2: T(CY[2]),
    mem: T(GR[4]), memHi: T(LM[5]), memRib: T(GR[2]), memEdge: T(LM[6]),                   // voile et crête : membrane vert menthe, nervures sombres, bord clair
    fringe: T(LM[6]), fringeRay: T(GR[3]),
    eye: AM[8], eyeEdge: AM[5], mouth: T(GR[1]), tongue: RD[4], rim: AM[9],
  };
  ba_palM.set(key, C); return C;
}

// ───────────────────────── poses ─────────────────────────
// Repère du modèle : x vers l'AVANT (le basilic regarde à droite ; o.flip le retourne), y vers le BAS, y = 0 : le support (branche, surface de l'eau). Unités : pixels à s = 1 (tête 16 px, tronc 38 px, queue 118 px).
// hx, hy : hanche ; ta : angle du tronc (de la hanche au cou, rad, négatif = vers le haut) ; tl : longueur du tronc ; arch : cambrure du dos (px) ; na, nl : angle et longueur du cou ; ha : angle de la tête ;
// tailA, tailC : angle de départ de la queue (π = vers l'arrière) et courbure totale ; tw : amplitude (rad) de l'ondulation ; tph : phase de l'ondulation (cycles) ; tlen : longueur de la queue ;
// L* : patte arrière proche (cheville x, y ; angle du pied ; ouverture des orteils 0..1) ; F* : patte arrière éloignée ; lk : échelle des os de la patte (raccourci du sprawl) ;
// A*, B* : mains proche et éloignée (position) ; sail : hauteur du voile dorsal (1 = repos) ; crest : hauteur du plumet de la tête ; mouth : ouverture de la gueule ; sx : étalement latéral.
const BA_POSES = {
  sit: { hx: -17, hy: -8.5, ta: -0.16, tl: 36, arch: 1.4, na: -0.62, nl: 8, ha: -0.20, tailA: 3.06, tailC: 0.50, tw: 0.05, tph: 0, tlen: 118,
    Lx: -12.5, Ly: -1.2, Lt: 0.0, Ls: 0.5, Kx: -7, Ky: -4.2, Fx: -6, Fy: -1.2, Ft: 0.0, Fs: 0.45, KFx: -1, KFy: -4.4, lk: 0.64, Ax: 6, Ay: 13, Bx: 0.5, By: 13, sail: 1, crest: 1, mouth: 0 },
  look: { hx: -17, hy: -8.5, ta: -0.30, tl: 36, arch: 1.0, na: -0.85, nl: 8.5, ha: -0.42, tailA: 3.06, tailC: 0.55, tw: 0.05, tph: 0, tlen: 118,
    Lx: -12.5, Ly: -1.2, Lt: 0.0, Ls: 0.5, Kx: -7, Ky: -4.2, Fx: -6, Fy: -1.2, Ft: 0.0, Fs: 0.45, KFx: -1, KFy: -4.4, lk: 0.64, Ax: 5, Ay: 13.5, Bx: -0.5, By: 13.5, sail: 1.12, crest: 1.1, mouth: 0 },
  crouch: { hx: -15, hy: -9.5, ta: -0.08, tl: 34, arch: 3.0, na: -0.30, nl: 7.5, ha: 0.12, tailA: 3.04, tailC: 0.35, tw: 0.03, tph: 0, tlen: 118,
    Lx: -10, Ly: -1.2, Lt: 0.0, Ls: 0.8, Kx: -3, Ky: -6.2, Fx: -4, Fy: -1.2, Ft: 0.0, Fs: 0.7, KFx: 2, KFy: -6.4, lk: 0.78, Ax: 6, Ay: 12, Bx: 1, By: 12.5, sail: 0.85, crest: 0.9, mouth: 0 },
  leap: { hx: 0, hy: -30, ta: -0.50, tl: 38, arch: 1.5, na: -0.45, nl: 8, ha: -0.12, tailA: 3.30, tailC: -0.2, tw: 0.08, tph: 0, tlen: 118,
    Lx: -26, Ly: -22, Lt: 2.9, Ls: 0.1, Fx: -22, Fy: -36, Ft: 2.8, Fs: 0.1, lk: 1, Ax: 13, Ay: -2, Bx: 11, By: -4, sail: 0.7, crest: 0.8, mouth: 0 },
  fall: { hx: 0, hy: -30, ta: -0.62, tl: 38, arch: 0.5, na: -0.40, nl: 8, ha: 0.0, tailA: 3.22, tailC: 0.2, tw: 0.08, tph: 0, tlen: 118,
    Lx: 12, Ly: -10, Lt: 0.7, Ls: 0.9, Fx: 6, Fy: -16, Ft: 0.9, Fs: 0.7, lk: 1, Ax: -9, Ay: 8, Bx: -10, By: 6, sail: 0.8, crest: 0.85, mouth: 0 },
  swim: { hx: -6, hy: 4, ta: -0.12, tl: 36, arch: 0.5, na: -0.45, nl: 8, ha: -0.18, tailA: 3.2, tailC: 0.1, tw: 0.2, tph: 0, tlen: 118,
    Lx: -14, Ly: 12, Lt: 2.2, Ls: 0.6, Fx: -10, Fy: 14, Ft: 2.0, Fs: 0.6, lk: 0.8, Ax: 7, Ay: 9, Bx: 3, By: 10, sail: 0.8, crest: 1, mouth: 0 },
};
// cycle de course : deux pas par cycle (une patte par demi-cycle) ; clés [phase, cheville x (relative à la hanche), cheville y (0 = surface), angle du pied, orteils]
// phase : 0,05 claque (le pied frappe l'eau, orteils ouverts) → 0,12-0,34 poussée (le pied s'enfonce, la poche d'air se forme) → 0,50 le pied sort (avant que la poche ne se referme) → 0,70 jambe repliée, genou haut → 0,92 elle repart vers l'avant
const BA_RUNK = [
  [0.00, 14.0, -9.0, 0.60, 0.85], [0.05, 15.0, -0.5, 0.64, 1.00], [0.12, 12.5, 3.0, 0.98, 1.00], [0.22, 7.0, 6.2, 1.25, 0.95], [0.34, 0.5, 7.6, 1.45, 0.85],
  [0.44, -6.0, 5.2, 1.66, 0.60], [0.50, -9.0, -2.0, 1.95, 0.30], [0.58, -9.5, -12.0, 2.15, 0.10], [0.70, -4.0, -22.0, 2.00, 0.10], [0.82, 6.0, -23.0, 1.50, 0.35], [0.92, 12.0, -16.0, 0.92, 0.70],
];
const BA_RUNT = (function () {
  const k = []; for (const sh of [-1, 0, 1]) for (const r of BA_RUNK) k.push([r[0] + sh, ...r.slice(1)]);
  return [1, 2, 3, 4].map(j => k.map(r => [r[0], r[j]]));
})();
function ba_runLeg(ph) {
  const u = ba_frac(ph);
  return { x: tab(BA_RUNT[0], u), y: tab(BA_RUNT[1], u), th: tab(BA_RUNT[2], u), sp: clamp(tab(BA_RUNT[3], u)), ph: u };
}
// pose de course debout : ph = cycles écoulés (la patte proche frappe l'eau à ph = 0,05), spd 0..1 (intensité : tangage, voile couché, queue)
function ba_runPose(o, t) {
  const ph = o.ph ?? t * 3.3, spd = o.spd ?? 1, a = ba_runLeg(ph), b = ba_runLeg(ph + 0.5), bob = 0.5 - 0.5 * Math.cos(TAU * 2 * (ph - 0.05));
  return {
    hx: 0, hy: -28 - 2.4 * bob, ta: -0.54 + 0.05 * Math.sin(TAU * 2 * ph + 1.0), tl: 38, arch: 1.2, na: -0.42 + 0.04 * Math.sin(TAU * 2 * ph + 2.0), nl: 8, ha: -0.04 + 0.05 * Math.sin(TAU * 2 * ph + 2.6),
    tailA: 3.14 + 0.16 + 0.05 * Math.sin(TAU * ph + 0.4), tailC: -0.10, tw: 0.17 * spd, tph: ph, tlen: 118,
    Lx: a.x, Ly: a.y, Lt: a.th, Ls: a.sp, Fx: b.x, Fy: b.y, Ft: b.th, Fs: b.sp, lk: 1,
    Ax: -9.5 + 1.2 * Math.sin(TAU * ph + 0.3), Ay: 7.5 + 1.5 * Math.sin(TAU * ph + 1), Bx: -10.5 + 1.2 * Math.sin(TAU * ph + 3.4), By: 5.5 + 1.5 * Math.sin(TAU * ph + 4),
    sail: 0.9, crest: 0.9, mouth: 0, flow: 0.45 * spd,
  };
}
function ba_getPose(o, t) {
  const get = n => n === 'run' ? ba_runPose(o, t) : (BA_POSES[n] || BA_POSES.sit);
  const A = get(o.pose || 'sit'); let P = { ...A };
  if (o.pose2) { const B = get(o.pose2), k = clamp(o.mix ?? 0); for (const key in A) if (typeof A[key] === 'number' && typeof B[key] === 'number') P[key] = lerp(A[key], B[key], k); }
  if (o.over) Object.assign(P, o.over);
  return P;
}

// ───────────────────────── squelette : toutes les articulations dans le repère du modèle ─────────────────────────
const BA_WT = [[0, 10.0], [0.22, 11.6], [0.5, 12.6], [0.78, 11.4], [1, 7.6]];          // largeur du tronc le long de l'épine (hanche 0 → cou 1)
const BA_SAILH = [[0, 2.2], [0.1, 5], [0.28, 9.5], [0.5, 11.2], [0.7, 9.4], [0.88, 5.4], [1, 2]];   // hauteur du voile dorsal le long de l'épine
function ba_solve(P, t, o) {
  const K = { P }, H = [P.hx, P.hy], dT = [Math.cos(P.ta), Math.sin(P.ta)], nT = [Math.sin(P.ta), -Math.cos(P.ta)];
  const br = 1 + 0.05 * Math.sin(TAU * (o.breathHz ?? 0.55) * t), arch = P.arch;
  const spine = f => [H[0] + dT[0] * P.tl * f + nT[0] * arch * 4 * f * (1 - f), H[1] + dT[1] * P.tl * f + nT[1] * arch * 4 * f * (1 - f)];
  const spineN = f => { const tx = dT[0] * P.tl + nT[0] * arch * 4 * (1 - 2 * f), ty = dT[1] * P.tl + nT[1] * arch * 4 * (1 - 2 * f), l = Math.hypot(tx, ty) || 1; return [ty / l, -tx / l]; };
  K.spine = spine; K.spineN = spineN; K.nT = nT; K.dT = dT; K.br = br;
  const N0 = spine(1), nd = [Math.cos(P.na), Math.sin(P.na)], mA = (P.ta + P.na) / 2;
  K.N0 = N0; K.NM = [N0[0] + Math.cos(mA) * P.nl * 0.5, N0[1] + Math.sin(mA) * P.nl * 0.5]; K.HB = [N0[0] + nd[0] * P.nl, N0[1] + nd[1] * P.nl];
  // queue : chaîne de segments dont l'angle suit la courbure et une onde qui se propage de la base vers la pointe
  const NT = 16, seg = P.tlen / NT, tp = [H.slice()], tn = [];
  let p = H, a0 = 0;
  for (let j = 1; j <= NT; j++) {
    const f = (j - 0.5) / NT, a = P.tailA + P.tailC * Math.pow(f, 1.2) + P.tw * Math.sin(TAU * (P.tph - 0.9 * f)) * (0.2 + 0.8 * f) * (1 + 0.6 * f);
    p = [p[0] + Math.cos(a) * seg, p[1] + Math.sin(a) * seg]; tp.push(p); tn.push(a); a0 = a;
  }
  K.tail = tp; K.tailAng = tn;
  K.tailW = tp.map((_, j) => 0.85 + 7.0 * Math.pow(1 - j / NT, 1.75));
  // chaîne du corps, de la tête à la pointe de la queue
  K.chain = [K.HB, K.NM, N0, spine(0.78), spine(0.5), spine(0.22), H, ...tp.slice(1)];
  K.chainW = [5.0, 5.5, 7.6, 11.4 * br, 12.6 * br, 11.6 * br, 10.0, ...K.tailW.slice(1)];
  K.torso = [N0, spine(0.78), spine(0.5), spine(0.22), H]; K.torsoW = [7.6, 11.4 * br, 12.6 * br, 11.6 * br, 10.0];
  // pattes arrière : hanche un peu sous l'épine
  const hipJ = (() => { const s = spine(0.06); return [s[0] - nT[0] * 2.4, s[1] - nT[1] * 2.4]; })(), l1 = 17 * P.lk, l2 = 21 * P.lk, reach = 0.95 * (l1 + l2);
  const leg = (x, y, th, sp, kx, ky) => {
    let dx = x - hipJ[0], dy = y - hipJ[1]; const d = Math.hypot(dx, dy); if (d > reach) { dx *= reach / d; dy *= reach / d; }
    const ank = [hipJ[0] + dx, hipJ[1] + dy], knee = kx != null ? [kx, ky] : ba_ik(hipJ, ank, l1, l2, -1);
    return { hip: hipJ, knee, ank, th, sp, tip: [ank[0] + Math.cos(th) * 15, ank[1] + Math.sin(th) * 15 * 0.9] };
  };
  K.legN = leg(P.Lx, P.Ly, P.Lt, P.Ls, P.Kx, P.Ky); K.legF = leg(P.Fx, P.Fy, P.Ft, P.Fs, P.KFx, P.KFy);
  // bras : épaule sous l'épine, main = position relative à l'épaule
  const sh = (() => { const s = spine(0.86); return [s[0] - nT[0] * 2.6, s[1] - nT[1] * 2.6]; })();
  const arm = (rx, ry) => { let dx = rx, dy = ry; const d = Math.hypot(dx, dy), r = 15.2; if (d > r) { dx *= r / d; dy *= r / d; } const hand = [sh[0] + dx, sh[1] + dy], el = ba_ik(sh, hand, 7.4, 7.8, 1); return { sh, el, hand }; };
  K.armN = arm(P.Ax, P.Ay); K.armF = arm(P.Bx, P.By);
  return K;
}

// ───────────────────────── tête (repère de la tête : origine à la jonction avec le cou, x vers le museau, y vers le bas) ─────────────────────────
function ba_crClosed(pts, n = 3) {
  const out = [], m = pts.length;
  for (let i = 0; i < m; i++) {
    const p0 = pts[(i - 1 + m) % m], p1 = pts[i], p2 = pts[(i + 1) % m], p3 = pts[(i + 2) % m];
    for (let k = 0; k < n; k++) { const f = k / n, f2 = f * f, f3 = f2 * f; out.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * f + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * f2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * f3))); }
  }
  return out;
}
const BA_HUP = [[-4.4, -1.6], [-2, -3.5], [1, -4.2], [4.2, -4.4], [7.4, -4.1], [10.2, -3.2], [12.8, -2.3], [14.8, -1.5], [15.8, -0.3], [15.6, 1.0], [14.2, 1.4], [10, 1.9], [6, 2.2], [3, 2.5], [0, 2.3], [-4, 1.8]];
const BA_HJAW = [[3.5, 2.1], [9, 1.8], [14.2, 1.2], [15.3, 1.9], [14.2, 3.0], [11, 3.9], [7.5, 4.6], [4, 5.3], [0.8, 5.7], [-2.2, 5.1], [-3.4, 3.6], [0, 2.4]];
const BA_HCREST = [[9.6, -4.1], [9.0, -6.6], [7.0, -9.6], [4.0, -12.0], [0.6, -12.7], [-2.8, -11.2], [-5.8, -8.2], [-7.6, -4.6], [-7.0, -1.8], [-4.4, -1.6], [-2, -3.5], [1, -4.2], [4.2, -4.4], [7.4, -4.1]];
const BA_HEYE = [6.9, -1.4];

// ───────────────────────── pied (repère du pied : origine à la cheville, x le long du métatarse) ─────────────────────────
const BA_TOE = [[-0.64, 8.4], [-0.23, 10.8], [0.2, 11.4], [0.62, 8.2]];                // angle à ouverture 1 (rad), longueur (px)
function ba_foot(c, C, x, y, th, sp, o = {}) {
  const fs = o.fs ?? 1, heel = 5.0 * fs, tips = BA_TOE.map(([a, l]) => [heel + Math.cos(a * sp) * l * fs, Math.sin(a * sp) * l * fs * 0.92]);
  c.save(); c.translate(x, y); c.rotate(th);
  // frange d'écailles : voile clair entre les orteils (se referme avec l'ouverture)
  if (sp > 0.2) {
    const f = [[heel - 0.4, tips[0][1] * 0.45 - 1.0]];
    for (let i = 0; i < 4; i++) {
      const t0 = tips[i], t1 = tips[i + 1];
      f.push([t0[0] + 1.0 * fs, t0[1] + (i < 2 ? -0.8 : 0.8) * fs]);
      if (t1) { const mx = (t0[0] + t1[0]) / 2, my = (t0[1] + t1[1]) / 2; f.push([lerp(mx, heel, 0.2), lerp(my, 0, 0.2)]); }
    }
    f.push([heel - 0.4, tips[3][1] * 0.45 + 1.0]);
    const fp = ba_poly(ba_crClosed(f, 2));
    c.fillStyle = C.fringe; c.fill(fp);
    c.lineWidth = 0.55; c.strokeStyle = C.fringeRay; c.lineJoin = 'round'; c.stroke(fp);
  }
  // talon et métatarse
  const hp = ba_poly(ba_limbPts([[0, 0], [heel * 0.55, 0.15], [heel + 0.5, 0.1]], [3.6 * fs, 3.1 * fs, 2.4 * fs], 3));
  c.fillStyle = C.base; c.fill(hp); c.lineWidth = 0.6; c.strokeStyle = C.line; c.stroke(hp);
  // orteils
  for (let i = 0; i < 4; i++) {
    const tp = tips[i], mid = [lerp(heel, tp[0], 0.5), lerp(0, tp[1], 0.5) + (i - 1.5) * 0.05 * sp];
    const tpth = ba_poly(ba_limbPts([[heel, 0], mid, tp], [2.0 * fs, 1.4 * fs, 0.9 * fs], 3));
    c.fillStyle = sp > 0.2 ? C.shade : C.base; c.fill(tpth);
  }
  c.restore();
}
function ba_hand(c, C, x, y, th, o = {}) {
  c.save(); c.translate(x, y); c.rotate(th);
  for (const a of [-0.55, 0, 0.55]) { const tp = ba_poly(ba_limbPts([[0, 0], [2.0, a * 1.2], [3.8, a * 2.6]], [2.2, 1.5, 0.9], 2)); c.fillStyle = C.base; c.fill(tp); }
  c.restore();
}

// ───────────────────────── le basilic ─────────────────────────
// (cx, cy) = point du support (branche, surface de l'eau) sous l'origine du modèle ; s = échelle
function ba_lizard(cx, cy, s, t, o = {}) {
  const fl = o.flip ? -1 : 1, P = ba_getPose(o, t), K = ba_solve(P, t, o), rot = o.rot || 0, C = ba_pal(o.dim || 0), Cf = ba_pal(o.dim || 0, 1);
  const hx = P.hx, hy = P.hy, cr = Math.cos(rot), sr = Math.sin(rot);
  if (o.hip) { cx = o.hip[0] - fl * s * hx; cy = o.hip[1] - s * hy; }                      // o.hip : position ÉCRAN de la hanche (au lieu du point d'appui)
  const T = (x, y) => { const dx = x - hx, dy = y - hy; return [cx + fl * s * (hx + dx * cr - dy * sr), cy + s * (hy + dx * sr + dy * cr)]; };
  // lumière (vecteur vers la source, en écran) → repère du modèle
  const Ls = o.light || [0.5, -0.86], ln = Math.hypot(Ls[0], Ls[1]) || 1, lx0 = Ls[0] / ln * fl, ly0 = Ls[1] / ln;
  const LM_ = [lx0 * cr + ly0 * sr, -lx0 * sr + ly0 * cr];
  K.T = T;
  // zone de travail
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const grow = q => { const p = T(q[0], q[1]); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); };
  K.chain.forEach(grow); [K.legN, K.legF].forEach(l => { grow(l.knee); grow(l.ank); grow(l.tip); }); [K.armN, K.armF].forEach(a => grow(a.hand));
  grow([K.HB[0] + 20, K.HB[1] - 20]); grow([K.HB[0] + 20, K.HB[1] + 14]); grow([K.spine(0.5)[0], K.spine(0.5)[1] - 26]);
  const mg = 8 + 6 * s; ba_BB = [Math.max(0, Math.floor(x0 - mg)), Math.max(0, Math.floor(y0 - mg)), Math.min(LW, Math.ceil(x1 + mg)), Math.min(LH, Math.ceil(y1 + mg))];
  ba_layerBegin();
  const c = Y; c.setTransform(fl * s, 0, 0, s, cx, cy); c.translate(hx, hy); c.rotate(rot); c.translate(-hx, -hy);
  const m = u => Math.max(u, 1.15 / s);
  const dk = (path, col, off, al = 1) => ba_cres(c, path, col, LM_[0] * m(off), LM_[1] * m(off), al);          // ombre : du côté opposé à la lumière
  const lt = (path, col, off, al = 1) => ba_cres(c, path, col, -LM_[0] * m(off), -LM_[1] * m(off), al);        // lumière : du côté de la source
  const rimL = (path, w = 1.0) => { if ((o.rim ?? 1) > 0) ba_cres(c, path, C.rim, -LM_[0] * m(w), -LM_[1] * m(w), clamp(o.rim ?? 1), true); };
  const ink = (path, col, w = 0.7) => { c.lineWidth = m(w); c.strokeStyle = col; c.lineJoin = 'round'; c.stroke(path); };

  // 1. membres éloignés (plus sombres, derrière le corps)
  const drawLeg = (lg, CC, near) => {
    const kk = 0.6 + 0.4 * P.lk, mid1 = [lerp(lg.hip[0], lg.knee[0], 0.5), lerp(lg.hip[1], lg.knee[1], 0.5)], mid2 = [lerp(lg.knee[0], lg.ank[0], 0.5), lerp(lg.knee[1], lg.ank[1], 0.5)];
    const lp = ba_poly(ba_limbPts([lg.hip, mid1, lg.knee, mid2, lg.ank], [10.8 * kk, 9.4 * kk, 6.4 * kk, 4.6, 3.2], 4));
    c.fillStyle = CC.base; c.fill(lp);
    if (near) { ink(lp, CC.line, 0.55); dk(lp, CC.shade, 1.6); dk(lp, CC.dark, 0.8); lt(lp, CC.lit, 1.4); rimL(lp, 0.9); } else { dk(lp, CC.shade, 1.4); }
    const hb = ba_poly(ba_elp(lg.hip[0] + 0.5, lg.hip[1] + 0.4, 6.4 * kk, 5.8 * kk, P.ta, 16)); c.fillStyle = CC.base; c.fill(hb);
    if (near) { lt(hb, CC.lit, 1.4); dk(hb, CC.shade, 1.4); }
    ba_foot(c, CC, lg.ank[0], lg.ank[1], lg.th, lg.sp, { fs: 1 });
  };
  const drawArm = (ar, CC, near) => {
    const ap = ba_poly(ba_limbPts([ar.sh, ar.el, ar.hand], [5.0, 3.4, 2.6], 4));
    c.fillStyle = CC.base; c.fill(ap); if (near) { ink(ap, CC.line, 0.5); dk(ap, CC.shade, 1.0); lt(ap, CC.lit, 0.9); rimL(ap, 0.8); } else dk(ap, CC.shade, 1.0);
    const hth = Math.atan2(ar.hand[1] - ar.el[1], ar.hand[0] - ar.el[0]); ba_hand(c, CC, ar.hand[0], ar.hand[1], hth);
  };
  drawLeg(K.legF, Cf, false); drawArm(K.armF, Cf, false);

  // 2. voile dorsal (derrière le tronc) et crête de la queue
  const flowK = P.flow ?? 0.1, sailPts = [], rimPts = [], NS = 18;
  for (let i = 0; i <= NS; i++) {
    const f = 0.03 + 0.95 * i / NS, sp = K.spine(f), n = K.spineN(f), wv = tab(BA_WT, f) * K.br / 2, hh = tab(BA_SAILH, f) * P.sail * (0.9 + 0.1 * Math.cos(f * TAU * 8.5)) * (1 + 0.05 * Math.sin(TAU * (f * 3 - t * 1.4)));
    const base = [sp[0] + n[0] * wv * 0.55, sp[1] + n[1] * wv * 0.55];
    sailPts.push(base); rimPts.push([base[0] + n[0] * hh - K.dT[0] * flowK * hh * 1.1 * (1 - 0.4 * f) + K.dT[0] * 0.0, base[1] + n[1] * hh - K.dT[1] * flowK * hh * 1.1 + 0.0]);
  }
  K.sail = { base: sailPts, rim: rimPts };
  const sailPoly = ba_poly(ba_crClosed([...sailPts, ...rimPts.slice().reverse()], 2));
  c.fillStyle = C.mem; c.fill(sailPoly);
  lt(sailPoly, C.memHi, 2.6); dk(sailPoly, C.shade, 2.0);
  // nervures
  c.lineWidth = m(0.55); c.strokeStyle = C.memRib; c.lineCap = 'round';
  for (let i = 1; i < NS; i += 2) { c.beginPath(); c.moveTo(sailPts[i][0], sailPts[i][1]); c.lineTo(rimPts[i][0], rimPts[i][1]); c.stroke(); }
  rimL(sailPoly, 0.9);
  // crête de la queue (deux bosses plus petites)
  const tc = [], tcr = [];
  for (let j = 0; j <= 7; j++) {
    const sp = K.tail[j], a = K.tailAng[Math.min(j, K.tailAng.length - 1)], n = [Math.sin(a + Math.PI) * -1, Math.cos(a + Math.PI)], hh = 6.2 * Math.pow(1 - j / 7.5, 1.1) * P.sail * (1 + 0.15 * Math.sin(j * 2.2)), w2 = K.tailW[j] / 2;
    // normale du dos pour une queue orientée vers l'arrière : vers le haut (y négatif)
    const nx = Math.sin(a), ny = -Math.cos(a), sg = ny < 0 ? 1 : -1, nn = [nx * sg, ny * sg];
    tc.push([sp[0] + nn[0] * w2 * 0.5, sp[1] + nn[1] * w2 * 0.5]); tcr.push([sp[0] + nn[0] * (w2 * 0.5 + hh), sp[1] + nn[1] * (w2 * 0.5 + hh)]);
  }
  const tcp = ba_poly(ba_crClosed([...tc, ...tcr.slice().reverse()], 2)); c.fillStyle = C.mem; c.fill(tcp); lt(tcp, C.memHi, 2.0); rimL(tcp, 0.8);
  c.lineWidth = m(0.5); c.strokeStyle = C.memRib; for (let j = 1; j < 7; j += 2) { c.beginPath(); c.moveTo(tc[j][0], tc[j][1]); c.lineTo(tcr[j][0], tcr[j][1]); c.stroke(); }

  // 3. corps : cou, tronc, queue en une seule chaîne
  const body = ba_union(ba_limbPts(K.chain, K.chainW, 4), ba_elp(K.spine(0.5)[0], K.spine(0.5)[1], 19, 6.2 * K.br, P.ta, 22));
  const torso = ba_union(ba_limbPts(K.torso, K.torsoW, 4));
  c.fillStyle = C.base; c.fill(body);
  lt(body, C.lit, 3.0); lt(body, C.hi, 1.5);
  // ventre pâle : bande du côté opposé au dos
  ba_cres(c, torso, C.belly, K.nT[0] * 4.6, K.nT[1] * 4.6, 1);
  dk(body, C.shade, 2.5); dk(body, C.dark, 1.2);
  // bandes de la queue
  c.lineWidth = m(1.1); c.strokeStyle = C.shade; c.lineCap = 'butt';
  for (let j = 4; j < K.tail.length - 1; j += 2) {
    const a = K.tailAng[j - 1] ?? K.tailAng[0], w2 = K.tailW[j] / 2; c.beginPath(); c.moveTo(K.tail[j][0] - Math.sin(a) * w2, K.tail[j][1] + Math.cos(a) * w2); c.lineTo(K.tail[j][0] + Math.sin(a) * w2, K.tail[j][1] - Math.cos(a) * w2); c.stroke();
  }
  // raie claire sur le flanc (de l'épaule à la hanche) et mouchetures turquoise du dos
  const flank = []; for (let i = 0; i <= 6; i++) { const f = 0.12 + 0.8 * i / 6, sp = K.spine(f), n = K.spineN(f); flank.push([sp[0] - n[0] * 0.8, sp[1] - n[1] * 0.8]); }
  c.lineWidth = m(0.8); c.strokeStyle = C.stripe; c.lineCap = 'round'; c.beginPath(); flank.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke();
  c.fillStyle = C.spot2; for (let i = 0; i < 7; i++) { const f = 0.1 + 0.8 * i / 6, sp = K.spine(f), n = K.spineN(f), w2 = tab(BA_WT, f) / 2; c.beginPath(); c.arc(sp[0] + n[0] * w2 * 0.55, sp[1] + n[1] * w2 * 0.55, m(0.55), 0, TAU); c.fill(); }
  rimL(body, 1.0);

  // 4. membre proche
  drawLeg(K.legN, C, true); drawArm(K.armN, C, true);

  // 5. tête et plumet
  c.save(); c.translate(K.HB[0], K.HB[1]); c.rotate(P.ha);
  const cs = P.crest, crestPts = BA_HCREST.map(([x, y], i) => i < 8 ? [x, y < -4.2 ? -4.2 + (y + 4.2) * cs : y] : [x, y]);
  const cp = ba_poly(ba_crClosed(crestPts, 3)); c.fillStyle = C.mem; c.fill(cp);
  lt(cp, C.memHi, 2.8); dk(cp, C.shade, 2.2);
  c.lineWidth = m(0.55); c.strokeStyle = C.memRib; c.lineCap = 'round';
  for (const [bx, by, ex, ey] of [[6.8, -4.2, 6.6 + 0.2, -4.2 - 7.8 * cs], [3.6, -4.4, 3.0, -4.4 - 8.6 * cs], [0.2, -4.2, -1.2, -4.2 - 8.4 * cs], [-3, -3.5, -5.3, -4.2 - 5.4 * cs]]) { c.beginPath(); c.moveTo(bx, by); c.lineTo(ex, ey); c.stroke(); }
  c.fillStyle = C.spot; for (const [qx, qy] of [[5.2, -7.4], [1.8, -9.2], [-1.8, -8.4], [-4.4, -5.6]]) { c.beginPath(); c.arc(qx, 4.2 * 0 + (qy + 4.2) * cs - 4.2, m(0.5), 0, TAU); c.fill(); }
  rimL(cp, 0.9);
  // mâchoire inférieure (pivote autour de la charnière)
  const mo = P.mouth, hinge = [3.5, 3.0], cj = Math.cos(mo * 0.6), sj = Math.sin(mo * 0.6);
  const jawPts = BA_HJAW.map(([x, y]) => { const dx = x - hinge[0], dy = y - hinge[1]; return [hinge[0] + dx * cj - dy * sj, hinge[1] + dx * sj + dy * cj]; });
  if (mo > 0.04) {                                                                                                            // intérieur de la gueule
    const lipTip = [15.4, 1.3], jt = jawPts[2];
    const inside = ba_poly([[3.4, 2.2], lipTip, [jt[0], jt[1]], [jawPts[1][0], jawPts[1][1]]]); c.fillStyle = RD[1]; c.fill(inside);
    c.lineWidth = m(1.2); c.strokeStyle = RD[4]; c.lineCap = 'round'; c.beginPath(); c.moveTo(5, 3.2 + mo * 2); c.lineTo(11 + (o.tongue ?? 0) * 9, 3.0 + mo * 4.2); c.stroke();
  }
  const jp = ba_poly(ba_crClosed(jawPts, 3)); c.fillStyle = C.belly; c.fill(jp); ink(jp, C.line, 0.5); dk(jp, C.shade, 1.4);
  const up = ba_poly(ba_crClosed(BA_HUP, 3)); c.fillStyle = C.base; c.fill(up); lt(up, C.lit, 1.5); lt(up, C.hi, 0.9); dk(up, C.shade, 1.3);
  ink(up, C.line, 0.5);
  // bouche, bande claire de la lèvre, tympan
  c.lineWidth = m(0.6); c.strokeStyle = C.mouth; c.lineCap = 'round'; c.beginPath(); c.moveTo(15.2, 1.45); c.quadraticCurveTo(9, 2.35, 2.2, 2.5); c.stroke();
  c.lineWidth = m(0.8); c.strokeStyle = C.stripe; c.beginPath(); c.moveTo(14.6, 0.9); c.quadraticCurveTo(9, 1.75, 3.5, 1.9); c.stroke();
  c.fillStyle = C.dark; c.beginPath(); c.ellipse(0.4, 0.3, m(0.9), m(1.1), 0, 0, TAU); c.fill();
  rimL(up, 0.9);
  c.restore();

  // contour, immersion
  ba_layerEnd({ outline: o.outline || '#05040f', tint: o.tint });
  if (o.reflect) ba_reflect(o.reflect.y, o.reflect.a ?? 0.3, t, o.reflect);

  // détails nets sur L : œil doré, narine
  const eye = (() => { const a = P.ha, ex = BA_HEYE[0], ey = BA_HEYE[1]; return T(K.HB[0] + ex * Math.cos(a) - ey * Math.sin(a), K.HB[1] + ex * Math.sin(a) + ey * Math.cos(a)); })();
  K.eye = eye; K.head = T(K.HB[0], K.HB[1]);
  K.nose = (() => { const a = P.ha; return T(K.HB[0] + 15.8 * Math.cos(a) + 0.3 * Math.sin(a), K.HB[1] + 15.8 * Math.sin(a) - 0.3 * Math.cos(a)); })();
  K.feetN = T(K.legN.ank[0], K.legN.ank[1]); K.feetF = T(K.legF.ank[0], K.legF.ank[1]); K.tipN = T(K.legN.tip[0], K.legN.tip[1]); K.tipF = T(K.legF.tip[0], K.legF.tip[1]);
  K.tailTip = T(K.tail[K.tail.length - 1][0], K.tail[K.tail.length - 1][1]);
  if (!o.noEye) ba_eye(eye[0], eye[1], Math.max(1.5, 1.9 * s), o.eye ?? ba_blink(t, o.seed ?? 0), fl, C);
  return K;
}
// œil : disque doré à cerne sombre, pupille ronde ; open 0..1 (paupière verte)
function ba_eye(x, y, r, open, fl, C) {
  const X = Math.round(x), Yy = Math.round(y), ri = Math.max(1, Math.round(r));
  disc(X, Yy, ri + 1, '#05040f');
  if (open < 0.25) { R(X - ri, Yy, ri * 2 + 1, 1, C.dark); R(X - ri, Yy - 1, ri * 2 + 1, 1, C.base); return; }
  disc(X, Yy, ri, AM[8]);
  if (ri >= 2) { R(X - ri + 1, Yy + 1, ri * 2 - 1, 1, AM[6]); px(X + fl * (ri - 1), Yy, AM[6]); }                       // ombre du bas de l'iris
  if (ri >= 3) R(X + (fl > 0 ? 0 : -1) + fl, Yy - 1, 2, 2, '#05040f'); else px(X + fl, Yy, '#05040f');
  px(X - fl * Math.max(0, ri - 2), Yy - Math.max(1, ri - 1), AM[10]);                                                 // reflet
  if (open < 0.7) R(X - ri, Yy - ri, ri * 2 + 1, Math.max(1, Math.round(ri * (1 - open))), C.base);
}
// clignement : une paupière de 0,12 s toutes les 3 à 5 s
function ba_blink(t, seed = 0) { const P = 3.6 + (seed % 3) * 0.7, u = ba_frac((t + seed * 1.37) / P) * P; return u < 0.05 ? 1 - u / 0.05 * 0.9 : u < 0.12 ? 0.1 + (u - 0.05) / 0.07 * 0.9 : 1; }
// reflet dans l'eau du dernier calque dessiné (le basilic) : lignes miroir ondulées, atténuées
function ba_reflect(wy, a, t, o = {}) {
  const B = ba_BB, kq = o.k ?? 0.8, n = Math.min(Math.ceil(o.depth ?? 80), LH - Math.ceil(wy)); L.save(); L.setTransform(1, 0, 0, 1, 0, 0);
  for (let dy = 1; dy < n; dy++) {
    const sy = Math.round(wy - dy * kq); if (sy < B[1] || sy >= B[3]) continue;
    const dx = Math.round(1.2 * Math.sin(dy * 0.7 + t * 3.1) + 0.8 * Math.sin(dy * 1.9 - t * 2.3)), fade = a * (1 - dy / n);
    L.globalAlpha = fade; L.drawImage(lay, B[0], sy, B[2] - B[0], 1, B[0] + dx, Math.round(wy) + dy, B[2] - B[0], 1);
  }
  L.restore();
}

// ───────────────────────── l'eau qui claque : anneaux, gerbe, gouttes, trou d'air ─────────────────────────
// (wx, wy) = point d'impact sur la surface (wx : abscisse du MONDE, l'écran affiche wx − cam) ; t0 = instant du claquement ; t ≥ t0.
// o : size (1), dir (+1 si le basilic va vers la droite : la gerbe part vers l'arrière), cam, seed, layer 'under' (anneaux, trou d'air, bulles : avant le basilic) | 'over' (gerbe et gouttes : après) | 'both'
function ba_slap(wx, wy, t0, t, o = {}) {
  const a = t - t0; if (a < 0 || a > 1.7) return;
  const sz = o.size ?? 1, X = Math.round(wx - (o.cam || 0)), Yw = Math.round(wy), dir = o.dir ?? 1, sd = (o.seed ?? 1) * 17, layer = o.layer || 'both', sq = o.sq ?? 0.3;
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0);
  if (layer !== 'over') {
    for (let k = 0; k < 3; k++) {                                                          // anneaux concentriques qui s'élargissent et s'effacent
      const d = 0.07 * k; if (a < d) continue;
      const q = a - d, r = (1 - Math.exp(-q * 3.2)) * (31 - 6 * k) * sz, life = 1 - q / 1.35; if (life <= 0 || r < 1) continue;
      const n = Math.max(14, Math.round(r * 2.4));
      for (let j = 0; j < n; j++) {
        const ang = j / n * TAU; if (k_bay(j * 3 + k, k + sd) > life * 1.5) continue;
        const front = Math.sin(ang) > 0;
        L.fillStyle = life > 0.6 ? (front ? WH[3] : CY[4]) : life > 0.3 ? (front ? CY[4] : CY[3]) : CY[2];
        L.fillRect(Math.round(X + Math.cos(ang) * r), Math.round(Yw + Math.sin(ang) * r * sq), 1, 1);
      }
    }
    if (a < 0.55) {                                                                         // trou d'air : ellipse sombre à bord clair qui se referme
      const q = a / 0.55, rx = Math.max(0.5, 6 * sz * (1 - q * q)), ry = Math.max(0.5, rx * 0.34);
      L.fillStyle = NI[1]; L.beginPath(); L.ellipse(X, Yw, rx + 0.6, ry + 0.6, 0, 0, TAU); L.fill();
      L.fillStyle = GR[0]; L.beginPath(); L.ellipse(X, Yw, rx, ry, 0, 0, TAU); L.fill();
      if (rx > 2) { L.fillStyle = CY[3]; L.fillRect(Math.round(X - rx * 0.6), Math.round(Yw + ry), Math.round(rx * 1.2), 1); }
    }
    for (let i = 0; i < 4; i++) {                                                          // bulles qui crèvent à la surface, après le retrait du pied
      const d = 0.28 + 0.12 * i + 0.05 * ba_h(i, sd), q = a - d; if (q < 0 || q > 0.4) continue;
      const bx = X + Math.round((ba_h(i, sd + 3) - 0.5) * 16 * sz), by = Yw + Math.round((ba_h(i, sd + 4) - 0.3) * 3 * sz);
      L.fillStyle = q < 0.28 ? CY[4] : CY[3]; L.fillRect(bx, by, 2, 1); if (q < 0.28) { L.fillStyle = WH[3]; L.fillRect(bx, by - 1, 1, 1); }
    }
  }
  if (layer !== 'under') {
    if (a < 0.4) {                                                                          // gerbe : lames d'eau en couronne basse, vers l'arrière
      const q = a / 0.4, hh = Math.sin(Math.PI * Math.min(1, q * 1.15)) * (1 - q * 0.3);
      for (let j = 0; j < 9; j++) {
        const h = (9 - Math.abs(j - 3.5) * 1.8) * sz * hh * (0.75 + 0.5 * ba_h(j, sd + 7)); if (h < 1) continue;
        const bx = X - dir * Math.round((1 + j * 1.5) * sz) + Math.round(dir * q * 3 * sz * -1), top = Yw - Math.round(h);
        L.fillStyle = WH[3]; L.fillRect(bx, top, 1, 1); L.fillStyle = CY[4]; L.fillRect(bx, top + 1, 1, Math.max(0, Math.round(h * 0.5))); L.fillStyle = CY[3]; L.fillRect(bx, top + 1 + Math.round(h * 0.5), 1, Math.max(0, Yw - top - 1 - Math.round(h * 0.5)));
      }
    }
    const nD = Math.round(11 * Math.min(1.5, sz + 0.2));
    for (let i = 0; i < nD; i++) {                                                          // gouttes balistiques
      const h1 = ba_h(i, sd + 11), h2 = ba_h(i, sd + 12), h3 = ba_h(i, sd + 13);
      const vx = -dir * (6 + 42 * h1) * sz + (h2 - 0.5) * 18 * sz, vy = -(30 + 52 * h3) * sz, g = 330 * sz;
      const xx = X + vx * a, yy = Yw + vy * a + 0.5 * g * a * a; if (yy > Yw + 1) continue;
      const big = a < 0.3 && sz >= 0.8 && h2 > 0.35 ? 2 : 1;
      L.fillStyle = a < 0.4 ? WH[3] : CY[4]; L.fillRect(Math.round(xx), Math.round(yy), big, big); if (big === 2) { L.fillStyle = CY[3]; L.fillRect(Math.round(xx) + 1, Math.round(yy) + 1, 1, 1); }
    }
  }
  L.restore();
}
// la traînée de pas d'un basilic qui court : un claquement par pas, aux instants et aux endroits où le pied touche l'eau.
// o : t0 (instant où la phase vaut ph0), ph0, f (cycles/s), x0 (abscisse monde de la hanche à t0), v (px/s, monde), dir, s, wy (surface), cam, layer, size, ahead (px devant la hanche où le pied touche, à s = 1)
function ba_runFx(t, o) {
  const f = o.f ?? 3.3, ph0 = o.ph0 ?? 0, s = o.s ?? 1, dir = o.dir ?? 1, ph = ph0 + f * (t - o.t0), nMax = Math.floor((ph - 0.05) / 0.5), nMin = nMax - Math.ceil(1.7 * f * 2) - 1;
  for (let n = nMin; n <= nMax; n++) {
    const phn = 0.05 + n * 0.5, tn = o.t0 + (phn - ph0) / f; if (tn < (o.tFrom ?? -1e9) || tn > t) continue;
    const near = ((n % 2) + 2) % 2 === 0, hip = o.x0 + dir * o.v * (tn - o.t0), wx = hip + dir * s * (o.ahead ?? 22);
    ba_slap(wx, o.wy + (near ? 2 : -2), tn, t, { size: o.size ?? s * 0.85, dir, cam: o.cam, seed: n + 40, layer: o.layer });
  }
}

// ───────────────────────── gros plan en coupe : le pied qui claque l'eau et la poche d'air ─────────────────────────
// Repère « eau » : la surface est fixe, le pied entre, pousse (il glisse à peine : il appuie sur l'eau), sort avant que la poche ne se referme ; la hanche avance de BA_HIPV px (s = 1) par cycle.
const BA_HIPV = 46;
function ba_footWater(phi) {
  const a = ba_runLeg(phi), px_ = a.x + BA_HIPV * phi, tipX = px_ + Math.cos(a.th) * 15, tipY = a.y + Math.sin(a.th) * 15 * 0.9;
  return { ax: px_, ay: a.y, th: a.th, sp: a.sp, tipX, tipY, phi };
}
// poche d'air et eau autour du pied ; (X0, wy) = abscisse du pied à φ = 0,05 et surface (écran) ; sm = échelle ; p 0..1 = progression du pas (0 : le pied arrive, 0,5 : il se retire, 1 : les rides)
// o.under : dessine l'eau en coupe (sinon seulement la poche), o.xPan : décalage horizontal de la caméra (px écran)
function ba_pocketGeom(sm, p) {
  const phi = lerp(0.0, 0.64, p), steps = 28; let D = 0, cxs = 0, n = 0;
  for (let i = 0; i <= steps; i++) { const f = ba_footWater(phi * i / steps); D = Math.max(D, f.tipY, f.ay + 4); if (i > 3) { cxs += f.ax + 5; n++; } }
  const f0 = ba_footWater(0.05);
  return { phi, D: Math.max(0, D) * sm + 10, cx: f0.ax * sm + 4, ok: phi > 0.045 };
}
function ba_pocket(X0, wy, sm, p, t, o = {}) {
  const G = ba_pocketGeom(sm, p), phi = G.phi; if (!G.ok) return;
  const open = clamp(prog(phi, 0.05, 0.2)), pinch = clamp(prog(phi, 0.5, 0.64)), Wm = 11.5 * sm * (0.55 + 0.45 * open) * (1 + 0.1 * Math.sin(p * 9));
  const pts = [], N = 26, D = G.D * (0.35 + 0.65 * open), cx0 = X0 + (G.cx - 17.3 * sm - 4) * 0 - 4;
  const pd = D * 0.85 * pinch;                                                              // profondeur sous laquelle la poche est encore ouverte (le haut se referme)
  const L_ = [], R_ = [];
  for (let i = 0; i <= N; i++) {
    const d = i / N * D, wv = Wm * Math.sqrt(Math.max(0, 1 - Math.pow(d / D, 1.7))), neck = d < pd ? clamp(1 - (pd - d) / (0.25 * D + 1)) * 0 : 1;
    const closed = d < pd ? 0 : clamp((d - pd) / (0.3 * D + 4)), w2 = wv * (d < pd ? 0 : (0.25 + 0.75 * closed)), ctr = cx0 - 0.14 * d + (d < pd ? 0 : 0);
    L_.push([ctr - w2, wy + d]); R_.push([ctr + w2, wy + d]);
  }
  if (pinch >= 0.99) return;
  const path = new Path2D(); path.moveTo(L_[0][0], L_[0][1]); L_.forEach(q => path.lineTo(q[0], q[1])); R_.slice().reverse().forEach(q => path.lineTo(q[0], q[1])); path.closePath();
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0);
  // bord sombre, intérieur d'air (clair, dégradé), ménisque blanc
  L.lineJoin = 'round'; L.lineWidth = 4; L.strokeStyle = CY[0]; L.stroke(path);
  const gr = L.createLinearGradient(0, wy, 0, wy + D); gr.addColorStop(0, '#d8f4fc'); gr.addColorStop(0.5, '#b0f0f8'); gr.addColorStop(1, '#70d0e4'); L.fillStyle = gr; L.fill(path);
  L.save(); L.clip(path);
  L.fillStyle = 'rgba(31,122,150,0.35)'; L.fillRect(X0 - 80, wy + D * 0.55, 160, D);                       // le fond de la poche : air vu à travers l'eau, plus froid
  L.restore();
  L.lineWidth = 1; L.strokeStyle = WH[3]; L.beginPath(); for (let i = 1; i < N - 1; i++) { const q = L_[i]; i > 1 ? L.lineTo(q[0] + 2, q[1]) : L.moveTo(q[0] + 2, q[1]); } L.stroke();
  L.strokeStyle = CY[4]; L.beginPath(); for (let i = 1; i < N - 1; i++) { const q = R_[i]; i > 1 ? L.lineTo(q[0] - 2, q[1]) : L.moveTo(q[0] - 2, q[1]); } L.stroke();
  L.restore();
}
