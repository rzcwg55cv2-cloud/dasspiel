/**
 * Zentrale Spiellogik als reine Funktionen.
 *
 * Jede Aktion erhält den aktuellen Zustand und den Zeitpunkt `now` (ms seit Epoch)
 * und liefert einen neuen Zustand zurück. Die Zeit wird nie heruntergezählt,
 * sondern immer aus dem Startzeitpunkt der laufenden Spielphase abgeleitet.
 * Dadurch lässt sich der Spielstand nach Standby, Hintergrund oder Neuladen
 * exakt rekonstruieren.
 *
 * Es gibt bis zu zwei Rundenspuren, die parallel laufen: den Haupttakt (10 bzw. 5 Minuten)
 * und optional die 15-Minuten-Gruppe. Beide beginnen und enden mit der Spielphase.
 */
import {
  MAX_NAME_LENGTH,
  getGroupRoundDuration,
  getPhaseDuration,
  getPhaseOffset,
  getRoundsBeforePhase,
  getRoundsInPhase,
  getTotalDuration,
} from './rules';
import type {
  GameMode,
  GameState,
  GroupId,
  Player,
  RoundEvent,
  RoundResult,
  TrackState,
  Transition,
} from './types';

export function createInitialState(
  players: Player[] = [],
  mode: GameMode = 'normal',
  slowGroupEnabled = false,
): GameState {
  return {
    version: 2,
    status: 'setup',
    mode,
    players,
    slowGroupEnabled,
    extensionCount: 0,
    phaseStartedAt: null,
    completedPlaySeconds: 0,
    currentRound: 0,
    currentConfirmations: {},
    roundHistory: [],
    slow: null,
    startedAt: null,
    finishedAt: null,
  };
}

const unchanged = (state: GameState): Transition => ({ state, events: [] });

// ---------------------------------------------------------------------------
// Taktgruppen
// ---------------------------------------------------------------------------

/** Taktgruppen, die im laufenden bzw. beendeten Spiel eine eigene Rundenspur haben. */
export function activeGroups(state: GameState): GroupId[] {
  return state.slow ? ['main', 'slow'] : ['main'];
}

/** Ob vor Spielbeginn eine 15-Minuten-Gruppe zustande kommt. */
export function isSlowGroupPlanned(state: GameState): boolean {
  return state.slowGroupEnabled && state.mode === 'normal' && state.players.some((p) => p.group === 'slow');
}

/** Taktgruppe eines Teilnehmers. Ohne 15-Minuten-Spur spielen alle im Haupttakt. */
export function groupOf(state: GameState, player: Player): GroupId {
  const slowActive = state.status === 'setup' ? isSlowGroupPlanned(state) : state.slow !== null;
  return slowActive && player.group === 'slow' ? 'slow' : 'main';
}

export function playersOf(state: GameState, group: GroupId): Player[] {
  return state.players.filter((p) => groupOf(state, p) === group);
}

export function getTrack(state: GameState, group: GroupId): TrackState | null {
  if (group === 'slow') return state.slow;
  return {
    currentRound: state.currentRound,
    currentConfirmations: state.currentConfirmations,
    roundHistory: state.roundHistory,
  };
}

function withTrack(state: GameState, group: GroupId, track: TrackState): GameState {
  return group === 'slow' ? { ...state, slow: track } : { ...state, ...track };
}

// ---------------------------------------------------------------------------
// Rundenauswertung
// ---------------------------------------------------------------------------

/**
 * Wertet alle Runden aus, deren Ende bis `now` erreicht wurde.
 *
 * - Jede Runde wird genau einmal ausgewertet.
 * - Haken gelten nur für die Runde, in der sie gesetzt wurden.
 * - Endet eine Spielphase, wird keine neue Runde gestartet, sondern auf die
 *   Verlängerungsentscheidung gewartet.
 */
