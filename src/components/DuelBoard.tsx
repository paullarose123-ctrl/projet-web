import { useEffect, useState, type CSSProperties } from 'react';
import { ATHLETES_BY_ID } from '../data/athletes';
import { MAX_TIEBREAKS, RECORDS, ROUNDS, formatRecordValue, isFree, isSuddenDeath, type DuelCard, type DuelRound, type DuelState } from '../engine/duel';
import { divisionInfo } from '../engine/divisions';
import { arenaScene } from '../art/arenes';
import { sfx } from '../audio/sfx';
import { Card } from './Card';
import { DIVISION_PASTELS } from './DivisionBadge';
import { Landscape } from './PackScene';

// Le terrain du duel de records, en face-à-face vertical comme une table de jeu de cartes, sur ordinateur comme sur
// téléphone : le décor de la division en fond, l'équipe adverse en haut, son socle, la question de la manche au milieu,
// ton socle, puis ta main de 5 animaux en bas. Les cartes des socles sont grandes ; le terrain occupe la hauteur de
// l'écran et toutes les tailles en découlent (unités de conteneur, voir .board dans motion.css).
// On pose un animal sur son socle, on valide, et l'animal adverse se retourne sur le sien.
// Les règles ne changent pas : seules la présentation et la mise en scène sont celles d'un plateau.

/** Largeurs des cartes, en unités du terrain (le texte des cartes suit --card-w). */
const W_OPP = 'min(7.6cqh, 16cqw)';
const W_HAND = 'min(10.4cqh, 18.4cqw)';
const W_SOCLE = 'min(21.5cqh, 48cqw)';
const w = (width: string): CSSProperties => ({ ['--card-w' as string]: width });

/** La réponse sur la carte du socle, la vraie mesure dessous (« Oui · 220 kg »). */
function Value({ card, log, who }: { card: DuelCard; log: DuelRound; who: 'me' | 'opp' }) {
  const [answer, detail] = formatRecordValue(card, log.record, who === 'me' ? log.myValue : log.oppValue).split(' · ');
  return (
    <p className={`socle__value${log.winner === who ? ' is-winner' : ''}`}>
      {answer}
      {detail && <small>{detail}</small>}
    </p>
  );
}

/** Le nom et le score d'un joueur, à gauche de son socle. */
function Side({ name, score }: { name: string; score: number }) {
  return (
    <div className="board__side">
      <b className="board__score">{score}</b>
      <span className="board__name">{name}</span>
    </div>
  );
}

