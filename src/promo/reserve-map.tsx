import { useMemo } from 'react';
import { acaciaCrown, acaciaTrunk, circle, crown, ellipse, lollipop, mountain, mulberry32, pine, type Rng } from '../art/kit';

// Plan de « Ma Réserve », dans le langage des affiches du jeu : aplats, ombres douces, arbres et montagnes tirés du même
// kit que les boosters. Vue de haut façon plan de parc : des allées de terre claire, des enclos clôturés par milieu,
// l'entrée en bas avec sa buvette. Les animaux (médaillons photo) et les étiquettes sont posés par-dessus en HTML.
// Repère : 390 × 600.

export const MW = 390;
export const MH = 600;

export type Box = readonly [number, number, number, number];
export const ZONES = {
  banquise: [14, 14, 180, 176],
  montagne: [210, 14, 376, 176],
  foret: [14, 206, 180, 388],
  savane: [210, 206, 376, 388],
  lagon: [14, 418, 180, 512],
  jungle: [210, 418, 376, 512],
} as const satisfies Record<string, Box>;

const RADIUS = 26;
const rr = ([x0, y0, x1, y1]: Box) => ({ x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: RADIUS });

/** Forme d'étang aux bords souples. */
function blob(r: Rng, cx: number, cy: number, rx: number, ry: number, n = 10): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.86 + r() * 0.24;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  // courbe lissée passant par les milieux des segments
  const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${mid(pts[n - 1], pts[0]).join(' ')}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return d + 'Z';
}

function Fence({ box }: { box: Box }) {
  return (
    <g fill="none">
      <rect {...rr(box)} stroke="#6e4527" strokeWidth={3.4} />
      <rect {...rr(box)} stroke="#b07a46" strokeWidth={1.6} />
      <rect {...rr(box)} stroke="#e0b077" strokeWidth={4.6} strokeDasharray="0.1 11" strokeLinecap="round" />
    </g>
  );
}

/** Arbre vu en plan : houppier rond, reflet clair, ombre portée. */
function Crown({ x, y, s, tone }: { x: number; y: number; s: number; tone: [string, string, string] }) {
  return (
    <g>
      <ellipse cx={x + s * 0.25} cy={y + s * 0.35} rx={s} ry={s * 0.8} fill="#0b170f" opacity={0.28} />
      <circle cx={x} cy={y} r={s} fill={tone[0]} />
      <circle cx={x - s * 0.28} cy={y - s * 0.3} r={s * 0.55} fill={tone[1]} />
      <circle cx={x + s * 0.4} cy={y + s * 0.35} r={s * 0.35} fill={tone[2]} opacity={0.6} />
    </g>
  );
}

/** Visiteur vu de haut, en aplats : épaules colorées et tête. */
function Visitor({ x, y, shirt, hair }: { x: number; y: number; shirt: string; hair: string }) {
  return (
    <g>
      <ellipse cx={x + 1} cy={y + 4.5} rx={4} ry={1.8} fill="#2a2318" opacity={0.25} />
      <rect x={x - 3.4} y={y - 1} width={6.8} height={6.4} rx={3} fill={shirt} />
      <circle cx={x} cy={y - 2.6} r={2.6} fill={hair} />
    </g>
  );
}

/** Nuages qui cachent une parcelle à débloquer. */
function Clouds({ box, r, id }: { box: Box; r: Rng; id: string }) {
  const [x0, y0, x1, y1] = box;
  const puffs: [number, number, number][] = [];
  for (let k = 0; k < 16; k++) puffs.push([x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 18 + r() * 22]);
  return (
    <g clipPath={`url(#${id})`}>
      <rect {...rr(box)} fill="#d9dfd3" opacity={0.6} />
      {puffs.map(([x, y, s], k) => (
        <g key={k}>
          <circle cx={x + 3} cy={y + 4} r={s} fill="#9aa69a" opacity={0.25} />
          <circle cx={x} cy={y} r={s} fill="#f3f4ee" opacity={0.75} />
        </g>
      ))}
    </g>
  );
}

