export interface Post {
  title: string;
  link: string;
  image: string;
  tag?: string;
  cornerTag?: string;
}

export interface Info {
  title: string;
  synopsis: string;
  image: string;
  poster: string;
  imdbId?: string;
  type: 'movie' | 'series';
  linkList: Link[];
  rating?: string;
  year?: string;
  tags?: string[];
}

export interface Link {
  title: string;
  quality?: string;
  directLinks?: DirectLink[];
  episodesLink?: string;
}

export interface DirectLink {
  title: string;
  link: string;
  type?: 'movie' | 'series';
}

export interface Stream {
  server: string;
  link: string;
  type: 'm3u8' | 'mp4' | 'mkv' | string;
  quality: string;
  headers?: Record<string, string>;
  subtitles?: any[];
  skip?: any;
}

export interface ProviderManifest {
  display_name: string;
  value: string;
  version: string;
  icon: string;
  type: string;
  disabled: boolean;
  hasSettings: boolean;
}

export interface Catalog {
  title: string;
  filter: string;
}

export interface ProviderSource {
  id: string;
  name: string;
  url: string; // GitHub raw URL base
  enabled?: boolean;
}

export interface ProviderKvStore {
  get: <T = any>(key: string) => Promise<T | undefined>;
  set: <T = any>(key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<boolean>;
  keys: () => Promise<string[]>;
  clear: () => Promise<void>;
}

export interface ProviderContext {
  axios: any;
  cheerio: any;
  commonHeaders: Record<string, string>;
  kvStore: ProviderKvStore;
  getBaseUrl: () => Promise<string>;
  openWebView?: (
    url: string,
    options?: any
  ) => Promise<{ url: string; data: string; cookies: Record<string, string> }>;
}

export interface LoadedProvider {
  manifest: ProviderManifest;
  sourceUrl: string;
  catalogFn?: (context: ProviderContext) => Promise<Catalog[]>;
  postsFn?: (filter: string, page: number, providerContext: ProviderContext) => Promise<Post[]>;
  searchPostsFn?: (query: string, page: number, providerContext: ProviderContext) => Promise<Post[]>;
  metaFn?: (link: string, providerContext: ProviderContext) => Promise<Info>;
  episodesFn?: (url: string, providerContext: ProviderContext) => Promise<DirectLink[]>;
  streamFn?: (link: string, type: string, providerContext: ProviderContext) => Promise<Stream[]>;
}

export type TestStageStatus = 'pending' | 'running' | 'success' | 'failed';

export interface TestStage {
  id: 'catalog' | 'posts' | 'meta' | 'playback' | 'stream';
  name: string;
  status: TestStageStatus;
  message?: string;
  durationMs?: number;
}
