'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_grenouille_sprites.js — la GRENOUILLE DES BOIS (Lithobates sylvaticus) et ses vues internes (préfixe gr_ ; aucun nom global sans gr_)
   Tout se dessine sur L (270 × 480) AVANT le tramage, dans draw(u, t, S) (jamais dans ui()), sauf ICONES[0] (couleurs exactes, dans ui()).
   Fonctions pures du temps : aucun Math.random, aucun Date ; hasard = graine (o.seed), tout est déterministe.

   gr_frog(cx, cy, s, t, o)   (cx, cy) = point de contact avec le sol sous le milieu du ventre ; s = échelle (1 : ≈ 40 px de long, assise ; 5 : gros plan ≈ 200 px) ; t = temps du film.
        o.pose    'sit' (assise) | 'alert' (tête haute, bras tendus) | 'crouch' (accroupie, avant le saut) | 'leap' (saut complet, ph 0..1) | 'land' (réception, ph 0..1)
                  | 'frozen' (gelée : raide, pâle, œil terne) | 'thaw' (dégel, ph 0..1 : de gelée à assise, l'œil s'ouvre)
        o.flip    true : regarde à gauche (la lumière o.light reste celle de l'écran)
        o.ph      phase 0..1. 'leap' : 0 assise → 0.14 accroupie profonde (anticipation) → 0.26 impulsion (les pattes arrière se détendent, décollage) → 0.26–0.78 vol (arc de gr_leapLift)
                  → 0.78 les mains touchent → 0.86 écrasement → 1 assise ; 'land' : 0 contact → 1 reposée ; 'thaw' : 0 gelée → 1 assise. La position horizontale du saut n'est PAS ajoutée : cx + gr_hopX(ph, distance) (la hauteur, oui)
        o.breath  pulsation de la gorge 0..1 (défaut : respiration automatique gr_breath(t) ; 0 = gorge au repos ; gelée : 0)
        o.eye     œil ouvert 0..1 (défaut : 1 ; gelée 0.15 ; dégel : s'ouvre avec ph)
        o.blink   0..1 clignement (défaut : un clignement toutes les 2,5 à 4 s, déterministe ; 0 = aucun)
        o.ice     0..1 givre puis glace : 0 rien · 0.25 voile de givre blanc, aiguilles · 0.5 croûte pâle bleutée · 1 grenouille enrobée de glace (coque 2–5 px, éclats, fissures, cristaux, scintillements).
                  Le gel gagne PATTES D'ABORD, la tête en dernier ; en dégel (o.iceFrom 'head') la tête se libère la première. o.iceFrom : 'legs' (défaut) | 'head'
        o.pale    0..1 pâleur de la peau (défaut : 1 gelée, 1 − ph dégel, 0 sinon) ; o.dull 0..1 œil terne (défaut : suit pale et ice)
        o.rim     couleur du liseré de contre-jour (défaut '#fff8e8') ; o.light côté du soleil à l'écran : +1 droite (défaut), −1 gauche ; o.rimW épaisseur (px)
        o.shadow  opacité de l'ombre au sol 0..1 (défaut 0.34 ; 0 : aucune) ; o.shCol 'r,g,b' (défaut '5,4,15')
        o.sil     '#rrggbb' : silhouette pleine d'une seule couleur (contrôle de lecture) ; o.outline couleur du contour (défaut '#05040f')
        o.seed    entier : taches du dos, fissures (un individu) ; o.hop hauteur du saut en unités (défaut 15) ; o.sway balancement d'immobilité vivante (défaut 1)
        renvoie { eye: [x, y], mouth: [x, y], head: [x, y], hip: [x, y], throat: [x, y], mask: (px, py) → bool (silhouette écran), lift, bbox }
   gr_leapLift(ph, h) hauteur du corps au-dessus du sol (px d'unité) ; gr_hopX(ph, dist) déplacement horizontal du saut (unités) ; gr_breath(t, rate) pulsation de la gorge 0..1
   gr_blink(t, seed) clignement automatique 0..1
   Vues internes : gr_heart(cx, cy, s, t, o) · gr_ecg(x, y, w, h, t, o) · gr_cells(x, y, w, h, t, o) · gr_glucose(x, y, s, t, o) · gr_icecrystal(x, y, s, o) · gr_lungs(cx, cy, s, t, o)
   ICONES[0] : icône de case du carnet (17 × 17).
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ════════════════════════════════════════════════════════════════════════════════════════
// 0. OUTILS
// ════════════════════════════════════════════════════════════════════════════════════════
const gr_rgbM = {};
function gr_rgb(c) { if (Array.isArray(c)) return c; return gr_rgbM[c] || (gr_rgbM[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]); }
function gr_h(i, s = 0) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function gr_h2(x, y, s = 0) { return gr_h(Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663), s); }
const gr_bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
const gr_ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const gr_fin = (v, d = 0) => Number.isFinite(v) ? v : d;

// spline de Catmull-Rom → Path2D (fermée ou non)
function gr_spline(pts, closed = true, path = new Path2D()) {
  const n = pts.length, g = i => pts[((i % n) + n) % n];
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = closed ? g(i - 1) : pts[Math.max(0, i - 1)], p1 = pts[i], p2 = closed ? g(i + 1) : pts[i + 1], p3 = closed ? g(i + 2) : pts[Math.min(n - 1, i + 2)];
    path.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) path.closePath();
  return path;
}
// chaîne d'articulations → contour lisse à largeur variable, bouts arrondis
function gr_chain(pts, ws, path = new Path2D()) {
  const dense = [], dw = [], n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < 6; k++) {
      const u = k / 6, u2 = u * u, u3 = u2 * u;
      dense.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]);
      dw.push(ws[i] + (ws[i + 1] - ws[i]) * u);
    }
  }
  dense.push(pts[n - 1]); dw.push(ws[n - 1]);
  polyPath(limb(dense, dw), path);
  path.moveTo(pts[0][0] + ws[0] / 2, pts[0][1]); path.arc(pts[0][0], pts[0][1], ws[0] / 2, 0, TAU);
  path.moveTo(pts[n - 1][0] + ws[n - 1] / 2, pts[n - 1][1]); path.arc(pts[n - 1][0], pts[n - 1][1], ws[n - 1] / 2, 0, TAU);
  return path;
}
const gr_ell = (cx, cy, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); return p; };
const gr_poly = (pts) => polyPath(pts);

