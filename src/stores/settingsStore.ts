import { create } from 'zustand';

export interface SettingsState {
  corsProxyUrl: string;
  defaultQuality: 'auto' | '1080p' | '720p' | '480p';
  bufferSize: number; // in seconds
  autoPlayNext: boolean;
  playbackSpeed: number;
  skipDuration: number; // in seconds
  activeProviderValue: string;
  
  // Actions
  setCorsProxyUrl: (url: string) => void;
  setDefaultQuality: (q: 'auto' | '1080p' | '720p' | '480p') => void;
  setBufferSize: (size: number) => void;
  setAutoPlayNext: (val: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSkipDuration: (sec: number) => void;
  setActiveProviderValue: (val: string) => void;
  resetSettings: () => void;
}

const STORAGE_KEY = 'vega_settings_v5';

const defaultSettings = {
  corsProxyUrl: '',
  defaultQuality: 'auto' as const,
  bufferSize: 30,
  autoPlayNext: true,
  playbackSpeed: 1.0,
  skipDuration: 10,
  activeProviderValue: 'vega',
};

const loadInitialSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to parse settings from storage:', e);
  }
  return defaultSettings;
};

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initial = loadInitialSettings();

  const persist = (newState: Partial<SettingsState>) => {
    try {
      const current = get();
      const updated = { ...current, ...newState };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          corsProxyUrl: updated.corsProxyUrl,
          defaultQuality: updated.defaultQuality,
          bufferSize: updated.bufferSize,
          autoPlayNext: updated.autoPlayNext,
          playbackSpeed: updated.playbackSpeed,
          skipDuration: updated.skipDuration,
          activeProviderValue: updated.activeProviderValue,
        })
      );
    } catch (e) {
      console.warn('Failed to persist settings:', e);
    }
  };

  return {
    ...initial,

    setCorsProxyUrl: (url: string) => {
      set({ corsProxyUrl: url });
      persist({ corsProxyUrl: url });
    },

    setDefaultQuality: (defaultQuality) => {
      set({ defaultQuality });
      persist({ defaultQuality });
    },

    setBufferSize: (bufferSize) => {
      set({ bufferSize });
      persist({ bufferSize });
    },

    setAutoPlayNext: (autoPlayNext) => {
      set({ autoPlayNext });
      persist({ autoPlayNext });
    },

    setPlaybackSpeed: (playbackSpeed) => {
      set({ playbackSpeed });
      persist({ playbackSpeed });
    },

    setSkipDuration: (skipDuration) => {
      set({ skipDuration });
      persist({ skipDuration });
    },

    setActiveProviderValue: (activeProviderValue) => {
      set({ activeProviderValue });
      persist({ activeProviderValue });
    },

    resetSettings: () => {
      set(defaultSettings);
      persist(defaultSettings);
    },
  };
});
