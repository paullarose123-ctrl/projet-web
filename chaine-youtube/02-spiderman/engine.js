'use strict';
// ───────────────────────── format ─────────────────────────
// Image dessinée en 270 × 480, puis agrandie ×4 sans lissage (1080 × 1920). Palette fixe + tramage de Bayer 4×4.
const W = 1080, H = 1920, FPS = 30, LW = 270, LH = 480, SC = 4;
const cv = document.getElementById('cv');
const X = cv.getContext('2d', { willReadFrequently: true });
const mkCanvas = (w = LW, h = LH) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const low = mkCanvas(), L = low.getContext('2d', { willReadFrequently: true });
const lay = mkCanvas(), Y = lay.getContext('2d', { willReadFrequently: true });
const snapC = mkCanvas(), SN = snapC.getContext('2d', { willReadFrequently: true });

// ───────────────────────── voix → temps ─────────────────────────
const TL = window.TL, P = {};
TL.phrases.forEach(p => P[p.id] = p);
const norm = s => s.toLowerCase().replace(/[.,:;!?…]/g, '');
const wt = (id, txt, k = 0) => { const w = P[id].words.filter(w => norm(w.w) === norm(txt))[k]; if (!w) throw new Error('mot ' + id + ' ' + txt); return w.t0; };
const wt1 = (id, txt, k = 0) => { const w = P[id].words.filter(w => norm(w.w) === norm(txt))[k]; if (!w) throw new Error('mot ' + id + ' ' + txt); return w.t1; };
const VOICE_END = TL.phrases[TL.phrases.length - 1].t1;
const CARD_T = 2.0;                                  // carton final (« LE FIL TIENT. LE RESTE, NON. »), après la dernière parole
const OUTRO_T = 4.2;                                 // plan de sortie : logo, nom de la chaîne, abonnez-vous (outro.js)
const DUR = VOICE_END + CARD_T + OUTRO_T;
const NF = Math.round(DUR * FPS);
const WORDS = TL.phrases.flatMap(p => p.words);

