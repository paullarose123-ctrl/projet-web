import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { CardFace } from '../engine/types';
import { ATHLETES_BY_ID } from '../data/athletes';
import { PIOCHE_MAX, bestCard, piocheOffers, type PiocheOffer } from '../engine/pioche';
import { serieDef } from '../engine/series';
import { hashString } from '../engine/random';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';
import { useAccount } from '../store/account';
import { accountsEnabled, recentPseudos } from '../account/supabase';
import { formatDuration, timeAgo, useNow } from '../hooks/useNow';
import { sfx } from '../audio/sfx';
import { Card, type CardSize } from './Card';
import { CardBack } from './CardBack';
import { CardBackMexique } from './CardBackMexique';
import { CardBackHiver } from './CardBackHiver';
import { Landscape } from './PackScene';
import { packScene } from './PackArt';
import { RevealFx } from './RevealFx';
import { Confetti, type ConfettiHandle } from './Confetti';
import { SHOWER, confettiColors, glowOf, isSpecial, themeOf, tierOf } from '../overlays/PackOpening';

// Pioche miracle, sur l'accueil : les boosters ouverts par d'autres collectionneurs (engine/pioche.ts). On choisit
// un booster et ses 5 cartes arrivent en volant ; elles se retournent en cascade, filent au centre, tourbillonnent,
// se coupent en deux paquets qui se mêlent, puis se redistribuent face cachée. On en touche une : elle s'avance,
// se charge de lumière et se retourne dans une gerbe d'étincelles ; les quatre autres se dévoilent ensuite.
// Les collectionneurs mêlent de vrais joueurs du site (pseudos récents) et des comptes inventés.

/** Boosters affichés sur l'accueil (les plus récents). */
const SHOWN = 8;

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ───────────── les collectionneurs : vrais joueurs et comptes inventés ─────────────

let realNames: Promise<string[]> | null = null;

/** Pseudos de vrais joueurs (une seule demande par visite ; aucun hors ligne ou sans comptes). */
function useRealNames(): string[] {
  const me = useAccount((s) => s.session?.pseudo ?? '');
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    if (!accountsEnabled()) return;
    realNames ??= recentPseudos().catch(() => []);
    let alive = true;
    void realNames.then((list) => alive && setNames(list));
    return () => {
      alive = false;
    };
  }, []);
  return useMemo(() => names.filter((name) => name.toLowerCase() !== me.toLowerCase()), [names, me]);
}

/** Le nom affiché pour un booster : un vrai joueur une fois sur deux (toujours le même pour ce booster), sinon le compte inventé. */
function nameOf(offer: PiocheOffer, names: string[]): string {
  if (!names.length || hashString(`${offer.id} vrai`) % 2) return offer.pseudo;
  return names[hashString(`${offer.id} nom`) % names.length];
}

// ───────────── petits éléments ─────────────

/** Un point d'énergie miracle : la petite feuille verte du logo (vide quand elle est dépensée). */
function Spark({ off = false, className = '' }: { off?: boolean; className?: string }) {
  return <i className={`pm-spark${off ? ' is-off' : ''} ${className}`} aria-hidden="true" />;
}

/** Coût d'une pioche : autant d'éclats que d'énergie, ou « Offerte ». */
function Cost({ offer }: { offer: PiocheOffer }) {
  if (offer.bonus) return <span className="pm-cost pm-cost--bonus">Offerte</span>;
  return (
    <span className="pm-cost" aria-label={`${offer.cost} énergie${offer.cost > 1 ? 's' : ''}`}>
      {Array.from({ length: offer.cost }, (_, i) => (
        <Spark key={i} />
      ))}
    </span>
  );
}

/** Le dos des cartes de la série du booster. */
function Back({ serie }: { serie: number }) {
  if (serie === 3) return <CardBackHiver />;
  if (serie === 2) return <CardBackMexique />;
  return <CardBack label="Série 1" />;
}

