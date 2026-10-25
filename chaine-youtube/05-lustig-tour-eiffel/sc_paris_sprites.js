'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   sc_paris_sprites.js : EN-TÊTE D'API À ÉCRIRE EN FIN DE TRAVAIL
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

// ════════════════════════════════════════════════════════════════════════════════════════
// 0. OUTILS : couleurs, hachage, tampon de pixels (PaBuf), caches
// ════════════════════════════════════════════════════════════════════════════════════════
const pa_u32M = {};
function pa_u32(c) {                                                  // '#rrggbb' | [r,g,b] | nombre ABGR → entier ABGR opaque
  if (typeof c === 'number') return c;
  let r = pa_u32M[c]; if (r !== undefined) return r;
  const a = Array.isArray(c) ? c : [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  return pa_u32M[c] = (0xFF000000 | (a[2] << 16) | (a[1] << 8) | a[0]) >>> 0;
}
const pa_rgbOf = c => { if (Array.isArray(c)) return c; if (typeof c === 'number') return [c & 255, (c >> 8) & 255, (c >> 16) & 255]; return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; };
const pa_hexOf = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function pa_mix(a, b, f) { a = pa_rgbOf(a); b = pa_rgbOf(b); return pa_hexOf([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]); }
function pa_h(i, s = 0) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function pa_h2(x, y, s = 0) { return pa_h(Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663), s); }
const pa_bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
const pa_ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const pa_fin = (v, d = 0) => Number.isFinite(v) ? v : d;
const pa_mem = new Map();
function pa_cache(key, fn) { let v = pa_mem.get(key); if (v === undefined) { v = fn(); pa_mem.set(key, v); } return v; }
function pa_n1(x, s = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return pa_h(i, s) * (1 - u) + pa_h(i + 1, s) * u; }   // bruit de valeur 1D (0..1)
const pa_lerpC = (a, b, f) => pa_mix(a, b, clamp(f));

// tampon de pixels : on dessine dans un Uint32Array puis on le convertit en canevas (caches de sprites ; couleurs exactes, aucun lissage)
class PaBuf {
  constructor(w, h) { this.w = Math.max(1, w | 0); this.h = Math.max(1, h | 0); this.c = mkCanvas(this.w, this.h); this.x = this.c.getContext('2d', { willReadFrequently: true }); this.id = this.x.createImageData(this.w, this.h); this.d = new Uint32Array(this.id.data.buffer); }
  px(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = pa_u32(c); }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : 0; }
  R(x, y, w, h, c) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); c = pa_u32(c);
    const x0 = Math.max(0, x), x1 = Math.min(this.w, x + w), y0 = Math.max(0, y), y1 = Math.min(this.h, y + h);
    for (let j = y0; j < y1; j++) { const o = j * this.w; for (let i = x0; i < x1; i++) this.d[o + i] = c; }
  }
  line(x0, y0, x1, y1, c, th = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); c = pa_u32(c);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; const o = Math.floor(th / 2);
    for (let k = 0; k < 4000; k++) {
      for (let j = 0; j < th; j++) for (let i = 0; i < th; i++) { const xx = x0 - o + i, yy = y0 - o + j; if (xx >= 0 && yy >= 0 && xx < this.w && yy < this.h) this.d[yy * this.w + xx] = c; }
      if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  poly(pts, c) {
    c = pa_u32(c); let ymin = Infinity, ymax = -Infinity; for (const p of pts) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
    ymin = Math.max(0, Math.ceil(ymin - 0.5)); ymax = Math.min(this.h - 1, Math.floor(ymax - 0.5));
    for (let y = ymin; y <= ymax; y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) { const x0 = Math.max(0, Math.ceil(xs[i] - 0.5)), x1 = Math.min(this.w - 1, Math.floor(xs[i + 1] - 0.5)); for (let x = x0; x <= x1; x++) this.d[y * this.w + x] = c; }
    }
  }
  disc(cx, cy, r, c) { c = pa_u32(c); cx = Math.round(cx); cy = Math.round(cy); for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.6 - dy * dy))); for (let i = -hw; i <= hw; i++) { const xx = cx + i, yy = cy + dy; if (xx >= 0 && yy >= 0 && xx < this.w && yy < this.h) this.d[yy * this.w + xx] = c; } } }
  ell(cx, cy, rx, ry, c) { c = pa_u32(c); cx = Math.round(cx); cy = Math.round(cy); for (let dy = -ry; dy <= ry; dy++) { const k = 1 - (dy * dy) / (ry * ry + 0.6), hw = Math.floor(rx * Math.sqrt(Math.max(0, k)) + 0.35); for (let i = -hw; i <= hw; i++) { const xx = cx + i, yy = cy + dy; if (xx >= 0 && yy >= 0 && xx < this.w && yy < this.h) this.d[yy * this.w + xx] = c; } } }
  dith(x, y, w, h, c, dens) {                                          // tramage de Bayer : densité 0..1
    c = pa_u32(c); x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < this.w && yy < this.h && pa_bay(xx, yy) < dens) this.d[yy * this.w + xx] = c; }
  }
  text(s, x, y, c, sc = 1) {                                           // police 5×7 du moteur, majuscules
    c = pa_u32(c); x = Math.round(x); y = Math.round(y); let cx = x;
    for (const ch of s) {
      const g = gl(ch), top = g.top || 0;
      for (let r = 0; r < g.length; r++) for (let q = 0; q < g[r].length; q++) if (g[r][q] === '#') this.R(cx + q * sc, y + (r - top) * sc, sc, sc, c);
      cx += (g[0].length + 1) * sc;
    }
  }
  blit(src, dx, dy) { const s = src.d; for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) { const v = s[j * src.w + i]; if (v >>> 24) { const xx = dx + i, yy = dy + j; if (xx >= 0 && yy >= 0 && xx < this.w && yy < this.h) this.d[yy * this.w + xx] = v; } } }
  haze(mist, a0, a1 = a0, y0 = 0, y1 = this.h) {                       // brume tramée : remplace par `mist` les pixels opaques dont le seuil de Bayer est sous a (a varie de a0 à a1 de y0 à y1)
    mist = pa_u32(mist);
    for (let y = 0; y < this.h; y++) { const a = lerp(a0, a1, clamp((y - y0) / Math.max(1, y1 - y0))); if (a <= 0) continue; for (let x = 0; x < this.w; x++) { const i = y * this.w + x; if ((this.d[i] >>> 24) && pa_bay(x, y) < a) this.d[i] = mist; } }
  }
  polyG(pts, T, k0 = 0.2, k1 = 0.72, rim = true) {                       // polygone ombré de haut en bas : T = [sombre, milieu, clair, liseré]
    let ymin = Infinity, ymax = -Infinity; for (const p of pts) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
    const y0 = Math.max(0, Math.ceil(ymin - 0.5)), y1 = Math.min(this.h - 1, Math.floor(ymax - 0.5)), c = T.map(pa_u32), span = Math.max(1, ymax - ymin);
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.max(0, Math.ceil(xs[i] - 0.5)); x <= Math.min(this.w - 1, Math.floor(xs[i + 1] - 0.5)); x++) {
        const f = (yc - ymin) / span + (pa_bay(x, y) - 0.5) * 0.08;
        this.d[y * this.w + x] = rim && y === y0 ? c[3] : f < k0 ? c[2] : f < k1 ? c[1] : c[0];
      }
    }
  }
  ring(cx, cy, rx, ry, c, th = 1, a0 = 0, a1 = TAU) {                    // ellipse creuse (arc de a0 à a1)
    const n = Math.max(24, Math.ceil((rx + ry) * 4));
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; for (let q = 0; q < th; q++) this.px(cx + Math.cos(a) * (rx - q * 0.7), cy + Math.sin(a) * (ry - q * 0.7), c); }
  }
  outline(c, diag = false) {                                           // contour : les pixels vides voisins d'un pixel plein prennent la couleur c
    c = pa_u32(c); const w = this.w, h = this.h, d = this.d, add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[y * w + x] >>> 24) continue;
      if ((x > 0 && d[y * w + x - 1] >>> 24) || (x < w - 1 && d[y * w + x + 1] >>> 24) || (y > 0 && d[(y - 1) * w + x] >>> 24) || (y < h - 1 && d[(y + 1) * w + x] >>> 24) ||
        (diag && ((x > 0 && y > 0 && d[(y - 1) * w + x - 1] >>> 24) || (x < w - 1 && y > 0 && d[(y - 1) * w + x + 1] >>> 24) || (x > 0 && y < h - 1 && d[(y + 1) * w + x - 1] >>> 24) || (x < w - 1 && y < h - 1 && d[(y + 1) * w + x + 1] >>> 24)))) add.push(y * w + x);
    }
    for (const i of add) d[i] = c;
  }
  done() { this.x.putImageData(this.id, 0, 0); return this.c; }
}
const pa_put = (cv, x, y, a = 1) => { L.setTransform(1, 0, 0, 1, 0, 0); if (a !== 1) L.globalAlpha = a; L.drawImage(cv, Math.round(x), Math.round(y)); if (a !== 1) L.globalAlpha = 1; };

// ════════════════════════════════════════════════════════════════════════════════════════
// 1. AMBIANCES ET CIEL
// ════════════════════════════════════════════════════════════════════════════════════════
// Trois ambiances : 'matin' (soleil bas doré, ciel bleu → crème), 'soir' (fin d'après-midi : orange et rose, ombres violettes),
// 'crepuscule' (soleil couché : bleu nuit → rose et orangé à l'horizon, fenêtres et lampadaires allumés). Lumière à DROITE par défaut (o.light = +1) ; -1 pour la gauche.
const PA_ENV = {
  matin: {
    h: 330, light: 1, mist: '#dccbd2', mistFar: '#e6d2c6', sunCol: '#ffd070', sun: [196, -92, 12], stars: 0,
    stops: [[0, NI[7]], [.16, NI[8]], [.36, NI[9]], [.54, NE[2]], [.68, NE[4]], [.8, AM[10]], [.92, AM[9]], [1, AM[8]]],
    glow: { gx: 0.72, gy: 0.9, sx: 110, sy: 80, k: 0.15 },
  },
  soir: {
    h: 330, light: 1, mist: '#d79aa6', mistFar: '#e3a994', sunCol: '#ffb04a', sun: [202, -46, 16], stars: 0,
    stops: [[0, NI[5]], [.1, NI[6]], [.24, DU[3]], [.38, DU[4]], [.5, DU[5]], [.62, DU[6]], [.72, DU[7]], [.82, RD[5]], [.92, AM[8]], [1, AM[9]]],
    glow: { gx: 0.74, gy: 0.95, sx: 110, sy: 80, k: 0.14 },
  },
  crepuscule: {
    h: 330, light: 1, mist: '#6a4a96', mistFar: '#8a52a0', sunCol: '#ffa850', sun: null, stars: 26,
    stops: [[0, NI[1]], [.14, NI[2]], [.30, NI[3]], [.46, NI[4]], [.60, DU[2]], [.70, DU[3]], [.78, DU[5]], [.85, DU[6]], [.90, RD[4]], [.95, AM[6]], [1, AM[7]]],
    glow: { gx: 0.62, gy: 1.0, sx: 130, sy: 70, k: 0.12 },
  },
};
const pa_env = o => PA_ENV[(o && o.env) || 'matin'] || PA_ENV.matin;
// nuages : [liseré, éclairé, corps, ombre, dessous]
K_CLOUD.pa_matin = { mode: 'above', tones: [AM[10], WH[2], NE[3], NI[9], NI[8]], light: [0.75, -0.55], rim: AM[10] };
K_CLOUD.pa_soir = { mode: 'below', tones: [AM[10], AM[8], RD[4], DU[6], DU[3]], light: [0.9, 0.55], rim: AM[9] };
K_CLOUD.pa_crepuscule = { mode: 'below', tones: [AM[7], RD[4], DU[6], DU[3], NI[3]], light: [0.9, 0.5], rim: AM[7] };

function pa_ramp(st, f, x, y, k = 2.2) {
  const n = st.length; if (f <= st[0][0]) return st[0][1]; if (f >= st[n - 1][0]) return st[n - 1][1];
  let i = 0; while (i < n - 2 && f > st[i + 1][0]) i++;
  const s = (f - st[i][0]) / (st[i + 1][0] - st[i][0]), s2 = clamp((s - 0.5) * k + 0.5);
  return pa_bay(x, y) < s2 ? st[i + 1][1] : st[i][1];
}
function pa_buildSky(E, h) {
  const b = new PaBuf(LW, LH), st = E.stops.map(s => [s[0], pa_u32(s[1])]), g = E.glow, gx = g.gx * LW, gy = g.gy * h;
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
    let l = y / h;
    l += 0.02 * Math.sin(x * 0.023 + y * 0.012) + 0.01 * Math.sin(x * 0.051 - y * 0.021);
    const dx = (x - gx) / g.sx, dy = (y - gy) / g.sy; l += g.k * Math.exp(-(dx * dx + dy * dy));
    b.d[y * LW + x] = pa_ramp(st, clamp(l), x, y, 2.2);
  }
  return b.done();
}
function pa_stars(t, n, y1, cam, seed) {
  for (let i = 0; i < n; i++) {
    const x0 = pa_h(i, seed) * LW, y = Math.floor(Math.pow(pa_h(i, seed + 1), 0.9) * y1), ph = pa_h(i, seed + 2) * TAU, sp = 0.5 + pa_h(i, seed + 3) * 1.8, big = pa_h(i, seed + 4) > 0.86;
    if (pa_h(i, seed + 5) > 1 - Math.pow(y / y1, 1.8) * 0.9) continue;
    const x = Math.floor((((x0 - cam * 0.03) % LW) + LW) % LW), v = 0.5 + 0.5 * Math.sin(t * sp + ph);
    px(x, y, v > 0.3 ? NI[9] : NI[7]);
    if (big && v > 0.4) { px(x - 1, y, NI[8]); px(x + 1, y, NI[8]); px(x, y - 1, NI[8]); px(x, y + 1, NI[8]); }
  }
}
// pa_ciel : voir l'en-tête
function pa_ciel(t, o = {}) {
  const env = o.env || 'matin', E = pa_env(o), h = o.h ?? E.h, cam = pa_fin(o.cam), camY = pa_fin(o.camY);
  const cv = pa_cache(`ciel|${env}|${h}`, () => pa_buildSky(E, h));
  L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1;
  const dy = Math.round(-camY * 0.05);
  L.drawImage(cv, 0, dy);
  if (dy > 0) L.drawImage(cv, 0, 0, LW, 1, 0, 0, LW, dy); else if (dy < 0) L.drawImage(cv, 0, LH - 1, LW, 1, 0, LH + dy, LW, -dy);
  const ns = o.stars ?? E.stars; if (ns) pa_stars(t, ns, h * 0.7, cam, o.seed ?? 5);
  let sun = null;
  if (E.sun && o.sun !== false) {
    const sx = (o.sunX ?? E.sun[0]), sy = h + E.sun[1] + (o.sunDy || 0);
    sun = [sx - cam * 0.04, sy - camY * 0.04, E.sun[2]];
    k_sun(sx, sy, E.sun[2], { t, rays: o.rays ?? 0.35, glow: 0.8, col: E.sunCol, cam, camY, par: 0.04 });
  }
  if (o.moon || (o.moon === undefined && env === 'crepuscule' && false)) k_moon(o.moon.x ?? 52, o.moon.y ?? 84, o.moon.r ?? 8, { phase: o.moon.phase ?? 0.1, glow: 0.6, cam, par: 0.04 });
  const nc = o.clouds ?? 6;
  if (nc > 0) k_clouds(t, { preset: 'pa_' + env, kind: o.cloudKind || 'mix', n: nc, y0: o.cloudY0 ?? 30, y1: o.cloudY1 ?? h - 60, speed: o.cloudSpeed ?? 3, scale: o.cloudScale ?? 1.5, seed: o.seed ?? 11, cam, camY });
  return { h, sun, mist: E.mist, mistFar: E.mistFar, light: o.light ?? E.light, env };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 2. LA TOUR EIFFEL
// ════════════════════════════════════════════════════════════════════════════════════════
// Géométrie en mètres (X depuis l'axe, Y depuis le sol) ; s = pixels par mètre. Le sprite est construit une fois par (ambiance, s, brume) : couches de codes
// (1 fond sombre, 2 treillis arrière, 3 treillis, 4 membrure éclairée, 5 plateforme, 6 plateforme éclairée, 7 vitre, 8 lampe, 9 maçonnerie) puis passe d'éclairage.
const PA_T = { H1: 57.6, H2: 115.7, H3: 276.1, TOP: 301, MAST: 313, B: 62.5 };
const pa_tOutTab = [[0, Math.log(62.5)], [57.6, Math.log(31)], [115.7, Math.log(15.2)], [200, Math.log(8.4)], [276, Math.log(5.7)], [301, Math.log(4.4)], [320, Math.log(3.6)]];
const pa_tOut = Y => Math.exp(tab(pa_tOutTab, Y));                        // demi-largeur de la silhouette extérieure (pieds puis fût)
const pa_tLegW = Y => Y <= 57.6 ? lerp(25, 7.2, Math.pow(Y / 57.6, 0.9)) : lerp(7.2, 5, clamp((Y - 57.6) / 58));
const pa_tIn = Y => Math.max(0, pa_tOut(Y) - pa_tLegW(Y));               // bord intérieur du pied (vue de face)
function pa_panels(Y0, Y1, wFn, ratio, minM) {                          // limites de panneaux de treillis, hauteur ∝ largeur locale
  const out = [Y0]; let Y = Y0;
  while (Y < Y1 - 0.01) { const st = Math.max(minM, wFn(Y) * ratio); Y = Math.min(Y1, Y + st); out.push(Y); }
  if (out.length > 2 && out[out.length - 1] - out[out.length - 2] < minM * 0.55) out.splice(out.length - 2, 1);
  return out;
}
// ton de fer par ambiance : [fond, ombre, milieu, éclairé, liseré, éclat]
const PA_IRON = {
  matin: { c: [WO[0], WO[1], WO[3], OC[2], OC[3], AM[8]], rim: AM[9], stone: [WO[1], WO[2], WO[3], WO[5]], glass: [ST[2], CY[2]], lamp: AM[9], shade: DU[1] },
  soir: { c: [DU[0], WO[0], WO[2], OC[2], OC[4], AM[8]], rim: AM[9], stone: [DU[1], DU[2], WO[3], OC[4]], glass: [DU[1], AM[6]], lamp: AM[9], shade: DU[1] },
  crepuscule: { c: [NI[0], NI[0], NI[1], DU[0], DU[2], RD[4]], rim: AM[7], stone: [NI[1], NI[2], DU[1], DU[2]], glass: [NI[1], AM[8]], lamp: AM[9], shade: NI[0] },
};
function pa_buildTower(env, s, hazeQ) {
  const IR = PA_IRON[env] || PA_IRON.matin, light = 1;
  const w = Math.ceil(2 * 68 * s) + 4, h = Math.ceil(318 * s) + 3, cx = Math.floor(w / 2), y0 = h - 2;
  const m = new PaBuf(w, h);
  const X = v => cx + v * s, Y = v => y0 - v * s;
  const P = (pts, c) => m.poly(pts.map(p => [X(p[0]), Y(p[1])]), c);
  const Ln = (x0, yy0, x1, yy1, c, th = 1) => m.line(X(x0), Y(yy0), X(x1), Y(yy1), c, th);
  const Rc = (x0, yy0, x1, yy1, c) => m.R(X(x0), Y(yy1), (x1 - x0) * s, (yy1 - yy0) * s, c);        // (x0,y0) bas gauche → (x1,y1) haut droit, en mètres
  const sd = pa_h(7, 3);

  // ── une colonne treillissée entre deux courbes (xl(Y) < xr(Y)) : fond, membrures, croix, croisillons fins ──
  function column(xl, xr, Ya, Yb, o = {}) {
    const fill = o.fill ?? 0.0, ratio = o.ratio ?? 1.2, minM = o.minM ?? Math.max(2.4, 3.4 / s), fine = o.fine ?? 0, q = o.q ?? Math.max(3, Math.min(6, Math.round(3.3 * Math.pow(s, 0.5)))), mesh = o.mesh ?? 1;
    for (let yy = Math.floor(Y(Yb)); yy <= Math.ceil(Y(Ya)); yy++) {
      const Ym = (y0 - yy) / s, a = xl(Ym), b = xr(Ym), pa = Math.round(X(a)), pb = Math.round(X(b));
      for (let xx = pa; xx <= pb; xx++) {
        if (fill && pa_bay(xx + 1, yy + 2) < fill) m.px(xx, yy, 1);
        if (mesh && (((xx + yy) % q + q) % q === 0 || ((xx - yy) % q + q) % q === 0)) m.px(xx, yy, 2);
      }
    }
    const pn = pa_panels(Ya, Yb, Ym => (xr(Ym) - xl(Ym)), ratio, minM);
    for (let k = 0; k + 1 < pn.length; k++) {
      const ya = pn[k], yb = pn[k + 1], yc = (ya + yb) / 2;
      const la = xl(ya), ra = xr(ya), lb = xl(yb), rb = xr(yb);
      Ln(la, ya, rb, yb, 3, 1); Ln(ra, ya, lb, yb, 4, 1);              // croix du panneau
      Ln(la, yb, rb, yb, 3, 1);                                         // sommier
      if (fine) {                                                       // croisillons fins du deuxième treillis (face arrière), décalés d'un demi-panneau
        const lc = xl(yc), rc = xr(yc);
        Ln(la, yc, rc, yc, 2, 1); Ln(la, ya, lc, yc, 2, 1); Ln(ra, ya, rc, yc, 2, 1); Ln(lc, yc, lb, yb, 2, 1); Ln(rc, yc, rb, yb, 2, 1);
      }
    }
    for (let yy = Math.floor(Y(Yb)); yy <= Math.ceil(Y(Ya)); yy++) {            // membrures extérieures : deux pixels par ligne (bords lisses)
      const Ym = (y0 - yy) / s, pa = Math.round(X(xl(Ym))), pb = Math.round(X(xr(Ym)));
      m.px(pa, yy, 3); m.px(pa + 1, yy, 3); m.px(pb, yy, 4); m.px(pb - 1, yy, 4);
    }
  }
  // ── couche arrière : arc et pieds éloignés (plus petits, ombre) vus à travers l'arche ──
  {
    const k = 0.8, mm = new PaBuf(w, h), saveM = m;
    const XR = v => cx + v * s * k, YR = v => y0 - v * s * k;
    // arche arrière
    const rim = [];
    for (let a = 0; a <= 180; a += 3) { const r = a * Math.PI / 180; rim.push([XR(-Math.cos(r) * 36), YR(8 + Math.sin(r) * 36)]); }
    for (let i = 0; i + 1 < rim.length; i++) m.line(rim[i][0], rim[i][1], rim[i + 1][0], rim[i + 1][1], 2, Math.max(2, Math.round(3.2 * s * k)));
    for (const sg of [-1, 1]) for (let yy = Math.floor(YR(52)); yy <= Math.ceil(YR(0)); yy++) { const Ym = (y0 - yy) / (s * k); const a = pa_tIn(Ym), b = pa_tOut(Ym); for (let xx = Math.round(XR(sg > 0 ? a : -b)); xx <= Math.round(XR(sg > 0 ? b : -a)); xx++) m.px(xx, yy, 2); }
    // plateau arrière (visible au-dessus de l'arche)
    m.R(XR(-34), YR(61), 68 * s * k, 7 * s * k, 2);
  }
  // ── pieds, vus de face ──
  for (const sg of [-1, 1]) {
    column(Ym => sg > 0 ? pa_tIn(Ym) : -pa_tOut(Ym), Ym => sg > 0 ? pa_tOut(Ym) : -pa_tIn(Ym), 3, PA_T.H1 - 2, { ratio: 1.25, minM: Math.max(5, 4.5 / s), fill: 0.55, fine: 0 });
    // massif de maçonnerie
    const xo = pa_tOut(0), xi = pa_tIn(0);
    P(sg > 0 ? [[xi - 1, 0], [xo + 2, 0], [xo + 1.5, 3.2], [xi, 3.2]] : [[-xo - 2, 0], [-xi + 1, 0], [-xi, 3.2], [-xo - 1.5, 3.2]], 9);
  }
  // arche : deux membrures et zigzag
  {
    const A = 37.5, B = 36, cy = 8, tk = 3.6, N = 30, outer = [], inner = [];
    for (let i = 0; i <= N; i++) { const r = Math.PI * i / N; outer.push([-Math.cos(r) * A, cy + Math.sin(r) * B]); inner.push([-Math.cos(r) * (A - tk), cy + Math.sin(r) * (B - tk)]); }
    for (let i = 0; i < N; i++) {
      Ln(outer[i][0], outer[i][1], outer[i + 1][0], outer[i + 1][1], i < N / 2 ? 3 : 4, 2);
      Ln(inner[i][0], inner[i][1], inner[i + 1][0], inner[i + 1][1], 3, 1);
      Ln(outer[i][0], outer[i][1], inner[i + 1][0], inner[i + 1][1], 3, 1); Ln(inner[i][0], inner[i][1], outer[i][0], outer[i][1], 4, 1);
    }
    // tympan : treillis fin entre l'arche et la poutre de la plateforme
    for (let yy = Math.floor(Y(54)); yy <= Math.ceil(Y(8)); yy++) for (let xx = Math.round(X(-pa_tIn((y0 - yy) / s))); xx <= Math.round(X(pa_tIn((y0 - yy) / s))); xx++) {
      const Xm = (xx - cx) / s, Ym = (y0 - yy) / s, dx = Xm / A, dy = (Ym - cy) / B;
      if (Ym < cy || dx * dx + dy * dy < 1) continue;
      m.px(xx, yy, 1);
      const q = Math.max(3, Math.round(4.2 * s * 0.9));
      if ((xx + yy) % q === 0) m.px(xx, yy, 3); if (((xx - yy) % q + q) % q === 0) m.px(xx, yy, 4);
    }
    for (const sg of [-1, 1]) { Ln(sg * 36, 8, sg * pa_tIn(8) , 8, 4, 1); }
  }
  // plateforme 1 : poutre-frise, garde-corps, pavillons
  {
    Rc(-35.5, 54, 35.5, 61.2, 5); Rc(-35.5, 59.4, 35.5, 61.2, 6);
    for (let q = -34; q <= 34; q += 3.2) Ln(q, 54.6, q, 58.6, 3, 1);        // frise en lettres (traits verticaux)
    Rc(-36.5, 61.2, 36.5, 62.4, 6);
    for (let q = -36; q <= 36; q += 2.2) Ln(q, 62.4, q, 65.2, 3, 1);        // balustrade
    Rc(-36.5, 65, 36.5, 66, 6);
    for (const sg of [-1, 1]) {                                            // pavillons d'angle
      P([[sg * 31, 66], [sg * 31, 73], [sg * 24, 76], [sg * 17, 73], [sg * 17, 66]], 5);
      Rc(sg * 17.5 - 0, 66, sg * 30.5, 66, 5);
    }
    for (const sg of [-1, 1]) for (let q = 0; q < 5; q++) Rc(sg * (18.5 + q * 2.5), 67.2, sg * (18.5 + q * 2.5) + sg * 1.4, 70.6, 7);
  }
  // entre les plateformes 1 et 2 : deux pieds et croisillons ouverts
  {
    const yA = 66, yB = PA_T.H2 - 2;
    for (const sg of [-1, 1]) column(Ym => sg > 0 ? pa_tIn(Ym) - 1 : -pa_tOut(Ym), Ym => sg > 0 ? pa_tOut(Ym) : -pa_tIn(Ym) + 1, yA, yB, { ratio: 1.4, minM: Math.max(6, 5 / s), fill: 0.2, fine: 0 });
    // entretoises ouvertes entre les deux pieds
    const ys = [yA + 0, 84, 101, yB];
    for (let k = 0; k + 1 < ys.length; k++) {
      const a = ys[k], b = ys[k + 1], la = -pa_tIn(a), ra = pa_tIn(a), lb = -pa_tIn(b), rb = pa_tIn(b);
      Ln(la, b, rb, b, 4, 2); Ln(la, a, rb, b, 3, 1); Ln(ra, a, lb, b, 4, 1);
      Ln(0, a, 0, b, 3, 1);
    }
  }
  // plateforme 2
  {
    Rc(-20.5, 113.2, 20.5, 117.2, 5); Rc(-20.5, 115.8, 20.5, 117.2, 6);
    Rc(-21.5, 117.2, 21.5, 118.2, 6);
    for (let q = -21; q <= 21; q += 2.2) Ln(q, 118.2, q, 120.6, 3, 1);
    Rc(-21.5, 120.4, 21.5, 121.3, 6);
    for (const sg of [-1, 1]) { P([[sg * 18, 121.3], [sg * 18, 126], [sg * 14, 128], [sg * 10, 126], [sg * 10, 121.3]], 5); Rc(sg * 11, 122, sg * 17, 124.4, 7); }
  }
  // fût (plateforme 2 → 3) : treillis serré, deux étages de croix, chaînage
  {
    column(Ym => -pa_tOut(Ym), Ym => pa_tOut(Ym), 121, PA_T.H3 - 3, { ratio: 1.55, minM: Math.max(8, 5.5 / s), fill: 0.66, fine: 0, mesh: 0 });
    // anneaux horizontaux plus épais tous les ~40 m
    for (const Ym of [152, 190, 228]) Ln(-pa_tOut(Ym), Ym, pa_tOut(Ym), Ym, 4, 2);
  }
  // plateforme 3, lanterne, coupole, mât
  {
    Rc(-9, 272.4, 9, 276.2, 5); Rc(-9, 274.8, 9, 276.2, 6);
    Rc(-9.6, 276.2, 9.6, 277.1, 6);
    for (let q = -9; q <= 9; q += 1.8) Ln(q, 277.1, q, 279.6, 3, 1);
    Rc(-9.6, 279.4, 9.6, 280.3, 6);
    P([[-6.2, 280.3], [-6.2, 291], [-4.4, 294], [4.4, 294], [6.2, 291], [6.2, 280.3]], 5);
    Rc(-5, 282, 5, 289.5, 7);
    for (const q of [-2.5, 0, 2.5]) Ln(q, 282, q, 289.5, 3, 1);
    P([[-4.4, 294], [-2.6, 298.5], [0, 301], [2.6, 298.5], [4.4, 294]], 6);
    Ln(0, 301, 0, PA_T.MAST - 0.5, 4, Math.max(1, Math.round(0.8 * s)));
    Rc(-0.9, 303, 0.9, 305, 8);                                             // feu
  }
  // ── passe d'éclairage ──
  const out = new PaBuf(w, h), md = m.d, od = out.d, C = IR.c.map(pa_u32), stoneC = IR.stone.map(pa_u32), glassC = IR.glass.map(pa_u32), rimC = pa_u32(IR.rim), lampC = pa_u32(IR.lamp);
  const emp = (x, y) => x < 0 || y < 0 || x >= w || y >= h || md[y * w + x] === 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, c = md[i]; if (!c) continue;
    const Ym = (y0 - y) / s, hw = Math.max(3, pa_tOut(Math.min(Ym, 300)) * s), dxn = (x - cx) / hw, litSide = dxn * light + (pa_bay(x, y) - 0.5) * 0.5 > -0.2;
    let col;
    const eR = emp(x + light, y), eU = emp(x, y - 1), eL = emp(x - light, y);
    if (c === 1) col = litSide ? C[1] : C[0];
    else if (c === 2) col = C[1];
    else if (c === 3) col = litSide ? C[3] : C[2];
    else if (c === 4) col = litSide ? C[4] : C[3];
    else if (c === 5) col = litSide ? C[3] : C[2];
    else if (c === 6) col = litSide ? C[4] : C[3];
    else if (c === 7) col = glassC[0];
    else if (c === 8) col = lampC;
    else col = litSide ? stoneC[3] : stoneC[1];
    if ((c === 3 || c === 4 || c === 6 || c === 5) && eR && litSide) col = c === 6 || c === 4 ? rimC : C[5];
    else if ((c === 6 || c === 4) && eU && litSide) col = C[5];
    if (c === 7 && litSide) col = glassC[1];
    od[i] = col;
  }
  if (hazeQ > 0) { out.haze(pa_u32(PA_ENV[env].mistFar), hazeQ * 0.12, hazeQ * 0.95, h * 0.2, h); }
  return { cv: out.done(), sil: m, w, h, cx, y0, s };
}
function pa_towerSprite(env, s, hazeQ) {
  const sq = Math.round(s * 40) / 40, hq = Math.round(hazeQ * 8) / 8;
  return pa_cache(`tour|${env}|${sq}|${hq}`, () => pa_buildTower(env, sq, hq));
}

