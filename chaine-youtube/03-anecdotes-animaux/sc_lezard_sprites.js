'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_lezard_sprites.js — le LÉZARD À CORNES, le COYOTE et les accessoires du jet de sang (segment Mexique). Préfixe lz_.
   Tout se dessine sur L (270 × 480) dans draw(u, t) (avant le tramage), sauf ICONES[1] (ui). Fonctions pures du temps : aucun Math.random ni Date.

   lz_lizard(cx, cy, s, t, o)     lézard royal (Phrynosoma solare). (cx, cy) = centre de l'empreinte au sol (centre de l'ombre) ; s = 1 → ≈ 105 px de long (queue au bout des cornes), s = 0,4 → 42 px.
                                  o.pose 'rest' | 'alert' | 'walk' | 'flat' | 'puff' | 'squirt' (+ o.pose2 et o.mix 0..1 : fondu continu d'une pose à l'autre),
                                  o.flip (tourné vers la gauche), o.eye (0 fermé … 1 ouvert ; défaut : cligne tout seul), o.bulge 0..1 (sinus de l'œil gonflé, bord rougi), o.puff 0..1 (gonflement en plus de la pose),
                                  o.rim 0..1 (liseré de soleil, 1), o.light ±1 (côté du soleil, +1 = droite), o.shadow 0..1 (ombre au sol, 1), o.camo 0..1 (se fond dans le sable),
                                  o.ph, o.go (walk : phase de pas et vitesse, sinon tirées de lz_gait(t)), o.seed (individu : taches), o.env ('desertDusk' par défaut ; 'none' = lumière neutre), o.outline (couleur du contour).
                                  Renvoie { T(lx, ly) → [x, y] écran, eye, head, mouth, crown, bodyTop, tail, w } : repères pour viser (jet, éclaboussure).
   lz_gait(t, o)                  marche PAR À-COUPS : { ph, go (0..1 vitesse), x (distance parcourue en px à s = 1, signée vers l'avant), moving } ; o.stride (px à s = 1 par cycle de pas, 26), o.t0 (début), o.pause (1 : durée des arrêts).
                                  Position du lézard : cx = x0 + (o.flip ? −1 : 1) × lz_gait(t − t0).x × s.
   lz_coyote(cx, cy, s, t, o)     coyote de profil. (cx, cy) = sol sous le centre du corps ; s = 1 → ≈ 150 px de long (museau à la queue), hauteur au garrot ≈ 70 px.
                                  o.pose 'trot' | 'stalk' | 'sniff' | 'hit' | 'disgust' | 'trotOff' ; o.flip ; o.ph (phase de cycle de pas, sinon t) ; o.headDown 0..1 ; o.mouth 0..1 (gueule ouverte) ; o.tongue 0..1 ;
                                  o.shake 0..1 (secouement de tête, traînées de mouvement) ; o.hit 0..1 (recul du coup) ; o.t0 (instant du début de la pose : le sursaut et le secouement en partent) ;
                                  o.rim, o.light, o.shadow, o.env, o.seed. Renvoie { T, nose, eye, muzzle, head, ear, tail, mouth, w }.
   lz_jet(x0, y0, vx, vy, t0, t, o)  jet de sang balistique ; lz_jetVel(x0, y0, x1, y1, T, g) → [vx, vy] pour toucher (x1, y1) après T secondes ; lz_jetEnd(…) ; lz_splat(x, y, t, o) ; lz_ruler(x, y, w, t, o) ; lz_rulerText(…).
   ICONES[1]                      icône 17 × 17 du carnet.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ───────────────────────── outils ─────────────────────────
const lz_rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lz_hex = r => '#' + r.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function lz_mix(a, b, k) { const A = lz_rgb(a), B = lz_rgb(b); return lz_hex(A.map((v, i) => v + (B[i] - v) * k)); }
const lz_norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const lz_scr = mkCanvas(), lz_S = lz_scr.getContext('2d', { willReadFrequently: true });
let lz_BB = [0, 0, LW, LH];                                      // zone de travail (pixels écran) : limite le coût des croissants

// croissant : la partie de path qui n'est PAS couverte par path décalé de (dx, dy) (donc du côté opposé au décalage), floutée de blur px et bornée à path
function lz_cres(c, path, col, dx, dy, blur = 0, alpha = 1) {
  const S = lz_S, B = lz_BB, w = B[2] - B[0], h = B[3] - B[1];
  S.setTransform(1, 0, 0, 1, 0, 0); S.globalCompositeOperation = 'source-over'; S.filter = 'none'; S.globalAlpha = 1; S.clearRect(B[0], B[1], w, h);
  S.setTransform(c.getTransform());
  S.fillStyle = col; S.fill(path);
  S.globalCompositeOperation = 'destination-out'; S.translate(dx, dy); S.fill(path);
  S.globalCompositeOperation = 'source-over'; S.setTransform(1, 0, 0, 1, 0, 0);
  c.save(); c.clip(path); c.setTransform(1, 0, 0, 1, 0, 0);
  if (blur > 0.05) c.filter = `blur(${blur.toFixed(2)}px)`;
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

// ───────────────────────── poses du lézard ─────────────────────────
const LZ_POSE = {
  //          épaisseur  largeur  profondeur  tête(y, x)    tangage   piquants  cornes  pattes   respiration
  rest: { bh: 5.2, bw: 1.0, bd: 1.0, hy: 0, hx: 0, hp: 0.05, sp: 0.25, hn: 0.0, lg: 0.0, br: 1.0 },
  alert: { bh: 6.0, bw: 0.98, bd: 1.0, hy: -4.5, hx: 1.5, hp: -0.16, sp: 0.35, hn: 0.3, lg: 0.0, br: 1.4 },
  walk: { bh: 5.2, bw: 1.0, bd: 1.0, hy: -1.5, hx: 1, hp: -0.04, sp: 0.3, hn: 0.1, lg: 0.0, br: 0.8 },
  flat: { bh: 3.2, bw: 1.07, bd: 1.06, hy: 2.5, hx: 1.5, hp: 0.1, sp: 0.15, hn: -0.25, lg: 1.0, br: 0.7 },
  puff: { bh: 13, bw: 1.12, bd: 1.14, hy: -1, hx: -2, hp: -0.02, sp: 1.0, hn: 0.55, lg: 0.0, br: 0.4 },
  squirt: { bh: 5.6, bw: 1.0, bd: 1.0, hy: 3.5, hx: 4.5, hp: 0.28, sp: 0.8, hn: 0.2, lg: 0.0, br: 0.5 },
};
function lz_pose(o) {
  const A = LZ_POSE[o.pose || 'rest'] || LZ_POSE.rest, B = o.pose2 ? (LZ_POSE[o.pose2] || A) : A, k = o.pose2 ? clamp(o.mix ?? 0) : 0, P = {};
  for (const key in A) P[key] = lerp(A[key], B[key], k);
  const pf = clamp(o.puff ?? 0);
  if (pf > 0) { P.bh = lerp(P.bh, 15, pf); P.bw = lerp(P.bw, 1.12, pf); P.bd = lerp(P.bd, 1.14, pf); P.sp = lerp(P.sp, 1, pf); P.hn = lerp(P.hn, 0.55, pf); P.hx = lerp(P.hx, -2, pf); P.hy = lerp(P.hy, -1, pf); }
  P.name = o.pose || 'rest'; P.walk = (o.pose === 'walk' ? 1 - k : 0) + (o.pose2 === 'walk' ? k : 0);
  return P;
}

// marche par à-coups : des départs brefs d'un demi-pas, des arrêts figés (le corps respire, la tête se règle) ; en fin de départ les quatre pattes sont au sol
const LZ_BURSTS = [[0.0, 0.42], [0.98, 0.34], [1.9, 0.44]], LZ_CYC = 2.75;
function lz_gait(t, o = {}) {
  const T = LZ_CYC * (o.pause ?? 1), stride = o.stride ?? 26, tt = t - (o.t0 || 0);
  if (tt < 0) return { ph: 0.15, go: 0, x: 0, moving: false };
  const cyc = Math.floor(tt / T), u = tt - cyc * T; let half = cyc * LZ_BURSTS.length, go = 0;
  for (let i = 0; i < LZ_BURSTS.length; i++) {
    const a = LZ_BURSTS[i][0] * (o.pause ?? 1), d = LZ_BURSTS[i][1];
    if (u >= a + d) half += 1; else if (u > a) { const p = (u - a) / d; half += eio(p); go = Math.sin(p * Math.PI); }
  }
  const ph = 0.15 + half * 0.5;
  return { ph, go, x: ph * stride - 0.15 * stride, moving: go > 0.02 };
}

// ───────────────────────── le lézard à cornes ─────────────────────────
function lz_lizard(cx, cy, s, t, o = {}) {
  const P = lz_pose(o), fl = o.flip ? -1 : 1, camo = clamp(o.camo ?? 0), rimK = clamp(o.rim ?? 1), shK = clamp(o.shadow ?? 1), seed = o.seed ?? 3;
  const envName = o.env || 'desertDusk', E = envName === 'none' ? { light: 1, rim: '#fff2c4', shadow: '#2e1a56', lit: '#ffc84a', shK: 0.1, liK: 0.1 } : fl_env({ env: envName, light: o.light });
  const lightX = o.light ?? E.light ?? 1, ll = lz_norm([lightX * fl * 0.9, -0.5]);                // direction de la lumière en repère local
  // ── couleurs ──
  const tgt = '#a96d3c', K = camo * 0.62, M = (h, k = 1) => lz_mix(h, tgt, K * k);
  const shTint = E.shadow, hiTint = E.lit;
  const C = {
    top: M(lz_mix(SK[3], OC[4], 0.28)), topHi: lz_mix(M(SK[4]), hiTint, 0.3), topLo: lz_mix(M(SK[2]), shTint, 0.2), rust: M(OC[3], 0.85), rustD: M(OC[2], 0.8),
    wall: M(lz_mix(SK[2], OC[3], 0.2)), wallLo: lz_mix(M(SK[1]), shTint, 0.32), under: M(WO[3]), spot: M(WO[2], 1.15), spotHi: M(AM[9], 0.9), cream: M(AM[10], 1.1),
    horn: M(SK[3]), hornHi: lz_mix(M(AM[9]), hiTint, 0.2), hornLo: lz_mix(M(SK[1]), shTint, 0.2), tipD: M(WO[3]), rim: E.rim || AM[9], out: o.outline || lz_mix('#1d120c', '#48291a', camo),
  };
  const tt = t + seed * 1.7;
  // ── respiration, clignement, marche ──
  const brA = 0.045 * P.br, breath = Math.sin(TAU * 0.78 * tt), breath2 = Math.sin(TAU * 0.78 * tt - 0.7);
  const walkOn = P.walk > 0.01, G = walkOn ? (o.ph != null ? { ph: o.ph, go: o.go ?? 1 } : lz_gait(t)) : { ph: 0.15, go: 0 };
  const blinkT = (tt * 0.37) % 1, blink = blinkT > 0.955 ? Math.sin((blinkT - 0.955) / 0.045 * Math.PI) : 0;
  const eyeOpen = o.eye != null ? clamp(o.eye) : 1 - blink;
  const bulge = clamp(o.bulge ?? 0);
  // ── dimensions ──
  const bh = P.bh * (1 + brA * breath), W = 29 * P.bw * (1 + 0.012 * breath), Dp = 17.0 * P.bd, bob = walkOn ? Math.sin(TAU * G.ph * 2) * 0.45 * G.go : 0;
  const cT = [-2, -bh - 1.6 + bob], rxT = W - 2.6, ryT = Dp - 3.4;               // dessus (ellipse), le flanc est l'ellipse au sol
  const sway = walkOn ? Math.sin(TAU * G.ph) * G.go : 0, idle = Math.sin(tt * 0.9) * 0.5 + Math.sin(tt * 2.3 + 1) * 0.25;
  const H0 = [32 + P.hx, -6.5 + P.hy + bob + 0.35 * breath2 - (walkOn ? 0.7 * sway * 0 : 0)], hp = P.hp + (walkOn ? 0.03 * sway : 0) + 0.012 * idle;
  const hc = Math.cos(hp), hs = Math.sin(hp);
  const Th = (x, y) => [H0[0] + x * hc - y * hs, H0[1] + x * hs + y * hc];     // repère de la tête → repère du corps
  const Tb = (x, y) => [cx + fl * s * x, cy + s * y];                           // repère du corps → écran
  const Ts = (x, y) => Tb(...Th(x, y));
  // zone de travail
  const ex = 78 * s + 8; lz_BB = [Math.max(0, Math.floor(cx - ex)), Math.max(0, Math.floor(cy - 62 * s - 8)), Math.min(LW, Math.ceil(cx + ex)), Math.min(LH, Math.ceil(cy + 36 * s + 8))];
  // ombre au sol
  if (shK > 0) { const sx = cx - lightX * 5 * s, a = 0.55 * shK * (1 - 0.45 * camo); if (typeof k_shadow === 'function') k_shadow(sx, cy + 1.5 * s, (W + 5) * s, (Dp + 1.5) * s * 0.9, a, { col: '40,16,52' }); else ell(sx, cy + 2 * s, (W + 4) * s, Dp * s, 'rgba(20,8,30,0.4)'); }

  layerBegin();
  const c = Y; c.setTransform(s * fl, 0, 0, s, cx, cy); c.lineJoin = 'round';
  const { mn, bl, dark, lite, rimL } = lz_tools(c, s, ll, C.rim, rimK);
  const rnd = rng(seed * 977 + 11);
  const lerpP = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

  // ── pattes (4) ; la patte lointaine d'abord ──
  const leg = (sh, f, bend, w0, col, colLo, toes = 1) => {
    // deux segments (IK) : coude plié vers le bas et l'extérieur ; pied plat à trois doigts
    const dx = f[0] - sh[0], dy = f[1] - sh[1], d = Math.hypot(dx, dy), l1 = 6.0, l2 = 6.0, dd = Math.min(d, l1 + l2 - 0.2), a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0.3, l1 * l1 - a * a));
    const ux = dx / (d || 1), uy = dy / (d || 1), kx = sh[0] + ux * a + (-uy) * h * bend * 0.55, ky = sh[1] + uy * a + ux * h * bend * 0.55;
    const p = polyPath(limb([sh, [kx, ky], f], [w0, w0 * 0.74, w0 * 0.55]));
    c.fillStyle = colLo; c.fill(p); lite(p, col, w0 * 0.42, 0.5); rimL(p, 0.8, 0.7);
    const foot = lz_ell(f[0] + 1.6 * toes, f[1] + 0.5, 3.6, 1.9, 0.12); c.fillStyle = colLo; c.fill(foot); lite(foot, col, 0.9, 0.3);
    for (let k = 0; k < 3; k++) { const tp = lz_ell(f[0] + 4.2 * toes, f[1] - 0.4 + k * 1.1, 1.3, 0.62, 0.05 * (k - 1)); c.fillStyle = k === 1 ? col : colLo; c.fill(tp); }
    return p;
  };
  const legs = [];
  // positions des pieds au repos ; en marche : diagonales en phase (proche-avant + lointain-arrière)
  const stance = (i, x0, y0, amp, phi) => {
    if (!walkOn) return [x0, y0, 0];
    const u = (((G.ph + phi) % 1) + 1) % 1, duty = 0.7;
    if (u < duty) return [x0 + amp * (1 - 2 * u / duty), y0, 0];
    const q = (u - duty) / (1 - duty); return [x0 + amp * (-1 + 2 * q), y0 - 3.4 * Math.sin(q * Math.PI), 1];
  };
  const spread = P.lg;
  const nF = stance(0, 26 + 3 * spread, 11.2 + 1.5 * spread, 5.5, 0), nH = stance(1, -23 - 3 * spread, 12.6 + 1.5 * spread, 5.5, 0.5), fF = stance(2, 21, -9.5, 5, 0.5), fH = stance(3, -18, -8.5, 5, 0);
  const lc = lz_mix(C.top, C.wall, 0.55), lcLo = lz_mix(C.under, '#000000', 0.15);
  leg([14, -8 - bh * 0.3], [fF[0], fF[1]], -1, 5.0, lz_mix(lc, C.wallLo, 0.4), C.wallLo);
  leg([-17, -8 - bh * 0.2], [fH[0], fH[1]], -1, 5.2, lz_mix(lc, C.wallLo, 0.4), C.wallLo);

  // pattes proches : tirées sous le corps, seul ce qui dépasse du flanc se voit
  leg([12, -1.0], [nF[0], nF[1]], 1, 5.8, lz_mix(C.top, C.wall, 0.4), C.wallLo);
  leg([-16, 0], [nH[0], nH[1]], 1, 6.2, lz_mix(C.top, C.wall, 0.4), C.wallLo);

  // ── queue : courte, plate, bandée ──
  { const tl = [[-25, -3.5 + bob * 0.5], [-32, -2.6 + 0.8 * sway], [-38, -1.0 + 1.2 * sway + idle * 0.3], [-42.5, 1.0 + 1.8 * sway + idle * 0.6]];
    const p = polyPath(limb(tl, [15 * P.bd, 11, 7.4, 3.4])); c.fillStyle = C.wall; c.fill(p);
    c.save(); c.clip(p); c.fillStyle = C.rustD; for (const k of [0.45, 0.78]) { const q = bez(tl[0], tl[2], tl[3], k); c.beginPath(); c.ellipse(q[0], q[1], 1.1, 7, 0.25, 0, TAU); c.fill(); } c.restore();
    dark(p, lz_mix(C.wallLo, C.under, 0.3), 2.2); lite(p, C.top, 1.8, 0.8); rimL(p, 0.9); }

  // ── corps : flanc (ellipse au sol) puis dessus (ellipse surélevée) ──
  const wallP = lz_ell(-2, -bh * 0.15, W, Dp + bh * 0.15), topP = lz_ell(cT[0], cT[1], rxT, ryT);
  const silB = new Path2D(); silB.addPath(wallP); silB.addPath(topP);
  c.fillStyle = C.wall; c.fill(wallP);
  dark(wallP, C.wallLo, 4.2, 1.6);
  // frange d'écailles pointues du flanc proche (sur le bord inférieur) : triangles pâles
  const fr = P.sp, nFr = 14, fring = [];
  for (let i = 0; i < nFr; i++) {
    const phi = lerp(0.1, Math.PI - 0.1, i / (nFr - 1)), px0 = -2 + (W + 0.4) * Math.cos(phi), py0 = (Dp + bh * 0.15) * Math.sin(phi) - bh * 0.15 + 0.2;
    const nx = Math.cos(phi) / 1, ny = Math.sin(phi) * 0.9, nl = Math.hypot(nx, ny), len = Math.max(1.9 + 2.4 * fr + 0.6 * Math.sin(i * 2.3), 2.3 / s), tx = -ny / nl, ty = nx / nl, bw2 = Math.max(1.7 + 0.4 * fr, 1.4 / s);
    fring.push([[px0 + tx * bw2, py0 + ty * bw2], [px0 - tx * bw2, py0 - ty * bw2], [px0 + nx / nl * len, py0 + ny / nl * len + 0.8]]);
  }
  for (const [a, b, tip] of fring) { const p = lz_tri(a, b, tip); c.fillStyle = lz_mix(C.horn, C.cream, 0.35); c.fill(p); dark(p, lz_mix(C.horn, C.wallLo, 0.6), 1.2, 0.4); }
  // petits piquants du bord lointain (le dessus, vers le haut)
  for (let i = 0; i < 11; i++) {
    const phi = lerp(Math.PI + 0.35, TAU - 0.5, i / 10), px0 = cT[0] + rxT * Math.cos(phi), py0 = cT[1] + ryT * Math.sin(phi), len = Math.max(2.0 + 2.6 * fr, 2.0 / s), bw2 = Math.max(1.5, 1.2 / s);
    const nx = Math.cos(phi), ny = Math.sin(phi) * 1.1, nl = Math.hypot(nx, ny), tx = -ny / nl, ty = nx / nl;
    const p = lz_tri([px0 + tx * bw2, py0 + ty * bw2], [px0 - tx * bw2, py0 - ty * bw2], [px0 + nx / nl * len, py0 + ny / nl * len - 0.4]); c.fillStyle = C.horn; c.fill(p);
  }
  // dessus : sable, tons chauds vers le bord
  c.fillStyle = C.top; c.fill(topP);
  // bande de couleur plus rousse vers le bord proche du dessus
  c.save(); c.clip(topP); c.translate(0, 0);
  { const g = c.createLinearGradient(0, cT[1] - ryT, 0, cT[1] + ryT); g.addColorStop(0, lz_mix(C.top, C.topHi, 0.55)); g.addColorStop(0.5, C.top); g.addColorStop(1, lz_mix(C.top, C.rust, 0.45)); c.fillStyle = g; c.fillRect(cT[0] - rxT, cT[1] - ryT, rxT * 2, ryT * 2); }
  // ligne claire dorsale
  c.strokeStyle = C.cream; c.lineWidth = mn(1.0); c.lineCap = 'round'; c.beginPath(); c.moveTo(cT[0] + rxT * 0.82, cT[1] + 0.2); c.quadraticCurveTo(cT[0] + 4, cT[1] - 0.9, cT[0] - rxT * 0.78, cT[1] + 0.3); c.stroke();
  // taches sombres : deux rangées de chaque côté de la ligne, bord clair
  const spots = [[0.60, -0.52, 4.2, 2.6], [0.55, 0.58, 3.8, 2.6], [0.06, -0.62, 5.0, 2.8], [0.0, 0.66, 4.6, 2.8], [-0.52, -0.5, 4.2, 2.5], [-0.56, 0.52, 4.2, 2.6]];
  spots.forEach(([a, b, rx, ry], i) => {
    const x = cT[0] + rxT * a + (rnd() - 0.5) * 2, y = cT[1] + ryT * b * 0.95 + (rnd() - 0.5) * 1.2, rot = (rnd() - 0.5) * 0.7, pts = [];
    for (let k = 0; k < 7; k++) { const an = k / 7 * TAU, rr = 0.82 + 0.3 * rnd(); pts.push([x + Math.cos(an + rot) * rx * rr, y + Math.sin(an + rot) * ry * rr]); }
    const bp = lz_smooth(pts); c.fillStyle = lz_mix(C.rust, C.top, 0.25); c.fill(bp);
    c.save(); c.translate(0.35 * ll[0], 0.35 * ll[1]); c.fillStyle = C.rustD; c.fill(bp); c.restore();
    c.save(); c.clip(bp); c.fillStyle = lz_mix(C.spot, C.rustD, 0.6); c.beginPath(); c.ellipse(x - ll[0] * rx * 0.2, y - ll[1] * ry * 0.2, rx * 0.46, ry * 0.42, rot, 0, TAU); c.fill(); c.restore();
  });
  // grain : petites écailles claires et sombres
  for (let i = 0; i < 70; i++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 0.96, x = cT[0] + rxT * r * Math.cos(a), y = cT[1] + ryT * r * Math.sin(a); c.fillStyle = rnd() < 0.55 ? C.topHi : C.rust; c.fillRect(x, y, mn(0.85), mn(0.85)); }
  c.restore();
  dark(topP, C.topLo, 3.8, 1.5);
  lite(topP, C.topHi, 2.6, 1.0, 0.9);
  rimL(topP, 1.0);
  // taches sur le flanc (sous le bord du dessus)
  c.save(); c.clip(wallP);
  for (let i = 0; i < 7; i++) { const a = lerp(0.25, Math.PI - 0.25, (i + 0.5) / 7), x = -2 + (W - 3) * Math.cos(a), y = (Dp + bh * 0.15) * Math.sin(a) - bh * 0.15 - 1.5; c.fillStyle = C.rustD; c.beginPath(); c.ellipse(x, y, 2.5, 1.5, 0, 0, TAU); c.fill(); }
  c.restore();

  // ── tête et couronne (repère de la tête : origine au centre du crâne, museau vers la droite) ──
  c.save(); c.translate(H0[0], H0[1]); c.rotate(hp);
  const hnR = P.hn, rot = (b, tip, k) => { const dx = tip[0] - b[0], dy = tip[1] - b[1], cs = Math.cos(-k), sn = Math.sin(-k); return [b[0] + dx * cs - dy * sn, b[1] + dx * sn + dy * cs]; };
  const bandsOn = s > 0.8, hornBase = [];
  const horn = (p, i) => {
    c.lineWidth = mn(1.5); c.strokeStyle = C.under; c.stroke(p);                // halo sombre : sépare la dague du fond
    c.fillStyle = lz_mix(C.top, C.horn, 0.45); c.fill(p);
    if (bandsOn) { c.save(); c.clip(p); const hb = hornBase[i]; for (const k of [0.34, 0.62]) { const q = [hb[0][0] + (hb[1][0] - hb[0][0]) * k, hb[0][1] + (hb[1][1] - hb[0][1]) * k], an = Math.atan2(hb[1][1] - hb[0][1], hb[1][0] - hb[0][0]); c.save(); c.translate(q[0], q[1]); c.rotate(an); c.fillStyle = C.rustD; c.globalAlpha = 0.75; c.fillRect(-0.6, -9, 1.5, 18); c.restore(); } c.restore(); }
    dark(p, C.hornLo, 2.4, 0.7); lite(p, C.hornHi, 1.4, 0.5, 0.9); rimL(p, 0.9, 0.9);
  };
  // couronne : quatre dagues larges dont les bases se touchent, en éventail (3/4 haut : la plus éloignée est la plus haute à l'écran)
  const hk = Math.max(1, 3.0 / (s * 24));                                        // à petite échelle les cornes sont un peu épaissies (lisibilité)
  const horns = [
    [[-5.0, -7.8], [-14.5, -30.5], 7.6 * hk, 0.12], [[-5.6, -6.4], [-25, -26], 9.6 * hk, 0.11], [[-5.6, -4.6], [-30, -14.5], 9.6 * hk, 0.09], [[-5.0, -2.6], [-23.5, -3.6], 7.4 * hk, 0.06],
  ];
  const hornPaths = horns.map(([b, tip, bw, cv], i) => { const tp = rot(b, tip, hnR * (1 - i * 0.12)); hornBase[i] = [b, tp]; return lz_dagger(b, tp, bw, cv, 0.8); });
  horn(hornPaths[0], 0); horn(hornPaths[1], 1);
  // tête : museau court et large, front bas
  const headP = lz_smooth([[-9, -6.2], [-4.5, -8.8], [0.5, -9.4], [5.4, -8.2], [9.6, -5.2], [13, -2.2], [13.2, 0.5], [10.6, 3.0], [6, 4.7], [0, 5.6], [-6.5, 5.3], [-10, 3]]);
  c.fillStyle = C.top; c.fill(headP);
  { const jaw = polyPath([[13.2, 0.6], [10.6, 3.1], [6, 4.8], [0, 5.7], [-6.5, 5.4], [-10, 3.1], [-6, 2.5], [0, 3.1], [6, 2.0], [11.5, 0.5]]); c.save(); c.clip(headP); c.fillStyle = lz_mix(C.cream, C.top, 0.3); c.fill(jaw); c.restore(); }
  dark(headP, C.topLo, 2.4, 1.0); lite(headP, C.topHi, 1.7, 0.7, 0.9); rimL(headP, 0.9);
  // arcade sourcilière : bosse au-dessus de l'œil
  { const brow = lz_ell(3.0, -7.0, 4.8, 2.4, 0.12); c.fillStyle = lz_mix(C.top, C.rust, 0.3); c.fill(brow); dark(brow, C.topLo, 1.2, 0.4); lite(brow, C.topHi, 1.0, 0.4, 0.9); rimL(brow, 0.8, 0.8); }
  horn(hornPaths[2], 2); horn(hornPaths[3], 3);
  // cornes temporales : petites pointes derrière la joue
  [[[-8.6, -0.2], [-15.5, 3.2], 2.8], [[-7.8, 2.0], [-13.2, 7.4], 2.5], [[-5.2, 3.5], [-8.6, 9.0], 2.1]].forEach(([b, tip, bw]) => { const p = lz_dagger(b, rot(b, tip, -hnR * 0.2), bw, 0.1, 0.8); c.lineWidth = mn(1.1); c.strokeStyle = C.under; c.stroke(p); c.fillStyle = lz_mix(C.horn, C.top, 0.3); c.fill(p); dark(p, C.hornLo, 1.2, 0.4); rimL(p, 0.8, 0.8); });
  // gonflement du sinus autour de l'œil + rougeur
  const eyeL = [3.8, -4.0];
  if (bulge > 0.02) {
    const br = 2.4 + 2.7 * bulge, ex0 = eyeL[0] + 0.1, ey0 = eyeL[1] - 0.2, dome = lz_ell(ex0, ey0, br * 1.1, br * 0.98, 0.1), domeIn = lz_ell(ex0 + 0.2, ey0 - 0.2, br * 0.78, br * 0.68, 0.1);
    c.fillStyle = lz_mix(C.top, '#d73442', 0.16 + 0.3 * bulge); c.fill(dome);
    c.lineWidth = mn(0.8); c.strokeStyle = lz_mix('#a81c2e', '#d73442', 0.3); c.globalAlpha = clamp(bulge * 1.4) * 0.8; c.stroke(dome); c.globalAlpha = 1;
    c.fillStyle = lz_mix(C.top, '#f2625a', 0.18 + 0.25 * bulge); c.fill(domeIn);
    dark(dome, '#a81c2e', 1.4, 0.7); lite(dome, '#ff9a86', 1.0 + 0.6 * bulge, 0.5, 0.75); rimL(dome, 0.8, 0.7);
  }
  c.restore();

  layerEnd({ outline: C.out });

  // ── détails nets en pixels (écran) : œil, narine, bouche ──
  L.setTransform(1, 0, 0, 1, 0, 0);
  const eS = Ts(eyeL[0], eyeL[1]), er = Math.max(1, Math.round(2.2 * s)), px0 = Math.round(eS[0]), py0 = Math.round(eS[1]);
  const eyeCol = lz_mix('#12100c', '#48291a', camo * 0.5);
  if (eyeOpen > 0.3) {
    const lid = bulge > 0.4 ? 0.55 : 1;                                   // l'œil se plisse quand le sinus gonfle
    disc(px0, py0, er + (s > 0.9 ? 1 : 0), C.out); disc(px0, py0, er, lz_mix(AM[6], '#48291a', 0.35)); disc(px0, py0, Math.max(1, er - 1), eyeCol);
    if (er >= 2) px(px0 + fl, py0 - 1, WH[2]);
    if (lid < 1 || eyeOpen < 0.75) { const cover = Math.round((1 - Math.min(lid, eyeOpen)) * (er + 1)); R(px0 - er - 1, py0 - er - 1, er * 2 + 3, cover, lz_mix(C.top, C.rust, 0.3)); R(px0 - er - 1, py0 - er - 1 + cover, er * 2 + 3, 1, C.out); }
  } else { lineP(px0 - er, py0, px0 + er, py0, C.out, 1); px(px0, py0 + 1, C.under); }
  const nS = Ts(11.8, -2.2); px(Math.round(nS[0]), Math.round(nS[1]), C.out);
  if (s >= 0.7) { const a = Ts(12.8, 1.1), b = Ts(1.5, 3.0); lineP(a[0], a[1], b[0], b[1], lz_mix(C.out, C.under, 0.3), 1); }

  return { T: Tb, Th: Ts, eye: eS, head: Ts(6, -2), mouth: Ts(13, 1), crown: Ts(-16, -16), bodyTop: Tb(cT[0], cT[1]), tail: Tb(-41, 1), w: 105 * s, bulge };
}

// ───────────────────────── le coyote ─────────────────────────
const LZ_CPOSE = {
  //            amplitude durée d'appui  Hz   levée  affaissement  cou/tête  oreilles  queue(0 pendante … 1 rentrée)
  trot: { amp: 14, duty: 0.55, freq: 2.2, lift: 9, cF: 0, cR: 0, hd: 0.12, ear: 0.0, tl: 0.15, mouth: 0, D: 51 },
  stalk: { amp: 8, duty: 0.74, freq: 1.15, lift: 5.5, cF: 6, cR: 2, hd: 0.8, ear: 0.0, tl: 0.35, mouth: 0, D: 21.6 },
  sniff: { amp: 0, duty: 0.6, freq: 0, lift: 0, cF: 9, cR: 3, hd: 1.0, ear: 0.0, tl: 0.3, mouth: 0, D: 1 },
  hit: { amp: 0, duty: 0.6, freq: 0, lift: 0, cF: -2, cR: 7, hd: -0.35, ear: 0.95, tl: 1.0, mouth: 0.22, D: 1 },
  disgust: { amp: 0, duty: 0.6, freq: 0, lift: 0, cF: 5, cR: 3, hd: 0.55, ear: 0.6, tl: 0.7, mouth: 0.6, D: 1 },
  trotOff: { amp: 12, duty: 0.58, freq: 1.9, lift: 8, cF: 1, cR: 1, hd: 0.5, ear: 0.5, tl: 0.85, mouth: 0, D: 41.4 },
};
// marche du coyote : { ph (cycles), x (distance en px à s = 1) } ; cx = x0 + (flip ? −1 : 1) × x × s évite que les pieds glissent
function lz_cGait(t, o = {}) { const Q = LZ_CPOSE[o.pose || 'trot'] || LZ_CPOSE.trot, ph = (t - (o.t0 || 0)) * Q.freq * (o.speed ?? 1); return { ph, x: ph * Q.D, freq: Q.freq }; }
// os à deux segments : renvoie l'articulation intermédiaire (bend ±1 : de quel côté elle plie)
function lz_ik(a, b, l1, l2, bend) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.max(0.001, Math.min(Math.hypot(dx, dy), l1 + l2 - 0.05)), k = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - k * k)), ux = dx / Math.hypot(dx, dy || 0.001), uy = dy / Math.hypot(dx, dy || 0.001);
  return [a[0] + ux * k - uy * h * bend, a[1] + uy * k + ux * h * bend];
}

