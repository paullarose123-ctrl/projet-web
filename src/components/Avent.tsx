import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useGame } from '../store/game';
import { useNow } from '../hooks/useNow';
import { AVENT, AVENT_DAYS, AVENT_LAYOUT, aventDay, aventOpened, type AventDay } from '../engine/avent';
import { AVENT_AURORA, AVENT_BACK, AVENT_FRONT, AVENT_GROUND, AVENT_STARS_A, AVENT_STARS_B } from '../art/avent';
import { BallIcon } from './Balles';
import { MiniPack } from './MiniPack';
import { PackArt } from './PackArt';
import { sfx } from '../audio/sfx';

// Calendrier de l'Avent, sur l'accueil du 1er au 24 décembre (voir engine/avent.ts), peint comme les boosters : une
// nuit polaire où l'aurore ondule, les étoiles scintillent et la neige tombe sur les sapins. 24 cartes de l'Hiver,
// face cachée et numérotées dans le désordre, pendent à des ficelles par des pinces à linge et se balancent. La carte
// du jour brille ; on la touche, elle bondit, se retourne dans un éclat de givre et donne son cadeau (un pack s'ouvre
// aussitôt). Les cartes ouvertes montrent leur cadeau, encadré à sa couleur comme une rareté ; les cartes oubliées
// restent face cachée, prises dans le givre. Un rouge-gorge s'est posé au bout de la première ficelle.

type CardState = 'open' | 'today' | 'missed' | 'later';

/** Le cadeau en quelques mots, sur le bandeau d'une carte ouverte. */
function shortTitle(entry: AventDay): string {
  if (entry.short) return entry.short;
  const reward = entry.reward;
  if (reward.kind === 'credits') return `${reward.amount.toLocaleString('fr-FR')} crédits`;
  if (reward.kind === 'boosters') return `${reward.count} boosters`;
  if (reward.kind === 'energie') return 'Énergie miracle';
  if (reward.pack.id.startsWith('avent-')) return entry.title.replace(/^Une /, '');
  return reward.pack.name;
}

/** Couleur du cadre d'une carte ouverte : celle du cadeau, comme la rareté sur les cartes du jeu. */
function frameOf(entry: AventDay): string {
  const reward = entry.reward;
  if (reward.kind === 'credits') return '#e0b04a';
  if (reward.kind === 'boosters') return '#7fcdb8';
  if (reward.kind === 'energie') return '#f2c94c';
  const pack = reward.pack;
  if (pack.guaranteed?.prime || pack.id === 'prime') return '#f2a7c8';
  if (pack.id === 'icones') return '#f3dc9a';
  if (pack.id.startsWith('avent-')) return pack.guaranteed?.min === 'legendaire' ? 'var(--r-legendaire)' : 'var(--r-epique)';
  if (pack.tone === 'hiver') return '#bfe3f7';
  if (pack.tone === 'sport') return '#8cc3f0';
  return '#b98bff';
}

/** L'image du cadeau sur une carte ouverte : une pièce, des boosters, un éclair, le sachet du pack ou une carte. */
function GiftArt({ entry }: { entry: AventDay }) {
  const reward = entry.reward;
  if (reward.kind === 'credits') return <BallIcon className="avent-gift__coin" />;
  if (reward.kind === 'boosters') {
    return (
      <span className="avent-gift__boosters">
        <MiniPack />
        <b>×{reward.count}</b>
      </span>
    );
  }
  if (reward.kind === 'energie') {
    return (
      <svg className="avent-gift__svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.5 2L5 13.5H11L9.5 22L19 9.5H12.8Z" fill="#ffd166" stroke="#a8740f" strokeWidth={1} strokeLinejoin="round" />
      </svg>
    );
  }
  const pack = reward.pack;
  if (pack.id.startsWith('avent-')) {
    // une carte de l'Hiver : un petit dos de carte, cadré à la couleur promise
    return <span className="avent-gift__card" style={{ backgroundImage: AVENT_BACK }} />;
  }
  return (
    <span className="avent-gift__pack">
      <PackArt tone={pack.tone} name={pack.name} sport={pack.sport} size={pack.size} />
    </span>
  );
}

