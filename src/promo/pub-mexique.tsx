import { useEffect, useRef, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import './pub-mexique.css';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import { PackArtMexique } from '../components/PackArtMexique';
import { MexicoBackdrop } from '../components/MexicoBackdrop';
import type { CardFace } from '../engine/types';
import * as fx from './trailer-fx';
import { renderSoundtrack } from './pub-mexique-son';

// Pub « ouverture d'un booster Mexique » (1080 × 1920, 30 images/s, 10 s), sur le modèle des pubs d'ouverture de
// pochette : gros plan sur le sachet holographique, la bande du haut se déchire de gauche à droite dans une traînée
// de lumière, le sachet s'ouvre dans un éclair, une carte en sort, puis les cinq cartes s'ouvrent en éventail
// au-dessus du sachet, sous le logo. Le vaquita n'y figure pas (il reste à découvrir dans le jeu).
// Chaque image est calculée à partir du temps (window.__seek(t)) ; la bande-son est rendue hors ligne, calée dessus.

const DURATION = 10;
/** perspective de la scène (comme le CSS) */
const P = 1600;
/** le changement de plan, caché par l'éclair blanc */
const CUT = 3.45;

// ───────────── le sachet ─────────────

const PW = 640;
const PH = (PW * 172) / 120;
/** épaisseur */
const PD = 26;
/** hauteur de la déchirure (repère du sachet, centre en 0) */
const TEAR = -PH / 2 + 0.155 * PH;

// la déchirure : une ligne en dents irrégulières d'un bord à l'autre
const TEAR_PTS: [number, number][] = (() => {
  const r = fx.rng(11);
  const n = 46;
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = -PW / 2 - 8 + ((PW + 16) * i) / n;
    return [x, TEAR + (i % 2 ? 1 : -1) * (2.5 + r() * 6.5)] as [number, number];
  });
})();

function tearY(x: number): number {
  for (let i = 1; i < TEAR_PTS.length; i++) {
    const [x1, y1] = TEAR_PTS[i];
    const [x0, y0] = TEAR_PTS[i - 1];
    if (x <= x1) return fx.lerp(y0, y1, (x - x0) / (x1 - x0));
  }
  return TEAR_PTS[TEAR_PTS.length - 1][1];
}

const px = (x: number, y: number) => `${(x + PW / 2).toFixed(1)}px ${(y + PH / 2).toFixed(1)}px`;
const BODY_CLIP = `polygon(${TEAR_PTS.map(([x, y]) => px(x, y)).join(', ')}, ${px(PW / 2 + 20, PH / 2 + 20)}, ${px(-PW / 2 - 20, PH / 2 + 20)})`;

/** la bande du haut, en tranches verticales : chacune se soulève quand la déchirure la dépasse. Chaque tranche ne
 *  fait que la taille de son morceau de bande (un plan aussi grand que le sachet, en pivotant, passerait derrière la
 *  caméra et ne serait plus dessiné). */
const N_SLICES = 32;
/** hauteur de la bande (du haut du sachet jusque sous la déchirure) */
const STRIP_H = TEAR + PH / 2 + 12;
const SLICES = Array.from({ length: N_SLICES }, (_, i) => {
  const a = i === 0 ? -PW / 2 - 4 : -PW / 2 + (PW * i) / N_SLICES;
  const b = i === N_SLICES - 1 ? PW / 2 + 4 : -PW / 2 + (PW * (i + 1)) / N_SLICES;
  const inner = TEAR_PTS.filter(([x]) => x > a && x < b).reverse();
  const pts: [number, number][] = [[a, -PH / 2 - 30], [b, -PH / 2 - 30], [b, tearY(b)], ...inner, [a, tearY(a)]];
  // repère de la tranche : son coin en haut à gauche
  const loc = (x: number, y: number) => `${(x - a).toFixed(1)}px ${(y + PH / 2).toFixed(1)}px`;
  return {
    a,
    w: b - a,
    cx: (a + b) / 2,
    xn: (i + 0.5) / N_SLICES,
    front: `polygon(${pts.map(([x, y]) => loc(x, y)).join(', ')})`,
    // le revers (la feuille métallisée vue de dos) est retourné autour de l'axe horizontal de la tranche : on retourne
    // aussi sa découpe
    back: `polygon(${pts.map(([x, y]) => `${(x - a).toFixed(1)}px ${(STRIP_H - (y + PH / 2)).toFixed(1)}px`).join(', ')})`,
  };
});

