import type { Athlete, CardFace, OwnedCard, RarityId } from './types';
import { ATHLETES_BY_ID } from '../data/athletes';
import { SPORTS } from '../data/sports';
import { milieuCourt } from '../data/milieux';
import { rarityOf } from './cards';
import { hashString, mulberry32 } from './random';

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
// - chaque enclos ouvre avec START_PLACES places, qu'on agrandit en payant jusqu'à MAX_PLACES ;
// - chaque niveau gagné rapporte une récompense (LEVEL_REWARDS), versée à la récolte ;
// - la billetterie s'agrandit (BILLETTERIE_STEPS : 8 h, 12 h, puis 24 h de visites) ;
// - les décors achetés (DECORS) ajoutent chacun un pourcentage de visiteurs à toute la réserve ;
// - chaque jour, trois demandes de visiteurs (dailyRequests) rapportent des crédits une fois remplies ;
// - un animal qui n'est pas dans un enclos peut partir en expédition (EXPEDITIONS) : il revient avec des crédits, et
//   parfois une carte ; pendant ce temps il ne peut être ni vendu, ni échangé.

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
  /** dernier niveau dont la récompense a été versée (1 : aucune) */
  levelPaid?: number;
  /** taille de la billetterie : rang dans BILLETTERIE_STEPS (0 : 8 h) */
  caisse?: number;
  /** décors achetés (identifiants de DECORS) */
  decor?: string[];
  /** demandes des visiteurs du jour, et celles déjà récompensées */
  requests?: { day: string; list: ReserveRequest[]; done: number[] };
  /** animaux partis en expédition */
  expeditions?: Expedition[];
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

/** Visiteurs par heure de toute la réserve, décors compris. `cardOf` retrouve une carte de la collection. */
export function reserveRate(state: ReserveState, cardOf: (uid: string) => CardFace | undefined): number {
  let total = 0;
  for (const enclos of Object.values(state.enclos)) {
    const cards = (enclos?.uids ?? []).map(cardOf).filter((c): c is CardFace => !!c);
    total += enclosVisitors(cards).reduce((a, b) => a + b, 0);
  }
  return Math.round(total * (1 + decorBonus(state)));
}

/** Les tailles de la billetterie : heures de visites qu'elle peut compter, et prix pour y passer. */
export const BILLETTERIE_STEPS: { hours: number; price: number }[] = [
  { hours: BILLETTERIE_HOURS, price: 0 },
  { hours: 12, price: 5_000 },
  { hours: 24, price: 15_000 },
];

/** Heures de visites que compte la billetterie de cette réserve. */
export function billetterieHours(state: ReserveState): number {
  return BILLETTERIE_STEPS[Math.min(state.caisse ?? 0, BILLETTERIE_STEPS.length - 1)].hours;
}

/**
 * Visiteurs à la billetterie à l'instant `now`, au rythme `rate` (par heure). Elle ne compte plus au-delà de sa
 * taille (billetterieHours), mais ne perd jamais ce qui était déjà compté.
 */
export function billetterie(state: ReserveState, rate: number, now: number): number {
  const hours = Math.max(0, now - state.since) / 3_600_000;
  const cap = rate * billetterieHours(state);
  return Math.floor(Math.max(state.pending, Math.min(cap, state.pending + rate * hours)));
}

/** La billetterie est-elle pleine ? */
export function billetterieFull(state: ReserveState, rate: number, now: number): boolean {
  return rate > 0 && billetterie(state, rate, now) >= Math.floor(rate * billetterieHours(state));
}

/** Les cartes installées dans la réserve (uid). */
export function reservedUids(state: ReserveState | undefined): Set<string> {
  const out = new Set<string>();
  for (const enclos of Object.values(state?.enclos ?? {})) for (const uid of enclos?.uids ?? []) out.add(uid);
  return out;
}

/** Les cartes occupées par la réserve : installées dans un enclos ou parties en expédition (ni vente, ni échange). */
export function busyUids(state: ReserveState | undefined): Set<string> {
  const out = reservedUids(state);
  for (const e of state?.expeditions ?? []) out.add(e.uid);
  return out;
}

