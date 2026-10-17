import { useCallback, useEffect, useMemo, useState } from 'react';
import { sounds } from './audio/sounds';
import { DecisionScreen } from './components/DecisionScreen';
import { MenuSheet, NoticeToast } from './components/Dialogs';
import { GameScreen } from './components/GameScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { RoundBanner } from './components/RoundBanner';
import { SetupScreen } from './components/SetupScreen';
import { getClock, getStartBlocker } from './game/engine';
import type { SoundKind } from './game/feedback';
import { getErrorCounts } from './game/stats';
import { useGame } from './hooks/useGame';
import { useSettings } from './hooks/useSettings';
import { useWakeLock } from './hooks/useWakeLock';

export default function App() {
  const [settings, updateSettings] = useSettings();
  const playSound = useCallback(
    (kind: SoundKind) => {
      if (settings.soundEnabled) sounds.play(kind);
    },
    [settings.soundEnabled],
  );
  const { state, now, liveRounds, notice, actions } = useGame(playSound);
  const [menuOpen, setMenuOpen] = useState(false);
  const inGame = state.status === 'running' || state.status === 'extension-decision';

  useWakeLock(inGame);

  // Mobile Browser geben Audio erst nach einer Benutzeraktion frei.
  useEffect(() => {
    const unlock = () => sounds.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.status]);

  const errorCounts = useMemo(() => getErrorCounts(state), [state]);
  const clock = getClock(state, now);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
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
          startBlocker={getStartBlocker(state)}
          onStart={withAudio(actions.start)}
          onOpenMenu={openMenu}
        />
      );
      break;
    case 'running':
      screen = clock && (
        <GameScreen
          state={state}
          clock={clock}
          errorCounts={errorCounts}
          liveRounds={liveRounds}
          now={now}
          onToggle={actions.toggle}
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
          onTestSound={(kind) => {
            sounds.unlock();
            sounds.play(kind);
          }}
          onClose={closeMenu}
          onCancelGame={inGame ? actions.cancel : undefined}
        />
      )}
      {notice && <NoticeToast key={notice.id} title={notice.title} text={notice.text} onDismiss={actions.dismissNotice} />}
    </>
  );
}
