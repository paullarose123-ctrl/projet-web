import type { Athlete, BaseRarityId, CardFace, SportId, Variant } from './types';
import { ATHLETES, ATHLETES_BY_ID } from '../data/athletes';
import { SPORTS } from '../data/sports';
import {
  ICON_CHANCE,
  HABITAT_CHANCE,
  PRIME_CHANCE,
  RARITY_ORDER,
  REVERSE_CHANCE,
  canBePrime,
  canBeReverse,
  dropWeight,
  iconWeight,
  isIcon,
  habitatWeight,
  isHabitat,
  rarityOf,
  rarityScore,
} from './cards';
import { weightedPick, weightedPickCached, type Rng } from './random';
import { isCardReleased, isReleased, releasedSeries, serieOf } from './series';

/** Chances des cinq paliers d'espèces vivantes (les Icônes ont leur propre tirage). */
export type Odds = Record<BaseRarityId, number>;

export interface PackDef {
  id: string;
  name: string;
  tagline: string;
  price: number;
  size: number;
  odds: Odds;
  primeChance: number;
  /** dernière carte : rareté minimale garantie, ou version Prime garantie (un individu célèbre) */
  guaranteed?: { min: BaseRarityId; odds?: Partial<Odds>; prime?: boolean };
  filter?: (athlete: Athlete) => boolean;
  /**
   * série du booster gratuit (1 : Animaux du monde, 2 : Mexique) ; sans série, le pack mélange les cartes de toutes
   * les séries déjà sorties (les packs payants de la boutique)
   */
  serie?: number;
  /** couleur dominante de l'emballage (mexique : le sachet de la Série 2) */
  tone: 'bronze' | 'silver' | 'gold' | 'violet' | 'black' | 'icon' | 'prime' | 'sport' | 'mexique' | 'hiver';
  sport?: SportId;
}

/** La carte peut-elle sortir de ce booster ? (sa série, ou toutes les séries sorties, puis le filtre du pack) */
export function inPack(pack: PackDef, athlete: Athlete): boolean {
  const serieOk = pack.serie ? serieOf(athlete) === pack.serie : isCardReleased(athlete);
  return serieOk && (!pack.filter || pack.filter(athlete));
}

/** Clé des caches de tirage : le contenu d'un pack mélangé change le jour où une série sort. */
const cacheKey = (pack: PackDef) => `${pack.id}:${pack.serie ?? releasedSeries().length}`;

export const FREE_ODDS: Odds = { commune: 60, 'peu-commune': 26, rare: 10, epique: 3.2, legendaire: 0.8 };

export const FREE_PACK: PackDef = {
  id: 'gratuit',
  name: 'Booster gratuit',
  tagline: '5 cartes, un nouveau toutes les heures',
  price: 0,
  size: 5,
  odds: FREE_ODDS,
  primeChance: PRIME_CHANCE,
  serie: 1,
  tone: 'bronze',
};

export const SHOP_PACKS: PackDef[] = [
  {
    id: 'decouverte',
    name: 'Pack Découverte',
    tagline: '5 cartes, mêmes chances que le booster gratuit',
    price: 600,
    size: 5,
    odds: FREE_ODDS,
    primeChance: PRIME_CHANCE,
    tone: 'silver',
  },
  {
    id: 'pro',
    name: 'Pack Pro',
    tagline: '5 cartes dont 1 Rare ou mieux garantie',
    price: 2_500,
    size: 5,
    odds: { commune: 40, 'peu-commune': 32, rare: 19, epique: 7, legendaire: 2 },
    primeChance: PRIME_CHANCE,
    guaranteed: { min: 'rare', odds: { rare: 80, epique: 16, legendaire: 4 } },
    tone: 'gold',
  },
  {
    id: 'elite',
    name: 'Pack Élite',
    tagline: '5 cartes dont 1 Épique ou mieux garantie',
    price: 10_000,
    size: 5,
    odds: { commune: 10, 'peu-commune': 35, rare: 38, epique: 13, legendaire: 4 },
    primeChance: PRIME_CHANCE * 1.25,
    guaranteed: { min: 'epique', odds: { epique: 84, legendaire: 16 } },
    tone: 'violet',
  },
  {
    id: 'icones',
    name: 'Pack Icônes',
    tagline: '3 cartes de toutes les séries : une Rare ou mieux, une Légendaire ou une Prime, et une Icône garantie (lion de l’Atlas, thylacine, grizzli du Mexique…)',
    price: 600_000,
    size: 3,
    // trois cartes, chacune son tirage (voir openPack) : ICON_PACK_FIRST, puis Légendaire ou Prime, puis une Icône
    odds: { commune: 0, 'peu-commune': 0, rare: 0, epique: 0, legendaire: 0 },
    primeChance: 0,
    guaranteed: { min: 'legendaire' },
    tone: 'icon',
  },
  {
    id: 'prime',
    name: 'Pack Prime',
    tagline: '3 cartes dont 1 version Prime garantie : l’individu le plus célèbre d’une espèce vedette',
    price: 250_000,
    size: 3,
    odds: { commune: 10, 'peu-commune': 35, rare: 40, epique: 12, legendaire: 3 },
    primeChance: PRIME_CHANCE,
    guaranteed: { min: 'rare', prime: true },
    tone: 'prime',
  },
  {
    id: 'legende',
    name: 'Pack Légende',
    tagline: '3 cartes dont 1 Légendaire garantie',
    price: 90_000,
    size: 3,
    odds: { commune: 0, 'peu-commune': 30, rare: 50, epique: 17, legendaire: 3 },
    primeChance: PRIME_CHANCE,
    guaranteed: { min: 'legendaire', odds: { legendaire: 100 } },
    tone: 'black',
  },
];

