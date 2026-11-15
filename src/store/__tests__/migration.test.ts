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
