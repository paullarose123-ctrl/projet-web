'use strict';
/*KIT_HEADER*/

// ════════════════════════════════════════════════════════════════════════════════════════
// 0. OUTILS INTERNES (bruit, caches, palettes restreintes, tampons de pixels)
// ════════════════════════════════════════════════════════════════════════════════════════
function k_h(i, s) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function k_n1(x, s = 0, per = 0) {                                 // bruit de valeur 1D lisse (0..1), périodique si per > 0
  const i = Math.floor(x), f = x - i, u = f * f * f * (f * (f * 6 - 15) + 10);
  let a = i, b = i + 1; if (per) { a = ((a % per) + per) % per; b = ((b % per) + per) % per; }
  return k_h(a, s) * (1 - u) + k_h(b, s) * u;
}
function k_n2(x, y, s = 0, px = 0) {                               // bruit de valeur 2D lisse (0..1), périodique en x si px > 0
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  let a = ix, b = ix + 1; if (px) { a = ((a % px) + px) % px; b = ((b % px) + px) % px; }
  const h = (xx, yy) => k_h(xx * 7919 + yy * 104729, s);
  return (h(a, iy) * (1 - ux) + h(b, iy) * ux) * (1 - uy) + (h(a, iy + 1) * (1 - ux) + h(b, iy + 1) * ux) * uy;
}
const k_memo = new Map();
function k_cache(key, fn) { let v = k_memo.get(key); if (v === undefined) { v = fn(); k_memo.set(key, v); } return v; }
const k_rgbM = {};
function k_rgb(c) {                                                // '#rrggbb' ou [r,g,b] → [r,g,b]
  if (Array.isArray(c)) return c;
  return k_rgbM[c] || (k_rgbM[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
}
const k_mix = (a, b, f) => { a = k_rgb(a); b = k_rgb(b); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; };
const k_hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const k_u32M = {};
function k_u32(c) { const r = k_rgb(c), key = r.join(','); return k_u32M[key] ?? (k_u32M[key] = (0xFF000000 | (Math.round(r[2]) << 16) | (Math.round(r[1]) << 8) | Math.round(r[0])) >>> 0); }
const k_sx = (x, o, par) => x - ((o && o.cam) || 0) * ((o && o.par != null) ? o.par : par);     // abscisse écran d'un point du monde
const k_sy = (y, o, par) => y - ((o && o.camY) || 0) * ((o && o.par != null) ? o.par : par);
const k_bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
const k_sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// tampon d'image réutilisable (Uint32 ABGR) : dessiner pixel par pixel puis recopier sur L
function k_img(w, h) {
  const c = mkCanvas(w, h), x = c.getContext('2d', { willReadFrequently: true }), id = x.createImageData(w, h);
  return { c, x, id, d: new Uint32Array(id.data.buffer), w, h };
}
const k_imgM = {};
function k_tmp(key, w, h) { const k = key + w + 'x' + h; const b = k_imgM[k] || (k_imgM[k] = k_img(w, h)); b.d.fill(0); return b; }   // tampon vidé (usage : un dessin par image)
function k_blit(b, x = 0, y = 0, alpha = 1) {
  b.x.putImageData(b.id, 0, 0);
  L.setTransform(1, 0, 0, 1, 0, 0); if (alpha < 1) L.globalAlpha = alpha;
  L.drawImage(b.c, Math.round(x), Math.round(y)); L.globalAlpha = 1;
}

// palettes restreintes : les surfaces des reliefs sont mélangées en RVB puis ramenées à une sous-palette cohérente (pas de vert au milieu d'un ciel bleu)
const K_SUBS = {
  cold: () => [...NI, ...ST, ...NE, ...WH, ...CY.slice(1), ...DU.slice(2), SK[4], ...BL.slice(2)],
  dusk: () => [...NI.slice(2), ...DU, ...ST.slice(3), ...NE, SK[4], SK[3], AM[8], AM[9], ...RD.slice(3), WH[2], WH[3]],
  warm: () => [...NI.slice(0, 5), ...DU, ...RD, ...OC, ...AM.slice(1), ...SK, ...YE, WH[1], WH[2], WH[3], ...ST.slice(0, 3)],
  green: () => [...NI.slice(0, 5), ...DU.slice(2), ...GR, ...LM, ...OC, ...AM.slice(2), ...SK.slice(2), ...YE.slice(1), ...ST.slice(0, 4), ...CY.slice(1), ...RD.slice(2, 5), WH[3]],
  spring: () => [...NI.slice(5), ...ST.slice(3), ...NE, ...CY.slice(1), ...GR.slice(1), ...LM, ...WH, SK[4], SK[3], AM[9], YE[3], ...DU.slice(5)],
};
function k_sub(name) {
  return k_cache('sub|' + name, () => {
    const hexes = [...new Set(K_SUBS[name]())], list = hexes.map(k_rgb), lut = new Uint8Array(32768);
    for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
      const R_ = r * 8.23, G_ = g * 8.23, B_ = b * 8.23; let best = 0, bd = 1e9;
      for (let i = 0; i < list.length; i++) {
        const p = list[i], rm = (R_ + p[0]) / 2, dr = R_ - p[0], dg = G_ - p[1], db = B_ - p[2];
        const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
        if (d < bd) { bd = d; best = i; }
      }
      lut[(r << 10) | (g << 5) | b] = best;
    }
    return { list, u32: list.map(k_u32), lut };
  });
}
function k_snap(sub, r, g, b, x, y, amp) {                         // couleur (r,g,b) → couleur ABGR de la sous-palette, avec tramage de Bayer d'amplitude amp
  const o = (k_bay(x, y) - 0.5) * amp;
  r = clamp((r + o) / 255) * 255; g = clamp((g + o) / 255) * 255; b = clamp((b + o) / 255) * 255;
  return sub.u32[sub.lut[((r | 0) >> 3 << 10) | ((g | 0) >> 3 << 5) | ((b | 0) >> 3)]];
}

// rampe tramée : stops = [[pos, couleur], …] triés ; l ∈ [0,1] → couleur ABGR (bandes nettes, transitions tramées de largeur 1/dk)
function k_ramp(stops, l, x, y, dk = 2.4) {
  const n = stops.length;
  if (l <= stops[0][0]) return stops[0][2];
  if (l >= stops[n - 1][0]) return stops[n - 1][2];
  let i = 0; while (l > stops[i + 1][0]) i++;
  const f = (l - stops[i][0]) / (stops[i + 1][0] - stops[i][0]), f2 = clamp((f - 0.5) * dk + 0.5);
  return k_bay(x, y) < f2 ? stops[i + 1][2] : stops[i][2];
}
const k_prep = stops => stops.map(s => [s[0], s[1], k_u32(s[1])]);

// ════════════════════════════════════════════════════════════════════════════════════════
// 1. PRÉRÉGLAGES DE CIEL (couleurs de la palette, bandes tramées)
// ════════════════════════════════════════════════════════════════════════════════════════
// stops : du zénith (0) à l'horizon (1) ; glow : lueur autour de (gx·270, gy) qui fait glisser les couleurs vers celles de l'horizon
// mist : couleur de la brume à l'horizon (reliefs lointains s'y fondent) ; light : côté du soleil (−1 gauche, +1 droite) ; rim : liseré de lumière
const K_SKY = {
  alaskaDusk: {
    h: 250, light: -1, stars: 34, mist: '#c9b4d4', rim: '#ffd9d2', warm: '#f090a4', sub: 'cold',
    stops: [[0, NI[2]], [.10, NI[3]], [.23, NI[4]], [.37, NI[5]], [.50, NI[6]], [.62, NI[7]], [.73, NI[8]], [.82, NI[9]], [.90, '#d6b8e0'], [.955, DU[7]], [1, SK[4]]],
    glow: { gx: 0.18, gy: 1.0, sx: 150, sy: 80, k: 0.3 },
  },
  alaskaNight: {
    h: 260, light: -1, stars: 170, mist: '#2c3c84', rim: '#8ae0c0', warm: '#3aa8c4', sub: 'cold',
    stops: [[0, NI[0]], [.14, NI[1]], [.34, NI[2]], [.54, NI[3]], [.72, NI[4]], [.88, NI[5]], [1, '#3a4a98']],
    glow: { gx: 0.5, gy: 0.92, sx: 190, sy: 60, k: 0.12 },
  },
  alaskaSpring: {
    h: 260, light: 1, stars: 0, mist: '#e4eef8', rim: '#fff8e8', warm: '#ffe08a', sub: 'spring',
    stops: [[0, NI[6]], [.14, NI[7]], [.30, '#6c92d8'], [.46, NI[8]], [.60, '#a2d4ec'], [.72, CY[4]], [.84, NE[3]], [.93, NE[4]], [1, WH[2]]],
    glow: { gx: 0.82, gy: 1.0, sx: 140, sy: 70, k: 0.2 },
  },
  desertDusk: {
    h: 250, light: 1, stars: 20, mist: '#e8809a', rim: '#ffd890', warm: '#ffc84a', sub: 'warm', sun: { x: 0.70, y: 238, r: 15 },
    stops: [[0, NI[3]], [.08, NI[4]], [.20, DU[1]], [.32, DU[2]], [.43, DU[3]], [.54, DU[4]], [.64, DU[5]], [.73, DU[6]], [.81, RD[4]], [.88, AM[6]], [.935, AM[7]], [.975, AM[8]], [1, AM[9]]],
    glow: { gx: 0.70, gy: 1.0, sx: 120, sy: 95, k: 0.34 },
  },
  savannaDawn: {
    h: 260, light: 1, stars: 0, mist: '#f6b6a8', rim: '#ffe6a0', warm: '#ffe08a', sub: 'warm', sun: { x: 0.64, y: 252, r: 17 },
    stops: [[0, NI[4]], [.10, NI[5]], [.22, '#4a5cb0'], [.34, DU[3]], [.45, DU[4]], [.55, DU[5]], [.65, DU[6]], [.74, DU[7]], [.82, RD[5]], [.89, AM[8]], [.945, AM[9]], [1, AM[10]]],
    glow: { gx: 0.64, gy: 1.0, sx: 130, sy: 90, k: 0.3 },
  },
};
function k_sunPos(preset, o = {}) {                                // position conseillée du soleil pour un préréglage : [x, y, r]
  const S = K_SKY[preset], s = S.sun || { x: 0.5, y: (o.h ?? S.h) - 4, r: 14 };
  return [Math.round(s.x * LW), o.h ? o.h - (S.h - s.y) : s.y, s.r];
}

function k_buildSky(S, h, o) {
  const im = k_img(LW, LH), st = k_prep(S.stops), g = Object.assign({}, S.glow, o.glow || {});
  const gx = (o.gx ?? g.gx) * LW, gy = (o.gy ?? g.gy) * h;
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
    let l = y / h;
    l += 0.025 * Math.sin(x * 0.021 + y * 0.011) + 0.012 * Math.sin(x * 0.047 - y * 0.02);       // légère ondulation des bandes
    if (g.k) { const dx = (x - gx) / g.sx, dy = (y - gy) / g.sy; l += g.k * Math.exp(-(dx * dx + dy * dy)); }
    im.d[y * LW + x] = k_ramp(st, clamp(l), x, y, 2.6);
  }
  im.x.putImageData(im.id, 0, 0); return im.c;
}
function k_sky(preset, t, o = {}) {
  const S = K_SKY[preset], h = o.h ?? S.h;
  const c = k_cache(`sky|${preset}|${h}|${o.gx ?? ''}|${o.gy ?? ''}`, () => k_buildSky(S, h, o));
  L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1; L.drawImage(c, 0, 0);
  const ns = o.stars ?? S.stars;
  if (ns) k_stars(t, { n: ns, y1: h * 0.72, cam: o.cam, seed: o.seed ?? 3, preset });
}
function k_skyColor(preset, f = 1, h) {                            // couleur RVB du ciel à la hauteur f (0 zénith, 1 horizon)
  const S = K_SKY[preset], st = S.stops; f = clamp(f); let i = 0; while (i < st.length - 2 && f > st[i + 1][0]) i++;
  return k_mix(st[i][1], st[i + 1][1], clamp((f - st[i][0]) / (st[i + 1][0] - st[i][0])));
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 2. ÉTOILES, SOLEIL, LUNE, AURORE
// ════════════════════════════════════════════════════════════════════════════════════════
function k_stars(t, o = {}) {
  const n = o.n ?? 90, y1 = o.y1 ?? 200, r = rng(o.seed ?? 3), cam = (o.cam || 0) * (o.par ?? 0.03), tw = o.twinkle ?? 1;
  for (let i = 0; i < n; i++) {
    const x0 = r() * LW, y = Math.floor(Math.pow(r(), 0.85) * y1), kind = r(), ph = r() * TAU, sp = 0.6 + r() * 2.2, keep = r();
    if (keep > 1 - Math.pow(y / y1, 1.6) * 0.95) continue;
    const x = Math.floor(((x0 - cam) % LW + LW) % LW), v = 0.5 + 0.5 * Math.sin(t * sp + ph) * tw;
    if (kind > 0.93) {                                                 // grosse étoile en croix
      const c = v > 0.45 ? WH[3] : NI[9];
      px(x, y, c); if (v > 0.3) { px(x - 1, y, NI[8]); px(x + 1, y, NI[8]); px(x, y - 1, NI[8]); px(x, y + 1, NI[8]); }
      if (v > 0.85) { px(x - 2, y, NI[7]); px(x + 2, y, NI[7]); px(x, y - 2, NI[7]); px(x, y + 2, NI[7]); }
    } else if (kind > 0.6) px(x, y, v > 0.2 ? NI[9] : NI[7]);
    else px(x, y, v > 0.55 ? NI[8] : NI[6]);
  }
}

// soleil : halo tramé + disque à bords nuancés + rayons fins tramés qui tournent lentement. (x, y) en pixels écran à cam = 0
function k_sun(x, y, r, o = {}) {
  const cx = k_sx(x, o, 0.04), cy = k_sy(y, o, 0.04), a = o.glow ?? 1, hot = o.hot ?? AM[10];
  const warm = o.col ?? '#ffd070', rays = o.rays ?? 1, t = o.t ?? 0;
  if (a > 0) {
    rgrad(cx, cy, r * 0.5, r * 7, [[0, 'rgba(255,230,150,0.55)'], [.25, 'rgba(255,190,100,0.28)'], [.6, 'rgba(255,150,90,0.1)'], [1, 'rgba(255,140,90,0)']], a, 'lighter');
  }
  if (rays > 0) {                                                     // rayons : lignes radiales tramées, longueur variable
    const nR = 18;
    for (let i = 0; i < nR; i++) {
      const ang = i / nR * TAU + t * 0.04, len = r * (2.4 + 3.4 * k_h(i, 5)) * (0.85 + 0.15 * Math.sin(t * 0.8 + i * 1.7)), w = 0.05 + 0.04 * k_h(i, 6);
      for (let d = r * 1.25; d < r + len; d += 1) {
        const f = 1 - (d - r * 1.25) / len, ix = Math.round(cx + Math.cos(ang) * d), iy = Math.round(cy + Math.sin(ang) * d);
        if (ix < 0 || ix >= LW || iy < 0 || iy >= LH) continue;
        if (k_bay(ix, iy) < f * f * 0.55 * rays) { L.fillStyle = f > 0.5 ? AM[9] : AM[8]; L.fillRect(ix, iy, 1, 1); }
      }
    }
  }
  disc(cx, cy, r + 2, AM[8]);                                         // anneau
  disc(cx, cy, r + 1, AM[9]);
  disc(cx, cy, r, hot); ell(cx - r * 0.25, cy - r * 0.25, Math.round(r * 0.55), Math.round(r * 0.55), '#fffbe6');
  for (let a2 = 0; a2 < TAU; a2 += 0.2) { const px_ = Math.round(cx + Math.cos(a2) * (r + 3)), py_ = Math.round(cy + Math.sin(a2) * (r + 3)); if (k_bay(px_, py_) < 0.5) px(px_, py_, AM[7]); }   // frange tramée
}
// lune : disque, phase (0 nouvelle, 0.25 premier quartier, 0.5 pleine, 0.75 dernier quartier), cratères, halo
function k_moon(x, y, r, o = {}) {
  const cx = k_sx(x, o, 0.04), cy = k_sy(y, o, 0.04), ph = o.phase ?? 0.5, glow = o.glow ?? 1, tint = o.tint ?? 0;
  if (glow > 0) rgrad(cx, cy, r * 0.8, r * 5.5, [[0, 'rgba(200,225,255,0.45)'], [.35, 'rgba(160,190,240,0.18)'], [1, 'rgba(120,150,220,0)']], glow, 'lighter');
  const lit = [WH[3], NE[4], NE[3], NE[2], NE[1], NE[0]], dark = o.dark ?? NI[3], cph = Math.cos(ph * TAU);
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.floor(Math.sqrt(r * r + r * 0.6 - dy * dy));
    for (let dx = -hw; dx <= hw; dx++) {
      const u = dx / Math.max(1, hw), isLit = ph < 0.5 ? u > cph : u < -cph;
      let c = dark;
      if (isLit) {
        const shade = clamp(0.5 + 0.35 * (dx + dy * 0.5) / r);                // un peu plus sombre vers le bas-droite
        const n = k_n2(dx * 0.33 + 50, dy * 0.33, 4);
        const idx = Math.floor(shade * 2.4 + (n > 0.64 ? 1.4 : 0) + (n < 0.22 ? 0.8 : 0) + (k_bay(dx + 99, dy + 99) < shade * 0.5 ? 0.6 : 0));
        c = lit[Math.min(5, idx)];
        if (dx * dx + dy * dy > (r - 1.2) * (r - 1.2)) c = lit[Math.min(5, 1 + (shade > 0.5 ? 1 : 0))];
      }
      L.fillStyle = c; L.fillRect(Math.round(cx + dx), Math.round(cy + dy), 1, 1);
    }
  }
  if (tint > 0) { L.save(); L.globalCompositeOperation = 'source-atop'; L.globalAlpha = tint; L.fillStyle = '#ffaa5a'; L.fillRect(cx - r, cy - r, r * 2 + 1, r * 2 + 1); L.restore(); }
}

