import type { ReactNode } from 'react';
import { formatClock, formatList, formatMinutes } from '../game/format';
import { getTrack } from '../game/engine';
import { getGroupLabel, getModeLabel } from '../game/rules';
import { computeSummary, type GameSummary, type PlayerStats } from '../game/stats';
import type { GameMode, GameState, GroupId, RoundResult } from '../game/types';
import { Avatar, getPlayerColor } from './Avatar';
import { ColorGlow } from './Decor';
import { ChevronIcon, MiniMark } from './icons';

interface Props {
  state: GameState;
  onNewGame: () => void;
  onRestart: () => void;
}

/** Vollständige Klassennamen, damit Tailwind sie beim Build findet. */
const TILE_TONES = {
  green: 'bg-green-50 text-green-700',
  lime: 'bg-lime-50 text-lime-800',
  yellow: 'bg-yellow-50 text-yellow-800',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-600',
} as const;

type Tone = keyof typeof TILE_TONES;

/** Gold, Silber, Bronze – danach neutral. */
const RANK_BADGES = ['bg-amber-400 text-white', 'bg-slate-400 text-white', 'bg-amber-700 text-white'];

const timeFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

/** Überschrift eines Takts (10 Minuten gelb, 15 Minuten grün); ohne 15-Minuten-Takt gibt es keine. */
function GroupHeading({ group, show }: { group: GroupId; show: boolean }) {
  if (!show) return null;
  return (
    <p
      className={`mb-2 w-fit rounded-full px-3 py-1 text-[11px] font-black tracking-[0.2em] ${
        group === 'slow' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'
      }`}
    >
      {group === 'slow' ? '15-MINUTEN-TAKT' : '10-MINUTEN-TAKT'}
    </p>
  );
}

/** „Runde 3“, mit 15-Minuten-Takt z. B. „Runde 2, 5 (10 Min.) · 3 (15 Min.)“. */
function formatWorstRounds(summary: GameSummary, mode: GameMode, showGroups: boolean): string {
  if (!summary.worstRound) return 'Keine';
  const parts = summary.groups
    .map(({ group }) => {
      const numbers = summary.worstRound!.rounds.filter((r) => r.group === group).map((r) => String(r.roundNumber));
      if (numbers.length === 0) return null;
      return showGroups ? `${formatList(numbers)} (${getGroupLabel(mode, group)})` : formatList(numbers);
    })
    .filter(Boolean);
  return `Runde ${parts.join(' · ')}`;
}