// croissant de lumière : la partie de `path` située à moins de w du bord tourné vers la lumière ll (inv : du côté de l'ombre). Les tons se superposent du plus large au plus étroit.
function gr_cres(c, path, ll, w, col, inv = false) {
  c.save(); c.clip(path);
  const p = new Path2D(); p.rect(-600, -600, 1200, 1200);
  const k = inv ? 1 : -1;
  p.addPath(path, new DOMMatrix([1, 0, 0, 1, k * ll[0] * w, k * ll[1] * w]));
  c.fillStyle = col; c.fill(p, 'evenodd'); c.restore();
}
const gr_fill = (c, path, col) => { c.fillStyle = col; c.fill(path); };
// IK à deux segments : renvoie le genou (ou le coude) ; b = côté du pli (±1) ; l'extrémité est ramenée à L1 + L2 au plus
function gr_ik(hx, hy, ax, ay, L1, L2, b) {
  let dx = ax - hx, dy = ay - hy, d = Math.hypot(dx, dy) || 0.001; const mx = L1 + L2 - 0.01, mn = Math.abs(L1 - L2) + 0.05;
  const dd = clamp(d, mn, mx), a = Math.atan2(dy, dx), ca = clamp((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd), -1, 1), A = Math.acos(ca);
  const kx = hx + L1 * Math.cos(a + b * A), ky = hy + L1 * Math.sin(a + b * A);
  return { k: [kx, ky], a: [hx + dx / d * dd, hy + dy / d * dd] };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 1. TONS : la grenouille est dessinée en couleurs de rampes puis ramenée à 14 tons (+ variantes pâle et glace) par pixel
// ════════════════════════════════════════════════════════════════════════════════════════
// indices : 0 brun très sombre · 1 ombre · 2 ombre douce · 3 corps · 4 corps clair · 5 clair · 6 éclairé · 7 éclat humide · 8 roux · 9 masque · 10 ventre ombre · 11 ventre · 12 ventre clair · 13 ventre éclat
const gr_N = [WO[1], WO[2], WO[3], WO[4], WO[5], WO[6], SK[3], SK[4], OC[2], WO[0], ST[6], WH[0], WH[1], WH[2]];
const gr_PALE = [WO[3], WO[4], WO[5], SK[2], SK[3], SK[4], WH[1], WH[3], SK[2], WO[2], WH[0], WH[1], WH[2], WH[3]];
const gr_ICY = [ST[3], ST[4], ST[5], ST[6], NE[1], NE[2], NE[3], NE[4], ST[5], ST[3], NE[1], NE[2], NE[3], NE[4]];
const gr_NI = gr_N.map(gr_rgb);
const gr_LUT = new Uint8Array(32768);
(function () {
  for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
    const R_ = r * 8.23, G_ = g * 8.23, B_ = b * 8.23; let best = 0, bd = 1e9;
    for (let i = 0; i < gr_NI.length; i++) { const p = gr_NI[i], rm = (R_ + p[0]) / 2, dr = R_ - p[0], dg = G_ - p[1], db = B_ - p[2], d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; if (d < bd) { bd = d; best = i; } }
    gr_LUT[(r << 10) | (g << 5) | b] = best;
  }
})();

