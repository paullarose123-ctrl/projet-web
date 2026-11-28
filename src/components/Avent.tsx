import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../store/game';
import { useNow } from '../hooks/useNow';
import { AVENT, AVENT_DAYS, AVENT_LAYOUT, aventDay, aventOpened, type AventDay } from '../engine/avent';
import { AVENT_BACK, AVENT_GROUND, AVENT_STARS_A, AVENT_STARS_B } from '../art/avent';
import { ellipse, f, poly, type Pt } from '../art/kit';
import { BallIcon } from './Balles';
import { MiniPack } from './MiniPack';
import { PackArt } from './PackArt';
import { SportIcon } from './SportIcon';
import { CardBackHiver } from './CardBackHiver';
import { star } from './Noel';
import { fox, rabbit, stag } from './PackScene';
import { sfx } from '../audio/sfx';

// Calendrier de l'Avent, sur l'accueil du 1er au 24 décembre (voir engine/avent.ts), dans la nature comme le reste du
// jeu : le grand sapin de la forêt, la nuit, sous la neige et la lune. Ses lumières chaudes scintillent, une chouette
// cligne des yeux sur une branche. Sur ses branches, 23 nichoirs en bois, porte ronde fermée et numérotée dans le
// désordre ; tout en haut, l'étoile du sapin garde la case du 24. Le nichoir du jour brille autour de sa porte et un
// rouge-gorge sautille sur son toit ; on le touche, la porte s'ouvre sur une lumière chaude et une mésange s'envole.
// Puis le cadeau arrive à l'écran, emballé dans du papier kraft avec sa ficelle et un brin de sapin : il tremble,
// s'ouvre dans un éclat de lumière et montre ce qu'il contient. Les nichoirs ouverts restent éclairés, leur cadeau
// au creux de l'entrée ; les nichoirs oubliés restent fermés, pris dans le givre.

type BoxState = 'open' | 'today' | 'missed' | 'later';

/** Le cadeau en quelques mots. */
function shortTitle(entry: AventDay): string {
  if (entry.short) return entry.short;
  const reward = entry.reward;
  if (reward.kind === 'credits') return `${reward.amount.toLocaleString('fr-FR')} crédits`;
  if (reward.kind === 'boosters') return `${reward.count} boosters`;
  if (reward.kind === 'energie') return 'Énergie miracle';
  if (reward.pack.id.startsWith('avent-')) return entry.title.replace(/^Une /, '');
  return reward.pack.name;
}

/** Le cadeau en petit, au creux d'un nichoir ouvert. */
function SmallGift({ entry }: { entry: AventDay }) {
  const reward = entry.reward;
  if (reward.kind === 'credits') return <BallIcon className="nichoir__gift" />;
  if (reward.kind === 'boosters') return <MiniPack className="nichoir__gift" />;
  if (reward.kind === 'energie') return <Bolt className="nichoir__gift" />;
  if (reward.pack.sport) return <SportIcon sport={reward.pack.sport} className="nichoir__gift nichoir__gift--sport" />;
  if (reward.pack.id.startsWith('avent-')) return <span className="nichoir__gift nichoir__gift--card" style={{ backgroundImage: AVENT_BACK }} />;
  return <MiniPack className="nichoir__gift" />;
}

function Bolt({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.5 2L5 13.5H11L9.5 22L19 9.5H12.8Z" fill="#ffd166" stroke="#a8740f" strokeWidth={1} strokeLinejoin="round" />
    </svg>
  );
}

// ───────────── le grand sapin ─────────────

/** Les cinq étages du sapin : [pointe, base, demi-largeur], dans un repère de 100 × 125. */
const TIERS: [number, number, number][] = [
  [3, 27, 15],
  [13, 41, 23],
  [26, 55, 31],
  [39, 69, 39],
  [52, 83, 47],
];

