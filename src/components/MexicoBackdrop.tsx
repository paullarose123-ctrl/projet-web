import { useId, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { EAGLE, SCENE_H, WOLF, area, circle, ellipse, f, frond, hashString, hills, mulberry32, peaks, pine, poly, type Profile, type Pt, type Rng } from '../art/kit';
import { agave, cardon, nopal, pyramid, ridgeSnow, volcano } from '../art/mexique';
import { useSceneWidth } from './PackScene';

// Décors des ouvertures des boosters du Mexique, autour du Jour des morts (Día de Muertos, les 1er et 2 novembre) :
// - panteon : le cimetière d'un village la nuit des morts, une arche de cempasúchil, un autel, des bougies et des
//   guirlandes de papel picado sous la pleine lune ;
// - monarcas : la forêt de sapins oyamel du Michoacán au crépuscule, où les monarques arrivent pour la fête
//   (on dit qu'ils portent les âmes des défunts) ;
// - xochimilco : les canaux la nuit, des trajineras éclairées de lanternes, des bougies et des fleurs sur l'eau.
// Et la nature du pays :
// - volcanes : le Popocatépetl qui fume et l'Iztaccíhuatl enneigé à l'aube, au-dessus des champs d'agaves ;
// - barrancas : les Barrancas del Cobre, canyons en gradins couleur de cuivre, et leur rivière ;
// - desierto : le désert de Sonora au couchant, ses buttes, ses cardons et un coyote ;
// - selva : la jungle du Yucatán dans la brume du matin, une pyramide maya au-dessus de la canopée.
// Même manière que les paysages du jeu (aplats, astre, silhouettes), avec les couleurs de la fête : cempasúchil
// orange, rose mexicain, violet, turquoise. Bougies, pétales, fanions et papillons bougent doucement (voir motion.css).
// Repère : hauteur 172, largeur adaptée à l'écran (comme Landscape) ; la composition est centrée sur x = W / 2,
// où se tient le booster.

export type MexicoScene = 'panteon' | 'monarcas' | 'xochimilco' | 'volcanes' | 'barrancas' | 'desierto' | 'selva';
export const MEXICO_SCENES: MexicoScene[] = ['panteon', 'monarcas', 'xochimilco', 'volcanes', 'barrancas', 'desierto', 'selva'];

const H = SCENE_H;
const MARIGOLD = ['#f7a21b', '#ffbf3f', '#f37b20', '#ffd166'];
const PAPEL = ['#e4407b', '#f4a62a', '#2fb5a8', '#8a5cd6', '#9fd356', '#fff3dd', '#f06b3a'];

type Paint = (r: Rng, w: number, id: string) => ReactNode;

/** Animation décalée d'un élément (durée et retard en secondes). */
const timing = (duration: number, delay: number, extra?: CSSProperties): CSSProperties => ({
  animationDuration: `${duration.toFixed(2)}s`,
  animationDelay: `${(-delay).toFixed(2)}s`,
  ...extra,
});

/** Ciel en dégradé vertical : [position, couleur]. */
function Sky({ id, stops }: { id: string; stops: [number, string][] }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          {stops.map(([o, c]) => (
            <stop key={o} offset={o} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      <rect x={-2} y={-2} width="104%" height={H + 4} fill={`url(#${id}-sky)`} />
    </>
  );
}

/** Lueur ronde (astre, bougie, lanterne). */
function Glow({ id, name, color, opacity = 1 }: { id: string; name: string; color: string; opacity?: number }) {
  return (
    <radialGradient id={`${id}-${name}`}>
      <stop offset="0" stopColor={color} stopOpacity={0.75 * opacity} />
      <stop offset="0.35" stopColor={color} stopOpacity={0.28 * opacity} />
      <stop offset="1" stopColor={color} stopOpacity={0} />
    </radialGradient>
  );
}

function starField(r: Rng, w: number, top: number, count: number): string[] {
  const out = ['', '', ''];
  for (let i = 0; i < count; i++) out[i % 3] += circle(r() * w, r() * top, 0.18 + r() * 0.42);
  return out;
}

function Stars({ paths }: { paths: string[] }) {
  return (
    <>
      {paths.map((d, i) => (
        <path key={i} className={i === 0 ? 'mx-twinkle' : undefined} d={d} fill="#fff8ea" opacity={[0.85, 0.5, 0.28][i]} />
      ))}
    </>
  );
}

/** Pleine lune et ses halos. */
function Moon({ id, x, y, size }: { id: string; x: number; y: number; size: number }) {
  return (
    <>
      <circle cx={x} cy={y} r={size * 4.2} fill={`url(#${id}-moon)`} />
      <circle cx={x} cy={y} r={size * 1.7} fill="none" stroke="#fff3d6" strokeOpacity={0.14} strokeWidth={0.4} />
      <circle cx={x} cy={y} r={size * 2.5} fill="none" stroke="#fff3d6" strokeOpacity={0.07} strokeWidth={0.4} />
      <circle cx={x} cy={y} r={size} fill="#fff3d6" />
      <path d={circle(x - size * 0.3, y - size * 0.15, size * 0.22) + circle(x + size * 0.28, y + size * 0.3, size * 0.16) + circle(x + size * 0.1, y - size * 0.45, size * 0.1)} fill="#e9d6b0" opacity={0.6} />
    </>
  );
}

/** Pompons de cempasúchil, rangés par couleur : [x, y, rayon]. */
function Marigolds({ list, dark = '#9c4a0c' }: { list: [number, number, number][]; dark?: string }) {
  const byColor = MARIGOLD.map(() => '');
  let hearts = '';
  list.forEach(([x, y, s], i) => {
    byColor[i % MARIGOLD.length] += circle(x, y, s);
    hearts += circle(x + s * 0.12, y + s * 0.18, s * 0.38);
  });
  return (
    <>
      {byColor.map((d, i) => (
        <path key={i} d={d} fill={MARIGOLD[i]} />
      ))}
      <path d={hearts} fill={dark} opacity={0.32} />
    </>
  );
}

/** Une bougie et sa flamme qui vacille. */
function candle(key: string | number, id: string, x: number, y: number, h: number, r: Rng): ReactNode {
  const w = Math.max(0.9, h * 0.26);
  return (
    <g key={key}>
      <circle className="mx-glow" cx={x} cy={y - h - 1.2} r={h * 1.9 + 3} fill={`url(#${id}-flame)`} style={timing(2.4 + r() * 1.6, r() * 3)} />
      <rect x={f(x - w / 2)} y={f(y - h)} width={f(w)} height={f(h)} rx={0.3} fill="#fbe9c8" />
      <rect x={f(x - w / 2)} y={f(y - h)} width={f(w * 0.35)} height={f(h)} fill="#e8c99a" opacity={0.6} />
      <path className="mx-flame" d={`M${f(x)} ${f(y - h - 3.2)}C${f(x + 1.1)} ${f(y - h - 1.6)} ${f(x + 0.9)} ${f(y - h - 0.2)} ${f(x)} ${f(y - h - 0.2)}C${f(x - 0.9)} ${f(y - h - 0.2)} ${f(x - 1.1)} ${f(y - h - 1.6)} ${f(x)} ${f(y - h - 3.2)}Z`} fill="#ffd166" style={timing(0.9 + r() * 0.8, r() * 2)} />
      <path d={ellipse(x, y - h - 0.9, 0.35, 0.6)} fill="#fff6d8" />
    </g>
  );
}

/** Pétales de cempasúchil qui tombent en tournoyant sur toute la largeur. */
function petals(r: Rng, w: number, count: number): ReactNode {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const x = r() * w;
        const s = 0.9 + r() * 1.1;
        return (
          <g key={i} transform={`translate(${f(x)} -8)`}>
            <path
              className="mx-petal"
              d={ellipse(0, 0, s, s * 0.55)}
              fill={MARIGOLD[i % MARIGOLD.length]}
              opacity={0.9}
              style={timing(9 + r() * 9, r() * 18, { ['--drift' as string]: `${f((r() - 0.5) * 30)}px` })}
            />
          </g>
        );
      })}
    </g>
  );
}

