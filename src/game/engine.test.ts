import { describe, expect, it } from 'vitest';
import {
  addPlayer,
  advance,
  cancelGame,
  createInitialState,
  extendGame,
  finishGame,
  getClock,
  newGame,
  removePlayer,
  restartWithSameGroup,
  setMode,
  startGame,
  toggleConfirmation,
} from './engine';
import { getErrorCounts } from './stats';
import { MIN, SEC, T0, confirm, setupState, startedGame } from './test-utils';
import type { GameState } from './types';

const PLAYERS = ['Simon', 'Marvin', 'Tino', 'Malte'];

/** Spielt Runde für Runde und bestätigt dabei jeweils die angegebenen Spieler. */
function playRounds(state: GameState, rounds: string[][], roundMs: number, phaseStart: number): GameState {
  let next = state;
  rounds.forEach((ids, i) => {
    next = confirm(next, ids, phaseStart + i * roundMs + 30 * SEC);
  });
  return advance(next, phaseStart + rounds.length * roundMs).state;
}

describe('Teilnehmerverwaltung', () => {
  it('fügt Teilnehmer in Eingabereihenfolge hinzu', () => {
    const state = setupState(['Simon', 'Marvin', 'Tino']);
    expect(state.players.map((p) => p.name)).toEqual(['Simon', 'Marvin', 'Tino']);
  });

  it('verhindert leere Namen', () => {
    const result = addPlayer(createInitialState(), '   ');
    expect(result.error).toBe('empty');
    expect(result.state.players).toHaveLength(0);
  });

  it('verhindert doppelte Namen unabhängig von Groß-/Kleinschreibung und Leerzeichen', () => {
    const state = setupState(['Simon']);
    expect(addPlayer(state, ' simon ').error).toBe('duplicate');
    expect(addPlayer(state, 'SIMON').error).toBe('duplicate');
  });

  it('verhindert zu lange Namen und normalisiert Leerzeichen', () => {
    expect(addPlayer(createInitialState(), 'x'.repeat(41)).error).toBe('too-long');
    expect(addPlayer(createInitialState(), '  Anna   Lena ').state.players[0].name).toBe('Anna Lena');
  });

  it('entfernt einzelne Teilnehmer', () => {
    const state = removePlayer(setupState(['Simon', 'Marvin']), 'p1');
    expect(state.players.map((p) => p.name)).toEqual(['Marvin']);
  });

  it('startet ohne Teilnehmer nicht', () => {
    const state = createInitialState();
    expect(startGame(state, T0).state).toBe(state);
  });

  it('sperrt Teilnehmerliste und Modus nach Spielbeginn', () => {
    const game = startedGame(['Simon']);
    expect(addPlayer(game, 'Marvin').error).toBe('locked');
    expect(removePlayer(game, 'p1')).toBe(game);
    expect(setMode(game, 'malte')).toBe(game);
  });

  it('setzt beim Start alle Fehler auf null und beginnt Runde 1', () => {
    const game = startedGame(PLAYERS);
    expect(game.status).toBe('running');
    expect(game.currentRound).toBe(1);
    expect(game.roundHistory).toEqual([]);
    expect(game.phaseStartedAt).toBe(T0);
    expect(Object.values(getErrorCounts(game))).toEqual([0, 0, 0, 0]);
  });
});

