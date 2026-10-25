import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sounds } from './audio/sounds';
import { DecisionScreen } from './components/DecisionScreen';
import { MenuSheet, NoticeToast } from './components/Dialogs';
import { FactPopup } from './components/FactPopup';
import { GameScreen } from './components/GameScreen';
import { GuideSheet } from './components/GuideSheet';
import { ResultsScreen } from './components/ResultsScreen';
import { RoundBanner } from './components/RoundBanner';
import { SchlemmerPopup } from './components/SchlemmerPopup';
import { SetupScreen } from './components/SetupScreen';
import { estimateBeer } from './game/beer';
import { getClock, getStartBlocker } from './game/engine';

/** Abstand (Sekunden), wenn beide Gruppen gleichzeitig einen Ton bekommen. */
const SOUND_GAP = 1.1;

/** Kurzes Beben und Vibrieren, wenn Malte Spezial eingeschaltet wird. */
function impact(): void {
  try {
    navigator.vibrate?.([80, 40, 160]);
  } catch {
    // nicht unterstützt
  }
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  document.body.animate?.(
    [
      { transform: 'translate(0, 0)' },
      { transform: 'translate(-8px, 3px)' },
      { transform: 'translate(7px, -4px)' },
      { transform: 'translate(-5px, -2px)' },
      { transform: 'translate(4px, 3px)' },
      { transform: 'translate(-2px, 1px)' },
      { transform: 'translate(0, 0)' },
    ],
    { duration: 480, easing: 'ease-out' },
  );
}
import type { SoundCue } from './game/feedback';
import { getErrorCounts } from './game/stats';
import { useGame } from './hooks/useGame';
import { useBierwissen } from './hooks/useBierwissen';
import { useSchlemmersonntag } from './hooks/useSchlemmersonntag';
import { useSettings } from './hooks/useSettings';
import { useWakeLock } from './hooks/useWakeLock';

