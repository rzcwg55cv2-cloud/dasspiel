import { useId, type CSSProperties } from 'react';

/**
 * Rundumleuchte für Malte Spezial. Aus: rote Kuppel ohne Licht. An: Lichtkegel drehen sich,
 * ein Lichtstreifen wandert über die Kuppel und sie glüht. `delay` versetzt mehrere Leuchten
 * gegeneinander (in Sekunden). Größe und Position kommen über `className`.
 */
export function Beacon({ active, delay = 0, className = '' }: { active: boolean; delay?: number; className?: string }) {
  const id = useId();
  const dome = `${id}-dome`;
  const clip = `${id}-clip`;
  const domePath = 'M8 23V15a8 8 0 0 1 16 0v8z';
  return (
    <span className={`inline-block ${className}`} aria-hidden="true">
      <span
        className={`beacon relative block size-full ${active ? 'beacon-on' : ''}`}
        style={{ '--beacon-delay': `${-delay}s` } as CSSProperties}
      >
        <span className="beacon-beam" />
        <svg viewBox="0 0 32 32" className="relative block size-full">
          <defs>
            <linearGradient id={dome} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={active ? '#b91c1c' : '#991b1b'} />
              <stop offset="0.45" stopColor={active ? '#ff5a5a' : '#dc2626'} />
              <stop offset="1" stopColor={active ? '#c81e1e' : '#7f1d1d'} />
            </linearGradient>
            <clipPath id={clip}>
              <path d={domePath} />
            </clipPath>
          </defs>
          <path d={domePath} fill={`url(#${dome})`} />
          <g clipPath={`url(#${clip})`}>
            {/* Glühbirne und der Lichtstreifen, der beim Drehen über die Kuppel wandert */}
            <rect x="13.5" y="13" width="5" height="10" rx="2.5" fill="#fff" opacity={active ? 0.9 : 0.25} />
            <rect className="beacon-sweep" x="13" y="6" width="6" height="18" fill="#fff" />
          </g>
          {/* Glanzlicht */}
          <path d="M11 20v-5a5 5 0 0 1 3-4.6" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
          {/* Sockel */}
          <rect x="6" y="22" width="20" height="3" rx="1" fill="#475569" />
          <rect x="4.5" y="24.5" width="23" height="5" rx="1.5" fill="#1e293b" />
        </svg>
      </span>
    </span>
  );
}