/** Les nichoirs sur les branches : une rangée par étage (2, 3, 4, 5, 6), puis trois dans la neige au pied du sapin. */
const SPOTS: Pt[] = [
  ...[
    [21, 2],
    [35, 3],
    [49, 4],
    [63, 5],
    [77, 6],
  ].flatMap(([y, n]) => Array.from({ length: n }, (_, i): Pt => [50 + (i - (n - 1) / 2) * 14, y])),
  [22, 104],
  [50, 108],
  [78, 104],
];
/** Les jours des nichoirs, mélangés (le 24 est l'étoile). */
const DAYS = AVENT_LAYOUT.filter((day) => day !== AVENT_DAYS);

const WARM = ['#ffd166', '#ffe7a3', '#ffb35c', '#fff1c1'];

function useTreeArt() {
  return useMemo(() => {
    let body = '';
    let shade = '';
    let snow = '';
    let lumps = '';
    let wire = '';
    const bulbs: [number, number, string, number][] = [];
    TIERS.forEach(([apex, base, half], k) => {
      // l'étage : un triangle au bas festonné en pointes
      const n = 8;
      const pts: Pt[] = [[50, apex], [50 + half, base]];
      for (let i = 1; i < n; i++) pts.push([50 + half - (i * 2 * half) / n, base - (i % 2 ? 3.4 : 0.4)]);
      pts.push([50 - half, base]);
      body += poly(pts);
      shade += poly([[50, apex], [50 + half, base], [50, base - 1]]);
      // la neige : un bonnet à la pointe, et des paquets sur les pointes du bas
      const t = 0.17;
      snow += poly([[50, apex - 0.6], [50 + half * t, apex + (base - apex) * t], [50 + half * t * 0.3, apex + (base - apex) * t * 1.12], [50 - half * t * 0.4, apex + (base - apex) * t * 0.98], [50 - half * t, apex + (base - apex) * t]]);
      for (let i = 2; i <= n - 2; i += 2) lumps += ellipse(50 + half - (i * 2 * half) / n, base - 1.4, 1.7, 0.75);
      // une guirlande de lumières chaudes en feston sur l'étage
      const y0 = apex + (base - apex) * 0.62;
      const w0 = half * 0.62;
      wire += `M${f(50 - w0)} ${f(y0)}Q50 ${f(y0 + 7)} ${f(50 + w0)} ${f(y0 - 1)}`;
      const count = 4 + k;
      for (let i = 0; i <= count; i++) {
        const u = i / count;
        const x = (1 - u) * (1 - u) * (50 - w0) + 2 * u * (1 - u) * 50 + u * u * (50 + w0);
        const y = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * (y0 + 7) + u * u * (y0 - 1);
        bulbs.push([x, y + 0.8, WARM[(i + k) % WARM.length], (i + k) % 2]);
      }
    });
    return { body, shade, snow, lumps, wire, bulbs };
  }, []);
}

