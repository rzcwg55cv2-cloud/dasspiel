import { describe, expect, it } from 'vitest';
import { advance, extendGame } from './engine';
import { FINISH_LABEL, LATER_TITLES, getDecisionText, getMood, getNameLines, getSayings } from './sayings';
import { MIN, SEC, T0, confirm, startedGame } from './test-utils';
import type { GameState } from './types';

const ALL = ['p1', 'p2', 'p3', 'p4'];

/** Spielt die erste Phase (6 Runden à 10 Minuten) mit den angegebenen Bestätigungen pro Runde. */
function firstPhase(rounds: string[][], names = ['Simon', 'Marvin', 'Tino', 'Malte']): GameState {
  let state = startedGame(names);
  rounds.forEach((ids, i) => {
    state = confirm(state, ids, T0 + i * 10 * MIN + 30 * SEC);
  });
  return advance(state, T0 + 60 * MIN).state;
}

describe('Stufen für die Verlängerungsfrage', () => {
  it('ordnet die X-Anzahl den Stufen zu (X sind eher selten)', () => {
    // 4 Teilnehmer × 6 Runden = 24 Teilnehmer-Runden
    expect(getMood(0, 24)).toBe('perfect');
    expect(getMood(1, 24)).toBe('good');
    expect(getMood(2, 24)).toBe('mixed');
    expect(getMood(3, 24)).toBe('mixed');
    expect(getMood(4, 24)).toBe('bad');
    // Ein einzelnes X ist immer noch „läuft gut“, auch in kleinen Runden.
    expect(getMood(1, 6)).toBe('good');
    // Größere Gruppe: 2 von 36 sind noch gut.
    expect(getMood(2, 36)).toBe('good');
    expect(getMood(5, 36)).toBe('mixed');
    expect(getMood(6, 36)).toBe('bad');
  });

  it('perfektes Spiel: Spruch aus „perfekt“, Ehrenrunde, keine Namen', () => {
    const state = firstPhase(Array.from({ length: 6 }, () => ALL));
    const text = getDecisionText(state);
    expect(text.mood).toBe('perfect');
    expect(getSayings('perfect').map((s) => s.title)).toContain(text.title);
    expect(text.extendLabel).toBe('EHRENRUNDE! (+30 MIN.)');
    expect(text.finishLabel).toBe(FINISH_LABEL);
    expect(text.nameLine).toBeNull();
  });

  it('ein X: „läuft gut“ mit Einzahl-Formulierung', () => {
    const state = firstPhase([['p1', 'p2', 'p3'], ALL, ALL, ALL, ALL, ALL]);
    const text = getDecisionText(state);
    expect(text.mood).toBe('good');
    expect(getSayings('good', 1).map((s) => s.text)).toContain(text.text);
    expect(getSayings('good', 1)[1].text).toBe('Das eine X hat keiner gesehen. Weiter?');
    expect(getSayings('good', 2)[1].text).toBe('Die paar X hat keiner gesehen. Weiter?');
  });

  it('viele X: Revanche', () => {
    const state = firstPhase([['p1'], ['p1'], ALL, ALL, ALL, ALL]);
    const text = getDecisionText(state);
    expect(text.mood).toBe('bad');
    expect(text.extendLabel).toBe('REVANCHE! (+30 MIN.)');
  });

  it('ab der zweiten Verlängerungsfrage kommen eigene Überschriften', () => {
    let state = firstPhase(Array.from({ length: 6 }, () => ALL));
    state = extendGame(state, T0 + 61 * MIN).state;
    state = advance(state, T0 + 91 * MIN).state; // Verlängerung ohne Bestätigungen -> viele X
    const text = getDecisionText(state);
    expect(LATER_TITLES).toContain(text.title);
    expect(text.mood).toBe('bad');
  });

  it('der Spruch bleibt beim Neuladen gleich', () => {
    const state = firstPhase([['p1', 'p2'], ALL, ALL, ALL, ALL, ALL]);
    expect(getDecisionText(structuredClone(state))).toEqual(getDecisionText(state));
  });
});

describe('Sprüche mit Namen', () => {
  it('nennt die Person mit den meisten X', () => {
    const state = firstPhase([['p1', 'p2', 'p3'], ['p1', 'p2', 'p3'], ALL, ['p1', 'p3', 'p4'], ALL, ALL]);
    expect(getNameLines(state)).toEqual(['Malte, alles okay bei dir? 2 X …', 'Malte zahlt den Kranz.']);
  });

  it('Gleichstand: mehrere Namen in der Mehrzahl', () => {
    const state = firstPhase([['p1', 'p2'], ALL, ALL, ALL, ALL, ALL]);
    expect(getNameLines(state)).toEqual([
      'Tino und Malte, alles okay bei euch? Je 1 X …',
      'Tino und Malte zahlen den Kranz.',
    ]);
  });

  it('„trägt euch allein“ nur, wenn genau eine Person ohne X ist', () => {
    const state = firstPhase([['p1'], ALL, ALL, ALL, ALL, ALL]);
    expect(getNameLines(state)).toContain('Simon trägt euch gerade allein.');
  });

  it('ohne X keine Sprüche mit Namen', () => {
    expect(getNameLines(firstPhase(Array.from({ length: 6 }, () => ALL)))).toEqual([]);
  });
});
