import type { CardFace } from './types';
import { ATHLETES_BY_ID } from '../data/athletes';
import { rarityOf } from './cards';
import { freePackOf, openPack } from './packs';
import { releasedSeries } from './series';
import { hashString, mulberry32, pick, type Rng } from './random';

// Pioche miracle : d'autres collectionneurs ouvrent des boosters gratuits (simulés). On voit les 5 cartes de l'un
// d'eux, elles se retournent et se mélangent, et on en pioche une au hasard, en dépensant de l'énergie miracle.
// L'énergie se recharge toute seule (comme les boosters gratuits) ; plus la meilleure carte du booster est rare, plus
// la pioche coûte cher. De temps en temps, une pioche est offerte (gratuite).
// Les boosters proposés ne dépendent que de l'heure : tous les joueurs voient les mêmes, et chacun ne peut piocher
// qu'une fois dans chacun.

/** Énergie miracle au plus. */
export const PIOCHE_MAX = 5;
/** Une énergie de plus toutes les 2 heures. */
export const PIOCHE_INTERVAL = 2 * 60 * 60_000;
/** Un nouveau booster ouvert par un autre collectionneur toutes les 30 minutes… */
export const OFFER_EVERY = 30 * 60_000;
/** … qui reste proposé 8 heures. */
export const OFFER_LIFETIME = 8 * 60 * 60_000;
/** Part des pioches offertes. */
const BONUS_CHANCE = 0.1;

export interface PiocheOffer {
  /** identifiant stable (le créneau de 30 minutes où le booster a été ouvert) */
  id: string;
  /** moment de l'ouverture */
  at: number;
  /** le collectionneur qui l'a ouvert */
  pseudo: string;
  serie: number;
  cards: CardFace[];
  /** énergie à dépenser (0 pour une pioche offerte) */
  cost: number;
  bonus: boolean;
}

// pseudos des collectionneurs : un animal et un petit mot, parfois un nombre
const NOMS = ['Loutre', 'Renard', 'Panda', 'Lynx', 'Koala', 'Harfang', 'Morse', 'Tigre', 'Axolotl', 'Pingouin', 'Narval', 'Hermine', 'Fennec', 'Caribou', 'Colibri', 'Okapi', 'Manchot', 'Phoque', 'Jaguar', 'Toucan', 'Lama', 'Gecko', 'Orque', 'Castor'];
const MOTS = ['Givré', 'Rusé', 'Câlin', 'Curieux', 'Agile', 'Rêveur', 'Sauvage', 'Malin', 'Polaire', 'Doré', 'Filou', 'Zen', 'Têtu', 'Futé', 'Brave', 'Timide'];

function pseudoOf(rng: Rng): string {
  const nom = pick(rng, NOMS);
  const mot = pick(rng, MOTS);
  const style = rng();
  if (style < 0.35) return `${nom}${mot}`;
  if (style < 0.7) return `${nom}_${mot}${Math.floor(rng() * 90 + 10)}`;
  return `${mot}${nom}${Math.floor(rng() * 9 + 1)}`;
}

/** Valeur d'une carte pour la pioche : sa rareté, une Prime compte comme une Légendaire, une Icône au-dessus. */
function rank(card: CardFace): number {
  const order = rarityOf(ATHLETES_BY_ID[card.athleteId]).order;
  return card.variant === 'prime' ? Math.max(order, 4) : order;
}

/** Énergie d'une pioche : 1 jusqu'aux Peu communes, 2 pour une Rare, 3 pour une Épique, 4 au-delà. */
export function piocheCost(cards: CardFace[]): number {
  const best = Math.max(...cards.map(rank));
  return best >= 4 ? 4 : best === 3 ? 3 : best === 2 ? 2 : 1;
}

/** La meilleure carte d'un booster (mise en avant sur la vignette). */
export function bestCard(cards: CardFace[]): CardFace {
  return cards.reduce((best, card) => (rank(card) > rank(best) ? card : best), cards[0]);
}

/** Le booster ouvert pendant un créneau de 30 minutes. */
function offerAt(slot: number): PiocheOffer {
  const rng = mulberry32(hashString(`pioche miracle ${slot}`));
  const at = slot * OFFER_EVERY + Math.floor(rng() * OFFER_EVERY);
  // un booster gratuit d'une des séries sorties à ce moment-là
  const series = releasedSeries(at);
  const serie = pick(rng, series).number;
  const pack = freePackOf(serie, at);
  // on partage plus volontiers ses beaux boosters : sur deux ouvertures, la meilleure est proposée
  const a = openPack(pack, rng);
  const b = openPack(pack, rng);
  const cards = rank(bestCard(b)) > rank(bestCard(a)) ? b : a;
  const pseudo = pseudoOf(rng);
  const bonus = rng() < BONUS_CHANCE;
  return { id: `p${slot}`, at, pseudo, serie, cards, bonus, cost: bonus ? 0 : piocheCost(cards) };
}

const cache = new Map<number, PiocheOffer>();

/** Les boosters proposés en ce moment, du plus récent au plus ancien. */
export function piocheOffers(now: number = Date.now()): PiocheOffer[] {
  const last = Math.floor(now / OFFER_EVERY);
  const out: PiocheOffer[] = [];
  for (let slot = last; slot > last - OFFER_LIFETIME / OFFER_EVERY - 1; slot--) {
    let offer = cache.get(slot);
    if (!offer) {
      offer = offerAt(slot);
      cache.set(slot, offer);
    }
    if (offer.at <= now && now - offer.at < OFFER_LIFETIME) out.push(offer);
  }
  return out;
}

/** Un booster encore proposé, d'après son identifiant. */
export function piocheOffer(id: string, now: number = Date.now()): PiocheOffer | undefined {
  return piocheOffers(now).find((offer) => offer.id === id);
}

export interface PiocheState {
  energy: number;
  /** prochaine énergie (quand la jauge n'est pas pleine) */
  nextAt: number;
  /** boosters où le joueur a déjà pioché (encore proposés) */
  used: string[];
}

export function emptyPioche(now: number): PiocheState {
  return { energy: PIOCHE_MAX, nextAt: now + PIOCHE_INTERVAL, used: [] };
}

/** Recharge l'énergie gagnée depuis la dernière fois et oublie les boosters qui ne sont plus proposés. */
export function rechargePioche(state: PiocheState, now: number): PiocheState {
  let { energy, nextAt } = state;
  if (energy >= PIOCHE_MAX) {
    if (nextAt < now) nextAt = now + PIOCHE_INTERVAL;
  } else if (now >= nextAt) {
    const earned = Math.floor((now - nextAt) / PIOCHE_INTERVAL) + 1;
    energy = Math.min(PIOCHE_MAX, energy + earned);
    nextAt = energy >= PIOCHE_MAX ? now + PIOCHE_INTERVAL : nextAt + earned * PIOCHE_INTERVAL;
  }
  const live = new Set(piocheOffers(now).map((offer) => offer.id));
  const used = state.used.filter((id) => live.has(id));
  if (energy === state.energy && nextAt === state.nextAt && used.length === state.used.length) return state;
  return { energy, nextAt, used };
}

/** Dépense l'énergie d'une pioche (la recharge repart si la jauge était pleine). */
export function spendPioche(state: PiocheState, offer: PiocheOffer, now: number): PiocheState {
  return {
    energy: state.energy - offer.cost,
    nextAt: state.energy >= PIOCHE_MAX ? now + PIOCHE_INTERVAL : state.nextAt,
    used: [...state.used, offer.id],
  };
}
