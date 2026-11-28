import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../store/game';
import { useNow } from '../hooks/useNow';
import { AVENT, AVENT_DAYS, AVENT_LAYOUT, aventDay, aventOpened, type AventDay } from '../engine/avent';
import { AVENT_BACK, AVENT_GROUND, AVENT_STARS_A, AVENT_STARS_B } from '../art/avent';
import { f } from '../art/kit';
import { BallIcon } from './Balles';
import { MiniPack } from './MiniPack';
import { PackArt } from './PackArt';
import { SportIcon } from './SportIcon';
import { CardBackHiver } from './CardBackHiver';
import { sfx } from '../audio/sfx';

// Calendrier de l'Avent, sur l'accueil du 1er au 24 décembre (voir engine/avent.ts) : un village de Noël, la nuit,
// sous la neige. Six maisons de bois aux toits enneigés, leurs guirlandes qui clignotent au bord du toit, une
// couronne de houx sur le pignon, la fumée qui monte des cheminées ; le traîneau du Père Noël passe devant la lune.
// Les 24 cases sont les fenêtres des maisons, volets fermés, numérotées dans le désordre. Derrière la fenêtre du jour,
// la lumière filtre entre les volets ; on la touche, les volets s'ouvrent sur une lumière dorée, et un grand paquet
// cadeau arrive à l'écran, tremble, s'ouvre dans un éclat de lumière et montre le cadeau. Les fenêtres déjà ouvertes
// restent allumées, avec leur cadeau derrière la vitre ; les fenêtres oubliées restent closes, prises dans le givre.

type WindowState = 'open' | 'today' | 'missed' | 'later';

/** Le cadeau en quelques mots (dans l'étiquette d'une fenêtre ouverte). */
function shortTitle(entry: AventDay): string {
  if (entry.short) return entry.short;
  const reward = entry.reward;
  if (reward.kind === 'credits') return `${reward.amount.toLocaleString('fr-FR')} crédits`;
  if (reward.kind === 'boosters') return `${reward.count} boosters`;
  if (reward.kind === 'energie') return 'Énergie miracle';
  if (reward.pack.id.startsWith('avent-')) return entry.title.replace(/^Une /, '');
  return reward.pack.name;
}

/** Le cadeau en petit, derrière la vitre d'une fenêtre ouverte. */
function SmallGift({ entry }: { entry: AventDay }) {
  const reward = entry.reward;
  if (reward.kind === 'credits') return <BallIcon className="fenetre__gift" />;
  if (reward.kind === 'boosters') return <MiniPack className="fenetre__gift" />;
  if (reward.kind === 'energie') return <Bolt className="fenetre__gift" />;
  if (reward.pack.sport) return <SportIcon sport={reward.pack.sport} className="fenetre__gift fenetre__gift--sport" />;
  if (reward.pack.id.startsWith('avent-')) return <span className="fenetre__gift fenetre__gift--card" style={{ backgroundImage: AVENT_BACK }} />;
  return <MiniPack className="fenetre__gift" />;
}

function Bolt({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.5 2L5 13.5H11L9.5 22L19 9.5H12.8Z" fill="#ffd166" stroke="#a8740f" strokeWidth={1} strokeLinejoin="round" />
    </svg>
  );
}

// ───────────── les maisons ─────────────

/** Ampoules de la guirlande au bord du toit : [x, y] le long des deux pentes. */
const EAVE: [number, number][] = [];
for (let k = 0; k <= 12; k++) {
  const t = k / 12;
  EAVE.push(t <= 0.5 ? [2 + t * 2 * 48, 47 - t * 2 * 37] : [50 + (t - 0.5) * 2 * 48, 10 + (t - 0.5) * 2 * 37]);
}
const BULB_COLORS = ['#ffd166', '#ff6b6b', '#7ee8a6', '#fff1c1', '#7cc8ff'];

