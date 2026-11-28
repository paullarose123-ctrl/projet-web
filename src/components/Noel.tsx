import type { ReactNode } from 'react';
import { circle, ellipse, f, poly, type Pt, type Rng } from '../art/kit';
import { timing } from './MexicoBackdrop';

// Décors de Noël (du 1er décembre au 6 janvier, voir engine/season.ts et components/Saison.tsx) : sapins décorés,
// cadeaux, bonhomme de neige, sucres d'orge, boules de Noël, houx, guirlande lumineuse, neige et stalactites de glace.
// Même langage que les autres fêtes : des aplats, quelques lueurs qui respirent (classe mx-glow, voir motion.css).

export const XMAS = {
  red: '#d7263d',
  redDark: '#9e1428',
  gold: '#f2c14e',
  goldDark: '#c58f1f',
  green: '#2f8f5b',
  greenDark: '#1d6040',
  blue: '#4aa3df',
  pine: '#1d5b45',
  pineDark: '#123d2f',
  snow: '#f1f7ff',
  snowShade: '#bcd3ea',
  trunk: '#6b4226',
};

const LIGHTS = ['#ff5a6a', '#ffd166', '#5ee08f', '#6fd0ff'];

/** Étoile à cinq branches de centre (x, y) et de rayon r. */
export function star(x: number, y: number, r: number): string {
  const pts: Pt[] = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const d = k % 2 ? r * 0.45 : r;
    pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
  }
  return poly(pts);
}

/** Flocon à six branches (tracé à l'épaisseur du trait), chaque branche avec deux petites barbes. */
export function flakePath(x: number, y: number, s: number): string {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const [cx, cy] = [Math.cos(a), Math.sin(a)];
    d += `M${f(x)} ${f(y)}L${f(x + cx * s)} ${f(y + cy * s)}`;
    const [bx, by] = [x + cx * s * 0.6, y + cy * s * 0.6];
    for (const side of [-1, 1]) {
      const b = a + side * 0.7;
      d += `M${f(bx)} ${f(by)}L${f(bx + Math.cos(b) * s * 0.3)} ${f(by + Math.sin(b) * s * 0.3)}`;
    }
  }
  return d;
}

/** Une petite lumière de guirlande : une lueur qui respire et l'ampoule. */
function light(key: string | number, id: string, x: number, y: number, s: number, color: string, r: Rng): ReactNode {
  return (
    <g key={key}>
      <circle className="mx-glow" cx={x} cy={y} r={s * 3.2} fill={`url(#${id}-light)`} style={timing(1.2 + r() * 1.4, r() * 2)} />
      <circle cx={x} cy={y} r={s} fill={color} />
    </g>
  );
}

/** Boule de Noël de rayon s accrochée en (x, y) (le haut de son attache) : attache dorée, reflet, un liseré. */
export function bauble(key: string | number, x: number, y: number, s: number, color: string, band = '#fff3d6'): ReactNode {
  const cy = y + s * 0.55 + s;
  return (
    <g key={key}>
      <rect x={f(x - s * 0.32)} y={f(y)} width={f(s * 0.64)} height={f(s * 0.55)} rx={f(s * 0.1)} fill={XMAS.gold} />
      <circle cx={x} cy={cy} r={s} fill={color} />
      <path d={ellipse(x + s * 0.18, cy + s * 0.3, s * 0.78, s * 0.62)} fill="#000" opacity={0.18} />
      <path d={`M${f(x - s * 0.96)} ${f(cy - s * 0.1)}Q${f(x)} ${f(cy + s * 0.32)} ${f(x + s * 0.96)} ${f(cy - s * 0.1)}`} fill="none" stroke={band} strokeWidth={f(s * 0.16)} opacity={0.85} />
      <path d={ellipse(x - s * 0.38, cy - s * 0.4, s * 0.24, s * 0.16)} fill="#fff" opacity={0.75} />
    </g>
  );
}

/**
 * Sapin de Noël posé en (x, y) (le pied), de hauteur h : trois étages poudrés de neige, une guirlande dorée, des boules,
 * des lumières qui respirent et l'étoile au sommet.
 */
