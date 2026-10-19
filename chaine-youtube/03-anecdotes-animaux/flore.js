'use strict';
// ═══════════════════════════════════════════════════════════════════════════════════════
// 1. OUTILS INTERNES : hasard, bruit, couleurs, tampon de pixels, sprites, vent, éclairage
// ═══════════════════════════════════════════════════════════════════════════════════════
function fl_h(i, s = 0) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function fl_h2(x, y, s = 0) { return fl_h(Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663), s); }
function fl_n1(x, s = 0) {                                          // bruit de valeur 1D lisse (0..1)
  const i = Math.floor(x), f = x - i, u = f * f * f * (f * (f * 6 - 15) + 10);
  return fl_h(i, s) * (1 - u) + fl_h(i + 1, s) * u;
}
function fl_n2(x, y, s = 0) {                                       // bruit de valeur 2D lisse (0..1)
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = fl_h2(ix, iy, s), b = fl_h2(ix + 1, iy, s), c = fl_h2(ix, iy + 1, s), d = fl_h2(ix + 1, iy + 1, s);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}
function fl_fbm(x, y, s = 0, oct = 3) {
  let a = 0, amp = 0.5, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) { a += amp * fl_n2(x * f, y * f, s + i * 17); tot += amp; amp *= 0.5; f *= 2.03; }
  return a / tot;
}
const fl_cl = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const fl_ss = (a, b, x) => { const t = fl_cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fl_bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

// ───────────── couleurs ─────────────
const fl_rgbM = {};
function fl_rgb(c) { if (Array.isArray(c)) return c; return fl_rgbM[c] || (fl_rgbM[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]); }
function fl_mix(a, b, f) { a = fl_rgb(a); b = fl_rgb(b); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
const fl_u32M = {};
function fl_u(c) { const r = fl_rgb(c), k = (r[0] << 16 | r[1] << 8 | r[2]); return fl_u32M[k] ?? (fl_u32M[k] = (0xFF000000 | (Math.round(r[2]) << 16) | (Math.round(r[1]) << 8) | Math.round(r[0])) >>> 0); }
const fl_snapM = new Map();
// familles de couleurs : une teinte dégradée ne peut retomber que sur des couleurs de la même famille (pas de vert qui vire au violet)
const fl_FAMD = {
  conifer: () => [...GR.slice(0, 6), ...NI.slice(0, 4), CY[0], CY[1], ...ST.slice(0, 3), BL[0]],
  snow: () => [...NE, WH[1], WH[2], WH[3], ST[5], ST[6], ST[7], DU[7], DU[6], SK[4], CY[4], CY[3], BL[4], NI[8], NI[9], AM[9], AM[10]],
  leaf: () => [...GR.slice(1), ...LM, ...YE, ...NI.slice(0, 4), ...OC.slice(0, 3), CY[1], ST[1], ST[2], AM[8], AM[9]],
  wood: () => [...WO, ...OC, ...AM.slice(0, 9), ...SK, ...NI.slice(0, 4), ...DU.slice(0, 4), ...ST.slice(0, 4), RD[0], RD[1], WH[0], WH[1]],
  stone: () => [...ST, ...NI.slice(0, 6), WH[0], WH[1], ...NE, ...DU.slice(0, 5), ...BL.slice(0, 3), SK[2], SK[3], WO[3], WO[4], OC[2]],
  warm: () => [...OC, ...WO, ...AM, ...SK, ...RD, ...DU, ...NI.slice(0, 4), YE[0], YE[1], YE[2], WH[0], WH[1], WH[2], ST[0], ST[1], ST[2]],
};
const fl_famC = {};
function fl_snap(r, fam) {                                          // couleur RVB quelconque → couleur la plus proche de la palette (même métrique que le moteur)
  const key = (fam || '') + '|' + (Math.round(r[0]) << 16 | Math.round(r[1]) << 8 | Math.round(r[2])); let v = fl_snapM.get(key); if (v) return v;
  const cands = fam && fl_FAMD[fam] ? (fl_famC[fam] || (fl_famC[fam] = [...new Set(fl_FAMD[fam]())].map(fl_rgb))) : PAL;
  let best = 0, bd = 1e9;
  for (let i = 0; i < cands.length; i++) { const p = cands[i], rm = (r[0] + p[0]) / 2, dr = r[0] - p[0], dg = r[1] - p[1], db = r[2] - p[2], d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; if (d < bd) { bd = d; best = i; } }
  v = cands[best]; fl_snapM.set(key, v); return v;
}
const fl_us = (r, fam) => fl_u(fl_snap(fl_rgb(r), fam));                        // couleur ramenée à la palette, en u32
const fl_darkM = new Map();
function fl_darker(u, k = 0.5) {                                    // version plus sombre d'une couleur (contours sélectifs)
  const key = u + ':' + k; let v = fl_darkM.get(key); if (v !== undefined) return v;
  v = fl_us(fl_mix([u & 255, (u >>> 8) & 255, (u >>> 16) & 255], [8, 6, 22], k)); fl_darkM.set(key, v); return v;
}
const fl_lighter = (u, c, k) => fl_us(fl_mix([u & 255, (u >>> 8) & 255, (u >>> 16) & 255], c, k));

// ───────────── tampon de pixels (Uint32 ABGR) ─────────────
class fl_Buf {
  constructor(w, h) {
    this.w = w; this.h = h; this.c = mkCanvas(w, h); this.x = this.c.getContext('2d', { willReadFrequently: true });
    this.id = this.x.createImageData(w, h); this.d = new Uint32Array(this.id.data.buffer);
  }
  set(x, y, c) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.d[(y | 0) * this.w + (x | 0)] = c; }
  get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[(y | 0) * this.w + (x | 0)]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  hl(x0, x1, y, c) { if (y < 0 || y >= this.h) return; x0 = Math.max(0, Math.round(x0)); x1 = Math.min(this.w - 1, Math.round(x1)); y = y | 0; for (let x = x0; x <= x1; x++) this.d[y * this.w + x] = c; }
  line(x0, y0, x1, y1, c, th = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; const o = Math.floor(th / 2);
    for (let k = 0; k < 3000; k++) {
      if (th === 1) this.set(x0, y0, c); else for (let j = 0; j < th; j++) for (let i = 0; i < th; i++) this.set(x0 - o + i, y0 - o + j, c);
      if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  disc(cx, cy, r, c) { cx = Math.round(cx); cy = Math.round(cy); for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.6 - dy * dy))); this.hl(cx - hw, cx + hw, cy + dy, c); } }
  ell(cx, cy, rx, ry, c) { cx = Math.round(cx); cy = Math.round(cy); for (let dy = -ry; dy <= ry; dy++) { const k = 1 - (dy * dy) / (ry * ry + 0.6), hw = Math.floor(rx * Math.sqrt(Math.max(0, k)) + 0.35); this.hl(cx - hw, cx + hw, cy + dy, c); } }
  poly(pts, c) {
    let ymin = Infinity, ymax = -Infinity; for (const p of pts) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
    ymin = Math.max(0, Math.ceil(ymin - 0.5)); ymax = Math.min(this.h - 1, Math.floor(ymax - 0.5));
    for (let y = ymin; y <= ymax; y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) this.hl(Math.ceil(xs[i] - 0.5), Math.floor(xs[i + 1] - 0.5), y, c);
    }
  }
  flush() { this.x.putImageData(this.id, 0, 0); return this.c; }
}

// ───────────── cache de sprites (dessinés une fois, recopiés par drawImage) ─────────────
const fl_cache = new Map();
function fl_memo(key, fn) { let v = fl_cache.get(key); if (v === undefined) { v = fn(); fl_cache.set(key, v); } return v; }
// sprite w × h, ancre (ox, oy) = point de contact avec le sol ; fn(b) dessine dans le tampon b
function fl_spr(key, w, h, ox, oy, fn) {
  return fl_memo(key, () => { const b = new fl_Buf(w, h); fn(b); b.flush(); return { c: b.c, w, h, ox, oy, b }; });
}
function fl_blit(s, x, y, alpha = 1) {
  const dx = Math.round(x - s.ox), dy = Math.round(y - s.oy);
  if (dx > LW || dy > LH || dx + s.w < 0 || dy + s.h < 0) return;
  L.setTransform(1, 0, 0, 1, 0, 0); if (alpha < 1) L.globalAlpha = alpha; L.drawImage(s.c, dx, dy); L.globalAlpha = 1;
}
// recopie avec cisaillement : chaque rangée est décalée en x d'autant plus qu'elle est haute (la plante plie, la base reste en place)
function fl_blitSway(s, x, y, amp, o = {}) {
  const dx = Math.round(x - s.ox), dy = Math.round(y - s.oy), pw = o.pow ?? 1.6, span = o.span ?? Math.max(8, s.oy), floor = o.floor ?? 0;
  if (dx > LW + 12 || dy > LH || dx + s.w < -12 || dy + s.h < 0) return;
  L.setTransform(1, 0, 0, 1, 0, 0);
  let r0 = 0, sh0 = null;
  for (let r = 0; r <= s.h; r++) {
    let sh = null;
    if (r < s.h) { const hh = s.oy - r; sh = hh <= floor ? 0 : Math.round(amp * Math.pow(fl_cl((hh - floor) / span), pw)); }
    if (sh !== sh0) { if (sh0 !== null && r > r0) L.drawImage(s.c, 0, r0, s.w, r - r0, dx + sh0, dy + r0, s.w, r - r0); r0 = r; sh0 = sh; }
  }
}
// bande large (herbes) : cisaillement qui varie le long de la bande (onde de vent) ; phase par colonne de cw pixels
function fl_blitWave(s, x, y, t, o = {}) {
  const dx = Math.round(x - s.ox), dy = Math.round(y - s.oy), cw = o.cw ?? 16, amp = o.amp ?? 3, pw = o.pow ?? 1.5, span = o.span ?? s.oy, wind = o.wind ?? 1, k = o.k ?? 0.05;
  L.setTransform(1, 0, 0, 1, 0, 0);
  for (let cx = 0; cx < s.w; cx += cw) {
    const wx = dx + cx + (o.worldX || 0), sw = Math.min(cw + 1, s.w - cx);
    if (dx + cx > LW + 8 || dx + cx + sw < -8) continue;
    const g = fl_wind(t, wx, { wind }) + (o.lean ?? 0.3) * wind;
    let r0 = 0, sh0 = null;
    for (let r = 0; r <= s.h; r++) {
      let sh = null;
      if (r < s.h) { const hh = s.oy - r; sh = hh <= 0 ? 0 : Math.round(amp * g * Math.pow(fl_cl(hh / span), pw)); }
      if (sh !== sh0) { if (sh0 !== null && r > r0) L.drawImage(s.c, cx, r0, sw, r - r0, dx + cx + sh0, dy + r0, sw, r - r0); r0 = r; sh0 = sh; }
    }
  }
}

// ───────────── vent partagé : la même oscillation pour toutes les plantes (phase selon x) ─────────────
// renvoie environ −1 … 1 (multiplié par o.wind, 1 par défaut)
function fl_wind(t, x, o) {
  const w = (o && o.wind != null) ? o.wind : 1;
  return w * (0.66 * Math.sin(t * 1.3 + x * 0.05) + 0.24 * Math.sin(t * 2.3 + x * 0.11 + 1.3) + 0.1 * Math.sin(t * 4.1 + x * 0.21 + 0.4));
}