// ───────────── les cartes ─────────────

/** de gauche à droite ; celle du milieu (l'axolotl, en Prime) sort la première */
const CARDS: CardFace[] = [
  { athleteId: 'mx-monarque', variant: 'base' },
  { athleteId: 'mx-jaguar', variant: 'base' },
  { athleteId: 'mx-axolotl', variant: 'prime' },
  { athleteId: 'mx-aigle-royal', variant: 'base' },
  { athleteId: 'mx-requin-blanc', variant: 'base' },
];
const CW = 300;
const CH = 420;

/** l'éventail final (repère de la scène, centre de l'écran en 0) */
const FAN = [
  { x: -418, y: -190, z: -40, rz: -16, s: 0.84 },
  { x: -222, y: -262, z: -12, rz: -8, s: 0.93 },
  { x: 0, y: -300, z: 40, rz: 0, s: 1 },
  { x: 222, y: -262, z: -12, rz: 8, s: 0.93 },
  { x: 418, y: -190, z: -40, rz: 16, s: 0.84 },
];
/** sortie du sachet : le milieu d'abord, puis ses voisines, puis les deux du bord */
const OUT_AT = [4.42, 4.3, 3.7, 4.36, 4.48];

// ───────────── géométrie ─────────────

interface Tf {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  s?: number;
}
type V3 = [number, number, number];

const rad = Math.PI / 180;
const n1 = (v = 0) => v.toFixed(2);

/** même ordre que le CSS : translate3d, rotateX, rotateY, rotateZ, scale */
function apply(f: Tf, p: V3): V3 {
  const s = f.s ?? 1;
  let [x, y, z] = [p[0] * s, p[1] * s, p[2] * s];
  const z1 = (f.rz ?? 0) * rad;
  [x, y] = [x * Math.cos(z1) - y * Math.sin(z1), x * Math.sin(z1) + y * Math.cos(z1)];
  const y1 = (f.ry ?? 0) * rad;
  [x, z] = [x * Math.cos(y1) + z * Math.sin(y1), -x * Math.sin(y1) + z * Math.cos(y1)];
  const x1 = (f.rx ?? 0) * rad;
  [y, z] = [y * Math.cos(x1) - z * Math.sin(x1), y * Math.sin(x1) + z * Math.cos(x1)];
  return [x + (f.x ?? 0), y + (f.y ?? 0), z + (f.z ?? 0)];
}

/** où tombe à l'écran un point de la scène (perspective centrée) ; le 3e nombre : l'agrandissement */
function proj([x, y, z]: V3): V3 {
  const k = P / (P - z);
  return [540 + x * k, 960 + y * k, k];
}

const onPack = (f: Tf, x: number, y: number, z = PD / 2) => proj(apply(f, [x, y, z]));

const els = new Map<string, HTMLElement>();
const reg = (k: string) => (el: HTMLElement | null) => {
  if (el) els.set(k, el);
  else els.delete(k);
};

function put(k: string, f: Tf | null) {
  const el = els.get(k);
  if (!el) return;
  if (!f) {
    el.style.display = 'none';
    return;
  }
  el.style.display = '';
  el.style.transform = `translate3d(${n1(f.x)}px, ${n1(f.y)}px, ${n1(f.z)}px) rotateX(${n1(f.rx)}deg) rotateY(${n1(f.ry)}deg) rotateZ(${n1(f.rz)}deg) scale(${(f.s ?? 1).toFixed(4)})`;
}

// ───────────── le minutage ─────────────

