import { describe, expect, it } from 'vitest';
import { getSchlemmerTime, isSchlemmerDue } from './schlemmersonntag';
import { MIN, SEC, T0 } from './test-utils';

describe('Schlemmersonntag', () => {
  it('kommt einmal in der ersten Stunde, nie auf einem Rundenende', () => {
    const minutes = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const startedAt = T0 + i * 7 * SEC;
      const phaseStart = Math.ceil(startedAt / MIN) * MIN;
      const offset = getSchlemmerTime(startedAt) - phaseStart;
      expect(offset).toBeGreaterThanOrEqual(3 * MIN + 30 * SEC);
      expect(offset).toBeLessThanOrEqual(56 * MIN + 30 * SEC);
      // 30 Sekunden nach der vollen Minute: Rundenenden (immer zur vollen Minute) sind weit weg.
      expect(offset % MIN).toBe(30 * SEC);
      minutes.add(offset / MIN);
    }
    // Zufällig verteilt statt immer zur selben Minute
    expect(minutes.size).toBeGreaterThan(40);
  });

  it('bleibt für dasselbe Spiel gleich', () => {
    expect(getSchlemmerTime(T0 + 12 * SEC)).toBe(getSchlemmerTime(T0 + 12 * SEC));
  });

  it('ist ab dem Zeitpunkt fällig und wird nachgeholt, wenn die App zu war', () => {
    const at = getSchlemmerTime(T0);
    expect(isSchlemmerDue(T0, at - 1)).toBe(false);
    expect(isSchlemmerDue(T0, at)).toBe(true);
    // Später nachgeholt – auch noch in der Verlängerung
    expect(isSchlemmerDue(T0, at + 7 * MIN)).toBe(true);
    expect(isSchlemmerDue(T0, at + 90 * MIN)).toBe(true);
  });

  it('wird nie kurz vor oder nach einem Rundenende nachgeholt', () => {
    const fullMinute = Math.ceil(getSchlemmerTime(T0) / MIN) * MIN + 5 * MIN;
    for (const offset of [-14 * SEC, -10 * SEC, -1, 0, 2 * SEC, 4 * SEC]) {
      expect(isSchlemmerDue(T0, fullMinute + offset)).toBe(false);
    }
    for (const offset of [5 * SEC, 20 * SEC, 45 * SEC]) {
      expect(isSchlemmerDue(T0, fullMinute + offset)).toBe(true);
    }
  });
});
