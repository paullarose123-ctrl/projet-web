import type { ReactNode } from 'react';
import { circle, draw, ellipse, f, hashString, hills, mix, mulberry32, area, pine, poly, spots, type Pt } from '../art/kit';
import { SITE_SCENE } from '../art/scenes';
import { GARLAND_TILE, PumpkinMark, cobweb, spider } from '../components/Halloween';
import { Logo } from '../components/Logo';
import { Calavera, Marigolds } from '../components/MexicoBackdrop';
import { Landscape } from '../components/PackScene';
import { Fireflies, Line, Petals, clamp, easeInOut, easeOut, life, pop, rise, span } from './anim';
import { BAR, BARS } from './musique-halloween';

// Vidéo « Halloween est arrivé dans le jeu », au format TikTok (9:16). Chaque image est une fonction du temps `t`
// (rendu image par image : scripts/promo/video.mjs), calée sur les mesures de la musique (musique-halloween.ts).
// 1. le sous-bois du site, la nuit : « Ce soir, la forêt change de visage… » ; une horloge qui s'emballe
// 2. un éclair orange : la nuit d'Halloween, sa lune orange, les citrouilles, les bougies et les calaveras du Jour
//    des morts, la guirlande de cempasúchil du jeu qui tombe ; titre « Halloween »
// 3. la visite du jeu dans un téléphone : trois écrans capturés dans le vrai jeu (promo/captures, voir
//    scripts/promo/captures-halloween.mjs), un par mesure
// 4. jusqu'au 1er novembre, et l'adresse du jeu

export const DURATION = BAR * (BARS - 1) + 2.2;

const HALLOWEEN = BAR * 2; // coup de tambour : Halloween arrive
const TOUR = BAR * 5; // la visite du jeu
const END = BAR * 8;
const FINAL = BAR * 9; // accord final

/** Les écrans du jeu montrés dans le téléphone, capturés par scripts/promo/captures-halloween.mjs. */
export const SCREENS = [
  { src: '/promo/captures/accueil.png', caption: 'Le jeu passe à la nuit d’Halloween' },
  { src: '/promo/captures/duel.png', caption: 'Citrouilles et calaveras dans chaque écran' },
  { src: '/promo/captures/radio.png', caption: '3 musiques de saison à la radio' },
];

// ───────────── la nuit d'Halloween, en 9:16 ─────────────

const VW = 90;
const SKY = ['#0b0519', '#2a1140', '#6e2a4a'];
const MOON = '#ffa94d';
const NEAR = '#0b0614';
const tone = (k: number) => mix('#3b2456', NEAR, k);

interface Night {
  stars: string[];
  far: string;
  forest: string;
  mid: string;
  ground: string;
  graves: string;
  ground2: (x: number) => number;
}

let night: Night | null = null;

function paintNight(): Night {
  const r = mulberry32(hashString('Vidéo · Halloween'));
  const stars = ['', '', ''];
  for (let i = 0; i < 46; i++) stars[i % 3] += circle(r() * VW, r() * 92, 0.16 + r() * 0.34);
  const far = hills(r, 104, 3.2);
  const mid = hills(r, 116, 2.4);
  const ground = hills(r, 132, 1.6);
  // pierres tombales arrondies, un peu penchées, sur la butte du milieu
  let graves = '';
  for (const [x, h] of [[14, 5.4], [24, 4.2], [70, 5], [79, 3.8]] as Pt[]) {
    const y = mid(x) + 1;
    const w = h * 0.72;
    graves += `M${f(x - w / 2)} ${f(y)}V${f(y - h + w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(x + w / 2)} ${f(y - h + w / 2)}V${f(y)}Z`;
  }
  return {
    stars,
    far: area(far, VW),
    forest: draw(spots(r, far, VW, 5, 9, 2.4), (x, y, h) => pine(x, y + 1, h)),
    mid: area(mid, VW),
    ground: area(ground, VW),
    graves,
    ground2: ground,
  };
}

