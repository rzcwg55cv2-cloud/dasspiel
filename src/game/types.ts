export type GameMode = 'normal' | 'malte';

export type GameStatus = 'setup' | 'running' | 'extension-decision' | 'finished';

export interface Player {
  id: string;
  name: string;
}

/** Ergebnis einer ausgewerteten Runde. */
export interface RoundResult {
  roundNumber: number;
  /** Spieler-ID → true (X erhalten) oder false (Fehler). */
  playerResults: Record<string, boolean>;
  /** Planmäßiges Ende der Runde in ms seit Epoch. */
  completedAt: number;
}

export interface GameState {
  version: 1;
  status: GameStatus;
  mode: GameMode;
  players: Player[];
  /** Anzahl der +30-Minuten-Verlängerungen. Entspricht dem Index der aktuellen Spielphase. */
  extensionCount: number;
  /** Startzeitpunkt der laufenden Spielphase in ms seit Epoch; null, solange keine Phase läuft. */
  phaseStartedAt: number | null;
  /** Spielzeit in Sekunden aus allen bereits abgeschlossenen Spielphasen. */
  completedPlaySeconds: number;
  /** Runde, zu der currentConfirmations gehören (1-basiert, über alle Phasen durchgezählt). */
  currentRound: number;
  /** Bestätigungen (X) der aktuellen Runde. */
  currentConfirmations: Record<string, boolean>;
  roundHistory: RoundResult[];
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
  roundNumber: number;
  endedAt: number;
  failedPlayerIds: string[];
  /** true, wenn mit dieser Runde eine Spielphase (60 bzw. 30 Minuten) endete. */
  phaseEnded: boolean;
}

export interface Transition {
  state: GameState;
  events: RoundEvent[];
}
