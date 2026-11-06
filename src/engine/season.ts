// Saisons du jeu : un décor et des musiques de fête, aux mêmes dates chaque année (heure du joueur).
// Halloween, du 20 au 31 octobre : citrouilles, toiles d'araignée et cempasúchil dans l'interface, et la radio passe
// ses trois morceaux d'Halloween.
// Le Jour des morts (1er–7 novembre 2026 : calaveras, bougies, pan de muerto, monarques, musique mexicaine) est retiré :
// ses décors ne reviennent plus, mais ses couleurs (rose, turquoise, nuit indigo et magenta) sont restées celles du jeu
// en dehors d'Halloween (voir App.tsx).

export type Season = 'halloween' | 'muertos';

/** La fête en cours, ou null hors saison. */
export function seasonAt(now: number = Date.now()): Season | null {
  const date = new Date(now);
  const month = date.getMonth();
  const day = date.getDate();
  if (month === 9 && day >= 20) return 'halloween';
  return null;
}

/** Est-ce la saison d'Halloween ? */
export function isHalloween(now: number = Date.now()): boolean {
  return seasonAt(now) === 'halloween';
}
