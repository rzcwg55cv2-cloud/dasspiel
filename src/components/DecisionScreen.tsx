import { formatClock, formatList } from '../game/format';
import { EXTENSION_DURATION, getModeLabel, getRoundDuration } from '../game/rules';
import { getRoundErrorCount } from '../game/stats';
import type { GameState } from '../game/types';
import { MenuIcon } from './icons';

interface Props {
  state: GameState;
  totalErrors: number;
  onExtend: () => void;
  onFinish: () => void;
  onOpenMenu: () => void;
}

export function DecisionScreen({ state, totalErrors, onExtend, onFinish, onOpenMenu }: Props) {
  const firstDecision = state.extensionCount === 0;
  const lastRound = state.roundHistory.at(-1);
  const lastRoundErrors = lastRound ? getRoundErrorCount(state, lastRound.roundNumber) : 0;
  const missedNames = lastRound ? state.players.filter((p) => !lastRound.playerResults[p.id]).map((p) => p.name) : [];
  const extraRounds = EXTENSION_DURATION / getRoundDuration(state.mode);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-safe pb-safe">
      <div className="relative flex justify-center pt-1">
        <span className="text-sm font-black tracking-[0.3em]">DAS SPIEL</span>
        <button
          type="button"
          onClick={onOpenMenu}
          className="absolute top-0 -right-2 grid size-11 place-items-center rounded-full text-ink-400 transition hover:bg-ink-800 hover:text-white"
          aria-label="Menü"
        >
          <MenuIcon className="size-6" />
        </button>
      </div>

      <main className="flex flex-1 animate-fade-up flex-col justify-center py-10">
        <p className="text-xs font-bold tracking-[0.3em] text-warn">ZEIT ABGELAUFEN</p>
        <h1 className="mt-3 text-[clamp(2.75rem,13vw,4.5rem)] leading-[0.95] font-black tracking-[-0.03em]">
          {firstDecision ? 'DIE ZEIT IST ABGELAUFEN!' : 'NOCH EINE RUNDE?'}
        </h1>
        <p className="mt-4 text-xl text-ink-300">
          {firstDecision ? 'Wollt ihr weiterspielen?' : 'Wollt ihr weitere 30 Minuten spielen?'}
        </p>

        <dl className="mt-8 grid grid-cols-3 gap-2">
          <Stat label="Gespielt" value={formatClock(state.completedPlaySeconds)} />
          <Stat label="Runden" value={String(state.roundHistory.length)} />
          <Stat label="Fehler" value={String(totalErrors)} tone={totalErrors > 0 ? 'text-miss' : 'text-go'} />
        </dl>

        {lastRound && (
          <p className="mt-4 rounded-2xl bg-ink-900 px-5 py-4 text-sm text-ink-300 [overflow-wrap:anywhere]">
            <span className="font-bold text-white">Runde {lastRound.roundNumber}:</span>{' '}
            {lastRoundErrors === 0 ? (
              <span className="text-go">alle bestätigt</span>
            ) : (
              <>
                <span className="text-miss">
                  {lastRoundErrors} Fehler
                </span>{' '}
                – {formatList(missedNames)}
              </>
            )}
          </p>
        )}

        <div className="mt-10 space-y-3">
          <button
            type="button"
            onClick={onExtend}
            className="h-[4.5rem] w-full rounded-2xl bg-white text-lg font-extrabold tracking-[0.12em] text-ink-950 transition hover:bg-ink-300 active:scale-[0.98]"
          >
            +30 MINUTEN VERLÄNGERN
          </button>
          <p className="text-center text-xs text-ink-500">
            {getModeLabel(state.mode)}: {extraRounds} weitere Runden à {getRoundDuration(state.mode) / 60} Minuten
          </p>
          <button
            type="button"
            onClick={onFinish}
            className="h-16 w-full rounded-2xl border border-ink-600 text-lg font-extrabold tracking-[0.12em] text-white transition hover:bg-ink-800 active:scale-[0.98]"
          >
            SPIEL BEENDEN
          </button>
        </div>
        <p className="mt-6 text-center text-xs text-ink-500">Die Zeit ist angehalten, bis ihr euch entscheidet.</p>
      </main>
    </div>
  );
}

function Stat({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-ink-900 px-4 py-4">
      <dt className="text-[11px] font-bold tracking-[0.2em] text-ink-500 uppercase">{label}</dt>
      <dd className={`tabular mt-1 text-2xl font-bold ${tone}`}>{value}</dd>
    </div>
  );
}
