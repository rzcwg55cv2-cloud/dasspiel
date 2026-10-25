import { useCallback, useEffect, useRef, useState } from 'react';
import hymne from '../assets/schlemmersonntag.mp3';
import { sounds } from '../audio/sounds';
import { SCHLEMMER_DURATION_MS, isSchlemmerDue } from '../game/schlemmersonntag';
import type { GameState } from '../game/types';

const SHOWN_KEY = 'das-spiel/schlemmersonntag/v1';
/** Die Hymne setzt kurz nach dem Pop-Geräusch ein. */
const HYMNE_DELAY = 0.2;
/** So lange darf das Anwerfen der Audioausgabe höchstens dauern, sonst kommt das Pop-up trotzdem. */
const PREPARE_TIMEOUT_MS = 4000;

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

/**
 * Einmal pro Spiel: Pop-up „Kennen Sie schon den Schlemmersonntag?“ mit 10 Sekunden Hymne.
 * Verpasst ist er nie: Er wird nachgeholt, sobald die App wieder offen ist – auch noch bei
 * der Verlängerungsfrage, damit er sicher vor dem Feierabend kommt.
 */
export function useSchlemmersonntag(state: GameState, now: number, soundEnabled: boolean) {
  const [visible, setVisible] = useState(false);
  /** Zwischen „fällig“ und Erscheinen (Ton wird vorbereitet). */
  const [preparing, setPreparing] = useState(false);
  const stopHymne = useRef<(() => void) | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef(false);
  const inGame = state.status === 'running' || state.status === 'extension-decision';
  const { startedAt } = state;

  // Bei der Verlängerungsfrage steht die Spieluhr still – steht er noch aus, selbst weiterzählen.
  const [decisionNow, setDecisionNow] = useState(0);
  const waitingInDecision = state.status === 'extension-decision' && startedAt !== null && !wasShown(startedAt);
  useEffect(() => {
    if (!waitingInDecision) return;
    const id = window.setInterval(() => setDecisionNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [waitingInDecision]);

  const due = inGame && startedAt !== null && isSchlemmerDue(startedAt, Math.max(now, decisionNow));

  const close = useCallback(() => {
    pending.current = false;
    setPreparing(false);
    window.clearTimeout(timer.current);
    stopHymne.current?.();
    stopHymne.current = null;
    setVisible(false);
  }, []);

  // Vorab laden, damit die Hymne pünktlich startet.
  useEffect(() => {
    if (inGame && soundEnabled) sounds.preload(hymne);
  }, [inGame, soundEnabled]);

  useEffect(() => {
    if (!due || startedAt === null || wasShown(startedAt)) return;
    markShown(startedAt);
    pending.current = true;
    setPreparing(true);
    const show = () => {
      if (!pending.current) return;
      pending.current = false;
      setPreparing(false);
      setVisible(true);
      if (soundEnabled) {
        sounds.playPop();
        stopHymne.current = sounds.playClip(hymne, HYMNE_DELAY);
      }
      timer.current = window.setTimeout(close, SCHLEMMER_DURATION_MS);
    };
    // Pop-up, Plopp und Hymne kommen zusammen – erst, wenn der Ton wirklich bereit ist.
    if (soundEnabled) sounds.prepare(hymne, PREPARE_TIMEOUT_MS).then(show);
    else show();
  }, [due, startedAt, soundEnabled, close]);

  // Spielende oder Abbruch: sofort weg.
  useEffect(() => {
    if (!inGame) close();
  }, [inGame, close]);
  useEffect(() => close, [close]);

  /** Fällig, in Vorbereitung oder zu sehen – dann warten andere Pop-ups. */
  const busy = visible || preparing || (due && startedAt !== null && !wasShown(startedAt));
  return { visible, busy, close };
}
