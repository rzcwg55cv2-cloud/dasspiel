import type { RoundEvent } from './types';

/**
 * Rundenenden, die höchstens so lange zurückliegen, gelten als „live“ erlebt:
 * Dann gibt es Sound und Rundenwechsel-Animation. Ältere Rundenenden (z. B. nach
 * gesperrtem Bildschirm oder Neuladen) werden nur still nachgetragen.
 */
export const LIVE_EVENT_WINDOW_MS = 15_000;

export type SoundKind = 'error' | 'success';

export interface CatchUpSummary {
  rounds: number;
  errors: number;
}

export interface Feedback {
  /** Höchstens ein Sound pro Auswertung – auch bei mehreren Fehlern in einer Runde. */
  sound: SoundKind | null;
  /** Live ausgewertete Runde für die Rundenwechsel-Animation. */
  liveRound: RoundEvent | null;
  /** Runden, die ohne Live-Rückmeldung nachgetragen wurden. */
  catchUp: CatchUpSummary | null;
}

export function getFeedback(events: RoundEvent[], now: number): Feedback {
  const last = events.at(-1);
  if (!last) return { sound: null, liveRound: null, catchUp: null };

  const live = now - last.endedAt <= LIVE_EVENT_WINDOW_MS;
  const missed = live ? events.slice(0, -1) : events;

  return {
    sound: live ? (last.failedPlayerIds.length > 0 ? 'error' : 'success') : null,
    liveRound: live ? last : null,
    catchUp:
      missed.length > 0
        ? { rounds: missed.length, errors: missed.reduce((sum, e) => sum + e.failedPlayerIds.length, 0) }
        : null,
  };
}