/** Le toit d'une maison : le pignon, la couronne de houx, les pentes enneigées, la cheminée et la guirlande. */
function Roof({ chimney }: { chimney: number }) {
  const id = `roof${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const bulbs = EAVE.map(([x, y], k) => ({ x, y: y + 2.4, color: BULB_COLORS[k % BULB_COLORS.length], group: k % 2 }));
  return (
    <svg className="maison__roof" viewBox="-6 -2 112 52" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#fff2c4" stopOpacity={0.95} />
          <stop offset="0.4" stopColor="#ffc861" stopOpacity={0.4} />
          <stop offset="1" stopColor="#ffc861" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* la cheminée, derrière le toit */}
      <rect className="maison__brick" x={chimney} y={8} width={11} height={26} />
      <rect className="maison__brick-top" x={chimney - 1.6} y={6} width={14.2} height={4} rx={0.8} />
      <ellipse cx={chimney + 5.5} cy={6} rx={8} ry={2.2} fill="#f4f9ff" />
      {/* le pignon et sa couronne */}
      <path className="maison__gable" d="M2 48L50 11L98 48Z" />
      <circle cx={50} cy={32} r={6} fill="none" stroke="#2f6b4a" strokeWidth={3.4} />
      <circle cx={50} cy={32} r={6} fill="none" stroke="#3f8a5f" strokeWidth={1.2} strokeDasharray="1.4 2.2" />
      <path d={`M${f(47.8)} 37.6L45.4 41.6L49 39.4ZM${f(52.2)} 37.6L54.6 41.6L51 39.4Z`} fill="#c0392b" />
      <circle cx={50} cy={38} r={1.4} fill="#c0392b" />
      {[[45.4, 28.6], [54.8, 29.4], [50, 26]].map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r={0.9} fill="#e74c3c" />
      ))}
      {/* les pentes du toit et la neige dessus */}
      <path className="maison__eave" d="M-4 49L50 6L104 49" />
      <path d="M-4.6 46.4L50 3.2L104.6 46.4" fill="none" stroke="#f4f9ff" strokeWidth={4.2} strokeLinejoin="round" strokeLinecap="round" />
      <path d="M8 38.2q1.6 2.8 3.2 0M20 28.6q1.4 3.4 2.8 0M36 16.2q1.2 2.6 2.4 0M62 16.2q1.2 2.6 2.4 0M78 28.6q1.4 3.4 2.8 0M90 38.2q1.6 2.8 3.2 0" fill="#f4f9ff" />
      {/* la guirlande : les ampoules, et leurs halos qui s'allument tour à tour */}
      {[0, 1].map((group) => (
        <g key={group} className={`maison__glow maison__glow--${group ? 'b' : 'a'}`}>
          {bulbs
            .filter((b) => b.group === group)
            .map((b, k) => (
              <circle key={k} cx={f(b.x)} cy={f(b.y)} r={4.4} fill={`url(#${id}-glow)`} />
            ))}
        </g>
      ))}
      {bulbs.map((b, k) => (
        <circle key={k} cx={f(b.x)} cy={f(b.y)} r={1.25} fill={b.color} />
      ))}
    </svg>
  );
}

function Fenetre({ day, state, opening, onOpen }: { day: number; state: WindowState; opening: boolean; onOpen: () => void }) {
  const entry = AVENT[day - 1];
  const date = `${day === 1 ? '1er' : day} décembre`;
  const label =
    state === 'open'
      ? `${date} : ${shortTitle(entry)}`
      : state === 'today'
        ? `Ouvrir la fenêtre du ${date}`
        : state === 'missed'
          ? `Fenêtre du ${date}, passée`
          : `Fenêtre du ${date}, à ouvrir ce jour-là`;
  const lit = state === 'open' || opening;
  return (
    <button
      type="button"
      className={`fenetre fenetre--${state}${opening ? ' is-opening' : ''}${lit ? ' is-lit' : ''}${day === AVENT_DAYS ? ' fenetre--grand' : ''}`}
      disabled={state !== 'today' || opening}
      onClick={onOpen}
      aria-label={label}
      title={label}
    >
      <span className="fenetre__frame">
        <span className="fenetre__inside">
          {lit && (
            <>
              <small className="fenetre__date">{day}</small>
              <SmallGift entry={entry} />
            </>
          )}
        </span>
        <span className="fenetre__volet fenetre__volet--g" />
        <span className="fenetre__volet fenetre__volet--d" />
        <b className="fenetre__num">{day}</b>
        {state === 'missed' && <i className="fenetre__givre" />}
      </span>
    </button>
  );
}

