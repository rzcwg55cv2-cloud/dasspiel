import { useCallback, useEffect, useState } from 'react';
import { sounds } from '../audio/sounds';
import { loadSettings, saveSettings } from '../game/storage';
import type { Settings } from '../game/types';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
    sounds.setVolume(settings.soundVolume);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  return [settings, update] as const;
}