/** Le sapin, son tronc, la neige à son pied et ses lumières. */
function Tree() {
  const id = `sapin${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const art = useTreeArt();
  return (
    <svg className="avent__tree-art" viewBox="0 0 100 125" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#fff2c4" stopOpacity={0.95} />
          <stop offset="0.4" stopColor="#ffc861" stopOpacity={0.4} />
          <stop offset="1" stopColor="#ffc861" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}-snow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f9ff" />
          <stop offset="1" stopColor="#c9dcef" />
        </linearGradient>
      </defs>
      {/* la neige au pied du sapin, et son ombre */}
      <path d="M-240 132V108Q-120 100 -20 102Q20 90 50 93T120 101Q220 100 340 108V132Z" fill={`url(#${id}-snow)`} />
      <path d={ellipse(50, 95.5, 22, 3)} fill="#8fb0cf" opacity={0.5} />
      {/* des animaux dans la neige : un cerf (sur grand écran, à gauche du sapin), un lièvre, un renard */}
      <g transform="translate(-58 106) scale(1.25)">{stag('#5b3d28')}</g>
      <g transform="translate(-88 109) scale(0.9)">{stag('#6b4a33')}</g>
      <g transform="translate(36 115) scale(0.55)">{rabbit('#9a7552')}</g>
      <g transform="translate(94 101.4) scale(0.5)">{fox('#d9662a', '#fff4e6')}</g>
      {/* une souche dans la neige, où la chouette s'est posée */}
      <path d="M3.6 96.6H13.4L13 102H4Z" fill="#6b4428" />
      <path d={ellipse(8.5, 96.6, 4.9, 1.5)} fill="#c4925a" />
      <path d={ellipse(8.5, 96.2, 4.4, 0.9)} fill="#f4f9ff" />
      {/* le tronc */}
      <path d="M45.6 80H54.4L55.4 96H44.6Z" fill="#5a3a24" />
      <path d="M48 82V95M51.6 83V94" stroke="#3e2716" strokeWidth={0.6} opacity={0.7} />
      {/* les étages, de bas en haut (l'étage du haut passe devant celui du dessous) */}
      <path d={art.body} fill="#1f4d3a" />
      <path d={art.shade} fill="#0c2a1f" opacity={0.35} />
      <path d={art.snow} fill="#f4f9ff" opacity={0.94} />
      <path d={art.lumps} fill="#f4f9ff" opacity={0.9} />
      {/* les lumières : le fil, puis deux rangs de halos qui s'allument tour à tour */}
      <path d={art.wire} fill="none" stroke="#2c1d12" strokeWidth={0.35} opacity={0.7} />
      {[0, 1].map((group) => (
        <g key={group} className={`avent__lights avent__lights--${group ? 'b' : 'a'}`}>
          {art.bulbs
            .filter((b) => b[3] === group)
            .map(([x, y], k) => (
              <circle key={k} cx={f(x)} cy={f(y)} r={3.4} fill={`url(#${id}-glow)`} />
            ))}
        </g>
      ))}
      {art.bulbs.map(([x, y, color], k) => (
        <circle key={k} cx={f(x)} cy={f(y)} r={0.85} fill={color} />
      ))}
    </svg>
  );
}

/** Chouette perchée sur une branche, qui cligne des yeux de temps en temps. */
function Owl() {
  return (
    <svg className="avent__owl" viewBox="-10 -14 20 22" aria-hidden="true">
      <path d="M-6.4 -8.6L-5 -13L-3 -9.4ZM6.4 -8.6L5 -13L3 -9.4Z" fill="#6b4a2f" />
      <ellipse cx={0} cy={-2} rx={7.2} ry={9} fill="#7a5638" />
      <ellipse cx={0} cy={1.4} rx={4.6} ry={5.4} fill="#d9bf96" />
      <path d="M-3 0.4l1 1 1-1M1 0.4l1 1 1-1M-1 3l1 1 1-1" stroke="#8a6a46" strokeWidth={0.5} fill="none" />
      <circle cx={-2.9} cy={-6} r={2.7} fill="#fff4dc" />
      <circle cx={2.9} cy={-6} r={2.7} fill="#fff4dc" />
      <circle cx={-2.9} cy={-6} r={1.5} fill="#e0a019" />
      <circle cx={2.9} cy={-6} r={1.5} fill="#e0a019" />
      <circle cx={-2.9} cy={-6} r={0.8} fill="#1b1410" />
      <circle cx={2.9} cy={-6} r={0.8} fill="#1b1410" />
      <g className="avent__owl-lids">
        <ellipse cx={-2.9} cy={-6} rx={2.8} ry={2.8} fill="#7a5638" />
        <ellipse cx={2.9} cy={-6} rx={2.8} ry={2.8} fill="#7a5638" />
      </g>
      <path d="M-0.9 -4.4L0 -2.4L0.9 -4.4Z" fill="#e0a019" />
      <path d="M-3 7.2l-1 1.2M-1.6 7.4v1.4M1.6 7.4v1.4M3 7.2l1 1.2" stroke="#e0a019" strokeWidth={0.7} strokeLinecap="round" />
    </svg>
  );
}

