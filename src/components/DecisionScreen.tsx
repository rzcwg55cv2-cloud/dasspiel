import { formatClock, formatList } from '../game/format';
import { EXTENSION_DURATION, getModeLabel, getRoundDuration } from '../game/rules';
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
  perfect: { emoji: '🏆', title: 'brand-text', nameLine: 'bg-emerald-50 text-emerald-700' },
  good: { emoji: '😎', title: 'brand-text', nameLine: 'bg-sky-50 text-sky-700' },
  mixed: { emoji: '🤷', title: 'text-slate-900', nameLine: 'bg-amber-50 text-amber-800' },
  bad: { emoji: '😬', title: 'text-rose-600', nameLine: 'bg-pink-50 text-pink-700' },
};

export function DecisionScreen({ state, totalErrors, onExtend, onFinish, onOpenMenu }: Props) {
  const lastRound = state.roundHistory.at(-1);
  const lastRoundErrors = lastRound ? getRoundErrorCount(state, lastRound.roundNumber) : 0;
  const missedNames = lastRound ? state.players.filter((p) => !lastRound.playerResults[p.id]).map((p) => p.name) : [];
  const extraRounds = EXTENSION_DURATION / getRoundDuration(state.mode);
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
            <span className="brand-text text-sm font-black tracking-[0.3em]">DAS SPIEL</span>
            <KoelschGlass className="mb-0.5 h-[1.375rem] w-[0.6875rem]" />
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
            <Stat label="Gespielt" value={formatClock(state.completedPlaySeconds)} tone="bg-sky-50 text-sky-700" />
            <Stat label="Runden" value={String(state.roundHistory.length)} tone="bg-violet-50 text-violet-700" />
            <Stat
              label="X"
              value={String(totalErrors)}
              tone={totalErrors > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}
            />
          </dl>

          {lastRound && (
            <p
              className={`mt-3 rounded-2xl px-5 py-4 text-sm text-slate-600 [overflow-wrap:anywhere] ${
                lastRoundErrors === 0 ? 'bg-emerald-50' : 'bg-rose-50'
              }`}
            >
              <span className="font-bold text-slate-900">Runde {lastRound.roundNumber}:</span>{' '}
              {lastRoundErrors === 0 ? (
                <span className="font-semibold text-emerald-600">alle haben geliefert</span>
              ) : (
                <>
                  <span className="font-semibold text-rose-600">{lastRoundErrors} X</span> – {formatList(missedNames)}
                </>
              )}
            </p>
          )}

          <div className="mt-10 space-y-3">
            <button
              type="button"
              onClick={onExtend}
              className="brand-gradient h-[4.5rem] w-full rounded-2xl text-lg font-extrabold tracking-[0.12em] text-white shadow-lg shadow-pink-500/30 transition hover:brightness-105 active:scale-[0.98]"
            >
              {saying.extendLabel}
            </button>
            <p className="text-center text-xs font-medium text-slate-400">
              {getModeLabel(state.mode)}: {extraRounds} weitere Runden à {getRoundDuration(state.mode) / 60} Minuten
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
