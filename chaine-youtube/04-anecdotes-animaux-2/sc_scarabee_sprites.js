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

// ════════════════════════════════════════════════════════════════════════════════════════
// 3. LE CRAPAUD (Bufo bufo) : le prédateur. Repère : x vers l'avant (le museau), y vers le bas, sol y = 0, 1 unité = 1 px à s = 1 (corps ≈ 100 de long)
// ════════════════════════════════════════════════════════════════════════════════════════
function sb_ikSide(hx, hy, ax, ay, L1, L2, sgn) {                                  // genou / coude du côté x croissant (sgn = 1) ou décroissant (−1)
  const dx = ax - hx, dy = ay - hy, d0 = Math.hypot(dx, dy) || 0.001, mx = L1 + L2 - 0.02, mn = Math.abs(L1 - L2) + 0.05;
  const d = clamp(d0, mn, mx), a = Math.atan2(dy, dx), A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const k1 = [hx + L1 * Math.cos(a + A), hy + L1 * Math.sin(a + A)], k2 = [hx + L1 * Math.cos(a - A), hy + L1 * Math.sin(a - A)];
  return { k: (k1[0] > k2[0]) === (sgn > 0) ? k1 : k2, k1, k2, a: [hx + dx / d0 * d, hy + dy / d0 * d] };
}
const sb_TORSO = [[-44, -8], [-50, -18], [-49, -31], [-41, -42], [-27, -49], [-10, -50], [5, -46.5], [17, -40], [25, -31], [27, -20], [23, -11], [10, -6.5], [-14, -6], [-32, -6.6]];
const sb_THEAD = [[11, -39], [21, -45.5], [33, -47], [44, -43.5], [53, -37], [59.5, -28.5], [60.5, -22.5], [55, -19.2], [44, -18.2], [32, -18], [22, -19], [13, -24]];
const sb_TJAW = [[24, -18.1], [40, -18.7], [55, -18.4], [58.5, -14.6], [52, -9.4], [39, -7.6], [27, -9.4], [20.5, -14]];
const sb_TPIV = [-30, -12], sb_TNECK = [21, -27], sb_TJH = [24.5, -18.4];
const sb_TDEF = { hipN: [-31, -21], hipF: [-26, -22.5], shoN: [17, -20], shoF: [22, -21] };
function sb_toadHopX(ph, dist = 80) { return dist * sm(clamp((ph - 0.26) / 0.54)); }
function sb_toadHopY(ph, h = 26) { const q = clamp((ph - 0.28) / 0.52); return -h * 4 * q * (1 - q); }

