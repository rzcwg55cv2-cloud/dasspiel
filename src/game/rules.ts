import type { GameMode, GroupId } from './types';

/** Alle Zeitangaben in Sekunden. */
export const FIRST_PHASE_DURATION = 3600;
export const EXTENSION_DURATION = 1800;
export const SLOW_ROUND_DURATION = 900;
export const MAX_NAME_LENGTH = 40;

export function getRoundDuration(mode: GameMode): number {
  return mode === 'malte' ? 300 : 600;
}

/** Rundendauer einer Taktgruppe: Haupttakt je nach Modus, 15-Minuten-Gruppe immer 15 Minuten. */
export function getGroupRoundDuration(mode: GameMode, group: GroupId): number {
  return group === 'slow' ? SLOW_ROUND_DURATION : getRoundDuration(mode);
}

/** Dauer der Spielphase mit dem gegebenen Index (0 = erste Phase, 1 = erste Verlängerung, …). */
export function getPhaseDuration(extensionCount: number): number {
  return extensionCount === 0 ? FIRST_PHASE_DURATION : EXTENSION_DURATION;
}

/** Geplante Gesamtspielzeit bis zum Ende der Phase mit dem gegebenen Index. */
export function getTotalDuration(extensionCount: number): number {
  return FIRST_PHASE_DURATION + extensionCount * EXTENSION_DURATION;
}

/** Bereits gespielte Zeit, bevor die Phase mit dem gegebenen Index beginnt. */
export function getPhaseOffset(extensionCount: number): number {
  return extensionCount === 0 ? 0 : getTotalDuration(extensionCount - 1);
}

/** Die Funktionen unten erwarten die Rundendauer in Sekunden (siehe getGroupRoundDuration). */
export function getRoundsInPhase(roundDuration: number, extensionCount: number): number {
  return getPhaseDuration(extensionCount) / roundDuration;
}

export function getRoundsBeforePhase(roundDuration: number, extensionCount: number): number {
  return getPhaseOffset(extensionCount) / roundDuration;
}

/** Anzahl aller Runden bis zum Ende der Phase mit dem gegebenen Index. */
export function getTotalRounds(roundDuration: number, extensionCount: number): number {
  return getTotalDuration(extensionCount) / roundDuration;
}

export function getModeLabel(mode: GameMode): string {
  return mode === 'malte' ? 'Malte Spezial' : 'Normal';
}

/** Kurzbezeichnung einer Taktgruppe, z. B. „10 Min.“ oder „15 Min.“. */
export function getGroupLabel(mode: GameMode, group: GroupId): string {
  return `${getGroupRoundDuration(mode, group) / 60} Min.`;
}
