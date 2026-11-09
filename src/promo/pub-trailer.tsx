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
import { PackArt } from '../components/PackArt';
import { SHOP_PACKS } from '../engine/packs';
import { SCENE_H, SCENE_W, drawScene, type SceneModel } from '../art/reserve-scene';
import { TRAIL_H, TRAIL_W, drawTrail } from '../art/expedition-scene';
import { spriteForAthlete } from '../art/reserve-sprites';
import { ATHLETES_BY_ID } from '../data/athletes';
import type { EnclosId } from '../engine/reserve';
import type { CardFace } from '../engine/types';
import * as fx from './trailer-fx';
import { renderSoundtrack } from './pub-trailer-son';
import cutLion from './detoures/lion.webp';
import cutTigre from './detoures/tigre.webp';
import cutRequin from './detoures/requin-blanc.webp';
import cutCobra from './detoures/cobra-royal.webp';
import cutPanda from './detoures/panda.webp';
import cutPanthere from './detoures/panthere-des-neiges.webp';

// Bande-annonce TikTok « AnimalCards » (1080 × 1920, 30 images/s), dans le style des bandes-annonces de jeux de
// cartes : un booster qui se déchire, une Légendaire, l'animal qui jaillit de sa carte au milieu de rubans
// d'énergie, un montage rapide, les cartes ultra-rares, le duel « qui gagne ? », la réserve, puis l'appel à jouer.
// Les animaux détourés viennent des photos libres du jeu (Unsplash, Pixabay) ; aucun fichier ne part sur le site.
// Chaque image est calculée à partir du temps (window.__seek(t)) et la bande-son est rendue hors ligne, calée dessus.

const DURATION = 25;

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

/** Place un élément (coordonnées depuis le centre de l'écran) ou le cache (null). */
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
  el.style.transform = `perspective(1600px) translate3d(${(f.x ?? 0).toFixed(1)}px, ${(f.y ?? 0).toFixed(1)}px, ${(f.z ?? 0).toFixed(1)}px) rotateX(${(f.rx ?? 0).toFixed(2)}deg) rotateY(${(f.ry ?? 0).toFixed(2)}deg) rotateZ(${(f.rz ?? 0).toFixed(2)}deg) scale(${((f.sx ?? 1) * s).toFixed(4)}, ${s.toFixed(4)})`;
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
function slam(k: string, t: number, t0: number, x: number, y: number, o: { from?: number; out?: number; outDur?: number; rz?: number; drift?: number; zi?: number } = {}) {
  const outDur = o.outDur ?? 0.18;
  if (t < t0 || (o.out !== undefined && t >= o.out + outDur)) return put(k, null);
  const k1 = fx.seg(t, t0, t0 + 0.24);
  let s = fx.lerp(o.from ?? 2.4, 1, fx.outBack(k1, 1.7)) * (1 + (o.drift ?? 0.035) * Math.min(3, t - t0));
  let a = fx.seg(t, t0, t0 + 0.05);
  let dy = 0;
  if (o.out !== undefined && t >= o.out) {
    const q = fx.seg(t, o.out, o.out + outDur);
    s *= 1 + 0.5 * q;
    a *= 1 - q;
    dy = -120 * q;
  }
  put(k, { x, y: y + dy, s, rz: o.rz ?? -3, o: a, zi: o.zi });
}

