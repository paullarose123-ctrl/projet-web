import { describe, expect, it } from 'vitest';
import { isHalloween, seasonAt } from '../season';
import { allTracks } from '../../audio/tracks';

describe('Saisons d’Halloween et du Jour des morts', () => {
  it('Halloween va du 20 au 31 octobre inclus, chaque année', () => {
    expect(isHalloween(new Date(2026, 9, 19, 23, 59).getTime())).toBe(false);
    expect(isHalloween(new Date(2026, 9, 20, 0, 0).getTime())).toBe(true);
    expect(isHalloween(new Date(2026, 9, 31, 23, 59).getTime())).toBe(true);
    expect(isHalloween(new Date(2026, 10, 1, 0, 0).getTime())).toBe(false);
    expect(isHalloween(new Date(2027, 9, 25).getTime())).toBe(true);
    expect(isHalloween(new Date(2027, 5, 1).getTime())).toBe(false);
  });

  it('le Jour des morts est retiré : plus de fête après Halloween', () => {
    expect(seasonAt(new Date(2026, 10, 1, 0, 0).getTime())).toBe(null);
    expect(seasonAt(new Date(2026, 10, 6).getTime())).toBe(null);
    expect(seasonAt(new Date(2027, 10, 3).getTime())).toBe(null);
  });

  it('la radio ne passe que les morceaux de la fête, puis les sept de toujours', () => {
    const halloween = allTracks(new Date(2026, 9, 26).getTime());
    const after = allTracks(new Date(2026, 10, 3).getTime());
    expect(halloween.map((t) => t.title)).toEqual(['Nuit des citrouilles', 'Valse des calaveras', 'Bal des squelettes']);
    expect(halloween.every((t) => t.seasons?.includes('halloween'))).toBe(true);
    expect(after).toHaveLength(7);
    expect(after.some((t) => t.seasons)).toBe(false);
  });
});
