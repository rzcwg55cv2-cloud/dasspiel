/**
 * Unnützes Bierwissen: Einmal pro 10-Minuten-Abschnitt ploppt mitten im Spiel ein absurder
 * „Fakt“ über Bier auf. Absichtlich ist nichts davon wahr.
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

/** 100 garantiert falsche Fakten über Bier. */
export const BIERWISSEN: readonly string[] = [
  'Kölsch wird nur in Stangen serviert, weil es in breiten Gläsern Platzangst bekommt.',
  'Bierschaum ist eigentlich eine Wolke, die sich verlaufen hat.',
  'Der Kölner Dom war ursprünglich als Kühlschrank für ein einziges Fass geplant.',
  'Wer sein Kölsch gegen den Uhrzeigersinn trinkt, wird pro Stunde vier Minuten jünger.',
  'Hopfen wächst nur, wenn man ihm abends Schlager vorsingt.',
  'Ein trockener Bierdeckel kann bis zu 400 Jahre alt werden.',
  'Das erste Bier der Welt wurde aus Versehen von einer Ente gebraut.',
  'Pinguine sind schwarz-weiß, weil sie sich nicht zwischen Hell und Dunkel entscheiden konnten.',
  'In Düsseldorf ist Kölsch offiziell als Fabelwesen eingestuft.',
  'Die Schaumkrone ist in Wahrheit ein Adelstitel.',
  'Ein Glas Kölsch enthält genau so viele Bläschen, wie der Rhein Kurven hat.',
  'Bier wird nicht schal. Es wird nur müde.',
  'Das Zischen beim Öffnen einer Flasche ist das Bier, das „Endlich!“ ruft.',
  'Wikinger trugen Hörner am Helm, um zwei Biere gleichzeitig halten zu können.',
  'Die Zahl 0,2 wurde nur erfunden, damit Kölsch eine Größe hat.',
  'Malz ist Getreide, das zu viel nachgedacht hat.',
  'Wer beim Anstoßen nicht in die Augen schaut, hat sieben Jahre schlechtes WLAN.',
  '„Prost“ war ursprünglich der Name eines sehr beliebten Ponys.',
  'Fassbier lagert im Fass, damit es sich nicht einsam fühlt.',
  'Ein Kranz dreht sich nur, weil den Stangen schwindelig ist.',
  'Bier ist gelb, weil es zu lange in der Sonne lag.',
  'Dunkles Bier ist helles Bier, das nachts gebraut wurde.',
  'Hefe ist das einzige Lebewesen, das freiwillig in Bier wohnt – mietfrei.',
  'Im Mittelalter bezahlte man mit Kronkorken. Leider gab es noch keine Flaschen.',
  'Ein Liter Bier wiegt auf dem Mars nur 380 Gramm. Deshalb wollen alle hin.',
  'Kölsch ist das einzige Bier, das offiziell Karneval feiern darf.',
  'Bierbäuche sind Lagerräume für schlechte Zeiten.',
  'Ein Bierdeckel landet immer mit der Werbung nach unten. Physik.',
  'Bierschaum hat eine eigene Gewerkschaft. Sie hat drei Zentimeter durchgesetzt.',
  'Der erste Kühlschrank war ein Mönch mit sehr kalten Händen.',
  'Jedes zehnte Kölsch ist heimlich ein Alt mit Sonnenbrille.',
  'Wer ein Kölsch schüttelt, löst ein kleines Gewitter aus.',
  'Pilze sind neidisch auf Hefe, weil Hefe zu Partys eingeladen wird.',
  'Brauereipferde bekommen nach Feierabend Malzbier. Steht im Arbeitsvertrag.',
  'Bier hat keine Kalorien. Die sitzen alle im Glas.',
  'Ein Kölsch, das man stehen lässt, geht nach zehn Minuten allein nach Hause.',
  'Die Flaschenpost wurde erfunden, weil jemand sein Leergut zurückschicken wollte.',
  'Ein Bierfass rollt nur bergab, weil es Höhenangst hat.',
  'Die Milchstraße hieß ursprünglich Malzstraße.',
  'Wolken bestehen zu drei Prozent aus verdunstetem Freibier.',
  'Der Bierdeckel wurde erfunden, weil ein Tisch Durst hatte.',
  'Eichhörnchen vergraben keine Nüsse, sondern Kronkorken für schlechte Zeiten.',
  'Ein Köbes kann das Wort „Wasser“ akustisch nicht wahrnehmen.',
  'Bier, das im Stehen getrunken wird, landet in den Beinen. Daher das Tanzen.',
  'Leere Gläser sind statistisch die traurigsten Gegenstände der Welt.',
  'Die Zapfanlage ist mit dem Dudelsack verwandt. Beide machen Geräusche, wenn man an ihnen zieht.',
  'Kölsch reift am besten, wenn man ihm Fotos vom Dom zeigt.',
  'Malte Spezial ist eigentlich ein Wetterphänomen.',
  'Tonkrüge haben bei Neumond Stimmungsschwankungen.',
  'Kühe geben mehr Milch, wenn man ihnen von Bier erzählt.',
  'Das Reinheitsgebot verbietet auch schmutzige Witze beim Brauen.',
  'Wer drei Kölsch auf einmal bestellt, muss eine Rede halten. Gesetz.',
  'Bierflaschen sind grün, damit sie sich im Gras verstecken können.',
  'Schluckauf bedeutet, dass das Bier zurück ins Glas will.',
  'Hopfen und Malz sind seit Jahrhunderten verheiratet und streiten nie.',
  'Kronkorken sind die winzigen Kronen gestürzter Bierkönige.',
  'Rheinschiffe fahren mit Kölsch statt Diesel. Allerdings nur bergab.',
  'In jedem Fass wohnt ein kleiner Mann, der „Prost“ ruft, wenn angezapft wird.',
  'Weizenbier ist Bier, das zu oft beim Friseur war.',
  'Ein Bierkeller ist ein Dachboden, der es sich anders überlegt hat.',
  'Mit Strohhalm geht Bier schneller – es fährt im Windschatten.',
  'Die Schwerkraft wurde entdeckt, als ein Bier umfiel. Der Apfel war nur Zeuge.',
  'Bierdeckel sind runde Tagebücher für Striche und Geheimnisse.',
  'Wer „noch eins“ sagt, löst eine Kettenreaktion aus, die Physiker bis heute nicht verstehen.',
  'Ein Kölsch zählt heimlich mit, wie oft es angestoßen wurde.',
  'Gläser klirren beim Anstoßen, weil sie sich freuen.',
  'Bier im Kühlschrank wird nur kalt, weil drinnen das Licht ausgeht.',
  'Zapfhähne tragen Schnurrbärte aus Schaum, um älter auszusehen.',
  'Bier ist flüssiges Brot. Toast ist demnach festes Bier.',
  'Der Karneval dauert so lange, bis das letzte Fass „Alaaf“ sagt.',
  'Dosenbier wurde erfunden, weil Flaschen Platzangst haben.',
  'Wer sein Kölsch zu langsam trinkt, wird vom Köbes adoptiert.',
  'Biergärten wachsen nur, wenn man sie mit Radler gießt.',
  'Jeder Bierdeckel hat einen Zwilling, der irgendwo unter einem Sofa liegt.',
  'Schaum fällt nicht zusammen. Er macht nur ein Nickerchen.',
  'Ein Bierzelt ist ein Haus, das zu viel getrunken hat.',
  'Das „Ahhh“ nach dem ersten Schluck ist international geschützt.',
  'In Köln gilt ein leeres Glas als Liebeserklärung an den Köbes.',
  'Bier wird in Hektolitern gemessen, weil „Hekto“ nach Hektik klingt.',
  'Ein Bierkasten ist mathematisch gesehen ein Würfel mit Durst.',
  'Alle elf Minuten verliebt sich ein Bierdeckel in einen Tisch.',
  'Das Pfandsystem wurde von Flaschen gegründet, die nicht allein sein wollten.',
  'Ein Bier, das zu lange stehen bleibt, fängt an, Gedichte zu schreiben.',
  'Erdbeben in Köln sind meistens nur ein umgefallener Kranz.',
  'Wer ins Bier niest, verliert offiziell den Anspruch auf die Schaumkrone.',
  'Der Mond leuchtet nur so hell, weil er voll ist.',
  'Die Uhr in dieser App läuft schneller, wenn niemand trinkt.',
  'Bierdeckel fliegen so gut, weil sie früher Vögel waren.',
  'Ein Kölsch hat die Seele eines Golden Retrievers.',
  'Das zweite Bier schmeckt besser, weil das erste schon vorgekostet hat.',
  'Hopfendolden sind die Tannenzapfen der Gemütlichkeit.',
  'Wer ein Bier ex trinkt, macht es offiziell zu seinem Ex.',
  'Der Kater nach dem Feiern ist eine echte Katze. Man sieht sie nur nicht.',
  'Am Schlemmersonntag schmeckt Kölsch nachweislich 17 Prozent besser.',
  'Goldfische können sich drei Sekunden lang an ein Kölsch erinnern. Dann wollen sie noch eins.',
  'Ein Fass Bier, das im Keller vergessen wird, wird nach 100 Jahren zum Bürgermeister gewählt.',
  'Kölschgläser sind so schmal, damit das Bier nicht seitlich wegläuft.',
  'Bierbrauer tragen Gummistiefel, damit das Bier ihre Füße nicht kitzelt.',
  'Ein Bierdeckel unter einem wackelnden Tisch hat schon über 3.000 Ehen gerettet.',
  'Wer alle 100 Bierfakten gesehen hat, darf sich offiziell Bierprofessor nennen.',
];