export function xmasTree(key: string | number, id: string, x: number, y: number, h: number, r: Rng, lights = true): ReactNode {
  const tiers: [apex: number, base: number, half: number][] = [
    [y - h * 0.66, y - h * 0.1, h * 0.36],
    [y - h * 0.84, y - h * 0.38, h * 0.28],
    [y - h * 0.98, y - h * 0.6, h * 0.2],
  ];
  let body = '';
  let shade = '';
  let snow = '';
  for (const [apex, base, half] of tiers) {
    body += `M${f(x)} ${f(apex)}L${f(x + half)} ${f(base)}Q${f(x)} ${f(base + h * 0.05)} ${f(x - half)} ${f(base)}Z`;
    shade += `M${f(x)} ${f(apex)}L${f(x + half)} ${f(base)}Q${f(x + half * 0.5)} ${f(base + h * 0.03)} ${f(x)} ${f(base + h * 0.04)}Z`;
    // un bonnet de neige à la pointe, un ourlet de neige au bas de l'étage
    const t = 0.32;
    snow += poly([[x, apex], [x + half * t, apex + (base - apex) * t], [x + half * t * 0.4, apex + (base - apex) * t * 1.1], [x - half * t * 0.2, apex + (base - apex) * t * 0.95], [x - half * t, apex + (base - apex) * t]]);
    snow += `M${f(x - half)} ${f(base)}Q${f(x)} ${f(base + h * 0.05)} ${f(x + half)} ${f(base)}Q${f(x + half * 0.6)} ${f(base - h * 0.012)} ${f(x + half * 0.35)} ${f(base + h * 0.006)}Q${f(x)} ${f(base + h * 0.02)} ${f(x - half * 0.4)} ${f(base - h * 0.004)}Q${f(x - half * 0.7)} ${f(base - h * 0.016)} ${f(x - half)} ${f(base)}Z`;
  }
  // guirlande dorée en festons
  const swag = (y0: number, half: number) => `M${f(x - half * 0.8)} ${f(y0)}Q${f(x)} ${f(y0 + h * 0.07)} ${f(x + half * 0.8)} ${f(y0 - h * 0.03)}`;
  const garland = swag(y - h * 0.3, h * 0.3) + swag(y - h * 0.55, h * 0.22) + swag(y - h * 0.74, h * 0.14);
  const balls: [number, number, string][] = [
    [-0.18, 0.2, XMAS.red],
    [0.14, 0.24, XMAS.blue],
    [-0.04, 0.42, XMAS.gold],
    [0.12, 0.5, XMAS.red],
    [-0.12, 0.62, XMAS.blue],
    [0.04, 0.78, XMAS.gold],
  ];
  const bulbs: [number, number][] = [
    [-0.26, 0.15],
    [0.02, 0.18],
    [0.27, 0.13],
    [-0.16, 0.36],
    [0.2, 0.4],
    [-0.04, 0.56],
    [0.13, 0.66],
    [-0.08, 0.8],
  ];
  return (
    <g key={key}>
      <rect x={f(x - h * 0.045)} y={f(y - h * 0.12)} width={f(h * 0.09)} height={f(h * 0.12)} fill={XMAS.trunk} />
      <path d={body} fill={XMAS.pine} />
      <path d={shade} fill={XMAS.pineDark} opacity={0.55} />
      <path d={snow} fill={XMAS.snow} opacity={0.92} />
      <path d={garland} fill="none" stroke={XMAS.gold} strokeWidth={f(h * 0.018)} strokeLinecap="round" opacity={0.9} />
      {balls.map(([dx, dy, color], k) => (
        <g key={`b${k}`}>
          <circle cx={f(x + dx * h)} cy={f(y - dy * h)} r={f(h * 0.034)} fill={color} />
          <circle cx={f(x + dx * h - h * 0.01)} cy={f(y - dy * h - h * 0.012)} r={f(h * 0.01)} fill="#fff" opacity={0.8} />
        </g>
      ))}
      {lights && bulbs.map(([dx, dy], k) => light(`l${k}`, id, x + dx * h, y - dy * h, h * 0.014, LIGHTS[k % LIGHTS.length], r))}
      <circle className="mx-glow" cx={x} cy={y - h * 1.02} r={h * 0.16} fill={`url(#${id}-star)`} style={timing(2.2, r() * 2)} />
      <path d={star(x, y - h * 1.02, h * 0.075)} fill={XMAS.gold} stroke="#fff3c4" strokeWidth={f(h * 0.008)} />
    </g>
  );
}

