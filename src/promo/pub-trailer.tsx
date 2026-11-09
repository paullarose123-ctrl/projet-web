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
import { CardBackMexique } from '../components/CardBackMexique';
import { MexicoBackdrop } from '../components/MexicoBackdrop';
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

/** le passage sur la Série 2 (Mexique) est inséré à 11 s et dure 3 s */
const MX_AT = 11;
const MX_LEN = 3;
const DURATION = 28;
/** temps du montage d'origine → temps de la vidéo (un début, puis une fin de plage) */
const Va = (x: number) => (x < MX_AT ? x : x + MX_LEN);
const Vb = (x: number) => (x <= MX_AT ? x : x + MX_LEN);
/** temps de la vidéo → temps du montage d'origine ; null pendant le passage du Mexique */
const oldTime = (t: number) => (t < MX_AT ? t : t >= MX_AT + MX_LEN ? t - MX_LEN : null);

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
let CAM = { yaw: 0, pitch: 0, roll: 0, dolly: 0 };

/** Où tombe à l'écran un point de l'espace (les mêmes calculs que le navigateur) ; le 3e nombre : sa profondeur. */
function project(x: number, y: number, z: number): [number, number, number] {
  const r = Math.PI / 180;
  const cy = Math.cos(CAM.yaw * r);
  const sy = Math.sin(CAM.yaw * r);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cp = Math.cos(CAM.pitch * r);
  const sp = Math.sin(CAM.pitch * r);
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  const cr = Math.cos(CAM.roll * r);
  const sr = Math.sin(CAM.roll * r);
  const x3 = x1 * cr - y2 * sr;
  const y3 = x1 * sr + y2 * cr;
  const z3 = z2 + CAM.dolly;
  const w = 1600 / (1600 - z3);
  return [540 + x3 * w, 960 + y3 * w, z3];
}