/** Éclats de givre et d'étoiles quand une carte se retourne. */
function Burst() {
  return (
    <span className="avent-burst" aria-hidden="true">
      <i className="avent-burst__rays" />
      {Array.from({ length: 14 }, (_, k) => (
        <i key={k} className={`avent-burst__bit${k % 3 === 0 ? ' is-flake' : ''}`} style={{ '--a': `${(k * 360) / 14 + (k % 2) * 9}deg`, '--d': `${70 + (k % 4) * 18}%` } as CSSProperties} />
      ))}
    </span>
  );
}

function HangingCard({ day, index, state, flipping, drop, onOpen }: { day: number; index: number; state: CardState; flipping: boolean; drop: number; onOpen: () => void }) {
  const entry = AVENT[day - 1];
  const date = `${day === 1 ? '1er' : day} décembre`;
  const label =
    state === 'open'
      ? `${date} : ${entry.title}`
      : state === 'today'
        ? `Retourner la carte du ${date}`
        : state === 'missed'
          ? `Carte du ${date}, passée`
          : `Carte du ${date}, à retourner ce jour-là`;
  return (
    <div className={`avent-hang${flipping ? ' is-up' : ''}`} style={{ '--drop': `${drop.toFixed(1)}px`, '--i': index } as CSSProperties}>
      <i className="avent-pin" aria-hidden="true" />
      <button
        type="button"
        className={`avent-card avent-card--${state}${flipping ? ' is-flipping' : ''}${day === AVENT_DAYS ? ' avent-card--grand' : ''}`}
        disabled={state !== 'today' || flipping}
        onClick={onOpen}
        aria-label={label}
        title={label}
      >
        <span className="avent-card__inner">
          <span className="avent-card__face avent-card__back" style={{ backgroundImage: AVENT_BACK }}>
            <b className="avent-card__num">{day}</b>
            {state === 'missed' && <i className="avent-card__frost" />}
          </span>
          <span className="avent-card__face avent-card__front" style={{ backgroundImage: AVENT_FRONT, '--frame': frameOf(entry) } as CSSProperties}>
            {(state === 'open' || flipping) && (
              <>
                <span className="avent-card__badge">
                  <small>déc.</small>
                  {day}
                </span>
                <span className="avent-gift">
                  <GiftArt entry={entry} />
                </span>
                <span className="avent-card__name">{shortTitle(entry)}</span>
              </>
            )}
          </span>
        </span>
        {flipping && <Burst />}
      </button>
    </div>
  );
}

/** Rouge-gorge perché au bout de la première ficelle, qui sautille de temps en temps. */
function Robin() {
  return (
    <svg className="avent-robin" viewBox="-12 -16 24 18" aria-hidden="true">
      <path d="M-9 -6L-12.5 -9L-11.5 -4.5Z" fill="#6b4a33" />
      <ellipse cx={-1} cy={-6} rx={8} ry={6} fill="#8a6345" />
      <path d="M-1.5 -10.5C3 -11 6.6 -8 6 -3.8C5.4 -1 2 0 -0.6 -0.6C1.6 -3 1.6 -7.4 -1.5 -10.5Z" fill="#e2603a" />
      <circle cx={4.4} cy={-11} r={4.2} fill="#8a6345" />
      <path d="M2.4 -12.6C5 -14.4 8.4 -12.4 8 -9.6C6.6 -8.6 4.4 -8.8 3 -10Z" fill="#e2603a" />
      <circle cx={5.4} cy={-12} r={0.75} fill="#1b1410" />
      <path d="M8.2 -11.2L11 -10.4L8.2 -9.6Z" fill="#3a2a1d" />
      <path d="M-5 -3.6Q-2 -1.6 1 -3.4" fill="none" stroke="#6b4a33" strokeWidth={0.8} opacity={0.6} />
      <path d="M-2 -0.4V2M1 -0.6V2" stroke="#4a3526" strokeWidth={0.7} strokeLinecap="round" />
    </svg>
  );
}

/** Neige qui tombe dans le ciel du calendrier. */
const FLAKES = Array.from({ length: 16 }, (_, k) => ({
  left: `${(k * 61.8) % 100}%`,
  '--s': `${2 + ((k * 7) % 5)}px`,
  '--d': `${9 + ((k * 5) % 8)}s`,
  '--delay': `${-((k * 3.7) % 14).toFixed(1)}s`,
  '--o': `${0.45 + ((k * 13) % 40) / 100}`,
})) as CSSProperties[];