/** Paquet cadeau posé en (x, y) (le bas, au centre) : la boîte, le couvercle, le ruban en croix et le nœud. */
export function gift(key: string | number, x: number, y: number, w: number, h: number, box: string, ribbon: string): ReactNode {
  const lid = h * 0.24;
  return (
    <g key={key}>
      <rect x={f(x - w / 2)} y={f(y - h + lid * 0.6)} width={f(w)} height={f(h - lid * 0.6)} fill={box} />
      <rect x={f(x + w * 0.1)} y={f(y - h + lid * 0.6)} width={f(w * 0.4)} height={f(h - lid * 0.6)} fill="#000" opacity={0.14} />
      <rect x={f(x - w * 0.56)} y={f(y - h)} width={f(w * 1.12)} height={f(lid)} rx={f(lid * 0.15)} fill={box} />
      <rect x={f(x - w * 0.56)} y={f(y - h + lid * 0.7)} width={f(w * 1.12)} height={f(lid * 0.3)} fill="#000" opacity={0.18} />
      <rect x={f(x - w * 0.08)} y={f(y - h)} width={f(w * 0.16)} height={f(h)} fill={ribbon} />
      <path d={ellipse(x - w * 0.2, y - h - h * 0.08, w * 0.2, h * 0.11) + ellipse(x + w * 0.2, y - h - h * 0.08, w * 0.2, h * 0.11)} fill={ribbon} />
      <path d={ellipse(x - w * 0.2, y - h - h * 0.08, w * 0.1, h * 0.05) + ellipse(x + w * 0.2, y - h - h * 0.08, w * 0.1, h * 0.05)} fill="#000" opacity={0.2} />
      <circle cx={x} cy={f(y - h - h * 0.02)} r={f(w * 0.08)} fill={ribbon} />
    </g>
  );
}

/** Bonhomme de neige posé en (x, y), de hauteur h : trois boules, chapeau, écharpe rouge, nez en carotte, bras en brindilles. */
export function snowman(key: string | number, x: number, y: number, h: number): ReactNode {
  const [r1, r2, r3] = [h * 0.24, h * 0.18, h * 0.13];
  const [c1, c2, c3] = [y - r1, y - r1 * 2 - r2 * 0.75, y - r1 * 2 - r2 * 1.75 - r3 * 0.7];
  return (
    <g key={key}>
      <path d={`M${f(x - r2 * 0.8)} ${f(c2)}L${f(x - r2 * 2.1)} ${f(c2 - r2 * 0.9)}M${f(x - r2 * 1.6)} ${f(c2 - r2 * 0.5)}L${f(x - r2 * 1.9)} ${f(c2 - r2 * 1.1)}M${f(x + r2 * 0.8)} ${f(c2)}L${f(x + r2 * 2)} ${f(c2 - r2 * 0.7)}M${f(x + r2 * 1.6)} ${f(c2 - r2 * 0.45)}L${f(x + r2 * 2)} ${f(c2 - r2 * 0.05)}`} stroke={XMAS.trunk} strokeWidth={f(h * 0.022)} strokeLinecap="round" fill="none" />
      <circle cx={x} cy={c1} r={r1} fill={XMAS.snow} />
      <circle cx={x} cy={c2} r={r2} fill={XMAS.snow} />
      <circle cx={x} cy={c3} r={r3} fill={XMAS.snow} />
      <path d={ellipse(x + r1 * 0.35, c1 + r1 * 0.2, r1 * 0.6, r1 * 0.7) + ellipse(x + r2 * 0.35, c2 + r2 * 0.2, r2 * 0.6, r2 * 0.7)} fill={XMAS.snowShade} opacity={0.6} />
      {/* boutons, yeux en charbon et nez en carotte */}
      <path d={circle(x, c2 - r2 * 0.3, h * 0.016) + circle(x, c2 + r2 * 0.25, h * 0.016) + circle(x - r3 * 0.35, c3 - r3 * 0.2, h * 0.014) + circle(x + r3 * 0.35, c3 - r3 * 0.2, h * 0.014)} fill="#1b1b24" />
      <path d={poly([[x, c3 - r3 * 0.02], [x + r3 * 1.1, c3 + r3 * 0.12], [x, c3 + r3 * 0.22]])} fill="#f08a2a" />
      {/* écharpe */}
      <path d={`M${f(x - r3 * 1)} ${f(c3 + r3 * 0.75)}Q${f(x)} ${f(c3 + r3 * 1.15)} ${f(x + r3 * 1)} ${f(c3 + r3 * 0.75)}`} stroke={XMAS.red} strokeWidth={f(h * 0.06)} fill="none" strokeLinecap="round" />
      <path d={`M${f(x + r3 * 0.5)} ${f(c3 + r3 * 0.95)}L${f(x + r3 * 0.75)} ${f(c3 + r3 * 2)}`} stroke={XMAS.red} strokeWidth={f(h * 0.055)} strokeLinecap="round" />
      {/* chapeau */}
      <rect x={f(x - r3 * 1.05)} y={f(c3 - r3 * 0.98)} width={f(r3 * 2.1)} height={f(h * 0.025)} fill="#1b1b24" />
      <rect x={f(x - r3 * 0.68)} y={f(c3 - r3 * 1.95)} width={f(r3 * 1.36)} height={f(r3)} fill="#1b1b24" />
      <rect x={f(x - r3 * 0.68)} y={f(c3 - r3 * 1.22)} width={f(r3 * 1.36)} height={f(h * 0.02)} fill={XMAS.red} />
    </g>
  );
}

