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

// ───────────────────────── poses du lézard ─────────────────────────
const LZ_POSE = {
  //          épaisseur  largeur  profondeur  tête(y, x)    tangage   piquants  cornes  pattes   respiration
  rest: { bh: 8.5, bw: 1.0, bd: 1.0, hy: 0, hx: 0, hp: 0.05, sp: 0.25, hn: 0.0, lg: 0.0, br: 1.0 },
  alert: { bh: 9.5, bw: 0.98, bd: 1.0, hy: -4.5, hx: 1.5, hp: -0.16, sp: 0.35, hn: 0.3, lg: 0.0, br: 1.4 },
  walk: { bh: 8.5, bw: 1.0, bd: 1.0, hy: -1.5, hx: 1, hp: -0.04, sp: 0.3, hn: 0.1, lg: 0.0, br: 0.8 },
  flat: { bh: 4.8, bw: 1.07, bd: 1.06, hy: 2.5, hx: 1.5, hp: 0.1, sp: 0.15, hn: -0.25, lg: 1.0, br: 0.7 },
  puff: { bh: 15, bw: 1.12, bd: 1.14, hy: -1, hx: -2, hp: -0.02, sp: 1.0, hn: 0.55, lg: 0.0, br: 0.4 },
  squirt: { bh: 9, bw: 1.0, bd: 1.0, hy: 3.5, hx: 4.5, hp: 0.28, sp: 0.8, hn: 0.2, lg: 0.0, br: 0.5 },
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
    top: M(SK[3]), topHi: lz_mix(M(SK[4]), hiTint, 0.28), topLo: lz_mix(M(SK[2]), shTint, 0.22), rust: M(OC[3], 0.85), rustD: M(OC[2], 0.8),
    wall: M(SK[2]), wallLo: lz_mix(M(SK[1]), shTint, 0.3), under: M(SK[1]), spot: M(WO[2], 1.15), spotHi: M(AM[9], 0.9), cream: M(AM[10], 1.1),
    horn: M(SK[3]), hornHi: M(AM[10]), hornLo: lz_mix(M(SK[1]), shTint, 0.2), tipD: M(WO[3]), rim: E.rim || AM[9], out: o.outline || lz_mix('#1d120c', '#48291a', camo),
  };
  const tt = t + seed * 1.7;
  // ── respiration, clignement, marche ──
  const brA = 0.045 * P.br, breath = Math.sin(TAU * 0.78 * tt), breath2 = Math.sin(TAU * 0.78 * tt - 0.7);
  const walkOn = P.walk > 0.01, G = walkOn ? (o.ph != null ? { ph: o.ph, go: o.go ?? 1 } : lz_gait(t)) : { ph: 0.15, go: 0 };
  const blinkT = (tt * 0.37) % 1, blink = blinkT > 0.955 ? Math.sin((blinkT - 0.955) / 0.045 * Math.PI) : 0;
  const eyeOpen = o.eye != null ? clamp(o.eye) : 1 - blink;
  const bulge = clamp(o.bulge ?? 0);
  // ── dimensions ──
  const bh = P.bh * (1 + brA * breath), W = 29 * P.bw * (1 + 0.012 * breath), Dp = 14.5 * P.bd, bob = walkOn ? Math.sin(TAU * G.ph * 2) * 0.45 * G.go : 0;
  const cT = [-2, -bh - 0.4 + bob], rxT = W - 2.2, ryT = Dp - 1.3;               // dessus (ellipse), le flanc est l'ellipse au sol
  const sway = walkOn ? Math.sin(TAU * G.ph) * G.go : 0, idle = Math.sin(tt * 0.9) * 0.5 + Math.sin(tt * 2.3 + 1) * 0.25;
  const H0 = [36 + P.hx, -7 + P.hy + bob + 0.35 * breath2 - (walkOn ? 0.7 * sway * 0 : 0)], hp = P.hp + (walkOn ? 0.03 * sway : 0) + 0.012 * idle;
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
  const mn = u => Math.max(u, 1.05 / s), bl = u => Math.max(0.5, u * s);
  const dark = (path, col, off, blur = 1.1) => lz_cres(c, path, col, ll[0] * mn(off), ll[1] * mn(off), bl(blur));
  const lite = (path, col, off, blur = 0.7, a = 1) => lz_cres(c, path, col, -ll[0] * mn(off), -ll[1] * mn(off), bl(blur), a);
  const rimL = (path, w = 0.9, a = 1) => { if (rimK > 0) lz_cres(c, path, C.rim, -ll[0] * mn(w), -ll[1] * mn(w), 0, rimK * a); };
  const rnd = rng(seed * 977 + 11);
  const lerpP = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

  // ── pattes (4) ; la patte lointaine d'abord ──
  const leg = (sh, f, bend, w0, col, colLo, toes = 1) => {
    // os en deux segments (IK à genou/coude plié vers le bas et l'extérieur)
    const dx = f[0] - sh[0], dy = f[1] - sh[1], d = Math.hypot(dx, dy), l1 = 7.5, l2 = 7.5, dd = Math.min(d, l1 + l2 - 0.2), a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0.3, l1 * l1 - a * a));
    const ux = dx / (d || 1), uy = dy / (d || 1), kx = sh[0] + ux * a + (-uy) * h * bend, ky = sh[1] + uy * a + ux * h * bend;
    const p = polyPath(limb([sh, [kx, ky], f], [w0, w0 * 0.78, w0 * 0.62]));
    c.fillStyle = colLo; c.fill(p); lite(p, col, w0 * 0.42, 0.5); rimL(p, 0.8, 0.7);
    // pied : trois à quatre doigts courts
    const foot = lz_ell(f[0] + 1.2 * toes, f[1] + 0.3, 3.0, 1.9, 0.1); c.fillStyle = colLo; c.fill(foot); lite(foot, col, 0.9, 0.3);
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
  const nF = stance(0, 24 + 3 * spread, 9.4 + 1.5 * spread, 5.5, 0), nH = stance(1, -22 - 3 * spread, 11 + 1.5 * spread, 5.5, 0.5), fF = stance(2, 19, -11.5, 5, 0.5), fH = stance(3, -18, -9.5, 5, 0);
  const lc = lz_mix(C.top, C.wall, 0.55), lcLo = lz_mix(C.under, '#000000', 0.15);
  leg([14, -9 - bh * 0.3], [fF[0], fF[1]], -1, 5.0, lz_mix(lc, C.wallLo, 0.4), C.wallLo);
  leg([-17, -8 - bh * 0.2], [fH[0], fH[1]], -1, 5.2, lz_mix(lc, C.wallLo, 0.4), C.wallLo);

  // ── queue : courte, plate, bandée ──
  { const tl = [[-26, -3.5 + bob * 0.5], [-35, -2.5 + 0.8 * sway], [-44, -0.2 + 1.6 * sway + idle * 0.3], [-52, 2.6 + 2.4 * sway + idle * 0.6]];
    const p = polyPath(limb(tl, [12.5 * P.bd, 9.5, 6.2, 2.4])); c.fillStyle = C.wall; c.fill(p);
    c.save(); c.clip(p); c.fillStyle = C.rustD; for (const k of [0.45, 0.78]) { const q = bez(tl[0], tl[2], tl[3], k); c.beginPath(); c.ellipse(q[0], q[1], 1.3, 8, 0.25, 0, TAU); c.fill(); } c.restore();
    dark(p, lz_mix(C.wallLo, C.under, 0.3), 2.2); lite(p, C.top, 1.8, 0.8); rimL(p, 0.9); }

  // ── corps : flanc (ellipse au sol) puis dessus (ellipse surélevée) ──
  const wallP = lz_ell(-2, -bh * 0.15, W, Dp + bh * 0.15), topP = lz_ell(cT[0], cT[1], rxT, ryT);
  const silB = new Path2D(); silB.addPath(wallP); silB.addPath(topP);
  c.fillStyle = C.wall; c.fill(wallP);
  dark(wallP, C.wallLo, 4.2, 1.6);
  // frange d'écailles pointues du flanc proche (sur le bord inférieur) : triangles pâles
  const fr = P.sp, nFr = 15, fring = [];
  for (let i = 0; i < nFr; i++) {
    const phi = lerp(0.1, Math.PI - 0.1, i / (nFr - 1)), px0 = -2 + (W + 0.4) * Math.cos(phi), py0 = (Dp + bh * 0.15) * Math.sin(phi) - bh * 0.15 + 0.2;
    const nx = Math.cos(phi) / 1, ny = Math.sin(phi) * 0.9, nl = Math.hypot(nx, ny), len = 2.6 + 3.0 * fr + 0.9 * Math.sin(i * 2.3), tx = -ny / nl, ty = nx / nl, bw2 = 1.9 + 0.5 * fr;
    fring.push([[px0 + tx * bw2, py0 + ty * bw2], [px0 - tx * bw2, py0 - ty * bw2], [px0 + nx / nl * len, py0 + ny / nl * len + 0.8]]);
  }
  for (const [a, b, tip] of fring) { const p = lz_tri(a, b, tip); c.fillStyle = C.cream; c.fill(p); dark(p, lz_mix(C.horn, C.wallLo, 0.55), 1.4, 0.4); }
  // petits piquants du bord lointain (le dessus, vers le haut)
  for (let i = 0; i < 9; i++) {
    const phi = lerp(Math.PI + 0.45, TAU - 0.45, i / 8), px0 = cT[0] + rxT * Math.cos(phi), py0 = cT[1] + ryT * Math.sin(phi), len = 1.6 + 2.2 * fr, bw2 = 1.3;
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
  const spots = [[0.66, -0.52, 4.4, 2.8], [0.62, 0.55, 4.0, 2.7], [0.18, -0.6, 4.8, 3.0], [0.14, 0.62, 4.4, 3.0], [-0.3, -0.6, 4.6, 2.9], [-0.34, 0.6, 4.6, 3.0], [-0.72, -0.4, 3.4, 2.4], [-0.74, 0.42, 3.4, 2.4]];
  spots.forEach(([a, b, rx, ry], i) => {
    const x = cT[0] + rxT * a + (rnd() - 0.5) * 2, y = cT[1] + ryT * b * 0.95 + (rnd() - 0.5) * 1.2, rot = (rnd() - 0.5) * 0.7;
    c.fillStyle = C.spotHi; c.beginPath(); c.ellipse(x, y, rx + 1.0, ry + 0.9, rot, 0, TAU); c.fill();
    c.fillStyle = C.rustD; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill();
    c.fillStyle = C.spot; c.beginPath(); c.ellipse(x + 0.3, y + 0.2, rx * 0.62, ry * 0.6, rot, 0, TAU); c.fill();
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

  // ── pattes proches (devant le flanc) ──
  leg([13, -1.5], [nF[0], nF[1]], 1, 6.0, C.wall, C.wallLo);
  leg([-17, -0.5], [nH[0], nH[1]], 1, 6.4, C.wall, C.wallLo);

  // ── tête et couronne (repère de la tête : origine au centre du crâne, vers la droite) ──
  c.save(); c.translate(H0[0], H0[1]); c.rotate(hp);
  const headPts = [[-12, -7], [-6, -9.8], [1, -10.4], [7, -8.6], [12, -5.4], [15.6, -2.6], [15.6, 0.4], [12.5, 3.0], [7, 5.2], [0, 6.2], [-8, 5.8], [-13, 3.5]];
  const headP = lz_smooth(headPts);
  // cou/gorge qui relie au corps
  const neck = lz_ell(-9, -0.5, 8, 8.5); c.fillStyle = C.wall; c.fill(neck);
  c.fillStyle = C.top; c.fill(headP);
  // lèvre et gorge claires
  { const jaw = polyPath([[15.4, 0.6], [12.5, 3.2], [7, 5.4], [0, 6.4], [-8, 6], [-13, 3.7], [-8, 3.0], [0, 3.6], [8, 2.6], [13, 0.4]]); c.save(); c.clip(headP); c.fillStyle = C.cream; c.fill(jaw); c.restore(); }
  dark(headP, C.topLo, 2.6, 1.0); lite(headP, C.topHi, 1.9, 0.8, 0.9); rimL(headP, 0.9);
  // bourrelet sus-oculaire (arcade) : bosse claire au-dessus de l'œil
  { const brow = lz_ell(3.2, -8.0, 4.8, 2.5, 0.1); c.fillStyle = lz_mix(C.top, C.rust, 0.25); c.fill(brow); lite(brow, C.topHi, 1.1, 0.4, 0.9); dark(brow, C.topLo, 1.3, 0.4); rimL(brow, 0.8, 0.8); }
  // couronne : quatre dagues dont les bases se touchent ; la plus éloignée (la plus haute à l'écran) d'abord
  const hnR = P.hn, rot = (b, tip, k) => { const dx = tip[0] - b[0], dy = tip[1] - b[1], cs = Math.cos(-k), sn = Math.sin(-k); return [b[0] + dx * cs - dy * sn, b[1] + dx * sn + dy * cs]; };
  const horns = [
    [[-8.6, -9.4], [-22.5, -31], 4.4, 0.10], [[-8.2, -8.4], [-28, -25], 5.0, 0.09], [[-7.8, -6.6], [-30, -17.5], 5.0, 0.08], [[-7.2, -4.6], [-23.5, -8.5], 4.0, 0.06],
  ];
  const hornPaths = horns.map(([b, tip, bw, cv], i) => { const tp = rot(b, tip, hnR * (1 - i * 0.12)); return lz_dagger(b, tp, bw, cv); });
  hornPaths.forEach((p, i) => {
    // halo sombre qui sépare la dague du fond
    c.lineWidth = mn(1.6); c.strokeStyle = C.under; c.stroke(p);
    c.fillStyle = i < 2 ? lz_mix(C.horn, C.wall, 0.25) : C.horn; c.fill(p);
    dark(p, C.hornLo, 2.0, 0.6); lite(p, C.hornHi, 1.3, 0.5, 0.9); rimL(p, 0.9, 0.9);
  });
  // cornes temporales : trois petites pointes derrière la joue
  [[[-10.4, -0.6], [-17.5, 3.4], 2.6], [[-9.4, 2.0], [-15.5, 8.0], 2.4], [[-6.6, 3.8], [-10.5, 10.2], 2.0]].forEach(([b, tip, bw]) => { const p = lz_dagger(b, rot(b, tip, -hnR * 0.2), bw, 0.1); c.lineWidth = mn(1.2); c.strokeStyle = C.under; c.stroke(p); c.fillStyle = C.horn; c.fill(p); dark(p, C.hornLo, 1.2, 0.4); rimL(p, 0.8, 0.8); });
  // petites écailles pointues de la mâchoire
  for (let i = 0; i < 4; i++) { const x = 8 - i * 4.4, p = lz_tri([x + 1.3, 5.7 - i * 0.2], [x - 1.3, 6.1 - i * 0.2], [x - 0.9 - 0.8, 8.2 - i * 0.1]); c.fillStyle = C.cream; c.fill(p); }
  // gonflement du sinus autour de l'œil + rougeur
  const eyeL = [4.0, -4.6];
  if (bulge > 0.02) {
    const br = 2.6 + 3.6 * bulge, dome = lz_ell(eyeL[0] + 0.2, eyeL[1] - 0.6, br * 1.12, br, 0.1), domeIn = lz_ell(eyeL[0] + 0.2, eyeL[1] - 0.6, br * 0.82, br * 0.74, 0.1);
    c.fillStyle = lz_mix(C.top, '#d73442', 0.18 + 0.4 * bulge); c.fill(dome);
    c.lineWidth = mn(0.9 + 0.5 * bulge); c.strokeStyle = lz_mix('#a81c2e', '#d73442', 0.3); c.globalAlpha = clamp(bulge * 1.6); c.stroke(dome); c.globalAlpha = 1;
    c.fillStyle = lz_mix(C.top, '#f2625a', 0.2 + 0.3 * bulge); c.fill(domeIn);
    dark(dome, '#a81c2e', 1.3, 0.6); lite(dome, '#ff9a86', 1.2 + bulge, 0.5, 0.8); rimL(dome, 0.8, 0.8);
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
  const nS = Ts(14.2, -2.4); px(Math.round(nS[0]), Math.round(nS[1]), C.out);
  if (s >= 0.7) { const a = Ts(14.8, 1.2), b = Ts(2, 3.4); lineP(a[0], a[1], b[0], b[1], lz_mix(C.out, C.under, 0.3), 1); }

  return { T: Tb, Th: Ts, eye: eS, head: Ts(8, -2), mouth: Ts(15, 1), crown: Ts(-18, -20), bodyTop: Tb(cT[0], cT[1]), tail: Tb(-50, 2), w: 105 * s, bulge };
}

// icône de case du carnet (17 × 17, contour sombre, couleurs exactes) : définie plus bas
ICONES[1] = function (cx, cy) { /* remplacée en fin de fichier */ };
