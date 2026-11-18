import { ProviderKvStore } from './types';

export const createKvStore = (prefix: string): ProviderKvStore => ({
  get: async <T = any>(key: string): Promise<T | undefined> => {
    try {
      const item = localStorage.getItem(`${prefix}_${key}`);
      if (item === null) return undefined;
      return JSON.parse(item) as T;
    } catch {
      return undefined;
    }
  },
  set: async <T = any>(key: string, value: T): Promise<void> => {
    try {
      localStorage.setItem(`${prefix}_${key}`, JSON.stringify(value));
    } catch (err) {
      console.warn(`Failed to set key ${key} in kvStore:`, err);
    }
  },
  delete: async (key: string): Promise<boolean> => {
    try {
      localStorage.removeItem(`${prefix}_${key}`);
      return true;
    } catch {
      return false;
    }
  },
  keys: async (): Promise<string[]> => {
    try {
      const fullPrefix = `${prefix}_`;
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(fullPrefix))
        .map((k) => k.slice(fullPrefix.length));
    } catch {
      return [];
    }
  },
  clear: async (): Promise<void> => {
    try {
      const fullPrefix = `${prefix}_`;
      Object.keys(localStorage)
        .filter((k) => k.startsWith(fullPrefix))
        .forEach((k) => localStorage.removeItem(k));
    } catch (err) {
      console.warn(`Failed to clear kvStore for prefix ${prefix}:`, err);
    }
  },
});
