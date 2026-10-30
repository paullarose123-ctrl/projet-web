import { describe, expect, it } from 'vitest';
import { ALL_DAILY, dailyFor, dailyObjectives, dailyProgress, dayKey, emptyDaily, isDailyDone, nextMidnight } from '../daily';

describe('Objectifs du jour', () => {
  it('changent à minuit, heure du joueur', () => {
    expect(dayKey(new Date(2026, 10, 3, 23, 59).getTime())).toBe('2026-11-03');
    expect(dayKey(new Date(2026, 10, 4, 0, 0).getTime())).toBe('2026-11-04');
    expect(nextMidnight(new Date(2026, 10, 3, 15, 30).getTime())).toBe(new Date(2026, 10, 4).getTime());
  });

  it('tirent chaque jour trois défis : un booster, un de collection, un de duel', () => {
    const counts = new Set<string>();
    for (let d = 1; d <= 60; d++) {
      const day = dayKey(new Date(2026, 10, d).getTime());
      const list = dailyObjectives(day);
      expect(list).toHaveLength(3);
      expect(list[0].count).toBe('packs');
      expect(['newSpecies', 'rare', 'quickSold', 'mexique']).toContain(list[1].count);
      expect(['played', 'won']).toContain(list[2].count);
      list.forEach((o) => counts.add(o.id));
      // le même jour donne toujours les mêmes défis
      expect(dailyObjectives(day).map((o) => o.id)).toEqual(list.map((o) => o.id));
    }
    // sur deux mois, presque tous les défis sortent au moins une fois
    expect(counts.size).toBeGreaterThan(ALL_DAILY.length - 2);
  });

  it('ne demandent pas de cartes du Mexique avant la sortie de la Série 2', () => {
    for (let d = 1; d <= 60; d++) {
      const day = dayKey(new Date(2026, 8, d).getTime());
      expect(dailyObjectives(day, false).some((o) => o.count === 'mexique')).toBe(false);
    }
  });

  it('repartent de zéro le lendemain', () => {
    const today = { ...emptyDaily('2026-11-03'), claimed: ['packs-2'] };
    today.counts.packs = 4;
    expect(dailyFor(today, new Date(2026, 10, 3, 20).getTime())).toBe(today);
    const tomorrow = dailyFor(today, new Date(2026, 10, 4, 8).getTime());
    expect(tomorrow.day).toBe('2026-11-04');
    expect(tomorrow.counts.packs).toBe(0);
    expect(tomorrow.claimed).toEqual([]);
  });

  it('mesurent la progression sans dépasser le but', () => {
    const objective = ALL_DAILY.find((o) => o.id === 'packs-3')!;
    const daily = emptyDaily('2026-11-03');
    daily.counts.packs = 2;
    expect(dailyProgress(objective, daily)).toEqual([2, 3]);
    expect(isDailyDone(objective, daily)).toBe(false);
    daily.counts.packs = 5;
    expect(dailyProgress(objective, daily)).toEqual([3, 3]);
    expect(isDailyDone(objective, daily)).toBe(true);
  });
});
