import type { GroupId, RoundEvent } from './types';

/**
 * Rundenenden, die höchstens so lange zurückliegen, gelten als „live“ erlebt:
 * Dann gibt es Sound und Rundenwechsel-Animation. Ältere Rundenenden (z. B. nach
 * gesperrtem Bildschirm oder Neuladen) werden nur still nachgetragen.
 */
export const LIVE_EVENT_WINDOW_MS = 15_000;

export type SoundKind = 'error' | 'success';

/** Ein abzuspielender Ton – die 15-Minuten-Gruppe hat eigene Varianten. */
export interface SoundCue {
  kind: SoundKind;
  group: GroupId;
}

export interface CatchUpSummary {
  rounds: number;
  errors: number;
}

export interface Feedback {
  /**
   * Ein Ton pro live beendeter Runde – auch bei mehreren X nur einer. Enden beide Gruppen
   * gleichzeitig (Minute 30, 60, …), kommt erst der Ton des Haupttakts, dann der der 15er.
   */
  sounds: SoundCue[];
  /** Live ausgewertete Runden für die Rundenwechsel-Animation (bei Minute 30/60 beide Gruppen). */
  liveRounds: RoundEvent[];
  /** Runden, die ohne Live-Rückmeldung nachgetragen wurden. */
  catchUp: CatchUpSummary | null;
}

export function getFeedback(events: RoundEvent[], now: number): Feedback {
  const last = events.at(-1);
  if (!last) return { sounds: [], liveRounds: [], catchUp: null };

  const live = now - last.endedAt <= LIVE_EVENT_WINDOW_MS;
  const liveRounds = live ? events.filter((e) => e.endedAt === last.endedAt) : [];
  const missed = events.filter((e) => !liveRounds.includes(e));

  return {
    sounds: liveRounds.map((e) => ({ kind: e.failedPlayerIds.length > 0 ? 'error' : 'success', group: e.group })),
    liveRounds,
    catchUp:
      missed.length > 0
        ? { rounds: missed.length, errors: missed.reduce((sum, e) => sum + e.failedPlayerIds.length, 0) }
        : null,
  };
}