// ───────────── ambiances (mêmes noms que les préréglages de ciel de kit.js) ─────────────
const fl_ENV = {
  alaskaDusk: { light: -1, mist: '#9aa4d6', rim: '#ffd9d2', shadow: '#10102e', shK: 0.55, lit: '#f090a4', liK: 0.16, cast: '#3d55aa', castK: 0.3 },
  alaskaNight: { light: -1, mist: '#2c3c84', rim: '#8ae0c0', shadow: '#05040f', shK: 0.6, lit: '#3aa8c4', liK: 0.2, cast: '#202a62', castK: 0.5 },
  alaskaSpring: { light: 1, mist: '#e4eef8', rim: '#fff8e8', shadow: '#2c3c84', shK: 0.16, lit: '#ffe08a', liK: 0.14, cast: '#ffffff', castK: 0 },
  desertDusk: { light: 1, mist: '#9a4a98', rim: '#ffd890', shadow: '#2e1a56', shK: 0.42, lit: '#ffc84a', liK: 0.38, cast: '#8641a4', castK: 0.12 },
  savannaDawn: { light: 1, mist: '#b8607e', rim: '#ffe6a0', shadow: '#2e1a56', shK: 0.34, lit: '#ffe08a', liK: 0.32, cast: '#a9529f', castK: 0.1 },
};
function fl_env(o) {
  const name = (o && o.env) || 'alaskaSpring', E = fl_ENV[name] || fl_ENV.alaskaSpring;
  return { name, light: (o && o.light) || E.light, mist: (o && o.mist) || E.mist, rim: (o && o.rim) || E.rim, shadow: E.shadow, shK: E.shK, lit: E.lit, liK: E.liK, cast: E.cast, castK: E.castK, night: name === 'alaskaNight' };
}
// brume selon la profondeur : 0 = premier plan, 1 = lointain
const fl_fog = d => Math.pow(fl_cl((d - 0.1) / 0.9), 0.85) * 0.93;
const fl_par = o => (o && o.par != null) ? o.par : 1.1 - 0.85 * fl_cl(o && o.depth != null ? o.depth : 0.4);
const fl_sx = (x, o) => x - ((o && o.cam) || 0) * fl_par(o);
const fl_sy = (y, o) => y - ((o && o.camY) || 0) * fl_par(o);
// rampe de couleurs (du sombre au clair) → tons en u32 : teintée par la lumière de l'ambiance, fondue dans la brume selon la profondeur, ramenée à la palette
function fl_tones(ramp, o, fam) {
  const E = fl_env(o), d = Math.round((o && o.depth != null ? o.depth : 0.4) * 10) / 10, k = ramp.join('') + '|' + E.name + E.mist + '|' + d + '|' + (o && o.fogK || 1) + '|' + (fam || '');
  return fl_memo('tn|' + k, () => {
    const fg = fl_fog(d) * ((o && o.fogK) ?? 1), n = ramp.length;
    return ramp.map((c, i) => {
      const f = n > 1 ? i / (n - 1) : 0.5; let r = fl_rgb(c);
      r = fl_mix(r, E.cast, E.castK); r = fl_mix(r, E.shadow, E.shK * (1 - f) * (1 - f)); r = fl_mix(r, E.lit, E.liK * f * f);
      if (d < 0.15) r = fl_mix(r, [5, 4, 15], 0.14 * (1 - f));
      r = fl_mix(r, E.mist, fg * (0.55 + 0.45 * f * 0.4 + 0.2 * (1 - f)));
      return fl_us(r, fam);
    });
  });
}
// ton dithéré : v de 0 (ombre) à 1 (lumière) → indice dans n tons ; dk règle la netteté de la transition (grand = bandes nettes)
function fl_tone(v, n, x, y, dk = 3) {
  if (n <= 1) return 0;
  const vi = fl_cl(v) * (n - 1), i = Math.min(n - 2, Math.floor(vi)), f = vi - i, f2 = fl_cl((f - 0.5) * dk + 0.5);
  return fl_bay(x, y) < f2 ? i + 1 : i;
}
// éclairage d'une normale (nx, ny, nz) par une lumière venant de `light` (−1 gauche, +1 droite) et d'en haut ; renvoie 0 … 1
function fl_lam(nx, ny, nz, light) { const d = nx * light * 0.72 - ny * 0.5 + nz * 0.5; return fl_cl((d + 0.35) / 1.45); }

// ───────────── courbes et tubes ─────────────
function fl_cr(pts, n = 8) {                                        // Catmull-Rom à travers pts (n-dimensionnels) : n sous-divisions par segment
  const out = [], m = pts.length, dim = pts[0].length;
  if (m < 3) { for (let i = 0; i <= n; i++) out.push(pts[0].map((v, k) => v + (pts[m - 1][k] - v) * i / n)); return out; }
  for (let i = 0; i < m - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(m - 1, i + 2)];
    for (let j = 0; j < n; j++) {
      const s = j / n, v = [];
      for (let k = 0; k < dim; k++) v.push(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * s + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * s * s + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * s * s * s));
      out.push(v);
    }
  }
  out.push(pts[m - 1].slice()); return out;
}
// tube : points [x, y, largeur] ; colFn(lat, nx, ny, s, x, y) → couleur u32 (ou 0 pour ne rien poser) ; lat de −1 à 1 en travers du tube
function fl_tube(b, pts, colFn, o = {}) {
  const S = fl_cr(pts, o.sub ?? 12), dense = [];
  for (let i = 0; i < S.length - 1; i++) {
    const a = S[i], c = S[i + 1], dist = Math.hypot(c[0] - a[0], c[1] - a[1]), k = Math.max(1, Math.ceil(dist / 0.5));
    for (let j = 0; j < k; j++) { const f = j / k; dense.push([a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f, a[2] + (c[2] - a[2]) * f]); }
  }
  dense.push(S[S.length - 1]);
  const N = dense.length;
  for (let i = 0; i < N; i++) {
    const a = dense[Math.max(0, i - 2)], c = dense[Math.min(N - 1, i + 2)];
    let tx = c[0] - a[0], ty = c[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const nx = -ty, ny = tx, p = dense[i], w = Math.max(0.8, p[2]), hw = w / 2, steps = Math.max(1, Math.ceil(w * 2));
    for (let j = 0; j <= steps; j++) {
      const lat = steps === 0 ? 0 : (j / steps) * 2 - 1, d = lat * hw, x = p[0] + nx * d, y = p[1] + ny * d;
      const col = colFn(lat, nx, ny, i / (N - 1), x, y);
      if (col) b.set(Math.round(x), Math.round(y), col);
    }
  }
}
// ombrage de tube standard : tons du sombre au clair, lumière latérale
function fl_shader(T, light, o = {}) {
  const dk = o.dk ?? 3, bias = o.bias ?? 0, rough = o.rough ?? 0.0;
  return (lat, nx, ny, s, x, y) => {
    const nz = Math.sqrt(Math.max(0, 1 - lat * lat)), v = fl_lam(nx * lat, ny * lat, nz, light) + bias + (rough ? (fl_h2(Math.round(x), Math.round(y), 5) - 0.5) * rough : 0);
    return T[fl_tone(v, T.length, Math.round(x), Math.round(y), dk)];
  };
}
// contour sélectif : chaque pixel vide au contact d'un pixel plein devient une version sombre de ce pixel
function fl_selout(b, k = 0.55, only = null) {
  const w = b.w, h = b.h, d = b.d, add = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (d[i]) continue;
    let n = 0;
    if (x > 0 && d[i - 1]) n = d[i - 1]; else if (x < w - 1 && d[i + 1]) n = d[i + 1]; else if (y > 0 && d[i - w]) n = d[i - w]; else if (y < h - 1 && d[i + w]) n = d[i + w];
    if (n && (!only || only(x, y, n))) add.push(i, fl_darker(n, k));
  }
  for (let j = 0; j < add.length; j += 2) d[add[j]] = add[j + 1];
}
// liseré de lumière : le pixel le plus extérieur du bord tourné vers le soleil (et un peu du haut) prend la couleur rim
function fl_rim(b, light, rimU, o = {}) {
  const w = b.w, h = b.h, d = b.d, upper = o.top ?? true, add = [], skip = o.skip || null;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, c = d[i]; if (!c || (skip && skip(c))) continue;
    const xs = x - light, sideEmpty = xs < 0 || xs >= w || !d[i - light], topEmpty = y === 0 || !d[i - w];
    if (sideEmpty || (upper && topEmpty && fl_h2(x, y, 3) < (o.topP ?? 0.7))) add.push(i);
  }
  for (const i of add) d[i] = rimU;
}
// ombre portée au sol (ovale tramé) dans un tampon
function fl_gshadow(b, cx, cy, rx, ry, u, dens = 0.7) {
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    const e = (x * x) / (rx * rx) + (y * y) / (ry * ry); if (e > 1) continue;
    if (fl_bay(cx + x, cy + y) < dens * (1 - e * 0.6)) b.set(cx + x, cy + y, u);
  }
}
// bouquet de feuillage : ovale ébouriffé, 3 à 4 tons, lumière du côté soleil (bosse de feuilles, buisson, parasol d'acacia)
function fl_clump(b, cx, cy, rx, ry, T, light, o = {}) {
  const rag = o.rag ?? 0.38, seed = o.seed ?? 1, dk = o.dk ?? 3, bias = o.bias ?? 0, hi = o.hi ?? 0.28;
  for (let dy = -ry - 1; dy <= ry + 1; dy++) for (let dx = -rx - 1; dx <= rx + 1; dx++) {
    const nx = dx / rx, ny = dy / ry, e = nx * nx + ny * ny, x = Math.round(cx + dx), y = Math.round(cy + dy), hh = fl_h2(x, y, seed);
    if (e + (hh - 0.5) * rag > 1) continue;
    const nz = Math.sqrt(Math.max(0, 1 - e)), v = fl_lam(nx, ny, nz, light) + bias + (fl_h2(x * 3, y * 3, seed + 9) - 0.5) * hi;
    b.set(x, y, T[fl_tone(v, T.length, x, y, dk)]);
  }
}
// parcours d'une table de graines : retourne un générateur seed-based
const fl_rng = seed => rng((seed | 0) * 7919 + 13);
// options communes lues par toutes les fonctions
function fl_o(o) {
  o = o || {};
  return { x: o.x ?? 0, y: o.y ?? 0, depth: o.depth ?? 0.4, cam: o.cam || 0, wind: o.wind ?? 1, seed: o.seed ?? 1, E: fl_env(o), o };
}

// ───────────── pousse récursive de branches (bouleau, branches mortes, acacia, ocotillo, arbustes secs…) ─────────────
// cfg : r (générateur), curve (courbure), wob (bruit d'angle), droop (0..1 : la branche retombe), split (enfants par branche), sa (écart d'angle des enfants),
//       lk (rapport de longueur des enfants), wk (rapport de largeur), maxLvl, draw(b, pts, w, lvl) → dessine la polyligne, tip(x, y, lvl, ang), minLen
function fl_grow(b, x, y, ang, len, w, cfg, lvl = 0) {
  const r = cfg.r, n = Math.max(3, Math.round(len / 2.2)), pts = [[x, y, w]], droop = cfg.droop ?? 0;
  let a = ang, cx = x, cy = y;
  const angs = [a];
  for (let i = 1; i <= n; i++) {
    a += (r() - 0.5) * (cfg.wob ?? 0.3) + (cfg.curve ?? 0) / n;
    if (droop) { let d = Math.PI / 2 - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; a += d * droop * 0.09 * (0.4 + i / n); }
    cx += Math.cos(a) * len / n; cy += Math.sin(a) * len / n; pts.push([cx, cy, Math.max(1, w * (1 - 0.6 * i / n))]); angs.push(a);
  }
  cfg.draw(b, pts, w, lvl);
  if (lvl < (cfg.maxLvl ?? 2) && len > (cfg.minLen ?? 5)) {
    const ns = Math.max(0, Math.round((cfg.split ?? 2) * (0.7 + 0.6 * r())));
    for (let k = 0; k < ns; k++) {
      const f = 0.3 + 0.6 * r(), i = Math.min(n, Math.round(f * n)), p = pts[i], ca = angs[i] + (r() < 0.5 ? -1 : 1) * (cfg.sa ?? 0.8) * (0.7 + 0.6 * r());
      fl_grow(b, p[0], p[1], ca, len * (cfg.lk ?? 0.55) * (0.7 + 0.6 * r()) * (1 - f * 0.5), Math.max(1, w * (cfg.wk ?? 0.6)), cfg, lvl + 1);
    }
  }
  if (cfg.tip) cfg.tip(cx, cy, lvl, a);
}
// courbe polylignée dense → pixels d'1 px
function fl_poly1(b, pts, c) { for (let i = 0; i < pts.length - 1; i++) b.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], typeof c === 'function' ? c(i / pts.length) : c); }

