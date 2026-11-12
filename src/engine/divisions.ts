// Les divisions de la Ligue des naturalistes : de la 14 (débutants) à la 1 (élite), chacune porte le nom d'un animal
// et d'un métal, du « Hérisson de bronze » à la « Baleine bleue mythique ». L'emblème de l'animal orne le médaillon.
// Avant la version 22 de la sauvegarde, la ligue n'avait que 10 divisions (du Hérisson au Lion) : les numéros ont été
// décalés de 4 pour ajouter le Requin de diamant, le rubis et la Baleine bleue mythique au-dessus du Tigre.

export type DivisionTier = 'bronze' | 'argent' | 'or' | 'platine' | 'diamant' | 'rubis' | 'legende' | 'mythique';

/** Nombre de divisions : la plus basse porte ce numéro, l'élite le numéro 1. */
export const DIVISION_COUNT = 14;
/** Numéro de la plus haute division (pas de promotion au-dessus : on y gagne des étoiles). */
export const TOP_DIVISION = 1;

export interface DivisionInfo {
  /** numéro interne, 10 → 1 */
  number: number;
  /** nom complet : « Gorille d'argent » */
  name: string;
  /** espèce de l'emblème */
  athleteId: string;
  tier: DivisionTier;
}

const DIVISIONS: DivisionInfo[] = [
  { number: 14, name: 'Hérisson de bronze', athleteId: 'herisson', tier: 'bronze' },
  { number: 13, name: 'Renard de bronze', athleteId: 'renard-roux', tier: 'bronze' },
  { number: 12, name: 'Loup d’argent', athleteId: 'loup', tier: 'argent' },
  { number: 11, name: 'Gorille d’argent', athleteId: 'gorille', tier: 'argent' },
  { number: 10, name: 'Guépard d’or', athleteId: 'guepard', tier: 'or' },
  { number: 9, name: 'Aigle d’or', athleteId: 'aigle-royal', tier: 'or' },
  { number: 8, name: 'Ours de platine', athleteId: 'ours-polaire', tier: 'platine' },
  { number: 7, name: 'Orque de platine', athleteId: 'orque', tier: 'platine' },
  { number: 6, name: 'Tigre de diamant', athleteId: 'tigre', tier: 'diamant' },
  { number: 5, name: 'Requin de diamant', athleteId: 'requin-blanc', tier: 'diamant' },
  { number: 4, name: 'Éléphant de rubis', athleteId: 'elephant', tier: 'rubis' },
  { number: 3, name: 'Crocodile de rubis', athleteId: 'crocodile-du-nil', tier: 'rubis' },
  { number: 2, name: 'Lion légendaire', athleteId: 'lion', tier: 'legende' },
  { number: 1, name: 'Baleine bleue mythique', athleteId: 'baleine-bleue', tier: 'mythique' },
];

/** Les numéros des divisions, de la plus basse à l'élite (14 → 1). */
export const DIVISION_NUMBERS = DIVISIONS.map((d) => d.number);

export const TIER_NAMES: Record<DivisionTier, string> = {
  bronze: 'Bronze',
  argent: 'Argent',
  or: 'Or',
  platine: 'Platine',
  diamant: 'Diamant',
  rubis: 'Rubis',
  legende: 'Légende',
  mythique: 'Mythique',
};

/** La division d'après son numéro (14 = la plus basse, 1 = l'élite). */
export function divisionInfo(number: number): DivisionInfo {
  return DIVISIONS.find((d) => d.number === number) ?? DIVISIONS[0];
}

/** « division Gorille d'argent » */
export function divisionName(number: number): string {
  return divisionInfo(number).name;
}
