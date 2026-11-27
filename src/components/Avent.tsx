import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useGame } from '../store/game';
import { useNow } from '../hooks/useNow';
import { AVENT, AVENT_DAYS, AVENT_LAYOUT, aventDay, aventOpened, type AventDay } from '../engine/avent';
import { BallIcon } from './Balles';
import { MiniPack } from './MiniPack';
import { SportIcon } from './SportIcon';
import { XMAS, bauble, flakePath, holly, star } from './Noel';
import { sfx } from '../audio/sfx';

// Calendrier de l'Avent, sur l'accueil du 1er au 24 décembre (voir engine/avent.ts) : 24 petites portes aux papiers
// de Noël, numérotées dans le désordre. La porte du jour brille ; on l'ouvre, elle pivote sur ses gonds et donne son
// cadeau (un pack s'ouvre aussitôt). Les portes ouvertes montrent leur cadeau, les portes oubliées restent fermées.

/** Le cadeau en quelques mots, pour l'intérieur d'une petite porte. */
function shortTitle(entry: AventDay): string {
  if (entry.short) return entry.short;
  const reward = entry.reward;
  if (reward.kind === 'credits') return reward.amount.toLocaleString('fr-FR');
  if (reward.kind === 'boosters') return `${reward.count} boosters`;
  if (reward.kind === 'energie') return 'Énergie miracle';
  if (reward.pack.id.startsWith('avent-')) return entry.title.replace(/^Une /, '');
  return reward.pack.name;
}

/** L'image du cadeau : une pièce, des boosters, un éclair, l'emblème d'une famille, un sachet ou une carte. */
function RewardIcon({ entry }: { entry: AventDay }) {
  const reward = entry.reward;
  if (reward.kind === 'credits') return <BallIcon className="avent-gift__icon" />;
  if (reward.kind === 'boosters') return <MiniPack className="avent-gift__icon" />;
  if (reward.kind === 'energie') {
    return (
      <svg className="avent-gift__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.5 2L5 13.5H11L9.5 22L19 9.5H12.8Z" fill="#ffd166" stroke="#b9831c" strokeWidth={1} strokeLinejoin="round" />
      </svg>
    );
  }
  if (reward.pack.sport) return <SportIcon sport={reward.pack.sport} className="avent-gift__icon" />;
  if (reward.pack.id.startsWith('avent-')) {
    // une carte : son cadre de la couleur promise
    const color = reward.pack.guaranteed?.prime ? '#ff6fbf' : reward.pack.guaranteed?.min === 'legendaire' ? '#f2c14e' : '#b48cff';
    return (
      <svg className="avent-gift__icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x={6} y={3} width={12} height={18} rx={2} fill="#0d2a4a" stroke={color} strokeWidth={2} />
        <path d={flakePath(12, 11, 3.6)} stroke="#e8f4ff" strokeWidth={1} strokeLinecap="round" />
      </svg>
    );
  }
  return <MiniPack className="avent-gift__icon" />;
}

/** Petit motif de Noël au coin d'une porte fermée (un par porte, en boucle). */
function Motif({ index }: { index: number }) {
  const kind = index % 6;
  let art: ReactNode;
  if (kind === 0) art = <path d={flakePath(10, 10, 7)} stroke="#fff" strokeWidth={1.3} strokeLinecap="round" fill="none" />;
  else if (kind === 1) art = <path d={star(10, 10.6, 8)} fill={XMAS.gold} />;
  else if (kind === 2) art = <g transform="translate(0 -1)">{holly(1, 10, 11, 3, 0)}</g>;
  else if (kind === 3) art = bauble(1, 10, 1, 6, XMAS.red);
  else if (kind === 4) {
    art = (
      <>
        <path d="M10 2L17 15H3Z" fill={XMAS.green} />
        <path d="M10 2L12.4 6.6H7.6Z" fill="#fff" />
        <rect x={8.8} y={15} width={2.4} height={3} fill={XMAS.trunk} />
      </>
    );
  } else {
    art = (
      <>
        <rect x={3} y={7} width={14} height={11} fill={XMAS.red} />
        <rect x={2} y={4.6} width={16} height={3.6} fill={XMAS.redDark} />
        <rect x={9} y={4.6} width={2} height={13.4} fill={XMAS.gold} />
        <path d="M10 4.6C7 0.6 4.4 3.4 10 4.6C15.6 3.4 13 0.6 10 4.6Z" fill={XMAS.gold} />
      </>
    );
  }
  return (
    <svg className="avent-door__motif" viewBox="0 0 20 20" aria-hidden="true">
      {art}
    </svg>
  );
}

type DoorState = 'open' | 'today' | 'missed' | 'later';

