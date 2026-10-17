import { useRef, type CSSProperties } from 'react';
import { getClock, getTrack, playersOf, type GameClock } from '../game/engine';
import { formatClock } from '../game/format';
import { getModeLabel } from '../game/rules';
import type { GameState, Player, RoundEvent, RoundResult } from '../game/types';
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
  liveRounds: RoundEvent[];
  now: number;
  onToggle: (playerId: string) => void;
  onOpenMenu: () => void;
}

export function GameScreen({ state, clock, errorCounts, liveRounds, now, onToggle, onOpenMenu }: Props) {
  const lastTap = useRef<Record<string, number>>({});
  const malte = state.mode === 'malte';
  const missedIds = new Set(
    liveRounds.filter((e) => now - e.endedAt < MISSED_FLASH_MS).flatMap((e) => e.failedPlayerIds),
  );
  const colorIndex = new Map(state.players.map((p, i) => [p.id, i]));
  const mainPlayers = playersOf(state, 'main');
  const slowClock = state.slow ? getClock(state, now, 'slow') : null;

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

  const renderPlayers = (players: Player[], confirmations: Record<string, boolean>) => (
    <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-1">
      {players.map((player) => {
        const isConfirmed = confirmations[player.id] === true;
        const missed = !isConfirmed && missedIds.has(player.id);
        const markState: MarkState = isConfirmed ? 'confirmed' : missed ? 'missed' : 'pending';
        return (
          <li key={player.id}>
            <PlayerRow
              name={player.name}
              index={colorIndex.get(player.id) ?? 0}
              errors={errorCounts[player.id] ?? 0}
              mark={markState}
              onTap={() => handleTap(player.id)}
            />
          </li>
        );
      })}
    </ul>
  );

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
              malte ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
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
          <RoundLabel clock={clock} tone="text-green-600" />
          <Countdown seconds={clock.roundRemainingSeconds} />
          <p className="tabular mt-3 text-sm text-slate-500">
            Gesamtzeit <span className="font-bold text-slate-800">{formatClock(clock.playedSeconds)}</span>
            <span className="text-slate-400"> / {formatClock(clock.plannedSeconds)}</span>
          </p>
          <PhaseProgress clock={clock} history={state.roundHistory} />
        </div>

        <DeliveryStatus confirmations={state.currentConfirmations} players={mainPlayers} />
      </section>

      <section className="mt-4 lg:mt-6" aria-label="Teilnehmer">
        {slowClock && state.slow && (
          <p className="mb-2 px-1 text-[11px] font-black tracking-[0.25em] text-green-700">10-MINUTEN-TAKT</p>
        )}
        {renderPlayers(mainPlayers, state.currentConfirmations)}

        {slowClock && state.slow && (
          <section
            aria-label="15-Minuten-Gruppe"
            className="mt-6 rounded-3xl border-2 border-yellow-300 bg-yellow-50/70 p-3 sm:p-4"
          >
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[11px] font-black tracking-[0.25em] text-yellow-800">15-MINUTEN-GRUPPE</p>
                <RoundLabel clock={slowClock} tone="text-yellow-700" small />
              </div>
              <Countdown seconds={slowClock.roundRemainingSeconds} small />
            </div>
            <PhaseProgress clock={slowClock} history={getTrack(state, 'slow')!.roundHistory} />
            <DeliveryStatus confirmations={state.slow.currentConfirmations} players={playersOf(state, 'slow')} small />
            <div className="mt-3">{renderPlayers(playersOf(state, 'slow'), state.slow.currentConfirmations)}</div>
          </section>
        )}
      </section>
    </div>
  );
}

function RoundLabel({ clock, tone, small = false }: { clock: GameClock; tone: string; small?: boolean }) {
  return (
    <p className={`font-bold text-slate-400 ${small ? 'mt-1 text-xs tracking-[0.25em]' : 'text-sm tracking-[0.3em]'}`}>
      RUNDE <span className={`tabular ${tone}`}>{clock.roundNumber}</span>
      <span className="tabular ml-2 text-slate-300">/ {clock.lastRoundOfPhase}</span>
    </p>
  );
}

