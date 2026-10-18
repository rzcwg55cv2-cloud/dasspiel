import { useId, type ReactNode } from 'react';
import { Beacon } from './Beacon';
import { Overlay } from './Dialogs';
import { CheckIcon, CloseIcon } from './icons';
import { KoelschGlass } from './KoelschGlass';

/** Nummern von Rot über Gelb nach Grün – wie der Markenverlauf. */
const STEP_COLORS = [
  'bg-red-500 text-white',
  'bg-orange-500 text-white',
  'bg-amber-500 text-white',
  'bg-yellow-400 text-yellow-950',
  'bg-lime-500 text-white',
  'bg-green-500 text-white',
  'bg-green-600 text-white',
];

const Tick = () => (
  <span className="inline-grid size-5 place-items-center rounded-full bg-ok-500 align-[-0.3em] text-white">
    <CheckIcon className="size-3.5" strokeWidth={3.5} />
  </span>
);

const Cross = () => (
  <span className="inline-grid size-5 place-items-center rounded-full bg-red-500 align-[-0.3em] text-white">
    <CloseIcon className="size-3.5" strokeWidth={3.5} />
  </span>
);

const Penalty = () => (
  <span className="inline-flex items-center gap-1 rounded-md border-2 border-red-500 py-px pr-1.5 pl-1 align-[0.05em] text-[10px] font-black tracking-[0.12em] text-red-600">
    <KoelschGlass className="h-3 w-1.5" />
    STRAFBIER
  </span>
);

const STEPS: Array<{ lead: ReactNode; text?: ReactNode }> = [
  { lead: 'Alle eintragen.', text: 'Wer es gemütlicher braucht, kommt in den 15-Minuten-Takt.' },
  {
    lead: 'Jede Runde muss jeder liefern:',
    text: (
      <>
        ein Kölsch leer. Das Glas{' '}
        <KoelschGlass level={0.5} className="inline-block h-5 w-2.5 align-[-0.3em]" /> neben der Uhr zeigt, wie viel
        Zeit noch bleibt.
      </>
    ),
  },
  {
    lead: 'Geliefert? Antippen',
    text: (
      <span className="whitespace-nowrap">
        → grüner Haken <Tick />
      </span>
    ),
  },
  {
    lead: 'Kein Haken zum Rundenende',
    text: (
      <>
        <span className="whitespace-nowrap">
          → <Cross />.
        </span>{' '}
        <span className="whitespace-nowrap">
          Und ein <Penalty />
        </span>
      </>
    ),
  },
  { lead: 'Strafbier in der nächsten Runde trinken und abhaken.', text: 'Sonst werden zwei draus. Dann vier.' },
  { lead: 'Nach 60 Minuten:', text: 'Ehrenrunde (+30 Min.) oder Feierabend.' },
  { lead: 'Am Ende zählt nur eins:', text: 'Wer die wenigsten X hat, gewinnt.' },
];

/** Kurze Spielanleitung – vom Startbildschirm („SO GEHT'S“) und aus dem Menü erreichbar. */
export function GuideSheet({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  return (
    <Overlay onClose={onClose} labelledBy={titleId}>
      <div className="max-h-[88dvh] overflow-y-auto overscroll-contain px-6 pt-5 pb-safe sm:pb-6">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="brand-text text-sm font-black tracking-[0.3em]">
            SO GEHT'S
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

        <ol className="mt-3 space-y-3.5">
          {STEPS.map((step, index) => (
            <li key={index} className="flex gap-3.5">
              <span
                className={`tabular mt-px grid size-7 shrink-0 place-items-center rounded-full text-sm font-black ${STEP_COLORS[index]}`}
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <p className="leading-snug text-slate-600">
                <strong className="font-extrabold text-slate-900">{step.lead}</strong> {step.text}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3.5">
          <p className="flex items-center gap-1.5 font-extrabold tracking-[0.08em] text-red-600">
            <Beacon active className="size-6 shrink-0" />
            MALTE SPEZIAL
            <Beacon active delay={0.5} className="size-6 shrink-0" />
          </p>
          <p className="mt-1 leading-snug text-slate-600">Doppelt so viele Runden. Halb so viel Zeit. Brace for impact.</p>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Ein Handy ist die Spielzentrale – dort wird für alle abgehakt.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-14 w-full rounded-2xl bg-green-600 text-base font-extrabold tracking-[0.14em] text-white shadow-lg shadow-green-600/30 transition hover:brightness-110 active:scale-[0.98]"
        >
          ICH HAB DURST!
        </button>
      </div>
    </Overlay>
  );
}