/** Papier de chaque porte (rouge, vert, bleu glacier, or), sans deux voisines pareilles sur 4, 6, 8 ou 12 colonnes. */
const WRAPS = [2, 0, 2, 0, 3, 1, 3, 1, 0, 2, 0, 2, 1, 3, 1, 3, 2, 0, 2, 0, 3, 1, 3, 1];

function Door({ day, index, state, onOpen }: { day: number; index: number; state: DoorState; onOpen: () => void }) {
  const entry = AVENT[day - 1];
  const label =
    state === 'open'
      ? `${day} décembre : ${entry.title}`
      : state === 'today'
        ? `Ouvrir la case du ${day === 1 ? '1er' : day} décembre`
        : state === 'missed'
          ? `Case du ${day === 1 ? '1er' : day} décembre, passée`
          : `Case du ${day} décembre, à ouvrir ce jour-là`;
  return (
    <button
      type="button"
      className={`avent-door avent-door--${state} avent-door--w${WRAPS[index]}${day === AVENT_DAYS ? ' avent-door--grand' : ''}`}
      disabled={state !== 'today'}
      onClick={onOpen}
      aria-label={label}
      title={label}
    >
      <span className="avent-door__inside">
        {state === 'open' && (
          <span className="avent-gift">
            <RewardIcon entry={entry} />
            <span className="avent-gift__text">{shortTitle(entry)}</span>
          </span>
        )}
      </span>
      <span className="avent-door__leaf">
        <Motif index={index} />
        <b className="avent-door__day">{day}</b>
      </span>
    </button>
  );
}

export function AdventCalendar() {
  const now = useNow(60_000);
  const today = aventDay(now);
  const avent = useGame((s) => s.avent);
  const openAvent = useGame((s) => s.openAvent);
  // la porte qui pivote : le cadeau arrive quand elle est ouverte
  const [swinging, setSwinging] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!today) return null;
  const opened = aventOpened(avent, now);
  const doneToday = opened.includes(today);
  const entry = AVENT[today - 1];
  const stateOf = (day: number): DoorState =>
    opened.includes(day) || swinging === day ? 'open' : day === today ? 'today' : day < today ? 'missed' : 'later';
  const open = (day: number) => {
    if (swinging) return;
    sfx.flip();
    setSwinging(day);
    timer.current = window.setTimeout(() => {
      const gift = openAvent(day);
      if (gift && gift.reward.kind !== 'pack') sfx.fanfare();
      setSwinging(null);
    }, 700);
  };
  const date = `${today === 1 ? '1er' : today} décembre`;
  return (
    <section className="panel avent" aria-labelledby="avent-title">
      <svg className="avent__garland" viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 2Q50 16 100 2T200 2" fill="none" stroke={XMAS.pineDark} strokeWidth={5} strokeLinecap="round" />
        <path d="M0 2Q50 16 100 2T200 2" fill="none" stroke={XMAS.green} strokeWidth={2.4} strokeDasharray="1.6 2.2" strokeLinecap="round" />
      </svg>
      {/* les boules accrochées à la guirlande (chacune sa petite image, pour rester rondes sur toute largeur) */}
      {(
        [
          [11, 5, XMAS.red, 5.4],
          [32, 7, XMAS.gold, 4.4],
          [68, 7, XMAS.blue, 4.4],
          [89, 5, XMAS.red, 5.4],
        ] as const
      ).map(([left, top, color, size], k) => (
        <svg key={k} className="avent__bauble" style={{ left: `${left}%`, top }} viewBox="-7 0 14 20" aria-hidden="true">
          {bauble(k, 0, 0, size, color)}
        </svg>
      ))}
      <header className="avent__head">
        <p className="eyebrow">Calendrier de l’Avent</p>
        <h2 id="avent-title">{doneToday ? `${date} : ${entry.title.charAt(0).toLowerCase()}${entry.title.slice(1)} !` : `Ouvre la case du ${date}`}</h2>
        <p className="muted small">
          {doneToday
            ? `${entry.note ? `${entry.note}. ` : ''}${today < AVENT_DAYS ? 'Reviens demain pour la case suivante.' : 'Joyeux Noël !'}`
            : entry.note
              ? `${entry.note} ! Une case par jour jusqu’au 24 décembre, chacune avec son cadeau.`
              : 'Une case par jour jusqu’au 24 décembre, chacune avec son cadeau. Une case oubliée reste fermée : reviens chaque jour !'}
        </p>
      </header>
      <div className="avent__grid">
        {AVENT_LAYOUT.map((day, index) => (
          <Door key={day} day={day} index={index} state={stateOf(day)} onOpen={() => open(day)} />
        ))}
      </div>
    </section>
  );
}
