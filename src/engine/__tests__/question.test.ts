import { describe, expect, it } from 'vitest';
import { RECORDS } from '../duel';
import { askOf } from '../question';

describe('questions annoncées', () => {
  it('chaque record a une vraie question courte et une règle', () => {
    for (const record of Object.values(RECORDS)) {
      const ask = askOf(record);
      expect(ask.question, record.id).toMatch(/ \?$/);
      expect(ask.question.length, record.id).toBeLessThanOrEqual(40);
      expect(ask.rule, record.id).not.toBe('');
      if (record.question) expect(ask.rule, record.id).toBe('Le OUI l’emporte');
    }
  });
});