/** Guirlandes de papel picado : des fanions découpés suspendus à une ficelle qui pend. */
function Papel({ id, w, lines }: { id: string; w: number; lines: { y: number; sag: number; size: number; offset: number }[] }) {
  return (
    <g>
      <defs>
        <mask id={`${id}-cut`} maskContentUnits="objectBoundingBox">
          <rect x={0} y={0} width={1} height={1} fill="#fff" />
          <circle cx={0.5} cy={0.42} r={0.13} fill="#000" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <ellipse key={i} cx={0.5 + Math.cos(a) * 0.25} cy={0.42 + Math.sin(a) * 0.2} rx={0.05} ry={0.04} fill="#000" />;
          })}
          {[0.2, 0.35, 0.5, 0.65, 0.8].map((x) => (
            <circle key={x} cx={x} cy={0.76} r={0.035} fill="#000" />
          ))}
        </mask>
      </defs>
      {lines.map((line, li) => {
        const yAt = (x: number) => line.y + line.sag * (1 - ((x - w / 2) / (w / 2 + 10)) ** 2);
        let string = '';
        for (let x = -4; x <= w + 4; x += 4) string += `${x === -4 ? 'M' : 'L'}${x} ${f(yAt(x))}`;
        const fw = 7.2 * line.size;
        const fh = 8.6 * line.size;
        const step = fw * 1.35;
        const flags: ReactNode[] = [];
        for (let x = line.offset, i = 0; x < w + fw; x += step, i++) {
          let d = `M${f(-fw / 2)} 0H${f(fw / 2)}V${f(fh * 0.82)}`;
          for (let z = 0; z < 6; z++) d += `L${f(fw / 2 - (z + 0.5) * (fw / 6))} ${f(fh * (z % 2 ? 0.82 : 1))}`;
          d += `L${f(-fw / 2)} ${f(fh * 0.82)}Z`;
          flags.push(
            <g key={i} transform={`translate(${f(x)} ${f(yAt(x) - 0.2)})`}>
              <path className="mx-flag" d={d} fill={PAPEL[(i * 3 + li * 2) % PAPEL.length]} mask={`url(#${id}-cut)`} opacity={0.95} style={timing(3.2 + (i % 3) * 0.6, i * 0.7 + li)} />
            </g>,
          );
        }
        return (
          <g key={li}>
            <path d={string} fill="none" stroke="rgba(255, 248, 236, 0.5)" strokeWidth={0.35} />
            {flags}
          </g>
        );
      })}
    </g>
  );
}

/** Calavera de sucre : le crâne blanc décoré de fleurs, posé sur l'autel. */
function Calavera({ x, y, s, accent }: { x: number; y: number; s: number; accent: string }) {
  const at = (a: number, b: number): Pt => [x + a * s, y + b * s];
  const skull = `${circle(x, y - 5 * s, 4.2 * s)}${poly([at(-3, -3.6), at(3, -3.6), at(2.6, -0.6), at(1.6, 0), at(-1.6, 0), at(-2.6, -0.6)])}`;
  let petals = '';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    petals += circle(x + Math.cos(a) * 0.9 * s, y - 7.4 * s + Math.sin(a) * 0.9 * s, 0.55 * s);
  }
  return (
    <g>
      <path d={skull} fill="#fff3e6" />
      <path d={circle(x - 1.6 * s, y - 4.4 * s, 1.25 * s) + circle(x + 1.6 * s, y - 4.4 * s, 1.25 * s)} fill={accent} />
      <path d={circle(x - 1.6 * s, y - 4.4 * s, 0.5 * s) + circle(x + 1.6 * s, y - 4.4 * s, 0.5 * s)} fill="#2a1430" />
      <path d={poly([at(0, -3.4), at(0.55, -2.4), at(-0.55, -2.4)])} fill="#2a1430" />
      <path d={`M${f(x - 1.7 * s)} ${f(y - 1.2 * s)}H${f(x + 1.7 * s)}M${f(x - 1 * s)} ${f(y - 1.7 * s)}V${f(y - 0.6 * s)}M${f(x)} ${f(y - 1.7 * s)}V${f(y - 0.6 * s)}M${f(x + 1 * s)} ${f(y - 1.7 * s)}V${f(y - 0.6 * s)}`} stroke="#2a1430" strokeWidth={0.22 * s} />
      <path d={petals} fill={accent} />
      <path d={circle(x, y - 7.4 * s, 0.5 * s)} fill="#ffd166" />
    </g>
  );
}

// ───────────── le cimetière du village, la nuit des morts ─────────────

/** Église du village : façade à fronton, deux clochers à coupole, une croix. */
function church(x: number, y: number, s: number): string {
  const p = (list: [number, number][]) => poly(list.map(([a, b]): Pt => [x + a * s, y + b * s]));
  return (
    p([[-6, 0.5], [-6, -12], [-3, -12], [0, -16], [3, -12], [6, -12], [6, 0.5]]) +
    p([[-10, 0.5], [-10, -21], [-6, -21], [-6, 0.5]]) +
    p([[6, 0.5], [6, -21], [10, -21], [10, 0.5]]) +
    ellipse(x - 8 * s, y - 21 * s, 2 * s, 2.4 * s) +
    ellipse(x + 8 * s, y - 21 * s, 2 * s, 2.4 * s) +
    p([[-8.25, -23], [-8.25, -26.5], [-7.75, -26.5], [-7.75, -23]]) +
    p([[7.75, -23], [7.75, -26.5], [8.25, -26.5], [8.25, -23]]) +
    p([[-0.3, -16], [-0.3, -19.6], [0.3, -19.6], [0.3, -16]]) +
    p([[-1.3, -18.6], [1.3, -18.6], [1.3, -18], [-1.3, -18]])
  );
}

/** Fenêtres et porte éclairées de l'église. */
function churchLights(x: number, y: number, s: number): string {
  return `${ellipse(x, y - 9 * s, 1.1 * s, 1.1 * s)}M${f(x - 1.6 * s)} ${f(y + 0.5)}V${f(y - 4 * s)}A${f(1.6 * s)} ${f(1.6 * s)} 0 0 1 ${f(x + 1.6 * s)} ${f(y - 4 * s)}V${f(y + 0.5)}Z${ellipse(x - 8 * s, y - 16 * s, 0.7 * s, 1.2 * s)}${ellipse(x + 8 * s, y - 16 * s, 0.7 * s, 1.2 * s)}`;
}

