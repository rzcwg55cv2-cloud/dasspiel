/**
 * Unnützes Wissen: Einmal pro 10-Minuten-Abschnitt ploppt mitten im Spiel ein sinnloser,
 * aber wahrer Fakt auf.
 *
 * Der Zeitpunkt je Abschnitt wird aus Spielstart, Spielphase und Abschnitt abgeleitet (bleibt
 * nach dem Neuladen gleich). Er liegt immer 30 Sekunden nach einer vollen Minute und mindestens
 * 90 Sekunden von jedem Rundenende entfernt – in allen Takten – sowie 2 Minuten vom Schlemmersonntag.
 */
import { activeGroups } from './engine';
import { getGroupRoundDuration, getPhaseDuration } from './rules';
import { getSchlemmerTime } from './schlemmersonntag';
import type { GameState } from './types';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
export const FACT_SLOT_MS = 10 * MINUTE;
/** Abstand zu jedem Rundenende (davor und danach). */
const ROUND_END_GAP_MS = 90 * SECOND;
/** Abstand zum Schlemmersonntag. */
const SCHLEMMER_GAP_MS = 2 * MINUTE;

export interface FactSlot {
  /** Eindeutig pro Spiel, Phase und Abschnitt. */
  id: string;
  at: number;
  /** Ende des 10-Minuten-Abschnitts – bis dahin wird ein verpasster Fakt nachgeholt. */
  until: number;
}

/** Ob `offset` (ms seit Phasenbeginn) mindestens 90 Sekunden von jedem Rundenende entfernt ist. */
function clearOfRoundEnds(offset: number, roundDurations: number[]): boolean {
  return roundDurations.every((duration) => {
    const sinceEnd = offset % duration;
    return Math.min(sinceEnd, duration - sinceEnd) >= ROUND_END_GAP_MS;
  });
}

function roundDurationsOf(state: GameState): number[] {
  return activeGroups(state).map((group) => getGroupRoundDuration(state.mode, group) * SECOND);
}

/** Zeitpunkte der Pop-ups in der laufenden Spielphase – einer pro 10-Minuten-Abschnitt. */
export function getFactSlots(state: GameState): FactSlot[] {
  const { phaseStartedAt, startedAt, extensionCount } = state;
  if (state.status !== 'running' || phaseStartedAt === null || startedAt === null) return [];
  const roundDurations = roundDurationsOf(state);
  const schlemmer = extensionCount === 0 ? getSchlemmerTime(startedAt) : null;
  const slotCount = (getPhaseDuration(extensionCount) * SECOND) / FACT_SLOT_MS;

  const slots: FactSlot[] = [];
  for (let slot = 0; slot < slotCount; slot++) {
    const candidates: number[] = [];
    for (let minute = 1; minute <= 8; minute++) {
      const offset = slot * FACT_SLOT_MS + minute * MINUTE + 30 * SECOND;
      const at = phaseStartedAt + offset;
      const clearOfSchlemmer = schlemmer === null || Math.abs(at - schlemmer) >= SCHLEMMER_GAP_MS;
      if (clearOfRoundEnds(offset, roundDurations) && clearOfSchlemmer) candidates.push(at);
    }
    if (candidates.length === 0) continue;
    const seed = hash(Math.floor(startedAt / SECOND) + extensionCount * 131 + slot * 7919);
    slots.push({
      id: `${startedAt}-${extensionCount}-${slot}`,
      at: candidates[seed % candidates.length],
      until: phaseStartedAt + (slot + 1) * FACT_SLOT_MS,
    });
  }
  return slots;
}

/**
 * Der Abschnitt, dessen Pop-up gerade fällig ist – sonst null. War die App zum geplanten
 * Zeitpunkt nicht offen, wird der Fakt im selben Abschnitt nachgeholt, aber nie innerhalb
 * von 90 Sekunden um ein Rundenende.
 */
export function getDueFact(state: GameState, now: number): FactSlot | null {
  const slot = getFactSlots(state).find((s) => now >= s.at && now < s.until);
  if (!slot || state.phaseStartedAt === null) return null;
  return clearOfRoundEnds(now - state.phaseStartedAt, roundDurationsOf(state)) ? slot : null;
}

/** Anzeigedauer je nach Textlänge: 7 bis 12 Sekunden. */
export function getFactDuration(text: string): number {
  return Math.min(12 * SECOND, Math.max(7 * SECOND, 5 * SECOND + text.length * 55));
}

