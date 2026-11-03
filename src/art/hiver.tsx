import { circle, ellipse, f, hashString, mulberry32, poly, type Rng } from './kit';

// Paysage de la Série 3 (Hiver), pour son booster et le dos de ses cartes : la banquise une nuit d'hiver polaire.
// Une aurore boréale ondule au-dessus des icebergs, la lune se reflète dans la mer gelée, et un ours polaire avance
// sur une plaque de glace pendant que la neige tombe. Volontairement loin de la vallée de sapins de la Série 1 :
// pas de forêt ni de montagnes, l'horizon plat de l'Arctique.
// Le dessin est tracé une fois par format (sachet 120 × 172, carte 100 × 140).

const SKY = ['#081a33', '#1d4f6e', '#7fc4cf'];
const MOON = '#f4fbff';
const SNOW = '#f4f9ff';
const ICE_SIDE = '#8fb8d6';
const ICE_SHADE = '#c6dcee';
const WATER = ['#1a5873', '#0b2a42'];
const NEAR = '#0b2236';
const AURORA = ['#7ff0c1', '#5fd4d8', '#b28cff'];
const BEAR = '#f7f3e8';
const BEAR_SHADE = '#c9d8e6';

/** Flocon à six branches. */
function flake(x: number, y: number, s: number): string {
  let d = '';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    const dx = Math.cos(a) * s;
    const dy = Math.sin(a) * s;
    d += `M${f(x - dx)} ${f(y - dy)}L${f(x + dx)} ${f(y + dy)}`;
  }
  return d;
}

/** Ruban d'aurore : une bande ondulée qui traverse le ciel. */
function ribbon(r: Rng, w: number, y: number, thick: number, wave: number): string {
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  const phase = r() * Math.PI * 2;
  for (let x = -4; x <= w + 4; x += 4) {
    const k = Math.sin(x / (w / 2.2) + phase) * wave + Math.sin(x / 7 + phase * 2) * 0.8;
    const t = thick * (0.6 + 0.4 * Math.sin(x / (w / 3) + phase));
    top.push([x, y + k - t]);
    bottom.push([x, y + k + t * 0.4]);
  }
  return poly([...top, ...bottom.reverse()]);
}

/** Iceberg posé sur l'horizon : sa face éclairée et sa face à l'ombre. */
function iceberg(r: Rng, x: number, base: number, w: number, h: number): { lit: string; shade: string } {
  const n = 4 + Math.floor(r() * 2);
  const top: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const bump = Math.sin(t * Math.PI) * (0.65 + r() * 0.35);
    top.push([x - w / 2 + t * w, base - h * bump - (i % 2 ? r() * h * 0.15 : 0)]);
  }
  const peak = top.reduce((a, b) => (b[1] < a[1] ? b : a));
  const lit = poly([[x - w / 2, base], ...top, [x + w / 2, base]]);
  const shade = poly([peak, ...top.filter(([px]) => px > peak[0]), [x + w / 2, base], [peak[0] + w * 0.08, base]]);
  return { lit, shade };
}

/** Plaque de glace vue de biais : son dessus, et son épaisseur bleutée. */
function floe(r: Rng, cx: number, cy: number, w: number, h: number, thick: number): { top: string; side: string } {
  const pts: [number, number][] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.82 + r() * 0.22;
    pts.push([cx + Math.cos(a) * (w / 2) * k, cy + Math.sin(a) * (h / 2) * k]);
  }
  return { top: poly(pts), side: poly(pts.map(([x, y]): [number, number] => [x, y + thick])) };
}

/** Ours polaire de profil, tourné vers la droite, pattes à y = 0 (repère d'environ 34 × 18). */
function bear(): { far: string; body: string; eye: string; nose: string } {
  const leg = (x0: number, x1: number, top: number) =>
    poly([
      [x0, top],
      [x1, top],
      [x1 + 0.4, -0.4],
      [x1 + 0.9, 0],
      [x0 - 0.3, 0],
      [x0 - 0.2, -0.5],
    ]);
  return {
    far: leg(-5.6, -2.4, -7) + leg(3.4, 6.6, -7),
    body:
      ellipse(-0.5, -8.6, 11, 5.6) + // corps
      ellipse(-7.4, -9, 5.4, 5.2) + // croupe
      ellipse(5.4, -10.2, 5.2, 4.6) + // épaules (la bosse de l'ours)
      ellipse(11.6, -8.4, 4.4, 3.1) + // tête, basse
      ellipse(15.6, -7.6, 2.5, 1.8) + // museau
      circle(10.6, -11, 1.2) + // oreille
      ellipse(-12.2, -10.6, 1.2, 0.9) + // queue
      leg(-10, -6.4, -6.5) +
      leg(6.6, 10, -6.5),
    eye: circle(13.4, -9.2, 0.45),
    nose: circle(18, -7.8, 0.65),
  };
}

