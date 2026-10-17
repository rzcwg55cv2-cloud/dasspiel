import { KoelschGlass } from './KoelschGlass';

const timeFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

/** Runde Uhr mit der aktuellen Uhrzeit – statt eines Countdowns, damit die Restzeit geheim bleibt. */
export function AnalogClock({ now, className = '' }: { now: number; className?: string }) {
  const date = new Date(now);
  const seconds = date.getSeconds();
  const minutes = date.getMinutes() + seconds / 60;
  const hours = (date.getHours() % 12) + minutes / 60;

  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={`Uhrzeit ${timeFormat.format(date)} Uhr`}>
      <circle cx="100" cy="100" r="96" strokeWidth="3" className="fill-(--surface) stroke-slate-200" />
      {Array.from({ length: 60 }, (_, i) => {
        const hourMark = i % 5 === 0;
        return (
          <line
            key={i}
            x1="100"
            y1={hourMark ? 10 : 11}
            x2="100"
            y2={hourMark ? 24 : 17}
            strokeWidth={hourMark ? 3.5 : 1.5}
            strokeLinecap="round"
            transform={`rotate(${i * 6} 100 100)`}
            className={hourMark ? 'stroke-slate-500' : 'stroke-slate-300'}
          />
        );
      })}
      {[
        { label: '12', x: 100, y: 44 },
        { label: '3', x: 160, y: 108 },
        { label: '6', x: 100, y: 170 },
        { label: '9', x: 40, y: 108 },
      ].map(({ label, x, y }) => (
        <text
          key={label}
          x={x}
          y={y}
          textAnchor="middle"
          className="fill-slate-400 text-[20px] font-black"
          style={{ fontFeatureSettings: "'tnum' 1" }}
        >
          {label}
        </text>
      ))}
      <KoelschGlass x="93" y="118" width="14" height="28" />

      <line
        x1="100"
        y1="108"
        x2="100"
        y2="54"
        strokeWidth="7"
        strokeLinecap="round"
        transform={`rotate(${hours * 30} 100 100)`}
        className="stroke-slate-900"
      />
      <line
        x1="100"
        y1="110"
        x2="100"
        y2="28"
        strokeWidth="4.5"
        strokeLinecap="round"
        transform={`rotate(${minutes * 6} 100 100)`}
        className="stroke-slate-900"
      />
      <g transform={`rotate(${seconds * 6} 100 100)`}>
        <line x1="100" y1="118" x2="100" y2="22" strokeWidth="2" strokeLinecap="round" className="stroke-red-500" />
        <circle cx="100" cy="100" r="5.5" className="fill-red-500" />
      </g>
      <circle cx="100" cy="100" r="2" className="fill-(--surface)" />
    </svg>
  );
}
