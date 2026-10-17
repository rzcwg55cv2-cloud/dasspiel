import { describe, expect, it } from 'vitest';
import {
  advance,
  extendGame,
  finishGame,
  getPenalties,
  setPlayerGroup,
  setSlowGroupEnabled,
  startGame,
  togglePenalty,
} from './engine';
import { nextPenalty } from './penalties';
import { computeSummary, getPlayerStats } from './stats';
import { deserializeState } from './storage';
import { MIN, T0, confirm, setupState, startedGame } from './test-utils';
import type { GameState } from './types';

/** Simon (p1) liefert, Marvin (p2) bekommt in Runde 1 ein X. */
function afterFirstX(): GameState {
  const game = confirm(startedGame(['Simon', 'Marvin']), ['p1'], T0 + MIN);
  return advance(game, T0 + 10 * MIN).state;
}

describe('Strafbier: Regel', () => {
  it('ein X ergibt ein Strafbier, nicht abgehakte verdoppeln sich', () => {
    expect(nextPenalty(0, false, false)).toBe(0);
    expect(nextPenalty(0, false, true)).toBe(1);
    expect(nextPenalty(1, true, false)).toBe(0);
    expect(nextPenalty(1, false, false)).toBe(2);
    expect(nextPenalty(2, false, false)).toBe(4);
    expect(nextPenalty(2, false, true)).toBe(5);
    expect(nextPenalty(2, true, true)).toBe(1);
  });
});

describe('Strafbier: Ablauf', () => {
  it('wer ein X bekommt, hat in der nächsten Runde ein Strafbier offen', () => {
    const game = confirm(startedGame(['Simon', 'Marvin']), ['p1'], T0 + MIN);
    const { state, events } = advance(game, T0 + 10 * MIN);
    expect(events[0].penalties).toEqual({ p2: 1 });
    expect(events[0].doubledPenaltyIds).toEqual([]);
    expect(getPenalties(state, 'main')).toEqual({ p2: 1 });
  });

  it('abgehakt ist es erledigt', () => {
    let game = togglePenalty(afterFirstX(), 'p2', T0 + 12 * MIN).state;
    expect(game.currentPenaltiesPaid).toEqual({ p2: true });
    game = confirm(game, ['p1', 'p2'], T0 + 13 * MIN);

    const { state, events } = advance(game, T0 + 20 * MIN);
    expect(events[0].doubledPenaltyIds).toEqual([]);
    expect(events[0].penalties).toEqual({});
    expect(getPenalties(state, 'main')).toEqual({});
    expect(state.roundHistory[1].penaltiesPaid).toEqual({ p2: true });
    expect(state.currentPenaltiesPaid).toEqual({});
  });

  it('nicht abgehakt werden zwei draus – und ein neues X kommt obendrauf', () => {
    let game = confirm(afterFirstX(), ['p1', 'p2'], T0 + 12 * MIN);
    const second = advance(game, T0 + 20 * MIN);
    expect(second.events[0].failedPlayerIds).toEqual([]);
    expect(second.events[0].doubledPenaltyIds).toEqual(['p2']);
    expect(getPenalties(second.state, 'main')).toEqual({ p2: 2 });

    game = confirm(second.state, ['p1'], T0 + 22 * MIN);
    const third = advance(game, T0 + 30 * MIN);
    expect(getPenalties(third.state, 'main')).toEqual({ p2: 5 });
  });

  it('der Haken lässt sich zurücknehmen und geht nur bei offenem Strafbier', () => {
    const game = afterFirstX();
    expect(togglePenalty(game, 'p1', T0 + 11 * MIN).state.currentPenaltiesPaid).toEqual({});
    const twice = togglePenalty(togglePenalty(game, 'p2', T0 + 11 * MIN).state, 'p2', T0 + 12 * MIN).state;
    expect(twice.currentPenaltiesPaid).toEqual({});
    expect(togglePenalty(startedGame(['Simon']), 'p1', T0 + MIN).state.currentPenaltiesPaid).toEqual({});
  });

  it('ein Haken gilt nur in seiner Runde', () => {
    // Runde 2: abgehakt, aber erneut X → in Runde 3 wieder genau eins offen, ohne Haken.
    let game = togglePenalty(afterFirstX(), 'p2', T0 + 12 * MIN).state;
    game = confirm(game, ['p1'], T0 + 13 * MIN);
    const { state } = advance(game, T0 + 20 * MIN);
    expect(getPenalties(state, 'main')).toEqual({ p2: 1 });
    expect(state.currentPenaltiesPaid).toEqual({});
  });

  it('Strafbiere aus der letzten Runde gelten nach der Verlängerung weiter', () => {
    let game = startedGame(['Simon', 'Marvin']);
    for (let round = 0; round < 5; round++) game = confirm(game, ['p1', 'p2'], T0 + round * 10 * MIN + MIN);
    game = confirm(game, ['p1'], T0 + 51 * MIN);

    const decision = advance(game, T0 + 60 * MIN).state;
    expect(decision.status).toBe('extension-decision');
    expect(getPenalties(decision, 'main')).toEqual({ p2: 1 });

    const extended = extendGame(decision, T0 + 62 * MIN).state;
    const paid = togglePenalty(extended, 'p2', T0 + 63 * MIN).state;
    expect(paid.currentPenaltiesPaid).toEqual({ p2: true });
    expect(togglePenalty(decision, 'p2', T0 + 61 * MIN).state).toBe(decision);
  });

  it('der 15-Minuten-Takt hat eigene Strafbiere', () => {
    let setup = setSlowGroupEnabled(setupState(['Simon', 'Marvin', 'Anna']), true);
    setup = setPlayerGroup(setup, 'p3', 'slow');
    let game = startGame(setup, T0).state;
    game = confirm(game, ['p1', 'p2'], T0 + MIN);

    game = advance(game, T0 + 15 * MIN).state;
    expect(getPenalties(game, 'main')).toEqual({});
    expect(getPenalties(game, 'slow')).toEqual({ p3: 1 });

    game = togglePenalty(game, 'p3', T0 + 16 * MIN).state;
    expect(game.slow?.currentPenaltiesPaid).toEqual({ p3: true });
    expect(game.currentPenaltiesPaid).toEqual({});
  });
});