// ═══════════════════════════════════════════════════════════════════════════════════════
// 2. ÉPICÉAS ET FORÊTS BORÉALES
// ═══════════════════════════════════════════════════════════════════════════════════════
const fl_GRN = [GR[0], GR[1], GR[2], GR[3], GR[4]];
const fl_SNW = [NE[0], NE[1], NE[2], NE[3], NE[4]];

// copie les pixels non transparents d'un tampon dans un autre
function fl_paste(dst, src, x, y) {
  const w = src.w, h = src.h, sd = src.d;
  for (let j = 0; j < h; j++) { const yy = y + j; if (yy < 0 || yy >= dst.h) continue; for (let i = 0; i < w; i++) { const c = sd[j * w + i]; if (!c) continue; const xx = x + i; if (xx < 0 || xx >= dst.w) continue; dst.d[yy * dst.w + xx] = c; } }
}

// sprite d'épicéa : étages de branches retombantes ; neige en paquets arrondis sur chaque étage (lumière côté soleil, creux bleutés), ombre portée de l'étage du dessus
function fl_spruceSpr(h, seed, snow, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.4) * 10) / 10, slim = o.slim ?? 0.17;
  const key = `spr2|${h}|${seed}|${Math.round(snow * 10)}|${E.name}|${E.mist}|${light}|${dep}|${slim}|${o.green || ''}`;
  const hw = Math.max(5, Math.round(h * slim)), W = hw * 2 + 14, H = h + 5;
  return fl_spr(key, W, H, W >> 1, H - 3, b => {
    const g = fl_tones(o.green || fl_GRN, o, 'conifer'), s = fl_tones(fl_SNW, o, 'snow'), wd = fl_tones([WO[0], WO[1], WO[2], WO[3]], o, 'wood'), r = fl_rng(seed);
    const cx = W >> 1, trunkH = Math.max(3, Math.round(h * 0.045)), crownH = h - trunkH, leader = Math.max(3, Math.round(crownH * 0.07));
    const n = Math.max(4, Math.round((crownH - leader) / (h < 50 ? 6 : h < 90 ? 8 : h < 140 ? 10 : 11))), sp = (crownH - leader) / n;
    const near = dep < 0.3, small = h < 60;
    // tronc visible sous les branches
    for (let y = crownH - 4; y < H - 3; y++) { const wdt = y > H - 8 ? 4 : 3; for (let x = 0; x < wdt; x++) b.set(cx - 1 + x, y, wd[x === 0 ? (light > 0 ? 1 : 2) : x === wdt - 1 ? (light > 0 ? 2 : 1) : 2]); }
    let prevFr = null;
    for (let i = 0; i < n; i++) {
      const q = (i + 1) / n, yB = leader + sp * (i + 1) + 1 + (r() - 0.5) * sp * 0.4, tierH = Math.max(7, sp * (2.0 + r() * 0.5)), yA = yB - tierH;
      const hwL = Math.max(3, Math.round(hw * (0.1 + 0.9 * Math.pow(q, 1.0)) * (0.86 + r() * 0.28))), hwR = Math.max(3, Math.round(hw * (0.1 + 0.9 * Math.pow(q, 1.0)) * (0.86 + r() * 0.28))), tip = 2.2 + r() * 1.6;
      const fw = small ? 3 : 4, nf = Math.ceil((hwL + hwR) / fw) + 3, fl = []; for (let f = 0; f < nf; f++) fl.push(r() < 0.22 ? 1.0 + r() * 0.7 : 0.25 + r() * 0.55);
      // paquets de neige le long de la pente
      const lumps = []; { let xx = -hwL - 1; while (xx < hwR + 2) { const w = (small ? 2 : 2.6) + r() * (small ? 2 : 3.4); lumps.push({ xc: xx + w, w, T: snow * ((small ? 2.2 : 3.6) + r() * (small ? 3.0 : 6.0)) }); xx += w * 1.55; } }
      const fr = {}, x0 = cx - hwL;
      for (let x = cx - hwL; x <= cx + hwR; x++) {
        const rel = x - cx, dxs = rel < 0 ? rel / hwL : rel / hwR, dx = Math.abs(dxs), litSide = dxs * light >= 0 ? 1 : 0;
        const yTop = yA + (yB - tip - yA) * (0.8 * dx + 0.2 * Math.pow(dx, 2.4)) + (fl_h2(x, i, seed) - 0.5) * 1.1;
        const fi = Math.floor((x - x0) / fw), tr = ((x - x0) % fw) / fw, tri = 1 - Math.abs(tr * 2 - 1);
        const uplift = tierH * 0.36 * Math.pow(1 - dx, 1.1), droop = tierH * 0.18 * fl[fi] * (0.3 + 0.7 * tri) * (0.45 + 0.55 * dx) * (1 - 0.7 * Math.pow(dx, 3));
        const yBot = yB - uplift + droop;
        fr[x] = yBot;
        // épaisseur de neige en cette colonne (et la lumpe qui la porte)
        let T = 0, lp = null;
        for (const L_ of lumps) { const u = (rel - L_.xc) / L_.w; if (u > -1 && u < 1) { const tt = L_.T * Math.pow(1 - u * u, 0.55) * (1 - 0.65 * dx * dx) * (0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, (1 - dx) * 1.1 + 0.15))); if (tt > T) { T = tt; lp = L_; } } }
        const sTop = yTop - T * 0.38, sBot = yTop + T * 0.62;
        for (let y = Math.ceil(Math.min(sTop, yTop)); y <= Math.round(yBot); y++) {
          const tb = yBot - y; let c;
          if (T > 0.8 && y >= Math.round(sTop) && y <= Math.round(sBot)) {
            const yn = (y - sTop) / Math.max(1, sBot - sTop), un = lp ? (rel - lp.xc) / lp.w : 0;
            let v = 0.52 + 0.36 * un * light + 0.3 * (0.5 - yn) * (0.6 + 0.4 * (1 - Math.abs(un))) - (yn > 0.8 ? 0.28 : 0);
            if (prevFr && prevFr[x] !== undefined && y < prevFr[x] + 3.2 && y > prevFr[x] - 0.5) v -= 0.3;
            c = s[fl_tone(v, 5, x, y, 3.2)];
          } else if (y < yTop - 0.5) continue;
          else {
            const v = fl_cl(1 - tb / (tierH * 0.6));
            let t = litSide ? (v > 0.5 ? 3 : v > 0.2 ? 2 : 1) : (v > 0.55 ? 2 : 1);
            const hh = fl_h2(x, y, seed + i);
            if (litSide && hh < 0.16 && v > 0.3 && dep < 0.5) t = Math.min(4, t + 1);
            if (!litSide && hh < 0.06) t = Math.min(3, t + 1);
            if (tri < 0.2 && tb > 2 && tb < tierH * 0.45) t = Math.max(0, t - 1);
            if (tb < 1.4 && hh < 0.6) t = Math.max(0, t - 1);
            if (T > 0.8 && y <= Math.round(sBot) + 2 && y > Math.round(sBot)) t = Math.min(t, 1);
            c = g[t];
          }
          b.set(x, y, c);
        }
        if (tri > 0.75 && fl[fi] > 0.7 && dx > 0.2) { b.set(x, Math.round(yBot) + 1, g[0]); if (fl[fi] > 1.2) b.set(x, Math.round(yBot) + 2, g[0]); }
      }
      prevFr = fr;
    }
    // flèche terminale
    for (let y = 0; y < leader + 3; y++) { b.set(cx, y + 1, g[1]); if (y > 3) { b.set(cx - 1, y + 1, g[light > 0 ? 0 : 1]); b.set(cx + 1, y + 1, g[light > 0 ? 1 : 0]); } }
    if (snow > 0.15) { b.set(cx, 0, s[3]); b.set(cx, 1, s[light > 0 ? 3 : 2]); b.set(cx - 1, 2, s[1]); b.set(cx + 1, 2, s[2]); }
    // neige tassée au pied
    if (snow > 0.15 && dep < 0.7) { for (let x = -4; x <= 4; x++) b.set(cx + x, H - 3 + (Math.abs(x) > 2 ? 0 : -1), x * light > 0 ? s[4] : s[2]); }
    if (dep < 0.55) fl_selout(b, near ? 0.62 : 0.5);
  });
}
// épicéa : x, y = pied, h = hauteur (px) ; snow 0..1 ; sway minuscule
function fl_spruce(t, o = {}) {
  const p = fl_o(o), h = Math.round(o.h ?? 100), snow = o.snow ?? 0.85, spr = fl_spruceSpr(h, (o.seed ?? 1) | 0, snow, { ...o, depth: p.depth });
  const x = fl_sx(p.x, o), y = fl_sy(p.y, o);
  fl_blitSway(spr, x, y, 1.2 * fl_wind(t, p.x, o) * Math.min(1.6, h / 90), { pow: 2 });
}

