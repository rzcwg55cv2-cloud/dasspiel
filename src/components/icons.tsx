import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const MenuIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const SpeakerIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M11 5L6 9H3v6h3l5 4V5z" />
    <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
  </Icon>
);

export const ChevronIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);

export type MarkState = 'pending' | 'confirmed' | 'missed';

/** Grauer Kreis, grünes X oder rotes X. */
export function StatusMark({ state, className = '' }: { state: MarkState; className?: string }) {
  if (state === 'pending') {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
        <circle cx="24" cy="24" r="19" fill="none" strokeWidth="3" className="stroke-slate-300" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className={`${className} animate-pop`} aria-hidden="true">
      <circle cx="24" cy="24" r="22" className={state === 'confirmed' ? 'fill-emerald-500' : 'fill-rose-500'} />
      <path d="M16.5 16.5l15 15m0-15l-15 15" strokeWidth="5" strokeLinecap="round" className="stroke-white" />
    </svg>
  );
}

/** Kleines X für Tabellen und Verlaufsübersichten. */
export function MiniMark({ success, className = '' }: { success: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={success ? 'X erhalten' : 'Fehler'}>
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="7"
        className={success ? 'fill-emerald-500' : 'fill-rose-500'}
      />
      <path d="M8.5 8.5l7 7m0-7l-7 7" strokeWidth="2.6" strokeLinecap="round" className="stroke-white" />
    </svg>
  );
}