/** Rouge-gorge posé sur le toit du nichoir du jour, qui sautille. */
function Robin() {
  return (
    <svg className="nichoir__robin" viewBox="-12 -16 24 18" aria-hidden="true">
      <path d="M-9 -6L-12.5 -9L-11.5 -4.5Z" fill="#6b4a33" />
      <ellipse cx={-1} cy={-6} rx={8} ry={6} fill="#8a6345" />
      <path d="M-1.5 -10.5C3 -11 6.6 -8 6 -3.8C5.4 -1 2 0 -0.6 -0.6C1.6 -3 1.6 -7.4 -1.5 -10.5Z" fill="#e2603a" />
      <circle cx={4.4} cy={-11} r={4.2} fill="#8a6345" />
      <path d="M2.4 -12.6C5 -14.4 8.4 -12.4 8 -9.6C6.6 -8.6 4.4 -8.8 3 -10Z" fill="#e2603a" />
      <circle cx={5.4} cy={-12} r={0.75} fill="#1b1410" />
      <path d="M8.2 -11.2L11 -10.4L8.2 -9.6Z" fill="#3a2a1d" />
      <path d="M-2 -0.4V2M1 -0.6V2" stroke="#4a3526" strokeWidth={0.7} strokeLinecap="round" />
    </svg>
  );
}

/** Mésange qui s'envole du nichoir qu'on ouvre. */
function Bird() {
  return (
    <svg className="nichoir__bird" viewBox="-12 -12 24 20" aria-hidden="true">
      <ellipse cx={0} cy={0} rx={6} ry={4.4} fill="#f2c94c" />
      <path d="M-6 -1L-11 -3L-10 1.6Z" fill="#4a6fa5" />
      <circle cx={4.4} cy={-2.6} r={3.4} fill="#2a3b55" />
      <circle cx={4.6} cy={-2.2} r={2} fill="#ffffff" />
      <circle cx={5.4} cy={-2.8} r={0.6} fill="#1b1410" />
      <path d="M7.4 -2.6L9.6 -2L7.4 -1.4Z" fill="#3a2a1d" />
      <path className="nichoir__wing" d="M-2 -2C-1 -10 4 -11 5 -8C3 -5 1 -3 -2 -2Z" fill="#4a6fa5" />
    </svg>
  );
}

/** Le toit et le corps d'un nichoir (la porte ronde et son entrée sont posées par-dessus). */
function NichoirArt() {
  return (
    <svg className="nichoir__art" viewBox="-12 -4 124 124" aria-hidden="true">
      <rect className="nichoir__body" x={6} y={34} width={88} height={82} rx={5} />
      <path className="nichoir__grain" d="M24 40V112M42 38V114M58 38V114M76 40V112" />
      <rect className="nichoir__perch" x={44} y={98} width={12} height={6} rx={3} />
      <path className="nichoir__roofline" d="M-6 44L50 8L106 44" />
      <path d="M-8 38.6L50 2.6L108 38.6" fill="none" stroke="#f4f9ff" strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
      <path d="M8 31q2 5 4 0M26 19.6q2 6 4 0M70 19.6q2 6 4 0M88 31q2 5 4 0" fill="#f4f9ff" />
    </svg>
  );
}

function Nichoir({ day, index, state, opening, at, onOpen }: { day: number; index: number; state: BoxState; opening: boolean; at: Pt; onOpen: () => void }) {
  const entry = AVENT[day - 1];
  const date = `${day === 1 ? '1er' : day} décembre`;
  const label =
    state === 'open'
      ? `${date} : ${shortTitle(entry)}`
      : state === 'today'
        ? `Ouvrir le nichoir du ${date}`
        : state === 'missed'
          ? `Nichoir du ${date}, passé`
          : `Nichoir du ${date}, à ouvrir ce jour-là`;
  const lit = state === 'open' || opening;
  return (
    <button
      type="button"
      className={`nichoir nichoir--w${index % 4} nichoir--${state}${opening ? ' is-opening' : ''}${lit ? ' is-lit' : ''}`}
      style={{ left: `${at[0]}%`, top: `${(at[1] / 125) * 100}%`, '--i': index } as CSSProperties}
      disabled={state !== 'today' || opening}
      onClick={onOpen}
      aria-label={label}
      title={label}
    >
      <NichoirArt />
      <span className="nichoir__hole">{lit && <SmallGift entry={entry} />}</span>
      <span className="nichoir__door">
        <b>{day}</b>
      </span>
      {state === 'missed' && <i className="nichoir__givre" />}
      {state === 'today' && !opening && <Robin />}
      {opening && <Bird />}
    </button>
  );
}

