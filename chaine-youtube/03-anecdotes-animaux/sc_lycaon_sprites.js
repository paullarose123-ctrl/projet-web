'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_lycaon_sprites.js — le LYCAON (Lycaon pictus), la meute et les accessoires du vote (segment Afrique). Préfixe ly_.
   Tout se dessine sur L (270 × 480) dans draw(u, t) (AVANT le tramage), sauf ly_atchoum et ICONES[2] (dans ui(), pixels nets). Fonctions pures du temps : aucun Math.random ni Date (hasard = graine).

   ly_dog(cx, cy, s, t, o)     un lycaon de profil, tourné vers la DROITE (o.flip : vers la gauche). (cx, cy) = sol sous le centre du tronc ; s = 1 → ≈ 145 px du museau au bout de la queue, 79 px au garrot
                               (60 à 78 cm), ≈ 108 px oreilles comprises ; s = 0,36 → 50 px (meute au loin), s = 1,5 → 218 px (gros plan).
                               o.pose   'stand' | 'lie' (couché, tête relevée ; o.rest 0..1 pose la tête sur les pattes, yeux fermés) | 'sit' | 'look' (tête haute, oreilles pointées) | 'sneeze' | 'greet' (tête basse à hauteur d'épaule, oreilles
                                        rabattues, queue qui bat, gueule entrouverte) | 'walk' | 'trot' | 'run' (galop). Une posture d'attitude (stand, look, sneeze, greet) devient mobile avec o.gait 'walk' | 'trot' | 'run'.
                               o.ph     phase de marche (cycles ; 0 à 1) — les pieds ne glissent pas si cx avance de ly_gait(…).x × s ; sans o.ph, la phase vient de t.
                               o.seed   individu : dispose les taches noires / fauves / blanches, la couleur du bas des pattes, de la queue et du cou (déterministe) ; chaque graine = un motif différent.
                               o.flip, o.rim (0..1 : liseré de contre-jour, 1), o.light (±1 : côté du soleil, défaut selon o.env), o.shadow (0..1 : ombre au sol, 1), o.env ('savannaDawn'), o.fog (0..1 : fondu vers la brume : individus lointains),
                               o.sil (0..1 : contre-jour, tout vire à la silhouette violette), o.outline (couleur du contour, défaut sombre ; null = pas de contour),
                               o.ear (−1 oreilles couchées … 0 repos … 1 dressées/pointées ; défaut selon la pose + petits mouvements) , o.tail (0..1 : amplitude du battement, défaut selon la pose), o.sneeze (−0,5..1 : inspiration puis saccade ;
                               voir ly_sneezeEnv(u)), o.mouth (0..1 gueule ouverte), o.eye (0 fermé … 1 ouvert ; défaut : cligne tout seul), o.look (−1..1 : tête plus basse / plus haute), o.t0 (début d'un éternuement automatique).
                               Renvoie { T(x, y) → [x, y] écran d'un point du repère (x vers l'avant, y vers le bas, sol en y = 0), nose, mouth, eye, head, ear, tail, back, w, dir }.
   ly_gait(t, o)               { ph, x, f, A, d } : o.gait 'walk' | 'trot' | 'run' ; x = distance parcourue en px à s = 1 depuis o.t0 (cx = x0 + sens × x × s).
   ly_sneezeEnv(u)             enveloppe d'un éternuement (u = secondes depuis le départ de la saccade, négatif avant) : −0,4 (inspiration) → 1 → 0.
   ly_pack(t, o) / ly_packLayout(o)   place N lycaons (profondeur, tailles, motifs, poses) de façon déterministe : voir l'en-tête de la fonction.
   ly_ballot(cx, cy, s, t, o)  urne de vote (fente, pan de bois, étiquette) et bulletin « OUI » qui tombe dans la fente (o.fall 0..1).
   ly_nose(cx, cy, s, t, o)    gros plan du museau de face : truffe noire humide et ses reflets, narines qui se plissent, moustaches, éternuement (o.sneeze), bulletin collé (o.ballot).
   ly_sneezeFx(x, y, t0, t, o) petit nuage de gouttelettes dans la lumière rasante de l'aube (draw) ; ly_atchoum(x, y, p, o) le texte « ATCHOUM » en pixels nets (ui).
   ICONES[2]                   icône 17 × 17 du carnet (tête de lycaon de face).
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ───────────────────────── outils ─────────────────────────
const ly_rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ly_hex = r => '#' + r.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function ly_snap(h) { const r = ly_rgb(h); return PAL_HEX[LUT[((r[0] >> 3) << 10) | ((r[1] >> 3) << 5) | (r[2] >> 3)]]; }
function ly_mix(a, b, k) { const A = ly_rgb(a), B = ly_rgb(b); return ly_snap(ly_hex(A.map((v, i) => v + (B[i] - v) * k))); }
const ly_mixRaw = (a, b, k) => { const A = ly_rgb(a), B = ly_rgb(b); return ly_hex(A.map((v, i) => v + (B[i] - v) * k)); };
function ly_h(i, s = 0) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
const ly_norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const ly_frac = v => v - Math.floor(v);
const ly_scr = mkCanvas(), ly_S = ly_scr.getContext('2d', { willReadFrequently: true });
let ly_BB = [0, 0, LW, LH];                                          // zone de travail (pixels écran) : limite le coût du calque et des croissants

function ly_layerBegin() { Y.setTransform(1, 0, 0, 1, 0, 0); Y.globalAlpha = 1; Y.globalCompositeOperation = 'source-over'; Y.filter = 'none'; const B = ly_BB; Y.clearRect(B[0] - 2, B[1] - 2, B[2] - B[0] + 4, B[3] - B[1] + 4); }
function ly_layerEnd(o = {}) {
  const B = ly_BB, x0 = Math.max(0, B[0] - 1), y0 = Math.max(0, B[1] - 1), x1 = Math.min(LW, B[2] + 1), y1 = Math.min(LH, B[3] + 1), w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  const id = Y.getImageData(x0, y0, w, h), d = id.data;
  for (let i = 3; i < d.length; i += 4) { const a = d[i]; if (a) d[i] = a >= 128 ? 255 : 0; }
  if (o.outline) {
    const oc = ly_rgb(o.outline), add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = y * w + x; if (d[p * 4 + 3]) continue; if ((x > 0 && d[(p - 1) * 4 + 3]) || (x < w - 1 && d[(p + 1) * 4 + 3]) || (y > 0 && d[(p - w) * 4 + 3]) || (y < h - 1 && d[(p + w) * 4 + 3])) add.push(p); }
    for (const p of add) { d[p * 4] = oc[0]; d[p * 4 + 1] = oc[1]; d[p * 4 + 2] = oc[2]; d[p * 4 + 3] = 255; }
  }
  Y.putImageData(id, x0, y0);
  L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(lay, x0, y0, w, h, x0, y0, w, h);
}
// croissant : la partie de path qui n'est PAS couverte par path décalé de (dx, dy) (donc du côté opposé au décalage), floutée de blur px et bornée à path
function ly_cres(c, path, col, dx, dy, blur = 0, alpha = 1) {
  const S = ly_S, B = ly_BB, w = B[2] - B[0], h = B[3] - B[1];
  S.setTransform(1, 0, 0, 1, 0, 0); S.globalCompositeOperation = 'source-over'; S.filter = 'none'; S.globalAlpha = 1; S.clearRect(B[0], B[1], w, h);
  S.setTransform(c.getTransform());
  S.fillStyle = col; S.fill(path);
  S.globalCompositeOperation = 'destination-out'; S.translate(dx, dy); S.fill(path);
  S.globalCompositeOperation = 'source-over'; S.setTransform(1, 0, 0, 1, 0, 0);
  c.save(); c.clip(path); c.setTransform(1, 0, 0, 1, 0, 0);
  if (blur > 0.85) c.filter = `blur(${blur.toFixed(2)}px)`;
  c.globalAlpha = alpha; c.drawImage(ly_scr, B[0], B[1], w, h, B[0], B[1], w, h);
  c.restore();
}
// courbe de Catmull-Rom FERMÉE passant par tous les points
function ly_spline(pts) {
  const p = new Path2D(), n = pts.length; p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  p.closePath(); return p;
}
// courbe fermée lisse passant près des points (passage par les milieux : plus ronde, sans surépaisseur)
function ly_smooth(pts) {
  const p = new Path2D(), n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m0 = mid(pts[n - 1], pts[0]);
  p.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const a = pts[i], m = mid(a, pts[(i + 1) % n]); p.quadraticCurveTo(a[0], a[1], m[0], m[1]); }
  p.closePath(); return p;
}
function ly_cr(pts, n = 5) {                                                      // points interpolés (Catmull-Rom ouvert) : n points par intervalle
  const out = [], m = pts.length;
  for (let i = 0; i < m - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(m - 1, i + 2)];
    for (let k = 0; k < n; k++) { const f = k / n, f2 = f * f, f3 = f2 * f; out.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * f + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * f2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * f3))); }
  }
  out.push(pts[m - 1].slice()); return out;
}
function ly_limb(pts, ws, n = 5) {                                                // patte / queue à contour lisse : ligne médiane et largeurs interpolées
  const cp = ly_cr(pts, n), wp = ly_cr(ws.map((w, i) => [i, w]), n).map(q => Math.max(0.3, q[1]));
  return polyPath(limb(cp, wp));
}
const ly_ell = (cx, cy, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); return p; };
function ly_ik(a, b, l1, l2, bend) {                                              // deux os : renvoie l'articulation intermédiaire (bend ±1 : de quel côté elle plie)
  const dx = b[0] - a[0], dy = b[1] - a[1], dd = Math.hypot(dx, dy) || 0.001, d = Math.max(0.001, Math.min(dd, l1 + l2 - 0.05)), k = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - k * k)), ux = dx / dd, uy = dy / dd;
  return [a[0] + ux * k - uy * h * bend, a[1] + uy * k + ux * h * bend];
}
const ly_rot = (p, pv, a) => { const dx = p[0] - pv[0], dy = p[1] - pv[1], cs = Math.cos(a), sn = Math.sin(a); return [pv[0] + dx * cs - dy * sn, pv[1] + dx * sn + dy * cs]; };