/** Arche de cempasúchil au-dessus de l'autel : deux montants et un arc en pompons. */
function archFlowers(cx: number, top: number, base: number, half: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  const add = (x: number, y: number, s: number) => out.push([x, y, s]);
  for (const side of [-1, 1]) {
    for (let y = base; y > top; y -= 2.3) {
      add(cx + side * half, y, 1.55);
      add(cx + side * (half + 1.5), y - 1.1, 1.2);
    }
  }
  for (let a = Math.PI; a >= 0; a -= 0.085) {
    add(cx + Math.cos(a) * half, top - Math.sin(a) * half * 0.8, 1.6);
    add(cx + Math.cos(a) * (half + 1.6), top - Math.sin(a) * (half + 1.6) * 0.8 - 0.4, 1.2);
  }
  return out;
}

const panteon: Paint = (r, w, id) => {
  const cx = w / 2;
  const stars = starField(r, w, 82, Math.round(w * 0.45));
  const moon = { x: cx - Math.min(w * 0.24, 66), y: 40 };
  const far = hills(r, 108, 7);
  const village = hills(r, 121, 1.4);
  const ground = hills(r, 138, 1.8);
  const front = hills(r, 157, 1.2);
  const churchX = cx + Math.min(w * 0.27, 74);
  // maisons du village, de part et d'autre de l'église (pas derrière le booster)
  let houses = '';
  let windows = '';
  for (let x = -4 + r() * 6; x < w + 4; x += 7 + r() * 7) {
    if (Math.abs(x - churchX) < 13 || Math.abs(x - cx) < 18) continue;
    const hw = 3.5 + r() * 3;
    const hh = 4 + r() * 4;
    const y = village(x) + 1;
    houses += poly([[x - hw, y], [x - hw, y - hh], [x + hw, y - hh], [x + hw, y]]);
    if (r() < 0.7) windows += poly([[x - 1.6, y - hh * 0.62], [x - 0.4, y - hh * 0.62], [x - 0.4, y - hh * 0.62 + 1.2], [x - 1.6, y - hh * 0.62 + 1.2]]);
    if (r() < 0.45) windows += poly([[x + 0.6, y - hh * 0.62], [x + 1.8, y - hh * 0.62], [x + 1.8, y - hh * 0.62 + 1.2], [x + 0.6, y - hh * 0.62 + 1.2]]);
  }
  // tombes du cimetière : stèles arrondies et croix, chacune avec sa bougie
  let graves = '';
  const graveCandles: [number, number, number][] = [];
  const graveFlowers: [number, number, number][] = [];
  for (let x = -2 + r() * 5; x < w + 4; x += 6 + r() * 8) {
    if (Math.abs(x - cx) < 30) continue;
    const y = ground(x) + 1;
    const s = 0.8 + r() * 0.5;
    if (r() < 0.55) graves += `M${f(x - 2.2 * s)} ${f(y)}V${f(y - 5 * s)}A${f(2.2 * s)} ${f(2.2 * s)} 0 0 1 ${f(x + 2.2 * s)} ${f(y - 5 * s)}V${f(y)}Z`;
    else graves += poly([[x - 0.6 * s, y], [x - 0.6 * s, y - 5 * s], [x - 2.2 * s, y - 5 * s], [x - 2.2 * s, y - 6.2 * s], [x - 0.6 * s, y - 6.2 * s], [x - 0.6 * s, y - 8 * s], [x + 0.6 * s, y - 8 * s], [x + 0.6 * s, y - 6.2 * s], [x + 2.2 * s, y - 6.2 * s], [x + 2.2 * s, y - 5 * s], [x + 0.6 * s, y - 5 * s], [x + 0.6 * s, y]]);
    graveCandles.push([x + (r() < 0.5 ? -3 : 3) * s, y + 0.6, 1.8 + r() * 1.4]);
    for (let k = 0; k < 4; k++) graveFlowers.push([x + (r() - 0.5) * 6 * s, y + 0.4 + r() * 0.8, 0.8 + r() * 0.5]);
  }
  // l'arche, l'autel à trois gradins et ce qui est posé dessus
  const archBase = ground(cx) + 4;
  const arch = archFlowers(cx, 76, archBase, 23);
  const altarY = front(cx) + 2;
  const tiers = [
    { w: 44, top: altarY - 4 },
    { w: 32, top: altarY - 8 },
    { w: 20, top: altarY - 12 },
  ];
  let cloth = '';
  let lace = '';
  for (const t of tiers) {
    cloth += poly([[cx - t.w / 2, H + 2], [cx - t.w / 2, t.top], [cx + t.w / 2, t.top], [cx + t.w / 2, H + 2]]);
    for (let x = cx - t.w / 2; x < cx + t.w / 2 - 0.1; x += 2) lace += `M${f(x)} ${f(t.top)}h2a1 1 0 0 1 -2 0Z`;
  }
  const frontFlowers: [number, number, number][] = [];
  for (let x = -3; x < w + 3; x += 1.6 + r() * 1.8) {
    if (Math.abs(x - cx) < 24) continue;
    frontFlowers.push([x, front(x) + 0.5 + r() * 3, 1.2 + r() * 0.9]);
    if (r() < 0.5) frontFlowers.push([x + 0.8, front(x) + 3 + r() * 6, 1.4 + r()]);
  }
  const frontCandles: [number, number, number][] = [];
  for (let x = 2 + r() * 8; x < w; x += 9 + r() * 10) if (Math.abs(x - cx) > 26) frontCandles.push([x, front(x) + 4 + r() * 5, 3 + r() * 2.5]);
  return (
    <>
      <defs>
        <Glow id={id} name="moon" color="#fff3d6" opacity={0.7} />
        <Glow id={id} name="flame" color="#ffb347" />
        <Glow id={id} name="altar" color="#ff9a3c" opacity={0.75} />
      </defs>
      <Sky id={id} stops={[[0, '#120c2e'], [0.45, '#33185a'], [0.68, '#7a2d6c'], [0.8, '#c4505e']]} />
      <Stars paths={stars} />
      <Moon id={id} x={moon.x} y={moon.y} size={10} />
      <path d={area(far, w)} fill="#3b1f5c" />
      <path d={area(village, w)} fill="#2a1646" />
      <path d={houses} fill="#2a1646" />
      <path d={church(churchX, village(churchX) + 1, 0.95)} fill="#2a1646" />
      <path className="mx-glow" d={windows + churchLights(churchX, village(churchX) + 1, 0.95)} fill="#ffcf6e" opacity={0.85} style={timing(5, 1)} />
      <circle cx={cx} cy={archBase - 18} r={58} fill={`url(#${id}-altar)`} />
      <path d={area(ground, w)} fill="#1f1036" />
      <path d={graves} fill="#170b2a" />
      <Marigolds list={graveFlowers} />
      {graveCandles.map(([x, y, h], i) => candle(i, id, x, y, h, r))}
      <Marigolds list={arch} />
      <path d={area(front, w)} fill="#150a24" />
      <path d={cloth} fill="#5c2366" />
      <path d={lace} fill="#e4407b" opacity={0.9} />
      <Calavera x={cx - 7} y={tiers[2].top - 0.2} s={0.62} accent="#2fb5a8" />
      <Calavera x={cx + 7} y={tiers[2].top - 0.2} s={0.62} accent="#e4407b" />
      <path d={ellipse(cx, tiers[2].top - 1.6, 2.8, 1.8)} fill="#c98a48" />
      <path d={`M${f(cx - 2)} ${f(tiers[2].top - 2.2)}L${f(cx + 2)} ${f(tiers[2].top - 1.2)}M${f(cx + 2)} ${f(tiers[2].top - 2.2)}L${f(cx - 2)} ${f(tiers[2].top - 1.2)}`} stroke="#8a5424" strokeWidth={0.5} />
      {[-14, -10, 10, 14].map((dx, i) => candle(dx, id, cx + dx, tiers[i === 0 || i === 3 ? 0 : 1].top, i === 0 || i === 3 ? 4.5 : 3.4, r))}
      <Marigolds list={[[cx - 19, tiers[0].top - 1, 1.6], [cx - 21, tiers[0].top - 0.4, 1.3], [cx + 19, tiers[0].top - 1, 1.6], [cx + 21, tiers[0].top - 0.4, 1.3], [cx - 12, tiers[1].top - 0.9, 1.3], [cx + 12, tiers[1].top - 0.9, 1.3]]} />
      <Marigolds list={frontFlowers} />
      {frontCandles.map(([x, y, h], i) => candle(i, id, x, y, h, r))}
      <Papel id={id} w={w} lines={[{ y: 1.5, sag: 6, size: 0.9, offset: 2 }, { y: 12, sag: 4.5, size: 0.74, offset: 6.5 }]} />
      {petals(r, w, Math.round(w * 0.16))}
    </>
  );
};

