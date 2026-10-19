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
  cold: () => [...NI, ...ST.slice(4), ...NE, ...WH, ...CY.slice(2), DU[6], DU[7], SK[4], ...BL.slice(3)],
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
    h: 250, light: -1, stars: 34, mist: '#9aa4d6', rim: '#ffd9d2', warm: '#f090a4', sub: 'cold',
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
    h: 250, light: 1, stars: 20, mist: '#9a4a98', rim: '#ffd890', warm: '#ffc84a', sub: 'warm', sun: { x: 0.70, y: 238, r: 15 },
    stops: [[0, NI[3]], [.08, NI[4]], [.20, DU[1]], [.32, DU[2]], [.43, DU[3]], [.54, DU[4]], [.64, DU[5]], [.73, DU[6]], [.81, RD[4]], [.88, AM[6]], [.935, AM[7]], [.975, AM[8]], [1, AM[9]]],
    glow: { gx: 0.70, gy: 1.0, sx: 120, sy: 95, k: 0.34 },
  },
  savannaDawn: {
    h: 260, light: 1, stars: 0, mist: '#b8607e', rim: '#ffe6a0', warm: '#ffe08a', sub: 'warm', sun: { x: 0.64, y: 252, r: 17 },
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

// préparation : ciels des 5 préréglages et sous-palettes (coût unique, évite un pic au premier plan qui les utilise)
INITS.push(() => { for (const p in K_SKY) k_sky.warm = k_cache(`sky|${p}|${K_SKY[p].h}||`, () => k_buildSky(K_SKY[p], K_SKY[p].h, {})); for (const n of ['cold', 'warm', 'dusk', 'green', 'spring']) k_sub(n); });

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
  if (glow > 0) rgrad(cx, cy, r * 0.8, r * 3.8, [[0, 'rgba(200,225,255,0.4)'], [.4, 'rgba(160,190,240,0.14)'], [1, 'rgba(120,150,220,0)']], glow, 'lighter');
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

// aurore boréale : rideaux verts à franges cyan et violettes qui ondulent, plis plus lumineux, rayons penchés. Pixels de la palette, transparence par tramage.
// o : y (bord bas moyen des rideaux), hmax (hauteur), amp (ondulation), curtains (nombre), cam, par (0.05), intensity, seed, violet (0..1), x0, x1
function k_aurora(t, o = {}) {
  const y0 = o.y ?? 150, hmax = o.hmax ?? 120, amp = o.amp ?? 1, n = o.curtains ?? 3, cam = (o.cam || 0) * (o.par ?? 0.05), inten = o.intensity ?? 1, seed = o.seed ?? 7, vio = o.violet ?? 0.5;
  const top = Math.max(0, Math.floor(y0 - hmax - 44 * amp - 6)), hh = Math.min(LH, Math.ceil(y0 + 60 * amp + 40)) - top;
  const b = k_tmp('aur', LW, hh);
  const GRc = [GR[6], GR[5], GR[4], GR[3], GR[2], GR[1]].map(k_u32), CYc = [CY[4], CY[3], CY[2], CY[1], CY[0]].map(k_u32), DUc = [DU[6], DU[5], DU[4], DU[3], DU[2]].map(k_u32);
  for (let c = n - 1; c >= 0; c--) {
    const sc = c === 0 ? 1 : c === 1 ? 0.72 : 0.5, yb = y0 + c * 14, ph = c * 2.3 + seed, dir = c % 2 ? -1 : 1, hs = hmax * (c === 0 ? 1 : 0.8);
    const baseAt = wx => yb + amp * (16 * Math.sin(wx * 0.011 + t * 0.4 + ph) + 9 * Math.sin(wx * 0.031 - t * 0.62 + ph * 1.7) + 4 * Math.sin(wx * 0.067 + t * 1.2 + ph));
    for (let x = 0; x < LW; x++) {
      const wx = x + cam, base = baseAt(wx), fold = Math.abs(baseAt(wx + 2) - baseAt(wx - 2)) / 4;
      const env = k_n1(wx * 0.018 + t * 0.1 + c * 9, seed + 11), gp = k_n1(wx * 0.045 - t * 0.2 * dir + c * 5, seed + 13);
      const H = hs * (0.35 + 0.65 * k_n1(wx * 0.026 - t * 0.17, seed + 2 + c)) * sc * (0.6 + 0.6 * env);
      const y1 = Math.floor(base), yTop = Math.floor(base - H);
      for (let y = Math.max(yTop, top); y <= y1 && y - top < hh; y++) {
        const s = (y1 - y) / H;                                           // 0 = bord bas du rideau (le plus lumineux), 1 = sommet
        const lean = s * H * 0.045 * (gp - 0.5) * 6;                      // rayons penchés
        const ray = k_n1((wx + lean) * 0.085 + t * 0.55 * dir, seed + c * 3) * 0.6 + k_n1((wx + lean) * 0.29 - t * 0.9, seed + 5 + c) * 0.4;
        const rr = clamp((ray - 0.2) * 1.9) * (0.35 + 0.9 * env) + clamp(fold * 0.9) * 0.55;
        let i = rr * Math.pow(1 - s, 1.2) * (s < 0.06 ? 1.55 : 1) * inten * sc;
        if (i < 0.07) continue;
        if (k_bay(x, y) >= clamp(i * 1.55)) continue;
        const q = clamp(1 - i * 1.0) * (GRc.length - 0.01);
        let col;
        if (s > 0.6 && vio > 0 && k_h(x * 3 + y, 9) < vio * 0.55 * k_sstep(0.6, 0.9, s)) col = DUc[Math.min(4, Math.floor(q * 0.8))];
        else if (s > 0.36) col = CYc[Math.min(4, Math.floor(q * 0.8))];
        else col = GRc[Math.floor(q)];
        b.d[(y - top) * LW + x] = col;
      }
    }
  }
  rgrad(LW / 2, y0 - hmax * 0.35, 10, 200, [[0, 'rgba(70,210,150,0.14)'], [1, 'rgba(70,210,150,0)']], inten, 'lighter');
  k_blit(b, 0, top);
}
// lueur colorée diffuse (reflet d'aurore sur la neige, halo chaud, feu) : cercle 'lighter'
function k_glow(x, y, r, col = '70,210,150', a = 0.2, o = {}) { rgrad(k_sx(x, o, 1), k_sy(y, o, 1), 2, r, [[0, `rgba(${col},${a})`], [0.5, `rgba(${col},${a * 0.4})`], [1, `rgba(${col},0)`]], 1, 'lighter'); }

// ════════════════════════════════════════════════════════════════════════════════════════
// 3. NUAGES (sprites ombrés à 5 tons, mis en cache ; dérive en monde, teintés par le ciel)
// ════════════════════════════════════════════════════════════════════════════════════════
// tons : [liseré, éclairé, corps, ombre, dessous] ; light : direction DE la lumière [lx, ly] (ly > 0 : éclairé par en dessous, coucher de soleil)
const K_CLOUD = {
  alaskaDusk: { tones: [NE[3], NI[9], NI[8], NI[6], NI[4]], light: [-0.8, -0.5] },
  alaskaNight: { tones: [NI[7], NI[5], NI[4], NI[3], NI[2]], light: [0.5, -0.8] },
  alaskaSpring: { tones: [WH[3], WH[2], NE[3], NE[1], NE[0]], light: [0.7, -0.6] },
  desertDusk: { tones: [YE[3], AM[8], RD[4], DU[5], DU[3]], light: [0.9, 0.55] },
  savannaDawn: { tones: [AM[10], AM[9], RD[5], DU[6], DU[4]], light: [0.8, 0.6] },
};
// nuage = union de sphères (cumulus) ou d'ellipsoïdes aplatis (bancs) : chaque pixel prend la normale de la sphère la plus proche de l'œil
function k_cloudShape(kind, w, h, seed) {
  const r = rng(seed), blobs = [];            // [cx, cy, rx, ry]
  if (kind === 'puff') {
    const base = h * 0.8, n = 4 + Math.floor(w / 26);
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n, e = Math.sin(f * Math.PI), rad = h * (0.2 + 0.3 * e * (0.5 + 0.5 * r())) + 2;
      blobs.push([w * (0.1 + 0.8 * f) + (r() - 0.5) * 5, base - rad * (0.6 + 0.45 * r()), rad, rad]);
    }
    for (let i = 0; i < 3; i++) { const f = 0.3 + r() * 0.4, rad = h * (0.2 + 0.15 * r()); blobs.push([w * f, base - h * 0.5 - r() * h * 0.1, rad, rad]); }
    return { blobs, base };
  }
  if (kind === 'bank') {
    const base = h * 0.74, n = 7 + Math.floor(w / 18);
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n, e = Math.pow(Math.sin(f * Math.PI), 0.7), ry = h * (0.14 + 0.24 * e * (0.4 + 0.6 * r())) + 1.5, rx = w / n * (0.9 + 0.9 * r()) + 3;
      blobs.push([w * (0.04 + 0.92 * f) + (r() - 0.5) * 4, base - ry * (0.55 + 0.3 * r()), rx, ry]);
    }
    return { blobs, base };
  }
  return { blobs, base: h };                   // 'wisp' : traité à part
}
function k_cloudSprite(preset, kind, w, h, seed) {
  return k_cache(`cl|${preset}|${kind}|${w}|${h}|${seed}`, () => {
    const C = K_CLOUD[preset] || K_CLOUD.alaskaDusk, im = k_img(w, h), T = C.tones.map(k_u32), r = rng(seed + 5);
    const [lx0, ly0] = C.light, lz = 0.55, ln = Math.hypot(lx0, ly0, lz), lx = lx0 / ln, ly = ly0 / ln, lzn = lz / ln;
    if (kind === 'wisp') {                                             // filaments : 4 à 6 traînées fines, dégradé tramé
      const n = 3 + Math.floor(h / 6);
      for (let i = 0; i < n; i++) {
        const y0 = 2 + r() * (h - 6), len = w * (0.35 + 0.6 * r()), x0 = (w - len) * r(), sl = (r() - 0.5) * 0.12, th = 1 + (r() < 0.4 ? 1 : 0), ph = r() * 9;
        for (let x = 0; x < len; x++) {
          const e = Math.sin(x / len * Math.PI), y = Math.round(y0 + sl * x + 1.4 * Math.sin(x * 0.09 + ph));
          for (let j = 0; j < th; j++) { const yy = y + j; if (yy < 0 || yy >= h || k_bay(x, yy) > e * 1.1 - 0.12) continue; im.d[yy * w + Math.round(x0 + x)] = (j === 0 && C.light[1] <= 0) || (j === th - 1 && C.light[1] > 0) ? T[0] : T[1 + (k_bay(x + 3, yy) < 0.4 ? 1 : 0)]; }
        }
      }
      im.x.putImageData(im.id, 0, 0); return im.c;
    }
    const { blobs, base } = k_cloudShape(kind, w, h, seed);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let best = -1, nx = 0, ny = 0;
      for (const b of blobs) {
        const dx = (x + 0.5 - b[0]) / b[2], dy = (y + 0.5 - b[1]) / b[3], d2 = dx * dx + dy * dy;
        if (d2 < 1) { const z = Math.sqrt(1 - d2); if (z > best) { best = z; nx = dx; ny = dy; } }
      }
      const yb = base + 1.2 * Math.sin(x * 0.3 + seed) + 0.7 * Math.sin(x * 0.77);
      if (best < 0 || y > yb) continue;
      let I = nx * lx + ny * ly + best * lzn;
      I += (ly0 > 0 ? 0 : -0.5) * clamp((y - base * 0.55) / (base * 0.45));          // le dessous est plus sombre (sauf éclairage rasant par en dessous)
      I += (k_bay(x, y) - 0.5) * 0.16;
      const tn = I > 0.78 ? 0 : I > 0.42 ? 1 : I > 0.0 ? 2 : I > -0.42 ? 3 : 4;
      im.d[y * w + x] = T[tn];
    }
    im.x.putImageData(im.id, 0, 0); return im.c;
  });
}
// bancs de nuages qui dérivent. o : preset, kind 'puff'|'bank'|'wisp'|'mix', n, y0, y1 (bande verticale), speed px/s (+ vers la droite), scale, cam, par (0.08), seed, alpha
function k_clouds(t, o = {}) {
  const preset = o.preset || 'alaskaDusk', kind = o.kind || 'mix', n = o.n ?? 5, y0 = o.y0 ?? 60, y1 = o.y1 ?? 150, sp = o.speed ?? 3, sc = o.scale ?? 1, seed = o.seed ?? 11, par = o.par ?? 0.08;
  const cam = (o.cam || 0) * par, r = rng(seed), per = LW + 340;
  L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = o.alpha ?? 1;
  const items = [];
  for (let i = 0; i < n; i++) {
    const kd = kind === 'mix' ? (['puff', 'bank', 'wisp', 'bank', 'puff'][i % 5]) : kind;
    const f = r(), y = y0 + (y1 - y0) * f, persp = 0.55 + 0.45 * (1 - f), x0 = r() * per, v = 0.7 + 0.6 * r(), vr = r();
    const w0 = kd === 'puff' ? 84 : kd === 'bank' ? 170 : 150, h0 = kd === 'puff' ? 44 : kd === 'bank' ? 30 : 16;
    const w = Math.round(w0 * sc * persp * (0.75 + 0.5 * vr)), h = Math.round(h0 * sc * persp * (0.8 + 0.4 * vr));
    items.push({ kd, y, x0, v, w, h, s: Math.floor(r() * 3) });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) {
    const spr = k_cloudSprite(preset, it.kd, it.w, it.h, it.s * 17 + it.w);
    const x = (((it.x0 + sp * it.v * t - cam) % per) + per) % per - 170;
    L.drawImage(spr, Math.round(x), Math.round(it.y));
  }
  L.globalAlpha = 1;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 4. RELIEFS : montagnes, collines, mesas, dunes, horizon de savane (silhouettes en cache, périodiques, parallaxe, brume tramée)
// ════════════════════════════════════════════════════════════════════════════════════════
// teintes par préréglage : rock (5 tons, sombre → clair), snow (4 tons), hill (3 tons), rim : liseré de lumière
const K_TERR = {
  alaskaDusk: { rock: [NI[1], NI[2], NI[3], NI[4], '#3d4a8c'], snow: ['#6a7cb4', '#a8bcd8', '#e6ecfa', '#ffeef2'], hill: [NI[1], NI[2], NI[3]], rim: '#ffe4ea' },
  alaskaNight: { rock: [NI[0], NI[1], NI[2], NI[3], NI[4]], snow: ['#1e2a60', '#3a4c96', '#6e8ed0', '#a8c4f0'], hill: [NI[0], NI[1], NI[2]], rim: '#8ab0f0' },
  alaskaSpring: { rock: [ST[2], ST[3], ST[4], ST[5], ST[6]], snow: ['#9ab2d4', '#cadaee', '#f6faff', '#fffaf0'], hill: [GR[1], GR[2], LM[2]], rim: '#fffdf2' },
  desertDusk: {
    rock: [DU[0], DU[1], DU[2], DU[3], DU[4]], snow: ['#8a5a8c', '#cf6b9a', '#ffa896', '#ffd890'], hill: [DU[0], DU[1], DU[2]], rim: '#ffd890',
    strata: ['#8a3a22', OC[3], '#a83a2a', OC[4], '#7a2a1c', SK[2]], warm: '#ffa850', cool: '#3a1a56', sand: [DU[2], DU[3], OC[3], AM[6], AM[8]],
  },
  savannaDawn: {
    rock: [DU[0], DU[1], DU[2], DU[3], DU[4]], snow: ['#8a5a8c', '#cf6b9a', '#ffa896', '#ffd890'], hill: [NI[1], DU[0], DU[1]], rim: '#ffe6a0',
    strata: [OC[1], OC[2], OC[3], OC[2]], warm: '#ffc070', cool: '#3a1a50', sand: [DU[1], DU[3], OC[3], AM[6], AM[8]],
  },
};
const k_foot = (col, foot, f) => f > 0.5 ? k_mix(col, foot, k_sstep(0.5, 1.0, f)) : col;       // le pied du relief converge vers une couleur uniforme (plan d'aplat qui se prolonge sans rayures)
const k_tone = (arr, f) => { f = clamp(f, 0, arr.length - 1.001); const i = Math.floor(f); return k_mix(arr[i], arr[i + 1], f - i); };

function k_buildRidge(p) {
  const S = K_SKY[p.preset], T = K_TERR[p.preset], mist = k_rgb(S.mist), sub = k_sub(p.sub || S.sub), per = p.span, hh = p.amp + 8 + p.depth, y0r = p.amp + 4, light = p.light ?? S.light;
  const amp = p.amp, top = new Float32Array(per), im = k_img(per, hh), alp = p.kind === 'alpine';
  const rockT = T.rock, snowT = T.snow, hillT = T.hill, rimC = k_rgb(p.rim || T.rim);
  const fx = f => Math.round(per * f) / per, pxn = f => Math.round(per * f), wrap = v => ((v % per) + per) % per, wd = v => { v = wrap(v); return v > per / 2 ? v - per : v; };
  const r = rng(p.seed * 13 + 7), owner = new Int16Array(per), peaks = [];
  if (alp) {
    // sommets : tentes à flancs concaves (cornes), hauteurs inégales ; les petites tentes font les épaules et les arêtes secondaires
    let x = r() * p.freq * 0.5;
    while (x < per) {
      const big = r() < 0.6, H = amp * (big ? 0.6 + 0.4 * r() : 0.25 + 0.3 * r()), w = H * (0.9 + 0.6 * r()) * (p.wide ?? 1);
      const pk = { c: x, H, w, eL: 1.2 + 0.7 * r(), eR: 1.2 + 0.7 * r(), ks: 0.35 + 0.55 * r() };
      peaks.push(pk);
      if (big) for (const sd of [-1, 1]) if (r() < 0.85) {              // épaules / pics satellites sur les flancs
        const off = sd * w * (0.32 + 0.3 * r()), e = sd < 0 ? pk.eL : pk.eR, pv = H * Math.pow(1 - Math.abs(off) / w, e), Hs = pv + H * (0.07 + 0.13 * r());
        peaks.push({ c: x + off, H: Hs, w: Hs * (0.7 + 0.5 * r()), eL: 1.1 + 0.6 * r(), eR: 1.1 + 0.6 * r(), ks: 0.35 + 0.55 * r() });
      }
      x += p.freq * (0.55 + 0.7 * r()) * (big ? 1 : 0.55);
    }
    const base = amp * 0.1;
    for (let x2 = 0; x2 < per; x2++) {
      let best = base, bi = 0;
      for (let i = 0; i < peaks.length; i++) {
        const pk = peaks[i], sdx = wd(x2 - pk.c), dx = Math.abs(sdx); if (dx >= pk.w) continue;
        const v = pk.H * Math.pow(1 - dx / pk.w, sdx < 0 ? pk.eL : pk.eR); if (v > best) { best = v; bi = i; }
      }
      const c7 = Math.round(per / 7), c2 = Math.round(per / 2.3), jit = (k_n1(x2 / per * c7, 5 + p.seed, c7) - 0.5) * 5 * Math.min(1, best / (amp * 0.5)) + (k_n1(x2 / per * c2, 6 + p.seed, c2) - 0.5) * 2.2;
      top[x2] = y0r - best - jit; owner[x2] = bi;
    }
  } else {
    const cells = Math.max(2, Math.round(per / p.freq) & ~1); let mx = 0, mn = 1e9;
    for (let x2 = 0; x2 < per; x2++) { const u = x2 / per * cells, v = 0.55 * k_n1(u, 1 + p.seed, cells) + 0.3 * k_n1(u * 2, 2 + p.seed, cells * 2) + 0.15 * k_n1(u * 4, 3 + p.seed, cells * 4); top[x2] = v; mx = Math.max(mx, v); mn = Math.min(mn, v); }
    for (let x2 = 0; x2 < per; x2++) top[x2] = y0r - amp * (top[x2] - mn) / (mx - mn);
  }
  const sl = new Float32Array(per);
  for (let x2 = 0; x2 < per; x2++) sl[x2] = (top[wrap(x2 + 4)] - top[wrap(x2 - 4)]) / 8;
  for (let x = 0; x < per; x++) {
    const tx = Math.round(top[x]), pk = alp ? peaks[owner[x]] : null, dxp = alp ? wd(x - pk.c) : 0;
    for (let y = Math.max(0, tx); y < hh; y++) {
      const d = Math.max(0, y - top[x]);
      const f = clamp((y - (y0r - amp * 0.2)) / (amp * 1.0 + 14)), contr = (1 - Math.pow(f, 1.25)) * (1 - 0.25 * p.haze);
      const hz = clamp(p.haze + (p.hazeBase - p.haze) * Math.pow(f, 1.1)) * 1;
      let col;
      if (alp) {
        const wig = (k_n1(d * 0.12 + owner[x] * 7.3, 21 + p.seed, 4096) - 0.5) * 6.5 + (k_n1(d * 0.04 + owner[x] * 3.1, 22 + p.seed, 4096) - 0.5) * 8;
        const u = dxp - wig * Math.min(1, d / 6), au = Math.abs(u), side = u >= 0 ? 1 : -1, lit = side * light > 0;
        const spx = 2 + pk.ks * Math.pow(d, 0.97), inner = au < spx;
        const q = au - pk.ks * d * 0.9, gn = k_n1(q * 0.42 + owner[x] * 5, 31 + p.seed, 4096), gull = gn > 0.76 ? 1 : 0, fine = k_h(x * 31 + y * 17, p.seed);
        let tn = lit ? (inner ? 3.1 : 2.4) : (inner ? 1.6 : 0.8);
        tn = 1.7 + contr * (tn - 1.7) - contr * 0.9 * gull + 0.1 * (fine - 0.5);
        const alt = (y0r - y) / amp, sg = k_n2(x * fx(0.05), y * 0.07, 41 + p.seed, pxn(0.05));
        const snowLine = (1 - p.snow) - 0.11 * (sg - 0.5) * 2 - 0.07 * gull + (inner ? 0 : 0.03);
        if (p.snow > 0 && alt > snowLine) {
          let sn = lit ? (inner ? 3.0 : 2.4) : (inner ? 1.35 : 0.7);
          sn = 1.8 + (0.35 + 0.65 * contr) * (sn - 1.8) - 0.55 * gull * contr + 0.1 * (fine - 0.5);
          col = k_tone(snowT, clamp(sn, 0, 3));
        } else col = k_tone(rockT, tn);
        if (d < 1.2 && lit) col = k_mix(col, rimC, 0.85 * (1 - p.haze * 0.6));
        else if (d < 2.2 && lit && inner) col = k_mix(col, rimC, 0.3);
      } else {
        const facing = sl[x] * light, lit = clamp(0.5 + facing * 3.4);
        const gn = k_n2(x * fx(0.12), y * 0.12, 61 + p.seed, pxn(0.12)), fine = k_h(x * 31 + y * 17, p.seed);
        const tn = 0.9 + contr * (1.3 * (lit - 0.5) + 0.6 * (gn - 0.5)) + 0.3 * (fine - 0.5) + (lit > 0.45 ? 0.5 * Math.pow(clamp(1 - d / 8), 2) : 0);
        col = k_tone(hillT, tn);
        if (d < 1.1 && lit > 0.4) col = k_mix(col, rimC, 0.7);
        if (p.snowy && d < p.snowy * (0.5 + 0.9 * gn)) col = k_tone(snowT, clamp(0.5 + 2.2 * lit + 0.5 * (fine - 0.5), 0, 3));
      }
      col = k_mix(k_foot(col, k_tone(alp ? rockT : hillT, alp ? 1.5 : 0.8), f), mist, hz);
      im.d[y * per + x] = k_snap(sub, col[0], col[1], col[2], x, y, f > 0.97 ? 0 : (p.dither ?? 17));
    }
  }
  if (p.trees > 0) {                                                   // épicéas / acacias lointains posés sur la crête
    const rt = rng(p.seed * 7 + 5), tc = k_mix(p.treeCol || hillT[0], mist, Math.min(0.9, p.haze + 0.05)), tl = k_mix(tc, rimC, 0.4 * (1 - p.haze));
    const cT = k_snap(sub, tc[0], tc[1], tc[2], 0, 0, 0), cL = k_snap(sub, tl[0], tl[1], tl[2], 1, 1, 0);
    for (let x = 2; x < per - 2; x++) {
      if (rt() > p.trees) continue;
      const base = Math.round(top[x]) + 2, ht = Math.round(p.treeH * (0.6 + 0.7 * rt())), wmax = Math.max(1, Math.round(p.treeH * 0.22));
      for (let j = 0; j < ht; j++) {
        const hw = Math.round((j / ht) * wmax * (j % 3 === 2 ? 0.6 : 1)), yy = base - (ht - j);
        for (let i = -hw; i <= hw; i++) { const xx = wrap(x + i); if (yy >= 0 && yy < hh) im.d[yy * per + xx] = (i === -hw * Math.sign(light) && hw > 0 && j > 1) ? cL : cT; }
      }
      x += Math.floor(rt() * 3) + 1;
    }
  }
  im.x.putImageData(im.id, 0, 0); return { c: im.c, top, y0r, hh, per };
}
// rampes par plan (tier 0 lointain, 1 moyen, 2 proche) : couleurs de palette du sombre au clair ; mist = couleur exacte de la brume qui monte au pied du relief
const K_TIERS = {
  desertDusk: [
    { ramp: [DU[3], DU[4], DU[5], DU[6]], mist: DU[6], rim: AM[8] },
    { ramp: [DU[1], DU[2], DU[3], DU[4], DU[5], '#d85a7a'], mist: DU[5], rim: AM[8] },
    { ramp: [DU[0], DU[1], '#6e1226', RD[2], OC[3], OC[4], AM[7], AM[8]], mist: DU[3], rim: AM[9] },
  ],
  savannaDawn: [
    { ramp: [DU[4], DU[5], DU[6], DU[7], RD[5]], mist: RD[5], rim: AM[10] },
    { ramp: [DU[1], DU[3], DU[4], DU[5], DU[6]], mist: DU[6], rim: AM[9] },
    { ramp: [DU[0], DU[1], WO[1], OC[2], OC[3], AM[6], AM[7], AM[8]], mist: DU[4], rim: AM[9] },
  ],
};
const k_hzFoot = (hz, hb, f) => { const e = Math.round(hb), w = k_sstep(0.82, 1.0, f); return hz + (e - hz) * w; };       // brume au pied : tend vers 0 ou 1 exactement (pas de motif tramé dans l'aplat prolongé)
const k_stops = ramp => k_prep(ramp.map((c, i) => [i / (ramp.length - 1), c]));
const k_vOf = (ramp, i) => i / (ramp.length - 1);                         // position exacte (sans tramage) du ton i
// couleur du relief : v ∈ [0,1] sur la rampe (tramage de Bayer), puis brume tramée vers la couleur de brume
function k_pickT(st, mistU, v, hz, x, y) {
  if (hz > 0 && k_bay(x + 2, y + 1) < hz) return mistU;
  return k_ramp(st, clamp(v), x, y, 2.4);
}
function k_tier(p) { const T = K_TIERS[p.preset] || K_TIERS.desertDusk, t = T[Math.max(0, Math.min(2, p.tier ?? 1))]; return { ramp: t.ramp, st: k_stops(t.ramp), mistU: k_u32(t.mist), rimU: k_u32(t.rim), n: t.ramp.length }; }
// ── mesas : buttes à parois striées, éboulis, liseré de soleil
function k_buildMesa(p) {
  const S = K_SKY[p.preset], per = p.span, amp = p.amp, hh = amp + 8 + p.depth, y0r = amp + 4, light = p.light ?? S.light, TR = k_tier(p);
  const top = new Float32Array(per), im = k_img(per, hh), own = new Int16Array(per), wrap = v => ((v % per) + per) % per, wd = v => { v = wrap(v); return v > per / 2 ? v - per : v; };
  const r = rng(p.seed * 17 + 3), ms = [];
  let x = r() * p.freq * 0.3;
  while (x < per) {
    const k = r(); let hw, H;
    if (k < 0.16) { hw = 2 + r() * 2.5; H = amp * (0.6 + 0.4 * r()); }                       // aiguille
    else if (k < 0.5) { hw = 7 + r() * 9; H = amp * (0.5 + 0.45 * r()); }                    // butte
    else { hw = 20 + r() * p.freq * 0.3; H = amp * (0.38 + 0.4 * r()); }                     // mesa
    const step = hw > 12 && r() < 0.6 ? { x: (r() - 0.5) * hw * 1.2, d: H * (0.1 + 0.12 * r()) * (r() < 0.5 ? -1 : 1) } : null;
    ms.push({ c: x, hw, H, Ht: H * (0.28 + 0.12 * r()), cw: 1.5 + r() * 2.5, tw: H * (0.5 + 0.5 * r()), sd: r() * 50, step });
    x += hw * 2 + p.freq * (0.4 + 0.9 * r());
  }
  for (let x2 = 0; x2 < per; x2++) {
    let best = 0, bi = -1;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i], sdx = wd(x2 - m.c), dx = Math.abs(sdx); let v = 0;
      const HH = m.H + (m.step && sdx > m.step.x ? m.step.d : 0);
      if (dx < m.hw) v = HH; else if (dx < m.hw + m.cw) { const He = m.H + (m.step && sdx > 0 ? m.step.d : 0); v = He + (m.Ht - He) * (dx - m.hw) / m.cw; } else if (dx < m.hw + m.cw + m.tw) v = m.Ht * Math.pow(1 - (dx - m.hw - m.cw) / m.tw, 1.4);
      if (v > best) { best = v; bi = i; }
    }
    const c3 = Math.round(per / 3);
    top[x2] = y0r - best - (best > 2 ? (k_n1(x2 / per * c3, 4 + p.seed, c3) - 0.5) * 2 : 0); own[x2] = best > 1 ? bi : -1;
  }
  const vFoot = k_vOf(TR.ramp, 1);
  for (let x2 = 0; x2 < per; x2++) {
    const tx = Math.round(top[x2]), m = own[x2] >= 0 ? ms[own[x2]] : null;
    for (let y = Math.max(0, tx); y < hh; y++) {
      const d = y - top[x2], alt = y0r - y, f = clamp((y - (y0r - amp * 0.1)) / (amp * 0.9 + 10)), hz = k_hzFoot(clamp(p.haze + (p.hazeBase - p.haze) * Math.pow(f, 1.2)), p.hazeBase, f);
      let v = vFoot, fine = k_h(x2 * 13 + y * 7, p.seed), rim = false;
      if (m) {
        const dx = wd(x2 - m.c), u = dx / (m.hw + m.cw), onWall = Math.abs(dx) < m.hw + m.cw && alt > m.Ht - 1;
        if (onWall) {
          const bh = Math.max(4, amp * 0.1), aw = alt + m.sd + 1.5 * Math.sin(x2 * 0.13 + m.sd) + 0.8 * Math.sin(x2 * 0.41), b = Math.floor(aw / bh), seam = (aw % bh) < 1;
          const gn = k_n2(x2 * 0.38, alt * 0.035, 8 + p.seed);
          let lf = k_sstep(0.25, 1.05, u * light) * 0.95;
          if (Math.abs(u) > 0.9) lf = u * light > 0 ? 1 : 0;
          v = 0.14 + 0.3 * k_h(b, p.seed + 5) + (lf - 0.3) * 0.5 + (gn > 0.7 ? -0.13 : 0) + (seam ? -0.1 : 0) + (fine - 0.5) * 0.06;
          if (d < 1.3) { v = 0.5 + 0.5 * lf; rim = lf > 0.4; }
        } else {
          const facing = (dx > 0 ? 1 : -1) * light;
          v = 0.3 + (facing > 0 ? 0.28 : -0.05) + (fine - 0.5) * 0.14;
          if (d < 1.3 && facing > 0) rim = true;
        }
      }
      const sf = k_sstep(0.5, 1.0, f); v = v + (vFoot - v) * sf;
      im.d[y * per + x2] = (rim && f < 0.5 && hz < 0.6) ? TR.rimU : k_pickT(TR.st, TR.mistU, v, hz, x2, y);
    }
  }
  im.x.putImageData(im.id, 0, 0); return { c: im.c, top, y0r, hh, per };
}
// ── dunes : face au vent douce et éclairée, face d'avalanche raide à l'ombre, rides
function k_buildDune(p) {
  const S = K_SKY[p.preset], per = p.span, amp = p.amp, hh = amp + 8 + p.depth, y0r = amp + 4, light = p.light ?? S.light, TR = k_tier(p);
  const top = new Float32Array(per), im = k_img(per, hh), wrap = v => ((v % per) + per) % per, wd = v => { v = wrap(v); return v > per / 2 ? v - per : v; };
  const r = rng(p.seed * 19 + 1), ds = [];
  let x = r() * p.freq * 0.5;
  while (x < per) { const sp = p.freq * (0.7 + 0.6 * r()); ds.push({ c: x, sp, H: amp * (0.45 + 0.55 * r()), run: [sp * (light > 0 ? 0.3 : 0.7), sp * (light > 0 ? 0.7 : 0.3)] }); x += sp * (0.7 + 0.5 * r()); }
  for (let x2 = 0; x2 < per; x2++) {
    let best = 0;
    for (const d of ds) { const dx = wd(x2 - d.c), run = dx < 0 ? d.run[0] : d.run[1]; if (Math.abs(dx) < run) best = Math.max(best, d.H * Math.pow(Math.cos(Math.abs(dx) / run * Math.PI / 2), 1.15)); }
    top[x2] = y0r - best;
  }
  const sl = new Float32Array(per); for (let x2 = 0; x2 < per; x2++) sl[x2] = (top[wrap(x2 + 2)] - top[wrap(x2 - 2)]) / 4;
  const vFoot = k_vOf(TR.ramp, 1);
  for (let x2 = 0; x2 < per; x2++) {
    const tx = Math.round(top[x2]), facing = sl[x2] * light;
    for (let y = Math.max(0, tx); y < hh; y++) {
      const d = y - top[x2], f = clamp((y - (y0r - amp * 0.15)) / (amp * 0.9 + 8)), hz = k_hzFoot(clamp(p.haze + (p.hazeBase - p.haze) * Math.pow(f, 1.2)), p.hazeBase, f), fine = k_h(x2 * 13 + y * 7, p.seed);
      let v, rim = false;
      if (facing > 0.04) {
        const rip = (((d + 1.6 * Math.sin(x2 * 0.19 + p.seed) + 0.8 * Math.sin(x2 * 0.43)) % 3.6) + 3.6) % 3.6 < 0.9;
        v = 0.78 - d / 90 + 0.1 * (fine - 0.5) - (rip ? 0.1 : 0); if (d < 1.2) rim = true;
      } else v = 0.3 + 0.15 * clamp(d / 30) + 0.1 * (fine - 0.5) - (facing < -0.15 && fine < 0.1 ? 0.07 : 0);
      const sf = k_sstep(0.5, 1.0, f); v = v + (vFoot - v) * sf;
      im.d[y * per + x2] = (rim && f < 0.5 && hz < 0.6) ? TR.rimU : k_pickT(TR.st, TR.mistU, v, hz, x2, y);
    }
  }
  im.x.putImageData(im.id, 0, 0); return { c: im.c, top, y0r, hh, per };
}
// ── horizon de savane : ligne d'herbe dorée avec acacias et baobabs miniatures en silhouette, brume
function k_acacia(im, per, hh, cx, base, h, col, rimCol, light) {
  const set = (x, y, c) => { x = ((Math.round(x) % per) + per) % per; y = Math.round(y); if (y >= 0 && y < hh) im.d[y * per + x] = c; };
  const tw = Math.max(1, Math.round(h * 0.09)), th = Math.round(h * 0.55);
  for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) set(cx + i - (j > th * 0.6 ? Math.round((j - th * 0.6) * 0.3) : 0), base - j, col);
  const cw = Math.round(h * 0.95), ch = Math.max(2, Math.round(h * 0.3)), cy = base - th - Math.round(ch * 0.2);
  for (let j = 0; j < ch; j++) { const f = (j + 0.5) / ch, hw = Math.round(cw / 2 * Math.sqrt(1 - Math.pow(f * 2 - 1, 2)) * (j < ch * 0.5 ? 1 : 0.85)); for (let i = -hw; i <= hw; i++) set(cx + i, cy - Math.round(ch / 2) + j, (j === 0 && (i * light > -hw * 0.2)) ? rimCol : col); }
}
function k_baobab(im, per, hh, cx, base, h, col, rimCol, light) {
  const set = (x, y, c) => { x = ((Math.round(x) % per) + per) % per; y = Math.round(y); if (y >= 0 && y < hh) im.d[y * per + x] = c; };
  const tw = Math.max(3, Math.round(h * 0.32)), th = Math.round(h * 0.7);
  for (let j = 0; j < th; j++) { const f = j / th, w2 = Math.round(tw / 2 * (1.15 - 0.45 * Math.pow(f, 0.8) + 0.2 * Math.pow(1 - f, 4))); for (let i = -w2; i <= w2; i++) set(cx + i, base - j, (i * light >= w2 - 0.5 && f > 0.1) ? rimCol : col); }
  const by = base - th;
  for (let k = -3; k <= 3; k++) { const ex = cx + k * Math.max(2, h * 0.14), ey = by - Math.round(h * (0.22 - Math.abs(k) * 0.03)); for (let s = 0; s <= 6; s++) set(cx + (ex - cx) * s / 6, by + (ey - by) * s / 6, col); for (let i = -1; i <= 1; i++) set(ex + i, ey - 1, col); }
}
function k_buildSavanna(p) {
  const S = K_SKY[p.preset], per = p.span, amp = p.amp, hh = amp + 14 + p.depth, y0r = amp + 10, light = p.light ?? S.light, TR = k_tier(p);
  const top = new Float32Array(per), im = k_img(per, hh), wrap = v => ((v % per) + per) % per, r = rng(p.seed * 23 + 9);
  const cells = Math.max(2, Math.round(per / p.freq) & ~1);
  for (let x = 0; x < per; x++) { const u = x / per * cells; top[x] = y0r - amp * (0.55 * k_n1(u, 1 + p.seed, cells) + 0.3 * k_n1(u * 2, 2 + p.seed, cells * 2) + 0.15 * k_n1(u * 4, 3 + p.seed, cells * 4)); }
  const vFoot = k_vOf(TR.ramp, 1);
  for (let x = 0; x < per; x++) {
    const tx = Math.round(top[x]);
    for (let y = Math.max(0, tx); y < hh; y++) {
      const d = y - top[x], f = clamp((y - y0r + amp * 0.6) / (amp * 0.6 + p.depth * 0.7)), hz = k_hzFoot(clamp(p.haze + (p.hazeBase - p.haze) * Math.pow(f, 1.1)), p.hazeBase, f), fine = k_h(x * 13 + y * 7, p.seed);
      const sg = k_n2(x * 0.5, y * 0.3, 77 + p.seed), blade = k_n2(x * 0.9, y * 0.18, 79 + p.seed);
      let v = 0.22 + 0.5 * Math.pow(clamp(1 - d / 10), 1.2) + 0.12 * (sg - 0.5) + (blade > 0.74 && d < 14 ? 0.1 : 0) + 0.05 * (fine - 0.5);
      const sf = k_sstep(0.5, 1.0, f); v = v + (vFoot - v) * sf;
      im.d[y * per + x] = (d < 1.2 && hz < 0.7) ? TR.rimU : k_pickT(TR.st, TR.mistU, v, hz, x, y);
    }
  }
  const tcol = k_u32(TR.ramp[1]), cL = TR.rimU, cT = hz0(TR);
  function hz0(T) { return p.haze > 0.5 ? T.st[1][2] : T.st[0][2]; }
  let x = r() * 30;
  while (x < per) {
    const k = r(), h = Math.round(p.treeH * (0.7 + 0.6 * r())), by = Math.round(top[wrap(Math.round(x))]) + 1;
    if (k < p.trees) { if (r() < p.baobab) k_baobab(im, per, hh, x, by, Math.round(h * 1.15), cT, cL, light); else k_acacia(im, per, hh, x, by, h, cT, cL, light); }
    x += 10 + r() * (p.freq * 0.5);
  }
  im.x.putImageData(im.id, 0, 0); return { c: im.c, top, y0r, hh, per };
}
// couche de relief générique. o : preset, kind 'alpine'|'hills', y (ligne de crête moyenne à l'écran), amp, freq, seed, par, cam, haze (brume en haut) / hazeBase (en bas), snow, depth, trees…
function k_ridge(preset, t, o = {}) {
  const p = {
    preset, kind: o.kind || 'alpine', seed: o.seed ?? 1, amp: Math.round(o.amp ?? 70), freq: o.freq ?? 70, span: o.span ?? 720, depth: Math.round(o.depth ?? 130),
    haze: o.haze ?? 0.5, hazeBase: o.hazeBase ?? 1, snow: o.snow ?? 0.6, snowy: o.snowy ?? 0, trees: o.trees ?? 0, treeH: o.treeH ?? 9, treeCol: o.treeCol, rim: o.rim, light: o.light, dither: o.dither, sub: o.sub, wide: o.wide ?? 1, baobab: o.baobab ?? 0.15, tier: o.tier ?? 1,
  };
  const key = 'ridge|' + Object.values(p).join('|'), R_ = k_cache(key, () => ({ mesa: k_buildMesa, dune: k_buildDune, savanna: k_buildSavanna }[p.kind] || k_buildRidge)(p));
  const par = o.par ?? 0.2, ox = Math.round(((o.cam || 0) * par) % p.span), y = Math.round(k_sy(o.y ?? 220, o, par) - R_.y0r);
  L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = o.alpha ?? 1;
  for (let k = -1; k <= 1; k++) { const x = k * p.span - ox + Math.round(o.dx || 0); if (x < LW && x + p.span > 0) L.drawImage(R_.c, x, y); }
  const bottom = o.base ?? LH, yb = y + R_.hh;
  if (bottom > yb) for (let k = -1; k <= 1; k++) { const x = k * p.span - ox + Math.round(o.dx || 0); if (x < LW && x + p.span > 0) L.drawImage(R_.c, 0, R_.hh - 1, p.span, 1, x, yb, p.span, bottom - yb); }
  L.globalAlpha = 1;
}
// chaîne de montagnes enneigées de l'Alaska : 3 à 4 plans qui se fondent dans la brume du ciel. o : y (ligne de crête du premier plan), amp, snow, layers, cam, seed
function k_mountains(preset, t, o = {}) {
  const y = o.y ?? 230, a = o.amp ?? 1, n = o.layers ?? 4, cam = o.cam, sd = o.seed ?? 1, lay = [
    { y: y - 22, amp: 56 * a, freq: 150, wide: 1.5, par: 0.08, haze: 0.62, hazeBase: 1, snow: 0.97, depth: 60, seed: sd * 3 + 1 },
    { y: y - 6, amp: 86 * a, freq: 112, wide: 1.0, par: 0.16, haze: 0.4, hazeBase: 1, snow: 0.85, depth: 70, seed: sd * 3 + 2 },
    { y: y + 10, amp: 62 * a, freq: 92, wide: 1.15, par: 0.28, haze: 0.2, hazeBase: 0.95, snow: 0.75, depth: 80, seed: sd * 3 + 3 },
    { y: y + 24, amp: 42 * a, freq: 70, wide: 0.9, par: 0.42, haze: 0.04, hazeBase: 0.9, snow: 0.55, depth: 90, seed: sd * 3 + 4 },
  ].slice(4 - n);
  for (const l of lay) k_ridge(preset, t, { ...l, cam, kind: 'alpine', snow: (o.snow ?? 1) * l.snow, base: o.base });
}
// collines douces (option : trees > 0 → forêt d'épicéas lointains). o : y, amp, par, haze, trees (0..1), treeH, snowy
function k_hills(preset, t, o = {}) { k_ridge(preset, t, { kind: 'hills', amp: 26, freq: 60, haze: 0.4, par: 0.35, depth: 60, ...o }); }

