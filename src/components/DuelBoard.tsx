import { useEffect, useState, type CSSProperties } from 'react';
import { ATHLETES_BY_ID } from '../data/athletes';
import { MAX_TIEBREAKS, RECORDS, ROUNDS, formatRecordValue, isFree, isSuddenDeath, type DuelCard, type DuelRound, type DuelState } from '../engine/duel';
import { divisionInfo } from '../engine/divisions';
import { arenaScene } from '../art/arenes';
import { sfx } from '../audio/sfx';
import { Card } from './Card';
import { DIVISION_PASTELS } from './DivisionBadge';
import { Landscape } from './PackScene';

// Le terrain du duel de records, présenté comme une table de jeu de cartes : le décor de la division en fond, l'équipe
// adverse en haut, deux socles au milieu (un par joueur) et la question de la manche entre les deux, ta main de
// 5 animaux en bas. On pose un animal sur son socle, on valide, et l'animal adverse se retourne sur le sien.
// Les règles ne changent pas : seules la présentation et la mise en scène sont celles d'un plateau.

/** Largeurs des cartes sur le terrain (le texte des cartes suit --card-w). */
const W_OPP = 'clamp(40px, min(12vw, 8vh), 72px)';
const W_HAND = 'clamp(54px, min(17vw, 11vh), 100px)';
const W_SOCLE = 'clamp(78px, min(26vw, 14vh), 128px)';
const w = (width: string): CSSProperties => ({ ['--card-w' as string]: width });

/** La réponse en grand sous le socle, la vraie mesure dessous (« Oui · 220 kg »). */
function Value({ card, log, who }: { card: DuelCard; log: DuelRound; who: 'me' | 'opp' }) {
  const [answer, detail] = formatRecordValue(card, log.record, who === 'me' ? log.myValue : log.oppValue).split(' · ');
  return (
    <p className={`socle__value${log.winner === who ? ' is-winner' : ''}`}>
      {answer}
      {detail && <small>{detail}</small>}
    </p>
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

  return (
    <section className={`board board--${tier}`} style={{ ['--metal' as string]: DIVISION_PASTELS[tier] }} aria-label="Terrain du duel">
      <Landscape className="board__scene" scene={arenaScene(match.division)} seed={`terrain-${match.division}`} shade maxWidth={760} />

      <div className="board__mat">
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

        <div className="board__field">
          {/* le socle adverse : vide pendant que tu choisis, puis l'animal adverse s'y retourne */}
          <div className={`socle socle--opp${reveal ? ` is-${reveal.winner === 'opp' ? 'winner' : reveal.winner === 'me' ? 'loser' : 'draw'}` : ''}`}>
            <div className="socle__slot">
              {oppCard ? (
                <div className="socle__card socle__card--flip" key={`o${roundIndex}`}>
                  <Card card={oppCard} size="sm" hideFacts style={w(W_SOCLE)} />
                </div>
              ) : (
                <span className="socle__wait">{selected === null ? 'L’adversaire attend' : 'Prêt'}</span>
              )}
            </div>
            {reveal && oppCard && <Value card={oppCard} log={reveal} who="opp" />}
          </div>

          {/* la question, au milieu du terrain */}
          <div className={`board__question${reveal ? ` is-${reveal.winner}` : ''}`} key={`q${roundIndex}`}>
            <p className="board__scoreline" aria-label={`Score : ${match.me.name} ${match.me.score}, ${match.opp.name} ${match.opp.score}`}>
              <span>{match.me.name}</span>
              <b className="board__score">{match.me.score}</b>
              <b className="board__score">{match.opp.score}</b>
              <span>{match.opp.name}</span>
            </p>
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
          <div className={`socle socle--me${reveal ? ` is-${reveal.winner === 'me' ? 'winner' : reveal.winner === 'opp' ? 'loser' : 'draw'}` : ''}`}>
            {reveal && myCard && <Value card={myCard} log={reveal} who="me" />}
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
                <span className="socle__wait">Pose un animal</span>
              )}
            </div>
          </div>
        </div>

        <div className="board__actions">
          {reveal ? (
            <button type="button" className="btn btn--primary btn--lg" onClick={onNext}>
              {match.finished ? 'Voir le résultat' : 'Manche suivante'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--lg"
              disabled={selected === null}
              onClick={() => {
                if (selected === null) return;
                onPlay(selected);
                setSelected(null);
              }}
            >
              {selected === null ? 'Choisis un animal' : `Jouer ${ATHLETES_BY_ID[match.me.cards[selected].athleteId].last}`}
            </button>
          )}
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
      </div>

      {!reveal && (
        <div className="board__quit">
          {!confirmAbandon ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmAbandon(true)}>
              Abandonner
            </button>
          ) : (
            <button type="button" className="btn btn--danger btn--sm" onClick={onAbandon}>
              Confirmer l’abandon (aucune récompense)
            </button>
          )}
        </div>
      )}
    </section>
  );
}
