import { useId } from 'react';
import { AVATARS, Avatar } from './Avatar';
import { Overlay } from './Dialogs';
import { CloseIcon } from './icons';

interface Props {
  name: string;
  index: number;
  current?: string;
  onSelect: (avatar: string | null) => void;
  onClose: () => void;
}

/** Auswahl eines Avatars statt der Initiale – öffnet sich beim Antippen des Kreises. */
export function AvatarPicker({ name, index, current, onSelect, onClose }: Props) {
  const titleId = useId();
  const choose = (avatar: string | null) => {
    onSelect(avatar);
    onClose();
  };
  return (
    <Overlay onClose={onClose} labelledBy={titleId}>
      <div className="max-h-[88dvh] overflow-y-auto px-6 pt-5 pb-safe sm:pb-6">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="flex min-w-0 items-center gap-3 text-lg font-bold text-slate-900">
            <Avatar name={name} index={index} avatar={current} className="size-10 text-base" />
            <span className="truncate">Avatar für {name}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            data-autofocus
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Schließen"
          >
            <CloseIcon className="size-6" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-6">
          <button
            type="button"
            onClick={() => choose(null)}
            aria-pressed={!current}
            aria-label="Initiale statt Avatar"
            className={`grid aspect-square place-items-center rounded-2xl border-2 transition active:scale-95 ${
              !current ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-white hover:border-slate-200'
            }`}
          >
            <Avatar name={name} index={index} className="size-10 text-base" />
          </button>
          {AVATARS.map((avatar) => (
            <button
              key={avatar}
              type="button"
              onClick={() => choose(avatar)}
              aria-pressed={current === avatar}
              aria-label={`Avatar ${avatar}`}
              className={`grid aspect-square place-items-center rounded-2xl border-2 text-3xl transition active:scale-95 ${
                current === avatar ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              {avatar}
            </button>
          ))}
        </div>
      </div>
    </Overlay>
  );
}