// ───────── bandes de forêt ─────────
// une bande = une frise d'épicéas lointains (précalculée, plus large que l'écran pour la parallaxe)
function fl_forestBand(key, o, hMean, depth, seed, y0) {
  const M = 120, W = LW + 2 * M, E = fl_env(o), H = Math.round(hMean * 1.5) + 8;
  return fl_spr(key, W, H, M, H - 2, b => {
    const r = fl_rng(seed), mistU = fl_us(E.mist), list = [];
    let x = -M + r() * 6, i = 0;
    while (x < W - M) {
      const hh = Math.round(hMean * (0.65 + 0.7 * r())), gap = (o.gap ?? 0.55) * hMean * (0.12 + 0.3 * r());
      list.push({ x, hh, i }); x += hh * 0.30 * 2 * (o.spread ?? 0.62) + gap * 0.4 + 2; i++;
    }
    list.sort((a, c) => a.hh - c.hh);
    for (const tr of list) {
      const spr = fl_spruceSpr(tr.hh, 100 + (tr.i % 7), o.snow ?? 0.8, { ...o, depth }), px = Math.round(M + tr.x - spr.ox), py = H - 2 - spr.oy + (tr.hh < hMean * 0.8 ? -1 : 0);
      fl_paste(b, spr.b, px, py);
    }
    // brume basse : les pieds des arbres se fondent dans le brouillard
    const fogK = o.fog ?? 0.55;
    if (fogK > 0) for (let y = 0; y < H; y++) { const f = fl_ss(H * 0.35, H - 1, y) * fogK; if (f <= 0) continue; for (let xx = 0; xx < W; xx++) { const c = b.d[y * W + xx]; if (c && fl_bay(xx, y) < f) b.d[y * W + xx] = mistU; } }
  });
}
// forêt à plusieurs plans : o.y = ligne de sol du plan le plus proche ; o.bands = nombre de plans (3) ; o.h = hauteur moyenne des arbres du plan proche
// o.depth = profondeur du plan le plus lointain (0,85) ; o.depthNear = celle du plan proche (0,4)
function fl_spruceForest(t, o = {}) {
  const n = o.bands ?? 3, hN = o.h ?? 70, dF = o.depth ?? 0.85, dN = o.depthNear ?? Math.max(0.25, dF - 0.5), step = o.step ?? 9, E = fl_env(o);
  for (let k = 0; k < n; k++) {                                     // du plus lointain au plus proche
    const f = n > 1 ? k / (n - 1) : 1, depth = dF + (dN - dF) * f, hk = hN * (0.5 + 0.5 * f), yk = (o.y ?? 300) - (n - 1 - k) * step;
    const par = o.par != null ? o.par * (0.4 + 0.6 * f) : 1.1 - 0.85 * depth, oo = { ...o, depth, par };
    const key = `fb|${k}|${n}|${Math.round(hN)}|${o.seed ?? 1}|${E.name}|${E.mist}|${E.light}|${o.snow ?? 0.8}|${o.fog ?? 0.55}|${o.gap ?? 0.55}|${o.spread ?? 0.62}|${dF}|${dN}`;
    const band = fl_forestBand(key, { ...o, depth }, hk, depth, (o.seed ?? 1) * 31 + k * 7, yk);
    const shift = fl_cl((o.cam || 0) * par, -110, 110);
    let x = -shift;
    if (o.x0 != null || o.x1 != null) { L.save(); L.beginPath(); L.rect(o.x0 ?? 0, 0, (o.x1 ?? LW) - (o.x0 ?? 0), LH); L.clip(); }
    fl_blitSway(band, x, yk + (o.sink ?? 0), fl_wind(t, k * 40, o) * 0.6 * f, { pow: 2 });
    if (o.x0 != null || o.x1 != null) L.restore();
    if (o.mist !== false && k < n - 1) fl_mistBand(yk - 3, 14 + 6 * (1 - f), t, { ...o, depth, seedK: k, a: 0.5 * (o.mistA ?? 1) });
  }
}
// bande de brume tramée qui dérive lentement (y = ligne centrale)
function fl_mistBand(y, hh, t, o = {}) {
  const E = fl_env(o), u = fl_us(E.mist), a = o.a ?? 0.5, k = o.seedK ?? 0, sp = o.drift ?? 4, cam = (o.cam || 0) * fl_par(o);
  const b = fl_memo('mb|' + LW + 'x' + (hh * 2 + 2), () => new fl_Buf(LW, hh * 2 + 2));
  b.d.fill(0);
  for (let j = 0; j < hh * 2 + 2; j++) {
    const v = 1 - Math.abs(j - hh) / hh; if (v <= 0) continue;
    for (let x = 0; x < LW; x++) {
      const n = fl_n2((x + cam + t * sp) / 34, j / 5 + k * 7, 21 + k) * 0.7 + fl_n2((x + cam * 1.1 - t * sp * 0.6) / 13, j / 3, 5) * 0.3;
      if (fl_bay(x, j) < a * v * (n * 1.5 - 0.15)) b.d[j * LW + x] = u;
    }
  }
  b.flush(); L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(b.c, 0, Math.round(y - hh));
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// 3. SOLS : neige (avec fonte), terre détrempée, litière de feuilles, sable, terre rouge de savane
// ═══════════════════════════════════════════════════════════════════════════════════════
const fl_GM = 100;                                                   // marge horizontale des sols (px de chaque côté) pour la parallaxe
// perspective du sol : s vaut 1 en bas de la bande et diminue vers l'horizon (hz = ligne d'horizon fictive)
const fl_gs = (y, y1, hz) => Math.max(0.1, (y - hz) / (y1 - hz));

// champ de base d'un sol (précalculé) : relief, éclairage par la pente, champ de « neige » S pour la fonte
// coordonnées étirées en largeur, plus fines vers l'horizon (pas de rayons convergents)
function fl_gfield(y0, y1, seed, hz, light, o = {}) {
  const key = `gf2|${y0}|${y1}|${seed}|${hz}|${light}|${o.ku ?? 1}|${o.kv ?? 1}|${o.rip ?? 0}|${o.kx ?? 0}`;
  return fl_memo(key, () => {
    const M = fl_GM, w = LW + 2 * M, h = y1 - y0, S = new Float32Array(w * h), V = new Float32Array(w * h), Hh = new Float32Array(w * h), Pd = new Float32Array(h * 3), ku = o.ku ?? 1, kv = o.kv ?? 1;
    const prev = new Float32Array(w), cur = new Float32Array(w);
    for (let y = 0; y < h; y++) {
      const ay = y0 + y, s = fl_gs(ay, y1, hz), yn = y / h, sx = (0.32 + 0.68 * Math.pow(yn, 0.85)) * ku, sy = (0.4 + 0.6 * yn) * kv, wv = (1 / s - 1) * 38 * kv;
      Pd[y * 3] = s; Pd[y * 3 + 1] = wv; Pd[y * 3 + 2] = sx;
      for (let x = 0; x < w; x++) {
        const wx = (x - M) / sx;
        let H = fl_fbm(wx / 110, y / (11 * sy), seed, 2) * 1.0 + 0.16 * fl_fbm(wx / 38, y / (5 * sy), seed + 3, 2);
        if (o.rip) { const ph = wv / o.rip + 2.2 * fl_fbm(wx / 70, y / (6 * sy), seed + 5, 2); const f = ph - Math.floor(ph); H += 0.5 * (f < 0.7 ? f / 0.7 : (1 - f) / 0.3); }
        cur[x] = H; Hh[y * w + x] = H;
        S[y * w + x] = fl_clamp01((fl_fbm(wx / 40, y / (6.5 * sy), seed + 11, 3) * 0.8 + fl_fbm(wx / 12, y / (2.6 * sy), seed + 13, 2) * 0.2 - 0.3) / 0.4);
      }
      for (let x = 1; x < w - 1; x++) {
        const gx = cur[x + 1] - cur[x - 1], gy = y > 0 ? cur[x] - prev[x] : 0;
        V[y * w + x] = 0.66 - gx * light * (o.kx || 6) + gy * (o.ky ?? 4);
      }
      prev.set(cur);
    }
    return { w, h, S, V, H: Hh, Pd, M };
  });
}
const fl_clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

// empreintes de pas dans la neige ou le sable : o.tracks = [{ x0, y0, x1, y1, kind: 'paw' | 'boot' | 'hop' | 'lizard', step }]
function fl_stampTracks(b, y0, y1, hz, tracks, tones, light, M) {
  const [dk, md, lt] = tones;
  for (const tr of tracks) {
    const len = Math.hypot(tr.x1 - tr.x0, tr.y1 - tr.y0), step = tr.step ?? 8, n = Math.max(1, Math.floor(len / step)), kind = tr.kind || 'paw';
    if (kind === 'lizard') {                                      // piste de lézard : ligne de queue sinueuse et petites pattes
      for (let k = 0; k <= len; k++) { const f = k / len, x = tr.x0 + (tr.x1 - tr.x0) * f, y = tr.y0 + (tr.y1 - tr.y0) * f + Math.sin(f * 14) * 1.5 * fl_gs(y0 + (tr.y0 + (tr.y1 - tr.y0) * f - y0), y1, hz); b.set(Math.round(x + M), Math.round(y - y0), k % 2 ? dk : md); }
      for (let k = 0; k < n; k++) { const f = k / n, x = tr.x0 + (tr.x1 - tr.x0) * f, y = tr.y0 + (tr.y1 - tr.y0) * f; for (const sd of [-1, 1]) { b.set(Math.round(x + M + sd * 2), Math.round(y - y0 + sd), dk); b.set(Math.round(x + M + sd * 3), Math.round(y - y0 + sd * 2), md); } }
      continue;
    }
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n, x = tr.x0 + (tr.x1 - tr.x0) * f, y = tr.y0 + (tr.y1 - tr.y0) * f, s = fl_gs(y, y1, hz), side = k % 2 ? 1 : -1;
      const ang = Math.atan2(tr.y1 - tr.y0, tr.x1 - tr.x0), ox = -Math.sin(ang) * side * 2.2 * s * (tr.spread ?? 1), oy = Math.cos(ang) * side * 1.2 * s * (tr.spread ?? 1);
      const cx = Math.round(x + ox + M), cy = Math.round(y + oy - y0), sz = (tr.size ?? 1) * s;
      if (kind === 'boot') { const rx = Math.max(1, Math.round(2.2 * sz)), ry = Math.max(1, Math.round(1.4 * sz)); b.ell(cx, cy, rx, ry, dk); b.ell(cx - light, cy - 1, Math.max(0, rx - 1), Math.max(0, ry - 1), md); b.set(cx + light * rx, cy, lt); b.set(cx + light * rx, cy + 1, lt); }
      else if (kind === 'hop') { b.set(cx, cy, dk); b.set(cx + 1, cy, md); b.set(cx - 1, cy + 1, dk); b.set(cx + light, cy - 1, lt); }
      else { for (const [dx, dy] of [[-1, -1], [1, -1], [0, 0], [0, 1]]) { b.set(cx + Math.round(dx * sz * 1.2), cy + Math.round(dy * sz), dk); } b.set(cx + light, cy - 1, lt); }
    }
  }
}

// ───────────── neige ─────────────
// o : cam, par, melt (0..1), env, seed, hz, shadows [{x, y, len, w}], tracks, under ('mud' | 'litter' | 'grass'), depth, sparkle (1)
function fl_snowGround(y0, y1, o = {}) {
  o = o || {}; const E = fl_env(o), light = E.light, seed = (o.seed ?? 1) | 0, hz = o.hz ?? (y0 - 70), melt = Math.round(fl_cl(o.melt ?? 0) * 40) / 40, under = o.under || 'mud';
  const par = fl_par({ ...o, depth: o.depth ?? 0.12 }), shift = fl_cl((o.cam || 0) * par, -fl_GM, fl_GM);
  const key = `sg|${y0}|${y1}|${seed}|${hz}|${E.name}|${E.mist}|${light}|${melt}|${under}|${JSON.stringify(o.shadows || '')}|${JSON.stringify(o.tracks || '')}|${o.depth ?? ''}|${o.blue ?? 1}`;
  const spr = fl_memo(key, () => fl_snowBuild(y0, y1, seed, hz, E, melt, under, o));
  fl_blit(spr, -shift, y0, 1);
  // scintillement
  const spk = o.sparkle ?? 1, t = o.t ?? 0;
  if (spk > 0 && melt < 0.9) {
    const T = fl_tones(fl_SNW, { ...o, depth: 0.1 }, 'snow'), hot = T[4];
    const n = Math.round(70 * spk), w = spr.w, h = spr.h;
    for (let k = 0; k < n; k++) {
      const hx = fl_h(k, seed + 70), hy = fl_h(k, seed + 71), ph = fl_h(k, seed + 72), x = Math.floor(hx * w), yy = Math.floor(Math.pow(hy, 0.8) * h);
      const f = ((t * 0.8 + ph * 7) % 1 + 1) % 1; if (f > 0.14) continue;
      if (spr.b.get(x, yy) !== hot && spr.b.get(x, yy) !== T[3]) continue;
      const sy = y0 + yy, a = f < 0.07 ? f / 0.07 : (0.14 - f) / 0.07, big = a > 0.6 && fl_h(k, seed + 73) < 0.5, X0 = x - fl_GM - shift;
      if (X0 < 0 || X0 >= LW) continue;
      R(X0, sy, 1, 1, WH[3]);
      if (big) { R(X0 - 1, sy, 1, 1, NE[4]); R(X0 + 1, sy, 1, 1, NE[4]); R(X0, sy - 1, 1, 1, NE[4]); R(X0, sy + 1, 1, 1, NE[4]); }
    }
  }
}
function fl_waterTones(E, o) {
  return fl_tones(o.water || (E.name === 'alaskaSpring' ? [ST[3], ST[5], NE[1], NE[3]] : [NI[3], BL[1], BL[2], ST[5]]), { ...o, depth: 0.15 }, 'snow');
}
function fl_snowBuild(y0, y1, seed, hz, E, melt, under, o) {
  const F = fl_gfield(y0, y1, seed, hz, E.light, {}), { w, h, S, V, M, Pd } = F, light = E.light, b = new fl_Buf(w, h);
  const sN = fl_tones(fl_SNW, { ...o, depth: 0.08 }, 'snow'), sF = fl_tones(fl_SNW, { ...o, depth: 0.75 }, 'snow');
  const U = fl_underBuild(F, y0, y1, seed, hz, E, under, o), P = fl_pfield(F, seed);
  const tm = melt * 1.1 - 0.05, mask = new Uint8Array(w * h), wT = fl_waterTones(E, o), blue = o.blue ?? 1;
  // ombres portées (arbres) : assombrit le champ d'éclairage
  const V2 = new Float32Array(V);
  if (o.shadows) for (const sh of o.shadows) {
    const cx = sh.x + M - E.light * (sh.len || 40) * 0.5, cy = sh.y - y0 + 1, rx = (sh.len || 40) * 0.5, ry = (sh.w || 4) * 0.5;
    for (let y = Math.max(0, Math.floor(cy - ry - 1)); y <= Math.min(h - 1, Math.ceil(cy + ry + 1)); y++) for (let x = Math.max(0, Math.floor(cx - rx - 1)); x <= Math.min(w - 1, Math.ceil(cx + rx + 1)); x++) {
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (e < 1) V2[y * w + x] -= 0.34 * fl_cl((1 - e) * 3.5);
    }
  }
  for (let y = 0; y < h; y++) {
    const fy = y / h, bias = fy * 0.14 * melt, farn = Math.pow(1 - fy, 1.7) * 0.8;
    for (let x = 0; x < w; x++) { const i = y * w + x; mask[i] = (S[i] > tm + bias) ? 1 : 0; }
    for (let x = 0; x < w; x++) {
      const i = y * w + x, snow = mask[i], Sn = S[i];
      if (snow) {
        const T = fl_bay(x, y) < farn ? sF : sN;
        let v = V2[i] + (fl_h2(x, y, seed) < 0.035 ? -0.1 : 0) + (1 - fy) * 0.05 + 0.06;
        if (blue !== 1) v -= (blue - 1) * 0.1;
        let c = T[fl_tone(v, 5, x, y, 3.4)];
        if (melt > 0.01) {
          const up = y > 0 && !mask[i - w], dn = y < h - 1 && !mask[i + w], dn2 = y < h - 2 && !mask[i + 2 * w];
          if (up) c = T[4]; else if (dn) c = T[1]; else if (dn2 && fl_h2(x, y, 4) < 0.6) c = T[2];
          if (Sn - (tm + bias) < 0.02 && fl_bay(x, y) < 0.5) c = U.d[i] || c;
        }
        b.d[i] = c;
      } else {
        const d = (tm + bias) - Sn; let c = U.d[i];
        if (melt > 0.02) {
          if (P[i] > 0.6 && d < 0.5) { const k = (P[i] - 0.6) / 0.08; c = wT[fl_cl(Math.floor(0.2 + k * 1.5 + (fl_h2(x >> 1, y, seed) < 0.25 ? 1 : 0)), 0, 3)]; if (k < 0.2) c = fl_darker(U.d[i], 0.3); }
          else if (d < 0.07) c = fl_darker(c, 0.28);
        }
        b.d[i] = c;
      }
    }
  }
  if (o.tracks) fl_stampTracks(b, y0, y1, hz, o.tracks, [sN[1], sN[2], sN[4]], light, M);
  b.flush(); return { c: b.c, w, h, ox: M, oy: 0, b };
}
// champ de flaques (zones basses où l'eau de fonte s'accumule)
function fl_pfield(F, seed) {
  return fl_memo(`pf|${F.w}|${F.h}|${seed}`, () => {
    const { w, h, Pd, M } = F, P = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { const sx = Pd[y * 3 + 2], sy = (0.4 + 0.6 * y / h); for (let x = 0; x < w; x++) P[y * w + x] = fl_fbm((x - M) / sx / 46, y / (5 * sy), seed + 41, 2); }
    return P;
  });
}

