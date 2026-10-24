import type { SportId } from './types';
import { ATHLETES } from '../data/athletes';
import { SPORT_ORDER, SPORTS } from '../data/sports';
import { serieDef, serieOf } from './series';

// Badges de collection, gardés pour toujours une fois gagnés :
// - une famille complétée dans l'album de la Série 1 (toutes ses espèces découvertes, sans compter ses Icônes, les
//   espèces disparues bien trop rares pour être exigées) donne le badge de la famille ;
// - une série de pays complétée (toutes ses espèces, ses Icônes et ses Habitats mis à part) donne le badge de la série.

/** Badge d'une série de pays (« serie-2 »). */
export const serieBadge = (number: number) => `serie-${number}`;

/** Espèces découvertes et espèces de la famille (Série 1), Icônes et Habitats mis à part. */
export function familyProgress(discovered: Record<string, number>, sport: SportId): [number, number] {
  let owned = 0;
  let total = 0;
  for (const athlete of ATHLETES) {
    if (athlete.sport !== sport || athlete.habitat || athlete.retired || serieOf(athlete) !== 1) continue;
    total += 1;
    if (discovered[athlete.id]) owned += 1;
  }
  return [owned, total];
}

/** Espèces découvertes et espèces d'une série de pays, Icônes et Habitats mis à part. */
export function serieProgress(discovered: Record<string, number>, number: number): [number, number] {
  let owned = 0;
  let total = 0;
  for (const athlete of ATHLETES) {
    if (athlete.habitat || athlete.retired || serieOf(athlete) !== number) continue;
    total += 1;
    if (discovered[athlete.id]) owned += 1;
  }
  return [owned, total];
}

/** Familles complètes de l'album de la Série 1. */
export function completedFamilies(discovered: Record<string, number>): SportId[] {
  return SPORT_ORDER.filter((sport) => {
    const [owned, total] = familyProgress(discovered, sport);
    return total > 0 && owned === total;
  });
}

/** Séries de pays complètes. */
export function completedSeries(discovered: Record<string, number>): number[] {
  const numbers = [...new Set(ATHLETES.map(serieOf))].filter((number) => number > 1);
  return numbers.filter((number) => {
    const [owned, total] = serieProgress(discovered, number);
    return total > 0 && owned === total;
  });
}

/** Badge nouvellement gagné : son identifiant et la phrase de sa notification. */
export interface EarnedBadge {
  id: string;
  text: string;
}

/** Badges complets qui n'ont pas encore été gagnés. */
export function newBadges(discovered: Record<string, number>, badges: Record<string, number>): EarnedBadge[] {
  const families = completedFamilies(discovered)
    .filter((sport) => !badges[sport])
    .map((sport) => ({ id: sport, text: `Badge ${SPORTS[sport].name} : tu as complété la collection ${SPORTS[sport].of} !` }));
  const series = completedSeries(discovered)
    .filter((number) => !badges[serieBadge(number)])
    .map((number) => ({ id: serieBadge(number), text: `Badge ${serieDef(number).name} : tu as complété la Série ${number} !` }));
  return [...families, ...series];
}
