import { formatList } from '../game/format';
import type { Player, RoundEvent } from '../game/types';

interface Props {
  event: RoundEvent;
  players: Player[];
}

/**
 * Kurze Vollbild-Einblendung beim Rundenwechsel. Reine CSS-Animation ohne Einfluss
 * auf den Timer; Berührungen gehen durch die Einblendung hindurch.
 */
export function RoundBanner({ event, players }: Props) {
  const errors = event.failedPlayerIds.length;
  const names = players.filter((p) => event.failedPlayerIds.includes(p.id)).map((p) => p.name);

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-30 flex animate-banner items-center justify-center px-6 text-white ${
        errors > 0
          ? 'bg-linear-to-br from-rose-500 via-pink-500 to-orange-400'
          : 'bg-linear-to-br from-emerald-400 via-teal-400 to-sky-500'
      }`}
      aria-live="assertive"
    >
      <div className="w-full max-w-md min-w-0 text-center">
        <p className="text-sm font-bold tracking-[0.35em] text-white/80">RUNDE {event.roundNumber + 1}</p>
        <p className="mt-3 text-[clamp(2.75rem,13vw,4.5rem)] leading-none font-black tracking-[-0.02em] drop-shadow-sm">
          BEGINNT
        </p>
        {errors > 0 ? (
          <>
            <p className="mt-8 inline-block rounded-full bg-white px-5 py-2 text-base font-extrabold tracking-[0.14em] text-rose-600 shadow-lg">
              {errors} X IN RUNDE {event.roundNumber}
            </p>
            <p className="mt-3 line-clamp-3 font-medium text-white/95 [overflow-wrap:anywhere]">{formatList(names)}</p>
          </>
        ) : (
          <p className="mt-8 inline-block rounded-full bg-white px-5 py-2 text-base font-extrabold tracking-[0.12em] text-emerald-600 shadow-lg">
            ALLE HABEN GELIEFERT
          </p>
        )}
      </div>
    </div>
  );
}
