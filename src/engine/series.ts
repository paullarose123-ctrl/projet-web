import type { Athlete } from './types';
import { ATHLETES } from '../data/athletes';

// Les séries de cartes. La première rassemble les animaux du monde ; les suivantes partent chacune à la découverte
// d'un pays, une par mois. Une série sort à minuit (heure du joueur) le jour de sa sortie : avant, ses cartes ne
// sortent d'aucun booster, ne passent pas au marché, ne figurent ni dans l'album ni dans les duels.
// En développement, dans la version de test et dans la page d'aperçu du site (/apercu/), toutes les séries sont
// ouvertes, pour les essayer avant leur sortie.

export interface SerieDef {
  number: number;
  name: string;
  /** pays de la série (les séries de pays) */
  country?: string;
  /** nom du pays dans sa langue, sur les boosters et les dos de cartes (« México ») */
  local?: string;
  /** jour de sortie, à minuit heure du joueur */
  release: Date;
}

export const SERIES_LIST: SerieDef[] = [
  { number: 1, name: 'Animaux du monde', release: new Date(2026, 0, 1) },
  { number: 2, name: 'Mexique', country: 'MX', local: 'México', release: new Date(2026, 10, 1) },
];

/** Version de développement, de test ou d'aperçu : les séries à venir sont déjà ouvertes. */
let EARLY = import.meta.env.DEV || import.meta.env.MODE === 'single' || import.meta.env.MODE === 'apercu';

/** Pour les tests : se placer comme sur le site public, où les séries sortent à leur date. */
export function setEarlyAccessForTesting(on: boolean): void {
  EARLY = on;
  releasedCache = null;
}

export function serieOf(athlete: Athlete): number {
  return athlete.serie ?? 1;
}

export function serieDef(number: number): SerieDef {
  return SERIES_LIST.find((s) => s.number === number) ?? SERIES_LIST[0];
}

/** La série est-elle sortie ? */
export function isReleased(number: number, now: number = Date.now()): boolean {
  if (EARLY) return true;
  return now >= serieDef(number).release.getTime();
}

/** Séries sorties, de la première à la plus récente. */
export function releasedSeries(now: number = Date.now()): SerieDef[] {
  return SERIES_LIST.filter((s) => isReleased(s.number, now));
}

/** La série la plus récente : celle du booster gratuit. */
export function currentSerie(now: number = Date.now()): SerieDef {
  const out = releasedSeries(now);
  return out[out.length - 1] ?? SERIES_LIST[0];
}

/** La prochaine série annoncée (aucune si la dernière connue est déjà sortie). */
export function nextSerie(now: number = Date.now()): SerieDef | undefined {
  return SERIES_LIST.find((s) => !isReleased(s.number, now));
}

/** Cartes d'une série. */
export function cardsOfSerie(number: number): Athlete[] {
  return ATHLETES.filter((athlete) => serieOf(athlete) === number);
}

let releasedCache: { count: number; athletes: Athlete[] } | null = null;

/** Cartes des séries déjà sorties (le marché, les duels, l'album et la carte du monde ne montrent qu'elles). */
export function releasedAthletes(now: number = Date.now()): Athlete[] {
  const count = releasedSeries(now).length;
  if (releasedCache?.count !== count) {
    releasedCache = { count, athletes: ATHLETES.filter((athlete) => isReleased(serieOf(athlete), now)) };
  }
  return releasedCache.athletes;
}

/** La carte est-elle déjà sortie ? */
export function isCardReleased(athlete: Athlete, now: number = Date.now()): boolean {
  return isReleased(serieOf(athlete), now);
}
