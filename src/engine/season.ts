// Saisons du jeu : un décor et des musiques de fête, aux mêmes dates chaque année (heure du joueur).
// Halloween, du 20 au 31 octobre : citrouilles, toiles d'araignée et cempasúchil dans l'interface, et la radio passe
// ses trois morceaux d'Halloween. Puis le Jour des morts mexicain, du 1er au 7 novembre : plus aucune citrouille, des
// calaveras, des bougies, du pan de muerto et des monarques, et la radio passe ses morceaux mexicains.

export type Season = 'halloween' | 'muertos';

/** La fête en cours, ou null hors saison. */
export function seasonAt(now: number = Date.now()): Season | null {
  const date = new Date(now);
  const month = date.getMonth();
  const day = date.getDate();
  if (month === 9 && day >= 20) return 'halloween';
  if (month === 10 && day <= 7) return 'muertos';
  return null;
}

/** Est-ce la saison d'Halloween ? */
export function isHalloween(now: number = Date.now()): boolean {
  return seasonAt(now) === 'halloween';
}

/** Est-ce la semaine du Jour des morts ? */
export function isMuertos(now: number = Date.now()): boolean {
  return seasonAt(now) === 'muertos';
}
