import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ATHLETES_BY_ID } from '../../data/athletes';
import { OFFER_EVERY, OFFER_LIFETIME, PIOCHE_INTERVAL, PIOCHE_MAX, emptyPioche, piocheCost, piocheOffer, piocheOffers, rechargePioche, spendPioche } from '../pioche';
import { serieOf, setEarlyAccessForTesting } from '../series';

const NOV_20 = new Date(2026, 10, 20, 15, 10).getTime();
const DEC_5 = new Date(2026, 11, 5, 9, 40).getTime();

describe('Pioche miracle', () => {
  beforeAll(() => setEarlyAccessForTesting(false));
  afterAll(() => setEarlyAccessForTesting(true));

  it('propose les boosters des 8 dernières heures, un par demi-heure, les mêmes pour tous', () => {
    const offers = piocheOffers(NOV_20);
    expect(offers.length).toBeGreaterThanOrEqual(OFFER_LIFETIME / OFFER_EVERY - 1);
    expect(offers.length).toBeLessThanOrEqual(OFFER_LIFETIME / OFFER_EVERY + 1);
    for (const offer of offers) {
      expect(offer.cards).toHaveLength(5);
      expect(offer.at).toBeLessThanOrEqual(NOV_20);
      expect(NOV_20 - offer.at).toBeLessThan(OFFER_LIFETIME);
      for (const card of offer.cards) expect(ATHLETES_BY_ID[card.athleteId], card.athleteId).toBeDefined();
      // une seule série par booster, sortie à l'heure de l'ouverture
      expect(new Set(offer.cards.map((c) => serieOf(ATHLETES_BY_ID[c.athleteId])))).toEqual(new Set([offer.serie]));
    }
    // du plus récent au plus ancien, et toujours les mêmes
    expect(offers.map((o) => o.at)).toEqual([...offers.map((o) => o.at)].sort((a, b) => b - a));
    expect(piocheOffers(NOV_20).map((o) => o.id)).toEqual(offers.map((o) => o.id));
    expect(piocheOffer(offers[2].id, NOV_20)).toBe(offers[2]);
    expect(piocheOffer(offers[2].id, NOV_20 + OFFER_LIFETIME + OFFER_EVERY)).toBeUndefined();
  });

  it('ne propose l’Hiver qu’après sa sortie', () => {
    expect(piocheOffers(NOV_20).some((o) => o.serie === 3)).toBe(false);
    const later = Array.from({ length: 20 }, (_, i) => piocheOffers(DEC_5 + i * OFFER_LIFETIME)).flat();
    expect(later.some((o) => o.serie === 3)).toBe(true);
  });

  it('coûte plus d’énergie quand le booster contient une carte rare, et quelques pioches sont offertes', () => {
    expect(piocheCost([{ athleteId: 'moineau', variant: 'base' }])).toBe(1);
    expect(piocheCost([{ athleteId: 'moineau', variant: 'base' }, { athleteId: 'moineau', variant: 'prime' }])).toBe(4);
    const many = Array.from({ length: 60 }, (_, i) => piocheOffers(NOV_20 + i * OFFER_LIFETIME)).flat();
    const costs = new Set(many.map((o) => o.cost));
    expect(costs.has(0)).toBe(true);
    expect([...costs].every((c) => c >= 0 && c <= 4)).toBe(true);
    expect(many.filter((o) => o.bonus).every((o) => o.cost === 0)).toBe(true);
  });

  it('recharge une énergie toutes les 2 heures, jusqu’à 5', () => {
    const start = emptyPioche(NOV_20);
    const offer = { ...piocheOffers(NOV_20)[0], cost: 3 };
    const spent = spendPioche(start, offer, NOV_20);
    expect(spent.energy).toBe(PIOCHE_MAX - 3);
    expect(spent.nextAt).toBe(NOV_20 + PIOCHE_INTERVAL);
    expect(spent.used).toEqual([offer.id]);
    expect(rechargePioche(spent, NOV_20 + PIOCHE_INTERVAL - 1).energy).toBe(PIOCHE_MAX - 3);
    expect(rechargePioche(spent, NOV_20 + PIOCHE_INTERVAL).energy).toBe(PIOCHE_MAX - 2);
    expect(rechargePioche(spent, NOV_20 + 2 * PIOCHE_INTERVAL + 5).energy).toBe(PIOCHE_MAX - 1);
    expect(rechargePioche(spent, NOV_20 + 10 * PIOCHE_INTERVAL).energy).toBe(PIOCHE_MAX);
    // le booster déjà pioché est oublié quand il n'est plus proposé
    expect(rechargePioche(spent, NOV_20 + OFFER_LIFETIME + OFFER_EVERY).used).toEqual([]);
  });
});
