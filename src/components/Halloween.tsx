import { memo, useId, useMemo, type ReactNode } from 'react';
import { circle, ellipse, f, mulberry32, poly, type Pt, type Rng } from '../art/kit';
import { isHalloween } from '../engine/season';
import { useNow } from '../hooks/useNow';
import { Calavera, Glow, Marigolds, candle, timing } from './MexicoBackdrop';

// Décor de la saison d'Halloween et du Jour des morts (du 20 octobre au 1er novembre, voir engine/season.ts) :
// une guirlande de cempasúchil sous la barre du haut, des citrouilles qui luisent, des bougies et des calaveras,
// une toile d'araignée dans le coin de chaque en-tête. Rien ne gêne la lecture : tout reste dans les marges, le ciel
// des en-têtes et le fond. Hors saison, ces composants n'affichent rien.
// Les flammes et les lueurs reprennent les animations des décors du Mexique (classe mx-scene, voir motion.css).

/** La saison est-elle ouverte ? (relu chaque minute) */
export function useHalloween(): boolean {
  return isHalloween(useNow(60_000));
}

/** Citrouille sculptée posée en (x, y), le visage éclairé de l'intérieur. */
function pumpkin(key: number, id: string, x: number, y: number, s: number, r: Rng): ReactNode {
  const at = (a: number, b: number): Pt => [x + a * s, y + b * s];
  const eyes = poly([at(-3, -5.6), at(-1.2, -5.6), at(-2.1, -7.2)]) + poly([at(1.2, -5.6), at(3, -5.6), at(2.1, -7.2)]);
  const mouth = poly([at(-3.4, -3.6), at(-2.2, -2.8), at(-1.2, -3.4), at(0, -2.6), at(1.2, -3.4), at(2.2, -2.8), at(3.4, -3.6), at(2.4, -1.6), at(0, -1.1), at(-2.4, -1.6)]);
  return (
    <g key={key}>
      <circle className="mx-glow" cx={x} cy={y - 4 * s} r={9 * s} fill={`url(#${id}-pumpkin)`} style={timing(2.2 + r(), r() * 3)} />
      <path d={ellipse(x - 2.6 * s, y - 4 * s, 3.6 * s, 4 * s) + ellipse(x + 2.6 * s, y - 4 * s, 3.6 * s, 4 * s)} fill="#d9661b" />
      <path d={ellipse(x, y - 4.1 * s, 3.8 * s, 4.2 * s)} fill="#f08a2a" />
      <path d={`M${f(x - 1.4 * s)} ${f(y - 8 * s)}Q${f(x - 1.8 * s)} ${f(y - 4 * s)} ${f(x - 1.4 * s)} ${f(y - 0.2)}M${f(x + 1.4 * s)} ${f(y - 8 * s)}Q${f(x + 1.8 * s)} ${f(y - 4 * s)} ${f(x + 1.4 * s)} ${f(y - 0.2)}`} fill="none" stroke="#b9530f" strokeWidth={0.35 * s} opacity={0.6} />
      <path d={`M${f(x - 0.5 * s)} ${f(y - 8 * s)}Q${f(x - 0.2 * s)} ${f(y - 10.2 * s)} ${f(x + 1.2 * s)} ${f(y - 10.6 * s)}L${f(x + 1.4 * s)} ${f(y - 9.8 * s)}Q${f(x + 0.6 * s)} ${f(y - 9.4 * s)} ${f(x + 0.6 * s)} ${f(y - 8 * s)}Z`} fill="#4f6a2a" />
      <path className="mx-glow" d={eyes + mouth} fill="#ffd36b" style={timing(1.6 + r(), r() * 2)} />
    </g>
  );
}

