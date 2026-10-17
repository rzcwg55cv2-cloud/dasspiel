import { GLASS_LITERS, estimateBeer } from '../game/beer';
import { formatClock, formatList, formatLiters } from '../game/format';
import { activeGroups, getPenalties, getTrack, playersOf } from '../game/engine';
import { EXTENSION_DURATION, SLOW_ROUND_DURATION, getGroupLabel, getModeLabel, getRoundDuration } from '../game/rules';
import { getDecisionText, type Mood } from '../game/sayings';
import { getRoundErrorCount } from '../game/stats';
import type { GameState } from '../game/types';
import { ColorGlow } from './Decor';
import { MenuIcon } from './icons';
import { KoelschGlass } from './KoelschGlass';

interface Props {
  state: GameState;
  totalErrors: number;
  onExtend: () => void;
  onFinish: () => void;
  onOpenMenu: () => void;
}

const MOOD_STYLE: Record<Mood, { emoji: string; title: string; nameLine: string }> = {
  perfect: { emoji: '🏆', title: 'brand-text', nameLine: 'bg-ok-50 text-ok-700' },
  good: { emoji: '😎', title: 'brand-text', nameLine: 'bg-lime-50 text-lime-800' },
  mixed: { emoji: '🤷', title: 'text-slate-900', nameLine: 'bg-amber-50 text-amber-800' },
  bad: { emoji: '😬', title: 'text-red-600', nameLine: 'bg-red-50 text-red-700' },
};

export function DecisionScreen({ state, totalErrors, onExtend, onFinish, onOpenMenu }: Props) {
  const showGroups = state.slow !== null;
  // Letzte Runde je Takt – mit 15-Minuten-Takt zwei Zeilen.
  const lastRounds = activeGroups(state).flatMap((group) => {
    const round = getTrack(state, group)?.roundHistory.at(-1);
    if (!round) return [];
    const missed = playersOf(state, group).filter((p) => !round.playerResults[p.id]);
    return [{ group, round, errors: getRoundErrorCount(state, round.roundNumber, group), names: missed.map((p) => p.name) }];
  });
  const extraRounds = EXTENSION_DURATION / getRoundDuration(state.mode);
  const extraGlasses = estimateBeer(state).extensionGlasses;
  // Strafbiere aus der letzten Runde sind in der ersten Runde nach der Verlängerung fällig.
  const openPenalties = activeGroups(state).reduce(
    (sum, group) => sum + Object.values(getPenalties(state, group)).reduce((a, b) => a + b, 0),
    0,
  );
  const saying = getDecisionText(state);
  const style = MOOD_STYLE[saying.mood];
  const titleSize =
    saying.title.length > 20 ? 'text-[clamp(2.25rem,10vw,3.75rem)]' : 'text-[clamp(2.75rem,13vw,4.5rem)]';

  return (
    <div className="relative isolate">
      <ColorGlow />
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-safe pb-safe">
        <div className="relative flex justify-center pt-1">
          <span className="flex items-end gap-0.5">
            <span className="brand-text text-[1.05rem] leading-6 font-black tracking-[0.3em]">DAS BIERSPIEL</span>
            <KoelschGlass className="mb-[0.15rem] h-[1.65rem] w-[0.825rem]" />
          </span>
          <button
            type="button"
            onClick={onOpenMenu}
            className="absolute top-0 -right-2 grid size-11 place-items-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-900"
            aria-label="Menü"
          >
            <MenuIcon className="size-6" />
          </button>
        </div>

        <main className="flex flex-1 animate-fade-up flex-col justify-center py-10">
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none" aria-hidden="true">
              {style.emoji}
            </span>
            <p className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold tracking-[0.25em] text-amber-700">
              ZEIT ABGELAUFEN
            </p>
          </div>
          <h1 className={`mt-4 pb-1 leading-[0.98] font-black tracking-[-0.03em] ${titleSize} ${style.title}`}>
            {saying.title}
          </h1>
          <p className="mt-3 text-xl font-semibold text-slate-600">{saying.text}</p>
          {saying.nameLine && (
            <p
              className={`mt-4 w-fit max-w-full rounded-2xl px-4 py-2.5 text-base font-bold [overflow-wrap:anywhere] ${style.nameLine}`}
            >
              {saying.nameLine}
            </p>
          )}

          <dl className="mt-8 grid grid-cols-3 gap-2">
            <Stat label="Gespielt" value={formatClock(state.completedPlaySeconds)} tone="bg-yellow-50 text-yellow-800" />
            <Stat
              label="Runden"
              value={showGroups ? `${state.roundHistory.length} / ${state.slow!.roundHistory.length}` : String(state.roundHistory.length)}
              tone="bg-green-50 text-green-700"
            />
            <Stat
              label="X"
              value={String(totalErrors)}
              tone={totalErrors > 0 ? 'bg-red-50 text-red-600' : 'bg-ok-50 text-ok-600'}
            />
          </dl>

          {lastRounds.map(({ group, round, errors, names }) => (
            <p
              key={group}
              className={`mt-3 rounded-2xl px-5 py-4 text-sm text-slate-600 [overflow-wrap:anywhere] ${
                errors === 0 ? 'bg-ok-50' : 'bg-red-50'
              }`}
            >
              <span className="font-bold text-slate-900">
                {showGroups && `${getGroupLabel(state.mode, group)} · `}Runde {round.roundNumber}:
              </span>{' '}
              {errors === 0 ? (
                <span className="font-semibold text-ok-600">alle haben geliefert</span>
              ) : (
                <>
                  <span className="font-semibold text-red-600">{errors} X</span> – {formatList(names)}
                </>
              )}
            </p>
          ))}

          <div className="mt-10 space-y-3">
            <button
              type="button"
              onClick={onExtend}
              className="h-[4.5rem] w-full rounded-2xl text-lg font-extrabold tracking-[0.12em] bg-green-600 text-white shadow-lg shadow-green-600/30 transition hover:brightness-110 active:scale-[0.98]"
            >
              {saying.extendLabel}
            </button>
            <p className="text-center text-xs font-medium text-slate-400">
              {getModeLabel(state.mode)}: {extraRounds} weitere Runden à {getRoundDuration(state.mode) / 60} Minuten
              {showGroups &&
                ` · 15-Minuten-Takt: ${EXTENSION_DURATION / SLOW_ROUND_DURATION} à ${SLOW_ROUND_DURATION / 60} Minuten`}
            </p>
            <p className="tabular text-center text-xs font-medium text-slate-400">
              <KoelschGlass className="mr-1 mb-0.5 inline-block h-3.5 w-[0.4375rem] align-middle" />
              Bierbedarf für die Verlängerung:{' '}
              <span className="font-semibold text-slate-500">{formatLiters(extraGlasses * GLASS_LITERS)}</span> (
              {extraGlasses} × 0,2 l)
              {openPenalties > 0 && (
                <span className="block">
                  + {openPenalties} {openPenalties === 1 ? 'offenes Strafbier' : 'offene Strafbiere'}
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={onFinish}
              className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-white text-lg font-extrabold tracking-[0.12em] text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
            >
              {saying.finishLabel}
            </button>
            <p className="text-center text-xs font-medium text-slate-400">Spiel beenden und Ergebnis ansehen</p>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">Die Zeit ist angehalten, bis ihr euch entscheidet.</p>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-2xl px-4 py-4 ${tone}`}>
      <dt className="text-[11px] font-bold tracking-[0.2em] uppercase opacity-75">{label}</dt>
      <dd className="tabular mt-1 text-2xl font-black">{value}</dd>
    </div>
  );
}