// ───────────────────────── couleurs : tout est ramené d'avance à la palette ─────────────────────────
// trois pelages (fauve = jaune-brun, noir, blanc) × tons (lumière, milieu, ombre, creux) ; teintés par la lumière et l'ombre de l'ambiance, fondus dans la brume (fog) ou vers la silhouette (sil)
const ly_palM = new Map();
function ly_pal(env, fog = 0, sil = 0) {
  const fq = Math.round(clamp(fog) * 20) / 20, sq = Math.round(clamp(sil) * 20) / 20, key = env + '|' + fq + '|' + sq;
  let C = ly_palM.get(key); if (C) return C;
  const E = fl_env({ env }), sh = E.shadow, lit = E.lit, mist = E.mist, sc = sq > 0 ? ly_mix(DU[0], WO[0], 0.35) : null;
  const T = (c, k = 0, st = sc) => {                                                // k : 0 neutre, > 0 vers la lumière, < 0 vers l'ombre ; st : couleur de silhouette de cette famille (contre-jour)
    let r = c; if (k > 0) r = ly_mix(r, lit, k); else if (k < 0) r = ly_mix(r, sh, -k);
    if (fq > 0) r = ly_mix(r, mist, fq * 0.8);
    if (sq > 0) r = ly_mix(r, st, sq);
    return r;
  };
  const sT = ly_mix(WO[3], DU[1], 0.55), sW = DU[2];
  C = {
    env, E, fq, sq,
    tan: { hi: T(WO[6], 0.42, sT), mid: T(WO[6], 0, sT), lo: T(WO[4], -0.12, sT), deep: T(WO[3], -0.32, sT) },
    blk: { hi: T(WO[3], 0.1), mid: T(WO[1], 0), lo: T(WO[0], -0.1), deep: T('#05040f', 0) },
    wht: { hi: T(WH[2], 0.3, sW), mid: T(WH[1], 0, sW), lo: T(ST[6], -0.3, sW), deep: T(ST[5], -0.45, sW) },
    brn: { hi: T(WO[5], 0.3, sT), mid: T(WO[4], 0, sT), lo: T(WO[3], -0.2, sT), deep: T(WO[1], -0.2, sT) },      // face et oreilles : brun
    earIn: T(SK[2], 0), mouth: T(RD[1], 0), tongue: T(RD[4], 0), tongueLo: T(RD[2], 0), teeth: T(WH[2], 0),
    line: T('#05040f', 0), rim: fq > 0 ? ly_mix(E.rim, mist, fq * 0.5) : ly_snap(E.rim), shadowCol: ly_mixRaw(sh, '#05040f', 0.35), litCol: lit,
    sh: T(sh, 0),
  };
  ly_palM.set(key, C); return C;
}
const LY_KEYS = { t: 'tan', k: 'blk', w: 'wht', b: 'brn' };

// ───────────────────────── pelage : un motif par individu (graine) ─────────────────────────
// blobs : taches irrégulières dans le repère du tronc debout (x vers l'avant, sol en y = 0) ; neck : taches dans le repère du cou ; legs : haut, chaussette, bande ; tail ; head
const ly_coatM = new Map();
function ly_blob(r, cx, cy, rx, ry, rot, n = 9) {                                  // polygone irrégulier (rayons modulés) à lisser
  const pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 0.72 + 0.5 * r(), x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k; pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  return pts;
}
function ly_coat(seed) {
  if (ly_coatM.has(seed)) return ly_coatM.get(seed);
  const r = rng(seed * 7919 + 13), roll = r(), base = roll < 0.34 ? 't' : roll < 0.72 ? 'k' : 'w';
  const other = c => { const q = r(); if (c === 't') return q < 0.62 ? 'k' : 'w'; if (c === 'k') return q < 0.55 ? 't' : 'w'; return q < 0.5 ? 'k' : 't'; };
  const blobs = [];
  const xs = [-33, -20, -7, 6, 19, 31], ys = [-69, -55, -43];
  for (let j = 0; j < ys.length; j++) for (let i = 0; i < xs.length; i++) {
    if (r() < (base === 'k' ? 0.64 : 0.44)) continue;
    const col = r() < 0.74 ? other(base) : (base === 'k' ? 'w' : 'k');
    const cx = xs[i] + (r() - 0.5) * 9, cy = ys[j] + (r() - 0.5) * 7, rx = 5.5 + r() * 7.5, ry = 5 + r() * 6, rot = (r() - 0.5) * 1.3;
    blobs.push({ col, pts: ly_blob(r, cx, cy, rx, ry, rot, 9) });
  }
  const nroll = r(), nbase = nroll < 0.5 ? 'k' : nroll < 0.82 ? 't' : 'w';
  const neck = { base: nbase, blobs: [] };
  for (let i = 0; i < 3; i++) { const col = nbase === 'k' ? (r() < 0.6 ? 't' : 'w') : nbase === 't' ? (r() < 0.7 ? 'k' : 'w') : 'k'; neck.blobs.push({ col, pts: ly_blob(r, 3 + i * 8 + (r() - 0.5) * 4, (r() - 0.5) * 10, 4.5 + r() * 4, 4 + r() * 5, r() * 1.5, 8) }); }
  const pickTop = () => { const q = r(); return q < 0.45 ? 't' : q < 0.7 ? 'k' : 'w'; }, pickSock = () => { const q = r(); return q < 0.5 ? 'w' : q < 0.75 ? 't' : 'k'; };
  const legs = [0, 1, 2, 3].map(() => ({ top: pickTop(), sock: pickSock(), sockAt: 0.5 + r() * 0.22, blob: r() < 0.45 ? other('t') : null, stripe: r() < 0.3 }));
  const tq = r(), tail = { base: tq < 0.55 ? 't' : 'k', band: 'k', bandOn: r() < 0.82, f1: 0.3 + r() * 0.08, f2: 0.62 + r() * 0.1 };
  const head = { cheek: r() < 0.72 ? 'b' : 't', throat: r() < 0.4 ? 'w' : (r() < 0.5 ? 't' : 'k'), chin: r() < 0.35, earIn: r() < 0.5 ? 'p' : 'w' };
  const o = { seed, base, blobs, neck, legs, tail, head }; ly_coatM.set(seed, o); return o;
}

// ───────────────────────── attitudes (tête, oreilles, queue, gueule) et allures ─────────────────────────
// an : angle du cou (0 = horizontal vers l'avant, < 0 = vers le haut) ; nl : longueur du cou ; ah : tangage de la tête (> 0 : museau vers le bas) ; ear : −1 couchées … 1 pointées ;
// ta, tc : angle de départ et courbure de la queue (ta = π : horizontale vers l'arrière ; ta ≈ 2,5 : pendante) ; wag : battement ; mouth : gueule ; dip, hdip : avant / arrière abaissés ; eye : ouverture.
const LY_ATT = {
  stand: { an: -0.50, nl: 20, ah: 0.05, ear: 0.45, ta: 2.78, tc: -0.95, wag: 0.12, mouth: 0, dip: 0, hdip: 0, eye: 1 },
  look: { an: -0.92, nl: 21, ah: -0.16, ear: 1.0, ta: 2.80, tc: -0.55, wag: 0.0, mouth: 0, dip: -1.5, hdip: 0, eye: 1 },
  sneeze: { an: -0.50, nl: 20, ah: 0.05, ear: 0.45, ta: 2.78, tc: -0.95, wag: 0.0, mouth: 0, dip: 0, hdip: 0, eye: 1 },
  greet: { an: 0.30, nl: 21, ah: 0.52, ear: -0.9, ta: 3.30, tc: -0.35, wag: 1.0, mouth: 0.28, dip: 5, hdip: -1, eye: 0.8 },
  walk: { an: -0.22, nl: 20, ah: 0.14, ear: 0.3, ta: 2.8, tc: -0.85, wag: 0.1, mouth: 0, dip: 0, hdip: 0, eye: 1 },
  trot: { an: -0.34, nl: 20, ah: 0.08, ear: 0.2, ta: 2.9, tc: -0.55, wag: 0.1, mouth: 0.1, dip: 0, hdip: 0, eye: 1 },
  run: { an: -0.10, nl: 21, ah: 0.22, ear: -0.55, ta: 3.14, tc: 0.12, wag: 0.0, mouth: 0.5, dip: 0, hdip: 0, eye: 1 },
  lie: { an: -0.72, nl: 20, ah: 0.04, ear: 0.4, ta: 1.2, tc: 0.0, wag: 0.05, mouth: 0, dip: 0, hdip: 0, eye: 1 },
  sit: { an: -0.62, nl: 20, ah: 0.0, ear: 0.55, ta: 1.3, tc: 0.0, wag: 0.0, mouth: 0, dip: 0, hdip: 0, eye: 1 },
};
// allures : f = cycles par seconde, A = demi-amplitude des pas (px à s = 1), d = part d'appui, lift = hauteur de levée, ph = décalage d'attaque de chaque patte (nF/nH : côté visible, fF/fH : côté éloigné)
const LY_GAITS = {
  walk: { f: 0.9, A: 15, d: 0.68, lift: 7, rF: 1, rH: 0, ph: { nH: 0, nF: 0.25, fH: 0.5, fF: 0.75 } },
  trot: { f: 1.75, A: 22, d: 0.42, lift: 11, rF: 2, rH: 0, ph: { nH: 0, fF: 0, nF: 0.5, fH: 0.5 } },
  run: { f: 2.7, A: 19, d: 0.31, lift: 18, rF: 9, rH: 3, ph: { fH: 0, nH: 0.12, fF: 0.4, nF: 0.52 }, gallop: true },
};
for (const k in LY_GAITS) LY_GAITS[k].D = 2 * LY_GAITS[k].A / LY_GAITS[k].d;
function ly_gait(t, o = {}) {
  const g = LY_GAITS[o.gait || 'trot'] || LY_GAITS.trot, ph = (t - (o.t0 || 0)) * g.f * (o.speed ?? 1);
  return { ph, x: ph * g.D, f: g.f, A: g.A, d: g.d, D: g.D };
}
function ly_foot(g, ph, phi, x0) {                                                  // [x, levée (≤ 0), balancement 0..1] : appui puis oscillation arrondie
  const u = ly_frac(ph + phi), d = g.d;
  if (u < d) return [x0 + g.A * (1 - 2 * u / d), 0, 0];
  const q = (u - d) / (1 - d), e = eio(q), l = Math.pow(Math.sin(Math.PI * q), 0.85);
  return [x0 + g.A * (-1 + 2 * e), -g.lift * l, l];
}
// enveloppe d'un éternuement : inspiration (−0,4, la tête se relève) pendant 0,3 s, saccade (1) en 0,07 s, maintien bref, retombée en 0,5 s avec un petit rebond
function ly_sneezeEnv(u) {
  if (u < -0.45) return 0;
  if (u < 0) return -0.4 * sm(clamp((u + 0.45) / 0.3));
  if (u < 0.07) return lerp(-0.4, 1, sm(u / 0.07));
  if (u < 0.2) return 1;
  if (u < 0.7) { const q = (u - 0.2) / 0.5; return (1 - eio(q)) * (1 + 0.06 * Math.sin(q * 9)); }
  return 0;
}

// torse debout (repère du modèle : x vers l'avant, y vers le bas, sol en y = 0 ; garrot à 79 px) : croupe → garrot, puis (cou) puis sternum → arrière
const LY_TOP = [[-42, -63], [-38, -72], [-30, -76.5], [-17, -76], [-3, -75], [10, -76.5], [21, -80]];
const LY_BOT = [[38, -58], [36.5, -45], [28, -37.5], [16, -35.5], [5, -37.5], [-4, -42.5], [-13, -47.5], [-24, -51], [-35, -54]];

// tête dans son repère (origine au centre du crâne, museau vers +x, y vers le bas)
const LY_HEAD_UP = [[-11.8, -0.5], [-9.8, -6.4], [-4.2, -10], [2.8, -9.8], [7.6, -7.6], [11.5, -6.0], [16.2, -5.0], [18.6, -3.4], [19.2, -0.6], [18.2, 2.2], [14, 3], [8, 3.4], [3, 4.6], [-3, 6.5], [-9, 5.4], [-11.5, 2.8]];
const LY_HEAD_JAW = [[3, 3.7], [9, 3.3], [14.6, 3.0], [17.6, 3.2], [17, 5.2], [13, 6.6], [8, 8], [2, 9.2], [-3.5, 8.2], [-5, 5.5]];
const LY_EAR = [[-5.4, 0.5], [-6.8, -5], [-6.6, -11], [-3.8, -16.4], [0.8, -18.2], [5, -15.6], [6.6, -9.6], [6, -4], [4.4, 0.5]];

