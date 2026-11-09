import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/app.css';
import './pub-trailer.css';
import { Card } from '../components/Card';
import { CardBack } from '../components/CardBack';
import { Logo } from '../components/Logo';
import { PackArt, packScene } from '../components/PackArt';
import { Landscape, type SceneDef } from '../components/PackScene';
import { HERO_SCENE, SCREEN_SCENES } from '../art/scenes';
import { SCENE_H, SCENE_W, drawScene, type SceneModel } from '../art/reserve-scene';
import { TRAIL_H, TRAIL_W, drawTrail } from '../art/expedition-scene';
import { spriteForAthlete } from '../art/reserve-sprites';
import { ATHLETES_BY_ID } from '../data/athletes';
import type { EnclosId } from '../engine/reserve';
import type { CardFace } from '../engine/types';
import * as fx from './trailer-fx';
import { renderSoundtrack } from './pub-trailer-son';
import cutLion from './detoures/lion.webp';
import cutRequin from './detoures/requin-blanc.webp';
import cutCobra from './detoures/cobra-royal.webp';
import cutPanda from './detoures/panda.webp';
import cutPanthere from './detoures/panthere-des-neiges.webp';

// Bande-annonce TikTok « AnimalCards » (1080 × 1920, 30 images/s), dans la direction artistique du jeu : les
// affiches peintes au crépuscule des boosters et des écrans (forêt, savane, récif, aurore, volcan…), le vert forêt,
// le parchemin, le miel et le lichen, les titres en Lilita, les sur-titres du carnet de naturaliste et les lucioles.
// On y ouvre le booster gratuit « Animaux du monde » (l'éventail de dos de cartes, comme dans le jeu), une
// Légendaire, le lion qui sort de sa carte, un montage, les ultra-rares, le duel, la réserve, puis l'appel à jouer.
// Les animaux détourés viennent des photos libres du jeu (Unsplash, Pixabay) ; aucun fichier ne part sur le site.
// Chaque image est calculée à partir du temps (window.__seek(t)) et la bande-son est rendue hors ligne, calée dessus.

const DURATION = 25;

// couleurs du jeu (styles/base.css)
const CREAM = '#fff8ec';
const INK = '#0b1510';
const HONEY = '#ffd36b';
const LICHEN = '#a9cf7e';
const CORAL = '#ff8f78';
const MINT = '#8fe3d4';

// ───────────── registre des éléments animés ─────────────

const els = new Map<string, HTMLElement>();
const reg = (k: string) => (el: HTMLElement | null) => {
  if (el) els.set(k, el);
  else els.delete(k);
};

interface Tf {
  x?: number;
  y?: number;
  z?: number;
  s?: number;
  sx?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  o?: number;
  blur?: number;
  zi?: number;
}

/** La caméra : elle tourne autour du centre de l'écran (lacet, tangage, roulis, en degrés). */
let CAM = { yaw: 0, pitch: 0, roll: 0 };

/** Place un élément dans l'espace (coordonnées depuis le centre de l'écran), vu par la caméra, ou le cache (null). */
function put(k: string, f: Tf | null) {
  const el = els.get(k);
  if (!el) return;
  const o = f ? (f.o ?? 1) : 0;
  if (!f || o <= 0.003) {
    el.style.visibility = 'hidden';
    return;
  }
  el.style.visibility = 'visible';
  el.style.opacity = o >= 0.999 ? '' : o.toFixed(3);
  const s = f.s ?? 1;
  el.style.transform = `perspective(1600px) rotateZ(${CAM.roll.toFixed(2)}deg) rotateX(${CAM.pitch.toFixed(2)}deg) rotateY(${CAM.yaw.toFixed(2)}deg) translate3d(${(f.x ?? 0).toFixed(1)}px, ${(f.y ?? 0).toFixed(1)}px, ${(f.z ?? 0).toFixed(1)}px) rotateX(${(f.rx ?? 0).toFixed(2)}deg) rotateY(${(f.ry ?? 0).toFixed(2)}deg) rotateZ(${(f.rz ?? 0).toFixed(2)}deg) scale(${((f.sx ?? 1) * s).toFixed(4)}, ${s.toFixed(4)})`;
  el.style.filter = f.blur && f.blur > 0.4 ? `blur(${f.blur.toFixed(1)}px)` : '';
  if (f.zi !== undefined) el.style.zIndex = String(f.zi);
}

/** Reflet holographique d'une carte, selon l'angle. */
function glare(k: string, mx: number, my = 38) {
  els
    .get(k)
    ?.querySelectorAll<HTMLElement>('.card')
    .forEach((card) => {
      card.dataset.active = 'true';
      card.style.setProperty('--mx', `${mx.toFixed(1)}%`);
      card.style.setProperty('--my', `${my.toFixed(1)}%`);
    });
}

function setLines(k: string, lines: string[]) {
  els
    .get(k)
    ?.querySelectorAll('.tr-line')
    .forEach((line, i) => {
      if (line.getAttribute('data-t') === lines[i]) return;
      line.setAttribute('data-t', lines[i]);
      line.querySelector('span')!.textContent = lines[i];
    });
}

/** Un titre qui claque : arrive en grand, se pose avec un rebond, repart en s'envolant. */
function slam(k: string, t: number, t0: number, x: number, y: number, o: { from?: number; out?: number; outDur?: number; rz?: number; drift?: number; zi?: number; z?: number } = {}) {
  const outDur = o.outDur ?? 0.18;
  if (t < t0 || (o.out !== undefined && t >= o.out + outDur)) return put(k, null);
  const k1 = fx.seg(t, t0, t0 + 0.3);
  const from = 1 + ((o.from ?? 2.2) - 1) * 0.4;
  let s = fx.lerp(from, 1, fx.outBack(k1, 1.7)) * (1 + (o.drift ?? 0.03) * Math.min(3, t - t0));
  let a = fx.seg(t, t0, t0 + 0.05);
  let dy = 0;
  if (o.out !== undefined && t >= o.out) {
    const q = fx.seg(t, o.out, o.out + outDur);
    s *= 1 + 0.5 * q;
    a *= 1 - q;
    dy = -120 * q;
  }
  // le titre bascule depuis l'arrière, comme une carte qu'on relève
  put(k, { x, y: y + dy, z: (o.z ?? 90) - 500 * (1 - fx.outCubic(k1)), s, rx: fx.lerp(-85, 0, fx.outBack(k1, 1.3)), rz: o.rz ?? -2, o: a, zi: o.zi });
}

/** Une étiquette qui saute en place. */
function pop(k: string, t: number, t0: number, x: number, y: number, o: { out?: number; zi?: number; rz?: number } = {}) {
  if (t < t0 || (o.out !== undefined && t >= o.out + 0.15)) return put(k, null);
  const k1 = fx.seg(t, t0, t0 + 0.3);
  const q = o.out !== undefined ? fx.seg(t, o.out, o.out + 0.15) : 0;
  put(k, { x, y, z: 110, s: fx.lerp(0.4, 1, fx.outBack(k1, 2.2)) * (1 - 0.4 * q), ry: fx.lerp(-100, 0, fx.outBack(k1, 1.4)), o: fx.seg(t, t0, t0 + 0.06) * (1 - q), rz: o.rz ?? 0, zi: o.zi });
}

/** Un sur-titre qui glisse depuis la gauche, comme ceux des écrans du jeu. */
function slide(k: string, t: number, t0: number, x: number, y: number, o: { out?: number; zi?: number } = {}) {
  if (t < t0 || (o.out !== undefined && t >= o.out + 0.15)) return put(k, null);
  const e = fx.outCubic(fx.seg(t, t0, t0 + 0.35));
  const q = o.out !== undefined ? fx.seg(t, o.out, o.out + 0.15) : 0;
  put(k, { x: x - 160 * (1 - e), y: y - 40 * q, z: 100, ry: 50 * (1 - e), o: fx.seg(t, t0, t0 + 0.2) * (1 - q), zi: o.zi });
}

// ───────────── composants ─────────────

function Ob({ k, z = 10, children }: { k: string; z?: number; children: ReactNode }) {
  return (
    <div className="tr-ob" ref={reg(k)} style={{ zIndex: z, visibility: 'hidden' }}>
      <div className="tr-in">{children}</div>
    </div>
  );
}

const face = (athleteId: string, variant: CardFace['variant'] = 'base'): CardFace => ({ athleteId, variant });

function C({ card, w }: { card: CardFace; w: number }) {
  return <Card card={card} size="lg" tilt style={{ ['--card-w' as string]: `${w}px` }} />;
}

