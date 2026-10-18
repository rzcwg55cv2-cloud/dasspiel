export type GameMode = 'normal' | 'malte';

export type GameStatus = 'setup' | 'running' | 'extension-decision' | 'finished';

/**
 * Taktgruppe eines Teilnehmers:
 * - 'main': Haupttakt (10 Minuten, bei Malte Spezial 5 Minuten)
 * - 'slow': 15-Minuten-Gruppe, läuft parallel mit (nur im Modus Normal)
 */
export type GroupId = 'main' | 'slow';

export interface Player {
  id: string;
  name: string;
  group: GroupId;
}

/** Ergebnis einer ausgewerteten Runde. */
export interface RoundResult {
  roundNumber: number;
  /** Spieler-ID → true (geliefert) oder false (X). */
  playerResults: Record<string, boolean>;
  /** Planmäßiges Ende der Runde in ms seit Epoch. */
  completedAt: number;
  /** Spieler-ID → true, wenn das offene Strafbier in dieser Runde abgehakt wurde. */
  penaltiesPaid: Record<string, boolean>;
}

/** Rundenstand einer Taktgruppe. */
export interface TrackState {
  /** Runde, zu der currentConfirmations gehören (1-basiert, über alle Phasen durchgezählt). */
  currentRound: number;
  /** Haken der aktuellen Runde. */
  currentConfirmations: Record<string, boolean>;
  /** In der aktuellen Runde abgehakte Strafbiere. */
  currentPenaltiesPaid: Record<string, boolean>;
  roundHistory: RoundResult[];
}

export interface GameState extends TrackState {
  version: 2;
  status: GameStatus;
  mode: GameMode;
  players: Player[];
  /** Haken „15-Minuten-Gruppe“ auf dem Startbildschirm (wirkt nur im Modus Normal). */
  slowGroupEnabled: boolean;
  /** Anzahl der +30-Minuten-Verlängerungen. Entspricht dem Index der aktuellen Spielphase. */
  extensionCount: number;
  /** Startzeitpunkt der laufenden Spielphase in ms seit Epoch; null, solange keine Phase läuft. */
  phaseStartedAt: number | null;
  /** Spielzeit in Sekunden aus allen bereits abgeschlossenen Spielphasen. */
  completedPlaySeconds: number;
  /**
   * Rundenstand der 15-Minuten-Gruppe; null, wenn im Spiel niemand im 15-Minuten-Takt spielt.
   * Der Haupttakt steht direkt in currentRound, currentConfirmations und roundHistory.
   */
  slow: TrackState | null;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface Settings {
  soundEnabled: boolean;
  /** Lautstärke von 0 bis 1. */
  soundVolume: number;
}

/** Wird erzeugt, wenn eine Runde ausgewertet wurde. */
export interface RoundEvent {
  group: GroupId;
  roundNumber: number;
  endedAt: number;
  failedPlayerIds: string[];
  /** Nicht abgehakte Strafbiere, die sich mit dieser Runde verdoppelt haben. */
  doubledPenaltyIds: string[];
  /** Offene Strafbiere je Teilnehmer für die nächste Runde (nur Werte > 0). */
  penalties: Record<string, number>;
  /** true, wenn mit dieser Runde eine Spielphase (60 bzw. 30 Minuten) endete. */
  phaseEnded: boolean;
}

export interface Transition {
  state: GameState;
  events: RoundEvent[];
}