export function DuelBoard({
  match,
  reveal,
  onPlay,
  onNext,
  onAbandon,
}: {
  match: DuelState;
  /** la manche qui vient d'être jouée, montrée sur les socles (null pendant le choix) */
  reveal: DuelRound | null;
  onPlay: (index: number) => void;
  onNext: () => void;
  onAbandon: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const tier = divisionInfo(match.division).tier;

  // le terrain commence en haut de l'écran
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // les sons de la révélation, quand la carte adverse s'est retournée
  useEffect(() => {
    if (!reveal) return;
    const id = window.setTimeout(() => {
      sfx.hit();
      if (reveal.winner === 'me') sfx.reveal(2);
      if (reveal.winner === 'opp') sfx.error();
    }, 650);
    return () => window.clearTimeout(id);
  }, [reveal]);

  // pendant la révélation, la question affichée est celle de la manche jouée
  const roundIndex = reveal ? reveal.round : match.round;
  const record = RECORDS[match.records[roundIndex]];
  const sudden = reveal ? reveal.round >= ROUNDS : isSuddenDeath(match);
  const myCard = reveal ? match.me.cards[reveal.me] : selected !== null ? match.me.cards[selected] : null;
  const oppCard = reveal ? match.opp.cards[reveal.opp] : null;
  const rounds = Math.max(ROUNDS, match.records.length);

  const outcome = (who: 'me' | 'opp') => (reveal ? ` is-${reveal.winner === who ? 'winner' : reveal.winner === 'draw' ? 'draw' : 'loser'}` : '');

  return (
    <section className={`board board--${tier}`} style={{ ['--metal' as string]: DIVISION_PASTELS[tier] }} aria-label="Terrain du duel">
      <Landscape className="board__scene" scene={arenaScene(match.division)} seed={`terrain-${match.division}`} shade maxWidth={760} />

      {/* en haut : l'équipe adverse, ses animaux déjà joués en grisé */}
      <div className="board__row board__row--opp">
        {match.opp.cards.map((card, i) => {
          const playing = reveal?.opp === i;
          return (
            <div key={card.uid} className={`board__opp${isFree(match, 'opp', i) || playing ? '' : ' is-used'}${playing ? ' is-playing' : ''}`}>
              <Card card={card} size="xs" hideFacts style={w(W_OPP)} />
            </div>
          );
        })}
      </div>

      {/* le socle adverse : vide pendant que tu choisis, puis l'animal adverse s'y retourne */}
      <div className="board__lane">
        <Side name={match.opp.name} score={match.opp.score} />
        <div className={`socle socle--opp${outcome('opp')}`}>
          <div className="socle__slot">
            {oppCard ? (
              <div className="socle__card socle__card--flip" key={`o${roundIndex}`}>
                <Card card={oppCard} size="sm" hideFacts style={w(W_SOCLE)} />
              </div>
            ) : (
              <span className="socle__wait">{selected === null ? 'L’adversaire attend' : 'Prêt'}</span>
            )}
            {reveal && oppCard && <Value card={oppCard} log={reveal} who="opp" />}
          </div>
        </div>
        <div className="board__aside">
          {!reveal &&
            (!confirmAbandon ? (
              <button type="button" className="btn btn--ghost btn--xs" onClick={() => setConfirmAbandon(true)}>
                Abandonner
              </button>
            ) : (
              <button type="button" className="btn btn--danger btn--xs" onClick={onAbandon}>
                Confirmer (aucune récompense)
              </button>
            ))}
        </div>
      </div>

      {/* la question, au milieu du terrain */}
      <div className={`board__question${reveal ? ` is-${reveal.winner}` : ''}`} key={`q${roundIndex}`}>
        <ol className="board__rounds" aria-label="Manches">
          {Array.from({ length: rounds }, (_, i) => {
            const done = i < match.log.length && (!reveal || i <= reveal.round);
            return <li key={i} className={done ? `is-${match.log[i].winner}` : i === roundIndex ? 'is-current' : ''} />;
          })}
        </ol>
        <p className="board__round">{sudden ? `Manche décisive (${MAX_TIEBREAKS} au plus)` : `Manche ${roundIndex + 1} sur ${ROUNDS}`}</p>
        <h2 className="board__record">{record.name}</h2>
        {reveal ? (
          <p className="board__verdict" role="status">
            {reveal.winner === 'me' ? 'Manche gagnée !' : reveal.winner === 'opp' ? 'Manche perdue' : 'Égalité parfaite'}
          </p>
        ) : (
          <p className="board__desc">{record.desc}</p>
        )}
      </div>

      {/* ton socle : l'animal choisi dans ta main s'y pose ; le toucher le reprend */}
      <div className="board__lane">
        <Side name={match.me.name} score={match.me.score} />
        <div className={`socle socle--me${outcome('me')}`}>
          <div className="socle__slot">
            {myCard ? (
              <button
                type="button"
                className="socle__card socle__card--drop"
                key={`m${reveal ? reveal.me : selected}`}
                onClick={() => !reveal && setSelected(null)}
                disabled={!!reveal}
                aria-label={reveal ? ATHLETES_BY_ID[myCard.athleteId].last : `Reprendre ${ATHLETES_BY_ID[myCard.athleteId].last}`}
              >
                <Card card={myCard} size="sm" hideFacts style={w(W_SOCLE)} />
              </button>
            ) : (
              <span className="socle__wait">Pose un animal de ta main</span>
            )}
            {reveal && myCard && <Value card={myCard} log={reveal} who="me" />}
          </div>
        </div>
        <div className="board__aside">
          {reveal ? (
            <button type="button" className="btn btn--primary board__go" onClick={onNext}>
              {match.finished ? 'Résultat' : 'Suivante'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary board__go"
              disabled={selected === null}
              onClick={() => {
                if (selected === null) return;
                onPlay(selected);
                setSelected(null);
              }}
            >
              Jouer
            </button>
          )}
        </div>
      </div>

      {/* en bas : ta main de 5 animaux */}
      <div className="board__row board__row--hand" role="group" aria-label="Ta main">
        {match.me.cards.map((card, i) => {
          const used = !isFree(match, 'me', i) && reveal?.me !== i;
          const placed = (reveal ? reveal.me : selected) === i;
          return (
            <button
              key={card.uid}
              type="button"
              className={`board__hand${used ? ' is-used' : ''}${placed ? ' is-placed' : ''}`}
              disabled={used || !!reveal}
              onClick={() => {
                sfx.click();
                setSelected(selected === i ? null : i);
              }}
              aria-pressed={placed}
              aria-label={ATHLETES_BY_ID[card.athleteId].last}
            >
              <Card card={card} size="sm" hideFacts style={w(W_HAND)} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