/** L'étoile en haut du sapin : la case du 24. */
function Etoile({ state, opening, onOpen }: { state: BoxState; opening: boolean; onOpen: () => void }) {
  const entry = AVENT[AVENT_DAYS - 1];
  const lit = state === 'open' || opening;
  const label = state === 'open' ? `24 décembre : ${shortTitle(entry)}` : state === 'today' ? 'Ouvrir l’étoile du 24 décembre' : 'L’étoile du 24 décembre, le grand cadeau du réveillon';
  return (
    <button
      type="button"
      className={`etoile etoile--${state}${opening ? ' is-opening' : ''}${lit ? ' is-lit' : ''}`}
      disabled={state !== 'today' || opening}
      onClick={onOpen}
      aria-label={label}
      title={label}
    >
      <svg viewBox="-12 -12 24 24" aria-hidden="true">
        <path d={star(0, 0.6, 11)} className="etoile__shape" />
        <path d={star(0, 0.6, 7.6)} className="etoile__core" />
      </svg>
      <b>24</b>
    </button>
  );
}

// ───────────── la cérémonie du cadeau ─────────────

/** Le cadeau emballé dans du papier kraft : sa ficelle, son brin de sapin et ses baies (le couvercle s'envole). */
function Present() {
  return (
    <svg className="avent-reveal__present" viewBox="0 0 120 110" aria-hidden="true">
      <g className="avent-reveal__box">
        <rect x={14} y={42} width={92} height={64} rx={4} fill="#c9a271" />
        <path d="M14 56H106M14 72H106M14 90H106" stroke="#b08a5a" strokeWidth={0.8} opacity={0.5} />
        <rect x={60} y={42} width={46} height={64} fill="#000" opacity={0.1} />
        <path d="M59 42V106M62 42V106" stroke="#7a4a24" strokeWidth={1.4} />
        <path d="M14 74H106M14 77H106" stroke="#7a4a24" strokeWidth={1.4} />
      </g>
      <g className="avent-reveal__lid">
        <rect x={8} y={28} width={104} height={18} rx={3} fill="#d4ad7c" />
        <rect x={8} y={40} width={104} height={6} fill="#000" opacity={0.12} />
        <path d="M59 28V46M62 28V46" stroke="#7a4a24" strokeWidth={1.4} />
        {/* le nœud de ficelle, un brin de sapin, des baies et une pomme de pin */}
        <path d="M60.5 28C50 14 40 22 48 27C52 29 57 29 60.5 28ZM60.5 28C71 14 81 22 73 27C69 29 64 29 60.5 28Z" fill="none" stroke="#7a4a24" strokeWidth={1.6} />
        <path d="M60 26L30 14M60 26L88 12M44 20.2L41 15.6M44 20.2L40.6 22.4M36 17L33.6 12.6M36 17L32.6 19.4M74 19.4L76.2 14.6M74 19.4L77.6 21.4M82 15.6L83.4 10.8M82 15.6L86 17.2" stroke="#2f6b4a" strokeWidth={2.4} strokeLinecap="round" />
        <path d="M60 26L30 14M60 26L88 12" stroke="#1f4d3a" strokeWidth={1} />
        <ellipse cx={68} cy={21} rx={4} ry={6} transform="rotate(-30 68 21)" fill="#8a5a2c" />
        <path d="M65 17l5 2M64.4 20.4l6 1.6M65 23.6l4.6 1" stroke="#5a3a1c" strokeWidth={0.9} />
        <circle cx={54} cy={22} r={3} fill="#c0392b" />
        <circle cx={50} cy={25} r={2.6} fill="#d64541" />
        <circle cx={55.6} cy={26.6} r={2.4} fill="#b3262e" />
        <circle cx={53} cy={21} r={0.9} fill="#fff" opacity={0.7} />
      </g>
    </svg>
  );
}

