import { hashString, mulberry32, pick, type Rng } from './random';

// Objectifs du jour : chaque jour (à minuit, heure du joueur), trois défis tirés au sort, un par catégorie : ouvrir
// des boosters, enrichir sa collection, jouer en duel. Le tirage ne dépend que de la date : tous les joueurs ont les
// mêmes défis le même jour. Chacun rapporte des crédits, et les trois réussis débloquent un bonus.

/** Ce que l'on compte pendant la journée (remis à zéro à minuit). */
export interface DailyCounts {
  /** boosters et packs ouverts */
  packs: number;
  /** espèces jamais obtenues avant */
  newSpecies: number;
  /** cartes Rares ou mieux (Prime et Icônes comprises) */
  rare: number;
  /** cartes de la Série 2 · Mexique */
  mexique: number;
  /** cartes vendues au comptoir */
  quickSold: number;
  /** duels joués */
  played: number;
  /** duels gagnés */
  won: number;
}

export interface DailyState {
  /** jour de ces compteurs (AAAA-MM-JJ, heure du joueur) */
  day: string;
  counts: DailyCounts;
  /** objectifs du jour dont la récompense a été récupérée */
  claimed: string[];
  /** bonus des trois objectifs récupéré */
  bonus: boolean;
}

export interface DailyObjective {
  id: string;
  title: string;
  /** compteur suivi, et nombre à atteindre */
  count: keyof DailyCounts;
  goal: number;
  reward: number;
}

/** Récompense quand les trois objectifs du jour sont récupérés. */
export const DAILY_BONUS = 3_000;

const BOOSTERS: DailyObjective[] = [
  { id: 'packs-2', title: 'Ouvrir 2 boosters', count: 'packs', goal: 2, reward: 600 },
  { id: 'packs-3', title: 'Ouvrir 3 boosters', count: 'packs', goal: 3, reward: 900 },
  { id: 'packs-5', title: 'Ouvrir 5 boosters', count: 'packs', goal: 5, reward: 1_500 },
];

const COLLECTION: DailyObjective[] = [
  { id: 'new-2', title: 'Trouver 2 nouvelles espèces', count: 'newSpecies', goal: 2, reward: 800 },
  { id: 'new-4', title: 'Trouver 4 nouvelles espèces', count: 'newSpecies', goal: 4, reward: 1_400 },
  { id: 'rare-1', title: 'Obtenir une carte Rare ou mieux', count: 'rare', goal: 1, reward: 1_000 },
  { id: 'sell-3', title: 'Vendre 3 cartes au comptoir', count: 'quickSold', goal: 3, reward: 600 },
];

/** Seulement une fois la Série 2 sortie. */
const MEXIQUE: DailyObjective = { id: 'mexique-5', title: 'Obtenir 5 cartes du Mexique', count: 'mexique', goal: 5, reward: 900 };

const DUELS: DailyObjective[] = [
  { id: 'play-2', title: 'Jouer 2 duels', count: 'played', goal: 2, reward: 700 },
  { id: 'win-1', title: 'Gagner un duel', count: 'won', goal: 1, reward: 900 },
  { id: 'win-2', title: 'Gagner 2 duels', count: 'won', goal: 2, reward: 1_600 },
];

export const ALL_DAILY: DailyObjective[] = [...BOOSTERS, ...COLLECTION, MEXIQUE, ...DUELS];

/** Le jour d'une date, à l'heure du joueur (AAAA-MM-JJ). */
export function dayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Minuit suivant, à l'heure du joueur : l'heure des prochains objectifs. */
export function nextMidnight(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

/** Les trois objectifs d'un jour : un booster, un de collection, un de duel. */
export function dailyObjectives(day: string, mexiqueOut = true): DailyObjective[] {
  const rng: Rng = mulberry32(hashString(`objectifs ${day}`));
  const collection = mexiqueOut ? [...COLLECTION, MEXIQUE] : COLLECTION;
  return [pick(rng, BOOSTERS), pick(rng, collection), pick(rng, DUELS)];
}

export function emptyDaily(day: string): DailyState {
  return { day, counts: { packs: 0, newSpecies: 0, rare: 0, mexique: 0, quickSold: 0, played: 0, won: 0 }, claimed: [], bonus: false };
}

/** L'état du jour : celui enregistré s'il est d'aujourd'hui, sinon une journée neuve. */
export function dailyFor(daily: DailyState | undefined, now: number): DailyState {
  const day = dayKey(now);
  return daily && daily.day === day ? daily : emptyDaily(day);
}

/** Progression d'un objectif : [fait, à faire]. */
export function dailyProgress(objective: DailyObjective, daily: DailyState): [number, number] {
  return [Math.min(objective.goal, daily.counts[objective.count]), objective.goal];
}

export function isDailyDone(objective: DailyObjective, daily: DailyState): boolean {
  return daily.counts[objective.count] >= objective.goal;
}
