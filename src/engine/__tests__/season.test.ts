import { describe, expect, it } from 'vitest';
import { isHalloween } from '../season';
import { allTracks } from '../../audio/tracks';

describe('Saison d’Halloween et du Jour des morts', () => {
  it('va du 20 octobre au 1er novembre inclus, chaque année', () => {
    expect(isHalloween(new Date(2026, 9, 19, 23, 59).getTime())).toBe(false);
    expect(isHalloween(new Date(2026, 9, 20, 0, 0).getTime())).toBe(true);
    expect(isHalloween(new Date(2026, 9, 31, 22, 0).getTime())).toBe(true);
    expect(isHalloween(new Date(2026, 10, 1, 23, 59).getTime())).toBe(true);
    expect(isHalloween(new Date(2026, 10, 2, 0, 0).getTime())).toBe(false);
    expect(isHalloween(new Date(2027, 9, 25).getTime())).toBe(true);
    expect(isHalloween(new Date(2027, 5, 1).getTime())).toBe(false);
  });

  it('ajoute ses deux morceaux à la radio pendant la saison seulement', () => {
    const during = allTracks(new Date(2026, 9, 26).getTime());
    const after = allTracks(new Date(2026, 10, 5).getTime());
    expect(during.filter((t) => t.season).map((t) => t.title)).toEqual(['Nuit des citrouilles', 'Valse des calaveras']);
    expect(after.some((t) => t.season)).toBe(false);
    expect(during.length - after.length).toBe(2);
  });
});