// aurore boréale : rideaux verts à franges cyan qui ondulent. Pixels de la palette, transparence par tramage.
function k_aurora(t, o = {}) {
  const y0 = o.y ?? 150, hmax = o.hmax ?? 120, amp = o.amp ?? 1, n = o.curtains ?? 2, cam = (o.cam || 0) * (o.par ?? 0.05), inten = o.intensity ?? 1, seed = o.seed ?? 7;
  const top = Math.max(0, Math.floor(y0 - hmax - 40 * amp - 6)), hh = Math.min(LH, Math.ceil(y0 + 40 * amp + 12)) - top;
  const b = k_tmp('aur', LW, hh);
  const GRc = [GR[6], GR[5], GR[4], GR[3], GR[2], GR[1]].map(k_u32), CYc = [CY[4], CY[3], CY[2], CY[1], CY[0]].map(k_u32);
  const DUc = [DU[6], DU[5], DU[4], DU[3]].map(k_u32), k0 = k_u32(NI[3]);
  for (let c = 0; c < n; c++) {
    const sc = c === 0 ? 1 : 0.7, yb = y0 + c * 16 + 6 * c, ph = c * 2.3 + seed;
    for (let x = 0; x < LW; x++) {
      const wx = x + cam;
      const base = yb + amp * (14 * Math.sin(wx * 0.013 + t * 0.45 + ph) + 8 * Math.sin(wx * 0.034 - t * 0.7 + ph * 1.7) + 4 * Math.sin(wx * 0.071 + t * 1.3));
      const ray = k_n1(wx * 0.09 + t * 0.7 * (c ? -1 : 1), seed + c) * 0.65 + k_n1(wx * 0.31 - t * 1.1, seed + 5 + c) * 0.35;
      const env = k_n1(wx * 0.021 + t * 0.12 + c * 9, seed + 11);
      const I = clamp((ray - 0.18) * 1.7) * (0.25 + 0.95 * env) * inten * sc;
      if (I < 0.04) continue;
      const H = hmax * (0.35 + 0.65 * k_n1(wx * 0.03 - t * 0.2, seed + 2 + c)) * sc;
      const y1 = Math.floor(base), yTop = Math.floor(base - H);
      for (let y = Math.max(yTop, top); y <= y1 && y - top < hh; y++) {
        const s = (y1 - y) / H;                                        // 0 bas du rideau → 1 sommet
        let i = I * Math.pow(1 - s, 1.25) * (s < 0.05 ? 1.5 : 1) * (0.8 + 0.2 * k_n1(wx * 0.5 + y * 0.12 + t * 0.9, seed + 8));
        if (i < 0.06) continue;
        if (k_bay(x, y) >= clamp(i * 1.5)) continue;                   // transparence par tramage
        let col;
        const q = clamp(1 - i * 1.05) * (GRc.length - 0.01);
        if (s > 0.62 && (o.violet ?? 0.5) > 0 && k_h(x * 3 + y, 9) < 0.5 + (o.violet ?? 0.5) * 0.3) col = DUc[Math.min(3, Math.floor(q * 0.7))];
        else if (s > 0.38 || o.cyan) col = CYc[Math.min(4, Math.floor(q * 0.85))];
        else col = GRc[Math.floor(q)];
        b.d[(y - top) * LW + x] = col;
      }
    }
  }
  // lueur diffuse sous l'aurore
  rgrad(LW / 2 - cam * 0, y0 - 20, 10, 190, [[0, 'rgba(70,200,150,0.16)'], [1, 'rgba(70,200,150,0)']], inten, 'lighter');
  k_blit(b, 0, top);
}
