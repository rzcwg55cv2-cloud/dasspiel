import { useCallback, useEffect, useRef, useState } from 'react';
import { sounds } from '../audio/sounds';
import { BIERWISSEN, getDueFact, getFactDuration, shuffledIndices } from '../game/bierwissen';
import type { GameState } from '../game/types';

const STORAGE_KEY = 'das-spiel/bierwissen/v1';

interface Memory {
  /** Abschnitte, deren Pop-up schon kam (nach dem Neuladen nicht noch einmal). */
  shown: string[];
  /** Noch nicht gezeigte Fakten in zufälliger Reihenfolge – erst wenn alle durch sind, neu mischen. */
  bag: number[];
}

function load(): Memory {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<Memory> | null;
    const bag = Array.isArray(data?.bag) ? data.bag.filter((i) => Number.isInteger(i) && i >= 0 && i < BIERWISSEN.length) : [];
    const shown = Array.isArray(data?.shown) ? data.shown.filter((id) => typeof id === 'string') : [];
    return { shown, bag };
  } catch {
    return { shown: [], bag: [] };
  }
}

function save(memory: Memory): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Ohne Speicher kann sich ein Fakt früher wiederholen – nicht schlimm.
  }
}

/**
 * Einmal pro 10-Minuten-Abschnitt ein Pop-up mit unnützem Bierwissen und Plopp.
 * `blocked`: Der Schlemmersonntag hat Vorrang – solange er zu sehen ist, kommt kein Fakt.
 */
export function useBierwissen(state: GameState, now: number, soundEnabled: boolean, blocked: boolean) {
  const [fact, setFact] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const running = state.status === 'running';
  const due = running && !blocked ? getDueFact(state, now) : null;
  const dueId = due?.id ?? null;

  const close = useCallback(() => {
    window.clearTimeout(timer.current);
    setFact(null);
  }, []);

  useEffect(() => {
    if (dueId === null) return;
    const memory = load();
    if (memory.shown.includes(dueId)) return;
    const bag = memory.bag.length > 0 ? memory.bag : shuffledIndices(BIERWISSEN.length);
    const [next, ...rest] = bag;
    save({ shown: [...memory.shown, dueId].slice(-60), bag: rest });

    const text = BIERWISSEN[next];
    setFact(text);
    if (soundEnabled) sounds.playPop();
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(close, getFactDuration(text));
  }, [dueId, soundEnabled, close]);

  // Spielende, Verlängerungsfrage oder Schlemmersonntag: sofort weg.
  useEffect(() => {
    if (!running || blocked) close();
  }, [running, blocked, close]);
  useEffect(() => close, [close]);

  return { fact, close };
}
