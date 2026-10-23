'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_anguille_sprites.js — l'ANGUILLE ÉLECTRIQUE (Electrophorus voltai), le TÉTRA, le CAÏMAN et les décharges (segment ANGUILLE). Préfixe an_.
   (travail en cours)
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ───────────────────────── outils ─────────────────────────
const an_rgbC = {};
function an_rgb(c) { if (Array.isArray(c)) return c; return an_rgbC[c] || (an_rgbC[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]); }
const an_hex = r => '#' + r.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const an_mix = (a, b, k) => { const A = an_rgb(a), B = an_rgb(b); return [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k]; };
const an_css = (c, a = 1) => { const r = an_rgb(c); return a >= 1 ? `rgb(${r[0] | 0},${r[1] | 0},${r[2] | 0})` : `rgba(${r[0] | 0},${r[1] | 0},${r[2] | 0},${a})`; };
const an_ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function an_h(i, s = 0) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function an_snap(c) { const r = an_rgb(c); return PAL_HEX[LUT[((r[0] >> 3) << 10) | ((r[1] >> 3) << 5) | (r[2] >> 3)]]; }
const an_lt = [0.3, -0.95];                                         // direction DE la lumière dans l'eau (vient du haut, un peu de la droite)

// polygone tramé (Bayer) : même remplissage pair-impair que poly() ; dens 0..1
function an_polyDither(pts, col, dens) {
  let ymin = Infinity, ymax = -Infinity; for (const p of pts) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
  ymin = Math.max(0, Math.ceil(ymin - 0.5)); ymax = Math.min(LH - 1, Math.floor(ymax - 0.5)); L.fillStyle = col;
  for (let y = ymin; y <= ymax; y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) { const x0 = Math.ceil(xs[i] - 0.5), x1 = Math.floor(xs[i + 1] - 0.5); for (let x = x0; x <= x1; x++) if (x >= 0 && x < LW && BAYER[(y & 3) * 4 + (x & 3)] < dens) L.fillRect(x, y, 1, 1); }
  }
}

// ───────────────────────── l'anguille ─────────────────────────
const AN_L = 240;                                                  // longueur à l'échelle 1 (museau → pointe de la queue)
const AN_K = 1.3;                                                  // les stations sont plus serrées près de la tête : s_i = (i/N)^AN_K
const AN_N = 72;
// épaisseur du corps (de profil) en fraction de la longueur, de la tête à la queue
const AN_DEPTH = [[0, 0.0], [0.003, 0.032], [0.012, 0.050], [0.035, 0.062], [0.075, 0.069], [0.13, 0.073], [0.22, 0.076], [0.36, 0.077], [0.52, 0.073], [0.66, 0.062], [0.8, 0.046], [0.91, 0.029], [0.975, 0.013], [1, 0.003]];
const AN_POSE = {
  //          amp (rad) freq (Hz) lam   bend  quiver  fin (Hz)  finAmp
  swim: { amp: 0.40, freq: 1.0, lam: 0.85, bend: 0.0, quiver: 0, fin: 3.2, finAmp: 1.0 },
  cruise: { amp: 0.20, freq: 0.7, lam: 0.9, bend: 0.0, quiver: 0, fin: 2.6, finAmp: 0.9 },
  stalk: { amp: 0.10, freq: 0.5, lam: 1.0, bend: 0.0, quiver: 0, fin: 2.0, finAmp: 0.8 },
  tense: { amp: 0.05, freq: 0.8, lam: 1.0, bend: 0.9, quiver: 0.3, fin: 4.5, finAmp: 1.2 },
  zap: { amp: 0.04, freq: 0.8, lam: 1.0, bend: 1.2, quiver: 1.0, fin: 6.0, finAmp: 1.3 },
};
function an_eelGeom(t, o) {
  const A = AN_POSE[o.pose || 'swim'] || AN_POSE.swim, B = o.pose2 ? (AN_POSE[o.pose2] || A) : A, k = o.pose2 ? clamp(o.mix ?? 0) : 0, Pz = {};
  for (const key in A) Pz[key] = lerp(A[key], B[key], k);
  const amp = o.amp ?? Pz.amp, freq = o.freq ?? Pz.freq, lam = o.lam ?? Pz.lam, bend = o.bend ?? Pz.bend, quiver = o.quiver ?? Pz.quiver, ph = o.ph ?? 0;
  const N = AN_N, S = [], P = [], T = [];
  let x = 0, y = 0;
  for (let i = 0; i <= N; i++) {
    const s = Math.pow(i / N, AN_K); S.push(s);
    const env = 0.10 + 0.90 * Math.pow(s, 1.25);
    const dev = amp * env * Math.cos(TAU * (s / lam - freq * t - ph)) - bend * (s - 0.42) * (0.55 + 0.45 * s) + quiver * 0.045 * (0.3 + s) * Math.sin(TAU * (13 * t + 6 * s));
    const a = Math.PI + dev;
    T.push([Math.cos(a), Math.sin(a)]); P.push([x, y]);
    if (i < N) { const ds = (Math.pow((i + 1) / N, AN_K) - s) * AN_L; x += Math.cos(a) * ds; y += Math.sin(a) * ds; }
  }
  return { S, P, T, N, Pz, ph };
}