// ───────────── la forêt des monarques au crépuscule ─────────────

/** Ailes d'un monarque ouvertes, vues de dessus (centrées sur le corps, tête en haut). */
const WINGS =
  'M0 -0.2C1.4 -2.6 4.8 -4 6.4 -2.6C7 -1.2 5 0.4 0 0.2Z M0 0.3C2.6 0.6 4.6 2.6 3.4 4.2C2.2 4.6 0.6 2.6 0 0.3Z M0 -0.2C-1.4 -2.6 -4.8 -4 -6.4 -2.6C-7 -1.2 -5 0.4 0 0.2Z M0 0.3C-2.6 0.6 -4.6 2.6 -3.4 4.2C-2.2 4.6 -0.6 2.6 0 0.3Z';

function monarch(key: number, x: number, y: number, s: number, angle: number, r: Rng): ReactNode {
  return (
    <g key={key} transform={`translate(${f(x)} ${f(y)}) rotate(${f(angle)}) scale(${s.toFixed(2)})`}>
      <g className="mx-fly" style={timing(6 + r() * 6, r() * 10, { ['--drift' as string]: `${f(8 + r() * 14)}px` })}>
        <g className="mx-flap" style={timing(0.35 + r() * 0.25, r())}>
          <path d={WINGS} fill="#f28c28" stroke="#2a1508" strokeWidth={0.7} strokeLinejoin="round" />
          <path d="M0 -0.2C1.4 -2.6 4.8 -4 6.4 -2.6M0 -0.2C-1.4 -2.6 -4.8 -4 -6.4 -2.6" fill="none" stroke="#2a1508" strokeWidth={0.35} opacity={0.6} />
        </g>
        <path d={ellipse(0, 0.4, 0.45, 2.2)} fill="#2a1508" />
      </g>
    </g>
  );
}

const monarcas: Paint = (r, w, id) => {
  const cx = w / 2;
  const stars = starField(r, w, 40, Math.round(w * 0.12));
  const sun = { x: cx + Math.min(w * 0.08, 18), y: 108 };
  const ridge1 = hills(r, 104, 7, 0.4);
  const ridge2 = hills(r, 118, 5, 0.6);
  const ridge3 = hills(r, 132, 4);
  const meadow = hills(r, 150, 1.6);
  const forest = (profile: (x: number) => number, min: number, max: number, gap: number, avoid: number) => {
    let d = '';
    for (let x = -4 + r() * gap; x < w + 4; x += gap * (0.5 + r() * 0.8)) {
      if (Math.abs(x - cx) < avoid) continue;
      d += pine(x, profile(x) + 1.5, min + r() * (max - min));
    }
    return d;
  };
  // les grands oyamels au premier plan encadrent le booster ; les monarques s'y serrent en grappes orange
  const bigFirs: [number, number][] = [];
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) bigFirs.push([cx + side * (Math.min(w * 0.36, 70) + k * 11 + r() * 5), 46 + r() * 16 + k * 6]);
  }
  let firs = '';
  let clusters = '';
  for (const [x, h] of bigFirs) {
    const y = meadow(x) + 2;
    firs += pine(x, y, h) + poly([[x - 0.9, y + 2], [x - 0.9, y - h * 0.1], [x + 0.9, y - h * 0.1], [x + 0.9, y + 2]]);
    for (let k = 0; k < 26; k++) {
      const t = 0.15 + r() * 0.7;
      const spread = h * 0.36 * (0.2 + t * 0.75) * (r() - 0.5) * 1.6;
      clusters += ellipse(x + spread, y - h * (1 - t), 0.7 + r() * 0.6, 0.5 + r() * 0.4);
    }
  }
  const flyers = Array.from({ length: Math.round(w * 0.16) }, () => ({
    x: r() * w,
    y: 18 + r() * 110,
    s: 0.35 + r() * 0.45,
    angle: (r() - 0.5) * 70,
  }));
  const meadowFlowers: [number, number, number][] = [];
  for (let x = -3; x < w + 3; x += 1.4 + r() * 1.6) {
    meadowFlowers.push([x, meadow(x) + 1 + r() * 4, 0.9 + r() * 0.7]);
    if (r() < 0.6) meadowFlowers.push([x + 0.7, meadow(x) + 6 + r() * 12, 1.3 + r() * 0.9]);
  }
  return (
    <>
      <defs>
        <Glow id={id} name="sun" color="#ffe6b0" />
      </defs>
      <Sky id={id} stops={[[0, '#221c4c'], [0.36, '#5b4789'], [0.6, '#c27f9c'], [0.74, '#f6b08f'], [0.84, '#ffd59a']]} />
      <Stars paths={stars} />
      <circle cx={sun.x} cy={sun.y} r={70} fill={`url(#${id}-sun)`} />
      <circle cx={sun.x} cy={sun.y} r={13} fill="#fff1c9" />
      <path d={area(ridge1, w)} fill="#8a6aa0" />
      <path d={forest(ridge1, 5, 8, 3.2, 0)} fill="#8a6aa0" />
      <path d={area(ridge2, w)} fill="#5f4a86" />
      <path d={forest(ridge2, 8, 13, 4, 0)} fill="#5f4a86" />
      <path d={area(ridge3, w)} fill="#3d2f63" />
      <path d={forest(ridge3, 12, 20, 5, 10)} fill="#3d2f63" />
      <path d={area(meadow, w)} fill="#231a40" />
      <path d={firs} fill="#1a1333" />
      <path d={clusters} fill="#f28c28" opacity={0.92} />
      {flyers.map((m, i) => monarch(i, m.x, m.y, m.s, m.angle, r))}
      <Marigolds list={meadowFlowers} />
    </>
  );
};

// ───────────── Xochimilco la nuit ─────────────