// buttes et mesas du désert (strates rouges, éboulis), 3 plans par défaut. o : y, amp, layers, cam, seed
function k_mesas(preset, t, o = {}) {
  const y = o.y ?? 250, a = o.amp ?? 1, n = o.layers ?? 3, cam = o.cam, sd = o.seed ?? 1, lay = [
    { y: y - 8, amp: 40 * a, freq: 120, par: 0.1, haze: 0, hazeBase: 0.4, depth: 50, seed: sd * 3 + 1, tier: 0 },
    { y: y + 8, amp: 52 * a, freq: 140, par: 0.2, haze: 0, hazeBase: 0.5, depth: 60, seed: sd * 3 + 2, tier: 1 },
    { y: y + 26, amp: 60 * a, freq: 190, par: 0.34, haze: 0, hazeBase: 0.4, depth: 70, seed: sd * 3 + 3, tier: 2 },
  ].slice(3 - n);
  for (const l of lay) k_ridge(preset, t, { ...l, cam, kind: 'mesa', base: o.base });
}
// dunes (sable éclairé / face d'ombre). o : y, amp, layers, cam, seed
function k_dunes(preset, t, o = {}) {
  const y = o.y ?? 290, a = o.amp ?? 1, n = o.layers ?? 2, cam = o.cam, sd = o.seed ?? 1, lay = [
    { y: y, amp: 26 * a, freq: 120, par: 0.4, haze: 0, hazeBase: 0.5, depth: 50, seed: sd * 3 + 1, tier: 1 },
    { y: y + 26, amp: 34 * a, freq: 150, par: 0.7, haze: 0, hazeBase: 0.3, depth: 60, seed: sd * 3 + 2, tier: 2 },
  ].slice(2 - n);
  for (const l of lay) k_ridge(preset, t, { ...l, cam, kind: 'dune', base: o.base });
}
// horizon de savane : herbe dorée à contre-jour, acacias et baobabs lointains, 2 plans. o : y, layers, trees (0..1), cam, seed
function k_horizon(preset, t, o = {}) {
  const y = o.y ?? 262, n = o.layers ?? 2, cam = o.cam, sd = o.seed ?? 1, tr = o.trees ?? 0.7, lay = [
    { y: y, amp: 10, freq: 150, par: 0.12, haze: 0, hazeBase: 0.5, depth: 40, seed: sd * 3 + 1, treeH: 9, trees: tr * 0.8, baobab: 0.2, tier: 0 },
    { y: y + 18, amp: 14, freq: 110, par: 0.3, haze: 0, hazeBase: 0.4, depth: 60, seed: sd * 3 + 2, treeH: 16, trees: tr, baobab: 0.12, tier: 2 },
  ].slice(2 - n);
  for (const l of lay) k_ridge(preset, t, { ...l, cam, kind: 'savanna', base: o.base });
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 5. ATMOSPHÈRE : brume tramée, rayons de lumière, vignette, vent, caméra
// ════════════════════════════════════════════════════════════════════════════════════════
// brume basse tramée : bande y0 → y1 de la couleur donnée, alpha 0..1 au plus dense. o : profile 'mid'|'bottom'|'top', cam, par (0.5), speed (px/s), scale, seed, wisp (0..1)
function k_haze(y0, y1, color, alpha, o = {}, t = 0) {
  if (typeof o === 'number') { t = o; o = {}; }
  t = o.t ?? t;
  y0 = Math.max(0, Math.round(y0)); y1 = Math.min(LH, Math.round(y1)); const H = y1 - y0; if (H <= 0 || alpha <= 0) return;
  const b = k_tmp('haze', LW, H), c = k_u32(color), seed = o.seed ?? 5, prof = o.profile || 'mid', cam = (o.cam || 0) * (o.par ?? 0.5), sp = o.speed ?? 5, sc = o.scale ?? 1, wisp = o.wisp ?? 0.7;
  for (let y = 0; y < H; y++) {
    const f = y / Math.max(1, H - 1);
    let pr = prof === 'bottom' ? Math.pow(f, 1.3) : prof === 'top' ? Math.pow(1 - f, 1.3) : Math.sin(Math.pow(f, 0.8) * Math.PI);
    pr = clamp(pr);
    for (let x = 0; x < LW; x++) {
      const wx = (x + cam - sp * t) * 0.011 / sc, n = k_n2(wx, (y0 + y) * 0.06 / sc, seed) * 0.6 + k_n2(wx * 2.7 + 5, (y0 + y) * 0.17 / sc, seed + 2) * 0.4;
      const d = alpha * pr * (1 - wisp + wisp * clamp((n - 0.25) * 1.9));
      if (k_bay(x, y0 + y) < d) b.d[y * LW + x] = c;
    }
  }
  k_blit(b, 0, y0);
}
// rayons de lumière à travers la brume ou le feuillage : faisceaux issus de (x, y) (soleil, trouée de la canopée), tramés, qui respirent.
// o : angle (rad, 0 = vers la droite, π/2 = vers le bas), spread (ouverture totale), len, n (nombre de faisceaux), strength (0.4), col, col2 (cœur), canopy (0..1 : ajoure par des feuilles), cam, par, seed
function k_rays(x, y, t, o = {}) {
  if (typeof t === 'object') { o = t; t = o.t ?? 0; }
  const ang = o.angle ?? Math.PI * 0.5, spread = o.spread ?? 0.9, len = o.len ?? 300, st = o.strength ?? 0.4, col = k_u32(o.col ?? AM[9]), col2 = k_u32(o.col2 ?? YE[3]), seed = o.seed ?? 3, n = o.n ?? 8;
  const sx = k_sx(x, o, 0.04), sy = k_sy(y, o, 0.04), canopy = o.canopy ?? 0, cam = (o.cam || 0) * (o.par ?? 0.6);
  const x0 = Math.max(0, Math.floor(sx - len)), x1 = Math.min(LW, Math.ceil(sx + len)), y0 = Math.max(0, Math.floor(sy - len)), y1 = Math.min(LH, Math.ceil(sy + len));
  const w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return;
  const bm = []; for (let k = 0; k < n; k++) { const f = (k + 0.5) / n, hk = k_h(k, seed); bm.push([ang + (f - 0.5) * spread + (hk - 0.5) * spread / n * 0.7 + 0.012 * Math.sin(t * 0.3 + k * 2.1), 0.022 + 0.05 * k_h(k, seed + 1), 0.45 + 0.55 * k_h(k, seed + 2), 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.35 + 0.3 * hk) + k * 1.9))]); }
  if (!o.stipple) {                                                   // faisceaux doux : éclaircissement additif (le tramage de la palette fait le reste)
    const rgb = k_rgb(o.col ?? AM[9]);
    L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'lighter';
    for (const bk of bm) {
      for (const [wm, am] of [[1.0, 0.35], [0.62, 0.4], [0.3, 0.5]]) {
        const a0 = bk[0] - bk[1] * wm * 1.6, a1 = bk[0] + bk[1] * wm * 1.6, ex = sx + Math.cos(bk[0]) * len, ey = sy + Math.sin(bk[0]) * len;
        const g = L.createLinearGradient(sx, sy, ex, ey), al = st * bk[2] * bk[3] * am * 0.5;
        g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${al})`); g.addColorStop(0.55, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${al * 0.6})`); g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
        L.fillStyle = g; L.beginPath(); L.moveTo(sx, sy); L.lineTo(sx + Math.cos(a0) * len * 1.05, sy + Math.sin(a0) * len * 1.05); L.lineTo(sx + Math.cos(a1) * len * 1.05, sy + Math.sin(a1) * len * 1.05); L.closePath(); L.fill();
      }
    }
    L.restore(); return;
  }
  const b = k_tmp('rays', w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = x0 + i - sx, dy = y0 + j - sy, r2 = dx * dx + dy * dy; if (r2 < 9 || r2 > len * len) continue;
    let da = Math.atan2(dy, dx) - ang; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > spread * 0.5 + 0.2) continue;
    const th = da + ang; let I = 0;
    for (const bk of bm) { let q = th - bk[0]; q = Math.atan2(Math.sin(q), Math.cos(q)); const g = q / bk[1]; if (Math.abs(g) < 2.6) I += bk[2] * bk[3] * Math.exp(-g * g); }
    if (I < 0.03) continue;
    const r = Math.sqrt(r2), fall = Math.pow(1 - r / len, 0.9) * k_sstep(0, 0.06, r / len);
    let dens = st * I * fall * 1.5;
    if (canopy > 0) dens *= 1 - canopy * clamp((k_n2((x0 + i + cam) * 0.085 + t * 0.12, (y0 + j) * 0.11, seed + 4) - 0.32) * 2.6);
    if (k_bay(x0 + i, y0 + j) < dens) b.d[j * w + i] = dens > 0.45 ? col2 : col;
  }
  k_blit(b, x0, y0);
}
// vignette chaude (bords brun-orangé) ou froide (o.cold : bleu nuit). a : force 0..1
function k_vignetteWarm(a = 0.5, o = {}) {
  const col = o.col ?? (o.cold ? '8,12,44' : '58,16,8');
  vignette(a, o.r0 ?? 90, o.r1 ?? 290, o.cx ?? LW / 2, o.cy ?? LH / 2, col);
}
// vent partagé : oscillation douce + rafales, ≈ −0.7 à +1 (positif = vers la droite). x : position monde (le vent se propage), ph : phase propre à l'objet
function k_wind(t, x = 0, ph = 0) {
  const base = 0.45 * Math.sin(1.1 * t + 0.022 * x + ph) + 0.25 * Math.sin(2.3 * t + 0.045 * x + 1.7 * ph);
  const g = Math.max(0, Math.sin(0.31 * t + 0.004 * x + 0.5 * ph)), G = g * g * g;
  return clamp(base * (0.55 + 0.9 * G) + 0.6 * G, -1, 1);
}
// déplacement de caméra : de a à b en dur secondes (u en secondes depuis le début du plan). ease : 'lin' | 'io' | 'o' | 'i' | fonction
function k_pan(u, a, b, ease = 'io', dur = 1) {
  const f = typeof ease === 'function' ? ease : { lin: lin, io: eio, o: eo, i: ei, sm: sm }[ease] || eio;
  return a + (b - a) * f(clamp(u / dur));
}
// caméra à images-clés [[u, x, y], …] (interpolation douce) → { x, y }
function k_cam(u, keys) { return { x: tab(keys.map(k => [k[0], k[1]]), u), y: tab(keys.map(k => [k[0], k[2] ?? 0]), u) }; }