// ── l'anguille : (cx, cy) = museau ; s = échelle (1 : 240 px de long) ; renvoie les repères pour viser les décharges, le tétra, la bouche…
function an_eel(cx, cy, s, t, o = {}) {
  const fl = o.flip ? -1 : 1, rot = o.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot), fog = clamp(o.fog ?? 0), fogC = o.fogCol || '#1f6a74', zap = clamp(o.zap ?? 0);
  const G = an_eelGeom(t, o), { S, P, T, N, Pz } = G;
  // local → écran
  const M = (x, y) => { const lx = fl * x; return [cx + s * (lx * cr - y * sr), cy + s * (lx * sr + y * cr)]; };
  const MV = (x, y) => { const lx = fl * x; return [lx * cr - y * sr, lx * sr + y * cr]; };
  const sc = P.map(p => M(p[0], p[1]));
  const nUp = T.map(tt => { const v = MV(-tt[1], tt[0]); return v; });                     // normale vers le dos (écran, unitaire)
  const dep = S.map(sf => Math.max(0.2, tab(AN_DEPTH, sf) * AN_L * (1 + (o.puff ?? 0) * Math.sin(Math.PI * sf))));
  const hd = dep.map((d, i) => d * 0.46 * (1 + 0.16 * Math.exp(-Math.pow((S[i] - 0.055) / 0.035, 2)))), hv = dep.map(d => d * 0.54);
  const E = (i, f) => { const w = f >= 0 ? hd[i] : hv[i]; return [sc[i][0] + nUp[i][0] * f * w * s, sc[i][1] + nUp[i][1] * f * w * s]; };
  // station fractionnaire (sf = 0..1 le long du corps) → coordonnées de bord
  const idx = sf => clamp(N * Math.pow(clamp(sf), 1 / AN_K), 0, N - 1e-6);
  const EE = (sf, f) => { const i = idx(sf), i0 = Math.floor(i), k = i - i0, a = E(i0, f), b = E(Math.min(N, i0 + 1), f); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; };
  const lit = nUp.map(n => n[0] * an_lt[0] + n[1] * an_lt[1]);
  // couleurs
  const DORS = [18, 24, 11], OLV = [56, 48, 20], BRN = [86, 62, 26], ORg = [196, 100, 26], ORl = [240, 162, 46], YEL = [255, 206, 90];
  const colAt = (f, sf, b) => {
    let back = an_mix(an_mix(BRN, OLV, an_ss(0.0, 0.5, f)), DORS, an_ss(0.45, 0.95, f));
    const thr = lerp(-0.05, -0.58, an_ss(0.04, 0.75, sf));                   // au-dessus de ce niveau : brun-olive ; dessous : jaune-orangé (gorge et ventre)
    const kk = an_ss(thr + 0.12, thr - 0.10, f);
    const or = an_mix(ORg, an_mix(ORl, YEL, an_ss(-0.5, -1, f)), an_ss(0.0, -0.75, f));
    let c = an_mix(back, or, kk); c = an_mix(c, DORS, 0.45 * an_ss(0.8, 1, sf));
    c = c.map(v => v * b);
    return fog > 0 ? an_mix(c, fogC, fog) : c;
  };
  const bbx = [1e9, 1e9, -1e9, -1e9]; for (let i = 0; i <= N; i++) { bbx[0] = Math.min(bbx[0], sc[i][0]); bbx[1] = Math.min(bbx[1], sc[i][1]); bbx[2] = Math.max(bbx[2], sc[i][0]); bbx[3] = Math.max(bbx[3], sc[i][1]); }

  if (zap > 0) an_halo({ E: EE }, t, zap, { reach: o.reach ?? 80 * Math.sqrt(s), seed: o.seed ?? 1 });
  // ── nageoire anale : ruban translucide (membrane tramée + rayons nets) posé sur L AVANT le corps, qui la recouvre à sa naissance ──
  const fin0 = 0.115, fin1 = 0.985, finK = 4.4, finF = Pz.fin * (o.finRate ?? 1), finA = Pz.finAmp, rays = [];
  { const base = [], tip = [];
    for (let i = 0; i <= N; i++) {
      const sf = S[i]; if (sf < fin0 || sf > fin1) continue;
      const hf = AN_L * 0.04 * an_ss(fin0, 0.28, sf) * (1 - 0.5 * an_ss(0.62, 1.0, sf)) * an_ss(1.0, 0.94, sf) + 0.5;
      const phi = TAU * (finK * sf - finF * t - G.ph * 0.5), hh = hf * (0.78 + 0.22 * Math.cos(phi + 1.3)) * finA;
      const lean = hf * 0.8 * Math.sin(phi) * finA;
      const b = E(i, -0.82), n = nUp[i], tg = MV(T[i][0], T[i][1]);
      const tp = [b[0] - n[0] * (hh + 2.2 * (0.18 * s)) * s - n[0] * 0 + tg[0] * lean * s * 0.55, b[1] - n[1] * hh * s + tg[1] * lean * s * 0.55];
      base.push(b); tip.push(tp); rays.push([b, tp, sf, i]);
    }
    const poly = base.concat(tip.slice().reverse());
    const fm = an_mix([120, 52, 20], fogC, fog), fr = an_mix([244, 166, 52], fogC, fog), fq = an_mix([200, 108, 34], fogC, fog);
    an_polyDither(poly, an_css(fm), 0.7);
    for (let q = 0; q < rays.length; q++) { const [b, tp] = rays[q]; if (q % 2 === 0) lineP(b[0], b[1], tp[0], tp[1], an_css(q % 4 === 0 ? fr : fq), 1); }
    for (let q = 1; q < rays.length; q++) { const a = rays[q - 1][1], b = rays[q][1]; lineP(a[0], a[1], b[0], b[1], an_css(fr), 1); }
  }
  layerBegin();
  const c = Y; c.lineJoin = 'round';
  // ── nageoire pectorale : petit éventail couché le long du flanc, derrière l'ouïe ──
  { const i0 = idx(0.112) | 0, b = E(i0, -0.5), n = nUp[i0], tg = MV(T[i0][0], T[i0][1]), fa = Math.sin(TAU * (3.4 * t + 0.3)) * 1.4;
    const p = polyPath([[b[0] - tg[0] * 1.5 * s, b[1] - tg[1] * 1.5 * s - n[1] * 1.5 * s], [b[0] + tg[0] * 9 * s - n[0] * (3.5 + fa) * s, b[1] + tg[1] * 9 * s - n[1] * (3.5 + fa) * s], [b[0] + tg[0] * 6 * s + n[0] * 0.5 * s, b[1] + tg[1] * 6 * s + n[1] * 0.5 * s], [b[0], b[1] + n[1] * 1.5 * s]]);
    c.fillStyle = an_css(an_mix([214, 124, 36], fogC, fog)); c.fill(p); }
  // ── corps : de la couleur du ventre vers le dos, chaque couche recouvre le haut ──
  const fb = [-1, -0.88, -0.72, -0.56, -0.4, -0.24, -0.08, 0.1, 0.28, 0.46, 0.62, 0.76, 0.88];
  const stops = []; for (let i = 0; i <= N; i += 4) stops.push(i);
  const chord = [sc[N][0] - sc[0][0], sc[N][1] - sc[0][1]], cl = Math.hypot(chord[0], chord[1]) || 1, cu = [chord[0] / cl, chord[1] / cl];
  fb.forEach((f0, j) => {
    const f1 = 1.0, path = new Path2D();
    for (let i = 0; i <= N; i++) { const p = E(i, f1); if (i === 0) path.moveTo(p[0], p[1]); else path.lineTo(p[0], p[1]); }
    for (let i = N; i >= 0; i--) { const p = E(i, f0); path.lineTo(p[0], p[1]); }
    path.closePath();
    const g = c.createLinearGradient(sc[0][0], sc[0][1], sc[N][0], sc[N][1]);
    for (const i of stops) {
      const proj = clamp(((sc[i][0] - sc[0][0]) * cu[0] + (sc[i][1] - sc[0][1]) * cu[1]) / cl, 0, 1);
      g.addColorStop(proj, an_css(colAt(f0 + 0.07, S[i], 0.8 + 0.3 * lit[i])));
    }
    c.fillStyle = g; c.fill(path);
  });
  // ── marbrures sombres et fines taches claires ──
  for (let k = 0; k < 46; k++) {
    const sf = 0.1 + 0.88 * an_h(k, 7), f = -0.15 + 1.0 * an_h(k, 11), pp = EE(sf, f), i = idx(sf) | 0, tg = MV(T[i][0], T[i][1]);
    const ang = Math.atan2(tg[1], tg[0]), rx = (1.6 + 3.4 * an_h(k, 3)) * s, ry = (0.9 + 1.1 * an_h(k, 5)) * s * (0.5 + sf * 0.5);
    const dark = an_h(k, 13) < 0.7, base = colAt(f, sf, 0.8 + 0.3 * lit[i]);
    c.fillStyle = an_css(dark ? base.map(v => v * 0.62) : an_mix(base, [150, 140, 70], 0.28), 0.8);
    c.beginPath(); c.ellipse(pp[0], pp[1], rx, ry, ang, 0, TAU); c.fill();
  }
  const zfr = Math.floor(t * 30 + 1e-6), zo = zap > 0.25 ? (an_h(zfr, 5) < 0.5 ? CY[4] : CY[3]) : null;
  layerEnd({ outline: o.outline || (zo && an_h(zfr, 9) < zap ? zo : '#07100f') });
  if (zap > 0.05) { L.save(); L.setTransform(1, 0, 0, 1, 0, 0); for (let k = 0; k < 6; k++) { const p = EE(lerp(0.08, 0.92, k / 5), 0.3); rgrad(p[0], p[1], 1, 15 * s, [[0, `rgba(150,230,250,${0.16 * zap})`], [1, 'rgba(60,160,200,0)']], 1, 'lighter'); } L.restore(); }

  // ═══ détails nets ═══
  L.setTransform(1, 0, 0, 1, 0, 0);
  // liseré de lumière sur le dos (selon l'inclinaison)
  { for (let i = 1; i < N - 1; i++) { const a = lit[i]; if (a < 0.3) continue; const p = E(i, 1), q = E(i + 1, 1), k = clamp((a - 0.3) * 1.6) * (o.rim ?? 0.85); lineP(p[0], p[1] + 1, q[0], q[1] + 1, an_css(an_mix(an_mix([50, 50, 22], [104, 112, 56], k), fogC, fog * 0.6)), 1); } }
  // tête : bouche, lèvre claire, ouïe en arc, narine, œil cerclé
  const mouth0 = EE(0.003, -0.2), mouthM = EE(0.03, -0.3), mouth1 = EE(0.062, -0.26), fogD = k => an_mix(k, fogC, fog * 0.5);
  lineP(mouth0[0], mouth0[1], mouthM[0], mouthM[1], an_css(fogD([40, 14, 8])), 1); lineP(mouthM[0], mouthM[1], mouth1[0], mouth1[1], an_css(fogD([40, 14, 8])), 1);
  { const u0 = EE(0.004, -0.02), u1 = EE(0.03, -0.08), u2 = EE(0.06, -0.04); lineP(u0[0], u0[1], u1[0], u1[1], an_css(fogD([120, 96, 48])), 1); lineP(u1[0], u1[1], u2[0], u2[1], an_css(fogD([120, 96, 48])), 1); }
  { const g0 = EE(0.098, 0.7), g1 = EE(0.108, 0.1), g2 = EE(0.101, -0.82); lineP(g0[0], g0[1], g1[0], g1[1], an_css(fogD([60, 30, 12])), 1); lineP(g1[0], g1[1], g2[0], g2[1], an_css(fogD([60, 30, 12])), 1); }
  const eye = EE(0.044, 0.44), er = Math.max(1, Math.round(1.0 * s));
  if (s >= 1.15) { const ring = an_css(fogD([120, 104, 52])); R(eye[0] - er * 0.5 - 1, eye[1] - er * 0.5 - 1, er + 3, er + 3, ring); }
  R(eye[0] - er * 0.5, eye[1] - er * 0.5, er + 1, er + 1, '#05040f'); px(eye[0] - er * 0.5 + (fl > 0 ? er : 0), eye[1] - er * 0.5, '#d8f0e8');
  const nos = EE(0.014, 0.6); px(nos[0], nos[1], an_css(fogD([10, 14, 6])));
  return { head: sc[0], tail: sc[N], eye, mouth: mouth0, P: sc, E: (sf, f) => EE(sf, f), bbox: bbx, nUp, N, S };
}


