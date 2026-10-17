import { SCHLEMMER_DURATION_MS } from '../game/schlemmersonntag';
import { CloseIcon } from './icons';

/** Kleines Pop-up mitten im Spiel; verschwindet nach der Hymne von selbst. */
export function SchlemmerPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-8">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto relative w-full max-w-xs animate-pop rounded-3xl border-2 border-amber-300 bg-white px-6 pt-6 pb-5 text-center shadow-2xl shadow-black/25"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-2 right-2 grid size-10 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <CloseIcon className="size-5" />
        </button>
        <div className="text-5xl leading-none" aria-hidden="true">
          🍽️
        </div>
        <p className="mt-3 text-2xl leading-tight font-black tracking-[-0.01em] text-slate-900">
          Kennen Sie schon den Schlemmersonntag?
        </p>
        <div className="mt-4 flex h-6 items-end justify-center gap-1" aria-hidden="true">
          {[0, 0.25, 0.1, 0.35, 0.18].map((delay, index) => (
            <span
              key={index}
              className="h-full w-1.5 origin-bottom animate-eq rounded-full bg-amber-400"
              style={{ animationDelay: `${-delay}s` }}
            />
          ))}
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-amber-100" aria-hidden="true">
          <div
            className="h-full origin-left animate-drain rounded-full bg-amber-400"
            style={{ animationDuration: `${SCHLEMMER_DURATION_MS}ms` }}
          />
        </div>
      </div>
    </div>
  );
}