function lz_coyote(cx, cy, s, t, o = {}) {
  const pose = o.pose || 'trot', Q = { ...(LZ_CPOSE[pose] || LZ_CPOSE.trot) }, fl = o.flip ? -1 : 1, rimK = clamp(o.rim ?? 1), shK = clamp(o.shadow ?? 1), seed = o.seed ?? 5;
  const envName = o.env || 'desertDusk', E = envName === 'none' ? { light: 1, rim: '#fff2c4', shadow: '#2e1a56', lit: '#ffc84a' } : fl_env({ env: envName, light: o.light });
  const lightX = o.light ?? E.light ?? 1, ll = lz_norm([lightX * fl * 0.9, -0.5]), tt = t + seed * 1.3;
  const u = t - (o.t0 || 0);
  // ── amplitudes dynamiques ──
  let hit = o.hit != null ? clamp(o.hit) : (pose === 'hit' ? (o.t0 != null ? (u < 0 ? 0 : u < 0.07 ? sm(u / 0.07) : 0.45 + 0.55 * Math.exp(-(u - 0.07) / 0.45)) : 1) : 0);
  const shake = clamp(o.shake ?? (pose === 'disgust' ? 1 : 0)), headDown = o.headDown != null ? o.headDown : Q.hd;
  const mouth = clamp(o.mouth ?? Q.mouth), tongue = clamp(o.tongue ?? (pose === 'disgust' ? 1 : 0)), wrinkle = clamp(o.wrinkle ?? (pose === 'disgust' ? 1 : 0));
  const G = lz_cGait(t, { pose, t0: o.t0 }), ph = o.ph != null ? o.ph : G.ph, moving = Q.amp > 0;
  if (moving && o.speed === 0) Q.amp = 0;
  const hd = lerp(headDown, -0.35, hit * 0.9), earB = clamp(Q.ear + hit * 0.6 + (pose === 'disgust' ? 0 : 0)), tl = clamp(Q.tl + hit * 0.4);
  const cF = lerp(Q.cF, -2.5, hit), cR = lerp(Q.cR, 8, hit);
  const bob = moving ? -Math.abs(Math.sin(Math.PI * ph * 2)) * 1.3 : Math.sin(tt * 1.7) * 0.18;
  const recoilX = -5 * hit, ysh = x => lerp(cR, cF, clamp((x + 38) / 72)) + bob + (hit ? -1.2 * hit : 0);
  // ── couleurs ──
  const hiTint = E.lit, shTint = E.shadow, tint = h => lz_mix(lz_mix(h, shTint, 0.1), hiTint, 0.06);
  const C = {
    back: tint('#6a5b4c'), body: tint('#9d8869'), hi: tint('#d3bf9a'), lo: lz_mix('#5a4a3e', shTint, 0.3), belly: tint('#eadcc0'), leg: tint('#b86a30'), legLo: lz_mix('#8a4a22', shTint, 0.25), ear: tint('#a85e2c'), earIn: tint('#ecd0ac'),
    dark: '#1d120c', nose: '#17110d', tip: '#17110d', tailMid: tint('#85735d'), rim: E.rim || AM[9], out: o.outline || '#1d120c', farK: 0.28,
  };
  const far = h => lz_mix(h, lz_mix(shTint, '#2a1a1a', 0.3), C.farK);
  // ── points du cou et de la tête ──
  const N0 = [24 + recoilX, -52 + ysh(24)], LN = 21, an = lerp(-0.17, 1.08, clamp((hd + 0.35) / 1.35)) , ah = lerp(0.14, 1.22, clamp((hd + 0.35) / 1.35));
  const shk = shake * 0.3 * Math.sin(TAU * 6.4 * tt) * (pose === 'disgust' ? 1 : 1) + (shake > 0 ? 0.06 * Math.sin(TAU * 3.1 * tt) * shake : 0);
  const headAt = (dt) => { const th = shake * 0.3 * Math.sin(TAU * 6.4 * (tt - dt)); const ang = an + th * 0.7, hx = N0[0] + LN * Math.cos(ang), hy = N0[1] + LN * Math.sin(ang); return { H: [hx, hy], a: ah + th * 1.1 }; };
  const hdn = headAt(0), H = hdn.H, aH = hdn.a, hc = Math.cos(aH), hs = Math.sin(aH);
  const sniffK = pose === 'sniff' ? 1 : 0, sniffBob = sniffK * (Math.sin(TAU * 5.5 * tt) * 0.8 * (0.5 + 0.5 * Math.sin(TAU * 0.9 * tt)));
  const Hs = [H[0], H[1] + sniffBob];
  const Th = (x, y) => [Hs[0] + x * hc - y * hs, Hs[1] + x * hs + y * hc];       // tête → corps
  const Tb = (x, y) => [cx + fl * s * x, cy + s * y];
  const Ts = (x, y) => Tb(...Th(x, y));
  const ex = 100 * s + 10; lz_BB = [Math.max(0, Math.floor(cx - ex)), Math.max(0, Math.floor(cy - 100 * s)), Math.min(LW, Math.ceil(cx + ex)), Math.min(LH, Math.ceil(cy + 12 * s + 6))];
  if (shK > 0) { const a = 0.5 * shK; if (typeof k_shadow === 'function') k_shadow(cx - lightX * 6 * s, cy + 1 * s, 58 * s, 5.5 * s, a, { col: '40,16,52' }); else ell(cx, cy, 58 * s, 5 * s, 'rgba(20,8,30,0.4)'); }

  layerBegin();
  const c = Y; c.setTransform(s * fl, 0, 0, s, cx, cy); c.lineJoin = 'round';
  const { mn, bl, dark, lite, rimL, halo } = lz_tools(c, s, ll, C.rim, rimK);
  const rnd = rng(seed * 131 + 7);
  // ── pattes ──
  const foot = (x0, phi) => {
    if (!moving) return { x: x0, y: 0, sw: 0 };
    const uu = (((ph + phi) % 1) + 1) % 1, A = Q.amp, d = Q.duty;
    if (uu < d) return { x: x0 + A * (1 - 2 * uu / d), y: 0, sw: 0 };
    const q = (uu - d) / (1 - d), e = eio(q), l = Math.pow(Math.sin(Math.PI * q), 0.85); return { x: x0 + A * (-1 + 2 * e), y: -Q.lift * l, sw: l };
  };
  const hitK = hit, fwd = hitK * 3;                                                // au sursaut les pattes avant se plantent en avant
  const fN = foot(22 + fwd, 0), fF = foot(25 + fwd, 0.5), hN = foot(-27, 0.5), hF = foot(-24, 0);
  const sF = [20 + recoilX * 0.6, -41 + ysh(20)], sH = [-25 + recoilX, -41 + ysh(-25)];
  const pawCol = C.legLo;
  const frontLeg = (fp, col, colLo, farSide) => {
    const P0 = [fp.x, fp.y - 0.5], W = [fp.x - 1.4 - 2.2 * fp.sw, fp.y - 8.5 - 1.5 * fp.sw], Sh = [sF[0] + (farSide ? 2.5 : 0), sF[1] + (farSide ? 1 : 0)], El = lz_ik(Sh, W, 17.2, 17.4, -1);
    const p = polyPath(limb([Sh, El, W, P0], [9.5, 7.2, 4.6, 4.6])); if (!farSide) halo(p, C.dark, 1.1);
    c.fillStyle = colLo; c.fill(p); lite(p, col, 2.6, 0.7); dark(p, farSide ? far(C.legLo) : C.legLo, 2.0, 0.6);
    const paw = lz_ell(fp.x + 2.4, fp.y - 1.0, 5.4, 2.7, -0.08 * (1 + fp.sw)); c.fillStyle = farSide ? far(C.legLo) : lz_mix(C.legLo, C.dark, 0.25); c.fill(paw); if (!farSide) { lite(paw, col, 0.8, 0.3); halo(paw, C.dark, 1.0); }
    return p;
  };
  const hindLeg = (fp, col, colLo, farSide) => {
    const Hk = [fp.x - 2.6 - 3 * fp.sw, fp.y - 11 - 1.5 * fp.sw], Hp = [sH[0] + (farSide ? 1.5 : 0), sH[1] + (farSide ? 1 : 0)], St = lz_ik(Hp, Hk, 20, 20.5, 1), P0 = [fp.x, fp.y - 0.5];
    const thigh = polyPath(limb([Hp, [(Hp[0] + St[0]) / 2 - 1.5, (Hp[1] + St[1]) / 2], St], [farSide ? 13 : 16, 12.5, 8])), shank = polyPath(limb([St, Hk, [Hk[0] + 1.2, Hk[1] + 5.5], P0], [7.6, 5.0, 4.4, 4.4]));
    if (!farSide) { halo(shank, C.dark, 1.1); }
    c.fillStyle = colLo; c.fill(shank); lite(shank, col, 2.0, 0.6); dark(shank, farSide ? far(C.legLo) : C.legLo, 1.8, 0.6);
    c.fillStyle = farSide ? far(C.body) : C.body; c.fill(thigh); if (!farSide) { halo(thigh, C.dark, 1.1); c.fillStyle = C.body; c.fill(thigh); lite(thigh, C.hi, 3.2, 1.0); dark(thigh, C.lo, 3.4, 1.2); rimL(thigh, 0.9, 0.9); }
    const paw = lz_ell(fp.x + 2.0, fp.y - 1.0, 5.0, 2.6, -0.06 * (1 + fp.sw)); c.fillStyle = farSide ? far(C.legLo) : lz_mix(C.legLo, C.dark, 0.25); c.fill(paw); if (!farSide) { lite(paw, col, 0.8, 0.3); halo(paw, C.dark, 1.0); }
  };
  // pattes lointaines (plus sombres)
  hindLeg(hF, far(C.leg), far(C.legLo), true);
  frontLeg(fF, far(C.leg), far(C.legLo), true);

  // ── queue : touffue, pendante, bout noir ──
  { const base = [-37 + recoilX, -49 + ysh(-37)], ts = tl, wag = Math.sin(TAU * (moving ? Q.freq : 0.7) * tt + 1.2) * (moving ? 2.4 : 1.2) * (1 - 0.7 * tl);
    const ang0 = lerp(2.6, 1.2, ts), L = 34;                                       // angle de départ (rad, 0 = vers la droite, π/2 = vers le bas) : pendante vers l'arrière et le bas
    const pts = [], ws = []; let ang = ang0 + wag * 0.03;
    for (let i = 0; i <= 8; i++) { const f = i / 8; pts.push(i ? [pts[i - 1][0] + Math.cos(ang) * L / 8, pts[i - 1][1] + Math.sin(ang) * L / 8] : base); ang += (1.57 - ang) * 0.1 + wag * 0.004 * (i + 1) * 0.5; ws.push(8 + 8.4 * Math.sin(Math.PI * Math.min(1, f * 0.95 + 0.1)) - 3.4 * f * f); }
    const poly = lz_fur(pts, ws, 1.7, seed, 2), tp = polyPath(poly);
    halo(tp, C.dark, 1.2); c.fillStyle = C.tailMid; c.fill(tp);
    c.save(); c.clip(tp); c.fillStyle = C.back; c.beginPath(); { const q0 = pts[1], q1 = pts[5]; c.moveTo(q0[0] - 6, q0[1] - 3); c.lineTo(q1[0] - 1, q1[1] - 5); c.lineTo(q1[0] + 1, q1[1] + 5); c.lineTo(q0[0] + 7, q0[1] + 2); c.closePath(); } c.globalAlpha = 0.5; c.fill(); c.globalAlpha = 1;
    c.fillStyle = C.tip; c.beginPath(); { const q = pts[6]; const nx = Math.cos(ang0 + 1.57) , ny = Math.sin(ang0 + 1.57); c.arc(pts[8][0], pts[8][1], 12, 0, TAU); c.rect(pts[6][0] - 20, pts[6][1] - 1, 0, 0); } c.fill(); c.restore();
    // bout noir : région au-delà du 6e point
    c.save(); c.clip(tp); c.fillStyle = C.tip; { const q = pts[6], q2 = pts[7], dx = pts[8][0] - q[0], dy = pts[8][1] - q[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; c.beginPath(); c.moveTo(q[0] + nx * 14, q[1] + ny * 14); c.lineTo(q[0] - nx * 14, q[1] - ny * 14); c.lineTo(pts[8][0] - nx * 14 + dx * 2, pts[8][1] - ny * 14 + dy * 2); c.lineTo(pts[8][0] + nx * 14 + dx * 2, pts[8][1] + ny * 14 + dy * 2); c.closePath(); c.fill(); } c.restore();
    dark(tp, C.lo, 2.6, 1.0); lite(tp, C.hi, 2.2, 0.8, 0.8); rimL(tp, 0.9, 0.85); }

  // ── tronc : dos, ventre clair, selle sombre ──
  const Y0 = x => ysh(x), R = [recoilX, 0];
  const tpts = [[25, -58 + Y0(25)], [14, -59.3 + Y0(14)], [2, -58.4 + Y0(2)], [-10, -56.8 + Y0(-10)], [-22, -57.2 + Y0(-22)], [-32, -55.5 + Y0(-32)], [-38.5, -50 + Y0(-38)], [-39, -43.5 + Y0(-38)], [-35, -38 + Y0(-35)], [-26, -35 + Y0(-26)], [-14, -34.2 + Y0(-14)], [-2, -34.6 + Y0(-2)], [8, -32.4 + Y0(8)], [16, -28.6 + Y0(16)], [24, -28.6 + Y0(24)], [30, -33 + Y0(30)], [33.5, -42 + Y0(32)], [33, -51 + Y0(32)], [31, -57 + Y0(30)]].map(p => [p[0] + recoilX * Math.max(0, (p[0] + 38) / 72), p[1]]);
  const torso = lz_smooth(tpts);
  halo(torso, C.dark, 1.2); c.fillStyle = C.body; c.fill(torso);
  c.save(); c.clip(torso);
  // ventre et poitrail clairs, selle sombre sur le dos
  { const g = c.createLinearGradient(0, -60 + Y0(0), 0, -30 + Y0(0)); g.addColorStop(0, C.back); g.addColorStop(0.32, C.body); g.addColorStop(0.62, C.body); g.addColorStop(0.86, lz_mix(C.body, C.belly, 0.6)); g.addColorStop(1, C.belly); c.fillStyle = g; c.fillRect(-45, -70, 90, 50); }
  // frimas : poils clairs sur le dos
  for (let i = 0; i < 95; i++) { const x = lerp(-36, 30, rnd()), y = -59 + Y0(x) + rnd() * 14; c.fillStyle = rnd() < 0.6 ? C.hi : C.back; c.fillRect(x, y, mn(0.9), mn(0.9)); }
  c.restore();
  dark(torso, C.lo, 4.2, 1.6); lite(torso, C.hi, 2.8, 1.0, 0.85); rimL(torso, 1.0);
  // cou : tronc épais vers la tête
  { const Nb = [20 + recoilX * 0.7, -50 + ysh(20)], nk = [Nb, [lerp(Nb[0], H[0], 0.5), lerp(Nb[1], H[1], 0.5) + 1.5], [H[0] - 2 * hc, H[1] - 2 * hs]], nw = [19, 14.5, 11];
    const poly = lz_fur(nk, nw, 1.8, seed + 2), np = polyPath(poly);
    halo(np, C.dark, 1.1); c.fillStyle = C.body; c.fill(np);
    c.save(); c.clip(np); const g = c.createLinearGradient(Nb[0], Nb[1] - 10, Nb[0], Nb[1] + 10); g.addColorStop(0, C.back); g.addColorStop(0.45, C.body); g.addColorStop(1, lz_mix(C.body, C.belly, 0.7)); c.fillStyle = g; c.fillRect(Nb[0] - 15, Nb[1] - 20, 50, 40); c.restore();
    dark(np, C.lo, 3.0, 1.2); lite(np, C.hi, 2.2, 0.8, 0.85); rimL(np, 0.9, 0.9); }

  // ── pattes proches ──
  hindLeg(hN, C.leg, C.legLo, false);
  frontLeg(fN, C.leg, C.legLo, false);
  // ── oreille lointaine ──
  const eAng = -earB * 1.15, rotEar = (pts, pivot, a) => pts.map(p => { const dx = p[0] - pivot[0], dy = p[1] - pivot[1], cs = Math.cos(a), sn = Math.sin(a); return [pivot[0] + dx * cs - dy * sn, pivot[1] + dx * sn + dy * cs]; });
  c.save(); c.translate(Hs[0], Hs[1]); c.rotate(aH);
  { const pv = [-3, -8], ear = rotEar([[-8, -6], [-9.6, -17], [-6.4, -28.5], [-1.2, -19], [1, -7]], pv, eAng * 0.9 + 0.12), ep = lz_smooth(ear);
    halo(ep, C.dark, 1.0); c.fillStyle = far(C.ear); c.fill(ep); dark(ep, far(C.lo), 2, 0.6); }
  // ── tête : crâne et museau, mâchoire inférieure ──
  const upper = lz_smooth([[-8, -6], [-3, -9.2], [3.5, -8.6], [8, -5.8], [13.5, -4.6], [19.5, -3.6], [24.4, -2.9], [27, -1.0], [26.6, 1.3], [22, 2.0], [16, 2.5], [10, 3.0], [4, 4.0], [-3, 5.2], [-9, 3.4], [-10.8, -1]]);
  const jawA = mouth * 0.62, jc = Math.cos(jawA), jsn = Math.sin(jawA), jh = [3, 4.6];
  const jaw0 = [[3, 3.6], [10, 3.0], [16, 2.7], [22, 2.4], [25.2, 3.0], [24, 4.8], [19, 6.2], [12, 7.3], [6, 8.8], [0, 9.2], [-4, 6.6]];
  const jaw = lz_smooth(jaw0.map(p => { const dx = p[0] - jh[0], dy = p[1] - jh[1]; return [jh[0] + dx * jc - dy * jsn, jh[1] + dx * jsn + dy * jc]; }));
  if (mouth > 0.08) {                                                            // intérieur de la gueule
    const inn = polyPath([[3, 3.4], [10, 3.0], [16, 2.6], [22, 2.3], ...[[24, 3.8], [18, 6], [10, 7.2], [4, 8]].map(p => { const dx = p[0] - jh[0], dy = p[1] - jh[1]; return [jh[0] + dx * jc - dy * jsn, jh[1] + dx * jsn + dy * jc]; })]);
    c.fillStyle = '#5a0c18'; c.fill(inn);
  }
  // langue
  if (tongue > 0.05) {
    const gl = [Math.cos(-aH) * 0 - Math.sin(-aH) * 1, Math.sin(-aH) * 0 + Math.cos(-aH) * 1], T0 = (() => { const p = [20, 4.6]; return [jh[0] + (p[0] - jh[0]) * jc - (p[1] - jh[1]) * jsn, jh[1] + (p[0] - jh[0]) * jsn + (p[1] - jh[1]) * jc]; })();
    const Lg = 9 + 8 * tongue, pts = [], ws = [], sw = Math.sin(TAU * 3.2 * tt) * 1.6 * (shake > 0 ? 1.6 : 0.6);
    for (let i = 0; i <= 6; i++) { const f = i / 6; pts.push([T0[0] + 6.5 * f * (1 - 0.3 * f) * tongue + gl[0] * Lg * 0.62 * f * f + sw * f * f, T0[1] + 2 * f + gl[1] * Lg * 0.62 * f * f + Math.sin(f * 3 + tt * 4) * 0.4]); ws.push(6.6 - 2.0 * f * f); }
    const tg = polyPath(limb(pts, ws)); halo(tg, C.dark, 1.0); c.fillStyle = '#f2625a'; c.fill(tg);
    c.strokeStyle = '#d73442'; c.lineWidth = mn(0.8); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke();
    dark(tg, '#a81c2e', 1.2, 0.5); lite(tg, '#ff9a86', 1.0, 0.4, 0.8);
  }
  halo(jaw, C.dark, 1.1); c.fillStyle = lz_mix(C.belly, C.body, 0.15); c.fill(jaw); dark(jaw, lz_mix(C.belly, C.lo, 0.5), 1.8, 0.7); lite(jaw, C.belly, 1.0, 0.4, 0.8);
  halo(upper, C.dark, 1.1); c.fillStyle = C.body; c.fill(upper);
  c.save(); c.clip(upper);
  { const g = c.createLinearGradient(0, -9, 0, 5); g.addColorStop(0, C.back); g.addColorStop(0.42, lz_mix(C.body, C.leg, 0.25)); g.addColorStop(0.8, C.body); g.addColorStop(1, lz_mix(C.body, C.belly, 0.7)); c.fillStyle = g; c.fillRect(-12, -10, 42, 17); }
  c.restore();
  dark(upper, C.lo, 2.2, 0.9); lite(upper, C.hi, 1.5, 0.6, 0.85); rimL(upper, 0.9, 0.95);
  // joues touffues
  for (let i = 0; i < 3; i++) { const q = lz_tri([-3 - i * 2.4, 3.5 + i * 1.2], [-9 - i * 1.5, 1.5 + i * 1.8], [-13 - i * 1.4, 7 + i * 1.4]); c.fillStyle = i ? C.body : lz_mix(C.body, C.belly, 0.5); c.fill(q); }
  // oreille proche
  { const pv = [-2, -8], ear = rotEar([[-7, -7], [-8.5, -19], [-4.8, -31], [1.2, -21], [3.5, -8]], pv, eAng), ep = lz_smooth(ear), inn = lz_smooth(rotEar([[-5.6, -9], [-6.2, -18], [-4.0, -26.2], [-0.4, -18.8], [0.8, -9.5]], pv, eAng));
    halo(ep, C.dark, 1.0); c.fillStyle = C.ear; c.fill(ep); c.save(); c.clip(ep); c.fillStyle = C.earIn; c.fill(inn); c.restore(); c.save(); c.clip(inn); c.fillStyle = lz_mix(C.earIn, C.leg, 0.3); c.fillRect(-12, -14, 16, 6); c.restore();
    dark(ep, C.lo, 2.0, 0.7); lite(ep, lz_mix(C.ear, C.hi, 0.5), 1.0, 0.4, 0.8); rimL(ep, 0.9, 0.9); }
  // truffe
  { const nose = lz_ell(26.4, -0.6, 2.7, 2.3, 0.2); c.fillStyle = C.nose; c.fill(nose); lite(nose, '#5a4a52', 0.8, 0.3, 0.7); }
  c.restore();
  // poitrail : touffes sous le cou
  { const pb = [[22 + recoilX, -36 + ysh(22)], [28 + recoilX, -34 + ysh(28)], [31 + recoilX, -39 + ysh(30)]]; for (let i = 0; i < 4; i++) { const x0 = 18 + i * 3.6 + recoilX, y0 = -29 + ysh(18 + i * 3.6), q = lz_tri([x0 - 1.8, y0 - 1.5], [x0 + 1.8, y0 - 1.5], [x0 + 0.4, y0 + 3.6 + (i % 2) * 1.4]); c.fillStyle = lz_mix(C.body, C.belly, 0.75); c.fill(q); } }

  layerEnd({ outline: C.out });

  // ── détails nets (pixels écran) : œil, narine, bave, traînées ──
  L.setTransform(1, 0, 0, 1, 0, 0);
  const eS = Ts(12.8, -3.4), ex0 = Math.round(eS[0]), ey0 = Math.round(eS[1]), er = Math.max(1, Math.round(1.7 * s)), squint = clamp(hit * 1.6 + (pose === 'disgust' ? 0.9 : 0));
  const eyeOpen = o.eye != null ? clamp(o.eye) : 1 - squint, blinkT = (tt * 0.31) % 1, blink = blinkT > 0.96 ? Math.sin((blinkT - 0.96) / 0.04 * Math.PI) : 0;
  const dirx = fl * Math.cos(aH), diry = Math.sin(aH);
  if (eyeOpen * (1 - blink) > 0.45) {
    disc(ex0, ey0, er, lz_mix(AM[6], '#48291a', 0.3)); disc(ex0, ey0, Math.max(1, er - 1), '#17110d');
    if (er >= 2) px(ex0 + fl * 0, ey0 - 1, WH[2]);
    const lx = Math.round(ex0 + dirx * (er + 1)), ly = Math.round(ey0 + diry * (er + 1)); lineP(ex0 + dirx * er, ey0 + diry * er, lx + dirx * 2, ly + diry * 2, '#17110d', 1);       // trait sombre vers le museau
    if (s >= 0.6) { px(ex0 - fl * er, ey0 - er, C.dark); }
  } else {
    const a = Math.round(er * 1.2); lineP(ex0 - a * fl, ey0 + 1 - Math.round(hit), ex0 + a * fl, ey0 + (squint > 0.5 ? 0 : 1), C.dark, 1);
    if (squint > 0.5) { lineP(ex0 - a * fl, ey0 - 2, ex0, ey0, C.dark, 1); }
  }
  // plis du nez (dégoût)
  if (wrinkle > 0.05 && s >= 0.5) for (let k = 0; k < 3; k++) { const a = Ts(17 + k * 2.6, -3.2 + k * 0.2), b = Ts(18.2 + k * 2.6, -0.4 + k * 0.1); lineP(a[0], a[1], b[0], b[1], C.lo, 1); }
  // bave : fil qui s'allonge sous la langue puis goutte qui tombe
  if (tongue > 0.3 && o.drool !== false) {
    const jj = [3, 4.6], T0 = (() => { const p = [27, 5]; return [jj[0] + (p[0] - jj[0]) * jc - (p[1] - jj[1]) * jsn, jj[1] + (p[0] - jj[0]) * jsn + (p[1] - jj[1]) * jc]; })(), a0 = Ts(T0[0] - 6, T0[1] + 6);
    const per = 1.4, k = ((tt / per) % 1 + 1) % 1, len = Math.round((2 + 10 * Math.min(1, k * 1.15)) * Math.max(1, s)), x = Math.round(a0[0]), y = Math.round(a0[1]) + 3;
    for (let i = 0; i < len; i++) px(x + Math.round(Math.sin(i * 0.7 + tt * 5) * 0.4), y + i, i % 3 === 2 ? ST[6] : WH[2]);
    disc(x, y + len + 1, Math.max(1, Math.round(1.1 * s)), WH[2]); px(x - 1, y + len, WH[3]);
    if (k > 0.82) { const f = (k - 0.82) / 0.18; px(x, y + len + 2 + Math.round(f * 12 * s), WH[2]); }
  }
  // traînées de secouement : arcs clairs derrière la tête
  if (shake > 0.15) {
    const th0 = a => shake * 0.3 * Math.sin(TAU * 6.4 * (tt - a)), now = th0(0), prev = th0(0.045), prev2 = th0(0.09);
    for (const rr of [16, 23, 30, 36]) for (const [ra, rb, col] of [[prev, now, WH[2]], [prev2, prev, ST[6]]]) {
      const n = 7; for (let i = 0; i < n; i++) { const f = i / n, aa = lerp(ra, rb, f) * 0.7 + an, p = Tb(N0[0] + (LN + rr - 18) * Math.cos(aa) + 0, N0[1] + (LN + rr - 18) * Math.sin(aa)); if ((i + rr) % 2 === 0) px(p[0], p[1], col); }
    }
  }
  return { T: Tb, Th: Ts, nose: Ts(27, -0.6), eye: eS, muzzle: Ts(20, -3.4), head: Ts(8, -1), ear: Ts(-3, -26), tail: Tb(-45, -20), mouth: Ts(24, 2.6), w: 150 * s, hit };
}

// icône de case du carnet (17 × 17, contour sombre, couleurs exactes) : définie plus bas
ICONES[1] = function (cx, cy) { /* remplacée en fin de fichier */ };
