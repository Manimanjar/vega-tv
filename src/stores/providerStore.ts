import { create } from 'zustand';
import { ProviderManifest, ProviderSource } from '../lib/providers/types';
import {
  ProviderEngine,
  ZENDA_SOURCE_URL,
  normalizeSourceUrl,
} from '../lib/providers/providerEngine';
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
  setActiveSource: (id: string) => Promise<void>;
}

const SOURCES_STORAGE_KEY = 'vega_provider_sources_v6';

export const DEFAULT_SOURCES: ProviderSource[] = [
  {
    id: 'zenda-official',
    name: 'Vega Movies & Series (Official Zenda)',
    url: ZENDA_SOURCE_URL,
    enabled: true,
  },
];

// Fallback manifests available instantly offline
const DISALLOWED_PROVIDERS = new Set(['xvideos', 'pornhub', 'rule34video']);

// Fallback manifests available instantly offline (Strictly Official Zenda Providers)
const FALLBACK_MANIFESTS: ProviderManifest[] = [
  {
    display_name: 'MultiStream',
    value: 'autoEmbed',
    version: '3.7',
    icon: 'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/autoEmbed.png',
    type: 'global',
    disabled: false,
    hasSettings: true,
  },
  {
    display_name: 'VMovies',
    value: 'vega',
    version: '2.52',
    icon: 'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/vega.png',
    type: 'global',
    disabled: false,
    hasSettings: true,
  },
  {
    display_name: 'MoviesDrive',
    value: 'drive',
    version: '2.30',
    icon: 'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/drive.png',
    type: 'global',
    disabled: false,
    hasSettings: true,
  },
  {
    display_name: '4K HD Hub',
    value: '4khdhub',
    version: '2.1',
    icon: 'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/4khdhub.png',
    type: 'global',
    disabled: false,
    hasSettings: true,
  },
  {
    display_name: 'KatMovies',
    value: 'katmovies',
    version: '2.4',
    icon: 'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/katmovies.png',
    type: 'global',
    disabled: false,
    hasSettings: true,
  },
  {
    display_name: 'MoviesMod',
    value: 'mod',
    version: '2.0',
    icon: 'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/mod.png',
    type: 'global',
    disabled: false,
    hasSettings: true,
  },
  {
    display_name: 'UHDMovies',
    value: 'uhd',
    version: '2.0',
    icon: 'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/uhd.png',
    type: 'global',
    disabled: false,
    hasSettings: true,
  },
  {
    display_name: 'NetflixMirror',
    value: 'netflixMirror',
    version: '2.0',
    icon: 'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/netflixMirror.png',
    type: 'global',
    disabled: false,
    hasSettings: true,
  },
  {
    display_name: 'PrimeMirror',
    value: 'primeMirror',
    version: '2.0',
    icon: 'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/primeMirror.png',
    type: 'global',
    disabled: false,
    hasSettings: true,
  },
  {
    display_name: 'MultiMovies',
    value: 'multi',
    version: '2.0',
    icon: 'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/multi.png',
    type: 'global',
    disabled: false,
    hasSettings: true,
  },
  {
    display_name: 'World4uFree',
    value: 'world4u',
    version: '2.0',
    icon: 'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/world4u.png',
    type: 'global',
    disabled: false,
    hasSettings: true,
  },
  {
    display_name: 'Cinewood',
    value: '1cinevood',
    version: '2.0',
    icon: 'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/1cinevood.png',
    type: 'global',
    disabled: false,
    hasSettings: true,
  },
];