interface WinterArt {
  stars: string[];
  aurora: string[];
  bergs: { lit: string; shade: string }[];
  floes: { top: string; side: string }[];
  bigFloe: { top: string; side: string };
  glints: string;
  flakes: string;
  dots: string;
}

const cache = new Map<string, WinterArt>();

function trace(w: number, h: number, seed: string, horizon: number, bearY: number, moonX: number): WinterArt {
  const r = mulberry32(hashString(seed));
  const k = h / 172;
  const stars = ['', '', ''];
  for (let i = 0; i < 34; i++) stars[i % 3] += circle(r() * w, r() * (horizon - 10 * k), 0.18 + r() * 0.4);
  const aurora = [ribbon(r, w, 40 * k, 11 * k, 7 * k), ribbon(r, w, 52 * k, 8 * k, 6 * k), ribbon(r, w, 30 * k, 6 * k, 5 * k)];
  const bergs = [iceberg(r, w * 0.14, horizon, w * 0.3, 15 * k), iceberg(r, w * 0.82, horizon, w * 0.38, 21 * k), iceberg(r, w * 0.52, horizon, w * 0.16, 8 * k)];
  // plaques de glace dérivant sur la mer, plus grandes en se rapprochant
  const floes: { top: string; side: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const depth = (i + 1) / 7;
    const y = horizon + 4 * k + depth * (h - horizon) * 0.75;
    const x = (i % 2 ? 0.78 : 0.2) * w + (r() - 0.5) * w * 0.2;
    const fw = (8 + depth * 26) * k;
    floes.push(floe(r, x, y, fw, fw * 0.22, (0.6 + depth * 1.6) * k));
  }
  const bigFloe = floe(r, w * 0.5, bearY + 1.5 * k, w * 0.62, 9 * k, 3.2 * k);
  // reflets de la lune sur l'eau, en petits traits, juste sous la lune
  let glints = '';
  for (let i = 0; i < 9; i++) {
    const y = horizon + (3 + i * 2.6) * k;
    const half = (6 - i * 0.45) * k * (0.6 + r() * 0.6);
    const x = moonX + (r() - 0.5) * 4 * k;
    glints += `M${f(x - half)} ${f(y)}H${f(x + half)}`;
  }
  let flakes = '';
  let dots = '';
  for (let i = 0; i < 24; i++) {
    const x = r() * w;
    const y = r() * h;
    if (i % 3 === 0) flakes += flake(x, y, (0.9 + r() * 1.2) * k * 1.4);
    else dots += circle(x, y, (0.35 + r() * 0.5) * k * 1.3);
  }
  return { stars, aurora, bergs, floes, bigFloe, glints, flakes, dots };
}

/**
 * La banquise d'hiver, à poser dans un SVG de viewBox `0 0 w h`. `horizon` et `bearY` sont en fraction de la
 * hauteur : l'ours se place plus haut sur le booster (dont le bas porte le nom) que sur le dos des cartes.
 */
