import { useRef, type ReactNode } from 'react';
import { activeGroups, getClock, getTrack, playersOf, type GameClock } from '../game/engine';
import { getModeLabel } from '../game/rules';
import type { GameState, GroupId, Player, RoundEvent, RoundResult } from '../game/types';
import { AnalogClock } from './AnalogClock';
import { Avatar } from './Avatar';
import { MenuIcon, StatusMark, type MarkState } from './icons';
import { KoelschGlass } from './KoelschGlass';

/** So lange wird ein rotes X nach Rundenende angezeigt, bevor der graue Kreis zurückkehrt. */
const MISSED_FLASH_MS = 4500;
/** Schutz gegen versehentliches Doppeltippen auf dieselbe Zeile. */
const TAP_GUARD_MS = 350;
/** Die Restzeit bleibt geheim – erst in den letzten Sekunden erscheint ein Countdown. */
const FINAL_COUNTDOWN_SECONDS = 10;

interface Props {
  state: GameState;
  errorCounts: Record<string, number>;
  liveRounds: RoundEvent[];
  now: number;
  onToggle: (playerId: string) => void;
  onOpenMenu: () => void;
}

export function GameScreen({ state, errorCounts, liveRounds, now, onToggle, onOpenMenu }: Props) {
  const lastTap = useRef<Record<string, number>>({});
  const malte = state.mode === 'malte';
  const groups = activeGroups(state);
  const twoGroups = groups.length > 1;
  const missedIds = new Set(
    liveRounds.filter((e) => now - e.endedAt < MISSED_FLASH_MS).flatMap((e) => e.failedPlayerIds),
  );
  const colorIndex = new Map(state.players.map((p, i) => [p.id, i]));

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
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-5 pt-safe pb-safe lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-12 lg:px-10">
      <section className="lg:sticky lg:top-0 lg:pt-6" aria-label="Uhrzeit">
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

        <AnalogClock
          now={now}
          className="mx-auto mt-5 block size-[min(64vw,15rem)] drop-shadow-sm sm:size-72 lg:mt-10 lg:size-[22rem]"
        />
      </section>

      <div className={`mt-6 grid grid-cols-1 gap-4 lg:mt-6 ${twoGroups ? 'md:grid-cols-2 lg:grid-cols-1' : ''}`}>
        {groups.map((group) => {
          const clock = getClock(state, now, group);
          const track = getTrack(state, group);
          if (!clock || !track) return null;
          const players = playersOf(state, group);
          return (
            <GroupPanel key={group} group={group} clock={clock} history={track.roundHistory} labelled={twoGroups}>
              <DeliveryStatus confirmations={track.currentConfirmations} players={players} />
              <ul className={`mt-3 grid grid-cols-1 gap-2 ${twoGroups ? '' : 'md:grid-cols-2 lg:grid-cols-1'}`}>
                {players.map((player) => {
                  const isConfirmed = track.currentConfirmations[player.id] === true;
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
            </GroupPanel>
          );
        })}
      </div>
    </div>
  );
}

interface GroupPanelProps {
  group: GroupId;
  clock: GameClock;
  history: RoundResult[];
  /** Bei zwei Gruppen: beschriftet und gleich groß nebeneinander bzw. untereinander. */
  labelled: boolean;
  children: ReactNode;
}

function GroupPanel({ group, clock, history, labelled, children }: GroupPanelProps) {
  const finalSeconds = clock.roundRemainingSeconds <= FINAL_COUNTDOWN_SECONDS;
  const slow = group === 'slow';
  const frame = finalSeconds
    ? 'border-red-400 bg-red-50/60'
    : slow
      ? 'border-yellow-300 bg-yellow-50/70'
      : labelled
        ? 'border-green-200 bg-green-50/50'
        : 'border-transparent';
  return (
    <section
      aria-label={labelled ? (slow ? '15-Minuten-Gruppe' : '10-Minuten-Takt') : 'Teilnehmer'}
      className={`rounded-3xl border-2 p-3 transition-colors sm:p-4 ${frame}`}
    >
      <div className="flex min-h-16 items-center justify-between gap-3 px-1">
        <div>
          {labelled && (
            <p className={`text-[11px] font-black tracking-[0.25em] ${slow ? 'text-yellow-800' : 'text-green-700'}`}>
              {slow ? '15-MINUTEN-GRUPPE' : '10-MINUTEN-TAKT'}
            </p>
          )}
          <p className={`font-bold text-slate-400 ${labelled ? 'mt-1 text-xs tracking-[0.25em]' : 'text-sm tracking-[0.3em]'}`}>
            RUNDE <span className={`tabular ${slow ? 'text-yellow-700' : 'text-green-600'}`}>{clock.roundNumber}</span>
            <span className="tabular ml-2 text-slate-300">/ {clock.lastRoundOfPhase}</span>
          </p>
        </div>
        <FinalCountdown seconds={clock.roundRemainingSeconds} />
      </div>
      <RoundStrip clock={clock} history={history} />
      {children}
    </section>
  );
}

/** Großer roter Countdown, aber nur in den letzten 10 Sekunden. Der Platz ist immer reserviert. */
function FinalCountdown({ seconds }: { seconds: number }) {
  const visible = seconds > 0 && seconds <= FINAL_COUNTDOWN_SECONDS;
  return (
    <div className="grid h-16 min-w-16 place-items-center" aria-live="polite">
      {visible && (
        <span
          key={seconds}
          role="timer"
          aria-label={`Noch ${seconds} Sekunden`}
          className="tabular animate-pop text-6xl leading-none font-black tracking-[-0.04em] text-red-500"
        >
          {seconds}
        </span>
      )}
    </div>
  );
}

/** Ein Segment pro Runde der Spielphase: grün = alle haben geliefert, rot = mindestens ein X. */
function RoundStrip({ clock, history }: { clock: GameClock; history: RoundResult[] }) {
  const phaseRounds = history.slice(clock.lastRoundOfPhase - clock.roundsInPhase);
  return (
    <div className="mt-1 mb-3 flex gap-1 px-1" aria-hidden="true">
      {Array.from({ length: clock.roundsInPhase }, (_, index) => {
        let fill = 'bg-slate-100';
        if (index < clock.roundInPhase - 1) {
          const perfect = Object.values(phaseRounds[index]?.playerResults ?? {}).every(Boolean);
          fill = perfect ? 'bg-ok-400' : 'bg-red-400';
        } else if (index === clock.roundInPhase - 1) {
          // Laufende Runde ohne Füllstand – die Restzeit bleibt geheim.
          fill = 'bg-slate-300';
        }
        return <div key={index} className={`h-2 flex-1 rounded-full ${fill}`} />;
      })}
    </div>
  );
}

/** „3 VON 4 HABEN GELIEFERT“ bzw. „ALLE HABEN GELIEFERT“ für eine Gruppe. */
function DeliveryStatus({ confirmations, players }: { confirmations: Record<string, boolean>; players: Player[] }) {
  const confirmed = players.filter((p) => confirmations[p.id]).length;
  const total = players.length;
  const allConfirmed = confirmed === total;
  return (
    <p
      className={`rounded-2xl px-3 py-2.5 text-center text-xs font-bold tracking-[0.12em] transition-colors sm:text-sm ${
        allConfirmed
          ? 'bg-linear-to-r from-ok-600 to-ok-400 text-white shadow-md shadow-ok-600/25'
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
      ? 'border-ok-300 bg-ok-50'
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