// ───────────── Récompenses de niveau ─────────────

/** Ce que rapporte chaque niveau atteint (index : le niveau) : des crédits, et parfois des boosters gratuits. */
export const LEVEL_REWARDS: { credits: number; boosters: number }[] = [
  { credits: 0, boosters: 0 },
  { credits: 0, boosters: 0 },
  { credits: 500, boosters: 0 },
  { credits: 1_000, boosters: 1 },
  { credits: 2_000, boosters: 0 },
  { credits: 3_000, boosters: 1 },
  { credits: 5_000, boosters: 0 },
  { credits: 8_000, boosters: 2 },
  { credits: 12_000, boosters: 0 },
  { credits: 20_000, boosters: 2 },
  { credits: 30_000, boosters: 3 },
];

/** Récompenses dues entre le dernier niveau payé et le niveau atteint avec `visitors` visiteurs. */
export function levelRewardsDue(levelPaid: number, visitors: number): { level: number; credits: number; boosters: number } {
  const level = levelOf(visitors).level;
  let credits = 0;
  let boosters = 0;
  for (let l = levelPaid + 1; l <= level; l++) {
    credits += LEVEL_REWARDS[l]?.credits ?? 0;
    boosters += LEVEL_REWARDS[l]?.boosters ?? 0;
  }
  return { level, credits, boosters };
}

// ───────────── Décors ─────────────

export interface DecorDef {
  id: string;
  name: string;
  /** prix en crédits */
  price: number;
  /** visiteurs en plus dans toute la réserve (0.05 : +5 %) */
  bonus: number;
  /** niveau de la réserve à atteindre pour l'acheter */
  level: number;
}

/** Les décors de l'esplanade, dans l'ordre où on les débloque. */
export const DECORS: DecorDef[] = [
  { id: 'fontaine', name: 'Fontaine', price: 2_000, bonus: 0.05, level: 2 },
  { id: 'glaces', name: 'Kiosque à glaces', price: 4_000, bonus: 0.05, level: 3 },
  { id: 'piquenique', name: 'Aire de pique-nique', price: 7_000, bonus: 0.05, level: 4 },
  { id: 'jeux', name: 'Aire de jeux', price: 12_000, bonus: 0.05, level: 5 },
  { id: 'fleurs', name: 'Massifs de fleurs', price: 20_000, bonus: 0.05, level: 6 },
  { id: 'statue', name: 'Statue du lion', price: 35_000, bonus: 0.1, level: 8 },
];

export const DECORS_BY_ID = Object.fromEntries(DECORS.map((d) => [d.id, d])) as Record<string, DecorDef>;

/** Visiteurs en plus grâce aux décors achetés (0.15 : +15 %). */
export function decorBonus(state: ReserveState): number {
  return (state.decor ?? []).reduce((sum, id) => sum + (DECORS_BY_ID[id]?.bonus ?? 0), 0);
}

// ───────────── Demandes des visiteurs ─────────────

export type ReserveRequest =
  | { kind: 'famille'; sport: string; need: number; reward: number }
  | { kind: 'enclos'; enclos: EnclosId; need: number; reward: number }
  | { kind: 'rarete'; rarity: 'epique' | 'legendaire'; reward: number }
  | { kind: 'reverse'; reward: number }
  | { kind: 'taux'; need: number; reward: number };

export const REQUESTS_PER_DAY = 3;

/** Les cartes installées dans la réserve, avec leur espèce. */
function installed(state: ReserveState, cardOf: (uid: string) => CardFace | undefined): { card: CardFace; athlete: Athlete; enclos: EnclosId }[] {
  const out: { card: CardFace; athlete: Athlete; enclos: EnclosId }[] = [];
  for (const [id, enclos] of Object.entries(state.enclos) as [EnclosId, EnclosState | undefined][])
    for (const uid of enclos?.uids ?? []) {
      const card = cardOf(uid);
      const athlete = card && ATHLETES_BY_ID[card.athleteId];
      if (card && athlete) out.push({ card, athlete, enclos: id });
    }
  return out;
}

