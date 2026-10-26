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

  it('ne passe que ses trois morceaux à la radio pendant la saison, puis les sept de toujours', () => {
    const during = allTracks(new Date(2026, 9, 26).getTime());
    const after = allTracks(new Date(2026, 10, 2).getTime());
    expect(during.map((t) => t.title)).toEqual(['Nuit des citrouilles', 'Valse des calaveras', 'Bal des squelettes']);
    expect(during.every((t) => t.season === 'halloween')).toBe(true);
    expect(after).toHaveLength(7);
    expect(after.some((t) => t.season)).toBe(false);
  });
});
