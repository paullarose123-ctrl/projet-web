import { area, circle, ellipse, f, hashString, hills, mix, mountain, mulberry32, pine, poly, spots, type Rng } from './kit';

// Paysage de la Série 3 (Hiver), pour son booster et le dos de ses cartes : une nuit polaire sous une aurore
// boréale, la pleine lune derrière des sommets enneigés et des sapins chargés de neige, pendant que la neige tombe.
// Caché dans la neige, un petit renard polaire : blanc sur blanc, on ne voit presque que ses yeux et sa truffe.
// Même langage que les autres affiches : aplats, brume entre les plans.
// Le dessin est tracé une fois par format (sachet 120 × 172, carte 100 × 140).

const SKY = ['#081a33', '#1d4f6e', '#7fc4cf'];
const MOON = '#f4fbff';
const SNOW = '#f4f9ff';
const FAR = '#a9c9e2';
const NEAR = '#0b2236';
const tone = (t: number) => mix(FAR, NEAR, t);
const AURORA = ['#7ff0c1', '#5fd4d8', '#b28cff'];

/** Sapin enneigé : le sapin sombre, et un bonnet de neige sur sa pointe et ses premières branches. */
function snowyPine(x: number, y: number, h: number): { tree: string; snow: string } {
  return { tree: pine(x, y, h), snow: pine(x, y - h * 0.5, h * 0.48) + pine(x, y - h * 0.18, h * 0.3) };
}

/** Renard polaire assis, de profil vers la gauche, la queue enroulée autour des pattes (pattes à y = 0, 12 × 12). */
function fox(): { body: string; shade: string; eye: string; nose: string } {
  return {
    body:
      ellipse(5, -1.7, 5, 2) + // queue en panache, enroulée
      ellipse(1.6, -3.6, 3.6, 3.4) + // corps assis
      ellipse(-0.8, -4.8, 2, 2.9) + // poitrail
      circle(-1.6, -8.4, 2.3) + // tête
      poly([
        [-3.3, -9.2],
        [-5.8, -8],
        [-3.2, -7.1],
      ]) + // museau
      poly([
        [-3, -10.1],
        [-2.8, -12.3],
        [-1.6, -10.6],
      ]) + // oreilles
      poly([
        [-1.1, -10.6],
        [0.1, -12.2],
        [0.4, -9.9],
      ]) +
      poly([
        [-2, -3],
        [-0.9, -3],
        [-0.8, 0],
        [-2.1, 0],
      ]), // patte avant
    shade: ellipse(2.4, -1, 3.6, 1.1) + ellipse(6.6, -1.2, 3, 1.1) + ellipse(0.4, -10.9, 0.5, 0.9),
    eye: circle(-2.3, -8.9, 0.36),
    nose: circle(-5.7, -8, 0.42),
  };
}

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

interface WinterArt {
  stars: string[];
  aurora: string[];
  far: { body: string; shadow: string; snow: string }[];
  rows: { ground: string; pines: string; pinesSnow: string }[];
  drifts: string;
  foxAt: [number, number, number];
  flakes: string;
  dots: string;
}

const cache = new Map<string, WinterArt>();

function trace(w: number, h: number, seed: string, foxSpot: 'rangee' | 'neige'): WinterArt {
  const r = mulberry32(hashString(seed));
  const k = h / 172;
  const stars = ['', '', ''];
  for (let i = 0; i < 30; i++) stars[i % 3] += circle(r() * w, r() * 60 * k, 0.18 + r() * 0.4);
  const aurora = [ribbon(r, w, 40 * k, 11 * k, 7 * k), ribbon(r, w, 52 * k, 8 * k, 6 * k), ribbon(r, w, 30 * k, 6 * k, 5 * k)];
  const far = [mountain(r, w * 0.22, 66 * k, 112 * k, w * 0.4, w * 0.32), mountain(r, w * 0.74, 58 * k, 112 * k, w * 0.36, w * 0.42), mountain(r, w * 0.5, 76 * k, 114 * k, w * 0.3, w * 0.28)];
  const profiles: ((x: number) => number)[] = [];
  const rows = [
    { base: 110, amp: 3, min: 8, max: 12, gap: 9 },
    { base: 124, amp: 2.8, min: 14, max: 20, gap: 14 },
    { base: 140, amp: 2, min: 0, max: 0, gap: 0 },
  ].map(({ base, amp, min, max, gap }) => {
    const profile = hills(r, base * k, amp * k);
    profiles.push(profile);
    const trees = min ? spots(r, profile, w, min * k, max * k, gap * k) : [];
    const made = trees.map(([x, y, s]) => snowyPine(x, y, s));
    return { ground: area(profile, w), pines: made.map((t) => t.tree).join(''), pinesSnow: made.map((t) => t.snow).join('') };
  });
  // congères bleutées sur la neige du premier plan
  let drifts = '';
  for (let i = 0; i < 4; i++) drifts += ellipse(w * (0.2 + i * 0.22) + (r() - 0.5) * 8 * k, (150 + r() * 14) * k, (14 + r() * 10) * k, 1.6 * k);
  // les grands sapins du premier plan, sur les bords
  const edgeL = snowyPine(w * 0.08, 150 * k, 46 * k);
  const edgeR = snowyPine(w * 0.92, 152 * k, 38 * k);
  rows[2].pines = edgeL.tree + edgeR.tree;
  rows[2].pinesSnow = edgeL.snow + edgeR.snow;
  let flakes = '';
  let dots = '';
  for (let i = 0; i < 22; i++) {
    const x = r() * w;
    const y = r() * h;
    if (i % 3 === 0) flakes += flake(x, y, (0.9 + r() * 1.2) * k * 1.4);
    else dots += circle(x, y, (0.35 + r() * 0.5) * k * 1.3);
  }
  // le renard : sur la neige de la deuxième rangée (booster, dont le bas porte le nom), ou au pied du grand sapin
  // du premier plan, devant son tronc sombre (dos des cartes)
  const fx = w * (foxSpot === 'rangee' ? 0.84 : 0.85);
  const foxAt: [number, number, number] = foxSpot === 'rangee' ? [fx, profiles[1](fx) + 1.6 * k, 0.8 * k] : [fx, 155 * k, 1.05 * k];
  return { stars, aurora, far, rows, drifts, foxAt, flakes, dots };
}

