import { useId, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { SCENE_H, area, circle, ellipse, f, hashString, hills, mulberry32, pine, poly, type Pt, type Rng } from '../art/kit';
import { useSceneWidth } from './PackScene';

// Décors des ouvertures des boosters du Mexique, autour du Jour des morts (Día de Muertos, les 1er et 2 novembre) :
// - panteon : le cimetière d'un village la nuit des morts, une arche de cempasúchil, un autel, des bougies et des
//   guirlandes de papel picado sous la pleine lune ;
// - monarcas : la forêt de sapins oyamel du Michoacán au crépuscule, où les monarques arrivent pour la fête
//   (on dit qu'ils portent les âmes des défunts) ;
// - xochimilco : les canaux la nuit, des trajineras éclairées de lanternes, des bougies et des fleurs sur l'eau.
// Même manière que les paysages du jeu (aplats, astre, silhouettes), avec les couleurs de la fête : cempasúchil
// orange, rose mexicain, violet, turquoise. Bougies, pétales, fanions et papillons bougent doucement (voir motion.css).
// Repère : hauteur 172, largeur adaptée à l'écran (comme Landscape) ; la composition est centrée sur x = W / 2,
// où se tient le booster.

export type MexicoScene = 'panteon' | 'monarcas' | 'xochimilco';
export const MEXICO_SCENES: MexicoScene[] = ['panteon', 'monarcas', 'xochimilco'];

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

const PAINTERS: Record<MexicoScene, Paint> = { panteon, monarcas, xochimilco };

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