/** Texte d'une demande, comme le visiteur la formule. */
export function requestText(r: ReserveRequest): string {
  switch (r.kind) {
    case 'famille':
      return `Une famille aimerait voir ${r.need} animaux de la famille ${SPORTS[r.sport as keyof typeof SPORTS]?.name ?? r.sport} dans la réserve.`;
    case 'enclos':
      return `Une classe en sortie veut voir ${r.need} animaux dans l’enclos ${ENCLOS_BY_ID[r.enclos].name}.`;
    case 'rarete':
      return r.rarity === 'legendaire' ? 'Un photographe cherche un animal Légendaire dans la réserve.' : 'Un photographe cherche un animal Épique ou Légendaire dans la réserve.';
    case 'reverse':
      return 'Une collectionneuse rêve de voir une carte Reverse installée dans un enclos.';
    case 'taux':
      return `Le guide attend une grosse journée : ${r.need} visiteurs par heure.`;
  }
}

/** Où en est une demande : ce qu'il y a, ce qu'il faut. */
export function requestProgress(r: ReserveRequest, state: ReserveState, cardOf: (uid: string) => CardFace | undefined): { have: number; need: number } {
  const here = installed(state, cardOf);
  switch (r.kind) {
    case 'famille':
      return { have: here.filter((x) => x.athlete.sport === r.sport).length, need: r.need };
    case 'enclos':
      return { have: here.filter((x) => x.enclos === r.enclos).length, need: r.need };
    case 'rarete': {
      const min = r.rarity === 'legendaire' ? 4 : 3;
      return { have: here.some((x) => rarityOf(x.athlete).order >= min && rarityOf(x.athlete).id !== 'icone') ? 1 : 0, need: 1 };
    }
    case 'reverse':
      return { have: here.some((x) => x.card.variant === 'reverse') ? 1 : 0, need: 1 };
    case 'taux':
      return { have: reserveRate(state, cardOf), need: r.need };
  }
}

/**
 * Les demandes du jour `day`, tirées pour ce joueur : seulement des demandes qu'il peut remplir avec ses cartes et
 * ses enclos ouverts. `cards` : sa collection, sans les cartes parties en expédition.
 */
export function dailyRequests(day: string, state: ReserveState, cards: OwnedCard[], level: number): ReserveRequest[] {
  const rng = mulberry32(hashString(`reserve:${day}`));
  const open = new Set(Object.keys(state.enclos) as EnclosId[]);
  // les espèces que le joueur pourrait installer dans un enclos ouvert (une fois chacune)
  const species = new Map<string, { athlete: Athlete; enclos: EnclosId; reverse: boolean }>();
  for (const card of cards) {
    const athlete = ATHLETES_BY_ID[card.athleteId];
    const enclos = athlete && enclosFor(athlete);
    if (!athlete || !enclos || !open.has(enclos)) continue;
    const known = species.get(athlete.id);
    species.set(athlete.id, { athlete, enclos, reverse: (known?.reverse ?? false) || card.variant === 'reverse' });
  }
  const list = [...species.values()];
  const scale = 1 + (level - 1) * 0.25;
  const reward = (base: number) => Math.round((base * scale) / 50) * 50;
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rng() * xs.length)];
  const options: ReserveRequest[] = [];
  // une famille dont il a au moins deux espèces
  const bySport = new Map<string, number>();
  for (const s of list) bySport.set(s.athlete.sport, (bySport.get(s.athlete.sport) ?? 0) + 1);
  const sports = [...bySport.entries()].filter(([, n]) => n >= 2);
  if (sports.length) {
    const [sport, n] = pick(sports);
    options.push({ kind: 'famille', sport, need: Math.min(3, n), reward: reward(Math.min(3, n) * 250) });
  }
  // un enclos ouvert où il peut mettre au moins deux espèces
  const byEnclos = new Map<EnclosId, number>();
  for (const s of list) byEnclos.set(s.enclos, (byEnclos.get(s.enclos) ?? 0) + 1);
  const pens = [...byEnclos.entries()].filter(([id, n]) => n >= 2 && (state.enclos[id]?.places ?? 0) >= 2);
  if (pens.length) {
    const [enclos, n] = pick(pens);
    const need = Math.min(n, state.enclos[enclos]!.places, 4);
    options.push({ kind: 'enclos', enclos, need, reward: reward(need * 200) });
  }
  const best = Math.max(0, ...list.map((s) => (rarityOf(s.athlete).id === 'icone' ? 0 : rarityOf(s.athlete).order)));
  if (best >= 4) options.push({ kind: 'rarete', rarity: 'legendaire', reward: reward(900) });
  else if (best >= 3) options.push({ kind: 'rarete', rarity: 'epique', reward: reward(600) });
  if (list.some((s) => s.reverse)) options.push({ kind: 'reverse', reward: reward(700) });
  const rate = reserveRate(state, (uid) => cards.find((c) => c.uid === uid));
  options.push({ kind: 'taux', need: Math.max(20, Math.ceil((rate * 1.2 + 10) / 10) * 10), reward: reward(500) });
  // trois demandes différentes, dans un ordre tiré au hasard
  const out: ReserveRequest[] = [];
  while (out.length < REQUESTS_PER_DAY && options.length) out.push(options.splice(Math.floor(rng() * options.length), 1)[0]);
  return out;
}