export function WinterScene({
  w,
  h,
  id,
  seed,
  moon = [0.5, 0.36],
  horizon = 0.56,
  bearY = 0.7,
}: {
  w: number;
  h: number;
  id: string;
  seed: string;
  moon?: [number, number];
  horizon?: number;
  bearY?: number;
}) {
  const key = `${seed}:${w}x${h}:${horizon}:${bearY}:${moon[0]}`;
  const hy = h * horizon;
  const by = h * bearY;
  let art = cache.get(key);
  if (!art) {
    art = trace(w, h, seed, hy, by, w * moon[0]);
    cache.set(key, art);
  }
  const k = h / 172;
  const [mx, my] = [w * moon[0], h * moon[1]];
  const b = bear();
  const bearAt = `translate(${f(w * 0.5)} ${f(by)}) scale(${f(1.08 * k)})`;
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SKY[0]} />
          <stop offset="0.65" stopColor={SKY[1]} />
          <stop offset="1" stopColor={SKY[2]} />
        </linearGradient>
        <linearGradient id={`${id}-aurora`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={AURORA[0]} />
          <stop offset="0.5" stopColor={AURORA[1]} />
          <stop offset="1" stopColor={AURORA[2]} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={MOON} stopOpacity={0.55} />
          <stop offset="0.35" stopColor={MOON} stopOpacity={0.18} />
          <stop offset="1" stopColor={MOON} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={WATER[0]} />
          <stop offset="1" stopColor={WATER[1]} />
        </linearGradient>
        <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SKY[2]} stopOpacity={0} />
          <stop offset="1" stopColor={SKY[2]} stopOpacity={0.7} />
        </linearGradient>
        <filter id={`${id}-blur`} x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation={1.6 * k} />
        </filter>
      </defs>
      <rect x={-2} y={-2} width={w + 4} height={hy + 2} fill={`url(#${id}-sky)`} />
      {art.stars.map((d, i) => (
        <path key={i} d={d} fill="#ffffff" opacity={[0.8, 0.5, 0.3][i]} />
      ))}
      {/* aurore boréale */}
      <g filter={`url(#${id}-blur)`}>
        {art.aurora.map((d, i) => (
          <path key={i} d={d} fill={`url(#${id}-aurora)`} opacity={[0.75, 0.55, 0.45][i]} />
        ))}
      </g>
      {/* lune */}
      <circle cx={mx} cy={my} r={42 * k} fill={`url(#${id}-glow)`} />
      <circle cx={mx} cy={my} r={21 * k} fill="none" stroke={MOON} strokeOpacity={0.16} strokeWidth={0.5} />
      <circle cx={mx} cy={my} r={11 * k} fill={MOON} />
      <circle cx={mx + 3 * k} cy={my - 2 * k} r={2 * k} fill="#d6e6f2" opacity={0.6} />
      <circle cx={mx - 3.4 * k} cy={my + 2.6 * k} r={1.4 * k} fill="#d6e6f2" opacity={0.5} />
      {/* brume au ras de l'horizon, et les icebergs */}
      <rect x={-2} y={hy - 22 * k} width={w + 4} height={22 * k} fill={`url(#${id}-haze)`} />
      {art.bergs.map((berg, i) => (
        <g key={i}>
          <path d={berg.lit} fill={i === 2 ? ICE_SHADE : SNOW} />
          <path d={berg.shade} fill={ICE_SIDE} opacity={0.75} />
        </g>
      ))}
      {/* la mer gelée, le reflet de la lune */}
      <rect x={-2} y={hy} width={w + 4} height={h - hy + 2} fill={`url(#${id}-water)`} />
      <path d={art.glints} stroke={MOON} strokeOpacity={0.55} strokeWidth={0.7 * k} strokeLinecap="round" />
      {art.floes.map((fl, i) => (
        <g key={i}>
          <path d={fl.side} fill={ICE_SIDE} />
          <path d={fl.top} fill={i < 2 ? ICE_SHADE : SNOW} />
        </g>
      ))}
      {/* la plaque de l'ours, son ombre, et l'ours polaire */}
      <path d={art.bigFloe.side} fill={ICE_SIDE} />
      <path d={art.bigFloe.top} fill={SNOW} />
      <ellipse cx={w * 0.5 + 2 * k} cy={by + 0.8 * k} rx={17 * k} ry={1.6 * k} fill={ICE_SIDE} opacity={0.55} />
      <g transform={bearAt}>
        <path d={b.far} fill={BEAR_SHADE} />
        <path d={b.body} fill={BEAR} />
        <path d={b.eye} fill={NEAR} />
        <path d={b.nose} fill={NEAR} />
      </g>
      {/* la neige tombe */}
      <path d={art.dots} fill="#ffffff" opacity={0.75} />
      <path d={art.flakes} fill="none" stroke="#ffffff" strokeOpacity={0.8} strokeWidth={0.45 * k * 1.3} strokeLinecap="round" />
    </>
  );
}

export const HIVER_NEAR = NEAR;