// ───────────────────────── les décharges ─────────────────────────
// halo de l'eau : lueurs additives le long du corps (à dessiner AVANT le corps pour éclairer l'eau derrière lui) ; o.reach, o.from, o.to, o.seed
function an_halo(eel, t, I, o = {}) {
  if (I <= 0.01) return;
  const fr = Math.floor(t * (o.hz ?? 30) + 1e-6), r = rng((o.seed ?? 1) * 1009 + fr * 31), flick = 0.7 + 0.3 * r(), reach = o.reach ?? 80, sf0 = o.from ?? 0.1, sf1 = o.to ?? 0.9;
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0);
  for (let k = 0; k < 4; k++) { const p = eel.E(lerp(sf0, sf1, k / 3), 0); rgrad(p[0], p[1], 2, reach * (0.7 + 0.3 * flick) * (k === 1 || k === 2 ? 1.15 : 0.8), [[0, `rgba(170,240,255,${0.42 * I * flick})`], [0.4, `rgba(80,190,225,${0.26 * I * flick})`], [1, 'rgba(30,110,150,0)']], 1, 'lighter'); }
  L.restore();
}
// éclair en pixels : polyligne brisée (déplacement du point milieu) de (x0, y0) à (x1, y1), halo cyan, filet cyan clair, cœur blanc, étincelles jaunes aux coudes ; branches ramifiées.
// seed change à chaque image : la forme est neuve à chaque fois. o : w (1 = épaisseur normale), branch (0..1), jag (amplitude relative), depth (récursion interne), glow (0..1)
function an_bolt(x0, y0, x1, y1, seed, o = {}) {
  const r = rng(seed * 7919 + 13), len = Math.hypot(x1 - x0, y1 - y0); if (len < 3) return;
  const segs = Math.max(3, Math.round(len / (o.step ?? 11))), jag = (o.jag ?? 0.2) * len, ux = (x1 - x0) / len, uy = (y1 - y0) / len, nx = -uy, ny = ux, depth = o.depth || 0;
  const pts = [[x0, y0]];
  let off = 0;
  for (let k = 1; k < segs; k++) {
    const f = k / segs, env = Math.sin(Math.PI * f) ** 0.6; off = -off * 0.5 + (r() - 0.5) * 2 * jag * env * (1 / Math.sqrt(Math.max(1, segs / 5)));      // coudes francs : le décalage change de côté
    pts.push([x0 + (x1 - x0) * f + nx * off, y0 + (y1 - y0) * f + ny * off]);
  }
  pts.push([x1, y1]);
  const w = o.w ?? 1, glow = o.glow ?? 1;
  const draw = (th, col) => { for (let i = 1; i < pts.length; i++) lineP(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col, th); };
  if (depth === 0 && glow > 0) draw(Math.max(5, Math.round(6 * w)), `rgba(58,168,196,${0.3 * glow})`);
  if (depth === 0) { draw(Math.max(3, Math.round(3.2 * w)), CY[3]); draw(Math.max(2, Math.round(2 * w)), CY[4]); draw(1, WH[3]); }
  else { draw(Math.max(2, Math.round(2 * w)), CY[2]); draw(1, depth === 1 ? YE[3] : CY[4]); }
  if (depth === 0) for (let i = 1; i < pts.length - 1; i += 2) if (r() < 0.6) { px(pts[i][0], pts[i][1], r() < 0.5 ? YE[3] : YE[2]); if (r() < 0.3) px(pts[i][0] + 1, pts[i][1], YE[2]); }
  if (depth === 0 && glow > 0) { const a = pts[0]; R(a[0] - 1, a[1] - 1, 3, 3, WH[3]); px(a[0], a[1] - 2, YE[3]); px(a[0], a[1] + 2, YE[3]); px(a[0] - 2, a[1], YE[3]); px(a[0] + 2, a[1], YE[3]); }
  const nb = Math.round((o.branch ?? 0.6) * (len / 24)) * (depth > 1 ? 0 : 1);
  for (let b = 0; b < nb; b++) {
    const k = 1 + Math.floor(r() * (pts.length - 2)), p = pts[k], side = r() < 0.5 ? -1 : 1, a = Math.atan2(uy, ux) + side * (0.45 + r() * 0.8), bl = len * (0.2 + 0.28 * r()) * (depth ? 0.6 : 1);
    an_bolt(p[0], p[1], p[0] + Math.cos(a) * bl, p[1] + Math.sin(a) * bl, seed * 31 + b * 17 + 5, { ...o, depth: depth + 1, w: w * 0.7, jag: (o.jag ?? 0.2) * 1.1, branch: (o.branch ?? 0.6) * 0.5, step: 7, glow: 0 });
  }
}
// décharge d'une anguille : halo qui éclaire l'eau, éclairs qui partent du corps (dos et ventre) et visent des cibles, crépitement le long du corps, étincelles.
// eel : retour de an_eel (E(sf, f) donne un point du corps) ; I : intensité 0..1 ; o : reach (portée en px), n (nombre d'éclairs), targets [[x, y]…] (cibles visées), hz (changements par seconde, 30 = à chaque image), seed
function an_discharge(eel, t, I, o = {}) {
  if (I <= 0.01) return;
  const hz = o.hz ?? 30, fr = Math.floor(t * hz + 1e-6), reach = o.reach ?? 80, seed = (o.seed ?? 1) * 1009 + fr * 31;
  const r = rng(seed);
  const sf0 = o.from ?? 0.1, sf1 = o.to ?? 0.9;
  if (o.halo) an_halo(eel, t, I, o);
  const n = o.n ?? Math.round(2 + 6 * I), tg = o.targets || [];
  for (let k = 0; k < n; k++) {
    const sf = lerp(sf0, sf1, r()), up = r() < 0.5 ? 1 : -1, a0 = eel.E(sf, up), a1 = eel.E(sf, 0);
    let dx = a0[0] - a1[0], dy = a0[1] - a1[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    let x1, y1;
    if (k < tg.length) { x1 = tg[k][0]; y1 = tg[k][1]; }
    else { const ang = Math.atan2(dy, dx) + (r() - 0.5) * 1.5, L1 = reach * (0.45 + 0.55 * r()) * (0.6 + 0.5 * I); x1 = a0[0] + Math.cos(ang) * L1; y1 = a0[1] + Math.sin(ang) * L1; }
    an_bolt(a0[0], a0[1], x1, y1, seed + k * 101, { w: (k < tg.length ? 1.2 : 0.9) * (0.7 + 0.5 * I), branch: 0.55 + 0.3 * I, jag: 0.17 });
  }
  // crépitement le long du corps : petits arcs courts
  for (let k = 0; k < Math.round(4 + 8 * I); k++) {
    const sf = lerp(sf0, sf1, r()), f = r() < 0.5 ? 1 : -1, a = eel.E(sf, f), b = [a[0] + (r() - 0.5) * 16, a[1] + (r() - 0.5) * 12 + f * 4];
    an_bolt(a[0], a[1], b[0], b[1], seed + 900 + k, { w: 0.6, branch: 0, jag: 0.3, glow: 0, step: 4 });
  }
  // étincelles
  for (let k = 0; k < Math.round(6 + 10 * I); k++) {
    const sf = lerp(sf0, sf1, r()), a = eel.E(sf, 0), ang = r() * TAU, d = 6 + r() * reach * 0.8, x = a[0] + Math.cos(ang) * d, y = a[1] + Math.sin(ang) * d;
    px(x, y, r() < 0.5 ? WH[3] : YE[3]); if (r() < 0.35) { px(x - 1, y, YE[2]); px(x + 1, y, YE[2]); px(x, y - 1, YE[2]); px(x, y + 1, YE[2]); }
  }
}

INITS.push(() => { });
