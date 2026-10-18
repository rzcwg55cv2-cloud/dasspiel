import { describe, expect, it } from 'vitest';
import { BIERWISSEN, FACT_SLOT_MS, FACT_WINDOW_MS, getDueFact, getFactDuration, getFactSlots, shuffledIndices } from './bierwissen';
import { advance, extendGame, setPlayerGroup, setSlowGroupEnabled, startGame } from './engine';
import { getSchlemmerTime } from './schlemmersonntag';
import { MIN, SEC, T0, setupState, startedGame } from './test-utils';
import type { GameState } from './types';

/** Abstand (ms) von `offset` zum nächsten Rundenende bei Runden der Länge `duration`. */
function gapToRoundEnd(offset: number, duration: number): number {
  const since = offset % duration;
  return Math.min(since, duration - since);
}

function expectWellPlaced(game: GameState, roundMinutes: number[], slotCount: number) {
  for (let i = 0; i < 60; i++) {
    const state = { ...game, startedAt: T0 + i * 13 * SEC };
    const slots = getFactSlots(state);
    expect(slots).toHaveLength(slotCount);
    slots.forEach((slot, index) => {
      const offset = slot.at - state.phaseStartedAt!;
      // Genau einer pro 10-Minuten-Abschnitt
      expect(Math.floor(offset / FACT_SLOT_MS)).toBe(index);
      expect(offset % MIN).toBe(30 * SEC);
      for (const minutes of roundMinutes) expect(gapToRoundEnd(offset, minutes * MIN)).toBeGreaterThanOrEqual(90 * SEC);
    });
  }
}

describe('Bierwissen', () => {
  it('hat 100 verschiedene, kurze Quatsch-Fakten', () => {
    expect(BIERWISSEN).toHaveLength(100);
    expect(new Set(BIERWISSEN).size).toBe(100);
    for (const fact of BIERWISSEN) expect(fact.length).toBeLessThanOrEqual(120);
  });

  it('einmal pro 10-Minuten-Abschnitt, nie kurz vor oder nach einem Rundenende', () => {
    expectWellPlaced(startedGame(['Simon', 'Marvin']), [10], 6);
  });

  it('beachtet auch die Rundenenden des 15-Minuten-Takts und von Malte Spezial', () => {
    let setup = setSlowGroupEnabled(setupState(['Simon', 'Marvin']), true);
    setup = setPlayerGroup(setup, 'p2', 'slow');
    expectWellPlaced(startGame(setup, T0).state, [10, 15], 6);
    expectWellPlaced(startedGame(['Simon'], 'malte'), [5], 6);
  });

  it('läuft in der Verlängerung weiter (drei Abschnitte à 10 Minuten)', () => {
    const decision = advance(startedGame(['Simon']), T0 + 60 * MIN).state;
    const extended = extendGame(decision, T0 + 62 * MIN).state;
    expectWellPlaced(extended, [10], 3);
  });

  it('hält Abstand zum Schlemmersonntag', () => {
    for (let i = 0; i < 200; i++) {
      const game = startedGame(['Simon'], 'normal', T0 + i * 17 * SEC);
      const schlemmer = getSchlemmerTime(game.startedAt!);
      for (const slot of getFactSlots(game)) expect(Math.abs(slot.at - schlemmer)).toBeGreaterThanOrEqual(2 * MIN);
    }
  });

  it('ist nur kurz fällig und bleibt nach dem Neuladen gleich', () => {
    const game = startedGame(['Simon']);
    const [first] = getFactSlots(game);
    expect(getFactSlots(game)[0]).toEqual(first);
    expect(getDueFact(game, first.at - 1)).toBeNull();
    expect(getDueFact(game, first.at)?.id).toBe(first.id);
    expect(getDueFact(game, first.at + FACT_WINDOW_MS)).toBeNull();
  });

  it('Anzeigedauer 7 bis 12 Sekunden und Mischen ohne Doppelte', () => {
    expect(getFactDuration('kurz')).toBe(7 * SEC);
    expect(getFactDuration('x'.repeat(200))).toBe(12 * SEC);
    expect([...shuffledIndices(100)].sort((a, b) => a - b)).toEqual(Array.from({ length: 100 }, (_, i) => i));
  });
});
