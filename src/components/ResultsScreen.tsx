import type { ReactNode } from 'react';
import { formatList, formatMinutes, formatPercent } from '../game/format';
import { getModeLabel } from '../game/rules';
import { computeSummary, type PlayerStats } from '../game/stats';
import type { GameState } from '../game/types';
import { ChevronIcon, MiniMark } from './icons';

interface Props {
  state: GameState;
  onNewGame: () => void;
  onRestart: () => void;
}

const timeFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

export function ResultsScreen({ state, onNewGame, onRestart }: Props) {
  const summary = computeSummary(state);
  const allTied = summary.playerCount > 1 && summary.bestPlayers.length === summary.playerCount;
  const wallClock =
    state.startedAt !== null && state.finishedAt !== null
      ? `${timeFormat.format(state.startedAt)}–${timeFormat.format(state.finishedAt)} Uhr inkl. Pausen`
      : undefined;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pt-safe pb-safe">
      <header className="animate-fade-up pt-8 sm:pt-12">
        <p className="text-xs font-bold tracking-[0.3em] text-ink-400">ERGEBNIS</p>
        <h1 className="mt-3 text-[clamp(2.75rem,12vw,5rem)] leading-[0.92] font-black tracking-[-0.035em]">
          DAS SPIEL IST VORBEI
        </h1>
      </header>

      <dl className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <SummaryItem label="Spielmodus" value={getModeLabel(summary.mode)} accent={summary.mode === 'malte'} />
        <SummaryItem label="Gesamtdauer" value={formatMinutes(summary.playedSeconds)} />
        <SummaryItem label="Gespielte Runden" value={String(summary.roundsPlayed)} />
        <SummaryItem label="Teilnehmer" value={String(summary.playerCount)} />
        <SummaryItem label="Verlängerungen" value={String(summary.extensionCount)} />
      </dl>

      <Section title="RANGLISTE">
        <ol className="space-y-2">
          {summary.ranking.map((stats) => (
            <RankingRow key={stats.player.id} stats={stats} />
          ))}
        </ol>
      </Section>

      <Section title="STATISTIK">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatTile label="Fehler gesamt" value={String(summary.totalErrors)} tone={summary.totalErrors ? 'miss' : 'go'} />
          <StatTile
            label="Perfekte Runden"
            value={`${summary.perfectRounds} / ${summary.roundsPlayed}`}
            tone={summary.perfectRounds ? 'go' : undefined}
          />
          <StatTile
            label="Fehlerhafteste Runde"
            value={summary.worstRound ? `Runde ${formatList(summary.worstRound.roundNumbers.map(String))}` : 'Keine'}
            detail={summary.worstRound ? `${summary.worstRound.errors} Fehler` : 'Keine einzige Runde mit Fehlern'}
          />
          <StatTile
            label={summary.bestPlayers.length > 1 ? 'Beste Teilnehmer' : 'Bester Teilnehmer'}
            value={allTied ? 'Alle gleichauf' : formatList(summary.bestPlayers.map((p) => p.name))}
            detail={`${allTied ? 'je ' : ''}${summary.ranking[0]?.errors ?? 0} Fehler`}
            tone="go"
          />
          <StatTile
            label="Meiste Fehler"
            value={
              summary.mostErrorPlayers.length === 0
                ? 'Niemand'
                : allTied
                  ? 'Alle gleichauf'
                  : formatList(summary.mostErrorPlayers.map((p) => p.name))
            }
            detail={
              summary.mostErrorPlayers.length
                ? `${allTied ? 'je ' : ''}${summary.ranking.at(-1)?.errors ?? 0} Fehler`
                : 'Alle haben immer geliefert'
            }
            tone={summary.mostErrorPlayers.length ? 'miss' : undefined}
          />
          <StatTile
            label="Verlängerungen"
            value={String(summary.extensionCount)}
            detail={summary.extensionCount ? `${summary.extensionCount} × 30 Minuten` : 'Keine Verlängerung'}
          />
          <StatTile
            label="Tatsächliche Spielzeit"
            value={formatMinutes(summary.playedSeconds)}
            detail={wallClock}
            wide
          />
        </dl>
      </Section>

      <Section title="ÜBERSICHT">
        <ResultMatrix state={state} ranking={summary.ranking} />
      </Section>

      <Section title="VERLAUF JE TEILNEHMER">
        <div className="space-y-2">
          {summary.ranking.map((stats) => (
            <PlayerHistory key={stats.player.id} stats={stats} />
          ))}
        </div>
      </Section>

      <div className="mt-14 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onRestart}
          className="h-16 rounded-2xl bg-white px-4 text-base font-extrabold tracking-[0.1em] text-ink-950 transition hover:bg-ink-300 active:scale-[0.98]"
        >
          GLEICHE GRUPPE ERNEUT SPIELEN
        </button>
        <button
          type="button"
          onClick={onNewGame}
          className="h-16 rounded-2xl border border-ink-600 px-4 text-base font-extrabold tracking-[0.1em] transition hover:bg-ink-800 active:scale-[0.98]"
        >
          NEUES SPIEL
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-3 text-xs font-bold tracking-[0.25em] text-ink-400">{title}</h2>
      {children}
    </section>
  );
}