/** Sucre d'orge planté dans la neige en (x, y), de hauteur h, rayé de rouge. */
export function candyCane(key: string | number, x: number, y: number, h: number): ReactNode {
  const w = h * 0.12;
  const d = `M${f(x)} ${f(y)}V${f(y - h * 0.78)}Q${f(x)} ${f(y - h)} ${f(x + h * 0.17)} ${f(y - h)}Q${f(x + h * 0.34)} ${f(y - h)} ${f(x + h * 0.34)} ${f(y - h * 0.8)}`;
  return (
    <g key={key}>
      <path d={d} fill="none" stroke="#fff" strokeWidth={f(w)} strokeLinecap="round" />
      <path d={d} fill="none" stroke={XMAS.red} strokeWidth={f(w)} strokeDasharray={`${f(w * 0.7)} ${f(w * 0.9)}`} />
    </g>
  );
}

/** Branche de houx en (x, y) : deux feuilles dentelées et trois baies rouges. */
export function holly(key: string | number, x: number, y: number, s: number, angle = 0): ReactNode {
  const leaf = (dir: 1 | -1) => {
    const pts: Pt[] = [];
    // une feuille à piquants : une ligne en zigzag de chaque côté de la nervure
    const n = 4;
    for (let k = 0; k <= n; k++) pts.push([dir * k * s * 2.4 / n, -Math.sin((k / n) * Math.PI) * s * (k % 2 ? 1.05 : 0.7)]);
    for (let k = n; k >= 0; k--) pts.push([dir * k * s * 2.4 / n, Math.sin((k / n) * Math.PI) * s * (k % 2 ? 1.05 : 0.7)]);
    return poly(pts);
  };
  return (
    <g key={key} transform={`translate(${f(x)} ${f(y)}) rotate(${angle})`}>
      <g transform="rotate(-25)">
        <path d={leaf(-1)} fill={XMAS.green} />
        <path d={`M0 0L${f(-s * 2.3)} 0`} stroke={XMAS.greenDark} strokeWidth={f(s * 0.12)} />
      </g>
      <g transform="rotate(20)">
        <path d={leaf(1)} fill={XMAS.greenDark} />
        <path d={`M0 0L${f(s * 2.3)} 0`} stroke={XMAS.pineDark} strokeWidth={f(s * 0.12)} />
      </g>
      <path d={circle(-s * 0.25, s * 0.35, s * 0.42) + circle(s * 0.38, s * 0.42, s * 0.42) + circle(s * 0.05, -s * 0.15, s * 0.42)} fill={XMAS.red} />
      <path d={circle(-s * 0.35, s * 0.22, s * 0.12) + circle(s * 0.28, s * 0.3, s * 0.12) + circle(-s * 0.05, -s * 0.28, s * 0.12)} fill="#fff" opacity={0.7} />
    </g>
  );
}

