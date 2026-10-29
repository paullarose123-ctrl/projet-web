import { memo, useId, useMemo, type ReactNode } from 'react';
import { circle, ellipse, f, mulberry32, poly, type Pt, type Rng } from '../art/kit';
import { seasonAt, type Season } from '../engine/season';
import { useNow } from '../hooks/useNow';
import { Calavera, Glow, Marigolds, candle, monarch, timing } from './MexicoBackdrop';

// Décors des fêtes d'automne (voir engine/season.ts) :
// - Halloween, du 20 au 31 octobre : une guirlande de cempasúchil sous la barre du haut, des citrouilles qui luisent,
//   des bougies, une toile d'araignée dans le coin de chaque en-tête ;
// - le Jour des morts, du 1er au 7 novembre : plus aucune citrouille ni araignée, une ofrenda dans les coins
//   (cempasúchil, bougies, calaveras, pan de muerto), des calaveras en pendeloques et des monarques dans le ciel des
//   en-têtes : au Mexique, on dit qu'ils ramènent l'âme des défunts.
// Rien ne gêne la lecture : tout reste dans les marges, le ciel des en-têtes et le fond. Hors saison, ces composants
// n'affichent rien. Les flammes, les lueurs et les ailes reprennent les animations des décors du Mexique (classe
// mx-scene, voir motion.css).