/** Jauge d'énergie : un éclat par point ; ceux que la pioche va coûter battent en attendant. */
function Gauge({ energy, reserved = 0 }: { energy: number; reserved?: number }) {
  return (
    <span className="pioche__sparks">
      {Array.from({ length: PIOCHE_MAX }, (_, i) => (
        <Spark key={i} off={i >= energy} className={i < energy && i >= energy - reserved ? 'is-reserved' : ''} />
      ))}
    </span>
  );
}

// ───────────── la rangée de l'accueil ─────────────

export function PiocheMiracle() {
  const now = useNow(1000);
  const pioche = useGame((s) => s.pioche);
  const minute = Math.floor(now / 60_000);
  // la liste ne change qu'une fois par minute (un nouveau booster arrive toutes les 30 minutes)
  const offers = useMemo(() => piocheOffers(minute * 60_000).slice(0, SHOWN), [minute]);
  const names = useRealNames();
  const [open, setOpen] = useState<PiocheOffer | null>(null);
  const energy = pioche?.energy ?? PIOCHE_MAX;
  const used = new Set(pioche?.used ?? []);

  return (
    <section className="panel pioche" aria-labelledby="pioche-title">
      <div className="pioche__head">
        <h2 id="pioche-title">Pioche miracle</h2>
        <span className="pioche__energy" aria-label={`Énergie miracle : ${energy} sur ${PIOCHE_MAX}`}>
          <span className="pioche__timer">{energy >= PIOCHE_MAX ? 'Énergie pleine' : `+1 dans ${formatDuration((pioche?.nextAt ?? now) - now)}`}</span>
          <Gauge energy={energy} />
        </span>
      </div>
      <div className="pioche__row">
        {offers.map((offer, n) => {
          const done = used.has(offer.id);
          const short = !done && energy < offer.cost;
          const fresh = now - offer.at < 10 * 60_000;
          return (
            <button
              key={offer.id}
              type="button"
              className={`pm-tile${done ? ' is-done' : ''}${short ? ' is-short' : ''}${offer.bonus ? ' is-bonus' : ''}`}
              style={{ '--n': n } as CSSProperties}
              disabled={done}
              aria-label={`Booster de ${nameOf(offer, names)}${done ? ', déjà pioché' : ''}`}
              onClick={() => {
                sfx.click();
                setOpen(offer);
              }}
            >
              {fresh && !done && <span className="pm-tile__new">Nouveau</span>}
              <span className="pm-tile__fan" aria-hidden="true">
                {offer.cards.map((card, i) => (
                  <span key={i} className="pm-tile__card" style={{ '--k': i - 2, '--lift': `${Math.abs(i - 2) * 4}px` } as CSSProperties}>
                    <Card card={card} size="xs" hideFacts />
                  </span>
                ))}
              </span>
              <span className="pm-tile__who">
                <b>{nameOf(offer, names)}</b>
                <small>
                  {serieDef(offer.serie).name} · {timeAgo(offer.at, now)}
                </small>
              </span>
              {done ? <span className="pm-tile__done">Déjà pioché</span> : <Cost offer={offer} />}
              <span className="pm-tile__shine" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {open && <PiocheOverlay offer={open} name={nameOf(open, names)} onClose={() => setOpen(null)} />}
    </section>
  );
}

// ───────────── l'écran de pioche ─────────────

type Phase = 'deal' | 'look' | 'hide' | 'gather' | 'shuffle' | 'spread' | 'choose' | 'charge' | 'reveal' | 'done';

interface Spot {
  x: number;
  y: number;
  r?: number;
  s?: number;
}

const tf = ({ x, y, r = 0, s = 1 }: Spot) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg) scale(${s})`;

interface Layout {
  size: CardSize;
  w: number;
  h: number;
  slots: Spot[];
  /** la carte choisie, en avant */
  front: Spot;
  /** les quatre autres, de part et d'autre (grand écran) ou en rangée dessous */
  aside: Spot[];
  /** rayon du tourbillon du mélange */
  orbit: number;
}

function layoutFor(width: number): Layout {
  if (width >= 760) {
    const large = width >= 1180;
    const w = large ? 196 : 140;
    const h = w * 1.4;
    const gap = large ? 22 : 16;
    const big = 1.28;
    const small = 0.78;
    const half = (w * big) / 2;
    const ow = w * small;
    const near = half + gap + ow / 2;
    const far = near + ow + gap;
    return {
      size: large ? 'md' : 'sm',
      w,
      h,
      slots: [0, 1, 2, 3, 4].map((i) => ({ x: (i - 2) * (w + gap), y: 0 })),
      front: { x: 0, y: -8, s: big },
      aside: [-far, -near, near, far].map((x) => ({ x, y: 14, s: small })),
      orbit: w * 1.25,
    };
  }
  const w = Math.min(104, Math.floor((width - 56) / 3));
  const h = w * 1.4;
  const gap = 12;
  const big = 1.25;
  const small = 0.6;
  const ow = w * small;
  const frontY = -h * 0.5;
  const rowY = frontY + (h * big) / 2 + gap + (h * small) / 2;
  return {
    size: 'xs',
    w,
    h,
    slots: [0, 1, 2, 3, 4].map((i) => (i < 3 ? { x: (i - 1) * (w + gap), y: -(h + gap) / 2 } : { x: (i - 3.5) * (w + gap), y: (h + gap) / 2 })),
    front: { x: 0, y: frontY, s: big },
    aside: [0, 1, 2, 3].map((k) => ({ x: (k - 1.5) * (ow + 8), y: rowY, s: small })),
    orbit: w * 0.95,
  };
}

function useLayout(): Layout {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1024 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return useMemo(() => layoutFor(width), [width]);
}

const TILTS = [-7, 4, -2, 6, -4];
const ALL = [0, 1, 2, 3, 4];

function PiocheOverlay({ offer, name, onClose }: { offer: PiocheOffer; name: string; onClose: () => void }) {
  const piocher = useGame((s) => s.piocher);
  const energy = useGame((s) => s.pioche?.energy ?? PIOCHE_MAX);
  const openDetail = useUi((s) => s.openDetail);
  const layout = useLayout();
  const { size, w, h } = layout;
  const [phase, setPhase] = useState<Phase>('deal');
  // la carte de chaque place : d'abord le booster tel qu'il a été ouvert, puis la répartition après le mélange
  const [faces, setFaces] = useState<CardFace[]>(offer.cards);
  const [down, setDown] = useState<boolean[]>([false, false, false, false, false]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<(CardFace & { uid: string; isNew: boolean }) | null>(null);
  const [burst, setBurst] = useState(0);
  const cards = useRef<Array<HTMLDivElement | null>>([]);
  const spots = useRef<Spot[]>([]);
  const alive = useRef(true);
  const confetti = useRef<ConfettiHandle>(null);
  const still = reducedMotion();

  /** Déplace une carte de là où elle est vers `to`, en passant par `via` (positions intermédiaires). */
  const move = useCallback(
    async (i: number, to: Spot, duration: number, { via = [], delay = 0, easing = 'cubic-bezier(0.3, 0.8, 0.3, 1)' }: { via?: Spot[]; delay?: number; easing?: string } = {}) => {
      const el = cards.current[i];
      const from = spots.current[i] ?? to;
      spots.current[i] = to;
      if (!el) return;
      if (still || !el.animate) {
        el.style.transform = tf(to);
        return;
      }
      const animation = el.animate([from, ...via, to].map((spot) => ({ transform: tf(spot) })), { duration, delay, easing, fill: 'forwards' });
      try {
        await animation.finished;
      } catch {
        return;
      }
      el.style.transform = tf(to);
      animation.cancel();
    },
    [still],
  );

  const flip = (i: number, value: boolean) => setDown((list) => list.map((d, k) => (k === i ? value : d)));

  // arrivée : les cartes montent du bas de l'écran et se posent à leur place, une par une
  useLayoutEffect(() => {
    alive.current = true;
    const vh = window.innerHeight;
    spots.current = ALL.map((i) => ({ x: (i - 2) * 40, y: vh * 0.75, r: -24 + i * 12, s: 0.5 }));
    cards.current.forEach((el, i) => el && (el.style.transform = tf(spots.current[i])));
    void (async () => {
      await Promise.all(
        layout.slots.map((slot, i) => {
          window.setTimeout(() => alive.current && sfx.deal(), i * 90);
          return move(i, slot, 650, { delay: i * 90, via: [{ x: slot.x * 0.6, y: slot.y - 40, r: TILTS[i] * 2, s: 0.95 }], easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.15)' });
        }),
      );
      if (alive.current) setPhase('look');
    })();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      alive.current = false;
      document.body.style.overflow = previous;
    };
    // l'arrivée ne se joue qu'une fois
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // la fenêtre change de taille : chaque carte retrouve la place qui correspond à l'étape
  useEffect(() => {
    if (phase === 'look' || phase === 'choose') layout.slots.forEach((slot, i) => void move(i, slot, 300));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (phase === 'look' || phase === 'done')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onClose]);

  const best = bestCard(offer.cards);
  const enough = energy >= offer.cost;

  const start = async () => {
    if (!enough || phase !== 'look') return;
    const { slots } = layout;
    // 1. les cartes se retournent en cascade, en se soulevant un peu
    setPhase('hide');
    for (const i of ALL) {
      window.setTimeout(() => {
        if (!alive.current) return;
        sfx.flip();
        flip(i, true);
        void move(i, { ...slots[i], y: slots[i].y - 14, s: 1.04 }, 260, { easing: 'ease-out' }).then(() => move(i, slots[i], 240));
      }, i * 110);
    }
    await sleep(110 * 5 + 520);
    if (!alive.current) return;
    // 2. elles filent au centre et s'empilent
    setPhase('gather');
    sfx.whoosh();
    await Promise.all(ALL.map((i) => move(i, { x: 0, y: -i * 2, r: TILTS[i] }, 520, { delay: i * 60, via: [{ x: slots[i].x * 0.5, y: slots[i].y * 0.5 - 50, r: TILTS[i] * 3, s: 1.06 }], easing: 'cubic-bezier(0.5, 0, 0.3, 1)' })));
    if (!alive.current) return;
    // 3. le mélange : un tourbillon autour du centre, puis deux paquets qui se mêlent, deux fois
    setPhase('shuffle');
    sfx.rustle();
    const R = layout.orbit;
    await Promise.all(
      ALL.map((i) => {
        const via: Spot[] = [];
        const steps = 14;
        for (let k = 1; k <= steps; k++) {
          const t = k / steps;
          const a = (i / 5) * Math.PI * 2 + t * 1.5 * Math.PI * 2;
          // le rayon grandit puis se resserre
          const rad = R * Math.sin(Math.PI * t);
          via.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad * 0.32 - 10, r: Math.cos(a) * 18, s: 1 + Math.sin(a) * 0.08 });
        }
        return move(i, { x: 0, y: -i * 2, r: TILTS[i] * 0.5 }, 1250, { via, easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)' });
      }),
    );
    for (let round = 0; round < 2 && alive.current; round++) {
      sfx.rustle();
      const side = w * 0.62 * (round ? -1 : 1);
      await Promise.all(ALL.map((i) => move(i, { x: i % 2 ? side : -side, y: -8 - (i >> 1) * 3, r: (i % 2 ? 8 : -8) * (round ? -1 : 1) }, 230, { easing: 'ease-out' })));
      await Promise.all(ALL.map((i) => move(i, { x: 0, y: -i * 2, r: TILTS[(i + round + 1) % 5] * 0.4 }, 260, { delay: i * 45, easing: 'cubic-bezier(0.6, 0, 0.4, 1)' })));
    }
    if (!alive.current) return;
    await Promise.all(ALL.map((i) => move(i, { x: 0, y: -i * 2, s: 1.08 }, 140, { easing: 'ease-out' }).then(() => move(i, { x: 0, y: -i * 2 }, 160))));
    // 4. la donne : les cartes partent l'une après l'autre vers leur place, en arc
    setPhase('spread');
    await Promise.all(
      slots.map((slot, i) => {
        window.setTimeout(() => alive.current && sfx.deal(), i * 130);
        return move(i, slot, 560, { delay: i * 130, via: [{ x: slot.x * 0.5, y: Math.min(slot.y, 0) * 0.5 - 70, r: (slot.x >= 0 ? 1 : -1) * 22, s: 1.05 }], easing: 'cubic-bezier(0.25, 0.9, 0.3, 1.12)' });
      }),
    );
    if (alive.current) setPhase('choose');
  };

  const choose = async (slot: number) => {
    if (phase !== 'choose') return;
    const got = piocher(offer.id);
    if (!got) {
      onClose();
      return;
    }
    // la carte touchée est celle tirée ; les quatre autres prennent les autres places, au hasard
    const rest = offer.cards.filter((_, i) => i !== got.index).sort(() => Math.random() - 0.5);
    setFaces(ALL.map((i) => (i === slot ? got.card : rest.shift()!)));
    setChosen(slot);
    setResult(got.card);
    const special = isSpecial(got.card);
    const { front, aside } = layout;
    const big = front.s ?? 1;
    // 1. la carte choisie s'avance au centre ; les autres s'écartent
    setPhase('charge');
    sfx.whoosh();
    let k = 0;
    await Promise.all(
      ALL.map((i) =>
        i === slot
          ? move(i, front, 620, { via: [{ ...front, y: front.y - 40, s: big * 1.08, r: 6 }], easing: 'cubic-bezier(0.3, 0.9, 0.3, 1.1)' })
          : move(i, aside[k++], 520, { delay: 80, easing: 'cubic-bezier(0.3, 0.8, 0.3, 1)' }),
      ),
    );
    if (!alive.current) return;
    // 2. elle se charge : elle tremble, de plus en plus fort (plus longtemps pour une carte rare)
    if (special) sfx.drumroll(1);
    const shakes = special ? 9 : 5;
    const via: Spot[] = Array.from({ length: shakes }, (_, n) => ({ ...front, x: front.x + (n % 2 ? 1 : -1) * (1 + n * 0.6), r: (n % 2 ? 1 : -1) * (0.6 + n * 0.35), s: big * (1 + n * 0.006) }));
    await move(slot, { ...front, s: big * 1.05 }, special ? 1000 : 520, { via, easing: 'linear' });
    if (!alive.current) return;
    // 3. elle se retourne dans une gerbe de lumière
    setPhase('reveal');
    sfx.flip();
    flip(slot, false);
    void move(slot, front, 420, { easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)' });
    await sleep(200);
    if (!alive.current) return;
    setBurst((b) => b + 1);
    sfx.reveal(got.card.variant === 'prime' ? 4 : Math.min(4, tierOf(got.card)));
    if (special) confetti.current?.burst(confettiColors(got.card), tierOf(got.card) >= 4 || got.card.variant === 'prime' ? 70 : 44, SHOWER[themeOf(got.card)]);
    await sleep(special ? 1500 : 1000);
    // 4. les quatre autres se dévoilent, l'une après l'autre
    for (const i of ALL) {
      if (i === slot) continue;
      if (!alive.current) return;
      sfx.flip();
      flip(i, false);
      await sleep(170);
    }
    if (alive.current) setPhase('done');
  };

  const resultAthlete = result ? ATHLETES_BY_ID[result.athleteId] : null;
  const special = result ? isSpecial(result) : false;
  const glow = result ? glowOf(result) : '#ffd66b';
  const lit = phase === 'charge' || phase === 'reveal' || phase === 'done';
  // pendant le mélange, les éclats que la pioche va coûter battent dans la jauge
  const reserved = chosen === null && phase !== 'deal' && phase !== 'look' ? offer.cost : 0;
  const mixing = phase === 'hide' || phase === 'gather' || phase === 'shuffle' || phase === 'spread';

  return createPortal(
    <div
      className={`pm-overlay pm-overlay--${phase}${lit ? ' is-lit' : ''}${special ? ' is-special' : ''}`}
      style={{ '--pm-w': `${w}px`, '--pm-h': `${h}px`, '--glow': glow } as CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label={`Pioche miracle : booster de ${name}`}
    >
      <div className="pm-overlay__backdrop" aria-hidden="true">
        <Landscape className="pm-overlay__scene" scene={packScene(offer.serie === 3 ? 'hiver' : offer.serie === 2 ? 'mexique' : 'violet')} seed={`pioche ${offer.id}`} />
        <span className="pm-overlay__motes" />
      </div>
      <div className="pm-overlay__top">
        <h2 key={lit ? 'result' : phase === 'choose' ? 'choose' : mixing ? 'mix' : 'look'}>
          {(phase === 'deal' || phase === 'look') && <>Le booster de {name}</>}
          {mixing && <>Les cartes se mélangent…</>}
          {phase === 'choose' && <>Choisis une carte !</>}
          {phase === 'charge' && <>Et c’est…</>}
          {(phase === 'reveal' || phase === 'done') && resultAthlete && <>{resultAthlete.last} !</>}
        </h2>
        {phase === 'done' && result && (
          <span className={`pm-overlay__tag tag ${result.isNew ? 'tag--new' : 'tag--dupe'}`}>{result.isNew ? 'Nouveau' : 'Doublon'}</span>
        )}
        <p className="muted small">
          {(phase === 'deal' || phase === 'look') && `${serieDef(offer.serie).name} · ouvert ${timeAgo(offer.at, Date.now())} · meilleure carte : ${ATHLETES_BY_ID[best.athleteId].last}`}
          {phase === 'choose' && 'Touche la carte que tu veux garder : l’une des cinq, au hasard.'}
          {phase === 'done' && 'Voici ce que cachaient les autres cartes.'}
        </p>
        <span className="pm-overlay__energy" aria-label={`Énergie miracle : ${energy} sur ${PIOCHE_MAX}`}>
          <Gauge energy={energy} reserved={reserved} />
        </span>
      </div>
      <div className="pm-stage">
        <span className="pm-stage__rays" aria-hidden="true" />
        {burst > 0 && <span key={burst} className="pm-stage__burst" aria-hidden="true" />}
        {special && lit && result && (
          <RevealFx phase={phase === 'charge' ? 'charge' : 'burst'} colors={[glow, ...confettiColors(result)]} intensity={tierOf(result) >= 4 || result.variant === 'prime' ? 1.5 : 1} theme={themeOf(result)} />
        )}
        {faces.map((card, i) => (
          <div
            key={i}
            ref={(el) => {
              cards.current[i] = el;
            }}
            className={`pm-card${down[i] ? ' is-down' : ''}${chosen === i ? ' is-chosen' : ''}${chosen !== null && chosen !== i ? ' is-other' : ''}`}
            style={{ '--i': i, zIndex: chosen === i ? 8 : phase === 'gather' || phase === 'shuffle' ? 5 - i : 1 } as CSSProperties}
          >
            <button type="button" className="pm-card__hit" disabled={phase !== 'choose'} aria-label={`Carte ${i + 1}`} onClick={() => void choose(i)}>
              <span className="pm-card__bob">
                <span className="pm-card__inner">
                  <span className="pm-card__front">
                    <Card card={card} size={size} hideFacts={size === 'xs'} />
                  </span>
                  <span className="pm-card__back">
                    <Back serie={offer.serie} />
                    <span className="pm-card__sheen" />
                  </span>
                </span>
              </span>
            </button>
          </div>
        ))}
      </div>
      <div className="pm-overlay__actions">
        {phase === 'look' && (
          <>
            <button type="button" className="btn btn--primary btn--lg pm-go" disabled={!enough} onClick={() => void start()}>
              Piocher {offer.bonus ? '· offerte' : `· ${offer.cost} énergie${offer.cost > 1 ? 's' : ''}`}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Retour
            </button>
            {!enough && <p className="small muted pm-overlay__short">Il te faut {offer.cost} énergies miracle : tu en as {energy}.</p>}
          </>
        )}
        {phase === 'done' && result && (
          <>
            <button type="button" className="btn btn--primary btn--lg" onClick={onClose}>
              Super !
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                onClose();
                openDetail({ card: result });
              }}
            >
              Voir la carte
            </button>
          </>
        )}
      </div>
      <Confetti ref={confetti} />
    </div>,
    document.body,
  );
}
