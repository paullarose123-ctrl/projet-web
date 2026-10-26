import { memo, useId, useMemo, type CSSProperties, type ReactNode } from 'react';
import { circle, ellipse, f, mulberry32, poly, type Pt, type Rng } from '../art/kit';
import { isHalloween } from '../engine/season';
import { useNow } from '../hooks/useNow';
import { Calavera, Glow, Marigolds, candle, timing } from './MexicoBackdrop';

// Décor de la saison d'Halloween et du Jour des morts (du 20 octobre au 1er novembre, voir engine/season.ts) :
// des chauves-souris qui traversent le ciel du jeu, des citrouilles qui luisent, des fleurs de cempasúchil,
// des bougies et des calaveras, une toile d'araignée dans le coin de chaque écran. Rien ne gêne la lecture :
// tout reste dans les marges, le ciel des en-têtes et le fond. Hors saison, ces composants n'affichent rien.
// Les flammes et les lueurs reprennent les animations des décors du Mexique (classe mx-scene, voir motion.css).

/** La saison est-elle ouverte ? (relu chaque minute) */
export function useHalloween(): boolean {
  return isHalloween(useNow(60_000));
}

/** Chauve-souris ailes ouvertes, centrée sur son corps (envergure 24). */
const BAT =
  'M0 -1.6C0.8 -2.8 2 -2.8 2.6 -1.5C4.8 -4.4 8.6 -5 12 -3.2C10.3 -2.6 9.6 -1.2 9.8 0.4C8.4 -0.6 7 -0.4 6.2 0.9C5.4 -0.1 4 -0.1 3 1.1C2.1 0.5 1 0.6 0 1.9C-1 0.6 -2.1 0.5 -3 1.1C-4 -0.1 -5.4 -0.1 -6.2 0.9C-7 -0.4 -8.4 -0.6 -9.8 0.4C-9.6 -1.2 -10.3 -2.6 -12 -3.2C-8.6 -5 -4.8 -4.4 -2.6 -1.5C-2 -2.8 -0.8 -2.8 0 -1.6Z' +
  'M-1.2 -2.2L-1.6 -3.9L-0.4 -2.5Z M1.2 -2.2L1.6 -3.9L0.4 -2.5Z';

/** Une chauve-souris qui bat des ailes (à placer dans un SVG). */
function bat(key: number, x: number, y: number, s: number, r: Rng, color = '#160c22'): ReactNode {
  return (
    <g key={key} transform={`translate(${f(x)} ${f(y)}) scale(${s.toFixed(2)})`}>
      <g className="mx-fly" style={timing(5 + r() * 4, r() * 6, { ['--drift' as string]: `${f(3 + r() * 5)}px` })}>
        <path className="hw-flap" d={BAT} fill={color} style={timing(0.28 + r() * 0.14, r())} />
      </g>
    </g>
  );
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
function cobweb(cx: number, cy: number, size: number, toward: 1 | -1): string {
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
function spider(x: number, top: number, drop: number, s: number): ReactNode {
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
const GARLAND_TILE = (() => {
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

// ───────────── le ciel du jeu : chauves-souris qui le traversent, citrouilles au pied de la page ─────────────

/** Des chauves-souris qui traversent le calque de gauche à droite, à des hauteurs et des vitesses variées. */
function BatFlight({ count, seed, top = 46 }: { count: number; seed: number; top?: number }) {
  const flight = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({ length: count }, () => ({
      top: `${(4 + r() * top).toFixed(1)}%`,
      ['--dur' as string]: `${(26 + r() * 22).toFixed(1)}s`,
      ['--delay' as string]: `${(-r() * 40).toFixed(1)}s`,
      ['--rise' as string]: `${Math.round(-30 - r() * 60)}px`,
      ['--size' as string]: `${Math.round(22 + r() * 22)}px`,
    })) as CSSProperties[];
  }, [count, seed, top]);
  return (
    <>
      {flight.map((style, i) => (
        <svg key={i} className="hw-bat" style={style} viewBox="-13 -6 26 9">
          <path className="hw-flap" d={BAT} />
        </svg>
      ))}
    </>
  );
}

/** Calque fixe derrière le contenu, au-dessus du sous-bois du fond (même place que les lucioles). */
export const HalloweenNight = memo(function HalloweenNight() {
  const halloween = useHalloween();
  const id = `hw${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
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
  if (!halloween) return null;
  return (
    <div className="hw-night" aria-hidden="true">
      <BatFlight count={7} seed={31} />
      {(['left', 'right'] as const).map((side) => (
        <svg key={side} className={`mx-scene hw-corner hw-corner--${side}`} viewBox="0 30 86 34">
          <defs>
            <Glow id={id} name="flame" color="#ffb347" />
            <Glow id={id} name="pumpkin" color="#ff9a3c" opacity={0.8} />
          </defs>
          {corners[side]}
        </svg>
      ))}
    </div>
  );
});

// ───────────── le ciel des en-têtes : guirlande, toile d'araignée, chauves-souris ─────────────

/**
 * Décor posé dans le ciel d'un en-tête illustré : une guirlande de cempasúchil qui festonne sur toute la largeur,
 * une calavera et une citrouille en pendeloques à gauche, une toile, une araignée et trois chauves-souris à droite.
 * Tout reste dans le haut de l'en-tête, au-dessus du titre et des boutons. Sur l'accueil (`garland` faux), seul le
 * coin droit, pour ne pas passer sous les textes.
 */
export function HalloweenHead({ seed = 'en-tête', garland = true }: { seed?: string; garland?: boolean }) {
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
          {bat(1, 42, 14, 0.55, r)}
          {bat(2, 62, 28, 0.4, r)}
          {bat(3, 24, 32, 0.32, r)}
        </>
      ),
    };
  }, [id, seed]);
  if (!halloween) return null;
  return (
    <div className="hw-head" aria-hidden="true">
      {garland && <div className="hw-head__garland" style={{ backgroundImage: GARLAND_TILE }} />}
      {garland && (
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
        {bat(4, 74, 16, 0.5, r, '#2a1a3e')}
        {bat(5, 18, 22, 0.38, r, '#2a1a3e')}
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
          Jusqu’au 1er novembre, le jeu se pare d’orange et de cempasúchil, et la radio joue deux morceaux de saison : « Nuit des
          citrouilles » et « Valse des calaveras ». Le 1er novembre, jour des morts au Mexique, la Série 2 · Mexique arrive.
        </p>
      </div>
    </section>
  );
}

// ───────────── derrière l'ouverture d'un booster ─────────────

/** Des chauves-souris qui passent devant le paysage d'une ouverture de booster. */
export function HalloweenOpening() {
  const halloween = useHalloween();
  if (!halloween) return null;
  return (
    <div className="hw-opening" aria-hidden="true">
      <BatFlight count={5} seed={23} top={36} />
    </div>
  );
}
