/** Kräftige, fröhliche Farben – jeder Teilnehmer bekommt seine eigene (nach Reihenfolge). */
const PLAYER_COLORS = [
  '#f97316', // Orange
  '#ec4899', // Pink
  '#8b5cf6', // Violett
  '#0ea5e9', // Himmelblau
  '#14b8a6', // Türkis
  '#f59e0b', // Gelb
  '#6366f1', // Indigo
  '#d946ef', // Fuchsia
  '#0891b2', // Cyan
  '#65a30d', // Limette
];

export function getPlayerColor(index: number): string {
  return PLAYER_COLORS[((index % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length];
}

function initial(name: string): string {
  return (Array.from(name.trim())[0] ?? '?').toLocaleUpperCase('de-DE');
}

export function Avatar({ name, index, className = 'size-11 text-lg' }: { name: string; index: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-black text-white shadow-sm ${className}`}
      style={{ backgroundColor: getPlayerColor(index) }}
    >
      {initial(name)}
    </span>
  );
}
