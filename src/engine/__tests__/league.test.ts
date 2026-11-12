import { describe, expect, it } from 'vitest';
import { DIVISION_COUNT, DIVISION_NUMBERS, divisionInfo } from '../divisions';
import {
  applyLeaguePoints,
  canBeRelegated,
  pointsToPromote,
  seasonKey,
  seasonReward,
  seasonStartDivision,
  streakMultiplier,
} from '../league';
import { ROUNDS, MAX_TIEBREAKS, createDuel, isFree, playDuelRound, type DuelCard } from '../duel';
import { ATHLETES_BY_ID } from '../../data/athletes';
import { mulberry32 } from '../random';

describe('ligue des naturalistes', () => {
  it('compte 14 divisions, chacune avec un emblème qui existe', () => {
    expect(DIVISION_NUMBERS).toHaveLength(DIVISION_COUNT);
    for (const n of DIVISION_NUMBERS) expect(ATHLETES_BY_ID[divisionInfo(n).athleteId]).toBeDefined();
    expect(divisionInfo(6).name).toBe('Tigre de diamant');
    expect(divisionInfo(1).tier).toBe('mythique');
  });

  it('demande 7 points pour monter, 10 à partir du rubis, et rien au sommet', () => {
    expect(pointsToPromote(14)).toBe(7);
    expect(pointsToPromote(5)).toBe(7);
    expect(pointsToPromote(4)).toBe(10);
    expect(pointsToPromote(2)).toBe(10);
    expect(pointsToPromote(1)).toBe(Infinity);
  });

  it('promeut, relègue à partir du rubis et garde les points au-dessus de zéro ailleurs', () => {
    expect(applyLeaguePoints(10, 5, 3)).toEqual({ division: 9, points: 0, promoted: true, relegated: false });
    expect(applyLeaguePoints(10, 1, -2)).toEqual({ division: 10, points: 0, promoted: false, relegated: false });
    expect(canBeRelegated(5)).toBe(false);
    const down = applyLeaguePoints(4, 1, -2);
    expect(down.relegated).toBe(true);
    expect(down.division).toBe(5);
    expect(down.points).toBe(4);
    // au sommet, les étoiles s'accumulent sans promotion
    expect(applyLeaguePoints(1, 40, 3)).toEqual({ division: 1, points: 43, promoted: false, relegated: false });
  });

  it('donne +25 % à partir de 3 victoires d’affilée', () => {
    expect(streakMultiplier(2)).toBe(1);
    expect(streakMultiplier(3)).toBe(1.25);
  });

  it('récompense la saison selon la division et fait redescendre de 2 divisions', () => {
    expect(seasonKey(new Date(2026, 10, 12).getTime())).toBe('2026-11');
    expect(seasonReward(14)).toEqual({ balles: 1_000, boosters: 0 });
    expect(seasonReward(1).boosters).toBe(3);
    expect(seasonStartDivision(3)).toBe(5);
    expect(seasonStartDivision(14)).toBe(14);
  });
});

describe('manche décisive', () => {
  const team = (ids: string[]): DuelCard[] => ids.map((athleteId, i) => ({ uid: `m${i}`, athleteId, variant: 'base' }));

  it('rejoue une égalité avec tous les animaux, au plus 3 fois', () => {
    const rng = mulberry32(7);
    const base = createDuel(team(['herisson', 'zebre', 'gnou', 'castor', 'lapin']), 10, rng);
    // l'adversaire n'a que des hérissons : en jouant le hérisson, chaque manche est une égalité
    let duel = {
      ...base,
      round: ROUNDS - 1,
      me: { ...base.me, used: [1, 2, 3, 4], score: 2 },
      opp: { ...base.opp, cards: team(Array(5).fill('herisson')).map((c) => ({ ...c, uid: `o${c.uid}` })), used: [0, 1, 2, 3], score: 2 },
    };
    duel = playDuelRound(duel, 0, rng).state;
    expect(duel.finished).toBe(false);
    expect(duel.records).toHaveLength(ROUNDS + 1);
    expect(isFree(duel, 'me', 0)).toBe(true);
    let guard = 0;
    while (!duel.finished && guard++ < 10) duel = playDuelRound(duel, 0, rng).state;
    expect(duel.finished).toBe(true);
    expect(duel.round).toBe(ROUNDS + MAX_TIEBREAKS);
    expect(duel.me.score).toBe(duel.opp.score);
  });
});