/** plan 1 : le sachet en gros plan, qui se déchire et s'ouvre */
function packA(t: number): Tf {
  const k1 = fx.seg(t, 0, 1.1);
  const k2 = fx.seg(t, 1.1, 2.3);
  const k3 = fx.seg(t, 2.3, CUT);
  const z = t < 1.1 ? fx.lerp(470, 560, k1) : t < 2.3 ? fx.lerp(560, 690, fx.inOut(k2)) : fx.lerp(690, 800, fx.outCubic(k3));
  const y = t < 2.3 ? 70 : fx.lerp(70, 250, fx.inOut(k3));
  const ry = t < 1.1 ? fx.lerp(-17, -7, fx.outCubic(k1)) : t < 2.3 ? fx.lerp(-7, -3, k2) : fx.lerp(-3, 0, fx.outCubic(k3));
  const rx = t < 1.1 ? fx.lerp(9, 5, k1) : t < 2.3 ? fx.lerp(5, 3, k2) : fx.lerp(3, 0, k3);
  const rz = t < 1.1 ? fx.lerp(-6, -3.5, k1) : t < 2.3 ? fx.lerp(-3.5, -1.5, k2) : fx.lerp(-1.5, 0, k3);
  // la main qui tient le sachet tremble un peu pendant la déchirure
  const shake = fx.seg(t, 1.1, 1.4) * (1 - fx.seg(t, 2.2, 2.5));
  return {
    x: fx.wobble(t * 0.9, 1) * 8 + fx.wobble(t * 40, 5) * 3 * shake,
    y: y + fx.wobble(t * 0.8, 2) * 6 + fx.wobble(t * 37, 6) * 3 * shake,
    z,
    rx: rx + fx.wobble(t, 3) * 0.6,
    ry: ry + fx.wobble(t * 0.7, 4) * 0.8,
    rz: rz + fx.wobble(t * 33, 7) * 0.5 * shake,
  };
}

/** plan 2 : le sachet ouvert, en bas de l'image, d'où sortent les cartes */
const ZB = -780;
const YB = 505;
function packB(t: number): Tf {
  const settle = fx.outCubic(fx.seg(t, CUT, 4.2));
  const sway = fx.inOut(fx.seg(t, 5.3, 6.5));
  return { x: 0, y: YB + 40 * (1 - settle) + Math.sin(t * 1.3) * 6 * sway, z: ZB, ry: Math.sin(t * 0.9) * 5 * sway, rz: Math.sin(t * 0.7) * sway };
}

/** avancée de la déchirure (au-delà de 1 : les dernières tranches finissent de se soulever) */
const peel = (t: number) => 1.45 * Math.pow(fx.seg(t, 1.1, 2.3), 1.25);
/** soulèvement de la bande à une position (0 à 1 de gauche à droite) */
const lift = (p: number, xn: number) => fx.outCubic(fx.clamp((p - xn) / 0.45));
/** hauteur du jour qui s'ouvre sous la bande soulevée */
const GAP = 46;

function cardTf(i: number, t: number): Tf | null {
  const t0 = OUT_AT[i];
  if (t < CUT || t < t0) return null;
  const pk = packB(t);
  const hero = i === 2;
  const s0 = 1.15;
  // au fond du sachet (cachée par sa face), puis à moitié sortie
  const inside = pk.y! + TEAR + (CH / 2) * s0 + 20;
  const out = pk.y! + TEAR - (CH / 2) * s0 * (hero ? 0.62 : 0.4);
  const rise = fx.outCubic(fx.seg(t, t0, t0 + (hero ? 0.55 : 0.3)));
  const flyAt = hero ? 4.45 : t0 + 0.24;
  const fly = fx.seg(t, flyAt, flyAt + (hero ? 0.65 : 0.6));
  const f = FAN[i];
  const k = fx.outBack(fly, 1.25);
  const kz = fx.outCubic(fly);
  const settled = fx.seg(t, flyAt + 0.6, flyAt + 1.2);
  return {
    x: fx.lerp(0, f.x, k),
    y: fx.lerp(fx.lerp(inside, out, rise), f.y, k) + Math.sin(t * 1.5 + i * 0.9) * 7 * settled,
    z: fx.lerp(ZB + (i - 2) * 2.2, f.z, kz),
    ry: (hero ? 0 : (i < 2 ? 1 : -1) * 25 * Math.sin(Math.PI * fly)) + Math.sin(t * 0.8 + i) * 2.5 * settled,
    rz: fx.lerp(0, f.rz, k) + Math.sin(t * 1.1 + i) * 0.8 * settled,
    s: fx.lerp(s0, f.s, kz),
  };
}

// ───────────── les dessins (lumière, étincelles) ─────────────

