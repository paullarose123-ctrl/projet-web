import { describe, expect, it } from 'vitest';
import { ATHLETES, ATHLETES_BY_ID } from '../../data/athletes';
import {
  ENCLOS,
  LEVEL_REWARDS,
  LEVELS,
  MAX_PLACES,
  billetterie,
  billetterieHours,
  busyUids,
  canExplore,
  canLiveIn,
  billetterieFull,
  cardVisitors,
  dailyRequests,
  decorBonus,
  emptyReserve,
  enclosFor,
  enclosVisitors,
  expeditionCredits,
  levelOf,
  levelRewardsDue,
  placePrice,
  requestProgress,
  reserveRate,
  reserveSnapshot,
} from '../reserve';
import type { CardFace, OwnedCard } from '../types';

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
    // chaque enclos a de quoi se remplir (au moins MAX_PLACES espèces), et chaque espèce n'a qu'un enclos
    for (const e of ENCLOS) expect(ATHLETES.filter((a) => canLiveIn(a, e.id)).length).toBeGreaterThanOrEqual(MAX_PLACES);
    for (const a of ATHLETES) expect(ENCLOS.filter((e) => canLiveIn(a, e.id)).length).toBeLessThanOrEqual(1);
    // les animaux domestiques et ceux qui vivent partout avec l'homme vont à la ferme
    expect(enclosFor(ATHLETES_BY_ID['husky'])).toBe('ferme');
    expect(enclosFor(ATHLETES_BY_ID['rat'])).toBe('ferme');
    // la montagne a son enclos ; les animaux qui vivent sous terre vont dans celui de leur région
    expect(enclosFor(ATHLETES_BY_ID['panthere-des-neiges'])).toBe('montagne');
    expect(enclosFor(ATHLETES_BY_ID['bouquetin'])).toBe('montagne');
    expect(enclosFor(ATHLETES_BY_ID['vampire'])).toBe('jungle');
    expect(enclosFor(ATHLETES_BY_ID['taupe'])).toBe('foret');
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

  it('verse la récompense de chaque niveau gagné, une seule fois', () => {
    expect(LEVEL_REWARDS.length).toBe(LEVELS.length + 1);
    expect(levelRewardsDue(1, 0)).toEqual({ level: 1, credits: 0, boosters: 0 });
    // de 1 à 3 d'un coup : les niveaux 2 et 3
    const due = levelRewardsDue(1, LEVELS[2]);
    expect(due.level).toBe(3);
    expect(due.credits).toBe(LEVEL_REWARDS[2].credits + LEVEL_REWARDS[3].credits);
    expect(due.boosters).toBe(LEVEL_REWARDS[3].boosters);
    // déjà payé : rien de plus
    expect(levelRewardsDue(3, LEVELS[2] + 10).credits).toBe(0);
  });

  it('agrandit la billetterie et ajoute le bonus des décors', () => {
    const state = emptyReserve(0);
    expect(billetterieHours(state)).toBe(8);
    expect(billetterie({ ...state, caisse: 2 }, 100, 30 * HOUR)).toBe(2400);
    const lion = card('lion');
    const pens = { ...state, enclos: { savane: { places: 3, uids: ['a'] } } };
    const decorated = { ...pens, decor: ['fontaine', 'statue'] };
    expect(decorBonus(decorated)).toBeCloseTo(0.15);
    expect(reserveRate(decorated, () => lion)).toBe(Math.round(cardVisitors(lion) * 1.15));
  });

  it('tire chaque jour des demandes que le joueur peut remplir', () => {
    const owned = (athleteId: string, uid: string, variant: CardFace['variant'] = 'base'): OwnedCard => ({ athleteId, variant, uid, obtainedAt: 0 });
    const cards = [owned('lion', 'a', 'reverse'), owned('guepard', 'b'), owned('zebre', 'c'), owned('loup', 'd'), owned('renard-roux', 'e')];
    const state = { ...emptyReserve(0), enclos: { savane: { places: 3, uids: ['a', 'b', 'c'] }, foret: { places: 3, uids: [] } } };
    const byUid = new Map(cards.map((c) => [c.uid, c]));
    const list = dailyRequests('2026-11-07', state, cards, 3);
    expect(list.length).toBe(3);
    expect(dailyRequests('2026-11-07', state, cards, 3)).toEqual(list);
    for (const r of list) {
      expect(r.reward).toBeGreaterThan(0);
      const { need } = requestProgress(r, state, (uid) => byUid.get(uid));
      expect(need).toBeGreaterThan(0);
    }
    // une demande de Reverse est remplie quand une Reverse est installée
    expect(requestProgress({ kind: 'reverse', reward: 1 }, state, (uid) => byUid.get(uid)).have).toBe(1);
  });

  it('envoie en expédition les animaux qui ne sont pas dans un enclos, et les garde de côté', () => {
    expect(canExplore(ATHLETES_BY_ID['lion'])).toBe(true);
    expect(canExplore(ATHLETES_BY_ID['thylacine'])).toBe(false);
    expect(expeditionCredits(card('lion'), 'grande')).toBeGreaterThan(expeditionCredits(card('lion'), 'balade'));
    const state = { ...emptyReserve(0), enclos: { savane: { places: 3, uids: ['a'] } }, expeditions: [{ uid: 'b', kind: 'balade' as const, start: 0 }] };
    expect([...busyUids(state)].sort()).toEqual(['a', 'b']);
  });

  it('montre aux amis les espèces de chaque enclos', () => {
    const state = { ...emptyReserve(0), enclos: { savane: { places: 3, uids: ['a', 'x'] }, foret: { places: 3, uids: [] } }, decor: ['fontaine'] };
    const snap = reserveSnapshot(state, (uid) => (uid === 'a' ? card('lion') : undefined));
    expect(snap.enclos).toEqual({ savane: ['lion'], foret: [] });
    expect(snap.decor).toEqual(['fontaine']);
    expect(snap.level).toBe(1);
  });
});
