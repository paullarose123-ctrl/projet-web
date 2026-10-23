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
// calque restreint à un rectangle bb = [x0, y0, x1, y1] (même résultat que layerBegin / layerEnd du moteur, sans parcourir tout l'écran)
function an_layerBegin(bb) { Y.setTransform(1, 0, 0, 1, 0, 0); Y.globalAlpha = 1; Y.globalCompositeOperation = 'source-over'; Y.filter = 'none'; Y.clearRect(bb[0] - 2, bb[1] - 2, bb[2] - bb[0] + 4, bb[3] - bb[1] + 4); }
function an_layerEnd(bb, o = {}) {
  const x0 = Math.max(0, Math.floor(bb[0]) - 1), y0 = Math.max(0, Math.floor(bb[1]) - 1), x1 = Math.min(LW, Math.ceil(bb[2]) + 1), y1 = Math.min(LH, Math.ceil(bb[3]) + 1), w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  const id = Y.getImageData(x0, y0, w, h), d = id.data;
  for (let i = 3; i < d.length; i += 4) { const a = d[i]; if (a) d[i] = a >= 128 ? 255 : 0; }
  if (o.outline) {
    const oc = an_rgb(o.outline), add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = y * w + x; if (d[p * 4 + 3]) continue; if ((x > 0 && d[(p - 1) * 4 + 3]) || (x < w - 1 && d[(p + 1) * 4 + 3]) || (y > 0 && d[(p - w) * 4 + 3]) || (y < h - 1 && d[(p + w) * 4 + 3])) add.push(p); }
    for (const p of add) { d[p * 4] = oc[0]; d[p * 4 + 1] = oc[1]; d[p * 4 + 2] = oc[2]; d[p * 4 + 3] = 255; }
  }
  Y.putImageData(id, x0, y0);
  L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(lay, x0, y0, w, h, x0, y0, w, h);
}
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
  const bb = [bbx[0] - 14 * s - 6, bbx[1] - 24 * s - 6, bbx[2] + 14 * s + 6, bbx[3] + 24 * s + 6];
  an_layerBegin(bb);
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
  an_layerEnd(bb, { outline: o.outline || (zo && an_h(zfr, 9) < zap ? zo : '#07100f') });
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

