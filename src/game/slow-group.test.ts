import { describe, expect, it } from 'vitest';
import {
  advance,
  cancelGame,
  extendGame,
  finishGame,
  getClock,
  getStartBlocker,
  isSlowGroupPlanned,
  restartWithSameGroup,
  setMode,
  setPlayerGroup,
  setSlowGroupEnabled,
  startGame,
  toggleConfirmation,
} from './engine';
import { getFeedback } from './feedback';
import { getDecisionText } from './sayings';
import { computeSummary, getErrorCounts } from './stats';
import { deserializeState, parseState } from './storage';
import { MIN, T0, setupState } from './test-utils';
import type { GameState } from './types';

/** Simon (p1) und Marvin (p2) im 10-Minuten-Takt, Anna (p3) und Malte (p4) im 15-Minuten-Takt. */
function mixedSetup(): GameState {
  let state = setupState(['Simon', 'Marvin', 'Anna', 'Malte']);
  state = setSlowGroupEnabled(state, true);
  state = setPlayerGroup(state, 'p3', 'slow');
  return setPlayerGroup(state, 'p4', 'slow');
}

function mixedGame(): GameState {
  return startGame(mixedSetup(), T0).state;
}

function toggle(state: GameState, ids: string[], at: number): GameState {
  let next = state;
  for (const id of ids) next = toggleConfirmation(next, id, at).state;
  return next;
}

describe('15-Minuten-Takt: Einrichtung', () => {
  it('startet eine zweite Rundenspur nur mit Haken und zugeordneten Personen', () => {
    const game = mixedGame();
    expect(game.slow).toEqual({ currentRound: 1, currentConfirmations: {}, currentConfirmedAt: {}, currentPenaltiesPaid: {}, roundHistory: [] });

    const withoutHook = startGame(setSlowGroupEnabled(mixedSetup(), false), T0).state;
    expect(withoutHook.slow).toBeNull();

    const nobodySlow = startGame(setSlowGroupEnabled(setupState(['Simon', 'Anna']), true), T0).state;
    expect(nobodySlow.slow).toBeNull();
  });

  it('Malte Spezial bleibt extra: kein 15-Minuten-Takt', () => {
    const malte = setMode(mixedSetup(), 'malte');
    expect(isSlowGroupPlanned(malte)).toBe(false);
    expect(startGame(malte, T0).state.slow).toBeNull();
  });

  it('mindestens eine Person muss im 10-Minuten-Takt spielen', () => {
    let state = mixedSetup();
    state = setPlayerGroup(state, 'p1', 'slow');
    state = setPlayerGroup(state, 'p2', 'slow');
    expect(getStartBlocker(state)).toBe('no-main-players');
    expect(startGame(state, T0).state).toBe(state);
  });

  it('Gruppen lassen sich nach Spielbeginn nicht mehr ändern', () => {
    const game = mixedGame();
    expect(setPlayerGroup(game, 'p1', 'slow')).toBe(game);
    expect(setSlowGroupEnabled(game, false)).toBe(game);
  });
});