// ───────────────────────── outils ─────────────────────────
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sm = t => t * t * (3 - 2 * t);
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const ei = t => t * t * t, eo = t => 1 - Math.pow(1 - t, 3), lin = t => t;
const eob = t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const prog = (t, a, b) => clamp((t - a) / (b - a));
const bump = (t, a, b, c, d) => sm(prog(t, a, b)) * (1 - sm(prog(t, c, d)));
const TAU = Math.PI * 2;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function tab(Tb, u) {                                 // interpolation Catmull-Rom dans une table [[u, v], …]
  const n = Tb.length; if (u <= Tb[0][0]) return Tb[0][1]; if (u >= Tb[n - 1][0]) return Tb[n - 1][1];
  let i = 0; while (u > Tb[i + 1][0]) i++;
  const v0 = Tb[Math.max(0, i - 1)][1], v1 = Tb[i][1], v2 = Tb[i + 1][1], v3 = Tb[Math.min(n - 1, i + 2)][1];
  const s = (u - Tb[i][0]) / (Tb[i + 1][0] - Tb[i][0]);
  return 0.5 * ((2 * v1) + (-v0 + v2) * s + (2 * v0 - 5 * v1 + 4 * v2 - v3) * s * s + (-v0 + 3 * v1 - 3 * v2 + v3) * s * s * s);
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
// ressort amorti : 1 → 0 avec oscillation (pour « boing »)
const spring = (u, k = 14, d = 5) => u < 0 ? 1 : Math.exp(-d * u) * Math.cos(k * u);

// ───────────────────────── palette ─────────────────────────
const RAMP = {
  NI: ['#05040f', '#0a0a1f', '#10102e', '#171a45', '#202a62', '#2c3c84', '#3d55aa', '#5878cc', '#82a2e4', '#b0c8f4'],
  DU: ['#1c1034', '#2e1a56', '#46267a', '#653296', '#8641a4', '#a9529f', '#cf6b9a', '#f090a4'],
  AM: ['#140a05', '#25120a', '#3c1d0e', '#5a2c12', '#7f4016', '#a85a1a', '#d07a1e', '#f2a02a', '#ffc84a', '#ffe08a', '#fff2c4'],
  WO: ['#1d120c', '#301d12', '#48291a', '#643a24', '#85502e', '#a96d3c', '#c78f52'],
  ST: ['#12161f', '#1e2531', '#2e3748', '#434f66', '#5f6f8a', '#8294b0', '#a8b8ce', '#d0dae8'],
  GR: ['#0e2a22', '#1a4636', '#2a6648', '#3f8a5a', '#62ae72', '#94d098', '#c4ecb8'],
  RD: ['#38091a', '#6e1226', '#a81c2e', '#d73442', '#f2625a', '#ff9a86'],
  BL: ['#0e1850', '#18288a', '#2540c0', '#3f66e4', '#6e96f6'],
  CY: ['#124a66', '#1f7a96', '#3aa8c4', '#70d0e4', '#b0f0f8'],
  SK: ['#5a3226', '#84543a', '#b27a54', '#dba67c', '#f4cfa6'],
  WH: ['#cfc6b4', '#e8e0cc', '#fff8e8', '#ffffff'],
  YE: ['#a08414', '#d6b020', '#ffd84a', '#fff09a'],
};
const { NI, DU, AM, WO, ST, GR, RD, BL, CY, SK, WH, YE } = RAMP;
const PAL_HEX = [...new Set(Object.values(RAMP).flat())];
const PAL = PAL_HEX.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const LUT = new Uint8Array(32 * 32 * 32);
(function () {
  for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
    const R = r * 8.23, G = g * 8.23, B = b * 8.23; let best = 0, bd = 1e9;
    for (let i = 0; i < PAL.length; i++) {
      const p = PAL[i], rm = (R + p[0]) / 2, dr = R - p[0], dg = G - p[1], db = B - p[2];
      const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
      if (d < bd) { bd = d; best = i; }
    }
    LUT[(r << 10) | (g << 5) | b] = best;
  }
})();
let DITHER = 26;
function quantize() {
  const id = L.getImageData(0, 0, LW, LH), d = id.data, S = DITHER;
  for (let y = 0, i = 0; y < LH; y++) for (let x = 0; x < LW; x++, i += 4) {
    const o = (BAYER[(y & 3) * 4 + (x & 3)] - 0.5) * S;
    const r = clamp(d[i] + o, 0, 255) >> 3, g = clamp(d[i + 1] + o, 0, 255) >> 3, b = clamp(d[i + 2] + o, 0, 255) >> 3;
    const p = PAL[LUT[(r << 10) | (g << 5) | b]]; d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
  }
  L.putImageData(id, 0, 0);
}

