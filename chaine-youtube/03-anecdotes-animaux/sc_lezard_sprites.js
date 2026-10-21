'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_lezard_sprites.js — le LÉZARD À CORNES, le COYOTE et les accessoires du jet de sang (segment Mexique). Préfixe lz_.
   Tout se dessine sur L (270 × 480) dans draw(u, t) (avant le tramage), sauf ICONES[1] (ui). Fonctions pures du temps : aucun Math.random ni Date.

   lz_lizard(cx, cy, s, t, o)     lézard royal (Phrynosoma solare). (cx, cy) = centre de l'empreinte au sol (centre de l'ombre) ; s = 1 → ≈ 105 px de long (queue au bout des cornes), s = 0,4 → 42 px.
                                  Couronne : quatre dagues larges en éventail (≈ 50°, 30°, 14°, −4° au-dessus de l'horizontale, longueur ≈ 0,7 fois la tête), deuxième étage de trois cornes temporales, deux piquants de mâchoire, arcade sourcilière.
                                  o.pose 'rest' | 'alert' (tête levée, couronne un peu dressée) | 'walk' | 'flat' (aplati : disque posé au sol, couronne couchée vers l'arrière, presque pas d'ombre ; ≈ 28 % plus bas que rest) | 'puff' (gonflé : disque épaissi, couronne dressée au-dessus) | 'squirt' (+ o.pose2 et o.mix 0..1 : fondu continu d'une pose à l'autre),
                                  o.flip (tourné vers la gauche), o.eye (0 fermé … 1 ouvert ; défaut : cligne tout seul), o.bulge 0..1 (sinus de l'œil gonflé : bosse rouge de la rampe RD qui dépasse du profil de la tête, veines ; l'œil s'agrandit et montre son blanc), o.puff 0..1 (gonflement en plus de la pose),
                                  o.rim 0..1 (liseré de soleil, 1), o.light ±1 (côté du soleil, +1 = droite), o.shadow 0..1 (ombre au sol, 1), o.camo 0..1 (se fond dans le sable : couleurs, contour (tend vers #8a5a34), liseré et frange atténués ; presque invisible à 1),
                                  o.ph, o.go, o.pre (walk : phase de pas, vitesse 0..1 et anticipation 0..1 — viennent de lz_gait ; sinon tirés de lz_gait(t)), o.seed (individu : taches), o.env ('desertDusk' par défaut ; 'none' = lumière neutre), o.outline (couleur du contour ; remplace celle de camo).
                                  Renvoie { T(lx, ly) → [x, y] écran (repère du corps), Th (repère de la tête), eye, jet (point de départ du jet : coin de l'œil côté museau), head, mouth, crown, bodyTop, tail, w, bulge } : repères pour viser (jet, éclaboussure).
   lz_gait(t, o)                  marche PAR À-COUPS : { ph, go (0..1 vitesse), x (distance parcourue en px à s = 1, signée vers l'avant), moving, pre (0..1 : le lézard se ramasse, tête en arrière, 0,16 s avant chaque départ) } ; o.stride (px à s = 1 par cycle de pas ; défaut LZ_STRIDE = 2·amp/duty = 17,14 : les pieds restent PLANTÉS), o.t0 (début), o.pause (1 : durée des arrêts).
                                  Position du lézard : cx = x0 + (o.flip ? −1 : 1) × lz_gait(t − t0).x × s. Passer ph, go et pre à lz_lizard.
   lz_coyote(cx, cy, s, t, o)     coyote de profil. (cx, cy) = sol sous le centre du corps ; s = 1 → ≈ 150 px de long (museau à la queue), hauteur au garrot ≈ 70 px. Ombres chaudes (SK / OC / WO), jamais le bleu ST.
                                  o.pose 'trot' | 'stalk' | 'sniff' | 'hit' | 'disgust' | 'trotOff' ; o.flip ; o.ph (phase de cycle de pas, sinon t) ; o.speed (0 = pattes à l'arrêt) ; o.headDown 0..1 ; o.mouth 0..1 (gueule ouverte) ; o.tongue 0..1 ; o.wrinkle 0..1 (nez plissé) ; o.eye 0..1 ;
                                  o.shake 0..1 (secouement de tête : deux copies pleines de la tête à 38 et 22 %, traits de vitesse, gouttes de bave projetées de côté) ; o.drool (false pour couper la bave) ; o.hit 0..1,2 (valeur fixe du sursaut) ;
                                  o.t0 + o.tau : instant du choc et ralenti de la scène. 'hit' part de 'sniff' : anticipation (la tête descend de 2 px dans les 0,07 s réelles AVANT t0 : passer pose 'hit' dès t0 − 0,07/tau), élan 0 → 1,15 en 0,07 s, retour vers 0,55 ; cou rentré, oreilles plaquées, œil en « > » froncé, nez plissé, gueule qui claque 0,1 s ;
                                  o.rim, o.light, o.shadow, o.env, o.seed, o.outline. Renvoie { T, Th, nose, eye, muzzle, head, ear, tail, mouth, w, hit }.
   lz_cGait(t, o)                 marche du coyote : { ph, x, freq } ; o.pose, o.t0, o.speed. Distances D par cycle de pas (px à s = 1) : trot 51, stalk 21,6, trotOff 41,4 ; cx = x0 + (flip ? −1 : 1) × x × s.
   lz_jet(x0, y0, vx, vy, t0, t, o)  jet de sang balistique (filet continu à contour sombre jusqu'à breakAge 0,15 s, puis gouttes de 2 × 2 px ou plus à contour sombre) ; lz_jetVel(x0, y0, x1, y1, T, g) → [vx, vy] pour toucher (x1, y1) après T secondes ; lz_jetEnd(…) ; lz_splat(x, y, t, o) ; lz_ruler(x, y, w, t, o) ; lz_rulerText(…).
                                  Gravité : LZ_G = 520 px/s² par défaut ; o.pxm (pixels par mètre de la scène) donne la gravité réelle 9,81 × pxm (lz_gOf({ pxm }) pour lz_jetVel).
   ICONES[1]                      icône 17 × 17 du carnet (tableau LZ_ICON dessiné à la main, 8 tons, contour d'un pixel calculé).

   ÉCHELLES RÉELLES — le lézard mesure 8 à 12 cm, le coyote ≈ 60 cm au garrot (rapport ≈ 1:6 en hauteur, ≈ 1:12 en longueur) : lézard 10 cm = 105 px à s = 1 ; coyote 60 cm au garrot = 70 px à s = 1.
   Règle 1 m = 200 px : lézard s ≈ 0,20 (21 px, lisible), coyote s ≈ 1,2. Ne jamais montrer la règle à côté d'un lézard de s > 0,3 : en l3_metre mettre le lézard minuscule au zéro de la règle ou le sortir du cadre.
   En l2_menace / l2_jet (coyote et lézard dans le même cadre) l'échelle est TRICHÉE : coyote en gros plan (tête et épaule, s ≥ 2) avec un lézard s ≈ 0,5 à 0,7, ou coyote s ≈ 0,95 et lézard s ≈ 1,25 comme dans lz_jet.
   Recette camouflage (l1_desert) : lz_lizard(..., { pose: 'flat', camo: 1 }) ; contour plus clair possible avec outline '#8a5a34', rim 0,3, shadow 0,35.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ───────────────────────── outils ─────────────────────────
const lz_rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lz_hex = r => '#' + r.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
let LZ_SNAP = true;                                                  // les couleurs du lézard et du coyote sont ramenées d'avance à la palette : aplats nets, tramage seulement aux transitions voulues
function lz_snap(h) { const r = lz_rgb(h); return PAL_HEX[LUT[((r[0] >> 3) << 10) | ((r[1] >> 3) << 5) | (r[2] >> 3)]]; }
function lz_mix(a, b, k) { const A = lz_rgb(a), B = lz_rgb(b), m = lz_hex(A.map((v, i) => v + (B[i] - v) * k)); return LZ_SNAP ? lz_snap(m) : m; }
const lz_norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const lz_scr = mkCanvas(), lz_S = lz_scr.getContext('2d', { willReadFrequently: true });
let lz_BB = [0, 0, LW, LH];                                      // zone de travail (pixels écran) : limite le coût des croissants

// calque restreint à la zone de travail lz_BB (même résultat que layerBegin / layerEnd du moteur, mais sans parcourir tout l'écran)
function lz_layerBegin() { Y.setTransform(1, 0, 0, 1, 0, 0); Y.globalAlpha = 1; Y.globalCompositeOperation = 'source-over'; Y.filter = 'none'; const B = lz_BB; Y.clearRect(B[0] - 2, B[1] - 2, B[2] - B[0] + 4, B[3] - B[1] + 4); }
function lz_layerEnd(o = {}) {
  const B = lz_BB, x0 = Math.max(0, B[0] - 1), y0 = Math.max(0, B[1] - 1), x1 = Math.min(LW, B[2] + 1), y1 = Math.min(LH, B[3] + 1), w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  const id = Y.getImageData(x0, y0, w, h), d = id.data;
  for (let i = 3; i < d.length; i += 4) { const a = d[i]; if (a) d[i] = a >= 128 ? 255 : 0; }
  if (o.outline) {
    const oc = lz_rgb(o.outline), add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = y * w + x; if (d[p * 4 + 3]) continue; if ((x > 0 && d[(p - 1) * 4 + 3]) || (x < w - 1 && d[(p + 1) * 4 + 3]) || (y > 0 && d[(p - w) * 4 + 3]) || (y < h - 1 && d[(p + w) * 4 + 3])) add.push(p); }
    for (const p of add) { d[p * 4] = oc[0]; d[p * 4 + 1] = oc[1]; d[p * 4 + 2] = oc[2]; d[p * 4 + 3] = 255; }
  }
  Y.putImageData(id, x0, y0);
  L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(lay, x0, y0, w, h, x0, y0, w, h);
}
// croissant : la partie de path qui n'est PAS couverte par path décalé de (dx, dy) (donc du côté opposé au décalage), floutée de blur px et bornée à path
function lz_cres(c, path, col, dx, dy, blur = 0, alpha = 1) {
  const S = lz_S, B = lz_BB, w = B[2] - B[0], h = B[3] - B[1];
  S.setTransform(1, 0, 0, 1, 0, 0); S.globalCompositeOperation = 'source-over'; S.filter = 'none'; S.globalAlpha = 1; S.clearRect(B[0], B[1], w, h);
  S.setTransform(c.getTransform());
  S.fillStyle = col; S.fill(path);
  S.globalCompositeOperation = 'destination-out'; S.translate(dx, dy); S.fill(path);
  S.globalCompositeOperation = 'source-over'; S.setTransform(1, 0, 0, 1, 0, 0);
  c.save(); c.clip(path); c.setTransform(1, 0, 0, 1, 0, 0);
  if (blur > 0.85) c.filter = `blur(${blur.toFixed(2)}px)`;
  c.globalAlpha = alpha; c.drawImage(lz_scr, B[0], B[1], w, h, B[0], B[1], w, h);
  c.restore();
}
// courbe fermée lisse passant près des points (sommets = points de contrôle, passage par les milieux)
function lz_smooth(pts) {
  const p = new Path2D(), n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m0 = mid(pts[n - 1], pts[0]);
  p.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const a = pts[i], m = mid(a, pts[(i + 1) % n]); p.quadraticCurveTo(a[0], a[1], m[0], m[1]); }
  p.closePath(); return p;
}
// dague : ligne médiane courbe de la base à la pointe, largeur qui décroît ; renvoie un Path2D
function lz_dagger(base, tip, bw, curve = 0.1, pw = 0.85) {
  const dx = tip[0] - base[0], dy = tip[1] - base[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, N = 8;
  const ctrl = [base[0] + dx * 0.5 + nx * curve * len, base[1] + dy * 0.5 + ny * curve * len], pts = [], ws = [];
  for (let i = 0; i <= N; i++) { pts.push(bez(base, ctrl, tip, i / N)); ws.push(bw * Math.pow(1 - i / N, pw) + 0.12); }
  return polyPath(limb(pts, ws));
}
const lz_ell = (cx, cy, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); return p; };
const lz_tri = (a, b, tip) => polyPath([a, tip, b]);
// outils d'ombrage partagés (c = contexte Y déjà transformé ; ll = direction de la lumière en repère local ; s = échelle écran)
function lz_tools(c, s, ll, rimCol, rimK) {
  const mn = u => Math.max(u, 1.05 / s), bl = u => Math.max(0.5, u * s);
  return {
    mn, bl,
    dark: (path, col, off, blur = 1.1, a = 1) => lz_cres(c, path, col, ll[0] * mn(off), ll[1] * mn(off), bl(blur), a),
    lite: (path, col, off, blur = 0.7, a = 1) => lz_cres(c, path, col, -ll[0] * mn(off), -ll[1] * mn(off), bl(blur), a),
    rimL: (path, w = 0.9, a = 1) => { if (rimK > 0) lz_cres(c, path, rimCol, -ll[0] * mn(w), -ll[1] * mn(w), 0, rimK * a); },
    halo: (path, col, w = 1.4) => { c.lineWidth = mn(w); c.strokeStyle = col; c.lineJoin = 'round'; c.stroke(path); },
  };
}
// polygone « fourrure » : bords à touffes le long d'une ligne médiane (pts, largeurs ws), touffes d'amplitude amp
function lz_fur(pts, ws, amp, ph = 0, step = 2) {
  const Lp = [], Rp = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const tf = (k) => amp * (0.55 + 0.45 * Math.sin(i * 2.9 + ph + k)) * (i === 0 || i === n - 1 ? 0.3 : 1) * (i % 2 ? 1 : 0.35);
    Lp.push([pts[i][0] - ty * (ws[i] / 2 + tf(0)), pts[i][1] + tx * (ws[i] / 2 + tf(0))]); Rp.push([pts[i][0] + ty * (ws[i] / 2 + tf(2)), pts[i][1] - tx * (ws[i] / 2 + tf(2))]);
  }
  return Lp.concat(Rp.reverse());
}

// courbe de Catmull-Rom FERMÉE passant par tous les points (contour exact), ou chaîne ouverte de points interpolés
function lz_spline(pts) {
  const p = new Path2D(), n = pts.length; p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  p.closePath(); return p;
}
function lz_cr(pts, n = 5) {                                                      // points interpolés (Catmull-Rom ouvert) : n points par intervalle
  const out = [], m = pts.length;
  for (let i = 0; i < m - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(m - 1, i + 2)];
    for (let k = 0; k < n; k++) { const f = k / n, f2 = f * f, f3 = f2 * f; out.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * f + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * f2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * f3))); } }
  out.push(pts[m - 1].slice()); return out;
}
function lz_limbS(pts, ws, n = 5) {                                               // patte / queue à contour lisse : ligne médiane et largeurs interpolées
  const cp = lz_cr(pts, n), wp = lz_cr(ws.map((w, i) => [i, w]), n).map(q => Math.max(0.3, q[1]));
  return limb(cp, wp);
}

// ───────────────────────── poses du lézard ─────────────────────────
const LZ_POSE = {
  //          épaisseur  largeur  profondeur  tête(y, x)    tangage   piquants  cornes  pattes   respiration
  // hn : couchage de la couronne (0 = en éventail de repos, + = couchée vers le dos, − = dressée) ; flat : disque posé au sol (bd 0,72, bh 1,8) ; puff : disque épaissi mais ovale (bh 9,5), couronne dressée au-dessus du dôme
  rest: { bh: 5.2, bw: 1.0, bd: 1.0, hy: 0, hx: 0, hp: 0.05, sp: 0.25, hn: 0.0, lg: 0.0, br: 1.0 },
  alert: { bh: 6.0, bw: 0.98, bd: 1.0, hy: -4.5, hx: 1.5, hp: -0.16, sp: 0.35, hn: -0.1, lg: 0.0, br: 1.4 },
  walk: { bh: 5.2, bw: 1.0, bd: 1.0, hy: -1.5, hx: 1, hp: -0.04, sp: 0.3, hn: 0.05, lg: 0.0, br: 0.8 },
  flat: { bh: 1.8, bw: 1.14, bd: 0.72, hy: 4.0, hx: 1.5, hp: 0.1, sp: 0.5, hn: 0.7, lg: 1.0, br: 0.7 },
  puff: { bh: 9.5, bw: 1.18, bd: 1.18, hy: -1, hx: -2, hp: -0.02, sp: 1.0, hn: 0.1, lg: 0.0, br: 0.4 },
  squirt: { bh: 5.6, bw: 1.0, bd: 1.0, hy: 3.5, hx: 4.5, hp: 0.28, sp: 0.8, hn: 0.15, lg: 0.0, br: 0.5 },
};
function lz_pose(o) {
  const A = LZ_POSE[o.pose || 'rest'] || LZ_POSE.rest, B = o.pose2 ? (LZ_POSE[o.pose2] || A) : A, k = o.pose2 ? clamp(o.mix ?? 0) : 0, P = {};
  for (const key in A) P[key] = lerp(A[key], B[key], k);
  const pf = clamp(o.puff ?? 0);
  if (pf > 0) { P.bh = lerp(P.bh, 10, pf); P.bw = lerp(P.bw, 1.18, pf); P.bd = lerp(P.bd, 1.18, pf); P.sp = lerp(P.sp, 1, pf); P.hn = lerp(P.hn, 0.1, pf); P.hx = lerp(P.hx, -2, pf); P.hy = lerp(P.hy, -1, pf); }
  P.name = o.pose || 'rest'; P.walk = (o.pose === 'walk' ? 1 - k : 0) + (o.pose2 === 'walk' ? k : 0);
  return P;
}

// marche par à-coups : des départs brefs d'un demi-pas, des arrêts figés (le corps respire, la tête se règle) ; en fin de départ les quatre pattes sont au sol
const LZ_BURSTS = [[0.0, 0.42], [0.98, 0.34], [1.9, 0.44]], LZ_CYC = 2.75;
const LZ_AMP = 6, LZ_DUTY = 0.7, LZ_STRIDE = 2 * LZ_AMP / LZ_DUTY;                // foulée (px à s = 1 par cycle de pas) qui garde les pieds plantés pendant l'appui : 17,14
function lz_gait(t, o = {}) {
  const T = LZ_CYC * (o.pause ?? 1), stride = o.stride ?? LZ_STRIDE, tt = t - (o.t0 || 0);
  if (tt < 0) return { ph: 0.15, go: 0, x: 0, moving: false, pre: 0 };
  const cyc = Math.floor(tt / T), u = tt - cyc * T; let half = cyc * LZ_BURSTS.length, go = 0, pre = 0;
  for (let i = 0; i < LZ_BURSTS.length; i++) {
    const a = LZ_BURSTS[i][0] * (o.pause ?? 1), d = LZ_BURSTS[i][1];
    if (u >= a + d) half += 1; else if (u > a) { const p = (u - a) / d; half += eio(p); go = Math.sin(p * Math.PI); }
    const wait = ((a - u) % T + T) % T;                                       // temps avant le prochain départ : le lézard se ramasse (tête en arrière) 0,16 s avant
    if (go === 0 && wait > 0 && wait < 0.16) pre = Math.max(pre, sm(1 - wait / 0.16));
  }
  const ph = 0.15 + half * 0.5;
  return { ph, go, x: ph * stride - 0.15 * stride, moving: go > 0.02, pre };
}

// ───────────────────────── le lézard à cornes ─────────────────────────
function lz_lizard(cx, cy, s, t, o = {}) {
  const P = lz_pose(o), fl = o.flip ? -1 : 1, camo = clamp(o.camo ?? 0), rimK = clamp(o.rim ?? 1) * (1 - 0.55 * camo), shK = clamp(o.shadow ?? 1), seed = o.seed ?? 3;
  const envName = o.env || 'desertDusk', E = envName === 'none' ? { light: 1, rim: '#fff2c4', shadow: '#2e1a56', lit: '#ffc84a', shK: 0.1, liK: 0.1 } : fl_env({ env: envName, light: o.light });
  const lightX = o.light ?? E.light ?? 1, ll = lz_norm([lightX * fl * 0.9, -0.5]);                // direction de la lumière en repère local
  // ── couleurs ──
  const tgt = '#a96d3c', K = camo * 0.62, M = (h, k = 1) => lz_mix(h, tgt, K * k);
  const shTint = E.shadow, hiTint = E.lit;
  const C = {
    top: M(lz_mix(SK[3], OC[4], 0.28)), topHi: lz_mix(M(SK[4]), hiTint, 0.3), topLo: lz_mix(M(SK[2]), shTint, 0.2), rust: M(OC[3], 0.85), rustD: M(OC[2], 0.8),
    wall: M(lz_mix(SK[2], OC[3], 0.2)), wallLo: lz_mix(M(SK[1]), shTint, 0.32), under: M(WO[3]), spot: M(WO[2], 1.15), spotHi: M(AM[9], 0.9), cream: M(AM[10], 1.1),
    horn: M(SK[3]), hornHi: lz_mix(M(AM[9]), hiTint, 0.2), hornLo: lz_mix(M(SK[1]), shTint, 0.2), tipD: M(WO[3]), rim: E.rim || AM[9], out: o.outline || lz_mix('#1d120c', '#8a5a34', camo),   // camo → le contour tend vers un sable foncé
  };
  const tt = t + seed * 1.7;
  // ── respiration, clignement, marche ──
  const brA = 0.045 * P.br, breath = Math.sin(TAU * 0.78 * tt), breath2 = Math.sin(TAU * 0.78 * tt - 0.7);
  const walkOn = P.walk > 0.01, G = walkOn ? (o.ph != null ? { ph: o.ph, go: o.go ?? 1, pre: o.pre ?? 0 } : lz_gait(t)) : { ph: 0.15, go: 0, pre: 0 };
  const blinkT = (tt * 0.37) % 1, blink = blinkT > 0.955 ? Math.sin((blinkT - 0.955) / 0.045 * Math.PI) : 0;
  const eyeOpen = o.eye != null ? clamp(o.eye) : 1 - blink;
  const bulge = clamp(o.bulge ?? 0);
  // ── dimensions ──
  const bh = P.bh * (1 + brA * breath), W = 29 * P.bw * (1 + 0.012 * breath), Dp = 17.0 * P.bd, bob = walkOn ? Math.sin(TAU * G.ph * 2) * 0.9 * G.go : 0;
  const cT = [-2, -bh - 1.6 + bob], rxT = W - 2.6, ryT = Dp - 3.4;               // dessus (ellipse), le flanc est l'ellipse au sol
  const sway = walkOn ? Math.sin(TAU * G.ph) * G.go : 0, idle = Math.sin(tt * 0.9) * 0.5 + Math.sin(tt * 2.3 + 1) * 0.25, roll = 0.03 * sway;
  const H0 = [32 + P.hx - 1.3 * G.pre, -6.5 + P.hy + bob + 0.35 * breath2], hp = P.hp + (walkOn ? 0.03 * sway : 0) + 0.012 * idle + 0.05 * G.pre;
  const hc = Math.cos(hp), hs = Math.sin(hp);
  const Th = (x, y) => [H0[0] + x * hc - y * hs, H0[1] + x * hs + y * hc];     // repère de la tête → repère du corps
  const Tb = (x, y) => [cx + fl * s * x, cy + s * y];                           // repère du corps → écran
  const Ts = (x, y) => Tb(...Th(x, y));
  // zone de travail
  const ex = 78 * s + 8; lz_BB = [Math.max(0, Math.floor(cx - ex)), Math.max(0, Math.floor(cy - 62 * s - 8)), Math.min(LW, Math.ceil(cx + ex)), Math.min(LH, Math.ceil(cy + 36 * s + 8))];
  // ombre au sol : aplati, le lézard ne projette presque pas d'ombre (faits.md)
  if (shK > 0) { const sx = cx - lightX * 5 * s * (1 - 0.6 * P.lg), a = 0.55 * shK * (1 - 0.45 * camo) * (1 - 0.55 * P.lg), rx = (W + 5 + 3 * P.lg) * s, ry = (Dp + 1.5) * s * 0.9;
    if (typeof k_shadow === 'function') k_shadow(sx, cy + 1.5 * s, rx, ry, a, { col: '40,16,52' }); else ell(sx, cy + 2 * s, rx, Dp * s, 'rgba(20,8,30,0.4)'); }

  lz_layerBegin();
  const c = Y; c.setTransform(s * fl, 0, 0, s, cx, cy); c.lineJoin = 'round';
  const { mn, bl, dark, lite, rimL } = lz_tools(c, s, ll, C.rim, rimK);
  const rnd = rng(seed * 977 + 11);
  const hz = i => { const v = Math.sin(i * 127.1 + seed * 31.7) * 43758.5453; return v - Math.floor(v); };       // hasard par indice (stable d'une image à l'autre)
  const nToe = s >= 1.8 ? 5 : 3;

  // ── pattes (4) ; la patte lointaine d'abord ──
  const leg = (sh, f, bend, w0, col, colLo, Ls = 6.0, outl = false) => {
    // deux segments (IK) : coude plié vers le bas et l'extérieur ; pied plat à trois doigts (cinq de près)
    const dx = f[0] - sh[0], dy = f[1] - sh[1], d = Math.hypot(dx, dy), l1 = Ls, l2 = Ls, dd = Math.min(d, l1 + l2 - 0.2), a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0.3, l1 * l1 - a * a));
    const ux = dx / (d || 1), uy = dy / (d || 1), kx = sh[0] + ux * a + (-uy) * h * bend * 0.7, ky = sh[1] + uy * a + ux * h * bend * 0.7;
    const p = polyPath(limb([sh, [kx, ky], f], [w0, w0 * 0.74, w0 * 0.55]));
    if (outl) { c.lineWidth = mn(1.1); c.strokeStyle = C.under; c.stroke(p); }
    c.fillStyle = outl ? lz_mix(col, colLo, 0.35) : colLo; c.fill(p); lite(p, col, w0 * 0.42, 0.5); rimL(p, 0.8, 0.7);
    const foot = lz_ell(f[0] + 1.6, f[1] + 0.5, 3.6, 1.9, 0.12); c.fillStyle = colLo; c.fill(foot); lite(foot, col, 0.9, 0.3);
    for (let k = 0; k < nToe; k++) { const sp = nToe === 3 ? 1.1 : 0.78, tp = lz_ell(f[0] + 4.2, f[1] - 0.4 + (k - (nToe - 3) / 2 * 0.7) * sp - (nToe - 3) * 0.2, 1.3, 0.62, 0.05 * (k - 1)); c.fillStyle = k % 2 === 1 ? col : colLo; c.fill(tp); }
    return p;
  };
  // positions des pieds au repos ; en marche : diagonales en phase (proche-avant + lointain-arrière) ; amplitude LZ_AMP et appui LZ_DUTY : le pied reste planté (foulée LZ_STRIDE)
  const stance = (i, x0, y0, phi) => {
    if (!walkOn) return [x0, y0, 0];
    const u = (((G.ph + phi) % 1) + 1) % 1, duty = LZ_DUTY, amp = LZ_AMP;
    if (u < duty) return [x0 + amp * (1 - 2 * u / duty), y0, 0];
    const q = (u - duty) / (1 - duty); return [x0 + amp * (-1 + 2 * q), y0 - 6.0 * Math.sin(q * Math.PI), 1];
  };
  const spread = P.lg;
  const nF = stance(0, walkOn ? 23 : 26 + 3 * spread, walkOn ? 14.2 : 11.2 + 1.5 * spread, 0), nH = stance(1, walkOn ? -20 : -23 - 3 * spread, walkOn ? 14.8 : 12.6 + 1.5 * spread, 0.5), fF = stance(2, 21, walkOn ? -14.5 : -9.0, 0.5), fH = stance(3, -18, walkOn ? -14.2 : -8.4, 0);
  const lc = lz_mix(C.top, C.wall, 0.55);
  const LF = walkOn ? 8.4 : 6;
  leg([14, -8 - bh * 0.3], [fF[0], fF[1]], -1, walkOn ? 4.0 : 5.0, lz_mix(lc, C.wallLo, 0.4), C.wallLo, LF, walkOn);
  leg([-17, -8 - bh * 0.2], [fH[0], fH[1]], -1, walkOn ? 4.2 : 5.2, lz_mix(lc, C.wallLo, 0.4), C.wallLo, LF, walkOn);

  // pattes proches : tirées sous le corps, seul ce qui dépasse du flanc se voit
  if (!walkOn) { leg([12, -1.0], [nF[0], nF[1]], 1, 5.8, lz_mix(C.top, C.wall, 0.4), C.wallLo); leg([-16, 0], [nH[0], nH[1]], 1, 6.2, lz_mix(C.top, C.wall, 0.4), C.wallLo); }

  c.save(); c.rotate(roll);                                                      // le corps roule un peu d'un côté à l'autre en marche
  // ── queue : courte, plate, bandée ──
  { const tl = [[-25, -3.5 + bob * 0.5], [-32, -2.6 + 0.8 * sway], [-38, -1.0 + 1.2 * sway + idle * 0.3], [-42.5, 1.0 + 1.8 * sway + idle * 0.6]];
    const p = polyPath(limb(tl, [15 * P.bd, 11 * (0.5 + 0.5 * P.bd), 7.4, 3.4])); c.fillStyle = C.wall; c.fill(p);
    c.save(); c.clip(p); c.fillStyle = C.rustD; for (const k of [0.45, 0.78]) { const q = bez(tl[0], tl[2], tl[3], k); c.beginPath(); c.ellipse(q[0], q[1], 1.1, 7, 0.25, 0, TAU); c.fill(); } c.restore();
    dark(p, lz_mix(C.wallLo, C.under, 0.3), 2.2); lite(p, C.top, 1.8, 0.8); rimL(p, 0.9); }

  // ── corps : flanc (ellipse au sol) puis dessus (ellipse surélevée) ──
  const wallP = lz_ell(-2, -bh * 0.15, W, Dp + bh * 0.15), topP = lz_ell(cT[0], cT[1], rxT, ryT);
  c.fillStyle = C.wall; c.fill(wallP);
  dark(wallP, C.wallLo, 4.2, 1.6);
  // frange d'écailles pointues du flanc proche (bord inférieur) : irrégulière (longueurs, largeurs et espacements variés), plus longue quand les piquants se dressent
  const fr = P.sp, fring = [];
  { let phi = 0.1; const dPhi = (Math.PI - 0.2) / 14.5;
    for (let i = 0; i < 15; i++) {
      phi += dPhi * (0.62 + 0.76 * hz(i + 40)); if (phi > Math.PI - 0.06) break;
      const px0 = -2 + (W + 0.4) * Math.cos(phi), py0 = (Dp + bh * 0.15) * Math.sin(phi) - bh * 0.15 + 0.2;
      const nx = Math.cos(phi), ny = Math.sin(phi) * 0.9, nl = Math.hypot(nx, ny), big = hz(i + 70) > 0.78 ? 1.55 : 1;
      const len = Math.max((1.5 + 2.7 * fr) * (0.55 + 0.9 * hz(i + 10)) * big, 2.3 / s), tx = -ny / nl, ty = nx / nl, bw2 = Math.max((1.3 + 0.5 * fr) * (0.8 + 0.6 * hz(i + 20)), 1.4 / s);
      fring.push([[px0 + tx * bw2, py0 + ty * bw2], [px0 - tx * bw2, py0 - ty * bw2], [px0 + nx / nl * len + (hz(i + 30) - 0.5) * 0.8, py0 + ny / nl * len + 0.8]]);
    } }
  for (const [a, b, tip] of fring) { const p = lz_tri(a, b, tip); c.fillStyle = lz_mix(lz_mix(C.horn, C.cream, 0.35), C.wall, camo * 0.7); c.fill(p); c.fillStyle = lz_mix(C.horn, C.wallLo, 0.55); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(tip[0] * 0.35 + a[0] * 0.65, tip[1] * 0.35 + a[1] * 0.65); c.lineTo(b[0] * 0.35 + tip[0] * 0.65, b[1] * 0.35 + tip[1] * 0.65); c.lineTo(b[0], b[1]); c.fill(); }
  // petits piquants du bord lointain (le dessus, vers le haut), irréguliers aussi
  for (let i = 0; i < 11; i++) {
    const phi = lerp(Math.PI + 0.35, TAU - 0.5, (i + (hz(i + 90) - 0.5) * 0.5) / 10), px0 = cT[0] + rxT * Math.cos(phi), py0 = cT[1] + ryT * Math.sin(phi), len = Math.max((2.0 + 2.6 * fr) * (0.6 + 0.8 * hz(i + 50)), 2.0 / s), bw2 = Math.max(1.5, 1.2 / s);
    const nx = Math.cos(phi), ny = Math.sin(phi) * 1.1, nl = Math.hypot(nx, ny), tx = -ny / nl, ty = nx / nl;
    const p = lz_tri([px0 + tx * bw2, py0 + ty * bw2], [px0 - tx * bw2, py0 - ty * bw2], [px0 + nx / nl * len, py0 + ny / nl * len - 0.4]); c.fillStyle = C.horn; c.fill(p);
  }
  // dessus : sable, tons chauds vers le bord
  c.fillStyle = C.top; c.fill(topP);
  c.save(); c.clip(topP);
  { const g = c.createLinearGradient(0, cT[1] - ryT, 0, cT[1] + ryT); g.addColorStop(0, lz_mix(C.top, C.topHi, 0.55)); g.addColorStop(0.5, C.top); g.addColorStop(1, lz_mix(C.top, C.rust, 0.45)); c.fillStyle = g; c.fillRect(cT[0] - rxT, cT[1] - ryT, rxT * 2, ryT * 2); }
  // ligne claire dorsale : ondulée et interrompue (deux segments)
  c.strokeStyle = C.cream; c.lineWidth = mn(1.0); c.lineCap = 'round';
  c.beginPath(); c.moveTo(cT[0] + rxT * 0.84, cT[1] + 0.3); c.bezierCurveTo(cT[0] + rxT * 0.62, cT[1] - 1.0, cT[0] + rxT * 0.46, cT[1] + 0.9, cT[0] + rxT * 0.2, cT[1] - 0.2); c.stroke();
  c.beginPath(); c.moveTo(cT[0] - rxT * 0.06, cT[1] - 0.5); c.bezierCurveTo(cT[0] - rxT * 0.26, cT[1] + 0.8, cT[0] - rxT * 0.5, cT[1] - 0.8, cT[0] - rxT * 0.8, cT[1] + 0.4); c.stroke();
  // marbrures : taches de tailles variées, positions décalées d'un côté à l'autre (a le long du corps, b en travers), certaines étirées en barres obliques ; trois tons de sable, deux de tache
  const patches = [[0.7, -0.46, 5.0, 2.8, 0.25], [0.4, 0.58, 3.4, 2.2, 0.2], [0.12, -0.64, 7.4, 2.2, -0.28], [-0.04, 0.5, 6.0, 2.8, -0.12], [-0.4, -0.42, 4.2, 3.0, 0.15], [-0.34, 0.68, 3.0, 1.8, 0.5], [-0.68, 0.36, 5.2, 2.2, -0.35], [-0.76, -0.5, 2.6, 1.8, 0.3], [0.84, 0.2, 2.2, 1.6, 0.1]];
  patches.forEach(([a, b, rx, ry, rot0], i) => {
    const x = cT[0] + rxT * a + (rnd() - 0.5) * 1.6, y = cT[1] + ryT * b * 0.95 + (rnd() - 0.5) * 1.0, rot = rot0 + (rnd() - 0.5) * 0.3, pts = [];
    for (let k = 0; k < 9; k++) { const an = k / 9 * TAU, rr = 0.75 + 0.45 * rnd(); pts.push([x + Math.cos(an + rot) * rx * rr, y + Math.sin(an + rot) * ry * rr]); }
    const bp = lz_smooth(pts);
    c.fillStyle = i % 3 === 0 ? lz_mix(C.rustD, C.rust, 0.5) : lz_mix(C.rust, C.top, 0.25); c.fill(bp);
    if (i % 2 === 0) lite(bp, C.topHi, 0.9, 0.3, 0.6);                      // reflet d'un pixel sur le bord éclairé de quelques taches
  });
  for (let i = 0; i < 12; i++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 0.9, x = cT[0] + rxT * r * Math.cos(a), y = cT[1] + ryT * r * Math.sin(a); c.fillStyle = rnd() < 0.55 ? C.topHi : C.rustD; c.beginPath(); c.ellipse(x, y, mn(0.8 + rnd() * 0.5), mn(0.6 + rnd() * 0.3), 0, 0, TAU); c.fill(); }
  c.restore();
  dark(topP, C.topLo, 3.8, 1.5);
  lite(topP, C.topHi, 2.6, 1.0, 0.9);
  rimL(topP, 1.0);
  // taches sur le flanc (sous le bord du dessus)
  c.save(); c.clip(wallP);
  for (let i = 0; i < 7; i++) { const a = lerp(0.25, Math.PI - 0.25, (i + 0.5) / 7 + (hz(i + 5) - 0.5) * 0.08), x = -2 + (W - 3) * Math.cos(a), y = (Dp + bh * 0.15) * Math.sin(a) - bh * 0.15 - 1.5; c.fillStyle = C.rustD; c.beginPath(); c.ellipse(x, y, 1.6 + 1.6 * hz(i + 15), 1.1 + 0.6 * hz(i + 25), 0, 0, TAU); c.fill(); }
  c.restore();
  c.restore();                                                                   // fin du roulis

  if (walkOn) { leg([19, 3.4], [nF[0], nF[1]], 1, 4.3, lz_mix(C.top, C.wall, 0.4), C.wallLo, 9, true); leg([-15, 4.2], [nH[0], nH[1]], -1, 4.5, lz_mix(C.top, C.wall, 0.4), C.wallLo, 9, true); }   // en marche les pattes proches passent devant le flanc (segments de 9 : coude visible)
  // ── tête et couronne (repère de la tête : origine au centre du crâne, museau vers la droite) ──
  c.save(); c.translate(H0[0], H0[1]); c.rotate(hp);
  const hnR = P.hn, rot = (b, tip, k) => { const dx = tip[0] - b[0], dy = tip[1] - b[1], cs = Math.cos(-k), sn = Math.sin(-k); return [b[0] + dx * cs - dy * sn, b[1] + dx * sn + dy * cs]; };
  const bandsOn = s > 0.8, hornBase = [];
  const hornFill = lz_mix(C.rust, C.rustD, 0.55);                                // cornes plus foncées que le dos : l'éventail se lit sur le sable
  const horn = (p, i) => {
    c.lineWidth = mn(1.5); c.strokeStyle = C.under; c.stroke(p);                // halo sombre : sépare la dague du fond et des voisines
    c.fillStyle = hornFill; c.fill(p);
    if (bandsOn) { c.save(); c.clip(p); const hb = hornBase[i]; for (const k of [0.4, 0.68]) { const q = [hb[0][0] + (hb[1][0] - hb[0][0]) * k, hb[0][1] + (hb[1][1] - hb[0][1]) * k], an = Math.atan2(hb[1][1] - hb[0][1], hb[1][0] - hb[0][0]); c.save(); c.translate(q[0], q[1]); c.rotate(an); c.fillStyle = C.horn; c.globalAlpha = 0.55; c.fillRect(-0.5, -9, 1.2, 18); c.restore(); } c.restore(); }
    dark(p, C.hornLo, 2.4, 0.7, 0.8); lite(p, C.hornHi, 1.5, 0.5, 0.95); rimL(p, 0.9, 0.9);
  };
  // couronne : quatre dagues larges (bases jointes) en éventail depuis l'arrière du crâne, longueur ≈ 0,7 fois la tête ; la plus lointaine est la plus haute (≈ 42°), la plus basse part vers l'arrière (≈ −4°)
  const hk = Math.max(1, 3.0 / (s * 24));                                        // à petite échelle les cornes sont un peu épaissies (jamais allongées)
  const horns = [
    [[-5.4, -7.2], [-16.0, -19.8], 11.0 * hk, 0.04], [[-6.0, -6.0], [-20.4, -15.0], 12.0 * hk, 0.04], [[-7.0, -4.6], [-23.0, -8.6], 11.4 * hk, 0.03], [[-7.0, -2.6], [-21.5, -1.6], 9.6 * hk, 0.02],
  ];
  const hornPaths = horns.map(([b, tip, bw, cv], i) => { const tp = rot(b, tip, hnR * (1 - i * 0.12)); hornBase[i] = [b, tp]; return lz_dagger(b, tp, bw, cv, 1.0); });
  horn(hornPaths[0], 0); horn(hornPaths[1], 1);
  // cornes temporales : deuxième étage de la couronne, trois pointes de 8 à 10 px derrière la joue (la couronne se lit à deux étages, pas comme des oreilles)
  [[[-8.4, 0.4], [-17.0, 4.6], 4.6], [[-8.0, 2.8], [-15.2, 9.6], 4.4], [[-5.6, 4.6], [-9.2, 11.8], 3.8]].forEach(([b, tip, bw]) => { const p = lz_dagger(b, rot(b, tip, -hnR * 0.2), bw, 0.08, 0.9); c.lineWidth = mn(1.2); c.strokeStyle = C.under; c.stroke(p); c.fillStyle = lz_mix(hornFill, C.horn, 0.25); c.fill(p); dark(p, C.hornLo, 1.4, 0.4); lite(p, C.hornHi, 1.0, 0.4, 0.8); rimL(p, 0.8, 0.8); });
  // tête : courte, large et triangulaire (large au crâne, étroite au museau)
  const headP = lz_smooth([[-9.5, -6.5], [-4, -8.6], [1.5, -9.2], [6, -7.2], [10, -4.4], [13.2, -1.2], [13, 1.4], [9.8, 3.2], [5, 4.8], [-1, 6.4], [-7, 6.8], [-10.5, 3.2]]);
  c.fillStyle = C.top; c.fill(headP);
  { const jaw = polyPath([[13.2, 1.0], [9.8, 3.3], [5, 4.9], [-1, 6.5], [-7, 6.9], [-10.5, 3.3], [-6, 2.7], [0, 3.2], [6, 2.2], [11.5, 0.8]]); c.save(); c.clip(headP); c.fillStyle = lz_mix(C.cream, C.top, 0.3); c.fill(jaw); c.restore(); }
  dark(headP, C.topLo, 2.4, 1.0); lite(headP, C.topHi, 1.7, 0.7, 0.9); rimL(headP, 0.9);
  // deux piquants de mâchoire sous la joue
  [[[-6.4, 5.4], [-2.2, 6.8], [-7.4, 11.0]], [[-10.2, 3.6], [-6.6, 5.4], [-12.4, 9.2]]].forEach(([a, b, tp]) => { const p = lz_tri(a, b, tp); c.lineWidth = mn(1.0); c.strokeStyle = C.under; c.stroke(p); c.fillStyle = lz_mix(C.horn, C.cream, 0.15); c.fill(p); dark(p, C.hornLo, 1.0, 0.3, 0.7); });
  // arcade sourcilière : bosse nette au-dessus de l'œil, bord sombre dessous
  { const brow = lz_ell(3.2, -7.4, 4.9, 2.5, 0.1); c.fillStyle = lz_mix(C.top, C.rust, 0.4); c.fill(brow); dark(brow, C.topLo, 1.2, 0.4); lite(brow, C.topHi, 1.0, 0.4, 0.9); rimL(brow, 0.8, 0.8);
    c.strokeStyle = lz_mix(C.under, C.rustD, 0.35); c.lineWidth = mn(0.9); c.lineCap = 'round'; c.beginPath(); c.ellipse(3.4, -7.4, 4.7, 2.5, 0.1, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke(); }
  horn(hornPaths[2], 2); horn(hornPaths[3], 3);
  // gonflement du sinus autour de l'œil : bosse rouge qui dépasse du profil de la tête (rampe RD), veines, bord sombre fermé
  const eyeL = [3.8, -3.6];
  if (bulge > 0.02) {
    const br = 2.2 + 2.7 * bulge, ex0 = eyeL[0] + 0.1, ey0 = eyeL[1] - 1.0 * bulge, dome = lz_ell(ex0, ey0, br * 1.12, br * 1.0, 0.1), domeIn = lz_ell(ex0 + 0.3, ey0 - 0.5, br * 0.72, br * 0.6, 0.1);
    c.lineWidth = mn(1.1); c.strokeStyle = RD[0]; c.stroke(dome);                       // bord rouge sombre fermé tout autour
    c.fillStyle = lz_mix(C.top, RD[2], 0.55 + 0.4 * bulge); c.fill(dome);
    dark(dome, RD[1], 1.6, 0.6, 0.9);
    c.fillStyle = lz_mix(C.top, RD[3], 0.6 + 0.35 * bulge); c.fill(domeIn);
    c.save(); c.clip(dome); c.strokeStyle = RD[1]; c.lineWidth = mn(0.7); c.lineCap = 'round'; c.globalAlpha = clamp(bulge * 1.6);                       // veines de 1 px
    c.beginPath(); c.moveTo(ex0 - br * 0.9, ey0 + br * 0.3); c.lineTo(ex0 - br * 0.35, ey0 + br * 0.05); c.moveTo(ex0 + br * 0.2, ey0 - br * 0.95); c.lineTo(ex0 + br * 0.55, ey0 - br * 0.45); c.stroke(); c.restore();
    lite(dome, RD[4], 1.0 + 0.5 * bulge, 0.5, 0.85); rimL(dome, 0.8, 0.7);
  }
  c.restore();

  lz_layerEnd({ outline: C.out });

  // ── détails nets en pixels (écran) : œil, narine, bouche ──
  L.setTransform(1, 0, 0, 1, 0, 0);
  const eS = Ts(eyeL[0], eyeL[1]), er = Math.max(1, Math.round(2.2 * s)), px0 = Math.round(eS[0]), py0 = Math.round(eS[1]);
  const eyeCol = lz_mix('#12100c', '#48291a', camo * 0.5);
  if (eyeOpen > 0.3) {
    const big = bulge > 0.35 ? 1 : 0;                                       // sinus gonflé : l'œil s'agrandit et laisse voir le blanc (pas de paupière lourde)
    disc(px0, py0, er + (s > 0.9 ? 1 : 0) + big, C.out);
    if (big) { disc(px0, py0, er + 1, WH[1]); disc(px0 + fl, py0, Math.max(1, er - 1) + (er >= 3 ? 0 : 0), lz_mix(AM[6], '#48291a', 0.35)); disc(px0 + fl, py0, Math.max(1, er - 2), eyeCol); if (er >= 2) px(px0 + fl - fl * 1, py0 - 1, WH[3]); }
    else { disc(px0, py0, er, lz_mix(AM[6], '#48291a', 0.35)); disc(px0, py0, Math.max(1, er - 1), eyeCol); if (er >= 2) px(px0 + fl, py0 - 1, WH[2]); }
    if (eyeOpen < 0.75) { const cover = Math.round((1 - eyeOpen) * (er + 1)); R(px0 - er - 1 - big, py0 - er - 1 - big, (er + big) * 2 + 3, cover, lz_mix(C.top, C.rust, 0.3)); R(px0 - er - 1 - big, py0 - er - 1 - big + cover, (er + big) * 2 + 3, 1, C.out); }
  } else { lineP(px0 - er, py0, px0 + er, py0, C.out, 1); px(px0, py0 + 1, C.under); }
  const nS = Ts(11.8, -2.2); px(Math.round(nS[0]), Math.round(nS[1]), C.out);
  if (s >= 0.7) { const a = Ts(12.8, 1.1), b = Ts(1.5, 3.0); lineP(a[0], a[1], b[0], b[1], lz_mix(C.out, C.under, 0.3), 1); }

  return { T: Tb, Th: Ts, eye: eS, jet: Ts(eyeL[0] + 2.0, eyeL[1] + 1.2), head: Ts(6, -2), mouth: Ts(13, 1), crown: Ts(-16, -16), bodyTop: Tb(cT[0], cT[1]), tail: Tb(-41, 1), w: 105 * s, bulge };
}

// ───────────────────────── le coyote ─────────────────────────
const LZ_CPOSE = {
  //            amplitude durée d'appui  Hz   levée  affaissement  cou/tête  oreilles  queue(0 pendante … 1 rentrée)
  trot: { amp: 14, duty: 0.55, freq: 2.2, lift: 9, cF: 0, cR: 0, hd: 0.0, ear: 0.0, tl: 0.15, mouth: 0, D: 51 },
  stalk: { amp: 8, duty: 0.74, freq: 1.15, lift: 5.5, cF: 6, cR: 2, hd: 0.8, ear: 0.0, tl: 0.35, mouth: 0, D: 21.6 },
  sniff: { amp: 0, duty: 0.6, freq: 0, lift: 0, cF: 9, cR: 3, hd: 1.0, ear: 0.0, tl: 0.3, mouth: 0, D: 1 },
  hit: { amp: 0, duty: 0.6, freq: 0, lift: 0, cF: -2, cR: 7, hd: -0.35, ear: 0.95, tl: 1.0, mouth: 0.22, D: 1 },     // (valeurs de repli : la pose 'hit' part en réalité de 'sniff' et le sursaut est piloté par `hit`)
  disgust: { amp: 0, duty: 0.6, freq: 0, lift: 0, cF: 4, cR: 3, hd: 0.2, ear: 0.7, tl: 0.7, mouth: 0.42, D: 1 },
  trotOff: { amp: 12, duty: 0.58, freq: 1.9, lift: 8, cF: 1, cR: 1, hd: 0.5, ear: 0.5, tl: 0.85, mouth: 0, D: 41.4 },
};
// marche du coyote : { ph (cycles), x (distance en px à s = 1) } ; cx = x0 + (flip ? −1 : 1) × x × s évite que les pieds glissent
function lz_cGait(t, o = {}) { const Q = LZ_CPOSE[o.pose || 'trot'] || LZ_CPOSE.trot, ph = (t - (o.t0 || 0)) * Q.freq * (o.speed ?? 1); return { ph, x: ph * Q.D, freq: Q.freq }; }
// os à deux segments : renvoie l'articulation intermédiaire (bend ±1 : de quel côté elle plie)
// poils : petites touffes triangulaires posées sur le contour (pts = points du contour fermé, dans l'ordre), orientées vers l'extérieur et couchées vers l'arrière
function lz_tufts(c, pts, o = {}) {
  const m = pts.length, ext = [pts[m - 1]].concat(pts, [pts[0], pts[1]]), n = o.n ?? 5, cp = lz_cr(ext, n).slice(n, n * (m + 1)), len = cp.length, cen = [0, 1].map(j => pts.reduce((a, p) => a + p[j], 0) / m);
  const step = o.step ?? 2, sweep = o.sweep ?? -1.4, L0 = o.len ?? 2.4, bw = o.bw ?? 1.3;
  for (let i = 0; i < len; i += step) {
    const a = cp[(i + len - 1) % len], b = cp[(i + 1) % len], p = cp[i]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; let nx = ty, ny = -tx;
    if (nx * (p[0] - cen[0]) + ny * (p[1] - cen[1]) < 0) { nx = -nx; ny = -ny; }
    if (o.filter && !o.filter(p, [nx, ny], i)) continue;
    const ln = L0 * (0.7 + 0.6 * Math.abs(Math.sin(i * 1.7 + (o.ph || 0)))), col = typeof o.col === 'function' ? o.col(p, i) : o.col;
    c.fillStyle = col; c.beginPath(); c.moveTo(p[0] - tx * bw, p[1] - ty * bw); c.lineTo(p[0] + nx * ln + sweep, p[1] + ny * ln); c.lineTo(p[0] + tx * bw, p[1] + ty * bw); c.closePath(); c.fill();
  }
}
function lz_ik(a, b, l1, l2, bend) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.max(0.001, Math.min(Math.hypot(dx, dy), l1 + l2 - 0.05)), k = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - k * k)), ux = dx / Math.hypot(dx, dy || 0.001), uy = dy / Math.hypot(dx, dy || 0.001);
  return [a[0] + ux * k - uy * h * bend, a[1] + uy * k + ux * h * bend];
}