/** Trajinera : coque peinte de fleurs, toit arrondi bordé de cempasúchil, arche de proue fleurie, lanternes. */
function Trajinera({ id, x, y, s, hull, arch, roof, flip = false }: { id: string; x: number; y: number; s: number; hull: string; arch: string; roof: string; flip?: boolean }) {
  const roofAt = (u: number) => -11.6 - 3.6 * (1 - (u / 16.5) ** 2);
  let garland = '';
  for (let u = -15.5; u <= 15.6; u += 1.55) garland += circle(u, roofAt(u) + 1.4, 0.75);
  const flowerColors = ['#ffd166', '#fff3dd', '#e4407b', '#9fd356'];
  const byColor = flowerColors.map(() => '');
  for (let u = -16, i = 0; u <= 14; u += 2.5, i++) byColor[i % flowerColors.length] += circle(u, -0.9, 0.7);
  return (
    <g transform={`translate(${f(x)} ${f(y)}) scale(${flip ? -s : s} ${s})`}>
      {/* reflet dans l'eau */}
      <path d="M-18 1.6H16L14 5H-16Z" fill={hull} opacity={0.22} />
      <path d="M-14 1.6V6M-4.5 1.6V5.4M5 1.6V5.4M14 1.6V5" stroke="#ffcf6e" strokeWidth={0.5} opacity={0.2} />
      <path d="M-19.5 -3.2H17.5L15.6 1.6H-17.6Z" fill={hull} />
      <path d="M-19 -2.2H17.1" stroke="#fff3dd" strokeWidth={0.35} opacity={0.7} />
      {byColor.map((d, i) => (
        <path key={i} d={d} fill={flowerColors[i]} />
      ))}
      <path d="M-14 -3V-12.4M-4.5 -3V-14.4M5 -3V-14.4M14 -3V-12.4" stroke="#2a1a14" strokeWidth={0.55} />
      <path d={`M-16.5 ${f(roofAt(-16.5))}Q0 ${f(roofAt(0) * 2 - roofAt(-16.5) - 0.2)} 16.5 ${f(roofAt(16.5))}V${f(roofAt(16.5) + 1.3)}Q0 ${f(roofAt(0) * 2 - roofAt(-16.5) + 1.1)} -16.5 ${f(roofAt(-16.5) + 1.3)}Z`} fill={roof} />
      <path d={garland} fill="#f7a21b" />
      {/* arche de proue, peinte de bandes et de fleurs */}
      <path d="M-22 -3V-13.5A6.5 6.5 0 0 1 -9 -13.5V-3H-11.2V-13.1A4.3 4.3 0 0 0 -19.8 -13.1V-3Z" fill={arch} />
      <path d="M-21 -13.4A5.5 5.5 0 0 1 -10 -13.4" fill="none" stroke="#fff3dd" strokeWidth={0.5} opacity={0.9} />
      <path d={circle(-15.5, -18.6, 1) + circle(-18.6, -16.8, 0.75) + circle(-12.4, -16.8, 0.75) + circle(-20.4, -13, 0.6) + circle(-10.6, -13, 0.6)} fill="#ffd166" />
      <path d={circle(-15.5, -18.6, 0.4) + circle(-18.6, -16.8, 0.3) + circle(-12.4, -16.8, 0.3)} fill="#e4407b" />
      {[-9, 0, 9].map((lx) => (
        <g key={lx}>
          <circle className="mx-glow" cx={lx} cy={-9.6} r={5.5} fill={`url(#${id}-flame)`} style={timing(2.6, lx * 0.1 + 2)} />
          <path d={ellipse(lx, -9.8, 1.15, 1.45)} fill="#ffcf6e" />
          <path d={`M${lx} -11.3V${f(roofAt(lx) + 1.2)}`} stroke="#2a1a14" strokeWidth={0.25} />
        </g>
      ))}
    </g>
  );
}

const xochimilco: Paint = (r, w, id) => {
  const cx = w / 2;
  const stars = starField(r, w, 90, Math.round(w * 0.5));
  const moon = { x: cx + Math.min(w * 0.23, 62), y: 28 };
  const shoreY = 112;
  const shore = hills(r, shoreY, 0.8);
  // ahuejotes : les saules élancés plantés au bord des chinampas
  let trees = '';
  for (let x = -2 + r() * 4; x < w + 2; x += 3.6 + r() * 3.2) {
    const h = 9 + r() * 9;
    const y = shore(x);
    trees += ellipse(x, y - h * 0.55, 1.2 + r() * 0.6, h * 0.5);
  }
  let shimmer = '';
  for (let i = 0; i < w * 0.5; i++) shimmer += ellipse(r() * w, shoreY + 6 + r() * 60, 1.5 + r() * 4, 0.22);
  let moonPath = '';
  for (let y = shoreY + 3; y < H; y += 2.6) moonPath += ellipse(moon.x + (r() - 0.5) * 2, y, 2 + (y - shoreY) * 0.08 + r() * 2, 0.35);
  const floating: [number, number, number][] = [];
  const floatCandles: [number, number][] = [];
  for (let i = 0; i < w * 0.12; i++) {
    const x = r() * w;
    const y = shoreY + 16 + r() * 50;
    if (Math.abs(x - cx) < 14 && y < 150) continue;
    if (r() < 0.45) floatCandles.push([x, y]);
    else floating.push([x, y, 0.8 + r() * 0.6]);
  }
  // guirlande d'ampoules tendue au-dessus du canal
  const bulbs: [number, number][] = [];
  const bulbY = (x: number) => 10 + 8 * (1 - ((x - cx) / (cx + 10)) ** 2);
  let wire = '';
  for (let x = -4; x <= w + 4; x += 4) wire += `${x === -4 ? 'M' : 'L'}${x} ${f(bulbY(x))}`;
  for (let x = 1; x < w; x += 5) bulbs.push([x, bulbY(x) + 1.2]);
  const side = Math.min(w * 0.34, 74);
  return (
    <>
      <defs>
        <Glow id={id} name="moon" color="#f4eedc" opacity={0.7} />
        <Glow id={id} name="flame" color="#ffb347" />
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24386a" />
          <stop offset="1" stopColor="#0a1229" />
        </linearGradient>
      </defs>
      <Sky id={id} stops={[[0, '#0c1532'], [0.42, '#1e2d5a'], [0.6, '#4a3f7d'], [0.66, '#a95883']]} />
      <Stars paths={stars} />
      <Moon id={id} x={moon.x} y={moon.y} size={9} />
      <path d={area(shore, w)} fill="#16193a" />
      <path d={trees} fill="#16193a" />
      <rect x={-2} y={shoreY + 1} width={w + 4} height={H - shoreY + 2} fill={`url(#${id}-water)`} />
      <path className="mx-shimmer" d={shimmer} fill="#6f8fc4" opacity={0.35} />
      <path className="mx-shimmer" d={moonPath} fill="#f4eedc" opacity={0.55} style={timing(4, 1)} />
      <Trajinera id={id} x={cx} y={shoreY + 9} s={0.42} hull="#2fb5a8" arch="#e4407b" roof="#f4a62a" />
      {floating.length > 0 && <Marigolds list={floating} />}
      {floatCandles.map(([x, y], i) => (
        <g key={i}>
          <path d={ellipse(x, y + 0.4, 2.2, 0.6)} fill="#f7a21b" opacity={0.85} />
          {candle('bougie', id, x, y, 1.6, r)}
        </g>
      ))}
      <Trajinera id={id} x={cx - side} y={148} s={1.45} hull="#3f7fd0" arch="#f4a62a" roof="#c33b4a" />
      <Trajinera id={id} x={cx + side} y={160} s={1.65} hull="#e4407b" arch="#2fb5a8" roof="#8a5cd6" flip />
      <path d={wire} fill="none" stroke="rgba(255, 240, 210, 0.45)" strokeWidth={0.3} />
      {bulbs.map(([x, y], i) => (
        <g key={i}>
          <circle className="mx-glow" cx={x} cy={y} r={3} fill={`url(#${id}-flame)`} style={timing(1.8 + (i % 4) * 0.5, i * 0.37)} />
          <path d={ellipse(x, y, 0.6, 0.8)} fill={PAPEL[i % PAPEL.length]} />
        </g>
      ))}
      {petals(r, w, Math.round(w * 0.08))}
    </>
  );
};

