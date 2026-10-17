import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { SoundKind } from '../game/feedback';
import type { Settings } from '../game/types';
import { CloseIcon, SpeakerIcon } from './icons';

/** Gemeinsame Grundlage für Menü und Sicherheitsabfrage: Hintergrund, Escape-Taste, Fokus. */
function Overlay({
  onClose,
  labelledBy,
  children,
  align = 'bottom',
}: {
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  align?: 'bottom' | 'center';
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 flex justify-center bg-slate-900/35 backdrop-blur-sm animate-fade ${
        align === 'center' ? 'items-center p-5' : 'items-end sm:items-center sm:p-5'
      }`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`w-full max-w-md animate-sheet bg-white shadow-2xl shadow-slate-900/20 ${
          align === 'center' ? 'rounded-3xl' : 'rounded-t-3xl sm:rounded-3xl'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

interface MenuProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onTestSound: (kind: SoundKind) => void;
  onClose: () => void;
  /** Nur während eines Spiels vorhanden. */
  onCancelGame?: () => void;
}

export function MenuSheet({ settings, onChange, onTestSound, onClose, onCancelGame }: MenuProps) {
  const titleId = useId();
  const volumeId = useId();
  const [confirming, setConfirming] = useState(false);
  const volume = Math.round(settings.soundVolume * 100);

  if (confirming && onCancelGame) {
    return (
      <CancelDialog
        onKeepPlaying={onClose}
        onConfirm={() => {
          onCancelGame();
          onClose();
        }}
      />
    );
  }

  return (
    <Overlay onClose={onClose} labelledBy={titleId}>
      <div className="px-6 pt-5 pb-safe sm:pb-6">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-xs font-bold tracking-[0.25em] text-slate-500">
            EINSTELLUNGEN
          </h2>
          <button
            type="button"
            onClick={onClose}
            data-autofocus
            className="-mr-2 grid size-11 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Schließen"
          >
            <CloseIcon className="size-6" />
          </button>
        </div>

        <label className="mt-3 flex cursor-pointer items-center justify-between gap-4 py-2">
          <span className="flex items-center gap-3 text-lg font-bold text-slate-900">
            <span className="grid size-10 place-items-center rounded-full bg-green-100 text-green-700">
              <SpeakerIcon className="size-5" />
            </span>
            Sounds
          </span>
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={settings.soundEnabled}
            onChange={(e) => onChange({ soundEnabled: e.target.checked })}
          />
          <span
            aria-hidden="true"
            className="relative h-8 w-14 shrink-0 rounded-full bg-slate-200 transition peer-checked:bg-green-500 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-500 after:absolute after:top-1 after:left-1 after:size-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-6"
          />
        </label>

        <div className={`mt-4 ${settings.soundEnabled ? '' : 'pointer-events-none opacity-40'}`}>
          <div className="flex items-baseline justify-between">
            <label htmlFor={volumeId} className="text-sm font-medium text-slate-600">
              Lautstärke
            </label>
            <span className="tabular text-sm font-bold text-green-700">{volume}&nbsp;%</span>
          </div>
          <input
            id={volumeId}
            type="range"
            min={0}
            max={100}
            step={5}
            value={volume}
            disabled={!settings.soundEnabled}
            onChange={(e) => onChange({ soundVolume: Number(e.target.value) / 100 })}
            className="mt-2 h-8 w-full cursor-pointer accent-green-600"
          />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!settings.soundEnabled}
              onClick={() => onTestSound('error')}
              className="h-12 rounded-xl bg-red-50 text-sm font-bold text-red-600 transition hover:bg-red-100"
            >
              X-Sound testen
            </button>
            <button
              type="button"
              disabled={!settings.soundEnabled}
              onClick={() => onTestSound('success')}
              className="h-12 rounded-xl bg-green-50 text-sm font-bold text-green-700 transition hover:bg-green-100"
            >
              Erfolgssound testen
            </button>
          </div>
          <label className="mt-5 flex cursor-pointer items-center justify-between gap-4">
            <span className="text-sm font-bold text-slate-800">Auch bei lautlos abspielen</span>
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              checked={settings.playInSilentMode}
              disabled={!settings.soundEnabled}
              onChange={(e) => onChange({ playInSilentMode: e.target.checked })}
            />
            <span
              aria-hidden="true"
              className="relative h-7 w-12 shrink-0 rounded-full bg-slate-200 transition peer-checked:bg-green-500 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-500 after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
            />
          </label>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {settings.playInSilentMode
              ? 'Die Töne kommen auch, wenn das iPhone auf lautlos steht. Läuft auf demselben iPhone Musik, wird sie dabei unterbrochen.'
              : 'Auf dem iPhone muss der Lautlos-Schalter aus sein, damit die Töne zu hören sind.'}{' '}
            Die Medienlautstärke muss aufgedreht sein.
          </p>
        </div>

        {onCancelGame && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="h-12 w-full rounded-xl text-base font-bold text-red-600 transition hover:bg-red-50"
            >
              Spiel abbrechen
            </button>
          </div>
        )}
      </div>
    </Overlay>
  );
}

function CancelDialog({ onKeepPlaying, onConfirm }: { onKeepPlaying: () => void; onConfirm: () => void }) {
  const titleId = useId();
  return (
    <Overlay onClose={onKeepPlaying} labelledBy={titleId} align="center">
      <div className="px-6 py-7 text-center">
        <h2 id={titleId} className="text-2xl font-black tracking-[0.04em] text-slate-900">
          SPIEL WIRKLICH ABBRECHEN?
        </h2>
        <p className="mt-3 text-slate-500 italic">Alle Ergebnisse des laufenden Spiels gehen verloren.</p>
        <div className="mt-7 grid gap-2">
          <button
            type="button"
            onClick={onKeepPlaying}
            data-autofocus
            className="h-14 rounded-2xl bg-green-600 font-extrabold tracking-[0.12em] text-white shadow-md shadow-green-600/25 transition hover:bg-green-700"
          >
            WEITERSPIELEN
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-14 rounded-2xl border-2 border-red-200 font-extrabold tracking-[0.12em] text-red-600 transition hover:bg-red-50"
          >
            SPIEL ABBRECHEN
          </button>
        </div>
      </div>
    </Overlay>
  );
}

export function NoticeToast({ title, text, onDismiss }: { title: string; text: string; onDismiss: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, 8000);
    return () => window.clearTimeout(id);
  }, [onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-safe">
      <button
        type="button"
        onClick={onDismiss}
        role="status"
        className="pointer-events-auto mt-2 flex w-full max-w-md animate-sheet items-stretch gap-3 rounded-2xl bg-white px-4 py-4 text-left shadow-xl shadow-slate-900/15 ring-1 ring-slate-100"
      >
        <span className="w-1.5 shrink-0 rounded-full bg-linear-to-b from-red-500 via-yellow-400 to-green-500" aria-hidden="true" />
        <span>
          <span className="block text-sm font-bold text-slate-900">{title}</span>
          <span className="mt-0.5 block text-sm text-slate-600">{text}</span>
        </span>
      </button>
    </div>
  );
}