function sb_toad(cx, cy, s, t, o = {}) {
  o = o || {};
  const flip = o.flip ? -1 : 1, side = o.light ?? 1, outline = '#05040f', C = sb_C, sil = o.sil || null, seed = o.seed ?? 5;
  const lunge = clamp(sb_fin(o.lunge, 0)), recoil = clamp(sb_fin(o.recoil, 0)), shake = clamp(sb_fin(o.shake, 0), -1, 1), wipe = clamp(sb_fin(o.wipe, 0));
  const hop = o.hop !== undefined ? clamp(sb_fin(o.hop, 0)) : -1;
  const br = o.breath ?? (0.5 + 0.5 * Math.sin(t * 3.4)), blinkA = ((t * 0.31 + sb_h(seed, 2)) % 1);
  const blink = o.squint !== undefined ? 0 : (blinkA > 0.94 ? Math.sin((blinkA - 0.94) / 0.06 * Math.PI) : 0);
  const squint = clamp(o.squint !== undefined ? sb_fin(o.squint, 0) : 0.85 * recoil);
  const lidQ = clamp(Math.max(squint, blink));
  const mouthK = clamp(Math.max(sb_fin(o.mouth, 0), lunge > 0 ? Math.min(1, lunge * 1.25) : 0, recoil * 0.35));
  // phases du saut : accroupie → poussée → vol → réception
  let crouch = 0, land = 0, hopPitch = 0;
  if (hop >= 0) { crouch = bump(hop, 0, 0.14, 0.22, 0.3); const q = clamp((hop - 0.28) / 0.52); land = bump(hop, 0.78, 0.84, 0.88, 1.0); hopPitch = hop < 0.28 ? -0.06 * crouch : 0.2 - 0.46 * q; }
  const ext = hop >= 0 ? clamp(sm(prog(hop, 0.14, 0.3)) * (1 - sm(prog(hop, 0.76, 0.88)))) : 0;       // pattes arrière tendues
  const reach = hop >= 0 ? clamp(sm(prog(hop, 0.2, 0.34)) * (1 - sm(prog(hop, 0.74, 0.84)))) : 0;     // bras tendus vers l'avant
  const pitch = hopPitch - 0.07 * lunge + 0.2 * recoil + 0.05 * land;
  const dxBody = 9 * lunge - 7 * recoil, dyBody = 3.2 * crouch + 3.4 * land + 2.4 * lunge - 1.2 * recoil + 0.45 * br * (hop >= 0 ? 0 : 1);
  const headRot = -0.28 * recoil + 0.2 * shake + 0.05 * Math.sin(t * 2.2) * (1 - recoil) - 0.12 * ext;
  const headDx = 12 * lunge - 5 * recoil + 3.4 * shake, headDy = 2.2 * lunge - 3 * recoil;
  const lsx = side * 0.62, lsy = -0.78, ln = Math.hypot(lsx, lsy), Ls = [lsx / ln, lsy / ln], ll = [Ls[0] * flip, Ls[1]];
  const Tb = (x, y) => { const q = sb_rotAbout(x, y, sb_TPIV[0], sb_TPIV[1], pitch); return [q[0] + dxBody, q[1] + dyBody]; };
  const Th = (x, y) => { const q = sb_rotAbout(x, y, sb_TNECK[0], sb_TNECK[1], headRot); return Tb(q[0] + headDx, q[1] + headDy); };
  const sx = x => cx + flip * s * x;
  const liftY = hop >= 0 ? sb_toadHopY(hop, o.hopH ?? 24) : 0, hk = clamp(-liftY / 60);
  const shA = (o.shadow ?? 0.34) * (sil ? 0 : 1);
  if (shA > 0) sb_shadow(cx - flip * s * 6, cy + 0.8 * s, (50 + 6 * lunge) * s * (1 - hk * 0.2), 4.6 * s * (1 - hk * 0.2), shA * (1 - hk * 0.5));
  layerBegin(); const c = Y; c.setTransform(flip * s, 0, 0, s, cx, cy + liftY * s);
  const cw = 1.7 / s, minW = 1.5 / s;
  const part = (path, tones, wl = [3, 1.3], ws = [3.4, 1.4]) => { sb_fill(c, path, tones[0]); sb_cres(c, path, ll, wl[0], tones[1]); sb_cres(c, path, ll, wl[1], tones[2]); sb_cres(c, path, ll, ws[0], tones[3], true); sb_cres(c, path, ll, ws[1], tones[4], true); };
  const SKN = [C.p4, C.p5, C.c2, C.p3, C.p2], SKF = [C.p3, C.p4, C.p5, C.p2, C.p1];
  // ── patte arrière : cuisse repliée le long du flanc, jambe en arrière, pied à plat ; dans le saut tout se tend vers l'arrière
  const hind = (hipB, far) => {
    const hip = Tb(hipB[0], hipB[1]);
    const foldA = [-44 + (far ? 3 : 0), -3.6], extA = [-84 + (far ? 3 : 0), -12 + (far ? 2 : 0)];
    const ank = [lerp(foldA[0], extA[0], ext), lerp(foldA[1], extA[1], ext)];
    const ik = sb_ikSide(hip[0], hip[1], ank[0], ank[1], 29, 30, 1), kf = ik.k1[0] > ik.k2[0] ? ik.k1 : ik.k2, ku = ik.k1[1] < ik.k2[1] ? ik.k1 : ik.k2;
    const kn = [lerp(kf[0], ku[0], ext), lerp(kf[1], ku[1], ext)], an = ik.a;
    const tones = far ? SKF : SKN;
    const fdir = [lerp(1, -0.9, ext), lerp(0.05, 0.42, ext)], fl = Math.hypot(fdir[0], fdir[1]); fdir[0] /= fl; fdir[1] /= fl;
    const ball = [an[0] + fdir[0] * 13, an[1] + fdir[1] * 13];
    const toes = [];
    for (let k = 0; k < 5; k++) { const sp = (k - 2) * 0.2, a = Math.atan2(fdir[1], fdir[0]) + sp, len = 8.4 * [0.6, 0.8, 0.92, 1, 0.8][k]; toes.push([ball, [ball[0] + Math.cos(a) * len * 0.5, ball[1] + Math.sin(a) * len * 0.5], [ball[0] + Math.cos(a) * len, ball[1] + Math.sin(a) * len]]); }
    const thP = sb_seg([hip, [(hip[0] + kn[0]) / 2, (hip[1] + kn[1]) / 2 - 1.0], kn], [18, 16, 10.5]);
    const shP = sb_seg([kn, [(kn[0] + an[0]) / 2, (kn[1] + an[1]) / 2], an], [10.5, 8.6, 6.0]);
    const ftP = sb_seg([an, [(an[0] + ball[0]) / 2, (an[1] + ball[1]) / 2], ball], [6.0, 5.2, 4.6]);
    for (let k = 4; k >= 0; k--) { const tp = sb_seg(toes[k], [Math.max(minW * 1.3, 2.9), Math.max(minW * 1.2, 2.4), Math.max(minW, 1.5)]); if (!far) { c.strokeStyle = C.p1; c.lineWidth = cw * 0.8; c.stroke(tp); } part(tp, tones, [0.8, 0.4], [0.8, 0.4]); }
    if (!far && s >= 1.2) { const web = polyPath([toes[0][2], toes[1][2], toes[2][2], toes[3][2], toes[4][2], ball]); c.globalAlpha = 0.55; sb_fill(c, web, C.p3); c.globalAlpha = 1; }
    if (!far) { c.strokeStyle = C.p1; c.lineWidth = cw; c.lineJoin = 'round'; c.stroke(ftP); c.stroke(shP); }
    part(ftP, tones, [1.1, 0.5], [1.2, 0.5]);
    part(shP, tones, [1.8, 0.8], [2.2, 0.9]);
    if (!far) { c.strokeStyle = C.p1; c.lineWidth = cw; c.stroke(thP); }
    part(thP, tones, [3.2, 1.3], [3.8, 1.6]);
    if (!far) {
      c.save(); c.clip(thP); const r = rng(seed * 31 + 7);
      for (let i = 0; i < 8; i++) { const f = 0.12 + r() * 0.78, q = [hip[0] + (kn[0] - hip[0]) * f + (r() - 0.5) * 8, hip[1] + (kn[1] - hip[1]) * f + (r() - 0.5) * 8], e = sb_ell(q[0], q[1], 1.1 + r() * 1.2, 0.9 + r() * 0.9, r() * 3); sb_fill(c, e, C.p2); sb_cres(c, e, ll, 0.5, C.p5); }
      c.restore();
      c.save(); c.clip(shP); c.strokeStyle = C.p1; c.lineWidth = 1.5; for (const f of [0.3, 0.55, 0.8]) { const q = [kn[0] + (an[0] - kn[0]) * f, kn[1] + (an[1] - kn[1]) * f]; c.beginPath(); c.moveTo(q[0] - 3, q[1] - 5); c.lineTo(q[0] + 2, q[1] + 5); c.stroke(); } c.restore();
    }
    return { kn, an, ball };
  };
  // ── bras : droit, quatre doigts écartés ; tendu vers l'avant dans le saut ; remonte vers la gueule pour s'essuyer
  const arm = (shoB, far, wipeK) => {
    const shoT = Tb(shoB[0], shoB[1]);
    let wr = Tb(shoB[0] + 10 + lunge * 6 - recoil * 2, -1.8);
    if (reach > 0) { const q = Tb(shoB[0] + 26, -16 - 4 * (1 - reach)); wr = [lerp(wr[0], q[0], reach), lerp(wr[1], q[1], reach)]; }
    if (wipeK > 0) { const m = Th(55, -17); wr = [lerp(wr[0], m[0] - 1, wipeK), lerp(wr[1], m[1] + 3 - 4 * Math.sin(t * 22) * wipeK, wipeK)]; }
    const ik = sb_ikSide(shoT[0], shoT[1], wr[0], wr[1], 14, 15.5, -1), el = ik.k, w2 = ik.a, tones = far ? SKF : SKN;
    const upP = sb_seg([shoT, [(shoT[0] + el[0]) / 2, (shoT[1] + el[1]) / 2], el], [8.0, 7.0, 5.8]);
    const foP = sb_seg([el, [(el[0] + w2[0]) / 2, (el[1] + w2[1]) / 2], w2], [5.8, 5.0, 4.0]);
    const fa = Math.atan2(w2[1] - el[1], w2[0] - el[0]);
    for (let k = 0; k < 4; k++) { const a = (wipeK > 0.3 || reach > 0.3 ? fa : 0.1) + (k - 1.5) * 0.22, len = 8.2 * [0.8, 1, 1, 0.78][k], p = [[w2[0], w2[1]], [w2[0] + Math.cos(a) * len * 0.55, w2[1] + Math.sin(a) * len * 0.55 + 0.3], [w2[0] + Math.cos(a) * len, w2[1] + Math.sin(a) * len + 0.5]];
      const fp = sb_seg(p, [Math.max(minW * 1.2, 2.6), Math.max(minW * 1.1, 2.3), Math.max(minW, 1.6)]); if (!far) { c.strokeStyle = C.p1; c.lineWidth = cw * 0.8; c.stroke(fp); } part(fp, tones, [0.7, 0.3], [0.7, 0.3]); }
    if (!far) { c.strokeStyle = C.p1; c.lineWidth = cw; c.lineJoin = 'round'; c.stroke(foP); c.stroke(upP); }
    part(foP, tones, [1.4, 0.6], [1.6, 0.7]);
    part(upP, tones, [1.8, 0.8], [2.0, 0.9]);
    return { el, w2 };
  };
  hind(sb_TDEF.hipF, true);
  arm(sb_TDEF.shoF, true, 0);
  // ── corps : peau brune verruqueuse
  const torso = sb_spline(sb_TORSO.map(p => Tb(p[0], p[1] + (p[1] > -14 && p[0] > -40 ? -br * 0.5 : 0))));
  c.strokeStyle = C.p1; c.lineWidth = cw; c.lineJoin = 'round'; c.stroke(torso);
  part(torso, SKN, [5.2, 2.2], [6.0, 2.6]);
  c.save(); c.clip(torso);
  { const bp = sb_spline([Tb(-52, -10.5), Tb(-36, -9.2), Tb(-20, -10.4), Tb(-2, -9.4), Tb(14, -10), Tb(30, -14), Tb(34, 6), Tb(0, 14), Tb(-54, 8)]);
    sb_fill(c, bp, C.c2); sb_cres(c, torso, ll, 2.4, C.c3); sb_cres(c, torso, ll, 1.0, C.c4); sb_cres(c, torso, ll, 3.0, C.o4, true); }
  const r = rng(seed * 97 + 11);
  for (let i = 0; i < 9; i++) { const q = Tb(-46 + r() * 64, -46 + r() * 20), e = sb_ell(q[0], q[1], 3.4 + r() * 5.4, 2.2 + r() * 3.0, (r() - 0.5) * 1.2); c.globalAlpha = 0.9; sb_fill(c, e, i % 4 === 0 ? C.l1 : i % 3 === 0 ? C.p1 : C.p2); c.globalAlpha = 1; }
  for (let i = 0; i < 34; i++) { const q = Tb(-48 + r() * 72, -49 + r() * 36), e = sb_ell(q[0], q[1], 1.1 + r() * 1.7, 0.9 + r() * 1.2, r() * 3), warm = r() < 0.4;
    sb_fill(c, e, warm ? C.o3 : C.p4); sb_cres(c, e, ll, 0.7, warm ? C.o5 : C.p5); sb_cres(c, e, ll, 0.8, C.p2, true); }
  // glande parotoïde : gros haricot en relief derrière l'œil, pores sombres
  { const par = sb_spline([Th(0, -42), Th(11, -47), Th(20, -45), Th(23, -39), Th(15, -34.5), Th(4, -36)]);
    c.strokeStyle = C.p1; c.lineWidth = cw * 0.9; c.stroke(par); part(par, [C.p4, C.p5, C.p5, C.p2, C.p1], [2.2, 1.0], [2.4, 1.0]);
    c.save(); c.clip(par); const rr = rng(seed * 13 + 5); for (let i = 0; i < 10; i++) { const q = Th(3 + rr() * 18, -45 + rr() * 9); sb_fill(c, sb_ell(q[0], q[1], 0.6 + rr() * 0.5, 0.45 + rr() * 0.35, 0), C.p1); } c.restore(); }
  c.restore();
  // ── mâchoire inférieure (pivote autour de la commissure), intérieur de la gueule, langue
  const jawA = -0.62 * mouthK, rj = p => { const q = sb_rotAbout(p[0], p[1], sb_TJH[0], sb_TJH[1], jawA); return Th(q[0], q[1]); };
  const jawPts = sb_TJAW.map(rj), jaw = sb_spline(jawPts);
  const headP = sb_spline(sb_THEAD.map(p => Th(p[0], p[1])));
  if (mouthK > 0.04) { const inner = polyPath([Th(24.5, -18.4), Th(42, -18.8), Th(57.5, -18.6), rj([57.5, -18.6]), rj([42, -18.8]), rj([24.5, -18.4])]); sb_fill(c, inner, C.m1); }
  c.strokeStyle = C.p1; c.lineWidth = cw; c.lineJoin = 'round'; c.stroke(jaw);
  part(jaw, SKN, [2.0, 0.9], [2.4, 1.0]);
  c.save(); c.clip(jaw); { const th = sb_spline([rj([26, -10.6]), rj([40, -9.6]), rj([52, -10.8]), rj([54, -2]), rj([36, 3]), rj([22, -2])]); sb_fill(c, th, C.c2); sb_cres(c, jaw, ll, 1.6, C.c3); sb_cres(c, jaw, ll, 1.8, C.o4, true); } c.restore();
  // langue : bande rose qui part du plancher de la gueule, bout collant renflé
  const tg = clamp(sb_fin(o.tongue, 0));
  if (tg > 0.02) {
    const L0 = 66 * tg, pts = [Th(40, -12.8), Th(40 + L0 * 0.34, -14.2), Th(40 + L0 * 0.7, -16 + 3 * tg), Th(40 + L0, -17 + 6 * tg * tg)];
    const tp = sb_seg(pts, [7.2, 6.4, 5.8, 7.4]);
    c.strokeStyle = C.m1; c.lineWidth = cw; c.stroke(tp); part(tp, [C.m2, C.c2, C.c3, C.h3, C.h2], [1.4, 0.7], [1.6, 0.7]);
    const e = pts[3], bulb = sb_ell(e[0] + 1.2, e[1], 4.2, 3.9, 0); c.strokeStyle = C.m1; c.lineWidth = cw; c.stroke(bulb); part(bulb, [C.m2, C.c2, C.c3, C.h3, C.h2], [1.3, 0.6], [1.4, 0.6]);
  }
  // ── tête (dessus du crâne, lèvre supérieure), arcade, bouche, narine
  c.strokeStyle = C.p1; c.lineWidth = cw; c.lineJoin = 'round'; c.stroke(headP);
  part(headP, SKN, [4.6, 2.0], [5.2, 2.3]);
  c.save(); c.clip(headP);
  { const r2 = rng(seed * 53 + 3); for (let i = 0; i < 10; i++) { const q = Th(16 + r2() * 42, -45 + r2() * 20), e = sb_ell(q[0], q[1], 0.9 + r2() * 1.2, 0.7 + r2() * 0.9, r2() * 3); sb_fill(c, e, r2() < 0.4 ? C.o3 : C.p4); sb_cres(c, e, ll, 0.5, C.p5); sb_cres(c, e, ll, 0.6, C.p2, true); }
    const brw = sb_seg([Th(25, -46.5), Th(35, -50), Th(44, -46), Th(52, -39)], [3.6, 4.0, 3.4, 2.2]); part(brw, [C.p4, C.p5, C.p5, C.p3, C.p2], [1.4, 0.6], [1.5, 0.6]);
    const mouthLine = [Th(60, -23.4), Th(52, -19.6), Th(40, -18.6), Th(29, -18.7), Th(23.4, -16.6)];
    sb_stroke(c, mouthLine, Math.max(1.0, minW * 0.9), C.p0); sb_stroke(c, mouthLine.map(p => [p[0], p[1] - 1.1]), Math.max(0.7, minW * 0.6), C.p5);
    const nr = Th(56.4, -31); sb_fill(c, sb_ell(nr[0], nr[1], 1.4, 0.95, -0.5), C.p0); }
  c.restore();
  // ── œil : bossage cutané, globe doré à pupille horizontale, paupière qui se ferme
  const E0 = Th(36.5, -43.6), er = 6.0;
  {
    const bump_ = sb_ell(E0[0], E0[1], er + 1.5, er + 1.1, headRot); c.strokeStyle = C.p1; c.lineWidth = cw; c.stroke(bump_); part(bump_, SKN, [1.8, 0.8], [2.0, 0.9]);
    const open = 1 - lidQ, gy = E0[1] + 0.6, globe = sb_ell(E0[0], gy, er, er * 0.92, 0);
    if (open > 0.12) {
      c.save(); c.clip(globe); sb_fill(c, globe, C.k);
      const iris = sb_ell(E0[0], gy, er - 0.9, (er - 0.9) * 0.92, 0); sb_fill(c, iris, C.a6); sb_cres(c, iris, ll, 1.9, C.a8); sb_cres(c, iris, ll, 0.8, C.a9); sb_cres(c, iris, ll, 1.5, C.a5, true);
      sb_fill(c, sb_ell(E0[0], gy, er * 0.66, Math.max(0.7, 1.6 * (0.3 + 0.7 * open)), 0), C.k);
      const topY = E0[1] - er - 1, lidY = topY + (2 * er + 2) * clamp(lidQ * 0.7), botY = E0[1] + er + 2 - (2 * er + 2) * clamp(lidQ * 0.24);
      c.fillStyle = C.p3; c.beginPath(); c.rect(E0[0] - er - 2, topY - 2, 2 * er + 4, lidY - topY + 2); c.fill(); c.beginPath(); c.rect(E0[0] - er - 2, botY, 2 * er + 4, 12); c.fill();
      c.strokeStyle = C.p1; c.lineWidth = 1.0; c.beginPath(); c.moveTo(E0[0] - er - 1, lidY); c.lineTo(E0[0] + er + 1, lidY - 0.4 * lidQ); c.stroke();
      c.restore();
    } else { sb_fill(c, globe, C.p3); sb_cres(c, globe, ll, 1.4, C.p4); sb_cres(c, globe, ll, 1.5, C.p2, true); }
    c.strokeStyle = C.p0; c.lineWidth = Math.max(0.9, minW * 0.9); c.lineCap = 'round';
    if (lidQ > 0.55) { c.beginPath(); c.moveTo(E0[0] - er + 0.5, gy + 0.9); c.quadraticCurveTo(E0[0], gy + 3.0 - 0.4 * (1 - lidQ) * 3 - 0.3, E0[0] + er - 0.5, gy + 0.2); c.stroke();
      for (let k = 0; k < 3; k++) { c.lineWidth = Math.max(0.7, minW * 0.7); c.beginPath(); c.moveTo(E0[0] - er + 0.6 + k * 0.4, gy - 1.6 - k * 1.5); c.lineTo(E0[0] + er - 1.0 - k * 0.5, gy - 2.8 - k * 1.5 + 1.0); c.stroke(); } }
  }
  hind(sb_TDEF.hipN, false);
  arm(sb_TDEF.shoN, false, wipe);
  // ── passage pixel
  const bx = cx - 90 * s - 10, bx2 = cx + 90 * s + 10;
  const info = sb_finish([Math.min(bx, bx2) - 20, cy + liftY * s - 62 * s - 6, Math.max(bx, bx2) + 20, cy + liftY * s + 8 * s + 12], { Ls, rim: o.rim, rimO: o.rimO ?? SK[4], sil, outline, rimW: s >= 2.4 ? 2 : 1 });
  L.setTransform(1, 0, 0, 1, 0, 0);
  const ES = [Math.round(cx + flip * s * E0[0]), Math.round(cy + (liftY + E0[1] + 0.6) * s)];
  if (!sil && lidQ < 0.5) { const q = Math.max(1, Math.round(er * s * 0.3)); R(ES[0] + Math.round(Ls[0] * er * s * 0.42), ES[1] + Math.round(Ls[1] * er * s * 0.42), q, q, WH[3]); if (s >= 1.8) px(ES[0] - Math.round(Ls[0] * er * s * 0.3), ES[1] - Math.round(Ls[1] * er * s * 0.3), AM[10]); }
  const J = q => [sx(q[0]), cy + (liftY + q[1]) * s];
  return { eye: ES, mouth: J(Th(59, -20)), nose: J(Th(57.5, -29)), head: J(Th(38, -32)), throat: J(Th(38, -8)), mask: info.mask, bbox: info.bbox, tongue: tg > 0.02 ? J(Th(40 + 66 * tg + 1.2, -17 + 6 * tg * tg)) : null };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 4. LE JET PULSÉ ET LA VAPEUR : pixels tramés (tampon) posés sur L
// ════════════════════════════════════════════════════════════════════════════════════════
let sb_BUF = null;
function sb_buf() {
  if (!sb_BUF) { const c = mkCanvas(LW, LH), x = c.getContext('2d', { willReadFrequently: true }), id = x.createImageData(LW, LH); sb_BUF = { c, x, id, d: new Uint32Array(id.data.buffer) }; }
  sb_BUF.d.fill(0); return sb_BUF;
}
function sb_flush(b) { b.x.putImageData(b.id, 0, 0); L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1; L.globalCompositeOperation = 'source-over'; L.drawImage(b.c, 0, 0); }
const sb_u32M = {};
const sb_u32 = c => { const r = sb_rgb(c), k = r.join(','); return sb_u32M[k] ?? (sb_u32M[k] = (0xFF000000 | (r[2] << 16) | (r[1] << 8) | r[0]) >>> 0); };
function sb_pxB(b, x, y, col) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= LW || y >= LH) return; b.d[y * LW + x] = col; }
function sb_rectB(b, x, y, w, h, col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) sb_pxB(b, x + i, y + j, col); }
// disque tramé : densité maximale dens au centre, qui décroît vers le bord ; deux tons (cœur / bord)
function sb_puffB(b, cx, cy, r, dens, core, edge) {
  const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r), cc = sb_u32(core), ce = sb_u32(edge);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (x < 0 || y < 0 || x >= LW || y >= LH) continue;
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, f = Math.sqrt(dx * dx + dy * dy) / r; if (f >= 1) continue;
    const dd = dens * (1 - f * f); if (sb_bay(x, y) < dd) b.d[y * LW + x] = f < 0.5 ? cc : ce;
  }
}
// étincelle en croix (éclat à la buse)
function sb_starB(b, x, y, r, col, col2) { for (let k = -r; k <= r; k++) { sb_pxB(b, x + k, y, col); sb_pxB(b, x, y + k, col); } for (let k = -Math.floor(r / 2); k <= Math.floor(r / 2); k++) { sb_pxB(b, x + k, y + k, col2); sb_pxB(b, x + k, y - k, col2); } sb_pxB(b, x, y, WH[3]); }

