import type { Athlete, CardFace, RarityId } from './types';
import { ATHLETES_BY_ID } from '../data/athletes';
import { milieuCourt } from '../data/milieux';
import { rarityOf } from './cards';

// Ma Réserve : le joueur installe ses animaux dans des enclos, un par milieu de vie, et ils attirent des visiteurs.
// Chaque visiteur paie son ticket (1 crédit) à la billetterie, qui se remplit même hors connexion jusqu'à
// BILLETTERIE_HOURS heures de visites ; le joueur vient la récolter. Les visiteurs récoltés font monter la réserve
// de niveau.
//
// Règles :
// - une seule carte par espèce dans toute la réserve, et seulement dans l'enclos de son milieu (milieuCourt), sans
//   exception ; les animaux domestiques (famille Ferme & compagnie) et ceux qui vivent « partout » avec l'homme (rat,
//   moineau, fourmi…) vont à la Ferme ;
// - les Habitats (cartes de paysage) et les Icônes (espèces disparues) n'y entrent pas ;
// - une carte installée ne peut être ni vendue, ni mise au marché, ni échangée (il faut d'abord la retirer) ;
// - visiteurs par heure selon la rareté, +50 % pour une carte Reverse ou Prime, +20 % pour chaque animal d'une
//   famille représentée par au moins GROUP_SIZE animaux dans le même enclos ;
// - chaque enclos ouvre avec START_PLACES places, qu'on agrandit en payant jusqu'à MAX_PLACES.

/** La Réserve est ouverte à tous (ce drapeau permet de la refermer, ou de la réserver à l'aperçu). */
export function reserveEnabled(): boolean {
  return true;
}

export type EnclosId = 'foret' | 'savane' | 'ferme' | 'marais' | 'banquise' | 'jungle' | 'aquarium' | 'montagne';

export interface EnclosDef {
  id: EnclosId;
  name: string;
  /** milieux du jeu (milieuCourt) qui y vivent */
  milieux: string[];
  /** prix pour l'ouvrir (0 : ouvert dès le départ) */
  price: number;
}

/** Les enclos, dans l'ordre où on les débloque. */
export const ENCLOS: EnclosDef[] = [
  { id: 'foret', name: 'Forêt', milieux: ['Forêt'], price: 0 },
  { id: 'savane', name: 'Savane', milieux: ['Savane', 'Prairie', 'Désert'], price: 0 },
  { id: 'ferme', name: 'Ferme', milieux: ['Campagne', 'Ville', 'Partout'], price: 1_000 },
  { id: 'marais', name: 'Marais', milieux: ['Marais', 'Rivières'], price: 1_500 },
  { id: 'banquise', name: 'Banquise', milieux: ['Glaces'], price: 2_500 },
  { id: 'jungle', name: 'Jungle', milieux: ['Jungle', 'Îles'], price: 4_000 },
  { id: 'aquarium', name: 'Aquarium', milieux: ['Océan', 'Récif', 'Abysses', 'Côtes'], price: 6_000 },
  { id: 'montagne', name: 'Montagne', milieux: ['Montagne'], price: 10_000 },
];

export const ENCLOS_BY_ID = Object.fromEntries(ENCLOS.map((e) => [e.id, e])) as Record<EnclosId, EnclosDef>;

/** Les animaux qui vivent sous terre rejoignent l'enclos de leur région. */
const SOUS_TERRE: Record<string, EnclosId> = {
  taupe: 'foret',
  'rat-taupe-nu': 'savane',
  vampire: 'jungle',
  cecilie: 'jungle',
  protee: 'marais',
  'tetra-aveugle': 'marais',
};

/** Familles qui vivent dans l'eau de mer. */
const MARINS: string[] = ['marins', 'requins', 'poissons', 'invertebres'];


export const START_PLACES = 3;
export const MAX_PLACES = 5;
export const BILLETTERIE_HOURS = 8;
export const GROUP_SIZE = 3;
const GROUP_BONUS = 0.2;
const VARIANT_BONUS = 0.5;

/** Visiteurs par heure selon la rareté de l'espèce. */
export const VISITORS: Record<Exclude<RarityId, 'icone'>, number> = {
  commune: 5,
  'peu-commune': 8,
  rare: 12,
  epique: 20,
  legendaire: 30,
};

/** Prix de la place suivante d'un enclos qui en a `places` (500, puis 1 000). */
export function placePrice(places: number): number {
  return 500 * 2 ** (places - START_PLACES);
}

/** Visiteurs récoltés à atteindre pour chaque niveau de la réserve (niveau 1 au départ). */
export const LEVELS = [0, 500, 1_500, 4_000, 9_000, 18_000, 35_000, 60_000, 100_000, 160_000];