describe('Rundenenden zur vollen Minute', () => {
  const START = T0 + 43 * MIN + 12 * SEC; // z. B. 20:43:12

  it('die erste Runde wird bis zur nächsten vollen Minute verlängert, danach normaler Takt', () => {
    const game = startGame(setupState(PLAYERS), START).state;
    const anchor = T0 + 44 * MIN; // 20:44:00
    expect(game.phaseStartedAt).toBe(anchor);
    expect(game.startedAt).toBe(START);

    // Runde 1 dauert 10:48 und endet zur vollen Minute (20:54:00)
    expect(advance(game, anchor + 10 * MIN - 1).state.currentRound).toBe(1);
    const round2 = advance(game, anchor + 10 * MIN);
    expect(round2.state.currentRound).toBe(2);
    expect(round2.events[0].endedAt).toBe(anchor + 10 * MIN);
    expect(getClock(game, START, 'main')?.roundRemainingSeconds).toBe(10 * 60 + 48);

    // Danach exakt alle 10 Minuten, immer zur vollen Minute
    const later = advance(game, anchor + 35 * MIN).state;
    expect(later.roundHistory.map((r) => (r.completedAt - anchor) / MIN)).toEqual([10, 20, 30]);
    expect(later.roundHistory.every((r) => r.completedAt % MIN === 0)).toBe(true);

    // Die Phase endet nach 60 Minuten ab der vollen Minute
    expect(advance(game, anchor + 60 * MIN - 1).state.status).toBe('running');
    expect(advance(game, anchor + 60 * MIN).state.status).toBe('extension-decision');
  });

  it('Start genau zur vollen Minute wird nicht verschoben', () => {
    expect(startGame(setupState(PLAYERS), T0).state.phaseStartedAt).toBe(T0);
    expect(startGame(setupState(PLAYERS), T0 + 1).state.phaseStartedAt).toBe(T0 + MIN);
  });

  it('auch nach einer Verlängerung enden die Runden zur vollen Minute', () => {
    const decision = advance(startedGame(PLAYERS), T0 + 60 * MIN).state;
    const extended = extendGame(decision, T0 + 72 * MIN + 30 * SEC).state;
    expect(extended.phaseStartedAt).toBe(T0 + 73 * MIN);
    expect(advance(extended, T0 + 83 * MIN).state.roundHistory.at(-1)?.completedAt).toBe(T0 + 83 * MIN);
  });

  it('Malte Spezial: erste Runde bis zur vollen Minute, dann alle 5 Minuten', () => {
    const game = startGame(setupState(PLAYERS, 'malte'), START).state;
    const anchor = T0 + 44 * MIN;
    expect(advance(game, anchor + 5 * MIN - 1).state.currentRound).toBe(1);
    expect(advance(game, anchor + 5 * MIN).state.currentRound).toBe(2);
    expect(advance(game, anchor + 10 * MIN).state.currentRound).toBe(3);
  });
});

