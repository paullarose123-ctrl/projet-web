import { DIVISION_COUNT, TOP_DIVISION } from './divisions';

// Règles de la Ligue des naturalistes : points, promotions, relégations, bonus de série et saisons mensuelles.
// - Victoire +3, nul +1, défaite −2 (un duel contre un ami ne compte pas).
// - Il faut 7 points pour monter ; à partir du rubis (division 4 et au-dessus), il en faut 10 et on peut redescendre
//   si les points tombent sous zéro.
// - Tout en haut (Baleine bleue mythique), plus de promotion : les points deviennent des étoiles, sans limite.
// - Chaque mois est une saison : à la fin, une récompense selon la division atteinte, puis on redescend de 2 divisions.

/** Divisions « dures » : le rubis et au-dessus (numéro 4 → 1). */
export const HARD_DIVISION = 4;
/** Victoires d'affilée à partir desquelles le bonus de série s'applique. */
export const STREAK_FROM = 3;
/** Bonus de série : +25 % de graines. */
export const STREAK_BONUS = 1.25;
/** Divisions perdues au changement de saison. */
export const SEASON_DROP = 2;

/** Points de ligue d'un duel : victoire +3, nul +1, défaite −2. Un duel entre amis ne compte pas pour la ligue. */
export function leaguePoints(result: 'win' | 'draw' | 'loss', friend?: string): number {
  if (friend) return 0;
  return result === 'win' ? 3 : result === 'draw' ? 1 : -2;
}

/** Points à réunir pour quitter cette division par le haut (Infinity tout en haut). */
export function pointsToPromote(division: number): number {
  if (division <= TOP_DIVISION) return Infinity;
  return division <= HARD_DIVISION ? 10 : 7;
}

/** Peut-on être relégué depuis cette division ? Seulement à partir du rubis. */
export function canBeRelegated(division: number): boolean {
  return division <= HARD_DIVISION && division < DIVISION_COUNT;
}

export interface LeagueStep {
  division: number;
  points: number;
  promoted: boolean;
  relegated: boolean;
}

/** Applique les points d'un duel : promotion, relégation, ou simple changement de points (jamais sous zéro). */
export function applyLeaguePoints(division: number, points: number, delta: number): LeagueStep {
  const after = points + delta;
  if (after >= pointsToPromote(division)) return { division: division - 1, points: 0, promoted: true, relegated: false };
  if (after < 0 && canBeRelegated(division)) {
    // on redescend avec un petit matelas : 3 points sous la promotion de la division du dessous
    const below = division + 1;
    return { division: below, points: Math.max(0, pointsToPromote(below) - 3), promoted: false, relegated: true };
  }
  return { division, points: Math.max(0, after), promoted: false, relegated: false };
}

/** Multiplicateur de graines pour une victoire, d'après la série de victoires (celle-ci comprise). */
export function streakMultiplier(streak: number): number {
  return streak >= STREAK_FROM ? STREAK_BONUS : 1;
}

/** La saison de ligue en cours : « 2026-11 » (le mois, à l'heure du joueur). */
export function seasonKey(now: number = Date.now()): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Nom de la saison : « novembre 2026 ». */
export function seasonLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/** Jours restants avant la fin de la saison (le dernier jour compte pour 1). */
export function seasonDaysLeft(now: number = Date.now()): number {
  const date = new Date(now);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return Math.max(1, Math.ceil((end.getTime() - now) / 86_400_000));
}

export interface SeasonReward {
  balles: number;
  boosters: number;
}

/** Récompense de fin de saison, selon la division atteinte : des graines et, à partir du diamant, des boosters. */
export function seasonReward(division: number): SeasonReward {
  const rank = DIVISION_COUNT + 1 - division; // 1 (Hérisson) → 14 (sommet)
  const boosters = division <= TOP_DIVISION ? 3 : division <= HARD_DIVISION ? 2 : division <= 6 ? 1 : 0;
  return { balles: rank * 1_000, boosters };
}

/** Division de départ de la nouvelle saison : 2 divisions plus bas, sans passer sous la plus basse. */
export function seasonStartDivision(division: number): number {
  return Math.min(DIVISION_COUNT, division + SEASON_DROP);
}