// ───────────── Séries suivantes ─────────────

/** Booster gratuit de la Série 2 (Mexique), dès sa sortie : mêmes chances que celui de la Série 1. */
export const FREE_PACK_MEXIQUE: PackDef = {
  ...FREE_PACK,
  id: 'gratuit-mexique',
  serie: 2,
  tone: 'mexique',
};

/** Booster gratuit de la Série 3 (Hiver), dès sa sortie : mêmes chances aussi. */
export const FREE_PACK_HIVER: PackDef = {
  ...FREE_PACK,
  id: 'gratuit-hiver',
  serie: 3,
  tone: 'hiver',
};

/** Le booster gratuit de chaque série. */
const FREE_PACKS: PackDef[] = [FREE_PACK, FREE_PACK_MEXIQUE, FREE_PACK_HIVER];

/** Les boosters gratuits proposés sur l'accueil : celui de chaque série déjà sortie (une seule réserve pour tous). */
export function freePackChoices(now: number = Date.now()): PackDef[] {
  return FREE_PACKS.filter((pack) => isReleased(pack.serie ?? 1, now));
}

/** Le booster gratuit d'une série (celui de la Série 1 si elle n'est pas encore sortie). */
export function freePackOf(serie: number, now: number = Date.now()): PackDef {
  return FREE_PACKS.find((pack) => pack.serie === serie && isReleased(serie, now)) ?? FREE_PACK;
}

/** Booster gratuit d'après son identifiant. */
export function freePackById(id: string): PackDef | undefined {
  return FREE_PACKS.find((pack) => pack.id === id);
}

/** Pack d'une seule famille : 3 cartes, jamais deux fois la même espèce (certaines familles sont petites). */
export function sportPack(sport: SportId, sportName: string): PackDef {
  return {
    id: `sport-${sport}`,
    name: `Pack ${sportName}`,
    tagline: `3 cartes, uniquement ${SPORTS[sport].group}`,
    price: 4_000,
    size: 3,
    odds: { commune: 50, 'peu-commune': 30, rare: 14, epique: 4.8, legendaire: 1.2 },
    primeChance: PRIME_CHANCE,
    filter: (athlete) => athlete.sport === sport,
    tone: 'sport',
    sport,
  };
}

type Pool = Record<BaseRarityId, Athlete[]>;

const poolCache = new Map<string, Pool>();

/** Boosters gratuits d'avance, au plus : le compteur horaire s'arrête là, et les cadeaux ne vont pas au-delà. */
export const MAX_FREE_PACKS = 5;

/** Crédits versés pour un booster gratuit qui ne tient plus dans la réserve : le prix du Pack Découverte (mêmes chances). */
export const FREE_PACK_CREDITS = 600;

/**
 * Ajoute `gained` boosters gratuits (récompense de ligue, de réserve…) à une réserve qui en a `current`, sans dépasser
 * `max`. Ceux qui ne tiennent pas sont payés en crédits (FREE_PACK_CREDITS chacun) : rien n'est perdu. Avec
 * `gained = 0`, ramène sous le plafond une réserve qui l'avait dépassé (anciennes sauvegardes).
 */
export function addFreePacks(current: number, gained: number, max: number = MAX_FREE_PACKS): { freePacks: number; overflow: number; credits: number } {
  const total = Math.max(0, current) + Math.max(0, gained);
  const freePacks = Math.min(max, total);
  const overflow = total - freePacks;
  return { freePacks, overflow, credits: overflow * FREE_PACK_CREDITS };
}

