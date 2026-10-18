/**
 * Schlemmersonntag: Einmal pro Spiel – garantiert – taucht zu einem zufälligen Zeitpunkt in
 * der ersten Stunde ein kleines Pop-up auf („Kennen Sie schon den Schlemmersonntag?“) und
 * die ersten 10 Sekunden der Hymne laufen.
 *
 * Der Zeitpunkt wird aus dem Spielstart abgeleitet – nach dem Neuladen bleibt er gleich.
 * Er liegt immer 30 Sekunden nach einer vollen Minute und damit nie auf einem Rundenende.
 * War die App zu dem Zeitpunkt nicht offen (Display aus, andere App), wird das Pop-up
 * nachgeholt, sobald sie wieder offen ist – aber nur mitten in einer Minute, denn Runden
 * enden immer zur vollen Minute.
 */
import { alignToNextMinute } from './engine';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/** Frühestens nach 3, spätestens nach 56 Minuten der ersten Spielphase. */
const FIRST_MINUTE = 3;
const LAST_MINUTE = 56;

/** So lange bleibt das Pop-up stehen: Pop-Geräusch und 10 Sekunden Hymne. */
export const SCHLEMMER_DURATION_MS = 10_500;
/** Nachgeholt wird nur zwischen Sekunde 5 und 45 einer Minute – mit Abstand zu jedem Rundenende. */
const CATCH_UP_FROM = 5 * SECOND;
const CATCH_UP_UNTIL = 45 * SECOND;

export function getSchlemmerTime(startedAt: number): number {
  const span = LAST_MINUTE - FIRST_MINUTE + 1;
  const minute = FIRST_MINUTE + (hash(Math.floor(startedAt / SECOND)) % span);
  return alignToNextMinute(startedAt) + minute * MINUTE + 30 * SECOND;
}

export function isSchlemmerDue(startedAt: number, now: number): boolean {
  if (now < getSchlemmerTime(startedAt)) return false;
  const second = now % MINUTE;
  return second >= CATCH_UP_FROM && second <= CATCH_UP_UNTIL;
}

/** Ganzzahl-Hash, damit aufeinanderfolgende Startzeiten gut gestreute Minuten ergeben. */
function hash(value: number): number {
  let h = value | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}