/** Mischt die Reihenfolge (Fisher-Yates); `random` ist austauschbar für Tests. */
export function shuffledIndices(length: number, random: () => number = Math.random): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

function hash(value: number): number {
  let h = value | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

/** 50 echte, aber völlig sinnlose Fakten. */
export const BIERWISSEN: readonly string[] = [
  'Ein Oktopus hat drei Herzen und blaues Blut.',
  'Honig verdirbt nicht: In ägyptischen Gräbern fand man jahrtausendealten Honig, der noch essbar war.',
  'Bananen sind botanisch gesehen Beeren – Erdbeeren dagegen nicht.',
  'Der Eiffelturm ist im Sommer bis zu 15 Zentimeter höher, weil sich das Eisen in der Hitze ausdehnt.',
  'Wombats machen würfelförmigen Kot.',
  'Ein Tag auf der Venus dauert länger als ein Jahr auf der Venus.',
  'Ein Schnabeltier hat keinen Magen.',
  'Die Mona Lisa hat keine Augenbrauen.',
  'Kängurus können nicht rückwärts hüpfen.',
  'Flamingos sind rosa, weil sie Krebstiere und Algen mit Farbstoffen fressen.',
  'Der kürzeste Krieg der Geschichte dauerte rund 38 Minuten: Großbritannien gegen Sansibar, 1896.',
  'Ein Blitz ist etwa fünfmal heißer als die Oberfläche der Sonne.',
  'Seeotter halten sich beim Schlafen an den Pfoten, damit sie nicht voneinander abtreiben.',
  'Die Augen eines Straußes sind größer als sein Gehirn.',
  'Das Nationaltier von Schottland ist das Einhorn.',
  'Die Erdnuss ist keine Nuss, sondern eine Hülsenfrucht.',
  'Haie gibt es schon länger als Bäume.',
  'Kolibris können rückwärts fliegen.',
  'Hauskatzen verschlafen rund zwei Drittel ihres Lebens.',
  'Nilpferde können nicht schwimmen – sie laufen unter Wasser über den Grund.',
  'Pinguine haben Knie. Man sieht sie nur nicht.',
  'Das Herz eines Blauwals ist etwa so groß wie ein Autoscooter.',
  'Ketchup wurde im 19. Jahrhundert als Medizin verkauft.',
  'Die Zunge eines Blauwals wiegt ungefähr so viel wie ein Elefant.',
  'Elefanten können nicht springen.',
  'Australien ist breiter als der Mond.',
  'Die Chinesische Mauer ist vom Mond aus mit bloßem Auge nicht zu sehen.',
  'Goldfische erinnern sich monatelang – nicht nur drei Sekunden.',
  'Krokodile können ihre Zunge nicht herausstrecken.',
  'Giraffen haben genauso viele Halswirbel wie Menschen: sieben.',
  'Ein Jahr auf dem Merkur dauert nur 88 Erdentage.',
  'Der Erfinder der Pringles-Dose wurde zum Teil in einer Pringles-Dose beigesetzt.',
  'Die Universität Oxford ist älter als das Reich der Azteken.',
  'Kleopatra lebte zeitlich näher an der Mondlandung als am Bau der Cheops-Pyramide.',
  'Schmetterlinge schmecken mit ihren Füßen.',
  'Eine Gruppe Flamingos heißt auf Englisch „flamboyance“.',
  'Eine Gruppe Krähen heißt auf Englisch „murder“ – Mord.',
  'Kakerlaken können ohne Kopf noch etwa eine Woche überleben.',
  'Bienen können menschliche Gesichter erkennen.',
  'Der erste mechanische Wecker konnte nur um 4 Uhr morgens klingeln.',
  'Pandas verbringen bis zu 14 Stunden am Tag mit Fressen.',
  'Ratten lachen, wenn man sie kitzelt.',
  'Koalas schlafen bis zu 22 Stunden am Tag.',
  'Napoleon war gar nicht klein: Mit rund 1,69 Metern war er für seine Zeit durchschnittlich.',
  'Eisbären haben unter ihrem weißen Fell schwarze Haut.',
  '„Bluetooth“ ist nach dem Wikingerkönig Harald Blauzahn benannt.',
  'Die Erde ist nicht ganz rund – am Äquator ist sie etwas dicker.',
  'Bei Seepferdchen werden die Männchen schwanger.',
  'In der Schweiz ist es verboten, nur ein einzelnes Meerschweinchen zu halten.',
  'Der erste Strichcode an einer Supermarktkasse wurde 1974 auf einer Packung Kaugummi gescannt.',
];
