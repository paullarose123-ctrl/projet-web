import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  DOLPHIN,
  EAGLE,
  KANGAROO,
  MANTA,
  PTERO,
  SCENE_H,
  SPAN,
  WHALE_TAIL,
  WOLF,
  acaciaCrown,
  acaciaTrunk,
  area as kitArea,
  bird,
  circle,
  crown,
  draw,
  ellipse,
  f,
  frond,
  grass as kitGrass,
  hashString,
  hills,
  lollipop,
  mix,
  mountain,
  mulberry32,
  peaks,
  pine,
  poly,
  pts,
  spots as kitSpots,
  type Profile,
  type Pt,
  type Pt3,
} from '../art/kit';

export { isLight, mix } from '../art/kit';

// Paysages peints, façon affiche de parc naturel : des plans de relief en aplats qui s'assombrissent
// en approchant, un astre, du feuillage et une silhouette d'animal en ombre chinoise.
// Tout est tiré d'une graine : un même paysage a toujours le même dessin.
// Repère : hauteur 172 ; largeur 120 pour un booster (PackScene), davantage pour un panorama (Landscape).
// En largeur 120, le tirage est exactement celui d'origine : les boosters ne changent pas.

const H = SCENE_H;

export type SceneKind =
  | 'foret'
  | 'montagne'
  | 'savane'
  | 'jungle'
  | 'ocean'
  | 'recif'
  | 'volcan'
  | 'aurore'
  | 'nuit'
  | 'outback'
  | 'desert'
  | 'collines'
  | 'marais'
  | 'banquise'
  | 'canyon'
  | 'bambou'
  | 'cascade'
  | 'abysses'
  | 'grotte'
  | 'lac'
  | 'neige'
  | 'printemps';

export type Creature =
  | 'girafes'
  | 'elephant'
  | 'loup'
  | 'cerf'
  | 'baleine'
  | 'dauphins'
  | 'manta'
  | 'banc'
  | 'meduses'
  | 'aigle'
  | 'flamants'
  | 'pteros'
  | 'papillons'
  | 'lucioles'
  | 'ferme'
  | 'kangourou'
  | 'lapin'
  | 'manchots'
  | 'panda'
  | 'renard'
  | 'baudroie'
  | 'chauves-souris';

export interface Palette {
  /** haut et bas du ciel (ou de l'eau, sous la mer) */
  sky: [string, string];
  /** soleil ou lune */
  sun: string;
  /** plan le plus lointain */
  far: string;
  /** premier plan, sombre */
  near: string;
  /** neige, lave, aurore, fleurs… selon le paysage */
  accent: string;
  accent2?: string;
}

export interface SceneDef {
  kind: SceneKind;
  palette: Palette;
  creature?: Creature;
  /** ciel étoilé en plus (paysages de nuit qui n'en ont pas d'office) */
  stars?: boolean;
}

// ───────────── silhouettes d'animaux en éléments (coordonnées locales, pattes à y = 0, tournés vers la droite) ─────────────

function giraffe(fill: string): ReactNode {
  return (
    <g fill={fill} stroke={fill} strokeLinecap="round">
      <path d="M-7.2 -12L-7.8 0M-5.6 -12L-5.2 0M0.6 -12.5L0.4 0M2.2 -12.5L2.6 0" strokeWidth={1.1} fill="none" />
      <ellipse cx={-2.6} cy={-14} rx={6.6} ry={3.6} transform="rotate(-14 -2.6 -14)" stroke="none" />
      <path d="M1.2 -15L3.8 -13.4L9 -28.6L7.2 -29.6Z" stroke="none" />
      <ellipse cx={9.6} cy={-29.4} rx={2.8} ry={1.15} transform="rotate(18 9.6 -29.4)" stroke="none" />
      <path d="M7.9 -30.2L7.5 -32.2M8.6 -30.2L8.5 -32.3M-9.1 -15L-10.2 -8.6" strokeWidth={0.45} fill="none" />
      <ellipse cx={7} cy={-30.3} rx={1} ry={0.35} transform="rotate(-20 7 -30.3)" stroke="none" />
    </g>
  );
}

/** Cerf : corps, cou dressé et grands bois ramifiés. */
function stag(fill: string): ReactNode {
  return (
    <g fill={fill} stroke={fill} strokeLinecap="round" strokeLinejoin="round">
      <path d="M-6 -9L-6.6 0M-4.6 -9L-4.2 0M3 -9.5L2.8 0M4.4 -9.5L4.8 0" strokeWidth={0.95} fill="none" />
      <ellipse cx={-1} cy={-11.6} rx={7} ry={3.4} transform="rotate(-4 -1 -11.6)" stroke="none" />
      <path d="M2.8 -13.4L5.8 -12L8.2 -19L6 -20.6Z" stroke="none" />
      <ellipse cx={8.1} cy={-20.2} rx={2.7} ry={1.15} transform="rotate(28 8.1 -20.2)" stroke="none" />
      <ellipse cx={6.1} cy={-21.3} rx={1.3} ry={0.45} transform="rotate(-32 6.1 -21.3)" stroke="none" />
      <ellipse cx={-7.8} cy={-12.8} rx={0.9} ry={0.7} stroke="none" />
      <path
        d="M7 -21.3C6.2 -24 4.8 -26.2 2.8 -28.6M6 -23.8L7.4 -25.8M4.9 -25.6L6 -28.1M3.8 -27.1L4.1 -29.7M7.5 -21.2C7.8 -24 8.6 -26.4 9.9 -28.6M7.9 -23.4L9.8 -24.4M8.4 -25.5L10.6 -26.2"
        strokeWidth={0.55}
        fill="none"
      />
    </g>
  );
}

function elephant(fill: string, tusk: string): ReactNode {
  return (
    <g fill={fill}>
      <rect x={-7.6} y={-7} width={2.8} height={7} rx={0.6} />
      <rect x={-4.4} y={-7} width={2.6} height={7} rx={0.6} />
      <rect x={1} y={-7} width={2.8} height={7} rx={0.6} />
      <rect x={4.2} y={-7} width={2.6} height={7} rx={0.6} />
      <ellipse cx={-1.4} cy={-10.4} rx={8.8} ry={6.2} />
      <circle cx={7.2} cy={-12.2} r={4.3} />
      <path d="M9.4 -10.6C11.8 -7.2 11.4 -3 12.8 -0.6L11.4 -0.4C10.2 -3 9.8 -6.4 7.8 -9Z" />
      <path d="M-10 -11.4L-10.9 -5" stroke={fill} strokeWidth={0.45} />
      <path d="M8.8 -8.6Q11 -6.4 12.6 -7.6Q11 -7.6 9.4 -9.6Z" fill={tusk} />
    </g>
  );
}

function flamingo(fill: string): ReactNode {
  return (
    <g fill={fill} stroke={fill} strokeLinecap="round" strokeLinejoin="round">
      <path d="M0 0L0 -11M0 -11L-1.8 -7.2L0.2 -5.6" fill="none" strokeWidth={0.45} />
      <ellipse cx={0} cy={-13} rx={4} ry={2.2} transform="rotate(-10 0 -13)" stroke="none" />
      <path d="M-3.8 -13.6L-5.8 -12.2L-3.4 -12.3Z" stroke="none" />
      <path d="M2.8 -14C5 -16 1 -18 1.6 -21C2 -23.4 4.6 -23.4 4.6 -21.6" fill="none" strokeWidth={0.95} />
      <circle cx={4.3} cy={-21.5} r={0.95} stroke="none" />
      <path d="M4.8 -21.8Q6.4 -21 5.7 -19.4L4.9 -20.6Z" stroke="none" />
    </g>
  );
}

function rabbit(fill: string): ReactNode {
  return (
    <g fill={fill}>
      <ellipse cx={-1} cy={-3.4} rx={4.2} ry={3.5} />
      <circle cx={2.6} cy={-6.6} r={2.1} />
      <ellipse cx={1.6} cy={-10.6} rx={0.75} ry={3} transform="rotate(-14 1.6 -10.6)" />
      <ellipse cx={2.8} cy={-10.8} rx={0.75} ry={3} transform="rotate(8 2.8 -10.8)" />
      <circle cx={-5} cy={-3.6} r={1.1} />
      <ellipse cx={2} cy={-0.4} rx={2} ry={0.6} />
    </g>
  );
}

function barn(fill: string, door: string): ReactNode {
  return (
    <g>
      <path d="M-6 0L-6 -7L-3.6 -10.4L0 -12L3.6 -10.4L6 -7L6 0Z M7 0L7 -12.4L10.6 -12.4L10.6 0Z" fill={fill} />
      <circle cx={8.8} cy={-12.4} r={1.8} fill={fill} />
      <path d="M-1.8 0L-1.8 -5L1.8 -5L1.8 0M-1.8 -5L1.8 0M1.8 -5L-1.8 0M-0.9 -8.4L0.9 -8.4" fill="none" stroke={door} strokeWidth={0.35} />
    </g>
  );
}

/** Papillon vu de dessus : ailes antérieures claires, postérieures plus sombres, corps et antennes. */
function butterfly(fill: string, dark: string): ReactNode {
  const upper = 'M0 0C-1 -3 -5 -4.6 -5.6 -2.2C-6 -0.2 -2.6 0.5 0 0Z';
  const lower = 'M0 0C-2.4 0.5 -4.4 2 -3.6 3.6C-2.6 4.8 -0.6 2.8 0 0Z';
  return (
    <g>
      <path d={`${upper}${lower}`} fill={fill} />
      <path d={`${upper}${lower}`} fill={fill} transform="scale(-1 1)" />
      <path d={lower} fill={dark} opacity={0.35} />
      <path d={lower} fill={dark} opacity={0.35} transform="scale(-1 1)" />
      <path d="M0 -1.6L0 2.4M0 -1.6Q-0.6 -3.4 -1.4 -4M0 -1.6Q0.6 -3.4 1.4 -4" stroke={dark} strokeWidth={0.4} strokeLinecap="round" fill="none" />
    </g>
  );
}

function jellyfish(fill: string): ReactNode {
  return (
    <g fill={fill}>
      <path d="M-5 0C-5 -4 -2.6 -6 0 -6C2.6 -6 5 -4 5 0Q3.8 -0.8 2.5 0Q1.2 -0.8 0 0Q-1.2 -0.8 -2.5 0Q-3.8 -0.8 -5 0Z" />
      <path
        d="M-3.6 0Q-4.6 4 -3.4 8Q-2.4 12 -3.6 15M-1.2 0Q-2 5 -0.8 9Q0.2 13 -1 18M1.2 0Q2 5 0.8 9Q-0.2 13 1 17M3.6 0Q4.6 4 3.4 8Q2.4 12 3.4 14"
        fill="none"
        stroke={fill}
        strokeWidth={0.45}
        strokeLinecap="round"
      />
    </g>
  );
}