/** La fête en cours (relue chaque minute), ou null hors saison. */
export function useSeason(): Season | null {
  return seasonAt(useNow(60_000));
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

/** Pan de muerto : la brioche ronde de l'ofrenda, ses « huesitos » en croix, sa boule sur le dessus et son sucre. */
function panDeMuerto(key: number, x: number, y: number, s: number): ReactNode {
  const dome = `M${f(x - 6 * s)} ${f(y)}Q${f(x - 6.2 * s)} ${f(y - 6.4 * s)} ${f(x)} ${f(y - 6.6 * s)}Q${f(x + 6.2 * s)} ${f(y - 6.4 * s)} ${f(x + 6 * s)} ${f(y)}Z`;
  const bones = `M${f(x - 5 * s)} ${f(y - 1.2 * s)}Q${f(x - 1.4 * s)} ${f(y - 8.4 * s)} ${f(x + 3.4 * s)} ${f(y - 4.6 * s)}M${f(x + 5 * s)} ${f(y - 1.2 * s)}Q${f(x + 1.4 * s)} ${f(y - 8.4 * s)} ${f(x - 3.4 * s)} ${f(y - 4.6 * s)}`;
  let sugar = '';
  for (const [a, b] of [[-3.6, -2.6], [-1.8, -4.4], [0.4, -2.2], [2.6, -3.6], [4.2, -1.6], [-4.4, -0.8], [1.6, -5.6]]) sugar += circle(x + a * s, y + b * s, 0.28 * s);
  return (
    <g key={key}>
      <path d={dome} fill="#c98a3e" />
      <path d={bones} fill="none" stroke="#a5662a" strokeWidth={1.1 * s} strokeLinecap="round" />
      <path d={circle(x, y - 6.6 * s, 1.3 * s)} fill="#b77634" />
      <path d={sugar} fill="#fff3dd" opacity={0.85} />
    </g>
  );
}

// ───────────── le pied de la page : citrouilles ou ofrenda, cempasúchil et bougies ─────────────

/** Les deux coins du bas de l'écran : citrouilles et bougies pour Halloween, une petite ofrenda pour le Jour des morts. */
function Corners({ className, season }: { className: string; season: Season }) {
  const id = `hc${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const corners = useMemo(() => {
    const r = mulberry32(7);
    const halloween = (flip: boolean) => (
      <>
        <Marigolds list={[[10, 58, 2.6], [16, 60, 2.2], [24, 59, 2.8], [31, 61, 2.1], [52, 60, 2.4], [60, 58, 2.9], [68, 61, 2.2], [76, 59, 2.6]]} />
        {pumpkin(1, id, flip ? 62 : 22, 60, 1.25, r)}
        {pumpkin(2, id, flip ? 30 : 46, 61, 0.85, r)}
        {candle(3, id, flip ? 12 : 72, 61, 6, r)}
        {candle(4, id, flip ? 44 : 34, 62, 4, r)}
      </>
    );
    const muertos = (flip: boolean) => (
      <>
        <Marigolds list={[[8, 59, 2.6], [14, 61, 2.2], [21, 59, 2.8], [28, 61, 2.1], [40, 61, 2.3], [50, 60, 2.4], [58, 58, 2.9], [66, 61, 2.2], [74, 59, 2.6], [80, 61, 2.1]]} />
        {panDeMuerto(1, flip ? 30 : 54, 61, 1.05)}
        <Calavera x={flip ? 60 : 24} y={61} s={1.15} accent={flip ? '#2fb5a8' : '#e4407b'} />
        <Calavera x={flip ? 46 : 38} y={62} s={0.75} accent={flip ? '#e4407b' : '#8a5cd6'} />
        {candle(2, id, flip ? 12 : 72, 61, 7, r)}
        {candle(3, id, flip ? 20 : 66, 62, 4.5, r)}
        {candle(4, id, flip ? 72 : 12, 62, 5, r)}
      </>
    );
    const scene = season === 'muertos' ? muertos : halloween;
    return { left: scene(false), right: scene(true) };
  }, [id, season]);
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
export const SaisonNight = memo(function SaisonNight() {
  const season = useSeason();
  if (!season) return null;
  return (
    <div className="hw-night" aria-hidden="true">
      <Corners className="hw-corner--back" season={season} />
    </div>
  );
});

/**
 * Calque fixe devant le contenu, sous les barres et les fenêtres : sur téléphone, où le contenu couvre tout le fond,
 * le décor des coins s'y pose sur la barre du bas. Rien n'y capte les clics.
 */
export const SaisonFlyover = memo(function SaisonFlyover() {
  const season = useSeason();
  if (!season) return null;
  return (
    <div className="hw-flyover" aria-hidden="true">
      <Corners className="hw-corner--front" season={season} />
    </div>
  );
});

// ───────────── les barres du haut et du bas ─────────────

/** Guirlande de cempasúchil qui pend sous la barre du haut (les deux fêtes). */
export function SaisonGarland() {
  const season = useSeason();
  if (!season) return null;
  return <div className="hw-garland" aria-hidden="true" style={{ backgroundImage: GARLAND_TILE }} />;
}

/** Petite citrouille sculptée : la marque du logo sur téléphone, pendant Halloween. */
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

/** Petite calavera fleurie : la marque du logo sur téléphone, pendant le Jour des morts. */
export function CalaveraMark({ className = '' }: { className?: string }) {
  return (
    <svg className={`pumpkin-mark calavera-mark ${className}`} viewBox="-5 -9.2 10 9.6" aria-hidden="true">
      <Calavera x={0} y={0} s={1} accent="#e4407b" />
    </svg>
  );
}

// ───────────── le ciel des en-têtes : pendeloques, toile d'araignée ou monarques ─────────────

/**
 * Décor posé dans le ciel d'un en-tête illustré. Halloween : une calavera et une citrouille en pendeloques à gauche,
 * une toile et une araignée à droite. Jour des morts : deux calaveras en pendeloques, et des monarques qui volent à
 * droite. Tout reste dans le haut de l'en-tête, au-dessus du titre et des boutons. Sur l'accueil, le coin droit seul
 * (`pendants` faux) : les pendeloques passeraient sur le booster.
 */
export function SaisonHead({ seed = 'en-tête', pendants = true }: { seed?: string; pendants?: boolean }) {
  const season = useSeason();
  const id = `hh${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const art = useMemo(() => {
    const r = mulberry32([...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7));
    if (season === 'muertos') {
      return {
        pendants: (
          <>
            <path d="M24 0V15 M58 0V24" stroke="rgba(255, 250, 240, 0.45)" strokeWidth={0.35} />
            <Calavera x={24} y={22} s={0.62} accent="#e4407b" />
            <Calavera x={58} y={31} s={0.55} accent="#2fb5a8" />
          </>
        ),
        corner: (
          <>
            {monarch(1, 66, 14, 0.9, -18, r)}
            {monarch(2, 84, 26, 0.7, 12, r)}
            {monarch(3, 52, 30, 0.55, -6, r)}
          </>
        ),
      };
    }
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
  }, [id, seed, season]);
  if (!season) return null;
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

// ───────────── l'annonce de la fête, sur l'accueil ─────────────

export function SaisonBanner() {
  const season = useSeason();
  const id = `hb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const art = useMemo(() => {
    const r = mulberry32(11);
    if (season === 'muertos') {
      return (
        <>
          <path d={`M0 52Q50 46 100 52V60H0Z`} fill="#1b1030" />
          <Marigolds list={[[6, 51, 2.4], [12, 53, 2], [20, 52, 2.2], [80, 52, 2.2], [88, 51, 2.5], [94, 53, 2.1], [50, 53, 1.8]]} />
          {panDeMuerto(1, 34, 53, 1.3)}
          <Calavera x={62} y={50} s={1.3} accent="#e4407b" />
          <Calavera x={76} y={52} s={0.8} accent="#2fb5a8" />
          {candle(2, id, 22, 53, 7, r)}
          {candle(3, id, 48, 53, 5, r)}
          {candle(4, id, 88, 52, 6, r)}
          {monarch(5, 24, 18, 0.9, -15, r)}
          {monarch(6, 78, 24, 0.75, 10, r)}
        </>
      );
    }
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
  }, [id, season]);
  if (!season) return null;
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
      {season === 'muertos' ? (
        <div className="hw-banner__text">
          <p className="eyebrow">Día de Muertos · Jour des morts</p>
          <h2 id="hw-title">Le Mexique fête ses morts</h2>
          <p className="muted">
            Jusqu’au 7 novembre, le jeu se pare de cempasúchil, de bougies et de calaveras, et la radio passe ses morceaux
            mexicains : « Huapango du cempasúchil », « Bolero de la Catrina » et « Valse des calaveras ». La Série 2 · Mexique
            est arrivée : ouvre son booster gratuit !
          </p>
        </div>
      ) : (
        <div className="hw-banner__text">
          <p className="eyebrow">Halloween</p>
          <h2 id="hw-title">La nuit des citrouilles</h2>
          <p className="muted">
            Jusqu’au 31 octobre, le jeu se pare d’orange et de citrouilles, et la radio ne joue que ses trois morceaux
            d’Halloween : « Nuit des citrouilles », « Valse des calaveras » et « Bal des squelettes ». Le 1er novembre, place au
            Jour des morts mexicain et à la Série 2 · Mexique.
          </p>
        </div>
      )}
    </section>
  );
}
