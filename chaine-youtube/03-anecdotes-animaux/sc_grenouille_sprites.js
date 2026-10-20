'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_grenouille_sprites.js — la GRENOUILLE DES BOIS (Lithobates sylvaticus) et ses vues internes (préfixe gr_ ; aucun nom global sans gr_)
   Tout se dessine sur L (270 × 480) AVANT le tramage, dans draw(u, t, S) (jamais dans ui()), sauf ICONES[0] (couleurs exactes, dans ui()).
   Fonctions pures du temps : aucun Math.random, aucun Date ; hasard = graine (o.seed), tout est déterministe (vérifié : mêmes pixels pour la même image, quel que soit l'ordre de rendu).

   gr_frog(cx, cy, s, t, o)   (cx, cy) = point de contact avec le sol sous le milieu du ventre ; s = échelle (1 : ≈ 40 px de long, assise ; 5 : gros plan ≈ 200 px) ; t = temps du film.
        Anatomie : 4 doigts aux mains (écartés, bouts clairs), bras à coude net (épaule haute, bras vers l'arrière, avant-bras vers l'avant et le bas, coude ≈ 80°, poignet renflé), 5 orteils palmés aux pattes arrière (le 4e dépasse),
        cuisse à muscle ombré et barres sombres irrégulières, museau assez pointu, bouche qui descend à l'arrière (pli sous le tympan), œil saillant dont la bosse dépasse du dos.
        o.pose    'sit' (assise) | 'alert' (tête haute, bras tendus) | 'crouch' (accroupie, croupe levée, tête relevée) | 'leap' (saut complet, ph 0..1) | 'land' (réception : bras droits devant le museau, tête basse, pattes arrière en traîne, rebond de gorge)
                  | 'frozen' (gelée : ramassée, peau désaturée gris-brun, œil OUVERT mais terne) | 'thaw' (dégel, ph 0..1 : de gelée à assise)
        o.flip    true : regarde à gauche (la lumière o.light reste celle de l'écran)
        o.ph      phase 0..1. 'leap' : 0 assise → 0.14 accroupie profonde (anticipation) → 0.26 impulsion (les pattes arrière se détendent, décollage) → 0.26–0.78 vol (arc de gr_leapLift)
                  → 0.78 les mains touchent → 0.86 écrasement → 1 assise ; 'land' : 0 contact → 1 reposée ; 'thaw' : 0 gelée → 1 assise (l'ordre du dégel : cornée qui s'éclaircit dès 0,3, clignement de réflexe à 0,52, iris doré à 0,85, gorge qui repart de 0,6 à 0,95).
                  La position horizontale du saut n'est PAS ajoutée : cx + gr_hopX(ph, distance en px) (la hauteur, oui)
        o.breath  pulsation de la gorge 0..1 (défaut : respiration automatique gr_breath(t) ; 0 = gorge au repos ; gelée : 0 ; dégel : respiration × rampe de ph 0,6 à 0,95 ; réception : rebond de gorge ; o.breath l'emporte sur tout)
        o.eye     œil ouvert 0..1 (défaut : 1, y compris gelée et dégel : l'œil gelé est ouvert mais terne ; 0 = paupière fermée, bossage de peau à fente courbe)
        o.blink   0..1 clignement : paupière en trois tons (éclat côté lumière, croissant d'ombre, fente courbée qui suit la sphère, pli de peau) ; défaut : un clignement toutes les 3 à 4 s, déterministe ; 0 = aucun
        o.ice     0..1 givre puis glace : 0 rien · 0.25 plaques de givre blanc (3 à 6 px) qui gagnent le dos et la cuisse · 0.5 croûte bleutée sur la plupart du corps · 1 grenouille enrobée de glace (croûte qui garde la forme, ventre plus sombre,
                  reflets continus le long des bords éclairés, fissures, touffes de 3 à 5 aiguilles sur le dos, scintillements, coque cyan de 2 à 5 px, 1,5 px au plus si s < 2). Le gel gagne PATTES D'ABORD, la tête en dernier (niveau de la tête plafonné vers 0,75) ;
                  l'orbite de l'œil (anneau sombre bleu-gris, 3 px au moins), le masque et la ligne de bouche restent lisibles à tous les niveaux. o.iceFrom : 'legs' (défaut) | 'head' (au dégel la tête se libère la première)
        o.pale    0..1 dormance de la peau : le brun se désature vers un gris légèrement bleuté (défaut : 1 gelée, 1 − ph dégel, 0 sinon) ; o.dull 0..1 œil terne (gris-bleu, pupille éteinte ; défaut : 0,9 gelée, 0,95 × (1 − rampe) au dégel, + 0,7 × ice)
        o.rim     couleur du liseré de contre-jour (défaut '#fff8e8') ; o.light côté du soleil à l'écran : +1 droite (défaut), −1 gauche ; o.rimW épaisseur (px)
        o.shadow  opacité de l'ombre au sol 0..1 (défaut 0.34 ; 0 : aucune) ; o.shCol 'r,g,b' (défaut '5,4,15')
        o.sil     '#rrggbb' : silhouette pleine d'une seule couleur (contrôle de lecture) ; o.outline couleur du contour (défaut '#05040f')
        o.seed    entier : taches du dos, fissures (un individu) ; o.hop hauteur du saut en unités (défaut 8) ; o.sway balancement d'immobilité vivante (défaut 1)
        renvoie { joints, eye: [x, y], mouth: [x, y], head: [x, y], hip: [x, y], throat: [x, y], mask: (px, py) → bool (silhouette écran), lift, bbox }
   gr_leapLift(ph, h) hauteur du corps au-dessus du sol (px d'unité) ; gr_hopX(ph, dist) déplacement horizontal du saut (px) ; gr_breath(t, rate) pulsation de la gorge 0..1
   gr_blink(t, seed) clignement automatique 0..1
   Vues internes (couleurs de palette, à dessiner dans draw(), sur fond sombre NI) :
     gr_heart(cx, cy, s, t, o)      cœur de grenouille (deux oreillettes minces, ventricule conique à fibres courbes, tronc unique qui se divise bas, courts moignons de veines caves) ; s = 1 : ≈ 60 × 55 px. o.beat 0..1 contraction (le ventricule se vide, les oreillettes se remplissent) ;
                                    o.state 'live' (rouge) | 'slow' (rouge sombre) | 'stopped' (gris-bleu clair, paillettes de givre fixes qui scintillent) | 'restart' (rouge + anneau doré à chaque battement) ; o.tone 0..1 (tonus : 1 vif … 0 arrêté) ; o.light ±1 ; renvoie { ventricle, top, mask }
     gr_ecg(x, y, w, h, t, o)       écran d'électrocardiogramme (quadrillage, tracé qui défile) ; o.beats = tableau des instants ABSOLUS des battements (pic R) ; o.speed px/s (64) ; o.now position du curseur (0.86 de w) ;
                                    ligne plate sans battement, tracé et voyant rouges 1,3 s après le dernier battement (o.alarm pour forcer) ; renvoie { alarm }. Cadence réaliste : intervalles d'au moins 1 s (60/min au plus), jamais 120/min
     gr_cells(x, y, w, h, t, o)     amas de cellules à membrane et noyau dans un cadre ; o.shrink 0..1 (la cellule se ratatine, membrane crénelée, cytoplasme dense) ; o.ice 0..1 (aiguilles de glace entre les cellules ; défaut 0,9 × shrink) ;
                                    o.glucose 0..1 (enrobage doré, lueur, grains ; protège : le ratatinement diminue) ; o.bounce 0..1 (jusqu'à 5 cristaux qui viennent buter sur l'enrobage, éclair au contact ; sans sucre ils percent) ; o.molecules 0..1 ; o.n (9), o.seed, o.bg
     gr_glucose(x, y, s, t, o)      molécule de glucose : hexagone doré, O du cycle et quatre OH rouges, CH2OH ; o.rot, o.spin (rad/s), o.glow
     gr_icecrystal(x, y, s, o)      cristal de glace en aiguilles (six branches, ramifications, cyan à fil blanc) ; o.rot, o.t (scintillement), o.arms, o.light
     gr_lungs(cx, cy, s, t, o)      deux sacs ovales à paroi mince et translucide (alvéoles en nid d'abeille), très court conduit, pas de trachée ni de ramification ; o.inflate 0..1 (défaut : respiration automatique), o.state 'live' | 'stopped' (pâles, dégonflés)
   ICONES[0] : icône de case du carnet (17 × 17) : tête de face, deux yeux dorés saillants à pupille ronde 2 × 2 et un seul éclat, masque sombre sur les joues, lèvre brun clair unie, bouche plate d'un pixel, gorge crème (pas de sourire).
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
const gr_N = [WO[1], WO[2], WO[3], WO[4], WO[5], WO[6], SK[3], SK[4], OC[3], WO[0], WH[0], WH[1], WH[2], WH[3]];
// dormance : le brun se désature, il tire vers un gris légèrement bleuté (tons de ST à luminance égale ; la peau tramée brun / gris de gr_finish)
const gr_PALE = [ST[1], ST[2], ST[3], ST[3], ST[4], ST[5], ST[6], ST[7], ST[4], ST[0], ST[6], ST[7], NE[3], NE[4]];
// glace (croûte translucide) : bleu-gris qui garde la forme (ombres, lumière), le ventre plus sombre que le dos éclairé
const gr_ICY = [ST[1], ST[2], CY[0], ST[4], ST[5], ST[6], NE[1], NE[3], ST[4], ST[1], ST[3], ST[5], ST[6], NE[2]];
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
const gr_TH = 12.5, gr_SH = 16, gr_TAR = 8.5, gr_TOE = 12;          // cuisse, jambe, tarse, orteils
const gr_UA = 5.4, gr_FA = 5.9, gr_HAND = 4.3;                          // bras, avant-bras, doigts (le coude plie vraiment : épaule haute, poignet posé sous la poitrine)
const gr_HIPL = [-11, -9.2], gr_SHOL = [0.9, -6.6];                    // attaches (repère du torse assis)
const gr_PIV = [-4, -7], gr_NECK = [5.5, -9.5];                          // pivot de la rotation du torse, de la tête
// torse : [type (b corps, h tête), x, y] dans l'ordre du contour
const gr_TORSO = [
  ['b', -13.6, -3.6], ['b', -16.8, -8.0], ['b', -14.6, -13.7], ['b', -8.6, -16.7], ['b', -1.8, -15.2], ['b', 4.2, -14.0],
  ['h', 9.6, -13.7], ['h', 14.0, -13.0], ['h', 18.0, -10.9], ['h', 20.6, -8.5], ['h', 20.0, -6.2], ['h', 15.4, -4.2], ['h', 10.3, -3.0], ['h', 6.2, -2.4],
  ['b', 2.4, -3.2], ['b', -3, -3.0], ['b', -9.5, -3.0],
];
const gr_KEYS = {
  // hind : { ax, ay } cheville absolue  ou { hl, ha } (fraction d'extension, angle hanche → cheville) ; ta tarse, fa orteils (angles absolus, 0 = vers l'avant, + = vers le bas)
  sit: { tx: 0.4, ty: 0.7, rot: 0.3, len: 0.95, hgt: 1.08, arch: 0.6, hp: -0.08, hind: { ax: -12.0, ay: -3.1, ta: 0.28, fa: 0.1, fs: 0.93, ss: 0.82 }, fore: { wx: 5.9, wy: -0.9, ha: -0.04 } },
  alert: { tx: -0.6, ty: -1.1, rot: 0.46, len: 0.97, hgt: 1.06, arch: 0.35, hp: 0.02, hind: { ax: -12.6, ay: -3.1, ta: 0.26, fa: 0.1, fs: 0.9, ss: 0.84 }, fore: { wx: 6.0, wy: -0.6, ha: -0.02 } },
  crouch: { tx: 1.2, ty: 1.0, rot: -0.2, len: 1.06, hgt: 0.97, arch: 0.55, hp: 0.24, hind: { ax: -13.6, ay: -2.4, ta: 0.2, fa: 0.06, fs: 0.84, ss: 0.78 }, fore: { wx: 7.6, wy: -0.9, ha: -0.02 } },
  frozen: { tx: 0.6, ty: 0.7, rot: 0.06, len: 1.02, hgt: 1.0, arch: 0.75, hp: -0.02, hind: { ax: -13.0, ay: -2.8, ta: 0.22, fa: 0.07, fs: 0.85, ss: 0.79 }, fore: { wx: 5.8, wy: -0.9, ha: -0.04 } },
  ext: { tx: 2, ty: 0, rot: 0.62, len: 1.08, hgt: 1.04, arch: 0.15, hp: 0.06, pin: 'foot', hind: { hl: 0.97, ha: 2.38, ta: 2.5, fa: 2.62, fan: 0.26, fl: 0.7 }, fore: { fl: 0.55, fha: 2.1, ha: 1.9 } },
  fly1: { tx: 3, ty: -22, rot: 0.36, len: 1.08, hgt: 1.08, arch: 0.15, hp: 0.04, hind: { hl: 0.94, ha: 2.72, ta: 2.9, fa: 3.08, fan: 0.32, fl: 1 }, fore: { fl: 0.6, fha: 1.9, ha: 1.7 } },
  fly2: { tx: 3.5, ty: -22, rot: 0.1, len: 1.08, hgt: 1.08, arch: 0.15, hp: -0.02, hind: { hl: 0.9, ha: 2.85, ta: 3.1, fa: 3.3, fan: 0.34, fl: 1 }, fore: { fl: 0.8, fha: 0.9, ha: 0.7 } },
  fly3: { tx: 3.5, ty: -15, rot: -0.2, len: 1.06, hgt: 1.06, arch: 0.25, hp: -0.1, hind: { hl: 0.78, ha: 2.55, ta: 2.5, fa: 2.4, fan: 0.3, fl: 0.8 }, fore: { fl: 0.95, fha: 0.55, ha: 0.4 } },
  land: { tx: 2.5, ty: 0, rot: -0.3, len: 1.08, hgt: 0.92, arch: 0.3, hp: 0.06, pin: 'wrist', hind: { ax: -17.2, ay: -2.2, ta: 0.12, fa: -0.02, fan: 0.3, fs: 0.95, ss: 0.92, fl: 0.7 }, fore: { fl: 0.97, fha: 0.62, ha: 0.4 } },
  squash: { tx: 2.2, ty: 1.6, rot: -0.14, len: 1.12, hgt: 0.8, arch: 0.55, hp: -0.04, hind: { ax: -14.2, ay: -2.3, ta: 0.2, fa: 0.04, fs: 0.86, ss: 0.8 }, fore: { wx: 8.6, wy: -0.7, ha: -0.02 } },
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
  const K = { tx: k.tx, ty: k.ty, rot: k.rot, len: k.len, hgt: k.hgt, arch: k.arch, hp: k.hp, hind: { fs: 1, ss: 1, fan: 0.17, fl: 0, ...k.hind }, fore: { ...k.fore } };
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
  for (const f of ['ax', 'ay', 'ta', 'fa', 'fs', 'ss', 'fan', 'fl']) out.hind[f] = tab(tabl.map(([p, n]) => [p, gr_RK[n].hind[f]]), ph);
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

// ════════════════════════════════════════════════════════════════════════════════════════
// 3. LA GRENOUILLE : dessin vectoriel lisse dans le calque Y → 14 tons par pixel → pâleur / givre / glace → silhouette nette (layerEnd) → œil net
// ════════════════════════════════════════════════════════════════════════════════════════
// segment lisse à largeur variable et bouts arrondis : UN seul polygone simple (les croissants de lumière en dépendent)
function gr_seg(pts, ws, path = new Path2D()) {
  const dense = [], dw = [], n = pts.length;
  if (n === 2) { for (let k = 0; k <= 5; k++) { const u = k / 5; dense.push([pts[0][0] + (pts[1][0] - pts[0][0]) * u, pts[0][1] + (pts[1][1] - pts[0][1]) * u]); dw.push(ws[0] + (ws[1] - ws[0]) * u); } }
  else for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < 6; k++) { const u = k / 6, u2 = u * u, u3 = u2 * u; dense.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3), 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]); dw.push(ws[i] + (ws[i + 1] - ws[i]) * u); }
    if (i === n - 2) { dense.push(pts[n - 1]); dw.push(ws[n - 1]); }
  }
  const m = dense.length, Lp = [], Rp = [], tn = [];
  for (let i = 0; i < m; i++) { const a = dense[Math.max(0, i - 1)], b = dense[Math.min(m - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; tn.push([tx, ty]); Lp.push([dense[i][0] - ty * dw[i] / 2, dense[i][1] + tx * dw[i] / 2]); Rp.push([dense[i][0] + ty * dw[i] / 2, dense[i][1] - tx * dw[i] / 2]); }
  const th = i => Math.atan2(tn[i][1], tn[i][0]), arc = (c, a0, w) => { const out = []; for (let k = 1; k < 8; k++) { const a = a0 - k * Math.PI / 8; out.push([c[0] + Math.cos(a) * w / 2, c[1] + Math.sin(a) * w / 2]); } return out; };
  // côté gauche (début → fin), bout arrondi de la fin (de gauche à droite en passant devant), côté droit (fin → début), bout arrondi du début (en passant derrière)
  const poly_ = Lp.concat(arc(dense[m - 1], th(m - 1) + Math.PI / 2, dw[m - 1]), Rp.reverse(), arc(dense[0], th(0) - Math.PI / 2, dw[0]));
  polyPath(poly_, path); return path;
}
// ombre de l'amorce d'un tracé : un croissant sombre le long d'un bord
function gr_stroke(c, pts, w, col, closed = false) { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(gr_spline(pts, closed)); }

function gr_frog(cx, cy, s, t, o = {}) {
  o = o || {};
  const pose = o.pose || 'sit', flip = o.flip ? -1 : 1;
  let ph = o.ph; if (ph === undefined) ph = pose === 'leap' ? 0.5 : pose === 'land' ? 0.15 : 0;
  ph = gr_fin(ph, 0);
  const K = gr_poseAt(pose, ph);
  const frozenLike = pose === 'frozen' || (pose === 'thaw' && ph < 0.3);
  const ice = clamp(gr_fin(o.ice, 0)), seed = o.seed ?? 3, sw = (o.sway ?? 1);
  const pale = o.pale ?? (pose === 'frozen' ? 1 : pose === 'thaw' ? 1 - ph : 0);
  // respiration : gelée 0 ; au dégel la gorge repart PROGRESSIVEMENT (rampe de ph 0,6 à 0,95 : le cœur d'abord, l'œil, puis la respiration) ; o.breath l'emporte sur tout ; petit rebond de gorge à la réception
  const bAuto = gr_breath(t, 1.25, gr_h(seed, 1));
  const landB = pose === 'land' ? 1 - sm(prog(ph, 0, 0.45)) : pose === 'leap' ? bump(ph, 0.77, 0.8, 0.84, 0.94) : 0;
  const breath = o.breath ?? Math.max(pose === 'frozen' ? 0 : pose === 'thaw' ? bAuto * sm(prog(ph, 0.6, 0.95)) : bAuto, 0.8 * landB);
  // œil : gelée / dégel → l'œil reste OUVERT mais terne (gris-bleu, pupille éteinte) ; au dégel la cornée s'éclaircit, un clignement de réflexe, puis l'iris doré gagne du centre vers le bord
  const eyeOpen = o.eye ?? 1;
  const blink = o.blink ?? (frozenLike || eyeOpen < 0.6 ? 0 : pose === 'thaw' ? (ph < 0.8 ? clamp(1 - Math.abs(ph - 0.52) / 0.06) : gr_blink(t, seed)) : gr_blink(t, seed));
  const dull = o.dull ?? clamp((pose === 'thaw' ? 0.95 * (1 - sm(prog(ph, 0.3, 0.85))) : pale * 0.9) + ice * 0.7);
  const lift = pose === 'leap' ? gr_leapLift(ph, o.hop ?? 8) : 0;
  const side = o.light ?? 1, rim = o.rim ?? '#fff8e8', outline = o.outline ?? '#05040f';
  // lumière : vecteur vers la lumière, à l'écran puis dans le repère de la grenouille
  const lsx = side * 0.62, lsy = -0.78, ln = Math.hypot(lsx, lsy), Ls = [lsx / ln, lsy / ln], ll = [Ls[0] * flip, Ls[1]];
  // idle vivant : respiration du ventre et de la gorge, léger balancement de la tête
  if (sw > 0 && !frozenLike) { K.hgt *= 1 + 0.014 * breath * sw; K.hp += 0.012 * Math.sin(t * 0.9 + seed) * sw; K.ty -= 0.18 * breath * sw; }
  const b = breath;
  const T = (x, y) => gr_tmap(K, x, y), H = (x, y) => gr_hmap(K, x, y);
  const Sx = x => cx + flip * s * x, Sy = y => cy + s * (y - lift);               // repère de la grenouille → écran
  // ombre au sol
  const shA = (o.shadow ?? 0.34) * (1 - clamp(lift / 36) * 0.65);
  if (shA > 0 && !o.sil) {
    const rx = (21 + K.len * 3) * s * (1 - clamp(lift / 50) * 0.2), ry = 3.4 * s * (1 - clamp(lift / 50) * 0.2), sx = cx + flip * s * -2, sy = cy + 0.5 * s;
    L.save(); L.setTransform(1, 0, 0, 1, 0, 0); const col = o.shCol || '5,4,15';
    for (const [k, a] of [[1, 0.5], [0.72, 0.6]]) { L.fillStyle = `rgba(${col},${shA * a})`; L.beginPath(); L.ellipse(sx, sy, rx * k, ry * k, 0, 0, TAU); L.fill(); }
    L.restore();
  }
  // ── contour du corps (points avec gorge qui gonfle, dos qui se bombe)
  const pts = gr_TORSO.map(([ty_, x, y], i) => {
    let dx = 0, dy = 0;
    if (i === 11) { dx = 0.6 * b; dy = 1.2 * b; } else if (i === 12) { dx = 1.0 * b; dy = 3.6 * b; } else if (i === 13) { dx = 0.4 * b; dy = 3.0 * b; }
    if (i >= 2 && i <= 4) dy -= (K.arch - 0.5) * 5;
    return ty_ === 'b' ? T(x + dx, y + dy) : H(x + dx, y + dy);
  });
  const torso = gr_spline(pts);
  const Pb = (x, y) => T(x, y), Ph = (x, y) => H(x, y);
  layerBegin(); const c = Y; c.setTransform(flip * s, 0, 0, s, cx, cy - lift * s);
  const cw = 2 / s;                                                                // épaisseur d'un contour de 1 px (moitié visible)
  // ── pattes : une fonction pour chaque membre (loin = plus sombre, caché derrière le corps)
  const hipN = T(gr_HIPL[0], gr_HIPL[1]), shoN = T(gr_SHOL[0], gr_SHOL[1]);
  const drawHind = (hip, ank, far) => {
    const ik = gr_ik(hip[0], hip[1], ank[0], ank[1], gr_TH * K.hind.fs, gr_SH * K.hind.ss, -1), kn = ik.k, an = ik.a;
    const ball = [an[0] + gr_TAR * Math.cos(K.hind.ta), an[1] + gr_TAR * Math.sin(K.hind.ta)];
    const tones = far ? [gr_N[2], gr_N[3], gr_N[4], gr_N[1], gr_N[0]] : [gr_N[5], gr_N[6], gr_N[7], gr_N[3], gr_N[2]];
    const part = (pp, ww, tn, wl = [2.6, 1.2], ws = [2.2, 0.9], contour = !far) => {
      const p = gr_seg(pp, ww);
      if (contour) { c.strokeStyle = gr_N[2]; c.lineWidth = cw; c.lineJoin = 'round'; c.stroke(p); }
      gr_fill(c, p, tn[0]); gr_cres(c, p, ll, wl[0], tn[1]); gr_cres(c, p, ll, wl[1], tn[2]); gr_cres(c, p, ll, ws[0], tn[3], true); gr_cres(c, p, ll, ws[1], tn[4], true);
      return p;
    };
    // orteils : cinq, longs et palmés (le 4e est le plus long : il dépasse de la palmure)
    const toes = [], TLEN = [0.5, 0.7, 0.86, 1, 0.78];
    for (let k = 0; k < 5; k++) {
      const sp = (k - 2) * K.hind.fan, len = gr_TOE * TLEN[k], a = K.hind.fa + sp, mid = [ball[0] + Math.cos(a) * len * 0.5, ball[1] + Math.sin(a) * len * 0.5 + (k - 2) * 0.06], tip = [ball[0] + Math.cos(a + sp * 0.3) * len, ball[1] + Math.sin(a + sp * 0.3) * len];
      toes.push([ball, mid, tip]);
    }
    // cuisse d'abord (au fond), puis orteils et tarse, puis la jambe par-dessus (la plus proche de nous)
    const thP = part([hip, [(hip[0] + kn[0]) / 2, (hip[1] + kn[1]) / 2 - 0.8], kn], [12.0, 10.8, 6.8], tones, [2.6, 1.0], [3.4, 1.3], false);
    if (!far) {                                                                // muscle : un ton plus sombre sur le flanc de la cuisse, un petit ventre clair vers la lumière
      c.save(); c.clip(thP);
      const ang = Math.atan2(kn[1] - hip[1], kn[0] - hip[0]), mx = hip[0] + (kn[0] - hip[0]) * 0.46, my = hip[1] + (kn[1] - hip[1]) * 0.46;
      gr_fill(c, gr_ell(mx - ll[0] * 2.4, my - ll[1] * 2.4, 4.9, 2.4, ang), gr_N[3]);
      gr_fill(c, gr_ell(mx + ll[0] * 1.5 + 0.6, my + ll[1] * 1.5, 3.1, 1.15, ang + 0.1), gr_N[5]);
      c.restore();
    }
    if (s >= 1.3 && !far) { const web = [ball, toes[0][2], toes[1][2], toes[2][2], toes[3][2], toes[4][2]]; c.globalAlpha = 0.6; gr_fill(c, polyPath(web), gr_N[6]); c.globalAlpha = 1; }
    for (let k = 4; k >= 0; k--) { const tp = toes[k]; part(tp, [1.6, 1.3, 0.8], tones, [0.8, 0.4], [0.7, 0.3], false); if (!far) { c.fillStyle = gr_N[7]; c.beginPath(); c.arc(tp[2][0], tp[2][1], 0.75, 0, TAU); c.fill(); } }
    part([an, ball], [3.4, 2.9], tones, [1, 0.5], [1, 0.4]);
    const shankP = part([kn, [(kn[0] + an[0]) / 2 + (far ? 0 : 0.2), (kn[1] + an[1]) / 2 + 0.2], an], [6.2, 5.2, 3.6], tones);
    if (!far) {
      // barres sombres : irrégulières (épaisseur, obliquité, longueur), elles partent du dos de la patte et s'arrêtent avant l'autre bord
      const bar = (a_, b_, f, wd, inner, sk) => {
        const px_ = a_[0] + (b_[0] - a_[0]) * f, py_ = a_[1] + (b_[1] - a_[1]) * f, dx = b_[0] - a_[0], dy = b_[1] - a_[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
        let nx = -uy, ny = ux; if (ny > 0) { nx = -nx; ny = -ny; }                          // n : vers le dessus de la patte
        c.fillStyle = gr_N[3]; c.beginPath();
        c.moveTo(px_ + nx * 8 - ux * wd * 0.55, py_ + ny * 8 - uy * wd * 0.55); c.lineTo(px_ + nx * 8 + ux * wd * 0.55, py_ + ny * 8 + uy * wd * 0.55);
        c.lineTo(px_ - nx * inner + ux * (sk + wd * 0.22), py_ - ny * inner + uy * (sk + wd * 0.22)); c.lineTo(px_ - nx * inner + ux * (sk - wd * 0.22), py_ - ny * inner + uy * (sk - wd * 0.22));
        c.closePath(); c.fill();
      };
      c.save(); c.clip(thP); bar(hip, kn, 0.7, 1.9, 0.2, 1.7); bar(hip, kn, 0.86, 1.2, -1.0, -1.3); c.restore();
      c.save(); c.clip(shankP); bar(kn, an, 0.26, 2.1, -0.4, 1.5); bar(kn, an, 0.55, 1.4, -0.8, -1.2); bar(kn, an, 0.78, 1.0, -1.0, 1.0); c.restore();
      // éclat humide sur la cuisse (petit)
      gr_fill(c, gr_ell(hip[0] + (kn[0] - hip[0]) * 0.52 + 0.5, hip[1] + (kn[1] - hip[1]) * 0.52 - 3.6, 1.7, 0.4, Math.atan2(kn[1] - hip[1], kn[0] - hip[0])), gr_N[7]);
    }
    return { kn, an, ball, tip: toes[3][2] };
  };
  const drawFore = (sho, wr, far) => {
    const ik = gr_ik(sho[0], sho[1], wr[0], wr[1], gr_UA, gr_FA, 1), el = ik.k, w2 = ik.a;
    const tones = far ? [gr_N[2], gr_N[3], gr_N[4], gr_N[1], gr_N[0]] : [gr_N[5], gr_N[6], gr_N[7], gr_N[3], gr_N[2]];
    const part = (pp, ww, wl = [1.6, 0.7], ws = [1.4, 0.6], contour = !far) => { const p = gr_seg(pp, ww); if (contour) { c.strokeStyle = gr_N[1]; c.lineWidth = cw; c.lineJoin = 'round'; c.stroke(p); } gr_fill(c, p, tones[0]); gr_cres(c, p, ll, wl[0], tones[1]); gr_cres(c, p, ll, wl[1], tones[2]); gr_cres(c, p, ll, ws[0], tones[3], true); gr_cres(c, p, ll, ws[1], tones[4], true); return p; };
    // ombre du bras sur le flanc : un croissant sombre côté ombre, limité au corps
    if (!far) { c.save(); c.clip(torso); c.globalAlpha = 0.55; gr_fill(c, gr_seg([sho, [(sho[0] + el[0]) / 2 - ll[0] * 0.9, (sho[1] + el[1]) / 2 - ll[1] * 0.9], el], [5.4, 4.8, 4.0]), gr_N[1]); c.globalAlpha = 1; c.restore(); }
    // main : quatre doigts écartés, effilés, bout clair ; une paume sombre entre eux
    const nf = 4, spread = 0.34, hl = gr_HAND * (far ? 0.9 : 1);
    if (!far) gr_fill(c, polyPath([w2, [w2[0] + Math.cos(K.fore.ha - 0.55) * hl * 0.55, w2[1] + Math.sin(K.fore.ha - 0.55) * hl * 0.55], [w2[0] + Math.cos(K.fore.ha + 0.55) * hl * 0.55, w2[1] + Math.sin(K.fore.ha + 0.55) * hl * 0.55]]), gr_N[2]);
    for (let k = 0; k < nf; k++) {
      const a = K.fore.ha + (k - 1.5) * spread, len = hl * [0.78, 1, 1, 0.84][k], a2 = a + 0.28;
      const m1 = [w2[0] + Math.cos(a) * len * 0.5, w2[1] + Math.sin(a) * len * 0.5], tip = [m1[0] + Math.cos(a2) * len * 0.52, m1[1] + Math.sin(a2) * len * 0.52];
      part([w2, m1, tip], [1.5, 1.25, 0.85], [0.6, 0.3], [0.5, 0.3], false);
      if (!far) { c.fillStyle = gr_N[7]; c.beginPath(); c.arc(tip[0], tip[1], 0.62, 0, TAU); c.fill(); }
    }
    part([el, [(el[0] + w2[0]) / 2, (el[1] + w2[1]) / 2], w2], [2.9, 2.5, 2.1]);
    const wp = gr_ell(w2[0], w2[1], 1.5, 1.2); if (!far) { c.strokeStyle = gr_N[1]; c.lineWidth = cw; c.stroke(wp); } gr_fill(c, wp, tones[0]); gr_cres(c, wp, ll, 0.7, tones[1]); gr_cres(c, wp, ll, 0.8, tones[3], true);           // renflement du poignet
    part([sho, [(sho[0] + el[0]) / 2, (sho[1] + el[1]) / 2], el], [3.9, 3.4, 2.9], [1.3, 0.6], [1.3, 0.5]);
    const ep = gr_ell(el[0], el[1], 1.7, 1.7); if (!far) { c.strokeStyle = gr_N[1]; c.lineWidth = cw; c.stroke(ep); } gr_fill(c, ep, tones[0]); gr_cres(c, ep, ll, 0.8, tones[1]); gr_cres(c, ep, ll, 0.6, tones[2]); gr_cres(c, ep, ll, 0.9, tones[3], true);   // le coude, net
    return { el, w2 };
  };
  // loin : patte arrière et bras éloignés (décalés vers l'avant et le haut pour qu'on les voie dépasser)
  { const fl = clamp(K.hind.fl), dx = K.hind.ax - hipN[0], dy = K.hind.ay - hipN[1], dl = Math.hypot(dx, dy) || 1; let nx = -dy / dl, ny = dx / dl; if (ny > 0) { nx = -nx; ny = -ny; }
    drawHind([hipN[0] + 2.0 * (1 - fl) + nx * 1.6 * fl, hipN[1] - 0.8 * (1 - fl) + ny * 1.6 * fl], [K.hind.ax + 3.4 * (1 - fl) + nx * 4.6 * fl, K.hind.ay - 0.3 * (1 - fl) + ny * 4.6 * fl], true); }
  drawFore([shoN[0] + 1.6, shoN[1] - 0.4], [K.fore.wx + 3.4, K.fore.wy - 0.2], true);
  // ── corps
  gr_fill(c, torso, gr_N[4]);
  gr_cres(c, torso, ll, 4.8, gr_N[5]); gr_cres(c, torso, ll, 1.9, gr_N[6]);
  gr_cres(c, torso, ll, 5.2, gr_N[3], true); gr_cres(c, torso, ll, 2.2, gr_N[2], true);
  c.save(); c.clip(torso);
  // reflet roux sur le dos et taches sombres
  { const r = rng(seed * 97 + 5); for (let i = 0; i < 5; i++) { const x = -13 + r() * 14, y = -14.4 + r() * 3.6, q = T(x, y); gr_fill(c, gr_ell(q[0], q[1], 1.8 + r() * 1.6, 0.9 + r() * 0.8, r() * 3), gr_N[8]); }
    for (let i = 0; i < 7; i++) { const x = -13 + r() * 13, y = -15.4 + r() * 5.4, q = T(x, y); gr_fill(c, gr_ell(q[0], q[1], 0.9 + r() * 1.4, 0.6 + r() * 0.8, r() * 3), gr_N[2]); } }
  // plis dorso-latéraux : une ligne claire bordée d'ombre, de derrière l'œil jusqu'au bassin
  { const fold = [Ph(4.2, -14.1), Pb(-1, -15.1), Pb(-7, -15.3), Pb(-12.2, -13.6), Pb(-15.2, -9.5)]; gr_stroke(c, fold.map(p => [p[0], p[1] + 1.3]), 1.0, gr_N[3]); gr_stroke(c, fold, 1.4, gr_N[6]); }
  // ventre et mâchoire inférieure (crème)
  { const belly = [Ph(21.0, -7.0), Ph(15, -6.4), Ph(10, -5.7), Ph(5.2, -5.2), Pb(0, -5.5), Pb(-6, -4.9), Pb(-12, -4.5), Pb(-17.5, -5.7), Pb(-18, 6), Pb(0, 7), Ph(23, 7)], bp = polyPath(belly);
    gr_fill(c, bp, gr_N[11]);
    c.save(); c.clip(bp); gr_cres(c, torso, ll, 3.2, gr_N[12]); gr_cres(c, torso, ll, 1.2, gr_N[13]); gr_cres(c, torso, ll, 2.6, gr_N[10], true); c.restore(); }
  // masque sombre : du museau à l'oreille, souligné par la lèvre claire
  { const mask = polyPath([Ph(16.3, -9.6), Ph(14.2, -11.2), Ph(11.8, -11.9), Ph(9.4, -11.7), Ph(6.4, -12.2), Ph(3.4, -11.3), Ph(1.7, -9.2), Ph(2.4, -7.0), Ph(5.4, -6.8), Ph(10, -7.4), Ph(14.4, -8.0), Ph(16.8, -8.3)]);
    gr_fill(c, mask, gr_N[1]); gr_cres(c, mask, ll, 0.8, gr_N[2]);
    const core = Ph(5.2, -10.0); gr_fill(c, gr_ell(core[0], core[1], 3.0, 2.2), gr_N[0]);
    // bouche : la ligne descend à l'arrière (pli sous le tympan) ; lèvre = liseré brun clair (transition avec le masque) puis crème, le trait de lumière coupé en deux segments
    const mo = [Ph(20.4, -7.3), Ph(16.4, -6.7), Ph(11.6, -6.0), Ph(7.4, -5.55), Ph(4.6, -5.0), Ph(3.2, -3.9)], up = [Ph(20.5, -8.4), Ph(16.4, -7.75), Ph(11.6, -7.0), Ph(7.4, -6.5), Ph(4.8, -6.0)];
    gr_fill(c, polyPath(up.map(p => [p[0], p[1] - 0.9]).concat(mo.slice(0, 5).reverse())), gr_N[6]);
    const lip = polyPath(up.concat(mo.slice(0, 5).reverse()));
    gr_fill(c, lip, gr_N[12]);
    gr_stroke(c, [Ph(19.8, -8.05), Ph(16.4, -7.45), Ph(13.6, -7.05)], 0.55, gr_N[13]); gr_stroke(c, [Ph(10.8, -6.7), Ph(8.4, -6.35), Ph(6.2, -6.05)], 0.5, gr_N[13]);
    gr_stroke(c, [Ph(12.3, -7.0), Ph(12.0, -5.9)], 0.45, gr_N[10]);
    gr_stroke(c, [Ph(4.9, -6.9), Ph(3.5, -5.6)], 0.5, gr_N[1]);
    const tym = Ph(4.0, -9.2), te = gr_ell(tym[0], tym[1], 2.3, 2.3); gr_fill(c, te, gr_N[1]); gr_fill(c, gr_ell(tym[0], tym[1], 1.6, 1.6), gr_N[0]); gr_cres(c, te, ll, 0.6, gr_N[2]);
    gr_stroke(c, mo, 0.7, gr_N[9]); }
  // éclats humides : la peau luit
  gr_fill(c, gr_ell(...T(-4.2, -15.6), 2.8, 0.6, -0.12), gr_N[7]); gr_fill(c, gr_ell(...T(-10.5, -13.9), 1.5, 0.5, 0.5), gr_N[7]); gr_fill(c, gr_ell(...H(14.2, -12.7), 1.5, 0.45, -0.35), gr_N[7]);
  c.restore();
  // bosse de l'œil (saillante au-dessus de la tête)
  const eyeC = H(8.8, -14.6);
  { const bR = Math.max(3.7, 3.2 + 1.4 / s), e = gr_ell(eyeC[0], eyeC[1], bR, bR - 0.1); c.strokeStyle = gr_N[1]; c.lineWidth = cw; c.stroke(e); gr_fill(c, e, gr_N[3]); gr_cres(c, e, ll, 1.8, gr_N[4]); gr_cres(c, e, ll, 0.8, gr_N[5]); gr_cres(c, e, ll, 1.6, gr_N[2], true); }
  // près : patte arrière et bras
  const hindN = drawHind(hipN, [K.hind.ax, K.hind.ay], false);
  const foreN = drawFore(shoN, [K.fore.wx, K.fore.wy], false);
  const mouth = H(20.3, -7.3), head = H(11, -9), thr = H(10, -3);
  // ── passage pixel : 14 tons, pâleur, givre, glace, liseré, silhouette
  const eyeS = [Sx(eyeC[0]), Sy(eyeC[1])];
  const info = gr_finish(o, { cx, cy: cy - lift * s, s, flip, Ls, rim, outline, pale, ice, seed, t, ll, K, eyeS });
  // ── œil net
  gr_eye(eyeS[0], eyeS[1], 3.2 * s, { open: eyeOpen, blink, dull, flip, Ls, ice: ice, info, s, seed, t, pale, sil: o.sil });
  const J = q => [Sx(q[0]), Sy(q[1])];
  return { joints: { hip: J(hipN), knee: J(hindN.kn), ankle: J(hindN.an), ball: J(hindN.ball), toe: J(hindN.tip), sho: J(shoN), elbow: J(foreN.el), wrist: J(foreN.w2) }, eye: eyeS, mouth: [Sx(mouth[0]), Sy(mouth[1])], head: [Sx(head[0]), Sy(head[1])], hip: [Sx(hipN[0]), Sy(hipN[1])], throat: [Sx(thr[0]), Sy(thr[1])], mask: info.mask, lift, bbox: info.bbox };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 4. PASSAGE PIXEL : tons, pâleur, givre, glace, liseré de contre-jour ; puis silhouette nette
// ════════════════════════════════════════════════════════════════════════════════════════
const gr_PI = gr_PALE.map(gr_rgb), gr_II = gr_ICY.map(gr_rgb);
function gr_dist(occ, w, h, inside) {                                    // distance au plus proche pixel de l'autre classe (chanfrein 1 / 1,41), en pixels
  const D = new Float32Array(w * h), BIG = 999, sq = 1.414;
  for (let p = 0; p < w * h; p++) D[p] = (inside ? !occ[p] : occ[p]) ? 0 : BIG;          // inside : distance au bord depuis l'intérieur ; sinon : depuis la silhouette vers l'extérieur
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const p = j * w + i; let m = D[p]; if (i > 0) m = Math.min(m, D[p - 1] + 1); if (j > 0) { m = Math.min(m, D[p - w] + 1); if (i > 0) m = Math.min(m, D[p - w - 1] + sq); if (i < w - 1) m = Math.min(m, D[p - w + 1] + sq); } D[p] = m; }
  for (let j = h - 1; j >= 0; j--) for (let i = w - 1; i >= 0; i--) { const p = j * w + i; let m = D[p]; if (i < w - 1) m = Math.min(m, D[p + 1] + 1); if (j < h - 1) { m = Math.min(m, D[p + w] + 1); if (i < w - 1) m = Math.min(m, D[p + w + 1] + sq); if (i > 0) m = Math.min(m, D[p + w - 1] + sq); } D[p] = m; }
  return D;
}
function gr_finish(o, st) {
  const { cx, cy, s, flip, Ls, rim, outline, pale, ice, seed, t, eyeS } = st;
  const M = ice > 0 ? 9 + Math.ceil(s * 0.8) : 2;
  const x0 = Math.max(0, Math.floor(cx - 64 * s) - M), x1 = Math.min(LW, Math.ceil(cx + 64 * s) + M), y0 = Math.max(0, Math.floor(cy - 68 * s) - M), y1 = Math.min(LH, Math.ceil(cy + 14 * s) + M);
  const w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) { layerEnd({ outline }); return { mask: () => false, bbox: [x0, y0, 0, 0] }; }
  const id = Y.getImageData(x0, y0, w, h), d = id.data, n = w * h;
  const ix = new Uint8Array(n).fill(255), occ = new Uint8Array(n);
  for (let j = 0, p = 0; j < h; j++) for (let i = 0; i < w; i++, p++) {
    if (d[p * 4 + 3] < 128) continue;
    occ[p] = 1;
    const of = (gr_bay(x0 + i, y0 + j) - 0.5) * 8;
    ix[p] = gr_LUT[((clamp(d[p * 4] + of, 0, 255) >> 3) << 10) | ((clamp(d[p * 4 + 1] + of, 0, 255) >> 3) << 5) | (clamp(d[p * 4 + 2] + of, 0, 255) >> 3)];
  }
  const sil = o.sil ? gr_rgb(o.sil) : null;
  const col = new Uint8Array(n * 3), shell = new Uint8Array(n);
  const rx = Math.round(Ls[0] * 1.3), ry = Math.round(Ls[1] * 1.3);
  const small = s < 2;
  let dIn = null, dOut = null, lvlAt = null;
  if (ice > 0 && !sil) {
    dIn = gr_dist(occ, w, h, true); dOut = gr_dist(occ, w, h, false);
    const sp = 0.62, from = o.iceFrom || 'legs';
    // niveau de glace en un point : les pattes d'abord (ou la tête d'abord au dégel), irrégularité à grande échelle (plaques, pas de grain) ; la tête plafonne vers 0,75 pour que l'œil et la bouche restent lisibles
    lvlAt = (i, j) => {
      const xl = (x0 + i - cx) * flip / s, hn = clamp((xl + 14) / 34), ord = from === 'head' ? 1 - hn : hn, nz = gr_n2((x0 + i) / 5.5, (y0 + j) / 5.5, seed + 11) - 0.5;
      return clamp(Math.min(ice * (1 + sp) - ord * sp + nz * 0.26, 1 - 0.25 * gr_ss(0.5, 0.9, hn)), 0, 1);
    };
  }
  const setc = (p, c) => { col[p * 3] = c[0]; col[p * 3 + 1] = c[1]; col[p * 3 + 2] = c[2]; };
  const W3 = gr_rgb(WH[3]), C4 = gr_rgb(CY[4]), C3 = gr_rgb(CY[3]), C2 = gr_rgb(CY[2]), C1 = gr_rgb(CY[1]);
  const lvA = lvlAt ? new Float32Array(n) : null;
  const frM = new Uint8Array(n), crM = new Uint8Array(n), litA = new Uint8Array(n), orb = new Uint8Array(n);
  // l'orbite de l'œil : un anneau sombre bleu-gris d'au moins 3 px qui reste visible à tous les niveaux de glace
  const eR = Math.max(2, Math.round(3.2 * s)), oR = Math.max(3.7 * s, eR + 2.4), eX = eyeS ? eyeS[0] - x0 : -99, eY = eyeS ? eyeS[1] - y0 : -99;
  const ringK = gr_ss(0.1, 0.4, ice);
  const GRAYN = gr_PI;                                                                  // peau en dormance : le brun se désature vers un gris légèrement bleuté (tramage brun / gris)
  if (lvlAt) {
    // passe 1 : où est le givre, où est la croûte (plaques de 3 à 6 px) ; sommets et bords éclairés d'abord
    const cov1 = small ? 0.82 : 1, cov2 = small ? 0.86 : 1;
    for (let j = 0, p = 0; j < h; j++) for (let i = 0; i < w; i++, p++) {
      if (ix[p] === 255) continue;
      const lv = lvlAt(i, j); lvA[p] = lv;
      const lit = (i + rx < 0 || j + ry < 0 || i + rx >= w || j + ry >= h) ? 1 : (occ[(j + ry) * w + i + rx] ? 0 : 1); litA[p] = lit;
      const dE = Math.hypot(i - eX, j - eY); if (dE <= oR + 0.5 && dE > eR - 1.2) orb[p] = 1;
      if (lv < 0.05) continue;
      const X_ = x0 + i, Y_ = y0 + j, k = ix[p];
      const n1 = clamp(0.5 + (gr_n2(X_ / 3.1, Y_ / 3.1, seed + 3) * 0.62 + gr_n2(X_ / 6.6, Y_ / 6.6, seed + 4) * 0.38 - 0.5) * 1.7), n2 = clamp(0.5 + (gr_n2(X_ / 4.0 + 7.3, Y_ / 4.0, seed + 6) * 0.6 + gr_n2(X_ / 8.2, Y_ / 8.2 + 3.1, seed + 7) * 0.4 - 0.5) * 1.7);
      const bias = (dIn[p] <= 1.6 ? 0.1 : dIn[p] <= 3.2 ? 0.05 : 0) + lit * 0.12 + (1 - clamp((Y_ - (cy - 22 * s)) / (26 * s))) * 0.07;
      const headness = gr_ss(0.5, 0.9, clamp(((X_ - cx) * flip / s + 14) / 34));
      const hi = gr_ss(0.6, 0.9, lv), c1 = gr_ss(0.08, 0.45, lv) * (1 - 0.82 * hi) * cov1, c2 = gr_ss(0.3, 0.7, lv) * cov2 * (1 - 0.5 * headness);
      const dark = k === 0 || k === 9;
      if (n2 + bias * 0.5 > 1 - c2) crM[p] = 1;
      if (!dark && n1 + bias * (1 + 2.5 * hi) > 1 - c1 && (hi < 0.35 || lit || dIn[p] <= 3.2)) frM[p] = 1;
    }
    // passe 2 : on retire les îlots d'un pixel et on comble les trous d'un pixel (le givre est fait de plaques, pas de poivre)
    const clean = Mk => { for (let it = 0; it < 2; it++) { const Nw = Mk.slice(); for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) { const p = j * w + i; if (!occ[p]) continue; const nb = Mk[p - 1] + Mk[p + 1] + Mk[p - w] + Mk[p + w]; if (Mk[p] && nb <= 1) Nw[p] = 0; else if (!Mk[p] && nb >= 3 && (ix[p] !== 0 && ix[p] !== 9 || Mk === crM)) Nw[p] = 1; } Mk.set(Nw); } };
    clean(crM); clean(frM);
  }
  // passe 3 : couleurs
  const FR = [ST[4], ST[5], NE[1], NE[2], NE[3], NE[4], WH[3]].map(gr_rgb), SV = [0, 0.5, 1.0, 1.6, 2.2, 2.8, 3.3, 3.8, 2.2, 0, 0.8, 2.4, 3.2, 3.9];
  for (let j = 0, p = 0; j < h; j++) for (let i = 0; i < w; i++, p++) {
    const k = ix[p]; if (k === 255) continue;
    if (sil) { setc(p, sil); continue; }
    const bay = gr_bay(x0 + i, y0 + j);
    let c = bay < clamp(pale * 0.5 + (lvA ? 0.5 * gr_ss(0.25, 0.7, lvA[p]) : 0)) ? GRAYN[k] : gr_NI[k];
    if (lvlAt) {
      if (crM[p]) c = gr_II[k];
      if (frM[p]) { const sv = SV[k] + litA[p] * 0.9 + (bay - 0.5) * 0.9; c = FR[sv < 0.5 ? 0 : sv < 1.2 ? 1 : sv < 2.0 ? 2 : sv < 2.8 ? 3 : sv < 3.4 ? 4 : sv < 4.0 ? 5 : 6]; }
      if (orb[p] && bay < ringK) { const f = (((x0 + i) - (x0 + eX)) * Ls[0] + ((y0 + j) - (y0 + eY)) * Ls[1]) / Math.max(1, Math.hypot(i - eX, j - eY)); c = gr_rgb(f > 0.55 ? ST[5] : f > -0.2 ? ST[4] : ST[3]); }
    }
    setc(p, c);
  }
  // reflets continus sur la glace : une ou deux bandes parallèles aux bords éclairés (dos, cuisse), à 2 et 4 px du bord
  if (lvlAt && ice > 0.5) {
    const at = (i, j) => (i < 0 || j < 0 || i >= w || j >= h) ? 0 : occ[j * w + i];
    const gl = gr_ss(0.5, 0.85, ice);
    for (let j = 0, p = 0; j < h; j++) for (let i = 0; i < w; i++, p++) {
      if (!occ[p] || shell[p] || ix[p] === 255 || orb[p] || lvA[p] < 0.5) continue;
      const a2 = at(i + 2 * rx, j + 2 * ry), a3 = at(i + 3 * rx, j + 3 * ry), a4 = at(i + 4 * rx, j + 4 * ry), a5 = at(i + 5 * rx, j + 5 * ry), X_ = x0 + i, Y_ = y0 + j;
      if (a2 && !a3 && gr_n2(X_ / 5, Y_ / 5, seed + 21) > 0.3 && gr_h2(X_, Y_, seed + 22) < gl) setc(p, W3);
      else if (s >= 2.4 && a4 && !a5 && gr_n2(X_ / 4, Y_ / 4, seed + 23) > 0.58) setc(p, gr_rgb(NE[3]));
    }
  }
  // coque de glace autour du corps (de plus en plus épaisse) : tons cyan, bord clair côté lumière, bord sombre à l'opposé ; fine à petite échelle
  if (lvlAt) {
    const tmax = small ? Math.min(1.5, 0.6 + 0.45 * s) : Math.min(5, 1.1 + 0.5 * s);
    for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
      const p = j * w + i; if (occ[p] || dOut[p] > tmax + 1) continue;
      const lv = lvlAt(i, j), th = tmax * gr_ss(0.2, 0.95, lv) * (0.78 + 0.5 * gr_h2((x0 + i) >> 1, (y0 + j) >> 1, seed + 17));
      if (dOut[p] > th) continue;
      const gx = dOut[p + 1] - dOut[p - 1], gy = dOut[p + w] - dOut[p - w], gl = Math.hypot(gx, gy) || 1, face = (gx * Ls[0] + gy * Ls[1]) / gl, f = dOut[p] / Math.max(0.5, th);
      let c = f < 0.34 ? C2 : f < 0.68 ? C3 : C4;
      if (face > 0.35) c = f < 0.5 ? C4 : gr_rgb(NE[4]); else if (face < -0.35) c = f < 0.5 ? C1 : C2;
      if (dOut[p] > th - 1) c = face > 0.1 ? W3 : (face < -0.4 ? C2 : C4);
      shell[p] = 1; occ[p] = 2; setc(p, c);
    }
    // fissures : quelques traits sombres, doublés d'un fil clair côté lumière
    const cr = gr_ss(0.62, 1, ice);
    if (cr > 0) {
      const R_ = rng(seed * 31 + 7);
      for (let q = 0; q < 3; q++) {
        let ax = x0 + w * (0.25 + R_() * 0.5), ay = y0 + h * (0.35 + R_() * 0.35), ang = R_() * TAU; const len = (5 + R_() * 9) * cr * (0.6 + 0.4 * Math.sqrt(s));
        for (let k = 0; k < len; k++) {
          ang += (R_() - 0.5) * 0.9; ax += Math.cos(ang); ay += Math.sin(ang);
          const i = Math.round(ax - x0), j = Math.round(ay - y0), p = j * w + i; if (i < 1 || j < 1 || i >= w - 1 || j >= h - 1 || !occ[p] || orb[p] || ix[p] === 0 || ix[p] === 9) continue;
          setc(p, C1); const pl = (j - ry) * w + (i - rx); if (occ[pl] && lvA && lvA[pl] > 0.5) setc(pl, gr_rgb(NE[4]));
        }
      }
    }
  }
  // liseré de contre-jour : un pixel (deux en gros plan) sur les bords tournés vers la lumière
  { const rc = gr_rgb(rim), rw = o.rimW ?? (s >= 3.2 ? 2 : 1);
    const keep = new Uint8Array(n);
    for (let j = 0, p = 0; j < h; j++) for (let i = 0; i < w; i++, p++) {
      if (!occ[p] || shell[p]) continue;
      const a = (i + rx < 0 || j + ry < 0 || i + rx >= w || j + ry >= h) ? 0 : occ[(j + ry) * w + i + rx];
      if (!a) keep[p] = 1;
      else if (rw > 1) { const b2 = (i + 2 * rx < 0 || j + 2 * ry < 0 || i + 2 * rx >= w || j + 2 * ry >= h) ? 0 : occ[(j + 2 * ry) * w + i + 2 * rx]; if (!b2 && gr_bay(x0 + i, y0 + j) < 0.6) keep[p] = 2; }
    }
    if (!sil) for (let p = 0; p < n; p++) if (keep[p]) { const tone = ix[p]; if (tone === 9 || tone === 0) { if (keep[p] === 1) setc(p, gr_rgb(ice > 0.6 ? WH[3] : WO[3])); } else setc(p, keep[p] === 1 ? (ice > 0.7 && lvA && lvA[p] > 0.6 ? W3 : rc) : (ice > 0.7 ? gr_rgb(NE[3]) : gr_rgb(SK[4]))); }
  }
  // écriture
  for (let p = 0; p < n; p++) { if (occ[p]) { d[p * 4] = col[p * 3]; d[p * 4 + 1] = col[p * 3 + 1]; d[p * 4 + 2] = col[p * 3 + 2]; d[p * 4 + 3] = 255; } else d[p * 4 + 3] = 0; }
  Y.putImageData(id, x0, y0);
  layerEnd({ outline });
  // cristaux : des touffes de 3 à 5 aiguilles de longueurs variées, sur le dessus du dos et de la tête (jamais des tiges isolées), puis quelques scintillements
  if (lvA && ice > 0.28) {
    const nT = Math.max(1, Math.round((1.1 + 0.3 * s) * gr_ss(0.28, 0.9, ice))), big = s >= 2.4, R_ = rng(seed * 13 + 1), unit = (0.65 + 0.35 * Math.sqrt(s)) * gr_ss(0.28, 1, ice);
    for (let k = 0; k < nT; k++) {
      const i = Math.floor(w * (0.22 + 0.62 * ((k + R_() * 0.7) / nT))); let top = -1; for (let j = 0; j < h; j++) if (occ[j * w + i] === 1) { top = j; break; }
      if (top < 0 || lvA[Math.min(h - 1, top + 2) * w + i] < 0.3) continue;
      const m = 3 + Math.floor(R_() * 3), a0 = -Math.PI / 2 + (R_() - 0.5) * 0.7, bx0 = x0 + i, by = y0 + top + 1;
      for (let q = 0; q < m; q++) {
        const f = (q - (m - 1) / 2), ang = a0 + f * 0.3 + (R_() - 0.5) * 0.12, len = (4.2 + R_() * 6.0) * unit * (1 - 0.22 * Math.abs(f)), bx = bx0 + f * 1.3, tx = bx + Math.cos(ang) * len, ty = by + Math.sin(ang) * len;
        const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux, bw = big ? 1.5 : 0.8;
        const nd = (bw_, ex_, c_) => poly([[bx - nx * bw_, by - ny * bw_], [bx + nx * bw_, by + ny * bw_], [bx + ux * (len + ex_), by + uy * (len + ex_)]], c_);   // aiguille : triangle effilé
        if (big) { nd(bw + 1, 1.2, '#05040f'); nd(bw, 0, CY[2]); nd(bw * 0.45, -0.4, CY[4]); px(bx + ux * len, by + uy * len, WH[3]); }
        else { nd(bw + 0.6, 0.8, '#05040f'); nd(bw, 0, CY[3]); px(bx + ux * len, by + uy * len, WH[3]); }
      }
    }
    const nG = 6; for (let k = 0; k < nG; k++) {
      const p = Math.floor(gr_h(k, seed + 41) * n); if (!occ[p] || lvA[p] < 0.3) continue;
      const a = Math.pow(Math.max(0, Math.sin(t * (2.1 + k * 0.43) + k * 1.9)), 8); if (a < 0.4) continue;
      const gx = x0 + (p % w), gy = y0 + ((p / w) | 0); px(gx, gy, WH[3]); if (a > 0.7) { px(gx - 1, gy, CY[4]); px(gx + 1, gy, CY[4]); px(gx, gy - 1, CY[4]); px(gx, gy + 1, CY[4]); }
    }
  }
  if (!lvA && pale > 0.8 && !sil) {                                        // gelée sans glace : immobile (c'est le sujet), mais un reflet de givre scintille de loin en loin sur le dos
    for (let k = 0; k < 4; k++) {
      const p = Math.floor(gr_h(k, seed + 51) * n); if (!occ[p] || ix[p] === 255 || ix[p] < 5) continue;
      const a = Math.pow(Math.max(0, Math.sin(t * (1.3 + k * 0.37) + k * 2.3)), 10); if (a < 0.5) continue;
      const gx = x0 + (p % w), gy = y0 + ((p / w) | 0); px(gx, gy, WH[3]); if (a > 0.85) { px(gx - 1, gy, NE[3]); px(gx + 1, gy, NE[3]); }
    }
  }
  return { mask: (qx, qy) => { const i = Math.round(qx) - x0, j = Math.round(qy) - y0; return i >= 0 && j >= 0 && i < w && j < h && occ[j * w + i] > 0; }, bbox: [x0, y0, w, h], lvlAt: lvA ? (qx, qy) => { const i = Math.round(qx) - x0, j = Math.round(qy) - y0; return i >= 0 && j >= 0 && i < w && j < h ? lvA[j * w + i] : 0; } : null };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 5. L'ŒIL : doré, pupille horizontale, éclat ; paupière (clignement, œil mi-clos), œil terne et givré
// ════════════════════════════════════════════════════════════════════════════════════════
function gr_eye(ex, ey, er, st) {
  if (st.sil) return;
  ex = Math.round(ex); ey = Math.round(ey);
  const R_ = Math.max(2, Math.round(er)), dl = clamp(st.dull), lx = gr_sg(st.Ls[0]), ly = st.Ls[1], eff = clamp(st.open * (1 - st.blink));
  const gate = (1 - dl) * 1.25 - 0.15;                                    // l'iris vivant (doré) gagne du centre vers le bord à mesure que l'œil terne se réveille (rien tant que dl > 0,88)
  // tons de la peau de la tête (même rampes que le bossage de l'œil : le globe et la paupière se raccordent au crâne)
  const SKs = st.ice > 0.55 ? gr_ICY : st.pale > 0.5 ? gr_PALE : gr_N, tSh = SKs[2], tBa = SKs[3], tMi = SKs[4], tLi = SKs[5];
  const ringL = WO[0], ringD = ST[3];
  const irisL = [AM[5], AM[6], AM[7]], irisD = [ST[4], ST[5], ST[6]];
  L.setTransform(1, 0, 0, 1, 0, 0);
  const prx = Math.max(1, (R_ - 1) * 0.62), pry = Math.max(0.8, (R_ - 1) * 0.4);
  const r9 = R_ >= 9, sr = rng(st.seed * 7 + 3);
  const striae = r9 ? Array.from({ length: 16 }, (_, k) => k / 16 * TAU + sr() * 0.3) : null;
  const fx = (ox, oy, w) => { L.fillStyle = w; L.fillRect(ex + ox, ey + oy, 1, 1); };
  // globe : anneau, iris en trois tons, pupille horizontale ; pixel par pixel (la couleur vivante ou terne se choisit selon la distance au centre)
  for (let dy = -R_; dy <= R_; dy++) for (let dx = -R_; dx <= R_; dx++) {
    const rr = Math.hypot(dx, dy); if (rr > R_ + 0.2) continue;
    const alive = rr < gate * R_ + (gr_bay(ex + dx, ey + dy) - 0.5) * 1.3, I = alive ? irisL : irisD;
    let col;
    if ((dx / prx) ** 2 + (dy / pry) ** 2 <= 1) col = alive ? '#05040f' : ST[2];
    else if (rr > R_ - 0.55 || R_ < 3 && rr > R_ - 1.1) col = alive ? ringL : ringD;
    else if (R_ >= 6 && rr <= R_ - 3.4) col = I[2];
    else if (R_ >= 4 && rr <= R_ - 1.8) col = I[1];
    else col = I[0];
    if (!alive && R_ >= 4 && (dx * st.Ls[0] + dy * ly) / R_ < -0.45 && rr > R_ * 0.5 && col !== ST[2] && col !== ringD) col = ST[3];       // croissant d'ombre : la cornée est bombée
    if (r9 && alive && rr > R_ * 0.55 && rr < R_ * 0.86 && col !== '#05040f' && col !== ST[2]) { let a = Math.atan2(dy, dx); if (a < 0) a += TAU; for (const q of striae) { let d = Math.abs(a - q); if (d > Math.PI) d = TAU - d; if (d * rr < 0.55) { col = alive ? AM[4] : ST[3]; break; } } }
    fx(dx, dy, col);
  }
  if (dl < 0.5) {                                                         // éclat de la lumière : un grand, un petit
    const hs = Math.max(0, Math.round(R_ * 0.2)); disc(ex + lx * Math.round(R_ * 0.38), ey - Math.round(R_ * 0.42), hs, WH[3]); if (R_ >= 3) px(ex - lx * Math.round(R_ * 0.4), ey + Math.round(R_ * 0.36), R_ >= 6 ? WH[2] : AM[9]);
    if (R_ >= 9) px(ex + lx * Math.round(R_ * 0.55), ey - Math.round(R_ * 0.2), WH[3]);
  } else if (R_ >= 3) {                                                   // œil terne : un reflet froid en arc sur la cornée et un point clair, la pupille reste éteinte
    px(ex + lx * Math.round(R_ * 0.36), ey - Math.round(R_ * 0.4), NE[2]);
    if (R_ >= 6) { for (let dy = -R_; dy <= 0; dy++) for (let dx = -R_; dx <= R_; dx++) { const rr = Math.hypot(dx, dy), f = (dx * st.Ls[0] + dy * ly) / (rr || 1); if (rr > R_ * 0.56 && rr < R_ * 0.72 && f > 0.72) fx(dx, dy, NE[3]); } px(ex + lx * Math.round(R_ * 0.36) + lx, ey - Math.round(R_ * 0.4), NE[4]); }
  }
  // paupières : la peau de la tête, trois tons (éclat côté lumière, croissant d'ombre à l'opposé), qui dépasse du globe sans anneau sombre
  const lidTone = (dx, dy) => { const f = (dx * st.Ls[0] + dy * ly) / R_; return f > 0.58 ? tLi : f > 0.12 ? tMi : f < -0.42 ? tSh : tBa; };
  const hw0 = dy => Math.floor(Math.sqrt(Math.max(0, R_ * R_ + R_ * 0.6 - dy * dy)));
  if (eff < 0.2) {                                                        // œil fermé : globe bombé, fente courbée qui suit la sphère, pli de peau au-dessus
    for (let dy = -R_; dy <= R_; dy++) { const hw = hw0(dy); for (let dx = -hw; dx <= hw; dx++) fx(dx, dy, lidTone(dx, dy)); }
    const dpt = Math.max(1, Math.round(R_ * 0.3)), yc = Math.round(R_ * 0.12), slit = dx => yc + Math.round(dpt * (1 - (dx / R_) ** 2)) - Math.round(dpt * 0.5);
    for (let dx = -R_ + 1; dx <= R_ - 1; dx++) {
      fx(dx, slit(dx), ringL);
      if (R_ >= 4 && dx * lx > -R_ * 0.5) fx(dx, slit(dx) + 1, tLi);                      // le bord inférieur de la paupière accroche la lumière
      if (R_ >= 5 && Math.abs(dx) < R_ * 0.74) fx(dx, slit(dx) - Math.max(2, Math.round(R_ * 0.42)), tSh);      // pli de peau
    }
    if (R_ >= 3) { const hx = ex + lx * Math.round(R_ * 0.36), hy = ey - Math.round(R_ * 0.5); px(hx, hy, tLi); if (R_ >= 6) px(hx + lx, hy, tLi); }
  } else if (eff < 0.999) {                                               // clignement ou œil mi-clos : l'ouverture est une ellipse horizontale qui se rétrécit
    const ay = Math.max(0.25, R_ * eff), cyo = (1 - st.open) * R_ * 0.35 - st.blink * R_ * 0.3, mask = (dx, dy) => (dx / (R_ + 0.2)) ** 2 + ((dy - cyo) / (ay + 0.35)) ** 2 <= 1;
    for (let dy = -R_; dy <= R_; dy++) {
      const hw = hw0(dy);
      for (let dx = -hw; dx <= hw; dx++) {
        if (mask(dx, dy)) continue;
        const edge = mask(dx, dy + (dy < cyo ? 1 : -1)) || mask(dx + 1, dy) || mask(dx - 1, dy);
        fx(dx, dy, edge ? ringL : (dy < cyo ? (lidTone(dx, dy) === tLi ? tMi : tBa) : lidTone(dx, dy)));
      }
    }
  }
  // voile de givre sur l'œil : de petites plaques (pas du poivre), le centre reste lisible
  if (st.ice > 0.2 && st.info.lvlAt) {
    const lv = st.info.lvlAt(ex, ey), q = gr_ss(0.2, 0.9, lv) * 0.7;
    if (q > 0) for (let dy = -R_; dy <= R_; dy++) for (let dx = -R_; dx <= R_; dx++) {
      const rr = Math.hypot(dx, dy); if (rr > R_ - 0.8 || rr < R_ * 0.5) continue;
      const nz = gr_n2((ex + dx) / 2.6, (ey + dy) / 2.6, st.seed + 5); if (nz < 1 - q * 0.5) continue;
      fx(dx, dy, (dx * st.Ls[0] + dy * ly) / (rr || 1) > 0.45 ? NE[4] : NE[2]);
    }
  }
}
const gr_sg = v => v >= 0 ? 1 : -1;

// ════════════════════════════════════════════════════════════════════════════════════════
// 6. OUTILS DES VUES INTERNES : calque lisse → couleurs d'une palette réduite (pas de mélange parasite) → contour
// ════════════════════════════════════════════════════════════════════════════════════════
const gr_setM = new Map();
function gr_toneSet(cols) {                                                // { rgb, lut } mis en cache pour une liste de couleurs '#rrggbb'
  const key = cols.join(',');
  let S = gr_setM.get(key); if (S) return S;
  const rgb = cols.map(gr_rgb), lut = new Uint8Array(32768);
  for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
    const R_ = r * 8.23, G_ = g * 8.23, B_ = b * 8.23; let best = 0, bd = 1e9;
    for (let i = 0; i < rgb.length; i++) { const p = rgb[i], rm = (R_ + p[0]) / 2, dr = R_ - p[0], dg = G_ - p[1], db = B_ - p[2], d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; if (d < bd) { bd = d; best = i; } }
    lut[(r << 10) | (g << 5) | b] = best;
  }
  S = { rgb, lut }; gr_setM.set(key, S); return S;
}
// ramène les pixels du calque Y (dans la boîte) aux couleurs de la palette réduite ; alpha 0/255 ; renvoie le masque (Uint8Array) et la boîte
function gr_snapLayer(S, bx, by, bw, bh, amp = 6) {
  const x0 = Math.max(0, Math.floor(bx)), y0 = Math.max(0, Math.floor(by)), x1 = Math.min(LW, Math.ceil(bx + bw)), y1 = Math.min(LH, Math.ceil(by + bh)), w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return { x0, y0, w: 0, h: 0, occ: new Uint8Array(0) };
  const id = Y.getImageData(x0, y0, w, h), d = id.data, occ = new Uint8Array(w * h);
  for (let j = 0, p = 0; j < h; j++) for (let i = 0; i < w; i++, p++) {
    if (d[p * 4 + 3] < 128) { d[p * 4 + 3] = 0; continue; }
    occ[p] = 1; const of = (gr_bay(x0 + i, y0 + j) - 0.5) * amp;
    const c = S.rgb[S.lut[((clamp(d[p * 4] + of, 0, 255) >> 3) << 10) | ((clamp(d[p * 4 + 1] + of, 0, 255) >> 3) << 5) | (clamp(d[p * 4 + 2] + of, 0, 255) >> 3)]];
    d[p * 4] = c[0]; d[p * 4 + 1] = c[1]; d[p * 4 + 2] = c[2]; d[p * 4 + 3] = 255;
  }
  Y.putImageData(id, x0, y0);
  return { x0, y0, w, h, occ };
}
function gr_poly2(c, pts, col) { c.fillStyle = col; c.fill(gr_spline(pts)); }
// bruit de valeur 2D lisse (0..1)
function gr_n2(x, y, sd = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = gr_h2(ix, iy, sd), b = gr_h2(ix + 1, iy, sd), c = gr_h2(ix, iy + 1, sd), d = gr_h2(ix + 1, iy + 1, sd);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 7. LE CŒUR : trois cavités (deux oreillettes, un ventricule), tronc artériel et crosses aortiques ; bat, ralentit, s'arrête, repart
// ════════════════════════════════════════════════════════════════════════════════════════
// palettes par état de tonus : 1 vivant, 0,75 lent, 0,4 refroidi, 0 arrêté (pâle, givré)
function gr_heartTones(k) {
  if (k >= 0.9) return { vS: RD[1], vB: RD[2], vL: RD[3], vH: RD[4], vT: RD[5], aS: RD[0], aB: RD[1], aL: RD[2], aH: RD[3], tS: RD[4], tB: SK[4], tL: WH[2], eS: BL[1], eB: BL[2], eL: BL[3], fib: RD[0], spec: WH[3] };
  if (k >= 0.55) return { vS: RD[0], vB: RD[1], vL: RD[2], vH: RD[3], vT: RD[4], aS: DU[0], aB: RD[0], aL: RD[1], aH: RD[2], tS: RD[3], tB: SK[3], tL: SK[4], eS: BL[0], eB: BL[1], eL: BL[2], fib: DU[0], spec: SK[4] };
  if (k >= 0.2) return { vS: DU[1], vB: DU[2], vL: DU[3], vH: ST[4], vT: ST[5], aS: NI[1], aB: DU[1], aL: DU[2], aH: DU[3], tS: DU[3], tB: ST[5], tL: ST[6], eS: NI[2], eB: BL[0], eL: BL[1], fib: NI[1], spec: ST[7] };
  return { vS: ST[3], vB: ST[4], vL: ST[5], vH: ST[6], vT: NE[1], aS: ST[2], aB: ST[3], aL: ST[4], aH: ST[5], tS: ST[5], tB: ST[6], tL: NE[2], eS: ST[2], eB: ST[3], eL: ST[4], fib: ST[2], spec: NE[4] };
}
function gr_heart(cx, cy, s, t, o = {}) {
  const state = o.state || 'live', b = clamp(gr_fin(o.beat, 0));
  const tone = o.tone ?? { live: 1, slow: 0.72, stopped: 0, restart: 1 }[state] ?? 1;
  const T_ = gr_heartTones(tone), moving = state !== 'stopped', bb = moving ? b : 0, light = o.light ?? 1;
  const ll = [0.62 * light, -0.78], lln = Math.hypot(ll[0], ll[1]); ll[0] /= lln; ll[1] /= lln;
  const ox = 0, oy = 6;
  const vx = 1 - 0.2 * bb, vy = 1 - 0.16 * bb, ax = 1 + 0.14 * bb, tw = 1 + 0.16 * bb;
  const V = (x, y) => [ox + (x - ox) * vx, oy + (y - oy) * vy + 2.2 * bb];            // la pointe remonte un peu quand le ventricule se vide
  const A = (x, y, sd) => [x * ax * sd, -8 + (y + 8) * (1 + 0.1 * bb)];
  if (state === 'restart' && b > 0.04 && b < 0.97) {                                          // onde de redémarrage : un anneau doré qui s'élargit à chaque battement
    const rr = (16 + (1 - b) * 26) * s, N = 72; for (let k = 0; k < N; k++) { const an = k / N * TAU; if (gr_bay(k * 3, k) > b * 1.1) continue; px(cx + Math.cos(an) * rr, cy + 8 * s + Math.sin(an) * rr * 0.9, b > 0.5 ? WH[3] : AM[9]); if (b > 0.35 && k % 2) px(cx + Math.cos(an) * (rr + 1.5), cy + 8 * s + Math.sin(an) * (rr + 1.5) * 0.9, AM[7]); }
  }
  if (o.shadow !== false) { L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.fillStyle = 'rgba(5,4,15,0.35)'; L.beginPath(); L.ellipse(cx + 2 * s, cy + 29 * s, 17 * s, 3.2 * s, 0, 0, TAU); L.fill(); L.restore(); }
  layerBegin(); const c = Y; c.setTransform(s, 0, 0, s, cx, cy);
  const cres = (path, w, col, inv) => gr_cres(c, path, ll, w, col, inv);
  // veines
  for (const sd of [-1, 1]) {
    const vp = gr_seg([[sd * 18, -7], [sd * 22.5, -9.5], [sd * 25.5, -13.5]], [5.0, 4.4, 3.8]);                // veines caves : de courts moignons qui disparaissent derrière les oreillettes
    gr_fill(c, vp, T_.eB); cres(vp, 1.6, T_.eL); cres(vp, 1.8, T_.eS, true);
  }
  // crosses aortiques et tronc
  for (const sd of [-1, 1]) {
    const arch = gr_seg([[sd * 1.5, -17], [sd * 6, -21], [sd * 11.5, -22.5], [sd * 16.5, -20]], [4.6 * tw, 4.2 * tw, 3.6, 3.0]);   // un tronc unique qui se divise bas, crosses courtes
    gr_fill(c, arch, T_.tB); cres(arch, 1.5, T_.tL); cres(arch, 1.7, T_.tS, true);
  }
  const trunk = gr_seg([[0, 0], [0, -9], [0, -19]], [7.6 * tw, 6.6 * tw, 6 * tw]);
  gr_fill(c, trunk, T_.tB); cres(trunk, 2.0, T_.tL); cres(trunk, 2.2, T_.tS, true);
  c.strokeStyle = T_.tS; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-2.6 * tw, -7); c.quadraticCurveTo(0, -5.4, 2.6 * tw, -7); c.moveTo(-2.4 * tw, -13); c.quadraticCurveTo(0, -11.4, 2.4 * tw, -13); c.stroke();
  // oreillettes (minces, plus sombres, un peu plus grandes à droite de l'image)
  const atria = [];
  for (const sd of [-1, 1]) {
    const k = sd < 0 ? 0.9 : 0.85, pts = [[-3, -1], [-4, -9], [-9, -15], [-16, -17], [-23, -13], [-26, -6], [-22, 0], [-14, 4], [-6, 3]].map(([x, y]) => A(sd * -x * k, y, 1));
    const ap = gr_spline(pts); atria.push(ap);
    gr_fill(c, ap, T_.aB); cres(ap, 4.2, T_.aL); cres(ap, 1.8, T_.aH); cres(ap, 3.4, T_.aS, true);
    c.save(); c.clip(ap); c.strokeStyle = T_.aS; c.lineWidth = 0.6;                                // nervures de la paroi mince
    for (let i = 0; i < 4; i++) { const a0 = A(sd * (6 + i * 4.5), -3 - i * 0.6, 1), a1 = A(sd * (13 + i * 3.6), -13 + i * 0.8, 1); c.beginPath(); c.moveTo(a0[0], a0[1]); c.quadraticCurveTo((a0[0] + a1[0]) / 2 + sd * 2, (a0[1] + a1[1]) / 2 - 3, a1[0], a1[1]); c.stroke(); }
    c.restore();
  }
  // ventricule : cône musclé, pointe en bas
  const vp = gr_spline([[0, -4], [8, -4.4], [14, 2], [14.4, 9], [10, 17], [4, 23], [0, 25], [-4, 23], [-10, 17], [-14.4, 9], [-14, 2], [-8, -4.4]].map(([x, y]) => V(x, y)));
  gr_fill(c, vp, T_.vB); cres(vp, 5.0, T_.vL); cres(vp, 2.2, T_.vH); cres(vp, 6.4, T_.vS, true);
  c.save(); c.clip(vp);
  c.lineCap = 'round';                                                                              // trois fibres sombres courbes et deux courbes de reflet musculaire (pas de rayures parallèles)
  c.strokeStyle = T_.fib; c.lineWidth = 0.65; c.globalAlpha = 0.8;
  for (const i of [-1.3, 0.1, 1.5]) { const p0 = V(i * 5.2 - 1, -2), p1 = V(i * 4.4 + 3.5, 9), p2 = V(i * 1.7 + 1.5, 21); c.beginPath(); c.moveTo(p0[0], p0[1]); c.quadraticCurveTo(p1[0] + 3, p1[1], p2[0], p2[1]); c.stroke(); }
  c.globalAlpha = 1; c.strokeStyle = T_.vH; c.lineWidth = 0.6;
  { const a0 = V(-9.5, 3), a1 = V(-8.2, 11), a2 = V(-3.2, 19); c.beginPath(); c.moveTo(a0[0], a0[1]); c.quadraticCurveTo(a1[0], a1[1], a2[0], a2[1]); c.stroke(); }
  c.globalAlpha = 0.6; { const a0 = V(6, 1), a1 = V(9.5, 8), a2 = V(5.5, 16); c.beginPath(); c.moveTo(a0[0], a0[1]); c.quadraticCurveTo(a1[0], a1[1], a2[0], a2[1]); c.stroke(); } c.globalAlpha = 1;
  const g0 = V(-6, 5); gr_fill(c, gr_ell(g0[0], g0[1], 2.2, 5.5, 0.5), T_.vT); gr_fill(c, gr_ell(g0[0] - 0.5, g0[1] - 1.5, 0.9, 2.4, 0.5), T_.spec);
  c.restore();
  const info = gr_snapLayer(gr_toneSet(Object.values(T_)), cx - 46 * s, cy - 40 * s, 92 * s, 80 * s, 5);
  layerEnd({ outline: o.outline ?? '#05040f' });
  // givre sur le cœur arrêté
  if (tone < 0.2) {
    for (let k = 0; k < 5; k++) { const qx = info.x0 + Math.floor((0.25 + 0.5 * gr_h(k, 75)) * info.w), qy = info.y0 + Math.floor((0.12 + 0.45 * gr_h(k, 76)) * info.h); if (!info.occ[(qy - info.y0) * info.w + (qx - info.x0)]) continue; px(qx, qy, WH[3]); px(qx + 1, qy, NE[3]); px(qx, qy + 1, CY[4]); }       // quelques paillettes de givre fixes
    for (let k = 0; k < 14; k++) { const px_ = info.x0 + Math.floor(gr_h(k, 71) * info.w), py_ = info.y0 + Math.floor(gr_h(k, 72) * info.h); if (!info.occ[(py_ - info.y0) * info.w + (px_ - info.x0)]) continue; const a = Math.pow(Math.max(0, Math.sin(t * (1.7 + k * 0.31) + k * 2.1)), 6); if (a > 0.3) { px(px_, py_, WH[3]); if (a > 0.7) { px(px_ - 1, py_, CY[4]); px(px_ + 1, py_, CY[4]); px(px_, py_ - 1, CY[4]); px(px_, py_ + 1, CY[4]); } } }
  }
  return { ventricle: [cx, cy + 10 * s], top: [cx, cy - 26 * s], mask: (qx, qy) => { const i = Math.round(qx) - info.x0, j = Math.round(qy) - info.y0; return i >= 0 && j >= 0 && i < info.w && j < info.h && info.occ[j * info.w + i] > 0; } };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 8. ÉLECTROCARDIOGRAMME : écran à quadrillage, tracé qui défile (les battements viennent de o.beats), ligne plate sans battement
// ════════════════════════════════════════════════════════════════════════════════════════
// forme d'un battement : onde P, complexe QRS (R haute et fine), onde T ; d = secondes depuis le pic R
function gr_ecgShape(d) {
  const g = (m, w, a) => a * Math.exp(-((d - m) * (d - m)) / (2 * w * w));
  return g(-0.17, 0.035, 0.13) + g(-0.032, 0.011, -0.16) + g(0, 0.012, 1) + g(0.03, 0.013, -0.3) + g(0.22, 0.055, 0.28);
}
function gr_ecgAt(tau, beats) { let v = 0; for (let i = 0; i < beats.length; i++) { const d = tau - beats[i]; if (d > -0.4 && d < 0.6) v += gr_ecgShape(d); } return v; }
// o.beats : tableau des instants ABSOLUS des battements (secondes du film) ; o.speed px/s (64) ; o.now position du curseur (fraction de w, 0.86) ; o.col couleur du tracé ;
// o.alarm (défaut : auto, rouge si plus de battement depuis 1,3 s après un premier) ; o.led : voyant qui s'allume à chaque battement ; o.amp amplitude (fraction de h, 0.36)
function gr_ecg(x, y, w, h, t, o = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const beats = o.beats || [], speed = o.speed ?? 64, nowX = x + Math.round(w * (o.now ?? 0.86)), base = y + Math.round(h * 0.6), amp = h * (o.amp ?? 0.36);
  // dernier battement passé : sert à l'alarme et au voyant
  let last = -1e9; for (const b of beats) if (b <= t && b > last) last = b;
  const had = last > -1e8, since = t - last, alarm = o.alarm ?? (had ? since > 1.3 : (beats.length > 0 && t > beats[0] + 0.01 ? true : false));
  // écran
  R(x - 2, y - 2, w + 4, h + 4, ST[2]); R(x - 1, y - 1, w + 2, h + 2, '#05040f'); R(x, y, w, h, GR[0]);
  for (let gx = x + 10; gx < x + w; gx += 10) R(gx, y, 1, h, GR[1]);
  for (let gy = y + 8; gy < y + h; gy += 8) R(x, gy, w, 1, GR[1]);
  for (let gx = x + 5; gx < x + w; gx += 10) for (let gy = y + 4; gy < y + h; gy += 8) px(gx, gy, GR[1]);
  R(x, base, w, 1, GR[1]);
  R(x, y, w, 1, ST[4]); R(x, y, 1, h, ST[4]);                                                   // reflet de la vitre
  const colMain = o.col ?? (alarm ? RD[4] : GR[5]), colGlow = alarm ? RD[1] : GR[2], colHead = alarm ? RD[5] : WH[3];
  // tracé : une colonne par pixel, 4 échantillons par colonne ; le front du tracé est au curseur
  const yAt = [], SUB = 4;
  for (let i = 0; i <= nowX - x - 1; i++) {
    const cxp = x + 1 + i; let mn = 1e9, mx = -1e9;
    for (let k = 0; k < SUB; k++) { const tau = t - (nowX - (cxp + k / SUB)) / speed, v = gr_ecgAt(tau, beats), yy = base - v * amp; mn = Math.min(mn, yy); mx = Math.max(mx, yy); }
    yAt.push([cxp, mn, mx]);
  }
  for (const [cxp, mn, mx] of yAt) { const age = (nowX - cxp) / (w * 0.86); if (age < 0.9) R(cxp, Math.round(mn) - 1, 1, Math.round(mx - mn) + 3, colGlow); }
  let prev = null;
  for (const [cxp, mn, mx] of yAt) {
    const a = Math.round(mn), b = Math.round(mx), pa = prev;
    if (pa !== null) { const lo = Math.min(a, pa), hi = Math.max(b, pa); R(cxp, lo, 1, hi - lo + 1, colMain); } else R(cxp, a, 1, b - a + 1, colMain);
    prev = (mn + mx) / 2 > base ? b : a; if (b - a > 1) prev = Math.round((mn + mx) / 2 > base - 1 ? a : b);
  }
  // pointe du tracé : un éclat blanc au curseur (la valeur du moment)
  { const v = gr_ecgAt(t, beats), hy = Math.round(base - v * amp); R(nowX - 1, hy - 1, 3, 3, colHead); R(nowX, hy, 1, 1, colMain); }
  // curseur et efface : une barre sombre juste devant le front
  R(nowX + 1, y + 1, Math.min(4, x + w - nowX - 2), h - 2, GR[0]);
  // voyant : une pastille qui s'allume à chaque battement (0,18 s)
  { const on = had && since < 0.18; disc(x + w - 6, y + 6, 2, on ? (alarm ? RD[5] : WH[3]) : GR[1]); if (on) disc(x + w - 6, y + 6, 1, GR[6]); else if (alarm && Math.floor(t * 2.5) % 2 === 0) disc(x + w - 6, y + 6, 2, RD[3]); }
  return { alarm, base, nowX };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 9. MOLÉCULES ET CRISTAUX : glucose (hexagone doré à pointes OH), cristal de glace en aiguilles (cyan)
// ════════════════════════════════════════════════════════════════════════════════════════
// o.rot (rad), o.spin (rad/s), o.glow (1), o.t pour le scintillement
function gr_glucose(x, y, s, t, o = {}) {
  const rot = (o.rot ?? 0) + (o.spin ?? 0.25) * t, bob = Math.sin(t * 2 + (o.seed ?? 0)) * 0.5 * s;
  y += bob;
  const R0 = 8 * s, th = Math.max(1, Math.round(1.3 * s)), glow = o.glow ?? 1;
  if (glow > 0) rgrad(x, y, 2, 15 * s, [[0, `rgba(255,200,74,${0.32 * glow})`], [0.5, `rgba(255,150,40,${0.12 * glow})`], [1, 'rgba(255,120,30,0)']], 1, 'lighter');
  const V = []; for (let i = 0; i < 6; i++) { const a = rot + i * TAU / 6 + TAU / 12; V.push([x + Math.cos(a) * R0, y + Math.sin(a) * R0 * 0.82, a]); }
  // substituants : OH sur quatre sommets, CH2OH sur un cinquième, O du cycle (rouge) sur le sixième
  for (let i = 0; i < 6; i++) {
    if (i === 0) continue;
    const [vx, vy, a] = V[i], len = (i === 1 ? 7.5 : 6) * s, ex = vx + Math.cos(a) * len, ey = vy + Math.sin(a) * len * 0.9;
    lineP(vx, vy, ex, ey, '#05040f', th + 2); lineP(vx, vy, ex, ey, AM[7], th);
    if (i === 1) { const fx = ex + Math.cos(a + 0.7) * 4.5 * s, fy = ey + Math.sin(a + 0.7) * 4 * s; lineP(ex, ey, fx, fy, '#05040f', th + 2); lineP(ex, ey, fx, fy, AM[7], th); disc(fx, fy, Math.max(1, Math.round(1.7 * s)), '#05040f'); disc(fx, fy, Math.max(1, Math.round(1.3 * s)), RD[4]); }
    const rr = Math.max(1, Math.round(1.9 * s)); disc(ex, ey, rr + 1, '#05040f'); disc(ex, ey, rr, RD[4]); px(ex - Math.round(rr * 0.3), ey - Math.round(rr * 0.4), WH[3]);
    const hx = ex + Math.cos(a + 0.9) * 3.2 * s, hy = ey + Math.sin(a + 0.9) * 3 * s; disc(hx, hy, Math.max(1, Math.round(0.9 * s)), WH[2]);
  }
  for (let i = 0; i < 6; i++) { const [ax, ay] = V[i], [bx, by] = V[(i + 1) % 6]; lineP(ax, ay, bx, by, '#05040f', th + 2); }
  for (let i = 0; i < 6; i++) { const [ax, ay] = V[i], [bx, by] = V[(i + 1) % 6]; lineP(ax, ay, bx, by, i === 0 || i === 5 ? AM[8] : AM[7], th); }
  for (let i = 1; i < 5; i++) { const [ax, ay] = V[i], [bx, by] = V[i + 1]; lineP(ax + 0.4 * s, ay - 0.5 * s, bx + 0.4 * s, by - 0.5 * s, AM[10], 1); }
  // l'oxygène du cycle : sommet 0, rouge
  { const [ox_, oy_] = V[0], rr = Math.max(2, Math.round(2.2 * s)); disc(ox_, oy_, rr + 1, '#05040f'); disc(ox_, oy_, rr, RD[4]); px(ox_ - 1, oy_ - 1, WH[3]); }
  // reflet doré au centre
  disc(x, y, Math.max(1, Math.round(2 * s)), AM[3]); disc(x, y, Math.max(1, Math.round(1.2 * s)), AM[6]);
}
function gr_icecrystal(x, y, s, o = {}) {
  const rot = o.rot ?? 0.3, arms = o.arms ?? 6, t = o.t ?? 0, len = 8.5 * s, wd = Math.max(1.5, 1.7 * s), light = o.light ?? 1;
  const pulse = Math.pow(Math.max(0, Math.sin(t * 3.1 + (o.seed ?? 0) * 1.7)), 8);
  const needle = (ax, ay, a, L_, W_) => {                                                    // aiguille : losange à deux tons (côté lumière clair, côté ombre cyan)
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, tipx = ax + ux * L_, tipy = ay + uy * L_, mx = ax + ux * L_ * 0.35, my = ay + uy * L_ * 0.35;
    const side = (nx * light * 0.62 + ny * -0.78) > 0 ? 1 : -1;
    poly([[ax, ay], [mx + nx * W_ / 2 * 1.15, my + ny * W_ / 2 * 1.15], [tipx, tipy], [mx - nx * W_ / 2 * 1.15, my - ny * W_ / 2 * 1.15]].map(p => [p[0] + (ux * 0), p[1]]), '#05040f');
    const outer = [[ax, ay], [mx + nx * (W_ / 2 * 1.15 - 0.6), my + ny * (W_ / 2 * 1.15 - 0.6)], [tipx - ux * 0.6, tipy - uy * 0.6], [mx - nx * (W_ / 2 * 1.15 - 0.6), my - ny * (W_ / 2 * 1.15 - 0.6)]];
    poly(outer, CY[2]);
    poly([[ax, ay], [mx + nx * side * (W_ / 2 * 1.15 - 0.6), my + ny * side * (W_ / 2 * 1.15 - 0.6)], [tipx - ux * 0.6, tipy - uy * 0.6], [ax + ux * 0.8, ay + uy * 0.8]], CY[4]);
    lineP(ax + ux * 1, ay + uy * 1, tipx - ux * 1, tipy - uy * 1, WH[3], 1);
  };
  const L2 = [];
  for (let k = 0; k < arms; k++) {
    const a = rot + k * TAU / arms;
    L2.push(() => {
      needle(x, y, a, len, wd);
      if (s >= 0.7) for (const [f, sc] of [[0.45, 0.42], [0.72, 0.28]]) { const bx = x + Math.cos(a) * len * f, by = y + Math.sin(a) * len * f; for (const sd of [-1, 1]) needle(bx, by, a + sd * 1.02, len * sc, wd * 0.7); }
    });
  }
  L2.forEach(f => f());
  disc(x, y, Math.max(1, Math.round(1.1 * s)), WH[3]);
  if (pulse > 0.4) { const r = Math.round(len * 0.9); px(x, y - r, WH[3]); px(x, y + r, WH[3]); px(x - r, y, WH[3]); px(x + r, y, WH[3]); if (pulse > 0.8) { px(x + r * 0.7, y - r * 0.7, CY[4]); px(x - r * 0.7, y + r * 0.7, CY[4]); } }
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 10. CELLULES : amas à membrane et noyau ; ratatinement quand l'eau sort (o.shrink), glace dans les interstices (o.ice), enrobage de sucre (o.glucose), cristaux qui rebondissent (o.bounce)
// ════════════════════════════════════════════════════════════════════════════════════════
// o : n (9), seed, shrink 0..1, glucose 0..1, ice 0..1 (défaut 0,9 × shrink), bounce 0..1 (nombre de cristaux qui viennent buter sur l'enrobage), bg (true : fond et cadre), light (+1), molecules 0..1 (grains de glucose qui flottent)
function gr_cellLayout(x, y, w, h, n, seed) {
  const cols = Math.max(2, Math.round(Math.sqrt(n * w / h))), rows = Math.ceil(n / cols), cw = w / cols, ch = h / rows, out = [];
  for (let k = 0; k < n; k++) {
    const i = k % cols, j = Math.floor(k / cols), off = (j % 2) * 0.5 * cw * 0.5;
    const cx = x + (i + 0.5) * cw + off - cw * 0.12 + (gr_h(k, seed) - 0.5) * cw * 0.28, cy = y + (j + 0.5) * ch + (gr_h(k, seed + 1) - 0.5) * ch * 0.24;
    out.push({ cx: clamp(cx, x + cw * 0.4, x + w - cw * 0.4), cy: clamp(cy, y + ch * 0.4, y + h - ch * 0.4), r: Math.min(cw, ch) * (0.4 + gr_h(k, seed + 2) * 0.1), ph: gr_h(k, seed + 3) * TAU, ph2: gr_h(k, seed + 4) * TAU });
  }
  return out;
}
function gr_cells(x, y, w, h, t, o = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const n = o.n ?? 9, seed = o.seed ?? 5, shrink = clamp(gr_fin(o.shrink, 0)), glu = clamp(gr_fin(o.glucose, 0)), ice = clamp(gr_fin(o.ice, shrink * 0.9)), light = o.light ?? 1, bounce = clamp(o.bounce ?? 0);
  const cells = gr_cellLayout(x, y, w, h, n, seed), eff = shrink * (1 - 0.88 * glu);
  if (o.bg !== false) { R(x - 2, y - 2, w + 4, h + 4, ST[3]); R(x - 1, y - 1, w + 2, h + 2, '#05040f'); R(x, y, w, h, NI[2]); ditherRect(x, y, w, h, NI[3], 0.18); R(x, y, w, 1, ST[4]); R(x, y, 1, h, ST[4]); }
  L.save(); L.beginPath(); L.rect(x, y, w, h); L.clip();
  // le liquide autour des cellules : de la glace s'y forme (aiguilles cyan qui grossissent)
  const shape = (c, rr, kk) => { const pts = [], N = 40; for (let q = 0; q < N; q++) { const a = q / N * TAU, wob = 1 + 0.07 * Math.sin(3 * a + c.ph) + 0.05 * Math.sin(5 * a + c.ph2), crk = eff * 0.16 * Math.sin(9 * a + c.ph + t * 0.6) + eff * 0.08 * Math.sin(13 * a + c.ph2); pts.push([c.cx + Math.cos(a) * rr * (wob + crk), c.cy + Math.sin(a) * rr * (wob + crk) * 0.95]); } return pts; };
  const inCell = (px_, py_, pad) => cells.some(c => { const d = Math.hypot(px_ - c.cx, py_ - c.cy); return d < c.r * 1.2 + pad; });
  if (ice > 0.05) {
    const nI = Math.round(ice * 46), R_ = rng(seed * 11 + 3);
    for (let k = 0; k < nI; k++) { const px_ = x + R_() * w, py_ = y + R_() * h, L0 = (2.5 + R_() * 5.5) * (0.4 + ice * 1.0), a0 = R_() * TAU; if (inCell(px_, py_, 1 + L0 * 0.4)) continue; for (let q = 0; q < 3; q++) { const a = a0 + q * Math.PI / 3, ex = Math.cos(a) * L0, ey = Math.sin(a) * L0; lineP(px_ - ex, py_ - ey, px_ + ex, py_ + ey, CY[2], 1); lineP(px_ - ex * 0.6, py_ - ey * 0.6 - 1, px_ + ex * 0.8, py_ + ey * 0.8 - 1, CY[4], 1); } px(px_, py_, WH[3]); }
  }
  // cellules
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i], shr = 1 - 0.36 * eff, r = c.r * shr, lx = light, cx_ = c.cx, cy_ = c.cy;
    // enrobage de sucre : anneau doré qui grossit, lueur, grains
    if (glu > 0.02) {
      const rc = r + 1.5 + 3.4 * glu;
      rgrad(cx_, cy_, r * 0.9, rc * 1.5, [[0, `rgba(255,214,90,${0.08 * glu})`], [0.7, `rgba(255,190,60,${0.1 * glu})`], [1, 'rgba(255,160,40,0)']], 1, 'lighter');
      poly(shape(c, rc + 1, 0), '#05040f'); poly(shape(c, rc, 0), AM[7]); poly(shape(c, rc - 0.9, 0), AM[8]); poly(shape({ ...c, cx: c.cx - lx * 0.8, cy: c.cy + 0.6 }, rc - 1.8, 0), AM[6]);
      const nG = Math.round(8 + 22 * glu); for (let k = 0; k < nG; k++) { const a = k / nG * TAU + t * 0.4 + c.ph, rr_ = rc + 0.6 + 1.2 * Math.sin(t * 2 + k); px(cx_ + Math.cos(a) * rr_, cy_ + Math.sin(a) * rr_ * 0.95, k % 3 === 0 ? WH[3] : AM[9]); }
    }
    // membrane, cytoplasme (plus sombre et plus dense quand la cellule perd son eau), reflet, noyau
    poly(shape(c, r + 1.2, 0), '#05040f'); poly(shape(c, r + 0.4, 0), eff > 0.3 ? GR[1] : GR[2]);
    const cyt = eff > 0.55 ? [GR[2], GR[3], GR[4]] : eff > 0.2 ? [GR[3], GR[4], GR[5]] : [GR[4], GR[5], LM[5]];
    poly(shape(c, r - 0.7, 0), cyt[0]);
    poly(shape({ ...c, cx: c.cx + lx * r * 0.1, cy: c.cy - r * 0.12 }, r * 0.82, 0), cyt[1]);
    poly(shape({ ...c, cx: c.cx + lx * r * 0.26, cy: c.cy - r * 0.3 }, r * 0.42, 0), cyt[2]);
    for (let k = 0; k < 7; k++) { const a = c.ph + k * 2.4, d = r * (0.45 + 0.35 * gr_h(k, i + seed)), gx = cx_ + Math.cos(a) * d, gy = cy_ + Math.sin(a) * d * 0.9; px(gx, gy, k % 2 ? GR[6] : AM[7]); }   // organites
    const nr = r * 0.36, nx_ = cx_ - lx * r * 0.06 + Math.sin(c.ph) * r * 0.05, ny_ = cy_ + r * 0.04;
    ell(nx_, ny_, nr + 1, nr * 0.92 + 1, '#05040f'); ell(nx_, ny_, nr, nr * 0.92, DU[3]); ell(nx_ + lx * nr * 0.18, ny_ - nr * 0.16, nr * 0.7, nr * 0.62, DU[4]); ell(nx_ + lx * nr * 0.35, ny_ - nr * 0.35, Math.max(1, nr * 0.28), Math.max(1, nr * 0.22), DU[6]); disc(nx_ - lx * nr * 0.25, ny_ + nr * 0.2, Math.max(1, Math.round(nr * 0.26)), DU[1]);
    // membrane : liseré clair côté lumière
    const mem = shape(c, r + 0.4, 0); for (let q = 0; q < mem.length; q++) { const a = q / mem.length * TAU, f = Math.cos(a) * lx * 0.62 - Math.sin(a) * 0.78; if (f > 0.55) px(mem[q][0], mem[q][1], GR[6]); }
  }
  // grains de glucose qui flottent entre les cellules
  if ((o.molecules ?? 0) > 0) { const m = Math.round(o.molecules * 7); for (let k = 0; k < m; k++) { const px_ = x + 6 + ((gr_h(k, seed + 30) * w * 0.95 + t * (3 + k)) % (w - 12)), py_ = y + 8 + (gr_h(k, seed + 31) * (h - 16)) + Math.sin(t * 1.4 + k) * 3; if (!inCell(px_, py_, 2)) gr_glucose(px_, py_, 0.55, t, { glow: 0.8, seed: k, spin: 0.6 }); } }
  // cristaux de glace qui viennent buter sur l'enrobage doré (ou qui percent la membrane s'il n'y a pas de sucre)
  const nB = Math.round(bounce * 5);
  for (let k = 0; k < nB; k++) {
    const c = cells[(k * 3 + 1) % cells.length], P_ = 1.9 + 0.26 * k, ph = (((t / P_) + k * 0.37) % 1 + 1) % 1, th = gr_h(k, seed + 20) * TAU, r = c.r * (1 - 0.36 * eff);
    const rc = r + 2.8 + 3.4 * glu, rPierce = r * (0.55 - 0.1 * Math.sin(k)), rContact = glu > 0.3 ? rc : lerp(rPierce, rc, clamp(glu * 3)), rFar = r * 3.4;
    const dist = ph < 0.45 ? lerp(rFar, rContact, eo(ph / 0.45)) : lerp(rContact, rFar, ei((ph - 0.45) / 0.55));
    const drift = Math.sin(ph * TAU) * 0.18, ax = th + drift, qx = c.cx + Math.cos(ax) * dist, qy = c.cy + Math.sin(ax) * dist * 0.95;
    gr_icecrystal(qx, qy, 0.5, { rot: t * (1.6 + k * 0.3) + k, t, seed: k });
    if (glu > 0.3 && ph > 0.42 && ph < 0.58) { const u = (ph - 0.42) / 0.16, rr = 2 + 6 * u, ccx = c.cx + Math.cos(th) * rContact, ccy = c.cy + Math.sin(th) * rContact * 0.95; for (let q = 0; q < 8; q++) { const a = q / 8 * TAU; px(ccx + Math.cos(a) * rr, ccy + Math.sin(a) * rr, u < 0.6 ? WH[3] : AM[9]); } }
  }
  L.restore();
  if (o.bg !== false) { R(x, y, w, 1, ST[5]); R(x, y, 1, h, ST[5]); }
  return { cells };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 11. POUMONS : deux sacs qui se gonflent (o.inflate 0..1, défaut : respiration automatique) ; o.state 'live' | 'stopped' (pâles, dégonflés)
// ════════════════════════════════════════════════════════════════════════════════════════
function gr_lungs(cx, cy, s, t, o = {}) {
  // deux sacs ovales à paroi mince et translucide (alvéolage en nid d'abeille à l'intérieur), attachés à un très court conduit : pas de longue trachée, pas de ramification (la grenouille respire en pompant avec la gorge)
  const st = o.state || 'live', live = st !== 'stopped', k = clamp(o.inflate ?? (live ? gr_breath(t, 0.7) : 0));
  const T_ = live ? { b: SK[4], l: WH[1], h: WH[3], s: RD[5], d: RD[4], v: RD[3], tr: RD[5], trs: RD[4], trl: SK[4] } : { b: NE[0], l: NE[2], h: NE[4], s: ST[5], d: ST[4], v: ST[4], tr: NE[1], trs: ST[5], trl: NE[3] };
  const sc = live ? 1 + 0.24 * k : 0.82, hs = live ? 1 + 0.1 * k : 0.86;
  layerBegin(); const c = Y; c.setTransform(s, 0, 0, s, cx, cy);
  const ll = [0.62, -0.78], n = Math.hypot(ll[0], ll[1]); ll[0] /= n; ll[1] /= n;
  const duct = gr_seg([[0, -17], [0, -13], [0, -10]], [4.4, 4.4, 4.8]); gr_fill(c, duct, T_.tr); gr_cres(c, duct, ll, 1.2, T_.trl); gr_cres(c, duct, ll, 1.4, T_.trs, true);
  for (const sd of [-1, 1]) {
    const stub = gr_seg([[0, -10], [sd * 2.6, -9], [sd * 5, -8]], [3.4, 3.0, 2.8]); gr_fill(c, stub, T_.tr); gr_cres(c, stub, ll, 1, T_.trl); gr_cres(c, stub, ll, 1.1, T_.trs, true);
    const L_ = gr_spline([[2, -7], [5, -11], [10, -9.5], [15, -3], [17.2, 7], [14.6, 17], [9, 21.5], [4.6, 17.5], [3, 8], [2, 0]].map(([x, y]) => [sd * x * sc, -9 + (y + 9) * hs]));
    gr_fill(c, L_, T_.b); gr_cres(c, L_, ll, 3.4, T_.l); gr_cres(c, L_, ll, 1.3, T_.h); gr_cres(c, L_, ll, 3.2, T_.s, true);
    c.save(); c.clip(L_);
    c.strokeStyle = T_.d; c.lineWidth = 0.42; c.globalAlpha = 0.85;                               // alvéoles : un nid d'abeille fin
    const hx = 4.5 * sc, hy = 3.9 * hs;
    for (let r = -3; r <= 8; r++) for (let q = 0; q <= 5; q++) {
      const x = sd * (3.5 * sc + q * hx + (r & 1 ? hx / 2 : 0)), y = -9 + 3 + r * hy; c.beginPath();
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + TAU / 12, px_ = x + Math.cos(a) * 2.5 * sc, py_ = y + Math.sin(a) * 2.5 * hs; i ? c.lineTo(px_, py_) : c.moveTo(px_, py_); }
      c.closePath(); c.stroke();
    }
    c.globalAlpha = 1; c.strokeStyle = T_.v; c.lineWidth = 0.5;                                    // un vaisseau le long de la paroi
    c.beginPath(); c.moveTo(sd * 4 * sc, -6); c.quadraticCurveTo(sd * 8.5 * sc, 4, sd * 7.6 * sc, 16 * hs - 4); c.stroke();
    c.restore();
  }
  const info = gr_snapLayer(gr_toneSet(Object.values(T_)), cx - 36 * s, cy - 32 * s, 72 * s, 60 * s, 5);
  layerEnd({ outline: o.outline ?? '#05040f' });
  return { x: cx, y: cy, k };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 12. ICÔNE DE CASE DU CARNET (17 × 17 px, couleurs exactes, contour sombre) : la tête de la grenouille des bois, de trois quarts, avec son masque sombre
// ════════════════════════════════════════════════════════════════════════════════════════
const gr_ICON = [                                       // . vide · o contour · b brun · l brun clair (lèvre) · d brun ombre · m masque · M masque profond · c crème (gorge) · g iris · G iris sombre · p pupille · w éclat
  '.................',
  '...oooo...oooo...',
  '..owggGo.owggGo..',
  '..ogppGo.ogppGo..',
  '..ogppGo.ogppGo..',
  '..oGgGGo.oGgGGo..',
  '.lbooooblboooobl.',
  'ommmlllllllllmmmo',
  'oMMmbbbbbbbbbmMMo',
  'omMmbbbdbdbbbmMmo',
  'ommlllllllllllmmo',
  'ooooooooooooooooo',
  '..odddcccccdddo..',
  '...oodcccccdoo...',
  '.....ooooooo.....',
  '.................',
  '.................',
];
function gr_icon(cx, cy) {
  const pal = { o: '#05040f', b: WO[5], l: WO[6], d: WO[4], m: WO[1], M: WO[0], c: SK[4], C: WH[1], g: AM[7], G: AM[6], p: '#05040f', w: WH[3] };
  const x0 = Math.round(cx) - 8, y0 = Math.round(cy) - 8;
  for (let j = 0; j < 17; j++) for (let i = 0; i < 17; i++) { const ch = gr_ICON[j][i]; if (ch !== '.') px(x0 + i, y0 + j, pal[ch]); }
}
ICONES[0] = gr_icon;