const loadStoredSources = (): ProviderSource[] => {
  try {
    const raw = localStorage.getItem(SOURCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized = parsed
          .filter(
            (s) =>
              s &&
              s.url &&
              !s.url.includes('Manimanjar') &&
              !s.id?.includes('custom-vega')
          )
          .map((s) => ({
            ...s,
            url: normalizeSourceUrl(s.url),
          }));
        if (sanitized.length > 0) return sanitized;
      }
    }
  } catch (e) {
    console.warn('Failed to load stored sources:', e);
  }
  return DEFAULT_SOURCES;
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
  activeSourceId: 'zenda-official',
  manifests: FALLBACK_MANIFESTS,
  activeProvider: FALLBACK_MANIFESTS[0], // default: MultiStream (autoEmbed)
  isLoading: false,
  error: null,

  loadSources: () => {
    const sources = loadStoredSources();
    set({ sources });
  },

  loadProviders: async (customSourceUrl?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { sources } = get();
      const engine = ProviderEngine.getInstance();

      // If a specific custom source was requested, load it directly
      if (customSourceUrl) {
        const rawManifests = await engine.loadManifest(customSourceUrl);
        const manifests = rawManifests.filter(
          (m) => !DISALLOWED_PROVIDERS.has(m.value.toLowerCase())
        );
        const storedActive = useSettingsStore.getState().activeProviderValue;
        let active = manifests.find(
          (m) => m.value === storedActive && !m.disabled && !DISALLOWED_PROVIDERS.has(m.value.toLowerCase())
        );
        if (!active) {
          active =
            manifests.find((m) => m.value === 'autoEmbed' && !m.disabled) ||
            manifests.find((m) => m.value === 'vega' && !m.disabled) ||
            manifests.find((m) => !m.disabled) ||
            manifests[0] ||
            FALLBACK_MANIFESTS[0];
        }
        set({
          manifests: manifests.length > 0 ? manifests : FALLBACK_MANIFESTS,
          activeProvider: active,
          isLoading: false,
        });
        if (active) {
          useSettingsStore.getState().setActiveProviderValue(active.value);
        }
        return;
      }

      // Simultaneously load all enabled sources and merge without duplicates
      const manifestPromises = sources
        .filter((s) => s.enabled)
        .map(async (s) => {
          try {
            return await engine.loadManifest(s.url);
          } catch {
            return [];
          }
        });

      const allResults = await Promise.all(manifestPromises);
      const combined = allResults.flat();

      // Deduplicate manifests by value and filter disallowed
      const seen = new Set<string>();
      const mergedManifests: ProviderManifest[] = [];
      for (const m of combined) {
        if (!seen.has(m.value) && !DISALLOWED_PROVIDERS.has(m.value.toLowerCase())) {
          seen.add(m.value);
          mergedManifests.push(m);
        }
      }

      const finalManifests = mergedManifests.length > 0 ? mergedManifests : FALLBACK_MANIFESTS;

      // Determine active provider: stored -> autoEmbed -> vega -> first non-disabled
      let storedActive = useSettingsStore.getState().activeProviderValue;
      if (storedActive && DISALLOWED_PROVIDERS.has(storedActive.toLowerCase())) {
        storedActive = 'autoEmbed';
      }

      let active = finalManifests.find(
        (m) => m.value === storedActive && !m.disabled && !DISALLOWED_PROVIDERS.has(m.value.toLowerCase())
      );
      if (!active) {
        active =
          finalManifests.find((m) => m.value === 'autoEmbed' && !m.disabled) ||
          finalManifests.find((m) => m.value === 'vega' && !m.disabled) ||
          finalManifests.find((m) => !m.disabled) ||
          finalManifests[0] ||
          FALLBACK_MANIFESTS[0];
      }

      set({
        manifests: finalManifests,
        activeProvider: active,
        isLoading: false,
      });

      if (active) {
        useSettingsStore.getState().setActiveProviderValue(active.value);
      }
    } catch (err: any) {
      console.warn('Failed to load live manifests, using fallbacks:', err);
      const fallbackActive = FALLBACK_MANIFESTS[0];
      set({
        manifests: FALLBACK_MANIFESTS,
        activeProvider: fallbackActive,
        isLoading: false,
      });
      useSettingsStore.getState().setActiveProviderValue(fallbackActive.value);
    }
  },

  setActiveProvider: (value: string) => {
    if (DISALLOWED_PROVIDERS.has(value.toLowerCase())) {
      value = 'autoEmbed';
    }
    const { manifests } = get();
    let found = manifests.find((m) => m.value === value);
    if (!found) {
      found = FALLBACK_MANIFESTS.find((m) => m.value === value);
    }
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

    await get().loadProviders(cleanUrl);
  },

  removeSource: (id: string) => {
    const updated = get().sources.filter((s) => s.id !== id);
    if (updated.length === 0) return;
    const newActiveId = updated[0].id;
    set({ sources: updated, activeSourceId: newActiveId });
    saveStoredSources(updated);
    get().loadProviders(updated[0].url);
  },

  setActiveSource: async (id: string) => {
    const found = get().sources.find((s) => s.id === id);
    if (found) {
      set({ activeSourceId: id });
      await get().loadProviders(found.url);
    }
  },
}));