/** Tapis de neige le long du bas d'une scène, de x0 à x1, à la hauteur y (et son ombre bleutée). */
export function snowBank(x0: number, x1: number, y: number, bottom: number): ReactNode {
  const w = x1 - x0;
  const top = `M${f(x0)} ${f(bottom)}V${f(y + 1)}Q${f(x0 + w * 0.2)} ${f(y - 2.6)} ${f(x0 + w * 0.42)} ${f(y - 0.4)}T${f(x0 + w * 0.78)} ${f(y - 0.6)}T${f(x1)} ${f(y + 0.6)}V${f(bottom)}Z`;
  return (
    <>
      <path d={top} fill={XMAS.snow} />
      <path d={`M${f(x0)} ${f(bottom)}V${f(y + 2.4)}Q${f(x0 + w * 0.5)} ${f(y + 0.8)} ${f(x1)} ${f(y + 2.6)}V${f(bottom)}Z`} fill={XMAS.snowShade} opacity={0.55} />
    </>
  );
}

/** Les dégradés des lueurs (lumières de guirlande et étoile du sapin), à poser dans les <defs> d'une scène. */
export function NoelGlows({ id }: { id: string }) {
  return (
    <>
      <radialGradient id={`${id}-light`}>
        <stop offset="0" stopColor="#fff2c4" stopOpacity={0.9} />
        <stop offset="0.35" stopColor="#ffd98a" stopOpacity={0.35} />
        <stop offset="1" stopColor="#ffd98a" stopOpacity={0} />
      </radialGradient>
      <radialGradient id={`${id}-star`}>
        <stop offset="0" stopColor="#fff3c4" stopOpacity={0.85} />
        <stop offset="0.4" stopColor="#ffd166" stopOpacity={0.3} />
        <stop offset="1" stopColor="#ffd166" stopOpacity={0} />
      </radialGradient>
    </>
  );
}

// ───────────── motifs en image de fond (barres, en-têtes, boutons) ─────────────

const svgUrl = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`)}")`;

/** Guirlande lumineuse : un fil qui pend en festons, quatre ampoules de couleur par motif. */
const BULBS: [number, number][] = [9, 27, 45, 63].map((x) => {
  const t = x / 72;
  return [x, 3 + 32 * t * (1 - t)];
});

export const LIGHTS_TILE = svgUrl(
  72,
  24,
  `<path d="M0 3Q36 19 72 3" fill="none" stroke="#21352b" stroke-width="1.1"/>` +
    BULBS.map(([x, y], k) => `<rect x="${f(x - 1.1)}" y="${f(y - 0.4)}" width="2.2" height="2.2" rx="0.4" fill="#2c3a33"/><ellipse cx="${f(x)}" cy="${f(y + 4)}" rx="1.9" ry="2.8" fill="${LIGHTS[k]}"/><ellipse cx="${f(x - 0.6)}" cy="${f(y + 3)}" rx="0.5" ry="0.9" fill="#fff" fill-opacity="0.7"/>`).join(''),
);

/** Halos des ampoules, en deux motifs qui s'allument tour à tour (ampoules 1 et 3, puis 2 et 4). */
function glowTile(which: number[]): string {
  const defs = which.map((k) => `<radialGradient id="g${k}"><stop offset="0" stop-color="${LIGHTS[k]}" stop-opacity="0.85"/><stop offset="0.45" stop-color="${LIGHTS[k]}" stop-opacity="0.28"/><stop offset="1" stop-color="${LIGHTS[k]}" stop-opacity="0"/></radialGradient>`).join('');
  const halos = which.map((k) => `<circle cx="${f(BULBS[k][0])}" cy="${f(BULBS[k][1] + 4)}" r="8" fill="url(#g${k})"/>`).join('');
  return svgUrl(72, 24, `<defs>${defs}</defs>${halos}`);
}
export const LIGHTS_GLOW_A = glowTile([0, 2]);
export const LIGHTS_GLOW_B = glowTile([1, 3]);