/** Pack Icônes : trois cartes de toutes les séries sorties, de plus en plus rares, la dernière une Icône. */
export function isIconPack(pack: PackDef): boolean {
  return pack.tone === 'icon';
}

/** Pack Icônes, 1re carte : une Rare ou mieux. */
export const ICON_PACK_FIRST: Partial<Odds> = { rare: 80, epique: 16, legendaire: 4 };
/** Pack Icônes, 2e carte : une Légendaire, ou (une fois sur quatre) une Prime, encore plus rare. */
export const ICON_PACK_PRIME_CHANCE = 0.25;

function poolFor(pack: PackDef): Pool {
  const cached = poolCache.get(cacheKey(pack));
  if (cached) return cached;
  const pool: Pool = { commune: [], 'peu-commune': [], rare: [], epique: [], legendaire: [] };
  for (const athlete of ATHLETES) {
    // les Habitats et les Icônes ont leur propre tirage (voir drawCard et drawIcon)
    if (isHabitat(athlete) || isIcon(athlete)) continue;
    if (inPack(pack, athlete)) pool[rarityOf(athlete).id as BaseRarityId].push(athlete);
  }
  poolCache.set(cacheKey(pack), pool);
  return pool;
}

/** Icônes qui peuvent sortir de ce booster (toutes celles de sa famille, ou toutes pour le Pack Icônes). */
export function iconPool(pack: PackDef): Athlete[] {
  return ATHLETES.filter((athlete) => isIcon(athlete) && !isHabitat(athlete) && inPack(pack, athlete));
}

/**
 * Part des cartes d'une série dans un pack (affichée en boutique) : d'après les chances de chaque rareté et le poids
 * des espèces de la série dans chacune. Les Icônes et les Prime garanties ne changent presque rien : on les ignore.
 */
export function serieOdds(pack: PackDef, serie: number): number {
  const pool = poolFor(pack);
  // part d'une série parmi des cartes tirées au poids
  const share = (cards: Athlete[], weight: (athlete: Athlete) => number) => {
    const all = cards.reduce((w, athlete) => w + weight(athlete), 0);
    const mine = cards.filter((athlete) => serieOf(athlete) === serie).reduce((w, athlete) => w + weight(athlete), 0);
    return all ? mine / all : 0;
  };
  const byRarity = (odds: Partial<Odds>) => {
    const total = RARITY_ORDER.reduce((sum, id) => sum + (pool[id].length ? (odds[id] ?? 0) : 0), 0);
    if (!total) return 0;
    return RARITY_ORDER.reduce((sum, id) => (pool[id].length ? sum + ((odds[id] ?? 0) / total) * share(pool[id], dropWeight) : sum), 0);
  };
  // Pack Icônes : la moyenne de ses trois cartes
  if (isIconPack(pack)) {
    const second = (1 - ICON_PACK_PRIME_CHANCE) * byRarity({ legendaire: 1 }) + ICON_PACK_PRIME_CHANCE * share(primePool(pack), primeWeight);
    return (byRarity(ICON_PACK_FIRST) + second + share(iconPool(pack), iconWeight)) / 3;
  }
  return byRarity(pack.odds);
}

/** Probabilité qu'une carte ordinaire du booster soit une Icône (affichée en boutique ; 1 pour les packs d'Icônes). */
export function iconOdds(pack: PackDef): number {
  if (isIconPack(pack)) return 1;
  return iconPool(pack).length ? ICON_CHANCE : 0;
}

/**
 * Tire la rareté d'une carte. Une rareté dont toutes les espèces sont déjà dans le booster (`taken`) est écartée :
 * dans une petite famille (un seul canidé commun), la carte suivante sort dans une autre rareté plutôt qu'en double.
 */
function rollRarity(rng: Rng, odds: Partial<Odds>, pool: Pool, taken: ReadonlySet<string> = new Set()): BaseRarityId {
  const available = RARITY_ORDER.filter((id) => (odds[id] ?? 0) > 0 && pool[id].length > 0);
  if (available.length === 0) {
    // repli : la rareté disponible la plus proche
    return RARITY_ORDER.find((id) => pool[id].length > 0) ?? 'commune';
  }
  const open = taken.size ? available.filter((id) => pool[id].some((athlete) => !taken.has(athlete.id))) : available;
  return weightedPick(rng, open.length ? open : available, (id) => odds[id] ?? 0);
}

