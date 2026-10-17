import { useRef, type CSSProperties } from 'react';
import type { GameClock } from '../game/engine';
import { formatClock } from '../game/format';
import { getModeLabel } from '../game/rules';
import type { GameState, RoundEvent, RoundResult } from '../game/types';
import { Avatar } from './Avatar';
import { MenuIcon, StatusMark, type MarkState } from './icons';
import { KoelschGlass } from './KoelschGlass';

/** So lange wird ein rotes X nach Rundenende angezeigt, bevor der graue Kreis zurückkehrt. */
const MISSED_FLASH_MS = 4500;
/** Schutz gegen versehentliches Doppeltippen auf dieselbe Zeile. */
const TAP_GUARD_MS = 350;

interface Props {
  state: GameState;
  clock: GameClock;
  errorCounts: Record<string, number>;
  liveRound: RoundEvent | null;
  now: number;
  onToggle: (playerId: string) => void;
  onOpenMenu: () => void;
}

export function GameScreen({ state, clock, errorCounts, liveRound, now, onToggle, onOpenMenu }: Props) {
  const lastTap = useRef<Record<string, number>>({});
  const confirmed = state.players.filter((p) => state.currentConfirmations[p.id]).length;
  const total = state.players.length;
  const allConfirmed = confirmed === total;
  const missedIds = new Set(
    liveRound !== null && now - liveRound.endedAt < MISSED_FLASH_MS ? liveRound.failedPlayerIds : [],
  );
  const phaseRounds = state.roundHistory.slice(clock.lastRoundOfPhase - clock.roundsInPhase);
  const roundProgress = 1 - clock.roundRemainingMs / (clock.phaseDurationMs / clock.roundsInPhase);
  const malte = state.mode === 'malte';

  const handleTap = (playerId: string) => {
    const time = performance.now();
    if (time - (lastTap.current[playerId] ?? -Infinity) < TAP_GUARD_MS) return;
    lastTap.current[playerId] = time;
    try {
      navigator.vibrate?.(8);
    } catch {
      // nicht unterstützt
    }
    onToggle(playerId);
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-5 pt-safe pb-safe lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-14 lg:px-10">
      <section className="lg:sticky lg:top-0 lg:pt-6" aria-label="Zeit">
        <header className="relative flex flex-col items-center pt-1 text-center">
          <span className="flex items-end gap-0.5">
            <span className="brand-text text-sm font-black tracking-[0.3em]">DAS SPIEL</span>
            <KoelschGlass className="mb-0.5 h-[1.375rem] w-[0.6875rem]" />
          </span>
          <span
            className={`mt-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.25em] ${
              malte ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'
            }`}
          >
            {getModeLabel(state.mode).toUpperCase()}
          </span>
          <button
            type="button"
            onClick={onOpenMenu}
            className="absolute top-0 -right-2 grid size-11 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Menü"
          >
            <MenuIcon className="size-6" />
          </button>
        </header>

        <div className="mt-5 text-center sm:mt-9">
          <p className="text-sm font-bold tracking-[0.3em] text-slate-400">
            RUNDE <span className="tabular text-pink-500">{clock.roundNumber}</span>
            <span className="tabular ml-2 text-slate-300">/ {clock.lastRoundOfPhase}</span>
          </p>
          <Countdown seconds={clock.roundRemainingSeconds} />
          <p className="tabular mt-3 text-sm text-slate-500">
            Gesamtzeit <span className="font-bold text-slate-800">{formatClock(clock.playedSeconds)}</span>
            <span className="text-slate-400"> / {formatClock(clock.plannedSeconds)}</span>
          </p>
          <PhaseProgress
            rounds={clock.roundsInPhase}
            current={clock.roundInPhase}
            currentProgress={roundProgress}
            history={phaseRounds}
          />
        </div>

        <p
          className={`mt-7 rounded-2xl px-3 py-3 text-center text-sm font-bold tracking-[0.12em] transition-colors sm:tracking-[0.18em] ${
            allConfirmed
              ? 'bg-linear-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25'
              : 'bg-sky-50 text-sky-700'
          }`}
          aria-live="polite"
        >
          {allConfirmed ? (
            'ALLE BESTÄTIGT'
          ) : (
            <>
              <span className="tabular font-black text-sky-900">{confirmed}</span> VON{' '}
              <span className="tabular font-black text-sky-900">{total}</span>{' '}
              {total === 1 ? 'TEILNEHMER' : 'TEILNEHMERN'} BESTÄTIGT
            </>
          )}
        </p>
      </section>

      <section className="mt-4 lg:mt-6" aria-label="Teilnehmer">
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-1">
          {state.players.map((player, index) => {
            const isConfirmed = state.currentConfirmations[player.id] === true;
            const missed = !isConfirmed && missedIds.has(player.id);
            const markState: MarkState = isConfirmed ? 'confirmed' : missed ? 'missed' : 'pending';
            return (
              <li key={player.id}>
                <PlayerRow
                  name={player.name}
                  index={index}
                  errors={errorCounts[player.id] ?? 0}
                  mark={markState}
                  onTap={() => handleTap(player.id)}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Countdown({ seconds }: { seconds: number }) {
  const tone = seconds < 30 ? 'text-rose-500' : seconds < 60 ? 'text-amber-500' : 'text-slate-900';
  const pulse = seconds <= 10 ? 'animate-soft-pulse' : '';
  return (
    <div
      role="timer"
      aria-label={`Restzeit ${formatClock(seconds)}`}
      className={`tabular mt-1 text-[clamp(5.75rem,30vw,12.5rem)] leading-none font-bold tracking-[-0.045em] transition-colors duration-500 ${tone} ${pulse}`}
    >
      {formatClock(seconds)}
    </div>
  );
}

interface PhaseProgressProps {
  rounds: number;
  current: number;
  currentProgress: number;
  history: RoundResult[];
}

/** Ein Segment pro Runde der aktuellen Spielphase: grün = alle bestätigt, rot = Fehler. */
function PhaseProgress({ rounds, current, currentProgress, history }: PhaseProgressProps) {
  return (
    <div className="mx-auto mt-4 flex max-w-md gap-1" aria-hidden="true">
      {Array.from({ length: rounds }, (_, index) => {
        let fill = 'w-0';
        let style: CSSProperties | undefined;
        if (index < current - 1) {
          const perfect = Object.values(history[index]?.playerResults ?? {}).every(Boolean);
          fill = perfect ? 'w-full bg-emerald-400' : 'w-full bg-rose-400';
        } else if (index === current - 1) {
          fill = 'brand-gradient';
          style = { width: `${Math.min(100, Math.max(0, currentProgress * 100))}%` };
        }
        return (
          <div key={index} className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${fill}`} style={style} />
          </div>
        );
      })}
    </div>
  );
}

interface PlayerRowProps {
  name: string;
  index: number;
  errors: number;
  mark: MarkState;
  onTap: () => void;
}

function PlayerRow({ name, index, errors, mark, onTap }: PlayerRowProps) {
  const tone =
    mark === 'confirmed'
      ? 'border-emerald-300 bg-emerald-50'
      : mark === 'missed'
        ? 'border-rose-300 bg-rose-50'
        : 'border-slate-100 bg-white shadow-sm hover:border-slate-200';
  return (
    <button
      type="button"
      onClick={onTap}
      aria-pressed={mark === 'confirmed'}
      aria-label={`${name}: ${mark === 'confirmed' ? 'bestätigt' : 'nicht bestätigt'}, ${errors} Fehler`}
      className={`flex min-h-[76px] w-full items-center gap-3.5 rounded-2xl border-2 py-2.5 pr-3 pl-3 text-left transition active:scale-[0.985] ${tone}`}
    >
      <Avatar name={name} index={index} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xl font-bold text-slate-900" title={name}>
          {name}
        </span>
        <span
          className={`tabular mt-0.5 block text-sm ${errors > 0 ? 'font-semibold text-rose-500' : 'text-slate-400'}`}
        >
          {errors === 0 ? 'Keine Fehler' : `${errors} Fehler`}
        </span>
      </span>
      <StatusMark key={mark} state={mark} className="size-12 shrink-0" />
    </button>
  );
}