/** Nombre de cartes par ficelle selon la largeur du calendrier. */
function columnsFor(width: number): number {
  if (width < 440) return 4;
  if (width < 640) return 6;
  if (width < 900) return 8;
  return 12;
}

export function AdventCalendar() {
  const now = useNow(60_000);
  const today = aventDay(now);
  const avent = useGame((s) => s.avent);
  const openAvent = useGame((s) => s.openAvent);
  // la carte qui se retourne : le cadeau arrive quand elle a fini
  const [flipping, setFlipping] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // largeur des ficelles (pour le nombre de cartes par ficelle) et hauteur du ciel (pour la chute de la neige)
  const ref = useRef<HTMLElement>(null);
  const lines = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const section = ref.current;
    const inner = lines.current;
    if (!section || !inner) return;
    const measure = () => setBox({ w: inner.clientWidth, h: section.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    return () => observer.disconnect();
  }, [today]);
  if (!today) return null;

  const opened = aventOpened(avent, now);
  const doneToday = opened.includes(today);
  const entry = AVENT[today - 1];
  const stateOf = (day: number): CardState => (opened.includes(day) ? 'open' : day === today ? 'today' : day < today ? 'missed' : 'later');
  const open = (day: number) => {
    if (flipping) return;
    sfx.flip();
    setFlipping(day);
    timer.current = window.setTimeout(() => {
      const gift = openAvent(day);
      if (gift && gift.reward.kind !== 'pack') sfx.fanfare();
      setFlipping(null);
    }, 1100);
  };

  const cols = columnsFor(box.w);
  const gap = cols > 4 ? 12 : 9;
  const cardW = box.w ? (box.w - gap * (cols - 1)) / cols : 70;
  const rows: number[][] = [];
  for (let k = 0; k < AVENT_LAYOUT.length; k += cols) rows.push(AVENT_LAYOUT.slice(k, k + cols));
  const date = `${today === 1 ? '1er' : today} décembre`;
  const style = {
    '--cols': cols,
    '--gap': `${gap}px`,
    '--cw': `${cardW.toFixed(1)}px`,
    '--fall': `${box.h || 800}px`,
    '--ground': AVENT_GROUND,
    '--aurora': AVENT_AURORA,
    '--stars-a': AVENT_STARS_A,
    '--stars-b': AVENT_STARS_B,
  } as CSSProperties;
  // la ficelle déborde de 14 px de chaque côté de la rangée : la carte pend là où la ficelle passe au-dessus d'elle
  const lineW = box.w || 300;
  const dropAt = (t: number) => {
    const u = (t * lineW + 14) / (lineW + 28);
    return 2 + 40 * u * (1 - u);
  };

  return (
    <section ref={ref} className="panel avent" aria-labelledby="avent-title" style={style}>
      <div className="avent__sky" aria-hidden="true">
        <i className="avent__stars" />
        <i className="avent__stars avent__stars--b" />
        <i className="avent__aurora" />
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
        <h2 id="avent-title">{doneToday ? `${date} : ${entry.title.charAt(0).toLowerCase()}${entry.title.slice(1)} !` : `Retourne la carte du ${date}`}</h2>
        <p className="avent__sub">
          {doneToday
            ? `${entry.note ? `${entry.note}. ` : ''}${today < AVENT_DAYS ? 'Reviens demain pour la carte suivante.' : 'Joyeux Noël !'}`
            : `${entry.note ? `${entry.note} ! ` : ''}Une carte par jour jusqu’au 24 décembre, chacune avec son cadeau. Une carte oubliée reste gelée : reviens chaque jour !`}
        </p>
      </header>
      <div className="avent__lines" ref={lines}>
        {rows.map((row, r) => (
          <div key={r} className="avent__line">
            <svg className="avent__string" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 2Q50 22 100 2" />
            </svg>
            {r === 0 && <Robin />}
            {row.map((day, i) => {
              const t = (i + 0.5) / row.length;
              return (
                <HangingCard
                  key={day}
                  day={day}
                  index={r * cols + i}
                  state={stateOf(day)}
                  flipping={flipping === day}
                  drop={dropAt(t)}
                  onOpen={() => open(day)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