// ───────────── terre détrempée : couche sous la neige ─────────────
function fl_underBuild(F, y0, y1, seed, hz, E, kind, o) {
  const { w, h, Pd, M } = F, b = new fl_Buf(w, h), r = fl_rng(seed + 5), P = fl_pfield(F, seed);
  const mud = fl_tones([WO[0], WO[1], WO[2], WO[3]], { ...o, depth: 0.12 }, 'wood'), far = fl_tones([WO[0], WO[1], WO[2], WO[3]], { ...o, depth: 0.7 }, 'wood');
  const lf = fl_tones([OC[1], OC[2], OC[3], OC[4]], { ...o, depth: 0.12 }, 'wood'), dg = fl_tones([AM[2], AM[3], AM[4], AM[5]], { ...o, depth: 0.12 }, 'wood');
  const wT = fl_waterTones(E, o);
  for (let y = 0; y < h; y++) {
    const yn = y / h, farn = Math.pow(1 - yn, 1.5) * 0.8, sx = Pd[y * 3 + 2], sy = 0.4 + 0.6 * yn;
    for (let x = 0; x < w; x++) {
      const wx = (x - M) / sx, T = fl_bay(x, y) < farn ? far : mud;
      const v = 0.42 + (fl_fbm(wx / 46, y / (5 * sy), seed + 21, 3) - 0.5) * 0.85 + (fl_h2(x, y, seed + 2) < 0.03 ? 0.3 : 0);
      b.d[y * w + x] = T[fl_tone(v, 4, x, y, 3.6)];
    }
  }
  // feuilles mortes
  const nL = kind === 'litter' ? 1100 : kind === 'grass' ? 120 : 280;
  for (let k = 0; k < nL; k++) {
    const y = Math.floor(Math.pow(r(), 0.8) * h), yn = y / h, x = Math.floor(r() * w); if (P[y * w + x] > 0.6) continue;
    const sz = 1 + Math.round(yn * 1.2 * (0.6 + r() * 0.8)), cv = r(), tn = cv < 0.3 ? lf[0] : cv < 0.65 ? lf[1] : lf[2];
    b.ell(x, y, sz, sz > 2 ? 1 : 0, tn); b.set(x - E.light, y - (sz > 1 ? 1 : 0), lf[Math.min(3, (cv < 0.3 ? 1 : cv < 0.65 ? 2 : 3))]);
    if (sz > 1 && r() < 0.4) b.set(x + sz, y + 1, lf[0]);
  }
  if (kind === 'grass' || kind === 'litter') for (let k = 0; k < (kind === 'grass' ? 520 : 110); k++) {
    const y = Math.floor(Math.pow(r(), 0.8) * h), yn = y / h, x = Math.floor(r() * w), len = 2 + Math.round((2 + r() * 4) * (0.5 + yn)), lean = Math.round((r() - 0.5) * 3);
    const gc = r() < 0.5 ? dg[1] : dg[2]; for (let j = 0; j < len; j++) b.set(x + Math.round(lean * j / len), y - j, j > len * 0.6 ? dg[3] : gc);
  }
  return b;
}

// zone de feuilles mortes (patch ovale à bord irrégulier) ; o.snow : proportion couverte de neige (0 = aucune)
// o : env, seed, snow, cam, par, depth
function fl_leafLitter(x0, y0, x1, y1, o = {}) {
  o = o || {}; const E = fl_env(o), light = E.light, seed = (o.seed ?? 1) | 0, snow = Math.round(fl_cl(o.snow ?? 0) * 20) / 20, par = fl_par({ ...o, depth: o.depth ?? 0.12 }), shift = (o.cam || 0) * par;
  const W = Math.round(x1 - x0) + 8, H = Math.round(y1 - y0) + 6, key = `ll|${W}|${H}|${seed}|${E.name}|${E.mist}|${light}|${snow}|${o.depth ?? ''}`;
  const spr = fl_spr(key, W, H, 4, 3, b => {
    const r = fl_rng(seed + 9), mud = fl_tones([WO[0], WO[1], WO[2], WO[3]], { ...o, depth: o.depth ?? 0.12 }, 'wood'), lf = fl_tones([OC[1], OC[2], OC[3], OC[4], AM[5], AM[6]], { ...o, depth: o.depth ?? 0.12 }, 'wood');
    const sN = fl_tones(fl_SNW, { ...o, depth: o.depth ?? 0.1 }, 'snow'), cx = W / 2, cy = H / 2, rx = W / 2 - 3, ry = H / 2 - 2, inside = (x, y) => { const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (fl_n2(x / 6, y / 3, seed) - 0.5) * 0.5; return e; };
    const dens = {};
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const e = inside(x, y); if (e > 1) continue;
      const edge = fl_cl((1 - e) * 4); if (fl_bay(x, y) > edge + 0.2) continue;
      b.set(x, y, mud[fl_tone(0.35 + (fl_h2(x, y, seed) - 0.5) * 0.7 + (y / H - 0.5) * 0.2, 4, x, y, 3)]);
    }
    const nL = Math.round(W * H / 5.5);
    for (let k = 0; k < nL; k++) {
      const x = Math.round(r() * W), y = Math.round(Math.pow(r(), 0.85) * H), e = inside(x, y); if (e > 0.95) continue;
      const sz = 1 + Math.round((y / H) * 1.6 * (0.6 + r() * 0.7)), cv = r(), tn = cv < 0.3 ? lf[1] : cv < 0.6 ? lf[2] : cv < 0.85 ? lf[3] : lf[0];
      b.ell(x, y, sz, Math.max(0, sz - 1 + (r() < 0.4 ? 1 : 0)), tn); b.set(x - light, y - 1, lf[Math.min(5, (cv < 0.3 ? 2 : cv < 0.6 ? 3 : 4))]); if (sz > 1 && r() < 0.5) b.set(x + sz, y, lf[0]);
    }
    if (snow > 0) {
      const thr = 1 - snow;                                          // plus il y a de neige, plus le seuil est bas
      const m = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = inside(x, y); if (e > 0.98) continue; const sv = fl_fbm(x / 9, y / 4, seed + 4, 3) * 0.7 + fl_fbm(x / 3.5, y / 1.7, seed + 6, 2) * 0.3; m[y * W + x] = (sv > thr * 0.55 + 0.14 && b.get(x, y)) ? 1 : 0; }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!m[y * W + x]) continue;
        const up = y > 0 && !m[(y - 1) * W + x], dn = y < H - 1 && !m[(y + 1) * W + x];
        let v = 0.62 + (fl_h2(x, y, seed + 3) - 0.5) * 0.15 + (x - cx) / rx * light * 0.1;
        let c = sN[fl_tone(v, 5, x, y, 2.6)]; if (up) c = sN[4]; else if (dn) c = sN[1];
        if (fl_h2(x, y, seed + 8) < 0.06 && !up) c = b.get(x, y);    // des feuilles percent
        b.set(x, y, c);
      }
    }
  });
  fl_blit(spr, x0 - shift + 4, y0, 1);
}