/** Fumée d'une cheminée (`chimney` : sa place sur le toit) : trois volutes qui montent tour à tour. */
function Smoke({ chimney }: { chimney: number }) {
  // le haut de la cheminée, en % de la largeur du toit (repère du toit : de -6 à 106)
  const left = ((chimney + 5.5 + 6) / 112) * 100;
  return (
    <span className="maison__smoke" style={{ left: `${left.toFixed(1)}%` }} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

const HOUSES = AVENT_LAYOUT.length / 4;
/** Cheminée de chaque maison (position sur le toit, en % du toit). */
const CHIMNEYS = [70, 18, 66, 22, 72, 20];

// ───────────── le traîneau ─────────────

/** Le traîneau du Père Noël et ses deux rennes, en silhouette dorée, avec sa traînée d'étincelles. */
function Sleigh() {
  const reindeer = (x: number, key: number) => (
    <g key={key} transform={`translate(${x} 0)`}>
      <ellipse cx={0} cy={-6} rx={5.2} ry={2.4} />
      <path d="M-3.6 -4.6L-5.6 -0.6M-2 -4.4L-0.6 -0.4M2.6 -4.4L5 -1.4M3.8 -4.6L2.4 -0.2" strokeWidth={1} strokeLinecap="round" fill="none" />
      <path d="M3.2 -7.6L5.6 -11.4L7.2 -10.6L5 -6.4Z" />
      <ellipse cx={7.4} cy={-10.8} rx={2} ry={1} transform="rotate(18 7.4 -10.8)" />
      <path d="M6.2 -11.6L5.2 -14.6M5.5 -13.4L4 -14M6.6 -11.8L7.6 -15M7.3 -13.8L8.8 -14.3" strokeWidth={0.6} strokeLinecap="round" fill="none" />
      <path d="M-5 -6.6L-6.6 -8" strokeWidth={0.8} strokeLinecap="round" fill="none" />
    </g>
  );
  return (
    <svg className="avent__sleigh" viewBox="-30 -18 110 22" aria-hidden="true">
      <g className="avent__sleigh-trail">
        {[[-26, -6, 0.9], [-21, -8.4, 0.6], [-16, -5, 1.1], [-11, -7.6, 0.7], [-6, -4.4, 0.8]].map(([x, y, r], k) => (
          <circle key={k} cx={x} cy={y} r={r} />
        ))}
      </g>
      <g className="avent__sleigh-body">
        <path d="M14 -6.4L46 -9.2M14 -6.4L64 -9.2" strokeWidth={0.4} fill="none" />
        {reindeer(46, 1)}
        {reindeer(64, 2)}
        <path d="M-2 0H17Q21 0 21 -3.4" strokeWidth={1} fill="none" strokeLinecap="round" />
        <path d="M0 -2L15 -2Q18.4 -2 18.4 -6L18.4 -8.4L14 -8.4L12.4 -5.2L3 -5.2Q-1 -5.2 0 -2Z" />
        <circle cx={8.6} cy={-11.6} r={1.7} />
        <path d="M5.4 -5.2Q5.4 -10 8.6 -10Q11.8 -10 11.8 -5.2Z" />
        <path d="M7 -12.8L8.6 -16.4L10.6 -12.6Z" />
        <path d="M11 -9.2L13.6 -10.6L14.4 -6.4L11.6 -6.2Z" />
      </g>
    </svg>
  );
}

// ───────────── la cérémonie du cadeau ─────────────

/** Le grand paquet cadeau : la boîte rouge, son ruban doré, et le couvercle (à part, il s'envole). */
function Present() {
  return (
    <svg className="avent-reveal__present" viewBox="0 0 120 110" aria-hidden="true">
      <g className="avent-reveal__box">
        <rect x={14} y={42} width={92} height={64} rx={4} fill="#c0392b" />
        <rect x={60} y={42} width={46} height={64} fill="#000" opacity={0.12} />
        <rect x={52} y={42} width={16} height={64} fill="#f2c14e" />
        <rect x={52} y={42} width={6} height={64} fill="#fff3c4" opacity={0.35} />
        <path d="M18 52L26 60M30 52L22 60M90 70L98 78M102 70L94 78M24 88L30 94M30 88L24 94" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.6} strokeLinecap="round" />
      </g>
      <g className="avent-reveal__lid">
        <rect x={8} y={28} width={104} height={18} rx={3} fill="#d84a3c" />
        <rect x={8} y={40} width={104} height={6} fill="#000" opacity={0.15} />
        <rect x={52} y={28} width={16} height={18} fill="#f2c14e" />
        <path d="M60 28C44 6 26 18 40 26C46 29 54 29 60 28Z" fill="#f2c14e" />
        <path d="M60 28C76 6 94 18 80 26C74 29 66 29 60 28Z" fill="#f2c14e" />
        <path d="M60 28C50 14 38 18 44 24Z M60 28C70 14 82 18 76 24Z" fill="#c58f1f" opacity={0.6} />
        <circle cx={60} cy={27} r={5} fill="#ffd166" />
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

/** Nombre de maisons par rangée selon la largeur du calendrier. */
function housesPerRow(width: number): number {
  if (width < 560) return 2;
  if (width < 900) return 3;
  return 6;
}

/** Neige qui tombe sur le village. */
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
  // la fenêtre qui s'ouvre, puis le paquet cadeau à l'écran
  const [opening, setOpening] = useState<number | null>(null);
  const [reveal, setReveal] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const ref = useRef<HTMLElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const section = ref.current;
    if (!section) return;
    const measure = () => setBox({ w: section.clientWidth, h: section.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    return () => observer.disconnect();
  }, [today]);
  if (!today) return null;

  const opened = aventOpened(avent, now);
  const doneToday = opened.includes(today);
  const entry = AVENT[today - 1];
  const stateOf = (day: number): WindowState => (opened.includes(day) ? 'open' : day === today ? 'today' : day < today ? 'missed' : 'later');
  const open = (day: number) => {
    if (opening || reveal) return;
    sfx.flip();
    setOpening(day);
    timer.current = window.setTimeout(() => setReveal(day), 750);
  };
  const claim = () => {
    if (!reveal) return;
    openAvent(reveal);
    setReveal(null);
    setOpening(null);
  };

  const perRow = housesPerRow(box.w);
  const houses: ReactNode[] = [];
  for (let h = 0; h < HOUSES; h++) {
    const days = AVENT_LAYOUT.slice(h * 4, h * 4 + 4);
    houses.push(
      <div key={h} className={`maison maison--${h}`}>
        <Smoke chimney={CHIMNEYS[h]} />
        <Roof chimney={CHIMNEYS[h]} />
        <div className="maison__wall">
          <div className="maison__windows">
            {days.map((day) => (
              <Fenetre key={day} day={day} state={stateOf(day)} opening={opening === day} onOpen={() => open(day)} />
            ))}
          </div>
        </div>
      </div>,
    );
  }
  const date = `${today === 1 ? '1er' : today} décembre`;
  const style = {
    '--houses': perRow,
    '--pw': `${box.w || 360}px`,
    '--fall': `${box.h || 800}px`,
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
        <Sleigh />
        <i className="avent__ground" />
        <span className="avent__snow">
          {FLAKES.map((flake, k) => (
            <i key={k} style={flake} />
          ))}
        </span>
      </div>
      <header className="avent__head">
        <p className="eyebrow">Calendrier de l’Avent</p>
        <h2 id="avent-title">{doneToday ? `${date} : ${entry.title.charAt(0).toLowerCase()}${entry.title.slice(1)} !` : `Ouvre la fenêtre du ${date}`}</h2>
        <p className="avent__sub">
          {doneToday
            ? `${entry.note ? `${entry.note}. ` : ''}${today < AVENT_DAYS ? 'Une autre fenêtre s’allumera demain.' : 'Joyeux Noël !'}`
            : `${entry.note ? `${entry.note} ! ` : ''}Une fenêtre par jour jusqu’au 24 décembre, chacune avec son cadeau. Celle du jour est éclairée : touche-la !`}
        </p>
      </header>
      <div className="avent__village">{houses}</div>
      {reveal && <Reveal day={reveal} onClaim={claim} />}
    </section>
  );
}
