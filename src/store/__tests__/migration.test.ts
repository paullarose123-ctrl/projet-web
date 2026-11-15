import { describe, expect, it } from 'vitest';
import { useGame, type GameState } from '../game';

const migrate = useGame.persist.getOptions().migrate!;

describe('sauvegarde : passage aux 14 divisions (version 22)', () => {
  it('décale une ancienne partie de 4 divisions, une seule fois', () => {
    const old = { division: 4, divisionPoints: 2 } as unknown as GameState;
    const state = migrate(structuredClone(old), 21) as GameState;
    expect(state.division).toBe(8); // Ours de platine
    expect(state.bestDivision).toBe(8);
  });

  it('ne redécale pas une partie déjà à 14 divisions renvoyée par un ancien onglet (marquée version 21)', () => {
    const resent = { division: 8, divisionPoints: 5, bestDivision: 7, winStreak: 2, leagueSeason: '2026-11', seasonPlayed: 4 } as unknown as GameState;
    const state = migrate(structuredClone(resent), 21) as GameState;
    expect(state.division).toBe(8);
    expect(state.divisionPoints).toBe(5);
    expect(state.bestDivision).toBe(7);
    expect(state.seasonPlayed).toBe(4);
  });
});

describe('sauvegarde : réparation des divisions perdues (version 23)', () => {
  const damaged = (played: number, won: number, division = 14, leagueSeason = '2026-11') =>
    ({ division, divisionPoints: 3, bestDivision: division, leagueSeason, stats: { matchesPlayed: played, matchesWon: won } }) as unknown as GameState;

  it('rend la division que les duels joués permettent d’atteindre', () => {
    // 40 victoires, 10 défaites : 120 − 20 = 100 points, 14 promotions possibles → plafonné au Requin de diamant
    expect((migrate(damaged(50, 40), 22) as GameState).division).toBe(5);
    // 20 victoires, 10 défaites : 60 − 20 = 40 points, 5 promotions → Aigle d’or
    const state = migrate(damaged(30, 20), 22) as GameState;
    expect(state.division).toBe(9);
    expect(state.bestDivision).toBe(9);
    expect(state.divisionPoints).toBe(0);
    expect(state.leagueRepaired).toBe(9);
  });

  it('ne fait jamais descendre et ne touche pas aux saisons suivantes', () => {
    expect((migrate(damaged(30, 20, 7), 22) as GameState).division).toBe(7);
    expect((migrate(damaged(30, 20, 14, '2026-12'), 22) as GameState).division).toBe(14);
  });
});
