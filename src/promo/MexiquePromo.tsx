import type { CSSProperties, ReactNode } from 'react';
import { EAGLE, area, bird, circle, draw, hashString, hills, mix, mulberry32, peaks, spots } from '../art/kit';
import { agave, cardon, nopal, pyramid, ridgeSnow, volcano } from '../art/mexique';
import { SITE_SCENE } from '../art/scenes';
import { CardBackMexique } from '../components/CardBackMexique';
import { Logo } from '../components/Logo';
import { PackArtMexique } from '../components/PackArtMexique';
import { Landscape } from '../components/PackScene';
import { BAR } from './musique';

// Vidéo de la Série 2 (Mexique), au format TikTok (9:16). Chaque image est une fonction du temps `t` :
// rien n'est animé par le navigateur, on peut donc la rendre image par image (scripts/promo/mexique.mjs).
// 1. le sous-bois du site, « après les Animaux du monde… »
// 2. le soleil se lève sur le Mexique : pyramide de Teotihuacan, Popocatépetl, aigle royal, papel picado,
//    pétales de cempasúchil ; titre « Mexique »
// 3. le booster de la Série 2 tombe, se charge et se déchire : cinq cartes mystère en éventail
// 4. la date de sortie et l'adresse du jeu

export const DURATION = 21.5;
export const W = 540;
export const H = 960;

const clamp = (x: number) => Math.max(0, Math.min(1, x));
/** avancement de `a` à `b` (0 → 1) */
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const backOut = (x: number) => 1 + 2.4 * (x - 1) ** 3 + 1.4 * (x - 1) ** 2;
/** apparition de a à b, disparition de c à d */
const life = (t: number, a: number, b: number, c?: number, d?: number) =>
  easeOut(span(t, a, b)) * (c === undefined || d === undefined ? 1 : 1 - easeInOut(span(t, c, d)));

// moments clés, calés sur les mesures de la musique (une mesure = 1,5 s)
const MEXICO = BAR * 2; // l'orchestre entre, le Mexique apparaît
const BOOSTER = BAR * 6;
const TEAR = BAR * 8;
const END = BAR * 10;
const DATE = BAR * 12; // accord final

// ───────────── le paysage du Mexique, en 9:16 ─────────────

const VW = 90;
const SKY = ['#006847', '#f7e3c2'];
const SUN = '#fff8ea';
const FAR = '#c9473d';
const NEAR = '#170807';
const tone = (k: number) => mix(FAR, NEAR, k);

interface Scene {
  stars: string[];
  birds: string;
  izta: string;
  iztaSnow: string;
  popo: { body: string; snow: string; shadow: string };
  rows: Array<{ ground: string; plants: string }>;
  pyramid: ReturnType<typeof pyramid>;
  front: string;
  cacti: string;
}

let scene: Scene | null = null;

function paintScene(): Scene {
  const r = mulberry32(hashString('Vidéo · Série 2 · Mexique'));
  const stars = ['', '', ''];
  for (let i = 0; i < 40; i++) stars[i % 3] += circle(r() * VW, r() * 70, 0.18 + r() * 0.36);
  let birds = '';
  for (let i = 0; i < 3; i++) birds += bird(24 + (r() - 0.5) * 10, 70 + (r() - 0.5) * 5, 1.1 * (0.6 + r() * 0.7), 0.6 + r() * 0.8);
  const izta = peaks(
    r,
    106,
    [
      [62, 22, 12],
      [74, 27, 11],
      [86, 23, 10],
    ],
    1.1,
  );
  const popo = volcano(r, 18, 74, 107, 22, 21);
  const l1 = hills(r, 106, 2.2);
  const l2 = hills(r, 118, 2.4);
  const l3 = hills(r, 131, 2);
  return {
    stars,
    birds,
    izta: area(izta, VW),
    iztaSnow: ridgeSnow(izta, 52, 92, 88),
    popo,
    rows: [
      { ground: area(l1, VW), plants: draw(spots(r, l1, VW, 3.2, 5, 6), agave) },
      { ground: area(l2, VW), plants: draw(spots(r, l2, VW, 6.5, 10, 8), (x, y, h) => (r() < 0.5 ? nopal(x, y, h) : agave(x, y, h * 0.75))) },
      { ground: area(l3, VW), plants: '' },
    ],
    pyramid: pyramid(46, l1(46) + 0.6, 38, 22),
    front: agave(66, l3(66) + 1, 13) + nopal(26, l3(26) + 1, 16) + agave(46, l3(46) + 1, 8),
    cacti: cardon(9, l3(9) + 1, 36) + cardon(83, l3(83) + 1, 27),
  };
}