// ════════════════════════════════════════════════════════════════════════════════════════
// 2. POSES : images-clés (torse, pattes) puis interpolation ; les pattes sont recalculées par IK (longueurs constantes, contact au sol exact)
// ════════════════════════════════════════════════════════════════════════════════════════
// repère : x vers l'avant (la tête), y vers le bas, unités = pixels à s = 1 ; sol : y = 0 ; assise : torse de x = −16 à +21
const gr_TH = 12.5, gr_SH = 14.5, gr_TAR = 7.5, gr_TOE = 10.5;          // cuisse, jambe, tarse, orteils
const gr_UA = 5.6, gr_FA = 6.6, gr_HAND = 3.8;                          // bras, avant-bras, doigts
const gr_HIPL = [-10.5, -8.6], gr_SHOL = [4.6, -6.0];                    // attaches (repère du torse assis)
const gr_PIV = [-4, -7], gr_NECK = [5.5, -9.5];                          // pivot de la rotation du torse, de la tête
// torse : [type (b corps, h tête), x, y] dans l'ordre du contour
const gr_TORSO = [
  ['b', -13.4, -2.4], ['b', -16.4, -7.8], ['b', -14.4, -14.2], ['b', -8.8, -17.6], ['b', -1.8, -17.2], ['b', 4.2, -15.2],
  ['h', 10.0, -14.3], ['h', 15.2, -12.2], ['h', 19.4, -10.0], ['h', 21.6, -8.0], ['h', 20.6, -5.9], ['h', 16.2, -3.9], ['h', 10.5, -2.6], ['h', 6.2, -1.9],
  ['b', 2.4, -0.9], ['b', -3, -0.3], ['b', -9.5, -0.5],
];
const gr_KEYS = {
  // hind : { ax, ay } cheville absolue  ou { hl, ha } (fraction d'extension, angle hanche → cheville) ; ta tarse, fa orteils (angles absolus, 0 = vers l'avant, + = vers le bas)
  sit: { tx: 0, ty: 0, rot: 0, len: 1, hgt: 1, arch: 0.5, hp: 0, hind: { ax: -12.8, ay: -2.9, ta: 0.10, fa: 0.07 }, fore: { wx: 9.0, wy: -0.9, ha: 0.12 } },
  alert: { tx: -0.5, ty: -1.8, rot: 0.34, len: 1.0, hgt: 1.03, arch: 0.15, hp: 0.12, hind: { ax: -12.6, ay: -2.8, ta: 0.08, fa: 0.07 }, fore: { wx: 10.2, wy: -0.3, ha: 0.12 } },
  crouch: { tx: 1.2, ty: 1.3, rot: -0.08, len: 1.07, hgt: 0.9, arch: 0.7, hp: -0.14, hind: { ax: -14.2, ay: -1.5, ta: 0.05, fa: 0.04 }, fore: { wx: 10.6, wy: -0.4, ha: 0.1 } },
  frozen: { tx: 0.6, ty: 0.7, rot: -0.03, len: 1.03, hgt: 0.94, arch: 0.8, hp: -0.1, hind: { ax: -13.4, ay: -1.9, ta: 0.06, fa: 0.05 }, fore: { wx: 9.6, wy: -0.5, ha: 0.1 } },
  ext: { tx: 2, ty: 0, rot: 0.6, len: 1.15, hgt: 0.88, arch: 0.05, hp: 0.06, pin: 'foot', hind: { hl: 0.985, ha: 2.36, ta: 2.42, fa: 2.5 }, fore: { fl: 0.55, fha: 2.1, ha: 1.9 } },
  fly1: { tx: 3, ty: -4, rot: 0.34, len: 1.17, hgt: 0.86, arch: 0.05, hp: 0.04, hind: { hl: 1.0, ha: 2.7, ta: 2.74, fa: 2.84 }, fore: { fl: 0.6, fha: 1.9, ha: 1.7 } },
  fly2: { tx: 3.5, ty: -6, rot: 0.08, len: 1.17, hgt: 0.86, arch: 0.05, hp: -0.02, hind: { hl: 0.97, ha: 2.9, ta: 3.0, fa: 3.12 }, fore: { fl: 0.8, fha: 0.9, ha: 0.7 } },
  fly3: { tx: 3.5, ty: -6, rot: -0.2, len: 1.14, hgt: 0.88, arch: 0.15, hp: -0.1, hind: { hl: 0.8, ha: 2.6, ta: 2.3, fa: 2.0 }, fore: { fl: 0.95, fha: 0.55, ha: 0.4 } },
  land: { tx: 3, ty: 0, rot: -0.36, len: 1.1, hgt: 0.9, arch: 0.3, hp: -0.1, pin: 'wrist', hind: { hl: 0.6, ha: 2.2, ta: 1.2, fa: 0.6 }, fore: { fl: 0.97, fha: 1.0, ha: 0.7 } },
  squash: { tx: 2.2, ty: 1.6, rot: -0.14, len: 1.12, hgt: 0.8, arch: 0.55, hp: -0.12, hind: { ax: -14.5, ay: -1.5, ta: 0.04, fa: 0.03 }, fore: { wx: 12.4, wy: -0.3, ha: 0.1 } },
};
const gr_CYCLE = [[0, 'sit'], [0.14, 'crouch'], [0.26, 'ext'], [0.38, 'fly1'], [0.52, 'fly2'], [0.67, 'fly3'], [0.78, 'land'], [0.86, 'squash'], [1, 'sit']];