/** Le cadeau en grand, qui sort du paquet. */
function BigGift({ entry }: { entry: AventDay }) {
  const reward = entry.reward;
  if (reward.kind === 'credits') {
    return (
      <span className="avent-reveal__coins">
        <BallIcon />
        <BallIcon />
        <BallIcon />
        <b>+{reward.amount.toLocaleString('fr-FR')}</b>
      </span>
    );
  }
  if (reward.kind === 'boosters') {
    return (
      <span className="avent-reveal__boosters" style={{ '--n': reward.count } as CSSProperties}>
        {Array.from({ length: reward.count }, (_, k) => (
          <span key={k} style={{ '--k': k - (reward.count - 1) / 2 } as CSSProperties}>
            <MiniPack />
          </span>
        ))}
      </span>
    );
  }
  if (reward.kind === 'energie') return <Bolt className="avent-reveal__bolt" />;
  const pack = reward.pack;
  if (pack.id.startsWith('avent-')) {
    return (
      <span className="avent-reveal__card">
        <CardBackHiver />
        <b>?</b>
      </span>
    );
  }
  return (
    <span className="avent-reveal__pack">
      <PackArt tone={pack.tone} name={pack.name} sport={pack.sport} size={pack.size} />
    </span>
  );
}

function Reveal({ day, onClaim }: { day: number; onClaim: () => void }) {
  const entry = AVENT[day - 1];
  const reward = entry.reward;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // le paquet arrive et tremble, s'ouvre dans un éclat, puis le cadeau sort
    const timers = [
      window.setTimeout(() => sfx.drumroll(0.9), 550),
      window.setTimeout(() => sfx.burst(), 1500),
      window.setTimeout(() => sfx.fanfare(), 1650),
      window.setTimeout(() => setReady(true), 2100),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);
  const action = reward.kind === 'pack' ? (reward.pack.size > 1 ? 'Ouvrir le pack' : 'Découvrir la carte') : 'Récupérer';
  return createPortal(
    <div className="avent-reveal" role="dialog" aria-modal="true" aria-label={`Calendrier de l’Avent, ${day} décembre`}>
      <div className="avent-reveal__glow" aria-hidden="true" />
      <div className="avent-reveal__rays" aria-hidden="true" />
      <p className="avent-reveal__date">
        Calendrier de l’Avent · {day === 1 ? '1er' : day} décembre
      </p>
      <div className="avent-reveal__stage">
        <Present />
        <span className="avent-reveal__flash" aria-hidden="true" />
        <span className="avent-reveal__gift">
          <BigGift entry={entry} />
        </span>
        <span className="avent-reveal__sparks" aria-hidden="true">
          {Array.from({ length: 22 }, (_, k) => (
            <i
              key={k}
              className={k % 4 === 0 ? 'is-star' : k % 3 === 0 ? 'is-red' : k % 3 === 1 ? 'is-green' : ''}
              style={{ '--a': `${(k * 360) / 22 + (k % 2) * 8}deg`, '--r': `${110 + (k % 5) * 24}px` } as CSSProperties}
            />
          ))}
        </span>
      </div>
      <div className="avent-reveal__text">
        <h2>{entry.title} !</h2>
        {entry.note && <p>{entry.note}</p>}
      </div>
      <button type="button" className={`btn btn--primary btn--lg avent-reveal__claim${ready ? ' is-ready' : ''}`} disabled={!ready} onClick={onClaim}>
        {action}
      </button>
    </div>,
    document.body,
  );
}

// ───────────── le calendrier ─────────────

/** Neige qui tombe sur la forêt. */
const FLAKES = Array.from({ length: 18 }, (_, k) => ({
  left: `${(k * 61.8) % 100}%`,
  '--s': `${2 + ((k * 7) % 5)}px`,
  '--d': `${9 + ((k * 5) % 8)}s`,
  '--delay': `${-((k * 3.7) % 14).toFixed(1)}s`,
  '--o': `${0.5 + ((k * 13) % 40) / 100}`,
})) as CSSProperties[];