// ───────────── la nature du Mexique ─────────────

/** Un oiseau qui plane (aigle, buse), en ombre chinoise, et flâne doucement. */
function soarer(key: number, x: number, y: number, s: number, color: string, r: Rng): ReactNode {
  return (
    <g key={key} transform={`translate(${f(x)} ${f(y)}) rotate(${f((r() - 0.5) * 16)}) scale(${s.toFixed(2)})`}>
      <path className="mx-fly" d={EAGLE} fill={color} style={timing(10 + r() * 8, r() * 10, { ['--drift' as string]: `${f(4 + r() * 6)}px` })} />
    </g>
  );
}

/** Ligne de crête d'un profil, pour le fil de lumière au bord d'un relief. */
function ridgeLine(profile: Profile, w: number, step = 1): string {
  let d = '';
  for (let x = -2; x <= w + 2.01; x += step) d += `${x === -2 ? 'M' : 'L'}${f(x)} ${f(profile(x))}`;
  return d;
}

/** Brume en bande horizontale (dégradé transparent → couleur → transparent). */
function Mist({ id, name, color }: { id: string; name: string; color: string }) {
  return (
    <linearGradient id={`${id}-${name}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={color} stopOpacity={0} />
      <stop offset="0.55" stopColor={color} stopOpacity={0.7} />
      <stop offset="1" stopColor={color} stopOpacity={0} />
    </linearGradient>
  );
}

const volcanes: Paint = (r, w, id) => {
  const cx = w / 2;
  const stars = starField(r, w, 34, Math.round(w * 0.1));
  const popo = { x: cx - Math.min(w * 0.27, 64), y: 46 };
  const cone = volcano(r, popo.x, popo.y, 108, 48, 44);
  const iztaX = cx + Math.min(w * 0.24, 58);
  const izta = peaks(r, 106, [[iztaX - 18, 38, 22], [iztaX, 46, 20], [iztaX + 16, 41, 18], [iztaX + 32, 32, 16]], 1.2);
  let smoke = '';
  for (let i = 0; i < 7; i++) smoke += circle(popo.x + 2 + i * 3.2, popo.y - 3 - i * 2.4 + Math.sin(i) * 0.8, 2.2 + i * 0.7);
  const ridge1 = hills(r, 114, 4, 0.4);
  const ridge2 = hills(r, 126, 3);
  const field = hills(r, 140, 1.6);
  const pines = (profile: Profile, min: number, max: number, gap: number) => {
    let d = '';
    for (let x = -3 + r() * gap; x < w + 3; x += gap * (0.5 + r() * 0.8)) d += pine(x, profile(x) + 1.2, min + r() * (max - min));
    return d;
  };
  // rangées d'agaves bleus, de plus en plus grandes en approchant (les champs de Jalisco)
  const rows = [
    { y: 144, h: 5.5, gap: 6, color: '#86bab5' },
    { y: 152, h: 8.5, gap: 9, color: '#6fa6a1' },
    { y: 162, h: 13, gap: 13, color: '#558c87' },
    { y: 176, h: 20, gap: 19, color: '#3d716c' },
  ].map((row) => {
    let d = '';
    for (let x = -4 + r() * row.gap; x < w + 6; x += row.gap * (0.85 + r() * 0.3)) d += agave(x, row.y + (r() - 0.5), row.h);
    return { d, color: row.color };
  });
  return (
    <>
      <defs>
        <Glow id={id} name="sun" color="#ffe6b8" />
        <Mist id={id} name="mist" color="#f4c3a6" />
      </defs>
      <Sky id={id} stops={[[0, '#1f2b5a'], [0.34, '#55578f'], [0.52, '#c48aa2'], [0.62, '#f6b48e'], [0.7, '#ffe1b2']]} />
      <Stars paths={stars} />
      <circle cx={cx + 6} cy={104} r={70} fill={`url(#${id}-sun)`} />
      <circle cx={cx + 6} cy={104} r={14} fill="#fff4d6" />
      <path className="mx-smoke" d={smoke} fill="#e9c9c4" opacity={0.6} />
      <path d={area(izta, w)} fill="#7c7fb2" />
      <path d={ridgeSnow(izta, iztaX - 44, iztaX + 52, 84)} fill="#fff4ee" opacity={0.92} />
      <path d={cone.body} fill="#6f73aa" />
      <path d={cone.snow} fill="#fff4ee" opacity={0.95} />
      <path d={cone.shadow} fill="#1b2350" opacity={0.2} />
      <rect className="mx-mist" x={-10} y={92} width={w + 20} height={30} fill={`url(#${id}-mist)`} opacity={0.55} />
      {soarer(1, cx + Math.min(w * 0.12, 30), 66, 1.1, '#3a3560', r)}
      {soarer(2, cx - Math.min(w * 0.06, 14), 78, 0.7, '#4a4572', r)}
      <path d={area(ridge1, w)} fill="#4f6487" />
      <path d={pines(ridge1, 4, 7, 3)} fill="#4f6487" />
      <path d={area(ridge2, w)} fill="#344e66" />
      <path d={pines(ridge2, 7, 11, 4)} fill="#344e66" />
      <path d={area(field, w)} fill="#3a5e56" />
      {rows.map((row, i) => (
        <path key={i} d={row.d} fill={row.color} />
      ))}
    </>
  );
};

/** Relief en gradins : le profil arrondi par marches de `q`, falaises verticales et replats (canyon, butte). */
const terraces = (profile: Profile, q: number): Profile => (x) => Math.round(profile(x) / q) * q;

const barrancas: Paint = (r, w, id) => {
  const cx = w / 2;
  const layers = [
    { p: terraces(hills(r, 92, 14, 0.6), 3), color: '#e3ad8f', rim: '#ffe0c4' },
    { p: terraces(hills(r, 104, 13, 0.6), 3.5), color: '#cf8463', rim: '#ffcfa8' },
    { p: terraces(hills(r, 117, 12, 0.6), 4), color: '#ad5e45', rim: '#f7b184' },
    { p: terraces(hills(r, 130, 10, 0.6), 4.5), color: '#83402f', rim: '#e8925f' },
  ];
  // les deux grandes parois du premier plan descendent en gradins jusqu'à la rivière, au milieu
  const wall: Profile = (x) => {
    const d = Math.max(0, Math.min(1, (Math.abs(x - cx) - 12) / 44));
    return Math.round((H + 4 - (H + 4 - 112) * d ** 0.75) / 6) * 6 + (x < cx ? 0 : 1.5);
  };
  let pines = '';
  for (let x = -3 + r() * 4; x < w + 3; x += 3 + r() * 4) {
    if (Math.abs(x - cx) < 40) continue;
    pines += pine(x, wall(x) + 1, 4 + r() * 4);
  }
  let river = `M${f(cx - 7)} ${H + 2}`;
  for (let y = H; y >= 146; y -= 4) river += `L${f(cx - 5 + Math.sin(y * 0.22) * 3)} ${y}`;
  for (let y = 146; y <= H; y += 4) river += `L${f(cx - 1 + Math.sin(y * 0.22) * 3 + (y - 146) * 0.18)} ${y}`;
  river += `L${f(cx + 6)} ${H + 2}Z`;
  return (
    <>
      <defs>
        <Glow id={id} name="sun" color="#ffd9a0" />
        <Mist id={id} name="mist" color="#f8c49a" />
      </defs>
      <Sky id={id} stops={[[0, '#3a2f6b'], [0.3, '#8d6699'], [0.48, '#ee9f7c'], [0.58, '#ffd8a0']]} />
      <circle cx={cx - Math.min(w * 0.2, 48)} cy={84} r={64} fill={`url(#${id}-sun)`} />
      <circle cx={cx - Math.min(w * 0.2, 48)} cy={84} r={11} fill="#fff1cf" />
      {layers.map((layer, i) => (
        <g key={i}>
          <path d={area(layer.p, w, 0.5)} fill={layer.color} />
          <path d={ridgeLine(layer.p, w, 0.5)} fill="none" stroke={layer.rim} strokeWidth={0.45} opacity={0.6} />
          {i < 3 && <rect className="mx-mist" x={-10} y={98 + i * 13} width={w + 20} height={14} fill={`url(#${id}-mist)`} opacity={0.35} />}
        </g>
      ))}
      {soarer(1, cx + Math.min(w * 0.16, 36), 62, 1, '#4a2a3a', r)}
      {soarer(2, cx - Math.min(w * 0.04, 10), 50, 0.65, '#5a3446', r)}
      <path d={area(wall, w, 0.5)} fill="#4a2428" />
      <path d={ridgeLine(wall, w, 0.5)} fill="none" stroke="#d9875a" strokeWidth={0.5} opacity={0.55} />
      <path d={pines} fill="#2e161b" />
      <path className="mx-shimmer" d={river} fill="#6fc7c0" opacity={0.8} />
    </>
  );
};

/** Butte du désert : flancs en pente raide, sommet plat. */
function butte(x: number, base: number, w: number, h: number): string {
  const top = w * 0.32;
  return poly([[x - w / 2, base], [x - top - w * 0.06, base - h * 0.55], [x - top, base - h], [x + top, base - h], [x + top + w * 0.08, base - h * 0.5], [x + w / 2, base]]);
}

/** Ocotillo : des tiges fines qui jaillissent d'un même pied, fleurs rouges au bout. */
function ocotillo(r: Rng, x: number, y: number, h: number): { stems: string; tips: string } {
  let stems = '';
  let tips = '';
  for (let i = 0; i < 7; i++) {
    const a = (-90 + (i - 3) * 9 + (r() - 0.5) * 6) * (Math.PI / 180);
    const len = h * (0.75 + r() * 0.25);
    const tx = x + Math.cos(a) * len;
    const ty = y + Math.sin(a) * len;
    stems += `M${f(x)} ${f(y)}Q${f(x + Math.cos(a) * len * 0.5 + (i - 3) * 0.3)} ${f(y + Math.sin(a) * len * 0.5)} ${f(tx)} ${f(ty)}`;
    tips += ellipse(tx, ty - 0.6, 0.45, 1);
  }
  return { stems, tips };
}

const desierto: Paint = (r, w, id) => {
  const cx = w / 2;
  const stars = starField(r, w, 46, Math.round(w * 0.22));
  const sun = { x: cx + Math.min(w * 0.12, 26), y: 116 };
  let buttes = '';
  for (const [dx, bw, bh] of [[-0.36, 46, 22], [-0.12, 24, 12], [0.3, 38, 18], [0.48, 22, 10]]) buttes += butte(cx + dx * Math.min(w, 260), 120, bw, bh);
  const dune1 = hills(r, 124, 3);
  const dune2 = hills(r, 136, 2.6);
  const ground = hills(r, 152, 1.4);
  // cardons : les grands encadrent le booster, les petits au loin
  let farCacti = '';
  let midCacti = '';
  for (let x = -4 + r() * 8; x < w + 4; x += 8 + r() * 12) {
    if (Math.abs(x - cx) < 10) continue;
    farCacti += cardon(x, dune1(x), 5 + r() * 5);
  }
  for (let x = -6 + r() * 10; x < w + 6; x += 14 + r() * 18) {
    if (Math.abs(x - cx) < 16) continue;
    midCacti += cardon(x, dune2(x), 10 + r() * 8);
  }
  const big = [cx - Math.min(w * 0.36, 72), cx + Math.min(w * 0.4, 80)];
  const bigCacti = cardon(big[0], ground(big[0]) + 1, 52) + cardon(big[1], ground(big[1]) + 1, 40);
  const oco = ocotillo(r, cx + Math.min(w * 0.22, 48), ground(cx + Math.min(w * 0.22, 48)) + 1, 22);
  const front =
    nopal(cx - Math.min(w * 0.2, 44), ground(cx - Math.min(w * 0.2, 44)) + 1.5, 16) +
    agave(cx + Math.min(w * 0.3, 64), ground(cx + Math.min(w * 0.3, 64)) + 1, 11) +
    agave(cx - Math.min(w * 0.46, 96), ground(cx - Math.min(w * 0.46, 96)) + 1, 9);
  const rockX = cx - Math.min(w * 0.13, 30);
  const rock = poly([[rockX - 9, ground(rockX) + 2], [rockX - 6, ground(rockX) - 5], [rockX + 1, ground(rockX) - 7], [rockX + 7, ground(rockX) - 4], [rockX + 10, ground(rockX) + 2]]);
  return (
    <>
      <defs>
        <Glow id={id} name="sun" color="#ffcf7a" />
      </defs>
      <Sky id={id} stops={[[0, '#2a2052'], [0.36, '#7b3f7a'], [0.56, '#e0685a'], [0.66, '#f6a04b'], [0.72, '#ffd27a']]} />
      <Stars paths={stars} />
      <circle cx={sun.x} cy={sun.y} r={80} fill={`url(#${id}-sun)`} />
      <circle cx={sun.x} cy={sun.y} r={19} fill="#ffe7a8" />
      {soarer(1, cx - Math.min(w * 0.1, 22), 70, 0.9, '#5a2346', r)}
      <path d={buttes} fill="#8c4a6c" />
      <path d={area(dune1, w)} fill="#b8584f" />
      <path d={farCacti} fill="none" stroke="#b8584f" strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" />
      <path d={area(dune2, w)} fill="#8a3c45" />
      <path d={midCacti} fill="none" stroke="#8a3c45" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={area(ground, w)} fill="#3a1a34" />
      <path d={rock} fill="#3a1a34" />
      <path d={WOLF} fill="#3a1a34" transform={`translate(${f(rockX + 1)} ${f(ground(rockX) - 6.4)}) scale(0.36)`} />
      <path d={bigCacti} fill="none" stroke="#2a1128" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <path d={oco.stems} fill="none" stroke="#2a1128" strokeWidth={0.6} strokeLinecap="round" />
      <path d={oco.tips} fill="#e8553f" />
      <path d={front} fill="#2a1128" />
    </>
  );
};

/**
 * Canopée : une rangée de houppiers ronds posés sur un profil, et tout ce qui est dessous. Deux chemins à remplir
 * séparément : dans un seul, les ronds tracés dans l'autre sens que la surface y perceraient des trous.
 */
function canopy(r: Rng, profile: Profile, w: number, min: number, max: number, color: string): ReactNode {
  let crowns = '';
  for (let x = -6; x < w + 6; x += min * (0.9 + r() * 0.6)) crowns += circle(x, profile(x), min + r() * (max - min));
  return (
    <g>
      <path d={area((x) => profile(x) + min * 0.4, w)} fill={color} />
      <path d={crowns} fill={color} />
    </g>
  );
}

/** Grande feuille de bananier au premier plan, avec sa nervure. */
function bigLeaf(x: number, y: number, len: number, angle: number): { blade: string; rib: string } {
  const a = (angle * Math.PI) / 180;
  const tx = x + Math.cos(a) * len;
  const ty = y + Math.sin(a) * len;
  const nx = -Math.sin(a) * len * 0.22;
  const ny = Math.cos(a) * len * 0.22;
  const mx = (x + tx) / 2;
  const my = (y + ty) / 2;
  return {
    blade: `M${f(x)} ${f(y)}Q${f(mx + nx)} ${f(my + ny)} ${f(tx)} ${f(ty)}Q${f(mx - nx)} ${f(my - ny)} ${f(x)} ${f(y)}Z`,
    rib: `M${f(x)} ${f(y)}L${f(tx)} ${f(ty)}`,
  };
}

const selva: Paint = (r, w, id) => {
  const cx = w / 2;
  const templeX = cx + Math.min(w * 0.26, 62);
  const far = hills(r, 104, 4);
  const mid = hills(r, 120, 4);
  const near = hills(r, 138, 4);
  const temple = pyramid(templeX, far(templeX) + 4, 34, 34);
  let palms = '';
  let palmStems = '';
  for (const px of [cx - Math.min(w * 0.3, 70), cx - Math.min(w * 0.18, 42), cx + Math.min(w * 0.4, 86)]) {
    const base = mid(px) + 2;
    const topY = base - 34 - r() * 10;
    const topX = px + (r() - 0.5) * 6;
    palmStems += `M${f(px)} ${f(base)}Q${f(px + 2)} ${f((base + topY) / 2)} ${f(topX)} ${f(topY)}`;
    for (let k = 0; k < 7; k++) {
      const fr = frond(r, topX, topY, -170 + k * 27 + (r() - 0.5) * 8, 11 + r() * 4, 3, 3.4);
      palms += fr.leaves;
      palmStems += fr.stem;
    }
  }
  const leaves = [
    bigLeaf(-2, H + 2, 46, -58),
    bigLeaf(4, H + 4, 40, -36),
    bigLeaf(-4, H - 8, 36, -16),
    bigLeaf(w + 2, H + 2, 46, -122),
    bigLeaf(w - 4, H + 4, 40, -144),
    bigLeaf(w + 4, H - 10, 34, -166),
  ];
  let lianas = '';
  for (const lx of [cx - Math.min(w * 0.42, 90), cx + Math.min(w * 0.36, 78)]) {
    lianas += `M${f(lx)} -2Q${f(lx + 4)} 30 ${f(lx - 2)} ${f(52 + r() * 18)}`;
    lianas += `M${f(lx + 6)} -2Q${f(lx + 10)} 22 ${f(lx + 5)} ${f(38 + r() * 12)}`;
  }
  const flyers = Array.from({ length: 4 }, (_, i) => ({ x: cx + (r() - 0.5) * Math.min(w * 0.7, 160), y: 30 + r() * 30, s: 0.4 + r() * 0.2, color: i % 2 ? '#d8432f' : '#2f8f5b' }));
  return (
    <>
      <defs>
        <Glow id={id} name="sun" color="#fff6d0" />
        <Mist id={id} name="mist" color="#e8f2dc" />
      </defs>
      <Sky id={id} stops={[[0, '#1c4848'], [0.3, '#4f8a7a'], [0.52, '#b9dcb4'], [0.64, '#f2efc8']]} />
      <circle cx={cx - Math.min(w * 0.1, 24)} cy={70} r={74} fill={`url(#${id}-sun)`} />
      <path className="mx-rays" d={`M${f(cx - 30)} -2L${f(cx - 4)} -2L${f(cx + 40)} ${H}L${f(cx + 4)} ${H}Z M${f(cx + 6)} -2L${f(cx + 18)} -2L${f(cx + 70)} ${H}L${f(cx + 50)} ${H}Z`} fill="#fffbe0" style={timing(6, 2)} />
      {canopy(r, far, w, 3, 5, '#7aa892')}
      <path d={temple.body} fill="#8fb3a2" />
      <path d={temple.shade} fill="#3f6b5c" opacity={0.25} />
      <path d={temple.stairs} fill="#3f6b5c" opacity={0.18} />
      <path d={temple.rims} fill="none" stroke="#f6f2d0" strokeOpacity={0.4} strokeWidth={0.4} />
      <rect className="mx-mist" x={-10} y={92} width={w + 20} height={26} fill={`url(#${id}-mist)`} opacity={0.75} />
      {flyers.map((b, i) => soarer(i, b.x, b.y, b.s, b.color, r))}
      {canopy(r, mid, w, 4, 7, '#3f7a63')}
      <path d={palmStems} fill="none" stroke="#2a5e4a" strokeWidth={0.9} strokeLinecap="round" />
      <path d={palms} fill="#2a5e4a" />
      <rect className="mx-mist" x={-10} y={116} width={w + 20} height={22} fill={`url(#${id}-mist)`} opacity={0.45} style={timing(18, 4)} />
      {canopy(r, near, w, 5, 9, '#1f5641')}
      <path d={lianas} fill="none" stroke="#173f31" strokeWidth={0.7} strokeLinecap="round" />
      {leaves.map((leaf, i) => (
        <g key={i}>
          <path d={leaf.blade} fill={i % 3 === 1 ? '#164a37' : '#113a2c'} />
          <path d={leaf.rib} stroke="#2f6e52" strokeWidth={0.5} opacity={0.7} />
        </g>
      ))}
    </>
  );
};

const PAINTERS: Record<MexicoScene, Paint> = { panteon, monarcas, xochimilco, volcanes, barrancas, desierto, selva };

export function MexicoBackdrop({ scene, seed, className = '' }: { scene: MexicoScene; seed: string; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const width = useSceneWidth(ref, 900);
  const id = `mx${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const art = useMemo(() => PAINTERS[scene](mulberry32(hashString(`${scene} ${seed}`)), width, id), [scene, seed, width, id]);
  return (
    <svg ref={ref} className={`mx-scene ${className}`} viewBox={`0 0 ${width} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {art}
    </svg>
  );
}
