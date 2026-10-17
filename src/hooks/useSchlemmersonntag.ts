import { useCallback, useEffect, useRef, useState } from 'react';
import hymne from '../assets/schlemmersonntag.mp3';
import { sounds } from '../audio/sounds';
import { SCHLEMMER_DURATION_MS, isSchlemmerDue } from '../game/schlemmersonntag';
import type { GameState } from '../game/types';

const SHOWN_KEY = 'das-spiel/schlemmersonntag/v1';
/** Die Hymne setzt kurz nach dem Pop-Geräusch ein. */
const HYMNE_DELAY = 0.35;

/** Merkt sich, in welchem Spiel (Startzeitpunkt) das Pop-up schon kam – auch über Neuladen hinweg. */
function wasShown(startedAt: number): boolean {
  try {
    return localStorage.getItem(SHOWN_KEY) === String(startedAt);
  } catch {
    return false;
  }
}

function markShown(startedAt: number): void {
  try {
    localStorage.setItem(SHOWN_KEY, String(startedAt));
  } catch {
    // Ohne Speicher kommt es nach dem Neuladen evtl. noch einmal – nicht schlimm.
  }
}

/** Einmal pro Spiel: Pop-up „Kennen Sie schon den Schlemmersonntag?“ mit 10 Sekunden Hymne. */
export function useSchlemmersonntag(state: GameState, now: number, soundEnabled: boolean) {
  const [visible, setVisible] = useState(false);
  const stopHymne = useRef<(() => void) | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const running = state.status === 'running';
  const { startedAt } = state;
  const due = running && startedAt !== null && isSchlemmerDue(startedAt, now);

  const close = useCallback(() => {
    window.clearTimeout(timer.current);
    stopHymne.current?.();
    stopHymne.current = null;
    setVisible(false);
  }, []);

  // Vorab laden, damit die Hymne pünktlich startet.
  useEffect(() => {
    if (running && soundEnabled) sounds.preload(hymne);
  }, [running, soundEnabled]);

  useEffect(() => {
    if (!due || startedAt === null || wasShown(startedAt)) return;
    markShown(startedAt);
    setVisible(true);
    if (soundEnabled) {
      sounds.playPop();
      stopHymne.current = sounds.playClip(hymne, HYMNE_DELAY);
    }
    timer.current = window.setTimeout(close, SCHLEMMER_DURATION_MS);
  }, [due, startedAt, soundEnabled, close]);

  // Spielende oder Abbruch: sofort weg.
  useEffect(() => {
    if (!running) close();
  }, [running, close]);
  useEffect(() => close, [close]);

  return { visible, close };
}
