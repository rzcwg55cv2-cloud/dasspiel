import { useRef, useState, type FormEvent } from 'react';
import type { AddPlayerError } from '../game/engine';
import { MAX_NAME_LENGTH, getRoundDuration, getRoundsInPhase } from '../game/rules';
import type { GameMode, Player } from '../game/types';
import { Avatar } from './Avatar';
import { ColorGlow } from './Decor';
import { KoelschGlass } from './KoelschGlass';
import { CheckIcon, CloseIcon, MenuIcon, PlusIcon } from './icons';

interface Props {
  players: Player[];
  mode: GameMode;
  onAddPlayer: (name: string) => AddPlayerError | null;
  onRemovePlayer: (id: string) => void;
  onModeChange: (mode: GameMode) => void;
  onStart: () => void;
  onOpenMenu: () => void;
}

const ERROR_TEXT: Record<AddPlayerError, (name: string) => string> = {
  empty: () => 'Bitte einen Namen eingeben.',
  duplicate: (name) => `„${name.trim()}“ ist schon dabei.`,
  'too-long': () => `Der Name ist zu lang (höchstens ${MAX_NAME_LENGTH} Zeichen).`,
  locked: () => 'Während eines Spiels können keine Teilnehmer hinzugefügt werden.',
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function SetupScreen({ players, mode, onAddPlayer, onRemovePlayer, onModeChange, onStart, onOpenMenu }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const malte = mode === 'malte';
  const roundMinutes = getRoundDuration(mode) / 60;
  const rounds = getRoundsInPhase(mode, 0);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = onAddPlayer(name);
    if (result) {
      setError(ERROR_TEXT[result](name));
    } else {
      setName('');
      setError(null);
    }
    inputRef.current?.focus();
  };

  return (
    <div className="relative isolate min-h-dvh">
      <ColorGlow />
      <main className="mx-auto w-full max-w-xl px-5 pt-safe pb-48">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onOpenMenu}
            className="-mr-2 grid size-11 place-items-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-900"
            aria-label="Einstellungen"
          >
            <MenuIcon className="size-6" />
          </button>
        </div>

        <header className="mt-6 animate-fade-up sm:mt-10">
          <h1 className="brand-text w-fit pb-1 text-[clamp(3.5rem,17vw,5.5rem)] leading-[0.92] font-black tracking-[-0.04em]">
            DAS
            <br />
            SPIEL
            <KoelschGlass className="ml-[0.12em] inline-block h-[0.9em] w-[0.45em] align-[-0.02em]" />
          </h1>
          <p className="mt-4 text-xl font-bold text-slate-800 italic">60 Minuten. Alle müssen liefern!</p>
          <p className="mt-1.5 text-base font-medium text-slate-500">Das zeitbasierte Gruppenspiel zum Vorwärtskommen.</p>
        </header>

        <section className="mt-12" aria-labelledby="players-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="players-heading" className="text-xs font-bold tracking-[0.25em] text-slate-500">
              TEILNEHMER
            </h2>
            {players.length > 0 && (
              <span className="tabular rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                {players.length}
              </span>
            )}
          </div>

          <form onSubmit={submit} className="mt-3 flex gap-2">
            <label htmlFor="player-name" className="sr-only">
              Name des Teilnehmers
            </label>
            <input
              ref={inputRef}
              id="player-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Name eingeben"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="done"
              maxLength={MAX_NAME_LENGTH}
              aria-invalid={error !== null}
              aria-describedby={error ? 'player-error' : undefined}
              className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 text-[17px] text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-green-500 focus:outline-none"
            />
            <button
              type="submit"
              className="flex h-14 shrink-0 items-center gap-2 rounded-2xl bg-yellow-400 px-5 font-bold text-yellow-950 shadow-md shadow-yellow-500/30 transition hover:bg-yellow-300 active:scale-[0.97]"
            >
              <PlusIcon className="size-5" strokeWidth={2.5} />
              <span>Hinzufügen</span>
            </button>
          </form>
          <p id="player-error" role="alert" className="mt-2 min-h-5 text-sm font-medium text-red-600">
            {error}
          </p>

          {players.length === 0 ? (
            <p className="mt-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white/70 px-5 py-6 text-center text-slate-500">
              Noch niemand dabei. Füge mindestens einen Teilnehmer hinzu.
            </p>
          ) : (
            <ol className="mt-2 space-y-2">
              {players.map((player, index) => (
                <li
                  key={player.id}
                  className="flex animate-fade-up items-center gap-3 rounded-2xl border border-slate-100 bg-white py-2 pr-2 pl-3 shadow-sm"
                >
                  <Avatar name={player.name} index={index} className="size-10 text-base" />
                  <span className="min-w-0 flex-1 truncate text-lg font-semibold" title={player.name}>
                    {player.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemovePlayer(player.id)}
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    aria-label={`${player.name} entfernen`}
                  >
                    <CloseIcon className="size-5" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="mt-12" aria-labelledby="mode-heading">
          <h2 id="mode-heading" className="text-xs font-bold tracking-[0.25em] text-slate-500">
            SPIELMODUS
          </h2>
          <label
            className={`mt-3 flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-5 transition ${
              malte
                ? 'border-red-400 bg-linear-to-br from-red-50 to-yellow-50 shadow-md shadow-red-500/10'
                : 'border-slate-200 bg-white hover:border-red-200'
            }`}
          >
            <input
              type="checkbox"
              className="peer sr-only"
              checked={malte}
              onChange={(e) => onModeChange(e.target.checked ? 'malte' : 'normal')}
            />
            <span
              className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border-2 transition peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-500 ${
                malte ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300 bg-white'
              }`}
              aria-hidden="true"
            >
              {malte && <CheckIcon className="size-5 animate-pop" strokeWidth={3} />}
            </span>
            <span>
              <span className={`block text-lg font-extrabold tracking-[0.12em] ${malte ? 'text-red-600' : 'text-slate-900'}`}>
                MALTE SPEZIAL
              </span>
              <span className="mt-1 block text-slate-500 italic">Doppelt so viele Runden. Halb so viel Zeit.</span>
            </span>
          </label>
          <p className="mt-3 flex flex-wrap items-center gap-2 px-1 text-sm text-slate-500">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.15em] ${
                malte ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {malte ? 'MALTE SPEZIAL' : 'NORMAL'}
            </span>
            <span className="tabular font-medium">
              {rounds} Runden à {roundMinutes} Minuten
            </span>
          </p>
        </section>

        {!isStandalone() && (
          <p className="mt-12 px-1 text-xs leading-relaxed text-slate-400">
            Tipp: Über „Teilen“ bzw. das Browsermenü → „Zum Home-Bildschirm“ wird Das Spiel zur App und
            funktioniert auch ohne Internet.
          </p>
        )}
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 bg-linear-to-t from-white from-60% to-transparent pt-10">
        <div className="pointer-events-auto mx-auto w-full max-w-xl px-5 pb-safe">
          <button
            type="button"
            onClick={onStart}
            disabled={players.length === 0}
            className="h-16 w-full rounded-2xl bg-green-600 text-lg font-extrabold tracking-[0.14em] text-white shadow-lg shadow-green-600/30 transition hover:bg-green-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            SPIEL STARTEN
          </button>
          <p className="mt-2 h-4 text-center text-xs text-slate-400">
            {players.length === 0 ? 'Mindestens ein Teilnehmer wird benötigt.' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