// terre détrempée (fin de l'hiver) : boue, flaques qui reflètent le ciel, feuilles et herbe sèche ; o.puddle : intensité des flaques
function fl_mudGround(y0, y1, o = {}) {
  o = o || {}; const E = fl_env(o), seed = (o.seed ?? 1) | 0, hz = o.hz ?? (y0 - 70), par = fl_par({ ...o, depth: o.depth ?? 0.12 }), shift = fl_cl((o.cam || 0) * par, -fl_GM, fl_GM), t = o.t ?? 0;
  const key = `mg|${y0}|${y1}|${seed}|${hz}|${E.name}|${E.mist}|${E.light}|${o.under || 'litter'}|${o.depth ?? ''}`;
  const spr = fl_memo(key, () => {
    const F = fl_gfield(y0, y1, seed, hz, E.light, {}), U = fl_underBuild(F, y0, y1, seed, hz, E, o.under || 'litter', o);
    if (o.tracks) fl_stampTracks(U, y0, y1, hz, o.tracks, [fl_us(WO[0]), fl_us(WO[1]), fl_us(WO[4])], E.light, F.M);
    U.flush(); return { c: U.c, w: F.w, h: F.h, ox: F.M, oy: 0, b: U };
  });
  fl_blit(spr, -shift, y0, 1);
  // éclats de lumière sur l'eau
  const n = 26, skyT = fl_waterTones(E, o);
  for (let k = 0; k < n; k++) {
    const x = Math.floor(fl_h(k, seed + 80) * spr.w), y = Math.floor(fl_h(k, seed + 81) * spr.h), c = spr.b.get(x, y); if (skyT.indexOf(c) < 0) continue;
    const f = ((t * 0.7 + fl_h(k, seed + 82) * 5) % 1 + 1) % 1; if (f > 0.2) continue;
    const X0 = x - fl_GM - shift; R(X0, y0 + y, 1 + (f < 0.1 ? 1 : 0), 1, WH[3]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// 4. SOUS-BOIS ET PRINTEMPS : bouleaux, branches mortes, troncs moussus, mousse, fougères, fleurs, herbe neuve
// ═══════════════════════════════════════════════════════════════════════════════════════
const fl_BARK = [ST[5], ST[6], WH[0], WH[1], WH[2]];
const fl_LEAFR = [LM[0], LM[1], LM[2], LM[3], LM[4], LM[5]];

// ───────────── bouleau blanc ─────────────
function fl_birchSpr(h, seed, leaf, snow, stems, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.4) * 10) / 10;
  const key = `bi2|${h}|${seed}|${Math.round(leaf * 10)}|${Math.round(snow * 10)}|${stems}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = Math.round(h * 0.8) + 24, H = h + 6;
  return fl_spr(key, W, H, W >> 1, H - 3, b => {
    const r = fl_rng(seed), T = fl_tones(fl_BARK, o, 'snow'), dark = fl_tones([NI[0], ST[0], ST[1], ST[2]], o, 'conifer'), twg = fl_tones([DU[0], DU[1], WO[1], WO[2], WO[3]], o, 'wood'), lv = fl_tones(fl_LEAFR, o, 'leaf'), sn = fl_tones(fl_SNW, o, 'snow');
    const cx = W >> 1, base = H - 4, w0 = Math.max(3, Math.min(9, Math.round(h * 0.046))), stemsP = [], tips = [];
    const barkSh = (lat, nx, ny, s, px_, py_) => { const nz = Math.sqrt(Math.max(0, 1 - lat * lat)); return T[fl_tone(fl_lam(nx * lat, ny * lat, nz, light) * 1.05 + 0.1 + (fl_h2(Math.round(px_), Math.round(py_), seed) - 0.5) * 0.1, 5, Math.round(px_), Math.round(py_), 3.2)]; };
    for (let st = 0; st < stems; st++) {
      const off = (st - (stems - 1) / 2), hh = h * (stems === 1 ? 0.97 : 0.78 + r() * 0.2), sw = stems === 1 ? w0 : Math.max(3, w0 - 1), lean = (stems === 1 ? (r() - 0.5) * 0.05 : off * 0.12 + (r() - 0.5) * 0.04), sx = cx + off * 5;
      const pts = [], nP = 8;
      for (let k = 0; k <= nP; k++) { const f = k / nP; pts.push([sx + lean * hh * f * f * 1.8 + Math.sin(f * 3.4 + seed + st) * 1.6 * f + off * 7 * f, base - hh * f, Math.max(1.4, sw * (1 - f * 0.8))]); }
      fl_tube(b, pts, barkSh);
      const Lp = fl_cr(pts, 14);
      for (let k = 0; k < Lp.length; k++) {                          // lenticelles : traits sombres horizontaux
        const s = k / Lp.length, p = Lp[k], prob = (s < 0.22 ? 0.5 : 0.16) * (1 - s * 0.5);
        if (fl_h(k, seed + st * 9) < prob) {
          const ww = p[2], len = 1 + Math.floor(fl_h(k, seed + 5) * Math.min(5, ww * 0.9)), off2 = Math.round((fl_h(k, seed + 7) - 0.5) * (ww - len));
          for (let q = 0; q < len; q++) b.set(Math.round(p[0] + off2 + q), Math.round(p[1]), dark[s < 0.2 ? 0 : 1 + (fl_h(k, 3) < 0.4 ? 1 : 0)]);
          if (s < 0.3 && fl_h(k, seed + 8) < 0.5) for (let q = 0; q < len; q++) b.set(Math.round(p[0] + off2 + q), Math.round(p[1]) + 1, dark[1]);
        }
      }
      for (let k = 0; k < Lp.length * 0.13; k++) { const p = Lp[k]; for (let dx = -Math.floor(p[2] / 2); dx <= Math.floor(p[2] / 2); dx++) if (fl_h2(Math.round(p[0]) + dx, Math.round(p[1]), seed + 4) < 0.6 - k / (Lp.length * 0.13) * 0.5) b.set(Math.round(p[0] + dx), Math.round(p[1]), dark[fl_h2(dx, k, 2) < 0.4 ? 0 : 1]); }
      stemsP.push({ pts, hh });
    }
    // branches : montent en s'éloignant du tronc, puis retombent ; brindilles fines et sombres qui pendent
    const nB = Math.round(h / 11) + stems * 2, list = [];
    for (let i = 0; i < nB; i++) list.push({ f: 0.3 + 0.64 * Math.pow(r(), 0.85), side: r() < 0.5 ? -1 : 1, st: Math.floor(r() * stems) });
    list.sort((a, c) => a.f - c.f);
    const cfg = {
      r, curve: 0, wob: 0.45, droop: 0.85, split: 2.2, sa: 0.55, lk: 0.62, wk: 0.6, maxLvl: 2, minLen: 6,
      draw: (bb, pts, w, lvl) => {
        if (lvl === 0 && w >= 2) fl_tube(bb, pts, barkSh);
        else fl_poly1(bb, pts, lvl === 1 ? twg[2] : twg[1]);
        if (lvl === 0 && w >= 2) for (let k = 2; k < pts.length - 1; k += 3) bb.set(Math.round(pts[k][0]), Math.round(pts[k][1]), dark[1]);
      },
      tip: (x, y, lvl, a) => { tips.push([x, y, lvl]); },
    };
    for (const br of list) {
      const sp = stemsP[br.st], pts = sp.pts, pf = br.f * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(pf)), fr = pf - i;
      const px_ = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * fr, py_ = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * fr;
      const len = h * (0.11 + 0.2 * (1 - br.f * 0.6)) * (0.7 + r() * 0.6), ang = -Math.PI / 2 + br.side * (0.65 + r() * 0.45);
      fl_grow(b, px_, py_, ang, len, Math.max(2, pts[i][2] * 0.46), cfg, 0);
    }
    // neige sur le dessus des branches claires et des fourches
    if (snow > 0.05 && leaf < 0.5) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const c = b.d[y * W + x]; if (c && !b.d[(y - 1) * W + x] && fl_h2(x, y, seed + 2) < snow * (T.includes(c) ? 0.8 : 0.35)) b.d[(y - 1) * W + x] = sn[light > 0 ? 4 : 3]; }
    // feuillage de printemps : petites feuilles claires en groupes aérés
    if (leaf > 0.05) for (const tp of tips) {
      const nL = Math.round(leaf * (tp[2] === 0 ? 2 : 3) * (1 + r() * 1.6));
      for (let q = 0; q < nL; q++) {
        const lx = tp[0] + (r() - 0.5) * (6 + leaf * 8), ly = tp[1] + (r() - 0.3) * (5 + leaf * 6), rx = 1 + (leaf > 0.55 ? 1 : 0) + (r() < 0.25 ? 1 : 0), ry = 1 + (r() < 0.25 ? 1 : 0);
        fl_clump(b, Math.round(lx), Math.round(ly), rx, ry, lv.slice(1), light, { rag: 0.2, seed: seed + q, hi: 0.4, bias: (lx - cx) / W * light * 0.5, dk: 3 });
      }
    }
    if (dep < 0.55) fl_selout(b, 0.62);
    for (let x = -3; x <= 3; x++) b.set(cx + x, H - 3, dark[0]);
  });
}
// bouleau : x, y = pied, h hauteur, leaf 0 (nu) à 1 (feuillu), snow, stems 1 à 3
function fl_birch(t, o = {}) {
  const p = fl_o(o), h = Math.round(o.h ?? 120), spr = fl_birchSpr(h, (o.seed ?? 1) | 0, o.leaf ?? 0.5, o.snow ?? 0, o.stems ?? 1, { ...o, depth: p.depth });
  fl_blitSway(spr, fl_sx(p.x, o), fl_sy(p.y, o), 2.2 * fl_wind(t, p.x, o) * Math.min(1.5, h / 100), { pow: 1.5 });
}

// ───────────── branches mortes ─────────────
// o.kind : 'standing' (broussaille morte dressée) ou 'fallen' (brindilles au sol) ; o.n : nombre de tiges ; o.h hauteur ; o.snow
function fl_deadSpr(h, n, seed, snow, kind, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `dd2|${h}|${n}|${seed}|${Math.round(snow * 10)}|${kind}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = Math.round(h * 1.0) + 14, H = h + 6;
  return fl_spr(key, W, H, W >> 1, H - 3, b => {
    const r = fl_rng(seed), T = fl_tones([WO[1], WO[2], ST[3], WO[4], ST[5]], o, 'wood'), sn = fl_tones(fl_SNW, o, 'snow'), cx = W >> 1, base = H - 3;
    const cfg = {
      r, curve: 0, wob: 0.55, droop: 0, split: 2.2, sa: 0.62, lk: 0.6, wk: 0.62, maxLvl: 3, minLen: 4,
      draw: (bb, pts, w, lvl) => {
        if (w >= 2.4) fl_tube(bb, pts, (lat, nx, ny, s, px_, py_) => { const nz = Math.sqrt(Math.max(0, 1 - lat * lat)); return T[fl_tone(fl_lam(nx * lat, ny * lat, nz, light) * 0.85 + 0.1 + (fl_h2(Math.round(px_), Math.round(py_), seed) - 0.5) * 0.25, 5, Math.round(px_), Math.round(py_), 3)]; });
        else fl_poly1(bb, pts, lvl > 1 ? T[0] : T[1]);
      },
    };
    if (kind === 'fallen') {
      for (let i = 0; i < n; i++) { const x = cx + (r() - 0.5) * W * 0.6, y = base - r() * 4, ang = (r() - 0.5) * 0.4 + (r() < 0.5 ? 0 : Math.PI); fl_grow(b, x, y, ang, h * (0.5 + r() * 0.7), 2.4, { ...cfg, maxLvl: 1, split: 1.2, sa: 0.5 }, 0); }
    } else {
      for (let i = 0; i < n; i++) { const x = cx + (i - (n - 1) / 2) * (W * 0.1) + (r() - 0.5) * 3, ang = -Math.PI / 2 + (i - (n - 1) / 2) * 0.2 + (r() - 0.5) * 0.25; fl_grow(b, x, base, ang, h * (0.55 + r() * 0.4), 3, cfg, 0); }
    }
    if (snow > 0.05) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const c = b.d[y * W + x]; if (c && !b.d[(y - 1) * W + x] && fl_h2(x, y, seed + 2) < snow * 0.6) b.d[(y - 1) * W + x] = sn[light > 0 ? 4 : 3]; }
    if (dep < 0.45) fl_selout(b, 0.5);
  });
}
function fl_deadBranches(t, o = {}) {
  const p = fl_o(o), h = Math.round(o.h ?? 40), spr = fl_deadSpr(h, o.n ?? 4, (o.seed ?? 1) | 0, o.snow ?? 0, o.kind || 'standing', { ...o, depth: o.depth ?? 0.3 });
  fl_blitSway(spr, fl_sx(p.x, o), fl_sy(p.y, o), 0.7 * fl_wind(t, p.x, o), { pow: 2 });
}

// ───────────── mousse ─────────────
function fl_mossSpr(w, h, seed, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `ms|${w}|${h}|${seed}|${E.name}|${E.mist}|${light}|${dep}|${o.spore ?? 1}`;
  return fl_spr(key, w + 6, h + 6, 3, h + 3, b => {
    const r = fl_rng(seed), T = fl_tones(fl_LEAFR, { ...o, depth: dep }, 'leaf');
    const nC = Math.max(2, Math.round(w / 5));
    const cl = []; for (let i = 0; i < nC; i++) { const f = (i + 0.5) / nC, hh = h * (0.55 + 0.45 * Math.sin(Math.PI * f) * (0.7 + r() * 0.5)); cl.push({ x: 3 + f * w, ry: Math.max(2, Math.round(hh * 0.6)), rx: Math.max(3, Math.round(w / nC * (0.85 + r() * 0.5))), y: h + 3 - hh * 0.45 }); }
    cl.sort((a, c) => a.y - c.y);
    for (const c of cl) fl_clump(b, Math.round(c.x), Math.round(c.y), c.rx, c.ry, T.slice(0, 6), light, { rag: 0.55, seed: seed + c.x, hi: 0.35, bias: 0.05, dk: 3.4 });
    // base sombre
    for (let x = 1; x < w + 5; x++) if (b.get(x, h + 2)) b.set(x, h + 2, T[0]);
    // petites tiges de sporophytes (printemps)
    if (o.spore !== 0) for (let k = 0; k < Math.floor(w / 6); k++) { const x = 4 + Math.floor(r() * (w - 2)); let y = 3; while (y < h + 2 && !b.get(x, y)) y++; if (y < h) { const l = 2 + Math.floor(r() * 3); for (let j = 1; j <= l; j++) b.set(x, y - j, fl_us(OC[3], 'wood')); b.set(x, y - l - 1, fl_us(AM[6], 'wood')); } }
    fl_selout(b, 0.6, (x, y, n) => dep < 0.5);
  });
}
// coussin de mousse : x, y = pied, w largeur, h hauteur
function fl_moss(x, y, w, o = {}) {
  const h = Math.round(o.h ?? Math.max(4, w * 0.3)), spr = fl_mossSpr(Math.round(w), h, (o.seed ?? 1) | 0, { ...o, depth: o.depth ?? 0.3 });
  fl_blit(spr, fl_sx(x, o), fl_sy(y, o), 1);
}

