/**
 * Statistiken werden ausschließlich aus der Rundenhistorie berechnet.
 * Es gibt keine separat gespeicherten X-Zähler, die auseinanderlaufen könnten.
 */
import { activeGroups, getTrack, groupOf, playersOf } from './engine';
import { getPenaltyTotals } from './penalties';
import { getGroupRoundDuration } from './rules';
import type { GameMode, GameState, GroupId, Player, RoundResult } from './types';

export interface PlayerRound {
  roundNumber: number;
  success: boolean;
  /** Zeit vom Rundenbeginn bis zum (zuletzt gesetzten) Haken; bei X die volle Rundenzeit. */
  ms: number;
}

export interface PlayerStats {
  player: Player;
  /** Platz in der Rangliste nach Gesamtzeit; gleiche Zeit ergibt gleichen Platz (1, 1, 3, …). */
  rank: number;
  /** Summe der Zeiten bis zum Haken über alle Runden (X zählt die volle Rundenzeit). */
  totalMs: number;
  successes: number;
  errors: number;
  rounds: number;
  /** Erfolgsquote zwischen 0 und 1. */
  successRate: number;
  results: PlayerRound[];
  /** Abgehakte Strafbiere. */
  penaltiesDrunk: number;
  /** Strafbiere, die bei Spielende noch offen sind. */
  penaltiesOpen: number;
}

export interface RoundRef {
  group: GroupId;
  roundNumber: number;
}

export interface WorstRound {
  rounds: RoundRef[];
  errors: number;
}

/** Auswertung einer Taktgruppe (Haupttakt bzw. 15-Minuten-Gruppe). */
export interface GroupSummary {
  group: GroupId;
  roundsPlayed: number;
  perfectRounds: number;
  /** Rangliste nur innerhalb dieser Gruppe. */
  ranking: PlayerStats[];
  /** Schnellste bzw. meiste X innerhalb dieser Gruppe. */
  bestPlayers: Player[];
  mostErrorPlayers: Player[];
}

export interface GameSummary {
  mode: GameMode;
  /** Gespielte Runden im Haupttakt. */
  roundsPlayed: number;
  playerCount: number;
  extensionCount: number;
  playedSeconds: number;
  totalErrors: number;
  /** Runden ohne X, über alle Gruppen. */
  perfectRounds: number;
  /** Alle ausgewerteten Runden, über alle Gruppen. */
  totalRounds: number;
  /** Runde(n) mit den meisten X; null, wenn es keine X gab. */
  worstRound: WorstRound | null;
  /** Alle Teilnehmer mit der kürzesten Gesamtzeit (Platz 1). */
  bestPlayers: Player[];
  /** Alle Teilnehmer mit den meisten X; leer, wenn niemand ein X hat. */
  mostErrorPlayers: Player[];
  /** Gesamtrangliste über alle Teilnehmer. */
  ranking: PlayerStats[];
  groups: GroupSummary[];
  /** Abgehakte Strafbiere aller Teilnehmer. */
  penaltiesDrunk: number;
  /** Teilnehmer mit noch offenen Strafbieren (meiste zuerst). */
  openPenalties: { player: Player; count: number }[];
}

function historyOf(state: GameState, group: GroupId): RoundResult[] {
  return getTrack(state, group)?.roundHistory ?? [];
}

/** X pro Teilnehmer über alle ausgewerteten Runden seiner Gruppe. */
export function getErrorCounts(state: GameState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const player of state.players) counts[player.id] = 0;
  for (const group of activeGroups(state)) {
    const players = playersOf(state, group);
    for (const round of historyOf(state, group)) {
      for (const player of players) {
        if (round.playerResults[player.id] !== true) counts[player.id] += 1;
      }
    }
  }
  return counts;
}

