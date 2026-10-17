import { addPlayer, advance, createInitialState, setMode, startGame, toggleConfirmation } from './engine';
import type { GameMode, GameState } from './types';

export const T0 = Date.UTC(2026, 9, 17, 18, 0, 0);
export const SEC = 1000;
export const MIN = 60 * SEC;

export function setupState(names: string[], mode: GameMode = 'normal'): GameState {
  let state = setMode(createInitialState(), mode);
  names.forEach((name, i) => {
    state = addPlayer(state, name, () => `p${i + 1}`).state;
  });
  return state;
}

export function startedGame(names: string[], mode: GameMode = 'normal', at = T0): GameState {
  return startGame(setupState(names, mode), at).state;
}

/** Setzt X für die angegebenen Spieler-IDs zum Zeitpunkt `at`. */
export function confirm(state: GameState, ids: string[], at: number): GameState {
  let next = advance(state, at).state;
  for (const id of ids) {
    if (next.currentConfirmations[id]) continue;
    next = toggleConfirmation(next, id, at).state;
  }
  return next;
}
