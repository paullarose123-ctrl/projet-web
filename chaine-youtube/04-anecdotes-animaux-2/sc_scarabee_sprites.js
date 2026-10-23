'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_scarabee_sprites.js — le SCARABÉE BOMBARDIER (Brachinus crepitans), son prédateur le crapaud, le jet pulsé, le thermomètre,
   la coupe de l'abdomen et l'icône ICONES[0] (préfixe sb_ ; aucun nom global sans sb_)
   Tout se dessine sur L (270 × 480) AVANT le tramage, dans draw(u, t, S) (jamais dans ui()), sauf : sb_thermo (ui), les étiquettes, ICONES[0] (ui, couleurs exactes).
   Fonctions pures du temps : aucun Math.random, aucun Date ; hasard = graine. Les corps sont dessinés en vectoriel lisse (calque Y), ramenés à des tons fixes de la palette
   par pixel (sb_finish), cernés d'un contour net (layerEnd) puis complétés de détails en pixels (œil, éclats).

   sb_beetle(cx, cy, s, t, o)   (cx, cy) = point de contact avec le sol, au milieu du corps ; s = échelle (1 : corps de 74 px de long, sans les antennes ; 0,6 → 45 px ; 2,6 → 190 px ; antennes en plus ≈ +24 s).
        Anatomie : élytres bleu-noir brillants (stries, reflet qui glisse), pronotum et tête orange-roux, gros œil sombre, mandibules en faucille, antennes à onze articles, six pattes (fémur épais, tibia fin,
        tarse à deux griffes ; tripode de marche), pointe de l'abdomen orange rayée qui dépasse des élytres et PEUT SE REDRESSER ET SE RECOURBER par-dessus le dos pour viser vers l'avant (o.tip).
        o.pose   'stand' (debout, au repos : respire, antennes qui balaient) | 'walk' (marche, o.ph) | 'aim' (fige son tir : arrière relevé, tête basse, pointe recourbée) — raccourcis des paramètres ci-dessous
        o.ph     phase de marche 0..1 (cycle de 6 pattes en tripodes) ; sb_walkPh(distance en unités) donne la phase d'une marche SANS glissement ; sb_WALK.speed = vitesse (unités/s) pour un cycle de sb_WALK.T s
        o.up     0..1 « se redresse fièrement » (corps haut, nez relevé, antennes écartées)         o.aimK 0..1 pose de tir (arrière relevé, nez baissé, pointe qui se redresse)
        o.tip    0..1 position de la pointe de l'abdomen : 0 rentrée (6 px dépassent) · 0,35 tendue vers l'arrière · 0,7 dressée · 1 recourbée par-dessus le dos, buse vers l'avant ; o.aim = angle supplémentaire de la buse (rad, + = vers le bas)
        o.hot    0..1 la pointe rougeoie (réaction en cours) ; o.fire 0..1 tremblement du tir (secousses d'une image à l'autre)
        o.flip   true : regarde à gauche (la lumière o.light reste celle de l'écran : +1 droite par défaut)           o.rim couleur du liseré de contre-jour (défaut doré)
        o.shadow opacité de l'ombre au sol (défaut 0.36) ; o.sil '#rrggbb' silhouette pleine ; o.seed ; o.sheen position 0..1 du reflet qui glisse sur les élytres (défaut : balayage automatique) ; o.blur 0..1 réservé
        renvoie { tip:[x,y] (buse), tipDir:[dx,dy] (unitaire, écran), head:[x,y], eye:[x,y], mouth:[x,y], back:[x,y], mask(px,py), bbox:[x,y,w,h] }
   sb_WALK = { T, speed, stride } ; sb_walkPh(d)
   sb_toad(cx, cy, s, t, o)    le crapaud commun (Bufo bufo) de profil, regarde à GAUCHE par défaut (o.flip = true : à droite). (cx, cy) = sol sous le milieu du ventre ; s = 1 : 90 px de long.
        o.lunge 0..1 coup de tête (le corps s'allonge vers l'avant, la gueule s'ouvre, la langue part) ; o.mouth 0..1 gueule ouverte ; o.tongue 0..1 langue sortie (longueur ≈ 60 s)
        o.recoil 0..1 recul brûlé (le corps se cabre en arrière, la tête se relève, l'œil se plisse) ; o.squint 0..1 œil plissé / fermé ; o.shake −1..1 secousse de la tête (rotation + translation)
        o.hop 0..1 phase d'un saut (accroupi → poussée → vol → réception) ; sb_toadHopX(ph, dist), sb_toadHopY(ph, h) (déplacement à ajouter à cx / cy) ; o.breath (défaut automatique)
        o.wipe 0..1 la patte avant essuie la gueule ; o.light, o.rim, o.shadow, o.sil, o.seed comme le scarabée ; renvoie { eye, mouth, nose, head, throat, mask, bbox }
   sb_jet(x, y, ang, t, t0, o)  jet pulsé de la buse (x, y) dans la direction ang (rad, 0 = vers la droite, + = vers le bas), né à t0 ; o.dur durée du tir (défaut 1,6 s), o.len portée (px, 120), o.hz cadence des bouffées (14),
        o.steam vapeur (1), o.size (1), o.gravity (px/s², 60), o.seed. Gouttelettes comètes dorées et blanches, bouffées de vapeur tramées qui s'étalent, flash à la buse.
   sb_steam(x, y, t, o)         colonne de vapeur qui monte (o.n bouffées, o.w, o.h, o.a opacité) ; sb_splashHit(x, y, t, t0, o) éclaboussure d'impact du jet sur une peau (gouttes brûlantes + vapeur).
   sb_thermo(x, y, h, v, t, o)  thermomètre de laboratoire (ui) : x, y = coin haut gauche de la boîte, h hauteur, v 0..1 (0 = 20 °C, 1 = 100 °C) ; o.flask (éprouvette d'eau qui bout : bulles + vapeur), o.label (nombre affiché),
        o.ticks, o.hot ; renvoie { top, bulb, x, w, level } (ordonnée du niveau du liquide)
   sb_cutaway(t, p, o)          coupe de l'abdomen (planche du carnet, fond nuit) : voir l'en-tête de la section 7.
   ICONES[0]                    icône de case du carnet (17 × 17) : le scarabée vu de dessus, élytres bleu-noir, tête et pronotum orange, antennes, pattes.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ════════════════════════════════════════════════════════════════════════════════════════
// 0. OUTILS
// ════════════════════════════════════════════════════════════════════════════════════════
const sb_rgbM = {};
function sb_rgb(c) { if (Array.isArray(c)) return c; return sb_rgbM[c] || (sb_rgbM[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]); }
function sb_h(i, s = 0) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function sb_h2(x, y, s = 0) { return sb_h(Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663), s); }
const sb_bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
const sb_ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const sb_fin = (v, d = 0) => Number.isFinite(v) ? v : d;
const sb_mixc = (a, b, f) => { a = sb_rgb(a); b = sb_rgb(b); return '#' + [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * f).toString(16).padStart(2, '0')).join(''); };

// spline de Catmull-Rom → Path2D (fermée ou non)
function sb_spline(pts, closed = true, path = new Path2D()) {
  const n = pts.length, g = i => pts[((i % n) + n) % n];
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = closed ? g(i - 1) : pts[Math.max(0, i - 1)], p1 = pts[i], p2 = closed ? g(i + 1) : pts[i + 1], p3 = closed ? g(i + 2) : pts[Math.min(n - 1, i + 2)];
    path.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) path.closePath();
  return path;
}
// courbe de Catmull-Rom échantillonnée (liste de points), k points par intervalle
function sb_curve(pts, k = 6) {
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
// segment lisse à largeur variable et bouts arrondis : UN seul polygone simple (les croissants de lumière en dépendent)
function sb_seg(pts, ws, path = new Path2D(), k = 6) {
  const dense = [], dw = [], n = pts.length;
  if (n === 2) { for (let q = 0; q <= 5; q++) { const u = q / 5; dense.push([pts[0][0] + (pts[1][0] - pts[0][0]) * u, pts[0][1] + (pts[1][1] - pts[0][1]) * u]); dw.push(ws[0] + (ws[1] - ws[0]) * u); } }
  else {
    const cv = sb_curve(pts, k);
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
const sb_ell = (cx, cy, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); return p; };
const sb_fill = (c, path, col) => { c.fillStyle = col; c.fill(path); };
function sb_stroke(c, pts, w, col, closed = false) { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(sb_spline(pts, closed)); }
// croissant de lumière : la partie de `path` située à moins de w du bord tourné vers la lumière ll (inv : du côté de l'ombre)
function sb_cres(c, path, ll, w, col, inv = false) {
  c.save(); c.clip(path);
  const p = new Path2D(); p.rect(-900, -900, 1800, 1800);
  const k = inv ? 1 : -1;
  p.addPath(path, new DOMMatrix([1, 0, 0, 1, k * ll[0] * w, k * ll[1] * w]));
  c.fillStyle = col; c.fill(p, 'evenodd'); c.restore();
}
// IK à deux segments : renvoie le genou ; up = le genou se plie vers le haut (y négatif)
function sb_ik(hx, hy, ax, ay, L1, L2, up = true) {
  const dx = ax - hx, dy = ay - hy, d0 = Math.hypot(dx, dy) || 0.001, mx = L1 + L2 - 0.02, mn = Math.abs(L1 - L2) + 0.05;
  const d = clamp(d0, mn, mx), a = Math.atan2(dy, dx), A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const k1 = [hx + L1 * Math.cos(a + A), hy + L1 * Math.sin(a + A)], k2 = [hx + L1 * Math.cos(a - A), hy + L1 * Math.sin(a - A)];
  const kn = (k1[1] < k2[1]) === up ? k1 : k2;
  return { k: kn, a: [hx + dx / d0 * d, hy + dy / d0 * d] };
}
const sb_rotAbout = (x, y, px, py, a) => { const dx = x - px, dy = y - py, c = Math.cos(a), s = Math.sin(a); return [px + dx * c + dy * s, py - dx * s + dy * c]; };

// ════════════════════════════════════════════════════════════════════════════════════════
// 1. TONS : tout ce qui est dessiné dans le calque est ramené à ces couleurs de la palette (pas de mélange parasite)
// ════════════════════════════════════════════════════════════════════════════════════════
const sb_C = {
  k: '#05040f',
  e0: NI[1], e1: NI[2], e2: NI[3], e3: NI[4], e4: NI[5], e5: BL[2], e6: BL[3], e7: BL[4], e8: NE[3],         // élytres : du bleu nuit au reflet bleu-blanc
  o0: OC[0], o1: OC[1], o2: OC[2], o3: OC[3], o4: OC[4], o5: OC[5], o6: SK[4],                               // orange-roux : de l'ombre brune à l'éclat
  a5: AM[5], a6: AM[6], a7: AM[7], a8: AM[8], a9: AM[9], w1: DU[1], w2: DU[2],                                // or, reflets chauds sur le sombre
  h1: RD[2], h2: RD[3], h3: RD[4], h4: YE[3], wh: WH[2], ww: WH[3],                                           // braise de la buse, éclats
  p1: WO[2], p2: WO[3], p3: WO[4], p4: WO[5], p5: WO[6], p0: WO[1], m1: RD[1], m2: RD[5],                     // (crapaud) peau, gueule
  g1: GR[1], g2: GR[2], g3: GR[3], l1: LM[1], l2: LM[2], l3: LM[3], l4: LM[4],
  c1: SK[2], c2: SK[3], c3: WH[0], c4: WH[1], t1: ST[1], t2: ST[2], t3: ST[3],
};
const sb_TONES = Object.values(sb_C), sb_TI = {}; Object.keys(sb_C).forEach((k, i) => sb_TI[k] = i);
const sb_TRGB = sb_TONES.map(sb_rgb);
const sb_LUT = new Uint8Array(32768);
(function () {
  for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
    const R_ = r * 8.23, G_ = g * 8.23, B_ = b * 8.23; let best = 0, bd = 1e9;
    for (let i = 0; i < sb_TRGB.length; i++) { const p = sb_TRGB[i], rm = (R_ + p[0]) / 2, dr = R_ - p[0], dg = G_ - p[1], db = B_ - p[2], d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; if (d < bd) { bd = d; best = i; } }
    sb_LUT[(r << 10) | (g << 5) | b] = best;
  }
})();
const sb_IS_ORANGE = new Uint8Array(sb_TONES.length), sb_IS_DARK = new Uint8Array(sb_TONES.length);
['o0', 'o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'a5', 'a6', 'a7', 'a8', 'a9', 'p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'c1', 'c2', 'c3', 'c4'].forEach(k => sb_IS_ORANGE[sb_TI[k]] = 1);
['k', 'e0', 'e1', 'o0', 'p0'].forEach(k => sb_IS_DARK[sb_TI[k]] = 1);

// passage pixel : tons de la palette, liseré de contre-jour sur les bords tournés vers la lumière, puis silhouette nette avec contour (layerEnd)
// box = [x0, y0, x1, y1] (zone du calque à traiter) ; renvoie { occ, w, h, x0, y0, mask }
function sb_finish(box, st) {
  const x0 = Math.max(0, Math.floor(box[0])), y0 = Math.max(0, Math.floor(box[1])), x1 = Math.min(LW, Math.ceil(box[2])), y1 = Math.min(LH, Math.ceil(box[3])), w = x1 - x0, h = y1 - y0;
  const outline = st.outline ?? '#05040f';
  if (w <= 0 || h <= 0) { layerEnd({ outline }); return { mask: () => false, bbox: [x0, y0, 0, 0] }; }
  const id = Y.getImageData(x0, y0, w, h), d = id.data, n = w * h, occ = new Uint8Array(n), ix = new Uint8Array(n);
  const amp = st.amp ?? 7, sil = st.sil ? sb_rgb(st.sil) : null;
  for (let j = 0, p = 0; j < h; j++) for (let i = 0; i < w; i++, p++) {
    if (d[p * 4 + 3] < 128) { d[p * 4 + 3] = 0; continue; }
    occ[p] = 1; const of = (sb_bay(x0 + i, y0 + j) - 0.5) * amp;
    ix[p] = sb_LUT[((clamp(d[p * 4] + of, 0, 255) >> 3) << 10) | ((clamp(d[p * 4 + 1] + of, 0, 255) >> 3) << 5) | (clamp(d[p * 4 + 2] + of, 0, 255) >> 3)];
  }
  const Ls = st.Ls, rx = Math.round(Ls[0] * 1.3), ry = Math.round(Ls[1] * 1.3), rw = st.rimW ?? 1;
  const rimO = sb_rgb(st.rimO || SK[4]), rimB = sb_rgb(st.rim || AM[9]);
  const keep = new Uint8Array(n);
  if (!sil && st.rimK !== 0) for (let j = 0, p = 0; j < h; j++) for (let i = 0; i < w; i++, p++) {
    if (!occ[p]) continue;
    const a = (i + rx < 0 || j + ry < 0 || i + rx >= w || j + ry >= h) ? 0 : occ[(j + ry) * w + i + rx];
    if (!a) keep[p] = 1;
    else if (rw > 1) { const b2 = (i + 2 * rx < 0 || j + 2 * ry < 0 || i + 2 * rx >= w || j + 2 * ry >= h) ? 0 : occ[(j + 2 * ry) * w + i + 2 * rx]; if (!b2 && sb_bay(x0 + i, y0 + j) < 0.6) keep[p] = 2; }
  }
  for (let p = 0; p < n; p++) {
    if (!occ[p]) { d[p * 4 + 3] = 0; continue; }
    let c = sil || sb_TRGB[ix[p]];
    if (keep[p] && !sil) { const tn = ix[p]; if (!sb_IS_DARK[tn] || tn === sb_TI.e0 || tn === sb_TI.e1) c = sb_IS_ORANGE[tn] ? rimO : rimB; else c = sb_rgb(sb_C.w2); }
    d[p * 4] = c[0]; d[p * 4 + 1] = c[1]; d[p * 4 + 2] = c[2]; d[p * 4 + 3] = 255;
  }
  Y.putImageData(id, x0, y0);
  layerEnd({ outline });
  return { x0, y0, w, h, occ, bbox: [x0, y0, w, h], mask: (qx, qy) => { const i = Math.round(qx) - x0, j = Math.round(qy) - y0; return i >= 0 && j >= 0 && i < w && j < h && occ[j * w + i] > 0; } };
}

// ombre au sol (ovale à bord doux)
function sb_shadow(x, y, rx, ry, a = 0.36, col = '5,4,15') {
  if (a <= 0) return;
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0);
  for (const [k, q] of [[1, 0.5], [0.72, 0.6]]) { L.fillStyle = `rgba(${col},${a * q})`; L.beginPath(); L.ellipse(x, y, rx * k, ry * k, 0, 0, TAU); L.fill(); }
  L.restore();
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 2. LE SCARABÉE : géométrie (repère du corps : x vers l'avant, y vers le bas, sol y = 0, unités = px à s = 1)
// ════════════════════════════════════════════════════════════════════════════════════════
const sb_ELY = [[13.5, -33.2], [9, -36.4], [1, -38.6], [-8, -39], [-17, -37.6], [-25, -34.4], [-31, -30], [-34.5, -24.8], [-35, -20.8], [-32, -18.2], [-22, -17.2], [-10, -16.8], [2, -17], [10, -18.2], [14.5, -22], [15.5, -27.6]];
const sb_PRO = [[10.5, -34.2], [15.5, -36.4], [21, -35.4], [25, -31.4], [27.2, -26.6], [26.8, -22.4], [23.6, -19.4], [18, -18.4], [12.5, -19.2], [10.2, -25.5]];
const sb_HEAD = [[24, -29.4], [28.8, -31.2], [33.6, -30.6], [37.6, -27.6], [40.2, -23.8], [39.6, -21], [36, -19.2], [31, -18.8], [26.5, -19.6], [24.2, -22]];
const sb_VENT = [[-33.5, -22], [-31.5, -16.6], [-22, -15.2], [-10, -14.6], [2, -14.9], [10, -16.4], [13, -19.4], [0, -18.6], [-18, -19.2], [-30, -20.6]];      // dessous du corps (sternites)
const sb_HIP = { F: [18, -17.2], M: [3.5, -16.4], H: [-12.5, -16.8] };
const sb_PIV = [0, -27], sb_NECK = [25.5, -24], sb_ANT0 = [36, -28.4];
const sb_LF = 13.4, sb_LT = 16.2, sb_LTAR = 8.8;                                                                   // fémur, tibia, tarse
const sb_FORE = { F: [0.96, 1], M: [0.58, 1], H: [0.86, 1] };                                                      // raccourcis de perspective (vue de profil : le fémur du milieu pointe vers nous)
// pointe de l'abdomen : lignes médianes (6 points, de l'intérieur des élytres jusqu'à la buse) pour 0 / 0,35 / 0,7 / 1
const sb_TIPK = [
  [[-25, -19.5], [-29.5, -19.6], [-33.5, -19.2], [-36.4, -18.6], [-38.4, -18], [-39.6, -17.5]],
  [[-25, -19.8], [-32, -20.2], [-39, -20.4], [-46, -19.6], [-52, -17.6], [-57, -15]],
  [[-25, -21], [-32, -24], [-38, -30], [-41, -38], [-40.5, -46], [-36, -52]],
  [[-25, -22], [-33.5, -26], [-39, -33], [-38, -41.5], [-30, -46.5], [-19, -47.5]],
];
const sb_TIPW = [8.2, 7.4, 6.2, 5.0, 4.0, 3.0];
const sb_WALK = { T: 0.52, duty: 0.6, stride: 13, lift: 5.2 };
sb_WALK.speed = sb_WALK.stride / (sb_WALK.duty * sb_WALK.T);                    // unités/s : le corps avance de `stride` pendant l'appui d'un pied
const sb_walkPh = d => d * sb_WALK.duty / sb_WALK.stride;                       // phase (en cycles) après avoir avancé de d unités

// pieds au repos (repère de cx : le sol est y = 0) ; [x, y] pour F, M, H ; côté proche (n) et lointain (f)
const sb_TOES = { n: { F: [40.5, 0], M: [10, 0], H: [-31, 0] }, f: { F: [44.5, 0], M: [13.5, 0], H: [-27, 0] } };
function sb_gait(ph, id, side, st) {                                           // pied d'une patte pendant la marche (tripodes : proche F + proche H + lointaine M ensemble)
  const grp = ((id === 'M') === (side === 'f')) ? 0 : 0.5, p = (((ph + grp) % 1) + 1) % 1, W = sb_WALK, base = st[side][id];
  if (p < W.duty) return [base[0] + W.stride * (0.5 - p / W.duty), 0];
  const q = (p - W.duty) / (1 - W.duty), lift = W.lift * Math.pow(Math.sin(Math.PI * q), 0.85);
  return [base[0] - W.stride / 2 + W.stride * sm(q), -lift];
}

function sb_pose(o, t) {
  const pose = o.pose || 'stand';
  let ph = sb_fin(o.ph, 0), up = clamp(sb_fin(o.up, 0)), aimK = clamp(sb_fin(o.aimK, pose === 'aim' ? 1 : 0));
  const walking = pose === 'walk';
  const P = { pitch: 0, raise: 0, tip: sb_fin(o.tip, aimK), hot: clamp(sb_fin(o.hot, 0)), headRot: 0, antA: 0, antW: 0.5, toes: JSON.parse(JSON.stringify(sb_TOES)), bob: 0 };
  const breath = Math.sin(t * 2.6) * 0.5 + 0.5;
  P.raise += 0.35 * breath;
  if (walking) {
    const c = Math.cos(4 * Math.PI * ph);
    P.bob = 0.6 * c; P.pitch = 0.018 * Math.sin(4 * Math.PI * ph + 1); P.headRot = 0.05 * Math.sin(2 * Math.PI * ph);
    P.antW = 1.0;
    for (const side of ['n', 'f']) for (const id of ['F', 'M', 'H']) P.toes[side][id] = sb_gait(ph, id, side, sb_TOES);
  }
  // se redresse fièrement : le corps monte sur des pattes tendues, le nez se relève, les antennes s'écartent
  P.pitch += 0.17 * up; P.raise += 4.2 * up; P.headRot -= 0.1 * up; P.antA -= 0.4 * up; P.antW += 0.4 * up;
  if (up > 0) { for (const side of ['n', 'f']) { P.toes[side].F[0] += 1.5 * up; P.toes[side].H[0] -= 2.5 * up; } }
  // pose de tir : l'arrière monte, le nez descend, les pattes avant s'arc-boutent, les arrière se tendent
  P.pitch += -0.15 * aimK; P.raise += 2.4 * aimK; P.headRot += 0.14 * aimK; P.antA += 0.2 * aimK; P.antW += 0.15 * aimK;
  if (aimK > 0) { for (const side of ['n', 'f']) { P.toes[side].F[0] += 3 * aimK; P.toes[side].H[0] -= 3 * aimK; } }
  P.fire = clamp(sb_fin(o.fire, 0));
  return P;
}

function sb_beetle(cx, cy, s, t, o = {}) {
  o = o || {};
  const flip = o.flip ? -1 : 1, side = o.light ?? 1, outline = '#05040f';
  const P = sb_pose(o, t), C = sb_C;
  // tremblement du tir : secousses d'une image à l'autre (déterministes)
  const fr = Math.round(t * 30), jit = P.fire > 0 ? [(sb_h(fr, 3) - 0.5) * 1.6 * P.fire, (sb_h(fr, 4) - 0.5) * 1.1 * P.fire] : [0, 0];
  const lsx = side * 0.62, lsy = -0.78, ln = Math.hypot(lsx, lsy), Ls = [lsx / ln, lsy / ln], ll = [Ls[0] * flip, Ls[1]];
  const minW = 1.5 / s;                                                           // largeur minimale d'un trait (px écran → unités)
  // transformations du corps (tangage autour du pivot, hauteur, balancement) et de la tête
  const Tb = (x, y) => { const q = sb_rotAbout(x, y, sb_PIV[0], sb_PIV[1], P.pitch); return [q[0] + jit[0], q[1] - P.raise - P.bob + jit[1]]; };
  const Th = (x, y) => { const q = sb_rotAbout(sb_NECK[0] + (x - sb_NECK[0]) * 0.9, sb_NECK[1] + (y - sb_NECK[1]) * 0.9, sb_NECK[0], sb_NECK[1], P.headRot); return Tb(q[0], q[1]); };
  const mapPts = (pts, f) => pts.map(p => f(p[0], p[1]));
  const sx = x => cx + flip * s * x, sy = y => cy + s * y;
  const sil = o.sil || null;
  // ombre au sol
  sb_shadow(cx - flip * s * 3, cy + 0.6 * s, 38 * s, 3.8 * s, (o.shadow ?? 0.36) * (sil ? 0 : 1));
  layerBegin(); const c = Y; c.setTransform(flip * s, 0, 0, s, cx, cy);
  const cw = 1.6 / s;                                                              // contour interne d'un pixel
  // ── une partie lisse à trois tons clairs et deux sombres (croissants)
  const part = (path, tones, wl = [2.2, 1.0], ws = [2.6, 1.1]) => {
    sb_fill(c, path, tones[0]);
    sb_cres(c, path, ll, wl[0], tones[1]); sb_cres(c, path, ll, wl[1], tones[2]);
    sb_cres(c, path, ll, ws[0], tones[3], true); sb_cres(c, path, ll, ws[1], tones[4], true);
  };
  const OR_N = [C.o4, C.o5, C.o6, C.o3, C.o2], OR_F = [C.o3, C.o4, C.o5, C.o2, C.o1];
  // ── pattes
  const hipsN = { F: Tb(...sb_HIP.F), M: Tb(...sb_HIP.M), H: Tb(...sb_HIP.H) };
  const legsInfo = {};
  const drawLeg = (hip, toe, far, id) => {
    const dir = id === 'H' ? -1 : 1;                                                    // le tarse pointe en avant (avant, milieu) ou en arrière (arrière)
    const lifted = clamp(-toe[1] / 5.5), al = 0.34 + 0.75 * lifted;
    const ank = [toe[0] - dir * sb_LTAR * Math.cos(al), toe[1] - sb_LTAR * Math.sin(al)];
    const ik = sb_ik(hip[0], hip[1], ank[0], ank[1], sb_LF * sb_FORE[id][0], sb_LT * sb_FORE[id][1], true), kn = ik.k, an = ik.a;
    const tones = far ? OR_F : OR_N;
    const wd = (a, b, m) => [Math.max(minW * 1.1, a), Math.max(minW * 1.2, m), Math.max(minW, b)];
    const stk = (pp, ww, wl, ws) => { const p = sb_seg(pp, ww); if (!far) { c.strokeStyle = C.o1; c.lineWidth = cw * 0.8; c.lineJoin = 'round'; c.stroke(p); } part(p, tones, wl, ws); return p; };
    // tarse (cinq articles : un trait fin) et deux griffes
    const tm = [(ank[0] + toe[0]) / 2, (ank[1] + toe[1]) / 2 + 0.2];
    stk([an, tm, toe], wd(1.5, 0.9, 1.2), [0.5, 0.3], [0.5, 0.3]);
    const claw = (a) => { c.strokeStyle = far ? C.o1 : C.o2; c.lineWidth = Math.max(0.7, minW * 0.8); c.lineCap = 'round'; c.beginPath(); c.moveTo(toe[0], toe[1]); c.lineTo(toe[0] + dir * 1.8 * Math.cos(a), toe[1] + 1.8 * Math.sin(a)); c.stroke(); };
    claw(0.9); claw(-0.1);
    // tibia fin, légèrement renflé au milieu, avec de petites épines
    stk([kn, [(kn[0] + an[0]) / 2 + 0.1, (kn[1] + an[1]) / 2], an], wd(2.0, 1.5, 1.8), [0.7, 0.3], [0.8, 0.3]);
    // fémur épais (fuseau)
    const fm = [(hip[0] + kn[0]) / 2, (hip[1] + kn[1]) / 2 - 0.4];
    stk([hip, fm, kn], wd(2.4, 2.5, 3.5), [1.1, 0.5], [1.2, 0.5]);
    if (!far && s >= 1.4) { c.strokeStyle = C.o2; c.lineWidth = 0.6; for (let q = 1; q <= 3; q++) { const f = 0.25 + q * 0.2, px_ = kn[0] + (an[0] - kn[0]) * f, py_ = kn[1] + (an[1] - kn[1]) * f; c.beginPath(); c.moveTo(px_ - dir * 0.6, py_); c.lineTo(px_ - dir * 1.6, py_ - 0.2); c.stroke(); } }
    legsInfo[id + (far ? 'f' : 'n')] = { kn, an, toe };
  };
  // loin : pattes lointaines (décalées, plus sombres)
  for (const id of ['H', 'M', 'F']) {
    const h0 = hipsN[id], hip = [h0[0] + 3.2, h0[1] - 1.0];
    drawLeg(hip, [P.toes.f[id][0], P.toes.f[id][1]], true, id);
  }
  // ── antenne lointaine
  const antenna = (far) => {
    const base = Th(sb_ANT0[0] + (far ? 1.2 : 0), sb_ANT0[1] + (far ? -0.2 : 0));
    const pts = [base], ws = [Math.max(1.2, minW)]; let ax = base[0], ay = base[1];
    const a0 = -0.5 + P.antA + (far ? -0.26 : 0.0) + P.headRot * 0.5, nseg = 11, L1 = 3.5;
    for (let i = 0; i < nseg; i++) {
      const f = i / nseg, wv = P.antW * (Math.sin(t * 3.1 + i * 0.55 + (far ? 1.7 : 0)) * 0.1 + Math.sin(t * 1.3 + (far ? 0.6 : 0)) * 0.08) * (0.3 + f);
      const a = a0 + 0.9 * f * f + wv + 0.1 * f; ax += Math.cos(a) * L1; ay += Math.sin(a) * L1;
      pts.push([ax, ay]); ws.push(Math.max(i % 2 ? 0.95 : 1.25, minW * (i % 2 ? 0.8 : 1.0)) * (1 - 0.35 * f));
    }
    const p = sb_seg(pts, ws, new Path2D(), 3);
    part(p, far ? OR_F : OR_N, [0.5, 0.3], [0.5, 0.3]);
    return pts[nseg];
  };
  antenna(true);
  // ── pointe de l'abdomen (derrière les élytres : seule la partie qui dépasse se voit ; recourbée, elle passe devant)
  const tipK = clamp(P.tip) * 3, i0 = Math.min(2, Math.floor(tipK)), fk = tipK - i0;
  const tipLine = sb_TIPK[i0].map((p, i) => [p[0] + (sb_TIPK[i0 + 1][i][0] - p[0]) * fk, p[1] + (sb_TIPK[i0 + 1][i][1] - p[1]) * fk]);
  if (o.aim) { const e = tipLine[5], m = tipLine[3], a = o.aim * clamp(P.tip * 1.4); for (const i of [4, 5]) { const q = sb_rotAbout(tipLine[i][0], tipLine[i][1], m[0], m[1], -a); tipLine[i] = q; } void e; }
  const tipPts = mapPts(tipLine, Tb);
  const tipW = sb_TIPW.map(w => Math.max(w * (1 - 0.0 * clamp(P.tip)), minW * 2));
  const drawTip = () => {
    const path = sb_seg(tipPts, tipW, new Path2D(), 5);
    c.strokeStyle = C.o1; c.lineWidth = cw * 0.9; c.lineJoin = 'round'; c.stroke(path);
    part(path, [C.o3, C.o4, C.o5, C.o2, C.o1], [2.0, 0.9], [2.3, 1.0]);
    // anneaux (segments de l'abdomen) : traits sombres en travers + reflet chaud
    const cvp = sb_curve(tipPts, 5), wcv = []; for (let q = 0; q < cvp.length; q++) { const f = q / 5, i = Math.min(4, Math.floor(f)), uu = f - i; wcv.push(tipW[i] + (tipW[Math.min(5, i + 1)] - tipW[i]) * uu); }
    c.save(); c.clip(path);
    for (const q of [8, 13, 18, 23]) { if (q >= cvp.length - 1) continue; const a = cvp[q - 1], b = cvp[q + 1], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l, hw = wcv[q] / 2 + 0.5;
      c.strokeStyle = C.o1; c.lineWidth = Math.max(0.8, minW * 0.9); c.beginPath(); c.moveTo(cvp[q][0] - nx * hw, cvp[q][1] - ny * hw); c.lineTo(cvp[q][0] + nx * hw, cvp[q][1] + ny * hw); c.stroke(); }
    c.restore();
    // buse : petit embout sombre à l'extrémité, braise quand la réaction chauffe
    const e = tipPts[5], pe = tipPts[4], dx = e[0] - pe[0], dy = e[1] - pe[1], dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, ang = Math.atan2(uy, ux);
    const nz = sb_ell(e[0] + ux * 0.8, e[1] + uy * 0.8, 2.3, Math.max(1.5, tipW[5] / 2 + 0.2), ang);
    sb_fill(c, nz, P.hot > 0.5 ? C.h2 : C.o0);
    if (P.hot > 0) { c.globalAlpha = clamp(P.hot * 1.4); const g = sb_ell(e[0] + ux * 1.4, e[1] + uy * 1.4, 1.5, Math.max(1, tipW[5] / 2 - 0.5), ang); sb_fill(c, g, P.hot > 0.75 ? C.h4 : C.h3); c.globalAlpha = 1;
      // la chaleur gagne le bout de l'abdomen : le dernier tiers vire à l'orange vif puis au rouge
      c.save(); c.clip(path); c.globalAlpha = clamp(P.hot * 0.9); const hp = sb_seg([tipPts[3], tipPts[4], tipPts[5]], [tipW[3] + 2, tipW[4] + 2, tipW[5] + 2]); sb_fill(c, hp, P.hot > 0.6 ? C.h2 : C.a6); c.globalAlpha = 1; c.restore(); }
    return { e, ux, uy };
  };
  const tipBehind = P.tip < 0.55;
  let tipInfo = null;
  if (tipBehind) tipInfo = drawTip();
  // ── dessous du corps (sternites) puis élytres
  const vent = sb_spline(mapPts(sb_VENT, Tb));
  c.strokeStyle = C.o0; c.lineWidth = cw; c.stroke(vent);
  part(vent, [C.o2, C.o3, C.o4, C.o1, C.o0], [1.0, 0.5], [1.4, 0.6]);
  c.save(); c.clip(vent); c.strokeStyle = C.o0; c.lineWidth = Math.max(0.7, minW * 0.8);                             // plaques ventrales : fines lignes
  for (let x = -26; x < 12; x += 6.5) { const a = Tb(x, -17.5), b = Tb(x + 1.2, -11.5); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); } c.restore();
  const ely = sb_spline(mapPts(sb_ELY, Tb));
  part(ely, [C.e3, C.e4, C.e5, C.e2, C.e1], [4.2, 2.0], [4.4, 1.9]);
  // reflets de l'élytre : bande brillante le long du dos, rebond chaud du sol en bas, stries
  c.save(); c.clip(ely);
  const edgeTop = x => { const q = sb_ELY; let best = -40; for (let i = 0; i < 9; i++) { const a = q[i], b = q[i + 1]; if (x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0]) && a[0] !== b[0]) best = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return best; };
  { const lo = -15.2;
    for (let j = 1; j <= 5; j++) {                                                                                 // stries : courbes parallèles au dos, qui se resserrent à l'arrière
      const f = j / 6.2, pts = []; for (let x = 13; x >= -32; x -= 5) { const yt = edgeTop(Math.max(-33, x)), yb = lo + (x < -26 ? (x + 26) * 0.1 : 0); pts.push(Tb(x, yt + (yb - yt) * f * (x < -28 ? 0.9 : 1))); }
      sb_stroke(c, pts, Math.max(0.7, minW * 0.75), C.e1); sb_stroke(c, pts.map(p => [p[0], p[1] - 0.8]), Math.max(0.55, minW * 0.55), C.e4);
    }
    // bande brillante (reflet du ciel doré) : deux tons, un fin éclat
    const hl = []; for (let x = 8; x >= -27; x -= 5) hl.push(Tb(x, edgeTop(x) + 3.1 + (x < -14 ? (-14 - x) * 0.12 : 0)));
    sb_stroke(c, hl, 2.1, C.e6); sb_stroke(c, hl.map(p => [p[0] + 0.4, p[1] - 0.3]), 1.0, C.e7);
    const hl2 = []; for (let x = 0; x >= -22; x -= 5) hl2.push(Tb(x, edgeTop(x) + 2.7)); sb_stroke(c, hl2, 0.6, C.e8);
    // rebond chaud du sol sur le bas du flanc
    c.globalAlpha = 0.9; sb_cres(c, ely, ll, 2.0, C.w2, true); c.globalAlpha = 1;
    // reflet qui glisse (balayage lent) : bande oblique claire
    const sh = o.sheen ?? ((t * 0.45) % 3.2) / 1.0;
    if (sh >= 0 && sh <= 1.2) { const xx = 12 - sh * 46, a = Tb(xx + 6, -40), b = Tb(xx - 2, -14); c.save(); c.globalAlpha = 0.9; sb_stroke(c, [a, b], 2.4, C.e6); sb_stroke(c, [[a[0] + 1, a[1]], [b[0] + 1, b[1]]], 1.0, C.e8); c.restore(); }
  }
  c.restore();
  c.strokeStyle = C.e0; c.lineWidth = cw * 0.9; c.lineJoin = 'round'; c.stroke(ely);
  if (!tipBehind) tipInfo = drawTip();
  // ── pronotum
  const pro = sb_spline(mapPts(sb_PRO, Tb));
  c.strokeStyle = C.o0; c.lineWidth = cw; c.lineJoin = 'round'; c.stroke(pro);
  part(pro, [C.o4, C.o5, C.o6, C.o3, C.o2], [3.0, 1.3], [3.4, 1.5]);
  c.save(); c.clip(pro);
  { const gr = [Tb(18, -38), Tb(18.6, -28), Tb(18.2, -16)]; sb_stroke(c, gr, Math.max(0.7, minW * 0.8), C.o2); sb_stroke(c, gr.map(p => [p[0] + 0.9 * ll[0], p[1] + 0.9 * ll[1]]), 0.6, C.o5);     // sillon médian
    const gr2 = [Tb(11.6, -34), Tb(11.2, -24), Tb(12.4, -16.5)]; sb_stroke(c, gr2, Math.max(0.8, minW * 0.9), C.o1); }                                            // sillon de base
  c.restore();
  // ── tête (tourne autour du cou)
  const head = sb_spline(mapPts(sb_HEAD, Th));
  c.strokeStyle = C.o0; c.lineWidth = cw; c.stroke(head);
  // mandibules : faucilles brun sombre sous le museau
  const mand = (dx, dy, far) => { const a = Th(38.6 + dx, -22.2 + dy), b = Th(42.6 + dx, -20.4 + dy), e = Th(42.4 + dx, -16.8 + dy); const p = sb_seg([a, b, e], [Math.max(2.0, minW * 1.4), Math.max(1.5, minW * 1.1), Math.max(0.8, minW * 0.7)]); part(p, far ? [C.o1, C.o2, C.o3, C.o0, C.o0] : [C.o2, C.o3, C.o4, C.o1, C.o0], [0.6, 0.3], [0.6, 0.3]); };
  mand(0.5, 0.6, true);
  part(head, [C.o4, C.o5, C.o6, C.o3, C.o2], [2.8, 1.2], [3.0, 1.3]);
  mand(0, 0, false);
  // palpes
  { const a = Th(36.4, -19.4), b = Th(38.6, -15.8); sb_stroke(c, [a, [(a[0] + b[0]) / 2 + 0.5, (a[1] + b[1]) / 2], b], Math.max(1.1, minW), C.o3); }
  // œil composé : bossage sombre à reflet chaud en haut à droite (lumière), cerné d'un anneau brun
  const eyeC = Th(32.4, -26), eyeR = 3.2;
  { const e = sb_ell(eyeC[0], eyeC[1], eyeR, eyeR * 0.92, P.headRot); c.strokeStyle = C.o1; c.lineWidth = cw * 0.9; c.stroke(e); sb_fill(c, e, C.e0);
    sb_cres(c, e, ll, 1.6, C.e3); sb_cres(c, e, ll, 0.8, C.e4); c.globalAlpha = 0.8; sb_cres(c, e, ll, 1.3, C.w1, true); c.globalAlpha = 1; }
  // front : une petite crête claire au-dessus de l'œil
  { const a = Th(29, -30.4), b = Th(35.5, -29.4); sb_stroke(c, [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.5], b], Math.max(0.9, minW * 0.9), C.o5); }
  // antenne proche
  const antEnd = antenna(false);
  // ── pattes proches (par-dessus le corps)
  for (const id of ['H', 'M', 'F']) drawLeg(hipsN[id], [P.toes.n[id][0], P.toes.n[id][1]], false, id);
  // ── passage pixel
  const sxr = [cx - 62 * s - 6, cx + 62 * s + 6];
  const info = sb_finish([Math.min(sxr[0], sxr[1]) - 12 * s, cy - 78 * s - 4, Math.max(sxr[0], sxr[1]) + 14 * s, cy + 6 * s], { Ls, rim: o.rim, rimO: o.rimO, sil, outline, rimW: s >= 3.2 ? 2 : 1 });
  // ── détails nets : éclat de l'œil, éclat du dos
  L.setTransform(1, 0, 0, 1, 0, 0);
  const E = [sx(eyeC[0]), sy(eyeC[1])], ex = Math.round(E[0]), ey = Math.round(E[1]);
  if (!sil) {
    const er = Math.max(1, Math.round(eyeR * s * 0.5));
    px(ex + Math.round(Ls[0] * er * 0.9), ey + Math.round(Ls[1] * er * 0.9), WH[3]);
    if (s >= 2.2) { px(ex - Math.round(Ls[0] * er * 0.7), ey - Math.round(Ls[1] * er * 0.7), BL[4]); }
  }
  const ne = tipInfo.e, dirS = [tipInfo.ux * flip, tipInfo.uy], nz = [sx(ne[0]) + dirS[0] * 1.2 * s, sy(ne[1]) + dirS[1] * 1.2 * s];
  const Hh = Th(41, -20), M = Th(42.6, -16.2), Bk = Tb(-4, -39);
  return { tip: nz, tipDir: dirS, head: [sx(Hh[0]), sy(Hh[1])], eye: E, mouth: [sx(M[0]), sy(M[1])], back: [sx(Bk[0]), sy(Bk[1])], mask: info.mask, bbox: info.bbox, antenna: [sx(antEnd[0]), sy(antEnd[1])] };
}
