/**
 * Farben in Rot, Gelb und Grün – jeder Teilnehmer bekommt seine eigene (nach Reihenfolge).
 * Auf hellen Gelbtönen steht die Initiale dunkel, sonst weiß.
 */
const PLAYER_COLORS: Array<{ bg: string; fg: string }> = [
  { bg: '#ef4444', fg: '#fff' }, // Rot
  { bg: '#facc15', fg: '#422006' }, // Gelb
  { bg: '#22c55e', fg: '#fff' }, // Grün
  { bg: '#b91c1c', fg: '#fff' }, // Dunkelrot
  { bg: '#f59e0b', fg: '#fff' }, // Bernstein
  { bg: '#15803d', fg: '#fff' }, // Dunkelgrün
  { bg: '#f87171', fg: '#fff' }, // Hellrot
  { bg: '#a3e635', fg: '#1a2e05' }, // Limette
  { bg: '#ca8a04', fg: '#fff' }, // Senfgelb
  { bg: '#4ade80', fg: '#052e16' }, // Hellgrün
];

function playerColor(index: number) {
  return PLAYER_COLORS[((index % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length];
}

export function getPlayerColor(index: number): string {
  return playerColor(index).bg;
}

function initial(name: string): string {
  return (Array.from(name.trim())[0] ?? '?').toLocaleUpperCase('de-DE');
}

export function Avatar({ name, index, className = 'size-11 text-lg' }: { name: string; index: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-black shadow-sm ${className}`}
      style={{ backgroundColor: playerColor(index).bg, color: playerColor(index).fg }}
    >
      {initial(name)}
    </span>
  );
}
