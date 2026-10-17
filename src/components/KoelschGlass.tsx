import { useId, type SVGProps } from 'react';

/** Goldenes Kölsch: hell oben, kräftiger zum Boden hin. */
const BEER_COLORS = ['#fde68a', '#fbbf24', '#f59e0b'] as const;

/** Innenraum des Glases, in dem das Bier steht (SVG-Koordinaten). */
const BEER_TOP = 16;
const BEER_BOTTOM = 55.5;

interface Props extends SVGProps<SVGSVGElement> {
  /** Füllstand von 0 (leer) bis 1 (voll mit Schaumkrone). */
  level?: number;
}

/**
 * Eine Kölsch-Stange – schlankes, gerades Glas mit Bier und Schaum.
 * Als Logo immer voll; neben der Uhr leert es sich mit der laufenden Runde.
 */
export function KoelschGlass({ level = 1, className = '', ...props }: Props) {
  const id = useId();
  const beer = `${id}-beer`;
  const glass = `${id}-glass`;
  const clip = `${id}-clip`;
  const fill = Math.min(1, Math.max(0, level));
  const full = fill >= 0.999;
  const surface = BEER_BOTTOM - fill * (BEER_BOTTOM - BEER_TOP);
  const [light, mid, dark] = BEER_COLORS;

  return (
    <svg viewBox="0 0 32 64" className={className} aria-hidden="true" focusable="false" {...props}>
      <defs>
        <linearGradient id={beer} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.35" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={glass} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="0.5" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#cbd5e1" />
        </linearGradient>
        <clipPath id={clip}>
          <rect x="7.4" y={surface} width="17.2" height={BEER_BOTTOM - surface} rx="1.5" />
        </clipPath>
      </defs>

      {/* Glaskörper */}
      <path d="M6 7h20v48.5a4.5 4.5 0 0 1-4.5 4.5h-11A4.5 4.5 0 0 1 6 55.5z" fill={`url(#${glass})`} opacity="0.55" />
      {/* Bier mit Bläschen */}
      {fill > 0 && (
        <g clipPath={`url(#${clip})`}>
          <rect x="7.4" y={BEER_TOP} width="17.2" height={BEER_BOTTOM - BEER_TOP} fill={`url(#${beer})`} />
          <g fill="#fff" opacity="0.75">
            <circle cx="13" cy="27" r="0.8" />
            <circle cx="19.5" cy="33" r="0.9" />
            <circle cx="15.5" cy="40" r="0.7" />
            <circle cx="20" cy="46" r="0.8" />
            <circle cx="12.5" cy="49" r="0.6" />
            <circle cx="17" cy="22.5" r="0.6" />
          </g>
        </g>
      )}
      {full ? (
        /* Schaumkrone über den Rand */
        <path
          d="M7 18V10.5C7 7.2 9.6 5.4 12.2 6.4 13.4 3.9 17.2 3.4 19 5.6c2.6-1.3 6.3.4 6 4.2V18c-1.7 1.4-3.4 1.4-5.1 0-1.7 1.4-3.4 1.4-5.1 0-1.7 1.4-3.4 1.4-5.1 0C8.9 19 7.9 18.9 7 18z"
          fill="#fffbeb"
        />
      ) : fill > 0 ? (
        /* Schaum sinkt mit dem Bier */
        <rect x="7.4" y={Math.max(BEER_TOP - 6, surface - 3)} width="17.2" height="4" rx="1.6" fill="#fffbeb" />
      ) : (
        /* Leer: nur noch ein Rest Schaum am Boden */
        <rect x="8.5" y="52.5" width="15" height="1.6" rx="0.8" fill="#fffbeb" opacity="0.8" />
      )}
      {/* dicker Glasboden */}
      <rect x="6" y="54" width="20" height="6" rx="3" fill="#e2e8f0" opacity="0.9" />
      {/* Glanzlicht */}
      <rect x="9.2" y="20" width="1.8" height="30" rx="0.9" fill="#fff" opacity="0.6" />
      {/* Glasrand */}
      <path
        d="M6 7v48.5A4.5 4.5 0 0 0 10.5 60h11a4.5 4.5 0 0 0 4.5-4.5V7"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