// drapeau tricolore qui flotte : (x, y) = point d'attache en haut du mât, dir = +1 flotte vers la droite
function pa_flag(x, y, w, h, t, dir = 1, ph = 0) {
  const cols = [BL[3], WH[3], RD[3]];
  for (let i = 0; i < w; i++) {
    const f = i / Math.max(1, w - 1), amp = f * (0.9 + 0.5 * h / 4), dy = Math.sin(t * 7 + ph - i * 0.9) * amp, tone = Math.sin(t * 7 + ph - i * 0.9 + 1) > 0.35 ? 1 : 0;
    const c = cols[Math.min(2, Math.floor(i / (w / 3)))], hh = Math.max(2, Math.round(h * (1 - 0.1 * f)));
    R(x + dir * i, y + dy, 1, hh, c); if (tone && h > 3) R(x + dir * i, y + dy + hh - 1, 1, 1, i < w / 3 ? BL[1] : i < 2 * w / 3 ? WH[0] : RD[1]);
  }
}
// pa_tour : voir l'en-tête
function pa_tour(cx, baseY, s, t, o = {}) {
  const env = o.env || 'matin', E = pa_env(o), haze = o.haze || 0, light = o.light ?? E.light;
  const sp = pa_towerSprite(env, s, haze), x0 = Math.round(cx - sp.cx), yy0 = Math.round(baseY - sp.y0);
  const sc = sp.s, ox = x0 + sp.cx, oy = yy0 + sp.y0;                                   // échelle réelle (arrondie) du sprite
  L.setTransform(1, 0, 0, 1, 0, 0);
  const sh = o.shadow ?? 0.5;
  if (sh > 0) pa_drawShadow(env, sp, ox, oy, o.shDir || [-0.75 * light, 0.12], sh);
  L.drawImage(sp.cv, x0, yy0);
  const mx = ox, my = oy - PA_T.MAST * sc;
  if (o.flag !== false) pa_flag(mx + 1, my - 0, Math.max(5, Math.round(6.5 * sc)), Math.max(3, Math.round(3.4 * sc)), t, o.windDir ?? -1, 0);
  const lamp = [mx, oy - 304 * sc];
  if (o.lights ?? env === 'crepuscule') pa_towerLights(ox, oy, sc, t, o.lightsA ?? 1);
  if (o.lifts !== false) pa_towerLifts(ox, oy, sc, t, env);
  if (o.beacon ?? env === 'crepuscule') pa_beacon(lamp[0], lamp[1], t, o.beaconLen ?? 150, o.beaconA ?? 1);
  return { x: x0, y: yy0, w: sp.w, h: sp.h, cx: ox, base: oy, top: [mx, my], lamp, s: sc,
    y1: oy - PA_T.H1 * sc, y2: oy - PA_T.H2 * sc, y3: oy - PA_T.H3 * sc, m2px: v => v * sc, yAt: Y => oy - Y * sc, xAt: Y => pa_tOut(Y) * sc };
}

