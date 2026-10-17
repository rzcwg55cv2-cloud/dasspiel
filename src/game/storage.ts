/**
 * Speicherung im LocalStorage. Alles, was gelesen wird, wird vollständig geprüft:
 * Ungültige oder widersprüchliche Daten führen nie zu einem Absturz, sondern zu
 * einem sauberen Neustart (Teilnehmer werden nach Möglichkeit übernommen).
 */
import { createInitialState } from './engine';
import {
  MAX_NAME_LENGTH,
  getGroupRoundDuration,
  getPhaseOffset,
  getRoundsBeforePhase,
  getRoundsInPhase,
  getTotalDuration,
  getTotalRounds,
} from './rules';
import type { GameMode, GameState, GameStatus, Player, RoundResult, Settings, TrackState } from './types';

export const STATE_KEY = 'das-spiel/state/v1';
export const SETTINGS_KEY = 'das-spiel/settings/v1';

export const DEFAULT_SETTINGS: Settings = { soundEnabled: true, soundVolume: 0.8, playInSilentMode: true };

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
      playInSilentMode:
        typeof data.playInSilentMode === 'boolean' ? data.playInSilentMode : DEFAULT_SETTINGS.playInSilentMode,
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
    const { id, name, group = 'main' } = item;
    if (typeof id !== 'string' || id === '' || ids.has(id)) return null;
    if (typeof name !== 'string' || name.trim() === '' || name.length > MAX_NAME_LENGTH) return null;
    // Version 1 kannte noch keine Gruppen: Dann spielen alle im Haupttakt.
    if (group !== 'main' && group !== 'slow') return null;
    ids.add(id);
    players.push({ id, name, group });
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

/** Prüft den Rundenstand einer Taktgruppe gegen Spielstatus, Phase und Rundendauer. */
function parseTrack(
  raw: unknown,
  players: Player[],
  roundDuration: number,
  status: GameStatus,
  extensionCount: number,
): TrackState | null {
  if (!isRecord(raw) || !isNonNegativeInt(raw.currentRound)) return null;
  const roundHistory = parseRoundHistory(raw.roundHistory, players);
  const currentConfirmations = parseConfirmations(raw.currentConfirmations, players);
  if (!roundHistory || !currentConfirmations) return null;

  if (status === 'running') {
    const roundsBefore = getRoundsBeforePhase(roundDuration, extensionCount);
    const roundsInPhase = getRoundsInPhase(roundDuration, extensionCount);
    const { currentRound } = raw;
    if (currentRound < roundsBefore + 1 || currentRound > roundsBefore + roundsInPhase) return null;
    if (roundHistory.length !== currentRound - 1) return null;
    return { currentRound, currentConfirmations, roundHistory };
  }

  // Verlängerungsentscheidung oder beendetes Spiel: Die aktuelle Phase ist vollständig ausgewertet.
  const totalRounds = getTotalRounds(roundDuration, extensionCount);
  if (roundHistory.length !== totalRounds) return null;
  return { currentRound: totalRounds, currentConfirmations: {}, roundHistory };
}

/**
 * Prüft gespeicherte Daten vollständig und liefert einen konsistenten Zustand oder null.
 * Spielstände der Version 1 (ohne 15-Minuten-Gruppe) werden übernommen.
 */
export function parseState(data: unknown): GameState | null {
  if (!isRecord(data) || (data.version !== 1 && data.version !== 2)) return null;

  const status = data.status as GameStatus;
  const mode = data.mode as GameMode;
  if (!STATUSES.includes(status) || !MODES.includes(mode)) return null;

  const players = parsePlayers(data.players);
  if (!players) return null;
  const slowGroupEnabled = data.slowGroupEnabled === true;
  if (status === 'setup') return createInitialState(players, mode, slowGroupEnabled);
  if (players.length === 0) return null;

  const { extensionCount, phaseStartedAt, startedAt, finishedAt } = data;
  if (!isNonNegativeInt(extensionCount) || !isTimestamp(startedAt)) return null;
  if (status === 'running' && !isTimestamp(phaseStartedAt)) return null;
  if (status === 'finished' && !isTimestamp(finishedAt)) return null;

  // 15-Minuten-Spur: nur im Modus Normal und nur mit Teilnehmern in beiden Gruppen.
  const rawSlow = data.slow ?? null;
  const slowPlayers = players.filter((p) => p.group === 'slow');
  const mainPlayers = rawSlow === null ? players : players.filter((p) => p.group === 'main');
  let slow: TrackState | null = null;
  if (rawSlow !== null) {
    if (mode !== 'normal' || slowPlayers.length === 0 || mainPlayers.length === 0) return null;
    slow = parseTrack(rawSlow, slowPlayers, getGroupRoundDuration(mode, 'slow'), status, extensionCount);
    if (!slow) return null;
  }
  const main = parseTrack(data, mainPlayers, getGroupRoundDuration(mode, 'main'), status, extensionCount);
  if (!main) return null;

  return {
    version: 2,
    status,
    mode,
    players,
    slowGroupEnabled,
    extensionCount,
    phaseStartedAt: status === 'running' ? (phaseStartedAt as number) : null,
    completedPlaySeconds:
      status === 'running' ? getPhaseOffset(extensionCount) : getTotalDuration(extensionCount),
    ...main,
    slow,
    startedAt,
    finishedAt: status === 'finished' ? (finishedAt as number) : null,
  };
}

/** Versucht, aus beschädigten Daten wenigstens die Teilnehmerliste zu retten. */
function salvagePlayers(data: unknown): Player[] {
  if (!isRecord(data)) return [];
  return parsePlayers(data.players) ?? [];
}