// ───────────── tronc moussu ─────────────
// tronc couché : x, y = bas du tronc, w longueur, h diamètre ; o.moss 0..1 ; o.snow 0..1 ; o.end 'left' | 'right' | 'none' ; o.tilt (px de dénivelé)
function fl_logSpr(w, h, seed, moss, snow, end, tilt, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.25) * 10) / 10, key = `lg|${w}|${h}|${seed}|${Math.round(moss * 10)}|${Math.round(snow * 10)}|${end}|${tilt}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = w + 16, H = h + 18 + Math.abs(tilt);
  return fl_spr(key, W, H, 8, H - 4, b => {
    const r = fl_rng(seed), T = fl_tones([WO[0], WO[1], WO[2], WO[3], WO[4], WO[5]], o, 'wood'), M_ = fl_tones(fl_LEAFR, o, 'leaf'), sn = fl_tones(fl_SNW, o, 'snow'), cut = fl_tones([WO[3], WO[4], WO[5], WO[6], SK[3]], o, 'wood');
    const yb = H - 4 - h / 2 - (tilt > 0 ? tilt : 0), x0 = 8 + (end === 'left' ? h * 0.2 : 0), x1 = 8 + w - (end === 'right' ? h * 0.2 : 0);
    const pts = []; for (let k = 0; k <= 6; k++) { const f = k / 6; pts.push([x0 + (x1 - x0) * f, yb + tilt * f + Math.sin(f * 3 + seed) * 0.8, h * (0.98 - 0.06 * f + (r() - 0.5) * 0.04)]); }
    const sh = fl_shader(T.slice(0, 6), light, { dk: 3.2, rough: 0.2 });
    fl_tube(b, pts, (lat, nx, ny, s, px_, py_) => {
      let c = sh(lat, nx, ny, s, px_, py_), X = Math.round(px_), Y = Math.round(py_);
      // sillons de l'écorce : lignes sombres dans le sens de la longueur
      const fur = Math.abs(((lat * 3.2 + 0.7 * Math.sin(s * 9 + seed)) % 1 + 1) % 1 - 0.5);
      if (fur > 0.43 && fl_h2(X, Y, seed) < 0.82) c = T[Math.max(0, T.indexOf(c) - 1)] || c;
      if (fl_h2(X >> 1, Y, seed + 5) < 0.06) c = T[Math.min(5, T.indexOf(c) + 1)] || c;
      return c;
    });
    // bouts : section coupée avec cernes
    const endDraw = (ex, ey, side) => {
      const rx = Math.max(2, Math.round(h * 0.26)), ry = Math.round(h / 2);
      b.ell(ex, ey, rx, ry, T[1]); b.ell(ex + side * 1, ey, rx - 1, ry - 1, cut[1]);
      for (let k = 1; k < 4; k++) { const ee = Math.round(rx * (1 - k * 0.27)), eh = Math.round(ry * (1 - k * 0.27)); if (ee > 0 && eh > 1) for (let a = 0; a < 40; a++) { const an = a / 40 * TAU; b.set(Math.round(ex + side + Math.cos(an) * ee), Math.round(ey + Math.sin(an) * eh), cut[k % 2 ? 0 : 2]); } }
      b.set(ex + side, ey, cut[3]); for (let k = 0; k < 6; k++) { const an = r() * TAU, l = r() * ry * 0.8; b.set(Math.round(ex + side + Math.cos(an) * l * 0.3), Math.round(ey + Math.sin(an) * l), T[1]); }
      for (let k = 0; k < ry; k++) b.set(ex - side * (rx - 1) + (light > 0 ? 0 : 0), ey - ry + k, cut[light * side > 0 ? 3 : 1]);
    };
    if (end === 'left') endDraw(Math.round(x0), Math.round(yb), -1);
    if (end === 'right') endDraw(Math.round(x1 + (end === 'right' ? 0 : 0)), Math.round(yb + tilt), 1);
    // mousse sur le dessus et le côté éclairé
    if (moss > 0.02) {
      const nM = Math.round(w / 7 * moss * 1.6);
      for (let k = 0; k < nM; k++) {
        const f = r(), x = x0 + (x1 - x0) * f, y = yb + tilt * f - h * (0.38 + r() * 0.12), rx = Math.round(3 + r() * 5 * moss + 2), ry = Math.round(2 + r() * 2.2 * (0.5 + moss));
        fl_clump(b, Math.round(x), Math.round(y), rx, ry, M_.slice(0, 6), light, { rag: 0.6, seed: seed + k, hi: 0.35, bias: 0.05, dk: 3.4 });
      }
      for (let k = 0; k < nM * 0.6; k++) { const f = r(), x = x0 + (x1 - x0) * f + (light > 0 ? 0 : 0), y = yb + tilt * f + h * (r() * 0.3), rx = 2 + Math.round(r() * 2), ry = 1 + Math.round(r() * 2); fl_clump(b, Math.round(x), Math.round(y), rx, ry, M_.slice(0, 5), light, { rag: 0.7, seed: seed + k + 50, hi: 0.3, bias: -0.05 }); }
    }
    // neige sur le dessus
    if (snow > 0.05) for (let x = 0; x < W; x++) { let y = 0; while (y < H && !b.d[y * W + x]) y++; if (y >= H - 1) continue; const th = Math.round(snow * (1.5 + 3 * fl_n1(x * 0.3, seed))); for (let j = -1; j < th; j++) b.set(x, y + j, j < 0 ? 0 : j === 0 ? sn[light > 0 ? 4 : 3] : j === th - 1 ? sn[1] : sn[3]); }
    if (dep < 0.55) fl_selout(b, 0.6);
    for (let x = 4; x < W - 4; x++) if (!b.d[(H - 4) * W + x] && b.d[(H - 5) * W + x]) b.set(x, H - 4, T[0]);
  });
}
function fl_log(x, y, w, h, o = {}) {
  const spr = fl_logSpr(Math.round(w), Math.round(h), (o.seed ?? 1) | 0, o.moss ?? 0.6, o.snow ?? 0, o.end ?? 'left', o.tilt ?? 0, { ...o, depth: o.depth ?? 0.25 });
  fl_blit(spr, fl_sx(x, o), fl_sy(y, o), 1);
}

// ───────────── fougères ─────────────
function fl_fernSpr(h, n, seed, unfurl, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `fe|${h}|${n}|${seed}|${Math.round(unfurl * 10)}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = Math.round(h * 1.6) + 10, H = h + 8;
  return fl_spr(key, W, H, W >> 1, H - 3, b => {
    const r = fl_rng(seed), T = fl_tones([GR[0], GR[1], GR[2], GR[3], LM[3], LM[4]], o, 'leaf'), cx = W >> 1, base = H - 4;
    const fronds = []; for (let i = 0; i < n; i++) { const f = n > 1 ? i / (n - 1) : 0.5; fronds.push({ a: (f - 0.5) * 2.5 + (r() - 0.5) * 0.3, L: h * (0.62 + 0.38 * Math.cos((f - 0.5) * 2.2) * (0.7 + r() * 0.3)), fid: r() < unfurl * 0.4 && Math.abs(f - 0.5) > 0.2 }); }
    fronds.sort((a, c) => Math.abs(c.a) - Math.abs(a.a));
    for (const fr of fronds) {
      const pts = []; const steps = Math.round(fr.L / 1.5), lit = (fr.a * light) > -0.3;
      for (let k = 0; k <= steps; k++) { const s = k / steps; const ang = fr.a - s * s * fr.a * 0.0 + 0; const x = cx + Math.sin(fr.a) * fr.L * s + fr.a * fr.L * 0.35 * s * s, y = base - Math.cos(fr.a * 0.55) * fr.L * s + (s * s) * fr.L * 0.38 * (0.4 + Math.abs(fr.a) * 0.6); pts.push([x, y]); }
      for (let k = 0; k <= steps; k++) {
        const s = k / steps, p = pts[k], q = pts[Math.min(steps, k + 1)], pr = pts[Math.max(0, k - 1)];
        let tx = q[0] - pr[0], ty = q[1] - pr[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        const nx = -ty, ny = tx, len = (fr.fid && s > 0.8 ? 0 : 1) * Math.max(0, Math.sin(Math.PI * Math.min(1, s * 1.05)) * Math.min(1, 3.2 * (1 - s) + 0.1)) * h * 0.2;
        b.set(Math.round(p[0]), Math.round(p[1]), T[lit ? 3 : 2]);
        if (k % 2 === 0 && len > 0.6) for (const sd of [-1, 1]) {
          const ex = p[0] + (nx * sd * 0.9 + tx * 0.5) * len, ey = p[1] + (ny * sd * 0.9 + ty * 0.5) * len + len * 0.28;
          const side = sd * (nx || 1) * light > 0 ? 1 : 0;
          b.line(p[0], p[1], ex, ey, T[side ? (lit ? 4 : 3) : (lit ? 2 : 1)]);
          if (len > 2.4) b.set(Math.round(ex), Math.round(ey), T[side ? 5 : 3]);
        }
      }
      if (fr.fid) { const e = pts[pts.length - 1]; for (let a = 0; a < 14; a++) { const an = a / 14 * 4.4 - 0.6; b.set(Math.round(e[0] + Math.sin(an + 1) * (3 - a * 0.15)), Math.round(e[1] - Math.cos(an + 1) * (3 - a * 0.15)), T[4]); } }
    }
    if (dep < 0.55) fl_selout(b, 0.55);
  });
}
// touffe de fougères : x, y = pied, h hauteur, n frondes, unfurl 0..1 (crosses non déroulées)
function fl_ferns(t, o = {}) {
  const p = fl_o(o), h = Math.round(o.h ?? 26), spr = fl_fernSpr(h, o.n ?? 7, (o.seed ?? 1) | 0, o.unfurl ?? 0.3, { ...o, depth: o.depth ?? 0.3 });
  fl_blitSway(spr, fl_sx(p.x, o), fl_sy(p.y, o), 1.5 * fl_wind(t, p.x, o), { pow: 1.3 });
}