describe('Strafbier: Auswertung und Speichern', () => {
  it('zählt getrunkene und bei Spielende offene Strafbiere', () => {
    let game = startedGame(['Simon', 'Marvin']);
    for (let round = 0; round < 6; round++) {
      const at = T0 + round * 10 * MIN + MIN;
      game = advance(game, at).state;
      // Marvin trinkt sein Strafbier in Runde 2 und bekommt in Runde 1, 3 und 6 ein X.
      if (round === 1) game = togglePenalty(game, 'p2', at).state;
      game = confirm(game, round === 0 || round === 2 || round === 5 ? ['p1'] : ['p1', 'p2'], at);
    }
    // Ab Runde 4 trinkt er nicht mehr: 1 → 2 → 4, nach Runde 6 mit neuem X 2 × 4 + 1 = 9 offen.
    const finished = finishGame(advance(game, T0 + 60 * MIN).state, T0 + 61 * MIN).state;
    const marvin = getPlayerStats(finished).find((s) => s.player.id === 'p2')!;
    expect(marvin.penaltiesDrunk).toBe(1);
    expect(marvin.penaltiesOpen).toBe(9);

    const summary = computeSummary(finished);
    expect(summary.penaltiesDrunk).toBe(1);
    expect(summary.openPenalties.map((o) => [o.player.name, o.count])).toEqual([['Marvin', 9]]);
  });

  it('übersteht Neuladen und übernimmt alte Spielstände ohne Strafbiere', () => {
    const game = togglePenalty(afterFirstX(), 'p2', T0 + 12 * MIN).state;
    expect(deserializeState(JSON.stringify(game)).state).toEqual(game);

    const old = JSON.parse(JSON.stringify(game));
    delete old.currentPenaltiesPaid;
    for (const round of old.roundHistory) delete round.penaltiesPaid;
    const loaded = deserializeState(JSON.stringify(old));
    expect(loaded.recovered).toBe(false);
    expect(loaded.state.currentPenaltiesPaid).toEqual({});
    expect(getPenalties(loaded.state, 'main')).toEqual({ p2: 1 });
  });
});