function lz_coyote(cx, cy, s, t, o = {}) {
  const pose = o.pose || 'trot', Q = { ...(LZ_CPOSE[pose] || LZ_CPOSE.trot) }, fl = o.flip ? -1 : 1, rimK = clamp(o.rim ?? 1), shK = clamp(o.shadow ?? 1), seed = o.seed ?? 5;
  const envName = o.env || 'desertDusk', E = envName === 'none' ? { light: 1, rim: '#fff2c4', shadow: '#2e1a56', lit: '#ffc84a' } : fl_env({ env: envName, light: o.light });
  const lightX = o.light ?? E.light ?? 1, ll = lz_norm([lightX * fl * 0.9, -0.5]), tt = t + seed * 1.3;
  const tauC = o.tau ?? 1, u = (t - (o.t0 || 0)) * tauC;                          // u : secondes RÉELLES depuis t0 (tau : ralenti de la scène, pour que le sursaut suive le jet)
  // 'hit' = 'sniff' + sursaut piloté par hit : anticipation (la tête descend de 2 px pendant les 0,07 s avant t0), élan 0 → 1,15 en 0,07 s, retour vers 0,55 ; hit explicite (o.hit) = valeur fixe
  const antic = pose === 'hit' && o.t0 != null && o.hit == null ? sm(clamp((u + 0.07) / 0.07)) * (u < 0 ? 1 : 0) : 0;
  const hitRaw = o.hit != null ? o.hit : (pose === 'hit' ? (o.t0 != null ? (u < 0 ? 0 : u < 0.07 ? 1.15 * sm(u / 0.07) : 0.55 + 0.6 * Math.exp(-(u - 0.07) / 0.14)) : 1) : 0);
  const hit = Math.max(0, Math.min(1.2, hitRaw));
  if (pose === 'hit') Object.assign(Q, LZ_CPOSE.sniff);                          // base commune : le sursaut part du flair, rien ne saute d'une pose à l'autre
  const shake = clamp(o.shake ?? (pose === 'disgust' ? 1 : 0)), headDown = o.headDown != null ? o.headDown : Q.hd;
  const mouthHit = pose === 'hit' ? (o.t0 != null && o.hit == null ? 0.1 + 0.4 * sm(clamp(u / 0.03)) * (1 - sm(clamp((u - 0.06) / 0.05))) : 0.35 * clamp(hit)) : 0;      // la gueule claque (0,5) pendant 0,1 s puis se referme
  const mouth = clamp(o.mouth ?? Math.max(Q.mouth, mouthHit)), tongue = clamp(o.tongue ?? (pose === 'disgust' ? 1 : 0)), wrinkle = clamp(o.wrinkle ?? (pose === 'disgust' ? 1 : pose === 'hit' ? 0.6 * clamp(hit) : 0));
  const G = lz_cGait(t, { pose, t0: o.t0 }), ph = o.ph != null ? o.ph : G.ph, moving = Q.amp > 0 && o.speed !== 0;
  const hd = lerp(headDown, -0.1, clamp(hit)), earB = clamp(Q.ear + hit * 0.9), tl = clamp(Q.tl + hit * 0.5);     // cou rentré (hd ≈ −0,1) : la tête recule vers les épaules
  const cF = lerp(Q.cF, -2.5, hit), cR = lerp(Q.cR, 8, hit);
  const bob = moving ? -Math.abs(Math.sin(Math.PI * ph * 2)) * 2.0 : Math.sin(tt * 1.7) * 0.2;           // deux pics par cycle de pas
  const recoilX = -5 * hit, ysh = x => lerp(cR, cF, clamp((x + 38) / 72)) + bob - 1.2 * hit;
  // ── couleurs ──
  const hiTint = E.lit, shTint = E.shadow, tint = h => lz_mix(lz_mix(h, shTint, 0.08), hiTint, 0.05);
  // ombres CHAUDES (rampes SK / OC / WO) : jamais le bleu acier ST ; le seul clair froid est le liseré de contre-jour E.rim
  const C = {
    back: '#84543a', body: '#b27a54', hi: '#cfc6b4', lo: '#5a3226', belly: '#e8e0cc', leg: tint('#c2773a'), legLo: '#964a26', ear: tint('#b0662f'), earIn: tint('#efd4b0'),
    dark: '#1d120c', nose: '#17110d', tip: '#17110d', tailMid: '#a96d3c', rim: E.rim || AM[9], out: o.outline || '#1d120c',
  };
  const far = h => lz_mix(h, '#3a1a14', 0.35);
  // ── cou et tête ──
  const N0 = [26 + recoilX, -52 + ysh(26) + 2 * antic], LN = 19 * (1 - 0.18 * clamp(hit)), tH = clamp((hd + 0.4) / 1.4), an = lerp(-0.62, 1.12, tH), ah = lerp(-0.02, 1.22, tH);
  const shAmp = shake * 0.3, shAt = d => shAmp * Math.sin(TAU * 6.4 * (tt - d));
  const hdn = (d) => { const th = shAt(d), ang = an + th * 0.7; return { H: [N0[0] + LN * Math.cos(ang), N0[1] + LN * Math.sin(ang)], a: ah + th * 1.1 }; };
  const hn0 = hdn(0), sniffBob = pose === 'sniff' ? Math.sin(TAU * 5.5 * tt) * 0.9 * (0.5 + 0.5 * Math.sin(TAU * 0.9 * tt)) : 0;
  const H = [hn0.H[0], hn0.H[1] + sniffBob + (moving ? 1.0 * Math.sin(TAU * ph * 2 + 1.3) : 0)], aH = hn0.a, hc = Math.cos(aH), hs = Math.sin(aH);
  const Th = (x, y) => [H[0] + x * hc - y * hs, H[1] + x * hs + y * hc];
  const Tb = (x, y) => [cx + fl * s * x, cy + s * y];
  const Ts = (x, y) => Tb(...Th(x, y));
  const ex = 100 * s + 10; lz_BB = [Math.max(0, Math.floor(cx - ex)), Math.max(0, Math.floor(cy - 100 * s)), Math.min(LW, Math.ceil(cx + ex)), Math.min(LH, Math.ceil(cy + 12 * s + 6))];
  if (shK > 0) { const a = 0.5 * shK; if (typeof k_shadow === 'function') k_shadow(cx - lightX * 6 * s, cy + 1 * s, 58 * s, 5.5 * s, a, { col: '40,16,52' }); else ell(cx, cy, 58 * s, 5 * s, 'rgba(20,8,30,0.4)'); }

  lz_layerBegin();
  const c = Y; c.setTransform(s * fl, 0, 0, s, cx, cy); c.lineJoin = 'round';
  const { mn, bl, dark, lite, rimL, halo } = lz_tools(c, s, ll, C.rim, rimK);
  const rnd = rng(seed * 131 + 7);
  const Y0 = x => ysh(x);
  // ── pas ──
  const foot = (x0, phi) => {
    if (!moving) return { x: x0, y: 0, sw: 0 };
    const uu = (((ph + phi) % 1) + 1) % 1, A = Q.amp, d = Q.duty;
    if (uu < d) return { x: x0 + A * (1 - 2 * uu / d), y: 0, sw: 0 };
    const q = (uu - d) / (1 - d), e = eio(q), l = Math.pow(Math.sin(Math.PI * q), 0.85); return { x: x0 + A * (-1 + 2 * e), y: -Math.min(Q.lift, 7) * l, sw: l };
  };
  const fwd = hit * 3.5, fN = foot(23 + fwd, 0), fF = foot(26 + fwd, 0.5), hN = foot(-26, 0.5), hF = foot(-23, 0);
  const sF = [21 + recoilX * 0.6, -39 + ysh(21)], sH = [-26 + recoilX, -42 + ysh(-26)];
  const pawC = h => lz_mix(h, C.dark, 0.22);
  const frontLeg = (fp, col, colLo, farSide) => {
    const P0 = [fp.x, fp.y - 0.5], W = [fp.x - 1.2 - 2.4 * fp.sw, fp.y - 9 - 1.6 * fp.sw], Sh = [sF[0] + (farSide ? 3 : 0), sF[1] + (farSide ? 1 : 0)], El = lz_ik(Sh, W, 16.8, 17.2, -1);
    const p = polyPath(lz_limbS([Sh, El, W, P0], [8.4, 5.8, 3.8, 3.6])), paw = lz_ell(fp.x + 2.2, fp.y - 1.0, 4.5, 2.3, -0.08 * (1 + fp.sw));
    if (!farSide) { halo(p, C.dark, 1.1); halo(paw, C.dark, 1.0); }
    c.fillStyle = col; c.fill(p); dark(p, colLo, 2.4, 0.9); lite(p, lz_mix(col, C.hi, 0.35), 1.5, 0.6, 0.85);
    c.fillStyle = farSide ? far(C.legLo) : pawC(colLo); c.fill(paw); if (!farSide) { lite(paw, col, 0.8, 0.3); rimL(p, 0.9, 0.8); }
  };
  const hindLeg = (fp, col, colLo, farSide) => {
    const Hk = [fp.x - 3 - 3 * fp.sw, fp.y - 11.5 - 1.5 * fp.sw], Hp = [sH[0] + (farSide ? 2 : 0), sH[1] + (farSide ? 1 : 0)], St = lz_ik(Hp, Hk, 19.5, 20, 1), P0 = [fp.x, fp.y - 0.5];
    const shank = polyPath(lz_limbS([Hp, St, Hk, [Hk[0] + 1.6, Hk[1] + 6], P0], [12, 8.6, 4.6, 3.8, 3.6])), paw = lz_ell(fp.x + 2.0, fp.y - 1.0, 4.4, 2.2, -0.06 * (1 + fp.sw));
    if (!farSide) { halo(shank, C.dark, 1.1); halo(paw, C.dark, 1.0); }
    c.fillStyle = col; c.fill(shank); dark(shank, colLo, 2.0, 0.8); lite(shank, lz_mix(col, C.hi, 0.35), 1.5, 0.6, 0.85);
    c.fillStyle = farSide ? far(C.legLo) : pawC(colLo); c.fill(paw); if (!farSide) { lite(paw, col, 0.8, 0.3); rimL(shank, 0.9, 0.8); }
    return { Hp, St, Hk };
  };
  hindLeg(hF, far(C.leg), far(C.legLo), true);
  frontLeg(fF, far(C.leg), far(C.legLo), true);

  // ── queue touffue pendante, bout noir ──
  { const base = [-39 + recoilX, -51 + ysh(-39)], wag = Math.sin(TAU * (moving ? Q.freq : 0.7) * (moving ? ph / Q.freq : tt) + 1.2) * (moving ? 6 : 1.2) * (1 - 0.7 * tl), a0 = lerp(2.72, 1.9, tl), Lq = 40, pts = [base], nP = 8;
    for (let i = 1; i <= nP; i++) { const f = i / nP, ang = a0 + (1.52 - a0) * Math.pow(f, 0.8) * 0.9 + wag * 0.014 * f; pts.push([pts[i - 1][0] + Math.cos(ang) * Lq / nP, pts[i - 1][1] + Math.sin(ang) * Lq / nP]); }
    const wsa = [6.5, 10, 13.5, 15, 15, 14, 12.5, 10, 5.6], tp = polyPath(lz_fur(pts, wsa, 1.4, seed, 2));
    halo(tp, C.dark, 1.2); c.fillStyle = C.tailMid; c.fill(tp);
    c.save(); c.clip(tp);
    c.fillStyle = C.back; c.globalAlpha = 0.5; c.beginPath(); c.moveTo(base[0] - 6, base[1] - 4); c.lineTo(pts[4][0] - 3, pts[4][1] - 12); c.lineTo(pts[4][0] + 6, pts[4][1] + 2); c.lineTo(base[0] + 4, base[1] + 8); c.closePath(); c.fill(); c.globalAlpha = 1;
    { const q = pts[6], dx = pts[8][0] - q[0], dy = pts[8][1] - q[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; c.fillStyle = C.tip; c.beginPath(); c.moveTo(q[0] + nx * 18, q[1] + ny * 18); c.lineTo(q[0] - nx * 18, q[1] - ny * 18); c.lineTo(pts[8][0] - nx * 18 + dx * 3, pts[8][1] - ny * 18 + dy * 3); c.lineTo(pts[8][0] + nx * 18 + dx * 3, pts[8][1] + ny * 18 + dy * 3); c.closePath(); c.fill(); }
    c.restore();
    dark(tp, C.lo, 2.6, 1.0); lite(tp, C.hi, 2.0, 0.8, 0.7); rimL(tp, 0.9, 0.85); }
  const hl = hindLeg(hN, C.leg, C.legLo, false);
  frontLeg(fN, C.leg, C.legLo, false);

  // ── tronc et cou d'un seul tenant (contour exact par spline) ──
  const nape = Th(-9, -7), thr = Th(-5, 7.5), rx0 = recoilX;
  const nkTop = [lerp(22 + rx0 * 0.8, nape[0], 0.5), lerp(-63 + Y0(22), nape[1], 0.5) - 2.4], nkBot = [lerp(33 + rx0 * 0.8, thr[0], 0.5) - 1, lerp(-47 + Y0(33), thr[1], 0.5) + 2.6];
  const tpts = [[-41, -45 + Y0(-41)], [-38.5, -54.5 + Y0(-38)], [-27, -59 + Y0(-27)], [-13, -58.4 + Y0(-13)], [2, -60 + Y0(2)], [14, -61.8 + Y0(14)], [22, -63 + Y0(22)]].map(p => [p[0] + rx0 * clamp((p[0] + 38) / 72), p[1]])
    .concat([nkTop, nape, thr, nkBot])
    .concat([[34.5, -44 + Y0(34)], [32.8, -32 + Y0(32)], [25, -25.5 + Y0(25)], [15, -26.5 + Y0(15)], [5, -32 + Y0(5)], [-7, -37 + Y0(-7)], [-19, -37.2 + Y0(-19)], [-30, -36 + Y0(-30)], [-38, -39 + Y0(-38)]].map(p => [p[0] + rx0 * clamp((p[0] + 38) / 72), p[1]]));
  const torso = lz_spline(tpts);
  c.fillStyle = C.body; c.fill(torso);
  lz_tufts(c, tpts, { len: 1.6, bw: 1.0, sweep: -0.9, step: 3, ph: seed, col: (p, i) => (i % 2 === 0 ? C.hi : lz_mix(C.body, C.belly, 0.4)), filter: (p, n, i) => (i % 7 !== 0) && ((p[0] > 4 && p[1] < -50 && n[1] < -0.3) || (p[0] > 22 && p[1] > -44) || (p[0] < -30 && n[0] < -0.2)) });
  c.save(); c.clip(torso);
  { const g = c.createLinearGradient(0, -64 + Y0(0), 0, -27 + Y0(0)); g.addColorStop(0, C.back); g.addColorStop(0.28, lz_mix(C.back, C.body, 0.6)); g.addColorStop(0.55, C.body); g.addColorStop(0.8, lz_mix(C.body, C.belly, 0.55)); g.addColorStop(1, C.belly); c.fillStyle = g; c.fillRect(-48, -70, 96, 50); }
  for (let i = 0; i < 120; i++) { const x = lerp(-38, 30, rnd()), y = -61 + Y0(x) + rnd() * 17; c.fillStyle = rnd() < 0.65 ? C.hi : C.back; c.fillRect(x, y, mn(0.9), mn(0.9)); }
  // cuisse : masse ovale sur le flanc, joint plus sombre
  { const Hp = hl.Hp, th = lz_ell(Hp[0] + 1, Hp[1] + 3, 11.5, 15, -0.2); c.fillStyle = lz_mix(C.body, C.leg, 0.06); c.fill(th); dark(th, C.lo, 2.6, 1.2, 0.5); lite(th, C.hi, 2.0, 1.0, 0.35); c.globalAlpha = 0.3; c.strokeStyle = C.lo; c.lineWidth = mn(0.9); c.stroke(th); c.globalAlpha = 1; }
  // épaule : masse claire
  { const sp = lz_ell(sF[0] + 3, sF[1] - 7, 9, 12, 0.15); lite(sp, C.hi, 2.2, 0.8, 0.5); }
  c.restore();
  dark(torso, C.lo, 4.2, 1.6); lite(torso, C.hi, 2.8, 1.0, 0.85); rimL(torso, 1.0);

  // ── tête (repère de la tête : origine au centre du crâne, museau vers +x) ──
  c.save(); c.translate(H[0], H[1]); c.rotate(aH);
  const eAng = -earB * 1.15 + (moving ? 0.07 * Math.sin(TAU * ph * 2 - 0.9) : 0), rotEar = (pts, pivot, a) => pts.map(p => { const dx = p[0] - pivot[0], dy = p[1] - pivot[1], cs = Math.cos(a), sn = Math.sin(a); return [pivot[0] + dx * cs - dy * sn, pivot[1] + dx * sn + dy * cs]; });
  // oreille à POINTE franche : [base arrière, milieu arrière, pointe, milieu avant, base avant]
  const earPath = q => { const p = new Path2D(); p.moveTo(q[0][0], q[0][1]); p.quadraticCurveTo(q[1][0], q[1][1], q[2][0], q[2][1]); p.quadraticCurveTo(q[3][0], q[3][1], q[4][0], q[4][1]); p.closePath(); return p; };
  const wk = wrinkle, upper = lz_spline([[-9.5, -6], [-3.5, -10.2], [3.5, -9.6], [9, -6.4 - 0.4 * wk], [15, -5.0 - 1.2 * wk], [21 - 0.8 * wk, -4.0 - 2.4 * wk], [26.4 - 1.6 * wk, -3.2 - 3.0 * wk], [28.8 - 2.2 * wk, -1.2 - 2.8 * wk], [28.2 - 2.2 * wk, 1.4 - 1.8 * wk], [23, 2.0 - 0.8 * wk], [17, 2.5], [10, 3.0], [4, 4.0], [-3, 5.4], [-9.5, 3.8], [-11.8, -1]]);
  const jawA = mouth * 0.62, jc = Math.cos(jawA), jsn = Math.sin(jawA), jh = [3, 4.8], rj = p => { const dx = p[0] - jh[0], dy = p[1] - jh[1]; return [jh[0] + dx * jc - dy * jsn, jh[1] + dx * jsn + dy * jc]; };
  const jaw = lz_spline([[3, 3.8], [10, 3.2], [16, 2.9], [23, 2.6], [26.6, 3.1], [24.6, 4.4], [19, 5.2], [12, 5.2], [6, 5.8], [0, 6.2], [-4, 5.8]].map(rj));
  const earFar = earPath(rotEar([[-8, -6], [-11.2, -18], [-7.6, -33], [-1.4, -19.5], [0.6, -7]], [-3, -8], eAng * 0.9 + 0.14)), earNear = earPath(rotEar([[-7, -7], [-10.4, -19], [-5.4, -34], [2.2, -20.5], [2, -8]], [-2, -8], eAng)), earInn = earPath(rotEar([[-5.4, -9], [-7.4, -19], [-4.8, -29], [0.2, -20], [0.6, -9.5]], [-2, -8], eAng));
  halo(earFar, C.dark, 1.0); c.fillStyle = far(C.ear); c.fill(earFar); dark(earFar, far(C.lo), 2, 0.6);
  if (shake > 0.12) {                                                  // secouement : 2 copies PLEINES (tête et oreille) aux instants précédents, 38 % puis 22 % d'alpha, dans les tons du pelage
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    for (const [k, dt] of [[0, 0.045], [1, 0.09]]) {
      const g = hdn(dt), gc = Math.cos(g.a), gs = Math.sin(g.a), M = new DOMMatrix([s * fl * gc, s * gs, -s * fl * gs, s * gc, cx + fl * s * g.H[0], cy + s * g.H[1]]);
      c.setTransform(M); c.globalAlpha = 0.38 - 0.16 * k; c.fillStyle = C.body; c.fill(upper); c.fillStyle = lz_mix(C.belly, C.body, 0.5); c.fill(jaw); c.fillStyle = C.ear; c.fill(earNear);
    }
    c.globalAlpha = 1; c.restore(); c.setTransform(s * fl, 0, 0, s, cx, cy); c.translate(H[0], H[1]); c.rotate(aH);
  }
  if (mouth > 0.08) { c.fillStyle = '#5a0c18'; c.fill(polyPath([[3, 3.6], [10, 3.2], [16, 2.8], [23, 2.5], ...[[25.5, 4], [18, 6.4], [10, 7.6], [4, 8.6]].map(rj)])); }
  if (tongue > 0.05) {
    // langue : trajectoire courbe, décalage latéral de 2 à 3 px qui oscille avec le secouement, pointe élargie, rainure médiane sombre d'1 px
    const gl = [-Math.sin(-aH), Math.cos(-aH)], T0 = rj([21, 4.6]), Lg = 7.5 + 6.5 * tongue, pts = [], ws = [], sw = Math.sin(TAU * 6.4 * tt - 0.6) * (shake > 0 ? 3.0 : 0.8);
    for (let i = 0; i <= 5; i++) { const f = i / 5; pts.push([T0[0] + 5.5 * Math.sin(f * 1.4) * tongue + gl[0] * Lg * 0.9 * f * f + sw * f * f, T0[1] + 0.8 * f + gl[1] * Lg * 0.9 * f * f + Math.sin(f * 3 + tt * 4) * 0.35]); ws.push([3.0, 3.8, 4.2, 4.4, 5.0, 5.6][i]); }
    const tg = polyPath(lz_limbS(pts, ws, 3)); halo(tg, C.dark, 1.0); c.fillStyle = '#f2625a'; c.fill(tg);
    c.strokeStyle = '#a81c2e'; c.lineWidth = mn(1.0); c.lineCap = 'round'; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke();
    dark(tg, '#a81c2e', 1.4, 0.5);
  }
  // mâchoire : fine et de la couleur du museau ; halo net seulement gueule ouverte ; crème franc seulement au menton
  halo(jaw, C.dark, mouth > 0.08 ? 1.1 : 0.5); c.fillStyle = lz_mix(C.belly, C.body, 0.5); c.fill(jaw); dark(jaw, lz_mix(C.body, C.lo, 0.4), 1.6, 0.6);
  if (mouth > 0.08) lite(jaw, C.belly, 1.0, 0.4, 0.6);
  { const chin = lz_ell(rj([22.4, 4.2])[0], rj([22.4, 4.2])[1], 3.2, 1.3, jawA); c.fillStyle = C.belly; c.fill(chin); }
  halo(upper, C.dark, 1.1); c.fillStyle = C.body; c.fill(upper);
  c.save(); c.clip(upper);
  { const g = c.createLinearGradient(0, -10, 0, 5); g.addColorStop(0, C.back); g.addColorStop(0.4, lz_mix(C.body, C.leg, 0.3)); g.addColorStop(0.78, C.body); g.addColorStop(1, lz_mix(C.body, C.belly, 0.75)); c.fillStyle = g; c.fillRect(-13, -11, 45, 18); }
  c.restore();
  dark(upper, C.lo, 2.2, 0.9); lite(upper, C.hi, 1.5, 0.6, 0.85); rimL(upper, 0.9, 0.95);
  for (let i = 0; i < 3; i++) { const q = lz_tri([-3 - i * 2.4, 3.5 + i * 1.2], [-9 - i * 1.5, 1.5 + i * 1.8], [-13 - i * 1.4, 7 + i * 1.4]); c.fillStyle = i ? C.body : lz_mix(C.body, C.belly, 0.5); c.fill(q); }
  { halo(earNear, C.dark, 1.0); c.fillStyle = C.ear; c.fill(earNear);
    if (earB < 0.75) { c.save(); c.clip(earNear); c.globalAlpha = clamp(1.6 - earB * 2); c.fillStyle = C.earIn; c.fill(earInn); c.restore(); }       // oreilles plaquées au choc : plus d'intérieur rose
    dark(earNear, C.lo, 2.0, 0.7); lite(earNear, lz_mix(C.ear, C.hi, 0.5), 1.0, 0.4, 0.8); rimL(earNear, 0.9, 0.9); }
  { const nose = lz_ell(27.6 - 2.2 * wk, -0.8 - 2.6 * wk, 2.9, 2.5, 0.2); c.fillStyle = C.nose; c.fill(nose); lite(nose, '#5a4a52', 0.8, 0.3, 0.7); }
  c.restore();

  lz_layerEnd({ outline: C.out });

  // ── détails nets (pixels écran) : œil, plis, bave, traits de vitesse ──
  L.setTransform(1, 0, 0, 1, 0, 0);
  const eS = Ts(8.6, -3.4), ex0 = Math.round(eS[0]), ey0 = Math.round(eS[1]), er = Math.max(1, Math.round(2.1 * s)), squint = clamp(hit * 1.6 + (pose === 'disgust' ? 0.9 : 0));
  const eyeOpen = o.eye != null ? clamp(o.eye) : 1 - squint, blinkT = (tt * 0.31) % 1, blink = blinkT > 0.96 ? Math.sin((blinkT - 0.96) / 0.04 * Math.PI) : 0;
  const dirx = fl * Math.cos(aH), diry = Math.sin(aH);
  if (eyeOpen * (1 - blink) > 0.45) {
    disc(ex0, ey0, er, lz_mix(AM[6], '#48291a', 0.3)); disc(ex0, ey0, Math.max(1, er - 1), '#17110d');
    if (er >= 2) px(ex0, ey0 - 1, WH[2]);
    lineP(ex0 + dirx * er, ey0 + diry * er, ex0 + dirx * (er + 4), ey0 + diry * (er + 4) + 0, '#17110d', 1);
  } else {
    const a = Math.max(2, Math.round(er * 1.2));
    if (squint > 0.5) {                                                   // choc / dégoût : œil en « > » (pointe vers le museau) et sourcil froncé net
      lineP(ex0 - a * fl, ey0 - 2, ex0 + a * fl * 0.6, ey0, C.dark, 1); lineP(ex0 + a * fl * 0.6, ey0, ex0 - a * fl, ey0 + 2, C.dark, 1);
      lineP(ex0 - (a + 1) * fl, ey0 - 4, ex0 + a * fl, ey0 - 2, C.dark, 1);
    } else lineP(ex0 - a * fl, ey0 + 1, ex0 + a * fl, ey0 + 1, C.dark, 1);
  }
  if (wrinkle > 0.05 && s >= 0.5) for (let k = 0; k < 3; k++) { const a = Ts(14 + k * 2.6, -5 + k * 0.2), b = Ts(15.2 + k * 2.6, -2.4 + k * 0.1); lineP(a[0], a[1], b[0], b[1], C.lo, 1); }
  if (shake > 0.2 && s >= 0.5) {                                          // secouement : 3 traits de vitesse en arc derrière la tête (côté opposé au mouvement) et gouttes de bave projetées de côté
    const dir = Math.sign(Math.sin(TAU * 6.4 * tt)) || 1, hc0 = Ts(6, -1);
    for (let k = 0; k < 3; k++) { const x0 = hc0[0] - fl * (16 + k * 2) * s, y0 = hc0[1] + (k - 1) * 7 * s; for (let i = 0; i < 6; i++) px(x0 + fl * i * 1.5 * s, y0 + Math.sin(i / 5 * Math.PI) * -2 * s * (1 - k * 0.3), k === 1 ? WH[1] : lz_mix(C.hi, C.body, 0.3)); }
    const m0 = Ts(21, 6.5);
    for (let k = 0; k < 5; k++) { const age = (((tt * 2.2 + k * 0.21) % 1) + 1) % 1, dx = dir * fl * (3 + age * (14 + 4 * k)) * s, dy = (age * 6 + age * age * 20) * s * 0.8; if (age < 0.85) { R(m0[0] + dx, m0[1] + dy, 2, 2, WH[2]); px(m0[0] + dx, m0[1] + dy, WH[3]); } }
  }
  if (tongue > 0.3 && o.drool !== false) {                                // bave : un fil de 2 à 3 px et sa goutte qui pendent de la commissure (à plus de 3 px de la langue), sans croix
    const a0 = Ts(15, 6.6), per = 1.4, k = ((tt / per) % 1 + 1) % 1, len = Math.round((2 + 3 * Math.min(1, k * 1.15)) * Math.max(1, s * 0.9)), x = Math.round(a0[0]), y = Math.round(a0[1]);
    for (let i = 0; i < len; i++) { R(x, y + i, 1, 1, i === len - 1 ? WH[2] : WH[1]); }
    R(x - 1, y + len, 3, 2, WH[2]); px(x, y + len, WH[3]);
    if (k > 0.82) { const f = (k - 0.82) / 0.18; R(x, y + len + 3 + Math.round(f * 12 * s), 1, 2, WH[2]); }
  }
  return { T: Tb, Th: Ts, nose: Ts(28, -0.8), eye: eS, muzzle: Ts(21, -3.6), head: Ts(8, -1), ear: Ts(-3, -26), tail: Tb(-45, -20), mouth: Ts(25, 2.6), w: 150 * s, hit };
}

// ───────────────────────── jet de sang ─────────────────────────
const LZ_G = 520;                                                    // gravité par défaut en px/s² (temps réel du lézard, avant ralenti)
const lz_gOf = o => o.g ?? (o.pxm ? 9.81 * o.pxm : LZ_G);            // o.pxm = pixels par mètre de la scène : gravité réelle 9,81 m/s² à l'échelle (règle : 200 px/m → 1962 px/s²) ; sinon LZ_G
// vitesse (vx, vy) en px/s pour aller de (x0, y0) à (x1, y1) en T secondes (temps réel) avec la gravité g
function lz_jetVel(x0, y0, x1, y1, T, g = LZ_G) {            // g : LZ_G ou lz_gOf({ pxm })
  return [(x1 - x0) / T, (y1 - y0 - 0.5 * g * T * T) / T]; }
// âge (s réelles) auquel un point lancé de (x0,y0) à (vx,vy) atteint la verticale de pt (ou le sol y = ground) ; null si jamais
function lz_jetFlight(x0, y0, vx, vy, o = {}) {
  const g = lz_gOf(o); let a = null;
  if (o.hit) { const hx = o.hit[0] ?? o.hit.x, hy = o.hit[1] ?? o.hit.y; if (Math.abs(vx) > 1e-6) { const q = (hx - x0) / vx; if (q > 0) a = q; } else { const d = vy * vy + 2 * g * (hy - y0); if (d >= 0) a = (-vy + Math.sqrt(d)) / g; } }
  if (o.ground != null) { const d = vy * vy + 2 * g * (o.ground - y0); if (d >= 0) { const q = (-vy + Math.sqrt(d)) / g; if (q > 0 && (a == null || q < a)) a = q; } }
  return a;
}
// instant (absolu) où le dernier élément du jet a fini (impact, sol ou fin de portée)
function lz_jetEnd(x0, y0, vx, vy, t0, o = {}) { const a = lz_jetFlight(x0, y0, vx, vy, o) ?? (o.maxAge ?? 0.9), tau = o.tau ?? 1; return t0 + ((o.dur ?? 0.35) + a) / tau; }
// instant (absolu) où la tête du jet touche la cible (o.hit) ou le sol
function lz_jetHitT(x0, y0, vx, vy, t0, o = {}) { const a = lz_jetFlight(x0, y0, vx, vy, o); return a == null ? null : t0 + a / (o.tau ?? 1); }
/* lz_jet(x0, y0, vx, vy, t0, t, o) : (x0, y0) = point de départ (coin de l'œil), (vx, vy) en px/s réels, t0 = début (s), t = instant courant.
   o : tau (temps ralenti : 1 = réel, 0,15 = ralenti ×6,7 ; défaut 1), dur (durée réelle de l'émission, 0,35 s), g (gravité), hit [x, y] (la tête du jet disparaît à l'impact), ground (ordonnée du sol : les gouttes qui y tombent laissent une tache),
     size (épaisseur, 1), breakAge (âge de rupture du filet en gouttes, 0,1 s réelles), n (gouttes, 42), seed, stains (taches au sol, true). Renvoie { tip: [x, y], hitT, live }. Dessiner dans draw(). */
function lz_jet(x0, y0, vx, vy, t0, t, o = {}) {
  const tau = o.tau ?? 1, s = (t - t0) * tau, dur = o.dur ?? 0.35, g = lz_gOf(o), sz = o.size ?? 1, ab = o.breakAge ?? 0.15, seed = o.seed ?? 9, N = o.n ?? 42;
  const aEnd = lz_jetFlight(x0, y0, vx, vy, o), maxAge = o.maxAge ?? 0.9, res = { tip: [x0, y0], hitT: aEnd != null ? t0 + aEnd / tau : null, live: false };
  if (s < 0) return res;
  L.setTransform(1, 0, 0, 1, 0, 0);
  const pos = (a, dvx = 0, dvy = 0, da = 0) => [x0 + (vx + dvx) * a + dvx * da * 0, y0 + (vy + dvy) * a + 0.5 * g * a * a];
  const aMax = Math.min(s, aEnd ?? maxAge, maxAge), aMin = Math.max(0, s - dur);
  const red0 = RD[0], red1 = RD[1], red2 = RD[2], red3 = RD[3], red4 = RD[4], red5 = RD[5];
  // petite gerbe au départ de l'œil
  if (s < 0.09) { const r = rng(seed + 3); for (let i = 0; i < 6; i++) { const a = -0.4 + r() * 0.8 - Math.atan2(vy, vx) * 0 , sp = 30 + r() * 80, aa = Math.atan2(vy, vx) + (r() - 0.5) * 1.5, p = [x0 + Math.cos(aa) * sp * s, y0 + Math.sin(aa) * sp * s + 0.5 * g * s * s]; px(p[0], p[1], r() < 0.4 ? red5 : red3); } }
  // filet continu : de aMin à min(aMax, ab)
  const aS = Math.min(aMax, ab);
  if (aS > aMin + 0.002) {
    const nSeg = Math.max(3, Math.ceil((aS - aMin) / 0.008)), pts = []; for (let i = 0; i <= nSeg; i++) { const a = lerp(aMin, aS, i / nSeg); pts.push([a, ...pos(a)]); }
    const th = a => Math.max(1, Math.round((1.7 - 0.7 * clamp(a / ab)) * sz));
    for (let i = 0; i < nSeg; i++) { const a = pts[i][0], q = pts[i], r = pts[i + 1], w = th(a); lineP(q[1], q[2], r[1], r[2], red0, w + 2); }       // contour sombre : le filet se détache du sable orange
    for (let i = 0; i < nSeg; i++) { const a = pts[i][0], q = pts[i], r = pts[i + 1], w = th(a); lineP(q[1], q[2], r[1], r[2], red3, w); }
    for (let i = 0; i < nSeg; i++) { const a = pts[i][0], q = pts[i], r = pts[i + 1], w = th(a); if (w >= 2 && i % 2 === 0) lineP(q[1] + 0.5, q[2] - 1, r[1] + 0.5, r[2] - 1, red5, 1); else if (i % 5 === 0) px(q[1], q[2], red4); }
  }
  // gouttes : après la rupture, elles s'écartent et brillent
  const r = rng(seed * 17 + 1);
  for (let j = 0; j < N; j++) {
    const e = (j + 0.5) / N * dur, a = s - e, dvx = (r() - 0.5) * 0.16 * Math.abs(vx), dvy = (r() - 0.5) * 0.2 * Math.abs(vx), rad = r() < 0.18 ? 1.6 + r() * 0.8 : r() < 0.5 ? 1 + r() * 0.5 : 0.5 + r() * 0.4, abj = ab * (0.85 + r() * 0.5), ph = r() * 7;
    if (a < abj || a > Math.min(aEnd ?? maxAge, maxAge)) { if (a >= (aEnd ?? maxAge) && o.stains !== false && o.ground != null && aEnd != null && a >= aEnd && !o.hit) { const lx = x0 + vx * aEnd + dvx * (aEnd - abj); const age = s - e - aEnd; if (age > 0) { const sr = rad > 1.4 ? 1 : 0; const c0 = age < 0.4 / tau ? red3 : red1; R(lx, o.ground + (j % 3) - 1, 1 + sr + (j % 4 === 0 ? 1 : 0), 1, c0); if (j % 5 === 0) px(lx + 1, o.ground, red0); } } continue; }
    const d = a - abj, p = pos(a, dvx * 0, dvy * 0); p[0] += dvx * d; p[1] += dvy * d;
    const tw = Math.sin(t * 22 + ph) > 0.55;
    if (rad >= 1.5) { R(p[0] - 2, p[1] - 2, 5, 5, red0); R(p[0] - 1, p[1] - 1, 3, 3, red3); px(p[0] - 1, p[1] - 1, tw ? WH[3] : red5); px(p[0] + 1, p[1] + 1, red1); }
    else if (rad >= 0.95) { R(p[0] - 1, p[1] - 1, 4, 4, red0); R(p[0], p[1], 2, 2, red3); px(p[0], p[1], tw ? WH[2] : red5); px(p[0] + 1, p[1] + 1, red1); }
    else { R(p[0] - 1, p[1] - 1, 4, 3, red0); R(p[0], p[1], 2, 1, red3); px(p[0], p[1], tw ? WH[2] : red5); }
  }
  const tip = pos(aMax); res.tip = tip; res.live = s < dur + (aEnd ?? maxAge); return res;
}

/* lz_splat(x, y, t, o) : éclaboussure sur une surface (museau) au point (x, y). o : t0 (instant de l'impact ; t − t0 est le temps écoulé), tau (ralenti, comme le jet), size (1), n (gouttes, 9), dir (angle de la normale de la surface, rad : −π/2 = vers le haut ; défaut vers la gauche-haut),
   slide [dx, dy] (sens de glissement des filets, défaut vers le bas), drips (3), seed. Gouttes projetées, tache brillante qui s'étale, filets qui glissent et ralentissent. Dessiner dans draw(), après l'animal. */
function lz_splat(x, y, t, o = {}) {
  const tau = o.tau ?? 1, s = (t - (o.t0 || 0)) * tau, sz = o.size ?? 1, g = lz_gOf(o), seed = o.seed ?? 4, n = o.n ?? 9;
  if (s < 0) return;
  L.setTransform(1, 0, 0, 1, 0, 0);
  const r = rng(seed), nd = o.dir ?? -2.4, sl = lz_norm(o.slide || [0.2, 1]);
  // gouttes projetées
  for (let i = 0; i < n; i++) {
    const a = nd + (r() - 0.5) * 2.2, sp = (40 + r() * 100) * sz, rad = r() < 0.3 ? 1 : 0, life = 0.5 + r() * 0.5, p = [x + Math.cos(a) * sp * s, y + Math.sin(a) * sp * s + 0.5 * g * s * s * 0.5];
    if (s > life) continue; const k = 1 - s / life;
    if (rad) { R(p[0], p[1], 2, 2, RD[3]); px(p[0], p[1], k > 0.4 ? RD[5] : RD[3]); px(p[0] + 1, p[1] + 1, RD[1]); } else px(p[0], p[1], k > 0.5 ? RD[4] : RD[3]);
  }
  // tache : s'étale en 0,1 s (temps réel), reste brillante
  const gr = clamp(s / 0.1), R0 = (3.4 + 0.6 * Math.sin(seed)) * sz * eo(gr);
  if (R0 > 0.6) {
    const rr = rng(seed + 11); const blob = []; for (let k = 0; k < 9; k++) { const ang = k / 9 * TAU, rad = R0 * (0.72 + 0.5 * rr()); blob.push([x + Math.cos(ang) * rad, y + Math.sin(ang) * rad * 0.85]); }
    poly(blob, RD[1]); poly(blob.map(p => [x + (p[0] - x) * 0.86, y + (p[1] - y) * 0.86]), RD[2]); poly(blob.map(p => [x + (p[0] - x) * 0.55 - 0.3, y + (p[1] - y) * 0.55 - 0.5]), RD[3]);
    px(x - 1, y - 1, RD[5]); if (R0 > 2.4) px(x, y - 1, WH[2]);
    for (let k = 0; k < 4; k++) { const ang = rr() * TAU, d = R0 * (1.15 + rr() * 0.7); px(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.85, RD[2]); }
  }
  // filets qui glissent (vers le bas du museau)
  const nDr = o.drips ?? 3;
  for (let k = 0; k < nDr; k++) {
    const st = 0.16 + k * 0.13, du = s - st; if (du <= 0) continue;
    const L0 = (7 + 5 * ((k * 7) % 3)) * sz, len = L0 * (1 - Math.exp(-du * 2.0)), ox = (k - (nDr - 1) / 2) * 2.6 * sz, sx = x + ox, sy = y + 1 + (k % 2);
    for (let i = 0; i < len; i++) { const f = i / Math.max(1, len); px(sx + sl[0] * i + (i > len * 0.6 ? 0 : 0), sy + sl[1] * i, f > 0.7 ? RD[3] : RD[2]); if (i % 3 === 0 && i < len - 1) px(sx + sl[0] * i - 1, sy + sl[1] * i, RD[1]); }
    const hx = sx + sl[0] * len, hy = sy + sl[1] * len; R(hx - 0.5, hy, 2, 2, RD[3]); px(hx - 0.5, hy, RD[5]); px(hx + 0.5, hy + 1, RD[1]);
  }
}

/* lz_ruler(x, y, w, t, o) : règle (mètre ruban jaune) posée sur le sable ; (x, y) = zéro, sur la ligne du sol ; w = pixels pour 1 mètre ; la règle va jusqu'à 1,08 m.
   o : reveal 0..1 (déroulement ; 1 = entière), text (true : chiffres 0, 50 CM, 1 M dessinés avec ptext ; false pour les dessiner à part avec lz_rulerText dans ui()), h (épaisseur de la face supérieure, 6), tab (languette au bout). Renvoie { x0, x1, xm(m) }. */
function lz_ruler(x, y, w, t, o = {}) {
  const rv = clamp(o.reveal ?? 1), len = Math.round(w * 1.08 * rv), h = o.h ?? 6, x0 = Math.round(x), y0 = Math.round(y), end = x0 + len;
  const xm = m => x + w * m;
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (len <= 0) return { x0, x1: x0, xm };
  // ombre portée sur le sable
  L.fillStyle = 'rgba(40,16,52,0.32)'; L.fillRect(x0 + 1, y0 + 1, len + 2, 4); L.fillStyle = 'rgba(40,16,52,0.2)'; L.fillRect(x0 + 3, y0 + 5, len, 2);
  // face supérieure (vue rasante), tranche avant, contour
  R(x0 - 1, y0 - h - 1, len + 2, h + 3, NI[0]);
  R(x0, y0 - h, len, h, AM[7]); R(x0, y0 - h, len, 1, AM[10]); R(x0, y0 - h + 1, len, 1, AM[8]);
  R(x0, y0 - 1, len, 1, AM[5]); R(x0, y0, len, 1, AM[4]);                    // tranche
  ditherRect(x0, y0 - h + 2, len, h - 3, AM[6], 0.18);
  // graduations tous les 5 cm : courtes ; 10 cm : moyennes ; 50 cm et 1 m : longues
  for (let k = 0; k <= 21; k++) {
    const m = k * 0.05, px0 = Math.round(x0 + w * m); if (px0 > end - 1) break;
    const big = k % 10 === 0, mid = k % 2 === 0; const hh = big ? h - 1 : mid ? 4 : 2;
    R(px0, y0 - 1 - hh, 1, hh, big ? NI[0] : WO[1]);
  }
  // bout : languette métallique repliée, ou rouleau qui se déroule
  if (rv >= 1) { R(end, y0 - h - 2, 2, h + 4, NI[0]); R(end, y0 - h - 1, 1, h + 2, ST[6]); R(end + 1, y0 - h - 1, 1, h + 2, ST[3]); px(end, y0 - h - 1, WH[3]); }
  else {
    const rr = 5, cx0 = end + 1, cy0 = y0 - 3; disc(cx0, cy0, rr, NI[0]); disc(cx0, cy0, rr - 1, AM[7]); disc(cx0, cy0, rr - 2, AM[6]);
    const ang = len / 3.2; for (let k = 0; k < 3; k++) { const a = ang + k * 2.1; lineP(cx0, cy0, cx0 + Math.cos(a) * (rr - 1), cy0 + Math.sin(a) * (rr - 1), k ? AM[8] : AM[4], 1); } disc(cx0, cy0, 1, NI[0]);
    px(cx0 - 2, cy0 - 3, AM[10]);
  }
  if (o.text !== false) lz_rulerText(x, y, w, t, o);
  return { x0, x1: end, xm };
}
// chiffres de la règle (pixel 5 × 7) : à appeler dans ui() si on veut les garder nets
function lz_rulerText(x, y, w, t, o = {}) {
  const rv = clamp(o.reveal ?? 1), len = w * 1.08 * rv, h = o.h ?? 6;
  for (const [m, label] of [[0, '0'], [0.5, '50 CM'], [1, '1 M']]) {
    const d = w * m, k = (len - d) / 10; if (k <= 0) continue; const up = Math.round(3 * (1 - clamp(k))), px0 = Math.round(x + d), ty = Math.round(y) - h - 17 + up;
    R(px0, ty + 8, 1, 5 - up, WH[2]);
    ptextC(label, px0, ty, WH[3], 1, NI[0]);
  }
}

// ───────────────────────── icône de case du carnet (17 × 17, contour sombre d'un pixel calculé autour, couleurs exactes) ─────────────────────────
// lézard de profil dessiné à la main, pixel par pixel : disque plat orange à taches, queue pointue, tête à museau et un pixel d'œil clair, éventail de trois cornes vers l'arrière-haut, cinq dents de frange sous le disque
const LZ_ICOL = { a: '#dba67c', b: '#c06a34', c: '#964a26', d: '#f4cfa6', e: '#12100c', w: '#fff8e8', g: '#a96d3c', h: '#ffe08a' };
const LZ_ICON = [
  '.................',
  '.................',
  '........a........',
  '........a........',
  '....a....a.......',
  '.....aa...a......',
  '.......a..a......',
  '..aaaa..aaaa.....',
  '.....aaaaaaa.....',
  '...bbbcbbbcbaaaa.',
  '.gbbbbddddbbaawaa',
  'gggbbcbbcbbbdddd.',
  '.....ccccccc.....',
  '....d.d.d.d.d....',
  '.................',
  '.................',
  '.................',
];
ICONES[1] = function (cx, cy) {
  const N = 17, g = LZ_ICON, x0 = Math.round(cx) - 8, y0 = Math.round(cy) - 8, fill = (x, y) => x >= 0 && y >= 0 && x < N && y < N && g[y][x] !== '.';
  for (let y = -1; y <= N; y++) for (let x = -1; x <= N; x++) if (!fill(x, y) && (fill(x - 1, y) || fill(x + 1, y) || fill(x, y - 1) || fill(x, y + 1))) R(x0 + x, y0 + y, 1, 1, '#05040f');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const ch = g[y][x]; if (ch !== '.') R(x0 + x, y0 + y, 1, 1, LZ_ICOL[ch]); }
};
