/**
 * Statistiken werden ausschließlich aus der Rundenhistorie berechnet.
 * Es gibt keine separat gespeicherten Fehlerzähler, die auseinanderlaufen könnten.
 */
import type { GameMode, GameState, Player } from './types';

export interface PlayerRound {
  roundNumber: number;
  success: boolean;
}

export interface PlayerStats {
  player: Player;
  /** Platz in der Rangliste; gleiche Fehlerzahl ergibt gleichen Platz (1, 1, 3, …). */
  rank: number;
  successes: number;
  errors: number;
  rounds: number;
  /** Erfolgsquote zwischen 0 und 1. */
  successRate: number;
  results: PlayerRound[];
}

export interface WorstRound {
  roundNumbers: number[];
  errors: number;
}

export interface GameSummary {
  mode: GameMode;
  roundsPlayed: number;
  playerCount: number;
  extensionCount: number;
  playedSeconds: number;
  totalErrors: number;
  perfectRounds: number;
  /** Runde(n) mit den meisten Fehlern; null, wenn es keine Fehler gab. */
  worstRound: WorstRound | null;
  /** Alle Teilnehmer mit den wenigsten Fehlern. */
  bestPlayers: Player[];
  /** Alle Teilnehmer mit den meisten Fehlern; leer, wenn niemand einen Fehler hat. */
  mostErrorPlayers: Player[];
  ranking: PlayerStats[];
}

/** Fehler pro Teilnehmer über alle ausgewerteten Runden. */
export function getErrorCounts(state: GameState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const player of state.players) counts[player.id] = 0;
  for (const round of state.roundHistory) {
    for (const player of state.players) {
      if (round.playerResults[player.id] !== true) counts[player.id] += 1;
    }
  }
  return counts;
}

export function getPlayerStats(state: GameState): PlayerStats[] {
  const unranked = state.players.map((player) => {
    const results = state.roundHistory.map((round) => ({
      roundNumber: round.roundNumber,
      success: round.playerResults[player.id] === true,
    }));
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
    };
  });

  // Array.prototype.sort ist stabil: Bei Gleichstand bleibt die Eingabereihenfolge erhalten.
  const sorted = [...unranked].sort((a, b) => a.errors - b.errors);
  return sorted.map((stats) => ({
    ...stats,
    rank: 1 + sorted.filter((other) => other.errors < stats.errors).length,
  }));
}

export function getRoundErrorCount(state: GameState, roundNumber: number): number {
  const round = state.roundHistory.find((r) => r.roundNumber === roundNumber);
  if (!round) return 0;
  return state.players.filter((p) => round.playerResults[p.id] !== true).length;
}

export function computeSummary(state: GameState): GameSummary {
  const ranking = getPlayerStats(state);
  const roundErrors = state.roundHistory.map((round) => ({
    roundNumber: round.roundNumber,
    errors: getRoundErrorCount(state, round.roundNumber),
  }));
  const totalErrors = roundErrors.reduce((sum, r) => sum + r.errors, 0);
  const maxRoundErrors = Math.max(0, ...roundErrors.map((r) => r.errors));
  const minPlayerErrors = Math.min(...ranking.map((s) => s.errors));
  const maxPlayerErrors = Math.max(0, ...ranking.map((s) => s.errors));

  return {
    mode: state.mode,
    roundsPlayed: state.roundHistory.length,
    playerCount: state.players.length,
    extensionCount: state.extensionCount,
    playedSeconds: state.completedPlaySeconds,
    totalErrors,
    perfectRounds: roundErrors.filter((r) => r.errors === 0).length,
    worstRound:
      maxRoundErrors === 0
        ? null
        : {
            errors: maxRoundErrors,
            roundNumbers: roundErrors.filter((r) => r.errors === maxRoundErrors).map((r) => r.roundNumber),
          },
    bestPlayers: ranking.filter((s) => s.errors === minPlayerErrors).map((s) => s.player),
    mostErrorPlayers:
      maxPlayerErrors === 0 ? [] : ranking.filter((s) => s.errors === maxPlayerErrors).map((s) => s.player),
    ranking,
  };
}