/** Toile d'araignée accrochée dans un coin (cx, cy), dont les rayons partent vers le bas et du côté `toward`. */
export function cobweb(cx: number, cy: number, size: number, toward: 1 | -1): string {
  const spokes = 6;
  const angles = Array.from({ length: spokes }, (_, k) => (Math.PI / 2) * (k / (spokes - 1)));
  const point = (a: number, d: number): Pt => [cx + toward * Math.sin(a) * d, cy + Math.cos(a) * d];
  let d = '';
  for (const a of angles) {
    const [x, y] = point(a, size);
    d += `M${f(cx)} ${f(cy)}L${f(x)} ${f(y)}`;
  }
  for (const ring of [0.3, 0.5, 0.7, 0.9]) {
    for (let k = 0; k < spokes - 1; k++) {
      const [x1, y1] = point(angles[k], size * ring);
      const [x2, y2] = point(angles[k + 1], size * ring);
      const [mx, my] = point((angles[k] + angles[k + 1]) / 2, size * ring * 0.86);
      d += `M${f(x1)} ${f(y1)}Q${f(mx)} ${f(my)} ${f(x2)} ${f(y2)}`;
    }
  }
  return d;
}

/** Araignée suspendue à son fil, qui monte et descend doucement. */
export function spider(x: number, top: number, drop: number, s: number): ReactNode {
  let legs = '';
  for (const side of [-1, 1]) {
    for (const [ax, ay, bx, by] of [
      [1.2, -0.6, 3.2, -2.4],
      [1.4, -0.1, 3.6, -0.6],
      [1.4, 0.4, 3.4, 1.4],
      [1.1, 0.9, 2.8, 2.8],
    ]) {
      legs += `M${f(x + side * ax * s)} ${f(top + drop + ay * s)}Q${f(x + side * (ax + bx) * 0.6 * s)} ${f(top + drop + (ay - 1.2) * s)} ${f(x + side * bx * s)} ${f(top + drop + by * s)}`;
    }
  }
  return (
    <g className="hw-spider">
      <path d={`M${f(x)} ${f(top)}V${f(top + drop)}`} stroke="rgba(255, 250, 240, 0.55)" strokeWidth={0.35} />
      <path d={legs} fill="none" stroke="#120a1c" strokeWidth={0.5 * s} strokeLinecap="round" />
      <path d={ellipse(x, top + drop + 0.4 * s, 1.5 * s, 1.8 * s) + circle(x, top + drop - 1.4 * s, 0.9 * s)} fill="#120a1c" />
      <path d={circle(x - 0.35 * s, top + drop - 1.5 * s, 0.22 * s) + circle(x + 0.35 * s, top + drop - 1.5 * s, 0.22 * s)} fill="#ff8a3d" />
    </g>
  );
}

/**
 * Guirlande de cempasúchil, en motif qui se répète sur toute la largeur d'un en-tête : à chaque festonnage, la
 * ficelle pend un peu et porte une rangée de pompons orange et jaunes.
 */