/** Citrouille sculptée posée en (x, y) ; la lueur de la bougie à l'intérieur vacille avec le temps. */
function pumpkin(x: number, y: number, s: number, t: number, phase: number): ReactNode {
  const at = (a: number, b: number): Pt => [x + a * s, y + b * s];
  const flicker = 0.78 + 0.22 * Math.sin(t * 9 + phase) * Math.sin(t * 5.3 + phase * 2);
  const eyes = poly([at(-3, -5.6), at(-1.2, -5.6), at(-2.1, -7.2)]) + poly([at(1.2, -5.6), at(3, -5.6), at(2.1, -7.2)]);
  const mouth = poly([at(-3.4, -3.6), at(-2.2, -2.8), at(-1.2, -3.4), at(0, -2.6), at(1.2, -3.4), at(2.2, -2.8), at(3.4, -3.6), at(2.4, -1.6), at(0, -1.1), at(-2.4, -1.6)]);
  return (
    <g key={`p${phase}`}>
      <circle cx={x} cy={y - 4 * s} r={11 * s} fill="url(#hw-pumpkin-glow)" opacity={flicker} />
      <path d={ellipse(x - 2.6 * s, y - 4 * s, 3.6 * s, 4 * s) + ellipse(x + 2.6 * s, y - 4 * s, 3.6 * s, 4 * s)} fill="#d9661b" />
      <path d={ellipse(x, y - 4.1 * s, 3.8 * s, 4.2 * s)} fill="#f08a2a" />
      <path d={`M${f(x - 0.5 * s)} ${f(y - 8 * s)}Q${f(x - 0.2 * s)} ${f(y - 10.2 * s)} ${f(x + 1.2 * s)} ${f(y - 10.6 * s)}L${f(x + 1.4 * s)} ${f(y - 9.8 * s)}Q${f(x + 0.6 * s)} ${f(y - 9.4 * s)} ${f(x + 0.6 * s)} ${f(y - 8 * s)}Z`} fill="#4f6a2a" />
      <path d={eyes + mouth} fill="#ffd36b" opacity={0.65 + 0.35 * flicker} />
    </g>
  );
}

/** Bougie posée en (x, y), de hauteur h ; la flamme danse avec le temps. */
function candle(x: number, y: number, h: number, t: number, phase: number): ReactNode {
  const w = Math.max(0.9, h * 0.26);
  const sway = Math.sin(t * 7 + phase) * 0.35;
  const tall = 1 + 0.18 * Math.sin(t * 11 + phase * 1.7);
  const top = y - h;
  return (
    <g key={`c${phase}`}>
      <circle cx={x} cy={top - 1.2} r={h * 1.7 + 3} fill="url(#hw-flame-glow)" opacity={0.75 + 0.25 * Math.sin(t * 8 + phase)} />
      <rect x={f(x - w / 2)} y={f(top)} width={f(w)} height={f(h)} rx={0.3} fill="#fbe9c8" />
      <path
        d={`M${f(x + sway)} ${f(top - 3.2 * tall)}C${f(x + 1.1)} ${f(top - 1.6)} ${f(x + 0.9)} ${f(top - 0.2)} ${f(x)} ${f(top - 0.2)}C${f(x - 0.9)} ${f(top - 0.2)} ${f(x - 1.1)} ${f(top - 1.6)} ${f(x + sway)} ${f(top - 3.2 * tall)}Z`}
        fill="#ffd166"
      />
    </g>
  );
}

