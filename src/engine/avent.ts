import { FREE_ODDS, FREE_PACK_HIVER, SHOP_PACKS, sportPack, type PackDef } from './packs';
import { SPORTS } from '../data/sports';
import type { BaseRarityId, SportId } from './types';
import { earlyAccess } from './series';

// Calendrier de l'Avent, sur l'accueil du 1er au 24 décembre (heure du joueur) : une case par jour, chacune avec son
// cadeau. Seule la case du jour s'ouvre : une case oubliée reste fermée. Les cadeaux montent jusqu'au réveillon :
// crédits, boosters gratuits, énergie de la pioche miracle, packs de la boutique (ouverts aussitôt), cartes de
// l'Hiver garanties, et le Pack Icônes le 24.

export const AVENT_DAYS = 24;

export type AventReward =
  | { kind: 'credits'; amount: number }
  /** boosters gratuits ajoutés à la réserve (au-delà de la limite : des crédits) */
  | { kind: 'boosters'; count: number }
  /** la jauge de la pioche miracle remplie */
  | { kind: 'energie' }
  /** un pack ouvert aussitôt */
  | { kind: 'pack'; pack: PackDef };

export interface AventDay {
  day: number;
  /** le cadeau, en toutes lettres */
  title: string;
  /** le cadeau en quelques mots, dans la case ouverte (sinon tiré du cadeau lui-même) */
  short?: string;
  /** un mot de la fête du jour */
  note?: string;
  reward: AventReward;
}

/** Cases ouvertes cette année (une partie qui date d'une autre année repart d'un calendrier fermé). */
export interface AventState {
  year: number;
  opened: number[];
}

export const EMPTY_AVENT: AventState = { year: 0, opened: [] };

/** Énergie déjà pleine le jour où le calendrier la remplit : ces crédits à la place. */
export const AVENT_ENERGY_CREDITS = 3_000;

const shop = (id: string): AventReward => ({ kind: 'pack', pack: SHOP_PACKS.find((pack) => pack.id === id)! });
const family = (sport: SportId): AventReward => ({ kind: 'pack', pack: sportPack(sport, SPORTS[sport].name) });

/** Une carte de l'Hiver garantie : un « pack » d'une seule carte, de la rareté promise (ou une Prime). */
function hiverCard(id: string, min: BaseRarityId, prime = false): AventReward {
  return {
    kind: 'pack',
    pack: {
      id: `avent-${id}`,
      name: 'Cadeau de l’Avent',
      tagline: 'Une carte de l’Hiver garantie',
      price: 0,
      size: 1,
      odds: FREE_ODDS,
      primeChance: 0,
      guaranteed: prime ? { min, prime: true } : { min, odds: { [min]: 1 } },
      serie: 3,
      tone: 'hiver',
    },
  };
}

export const AVENT: AventDay[] = [
  { day: 1, title: 'Un booster de l’Hiver', short: 'Booster de l’Hiver', note: 'La Série 3 · Hiver sort aujourd’hui', reward: { kind: 'pack', pack: FREE_PACK_HIVER } },
  { day: 2, title: '2 500 crédits', reward: { kind: 'credits', amount: 2_500 } },
  { day: 3, title: 'Un Pack Pro', reward: shop('pro') },
  { day: 4, title: '2 boosters gratuits', reward: { kind: 'boosters', count: 2 } },
  { day: 5, title: 'L’énergie miracle au maximum', reward: { kind: 'energie' } },
  { day: 6, title: 'Un Pack Élite', note: 'C’est la Saint-Nicolas', reward: shop('elite') },
  { day: 7, title: '5 000 crédits', reward: { kind: 'credits', amount: 5_000 } },
  { day: 8, title: 'Une Épique de l’Hiver', reward: hiverCard('epique', 'epique') },
  { day: 9, title: 'Un Pack Ongulés', note: 'La famille des rennes', reward: family('ongules') },
  { day: 10, title: '3 boosters gratuits', reward: { kind: 'boosters', count: 3 } },
  { day: 11, title: 'Un Pack Ours', note: 'La famille de l’ours polaire', reward: family('ours') },
  { day: 12, title: '8 000 crédits', reward: { kind: 'credits', amount: 8_000 } },
  { day: 13, title: 'Une Légendaire de l’Hiver', note: 'La Sainte-Lucie, fête de la lumière', reward: hiverCard('legendaire', 'legendaire') },
  { day: 14, title: 'Un Pack Oiseaux', note: 'La famille du rouge-gorge', reward: family('oiseaux') },
  { day: 15, title: '12 000 crédits', reward: { kind: 'credits', amount: 12_000 } },
  { day: 16, title: '5 boosters gratuits', reward: { kind: 'boosters', count: 5 } },
  { day: 17, title: 'Un Pack Légende', reward: shop('legende') },
  { day: 18, title: '20 000 crédits', reward: { kind: 'credits', amount: 20_000 } },
  { day: 19, title: 'Un Pack Mammifères marins', note: 'Phoques, morses et bélugas', reward: family('marins') },
  { day: 20, title: 'Une Prime de l’Hiver', note: 'Un animal célèbre', reward: hiverCard('prime', 'rare', true) },
  { day: 21, title: '30 000 crédits', note: 'Le solstice d’hiver, la plus longue nuit', reward: { kind: 'credits', amount: 30_000 } },
  { day: 22, title: 'Un Pack Prime', reward: shop('prime') },
  { day: 23, title: '50 000 crédits', reward: { kind: 'credits', amount: 50_000 } },
  { day: 24, title: 'Un Pack Icônes', note: 'Le grand cadeau du réveillon', reward: shop('icones') },
];

/** Place des cases dans le calendrier, mélangées comme sur un vrai calendrier de l'Avent. */
export const AVENT_LAYOUT = [13, 2, 20, 7, 24, 16, 9, 1, 18, 11, 5, 22, 3, 15, 8, 21, 12, 6, 17, 10, 23, 4, 19, 14];

/** Aperçu, dans la version de développement et sur la page d'aperçu seulement : `?avent=5` se place au 5 décembre. */
function preview(): number | null {
  if (!earlyAccess() || typeof location === 'undefined') return null;
  const day = Number(new URLSearchParams(location.search).get('avent'));
  return Number.isInteger(day) && day >= 1 && day <= AVENT_DAYS ? day : null;
}

/** La case du jour (1 à 24, heure du joueur), ou null hors de l'Avent. */
export function aventDay(now: number = Date.now()): number | null {
  const forced = preview();
  if (forced) return forced;
  const date = new Date(now);
  return date.getMonth() === 11 && date.getDate() <= AVENT_DAYS ? date.getDate() : null;
}

/** Les cases ouvertes cette année. */
export function aventOpened(state: AventState | undefined, now: number = Date.now()): number[] {
  return state && state.year === new Date(now).getFullYear() ? state.opened : [];
}

/** La case `day` peut-elle s'ouvrir maintenant ? (c'est la case du jour, pas encore ouverte) */
export function canOpenAvent(state: AventState | undefined, day: number, now: number = Date.now()): boolean {
  return aventDay(now) === day && !aventOpened(state, now).includes(day);
}

/** Note la case `day` ouverte. */
export function markAvent(state: AventState | undefined, day: number, now: number = Date.now()): AventState {
  return { year: new Date(now).getFullYear(), opened: [...aventOpened(state, now), day] };
}