// ───────────────────────── le lycaon ─────────────────────────
// queue : chaîne de points depuis la base, angle ta (π = vers l'arrière à l'horizontale), courbure tc, battement
function ly_tail(B, ta, tc, wag, tt, o = {}) {
  const n = 9, Lt = o.len ?? 40, pts = [B]; let p = B;
  for (let i = 1; i <= n; i++) {
    const f = i / n, a = ta + tc * Math.pow(f, 1.4) + wag * 0.55 * Math.sin(TAU * (o.hz ?? 2.6) * tt - f * 1.4) * f;
    p = [p[0] + Math.cos(a) * Lt / n, p[1] + Math.sin(a) * Lt / n]; if (o.ground != null && p[1] > o.ground) p = [p[0], o.ground]; pts.push(p);
  }
  return { pts, ws: [5.5, 9, 11.5, 12.8, 12.8, 11.8, 10, 7.5, 4.6, 1.8] };
}
// polygone « fourrure » : bords en touffes le long de la ligne médiane
function ly_fur(pts, ws, amp, ph = 0) {
  const Lp = [], Rp = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const tf = k => amp * (0.55 + 0.45 * Math.sin(i * 2.9 + ph + k)) * (i === 0 || i === n - 1 ? 0.3 : 1) * (i % 2 ? 1 : 0.4);
    Lp.push([pts[i][0] - ty * (ws[i] / 2 + tf(0)), pts[i][1] + tx * (ws[i] / 2 + tf(0))]); Rp.push([pts[i][0] + ty * (ws[i] / 2 + tf(2)), pts[i][1] - tx * (ws[i] / 2 + tf(2))]);
  }
  return Lp.concat(Rp.reverse());
}
// bande de queue entre les indices i0 et i1 de la chaîne (rectangle large, à recadrer par le contour de la queue)
function ly_band(pts, i0, i1, ext = 0) {
  const a = pts[i0], b = pts[i1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux, W = 18;
  const e0 = [a[0] - ux * 0.0, a[1] - uy * 0.0], e1 = [b[0] + ux * ext, b[1] + uy * ext];
  const mids = []; for (let i = i0; i <= i1; i++) mids.push(pts[i]);
  const Lp = mids.map(p => [p[0] + nx * W, p[1] + ny * W]), Rp = mids.map(p => [p[0] - nx * W, p[1] - ny * W]).reverse();
  const poly = Lp.concat([[e1[0] + nx * W, e1[1] + ny * W], [e1[0] - nx * W, e1[1] - ny * W]], Rp);
  return polyPath(poly);
}

function ly_dog(cx, cy, s, t, o = {}) {
  const pose = o.pose || 'stand', seed = o.seed ?? 1, fl = o.flip ? -1 : 1, envName = o.env || 'savannaDawn';
  const C = ly_pal(envName, o.fog || 0, o.sil || 0), coat = ly_coat(seed), E = C.E;
  const lightX = o.light ?? E.light, rimK = clamp(o.rim ?? 1) * (1 - 0.3 * clamp(o.fog || 0)), shK = clamp(o.shadow ?? 1);
  const A = { ...(LY_ATT[pose] || LY_ATT.stand) };
  const gname = o.gait || (LY_GAITS[pose] ? pose : null), G = gname ? LY_GAITS[gname] : null, tt = t + seed * 1.3;
  const ph = o.ph != null ? o.ph : (G ? (t - (o.t0 || 0)) * G.f : 0);
  const lie = pose === 'lie', sit = pose === 'sit', rest = lie ? clamp(o.rest ?? 0) : 0;
  const outCol = o.outline === undefined ? ly_mix('#05040f', C.E.shadow, 0.2 + 0.4 * clamp(o.fog || 0)) : o.outline;
  // ── éternuement : sn < 0 inspiration, sn > 0 saccade ──
  let sn = o.sneeze; if (sn == null && pose === 'sneeze') { const per = 2.6, u = ((t - (o.t0 || 0)) % per + per) % per - 0.75; sn = ly_sneezeEnv(u); }
  sn = sn || 0; const inh = Math.max(0, -sn), ex = Math.max(0, sn);
  if (o.look != null) { A.an -= 0.4 * o.look; A.ah -= 0.12 * o.look; }
  if (o.mouth != null) A.mouth = o.mouth;
  A.an += -0.5 * inh + 0.95 * ex; A.ah += -0.3 * inh + 0.5 * ex; A.nl += 5 * ex; A.dip += 4.5 * ex - 1 * inh; A.ear = o.ear != null ? o.ear : A.ear + 0.3 * inh - 1.5 * ex;
  A.eye = (o.eye != null ? o.eye : A.eye) * (1 - 1.15 * clamp(ex));
  const wag = clamp(o.tail ?? A.wag), wk = clamp(ex * 1.2);
  // ── allure : appuis, rebond, flexion de l'échine ──
  const F = { nF: [25, 0, 0], fF: [25, 0, 0], nH: [-26, 0, 0], fH: [-26, 0, 0] };
  let bob = 0, pF = 0, pB = 0, recoil = -3 * ex;
  if (G && !lie && !sit) {
    F.nF = ly_foot(G, ph, G.ph.nF, 25 + G.rF); F.fF = ly_foot(G, ph, G.ph.fF, 25 + G.rF); F.nH = ly_foot(G, ph, G.ph.nH, -26 + G.rH); F.fH = ly_foot(G, ph, G.ph.fH, -26 + G.rH);
    if (gname === 'walk') { bob = -0.9 * (0.5 - 0.5 * Math.cos(4 * Math.PI * ph)); pF = 0.015 * Math.sin(TAU * ph); pB = -pF * 0.6; }
    else if (gname === 'trot') { bob = -3.2 * (0.5 + 0.5 * Math.cos(4 * Math.PI * (ph - 0.46))); pF = 0.02 * Math.sin(4 * Math.PI * ph); pB = -pF; }
    else { const a = 0.5 + 0.5 * Math.cos(TAU * (ph - 0.9)), b = Math.cos(TAU * (ph - 0.35)); bob = -6 * a; pF = 0.09 * b + 0.05; pB = -0.06 * b - 0.03; }
  }
  const breath = 0.5 + 0.5 * Math.sin(tt * (A.mouth > 0.3 && !G ? 5 : 2.7)) + 1.4 * inh;
  const sinkF = A.dip + (rest ? 6 * rest : 0), sinkB = A.hdip;
  const PV = [-2, -60];
  let bodyT;
  const sq = x => 0.85 * x - 0.5;
  if (lie) bodyT = (x, y) => [sq(x), y + 33 + (rest ? 2.5 * rest * clamp((x + 5) / 40) : 0)];
  else if (sit) { const th = -0.84, pv = [-38, -54]; bodyT = (x, y) => { const q = ly_rot([sq(x), y], pv, th); return [q[0] - 1, q[1] + 47.5]; }; }
  else bodyT = (x, y) => { const w = sm(clamp((x + 24) / 52)), q = ly_rot([sq(x), y], PV, lerp(pB, pF, w)); return [q[0] + recoil * w, q[1] + bob + lerp(sinkB, sinkF, w)]; };
  const top = LY_TOP.map(p => bodyT(p[0], p[1])), bot = LY_BOT.map(p => bodyT(p[0], p[1]));
  top.forEach((p, i) => { if (i >= 1 && i <= 5) p[1] += -0.5 * breath; }); bot.forEach((p, i) => { if (i >= 1 && i <= 4) p[1] += 0.9 * breath; });
  // ── cou et tête ──
  const N0 = bodyT(30, -73), sway = Math.sin(tt * 0.8) * 0.025, an = A.an + sway + (G ? 0.03 * Math.sin(TAU * ph * (gname === 'walk' ? 2 : 1)) : 0);
  const nl = A.nl + (rest ? 12 * rest : 0), anR = lerp(an, 0.95, rest);
  const H = [N0[0] + nl * Math.cos(anR), N0[1] + nl * Math.sin(anR)], aH = lerp(A.ah + 0.02 * Math.sin(tt * 1.1 + 1), 0.28, rest), hc = Math.cos(aH), hs = Math.sin(aH);
  const HS = 1.1, Th = (x, y) => [H[0] + (x * hc - y * hs) * HS, H[1] + (x * hs + y * hc) * HS];
  const Tb = (x, y) => [cx + fl * s * x, cy + s * y], Ts = (x, y) => Tb(...Th(x, y));
  const ex0 = 105 * s + 8; ly_BB = [Math.max(0, Math.floor(cx - ex0)), Math.max(0, Math.floor(cy - 125 * s)), Math.min(LW, Math.ceil(cx + ex0)), Math.min(LH, Math.ceil(cy + 10 * s + 6))];
  // ── ombre au sol ──
  if (shK > 0 && o.fog !== 1) { const a = 0.5 * shK * (1 - 0.4 * clamp(o.fog || 0)), rx = (sit ? 38 : lie ? 56 : 60) * s, off = -lightX * (sit ? 8 : 16) * s; if (typeof k_shadow === 'function') k_shadow(cx + off, cy + 0.5 * s, rx, Math.max(2, 5.5 * s), a, { col: '46,26,86' }); else ell(cx + off, cy, rx, 5 * s, 'rgba(46,26,86,0.4)'); }

  ly_layerBegin();
  const c = Y; c.setTransform(s * fl, 0, 0, s, cx, cy); c.lineJoin = 'round';
  const ll = ly_norm([lightX * fl * 0.92, -0.45]), mn = u => Math.max(u, 1.05 / s), bl = u => Math.max(0.5, u * s);
  const mk = lv => ({
    dark: (path, off = 3.5, blur = 1.2, a = 0.5, col = C.shadowCol) => ly_cres(c, path, col, lv[0] * mn(off), lv[1] * mn(off), bl(blur), a),
    lite: (path, off = 2, blur = 0.8, a = 0.32, col = C.litCol) => ly_cres(c, path, col, -lv[0] * mn(off), -lv[1] * mn(off), bl(blur), a),
    rimL: (path, w = 0.9, a = 1) => { if (rimK > 0) ly_cres(c, path, C.rim, -lv[0] * mn(w), -lv[1] * mn(w), 0, rimK * a); },
  });
  const { dark, lite, rimL } = mk(ll);
  const halo = (path, col = C.line, w = 1.1) => { c.lineWidth = mn(w); c.strokeStyle = col; c.lineJoin = 'round'; c.stroke(path); };
  const tone = (key, k = 'mid') => C[LY_KEYS[key]][k];
  const farM = { [C.tan.mid]: WO[4], [C.blk.mid]: WO[1], [C.wht.mid]: ly_mix(WO[6], WO[3], 0.45) }, far = col => farM[col] || ly_mix(col, WO[1], 0.4);
  const rnd = rng(seed * 131 + 7);

  // ── pattes : géométrie ──
  const legGeom = (kind, f, side, farSide) => {                                           // kind 'F' | 'H' ; f = [x, levée, balancement]
    const Fx = f[0] + (farSide ? (kind === 'F' ? 4 : 3) : 0), Fy = f[1] - (farSide ? 0.6 : 0), sw = f[2];
    if (kind === 'F') {
      const S = bodyT(31 + (farSide ? 3 : 0), -54 + (farSide ? 1 : 0)), W = [Fx - 1.2 - 2 * sw, Fy - 9.5 - 1.5 * sw], E = ly_ik(S, W, 19, 29.5, 1), heel = [Fx - 0.8, Fy - 3.4];
      const Eu = [E[0] + (E[0] - W[0]) * 0.32, E[1] + (E[1] - W[1]) * 0.32];
      return { pts: [Eu, E, W, heel], ws: [11, 9.4, 6.2, 5], paw: [Fx + 2.2, Fy - 1.7, 4.6, 2.4, 0.4 * sw], W, S };
    }
    const Hj = bodyT(-30 + (farSide ? 2 : 0), -57 + (farSide ? 1 : 0)), Hk = [Fx - 7, Fy - 18.5 - 2 * sw], K = ly_ik(Hj, Hk, 22, 27, -1), heel = [Fx - 2.2, Fy - 3.2];
    return { pts: [Hj, K, Hk, heel], ws: farSide ? [11, 9.2, 6.4, 4.8] : [12, 9.5, 5.8, 4.5], paw: [Fx + 2.2, Fy - 1.7, 4.6, 2.4, 0.4 * sw], Hj, K, Hk };
  };
  let Lg;
  if (lie || sit) {
    const sh = lie ? bodyT(30, -52) : bodyT(30, -52), gy = 0;
    const fS = lie ? sh : sh;
    if (lie) {
      const e = [14, -6], w = [32 + 2 * rest, -4.2], hl = [40 + 2 * rest, -3.4];
      Lg = {
        nF: { pts: [fS, e, w, hl], ws: [10, 6.8, 5.2, 4.8], paw: [46 + 2 * rest, -2, 5.2, 2.5, 0] },
        fF: { pts: [[fS[0] + 3, fS[1] + 1], [18, -5], [40 + 2 * rest, -3.6], [48 + 2 * rest, -3]], ws: [10, 6.4, 5, 4.6], paw: [53 + 2 * rest, -2, 5.2, 2.5, 0] },
        nH: { pts: [bodyT(-28, -57), [-14, -15], [-42, -8], [-31, -3.6], [-14, -2.6]], ws: [12, 9.5, 6, 4.8, 4.6], paw: [-11, -2.1, 4.6, 2.3, 0], Hj: bodyT(-28, -57), K: [-14, -15] },
        fH: { pts: [bodyT(-26, -57), [-6, -12], [-30, -6], [-20, -3], [-4, -2]], ws: [10, 8, 5.4, 4.4, 4.2], paw: [-1, -2, 4.4, 2.2, 0] },
      };
    } else {
      const S = bodyT(30, -52), p = [S[0] + 5, 0];
      Lg = {
        nF: { pts: [S, [S[0] - 1.5, S[1] * 0.55], [p[0] - 1, -10.5], [p[0], -3.4]], ws: [10, 6.4, 4.8, 4.5], paw: [p[0] + 2.4, -1.7, 4.8, 2.4, 0] },
        fF: { pts: [[S[0] + 3, S[1] + 1], [S[0] + 2.5, S[1] * 0.55], [p[0] + 6, -10.5], [p[0] + 7, -3.4]], ws: [10, 6.2, 4.6, 4.3], paw: [p[0] + 9.4, -1.7, 4.6, 2.3, 0] },
        nH: { pts: [bodyT(-28, -57), [-12, -17], [-40, -8], [-29, -3.6], [-12, -2.6]], ws: [12, 9.5, 6, 4.8, 4.6], paw: [-9, -2.1, 4.6, 2.3, 0], Hj: bodyT(-28, -57), K: [-12, -17] },
        fH: { pts: [bodyT(-26, -57), [-4, -14], [-30, -6], [-18, -3], [-2, -2]], ws: [10, 8, 5.4, 4.4, 4.2], paw: [1, -2, 4.4, 2.2, 0] },
      };
    }
  } else Lg = { nF: legGeom('F', F.nF, 1, false), fF: legGeom('F', F.fF, -1, true), nH: legGeom('H', F.nH, 1, false), fH: legGeom('H', F.fH, -1, true) };
  // cuisse (près de la hanche) : ellipse le long de la cuisse
  const Hn = Lg.nH.Hj || bodyT(-30, -57), Kn = Lg.nH.K || bodyT(-18, -40), thc = [(Hn[0] + Kn[0]) / 2 - 2.5, (Hn[1] + Kn[1]) / 2 - 1.5], thl = Math.hypot(Kn[0] - Hn[0], Kn[1] - Hn[1]), thr = -Math.atan2(Kn[0] - Hn[0], Kn[1] - Hn[1]);
  const thigh = ly_ell(thc[0], thc[1], 9.5, thl * 0.5 + 8, thr);

  // ── paint des pattes ──
  const torsoPaint = () => { c.fillStyle = tone(coat.base, 'mid'); c.fillRect(-120, -140, 260, 170); for (const b of coat.blobs) { c.fillStyle = tone(b.col, 'mid'); c.fill(ly_smooth(b.pts.map(p => bodyT(p[0], p[1])))); } };
  const paintLeg = (L, idx, farSide, hind) => {
    const co = coat.legs[idx], path = ly_limb(L.pts, L.ws, 5), paw = ly_ell(L.paw[0], L.paw[1], L.paw[2], L.paw[3], L.paw[4]);
    const col = k => { const q = tone(k, 'mid'); return farSide ? far(q) : q; };
    if (!farSide) { halo(path); halo(paw, C.line, 1.0); }
    c.fillStyle = col(co.top); c.fill(path);
    c.save(); c.clip(path);
    const n = L.pts.length, W = L.pts[n - 2], hl = L.pts[n - 1], d = ly_norm([hl[0] - W[0], hl[1] - W[1] + 0.001]), nx = -d[1], ny = d[0];
    if (false) { const K = L.pts[1], dk = ly_norm([W[0] - K[0], W[1] - K[1] + 0.001]), kx = -dk[1], ky = dk[0];
      c.fillStyle = col(co.top); c.beginPath(); c.moveTo(K[0] + kx * 16 - dk[0] * 3, K[1] + ky * 16 - dk[1] * 3); c.lineTo(K[0] + kx * 4 + dk[0] * 2, K[1] + ky * 4 + dk[1] * 2); c.lineTo(K[0] - kx * 4 - dk[0] * 1, K[1] - ky * 4 - dk[1] * 1); c.lineTo(K[0] - kx * 16 - dk[0] * 4, K[1] - ky * 16 - dk[1] * 4);
      c.lineTo(K[0] - kx * 16 + dk[0] * 60, K[1] - ky * 16 + dk[1] * 60); c.lineTo(K[0] + kx * 16 + dk[0] * 60, K[1] + ky * 16 + dk[1] * 60); c.closePath(); c.fill(); }
    const P0 = hind ? [lerp(W[0], hl[0], co.sockAt - 0.4), lerp(W[1], hl[1], co.sockAt - 0.4)] : [lerp(L.pts[n - 3][0], W[0], clamp(co.sockAt + 0.1, 0.5, 0.9)), lerp(L.pts[n - 3][1], W[1], clamp(co.sockAt + 0.1, 0.5, 0.9))];
    c.fillStyle = col(co.sock); c.beginPath(); c.moveTo(P0[0] + nx * 14 - d[0] * 1, P0[1] + ny * 14 - d[1] * 1); c.lineTo(P0[0] + nx * 3 + d[0] * 1.5, P0[1] + ny * 3 + d[1] * 1.5); c.lineTo(P0[0] - nx * 3, P0[1] - ny * 3);
    c.lineTo(P0[0] - nx * 14 - d[0] * 1.5, P0[1] - ny * 14 - d[1] * 1.5); c.lineTo(P0[0] - nx * 14 + d[0] * 30, P0[1] - ny * 14 + d[1] * 30); c.lineTo(P0[0] + nx * 14 + d[0] * 30, P0[1] + ny * 14 + d[1] * 30); c.closePath(); c.fill();
    if (co.blob && !farSide && !hind) { const m = L.pts[1]; c.fillStyle = col(co.blob); c.fill(ly_smooth(ly_blob(rnd, m[0], m[1], 6, 5, 0.5, 8))); }
    c.restore();
    c.fillStyle = col(co.sock); c.fill(paw);
    if (!farSide) { dark(path, 2.4, 0.9, 0.5); lite(path, 1.6, 0.6, 0.3); dark(paw, 1.2, 0.5, 0.45); rimL(path, 0.9, 0.85); rimL(paw, 0.8, 0.6); }
    else { c.fillStyle = 'rgba(30,18,12,0.2)'; c.fill(path); c.fill(paw); }
  };
  // far side first
  paintLeg(Lg.fH, 3, true, true); paintLeg(Lg.fF, 2, true, false);

  // ── queue ──
  { const B = bodyT(-40, -67);
    const tailA = lie ? 2.4 : sit ? 2.5 : A.ta + 0.3 * ex, tcc = lie || sit ? -0.3 : A.tc, tl = ly_tail(B, tailA, tcc, wag, tt, { ground: lie || sit ? -2.6 : null, hz: 2.6 + 1.2 * wag });
    Lg.tail = tl;
    const tp = polyPath(ly_fur(tl.pts, tl.ws, 1.4, seed)), t0 = coat.tail;
    halo(tp, C.line, 1.2); c.fillStyle = tone(t0.base, 'mid'); c.fill(tp);
    c.save(); c.clip(tp);
    const i1 = Math.round(t0.f1 * 9), i2 = Math.round(t0.f2 * 9);
    if (t0.bandOn) { c.fillStyle = tone('k', 'mid'); c.fill(ly_band(tl.pts, i1, i2, 0)); }
    c.fillStyle = tone('w', 'mid'); c.fill(ly_band(tl.pts, i2, 9, 10));
    c.restore();
    dark(tp, 3, 1.1, 0.5); lite(tp, 2, 0.7, 0.28); rimL(tp, 0.9, 0.85); }
  Lg.tailB = bodyT(-40, -67);

  // ── tronc et cou : un seul contour ──
  const nape = Th(-9.5, -7), thr_ = Th(-6, 7.5);
  const nkTop = [(top[6][0] + nape[0]) / 2, (top[6][1] + nape[1]) / 2 - 2.2], nkBot = [(thr_[0] + bot[0][0]) / 2 - 1, (thr_[1] + bot[0][1]) / 2 + 2.4];
  const tpts = top.concat([nkTop, nape, thr_, nkBot], bot);
  const torso = ly_spline(tpts);
  c.fillStyle = tone(coat.base, 'mid'); c.fill(torso);
  c.save(); c.clip(torso);
  for (const b of coat.blobs) { c.fillStyle = tone(b.col, 'mid'); c.fill(ly_smooth(b.pts.map(p => bodyT(p[0], p[1])))); }
  { const dn = [Math.cos(anR), Math.sin(anR)], nc = [N0[0] + dn[0] * 9, N0[1] + dn[1] * 9];
    c.fillStyle = tone(coat.neck.base, 'mid'); c.fill(ly_smooth(ly_blob(rnd, nc[0], nc[1], 17, 15.5, anR, 12).map(p => p)));
    for (const b of coat.neck.blobs) { const q = b.pts.map(p => { const r = ly_rot([N0[0] + p[0], N0[1] + p[1]], N0, anR); return r; }); c.fillStyle = tone(b.col, 'mid'); c.fill(ly_smooth(q)); } }
  c.restore();
  dark(torso, 4.2, 1.5, 0.5); lite(torso, 2.6, 1.0, 0.3); rimL(torso, 1.0);

  // ── cuisse et patte arrière proche ──
  paintLeg(Lg.nH, 1, false, true);
  c.save(); c.globalAlpha = 0.3; halo(thigh, C.line, 0.9); c.restore();
  c.save(); c.clip(thigh); torsoPaint(); c.restore();
  dark(thigh, 3.0, 1.2, 0.34); lite(thigh, 2, 0.8, 0.26); rimL(thigh, 0.9, 0.7);
  // ── patte avant proche ──
  c.save(); { const outP = new Path2D(); outP.rect(-400, -400, 800, 800); outP.addPath(torso); c.clip(outP, 'evenodd'); }
  paintLeg(Lg.nF, 0, false, false);
  c.restore();
  { const S = Lg.nF.pts[0], sp = ly_ell(S[0] - 5, S[1] - 7, 8.5, 12.5, 0.2); lite(sp, 2.4, 0.9, 0.22); }

  // ── tête ──
  const llH = ly_rot(ll, [0, 0], -aH), H0 = mk(llH);
  c.save(); c.translate(H[0], H[1]); c.rotate(aH); c.scale(HS, HS);
  const earE = A.ear, earAng = earE > 0 ? lerp(0, 0.3, earE) : earE * 1.25, flick = k => { const P = 3.4, x = (tt + k * 0.9) / P, id = Math.floor(x), pp = (x - id) * P; return pp < 0.3 && ly_h(id, seed + k * 7) < 0.55 ? Math.sin(pp / 0.3 * Math.PI) * 0.34 * (ly_h(id, seed + k) < 0.5 ? 1 : -1) : 0; };
  const earPath = (base, ang, sy) => ly_spline(LY_EAR.map(p => { const q = ly_rot([p[0], p[1] * sy], [0, 0], ang); return [base[0] + q[0], base[1] + q[1]]; }));
  const flat = clamp(-earE), sy = 1 - 0.18 * flat;
  { const pF = earPath([-0.5, -8.6], earAng * 0.9 + 0.1 + flick(2) * 0.8, sy), pFi = earPath([-0.5, -8.6 - 0.3], earAng * 0.9 + 0.1 + flick(2) * 0.8, sy);
    c.save(); c.beginPath(); halo(pF, C.line, 1.0); c.fillStyle = far(tone('b', 'mid')); c.fill(pF);
    c.save(); c.clip(pF); const inn = ly_limb([[-0.5 + 0.6, -9.5], [0.2, -13], [0.4, -16]], [8, 8, 4.5]); c.save(); c.translate(-0.5, -8.6); c.rotate(earAng * 0.9 + 0.1 + flick(2) * 0.8); c.translate(0.5, 8.6); c.fillStyle = far(C.earIn); c.fill(inn); c.restore(); c.restore();
    H0.dark(pF, 2, 0.7, 0.45); c.restore(); }
  // mâchoire et gueule
  const jawA = clamp(A.mouth) * 0.55, jc = Math.cos(jawA), jsn = Math.sin(jawA), jh = [-0.5, 5.2], rj = p => { const dx = p[0] - jh[0], dy = p[1] - jh[1]; return [jh[0] + dx * jc - dy * jsn, jh[1] + dx * jsn + dy * jc]; };
  const jaw = ly_spline(LY_HEAD_JAW.map(rj));
  if (A.mouth > 0.12) { c.fillStyle = C.mouth; c.fill(polyPath([[3, 3.4], [10, 3], [16, 2.7], [19.5, 2.8], rj([19.2, 4.4]), rj([12, 6.6]), rj([4, 7.6])])); }
  halo(jaw, C.line, 1.0);
  c.fillStyle = tone('k', 'mid'); c.fill(jaw);
  c.save(); c.clip(jaw); c.fillStyle = tone(coat.head.throat, 'mid'); c.fill(polyPath([[-12, 0], [3, 2], [8, 5].map(v => v), [7, 12], [-12, 12]].map(p => p))); c.restore();
  if (A.mouth > 0.22) { c.fillStyle = C.teeth; c.fill(polyPath([rj([17.6, 3.0]), rj([18.8, 3.0]), rj([18.4, 5.4])])); }
  if (A.mouth > 0.3) {                                                                  // langue qui pend sur le côté
    const tl0 = 3.5 + 6 * clamp(A.mouth - 0.3) / 0.7 + (gname === 'run' ? 2.5 * Math.sin(TAU * ph * 2) : 0), tpts_ = [rj([11, 4.6]), rj([14.5, 7.4]), rj([15.5, 9 + tl0]), rj([14.8, 10.5 + tl0])];
    const tg = ly_limb(tpts_, [4.4, 5.6, 5.8, 3.6], 3); halo(tg, C.line, 0.8); c.fillStyle = C.tongue; c.fill(tg); dark(tg, 1.3, 0.5, 0.5, C.tongueLo); }
  // crâne et museau
  const up = LY_HEAD_UP.map((p, i) => i >= 5 && i <= 10 ? [p[0] - 1.5 * wk * (i / 10), p[1] - 1.9 * wk * (i / 10)] : p), upper = ly_spline(up);
  halo(upper, C.line, 1.1);
  c.fillStyle = tone(coat.head.cheek, 'mid'); c.fill(upper);
  c.save(); c.clip(upper);
  c.fillStyle = tone('k', 'mid'); c.fill(polyPath([[8.6, -10], [9.8, -6.5], [7.8, -1.5], [6.2, 5], [26, 6], [26, -10]]));              // museau noir
  c.fillStyle = tone('k', 'mid'); c.fill(polyPath([[-8, -11], [3, -11.5], [10.5, -8.2], [9.6, -6.6], [3.2, -8.6], [-7, -8.4]]));          // raie noire du front
  c.fillStyle = tone('k', 'lo'); c.fill(ly_ell(4.8, -3.0, 4.1, 3.2, 0.1));                                                              // masque autour de l'œil
  c.fillStyle = tone(coat.head.throat, 'mid'); c.fill(polyPath([[-13, 1.2], [-4, 2.6], [2, 4.4], [8, 6], [8, 12], [-13, 12]]));        // joue claire / gorge
  c.restore();
  H0.dark(upper, 2.6, 1.0, 0.45); H0.lite(upper, 1.6, 0.6, 0.3); H0.rimL(upper, 0.9, 0.95);
  c.fillStyle = C.blk.deep; c.fill(ly_ell(20.3 - 1.2 * wk, -1.5 - 1.6 * wk, 2.6, 2.4, 0.2));                                           // truffe
  H0.lite(jaw, 1.0, 0.4, 0.28);
  // oreille proche
  { const pN = earPath([-5.5, -8.4], earAng + flick(1), sy);
    halo(pN, C.line, 1.1); c.fillStyle = tone('b', 'lo'); c.fill(pN);
    c.save(); c.clip(pN); c.fillStyle = tone('k', 'mid'); c.fill(ly_ell(-5.5 + Math.sin(earAng + flick(1)) * 9, -8.4 - 10, 8, 9, 0)); c.restore();
    H0.dark(pN, 2.2, 0.8, 0.4); H0.lite(pN, 1.4, 0.5, 0.3); H0.rimL(pN, 0.9, 0.95); }
  c.restore();
  ly_layerEnd({ outline: outCol });

  // ── détails nets : œil, narine, plis, moustaches ──
  L.setTransform(1, 0, 0, 1, 0, 0);
  const eS = Ts(5.2, -3.1), exx = Math.round(eS[0]), eyy = Math.round(eS[1]), er = Math.max(1, Math.round(1.9 * s));
  const blinkT = (tt * 0.27) % 1, blink = blinkT > 0.965 ? Math.sin((blinkT - 0.965) / 0.035 * Math.PI) : 0, open = (o.eye != null ? clamp(o.eye) : A.eye) * (1 - blink) * (rest > 0.5 ? 0 : 1);
  const hx = fl * hc, hy = hs;
  if (open > 0.45) {
    if (er >= 2) { disc(exx, eyy, er, ly_mix(AM[6], '#48291a', 0.35)); disc(exx, eyy, Math.max(1, er - 1), '#12100c'); px(exx - fl, eyy - 1, WH[3]); }
    else px(exx, eyy, '#12100c');
  } else { const a = Math.max(1, Math.round(er * 1.1)); lineP(exx - a * fl, eyy + (ex > 0.3 ? 1 : 0), exx + a * fl, eyy, '#05040f', 1); if (ex > 0.3) lineP(exx - a * fl, eyy - 1, exx, eyy + 1, '#05040f', 1); }
  if (s >= 1.0) for (const L_ of [Lg.nF, Lg.nH]) { const pw = L_.paw, nT = s >= 1.5 ? 3 : 2; for (let k = 0; k < nT; k++) { const a = Tb(pw[0] + 1.0 + k * (nT === 3 ? 1.5 : 2.2), pw[1] - 0.6), b = Tb(pw[0] + 1.3 + k * (nT === 3 ? 1.5 : 2.2), pw[1] + 1.7); lineP(a[0], a[1], b[0], b[1], ly_mix('#05040f', C.sh, 0.3), 1); } }
  if (wk > 0.12 && s >= 0.45) for (let k = 0; k < 3; k++) { const a = Ts(11.5 + k * 2.6, -5.6 + k * 0.3), b = Ts(12.4 + k * 2.6, -2.4 + k * 0.2); lineP(a[0], a[1], b[0], b[1], C.brn.hi, 1); }
  const nose = Ts(21.4, -1.6);
  if (s >= 0.5) px(nose[0] - fl * 0.5, nose[1] - 1, ly_mix(ST[5], C.sh, 0.2));
  if (window.LY_DEBUG) window.LY_DBG = { Lg, tpts, H, N0, an: anR };
  return { T: Tb, Th: Ts, nose, mouth: Ts(19, 4.4), eye: eS, head: Ts(2, -1), ear: Ts(-5, -26), tail: Tb(...(Lg.tail.pts[9])), back: Tb(0, -80), chest: Tb(34, -50), w: 145 * s, dir: fl, ex, inh, N0: Tb(N0[0], N0[1]) };
}

// ───────────────────────── la meute ─────────────────────────
// ly_packLayout(o, t) → [{ i, x, y, s, flip, seed, pose, fog, ph, gait, dist }] triés du lointain au proche (y croissant), sans rien dessiner.
// o : n (7), seed (1), mode 'scatter' (éparpillés, profondeur variable) | 'ring' (cercle de rassemblement : tous tournés vers le centre) | 'run' (file qui part : x avance de ly_gait(t − t0) × s, sol identique),
//     x0, x1 (étendue horizontale), y0, y1 (ligne de sol du plus lointain / du plus proche), s0, s1 (échelle au loin / près), fog0, fog1 (brume au loin / près), poses (liste, tournante),
//     ring { cx, cy, rx, ry, a0 } et gather 0..1 (1 : positions du cercle, 0 : positions éparpillées ; entre les deux : trajet de chaque chien), flipP (part de chiens tournés vers la gauche, 0,5),
//     run { t0, dir (+1 vers la droite), gait ('run'), x0 (départ du premier), gap (écart entre chiens, px), jitter }, cam, par (parallaxe : x − cam × par, avec par = 0,6 + 0,6 × profondeur).
function ly_packLayout(o = {}, t = 0) {
  const n = o.n ?? 7, seed = o.seed ?? 1, mode = o.mode || 'scatter', x0 = o.x0 ?? 20, x1 = o.x1 ?? 250, y0 = o.y0 ?? 330, y1 = o.y1 ?? 400, s0 = o.s0 ?? 0.4, s1 = o.s1 ?? 0.6;
  const poses = o.poses || ['lie', 'stand', 'sit', 'lie', 'stand', 'look', 'lie'], cam = o.cam || 0, out = [];
  const ring = { cx: 135, cy: 360, rx: 90, ry: 26, a0: 0.3, ...(o.ring || {}) }, run = { t0: 0, dir: 1, gait: 'run', x0: 60, gap: 34, jitter: 12, ...(o.run || {}) };
  const gather = o.gather ?? 0, ge = eio(clamp(gather));
  for (let i = 0; i < n; i++) {
    const h = k => ly_h(i * 7 + k, seed * 31 + 5);
    const dep = ly_frac(i * 0.618 + 0.25 * h(2)), seedI = (o.seedBase ?? seed * 10) + i;
    const sx = x0 + (x1 - x0) * ((i + 0.15 + 0.7 * h(1)) / n), sy = lerp(y0, y1, dep), ss = lerp(s0, s1, dep) * (0.93 + 0.14 * h(3));
    let x = sx, y = sy, sc = ss, flip = h(4) < (o.flipP ?? 0.5), pose = poses[(i + Math.floor(h(5) * 3)) % poses.length], gait = null, ph = undefined, dist = 0;
    if (mode === 'ring' || gather > 0) {
      const a = ring.a0 + TAU * i / n, rxp = ring.cx + Math.cos(a) * ring.rx, ryp = ring.cy + Math.sin(a) * ring.ry, d2 = (Math.sin(a) + 1) / 2, rs = lerp(s0, s1, d2) * (0.95 + 0.1 * h(3));
      const fx = rxp > ring.cx;                                       // tourné vers le centre
      if (mode === 'ring' && gather >= 1) { x = rxp; y = ryp; sc = rs; flip = fx; pose = o.ringPose || 'greet'; }
      else if (gather > 0) { x = lerp(sx, rxp, ge); y = lerp(sy, ryp, ge); sc = lerp(ss, rs, ge); flip = ge > 0.5 ? fx : flip; pose = ge > 0.04 ? (o.moveGait ? 'greet' : (ge > 0.6 ? (o.ringPose || 'greet') : 'stand')) : pose; if (ge > 0.04 && ge < 0.97 && o.moveGait) { gait = o.moveGait; } }
    }
    if (mode === 'run') {
      const gg = ly_gait(t - run.t0 - 0.06 * i, { gait: run.gait }), dd = run.dir; dist = gg.x;
      sc = lerp(s0, s1, dep) * (0.95 + 0.1 * h(3)); flip = dd < 0; pose = run.gait; ph = gg.ph + h(6) * 0.3; gait = run.gait;
      x = run.x0 - dd * (i * run.gap + h(7) * run.jitter) + dd * ly_gait(t - run.t0, { gait: run.gait }).x * sc;
    }
    const d = (y - y0) / Math.max(1, y1 - y0), par = o.par ?? (0.6 + 0.6 * clamp(d));
    out.push({ i, x: x - cam * par, y, s: sc, flip, seed: seedI, pose, gait, ph, dep: clamp(d), fog: lerp(o.fog0 ?? 0.3, o.fog1 ?? 0, clamp(d)) });
  }
  return out.sort((a, b) => a.y - b.y);
}
function ly_pack(t, o = {}) {
  const L0 = ly_packLayout(o, t), res = [];
  for (const e of L0) {
    const od = { pose: e.pose, seed: e.seed, flip: e.flip, fog: e.fog, ph: e.ph, gait: e.gait || undefined, env: o.env, light: o.light, rim: o.rim, shadow: o.shadow, sil: o.sil, ...(o.dog || {}) };
    if (o.each) Object.assign(od, o.each(e, t) || {});
    if (od.gait && od.pose === 'run') od.gait = undefined;
    e.r = ly_dog(e.x, e.y, e.s, t, od); res.push(e);
  }
  return res;
}

// ───────────────────────── éternuement : gouttelettes et texte ─────────────────────────
// petit nuage de gouttelettes dans la lumière rasante : (x, y) = le nez, t0 = instant de la saccade ; o : dir (+1 vers la droite), s (échelle du chien), ang (angle du souffle, 0,55 : vers l'avant et le bas), seed, light (côté du soleil)
function ly_sneezeFx(x, y, t0, t, o = {}) {
  const u = t - t0; if (u < -0.02 || u > 1.5) return;
  const dir = o.dir ?? 1, sc = o.s ?? 1, ang = o.ang ?? 0.55, ca = Math.cos(ang) * dir, sa = Math.sin(ang), r = rng((o.seed ?? 3) * 977 + 5), lightX = o.light ?? 1;
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0);
  // anneau de souffle : naît à la saccade, s'élargit vite
  if (u < 0.2) { const k = u / 0.2, rr = (3 + 11 * eo(k)) * sc; L.strokeStyle = `rgba(255,248,232,${(0.8 * (1 - k)).toFixed(2)})`; L.lineWidth = 1.4; L.beginPath(); L.ellipse(x + ca * 5 * sc, y + sa * 5 * sc, rr * 0.7, rr, ang * dir, 0, TAU); L.stroke(); }
  // nuage : quelques bouffées qui grossissent et s'éteignent en montant un peu
  for (let i = 0; i < 6; i++) {
    const d = 0.015 * i, a = u - d; if (a < 0 || a > 0.95) continue;
    const k = a / 0.95, dist = (6 + 20 * (1 - Math.exp(-3.2 * a)) + 6 * i * 0.4) * sc, ox = ca * dist + (r() - 0.5) * 5 * sc, oy = sa * dist * 0.8 - 4 * k * sc + (r() - 0.5) * 4 * sc, rad = (2.5 + 5.5 * eo(k)) * sc * (0.8 + 0.4 * r());
    const al = 0.62 * (1 - k) * (1 - k) + 0.04;
    L.fillStyle = `rgba(255,244,216,${al.toFixed(3)})`; L.beginPath(); L.arc(x + ox, y + oy, rad, 0, TAU); L.fill();
    L.fillStyle = `rgba(255,214,140,${(al * 0.7).toFixed(3)})`; L.beginPath(); L.arc(x + ox + lightX * rad * 0.35, y + oy - rad * 0.2, rad * 0.62, 0, TAU); L.fill();
  }
  L.restore();
  // gouttelettes : trajectoires balistiques, éclats clairs dans le contre-jour
  for (let i = 0; i < 18; i++) {
    const sp = (45 + 95 * r()) * sc, aa = ang + (r() - 0.5) * 1.15, d = 0.012 * (i % 6), a = u - d, life = 0.45 + 0.5 * r(), big = r() < 0.22; if (a < 0 || a > life) continue;
    const vx = Math.cos(aa) * dir * sp, vy = Math.sin(aa) * sp, drag = 3.2, px_ = x + vx * (1 - Math.exp(-drag * a)) / drag, py_ = y + vy * (1 - Math.exp(-drag * a)) / drag + 0.5 * 70 * sc * a * a;
    const k = a / life, col = k > 0.75 ? ST[7] : (i % 3 === 0 ? AM[9] : WH[3]);
    if (k < 0.9) { R(px_, py_, big ? 2 : 1, big ? 2 : 1, col); if (big && k < 0.4) px(px_ + lightX * 2, py_ - 1, AM[8]); }
  }
}
// « ATCHOUM » en pixels nets (dans ui) : (x, y) = centre en x, haut du texte ; p : 0 → 1 (les lettres sautent l'une après l'autre, restent, puis se dissolvent) ; o : sc (2), col, outline, text, wave
function ly_atchoum(x, y, p, o = {}) {
  if (p <= 0 || p >= 1) return;
  const txt = o.text ?? 'ATCHOUM', sc = o.sc ?? 2, n = txt.length, col = o.col ?? YE[3], out = o.outline ?? '#05040f', shd = o.shadow ?? RD[3], dis = prog(p, 0.74, 1), wv = o.wave ?? 1.6;
  const w = textW(txt, sc); let cx0 = Math.round(x - w / 2); if (p < 0.12) cx0 += Math.round(Math.sin(p * 120) * 1.5);
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const ch = txt[i], g = G[ch] || G[' '], age = (p - i * 0.022) / 0.1; if (age <= 0) { cx0 += (g[0].length + 1) * sc; continue; }
    const pop = 1 + (1 - eo(clamp(age))) * 0.5, sci = Math.max(1, Math.round(sc * pop)), oy = Math.round(-Math.sin(p * 22 - i * 0.9) * wv * (1 - dis) - (1 - eo(clamp(age))) * 6);
    const gx = cx0 - Math.round((sci - sc) * g[0].length / 2), gy = Math.round(y + oy - (sci - sc) * 3);
    const draw = (dx, dy, c) => { L.fillStyle = c; for (let r2 = 0; r2 < g.length; r2++) for (let q = 0; q < g[r2].length; q++) if (g[r2][q] === '#') {
      if (dis > 0) { const bx = gx + q * sci + dx, by = gy + r2 * sci + dy; if (BAYER[(by & 3) * 4 + (bx & 3)] < dis) continue; }
      L.fillRect(gx + q * sci + dx, gy + r2 * sci + dy, sci, sci); } };
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [1, 2]]) draw(dx, dy, out);
    draw(0, 1, shd); draw(0, 0, col);
    cx0 += (g[0].length + 1) * sc;
  }
  L.restore();
}

