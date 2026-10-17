import { describe, expect, it } from 'vitest';
import { estimateBeer } from './beer';
import { setPlayerGroup, setSlowGroupEnabled } from './engine';
import { setupState } from './test-utils';

describe('Bierbedarf', () => {
  it('ein Kölsch pro Person und Runde', () => {
    expect(estimateBeer(setupState([]))).toEqual({ glasses: 0, extensionGlasses: 0 });
    expect(estimateBeer(setupState(['Simon', 'Marvin', 'Tino', 'Malte']))).toEqual({
      glasses: 24,
      extensionGlasses: 12,
    });
  });

  it('Malte Spezial: doppelt so viele Runden', () => {
    expect(estimateBeer(setupState(['Simon', 'Marvin'], 'malte'))).toEqual({ glasses: 24, extensionGlasses: 12 });
  });

  it('15-Minuten-Takt zählt nur mit Haken und nur im Modus Normal', () => {
    const mixed = setPlayerGroup(setupState(['Simon', 'Marvin', 'Tino', 'Anna']), 'p4', 'slow');
    expect(estimateBeer(mixed)).toEqual({ glasses: 24, extensionGlasses: 12 });

    const enabled = setSlowGroupEnabled(mixed, true);
    expect(estimateBeer(enabled)).toEqual({ glasses: 3 * 6 + 4, extensionGlasses: 3 * 3 + 2 });
    expect(estimateBeer({ ...enabled, mode: 'malte' })).toEqual({ glasses: 48, extensionGlasses: 24 });
  });
});
