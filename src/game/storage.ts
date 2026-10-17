/**
 * Speicherung im LocalStorage. Alles, was gelesen wird, wird vollständig geprüft:
 * Ungültige oder widersprüchliche Daten führen nie zu einem Absturz, sondern zu
 * einem sauberen Neustart (Teilnehmer werden nach Möglichkeit übernommen).
 */
import { createInitialState } from './engine';
import {
  MAX_NAME_LENGTH,
  getPhaseOffset,
  getRoundsBeforePhase,
  getRoundsInPhase,
  getTotalDuration,
  getTotalRounds,
} from './rules';
import type { GameMode, GameState, GameStatus, Player, RoundResult, Settings } from './types';

export const STATE_KEY = 'das-spiel/state/v1';
export const SETTINGS_KEY = 'das-spiel/settings/v1';

export const DEFAULT_SETTINGS: Settings = { soundEnabled: true, soundVolume: 0.8 };

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export interface LoadResult {
  state: GameState;
  /** true, wenn gespeicherte Daten unbrauchbar waren und verworfen wurden. */
  recovered: boolean;
}

export function loadState(storage: KeyValueStorage | null = defaultStorage()): LoadResult {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(STATE_KEY) ?? null;
  } catch {
    return { state: createInitialState(), recovered: false };
  }
  if (raw === null) return { state: createInitialState(), recovered: false };
  return deserializeState(raw);
}

export function deserializeState(raw: string): LoadResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { state: createInitialState(), recovered: true };
  }
  const state = parseState(data);
  if (state) return { state, recovered: false };
  return { state: createInitialState(salvagePlayers(data)), recovered: true };
}

export function saveState(state: GameState, storage: KeyValueStorage | null = defaultStorage()): boolean {
  try {
    storage?.setItem(STATE_KEY, JSON.stringify(state));
    return storage !== null;
  } catch {
    return false;
  }
}

export function loadSettings(storage: KeyValueStorage | null = defaultStorage()): Settings {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) return DEFAULT_SETTINGS;
    return {
      soundEnabled: typeof data.soundEnabled === 'boolean' ? data.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
      soundVolume:
        typeof data.soundVolume === 'number' && data.soundVolume >= 0 && data.soundVolume <= 1
          ? data.soundVolume
          : DEFAULT_SETTINGS.soundVolume,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings, storage: KeyValueStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Speichern ist nicht möglich (z. B. privater Modus) – die App funktioniert trotzdem.
  }
}

// ---------------------------------------------------------------------------
// Validierung
// ---------------------------------------------------------------------------

const STATUSES: readonly GameStatus[] = ['setup', 'running', 'extension-decision', 'finished'];
const MODES: readonly GameMode[] = ['normal', 'malte'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function parsePlayers(value: unknown): Player[] | null {
  if (!Array.isArray(value)) return null;
  const players: Player[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    if (!isRecord(item)) return null;
    const { id, name } = item;
    if (typeof id !== 'string' || id === '' || ids.has(id)) return null;
    if (typeof name !== 'string' || name.trim() === '' || name.length > MAX_NAME_LENGTH) return null;
    ids.add(id);
    players.push({ id, name });
  }
  return players;
}

function parseRoundHistory(value: unknown, players: Player[]): RoundResult[] | null {
  if (!Array.isArray(value)) return null;
  const history: RoundResult[] = [];
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) return null;
    if (item.roundNumber !== index + 1 || !isTimestamp(item.completedAt) || !isRecord(item.playerResults)) {
      return null;
    }
    const playerResults: Record<string, boolean> = {};
    for (const player of players) {
      const result = item.playerResults[player.id];
      if (typeof result !== 'boolean') return null;
      playerResults[player.id] = result;
    }
    history.push({ roundNumber: index + 1, playerResults, completedAt: item.completedAt });
  }
  return history;
}

function parseConfirmations(value: unknown, players: Player[]): Record<string, boolean> | null {
  if (!isRecord(value)) return null;
  const confirmations: Record<string, boolean> = {};
  for (const player of players) {
    if (value[player.id] === true) confirmations[player.id] = true;
  }
  return confirmations;
}

/** Prüft gespeicherte Daten vollständig und liefert einen konsistenten Zustand oder null. */
export function parseState(data: unknown): GameState | null {
  if (!isRecord(data) || data.version !== 1) return null;

  const status = data.status as GameStatus;
  const mode = data.mode as GameMode;
  if (!STATUSES.includes(status) || !MODES.includes(mode)) return null;

  const players = parsePlayers(data.players);
  if (!players) return null;
  if (status === 'setup') return createInitialState(players, mode);
  if (players.length === 0) return null;

  const { extensionCount, phaseStartedAt, currentRound, startedAt, finishedAt } = data;
  if (!isNonNegativeInt(extensionCount) || !isNonNegativeInt(currentRound)) return null;
  if (!isTimestamp(startedAt)) return null;

  const roundHistory = parseRoundHistory(data.roundHistory, players);
  const currentConfirmations = parseConfirmations(data.currentConfirmations, players);
  if (!roundHistory || !currentConfirmations) return null;

  const base = { version: 1 as const, status, mode, players, extensionCount, startedAt, roundHistory };

  if (status === 'running') {
    const roundsBefore = getRoundsBeforePhase(mode, extensionCount);
    const roundsInPhase = getRoundsInPhase(mode, extensionCount);
    if (!isTimestamp(phaseStartedAt)) return null;
    if (currentRound < roundsBefore + 1 || currentRound > roundsBefore + roundsInPhase) return null;
    if (roundHistory.length !== currentRound - 1) return null;
    return {
      ...base,
      phaseStartedAt,
      completedPlaySeconds: getPhaseOffset(extensionCount),
      currentRound,
      currentConfirmations,
      finishedAt: null,
    };
  }

  // Verlängerungsentscheidung oder beendetes Spiel: Die aktuelle Phase ist vollständig ausgewertet.
  const totalRounds = getTotalRounds(mode, extensionCount);
  if (roundHistory.length !== totalRounds) return null;
  if (status === 'finished' && !isTimestamp(finishedAt)) return null;
  return {
    ...base,
    phaseStartedAt: null,
    completedPlaySeconds: getTotalDuration(extensionCount),
    currentRound: totalRounds,
    currentConfirmations: {},
    finishedAt: status === 'finished' ? (finishedAt as number) : null,
  };
}

/** Versucht, aus beschädigten Daten wenigstens die Teilnehmerliste zu retten. */
function salvagePlayers(data: unknown): Player[] {
  if (!isRecord(data)) return [];
  return parsePlayers(data.players) ?? [];
}