let bg: CanvasRenderingContext2D | null = null;
let fg: CanvasRenderingContext2D | null = null;

const HONEY = 'rgba(255,211,107,1)';
const PINK = 'rgba(255,128,170,1)';
const WARM = 'rgba(255,240,214,1)';

/** étoile à quatre branches (les reflets du sachet et des cartes) */
function star(c: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, color: string, alpha: number) {
  if (alpha <= 0.01 || s <= 0.5) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = Math.min(1, alpha);
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = color;
  c.shadowColor = color;
  c.shadowBlur = s * 0.8;
  c.beginPath();
  c.moveTo(0, -s);
  c.quadraticCurveTo(s * 0.07, -s * 0.07, s, 0);
  c.quadraticCurveTo(s * 0.07, s * 0.07, 0, s);
  c.quadraticCurveTo(-s * 0.07, s * 0.07, -s, 0);
  c.quadraticCurveTo(-s * 0.07, -s * 0.07, 0, -s);
  c.fill();
  c.restore();
}

/** la ligne déchirée, chauffée à blanc */
function seam(c: CanvasRenderingContext2D, pts: V3[], alpha: number) {
  if (alpha <= 0 || pts.length < 2) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const k = pts[0][2];
  for (const [w, col, blur, a] of [
    [40, 'rgba(255,110,170,0.5)', 40, 0.8],
    [18, 'rgba(255,214,140,0.9)', 26, 1],
    [6, '#ffffff', 10, 1],
  ] as [number, string, number, number][]) {
    c.globalAlpha = Math.min(1, alpha * a);
    c.strokeStyle = col;
    c.lineWidth = w * k * 0.55;
    c.shadowColor = col;
    c.shadowBlur = blur;
    c.beginPath();
    pts.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  }
  c.restore();
}

/** points de la déchirure à l'écran, du bord gauche jusqu'à x (repère du sachet) */
function seamPts(f: Tf, upTo: number): V3[] {
  const out: V3[] = [];
  for (const [x, y] of TEAR_PTS) {
    if (x > upTo) break;
    out.push(onPack(f, x, y));
  }
  out.push(onPack(f, upTo, tearY(upTo)));
  return out;
}

/** paillettes qui flottent dans toute l'image */
function glitter(c: CanvasRenderingContext2D, t: number, seed: number, n: number, alpha: number, drift: number) {
  const r = fx.rng(seed);
  for (let i = 0; i < n; i++) {
    const x0 = r() * 1180 - 50;
    const y0 = r() * 2020 - 50;
    const ph = r() * 10;
    const sz = 8 + r() * 22;
    const col = [WARM, HONEY, PINK, '#ffffff'][Math.floor(r() * 4)];
    const y = ((((y0 - t * drift * (0.5 + r())) % 2020) + 2020) % 2020) - 50;
    const tw = Math.pow(0.5 + 0.5 * Math.sin(t * (2.5 + r() * 3) + ph), 3);
    star(c, x0 + Math.sin(t * 0.7 + ph) * 18, y, sz * (0.4 + tw * 0.8), ph, col, alpha * tw);
  }
}