export default function App() {
  const [settings, updateSettings] = useSettings();
  const playSounds = useCallback(
    (cues: SoundCue[]) => {
      if (!settings.soundEnabled) return;
      cues.forEach((cue, index) => sounds.play(cue.kind, cue.group, index * SOUND_GAP));
    },
    [settings.soundEnabled],
  );
  const { state, now, liveRounds, notice, actions } = useGame(playSounds);
  const [menuOpen, setMenuOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const inGame = state.status === 'running' || state.status === 'extension-decision';

  useWakeLock(inGame);
  const schlemmer = useSchlemmersonntag(state, now, settings.soundEnabled);
  const bierwissen = useBierwissen(state, now, settings.soundEnabled, schlemmer.visible);

  // Malte Spezial: bedrohliches Rot von der Auswahl bis zum Spielende.
  const malteTheme = state.mode === 'malte' && state.status !== 'finished';
  const wasMalte = useRef(malteTheme);
  const soundEnabled = useRef(settings.soundEnabled);
  const stopSiren = useRef<(() => void) | null>(null);
  useEffect(() => {
    soundEnabled.current = settings.soundEnabled;
  }, [settings.soundEnabled]);
  useEffect(() => {
    const root = document.documentElement;
    if (malteTheme) root.dataset.theme = 'malte';
    else delete root.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', malteTheme ? '#140405' : '#ffffff');
    // Beim Anhaken auf dem Startbildschirm: Beben, Vibration und Sirene.
    if (malteTheme && !wasMalte.current && state.status === 'setup') {
      impact();
      if (soundEnabled.current) stopSiren.current = sounds.playSiren();
    }
    // Haken wieder weg: Sirene verstummt sofort.
    if (!malteTheme) {
      stopSiren.current?.();
      stopSiren.current = null;
    }
    wasMalte.current = malteTheme;
  }, [malteTheme, state.status]);

  // Mobile Browser geben Audio erst nach einer Benutzeraktion frei.
  useEffect(() => {
    const unlock = () => sounds.unlock();
    // App im Hintergrund oder geschlossen: Audioausgabe freigeben (keine „Wiedergabe“-Anzeige mehr).
    const release = () => {
      if (document.visibilityState === 'hidden') sounds.release();
    };
    const releaseNow = () => sounds.release();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', release);
    window.addEventListener('pagehide', releaseNow);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', release);
      window.removeEventListener('pagehide', releaseNow);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.status]);

  const errorCounts = useMemo(() => getErrorCounts(state), [state]);
  const clock = getClock(state, now);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const openGuide = useCallback(() => {
    setMenuOpen(false);
    setGuideOpen(true);
  }, []);
  const closeGuide = useCallback(() => setGuideOpen(false), []);
  const withAudio = (action: () => void) => () => {
    sounds.unlock();
    action();
  };

  let screen = null;
  switch (state.status) {
    case 'setup':
      screen = (
        <SetupScreen
          players={state.players}
          mode={state.mode}
          onAddPlayer={actions.addPlayer}
          onRemovePlayer={actions.removePlayer}
          onModeChange={actions.setMode}
          slowGroupEnabled={state.slowGroupEnabled}
          onSlowGroupChange={actions.setSlowGroupEnabled}
          onPlayerGroupChange={actions.setPlayerGroup}
          onPlayerAvatarChange={actions.setPlayerAvatar}
          startBlocker={getStartBlocker(state)}
          beer={estimateBeer(state)}
          onOpenGuide={openGuide}
          onStart={withAudio(actions.start)}
          onOpenMenu={openMenu}
        />
      );
      break;
    case 'running':
      screen = clock && (
        <GameScreen
          state={state}
          errorCounts={errorCounts}
          liveRounds={liveRounds}
          now={now}
          onToggle={actions.toggle}
          onTogglePenalty={actions.togglePenalty}
          onOpenMenu={openMenu}
        />
      );
      break;
    case 'extension-decision':
      screen = (
        <DecisionScreen
          state={state}
          totalErrors={Object.values(errorCounts).reduce((sum, n) => sum + n, 0)}
          onExtend={withAudio(actions.extend)}
          onFinish={actions.finish}
          onOpenMenu={openMenu}
        />
      );
      break;
    case 'finished':
      screen = <ResultsScreen state={state} onNewGame={actions.newGame} onRestart={withAudio(actions.restart)} />;
      break;
  }

  return (
    <>
      {screen}
      {malteTheme && <div className="malte-vignette" aria-hidden="true" />}
      {state.status === 'running' && liveRounds.length > 0 && !liveRounds.some((e) => e.phaseEnded) && (
        <RoundBanner
          key={liveRounds.map((e) => `${e.group}-${e.roundNumber}-${e.endedAt}`).join('|')}
          events={liveRounds}
          players={state.players}
          mode={state.mode}
          showGroups={state.slow !== null}
        />
      )}
      {menuOpen && state.status !== 'finished' && (
        <MenuSheet
          settings={settings}
          onChange={updateSettings}
          onTestSound={(kind, group) => {
            sounds.unlock();
            sounds.play(kind, group);
          }}
          showSlowGroup={state.slow !== null || (state.status === 'setup' && state.slowGroupEnabled && state.mode === 'normal')}
          onOpenGuide={openGuide}
          onClose={closeMenu}
          onCancelGame={inGame ? actions.cancel : undefined}
        />
      )}
      {guideOpen && <GuideSheet onClose={closeGuide} />}
      {schlemmer.visible && <SchlemmerPopup onClose={schlemmer.close} />}
      {bierwissen.fact && <FactPopup key={bierwissen.fact} fact={bierwissen.fact} onClose={bierwissen.close} />}
      {notice && <NoticeToast key={notice.id} title={notice.title} text={notice.text} onDismiss={actions.dismissNotice} />}
    </>
  );
}