export const GARLAND_TILE = (() => {
  const w = 96;
  const colors = ['#f7a21b', '#ffbf3f', '#f37b20', '#ffd166'];
  let flowers = '';
  let hearts = '';
  for (let k = 0; k <= 24; k++) {
    const t = k / 24;
    const x = w * t;
    const y = 4 + 10 * 4 * t * (1 - t);
    flowers += `<circle cx="${f(x)}" cy="${f(y)}" r="2.6" fill="${colors[k % colors.length]}"/>`;
    hearts += `<circle cx="${f(x + 0.3)}" cy="${f(y + 0.5)}" r="1" fill="#9c4a0c" fill-opacity="0.35"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 20" width="${w}" height="20">${flowers}${hearts}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

// ───────────── le pied de la page : citrouilles, cempasúchil et bougies ─────────────

/** Citrouilles, cempasúchil et bougies posés dans les deux coins du bas de l'écran. */
function Corners({ className }: { className: string }) {
  const id = `hc${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const corners = useMemo(() => {
    const r = mulberry32(7);
    const scene = (flip: boolean) => (
      <>
        <Marigolds list={[[10, 58, 2.6], [16, 60, 2.2], [24, 59, 2.8], [31, 61, 2.1], [52, 60, 2.4], [60, 58, 2.9], [68, 61, 2.2], [76, 59, 2.6]]} />
        {pumpkin(1, id, flip ? 62 : 22, 60, 1.25, r)}
        {pumpkin(2, id, flip ? 30 : 46, 61, 0.85, r)}
        {candle(3, id, flip ? 12 : 72, 61, 6, r)}
        {candle(4, id, flip ? 44 : 34, 62, 4, r)}
      </>
    );
    return { left: scene(false), right: scene(true) };
  }, [id]);
  return (
    <>
      {(['left', 'right'] as const).map((side) => (
        <svg key={side} className={`mx-scene hw-corner hw-corner--${side} ${className}`} viewBox="0 30 86 34">
          <defs>
            <Glow id={id} name="flame" color="#ffb347" />
            <Glow id={id} name="pumpkin" color="#ff9a3c" opacity={0.8} />
          </defs>
          {corners[side]}
        </svg>
      ))}
    </>
  );
}

/** Calque fixe derrière le contenu, au-dessus du sous-bois du fond (même place que les lucioles). */
export const HalloweenNight = memo(function HalloweenNight() {
  const halloween = useHalloween();
  if (!halloween) return null;
  return (
    <div className="hw-night" aria-hidden="true">
      <Corners className="hw-corner--back" />
    </div>
  );
});

/**
 * Calque fixe devant le contenu, sous les barres et les fenêtres : sur téléphone, où le contenu couvre tout le fond,
 * les citrouilles et les bougies des coins s'y posent sur la barre du bas. Rien n'y capte les clics.
 */
export const HalloweenFlyover = memo(function HalloweenFlyover() {
  const halloween = useHalloween();
  if (!halloween) return null;
  return (
    <div className="hw-flyover" aria-hidden="true">
      <Corners className="hw-corner--front" />
    </div>
  );
});

// ───────────── les barres du haut et du bas ─────────────

/** Guirlande de cempasúchil qui pend sous la barre du haut. */
export function HalloweenGarland() {
  const halloween = useHalloween();
  if (!halloween) return null;
  return <div className="hw-garland" aria-hidden="true" style={{ backgroundImage: GARLAND_TILE }} />;
}

/** Petite citrouille sculptée : la marque du logo sur téléphone, pendant la saison. */
export function PumpkinMark({ className = '' }: { className?: string }) {
  const at = (a: number, b: number): Pt => [a, b];
  const eyes = poly([at(-3, -5.6), at(-1.2, -5.6), at(-2.1, -7.2)]) + poly([at(1.2, -5.6), at(3, -5.6), at(2.1, -7.2)]);
  const mouth = poly([at(-3.4, -3.6), at(-2.2, -2.8), at(-1.2, -3.4), at(0, -2.6), at(1.2, -3.4), at(2.2, -2.8), at(3.4, -3.6), at(2.4, -1.6), at(0, -1.1), at(-2.4, -1.6)]);
  return (
    <svg className={`pumpkin-mark ${className}`} viewBox="-6.6 -11 13.2 11.4" aria-hidden="true">
      <path d={ellipse(-2.6, -4, 3.6, 4) + ellipse(2.6, -4, 3.6, 4)} fill="#d9661b" />
      <path d={ellipse(0, -4.1, 3.8, 4.2)} fill="#f08a2a" />
      <path d="M-0.5 -8Q-0.2 -10.2 1.2 -10.6L1.4 -9.8Q0.6 -9.4 0.6 -8Z" fill="#4f6a2a" />
      <path d={eyes + mouth} fill="#ffd36b" />
    </svg>
  );
}

// ───────────── le ciel des en-têtes : pendeloques, toile d'araignée ─────────────

/**
 * Décor posé dans le ciel d'un en-tête illustré : une calavera et une citrouille en pendeloques à gauche, une toile et
 * une araignée à droite. Tout reste dans le haut de l'en-tête, au-dessus du titre et des boutons. Sur l'accueil, la
 * toile seule (`pendants` faux) : les pendeloques passeraient sur le booster.
 */
export function HalloweenHead({ seed = 'en-tête', pendants = true }: { seed?: string; pendants?: boolean }) {
  const halloween = useHalloween();
  const id = `hh${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const art = useMemo(() => {
    const r = mulberry32([...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7));
    return {
      pendants: (
        <>
          <path d="M24 0V15 M60 0V22" stroke="rgba(255, 250, 240, 0.45)" strokeWidth={0.35} />
          <Calavera x={24} y={22} s={0.62} accent="#e4407b" />
          {pumpkin(1, id, 60, 33, 0.85, r)}
        </>
      ),
      corner: (
        <>
          <path d={cobweb(100, 0, 30, -1)} fill="none" stroke="rgba(255, 250, 240, 0.42)" strokeWidth={0.35} />
          {spider(84, 4, 20, 1.1)}
        </>
      ),
    };
  }, [id, seed]);
  if (!halloween) return null;
  return (
    <div className="hw-head" aria-hidden="true">
      {pendants && (
        <svg className="mx-scene hw-head__pendants" viewBox="0 0 80 40">
          <defs>
            <Glow id={id} name="pumpkin" color="#ff9a3c" opacity={0.8} />
          </defs>
          {art.pendants}
        </svg>
      )}
      <svg className="mx-scene hw-head__corner" viewBox="0 0 100 45">
        {art.corner}
      </svg>
    </div>
  );
}

// ───────────── l'annonce de la saison, sur l'accueil ─────────────

export function HalloweenBanner() {
  const halloween = useHalloween();
  const id = `hb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const art = useMemo(() => {
    const r = mulberry32(11);
    return (
      <>
        <path d={`M0 52Q50 46 100 52V60H0Z`} fill="#1b1030" />
        <Marigolds list={[[8, 51, 2.4], [14, 53, 2], [86, 51, 2.5], [92, 53, 2.1], [60, 52, 1.8], [40, 52, 1.8]]} />
        {pumpkin(1, id, 30, 53, 1.7, r)}
        <Calavera x={62} y={50} s={1.3} accent="#2fb5a8" />
        {candle(2, id, 46, 53, 7, r)}
        {candle(3, id, 78, 53, 5, r)}
      </>
    );
  }, [id]);
  if (!halloween) return null;
  return (
    <section className="panel hw-banner" aria-labelledby="hw-title">
      <svg className="mx-scene hw-banner__art" viewBox="0 0 100 60" aria-hidden="true">
        <defs>
          <Glow id={id} name="flame" color="#ffb347" />
          <Glow id={id} name="pumpkin" color="#ff9a3c" opacity={0.8} />
          <radialGradient id={`${id}-moon`}>
            <stop offset="0" stopColor="#ffb35c" stopOpacity={0.55} />
            <stop offset="1" stopColor="#ffb35c" stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx={50} cy={20} r={26} fill={`url(#${id}-moon)`} />
        <circle cx={50} cy={20} r={10} fill="#ffb35c" />
        {art}
      </svg>
      <div className="hw-banner__text">
        <p className="eyebrow">Halloween · Jour des morts</p>
        <h2 id="hw-title">Nuit des citrouilles et fête des morts</h2>
        <p className="muted">
          Jusqu’au 1er novembre, le jeu se pare d’orange et de cempasúchil, et la radio ne joue que ses trois morceaux de saison :
          « Nuit des citrouilles », « Valse des calaveras » et « Bal des squelettes ». Le 1er novembre, jour des morts au Mexique, la
          Série 2 · Mexique arrive.
        </p>
      </div>
    </section>
  );
}
