/**
 * Sprüche für die Verlängerungsfrage – je nachdem, wie gut das Spiel bisher lief.
 *
 * Ein „X“ ist eine verpasste Runde eines Teilnehmers. Da X eher selten sind, liegen
 * die Stufen bewusst niedrig: Schon wenige X machen aus „läuft gut“ ein „durchwachsen“.
 */
import { formatList } from './format';
import { getPlayerStats } from './stats';
import type { GameState } from './types';

export type Mood = 'perfect' | 'good' | 'mixed' | 'bad';

/** Anteil der X an allen Teilnehmer-Runden, bis zu dem die Stufe noch gilt. */
export const MOOD_THRESHOLDS = { good: 0.06, mixed: 0.15 } as const;

interface Saying {
  title: string;
  text: string;
}

const SAYINGS: Record<Mood, Array<Saying | ((xCount: number) => Saying)>> = {
  perfect: [
    { title: 'KEIN EINZIGES X. RESPEKT!', text: 'Ihr seid ja Maschinen. Noch eine Ehrenrunde?' },
    { title: 'LÄUFT BEI EUCH!', text: 'Null X. Selbst der Köbes ist beeindruckt.' },
    { title: 'WIE DIE PROFIS!', text: 'So viel Disziplin gab’s in Köln zuletzt beim Rosenmontagszug.' },
  ],
  good: [
    { title: 'IHR SEID JA GUT DRAUF!', text: 'Noch eine Ehrenrunde?' },
    (xCount) => ({
      title: 'FAST PERFEKT.',
      text: `${xCount === 1 ? 'Das eine X' : 'Die paar X'} hat keiner gesehen. Weiter?`,
    }),
    { title: 'STARK GELIEFERT!', text: 'Jetzt bloß nicht nachlassen.' },
  ],
  mixed: [
    { title: 'MAL SO, MAL SO.', text: 'Et hätt noch immer jot jejange. Noch 30 Minuten?' },
    { title: 'DA IST NOCH LUFT NACH OBEN.', text: 'Zeit für ein Comeback?' },
    { title: 'JEDER JECK IS ANDERS.', text: 'Manche liefern, manche nicht. Nochmal?' },
  ],
  bad: [
    { title: 'UFF.', text: 'Das war eher Kreisliga. Revanche?' },
    { title: 'WER HAT HIER EIGENTLICH GELIEFERT?', text: 'Et kütt wie et kütt. 30 Minuten zum Wiedergutmachen?' },
    { title: 'ACH DU JECK.', text: 'Der Köbes schüttelt den Kopf. Ehrenrunde zur Strafe?' },
  ],
};

/** Überschriften ab der zweiten Verlängerungsfrage. */
const LATER_TITLES = ['IHR KRIEGT NICHT GENUG, WAS?', 'IMMER NOCH DA? RESPEKT.', 'DIE NACHT IST JUNG.'];

const EXTEND_LABELS: Record<Mood, string> = {
  perfect: 'EHRENRUNDE! (+30 MIN.)',
  good: 'EHRENRUNDE! (+30 MIN.)',
  mixed: 'WEITER GEHT’S (+30 MIN.)',
  bad: 'REVANCHE! (+30 MIN.)',
};

export const FINISH_LABEL = 'FEIERABEND';

export interface DecisionText {
  mood: Mood;
  title: string;
  text: string;
  /** Persönlicher Spruch mit Namen; null, wenn keiner passt. */
  nameLine: string | null;
  extendLabel: string;
  finishLabel: string;
}

export function getMood(xCount: number, playerRounds: number): Mood {
  if (xCount === 0 || playerRounds === 0) return 'perfect';
  const rate = xCount / playerRounds;
  if (xCount === 1 || rate <= MOOD_THRESHOLDS.good) return 'good';
  if (rate <= MOOD_THRESHOLDS.mixed) return 'mixed';
  return 'bad';
}

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

/** Sprüche mit Namen, die zum bisherigen Spielverlauf passen. */
export function getNameLines(state: GameState): string[] {
  const stats = getPlayerStats(state);
  const lines: string[] = [];
  const maxX = Math.max(0, ...stats.map((s) => s.errors));
  if (maxX === 0) return lines;

  const worst = stats.filter((s) => s.errors === maxX).map((s) => s.player.name);
  const several = worst.length > 1;
  lines.push(`${formatList(worst)}, alles okay bei ${several ? 'euch' : 'dir'}? ${several ? 'Je ' : ''}${maxX} X …`);
  lines.push(`${formatList(worst)} ${several ? 'zahlen' : 'zahlt'} den Kranz.`);

  // „Trägt euch allein“ passt nur, wenn genau eine Person ohne X ist und alle anderen X haben.
  const clean = stats.filter((s) => s.errors === 0);
  if (stats.length >= 2 && clean.length === 1) {
    lines.push(`${clean[0].player.name} trägt euch gerade allein.`);
  }
  return lines;
}

/**
 * Text für die Verlängerungsfrage. Die Auswahl ist pro Spiel und Entscheidung fest,
 * damit sich der Spruch beim Neuladen nicht ändert.
 */
export function getDecisionText(state: GameState): DecisionText {
  const stats = getPlayerStats(state);
  const xCount = stats.reduce((sum, s) => sum + s.errors, 0);
  // Jeder Teilnehmer zählt mit den Runden seiner eigenen Gruppe.
  const mood = getMood(xCount, stats.reduce((sum, s) => sum + s.rounds, 0));
  const seed = Math.floor((state.startedAt ?? 0) / 1000) + state.extensionCount * 7;

  const entry = pick(SAYINGS[mood], seed);
  const saying = typeof entry === 'function' ? entry(xCount) : entry;
  const nameLines = getNameLines(state);

  return {
    mood,
    title: state.extensionCount === 0 ? saying.title : pick(LATER_TITLES, seed),
    text: saying.text,
    nameLine: nameLines.length > 0 ? pick(nameLines, seed + 1) : null,
    extendLabel: EXTEND_LABELS[mood],
    finishLabel: FINISH_LABEL,
  };
}

/** Alle Sprüche einer Stufe – für Tests und zum Nachschlagen. */
export function getSayings(mood: Mood, xCount = 2): Saying[] {
  return SAYINGS[mood].map((entry) => (typeof entry === 'function' ? entry(xCount) : entry));
}

export { LATER_TITLES };