/** Cactus saguaro : un tronc et des bras arrondis, en traits épais. */
function saguaro(x: number, y: number, h: number, fill: string, key: number): ReactNode {
  const w = h * 0.13;
  return (
    <path
      key={key}
      d={`M${f(x)} ${f(y + 1)}L${f(x)} ${f(y - h)}M${f(x)} ${f(y - h * 0.38)}L${f(x - h * 0.2)} ${f(y - h * 0.38)}L${f(x - h * 0.2)} ${f(y - h * 0.7)}M${f(x)} ${f(y - h * 0.5)}L${f(x + h * 0.19)} ${f(y - h * 0.5)}L${f(x + h * 0.19)} ${f(y - h * 0.78)}`}
      fill="none"
      stroke={fill}
      strokeWidth={f(w)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Manchot debout : corps sombre, ventre clair, petit bec. */
function penguin(dark: string, belly: string): ReactNode {
  return (
    <g>
      <path d="M-2.6 -0.2C-3.2 -3 -3 -6.4 -1.8 -8.4C-1.4 -10.4 -0.6 -11.4 0.4 -11.4C1.6 -11.4 2.2 -10.4 2.2 -9.4L3.6 -9L2.2 -8.6C2.8 -6.4 2.8 -3 2.2 -0.2Z" fill={dark} />
      <path d="M-0.6 -0.6C-1.4 -3 -1.2 -6 0.2 -8.2C1.4 -6 1.6 -3 1.2 -0.6Z" fill={belly} />
      <path d="M-2.2 -6.6Q-4.2 -4.6 -3.8 -2.4" stroke={dark} strokeWidth={0.9} strokeLinecap="round" fill="none" />
      <path d="M-1.6 0L-0.2 0M0.6 0L2 0" stroke={dark} strokeWidth={0.6} strokeLinecap="round" />
    </g>
  );
}

/** Panda assis, de face : corps et tête clairs, pattes, oreilles et lunettes sombres. */
function panda(light: string, dark: string): ReactNode {
  return (
    <g>
      <ellipse cx={0} cy={-5.6} rx={5} ry={5.6} fill={light} />
      <ellipse cx={-3.4} cy={-1.2} rx={2.4} ry={1.5} fill={dark} />
      <ellipse cx={3.4} cy={-1.2} rx={2.4} ry={1.5} fill={dark} />
      <path d="M-4.6 -8.6Q-3 -6.2 -1.4 -5.4Q-2.6 -4 -4.4 -4.8Z M4.6 -8.6Q3 -6.2 1.4 -5.4Q2.6 -4 4.4 -4.8Z" fill={dark} />
      <path d="M-5.2 -9.8Q0 -8 5.2 -9.8L4.4 -7.6Q0 -6.4 -4.4 -7.6Z" fill={dark} />
      <circle cx={-2.9} cy={-15.6} r={1.3} fill={dark} />
      <circle cx={2.9} cy={-15.6} r={1.3} fill={dark} />
      <circle cx={0} cy={-12.8} r={3.7} fill={light} />
      <ellipse cx={-1.4} cy={-13.2} rx={0.9} ry={1.2} transform="rotate(25 -1.4 -13.2)" fill={dark} />
      <ellipse cx={1.4} cy={-13.2} rx={0.9} ry={1.2} transform="rotate(-25 1.4 -13.2)" fill={dark} />
      <ellipse cx={0} cy={-11.2} rx={0.7} ry={0.45} fill={dark} />
      <path d="M5.4 -1L7.6 -16" stroke={mix(light, dark, 0.35)} strokeWidth={0.8} strokeLinecap="round" />
      <path d="M7 -12q2.4 -1 3.6 -0.2q-2 1 -3.6 0.2ZM7.4 -15q-2.2 -1.6 -3.4 -1q1.6 1.6 3.4 1Z" fill={mix(light, dark, 0.35)} />
    </g>
  );
}

/** Renard assis, de profil, la queue enroulée devant lui. */
function fox(fill: string, tip: string): ReactNode {
  return (
    <g>
      <path d="M-6 0C-9.6 0 -11 -2.6 -9.8 -4.4C-8.6 -6 -6 -5 -4.2 -3.6Z" fill={fill} />
      <path d="M-10.2 -2.2C-10.6 -1 -10 0 -8.6 0L-7.2 0C-8.6 -0.6 -9.6 -1.2 -10.2 -2.2Z" fill={tip} />
      <path d="M-4.8 0C-5.6 -3 -5 -6.6 -2.8 -9.2C-1.8 -10.4 -0.6 -11.2 0.4 -11.6L0 -14.6L1.6 -12.4L2.6 -14.8L3 -11.8C4.2 -11.4 5.8 -10.8 6.8 -10.2L6.6 -9.6C5.2 -9.4 3.6 -9.2 2.8 -8.6C3 -6 2.4 -3.4 1.6 -1.2L2.6 -0.4L2.6 0Z" fill={fill} />
      <path d="M0.8 -8.2C1.6 -6.4 1.8 -4 1.2 -2.2C0.4 -3.8 0.2 -6 0.8 -8.2Z" fill={tip} opacity={0.7} />
    </g>
  );
}

/** Baudroie des abysses : grosse tête, mâchoire hérissée, et sa lanterne au bout d'un filament. */
function angler(fill: string, teeth: string): ReactNode {
  return (
    <g>
      <path d="M-9 -1C-9 -5 -5 -8 0 -8C4 -8 7 -6 8 -3L4 -1.6L8.4 0.6C7.6 3.6 4.4 5.6 0 5.6C-4 5.6 -7 4 -8.6 2L-13 5L-12 0L-13 -5Z" fill={fill} />
      <path d="M4 -1.6L5 -0.2L5.8 -1.8L6.6 -0.4L7.4 -2.4M4 -1.6L5.2 -0.6L5.6 0.4L6.6 -0.4L7.4 0.6L8.4 0.6" stroke={teeth} strokeWidth={0.35} fill="none" strokeLinejoin="round" />
      <circle cx={3.4} cy={-4.6} r={0.9} fill={teeth} opacity={0.8} />
      <path d="M1 -7.8Q3 -14 9 -13.6" stroke={fill} strokeWidth={0.5} fill="none" strokeLinecap="round" />
    </g>
  );
}

/** Chauve-souris en vol, ailes festonnées. */
const BAT = 'M0 -1.6L0.7 -2.6L1 -1.4C2 -2 3.4 -2.2 4.6 -2C5.8 -1.8 6.8 -1.2 7.6 -0.6C6.6 -0.6 5.8 -0.2 5.2 0.4C4.4 -0.2 3.4 -0.2 2.6 0.4C2 0 1.4 0 0.8 0.4L0 1.2L-0.8 0.4C-1.4 0 -2 0 -2.6 0.4C-3.4 -0.2 -4.4 -0.2 -5.2 0.4C-5.8 -0.2 -6.6 -0.6 -7.6 -0.6C-6.8 -1.2 -5.8 -1.8 -4.6 -2C-3.4 -2.2 -2 -2 -1 -1.4L-0.7 -2.6Z';

// ───────────── peinture d'un paysage ─────────────

/**
 * Peint un paysage de largeur `W` (120 = un booster). Au-delà, les éléments uniques (astre, animal, volcan…)
 * se placent en proportion ou au centre, et les motifs (montagnes, coraux, buttes…) se répètent par tranches de 120.
 * `shade` assombrit le pied de la scène pour y poser un texte.
 */
function paint(def: SceneDef, seed: string, id: string, W = SPAN, shade = true): ReactNode {
  const r = mulberry32(hashString(seed));
  const p = def.palette;
  const c = def.creature;
  const tone = (t: number) => mix(p.far, p.near, t);
  const wide = W > SPAN;
  const sx = W / SPAN;
  /** position proportionnelle à la largeur */
  const X = (x: number) => x * sx;
  /** position d'un motif fixe, recentré */
  const dx = (W - SPAN) / 2;
  /** léger décalage au hasard, seulement en panorama (en largeur 120 le tirage reste celui d'origine) */
  const jit = (a: number) => (wide ? (r() - 0.5) * a : 0);
  const tiles = (fn: (ox: number) => void) => {
    const n = Math.max(1, Math.ceil(W / SPAN));
    const start = (W - n * SPAN) / 2;
    for (let i = 0; i < n; i++) fn(start + i * SPAN);
  };
  const area = (profile: Profile, step?: number) => kitArea(profile, W, step);
  const spots = (profile: Profile, min: number, max: number, gap: number, sink?: number) => kitSpots(r, profile, W, min, max, gap, sink);
  const along = (profile: Profile, make: (x: number, y: number, size: number) => string, min: number, max: number, gap: number, sink?: number) =>
    draw(spots(profile, min, max, gap, sink), make);
  const grass = (profile: Profile, min: number, max: number, gap: number) => kitGrass(r, profile, W, min, max, gap);
  const many = (n: number) => Math.round(n * sx);
  const wider = (w: number) => w * Math.min(sx, 2);

  const nodes: ReactNode[] = [];
  let k = 0;
  const path = (d: string, fill: string, extra: Record<string, unknown> = {}) => {
    if (d) nodes.push(<path key={k++} d={d} fill={fill} {...extra} />);
  };
  const add = (node: ReactNode) => nodes.push(<g key={k++}>{node}</g>);
  const place = (x: number, y: number, s: number, node: ReactNode, flip = false, rot = 0) =>
    add(<g transform={`translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${flip ? -s : s} ${s})`}>{node}</g>);
  const shift = (x: number, node: ReactNode) => add(x ? <g transform={`translate(${f(x)} 0)`}>{node}</g> : node);

  const sun = (cx: number, cy: number, rad: number, rings = true) => {
    add(
      <>
        <circle cx={f(cx)} cy={cy} r={rad * 3.4} fill={`url(#${id}-glow)`} />
        {rings && <circle cx={f(cx)} cy={cy} r={rad * 1.6} fill="none" stroke={p.sun} strokeOpacity={0.22} strokeWidth={0.5} />}
        {rings && <circle cx={f(cx)} cy={cy} r={rad * 2.25} fill="none" stroke={p.sun} strokeOpacity={0.12} strokeWidth={0.5} />}
        <circle cx={f(cx)} cy={cy} r={rad} fill={p.sun} />
      </>,
    );
  };
  const stars = (n: number, maxY: number, color: string) => {
    const groups = ['', '', ''];
    for (let i = 0; i < n; i++) groups[i % 3] += circle(r() * W, r() * maxY, 0.2 + r() * 0.45);
    groups.forEach((d, i) => path(d, color, { opacity: [0.95, 0.6, 0.35][i] }));
  };
  const flock = (cx: number, cy: number, n: number, spread: number, color: string, size = 1.6) => {
    let d = '';
    for (let i = 0; i < n; i++) d += bird(cx + (r() - 0.5) * spread, cy + (r() - 0.5) * spread * 0.45, size * (0.6 + r() * 0.7), 0.6 + r() * 0.8);
    path(d, color);
  };
  const cloud = (cx: number, cy: number, w: number, color: string, opacity: number) => {
    path(
      ellipse(cx, cy, w * 0.5, w * 0.07) + circle(cx - w * 0.16, cy - w * 0.06, w * 0.13) + circle(cx + w * 0.08, cy - w * 0.09, w * 0.17) + circle(cx + w * 0.26, cy - w * 0.03, w * 0.1),
      color,
      { opacity },
    );
  };
  const streak = (cx: number, cy: number, w: number, color: string, opacity: number) => path(ellipse(cx, cy, w / 2, 0.9), color, { opacity });
  const mist = (y0: number, y1: number, opacity: number) => add(<rect x={-2} y={y0} width={f(W + 4)} height={y1 - y0} fill={`url(#${id}-mist)`} opacity={opacity} />);
  const fronds = (list: Array<[number, number, number, number, number, number]>, color: string) => {
    let stems = '';
    let leaves = '';
    for (const [x, y, a, len, bend, leaf] of list) {
      const fr = frond(r, x, y, a, len, bend, leaf);
      stems += fr.stem;
      leaves += fr.leaves;
    }
    path(leaves, color);
    path(stems, 'none', { stroke: color, strokeWidth: 0.9, strokeLinecap: 'round' });
  };

  if (def.stars) stars(many(60), 96, '#ffffff');

  switch (def.kind) {
    case 'foret': {
      sun(X(84), 58, 12);
      cloud(X(28), 44, 30, p.sun, 0.55);
      cloud(X(98), 30, 22, p.sun, 0.4);
      flock(X(40), 52, 5, 20, tone(0.8));
      tiles((ox) => {
        for (const [px, py, wl, wr] of [
          [112, 74, 28, 26],
          [18, 70, 30, 30],
          [64, 54, 40, 40],
        ] as Array<[number, number, number, number]>) {
          const m = mountain(r, ox + px + jit(16), py + jit(12), 108, wl, wr);
          path(m.body, p.far);
          path(m.shadow, p.near, { opacity: 0.12 });
        }
      });
      mist(80, 106, 0.55);
      const l1 = hills(r, 106, 4);
      path(area(l1), tone(0.3));
      path(along(l1, pine, 8, 13, 3.6), tone(0.3));
      mist(96, 116, 0.35);
      const l2 = hills(r, 116, 4);
      path(area(l2), tone(0.62));
      path(along(l2, pine, 13, 20, 5), tone(0.62));
      const l3 = hills(r, 128, 3);
      path(area(l3), p.near);
      path(along(l3, pine, 22, 40, 7), p.near);
      break;
    }

    case 'montagne': {
      sun(X(28), 50, 10);
      cloud(X(84), 40, 34, '#ffffff', 0.5);
      cloud(X(26), 76, 26, '#ffffff', 0.35);
      tiles((ox) => {
        const list: Array<[number, number, number, number]> = [
          [110, 66, 30, 28],
          [30, 54, 40, 36],
          [76, 40, 40, 42],
        ];
        for (const [px, py, wl, wr] of list) {
          const m = mountain(r, ox + px + jit(14), py + jit(14), 122, wl, wr);
          path(m.body, p.far);
          path(m.snow, p.accent, { opacity: 0.92 });
          path(m.shadow, p.near, { opacity: 0.2 });
        }
      });
      mist(92, 124, 0.6);
      const l1 = hills(r, 118, 3);
      path(area(l1), tone(0.45));
      path(along(l1, pine, 9, 14, 3.4), tone(0.45));
      if (c === 'aigle') place(X(62), 72, 1.6, <path d={EAGLE} fill={tone(0.92)} />, false, -6);
      const l2 = hills(r, 129, 3);
      path(area(l2), p.near);
      path(along(l2, pine, 20, 34, 6.5), p.near);
      flock(X(96), 92, 3, 10, tone(0.85), 1.2);
      break;
    }

    case 'savane': {
      sun(X(58), 90, 26);
      flock(X(34), 40, 6, 26, tone(0.85));
      streak(X(84), 58, wider(40), p.sun, 0.35);
      streak(X(26), 66, wider(30), p.sun, 0.25);
      const l0 = hills(r, 104, 2.4, 0.3);
      path(area(l0), p.far);
      const far = spots(l0, 7, 10, 34);
      path(draw(far, acaciaTrunk), p.far);
      path(draw(far, acaciaCrown), p.far);
      mist(96, 114, 0.3);
      const l1 = hills(r, 114, 2);
      path(area(l1), tone(0.45));
      const mid = [X(98), X(14)];
      path(acaciaTrunk(mid[0], l1(mid[0]) + 1, 18) + acaciaTrunk(mid[1], l1(mid[1]) + 1, 14), tone(0.45));
      path(acaciaCrown(mid[0], l1(mid[0]) + 1, 18) + acaciaCrown(mid[1], l1(mid[1]) + 1, 14), tone(0.45));
      const l2 = hills(r, 126, 1.6);
      if (c === 'girafes') {
        place(X(80) - 10, l2(X(80) - 10) + 0.6, 1.3, giraffe(p.near), true);
        place(X(80) + 10, l2(X(80) + 10) + 0.6, 1.05, giraffe(p.near), true);
      }
      if (c === 'elephant') place(X(84), l2(X(84)) + 0.6, 1.9, elephant(p.near, p.accent), true);
      path(area(l2), p.near);
      const big = X(24);
      path(acaciaTrunk(big, l2(big) + 1, 56), p.near);
      path(acaciaCrown(big, l2(big) + 1, 56), p.near);
      path(grass(l2, 2, 5, 9), p.near);
      break;
    }

    case 'jungle': {
      sun(X(62), 50, 13);
      const l0 = hills(r, 88, 5);
      path(area(l0) + along(l0, (x, y, s) => circle(x, y - s * 0.3, s), 5, 9, 7), p.far);
      mist(66, 98, 0.55);
      const l1 = hills(r, 102, 5);
      path(area(l1) + along(l1, (x, y, s) => circle(x, y - s * 0.3, s), 6, 11, 8), tone(0.35));
      mist(84, 110, 0.35);
      const l2 = hills(r, 116, 4);
      path(area(l2) + along(l2, (x, y, s) => circle(x, y - s * 0.3, s), 8, 13, 10), tone(0.66));
      flock(X(50), 40, 4, 18, tone(0.8), 1.4);
      const l3 = hills(r, 130, 3);
      path(area(l3), p.near);
      fronds(
        [
          [-4, 150, -62, 66, 12, 12],
          [-6, 124, -28, 50, 10, 10],
          [W + 4, 152, -118, 64, -12, 12],
          [W + 6, 120, -152, 44, -9, 9],
          [X(60), 176, -96, 34, 4, 9],
        ],
        p.near,
      );
      break;
    }

    case 'ocean': {
      const horizon = 96;
      sun(X(60), 88, 19);
      cloud(X(26), 62, 34, p.sun, 0.45);
      cloud(X(96), 46, 28, p.sun, 0.35);
      streak(X(60), 74, wider(60), p.sun, 0.3);
      path(`M-2 ${horizon}C8 89 20 88 32 ${horizon}Z M${f(W - 28)} ${horizon}C${f(W - 20)} 90 ${f(W - 8)} 88 ${f(W + 2)} 91L${f(W + 2)} ${horizon}Z`, tone(0.2));
      path(area(() => horizon), tone(0.05));
      let glints = '';
      for (let i = 0; i < 11; i++) {
        const y = horizon + 1 + i * 1.6 + i * i * 0.2;
        const w = 26 - i * 1.6 + r() * 5;
        glints += ellipse(X(60) + (r() - 0.5) * 4, y, w / 2, 0.38);
      }
      path(glints, p.sun, { opacity: 0.85 });
      const bands: Array<[number, number, number]> = [
        [106, 0.3, 1.2],
        [118, 0.52, 1.8],
        [131, 0.78, 2.4],
        [144, 1, 2.8],
      ];
      bands.forEach(([y, t, amp], i) => {
        if (i === 1 && c === 'baleine') {
          place(X(82), 118.5, 1.5, <path d={WHALE_TAIL} fill={tone(0.88)} />, false, 4);
          let drops = '';
          for (let j = 0; j < 9; j++) drops += circle(X(82) + (r() - 0.5) * 30, 98 + r() * 18, 0.3 + r() * 0.4);
          path(drops, p.accent, { opacity: 0.75 });
        }
        if (i === 1 && c === 'dauphins') {
          place(X(60) - 14, 112, 1.5, <path d={DOLPHIN} fill={tone(0.85)} />, false, -28);
          place(X(60) + 16, 108, 1.25, <path d={DOLPHIN} fill={tone(0.85)} />, false, 22);
        }
        path(area(hills(r, y, amp, 0.8), 1.2), tone(t));
      });
      flock(X(40), 50, 4, 16, tone(0.85), 1.5);
      break;
    }

    case 'recif': {
      let rays = '';
      for (let i = 0; i < many(5); i++) {
        const x = 8 + i * 26 + (r() - 0.5) * 10;
        const w = 3 + r() * 5;
        rays += poly([
          [x - w, -2],
          [x + w, -2],
          [x + w * 3 + 18, 130],
          [x - w + 10, 130],
        ]);
      }
      path(rays, `url(#${id}-ray)`);
      let bubbles = '';
      for (let i = 0; i < many(16); i++) {
        const x = X([22, 96, 70][i % 3]) + (r() - 0.5) * 6;
        bubbles += circle(x, 30 + r() * 90, 0.4 + r() * 1.1);
      }
      path(bubbles, 'none', { stroke: p.accent, strokeOpacity: 0.55, strokeWidth: 0.35 });
      if (c === 'manta') place(X(60), 66, 2.2, <path d={MANTA} fill={tone(0.75)} />, false, -14);
      if (c === 'banc') {
        // banc de poissons en spirale, les plus gros devant
        let fish = '';
        for (let i = 0; i < 30; i++) {
          const a = (i / 30) * Math.PI * 2 * 1.15 + r() * 0.25;
          const rad = 8 + (i / 30) * 16 + r() * 4;
          const x = X(60) + Math.cos(a) * rad * 1.35;
          const y = 64 + Math.sin(a) * rad * 0.62;
          const s = 1.5 + (i / 30) * 1.4 + r() * 0.5;
          fish += `M${f(x)} ${f(y)}q${f(s)} ${f(-s * 0.62)} ${f(s * 2.2)} 0q${f(-s * 1.1)} ${f(s * 0.62)} ${f(-s * 2.2)} 0Z` + poly([
            [x + s * 2, y],
            [x + s * 2.9, y - s * 0.6],
            [x + s * 2.7, y],
            [x + s * 2.9, y + s * 0.6],
          ]);
        }
        path(fish, p.accent);
      }
      if (c === 'meduses') {
        const jelly = mix(p.accent, '#ffffff', 0.5);
        const at = (x: number, y: number, s: number, rot: number) => `translate(${f(X(x))} ${y}) scale(${s})${rot ? ` rotate(${rot})` : ''}`;
        add(
          <>
            <g filter={`url(#${id}-soft)`} opacity={0.7}>
              <g transform={at(36, 58, 2.3, 0)}>{jellyfish(p.accent)}</g>
              <g transform={at(84, 40, 1.6, 12)}>{jellyfish(p.accent)}</g>
              <g transform={at(86, 86, 1.1, -10)}>{jellyfish(p.accent)}</g>
            </g>
            <g opacity={0.85}>
              <g transform={at(36, 58, 2.2, 0)}>{jellyfish(jelly)}</g>
              <g transform={at(84, 40, 1.5, 12)}>{jellyfish(jelly)}</g>
              <g transform={at(86, 86, 1, -10)}>{jellyfish(jelly)}</g>
            </g>
          </>,
        );
      }
      const l0 = hills(r, 122, 5);
      path(area(l0) + along(l0, (x, y, s) => circle(x, y, s), 3, 7, 7), p.far);
      const l1 = hills(r, 134, 4);
      // coraux en doigts : branches courtes et épaisses, bouts arrondis
      const coral = (x: number, y: number, len: number, w: number, color: string) => {
        const levels = ['', '', ''];
        const grow = (bx: number, by: number, l: number, ang: number, depth: number) => {
          const x2 = bx + Math.cos(ang) * l;
          const y2 = by + Math.sin(ang) * l;
          levels[depth] += `M${f(bx)} ${f(by)}L${f(x2)} ${f(y2)}`;
          if (depth < 2) for (const side of [-1, 0.15, 1]) if (side !== 0.15 || r() < 0.6) grow(x2, y2, l * (0.7 + r() * 0.2), ang + side * (0.45 + r() * 0.25), depth + 1);
        };
        grow(x, y, len, -Math.PI / 2 + (r() - 0.5) * 0.3, 0);
        levels.forEach((d, depth) => path(d, 'none', { stroke: color, strokeWidth: w * 0.78 ** depth, strokeLinecap: 'round' }));
      };
      // éventail de gorgone : une feuille ronde au bord irrégulier, sur un pied court
      const fan = (x: number, y: number, s: number, color: string) => {
        const edgePts: Pt[] = [[x - 0.8, y]];
        for (let i = 0; i <= 14; i++) {
          const a = Math.PI * 1.08 + (i / 14) * Math.PI * 0.84;
          const rad = s * (0.86 + r() * 0.22);
          edgePts.push([x + Math.cos(a) * rad, y - s * 0.35 + Math.sin(a) * rad * 1.05]);
        }
        edgePts.push([x + 0.8, y]);
        path(poly(edgePts), color, { opacity: 0.9 });
      };
      tiles((ox) => {
        let weed = '';
        for (const x0 of [26, 56, 88, 114]) {
          const x = ox + x0;
          const h = 26 + r() * 20;
          const y = l1(x) + 2;
          weed += `M${f(x)} ${f(y)}C${f(x - 5)} ${f(y - h * 0.3)} ${f(x + 5)} ${f(y - h * 0.6)} ${f(x - 1)} ${f(y - h)}`;
        }
        path(weed, 'none', { stroke: tone(0.5), strokeWidth: 1.6, strokeLinecap: 'round' });
        fan(ox + 44, l1(ox + 44) + 1, 11, tone(0.45));
        for (const x of [14, 72, 100]) coral(ox + x, l1(ox + x) + 2, 6 + r() * 3, 3.2, tone(0.45));
      });
      path(area(l1), tone(0.6));
      const l2 = hills(r, 144, 4);
      path(area(l2) + along(l2, (x, y, s) => ellipse(x, y, s * 1.3, s), 3, 6, 8), p.near);
      coral(6, l2(6) + 2, 10, 4.6, p.near);
      coral(W - 6, l2(W - 6) + 2, 8, 4, p.near);
      fan(X(86), l2(X(86)) + 1, 13, p.near);
      break;
    }

    case 'volcan': {
      sun(X(26), 58, 10);
      if (c === 'pteros') {
        place(X(34), 80, 1.5, <path d={PTERO} fill={tone(0.85)} />, false, -8);
        place(X(16), 64, 0.9, <path d={PTERO} fill={tone(0.85)} />, false, 6);
        place(X(100), 74, 0.8, <path d={PTERO} fill={tone(0.85)} />, true, -4);
      }
      let smoke = '';
      [
        [58, 54, 5],
        [64, 49, 6.5],
        [73, 46, 8],
        [85, 44, 9],
        [99, 43, 10],
        [114, 42, 10],
        [67, 54, 5],
        [80, 50, 6],
        [94, 50, 7],
      ].forEach(([x, y, s]) => (smoke += circle(x + dx, y, s)));
      path(smoke, mix(p.sky[1], p.near, 0.25), { opacity: 0.7 });
      if (wide) path(area(hills(r, 116, 1.5)), p.far);
      shift(
        dx,
        <>
          <path d="M-2 118C18 110 36 86 48 62L53 64L57 60L62 63L67 61C76 84 96 108 122 114L122 174L-2 174Z" fill={p.far} />
          <path d="M62 63L67 61C76 84 96 108 122 114L122 122L72 120C73 98 67 78 62 63Z" fill={p.near} opacity={0.18} />
          <ellipse cx={57.5} cy={62} rx={11} ry={5} fill={`url(#${id}-lava)`} />
          <path
            d="M55.5 64C54 74 50 82 46.5 94M60.5 64C62.5 72 66 80 64 90M58 63.5C58 70 57 76 58.5 82"
            fill="none"
            stroke={p.accent}
            strokeWidth={0.9}
            strokeLinecap="round"
            opacity={0.85}
          />
        </>,
      );
      mist(92, 122, 0.45);
      const l1 = hills(r, 120, 3);
      path(area(l1), tone(0.5));
      let small = '';
      let smallStems = '';
      tiles((ox) => {
        for (const x0 of [8, 34, 58, 86, 110]) {
          const x = ox + x0;
          const y = l1(x) + 1;
          for (const a of [-130, -100, -75, -50]) {
            const fr = frond(r, x, y, a + (r() - 0.5) * 10, 9 + r() * 4, 2, 2.4);
            small += fr.leaves;
            smallStems += fr.stem;
          }
        }
      });
      path(small, tone(0.5));
      path(smallStems, 'none', { stroke: tone(0.5), strokeWidth: 0.5 });
      const l2 = hills(r, 130, 2.5);
      path(area(l2), p.near);
      fronds(
        [
          [-4, 150, -58, 62, 12, 11],
          [-4, 130, -22, 44, 8, 8],
          [W + 4, 150, -122, 60, -12, 11],
          [W + 6, 128, -158, 40, -8, 8],
        ],
        p.near,
      );
      break;
    }

    case 'aurore': {
      stars(many(80), 120, '#ffffff');
      add(
        <>
          <circle cx={f(X(98))} cy={52} r={5} fill={p.sun} />
          <circle cx={f(X(98) + 2.4)} cy={50.6} r={4.6} fill={mix(p.sky[0], p.sky[1], 0.3)} />
        </>,
      );
      const band = (y0: number, thick: number, amp: number) => {
        const top = hills(r, y0, amp, 0.4);
        const wob = hills(r, 0, 3);
        let d = `M-2 ${f(top(-2))}`;
        for (let x = 0; x <= W + 2; x += 2) d += `L${x} ${f(top(x))}`;
        for (let x = W + 2; x >= -2; x -= 2) d += `L${x} ${f(top(x) + thick + wob(x))}`;
        return `${d}Z`;
      };
      add(
        <g filter={`url(#${id}-blur)`}>
          <path d={band(30, 30, 14)} fill={`url(#${id}-aurora)`} opacity={0.9} />
          <path d={band(48, 22, 10)} fill={`url(#${id}-aurora)`} opacity={0.75} />
          <path d={band(20, 18, 16)} fill={`url(#${id}-aurora2)`} opacity={0.6} />
        </g>,
      );
      const snow = mix(p.far, '#ffffff', 0.5);
      tiles((ox) => {
        for (const [px, py, wl, wr] of [
          [100, 82, 26, 26],
          [26, 76, 34, 30],
          [66, 68, 34, 34],
        ] as Array<[number, number, number, number]>) {
          const m = mountain(r, ox + px + jit(14), py + jit(12), 120, wl, wr);
          path(m.body, p.far);
          path(m.snow, snow, { opacity: 0.85 });
          path(m.shadow, p.near, { opacity: 0.25 });
        }
      });
      path(area(() => 119), tone(0.2));
      add(
        <g filter={`url(#${id}-blur)`} opacity={0.45}>
          <ellipse cx={f(X(40))} cy={122} rx={wider(22)} ry={1.6} fill={p.accent} />
          <ellipse cx={f(X(86))} cy={124} rx={wider(16)} ry={1.3} fill={p.accent2 ?? p.accent} />
        </g>,
      );
      const l2 = hills(r, 130, 2.5);
      path(area(l2), p.near);
      path(along(l2, pine, 22, 40, 6), p.near);
      break;
    }

    case 'nuit': {
      stars(many(90), 120, p.accent);
      const moon: Pt = c === 'loup' ? [72 + dx, 74] : [60 + dx, c === 'cerf' ? 70 : 68];
      const mr = c === 'loup' || c === 'cerf' ? 24 : 22;
      sun(moon[0], moon[1], mr);
      path(circle(moon[0] - 7, moon[1] - 5, 4) + circle(moon[0] + 6, moon[1] + 6, 5.5) + circle(moon[0] + 9, moon[1] - 8, 2.4), p.near, { opacity: 0.07 });
      if (c !== 'loup') {
        const starsAt = [
          [18, 30],
          [28, 22],
          [40, 28],
          [46, 18],
          [86, 24],
          [96, 34],
          [106, 26],
        ].map(([x, y]): Pt => [X(x), y]);
        path(`M${pts(starsAt.slice(0, 4))}M${pts(starsAt.slice(4))}`, 'none', { stroke: p.accent, strokeOpacity: 0.4, strokeWidth: 0.3 });
        path(starsAt.map(([x, y]) => circle(x, y, 0.8)).join(''), p.accent);
      }
      const ridge: Pt3[] = [];
      tiles((ox) => {
        ridge.push([ox + 14, 26 + jit(10), 30], [ox + 104, 34 + jit(10), 34]);
      });
      const l0 = peaks(r, 114, ridge);
      path(area(l0), p.far, { stroke: p.accent, strokeOpacity: 0.45, strokeWidth: 0.4 });
      const l1 = hills(r, 124, 3);
      path(area(l1), tone(0.5));
      path(along(l1, pine, 10, 16, 4.5), tone(0.5));
      if (wide) path(area(hills(r, 129, 1.5)), p.near);
      shift(
        dx,
        <path
          d="M-2 174L-2 130C20 128 40 122 56 116L62 110C70 108 88 107 98 109L102 114C108 120 116 124 122 126L122 174Z"
          fill={p.near}
          stroke={p.accent}
          strokeOpacity={0.3}
          strokeWidth={0.4}
        />,
      );
      if (c === 'loup') place(84 + dx, 109.4, 1.15, <path d={WOLF} fill={p.near} />);
      else if (c === 'cerf') place(80 + dx, 109.2, 1.1, stag(p.near));
      else path(pine(90 + dx, 109.5, 46), p.near);
      break;
    }

    case 'outback': {
      sun(X(30), 70, 16);
      flock(X(80), 40, 5, 22, tone(0.85));
      streak(X(70), 56, wider(46), p.sun, 0.3);
      path(area(hills(r, 110, 1.2)), p.far);
      const ox = X(80) - 80;
      shift(
        ox,
        <>
          <path d="M50 112C52 98 58 89 69 88L96 87C104 88 108 99 111 112Z" fill={tone(0.3)} />
          <path d="M84 87.4C90 92 92 102 92 112L111 112C108 99 104 88 96 87Z" fill={p.near} opacity={0.16} />
          <path
            d="M60 92C58 98 57 104 57.5 112M72 89C70 96 69 104 70 112M83 88C82 96 82 104 83 112M100 89C102 96 103 104 104 112"
            fill="none"
            stroke={tone(0.55)}
            strokeOpacity={0.55}
            strokeWidth={0.45}
          />
        </>,
      );
      mist(100, 118, 0.3);
      const l1 = hills(r, 120, 2);
      path(area(l1) + along(l1, (x, y, s) => ellipse(x, y - s * 0.4, s * 1.4, s), 1.6, 3, 9), tone(0.55));
      const l2 = hills(r, 130, 2);
      if (c === 'kangourou') place(92 + ox, l2(92 + ox) + 0.6, 1.25, <path d={KANGAROO} fill={p.near} />, true);
      path(area(l2), p.near);
      shift(
        X(20) - 20,
        <>
          <path
            d="M20 132C21 120 18 110 21 98C19 92 14 88 12 84L13.2 83.6C15.6 87 19 90 22 94C23 88 26 82 30 78L31 78.8C28 84 25 90 24 98C24 110 25 120 26 132Z"
            fill={p.near}
          />
          <path d={circle(10, 82, 6) + circle(16, 77, 7) + circle(24, 74, 6.5) + circle(32, 77, 6) + circle(28, 70, 5) + circle(18, 70, 5)} fill={p.near} />
        </>,
      );
      path(grass(l2, 3, 7, 10), p.near);
      break;
    }

    case 'desert': {
      sun(X(84), 56, 14);
      flock(X(30), 44, 3, 14, tone(0.85));
      const mesa = (x: number, w: number, top: number, base: number) =>
        poly([
          [x - w / 2 - 7, base],
          [x - w / 2 - 1.5, top + 6],
          [x - w / 2, top],
          [x + w / 2, top],
          [x + w / 2 + 1.5, top + 5],
          [x + w / 2 + 8, base],
        ]);
      // face à l'ombre des buttes, du côté opposé au soleil
      const mesaShade = (x: number, w: number, top: number, base: number) =>
        poly([
          [x - w / 2 + 3, top],
          [x - w / 2, top],
          [x - w / 2 - 1.5, top + 6],
          [x - w / 2 - 7, base],
          [x - w * 0.1, base],
        ]);
      tiles((ox) => {
        const a = ox + 30 + jit(16);
        const b = ox + 94 + jit(10);
        const ta = 80 + jit(10);
        const tb = 88 + jit(8);
        path(mesa(a, 30, ta, 114), p.far);
        path(mesaShade(a, 30, ta, 114), p.near, { opacity: 0.2 });
        path(mesa(b, 22, tb, 114), tone(0.12));
        path(mesaShade(b, 22, tb, 114), p.near, { opacity: 0.2 });
        path(
          `M${f(a - 14)} ${ta + 8}L${f(a + 14)} ${ta + 8}M${f(a - 15)} ${ta + 15}L${f(a + 16)} ${ta + 15}M${f(b - 10)} ${tb + 7}L${f(b + 10)} ${tb + 7}M${f(b - 11)} ${tb + 14}L${f(b + 12)} ${tb + 14}`,
          'none',
          { stroke: p.near, strokeOpacity: 0.14, strokeWidth: 0.6 },
        );
      });
      path(area(hills(r, 113, 1.5)), tone(0.22));
      const l1 = hills(r, 120, 3);
      path(area(l1), tone(0.5));
      const l2 = hills(r, 130, 2);
      path(area(l2), p.near);
      const cacti: Pt[] = [
        [X(16), 48],
        [W - 16, 34],
        [X(62), 14],
      ];
      for (const [x, h] of cacti) nodes.push(saguaro(x, l2(x), h, p.near, k++));
      path(grass(l2, 1.5, 4, 14), p.near);
      break;
    }

    case 'collines': {
      sun(X(90), 42, 11);
      cloud(X(30), 40, 34, '#ffffff', 0.85);
      cloud(X(84), 66, 24, '#ffffff', 0.6);
      const l0 = hills(r, 100, 7);
      path(area(l0), p.far);
      const far = spots(l0, 5, 8, 12);
      path(draw(far, lollipop), p.far);
      path(draw(far, crown), p.far);
      const l1 = hills(r, 114, 6);
      add(
        <>
          <path d={area(l1)} fill={tone(0.4)} />
          <path d={area(l1)} fill={`url(#${id}-rows)`} opacity={0.25} />
        </>,
      );
      const trees: number[] = [];
      tiles((ox) => trees.push(ox + 16, ox + 46, ox + 104));
      path(trees.map((x) => lollipop(x, l1(x) + 1, 12)).join(''), tone(0.55));
      path(trees.map((x) => crown(x, l1(x) + 1, 12)).join(''), tone(0.55));
      if (c === 'ferme') place(X(74), l1(X(74)) + 0.8, 1.7, barn(tone(0.78), p.far));
      const l2 = hills(r, 128, 3);
      path(area(l2), p.near);
      path(grass(l2, 2, 5, 7), p.near);
      if (c === 'ferme') {
        let fence = '';
        for (let x = 4; x < W; x += 7) fence += `M${f(x)} ${f(l2(x) + 1)}L${f(x)} ${f(l2(x) - 4.5)}`;
        const rails = Math.ceil(W / 5) + 1;
        fence += `M-2 ${f(l2(-2) - 3.4)}` + Array.from({ length: rails }, (_, i) => `L${i * 5} ${f(l2(i * 5) - 3.4)}`).join('');
        fence += `M-2 ${f(l2(-2) - 1.6)}` + Array.from({ length: rails }, (_, i) => `L${i * 5} ${f(l2(i * 5) - 1.6)}`).join('');
        path(fence, 'none', { stroke: p.near, strokeWidth: 0.7 });
      }
      if (c === 'lapin') place(X(86), l2(X(86)) + 0.8, 1.9, rabbit(p.near));
      const colors = [p.accent, '#ffd166', '#ffffff'];
      colors.forEach((col, i) => {
        let flowers = '';
        for (let j = 0; j < many(9); j++) {
          const x = r() * W;
          flowers += circle(x, l2(x) - 2 - r() * 3, 0.7 + r() * 0.5);
        }
        path(flowers, col, { opacity: i === 2 ? 0.8 : 1 });
      });
      if (c === 'papillons') {
        place(X(42), 72, 1.9, butterfly(p.accent, p.near), false, -16);
        place(X(78), 58, 1.2, butterfly(p.accent, p.near), false, 12);
        place(X(92), 88, 1.4, butterfly('#ffd166', p.near), false, -8);
        place(X(20), 96, 0.9, butterfly('#ffffff', p.near), false, 20);
      }
      break;
    }

    case 'marais': {
      if (c === 'lucioles') {
        stars(many(50), 80, '#ffffff');
        sun(X(80), 40, 9);
      } else {
        sun(X(60), 86, 15);
        flock(X(54), 44, 7, 30, tone(0.8));
      }
      const l0 = hills(r, 96, 3);
      path(area(l0) + along(l0, (x, y, s) => circle(x, y - s * 0.3, s), 3, 6, 6), p.far);
      add(<rect x={-2} y={97} width={f(W + 4)} height={H} fill={`url(#${id}-lake)`} />);
      if (c !== 'lucioles') {
        let glints = '';
        for (let i = 0; i < 9; i++) glints += ellipse(X(60) + (r() - 0.5) * 3, 99 + i * 2.4 + i * i * 0.15, 12 - i * 0.9, 0.35);
        path(glints, p.sun, { opacity: 0.8 });
      } else {
        path(ellipse(X(80), 104, 3, 0.35) + ellipse(X(80), 107, 2, 0.3), p.sun, { opacity: 0.7 });
      }
      let ripples = '';
      for (let i = 0; i < many(10); i++) {
        const y = 100 + r() * 26;
        ripples += ellipse(r() * W, y, 4 + r() * 8, 0.25);
      }
      path(ripples, p.far, { opacity: 0.35 });
      if (c === 'flamants') {
        const ox = X(85) - 85;
        for (const [x0, y, s] of [
          [70, 118, 1.25],
          [86, 116, 1.05],
          [100, 119, 1.15],
        ] as Pt3[]) {
          const x = x0 + ox;
          place(x, y, s, flamingo(tone(0.85)), x0 === 86);
          add(
            <g opacity={0.25} transform={`translate(${f(x)} ${y}) scale(${x0 === 86 ? -s : s} ${-s})`}>
              {flamingo(tone(0.85))}
            </g>,
          );
        }
      }
      if (c === 'lucioles') {
        let pads = '';
        for (const [x0, y, s] of [
          [30, 112, 4],
          [52, 120, 3],
          [86, 114, 5],
          [70, 124, 3.4],
        ] as Pt3[]) {
          const x = X(x0);
          pads += `M${f(x)} ${y}L${f(x + s * 0.9)} ${f(y - s * 0.12)}A${s} ${s * 0.35} 0 1 0 ${f(x + s * 0.95)} ${f(y + s * 0.08)}Z`;
        }
        path(pads, tone(0.55));
      }
      const l2 = hills(r, 132, 2);
      path(area(l2), p.near);
      let reeds = '';
      let heads = '';
      const clumps: Pt[] = [
        [4, 9],
        [W - 16, 8],
      ];
      for (const [x0, n] of clumps) {
        for (let i = 0; i < n; i++) {
          const x = x0 + i * 1.8 + (r() - 0.5);
          const h = 22 + r() * 22;
          const lean = (r() - 0.5) * 6;
          reeds += `M${f(x)} ${f(l2(x) + 1)}Q${f(x + lean * 0.3)} ${f(l2(x) - h * 0.5)} ${f(x + lean)} ${f(l2(x) - h)}`;
          if (i % 3 === 0) heads += ellipse(x + lean * 0.86, l2(x) - h * 0.86, 0.9, 2.6);
        }
      }
      path(reeds, 'none', { stroke: p.near, strokeWidth: 0.6, strokeLinecap: 'round' });
      path(heads, p.near);
      if (c === 'lucioles') {
        let dots = '';
        for (let i = 0; i < many(22); i++) dots += circle(r() * W, 70 + r() * 70, 0.5 + r() * 0.5);
        add(
          <>
            <path d={dots} fill={p.accent} filter={`url(#${id}-soft)`} />
            <path d={dots} fill="#ffffff" opacity={0.8} />
          </>,
        );
      }
      break;
    }
    case 'banquise': {
      const horizon = 100;
      const ice = p.accent;
      const iceShade = mix(p.accent, p.far, 0.5);
      sun(X(30), 86, 13);
      cloud(X(82), 44, 36, '#ffffff', 0.5);
      cloud(X(20), 54, 24, '#ffffff', 0.35);
      streak(X(46), 70, wider(52), p.sun, 0.3);
      // icebergs à l'horizon : un plateau tabulaire et des pointes, chacun avec sa face à l'ombre
      const berg = (x: number, w: number, h: number, flat: boolean) => {
        const top: Pt[] = flat
          ? [
              [x - w / 2, horizon],
              [x - w / 2 + 1.5, horizon - h],
              [x + w / 2 - 2, horizon - h - 0.6],
              [x + w / 2, horizon],
            ]
          : [
              [x - w / 2, horizon],
              [x - w * 0.3, horizon - h * 0.55],
              [x - w * 0.12, horizon - h * 0.7],
              [x + w * 0.04, horizon - h],
              [x + w * 0.22, horizon - h * 0.6],
              [x + w * 0.34, horizon - h * 0.45],
              [x + w / 2, horizon],
            ];
        path(poly(top), ice);
        path(poly([[x + (flat ? w * 0.18 : w * 0.04), horizon - (flat ? h + 0.3 : h)], ...top.filter(([px]) => px > x + (flat ? w * 0.18 : w * 0.04)), [x + w * 0.1, horizon]]), iceShade, { opacity: 0.55 });
        path(poly(top.map(([px, py]): Pt => [px, horizon + (horizon - py) * 0.35])), iceShade, { opacity: 0.35 });
      };
      tiles((ox) => {
        berg(ox + 22 + jit(14), 34, 11 + jit(4), true);
        berg(ox + 70 + jit(10), 18, 20 + jit(6), false);
        berg(ox + 104 + jit(10), 12, 9, false);
      });
      path(area(() => horizon + 0.5), mix(p.far, p.sky[1], 0.25), { opacity: 0.5 });
      add(<rect x={-2} y={horizon + 0.5} width={f(W + 4)} height={H} fill={p.far} />);
      let glints = '';
      for (let i = 0; i < 10; i++) glints += ellipse(X(30) + (r() - 0.5) * 4, horizon + 2 + i * 1.8 + i * i * 0.2, 13 - i, 0.38);
      path(glints, p.sun, { opacity: 0.8 });
      const floes = (y: number, n: number, s: number, color: string) => {
        let d = '';
        for (let i = 0; i < many(n); i++) d += ellipse(r() * W, y + r() * 6, s * (0.6 + r()), s * 0.22);
        path(d, color);
      };
      floes(106, 7, 4, mix(ice, p.far, 0.25));
      path(area(hills(r, 112, 1.2, 0.6), 1.2), tone(0.3), { opacity: 0.6 });
      floes(116, 5, 7, mix(ice, p.far, 0.15));
      path(area(hills(r, 124, 1.6, 0.6), 1.2), tone(0.55), { opacity: 0.6 });
      // la banquise au premier plan, son bord à l'ombre et la colonie dessus
      const shelf = hills(r, 130, 2, 0.4);
      path(area((x) => shelf(x) + 3.5), mix(p.far, p.near, 0.6));
      path(area(shelf), mix(ice, p.far, 0.12));
      if (c === 'manchots') {
        const colony: Pt3[] = [
          [-14, 0, 1.25],
          [-6, 1, 1.5],
          [3, 0.4, 1.35],
          [12, 1.2, 1.1],
          [19, 0.6, 0.95],
        ];
        const cx = X(76);
        for (const [x0, dy, s] of colony) place(cx + x0, shelf(cx + x0) + 1 + dy, s, penguin(p.near, ice), x0 === 3 || x0 === 19);
      }
      break;
    }

    case 'canyon': {
      sun(X(60), 62, 12);
      flock(X(36), 44, 5, 22, tone(0.8));
      streak(X(78), 52, wider(44), p.sun, 0.3);
      const mid = X(60);
      // falaises en gradins : des corniches horizontales, puis une chute, du bord vers le lit de la rivière
      const wall = (outer: number, inner: number, top: number, bottom: number, steps: number) => {
        const list: Pt[] = [
          [outer, H + 2],
          [outer, top],
        ];
        let x = outer;
        for (let i = 0; i < steps; i++) {
          const t0 = i / steps;
          const t1 = (i + 1) / steps;
          const ya = top + (bottom - top) * t0;
          const yb = top + (bottom - top) * t1;
          const xa = outer + (inner - outer) * (t0 + (t1 - t0) * (0.5 + r() * 0.25));
          list.push([xa, ya + (r() - 0.5) * 1.2]);
          x = xa + (inner - outer) * (0.02 + r() * 0.02);
          list.push([x, yb]);
        }
        list.push([inner, bottom], [inner, H + 2]);
        return poly(list);
      };
      const pair = (gap: number, top: number, bottom: number, steps: number, fill: string, strata: number) => {
        const left = wall(-2, mid - gap, top + jit(6), bottom, steps);
        const right = wall(W + 2, mid + gap, top + jit(6), bottom, steps);
        path(left + right, fill);
        path(left + right, `url(#${id}-strata)`, { opacity: strata });
        path(right, p.near, { opacity: 0.18 });
      };
      pair(X(10), 84, 104, 3, mix(p.far, p.sky[1], 0.35), 0.1);
      // la rivière qui serpente vers l'horizon
      path(`M${f(mid - 1)} 104C${f(mid + 6)} 112 ${f(mid - 14)} 118 ${f(mid - 6)} 128L${f(mid + 22)} 128C${f(mid + 6)} 118 ${f(mid + 10)} 110 ${f(mid + 1)} 104Z`, mix(p.sky[1], p.far, 0.15));
      path(ellipse(mid - 2, 116, 2.5, 0.35) + ellipse(mid + 4, 122, 4, 0.4), p.sun, { opacity: 0.8 });
      pair(X(16), 66, 116, 4, p.far, 0.14);
      mist(104, 124, 0.25);
      pair(X(26), 50, 134, 5, tone(0.55), 0.16);
      path(area(hills(r, 136, 2)), p.near);
      if (c === 'aigle') place(X(60), 76, 1.4, <path d={EAGLE} fill={tone(0.9)} />, false, 8);
      break;
    }

    case 'bambou': {
      sun(X(68), 64, 24, false);
      flock(X(36), 46, 3, 12, tone(0.7), 1.3);
      // une tige de bambou : un fût légèrement penché, ses nœuds, et quelques feuilles en lames
      const stalk = (x: number, w: number, lean: number, color: string, leaves: number) => {
        const top = -4;
        const base = H + 2;
        let d = poly([
          [x - w / 2, base],
          [x - w / 2 + lean, top],
          [x + w / 2 + lean, top],
          [x + w / 2, base],
        ]);
        let knots = '';
        for (let y = base - 10 - r() * 8; y > top; y -= 14 + r() * 6) {
          const xx = x + lean * ((base - y) / (base - top));
          knots += `M${f(xx - w / 2 - 0.2)} ${f(y)}L${f(xx + w / 2 + 0.2)} ${f(y)}`;
        }
        for (let i = 0; i < leaves; i++) {
          const y = 20 + r() * 90;
          const xx = x + lean * ((base - y) / (base - top));
          const side = r() < 0.5 ? -1 : 1;
          for (let j = 0; j < 3; j++) {
            const a = ((side > 0 ? 20 : 160) + (j - 1) * 22 + (r() - 0.5) * 10) * (Math.PI / 180);
            const len = (6 + r() * 5) * (w / 2.4 + 0.4);
            const tip: Pt = [xx + Math.cos(a) * len, y + Math.sin(a) * len + len * 0.25];
            const mx = (xx + tip[0]) / 2;
            const my = (y + tip[1]) / 2;
            const nx = -(tip[1] - y) / len;
            const ny = (tip[0] - xx) / len;
            const bw = len * 0.13;
            d += `M${f(xx)} ${f(y)}Q${f(mx + nx * bw)} ${f(my + ny * bw)} ${f(tip[0])} ${f(tip[1])}Q${f(mx - nx * bw)} ${f(my - ny * bw)} ${f(xx)} ${f(y)}Z`;
          }
        }
        path(d, color);
        path(knots, 'none', { stroke: mix(color, p.sky[1], 0.35), strokeWidth: 0.4 });
      };
      for (let i = 0; i < many(16); i++) stalk(r() * W, 1 + r() * 0.6, (r() - 0.5) * 6, tone(0.05), 1);
      mist(0, 172, 0.55);
      for (let i = 0; i < many(9); i++) stalk(r() * W, 1.8 + r() * 0.8, (r() - 0.5) * 8, tone(0.32), 2);
      mist(60, 172, 0.45);
      const ground = hills(r, 138, 2);
      if (c === 'panda') place(X(58), ground(X(58)) + 1, 1.7, panda(mix(p.accent, p.sky[1], 0.15), p.near));
      path(area(ground), tone(0.7));
      path(grass(ground, 2, 6, 6), tone(0.7));
      for (const x of [X(6), X(14), W - X(8), W - X(18)]) stalk(x + jit(4), 3.6 + r() * 1.4, (r() - 0.5) * 6, p.near, 3);
      break;
    }

    case 'cascade': {
      sun(X(84), 40, 10);
      cloud(X(28), 34, 32, '#ffffff', 0.8);
      cloud(X(90), 58, 24, '#ffffff', 0.55);
      const l0 = hills(r, 82, 5);
      path(area(l0) + along(l0, (x, y, s) => circle(x, y - s * 0.3, s), 4, 8, 7), p.far);
      mist(60, 96, 0.5);
      // la falaise et sa crête de forêt, entaillée là où tombe l'eau
      const fall = X(60);
      const cliffTop = hills(r, 70, 4);
      const lip = (x: number) => cliffTop(x) + Math.max(0, 6 - Math.abs(x - fall) * 0.5);
      path(area(lip), tone(0.4));
      path(area(lip), `url(#${id}-strata)`, { opacity: 0.12 });
      path(along(lip, (x, y, s) => (Math.abs(x - fall) < 9 ? '' : circle(x, y - s * 0.2, s)), 4, 8, 6), tone(0.55));
      const pool = 120;
      const streams: Array<[number, number]> = [
        [fall, 7],
        [fall - X(30), 2],
        [fall + X(28), 2.6],
      ];
      for (const [x, w] of streams) {
        const y0 = lip(x) + 1;
        path(poly([[x - w, y0], [x + w, y0], [x + w * 1.25, pool], [x - w * 1.25, pool]]), p.accent, { opacity: 0.92 });
        let lines = '';
        for (let i = 0; i < Math.max(2, Math.round(w)); i++) {
          const xx = x - w + (2 * w * (i + 0.5)) / Math.max(2, Math.round(w)) + (r() - 0.5);
          lines += `M${f(xx)} ${f(y0 + r() * 6)}L${f(xx + (xx - x) * 0.25)} ${pool}`;
        }
        path(lines, 'none', { stroke: mix(p.accent, p.far, 0.35), strokeWidth: 0.35, opacity: 0.6 });
      }
      // arc-en-ciel dans les embruns
      const bow = ['#ff6b6b', '#ffb84d', '#ffe66b', '#7ee081', '#6bb8ff', '#a98bff'];
      bow.forEach((col, i) => add(<path d={`M${f(fall - 34 + i * 1.2)} ${pool}A${f(34 - i * 1.2)} ${f(34 - i * 1.2)} 0 0 1 ${f(fall + 34 - i * 1.2)} ${pool}`} fill="none" stroke={col} strokeWidth={1.2} opacity={0.32} />));
      add(<rect x={-2} y={pool} width={f(W + 4)} height={H} fill={`url(#${id}-lake)`} />);
      add(
        <g filter={`url(#${id}-blur)`} opacity={0.8}>
          <ellipse cx={f(fall)} cy={pool} rx={18} ry={5} fill="#ffffff" />
          <ellipse cx={f(fall - X(30))} cy={pool} rx={6} ry={2} fill="#ffffff" />
          <ellipse cx={f(fall + X(28))} cy={pool} rx={7} ry={2} fill="#ffffff" />
        </g>,
      );
      let ripples = '';
      for (let i = 0; i < many(10); i++) ripples += ellipse(r() * W, pool + 4 + r() * 14, 3 + r() * 7, 0.25);
      path(ripples, '#ffffff', { opacity: 0.4 });
      flock(X(30), 52, 3, 12, tone(0.85), 1.3);
      const l2 = hills(r, 134, 3);
      path(area(l2), p.near);
      fronds(
        [
          [-4, 150, -58, 60, 12, 11],
          [-6, 126, -24, 44, 9, 9],
          [W + 4, 150, -122, 58, -12, 11],
          [W + 6, 124, -156, 42, -9, 9],
        ],
        p.near,
      );
      break;
    }

    case 'abysses': {
      // neige marine et petites lueurs
      stars(many(70), 168, mix(p.accent, '#ffffff', 0.5));
      let sparks = '';
      for (let i = 0; i < many(18); i++) sparks += circle(r() * W, 20 + r() * 110, 0.5 + r() * 0.7);
      add(
        <>
          <path d={sparks} fill={p.accent} filter={`url(#${id}-soft)`} />
          <path d={sparks} fill="#ffffff" opacity={0.7} />
        </>,
      );
      const jelly = mix(p.accent2 ?? p.accent, '#ffffff', 0.45);
      const at = (x: number, y: number, s: number, rot: number) => `translate(${f(X(x))} ${y}) scale(${s}) rotate(${rot})`;
      add(
        <>
          <g filter={`url(#${id}-soft)`} opacity={0.75}>
            <g transform={at(22, 40, 1.7, -8)}>{jellyfish(p.accent2 ?? p.accent)}</g>
            <g transform={at(100, 56, 1.2, 10)}>{jellyfish(p.accent2 ?? p.accent)}</g>
          </g>
          <g opacity={0.8}>
            <g transform={at(22, 40, 1.6, -8)}>{jellyfish(jelly)}</g>
            <g transform={at(100, 56, 1.1, 10)}>{jellyfish(jelly)}</g>
          </g>
        </>,
      );
      if (c === 'baudroie') {
        const ax = X(64);
        const ay = 84;
        const s = 2.1;
        add(<circle cx={f(ax + 9 * s)} cy={f(ay - 13.6 * s)} r={14} fill={`url(#${id}-glow)`} />);
        place(ax, ay, s, angler(tone(0.25), p.accent));
        add(<circle cx={f(ax + 9 * s)} cy={f(ay - 13.6 * s)} r={1.8} fill={p.sun} />);
      }
      // le fond : collines de vase, cheminées fumantes et vers géants
      const l1 = hills(r, 126, 4);
      path(area(l1), tone(0.35));
      const vent = (x: number, h: number) => {
        const y = l1(x) + 2;
        path(poly([[x - 6, y], [x - 3.5, y - h * 0.5], [x - 2.4, y - h], [x + 2.4, y - h], [x + 3.2, y - h * 0.6], [x + 6, y]]), tone(0.5));
        let smoke = '';
        for (let i = 0; i < 7; i++) smoke += circle(x + i * 1.6 + (r() - 0.5) * 2, y - h - 3 - i * 5, 2.4 + i * 1.1);
        path(smoke, mix(p.far, p.sky[0], 0.3), { opacity: 0.45 });
        path(ellipse(x, y - h, 2.2, 0.8), p.accent, { opacity: 0.8 });
      };
      vent(X(18), 26);
      vent(W - X(16), 18);
      const worms = (x0: number) => {
        let stems = '';
        let tips = '';
        for (let i = 0; i < 7; i++) {
          const x = x0 + (i - 3) * 1.6 + (r() - 0.5);
          const y = l1(x) + 2;
          const h = 8 + r() * 10;
          const lean = (r() - 0.5) * 3;
          stems += `M${f(x)} ${f(y)}Q${f(x + lean)} ${f(y - h * 0.5)} ${f(x + lean * 0.6)} ${f(y - h)}`;
          tips += ellipse(x + lean * 0.6, y - h, 1, 1.6);
        }
        path(stems, 'none', { stroke: mix(p.accent, '#ffffff', 0.6), strokeWidth: 0.8, strokeLinecap: 'round', opacity: 0.8 });
        path(tips, p.accent2 ?? p.accent);
      };
      worms(X(32));
      worms(W - X(32));
      const l2 = hills(r, 140, 3);
      path(area(l2) + along(l2, (x, y, s) => ellipse(x, y, s * 1.4, s), 3, 6, 9), p.near);
      break;
    }

    case 'grotte': {
      // un puits de lumière tombe du plafond sur un lac souterrain
      const hole = X(64);
      add(
        <path
          d={poly([
            [hole - 7, -2],
            [hole + 7, -2],
            [hole + 30, 132],
            [hole - 22, 132],
          ])}
          fill={`url(#${id}-ray)`}
        />,
      );
      add(<circle cx={f(hole)} cy={4} r={20} fill={`url(#${id}-glow)`} />);
      const roof = (base: number, amp: number, gapW: number, drip: number, fill: string) => {
        const prof = hills(r, base, amp);
        const y = (x: number) => (Math.abs(x - hole) < gapW ? -4 : prof(x) - Math.max(0, gapW + 10 - Math.abs(x - hole)) * 0.6);
        let d = `M-2 -4`;
        for (let x = -2; x <= W + 2.01; x += 1.5) d += `L${f(x)} ${f(y(x))}`;
        d += `L${f(W + 2)} -4Z`;
        for (let x = 2 + r() * 5; x < W; x += 3 + r() * 7) {
          if (Math.abs(x - hole) < gapW + 4) continue;
          const len = drip * (0.3 + r() * r() * 1.4);
          const w = 0.8 + len * 0.12;
          d += poly([
            [x - w, y(x) - 1],
            [x + 0.2, y(x) + len],
            [x + w, y(x) - 1],
          ]);
        }
        path(d, fill);
      };
      roof(22, 6, 10, 18, tone(0.15));
      // fond de la salle et lac
      const back = hills(r, 104, 5);
      path(area(back), tone(0.2));
      add(<rect x={-2} y={112} width={f(W + 4)} height={H} fill={`url(#${id}-lake)`} />);
      path(ellipse(hole + 4, 116, 12, 0.6) + ellipse(hole + 3, 120, 8, 0.45) + ellipse(hole + 2, 124, 5, 0.35), p.sun, { opacity: 0.55 });
      // cristaux lumineux : des prismes taillés en biseau, en grappes
      const crystals = (x0: number, y0: number, s: number, color: string) => {
        let d = '';
        let lit = '';
        for (let i = 0; i < 6; i++) {
          const a = ((i - 2.5) * 16 + (r() - 0.5) * 10) * (Math.PI / 180);
          const len = s * (0.5 + r() * 0.7) * (i === 2 || i === 3 ? 1.3 : 1);
          const w = s * 0.12;
          const bx = x0 + (i - 2.5) * s * 0.12;
          const ux = Math.sin(a);
          const uy = -Math.cos(a);
          const tip: Pt = [bx + ux * len, y0 + uy * len];
          const sh: Pt = [bx + ux * len * 0.82, y0 + uy * len * 0.82];
          d += poly([[bx - w, y0], [sh[0] - w, sh[1]], tip, [sh[0] + w, sh[1]], [bx + w, y0]]);
          lit += poly([[bx - w, y0], [sh[0] - w, sh[1]], tip, [bx, y0]]);
        }
        add(<path d={d} fill={color} filter={`url(#${id}-blur)`} opacity={0.8} />);
        path(d, color);
        path(lit, '#ffffff', { opacity: 0.35 });
      };
      const shore = hills(r, 128, 3);
      path(area(shore), tone(0.6));
      crystals(X(22), shore(X(22)) + 1, 18, p.accent);
      crystals(W - X(18), shore(W - X(18)) + 1, 13, p.accent2 ?? p.accent);
      crystals(X(84), shore(X(84)) + 1, 8, p.accent);
      // stalagmites et voûte du premier plan
      const near = hills(r, 140, 3);
      let mites = '';
      for (const x of [X(4), X(12), W - X(6), W - X(30), X(40)]) {
        const h = 10 + r() * 20;
        mites += poly([
          [x - 3 - h * 0.1, near(x) + 1],
          [x - 0.6, near(x) - h],
          [x + 0.6, near(x) - h + 1],
          [x + 3 + h * 0.1, near(x) + 1],
        ]);
      }
      path(area(near) + mites, p.near);
      roof(8, 4, 13, 26, p.near);
      if (c === 'chauves-souris') {
        place(hole - 10, 30, 1.3, <path d={BAT} fill={p.near} />, false, -10);
        place(hole + 8, 44, 1, <path d={BAT} fill={p.near} />, false, 12);
        place(hole - 2, 54, 0.8, <path d={BAT} fill={p.near} />, false, -4);
      }
      break;
    }

    case 'lac': {
      const shoreY = 104;
      const start = nodes.length;
      sun(X(32), 72, 12);
      tiles((ox) => {
        for (const [px, py, wl, wr] of [
          [104, 58, 30, 28],
          [26, 50, 38, 34],
          [68, 34, 40, 40],
        ] as Array<[number, number, number, number]>) {
          const m = mountain(r, ox + px + jit(14), py + jit(10), shoreY + 2, wl, wr);
          path(m.body, p.far);
          path(m.snow, p.accent, { opacity: 0.92 });
          path(m.shadow, p.near, { opacity: 0.2 });
        }
      });
      const shore = hills(r, shoreY, 1.5);
      const firs = along(shore, pine, 8, 16, 3.8, 1.5);
      path(firs, tone(0.5));
      const mirror = nodes.slice(start);
      mist(80, shoreY, 0.5);
      path(firs, tone(0.5));
      path(area(shore), tone(0.5));
      cloud(X(84), 40, 30, '#ffffff', 0.6);
      cloud(X(20), 30, 22, '#ffffff', 0.45);
      // le lac : le paysage s'y reflète, un peu brouillé par les rides
      add(<rect x={-2} y={shoreY + 0.5} width={f(W + 4)} height={H} fill={`url(#${id}-lake)`} />);
      add(
        <g transform={`translate(0 ${f(shoreY * 2 + 1)}) scale(1 -1)`} opacity={0.45}>
          {mirror}
        </g>,
      );
      let ripples = '';
      for (let i = 0; i < many(18); i++) ripples += ellipse(r() * W, shoreY + 3 + r() * 30, 4 + r() * 10, 0.3);
      path(ripples, '#ffffff', { opacity: 0.35 });
      path(ellipse(X(32), shoreY + 14, 8, 0.4) + ellipse(X(32), shoreY + 18, 5, 0.35), p.sun, { opacity: 0.6 });
      const l2 = hills(r, 132, 3);
      if (c === 'cerf') place(X(82), l2(X(82)) + 0.6, 1.25, stag(p.near));
      path(area(l2), p.near);
      for (const [x, h] of [
        [X(6), 46],
        [X(16), 32],
        [W - X(8), 40],
      ] as Pt[])
        path(pine(x, l2(x) + 1, h), p.near);
      path(grass(l2, 2, 5, 9), p.near);
      break;
    }

    case 'neige': {
      sun(X(76), 70, 11);
      const snow = p.accent;
      tiles((ox) => {
        for (const [px, py, wl, wr] of [
          [96, 66, 30, 30],
          [30, 58, 38, 34],
        ] as Array<[number, number, number, number]>) {
          const m = mountain(r, ox + px + jit(14), py + jit(10), 112, wl, wr);
          path(m.body, p.far);
          path(m.snow, snow, { opacity: 0.9 });
          path(m.shadow, p.near, { opacity: 0.18 });
        }
      });
      mist(84, 112, 0.6);
      // des collines blanches, des sapins sombres poudrés de neige
      const layer = (base: number, amp: number, t: number, min: number, max: number, gap: number) => {
        const l = hills(r, base, amp);
        path(area(l), mix(snow, p.far, 0.15 + t * 0.25));
        const trees = spots(l, min, max, gap, 1.5);
        path(draw(trees, pine), tone(t));
        path(
          draw(trees, (x, y, s) => poly([[x - s * 0.08, y - s * 0.92], [x, y - s], [x + s * 0.08, y - s * 0.92]]) + ellipse(x - s * 0.06, y - s * 0.62, s * 0.13, s * 0.03) + ellipse(x + s * 0.08, y - s * 0.36, s * 0.18, s * 0.035)),
          snow,
          { opacity: 0.85 },
        );
        return l;
      };
      layer(112, 3, 0.3, 8, 13, 4);
      mist(100, 124, 0.35);
      const l2 = layer(124, 3, 0.6, 14, 22, 6);
      if (c === 'renard') place(X(62), l2(X(62)) + 2, 1.5, fox(p.accent2 ?? '#e8742c', snow));
      const l3 = hills(r, 136, 2.5);
      path(area(l3), mix(snow, p.near, 0.45));
      for (const [x, h] of [
        [X(4), 50],
        [W - X(6), 42],
      ] as Pt[]) {
        path(pine(x, l3(x) + 1, h), p.near);
      }
      // flocons qui tombent, les plus gros flous devant
      let flakes = '';
      for (let i = 0; i < many(70); i++) flakes += circle(r() * W, r() * 170, 0.3 + r() * 0.5);
      path(flakes, '#ffffff', { opacity: 0.85 });
      let big = '';
      for (let i = 0; i < many(10); i++) big += circle(r() * W, r() * 150, 1 + r());
      add(<path d={big} fill="#ffffff" opacity={0.7} filter={`url(#${id}-soft)`} />);
      break;
    }

    case 'printemps': {
      sun(X(24), 46, 11);
      cloud(X(70), 38, 34, '#ffffff', 0.8);
      cloud(X(100), 60, 22, '#ffffff', 0.55);
      const l0 = hills(r, 100, 6);
      path(area(l0), p.far);
      const far = spots(l0, 5, 8, 10);
      path(draw(far, lollipop), tone(0.25));
      path(draw(far, crown), p.accent, { opacity: 0.85 });
      mist(88, 112, 0.35);
      const l1 = hills(r, 116, 5);
      path(area(l1), tone(0.35));
      // grands cerisiers : tronc tordu et nuages de fleurs en deux tons
      const cherry = (x: number, y: number, s: number) => {
        path(
          `M${f(x - s * 0.08)} ${f(y + 1)}C${f(x - s * 0.04)} ${f(y - s * 0.3)} ${f(x - s * 0.2)} ${f(y - s * 0.45)} ${f(x - s * 0.3)} ${f(y - s * 0.62)}L${f(x - s * 0.26)} ${f(y - s * 0.64)}C${f(x - s * 0.1)} ${f(y - s * 0.5)} ${f(x + s * 0.02)} ${f(y - s * 0.5)} ${f(x + s * 0.06)} ${f(y - s * 0.66)}L${f(x + s * 0.1)} ${f(y - s * 0.64)}C${f(x + s * 0.08)} ${f(y - s * 0.4)} ${f(x + s * 0.08)} ${f(y - s * 0.2)} ${f(x + s * 0.08)} ${f(y + 1)}Z`,
          tone(0.75),
        );
        let bloom = '';
        let light = '';
        for (let i = 0; i < 14; i++) {
          const a = r() * Math.PI;
          const rad = s * (0.18 + r() * 0.28);
          const bx = x - s * 0.1 + Math.cos(a) * rad * 1.4;
          const by = y - s * 0.66 - Math.sin(a) * rad * 0.7;
          bloom += circle(bx, by, s * (0.1 + r() * 0.08));
          if (r() < 0.6) light += circle(bx - s * 0.03, by - s * 0.03, s * (0.05 + r() * 0.05));
        }
        path(bloom, p.accent);
        path(light, p.accent2 ?? '#ffffff', { opacity: 0.9 });
      };
      cherry(X(84), l1(X(84)) + 1, 40);
      if (wide) cherry(W - X(14), l1(W - X(14)) + 1, 30);
      const l2 = hills(r, 130, 3);
      path(area(l2), p.near);
      path(grass(l2, 2, 5, 7), p.near);
      cherry(X(10), l2(X(10)) + 1, 62);
      // pétales qui volent
      let petals = '';
      for (let i = 0; i < many(26); i++) {
        const x = r() * W;
        const y = 30 + r() * 110;
        const a = r() * 180;
        const s = 0.6 + r() * 0.6;
        petals += `M${f(x)} ${f(y)}q${f(s * Math.cos(a))} ${f(-s)} ${f(s * 2)} 0q${f(-s)} ${f(s)} ${f(-s * 2)} 0Z`;
      }
      path(petals, p.accent2 ?? '#ffffff', { opacity: 0.9 });
      if (c === 'papillons') {
        place(X(46), 70, 1.6, butterfly(p.accent, p.near), false, -14);
        place(X(60), 88, 1.1, butterfly('#ffd166', p.near), false, 12);
      }
      break;
    }

  }

  // ombre au pied de la scène, pour que le texte posé dessus se lise toujours
  if (shade) add(<rect x={-2} y={112} width={f(W + 4)} height={62} fill={`url(#${id}-shade)`} />);

  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="1" stopColor={p.sky[1]} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={p.sun} stopOpacity={0.6} />
          <stop offset="0.35" stopColor={p.sun} stopOpacity={0.22} />
          <stop offset="1" stopColor={p.sun} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}-mist`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[1]} stopOpacity={0} />
          <stop offset="1" stopColor={p.sky[1]} stopOpacity={0.85} />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.near} stopOpacity={0} />
          <stop offset="0.55" stopColor={p.near} stopOpacity={0.55} />
          <stop offset="1" stopColor={p.near} stopOpacity={0.92} />
        </linearGradient>
        <linearGradient id={`${id}-ray`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.32} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`${id}-lake`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(p.sky[1], p.far, 0.2)} />
          <stop offset="0.5" stopColor={tone(0.35)} />
          <stop offset="1" stopColor={tone(0.6)} />
        </linearGradient>
        <radialGradient id={`${id}-lava`}>
          <stop offset="0" stopColor="#fff2b0" />
          <stop offset="0.35" stopColor={p.accent} stopOpacity={0.9} />
          <stop offset="1" stopColor={p.accent} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}-aurora`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.accent2 ?? p.accent} stopOpacity={0} />
          <stop offset="0.45" stopColor={p.accent2 ?? p.accent} stopOpacity={0.5} />
          <stop offset="0.85" stopColor={p.accent} stopOpacity={0.95} />
          <stop offset="1" stopColor={p.accent} stopOpacity={0.2} />
        </linearGradient>
        <linearGradient id={`${id}-aurora2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.accent} stopOpacity={0} />
          <stop offset="0.7" stopColor={p.accent2 ?? p.accent} stopOpacity={0.8} />
          <stop offset="1" stopColor={p.accent2 ?? p.accent} stopOpacity={0.1} />
        </linearGradient>
        <pattern id={`${id}-rows`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
          <rect width="4" height="1.4" fill={p.near} />
        </pattern>
        <pattern id={`${id}-strata`} width="6" height="5" patternUnits="userSpaceOnUse">
          <rect width="6" height="1.1" fill={p.near} />
        </pattern>
        <filter id={`${id}-blur`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
      </defs>
      <rect x={-2} y={-2} width={f(W + 4)} height={H + 4} fill={`url(#${id}-sky)`} />
      {nodes}
    </>
  );
}

function useSceneId(): string {
  const raw = useId();
  return `ps${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
}

/** Une scène au format booster (120 × 172), recadrée pour remplir son conteneur. */
export function PackScene({ scene, seed, className = 'pack-art__scene', shade = true }: { scene: SceneDef; seed: string; className?: string; shade?: boolean }) {
  const id = useSceneId();
  const art = useMemo(() => paint(scene, seed, id, SPAN, shade), [scene, seed, id, shade]);
  return (
    <svg className={className} viewBox={`0 0 ${SPAN} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {art}
    </svg>
  );
}

/**
 * Panorama : la même scène peinte à la largeur de son conteneur (fond de page, bannières, ouverture de booster).
 * La largeur du dessin suit les proportions de la boîte, par paliers de 20 pour ne pas repeindre à chaque pixel.
 */
/** Largeur du repère (hauteur 172) qui remplit l'élément sans déformer le dessin : au pas de 20, entre SPAN et `maxWidth`. */
export function useSceneWidth(ref: RefObject<SVGSVGElement | null>, maxWidth = 900): number {
  const [width, setWidth] = useState(240);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => {
      // la taille de mise en page, pas celle à l'écran : pendant l'arrivée en 3D d'un écran, l'élément paraît écrasé
      // par la perspective, et le paysage serait calculé trop étroit puis recadré (getBoundingClientRect)
      const width = el.clientWidth || el.getBoundingClientRect().width;
      const height = el.clientHeight || el.getBoundingClientRect().height;
      if (!width || !height) return;
      const w = Math.round((H * width) / height / 20) * 20;
      setWidth(Math.min(maxWidth, Math.max(SPAN, w)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, maxWidth]);
  return width;
}

export function Landscape({
  scene,
  seed,
  className = '',
  shade = false,
  maxWidth = 900,
}: {
  scene: SceneDef;
  seed: string;
  className?: string;
  shade?: boolean;
  maxWidth?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const width = useSceneWidth(ref, maxWidth);
  const id = useSceneId();
  const art = useMemo(() => paint(scene, seed, id, width, shade), [scene, seed, id, width, shade]);
  return (
    <svg ref={ref} className={className} viewBox={`0 0 ${width} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {art}
    </svg>
  );
}
