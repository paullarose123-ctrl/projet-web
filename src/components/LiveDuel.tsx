import { useEffect, useState } from 'react';
import { INVITE_TTL, type LiveDuel } from '../account/live';
import { sfx } from '../audio/sfx';
import { ATHLETES_BY_ID } from '../data/athletes';
import { RECORDS, ROUNDS, formatRecordValue, rewardFor } from '../engine/duel';
import { useNow } from '../hooks/useNow';
import { RoundResolution } from '../screens/Match';
import { useGame } from '../store/game';
import { ABSENT_AFTER, liveAsDuel, liveResult, useLive } from '../store/live';
import { Balles } from './Balles';
import { Card } from './Card';

// Duel en direct entre amis, par-dessus le jeu : l'invitation reçue, l'attente de la réponse, puis le duel joué
// à deux en même temps (voir store/live.ts).

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function Invite({ invite }: { invite: LiveDuel }) {
  const now = useNow(1000);
  const accept = useLive((s) => s.accept);
  const decline = useLive((s) => s.decline);
  const busy = useLive((s) => s.busy);
  const left = invite.createdAt + INVITE_TTL - now;
  return (
    <div className="live-invite" role="dialog" aria-labelledby="live-invite-title">
      <span className="live-invite__icon" aria-hidden="true">
        {/* deux empreintes de pattes face à face (la même patte que sur la pièce des crédits) */}
        <svg viewBox="0 0 40 40">
          {[
            [12.5, 24.5, 28],
            [27.5, 15.5, -28],
          ].map(([x, y, angle]) => (
            <g key={x} transform={`translate(${x} ${y}) rotate(${angle}) scale(1.22) translate(-10 -10)`}>
              <ellipse cx={10} cy={12.2} rx={3.1} ry={2.6} />
              <ellipse cx={6.3} cy={8.6} rx={1.25} ry={1.6} transform="rotate(-20 6.3 8.6)" />
              <ellipse cx={8.6} cy={6.6} rx={1.25} ry={1.65} transform="rotate(-6 8.6 6.6)" />
              <ellipse cx={11.4} cy={6.6} rx={1.25} ry={1.65} transform="rotate(6 11.4 6.6)" />
              <ellipse cx={13.7} cy={8.6} rx={1.25} ry={1.6} transform="rotate(20 13.7 8.6)" />
            </g>
          ))}
        </svg>
      </span>
      <div className="live-invite__text">
        <p className="eyebrow">Duel en direct</p>
        <h3 id="live-invite-title">{invite.a} te défie !</h3>
        <p className="muted small">5 manches jouées en même temps, avec ton équipe de duel. Encore {clock(left)} pour répondre.</p>
      </div>
      <div className="live-invite__actions">
        <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void accept(invite)}>
          Accepter
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => void decline(invite)}>
          Refuser
        </button>
      </div>
    </div>
  );
}

function Waiting({ duel }: { duel: LiveDuel }) {
  const now = useNow(1000);
  const cancel = useLive((s) => s.cancel);
  return (
    <div className="live-layer">
      <section className="panel live-wait" role="status">
        <p className="eyebrow">Duel en direct</p>
        <h2>Défi envoyé à {duel.b}</h2>
        <span className="live-wait__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <p className="muted">En attente de sa réponse… encore {clock(duel.createdAt + INVITE_TTL - now)}</p>
        <p className="muted small">Il reçoit une notification dans le jeu. Le duel commence dès qu’il accepte.</p>
        <button type="button" className="btn btn--ghost" onClick={() => void cancel()}>
          Annuler le défi
        </button>
      </section>
    </div>
  );
}

function Final({ duel, me }: { duel: LiveDuel; me: string }) {
  const close = useLive((s) => s.close);
  const division = useGame((s) => s.division);
  const match = liveAsDuel(duel, me);
  const result = liveResult(duel, me);
  return (
    <section className={`panel final final--${result}`}>
      <p className="eyebrow">Fin du duel en direct · contre {match.opp.name}</p>
      <h1>{result === 'win' ? 'Victoire !' : result === 'draw' ? 'Match nul' : 'Défaite'}</h1>
      {duel.forfeit && <p className="muted">{duel.forfeit === me ? 'Tu as quitté le duel.' : `${match.opp.name} a quitté le duel.`}</p>}
      <p className="final__score">
        {match.me.name} {match.me.score} – {match.opp.score} {match.opp.name}
      </p>
      <ol className="final__rounds">
        {match.log.map((log) => (
          <li key={log.round} className={`is-${log.winner}`}>
            <span>{RECORDS[log.record].name}</span>
            <span>
              {ATHLETES_BY_ID[match.me.cards[log.me].athleteId].last} ({formatRecordValue(match.me.cards[log.me], log.record, log.myValue)}) –{' '}
              {ATHLETES_BY_ID[match.opp.cards[log.opp].athleteId].last} ({formatRecordValue(match.opp.cards[log.opp], log.record, log.oppValue)})
            </span>
          </li>
        ))}
      </ol>
      <p>
        Récompense : <Balles value={rewardFor(result, division)} />
      </p>
      <button type="button" className="btn btn--primary btn--xl" onClick={close}>
        Continuer
      </button>
    </section>
  );
}