function SummaryItem({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-ink-900 px-4 py-4 last:col-span-2 sm:last:col-span-1">
      <dt className="text-[11px] font-bold tracking-[0.18em] text-ink-500 uppercase">{label}</dt>
      <dd className={`tabular mt-1 text-lg font-bold ${accent ? 'text-malte' : ''}`}>{value}</dd>
    </div>
  );
}

function StatTile({
  label,
  value,
  detail,
  tone,
  wide = false,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'go' | 'miss';
  wide?: boolean;
}) {
  const color = tone === 'go' ? 'text-go' : tone === 'miss' ? 'text-miss' : 'text-white';
  return (
    <div className={`min-w-0 rounded-2xl bg-ink-900 px-4 py-4 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <dt className="text-[11px] font-bold tracking-[0.18em] text-ink-500 uppercase">{label}</dt>
      <dd className={`tabular mt-1 text-xl font-bold [overflow-wrap:anywhere] ${color}`}>{value}</dd>
      {detail && <dd className="mt-1 text-xs text-ink-400">{detail}</dd>}
    </div>
  );
}

function RankingRow({ stats }: { stats: PlayerStats }) {
  const flawless = stats.errors === 0;
  return (
    <li
      className={`flex items-center gap-4 rounded-2xl border px-4 py-4 ${
        flawless ? 'border-go/45 bg-go/[0.07]' : 'border-transparent bg-ink-900'
      }`}
    >
      <span
        className={`tabular grid size-11 shrink-0 place-items-center rounded-full text-lg font-black ${
          stats.rank === 1 ? 'bg-white text-ink-950' : 'bg-ink-800 text-ink-300'
        }`}
        aria-label={`Platz ${stats.rank}`}
      >
        {stats.rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-lg font-bold" title={stats.player.name}>
            {stats.player.name}
          </span>
          {flawless && (
            <span className="shrink-0 rounded-full bg-go/15 px-2 py-0.5 text-[10px] font-bold tracking-[0.15em] text-go">
              FEHLERFREI
            </span>
          )}
        </div>
        <div className="tabular mt-0.5 text-sm text-ink-400">
          {stats.successes} von {stats.rounds} Runden erfolgreich
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`tabular text-2xl leading-none font-black ${flawless ? 'text-go' : 'text-miss'}`}>
          {stats.errors}
          <span className="ml-1 text-xs font-bold tracking-wider">FEHLER</span>
        </div>
        <div className="tabular mt-1 text-sm text-ink-400">{formatPercent(stats.successRate)}</div>
      </div>
    </li>
  );
}

/** Kompakte Matrix: Spieler × Runden. Bei vielen Runden horizontal scrollbar. */
function ResultMatrix({ state, ranking }: { state: GameState; ranking: PlayerStats[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-ink-900 [scrollbar-width:thin]">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 bg-ink-900 py-3 pr-3 pl-4 text-left text-[11px] font-bold tracking-[0.18em] text-ink-500"
            >
              SPIELER
            </th>
            {state.roundHistory.map((round) => (
              <th
                key={round.roundNumber}
                scope="col"
                className="tabular px-1 py-3 text-center text-[11px] font-bold text-ink-500"
              >
                R{round.roundNumber}
              </th>
            ))}
            <th scope="col" className="w-2" />
          </tr>
        </thead>
        <tbody>
          {ranking.map((stats) => (
            <tr key={stats.player.id}>
              <th
                scope="row"
                className="sticky left-0 z-10 max-w-36 truncate border-t border-ink-800 bg-ink-900 py-2 pr-3 pl-4 text-left font-semibold"
                title={stats.player.name}
              >
                {stats.player.name}
              </th>
              {stats.results.map((result) => (
                <td key={result.roundNumber} className="border-t border-ink-800 px-1 py-2 text-center">
                  <MiniMark success={result.success} className="mx-auto size-6" />
                </td>
              ))}
              <td className="border-t border-ink-800" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlayerHistory({ stats }: { stats: PlayerStats }) {
  return (
    <details className="group rounded-2xl bg-ink-900 open:bg-ink-850">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
        <ChevronIcon className="size-4 shrink-0 text-ink-500 transition group-open:rotate-90" />
        <span className="min-w-0 flex-1 truncate font-extrabold tracking-[0.08em] uppercase">{stats.player.name}</span>
        <span className="tabular shrink-0 text-sm text-ink-400">
          <span className={stats.errors ? 'text-miss' : 'text-go'}>{stats.errors} Fehler</span> ·{' '}
          {formatPercent(stats.successRate)}
        </span>
      </summary>
      <div className="px-4 pb-5">
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5">
          {stats.results.map((result) => (
            <li
              key={result.roundNumber}
              className="flex items-center justify-between rounded-xl bg-ink-800/70 py-1.5 pr-1.5 pl-2.5"
            >
              <span className="tabular text-xs font-semibold text-ink-400">R{result.roundNumber}</span>
              <MiniMark success={result.success} className="size-6" />
            </li>
          ))}
        </ul>
        <dl className="tabular mt-4 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-ink-500">Erfolgreich</dt>
            <dd className="font-bold text-go">{stats.successes}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Fehler</dt>
            <dd className={`font-bold ${stats.errors ? 'text-miss' : ''}`}>{stats.errors}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Erfolgsquote</dt>
            <dd className="font-bold">{formatPercent(stats.successRate)}</dd>
          </div>
        </dl>
      </div>
    </details>
  );
}