/** Le paysage d'hiver, à poser dans un SVG de viewBox `0 0 w h`. */
export function WinterScene({
  w,
  h,
  id,
  seed,
  moon = [0.5, 0.36],
  foxSpot = 'neige',
}: {
  w: number;
  h: number;
  id: string;
  seed: string;
  moon?: [number, number];
  foxSpot?: 'rangee' | 'neige';
}) {
  const key = `${seed}:${w}x${h}:${foxSpot}`;
  let art = cache.get(key);
  if (!art) {
    art = trace(w, h, seed, foxSpot);
    cache.set(key, art);
  }
  const k = h / 172;
  const [mx, my] = [w * moon[0], h * moon[1]];
  const foxShape = fox();
  const mist = (y0: number, y1: number, opacity: number) => <rect x={-2} y={y0 * k} width={w + 4} height={(y1 - y0) * k} fill={`url(#${id}-mist)`} opacity={opacity} />;
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SKY[0]} />
          <stop offset="0.5" stopColor={SKY[1]} />
          <stop offset="0.78" stopColor={SKY[2]} />
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
        <linearGradient id={`${id}-mist`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SKY[2]} stopOpacity={0} />
          <stop offset="1" stopColor={SNOW} stopOpacity={0.8} />
        </linearGradient>
        <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.7" stopColor={SNOW} />
          <stop offset="1" stopColor="#bcd5ea" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation={1.6 * k} />
        </filter>
      </defs>
      <rect x={-2} y={-2} width={w + 4} height={h + 4} fill={`url(#${id}-sky)`} />
      {art.stars.map((d, i) => (
        <path key={i} d={d} fill="#ffffff" opacity={[0.8, 0.5, 0.3][i]} />
      ))}
      {/* aurore boréale */}
      <g filter={`url(#${id}-blur)`}>
        {art.aurora.map((d, i) => (
          <path key={i} d={d} fill={`url(#${id}-aurora)`} opacity={[0.75, 0.55, 0.45][i]} />
        ))}
      </g>
      {/* pleine lune */}
      <circle cx={mx} cy={my} r={48 * k} fill={`url(#${id}-glow)`} />
      <circle cx={mx} cy={my} r={24 * k} fill="none" stroke={MOON} strokeOpacity={0.18} strokeWidth={0.5} />
      <circle cx={mx} cy={my} r={13 * k} fill={MOON} />
      <circle cx={mx + 3.5 * k} cy={my - 2.5 * k} r={2.4 * k} fill="#d6e6f2" opacity={0.6} />
      <circle cx={mx - 4 * k} cy={my + 3 * k} r={1.6 * k} fill="#d6e6f2" opacity={0.5} />
      {/* sommets enneigés */}
      {art.far.map((m, i) => (
        <g key={i}>
          <path d={m.body} fill={mix(FAR, SKY[1], 0.25 + i * 0.05)} />
          <path d={m.shadow} fill={NEAR} opacity={0.22} />
          <path d={m.snow} fill={SNOW} opacity={0.95} />
        </g>
      ))}
      {mist(84, 114, 0.6)}
      <path d={art.rows[0].ground} fill={mix(SNOW, FAR, 0.35)} />
      <path d={art.rows[0].pines} fill={tone(0.45)} />
      <path d={art.rows[0].pinesSnow} fill={SNOW} opacity={0.85} />
      {mist(110, 130, 0.35)}
      <path d={art.rows[1].ground} fill={mix(SNOW, FAR, 0.18)} />
      <path d={art.rows[1].pines} fill={tone(0.7)} />
      <path d={art.rows[1].pinesSnow} fill={SNOW} opacity={0.9} />
      <path d={art.rows[2].ground} fill={`url(#${id}-ground)`} />
      <path d={art.drifts} fill="#9fbfdc" opacity={0.45} />
      <path d={art.rows[2].pines} fill={NEAR} />
      <path d={art.rows[2].pinesSnow} fill={SNOW} opacity={0.92} />
      {/* le renard polaire, blanc sur la neige : une ombre bleutée, ses yeux et sa truffe */}
      <g transform={`translate(${f(art.foxAt[0])} ${f(art.foxAt[1])}) scale(${f(art.foxAt[2])})`}>
        <ellipse cx={2.5} cy={0.2} rx={7.5} ry={0.9} fill="#9fbfdc" opacity={0.45} />
        <path d={foxShape.body} fill="#eaf2fa" />
        <path d={foxShape.shade} fill="#bcd2e8" />
        <path d={foxShape.eye} fill={NEAR} />
        <path d={foxShape.nose} fill={NEAR} />
      </g>
      {/* la neige tombe */}
      <path d={art.dots} fill="#ffffff" opacity={0.75} />
      <path d={art.flakes} fill="none" stroke="#ffffff" strokeOpacity={0.8} strokeWidth={0.45 * k * 1.3} strokeLinecap="round" />
    </>
  );
}

export const HIVER_NEAR = NEAR;