/** braises qui montent du sachet ouvert */
function embers(c: CanvasRenderingContext2D, t: number, x: number, y: number, k: number, alpha: number) {
  if (alpha <= 0) return;
  const r = fx.rng(77);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const sp = 0.35 + r() * 0.5;
    const ph = (t * sp + r()) % 1;
    const dx = (r() - 0.5) * 380 * k;
    const col = [HONEY, PINK, WARM][i % 3];
    const ex = x + dx * (0.3 + ph) + Math.sin(t * 2 + i) * 14;
    const ey = y - ph * (520 + r() * 400) * k;
    c.globalAlpha = alpha * Math.sin(Math.PI * ph) * 0.9;
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 12;
    c.beginPath();
    c.arc(ex, ey, (2 + r() * 4) * k * (1.4 - ph), 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function drawA(t: number, f: Tf) {
  if (!bg || !fg) return;
  // fond assombri, une lueur rose derrière le sachet
  fx.linear(bg, 0, 0, 0, 1920, [
    [0, 'rgba(16,4,10,0.78)'],
    [0.5, 'rgba(16,4,10,0.55)'],
    [1, 'rgba(16,4,10,0.82)'],
  ]);
  const c0 = onPack(f, 0, 0);
  fx.glow(bg, c0[0], c0[1], 900, 'rgba(255,90,140,0.55)', 0.6);
  glitter(bg, t, 3, 26, 0.55, 30);

  const p = peel(t);
  const front = -PW / 2 + Math.min(1, p) * PW;
  // la traînée de lumière le long de la déchirure, et l'étincelle qui avance
  if (t >= 1.05) {
    const open = fx.seg(t, 2.3, CUT);
    // la lumière qui passe par le jour ouvert sous la bande
    if (t < 2.4) {
      const lower: V3[] = [];
      const upper: V3[] = [];
      for (const [x, y] of TEAR_PTS) {
        const u = lift(p, (x + PW / 2) / PW);
        if (u <= 0.01) continue;
        lower.push(onPack(f, x, y));
        upper.push(onPack(f, x, y - GAP * u, PD / 2 - 4 * u));
      }
      if (lower.length > 1) {
        fg.save();
        fg.globalCompositeOperation = 'lighter';
        fg.shadowColor = 'rgba(255,230,190,1)';
        fg.shadowBlur = 40;
        fg.fillStyle = 'rgba(255,246,232,0.95)';
        fg.beginPath();
        lower.forEach(([x, y], j) => (j ? fg!.lineTo(x, y) : fg!.moveTo(x, y)));
        for (let j = upper.length - 1; j >= 0; j--) fg.lineTo(upper[j][0], upper[j][1]);
        fg.closePath();
        fg.fill();
        fg.restore();
      }
    }
    seam(fg, seamPts(f, front), Math.min(1, fx.seg(t, 1.05, 1.2) * 1.4) * (1 + open));
    if (p < 1.02) {
      const [sx, sy, k] = onPack(f, front, tearY(front));
      fx.glow(fg, sx, sy, 260 * k, 'rgba(255,236,200,1)', 0.9);
      fx.glow(fg, sx, sy, 120 * k, 'rgba(255,255,255,1)', 1);
      star(fg, sx, sy, 150 * k * (0.85 + 0.15 * Math.sin(t * 60)), t * 3, '#ffffff', 1);
      star(fg, sx, sy, 80 * k, Math.PI / 4 + t * 2, 'rgba(255,214,140,1)', 0.9);
    }
    // gerbes d'étincelles qui partent du front de la déchirure
    for (let j = 1.1; j <= Math.min(t, 2.3); j += 0.045) {
      const pj = Math.min(1, peel(j));
      const fxj = -PW / 2 + pj * PW;
      const [bx, by, k] = onPack(packA(j), fxj, tearY(fxj));
      fx.burst(fg, t, j, { seed: Math.round(j * 1000), n: 5, x: bx, y: by, speed: 900 * k, gravity: 1400, life: 0.65, size: 7 * k, kind: 'streak', colors: ['#ffffff', '#ffe6b0', '#ffb3cf'], dir: -Math.PI / 2 - 0.4, spread: 2.4, drag: 2.4 });
    }
  }
  // le sachet s'ouvre : la lumière jaillit
  if (t >= 2.25) {
    const k = fx.seg(t, 2.25, CUT);
    const [ox, oy] = onPack(f, 0, TEAR);
    fx.rays(fg, ox, oy, 18, -Math.PI / 2 + t * 0.25, 'rgba(255,236,210,0.9)', 0.1 + 0.25 * k, 0.32, 2200);
    fx.glow(fg, ox, oy, 500 + 900 * fx.inCubic(k), 'rgba(255,240,220,1)', 0.5 + 0.5 * k);
    fx.burst(fg, t, 2.3, { seed: 23, n: 70, x: ox, y: oy, speed: 2200, gravity: 900, life: 1.0, size: 16, kind: 'spark', colors: ['#ffffff', '#ffe2a8', '#ffb0d0'], dir: -Math.PI / 2, spread: 2.6 });
  }
  // l'éclair blanc qui cache le changement de plan
  fx.flash(fg, fx.inCubic(fx.seg(t, 2.95, CUT)), '#fff8ee');
  fx.vignette(fg, 0.5);
}

function drawB(t: number, f: Tf) {
  if (!bg || !fg) return;
  fx.linear(bg, 0, 0, 0, 1920, [
    [0, 'rgba(16,4,10,0.62)'],
    [0.45, 'rgba(16,4,10,0.38)'],
    [1, 'rgba(16,4,10,0.78)'],
  ]);
  const [ox, oy, k] = onPack(f, 0, TEAR);
  const [cx, cy] = onPack(f, 0, 0);
  // halo sous le sachet, rayons qui montent de l'ouverture, lumière derrière l'éventail
  fx.glow(bg, cx, cy, 700, 'rgba(255,110,150,0.7)', 0.55);
  const fan = fx.seg(t, 4.5, 5.6);
  fx.rays(bg, ox, oy, 22, -Math.PI / 2 + t * 0.12, 'rgba(255,226,180,0.85)', 0.28 * (1 - 0.5 * fan), 0.3, 2400);
  fx.glow(bg, 540, 640, 900, 'rgba(255,205,120,0.7)', 0.2 + 0.35 * fan);
  fx.glow(bg, ox, oy, 380, 'rgba(255,240,220,1)', 0.65);
  glitter(bg, t, 5, 34, 0.7, 40);

  seam(fg, seamPts(f, PW / 2 + 8), 0.55 + 0.2 * Math.sin(t * 5));
  fx.glow(fg, ox, oy, 240 * k * 1.5, 'rgba(255,244,226,1)', 0.45);
  embers(fg, t, ox, oy, 1, fx.seg(t, CUT, 4.0));
  // une gerbe à chaque carte qui sort du sachet
  OUT_AT.forEach((t0, i) => fx.burst(fg!, t, t0 + 0.12, { seed: 300 + i, n: i === 2 ? 46 : 22, x: ox, y: oy - 40, speed: i === 2 ? 1300 : 900, gravity: 700, life: 0.9, size: i === 2 ? 14 : 10, kind: 'spark', colors: ['#ffffff', '#ffe2a8', '#ffb0d0'], dir: -Math.PI / 2, spread: 2.2 }));
  // la Prime arrive : onde de lumière
  fx.ring(fg, 540, 960 - 300, t, 5.0, 0.7, 520, 'rgba(255,236,190,1)', 34);
  glitter(fg, t + 3, 9, 16, 0.85, 50);
  // l'éclair qui s'efface
  fx.flash(fg, 1 - fx.outCubic(fx.seg(t, CUT + 0.08, 4.15)), '#fff8ee');
  fx.vignette(fg, 0.45);
}

// ───────────── la scène ─────────────

function frame(t: number) {
  for (const img of document.images) if (img.decoding !== 'sync') img.decoding = 'sync';
  // les animations CSS (reflets des cartes, éclat du sachet) suivent le même temps
  for (const a of document.getAnimations()) {
    a.pause();
    a.currentTime = t * 1000;
  }
  const A = t < CUT;
  const f = A ? packA(t) : packB(t);
  put('pack', f);

  const box = els.get('packbox');
  if (box) {
    box.style.setProperty('--hx', `${(50 + (f.ry ?? 0) * 3.2 + t * 9).toFixed(1)}%`);
    for (let j = 1; j <= 3; j++) box.style.setProperty(`--tw${j}`, Math.pow(0.5 + 0.5 * Math.sin(t * (3 + j) + j * 2.1), 2).toFixed(3));
  }

  // l'épaisseur du sachet n'est montée que dans le plan final : en gros plan, ces feuilles empilées seraient coupées
  // par les tranches qui pivotent (et le navigateur les dessinerait mal)
  for (let j = 0; j < 10; j++) {
    const ly = els.get(`ly${j}`);
    if (ly) ly.style.display = A ? 'none' : '';
  }

  // la bande du haut : chaque tranche se soulève quand la déchirure la dépasse, puis toute la bande s'envole
  put('strip-ob', A ? f : null);
  const strip = els.get('strip');
  if (strip) {
    const kf = fx.seg(t, 2.3, 2.9);
    strip.style.transform = kf > 0 ? `translate3d(${n1(300 * Math.pow(kf, 1.4))}px, ${n1(-900 * Math.pow(kf, 1.3))}px, ${n1(380 * kf)}px) rotateZ(${n1(32 * kf)}deg) rotateX(${n1(-50 * kf)}deg)` : '';
  }
  const p = peel(t);
  SLICES.forEach((sl, i) => {
    const el = els.get(`sl${i}`);
    if (!el) return;
    // la tranche se soulève en basculant vers l'arrière : un jour s'ouvre sous elle, d'où sort la lumière
    const u = lift(p, sl.xn);
    const a = 54 * u + Math.sin(t * 30 + i * 0.4) * 3 * u * (1 - u);
    el.style.transform = `translateZ(${n1(PD / 2 + 0.5 - 4 * u)}px) translateY(${n1(-GAP * u)}px) rotateX(${n1(a)}deg)`;
  });

  CARDS.forEach((_, i) => put(`card${i}`, cardTf(i, t)));

  // le paysage du fond : flou et proche en gros plan, net et plus loin ensuite
  const land = els.get('land');
  if (land) {
    if (A) {
      const k = fx.seg(t, 0, CUT);
      land.style.transform = `translate(${n1(-(f.ry ?? 0) * 6)}px, ${n1(-40 - 60 * k)}px) scale(${(1.45 + 0.12 * k).toFixed(4)})`;
      land.style.filter = 'blur(10px) saturate(1.1)';
    } else {
      const k = fx.seg(t, CUT, DURATION);
      land.style.transform = `translate(${n1(-(f.ry ?? 0) * 3)}px, ${n1(30 - 30 * k)}px) scale(${(1.1 - 0.05 * fx.outCubic(k)).toFixed(4)})`;
      land.style.filter = 'blur(1.5px)';
    }
  }

  // caméra : coups de poing aux deux éclats, léger travelling ensuite
  const cam = els.get('cam');
  if (cam) {
    let s = A ? 1 : 1 + 0.035 * fx.inOut(fx.seg(t, 5, DURATION));
    let x = 0;
    let y = 0;
    for (const [ti, amp, pu] of [
      [2.3, 16, 0.045],
      [CUT, 12, 0.05],
      [3.7, 5, 0.015],
    ] as [number, number, number][]) {
      if (t < ti) continue;
      const d = Math.exp(-(t - ti) * 7);
      x += amp * d * fx.wobble(t * 47, ti);
      y += amp * d * fx.wobble(t * 41, ti + 3);
      s += pu * Math.exp(-(t - ti) * 9);
    }
    cam.style.transform = `translate(${n1(x)}px, ${n1(y)}px) scale(${s.toFixed(4)})`;
  }

  bg?.clearRect(0, 0, fx.W, fx.H);
  fg?.clearRect(0, 0, fx.W, fx.H);
  if (A) drawA(t, f);
  else drawB(t, f);

  // le logo, puis l'appel à jouer
  const logo = els.get('logo');
  if (logo) {
    const k = fx.seg(t, 5.0, 5.55);
    logo.style.opacity = fx.outCubic(k).toFixed(3);
    logo.style.transform = `translateY(${n1(-30 * (1 - fx.outCubic(k)))}px) scale(${(0.82 + 0.18 * fx.outBack(k, 1.6)).toFixed(4)})`;
  }
  const cta = els.get('cta');
  if (cta) {
    const k = fx.seg(t, 5.9, 6.4);
    cta.style.opacity = fx.outCubic(k).toFixed(3);
    cta.style.transform = `translateY(${n1(40 * (1 - fx.outCubic(k)))}px)`;
  }
}

function Stars() {
  // quelques reflets étoilés imprimés sur la feuille holographique
  const spots: [number, number, number, number][] = [
    [0.18, 0.3, 26, 1],
    [0.82, 0.24, 18, 2],
    [0.7, 0.5, 30, 3],
    [0.12, 0.62, 16, 2],
    [0.88, 0.7, 22, 1],
    [0.42, 0.9, 14, 3],
    [0.3, 0.44, 12, 1],
  ];
  return (
    <svg className="mxa-stars" viewBox={`0 0 ${PW} ${PH}`} aria-hidden="true">
      {spots.map(([x, y, s, g], i) => (
        <path
          key={i}
          d={`M0 ${-s} Q${s * 0.08} ${-s * 0.08} ${s} 0 Q${s * 0.08} ${s * 0.08} 0 ${s} Q${-s * 0.08} ${s * 0.08} ${-s} 0 Q${-s * 0.08} ${-s * 0.08} 0 ${-s}Z`}
          transform={`translate(${x * PW} ${y * PH})`}
          fill="#fffaf0"
          style={{ opacity: `var(--tw${g})` } as CSSProperties}
        />
      ))}
    </svg>
  );
}

function Face() {
  return (
    <>
      <PackArtMexique />
      <i className="mxa-holo" />
      <Stars />
    </>
  );
}

function Pub() {
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    bg = back.current!.getContext('2d');
    fg = front.current!.getContext('2d');
    document.querySelectorAll('img').forEach((img) => (img.loading = 'eager'));
    frame(0);
  }, []);
  const layers = 10;
  return (
    <div className="mxa">
      <div className="mxa-cam" ref={reg('cam')}>
        <div className="mxa-land" ref={reg('land')}>
          <MexicoBackdrop scene="desierto" seed="pub-mexique" />
        </div>
        <canvas className="mxa-cv" ref={back} width={1080} height={1920} />
        <div className="mxa-world">
          <div className="mxa-ob" ref={reg('pack')}>
            <div className="mxa-in">
              <div className="mxa-pack" ref={reg('packbox')} style={{ width: PW, height: PH }}>
                {Array.from({ length: layers }, (_, i) => {
                  const v = (i / (layers - 1)) * 2 - 1;
                  return <div key={i} className="mxa-layer" ref={reg(`ly${i}`)} style={{ clipPath: BODY_CLIP, transform: `translateZ(${(v * (PD / 2 - 1)).toFixed(1)}px)` }} />;
                })}
                <div className="mxa-face" style={{ clipPath: BODY_CLIP, transform: `translateZ(${PD / 2}px)` }}>
                  <Face />
                </div>
              </div>
            </div>
          </div>
          {CARDS.map((card, i) => (
            <div key={i} className="mxa-ob" ref={reg(`card${i}`)} style={{ display: 'none' }}>
              <div className="mxa-in" style={{ width: CW, height: CH }}>
                <Card card={card} size="xl" />
              </div>
            </div>
          ))}
        </div>
        {/* la bande du haut, dans sa propre scène posée par-dessus : ses tranches qui pivotent ne croisent pas les plans
            du sachet (le navigateur les découperait mal) */}
        <div className="mxa-world">
          <div className="mxa-ob" ref={reg('strip-ob')}>
            <div className="mxa-in">
              <div className="mxa-pack" style={{ width: PW, height: PH }}>
          <div className="mxa-strip" ref={reg('strip')} style={{ transformOrigin: `${PW / 2}px ${(TEAR + PH / 2).toFixed(1)}px` }}>
            {SLICES.map((sl, i) => (
              <div
                key={i}
                className="mxa-slice"
                ref={reg(`sl${i}`)}
                style={{ left: sl.a + PW / 2, width: sl.w, height: STRIP_H, transformOrigin: `${(sl.w / 2).toFixed(1)}px ${(TEAR + PH / 2).toFixed(1)}px` }}
              >
                <div className="mxa-face mxa-cut" style={{ clipPath: sl.front }}>
                  <div className="mxa-art" style={{ left: -(sl.a + PW / 2), width: PW, height: PH }}>
                    <Face />
                  </div>
                </div>
                <div className="mxa-face mxa-inside" style={{ clipPath: sl.back, transform: 'rotateX(180deg)' }} />
              </div>
            ))}
          </div>
              </div>
            </div>
          </div>
        </div>
        <canvas className="mxa-cv" ref={front} width={1080} height={1920} />
      </div>
      <div className="mxa-logo" ref={reg('logo')} style={{ opacity: 0 }}>
        <Logo />
      </div>
      <div className="mxa-cta" ref={reg('cta')} style={{ opacity: 0 }}>
        <b>Ouvre ton booster Mexique</b>
        <span>Gratuit sur animalcards.fr</span>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    __seek: (t: number) => void;
    __duration: number;
    __audio: () => Promise<string>;
  }
}

window.__seek = frame;
window.__duration = DURATION;
window.__audio = () => renderSoundtrack(DURATION);

createRoot(document.getElementById('root')!).render(<Pub />);