function MexicoScene({ t }: { t: number }) {
  scene ??= paintScene();
  const s = scene;
  const rise = easeOut(span(t, MEXICO - 0.4, MEXICO + 3.5));
  const sunY = 124 - 44 * rise;
  // léger travelling vers l'avant, et les plans proches qui montent à l'apparition (profondeur)
  const zoom = 1.12 - 0.12 * easeOut(span(t, MEXICO - 0.4, DURATION));
  const lift = (k: number) => (1 - easeOut(span(t, MEXICO - 0.4, MEXICO + 1.6))) * 14 * k;
  const eagleK = span(t, MEXICO + 0.6, BOOSTER + 2);
  const eagleX = -14 + eagleK * 122;
  const eagleY = 54 - Math.sin(eagleK * Math.PI) * 10;
  const mist = (y0: number, y1: number, opacity: number) => <rect x={-2} y={y0} width={VW + 4} height={y1 - y0} fill="url(#mx-mist)" opacity={opacity} />;
  return (
    <svg className="promo__scene" viewBox={`0 0 ${VW} 160`} preserveAspectRatio="xMidYMid slice" style={{ transform: `scale(${zoom})` }}>
      <defs>
        <linearGradient id="mx-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix('#02261a', SKY[0], rise)} />
          <stop offset="0.62" stopColor={mix('#4c6b53', SKY[1], rise)} />
        </linearGradient>
        <radialGradient id="mx-glow">
          <stop offset="0" stopColor={SUN} stopOpacity={0.65} />
          <stop offset="0.35" stopColor={SUN} stopOpacity={0.24} />
          <stop offset="1" stopColor={SUN} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="mx-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SKY[1]} stopOpacity={0} />
          <stop offset="1" stopColor={SKY[1]} stopOpacity={0.85} />
        </linearGradient>
      </defs>
      <rect x={-2} y={-2} width={VW + 4} height={164} fill="url(#mx-sky)" />
      {s.stars.map((d, i) => (
        <path key={i} d={d} fill="#ffffff" opacity={[0.75, 0.5, 0.3][i] * (1 - rise * 0.85)} />
      ))}
      <circle cx={45} cy={sunY} r={50} fill="url(#mx-glow)" />
      <circle cx={45} cy={sunY} r={22 + Math.sin(t * 1.4) * 0.6} fill="none" stroke={SUN} strokeOpacity={0.22} strokeWidth={0.4} />
      <circle cx={45} cy={sunY} r={31 + Math.sin(t * 1.1) * 0.8} fill="none" stroke={SUN} strokeOpacity={0.12} strokeWidth={0.4} />
      <circle cx={45} cy={sunY} r={14} fill={SUN} />
      <g opacity={0.35 * rise}>
        <path d={`M${4 + t * 0.6} 78h26M${52 - t * 0.4} 72h30M${14 + t * 0.3} 84h20`} stroke={SUN} strokeWidth={1.3} strokeLinecap="round" />
      </g>
      <path d={EAGLE} fill={tone(0.85)} transform={`translate(${eagleX} ${eagleY}) rotate(${-4 + Math.sin(t * 2) * 3}) scale(1.6)`} />
      <path d={s.birds} fill={tone(0.85)} transform={`translate(${Math.sin(t * 0.5) * 3} 0)`} />
      <g transform={`translate(0 ${lift(0.3)})`}>
        <path d={s.izta} fill={mix(FAR, SKY[1], 0.14)} />
        <path d={s.iztaSnow} fill="#ffffff" opacity={0.88} />
        {/* le Popocatépetl fume : des volutes qui montent et s'étirent */}
        {Array.from({ length: 9 }, (_, k) => {
          const age = (t * 0.22 + k / 9) % 1;
          return <circle key={k} cx={18 + age * 20} cy={72 - age * 20} r={2.4 + age * 5.5} fill={mix(SKY[1], NEAR, 0.18)} opacity={0.42 * (1 - age) * Math.min(1, age * 6)} />;
        })}
        <path d={s.popo.body} fill={FAR} />
        <path d={s.popo.snow} fill="#ffffff" opacity={0.92} />
        <path d={s.popo.shadow} fill={NEAR} opacity={0.16} />
      </g>
      {mist(86, 108, 0.6)}
      <g transform={`translate(0 ${lift(0.6)})`}>
        <path d={s.rows[0].ground} fill={tone(0.34)} />
        <path d={s.rows[0].plants} fill={tone(0.34)} />
        <path d={s.pyramid.body} fill={tone(0.48)} />
        <path d={s.pyramid.shade} fill={NEAR} opacity={0.22} />
        <path d={s.pyramid.stairs} fill={NEAR} opacity={0.16} />
        <path d={s.pyramid.steps} fill="none" stroke={SUN} strokeOpacity={0.2} strokeWidth={0.3} />
        <path d={s.pyramid.rims} fill="none" stroke={SUN} strokeOpacity={0.45} strokeWidth={0.4} />
      </g>
      {mist(98, 118, 0.4)}
      <g transform={`translate(0 ${lift(1)})`}>
        <path d={s.rows[1].ground} fill={tone(0.68)} />
        <path d={s.rows[1].plants} fill={tone(0.68)} />
      </g>
      <g transform={`translate(0 ${lift(1.5)})`}>
        <path d={s.rows[2].ground} fill={NEAR} />
        <path d={s.front} fill={NEAR} />
        <path d={s.cacti} fill="none" stroke={NEAR} strokeWidth={3.8} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// ───────────── papel picado : guirlandes de papier découpé ─────────────

const PAPEL = ['#c9473d', '#e2b25a', '#006847', '#fff3dd', '#a9cf7e', '#c4213a', '#f08a3c'];

function Papel({ t }: { t: number }) {
  const k = span(t, MEXICO + 0.2, MEXICO + 1.6);
  // chute, puis balancement amorti
  const drop = (1 - easeOut(k)) * -260 + Math.sin(k * Math.PI * 3) * (1 - k) * 18;
  const lines = [
    { y: 8, sag: 28, n: 7, x0: -20, step: 82, size: 0.92 },
    { y: 84, sag: 24, n: 6, x0: 22, step: 86, size: 0.78 },
  ];
  return (
    <svg className="promo__papel" viewBox={`0 0 ${W} 260`} style={{ transform: `translateY(${drop}px)` }}>
      <defs>
        {/* motif découpé, en unités de chaque fanion */}
        <mask id="papel-cut" maskContentUnits="objectBoundingBox">
          <rect x={0} y={0} width={1} height={1} fill="#fff" />
          <circle cx={0.5} cy={0.42} r={0.13} fill="#000" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <ellipse key={i} cx={0.5 + Math.cos(a) * 0.24} cy={0.42 + Math.sin(a) * 0.19} rx={0.05} ry={0.04} fill="#000" />;
          })}
          {[0.16, 0.84].map((x) => (
            <path key={x} d={`M${x} 0.12 L${x + 0.06} 0.2 L${x} 0.28 L${x - 0.06} 0.2Z`} fill="#000" />
          ))}
          {[0.2, 0.35, 0.5, 0.65, 0.8].map((x) => (
            <circle key={x} cx={x} cy={0.74} r={0.035} fill="#000" />
          ))}
        </mask>
      </defs>
      {lines.map((line, li) => {
        const sway = Math.sin(t * 1.6 + li) * 3;
        const yAt = (x: number) => line.y + line.sag * (1 - ((x - W / 2) / (W / 2 + 40)) ** 2) + sway * 0.4;
        let path = '';
        for (let x = -20; x <= W + 20; x += 20) path += `${x === -20 ? 'M' : 'L'}${x} ${yAt(x).toFixed(1)}`;
        return (
          <g key={li}>
            <path d={path} fill="none" stroke="rgba(255,248,236,0.55)" strokeWidth={1.4} />
            {Array.from({ length: line.n }, (_, i) => {
              const x = line.x0 + i * line.step + 40;
              const y = yAt(x);
              const fw = 56 * line.size;
              const fh = 66 * line.size;
              let d = `M${-fw / 2} 0H${fw / 2}V${fh * 0.82}`;
              for (let z = 0; z < 6; z++) d += `L${fw / 2 - (z + 0.5) * (fw / 6)} ${fh * (z % 2 ? 0.82 : 1)}`;
              d += `L${-fw / 2} ${fh * 0.82}Z`;
              const angle = Math.sin(t * 2.1 + i * 1.3 + li * 2) * 5 + Math.sin(k * Math.PI * 4) * (1 - k) * 14;
              return (
                <g key={i} transform={`translate(${x} ${y}) rotate(${angle})`}>
                  <path d={d} fill={PAPEL[(i * 3 + li * 2) % PAPEL.length]} mask="url(#papel-cut)" opacity={0.95} />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// ───────────── pétales de cempasúchil (la fleur du Jour des morts, le 1er novembre) ─────────────

function Petals({ t, from }: { t: number; from: number }) {
  if (t < from) return null;
  const r = mulberry32(42);
  const fade = span(t, from, from + 1);
  return (
    <svg className="promo__petals" viewBox={`0 0 ${W} ${H}`}>
      {Array.from({ length: 34 }, (_, i) => {
        const x0 = r() * W;
        const speed = 60 + r() * 70;
        const phase = r() * Math.PI * 2;
        const spin = (r() - 0.5) * 300;
        const offset = r() * H;
        const size = 4 + r() * 4;
        const y = ((t - from) * speed + offset) % (H + 60) - 30;
        const x = x0 + Math.sin(t * 1.3 + phase) * 26;
        return (
          <ellipse
            key={i}
            cx={0}
            cy={0}
            rx={size}
            ry={size * 0.55}
            fill={['#ff9f1c', '#ffbf47', '#f37b20', '#ffd166'][i % 4]}
            opacity={0.9 * fade}
            transform={`translate(${x} ${y}) rotate(${spin * t + phase * 57})`}
          />
        );
      })}
    </svg>
  );
}

// ───────────── lucioles du sous-bois (début) ─────────────

function Fireflies({ t, opacity }: { t: number; opacity: number }) {
  const r = mulberry32(7);
  return (
    <svg className="promo__fireflies" viewBox={`0 0 ${W} ${H}`} style={{ opacity }}>
      {Array.from({ length: 26 }, (_, i) => {
        const x = r() * W + Math.sin(t * (0.4 + r() * 0.5) + i) * 24;
        const y = 300 + r() * 600 + Math.cos(t * (0.3 + r() * 0.4) + i * 2) * 18 - t * 6;
        const glow = 0.35 + 0.65 * Math.max(0, Math.sin(t * (1.2 + r()) + i * 1.7));
        return (
          <g key={i} opacity={glow}>
            <circle cx={x} cy={y} r={7} fill="#d9f2a0" opacity={0.18} />
            <circle cx={x} cy={y} r={2.2} fill="#f4ffd0" />
          </g>
        );
      })}
    </svg>
  );
}

// ───────────── textes ─────────────

function Line({ children, style, className = '' }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={`promo__line ${className}`} style={style}>
      {children}
    </div>
  );
}

/** Apparition d'un texte : fondu et montée (ou rebond pour un titre). */
const rise = (k: number, px = 24): CSSProperties => ({ opacity: k, transform: `translateY(${(1 - k) * px}px)` });
const pop = (k: number): CSSProperties => ({ opacity: clamp(k * 3), transform: `scale(${0.6 + 0.4 * backOut(k)})` });

// ───────────── la vidéo ─────────────

export function MexiquePromo({ t }: { t: number }) {
  // 1. sous-bois du site
  const introOut = easeInOut(span(t, MEXICO - 0.5, MEXICO + 0.4));
  // ouverture en cercle depuis le soleil
  const reveal = easeInOut(span(t, MEXICO - 0.45, MEXICO + 0.5));

  // 3. booster
  const drop = span(t, BOOSTER, BOOSTER + 0.6);
  const landed = t >= BOOSTER + 0.6;
  const squash = landed ? Math.sin(span(t, BOOSTER + 0.6, BOOSTER + 1) * Math.PI) * 0.06 : 0;
  const charge = span(t, TEAR - 0.85, TEAR);
  const shake = charge > 0 && t < TEAR ? charge * 7 : 0;
  const packY = (1 - easeOut(drop)) * -760 + (landed ? Math.sin((t - BOOSTER) * 2) * 6 : 0);
  const packVisible = t >= BOOSTER && t < TEAR;
  const shine = span(t, BOOSTER + 1.3, BOOSTER + 2.1);
  const flash = t >= TEAR ? Math.exp(-(t - TEAR) * 4.2) : charge * 0.25;
  const cardsK = (i: number) => span(t, TEAR + 0.05 + i * 0.07, TEAR + 0.75 + i * 0.07);
  const cardsOut = easeInOut(span(t, END - 0.5, END + 0.3));
  const rays = life(t, TEAR, TEAR + 0.6, END - 0.5, END + 0.3);

  // 4. fin
  const endK = (a: number, b = a + 0.6) => easeOut(span(t, a, b));
  const darken = 0.18 * life(t, BOOSTER, BOOSTER + 0.8) + 0.42 * easeOut(span(t, END - 0.4, END + 0.8));

  return (
    <div className="promo">
      {/* 2. le Mexique, révélé en cercle depuis le soleil */}
      <div className="promo__layer" style={{ clipPath: `circle(${reveal * 120}% at 50% 70%)` }}>
        <MexicoScene t={t} />
        <div className="promo__darken" style={{ opacity: darken }} />
      </div>

      {/* 1. le sous-bois du site */}
      {introOut < 1 && (
        <div className="promo__layer" style={{ opacity: 1 - introOut }}>
          <Landscape className="promo__forest" scene={SITE_SCENE} seed="sous-bois" maxWidth={600} />
          <Fireflies t={t} opacity={1} />
          <Line className="promo__logo" style={{ ...rise(life(t, 0.25, 0.9)), top: 500 }}>
            <Logo />
          </Line>
          <Line className="promo__kicker" style={{ ...rise(life(t, 0.9, 1.5)), top: 592 }}>
            Après les « Animaux du monde »…
          </Line>
          <Line className="promo__eyebrow" style={{ ...rise(life(t, 1.7, 2.2)), top: 660 }}>
            Cap sur un nouveau pays
          </Line>
        </div>
      )}

      {/* éclat du lever de soleil */}
      <div className="promo__sunburst" style={{ opacity: Math.sin(reveal * Math.PI) * 0.7 }} />

      {t >= MEXICO && <Papel t={t} />}
      <Petals t={t} from={MEXICO + 0.6} />

      {/* titre */}
      <Line className="promo__eyebrow promo__eyebrow--light" style={{ ...rise(life(t, MEXICO + 0.6, MEXICO + 1.1, BOOSTER - 0.4, BOOSTER + 0.2)), top: 196 }}>
        Série 2 · nouvelle extension
      </Line>
      <Line className="promo__title" style={{ ...pop(span(t, MEXICO + 0.9, MEXICO + 1.6)), opacity: clamp(span(t, MEXICO + 0.9, MEXICO + 1.1) * 1) * (1 - easeInOut(span(t, BOOSTER - 0.4, BOOSTER + 0.2))), top: 228 }}>
        Mexique
      </Line>
      <Line className="promo__kicker promo__kicker--light" style={{ ...rise(life(t, MEXICO + 1.8, MEXICO + 2.4, BOOSTER - 0.4, BOOSTER + 0.2)), top: 344 }}>
        Ses animaux, ses habitats et son booster
      </Line>

      {/* 3. le booster tombe, se charge et se déchire */}
      {rays > 0 && <div className="promo__rays" style={{ opacity: rays, transform: `translate(-50%, -50%) rotate(${t * 18}deg)` }} />}
      {packVisible && (
        <div
          className="promo__pack"
          style={{
            transform: `translate(-50%, -50%) translate(${Math.sin(t * 61) * shake}px, ${packY + Math.cos(t * 53) * shake}px) perspective(1200px) rotateY(${Math.sin((t - BOOSTER) * 1.3) * 14}deg) rotateX(${Math.sin((t - BOOSTER) * 0.9) * 5}deg) scale(${1 + charge * 0.06 + squash}, ${1 + charge * 0.06 - squash})`,
            filter: `drop-shadow(0 0 ${10 + charge * 50}px rgba(255, 226, 150, ${0.2 + charge * 0.7})) drop-shadow(0 24px 30px rgba(0,0,0,0.45))`,
          }}
        >
          <PackArtMexique />
          {shine > 0 && shine < 1 && (
            <div className="promo__shine-clip">
              <div className="promo__shine" style={{ transform: `translateX(${-120 + shine * 360}%) skewX(-18deg)` }} />
            </div>
          )}
        </div>
      )}
      <Line className="promo__eyebrow promo__eyebrow--light" style={{ ...rise(life(t, BOOSTER + 0.8, BOOSTER + 1.3, TEAR - 0.6, TEAR - 0.2)), top: 686 }}>
        Le booster de la Série 2
      </Line>

      {t >= TEAR &&
        cardsOut < 1 &&
        [-2, -1, 0, 1, 2].map((slot, i) => {
          const k = backOut(cardsK(i));
          const angle = slot * 11 * k;
          const x = slot * 92 * k;
          const y = Math.abs(slot) * 26 * k - 10 + Math.sin(t * 1.8 + i) * 5;
          return (
            <div
              key={slot}
              className="promo__card"
              style={{
                opacity: clamp(cardsK(i) * 4) * (1 - cardsOut),
                transform: `translate(-50%, -50%) translate(${x}px, ${y + cardsOut * 80}px) rotate(${angle}deg) scale(${0.35 + 0.65 * k})`,
                zIndex: 10 - Math.abs(slot),
              }}
            >
              <CardBackMexique />
              <span className="promo__mystery" style={{ opacity: span(t, TEAR + 0.6 + i * 0.08, TEAR + 1 + i * 0.08) }}>
                ?
              </span>
            </div>
          );
        })}
      <Line className="promo__question" style={{ ...rise(life(t, TEAR + 1, TEAR + 1.6, END - 0.5, END)), top: 690 }}>
        Quels animaux t’attendent ?
      </Line>
      <div className="promo__flash" style={{ opacity: flash }} />

      {/* 4. la date de sortie */}
      {t >= END - 0.2 && (
        <>
          <Line className="promo__logo promo__logo--end" style={{ ...rise(endK(END, END + 0.7)), top: 186 }}>
            <Logo />
          </Line>
          <Line className="promo__pill" style={{ ...rise(endK(END + 0.4, END + 1)), top: 262 }}>
            <span>Série 2 · México</span>
          </Line>
          <div
            className="promo__duo"
            style={{ opacity: endK(END + 0.6, END + 1.3), transform: `translate(-50%, 0) translateY(${(1 - endK(END + 0.6, END + 1.4)) * 40}px)` }}
          >
            <div className="promo__duo-card" style={{ transform: `rotate(${-10 + Math.sin(t * 1.2) * 2}deg)` }}>
              <CardBackMexique />
            </div>
            <div className="promo__duo-pack" style={{ transform: `rotate(${6 + Math.sin(t * 1.1 + 1) * 2}deg) translateY(${Math.sin(t * 1.6) * 4}px)` }}>
              <PackArtMexique />
            </div>
          </div>
          <Line className="promo__date-label" style={{ ...rise(endK(DATE - 0.5, DATE)), top: 566 }}>
            Disponible le
          </Line>
          <Line className="promo__date" style={{ ...pop(span(t, DATE, DATE + 0.6)), top: 598 }}>
            1er novembre
          </Line>
          <Line className="promo__url" style={{ ...rise(endK(DATE + 0.7, DATE + 1.2)), top: 684 }}>
            Joue gratuitement sur <b>animalcards.fr</b>
          </Line>
        </>
      )}
    </div>
  );
}