export function advance(state: GameState, now: number): Transition {
  if (state.status !== 'running' || state.phaseStartedAt === null) return unchanged(state);

  let next = state;
  const events: RoundEvent[] = [];
  for (const group of activeGroups(state)) {
    const result = advanceTrack(next, group, state.phaseStartedAt, now);
    next = result.state;
    events.push(...result.events);
  }

  const phaseEndsAt = state.phaseStartedAt + getPhaseDuration(state.extensionCount) * 1000;
  if (now >= phaseEndsAt) {
    next = {
      ...next,
      status: 'extension-decision',
      phaseStartedAt: null,
      completedPlaySeconds: getTotalDuration(state.extensionCount),
      currentConfirmations: {},
      slow: next.slow && { ...next.slow, currentConfirmations: {} },
    };
  }

  // Chronologisch; bei gleichzeitigem Rundenende zuerst der Haupttakt.
  events.sort((a, b) => a.endedAt - b.endedAt || (a.group === 'main' ? -1 : 1));
  return { state: next, events };
}

function advanceTrack(state: GameState, group: GroupId, phaseStartedAt: number, now: number): Transition {
  const roundDuration = getGroupRoundDuration(state.mode, group);
  const roundMs = roundDuration * 1000;
  const roundsBefore = getRoundsBeforePhase(roundDuration, state.extensionCount);
  const roundsInPhase = getRoundsInPhase(roundDuration, state.extensionCount);
  const players = playersOf(state, group);
  const events: RoundEvent[] = [];
  let track = getTrack(state, group);
  if (!track) return unchanged(state);
  let changed = false;

  for (;;) {
    const indexInPhase = track.currentRound - roundsBefore - 1;
    const endedAt = phaseStartedAt + (indexInPhase + 1) * roundMs;
    if (now < endedAt) break;
    if (track.roundHistory.some((r) => r.roundNumber === track!.currentRound)) break;

    const playerResults: Record<string, boolean> = {};
    for (const player of players) playerResults[player.id] = track.currentConfirmations[player.id] === true;
    const result: RoundResult = { roundNumber: track.currentRound, playerResults, completedAt: endedAt };
    const phaseEnded = indexInPhase + 1 >= roundsInPhase;
    events.push({
      group,
      roundNumber: track.currentRound,
      endedAt,
      failedPlayerIds: players.filter((p) => !playerResults[p.id]).map((p) => p.id),
      phaseEnded,
    });
    changed = true;

    if (phaseEnded) {
      // Die letzte Runde der Phase bleibt die aktuelle, bis verlängert wird.
      track = { ...track, roundHistory: [...track.roundHistory, result], currentConfirmations: {} };
      break;
    }
    track = {
      currentRound: track.currentRound + 1,
      currentConfirmations: {},
      roundHistory: [...track.roundHistory, result],
    };
  }

  return { state: changed ? withTrack(state, group, track) : state, events };
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
  const player: Player = { id: createId(), name: normalizeName(raw), group: 'main' };
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

export function setSlowGroupEnabled(state: GameState, enabled: boolean): GameState {
  if (state.status !== 'setup' || state.slowGroupEnabled === enabled) return state;
  return { ...state, slowGroupEnabled: enabled };
}

/** Schiebt einen Teilnehmer in den Haupttakt oder in die 15-Minuten-Gruppe. */
export function setPlayerGroup(state: GameState, playerId: string, group: GroupId): GameState {
  if (state.status !== 'setup') return state;
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.group === group) return state;
  return { ...state, players: state.players.map((p) => (p.id === playerId ? { ...p, group } : p)) };
}

export type StartBlocker = 'no-players' | 'no-main-players';