// segment épais dans le tampon
function sb_lineB(b, x0, y0, x1, y1, w, col) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))), o = Math.floor(w / 2);
  for (let k = 0; k <= n; k++) { const f = k / n, x = Math.round(x0 + (x1 - x0) * f), y = Math.round(y0 + (y1 - y0) * f); for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) sb_pxB(b, x - o + i, y - o + j, col); }
}
// jet pulsé : bouffées émises à la cadence o.hz depuis t0 pendant o.dur ; chaque bouffée = capsule de liquide brûlant (blanc-jaune au cœur, ambre aux bords) qui file en ralentissant,
// gouttelettes qui s'en détachent et nuage de vapeur qui grossit ; un éclat à la buse à chaque bouffée
function sb_jet(x, y, ang, t, t0, o = {}) {
  o = o || {};
  const dur = o.dur ?? 1.6, len = o.len ?? 120, hz = o.hz ?? 14, size = o.size ?? 1, steam = o.steam ?? 1, g = o.gravity ?? 60, seed = o.seed ?? 1, life = o.life ?? 0.6, spread = o.spread ?? 0.16;
  const age0 = t - t0; if (age0 < 0 || age0 > dur + life) return;
  const b = sb_buf(), ca = Math.cos(ang), sa = Math.sin(ang), v = len / 0.3;
  const cH = sb_u32(YE[3]), cW = sb_u32(WH[3]), cA = sb_u32(AM[8]), cO = sb_u32(AM[7]), cC = sb_u32(CY[4]), cK = sb_u32(RD[3]);
  const n = Math.floor(Math.min(age0, dur) * hz) + 1;
  const posAt = (k, a, an, sp) => { const dd = v * sp * (1 - Math.exp(-a * 4.6)) / 4.6; return [x + Math.cos(an) * dd, y + Math.sin(an) * dd + 0.5 * g * a * a]; };
  const k0 = Math.max(0, n - Math.ceil(life * hz) - 2);
  // vapeur d'abord (derrière), puis liquide
  for (let k = k0; k < n; k++) {
    const te = t0 + k / hz; if (te > t0 + dur) break;
    const a = t - te; if (a < 0 || a > life) continue;
    const f = a / life;
    if (steam > 0) {
      const q = posAt(k, a, ang, 0.74), r = (3.2 + 17 * Math.pow(f, 0.6)) * size * steam;
      sb_puffB(b, q[0] + (sb_h(k, seed + 1) - 0.5) * 7 * size, q[1] - 24 * a * a - 6 * f * size, r, 0.95 * Math.pow(1 - f, 0.9), WH[3], f > 0.5 ? NE[3] : WH[2]);
    }
  }
  for (let k = k0; k < n; k++) {
    const te = t0 + k / hz; if (te > t0 + dur) break;
    const a = t - te; if (a < 0 || a > life) continue;
    const f = a / life, rs = sb_h(k, seed + 2) - 0.5, an = ang + rs * spread * 0.6;
    // capsule : tête et queue de la bouffée
    if (f < 0.7) {
      const q1 = posAt(k, a, an, 1), q0 = posAt(k, Math.max(0, a - 0.034), an, 1), w = Math.max(2, Math.round((4.2 - 3 * f) * size));
      sb_lineB(b, q0[0], q0[1], q1[0], q1[1], w + 2, f < 0.25 ? cA : cO);
      sb_lineB(b, q0[0], q0[1], q1[0], q1[1], w, f < 0.35 ? cH : cW);
      if (w >= 3) sb_lineB(b, q0[0], q0[1], q1[0], q1[1], Math.max(1, w - 2), cW);
    }
    // gouttelettes : six par bouffée, balistiques, petites comètes (tête claire, queue ambre)
    for (let q = 0; q < 6; q++) {
      const ra = (sb_h(k * 9 + q, seed + 3) - 0.5) * 2 * spread * (0.5 + f * 1.6), sp = 0.55 + sb_h(k * 9 + q, seed + 5) * 0.55, an2 = ang + ra;
      for (let tail = 0; tail < 3; tail++) {
        const aa = Math.max(0, a - 0.02 - tail * 0.016), pp = posAt(k, aa, an2, sp), col = tail === 0 ? (f < 0.5 ? cH : cW) : tail === 1 ? cA : cO;
        if (f > 0.8 && tail > 0) continue;
        if (size >= 1.2 && tail === 0) sb_rectB(b, pp[0] - 1, pp[1] - 1, 2, 2, col); else sb_pxB(b, pp[0], pp[1], col);
      }
    }
  }
  // éclat à la buse à chaque nouvelle bouffée (très bref : l'image « pulse »)
  const kk = Math.floor(Math.min(age0, dur) * hz), ph = age0 - kk / hz;
  if (age0 <= dur && ph < 0.06) { sb_puffB(b, x + ca * 3, y + sa * 3, 6 * size, 1, WH[3], YE[3]); sb_starB(b, Math.round(x + ca * 3), Math.round(y + sa * 3), Math.round(7 * size), cH, cC); }
  sb_flush(b);
}
// colonne de vapeur qui monte (thermomètre, abdomen, peau qui fume)
function sb_steam(x, y, t, o = {}) {
  o = o || {}; const n = o.n ?? 6, w = o.w ?? 6, hgt = o.h ?? 44, a = o.a ?? 0.8, seed = o.seed ?? 2, per = o.period ?? 1.7;
  const b = sb_buf();
  for (let k = 0; k < n; k++) {
    const f = (((t / per + k / n + sb_h(k, seed) * 0.2) % 1) + 1) % 1, yy = y - f * hgt, xx = x + Math.sin(f * 5 + k * 1.9 + t * 1.2) * w * (0.4 + f) + (sb_h(k, seed + 7) - 0.5) * w;
    const r = (2.4 + 9 * f) * (o.size ?? 1);
    sb_puffB(b, xx, yy, r, a * Math.min(1, f * 5) * (1 - f) * 1.15, WH[3], f > 0.5 ? NE[3] : WH[2]);
  }
  sb_flush(b);
}
// éclaboussure d'impact du jet sur une peau : gouttes brûlantes + vapeur ; née à t0, dure ≈ 0,8 s ; dir = direction moyenne des gouttes (rad)
function sb_splashHit(x, y, t, t0, o = {}) {
  o = o || {}; const a = t - t0, life = 0.8; if (a < 0 || a > life) return;
  const f = a / life, b = sb_buf(), dir = o.dir ?? -Math.PI / 2, size = o.size ?? 1, n = o.n ?? 12, seed = o.seed ?? 4, g = 150;
  for (let k = 0; k < n; k++) {
    const an = dir + (sb_h(k, seed) - 0.5) * 2.4, sp = (50 + sb_h(k, seed + 1) * 90) * size, px_ = x + Math.cos(an) * sp * a, py_ = y + Math.sin(an) * sp * a + 0.5 * g * a * a;
    const col = f < 0.4 ? sb_u32(YE[3]) : f < 0.7 ? sb_u32(AM[8]) : sb_u32(WH[2]);
    sb_pxB(b, px_, py_, col); if (f < 0.6) sb_pxB(b, px_ - Math.cos(an) * 1.5, py_ - Math.sin(an) * 1.5, sb_u32(AM[7]));
    if (size >= 1.3 && f < 0.5) sb_pxB(b, px_ + 1, py_, col);
  }
  for (let k = 0; k < 3; k++) { const ff = clamp((a - k * 0.06) / 0.6); if (ff <= 0) continue; sb_puffB(b, x + (sb_h(k, seed + 9) - 0.5) * 12 * size, y - 10 * ff * size - k * 3, (4 + 11 * ff) * size, 0.8 * (1 - ff), WH[3], WH[2]); }
  if (a < 0.1) sb_starB(b, Math.round(x), Math.round(y), Math.round(6 * size * (1 - a / 0.1) + 2), YE[3], WH[2]);
  sb_flush(b);
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 5. LE THERMOMÈTRE (dans ui : pixels nets) — tube de verre, liquide rouge, graduations ; option : bécher d'eau qui bout (bulles, vapeur)
// ════════════════════════════════════════════════════════════════════════════════════════
function sb_thermo(x, y, h, v, t, o = {}) {
  o = o || {}; v = clamp(sb_fin(v, 0));
  const K = '#05040f', cx = Math.round(x + 14), yTop = Math.round(y + 8), bcy = Math.round(y + h - 9), yBot = bcy - 9;
  const level = Math.round(yBot - (yBot - yTop) * v), hot = o.hot ?? sm(prog(v, 0.8, 1));
  // ── bécher : paroi arrière, eau, bulles (le tube passe devant)
  const fl = !!o.flask, bx0 = cx - 17, bx1 = cx + 21, by0 = bcy - 24, by1 = bcy + 11, wy = by0 + 9;
  if (fl) {
    R(bx0 - 1, by0 - 1, bx1 - bx0 + 3, by1 - by0 + 3, K); R(bx0, by0, bx1 - bx0 + 1, by1 - by0 + 1, NI[2]);
    R(bx0 + 1, wy, bx1 - bx0 - 1, by1 - wy, CY[1]);
    for (let i = bx0 + 1; i < bx1; i++) { const wv = Math.round(Math.sin(i * 0.9 + t * 7) * 0.9 + 0.2); R(i, wy + (wv > 0 ? 0 : -1), 1, 1, CY[4]); if (wv > 0) px(i, wy + 1, CY[3]); }
    R(bx0 + 1, wy + 2, 1, by1 - wy - 3, CY[2]); R(bx1 - 1, wy + 2, 1, by1 - wy - 3, CY[0]);
    const nb = o.bubbles ?? 9 * hot;
    for (let k = 0; k < 11; k++) { if (k >= nb) break; const ph = (((t * (1.1 + sb_h(k, 3) * 0.6) + sb_h(k, 5)) % 1) + 1) % 1, bxp = bx0 + 3 + Math.floor(sb_h(k, 7) * (bx1 - bx0 - 6)), byp = Math.round(by1 - 3 - ph * (by1 - wy - 3));
      if (Math.abs(bxp - cx) < 6) continue; const r = sb_h(k, 11) < 0.4 ? 2 : 1;
      if (r === 2) { px(bxp - 1, byp, CY[4]); px(bxp + 1, byp, CY[4]); px(bxp, byp - 1, CY[4]); px(bxp, byp + 1, CY[4]); px(bxp - 1, byp - 1, WH[3]); } else { px(bxp, byp, WH[3]); px(bxp + 1, byp, CY[4]); }
      if (ph > 0.9) { px(bxp - 2, wy - 2, WH[2]); px(bxp + 2, wy - 3, WH[2]); px(bxp, wy - 3, CY[4]); } }
  }
  // ── tube
  R(cx - 5, yTop - 1, 11, bcy - yTop, K); disc(cx, bcy, 9, K);
  R(cx - 4, yTop, 9, bcy - yTop, NI[3]); disc(cx, bcy, 8, NI[3]);
  px(cx - 4, yTop, K); px(cx + 4, yTop, K);
  R(cx - 3, yTop + 2, 1, Math.max(0, yBot - yTop - 4), ST[6]); R(cx + 3, yTop + 3, 1, Math.max(0, yBot - yTop - 6), NI[5]);
  // liquide
  const liq = hot > 0.7 ? RD[4] : RD[3];
  R(cx - 1, level, 3, bcy - level, liq); R(cx - 1, level, 1, bcy - level, RD[5]); R(cx + 1, level, 1, bcy - level, RD[2]); R(cx - 1, level - 1, 3, 1, RD[5]);
  disc(cx, bcy, 6, RD[2]); disc(cx, bcy, 5, liq); px(cx - 2, bcy - 2, RD[5]); px(cx - 2, bcy - 1, RD[5]); px(cx - 1, bcy - 3, WH[2]);
  // graduations (à droite) : un trait court tous les 10 °C, un long avec le nombre tous les 20 °C
  for (let T = 20; T <= 100; T += 10) {
    const yy = Math.round(yBot - (yBot - yTop) * (T - 20) / 80); if (fl && yy > by0 - 3) continue;
    const major = T % 20 === 0, lit = level <= yy + 1, col = lit ? (T === 100 && hot > 0.8 ? YE[3] : WH[2]) : ST[5];
    R(cx + 6, yy, major ? 6 : 3, 1, col);
    if (major && T !== 20) ptext(String(T), cx + 14, yy - 3, T === 100 ? (hot > 0.5 ? YE[3] : AM[8]) : ST[7], 1, K);
  }
  if (o.label != null) ptextC(String(o.label), cx + 6, y - 9, hot > 0.8 ? YE[3] : WH[3], 1, K);
  // vapeur au-dessus du bécher / du tube quand ça bout
  if (hot > 0.55) for (let k = 0; k < 14; k++) {
    const f = (((t * 0.8 + k / 14) % 1) + 1) % 1, sxp = (fl ? cx + 2 : cx) + Math.round(Math.sin(f * 6 + k * 2.1) * (3 + 7 * f) + (sb_h(k, 3) - 0.5) * 10), syp = Math.round((fl ? by0 - 4 : yTop - 4) - f * (fl ? 44 : 34));
    const a = (1 - f) * hot; if (sb_bay(sxp + k, syp) < a * 1.25) { px(sxp, syp, f < 0.4 ? WH[3] : WH[2]); if (f < 0.6 && sb_h(k, 9) < 0.7) { px(sxp + 1, syp, NE[3]); px(sxp, syp + 1, NE[3]); } }
  }
  if (fl) { R(bx0 - 2, by0 - 1, 3, 1, ST[6]); R(bx1 - 1, by0 - 1, 3, 1, ST[6]); R(bx0 + 1, by0 + 2, 1, 6, WH[2]); R(bx0 + 1, wy + 6, 1, 7, WH[1]); }
  return { top: yTop, bulb: [cx, bcy], x: cx, level, box: [bx0, by0, bx1, by1], w: fl ? (bx1 - bx0 + 3) : 40 };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 6. LA COUPE DE L'ABDOMEN (planche du carnet, fond nuit) : deux réservoirs → deux conduits → chambre de réaction (enzymes) → conduit de sortie → buse
// ════════════════════════════════════════════════════════════════════════════════════════
// calque Y → palette entière du moteur (tons exacts, léger tramage), puis posé sur L
function sb_snapPal(amp = 8) {
  const id = Y.getImageData(0, 0, LW, LH), d = id.data;
  for (let y = 0, p = 0; y < LH; y++) for (let x = 0; x < LW; x++, p++) {
    const i = p * 4; if (d[i + 3] < 128) { d[i + 3] = 0; continue; }
    const of = (sb_bay(x, y) - 0.5) * amp, q = PAL[LUT[((clamp(d[i] + of, 0, 255) >> 3) << 10) | ((clamp(d[i + 1] + of, 0, 255) >> 3) << 5) | (clamp(d[i + 2] + of, 0, 255) >> 3)]];
    d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2]; d[i + 3] = 255;
  }
  Y.putImageData(id, 0, 0); L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(lay, 0, 0);
}
const sb_CUT = { cham: [135, 214, 46, 40], pA: [78, 104, 37, 27], pB: [192, 104, 37, 27], nozzle: [135, 306], top: 50 };
const sb_SHELL = [[135, 50], [190, 54], [232, 72], [252, 104], [250, 140], [232, 172], [214, 204], [190, 238], [168, 268], [152, 292], [146, 308], [124, 308], [118, 292], [102, 268], [80, 238], [56, 204], [38, 172], [20, 140], [18, 104], [38, 72], [80, 54]];
const sb_DUCTA = [[78, 128], [82, 148], [100, 162], [118, 174]], sb_DUCTB = [[192, 128], [188, 148], [170, 162], [152, 174]];
function sb_pathLen(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; }
function sb_pathAt(pts, u) { const tot = sb_pathLen(pts); let d = clamp(u) * tot; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d <= l || i === pts.length - 1) { const f = l ? clamp(d / l) : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; } d -= l; } return pts[pts.length - 1]; }
// p : { fill 0..1 niveau des réservoirs, flow 0..1 avancée des liquides dans les conduits (>1 : ils sont arrivés), mix 0..1 chambre remplie et mélangée, enz 0..1 enzymes actives,
//       heat 0..1 température, flash 0..1 éclair, boom 0..1 progression de l'étoile (0 : absente), boomFade 0..1, jet 0..1 pulsations à la buse, hl 'A'|'B'|'both'|null (réservoir mis en valeur) }
// o : { zoom, fx, fy (point du monde au centre), cx, cy (centre écran), shake (px) } ; renvoie les positions ÉCRAN { cham, pA, pB, nozzle, z }
function sb_cutaway(t, p, o = {}) {
  p = p || {}; o = o || {};
  const z = o.zoom ?? 1, fx = o.fx ?? 135, fy = o.fy ?? 184, scx = (o.cx ?? 135) + (o.shake ? (sb_h(Math.round(t * 30), 31) - 0.5) * 2 * o.shake : 0), scy = (o.cy ?? 196) + (o.shake ? (sb_h(Math.round(t * 30), 32) - 0.5) * 2 * o.shake : 0);
  const W = (x, y) => [scx + (x - fx) * z, scy + (y - fy) * z];
  const fill = clamp(sb_fin(p.fill, 0.85)), flow = sb_fin(p.flow, 0), mix = clamp(sb_fin(p.mix, 0)), enz = clamp(sb_fin(p.enz, 0)), heat = clamp(sb_fin(p.heat, 0)), flash = clamp(sb_fin(p.flash, 0));
  const [chx, chy, crx, cry] = sb_CUT.cham;
  // ── fond de planche : nuit, quadrillage fin qui suit la caméra, coins de page
  vgrad(0, 0, LW, LH, [[0, NI[0]], [0.55, NI[1]], [1, NI[2]]]);
  { const g = 12 * z, ox = ((scx - fx * z) % g + g) % g, oy = ((scy - fy * z) % g + g) % g; L.save(); L.fillStyle = 'rgba(88,120,204,0.16)';
    for (let x = ox; x < LW; x += g) L.fillRect(Math.round(x), 0, 1, LH); for (let y = oy; y < LH; y += g) L.fillRect(0, Math.round(y), LW, 1); L.restore(); }
  // ── PASSE 1 : corps, réservoirs, conduits, chambre
  layerBegin(); const c = Y; c.setTransform(z, 0, 0, z, scx - fx * z, scy - fy * z);
  const shell = sb_spline(sb_SHELL);
  c.fillStyle = DU[0]; c.fill(shell);
  { const r = rng(7); c.save(); c.clip(shell); for (let i = 0; i < 26; i++) { const x = 30 + r() * 210, y = 60 + r() * 230; c.globalAlpha = 0.55; sb_fill(c, sb_ell(x, y, 5 + r() * 9, 3 + r() * 6, r() * 3), DU[1]); } c.globalAlpha = 1;
    for (let i = 0; i < 14; i++) { const x = 40 + r() * 190, y = 70 + r() * 220; c.strokeStyle = DU[2]; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 22, y + (r() - 0.5) * 22); c.stroke(); } c.restore(); }
  // paroi (cuticule orange) : trois traits superposés
  c.lineJoin = 'round'; c.strokeStyle = '#05040f'; c.lineWidth = 12; c.stroke(shell); c.strokeStyle = OC[1]; c.lineWidth = 10; c.stroke(shell); c.strokeStyle = OC[3]; c.lineWidth = 7; c.stroke(shell);
  c.save(); c.translate(-1, -1); c.strokeStyle = OC[5]; c.lineWidth = 1.6; c.stroke(shell); c.restore();
  // élytres : calotte bleu-noir qui coiffe le haut
  { const cap = sb_spline([[28, 82], [60, 58], [135, 48], [210, 58], [242, 82]], false); c.strokeStyle = '#05040f'; c.lineWidth = 15; c.lineCap = 'round'; c.stroke(cap); c.strokeStyle = NI[5]; c.lineWidth = 12; c.stroke(cap);
    c.strokeStyle = BL[2]; c.lineWidth = 7; c.stroke(cap); const hl = sb_spline([[44, 70], [80, 55], [135, 50]], false); c.strokeStyle = BL[4]; c.lineWidth = 2.2; c.stroke(hl); c.lineCap = 'butt'; }
  // réservoirs : poches de verre, liquide qui ondule, bulles, reflet
  const pouch = (pc, col, hi, dk, hl, seed, label) => {
    const [px_, py_, rx, ry] = pc, el = sb_ell(px_, py_, rx, ry, 0), top = py_ + ry - 2 * ry * fill;
    c.fillStyle = NI[1]; c.fill(el);
    c.save(); c.clip(el);
    c.fillStyle = col; c.beginPath(); c.moveTo(px_ - rx - 2, top);
    for (let x = -rx - 2; x <= rx + 2; x += 3) c.lineTo(px_ + x, top + Math.sin(x * 0.28 + t * 3 + seed) * 1.6);
    c.lineTo(px_ + rx + 2, py_ + ry + 3); c.lineTo(px_ - rx - 2, py_ + ry + 3); c.closePath(); c.fill();
    sb_cres(c, el, [0.0, -1.0], 5, hi); sb_cres(c, el, [0, -1], 6, dk, true);
    c.strokeStyle = hi; c.lineWidth = 1.3; c.beginPath(); for (let x = -rx; x <= rx; x += 3) { const yy = top + Math.sin(x * 0.28 + t * 3 + seed) * 1.6; if (x === -rx) c.moveTo(px_ + x, yy); else c.lineTo(px_ + x, yy); } c.stroke();
    for (let k = 0; k < 7; k++) { const ph = (((t * (0.22 + sb_h(k, seed) * 0.2) + sb_h(k, seed + 2)) % 1) + 1) % 1, bx = px_ - rx * 0.7 + sb_h(k, seed + 3) * rx * 1.4, by = py_ + ry - ph * (py_ + ry - top - 2), r_ = 1.1 + sb_h(k, seed + 4) * 1.6;
      if (by < top + 1.5) continue; c.strokeStyle = hl; c.lineWidth = 0.9; c.beginPath(); c.arc(bx, by, r_, 0, TAU); c.stroke(); }
    c.restore();
    const lit = (p.hl === 'both' || p.hl === label) ? 1 : 0;
    c.strokeStyle = '#05040f'; c.lineWidth = 5; c.stroke(el); c.strokeStyle = lit ? WH[3] : ST[6]; c.lineWidth = 3; c.stroke(el);
    c.strokeStyle = WH[3]; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.ellipse(px_, py_, rx - 5, ry - 5, 0, Math.PI * 1.08, Math.PI * 1.42); c.stroke(); c.lineCap = 'butt';
  };
  pouch(sb_CUT.pA, AM[7], AM[8], AM[5], AM[10], 1, 'A');
  pouch(sb_CUT.pB, CY[2], CY[3], CY[0], WH[3], 4, 'B');
  // conduits de verre ; liquide qui avance (trait en pointillés), gouttes qui coulent, vanne
  const duct = (pts, col, hi) => {
    const cv = sb_curve(pts, 6), sp = sb_spline(pts, false), L0 = sb_pathLen(cv);
    c.lineCap = 'butt'; c.lineJoin = 'round';
    c.strokeStyle = '#05040f'; c.lineWidth = 11; c.stroke(sp); c.strokeStyle = ST[6]; c.lineWidth = 9; c.stroke(sp); c.strokeStyle = NI[1]; c.lineWidth = 6.4; c.stroke(sp);
    const fl_ = clamp(flow);
    if (fl_ > 0.01) { c.save(); c.setLineDash([L0 * fl_, 9999]); c.strokeStyle = col; c.lineWidth = 6.4; c.stroke(sp); c.strokeStyle = hi; c.lineWidth = 1.6; c.save(); c.translate(-1, -1); c.stroke(sp); c.restore(); c.restore();
      for (let k = 0; k < 4; k++) { const u = ((t * 0.9 + k / 4) % 1) * fl_, q = sb_pathAt(cv, u); sb_fill(c, sb_ell(q[0], q[1], 2.1, 2.1, 0), hi); } }
    const v = sb_pathAt(cv, 0.38), v2 = sb_pathAt(cv, 0.42), an = Math.atan2(v2[1] - v[1], v2[0] - v[0]);
    c.save(); c.translate(v[0], v[1]); c.rotate(an + Math.PI / 2); c.fillStyle = '#05040f'; c.fillRect(-8, -3.2, 16, 6.4); c.fillStyle = ST[4]; c.fillRect(-7, -2.2, 14, 4.4); c.fillStyle = ST[7]; c.fillRect(-7, -2.2, 14, 1.2); c.fillStyle = GR[4]; c.fillRect(-1.6, -4.4, 3.2, 8.8); c.restore();
  };
  duct(sb_DUCTA, AM[7], AM[9]); duct(sb_DUCTB, CY[2], WH[3]);
  // conduit de sortie et buse (cuticule orange)
  { const ex = sb_spline([[135, 252], [135, 276], [135, 296]], false); c.lineCap = 'butt'; c.strokeStyle = '#05040f'; c.lineWidth = 15; c.stroke(ex); c.strokeStyle = OC[3]; c.lineWidth = 12; c.stroke(ex); c.strokeStyle = OC[5]; c.lineWidth = 2; c.save(); c.translate(-3.5, 0); c.stroke(ex); c.restore(); c.strokeStyle = NI[0]; c.lineWidth = 5.4; c.stroke(ex);
    if (p.jet > 0 || heat > 0.2) { c.strokeStyle = heat > 0.7 ? AM[8] : AM[5]; c.lineWidth = 3; c.globalAlpha = clamp(heat * 1.2); c.stroke(ex); c.globalAlpha = 1; }
    c.fillStyle = '#05040f'; c.beginPath(); c.moveTo(121, 290); c.lineTo(149, 290); c.lineTo(153, 309); c.lineTo(117, 309); c.closePath(); c.fill(); c.fillStyle = OC[3]; c.beginPath(); c.moveTo(123, 291); c.lineTo(147, 291); c.lineTo(150.5, 307.5); c.lineTo(119.5, 307.5); c.closePath(); c.fill(); c.fillStyle = OC[5]; c.fillRect(123, 291, 3, 16); c.fillStyle = NI[0]; c.fillRect(131, 298, 8, 10);
    c.strokeStyle = OC[1]; c.lineWidth = 1.2; for (const yy of [296, 302]) { c.beginPath(); c.moveTo(121, yy); c.lineTo(149, yy); c.stroke(); } }
  // chambre de réaction : paroi épaisse à reflet, contenu qui se mélange, enzymes autour
  const cham = sb_ell(chx, chy, crx, cry, 0);
  c.fillStyle = NI[1]; c.fill(cham);
  c.save(); c.clip(cham);
  if (mix > 0.02) {
    const top = chy + cry - 2 * cry * clamp(mix * 1.15), hh = clamp(heat);
    c.fillStyle = AM[6]; c.beginPath(); c.rect(chx - crx, top, crx, 2 * cry); c.fill(); c.fillStyle = CY[1]; c.beginPath(); c.rect(chx, top, crx, 2 * cry); c.fill();
    // mélange : tourbillon de deux couleurs qui tournent (un seul disque si le mélange est total)
    const sw = clamp(mix * 1.4 - 0.3);
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + t * (1.4 + 3 * hh) * (k % 2 ? 1 : -1) * 0.6, rr = (0.2 + 0.7 * ((k * 0.37) % 1)) * crx * 0.9, x = chx + Math.cos(a) * rr, y = chy + Math.sin(a) * rr * 0.85;
      if (y < top) continue; c.globalAlpha = 0.85 * sw; sb_fill(c, sb_ell(x, y, 6 + (k % 3) * 2, 3.2 + (k % 2) * 1.6, a), k % 2 ? AM[8] : CY[3]); }
    c.globalAlpha = 1;
    // la chaleur vire le liquide à l'orange puis au blanc-jaune
    if (hh > 0.2) { c.globalAlpha = sm(prog(hh, 0.2, 1)) * 0.92; c.fillStyle = hh > 0.8 ? YE[3] : hh > 0.5 ? AM[8] : hh > 0.25 ? RD[3] : RD[2]; c.beginPath(); c.rect(chx - crx, top, 2 * crx, 2 * cry); c.fill(); c.globalAlpha = 1; }
    // bulles
    const nb = Math.round(5 + 22 * sw * (0.4 + hh)); for (let k = 0; k < nb; k++) { const ph = (((t * (0.5 + sb_h(k, 3) * 0.7) + sb_h(k, 5)) % 1) + 1) % 1, bx = chx - crx * 0.8 + sb_h(k, 7) * crx * 1.6, by = chy + cry - ph * (chy + cry - top), r_ = 1.0 + sb_h(k, 9) * 2.2; if (by < top) continue;
      c.strokeStyle = WH[3]; c.lineWidth = 0.9; c.beginPath(); c.arc(bx, by, r_, 0, TAU); c.stroke(); }
  }
  sb_cres(c, cham, [0, -1], 6, 'rgba(255,255,255,0.18)'); c.restore();
  // enzymes : « pacmans » verts qui bâillent (bouche tournée vers le centre) le long de la paroi interne
  { const n = 12; for (let k = 0; k < n; k++) { const a = k / n * TAU + 0.26, ex = chx + Math.cos(a) * (crx - 8.5), ey = chy + Math.sin(a) * (cry - 8.5), pulse = 0.5 + 0.5 * Math.sin(t * 8 + k * 1.3), r_ = 4.3 + enz * 1.6 * pulse, mo = 0.35 + enz * 0.55 * pulse, ang = Math.atan2(chy - ey, chx - ex);
      c.save(); c.translate(ex, ey); c.rotate(ang); c.fillStyle = '#05040f'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r_ + 1.2, mo, TAU - mo); c.closePath(); c.fill();
      c.fillStyle = enz > 0.3 && pulse > 0.6 ? LM[6] : LM[4]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r_, mo, TAU - mo); c.closePath(); c.fill(); c.fillStyle = LM[5]; c.beginPath(); c.arc(-r_ * 0.35, -r_ * 0.35, r_ * 0.28, 0, TAU); c.fill(); c.restore(); } }
  c.strokeStyle = '#05040f'; c.lineWidth = 8.4; c.stroke(cham); c.strokeStyle = ST[5]; c.lineWidth = 6.4; c.stroke(cham);
  c.strokeStyle = heat > 0.55 ? AM[8] : ST[7]; c.lineWidth = 2; c.stroke(sb_ell(chx, chy, crx + 0.2, cry + 0.2, 0));
  c.strokeStyle = WH[3]; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.ellipse(chx, chy, crx - 2, cry - 2, 0, Math.PI * 1.1, Math.PI * 1.45); c.stroke(); c.lineCap = 'butt';
  sb_snapPal(8);
  // ── lueur de la réaction (additive, avant les éclats) : la chambre rougeoie puis blanchit
  { const [gx, gy] = W(chx, chy), hh = clamp(heat), a = 0.55 * hh + 0.9 * flash;
    if (a > 0.02) { rgrad(gx, gy, 4, 120 * z * 0.8 + 30, [[0, flash > 0.3 ? 'rgba(255,255,230,1)' : 'rgba(255,214,120,1)'], [0.35, 'rgba(255,128,48,0.8)'], [1, 'rgba(255,60,40,0)']], Math.min(1, a), 'lighter'); } }
  // ── PASSE 2 : éclair, étoile de la réaction, étincelles
  layerBegin(); c.setTransform(z, 0, 0, z, scx - fx * z, scy - fy * z);
  if (flash > 0.02) {
    const fr = Math.round(t * 30), bolt = []; const x0 = chx - 14 + sb_h(fr, 5) * 6, y0 = chy - cry + 6;
    for (let k = 0; k <= 8; k++) { const f = k / 8; bolt.push([lerp(x0, chx + 14, f) + (k % 2 ? 1 : -1) * (6 + 6 * sb_h(fr * 9 + k, 6)) * (k === 0 || k === 8 ? 0 : 1), lerp(y0, chy + cry - 6, f)]); }
    c.lineJoin = 'miter'; c.lineCap = 'round';
    for (const [w, col] of [[9 * flash + 2, CY[2]], [6 * flash + 1.5, CY[4]], [3 * flash + 1, YE[3]], [1.4, WH[3]]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); bolt.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke(); }
    for (let k = 0; k < 3; k++) { const b0 = bolt[2 + k * 2], an = (sb_h(fr + k, 8) - 0.5) * 3 + (k % 2 ? 0.9 : -0.9) + Math.PI / 2; c.strokeStyle = CY[4]; c.lineWidth = 1.6; c.beginPath(); c.moveTo(b0[0], b0[1]); c.lineTo(b0[0] + Math.cos(an) * 14, b0[1] + Math.sin(an) * 14); c.lineTo(b0[0] + Math.cos(an + 0.5) * 24, b0[1] + Math.sin(an + 0.5) * 24); c.stroke(); }
  }
  const boom = clamp(sb_fin(p.boom, 0)), bf = clamp(sb_fin(p.boomFade, 0));
  if (boom > 0.01 && bf < 0.99) {
    const grow = eob(clamp(boom * 1.4)), R0 = (30 + 62 * grow), fr = Math.round(t * 30), nsp = 14;
    const star = (R, k2, rot) => { const pts = []; for (let k = 0; k < nsp * 2; k++) { const a = rot + k * Math.PI / nsp, rr = (k % 2 ? R * k2 * (0.85 + 0.3 * sb_h(k + fr, 2)) : R * (0.8 + 0.4 * sb_h(k * 3 + 1, 7))); pts.push([chx + Math.cos(a) * rr, chy + Math.sin(a) * rr]); } return polyPath(pts); };
    c.globalAlpha = 1 - bf;
    for (const [rf, k2, col] of [[1.0, 0.5, RD[2]], [0.88, 0.5, RD[4]], [0.7, 0.52, AM[7]], [0.5, 0.55, YE[2]], [0.3, 0.6, WH[3]]]) { c.fillStyle = col; c.fill(star(R0 * rf, k2, 0.12 + t * 0.4 * (rf < 0.5 ? -1 : 1) * 0)); }
    c.strokeStyle = '#05040f'; c.lineWidth = 1.2; c.stroke(star(R0, 0.5, 0.12));
    // anneau de choc et étincelles
    c.strokeStyle = WH[2]; c.lineWidth = 2.2; c.beginPath(); c.arc(chx, chy, R0 * (1.2 + 0.5 * boom), 0, TAU); c.stroke();
    for (let k = 0; k < 18; k++) { const a = k / 18 * TAU + sb_h(k, 4), d0 = R0 * 1.05, d1 = R0 * (1.25 + 0.7 * boom + sb_h(k, 6) * 0.4); c.strokeStyle = k % 3 ? YE[3] : WH[3]; c.lineWidth = 1.6; c.beginPath(); c.moveTo(chx + Math.cos(a) * d0, chy + Math.sin(a) * d0); c.lineTo(chx + Math.cos(a) * d1, chy + Math.sin(a) * d1); c.stroke(); }
    c.globalAlpha = 1;
  }
  sb_snapPal(4);
  // jet à la buse
  if (p.jet > 0) { const [nx, ny] = W(sb_CUT.nozzle[0], sb_CUT.nozzle[1] + 2); sb_jet(nx, ny, Math.PI / 2, t, t - ((t * 14) % 1) / 14 - Math.floor(1) * 0, { dur: 99, len: 70 * z, hz: 14, size: 0.9 * z, gravity: 20 }); }
  return { cham: W(chx, chy).concat([crx * z, cry * z]), pA: W(sb_CUT.pA[0], sb_CUT.pA[1]).concat([sb_CUT.pA[2] * z, sb_CUT.pA[3] * z]), pB: W(sb_CUT.pB[0], sb_CUT.pB[1]).concat([sb_CUT.pB[2] * z, sb_CUT.pB[3] * z]), nozzle: W(sb_CUT.nozzle[0], sb_CUT.nozzle[1]), z, W };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 7. ICÔNE DU CARNET (17 × 17, couleurs exactes) : le scarabée vu de dessus, tête en haut
