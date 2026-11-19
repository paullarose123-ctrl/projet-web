import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { CardFace } from '../engine/types';
import { ATHLETES_BY_ID } from '../data/athletes';
import { rarityOf } from '../engine/cards';
import { PIOCHE_MAX, bestCard, piocheOffers, type PiocheOffer } from '../engine/pioche';
import { serieDef } from '../engine/series';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';
import { formatDuration, timeAgo, useNow } from '../hooks/useNow';
import { sfx } from '../audio/sfx';
import { Card, type CardSize } from './Card';
import { CardBack } from './CardBack';
import { CardBackMexique } from './CardBackMexique';
import { CardBackHiver } from './CardBackHiver';
import { Landscape } from './PackScene';
import { packScene } from './PackArt';

// Pioche miracle, sur l'accueil : les boosters ouverts par d'autres collectionneurs (engine/pioche.ts). On choisit
// un booster, on voit ses 5 cartes ; elles se retournent, se rassemblent, se mélangent et se redistribuent face
// cachée : on en touche une, et c'est elle qu'on garde. Les quatre autres se retournent ensuite, pour voir ce qu'on a
// manqué.

/** Boosters affichés sur l'accueil (les plus récents). */
const SHOWN = 8;

/** Petit éclat d'énergie miracle (étoile à quatre branches). */
function Spark({ off = false }: { off?: boolean }) {
  return (
    <svg className={`pm-spark${off ? ' is-off' : ''}`} viewBox="-10 -10 20 20" aria-hidden="true">
      <path d="M0 -9C1 -3 3 -1 9 0C3 1 1 3 0 9C-1 3 -3 1 -9 0C-3 -1 -1 -3 0 -9Z" />
    </svg>
  );
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

export function PiocheMiracle() {
  const now = useNow(1000);
  const pioche = useGame((s) => s.pioche);
  const minute = Math.floor(now / 60_000);
  // la liste ne change qu'une fois par minute (un nouveau booster arrive toutes les 30 minutes)
  const offers = useMemo(() => piocheOffers(minute * 60_000).slice(0, SHOWN), [minute]);
  const [open, setOpen] = useState<PiocheOffer | null>(null);
  const energy = pioche?.energy ?? PIOCHE_MAX;
  const used = new Set(pioche?.used ?? []);

  return (
    <section className="panel pioche" aria-labelledby="pioche-title">
      <header className="pioche__head">
        <div>
          <p className="eyebrow">Les boosters des autres collectionneurs</p>
          <h2 id="pioche-title">Pioche miracle</h2>
          <p className="muted small">Choisis un booster ouvert par un autre joueur : ses 5 cartes se retournent et se mélangent, et tu en pioches une au hasard.</p>
        </div>
        <div className="pioche__energy" aria-label={`Énergie miracle : ${energy} sur ${PIOCHE_MAX}`}>
          <span className="pioche__sparks">
            {Array.from({ length: PIOCHE_MAX }, (_, i) => (
              <Spark key={i} off={i >= energy} />
            ))}
          </span>
          <small>{energy >= PIOCHE_MAX ? 'Énergie pleine' : `+1 dans ${formatDuration((pioche?.nextAt ?? now) - now)}`}</small>
        </div>
      </header>
      <div className="pioche__row">
        {offers.map((offer) => {
          const done = used.has(offer.id);
          const short = !done && energy < offer.cost;
          return (
            <button
              key={offer.id}
              type="button"
              className={`pm-tile${done ? ' is-done' : ''}${short ? ' is-short' : ''}${offer.bonus ? ' is-bonus' : ''}`}
              disabled={done}
              aria-label={`Booster de ${offer.pseudo}${done ? ', déjà pioché' : ''}`}
              onClick={() => {
                sfx.click();
                setOpen(offer);
              }}
            >
              <span className="pm-tile__fan" aria-hidden="true">
                {offer.cards.map((card, i) => (
                  <span key={i} className="pm-tile__card" style={{ '--k': i - 2, '--lift': `${Math.abs(i - 2) * 4}px` } as CSSProperties}>
                    <Card card={card} size="xs" hideFacts />
                  </span>
                ))}
              </span>
              <span className="pm-tile__who">
                <b>{offer.pseudo}</b>
                <small>
                  {serieDef(offer.serie).name} · {timeAgo(offer.at, now)}
                </small>
              </span>
              {done ? <span className="pm-tile__done">Déjà pioché</span> : <Cost offer={offer} />}
            </button>
          );
        })}
      </div>
      {open && <PiocheOverlay offer={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

type Phase = 'look' | 'hide' | 'gather' | 'shuffle' | 'spread' | 'choose' | 'reveal' | 'done';

/** Taille des cartes et position de chaque place : une rangée de 5, ou 3 + 2 sur un petit écran. */
function useLayout(): { size: CardSize; w: number; slots: Array<{ x: number; y: number }> } {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1024 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  if (width >= 760) {
    const w = width >= 1180 ? 196 : 140;
    const gap = width >= 1180 ? 22 : 16;
    return { size: width >= 1180 ? 'md' : 'sm', w, slots: [0, 1, 2, 3, 4].map((i) => ({ x: (i - 2) * (w + gap), y: 0 })) };
  }
  const w = Math.min(104, Math.floor((width - 56) / 3));
  const h = w * 1.4;
  const gap = 12;
  return {
    size: 'xs',
    w,
    slots: [0, 1, 2, 3, 4].map((i) => (i < 3 ? { x: (i - 1) * (w + gap), y: -(h + gap) / 2 } : { x: (i - 3.5) * (w + gap), y: (h + gap) / 2 })),
  };
}

const ROTATIONS = [-7, 4, -2, 6, -4];

function PiocheOverlay({ offer, onClose }: { offer: PiocheOffer; onClose: () => void }) {
  const piocher = useGame((s) => s.piocher);
  const energy = useGame((s) => s.pioche?.energy ?? PIOCHE_MAX);
  const openDetail = useUi((s) => s.openDetail);
  const { size, w, slots } = useLayout();
  const [phase, setPhase] = useState<Phase>('look');
  // la carte de chaque place : d'abord le booster tel qu'il a été ouvert, puis la répartition après le mélange
  const [faces, setFaces] = useState<CardFace[]>(offer.cards);
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<(CardFace & { uid: string; isNew: boolean }) | null>(null);
  const timers = useRef<number[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const list = timers.current;
    return () => {
      document.body.style.overflow = previous;
      list.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const best = bestCard(offer.cards);
  const enough = energy >= offer.cost;

  const start = () => {
    if (!enough) return;
    sfx.flip();
    setPhase('hide');
    later(480, () => {
      sfx.whoosh();
      setPhase('gather');
    });
    later(1000, () => {
      sfx.rustle();
      setPhase('shuffle');
    });
    later(2500, () => {
      sfx.deal();
      setPhase('spread');
    });
    later(3050, () => setPhase('choose'));
  };

  const choose = (slot: number) => {
    if (phase !== 'choose') return;
    const got = piocher(offer.id);
    if (!got) {
      onClose();
      return;
    }
    // la carte touchée est celle tirée ; les quatre autres prennent les autres places, au hasard
    const rest = offer.cards.filter((_, i) => i !== got.index).sort(() => Math.random() - 0.5);
    const next: CardFace[] = [];
    for (let i = 0; i < 5; i++) next.push(i === slot ? got.card : rest.shift()!);
    setFaces(next);
    setChosen(slot);
    setResult(got.card);
    sfx.flip();
    setPhase('reveal');
    const athlete = ATHLETES_BY_ID[got.card.athleteId];
    later(420, () => sfx.reveal(got.card.variant === 'prime' ? 4 : Math.min(4, rarityOf(athlete).order)));
    later(1500, () => {
      sfx.flip();
      setPhase('done');
    });
  };

  const down = (i: number) => phase === 'hide' || phase === 'gather' || phase === 'shuffle' || phase === 'spread' || phase === 'choose' || (phase === 'reveal' && i !== chosen);
  const centered = phase === 'gather' || phase === 'shuffle';
  const resultAthlete = result ? ATHLETES_BY_ID[result.athleteId] : null;

  return createPortal(
    <div className={`pm-overlay pm-overlay--${phase}`} role="dialog" aria-modal="true" aria-label={`Pioche miracle : booster de ${offer.pseudo}`}>
      <div className="pm-overlay__backdrop" aria-hidden="true">
        <Landscape className="pm-overlay__scene" scene={packScene(offer.serie === 3 ? 'hiver' : offer.serie === 2 ? 'mexique' : 'violet')} seed={`pioche ${offer.id}`} />
      </div>
      <div className="pm-overlay__top">
        <p className="eyebrow">Pioche miracle</p>
        <h2>
          {phase === 'look' && <>Le booster de {offer.pseudo}</>}
          {(phase === 'hide' || phase === 'gather' || phase === 'shuffle' || phase === 'spread') && <>Les cartes se mélangent…</>}
          {phase === 'choose' && <>Choisis une carte</>}
          {(phase === 'reveal' || phase === 'done') && resultAthlete && <>Tu as pioché : {resultAthlete.last}</>}
        </h2>
        {phase === 'done' && result && (
          <span className={`pm-overlay__tag tag ${result.isNew ? 'tag--new' : 'tag--dupe'}`}>{result.isNew ? 'Nouveau' : 'Doublon'}</span>
        )}
        <p className="muted small">
          {phase === 'look' && `${serieDef(offer.serie).name} · ouvert ${timeAgo(offer.at, Date.now())} · meilleure carte : ${ATHLETES_BY_ID[best.athleteId].last}`}
          {phase === 'choose' && 'Touche la carte que tu veux garder : l’une des cinq, au hasard.'}
          {phase === 'done' && 'Voici ce que cachaient les autres cartes.'}
        </p>
      </div>
      <div className="pm-stage" style={{ '--pm-w': `${w}px` } as CSSProperties}>
        {faces.map((card, i) => (
          <div
            key={i}
            className={`pm-card${down(i) ? ' is-down' : ''}${chosen === i ? ' is-chosen' : ''}${chosen !== null && chosen !== i && phase === 'done' ? ' is-missed' : ''}`}
            style={
              {
                '--x': `${centered ? 0 : slots[i].x}px`,
                '--y': `${centered ? 0 : slots[i].y}px`,
                '--r': `${centered ? ROTATIONS[i] : 0}deg`,
                '--i': i,
                // pendant le mélange, chaque carte part d'un côté puis revient
                '--dx': `${(i - 2) * 34 + (i % 2 ? -46 : 46)}px`,
                '--dr': `${(i - 2) * 4}deg`,
                zIndex: chosen === i ? 6 : centered ? 5 - i : 1,
              } as CSSProperties
            }
          >
            <button type="button" className="pm-card__hit" disabled={phase !== 'choose'} aria-label={`Carte ${i + 1}`} onClick={() => choose(i)}>
              <span className="pm-card__shuffle">
                <span className="pm-card__inner">
                  <span className="pm-card__front">
                    <Card card={card} size={size} hideFacts={size === 'xs'} />
                  </span>
                  <span className="pm-card__back">
                    <Back serie={offer.serie} />
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
            <button type="button" className="btn btn--primary btn--lg" disabled={!enough} onClick={start}>
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
    </div>,
    document.body,
  );
}