/** Carte à deux faces (le dos apparaît quand elle tourne). */
/** Carte en volume : deux faces et une tranche (des couches de carton), on la voit quand elle tourne. */
function Flip({ card, w }: { card: CardFace; w: number }) {
  const d = Math.max(4, Math.round(w / 50));
  const layers = 7;
  return (
    <div className="tr-flip" style={{ width: w, height: w * 1.4 }}>
      {Array.from({ length: layers }, (_, i) => (
        <div key={i} className="tr-edge" style={{ transform: `translateZ(${((i / (layers - 1) - 0.5) * (d - 1)).toFixed(2)}px)` }} />
      ))}
      <div className="tr-face" style={{ transform: `translateZ(${d / 2}px)` }}>
        <C card={card} w={w} />
        <div className="tr-shade" />
      </div>
      <div className="tr-face tr-back" style={{ transform: `rotateY(180deg) translateZ(${d / 2}px)` }}>
        <CardBack />
      </div>
    </div>
  );
}

/** Assombrit une carte (sans opacité, qui écraserait sa 3D). */
function shade(k: string, v: number) {
  const el = els.get(k)?.querySelector<HTMLElement>('.tr-shade');
  if (el) el.style.opacity = v.toFixed(2);
}

type Edge = 'bottom' | 'left' | 'right';
const CUTS: Record<string, { src: string; fade: Edge[] }> = {
  lion: { src: cutLion, fade: ['bottom'] },
  'requin-blanc': { src: cutRequin, fade: ['right'] },
  'cobra-royal': { src: cutCobra, fade: ['left', 'bottom'] },
  panda: { src: cutPanda, fade: [] },
  'panthere-des-neiges': { src: cutPanthere, fade: ['left', 'bottom'] },
};
const FADE: Record<Edge, string> = {
  bottom: 'linear-gradient(to top, transparent 0%, #000 16%)',
  left: 'linear-gradient(to right, transparent 0%, #000 14%)',
  right: 'linear-gradient(to left, transparent 0%, #000 14%)',
};
/** Largeur de base d'un animal détouré (la taille de la photo dans une grande carte). */
const CUT_W = 432;