/** Warum das Spiel (noch) nicht starten kann; null, wenn alles passt. */
export function getStartBlocker(state: GameState): StartBlocker | null {
  if (state.players.length === 0) return 'no-players';
  if (isSlowGroupPlanned(state) && state.players.every((p) => p.group === 'slow')) return 'no-main-players';
  return null;
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

/** Startet ein neues Spiel mit den vorhandenen Teilnehmern, Modus und Taktgruppen. */
export function startGame(state: GameState, now: number): Transition {
  if (state.status !== 'setup' && state.status !== 'finished') return unchanged(state);
  const setup = createInitialState(state.players, state.mode, state.slowGroupEnabled);
  if (getStartBlocker(setup) !== null) return unchanged(state);
  return {
    state: {
      ...setup,
      status: 'running',
      phaseStartedAt: now,
      currentRound: 1,
      slow: isSlowGroupPlanned(setup) ? { currentRound: 1, currentConfirmations: {}, roundHistory: [] } : null,
      startedAt: now,
    },
    events: [],
  };
}

/** Setzt oder entfernt den Haken eines Teilnehmers in der laufenden Runde seiner Gruppe. */
export function toggleConfirmation(state: GameState, playerId: string, now: number): Transition {
  const { state: current, events } = advance(state, now);
  if (current.status !== 'running') return { state: current, events };
  const player = current.players.find((p) => p.id === playerId);
  if (!player) return { state: current, events };

  const group = groupOf(current, player);
  const track = getTrack(current, group)!;
  const currentConfirmations = { ...track.currentConfirmations };
  if (currentConfirmations[playerId]) delete currentConfirmations[playerId];
  else currentConfirmations[playerId] = true;

  return { state: withTrack(current, group, { ...track, currentConfirmations }), events };
}

/** Startet eine weitere 30-Minuten-Phase. Nur während der Verlängerungsentscheidung möglich. */
export function extendGame(state: GameState, now: number): Transition {
  const { state: current, events } = advance(state, now);
  if (current.status !== 'extension-decision') return { state: current, events };

  const extensionCount = current.extensionCount + 1;
  const firstRound = (group: GroupId) =>
    getRoundsBeforePhase(getGroupRoundDuration(current.mode, group), extensionCount) + 1;
  return {
    state: {
      ...current,
      status: 'running',
      extensionCount,
      phaseStartedAt: now,
      completedPlaySeconds: getPhaseOffset(extensionCount),
      currentRound: firstRound('main'),
      currentConfirmations: {},
      slow: current.slow && { ...current.slow, currentRound: firstRound('slow'), currentConfirmations: {} },
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

/** Bricht das laufende Spiel ab. Teilnehmer, Modus und Gruppen bleiben für ein neues Spiel erhalten. */
export function cancelGame(state: GameState): GameState {
  if (state.status !== 'running' && state.status !== 'extension-decision') return state;
  return createInitialState(state.players, state.mode, state.slowGroupEnabled);
}

/** Zurück zum Startbildschirm mit leerer Teilnehmerliste. */
export function newGame(state: GameState): GameState {
  if (state.status !== 'finished') return state;
  return createInitialState();
}

/** Neues Spiel mit denselben Teilnehmern, demselben Modus und denselben Gruppen. */
export function restartWithSameGroup(state: GameState, now: number): Transition {
  if (state.status !== 'finished') return unchanged(state);
  return startGame(state, now);
}

// ---------------------------------------------------------------------------
// Abgeleitete Zeitwerte für die Anzeige
// ---------------------------------------------------------------------------

export interface GameClock {
  group: GroupId;
  roundNumber: number;
  /** 1-basierte Nummer der Runde innerhalb der aktuellen Spielphase. */
  roundInPhase: number;
  roundsInPhase: number;
  /** Letzte Runde der aktuellen Spielphase (über alle Phasen gezählt). */
  lastRoundOfPhase: number;
  roundEndsAt: number;
  roundRemainingMs: number;
  roundDurationMs: number;
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

/** Liefert die Uhrwerte einer Taktgruppe in einer laufenden Spielphase, sonst null. */
export function getClock(state: GameState, now: number, group: GroupId = 'main'): GameClock | null {
  if (state.status !== 'running' || state.phaseStartedAt === null) return null;
  const track = getTrack(state, group);
  if (!track) return null;

  const roundDuration = getGroupRoundDuration(state.mode, group);
  const roundDurationMs = roundDuration * 1000;
  const roundsBefore = getRoundsBeforePhase(roundDuration, state.extensionCount);
  const roundsInPhase = getRoundsInPhase(roundDuration, state.extensionCount);
  const phaseDurationMs = getPhaseDuration(state.extensionCount) * 1000;
  const roundInPhase = track.currentRound - roundsBefore;
  const roundEndsAt = state.phaseStartedAt + roundInPhase * roundDurationMs;
  const phaseElapsedMs = clamp(now - state.phaseStartedAt, 0, phaseDurationMs);
  const roundRemainingMs = clamp(roundEndsAt - now, 0, roundDurationMs);

  return {
    group,
    roundNumber: track.currentRound,
    roundInPhase,
    roundsInPhase,
    lastRoundOfPhase: roundsBefore + roundsInPhase,
    roundEndsAt,
    roundRemainingMs,
    roundDurationMs,
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
