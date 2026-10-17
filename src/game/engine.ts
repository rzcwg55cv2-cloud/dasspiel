/**
 * Zentrale Spiellogik als reine Funktionen.
 *
 * Jede Aktion erhält den aktuellen Zustand und den Zeitpunkt `now` (ms seit Epoch)
 * und liefert einen neuen Zustand zurück. Die Zeit wird nie heruntergezählt,
 * sondern immer aus dem Startzeitpunkt der laufenden Spielphase abgeleitet.
 * Dadurch lässt sich der Spielstand nach Standby, Hintergrund oder Neuladen
 * exakt rekonstruieren.
 */
import {
  MAX_NAME_LENGTH,
  getPhaseOffset,
  getRoundDuration,
  getRoundsBeforePhase,
  getRoundsInPhase,
  getTotalDuration,
} from './rules';
import type { GameMode, GameState, Player, RoundEvent, RoundResult, Transition } from './types';

export function createInitialState(players: Player[] = [], mode: GameMode = 'normal'): GameState {
  return {
    version: 1,
    status: 'setup',
    mode,
    players,
    extensionCount: 0,
    phaseStartedAt: null,
    completedPlaySeconds: 0,
    currentRound: 0,
    currentConfirmations: {},
    roundHistory: [],
    startedAt: null,
    finishedAt: null,
  };
}

const unchanged = (state: GameState): Transition => ({ state, events: [] });

/**
 * Wertet alle Runden aus, deren Ende bis `now` erreicht wurde.
 *
 * - Jede Runde wird genau einmal ausgewertet.
 * - Bestätigungen gelten nur für die Runde, in der sie gesetzt wurden.
 * - Endet eine Spielphase, wird keine neue Runde gestartet, sondern auf die
 *   Verlängerungsentscheidung gewartet.
 */
export function advance(state: GameState, now: number): Transition {
  if (state.status !== 'running' || state.phaseStartedAt === null) return unchanged(state);

  const roundMs = getRoundDuration(state.mode) * 1000;
  const roundsBefore = getRoundsBeforePhase(state.mode, state.extensionCount);
  const roundsInPhase = getRoundsInPhase(state.mode, state.extensionCount);
  const events: RoundEvent[] = [];
  let next = state;

  for (;;) {
    const indexInPhase = next.currentRound - roundsBefore - 1;
    const endedAt = state.phaseStartedAt + (indexInPhase + 1) * roundMs;
    if (now < endedAt) break;

    const alreadyEvaluated = next.roundHistory.some((r) => r.roundNumber === next.currentRound);
    const failedPlayerIds = next.players.filter((p) => next.currentConfirmations[p.id] !== true).map((p) => p.id);
    const roundHistory = alreadyEvaluated
      ? next.roundHistory
      : [...next.roundHistory, evaluateRound(next, endedAt)];
    const phaseEnded = indexInPhase + 1 >= roundsInPhase;

    if (!alreadyEvaluated) {
      events.push({ roundNumber: next.currentRound, endedAt, failedPlayerIds, phaseEnded });
    }

    if (phaseEnded) {
      next = {
        ...next,
        status: 'extension-decision',
        roundHistory,
        currentConfirmations: {},
        phaseStartedAt: null,
        completedPlaySeconds: getTotalDuration(next.extensionCount),
      };
      break;
    }

    next = { ...next, roundHistory, currentRound: next.currentRound + 1, currentConfirmations: {} };
  }

  return { state: next, events };
}

function evaluateRound(state: GameState, completedAt: number): RoundResult {
  const playerResults: Record<string, boolean> = {};
  for (const player of state.players) {
    playerResults[player.id] = state.currentConfirmations[player.id] === true;
  }
  return { roundNumber: state.currentRound, playerResults, completedAt };
}

// ---------------------------------------------------------------------------
// Teilnehmerverwaltung (nur vor Spielbeginn)
// ---------------------------------------------------------------------------

export type AddPlayerError = 'empty' | 'duplicate' | 'too-long' | 'locked';

export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

function nameKey(name: string): string {
  return normalizeName(name).toLocaleLowerCase('de-DE');
}

export function validatePlayerName(players: Player[], raw: string): AddPlayerError | null {
  const name = normalizeName(raw);
  if (name === '') return 'empty';
  if (name.length > MAX_NAME_LENGTH) return 'too-long';
  if (players.some((p) => nameKey(p.name) === nameKey(name))) return 'duplicate';
  return null;
}

export function addPlayer(
  state: GameState,
  raw: string,
  createId: () => string = createPlayerId,
): { state: GameState; error: AddPlayerError | null } {
  if (state.status !== 'setup') return { state, error: 'locked' };
  const error = validatePlayerName(state.players, raw);
  if (error) return { state, error };
  const player: Player = { id: createId(), name: normalizeName(raw) };
  return { state: { ...state, players: [...state.players, player] }, error: null };
}

export function removePlayer(state: GameState, playerId: string): GameState {
  if (state.status !== 'setup') return state;
  const players = state.players.filter((p) => p.id !== playerId);
  return players.length === state.players.length ? state : { ...state, players };
}

export function setMode(state: GameState, mode: GameMode): GameState {
  if (state.status !== 'setup' || state.mode === mode) return state;
  return { ...state, mode };
}