function NightScene({ t }: { t: number }) {
  night ??= paintNight();
  const n = night;
  // la lune monte derrière les collines, puis se couche pour laisser la place à la date ; la scène avance doucement
  const moonUp = easeOut(span(t, HALLOWEEN - 0.2, HALLOWEEN + 3));
  const moonY = 118 - 40 * moonUp + 46 * easeInOut(span(t, END - 0.6, END + 1.2));
  const zoom = 1.1 - 0.1 * easeOut(span(t, HALLOWEEN, DURATION));
  const lift = (k: number) => (1 - easeOut(span(t, HALLOWEEN - 0.2, HALLOWEEN + 1.4))) * 14 * k;
  const g = n.ground2;
  const front: ReactNode[] = [
    pumpkin(16, g(16) + 1.4, 1.5, t, 1),
    pumpkin(29, g(29) + 1.6, 1, t, 2),
    pumpkin(73, g(73) + 1.4, 1.7, t, 3),
    candle(41, g(41) + 1.2, 6, t, 4),
    candle(46, g(46) + 1.4, 4, t, 5),
    candle(60, g(60) + 1.2, 5, t, 6),
    candle(85, g(85) + 1.2, 3.5, t, 7),
  ];
  return (
    <svg className="promo__scene" viewBox={`0 0 ${VW} 160`} preserveAspectRatio="xMidYMid slice" style={{ transform: `scale(${zoom})` }}>
      <defs>
        <linearGradient id="hw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SKY[0]} />
          <stop offset="0.45" stopColor={SKY[1]} />
          <stop offset="0.75" stopColor={SKY[2]} />
        </linearGradient>
        <radialGradient id="hw-moon-glow">
          <stop offset="0" stopColor={MOON} stopOpacity={0.6} />
          <stop offset="0.35" stopColor={MOON} stopOpacity={0.22} />
          <stop offset="1" stopColor={MOON} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="hw-pumpkin-glow">
          <stop offset="0" stopColor="#ff9a3c" stopOpacity={0.6} />
          <stop offset="0.4" stopColor="#ff9a3c" stopOpacity={0.2} />
          <stop offset="1" stopColor="#ff9a3c" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="hw-flame-glow">
          <stop offset="0" stopColor="#ffb347" stopOpacity={0.55} />
          <stop offset="0.35" stopColor="#ffb347" stopOpacity={0.2} />
          <stop offset="1" stopColor="#ffb347" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="hw-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b4a7a" stopOpacity={0} />
          <stop offset="1" stopColor="#8b4a7a" stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <rect x={-2} y={-2} width={VW + 4} height={164} fill="url(#hw-sky)" />
      {n.stars.map((d, i) => (
        <path key={i} d={d} fill="#fff6e6" opacity={[0.8, 0.5, 0.3][i] * (0.75 + 0.25 * Math.sin(t * (1.5 + i) + i))} />
      ))}
      <circle cx={45} cy={moonY} r={44} fill="url(#hw-moon-glow)" />
      <circle cx={45} cy={moonY} r={20 + Math.sin(t * 1.3) * 0.6} fill="none" stroke={MOON} strokeOpacity={0.22} strokeWidth={0.4} />
      <circle cx={45} cy={moonY} r={28 + Math.sin(t * 1.05) * 0.8} fill="none" stroke={MOON} strokeOpacity={0.12} strokeWidth={0.4} />
      <circle cx={45} cy={moonY} r={13} fill={MOON} />
      <path d={circle(40.5, moonY - 3, 2.2) + circle(48, moonY + 3.5, 3) + circle(49.5, moonY - 5, 1.3)} fill="#e07f2c" opacity={0.45} />
      {/* deux voiles de nuages qui passent devant la lune */}
      <g opacity={0.55} fill={tone(0.2)}>
        <path d={ellipse(((t * 2.2) % 130) - 25, moonY + 4, 13, 1.6) + ellipse(((t * 2.2) % 130) - 18, moonY + 2.6, 7, 1.4)} />
        <path d={ellipse(110 - ((t * 1.6) % 140), moonY - 7, 10, 1.3)} />
      </g>
      <g transform={`translate(0 ${lift(0.4)})`}>
        <path d={n.far} fill={tone(0.15)} />
        <path d={n.forest} fill={tone(0.4)} />
      </g>
      <rect x={-2} y={92} width={VW + 4} height={22} fill="url(#hw-mist)" opacity={0.8} />
      <g transform={`translate(0 ${lift(0.8)})`}>
        <path d={n.mid} fill={tone(0.62)} />
        <path d={n.graves} fill={tone(0.5)} />
        <Calavera x={20} y={g(20) - 9} s={0.8} accent="#e4407b" />
        <Calavera x={66} y={g(66) - 10} s={0.7} accent="#2fb5a8" />
      </g>
      <g transform={`translate(0 ${lift(1.3)})`}>
        <path d={n.ground} fill={NEAR} />
        <Marigolds list={[[8, g(8) + 1, 2.2], [12, g(12) + 1.2, 1.8], [35, g(35) + 1, 2], [52, g(52) + 1.2, 1.7], [56, g(56) + 1, 2.3], [80, g(80) + 1.2, 2], [88, g(88) + 1, 1.8]]} />
        {front}
      </g>
    </svg>
  );
}

