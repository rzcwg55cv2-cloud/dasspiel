/**
 * Verbindet die reine Spiellogik mit React:
 * - aktualisiert regelmäßig die Anzeige und wertet abgelaufene Runden aus,
 * - speichert jeden geänderten Zustand sofort,
 * - löst Sounds, Rundenwechsel-Animation und Hinweise aus.
 *
 * Das Intervall dient nur der Anzeige. Alle Zeiten werden aus Zeitstempeln berechnet.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as engine from '../game/engine';
import { getFeedback, type SoundKind } from '../game/feedback';
import { pluralize } from '../game/format';
import { STATE_KEY, deserializeState, loadState, saveState } from '../game/storage';
import type { GameMode, GameState, GroupId, RoundEvent, Transition } from '../game/types';

const TICK_MS = 250;

export interface Notice {
  id: number;
  title: string;
  text: string;
}

type Update = (state: GameState, now: number) => Transition | GameState;

function toTransition(result: Transition | GameState): Transition {
  return 'events' in result ? result : { state: result, events: [] };
}

function catchUpNotice(rounds: number, errors: number): Notice {
  return {
    id: Date.now(),
    title: 'Willkommen zurück',
    text: `${pluralize(rounds, 'Runde wurde', 'Runden wurden')} nachgetragen – ${
      errors === 0 ? 'ohne X' : `${errors} X`
    }.`,
  };
}

function initialise() {
  const now = Date.now();
  const loaded = loadState();
  const { state, events } = engine.advance(loaded.state, now);
  if (state !== loaded.state) saveState(state);
  // Beim Öffnen der App gibt es keine Sounds für verpasste Runden, nur eine Zusammenfassung.
  let notice: Notice | null = null;
  if (loaded.recovered) {
    notice = {
      id: now,
      title: 'Spielstand zurückgesetzt',
      text: 'Der gespeicherte Spielstand war beschädigt und konnte nicht geladen werden.',
    };
  } else if (events.length > 0) {
    const errors = events.reduce((sum, e) => sum + e.failedPlayerIds.length, 0);
    notice = catchUpNotice(events.length, errors);
  }
  return { state, now, notice };
}

export function useGame(onSound: (kind: SoundKind) => void) {
  const [initial] = useState(initialise);
  const [state, setState] = useState(initial.state);
  const [now, setNow] = useState(initial.now);
  const [liveRounds, setLiveRounds] = useState<RoundEvent[]>([]);
  const [notice, setNotice] = useState<Notice | null>(initial.notice);
  const stateRef = useRef(state);
  const onSoundRef = useRef(onSound);

  useEffect(() => {
    onSoundRef.current = onSound;
  }, [onSound]);

  const apply = useCallback((update: Update) => {
    const time = Date.now();
    const { state: next, events } = toTransition(update(stateRef.current, time));
    if (next !== stateRef.current) {
      stateRef.current = next;
      setState(next);
      saveState(next);
    }
    if (events.length > 0) {
      const feedback = getFeedback(events, time);
      if (feedback.sound) onSoundRef.current(feedback.sound);
      if (feedback.liveRounds.length > 0) setLiveRounds(feedback.liveRounds);
      if (feedback.catchUp) setNotice(catchUpNotice(feedback.catchUp.rounds, feedback.catchUp.errors));
    }
    setNow(time);
  }, []);

  const running = state.status === 'running';

  // Anzeige aktualisieren und abgelaufene Runden auswerten.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => apply(engine.advance), TICK_MS);
    return () => window.clearInterval(id);
  }, [running, apply]);

  // Nach Standby, Tab-Wechsel oder Rückkehr aus dem Hintergrund sofort neu berechnen.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') apply(engine.advance);
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
    };
  }, [apply]);

  // Ist die App in mehreren Tabs geöffnet, übernehmen alle denselben Spielstand.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STATE_KEY || event.newValue === null) return;
      const loaded = deserializeState(event.newValue);
      if (loaded.recovered) return;
      stateRef.current = loaded.state;
      setState(loaded.state);
      setNow(Date.now());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const actions = useMemo(
    () => ({
      addPlayer(name: string): engine.AddPlayerError | null {
        let error: engine.AddPlayerError | null = null;
        apply((s) => {
          const result = engine.addPlayer(s, name);
          error = result.error;
          return result.state;
        });
        return error;
      },
      removePlayer: (id: string) => apply((s) => engine.removePlayer(s, id)),
      setMode: (mode: GameMode) => apply((s) => engine.setMode(s, mode)),
      setSlowGroupEnabled: (enabled: boolean) => apply((s) => engine.setSlowGroupEnabled(s, enabled)),
      setPlayerGroup: (id: string, group: GroupId) => apply((s) => engine.setPlayerGroup(s, id, group)),
      start() {
        setLiveRounds([]);
        apply(engine.startGame);
      },
      toggle: (playerId: string) => apply((s, t) => engine.toggleConfirmation(s, playerId, t)),
      extend: () => apply(engine.extendGame),
      finish: () => apply(engine.finishGame),
      cancel() {
        setLiveRounds([]);
        apply((s) => engine.cancelGame(s));
      },
      newGame: () => apply((s) => engine.newGame(s)),
      restart() {
        setLiveRounds([]);
        apply(engine.restartWithSameGroup);
      },
      dismissNotice: () => setNotice(null),
    }),
    [apply],
  );

  return { state, now, liveRounds, notice, actions };
}
