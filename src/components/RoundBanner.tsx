import { formatList } from '../game/format';
import { getGroupLabel } from '../game/rules';
import type { GameMode, Player, RoundEvent } from '../game/types';

interface Props {
  /** Gleichzeitig beendete Runden – eine pro Gruppe. */
  events: RoundEvent[];
  players: Player[];
  mode: GameMode;
  /** Gruppen beschriften, wenn eine 15-Minuten-Gruppe mitspielt. */
  showGroups: boolean;
}

/**
 * Kurze Vollbild-Einblendung beim Rundenwechsel. Reine CSS-Animation ohne Einfluss
 * auf den Timer; Berührungen gehen durch die Einblendung hindurch.
 */
export function RoundBanner({ events, players, mode, showGroups }: Props) {
  const anyErrors = events.some((e) => e.failedPlayerIds.length > 0);
  const label = (event: RoundEvent) => (showGroups ? `${getGroupLabel(mode, event.group).toUpperCase()} ` : '');

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-30 flex animate-banner items-center justify-center px-6 text-white ${
        anyErrors
          ? 'bg-linear-to-br from-red-600 via-red-500 to-amber-400'
          : 'bg-linear-to-br from-green-600 via-green-500 to-lime-400'
      }`}
      aria-live="assertive"
    >
      <div className="w-full max-w-md min-w-0 text-center">
        <p className="text-sm font-bold tracking-[0.3em] text-white/85">
          {events.map((e) => `${label(e)}RUNDE ${e.roundNumber + 1}`).join('  ·  ')}
        </p>
        <p className="mt-3 text-[clamp(2.75rem,13vw,4.5rem)] leading-none font-black tracking-[-0.02em] drop-shadow-sm">
          BEGINNT
        </p>
        {events.map((event) => {
          const errors = event.failedPlayerIds.length;
          const names = players.filter((p) => event.failedPlayerIds.includes(p.id)).map((p) => p.name);
          return (
            <div key={event.group} className="mt-6">
              <p
                className={`inline-block rounded-full bg-white px-5 py-2 text-base font-extrabold tracking-[0.12em] shadow-lg ${
                  errors > 0 ? 'text-red-600' : 'text-green-700'
                }`}
              >
                {showGroups && `${getGroupLabel(mode, event.group).toUpperCase()}: `}
                {errors > 0 ? `${errors} X IN RUNDE ${event.roundNumber}` : 'ALLE HABEN GELIEFERT'}
              </p>
              {errors > 0 && (
                <p className="mt-2 line-clamp-3 font-medium text-white/95 [overflow-wrap:anywhere]">{formatList(names)}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
