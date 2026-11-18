import { create } from 'zustand';

export interface WatchlistItem {
  link: string;
  title: string;
  image: string;
  providerValue: string;
  type?: 'movie' | 'series';
  tag?: string;
  addedAt: number;
}

export interface WatchlistState {
  items: WatchlistItem[];
  
  // Actions
  addItem: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  removeItem: (link: string) => void;
  isInWatchlist: (link: string) => boolean;
  toggleItem: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  clearWatchlist: () => void;
}

const WATCHLIST_STORAGE_KEY = 'vega_watchlist_v1';

const loadWatchlist = (): WatchlistItem[] => {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveWatchlist = (items: WatchlistItem[]) => {
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to save watchlist:', e);
  }
};

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: loadWatchlist(),

  addItem: (item) => {
    if (get().isInWatchlist(item.link)) return;
    const newItem: WatchlistItem = {
      ...item,
      addedAt: Date.now(),
    };
    const updated = [newItem, ...get().items];
    set({ items: updated });
    saveWatchlist(updated);
  },

  removeItem: (link: string) => {
    const updated = get().items.filter((i) => i.link !== link);
    set({ items: updated });
    saveWatchlist(updated);
  },

  isInWatchlist: (link: string) => {
    return get().items.some((i) => i.link === link);
  },

  toggleItem: (item) => {
    if (get().isInWatchlist(item.link)) {
      get().removeItem(item.link);
    } else {
      get().addItem(item);
    }
  },

  clearWatchlist: () => {
    set({ items: [] });
    saveWatchlist([]);
  },
}));
