import { usePresence } from '../store/presence';

// Les joueurs du moment : combien ont le jeu ouvert en ce moment, combien sont passés depuis minuit
// (avec ou sans compte), et les comptes créés. Visible des seuls administrateurs ; caché tant que le serveur n'a
// pas répondu.

const plural = (n: number, word: string) => `${word}${n > 1 ? 's' : ''}`;

export function OnlinePlayers({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const online = usePresence((s) => s.online);
  const today = usePresence((s) => s.today);
  const accounts = usePresence((s) => s.accounts);
  const accountsToday = usePresence((s) => s.accountsToday);
  const accountsWeek = usePresence((s) => s.accountsWeek);
  if (online === null || today === null) return null;
  // on compte au moins le joueur lui-même
  const now = Math.max(1, online);
  const day = Math.max(now, today);
  const label = `${now} ${plural(now, 'joueur')} en ligne, ${day} ${plural(day, 'joueur')} aujourd’hui`;

  if (compact) {
    return (
      <span className={`players-online players-online--compact ${className}`} role="status" aria-label={label} title={label}>
        <span className="live-dot" aria-hidden="true" />
        <b key={now} className="players-online__count">
          {now.toLocaleString('fr-FR')}
        </b>
        <span className="players-online__unit">en ligne</span>
      </span>
    );
  }

  return (
    <section className={`players-online ${className}`} role="status" aria-label={label}>
      <span className="players-online__stat players-online__stat--live">
        <span className="live-dot" aria-hidden="true" />
        <b key={now} className="players-online__count">
          {now.toLocaleString('fr-FR')}
        </b>
        <span className="players-online__unit">{plural(now, 'joueur')} en ligne</span>
      </span>
      <span className="players-online__sep" aria-hidden="true" />
      <span className="players-online__stat" title="Joueurs venus au moins une fois depuis minuit">
        <b key={day} className="players-online__count">
          {day.toLocaleString('fr-FR')}
        </b>
        <span className="players-online__unit">aujourd’hui</span>
      </span>
      {accounts !== null && (
        <>
          <span className="players-online__sep" aria-hidden="true" />
          <span className="players-online__stat" title={`Comptes créés : ${accountsToday ?? 0} depuis minuit, ${accountsWeek ?? 0} sur 7 jours`}>
            <b key={accounts} className="players-online__count">
              {accounts.toLocaleString('fr-FR')}
            </b>
            <span className="players-online__unit">
              {plural(accounts, 'compte')} · +{accountsToday ?? 0} aujourd’hui · +{accountsWeek ?? 0} en 7 j
            </span>
          </span>
        </>
      )}
    </section>
  );
}