// ───────────────────────── l'urne et le bulletin ─────────────────────────
// (cx, cy) = sol au milieu de la face avant ; s = 1 → urne de 66 px de large, 46 de haut. o : fall 0..1 (le bulletin tombe dans la fente : 0 = au-dessus, 1 = avalé), bump 0..1 (l'urne encaisse), paper {x, y} (bulletin libre : centre en pixels écran,
// remplace la chute), tilt (rad, bulletin libre), env, light (côté du soleil), shadow.
// Renvoie { slot: [x, y] (le milieu de la fente, en écran), top: [x, y] (le dessus de l'urne), w, h }.
function ly_paperDraw(x, y, w, h, o = {}) {                                       // un bulletin : feuille blanche, bord, « OUI » vert ; (x, y) = centre ; skew décale le haut en x
  const sk = o.skew || 0, x0 = Math.round(x - w / 2), x1 = Math.round(x + w / 2), y0 = Math.round(y - h / 2), y1 = Math.round(y + h / 2);
  poly([[x0 + sk, y0 - 1], [x1 + sk + 1, y0 - 1], [x1 + 1, y1 + 1], [x0, y1 + 1]], '#05040f');
  poly([[x0 + sk + 1, y0], [x1 + sk, y0], [x1, y1], [x0 + 1, y1]], WH[2]);
  poly([[x1 + sk - 2, y0], [x1 + sk, y0], [x1, y1], [x1 - 2, y1]], WH[0]);
  const sc = w >= 30 ? 2 : 1, tw = textW('OUI', sc), tx = Math.round(x - tw / 2 + sk * 0.5), ty = Math.round(y - 3.5 * sc);
  if (h >= 14 && tx >= 0 && tx + tw <= LW) ptext('OUI', tx, ty, GR[2], sc, null);
  if (h >= 24) { for (let i = 0; i < 3; i++) R(x0 + 4 + sk * 0.3, y1 - 7 + i * 2 - (sc === 2 ? 2 : 0), Math.max(2, w - 8 - (i === 2 ? 5 : 0)), 1, ST[6]); }
}
function ly_ballot(cx, cy, s, t, o = {}) {
  const E = fl_env({ env: o.env || 'savannaDawn' }), lightX = o.light ?? E.light, bump = clamp(o.bump ?? 0), sy = 1 - 0.05 * bump, sx = 1 + 0.025 * bump;
  const X_ = x => cx + x * s * sx, Y_ = y => cy + y * s * sy, W2 = 33, Hf = 46, Ht = 58, Wt = 28;
  const shK = clamp(o.shadow ?? 1); if (shK > 0 && typeof k_shadow === 'function') k_shadow(cx - lightX * 6 * s, cy + 0.5 * s, 46 * s, Math.max(2, 5 * s), 0.5 * shK, { col: '46,26,86' });
  const P = pts => pts.map(p => [X_(p[0]), Y_(p[1])]);
  // face avant : planches de bois, sangles de métal, étiquette
  poly(P([[-W2, 0], [W2, 0], [W2, -Hf], [-W2, -Hf]]), '#05040f');
  poly(P([[-W2 + 0.6, -0.6], [W2 - 0.6, -0.6], [W2 - 0.6, -Hf + 0.6], [-W2 + 0.6, -Hf + 0.6]]), WO[5]);
  for (let i = 1; i < 6; i++) { const x = -W2 + i * (2 * W2 / 6); R(X_(x), Y_(-Hf + 1), Math.max(1, rd(0.9 * s)), rd((Hf - 2) * s * sy), WO[4]); }
  R(X_(-W2 + 1), Y_(-Hf + 1), rd(5 * s), rd((Hf - 2) * s * sy), WO[3]);                                  // côté gauche à l'ombre
  R(X_(W2 - 3), Y_(-Hf + 1), rd(2 * s), rd((Hf - 2) * s * sy), AM[5]);                                    // liseré du soleil à droite
  for (const yy of [-Hf + 1, -7]) { R(X_(-W2 + 0.6), Y_(yy), rd((2 * W2 - 1.2) * s * sx), rd(5 * s * sy), ST[3]); R(X_(-W2 + 0.6), Y_(yy), rd((2 * W2 - 1.2) * s * sx), Math.max(1, rd(1 * s)), ST[6]); for (const rx of [-W2 + 4, W2 - 5]) px(X_(rx), Y_(yy + 2.5), ST[7]); }
  if (s >= 0.6) { const lx = X_(-17), ly = Y_(-35), lw = rd(34 * s * sx), lh = rd(22 * s * sy); R(lx - 1, ly - 1, lw + 2, lh + 2, '#05040f'); R(lx, ly, lw, lh, WH[1]); R(lx, ly + lh - Math.max(1, rd(2 * s)), lw, Math.max(1, rd(2 * s)), WH[0]); ptextC('VOTE', lx + lw / 2, ly + lh / 2 - (s >= 1.6 ? 7 : 3.5), NI[1], s >= 1.6 ? 2 : 1, null); }
  // dessus : plateau clair, fente
  poly(P([[-W2, -Hf], [W2, -Hf], [Wt, -Ht], [-Wt, -Ht]]), '#05040f');
  poly(P([[-W2 + 0.8, -Hf - 0.5], [W2 - 0.8, -Hf - 0.5], [Wt - 0.6, -Ht + 0.6], [-Wt + 0.6, -Ht + 0.6]]), WO[6]);
  poly(P([[W2 - 7, -Hf - 0.5], [W2 - 0.8, -Hf - 0.5], [Wt - 0.6, -Ht + 0.6], [Wt - 5, -Ht + 0.6]]), AM[7]);
  const slotY = -Hf - 6, sl = [X_(0), Y_(slotY)];
  R(X_(-17), Y_(slotY - 1.6), rd(34 * s * sx), Math.max(2, rd(3.2 * s * sy)), NI[0]);
  R(X_(-17), Y_(slotY + 1.8), rd(34 * s * sx), Math.max(1, rd(0.9 * s)), WO[2]);
  R(X_(-17), Y_(-Ht + 0.6), rd(34 * s * sx), 1, AM[9]);
  // bulletin
  const pw = Math.round(24 * s), ph = Math.round(31 * s);
  if (o.paper) { L.save(); if (Math.abs(o.paper.x - cx) < 22 * s) { L.beginPath(); L.rect(0, 0, LW, Math.round(Y_(slotY) + 1)); L.clip(); } ly_paperDraw(o.paper.x, o.paper.y, pw, ph, { skew: Math.round((o.tilt || 0) * 10 * s) }); L.restore(); }
  else if (o.fall != null && o.fall < 1) {
    const f = clamp(o.fall), top0 = Y_(slotY) - ph - 30 * s, top1 = Y_(slotY) + 3 * s, ytop = lerp(top0, top1, Math.pow(f, 1.5)), sw = Math.sin(f * 8) * 3 * (1 - f) * s;
    L.save(); L.beginPath(); L.rect(0, 0, LW, Math.round(Y_(slotY) + 1)); L.clip();
    ly_paperDraw(cx + sw, ytop + ph / 2, pw, ph, { skew: Math.round(sw * 0.9) }); L.restore();
  }
  return { slot: sl, top: [X_(0), Y_(-Ht)], w: 2 * W2 * s, h: Ht * s, paperW: pw, paperH: ph, slotY: Y_(slotY) };
}