describe('15-Minuten-Takt: Ablauf', () => {
  it('eine Runde dauert 15 Minuten, unabhängig vom 10-Minuten-Takt', () => {
    const game = mixedGame();
    expect(getClock(game, T0, 'slow')?.roundRemainingSeconds).toBe(900);
    expect(getClock(game, T0, 'main')?.roundRemainingSeconds).toBe(600);

    const at10 = advance(game, T0 + 10 * MIN).state;
    expect(at10.currentRound).toBe(2);
    expect(at10.slow?.currentRound).toBe(1);

    const at15 = advance(game, T0 + 15 * MIN).state;
    expect(at15.slow?.currentRound).toBe(2);
    expect(getClock(at15, T0 + 15 * MIN, 'slow')?.roundRemainingSeconds).toBe(900);
  });

  it('die 15er bekommen bei ihrem Rundenende ihren eigenen Ton', () => {
    const game = advance(mixedGame(), T0 + 10 * MIN).state;
    const { events } = advance(game, T0 + 15 * MIN);
    expect(getFeedback(events, T0 + 15 * MIN).sounds).toEqual([{ kind: 'error', group: 'slow' }]);
  });

  it('Haken landen in der Runde der eigenen Gruppe', () => {
    const game = toggle(mixedGame(), ['p1', 'p3'], T0 + MIN);
    expect(game.currentConfirmations).toEqual({ p1: true });
    expect(game.slow?.currentConfirmations).toEqual({ p3: true });
  });

  it('erste Phase: 6 Runden à 10 Minuten und 4 Runden à 15 Minuten, dann Verlängerungsfrage', () => {
    const { state } = advance(mixedGame(), T0 + 60 * MIN);
    expect(state.status).toBe('extension-decision');
    expect(state.roundHistory).toHaveLength(6);
    expect(state.slow?.roundHistory).toHaveLength(4);
    expect(Object.keys(state.roundHistory[0].playerResults)).toEqual(['p1', 'p2']);
    expect(Object.keys(state.slow!.roundHistory[0].playerResults)).toEqual(['p3', 'p4']);
  });

  it('bei Minute 30 enden beide Runden gleichzeitig: eine Einblendung, je Gruppe ein eigener Ton', () => {
    let game = advance(mixedGame(), T0 + 29 * MIN).state;
    game = toggle(game, ['p1', 'p2', 'p3'], T0 + 29 * MIN);
    const { events } = advance(game, T0 + 30 * MIN);
    expect(events.map((e) => [e.group, e.roundNumber, e.failedPlayerIds])).toEqual([
      ['main', 3, []],
      ['slow', 2, ['p4']],
    ]);
    const feedback = getFeedback(events, T0 + 30 * MIN);
    // Erst der Ton des 10-Minuten-Takts (alle geliefert), dann der eigene X-Ton der 15er
    expect(feedback.sounds).toEqual([
      { kind: 'success', group: 'main' },
      { kind: 'error', group: 'slow' },
    ]);
    expect(feedback.liveRounds).toHaveLength(2);
    expect(feedback.catchUp).toBeNull();
  });

  it('Verlängerung: 2 Runden à 15 Minuten neben 3 Runden à 10 Minuten', () => {
    const decision = advance(mixedGame(), T0 + 60 * MIN).state;
    const extended = extendGame(decision, T0 + 65 * MIN).state;
    expect(extended.currentRound).toBe(7);
    expect(extended.slow?.currentRound).toBe(5);
    expect(advance(extended, T0 + 80 * MIN).state.slow?.currentRound).toBe(6);

    const end = advance(extended, T0 + 95 * MIN).state;
    expect(end.status).toBe('extension-decision');
    expect(end.roundHistory).toHaveLength(9);
    expect(end.slow?.roundHistory).toHaveLength(6);
  });

  it('X zählen nur in den Runden der eigenen Gruppe', () => {
    // Niemand setzt einen Haken: 6 X im 10-Minuten-Takt, 4 X im 15-Minuten-Takt.
    const state = advance(mixedGame(), T0 + 60 * MIN).state;
    expect(getErrorCounts(state)).toEqual({ p1: 6, p2: 6, p3: 4, p4: 4 });
  });

  it('Abbrechen und gleiche Gruppe behalten die Gruppen', () => {
    const cancelled = cancelGame(mixedGame());
    expect(cancelled.slowGroupEnabled).toBe(true);
    expect(cancelled.players.map((p) => p.group)).toEqual(['main', 'main', 'slow', 'slow']);

    const finished = finishGame(advance(mixedGame(), T0 + 60 * MIN).state, T0 + 61 * MIN).state;
    const again = restartWithSameGroup(finished, T0 + 70 * MIN).state;
    expect(again.slow).toEqual({ currentRound: 1, currentConfirmations: {}, currentConfirmedAt: {}, currentPenaltiesPaid: {}, roundHistory: [] });
  });
});

describe('15-Minuten-Takt: volle Minute', () => {
  it('auch die erste 15-Minuten-Runde wird bis zur nächsten vollen Minute verlängert', () => {
    const start = T0 + 43 * MIN + 12_000;
    const anchor = T0 + 44 * MIN;
    const game = startGame(mixedSetup(), start).state;
    expect(advance(game, anchor + 15 * MIN - 1).state.slow?.currentRound).toBe(1);
    expect(advance(game, anchor + 15 * MIN).state.slow?.currentRound).toBe(2);
    expect(advance(game, anchor + 30 * MIN).state.slow?.roundHistory.map((r) => r.completedAt)).toEqual([
      anchor + 15 * MIN,
      anchor + 30 * MIN,
    ]);
  });
});

