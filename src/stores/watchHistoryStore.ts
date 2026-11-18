import { create } from 'zustand';

export interface WatchProgress {
  id: string; // link or unique stream id
  title: string;
  image: string;
  providerValue: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
  episodeTitle?: string;
  type?: 'movie' | 'series';
}

export interface WatchHistoryState {
  history: Record<string, WatchProgress>; // keyed by content link/id
  
  // Actions
  updateProgress: (data: Omit<WatchProgress, 'updatedAt'>) => void;
  getProgress: (id: string) => WatchProgress | undefined;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  getContinueWatchingList: () => WatchProgress[];
}

const HISTORY_STORAGE_KEY = 'vega_watch_history_v1';

const loadHistory = (): Record<string, WatchProgress> => {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveHistory = (data: Record<string, WatchProgress>) => {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save watch history:', e);
  }
};

export const useWatchHistoryStore = create<WatchHistoryState>((set, get) => ({
  history: loadHistory(),

  updateProgress: (data) => {
    // If watched > 95%, we can either mark finished or keep
    const progress: WatchProgress = {
      ...data,
      updatedAt: Date.now(),
    };

    set((state) => {
      const updated = {
        ...state.history,
        [data.id]: progress,
      };
      saveHistory(updated);
      return { history: updated };
    });
  },

  getProgress: (id: string) => {
    return get().history[id];
  },

  removeFromHistory: (id: string) => {
    set((state) => {
      const updated = { ...state.history };
      delete updated[id];
      saveHistory(updated);
      return { history: updated };
    });
  },

  clearHistory: () => {
    set({ history: {} });
    saveHistory({});
  },

  getContinueWatchingList: () => {
    const items = Object.values(get().history);
    // Filter items that have at least 10 seconds watched and haven't finished (> 95%)
    return items
      .filter((item) => item.currentTime > 5 && item.currentTime < item.duration * 0.95)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
}));