// ───────────────────────── le museau de face, en gros plan ─────────────────────────
// (cx, cy) = centre de la truffe ; s = 1 → truffe de 40 px de large, visage de 120 px (jusqu'aux yeux et aux oreilles). o : sneeze (−0,5..1, voir ly_sneezeEnv ; par défaut le nez respire), ballot 0..1 (un bulletin collé sous la truffe), bx, by (décalage du bulletin),
// open (gueule), eye, env, rim, ears 0..1 (visibles ; défaut 1), seed (motif de joue), t0.
// Renvoie { nose, nostrilL, nostrilR, eyeL, eyeR, lip, w }.
function ly_nose(cx, cy, s, t, o = {}) {
  const seed = o.seed ?? 3, coat = ly_coat(seed), C = ly_pal(o.env || 'savannaDawn', o.fog || 0, o.sil || 0), E = C.E, lightX = o.light ?? E.light, rimK = clamp(o.rim ?? 1);
  const sn = o.sneeze || 0, ex = Math.max(0, sn), inh = Math.max(0, -sn), tt = t + seed * 1.3;
  const flare = 1 + 0.1 * Math.sin(tt * 5.2) + 0.55 * inh - 0.4 * ex, up = -3.5 * inh + 2 * ex, zoom = 1 + 0.07 * ex, sqz = 1 - 0.14 * ex;
  const R_ = 150 * s * zoom; ly_BB = [Math.max(0, Math.floor(cx - R_ - 4)), Math.max(0, Math.floor(cy - 135 * s * zoom - 4)), Math.min(LW, Math.ceil(cx + R_ + 4)), Math.min(LH, Math.ceil(cy + 70 * s * zoom + 4))];
  ly_layerBegin();
  const c = Y; c.setTransform(s * zoom, 0, 0, s * zoom, cx, cy + ex * 3 * s); c.lineJoin = 'round';
  const ll = ly_norm([lightX * 0.9, -0.5]), mn = u => Math.max(u, 1.05 / (s * zoom)), bl = u => Math.max(0.5, u * s);
  const dark = (path, off = 4, blur = 1.4, a = 0.5, col = C.shadowCol) => ly_cres(c, path, col, ll[0] * mn(off), ll[1] * mn(off), bl(blur), a);
  const lite = (path, off = 2.4, blur = 0.9, a = 0.3, col = C.litCol) => ly_cres(c, path, col, -ll[0] * mn(off), -ll[1] * mn(off), bl(blur), a);
  const rimL = (path, w = 1.1, a = 1) => { if (rimK > 0) ly_cres(c, path, C.rim, -ll[0] * mn(w), -ll[1] * mn(w), 0, rimK * a); };
  const halo = (path, col = C.line, w = 1.2) => { c.lineWidth = mn(w); c.strokeStyle = col; c.stroke(path); };
  const mir = pts => pts.concat(pts.slice(1).reverse().map(p => [-p[0], p[1]]));
  const tone = (k, m = 'mid') => C[LY_KEYS[k]][m];
  const earOpen = clamp(o.ears ?? 1);
  // oreilles (vue de face : l'intérieur clair, bordé de poils sombres) : elles se couchent vers l'extérieur à l'éternuement
  if (earOpen > 0) for (const sd of [-1, 1]) {
    const pv = [sd * 50, -84 + up], a = sd * (0.18 + 0.7 * ex), q = pts => pts.map(p => { const r = ly_rot([pv[0] + p[0], pv[1] + p[1]], pv, a); return r; });
    const outer = ly_spline(q([[-20, 8], [-27, -10], [-24, -32], [-9, -48], [10, -48], [24, -32], [27, -10], [20, 8]])), inner = ly_spline(q([[-13, 4], [-18, -10], [-15, -28], [-5, -38], [7, -38], [15, -28], [18, -10], [13, 4]]));
    halo(outer, C.line, 1.4); c.fillStyle = tone('b', 'lo'); c.fill(outer);
    c.fillStyle = tone('k', 'mid'); c.save(); c.clip(outer); c.fillStyle = tone('k', 'mid'); c.fill(ly_ell(pv[0] + sd * 8, pv[1] - 20, 22, 30, 0)); c.restore();
    c.fillStyle = C.earIn; c.fill(inner);
    c.save(); c.clip(inner); c.strokeStyle = tone('t', 'lo'); c.lineWidth = mn(1.3); for (let k = 0; k < 4; k++) { c.beginPath(); const q0 = ly_rot([pv[0] + (k - 1.5) * 6, pv[1] - 4], pv, a), q1 = ly_rot([pv[0] + (k - 1.5) * 4, pv[1] - 30], pv, a); c.moveTo(q0[0], q0[1]); c.lineTo(q1[0], q1[1]); c.stroke(); } c.restore();
    dark(outer, 4, 1.2, 0.4); rimL(outer, 1.1, 0.9);
  }
  // visage : brun, joues claires
  const face = ly_spline(mir([[0, -98 + up], [26, -94 + up], [50, -80 + up], [60, -54], [58, -26], [50, 0], [38, 22], [22, 38], [8, 44]]));
  halo(face, C.line, 1.4); c.fillStyle = tone(coat.head.cheek, 'mid'); c.fill(face);
  c.save(); c.clip(face);
  c.fillStyle = tone(coat.head.throat === 'k' ? 't' : coat.head.throat, 'mid'); c.fill(ly_ell(-44, 30, 22, 26, 0.3)); c.fill(ly_ell(44, 30, 22, 26, -0.3));        // joues claires
  c.fillStyle = tone('k', 'mid'); c.fill(polyPath([[-6, -100 + up], [6, -100 + up], [10, -70], [16, -50], [-16, -50], [-10, -70]]));                                    // raie noire du front
  for (const sd of [-1, 1]) { c.fillStyle = tone('k', 'lo'); c.fill(ly_ell(sd * 33, -60 + up * 0.5, 19, 13, sd * -0.25)); }                                               // masques sombres autour des yeux
  c.restore();
  dark(face, 6, 2, 0.4); lite(face, 3.4, 1.3, 0.28); rimL(face, 1.3, 0.9);
  // museau noir
  const half = [[0, -52 + up * 0.6], [13, -50 + up * 0.6], [26, -38], [34, -20], [38, -1], [37, 16], [30, 29], [16, 36], [0, 37]];
  const muzzle = ly_spline(half.concat(half.slice(1, -1).reverse().map(p => [-p[0], p[1]])));
  halo(muzzle, C.line, 1.2); c.fillStyle = tone('k', 'mid'); c.fill(muzzle);
  dark(muzzle, 5, 1.6, 0.5); lite(muzzle, 3, 1.1, 0.34); rimL(muzzle, 1.1, 0.8);
  // plis du nez qui se froncent à l'éternuement
  if (ex > 0.15) for (let k = 0; k < 3; k++) { const yy = -24 - k * 6 + up, ww = 15 - k * 2.4; c.strokeStyle = tone('b', 'hi'); c.lineWidth = mn(1.5); c.beginPath(); c.moveTo(-ww, yy + 2); c.quadraticCurveTo(0, yy - 3 * ex, ww, yy + 2); c.stroke(); }
  // babines et menton
  const lipP = new Path2D(); lipP.moveTo(0, 17 + up * 0.3); lipP.lineTo(0, 26); lipP.bezierCurveTo(-4, 31, -17, 31, -26, 24); lipP.moveTo(0, 26); lipP.bezierCurveTo(4, 31, 17, 31, 26, 24);
  c.strokeStyle = C.blk.deep; c.lineWidth = mn(1.6); c.stroke(lipP);
  const mo = clamp(o.open ?? 0.25 * ex);
  if (mo > 0.05) { c.fillStyle = C.mouth; c.fill(polyPath([[-20, 27], [20, 27], [16, 27 + 14 * mo], [-16, 27 + 14 * mo]])); c.fillStyle = C.teeth; c.fill(polyPath([[-9, 27], [-5, 27], [-7, 27 + 5]])); c.fill(polyPath([[5, 27], [9, 27], [7, 27 + 5]])); }
  // bulletin collé sous la truffe (dans la couche : la truffe le recouvre)
  if (o.ballot) { const bx = o.bx || 0, by = o.by || 0, pp = polyPath([[bx - 17, 8 + by], [bx + 17, 8 + by], [bx + 17, 51 + by], [bx - 17, 51 + by]]); halo(pp, C.line, 1.2); c.fillStyle = WH[2]; c.fill(pp); c.fillStyle = WH[0]; c.fillRect(bx + 13, 8 + by, 4, 43); }
  // truffe : trapèze arrondi, noir violacé et humide
  const pad = ly_smooth([[-21 * sqz, -11 + up], [0, -13 + up], [21 * sqz, -11 + up], [22 * sqz, -1 + up], [15 * sqz, 12 + up], [0, 17 + up], [-15 * sqz, 12 + up], [-22 * sqz, -1 + up]]);
  halo(pad, C.line, 1.3); c.fillStyle = ly_mix(DU[0], C.sh, 0.2); c.fill(pad);
  c.save(); c.clip(pad); c.fillStyle = NI[0]; c.fill(ly_ell(0, 12 + up, 26, 8, 0)); c.restore();
  dark(pad, 3, 1, 0.4); lite(pad, 2, 0.8, 0.28); rimL(pad, 0.9, 0.6);
  const nsL = [-11 * sqz, 1.5 + up], nsR = [11 * sqz, 1.5 + up], nsPath = (p, sd) => ly_ell(p[0], p[1], 6 * flare * (1 - 0.15 * ex), 3.4 * flare * (1 - 0.3 * ex), sd * 0.55);
  for (const [p, sd] of [[nsL, -1], [nsR, 1]]) { const ns = nsPath(p, sd); c.fillStyle = NI[0]; c.fill(ns); }
  c.strokeStyle = tone('k', 'lo'); c.lineWidth = mn(1.2); c.beginPath(); c.moveTo(0, 6 + up); c.lineTo(0, 17 + up); c.stroke();                                    // sillon de la truffe
  c.setTransform(1, 0, 0, 1, 0, 0);
  ly_layerEnd({ outline: o.outline === undefined ? ly_mix('#05040f', C.sh, 0.2) : o.outline });

  // ── détails nets : reflets de la truffe, yeux, pores et moustaches ──
  L.setTransform(1, 0, 0, 1, 0, 0);
  const Z = s * zoom, P0 = (x, y) => [cx + x * Z, cy + ex * 3 * s + y * Z], pxl = (x, y, col, w = 1, h = 1) => R(Math.round(x), Math.round(y), w, h, col);
  { const a = P0(-13 * sqz, -8 + up), b = P0(-3, -9.4 + up), d = P0(-17 * sqz, -3 + up);                                                                              // reflet humide en arc, haut gauche
    lineP(a[0], a[1], b[0], b[1] - 0.5, WH[3], Math.max(1, Math.round(1.4 * Z))); lineP(d[0], d[1] + 1, a[0], a[1], WH[3], Math.max(1, Math.round(1.2 * Z))); const e = P0(10 * sqz, -9 + up), f = P0(14 * sqz, -7 + up); lineP(e[0], e[1], f[0], f[1], ST[7], 1);
    const g = P0(-9, 14 + up), h = P0(9, 14 + up); lineP(g[0], g[1], h[0], h[1], CY[2], 1); pxl(...P0(11, 11 + up), CY[4]); }
  for (const [sd, X0] of [[-1, -1], [1, 1]]) {                                                                                                                         // narines : liseré humide sous l'ouverture
    const p = P0(X0 * 11 * sqz, 1.5 + up + 4 * flare * (1 - 0.3 * ex)); pxl(p[0] - 2, p[1], DU[3], 4, 1); }
  // pores des moustaches sur la babine
  if (s >= 0.7) for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) { const p = P0(sd * (14 + k * 6.5 + r * 1.5), 14 + r * 5 + k * 0.6 + up * 0.3); pxl(p[0], p[1], WO[3]); }
  // moustaches : fines courbes claires
  const whisk = (x0, y0, dx, dy, bend) => { let prev = P0(x0, y0); for (let i = 1; i <= 8; i++) { const f = i / 8, q = P0(x0 + dx * f, y0 + dy * f + bend * f * f); lineP(prev[0], prev[1], q[0], q[1], i < 6 ? WH[2] : ST[6], 1); prev = q; } };
  for (const sd of [-1, 1]) { whisk(sd * 30, 18 + up * 0.3, sd * 52, -6, 22); whisk(sd * 28, 22 + up * 0.3, sd * 56, 8, 20); whisk(sd * 26, 26 + up * 0.3, sd * 46, 22, 14); }
  // yeux
  const eyeOpen = o.eye != null ? clamp(o.eye) : clamp(1 - 1.4 * ex), er = Math.max(2, Math.round(7 * Z));
  const eyes = [P0(-33, -60 + up * 0.5), P0(33, -60 + up * 0.5)];
  for (const [i, e] of eyes.entries()) {
    const sd = i ? 1 : -1;
    if (eyeOpen > 0.35) {
      L.fillStyle = '#05040f'; L.beginPath(); L.ellipse(e[0], e[1], er + 1.5, er * 0.78 + 1.5, sd * -0.18, 0, TAU); L.fill();
      L.fillStyle = ly_mix(AM[7], '#48291a', 0.15); L.beginPath(); L.ellipse(e[0], e[1], er, er * 0.76, sd * -0.18, 0, TAU); L.fill();
      L.fillStyle = '#12100c'; L.beginPath(); L.arc(e[0] - sd * 0.5, e[1] + 0.5, Math.max(1.4, er * 0.52), 0, TAU); L.fill();
      pxl(e[0] - er * 0.4, e[1] - er * 0.45, WH[3], Math.max(1, Math.round(er * 0.3)), Math.max(1, Math.round(er * 0.3)));
    } else { const lw = Math.max(1, Math.round(1.2 * Z)); lineP(e[0] - sd * er, e[1] - er * 0.4, e[0] + sd * 1, e[1] + er * 0.3, '#05040f', lw + 1); lineP(e[0] - sd * er, e[1] + er * 0.9, e[0] + sd * 1, e[1] + er * 0.3, '#05040f', lw + 1); lineP(e[0] - sd * er, e[1] - er * 0.4, e[0] + sd * 1, e[1] + er * 0.3, WO[5], lw); lineP(e[0] - sd * er, e[1] + er * 0.9, e[0] + sd * 1, e[1] + er * 0.3, WO[5], lw); }
  }
  if (o.ballot) { const q = P0(o.bx || 0, 36 + (o.by || 0)), sc2 = Z >= 1.6 ? 2 : 1; if (q[0] - 16 >= 0 && q[0] + 16 <= LW) ptextC('OUI', q[0], q[1] - 3.5 * sc2, GR[2], sc2, null); }
  return { nose: P0(0, 0), nostrilL: P0(nsL[0], nsL[1]), nostrilR: P0(nsR[0], nsR[1]), eyeL: eyes[0], eyeR: eyes[1], lip: P0(0, 26), w: 120 * Z, paper: P0(o.bx || 0, 29.5 + (o.by || 0)) };
}