/** Toile d'araignée dans le coin haut droit, et son araignée qui descend au bout de son fil. */
function Web({ t, from }: { t: number; from: number }) {
  const k = easeOut(span(t, from, from + 1.4));
  const drop = 10 + 26 * k + Math.sin(t * 1.4) * 2;
  return (
    <svg className="promo-hw__web" viewBox="0 0 100 70" style={{ opacity: clamp(k * 3) }}>
      <path d={cobweb(100, 0, 42, -1)} fill="none" stroke="rgba(255, 246, 230, 0.5)" strokeWidth={0.35} />
      {spider(80, 0, drop, 1.6)}
    </svg>
  );
}

// ───────────── la vidéo ─────────────

export function HalloweenPromo({ t }: { t: number }) {
  // 1. le sous-bois : il s'assombrit et vire au violet pendant que l'horloge s'emballe, puis l'éclair
  const dusk = easeInOut(span(t, HALLOWEEN - 1.6, HALLOWEEN));
  const flash = t >= HALLOWEEN ? Math.exp(-(t - HALLOWEEN) * 3.6) : dusk * 0.18;
  const shake = t < HALLOWEEN && dusk > 0 ? dusk * 3 : 0;

  // 2. la guirlande tombe et se balance, avant de s'amortir
  const g = span(t, HALLOWEEN + 0.1, HALLOWEEN + 1.3);
  const garlandY = (1 - easeOut(g)) * -90 + Math.sin(g * Math.PI * 3) * (1 - g) * 10;

  // 3. la visite : le téléphone monte, chaque écran glisse au suivant sur le premier temps d'une mesure
  const phoneIn = easeOut(span(t, TOUR - 0.5, TOUR + 0.3));
  const phoneOut = easeInOut(span(t, END - 0.45, END + 0.15));
  // le premier écran est déjà là quand le téléphone monte
  const slide = (i: number) => (i === 0 ? 1 : easeInOut(span(t, TOUR + i * BAR - 0.3, TOUR + i * BAR + 0.1)));
  const darken = 0.15 + 0.5 * life(t, TOUR - 0.6, TOUR, END - 0.4, END + 0.4) + 0.25 * easeOut(span(t, END, END + 0.8));

  return (
    <div className="promo promo-hw">
      {/* 2. la nuit d'Halloween */}
      {t >= HALLOWEEN - 0.05 && (
        <div className="promo__layer">
          <NightScene t={t} />
          <div className="promo-hw__darken" style={{ opacity: darken }} />
        </div>
      )}

      {/* 1. le sous-bois du site */}
      {t < HALLOWEEN && (
        <div className="promo__layer" style={{ transform: `translate(${Math.sin(t * 57) * shake}px, ${Math.cos(t * 49) * shake}px)` }}>
          <Landscape className="promo__forest" scene={SITE_SCENE} seed="sous-bois" maxWidth={600} />
          <Fireflies t={t} opacity={1 - dusk} />
          <div className="promo-hw__dusk" style={{ opacity: dusk * 0.85 }} />
          <Line className="promo__logo" style={{ ...rise(life(t, 0.25, 0.9)), top: 470 }}>
            <Logo />
          </Line>
          <Line className="promo__kicker" style={{ ...rise(life(t, 0.9, 1.5)), top: 562 }}>
            Ce soir, la forêt change de visage…
          </Line>
        </div>
      )}

      {t >= HALLOWEEN && <div className="promo-hw__garland" style={{ backgroundImage: GARLAND_TILE, transform: `translateY(${garlandY}px)` }} />}
      {t >= HALLOWEEN && <Web t={t} from={HALLOWEEN + 0.6} />}
      <Petals t={t} from={HALLOWEEN + 0.4} />

      {/* titre */}
      <Line className="promo-hw__eyebrow" style={{ ...rise(life(t, HALLOWEEN + 0.3, HALLOWEEN + 0.8, TOUR - 0.6, TOUR - 0.2)), top: 168 }}>
        Nouveau dans AnimalCards
      </Line>
      <Line
        className="promo-hw__title"
        style={{ ...pop(span(t, HALLOWEEN + 0.1, HALLOWEEN + 0.8)), opacity: clamp(span(t, HALLOWEEN + 0.1, HALLOWEEN + 0.3)) * (1 - easeInOut(span(t, TOUR - 0.6, TOUR - 0.1))), top: 200 }}
      >
        Halloween
      </Line>
      <Line className="promo-hw__kicker" style={{ ...rise(life(t, HALLOWEEN + 0.9, HALLOWEEN + 1.5, TOUR - 0.6, TOUR - 0.2)), top: 318 }}>
        est arrivé dans le jeu !
      </Line>
      <Line className="promo-hw__pill" style={{ ...rise(life(t, HALLOWEEN + BAR * 1.15, HALLOWEEN + BAR * 1.15 + 0.6, TOUR - 0.6, TOUR - 0.2)), top: 376 }}>
        <span>+ le Jour des morts</span>
      </Line>

      {/* 3. la visite du jeu */}
      {t >= TOUR - 0.6 && t < END + 0.3 && (
        <>
          {SCREENS.map((screen, i) => {
            const shown = life(t, TOUR + i * BAR - 0.25, TOUR + i * BAR + 0.25, TOUR + (i + 1) * BAR - 0.3, TOUR + (i + 1) * BAR + 0.05);
            const k = i === SCREENS.length - 1 ? life(t, TOUR + i * BAR - 0.25, TOUR + i * BAR + 0.25, END - 0.45, END) : shown;
            return (
              <Line key={screen.src} className="promo-hw__caption" style={{ ...rise(k, 18), top: 128 }}>
                {screen.caption}
              </Line>
            );
          })}
          <div
            className="promo-hw__phone"
            style={{
              opacity: phoneIn * (1 - phoneOut),
              transform: `translate(-50%, 0) translateY(${(1 - phoneIn) * 260 + phoneOut * 220 + Math.sin(t * 1.6) * 4}px) rotate(${(1 - phoneIn) * 8 + Math.sin(t * 1.1) * 1.2}deg)`,
            }}
          >
            <div className="promo-hw__screen">
              {SCREENS.map((screen, i) => {
                // chaque écran entre par la droite et sort par la gauche, avec un léger zoom pendant qu'il est montré
                const x = (1 - slide(i)) * 100 - slide(i + 1) * 100;
                const zoom = 1 + 0.05 * span(t, TOUR + i * BAR, TOUR + (i + 1) * BAR);
                if (x <= -100 || x >= 100) return null;
                return <img key={screen.src} src={screen.src} alt="" style={{ transform: `translateX(${x}%) scale(${zoom})` }} />;
              })}
            </div>
          </div>
        </>
      )}

      {/* 4. jusqu'au 1er novembre */}
      {t >= END - 0.2 && (
        <>
          <Line className="promo__logo promo__logo--end" style={{ ...rise(easeOut(span(t, END, END + 0.7))), top: 150 }}>
            <Logo />
          </Line>
          <Line className="promo-hw__pill" style={{ ...rise(easeOut(span(t, END + 0.3, END + 0.9))), top: 228 }}>
            <span>Halloween · Jour des morts</span>
          </Line>
          <div className="promo-hw__emblem" style={{ ...pop(span(t, END + 0.5, END + 1.2)) }}>
            <div className="promo-hw__emblem-glow" style={{ opacity: 0.75 + 0.25 * Math.sin(t * 7) * Math.sin(t * 4.1) }} />
            <div style={{ transform: `rotate(${Math.sin(t * 2.2) * 4}deg)` }}>
              <PumpkinMark className="promo-hw__pumpkin" />
            </div>
          </div>
          <Line className="promo__date-label promo-hw__until" style={{ ...rise(easeOut(span(t, FINAL - 0.6, FINAL))), top: 488 }}>
            Jusqu’au
          </Line>
          <Line className="promo-hw__date" style={{ ...pop(span(t, FINAL, FINAL + 0.6)), top: 520 }}>
            1er novembre
          </Line>
          <Line className="promo-hw__next" style={{ ...rise(easeOut(span(t, FINAL + 0.5, FINAL + 1))), top: 606 }}>
            puis la Série 2 · Mexique arrive
          </Line>
          <Line className="promo__url" style={{ ...rise(easeOut(span(t, FINAL + 0.8, FINAL + 1.3))), top: 664 }}>
            Joue gratuitement sur <b>animalcards.fr</b>
          </Line>
        </>
      )}

      <div className="promo-hw__flash" style={{ opacity: flash }} />
    </div>
  );
}

