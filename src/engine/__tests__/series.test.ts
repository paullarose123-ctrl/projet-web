import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ATHLETES, ATHLETES_BY_ID } from '../../data/athletes';
import { FREE_PACK, FREE_PACK_HIVER, FREE_PACK_MEXIQUE, SHOP_PACKS, freePackChoices, freePackOf, openPack, serieOdds, sportPack, type PackDef } from '../packs';
import { cardsOfSerie, releasedAthletes, serieOf, setEarlyAccessForTesting } from '../series';
import { createMarket } from '../market';
import { collectionNumber, rarityOf } from '../cards';
import { encyclopedieOf } from '../../data/encyclopedie';
import { MESURES } from '../../data/mesures';
import { POPULATIONS } from '../../data/populations';
import { mulberry32 } from '../random';
import { SPORTS } from '../../data/sports';

const OCT_31 = new Date(2026, 9, 31, 23, 59).getTime();
const NOV_1 = new Date(2026, 10, 1, 0, 0, 1).getTime();

describe('Série 2 · Mexique', () => {
  // comme sur le site public : la série sort à sa date
  beforeAll(() => setEarlyAccessForTesting(false));
  afterAll(() => setEarlyAccessForTesting(true));
  afterEach(() => vi.useRealTimers());

  /** les séries des cartes tirées de ce booster */
  const seriesFrom = (pack: PackDef, rng: () => number, times = 400) => {
    const out = new Set<number>();
    for (let i = 0; i < times; i++) for (const card of openPack(pack, rng)) out.add(serieOf(ATHLETES_BY_ID[card.athleteId]));
    return [...out].sort();
  };
  const PAID = [...SHOP_PACKS, sportPack('felins', SPORTS.felins.name)];

  it('compte 116 cartes : espèces, Icônes et Habitats', () => {
    const cards = cardsOfSerie(2);
    expect(cards.length).toBe(116);
    expect(cards.filter((a) => a.habitat).length).toBe(6);
    expect(cards.filter((a) => a.retired && !a.habitat).length).toBe(6);
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

  it('avant sa sortie, aucun booster ne donne ses cartes', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(OCT_31);
    const rng = mulberry32(7);
    for (const pack of [FREE_PACK, ...PAID]) expect(seriesFrom(pack, rng), pack.id).toEqual([1]);
  });

  it('ensuite, chaque booster gratuit garde sa série et les packs payants mêlent les deux', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOV_1);
    const rng = mulberry32(11);
    expect(seriesFrom(FREE_PACK, rng)).toEqual([1]);
    expect(seriesFrom(FREE_PACK_MEXIQUE, rng)).toEqual([2]);
    for (const pack of PAID) expect(seriesFrom(pack, rng), pack.id).toEqual([1, 2]);
  });

  it('le Pack Icônes donne aussi les Icônes du Mexique dès sa sortie, et la boutique l’affiche', () => {
    const icones = SHOP_PACKS.find((pack) => pack.id === 'icones')!;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(OCT_31);
    expect(serieOdds(icones, 2)).toBe(0);
    vi.setSystemTime(NOV_1);
    expect(serieOdds(icones, 2)).toBeGreaterThan(0.1);
    expect(serieOdds(icones, 2)).toBeLessThan(1);
    expect(seriesFrom(icones, mulberry32(5))).toEqual([1, 2]);
  });

  it('sort le 1er novembre : boosters gratuits, marché et cartes disponibles changent à minuit', () => {
    expect(freePackChoices(OCT_31)).toEqual([FREE_PACK]);
    expect(freePackChoices(NOV_1)).toEqual([FREE_PACK, FREE_PACK_MEXIQUE]);
    expect(freePackOf(2, OCT_31)).toBe(FREE_PACK);
    expect(freePackOf(2, NOV_1)).toBe(FREE_PACK_MEXIQUE);
    expect(releasedAthletes(OCT_31).some((a) => serieOf(a) === 2)).toBe(false);
    expect(releasedAthletes(NOV_1).filter((a) => serieOf(a) === 2).length).toBe(116);
    const before = createMarket(OCT_31, mulberry32(3));
    expect(before.listings.every((l) => serieOf(ATHLETES_BY_ID[l.card.athleteId]) === 1)).toBe(true);
  });
});

const NOV_30 = new Date(2026, 10, 30, 23, 59).getTime();
const DEC_1 = new Date(2026, 11, 1, 0, 0, 1).getTime();