// ───────────────────────── icône du carnet : tête de lycaon de face (17 × 17, centrée en (cx, cy), couleurs exactes) ─────────────────────────
ICONES[2] = function (cx, cy) {
  cx = Math.round(cx); cy = Math.round(cy);
  const o = '#05040f', K = WO[2], k = WO[0], e = SK[3], f = WO[6], F = WO[5], w = WH[2], W = WH[0], y = AM[8];
  // grandes oreilles rondes (contour sombre, dos brun-noir, intérieur clair)
  for (const sd of [-1, 1]) {
    ell(cx + sd * 5, cy - 4, 3, 4, o); ell(cx + sd * 5, cy - 4, 2, 3, K); R(cx + sd * 5 - (sd < 0 ? 0 : 1), cy - 6, 1, 4, e); px(cx + sd * 5 - (sd < 0 ? 0 : 1) + (sd < 0 ? -1 : 1), cy - 5, F);
  }
  // visage : fauve, ombré à droite ; raie noire du front ; taches ; museau noir
  ell(cx, cy + 2, 6, 6, o); ell(cx, cy + 2, 5, 5, f);
  R(cx + 3, cy - 1, 2, 6, F); px(cx + 4, cy + 5, F);
  R(cx - 1, cy - 4, 2, 4, k); px(cx, cy, k);                                  // raie du front
  R(cx - 5, cy - 1, 2, 2, k); px(cx - 4, cy + 1, k);                           // tache noire à gauche
  R(cx + 3, cy - 3, 2, 2, w);                                                  // tache blanche à droite
  ell(cx, cy + 5, 3, 2, k); R(cx - 2, cy + 6, 5, 1, k); R(cx - 1, cy + 4, 3, 1, k);   // museau noir
  px(cx - 1, cy + 4, ST[5]);                                                   // reflet de la truffe
  R(cx - 5, cy + 4, 2, 2, w); px(cx - 5, cy + 3, W);                           // joue blanche
  // yeux ambrés dans le masque sombre
  for (const sd of [-1, 1]) { px(cx + sd * 3, cy + 1, '#12100c'); px(cx + sd * 3, cy, y); }
};
