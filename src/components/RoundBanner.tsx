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
      className={`pointer-events-none fixed inset-0 z-30 flex animate-banner items-center justify-center px-6 backdrop-blur-md ${
        errors > 0 ? 'bg-[#1a0607]/90' : 'bg-ink-950/90'
      }`}
      aria-live="assertive"
    >
      <div className="w-full max-w-md min-w-0 text-center">
        <p className="text-xs font-bold tracking-[0.35em] text-ink-400">RUNDE {event.roundNumber + 1}</p>
        <p className="mt-3 text-[clamp(2.5rem,12vw,4rem)] leading-none font-black tracking-[-0.02em]">BEGINNT</p>
        {errors > 0 ? (
          <>
            <p className="mt-8 text-lg font-extrabold tracking-[0.16em] text-miss">
              {errors} FEHLER IN RUNDE {event.roundNumber}
            </p>
            <p className="mt-2 line-clamp-3 text-ink-300 [overflow-wrap:anywhere]">{formatList(names)}</p>
          </>
        ) : (
          <p className="mt-8 text-lg font-extrabold tracking-[0.16em] text-go">
            RUNDE {event.roundNumber}: ALLE BESTÄTIGT
          </p>
        )}
      </div>
    </div>
  );
}