// ───────────────────────── primitives de pixels (écran, coordonnées entières) ─────────────────────────
const rd = Math.round;
function R(x, y, w, h, c) { L.fillStyle = c; L.fillRect(rd(x), rd(y), rd(w), rd(h)); }
function px(x, y, c) { L.fillStyle = c; L.fillRect(rd(x), rd(y), 1, 1); }
function disc(cx, cy, r, c) {
  L.fillStyle = c; cx = rd(cx); cy = rd(cy);
  for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.6 - dy * dy))); L.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
}
function ell(cx, cy, rx, ry, c) {
  L.fillStyle = c; cx = rd(cx); cy = rd(cy);
  for (let dy = -ry; dy <= ry; dy++) { const k = 1 - (dy * dy) / (ry * ry + 0.6), hw = Math.floor(rx * Math.sqrt(Math.max(0, k)) + 0.35); L.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
}
function lineP(x0, y0, x1, y1, c, th = 1) {                 // ligne de Bresenham avec un pinceau carré th × th
  x0 = rd(x0); y0 = rd(y0); x1 = rd(x1); y1 = rd(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; const o = Math.floor(th / 2);
  L.fillStyle = c;
  for (let k = 0; k < 4000; k++) { L.fillRect(x0 - o, y0 - o, th, th); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function poly(pts, c) {                                     // remplissage par lignes (pair-impair) sur les centres de pixels
  let ymin = Infinity, ymax = -Infinity; for (const p of pts) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
  ymin = Math.max(0, Math.ceil(ymin - 0.5)); ymax = Math.min(LH - 1, Math.floor(ymax - 0.5));
  L.fillStyle = c;
  for (let y = ymin; y <= ymax; y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) { const x0 = Math.ceil(xs[i] - 0.5), x1 = Math.floor(xs[i + 1] - 0.5); if (x1 >= x0) L.fillRect(x0, y, x1 - x0 + 1, 1); }
  }
}
function ditherRect(x, y, w, h, col, dens) {                // tramage de Bayer d'une densité donnée (0 à 1)
  L.fillStyle = col; x = rd(x); y = rd(y);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const xx = x + i, yy = y + j; if (BAYER[(yy & 3) * 4 + (xx & 3)] < dens) L.fillRect(xx, yy, 1, 1); }
}
function vgrad(x, y, w, h, stops) {                         // dégradé vertical (tramé ensuite par la palette)
  const g = L.createLinearGradient(0, y, 0, y + h); stops.forEach(([o, c]) => g.addColorStop(o, c)); L.fillStyle = g; L.fillRect(x, y, w, h);
}
function rgrad(cx, cy, r0, r1, stops, alpha = 1, mode = 'source-over') {
  const g = L.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach(([o, c]) => g.addColorStop(o, c));
  L.save(); L.globalAlpha = alpha; L.globalCompositeOperation = mode; L.fillStyle = g; L.fillRect(cx - r1, cy - r1, r1 * 2, r1 * 2); L.restore();
}

// assombrit les bords (vignette) : à dessiner avant le tramage
function vignette(a = 0.6, r0 = 80, r1 = 270, cx = LW / 2, cy = LH / 2, col = '5,4,15') {
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0);
  const g = L.createRadialGradient(cx, cy, r0, cx, cy, r1); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${a})`);
  L.fillStyle = g; L.fillRect(0, 0, LW, LH); L.restore();
}

// ───────────────────────── calques : formes lisses → silhouette nette ─────────────────────────
function layerBegin() { Y.setTransform(1, 0, 0, 1, 0, 0); Y.globalAlpha = 1; Y.globalCompositeOperation = 'source-over'; Y.filter = 'none'; Y.clearRect(0, 0, LW, LH); }
function layerEnd(o = {}) {
  const { vis = 1, outline = null, expo = 1, tint = '#05040f' } = o;
  const id = Y.getImageData(0, 0, LW, LH), d = id.data;
  for (let i = 3, p = 0; i < d.length; i += 4, p++) {
    const a = d[i]; if (!a) continue;
    let keep = a >= 128;
    if (keep && vis < 1) keep = vis > BAYER[(((p / LW) | 0) & 3) * 4 + ((p % LW) & 3)];
    d[i] = keep ? 255 : 0;
  }
  if (outline) {
    const oc = [parseInt(outline.slice(1, 3), 16), parseInt(outline.slice(3, 5), 16), parseInt(outline.slice(5, 7), 16)], add = [];
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
      const p = y * LW + x; if (d[p * 4 + 3]) continue;
      if ((x > 0 && d[(p - 1) * 4 + 3]) || (x < LW - 1 && d[(p + 1) * 4 + 3]) || (y > 0 && d[(p - LW) * 4 + 3]) || (y < LH - 1 && d[(p + LW) * 4 + 3])) add.push(p);
    }
    for (const p of add) { d[p * 4] = oc[0]; d[p * 4 + 1] = oc[1]; d[p * 4 + 2] = oc[2]; d[p * 4 + 3] = 255; }
  }
  Y.putImageData(id, 0, 0);
  if (expo < 1) { Y.globalCompositeOperation = 'source-atop'; Y.globalAlpha = clamp(1 - expo); Y.fillStyle = tint; Y.fillRect(0, 0, LW, LH); }
  Y.globalCompositeOperation = 'source-over'; Y.globalAlpha = 1;
  L.setTransform(1, 0, 0, 1, 0, 0); L.drawImage(lay, 0, 0);
}
function polyPath(pts, p = new Path2D()) { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; }
function limb(pts, ws) {                                     // chaîne d'articulations → contour lisse
  const Lp = [], Rp = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    Lp.push([pts[i][0] - ty * ws[i] / 2, pts[i][1] + tx * ws[i] / 2]); Rp.push([pts[i][0] + ty * ws[i] / 2, pts[i][1] - tx * ws[i] / 2]);
  }
  return Lp.concat(Rp.reverse());
}
const bez = (c0, c1, c2, s) => [(1 - s) * (1 - s) * c0[0] + 2 * (1 - s) * s * c1[0] + s * s * c2[0], (1 - s) * (1 - s) * c0[1] + 2 * (1 - s) * s * c1[1] + s * s * c2[1]];
// remplit une forme claire puis la recouvre d'une copie sombre décalée et floutée : croissant de lumière
function shade(c, path, lit, dark, ll, off, blur) {
  c.fillStyle = lit; c.fill(path);
  c.save(); c.clip(path);
  c.filter = `blur(${clamp(blur, 0.4, 40).toFixed(2)}px)`;
  c.translate(-ll[0] * off, -ll[1] * off); c.fillStyle = dark; c.fill(path);
  c.restore(); c.filter = 'none';
}

// ───────────────────────── police pixel 5×7 ─────────────────────────
const G = {};
(function () {
  const d = {
    A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.', C: '.###.|#...#|#....|#....|#....|#...#|.###.',
    D: '####.|#...#|#...#|#...#|#...#|#...#|####.', E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
    G: '.###.|#...#|#....|#.###|#...#|#...#|.####', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#', I: '###|.#.|.#.|.#.|.#.|.#.|###',
    J: '..###|...#.|...#.|...#.|#..#.|#..#.|.##..', K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
    M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#', O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
    P: '####.|#...#|#...#|####.|#....|#....|#....', Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
    S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..', U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
    V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..', W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
    Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
    0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', 1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.', 2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
    3: '####.|....#|....#|.###.|....#|....#|####.', 4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.',
    6: '.###.|#....|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|.#...|.#...|.#...', 8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
    9: '.###.|#...#|#...#|.####|....#|....#|.###.', ' ': '...|...|...|...|...|...|...', '.': '.|.|.|.|.|#|#', ',': '..|..|..|..|.#|.#|#.',
    ':': '.|#|#|.|#|#|.', '-': '....|....|....|####|....|....|....', "'": '#|#|.|.|.|.|.', '/': '...#|...#|..#.|.##.|.#..|#...|#...',
    '~': '.....|.....|.#..#|#.##.|.....|.....|.....', '·': '...|...|...|.#.|...|...|...', '↑': '..#..|.###.|#.#.#|..#..|..#..|..#..|..#..',
    '→': '.....|..#..|...#.|#####|...#.|..#..|.....', '!': '#|#|#|#|#|.|#', '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
    '%': '##..#|##..#|...#.|..#..|.#...|#..##|#..##', '(': '..#|.#.|#..|#..|#..|.#.|..#', ')': '#..|.#.|..#|..#|..#|.#.|#..',
    '+': '.....|..#..|..#..|#####|..#..|..#..|.....', '=': '.....|.....|#####|.....|#####|.....|.....', '°': '.#.|#.#|.#.|...|...|...|...',
    '≈': '.....|.#..#|#.##.|.....|.#..#|#.##.|.....', '×': '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....', '↓': '..#..|..#..|..#..|..#..|#.#.#|.###.|..#..',
    '<': '...#|..#.|.#..|#...|.#..|..#.|...#', '>': '#...|.#..|..#.|...#|..#.|.#..|#...', '★': '..#..|..#..|#####|.###.|.###.|##.##|#...#',
  };
  for (const k in d) G[k] = d[k].split('|');
  // lettres accentuées : lettre de base + 2 lignes de marque au-dessus (ou une cédille dessous)
  const mark = { acute: ['..#.', '.#..'], grave: ['.#..', '..#.'], circ: ['..#..', '.#.#.'], diaer: ['.#.#.', '.....'] };
  const markI = { acute: ['.#.', '#..'], grave: ['#..', '.#.'], circ: ['.#.', '#.#'], diaer: ['#.#', '...'] };
  const acc = { 'É': ['E', 'acute'], 'È': ['E', 'grave'], 'Ê': ['E', 'circ'], 'Ë': ['E', 'diaer'], 'À': ['A', 'grave'], 'Â': ['A', 'circ'], 'Ô': ['O', 'circ'], 'Î': ['I', 'circ'], 'Ï': ['I', 'diaer'], 'Ù': ['U', 'grave'], 'Û': ['U', 'circ'], 'Ç': ['C', 'cedil'] };
  for (const k in acc) {
    const [b, m] = acc[k], base = G[b];
    if (m === 'cedil') { G[k] = base.concat(['.#...']); G[k].top = 0; continue; }
    const mk = (b === 'I' ? markI[m] : mark[m]).map(r => r.slice(0, base[0].length).padEnd(base[0].length, '.'));
    G[k] = mk.concat(base); G[k].top = 2;
  }
})();
const gl = ch => G[ch] || G[ch.toUpperCase()] || G[' '];
function textW(s, sc = 1) { let w = 0; for (const ch of s) w += (gl(ch)[0].length + 1) * sc; return w - sc; }
function ptext(s, x, y, col, sc = 1, outline = '#05040f', n = Infinity) {
  x = rd(x); y = rd(y);
  const draw = (ox, oy, c) => {
    let cx = x + ox, i = 0; L.fillStyle = c;
    for (const ch of s) {
      if (i++ >= n) break; const g = gl(ch), top = g.top || 0;
      for (let r = 0; r < g.length; r++) for (let q = 0; q < g[r].length; q++) if (g[r][q] === '#') L.fillRect(cx + q * sc, y + oy + (r - top) * sc, sc, sc);
      cx += (g[0].length + 1) * sc;
    }
  };
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) draw(ox, oy, outline);
  draw(0, 0, col);
}
const ptextC = (s, cx, y, col, sc = 1, outline = '#05040f', n = Infinity) => ptext(s, cx - textW(s, sc) / 2, y, col, sc, outline, n);
const ptextR = (s, rx, y, col, sc = 1, outline = '#05040f', n = Infinity) => ptext(s, rx - textW(s, sc), y, col, sc, outline, n);

// ───────────────────────── éléments d'interface ─────────────────────────
// étiquette (« tag ») : boîte sombre, liseré, texte pixel ; renvoie la largeur
const TAGS = {
  blue: { fill: NI[1], line: NI[5], text: CY[3] },
  red: { fill: '#14040a', line: RD[3], text: RD[4] },
  amber: { fill: AM[0], line: AM[5], text: AM[8] },
  green: { fill: '#04140c', line: GR[3], text: GR[5] },
  white: { fill: NI[0], line: ST[5], text: WH[3] },
};
function tagBox(x, y, s, style = 'blue', n = Infinity, center = false) {
  if (n <= 0) return 0;
  const st = TAGS[style], w = textW(s) + 9, h = 13;
  if (center) x = x - w / 2;
  x = rd(x); y = rd(y);
  R(x - 1, y - 1, w + 2, h + 2, '#05040f'); R(x, y, w, h, st.line); R(x + 1, y + 1, w - 2, h - 2, st.fill);
  ptext(s, x + 5, y + 3, st.text, 1, null, n);
  return w;
}
// jauge de tension (demi-cercle, aiguille, zone rouge). v : 0 à 1
function gauge(x, y, v, label = 'TENSION', opt = {}) {
  const cx = x + 22, cy = y + 22, r = 21, red = opt.redFrom ?? 0.72;
  // cadran
  for (let dy = -r; dy <= 0; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy)); R(cx - hw, cy + dy, hw * 2 + 1, 1, ST[1]); }
  for (let a = 0; a <= 180; a += 2) { const t = a * Math.PI / 180; px(cx - Math.cos(t) * r, cy - Math.sin(t) * r, ST[6]); px(cx - Math.cos(t) * (r - 1), cy - Math.sin(t) * (r - 1), ST[4]); }
  R(cx - r, cy, r * 2 + 1, 2, ST[6]); R(cx - r, cy + 2, r * 2 + 1, 4, ST[1]); R(cx - r, cy + 2, r * 2 + 1, 1, ST[3]);
  for (let i = 0; i <= 10; i++) {
    const t = Math.PI * (1 - i / 10), c = i / 10 >= red ? RD[4] : AM[7];
    const a0 = i % 5 === 0 ? 11 : 14;
    lineP(cx + Math.cos(t) * a0, cy - Math.sin(t) * a0, cx + Math.cos(t) * 17, cy - Math.sin(t) * 17, c);
  }
  const th = Math.PI * (1 - clamp(v)), nx = cx + Math.cos(th) * 15, ny = cy - Math.sin(th) * 15;
  lineP(cx, cy, nx, ny, '#05040f', 3); lineP(cx, cy, nx, ny, WH[3], 1);
  disc(cx, cy, 3, '#05040f'); disc(cx, cy, 2, ST[7]); px(cx, cy, '#05040f');
  if (label) { const lc = v >= red ? 'red' : (opt.style || 'red'); tagBox(x + 49, y + 6, label, lc); }
  if (opt.value != null) ptext(opt.value, x + 49, y + 24, v >= red ? RD[5] : AM[8]);
}
// pastille oui / non : cercle + coche ou croix. p : 0 à 1 (apparition en rebond)
function mark(cx, cy, kind, p = 1, r = 9) {
  if (p <= 0) return;
  const k = eob(clamp(p)), rr = Math.max(1, rd(r * k));
  const col = kind === 'yes' ? GR[5] : kind === 'no' ? RD[4] : AM[8], dark = kind === 'yes' ? GR[1] : kind === 'no' ? RD[0] : AM[1];
  disc(cx, cy, rr + 1, '#05040f'); disc(cx, cy, rr, col);
  if (kind !== 'no') disc(cx, cy, Math.max(0, rr - 2), dark);
  const s = rr * 0.5;
  if (kind === 'yes') { lineP(cx - s, cy, cx - s * 0.3, cy + s * 0.8, col, 2); lineP(cx - s * 0.3, cy + s * 0.8, cx + s, cy - s * 0.7, col, 2); }
  else if (kind === 'no') { const q = Math.max(2, rr * 0.42); lineP(cx - q, cy - q, cx + q, cy + q, WH[3], rr >= 9 ? 2 : 1); lineP(cx - q, cy + q, cx + q, cy - q, WH[3], rr >= 9 ? 2 : 1); }
  else ptextC('?', cx, cy - 3, col, 1, null);
}
// compteur à chiffres rouges
function counter(cx, y, s, sc = 2, col = '#ff5a48') {
  const w = textW(s, sc) + 12, h = 7 * sc + 8, x = rd(cx - w / 2);
  R(x - 1, y - 1, w + 2, h + 2, '#05040f'); R(x, y, w, h, ST[3]); R(x + 1, y + 1, w - 2, h - 2, '#12060a');
  ptext(s, x + 6, y + 4, col, sc, '#5a0c18');
}
// barre de progression horizontale
function barH(x, y, w, h, frac, col, bg = '#12060a', line = ST[4]) {
  R(x - 1, y - 1, w + 2, h + 2, line); R(x, y, w, h, bg); R(x, y, rd(w * clamp(frac)), h, col);
}
// flèche pixel (x0,y0) → (x1,y1)
function arrow(x0, y0, x1, y1, col, th = 1, head = 4) {
  lineP(x0, y0, x1, y1, col, th);
  const a = Math.atan2(y1 - y0, x1 - x0);
  for (const s of [-0.5, 0.5]) lineP(x1, y1, x1 - Math.cos(a + s) * head, y1 - Math.sin(a + s) * head, col, th);
}

// ───────────────────────── sous-titres mot à mot ─────────────────────────
function drawCaption(t) {
  let w = null, wi = -1;
  for (let i = 0; i < WORDS.length; i++) { if (WORDS[i].t0 <= t + 0.02) { w = WORDS[i]; wi = i; } else break; }
  if (!w) return;
  const next = WORDS[wi + 1];
  const until = next && next.t0 - w.t1 < 0.55 ? next.t0 : w.t1 + 0.3;
  if (t > until) return;
  const txt = w.w.replace(/[.,:;]+$/, '').replace(/\.\.\.$/, ''), age = t + 0.02 - w.t0, s = 1 + 0.12 * (1 - eo(clamp(age / 0.12)));
  X.setTransform(s, 0, 0, s, W / 2, CAPY); X.textAlign = 'center'; X.textBaseline = 'middle';
  let fs = 96; X.font = `900 ${fs}px Nunito`; const mw = X.measureText(txt).width; if (mw > 940) { fs = Math.floor(fs * 940 / mw); X.font = `900 ${fs}px Nunito`; }
  X.lineJoin = 'round'; X.shadowColor = 'rgba(5,4,15,0.85)'; X.shadowBlur = 26;
  X.strokeStyle = '#05040f'; X.lineWidth = 16; X.strokeText(txt, 0, 0);
  X.shadowBlur = 0; X.fillStyle = '#ffffff'; X.fillText(txt, 0, 0);
  X.setTransform(1, 0, 0, 1, 0, 0);
}
let CAPY = 1500;
