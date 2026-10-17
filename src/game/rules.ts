import type { GameMode } from './types';

/** Alle Zeitangaben in Sekunden. */
export const FIRST_PHASE_DURATION = 3600;
export const EXTENSION_DURATION = 1800;
export const MAX_NAME_LENGTH = 40;

export function getRoundDuration(mode: GameMode): number {
  return mode === 'malte' ? 300 : 600;
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

export function getRoundsInPhase(mode: GameMode, extensionCount: number): number {
  return getPhaseDuration(extensionCount) / getRoundDuration(mode);
}

export function getRoundsBeforePhase(mode: GameMode, extensionCount: number): number {
  return getPhaseOffset(extensionCount) / getRoundDuration(mode);
}

/** Anzahl aller Runden bis zum Ende der Phase mit dem gegebenen Index. */
export function getTotalRounds(mode: GameMode, extensionCount: number): number {
  return getTotalDuration(extensionCount) / getRoundDuration(mode);
}

export function getModeLabel(mode: GameMode): string {
  return mode === 'malte' ? 'Malte Spezial' : 'Normal';
}