// ───────────────────────── le tétra (petit poisson argenté et rouge) ─────────────────────────
// profil : abscisse locale (museau à +17, pédoncule à −13) → demi-épaisseur
const AN_TET = [[17.5, 0.0], [16.5, 1.3], [14.5, 2.7], [11, 3.9], [6, 4.6], [0, 4.8], [-6, 4.1], [-10, 2.7], [-13, 1.5]];
function an_tetHalf(x) { if (x >= 17.5) return 0; if (x <= -13) return 1.5; return tab(AN_TET.slice().reverse(), x); }
// (cx, cy) = centre du corps ; s = échelle (1 : 37 px de long avec la queue ; 3 : 110 px) ; o.pose 'swim' | 'flee' ; o.stun 0..1 (paralysie : raidi, il se retourne ventre en l'air) ; o.rot (rad) ; o.flip (regarde à gauche) ; o.ph ; o.fog ; o.tremble 0..1
function an_tetra(cx, cy, s, t, o = {}) {
  const fl = o.flip ? -1 : 1, rot = o.rot || 0, stun = clamp(o.stun ?? 0), fog = clamp(o.fog ?? 0), fogC = o.fogCol || '#1f6a74', fast = o.pose === 'flee' ? 1.9 : 1, ph = o.ph ?? 0;
  const A = (1 - stun) * 1.5 * fast * (o.amp ?? 1) + (o.tremble ?? 0) * 0.5, fq = 4.2 * fast, tm = (o.tremble ?? stun * 0.25);
  const roll = stun * (o.roll ?? 1), cosR = Math.cos(Math.PI * roll), ys = (0.42 + 0.58 * Math.abs(cosR)) * (cosR < 0 ? -1 : 1);                      // retournement : vu de profil, le poisson s'aplatit (vu de dessus) puis revient ventre en l'air
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const bend = x => A * Math.sin(TAU * (fq * t + ph) - 0.26 * x) * Math.pow(clamp((17 - x) / 34), 1.3) + tm * Math.sin(TAU * (22 * t + ph) + x * 0.5) * 0.35;
  const Mx = (x, y) => { const lx = fl * x, ly = y * 1; return [cx + s * (lx * cr - ly * sr), cy + s * (lx * sr + ly * cr)]; };
  const P = (x, f) => { const h = an_tetHalf(x), y = bend(x) + f * h * ys; return Mx(x, y); };
  const bb = [cx - 24 * s, cy - 18 * s, cx + 24 * s, cy + 18 * s];
  const k = (c) => fog > 0 ? an_mix(c, fogC, fog) : c;
  an_layerBegin(bb); const c = Y;
  const xs = []; for (let x = 17.5; x >= -13; x -= 1.5) xs.push(x); xs.push(-13);
  // nageoire caudale fourchue + dorsale + anale + pectorale (translucides, rouge pâle)
  const tailW = (1.2 + 0.5 * Math.sin(TAU * (fq * t + ph) - 3.2) * (1 - stun)) * 1.0;
  { const root = [-12.5, bend(-12.5)], up = [-20.5, bend(-20.5) - 5.6 - tailW], dn = [-20.5, bend(-20.5) + 5.6 + tailW], mid = [-17, bend(-17)];
    c.fillStyle = an_css(k([222, 84, 80])); c.beginPath(); for (const [i, q] of [root, up, mid, dn, root].entries()) { const m = Mx(q[0], q[1]); i ? c.lineTo(m[0], m[1]) : c.moveTo(m[0], m[1]); } c.fill();
    const dorsal = [[3, bend(3) - 4.4 * ys], [-1, bend(-1) - 8.2 * ys], [-6, bend(-6) - 3.6 * ys]]; c.fillStyle = an_css(k([90, 110, 126])); c.beginPath(); dorsal.forEach((q, i) => { const m = Mx(q[0], q[1]); i ? c.lineTo(m[0], m[1]) : c.moveTo(m[0], m[1]); }); c.fill();
    const anal = [[-3, bend(-3) + 4 * ys], [-8, bend(-8) + 6.6 * ys], [-10.5, bend(-10.5) + 2.6 * ys]]; c.fillStyle = an_css(k([230, 100, 96])); c.beginPath(); anal.forEach((q, i) => { const m = Mx(q[0], q[1]); i ? c.lineTo(m[0], m[1]) : c.moveTo(m[0], m[1]); }); c.fill();
  }
  // corps : argent, puis bande bleu-vert, rouge de l'arrière, dos sombre (couches du ventre vers le dos)
  const band = (f0, colFn) => {
    const path = new Path2D(); xs.forEach((x, i) => { const p = P(x, 1); i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1]); }); for (let i = xs.length - 1; i >= 0; i--) { const p = P(xs[i], f0); path.lineTo(p[0], p[1]); } path.closePath();
    const g = c.createLinearGradient(Mx(17, 0)[0], Mx(17, 0)[1], Mx(-13, 0)[0], Mx(-13, 0)[1]); for (const q of [0, 0.25, 0.5, 0.75, 1]) g.addColorStop(q, an_css(k(colFn(17 - 30 * q))));
    c.fillStyle = g; c.fill(path);
  };
  const flip = cosR < 0 ? -1 : 1;                                                         // ventre en l'air : l'ordre des couleurs du dos au ventre est inversé
  const layers = flip > 0 ? [[-1, x => [226, 234, 242]], [-0.55, x => x > -1 ? [196, 208, 224] : an_mix([196, 208, 224], [232, 56, 60], an_ss(-1, -5, x))], [-0.1, x => x > -4 ? [116, 226, 244] : an_mix([116, 226, 244], [58, 70, 80], an_ss(-4, -12, x))], [0.42, x => [70, 84, 96]], [0.75, x => [44, 54, 64]]]
    : [[-1, x => [44, 54, 64]], [-0.75, x => [70, 84, 96]], [-0.42, x => x > -4 ? [116, 226, 244] : an_mix([116, 226, 244], [58, 70, 80], an_ss(-4, -12, x))], [0.1, x => x > -1 ? [196, 208, 224] : an_mix([196, 208, 224], [232, 56, 60], an_ss(-1, -5, x))], [0.55, x => [226, 234, 242]]];
  for (const [f0, fn] of layers) band(f0, fn);
  // nageoire pectorale (un petit éventail devant le milieu du corps)
  { const b = P(8.5, -0.1), tip = Mx(3, bend(3) + 3.4 * ys + Math.sin(TAU * (6 * t + ph)) * 0.8 * (1 - stun)); c.fillStyle = an_css(k([214, 222, 232])); c.beginPath(); c.moveTo(b[0], b[1] - 0.4 * s); c.lineTo(tip[0], tip[1]); c.lineTo(b[0] - 0.4 * s, b[1] + 0.6 * s); c.fill(); }
  an_layerEnd(bb, { outline: o.outline || '#0a1620' });
  // détails nets : œil, ligne latérale brillante, reflet
  L.setTransform(1, 0, 0, 1, 0, 0);
  const eye = P(11.2, ys > 0 ? 0.0 : 0.0), er = Math.max(1, Math.round(1.55 * s * 0.8));
  disc(eye[0], eye[1], er + 1, an_css(k([236, 240, 244]))); disc(eye[0] + fl * 0.4, eye[1], er, '#0a1620'); px(eye[0] - er * 0.4, eye[1] - er * 0.6, '#ffffff');
  if (stun > 0.3) { const hi = P(11.2, 0); lineP(hi[0] - 2 * s, hi[1] - 2.4 * s, hi[0] - 1 * s, hi[1] - 2.4 * s, CY[4], 1); }
  const m0 = P(17, 0.1), m1 = P(14, 0.2); lineP(m0[0], m0[1], m1[0], m1[1], '#0a1620', 1);
  return { head: P(17, 0), tail: P(-13, 0), body: Mx(0, bend(0)), eye, bbox: bb };
}