export function AdventCalendar() {
  const now = useNow(60_000);
  const today = aventDay(now);
  const avent = useGame((s) => s.avent);
  const openAvent = useGame((s) => s.openAvent);
  // le nichoir qui s'ouvre, puis le cadeau à l'écran
  const [opening, setOpening] = useState<number | null>(null);
  const [reveal, setReveal] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const ref = useRef<HTMLElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const section = ref.current;
    if (!section) return;
    const measure = () => setHeight(section.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    return () => observer.disconnect();
  }, [today]);
  if (!today) return null;

  const opened = aventOpened(avent, now);
  const doneToday = opened.includes(today);
  const entry = AVENT[today - 1];
  const stateOf = (day: number): BoxState => (opened.includes(day) ? 'open' : day === today ? 'today' : day < today ? 'missed' : 'later');
  const open = (day: number) => {
    if (opening || reveal) return;
    sfx.flip();
    setOpening(day);
    timer.current = window.setTimeout(() => setReveal(day), 900);
  };
  const claim = () => {
    if (!reveal) return;
    openAvent(reveal);
    setReveal(null);
    setOpening(null);
  };
  const date = `${today === 1 ? '1er' : today} décembre`;
  const style = {
    '--fall': `${height || 800}px`,
    '--ground': AVENT_GROUND,
    '--stars-a': AVENT_STARS_A,
    '--stars-b': AVENT_STARS_B,
  } as CSSProperties;

  return (
    <section ref={ref} className="panel avent" aria-labelledby="avent-title" style={style}>
      <div className="avent__sky" aria-hidden="true">
        <i className="avent__stars" />
        <i className="avent__stars avent__stars--b" />
        <i className="avent__moon" />
        <i className="avent__ground" />
        <span className="avent__snow">
          {FLAKES.map((flake, k) => (
            <i key={k} style={flake} />
          ))}
        </span>
      </div>
      <header className="avent__head">
        <p className="eyebrow">Calendrier de l’Avent</p>
        <h2 id="avent-title">{doneToday ? `${date} : ${entry.title.charAt(0).toLowerCase()}${entry.title.slice(1)} !` : `Ouvre le nichoir du ${date}`}</h2>
        <p className="avent__sub">
          {doneToday
            ? `${entry.note ? `${entry.note}. ` : ''}${today < AVENT_DAYS ? 'Un autre nichoir s’ouvrira demain.' : 'Joyeux Noël !'}`
            : today === AVENT_DAYS
              ? 'Le grand cadeau du réveillon t’attend dans l’étoile du sapin : touche-la !'
              : `${entry.note ? `${entry.note} ! ` : ''}Un nichoir par jour jusqu’au 24 décembre, chacun avec son cadeau ; l’étoile garde celui du réveillon. Le rouge-gorge t’attend sur celui du jour !`}
        </p>
        <p className="avent__progress">
          {opened.length} cadeau{opened.length > 1 ? 'x' : ''} ouvert{opened.length > 1 ? 's' : ''} sur {AVENT_DAYS}
          {today < AVENT_DAYS ? ` · encore ${AVENT_DAYS - today} jour${AVENT_DAYS - today > 1 ? 's' : ''} avant le réveillon` : ' · c’est le réveillon !'}
        </p>
        {!doneToday && (
          <button type="button" className="btn btn--primary avent__cta" disabled={!!opening || !!reveal} onClick={() => open(today)}>
            {today === AVENT_DAYS ? 'Ouvrir l’étoile' : 'Ouvrir le nichoir du jour'}
          </button>
        )}
      </header>
      <div className="avent__tree">
        <Tree />
        <Owl />
        <Etoile state={stateOf(AVENT_DAYS)} opening={opening === AVENT_DAYS} onOpen={() => open(AVENT_DAYS)} />
        {SPOTS.map((at, k) => (
          <Nichoir key={DAYS[k]} day={DAYS[k]} index={k} state={stateOf(DAYS[k])} opening={opening === DAYS[k]} at={at} onOpen={() => open(DAYS[k])} />
        ))}
      </div>
      {reveal && <Reveal day={reveal} onClaim={claim} />}
    </section>
  );
}