// ════════════════════════════════════════════════════════════════════════════════════════
// 6. EAU : mare qui reflète le décor, ruisseau, flaque, éclaboussures, gouttes
// ════════════════════════════════════════════════════════════════════════════════════════
const K_WATER = {
  alaskaDusk: { tint: [26, 38, 104], a0: 0.22, a1: 0.5, hi: NI[9], lo: NI[3], deep: NI[2] },
  alaskaNight: { tint: [6, 10, 46], a0: 0.2, a1: 0.5, hi: GR[4], lo: NI[1], deep: NI[1] },
  alaskaSpring: { tint: [40, 116, 156], a0: 0.2, a1: 0.5, hi: WH[3], lo: CY[1], deep: CY[0] },
  desertDusk: { tint: [96, 30, 100], a0: 0.2, a1: 0.5, hi: AM[8], lo: DU[1], deep: DU[1] },
  savannaDawn: { tint: [120, 56, 104], a0: 0.2, a1: 0.5, hi: AM[9], lo: DU[2], deep: DU[2] },
};
// mare / lac : miroir du décor déjà dessiné au-dessus (axe = ligne d'horizon), ondulé, teinté, avec rides et scintillement.
// À appeler APRÈS le ciel et les reliefs. o : t, preset, x0, x1, shape 'rect'|'ellipse', axis (ligne d'horizon, défaut y0−1), k (compression 0.85), ripple (1), tint, sun {x, y} (traînée de lumière), calm (0..1), cam, bank (true)
function k_pond(y0, y1, o = {}) {
  const t = o.t ?? 0, W_ = K_WATER[o.preset] || K_WATER.alaskaDusk, x0 = Math.round(o.x0 ?? 0), x1 = Math.round(o.x1 ?? LW), W = x1 - x0, H = Math.round(y1 - y0);
  if (H <= 0 || W <= 0) return;
  const axis = o.axis ?? y0 - 1, kq = o.k ?? 0.85, rip = (o.ripple ?? 1) * (1 - 0.7 * (o.calm ?? 0)), ell = o.shape === 'ellipse', cx = (x0 + x1) / 2, rx = W / 2, ry = H / 2, tint = o.tint || W_.tint;
  const ext = r => { if (!ell) return [x0, x1]; const k = 1 - Math.pow((r + 0.5 - ry) / ry, 2), hw = Math.max(0, Math.floor(rx * Math.sqrt(Math.max(0, k)) + 0.3)); return [cx - hw, cx + hw]; };
  L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1;
  // 1. miroir : une ligne du décor par ligne d'eau, décalée par l'ondulation
  L.fillStyle = W_.deep;
  for (let r = 0; r < H; r++) {
    const y = y0 + r, [a, b] = ext(r), wS = b - a; if (wS <= 0) continue;
    L.fillRect(a, y, wS, 1);
    const sy = Math.round(axis - (y - axis) * kq); if (sy < 0) continue;
    const amp = (0.35 + 1.7 * (r / H)) * rip, dx = Math.round(amp * (Math.sin(r * 0.62 + t * 1.9 + (o.seed ?? 1)) + 0.5 * Math.sin(r * 1.37 - t * 1.1)) + 0.7 * rip * (k_n1(r * 0.35 + t * 0.9, 3) - 0.5) * 2);
    let sx = a - dx, dw = wS; if (sx < 0) { dw += sx; sx = 0; } if (sx + dw > LW) dw = LW - sx; if (dw <= 0) continue;
    L.drawImage(low, sx, sy, dw, 1, sx + dx, y, dw, 1);
  }
  // 2. teinte : plus claire au loin, plus sombre vers soi
  const g = L.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(${tint[0]},${tint[1]},${tint[2]},${W_.a0})`); g.addColorStop(1, `rgba(${tint[0]},${tint[1]},${tint[2]},${W_.a1})`);
  L.save(); if (ell) { L.beginPath(); L.ellipse(cx, y0 + ry, rx, ry, 0, 0, TAU); L.clip(); } else { L.beginPath(); L.rect(x0, y0, W, H); L.clip(); }
  L.fillStyle = g; L.fillRect(x0, y0, W, H);
  // 3. rides : traits clairs / sombres qui dérivent, plus nombreux et plus larges vers le premier plan
  const cam = (o.cam || 0) * (o.par ?? 1), nR = Math.round(H * W / 260 * (o.density ?? 1));
  for (let i = 0; i < nR; i++) {
    const hx = k_h(i, 11), hy = k_h(i, 12), hl = k_h(i, 13), pw = Math.pow(hy, 1.5), r = Math.floor(pw * (H - 1)), y = y0 + r, [a, b] = ext(r);
    const len = Math.round((2 + 9 * hl) * (0.45 + 1.1 * r / H)), sp = (3 + 5 * hl) * (0.4 + r / H) * (1 - 0.8 * (o.calm ?? 0)), wob = Math.sin(t * 0.8 + i) * 1.5;
    const xx = a + ((hx * (b - a + 20) + t * sp * (hl > 0.5 ? 1 : -1) * 0.5 - cam * 0.3) % (b - a + 20) + (b - a + 20)) % (b - a + 20) - 10 + wob;
    if (xx + len < a || xx > b) continue;
    L.fillStyle = hl > 0.45 ? W_.hi : W_.lo; if (hl > 0.45 && hl < 0.58) L.fillStyle = CY[4] === W_.hi ? WH[3] : W_.hi;
    L.fillRect(Math.round(xx), y, len, 1);
  }
  // 4. traînée de lumière du soleil
  if (o.sun) {
    const sxp = o.sun.x, n = Math.round(H * 0.9);
    for (let i = 0; i < n; i++) {
      const r = Math.floor(k_h(i, 21) * (H - 1)), hw = 4 + r * 0.28, tw = Math.sin(t * 3 + i * 1.7) * 0.5 + 0.5; if (tw < 0.35) continue;
      const xx = Math.round(sxp + (k_h(i, 22) - 0.5) * 2 * hw + Math.sin(t * 1.3 + i) * 2); L.fillStyle = tw > 0.8 ? WH[3] : (o.sunCol || AM[9]); L.fillRect(xx, y0 + r, 1 + (k_h(i, 23) < 0.5 ? 2 : 0), 1);
    }
  }
  L.restore();
  // 5. berge : liseré sombre à l'horizon de l'eau, reflet du ciel sur le bord proche
  if (o.bank !== false) {
    if (ell) { for (let r = 0; r < H; r++) { const [a, b] = ext(r); if (b - a <= 0) continue; if (r < ry) { px(a, y0 + r, W_.deep); px(b - 1, y0 + r, W_.deep); } else { px(a, y0 + r, W_.lo); px(b - 1, y0 + r, W_.lo); } } R(ext(0)[0], y0, ext(0)[1] - ext(0)[0], 1, W_.deep); const [a, b] = ext(H - 1); R(a - 1, y0 + H - 1, b - a + 2, 1, k_hex(k_mix(W_.hi, W_.lo, 0.5))); }
    else { R(x0, y0, W, 1, W_.deep); }
  }
}
// ruisseau de fonte : ruban d'eau qui descend vers le spectateur. o : t, path [[x, y, largeur], …] (y croissant), preset, flow (px/s), cam, par, seed
function k_stream(t, o = {}) {
  const W_ = K_WATER[o.preset] || K_WATER.alaskaSpring, path = o.path || [[120, 300, 8], [140, 340, 14], [110, 390, 24], [130, 440, 38], [115, 490, 52]], flow = o.flow ?? 14, seed = o.seed ?? 3;
  const ys = path.map(p => p[0 + 1]), y0 = Math.floor(ys[0]), y1 = Math.min(LH, Math.ceil(ys[ys.length - 1]));
  const cx = tab(path.map(p => [p[1], p[0]]), 0), cam = (o.cam || 0) * (o.par ?? 1);
  const b = k_tmp('stream', LW, Math.max(1, y1 - y0)), skyc = k_u32(o.sky ?? CY[3]), lite = k_u32(o.hi ?? WH[3]), mid = k_u32(o.mid ?? CY[2]), dark = k_u32(o.dark ?? CY[1]), deep = k_u32(o.deep ?? CY[0]), foam = k_u32(CY[4]);
  const bank = k_u32(o.bank ?? NE[1]), wet = k_u32(o.wet ?? ST[2]);
  for (let y = y0; y < y1; y++) {
    const c = tab(path.map(p => [p[1], p[0]]), y) - cam, w = Math.max(2, tab(path.map(p => [p[1], p[2]]), y)), xa = Math.round(c - w / 2), xb = Math.round(c + w / 2), pers = 0.4 + (y - y0) / Math.max(1, y1 - y0) * 1.2;
    for (let x = xa - 2; x <= xb + 1; x++) {
      if (x < 0 || x >= LW) continue;
      const i = (y - y0) * LW + x;
      if (x < xa) { b.d[i] = x === xa - 1 ? wet : (k_h(x * 5 + y, seed) < 0.6 ? bank : 0); continue; }      // berge mouillée + neige
      if (x > xb) { b.d[i] = x === xb + 1 ? wet : (k_h(x * 5 + y, seed + 1) < 0.5 ? bank : 0); continue; }
      const u = (x - c) / (w / 2), n = k_n2((x + cam) * 0.2 / pers * 1.3, y * 0.3 / pers - t * flow * 0.06 * pers, seed) * 0.65 + k_n2((x + cam) * 0.5, y * 0.8 - t * flow * 0.12, seed + 3) * 0.35;
      let col = Math.abs(u) > 0.78 ? dark : mid;
      if (Math.abs(u) > 0.9) col = deep;
      if (n > 0.66 && Math.abs(u) < 0.92) col = n > 0.8 ? lite : foam;
      else if (n < 0.28) col = dark;
      if (y - y0 < 6 && k_bay(x, y) < 0.6) col = skyc;                                // reflet du ciel au loin
      b.d[i] = col;
    }
  }
  k_blit(b, 0, y0);
}
// flaque : ellipse qui reflète le ciel, bord mouillé, rides concentriques à chaque goutte (drips : liste d'instants), éclat. o : t, preset, drips [t, …], axis, cam
function k_puddle(x, y, rx, ry, t, o = {}) {
  const W_ = K_WATER[o.preset] || K_WATER.alaskaSpring, cxs = k_sx(x, o, 1), cys = k_sy(y, o, 1);
  L.save(); L.globalAlpha = 0.4; L.fillStyle = '#05040f'; L.beginPath(); L.ellipse(cxs, cys + 0.5, rx + 3, ry + 2, 0, 0, TAU); L.fill(); L.restore();   // sol détrempé autour
  k_pond(cys - ry, cys + ry, { preset: o.preset, x0: cxs - rx, x1: cxs + rx, shape: 'ellipse', axis: o.axis ?? (cys - ry - 1), k: o.k ?? 0.45, ripple: 0.4, t, calm: 0.2, density: 0.6, sun: o.sun, seed: 7 });
  L.save(); L.beginPath(); L.ellipse(cxs, cys, rx, ry, 0, 0, TAU); L.clip();
  for (const t0 of (o.drips || [])) {
    const age = t - t0; if (age < 0 || age > 1.1) continue;
    for (let k = 0; k < 3; k++) {
      const a = age - k * 0.14; if (a <= 0) continue;
      const r = a * rx * 0.55, f = 1 - a / 1.0; if (f <= 0) continue;
      const rr = Math.max(1, Math.round(r)), ry2 = Math.max(1, Math.round(r * ry / rx)), col = f > 0.5 ? WH[3] : W_.hi, dxr = (o.dropX ?? 0);
      for (let q = 0; q < 28; q++) { const ang = q / 28 * TAU; if (k_bay(q, k) > f * 1.3) continue; px(cxs + dxr + Math.cos(ang) * rr, cys + Math.sin(ang) * ry2, col); }
    }
  }
  L.restore();
  px(cxs - rx * 0.5, cys - ry * 0.35, WH[3]); px(cxs - rx * 0.5 + 1, cys - ry * 0.35, WH[3]); px(cxs - rx * 0.5 - 1, cys - ry * 0.35 + 1, NE[3]);
}
// éclaboussure d'eau : couronne de gouttelettes balistiques + anneaux qui s'étendent, de l'instant t0 (t0 ≤ t). o : size (1), col, n, cam, par
function k_splash(x, y, t0, t, o = {}) {
  const age = t - t0; if (age < 0 || age > 1.2) return;
  const sz = o.size ?? 1, col = o.col ?? WH[3], col2 = o.col2 ?? CY[3], n = o.n ?? 7, X = k_sx(x, o, 1), Y = k_sy(y, o, 1);
  for (let i = 0; i < n; i++) {                                         // gouttelettes
    const ang = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.2 + (k_h(i, 5) - 0.5) * 0.3, v = (24 + 26 * k_h(i, 6)) * sz, g = 150 * sz;
    const dx = Math.cos(ang) * v * age, dy = Math.sin(ang) * v * age + 0.5 * g * age * age;
    if (dy > 2 * sz) continue;
    const s = sz > 1.4 ? 2 : 1;
    L.fillStyle = age < 0.35 ? col : col2; L.fillRect(Math.round(X + dx), Math.round(Y + dy), s, s);
  }
  for (let k = 0; k < 2; k++) {                                         // anneaux sur l'eau
    const a = age - k * 0.12; if (a <= 0) continue;
    const r = a * 16 * sz, f = 1 - a / 1.0; if (f <= 0) continue;
    for (let q = 0; q < 36; q++) { const an = q / 36 * TAU; if (k_bay(q, k + 1) > f * 1.2) continue; px(X + Math.cos(an) * r, Y + Math.sin(an) * r * 0.32, f > 0.55 ? col : col2); }
  }
}
// gouttes qui se forment, tombent et éclaboussent. o : n, spread (largeur autour de x), period (s), fall (hauteur de chute), floorY, size, col, splash (true), seed, cam, par
function k_drips(x, y, t, o = {}) {
  const n = o.n ?? 3, spread = o.spread ?? 20, P = o.period ?? 1.6, fall = o.fall ?? 40, sz = o.size ?? 1, col = o.col ?? CY[3], hi = o.hi ?? WH[3], seed = o.seed ?? 4, g = 260;
  const floorY = k_sy(o.floorY ?? (y + fall), o, 1), X0 = k_sx(x, o, 1), Y0 = k_sy(y, o, 1), tf = Math.sqrt(2 * (floorY - Y0) / g), sw = Math.max(0.3, P - tf - 0.35);
  for (let i = 0; i < n; i++) {
    const xi = Math.round(X0 + (n > 1 ? (i / (n - 1) - 0.5) * 2 * spread : 0) + (k_h(i, seed) - 0.5) * 6), Pi = P * (0.85 + 0.3 * k_h(i, seed + 1)), ph = k_h(i, seed + 2) * Pi;
    const tt = ((t + ph) % Pi + Pi) % Pi;
    if (tt < sw) {                                                      // la goutte gonfle au bord
      const q = tt / sw, r = q < 0.55 ? 1 : 2;
      px(xi, Y0, hi); if (q > 0.25) { px(xi, Y0 + 1, col); } if (q > 0.55) { px(xi - 1, Y0 + 1, col); px(xi + 1, Y0 + 1, col); px(xi, Y0 + 2, col); px(xi, Y0 + 1, hi); }
      if (q > 0.9) px(xi, Y0 + 3, col);
    } else if (tt < sw + tf) {                                          // chute
      const a = tt - sw, yy = Y0 + 3 + 0.5 * g * a * a;
      if (yy < floorY) { px(xi, yy, hi); px(xi, yy + 1, col); if (sz > 1) { px(xi, yy + 2, col); px(xi + 1, yy + 1, col); } if (a > 0.08) px(xi, yy - 2, col); }
    } else if (o.splash !== false) k_splash(xi, floorY, 0, tt - sw - tf, { size: 0.6 * sz, n: 5, col: hi, col2: col });
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 7. GLACE : givre qui gagne, bloc de glace translucide fissuré, fonte de la neige
// ════════════════════════════════════════════════════════════════════════════════════════
// givre : cristaux (fougères) + voile granuleux qui gagnent une zone de 0 à 1. (x, y, w, h) = zone ; p = avancement 0..1.
// o : from 'edge' (du contour vers l'intérieur) | 'bottom' | 'top' | 'left' | 'right' | 'center' | [dx, dy] ; shape 'rect'|'ellipse' ; mask (px, py) → bool (silhouette du sujet) ; seed ; density ; t (scintillement) ; ferns (0..1)
function k_frost(x, y, w, h, p, o = {}) {
  if (p <= 0.001) return;
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const t = o.t ?? 0, seed = o.seed ?? 9, from = o.from || 'edge', mask = o.mask, ell = o.shape === 'ellipse', dens = o.density ?? 1, front = p * 1.3 - 0.15;
  const cx = w / 2, cy = h / 2, md = o.reach ?? Math.min(w, h) / 2;
  const arr = (i, j) => {
    if (from === 'edge') return ell ? (1 - Math.sqrt(((i - cx) / cx) ** 2 + ((j - cy) / cy) ** 2)) * Math.min(cx, cy) / md : Math.min(i, w - 1 - i, j, h - 1 - j) / md;
    if (from === 'bottom') return (h - 1 - j) / h; if (from === 'top') return j / h; if (from === 'left') return i / w; if (from === 'right') return (w - 1 - i) / w;
    if (from === 'center') return Math.hypot((i - cx) / cx, (j - cy) / cy) / 1.2;
    const n = Math.hypot(from[0], from[1]) || 1; return clamp(((i - cx) * from[0] + (j - cy) * from[1]) / n / Math.max(w, h) + 0.5);
  };
  const inside = (i, j) => (!ell || ((i - cx) / cx) ** 2 + ((j - cy) / cy) ** 2 <= 1) && (!mask || mask(x + i, y + j));
  const b = k_tmp('frost', w, h), cW = k_u32(WH[3]), cN4 = k_u32(NE[4]), cN3 = k_u32(NE[3]), cC = k_u32(CY[4]), cC3 = k_u32(CY[3]);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!inside(i, j)) continue;
    const a = arr(i, j) + (k_n2(i * 0.11, j * 0.11, seed) - 0.5) * 0.34; if (a >= front) continue;
    const depth = front - a, cov = clamp(depth / 0.28) * 0.9 * dens, hs = k_h(i * 7 + j * 13, seed), th = 0.5 * k_bay(x + i, y + j) + 0.5 * k_h(i * 3 + j * 5, seed + 1);
    if (th >= cov) continue;
    const q = k_h(i * 11 + j * 3, seed + 2);
    b.d[j * w + i] = depth < 0.1 ? (q > 0.5 ? cC : cN4) : q > 0.8 ? cW : q > 0.42 ? cN4 : q > 0.14 ? cN3 : cC3;
  }
  // fougères de givre : tiges et branches qui s'allongent quand le front passe
  const nF = Math.round(Math.min(90, w * h / 90) * (o.ferns ?? 1)), r = rng(seed * 5 + 3);
  const put = (px_, py_, c) => { const i = Math.round(px_), j = Math.round(py_); if (i >= 0 && j >= 0 && i < w && j < h && inside(i, j)) b.d[j * w + i] = c; };
  for (let f = 0; f < nF; f++) {
    const sx = r() * w, sy = r() * h, ang0 = r() * TAU, ml = 5 + r() * 7, a = arr(sx | 0, sy | 0), g = clamp((front - a) / 0.45); if (g <= 0 || !inside(sx | 0, sy | 0)) continue;
    const len = ml * g, dx = Math.cos(ang0), dy = Math.sin(ang0);
    for (let s = 0; s <= len; s++) {
      put(sx + dx * s, sy + dy * s, cW);
      if (s >= 2 && s % 2 === 0 && s < len - 1) {
        const bl = (len - s) * 0.5;
        for (const sd of [-1, 1]) { const ba = ang0 + sd * 0.95, bx = Math.cos(ba), by = Math.sin(ba); for (let q = 1; q <= bl; q++) put(sx + dx * s + bx * q, sy + dy * s + by * q, q === Math.floor(bl) ? cC : cN4); }
      }
    }
  }
  // scintillements
  for (let k = 0; k < 6; k++) {
    const gx = (k_h(k, seed + 7) * w) | 0, gy = (k_h(k, seed + 8) * h) | 0, v = Math.sin(t * 2.3 + k * 2.1 + seed);
    if (v > 0.75 && inside(gx, gy) && arr(gx, gy) < front - 0.1) { put(gx, gy, cW); put(gx - 1, gy, cN4); put(gx + 1, gy, cN4); put(gx, gy - 1, cN4); put(gx, gy + 1, cN4); if (v > 0.93) { put(gx - 2, gy, cC); put(gx + 2, gy, cC); put(gx, gy - 2, cC); put(gx, gy + 2, cC); } }
  }
  k_blit(b, x, y);
}
function k_polyExt(pts, y0, y1) {
  const out = [];
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5; let xl = 1e9, xr = -1e9;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) { const xx = a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]); xl = Math.min(xl, xx); xr = Math.max(xr, xx); } }
    out.push(xl > xr ? null : [Math.ceil(xl - 0.5), Math.floor(xr - 0.5)]);
  }
  return out;
}
function k_crackPaths(w, h, seed, ox, oy) {
  const r = rng(seed), paths = [];
  const walk = (x, y, ang, len, start, depth) => {
    const pts = [[x, y]], cum = [0]; let L_ = 0, a = ang;
    while (L_ < len) {
      const st = (depth ? 2 : 3) + r() * 2; a += (r() - 0.5) * (depth ? 0.9 : 0.7); x += Math.cos(a) * st; y += Math.sin(a) * st; L_ += st;
      if (x < 2 || x > w - 3 || y < 2 || y > h - 3) { x = clamp(x, 2, w - 3); y = clamp(y, 2, h - 3); pts.push([x, y]); cum.push(L_); break; }
      pts.push([x, y]); cum.push(L_);
    }
    paths.push({ pts, cum, start, depth });
    if (depth < 2) for (let k = 4; k < pts.length - 1; k += 3 + Math.floor(r() * 3)) if (r() < (depth ? 0.3 : 0.55)) walk(pts[k][0], pts[k][1], a + (r() < 0.5 ? -1 : 1) * (0.5 + 0.5 * r()), (6 + r() * 12) * (depth ? 0.6 : 1), start + cum[k], depth + 1);
  };
  walk(ox, oy, Math.PI / 2 + (r() - 0.5) * 0.7, h * 1.3, 0, 0);
  let tot = 0; for (const p of paths) tot = Math.max(tot, p.start + p.cum[p.cum.length - 1]);
  return { paths, tot };
}
// bloc de glace translucide. À appeler APRÈS avoir dessiné le sujet : le voile de glace passe par-dessus (réfraction, teinte, reflets, bulles, givre, fissures).
// (x, y) = coin haut-gauche de la face avant, (w, h) = taille. o : t, seed, alpha (opacité du voile, 0.5), crack 0..1 (progression des fissures), crackAt [fx, fy], frost 0..1, melt 0..1 (fonte : face supérieure plus mince, gouttes, reflets mouillés),
// warm 0..1 (lueur chaude du dégel au centre qui bat : beatHz), warmAt [x, y], sparkle 0..1, mode 'veil' (défaut, sujet derrière) | 'solid' (glace opaque sans sujet), preset (teinte du ciel reflété)
function k_iceBlock(x, y, w, h, o = {}) {
  const t = o.t ?? 0, seed = o.seed ?? 5, crack = clamp(o.crack ?? 0), melt = clamp(o.melt ?? 0), solid = o.mode === 'solid', vA = (o.alpha ?? 0.5) * (1 - 0.35 * melt) * (solid ? 1.8 : 1), frost = o.frost ?? 0.6, spark = o.sparkle ?? 1;
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const th = Math.max(3, Math.round(h * 0.12 * (1 - 0.5 * melt))), r = rng(seed * 31 + 7), c1 = 4 + Math.round(r() * 4), c2 = 5 + Math.round(r() * 5), c4 = 5 + Math.round(r() * 5), c5 = 4 + Math.round(r() * 4);
  const pts = [[c1 + 4, -th], [w - c2 - 4, -th], [w - c2, 0], [w, c2], [w, h - c4], [w - c4, h], [c5, h], [0, h - c5], [0, c1], [c1, 0]];
  const ext = k_polyExt(pts, -th, h - 1);
  const skyc = o.preset ? k_skyColor(o.preset, 0.8) : [200, 224, 255];
  // lueur chaude sous le voile (le sujet qui revient à la vie)
  if (o.warm > 0) {
    const bt = 0.5 + 0.5 * Math.sin(t * TAU * (o.beatHz ?? 1.1)), g = o.warmAt || [x + w * 0.5, y + h * 0.55];
    rgrad(g[0], g[1], 2, w * 0.7, [[0, 'rgba(255,196,96,0.8)'], [0.45, 'rgba(255,140,60,0.32)'], [1, 'rgba(255,120,60,0)']], clamp(o.warm * (0.5 + 0.5 * bt)), 'lighter');
  }
  const bx = x - 2, by = y - th - 2, bw = w + 4, bh = h + th + 4;
  const cx0 = Math.max(0, bx), cy0 = Math.max(0, by), cx1 = Math.min(LW, bx + bw), cy1 = Math.min(LH, by + bh); if (cx1 <= cx0 || cy1 <= cy0) return;
  const gw = cx1 - cx0, gh = cy1 - cy0, id = L.getImageData(cx0, cy0, gw, gh), d = id.data, src = new Uint8ClampedArray(d);
  const at = (ix, iy) => { ix = clamp(ix, 0, gw - 1); iy = clamp(iy, 0, gh - 1); const q = (iy * gw + ix) * 4; return [src[q], src[q + 1], src[q + 2]]; };
  const lit = [255, 255, 255], deepc = [18, 74, 102], light = k_rgb(NE[4]);
  const streaks = [w * 0.62, w * 0.78 + 6];
  for (let j = -th; j < h; j++) {
    const e = ext[j + th]; if (!e) continue;
    for (let i = e[0]; i <= e[1]; i++) {
      const ax = x + i, ay = y + j; if (ax < cx0 || ay < cy0 || ax >= cx1 || ay >= cy1) continue;
      const q = ((ay - cy0) * gw + (ax - cx0)) * 4, edge = Math.min(i - e[0], e[1] - i, j + th, h - 1 - j), ef = 1 - clamp(edge / 12), nz = k_n2(i * 0.12, j * 0.12, seed);
      let rgb;
      if (j < 0) {                                                                  // face supérieure : reflet du ciel
        const f = (j + th) / th, tc = k_mix([255, 255, 255], skyc.map(v => v * 0.35 + 255 * 0.65), f);
        const s0 = at(ax - cx0, ay - cy0); rgb = k_mix(s0, tc, solid ? 0.95 : 0.8);
        if (j === -th || edge < 1) rgb = lit;
      } else {
        const rdx = Math.round(1.6 * Math.sin(j * 0.21 + seed) * (1 - ef * 0.5)), rdy = Math.round(0.9 * Math.sin(i * 0.17 + seed * 2));
        const s0 = solid ? [60, 120, 160] : at(ax - cx0 + rdx, ay - cy0 + rdy), gd = clamp(0.12 + 0.42 * (i / w) + 0.62 * (j / h)), ic = k_mix([196, 236, 250], [30, 112, 146], Math.pow(gd, 1.25));
        const a = clamp(vA * (0.6 + 1.0 * ef * ef * ef) + 0.12 * (nz - 0.5) + (j < 9 ? 0.2 * (1 - j / 9) : 0), 0.16, 0.9);
        rgb = k_mix(s0, ic, a);
        const lx = i - e[0];
        if (lx >= 3 && lx <= 4 && j > 5 && j < h - 7 && k_bay(ax, ay) < 0.75) rgb = k_mix(rgb, lit, 0.45);                       // bande de reflet à gauche
        for (const sk of streaks) { const dd = Math.abs((i - 0.55 * j) - sk * 0.5); if (dd < 1.2 && j > 6 && j < h * 0.6) rgb = k_mix(rgb, lit, 0.7 - dd * 0.3); }
        if (j > h - 6) rgb = k_mix(rgb, deepc, 0.12 * (j - (h - 6)));
        if (e[1] - i < 3) rgb = k_mix(rgb, deepc, 0.25);
        if (melt > 0 && j > h - 4 - melt * 4 && k_bay(ax, ay) < 0.7) rgb = k_mix(rgb, lit, 0.5);                                 // reflet mouillé
        if (edge < 1) rgb = (i - e[0] < 1 || j < 1) ? light : deepc;                                                              // contour : liseré clair en haut à gauche, sombre en bas à droite
      }
      d[q] = rgb[0]; d[q + 1] = rgb[1]; d[q + 2] = rgb[2]; d[q + 3] = 255;
    }
  }
  L.putImageData(id, cx0, cy0);
  // bulles figées
  const nb = Math.round(w * h / 520), rb = rng(seed * 11 + 1);
  for (let k = 0; k < nb; k++) {
    const bxx = x + 7 + rb() * (w - 14), byy = y + 6 + rb() * (h - 14), big = rb() < 0.35, ee = ext[Math.round(byy - y) + th]; if (!ee || bxx - x < ee[0] + 4 || bxx - x > ee[1] - 4) continue;
    const X = Math.round(bxx), Y = Math.round(byy);
    if (big) { px(X - 1, Y, WH[3]); px(X + 1, Y, NE[3]); px(X, Y - 1, WH[3]); px(X, Y + 1, CY[2]); px(X, Y, CY[3]); px(X - 2, Y, NE[2]); px(X + 2, Y, CY[1]); } else { px(X, Y, WH[3]); px(X + 1, Y + 1, CY[1]); }
  }
  // givre sur le pourtour
  if (frost > 0) k_frost(x - 1, y - th - 1, w + 2, h + th + 2, frost * 0.7, { from: 'edge', reach: 11, seed: seed + 3, t, mask: (px_, py_) => { const rr = py_ - y + th, ee = ext[rr]; return !!ee && px_ - x >= ee[0] && px_ - x <= ee[1]; }, ferns: 0.7, density: 0.7 });
  // fissures : une ligne sombre + un reflet clair, qui court de l'origine vers les bords
  if (crack > 0) {
    const ca = o.crackAt || [0.58, 0.02], cp = k_crackPaths(w, h, seed * 7 + 2, ca[0] * w, ca[1] * h), Lg = crack * cp.tot * 1.02;
    for (const pa of cp.paths) {
      let prev = null;
      for (let i = 0; i < pa.pts.length; i++) {
        const lenHere = pa.start + pa.cum[i]; let X = pa.pts[i][0], Y = pa.pts[i][1];
        if (lenHere > Lg) { if (i > 0 && pa.start + pa.cum[i - 1] < Lg) { const f = (Lg - (pa.start + pa.cum[i - 1])) / (lenHere - (pa.start + pa.cum[i - 1])); X = prev[0] + (X - prev[0]) * f; Y = prev[1] + (Y - prev[1]) * f; } else break; }
        if (prev) {
          const thick = pa.depth === 0 && (pa.start + pa.cum[i]) < 18 ? 2 : 1;
          lineP(x + prev[0] + 1, y + prev[1], x + X + 1, y + Y, WH[3], 1);
          lineP(x + prev[0], y + prev[1], x + X, y + Y, CY[0], thick);
        }
        prev = [X, Y]; if (lenHere > Lg) break;
      }
    }
  }
  // éclats (étoiles de lumière sur les arêtes)
  if (spark > 0) for (let k = 0; k < 4; k++) {
    const gx = x + [c1 + 1, w * 0.78, 3, w * 0.4][k], gy = y + [-th + 1, -th + 1, h * 0.55, 1][k], v = Math.sin(t * 2.2 + k * 2.4 + seed) * spark;
    if (v > 0.72) { px(gx, gy, WH[3]); px(gx - 1, gy, NE[4]); px(gx + 1, gy, NE[4]); px(gx, gy - 1, NE[4]); px(gx, gy + 1, NE[4]); if (v > 0.92) { px(gx - 2, gy, CY[4]); px(gx + 2, gy, CY[4]); px(gx, gy - 2, CY[4]); px(gx, gy + 2, CY[4]); } }
  }
  if (melt > 0.05) k_drips(x + w * 0.5, y + h, t, { n: 3, spread: w * 0.32, fall: 16 + 12 * melt, period: 1.5 - 0.5 * melt, seed: seed + 9 });
}
// fonte de la neige : un manteau de neige sur la zone (x0, y0)–(x1, y1) recule de p = 0 (tout recouvert) à 1 (presque fondu), en laissant un bord mouillé sombre et luisant.
// Dessiner d'abord le sol nu (litière, herbe) : la neige se pose par-dessus. o : seed, from 'bottom'|'top'|'left'|'right'|{x, y} (où ça fond d'abord), light (−1/+1), t, cam
function k_meltEdge(x0, y0, x1, y1, p, o = {}) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0 || p >= 1.15) return;
  const seed = o.seed ?? 6, t = o.t ?? 0, from = o.from || 'bottom', light = o.light ?? -1, cam = Math.round((o.cam || 0) * (o.par ?? 1));
  const field = (i, j) => {
    const wx = i + cam, n = k_n2(wx * 0.022, j * 0.034, seed) * 0.62 + k_n2(wx * 0.06, j * 0.085, seed + 2) * 0.28 + k_n2(wx * 0.17, j * 0.22, seed + 4) * 0.1;
    let g; if (from === 'bottom') g = 1 - j / h; else if (from === 'top') g = j / h; else if (from === 'left') g = i / w; else if (from === 'right') g = 1 - i / w; else g = Math.min(1, Math.hypot(i - (from.x - x0), (j - (from.y - y0)) * 1.8) / (w * 0.7));
    return n * 0.85 + g * 0.3;                                                       // plus grand = la neige tient plus longtemps
  };
  const thr = p * 0.95 + 0.08, b = k_tmp('melt', w, h), cN = [NE[4], NE[3], NE[2], NE[1], NE[0]].map(k_u32), wetD = k_u32(ST[2]), wetM = k_u32(CY[1]), wetL = k_u32(CY[3]), spec = k_u32(WH[3]), wetHalo = k_u32(WO[0]), wetHalo2 = k_u32(WO[1]);
  const F = new Float32Array(w * h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) F[j * w + i] = field(i, j);
  const fa = (i, j) => F[clamp(j, 0, h - 1) * w + clamp(i, 0, w - 1)];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = F[j * w + i], dd = v - thr;
    if (dd < -0.06) continue;
    if (dd < 0) { if (k_bay(x0 + i, y0 + j) < 0.8 * (1 + dd / 0.06)) b.d[j * w + i] = dd > -0.025 ? wetHalo : wetHalo2; continue; }          // sol détrempé, plus sombre
    let col;
    if (dd < 0.012) col = k_h(i * 7 + j, seed) < 0.18 ? wetL : wetM;                                                  // filet d'eau au bord
    else if (dd < 0.032) col = wetD;                                                                                 // neige sale, fondante
    else {
      const above = fa(i, j - 3) - thr < 0, below = fa(i, j + 3) - thr < 0;
      const gx = fa(i + 3 * light, j) - fa(i - 3 * light, j), shade = 0.5 + gx * 5;
      let tn = shade > 0.62 ? 0 : shade > 0.46 ? 1 : shade > 0.34 ? 2 : 3;
      if (dd < 0.07 && above) tn = 0; else if (dd < 0.07 && below) tn = 3;
      if (k_n2(i * 0.35 + 20, j * 0.6, seed + 7) > 0.82) tn = Math.min(4, tn + 1);
      col = cN[tn];
    }
    if (dd >= 0.014 && dd < 0.05 && k_h(i * 13 + j * 3, seed + 5) < 0.05 && Math.sin(t * 3 + i) > 0.3) col = spec;      // éclat sur l'eau
    b.d[j * w + i] = col;
  }
  k_blit(b, x0, y0);
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 8. PARTICULES ET VIVANTS (positions dans l'espace du monde : stables sous parallaxe)
// ════════════════════════════════════════════════════════════════════════════════════════
const k_wrapX = (x, P, m) => ((x % P) + P) % P - m;
// neige : 3 plans de profondeur (lointain, moyen, proche gros flocons), vent et rafale.
// o : cam, wind (px/s, + vers la droite), gust {t0, t1, push} (rafale : poussée de push px entre t0 et t1), speed (1), density (1), seed, tones [lointain, moyen, proche], y0/y1 (zone), par [0.45, 0.9, 1.5]
function k_snow(t, o = {}) {
  const cam = o.cam || 0, wind = o.wind ?? 7, sp = o.speed ?? 1, dens = o.density ?? 1, seed = o.seed ?? 2, g = o.gust, pars = o.par || [0.45, 0.9, 1.5];
  const tones = o.tones || [NE[2], NE[3], WH[3]], PX = LW + 30, PY = LH + 30, y0 = o.y0 ?? 0, y1 = o.y1 ?? LH;
  const lay = [{ n: 64, vy: 12, s: 1 }, { n: 44, vy: 23, s: 1 }, { n: 15, vy: 42, s: 2 }];
  const push = g ? g.push * sm(prog(t, g.t0, g.t1)) : 0;
  L.setTransform(1, 0, 0, 1, 0, 0);
  for (let l = 0; l < 3; l++) {
    const r = rng(seed * 100 + l * 17 + 1), n = Math.round(lay[l].n * dens), par = pars[l], c = tones[l];
    for (let i = 0; i < n; i++) {
      const x0 = r() * PX, yy0 = r() * PY, ph = r() * TAU, fq = 0.6 + r() * 1.1, A = 1.5 + r() * 3.5 * (l + 1) * 0.6, vy = lay[l].vy * sp * (0.8 + 0.4 * r());
      const x = k_wrapX(x0 + (wind * t + push * (0.5 + 0.5 * par)) * (0.35 + 0.35 * par) + A * Math.sin(fq * t + ph) - cam * par, PX, 15), y = k_wrapX(yy0 + vy * t, PY, 15);
      if (y < y0 || y > y1) continue;
      const X = Math.round(x), Y = Math.round(y);
      if (l === 2) { L.fillStyle = NE[3]; L.fillRect(X, Y, 2, 2); L.fillStyle = c; L.fillRect(X, Y, 1, 1); if (i % 3 === 0) { L.fillStyle = NE[2]; L.fillRect(X - 1, Y + 1, 1, 1); L.fillRect(X + 2, Y, 1, 1); } }
      else { L.fillStyle = c; L.fillRect(X, Y, 1, 1); }
    }
  }
}
// grains en suspension dans la lumière (pollen, poussière dorée) : flottent en 2D, scintillent, s'allument dans le faisceau (beam {x, y, angle, spread, len}).
function k_motes(t, o = {}, kind = 'dust') {
  const n = o.n ?? 40, x0 = o.x0 ?? 0, x1 = o.x1 ?? LW, y0 = o.y0 ?? 60, y1 = o.y1 ?? 360, cam = o.cam || 0, par = o.par ?? 0.8, seed = o.seed ?? 4, sz = o.size ?? 1, bm = o.beam;
  const cols = o.cols || (kind === 'pollen' ? [LM[6], YE[3], AM[9], WH[3]] : [AM[8], AM[9], YE[3], WH[3]]), vx = o.vx ?? (kind === 'pollen' ? 3 : 5), vy = o.vy ?? (kind === 'pollen' ? -2.5 : -1);
  const PX = (x1 - x0) + 40, PY = (y1 - y0) + 40, r = rng(seed * 13 + 2);
  L.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const bx = r() * PX, by = r() * PY, a1 = 5 + r() * 14, a2 = 4 + r() * 10, w1 = 0.2 + r() * 0.5, w2 = 0.25 + r() * 0.6, p1 = r() * TAU, p2 = r() * TAU, sp = 0.8 + r() * 2.5, pk = r() * TAU, big = r() < 0.18;
    const x = x0 + k_wrapX(bx + vx * t + a1 * Math.sin(w1 * t + p1) - cam * par, PX, 20), y = y0 + k_wrapX(by + vy * t + a2 * Math.cos(w2 * t + p2), PY, 20);
    const tw = 0.5 + 0.5 * Math.sin(t * sp + pk); let lit = 1;
    if (bm) {
      const dx = x - bm.x, dy = y - bm.y, rr = Math.hypot(dx, dy); let da = Math.atan2(dy, dx) - bm.angle; da = Math.atan2(Math.sin(da), Math.cos(da));
      lit = rr < bm.len ? clamp(1 - Math.abs(da) / (bm.spread * 0.5)) * (1 - rr / bm.len * 0.6) : 0; lit = Math.pow(lit, 0.7);
    }
    const v = tw * (o.min ?? (0.3 + 0.7 * lit));
    if (v < 0.18) continue;
    const X = Math.round(x), Y = Math.round(y), c = v > 0.85 ? cols[3] : v > 0.55 ? cols[2] : v > 0.35 ? cols[1] : cols[0];
    L.fillStyle = c; L.fillRect(X, Y, 1, 1);
    if ((big || sz > 1) && v > 0.5) { L.fillRect(X + 1, Y, 1, 1); L.fillRect(X, Y + 1, 1, 1); L.fillStyle = cols[0]; L.fillRect(X - 1, Y, 1, 1); L.fillRect(X, Y - 1, 1, 1); }
    if (big && v > 0.8) { L.fillStyle = cols[1]; L.fillRect(X - 2, Y, 1, 1); L.fillRect(X + 2, Y, 1, 1); L.fillRect(X, Y - 2, 1, 1); L.fillRect(X, Y + 2, 1, 1); }
  }
}
const k_pollen = (t, o = {}) => k_motes(t, o, 'pollen');
const k_dust = (t, o = {}) => k_motes(t, o, 'dust');
// lucioles : lueur qui s'allume et s'éteint, trajectoire lente. o : n, x0, x1, y0, y1, cam, par, seed, col
function k_fireflies(t, o = {}) {
  const n = o.n ?? 14, x0 = o.x0 ?? 0, x1 = o.x1 ?? LW, y0 = o.y0 ?? 200, y1 = o.y1 ?? 420, cam = o.cam || 0, par = o.par ?? 1, seed = o.seed ?? 8, r = rng(seed * 7 + 3), col = o.col ?? YE[2];
  L.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const cx = r() * (x1 - x0), cy = r() * (y1 - y0), rx = 8 + r() * 24, ry = 5 + r() * 14, w1 = 0.25 + r() * 0.4, w2 = 0.3 + r() * 0.5, p1 = r() * TAU, p2 = r() * TAU, P = 2.2 + r() * 2.6, ph = r();
    const x = x0 + k_wrapX(cx + rx * Math.sin(w1 * t + p1) - cam * par, x1 - x0 + 40, 20), y = y0 + cy + ry * Math.sin(w2 * t + p2) + 3 * Math.sin(t * 2.1 + i);
    const env = clamp(Math.sin(TAU * (t / P + ph)) * 2.2 - 0.4); if (env < 0.05) continue;
    const X = Math.round(x), Y = Math.round(y), R_ = 5;
    for (let dy = -R_; dy <= R_; dy++) for (let dx = -R_; dx <= R_; dx++) { const d = Math.hypot(dx, dy); if (d > R_ || d < 1) continue; if (k_bay(X + dx, Y + dy) < env * Math.pow(1 - d / R_, 1.6) * 0.75) { L.fillStyle = d < 2.5 ? AM[9] : col; L.fillRect(X + dx, Y + dy, 1, 1); } }
    px(X, Y, env > 0.7 ? WH[3] : YE[3]); if (env > 0.4) { px(X + 1, Y, YE[3]); px(X, Y + 1, YE[3]); }
  }
}
// scintillements ponctuels (neige, givre, eau) : petites croix qui s'allument. o : n, x0, x1, y0, y1, cam, par, seed, col, rate
function k_glints(t, o = {}) {
  const n = o.n ?? 20, x0 = o.x0 ?? 0, x1 = o.x1 ?? LW, y0 = o.y0 ?? 300, y1 = o.y1 ?? 460, cam = o.cam || 0, par = o.par ?? 1, seed = o.seed ?? 12, r = rng(seed * 3 + 1), col = o.col ?? WH[3], col2 = o.col2 ?? CY[4];
  for (let i = 0; i < n; i++) {
    const bx = r() * (x1 - x0), by = y0 + r() * (y1 - y0), sp = (o.rate ?? 1) * (1 + r() * 2), ph = r() * TAU, v = Math.sin(t * sp + ph);
    if (v < 0.78) continue;
    const X = Math.round(x0 + k_wrapX(bx - cam * par, x1 - x0, 0)), Y = Math.round(by);
    px(X, Y, col); px(X - 1, Y, col2); px(X + 1, Y, col2); px(X, Y - 1, col2); px(X, Y + 1, col2); if (v > 0.94) { px(X - 2, Y, col2); px(X + 2, Y, col2); px(X, Y - 2, col2); px(X, Y + 2, col2); }
  }
}
// feuilles qui tombent en tournoyant. o : n, cam, par, y0, y1, wind, cols, seed
function k_leaves(t, o = {}) {
  const n = o.n ?? 14, cam = o.cam || 0, par = o.par ?? 1, y0 = o.y0 ?? 0, y1 = o.y1 ?? LH, wind = o.wind ?? 6, cols = o.cols || [AM[6], OC[3], RD[3], LM[4], YE[1], AM[4]], seed = o.seed ?? 5, r = rng(seed * 11 + 1), PX = LW + 40, PY = (y1 - y0) + 30;
  for (let i = 0; i < n; i++) {
    const x0 = r() * PX, yy = r() * PY, vy = 8 + r() * 9, A = 10 + r() * 16, fq = 0.5 + r() * 0.6, ph = r() * TAU, rot = 2 + r() * 2.4, c = cols[Math.floor(r() * cols.length)], rp = r() * TAU;
    const x = k_wrapX(x0 + wind * t * 0.7 + A * Math.sin(fq * t + ph) - cam * par, PX, 20), y = y0 + k_wrapX(yy + vy * t, PY, 15);
    const X = Math.round(x), Y = Math.round(y), ca = Math.cos(t * rot + rp), sa = Math.sin(t * rot * 0.7 + rp), aw = Math.abs(ca);
    L.fillStyle = c;
    if (aw > 0.6) { L.fillRect(X - 1, Y, 3, 2); L.fillStyle = k_hex(k_mix(c, '#ffffff', 0.35)); L.fillRect(X - 1 + (sa > 0 ? 0 : 1), Y, 1, 1); }
    else if (aw > 0.25) { L.fillRect(X, Y - (sa > 0 ? 1 : 0), 2, 2); }
    else { L.fillRect(X, Y - 1, 1, 3); }
  }
}
// vol en V lointain. o : n (7), y (hauteur du chef de file), x (abscisse de départ), speed, dir (+1 droite), size (1|2), col, flap (Hz), cam, par (0.1), phase
function k_birds(t, o = {}) {
  const n = o.n ?? 7, sz = o.size ?? 1, dir = o.dir ?? 1, sp = o.speed ?? 14, col = o.col ?? NI[1], rim = o.rim, fl = o.flap ?? 2.4, cam = (o.cam || 0) * (o.par ?? 0.1), PX = LW + 140;
  const xl = k_wrapX((o.x ?? 0) + dir * sp * t - cam, PX, 70), yl = (o.y ?? 100) + 3 * Math.sin(t * 0.5 + (o.phase ?? 0));
  L.setTransform(1, 0, 0, 1, 0, 0); L.fillStyle = col;
  for (let k = 0; k < n; k++) {
    const row = Math.ceil(k / 2), side = k % 2 ? 1 : -1, X = xl - dir * row * 7 * sz, Y = yl + side * row * 4 * sz + 1.2 * Math.sin(t * 1.3 + k * 1.9) * sz, f = Math.floor(((((t * fl + k * 0.37) % 1) + 1) % 1) * 4);
    const wing = [[-1, -1, -2, -2, -3, -2], [-1, 0, -2, 0, -3, 1], [-1, 0, -2, 1, -3, 2], [-1, 0, -2, 0, -3, 1]][f];
    L.fillRect(Math.round(X), Math.round(Y), sz, sz);
    for (let s = 0; s < 3; s++) { L.fillRect(Math.round(X + wing[s * 2] * sz), Math.round(Y + wing[s * 2 + 1] * sz), sz, sz); L.fillRect(Math.round(X - wing[s * 2] * sz), Math.round(Y + wing[s * 2 + 1] * sz), sz, sz); }
    if (rim) { L.fillStyle = rim; L.fillRect(Math.round(X), Math.round(Y - sz), sz, 1); L.fillStyle = col; }
  }
}
// oiseau seul. kind 'small' (passereau qui bat des ailes, de profil) | 'soar' (rapace / vautour qui plane, ailes déployées). o : dir (+1 droite), s (taille), rate (Hz), col, col2, rim, tilt, cam, par
function k_bird(x, y, t, o = {}) {
  const X = k_sx(x, o, 1), Y = k_sy(y, o, 1), dir = o.dir ?? 1, s = o.s ?? 1, kind = o.kind || 'small', col = o.col ?? NI[1], col2 = o.col2 ?? NI[3], rim = o.rim ?? null;
  const P_ = (a, b) => [X + a * dir * s, Y + b * s], Q_ = (a, b) => [X + a * s, Y + b * s];
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (kind === 'soar') {
    const tilt = o.tilt ?? 0.16 * Math.sin(t * 0.6), wob = 0.7 * Math.sin(t * 1.1);
    const WL = [[-1, -1], [-5, -3.5], [-11, -5.5], [-17, -5.5], [-22, -3], [-24, -1], [-21.5, -1.2], [-23, 1.5], [-20, 0.8], [-21, 3.4], [-17.5, 1.6], [-17.5, 4.2], [-14, 2.6], [-13, 4.8], [-9.5, 3.2], [-7, 4.6], [-3, 3.6], [-1, 3]];
    poly(WL.map(p => Q_(p[0], p[1] + wob + tilt * 10 * (Math.abs(p[0]) / 21))), col2);
    poly(WL.map(p => Q_(-p[0], p[1] + wob - tilt * 10 * (Math.abs(p[0]) / 21))), col2);
    poly([[-2, -1.5], [3, -2.2], [6, -1], [6.5, 0.5], [3, 2.2], [-1, 3.2], [-4, 7.5], [-1, 8.5], [1.5, 3.2]].map(p => P_(p[0], p[1])), col);
    px(...P_(5.5, -0.5), col2);
    if (rim) { for (let i = 1; i < 5; i++) { const a = Q_(WL[i - 1][0], WL[i - 1][1] + wob + tilt * 10 * Math.abs(WL[i - 1][0]) / 21), b = Q_(WL[i][0], WL[i][1] + wob + tilt * 10 * Math.abs(WL[i][0]) / 21); lineP(a[0], a[1], b[0], b[1], rim, 1); const a2 = Q_(-WL[i - 1][0], WL[i - 1][1] + wob - tilt * 10 * Math.abs(WL[i - 1][0]) / 21), b2 = Q_(-WL[i][0], WL[i][1] + wob - tilt * 10 * Math.abs(WL[i][0]) / 21); lineP(a2[0], a2[1], b2[0], b2[1], rim, 1); } }
    return;
  }
  // passereau de profil : corps, tête, bec, queue, aile à 4 phases (haut, mi-haut, plat, bas)
  const rate = o.rate ?? 3.2, f = Math.floor(((((t * rate + (o.phase ?? 0)) % 1) + 1) % 1) * 4), bob = [0, 0.5, 0, -0.5][f];
  const tip = [[-2, -8], [-6, -5.5], [-9, -1], [-6, 3.5]][f], mid = [[-6, -4], [-8, -2.5], [-7, 1.5], [-5, 1.5]][f];
  const Pb = (a, b2) => P_(a, b2 + bob);
  poly([[-4, -0.5], [-7, 0.5], [-10, 2.5], [-6, 2.2], [-3, 1.5]].map(p => Pb(p[0], p[1])), col2);                              // queue
  poly([[-5, 0], [-3, -2], [1, -2.6], [4, -2.4], [6, -1], [5, 1.6], [1, 2.8], [-3, 2.2]].map(p => Pb(p[0], p[1])), col);        // corps
  disc(...Pb(5.5, -2.6).map(v => Math.round(v)), Math.max(1, Math.round(1.7 * s)), col);                                       // tête
  px(...Pb(7.2, -2.4), AM[7]); px(...Pb(8.2, -2.2), AM[7]); px(...Pb(6.2, -3.2), WH[3]);                                       // bec, œil
  poly([[3, -1.5], [-3, -1.5], mid, tip].map(p => Pb(p[0], p[1])), col2);                                                      // aile
  poly([[2, -1.2], [-1.5, -1.2], [tip[0] * 0.55 - 0.5, tip[1] * 0.5]].map(p => Pb(p[0], p[1])), col);
  if (rim) { for (let i = 0; i < 5; i++) px(...Pb(-2 + i * 1.5, -2.9), rim); lineP(...Pb(3, -1.5), ...Pb(tip[0], tip[1]), rim, 1); }
}
// papillon qui bat des ailes. o : s (taille), col, col2, rate (Hz), flutter (px d'errance), cam, par
function k_butterfly(x, y, t, o = {}) {
  const s = o.s ?? 1.25, col = o.col ?? YE[2], col2 = o.col2 ?? AM[6], rate = o.rate ?? 6.5, fl = o.flutter ?? 2, ph = o.phase ?? 0;
  const X = Math.round(k_sx(x, o, 1) + fl * Math.sin(t * 1.9 + ph) + fl * 0.5 * Math.sin(t * 3.7)), Y = Math.round(k_sy(y, o, 1) + fl * Math.cos(t * 1.3 + ph) + 1.2 * Math.sin(t * 7));
  const open = Math.abs(Math.sin(t * rate * Math.PI + ph)), wr = Math.max(1, Math.round((1 + 3.2 * open) * s)), hr = Math.max(1, Math.round(3 * s));
  L.setTransform(1, 0, 0, 1, 0, 0);
  for (const sd of [-1, 1]) ell(X + sd * Math.round(wr * 0.5 + 0.5), Y - 1, wr, hr, '#05040f');
  for (const sd of [-1, 1]) {
    const cx = X + sd * Math.round(wr * 0.5 + 0.5);
    ell(cx, Y - 1, Math.max(0, wr - 1), Math.max(0, hr - 1), col); if (wr > 2) { px(cx + sd, Y - 2, col2); px(cx, Y, col2); px(cx + sd * 2, Y - 1, WH[3]); }
    ell(cx - sd, Y + Math.round(hr * 0.7), Math.max(0, Math.round(wr * 0.6) - 1), Math.max(0, Math.round(hr * 0.5)), col2);
  }
  R(X, Y - 2 * s, 1, 4 * s, '#05040f'); px(X - 1, Y - 3 * s, '#05040f'); px(X + 1, Y - 3 * s, '#05040f');
}
// essaim d'insectes (moucherons) dans la lumière : points qui tourbillonnent, plus brillants dans le faisceau. o : cx, cy (centre), r (rayon), n, col, cam, par
function k_insects(t, o = {}) {
  const cx = k_sx(o.cx ?? 135, o, 1), cy = k_sy(o.cy ?? 300, o, 1), rad = o.r ?? 40, n = o.n ?? 18, seed = o.seed ?? 6, rr = rng(seed * 5 + 2), col = o.col ?? YE[3], dim = o.dim ?? NI[8];
  for (let i = 0; i < n; i++) {
    const a1 = rr() * rad, a2 = rr() * rad * 0.6, w1 = 0.8 + rr() * 2.2, w2 = 1 + rr() * 2.6, p1 = rr() * TAU, p2 = rr() * TAU;
    const x = cx + a1 * Math.sin(w1 * t + p1) + 4 * Math.sin(t * 5.3 + i), y = cy + a2 * Math.sin(w2 * t + p2) + 3 * Math.cos(t * 4.1 + i * 2);
    const v = 0.55 + 0.45 * Math.sin(t * 3 + i * 1.3); px(x, y, v > 0.4 ? col : dim); if (v > 0.85) px(x + 1, y, AM[9]);
  }
}
// nuage de poussière d'un pas ou d'un saut, né à l'instant t0 (t ≥ t0). o : col 'sand'|'soil'|'snow'|'grass'|[3 tons], dir (+1 vers la droite, 0 des deux côtés), size, n, dur
function k_dustKick(x, y, t0, t, o = {}) {
  const age = t - t0, dur = o.dur ?? 1.0; if (age < 0 || age > dur) return;
  const T = { sand: [SK[4], SK[3], SK[2], SK[1]], soil: [OC[4], OC[3], OC[2], OC[1]], snow: [WH[3], NE[4], NE[2], NE[0]], grass: [LM[5], LM[4], LM[3], LM[1]] }[o.col || 'sand'] || o.col, sz = o.size ?? 1, n = o.n ?? 10, dir = o.dir ?? 0, X = k_sx(x, o, 1), Y = k_sy(y, o, 1), q = age / dur;
  for (let i = 0; i < n; i++) {
    const h1 = k_h(i, 31), h2 = k_h(i, 32), h3 = k_h(i, 33), sd = dir !== 0 ? dir : (i % 2 ? 1 : -1);
    const vx = sd * (14 + 28 * h1) * sz * (dir === 0 ? 1 : 0.6 + 0.6 * h2), rise = (5 + 14 * h2) * sz, e = 1 - Math.pow(1 - q, 2.2);
    const cx = X + vx * dur * 0.7 * e, cy = Y - rise * e - (1 + 2 * h3) * sz * q, rad = (3.6 + 5.6 * h1) * sz * (0.3 + 0.7 * Math.sqrt(q)), dens = Math.pow(1 - q, 0.8) * 1.05;
    const R_ = Math.ceil(rad);
    for (let dy = -R_; dy <= R_; dy++) for (let dx = -R_; dx <= R_; dx++) {
      const d = Math.hypot(dx, dy * 1.1); if (d > rad) continue;
      const xx = Math.round(cx + dx), yy = Math.round(cy + dy); if (k_bay(xx, yy) >= dens * k_sstep(1.02, 0.35, d / rad) * 1.25) continue;
      const sh = (dx * 0.6 + dy * 0.8) / rad;                                          // lumière en haut à gauche
      L.fillStyle = T[sh < -0.35 ? 0 : sh < 0.15 ? 1 : sh < 0.6 ? 2 : 3]; L.fillRect(xx, yy, 1, 1);
    }
  }
}
// buée de souffle par temps froid : bouffées qui montent et se dissipent. (x, y) = bouche. o : dir (+1 vers la droite), period (2.6 s), on [t0, t1] (fenêtre), phase, size, col, strength
function k_breath(x, y, t, o = {}) {
  const P = o.period ?? 2.6, ph = o.phase ?? 0, dir = o.dir ?? 1, sz = o.size ?? 1, str = o.strength ?? 0.9, X = k_sx(x, o, 1), Y = k_sy(y, o, 1), T = o.col || [WH[3], NE[3], NE[1]];
  if (o.on && (t < o.on[0] || t > o.on[1] + 2)) return;
  const k0 = Math.floor((t - ph) / P);
  for (let k = k0; k >= k0 - 1; k--) {
    const tb = ph + k * P; if (o.on && (tb < o.on[0] || tb > o.on[1])) continue;
    for (let j = 0; j < 5; j++) {
      const a = t - tb - j * 0.09; if (a < 0 || a > 1.8) continue;
      const q = a / 1.8, bx = X + dir * ((7 + 5 * j) * sz * Math.sqrt(a) * 1.7) + 2 * Math.sin(a * 3 + j), by = Y - a * 6 * sz - 7 * sz * q * q + 1.5 * Math.cos(a * 2.3 + j), rad = (1.8 + a * 3.6 + j * 0.3) * sz, dens = Math.pow(1 - q, 0.9) * str * (j === 0 ? 0.85 : 1.0);
      const R_ = Math.ceil(rad);
      for (let dy = -R_; dy <= R_; dy++) for (let dx = -R_; dx <= R_; dx++) {
        const d = Math.hypot(dx, dy * 1.1); if (d > rad) continue;
        const xx = Math.round(bx + dx), yy = Math.round(by + dy); if (k_bay(xx, yy) >= dens * k_sstep(1.02, 0.3, d / rad) * 1.2) continue;
        L.fillStyle = (dx + dy < 0) ? T[0] : (d > rad * 0.7 ? T[2] : T[1]); L.fillRect(xx, yy, 1, 1);
      }
    }
  }
}
const k_heatC = mkCanvas(LW, LH);
// air qui tremble au-dessus du sable : décale horizontalement des lignes de pixels DÉJÀ dessinées (à appeler après le décor, avant les sujets nets). o : amp (px, 1.6), speed, profile 'mid'|'ground', rows (hauteur de groupe, 1)
function k_heatShimmer(y0, y1, t, o = {}) {
  y0 = Math.max(0, Math.round(y0)); y1 = Math.min(LH, Math.round(y1)); const H = y1 - y0; if (H < 2) return;
  const amp = o.amp ?? 1.6, sp = o.speed ?? 1, g = o.rows ?? 1, hc = k_heatC.getContext('2d');
  hc.setTransform(1, 0, 0, 1, 0, 0); hc.clearRect(0, 0, LW, LH); hc.drawImage(low, 0, y0, LW, H, 0, 0, LW, H);
  L.setTransform(1, 0, 0, 1, 0, 0);
  for (let r = 0; r < H; r += g) {
    const f = r / (H - 1), env = o.profile === 'ground' ? Math.pow(f, 0.8) : Math.pow(Math.sin(Math.PI * f), 0.9);
    const wv = Math.sin(r * 0.5 + t * sp * 4.1) * 0.6 + Math.sin(r * 1.3 - t * sp * 2.7 + 2) * 0.4 + (k_n1(r * 0.2 + t * sp * 1.7, 5) - 0.5) * 0.8, dx = Math.round(amp * env * wv * 1.3);
    if (!dx) continue;
    L.drawImage(k_heatC, 0, r, LW, g, dx, y0 + r, LW, g); L.drawImage(k_heatC, 0, r, LW, g, dx + (dx > 0 ? -LW : LW), y0 + r, LW, g);
  }
}