// transformations du torse et de la tête (repère local de la grenouille, sans le sol)
function gr_rotAbout(x, y, px, py, a) { const dx = x - px, dy = y - py, c = Math.cos(a), s = Math.sin(a); return [px + dx * c + dy * s, py - dx * s + dy * c]; }
function gr_tmap(K, x, y) {
  let X_ = gr_PIV[0] + (x - gr_PIV[0]) * K.len, Y_ = gr_PIV[1] + (y - gr_PIV[1]) * K.hgt;
  [X_, Y_] = gr_rotAbout(X_, Y_, gr_PIV[0], gr_PIV[1], K.rot);
  return [X_ + K.tx, Y_ + K.ty];
}
function gr_hmap(K, x, y) { const q = gr_rotAbout(x, y, gr_NECK[0], gr_NECK[1], K.hp); return gr_tmap(K, q[0], q[1]); }

// résout une image-clé : chevilles et poignets absolus, ty ajusté si la clé est « posée » (pin)
function gr_resolve(k) {
  const K = { tx: k.tx, ty: k.ty, rot: k.rot, len: k.len, hgt: k.hgt, arch: k.arch, hp: k.hp, hind: { ...k.hind }, fore: { ...k.fore } };
  const solve = () => {
    const hip = gr_tmap(K, gr_HIPL[0], gr_HIPL[1]), sho = gr_tmap(K, gr_SHOL[0], gr_SHOL[1]);
    if (K.hind.hl !== undefined) { K.hind.ax = hip[0] + gr_ds(K.hind) * Math.cos(K.hind.ha); K.hind.ay = hip[1] + gr_ds(K.hind) * Math.sin(K.hind.ha); }
    if (K.fore.fl !== undefined) { K.fore.wx = sho[0] + (gr_UA + gr_FA) * K.fore.fl * Math.cos(K.fore.fha); K.fore.wy = sho[1] + (gr_UA + gr_FA) * K.fore.fl * Math.sin(K.fore.fha); }
  };
  solve();
  if (k.pin) {
    let low;
    if (k.pin === 'foot') { const a = [K.hind.ax, K.hind.ay], t1 = [a[0] + gr_TAR * Math.cos(K.hind.ta), a[1] + gr_TAR * Math.sin(K.hind.ta)], t2 = [t1[0] + gr_TOE * Math.cos(K.hind.fa), t1[1] + gr_TOE * Math.sin(K.hind.fa)]; low = Math.max(t2[1], t1[1], a[1]); }
    else low = K.fore.wy + 0.4;
    K.ty -= low; solve();
  }
  return K;
}
const gr_ds = h => (gr_TH + gr_SH) * h.hl;
const gr_RK = {}; for (const n in gr_KEYS) gr_RK[n] = gr_resolve(gr_KEYS[n]);
const gr_FIELDS = ['tx', 'ty', 'rot', 'len', 'hgt', 'arch', 'hp'];
function gr_mix(tabl, ph) {                                             // interpole des images-clés résolues : tabl = [[ph, nomDeClé], …]
  const out = { hind: {}, fore: {} };
  for (const f of gr_FIELDS) out[f] = tab(tabl.map(([p, n]) => [p, gr_RK[n][f]]), ph);
  for (const f of ['ax', 'ay', 'ta', 'fa']) out.hind[f] = tab(tabl.map(([p, n]) => [p, gr_RK[n].hind[f]]), ph);
  for (const f of ['wx', 'wy', 'ha']) out.fore[f] = tab(tabl.map(([p, n]) => [p, gr_RK[n].fore[f]]), ph);
  return out;
}
function gr_poseAt(pose, ph) {
  if (pose === 'leap') return gr_mix(gr_CYCLE, clamp(ph));
  if (pose === 'land') return gr_mix([[0, 'land'], [0.35, 'squash'], [1, 'sit']], clamp(ph));
  if (pose === 'thaw') return gr_mix([[0, 'frozen'], [1, 'sit']], clamp(ph));
  return gr_mix([[0, pose], [1, pose]], 0);
}
// hauteur du corps (arc du saut, au-dessus de ce que donnent les images-clés) et déplacement horizontal
function gr_leapLift(ph, h = 15) { const q = clamp((ph - 0.26) / 0.52); return h * 4 * q * (1 - q); }
function gr_hopX(ph, dist = 60) { return dist * sm(clamp((ph - 0.24) / 0.56)); }
// respiration : gorge qui pulse (montée rapide, descente lente) ; clignement automatique
function gr_breath(t, rate = 1.25, ph = 0) { const x = ((t * rate + ph) % 1 + 1) % 1; return x < 0.3 ? sm(x / 0.3) : (1 - sm((x - 0.3) / 0.7)) * 0.95 + 0.0; }
function gr_blink(t, seed = 0) {
  const per = 3.1 + gr_h(seed, 3) * 1.1, ph = ((t + gr_h(seed, 5) * per) % per + per) % per, k = Math.floor((t + gr_h(seed, 5) * per) / per);
  const dly = gr_h(k, seed + 9) < 0.35 ? 0.9 : 0, x = ph - (per - 0.32) - dly * 0;          // le dernier tiers de seconde de chaque période
  if (x < 0 || x > 0.3) return 0; const u = x / 0.3; return u < 0.45 ? sm(u / 0.45) : 1 - sm((u - 0.45) / 0.55);
}