describe('15-Minuten-Takt: Auswertung', () => {
  /** Simon liefert immer, Marvin nie; Anna liefert immer, Malte einmal nicht. */
  function playedGame(): GameState {
    let game = mixedGame();
    for (let minute = 1; minute < 60; minute += 1) {
      const at = T0 + minute * MIN;
      game = advance(game, at).state;
      if (!game.currentConfirmations.p1) game = toggle(game, ['p1'], at);
      if (!game.slow!.currentConfirmations.p3) game = toggle(game, ['p3'], at);
      if (game.slow!.currentRound !== 2 && !game.slow!.currentConfirmations.p4) game = toggle(game, ['p4'], at);
    }
    return finishGame(advance(game, T0 + 60 * MIN).state, T0 + 61 * MIN).state;
  }

  it('Ranglisten getrennt je Gruppe', () => {
    const summary = computeSummary(playedGame());
    expect(summary.groups.map((g) => [g.group, g.roundsPlayed])).toEqual([
      ['main', 6],
      ['slow', 4],
    ]);
    expect(summary.groups[0].ranking.map((s) => [s.rank, s.player.name, s.errors, s.rounds])).toEqual([
      [1, 'Simon', 0, 6],
      [2, 'Marvin', 6, 6],
    ]);
    expect(summary.groups[1].ranking.map((s) => [s.rank, s.player.name, s.errors, s.rounds])).toEqual([
      [1, 'Anna', 0, 4],
      [2, 'Malte', 1, 4],
    ]);
  });

  it('Statistik über beide Gruppen', () => {
    const summary = computeSummary(playedGame());
    expect(summary.totalErrors).toBe(7);
    expect(summary.totalRounds).toBe(10);
    expect(summary.perfectRounds).toBe(3); // 15-Minuten-Runden 1, 3 und 4
    expect(summary.worstRound).toEqual({
      errors: 1,
      rounds: [1, 2, 3, 4, 5, 6].map((roundNumber) => ({ group: 'main', roundNumber })).concat({
        group: 'slow',
        roundNumber: 2,
      }),
    });
    expect(summary.bestPlayers.map((p) => p.name)).toEqual(['Simon', 'Anna']);
    expect(summary.mostErrorPlayers.map((p) => p.name)).toEqual(['Marvin']);
    // Je Takt, weil der 15-Minuten-Takt weniger Runden hat
    expect(summary.groups.map((g) => g.bestPlayers.map((p) => p.name))).toEqual([['Simon'], ['Anna']]);
    expect(summary.groups.map((g) => g.mostErrorPlayers.map((p) => p.name))).toEqual([['Marvin'], ['Malte']]);
  });

  it('Sprüche: X-Anteil über alle Teilnehmer-Runden beider Gruppen', () => {
    // 7 X bei 2×6 + 2×4 = 20 Teilnehmer-Runden = 35 % → viele X
    expect(getDecisionText(advance(playedGameWithoutFinish(), T0 + 60 * MIN).state).mood).toBe('bad');
  });

  function playedGameWithoutFinish(): GameState {
    const finished = playedGame();
    return { ...finished, status: 'extension-decision', finishedAt: null };
  }
});

describe('15-Minuten-Takt: Speichern', () => {
  it('Reload mit beiden Gruppen stellt alles wieder her', () => {
    const game = toggle(advance(mixedGame(), T0 + 20 * MIN).state, ['p2', 'p4'], T0 + 20 * MIN);
    const loaded = deserializeState(JSON.stringify(game));
    expect(loaded.recovered).toBe(false);
    expect(loaded.state).toEqual(game);
  });

  it('übernimmt Spielstände der Version 1 (ohne Gruppen)', () => {
    const v1 = {
      version: 1,
      status: 'running',
      mode: 'normal',
      players: [
        { id: 'p1', name: 'Simon' },
        { id: 'p2', name: 'Tino' },
      ],
      extensionCount: 0,
      phaseStartedAt: T0,
      completedPlaySeconds: 0,
      currentRound: 2,
      currentConfirmations: { p1: true },
      roundHistory: [{ roundNumber: 1, playerResults: { p1: true, p2: false }, completedAt: T0 + 10 * MIN }],
      startedAt: T0,
      finishedAt: null,
    };
    const state = parseState(v1);
    expect(state?.version).toBe(2);
    expect(state?.players.map((p) => p.group)).toEqual(['main', 'main']);
    expect(state?.slow).toBeNull();
    expect(state?.slowGroupEnabled).toBe(false);
    expect(state?.currentConfirmations).toEqual({ p1: true });
    expect(getErrorCounts(state!)).toEqual({ p1: 0, p2: 1 });
  });

  it('verwirft widersprüchliche Gruppen-Daten', () => {
    const game = mixedGame();
    expect(parseState({ ...game, mode: 'malte' })).toBeNull();
    expect(parseState({ ...game, players: game.players.map((p) => ({ ...p, group: 'main' })) })).toBeNull();
    expect(parseState({ ...game, slow: { ...game.slow, currentRound: 9 } })).toBeNull();
    expect(parseState({ ...game, players: [{ ...game.players[0], group: 'schnell' }] })).toBeNull();
  });
});