function Playing({ duel, me }: { duel: LiveDuel; me: string }) {
  const now = useNow(1000);
  const pick = useLive((s) => s.pick);
  const forfeit = useLive((s) => s.forfeit);
  const busy = useLive((s) => s.busy);
  const match = liveAsDuel(duel, me);
  // manches déjà montrées : à l'ouverture (ou après un rechargement), on ne rejoue pas les anciennes
  const [shown, setShown] = useState(() => match.log.length);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);

  useEffect(() => setSelected(null), [duel.round]);

  if (shown < match.log.length) {
    return (
      <RoundResolution
        match={{ ...match, finished: match.finished && shown === match.log.length - 1 }}
        log={match.log[shown]}
        onNext={() => {
          setShown(shown + 1);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }
  if (duel.status === 'done') return <Final duel={duel} me={me} />;

  const record = RECORDS[match.records[match.round]];
  const iAmA = duel.aId === me;
  const oppSeen = (iAmA ? duel.bSeen : duel.aSeen) ?? duel.updatedAt;
  const absent = now - oppSeen > ABSENT_AFTER;
  const waiting = duel.mine !== null;

  return (
    <div className="match live-match">
      <section className="scoreboard" aria-label="Score">
        <div className="scoreboard__team">
          <span>{match.me.name}</span>
        </div>
        <div className="scoreboard__score">
          <b>{match.me.score}</b>
          <span>–</span>
          <b>{match.opp.score}</b>
        </div>
        <div className="scoreboard__team scoreboard__team--opp">
          <span>{match.opp.name}</span>
        </div>
        <ol className="scoreboard__rounds" aria-label="Records du duel">
          {/* les questions se découvrent manche après manche : celles à venir restent cachées */}
          {match.records.map((id, i) => (
            <li key={i} className={i < match.log.length ? `is-${match.log[i].winner}` : i === match.round ? 'is-current' : ''}>
              {i <= match.round ? RECORDS[id].name : '?'}
            </li>
          ))}
        </ol>
      </section>

      <section className="event-banner">
        <p className="eyebrow">
          <span className="live-dot" aria-hidden="true" /> En direct · manche {match.round + 1} sur {ROUNDS}
        </p>
        <h2>{record.name}</h2>
        <p>{record.desc}</p>
      </section>

      {absent && (
        <section className="panel live-absent" role="status">
          <p>
            <b>{match.opp.name}</b> ne répond plus depuis un moment.
          </p>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => void forfeit()}>
            Gagner par forfait
          </button>
        </section>
      )}

      <section className="panel">
        <h3 className="panel__title">L’équipe de {match.opp.name}</h3>
        <div className="card-row card-row--tight">
          {match.opp.cards.map((card, i) => (
            <div key={card.uid} className={`opp-card${match.opp.used.includes(i) ? ' is-used' : ''}`}>
              <Card card={card} size="xs" hideFacts />
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        {waiting ? (
          <div className="live-waiting" role="status">
            <Card card={match.me.cards[duel.mine!]} size="sm" hideFacts />
            <div>
              <p className="eyebrow">Ton choix est fait</p>
              <p>
                En attente de <b>{match.opp.name}</b>
                <span className="live-wait__dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </p>
            </div>
          </div>
        ) : (
          <>
            <h3 className="panel__title">Choisis ton animal pour « {record.name} »</h3>
            <div className="hand">
              {match.me.cards.map((card, i) => {
                const used = match.me.used.includes(i);
                return (
                  <button
                    key={card.uid}
                    type="button"
                    className={`hand__card${used ? ' is-used' : ''}${selected === i ? ' is-selected' : ''}`}
                    disabled={used}
                    onClick={() => {
                      sfx.click();
                      setSelected(i);
                    }}
                    aria-pressed={selected === i}
                    aria-label={ATHLETES_BY_ID[card.athleteId].last}
                  >
                    <Card card={card} size="sm" hideFacts />
                  </button>
                );
              })}
            </div>
          </>
        )}
        <div className="btn-row">
          {!waiting && (
            <button
              type="button"
              className="btn btn--primary btn--xl"
              disabled={selected === null || busy}
              onClick={() => {
                if (selected === null) return;
                void pick(selected);
              }}
            >
              Jouer la manche
            </button>
          )}
          {!confirmQuit ? (
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmQuit(true)}>
              Abandonner
            </button>
          ) : (
            <button type="button" className="btn btn--danger" onClick={() => void forfeit()}>
              Confirmer l’abandon (défaite par forfait)
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/** La couche des duels en direct : invitation, attente ou duel en cours. */
export function LiveLayer() {
  const invites = useLive((s) => s.invites);
  const current = useLive((s) => s.current);
  const me = useLive((s) => s.me);
  if (current && me) {
    if (current.status === 'pending' && current.aId === me) return <Waiting duel={current} />;
    if (current.status === 'active' || current.status === 'done') {
      return (
        <div className="live-layer">
          <Playing key={current.id} duel={current} me={me} />
        </div>
      );
    }
  }
  return invites.length ? <Invite invite={invites[0]} /> : null;
}