// ════════════════════════════════════════════════════════════════════════════════════════
const sb_ICON = [
  '...a.........a...',
  '....a.......a....',
  '.....aoooooa.....',
  '.O....oOOLo....O.',
  '.O...ooooooo...O.',
  '..O..oOOLLLo..O..',
  '...OoOOOLLLLoO...',
  '....oDOOOLLLo....',
  '...ooooooooooo...',
  '.OOonbbbdBHhHoOO.',
  'O.onnbbbdBHhHHo.O',
  '..onnbbbdBHhHHo..',
  '..onnbbbdBHhHHo..',
  '.O.onnnbdbBHBo.O.',
  'O..OonnbdbBHoO..O',
  '..O.ooooooooo.O..',
  '..O...oAAAo...O..',
];
function sb_icon(cx, cy) {
  const pal = { o: '#05040f', a: OC[3], O: OC[4], L: OC[5], D: OC[2], A: AM[7], b: NI[5], B: BL[2], h: BL[4], H: BL[3], n: NI[4], d: NI[2] };
  const x0 = Math.round(cx) - 8, y0 = Math.round(cy) - 8;
  for (let j = 0; j < 17; j++) for (let i = 0; i < 17; i++) { const ch = sb_ICON[j][i]; if (ch !== '.') px(x0 + i, y0 + j, pal[ch]); }
}
ICONES[0] = sb_icon;
