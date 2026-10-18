import type { ReactNode } from 'react';
import { CloseIcon } from './icons';

interface Props {
  icon: ReactNode;
  /** Kleine Überschrift über dem Text, z. B. „UNNÜTZES BIERWISSEN“. */
  label?: string;
  text: string;
  /** Zusätzliches unter dem Text, z. B. die Musik-Balken. */
  extra?: ReactNode;
  /** So lange läuft der Balken, bis das Pop-up von selbst verschwindet. */
  durationMs: number;
  onClose: () => void;
}

/** Pop-up mitten im Spiel (Schlemmersonntag, Bierwissen); verschwindet nach `durationMs` von selbst. */
export function PopupCard({ icon, label, text, extra, durationMs, onClose }: Props) {
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
        <div aria-hidden="true">{icon}</div>
        {label && <p className="mt-3 text-[11px] font-black tracking-[0.22em] text-amber-700">{label}</p>}
        <p
          className={`leading-tight font-black tracking-[-0.01em] text-slate-900 ${label ? 'mt-1.5' : 'mt-3'} ${
            text.length > 60 ? 'text-xl' : 'text-2xl'
          }`}
        >
          {text}
        </p>
        {extra}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-amber-100" aria-hidden="true">
          <div
            className="h-full origin-left animate-drain rounded-full bg-amber-400"
            style={{ animationDuration: `${durationMs}ms` }}
          />
        </div>
      </div>
    </div>
  );
}