describe('Normaler Modus', () => {
  it('eine Runde dauert exakt zehn Minuten', () => {
    const game = startedGame(PLAYERS);
    expect(getClock(game, T0)?.roundRemainingSeconds).toBe(600);

    const justBefore = advance(game, T0 + 10 * MIN - 1).state;
    expect(justBefore.currentRound).toBe(1);
    expect(justBefore.roundHistory).toHaveLength(0);
    expect(getClock(justBefore, T0 + 10 * MIN - 1)?.roundRemainingSeconds).toBe(1);

    const atEnd = advance(game, T0 + 10 * MIN).state;
    expect(atEnd.currentRound).toBe(2);
    expect(atEnd.roundHistory).toHaveLength(1);
    expect(getClock(atEnd, T0 + 10 * MIN)?.roundRemainingSeconds).toBe(600);
  });

  it('nach sechs Runden endet die erste Phase', () => {
    const game = startedGame(PLAYERS);
    const round6 = advance(game, T0 + 60 * MIN - 1).state;
    expect(round6.status).toBe('running');
    expect(round6.currentRound).toBe(6);

    const { state, events } = advance(game, T0 + 60 * MIN);
    expect(state.status).toBe('extension-decision');
    expect(state.roundHistory.map((r) => r.roundNumber)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(state.completedPlaySeconds).toBe(3600);
    expect(events.at(-1)?.phaseEnded).toBe(true);
  });

  it('nach 60 Minuten wird keine neue Runde automatisch gestartet', () => {
    const decision = advance(startedGame(PLAYERS), T0 + 60 * MIN).state;
    const later = advance(decision, T0 + 5 * 60 * MIN);
    expect(later.state).toBe(decision);
    expect(later.events).toEqual([]);
    expect(getClock(decision, T0 + 61 * MIN)).toBeNull();
  });

  it('zeigt Gesamtzeit und Fortschritt der Phase', () => {
    const game = startedGame(PLAYERS);
    const clock = getClock(advance(game, T0 + 23 * MIN + 18 * SEC).state, T0 + 23 * MIN + 18 * SEC);
    expect(clock?.playedSeconds).toBe(23 * 60 + 18);
    expect(clock?.plannedSeconds).toBe(3600);
    expect(clock?.roundNumber).toBe(3);
    expect(clock?.phaseProgress).toBeCloseTo((23 * 60 + 18) / 3600);
  });
});

describe('Malte Spezial', () => {
  it('eine Runde dauert exakt fünf Minuten', () => {
    const game = startedGame(PLAYERS, 'malte');
    expect(getClock(game, T0)?.roundRemainingSeconds).toBe(300);
    expect(advance(game, T0 + 5 * MIN - 1).state.currentRound).toBe(1);
    expect(advance(game, T0 + 5 * MIN).state.currentRound).toBe(2);
  });

  it('nach zwölf Runden endet die erste Phase', () => {
    const game = startedGame(PLAYERS, 'malte');
    expect(advance(game, T0 + 60 * MIN - 1).state.currentRound).toBe(12);
    const { state } = advance(game, T0 + 60 * MIN);
    expect(state.status).toBe('extension-decision');
    expect(state.roundHistory).toHaveLength(12);
  });
});

describe('Verlängerungen', () => {
  it('normale Verlängerung: drei Runden à 10 Minuten, exakt 30 Minuten', () => {
    const decision = advance(startedGame(PLAYERS), T0 + 60 * MIN).state;
    const extendAt = T0 + 75 * MIN; // 15 Minuten Entscheidungspause
    const extended = extendGame(decision, extendAt).state;

    expect(extended.status).toBe('running');
    expect(extended.extensionCount).toBe(1);
    expect(extended.currentRound).toBe(7);
    expect(extended.currentConfirmations).toEqual({});
    expect(getClock(extended, extendAt)?.playedSeconds).toBe(3600);
    expect(getClock(extended, extendAt)?.plannedSeconds).toBe(5400);

    expect(advance(extended, extendAt + 10 * MIN).state.currentRound).toBe(8);
    expect(advance(extended, extendAt + 20 * MIN).state.currentRound).toBe(9);
    expect(advance(extended, extendAt + 30 * MIN - 1).state.status).toBe('running');

    const end = advance(extended, extendAt + 30 * MIN).state;
    expect(end.status).toBe('extension-decision');
    expect(end.roundHistory).toHaveLength(9);
    expect(end.completedPlaySeconds).toBe(5400);
  });

  it('Malte-Spezial-Verlängerung: sechs Runden à 5 Minuten (Runden 13–18)', () => {
    const decision = advance(startedGame(PLAYERS, 'malte'), T0 + 60 * MIN).state;
    const extended = extendGame(decision, T0 + 61 * MIN).state;
    expect(extended.currentRound).toBe(13);
    expect(advance(extended, T0 + 61 * MIN + 25 * MIN).state.currentRound).toBe(18);
    const end = advance(extended, T0 + 61 * MIN + 30 * MIN).state;
    expect(end.status).toBe('extension-decision');
    expect(end.roundHistory.map((r) => r.roundNumber)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
  });

  it('mehrere Verlängerungen hintereinander funktionieren', () => {
    let state = startedGame(PLAYERS);
    let t = T0 + 60 * MIN;
    state = advance(state, t).state;
    for (let i = 1; i <= 3; i += 1) {
      t += 2 * MIN; // Entscheidungspause
      state = extendGame(state, t).state;
      t += 30 * MIN;
      state = advance(state, t).state;
      expect(state.status).toBe('extension-decision');
      expect(state.extensionCount).toBe(i);
      expect(state.roundHistory).toHaveLength(6 + 3 * i);
      expect(state.completedPlaySeconds).toBe(3600 + 1800 * i);
    }
  });

  it('während der Entscheidung läuft keine Spielzeit', () => {
    const decision = advance(startedGame(PLAYERS), T0 + 60 * MIN).state;
    const extended = extendGame(decision, T0 + 3 * 60 * MIN).state;
    expect(getClock(extended, T0 + 3 * 60 * MIN)?.playedSeconds).toBe(3600);
    expect(getClock(extended, T0 + 3 * 60 * MIN)?.roundRemainingSeconds).toBe(600);
  });

  it('doppeltes Klicken auf Verlängern verlängert nur einmal', () => {
    const decision = advance(startedGame(PLAYERS), T0 + 60 * MIN).state;
    const once = extendGame(decision, T0 + 61 * MIN).state;
    const twice = extendGame(once, T0 + 61 * MIN + 100).state;
    expect(twice).toBe(once);
    expect(twice.extensionCount).toBe(1);
  });

  it('Verlängern ist während einer laufenden Phase nicht möglich', () => {
    const game = startedGame(PLAYERS);
    expect(extendGame(game, T0 + MIN).state).toBe(game);
  });
});

describe('Bestätigungen und Fehler', () => {
  it('fehlende X erzeugen individuelle Fehler, gesetzte X verhindern sie', () => {
    let game = startedGame(PLAYERS);
    game = confirm(game, ['p1', 'p2', 'p4'], T0 + 2 * MIN);
    const { state, events } = advance(game, T0 + 10 * MIN);

    expect(state.roundHistory[0].playerResults).toEqual({ p1: true, p2: true, p3: false, p4: true });
    expect(events).toEqual([
      {
        group: 'main',
        roundNumber: 1,
        endedAt: T0 + 10 * MIN,
        failedPlayerIds: ['p3'],
        doubledPenaltyIds: [],
        penalties: { p3: 1 },
        phaseEnded: false,
      },
    ]);
    expect(getErrorCounts(state)).toEqual({ p1: 0, p2: 0, p3: 1, p4: 0 });
  });

  it('mehrere fehlende X erzeugen mehrere Fehler in derselben Runde', () => {
    let game = startedGame(PLAYERS);
    game = confirm(game, ['p3'], T0 + MIN);
    const { state, events } = advance(game, T0 + 10 * MIN);
    expect(events[0].failedPlayerIds).toEqual(['p1', 'p2', 'p4']);
    expect(getErrorCounts(state)).toEqual({ p1: 1, p2: 1, p3: 0, p4: 1 });
  });

  it('Fehler sammeln sich über alle Runden', () => {
    const game = startedGame(PLAYERS);
    const state = playRounds(
      game,
      [
        ['p1', 'p2', 'p4'],
        ['p2', 'p3'],
      ],
      10 * MIN,
      T0,
    );
    expect(getErrorCounts(state)).toEqual({ p1: 1, p2: 0, p3: 1, p4: 1 });
  });

  it('erneutes Antippen entfernt das X während der laufenden Runde', () => {
    let game = startedGame(PLAYERS);
    game = toggleConfirmation(game, 'p1', T0 + MIN).state;
    expect(game.currentConfirmations).toEqual({ p1: true });
    game = toggleConfirmation(game, 'p1', T0 + 2 * MIN).state;
    expect(game.currentConfirmations).toEqual({});
    expect(advance(game, T0 + 10 * MIN).state.roundHistory[0].playerResults.p1).toBe(false);
  });

  it('nach Rundenende ist keine nachträgliche Änderung möglich', () => {
    let game = startedGame(PLAYERS);
    game = advance(game, T0 + 10 * MIN).state;
    // Ein X nach Rundenende zählt für die neue Runde, nicht rückwirkend.
    game = toggleConfirmation(game, 'p1', T0 + 10 * MIN + 1).state;
    expect(game.roundHistory[0].playerResults.p1).toBe(false);
    expect(game.currentRound).toBe(2);
    expect(game.currentConfirmations).toEqual({ p1: true });
  });

  it('ein verspätet verarbeiteter Tipp wird nicht der abgelaufenen Runde zugeordnet', () => {
    // Der Zustand wurde zuletzt in Runde 1 aktualisiert, der Tipp kommt aber erst in Runde 2 an.
    const game = startedGame(PLAYERS);
    const { state, events } = toggleConfirmation(game, 'p1', T0 + 10 * MIN + 5 * SEC);
    expect(events).toHaveLength(1);
    expect(state.roundHistory[0].playerResults.p1).toBe(false);
    expect(state.currentConfirmations).toEqual({ p1: true });
  });

  it('nach Spielende und während der Entscheidung sind keine Bestätigungen möglich', () => {
    const decision = advance(startedGame(PLAYERS), T0 + 60 * MIN).state;
    expect(toggleConfirmation(decision, 'p1', T0 + 61 * MIN).state).toBe(decision);
    const finished = finishGame(decision, T0 + 61 * MIN).state;
    expect(toggleConfirmation(finished, 'p1', T0 + 62 * MIN).state).toBe(finished);
  });

  it('wertet jede Runde genau einmal aus', () => {
    const game = startedGame(PLAYERS);
    const first = advance(game, T0 + 10 * MIN);
    const second = advance(first.state, T0 + 10 * MIN);
    expect(second.state).toBe(first.state);
    expect(second.events).toEqual([]);
    expect(first.state.roundHistory).toHaveLength(1);
  });

  it('wertet bei verpassten Runden jede Runde einzeln aus', () => {
    let game = startedGame(PLAYERS);
    game = confirm(game, ['p1', 'p2', 'p3', 'p4'], T0 + MIN);
    const { state, events } = advance(game, T0 + 35 * MIN);
    expect(events.map((e) => e.roundNumber)).toEqual([1, 2, 3]);
    expect(events.map((e) => e.failedPlayerIds.length)).toEqual([0, 4, 4]);
    expect(state.currentRound).toBe(4);
    expect(state.currentConfirmations).toEqual({});
  });

  it('es gibt keine Disqualifikation', () => {
    const state = advance(startedGame(PLAYERS), T0 + 50 * MIN).state;
    expect(getErrorCounts(state).p1).toBe(5);
    expect(toggleConfirmation(state, 'p1', T0 + 51 * MIN).state.currentConfirmations).toEqual({ p1: true });
  });
});

describe('Spielende und Neustart', () => {
  it('Spiel beenden ist nur nach Ablauf einer Phase möglich', () => {
    const game = startedGame(PLAYERS);
    expect(finishGame(game, T0 + MIN).state).toBe(game);
  });

  it('beendet das Spiel und behält die Historie', () => {
    const decision = advance(startedGame(PLAYERS), T0 + 60 * MIN).state;
    const finished = finishGame(decision, T0 + 65 * MIN).state;
    expect(finished.status).toBe('finished');
    expect(finished.finishedAt).toBe(T0 + 65 * MIN);
    expect(finished.roundHistory).toHaveLength(6);
  });

  it('gleiche Gruppe: gleiche Teilnehmer und Modus, alles andere zurückgesetzt', () => {
    let state = advance(startedGame(PLAYERS, 'malte'), T0 + 60 * MIN).state;
    state = extendGame(state, T0 + 61 * MIN).state;
    state = advance(state, T0 + 91 * MIN).state;
    state = finishGame(state, T0 + 92 * MIN).state;

    const restarted = restartWithSameGroup(state, T0 + 100 * MIN).state;
    expect(restarted.status).toBe('running');
    expect(restarted.mode).toBe('malte');
    expect(restarted.players).toEqual(state.players);
    expect(restarted.extensionCount).toBe(0);
    expect(restarted.roundHistory).toEqual([]);
    expect(restarted.currentRound).toBe(1);
    expect(restarted.completedPlaySeconds).toBe(0);
    expect(getClock(restarted, T0 + 100 * MIN)?.plannedSeconds).toBe(3600);
  });

  it('neues Spiel: zurück zum Start ohne Teilnehmer, Modus wieder normal', () => {
    let state = advance(startedGame(PLAYERS, 'malte'), T0 + 60 * MIN).state;
    state = finishGame(state, T0 + 61 * MIN).state;
    const fresh = newGame(state);
    expect(fresh).toEqual(createInitialState());
  });

  it('Abbrechen verwirft das Spiel, behält aber Teilnehmer und Modus', () => {
    const game = advance(startedGame(PLAYERS, 'malte'), T0 + 20 * MIN).state;
    const cancelled = cancelGame(game);
    expect(cancelled.status).toBe('setup');
    expect(cancelled.roundHistory).toEqual([]);
    expect(cancelled.players).toEqual(game.players);
    expect(cancelled.mode).toBe('malte');
  });
});
