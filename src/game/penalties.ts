/**
 * Strafbiere: Wer am Rundenende ein X bekommt, muss in der folgenden Runde seines Takts
 * ein Strafbier trinken und es abhaken lassen. Wird es bis zum Rundenende nicht abgehakt,
 * verdoppelt es sich (1 → 2 → 4 …); ein neues X kommt jeweils noch obendrauf.
 *
 * Wie die X werden auch die Strafbiere ausschließlich aus der Rundenhistorie abgeleitet.
 */
import type { RoundResult } from './types';

/** Strafbiere für die nächste Runde, ausgehend von der gerade ausgewerteten. */
export function nextPenalty(open: number, paid: boolean, failed: boolean): number {
  return (open > 0 && !paid ? open * 2 : 0) + (failed ? 1 : 0);
}

/** Offene Strafbiere je Teilnehmer nach der letzten ausgewerteten Runde (nur Werte > 0). */
export function getOpenPenalties(history: RoundResult[]): Record<string, number> {
  let open: Record<string, number> = {};
  for (const round of history) open = penaltiesAfter(open, round);
  return open;
}

export interface PenaltyTotals {
  /** Abgehakte Strafbiere. */
  drunk: number;
  /** Strafbiere, die nach der letzten Runde noch offen sind. */
  open: number;
}

/** Getrunkene und offene Strafbiere je Teilnehmer. */
export function getPenaltyTotals(history: RoundResult[], playerIds: string[]): Record<string, PenaltyTotals> {
  const totals: Record<string, PenaltyTotals> = {};
  for (const id of playerIds) totals[id] = { drunk: 0, open: 0 };
  let open: Record<string, number> = {};
  for (const round of history) {
    for (const id of playerIds) {
      if ((open[id] ?? 0) > 0 && round.penaltiesPaid[id] === true) totals[id].drunk += open[id];
    }
    open = penaltiesAfter(open, round);
  }
  for (const id of playerIds) totals[id].open = open[id] ?? 0;
  return totals;
}

export interface PenaltyTimes {
  /** Strafbier-Zeit je Runde (gleiche Reihenfolge wie die Historie). */
  perRound: number[];
  /** Strafzeit für Strafbiere, die nach der letzten Runde noch offen sind. */
  openMs: number;
}

/**
 * Strafbier-Zeit für die Rangliste: Abgehakt zählt die Zeit vom Rundenbeginn bis zum
 * Strafbier-Haken, nicht abgehakt kostet jedes offene Strafbier die volle Rundenzeit –
 * ebenso jedes, das bei Spielende noch offen ist.
 */
export function getPenaltyTimes(history: RoundResult[], playerId: string, roundMs: number): PenaltyTimes {
  let open: Record<string, number> = {};
  const perRound = history.map((round) => {
    const owed = open[playerId] ?? 0;
    let ms = 0;
    if (owed > 0) {
      const at = round.penaltyPaidAt[playerId];
      if (round.penaltiesPaid[playerId] !== true) ms = owed * roundMs;
      else ms = at === undefined ? roundMs : Math.min(roundMs, Math.max(0, at - (round.completedAt - roundMs)));
    }
    open = penaltiesAfter(open, round);
    return ms;
  });
  return { perRound, openMs: (open[playerId] ?? 0) * roundMs };
}

function penaltiesAfter(open: Record<string, number>, round: RoundResult): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [id, delivered] of Object.entries(round.playerResults)) {
    const count = nextPenalty(open[id] ?? 0, round.penaltiesPaid[id] === true, !delivered);
    if (count > 0) next[id] = count;
  }
  return next;
}
