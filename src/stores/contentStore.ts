import { create } from 'zustand';
import { Catalog, Post, Info } from '../lib/providers/types';
import { ProviderEngine } from '../lib/providers/providerEngine';
import { useProviderStore } from './providerStore';
import { useSettingsStore } from './settingsStore';

export interface ContentStoreState {
  catalogs: Catalog[];
  categoryPosts: Record<string, Post[]>;
  categoryPages: Record<string, number>;
  categoryHasMore: Record<string, boolean>;
  heroPosts: Post[];
  currentDetail: Info | null;
  searchResults: Post[];
  searchHistory: string[];
  isLoadingHome: boolean;
  isLoadingMore: boolean;
  isLoadingDetail: boolean;
  isSearching: boolean;
  error: string | null;

  // Actions
  loadHomeContent: () => Promise<void>;
  loadCategoryPosts: (filter: string, page?: number) => Promise<void>;
  search: (query: string, page?: number) => Promise<void>;
  loadDetail: (link: string) => Promise<Info | null>;
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  removeSearchHistoryItem: (query: string) => void;
  clearDetail: () => void;
}

const SEARCH_HISTORY_KEY = 'vega_search_history_v1';

const loadSearchHistory = (): string[] => {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : ['4k', 'trending', 'popular'];
  } catch {
    return [];
  }
};

const saveSearchHistory = (history: string[]) => {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  } catch {
    // ignore
  }
};

export const useContentStore = create<ContentStoreState>((set, get) => ({
  catalogs: [],
  categoryPosts: {},
  categoryPages: {},
  categoryHasMore: {},
  heroPosts: [],
  currentDetail: null,
  searchResults: [],
  searchHistory: loadSearchHistory(),
  isLoadingHome: false,
  isLoadingMore: false,
  isLoadingDetail: false,
  isSearching: false,
  error: null,

  loadHomeContent: async () => {
    const activeProvider = useProviderStore.getState().activeProvider;
    if (!activeProvider) return;

    set({ isLoadingHome: true, error: null });

    try {
      const engine = ProviderEngine.getInstance(() => useSettingsStore.getState().corsProxyUrl);
      const catalogs = await engine.getCatalog(activeProvider.value);
      set({ catalogs });

      // Fetch top categories (up to 4 rows for home screen)
      const topCatalogs = catalogs.slice(0, 4);
      const postsMap: Record<string, Post[]> = {};
      const pagesMap: Record<string, number> = {};
      const hasMoreMap: Record<string, boolean> = {};

      const fetchPromises = topCatalogs.map(async (cat) => {
        try {
          const posts = await engine.getPosts(activeProvider.value, cat.filter, 1);
          postsMap[cat.filter] = posts;
          pagesMap[cat.filter] = 1;
          hasMoreMap[cat.filter] = posts.length >= 10;
        } catch (e) {
          console.warn(`Failed to fetch category ${cat.title}:`, e);
          postsMap[cat.filter] = [];
        }
      });

      await Promise.all(fetchPromises);

      // Hero posts taken from first category
      const firstCatPosts = postsMap[topCatalogs[0]?.filter] || [];
      const heroes = firstCatPosts.slice(0, 5);

      set({
        categoryPosts: postsMap,
        categoryPages: pagesMap,
        categoryHasMore: hasMoreMap,
        heroPosts: heroes,
        isLoadingHome: false,
      });
    } catch (err: any) {
      console.error('Failed to load home content:', err);
      set({
        isLoadingHome: false,
        error: err.message || 'Failed to load content from provider',
      });
    }
  },

  loadCategoryPosts: async (filter: string, page: number = 1) => {
    const activeProvider = useProviderStore.getState().activeProvider;
    if (!activeProvider) return;

    const isFirstPage = page === 1;
    set(isFirstPage ? { isLoadingHome: true } : { isLoadingMore: true });

    try {
      const engine = ProviderEngine.getInstance(() => useSettingsStore.getState().corsProxyUrl);
      const newPosts = await engine.getPosts(activeProvider.value, filter, page);

      set((state) => {
        const existing = isFirstPage ? [] : state.categoryPosts[filter] || [];
        const combined = [...existing, ...newPosts];

        return {
          categoryPosts: { ...state.categoryPosts, [filter]: combined },
          categoryPages: { ...state.categoryPages, [filter]: page },
          categoryHasMore: { ...state.categoryHasMore, [filter]: newPosts.length > 0 },
          isLoadingHome: false,
          isLoadingMore: false,
        };
      });
    } catch (err: any) {
      console.error(`Failed to load category posts for filter "${filter}":`, err);
      set({
        isLoadingHome: false,
        isLoadingMore: false,
        error: err.message || 'Failed to fetch category posts',
      });
    }
  },

  search: async (query: string, page: number = 1) => {
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }

    const activeProvider = useProviderStore.getState().activeProvider;
    if (!activeProvider) return;

    set({ isSearching: true, error: null });

    try {
      const engine = ProviderEngine.getInstance(() => useSettingsStore.getState().corsProxyUrl);
      const results = await engine.getSearchPosts(activeProvider.value, query.trim(), page);

      set({
        searchResults: results,
        isSearching: false,
      });

      get().addSearchHistory(query.trim());
    } catch (err: any) {
      console.error('Search failed:', err);
      set({
        isSearching: false,
        error: err.message || 'Search request failed',
      });
    }
  },

  loadDetail: async (link: string): Promise<Info | null> => {
    const activeProvider = useProviderStore.getState().activeProvider;
    if (!activeProvider) return null;

    set({ isLoadingDetail: true, currentDetail: null, error: null });

    try {
      const engine = ProviderEngine.getInstance(() => useSettingsStore.getState().corsProxyUrl);
      const detail = await engine.getMeta(activeProvider.value, link);

      set({
        currentDetail: detail,
        isLoadingDetail: false,
      });

      return detail;
    } catch (err: any) {
      console.error('Failed to load detail:', err);
      set({
        isLoadingDetail: false,
        error: err.message || 'Failed to load details',
      });
      return null;
    }
  },

  addSearchHistory: (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const current = get().searchHistory.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...current].slice(0, 15);
    set({ searchHistory: updated });
    saveSearchHistory(updated);
  },

  clearSearchHistory: () => {
    set({ searchHistory: [] });
    saveSearchHistory([]);
  },

  removeSearchHistoryItem: (query: string) => {
    const updated = get().searchHistory.filter((item) => item !== query);
    set({ searchHistory: updated });
    saveSearchHistory(updated);
  },

  clearDetail: () => {
    set({ currentDetail: null });
  },
}));