export function createPlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Spielablauf
// ---------------------------------------------------------------------------

/** Startet ein neues Spiel mit den vorhandenen Teilnehmern und dem gewählten Modus. */
export function startGame(state: GameState, now: number): Transition {
  if (state.status !== 'setup' && state.status !== 'finished') return unchanged(state);
  if (state.players.length === 0) return unchanged(state);
  return {
    state: {
      ...createInitialState(state.players, state.mode),
      status: 'running',
      phaseStartedAt: now,
      currentRound: 1,
      startedAt: now,
    },
    events: [],
  };
}

/** Setzt oder entfernt das X eines Teilnehmers in der laufenden Runde. */
export function toggleConfirmation(state: GameState, playerId: string, now: number): Transition {
  const { state: current, events } = advance(state, now);
  if (current.status !== 'running') return { state: current, events };
  if (!current.players.some((p) => p.id === playerId)) return { state: current, events };

  const currentConfirmations = { ...current.currentConfirmations };
  if (currentConfirmations[playerId]) delete currentConfirmations[playerId];
  else currentConfirmations[playerId] = true;

  return { state: { ...current, currentConfirmations }, events };
}

/** Startet eine weitere 30-Minuten-Phase. Nur während der Verlängerungsentscheidung möglich. */
export function extendGame(state: GameState, now: number): Transition {
  const { state: current, events } = advance(state, now);
  if (current.status !== 'extension-decision') return { state: current, events };

  const extensionCount = current.extensionCount + 1;
  return {
    state: {
      ...current,
      status: 'running',
      extensionCount,
      phaseStartedAt: now,
      completedPlaySeconds: getPhaseOffset(extensionCount),
      currentRound: getRoundsBeforePhase(current.mode, extensionCount) + 1,
      currentConfirmations: {},
    },
    events,
  };
}

/** Beendet das Spiel endgültig. Nur während der Verlängerungsentscheidung möglich. */
export function finishGame(state: GameState, now: number): Transition {
  const { state: current, events } = advance(state, now);
  if (current.status !== 'extension-decision') return { state: current, events };
  return { state: { ...current, status: 'finished', finishedAt: now }, events };
}

/** Bricht das laufende Spiel ab. Teilnehmer und Modus bleiben für ein neues Spiel erhalten. */
export function cancelGame(state: GameState): GameState {
  if (state.status !== 'running' && state.status !== 'extension-decision') return state;
  return createInitialState(state.players, state.mode);
}

/** Zurück zum Startbildschirm mit leerer Teilnehmerliste. */
export function newGame(state: GameState): GameState {
  if (state.status !== 'finished') return state;
  return createInitialState();
}

/** Neues Spiel mit denselben Teilnehmern und demselben Modus. */
export function restartWithSameGroup(state: GameState, now: number): Transition {
  if (state.status !== 'finished') return unchanged(state);
  return startGame(state, now);
}

// ---------------------------------------------------------------------------
// Abgeleitete Zeitwerte für die Anzeige
// ---------------------------------------------------------------------------

export interface GameClock {
  roundNumber: number;
  /** 1-basierte Nummer der Runde innerhalb der aktuellen Spielphase. */
  roundInPhase: number;
  roundsInPhase: number;
  /** Letzte Runde der aktuellen Spielphase (über alle Phasen gezählt). */
  lastRoundOfPhase: number;
  roundEndsAt: number;
  roundRemainingMs: number;
  /** Restzeit der Runde in ganzen Sekunden (aufgerundet, wie bei einer Stoppuhr). */
  roundRemainingSeconds: number;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  phaseProgress: number;
  /** Gesamte bisherige Spielzeit in Sekunden. */
  playedSeconds: number;
  /** Geplante Gesamtspielzeit bis zum Ende der aktuellen Phase in Sekunden. */
  plannedSeconds: number;
}

/** Liefert die Uhrwerte für eine laufende Spielphase, sonst null. */
export function getClock(state: GameState, now: number): GameClock | null {
  if (state.status !== 'running' || state.phaseStartedAt === null) return null;

  const roundMs = getRoundDuration(state.mode) * 1000;
  const roundsBefore = getRoundsBeforePhase(state.mode, state.extensionCount);
  const roundsInPhase = getRoundsInPhase(state.mode, state.extensionCount);
  const phaseDurationMs = roundsInPhase * roundMs;
  const roundInPhase = state.currentRound - roundsBefore;
  const roundEndsAt = state.phaseStartedAt + roundInPhase * roundMs;
  const phaseElapsedMs = clamp(now - state.phaseStartedAt, 0, phaseDurationMs);
  const roundRemainingMs = clamp(roundEndsAt - now, 0, roundMs);

  return {
    roundNumber: state.currentRound,
    roundInPhase,
    roundsInPhase,
    lastRoundOfPhase: roundsBefore + roundsInPhase,
    roundEndsAt,
    roundRemainingMs,
    roundRemainingSeconds: Math.ceil(roundRemainingMs / 1000),
    phaseElapsedMs,
    phaseDurationMs,
    phaseProgress: phaseElapsedMs / phaseDurationMs,
    playedSeconds: state.completedPlaySeconds + Math.floor(phaseElapsedMs / 1000),
    plannedSeconds: getTotalDuration(state.extensionCount),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