/** Une étiquette qui saute en place. */
function pop(k: string, t: number, t0: number, x: number, y: number, o: { out?: number; zi?: number; rz?: number } = {}) {
  if (t < t0 || (o.out !== undefined && t >= o.out + 0.15)) return put(k, null);
  const k1 = fx.seg(t, t0, t0 + 0.3);
  const q = o.out !== undefined ? fx.seg(t, o.out, o.out + 0.15) : 0;
  put(k, { x, y, s: fx.lerp(0.2, 1, fx.outBack(k1, 2.2)) * (1 - 0.4 * q), o: fx.seg(t, t0, t0 + 0.06) * (1 - q), rz: o.rz ?? 0, zi: o.zi });
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
function Flip({ card, w }: { card: CardFace; w: number }) {
  return (
    <div className="tr-flip" style={{ width: w, height: w * 1.4 }}>
      <div className="tr-face">
        <C card={card} w={w} />
      </div>
      <div className="tr-face tr-back">
        <CardBack />
      </div>
    </div>
  );
}

type Edge = 'bottom' | 'left' | 'right';
const CUTS: Record<string, { src: string; fade: Edge[] }> = {
  lion: { src: cutLion, fade: ['bottom'] },
  tigre: { src: cutTigre, fade: ['right'] },
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

function Slam({ k, lines, size, fill, stroke = '#1a0630', z = 60, sw = 0.15 }: { k: string; lines: string[]; size: number; fill: string; stroke?: string; z?: number; sw?: number }) {
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

function Chip({ k, text, edge, z = 70, size }: { k: string; text: string; edge: string; z?: number; size?: number }) {
  return (
    <Ob k={k} z={z}>
      <span className="tr-chip" style={{ ['--edge' as string]: edge, fontSize: size }}>
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

// ───────────── données des plans ─────────────

const GOLD = 'linear-gradient(180deg, #fffbe0 0%, #ffe14a 45%, #ff9d1c 100%)';
const WHITE = 'linear-gradient(180deg, #ffffff 0%, #ffffff 55%, #ffe3f6 100%)';

const PACK = SHOP_PACKS.find((p) => p.id === 'legende')!;
const PW = 470;
const PH = (PW * 172) / 120;
const YREST = 60;
/** hauteur de la déchirure (depuis le centre de l'écran) */
const OPEN_Y = YREST - PH / 2 + 0.16 * PH;

const FLY = [
  { card: face('girafe'), tx: -760, ty: -1250, spin: -260, flip: 70 },
  { card: face('crocodile-du-nil'), tx: 800, ty: -1050, spin: 240, flip: -70 },
  { card: face('leopard'), tx: -840, ty: 650, spin: -200, flip: -60 },
  { card: face('loup'), tx: 820, ty: 850, spin: 220, flip: 70 },
];

type Theme = 'ocean' | 'jungle' | 'panda' | 'snow';
const MONT: { id: string; name: string[]; chip: string; edge: string; theme: Theme; from: [number, number]; to: [number, number]; drift: number; s: number; rz: [number, number] }[] = [
  { id: 'requin-blanc', name: ['REQUIN BLANC'], chip: 'Légendaire · Océans', edge: '#5ff3ff', theme: 'ocean', from: [120, 300], to: [20, -60], drift: -80, s: 2.05, rz: [-14, -5] },
  { id: 'cobra-royal', name: ['COBRA ROYAL'], chip: 'Épique · Forêt tropicale', edge: '#b6ff3b', theme: 'jungle', from: [-120, 420], to: [40, -40], drift: 0, s: 1.9, rz: [6, 0] },
  { id: 'panda', name: ['PANDA'], chip: 'Légendaire · Forêt de bambous', edge: '#ff8fd0', theme: 'panda', from: [140, 360], to: [0, -40], drift: 20, s: 1.95, rz: [-40, 5] },
  { id: 'panthere-des-neiges', name: ['PANTHÈRE', 'DES NEIGES'], chip: 'Légendaire · Haute montagne', edge: '#bfe9ff', theme: 'snow', from: [-140, 320], to: [40, -50], drift: -30, s: 2.0, rz: [12, -2] },
];

const RARES: { k: string; card: CardFace; x: number; y: number; w: number; rz: number; ry: number; t0: number; label: string; fill: string }[] = [
  { k: 'r-prime', card: face('chat', 'prime'), x: -320, y: 50, w: 320, rz: -11, ry: 22, t0: 11.5, label: 'PRIME', fill: 'linear-gradient(180deg, #ffe3f6, #ff6fd0 60%, #b44bff)' },
  { k: 'r-rev', card: face('loup', 'reverse'), x: 320, y: 50, w: 320, rz: 11, ry: -22, t0: 12.0, label: 'REVERSE', fill: 'linear-gradient(180deg, #e0fbff, #5ff3ff 55%, #ff8fb8)' },
  { k: 'r-icone', card: face('thylacine'), x: 0, y: -90, w: 380, rz: 0, ry: 0, t0: 11.0, label: 'ICÔNE', fill: GOLD },
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

// ───────────── la caméra : secousses, coups de zoom, flashs ─────────────

const IMPACTS: [number, number][] = [
  [0.45, 14],
  [2.0, 30],
  [4.0, 24],
  [5.0, 26],
  [7, 14],
  [8, 14],
  [9, 14],
  [10, 14],
  [11.0, 10],
  [11.5, 6],
  [12.0, 6],
  [13.5, 30],
  [14.5, 22],
  [15.5, 9],
  [17.0, 12],
  [19.5, 22],
  [19.62, 12],
];
const PUNCH: [number, number][] = [
  [2.0, 0.07],
  [4.0, 0.06],
  [5.0, 0.08],
  [7, 0.07],
  [8, 0.07],
  [9, 0.07],
  [10, 0.07],
  [11, 0.05],
  [13.5, 0.08],
  [14.5, 0.06],
  [17, 0.05],
  [19.5, 0.07],
];
/** zooms qui avalent l'image juste avant une coupe */
const SWALLOW: [number, number][] = [
  [6.78, 7.0],
  [12.85, 13.0],
  [16.8, 17.0],
  [19.32, 19.5],
];
const FLASHES: [number, number, number, string][] = [
  [0.45, 0.35, 0.2, '#ffffff'],
  [2.067, 1, 0.35, '#ffffff'],
  [4.067, 1, 0.45, '#fff6d0'],
  [5.0, 0.75, 0.28, '#fff3b0'],
  [7, 0.85, 0.2, '#ffffff'],
  [8, 0.85, 0.2, '#ffffff'],
  [9, 0.85, 0.2, '#ffffff'],
  [10, 0.85, 0.2, '#ffffff'],
  [11, 0.8, 0.25, '#ffffff'],
  [13.0, 0.6, 0.2, '#ffffff'],
  [13.567, 1, 0.35, '#ffffff'],
  [14.5, 0.7, 0.25, '#ffffff'],
  [17.0, 0.8, 0.25, '#ffffff'],
  [19.5, 1, 0.4, '#ffffff'],
];
/** images « négatif » d'impact, comme dans les animés */
const INVERT = [2.0, 4.0, 13.5];

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
  cam.style.filter = INVERT.some((ti) => t >= ti && t < ti + 0.066) ? 'invert(1) saturate(1.4) contrast(1.15)' : '';
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
    x: fx.wobble(t * 60, 1) * 14 * charge,
    y: YREST + Math.sin(d * 3.2) * 10 + 34 * Math.exp(-d * 8) * Math.sin(d * 20),
    ry: Math.sin(d * 2.1) * 12,
    rz: -4 + Math.sin(d * 1.6) * 2.5 + fx.wobble(t * 55, 3) * 3 * charge,
    s: 1 + 0.05 * charge,
  };
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
    by += 46 * fx.outCubic(fx.seg(t, 2, 2.12)) - 20 * fx.seg(t, 2.12, 2.5);
    const f = fx.seg(t, 3.0, 3.6);
    by += 1700 * fx.inCubic(f);
    brz += 30 * f;
    bo = 1 - fx.seg(t, 3.45, 3.6);
  }
  put('pk-body', t < 3.6 ? { ...b, y: by, rz: brz, o: bo, zi: 10 } : null);
  const tear = els.get('pk-tear');
  if (tear) {
    tear.style.transform = `scaleX(${fx.seg(t, 1.35, 1.95).toFixed(3)})`;
    tear.style.opacity = t < 2.03 ? '1' : '0';
  }

  // les cartes qui jaillissent du sachet
  FLY.forEach((c, i) => {
    const T = 2.08 + 0.24 * i;
    const p = fx.seg(t, T, T + 0.62);
    if (t < T || p >= 1) return put(`fly${i}`, null);
    const rise = fx.outCubic(Math.min(1, p / 0.28));
    const q = fx.seg(p, 0.12, 1);
    put(`fly${i}`, {
      x: c.tx * Math.pow(q, 1.7),
      y: OPEN_Y + 70 - 380 * rise + c.ty * Math.pow(q, 1.9),
      s: 0.6 + 3.2 * Math.pow(q, 2.2),
      rz: c.spin * q,
      ry: c.flip * q,
      zi: p < 0.16 ? 8 : 14,
      blur: q > 0.45 ? (q - 0.45) * 14 : 0,
    });
  });

  // la dernière carte : face cachée, puis retournée… Légendaire
  const HY = -110;
  if (t < 2.95 || t >= 7.0) put('hero', null);
  else if (t < 4.0) {
    const k = fx.outCubic(fx.seg(t, 2.95, 3.75));
    const squash = fx.seg(t, 3.85, 4.0);
    put('hero', { y: fx.lerp(OPEN_Y + 230, HY, k), s: fx.lerp(0.5, 1, k) * (1 - 0.06 * squash), ry: 180 + Math.sin((t - 2.95) * 3) * 10, rz: Math.sin(t * 2.2) * 3, zi: t < 3.4 ? 9 : 15 });
  } else if (t < 5.0) {
    const f = fx.seg(t, 4.0, 4.34);
    const ry = t < 4.34 ? 180 * (1 - fx.outBack(f, 1.3)) : Math.sin((t - 4.34) * 3) * 9;
    put('hero', { y: HY, s: 0.94 + 0.06 * fx.outBack(f) + 0.015 * Math.sin((t - 4) * 4), ry, rx: Math.sin(t * 2.3) * 4, zi: 15 });
    glare('hero', t < 4.7 ? fx.lerp(-30, 130, fx.seg(t, 4.05, 4.7)) : 50 + ry * 3);
  } else {
    const k = fx.outCubic(fx.seg(t, 5.0, 5.35));
    const out = fx.seg(t, 6.7, 7.0);
    put('hero', { y: fx.lerp(HY, 330, k) + 900 * fx.inCubic(out), rx: 52 * k, s: fx.lerp(1, 0.8, k), ry: Math.sin(t * 2) * 4, zi: 15 });
    glare('hero', 50 + Math.sin(t * 2) * 25);
  }

  // le lion sort de sa carte
  if (t < 5.0 || t >= 7.0) put('cut-lion', null);
  else {
    const k = fx.seg(t, 5.0, 5.42);
    const s = (t < 5.42 ? fx.lerp(0.95, 2.15, fx.outBack(k, 1.5)) : 2.15 + 0.14 * fx.seg(t, 5.42, 7.0)) * (1 + 0.4 * fx.inCubic(fx.seg(t, 6.8, 7.0)));
    put('cut-lion', { x: fx.lerp(0, -20, k), y: fx.lerp(-130, -330, fx.outCubic(k)) + fx.wobble(t * 1.4, 2) * 8, s, rz: fx.wobble(t * 0.9, 4) * 1.5, o: fx.seg(t, 5.0, 5.07), zi: 30 });
  }

  slam('tx-pov1', t, 0.12, 0, -800, { out: 1.98, rz: -4 });
  slam('tx-pov2', t, 0.3, 0, -590, { out: 1.98, rz: -4 });
  slam('tx-legend', t, 4.1, 0, 430, { out: 4.92, from: 2.8 });
  slam('tx-lion', t, 5.1, 0, -480, { from: 1.8, drift: 0.05, zi: 6, rz: -5 });
  pop('chip-lion', t, 5.45, 0, 620);
}

function bgBooster(c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, t: number) {
  const charge = fx.seg(t, 1.2, 2.0);
  const packY = 960 + YREST;
  const openY = 960 + OPEN_Y;
  if (t < 4.2) {
    fx.radial(c, 540, 1000, 1400, [
      [0, '#8a2bbd'],
      [0.4, '#3b0c63'],
      [1, '#090313'],
    ]);
    fx.rays(c, 540, 1000, 14, t * 0.25, 'rgba(255,200,255,1)', 0.05 + 0.12 * charge);
    fx.stream(c, t, { seed: 3, n: 40, kind: 'spark', colors: ['#ffffff', '#ffd6f5', '#bfa8ff'], vx: 0, vy: -50, size: 10, alpha: 0.7 });
    if (t < 2.0) fx.speedLines(c, 540, packY - 120, Math.floor(t * 15), 80, 470, 0.6 * charge);
    // l'énergie s'enroule autour du sachet
    if (t > 0.4 && t < 2.1) {
      const cols: [string, string][] = [
        ['#ff2d95', '#ffd23f'],
        ['#7a5cff', '#3ff0ff'],
        ['#ff8a3d', '#fff3a0'],
      ];
      cols.forEach((colors, i) => {
        const path = fx.helix(540, packY + 40, 330, 85, { turns: 2, rise: 760, tilt: -0.15, phase: i * 2.1, grow: 0.3 });
        fx.ribbon(c, f, path, fx.seg(t, 0.5 + i * 0.15, 2.0 + i * 0.05) * 1.55, { colors, width: [64, 48, 38][i], len: 0.55 });
      });
    }
    if (t >= 2.0) {
      // le faisceau qui sort du sachet ouvert
      const a = Math.max(Math.exp(-(t - 2) * 3.2), fx.seg(t, 2.9, 3.9) * 0.9);
      const w = 140 + 240 * a;
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(0, openY, 0, 0);
      g.addColorStop(0, `rgba(255,246,200,${0.95 * a})`);
      g.addColorStop(1, 'rgba(255,120,220,0)');
      c.fillStyle = g;
      c.fillRect(540 - w / 2, 0, w, openY);
      c.restore();
      fx.glow(c, 540, openY, 520, '#fff3b0', a * 0.9);
    }
    fx.ring(f, 540, packY, t, 0.45, 0.5, 600, '#ffd6f5', 30);
    fx.ring(f, 540, openY, t, 2.0, 0.6, 950, '#ffffff', 50);
    fx.burst(f, t, 2.0, { seed: 11, n: 70, x: 540, y: openY, speed: 2400, gravity: 700, life: 1.1, size: 16, kind: 'spark', colors: ['#ffffff', '#fff3a0', '#ff8fd0'] });
    fx.burst(f, t, 2.0, { seed: 12, n: 50, x: 540, y: openY, speed: 2800, gravity: 300, life: 0.7, size: 4, kind: 'streak', colors: ['#ffffff', '#ffe14a'] });
    fx.glow(c, 540, 850, 700, '#ffe9a0', fx.seg(t, 3.0, 4.0) * 0.8);
  }
  // la Légendaire : fond d'or et rayons
  if (t >= 4.0 && t < 5.15) {
    c.save();
    c.globalAlpha = fx.seg(t, 4.0, 4.1);
    fx.radial(c, 540, 850, 1500, [
      [0, '#fff3b0'],
      [0.2, '#ffc23d'],
      [0.55, '#d4366f'],
      [1, '#2a0520'],
    ]);
    c.restore();
    fx.rays(c, 540, 850, 18, t * 0.7, '#fff3b0', 0.4);
    fx.stream(c, t, { seed: 5, n: 50, kind: 'spark', colors: ['#ffffff', '#fff3a0'], vx: 0, vy: -90, size: 12 });
  }
  fx.ring(f, 540, 850, t, 4.0, 0.7, 1000, '#ffe14a', 50);
  fx.burst(f, t, 4.0, { seed: 21, n: 150, x: 540, y: 820, speed: 2600, gravity: 1300, life: 2.0, size: 13, kind: 'confetti', colors: ['#ffe14a', '#ff4fb8', '#5ff3ff', '#ffffff', '#ff9d1c'], drag: 2.2 });
  fx.burst(f, t, 4.0, { seed: 22, n: 40, x: 540, y: 820, speed: 1900, gravity: 0, life: 1.0, size: 22, kind: 'spark', colors: ['#ffffff', '#fff3a0'] });
  // la savane en feu d'énergie, autour du lion
  if (t >= 5.0) {
    c.save();
    c.globalAlpha = fx.seg(t, 5.0, 5.1);
    fx.radial(c, 540, 600, 1500, [
      [0, '#fff3b0'],
      [0.18, '#ffb22e'],
      [0.5, '#e8335f'],
      [1, '#2a0626'],
    ]);
    c.restore();
    fx.rays(c, 540, 600, 16, -t * 0.4, '#fff3b0', 0.16);
    fx.speedLines(c, 540, 620, Math.floor(t * 15), 90, 420, 0.55 * Math.exp(-(t - 5) * 2.2) + 0.14);
    fx.stream(c, t, { seed: 7, n: 60, kind: 'ember', colors: ['#ffe14a', '#ff9d1c', '#ffffff'], vx: 30, vy: -320, size: 6, sway: 30 });
    const cols: [string, string][] = [
      ['#ff2d95', '#ffd23f'],
      ['#ff7a1c', '#fff3a0'],
      ['#8a5cff', '#ff9ff3'],
    ];
    cols.forEach((colors, i) => {
      const w = [112, 84, 62][i];
      const p1 = fx.helix(540, 680, 520, 150, { turns: 1.5, rise: 820, tilt: -0.22, phase: i * 2.1, grow: 0.3 });
      fx.ribbon(c, f, p1, fx.seg(t, 5.02 + i * 0.1, 6.1 + i * 0.1) * 1.6, { colors, width: w, len: 0.6 });
      const p2 = fx.helix(540, 640, 560, 160, { turns: 1.4, rise: -760, tilt: 0.18, phase: 1 + i * 2.1, grow: 0.3 });
      fx.ribbon(c, f, p2, fx.seg(t, 5.85 + i * 0.1, 7.0 + i * 0.05) * 1.6, { colors, width: w * 0.85, len: 0.6 });
    });
    fx.ring(f, 540, 640, t, 5.0, 0.55, 1000, '#fff3b0', 46);
    fx.burst(f, t, 5.0, { seed: 31, n: 60, x: 540, y: 640, speed: 2600, gravity: 0, life: 0.8, size: 5, kind: 'streak', colors: ['#ffffff', '#ffe14a'] });
  }
}

// ───────────── plan 3 : le montage des 500 animaux ─────────────

const THEMES: Record<Theme, { grad: [number, string][]; ribbons: [string, string][]; draw: (c: CanvasRenderingContext2D, t: number) => void }> = {
  ocean: {
    grad: [
      [0, '#7ff7ff'],
      [0.22, '#16a6e0'],
      [0.6, '#0a3f8f'],
      [1, '#020a22'],
    ],
    ribbons: [
      ['#00e5ff', '#ffffff'],
      ['#1e5bff', '#7ff7ff'],
      ['#ffffff', '#bff8ff'],
    ],
    draw: (c, t) => {
      fx.rays(c, 540, -200, 10, Math.sin(t) * 0.1 + 1.2, '#bff8ff', 0.16, 0.35);
      fx.stream(c, t, { seed: 41, n: 46, kind: 'bubble', colors: ['rgba(255,255,255,0.9)', '#bff8ff'], vx: 0, vy: -380, size: 16, sway: 20 });
    },
  },
  jungle: {
    grad: [
      [0, '#f4ff8a'],
      [0.22, '#5fd13a'],
      [0.6, '#0f5e2c'],
      [1, '#03140a'],
    ],
    ribbons: [
      ['#b6ff3b', '#fff36b'],
      ['#00c46a', '#b6ff3b'],
      ['#ffd23f', '#ffffff'],
    ],
    draw: (c, t) => {
      fx.rays(c, 540, 900, 12, t * 0.4, '#f4ff8a', 0.12);
      fx.stream(c, t, { seed: 42, n: 34, kind: 'leaf', colors: ['#5fd13a', '#2f9e2f', '#c9ff5a'], vx: 120, vy: 260, size: 24, sway: 40 });
    },
  },
  panda: {
    grad: [
      [0, '#fff0f7'],
      [0.22, '#ff8fd0'],
      [0.6, '#9a2a8a'],
      [1, '#1c0626'],
    ],
    ribbons: [
      ['#ff4fb8', '#ffffff'],
      ['#7dff7a', '#e8ffb0'],
      ['#ffd6f0', '#ff8fd0'],
    ],
    draw: (c, t) => {
      fx.rays(c, 540, 900, 12, -t * 0.4, '#ffffff', 0.14);
      fx.stream(c, t, { seed: 43, n: 44, kind: 'petal', colors: ['#ffc2e2', '#ffffff', '#ff8fd0'], vx: 70, vy: 220, size: 16, sway: 50 });
    },
  },
  snow: {
    grad: [
      [0, '#ffffff'],
      [0.22, '#9fe0ff'],
      [0.6, '#3a46b8'],
      [1, '#080a26'],
    ],
    ribbons: [
      ['#ffffff', '#9fe0ff'],
      ['#8a7dff', '#e0dcff'],
      ['#5ff3ff', '#ffffff'],
    ],
    draw: (c, t) => {
      fx.rays(c, 540, 900, 12, t * 0.3, '#e8f6ff', 0.14);
      fx.stream(c, t, { seed: 44, n: 100, kind: 'snow', colors: ['#ffffff', '#dff4ff'], vx: -90, vy: 340, size: 7, sway: 14 });
    },
  },
};

function montageIndex(t: number) {
  return Math.max(0, Math.min(3, Math.floor(t - 7)));
}

function shotMontage(t: number) {
  const n = Math.round(fx.lerp(120, 500, fx.outCubic(fx.seg(t, 7.05, 7.75))));
  setLines('m-500a', [`PLUS DE ${n}`]);
  slam('m-500a', t, 7.05, 0, -800, { drift: 0.02, rz: -4 });
  slam('m-500b', t, 7.2, 0, -680, { drift: 0.02, rz: -4 });
  const active = montageIndex(t);
  MONT.forEach((m, i) => {
    if (i !== active || t < 7 || t >= 11) {
      put(`m-card${i}`, null);
      put(`m-cut${i}`, null);
      put(`m-name${i}`, null);
      put(`m-chip${i}`, null);
      return;
    }
    const S = 7 + i;
    const u = t - S;
    const side = i % 2 ? 1 : -1;
    const e = fx.outCubic(fx.seg(u, 0, 0.2));
    const cx = side * 140;
    const cy = 470;
    put(`m-card${i}`, { x: cx, y: fx.lerp(1400, cy, e) - 30 * u, rx: 30, rz: side * fx.lerp(30, 9, e), zi: 20 });
    glare(`m-card${i}`, 50 + Math.sin(u * 4) * 40);
    const k = fx.seg(u, 0.1, 0.42);
    const ok = fx.outCubic(k);
    put(`m-cut${i}`, {
      x: fx.lerp(cx + m.from[0] * 0.2, m.to[0], ok) + m.drift * u,
      y: fx.lerp(cy - 60 + m.from[1] * 0.2, m.to[1], ok) - 20 * u,
      s: fx.lerp(0.7, m.s, fx.outBack(k, 1.5)) * (1 + 0.06 * u),
      rz: fx.lerp(m.rz[0], m.rz[1], ok),
      o: fx.seg(u, 0.1, 0.16),
      zi: 30,
    });
    slam(`m-name${i}`, t, S + 0.16, 0, m.name.length > 1 ? 230 : 200, { from: 2.2, drift: 0.03, zi: 60, rz: -5 });
    pop(`m-chip${i}`, t, S + 0.32, 0, -545, { zi: 70 });
  });
}

function bgMontage(c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, t: number) {
  const i = montageIndex(t);
  const m = MONT[i];
  const th = THEMES[m.theme];
  const u = t - (7 + i);
  fx.radial(c, 540, 900, 1500, th.grad);
  th.draw(c, t);
  const ax = 540 + m.to[0];
  const ay = 960 + m.to[1];
  fx.speedLines(c, ax, ay, Math.floor(t * 15), 80, 430, 0.6 * Math.exp(-u * 4) + 0.12);
  th.ribbons.forEach((colors, j) => {
    const path = fx.helix(ax, ay + 40, 500, 140, { turns: 1.4, rise: 700, tilt: j % 2 ? 0.2 : -0.2, phase: j * 2.1 + i, grow: 0.3 });
    fx.ribbon(c, f, path, fx.seg(u, 0.12 + j * 0.08, 0.98) * 1.6, { colors, width: [100, 76, 56][j], len: 0.6 });
  });
  fx.ring(f, ax, ay, t, 7 + i + 0.12, 0.45, 900, th.ribbons[0][1], 40);
  fx.burst(f, t, 7 + i + 0.1, { seed: 50 + i, n: 36, x: ax, y: ay, speed: 2200, gravity: 0, life: 0.7, size: 14, kind: 'spark', colors: ['#ffffff', th.ribbons[0][0]] });
}

// ───────────── plan 4 : les ultra-rares ─────────────

function shotRares(t: number) {
  const out = fx.seg(t, 12.85, 13.0);
  RARES.forEach((r, i) => {
    if (t < r.t0) return put(r.k, null);
    const k = fx.seg(t, r.t0, r.t0 + (i === 2 ? 0.42 : 0.32));
    const float = Math.sin(t * 2 + i) * 8;
    if (i === 2) {
      put(r.k, { x: 0, y: r.y + float, s: fx.lerp(0.05, 1, fx.outCubic(k)) * (1 + 0.3 * out), ry: fx.lerp(720, 0, fx.outCubic(k)) + Math.sin((t - 11) * 2.5) * 6, zi: 16 });
      glare(r.k, ((t - 11.3) * 110) % 170 - 35);
    } else {
      const side = i === 0 ? -1 : 1;
      put(r.k, { x: fx.lerp(side * 1150, r.x, fx.outBack(k, 1.2)) + side * 200 * out, y: r.y + float, rz: r.rz, ry: fx.lerp(side * -100, r.ry, fx.outCubic(k)) + Math.sin(t * 2.4 + i) * 5, s: 1 + 0.3 * out, zi: 14 });
      glare(r.k, ((t - r.t0) * 120) % 170 - 35);
    }
    slam(`${r.k}-l`, t, r.t0 + 0.28, r.x, 350, { from: 2.2, out: 12.85, outDur: 0.15 });
  });
  slam('r-title', t, 11.05, 0, -720, { out: 12.85, outDur: 0.15, rz: -4 });
  pop('r-chip', t, 12.45, 0, 520, { out: 12.85 });
}

function bgRares(c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, t: number) {
  fx.radial(c, 540, 900, 1400, [
    [0, '#4a1f8f'],
    [0.6, '#16062e'],
    [1, '#05010d'],
  ]);
  c.save();
  c.globalCompositeOperation = 'screen';
  fx.vortex(c, 540, 900, t * 0.8, ['#ff4fd8', '#7a5cff', '#3fd9ff', '#5effa1', '#ffe14a', '#ff8a3d'], 0.4);
  c.restore();
  fx.rays(c, 540, 870, 16, t * 0.5, '#ffffff', 0.14);
  fx.stream(c, t, { seed: 61, n: 70, kind: 'spark', colors: ['#ffffff', '#fff3a0', '#d6c8ff'], vx: 0, vy: -60, size: 12 });
  fx.ribbon(c, f, fx.bezier([-200, 1600], [300, 500], [800, 1500], [1300, 300], -1), fx.seg(t, 11.0, 11.9) * 1.6, { colors: ['#ff4fd8', '#ffe14a'], width: 110, len: 0.6 });
  fx.ribbon(c, f, fx.bezier([1300, 1750], [700, 900], [300, 1500], [-200, 500], -1), fx.seg(t, 11.45, 12.4) * 1.6, { colors: ['#3fd9ff', '#b388ff'], width: 92, len: 0.6 });
  fx.ribbon(c, f, fx.bezier([-200, 300], [400, 900], [700, 200], [1300, 1100], 1), fx.seg(t, 12.0, 12.8) * 1.6, { colors: ['#5effa1', '#ffffff'], width: 60, len: 0.5 });
  fx.ring(f, 540, 870, t, 11.0, 0.6, 900, '#ffe14a', 40);
  fx.burst(f, t, 11.05, { seed: 62, n: 60, x: 540, y: 870, speed: 2000, gravity: 400, life: 1.2, size: 16, kind: 'spark', colors: ['#ffffff', '#ffe14a', '#ff8fd0'] });
}

// ───────────── plan 5 : le duel ─────────────

const SEAM_A: [number, number] = [-60, 1090];
const SEAM_B: [number, number] = [1140, 840];

function duelSlide(t: number) {
  return { into: 1 - fx.outCubic(fx.seg(t, 13.0, 13.3)), away: fx.inCubic(fx.seg(t, 16.75, 17.0)) };
}

function shotDuel(t: number) {
  const { away } = duelSlide(t);
  const lx = -1300 * away;
  const rx = 1300 * away;
  const ek = (a: number) => fx.outBack(fx.seg(t, a, a + 0.3), 1.3);
  put('d-c-lion', t < 13.12 ? null : { x: fx.lerp(-1250, -290, ek(13.12)) + lx, y: -400, rz: -8, zi: 20 });
  put('d-c-tigre', t < 13.22 ? null : { x: fx.lerp(1250, 290, ek(13.22)) + rx, y: 420, rz: 8, zi: 20 });
  glare('d-c-lion', 50 + Math.sin(t * 3) * 40);
  glare('d-c-tigre', 50 - Math.sin(t * 3) * 40);
  const breathe = 1 + 0.025 * Math.sin(t * 5);
  const cl = fx.seg(t, 13.58, 13.92);
  put('d-cut-lion', t < 13.58 ? null : { x: fx.lerp(-290, -160, fx.outCubic(cl)) + lx, y: fx.lerp(-430, -620, fx.outCubic(cl)), s: fx.lerp(0.6, 1.2, fx.outBack(cl, 1.5)) * breathe, o: fx.seg(t, 13.58, 13.63), zi: 30 });
  const ct = fx.seg(t, 13.72, 14.06);
  put('d-cut-tigre', t < 13.72 ? null : { x: fx.lerp(290, 190, fx.outCubic(ct)) + rx, y: fx.lerp(420, 470, fx.outCubic(ct)), s: fx.lerp(0.6, 1.2, fx.outBack(ct, 1.5)) * (2 - breathe), o: fx.seg(t, 13.72, 13.77), zi: 30 });
  slam('d-vs', t, 13.48, 0, -15, { from: 3.2, out: 14.45, outDur: 0.12, rz: -6 });
  slam('d-n-lion', t, 13.7, 250, -640, { out: 16.75, outDur: 0.2, rz: -8, drift: 0.02 });
  slam('d-n-tigre', t, 13.82, -250, 640, { out: 16.75, outDur: 0.2, rz: -8, drift: 0.02 });
  slam('d-q', t, 14.5, 0, -10, { from: 2.6, out: 16.75, outDur: 0.2, rz: -5 });
  pop('d-chip', t, 15.0, 0, 145, { out: 16.75 });
}

function bgDuel(c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, t: number) {
  const { into, away } = duelSlide(t);
  const shift = 1300 * (into + away);
  // derrière les deux moitiés qui glissent : la nuit violette
  fx.radial(c, 540, 965, 1300, [
    [0, '#6a2bbd'],
    [1, '#0b0318'],
  ]);
  const half = (top: boolean) => {
    const dx = top ? -shift : shift;
    c.save();
    c.translate(dx, 0);
    c.beginPath();
    if (top) {
      c.moveTo(-60, -60);
      c.lineTo(1140, -60);
      c.lineTo(SEAM_B[0], SEAM_B[1]);
      c.lineTo(SEAM_A[0], SEAM_A[1]);
    } else {
      c.moveTo(SEAM_A[0], SEAM_A[1]);
      c.lineTo(SEAM_B[0], SEAM_B[1]);
      c.lineTo(1140, 1980);
      c.lineTo(-60, 1980);
    }
    c.closePath();
    c.clip();
    if (top)
      fx.radial(c, 300, 420, 1200, [
        [0, '#fff1a0'],
        [0.25, '#ffb22e'],
        [0.6, '#d8361e'],
        [1, '#2a0505'],
      ]);
    else
      fx.radial(c, 780, 1480, 1200, [
        [0, '#ffc6f5'],
        [0.25, '#c64bff'],
        [0.6, '#4b17b8'],
        [1, '#0c0326'],
      ]);
    fx.speedLines(c, 540, 965, Math.floor(t * 15) + (top ? 0 : 500), 60, 380, 0.32);
    fx.stream(c, t, { seed: top ? 71 : 72, n: 40, kind: top ? 'ember' : 'spark', colors: top ? ['#ffe14a', '#ffffff'] : ['#ffc6f5', '#ffffff'], vx: 0, vy: -200, size: 7 });
    c.restore();
  };
  half(true);
  half(false);
  if (t >= 13.3 && t < 16.8) {
    // la ligne de front : lumière et éclairs
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.shadowColor = '#ffffff';
    c.shadowBlur = 40;
    c.lineWidth = 14;
    c.beginPath();
    c.moveTo(SEAM_A[0], SEAM_A[1]);
    c.lineTo(SEAM_B[0], SEAM_B[1]);
    c.stroke();
    c.restore();
    if (t >= 13.45) {
      const seed = Math.floor(t * 15);
      fx.lightning(f, SEAM_A, SEAM_B, seed, '#ffd6ff', 5, 80);
      fx.lightning(f, SEAM_A, SEAM_B, seed + 99, '#fff3a0', 3, 50);
    }
    for (let k = 0; k < 2; k++) {
      const t0 = Math.floor(t * 4) / 4 - k * 0.25;
      if (t0 >= 13.5) fx.burst(f, t, t0, { seed: Math.round(t0 * 100), n: 18, x: 540, y: 965, speed: 1400, gravity: 900, life: 0.5, size: 5, kind: 'streak', colors: ['#ffffff', '#ffe14a', '#ff8fd0'] });
    }
  }
  if (t >= 13.6 && t < 16.8) {
    const sides: [number, number, [string, string][], number][] = [
      [380, 360, [['#ff7a1c', '#fff3a0'], ['#ff2d95', '#ffd23f']], 13.6],
      [730, 1420, [['#b44bff', '#ffc6f5'], ['#00e5ff', '#ffffff']], 13.75],
    ];
    for (const [x, y, cols, t0] of sides)
      cols.forEach((colors, j) => {
        const path = fx.helix(x, y, 330, 95, { turns: 1.6, rise: 520, tilt: j ? 0.25 : -0.25, phase: j * 2.4 });
        const head = ((((t - t0) * 0.7 + j * 0.45) % 1) + 1) % 1;
        fx.ribbon(c, f, path, head * 1.55, { colors, width: j ? 54 : 74, len: 0.55 });
      });
  }
  fx.ring(f, 540, 965, t, 13.5, 0.55, 1000, '#ffffff', 50);
  fx.ring(f, 540, 965, t, 14.5, 0.5, 900, '#ffe14a', 40);
}

// ───────────── plan 6 : la réserve et les expéditions ─────────────

function shotReserve(t: number) {
  const k = fx.seg(t, 17.0, 17.38);
  put('e-panel', t < 17.0 ? null : { y: fx.lerp(1500, -235, fx.outBack(k, 1.2)), rx: 12, rz: -3 + Math.sin(t * 1.5) * 0.8, s: 1 + 0.02 * (t - 17), zi: 20 });
  const pan = els.get('e-pan');
  if (pan) pan.style.transform = `translateY(${(-Math.max(0, PANEL_CANVAS_H - PANEL_H) * fx.inOut(fx.seg(t, 17.3, 19.4))).toFixed(1)}px)`;
  slam('e-title', t, 17.08, 0, -800, { rz: -4, drift: 0.02 });
  slam('e-sub', t, 18.0, 0, 215, { rz: -4, drift: 0.02 });
  const kt = fx.seg(t, 18.05, 18.35);
  put('e-trail', t < 18.05 ? null : { x: fx.lerp(1300, 0, fx.outBack(kt, 1.2)), y: 400, rz: 2, zi: 22 });
  for (let i = 0; i < 3; i++) pop(`e-g${i}`, t, 18.45 + i * 0.2, -320 + i * 320, 600, { zi: 70, rz: [-5, 3, -3][i] });
}

function bgReserve(c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, t: number) {
  fx.radial(c, 540, 760, 1500, [
    [0, '#fff9c4'],
    [0.25, '#8be8a8'],
    [0.6, '#127a5e'],
    [1, '#03201b'],
  ]);
  fx.rays(c, 540, 760, 14, t * 0.3, '#ffffff', 0.14);
  fx.stream(c, t, { seed: 81, n: 30, kind: 'leaf', colors: ['#5fd13a', '#c9ff5a', '#2f9e2f'], vx: 100, vy: 220, size: 22, sway: 40 });
  fx.stream(c, t, { seed: 82, n: 40, kind: 'spark', colors: ['#ffffff', '#fff3a0'], vx: 0, vy: -50, size: 10 });
  fx.ribbon(c, f, fx.bezier([-150, 1350], [300, 600], [700, 1100], [1250, 250], -1), fx.seg(t, 17.05, 17.9) * 1.6, { colors: ['#b6ff3b', '#fff36b'], width: 104, len: 0.6 });
  fx.ribbon(c, f, fx.bezier([1250, 1500], [700, 800], [300, 1300], [-150, 600], -1), fx.seg(t, 17.3, 18.3) * 1.6, { colors: ['#5ff3ff', '#ffffff'], width: 80, len: 0.6 });
  for (let i = 0; i < 3; i++) fx.burst(f, t, 18.47 + i * 0.2, { seed: 90 + i, n: 26, x: 220 + i * 320, y: 1560, speed: 1300, gravity: 900, life: 0.8, size: 13, kind: 'spark', colors: ['#ffffff', '#ffe14a', '#b6ff3b'] });
}

// ───────────── plan 7 : à toi de jouer ─────────────

function shotFinale(t: number) {
  const k = fx.seg(t, 19.55, 20.25);
  const R = 430 * fx.outBack(k, 1.3);
  const spin = -(t - 19.5) * 38 - 300 * (1 - fx.outCubic(fx.seg(t, 19.5, 20.7)));
  put('f-ring', t < 19.5 ? null : { y: -110, rx: -7, ry: spin, s: fx.lerp(0.3, 1, fx.outCubic(k)), zi: 20 });
  els.get('f-ring')?.querySelectorAll<HTMLElement>('.tr-slot').forEach((slot, i) => {
    slot.style.transform = `rotateY(${i * (360 / RING.length)}deg) translateZ(${R.toFixed(1)}px)`;
  });
  glare('f-ring', 50 + Math.sin(t * 2.5) * 45);
  slam('f-logo', t, 19.62, 0, -730, { from: 2.6, rz: 0, drift: 0.015 });
  pop('f-tag', t, 20.0, 0, -585);
  const cta = fx.seg(t, 20.8, 21.1);
  put('f-cta', t < 20.8 ? null : { y: 270, s: fx.lerp(0.2, 1, fx.outBack(cta, 2.2)) * (1 + 0.045 * Math.max(0, Math.sin((t - 21.1) * 7))), o: fx.seg(t, 20.8, 20.86), rz: -2, zi: 80 });
  slam('f-url', t, 21.2, 0, 420, { from: 2.2, drift: 0.01, rz: -3 });
  pop('f-sub', t, 21.6, 0, 512);
  slam('f-q', t, 22.3, 0, 640, { from: 2.2, drift: 0.015, rz: -4 });
}

function bgFinale(c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, t: number) {
  fx.radial(c, 540, 860, 1500, [
    [0, '#5a1aa8'],
    [0.55, '#1c0740'],
    [1, '#05010c'],
  ]);
  c.save();
  c.globalCompositeOperation = 'screen';
  fx.vortex(c, 540, 860, t * 0.5, ['#ff2d95', '#7a2cff', '#2d7bff', '#00e5ff', '#ffd23f', '#ff7a1c'], 0.3);
  c.restore();
  fx.rays(c, 540, 850, 16, t * 0.35, '#ffffff', 0.1);
  fx.stream(c, t, { seed: 101, n: 70, kind: 'spark', colors: ['#ffffff', '#fff3a0', '#ffc6f5'], vx: 0, vy: -70, size: 12 });
  const cols: [string, string][] = [
    ['#ff2d95', '#ffd23f'],
    ['#00e5ff', '#ffffff'],
    ['#8a5cff', '#ff9ff3'],
  ];
  cols.forEach((colors, i) => {
    const path = fx.helix(540, 860, 600, 165, { turns: 1, tilt: -0.1, phase: i * 2.1 + 1.6 });
    const head = ((((t - 19.5) * 0.6 + i / 3) % 1) + 1) % 1;
    fx.ribbon(c, f, path, head * 1.55, { colors, width: [84, 64, 48][i], len: 0.55 });
  });
  fx.ring(f, 540, 230, t, 19.62, 0.6, 900, '#ffd6f5', 40);
  fx.burst(f, t, 19.62, { seed: 111, n: 70, x: 540, y: 230, speed: 2200, gravity: 800, life: 1.4, size: 13, kind: 'confetti', colors: ['#ffe14a', '#ff4fb8', '#5ff3ff', '#ffffff'] });
  fx.burst(f, t, 20.8, { seed: 112, n: 40, x: 540, y: 1230, speed: 1500, gravity: 600, life: 1.0, size: 16, kind: 'spark', colors: ['#ffffff', '#ffe14a'] });
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
  camera(t);
  bg?.clearRect(0, 0, fx.W, fx.H);
  fg?.clearRect(0, 0, fx.W, fx.H);
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
    fx.vignette(fg, 0.5);
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
  const packArt = <PackArt tone={PACK.tone} name={PACK.name} size={PACK.size} guarantee={PACK.tagline} />;
  return (
    <div className="tr">
      <div className="tr-cam" ref={reg('cam')}>
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
              <C card={c.card} w={300} />
            </Ob>
          ))}
          <Ob k="hero">
            <Flip card={face('lion')} w={520} />
          </Ob>
          <Cut k="cut-lion" id="lion" aura="rgba(255,226,140,0.85)" />
          <Slam k="tx-pov1" lines={['POV :']} size={100} fill={WHITE} />
          <Slam k="tx-pov2" lines={['TU OUVRES', 'UN BOOSTER…']} size={128} fill={GOLD} />
          <Slam k="tx-legend" lines={['LÉGENDAIRE !']} size={150} fill={GOLD} stroke="#3a0820" />
          <Slam k="tx-lion" lines={['LION']} size={400} fill="linear-gradient(180deg, #fff6c8 0%, #ffd23f 50%, #ff7a1c 100%)" stroke="#5a0f1f" sw={0.07} z={6} />
          <Chip k="chip-lion" text="Légendaire · Savane" edge="#ffd23f" />
        </section>

        <section className="tr-shot" ref={reg('shot-b')}>
          <Slam k="m-500a" lines={['PLUS DE 500']} size={132} fill={GOLD} />
          <Slam k="m-500b" lines={['VRAIS ANIMAUX']} size={92} fill={WHITE} />
          {MONT.map((m, i) => (
            <div key={m.id}>
              <Ob k={`m-card${i}`}>
                <C card={face(m.id)} w={360} />
              </Ob>
              <Cut k={`m-cut${i}`} id={m.id} aura={`${m.edge}cc`} />
              <Slam k={`m-name${i}`} lines={m.name} size={m.name.length > 1 ? 128 : Math.min(200, Math.round(1500 / m.name[0].length))} fill={`linear-gradient(180deg, #ffffff 0%, #ffffff 40%, ${m.edge} 100%)`} stroke="#0b0a2a" />
              <Chip k={`m-chip${i}`} text={m.chip} edge={m.edge} />
            </div>
          ))}
        </section>

        <section className="tr-shot" ref={reg('shot-c')}>
          {RARES.map((r) => (
            <div key={r.k}>
              <Ob k={r.k}>
                <Flip card={r.card} w={r.w} />
              </Ob>
              <Slam k={`${r.k}-l`} lines={[r.label]} size={76} fill={r.fill} />
            </div>
          ))}
          <Slam k="r-title" lines={['DES CARTES', 'ULTRA-RARES']} size={120} fill="linear-gradient(180deg, #ffffff 0%, #ffe3f6 40%, #b388ff 100%)" />
          <Chip k="r-chip" text="Icône : 1 chance sur 1 000" edge="#ffe14a" />
        </section>

        <section className="tr-shot" ref={reg('shot-d')}>
          <Ob k="d-c-lion">
            <C card={face('lion')} w={300} />
          </Ob>
          <Ob k="d-c-tigre">
            <C card={face('tigre')} w={300} />
          </Ob>
          <Cut k="d-cut-lion" id="lion" aura="rgba(255,210,63,0.9)" />
          <Cut k="d-cut-tigre" id="tigre" aura="rgba(255,150,240,0.9)" />
          <Slam k="d-vs" lines={['VS']} size={300} fill="linear-gradient(180deg, #ffffff 0%, #e8e8f0 45%, #9aa0b8 100%)" stroke="#b0102a" sw={0.1} />
          <Slam k="d-n-lion" lines={['LION']} size={170} fill={GOLD} stroke="#4a0a0a" />
          <Slam k="d-n-tigre" lines={['TIGRE']} size={170} fill="linear-gradient(180deg, #ffffff 0%, #ffc6f5 50%, #c64bff 100%)" stroke="#1c0640" />
          <Slam k="d-q" lines={['QUI GAGNE ?']} size={165} fill={GOLD} stroke="#2a0630" />
          <Chip k="d-chip" text="Réponds en commentaire" edge="#ffffff" />
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
          <Slam k="e-title" lines={['CONSTRUIS', 'TA RÉSERVE']} size={118} fill="linear-gradient(180deg, #fbffd0 0%, #c9ff5a 50%, #3fbf3a 100%)" stroke="#06261a" />
          <Slam k="e-sub" lines={['PARS EN EXPÉDITION']} size={92} fill={GOLD} stroke="#06261a" />
          {['+ Crédits', '+ Cartes', '+ Packs'].map((g, i) => (
            <Chip key={g} k={`e-g${i}`} text={g} edge="#b6ff3b" size={36} />
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
          <Ob k="f-tag" z={60}>
            <div className="tr-tag">Le jeu de cartes des vrais animaux</div>
          </Ob>
          <Ob k="f-cta" z={80}>
            <div className="tr-cta">Joue gratuitement</div>
          </Ob>
          <Slam k="f-url" lines={['ANIMALCARDS.FR']} size={104} fill="linear-gradient(180deg, #ffffff 0%, #ffffff 50%, #ffe9a8 100%)" stroke="#2a0a4a" />
          <Ob k="f-sub" z={60}>
            <div className="tr-small">Sans téléchargement · sur ton téléphone ou ton ordi</div>
          </Ob>
          <Slam k="f-q" lines={['QUEL ANIMAL', 'TU VAS SORTIR ?']} size={78} fill={GOLD} stroke="#2a0630" />
        </section>

        <canvas className="tr-cv" ref={front} width={fx.W} height={fx.H} style={{ zIndex: 50 }} />
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

createRoot(document.getElementById('root')!).render(<Trailer />);