export function levelOf(visitors: number): { level: number; from: number; to: number | null } {
  let level = 1;
  for (let i = 1; i < LEVELS.length; i++) if (visitors >= LEVELS[i]) level = i + 1;
  return { level, from: LEVELS[level - 1], to: LEVELS[level] ?? null };
}

/** Un enclos ouvert : ses places et les cartes installées (uid). */
export interface EnclosState {
  places: number;
  uids: string[];
}

export interface ReserveState {
  enclos: Partial<Record<EnclosId, EnclosState>>;
  /** visiteurs déjà comptés à la billetterie, en attente d'être récoltés */
  pending: number;
  /** depuis quand la billetterie compte au rythme actuel */
  since: number;
  /** total des visiteurs récoltés (niveau de la réserve) */
  visitors: number;
}

export function emptyReserve(now: number): ReserveState {
  return {
    enclos: Object.fromEntries(ENCLOS.filter((e) => e.price === 0).map((e) => [e.id, { places: START_PLACES, uids: [] }])),
    pending: 0,
    since: now,
    visitors: 0,
  };
}

/** L'espèce peut-elle vivre dans la réserve, et dans quel enclos ? (null : nulle part) */
export function enclosFor(athlete: Athlete): EnclosId | null {
  if (athlete.habitat || rarityOf(athlete).id === 'icone') return null;
  if (athlete.sport === 'ferme') return 'ferme';
  const milieu = milieuCourt(athlete);
  if (milieu === 'Sous terre') return SOUS_TERRE[athlete.id.replace(/^mx-/, '')] ?? 'foret';
  // sur les côtes, les oiseaux et les autres animaux de rivage vont au marais ; les animaux marins à l'aquarium
  if (milieu === 'Côtes') return MARINS.includes(athlete.sport) ? 'aquarium' : 'marais';
  return ENCLOS.find((e) => e.milieux.includes(milieu))?.id ?? null;
}

/** L'espèce vit-elle dans le milieu de cet enclos ? (un seul enclos possible par espèce) */
export function canLiveIn(athlete: Athlete, enclos: EnclosId): boolean {
  return enclosFor(athlete) === enclos;
}

/** Visiteurs par heure d'une carte seule (sans le bonus de groupe). */
export function cardVisitors(card: CardFace): number {
  const athlete = ATHLETES_BY_ID[card.athleteId];
  if (!athlete) return 0;
  const rarity = rarityOf(athlete).id;
  if (rarity === 'icone') return 0;
  return VISITORS[rarity] * (card.variant === 'base' ? 1 : 1 + VARIANT_BONUS);
}

/** Visiteurs par heure de chaque carte d'un enclos, bonus de groupe compris. */
export function enclosVisitors(cards: CardFace[]): number[] {
  const families: Record<string, number> = {};
  for (const card of cards) {
    const family = ATHLETES_BY_ID[card.athleteId]?.sport;
    if (family) families[family] = (families[family] ?? 0) + 1;
  }
  return cards.map((card) => {
    const family = ATHLETES_BY_ID[card.athleteId]?.sport;
    const bonus = family && families[family] >= GROUP_SIZE ? 1 + GROUP_BONUS : 1;
    return Math.round(cardVisitors(card) * bonus);
  });
}

/** Visiteurs par heure de toute la réserve. `cardOf` retrouve une carte de la collection (undefined : disparue). */
export function reserveRate(state: ReserveState, cardOf: (uid: string) => CardFace | undefined): number {
  let total = 0;
  for (const enclos of Object.values(state.enclos)) {
    const cards = (enclos?.uids ?? []).map(cardOf).filter((c): c is CardFace => !!c);
    total += enclosVisitors(cards).reduce((a, b) => a + b, 0);
  }
  return total;
}

/**
 * Visiteurs à la billetterie à l'instant `now`, au rythme `rate` (par heure). Elle ne compte plus au-delà de
 * BILLETTERIE_HOURS heures de visites, mais ne perd jamais ce qui était déjà compté.
 */
export function billetterie(state: ReserveState, rate: number, now: number): number {
  const hours = Math.max(0, now - state.since) / 3_600_000;
  const cap = rate * BILLETTERIE_HOURS;
  return Math.floor(Math.max(state.pending, Math.min(cap, state.pending + rate * hours)));
}

/** La billetterie est-elle pleine ? */
export function billetterieFull(state: ReserveState, rate: number, now: number): boolean {
  return rate > 0 && billetterie(state, rate, now) >= Math.floor(rate * BILLETTERIE_HOURS);
}

/** Les cartes installées dans la réserve (uid). */
export function reservedUids(state: ReserveState | undefined): Set<string> {
  const out = new Set<string>();
  for (const enclos of Object.values(state?.enclos ?? {})) for (const uid of enclos?.uids ?? []) out.add(uid);
  return out;
}