const SHIRTS = ['#e8866b', '#86bccb', '#d9a441', '#a9cf7e', '#b98bff', '#f2c7d8', '#efe8d6', '#5d8fd8'];
const HAIRS = ['#2a2318', '#6b4426', '#c99a4b', '#3a2a1c', '#8a5a33'];

export function ReserveMap() {
  const art = useMemo(() => {
    const r = mulberry32(42);
    const tufts: string[] = [];
    for (let k = 0; k < 220; k++) {
      const x = r() * MW;
      const y = r() * MH;
      tufts.push(`M${x.toFixed(1)} ${y.toFixed(1)}l1.6 -3.2l1.6 3.2m1.2 0l1.4 -2.4l1.4 2.4`);
    }
    const flowers: [number, number, string][] = [];
    for (let k = 0; k < 60; k++) flowers.push([r() * MW, r() * MH, ['#f2c7d8', '#ffe08a', '#f6f1e1', '#b98bff'][k % 4]]);
    const savaneGrass: string[] = [];
    for (let k = 0; k < 40; k++) {
      const x = 222 + r() * 142;
      const y = 226 + r() * 150;
      savaneGrass.push(`M${x.toFixed(1)} ${y.toFixed(1)}l-1.5 -4m1.5 4l0 -5m0 5l1.5 -4`);
    }
    const visitors = [
      [195, 30], [192, 88], [198, 140], [40, 189], [96, 194], [150, 188], [250, 192], [318, 195], [360, 189],
      [196, 250], [193, 330], [60, 404], [130, 400], [262, 401], [340, 406], [196, 460], [192, 500],
      [150, 556], [236, 552], [200, 586], [262, 580], [116, 524], [300, 522],
    ].map(([x, y], k) => ({ x, y, shirt: SHIRTS[k % SHIRTS.length], hair: HAIRS[(k * 3) % HAIRS.length] }));
    const mountains = [mountain(r, 248, 70, 150, 50, 46), mountain(r, 322, 52, 150, 54, 52), mountain(r, 290, 96, 168, 44, 40)];
    return {
      tufts: tufts.join(''),
      flowers,
      savaneGrass: savaneGrass.join(''),
      visitors,
      mountains,
      banquisePond: blob(r, 122, 104, 44, 30),
      floe: blob(r, 134, 100, 15, 8, 7),
      savanePond: blob(r, 330, 362, 30, 13),
      lagonPond: blob(r, 100, 466, 66, 34, 12),
      r: mulberry32(7),
    };
  }, []);

  const clip = (zone: keyof typeof ZONES) => `rsv-clip-${zone}`;
  const water = (d: string, rim = '#bfe3f0') => (
    <g>
      <path d={d} fill={rim} transform="translate(0 2)" />
      <path d={d} fill="#4f9cc0" stroke={rim} strokeWidth={3} />
    </g>
  );
  const shine = (x: number, y: number, w: number) => <path d={`M${x} ${y}h${w}`} stroke="#d6f3fa" strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />;
  const snowyPine = (x: number, y: number, h: number) => (
    <g>
      <ellipse cx={x + 3} cy={y + 1} rx={h * 0.3} ry={h * 0.08} fill="#1d3550" opacity={0.25} />
      <path d={pine(x, y, h)} fill="#2e5b50" />
      <path d={pine(x, y - h * 0.5, h * 0.48) + pine(x, y - h * 0.18, h * 0.3)} fill="#f4f9ff" />
    </g>
  );
  const tree = (x: number, y: number, h: number, c = '#4f8a45') => (
    <g>
      <ellipse cx={x + 3} cy={y + 1} rx={h * 0.32} ry={h * 0.09} fill="#0b170f" opacity={0.25} />
      <path d={lollipop(x, y, h)} fill="#5a3a22" />
      <path d={crown(x, y, h)} fill={c} />
      <path d={circle(x - h * 0.1, y - h * 0.74, h * 0.16)} fill="#ffffff" opacity={0.12} />
    </g>
  );
  const acacia = (x: number, y: number, h: number) => (
    <g>
      <ellipse cx={x + 4} cy={y + 1} rx={h * 0.45} ry={h * 0.08} fill="#4a3412" opacity={0.25} />
      <path d={acaciaTrunk(x, y, h)} fill="#5a3a22" />
      <path d={acaciaCrown(x, y, h)} fill="#6f8f3a" />
    </g>
  );
  const rock = (x: number, y: number, s: number, c = '#a39f8c') => (
    <g>
      <path d={ellipse(x + 2, y + s * 0.45, s * 1.1, s * 0.4)} fill="#000" opacity={0.18} />
      <path d={ellipse(x, y, s, s * 0.62)} fill={c} />
      <path d={ellipse(x - s * 0.3, y - s * 0.2, s * 0.5, s * 0.26)} fill="#ffffff" opacity={0.25} />
    </g>
  );

  return (
    <svg className="rsv-map__art" viewBox={`0 0 ${MW} ${MH}`} aria-hidden="true">
      <defs>
        {(Object.keys(ZONES) as (keyof typeof ZONES)[]).map((z) => (
          <clipPath key={z} id={clip(z)}>
            <rect {...rr(ZONES[z])} />
          </clipPath>
        ))}
        <linearGradient id="rsv-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6fafd" />
          <stop offset="1" stopColor="#d6e5f1" />
        </linearGradient>
        <linearGradient id="rsv-savane" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2c06e" />
          <stop offset="1" stopColor="#c99f4c" />
        </linearGradient>
        <linearGradient id="rsv-foret" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f7843" />
          <stop offset="1" stopColor="#2f6238" />
        </linearGradient>
        <radialGradient id="rsv-meadow" cx="0.5" cy="0.55" r="0.75">
          <stop offset="0" stopColor="#6a9e58" />
          <stop offset="1" stopColor="#4c7d45" />
        </radialGradient>
      </defs>

      {/* prairie */}
      <rect width={MW} height={MH} fill="url(#rsv-meadow)" />
      <path d={art.tufts} fill="none" stroke="#3f6e3a" strokeWidth={0.9} opacity={0.55} />
      {art.flowers.map(([x, y, c], k) => (
        <circle key={k} cx={x} cy={y} r={1.3} fill={c} />
      ))}

      {/* allées */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {[
          'M195 -10 V560',
          'M-10 191 C 90 185, 300 197, 400 190',
          'M-10 403 C 100 409, 290 398, 400 404',
          'M-10 522 C 100 518, 290 526, 400 521',
        ].map((d) => (
          <path key={d} d={d} stroke="#bba270" strokeWidth={21} />
        ))}
        {[
          'M195 -10 V560',
          'M-10 191 C 90 185, 300 197, 400 190',
          'M-10 403 C 100 409, 290 398, 400 404',
          'M-10 522 C 100 518, 290 526, 400 521',
        ].map((d) => (
          <path key={d} d={d} stroke="#e8d9b0" strokeWidth={17} />
        ))}
      </g>
      {/* place de l'entrée, pavée */}
      <rect x={112} y={530} width={166} height={80} rx={20} fill="#bba270" />
      <rect x={114} y={532} width={162} height={80} rx={18} fill="#e8d9b0" />
      <path d="M124 548H266M124 564H266M124 580H266M124 596H266" stroke="#d3c08e" strokeWidth={1} />

      {/* ——— Banquise ——— */}
      <g clipPath={`url(#${clip('banquise')})`}>
        <rect {...rr(ZONES.banquise)} fill="url(#rsv-snow)" />
        <path d={ellipse(40, 150, 30, 7) + ellipse(90, 168, 34, 6) + ellipse(150, 160, 26, 6)} fill="#c6d9ea" opacity={0.7} />
        {water(art.banquisePond)}
        <path d={art.floe} fill="#f6fbff" stroke="#cfe6f2" strokeWidth={1.5} />
        {shine(100, 92, 10)}
        {shine(112, 120, 14)}
        {shine(140, 112, 8)}
        {snowyPine(30, 64, 40)}
        {snowyPine(54, 56, 32)}
        {snowyPine(80, 50, 26)}
        {snowyPine(166, 60, 36)}
        {rock(30, 92, 9, '#8d9aa6')}
      </g>
      <Fence box={ZONES.banquise} />

      {/* ——— Montagne (à débloquer) ——— */}
      <g clipPath={`url(#${clip('montagne')})`}>
        <rect {...rr(ZONES.montagne)} fill="#8f9a7c" />
        {art.mountains.map((m, k) => (
          <g key={k}>
            <path d={m.body} fill="#8e93ae" />
            <path d={m.shadow} fill="#101528" opacity={0.22} />
            <path d={m.snow} fill="#fdf2e6" />
          </g>
        ))}
        {snowyPine(226, 168, 30)}
        {snowyPine(362, 170, 34)}
      </g>
      <Clouds box={ZONES.montagne} r={art.r} id={clip('montagne')} />
      <rect {...rr(ZONES.montagne)} fill="none" stroke="#c9b48a" strokeWidth={1.6} strokeDasharray="3 5" />

      {/* ——— Forêt ——— */}
      <g clipPath={`url(#${clip('foret')})`}>
        <rect {...rr(ZONES.foret)} fill="url(#rsv-foret)" />
        {/* bambouseraie */}
        {Array.from({ length: 8 }, (_, k) => {
          const x = 26 + k * 6;
          const top = 214 + ((k * 7) % 12);
          return (
            <g key={k}>
              <path d={`M${x} ${top}V${top + 44}`} stroke="#9cc65a" strokeWidth={2.2} />
              <path d={`M${x - 1.4} ${top + 12}h2.8M${x - 1.4} ${top + 26}h2.8`} stroke="#5f8a35" strokeWidth={1.2} />
              <path d={ellipse(x + 3, top + 6, 3.5, 1.2) + ellipse(x - 3, top + 16, 3.5, 1.2)} fill="#7bb05c" />
            </g>
          );
        })}
        {(
          [
            [100, 226, 13], [128, 222, 16], [160, 232, 14], [166, 270, 12], [30, 300, 14], [24, 346, 16], [104, 372, 15], [150, 378, 13], [168, 330, 12],
          ] as const
        ).map(([x, y, s], k) => (
          <Crown key={k} x={x} y={y} s={s} tone={k % 2 ? ['#2f6a3c', '#4f8a45', '#1d4a2a'] : ['#3d7a42', '#6aa25a', '#245232']} />
        ))}
        <path d={ellipse(80, 300, 10, 3)} fill="#c94f3a" />
      </g>
      <Fence box={ZONES.foret} />

      {/* ——— Savane ——— */}
      <g clipPath={`url(#${clip('savane')})`}>
        <rect {...rr(ZONES.savane)} fill="url(#rsv-savane)" />
        <path d={art.savaneGrass} fill="none" stroke="#a88a3c" strokeWidth={1} strokeLinecap="round" />
        {water(art.savanePond, '#a88a4a')}
        {shine(318, 360, 12)}
        {acacia(352, 262, 52)}
        {acacia(240, 262, 44)}
        {rock(242, 346, 20, '#b0a283')}
        {rock(368, 320, 8, '#b0a283')}
      </g>
      <Fence box={ZONES.savane} />

      {/* ——— Lagon ——— */}
      <g clipPath={`url(#${clip('lagon')})`}>
        <rect {...rr(ZONES.lagon)} fill="#6aa25a" />
        {water(art.lagonPond, '#d8c38c')}
        {shine(70, 452, 14)}
        {shine(120, 480, 10)}
        {(
          [
            [58, 478], [134, 452], [90, 494],
          ] as const
        ).map(([x, y], k) => (
          <g key={k}>
            <path d={ellipse(x, y, 5, 3)} fill="#4f8a45" />
            <circle cx={x + 1} cy={y - 1} r={1.6} fill="#f2c7d8" />
          </g>
        ))}
        {[24, 28, 32, 164, 168, 172].map((x) => (
          <g key={x}>
            <path d={`M${x} ${436 + (x % 5)}v14`} stroke="#5f8a35" strokeWidth={1.4} />
            <path d={ellipse(x, 434 + (x % 5), 1.4, 3)} fill="#8a5a33" />
          </g>
        ))}
      </g>
      <Fence box={ZONES.lagon} />

      {/* ——— Jungle (à débloquer) ——— */}
      <g clipPath={`url(#${clip('jungle')})`}>
        <rect {...rr(ZONES.jungle)} fill="#2a5e37" />
        {(
          [
            [228, 434, 16], [262, 444, 18], [300, 430, 15], [338, 446, 19], [366, 470, 14], [240, 486, 18], [286, 492, 16], [326, 498, 17],
          ] as const
        ).map(([x, y, s], k) => (
          <Crown key={k} x={x} y={y} s={s} tone={['#1f5a32', '#2f7a42', '#164024']} />
        ))}
      </g>
      <Clouds box={ZONES.jungle} r={art.r} id={clip('jungle')} />
      <rect {...rr(ZONES.jungle)} fill="none" stroke="#c9b48a" strokeWidth={1.6} strokeDasharray="3 5" />

      {/* ——— entrée ——— */}
      {/* buvette */}
      <g>
        <rect x={22} y={544} width={74} height={44} rx={6} fill="#000" opacity={0.18} transform="translate(3 4)" />
        <rect x={22} y={548} width={74} height={40} rx={5} fill="#9a6a3c" />
        <rect x={32} y={560} width={54} height={16} rx={3} fill="#3a2a1c" />
        <rect x={30} y={574} width={58} height={4} rx={2} fill="#d8a86a" />
        {Array.from({ length: 8 }, (_, k) => (
          <rect key={k} x={20 + k * 9.75} y={538} width={9.75} height={14} fill={k % 2 ? '#f4ead2' : '#e8a83c'} />
        ))}
        <path d="M20 552 q4.9 5 9.75 0 q4.9 5 9.75 0 q4.9 5 9.75 0 q4.9 5 9.75 0 q4.9 5 9.75 0 q4.9 5 9.75 0 q4.9 5 9.75 0 q4.9 5 9.75 0" fill="#e8a83c" />
      </g>
      {/* parasols */}
      {(
        [
          [122, 574], [150, 596],
        ] as const
      ).map(([x, y], k) => (
        <g key={k}>
          <circle cx={x + 2} cy={y + 3} r={10} fill="#000" opacity={0.15} />
          <circle cx={x} cy={y} r={10} fill="#f4ead2" />
          <path d={`M${x} ${y - 10}A10 10 0 0 1 ${x + 10} ${y}L${x} ${y}ZM${x} ${y + 10}A10 10 0 0 1 ${x - 10} ${y}L${x} ${y}Z`} fill="#e8866b" />
        </g>
      ))}
      {/* portail */}
      <g>
        <rect x={160} y={552} width={8} height={50} rx={2} fill="#6e4527" />
        <rect x={222} y={552} width={8} height={50} rx={2} fill="#6e4527" />
        <rect x={150} y={540} width={90} height={18} rx={5} fill="#8a5a22" />
        <rect x={152} y={541} width={86} height={14} rx={4} fill="#d9a441" />
        <text x={195} y={552} textAnchor="middle" fill="#3a2508" fontFamily="'Lilita One', sans-serif" fontSize={11} letterSpacing={0.6}>
          MA RÉSERVE
        </text>
        <circle cx={160} cy={538} r={4} fill="#ffe08a" />
        <circle cx={230} cy={538} r={4} fill="#ffe08a" />
      </g>
      {/* bancs, massifs de fleurs, arbres */}
      {(
        [
          [292, 556], [292, 584],
        ] as const
      ).map(([x, y], k) => (
        <g key={k}>
          <rect x={x} y={y} width={26} height={7} rx={2} fill="#b07a46" />
          <rect x={x} y={y + 7} width={26} height={2} fill="#6e4527" />
        </g>
      ))}
      <path d={ellipse(350, 570, 22, 12)} fill="#3f6e3a" />
      {Array.from({ length: 14 }, (_, k) => (
        <circle key={k} cx={334 + (k % 7) * 5.5} cy={565 + Math.floor(k / 7) * 8} r={2} fill={['#f2c7d8', '#ffe08a', '#e8866b'][k % 3]} />
      ))}
      {tree(374, 548, 40)}
      {tree(250, 600, 36, '#3d7a42')}

      {/* visiteurs */}
      {art.visitors.map((v, k) => (
        <Visitor key={k} {...v} />
      ))}
    </svg>
  );
}
