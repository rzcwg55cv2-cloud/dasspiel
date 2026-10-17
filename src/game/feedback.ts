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
  /** Höchstens ein Sound pro Auswertung – auch bei mehreren X oder zwei Gruppen gleichzeitig. */
  sound: SoundKind | null;
  /** Live ausgewertete Runden für die Rundenwechsel-Animation (bei Minute 30/60 beide Gruppen). */
  liveRounds: RoundEvent[];
  /** Runden, die ohne Live-Rückmeldung nachgetragen wurden. */
  catchUp: CatchUpSummary | null;
}

export function getFeedback(events: RoundEvent[], now: number): Feedback {
  const last = events.at(-1);
  if (!last) return { sound: null, liveRounds: [], catchUp: null };

  const live = now - last.endedAt <= LIVE_EVENT_WINDOW_MS;
  const liveRounds = live ? events.filter((e) => e.endedAt === last.endedAt) : [];
  const missed = events.filter((e) => !liveRounds.includes(e));

  return {
    sound:
      liveRounds.length === 0 ? null : liveRounds.some((e) => e.failedPlayerIds.length > 0) ? 'error' : 'success',
    liveRounds,
    catchUp:
      missed.length > 0
        ? { rounds: missed.length, errors: missed.reduce((sum, e) => sum + e.failedPlayerIds.length, 0) }
        : null,
  };
}