// ───────────── Expéditions ─────────────

export interface ExpeditionDef {
  id: 'balade' | 'exploration' | 'grande';
  name: string;
  hours: number;
  /** chance de revenir avec une carte */
  cardChance: number;
}

export const EXPEDITIONS: ExpeditionDef[] = [
  { id: 'balade', name: 'Balade', hours: 1, cardChance: 0 },
  { id: 'exploration', name: 'Exploration', hours: 4, cardChance: 0.3 },
  { id: 'grande', name: 'Grande expédition', hours: 8, cardChance: 0.75 },
];

export const EXPEDITIONS_BY_ID = Object.fromEntries(EXPEDITIONS.map((e) => [e.id, e])) as Record<ExpeditionDef['id'], ExpeditionDef>;

/** Expéditions en même temps, au plus. */
export const MAX_EXPEDITIONS = 3;

export interface Expedition {
  uid: string;
  kind: ExpeditionDef['id'];
  start: number;
}

/** L'animal de cette carte peut-il partir en expédition ? (pas les Habitats ni les Icônes) */
export function canExplore(athlete: Athlete | undefined): boolean {
  return !!athlete && enclosFor(athlete) !== null;
}

/** Heure de retour d'une expédition. */
export function expeditionEnd(e: Expedition): number {
  return e.start + EXPEDITIONS_BY_ID[e.kind].hours * 3_600_000;
}

/** Crédits que rapporte une expédition : selon la rareté de l'animal et la durée. */
export function expeditionCredits(card: CardFace, kind: ExpeditionDef['id']): number {
  return Math.round(cardVisitors(card) * EXPEDITIONS_BY_ID[kind].hours * 3);
}

// ───────────── Réserve vue par les amis ─────────────

/** Ce que les amis voient de la réserve : niveau, visiteurs par heure, espèces de chaque enclos ouvert, décors. */
export interface ReserveSnapshot {
  level: number;
  rate: number;
  enclos: Partial<Record<EnclosId, string[]>>;
  decor: string[];
}

export function reserveSnapshot(state: ReserveState, cardOf: (uid: string) => CardFace | undefined): ReserveSnapshot {
  const enclos: Partial<Record<EnclosId, string[]>> = {};
  for (const [id, e] of Object.entries(state.enclos) as [EnclosId, EnclosState | undefined][])
    enclos[id] = (e?.uids ?? []).map((uid) => cardOf(uid)?.athleteId).filter((a): a is string => !!a && !!ATHLETES_BY_ID[a]);
  return { level: levelOf(state.visitors).level, rate: reserveRate(state, cardOf), enclos, decor: [...(state.decor ?? [])] };
}

/** Visiteurs qu'on envoie à un ami (le serveur fixe le même nombre, voir reserve_gift dans supabase/schema.sql). */
export const GIFT_VISITORS = 150;
