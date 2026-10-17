import { describe, expect, it } from 'vitest';
import { SCHLEMMER_WINDOW_MS, getSchlemmerTime, isSchlemmerDue } from './schlemmersonntag';
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

  it('ist nur kurz fällig', () => {
    const at = getSchlemmerTime(T0);
    expect(isSchlemmerDue(T0, at - 1)).toBe(false);
    expect(isSchlemmerDue(T0, at)).toBe(true);
    expect(isSchlemmerDue(T0, at + SCHLEMMER_WINDOW_MS - 1)).toBe(true);
    expect(isSchlemmerDue(T0, at + SCHLEMMER_WINDOW_MS)).toBe(false);
  });
});