function Countdown({ seconds, small = false }: { seconds: number; small?: boolean }) {
  const tone = seconds < 30 ? 'text-red-500' : seconds < 60 ? 'text-amber-500' : 'text-slate-900';
  const pulse = seconds <= 10 ? 'animate-soft-pulse' : '';
  const size = small ? 'text-5xl' : 'mt-1 text-[clamp(5.75rem,30vw,12.5rem)]';
  return (
    <div
      role="timer"
      aria-label={`Restzeit${small ? ' 15-Minuten-Gruppe' : ''} ${formatClock(seconds)}`}
      className={`tabular leading-none font-bold tracking-[-0.045em] transition-colors duration-500 ${size} ${tone} ${pulse}`}
    >
      {formatClock(seconds)}
    </div>
  );
}

/** „3 VON 4 HABEN GELIEFERT“ bzw. „ALLE HABEN GELIEFERT“ für eine Gruppe. */
function DeliveryStatus({
  confirmations,
  players,
  small = false,
}: {
  confirmations: Record<string, boolean>;
  players: Player[];
  small?: boolean;
}) {
  const confirmed = players.filter((p) => confirmations[p.id]).length;
  const total = players.length;
  const allConfirmed = confirmed === total;
  return (
    <p
      className={`rounded-2xl px-3 text-center font-bold transition-colors ${
        small ? 'mt-3 py-2 text-xs tracking-[0.12em]' : 'mt-7 py-3 text-sm tracking-[0.12em] sm:tracking-[0.18em]'
      } ${
        allConfirmed
          ? 'bg-linear-to-r from-green-600 to-lime-500 text-white shadow-md shadow-green-600/25'
          : small
            ? 'bg-white/80 text-yellow-800'
            : 'bg-yellow-50 text-yellow-800'
      }`}
      aria-live="polite"
    >
      {allConfirmed ? (
        'ALLE HABEN GELIEFERT'
      ) : (
        <>
          <span className="tabular font-black text-yellow-950">{confirmed}</span> VON{' '}
          <span className="tabular font-black text-yellow-950">{total}</span> {confirmed === 1 ? 'HAT' : 'HABEN'}{' '}
          GELIEFERT
        </>
      )}
    </p>
  );
}

/** Ein Segment pro Runde der aktuellen Spielphase: grün = alle haben geliefert, rot = mindestens ein X. */
function PhaseProgress({ clock, history }: { clock: GameClock; history: RoundResult[] }) {
  const phaseRounds = history.slice(clock.lastRoundOfPhase - clock.roundsInPhase);
  const currentProgress = 1 - clock.roundRemainingMs / clock.roundDurationMs;
  return (
    <div className="mx-auto mt-4 flex max-w-md gap-1" aria-hidden="true">
      {Array.from({ length: clock.roundsInPhase }, (_, index) => {
        let fill = 'w-0';
        let style: CSSProperties | undefined;
        if (index < clock.roundInPhase - 1) {
          const perfect = Object.values(phaseRounds[index]?.playerResults ?? {}).every(Boolean);
          fill = perfect ? 'w-full bg-green-400' : 'w-full bg-red-400';
        } else if (index === clock.roundInPhase - 1) {
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
      ? 'border-green-300 bg-green-50'
      : mark === 'missed'
        ? 'border-red-300 bg-red-50'
        : 'border-slate-100 bg-white shadow-sm hover:border-slate-200';
  return (
    <button
      type="button"
      onClick={onTap}
      aria-pressed={mark === 'confirmed'}
      aria-label={`${name}: ${mark === 'confirmed' ? 'geliefert' : 'noch nicht geliefert'}, ${errors} X`}
      className={`flex min-h-[76px] w-full items-center gap-3.5 rounded-2xl border-2 py-2.5 pr-3 pl-3 text-left transition active:scale-[0.985] ${tone}`}
    >
      <Avatar name={name} index={index} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xl font-bold text-slate-900" title={name}>
          {name}
        </span>
        <span
          className={`tabular mt-0.5 block text-sm ${errors > 0 ? 'font-semibold text-red-500' : 'text-slate-400'}`}
        >
          {errors === 0 ? 'Keine X' : `${errors} X`}
        </span>
      </span>
      <StatusMark key={mark} state={mark} className="size-12 shrink-0" />
    </button>
  );
}
