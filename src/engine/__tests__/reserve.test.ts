import { describe, expect, it } from 'vitest';
import { ATHLETES, ATHLETES_BY_ID } from '../../data/athletes';
import { ENCLOS, MAX_PLACES, billetterie, canLiveIn, billetterieFull, cardVisitors, emptyReserve, enclosFor, enclosVisitors, levelOf, placePrice, reserveRate } from '../reserve';
import type { CardFace } from '../types';

const card = (athleteId: string, variant: CardFace['variant'] = 'base'): CardFace => ({ athleteId, variant });
const HOUR = 3_600_000;

describe('Ma Réserve', () => {
  it('range chaque espèce dans l’enclos de son milieu', () => {
    expect(enclosFor(ATHLETES_BY_ID['ours-polaire'])).toBe('banquise');
    expect(enclosFor(ATHLETES_BY_ID['lion'])).toBe('savane');
    expect(enclosFor(ATHLETES_BY_ID['poisson-clown'])).toBe('aquarium');
    expect(enclosFor(ATHLETES_BY_ID['vache'])).toBe('ferme');
    expect(enclosFor(ATHLETES_BY_ID['flamant-rose'])).toBe('marais');
    expect(enclosFor(ATHLETES_BY_ID['panda'])).toBe('foret');
  });

  it('laisse dehors les Habitats et les Icônes, et case toutes les autres espèces', () => {
    expect(enclosFor(ATHLETES_BY_ID['habitat-serengeti'])).toBeNull();
    // chaque enclos a de quoi se remplir (au moins MAX_PLACES espèces)
    for (const e of ENCLOS) expect(ATHLETES.filter((a) => canLiveIn(a, e.id)).length).toBeGreaterThanOrEqual(8);
    // les animaux domestiques vont à la ferme, les animaux de nuit aussi à la maison nocturne
    expect(enclosFor(ATHLETES_BY_ID['husky'])).toBe('ferme');
    expect(canLiveIn(ATHLETES_BY_ID['vampire'], 'nocturne')).toBe(true);
    expect(canLiveIn(ATHLETES_BY_ID['lion'], 'banquise')).toBe(false);
  });

  it('compte les visiteurs selon la rareté, la variante et les groupes', () => {
    expect(cardVisitors(card('lion', 'reverse'))).toBe(cardVisitors(card('lion')) * 1.5);
    const felins = ['lion', 'guepard', 'leopard'].map((id) => card(id));
    const seuls = felins.map(cardVisitors);
    expect(enclosVisitors(felins)).toEqual(seuls.map((v) => Math.round(v * 1.2)));
    expect(enclosVisitors(felins.slice(0, 2))).toEqual(seuls.slice(0, 2));
  });

  it('remplit la billetterie jusqu’à 8 h de visites, sans jamais perdre ce qui est compté', () => {
    const state = emptyReserve(0);
    expect(billetterie(state, 100, 2 * HOUR)).toBe(200);
    expect(billetterie(state, 100, 30 * HOUR)).toBe(800);
    expect(billetterieFull(state, 100, 30 * HOUR)).toBe(true);
    // des animaux retirés : le rythme baisse mais le compté reste
    expect(billetterie({ ...state, pending: 800 }, 10, 31 * HOUR)).toBe(800);
  });

  it('ignore les cartes qui ne sont plus dans la collection', () => {
    const state = { ...emptyReserve(0), enclos: { savane: { places: 3, uids: ['a', 'b'] } } };
    const lion = card('lion');
    expect(reserveRate(state, (uid) => (uid === 'a' ? lion : undefined))).toBe(cardVisitors(lion));
  });

  it('fait payer les places de plus en plus cher et monte de niveau', () => {
    expect([3, 4].map(placePrice)).toEqual([500, 1000]);
    expect(MAX_PLACES).toBe(5);
    expect(levelOf(0).level).toBe(1);
    expect(levelOf(600).level).toBe(2);
    expect(levelOf(10_000_000).to).toBeNull();
  });
});