/** Statistik und Rangliste – für eine Gruppe oder (ohne Angabe) für alle Teilnehmer. */
export function getPlayerStats(state: GameState, group?: GroupId): PlayerStats[] {
  const players = group ? playersOf(state, group) : state.players;
  const unranked = players.map((player) => {
    const group = groupOf(state, player);
    const history = historyOf(state, group);
    const roundMs = getGroupRoundDuration(state.mode, group) * 1000;
    const penalties = getPenaltyTotals(history, [player.id])[player.id];
    const results = history.map((round) => {
      const success = round.playerResults[player.id] === true;
      const at = round.confirmedAt[player.id];
      // Die erste Runde einer Phase kann etwas länger sein: Haken davor zählen als 0.
      const ms = success && at !== undefined ? Math.min(roundMs, Math.max(0, at - (round.completedAt - roundMs))) : roundMs;
      return { roundNumber: round.roundNumber, success, ms };
    });
    const successes = results.filter((r) => r.success).length;
    const rounds = results.length;
    return {
      player,
      rank: 0,
      successes,
      errors: rounds - successes,
      rounds,
      successRate: rounds === 0 ? 0 : successes / rounds,
      results,
      totalMs: results.reduce((sum, r) => sum + r.ms, 0),
      penaltiesDrunk: penalties.drunk,
      penaltiesOpen: penalties.open,
    };
  });

  // Array.prototype.sort ist stabil: Bei Gleichstand bleibt die Eingabereihenfolge erhalten.
  // Rangliste nach Gesamtzeit bis zum Haken – wer schneller liefert, steht weiter oben.
  const sorted = [...unranked].sort((a, b) => a.totalMs - b.totalMs);
  return sorted.map((stats) => ({
    ...stats,
    rank: 1 + sorted.filter((other) => other.totalMs < stats.totalMs).length,
  }));
}

export function getRoundErrorCount(state: GameState, roundNumber: number, group: GroupId = 'main'): number {
  const round = historyOf(state, group).find((r) => r.roundNumber === roundNumber);
  if (!round) return 0;
  return playersOf(state, group).filter((p) => round.playerResults[p.id] !== true).length;
}

export function computeSummary(state: GameState): GameSummary {
  const ranking = getPlayerStats(state);
  const roundErrors = activeGroups(state).flatMap((group) =>
    historyOf(state, group).map((round) => ({
      group,
      roundNumber: round.roundNumber,
      errors: getRoundErrorCount(state, round.roundNumber, group),
    })),
  );
  const totalErrors = roundErrors.reduce((sum, r) => sum + r.errors, 0);
  const maxRoundErrors = Math.max(0, ...roundErrors.map((r) => r.errors));

  return {
    mode: state.mode,
    roundsPlayed: state.roundHistory.length,
    playerCount: state.players.length,
    extensionCount: state.extensionCount,
    playedSeconds: state.completedPlaySeconds,
    totalErrors,
    perfectRounds: roundErrors.filter((r) => r.errors === 0).length,
    totalRounds: roundErrors.length,
    worstRound:
      maxRoundErrors === 0
        ? null
        : {
            errors: maxRoundErrors,
            rounds: roundErrors
              .filter((r) => r.errors === maxRoundErrors)
              .map(({ group, roundNumber }) => ({ group, roundNumber })),
          },
    ...extremes(ranking),
    ranking,
    groups: activeGroups(state).map((group) => {
      const errorsByRound = roundErrors.filter((r) => r.group === group);
      const groupRanking = getPlayerStats(state, group);
      return {
        group,
        roundsPlayed: errorsByRound.length,
        perfectRounds: errorsByRound.filter((r) => r.errors === 0).length,
        ranking: groupRanking,
        ...extremes(groupRanking),
      };
    }),
    penaltiesDrunk: ranking.reduce((sum, s) => sum + s.penaltiesDrunk, 0),
    openPenalties: ranking
      .filter((s) => s.penaltiesOpen > 0)
      .map((s) => ({ player: s.player, count: s.penaltiesOpen }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Schnellste Teilnehmer (Platz 1) und die mit den meisten X (bei Gleichstand alle). */
function extremes(ranking: PlayerStats[]): { bestPlayers: Player[]; mostErrorPlayers: Player[] } {
  const max = Math.max(0, ...ranking.map((s) => s.errors));
  return {
    bestPlayers: ranking.filter((s) => s.rank === 1).map((s) => s.player),
    mostErrorPlayers: max === 0 ? [] : ranking.filter((s) => s.errors === max).map((s) => s.player),
  };
}