// guirlandes d'ampoules : plateformes, arche, membrures (positions en mètres, mises en cache)
const pa_lightList = (() => {
  const l = [];
  for (const [Y, hw, st] of [[61.8, 36, 2.2], [118.6, 21, 2.2], [277.4, 9.4, 1.8], [54.5, 35.5, 2.8]]) for (let X = -hw; X <= hw + 0.1; X += st) l.push([X, Y]);
  for (let a = 0; a <= 180; a += 7) { const r = a * Math.PI / 180; l.push([-Math.cos(r) * 37.5, 8 + Math.sin(r) * 36]); }
  for (const sg of [-1, 1]) for (let Y = 6; Y < 110; Y += 7) { l.push([sg * pa_tOut(Y), Y]); }
  for (let Y = 130; Y < 272; Y += 9) { l.push([-pa_tOut(Y), Y]); l.push([pa_tOut(Y), Y]); }
  return l;
})();
function pa_towerLights(ox, oy, s, t, a = 1) {
  for (let i = 0; i < pa_lightList.length; i++) {
    const [X, Y] = pa_lightList[i], tw = Math.sin(t * (1.1 + pa_h(i, 3) * 1.4) + pa_h(i, 4) * TAU);
    if (tw < -0.85 && a < 1) continue;
    px(ox + X * s, oy - Y * s, tw > -0.3 ? AM[9] : AM[7]);
  }
}
function pa_towerLifts(ox, oy, s, t, env) {
  for (let k = 0; k < 2; k++) {
    const ph = ((t / 26 + k * 0.5) % 1), Y = 5 + (ph < 0.5 ? ph * 2 : 2 - ph * 2) * 48, sg = k ? 1 : -1, X = sg * (pa_tOut(Y) + pa_tIn(Y)) / 2;
    const x = Math.round(ox + X * s), y = Math.round(oy - Y * s);
    R(x - 1, y - 2, 3, 3, env === 'crepuscule' ? AM[8] : WO[4]); px(x, y - 1, AM[10]);
  }
}
// phare : faisceaux horizontaux qui tournent autour du mât (vus de face : un trait qui va et vient)
function pa_beacon(x, y, t, len, a = 1) {
  const ang = t * 0.9;
  rgrad(x, y, 1, 14, [[0, 'rgba(255,240,170,0.9)'], [0.4, 'rgba(255,200,90,0.35)'], [1, 'rgba(255,170,60,0)']], a, 'lighter');
  for (const sg of [0, Math.PI]) {
    const c = Math.cos(ang + sg), sn = Math.sin(ang + sg), L2 = len * c, wd = 1.5 + 10 * Math.abs(sn);
    if (Math.abs(L2) < 4) continue;
    L.save(); L.globalCompositeOperation = 'lighter'; L.globalAlpha = a * (0.28 + 0.22 * Math.abs(c));
    const g = L.createLinearGradient(x, y, x + L2, y); g.addColorStop(0, 'rgba(255,230,150,1)'); g.addColorStop(1, 'rgba(255,200,120,0)'); L.fillStyle = g;
    L.beginPath(); L.moveTo(x, y); L.lineTo(x + L2, y - wd * 1.4 + L2 * 0.03); L.lineTo(x + L2, y + wd * 1.4 + L2 * 0.03); L.closePath(); L.fill(); L.restore();
  }
  px(x, y, WH[3]);
}
function pa_shadowCanvas(env, sp, sv) {                                                // silhouette cisaillée (union des lignes qui tombent sur la même ligne du sol), mise en cache
  return pa_cache(`tourSh|${sp.s}|${sp.w}|${sv[0].toFixed(2)}|${sv[1].toFixed(3)}`, () => {
    const sw = Math.ceil(sp.w + Math.abs(sv[0]) * sp.h), shh = Math.ceil(sv[1] * sp.h) + 2, b = new PaBuf(sw, shh), md = sp.sil.d, col = pa_u32('#1c1034');
    const ofs = sv[0] < 0 ? Math.ceil(-sv[0] * sp.h) : 0;
    for (let y = 0; y < sp.h; y++) {
      const Y = sp.y0 - y, dx = Math.round(sv[0] * Y) + ofs, dy = Math.round(sv[1] * Y);
      if (dy < 0 || dy >= shh) continue;
      const keep = 1.05 - 0.8 * Math.pow(Y / sp.y0, 1.4);
      for (let x = 0; x < sp.w; x++) if (md[y * sp.w + x]) { const xx = x + dx; if (xx >= 0 && xx < sw && pa_bay(xx, dy) < keep) b.d[dy * sw + xx] = col; }
    }
    // comble les trous de la silhouette (le sol reçoit une ombre pleine sous le fût) : fermeture horizontale de 2 px
    for (let y = 0; y < shh; y++) for (let x = 1; x < sw - 1; x++) { const i = y * sw + x; if (!b.d[i] && b.d[i - 1] && b.d[i + 1]) b.d[i] = col; }
    return { cv: b.done(), ofs, w: sw, h: shh };
  });
}
// ombre portée posée sur le sol (a = opacité) : base = (ox, oy) au pied de l'axe
function pa_drawShadow(env, sp, ox, oy, sv, a) {
  const S = pa_shadowCanvas(env, sp, sv);
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = a; L.drawImage(S.cv, Math.round(ox - sp.cx - S.ofs), Math.round(oy)); L.restore();
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 3. MATIÈRES D'ARCHITECTURE ET VAPEUR / FUMÉE
// ════════════════════════════════════════════════════════════════════════════════════════
// Matières par ambiance. Tons de pierre : [ombre, ombre claire, milieu, éclairé, éclat] ; zinc, ardoise, brique : sombre → clair ; vitre : [fond, reflet, reflet clair, lumière allumée]
const PA_MAT = {
  matin: {
    stone: [ST[4], SK[3], SK[4], WH[1], WH[3]], stoneB: [ST[4], ST[6], WH[0], WH[1], WH[3]],
    zinc: [ST[2], ST[3], ST[4], ST[5], ST[6]], slate: [NI[1], ST[1], ST[2], ST[3], ST[4]], brick: [WO[1], OC[1], OC[2], OC[3], OC[4]],
    glass: [NI[4], NI[5], NI[6], NI[7], AM[8]], lit: [AM[5], AM[7], AM[8]], iron: NI[0], rim: AM[9], shade: ST[3], deep: DU[2], wood: [WO[1], WO[2], WO[3], WO[4]], shutter: [ST[2], ST[3], ST[4], ST[5]], mist: '#e2cdd0', mistFar: '#ead4c6', litWin: 0.0,
  },
  soir: {
    stone: [DU[2], DU[4], OC[5], AM[9], AM[10]], stoneB: [DU[3], DU[5], SK[3], SK[4], AM[10]],
    zinc: [DU[1], DU[2], DU[3], DU[4], DU[6]], slate: [DU[0], DU[1], DU[2], DU[3], DU[4]], brick: [WO[0], WO[1], OC[1], OC[2], OC[4]],
    glass: [DU[1], DU[2], NI[5], DU[5], AM[8]], lit: [AM[5], AM[7], AM[9]], iron: DU[0], rim: AM[9], shade: DU[2], deep: DU[1], wood: [WO[0], WO[1], WO[2], WO[3]], shutter: [DU[1], DU[2], DU[3], DU[4]], mist: '#c98aa4', mistFar: '#e0a090', litWin: 0.08,
  },
  crepuscule: {
    stone: [NI[0], NI[1], NI[2], NI[3], DU[3]], stoneB: [NI[1], NI[2], NI[3], NI[4], DU[4]],
    zinc: [NI[0], NI[1], NI[2], NI[3], NI[5]], slate: [NI[0], NI[0], NI[1], NI[2], NI[3]], brick: [NI[0], NI[1], DU[0], DU[1], DU[2]],
    glass: [NI[0], NI[1], NI[2], NI[4], AM[8]], lit: [AM[6], AM[8], AM[9]], iron: NI[0], rim: DU[5], shade: NI[1], deep: NI[0], wood: [NI[0], NI[1], DU[0], DU[1]], shutter: [NI[0], NI[1], NI[2], NI[3]], mist: '#6a4a96', mistFar: '#8a52a0', litWin: 0.55,
  },
};
const pa_mat = o => PA_MAT[(o && o.env) || 'matin'] || PA_MAT.matin;

// ── pa_vapeur : colonne de fumée ou de vapeur faite de bouffées ombrées, qui grossissent, dérivent et se dissolvent (tramage) ──
const PA_VAP = {
  fumee: { matin: [ST[5], ST[6], ST[7], WH[2]], soir: [DU[3], DU[5], DU[7], AM[9]], crepuscule: [NI[1], NI[2], DU[2], DU[4]] },
  vapeur: { matin: [NE[0], NE[2], NE[3], WH[3]], soir: [DU[5], DU[7], RD[5], AM[10]], crepuscule: [DU[2], DU[4], DU[6], DU[7]] },
  noire: { matin: [NI[0], NI[1], ST[1], ST[3]], soir: [NI[0], DU[0], DU[1], DU[4]], crepuscule: [NI[0], NI[0], NI[1], NI[2]] },
};
function pa_puffSprite(r, lvl, tones, seed) {
  return pa_cache(`puff|${r}|${lvl}|${tones.join(',')}|${seed}`, () => {
    const n = r * 2 + 3, b = new PaBuf(n, n), T = tones.map(pa_u32), c = r + 1;
    const lobes = []; for (let i = 0; i < 5; i++) lobes.push([pa_h(i, seed) * TAU, 0.82 + 0.4 * pa_h(i, seed + 7), 0.12 + 0.2 * pa_h(i, seed + 3)]);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = (x - c) / r, dy = (y - c) / r, d = Math.hypot(dx, dy); let rr = 1;
      const a = Math.atan2(dy, dx); for (const [pa, pr, w] of lobes) rr += w * Math.max(0, Math.cos(a - pa)) * (pr - 0.9) * 1.4;
      if (d > rr * 0.98) continue;
      if (pa_bay(x, y) >= (lvl + 1) / 8) continue;                                  // dissolution tramée
      const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, d / rr) ** 2)), I = (dx * 0.5 - dy * 0.62) / Math.max(rr, 0.01) * 0.8 + nz * 0.5;
      b.d[y * n + x] = I > 0.82 ? T[3] : I > 0.5 ? T[2] : I > 0.18 ? T[1] : T[0];
    }
    return b.done();
  });
}
// pa_vapeur(x, y, t, o) : (x, y) = bouche de la cheminée / de la soupape. o.kind 'fumee' | 'vapeur' | 'noire', o.env, o.n bouffées (9), o.h hauteur de la colonne (50), o.w rayon de départ (2) → o.w2 rayon d'arrivée (8),
// o.wind dérive à l'arrivée en px (14), o.rate montées par seconde (0,35), o.a opacité 0..1 (1), o.seed, o.sway balancement latéral (3), o.burst : t0 d'un jet unique de 1,6 s (au lieu d'une colonne continue)
function pa_vapeur(x, y, t, o = {}) {
  const kind = o.kind || 'fumee', env = o.env || 'matin', tones = PA_VAP[kind][env] || PA_VAP[kind].matin, n = o.n ?? 12, H = o.h ?? 50, w1 = o.w ?? 2, w2 = o.w2 ?? 8, wind = o.wind ?? 14, rate = o.rate ?? 0.35, A = o.a ?? 1, seed = o.seed ?? 1, sway = o.sway ?? 3;
  L.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {                                                         // du plus vieux (grand) au plus jeune
    let a;
    if (o.burst != null) { a = (t - o.burst - i * 0.06) / 1.6; if (a < 0 || a >= 1) continue; }
    else a = (((t * rate + (i + pa_h(i, seed) * 0.3) / n + pa_h(seed, 9)) % 1) + 1) % 1;
    const r = Math.max(1, Math.round(lerp(w1, w2, Math.pow(a, 0.8)) * (0.82 + 0.4 * pa_h(i, seed + 11)))), op = A * (a < 0.55 ? 1 : Math.pow(1 - (a - 0.55) / 0.45, 1.1)) * clamp(a / 0.05), lvl = Math.max(0, Math.min(7, Math.round(op * 8) - 1));
    if (op < 0.1) continue;
    const px_ = x + wind * a * a + (pa_h(i, seed + 13) - 0.5) * 2.4 * (0.4 + a) + Math.sin(a * 5 + seed * 2 + (o.burst != null ? 0 : t * 0.4)) * sway * a, py_ = y - H * Math.pow(a, 0.85);
    const sp = pa_puffSprite(r, lvl, tones, (seed + i) % 5);
    L.drawImage(sp, Math.round(px_ - r - 1), Math.round(py_ - r - 1));
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 4. IMMEUBLES HAUSSMANNIENS (tampon de pixels) : façade, fenêtres, balcons, corniche, toit en zinc, lucarnes, cheminées
// ════════════════════════════════════════════════════════════════════════════════════════
// fenêtre : surround (liseré), vitre (reflet ou lumière), meneau, volets ouverts
function pa_window(b, wx, wy, ww, wh, M, o) {
  const st = o.st, det = o.det, lit = o.lit, rnd = o.rnd, side = o.side ?? 1;
  if (det >= 1) { b.R(wx - 1, wy - 1, ww + 2, wh + 2, st[1]); b.R(wx - (side > 0 ? 0 : 1), wy - 1, ww + 1, 1, st[3]); b.R(wx + (side > 0 ? ww : -1), wy - 1, 1, wh + 2, st[4]); b.R(wx - 1, wy + wh, ww + 2, 1, st[4]); }
  const gl = M.glass;
  if (lit) {
    b.R(wx, wy, ww, wh, M.lit[1]); b.R(wx, wy, Math.max(1, ww >> 2), wh, M.lit[0]); if (det >= 1) b.R(wx, wy, ww, 1, M.lit[0]);
    if (det >= 2 && rnd() < 0.5) { b.R(wx + (ww >> 1) - 1, wy + (wh >> 2), 2, wh >> 1, M.lit[0]); }       // silhouette dans la lumière
  } else {
    b.R(wx, wy, ww, wh, gl[0]);
    if (det >= 1) { for (let j = 0; j < wh; j++) for (let i = 0; i < ww; i++) { const dg = (i * side) + (wh - j) * 0.55 - (ww * (side > 0 ? 0.35 : 0.65)); if (dg > 0 && dg < ww * 0.55) b.px(wx + i, wy + j, gl[1 + (dg < ww * 0.2 ? 1 : 0)]); } }
    else b.px(wx + (ww >> 1), wy, gl[2]);
    if (det >= 2) b.R(wx, wy, ww, 1, gl[0]);
  }
  if (det >= 2 && ww >= 5) { b.R(wx + (ww >> 1), wy, 1, wh, st[2]); b.R(wx, wy + Math.floor(wh * 0.38), ww, 1, st[2]); }
  if (det >= 1 && o.shut) {
    const sw = Math.max(1, Math.min(Math.round(ww * (det >= 2 ? 0.5 : 0.4)), (o.maxSw ?? 9))), sc = M.shutter;
    b.R(wx - sw - 1, wy, sw, wh, sc[1]); b.R(wx + ww + 1, wy, sw, wh, sc[2]); b.R(wx + ww + 1 + sw - 1, wy, 1, wh, sc[3]);
    if (det >= 2) for (let j = 1; j < wh; j += 2) { b.R(wx - sw - 1, wy + j, sw, 1, sc[0]); b.R(wx + ww + 1, wy + j, sw, 1, sc[1]); }
  }
}
// balcon filant : dalle, garde-corps en fer forgé
function pa_balcony(b, x, y, w, M, st, det) {
  b.R(x - 1, y, w + 2, 1, st[4]); b.R(x - 1, y + 1, w + 2, 1, st[1]);
  if (det >= 1) {
    const rh = det >= 2 ? 4 : 3;
    const ic = det >= 2 ? M.iron : M.shade;
    b.R(x - 1, y - rh, w + 2, 1, ic);
    if (det >= 2) for (let q = 0; q < w; q += 2) { b.px(x + q, y - 1, ic); b.px(x + q, y - 2, ic); b.px(x + q, y - 3, ic); if ((q >> 1) % 3 === 1) b.px(x + q, y - 2, M.rim); }
    else for (let q = 0; q < w; q += 3) b.px(x + q, y - 1, ic);
  }
  b.dith(x, y + 2, w, 2, st[0], 0.7);
}
// lucarne de la mansarde
function pa_dormer(b, cx, yb, dw, dh, M, st, zc, rnd, lit, side, det) {
  b.R(cx - (dw >> 1) - 1, yb - dh, dw + 2, dh, st[2]);
  b.R(cx - (dw >> 1) - 1, yb - dh, 1, dh, st[1]); b.R(cx + (dw >> 1) + (dw & 1), yb - dh, 1, dh, st[4]);
  pa_window(b, cx - (dw >> 1), yb - dh + 2, dw, dh - 2, M, { st, det: Math.min(det, 1), lit, rnd, side });
  const tpx = cx, ty = yb - dh - Math.max(3, Math.round(dw * 0.6));
  b.poly([[cx - (dw >> 1) - 2, yb - dh], [tpx, ty], [cx + (dw >> 1) + 2 + (dw & 1), yb - dh]], zc[1]);
  b.line(tpx, ty, cx + (dw >> 1) + 2 + (dw & 1), yb - dh, zc[4], 1); b.line(tpx, ty, cx - (dw >> 1) - 2, yb - dh, zc[2], 1);
  b.R(cx - (dw >> 1) - 1, yb - 1, dw + 2, 1, zc[0]);
}
// cheminée : fût, chapeau, mitres. Renvoie la position de la bouche [x, y]
function pa_chimney(b, cx, yb, cw, ch, M, rnd, side, det, brick) {
  const T = brick ? M.brick : M.stone, base = brick ? 2 : 2;
  b.R(cx - (cw >> 1), yb - ch, cw, ch, T[base]);
  b.R(cx - (cw >> 1), yb - ch, Math.max(1, cw >> 2), ch, T[base - 1]);                         // face à l'ombre
  b.R(cx + (cw >> 1) - 1 + (cw & 1), yb - ch, 1, ch, T[Math.min(4, base + 2)]);
  b.R(cx - (cw >> 1) - 1, yb - ch - 1, cw + 2, 2, T[Math.min(4, base + 1)]);                    // chapeau
  if (det >= 2) for (let j = 3; j < ch; j += 3) b.R(cx - (cw >> 1), yb - ch + j, cw, 1, T[base - 1]);
  const nPots = cw >= 10 ? 3 : cw >= 6 ? 2 : 1, pots = [];
  for (let i = 0; i < nPots; i++) {
    const px_ = cx - (cw >> 1) + 1 + Math.round((i + 0.5) * (cw - 2) / nPots) - 1, ph = 2 + (det >= 2 ? 2 : 1);
    b.R(px_, yb - ch - 1 - ph, 2, ph, M.brick[3]); b.R(px_, yb - ch - 1 - ph, 1, ph, M.brick[2]); b.R(px_ + (side > 0 ? 1 : 0), yb - ch - 1 - ph, 1, ph, M.brick[4]); b.R(px_ - 1, yb - ch - 2 - ph, 4, 1, M.brick[3]);
    pots.push([px_ + 1, yb - ch - 3 - ph]);
  }
  return pots;
}
// pa_house : un immeuble. o = { M, det 0..3, nfl étages, fh, wh, ww, wp, roofH, side, seed, balc [étages à balcon], shop, litP, shut (0..1), zinc 'zinc'|'slate', chim (nombre), tone (0..1 teinte de pierre) }
function pa_house(b, x, yb, w, o) {
  const M = o.M, det = o.det, side = o.side ?? 1, rnd = rng(o.seed ?? 1), nfl = o.nfl, fh = o.fh, ww = o.ww, wh = o.wh, wp = o.wp, roofH = o.roofH, litP = o.litP ?? M.litWin;
  const st = rnd() < (o.tone ?? 0.4) ? M.stoneB : M.stone, zc = o.zinc === 'slate' ? M.slate : M.zinc, out = { chims: [], top: 0 };
  const gh = o.shop ? Math.round(fh * 1.3) : 0, yFac = yb - gh - nfl * fh, yCor = yFac - (det >= 2 ? 3 : 2), yRoof = yCor - roofH;
  out.top = yRoof;
  // mur
  b.R(x, yFac, w, yb - yFac, st[2]);
  const sh = Math.min(w >> 1, det >= 2 ? 9 : 4);
  for (let i = 0; i < sh; i++) { const d = 0.85 * (1 - i / sh); if (side > 0) { b.dith(x + i, yFac, 1, yb - yFac, st[1], d); } else b.dith(x + w - 1 - i, yFac, 1, yb - yFac, st[1], d); }
  for (let i = 0; i < Math.min(5, w >> 2); i++) { const d = 0.6 * (1 - i / 5); if (side > 0) b.dith(x + w - 1 - i, yFac, 1, yb - yFac, st[3], d); else b.dith(x + i, yFac, 1, yb - yFac, st[3], d); }
  if (side > 0) b.R(x + w - 1, yFac, 1, yb - yFac, st[4]); else b.R(x, yFac, 1, yb - yFac, st[4]);
  // fenêtres, balcons, bandeaux
  const nc = Math.max(1, Math.floor(w / wp)), sp = w / nc;
  for (let f = 0; f < nfl; f++) {
    const ytop = yb - gh - (f + 1) * fh, wy = ytop + Math.round((fh - wh) * 0.55);
    for (let k = 0; k < nc; k++) {
      const wx = Math.round(x + sp * (k + 0.5) - ww / 2);
      pa_window(b, wx, wy, ww, wh, M, { st, det, lit: rnd() < litP, rnd, side, shut: det >= 1 && sp > ww * 2.6 && rnd() < (o.shut ?? 0.35) });
    }
    if (o.balc && o.balc.includes(f)) pa_balcony(b, x, wy + wh + 1, w, M, st, det);
    else if (det >= 1 && f > 0) { b.R(x, ytop + fh - 1, w, 1, st[3]); b.dith(x, ytop + fh, w, 1, st[0], 0.4); }
  }
  if (o.shop) {                                                                              // rez-de-chaussée : soubassement en bossage, devantures sombres
    const yg = yb - gh; b.R(x, yg, w, gh, st[1]); b.R(x, yg, w, 1, st[3]);
    const nsh = Math.max(1, Math.floor(w / (wp * 1.6))), ss = w / nsh;
    for (let k = 0; k < nsh; k++) { const sx = Math.round(x + ss * k + 2), sw = Math.round(ss - 4); b.R(sx, yg + 3, sw, gh - 3, M.glass[0]); b.R(sx, yg + 3, sw, 2, [M.stone[1], M.stone[3]][k & 1]); b.R(sx + sw - 2, yg + 5, 1, gh - 6, M.glass[1]); }
  }
  if (o.bare) { out.top = yFac; return out; }
  // corniche
  b.R(x - 1, yCor, w + 2, det >= 2 ? 2 : 1, st[3]); b.R(x - 1, yCor, w + 2, 1, st[4]);
  if (det >= 2) { b.R(x - 1, yCor + 2, w + 2, 1, st[1]); }
  b.dith(x, yFac, w, 2, st[0], 0.75);
  // toit
  const sl = Math.round(roofH * (det >= 2 ? 0.34 : 0.4)), topW = w - 2 * sl;
  b.poly([[x, yCor], [x + sl, yRoof], [x + w - sl, yRoof], [x + w, yCor]], zc[2]);
  // couleur : plus clair vers la lumière
  for (let j = 0; j < roofH; j++) {
    const yy = yCor - 1 - j, f = j / roofH, l0 = x + sl * f, r0 = x + w - sl * f;
    for (let xx = Math.ceil(l0); xx < r0; xx++) {
      const u = (xx - x) / w, lightK = side > 0 ? u : 1 - u; let c = 2 + (lightK > 0.72 ? 1 : 0) + (lightK > 0.9 ? 1 : 0) - (lightK < 0.18 ? 1 : 0);
      if (det >= 1 && ((xx + (o.seed | 0)) % (det >= 2 ? 4 : 3)) === 0) c += 1;                         // joints debout du zinc
      c = Math.max(0, Math.min(4, c));
      if (pa_bay(xx, yy) < 0.2 && det >= 1) c = Math.max(0, c - 1);
      b.px(xx, yy, zc[c]);
    }
  }
  b.line(x + sl, yRoof, x + w - sl, yRoof, side > 0 ? zc[4] : zc[3], 1);
  b.line(side > 0 ? x + w - sl : x + sl, yRoof, side > 0 ? x + w : x, yCor, M.rim, 1);                   // arête éclairée de la croupe
  b.line(side > 0 ? x : x + w, yCor, side > 0 ? x + sl : x + w - sl, yRoof, zc[0], 1);
  b.R(x - 1, yCor - 1, w + 2, 1, zc[1]);                                                       // égout
  if (det >= 1) b.R(x + sl, yRoof - 1, w - 2 * sl, 1, zc[4]);                                    // crête
  // lucarnes
  if (roofH >= 7 && det >= 1) {
    const ndm = Math.max(1, Math.floor(topW / (wp * 1.15))), ds = topW / ndm, dw = Math.max(2, Math.round(ww * 0.9)), dh = Math.max(4, Math.round(roofH * 0.62));
    for (let k = 0; k < ndm; k++) pa_dormer(b, Math.round(x + sl + ds * (k + 0.5)), yCor - 2, dw, dh, M, st, zc, rnd, rnd() < litP, side, det);
  }
  // cheminées
  const nch = o.chim ?? (rnd() < 0.8 ? 1 + (rnd() < 0.5 ? 1 : 0) : 0), cw = Math.max(4, Math.round(ww * (det >= 2 ? 1.7 : 1.9))), chh = Math.max(4, Math.round(roofH * 0.6));
  for (let k = 0; k < nch; k++) {
    const cx = Math.round(x + sl + (topW - cw) * (0.12 + 0.76 * (nch === 1 ? rnd() : (k + 0.2 + rnd() * 0.5) / nch)) + cw / 2);
    const pots = pa_chimney(b, cx, yRoof + 2, cw, chh, M, rnd, side, det, rnd() < 0.55);
    for (const p of pots) out.chims.push(p);
    if (det >= 1) b.dith(cx - (side > 0 ? cw + 2 : -1), yRoof + 1, cw + 2, 2, zc[0], 0.8);       // ombre portée de la cheminée sur le toit
    out.top = Math.min(out.top, yRoof + 2 - chh - 8);
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 5. PAYSAGE DE TOITS : trois bandes périodiques (lointain brumeux avec monuments, plan moyen, premier plan) + fumées de cheminées vivantes
// ════════════════════════════════════════════════════════════════════════════════════════
const PA_LAY = {                                    // H hauteur de la bande, dy = bas de la bande sous o.y, cor = ligne de corniche (dans la bande), wr largeurs, nfl non utilisé
  far: { P: 540, H: 100, par: 0.10, dy: 44, det: 0, wr: [20, 40], cor: [36, 58], fh: 6, ww: 2, wh: 3, wp: 5, roofH: 8, hz: [0.5, 0.66] },
  mid: { P: 540, H: 150, par: 0.28, dy: 126, det: 1, wr: [40, 78], cor: [34, 76], fh: 11, ww: 4, wh: 7, wp: 8.5, roofH: 14, hz: [0.04, 0.2] },
  near: { P: 540, H: 130, par: 0.62, dy: 158, det: 2, wr: [90, 140], cor: [40, 70], fh: 16, ww: 6, wh: 11, wp: 13, roofH: 21, hz: [0, 0.03] },
};
// monuments lointains (silhouettes) : Invalides (dôme doré), Sacré-Cœur, Panthéon, Notre-Dame
function pa_landmark(b, kind, cx, yb, M, side) {
  const g = [AM[5], AM[7], AM[8], AM[9], AM[10]], st = M.stoneB;
  if (kind === 'invalides') {
    b.R(cx - 24, yb - 14, 48, 14, st[2]); b.R(cx - 24, yb - 14, 48, 2, st[3]); for (let q = -22; q < 22; q += 4) b.R(cx + q, yb - 11, 2, 7, st[1]);
    b.R(cx - 11, yb - 25, 22, 11, st[2]); b.R(cx + 8, yb - 25, 3, 11, st[3]); b.R(cx - 11, yb - 25, 3, 11, st[1]); for (let q = -8; q < 9; q += 5) b.R(cx + q, yb - 22, 2, 5, M.glass[0]);
    for (let y = 0; y < 17; y++) { const hw = Math.round(12 * Math.sqrt(Math.max(0, 1 - (y / 17) ** 2) )); for (let x = -hw; x <= hw; x++) { const k = x / 12; const c = k > 0.45 ? g[3] : k > 0 ? g[2] : k > -0.5 ? g[1] : g[0]; b.px(cx + x, yb - 25 - y, c); } }
    for (let q = -9; q <= 9; q += 3) { const hh = Math.round(16 * Math.sqrt(Math.max(0, 1 - (q / 12) ** 2))); b.line(cx + q, yb - 25, cx + q * 0.55, yb - 25 - hh, g[0], 1); }
    b.R(cx - 2, yb - 47, 5, 7, g[2]); b.R(cx + 1, yb - 47, 2, 7, g[3]); b.R(cx - 1, yb - 52, 3, 5, g[1]); b.line(cx, yb - 52, cx, yb - 62, g[3], 1); b.px(cx, yb - 56, g[4]);
  } else if (kind === 'sacrecoeur') {
    const W = [NE[3], NE[4], WH[2], NE[2], ST[7]];
    b.ell(cx, yb + 2, 40, 12, M.stoneB[1]);
    b.R(cx - 20, yb - 12, 40, 12, W[3]); b.R(cx + 14, yb - 12, 6, 12, W[1]);
    for (const [dx, r, hh] of [[-14, 5, 10], [14, 5, 10], [0, 9, 20]]) { b.R(cx + dx - r, yb - 12 - Math.round(hh * 0.45), r * 2 + 1, Math.round(hh * 0.45), W[3]); for (let y = 0; y < hh; y++) { const hw = Math.round(r * Math.sqrt(Math.max(0, 1 - (y / hh) ** 1.6))); for (let x = -hw; x <= hw; x++) b.px(cx + dx + x, yb - 12 - Math.round(hh * 0.45) - y, x > hw * 0.35 ? W[1] : x > -hw * 0.3 ? W[2] : W[3]); } b.line(cx + dx, yb - 12 - Math.round(hh * 0.45) - hh, cx + dx, yb - 12 - Math.round(hh * 0.45) - hh - 4, W[4], 1); }
    b.R(cx + 22, yb - 28, 9, 28, W[3]); b.R(cx + 28, yb - 28, 3, 28, W[1]); b.poly([[cx + 21, yb - 28], [cx + 26, yb - 38], [cx + 32, yb - 28]], W[2]);
  } else if (kind === 'pantheon') {
    b.R(cx - 18, yb - 12, 36, 12, st[2]); for (let q = -16; q <= 14; q += 4) b.R(cx + q, yb - 11, 2, 11, st[3]); b.poly([[cx - 20, yb - 12], [cx, yb - 19], [cx + 20, yb - 12]], st[3]);
    b.R(cx - 10, yb - 28, 20, 9, st[2]); b.R(cx + 6, yb - 28, 4, 9, st[3]); b.R(cx - 10, yb - 28, 4, 9, st[1]);
    for (let y = 0; y < 14; y++) { const hw = Math.round(10 * Math.sqrt(Math.max(0, 1 - (y / 14) ** 2))); for (let x = -hw; x <= hw; x++) b.px(cx + x, yb - 28 - y, x > 3 ? st[3] : x > -4 ? st[2] : st[1]); }
    b.R(cx - 2, yb - 49, 5, 7, st[2]); b.line(cx, yb - 50, cx, yb - 56, st[3], 1);
  } else if (kind === 'notredame') {
    const S = [ST[4], ST[5], WH[0], WH[1], SK[3]];
    b.R(cx - 21, yb - 30, 42, 30, S[2]); b.R(cx - 21, yb - 30, 6, 30, S[1]); b.R(cx + 14, yb - 30, 7, 30, S[3]);
    for (const dx of [-14, 14]) { b.R(cx + dx - 8, yb - 36, 16, 6, S[2]); for (let q = -6; q <= 4; q += 4) b.R(cx + dx + q, yb - 34, 2, 6, M.glass[0]); }
    b.R(cx - 5, yb - 33, 10, 33, S[1]); for (let q = -20; q <= 16; q += 4) b.R(cx + q, yb - 28, 2, 4, S[0]); b.R(cx - 21, yb - 12, 42, 1, S[1]);
    b.poly([[cx - 3, yb - 30], [cx, yb - 56], [cx + 3, yb - 30]], S[1]); b.line(cx, yb - 56, cx, yb - 60, S[3], 1);
  }
}
function pa_buildLayer(env, kind, side) {
  const D = PA_LAY[kind], P = D.P, H = D.H, M = pa_mat({ env }), b = new PaBuf(P, H), rnd = rng(kind === 'far' ? 11 : kind === 'mid' ? 23 : 37), chims = [];
  if (kind === 'far') {
    const lm = [['invalides', 96, 6], ['sacrecoeur', 232, 8], ['pantheon', 368, 4], ['notredame', 478, 4]];
    for (const [k, cx, dy] of lm) pa_landmark(b, k, cx, H - dy - 6, M, side);
  }
  let x = 0, i = 0;
  while (x < P - 4) {
    let w = Math.round(lerp(D.wr[0], D.wr[1], rnd())); if (P - x - w < D.wr[0] * 0.8) w = P - x;
    const yCor = Math.round(lerp(D.cor[0], D.cor[1], rnd())), gap = D.det >= 1 && rnd() < 0.12;
    const nfl = Math.ceil((H - yCor - D.roofH) / D.fh), yb = yCor + D.roofH + nfl * D.fh + (D.det >= 2 ? 3 : 2), bal = [];
    for (let f = 1; f < nfl; f += 2) bal.push(f);
    const r = pa_house(b, x, yb, w, { M, det: D.det, nfl, fh: D.fh, ww: D.ww, wh: D.wh, wp: D.wp, roofH: D.roofH + Math.floor(rnd() * 3) - 1, seed: 100 + i * 7 + kind.length, balc: kind === 'far' ? [] : bal, side, zinc: rnd() < 0.15 ? 'slate' : 'zinc', chim: kind === 'far' ? (rnd() < 0.5 ? 1 : 0) : undefined, tone: 0.45 });
    for (const c of r.chims) chims.push([c[0], c[1], i]);
    x += w; i++;
  }
  const mist = pa_u32(kind === 'far' ? M.mistFar : M.mist);
  b.haze(mist, D.hz[0], D.hz[1], 0, H);
  return { cv: b.done(), chims };
}
// pa_toits(t, o) : voir l'en-tête
function pa_toits(t, o = {}) {
  const env = o.env || 'matin', E = pa_env(o), light = o.light ?? E.light, side = light < 0 ? -1 : 1, y = o.y ?? 330, cam = pa_fin(o.cam), camY = pa_fin(o.camY);
  const layers = o.layers || ['far', 'mid', 'near'], smoke = o.smoke ?? 1, info = {};
  L.setTransform(1, 0, 0, 1, 0, 0);
  for (const kind of layers) {
    const D = PA_LAY[kind], lay = pa_cache(`toits|${env}|${kind}|${side}`, () => pa_buildLayer(env, kind, side)), P = D.P;
    const off = ((cam * D.par) % P + P) % P, ty = Math.round(y + (o['d' + kind] ?? D.dy) - D.H - camY * D.par * 0.5);
    for (let x0 = -Math.round(off); x0 < LW; x0 += P) L.drawImage(lay.cv, x0, ty);
    info[kind] = { y: ty, bottom: ty + D.H };
    if (smoke > 0 && kind !== 'far') {
      for (const c of lay.chims) {
        if (pa_h(c[2] * 13 + 5, 21) > 0.45 * smoke) continue;
        let sx = c[0] - Math.round(off); while (sx < -30) sx += P; if (sx > LW + 30) continue;
        pa_vapeur(sx, ty + c[1], t, { env, kind: 'fumee', n: 10, h: kind === 'mid' ? 30 : 48, w: kind === 'mid' ? 1 : 2, w2: kind === 'mid' ? 5 : 9, wind: kind === 'mid' ? 9 : 16, rate: 0.28 + pa_h(c[2], 3) * 0.12, seed: c[2] + 3, a: 0.9 });
      }
    }
  }
  return info;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 6. LE JOURNAL (page de presse en texte pixel) ET L'ICÔNE ICONES[0]
// ════════════════════════════════════════════════════════════════════════════════════════
function pa_wrap(str, maxW, sc) {                                      // coupe aux espaces ; renvoie les lignes
  const words = String(str).split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (textW(t, sc) <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } }
  if (cur) lines.push(cur); return lines;
}
// photo sépia de la tour dans un cadre pw × ph (tampon b, coin x, y)
function pa_photoTour(b, x, y, pw, ph, seed, what) {
  b.R(x, y, pw, ph, WH[0]); b.R(x + 1, y + 1, pw - 2, ph - 2, SK[4]);
  for (let j = 0; j < ph - 2; j++) { const f = j / (ph - 2); for (let i = 0; i < pw - 2; i++) if (pa_bay(x + i, y + j) < 0.55 * (f * 0.8 + 0.1) + 0.12) b.px(x + 1 + i, y + 1 + j, SK[3]); }
  const bx = x + pw / 2, by = y + ph - 5, k = (ph - 8) / 310;
  if (what === 'tour' || what === undefined) {
    for (let Y = 0; Y < 305; Y += 1 / Math.max(1, k * 1.5)) {
      const hw = Math.max(0.5, pa_tOut(Y) * k * 0.85 * (pw / ph) * 0.9 + 0.3), yy = by - Y * k;
      for (let i = -hw; i <= hw; i += 0.5) { const keep = Math.abs(i) > hw * 0.55 || Y > 112 && Y < 280 && pa_bay(Math.round(bx + i), Math.round(yy)) < 0.8 || Y < 58 || (Y > 55 && Y < 64) || (Y > 112 && Y < 120); if (keep) b.px(bx + i, yy, WO[1]); }
    }
    b.R(bx - 14 * k * 2.2, by - 1.4, 28 * k * 2.2, 2, WO[2]);
    b.R(x + 1, by + 1, pw - 2, 4, WO[1]); b.dith(x + 1, by + 1, pw - 2, 4, WO[3], 0.45);                     // toits au premier plan
    for (let i = 0; i < pw - 4; i += 5) b.R(x + 2 + i, by - 1 - (pa_h(i + seed, 5) * 3 | 0), 4, 3, WO[2]);
  } else if (what === 'peintres') {
    for (let q = 0; q < 6; q++) b.line(x + 4 + q * pw * 0.14, y + ph - 4, x + pw * 0.5 + (q - 2.5) * 3, y + 3, WO[1], 1);
    b.R(x + pw * 0.3, y + ph * 0.45, pw * 0.4, 2, WO[1]); b.R(x + pw * 0.46, y + ph * 0.45 - 6, 2, 6, WO[1]);
  }
  b.R(x, y, pw, 1, WO[1]); b.R(x, y + ph - 1, pw, 1, WO[1]); b.R(x, y, 1, ph, WO[1]); b.R(x + pw - 1, y, 1, ph, WO[1]);
}
// texte « grisé » : lignes d'un pixel, paragraphes, lettrines
function pa_greek(b, x, y, cw, ch, ink, seed, pitch = 3) {
  let yy = y, i = 0;
  while (yy < y + ch - 1) {
    const r = pa_h(i + seed * 31, 3);
    if (i > 0 && (i % (5 + Math.floor(pa_h(i, seed) * 5)) === 0)) { yy += pitch; i++; continue; }
    let len = cw; if (pa_h(i, seed + 9) > 0.78) len = Math.round(cw * (0.35 + 0.5 * r));
    b.R(x, yy, len, 1, ink); if (pa_h(i, seed + 4) > 0.7) b.R(x + Math.round(len * (0.3 + r * 0.4)), yy, 1, 1, WH[1]);
    yy += pitch; i++;
  }
}
function pa_journalFlat(w, h, o) {
  const b = new PaBuf(w, h), M = [WH[1], WH[2], WH[0], ST[2], ST[1], ST[4], NI[1]], paper = WH[2], ink = NI[1], gray = ST[3];
  b.R(0, 0, w, h, paper);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const u = i / w; if (pa_bay(i, j) < 0.22 * (1 - u) * (1 - u) * 2) b.px(i, j, WH[0]); }    // grain d'ombre à gauche
  const m = 5; let y = 4;
  const back = o.side === 'back';
  if (!back) {
    // titre du journal
    const nom = o.nom || 'LE MATIN', sc0 = textW(nom, 2) <= w - 2 * m - 4 ? 2 : 1;
    b.text(nom, Math.round((w - textW(nom, sc0)) / 2), y, ink, sc0); y += 7 * sc0 + 2;
    b.R(m, y, w - 2 * m, 1, ink); b.R(m, y + 2, w - 2 * m, 1, ink); y += 4;
    const dt = o.date || 'PARIS · 1925'; b.text(dt, Math.round((w - textW(dt, 1)) / 2), y, gray, 1); y += 9;
    b.R(m, y - 1, w - 2 * m, 1, ST[5]); y += 2;
    // gros titre
    const titre = o.titre || 'LA TOUR EIFFEL COÛTE TROP CHER';
    let sc = 3, lines = pa_wrap(titre, w - 2 * m, sc);
    while ((lines.length > 3 || lines.some(l => textW(l, sc) > w - 2 * m)) && sc > 1) { sc--; lines = pa_wrap(titre, w - 2 * m, sc); }
    for (const l of lines) { const acc = /[ÉÈÊËÀÂÔÎÏÙÛÇ]/.test(l); if (acc) y += 2 * sc; b.text(l, Math.round((w - textW(l, sc)) / 2), y, ink, sc); y += 7 * sc + 2 * sc; }
    y += 1;
    const sous = o.sous ?? 'L\'ENTRETIEN DU MONUMENT EMBARRASSE L\'ÉTAT';
    if (sous) { const sl = pa_wrap(sous, w - 2 * m, 1); for (const l of sl.slice(0, 2)) { b.text(l, Math.round((w - textW(l, 1)) / 2), y, gray, 1); y += 9; } }
    b.R(m, y, w - 2 * m, 1, ST[5]); y += 3;
    // photo + colonnes
    const bottom = h - 5;
    const photo = o.photo === undefined ? 'tour' : o.photo;
    if (photo && bottom - y > 50) {
      const pw = Math.round((w - 2 * m) * 0.55), ph = Math.min(Math.round((bottom - y) * 0.62), Math.round(pw * 0.95));
      pa_photoTour(b, m, y, pw, ph, 3, photo);
      const cx = m + pw + 4, cw2 = w - m - cx;
      pa_greek(b, cx, y, cw2, ph, gray, 5);
      b.R(m, y + ph + 1, pw, 1, ST[5]); pa_greek(b, m, y + ph + 3, pw, 5, ST[4], 7);
      y += ph + 11;
    }
    const nc = w > 110 ? 3 : 2, g = 3, cw = Math.floor((w - 2 * m - g * (nc - 1)) / nc);
    for (let c = 0; c < nc; c++) { const cx = m + c * (cw + g); pa_greek(b, cx, y, cw, bottom - y, gray, 11 + c); if (c) b.R(cx - 2, y, 1, bottom - y, ST[7]); }
  } else {
    b.text(o.nomBack || 'ANNONCES', Math.round((w - textW(o.nomBack || 'ANNONCES', 1)) / 2), y, ink, 1); y += 9; b.R(m, y, w - 2 * m, 1, ink); y += 3;
    let yy = y; const bottom = h - 5, gw = Math.floor((w - 2 * m - 4) / 2);
    for (let c = 0; c < 2; c++) {
      yy = y;
      while (yy < bottom - 12) {
        const bh = 14 + Math.floor(pa_h(yy + c * 50, 3) * 26), kind = Math.floor(pa_h(yy, c + 7) * 3), x0 = m + c * (gw + 4);
        if (yy + bh > bottom) break;
        b.R(x0, yy, gw, bh, kind === 1 ? ST[2] : paper); b.R(x0, yy, gw, 1, ink); b.R(x0, yy + bh - 1, gw, 1, ink); b.R(x0, yy, 1, bh, ink); b.R(x0 + gw - 1, yy, 1, bh, ink);
        if (kind === 1) { b.text('!', x0 + 3, yy + 3, WH[3], 1); pa_greek(b, x0 + 8, yy + 3, gw - 12, bh - 5, WH[0], 40 + yy); }
        else if (kind === 2) { b.dith(x0 + 2, yy + 2, gw - 4, 8, ST[3], 0.5); pa_greek(b, x0 + 3, yy + 12, gw - 6, bh - 14, gray, 60 + yy); }
        else pa_greek(b, x0 + 3, yy + 3, gw - 6, bh - 5, gray, 80 + yy);
        yy += bh + 3;
      }
    }
  }
  // bords : contour fin et pli
  b.R(0, 0, w, 1, WH[0]); b.R(0, h - 1, w, 1, ST[6]); b.R(0, 0, 1, h, WH[0]); b.R(w - 1, 0, 1, h, ST[6]);
  if (o.pages === 2) { b.R(Math.floor(w / 2), 0, 1, h, ST[6]); b.dith(Math.floor(w / 2) + 1, 0, 3, h, WH[0], 0.6); b.dith(Math.floor(w / 2) - 3, 0, 3, h, WH[0], 0.3); }
  return b.done();
}
// pa_journal(x, y, w, h, t, o) : voir l'en-tête
function pa_journal(x, y, w, h, t, o = {}) {
  w = Math.round(w); h = Math.round(h);
  const key = `jr|${w}|${h}|${o.titre || ''}|${o.nom || ''}|${o.sous ?? ''}|${o.photo === undefined ? 'tour' : o.photo}|${o.side || ''}|${o.date || ''}|${o.pages || 1}`;
  const cv = pa_cache(key, () => pa_journalFlat(w, h, o));
  const held = o.held ?? false, curl = o.curl ?? (held ? 0.6 : 0.12), tilt = o.tilt || 0, flap = o.flap ?? (held ? 0.5 : 0), sway = held ? Math.sin(t * 1.7) * 0.35 + Math.sin(t * 3.3) * 0.15 : 0;
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (o.shadow ?? !held) { L.save(); L.globalAlpha = 0.35; ell(x + w / 2 + 3, y + h + 1 + Math.abs(tilt) * w * 0.3, Math.round(w * 0.46), 3, NI[0]); L.restore(); }
  for (let sx = 0; sx < w; sx++) {
    const u = sx / Math.max(1, w - 1), bow = -curl * 5 * (1 - (2 * u - 1) ** 2) * (held ? 1 : 0.5) + curl * 2.2 * (2 * u - 1) ** 2, fl = flap * Math.sin(t * 8.5 + u * 2) * Math.pow(u, 3) * 2.4 + (u > 0.5 ? 0 : flap * Math.sin(t * 7 + 1) * Math.pow(1 - u, 4) * 0.8);
    const dy = Math.round(bow + tilt * (sx - w / 2) + fl + sway * (u - 0.5) * 2);
    L.drawImage(cv, sx, 0, 1, h, Math.round(x + sx), Math.round(y + dy), 1, h);
  }
  const mid = y + h * 0.5;
  return { x, y, w, h, gripL: [x + 2, mid], gripR: [x + w - 3, mid], top: y, bottom: y + h, cx: x + w / 2 };
}
ICONES[0] = function (cx, cy) {                                       // petit journal plié avec son titre (17 × 17, couleurs exactes)
  const x0 = cx - 8, y0 = cy - 8, K = '#05040f', P_ = WH[2], I = ST[1];
  R(x0, y0, 17, 17, K); R(x0 + 1, y0 + 1, 15, 15, P_);
  R(x0 + 1, y0 + 1, 15, 4, I); for (const q of [3, 5, 6, 8, 10, 11, 13]) px(x0 + q, y0 + 2, WH[3]); for (const q of [4, 6, 9, 12]) px(x0 + q, y0 + 3, ST[6]);
  R(x0 + 2, y0 + 6, 13, 1, ST[5]);
  R(x0 + 2, y0 + 7, 13, 2, K); R(x0 + 2, y0 + 10, 9, 1, K); px(x0 + 11, y0 + 10, ST[3]);
  R(x0 + 2, y0 + 12, 5, 3, SK[3]); R(x0 + 2, y0 + 12, 5, 1, SK[4]); px(x0 + 4, y0 + 12, WO[1]); R(x0 + 4, y0 + 13, 1, 2, WO[1]); px(x0 + 3, y0 + 14, WO[1]); px(x0 + 5, y0 + 14, WO[1]);
  for (const j of [12, 14]) R(x0 + 8, y0 + j, 6, 1, ST[3]); px(x0 + 8, y0 + 13, ST[5]); R(x0 + 10, y0 + 13, 4, 1, ST[5]);
  px(x0 + 14, y0 + 14, ST[6]); R(x0 + 13, y0 + 15, 3, 1, ST[4]);    // coin plié
};

// ════════════════════════════════════════════════════════════════════════════════════════
// 7. PETITS VIVANTS : passants minuscules, pigeons
// ════════════════════════════════════════════════════════════════════════════════════════
// pa_passant(x, y, s, t, o) : silhouette de passant de profil, (x, y) = pieds au sol ; s = 1 → ≈ 30 px de haut. o : dir ±1, speed px/s (0 = à l'arrêt, souffle), seed (allure : manteau, chapeau, baguette, parapluie…),
// env, light, shadow (ombre au sol, 0..1), w (true = femme), hat 'melon'|'canotier'|'casquette'|'beret'|'cloche'|'none', ph (phase de marche). Renvoie { x, y, h, top }.
const PA_COATS = [[WO[1], WO[3], WO[4]], [ST[1], ST[3], ST[5]], [GR[1], GR[2], GR[4]], [RD[1], RD[2], RD[4]], [NI[2], NI[4], NI[7]], [SK[1], SK[2], SK[4]], [ST[3], ST[5], ST[7]], [DU[1], DU[3], DU[6]]];
function pa_buildPerson(seed, dir, light, env, s, k) {
  const night = env === 'crepuscule', woman = pa_h(seed, 3) < 0.35, cc = PA_COATS[Math.floor(pa_h(seed, 2) * PA_COATS.length)];
  const hats = woman ? ['cloche', 'cloche', 'beret', 'none'] : ['melon', 'melon', 'canotier', 'casquette', 'beret', 'none'], hat = hats[Math.floor(pa_h(seed, 4) * hats.length)], acc = Math.floor(pa_h(seed, 5) * 5);
  const W = Math.ceil(26 * s) + 4, H = Math.ceil(36 * s) + 3, b = new PaBuf(W, H), ox = W >> 1, oy = H - 2;
  const X = v => ox + dir * v * s, Yp = v => oy - v * s, Th = Math.max(1, Math.round(2 * s));
  const skin = night ? SK[1] : SK[3], trousers = night ? NI[2] : (pa_h(seed, 6) < 0.5 ? ST[2] : WO[2]), c0 = night ? NI[Math.min(4, 1 + (cc[0] === RD[1] ? 1 : 0))] : cc[0], c1 = night ? DU[1] : cc[1], c2 = night ? DU[2] : cc[2];
  const sw = k < 0 ? 0 : Math.sin(k / 8 * TAU) * 3.4, bob = k < 0 ? (k === -2 ? 0.5 : 0) : Math.abs(Math.sin(k / 8 * TAU)) * 0.8;
  // jambes (celle de derrière plus sombre)
  for (const sg of [-1, 1]) {
    const f = sw * sg, lift = k < 0 ? 0 : Math.max(0, Math.sin(k / 8 * TAU + (sg > 0 ? 0 : Math.PI))) * 2.4, col = sg > 0 ? trousers : (night ? NI[1] : ST[1]);
    b.line(X(0), Yp(13.5 + bob), X(f * 0.45 + (sg > 0 ? 0.4 : 0)), Yp(7 + lift * 0.6), col, Th); b.line(X(f * 0.45), Yp(7 + lift * 0.6), X(f), Yp(1.2 + lift), col, Th);
    b.R(Math.min(X(f), X(f + 2.6)), Yp(1.2 + lift), Math.max(2, Math.round(2.6 * s)), Math.max(1, Math.round(1.4 * s)), NI[0]);
  }
  // manteau / robe
  const top = 24.4 + bob, hem = woman ? 8.5 : 11.2, hw0 = 3.4, hw1 = woman ? 5.2 : 4.3;
  b.poly([[X(-hw0), Yp(top)], [X(hw0), Yp(top)], [X(hw1), Yp(hem)], [X(-hw1), Yp(hem)]], c0);
  if (light > 0 === dir > 0) { b.poly([[X(hw0 * 0.35), Yp(top)], [X(hw0), Yp(top)], [X(hw1), Yp(hem)], [X(hw1 * 0.5), Yp(hem)]], c1); }
  else b.poly([[X(-hw0), Yp(top)], [X(-hw0 * 0.35), Yp(top)], [X(-hw1 * 0.5), Yp(hem)], [X(-hw1), Yp(hem)]], c1);
  b.R(Math.min(X(-hw0), X(hw0)), Yp(woman ? 17.2 : 18.2), Math.round(hw0 * 2 * s), 1, c2);                              // ceinture
  b.R(Math.min(X(-hw1), X(hw1)), Yp(hem), Math.round(hw1 * 2 * s), 1, c2);                                             // ourlet
  // bras et accessoires
  const arm = -sw * 0.7, hx = arm, hy = 14.5 + bob;
  b.line(X(0), Yp(top - 1), X(hx), Yp(hy), c0, Th); px_(b, X(hx), Yp(hy - 0.4), skin, s);
  if (acc === 0) { b.line(X(hx), Yp(hy), X(hx + 4), Yp(hy + 5.5), night ? AM[3] : AM[5], Th); b.px(X(hx + 4), Yp(hy + 5.5), night ? AM[4] : AM[7]); }
  else if (acc === 1) { b.line(X(hx), Yp(hy), X(hx + 1.5), Yp(hy + 11), NI[0], 1); b.poly([[X(hx - 5), Yp(hy + 10.5)], [X(hx + 7), Yp(hy + 10.5)], [X(hx + 1.5), Yp(hy + 15)]], night ? NI[1] : RD[1]); }
  else if (acc === 2) b.R(Math.min(X(hx), X(hx + 4)), Yp(hy - 4), Math.round(4.4 * s), Math.round(4 * s), WO[2]);
  else if (acc === 3) b.R(Math.min(X(hx), X(hx + 3)), Yp(hy + 1), Math.round(3.6 * s), Math.round(5 * s), WH[1]);
  // tête et chapeau
  b.R(X(0.2), Yp(top + 1.4), Math.max(1, Math.round(1.6 * s)), Math.max(1, Math.round(1.6 * s)), skin);
  b.disc(X(0.5), Yp(top + 3.4), Math.max(2, Math.round(2.4 * s)), skin); b.px(X(2.5), Yp(top + 3.2), skin); b.px(X(1.6), Yp(top + 3.8), NI[0]);
  if (hat === 'melon') { b.R(Math.min(X(-2.6), X(4.4)), Yp(top + 6.3), Math.round(7 * s), 1, NI[0]); b.ell(X(0.8), Yp(top + 7.2), Math.max(2, Math.round(2.6 * s)), Math.max(1, Math.round(1.8 * s)), NI[1]); }
  else if (hat === 'canotier') { b.R(Math.min(X(-3), X(5)), Yp(top + 6.3), Math.round(8 * s), 1, WO[5]); b.R(Math.min(X(-1.6), X(3.2)), Yp(top + 8.6), Math.round(5 * s), Math.round(2.4 * s), SK[4]); b.R(Math.min(X(-1.6), X(3.2)), Yp(top + 7), Math.round(5 * s), 1, RD[2]); }
  else if (hat === 'casquette') { b.R(Math.min(X(-2), X(3.6)), Yp(top + 7), Math.round(5.6 * s), Math.round(2 * s), ST[2]); b.R(Math.min(X(3), X(6)), Yp(top + 5.8), Math.round(3 * s), 1, ST[1]); }
  else if (hat === 'beret') { b.ell(X(0.8), Yp(top + 6.8), Math.max(2, Math.round(3.4 * s)), Math.max(1, Math.round(1.4 * s)), night ? NI[2] : NI[3]); }
  else if (hat === 'cloche') { b.ell(X(0.6), Yp(top + 6), Math.max(2, Math.round(3.3 * s)), Math.max(2, Math.round(2.6 * s)), night ? DU[1] : cc[2]); b.R(Math.min(X(-2.4), X(4)), Yp(top + 4.2), Math.round(6.4 * s), 1, c0); }
  else { b.R(Math.min(X(-1.8), X(2.8)), Yp(top + 5.6), Math.round(4.6 * s), Math.max(1, Math.round(1.6 * s)), WO[1]); }
  b.outline(NI[0]);
  return { cv: b.done(), ox, oy, w: W, h: H };
}
function px_(b, x, y, c, s) { b.R(x, y, Math.max(1, Math.round(s)), Math.max(1, Math.round(s)), c); }
// pa_passant(x, y, s, t, o) : passant de profil, (x, y) = pieds au sol ; s = 1 → ≈ 30 px de haut (à garder entre 0,5 et 1,6) ; o : dir ±1, speed px/s (0 = à l'arrêt : il respire), seed (allure : manteau, chapeau, baguette, parapluie, serviette, journal),
// env, light (+1 : soleil à droite), shadow (ombre portée au sol, 0..1). Renvoie { x, y, h, top }.
function pa_passant(x, y, s, t, o = {}) {
  const seed = o.seed ?? 1, dir = (o.dir ?? 1) < 0 ? -1 : 1, env = o.env || 'matin', speed = o.speed ?? 14, light = (o.light ?? 1) < 0 ? -1 : 1, sq = Math.round(s * 4) / 4;
  const k = speed ? Math.floor(((t * speed / (13 * sq) + pa_h(seed, 8)) % 1 + 1) % 1 * 8) % 8 : (Math.floor(t * 0.7 + seed) % 2 ? -2 : -1);
  const sp = pa_cache(`pers|${seed}|${dir}|${light}|${env}|${sq}|${k}`, () => pa_buildPerson(seed, dir, light, env, sq, k));
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (o.shadow ?? 1) { L.save(); L.globalAlpha = 0.34 * (o.shadow ?? 1); ell(x - light * 11 * sq, y, Math.round(14 * sq), Math.max(1, Math.round(1.5 * sq)), env === 'crepuscule' ? NI[0] : DU[1]); L.restore(); }
  L.drawImage(sp.cv, Math.round(x) - sp.ox, Math.round(y) - sp.oy - 1);
  return { x, y, h: 31 * sq, top: y - 31 * sq };
}
// pa_pigeon(x, y, s, t, o) : pigeon biset ; mode 'auto' (marche et picore), 'walk', 'peck', 'sit', 'fly' (battement d'ailes) ; (x, y) = pattes au sol ; s = 1 → ≈ 9 px de long ; o : dir ±1, seed, env, light
function pa_pigeon(x, y, s, t, o = {}) {
  const seed = o.seed ?? 1, dir = o.dir ?? 1, env = o.env || 'matin', night = env === 'crepuscule', ph = t * (2.2 + pa_h(seed, 1) * 1.4) + seed * 3;
  let mode = o.mode || 'auto'; if (mode === 'auto') { const c = ((t * 0.22 + pa_h(seed, 2)) % 1); mode = c < 0.5 ? 'walk' : c < 0.85 ? 'peck' : 'sit'; }
  const sx = v => x + dir * v * s, ry = v => y - v * s, body = night ? [NI[2], NI[3], NI[4]] : [ST[4], ST[5], ST[6]], neck = night ? DU[2] : (pa_h(seed, 3) < 0.5 ? GR[3] : DU[5]);
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (mode === 'fly') {
    const w = Math.sin(ph * 3.2), by = y;
    ell(sx(0), by, Math.round(3.6 * s), Math.round(1.8 * s), body[1]);
    lineP(sx(-1), by - 1, sx(-3), by - 5 * s * (0.4 + 0.6 * w), body[0], 1); lineP(sx(-3), by - 5 * s * (0.4 + 0.6 * w), sx(-6), by - 3 * s * (0.4 + 0.6 * w), body[0], 1);
    lineP(sx(1), by - 1, sx(3), by - 5 * s * (0.4 + 0.6 * w), body[2], 1); lineP(sx(3), by - 5 * s * (0.4 + 0.6 * w), sx(6), by - 3 * s * (0.4 + 0.6 * w), body[1], 1);
    px(sx(4), by - 1, body[2]); px(sx(5), by - 1, AM[7]); return;
  }
  const step = mode === 'walk' ? Math.sin(ph * 2) : 0, bob = mode === 'walk' ? Math.abs(Math.sin(ph * 2)) * 0.8 * s : 0, peck = mode === 'peck' ? Math.max(0, Math.sin(ph * 1.6)) : 0, low = mode === 'sit' ? 1.5 * s : 0;
  if (o.shadow ?? 1) { L.save(); L.globalAlpha = 0.3; ell(x - 3 * s, y + 0.5, Math.round(4 * s), 1, DU[1]); L.restore(); }
  if (mode !== 'sit') { lineP(sx(0.5), ry(3 + bob / s), sx(0.5 + step * 1.6), ry(0), RD[4], 1); lineP(sx(-0.5), ry(3 + bob / s), sx(-0.5 - step * 1.6), ry(0), RD[3], 1); }
  ell(sx(0), ry(4.2 + bob / s - low / s), Math.round(3.6 * s), Math.round(2.4 * s), body[1]);
  ell(sx(-0.5), ry(3.4 + bob / s - low / s), Math.round(2.6 * s), Math.round(1.2 * s), body[2]);                // ventre clair
  poly([[sx(-3), ry(4.8 + bob / s)], [sx(-6), ry(2.6 + bob / s)], [sx(-3), ry(3 + bob / s)]], body[0]);        // queue
  ell(sx(-0.2), ry(4.6 + bob / s - low / s), Math.round(2.2 * s), Math.round(1.3 * s), body[0]);               // aile
  const hx = 3.2 + peck * 1.8, hy = 6.4 - peck * 4.2 + bob / s - low / s;
  disc(sx(hx), ry(hy), Math.max(1, Math.round(1.3 * s)), body[1]); px(sx(hx - 0.8), ry(hy - 1), neck); px(sx(hx - 1.4), ry(hy - 2), neck);
  px(sx(hx + 0.6), ry(hy + 0.2), NI[0]); px(sx(hx + 1.6 + (s > 1.4 ? 1 : 0)), ry(hy - 0.2), WO[1]); px(sx(hx + 0.6), ry(hy + 0.2), AM[7]);
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 8. LA TERRASSE DE CAFÉ
// ════════════════════════════════════════════════════════════════════════════════════════
// mobilier (tampon de pixels) : sc = échelle ; (x, yf) = pieds
function pa_chairB(b, x, yf, sc, M, light, facing) {
  const dk = M.wood, seatY = yf - 21 * sc, rw = 8 * sc, rh = 3 * sc;
  for (const [dx, dy, front] of [[-6, -2, 0], [6, -2, 0], [-7, 2.5, 1], [7, 2.5, 1]]) { b.line(x + dx * sc * 0.8, seatY + 1, x + dx * sc, yf + dy * sc, front ? dk[2] : dk[0], 1); }
  b.line(x - 7 * sc, yf + 2.5 * sc, x + 7 * sc, yf + 2.5 * sc, dk[1], 1);                              // entretoise
  b.ell(x, seatY, rw, rh, dk[1]); b.ell(x, seatY - 1, rw - 1, rh - 1, SK[2]);                             // assise cannée
  for (let i = -rw; i <= rw; i += 2) b.px(x + i, seatY - 1 + ((i >> 1) & 1), SK[3]);
  b.ring(x, seatY, rw, rh, dk[2], 1, 0, Math.PI);
  b.ring(x, seatY - 17 * sc, 7 * sc, 10 * sc, dk[1], 2);                                               // dossier en boucle
  b.ring(x + light, seatY - 17 * sc, 7 * sc, 10 * sc, dk[3], 1, light > 0 ? -1.2 : 3.4 - 1.2 + 1.2, light > 0 ? 1.0 : 3.4 + 1.0);
  b.line(x - 5 * sc, seatY - 2, x - 6 * sc, seatY - 10 * sc, dk[1], 1); b.line(x + 5 * sc, seatY - 2, x + 6 * sc, seatY - 10 * sc, dk[1], 1);
}
function pa_tableB(b, x, yf, sc, M, light, o = {}) {
  const topY = yf - 40 * sc, rx = Math.round(22 * sc), ry = Math.max(3, Math.round(6 * sc));
  if (o.shadow !== false) { const sl = Math.round(40 * sc), shc = M.iron === NI[0] && M.litWin > 0.4 ? NI[0] : DU[2]; for (let j = -2; j <= 2; j++) b.dith(x - light * sl - Math.round(rx * 0.6), yf - 3 + j, Math.round(rx * 1.2 + sl * 0.5), 1, shc, 0.55 - Math.abs(j) * 0.12); b.dith(x - light * Math.round(sl * 0.5) - rx, yf - 6, Math.round(rx * 1.8), 3, shc, 0.5); }
  b.line(x, topY + 2, x, yf - 2, M.iron === NI[0] ? NI[1] : M.iron, Math.max(2, Math.round(2 * sc)));                       // pied
  b.line(x, yf - 4 * sc, x - 11 * sc, yf + 1, NI[1], 1); b.line(x, yf - 4 * sc, x + 11 * sc, yf + 1, NI[1], 1); b.line(x, yf - 4 * sc, x, yf + 2 * sc, NI[1], 1); b.ell(x, yf - 4 * sc, 3 * sc, 1.2 * sc, NI[2]);
  b.ell(x, topY + 2, rx + 1, ry + 1, ST[2]);                                                              // tranche
  b.ell(x, topY, rx, ry, WH[1]); b.ell(x - light * 2, topY - 1, rx - 3, ry - 2, WH[2]);
  for (let i = 0; i < 12; i++) b.px(x + Math.round((pa_h(i, 3) - 0.5) * rx * 1.5), topY + Math.round((pa_h(i, 4) - 0.5) * ry), ST[7]);   // veines du marbre
  b.ring(x, topY, rx, ry, light > 0 ? AM[9] : ST[6], 1, light > 0 ? -1.1 : 2.0, light > 0 ? 0.8 : 4.1);
  if (o.items !== false) {
    const cx_ = x - 7 * sc, cy_ = topY - 1;                                                                // tasse sur soucoupe
    b.ell(cx_, cy_ + 1, 5 * sc, 1.6 * sc, WH[3]); b.R(cx_ - 2 * sc, cy_ - 3 * sc, 4 * sc, 3.4 * sc, WH[2]); b.R(cx_ + 2 * sc, cy_ - 2 * sc, 1.4 * sc, 2 * sc, WH[1]); b.ell(cx_, cy_ - 3 * sc, 2 * sc, 0.8 * sc, WO[1]);
    b.R(x + 9 * sc, cy_ - 7 * sc, 3 * sc, 7 * sc, CY[3]); b.R(x + 9 * sc, cy_ - 4 * sc, 3 * sc, 4 * sc, CY[2]); b.px(x + 10 * sc, cy_ - 6 * sc, WH[3]);    // carafe
    b.ell(x + 2 * sc, cy_ + 1, 2 * sc, 1 * sc, WH[3]); b.R(x + 1 * sc, cy_ - 2 * sc, 2 * sc, 2 * sc, YE[1]);                                           // petit verre
  }
}
function pa_planterB(b, x, yf, w, M, light) {                                                              // bac en bois et buis taillé
  const h = Math.round(w * 0.62), rr = Math.round(w * 0.55);
  b.R(x - w / 2, yf - h, w, h, WO[2]); b.R(x - w / 2, yf - h, w, 3, WO[4]); b.R(x - w / 2, yf - h + 3, w, 1, WO[1]);
  for (let i = 0; i < 4; i++) b.R(x - w / 2 + 3 + i * (w - 8) / 3, yf - h, 2, h, WO[1]);
  b.R(x - w / 2, yf - Math.round(h * 0.5), w, 1, NI[1]); b.R(x - w / 2, yf - 3, w, 1, NI[1]); b.R(x - w / 2, yf - 1, w, 1, WO[0]);
  b.R(x + (light > 0 ? w / 2 - 3 : -w / 2), yf - h + 4, 3, h - 4, WO[3]);
  b.R(x - 1, yf - h - Math.round(rr * 0.6), 3, Math.round(rr * 0.6), WO[1]);
  const cy_ = yf - h - Math.round(rr * 1.2);
  for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) {
    const d = Math.hypot(i, j); if (d > rr) continue;
    const l = (i * light * 0.6 - j * 0.7) / rr + (pa_h2(i + 40, j + 40, 3) - 0.5) * 0.9;
    b.px(x + i, cy_ + j, l > 0.62 ? LM[4] : l > 0.28 ? GR[4] : l > -0.1 ? GR[3] : l > -0.5 ? GR[2] : GR[1]);
  }
}
function pa_buildCafeFacade(env, F) {                                   // façade haute + enseigne + devanture + auvent (statique) ; largeur 390, origine x = −60
  const M = pa_mat({ env }), W = 390, ox = 60, b = new PaBuf(W, LH), night = env === 'crepuscule', side = 1;
  const yAw = F - 178, yVal = F - 146, yW = F - 58;
  // façade haute
  pa_house(b, ox - 40, F - 206, 360, { M, det: 3, nfl: 7, fh: 30, ww: 11, wh: 20, wp: 23, roofH: 0, seed: 21, balc: [0, 2, 4, 6], side, bare: true, shut: 0.5, litP: M.litWin, tone: 0.2 });
  // mur du rez-de-chaussée (soubassement + piliers) en pierre
  const st = M.stone;
  b.R(0, F - 206, W, 148, st[2]);
  for (let i = 0; i < 6; i++) b.dith(i, F - 206, 1, 148, st[1], 0.85 * (1 - i / 6));
  // enseigne
  b.R(ox + 40, F - 205, 190, 26, WO[0]); b.R(ox + 41, F - 204, 188, 24, GR[1]); b.R(ox + 41, F - 204, 188, 1, YE[1]); b.R(ox + 41, F - 181, 188, 1, YE[1]); b.R(ox + 41, F - 204, 1, 24, YE[1]); b.R(ox + 228, F - 204, 1, 24, YE[1]);
  const nom = 'CAFÉ';
  for (const [dx, dy, c] of [[1, 1, NI[0]], [0, 0, YE[2]]]) b.text(nom, ox + 135 - Math.round(textW(nom, 2) / 2) + dx, F - 197 + dy, c, 2);
  b.R(ox + 52, F - 193, 24, 1, YE[0]); b.R(ox + 194, F - 193, 24, 1, YE[0]);
  // devanture : cadre vert, trois vitrines + porte
  const fx = ox + 24, fw = 222, wy = F - 142, wh = yW - wy;
  b.R(fx, wy - 2, fw, wh + 2, GR[1]); b.R(fx, wy - 2, fw, 1, GR[3]);
  const panes = [[fx + 5, 58], [fx + 67, 58], [fx + 129, 58]];
  for (const [px0, pw] of panes) pa_cafeWindow(b, px0, wy, pw, wh - 4, M, night, px0);
  // porte
  const dx0 = fx + 191; b.R(dx0 - 2, wy, 28, wh, GR[0]); pa_cafeWindow(b, dx0, wy + 2, 24, wh - 8, M, night, 77, true);
  b.R(dx0 + 19, wy + wh * 0.55, 2, 4, YE[2]);
  b.R(fx, yW - 4, fw, 4, GR[0]); b.R(fx, yW - 4, fw, 1, GR[2]);                                           // soubassement
  b.R(fx + 62, wy - 2, 4, wh, GR[0]); b.R(fx + 124, wy - 2, 4, wh, GR[0]); b.R(fx + 186, wy - 2, 4, wh, GR[0]);
  // pilastres de pierre
  b.R(fx - 10, F - 178, 10, 120, st[3]); b.R(fx + fw, F - 178, 10, 120, st[2]); b.R(fx - 10, F - 178, 2, 120, st[1]); b.R(fx + fw + 8, F - 178, 2, 120, st[4]);
  for (const px0 of [fx - 10, fx + fw]) for (let j = F - 170; j < yW; j += 9) b.R(px0, j, 10, 1, st[1]);
  // auvent (store banne) : surface rayée rouge / blanc + armature
  const aw0 = ox - 16, aw1 = ox + 286, nStripe = 25, sw = (aw1 - aw0) / nStripe;
  for (let k = 0; k < nStripe; k++) {
    const x0 = Math.round(aw0 + k * sw), x1 = Math.round(aw0 + (k + 1) * sw), red = k % 2 === 0;
    const cA = red ? [RD[1], RD[2], RD[3], RD[4]] : [WH[0], WH[1], WH[2], WH[3]];
    for (let y = yAw; y < yVal; y++) { const f = (y - yAw) / (yVal - yAw), c = f < 0.12 ? cA[0] : f < 0.5 ? cA[1] : f < 0.9 ? cA[2] : cA[3]; b.R(x0, y, x1 - x0, 1, c); }
    // pli : lumière à droite de chaque bande
    b.R(x1 - 1, yAw, 1, yVal - yAw, red ? RD[4] : WH[3]); b.R(x0, yAw, 1, yVal - yAw, red ? RD[0] : WH[0]);
  }
  b.R(aw0, yAw - 2, aw1 - aw0, 2, RD[0]); b.R(aw0, yAw, aw1 - aw0, 1, RD[0]);
  for (const q of [0.18, 0.5, 0.82]) { const ax = Math.round(aw0 + (aw1 - aw0) * q); b.line(ax, yAw + 4, ax + 14, yVal + 4, NI[1], 1); }
  if (env !== 'crepuscule') { const sh = [[0, 0], [W * 0.62, 0], [W * 0.18, F - 206], [0, F - 206]]; const bb = new PaBuf(W, LH); bb.poly(sh, 1); for (let y = 0; y < LH; y++) for (let x = 0; x < W; x++) if (bb.d[y * W + x] && pa_bay(x, y) < 0.34 * (1 - Math.min(1, x / (W * 0.55)) * 0.5)) b.px(x, y, env === 'soir' ? DU[3] : M.stone[1]); }
  // ombre portée de l'auvent sur la devanture
  b.dith(fx - 10, yVal + 12, fw + 20, 8, st[0], 0.5); b.dith(fx - 10, yVal + 12, fw + 20, 3, GR[0], 0.8);
  return { cv: b.done(), ox, W };
}
function pa_cafeWindow(b, x, y, w, h, M, night, seed, door) {
  b.R(x, y, w, h, NI[1]);
  const warm = night ? [AM[3], AM[5], AM[7]] : [WO[1], WO[2], WO[3]];
  b.R(x + 1, y + 1, w - 2, h - 2, warm[0]);
  for (let j = 0; j < h - 2; j++) for (let i = 0; i < w - 2; i++) { const f = j / h; if (pa_bay(x + i, y + j) < 0.35 * (1 - f)) b.px(x + 1 + i, y + 1 + j, warm[1]); }
  // étagères de bouteilles au fond, comptoir de zinc
  for (let r = 0; r < 3; r++) { const yy = y + 6 + r * 10; if (!door) { b.R(x + 2, yy + 6, w - 4, 1, WO[3]); for (let i = 0; i < w - 6; i += 3) b.R(x + 3 + i, yy, 2, 6, [GR[3], AM[5], RD[2], CY[2]][Math.floor(pa_h(i + r * 9, seed) * 4)]); } }
  b.R(x + 1, y + h - 14, w - 2, 3, ST[6]); b.R(x + 1, y + h - 11, w - 2, 11, WO[0]);
  // silhouettes de clients (tête + épaules)
  for (let k = 0; k < (door ? 1 : 2); k++) { const cx = x + 8 + Math.floor(pa_h(k, seed) * (w - 16)), cy = y + h - 24 - Math.floor(pa_h(k, seed + 1) * 6); b.ell(cx, cy, 3, 3, NI[0]); b.R(cx - 5, cy + 3, 10, 12, NI[0]); b.R(cx - 5, cy + 3, 1, 12, NI[2]); }
  // lampes à globe
  for (let k = 0; k < (door ? 1 : 2); k++) { const lx = x + 12 + k * Math.floor(w * 0.5), ly = y + 8; b.line(lx, y + 1, lx, ly, NI[0], 1); b.disc(lx, ly + 2, 3, AM[9]); b.disc(lx, ly + 2, 2, AM[10]); if (night) b.dith(lx - 8, ly - 6, 17, 17, AM[8], 0.35); }
  // reflets diagonaux du ciel
  for (let j = 0; j < h - 2; j++) for (let i = 0; i < w - 2; i++) { const d = i - j * 0.55 - w * 0.5; if (d > 0 && d < 5) b.px(x + 1 + i, y + 1 + j, night ? NI[3] : NI[7]); if (d > 7 && d < 8.5) b.px(x + 1 + i, y + 1 + j, night ? NI[2] : NI[6]); }
  b.R(x, y, w, 1, GR[3]); b.R(x, y, 1, h, GR[2]); b.R(x + w - 1, y, 1, h, GR[3]); b.R(x, y + h - 1, w, 1, GR[0]);
}
function pa_buildCafeFloor(env, F) {                                    // sol de la terrasse, mobilier lointain ; largeur 390
  const M = pa_mat({ env }), W = 390, ox = 60, b = new PaBuf(W, LH), night = env === 'crepuscule', yW = F - 58, vpx = ox + 135, vpy = yW - 150;
  const base = night ? [NI[1], NI[2], NI[3]] : env === 'soir' ? [DU[4], OC[4], OC[5]] : [SK[2], SK[3], SK[4]];
  for (let y = yW; y < LH; y++) { const f = (y - yW) / (LH - yW); b.R(0, y, W, 1, f < 0.15 ? base[0] : base[1]); }
  for (let y = yW; y < LH; y++) for (let x = 0; x < W; x++) { const f = (y - yW) / (LH - yW); if (pa_bay(x, y) < 0.5 * f) b.px(x, y, base[2]); }
  b.R(0, yW, W, 2, M.stone[1]); b.R(0, yW + 2, W, 1, M.stone[0]);
  b.dith(0, yW + 3, W, 34, night ? NI[0] : DU[2], night ? 0.5 : 0.3);                                         // ombre de l'auvent sur le sol                                           // plinthe
  for (let k = 1; ; k++) { const y = yW + 3 + Math.round(k * k * 1.1 + k * 2.6); if (y >= LH) break; b.dith(0, y, W, 1, night ? NI[0] : SK[1], 0.6); }
  for (let x0 = -600; x0 <= 900; x0 += 22) { const xa = x0, xb = vpx + (xa - vpx) * (LH - vpy) / (yW - vpy); for (let yy = yW + 3; yy < LH; yy++) { const xx = vpx + (xa - vpx) * (yy - vpy) / (yW - vpy); if (pa_bay(Math.round(xx), yy) < 0.6) b.px(xx, yy, night ? NI[0] : SK[1]); } }
  // meubles du fond (deux guéridons avec chaises, échelle 0,62) et de côté
  const sc = 0.62, yf = F - 42;
  for (const [tx, sg] of [[ox + 38, 1], [ox + 214, -1]]) { pa_chairB(b, tx - 24 * sg, yf, sc, M, 1, 0); pa_tableB(b, tx, yf + 10, sc, M, 1); pa_chairB(b, tx + 24 * sg, yf + 2, sc, M, 1, 0); }
  // chevalet-menu près de la porte
  const mx = ox + 244, my = F - 62; b.line(mx, my, mx + 5, my - 20, WO[1], 1); b.line(mx + 10, my, mx + 5, my - 20, WO[1], 1); b.R(mx + 1, my - 17, 9, 12, NI[1]); b.R(mx + 2, my - 16, 7, 10, GR[1]); for (let j = 0; j < 4; j++) b.R(mx + 3, my - 14 + j * 2, 5 - (j & 1), 1, WH[1]);
  return { cv: b.done(), ox, W };
}
function pa_buildCafeFront(env, F, tx, o) {                             // premier plan : grand guéridon, bacs de buis ; largeur 390
  const M = pa_mat({ env }), W = 390, ox = 60, b = new PaBuf(W, LH);
  pa_planterB(b, ox - 8, LH + 6, 62, M, 1); pa_planterB(b, ox + 280, LH + 12, 64, M, 1);
  pa_tableB(b, ox + tx, F + 40, 1.45, M, 1);
  return { cv: b.done(), ox, W };
}
// pa_cafe(t, o) : voir l'en-tête
function pa_cafe(t, o = {}) {
  const env = o.env || 'matin', F = o.F ?? 352, layer = o.layer || 'all', cam = pa_fin(o.cam), tx = o.tableX ?? 140, sx = o.seatX ?? 112, light = (o.light ?? 1) < 0 ? -1 : 1;
  const draw = (cv, ox, par) => { L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(cv, Math.round(-ox - cam * par), 0); };
  const M = pa_mat({ env }), night = env === 'crepuscule';
  if (layer !== 'front') {
    const fa = pa_cache(`cafeF|${env}|${F}`, () => pa_buildCafeFacade(env, F)), fl = pa_cache(`cafeL|${env}|${F}`, () => pa_buildCafeFloor(env, F));
    draw(fa.cv, fa.ox, 0.5);
    // franges de l'auvent qui ondulent
    const yVal = F - 146, aw0 = -16 - cam * 0.5, nS = 25, sw = (302) / nS;
    for (let k = 0; k < nS; k++) {
      const x0 = Math.round(aw0 + k * sw + 60 - 60), x1 = Math.round(aw0 + (k + 1) * sw + 0), red = k % 2 === 0, fl_ = Math.sin(t * 2.2 + k * 0.7) * 0.8;
      const cA = red ? [RD[1], RD[2], RD[3], RD[4]] : [WH[0], WH[1], WH[2], WH[3]];
      R(x0, yVal, x1 - x0, 9 + fl_, cA[2]); R(x0, yVal, x1 - x0, 2, cA[3]); R(x1 - 1, yVal, 1, 9 + fl_, cA[3]); R(x0, yVal, 1, 9, cA[0]);
      L.fillStyle = cA[2]; L.fillRect(x0 + 1, yVal + 9 + Math.round(fl_), x1 - x0 - 2, 2); R(x0 + 2, yVal + 11 + Math.round(fl_), x1 - x0 - 4, 1, cA[1]);
    }
    draw(fl.cv, fl.ox, 0.75);
    // chaise du client (derrière lui) et ombres longues
    const seatCam = sx - cam * 1.0;
    L.save(); L.globalAlpha = 0.35; for (const [px0, w2] of [[seatCam, 20]]) ell(px0 - light * 14, F + 2, 26, 3, DU[1]); L.restore();
    const cb = pa_cache(`cafeC|${env}`, () => { const bb = new PaBuf(60, 80); pa_chairB(bb, 30, 76, 1.3, M, 1, 0); return bb.done(); });
    L.drawImage(cb, Math.round(seatCam - 30), Math.round(F - 76 + 0));
    // pigeons et passants du fond
    const np = o.people ?? 3, ng = o.pigeons ?? 2;
    for (let k = 0; k < np; k++) { const sp = 11 + 3 * k, per = 420, x = ((t * sp * (k % 2 ? -1 : 1) + k * 190) % per + per) % per - 75 - cam * 0.8; pa_passant(x, F - 54 + k * 3, 0.78, t, { env, seed: 5 + k * 3, dir: k % 2 ? -1 : 1, speed: sp, light, shadow: 0.8 }); }
    for (let k = 0; k < ng; k++) pa_pigeon(60 + k * 120 - cam * 0.9 + (k ? 20 : 0), F + 20 + k * 30, 1.2, t, { env, seed: 9 + k, dir: k % 2 ? -1 : 1, light });
  }
  if (layer !== 'back') {
    const fr = pa_cache(`cafeT|${env}|${F}|${tx}`, () => pa_buildCafeFront(env, F, tx, o));
    draw(fr.cv, fr.ox, 1.0);
    // vapeur de la tasse
    const cx0 = tx - 7 * 1.45 - cam, cy0 = F + 40 - 40 * 1.45 - 6;
    pa_vapeur(cx0, cy0, t, { env, kind: 'vapeur', n: 7, h: 22, w: 1, w2: 4, wind: 4, rate: 0.5, sway: 2, seed: 4, a: 0.8 });
    if (o.dust ?? 1) k_dust(t, { n: 26, x0: 0, x1: 270, y0: 120, y1: 360, cam, par: 0.9, seed: 8 });
  }
  return { F, awningY: F - 178, awningEdgeY: F - 137, wallY: F - 58, signY: F - 205, table: { x: tx - cam, topY: F + 40 - 40 * 1.45, rx: 32, ry: 9 }, seat: { x: sx - cam, y: F, seatY: F - 27 }, doorX: 60 + 24 + 191 + 12 - cam };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 9. VOITURE D'ÉPOQUE (taxi, limousine, torpedo)
// ════════════════════════════════════════════════════════════════════════════════════════
const PA_CARS = {
  taxi: { body: [RD[0], RD[1], RD[2], RD[4]], roof: [NI[0], NI[1], NI[2], ST[3]], fender: [NI[0], NI[1], NI[2], ST[4]], stripe: YE[1] },
  limousine: { body: [NI[1], NI[2], NI[4], NI[7]], roof: [NI[0], NI[0], NI[1], ST[3]], fender: [NI[0], NI[1], NI[2], ST[4]], stripe: WH[0] },
  torpedo: { body: [GR[0], GR[1], GR[2], GR[4]], roof: [WO[1], WO[2], WO[3], WO[5]], fender: [NI[0], GR[0], GR[1], GR[3]], stripe: AM[8] },
};
function pa_buildCar(kind, env, s, dir) {
  const K = PA_CARS[kind] || PA_CARS.taxi, night = env === 'crepuscule', W = Math.ceil(116 * s), H = Math.ceil(66 * s), bb = new PaBuf(W, H), bf = new PaBuf(W, H), ox = W >> 1, oy = H - 2;
  const X = u => ox + (u - 52) * s * dir, Y = h => oy - h * s, P = pts => pts.map(p => [X(p[0]), Y(p[1])]);
  const chromeT = [ST[3], ST[5], ST[7], WH[3]], glass = night ? [NI[0], NI[1], NI[3], NI[5]] : [NI[3], NI[5], NI[7], NI[9]];
  const R_ = (b, u0, h0, u1, h1, c) => b.R(Math.min(X(u0), X(u1)), Y(h1), Math.max(1, Math.abs(X(u1) - X(u0))), Math.max(1, Math.abs(Y(h0) - Y(h1))), c);
  const body = night ? [NI[0], NI[1], DU[1], DU[3]] : K.body;
  // ── corps (derrière les roues) ──
  R_(bb, 2, 9, 102, 13, NI[1]);
  bb.polyG(P([[5, 13], [63, 13], [63, 31], [8, 31], [3, 26]]), body);
  R_(bb, 5, 22, 63, 22, K.stripe);                                                                                 // filet de caisse
  bb.polyG(P([[60, 14], [97, 14], [97, 30], [60, 33]]), body, 0.25, 0.7);
  for (let q = 0; q < 6; q++) R_(bb, 69 + q * 4, 19, 69 + q * 4, 27, body[0]);                                      // persiennes du capot
  if (kind === 'torpedo') {
    bb.polyG(P([[14, 31], [60, 31], [60, 38], [14, 38]]), body);
    bb.polyG(P([[2, 31], [18, 31], [18, 45], [8, 45], [2, 38]]), K.roof, 0.3, 0.7);
    bb.polyG(P([[57, 38], [61, 38], [57, 52], [55, 52]]), glass, 0.3, 0.8, false);
    for (const u of [28, 44]) { bb.disc(X(u), Y(42), Math.max(2, Math.round(3 * s)), SK[2]); bb.R(X(u) - Math.round(3 * s), Y(38), Math.round(6 * s), Math.round(5 * s), kind === 'torpedo' ? ST[2] : NI[2]); }   // passagers
  } else {
    bb.polyG(P([[10, 31], [64, 31], [60, 50], [14, 50]]), body, 0.15, 0.8, false);
    R_(bb, 11, 33, 61, 48, NI[0]);
    const nW = kind === 'taxi' ? 3 : 2, ww = (46 - (nW - 1) * 3) / nW;
    for (let k = 0; k < nW; k++) {
      const u0 = 14 + k * (ww + 3), u1 = u0 + ww;
      bb.polyG(P([[u0, 34], [u1, 34], [u1 - 1, 47], [u0 + 1, 47]]), glass, 0.35, 0.8, false);
      bb.line(X(u0 + ww * 0.25), Y(34), X(u0 + ww * 0.6), Y(47), glass[3], 1);
    }
    bb.polyG(P([[7, 50], [69, 50], [67, 54], [5, 54]]), K.roof, 0.4, 0.8);
    if (kind === 'taxi') { R_(bb, 30, 54, 42, 57, WH[2]); R_(bb, 30, 54, 42, 54, WH[0]); }
    bb.R(X(36), Y(31), 1, Math.round(18 * s), body[0]);
    R_(bb, 31, 29, 33, 30, chromeT[3]);
  }
  bb.outline(NI[0]);
  // ── ailes, calandre, phare, pare-chocs (devant les roues) ──
  bf.polyG(P([[62, 14], [63, 22], [68, 29], [86, 31], [98, 27], [98, 14], [92, 14], [88, 20], [80, 22], [72, 20], [68, 14]]), K.fender, 0.35, 0.8);
  bf.polyG(P([[1, 14], [3, 21], [9, 28], [26, 29], [34, 22], [35, 14], [30, 14], [26, 19], [20, 21], [14, 19], [10, 14]]), K.fender, 0.35, 0.8);
  R_(bf, 97, 14, 103, 31, chromeT[1]); R_(bf, 97, 14, 98, 31, chromeT[0]); R_(bf, 102, 14, 103, 31, chromeT[3]); for (let q = 16; q < 30; q += 2) R_(bf, 98, q, 102, q, chromeT[0]);
  R_(bf, 98, 31, 102, 34, chromeT[2]); R_(bf, 99, 34, 101, 37, chromeT[3]);
  bf.disc(X(92), Y(30), Math.max(3, Math.round(4 * s)), chromeT[2]); bf.disc(X(93), Y(30), Math.max(2, Math.round(3 * s)), night ? AM[9] : AM[10]); bf.px(X(94), Y(31), WH[3]);
  R_(bf, 100, 10, 106, 14, chromeT[2]); R_(bf, -1, 10, 4, 14, chromeT[1]);
  bf.outline(NI[0]);
  return { cv: bb.done(), cf: bf.done(), ox, oy, W, H };
}
// roues : pneu, jante, rayons qui tournent (dessinées en direct)
function pa_wheel(x, y, r, ang) {
  disc(x, y, r, NI[0]); disc(x, y, r - 1, NI[1]); disc(x, y, Math.max(2, r - 2), WH[1]); disc(x, y, Math.max(1, r - 3), NI[1]);
  for (let k = 0; k < 12; k++) { const a = ang + k * TAU / 12; lineP(x, y, x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3), WO[5], 1); }
  disc(x, y, Math.max(1, Math.round(r * 0.3)), ST[6]); px(x - 1, y - 1, WH[3]);
}
// pa_voiture(x, y, s, t, o) : voir l'en-tête
function pa_voiture(x, y, s, t, o = {}) {
  const kind = o.kind || 'taxi', env = o.env || 'matin', dir = (o.dir ?? 1) < 0 ? -1 : 1, speed = o.speed ?? 0, sq = Math.round(s * 8) / 8, light = (o.light ?? 1) < 0 ? -1 : 1, night = env === 'crepuscule';
  const sp = pa_cache(`car|${kind}|${env}|${sq}|${dir}`, () => pa_buildCar(kind, env, sq, dir));
  const bob = speed ? Math.round(Math.sin(t * 17) * 0.6 + Math.sin(t * 5.3) * 0.4) : Math.round(Math.sin(t * 22) * 0.4 + 0.2);
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (o.shadow ?? 1) { L.save(); L.globalAlpha = 0.42; ell(x - light * 12 * sq, y + 1, Math.round(58 * sq), Math.max(2, Math.round(3 * sq)), env === 'crepuscule' ? NI[0] : DU[1]); L.restore(); }
  const x0 = Math.round(x) - sp.ox, y0 = Math.round(y) - sp.oy - 1;
  const ang = o.ph ?? (speed * t / (9 * sq)) * dir, r = Math.max(4, Math.round(9 * sq));
  L.drawImage(sp.cv, x0, y0 + bob);
  for (const u of [20, 80]) pa_wheel(Math.round(x + (u - 52) * sq * dir), Math.round(y - 9 * sq) - 1, r, ang);
  L.drawImage(sp.cf, x0, y0 + bob);
  if (speed) { pa_vapeur(x - dir * 52 * sq, y - 11 * sq, t, { env, kind: 'fumee', n: 5, h: 8, w: 1, w2: 4, wind: -dir * 14 * Math.min(1, speed / 40), rate: 1.2, seed: 7, a: 0.7 }); }
  if (night && (o.lights ?? true)) { const hx = x + dir * 42 * sq, hy = y - 37 * sq; rgrad(hx + dir * 6, hy, 2, 40 * sq, [[0, 'rgba(255,230,140,0.55)'], [1, 'rgba(255,200,90,0)']], 1, 'lighter'); }
  return { x0, y0, x1: x0 + sp.W, y1: y, cabin: [x + (-40 + 8) * sq * dir, y - 53 * sq, 48 * sq, 19 * sq], front: x + 52 * sq * dir, rear: x - 52 * sq * dir, top: y - 57 * sq, wheelY: y - 9 * sq };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 10. LA RUE : immeubles d'en face avec boutiques, trottoir, pavés, mobilier urbain, passants
// ════════════════════════════════════════════════════════════════════════════════════════
const PA_SHOPS = [
  { nom: 'BOULANGERIE', frame: [WO[0], WO[1], WO[2]], sign: [WO[1], YE[2]], disp: 'pain' },
  { nom: 'LIBRAIRIE', frame: [GR[0], GR[1], GR[2]], sign: [GR[0], YE[2]], disp: 'livres' },
  { nom: 'MODES', frame: [NI[1], NI[2], NI[4]], sign: [NI[1], WH[2]], disp: 'chapeaux' },
  { nom: 'TABAC', frame: [RD[0], RD[1], RD[2]], sign: [RD[0], WH[2]], disp: 'tabac' },
  { nom: 'PHARMACIE', frame: [GR[0], GR[2], GR[3]], sign: [GR[0], WH[3]], disp: 'fioles' },
];
function pa_shop(b, x, y, w, h, K, M, seed, night) {                    // devanture : bandeau d'enseigne, vitrine, porte
  b.R(x, y, w, h, K.frame[1]); b.R(x, y, w, 1, K.frame[2]); b.R(x, y + h - 1, w, 1, K.frame[0]);
  const sh = 9;
  b.R(x + 2, y + 1, w - 4, sh, K.sign[0]); b.R(x + 2, y + 1, w - 4, 1, K.frame[2]); b.text(K.nom, x + Math.round((w - textW(K.nom, 1)) / 2), y + 2, K.sign[1], 1);
  const wy = y + sh + 3, wh = h - sh - 5, dw = 11, ww = w - dw - 10;
  b.R(x + 3, wy, ww, wh, NI[0]); b.R(x + 4, wy + 1, ww - 2, wh - 2, night ? AM[4] : WO[1]);
  for (let j = 0; j < wh - 2; j++) for (let i = 0; i < ww - 2; i++) if (pa_bay(x + i, y + j) < 0.3 * (1 - j / wh)) b.px(x + 4 + i, wy + 1 + j, night ? AM[6] : WO[2]);
  const d = K.disp, base = wy + wh - 3;
  b.R(x + 4, base, ww - 2, 1, WO[3]);
  for (let i = 0; i < ww - 6; i += 4) {
    const r = pa_h(i + seed, 3), cx = x + 6 + i;
    if (d === 'pain') { b.ell(cx + 1, base - 2, 3, 1, [AM[5], AM[6], WO[5]][(r * 3) | 0]); b.px(cx, base - 3, AM[8]); }
    else if (d === 'livres') b.R(cx, base - 4 - ((r * 3) | 0), 2, 4 + ((r * 3) | 0), [RD[2], GR[3], BL[2], YE[1], WH[1], OC[3]][(r * 6) | 0]);
    else if (d === 'chapeaux') { b.ell(cx + 1, base - 3, 2, 1, i % 8 ? NI[0] : WO[5]); b.R(cx - 1, base - 3, 5, 1, NI[1]); b.ell(cx + 1, base - 5, 1, 1, i % 8 ? NI[2] : SK[3]); }
    else if (d === 'tabac') b.R(cx, base - 3 - ((r * 3) | 0), 3, 3 + ((r * 3) | 0), [WH[2], RD[3], YE[1]][(r * 3) | 0]);
    else b.R(cx, base - 3 - ((r * 3) | 0), 2, 3 + ((r * 3) | 0), [CY[3], GR[4], AM[7], WH[1]][(r * 4) | 0]);
  }
  for (let j = 0; j < wh - 2; j++) for (let i = 0; i < ww - 2; i++) { const dg = i - j * 0.6 - ww * 0.55; if (dg > 0 && dg < 3) b.px(x + 4 + i, wy + 1 + j, night ? AM[5] : NI[6]); }
  const dx0 = x + w - dw - 4; b.R(dx0, wy, dw, wh, NI[0]); b.R(dx0 + 1, wy + 1, dw - 2, wh - 1, night ? AM[5] : K.frame[0]); b.R(dx0 + dw - 3, wy + wh / 2, 1, 2, YE[2]); b.R(dx0 + 2, wy + 2, dw - 4, Math.round(wh * 0.45), night ? AM[7] : NI[4]);
  b.dith(x, y + h - 4, w, 4, NI[0], 0.3);
}
function pa_buildRueBack(env, F) {                                      // façades d'en face (largeur 390, origine x = −60) : transparent au-dessus des toits
  const M = pa_mat({ env }), W = 390, ox = 60, b = new PaBuf(W, LH), rnd = rng(77), night = env === 'crepuscule', yB = F - 36;
  const ws = [98, 94, 104, 94]; let x = 0;
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i], yCor = 142 + Math.floor(rnd() * 46), fh = 22, roofH = 26, gh = Math.round(fh * 1.3), nfl = Math.max(2, Math.round((yB - gh - yCor - 2) / fh));
    const r = pa_house(b, x, yB, w, { M, det: 2, nfl, fh, ww: 8, wh: 14, wp: 16, roofH, seed: 31 + i * 5, balc: [1, nfl - 2], side: 1, shop: true, zinc: i === 2 ? 'slate' : 'zinc', tone: 0.35 });
    pa_shop(b, x + 1, yB - gh, w - 2, gh, PA_SHOPS[(i * 2 + (env === 'soir' ? 1 : 0)) % PA_SHOPS.length], M, 5 + i, night);
    x += w;
  }
  return { cv: b.done(), ox, W };
}
function pa_buildRueGround(env, F) {                                    // trottoir et chaussée
  const M = pa_mat({ env }), W = 390, ox = 60, b = new PaBuf(W, LH), night = env === 'crepuscule', yB = F - 36;
  const sw = night ? [NI[2], NI[3], NI[4]] : env === 'soir' ? [DU[4], OC[4], OC[5]] : [SK[2], SK[3], SK[4]];
  b.R(0, yB, W, F - yB, sw[1]);
  for (let j = 0; j < F - yB; j++) for (let i = 0; i < W; i++) if (pa_bay(i, j) < 0.35 * (j / (F - yB))) b.px(i, yB + j, sw[2]);
  for (let q = 0; q < W; q += 17) { for (let j = yB + 3; j < F - 3; j++) if (pa_bay(q, j) < 0.6) b.px(q, j, M.stone[0]); }
  b.R(0, yB, W, 2, M.stone[0]); b.dith(0, yB + 2, W, 5, M.stone[0], 0.3);
  b.R(0, F - 3, W, 3, night ? NI[4] : WH[0]); b.R(0, F - 3, W, 1, night ? NI[5] : WH[2]); b.R(0, F, W, 2, M.stone[0]);                // bordure de granit
  // chaussée : pavés en rangées, perspective
  const cob = night ? [NI[1], NI[2], NI[3], NI[4]] : env === 'soir' ? [DU[2], DU[3], DU[4], OC[3]] : [ST[2], ST[3], ST[4], ST[5]];
  b.R(0, F + 2, W, LH - F - 2, cob[1]);
  let y = F + 3, row = 0;
  while (y < LH) {
    const f = (y - F) / (LH - F), rh = Math.max(2, Math.round(2.2 + f * 9)), sw_ = Math.max(4, Math.round(4 + f * 14)), off = (row & 1) ? sw_ / 2 : 0;
    for (let x0 = -sw_; x0 < W; x0 += sw_) {
      const xx = Math.round(x0 + off), c = cob[1 + Math.floor(pa_h(row * 97 + (x0 / sw_ | 0), 5) * 3 * 0.999)];
      b.R(xx, y, sw_ - 1, rh - 1, c); if (pa_h(row * 31 + (x0 / sw_ | 0), 6) < 0.6) b.R(xx, y, sw_ - 1, 1, cob[3]);
      if (rh > 3) b.dith(xx + 1, y + 2, sw_ - 3, rh - 4, cob[0], 0.12);
    }
    b.R(0, y + rh - 1, W, 1, cob[0]);
    y += rh; row++;
  }
  b.R(0, F + 2, W, 2, cob[0]);                                                                                             // caniveau
  return { cv: b.done(), ox, W };
}
// éléments de mobilier urbain (sprites centrés sur (ox, bas))
function pa_buildItem(kind, env) {
  const M = pa_mat({ env }), night = env === 'crepuscule', G = [GR[0], GR[1], GR[2], GR[3]];
  if (kind === 'lamp') {
    const W = 40, H = 96, b = new PaBuf(W, H), cx = 20, yb = H - 2;
    b.R(cx - 6, yb - 6, 12, 6, G[1]); b.R(cx - 6, yb - 6, 12, 1, G[3]); b.R(cx - 4, yb - 12, 8, 6, G[2]); b.R(cx - 3, yb - 14, 6, 2, G[3]);
    b.R(cx - 2, yb - 78, 4, 66, G[1]); b.R(cx + 1, yb - 78, 1, 66, G[3]); b.R(cx - 3, yb - 56, 6, 2, G[2]); b.R(cx - 4, yb - 40, 8, 2, G[2]);
    b.R(cx - 4, yb - 80, 8, 3, G[2]);
    b.line(cx, yb - 78, cx - 9, yb - 84, G[1], 1); b.line(cx, yb - 78, cx + 9, yb - 84, G[1], 1);                     // volutes
    for (const sg of [-1, 1]) { const lx = cx + sg * 10; b.R(lx - 4, yb - 90, 8, 8, night ? AM[8] : CY[2]); b.R(lx - 3, yb - 89, 6, 6, night ? AM[10] : CY[4]); b.R(lx - 5, yb - 92, 10, 2, G[1]); b.R(lx - 1, yb - 95, 2, 3, G[2]); b.R(lx - 3, yb - 82, 6, 1, G[1]); }
    b.outline(NI[0]); return { cv: b.done(), ox: cx, oy: yb, W, H, glow: [[cx - 10, yb - 86], [cx + 10, yb - 86]] };
  }
  if (kind === 'morris') {
    const W = 44, H = 84, b = new PaBuf(W, H), cx = 22, yb = H - 2;
    b.ell(cx, yb - 3, 17, 4, G[0]); b.R(cx - 15, yb - 8, 30, 6, G[1]); b.R(cx - 15, yb - 8, 30, 1, G[3]);
    for (let j = 0; j < 52; j++) for (let i = -13; i <= 13; i++) {
      const u = i / 13, shade = u > 0.5 ? 3 : u > -0.1 ? 2 : u > -0.6 ? 1 : 0, y = yb - 9 - j, band = Math.floor(j / 13) % 4;
      const pc = [[RD[1], RD[2], RD[3], RD[4]], [BL[1], BL[2], BL[3], BL[4]], [YE[0], YE[1], YE[2], YE[3]], [GR[1], GR[2], GR[3], GR[4]]][(band + (kind.length)) % 4];
      b.px(cx + i, y, j % 13 === 12 ? G[0] : pc[shade]);
    }
    for (let q = 0; q < 8; q++) b.R(cx - 11 + ((pa_h(q, 4) * 14) | 0), yb - 12 - q * 6, 3 + ((pa_h(q, 5) * 5) | 0), 1, WH[1]);
    b.R(cx - 15, yb - 62, 30, 3, G[1]); b.R(cx - 15, yb - 62, 30, 1, G[3]);
    for (let j = 0; j < 12; j++) { const hw = Math.round(15 * Math.sqrt(Math.max(0, 1 - (j / 12) ** 2))); b.R(cx - hw, yb - 63 - j, hw * 2, 1, j < 3 ? G[1] : G[2]); b.px(cx + hw - 1, yb - 63 - j, G[3]); }
    b.R(cx - 1, yb - 78, 2, 5, G[2]); b.px(cx, yb - 79, YE[2]);
    b.outline(NI[0]); return { cv: b.done(), ox: cx, oy: yb, W, H };
  }
  if (kind === 'kiosk') {
    const W = 64, H = 82, b = new PaBuf(W, H), cx = 32, yb = H - 2;
    b.R(cx - 26, yb - 6, 52, 6, G[0]); b.R(cx - 26, yb - 6, 52, 1, G[2]);
    b.R(cx - 24, yb - 54, 48, 48, G[1]); b.R(cx + 18, yb - 54, 6, 48, G[2]); b.R(cx - 24, yb - 54, 4, 48, G[0]);
    b.R(cx - 19, yb - 46, 38, 26, NI[0]); b.R(cx - 18, yb - 45, 36, 24, night ? AM[5] : WO[2]);
    for (let i = 0; i < 9; i++) b.R(cx - 17 + i * 4, yb - 44 + (i & 1) * 3, 3, 14 - (i & 1) * 3, [WH[2], YE[3], RD[3], WH[1], CY[3]][i % 5]);
    b.R(cx - 18, yb - 31, 36, 2, WO[3]); for (let i = 0; i < 7; i++) b.R(cx - 17 + i * 5, yb - 28, 4, 5, [WH[2], WH[1], YE[2]][i % 3]);
    b.R(cx - 22, yb - 17, 44, 9, G[2]); b.text('JOURNAUX', cx - 23, yb - 15, YE[3], 1); b.dith(cx - 24, yb - 22, 48, 5, NI[0], 0.3);
    b.poly([[cx - 30, yb - 54], [cx + 30, yb - 54], [cx + 22, yb - 66], [cx - 22, yb - 66]], G[2]); b.R(cx - 30, yb - 56, 60, 3, G[1]); b.R(cx - 30, yb - 54, 60, 1, G[3]);
    for (let q = -22; q <= 22; q += 6) b.line(cx + q, yb - 66, cx + q * 1.3, yb - 54, G[1], 1);
    b.R(cx - 2, yb - 76, 4, 10, G[2]); b.ell(cx, yb - 78, 3, 3, YE[2]);
    b.outline(NI[0]); return { cv: b.done(), ox: cx, oy: yb, W, H };
  }
  if (kind === 'tree') {
    const W = 110, H = 190, b = new PaBuf(W, H), cx = 55, yb = H - 2, rnd = rng(9);
    const bark = [WO[1], WO[2], WO[3], WO[4]], leaf = [GR[0], GR[1], GR[2], GR[3], GR[4], LM[4]];
    for (let j = 0; j < 100; j++) { const w = 7 - j * 0.02 + (j < 8 ? (8 - j) * 0.6 : 0), lean = Math.sin(j * 0.07) * 2; for (let i = -w; i <= w; i++) { const u = i / w, t_ = pa_h2((cx + i) | 0, (yb - j) | 0, 3); b.px(cx + lean + i, yb - j, u > 0.4 ? bark[3] : u > -0.2 ? bark[2] : bark[1]); if (t_ < 0.18) b.px(cx + lean + i, yb - j, t_ < 0.09 ? ST[5] : bark[0]); } }
    for (const [dx, dy, r] of [[0, 128, 30], [-26, 112, 22], [26, 114, 24], [-14, 150, 24], [18, 150, 22], [0, 168, 18], [-32, 135, 14], [34, 138, 14]]) {
      for (let k = 0; k < r * r * 0.55; k++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * r, lx = cx + dx + Math.cos(a) * d, ly = yb - dy + Math.sin(a) * d * 0.85, l = (Math.cos(a) * 0.6 - Math.sin(a) * 0.8 + (rnd() - 0.5) * 0.9 - d / r * 0.3);
        const c = l > 0.55 ? leaf[5] : l > 0.3 ? leaf[4] : l > 0 ? leaf[3] : l > -0.3 ? leaf[2] : l > -0.6 ? leaf[1] : leaf[0];
        b.R(lx - 1, ly - 1, 3, 2, c);
      }
    }
    return { cv: b.done(), ox: cx, oy: yb, W, H };
  }
  if (kind === 'banc') {
    const W = 50, H = 30, b = new PaBuf(W, H), cx = 25, yb = H - 2;
    for (const sg of [-1, 1]) { b.R(cx + sg * 20 - 1, yb - 14, 3, 14, NI[1]); b.R(cx + sg * 20 - 3, yb - 2, 7, 2, NI[1]); }
    for (let j = 0; j < 3; j++) b.R(cx - 22, yb - 15 - j * 4, 45, 3, [WO[3], WO[2], WO[3]][j]); b.R(cx - 22, yb - 15, 45, 1, WO[5]);
    b.R(cx - 22, yb - 11, 45, 2, WO[3]); b.R(cx - 22, yb - 20, 45, 1, WO[5]);
    b.outline(NI[0]); return { cv: b.done(), ox: cx, oy: yb, W, H };
  }
  const W = 20, H = 34, b = new PaBuf(W, H), cx = 10, yb = H - 2;                                          // boîte aux lettres
  b.R(cx - 5, yb - 4, 10, 4, NI[1]); b.R(cx - 6, yb - 26, 12, 22, YE[1]); b.R(cx + 2, yb - 26, 4, 22, YE[2]); b.R(cx - 6, yb - 26, 2, 22, YE[0]);
  b.R(cx - 6, yb - 30, 12, 5, YE[2]); b.R(cx - 5, yb - 32, 10, 2, YE[1]); b.R(cx - 3, yb - 22, 6, 1, NI[0]); b.R(cx - 3, yb - 15, 6, 4, WH[2]);
  b.outline(NI[0]); return { cv: b.done(), ox: cx, oy: yb, W, H };
}
// pa_rue(t, o) : voir l'en-tête
function pa_rue(t, o = {}) {
  const env = o.env || 'matin', F = o.F ?? 362, layer = o.layer || 'all', cam = pa_fin(o.cam), light = (o.light ?? 1) < 0 ? -1 : 1, night = env === 'crepuscule', M = pa_mat({ env });
  const draw = (cv, ox, par) => { L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(cv, Math.round(-ox - cam * par), 0); };
  const items = o.items || [{ k: 'lamp', x: 36 }, { k: 'kiosk', x: 118 }, { k: 'morris', x: 212 }, { k: 'lamp', x: 262 }];
  const info = { F, wallY: F - 36, curbY: F, items: [] };
  if (layer === 'all' || layer === 'back') {
    draw(pa_cache(`rueB|${env}|${F}`, () => pa_buildRueBack(env, F)).cv, 60, 0.6);
    const gr = pa_cache(`rueG|${env}|${F}`, () => pa_buildRueGround(env, F)); draw(gr.cv, gr.ox, 1);
    // passants sur le trottoir
    const np = o.people ?? 4;
    for (let k = 0; k < np; k++) { const sp = (k % 2 ? -1 : 1) * (12 + (k * 5) % 9), per = 460, xx = (((t * sp + k * 131) % per) + per) % per - 95 - cam; pa_passant(xx, F - 8 - (k % 3) * 8, 0.95, t, { env, seed: 20 + k * 7, dir: sp > 0 ? 1 : -1, speed: Math.abs(sp), light }); }
    for (let k = 0; k < (o.pigeons ?? 3); k++) pa_pigeon(40 + k * 80 - cam + Math.sin(t * 0.4 + k) * 6, F + 10 + k * 16, 1.1, t, { env, seed: 3 + k, dir: k % 2 ? -1 : 1, light });
  }
  if (layer === 'all' || layer === 'mid') {
    for (const it of items) {
      const sp = pa_cache(`rueI|${env}|${it.k}`, () => pa_buildItem(it.k, env)), x = it.x - cam * 0.95, y = F - 8 + (it.dy || 0);
      L.save(); L.globalAlpha = 0.4; ell(x - light * 16, y + 1, 22, 3, night ? NI[0] : DU[1]); L.restore();
      L.drawImage(sp.cv, Math.round(x - sp.ox), Math.round(y - sp.oy));
      if (night && sp.glow) for (const g of sp.glow) rgrad(x - sp.ox + g[0], y - sp.oy + g[1], 2, 30, [[0, 'rgba(255,220,120,0.55)'], [1, 'rgba(255,180,80,0)']], 1 - 0.1 * Math.sin(t * 9 + it.x), 'lighter');
      info.items.push({ k: it.k, x, y });
    }
  }
  if (layer === 'all' || layer === 'front') {
    if (o.dust ?? 0) k_dust(t, { n: 20, x0: 0, x1: 270, y0: 100, y1: 400, cam, par: 0.9, seed: 4 });
  }
  return info;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 11. ÉCHAFAUDAGE ET PEINTRES SUSPENDUS
// ════════════════════════════════════════════════════════════════════════════════════════
// peintre de profil (dir = +1 regarde à droite), blouse blanche, casquette ; k = image du geste de pinceau (0..7) ; pose 'debout' | 'assis'
function pa_buildPainter(seed, dir, s, k, pose, env) {
  const night = env === 'crepuscule', W = Math.ceil(44 * s), H = Math.ceil(48 * s), b = new PaBuf(W, H), ox = Math.floor(W / 2) - Math.round(2 * s * dir), oy = H - 2;
  const X = v => ox + dir * v * s, Y = v => oy - v * s, Th = Math.max(1, Math.round(2 * s));
  const white = night ? [DU[2], DU[3], DU[4], DU[6]] : [ST[5], WH[0], WH[1], WH[3]], cap = [NI[2], ST[2], WO[2], GR[1]][Math.floor(pa_h(seed, 1) * 4)], skin = night ? SK[1] : SK[3];
  const sit = pose === 'assis', bob = Math.sin(k / 8 * TAU);
  // jambes
  if (sit) { b.line(X(0), Y(11), X(7), Y(11), white[1], Th + 1); b.line(X(7), Y(11), X(7.5), Y(3), white[1], Th + 1); b.R(Math.min(X(6.6), X(11)), Y(2), Math.round(4.4 * s), Math.round(2 * s), NI[0]); }
  else { b.line(X(-1), Y(14), X(-2), Y(2), white[0], Th + 1); b.line(X(2), Y(14), X(3), Y(2), white[1], Th + 1); b.R(Math.min(X(-3.4), X(0.4)), Y(1.4), Math.round(4.4 * s), Math.round(2 * s), NI[0]); b.R(Math.min(X(1.6), X(5.4)), Y(1.4), Math.round(4.4 * s), Math.round(2 * s), NI[0]); }
  // torse (blouse), un peu penché vers l'avant
  const yb = sit ? 11 : 14, lean = 1.4;
  b.poly([[X(-3.4), Y(yb + 1)], [X(3.6), Y(yb + 1)], [X(4.2 + lean), Y(yb + 15)], [X(-2.8 + lean), Y(yb + 15)]], white[1]);
  b.poly([[X(1.4), Y(yb + 1)], [X(3.6), Y(yb + 1)], [X(4.2 + lean), Y(yb + 15)], [X(1.8 + lean), Y(yb + 15)]], white[2]);
  b.R(Math.min(X(-3.4), X(3.6)), Y(yb + 6), Math.round(7 * s), 1, white[0]);                                   // ceinture de la blouse
  for (let i = 0; i < 5; i++) { const sx_ = -2 + pa_h(i, seed) * 6, sy = yb + 2 + pa_h(i, seed + 3) * 12; b.px(X(sx_), Y(sy), [OC[3], OC[2], RD[2], AM[6]][i % 4]); }       // éclaboussures
  // tête
  const hx = 1.2 + lean, hy = yb + 19.5;
  b.R(X(hx - 0.4), Y(yb + 16.4), Math.max(1, Math.round(1.6 * s)), Math.max(1, Math.round(1.8 * s)), skin);
  b.disc(X(hx + 0.4), Y(hy), Math.max(2, Math.round(2.6 * s)), skin); b.px(X(hx + 3.1), Y(hy - 0.4), skin); b.px(X(hx + 1.8), Y(hy + 0.6), NI[0]);
  b.R(Math.min(X(hx + 1.6), X(hx + 3.4)), Y(hy - 1.5), Math.max(1, Math.round(1.8 * s)), 1, WO[1]);               // moustache
  b.R(Math.min(X(hx - 2.2), X(hx + 3.6)), Y(hy + 3.4), Math.round(6 * s), Math.max(1, Math.round(2.2 * s)), cap); b.R(Math.min(X(hx + 3), X(hx + 6)), Y(hy + 2.6), Math.round(3 * s), 1, NI[0]);
  // bras et pinceau : épaule (1, yb+13), le bras monte et descend
  const sh = [1.5 + lean, yb + 12.6], ang = (-0.15 + 0.55 * (0.5 + 0.5 * bob)) * (sit ? 0.7 : 1) + 0.22, len = 11, hand = [sh[0] + Math.cos(ang) * len, sh[1] + Math.sin(ang) * len * 0.9];
  b.line(X(sh[0]), Y(sh[1]), X(hand[0]), Y(hand[1]), white[1], Th); b.line(X(sh[0]), Y(sh[1] + 0.8), X(hand[0]), Y(hand[1] + 0.8), white[0], 1); b.px(X(hand[0]), Y(hand[1]), skin);
  const bx = hand[0] + Math.cos(ang) * 8, by = hand[1] + Math.sin(ang) * 7;
  b.line(X(hand[0]), Y(hand[1]), X(bx), Y(by), WO[3], 1); b.R(Math.min(X(bx), X(bx + 3)), Y(by + 1.4), Math.max(2, Math.round(3.4 * s)), Math.max(2, Math.round(3 * s)), OC[3]); b.px(X(bx + 3), Y(by), OC[4]);
  // second bras : pot ou appui
  b.line(X(0.4), Y(yb + 11), X(-3.4), Y(yb + 4.5), white[0], Th);
  b.outline(NI[0]);
  return { cv: b.done(), ox, oy, W, H, brush: [hand[0] * dir, by] };
}
// pa_peintres(x, y, s, t, o) : voir l'en-tête
function pa_peintres(x, y, s, t, o = {}) {
  const env = o.env || 'matin', n = o.n ?? 2, sq = Math.round(s * 8) / 8, seed = o.seed ?? 1, sway = o.sway ?? 1, ropeTop = o.ropeTop ?? (y - 200 * sq), night = env === 'crepuscule', pl = Math.round(74 * sq), spd = o.rate ?? 1;
  const dx = Math.sin(t * 0.8 + seed) * 1.6 * sq * sway, ang = Math.sin(t * 0.8 + seed + 1.2) * 0.02 * sway;
  L.setTransform(1, 0, 0, 1, 0, 0);
  const xc = Math.round(x + dx), tilt = e => Math.round(e * pl / 2 * ang * 2);
  // cordes
  for (const sg of [-1, 1]) { const ex = xc + sg * Math.round(pl / 2 - 4 * sq), ey = Math.round(y + 2 * sq) + tilt(sg); lineP(x + sg * Math.round(pl / 2 - 4 * sq), ropeTop, ex, ey, night ? DU[4] : SK[2], 1); if ((ey - ropeTop) > 30) for (let q = 12; q < ey - ropeTop; q += 28) px(ex - (ex - (x + sg * (pl / 2 - 4 * sq))) * (1 - q / (ey - ropeTop)) * 0, ropeTop + q, WH[0]); }
  // planche
  const py = Math.round(y), th = Math.max(2, Math.round(3.2 * sq));
  R(xc - pl / 2, py + tilt(-1), pl, th, WO[3]); R(xc - pl / 2, py + tilt(-1), pl, 1, WO[5]); R(xc - pl / 2, py + th - 1 + tilt(-1), pl, 1, WO[1]);
  for (let q = -pl / 2 + 8; q < pl / 2; q += 14) R(xc + q, py + tilt(-1) + 1, 1, th - 2, WO[2]);
  R(xc - pl / 2 - 1, py + tilt(-1) - 1, 3, th + 3, WO[1]); R(xc + pl / 2 - 2, py + tilt(1) - 1, 3, th + 3, WO[1]);
  // peintres
  const out = [];
  for (let i = 0; i < n; i++) {
    const dir = o.dirs ? o.dirs[i] : (i % 2 ? -1 : 1), sit = o.poses ? o.poses[i] === 'assis' : (n > 2 && i === 2), k = Math.floor((((t * 1.3 * spd + pa_h(i + seed, 3) * 1.7) % 1) + 1) % 1 * 8) % 8;
    const sp = pa_cache(`pnt|${seed + i}|${dir}|${sq}|${k}|${sit}|${env}`, () => pa_buildPainter(seed + i * 3, dir, sq, k, sit ? 'assis' : 'debout', env));
    const px_ = Math.round(xc + (n === 1 ? 0 : (i - (n - 1) / 2) * (pl * 0.6 / Math.max(1, n - 1)) * (n === 2 ? 1.2 : 1)));
    L.drawImage(sp.cv, px_ - sp.ox, py + tilt(0) + 1 - sp.oy);
    out.push({ x: px_, y: py - 30 * sq, brush: [px_ + sp.brush[0] * sq * dir * 0 + (sp.brush[0]) * (dir > 0 ? 1 : 1) * sq * 0, py - sp.brush[1] * 1] , dir });
    // gouttes de peinture qui tombent du pinceau
    const ph = ((t * 0.7 + pa_h(i, seed + 9)) % 1);
    if (ph < 0.8) { const bx = px_ + dir * (sp.brush[0] * 1 + 0) , by = py - sp.brush[1] * 1 + 2 + ph * 40 * sq; if (ph > 0.05) { px(bx, by, OC[4]); px(bx, by - 1, OC[3]); } }
  }
  // pots, seau
  const potX = xc + (o.potSide ?? -1) * Math.round(pl * 0.36);
  for (let q = 0; q < 2; q++) { const cx = potX + q * Math.round(8 * sq) * (o.potSide ?? -1) * -1; R(cx - 3, py - 6 * sq, 7 * sq, 6 * sq, ST[3]); R(cx - 3, py - 6 * sq, 7 * sq, 1, ST[6]); R(cx - 2, py - 6 * sq, 5 * sq, 1, OC[3]); px(cx + 2, py - 8, WO[3]); R(cx + 3, py - 5 * sq, 1, 5 * sq, ST[2]); }
  return { x: xc, y: py, plankW: pl, painters: out };
}
// pa_echafaudage(x, y, w, h, t, o) : (x, y) = coin haut gauche ; poteaux, planchers, croix de Saint-André, échelle, bâche qui bat au vent
function pa_echafaudage(x, y, w, h, t, o = {}) {
  const env = o.env || 'matin', night = env === 'crepuscule', pw = Math.max(1, Math.round(w / 42)), levels = Math.max(1, Math.round(h / (o.pitch ?? 40))), ph = h / levels;
  const pole = night ? [NI[1], NI[2], NI[4]] : [WO[2], WO[3], WO[5]], plank = night ? [NI[2], NI[3]] : [WO[3], SK[2]];
  L.setTransform(1, 0, 0, 1, 0, 0);
  const xs = [x, x + Math.round(w * 0.5), x + w - pw];
  for (let k = 0; k < levels; k++) {                                                                       // croix de Saint-André entre les planchers
    const ya = y + k * ph, yb = ya + ph; lineP(x + pw, ya + 3, x + w - pw, yb, pole[0], 1); lineP(x + w - pw, ya + 3, x + pw, yb, pole[0], 1);
  }
  for (const px0 of xs) { R(px0, y, pw, h, pole[1]); R(px0 + pw - 1, y, 1, h, pole[2]); if (pw > 1) R(px0, y, 1, h, pole[0]); }
  for (let k = 0; k <= levels; k++) {                                                                      // planchers et garde-corps
    const yy = Math.round(y + k * ph), th = Math.max(2, Math.round(h / 60) + 1);
    R(x - 2, yy, w + 4, th, plank[0]); R(x - 2, yy, w + 4, 1, plank[1]); R(x - 2, yy + th, w + 4, 1, pole[0]);
    if (k < levels) { R(x, yy - Math.round(ph * 0.33), w, 1, pole[1]); }
    for (const px0 of xs) { px(px0 - 1, yy - 1, WH[0]); px(px0 + pw, yy + 1, WH[0]); }                    // nœuds de corde
  }
  // échelle
  const lx = x + Math.round(w * 0.74); for (let k = 0; k < levels; k++) { const ya = y + k * ph; R(lx, ya + 4, 1, ph - 2, pole[2]); R(lx + 5, ya + 4, 1, ph - 2, pole[2]); for (let q = 6; q < ph; q += 4) R(lx, ya + q, 6, 1, pole[1]); }
  // bâche sur le niveau haut
  if (o.tarp ?? 1) {
    const ty = y + Math.round(ph * 0.1), th2 = Math.round(ph * 0.8), tx = x + 2, tw = Math.round(w * 0.46);
    for (let i = 0; i < tw; i++) { const flap = Math.sin(t * 2.6 + i * 0.35) * 1.4 * (i / tw), c = (i % 7 < 2) ? WH[0] : WH[1]; R(tx + i, ty + flap, 1, th2 + flap * 0.5, c); if (i % 7 === 0) R(tx + i, ty + flap, 1, th2 + flap * 0.5, ST[6]); }
    R(tx, ty - 1, tw, 1, WO[3]);
  }
  return { x, y, w, h, levels };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 12. GROS PLAN SUR LA FERRONNERIE
// ════════════════════════════════════════════════════════════════════════════════════════
// tuile de treillis (cellule T × T : montant à gauche, entretoise en haut, deux diagonales, goussets, rivets) ; fresh = peinture neuve
function pa_buildLatTile(env, T, bar, fresh, hazeA) {
  const night = env === 'crepuscule', b = new PaBuf(T, T), pw = bar, bw = Math.round(bar * 0.8), dw = Math.max(2, Math.round(bar * 0.62));
  const tone = fresh ? (night ? [NI[0], NI[1], DU[1], DU[2], DU[3]] : [WO[3], OC[2], OC[3], OC[4], OC[5]]) : (night ? [NI[0], NI[0], NI[1], DU[0], DU[1]] : [WO[0], WO[1], WO[1], WO[2], OC[1]]);
  const rim = night ? DU[4] : fresh ? AM[9] : AM[7], rivD = night ? NI[0] : WO[0], rivL = night ? DU[3] : fresh ? AM[8] : OC[3], R2 = Math.SQRT1_2;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    let c = -1;
    const e1 = (x - y) * R2, e2 = (x + y - T) * R2, e3 = (x + y - 2 * T) * R2;                          // diagonales (la dernière referme la maille de bord)
    if (x < pw) { const u = x / pw; c = u < 0.2 ? 0 : u < 0.62 ? 1 : u < 0.9 ? 2 : 4; if (x === pw - 1) c = 5; }
    else if (y < bw) { const u = y / bw; c = u < 0.15 ? 5 : u < 0.45 ? 4 : u < 0.8 ? 2 : 0; }
    else {
      for (const e of [e1, e2, e3]) if (Math.abs(e) < dw / 2) { const u = (e + dw / 2) / dw; const c0 = u < 0.2 ? 0 : u < 0.6 ? 2 : u < 0.88 ? 3 : 5; if (c < 0 || c0 > c) c = c0; }
    }
    if (c < 0) continue;
    b.px(x, y, c === 5 ? rim : tone[Math.min(4, c)]);
  }
  // goussets aux nœuds + rivets
  const gus = (cx, cy, sz) => { b.R(cx - sz, cy - sz, sz * 2, sz * 2, tone[2]); b.R(cx - sz, cy - sz, sz * 2, 1, tone[4]); b.R(cx - sz, cy - sz, 1, sz * 2, tone[1]); b.R(cx + sz - 1, cy - sz + 1, 1, sz * 2 - 1, tone[0]); b.R(cx - sz + 1, cy + sz - 1, sz * 2 - 1, 1, tone[0]);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const rx = cx + dx * (sz - 2), ry = cy + dy * (sz - 2); b.px(rx, ry, rivD); b.px(rx - 1, ry - 1, rivL); } };
  const gs = Math.max(3, Math.round(bar * 0.85));
  gus(T >> 1, T >> 1, gs); gus(pw >> 1, bw >> 1, Math.max(3, gs - 1));
  for (let q = pw + 6; q < T - 6; q += Math.max(5, Math.round(bar * 0.9))) if (Math.abs(q - T / 2) > gs + 1) { b.px(q, bw >> 1, rivD); b.px(q - 1, (bw >> 1) - 1, rivL); }
  for (let q = bw + 6; q < T - 4; q += Math.max(5, Math.round(bar * 0.9))) if (Math.abs(q - T / 2) > gs + 1) { b.px(pw >> 1, q, rivD); b.px((pw >> 1) - 1, q - 1, rivL); }
  // usure : rouille et écailles (ancien) ou reflets de peinture fraîche
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    if (!(b.d[y * T + x] >>> 24)) continue; const r = pa_h2(x, y, fresh ? 5 : 3);
    if (!fresh && r < 0.07) b.px(x, y, r < 0.03 ? RD[1] : OC[1]); else if (!fresh && r > 0.965) b.px(x, y, OC[3]); else if (fresh && r > 0.97) b.px(x, y, AM[8]);
  }
  if (hazeA > 0) b.haze(pa_u32(PA_ENV[env].mistFar), hazeA, hazeA);
  return b.done();
}
function pa_latLayer(cv, T, par, cam, camY, ox = 0, oy = 0) {
  const sx = (((-cam * par + ox) % T) + T) % T - T, sy = (((-camY * par + oy) % T) + T) % T - T;
  L.setTransform(1, 0, 0, 1, 0, 0);
  for (let y = sy; y < LH; y += T) for (let x = sx; x < LW; x += T) L.drawImage(cv, Math.round(x), Math.round(y));
}
// montant d'avant-plan : colonne de fer à double T avec rivets, en contre-jour
function pa_buildChord(env, w, hh) {
  const night = env === 'crepuscule', b = new PaBuf(w, hh), tone = night ? [NI[0], NI[0], NI[1], DU[0], DU[1]] : [WO[0], WO[1], WO[2], OC[1], OC[2]], rim = night ? DU[5] : AM[9], fl = Math.round(w * 0.22);
  for (let x = 0; x < w; x++) for (let y = 0; y < hh; y++) {
    const u = x / w, web = x > fl && x < w - fl;
    let c = u < 0.12 ? 0 : u < 0.5 ? 1 : u < 0.8 ? 2 : u < 0.95 ? 3 : 4;
    if (web) c = Math.min(c, 2) - (x < w * 0.5 ? 1 : 0);
    if (x === w - 1 || (!web && x === w - fl - 1 && false)) c = 5;
    b.px(x, y, c === 5 ? rim : tone[Math.max(0, c)]);
  }
  b.R(0, 0, 1, hh, tone[0]); b.R(w - 2, 0, 1, hh, tone[4]); b.R(w - 1, 0, 1, hh, rim);
  b.R(fl - 1, 0, 1, hh, tone[0]); b.R(w - fl, 0, 1, hh, tone[3]);                                          // arêtes de l'âme
  for (let y = 5; y < hh; y += 14) for (const x of [fl >> 1, w - (fl >> 1) - 1]) { b.disc(x, y, 1, tone[3]); b.px(x - 1, y - 1, rim); b.px(x + 1, y + 1, tone[0]); }
  for (let y = 0; y < hh; y += 48) { b.R(0, y, w, 3, tone[3]); b.R(0, y, w, 1, rim); b.R(0, y + 3, w, 1, tone[0]); }      // joints de plaques
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) { const r = pa_h2(x, y, 11); if (r < 0.025) b.px(x, y, tone[0]); else if (r > 0.985) b.px(x, y, tone[4]); }
  return b.done();
}
// pa_tourDetail(t, o) : voir l'en-tête
function pa_tourDetail(t, o = {}) {
  const env = o.env || 'matin', cam = pa_fin(o.cam), camY = pa_fin(o.camY), night = env === 'crepuscule', E = pa_env(o);
  const out = {};
  // 1. ciel et ville au loin
  if (o.sky !== false) {
    const c = pa_ciel(t, { env, h: o.h ?? 300, clouds: o.clouds ?? 3, cam: cam * 0.1, camY: camY * 0.1, cloudScale: 1.4, cloudSpeed: 4 });
    pa_toits(t, { env, layers: ['far'], y: (o.h ?? 300) + 24, cam: cam * 0.15, smoke: 0, dfar: 80 });
    if (o.haze !== false) k_haze(300, 480, E.mist, 0.5, { profile: 'top', cam: cam * 0.2, par: 0.3, t, seed: 3, wisp: 0.4 });
    out.sun = c.sun;
  }
  // 2. treillis lointain (autre face de la tour), brumeux
  const tb = pa_cache(`latB|${env}`, () => pa_buildLatTile(env, 48, 4, false, 0.55));
  pa_latLayer(tb, 48, 0.25 * 0 + cam, camY, 0.25, 0, 7);
  // 3. treillis moyen, ancien puis peinture fraîche (jusqu'à o.freshY)
  const tm = pa_cache(`latM|${env}`, () => pa_buildLatTile(env, 96, 9, false, 0)), tf = pa_cache(`latF|${env}`, () => pa_buildLatTile(env, 96, 9, true, 0));
  pa_latLayer(tm, 96, 0.55, cam, camY, 10, 30);
  const fy = o.freshY ?? 0;
  if (fy > 0) { L.save(); L.beginPath(); L.rect(0, 0, LW, Math.min(LH, fy)); L.clip(); pa_latLayer(tf, 96, 0.55, cam, camY, 10, 30); L.restore(); R(0, Math.min(LH - 2, fy), LW, 2, night ? DU[4] : AM[9]); if (!night) R(0, Math.min(LH - 1, fy + 2), LW, 1, OC[4]); }
  // 4. échafaudage, nacelle et peintres au plan moyen
  const mx = -cam * 0.55, my = -camY * 0.55;
  if (o.scaffold ?? 1) pa_echafaudage((o.sx ?? 150) + mx, (o.sy ?? 60) + my, 96, 230, t, { env });
  if (o.peintres ?? 1) { const r = pa_peintres((o.px ?? 92) + mx, (o.py ?? 292) + my, o.ps ?? 1.5, t, { env, n: 2, seed: 2, ropeTop: -40 }); out.peintres = r; }
  // 5. montant d'avant-plan, poutre, rivets
  const ch = pa_cache(`chord|${env}`, () => pa_buildChord(env, 54, 192));
  const fx = (o.chordX ?? -14) - cam * 1.0, fyy = -camY * 1.0;
  for (let y = ((fyy % 192) + 192) % 192 - 192; y < LH; y += 192) L.drawImage(ch, Math.round(fx), Math.round(y));
  if (o.beam ?? 1) {
    const by = (o.beamY ?? 428) - camY, bh = 34;
    const tone = night ? [NI[0], NI[0], NI[1], DU[0], DU[1]] : [WO[0], WO[1], WO[2], OC[1], OC[2]];
    R(0, by, LW, bh, tone[1]); R(0, by, LW, 3, night ? DU[5] : AM[9]); R(0, by + 3, LW, 3, tone[4]); R(0, by + 6, LW, 10, tone[2]); R(0, by + 16, LW, 12, tone[1]); R(0, by + 28, LW, 6, tone[0]);
    for (let x = ((-cam * 1.1) % 24 + 24) % 24 - 24; x < LW; x += 24) { disc(x + 10, by + 10, 2, tone[3]); px(x + 9, by + 9, night ? DU[5] : AM[9]); disc(x + 10, by + 24, 2, tone[0]); }
    out.beamY = by;
  }
  // 6. particules : poussière dorée dans les rayons, pigeon qui passe
  if (o.dust ?? 1) { k_rays(E.sun ? E.sun[0] + 40 : 220, 120, t, { angle: Math.PI * 0.62, spread: 1.1, len: 360, n: 6, strength: 0.28, seed: 4 }); k_dust(t, { n: 34, x0: 0, x1: 270, y0: 40, y1: 440, cam, par: 0.9, seed: 12 }); }
  if (o.pigeon ?? 1) { const per = 14, ph = ((t / per) % 1); pa_pigeon(280 - ph * 360, 90 + Math.sin(ph * 9) * 8, 1.6, t, { env, mode: 'fly', dir: -1, seed: 5, shadow: 0 }); }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 13. LE PIED DE LA TOUR VU D'EN BAS, FOULE MINUSCULE
// ════════════════════════════════════════════════════════════════════════════════════════
// pa_foule(x0, x1, y, t, o) : n minuscules silhouettes (3 à 9 px) qui marchent entre x0 et x1, le long de la ligne y ; o : n (14), h (hauteur en px, 6), speed (px/s), seed, env, light
function pa_foule(x0, x1, y, t, o = {}) {
  const n = o.n ?? 14, h = o.h ?? 6, env = o.env || 'matin', night = env === 'crepuscule', span = x1 - x0, seed = o.seed ?? 1, light = (o.light ?? 1) < 0 ? -1 : 1;
  L.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const dir = pa_h(i, seed) < 0.5 ? -1 : 1, sp = (o.speed ?? 7) * (0.6 + 0.8 * pa_h(i, seed + 1)), xx = x0 + ((((pa_h(i, seed + 2) * span + t * sp * dir) % span) + span) % span), yy = y + (pa_h(i, seed + 3) - 0.5) * (o.depth ?? 0), hh = Math.max(3, Math.round(h * (0.8 + 0.4 * pa_h(i, seed + 4)))), step = Math.floor(t * sp * 0.5 + i) & 1;
    const coat = night ? NI[Math.floor(1 + pa_h(i, seed + 5) * 3)] : PA_COATS[Math.floor(pa_h(i, seed + 5) * PA_COATS.length)][pa_h(i, seed + 6) < 0.5 ? 1 : 0];
    const x = Math.round(xx), y1 = Math.round(yy);
    if (hh >= 5) { R(x - 1, y1 - hh + 2, 3, hh - 3, coat); px(x, y1 - hh + 1, night ? SK[1] : SK[3]); if (pa_h(i, seed + 7) < 0.5) px(x, y1 - hh, NI[1]); R(x - (step ? 1 : 0), y1 - 1, 1, 1, NI[0]); R(x + (step ? 1 : 0), y1 - 1, 1, 1, NI[0]); px(x + light, y1 - hh + 3, night ? DU[3] : WH[1]); }
    else { R(x, y1 - hh + 1, 2, hh - 1, coat); px(x, y1 - hh, SK[3]); if (step) px(x + 1, y1, NI[0]); else px(x, y1, NI[0]); }
  }
}
// cadre en perspective : lignes entre points (u, v) d'un quadrilatère haut-gauche, haut-droit, bas-droit, bas-gauche
function pa_quadPt(q, u, v) { const xl = lerp(q[0][0], q[3][0], v), xr = lerp(q[1][0], q[2][0], v), y = lerp(q[0][1], q[3][1], v); return [lerp(xl, xr, u), y]; }
function pa_buildPiedLeg(b, q, env, side, W) {                           // un pied de la tour vu d'en bas : membrures, entretoises, croix, rivets
  const night = env === 'crepuscule', tone = night ? [NI[0], NI[0], NI[1], DU[0], DU[2]] : [WO[0], WO[1], WO[2], OC[1], OC[3]], rim = night ? DU[5] : AM[9];
  b.polyG([q[0], q[1], q[2], q[3]], [tone[0], tone[1], tone[1], tone[2]], 0.0, 1.1, false);
  // fond ajouré : fines croix serrées
  const nr = 11, vs = []; for (let k = 0; k <= nr; k++) vs.push(Math.pow(k / nr, 1.28));
  for (let k = 0; k < nr; k++) {
    const va = vs[k], vb = vs[k + 1], a0 = pa_quadPt(q, 0, va), a1 = pa_quadPt(q, 1, va), b0 = pa_quadPt(q, 0, vb), b1 = pa_quadPt(q, 1, vb), wdt = Math.max(1, Math.round((b1[0] - b0[0]) / 12));
    const m0 = pa_quadPt(q, 0.5, (va + vb) / 2);
    b.line(a0[0], a0[1], b1[0], b1[1], tone[3], wdt); b.line(a1[0], a1[1], b0[0], b0[1], tone[2], wdt);
    b.line(a0[0], a0[1], a1[0], a1[1], tone[3], Math.max(2, wdt + 1)); b.line(a0[0], a0[1] + 1, a1[0], a1[1] + 1, tone[0], 1);
    // fine croix intérieure (deuxième face du treillis)
    const c0 = pa_quadPt(q, 0.25, (va + vb) / 2), c1 = pa_quadPt(q, 0.75, (va + vb) / 2);
    b.line(a0[0] + 2, a0[1], c1[0], c1[1], tone[1], 1); b.line(a1[0] - 2, a1[1], c0[0], c0[1], tone[1], 1); b.line(c0[0], c0[1], b0[0] + 2, b0[1], tone[1], 1); b.line(c1[0], c1[1], b1[0] - 2, b1[1], tone[1], 1);
    for (const u of [0.04, 0.96]) { const r_ = pa_quadPt(q, u, va); b.px(r_[0], r_[1] + 1, tone[4]); }
  }
  // montants : deux gros fers (côté jour clair à droite)
  for (const [u0, u1, tn] of [[0, 0.1, [tone[1], tone[2]]], [0.9, 1, [tone[3], rim]]]) {
    for (let k = 0; k < 200; k++) { const v = k / 199, a = pa_quadPt(q, u0, v), c = pa_quadPt(q, u1, v); b.line(a[0], a[1], c[0], c[1], tn[0], 1); }
  }
  for (let k = 0; k < 200; k++) { const v = k / 199, p1 = pa_quadPt(q, 1, v), p0 = pa_quadPt(q, 0, v); b.px(p1[0], p1[1], rim); b.px(p1[0] - 1, p1[1], tone[4]); b.px(p0[0], p0[1], tone[0]); }
  // rivets des montants
  for (let k = 1; k < nr * 3; k++) { const v = Math.pow(k / (nr * 3), 1.28), a = pa_quadPt(q, 0.045, v), c = pa_quadPt(q, 0.955, v); b.px(a[0], a[1], tone[0]); b.px(c[0], c[1], tone[4]); }
}
function pa_buildPiedMid(env, F) {                                      // pieds, arche, dessous de la plateforme, sol, ombres (largeur 350, origine x = −40)
  const W = 350, ox = 40, b = new PaBuf(W, LH), night = env === 'crepuscule', M = pa_mat({ env }), hy = F - 22, cxm = ox + 135;
  const tone = night ? [NI[0], NI[0], NI[1], DU[0], DU[2]] : [WO[0], WO[1], WO[2], OC[1], OC[3]], rim = night ? DU[5] : AM[9];
  // sol : allée de sable vers l'horizon, pelouses, bordures
  const sand = night ? [NI[2], NI[3], NI[4]] : env === 'soir' ? [DU[4], OC[4], OC[5]] : [SK[2], SK[3], SK[4]], lawn = night ? [NI[1], NI[2], GR[0]] : [GR[2], GR[3], GR[4]];
  for (let y = hy; y < LH; y++) {
    const f = (y - hy) / (LH - hy), half = 10 + f * 150, xl = cxm - half, xr = cxm + half;
    b.R(0, y, W, 1, lawn[Math.min(2, Math.floor(f * 2.4))]); b.R(xl, y, xr - xl, 1, sand[f < 0.3 ? 0 : f < 0.7 ? 1 : 2]);
    for (let x = 0; x < W; x++) if ((x < xl || x > xr) && pa_bay(x, y) < 0.3 + f * 0.2) b.px(x, y, lawn[0]);
    if (Math.abs(x_ => 0)) { }
  }
  for (let y = hy; y < LH; y++) for (let x = 0; x < W; x++) if (b.d[y * W + x] && pa_h2(x, y, 6) < 0.05 && x > cxm - 160 && x < cxm + 160) b.px(x, y, sand[0]);
  // arbres de l'allée (rangées qui fuient) et horizon lointain
  for (let k = 0; k < 7; k++) { const f = Math.pow(k / 7, 1.4), y = hy + 2 + f * 74, xs = 16 + f * 135, sz = 4 + f * 20; for (const sg of [-1, 1]) { const x = cxm + sg * xs; b.R(x - 1, y - sz * 0.3, Math.max(1, sz * 0.14), sz * 0.3, WO[2]); b.ell(x, y - sz * 0.8, sz * 0.45, sz * 0.8, GR[2]); b.ell(x + sz * 0.1, y - sz * 0.95, sz * 0.32, sz * 0.5, GR[3]); } }
  // arche (plein cintre) et poutres du plateau
  const q1 = [[ox + 56, 108], [ox + 99, 108], [ox + 84, F + 8], [ox + 5, F + 8]], q2 = [[ox + 171, 108], [ox + 214, 108], [ox + 265, F + 8], [ox + 186, F + 8]];
  // arche : bande treillissée (deux courbes et zigzag), elle s'appuie sur la face intérieure des pieds
  const cxA = (q1[1][0] + q2[0][0]) / 2, A = (q2[0][0] - q1[1][0]) / 2 + 30, cyA = 276, B = cyA - 150, th = 11;
  {
    const N = 64, out_ = [], in_ = [];
    for (let i = 0; i <= N; i++) { const r = Math.PI * i / N; out_.push([cxA - Math.cos(r) * A, cyA - Math.sin(r) * B]); in_.push([cxA - Math.cos(r) * (A - th), cyA - Math.sin(r) * (B - th)]); }
    for (let i = 0; i < N; i++) {
      b.line(out_[i][0], out_[i][1], in_[i][0], in_[i][1], tone[1], 1);
      b.line(out_[i][0], out_[i][1], in_[i + 1][0], in_[i + 1][1], tone[2], 1); b.line(in_[i][0], in_[i][1], out_[i + 1][0], out_[i + 1][1], tone[3], 1);
    }
    for (let i = 0; i < N; i++) {
      b.line(out_[i][0], out_[i][1], out_[i + 1][0], out_[i + 1][1], tone[3], 3); b.line(out_[i][0], out_[i][1] - 2, out_[i + 1][0], out_[i + 1][1] - 2, i > N / 2 ? rim : tone[4], 1);
      b.line(in_[i][0], in_[i][1], in_[i + 1][0], in_[i + 1][1], tone[1], 2);
    }
  }
  // pieds
  pa_buildPiedLeg(b, q1, env, -1, W); pa_buildPiedLeg(b, q2, env, 1, W);
  // dessous de la première plateforme
  b.R(0, 0, W, 112, tone[1]);
  for (let y = 0; y < 112; y++) for (let x = 0; x < W; x++) if (pa_bay(x + 1, y) < 0.22 + 0.4 * (1 - y / 112)) b.px(x, y, 0);
  const bar = (x0, y0, x1, y1, th, c) => b.line(x0, y0, x1, y1, c, th);
  for (let x = -20; x < W + 20; x += 38) { bar(x, 0, x + 38, 100, 3, tone[2]); bar(x + 38, 0, x, 100, 3, tone[3]); bar(x + 1, 0, x + 39, 100, 1, tone[4]); }
  bar(0, 30, W, 30, 3, tone[3]); bar(0, 68, W, 68, 4, tone[2]); bar(0, 68, W, 68, 1, rim);
  b.R(0, 100, W, 14, tone[2]); b.R(0, 100, W, 2, rim); b.R(0, 102, W, 3, tone[4]); b.R(0, 110, W, 4, tone[0]);
  for (let x = 4; x < W; x += 9) { b.disc(x, 106, 1, tone[0]); b.px(x - 1, 105, rim); }                          // frise et rivets de la poutre-plateforme

  // massifs de maçonnerie
  for (const [q, sg] of [[q1, -1], [q2, 1]]) { const xa = q[3][0] - 6, xb = q[2][0] + 6; b.R(xa, F - 20, xb - xa, 30, M.stone[2]); b.R(xa, F - 20, xb - xa, 2, M.stone[3]); b.R(xa, F - 18, 4, 28, M.stone[1]); b.R(xb - 3, F - 18, 3, 28, M.stone[4]); for (let j = F - 14; j < F + 10; j += 8) b.R(xa, j, xb - xa, 1, M.stone[1]); }
  // escalier de fer dans le pied gauche et rampe
  const sx0 = q1[2][0] - 2, sy0 = F - 22; for (let k = 0; k < 17; k++) { const x = sx0 - k * 2.2, y = sy0 - k * 5.4; b.R(x - 7, y, 10, 2, tone[3]); b.R(x - 7, y, 10, 1, rim); b.px(x - 7, y + 2, tone[0]); }
  b.line(sx0 + 1, sy0 - 6, sx0 - 36, sy0 - 96, tone[4], 1); b.line(sx0 - 10, sy0 - 6, sx0 - 44, sy0 - 96, tone[3], 1);
  // ombres portées au sol : deux bandes qui s'étirent vers nous et vers la gauche, lattis en diagonale
  const shc = night ? NI[0] : DU[2];
  for (const [q, sg] of [[q1, -1], [q2, 1]]) {
    const x0 = q[3][0] + 2, x1 = q[2][0] - 2;
    for (let y = F + 12; y < LH; y++) { const f = (y - F - 12) / (LH - F - 12), dx = -f * 120, xa = x0 + dx - f * 6, xb = x1 + dx + f * 26; for (let x = Math.round(xa); x < xb; x++) { const diag = (((x + y) % 11) + 11) % 11; if (pa_bay(x, y) < 0.7 - f * 0.25 - (diag < 4 ? 0.25 : 0)) b.px(x, y, shc); } }
  }
  return { cv: b.done(), ox, W, q1, q2, A, cxA, cyA, B };
}
function pa_buildPiedFar(env, F) {
  const W = 330, ox = 30, b = new PaBuf(W, LH), M = pa_mat({ env }), hy = F - 22;
  // bâtiments lointains très brumeux (Ecole militaire, toits) sous l'horizon
  const rnd = rng(5); let x = 0;
  while (x < W) { const w = 14 + Math.floor(rnd() * 22), h = 6 + Math.floor(rnd() * 14); b.R(x, hy - h, w, h + 2, M.stoneB[2]); b.R(x, hy - h, w, 1, M.stoneB[3]); for (let i = 3; i < w - 2; i += 4) b.px(x + i, hy - h + 3, M.glass[1]); b.poly([[x, hy - h], [x + 3, hy - h - 3], [x + w - 3, hy - h - 3], [x + w, hy - h]], M.zinc[2]); x += w; }
  b.haze(pa_u32(M.mistFar), 0.7, 0.8);
  return { cv: b.done(), ox, W };
}
function pa_buildPiedFront(env, F) {                                    // guichet, barrières de file d'attente
  const W = 350, ox = 40, b = new PaBuf(W, LH), M = pa_mat({ env }), night = env === 'crepuscule';
  // guichet : cabine de bois, toit incliné, fenêtre grillagée, enseigne
  const gx = ox + 196, gy = F - 4, gw = 50, gh = 56;
  b.R(gx, gy - gh, gw, gh, WO[2]); b.R(gx, gy - gh, gw, 2, WO[4]); b.R(gx + gw - 4, gy - gh + 2, 4, gh - 2, WO[4]); b.R(gx, gy - gh + 2, 4, gh - 2, WO[1]);
  for (let q = 0; q < gh; q += 6) b.R(gx + 5, gy - q - 3, gw - 10, 1, WO[1]);
  b.R(gx + 9, gy - 44, 32, 22, NI[0]); b.R(gx + 10, gy - 43, 30, 20, night ? AM[6] : NI[5]); for (let q = 12; q < 40; q += 3) b.R(gx + q - 1, gy - 43, 1, 20, NI[1]); b.R(gx + 10, gy - 33, 30, 1, NI[1]);
  b.R(gx + 9, gy - 22, 32, 3, WO[4]);
  b.poly([[gx - 6, gy - gh], [gx + gw + 6, gy - gh], [gx + gw - 2, gy - gh - 12], [gx + 2, gy - gh - 12]], RD[2]); b.R(gx - 6, gy - gh, gw + 12, 2, RD[0]); b.R(gx + 2, gy - gh - 12, gw - 4, 2, RD[4]);
  b.R(gx + 8, gy - gh - 9, 34, 8, WO[0]); b.text('GUICHET', gx + 25 - Math.round(textW('GUICHET', 1) / 2), gy - gh - 8, YE[2], 1);
  b.outline(NI[0]);
  // potelets et cordons
  for (let k = 0; k < 6; k++) { const px_ = ox + 36 + k * 30; b.R(px_, F + 30 + 0, 2, 16, NI[1]); b.disc(px_ + 1, F + 29, 2, YE[1]); b.px(px_ + 1, F + 28, YE[3]);
    if (k) { const x0 = px_ - 28; for (let q = 0; q < 28; q++) { const sag = Math.sin(q / 28 * Math.PI) * 4; b.px(x0 + 2 + q, F + 33 + sag, RD[2]); b.px(x0 + 2 + q, F + 34 + sag, RD[1]); } } }
  return { cv: b.done(), ox, W };
}
// pa_tourPied(t, o) : voir l'en-tête
function pa_tourPied(t, o = {}) {
  const env = o.env || 'matin', F = o.F ?? 410, cam = pa_fin(o.cam), light = (o.light ?? 1) < 0 ? -1 : 1, night = env === 'crepuscule', E = pa_env(o);
  const c = pa_ciel(t, { env, h: F - 22, clouds: o.clouds ?? 4, cloudY0: 150, cloudY1: 330, cam: cam * 0.1, sunX: o.sunX ?? 150, sunDy: o.sunDy ?? 40, rays: 0.5, cloudScale: 1.3 });
  const fa = pa_cache(`piedF|${env}|${F}`, () => pa_buildPiedFar(env, F)), md = pa_cache(`piedM|${env}|${F}`, () => pa_buildPiedMid(env, F)), fr = pa_cache(`piedR|${env}|${F}`, () => pa_buildPiedFront(env, F));
  L.setTransform(1, 0, 0, 1, 0, 0);
  L.drawImage(fa.cv, Math.round(-fa.ox - cam * 0.15), 0);
  if (o.haze ?? 1) k_haze(F - 60, F - 10, E.mist, 0.45, { profile: 'mid', cam: cam * 0.2, par: 0.3, t, seed: 2, wisp: 0.4 });
  // rayons de soleil sous l'arche
  if (o.rays ?? 1) k_rays(c.sun ? c.sun[0] : 150, c.sun ? c.sun[1] : 300, t, { angle: Math.PI * 0.5 + 0.12, spread: 1.0, len: 340, n: 7, strength: 0.34, seed: 6, cam, par: 0.3 });
  // foule minuscule au loin sous l'arche, puis au pied des massifs
  pa_foule(70 - cam * 0.4, 200 - cam * 0.4, F - 18, t, { n: 16, h: 4, speed: 4, seed: 3, env, depth: 8, light });
  L.drawImage(md.cv, Math.round(-md.ox - cam * 0.5), 0);
  pa_foule(10 - cam * 0.5, 262 - cam * 0.5, F + 14, t, { n: 12, h: 7, speed: 6, seed: 9, env, depth: 12, light });
  L.drawImage(fr.cv, Math.round(-fr.ox - cam), 0);
  pa_foule(20 - cam, 240 - cam, F + 44, t, { n: 7, h: 9, speed: 8, seed: 21, env, depth: 10, light });
  // pigeons au sol, poussière dans le jour
  for (let k = 0; k < (o.pigeons ?? 3); k++) pa_pigeon(60 + k * 70 - cam + Math.sin(t * 0.5 + k) * 5, F + 66 + k * 12, 1.4, t, { env, seed: 7 + k, dir: k % 2 ? -1 : 1, light });
  if (o.dust ?? 1) k_dust(t, { n: 28, x0: 0, x1: 270, y0: 120, y1: 440, cam, par: 0.8, seed: 6 });
  return { F, groundY: F + 70, sun: c.sun, guichet: [236 - cam, F - 4, 50], archTop: 134 };
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 14. TRAIN À VAPEUR : locomotive Pacific, tender, voitures à compartiments
// ════════════════════════════════════════════════════════════════════════════════════════
// Coordonnées de conception : u = distance en arrière du tampon avant (px à s = 1), h = hauteur au-dessus du rail. Locomotive 0 → 146, tender 148 → 216, voitures de 120 px.
const PA_LOCO = { drivers: [62, 88, 114], rd: 17, bogie: [16, 33], rb: 7, trail: 136, rt: 9, tender: [160, 182, 204], rte: 8, len: 146, tlen: 216, carLen: 122, gap: 3 };
function pa_buildLoco(env, s, dir) {
  const night = env === 'crepuscule', D = PA_LOCO, W = Math.ceil((D.tlen + 26) * s), H = Math.ceil(100 * s), b = new PaBuf(W, H), oy = H - 2;
  const X = u => dir > 0 ? W - 12 * s - u * s : 12 * s + u * s, Y = h => oy - h * s, P = pts => pts.map(p => [X(p[0]), Y(p[1])]);
  const R_ = (u0, h0, u1, h1, c) => b.R(Math.min(X(u0), X(u1)), Y(Math.max(h0, h1)), Math.max(1, Math.abs(X(u1) - X(u0))), Math.max(1, Math.abs(Y(h0) - Y(h1))), c);
  const blk = night ? [NI[0], NI[0], NI[1], DU[1], DU[3]] : [NI[0], GR[0], GR[1], GR[2], GR[4]], brass = night ? [DU[0], DU[2], DU[4], AM[6], AM[8]] : [AM[3], AM[5], AM[7], AM[9], AM[10]], steel = night ? [NI[1], NI[2], NI[3], NI[5], DU[4]] : [ST[1], ST[3], ST[5], ST[6], ST[7]];
  const lit = dir > 0 ? 1 : -1;
  // châssis
  R_(2, 17, 142, 28, NI[1]); R_(2, 26, 142, 28, steel[0]);
  // cylindres, tiroir, longeron
  R_(10, 14, 36, 31, steel[1]); R_(10, 29, 36, 31, steel[3]); R_(14, 31, 32, 37, steel[0]); R_(10, 14, 12, 31, steel[3]);
  // chaudière : cylindre ombré
  b.polyG(P([[4, 30], [4, 56], [10, 62], [104, 62], [104, 30]]), [blk[0], blk[2], blk[3], blk[4]], 0.24, 0.6);
  for (const u of [28, 46, 64, 82, 98]) { R_(u, 31, u + 3, 61, brass[1]); R_(u, 60, u + 3, 61, brass[3]); R_(u, 31, u, 61, brass[0]); }
  // boîte à fumée et porte
  b.polyG(P([[2, 30], [2, 60], [8, 66], [26, 66], [26, 30]]), [blk[0], blk[0], blk[1], blk[3]], 0.25, 0.7);
  b.disc(X(5), Y(47), Math.round(11 * s), steel[2]); b.disc(X(5), Y(47), Math.round(9 * s), blk[0]); b.disc(X(5), Y(47), Math.round(2 * s), steel[3]);
  R_(1, 45, 3, 49, brass[3]);
  // cheminée à jupe évasée et chapeau de cuivre
  b.poly(P([[10, 66], [21, 66], [20, 82], [23, 92], [8, 92], [11, 82]]), blk[1]); b.poly(P([[17, 66], [21, 66], [20, 82], [23, 92], [18, 92]]), blk[3]); R_(7, 90, 24, 94, brass[2]); R_(7, 93, 24, 94, brass[4]); R_(7, 90, 24, 90, brass[0]);
  // lanterne de tête
  R_(2, 66, 8, 74, NI[1]); R_(3, 67, 7, 73, night ? AM[9] : AM[10]); R_(2, 74, 8, 75, brass[1]);
  // dômes : sablier (noir/laiton), dôme de vapeur (laiton), soupapes
  for (const [u, hh, r, col] of [[44, 8, 7, blk], [70, 11, 8, brass], [88, 6, 4, brass]]) { b.polyG(P([[u - r, 62], [u - r, 62 + hh - 3], [u - r + 2, 62 + hh], [u + r - 2, 62 + hh], [u + r, 62 + hh - 3], [u + r, 62]]), [col[0], col[1], col[2], col[4]], 0.3, 0.7); }
  R_(63, 62, 77, 63, brass[0]); R_(84, 62, 92, 63, brass[0]);
  // passerelle, rampe
  R_(26, 35, 104, 38, steel[1]); R_(26, 37, 104, 38, steel[3]); R_(26, 35, 104, 35, steel[0]);
  for (let u = 30; u < 100; u += 14) R_(u, 38, u + 1, 52, steel[2]); R_(28, 52, 102, 53, steel[3]);
  // cabine
  b.polyG(P([[104, 28], [104, 84], [146, 84], [146, 28]]), [blk[0], blk[1], blk[2], blk[3]], 0.12, 0.7);
  R_(102, 84, 150, 90, blk[1]); R_(102, 89, 150, 90, blk[3]); R_(100, 84, 152, 85, NI[0]);
  R_(112, 56, 136, 78, NI[0]); R_(113, 57, 135, 77, night ? AM[7] : NI[5]); R_(113, 57, 135, 59, night ? AM[8] : NI[7]); R_(124, 57, 125, 77, NI[1]);
  R_(112, 56, 136, 56, brass[2]); R_(112, 78, 136, 78, brass[3]);
  if (night) { b.dith(X(138), Y(56), Math.round(22 * s), Math.round(22 * s), AM[8], 0.3); }
  R_(106, 28, 144, 30, brass[1]); R_(106, 29, 144, 30, brass[3]);
  // tampons et poutre de tête
  R_(-1, 16, 4, 26, RD[2]); R_(-1, 24, 4, 26, RD[3]); R_(-1, 16, 4, 16, RD[0]);
  for (const hh of [18, 23]) { R_(-6, hh, -1, hh + 2, steel[2]); R_(-8, hh - 1, -6, hh + 3, steel[3]); }
  R_(-3, 14, 3, 15, steel[0]);
  // tender : caisse, tas de charbon, citerne
  b.polyG(P([[148, 24], [148, 52], [214, 52], [214, 24]]), [blk[0], blk[1], blk[2], blk[4]], 0.22, 0.66);
  R_(148, 52, 214, 54, blk[3]); R_(148, 53, 214, 54, blk[4]);
  for (let q = 0; q < 70; q++) { const u = 150 + q * 0.9, hh = 54 + Math.round(Math.sin(q * 0.22) * 4 + 6 * Math.sin(q / 70 * Math.PI)); for (let j = 54; j <= hh; j++) b.px(X(u), Y(j), (pa_h2(q, j, 3) < 0.12) ? steel[3] : (pa_h2(q, j, 5) < 0.4 ? NI[1] : NI[0])); }
  R_(148, 28, 214, 29, brass[1]); for (const u of [160, 182, 204]) R_(u - 1, 40, u + 1, 42, brass[3]);
  R_(144, 22, 150, 26, steel[2]); R_(214, 22, 220, 26, steel[2]);                                                         // attelages
  b.outline(NI[0]);
  return { cv: b.done(), W, H, X0: dir > 0 ? W - 12 * s : 12 * s };
}
// roue motrice à rayons et contrepoids
function pa_drive(x, y, r, th) {
  disc(x, y, r, NI[0]); disc(x, y, r - 1, ST[2]); disc(x, y, Math.max(2, r - 3), NI[1]);
  for (let k = 0; k < 14; k++) { const a = th + k * TAU / 14; lineP(x, y, x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3), k % 2 ? ST[4] : ST[3], 1); }
  const a = th + 0.2; for (let q = -0.5; q <= 0.5; q += 0.1) { px(x + Math.cos(a + q + Math.PI) * (r - 4), y + Math.sin(a + q + Math.PI) * (r - 4), ST[3]); px(x + Math.cos(a + q + Math.PI) * (r - 5), y + Math.sin(a + q + Math.PI) * (r - 5), ST[2]); }
  disc(x, y, Math.max(2, Math.round(r * 0.28)), ST[6]); px(x - 1, y - 1, WH[3]);
  px(x + Math.cos(th) * r * 0.55, y + Math.sin(th) * r * 0.55, AM[8]);
}
// pa_locoLive : roues, bielles, fumée, vapeur, braise
function pa_locoLive(x, y, s, t, dir, env, o) {
  const D = PA_LOCO, speed = Math.abs(o.speed ?? 0), night = env === 'crepuscule', X = u => x - dir * u * s, Yh = h => y - h * s;
  const th = o.ph ?? dir * speed * t / (D.rd * s), rd = Math.round(D.rd * s), rc = D.rd * 0.5 * s, yw = Yh(D.rd);
  for (const u of D.bogie) pa_wheel(Math.round(X(u)), Math.round(Yh(D.rb)), Math.round(D.rb * s), th * D.rd / D.rb);
  for (const u of D.drivers) pa_drive(Math.round(X(u)), Math.round(yw), rd, th);
  pa_wheel(Math.round(X(D.trail)), Math.round(Yh(D.rt)), Math.round(D.rt * s), th * D.rd / D.rt);
  for (const u of D.tender) pa_wheel(Math.round(X(u)), Math.round(Yh(D.rte)), Math.round(D.rte * s), th * D.rd / D.rte);
  // bielles : tourillons des trois roues couplées, bielle motrice entre la crosse (devant) et la 2e roue
  const pin = u => [X(u) + Math.cos(th) * rc, yw + Math.sin(th) * rc], p0 = pin(D.drivers[0]), p1 = pin(D.drivers[1]), p2 = pin(D.drivers[2]);
  lineP(p0[0], p0[1], p2[0], p2[1], ST[2], Math.max(2, Math.round(2.4 * s))); lineP(p0[0], p0[1] - 1, p2[0], p2[1] - 1, ST[5], 1);
  const yc = yw - 3 * s, Lr = 54 * s, cx = p1[0] + dir * Math.sqrt(Math.max(1, Lr * Lr - (p1[1] - yc) ** 2));
  lineP(cx, yc, p1[0], p1[1], ST[3], Math.max(2, Math.round(2.4 * s))); lineP(cx, yc - 1, p1[0], p1[1] - 1, ST[6], 1);
  lineP(X(12), yc, cx, yc, ST[5], Math.max(1, Math.round(1.6 * s)));
  R(cx - 3, yc - 3, 6, 6, ST[2]); R(cx - 3, yc - 3, 6, 1, ST[6]);
  for (const p of [p0, p1, p2]) { disc(Math.round(p[0]), Math.round(p[1]), Math.max(1, Math.round(1.5 * s)), AM[7]); px(p[0] - 1, p[1] - 1, AM[10]); }
  // fumée et vapeur au rythme des échappements (4 coups par tour de roue)
  const rev = speed ? speed / (TAU * D.rd * s) : 0, chuff = speed ? rev * 4 : 0.35, n = 8, rate = Math.max(0.12, chuff / n), wnd = (o.windDx ?? (-dir * (26 + speed * 0.15))) * s;
  if (o.smoke ?? 1) {
    pa_vapeur(X(15), Yh(94), t, { env, kind: 'noire', n, h: 70 * s, w: Math.max(2, 3 * s), w2: 14 * s, wind: wnd, rate, seed: 3, a: 0.95, sway: 3 });
    pa_vapeur(X(17), Yh(94), t, { env, kind: 'vapeur', n, h: 54 * s, w: Math.max(2, 2 * s), w2: 11 * s, wind: wnd * 0.9, rate, seed: 8, a: 0.55, sway: 3 });
  }
  if (o.steam ?? 1) pa_vapeur(X(24), Yh(18), t, { env, kind: 'vapeur', n: 6, h: 14 * s, w: 2, w2: 7 * s, wind: -dir * 14 * s, rate: Math.max(0.15, rate), seed: 5, a: 0.8, sway: 1 });
  if (o.whistle != null) pa_vapeur(X(88), Yh(72), t, { env, kind: 'vapeur', n: 9, h: 40 * s, w: 2, w2: 9 * s, wind: -dir * 20 * s, burst: o.whistle, seed: 6, a: 0.95 });
  const fx = X(140), fy = Yh(46);
  if (night || o.fire) rgrad(fx, fy, 2, 24 * s, [[0, 'rgba(255,170,60,0.55)'], [1, 'rgba(255,120,40,0)']], 0.8 + 0.2 * Math.sin(t * 13), 'lighter');
  if (speed && (o.sparks ?? night)) for (let i = 0; i < 6; i++) { const a = (((t * 1.1 + i / 6) % 1)), sx = X(15) - dir * (a * 36 + (pa_h(i, 3) - 0.3) * 12) * s, sy = Yh(94) - a * 30 * s + a * a * 40 * s; if (a < 0.8) px(sx, sy, a < 0.4 ? AM[10] : AM[7]); }
  if (night && (o.lamp ?? 1)) { const lx = X(0) + dir * 3, ly = Yh(70); rgrad(lx, ly, 2, 70 * s, [[0, 'rgba(255,240,170,0.7)'], [0.4, 'rgba(255,210,110,0.25)'], [1, 'rgba(255,190,90,0)']], 1, 'lighter'); }
}
// voiture à compartiments (sans roues) ; les fenêtres sont des TROUS dans le sprite : l'intérieur est dessiné dessous
const PA_WIN = { n: 4, w: 20, h: 21, u0: 6, pitch: 28, h0: 35 };
function pa_buildWagon(env, s, dir, variant) {
  const night = env === 'crepuscule', D = PA_LOCO, Wd = Math.ceil((D.carLen + 14) * s), H = Math.ceil(76 * s), b = new PaBuf(Wd, H), oy = H - 2, X = u => dir > 0 ? Wd - 7 * s - u * s : 7 * s + u * s, Y = h => oy - h * s;
  const R_ = (u0, h0, u1, h1, c) => b.R(Math.min(X(u0), X(u1)), Y(Math.max(h0, h1)), Math.max(1, Math.abs(X(u1) - X(u0))), Math.max(1, Math.abs(Y(h0) - Y(h1))), c);
  const P = pts => pts.map(p => [X(p[0]), Y(p[1])]);
  const body = night ? [NI[0], NI[1], DU[1], DU[3]] : (variant === 0 ? [WO[0], WO[1], WO[2], WO[4]] : variant === 1 ? [GR[0], GR[1], GR[2], GR[4]] : [RD[0], RD[1], RD[2], RD[4]]);
  const brass = night ? [DU[2], DU[4], AM[6], AM[8]] : [AM[3], AM[5], AM[7], AM[9]], roof = night ? [NI[0], NI[1], NI[2], DU[3]] : [ST[1], ST[2], ST[4], ST[6]];
  R_(2, 11, 120, 17, NI[1]); R_(2, 16, 120, 17, ST[3]);                                                          // châssis
  b.polyG(P([[0, 17], [0, 57], [122, 57], [122, 17]]), body, 0.12, 0.7, false);
  R_(0, 33, 122, 34, body[0]); R_(0, 34, 122, 35, brass[1]); R_(0, 56, 122, 57, brass[1]); R_(0, 57, 122, 58, brass[3]);      // filets dorés
  R_(0, 17, 122, 18, body[0]);
  // toit en berceau
  b.polyG(P([[-2, 58], [2, 64], [8, 67], [114, 67], [120, 64], [124, 58]]), roof, 0.22, 0.62);
  for (const u of [24, 60, 96]) { R_(u - 3, 67, u + 3, 71, roof[1]); R_(u - 2, 71, u + 2, 73, roof[2]); R_(u - 3, 67, u + 3, 68, roof[3]); }   // lanterneaux / lampes
  R_(-2, 58, 124, 59, roof[0]);
  // compartiments : cadre de fenêtre (le trou), porte, poignée, numéro
  const W_ = PA_WIN;
  for (let k = 0; k < W_.n; k++) {
    const u0 = W_.u0 + k * W_.pitch, wu0 = u0 + 2, wu1 = u0 + 2 + W_.w, h0 = W_.h0, h1 = W_.h0 + W_.h;
    R_(u0 - 1, 18, u0 - 1, 56, body[0]); R_(u0 + W_.pitch - 2, 18, u0 + W_.pitch - 2, 56, body[0]);         // joint de portière
    R_(wu0 - 2, h0 - 2, wu1 + 2, h1 + 2, brass[1]);
    b.R(Math.min(X(wu0), X(wu1)), Y(h1), Math.abs(X(wu1) - X(wu0)), Math.abs(Y(h0) - Y(h1)), 0);               // trou
    R_(wu0 - 2, h0 - 2, wu1 + 2, h0 - 1, brass[0]); R_(wu0 - 2, h1 + 1, wu1 + 2, h1 + 2, brass[3]);
    R_(wu1 - 3, 28, wu1 - 1, 31, brass[3]);                                                                       // poignée
    const num = k === 1 && variant === 0 ? '1' : variant === 1 ? '2' : '3';
    b.text(num, Math.round((dir > 0 ? X(u0 + 14) : X(u0 + 12)) - 1), Y(28), brass[3], 1);
    // marchepied
    R_(u0 + 2, 12, u0 + 26, 14, ST[2]);
  }
  R_(0, 11, 2, 22, ST[3]); R_(120, 11, 124, 22, ST[3]);
  b.outline(NI[0]);
  return { cv: b.done(), W: Wd, H, X0: dir > 0 ? Wd - 7 * s : 7 * s, s };
}
// intérieur d'un compartiment (derrière la vitre) : fond chaud, banquettes, filet, voyageurs
function pa_wagonInterior(env, w, h, seed, pax) {
  return pa_cache(`wint|${env}|${w}|${h}|${seed}|${pax}`, () => {
    const night = env === 'crepuscule', b = new PaBuf(w, h), warm = night ? [AM[4], AM[5], AM[6], AM[7]] : [WO[0], WO[1], WO[2], WO[3]];
    b.R(0, 0, w, h, warm[1]); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (pa_bay(i, j) < 0.3 * (1 - j / h)) b.px(i, j, warm[2]);
    b.R(0, Math.round(h * 0.18), w, 1, brassC(night)); b.R(0, Math.round(h * 0.2), w, 2, warm[0]);                                   // filet à bagages
    b.R(0, Math.round(h * 0.62), w, h, night ? RD[1] : RD[0]); b.R(0, Math.round(h * 0.62), w, 1, night ? RD[3] : RD[2]);             // dossier de banquette
    if (night) b.disc(w >> 1, 2, 3, AM[10]);
    for (let q = 0; q < pax; q++) {
      const px0 = Math.round(w * (0.25 + 0.5 * q / Math.max(1, pax - 0.4) + (pa_h(seed + q, 3) - 0.5) * 0.1)), hy = Math.round(h * 0.38), hat = pa_h(seed + q, 4) < 0.6;
      b.R(px0 - 4, hy + 5, 9, h, [NI[2], ST[2], WO[1], GR[1]][Math.floor(pa_h(seed + q, 5) * 4)]); b.disc(px0, hy + 1, 3, SK[3]); b.px(px0 + 1, hy + 1, NI[0]);
      if (hat) { b.R(px0 - 3, hy - 3, 7, 2, NI[0]); b.R(px0 - 2, hy - 5, 5, 3, NI[1]); } else b.R(px0 - 2, hy - 3, 5, 2, WO[1]);
    }
    return b.done();
  });
}
const brassC = night => night ? AM[6] : AM[5];
// pa_train(x, y, s, t, o) : voir l'en-tête
function pa_train(x, y, s, t, o = {}) {
  const env = o.env || 'matin', dir = (o.dir ?? 1) < 0 ? -1 : 1, sq = Math.round(s * 8) / 8, D = PA_LOCO, ncar = o.cars ?? 2, speed = o.speed ?? 0, night = env === 'crepuscule', th = o.ph ?? dir * Math.abs(speed) * t / (D.rd * sq);
  L.setTransform(1, 0, 0, 1, 0, 0);
  const info = { windows: [], front: [x, y], chimney: [x - dir * 15 * sq, y - 94 * sq], tail: x - dir * D.tlen * sq, cab: [x - dir * 104 * sq, y - 86 * sq, 42 * sq, 58 * sq], wheelsY: y - 17 * sq };
  const bob = speed ? Math.round(Math.sin(t * 19) * 0.5) : 0;
  if (o.shadow ?? 1) { L.save(); L.globalAlpha = 0.4; ell(x - dir * (D.tlen / 2 + ncar * 60) * sq + (o.light ?? 1) * -10 * sq * 0, y + 1, Math.round((D.tlen / 2 + ncar * 62) * sq), Math.max(2, Math.round(3 * sq)), night ? NI[0] : DU[1]); L.restore(); }
  // voitures (derrière) : intérieur, caisse, roues
  for (let k = 0; k < ncar; k++) {
    const u0 = D.tlen + 6 + k * (D.carLen + D.gap), xf = x - dir * u0 * sq, variant = (k + (o.variant || 0)) % 3, sp = pa_cache(`wag|${env}|${sq}|${dir}|${variant}`, () => pa_buildWagon(env, sq, dir, variant));
    const left = Math.round(xf - sp.X0), top = Math.round(y - (sp.H - 2)) + bob;
    for (let w = 0; w < PA_WIN.n; w++) {
      const wu0 = PA_WIN.u0 + w * PA_WIN.pitch + 2, wx = dir > 0 ? xf - (wu0 + PA_WIN.w) * sq : xf + wu0 * sq, wy = y - (PA_WIN.h0 + PA_WIN.h) * sq + bob, ww = Math.round(PA_WIN.w * sq), wh = Math.round(PA_WIN.h * sq);
      const inside = o.inside && o.insideCar === k && o.insideIdx === w;
      const iv = pa_wagonInterior(env, ww, wh, k * 7 + w, (o.pax ?? 1) ? 1 + ((k + w) % 2) : 0);
      L.drawImage(iv, Math.round(wx), Math.round(wy));
      if (inside) { L.save(); L.beginPath(); L.rect(Math.round(wx), Math.round(wy), ww, wh); L.clip(); o.inside(Math.round(wx), Math.round(wy), ww, wh, t); L.restore(); }
      info.windows.push({ car: k, idx: w, x: Math.round(wx), y: Math.round(wy), w: ww, h: wh });
      if (night) rgrad(wx + ww / 2, wy + wh / 2, 2, 26 * sq, [[0, 'rgba(255,200,100,0.22)'], [1, 'rgba(255,170,70,0)']], 1, 'lighter');
    }
    L.drawImage(sp.cv, left, top);
    for (const wu of [22, 32, 90, 100]) pa_wheel(Math.round(xf - dir * wu * sq), Math.round(y - 8 * sq) - 1, Math.round(8 * sq), th * D.rd / 8);
    // rails d'attelage entre voitures
    R(xf - dir * (D.carLen + 1) * sq - 1, y - 14 * sq, 4, 2, ST[3]);
  }
  // locomotive et tender
  const lsp = pa_cache(`loco|${env}|${sq}|${dir}`, () => pa_buildLoco(env, sq, dir));
  L.drawImage(lsp.cv, Math.round(x - lsp.X0), Math.round(y - (lsp.H - 2)) + bob);
  pa_locoLive(x, y - 0, sq, t, dir, env, o);
  info.length = (D.tlen + ncar * (D.carLen + D.gap) + 6) * sq;
  return info;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 15. LA GARE : verrière, piliers de fonte, horloge, quai, bagages, panneaux
// ════════════════════════════════════════════════════════════════════════════════════════
function pa_buildGareBack(env, E) {                                       // verrière, ferme, fond de la halle, voie et ballast (largeur 360, origine x = −45)
  const W = 360, ox = 45, b = new PaBuf(W, LH), M = pa_mat({ env }), night = env === 'crepuscule', soir = env === 'soir';
  const iron = night ? [NI[0], NI[0], NI[1], DU[0], DU[2]] : [WO[0], WO[1], WO[2], OC[1], OC[3]], rim = night ? DU[5] : AM[9];
  const glass = night ? [NI[1], NI[2], NI[3], NI[4]] : soir ? [DU[5], DU[6], DU[7], AM[9]] : [NI[8], NI[9], NE[2], NE[4]];
  // verrière : volume de verre au-dessus de la ferme
  for (let y = 0; y < 232; y++) for (let x = 0; x < W; x++) {
    const f = y / 232, n = pa_n1(x * 0.05 + y * 0.03, 4) * 0.5 + pa_n1(x * 0.11 - y * 0.07, 9) * 0.5;
    let c = f < 0.4 ? glass[0] : f < 0.7 ? glass[1] : glass[2];
    if (pa_bay(x, y) < clamp((n - 0.5) * 1.3 + (f - 0.4) * 0.5)) c = glass[Math.min(3, (f < 0.5 ? 1 : 2) + 1)];
    if (pa_h2(x >> 1, y >> 1, 8) < 0.04 && !night) c = soir ? DU[4] : ST[6];                              // salissures du verre
    b.px(x, y, c);
  }
  for (let x = 0; x < W; x += 24) { b.R(x, 0, 1, 232, iron[1]); b.R(x + 1, 0, 1, 232, rim === AM[9] ? iron[4] : iron[3]); }          // petits-bois
  for (let y = 18; y < 232; y += 22) b.R(0, y, W, 1, iron[2]);
  // ferme : arche en treillis, tirant, suspentes
  const cxA = W / 2, A = 196, yb = 232, B = 232;
  const outer = [], inner = [], N = 54;
  for (let i = 0; i <= N; i++) { const r = Math.PI * i / N; outer.push([cxA - Math.cos(r) * A, yb - Math.sin(r) * B + 0]); inner.push([cxA - Math.cos(r) * (A - 12), yb - Math.sin(r) * (B - 12)]); }
  for (let i = 0; i < N; i++) { b.line(outer[i][0], outer[i][1], inner[i + 1][0], inner[i + 1][1], iron[2], 1); b.line(inner[i][0], inner[i][1], outer[i + 1][0], outer[i + 1][1], iron[3], 1); b.line(outer[i][0], outer[i][1], outer[i + 1][0], outer[i + 1][1], iron[3], 3); b.line(outer[i][0], outer[i][1] - 2, outer[i + 1][0], outer[i + 1][1] - 2, i > N / 2 ? rim : iron[4], 1); b.line(inner[i][0], inner[i][1], inner[i + 1][0], inner[i + 1][1], iron[1], 2); }
  b.R(0, yb - 2, W, 5, iron[2]); b.R(0, yb - 2, W, 1, rim); b.R(0, yb + 3, W, 2, iron[0]);                              // entrait
  for (let x = 14; x < W; x += 28) { b.line(x, yb - 2, x, yb - 28 - Math.round(Math.sin((x / W) * Math.PI) * 120), iron[2], 1); }   // suspentes
  for (let x = 0; x < W; x += 8) { b.px(x, yb + 4, iron[1]); }
  // fond de la halle : mur de brique et grandes baies, colonnes de fonte
  b.R(0, yb + 5, W, E - yb - 5, M.brick[2]);
  for (let y = yb + 5; y < E; y++) for (let x = 0; x < W; x++) { const r = pa_h2(x >> 2, y >> 1, 3); if (r < 0.2 || (y & 3) === 0 && pa_bay(x, y) < 0.3) b.px(x, y, M.brick[1]); else if (r > 0.9) b.px(x, y, M.brick[3]); }
  for (const bx of [40, 150, 260]) { const w = 64, top = yb + 18; b.R(bx - 1, top - 1, w + 2, 70, M.stone[2]); b.R(bx, top, w, 70, glass[2]); for (let q = 0; q < w; q += 12) b.R(bx + q, top, 1, 70, iron[1]); for (let q = 0; q < 70; q += 14) b.R(bx, top + q, w, 1, iron[1]);
    for (let y = 0; y < 70; y++) for (let x = 0; x < w; x++) if (pa_bay(bx + x, top + y) < 0.5 * (y / 70)) b.px(bx + x, top + y, glass[3]);
    for (let x = 0; x < w; x++) { const hh = Math.round(Math.sqrt(Math.max(0, 1 - ((x - w / 2) / (w / 2)) ** 2)) * 18); b.R(bx + x, top - hh - 1, 1, 1, M.stone[3]); } }
  for (let x = 20; x < W; x += 110) { b.R(x - 3, yb + 5, 7, E - yb - 14, iron[2]); b.R(x + 2, yb + 5, 2, E - yb - 14, iron[4]); b.R(x - 3, yb + 5, 1, E - yb - 14, iron[0]); b.R(x - 6, yb + 5, 13, 4, iron[3]); b.R(x - 5, E - 22, 11, 3, iron[3]); for (let y = yb + 14; y < E - 22; y += 11) b.R(x - 3, y, 7, 1, iron[0]); }
  // quai lointain, rails et ballast
  b.R(0, E - 12, W, 4, night ? NI[3] : ST[5]); b.R(0, E - 12, W, 1, night ? NI[4] : ST[7]);
  const gravel = night ? [NI[1], NI[2], NI[3]] : [ST[2], ST[3], ST[4]];
  b.R(0, E - 8, W, 14, gravel[0]);
  for (let y = E - 8; y < E + 6; y++) for (let x = 0; x < W; x++) { const r = pa_h2(x, y, 2); if (r < 0.3) b.px(x, y, gravel[1]); else if (r > 0.85) b.px(x, y, gravel[2]); }
  for (let x = 0; x < W; x += 6) b.R(x, E - 3, 4, 3, night ? NI[0] : WO[1]);                                              // traverses
  b.R(0, E - 6, W, 1, night ? NI[5] : ST[7]); b.R(0, E - 5, W, 1, night ? NI[3] : ST[4]); b.R(0, E - 1, W, 1, night ? NI[5] : ST[6]); b.R(0, E, W, 1, night ? NI[3] : ST[3]);
  return { cv: b.done(), ox, W };
}
function pa_buildGareFront(env, E) {                                     // quai : bordure, dalles, bagages, chariot, banc, réverbère, panneaux (largeur 360)
  const W = 360, ox = 45, b = new PaBuf(W, LH), M = pa_mat({ env }), night = env === 'crepuscule', iron = night ? [NI[0], NI[1], NI[2], DU[1], DU[3]] : [WO[0], WO[1], WO[2], OC[1], OC[3]];
  const slab = night ? [NI[2], NI[3], NI[4]] : env === 'soir' ? [DU[4], OC[4], OC[5]] : [ST[4], ST[5], WH[0]];
  b.R(0, E + 1, W, 10, night ? NI[4] : WH[0]); b.R(0, E + 1, W, 1, night ? NI[5] : WH[3]); b.R(0, E + 9, W, 2, night ? NI[1] : ST[3]); for (let x = 0; x < W; x += 31) b.R(x, E + 2, 1, 8, night ? NI[3] : ST[5]);
  b.R(0, E + 11, W, 4, YE[1]); b.R(0, E + 11, W, 1, YE[3]);                                                             // ligne de sécurité jaune
  b.R(0, E + 15, W, LH - E - 15, slab[1]);
  let y = E + 15, row = 0; while (y < LH) { const f = (y - E) / (LH - E), rh = 5 + Math.round(f * 12); b.R(0, y, W, 1, M.stone[0]); const off = (row & 1) ? 22 : 0; for (let x = -off; x < W; x += 44) { b.R(x, y + 1, 1, rh - 1, M.stone[0]); } for (let x = 0; x < W; x++) if (pa_bay(x, y) < 0.15 + f * 0.1) for (let j = 1; j < rh; j++) if (pa_h2(x, y + j, 4) < 0.1) b.px(x, y + j, slab[2]); y += rh; row++; }
  // bagages : malles à sangles, valises, caisse
  const trunk = (x, yf, w, h, c, strap) => { b.R(x, yf - h, w, h, c[1]); b.R(x, yf - h, w, 2, c[2]); b.R(x, yf - 2, w, 2, c[0]); b.R(x + w - 2, yf - h, 2, h, c[0]); b.R(x + 3, yf - h, 2, h, strap); b.R(x + w - 6, yf - h, 2, h, strap); b.R(x + (w >> 1) - 1, yf - h + 3, 3, 3, YE[1]); b.outline(NI[0], false); };
  void trunk;
  const bag = (x, yf, w, h, c, strap) => { b.R(x, yf - h, w, h, c[1]); b.R(x, yf - h, w, 2, c[2]); b.R(x, yf - 2, w, 2, c[0]); b.R(x + w - 2, yf - h, 2, h, c[0]); b.R(x + 3, yf - h, 2, h, strap); b.R(x + w - 6, yf - h, 2, h, strap); b.R(x + (w >> 1) - 1, yf - h + 3, 3, 3, YE[1]); b.R(x - 1, yf - h - 1, w + 2, 1, NI[0]); b.R(x - 1, yf, w + 2, 1, NI[0]); b.R(x - 1, yf - h, 1, h, NI[0]); b.R(x + w, yf - h, 1, h, NI[0]); };
  bag(ox + 18, E + 56, 34, 22, night ? [NI[1], NI[2], NI[3]] : [WO[1], WO[2], WO[4]], iron[3]); bag(ox + 24, E + 34, 24, 14, night ? [NI[1], NI[2], NI[3]] : [GR[0], GR[1], GR[2]], YE[1]);
  bag(ox + 58, E + 56, 20, 14, night ? [NI[1], NI[2], NI[3]] : [RD[0], RD[1], RD[2]], YE[1]);
  // chariot à bagages
  const cx = ox + 270, cy = E + 58;
  b.R(cx, cy - 18, 46, 4, WO[3]); b.R(cx, cy - 18, 46, 1, WO[5]); b.R(cx, cy - 14, 46, 2, WO[1]); b.line(cx + 46, cy - 18, cx + 62, cy - 34, WO[2], 2); for (const wx of [cx + 8, cx + 38]) { b.disc(wx, cy - 8, 8, NI[1]); b.disc(wx, cy - 8, 6, WO[3]); b.disc(wx, cy - 8, 2, ST[5]); for (let k = 0; k < 8; k++) { const a = k * TAU / 8; b.line(wx, cy - 8, wx + Math.cos(a) * 6, cy - 8 + Math.sin(a) * 6, WO[4], 1); } }
  bag(cx + 6, cy - 18, 28, 18, night ? [NI[1], NI[2], NI[3]] : [WO[2], WO[3], WO[5]], iron[3]); bag(cx + 36, cy - 18, 10, 24, night ? [NI[1], NI[2], NI[3]] : [ST[1], ST[2], ST[4]], YE[1]);
  // banc de quai
  const bx = ox + 196, by = E + 38; for (const sg of [0, 38]) b.R(bx + sg, by - 18, 3, 18, NI[1]); for (let j = 0; j < 3; j++) b.R(bx - 2, by - 22 + j * 4, 44, 3, j === 0 ? WO[4] : WO[3]); b.R(bx - 2, by - 12, 44, 3, WO[2]); b.R(bx - 2, by - 12, 44, 1, WO[5]);
  // réverbère de quai
  const lx = ox + 130; b.R(lx - 2, E + 18, 4, 70, iron[1]); b.R(lx + 1, E + 18, 1, 70, iron[4]); b.R(lx - 4, E + 86, 8, 4, iron[2]); b.R(lx - 6, E + 10, 12, 10, night ? AM[9] : CY[3]); b.R(lx - 5, E + 11, 10, 8, night ? AM[10] : CY[4]); b.R(lx - 7, E + 8, 14, 3, iron[2]); b.R(lx - 2, E + 4, 4, 4, iron[2]);
  b.outline(NI[0]);
  return { cv: b.done(), ox, W };
}
// horloge de quai (cadran, aiguilles qui avancent)
function pa_horloge(x, y, r, t, o = {}) {
  const night = (o.env || 'matin') === 'crepuscule', hr = (o.hour ?? 8) % 12, mn = (o.minute ?? 42) + Math.floor(t / (o.tick ?? 1.4));
  disc(x, y, r + 3, NI[0]); disc(x, y, r + 2, night ? DU[2] : WO[2]); disc(x, y, r, NI[0]); disc(x, y, r - 1, night ? AM[8] : WH[2]);
  for (let k = 0; k < 12; k++) { const a = k * TAU / 12 - Math.PI / 2; R(x + Math.cos(a) * (r - 3) - (k % 3 === 0 ? 0 : 0), y + Math.sin(a) * (r - 3), 1, 1, NI[0]); if (k % 3 === 0) { R(x + Math.cos(a) * (r - 4) - 0, y + Math.sin(a) * (r - 4), 2, 2, NI[0]); } }
  const am = ((mn % 60) / 60) * TAU - Math.PI / 2, ah = ((hr + (mn % 60) / 60) / 12) * TAU - Math.PI / 2;
  lineP(x, y, x + Math.cos(ah) * (r * 0.5), y + Math.sin(ah) * (r * 0.5), NI[0], 2); lineP(x, y, x + Math.cos(am) * (r * 0.8), y + Math.sin(am) * (r * 0.8), NI[0], 1); disc(x, y, 1, RD[3]);
  px(x - r * 0.3, y - r * 0.4, WH[3]);
}
// pa_gare(t, o) : voir l'en-tête
function pa_gare(t, o = {}) {
  const env = o.env || 'matin', E = o.E ?? 398, layer = o.layer || 'all', cam = pa_fin(o.cam), light = (o.light ?? 1) < 0 ? -1 : 1, night = env === 'crepuscule', Ev = pa_env(o);
  const info = { railY: E - 6, edgeY: E + 1, floorY: E + 40, clock: [196 - cam * 0.5, 262] };
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (layer === 'all' || layer === 'back') {
    const bk = pa_cache(`gareB|${env}|${E}`, () => pa_buildGareBack(env, E));
    L.drawImage(bk.cv, Math.round(-bk.ox - cam * 0.5), 0);
    // rayons de soleil dans la verrière, poussière, brume sous le toit
    if (o.rays ?? 1) k_rays(Ev.sun ? 190 : 140, -10, t, { angle: Math.PI * 0.5 + 0.34, spread: 1.3, len: 440, n: 9, strength: night ? 0.14 : 0.42, seed: 7, cam, par: 0.2 });
    if (o.haze ?? 1) k_haze(120, 330, night ? '#8a52a0' : '#e8e0d8', night ? 0.24 : 0.34, { profile: 'top', cam, par: 0.4, t, seed: 5, wisp: 0.7, speed: 3 });
    pa_horloge(info.clock[0], info.clock[1], 15, t, { env, hour: o.hour ?? 8, minute: o.minute ?? 42 });
    // panneau suspendu : nom de la gare / destination
    const nom = o.nom ?? 'PARIS', pw = textW(nom, 2) + 14, px0 = Math.round(70 - cam * 0.5), py0 = 248;
    R(px0 - 1, py0 - 1, pw + 2, 22, NI[0]); R(px0, py0, pw, 20, night ? NI[3] : BL[1]); R(px0 + 1, py0 + 1, pw - 2, 18, night ? NI[2] : WH[2]); R(px0 + 2, py0 + 2, pw - 4, 16, night ? NI[1] : BL[2]); ptext(nom, px0 + 7, py0 + 3, WH[3], 2, null);
    L.fillStyle = WO[1]; L.fillRect(px0 + 6, py0 - 24, 1, 24); L.fillRect(px0 + pw - 7, py0 - 24, 1, 24);
    if (o.dest) { const dt = o.dest, dw = textW(dt, 1) + 24, dx = Math.round(112 - cam * 0.5), dy = 232; R(dx - 1, dy - 1, dw + 2, 14, NI[0]); R(dx, dy, dw, 12, night ? NI[2] : WH[1]); R(dx + 1, dy + 1, dw - 2, 10, night ? NI[1] : NI[1]); ptext('→', dx + 4, dy + 2, YE[3], 1, null); ptext(dt, dx + 16, dy + 2, WH[3], 1, null); L.fillStyle = WO[1]; L.fillRect(dx + 8, dy - 18, 1, 18); L.fillRect(dx + dw - 8, dy - 18, 1, 18); }
    // voyageurs sur le quai lointain, pigeons dans la halle
    for (let k = 0; k < (o.farPeople ?? 5); k++) { const x = 20 + k * 52 + Math.sin(t * 0.3 + k) * 4 - cam * 0.6; pa_passant(x, E - 9, 0.5, t, { env, seed: 40 + k, dir: k % 2 ? -1 : 1, speed: k % 3 === 0 ? 0 : 9, light, shadow: 0.5 }); }
    for (let k = 0; k < (o.birds ?? 3); k++) { const per = 12 + k * 3, ph = ((t / per + k * 0.31) % 1), x = ph * 340 - 40, y = 70 + Math.sin(ph * 9 + k) * 18 + k * 20; pa_pigeon(x, y, 1.1, t + k, { env, mode: 'fly', dir: 1, seed: 11 + k, shadow: 0 }); }
  }
  if (layer === 'all' || layer === 'front') {
    const fr = pa_cache(`gareF|${env}|${E}`, () => pa_buildGareFront(env, E));
    L.drawImage(fr.cv, Math.round(-fr.ox - cam), 0);
    for (let k = 0; k < (o.people ?? 4); k++) { const sp = (k % 2 ? -1 : 1) * (10 + (k * 3) % 8), per = 430, x = (((t * sp + k * 118) % per) + per) % per - 90 - cam; pa_passant(x, E + 52 + (k % 3) * 14, 1.3, t, { env, seed: 60 + k * 5, dir: sp > 0 ? 1 : -1, speed: k === 1 ? 0 : Math.abs(sp), light }); }
    if (night) rgrad(130 - 45 - cam + 45, E + 14, 2, 46, [[0, 'rgba(255,220,120,0.5)'], [1, 'rgba(255,190,80,0)']], 1, 'lighter');
    if (o.dust ?? 1) k_dust(t, { n: 28, x0: 0, x1: 270, y0: 40, y1: 380, cam, par: 0.9, seed: 3 });
  }
  return info;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 16. LE COMMISSARIAT ET L'AGENT DE POLICE
// ════════════════════════════════════════════════════════════════════════════════════════
// agent de police 1925 : képi, pèlerine, ceinture blanche, bâton blanc ; modes 'stand' (2 images : respire), 'walk' (8), 'run' (8)
function pa_buildAgent(dir, light, env, s, mode, k) {
  const night = env === 'crepuscule', W = Math.ceil(34 * s), H = Math.ceil(44 * s), b = new PaBuf(W, H), ox = W >> 1, oy = H - 2, X = v => ox + dir * v * s, Y = v => oy - v * s, Th = Math.max(2, Math.round(2.8 * s));
  const navy = night ? [NI[0], NI[1], NI[2], NI[3]] : [NI[1], NI[2], NI[3], NI[5]], skin = night ? SK[1] : SK[3];
  const run = mode === 'run', ph = mode === 'stand' ? 0 : k / 8 * TAU, sw = mode === 'stand' ? 0 : Math.sin(ph) * (run ? 6.4 : 3.6), bob = mode === 'stand' ? (k === 1 ? 0.6 : 0) : Math.abs(Math.sin(ph)) * (run ? 1.8 : 0.8), lean = run ? 2.4 : 0;
  const litR = (light > 0) === (dir > 0);
  for (const sg of [-1, 1]) {                                                                                  // jambes (pantalon sombre, bottines)
    const f = (mode === 'stand' ? 1.3 * sg : sw * sg), lift = mode === 'stand' ? 0 : Math.max(0, Math.sin(ph + (sg > 0 ? 0 : Math.PI))) * (run ? 4.2 : 2.4), c = sg > 0 ? NI[1] : NI[0];
    b.line(X(lean * 0.3 + sg * 0.6), Y(14.5 + bob), X(f * 0.5 + lean * 0.3), Y(7.5 + lift * 0.6), c, Th); b.line(X(f * 0.5 + lean * 0.3), Y(7.5 + lift * 0.6), X(f), Y(1.6 + lift), c, Th);
    b.R(Math.min(X(f - 1), X(f + 3.4)), Y(1.7 + lift), Math.round(4.4 * s), Math.max(2, Math.round(1.8 * s)), NI[0]);
  }
  const top = 26 + bob;
  b.poly([[X(-4.4 + lean), Y(top - 0.4)], [X(4.4 + lean), Y(top - 0.4)], [X(3.4 + lean * 0.6), Y(19)], [X(4.8 + lean * 0.3), Y(12)], [X(-4.8 + lean * 0.3), Y(12)], [X(-3.4 + lean * 0.6), Y(19)]], navy[2]);   // tunique
  if (litR) b.poly([[X(1.6 + lean), Y(top - 0.4)], [X(4.4 + lean), Y(top - 0.4)], [X(3.4 + lean * 0.6), Y(19)], [X(4.8 + lean * 0.3), Y(12)], [X(2.4 + lean * 0.3), Y(12)]], navy[3]); else b.poly([[X(-4.4 + lean), Y(top - 0.4)], [X(-1.6 + lean), Y(top - 0.4)], [X(-2.4 + lean * 0.3), Y(12)], [X(-4.8 + lean * 0.3), Y(12)], [X(-3.4 + lean * 0.6), Y(19)]], navy[3]);
  b.R(Math.min(X(-3.6 + lean * 0.6), X(3.6 + lean * 0.6)), Y(18.8), Math.round(7.2 * s), Math.max(1, Math.round(1.5 * s)), WH[1]);   // ceinture blanche
  b.poly([[X(-5.2 + lean), Y(top + 0.4)], [X(5.2 + lean), Y(top + 0.4)], [X(6 + lean * 0.5), Y(20.4)], [X(-6 + lean * 0.5), Y(20.4)]], navy[1]);                          // pèlerine
  b.R(Math.min(X(-6 + lean * 0.5), X(6 + lean * 0.5)), Y(20.4), Math.round(12 * s), 1, navy[3]);
  b.R(Math.min(X(-5.2 + lean), X(5.2 + lean)), Y(top + 0.4), Math.round(10.4 * s), 1, navy[3]);
  for (const q of [-1.5, 1.5]) b.px(X(q + lean), Y(top - 4), YE[2]);
  // bras et bâton blanc
  const ax = run ? 7 : 4.6, ay = run ? top - 6 : top - 11;
  b.line(X(lean + 0.6), Y(top - 1.6), X(ax + lean), Y(ay), navy[1], Th); b.R(X(ax + lean) - 1, Y(ay) - 1, Math.max(2, Math.round(2 * s)), Math.max(2, Math.round(2 * s)), WH[1]);
  if (mode === 'stand') { b.line(X(ax + lean), Y(ay), X(ax + 2.8), Y(ay - 14), WH[2], Math.max(1, Math.round(s * 0.9))); }
  else b.line(X(ax + lean), Y(ay), X(ax + 6 + lean), Y(ay + 3.5 + Math.sin(ph) * 2.4), WH[2], Math.max(1, Math.round(s * 0.9)));
  b.line(X(-lean * 0.2 - 0.4), Y(top - 1.6), X(-2.8 - sw * 0.5), Y(top - 11), navy[1], Th);
  // tête : visage, moustache, képi à visière
  const hx = 0.6 + lean, hy = top + 3.8, hr = Math.max(2, Math.round(2.9 * s));
  b.R(X(hx - 0.8), Y(top + 0.9), Math.max(2, Math.round(2.2 * s)), Math.max(1, Math.round(1.8 * s)), skin);
  b.disc(X(hx), Y(hy), hr, skin); b.px(X(hx + 3.1), Y(hy - 0.2), skin); b.px(X(hx + 1.8), Y(hy + 0.8), NI[0]);
  b.R(Math.min(X(hx + 1.2), X(hx + 4)), Y(hy - 1.2), Math.max(2, Math.round(2.8 * s)), Math.max(1, Math.round(0.9 * s)), WO[1]);
  b.R(Math.min(X(hx - 3), X(hx + 3.8)), Y(hy + 5.4), Math.round(6.8 * s), Math.round(3.4 * s), navy[2]); b.R(Math.min(X(hx - 3.4), X(hx + 4.2)), Y(hy + 5.8), Math.round(7.6 * s), Math.max(1, Math.round(1.3 * s)), navy[3]); b.R(Math.min(X(hx - 3), X(hx + 3.8)), Y(hy + 3), Math.round(6.8 * s), Math.max(1, Math.round(1.4 * s)), WH[1]);
  b.R(Math.min(X(hx + 3.4), X(hx + 6.4)), Y(hy + 3.5), Math.round(3 * s), Math.max(1, Math.round(s)), NI[0]);
  b.outline(NI[0]);
  return { cv: b.done(), ox, oy, W, H };
}
// pa_agent(x, y, s, t, o) : policier de profil, (x, y) = pieds ; s = 1 → ≈ 36 px ; o : mode 'stand' | 'walk' | 'run', dir ±1, speed (px/s, règle le pas), env, light, shadow
function pa_agent(x, y, s, t, o = {}) {
  const mode = o.mode || 'stand', dir = (o.dir ?? 1) < 0 ? -1 : 1, env = o.env || 'matin', light = (o.light ?? 1) < 0 ? -1 : 1, sq = Math.round(s * 4) / 4, speed = o.speed ?? (mode === 'run' ? 70 : 18);
  const k = mode === 'stand' ? (Math.floor(t * 0.8) % 2) : Math.floor((((t * speed / (mode === 'run' ? 16 : 12) / sq + (o.seed || 0) * 0.37) % 1) + 1) % 1 * 8) % 8;
  const sp = pa_cache(`agent|${dir}|${light}|${env}|${sq}|${mode}|${k}`, () => pa_buildAgent(dir, light, env, sq, mode, k));
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (o.shadow ?? 1) { L.save(); L.globalAlpha = 0.34 * (o.shadow ?? 1); ell(x - light * 12 * sq, y, Math.round(15 * sq), Math.max(1, Math.round(1.6 * sq)), env === 'crepuscule' ? NI[0] : DU[1]); L.restore(); }
  L.drawImage(sp.cv, Math.round(x) - sp.ox, Math.round(y) - sp.oy - 1);
  return { x, y, h: 36 * sq, top: y - 36 * sq };
}
function pa_buildCommis(env, F) {                                       // façade, porte, plaque, lanterne, marches (largeur 330, origine x = −30)
  const W = 330, ox = 30, b = new PaBuf(W, LH), M = pa_mat({ env }), night = env === 'crepuscule', yB = F - 36, gh = 100, yG = yB - gh, cxD = ox + 135;
  const st = M.stone, st2 = M.stoneB;
  // étages et toit
  pa_house(b, 0, yG, W, { M, det: 3, nfl: 2, fh: 36, ww: 12, wh: 22, wp: 26, roofH: 44, seed: 61, balc: [0], side: 1, shut: 0.5, litP: night ? 0.45 : 0.05, tone: 0.2, chim: 2 });
  // rez-de-chaussée : pierre à bossages
  b.R(0, yG, W, gh, st[2]);
  for (let j = 0; j < gh; j += 9) { b.R(0, yG + j, W, 1, st[1]); for (let x = (j / 9 & 1) ? 17 : 0; x < W; x += 34) b.R(x, yG + j, 1, 9, st[1]); b.R(0, yG + j + 1, W, 1, st[3]); }
  for (let i = 0; i < 8; i++) b.dith(i, yG, 1, gh, st[1], 0.7 * (1 - i / 8));
  b.R(0, yG - 1, W, 2, st[3]); b.R(0, yG + 1, W, 2, st[1]); b.dith(0, yG + 3, W, 3, st[0], 0.6);                 // bandeau de corniche
  // fenêtres grillagées
  for (const wx of [ox + 22, ox + 196]) {
    const wy = yB - 84, ww = 40, wh = 52;
    b.R(wx - 3, wy - 3, ww + 6, wh + 6, st[3]); b.R(wx - 3, wy - 3, ww + 6, 2, st[4]); b.R(wx - 3, wy + wh + 1, ww + 6, 3, st[4]); b.R(wx - 3, wy - 3, 2, wh + 6, st[1]);
    b.R(wx, wy, ww, wh, night ? AM[6] : M.glass[0]); if (night) b.dith(wx, wy + wh * 0.4, ww, wh * 0.6, AM[8], 0.5);
    for (let j = 0; j < wh; j++) for (let i = 0; i < ww; i++) { const d = i - j * 0.5 - ww * 0.35; if (d > 0 && d < 4) b.px(wx + i, wy + j, night ? AM[9] : M.glass[2]); }
    for (let q = 3; q < ww; q += 5) b.R(wx + q, wy, 1, wh, NI[0]); b.R(wx, wy + (wh >> 1), ww, 1, NI[0]);
  }
  // porte : encadrement, vantaux à panneaux, imposte, marches
  const dw = 54, dh = 74, dx0 = cxD - dw / 2, dy0 = yB - dh;
  b.R(dx0 - 12, yG, dw + 24, gh, st[3]); b.R(dx0 - 12, yG, 4, gh, st[1]); b.R(dx0 + dw + 8, yG, 4, gh, st[4]); b.R(dx0 - 8, yG, 3, gh, st[2]);
  b.R(dx0 - 4, dy0 - 32, dw + 8, dh + 32, st[4]);                                                          // arc et tympan
  b.R(dx0, dy0, dw, dh, night ? NI[0] : NI[1]);
  const lw = dw / 2 - 1;
  for (const lx of [dx0 + 1, dx0 + dw / 2 + 1]) {
    b.R(lx, dy0 + 1, lw, dh - 1, NI[3]); b.R(lx, dy0 + 1, lw, 1, NI[5]);
    for (const [py0, ph] of [[dy0 + 6, 24], [dy0 + 34, 30]]) { b.R(lx + 3, py0, lw - 6, ph, NI[2]); b.R(lx + 3, py0, lw - 6, 1, NI[1]); b.R(lx + 3, py0 + ph - 1, lw - 6, 1, NI[5]); b.R(lx + 3, py0, 1, ph, NI[1]); b.R(lx + lw - 4, py0, 1, ph, NI[5]); }
  }
  b.R(dx0 + dw / 2 - 1, dy0, 2, dh, NI[0]); b.R(dx0 + dw / 2 - 5, dy0 + 38, 3, 6, AM[8]); b.R(dx0 + dw / 2 + 3, dy0 + 38, 3, 6, AM[8]);
  for (let y = 0; y < 30; y++) { const hw = Math.round(Math.sqrt(Math.max(0, 1 - ((15 - y) / 15) ** 2)) * (dw / 2 + 2)); }
  // imposte demi-circulaire
  for (let i = 0; i < dw; i++) { const hh = Math.round(Math.sqrt(Math.max(0, 1 - ((i - dw / 2 + 0.5) / (dw / 2)) ** 2)) * 26); for (let j = 1; j <= hh; j++) b.px(dx0 + i, dy0 - j, j > hh - 2 ? st[4] : (night ? AM[7] : M.glass[1])); }
  for (let q = -22; q <= 22; q += 7) b.line(dx0 + dw / 2 + q * 0.2, dy0 - 1, dx0 + dw / 2 + q, dy0 - Math.round(Math.sqrt(Math.max(0, 1 - (q / 27) ** 2)) * 25), NI[0], 1);
  for (let i = 0; i < dw; i++) { const hh = Math.round(Math.sqrt(Math.max(0, 1 - ((i - dw / 2 + 0.5) / (dw / 2)) ** 2)) * 26); b.px(dx0 + i, dy0 - hh - 1, NI[0]); }
  b.R(dx0 - 12, dy0 - 34, dw + 24, 4, st[4]); b.R(dx0 - 12, dy0 - 30, dw + 24, 2, st[1]);              // entablement
  // plaque émaillée : COMMISSARIAT / POLICE
  const px0 = cxD - 46, py0 = dy0 - 70, pw = 92, ph = 32;
  b.R(px0 - 2, py0 - 2, pw + 4, ph + 4, NI[0]); b.R(px0 - 1, py0 - 1, pw + 2, ph + 2, WH[2]); b.R(px0, py0, pw, ph, BL[2]); b.R(px0, py0, pw, 1, BL[4]); b.R(px0 + 2, py0 + 2, pw - 4, ph - 4, BL[1]);
  b.text('COMMISSARIAT', cxD - Math.round(textW('COMMISSARIAT', 1) / 2), py0 + 5, WH[2], 1); b.text('POLICE', cxD - Math.round(textW('POLICE', 2) / 2), py0 + 15, WH[3], 2);
  // lanterne bleue sur potence
  const lx = dx0 - 30, ly = dy0 - 22;
  b.line(lx + 16, ly - 6, lx + 4, ly - 6, NI[0], 2); b.line(lx + 4, ly - 6, lx + 4, ly - 1, NI[0], 1); b.R(lx - 4, ly, 17, 3, NI[0]); b.R(lx - 3, ly + 3, 15, 18, BL[3]); b.R(lx - 2, ly + 4, 13, 16, night ? CY[4] : BL[4]); b.R(lx - 2, ly + 4, 3, 16, BL[2]); b.R(lx - 4, ly + 21, 17, 3, NI[0]); b.R(lx + 4, ly + 4, 1, 16, BL[2]); b.px(lx + 8, ly + 7, WH[3]);
  // panneau d'affichage à gauche : avis, affiches de recherche
  const nx = ox + 22, ny = yB - 20 - 30; void nx; void ny;
  const bx = dx0 + dw + 20, by = yB - 76; b.R(bx - 2, by - 2, 34, 46, WO[1]); b.R(bx, by, 30, 42, WO[2]); for (let q = 0; q < 4; q++) { const ax = bx + 2 + (q & 1) * 14, ay = by + 2 + (q >> 1) * 20; b.R(ax, ay, 12, 17, q === 1 ? YE[2] : WH[1]); b.R(ax, ay, 12, 1, ST[5]); for (let l = 0; l < 6; l++) b.R(ax + 1, ay + 3 + l * 2, 10 - (l & 1) * 3, 1, NI[1]); if (q === 0) b.R(ax + 3, ay + 3, 6, 5, SK[3]); }
  // marches
  for (let k = 0; k < 3; k++) { const y = yB + k * 8, w = dw + 32 + k * 16, x = cxD - w / 2; b.R(x, y, w, 8, st[2]); b.R(x, y, w, 2, st[4]); b.R(x, y + 2, w, 1, st[3]); b.R(x, y + 7, w, 1, st[1]); b.dith(x, y + 3, w, 4, st[1], 0.35); b.R(x, y, 2, 8, st[1]); b.R(x + w - 2, y, 2, 8, st[4]); }
  for (const sg of [-1, 1]) { const x = cxD + sg * (dw / 2 + 22); b.R(x - 1, yB - 12, 2, 36, NI[0]); b.disc(x, yB - 13, 2, NI[0]); b.px(x - 1, yB - 14, ST[6]); b.line(x, yB - 12, x + sg * 6, yB + 20, NI[0], 1); }
  b.outline(NI[0], false);
  return { cv: b.done(), ox, W, dx0, dy0, dw, dh, yB, cxD, lantern: [lx + 5, ly + 12], plaque: [px0, py0, pw, ph] };
}
// pa_commissariat(t, o) : voir l'en-tête
function pa_commissariat(t, o = {}) {
  const env = o.env || 'matin', F = o.F ?? 412, cam = pa_fin(o.cam), light = (o.light ?? 1) < 0 ? -1 : 1, night = env === 'crepuscule', layer = o.layer || 'all';
  const cm = pa_cache(`commis|${env}|${F}`, () => pa_buildCommis(env, F)), yB = F - 36;
  const info = { F, doorX: cm.cxD - cam * 0.6 - 30, doorY: yB, stepsY: yB + 24, feetY: F - 6, lantern: [cm.lantern[0] - 30 - cam * 0.6, cm.lantern[1]], plaque: cm.plaque };
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (layer === 'all' || layer === 'back') {
    if (o.sky ?? 1) pa_ciel(t, { env, h: o.h ?? 250, clouds: o.clouds ?? 4, cam: cam * 0.1, cloudScale: 1.2 });
    // drapeau tricolore à la hampe sur la façade
    const gr = pa_cache(`rueG|${env}|${F}`, () => pa_buildRueGround(env, F));
    L.drawImage(cm.cv, Math.round(-cm.ox - cam * 0.6), 0);
    const hx = Math.round(cm.ox - 30 + 196 - cam * 0.6), hy = 196;
    lineP(hx - 6, hy + 14, hx + 28, hy - 22, NI[0], 2); lineP(hx - 6, hy + 14, hx + 28, hy - 22, WO[4], 1); disc(hx + 28, hy - 23, 2, YE[2]);
    pa_flag(hx + 18, hy - 22, 30, 18, t, 1, 1.3);
    L.drawImage(gr.cv, Math.round(-gr.ox - cam), 0);
    // lanterne : halo bleu la nuit
    if (night) { rgrad(info.lantern[0], info.lantern[1], 2, 40, [[0, 'rgba(120,200,255,0.65)'], [0.5, 'rgba(70,140,255,0.22)'], [1, 'rgba(60,110,255,0)']], 1, 'lighter'); rgrad(info.doorX, yB - 40, 2, 70, [[0, 'rgba(255,200,100,0.35)'], [1, 'rgba(255,170,70,0)']], 1, 'lighter'); }
    else if (o.sun ?? 1) k_dust(t, { n: 14, x0: 0, x1: 270, y0: 200, y1: 420, cam, par: 0.8, seed: 9 });
    // lampadaire à droite
    const lampX = o.lampX ?? 238, lp = pa_cache(`rueI|${env}|lamp`, () => pa_buildItem('lamp', env)), lx = lampX - cam * 0.95, ly = F - 8;
    L.save(); L.globalAlpha = 0.4; ell(lx - light * 16, ly + 1, 22, 3, night ? NI[0] : DU[1]); L.restore(); L.drawImage(lp.cv, Math.round(lx - lp.ox), Math.round(ly - lp.oy));
    if (night) for (const g of lp.glow) rgrad(lx - lp.ox + g[0], ly - lp.oy + g[1], 2, 34, [[0, 'rgba(255,220,120,0.55)'], [1, 'rgba(255,180,80,0)']], 1 - 0.1 * Math.sin(t * 9), 'lighter');
    // l'agent au pied des marches
    if (o.agent ?? 1) { const ax = o.agentX ?? 184; pa_agent(ax - cam * 0.9, F - 8, o.agentS ?? 1.45, t, { env, dir: o.agentDir ?? -1, mode: 'stand', light }); info.agent = [ax - cam * 0.9, F - 8]; }
    for (let k = 0; k < (o.pigeons ?? 2); k++) pa_pigeon(40 + k * 100 - cam + Math.sin(t * 0.4 + k) * 6, F + 18 + k * 14, 1.2, t, { env, seed: 5 + k, dir: k % 2 ? -1 : 1, light });
    for (let k = 0; k < (o.people ?? 2); k++) { const sp = (k % 2 ? -1 : 1) * (11 + k * 4), per = 440, xx = (((t * sp + k * 170) % per) + per) % per - 90 - cam; pa_passant(xx, F + 24 + k * 22, 1.2, t, { env, seed: 80 + k * 4, dir: sp > 0 ? 1 : -1, speed: Math.abs(sp), light }); }
  }
  return info;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// 17. PIÈCES QUI S'ENVOLENT
// ════════════════════════════════════════════════════════════════════════════════════════
// pa_pieces(x, y, t, t0, o) : gerbe de pièces d'or lancée de (x, y) à l'instant t0 ; mode 'envol' (elles montent en tournoyant puis dérivent au vent et s'effacent) ou 'chute' (parabole)
// o : n (14), dur (3,2 s), r rayon (3), vx dérive (14 px/s), spread (50), seed, mode, size
function pa_pieces(x, y, t, t0, o = {}) {
  const n = o.n ?? 14, dur = o.dur ?? 3.2, r0 = o.r ?? 3, vx = o.vx ?? 14, spread = o.spread ?? 50, seed = o.seed ?? 1, mode = o.mode || 'envol', u = t - t0;
  if (u < 0 || u > dur) return;
  L.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = pa_h(i, seed) * 0.5, ui = u - d; if (ui < 0 || ui > dur - d) continue;
    const a = (pa_h(i, seed + 1) - 0.5) * 2, v0 = 60 + 70 * pa_h(i, seed + 2), f = ui / (dur - d);
    const ax = x + a * spread * Math.sqrt(ui) * 1.4 + vx * ui * (mode === 'envol' ? 1 : 0.2), ay = mode === 'envol' ? y - v0 * ui + 8 * ui * ui - 18 * Math.sin(ui * 2 + i) : y - v0 * 0.9 * ui + 150 * ui * ui;
    const spin = ui * (6 + 5 * pa_h(i, seed + 3)) + i, w = Math.abs(Math.cos(spin)), rx = Math.max(1, Math.round(r0 * (0.25 + 0.75 * w))), ry = Math.max(2, r0), alpha = mode === 'envol' ? clamp(1.6 - 1.6 * f) : 1;
    if (alpha <= 0.05) continue;
    L.save(); L.globalAlpha = alpha;
    ell(ax, ay, rx + 1, ry + 1, WO[1]); ell(ax, ay, rx, ry, w > 0.55 ? YE[2] : YE[1]); if (rx > 1) { px(ax - rx * 0.4, ay - ry * 0.4, YE[3]); R(ax - rx * 0.4, ay, 1, 1, YE[0]); }
    if (w < 0.25 && Math.sin(spin * 2) > 0) { px(ax, ay - ry - 1, WH[3]); px(ax - 1, ay - ry - 2, YE[3]); px(ax + 1, ay - ry - 2, YE[3]); }
    L.restore();
  }
}
// @@FIN@@
