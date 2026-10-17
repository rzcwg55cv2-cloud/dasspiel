import { describe, expect, it } from 'vitest';
import { advance } from './engine';
import { LIVE_EVENT_WINDOW_MS, getFeedback } from './feedback';
import { MIN, SEC, T0, confirm, startedGame } from './test-utils';

const PLAYERS = ['Simon', 'Marvin', 'Tino'];

describe('Sounds und Rundenwechsel', () => {
  it('Fehlersound ertönt nur einmal, auch bei mehreren Fehlern in einer Runde', () => {
    const game = confirm(startedGame(PLAYERS), ['p3'], T0 + MIN);
    const { events } = advance(game, T0 + 10 * MIN);
    expect(events).toHaveLength(1);
    expect(events[0].failedPlayerIds).toEqual(['p1', 'p2']);

    const feedback = getFeedback(events, T0 + 10 * MIN);
    expect(feedback.sound).toBe('error');
    expect(feedback.liveRounds.map((e) => e.roundNumber)).toEqual([1]);
    expect(feedback.catchUp).toBeNull();
  });

  it('positiver Sound, wenn alle bestätigt wurden', () => {
    const game = confirm(startedGame(PLAYERS), ['p1', 'p2', 'p3'], T0 + MIN);
    const { events } = advance(game, T0 + 10 * MIN + 200);
    expect(getFeedback(events, T0 + 10 * MIN + 200).sound).toBe('success');
  });

  it('kein Sound ohne Rundenende', () => {
    const { events } = advance(startedGame(PLAYERS), T0 + 5 * MIN);
    expect(getFeedback(events, T0 + 5 * MIN)).toEqual({ sound: null, liveRounds: [], catchUp: null });
  });

  it('nach längerer Abwesenheit: keine Sounds, sondern eine Zusammenfassung', () => {
    const { events } = advance(startedGame(PLAYERS), T0 + 32 * MIN);
    const feedback = getFeedback(events, T0 + 32 * MIN);
    expect(feedback.sound).toBeNull();
    expect(feedback.liveRounds).toEqual([]);
    expect(feedback.catchUp).toEqual({ rounds: 3, errors: 9 });
  });

  it('kurz verspätete Auswertung (z. B. gedrosselter Hintergrund-Tab) zählt noch als live', () => {
    const now = T0 + 10 * MIN + LIVE_EVENT_WINDOW_MS;
    const { events } = advance(startedGame(PLAYERS), now);
    expect(getFeedback(events, now).sound).toBe('error');
    expect(getFeedback(events, now + SEC).sound).toBeNull();
  });
});
