/** Zeit im Format MM:SS. Minuten laufen über 59 hinaus weiter (z. B. 74:12). */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

const percentFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

/** Erfolgsquote als deutscher Prozentwert, z. B. „88,9 %“. */
export function formatPercent(rate: number): string {
  return `${percentFormat.format(Math.round(rate * 1000) / 10)} %`;
}

const literFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

/** Litermenge, z. B. „4,8 l“. */
export function formatLiters(liters: number): string {
  return `${literFormat.format(liters)} l`;
}

export function formatMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
}

/** „Simon“, „Simon und Tino“, „Simon, Marvin und Tino“ */
export function formatList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} und ${items.at(-1)}`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
