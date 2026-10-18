import { describe, expect, it } from 'vitest';
import { advance, createInitialState, extendGame, finishGame, getClock } from './engine';
import { getFeedback } from './feedback';
import { getErrorCounts } from './stats';
import {
  DEFAULT_SETTINGS,
  STATE_KEY,
  deserializeState,
  loadSettings,
  loadState,
  parseState,
  saveSettings,
  saveState,
  type KeyValueStorage,
} from './storage';
import { MIN, SEC, T0, confirm, setupState, startedGame } from './test-utils';
import type { GameState } from './types';

const PLAYERS = ['Simon', 'Marvin', 'Tino', 'Malte'];

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

/** Speichert den Zustand, „lädt die Seite neu“ und wertet bis `now` aus – wie beim Öffnen der App. */
function reload(state: GameState, now: number) {
  const storage = new MemoryStorage();
  saveState(state, storage);
  const loaded = loadState(storage);
  expect(loaded.recovered).toBe(false);
  return advance(loaded.state, now);
}

describe('Speichern und Wiederherstellen', () => {
  it('Reload während einer laufenden Runde', () => {
    let game = startedGame(PLAYERS);
    game = confirm(game, ['p1', 'p3'], T0 + 4 * MIN);
    const { state, events } = reload(game, T0 + 5 * MIN);
    expect(state).toEqual(game);
    expect(events).toEqual([]);
    expect(getClock(state, T0 + 5 * MIN)?.roundRemainingSeconds).toBe(300);
  });

  it('Reload genau an einer Rundengrenze wertet die Runde genau einmal aus', () => {
    let game = startedGame(PLAYERS);
    game = confirm(game, ['p1'], T0 + MIN);
    const first = reload(game, T0 + 10 * MIN);
    expect(first.state.currentRound).toBe(2);
    expect(first.state.roundHistory).toHaveLength(1);

    const second = reload(first.state, T0 + 10 * MIN);
    expect(second.events).toEqual([]);
    expect(second.state.roundHistory).toHaveLength(1);
    expect(getErrorCounts(second.state)).toEqual({ p1: 0, p2: 1, p3: 1, p4: 1 });
  });

  it('Reload nach mehreren verpassten Runden: Bestätigungen werden nicht übertragen', () => {
    // App wird in Runde 2 geschlossen und 25 Minuten später wieder geöffnet.
    let game = startedGame(PLAYERS);
    game = confirm(game, ['p1', 'p2', 'p3', 'p4'], T0 + 5 * MIN);
    game = confirm(game, ['p1', 'p2'], T0 + 12 * MIN);
    expect(game.currentRound).toBe(2);
    const { state, events } = reload(game, T0 + 37 * MIN);

    expect(events.map((e) => e.roundNumber)).toEqual([2, 3]);
    expect(state.roundHistory[1].playerResults).toEqual({ p1: true, p2: true, p3: false, p4: false });
    expect(state.roundHistory[2].playerResults).toEqual({ p1: false, p2: false, p3: false, p4: false });
    expect(state.currentRound).toBe(4);
    expect(state.currentConfirmations).toEqual({});
    expect(getErrorCounts(state)).toEqual({ p1: 1, p2: 1, p3: 2, p4: 2 });

    // Beim Wiederöffnen gibt es keine Serie von Fehlersounds.
    expect(getFeedback(events, T0 + 37 * MIN).sounds).toEqual([]);
  });

  it('Phasenende während die App geschlossen ist: Entscheidung statt automatischer Fortsetzung', () => {
    const game = confirm(startedGame(PLAYERS), ['p1'], T0 + 45 * MIN);
    const { state } = reload(game, T0 + 4 * 60 * MIN);
    expect(state.status).toBe('extension-decision');
    expect(state.roundHistory).toHaveLength(6);
    expect(state.completedPlaySeconds).toBe(3600);

    const extended = extendGame(state, T0 + 4 * 60 * MIN).state;
    expect(getClock(extended, T0 + 4 * 60 * MIN)?.playedSeconds).toBe(3600);
  });

  it('Reload während der Verlängerungsentscheidung', () => {
    const decision = advance(startedGame(PLAYERS), T0 + 60 * MIN).state;
    const { state, events } = reload(decision, T0 + 10 * 60 * MIN);
    expect(state).toEqual(decision);
    expect(events).toEqual([]);
  });

  it('Reload nach endgültigem Spielende', () => {
    let state = advance(startedGame(PLAYERS, 'malte'), T0 + 60 * MIN).state;
    state = extendGame(state, T0 + 62 * MIN).state;
    state = advance(state, T0 + 92 * MIN).state;
    state = finishGame(state, T0 + 93 * MIN).state;
    const reloaded = reload(state, T0 + 24 * 60 * MIN);
    expect(reloaded.state).toEqual(state);
  });

  it('Reload im Startbildschirm behält Teilnehmer und Modus', () => {
    const setup = setupState(['Simon', 'Tino'], 'malte');
    expect(reload(setup, T0).state).toEqual(setup);
  });
});