/** Hélice autour d'un axe vertical de l'espace, projetée : le ruban passe vraiment devant puis derrière. */
function helix3d(cx: number, cy: number, cz: number, radius: number, o: { turns: number; rise: number; phase: number; tilt?: number }) {
  const ct = Math.cos(o.tilt ?? 0);
  const st = Math.sin(o.tilt ?? 0);
  return (u: number): [number, number, number] => {
    const th = o.phase + u * o.turns * Math.PI * 2;
    const x = radius * Math.cos(th);
    const zz = radius * Math.sin(th);
    const y = (0.5 - u) * o.rise;
    const y2 = y * ct - zz * st;
    const z2 = y * st + zz * ct;
    const pt = project(cx + x, cy + y2, cz + z2);
    const axis = project(cx, cy + y2, cz);
    return [pt[0], pt[1], pt[2] - axis[2]];
  };
}

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
  el.style.transform = `perspective(1600px) translateZ(${CAM.dolly.toFixed(1)}px) rotateZ(${CAM.roll.toFixed(2)}deg) rotateX(${CAM.pitch.toFixed(2)}deg) rotateY(${CAM.yaw.toFixed(2)}deg) translate3d(${(f.x ?? 0).toFixed(1)}px, ${(f.y ?? 0).toFixed(1)}px, ${(f.z ?? 0).toFixed(1)}px) rotateX(${(f.rx ?? 0).toFixed(2)}deg) rotateY(${(f.ry ?? 0).toFixed(2)}deg) rotateZ(${(f.rz ?? 0).toFixed(2)}deg) scale(${((f.sx ?? 1) * s).toFixed(4)}, ${s.toFixed(4)})`;
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
function Flip({ card, w, mx = false }: { card: CardFace; w: number; mx?: boolean }) {
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
        {mx ? <CardBackMexique /> : <CardBack />}
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

/** Dos du sachet : le ciel du booster gratuit, le logo et ce qu'il contient. */
function PackBack() {
  return (
    <div className="tr-pack-back">
      <div className="tr-pack-back-logo">
        <Logo />
      </div>
      <div className="tr-pack-back-line">Booster · Série 1</div>
      <div className="tr-pack-back-small">5 cartes · Animaux du monde</div>
    </div>
  );
}

/** Dos du sachet du Mexique : le ciel rouge et les terres vertes de la Série 2. */
function PackBackMexique() {
  return (
    <div className="tr-pack-back tr-pack-back--mx">
      <div className="tr-pack-back-logo">
        <Logo />
      </div>
      <div className="tr-pack-back-line">Booster · Série 2</div>
      <div className="tr-pack-back-small">5 cartes · Mexique</div>
    </div>
  );
}

/** Le sachet en volume : face, dos et une tranche de feuille métallisée. `part` : la bande du haut, le corps, ou tout. */
function Pack3D({ part, art, back = <PackBack />, mx = false }: { part: 'top' | 'body' | 'whole'; art: ReactNode; back?: ReactNode; mx?: boolean }) {
  const clip = part === 'top' ? 'inset(-6% -6% 84% -6%)' : part === 'body' ? 'inset(16% -6% -6% -6%)' : undefined;
  const layers = 11;
  return (
    <div className="tr-pack" style={{ width: PW, height: PH }}>
      {Array.from({ length: layers }, (_, i) => {
        const v = (i / (layers - 1)) * 2 - 1;
        return <div key={i} className={`tr-pack-layer${mx ? ' tr-pack-layer--mx' : ''}`} style={{ clipPath: clip, transform: `translateZ(${(v * (PD / 2 - 1)).toFixed(1)}px) scale(${(1 - 0.02 * v * v * v * v).toFixed(3)})` }} />;
      })}
      <div className="tr-face" style={{ clipPath: clip, transform: `translateZ(${PD / 2}px)` }}>
        {art}
      </div>
      <div className="tr-face" style={{ clipPath: clip, transform: `rotateY(180deg) translateZ(${PD / 2}px)` }}>
        {back}
      </div>
      {part === 'body' && <div className="tr-tear" ref={reg('pk-tear')} />}
    </div>
  );
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

LANDS.forEach((l) => {
  l.a = Va(l.a);
  l.b = Vb(l.b);
});

function lands(t: number) {
  const mxl = els.get('land-mx');
  if (mxl) {
    const on = t >= MX_AT && t < MX_AT + MX_LEN;
    mxl.style.visibility = on ? 'visible' : 'hidden';
    if (on) {
      const k = fx.inOut(fx.seg(t, MX_AT, MX_AT + MX_LEN));
      mxl.style.transform = `perspective(1600px) translateZ(${(CAM.dolly * 0.35).toFixed(1)}px) rotateX(${(CAM.pitch * 0.35).toFixed(2)}deg) rotateY(${(CAM.yaw * 0.35).toFixed(2)}deg) translateZ(-600px) scale(${(1.8 * (1.06 - 0.06 * k)).toFixed(4)})`;
    }
  }
  LANDS.forEach((l, i) => {
    const el = els.get(`land${i}`);
    if (!el) return;
    const on = t >= l.a && t < l.b;
    el.style.visibility = on ? 'visible' : 'hidden';
    if (!on) return;
    const k = fx.inOut(fx.seg(t, l.a, Math.min(l.b, DURATION)));
    // l'affiche est loin derrière les cartes : quand la caméra tourne, elle glisse moins vite (parallaxe)
    const kb = 1 + (fx.lerp(l.from, l.to, k) - 1) * 0.5;
    el.style.transform = `perspective(1600px) translateZ(${(CAM.dolly * 0.35).toFixed(1)}px) rotateZ(${(CAM.roll * 0.35).toFixed(2)}deg) rotateX(${(CAM.pitch * 0.35).toFixed(2)}deg) rotateY(${(CAM.yaw * 0.35).toFixed(2)}deg) translateZ(-600px) scale(${(1.8 * kb).toFixed(4)})`;
  });
}

// ───────────── données des plans ─────────────

const PW = 470;
const PH = (PW * 172) / 120;
const YREST = 60;
/** hauteur de la déchirure (depuis le centre de l'écran) */
const OPEN_Y = YREST - PH / 2 + 0.16 * PH;

/** épaisseur du sachet */
const PD = 30;
/** les cinq cartes sortent en pile, puis tournent en manège au-dessus du sachet ; celle du milieu (2) est la Légendaire */
const RING_Y = OPEN_Y - 300;
const RING_R = 330;
const FLY = [
  { fan: 4, card: face('girafe'), tx: 620, ty: -520, spin: 160 },
  { fan: 0, card: face('crocodile-du-nil'), tx: -640, ty: -420, spin: -170 },
  { fan: 3, card: face('leopard'), tx: 600, ty: 520, spin: 150 },
  { fan: 1, card: face('loup'), tx: -620, ty: 560, spin: -160 },
];
/** lucioles posées dans l'espace autour du sachet */
const MOTES = Array.from({ length: 40 }, (_, i) => {
  const r = fx.rng(900 + i);
  return { x: (r() - 0.5) * 1700, y: (r() - 0.5) * 2600, z: -1000 + r() * 1700, s: 0.5 + r() * 1.1, ph: r() * 10, v: 20 + r() * 50 };
});

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

const RING: CardFace[] = [face('lion'), face('requin-blanc'), face('panda', 'prime'), face('thylacine'), face('tigre', 'reverse'), face('panthere-des-neiges'), face('chat', 'prime'), face('vaquita')];
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

// les temps ci-dessus sont ceux du montage d'origine : on les décale après le passage du Mexique, puis on ajoute le sien
IMPACTS.forEach((e) => (e[0] = Va(e[0])));
PUNCH.forEach((e) => (e[0] = Va(e[0])));
SWALLOW.forEach((e) => {
  e[0] = Va(e[0]);
  e[1] = Va(e[1]);
});
FLASHES.forEach((e) => (e[0] = Va(e[0])));
IMPACTS.push([11, 12], [11.6, 12]);
PUNCH.push([11, 0.06], [11.6, 0.06]);
SWALLOW.push([10.85, 11.0], [13.82, 14.0]);
FLASHES.push([11, 0.8, 0.25, CREAM], [11.6, 0.6, 0.25, '#ffe9b0']);

/** Les mouvements de la caméra, plan par plan (en degrés). */
/** caméra de l'ouverture : [temps, lacet, tangage, travelling avant] */
const BOOSTER_CAM: [number, number, number, number][] = [
  [0, -14, 6, 0],
  [0.5, -10, 6, 0],
  [1.35, 26, 2, 60],
  [2.0, 4, 12, 260],
  [2.4, 4, 0, 130],
  [3.0, -8, -10, 60],
  [3.7, 6, -2, 0],
  [4.0, 2, -2, 0],
];

function camAngles(t: number): { yaw: number; pitch: number; roll: number; dolly?: number } {
  if (t < 4) {
    let i = 0;
    while (i < BOOSTER_CAM.length - 2 && t >= BOOSTER_CAM[i + 1][0]) i++;
    const [t0, y0, p0, d0] = BOOSTER_CAM[i];
    const [t1, y1, p1, d1] = BOOSTER_CAM[i + 1];
    const k = fx.inOut(fx.seg(t, t0, t1));
    return { yaw: fx.lerp(y0, y1, k), pitch: fx.lerp(p0, p1, k), roll: 1.5 * Math.sin(t * 0.5), dolly: fx.lerp(d0, d1, k) };
  }
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
  // le sachet arrive du fond de l'image en tournant sur lui-même (on voit son dos et sa tranche)
  if (t < 0.5) {
    const k = fx.outCubic(fx.seg(t, 0, 0.5));
    return { x: fx.lerp(-260, 0, k), y: fx.lerp(-420, YREST, k), z: fx.lerp(-2600, 0, k), rx: fx.lerp(30, 0, k), ry: fx.lerp(-540, 0, k), rz: fx.lerp(-25, -3, k), s: 1 };
  }
  const d = t - 0.5;
  const charge = fx.seg(t, 1.3, 2.0);
  return {
    x: fx.wobble(t * 60, 1) * 10 * charge,
    y: YREST + Math.sin(d * 3) * 10,
    z: 60 * Math.exp(-d * 6) * Math.sin(d * 16),
    rx: Math.sin(d * 1.4) * 5 + 8 * charge,
    ry: Math.sin(d * 1.8) * 12,
    rz: -3 + Math.sin(d * 1.6) * 2 + fx.wobble(t * 55, 3) * 2.5 * charge,
    s: 1 + 0.04 * charge,
  };
}

/** angle du manège (degrés) : il tourne vite puis ralentit, la Légendaire s'arrête devant nous à 3 s */
const ringAngle = (t: number) => -260 * (1 - fx.outCubic(fx.seg(t, 2.4, 3.0)));

/** une des cinq cartes : en pile dans le sachet, puis sortie, puis en manège autour de l'axe du sachet */
function inRing(i: number, t: number) {
  const rise = fx.outBack(fx.seg(t, 2.0 + i * 0.05, 2.45 + i * 0.05), 1.25);
  const spread = fx.outBack(fx.seg(t, 2.4, 2.85), 1.3);
  const deg = ringAngle(t) + (i - 2) * 72;
  const a = (deg * Math.PI) / 180;
  return {
    x: RING_R * spread * Math.sin(a),
    y: fx.lerp(OPEN_Y + 170, RING_Y, rise) + Math.sin(t * 2.4 + i) * 6 * spread,
    z: RING_R * spread * Math.cos(a) + (i - 2) * -10 * (1 - spread),
    // les cartes gardent le dos tourné vers nous (sinon celles du fond montreraient leur face) en suivant un peu le manège
    ry: 180 + 0.4 * (((((deg + 180) % 360) + 360) % 360) - 180),
    rise,
    depth: Math.cos(a) * spread,
  };
}

function shotBooster(t: number) {
  const b = packBase(Math.min(t, 2));
  // la bande du haut se décolle le long de la déchirure (elle pivote vers l'arrière), puis s'envole
  const peel = els.get('pk-peel');
  const pk = fx.seg(t, 1.35, 1.98);
  if (peel) peel.style.transform = `rotateX(${(62 * fx.inCubic(pk) + 4 * Math.sin(t * 40) * pk * (1 - pk)).toFixed(2)}deg) rotateZ(${(-7 * pk).toFixed(2)}deg)`;
  if (t < 2) put('pk-top', { ...b, zi: 12 });
  else {
    const k = fx.outCubic(fx.seg(t, 2, 2.7));
    put('pk-top', { x: b.x + 620 * k, y: b.y - 640 * k, z: b.z + 650 * k, rx: b.rx + 220 * k, ry: b.ry + 260 * k, rz: b.rz + 90 * k, s: b.s, o: 1 - fx.seg(t, 2.45, 2.7), zi: 12 });
  }
  let by = b.y;
  let bz = b.z;
  let brx = b.rx;
  let bo = 1;
  if (t >= 2) {
    by += 40 * fx.outCubic(fx.seg(t, 2, 2.12)) - 18 * fx.seg(t, 2.12, 2.5);
    // le sachet vide bascule en arrière et tombe dans la profondeur
    const f = fx.seg(t, 3.0, 3.7);
    by += 1100 * fx.inCubic(f);
    bz -= 700 * f;
    brx += 75 * fx.inOut(f);
    bo = 1 - fx.seg(t, 3.5, 3.7);
  }
  put('pk-body', t < 3.7 ? { ...b, y: by, z: bz, rx: brx, o: bo, zi: 10 } : null);
  const tear = els.get('pk-tear');
  if (tear) {
    tear.style.transform = `translateZ(${PD / 2 + 2}px) scaleX(${fx.seg(t, 1.35, 1.95).toFixed(3)})`;
    tear.style.opacity = t < 2.03 ? '1' : '0';
  }

  // des lucioles posées dans l'espace : elles glissent à des vitesses différentes quand la caméra tourne
  MOTES.forEach((m, i) => {
    if (t >= 4.3) return put(`mote${i}`, null);
    const y = ((((m.y - m.v * t + 1300) % 2600) + 2600) % 2600) - 1300;
    put(`mote${i}`, { x: m.x + Math.sin(t * 0.8 + m.ph) * 40, y, z: m.z, s: m.s * (0.75 + 0.25 * Math.sin(t * 3 + m.ph)), o: 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.2 + m.ph)), zi: m.z > 250 ? 45 : 4 });
  });

  // quatre cartes quittent le manège et foncent vers nous en se retournant
  FLY.forEach((c, j) => {
    const k = `fly${j}`;
    if (t < 2.0) return put(k, null);
    const T = 3.02 + 0.13 * j;
    const r = inRing(c.fan, Math.min(t, T));
    const p = fx.seg(t, T, T + 0.5);
    if (p >= 1) return put(k, null);
    put(k, {
      x: r.x + c.tx * Math.pow(p, 1.6),
      y: r.y + c.ty * Math.pow(p, 1.8),
      z: r.z + 1250 * Math.pow(p, 1.5),
      s: 0.8,
      ry: r.ry + 180 * fx.outCubic(p),
      rz: c.spin * p,
      rx: 30 * p,
      zi: r.rise < 0.35 ? 8 : p > 0 ? 30 + j : 12 + Math.round(r.depth * 5),
      blur: p > 0.55 ? (p - 0.55) * 16 : 0,
    });
  });

  // la carte du milieu : face cachée, elle s'avance vers nous… puis se retourne : Légendaire
  const HY = -110;
  if (t < 2.0 || t >= 7.0) put('hero', null);
  else if (t < 4.0) {
    const r = inRing(2, Math.min(t, 3.05));
    const k = fx.inOut(fx.seg(t, 3.05, 3.65));
    const squash = fx.seg(t, 3.85, 4.0);
    const tremble = fx.seg(t, 3.6, 4.0);
    put('hero', {
      x: r.x * (1 - k) + fx.wobble(t * 50, 9) * 4 * tremble,
      y: fx.lerp(r.y, HY, k),
      z: fx.lerp(r.z, 150, k),
      s: fx.lerp(0.46, 1, k) * (1 - 0.06 * squash),
      ry: fx.lerp(r.ry, 180, k) + Math.sin((t - 2) * 2.6) * 16 * k,
      rx: Math.sin((t - 2) * 2.1) * 10 * k,
      zi: r.rise < 0.35 ? 9 : 13 + Math.round(r.depth * 5),
    });
  } else if (t < 5.0) {
    const f = fx.seg(t, 4.0, 4.34);
    const ry = t < 4.34 ? 180 * (1 - fx.outBack(f, 1.3)) : Math.sin((t - 4.34) * 3) * 9;
    put('hero', { y: HY, z: 150 + 220 * Math.sin(Math.PI * f) - 30 * fx.seg(t, 4.34, 4.6), s: 0.94 + 0.06 * fx.outBack(f) + 0.015 * Math.sin((t - 4) * 4), ry, rx: 22 * Math.sin(Math.PI * f) + Math.sin(t * 2.3) * 6, zi: 15 });
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
  if (t < 4.0) {
    // les effets suivent le sachet tel que la caméra le voit
    const P = project(0, YREST, 0);
    const O = project(0, OPEN_Y, 0);
    fx.glow(c, P[0], P[1], 760, '#ffd9a0', 0.25 + 0.45 * charge);
    fx.rays(c, P[0], P[1] - 120, 14, t * 0.25, '#fff0cf', 0.04 + 0.1 * charge);
    fx.stream(c, t, { seed: 3, n: 30, kind: 'ember', colors: FIREFLY, vx: 10, vy: -40, size: 4, sway: 30, alpha: 0.6 });
    if (t < 2.0) fx.speedLines(c, P[0], P[1] - 120, Math.floor(t * 15), 70, 470, 0.35 * charge, CREAM);
    // la lumière s'enroule vraiment autour du sachet (une hélice dans l'espace, vue par la caméra)
    if (t > 0.45 && t < 2.1)
      FX_PACK.forEach((colors, i) => {
        const path = helix3d(0, YREST, 0, 380, { turns: 1.8, rise: 860, phase: i * 2.1, tilt: 0.14 });
        fx.ribbon(c, f, path, fx.seg(t, 0.5 + i * 0.15, 2.0 + i * 0.05) * 1.55, { colors, width: [56, 42, 32][i], len: 0.55 });
      });
    if (t >= 2.0) {
      // le faisceau qui sort du sachet ouvert
      const a = Math.max(Math.exp(-(t - 2) * 3.2), fx.seg(t, 2.9, 3.6) * 0.6) * (1 - fx.seg(t, 3.4, 3.7) * 0.6);
      const w = 140 + 240 * a;
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(0, O[1], 0, 0);
      g.addColorStop(0, `rgba(255,240,207,${0.85 * a})`);
      g.addColorStop(1, 'rgba(255,211,107,0)');
      c.fillStyle = g;
      c.fillRect(O[0] - w / 2, 0, w, O[1]);
      c.restore();
      fx.glow(c, O[0], O[1], 520, '#fff0cf', a * 0.8);
    }
    // la traînée de lumière du manège de cartes
    if (t >= 2.4 && t < 3.3) {
      const aHero = (ringAngle(t) * Math.PI) / 180;
      const head = t < 3.0 ? fx.seg(t, 2.4, 2.6) : 1 + 0.75 * fx.seg(t, 3.0, 3.25);
      [
        [HONEY, '#fff3cf'],
        [LICHEN, '#f0ffd8'],
      ].forEach((colors, i) => {
        const path = helix3d(0, RING_Y + 150 + i * 40, 0, RING_R * (1.05 + i * 0.1), { turns: 1, rise: 0, phase: Math.PI / 2 - aHero + i * 0.6 });
        fx.ribbon(c, f, path, head, { colors: colors as [string, string], width: i ? 30 : 44, len: 0.75 });
      });
    }
    fx.ring(f, P[0], P[1], t, 0.5, 0.5, 600, '#fff0cf', 26);
    fx.ring(f, O[0], O[1], t, 2.0, 0.6, 950, CREAM, 44);
    fx.burst(f, t, 2.0, { seed: 11, n: 60, x: O[0], y: O[1], speed: 2200, gravity: 700, life: 1.1, size: 15, kind: 'spark', colors: [CREAM, HONEY, LICHEN] });
    fx.burst(f, t, 2.0, { seed: 13, n: 26, x: O[0], y: O[1], speed: 1600, gravity: 900, life: 1.4, size: 16, kind: 'leaf', colors: ['#7d9a6a', LICHEN, '#c9e29a'] });
    const Hh = project(0, -110, 150);
    fx.glow(c, Hh[0], Hh[1], 700, '#ffe7bd', fx.seg(t, 3.1, 4.0) * 0.75);
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

// ───────────── plan 3 bis : la Série 2, le Mexique ─────────────
// Le booster du Mexique arrive en tournant, s'ouvre, et cinq cartes de la Série 2 se déploient en éventail.
// La vaquita (Légendaire) : « on n'en a compté que 6 à 8 en 2024 » (data/athletes.ts) ; 110 espèces dans la série.

const MX_CARDS: CardFace[] = [face('condor-de-californie'), face('mx-aigle-royal'), face('vaquita'), face('xoloitzcuintle'), face('grizzli-du-mexique')];
const MX_PACK_Y = 300;
const MX_PINK = '#e8417d';
const MX_GOLD = '#ffd166';
const MX_TEAL = '#7fe0d0';
const MX_MARIGOLD = '#ff9f1c';

/** caméra du Mexique : elle glisse de gauche à droite en se rapprochant */
function mexCam(u: number) {
  const k = fx.inOut(fx.seg(u, 0, 3));
  return { yaw: fx.lerp(-16, 10, k), pitch: fx.lerp(9, 2, k), roll: 0, dolly: 90 * k };
}

function shotMexique(u: number) {
  slide('mx-eye', u, 0.03, 0, -885);
  slam('mx-title', u, 0.08, 0, -715, { from: 2.4, drift: 0.02, z: 40 });
  const k = fx.outCubic(fx.seg(u, 0.05, 0.55));
  const bump = Math.exp(-Math.max(0, u - 0.6) * 9) * (u >= 0.6 ? 1 : 0);
  put('mx-pack', {
    x: fx.lerp(260, 0, k),
    y: fx.lerp(-300, MX_PACK_Y, k) + Math.sin(u * 3) * 8,
    z: fx.lerp(-2400, 0, k),
    ry: fx.lerp(540, 0, k) + Math.sin(u * 1.9) * 10,
    rx: fx.lerp(-30, 0, k) + 6,
    rz: fx.lerp(25, 3, k),
    s: 0.8 * (1 + 0.08 * bump),
    zi: 10,
  });
  MX_CARDS.forEach((_, i) => {
    const e = fx.outBack(fx.seg(u, 0.6 + Math.abs(i - 2) * 0.05, 1.0 + Math.abs(i - 2) * 0.05), 1.3);
    if (u < 0.6) return put(`mx-c${i}`, null);
    const center = i === 2;
    put(`mx-c${i}`, {
      x: (i - 2) * 200 * e,
      y: fx.lerp(MX_PACK_Y, -230 + Math.abs(i - 2) * 30, e) + Math.sin(u * 2.2 + i) * 6,
      z: (center ? 90 : -Math.abs(i - 2) * 110) * e,
      ry: (i - 2) * -24 * e + Math.sin(u * 1.6 + i) * 6,
      rz: (i - 2) * 7 * e,
      s: fx.lerp(0.3, center ? 0.92 : 0.78, e),
      zi: center ? 20 : 16 - Math.abs(i - 2),
    });
  });
  glare('mx-c2', ((u - 1) * 110) % 170 - 35);
  pop('mx-chip', u, 1.1, 0, 655);
  pop('mx-fact', u, 1.5, 0, -40, { zi: 75, rz: -3 });
}

function bgMexique(c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, u: number) {
  const P = project(0, MX_PACK_Y, 0);
  fx.glow(c, P[0], P[1], 800, '#ffc38a', 0.35);
  fx.glow(c, 540, 730, 700, MX_PINK, 0.18 + 0.2 * fx.seg(u, 0.6, 1.0));
  fx.rays(c, 540, 700, 16, u * 0.4, '#fff3dc', 0.1);
  fx.stream(c, u + 11, { seed: 121, n: 40, kind: 'petal', colors: [MX_MARIGOLD, '#ffb703', MX_PINK], vx: 60, vy: 230, size: 15, sway: 50 });
  fx.stream(c, u + 11, { seed: 122, n: 26, kind: 'ember', colors: FIREFLY, vx: 0, vy: -60, size: 5, sway: 30 });
  const cols: [string, string][] = [
    [MX_PINK, '#ffd6e6'],
    [MX_GOLD, '#fff6dc'],
    [MX_TEAL, '#ffffff'],
  ];
  cols.forEach((colors, i) => {
    const path = helix3d(0, MX_PACK_Y - 80, 0, 400, { turns: 1.6, rise: 900, phase: i * 2.1, tilt: 0.12 });
    fx.ribbon(c, f, path, fx.seg(u, 0.1 + i * 0.1, 1.4 + i * 0.1) * 1.55, { colors, width: [64, 50, 38][i], len: 0.55 });
  });
  fx.ring(f, P[0], P[1] - 200, u, 0.6, 0.6, 900, MX_GOLD, 40);
  fx.burst(f, u, 0.6, { seed: 123, n: 110, x: P[0], y: P[1] - 200, speed: 2300, gravity: 1100, life: 1.8, size: 13, kind: 'confetti', colors: [MX_PINK, MX_TEAL, MX_GOLD, '#2a9d8f', MX_MARIGOLD], drag: 2 });
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

const SHOTS_OLD: { k: string; a: number; b: number; draw: (c: CanvasRenderingContext2D, f: CanvasRenderingContext2D, t: number) => void; run: (t: number) => void }[] = [
  { k: 'shot-a', a: 0, b: 7.0, draw: bgBooster, run: shotBooster },
  { k: 'shot-b', a: 7.0, b: 11.0, draw: bgMontage, run: shotMontage },
  { k: 'shot-c', a: 11.0, b: 13.0, draw: bgRares, run: shotRares },
  { k: 'shot-d', a: 13.0, b: 17.0, draw: bgDuel, run: shotDuel },
  { k: 'shot-e', a: 17.0, b: 19.5, draw: bgReserve, run: shotReserve },
  { k: 'shot-f', a: 19.5, b: DURATION + 1, draw: bgFinale, run: shotFinale },
];
const SHOTS = [
  ...SHOTS_OLD.map((s) => ({ ...s, a: Va(s.a), b: Vb(s.b), local: oldTime })),
  { k: 'shot-mx', a: MX_AT, b: MX_AT + MX_LEN, draw: bgMexique, run: shotMexique, local: (t: number) => t - MX_AT },
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
  const to = oldTime(t);
  const cam = to === null ? mexCam(t - MX_AT) : camAngles(to);
  CAM = { ...cam, dolly: cam.dolly ?? 0 };
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
    const lt = s.local(t) ?? 0;
    s.run(lt);
    if (bg && fg) s.draw(bg, fg, lt);
  }
  if (fg) {
    for (const [ti, a, d, col] of FLASHES) if (t >= ti && t < ti + d) fx.flash(fg, a * (1 - (t - ti) / d), col);
    const g = fg.createRadialGradient(540, 960, 560, 540, 960, 1450);
    g.addColorStop(0, 'rgba(8,14,11,0)');
    g.addColorStop(1, 'rgba(8,14,11,0.55)');
    fg.fillStyle = g;
    fg.fillRect(0, 0, fx.W, fx.H);
  }
  for (const draw of draws) draw(to ?? MX_AT);
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
        <div className="tr-land" ref={reg('land-mx')}>
          <MexicoBackdrop scene="volcanes" seed="bande-annonce-mexique" />
        </div>
        <canvas className="tr-cv" ref={back} width={fx.W} height={fx.H} style={{ zIndex: 0 }} />

        <section className="tr-shot" ref={reg('shot-a')}>
          {MOTES.map((_, i) => (
            <Ob key={i} k={`mote${i}`} z={4}>
              <i className="tr-mote" />
            </Ob>
          ))}
          <Ob k="pk-body">
            <Pack3D part="body" art={packArt} />
          </Ob>
          <Ob k="pk-top">
            <div className="tr-peel" ref={reg('pk-peel')} style={{ width: PW, height: PH }}>
              <Pack3D part="top" art={packArt} />
            </div>
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

        <section className="tr-shot" ref={reg('shot-mx')}>
          <Ob k="mx-pack">
            <Pack3D part="whole" art={<PackArt tone="mexique" name="Booster gratuit" size={5} />} back={<PackBackMexique />} mx />
          </Ob>
          {MX_CARDS.map((card, i) => (
            <Ob key={i} k={`mx-c${i}`}>
              <Flip card={card} w={300} mx />
            </Ob>
          ))}
          <Eyebrow k="mx-eye" text="Nouveau · Série 2" />
          <Slam k="mx-title" lines={['Mexique']} size={190} fill={`linear-gradient(180deg, #fff6dc 0%, ${MX_GOLD} 45%, ${MX_PINK} 100%)`} stroke="#2a0a1c" />
          <Ob k="mx-chip" z={70}>
            <span className="tr-chip">
              <b>110</b> nouvelles espèces
            </span>
          </Ob>
          <Tag k="mx-fact" text="Vaquita : il en reste moins de 10" bg={MX_PINK} ink="#fff8ec" size={38} />
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
