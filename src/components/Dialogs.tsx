import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { SoundKind } from '../game/feedback';
import type { GroupId, Settings } from '../game/types';
import { CheckIcon, ChevronIcon, CloseIcon, SpeakerIcon } from './icons';

/** So lange leuchtet ein Testknopf – etwa so lange, wie sein Ton dauert. */
const TEST_FLASH_MS: Record<SoundKind, number> = { error: 950, success: 1100 };

/** Gemeinsame Grundlage für Menü, Anleitung und Sicherheitsabfrage: Hintergrund, Escape-Taste, Fokus. */
export function Overlay({
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
      className={`fixed inset-0 z-40 flex justify-center bg-black/40 backdrop-blur-sm animate-fade ${
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
        className={`w-full max-w-md animate-sheet bg-white shadow-2xl shadow-black/20 ${
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
  onTestSound: (kind: SoundKind, group: GroupId) => void;
  /** Testknöpfe auch für die eigenen Töne des 15-Minuten-Takts zeigen. */
  showSlowGroup: boolean;
  onOpenGuide: () => void;
  onClose: () => void;
  /** Nur während eines Spiels vorhanden. */
  onCancelGame?: () => void;
}

export function MenuSheet({
  settings,
  onChange,
  onTestSound,
  showSlowGroup,
  onOpenGuide,
  onClose,
  onCancelGame,
}: MenuProps) {
  const titleId = useId();
  const volumeId = useId();
  const [confirming, setConfirming] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);
  const volume = Math.round(settings.soundVolume * 100);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const testSound = (kind: SoundKind, group: GroupId) => {
    onTestSound(kind, group);
    setPlaying(`${group}-${kind}`);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setPlaying(null), TEST_FLASH_MS[kind]);
  };

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
          {(showSlowGroup ? (['main', 'slow'] as const) : (['main'] as const)).map((group) => (
            <div key={group} className="mt-4">
              {showSlowGroup && (
                <p
                  className={`mb-1.5 text-[11px] font-black tracking-[0.2em] ${
                    group === 'slow' ? 'text-green-700' : 'text-yellow-700'
                  }`}
                >
                  {group === 'slow' ? '15-MINUTEN-TAKT' : '10-MINUTEN-TAKT'}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {(['error', 'success'] as const).map((kind) => (
                  <TestSoundButton
                    key={kind}
                    kind={kind}
                    playing={playing === `${group}-${kind}`}
                    disabled={!settings.soundEnabled}
                    onClick={() => testSound(kind, group)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onOpenGuide}
            className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2 text-lg font-bold text-slate-900 transition hover:bg-slate-50"
          >
            <span className="grid size-10 place-items-center rounded-full bg-yellow-100 text-lg font-black text-yellow-800">
              ?
            </span>
            <span className="flex-1 text-left">Spielanleitung</span>
            <ChevronIcon className="size-5 text-slate-400" />
          </button>
        </div>

        {onCancelGame && (
          <div className="mt-3 border-t border-slate-100 pt-4">
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

/**
 * Testknopf für einen Ton. Solange der Ton läuft, leuchtet der Knopf in dessen Farbe auf –
 * rot mit X für den X-Sound, grün mit Haken für den Erfolgssound –, damit man ihn zuordnen kann.
 */
function TestSoundButton({
  kind,
  playing,
  disabled,
  onClick,
}: {
  kind: SoundKind;
  playing: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const error = kind === 'error';
  const Mark = error ? CloseIcon : CheckIcon;
  const tone = playing
    ? error
      ? 'scale-[1.04] bg-red-500 text-white shadow-lg shadow-red-500/40 ring-4 ring-red-200'
      : 'scale-[1.04] bg-ok-500 text-white shadow-lg shadow-ok-500/40 ring-4 ring-ok-200'
    : error
      ? 'bg-red-50 text-red-600 hover:bg-red-100'
      : 'bg-ok-50 text-ok-700 hover:bg-ok-100';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-12 items-center justify-center gap-2 rounded-xl px-2 text-sm font-bold transition duration-150 ${tone}`}
    >
      <span
        key={playing ? 'an' : 'aus'}
        className={`grid size-6 shrink-0 place-items-center rounded-full ${
          playing
            ? `animate-pop bg-[#fff] ${error ? 'text-red-500' : 'text-ok-600'}`
            : error
              ? 'bg-red-500 text-white'
              : 'bg-ok-500 text-white'
        }`}
        aria-hidden="true"
      >
        <Mark className="size-4" strokeWidth={3.5} />
      </span>
      {error ? 'X-Sound testen' : 'Erfolgssound testen'}
    </button>
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
            className="h-14 rounded-2xl bg-ok-600 font-extrabold tracking-[0.12em] text-white shadow-md shadow-ok-600/25 transition hover:brightness-110"
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
        className="pointer-events-auto mt-2 flex w-full max-w-md animate-sheet items-stretch gap-3 rounded-2xl bg-white px-4 py-4 text-left shadow-xl shadow-black/15 ring-1 ring-slate-100"
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