// ───────────── fleurs de printemps ─────────────
// kind : 'crocus' | 'saxifrage' | 'anemone' ; var 0 à 2 (couleurs) ; z : échelle
function fl_flowerSpr(kind, v, z, seed, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.3) * 10) / 10, key = `fw|${kind}|${v}|${z}|${seed}|${E.name}|${E.mist}|${light}|${dep}`;
  const W = Math.round(14 * z) + 8, H = Math.round(18 * z) + 8;
  return fl_spr(key, W, H, W >> 1, H - 2, b => {
    const r = fl_rng(seed), gr = fl_tones([GR[1], GR[2], GR[3], LM[3], LM[4]], o, 'leaf'), cx = W >> 1, base = H - 3;
    const petal = { crocus: [[DU[3], DU[4], DU[5], DU[7]], [YE[0], YE[1], YE[2], YE[3]], [ST[6], WH[0], WH[2], WH[3]]][v % 3], saxifrage: [[RD[2], RD[3], RD[4], RD[5]], [DU[5], DU[6], DU[7], WH[1]], [WH[0], WH[1], WH[2], WH[3]]][v % 3], anemone: [WH[0], WH[1], WH[2], WH[3]] }[kind];
    const P = fl_tones(petal, { ...o, fogK: 0.8 }, 'warm'), ctr = fl_tones([AM[6], YE[1], YE[2], YE[3]], o, 'leaf');
    if (kind === 'crocus') {
      const hh = Math.round(9 * z), w = Math.max(2, Math.round(2.6 * z));
      // feuilles étroites à nervure claire
      for (const sd of [-1, 1]) { const l = Math.round(10 * z); for (let k = 0; k < l; k++) { const s = k / l; b.set(cx + Math.round(sd * (1 + s * 3.4 * z) + 0), base - k, gr[2]); if (k % 2 === 0 && k > 1) b.set(cx + Math.round(sd * (1 + s * 3.4 * z)), base - k, gr[4]); } }
      for (let k = 0; k < Math.round(3 * z); k++) b.set(cx, base - k, gr[1]);
      // corolle en coupe
      const top = base - Math.round(3 * z) - hh;
      for (let j = 0; j <= hh; j++) { const f = j / hh, wd = Math.max(1, Math.round(w * (0.55 + 0.9 * Math.sin(Math.PI * Math.min(1, f * 0.8 + 0.18)))));
        for (let i = -wd; i <= wd; i++) { const ln = i / Math.max(1, wd), tone = fl_tone(fl_lam(ln, -0.2 * (1 - f), Math.sqrt(Math.max(0, 1 - ln * ln)), light) + (1 - f) * 0.12, 4, cx + i, top + j, 3); b.set(cx + i, top + j, P[tone]); } }
      for (let j = 1; j < hh - 1; j += 1) b.set(cx, top + j, P[Math.max(0, 1 + (j % 3 === 0 ? 1 : 0))]);
      b.set(cx - 1, top, ctr[1]); b.set(cx, top - 1, ctr[2]); b.set(cx + 1, top, ctr[1]);
      fl_selout(b, 0.55);
    } else if (kind === 'saxifrage') {
      const mw = Math.round(11 * z), mh = Math.round(4.5 * z), M_ = fl_tones(fl_LEAFR, o, 'leaf');
      fl_clump(b, cx, base - Math.round(mh * 0.5), Math.round(mw / 2), Math.round(mh * 0.7), M_.slice(0, 5), light, { rag: 0.5, seed, hi: 0.3 });
      const nf = Math.round(5 * z + 3);
      for (let k = 0; k < nf; k++) { const fx = cx + Math.round((r() - 0.5) * mw * 0.9), fy = base - Math.round(mh * (0.3 + r() * 0.7)), big = z > 1.2 && r() < 0.5; b.set(fx, fy, P[3]); b.set(fx - 1, fy, P[2]); b.set(fx + 1, fy, P[big ? 2 : 1]); b.set(fx, fy - 1, P[2]); if (big) { b.set(fx, fy + 1, P[1]); b.set(fx, fy, ctr[2]); } }
      fl_selout(b, 0.55);
    } else {
      const hh = Math.round(11 * z), top = base - hh;
      for (let k = 0; k < hh; k++) b.set(cx + Math.round(Math.sin(k * 0.3 + seed) * 0.6), base - k, gr[k < 3 ? 1 : 2]);
      // collerette de trois feuilles lobées
      const ly = base - Math.round(hh * 0.5);
      for (const sd of [-1, 0, 1]) { const lx = cx + sd * Math.round(3.5 * z), lyy = ly + (sd === 0 ? -2 : 0); b.ell(lx, lyy, Math.max(1, Math.round(2.4 * z)), Math.max(1, Math.round(1.2 * z)), gr[1]); b.set(lx - 1 * light, lyy - 1, gr[3]); b.set(lx + sd, lyy, gr[4]); }
      // fleur étoilée
      const rx = Math.max(2, Math.round(3.4 * z)), ry = Math.max(2, Math.round(2.1 * z));
      b.ell(cx, top, rx, ry, P[1]); b.ell(cx - light, top - 1, rx - 1, Math.max(1, ry - 1), P[2]);
      for (let a = 0; a < 6; a++) { const an = a / 6 * TAU + 0.3; b.set(Math.round(cx + Math.cos(an) * (rx + 0.5)), Math.round(top + Math.sin(an) * (ry + 0.3)), P[a % 2 ? 3 : 2]); }
      b.set(cx - light * (rx - 1), top, P[3]); b.set(cx + light * (rx - 1), top + 1, P[0]);
      b.set(cx, top, ctr[2]); b.set(cx + 1, top, ctr[1]); if (z > 1) b.set(cx - 1, top, ctr[0]);
      fl_selout(b, 0.55);
    }
  });
}
// champ de fleurs dans le rectangle (x0, y0, x1, y1) : o.kind 'mix' | 'crocus' | 'saxifrage' | 'anemone' ; o.density ; o.zmin, o.zmax (échelle selon la profondeur y)
function fl_flowers(t, x0, y0, x1, y1, o = {}) {
  const dens = o.density ?? 1, area = (x1 - x0) * (y1 - y0), n = Math.max(1, Math.round(area / 150 * dens)), seed = (o.seed ?? 1) | 0, kind = o.kind || 'mix';
  const list = [];
  for (let i = 0; i < n; i++) { const f = Math.pow(fl_h(i, seed + 1), 0.9); list.push({ x: x0 + fl_h(i, seed + 2) * (x1 - x0), y: y0 + f * (y1 - y0), i, f }); }
  list.sort((a, c) => a.y - c.y);
  const zmin = o.zmin ?? 0.6, zmax = o.zmax ?? 1.5, kinds = ['crocus', 'saxifrage', 'anemone'];
  for (const fl of list) {
    const zr = zmin + (zmax - zmin) * fl.f, z = Math.round(zr * 4) / 4, kd = kind === 'mix' ? kinds[Math.floor(fl_h(fl.i, seed + 3) * 3)] : kind, v = Math.floor(fl_h(fl.i, seed + 4) * 3);
    const spr = fl_flowerSpr(kd, v, z, 1 + Math.floor(fl_h(fl.i, seed + 5) * 4), { ...o, depth: o.depth ?? 0.3 });
    fl_blitSway(spr, fl_sx(fl.x, o), fl_sy(fl.y, o), 1.8 * z * fl_wind(t, fl.x, o), { pow: 1.2 });
  }
}

// ───────────── herbe neuve ─────────────
function fl_tuftSpr(h, nb, seed, o) {
  const E = fl_env(o), light = E.light, dep = Math.round((o.depth ?? 0.2) * 10) / 10, key = `tf|${h}|${nb}|${seed}|${E.name}|${E.mist}|${light}|${dep}|${o.dry || 0}`;
  const W = Math.round(h * 0.9) + 8, H = h + 3;
  return fl_spr(key, W, H, W >> 1, H - 1, b => {
    const r = fl_rng(seed), T = fl_tones(o.dry ? [OC[0], WO[3], AM[4], AM[6], AM[8], AM[9]] : [LM[0], LM[1], LM[2], LM[3], LM[4], LM[5], LM[6]], o, 'leaf'), cx = W >> 1, base = H - 2;
    const bl = []; for (let i = 0; i < nb; i++) bl.push({ a: (i / Math.max(1, nb - 1) - 0.5) * 1.5 + (r() - 0.5) * 0.4, L: h * (0.55 + r() * 0.5) });
    bl.sort((a, c) => c.L - a.L);
    for (const q of bl) {
      const pts = []; const steps = Math.max(3, Math.round(q.L));
      for (let k = 0; k <= steps; k++) { const s = k / steps; pts.push([cx + Math.sin(q.a) * q.L * s * 0.85 + q.a * s * s * q.L * 0.3, base - Math.cos(q.a * 0.5) * q.L * s]); }
      for (let k = 0; k <= steps; k++) {
        const s = k / steps, p = pts[k], w = s < 0.5 ? 2 : 1, side = light;
        const c = T[Math.min(T.length - 1, 2 + Math.round(s * 2.2) + (q.a * light > 0 ? 1 : 0))], c2 = T[Math.max(0, 1 + Math.round(s * 1.6))];
        b.set(Math.round(p[0]), Math.round(p[1]), c); if (w === 2) b.set(Math.round(p[0]) - side, Math.round(p[1]), c2);
        if (s > 0.85) b.set(Math.round(p[0]), Math.round(p[1]), T[T.length - 2]);
      }
    }
    if (dep < 0.4) fl_selout(b, 0.5);
  });
}
// pelouse de printemps dans les rangées y0 à y1 : o.grow 0..1 (hauteur de l'herbe), o.base (fond de terre verte), o.density, o.h hauteur des touffes proches
function fl_grassSpring(t, y0, y1, o = {}) {
  const E = fl_env(o), seed = (o.seed ?? 1) | 0, grow = fl_cl(o.grow ?? 1), dens = o.density ?? 1, par = fl_par({ ...o, depth: o.depth ?? 0.12 }), cam = (o.cam || 0) * par, hN = o.h ?? 14;
  if (o.base !== false) {                                           // fond : terre qui verdit
    const baseSpr = fl_memo(`gsb|${y0}|${y1}|${seed}|${E.name}|${E.mist}|${E.light}|${Math.round(grow * 10)}|${o.depth ?? ''}`, () => {
      const w = LW + 2 * fl_GM, h = y1 - y0 + 4, b = new fl_Buf(w, h), g = fl_tones([LM[0], LM[1], LM[2], LM[3]], { ...o, depth: o.depth ?? 0.12 }, 'leaf'), m = fl_tones([WO[0], WO[1], WO[2], WO[3]], { ...o, depth: o.depth ?? 0.12 }, 'wood');
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const yn = y / h, top = 2 + (fl_n1(x * 0.17, seed) - 0.5) * 3 + (fl_n1(x * 0.5, seed + 3) - 0.5) * 2; if (y < top) continue;
        const n = fl_fbm(x / 30, y / 6, seed + 9, 2), gv = fl_cl(grow * 1.15 - (1 - yn) * 0.25 + (n - 0.5) * 0.5);
        const useG = fl_bay(x, y) < gv; const v = 0.3 + yn * 0.3 + (n - 0.5) * 0.5;
        b.d[y * w + x] = useG ? g[fl_tone(v, 4, x, y, 3.2)] : m[fl_tone(v, 4, x, y, 3.2)];
      }
      b.flush(); return { c: b.c, w, h, ox: fl_GM, oy: 0, b };
    });
    fl_blit(baseSpr, -fl_cl(cam, -fl_GM, fl_GM), y0 - 2, 1);
  }
  const rows = Math.max(2, Math.round((y1 - y0) / 4)), list = [];
  for (let rr = 0; rr < rows; rr++) {
    const yn = (rr + 0.5) / rows, y = y0 + yn * (y1 - y0), sc = 0.4 + 0.8 * yn, spacing = Math.max(4, 11 * sc / dens);
    for (let x = -30 - ((rr * 37) % spacing); x < LW + 60; x += spacing * (0.7 + 0.6 * fl_h(rr + Math.floor(x), seed))) list.push({ x: x, y: y + (fl_h(Math.floor(x), seed + rr) - 0.5) * 3, sc, yn });
  }
  for (const tf of list) {
    const h = Math.max(2, Math.round(hN * tf.sc * grow * (0.75 + 0.5 * fl_h(Math.floor(tf.x * 7), seed + 2)))); if (grow < 0.1 && h < 3) continue;
    const key = Math.floor(fl_h(Math.floor(tf.x * 3), seed + 4) * 5), spr = fl_tuftSpr(h, 4 + Math.round(grow * 3), 10 + key, { ...o, depth: o.depth ?? 0.12, dry: 0 });
    fl_blitSway(spr, tf.x - cam, tf.y, 1.6 * fl_wind(t, tf.x, o) * (h / 12), { pow: 1.3 });
  }
}