describe('Ungültige gespeicherte Daten', () => {
  it('startet ohne gespeicherte Daten mit einem leeren Spiel', () => {
    expect(loadState(new MemoryStorage())).toEqual({ state: createInitialState(), recovered: false });
  });

  it('kein JSON', () => {
    expect(deserializeState('{kaputt')).toEqual({ state: createInitialState(), recovered: true });
  });

  it('falsche Struktur', () => {
    expect(parseState(null)).toBeNull();
    expect(parseState([])).toBeNull();
    expect(parseState({ version: 2 })).toBeNull();
    expect(parseState({ ...startedGame(PLAYERS), status: 'pausiert' })).toBeNull();
    expect(parseState({ ...startedGame(PLAYERS), players: 'Simon' })).toBeNull();
  });

  it('widersprüchlicher Spielstand wird verworfen, Teilnehmer bleiben erhalten', () => {
    const game = advance(startedGame(PLAYERS), T0 + 25 * MIN).state;
    const broken = JSON.stringify({ ...game, currentRound: 9 });
    const result = deserializeState(broken);
    expect(result.recovered).toBe(true);
    expect(result.state.status).toBe('setup');
    expect(result.state.players.map((p) => p.name)).toEqual(PLAYERS);
  });

  it('erkennt Lücken in der Rundenhistorie', () => {
    const game = advance(startedGame(PLAYERS), T0 + 25 * MIN).state;
    expect(parseState({ ...game, roundHistory: game.roundHistory.slice(1) })).toBeNull();
  });

  it('erkennt doppelte Teilnehmer-IDs', () => {
    const game = startedGame(['Simon', 'Tino']);
    const players = [game.players[0], { ...game.players[1], id: game.players[0].id }];
    expect(parseState({ ...game, players })).toBeNull();
  });

  it('ignoriert Bestätigungen unbekannter Teilnehmer', () => {
    const game = startedGame(['Simon']);
    const parsed = parseState({ ...game, currentConfirmations: { p1: true, fremd: true } });
    expect(parsed?.currentConfirmations).toEqual({ p1: true });
  });

  it('ein nicht verfügbarer Speicher führt nicht zum Absturz', () => {
    const failing: KeyValueStorage = {
      getItem: () => {
        throw new Error('blockiert');
      },
      setItem: () => {
        throw new Error('voll');
      },
    };
    expect(loadState(failing).state).toEqual(createInitialState());
    expect(saveState(startedGame(PLAYERS), failing)).toBe(false);
    expect(loadSettings(failing)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, failing)).not.toThrow();
  });

  it('Sound-Einstellungen werden gespeichert und geprüft', () => {
    const storage = new MemoryStorage();
    saveSettings({ soundEnabled: false, soundVolume: 0.3 }, storage);
    expect(loadSettings(storage)).toEqual({ soundEnabled: false, soundVolume: 0.3 });
    // Ältere Einstellungen mit dem früheren Schalter „Auch bei lautlos abspielen“
    storage.setItem('das-spiel/settings/v1', JSON.stringify({ soundEnabled: true, soundVolume: 0.5, playInSilentMode: false }));
    expect(loadSettings(storage)).toEqual({ soundEnabled: true, soundVolume: 0.5 });
    storage.setItem('das-spiel/settings/v1', JSON.stringify({ soundEnabled: 'ja', soundVolume: 7 }));
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  it('speichert unter dem erwarteten Schlüssel', () => {
    const storage = new MemoryStorage();
    saveState(startedGame(['Simon'], 'normal', T0 + SEC), storage);
    const saved = JSON.parse(storage.getItem(STATE_KEY) ?? '{}');
    expect(saved.startedAt).toBe(T0 + SEC);
    expect(saved.phaseStartedAt).toBe(T0 + MIN); // Runden enden zur vollen Minute
  });
});