function cardOf(athlete: Athlete, variant: Variant): CardFace {
  return { athleteId: athlete.id, variant };
}

/** Habitats (grands lieux de la planète) qui peuvent sortir dans ce booster. */
export function habitatPool(pack: PackDef): Athlete[] {
  return ATHLETES.filter((athlete) => isHabitat(athlete) && inPack(pack, athlete));
}

/** Probabilité qu'une carte ordinaire du booster soit un Habitat (affichée en boutique). */
export function habitatOdds(pack: PackDef): number {
  return habitatPool(pack).length ? HABITAT_CHANCE : 0;
}

/** Nombre de boosters sur lesquels une même espèce ne peut pas ressortir. */
export const NO_DUPE_WINDOW = 7;

/**
 * Tire une espèce en écartant celles déjà sorties récemment (`avoid`) et celles du booster en cours (`taken`).
 * Si la rareté tirée n'a plus d'espèce disponible (petit pack de famille), on relâche d'abord la fenêtre des
 * boosters précédents. Le booster en cours ne se relâche qu'en dernier recours, pour la carte garantie : les
 * cartes ordinaires changent de rareté avant d'en arriver là (rollRarity).
 */
function pickFresh(rng: Rng, candidates: Athlete[], weight: (athlete: Athlete) => number, avoid: ReadonlySet<string>, taken: ReadonlySet<string>): Athlete {
  if (!avoid.size && !taken.size) return weightedPickCached(rng, candidates, weight);
  const fresh = candidates.filter((athlete) => !avoid.has(athlete.id) && !taken.has(athlete.id));
  if (fresh.length) return weightedPick(rng, fresh, weight);
  const notInPack = candidates.filter((athlete) => !taken.has(athlete.id));
  if (notInPack.length) return weightedPick(rng, notInPack, weight);
  return weightedPickCached(rng, candidates, weight);
}

function drawCard(
  rng: Rng,
  pack: PackDef,
  odds: Partial<Odds>,
  pool: Pool,
  allowHabitat = true,
  avoid: ReadonlySet<string> = new Set(),
  taken: ReadonlySet<string> = new Set(),
): CardFace {
  // (un Habitat ou une Icône déjà dans le booster ne ressort pas : la carte redevient un animal ordinaire)
  if (allowHabitat && rng() < HABITAT_CHANCE) {
    const habitats = habitatPool(pack).filter((habitat) => !taken.has(habitat.id));
    if (habitats.length) return cardOf(pickFresh(rng, habitats, habitatWeight, avoid, taken), 'base');
  }
  let athlete: Athlete | null = null;
  // une Icône, très rarement, à la place d'une carte ordinaire (jamais à la place de la carte garantie)
  if (allowHabitat && rng() < ICON_CHANCE) {
    const icons = iconPool(pack).filter((icon) => !taken.has(icon.id));
    if (icons.length) return cardOf(pickFresh(rng, icons, iconWeight, avoid, taken), 'base');
  }
  athlete ??= pickFresh(rng, pool[rollRarity(rng, odds, pool, taken)], dropWeight, avoid, taken);
  if (canBePrime(athlete) && rng() < pack.primeChance) return cardOf(athlete, 'prime');
  return cardOf(athlete, canBeReverse(athlete) && rng() < REVERSE_CHANCE ? 'reverse' : 'base');
}

/** Une Icône, tirée selon sa célébrité (les plus célèbres sortent le plus rarement), jamais en Reverse ni en Prime. */
function drawIcon(rng: Rng, pack: PackDef, avoid: ReadonlySet<string>, taken: ReadonlySet<string>): CardFace {
  const icons = iconPool(pack).filter((icon) => !taken.has(icon.id));
  return cardOf(pickFresh(rng, icons.length ? icons : iconPool(pack), iconWeight, avoid, taken), 'base');
}

/** Probabilité qu'une carte ordinaire du booster sorte en version Reverse (affichée en boutique) : Rares et au-dessus. */
export function reverseOdds(pack: PackDef): number {
  const pool = poolFor(pack);
  const available = RARITY_ORDER.filter((id) => pack.odds[id] > 0 && pool[id].length > 0);
  const total = available.reduce((sum, id) => sum + pack.odds[id], 0);
  let share = 0;
  for (const id of available) {
    if (!canBeReverse(pool[id][0])) continue;
    const all = pool[id].reduce((sum, athlete) => sum + dropWeight(athlete), 0);
    const prime = pool[id].filter(canBePrime).reduce((sum, athlete) => sum + dropWeight(athlete), 0) * pack.primeChance;
    share += (pack.odds[id] / total) * (1 - prime / all);
  }
  return share * REVERSE_CHANCE;
}