/** Neige qui coiffe le haut d'un bouton ou d'une barre : un bourrelet blanc aux bords arrondis. */
export const SNOWCAP_TILE = svgUrl(
  48,
  12,
  `<path d="M0 0H48V5Q45 8.6 41.5 6.2Q38 9.6 34 6.6Q31 8.2 28.5 6Q25 10.4 21 6.8Q17.5 8.8 14.5 6.2Q11 9.2 7.5 6.4Q4 8.4 0 5.6Z" fill="#f4f9ff"/><path d="M0 5.6Q4 8.4 7.5 6.4Q11 9.2 14.5 6.2Q17.5 8.8 21 6.8Q25 10.4 28.5 6Q31 8.2 34 6.6Q38 9.6 41.5 6.2Q45 8.6 48 5V6.4Q45 10 41.5 7.6Q38 11 34 8Q31 9.6 28.5 7.4Q25 11.8 21 8.2Q17.5 10.2 14.5 7.6Q11 10.6 7.5 7.8Q4 9.8 0 7Z" fill="#a9c6e4" fill-opacity="0.8"/>`,
);

/** Neige posée sur le haut de la barre du bas : des congères qui débordent un peu. */
export const SNOWDRIFT_TILE = svgUrl(
  90,
  12,
  `<path d="M0 12V7Q8 2.6 17 5.4Q24 1.6 33 4.8Q40 6.6 46 3.8Q55 0.6 63 4.6Q70 7 76 4.2Q84 1.8 90 6V12Z" fill="#f4f9ff"/><path d="M0 12V9Q20 6.4 45 8.6T90 8.4V12Z" fill="#c4d9ee" fill-opacity="0.6"/>`,
);

/** Tapis de neige au bas de l'écran (grand écran), à la hauteur de la neige des décors des coins. */
export const SNOWGROUND_TILE = svgUrl(
  120,
  20,
  `<path d="M0 20V5.6Q15 3.6 30 5.2T60 5.4T90 5T120 5.6V20Z" fill="${XMAS.snow}"/><path d="M0 20V8.6Q30 6.8 60 8.4T120 8.6V20Z" fill="${XMAS.snowShade}" fill-opacity="0.55"/>`,
);

/** Neige et stalactites de glace pendues au haut des en-têtes illustrés. */
export const ICICLES_TILE = svgUrl(
  64,
  22,
  `<path d="M0 0H64V4.6Q58 7.4 52 5.2Q46 8 40 5Q33 7.8 27 5.4Q20 8.2 14 5Q7 7.6 0 4.8Z" fill="#f4f9ff" fill-opacity="0.95"/>` +
    [
      [6, 6, 9],
      [17, 6.4, 14],
      [24, 6.2, 6],
      [35, 6.4, 18],
      [44, 6.6, 8],
      [55, 6, 12],
    ]
      .map(([x, y, l]) => `<path d="M${x - 1.5} ${y - 1}L${x + 1.6} ${y - 1}L${x + 0.2} ${y + l}Z" fill="#dff1ff" fill-opacity="0.9"/><path d="M${x - 0.6} ${y}L${x} ${y}L${x} ${y + l * 0.7}Z" fill="#fff" fill-opacity="0.8"/>`)
      .join(''),
);

/** Petit sapin décoré : la marque du logo sur téléphone, pendant Noël. */
export function SapinMark({ className = '' }: { className?: string }) {
  return (
    <svg className={`pumpkin-mark sapin-mark ${className}`} viewBox="-6 -13 12 13.4" aria-hidden="true">
      <rect x={-0.7} y={-1.6} width={1.4} height={1.8} fill={XMAS.trunk} />
      <path d="M0 -9.6L4.6 -1.4Q0 -0.6 -4.6 -1.4Z M0 -11L3.6 -4.8Q0 -4.1 -3.6 -4.8Z" fill={XMAS.pine} />
      <path d="M0 -11L1.4 -8.6L-1.3 -8.6Z" fill={XMAS.snow} />
      <path d={circle(-1.8, -2.6, 0.6) + circle(1.6, -3.2, 0.6) + circle(0.2, -6.2, 0.55)} fill={XMAS.red} />
      <path d={circle(0.4, -2, 0.5) + circle(-1, -5.4, 0.5) + circle(1.5, -6.4, 0.45)} fill={XMAS.gold} />
      <path d={star(0, -11.4, 1.6)} fill={XMAS.gold} />
    </svg>
  );
}
