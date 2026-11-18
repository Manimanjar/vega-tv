import { create } from 'zustand';
import { ProviderManifest, ProviderSource } from '../lib/providers/types';
import { ProviderEngine, DEFAULT_SOURCE_URL } from '../lib/providers/providerEngine';
import { useSettingsStore } from './settingsStore';

export interface ProviderStoreState {
  sources: ProviderSource[];
  activeSourceId: string;
  manifests: ProviderManifest[];
  activeProvider: ProviderManifest | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSources: () => void;
  loadProviders: (sourceUrl?: string) => Promise<void>;
  setActiveProvider: (value: string) => void;
  addSource: (name: string, url: string) => Promise<void>;
  removeSource: (id: string) => void;
  setActiveSource: (id: string) => void;
}

const SOURCES_STORAGE_KEY = 'vega_provider_sources_v1';

const defaultSources: ProviderSource[] = [
  {
    id: 'official-vega',
    name: 'Vega Official Providers',
    url: DEFAULT_SOURCE_URL,
    enabled: true,
  },
];

const loadStoredSources = (): ProviderSource[] => {
  try {
    const raw = localStorage.getItem(SOURCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load stored sources:', e);
  }
  return defaultSources;
};

const saveStoredSources = (sources: ProviderSource[]) => {
  try {
    localStorage.setItem(SOURCES_STORAGE_KEY, JSON.stringify(sources));
  } catch (e) {
    console.warn('Failed to save sources:', e);
  }
};

export const useProviderStore = create<ProviderStoreState>((set, get) => ({
  sources: loadStoredSources(),
  activeSourceId: 'official-vega',
  manifests: [],
  activeProvider: null,
  isLoading: false,
  error: null,

  loadSources: () => {
    const sources = loadStoredSources();
    set({ sources });
  },

  loadProviders: async (customSourceUrl?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { sources, activeSourceId } = get();
      const currentSource = sources.find((s) => s.id === activeSourceId) || sources[0];
      const sourceUrl = customSourceUrl || currentSource?.url || DEFAULT_SOURCE_URL;

      const engine = ProviderEngine.getInstance(() => useSettingsStore.getState().corsProxyUrl);
      const manifests = await engine.loadManifest(sourceUrl);

      // Determine active provider
      const storedActive = useSettingsStore.getState().activeProviderValue;
      let active = manifests.find((m) => m.value === storedActive && !m.disabled);
      if (!active) {
        active = manifests.find((m) => !m.disabled) || manifests[0] || null;
      }

      set({
        manifests,
        activeProvider: active,
        isLoading: false,
      });

      if (active) {
        useSettingsStore.getState().setActiveProviderValue(active.value);
      }
    } catch (err: any) {
      console.error('Failed to load provider manifests:', err);
      set({
        isLoading: false,
        error: err.message || 'Failed to load provider catalog',
      });
    }
  },

  setActiveProvider: (value: string) => {
    const { manifests } = get();
    const found = manifests.find((m) => m.value === value);
    if (found) {
      set({ activeProvider: found });
      useSettingsStore.getState().setActiveProviderValue(value);
    }
  },

  addSource: async (name: string, url: string) => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    const newSource: ProviderSource = {
      id: `src-${Date.now()}`,
      name: name.trim() || 'Custom Provider Source',
      url: cleanUrl,
      enabled: true,
    };

    const updated = [...get().sources, newSource];
    set({ sources: updated, activeSourceId: newSource.id });
    saveStoredSources(updated);

    // Load providers from the new source
    await get().loadProviders(cleanUrl);
  },

  removeSource: (id: string) => {
    const updated = get().sources.filter((s) => s.id !== id);
    if (updated.length === 0) return; // Keep at least one
    const newActiveId = updated[0].id;
    set({ sources: updated, activeSourceId: newActiveId });
    saveStoredSources(updated);
    get().loadProviders(updated[0].url);
  },

  setActiveSource: (id: string) => {
    const found = get().sources.find((s) => s.id === id);
    if (found) {
      set({ activeSourceId: id });
      get().loadProviders(found.url);
    }
  },
}));
