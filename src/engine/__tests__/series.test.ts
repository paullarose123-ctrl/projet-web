import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ATHLETES, ATHLETES_BY_ID } from '../../data/athletes';
import { FREE_PACK, FREE_PACK_MEXIQUE, MEXIQUE_PACKS, SHOP_PACKS, freePack, openPack, sportPack } from '../packs';
import { cardsOfSerie, releasedAthletes, serieOf, setEarlyAccessForTesting } from '../series';
import { createMarket } from '../market';
import { rarityOf } from '../cards';
import { mulberry32 } from '../random';
import { SPORTS } from '../../data/sports';

const OCT_31 = new Date(2026, 9, 31, 23, 59).getTime();
const NOV_1 = new Date(2026, 10, 1, 0, 0, 1).getTime();

describe('Série 2 · Mexique', () => {
  // comme sur le site public : la série sort à sa date
  beforeAll(() => setEarlyAccessForTesting(false));
  afterAll(() => setEarlyAccessForTesting(true));

  it('compte une soixantaine de cartes : espèces, Icônes et Habitats', () => {
    const cards = cardsOfSerie(2);
    expect(cards.length).toBe(60);
    expect(cards.filter((a) => a.habitat).length).toBe(6);
    expect(cards.filter((a) => a.retired && !a.habitat).length).toBe(5);
    expect(new Set(ATHLETES.map((a) => a.id)).size).toBe(ATHLETES.length);
  });

  it('a des espèces dans chaque rareté, et des Primes', () => {
    const species = cardsOfSerie(2).filter((a) => !a.habitat && !a.retired);
    for (const id of ['commune', 'peu-commune', 'rare', 'epique', 'legendaire']) {
      expect(species.filter((a) => rarityOf(a).id === id).length, id).toBeGreaterThan(2);
    }
    expect(species.filter((a) => a.prime).length).toBeGreaterThanOrEqual(3);
  });

  it('ses Habitats ne citent que des cartes de la série', () => {
    for (const habitat of cardsOfSerie(2).filter((a) => a.habitat)) {
      for (const id of habitat.habitat!.especes) expect(serieOf(ATHLETES_BY_ID[id] ?? { serie: 0 } as never), `${habitat.id} → ${id}`).toBe(2);
    }
  });

  it('ses cartes ne sortent que de ses boosters, et les boosters de la Série 1 n’en donnent jamais', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 300; i++) {
      for (const pack of MEXIQUE_PACKS) for (const card of openPack(pack, rng)) expect(serieOf(ATHLETES_BY_ID[card.athleteId])).toBe(2);
      for (const pack of [FREE_PACK, ...SHOP_PACKS, sportPack('felins', SPORTS.felins.name)]) {
        for (const card of openPack(pack, rng)) expect(serieOf(ATHLETES_BY_ID[card.athleteId])).toBe(1);
      }
    }
  });

  it('sort le 1er novembre : booster gratuit, marché et cartes disponibles changent à minuit', () => {
    expect(freePack(OCT_31)).toBe(FREE_PACK);
    expect(freePack(NOV_1)).toBe(FREE_PACK_MEXIQUE);
    expect(releasedAthletes(OCT_31).some((a) => serieOf(a) === 2)).toBe(false);
    expect(releasedAthletes(NOV_1).filter((a) => serieOf(a) === 2).length).toBe(60);
    const before = createMarket(OCT_31, mulberry32(3));
    expect(before.listings.every((l) => serieOf(ATHLETES_BY_ID[l.card.athleteId]) === 1)).toBe(true);
  });
});
