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
      className={`fixed inset-0 z-40 flex justify-center bg-black/70 backdrop-blur-sm animate-fade ${
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
        className={`w-full max-w-md animate-sheet border border-ink-700 bg-ink-900 shadow-2xl ${
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
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-xs font-bold tracking-[0.25em] text-ink-400">
            EINSTELLUNGEN
          </h2>
          <button
            type="button"
            onClick={onClose}
            data-autofocus
            className="-mr-2 grid size-11 place-items-center rounded-full text-ink-400 transition hover:bg-ink-800 hover:text-white"
            aria-label="Schließen"
          >
            <CloseIcon className="size-6" />
          </button>
        </div>

        <label className="mt-3 flex cursor-pointer items-center justify-between gap-4 py-2">
          <span className="flex items-center gap-3 text-lg font-semibold">
            <SpeakerIcon className="size-6 text-ink-400" />
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
            className="relative h-8 w-14 shrink-0 rounded-full bg-ink-700 transition peer-checked:bg-go peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white after:absolute after:top-1 after:left-1 after:size-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-6"
          />
        </label>

        <div className={`mt-4 ${settings.soundEnabled ? '' : 'pointer-events-none opacity-40'}`}>
          <div className="flex items-baseline justify-between">
            <label htmlFor={volumeId} className="text-sm text-ink-300">
              Lautstärke
            </label>
            <span className="tabular text-sm text-ink-400">{volume}&nbsp;%</span>
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
            className="mt-2 h-8 w-full cursor-pointer accent-white"
          />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!settings.soundEnabled}
              onClick={() => onTestSound('error')}
              className="h-12 rounded-xl border border-miss/40 text-sm font-semibold text-miss transition hover:bg-miss/10"
            >
              Fehlersound testen
            </button>
            <button
              type="button"
              disabled={!settings.soundEnabled}
              onClick={() => onTestSound('success')}
              className="h-12 rounded-xl border border-go/40 text-sm font-semibold text-go transition hover:bg-go/10"
            >
              Erfolgssound testen
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-500">
            Auf dem iPhone muss der Stummschalter aus sein, damit die Sounds zu hören sind.
          </p>
        </div>

        {onCancelGame && (
          <div className="mt-6 border-t border-ink-800 pt-4">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="h-12 w-full rounded-xl text-base font-semibold text-miss transition hover:bg-miss/10"
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
        <h2 id={titleId} className="text-2xl font-black tracking-[0.04em]">
          SPIEL WIRKLICH ABBRECHEN?
        </h2>
        <p className="mt-3 text-ink-300 italic">Alle Ergebnisse des laufenden Spiels gehen verloren.</p>
        <div className="mt-7 grid gap-2">
          <button
            type="button"
            onClick={onKeepPlaying}
            data-autofocus
            className="h-14 rounded-2xl bg-white font-extrabold tracking-[0.12em] text-ink-950 transition hover:bg-ink-300"
          >
            WEITERSPIELEN
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-14 rounded-2xl border border-miss/50 font-extrabold tracking-[0.12em] text-miss transition hover:bg-miss/10"
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
        className="pointer-events-auto mt-2 w-full max-w-md animate-sheet rounded-2xl border border-ink-700 bg-ink-850/95 px-5 py-4 text-left shadow-2xl backdrop-blur"
      >
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-300">{text}</span>
      </button>
    </div>
  );
}