// ═══════════════════════════════════════ L'EAU ═══════════════════════════════════════
// eau trouble vert-bleu : clair sous la surface, de plus en plus sombre en profondeur
const AN_WATER = [[0, '#3c948a'], [0.22, '#25808a'], [0.5, '#17586a'], [0.78, '#0f3a4e'], [1, '#0a2438']];
function an_wcol(y, y0 = 0, y1 = LH) { const f = clamp((y - y0) / (y1 - y0)); let i = 0; while (i + 2 < AN_WATER.length && f > AN_WATER[i + 1][0]) i++; const a = AN_WATER[i], b = AN_WATER[i + 1]; return an_mix(a[1], b[1], clamp((f - a[0]) / (b[0] - a[0]))); }
// fond d'eau : dégradé de y0 à y1 (o.dark 0..1 assombrit tout)
function an_water(y0 = 0, y1 = LH, o = {}) {
  const dk = o.dark ?? 0; vgrad(0, y0, LW, y1 - y0, AN_WATER.map(([f, c]) => [f, an_hex(an_mix(c, '#04121e', dk))]));
}
// troncs d'une forêt inondée : colonnes sombres qui se fondent dans l'eau avec la distance ; list : [x monde, largeur, éloignement 0..1, inclinaison, graine]
const AN_TRUNKS = [[-60, 20, 0.85, 0.05, 1], [10, 30, 0.7, -0.04, 2], [70, 16, 0.9, 0.03, 3], [150, 36, 0.62, 0.05, 4], [215, 18, 0.88, -0.03, 5], [290, 40, 0.55, -0.05, 6], [350, 22, 0.8, 0.04, 7], [430, 34, 0.66, 0.0, 8]];
function an_trunks(t, o = {}) {
  const cam = o.cam || 0, par = o.par ?? 0.5, list = o.list || AN_TRUNKS, y0 = o.top ?? -10, y1 = o.floor ?? 430, rc = o.rayCol || '#7fc8b0';
  for (const [x0, w, d, lean, sd] of list) {
    const x = x0 - cam * par * (1 - d * 0.55), f = 0.32 + 0.55 * d, steps = 14, L1 = [], R1 = [];
    for (let k = 0; k <= steps; k++) {
      const yy = y0 + (y1 - y0) * k / steps, fl = Math.pow(Math.max(0, (k / steps - 0.82) / 0.18), 2), ww = (w * (0.8 + 0.2 * k_n1(k * 0.7, sd))) / 2 * (1 + 0.5 * k / steps) + fl * w * 0.9, cx = x + lean * (yy - y0);
      L1.push([cx - ww - fl * w * 0.3, yy]); R1.push([cx + ww + fl * w * 0.3, yy]);
    }
    const pts = L1.concat(R1.reverse()), g = L.createLinearGradient(0, y0, 0, y1), c0 = an_mix([30, 44, 38], an_wcol(y0), f), c1 = an_mix([20, 28, 26], an_wcol((y0 + y1) / 2), f), c2 = an_mix([14, 20, 20], an_wcol(y1), f * 0.9);
    g.addColorStop(0, an_css(c0)); g.addColorStop(0.5, an_css(c1)); g.addColorStop(1, an_css(c2));
    L.fillStyle = g; L.beginPath(); pts.forEach((p, i) => i ? L.lineTo(p[0], p[1]) : L.moveTo(p[0], p[1])); L.closePath(); L.fill();
    // côté éclairé par la surface : bande claire à droite, écorce striée
    L.fillStyle = an_css(an_mix(c1, rc, 0.28 * (1 - d * 0.5)), 0.55);
    L.beginPath(); for (let k = 0; k <= steps; k++) { const p = R1[steps - k]; k ? L.lineTo(p[0] - 1, p[1]) : L.moveTo(p[0] - 1, p[1]); } for (let k = steps; k >= 0; k--) { const p = R1[steps - k]; L.lineTo(p[0] - 4 - (1 - d) * 3, p[1]); } L.closePath(); L.fill();
  }
}
// racines pendantes (jacinthes d'eau) accrochées à la surface : fibres sombres à barbes ; o.y0 = surface, o.n, o.len
function an_roots(t, o = {}) {
  const cam = o.cam || 0, par = o.par ?? 0.9, y0 = o.y0 ?? 0, n = o.n ?? 16, len = o.len ?? 50, seed = o.seed ?? 3, r = rng(seed * 17 + 4), cols = o.cols || [GR[0], GR[1], '#1a5a3a'];
  for (let i = 0; i < n; i++) {
    const x = r() * (LW + 120) - 40 - cam * par, l = len * (0.45 + 0.8 * r()), sw = 2 + 3 * r(), ph = r() * TAU, c = cols[i % cols.length];
    let px0 = x, py0 = y0; const seg = Math.max(6, Math.round(l / 5));
    for (let k = 1; k <= seg; k++) {
      const f = k / seg, nx = x + Math.sin(t * 0.8 + ph + f * 2.2) * sw * f * 1.4 + (r() - 0.5) * 0.6, ny = y0 + l * f;
      lineP(px0, py0, nx, ny, c, f < 0.5 ? 2 : 1);
      if (k % 2 === 0 && f < 0.92) { const s2 = (k % 4 === 0 ? -1 : 1), bl = 3 + 5 * (1 - f) * r(); lineP(nx, ny, nx + s2 * bl, ny + bl * 0.6, c, 1); }
      px0 = nx; py0 = ny;
    }
  }
}
// herbes aquatiques (rubans qui ondulent) plantées sur le fond y ; o.n, o.h
function an_blades(t, o = {}) {
  const cam = o.cam || 0, par = o.par ?? 1, y = o.y ?? 450, n = o.n ?? 40, h = o.h ?? 60, seed = o.seed ?? 5, r = rng(seed * 29 + 1), cols = o.cols || [GR[0], GR[1], GR[2], GR[3]], rim = o.rim ?? GR[4];
  const wrap = LW + 100;
  for (let i = 0; i < n; i++) {
    const bx = r() * wrap - 50, hh = h * (0.5 + 0.7 * r()), ph = r() * TAU, w0 = 2 + Math.floor(r() * 2), ci = Math.min(cols.length - 1, Math.floor(r() * cols.length)), c = cols[ci], lean = (r() - 0.5) * 14;
    const x = bx - cam * par; if (x < -30 || x > LW + 30) continue;
    const seg = Math.max(8, Math.round(hh / 5)); let ax = x, ay = y;
    for (let k = 1; k <= seg; k++) {
      const f = k / seg, nx = x + lean * f + Math.sin(t * 1.1 + ph + f * 2.6) * 7 * f * f + Math.sin(t * 0.6 + ph * 1.7) * 3 * f, ny = y - hh * f;
      lineP(ax, ay, nx, ny, c, f < 0.75 ? w0 : 1);
      if (f > 0.1 && f < 0.9 && k % 3 === 0 && ci >= 2) px(nx + 1, ny, rim);
      ax = nx; ay = ny;
    }
  }
}
// fond : vase sombre en pente douce avec feuilles mortes, branches englouties et cailloux ; o.y = ligne du fond (à gauche), o.slope
function an_bed(t, o = {}) {
  const cam = o.cam || 0, par = o.par ?? 1, y = o.y ?? 430, seed = o.seed ?? 7, r = rng(seed * 41 + 9), dk = o.dark ?? 0;
  const top = x => y + 6 * Math.sin((x + cam * par) * 0.03 + seed) + 3 * Math.sin((x + cam * par) * 0.11) + (o.slope ?? 0) * x;
  L.fillStyle = an_css(an_mix('#1c3a34', '#04121e', dk)); L.beginPath(); L.moveTo(0, LH); for (let x = 0; x <= LW; x += 6) L.lineTo(x, top(x)); L.lineTo(LW, LH); L.closePath(); L.fill();
  L.fillStyle = an_css(an_mix('#2c5a48', '#04121e', dk)); L.beginPath(); L.moveTo(0, LH); for (let x = 0; x <= LW; x += 6) L.lineTo(x, top(x) + 3 + 2 * Math.sin(x * 0.07 + 1)); L.lineTo(LW, LH); L.closePath(); L.fill();
  for (let i = 0; i < 40; i++) {                                                  // feuilles mortes et cailloux
    const x = r() * (LW + 100) - 50 - cam * par, yy = top(x) + 6 + r() * (LH - top(x) - 8), c = [WO[2], WO[3], OC[2], GR[1], '#3a4a3a', WO[1]][i % 6];
    ell(x, yy, 2 + r() * 4, 1 + Math.floor(r() * 2), c);
  }
}
// bulles qui montent (anneaux clairs à reflet), positions déterministes ; o.n, o.y0 (haut), o.y1 (bas)
function an_bubbles(t, o = {}) {
  const n = o.n ?? 16, cam = o.cam || 0, par = o.par ?? 1, y0 = o.y0 ?? 0, y1 = o.y1 ?? LH, seed = o.seed ?? 6, r = rng(seed * 19 + 7), H = y1 - y0 + 30, sp0 = o.speed ?? 1;
  for (let i = 0; i < n; i++) {
    const bx = r() * (LW + 60) - 30, sp = (14 + 18 * r()) * sp0, ph = r() * H, sz = r() < 0.2 ? 3 : r() < 0.55 ? 2 : 1, wob = 2 + 3 * r(), w = 1 + 2 * r();
    const yy = y1 + 15 - ((ph + sp * t) % H), x = bx - cam * par + Math.sin(t * w + i) * wob, X = Math.round(x), Y = Math.round(yy);
    if (X < -4 || X > LW + 4 || Y < y0 - 4 || Y > y1 + 4) continue;
    if (sz === 1) px(X, Y, CY[4]);
    else if (sz === 2) { px(X, Y - 1, CY[3]); px(X - 1, Y, CY[3]); px(X + 1, Y, CY[3]); px(X, Y + 1, CY[2]); px(X - 1, Y - 1, WH[3]); }
    else { for (const [dx, dy] of [[-1, -2], [0, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2]]) px(X + dx, Y + dy, dy > 0 ? CY[2] : CY[4]); px(X - 1, Y - 1, WH[3]); }
  }
}

INITS.push(() => { });
