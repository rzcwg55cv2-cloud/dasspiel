import { describe, expect, it } from 'vitest';
import { advance, extendGame, finishGame } from './engine';
import { formatClock, formatList, formatPercent } from './format';
import { computeSummary, getErrorCounts, getPlayerStats } from './stats';
import { MIN, SEC, T0, confirm, startedGame } from './test-utils';
import type { GameState } from './types';

/**
 * Spielt ein komplettes Spiel im normalen Modus mit einer Verlängerung (9 Runden).
 * Simon: 0 Fehler, Marvin: 1, Tino: 3, Malte: 4.
 */
function finishedExample(): GameState {
  const confirmations: string[][] = [
    ['p1', 'p2', 'p4'], // R1: Tino fehlt
    ['p1', 'p2', 'p3'], // R2: Malte fehlt
    ['p1', 'p2', 'p3', 'p4'], // R3: perfekt
    ['p1', 'p3'], // R4: Marvin, Malte fehlen
    ['p1', 'p2', 'p4'], // R5: Tino fehlt
    ['p1', 'p2', 'p3', 'p4'], // R6: perfekt
    ['p1', 'p2', 'p3'], // R7: Malte fehlt
    ['p1', 'p2', 'p4'], // R8: Tino fehlt
    ['p1', 'p2', 'p3'], // R9: Malte fehlt
  ];
  let state = startedGame(['Simon', 'Marvin', 'Tino', 'Malte']);
  confirmations.slice(0, 6).forEach((ids, i) => {
    state = confirm(state, ids, T0 + i * 10 * MIN + 30 * SEC);
  });
  state = advance(state, T0 + 60 * MIN).state;

  const extensionStart = T0 + 70 * MIN;
  state = extendGame(state, extensionStart).state;
  confirmations.slice(6).forEach((ids, i) => {
    state = confirm(state, ids, extensionStart + i * 10 * MIN + 30 * SEC);
  });
  state = advance(state, extensionStart + 30 * MIN).state;
  return finishGame(state, extensionStart + 31 * MIN).state;
}

describe('Statistik', () => {
  const state = finishedExample();
  const summary = computeSummary(state);

  it('zählt Fehler korrekt aus der Rundenhistorie', () => {
    expect(getErrorCounts(state)).toEqual({ p1: 0, p2: 1, p3: 3, p4: 4 });
    expect(summary.totalErrors).toBe(8);
  });

  it('berechnet Erfolgsquoten', () => {
    const rates = Object.fromEntries(summary.ranking.map((s) => [s.player.name, formatPercent(s.successRate)]));
    expect(rates).toEqual({
      Simon: '100 %',
      Marvin: '88,9 %',
      Tino: '66,7 %',
      Malte: '55,6 %',
    });
  });

  it('sortiert nach Fehlern', () => {
    expect(summary.ranking.map((s) => [s.rank, s.player.name, s.successes, s.errors])).toEqual([
      [1, 'Simon', 9, 0],
      [2, 'Marvin', 8, 1],
      [3, 'Tino', 6, 3],
      [4, 'Malte', 5, 4],
    ]);
  });

  it('berücksichtigt die Verlängerung', () => {
    expect(summary.roundsPlayed).toBe(9);
    expect(summary.extensionCount).toBe(1);
    expect(summary.playedSeconds).toBe(90 * 60);
    expect(summary.ranking[0].results.map((r) => r.roundNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('zählt perfekte Runden und findet die fehlerhafteste Runde', () => {
    expect(summary.perfectRounds).toBe(2);
    expect(summary.worstRound).toEqual({ roundNumbers: [4], errors: 2 });
    expect(summary.bestPlayers.map((p) => p.name)).toEqual(['Simon']);
    expect(summary.mostErrorPlayers.map((p) => p.name)).toEqual(['Malte']);
  });

  it('Gleichstände: gleicher Rang und mehrere beste bzw. schlechteste Teilnehmer', () => {
    let game = startedGame(['Anna', 'Ben', 'Cem', 'Dana']);
    game = confirm(game, ['p1', 'p2'], T0 + MIN); // Cem, Dana: je 1 Fehler
    game = confirm(game, ['p1', 'p2', 'p3', 'p4'], T0 + 11 * MIN);
    game = confirm(game, ['p1', 'p2', 'p3', 'p4'], T0 + 21 * MIN);
    game = confirm(game, ['p3', 'p4', 'p1', 'p2'], T0 + 31 * MIN);
    game = confirm(game, ['p1', 'p2', 'p3', 'p4'], T0 + 41 * MIN);
    game = confirm(game, ['p1', 'p2'], T0 + 51 * MIN); // Cem, Dana: je 1 weiterer Fehler
    game = finishGame(advance(game, T0 + 60 * MIN).state, T0 + 60 * MIN).state;

    const tie = computeSummary(game);
    expect(tie.ranking.map((s) => [s.rank, s.player.name])).toEqual([
      [1, 'Anna'],
      [1, 'Ben'],
      [3, 'Cem'],
      [3, 'Dana'],
    ]);
    expect(tie.bestPlayers.map((p) => p.name)).toEqual(['Anna', 'Ben']);
    expect(tie.mostErrorPlayers.map((p) => p.name)).toEqual(['Cem', 'Dana']);
    expect(tie.worstRound).toEqual({ roundNumbers: [1, 6], errors: 2 });
    expect(tie.perfectRounds).toBe(4);
  });

  it('fehlerfreies Spiel: keine fehlerhafteste Runde und niemand mit meisten Fehlern', () => {
    let game = startedGame(['Anna', 'Ben'], 'malte');
    for (let i = 0; i < 12; i += 1) game = confirm(game, ['p1', 'p2'], T0 + i * 5 * MIN + SEC);
    game = finishGame(advance(game, T0 + 60 * MIN).state, T0 + 60 * MIN).state;
    const perfect = computeSummary(game);
    expect(perfect.totalErrors).toBe(0);
    expect(perfect.perfectRounds).toBe(12);
    expect(perfect.worstRound).toBeNull();
    expect(perfect.mostErrorPlayers).toEqual([]);
    expect(getPlayerStats(game).every((s) => s.rank === 1 && s.successRate === 1)).toBe(true);
  });

  it('mehrere Verlängerungen im Malte-Spezial-Modus', () => {
    let game = advance(startedGame(['Anna'], 'malte'), T0 + 60 * MIN).state;
    game = advance(extendGame(game, T0 + 61 * MIN).state, T0 + 91 * MIN).state;
    game = advance(extendGame(game, T0 + 92 * MIN).state, T0 + 122 * MIN).state;
    game = finishGame(game, T0 + 123 * MIN).state;
    const result = computeSummary(game);
    expect(result.roundsPlayed).toBe(24);
    expect(result.extensionCount).toBe(2);
    expect(result.playedSeconds).toBe(120 * 60);
    expect(result.totalErrors).toBe(24);
  });
});

describe('Formatierung', () => {
  it('Zeit im Format MM:SS, auch über 60 Minuten', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(582)).toBe('09:42');
    expect(formatClock(3600)).toBe('60:00');
    expect(formatClock(74 * 60 + 12)).toBe('74:12');
  });

  it('Aufzählungen', () => {
    expect(formatList(['Simon'])).toBe('Simon');
    expect(formatList(['Simon', 'Tino'])).toBe('Simon und Tino');
    expect(formatList(['Simon', 'Marvin', 'Tino'])).toBe('Simon, Marvin und Tino');
  });
});