export function ResultsScreen({ state, onNewGame, onRestart }: Props) {
  const summary = computeSummary(state);
  // Alle haben gleich viele X (für die Kachel „Meiste X“)
  const allTied = summary.playerCount > 1 && summary.mostErrorPlayers.length === summary.playerCount;
  const colorIndex = new Map(state.players.map((p, i) => [p.id, i]));
  const showGroups = summary.groups.length > 1;
  const wallClock =
    state.startedAt !== null && state.finishedAt !== null
      ? `${timeFormat.format(state.startedAt)}–${timeFormat.format(state.finishedAt)} Uhr inkl. Pausen`
      : undefined;

  return (
    <div className="relative isolate">
      <ColorGlow />
      <div className="mx-auto w-full max-w-3xl px-5 pt-safe pb-safe">
        <header className="animate-fade-up pt-8 sm:pt-12">
          <p className="w-fit rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold tracking-[0.25em] text-yellow-800">
            ERGEBNIS
          </p>
          <h1 className="brand-text mt-4 pb-1 text-[clamp(2.75rem,12vw,5rem)] leading-[0.95] font-black tracking-[-0.035em]">
            DAS BIERSPIEL IST VORBEI
          </h1>
        </header>

        <dl className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <SummaryItem label="Spielmodus" value={getModeLabel(summary.mode)} tone={summary.mode === 'malte' ? 'red' : 'green'} />
          <SummaryItem label="Gesamtdauer" value={formatMinutes(summary.playedSeconds)} tone="yellow" />
          <SummaryItem
            label={showGroups ? 'Runden 10 / 15 Min.' : 'Gespielte Runden'}
            value={summary.groups.map((g) => g.roundsPlayed).join(' / ')}
            tone="amber"
          />
          <SummaryItem label="Teilnehmer" value={String(summary.playerCount)} tone="lime" />
          <SummaryItem label="Verlängerungen" value={String(summary.extensionCount)} tone="green" />
        </dl>

        <Section title="RANGLISTE">
          {summary.groups.map(({ group, ranking }) => (
            <div key={group} className="mt-6 first:mt-0">
              <GroupHeading group={group} show={showGroups} />
              <ol className="space-y-2">
                {ranking.map((stats) => (
                  <RankingRow key={stats.player.id} stats={stats} colorIndex={colorIndex.get(stats.player.id) ?? 0} />
                ))}
              </ol>
            </div>
          ))}
        </Section>

        <Section title="STATISTIK">
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatTile
              label="X gesamt"
              value={String(summary.totalErrors)}
              tone={summary.totalErrors ? 'red' : 'green'}
            />
            <StatTile label="Perfekte Runden" value={`${summary.perfectRounds} / ${summary.totalRounds}`} tone="green" />
            <StatTile
              label="Runde mit den meisten X"
              value={formatWorstRounds(summary, state.mode, showGroups)}
              detail={summary.worstRound ? `${summary.worstRound.errors} X` : 'Keine einzige Runde mit X'}
              tone="red"
            />
            {showGroups ? (
              <>
                {/* Je Takt, weil der 15-Minuten-Takt weniger Runden hat. */}
                <StatTile
                  label="Schnellste je Gruppe"
                  value={summary.groups
                    .map((g) => `${formatList(g.bestPlayers.map((p) => p.name))} (${getGroupLabel(state.mode, g.group)})`)
                    .join(' · ')}
                  detail={summary.groups
                    .map((g) => `${getGroupLabel(state.mode, g.group)}: ${duration(g.ranking[0]?.totalMs ?? 0)}`)
                    .join(' · ')}
                  tone="amber"
                />
                <StatTile
                  label="Meiste X je Gruppe"
                  value={summary.groups
                    .map(
                      (g) =>
                        `${g.mostErrorPlayers.length ? formatList(g.mostErrorPlayers.map((p) => p.name)) : 'Niemand'} (${getGroupLabel(state.mode, g.group)})`,
                    )
                    .join(' · ')}
                  detail={summary.groups
                    .map((g) => `${getGroupLabel(state.mode, g.group)}: ${g.ranking.at(-1)?.errors ?? 0} X`)
                    .join(' · ')}
                  tone="red"
                />
              </>
            ) : (
              <>
                <StatTile
                  label={summary.bestPlayers.length > 1 ? 'Schnellste' : 'Schnellste:r'}
                  value={formatList(summary.bestPlayers.map((p) => p.name))}
                  detail={`${duration(summary.ranking[0]?.totalMs ?? 0)} bis zum Haken`}
                  tone="amber"
                />
                <StatTile
                  label="Meiste X"
                  value={
                    summary.mostErrorPlayers.length === 0
                      ? 'Niemand'
                      : allTied
                        ? 'Alle gleichauf'
                        : formatList(summary.mostErrorPlayers.map((p) => p.name))
                  }
                  detail={
                    summary.mostErrorPlayers.length
                      ? `${allTied ? 'je ' : ''}${summary.ranking.at(-1)?.errors ?? 0} X`
                      : 'Alle haben immer geliefert'
                  }
                  tone="red"
                />
              </>
            )}
            <StatTile
              label="Verlängerungen"
              value={String(summary.extensionCount)}
              detail={summary.extensionCount ? `${summary.extensionCount} × 30 Minuten` : 'Keine Verlängerung'}
              tone="lime"
            />
            <StatTile
              label="Strafbiere getrunken"
              value={String(summary.penaltiesDrunk)}
              detail={
                summary.openPenalties.length
                  ? `Noch offen: ${formatList(summary.openPenalties.map((o) => `${o.player.name} (${o.count})`))}`
                  : 'Keine offenen Strafbiere'
              }
              tone="amber"
              wide
            />
            <StatTile
              label="Tatsächliche Spielzeit"
              value={formatMinutes(summary.playedSeconds)}
              detail={wallClock}
              tone="yellow"
              wide
            />
          </dl>
        </Section>

        <Section title="ÜBERSICHT">
          {summary.groups.map(({ group, ranking }) => (
            <div key={group} className="mt-6 first:mt-0">
              <GroupHeading group={group} show={showGroups} />
              <ResultMatrix rounds={getTrack(state, group)?.roundHistory ?? []} ranking={ranking} colorIndex={colorIndex} />
            </div>
          ))}
        </Section>

        <Section title="VERLAUF JE TEILNEHMER">
          {summary.groups.map(({ group, ranking }) => (
            <div key={group} className="mt-6 first:mt-0">
              <GroupHeading group={group} show={showGroups} />
              <div className="space-y-2">
                {ranking.map((stats) => (
                  <PlayerHistory key={stats.player.id} stats={stats} colorIndex={colorIndex.get(stats.player.id) ?? 0} />
                ))}
              </div>
            </div>
          ))}
        </Section>

        <div className="mt-14 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onRestart}
            className="h-16 rounded-2xl px-4 text-base font-extrabold tracking-[0.1em] bg-green-600 text-white shadow-lg shadow-green-600/30 transition hover:brightness-110 active:scale-[0.98]"
          >
            GLEICHE GRUPPE ERNEUT SPIELEN
          </button>
          <button
            type="button"
            onClick={onNewGame}
            className="h-16 rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-extrabold tracking-[0.1em] text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
          >
            NEUES SPIEL
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-3 text-xs font-bold tracking-[0.25em] text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function SummaryItem({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className={`rounded-2xl px-4 py-4 last:col-span-2 sm:last:col-span-1 ${TILE_TONES[tone]}`}>
      <dt className="text-[11px] font-bold tracking-[0.18em] uppercase opacity-75">{label}</dt>
      <dd className="tabular mt-1 text-lg font-black">{value}</dd>
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
  tone: Tone;
  wide?: boolean;
}) {
  return (
    <div className={`min-w-0 rounded-2xl px-4 py-4 ${TILE_TONES[tone]} ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <dt className="text-[11px] font-bold tracking-[0.18em] uppercase opacity-75">{label}</dt>
      <dd className="tabular mt-1 text-xl font-black [overflow-wrap:anywhere]">{value}</dd>
      {detail && <dd className="mt-1 text-xs font-medium opacity-80">{detail}</dd>}
    </div>
  );
}

/** „2 Strafbiere getrunken · 1 offen“ bzw. null, wenn es keine gab. */
function penaltyText({ penaltiesDrunk: drunk, penaltiesOpen: open }: PlayerStats): string | null {
  const beers = (n: number) => `${n} ${n === 1 ? 'Strafbier' : 'Strafbiere'}`;
  if (drunk && open) return `${beers(drunk)} getrunken · ${open} offen`;
  if (drunk) return `${beers(drunk)} getrunken`;
  if (open) return `${beers(open)} offen`;
  return null;
}

/** Zeit bis zum Haken als „m:ss“ bzw. „mm:ss“. */
function duration(ms: number): string {
  return formatClock(Math.round(ms / 1000)).replace(/^0(?=\d:)/, '');
}

function RankingRow({ stats, colorIndex }: { stats: PlayerStats; colorIndex: number }) {
  const flawless = stats.errors === 0;
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-3 ${
        flawless ? 'border-ok-300 bg-ok-50' : 'border-slate-100 bg-white shadow-sm'
      }`}
    >
      <span
        className={`tabular grid size-10 shrink-0 place-items-center rounded-full text-lg font-black ${
          RANK_BADGES[stats.rank - 1] ?? 'bg-slate-100 text-slate-500'
        }`}
        aria-label={`Platz ${stats.rank}`}
      >
        {stats.rank}
      </span>
      <Avatar name={stats.player.name} avatar={stats.player.avatar} index={colorIndex} className="size-10 text-base" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-bold" title={stats.player.name}>
          {stats.player.name}
        </div>
        {flawless ? (
          <span className="mt-0.5 inline-block rounded-full bg-ok-500 px-2 py-0.5 text-[10px] font-bold tracking-[0.15em] text-white">
            X-FREI
          </span>
        ) : (
          <div className="tabular mt-0.5 text-sm text-slate-500">
            {stats.successes} von {stats.rounds} geliefert
          </div>
        )}
        {penaltyText(stats) && (
          <div className="tabular mt-0.5 text-xs font-semibold text-amber-700">{penaltyText(stats)}</div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="tabular text-2xl leading-none font-black text-slate-900" title="Gesamtzeit bis zum Haken">
          {duration(stats.totalMs)}
        </div>
        <div className={`tabular mt-1 text-sm font-semibold ${flawless ? 'text-ok-600' : 'text-red-500'}`}>
          {stats.errors} X
        </div>
      </div>
    </li>
  );
}

/** Kompakte Matrix: Spieler × Runden. Bei vielen Runden horizontal scrollbar. */
function ResultMatrix({
  rounds,
  ranking,
  colorIndex,
}: {
  rounds: RoundResult[];
  ranking: PlayerStats[];
  colorIndex: Map<string, number>;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm [scrollbar-width:thin]">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 bg-white py-3 pr-3 pl-4 text-left text-[11px] font-bold tracking-[0.18em] text-slate-400"
            >
              SPIELER
            </th>
            {rounds.map((round) => (
              <th
                key={round.roundNumber}
                scope="col"
                className="tabular px-1 py-3 text-center text-[11px] font-bold text-slate-400"
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
                className="sticky left-0 z-10 max-w-36 truncate border-t border-slate-100 bg-white py-2 pr-3 pl-4 text-left font-semibold"
                title={stats.player.name}
              >
                <span
                  className="mr-2 inline-block size-2.5 rounded-full align-middle"
                  style={{ backgroundColor: getPlayerColor(colorIndex.get(stats.player.id) ?? 0) }}
                  aria-hidden="true"
                />
                {stats.player.name}
              </th>
              {stats.results.map((result) => (
                <td key={result.roundNumber} className="border-t border-slate-100 px-1 py-2 text-center">
                  <MiniMark success={result.success} className="mx-auto size-6" />
                </td>
              ))}
              <td className="border-t border-slate-100" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlayerHistory({ stats, colorIndex }: { stats: PlayerStats; colorIndex: number }) {
  return (
    <details className="group rounded-2xl border border-slate-100 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronIcon className="size-4 shrink-0 text-slate-400 transition group-open:rotate-90" />
        <Avatar name={stats.player.name} avatar={stats.player.avatar} index={colorIndex} className="size-8 text-sm" />
        <span className="min-w-0 flex-1 truncate font-extrabold tracking-[0.06em] uppercase">{stats.player.name}</span>
        <span className="tabular shrink-0 text-sm font-semibold text-slate-500">
          {duration(stats.totalMs)} ·{' '}
          <span className={stats.errors ? 'text-red-500' : 'text-ok-600'}>{stats.errors} X</span>
        </span>
      </summary>
      <div className="px-4 pb-5">
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5">
          {stats.results.map((result) => (
            <li
              key={result.roundNumber}
              className={`flex items-center justify-between rounded-xl py-1.5 pr-1.5 pl-2.5 ${
                result.success ? 'bg-ok-50' : 'bg-red-50'
              }`}
            >
              <span className="tabular text-xs leading-tight font-bold text-slate-500">
                R{result.roundNumber}
                <span className="block font-semibold text-slate-400">{result.success ? duration(result.ms) : '–'}</span>
              </span>
              <MiniMark success={result.success} className="size-6" />
            </li>
          ))}
        </ul>
        <dl className="tabular mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-ok-50 px-3 py-2">
            <dt className="text-xs text-ok-700/80">Geliefert</dt>
            <dd className="text-lg font-black text-ok-700">{stats.successes}</dd>
          </div>
          <div className="rounded-xl bg-red-50 px-3 py-2">
            <dt className="text-xs text-red-600/80">X</dt>
            <dd className="text-lg font-black text-red-600">{stats.errors}</dd>
          </div>
          <div className="rounded-xl bg-yellow-50 px-3 py-2">
            <dt className="text-xs text-yellow-800/80">Gesamtzeit</dt>
            <dd className="text-lg font-black text-yellow-800">{duration(stats.totalMs)}</dd>
          </div>
        </dl>
      </div>
    </details>
  );
}
