/**
 * Bierbedarf vor Spielbeginn: ein Kölsch (0,2 l) pro Person und Runde ihres Takts.
 * Strafbiere sind nicht eingerechnet.
 */
import { playersOf } from './engine';
import { getGroupRoundDuration, getRoundsInPhase } from './rules';
import type { GameState, GroupId } from './types';

export const GLASS_LITERS = 0.2;

export interface BeerEstimate {
  /** Kölsch für die ersten 60 Minuten. */
  glasses: number;
  /** Zusätzliche Kölsch je Verlängerung um 30 Minuten. */
  extensionGlasses: number;
}

export function estimateBeer(state: GameState): BeerEstimate {
  const glassesFor = (extensionCount: number) =>
    (['main', 'slow'] as GroupId[]).reduce(
      (sum, group) =>
        sum + playersOf(state, group).length * getRoundsInPhase(getGroupRoundDuration(state.mode, group), extensionCount),
      0,
    );
  return { glasses: glassesFor(0), extensionGlasses: glassesFor(1) };
}