function Cut({ k, id, z = 30, aura }: { k: string; id: string; z?: number; aura: string }) {
  const c = CUTS[id];
  const mask = c.fade.map((e) => FADE[e]).join(', ');
  const style: CSSProperties = { width: CUT_W, ['--aura' as string]: aura };
  if (mask) Object.assign(style, { maskImage: mask, WebkitMaskImage: mask, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' });
  return (
    <Ob k={k} z={z}>
      <img className="tr-cut" src={c.src} alt="" decoding="sync" style={style} />
    </Ob>
  );
}

const PARCHMENT = `linear-gradient(180deg, ${CREAM} 0%, ${CREAM} 55%, #f1e3c2 100%)`;
const GOLD = `linear-gradient(180deg, #fff3cf 0%, ${HONEY} 55%, #e8a93c 100%)`;

/** Grand titre en Lilita, comme ceux des écrans du jeu : parchemin, contour vert forêt et ombre douce. */
function Slam({ k, lines, size, fill = PARCHMENT, stroke = INK, z = 60, sw = 0.1 }: { k: string; lines: string[]; size: number; fill?: string; stroke?: string; z?: number; sw?: number }) {
  return (
    <Ob k={k} z={z}>
      <div className="tr-slam" style={{ fontSize: size, ['--fill' as string]: fill, ['--stroke' as string]: stroke, ['--sw' as string]: `${Math.round(size * sw)}px` }}>
        {lines.map((line, i) => (
          <span key={i} className="tr-line" data-t={line}>
            <span>{line}</span>
          </span>
        ))}
      </div>
    </Ob>
  );
}

/** Sur-titre du carnet : petites capitales espacées, précédées du trait miel et lichen. */
function Eyebrow({ k, text, z = 60, tight = false }: { k: string; text: string; z?: number; tight?: boolean }) {
  return (
    <Ob k={k} z={z}>
      <div className={`tr-eyebrow${tight ? ' tr-eyebrow--tight' : ''}`}>{text}</div>
    </Ob>
  );
}

/** Pastille de palier (Commune, Rare, Légendaire…), comme sous les cartes du jeu. */
function Tag({ k, text, bg, ink = INK, z = 70, size = 40 }: { k: string; text: string; bg: string; ink?: string; z?: number; size?: number }) {
  return (
    <Ob k={k} z={z}>
      <span className="tr-tag" style={{ background: bg, color: ink, fontSize: size }}>
        {text}
      </span>
    </Ob>
  );
}

const draws: ((t: number) => void)[] = [];
function Pixel({ w, h, draw }: { w: number; h: number; draw: (c: CanvasRenderingContext2D, t: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!.getContext('2d')!;
    const fn = (t: number) => draw(c, t);
    draws.push(fn);
    fn(0);
    return () => {
      draws.splice(draws.indexOf(fn), 1);
    };
  }, [draw]);
  return <canvas ref={ref} width={w} height={h} />;
}

// ───────────── les affiches peintes derrière chaque plan ─────────────

const LANDS: { a: number; b: number; scene: SceneDef; from: number; to: number; dy?: number }[] = [
  { a: 0, b: 4.0, scene: SCREEN_SCENES.profil, from: 1.18, to: 1.04 },
  { a: 4.0, b: 5.0, scene: packScene('black'), from: 1.1, to: 1.02 },
  { a: 5.0, b: 7.0, scene: packScene('sport', 'felins'), from: 1.16, to: 1.04 },
  { a: 7, b: 8, scene: packScene('sport', 'requins'), from: 1.12, to: 1.02 },
  { a: 8, b: 9, scene: packScene('sport', 'primates'), from: 1.12, to: 1.02 },
  { a: 9, b: 10, scene: packScene('sport', 'ours'), from: 1.12, to: 1.02 },
  { a: 10, b: 11, scene: packScene('silver'), from: 1.12, to: 1.02 },
  { a: 11, b: 13, scene: SCREEN_SCENES.boutique, from: 1.14, to: 1.02 },
  { a: 13, b: 17, scene: SCREEN_SCENES.matchs, from: 1.14, to: 1.03 },
  { a: 17, b: 19.5, scene: SCREEN_SCENES.collection, from: 1.12, to: 1.02 },
  { a: 19.5, b: DURATION + 1, scene: HERO_SCENE, from: 1.2, to: 1.04 },
];

function lands(t: number) {
  LANDS.forEach((l, i) => {
    const el = els.get(`land${i}`);
    if (!el) return;
    const on = t >= l.a && t < l.b;
    el.style.visibility = on ? 'visible' : 'hidden';
    if (!on) return;
    const k = fx.inOut(fx.seg(t, l.a, Math.min(l.b, DURATION)));
    // l'affiche est loin derrière les cartes : quand la caméra tourne, elle glisse moins vite (parallaxe)
    const kb = 1 + (fx.lerp(l.from, l.to, k) - 1) * 0.5;
    el.style.transform = `perspective(1600px) rotateZ(${(CAM.roll * 0.4).toFixed(2)}deg) rotateX(${(CAM.pitch * 0.4).toFixed(2)}deg) rotateY(${(CAM.yaw * 0.4).toFixed(2)}deg) translateZ(-600px) scale(${(1.8 * kb).toFixed(4)})`;
  });
}

// ───────────── données des plans ─────────────

const PW = 470;
const PH = (PW * 172) / 120;
const YREST = 60;
/** hauteur de la déchirure (depuis le centre de l'écran) */
const OPEN_Y = YREST - PH / 2 + 0.16 * PH;

/** l'éventail de cinq dos de cartes qui sort du sachet (comme dans le jeu) ; la carte du milieu est la Légendaire */
const FAN = [0, 1, 2, 3, 4].map((i) => ({ x: (i - 2) * 96, y: OPEN_Y - 170 + (i - 2) * (i - 2) * 11, rz: (i - 2) * 11, ry: (i - 2) * -16, z: -Math.abs(i - 2) * 60 }));
const FAN_S = 0.7;
const FLY = [
  { fan: 4, card: face('girafe'), tx: 760, ty: -1150, spin: 200 },
  { fan: 0, card: face('crocodile-du-nil'), tx: -800, ty: -950, spin: -220 },
  { fan: 3, card: face('leopard'), tx: 840, ty: 700, spin: 180 },
  { fan: 1, card: face('loup'), tx: -820, ty: 850, spin: -200 },
];

type Theme = 'recif' | 'jungle' | 'foret' | 'neige';
const MONT: { id: string; name: string[]; tag: string; tagBg: string; theme: Theme; from: [number, number]; to: [number, number]; drift: number; s: number; rz: [number, number]; aura: string }[] = [
  { id: 'requin-blanc', name: ['Requin blanc'], tag: 'Légendaire · Océans', tagBg: CORAL, theme: 'recif', from: [120, 300], to: [20, -60], drift: -80, s: 2.05, rz: [-14, -5], aura: 'rgba(191,247,238,0.85)' },
  { id: 'cobra-royal', name: ['Cobra royal'], tag: 'Épique · Forêt tropicale', tagBg: '#b98bff', theme: 'jungle', from: [-120, 420], to: [40, -40], drift: 0, s: 1.9, rz: [6, 0], aura: 'rgba(255,216,168,0.85)' },
  { id: 'panda', name: ['Panda'], tag: 'Légendaire · Forêt de bambous', tagBg: CORAL, theme: 'foret', from: [140, 360], to: [0, -40], drift: 20, s: 1.95, rz: [-40, 5], aura: 'rgba(255,243,208,0.9)' },
  { id: 'panthere-des-neiges', name: ['Panthère', 'des neiges'], tag: 'Légendaire · Haute montagne', tagBg: CORAL, theme: 'neige', from: [-140, 320], to: [40, -50], drift: -30, s: 2.0, rz: [12, -2], aura: 'rgba(213,236,255,0.9)' },
];

const RARES: { k: string; card: CardFace; x: number; y: number; w: number; rz: number; ry: number; t0: number; label: string; bg: string; ink: string }[] = [
  { k: 'r-prime', card: face('chat', 'prime'), x: -320, y: 50, w: 320, rz: -11, ry: 22, t0: 11.5, label: 'Prime', bg: '#f2c7d8', ink: '#5b2440' },
  { k: 'r-rev', card: face('loup', 'reverse'), x: 320, y: 50, w: 320, rz: 11, ry: -22, t0: 12.0, label: 'Reverse', bg: 'linear-gradient(115deg, #ffc9df, #ffe6c4 35%, #c8f2df 65%, #d6d0ff)', ink: '#5b4380' },
  { k: 'r-icone', card: face('thylacine'), x: 0, y: -90, w: 380, rz: 0, ry: 0, t0: 11.0, label: 'Icône', bg: 'linear-gradient(180deg, #fff1c4, #e8b04c)', ink: '#3a2606' },
];

const RING: CardFace[] = [face('lion'), face('requin-blanc'), face('panda', 'prime'), face('thylacine'), face('tigre', 'reverse'), face('panthere-des-neiges'), face('chat', 'prime'), face('cobra-royal')];
const RING_W = 250;

const sprite = (id: string) => spriteForAthlete(ATHLETES_BY_ID[id]);
const PENS: Partial<Record<EnclosId, string[]>> = {
  foret: ['panda', 'cerf', 'ours-brun', 'renard-roux'],
  savane: ['lion', 'girafe', 'zebre', 'elephant', 'guepard'],
  ferme: ['vache', 'cochon', 'cheval'],
  marais: ['flamant-rose', 'hippopotame'],
  banquise: ['ours-polaire', 'manchot-empereur'],
  jungle: ['tigre', 'gorille'],
  aquarium: ['orque', 'poisson-clown'],
  montagne: ['panthere-des-neiges'],
};
const MODEL: SceneModel = {
  open: new Set(Object.keys(PENS) as EnclosId[]),
  animals: Object.fromEntries(Object.entries(PENS).map(([k, ids]) => [k, ids!.filter((id) => ATHLETES_BY_ID[id]).map(sprite)])),
  gains: { foret: 74, savane: 135, ferme: 26, marais: 32, banquise: 54, jungle: 50, aquarium: 62, montagne: 30 },
  rate: 463,
};
const drawReserve = (c: CanvasRenderingContext2D, t: number) => drawScene(c, t, MODEL);
const drawTrip = (c: CanvasRenderingContext2D, t: number) => drawTrail(c, t, sprite('lion'), 'savane', fx.clamp((t - 18.0) / 1.5) * 0.85, false);
const PANEL_H = 700;
const PANEL_CANVAS_H = ((940 - 18) * SCENE_H) / SCENE_W;

// lumières du jeu : miel, parchemin, lichen, corail, menthe
const FIREFLY = ['#f2ffb0', '#fff3a0', '#e6ff7a'];

// ───────────── la caméra : secousses, coups de zoom, flashs ─────────────

const IMPACTS: [number, number][] = [
  [0.45, 12],
  [2.0, 24],
  [4.0, 20],
  [5.0, 22],
  [7, 12],
  [8, 12],
  [9, 12],
  [10, 12],
  [11.0, 8],
  [11.5, 5],
  [12.0, 5],
  [13.5, 8],
  [15.0, 18],
  [17.0, 10],
  [19.5, 18],
  [19.62, 10],
];
const PUNCH: [number, number][] = [
  [2.0, 0.06],
  [4.0, 0.05],
  [5.0, 0.07],
  [7, 0.06],
  [8, 0.06],
  [9, 0.06],
  [10, 0.06],
  [11, 0.04],
  [15.0, 0.06],
  [17, 0.04],
  [19.5, 0.06],
];
/** zooms qui avalent l'image juste avant une coupe */
const SWALLOW: [number, number][] = [
  [6.78, 7.0],
  [12.85, 13.0],
  [16.8, 17.0],
  [19.32, 19.5],
];
const FLASHES: [number, number, number, string][] = [
  [0.45, 0.3, 0.2, CREAM],
  [2.0, 0.95, 0.35, CREAM],
  [4.0, 0.95, 0.45, '#fff3cf'],
  [5.0, 0.7, 0.28, '#fff3cf'],
  [7, 0.8, 0.2, CREAM],
  [8, 0.8, 0.2, CREAM],
  [9, 0.8, 0.2, CREAM],
  [10, 0.8, 0.2, CREAM],
  [11, 0.75, 0.25, CREAM],
  [13.0, 0.55, 0.2, CREAM],
  [15.0, 0.7, 0.3, '#f0fff9'],
  [17.0, 0.75, 0.25, CREAM],
  [19.5, 0.95, 0.4, CREAM],
];

/** Les mouvements de la caméra, plan par plan (en degrés). */
function camAngles(t: number) {
  if (t < 4) return { yaw: 8 * Math.sin(t * 0.9), pitch: 6 + 3 * Math.sin(t * 0.7), roll: 1.5 * Math.sin(t * 0.5) };
  if (t < 5) {
    const k = fx.outCubic(fx.seg(t, 4, 4.6));
    return { yaw: -22 * (1 - k) + 4 * Math.sin(t * 2), pitch: 8 * (1 - k), roll: 0 };
  }
  if (t < 7) {
    const k = fx.inOut(fx.seg(t, 5, 7));
    return { yaw: fx.lerp(16, -12, k), pitch: fx.lerp(-12, -5, k), roll: fx.lerp(-2, 2, k) };
  }
  if (t < 11) {
    const i = Math.floor(t - 7);
    const u = t - 7 - i;
    const side = i % 2 ? 1 : -1;
    return { yaw: side * (28 * (1 - fx.outCubic(fx.seg(u, 0, 0.45))) - 8 * u), pitch: 7 - 3 * u, roll: side * -1.5 };
  }
  if (t < 13) return { yaw: 14 * Math.sin((t - 11) * 1.5), pitch: 5 + 3 * Math.sin((t - 11) * 1.1), roll: 0 };
  if (t < 17) {
    const k = fx.outCubic(fx.seg(t, 13, 13.7));
    const rev = fx.inOut(fx.seg(t, 15, 15.7));
    return { yaw: -26 * (1 - k) + 5 * Math.sin((t - 13) * 0.9) + 12 * rev, pitch: 6 - 3 * rev, roll: 0 };
  }
  if (t < 19.5) {
    const k = fx.inOut(fx.seg(t, 17, 19.5));
    return { yaw: fx.lerp(16, -14, k), pitch: fx.lerp(18, 8, k), roll: 0 };
  }
  const k = fx.outCubic(fx.seg(t, 19.5, 20.6));
  return { yaw: 7 * Math.sin((t - 19.5) * 0.8) * k + 20 * (1 - k), pitch: fx.lerp(-12, -2, k), roll: 0 };
}

function camera(t: number) {
  const cam = els.get('cam');
  if (!cam) return;
  let x = 0;
  let y = 0;
  let r = 0;
  let s = 1;
  IMPACTS.forEach(([ti, a], i) => {
    if (t < ti) return;
    const d = Math.exp(-(t - ti) * 7);
    if (d < 0.01) return;
    x += a * d * fx.wobble(t * 47, i);
    y += a * d * fx.wobble(t * 41, i + 7);
    r += a * 0.035 * d * fx.wobble(t * 33, i + 3);
  });
  for (const [ti, a] of PUNCH) if (t >= ti) s += a * Math.exp(-(t - ti) * 9);
  for (const [a, b] of SWALLOW) if (t >= a && t < b) s *= 1 + 0.3 * fx.inCubic(fx.seg(t, a, b));
  cam.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(3)}deg) scale(${(1.05 * s).toFixed(4)})`;
}

// ───────────── plan 1 et 2 : le booster, la Légendaire, le lion qui jaillit ─────────────

function packBase(t: number) {
  if (t < 0.45) {
    const k = fx.outCubic(fx.seg(t, 0, 0.45));
    return { x: 0, y: fx.lerp(-1500, YREST, k), ry: fx.lerp(40, 0, k), rz: fx.lerp(-28, -4, k), s: 1 };
  }
  const d = t - 0.45;
  const charge = fx.seg(t, 1.3, 2.0);
  return {
    x: fx.wobble(t * 60, 1) * 12 * charge,
    y: YREST + Math.sin(d * 3.2) * 10 + 34 * Math.exp(-d * 8) * Math.sin(d * 20),
    ry: Math.sin(d * 2.1) * 12,
    rz: -4 + Math.sin(d * 1.6) * 2.5 + fx.wobble(t * 55, 3) * 2.5 * charge,
    s: 1 + 0.04 * charge,
  };
}

/** position d'une carte de l'éventail (sortie du sachet à 2 s) */
function fanAt(i: number, t: number) {
  const e = fx.outBack(fx.seg(t, 2.0 + i * 0.03, 2.38 + i * 0.03), 1.4);
  const f = FAN[i];
  return { x: f.x * e, y: fx.lerp(OPEN_Y + 140, f.y, e) + Math.sin(t * 2.4 + i) * 5, rz: f.rz * e, ry: f.ry * e, z: f.z * e, s: fx.lerp(0.45, FAN_S, e) };
}

function shotBooster(t: number) {
  const b = packBase(Math.min(t, 2));
  if (t < 2) put('pk-top', { ...b, zi: 12 });
  else {
    const k = fx.outCubic(fx.seg(t, 2, 2.6));
    put('pk-top', { x: b.x + 760 * k, y: b.y - 720 * k, rz: b.rz + 80 * k, ry: b.ry, s: b.s, o: 1 - fx.seg(t, 2.35, 2.6), zi: 12 });
  }
  let by = b.y;
  let brz = b.rz;
  let bo = 1;
  if (t >= 2) {
    by += 40 * fx.outCubic(fx.seg(t, 2, 2.12)) - 18 * fx.seg(t, 2.12, 2.5);
    const f = fx.seg(t, 3.1, 3.7);
    by += 1700 * fx.inCubic(f);
    brz += 30 * f;
    bo = 1 - fx.seg(t, 3.55, 3.7);
  }
  put('pk-body', t < 3.7 ? { ...b, y: by, rz: brz, o: bo, zi: 10 } : null);
  const tear = els.get('pk-tear');
  if (tear) {
    tear.style.transform = `scaleX(${fx.seg(t, 1.35, 1.95).toFixed(3)})`;
    tear.style.opacity = t < 2.03 ? '1' : '0';
  }

  // l'éventail, puis quatre cartes qui filent vers nous en se retournant
  FLY.forEach((c, j) => {
    const k = `fly${j}`;
    if (t < 2.0) return put(k, null);
    const f = fanAt(c.fan, t);
    const T = 2.55 + 0.17 * j;
    const p = fx.seg(t, T, T + 0.55);
    if (p >= 1) return put(k, null);
    put(k, {
      x: f.x + c.tx * Math.pow(p, 1.7),
      y: f.y + c.ty * Math.pow(p, 1.9),
      s: f.s + 3 * Math.pow(p, 2.2),
      z: f.z + 500 * p,
      rz: f.rz + c.spin * p,
      rx: 40 * p,
      ry: 180 + f.ry + 260 * fx.outCubic(p),
      zi: t < 2.1 ? 8 : 14 + j,
      blur: p > 0.45 ? (p - 0.45) * 14 : 0,
    });
  });

  // la carte du milieu : face cachée, puis retournée… Légendaire
  const HY = -110;
  const heroScale = (FAN_S * 300) / 520;
  if (t < 2.0 || t >= 7.0) put('hero', null);
  else if (t < 4.0) {
    const f = fanAt(2, t);
    const k = fx.inOut(fx.seg(t, 3.2, 3.8));
    const squash = fx.seg(t, 3.85, 4.0);
    put('hero', { x: f.x, y: fx.lerp(f.y, HY, k), z: 120 * k, s: fx.lerp(heroScale * (f.s / FAN_S), 1, k) * (1 - 0.06 * squash), ry: 180 + f.ry * (1 - k) + Math.sin((t - 2) * 2.6) * 22 * k, rx: Math.sin((t - 2) * 2.1) * 12 * k, rz: f.rz * (1 - k), zi: t < 2.1 ? 9 : 13 });
  } else if (t < 5.0) {
    const f = fx.seg(t, 4.0, 4.34);
    const ry = t < 4.34 ? 180 * (1 - fx.outBack(f, 1.3)) : Math.sin((t - 4.34) * 3) * 9;
    put('hero', { y: HY, z: 120, s: 0.94 + 0.06 * fx.outBack(f) + 0.015 * Math.sin((t - 4) * 4), ry, rx: Math.sin(t * 2.3) * 6, zi: 15 });
    glare('hero', t < 4.7 ? fx.lerp(-30, 130, fx.seg(t, 4.05, 4.7)) : 50 + ry * 3);
  } else {
    const k = fx.outCubic(fx.seg(t, 5.0, 5.35));
    const out = fx.seg(t, 6.7, 7.0);
    put('hero', { y: fx.lerp(HY, 330, k) + 900 * fx.inCubic(out), z: fx.lerp(120, -60, k), rx: 64 * k, s: fx.lerp(1, 0.85, k), ry: Math.sin(t * 2) * 4, zi: 15 });
    glare('hero', 50 + Math.sin(t * 2) * 25);
  }

  // le lion sort de sa carte
  if (t < 5.0 || t >= 7.0) put('cut-lion', null);
  else {
    const k = fx.seg(t, 5.0, 5.42);
    const s = (t < 5.42 ? fx.lerp(0.95, 2.15, fx.outBack(k, 1.5)) : 2.15 + 0.14 * fx.seg(t, 5.42, 7.0)) * (1 + 0.4 * fx.inCubic(fx.seg(t, 6.8, 7.0)));
    put('cut-lion', { x: fx.lerp(0, -20, k), y: fx.lerp(-130, -330, fx.outCubic(k)) + fx.wobble(t * 1.4, 2) * 8, z: fx.lerp(-60, 140, fx.outCubic(k)), s, rz: fx.wobble(t * 0.9, 4) * 1.5, ry: fx.wobble(t * 0.7, 5) * 6, o: fx.seg(t, 5.0, 5.07), zi: 30 });
  }

  slide('tx-pov1', t, 0.1, 0, -830, { out: 1.95 });
  slam('tx-pov2', t, 0.3, 0, -650, { out: 1.95 });
  slam('tx-legend', t, 4.1, 0, 400, { out: 4.92, from: 2.6 });
  pop('tag-new', t, 4.4, 0, 540, { out: 4.92, rz: -3 });
  slam('tx-lion', t, 5.1, 0, -480, { from: 1.7, drift: 0.04, zi: 6, rz: -4, z: -260 });
  pop('tag-lion', t, 5.45, 0, 620);
}

const FX_PACK: [string, string][] = [
  [HONEY, '#fff3cf'],
  [LICHEN, '#f0ffd8'],
  ['#ffb38a', '#fff0cf'],
];
const FX_LION: [string, string][] = [
  ['#ffb347', '#fff3d0'],
  [CORAL, '#ffe0d0'],
  ['#ffd66b', '#ffffff'],
];

function bgBooster(c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, t: number) {
  const charge = fx.seg(t, 1.2, 2.0);
  const packY = 960 + YREST;
  const openY = 960 + OPEN_Y;
  if (t < 4.0) {
    fx.glow(c, 540, packY, 760, '#ffd9a0', 0.25 + 0.45 * charge);
    fx.rays(c, 540, packY - 120, 14, t * 0.25, '#fff0cf', 0.04 + 0.1 * charge);
    fx.stream(c, t, { seed: 3, n: 46, kind: 'ember', colors: FIREFLY, vx: 10, vy: -40, size: 5, sway: 30, alpha: 0.85 });
    if (t < 2.0) fx.speedLines(c, 540, packY - 120, Math.floor(t * 15), 70, 470, 0.35 * charge, CREAM);
    // la lumière s'enroule autour du sachet
    if (t > 0.4 && t < 2.1)
      FX_PACK.forEach((colors, i) => {
        const path = fx.helix(540, packY + 40, 330, 85, { turns: 2, rise: 760, tilt: -0.15, phase: i * 2.1, grow: 0.3 });
        fx.ribbon(c, f, path, fx.seg(t, 0.5 + i * 0.15, 2.0 + i * 0.05) * 1.55, { colors, width: [54, 40, 32][i], len: 0.55 });
      });
    if (t >= 2.0) {
      // le faisceau qui sort du sachet ouvert
      const a = Math.max(Math.exp(-(t - 2) * 3.2), fx.seg(t, 2.9, 3.9) * 0.8);
      const w = 140 + 240 * a;
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(0, openY, 0, 0);
      g.addColorStop(0, `rgba(255,240,207,${0.85 * a})`);
      g.addColorStop(1, 'rgba(255,211,107,0)');
      c.fillStyle = g;
      c.fillRect(540 - w / 2, 0, w, openY);
      c.restore();
      fx.glow(c, 540, openY, 520, '#fff0cf', a * 0.8);
    }
    fx.ring(f, 540, packY, t, 0.45, 0.5, 600, '#fff0cf', 26);
    fx.ring(f, 540, openY, t, 2.0, 0.6, 950, CREAM, 44);
    fx.burst(f, t, 2.0, { seed: 11, n: 60, x: 540, y: openY, speed: 2200, gravity: 700, life: 1.1, size: 15, kind: 'spark', colors: [CREAM, HONEY, LICHEN] });
    fx.burst(f, t, 2.0, { seed: 13, n: 26, x: 540, y: openY, speed: 1600, gravity: 900, life: 1.4, size: 16, kind: 'leaf', colors: ['#7d9a6a', LICHEN, '#c9e29a'] });
    fx.glow(c, 540, 850, 700, '#ffe7bd', fx.seg(t, 3.0, 4.0) * 0.7);
  }
  // la Légendaire : nuit d'or, rayons et constellations
  if (t >= 4.0 && t < 5.0) {
    fx.glow(c, 540, 850, 900, '#ffd46e', 0.55);
    fx.rays(c, 540, 850, 18, t * 0.6, '#ffe7a8', 0.3);
    fx.stream(c, t, { seed: 5, n: 50, kind: 'spark', colors: [CREAM, HONEY], vx: 0, vy: -80, size: 12 });
  }
  fx.ring(f, 540, 850, t, 4.0, 0.7, 1000, HONEY, 44);
  fx.burst(f, t, 4.0, { seed: 21, n: 130, x: 540, y: 820, speed: 2400, gravity: 1300, life: 2.0, size: 13, kind: 'confetti', colors: [HONEY, CORAL, LICHEN, CREAM, MINT], drag: 2.2 });
  fx.burst(f, t, 4.0, { seed: 22, n: 36, x: 540, y: 820, speed: 1800, gravity: 0, life: 1.0, size: 22, kind: 'spark', colors: [CREAM, HONEY] });
  // la savane au soleil couchant, autour du lion
  if (t >= 5.0) {
    fx.glow(c, 540, 640, 900, '#ffd66b', 0.45 * Math.exp(-(t - 5) * 1.5) + 0.2);
    fx.rays(c, 540, 600, 16, -t * 0.35, '#fff0cf', 0.12);
    fx.speedLines(c, 540, 620, Math.floor(t * 15), 80, 420, 0.4 * Math.exp(-(t - 5) * 2.5), CREAM);
    fx.stream(c, t, { seed: 7, n: 60, kind: 'ember', colors: FIREFLY, vx: 30, vy: -260, size: 5, sway: 30 });
    FX_LION.forEach((colors, i) => {
      const w = [96, 72, 54][i];
      const p1 = fx.helix(540, 680, 520, 150, { turns: 1.5, rise: 820, tilt: -0.22, phase: i * 2.1, grow: 0.3 });
      fx.ribbon(c, f, p1, fx.seg(t, 5.02 + i * 0.1, 6.1 + i * 0.1) * 1.6, { colors, width: w, len: 0.6 });
      const p2 = fx.helix(540, 640, 560, 160, { turns: 1.4, rise: -760, tilt: 0.18, phase: 1 + i * 2.1, grow: 0.3 });
      fx.ribbon(c, f, p2, fx.seg(t, 5.85 + i * 0.1, 7.0 + i * 0.05) * 1.6, { colors, width: w * 0.85, len: 0.6 });
    });
    fx.ring(f, 540, 640, t, 5.0, 0.55, 1000, '#fff3cf', 40);
    fx.burst(f, t, 5.0, { seed: 31, n: 50, x: 540, y: 640, speed: 2400, gravity: 0, life: 0.8, size: 5, kind: 'streak', colors: [CREAM, HONEY] });
  }
}

// ───────────── plan 3 : le montage des 500 animaux ─────────────

const THEMES: Record<Theme, { ribbons: [string, string][]; draw: (c: CanvasRenderingContext2D, t: number) => void }> = {
  recif: {
    ribbons: [
      ['#bff7ee', '#ffffff'],
      ['#3fd0bd', '#e8fff9'],
      ['#ffd166', '#fff6d8'],
    ],
    draw: (c, t) => {
      fx.rays(c, 540, -200, 10, Math.sin(t) * 0.1 + 1.2, '#e8fff9', 0.14, 0.35);
      fx.stream(c, t, { seed: 41, n: 40, kind: 'bubble', colors: ['rgba(232,255,249,0.9)', '#bff7ee'], vx: 0, vy: -360, size: 15, sway: 20 });
    },
  },
  jungle: {
    ribbons: [
      ['#ffd8a8', '#fff3dc'],
      ['#62b08b', '#e8ffd0'],
      ['#ff8aa1', '#ffe4ec'],
    ],
    draw: (c, t) => {
      fx.rays(c, 540, 600, 12, t * 0.4, '#fff3dc', 0.1);
      fx.stream(c, t, { seed: 42, n: 30, kind: 'leaf', colors: ['#62b08b', '#2f7a55', '#a9cf7e'], vx: 120, vy: 240, size: 24, sway: 40 });
      fx.stream(c, t, { seed: 45, n: 26, kind: 'ember', colors: FIREFLY, vx: 0, vy: -60, size: 5, sway: 30 });
    },
  },
  foret: {
    ribbons: [
      ['#fde3ae', '#fff3d0'],
      ['#ee8c4c', '#ffd6a0'],
      [LICHEN, '#f0ffd8'],
    ],
    draw: (c, t) => {
      fx.rays(c, 540, 600, 12, -t * 0.4, '#fff3d0', 0.12);
      fx.stream(c, t, { seed: 43, n: 30, kind: 'leaf', colors: ['#d98b5f', '#ee8c4c', '#a9cf7e'], vx: 70, vy: 220, size: 20, sway: 50 });
      fx.stream(c, t, { seed: 46, n: 26, kind: 'ember', colors: FIREFLY, vx: 0, vy: -60, size: 5, sway: 30 });
    },
  },
  neige: {
    ribbons: [
      ['#ffffff', '#d5ecff'],
      ['#9ebde6', '#ffffff'],
      ['#4f9fe0', '#d5ecff'],
    ],
    draw: (c, t) => {
      fx.rays(c, 540, 600, 12, t * 0.3, '#ffffff', 0.12);
      fx.stream(c, t, { seed: 44, n: 100, kind: 'snow', colors: ['#ffffff', '#e8f4ff'], vx: -90, vy: 320, size: 7, sway: 14 });
    },
  },
};

function montageIndex(t: number) {
  return Math.max(0, Math.min(3, Math.floor(t - 7)));
}

function shotMontage(t: number) {
  const n = Math.round(fx.lerp(120, 500, fx.outCubic(fx.seg(t, 7.05, 7.75))));
  setLines('m-500', [`Plus de ${n}`, 'vrais animaux']);
  slide('m-eye', t, 7.02, 0, -860);
  slam('m-500', t, 7.05, 0, -680, { drift: 0.015 });
  const active = montageIndex(t);
  MONT.forEach((m, i) => {
    if (i !== active || t < 7 || t >= 11) {
      put(`m-card${i}`, null);
      put(`m-cut${i}`, null);
      put(`m-name${i}`, null);
      put(`m-tag${i}`, null);
      return;
    }
    const S = 7 + i;
    const u = t - S;
    const side = i % 2 ? 1 : -1;
    const e = fx.outCubic(fx.seg(u, 0, 0.2));
    const cx = side * 140;
    const cy = 470;
    put(`m-card${i}`, { x: cx, y: fx.lerp(1400, cy, e) - 30 * u, z: -40, rx: 34, ry: side * -18, rz: side * fx.lerp(30, 9, e), zi: 20 });
    glare(`m-card${i}`, 50 + Math.sin(u * 4) * 40);
    const k = fx.seg(u, 0.1, 0.42);
    const ok = fx.outCubic(k);
    put(`m-cut${i}`, {
      x: fx.lerp(cx + m.from[0] * 0.2, m.to[0], ok) + m.drift * u,
      y: fx.lerp(cy - 60 + m.from[1] * 0.2, m.to[1], ok) - 20 * u,
      s: fx.lerp(0.7, m.s, fx.outBack(k, 1.5)) * (1 + 0.06 * u),
      z: fx.lerp(-40, 150, ok),
      rz: fx.lerp(m.rz[0], m.rz[1], ok),
      ry: side * 10 * Math.sin(u * 3),
      o: fx.seg(u, 0.1, 0.16),
      zi: 30,
    });
    slam(`m-name${i}`, t, S + 0.16, 0, m.name.length > 1 ? 230 : 200, { from: 2.0, drift: 0.03, zi: 60, rz: -3, z: 220 });
    pop(`m-tag${i}`, t, S + 0.32, 0, -480, { zi: 70 });
  });
}

function bgMontage(c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, t: number) {
  const i = montageIndex(t);
  const m = MONT[i];
  const th = THEMES[m.theme];
  const u = t - (7 + i);
  th.draw(c, t);
  const ax = 540 + m.to[0];
  const ay = 960 + m.to[1];
  fx.glow(c, ax, ay, 700, th.ribbons[0][1], 0.35);
  fx.speedLines(c, ax, ay, Math.floor(t * 15), 70, 430, 0.4 * Math.exp(-u * 4) + 0.05, CREAM);
  th.ribbons.forEach((colors, j) => {
    const path = fx.helix(ax, ay + 40, 500, 140, { turns: 1.4, rise: 700, tilt: j % 2 ? 0.2 : -0.2, phase: j * 2.1 + i, grow: 0.3 });
    fx.ribbon(c, f, path, fx.seg(u, 0.12 + j * 0.08, 0.98) * 1.6, { colors, width: [84, 64, 48][j], len: 0.6 });
  });
  fx.ring(f, ax, ay, t, 7 + i + 0.12, 0.45, 900, th.ribbons[0][1], 36);
  fx.burst(f, t, 7 + i + 0.1, { seed: 50 + i, n: 32, x: ax, y: ay, speed: 2000, gravity: 0, life: 0.7, size: 13, kind: 'spark', colors: [CREAM, th.ribbons[0][0]] });
}

// ───────────── plan 4 : les ultra-rares ─────────────

function shotRares(t: number) {
  const out = fx.seg(t, 12.85, 13.0);
  RARES.forEach((r, i) => {
    if (t < r.t0) return put(r.k, null);
    const k = fx.seg(t, r.t0, r.t0 + (i === 2 ? 0.42 : 0.32));
    const float = Math.sin(t * 2 + i) * 8;
    if (i === 2) {
      put(r.k, { x: 0, y: r.y + float, z: fx.lerp(-1800, 120, fx.outCubic(k)), s: 1 + 0.3 * out, ry: fx.lerp(720, 0, fx.outCubic(k)) + Math.sin((t - 11) * 2.5) * 10, rx: Math.sin((t - 11) * 1.7) * 6, zi: 16 });
      glare(r.k, ((t - 11.3) * 110) % 170 - 35);
    } else {
      const side = i === 0 ? -1 : 1;
      put(r.k, { x: fx.lerp(side * 1150, r.x, fx.outBack(k, 1.2)) + side * 200 * out, y: r.y + float, z: -90, rz: r.rz, ry: fx.lerp(side * -160, r.ry * 1.4, fx.outCubic(k)) + Math.sin(t * 2.4 + i) * 8, s: 1 + 0.3 * out, zi: 14 });
      glare(r.k, ((t - r.t0) * 120) % 170 - 35);
    }
    pop(`${r.k}-l`, t, r.t0 + 0.28, r.x, 350, { out: 12.85, zi: 70, rz: -3 });
  });
  slide('r-eye', t, 11.02, 0, -870, { out: 12.85 });
  slam('r-title', t, 11.05, 0, -690, { out: 12.85, outDur: 0.15 });
  pop('r-chip', t, 12.45, 0, 520, { out: 12.85 });
}

function bgRares(c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, t: number) {
  fx.glow(c, 540, 870, 900, '#c86bff', 0.25);
  fx.glow(c, 540, 870, 600, '#4ff0b0', 0.2);
  fx.rays(c, 540, 870, 16, t * 0.5, '#f3efff', 0.1);
  fx.stream(c, t, { seed: 61, n: 70, kind: 'spark', colors: ['#ffffff', '#f3efff', HONEY], vx: 0, vy: -60, size: 12 });
  fx.ribbon(c, f, fx.bezier([-200, 1600], [300, 500], [800, 1500], [1300, 300], -1), fx.seg(t, 11.0, 11.9) * 1.6, { colors: ['#4ff0b0', '#e8fff6'], width: 96, len: 0.6 });
  fx.ribbon(c, f, fx.bezier([1300, 1750], [700, 900], [300, 1500], [-200, 500], -1), fx.seg(t, 11.45, 12.4) * 1.6, { colors: ['#c86bff', '#f3efff'], width: 84, len: 0.6 });
  fx.ribbon(c, f, fx.bezier([-200, 300], [400, 900], [700, 200], [1300, 1100], 1), fx.seg(t, 12.0, 12.8) * 1.6, { colors: [HONEY, '#fff3cf'], width: 54, len: 0.5 });
  fx.ring(f, 540, 870, t, 11.0, 0.6, 900, HONEY, 36);
  fx.burst(f, t, 11.05, { seed: 62, n: 56, x: 540, y: 870, speed: 1900, gravity: 400, life: 1.2, size: 15, kind: 'spark', colors: [CREAM, HONEY, '#4ff0b0'] });
}

// ───────────── plan 5 : le duel de records (culture générale) ─────────────
// Comme dans le jeu : une question (« Le plus lourd »), chaque joueur envoie un animal sans voir ses mesures,
// puis on révèle les vraies mesures. Tigre 220 kg contre lion 190 kg (data/mesures.ts) : le tigre gagne.

function shotDuel(t: number) {
  const away = fx.inCubic(fx.seg(t, 16.75, 17.0));
  slide('d-eye', t, 13.02, 0, -880, { out: 16.75 });
  slam('d-q', t, 13.12, 0, -610, { from: 2.0, out: 16.75, outDur: 0.2, rz: -1, drift: 0.008 });
  const before = t < 15.35;
  const qa = els.get('d-qa');
  const qb = els.get('d-qb');
  if (qa) qa.style.display = before ? '' : 'none';
  if (qb) qb.style.display = before ? 'none' : '';
  const reveal = fx.seg(t, 15.0, 15.6);
  const ein = (a: number) => fx.outBack(fx.seg(t, a, a + 0.42), 1.2);
  const me = ein(13.35);
  const op = ein(13.5);
  // ton animal (le tigre) gagne : il bondit vers nous en faisant un tour ; celui de l'adversaire recule
  put('d-c-me', t < 13.35 ? null : { x: fx.lerp(-1300, -255, me) - 1300 * away, y: 30 + Math.sin(t * 2) * 8 - 40 * fx.outBack(reveal), z: fx.lerp(-700, 0, me) + 220 * fx.outCubic(reveal), ry: fx.lerp(130, 22, me) - 360 * fx.inOut(reveal) + Math.sin(t * 1.7) * 4, rz: -3, zi: 20 });
  put('d-c-op', t < 13.5 ? null : { x: fx.lerp(1300, 255, op) + 1300 * away, y: 30 + Math.sin(t * 2 + 1) * 8 + 30 * reveal, z: fx.lerp(-700, 0, op) - 260 * fx.outCubic(reveal), rx: 22 * fx.outCubic(reveal), ry: fx.lerp(-130, -22, op) + Math.sin(t * 1.7 + 1) * 4, rz: 3, zi: 18 });
  shade('d-c-op', 0.5 * fx.seg(t, 15.1, 15.5));
  glare('d-c-me', 50 + Math.sin(t * 3) * 40);
  glare('d-c-op', 50 - Math.sin(t * 3) * 40);
  pop('d-me', t, 13.62, -255, -300, { out: 15.05, zi: 70 });
  pop('d-op', t, 13.72, 255, -300, { out: 16.75, zi: 70 });
  pop('d-win', t, 15.15, -255, -320, { out: 16.75, zi: 75, rz: -4 });
  // les mesures, cachées puis retournées
  (
    [
      ['d-m-me', -255, 13.85],
      ['d-m-op', 255, 13.95],
    ] as [string, number, number][]
  ).forEach(([k, x, t0]) => {
    if (t < t0 || t >= 16.95) return put(k, null);
    const kk = fx.seg(t, t0, t0 + 0.3);
    const flip = fx.seg(t, 15.0, 15.35);
    const pulse = t < 15 ? 1 + 0.035 * Math.sin(t * 9) : 1;
    put(k, { x: x + Math.sign(x) * 1300 * away, y: 400, z: 110, s: fx.lerp(0.4, 1, fx.outBack(kk, 2)) * pulse * (1 + 0.15 * Math.sin(Math.PI * flip)), rx: 180 * fx.outBack(flip, 1.2), o: fx.seg(t, t0, t0 + 0.06), zi: 70 });
  });
  pop('d-foot', t, 15.6, 0, 630, { out: 16.75 });
}

function bgDuel(c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, t: number) {
  const rev = fx.seg(t, 15.0, 15.5);
  fx.glow(c, 285, 990, 700, MINT, 0.12 + 0.35 * rev);
  fx.glow(c, 795, 990, 700, CORAL, 0.25 * (1 - rev));
  fx.stream(c, t, { seed: 71, n: 50, kind: 'ember', colors: ['#ffd7a0', '#ffb347', CREAM], vx: 20, vy: -220, size: 6, sway: 20 });
  if (t >= 15.0) {
    fx.speedLines(c, 285, 990, Math.floor(t * 15), 60, 380, 0.45 * Math.exp(-(t - 15) * 3), CREAM);
    const cols: [string, string][] = [
      [MINT, '#ffffff'],
      [HONEY, '#fff3cf'],
    ];
    cols.forEach((colors, j) => {
      const path = fx.helix(285, 1000, 330, 95, { turns: 1.6, rise: 560, tilt: j ? 0.25 : -0.25, phase: j * 2.4 });
      fx.ribbon(c, f, path, fx.seg(t, 15.0 + j * 0.1, 16.1 + j * 0.1) * 1.55, { colors, width: j ? 50 : 70, len: 0.55 });
    });
  }
  fx.ring(f, 285, 990, t, 15.0, 0.6, 800, MINT, 40);
  fx.burst(f, t, 15.05, { seed: 77, n: 90, x: 285, y: 900, speed: 2000, gravity: 1300, life: 1.6, size: 12, kind: 'confetti', colors: [MINT, HONEY, CREAM, LICHEN] });
}

// ───────────── plan 6 : la réserve et les expéditions ─────────────

function shotReserve(t: number) {
  const k = fx.seg(t, 17.0, 17.38);
  put('e-panel', t < 17.0 ? null : { y: fx.lerp(1500, -215, fx.outBack(k, 1.2)), z: fx.lerp(-900, 0, fx.outCubic(k)), rx: fx.lerp(70, 30, fx.outCubic(k)), rz: -3 + Math.sin(t * 1.5) * 0.8, s: 1 + 0.02 * (t - 17), zi: 20 });
  const pan = els.get('e-pan');
  if (pan) pan.style.transform = `translateY(${(-Math.max(0, PANEL_CANVAS_H - PANEL_H) * fx.inOut(fx.seg(t, 17.3, 19.4))).toFixed(1)}px)`;
  slide('e-eye', t, 17.02, 0, -885);
  slam('e-title', t, 17.08, 0, -730, { drift: 0.015 });
  slam('e-sub', t, 18.0, 0, 235, { drift: 0.015 });
  const kt = fx.seg(t, 18.05, 18.35);
  put('e-trail', t < 18.05 ? null : { x: fx.lerp(1300, 0, fx.outBack(kt, 1.2)), y: 410, z: 80, ry: fx.lerp(-70, -8, fx.outCubic(kt)), rx: -6, rz: 2, zi: 22 });
  for (let i = 0; i < 3; i++) pop(`e-g${i}`, t, 18.45 + i * 0.2, -320 + i * 320, 610, { zi: 70, rz: [-4, 2, -2][i] });
}

function bgReserve(c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, t: number) {
  fx.glow(c, 540, 760, 900, '#ffe7bd', 0.3);
  fx.rays(c, 540, 700, 14, t * 0.3, '#fff0cf', 0.1);
  fx.stream(c, t, { seed: 81, n: 26, kind: 'leaf', colors: ['#7d9a6a', LICHEN, '#c9e29a'], vx: 100, vy: 220, size: 20, sway: 40 });
  fx.stream(c, t, { seed: 82, n: 40, kind: 'ember', colors: FIREFLY, vx: 0, vy: -50, size: 5, sway: 30 });
  fx.ribbon(c, f, fx.bezier([-150, 1350], [300, 600], [700, 1100], [1250, 250], -1), fx.seg(t, 17.05, 17.9) * 1.6, { colors: [LICHEN, '#fff0cf'], width: 90, len: 0.6 });
  fx.ribbon(c, f, fx.bezier([1250, 1500], [700, 800], [300, 1300], [-150, 600], -1), fx.seg(t, 17.3, 18.3) * 1.6, { colors: ['#ff8fb1', '#ffe4ec'], width: 70, len: 0.6 });
  for (let i = 0; i < 3; i++) fx.burst(f, t, 18.47 + i * 0.2, { seed: 90 + i, n: 24, x: 220 + i * 320, y: 1570, speed: 1200, gravity: 900, life: 0.8, size: 13, kind: 'spark', colors: [CREAM, HONEY, LICHEN] });
}

// ───────────── plan 7 : à toi de jouer ─────────────

function shotFinale(t: number) {
  const k = fx.seg(t, 19.55, 20.25);
  const R = 430 * fx.outBack(k, 1.3);
  const spin = -(t - 19.5) * 38 - 300 * (1 - fx.outCubic(fx.seg(t, 19.5, 20.7)));
  put('f-ring', t < 19.5 ? null : { y: -110, rx: -13, ry: spin, rz: 3, s: fx.lerp(0.3, 1, fx.outCubic(k)), zi: 20 });
  els.get('f-ring')?.querySelectorAll<HTMLElement>('.tr-slot').forEach((slot, i) => {
    slot.style.transform = `rotateY(${i * (360 / RING.length)}deg) translateZ(${R.toFixed(1)}px)`;
  });
  glare('f-ring', 50 + Math.sin(t * 2.5) * 45);
  slam('f-logo', t, 19.62, 0, -730, { from: 2.4, rz: 0, drift: 0.012, z: 140 });
  slide('f-tag', t, 20.0, 0, -585);
  const cta = fx.seg(t, 20.8, 21.1);
  put('f-cta', t < 20.8 ? null : { y: 270, z: 130, rx: fx.lerp(-80, 0, fx.outBack(cta, 1.5)), s: fx.lerp(0.5, 1, fx.outBack(cta, 2.2)) * (1 + 0.04 * Math.max(0, Math.sin((t - 21.1) * 7))), o: fx.seg(t, 20.8, 20.86), zi: 80 });
  slam('f-url', t, 21.2, 0, 425, { from: 2.0, drift: 0.008, rz: -2 });
  pop('f-sub', t, 21.6, 0, 515);
  slam('f-q', t, 22.3, 0, 645, { from: 2.0, drift: 0.012, rz: -2 });
}

function bgFinale(c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, t: number) {
  fx.glow(c, 540, 860, 700, '#ffe7bd', 0.14);
  fx.rays(c, 540, 850, 16, t * 0.3, '#fff0cf', 0.06);
  fx.stream(c, t, { seed: 101, n: 60, kind: 'ember', colors: FIREFLY, vx: 0, vy: -60, size: 5, sway: 30 });
  fx.stream(c, t, { seed: 102, n: 30, kind: 'spark', colors: [CREAM, HONEY], vx: 0, vy: -40, size: 11 });
  const cols: [string, string][] = [
    [HONEY, '#fff3cf'],
    [LICHEN, '#f0ffd8'],
    ['#f4a06a', '#ffe7bd'],
  ];
  cols.forEach((colors, i) => {
    const path = fx.helix(540, 860, 600, 165, { turns: 1, tilt: -0.1, phase: i * 2.1 + 1.6 });
    const head = ((((t - 19.5) * 0.6 + i / 3) % 1) + 1) % 1;
    fx.ribbon(c, f, path, head * 1.55, { colors, width: [70, 54, 42][i], len: 0.55 });
  });
  fx.ring(f, 540, 230, t, 19.62, 0.6, 900, '#fff3cf', 36);
  fx.burst(f, t, 19.62, { seed: 111, n: 60, x: 540, y: 230, speed: 2000, gravity: 800, life: 1.4, size: 13, kind: 'confetti', colors: [HONEY, CORAL, LICHEN, CREAM, MINT] });
  fx.burst(f, t, 20.8, { seed: 112, n: 36, x: 540, y: 1230, speed: 1400, gravity: 600, life: 1.0, size: 15, kind: 'spark', colors: [CREAM, MINT] });
}

// ───────────── la page ─────────────

const SHOTS: { k: string; a: number; b: number; draw: (c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, t: number) => void; run: (t: number) => void }[] = [
  { k: 'shot-a', a: 0, b: 7.0, draw: bgBooster, run: shotBooster },
  { k: 'shot-b', a: 7.0, b: 11.0, draw: bgMontage, run: shotMontage },
  { k: 'shot-c', a: 11.0, b: 13.0, draw: bgRares, run: shotRares },
  { k: 'shot-d', a: 13.0, b: 17.0, draw: bgDuel, run: shotDuel },
  { k: 'shot-e', a: 17.0, b: 19.5, draw: bgReserve, run: shotReserve },
  { k: 'shot-f', a: 19.5, b: DURATION + 1, draw: bgFinale, run: shotFinale },
];

let bg: CanvasRenderingContext2D | null = null;
let fg: CanvasRenderingContext2D | null = null;

function frame(t: number) {
  for (const img of document.images) if (img.decoding !== 'sync') img.decoding = 'sync';
  // les animations CSS des cartes (reflets, voiles) suivent le même temps
  for (const a of document.getAnimations()) {
    a.pause();
    a.currentTime = t * 1000;
  }
  CAM = camAngles(t);
  camera(t);
  lands(t);
  bg?.clearRect(0, 0, fx.W, fx.H);
  fg?.clearRect(0, 0, fx.W, fx.H);
  // l'ombre des affiches du jeu, en haut et en bas, pour que les titres se lisent
  if (bg) {
    fx.linear(bg, 0, 0, 0, fx.H, [
      [0, 'rgba(8,14,11,0.62)'],
      [0.24, 'rgba(8,14,11,0)'],
      [0.7, 'rgba(8,14,11,0)'],
      [1, 'rgba(8,14,11,0.6)'],
    ]);
  }
  for (const s of SHOTS) {
    const on = t >= s.a && t < s.b;
    const el = els.get(s.k);
    if (el) el.style.display = on ? '' : 'none';
    if (!on) continue;
    s.run(t);
    if (bg && fg) s.draw(bg, fg, t);
  }
  if (fg) {
    for (const [ti, a, d, col] of FLASHES) if (t >= ti && t < ti + d) fx.flash(fg, a * (1 - (t - ti) / d), col);
    const g = fg.createRadialGradient(540, 960, 560, 540, 960, 1450);
    g.addColorStop(0, 'rgba(8,14,11,0)');
    g.addColorStop(1, 'rgba(8,14,11,0.55)');
    fg.fillStyle = g;
    fg.fillRect(0, 0, fx.W, fx.H);
  }
  for (const draw of draws) draw(t);
}

function Trailer() {
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    bg = back.current!.getContext('2d');
    fg = front.current!.getContext('2d');
    // les photos des cartes se chargent tout de suite, même celles des plans encore masqués
    document.querySelectorAll('img').forEach((img) => (img.loading = 'eager'));
    frame(0);
  }, []);
  const packArt = <PackArt tone="bronze" name="Booster gratuit" title="Animaux du monde" size={5} />;
  return (
    <div className="tr">
      <div className="tr-cam" ref={reg('cam')}>
        {LANDS.map((l, i) => (
          <div key={i} className="tr-land" ref={reg(`land${i}`)}>
            <Landscape scene={l.scene} seed={`bande-annonce-${i}`} maxWidth={1080} />
          </div>
        ))}
        <canvas className="tr-cv" ref={back} width={fx.W} height={fx.H} style={{ zIndex: 0 }} />

        <section className="tr-shot" ref={reg('shot-a')}>
          <Ob k="pk-body">
            <div style={{ width: PW, position: 'relative' }}>
              <div style={{ clipPath: 'inset(16% -10% -10% -10%)' }}>{packArt}</div>
              <div className="tr-tear" ref={reg('pk-tear')} />
            </div>
          </Ob>
          <Ob k="pk-top">
            <div style={{ width: PW, clipPath: 'inset(-10% -10% 84% -10%)' }}>{packArt}</div>
          </Ob>
          {FLY.map((c, i) => (
            <Ob key={i} k={`fly${i}`}>
              <Flip card={c.card} w={300} />
            </Ob>
          ))}
          <Ob k="hero">
            <Flip card={face('lion')} w={520} />
          </Ob>
          <Cut k="cut-lion" id="lion" aura="rgba(255,231,189,0.85)" />
          <Eyebrow k="tx-pov1" text="POV" />
          <Slam k="tx-pov2" lines={['Tu ouvres', 'un booster…']} size={124} />
          <Slam k="tx-legend" lines={['Légendaire !']} size={150} fill={`linear-gradient(180deg, ${CREAM} 0%, #ffd0c2 45%, ${CORAL} 100%)`} />
          <Tag k="tag-new" text="Nouveau" bg="#8fd47e" ink="#00210f" />
          <Slam k="tx-lion" lines={['LION']} size={400} fill={GOLD} sw={0.06} z={6} />
          <Tag k="tag-lion" text="Légendaire · Savane" bg={CORAL} />
        </section>

        <section className="tr-shot" ref={reg('shot-b')}>
          <Eyebrow k="m-eye" text="Série 1 · Animaux du monde" />
          <Slam k="m-500" lines={['Plus de 500', 'vrais animaux']} size={112} />
          {MONT.map((m, i) => (
            <div key={m.id}>
              <Ob k={`m-card${i}`}>
                <Flip card={face(m.id)} w={360} />
              </Ob>
              <Cut k={`m-cut${i}`} id={m.id} aura={m.aura} />
              <Slam k={`m-name${i}`} lines={m.name} size={m.name.length > 1 ? 128 : Math.min(190, Math.round(1500 / m.name[0].length))} />
              <Tag k={`m-tag${i}`} text={m.tag} bg={m.tagBg} />
            </div>
          ))}
        </section>

        <section className="tr-shot" ref={reg('shot-c')}>
          {RARES.map((r) => (
            <div key={r.k}>
              <Ob k={r.k}>
                <Flip card={r.card} w={r.w} />
              </Ob>
              <Tag k={`${r.k}-l`} text={r.label} bg={r.bg} ink={r.ink} size={46} />
            </div>
          ))}
          <Eyebrow k="r-eye" text="Les plus rares" />
          <Slam k="r-title" lines={['Des cartes', 'ultra-rares']} size={120} />
          <Ob k="r-chip" z={70}>
            <span className="tr-chip">
              <b>Icône</b> : 1 chance sur 1 000
            </span>
          </Ob>
        </section>

        <section className="tr-shot" ref={reg('shot-d')}>
          <Eyebrow k="d-eye" text="Duel de records" />
          <Ob k="d-q" z={70}>
            <div className="tr-panel-ui">
              <div className="tr-panel-kicker">Question 1 sur 5</div>
              <div className="tr-panel-title">Le plus lourd ?</div>
              <div className="tr-panel-text" ref={reg('d-qa')}>
                Lion ou tigre ?
              </div>
              <div className="tr-panel-text tr-panel-text--hot" ref={reg('d-qb')}>
                Tu le savais ? Dis-le en commentaire
              </div>
            </div>
          </Ob>
          <Ob k="d-c-me">
            <Flip card={face('tigre')} w={380} />
          </Ob>
          <Ob k="d-c-op">
            <Flip card={face('lion')} w={380} />
          </Ob>
          <Tag k="d-me" text="Toi" bg={MINT} ink="#0c3b35" />
          <Tag k="d-op" text="Adversaire" bg={CORAL} />
          <Tag k="d-win" text="Gagné !" bg="#8fd47e" ink="#00210f" size={46} />
          <Ob k="d-m-me" z={70}>
            <div className="tr-flipchip">
              <span className="tr-chip">? kg</span>
              <span className="tr-chip tr-flipchip-back">
                <b>220 kg</b>
              </span>
            </div>
          </Ob>
          <Ob k="d-m-op" z={70}>
            <div className="tr-flipchip">
              <span className="tr-chip">? kg</span>
              <span className="tr-chip tr-flipchip-back">190 kg</span>
            </div>
          </Ob>
          <Ob k="d-foot" z={70}>
            <span className="tr-chip">5 questions de culture générale</span>
          </Ob>
        </section>

        <section className="tr-shot" ref={reg('shot-e')}>
          <Ob k="e-panel">
            <div className="tr-panel" style={{ height: PANEL_H }}>
              <div ref={reg('e-pan')}>
                <Pixel w={SCENE_W} h={SCENE_H} draw={drawReserve} />
              </div>
            </div>
          </Ob>
          <Ob k="e-trail">
            <div className="tr-trail">
              <Pixel w={TRAIL_W} h={TRAIL_H} draw={drawTrip} />
            </div>
          </Ob>
          <Eyebrow k="e-eye" text="Ma Réserve" />
          <Slam k="e-title" lines={['Construis', 'ta réserve']} size={112} />
          <Slam k="e-sub" lines={['Pars en expédition']} size={92} fill={GOLD} />
          {['Crédits', 'Cartes', 'Packs'].map((g, i) => (
            <Ob key={g} k={`e-g${i}`} z={70}>
              <span className="tr-chip">
                <i className="tr-coin" />+ {g}
              </span>
            </Ob>
          ))}
        </section>

        <section className="tr-shot" ref={reg('shot-f')}>
          <Ob k="f-ring">
            <div className="tr-ring">
              {RING.map((card, i) => (
                <div key={i} className="tr-slot" style={{ left: -RING_W / 2, top: (-RING_W * 1.4) / 2 }}>
                  <Flip card={card} w={RING_W} />
                </div>
              ))}
            </div>
          </Ob>
          <Ob k="f-logo" z={60}>
            <div className="tr-logo">
              <Logo />
            </div>
          </Ob>
          <Eyebrow k="f-tag" text="Le jeu de cartes des vrais animaux" tight />
          <Ob k="f-cta" z={80}>
            <div className="tr-cta">Joue gratuitement</div>
          </Ob>
          <Slam k="f-url" lines={['animalcards.fr']} size={104} />
          <Ob k="f-sub" z={60}>
            <div className="tr-small">Sans téléchargement · sur ton téléphone ou ton ordi</div>
          </Ob>
          <Slam k="f-q" lines={['Quel animal', 'tu vas sortir ?']} size={80} fill={GOLD} />
        </section>

        <canvas className="tr-cv" ref={front} width={fx.W} height={fx.H} style={{ zIndex: 50 }} />
      </div>
      <div className="tr-grain" />
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

createRoot(document.getElementById('root')!).render(<Trailer />);