describe('Série 3 · Hiver', () => {
  beforeAll(() => setEarlyAccessForTesting(false));
  afterAll(() => setEarlyAccessForTesting(true));
  afterEach(() => vi.useRealTimers());

  const seriesFrom = (pack: PackDef, rng: () => number, times = 400) => {
    const out = new Set<number>();
    for (let i = 0; i < times; i++) for (const card of openPack(pack, rng)) out.add(serieOf(ATHLETES_BY_ID[card.athleteId]));
    return [...out].sort();
  };
  const PAID = [...SHOP_PACKS, sportPack('felins', SPORTS.felins.name)];

  it('sort le 1er décembre : son booster gratuit rejoint ceux des deux autres séries', () => {
    expect(freePackChoices(NOV_30)).toEqual([FREE_PACK, FREE_PACK_MEXIQUE]);
    expect(freePackChoices(DEC_1)).toEqual([FREE_PACK, FREE_PACK_MEXIQUE, FREE_PACK_HIVER]);
    expect(freePackOf(3, NOV_30)).toBe(FREE_PACK);
    expect(freePackOf(3, DEC_1)).toBe(FREE_PACK_HIVER);
    expect(releasedAthletes(NOV_30).some((a) => serieOf(a) === 3)).toBe(false);
    expect(releasedAthletes(DEC_1).filter((a) => serieOf(a) === 3).length).toBe(101);
  });

  it('avant sa sortie, aucun booster ne donne ses cartes ; ensuite, son booster ne donne qu’elles et les packs mêlent les trois séries', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOV_30);
    const rng = mulberry32(13);
    for (const pack of [FREE_PACK, FREE_PACK_MEXIQUE, ...PAID]) expect(seriesFrom(pack, rng), pack.id).not.toContain(3);
    vi.setSystemTime(DEC_1);
    expect(seriesFrom(FREE_PACK_HIVER, rng)).toEqual([3]);
    expect(seriesFrom(FREE_PACK, rng)).toEqual([1]);
    // le Pack Icônes reste aux deux premières séries : l'Hiver n'a pas d'Icône
    for (const pack of PAID) expect(seriesFrom(pack, rng), pack.id).toEqual(pack.id === 'icones' ? [1, 2] : [1, 2, 3]);
  });

  it('le Pack Icônes reste aux Icônes des deux premières séries (l’Hiver n’en a pas)', () => {
    const icones = SHOP_PACKS.find((pack) => pack.id === 'icones')!;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(DEC_1);
    expect(serieOdds(icones, 3)).toBe(0);
    expect(seriesFrom(icones, mulberry32(9))).toEqual([1, 2]);
  });

  it('compte 101 cartes : des espèces et des Habitats, sans Icône', () => {
    const cards = cardsOfSerie(3);
    expect(cards.length).toBe(101);
    expect(cards.filter((a) => a.habitat).length).toBe(6);
    expect(cards.filter((a) => a.retired && !a.habitat).length).toBe(0);
    expect(new Set(ATHLETES.map((a) => a.id)).size).toBe(ATHLETES.length);
  });

  it('a des espèces dans chaque rareté, et des Primes', () => {
    const species = cardsOfSerie(3).filter((a) => !a.habitat && !a.retired);
    for (const id of ['commune', 'peu-commune', 'rare', 'epique', 'legendaire']) {
      expect(species.filter((a) => rarityOf(a).id === id).length, id).toBeGreaterThan(2);
    }
    expect(species.filter((a) => a.prime).length).toBeGreaterThanOrEqual(3);
  });

  it('ses Habitats ne citent que des cartes de la série', () => {
    for (const habitat of cardsOfSerie(3).filter((a) => a.habitat)) {
      for (const id of habitat.habitat!.especes) expect(serieOf(ATHLETES_BY_ID[id] ?? { serie: 0 } as never), `${habitat.id} → ${id}`).toBe(3);
    }
  });

  it('chaque espèce a sa fiche, ses mesures et, si elle vit encore, sa population', () => {
    for (const a of cardsOfSerie(3).filter((card) => !card.habitat)) {
      expect(encyclopedieOf(a.id), a.id).toBeDefined();
      expect(MESURES[a.id], a.id).toBeDefined();
      if (!a.retired && !a.race) expect(POPULATIONS[a.id], a.id).toBeGreaterThan(0);
    }
  });

  it('numérote ses cartes G1, G2…', () => {
    const numbers = cardsOfSerie(3).map((a) => collectionNumber(a));
    expect(new Set(numbers).size).toBe(101);
    expect(numbers.every((n) => /^G\d+$/.test(n))).toBe(true);
  });
});