const primePools = new Map<string, Athlete[]>();

/** Espèces vedettes qui peuvent sortir en Prime dans ce booster. */
export function primePool(pack: PackDef): Athlete[] {
  let pool = primePools.get(cacheKey(pack));
  if (!pool) {
    pool = ATHLETES.filter((athlete) => canBePrime(athlete) && inPack(pack, athlete));
    primePools.set(cacheKey(pack), pool);
  }
  return pool;
}

/**
 * Poids de tirage de la Prime garantie : les individus des espèces vedettes (Épiques et Légendaires : Elsa la
 * lionne, Knut, Keiko, Sue le T. rex…) sortent bien plus souvent que ceux des espèces communes (Dolly, les chiens).
 */
export function primeWeight(athlete: Athlete): number {
  return [1, 1.5, 3, 4, 4, 4][rarityOf(athlete).order];
}

/** Probabilité qu'une carte ordinaire du booster sorte en version Prime (affichée en boutique). */
export function primeOdds(pack: PackDef): number {
  const pool = poolFor(pack);
  const available = RARITY_ORDER.filter((id) => pack.odds[id] > 0 && pool[id].length > 0);
  const total = available.reduce((sum, id) => sum + pack.odds[id], 0);
  let share = 0;
  for (const id of available) {
    const all = pool[id].reduce((sum, athlete) => sum + dropWeight(athlete), 0);
    const eligible = pool[id].filter(canBePrime).reduce((sum, athlete) => sum + dropWeight(athlete), 0);
    share += (pack.odds[id] / total) * (eligible / all);
  }
  return share * pack.primeChance;
}

/**
 * Ouvre un booster. Les cartes sont renvoyées de la moins rare à la plus rare (suspense garanti).
 * Jamais deux fois la même espèce dans un booster, ni une espèce listée dans `avoid`
 * (celles des NO_DUPE_WINDOW derniers boosters ouverts, tenues à jour par le magasin du jeu).
 */
export function openPack(pack: PackDef, rng: Rng, avoid: ReadonlySet<string> = new Set()): CardFace[] {
  const pool = poolFor(pack);
  const cards: CardFace[] = [];
  const taken = new Set<string>();
  for (let i = 0; i < pack.size; i++) {
    const isLast = i === pack.size - 1;
    let card: CardFace;
    if (isIconPack(pack)) {
      // une Rare ou mieux, puis une Légendaire ou une Prime, puis une Icône
      if (i === 0) card = drawCard(rng, pack, ICON_PACK_FIRST, pool, false, avoid, taken);
      else if (i === 1 && rng() < ICON_PACK_PRIME_CHANCE) card = cardOf(pickFresh(rng, primePool(pack), primeWeight, avoid, taken), 'prime');
      else if (i === 1) card = drawCard(rng, pack, { legendaire: 1 }, pool, false, avoid, taken);
      else card = drawIcon(rng, pack, avoid, taken);
    } else if (isLast && pack.guaranteed?.prime) {
      card = cardOf(pickFresh(rng, primePool(pack), primeWeight, avoid, taken), 'prime');
    } else if (isLast && pack.guaranteed) {
      // la carte garantie reste un animal de la rareté promise
      card = drawCard(rng, pack, pack.guaranteed.odds ?? { [pack.guaranteed.min]: 1 }, pool, false, avoid, taken);
    } else {
      card = drawCard(rng, pack, pack.odds, pool, true, avoid, taken);
    }
    taken.add(card.athleteId);
    cards.push(card);
  }
  // le Pack Icônes se révèle dans l'ordre de ses cartes : l'Icône toujours en dernier, même après une Prime
  return isIconPack(pack) ? cards : sortByRarity(cards);
}

export function cardRank(card: CardFace): number {
  const athlete = ATHLETES_BY_ID[card.athleteId];
  // une Prime est toujours révélée en dernier, quelle que soit la rareté de son espèce
  return (card.variant === 'prime' ? 100 : 0) + rarityOf(athlete).order * 10 + (card.variant === 'reverse' ? 2 : 0) + rarityScore(athlete) / 100;
}

export function sortByRarity(cards: CardFace[]): CardFace[] {
  return cards.slice().sort((a, b) => cardRank(a) - cardRank(b));
}

export function allPacks(): PackDef[] {
  return [...FREE_PACKS, ...SHOP_PACKS];
}
