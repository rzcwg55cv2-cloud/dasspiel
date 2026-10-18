import { SCHLEMMER_DURATION_MS } from '../game/schlemmersonntag';
import { PopupCard } from './PopupCard';

/** Schlemmersonntag: verschwindet nach der Hymne von selbst. */
export function SchlemmerPopup({ onClose }: { onClose: () => void }) {
  return (
    <PopupCard
      icon={<span className="text-5xl leading-none">🍽️</span>}
      text="Kennen Sie schon den Schlemmersonntag?"
      extra={
        <div className="mt-4 flex h-6 items-end justify-center gap-1" aria-hidden="true">
          {[0, 0.25, 0.1, 0.35, 0.18].map((delay, index) => (
            <span
              key={index}
              className="h-full w-1.5 origin-bottom animate-eq rounded-full bg-amber-400"
              style={{ animationDelay: `${-delay}s` }}
            />
          ))}
        </div>
      }
      durationMs={SCHLEMMER_DURATION_MS}
      onClose={onClose}
    />
  );
}
