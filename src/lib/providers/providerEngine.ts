import * as cheerio from 'cheerio';
import {
  ProviderManifest,
  Catalog,
  Post,
  Info,
  Stream,
  ProviderContext,
  LoadedProvider,
  TestStage
} from './types';
import { createProxiedAxios } from './corsProxy';
import { createKvStore } from './kvStore';

export const DEFAULT_SOURCE_URL = 'https://raw.githubusercontent.com/Manimanjar/vega-providers/main';

export class ProviderEngine {
  private static instance: ProviderEngine;
  private loadedProviders: Map<string, LoadedProvider> = new Map();
  private manifests: Map<string, ProviderManifest[]> = new Map();
  private getProxyUrl: () => string;

  constructor(getProxyUrl: () => string = () => '') {
    this.getProxyUrl = getProxyUrl;
  }

  public static getInstance(getProxyUrl?: () => string): ProviderEngine {
    if (!ProviderEngine.instance) {
      ProviderEngine.instance = new ProviderEngine(getProxyUrl);
    } else if (getProxyUrl) {
      ProviderEngine.instance.setProxyGetter(getProxyUrl);
    }
    return ProviderEngine.instance;
  }

  public setProxyGetter(fn: () => string) {
    this.getProxyUrl = fn;
  }

  /**
   * Common headers provided to providers
   */
  public getCommonHeaders(): Record<string, string> {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
    };
  }

  /**
   * Builds the provider execution context with proxied axios, cheerio, and kvStore
   */
  public createContext(providerValue: string): ProviderContext {
    const axiosInstance = createProxiedAxios(this.getProxyUrl);
    const kvStore = createKvStore(`vega_provider_${providerValue}`);

    return {
      axios: axiosInstance,
      cheerio,
      commonHeaders: this.getCommonHeaders(),
      kvStore,
      getBaseUrl: async () => {
        const stored = await kvStore.get<string>('baseUrl');
        return stored || '';
      },
    };
  }

  /**
   * Evaluates CommonJS bundle in a controlled scope
   */
  private evaluateCommonJs(code: string, fileName: string): any {
    try {
      const module = { exports: {} as any };
      const exports = module.exports;
      const require = (name: string) => {
        if (name === 'cheerio') return cheerio;
        if (name === 'axios') return createProxiedAxios(this.getProxyUrl);
        throw new Error(`External require('${name}') not supported in provider sandbox`);
      };

      // Wrap code in Function constructor
      const runner = new Function('module', 'exports', 'require', code);
      runner(module, exports, require);
      return module.exports;
    } catch (err: any) {
      console.error(`Error evaluating ${fileName}:`, err);
      throw new Error(`Failed to evaluate ${fileName}: ${err.message || String(err)}`);
    }
  }

  /**
   * Fetches manifest.json from source repository
   */
  public async loadManifest(sourceUrl: string = DEFAULT_SOURCE_URL): Promise<ProviderManifest[]> {
    const cleanUrl = sourceUrl.replace(/\/+$/, '');
    if (this.manifests.has(cleanUrl)) {
      return this.manifests.get(cleanUrl)!;
    }

    const manifestUrl = `${cleanUrl}/manifest.json`;
    const proxiedAxios = createProxiedAxios(this.getProxyUrl);

    try {
      const resp = await proxiedAxios.get(manifestUrl, { responseType: 'json' });
      const data = Array.isArray(resp.data) ? resp.data : [];
      this.manifests.set(cleanUrl, data);
      return data;
    } catch (err: any) {
      // Try direct fetch if proxied failed
      try {
        const directResp = await fetch(manifestUrl);
        const data = await directResp.json();
        if (Array.isArray(data)) {
          this.manifests.set(cleanUrl, data);
          return data;
        }
      } catch (e) {
        // Fallback
      }
      throw new Error(`Failed to load provider manifest from ${manifestUrl}: ${err.message || String(err)}`);
    }
  }

  /**
   * Loads and instantiates a specific provider from dist/<providerValue>/*.js
   */
  public async loadProvider(
    providerValue: string,
    sourceUrl: string = DEFAULT_SOURCE_URL
  ): Promise<LoadedProvider> {
    const cleanSource = sourceUrl.replace(/\/+$/, '');
    const cacheKey = `${cleanSource}:${providerValue}`;

    if (this.loadedProviders.has(cacheKey)) {
      return this.loadedProviders.get(cacheKey)!;
    }

    const manifestList = await this.loadManifest(cleanSource);
    const manifest = manifestList.find((m) => m.value === providerValue);
    if (!manifest) {
      throw new Error(`Provider "${providerValue}" not found in manifest at ${cleanSource}`);
    }

    const proxiedAxios = createProxiedAxios(this.getProxyUrl);
    const fetchDistFile = async (fileName: string): Promise<string> => {
      const fileUrl = `${cleanSource}/dist/${providerValue}/${fileName}`;
      try {
        const resp = await proxiedAxios.get(fileUrl, { responseType: 'text' });
        return typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
      } catch (err) {
        // Try direct fetch
        const resp = await fetch(fileUrl);
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status} fetching ${fileUrl}`);
        }
        return await resp.text();
      }
    };

    // Fetch catalog, posts, meta, stream scripts in parallel
    const [catalogCode, postsCode, metaCode, streamCode] = await Promise.all([
      fetchDistFile('catalog.js').catch((e) => {
        console.warn(`Catalog not loaded for ${providerValue}:`, e);
        return '';
      }),
      fetchDistFile('posts.js').catch((e) => {
        console.warn(`Posts not loaded for ${providerValue}:`, e);
        return '';
      }),
      fetchDistFile('meta.js').catch((e) => {
        console.warn(`Meta not loaded for ${providerValue}:`, e);
        return '';
      }),
      fetchDistFile('stream.js').catch((e) => {
        console.warn(`Stream not loaded for ${providerValue}:`, e);
        return '';
      }),
    ]);

    // Parse catalog module
    let catalogFn: LoadedProvider['catalogFn'];
    if (catalogCode) {
      const mod = this.evaluateCommonJs(catalogCode, `${providerValue}/catalog.js`);
      if (typeof mod.getCatalog === 'function') {
        catalogFn = mod.getCatalog;
      } else if (typeof mod.catalog === 'function') {
        catalogFn = mod.catalog;
      } else if (Array.isArray(mod.catalog)) {
        catalogFn = async () => mod.catalog;
      } else if (Array.isArray(mod.default)) {
        catalogFn = async () => mod.default;
      } else if (typeof mod.default === 'function') {
        catalogFn = mod.default;
      } else if (Array.isArray(mod)) {
        catalogFn = async () => mod;
      }
    }

    // Parse posts module
    let postsFn: LoadedProvider['postsFn'];
    let searchPostsFn: LoadedProvider['searchPostsFn'];
    if (postsCode) {
      const mod = this.evaluateCommonJs(postsCode, `${providerValue}/posts.js`);
      const rawPosts = mod.getPosts || mod.posts || mod.default;
      const rawSearch = mod.getSearchPosts || mod.searchPosts || mod.search;

      if (typeof rawPosts === 'function') {
        postsFn = async (filter: string, page: number, ctx: ProviderContext) => {
          try {
            // First try object params (Vega standard)
            return await rawPosts({ filter, page, providerContext: ctx });
          } catch {
            // Fallback to positional params
            return await rawPosts(filter, page, ctx);
          }
        };
      }

      if (typeof rawSearch === 'function') {
        searchPostsFn = async (query: string, page: number, ctx: ProviderContext) => {
          try {
            return await rawSearch({ searchQuery: query, page, providerContext: ctx });
          } catch {
            return await rawSearch(query, page, ctx);
          }
        };
      }
    }

    // Parse meta module
    let metaFn: LoadedProvider['metaFn'];
    if (metaCode) {
      const mod = this.evaluateCommonJs(metaCode, `${providerValue}/meta.js`);
      const rawMeta = mod.getMeta || mod.meta || mod.default;
      if (typeof rawMeta === 'function') {
        metaFn = async (link: string, ctx: ProviderContext) => {
          try {
            return await rawMeta({ link, providerContext: ctx });
          } catch {
            return await rawMeta(link, ctx);
          }
        };
      }
    }

    // Parse stream module
    let streamFn: LoadedProvider['streamFn'];
    if (streamCode) {
      const mod = this.evaluateCommonJs(streamCode, `${providerValue}/stream.js`);
      const rawStream = mod.getStream || mod.stream || mod.default;
      if (typeof rawStream === 'function') {
        streamFn = async (link: string, type: string, ctx: ProviderContext) => {
          try {
            return await rawStream({ link, type, providerContext: ctx, isDownload: false });
          } catch {
            return await rawStream(link, type, ctx);
          }
        };
      }
    }

    const loaded: LoadedProvider = {
      manifest,
      sourceUrl: cleanSource,
      catalogFn,
      postsFn,
      searchPostsFn,
      metaFn,
      streamFn,
    };

    this.loadedProviders.set(cacheKey, loaded);
    return loaded;
  }

  /**
   * Get catalog categories for a provider
   */
  public async getCatalog(providerValue: string, sourceUrl?: string): Promise<Catalog[]> {
    const loaded = await this.loadProvider(providerValue, sourceUrl);
    if (!loaded.catalogFn) {
      return [{ title: 'Featured', filter: '' }];
    }
    const ctx = this.createContext(providerValue);
    const catalog = await loaded.catalogFn(ctx);
    return Array.isArray(catalog) ? catalog : [];
  }

  /**
   * Get posts for a catalog filter
   */
  public async getPosts(
    providerValue: string,
    filter: string,
    page: number = 1,
    sourceUrl?: string
  ): Promise<Post[]> {
    const loaded = await this.loadProvider(providerValue, sourceUrl);
    if (!loaded.postsFn) {
      throw new Error(`Provider ${providerValue} has no getPosts implementation`);
    }
    const ctx = this.createContext(providerValue);
    const posts = await loaded.postsFn(filter, page, ctx);
    return Array.isArray(posts) ? posts : [];
  }

  /**
   * Search posts by query
   */
  public async getSearchPosts(
    providerValue: string,
    query: string,
    page: number = 1,
    sourceUrl?: string
  ): Promise<Post[]> {
    const loaded = await this.loadProvider(providerValue, sourceUrl);
    const ctx = this.createContext(providerValue);

    if (loaded.searchPostsFn) {
      const posts = await loaded.searchPostsFn(query, page, ctx);
      return Array.isArray(posts) ? posts : [];
    }

    if (loaded.postsFn) {
      const posts = await loaded.postsFn(query, page, ctx);
      return Array.isArray(posts) ? posts : [];
    }

    throw new Error(`Provider ${providerValue} does not support search`);
  }

  /**
   * Get item metadata
   */
  public async getMeta(
    providerValue: string,
    link: string,
    sourceUrl?: string
  ): Promise<Info> {
    const loaded = await this.loadProvider(providerValue, sourceUrl);
    if (!loaded.metaFn) {
      throw new Error(`Provider ${providerValue} has no getMeta implementation`);
    }
    const ctx = this.createContext(providerValue);
    return await loaded.metaFn(link, ctx);
  }

  /**
   * Get playable stream URLs
   */
  public async getStream(
    providerValue: string,
    link: string,
    type: string = 'movie',
    sourceUrl?: string
  ): Promise<Stream[]> {
    const loaded = await this.loadProvider(providerValue, sourceUrl);
    if (!loaded.streamFn) {
      throw new Error(`Provider ${providerValue} has no getStream implementation`);
    }
    const ctx = this.createContext(providerValue);
    const streams = await loaded.streamFn(link, type, ctx);
    return Array.isArray(streams) ? streams : [];
  }

  /**
   * Run 5-stage verification test on provider
   */
  public async testProvider(
    providerValue: string,
    sourceUrl: string = DEFAULT_SOURCE_URL,
    onStageUpdate?: (stage: TestStage) => void
  ): Promise<TestStage[]> {
    const stages: TestStage[] = [
      { id: 'catalog', name: 'Catalog', status: 'pending' },
      { id: 'posts', name: 'Show List', status: 'pending' },
      { id: 'meta', name: 'Metadata', status: 'pending' },
      { id: 'playback', name: 'Playback Info', status: 'pending' },
      { id: 'stream', name: 'Streams', status: 'pending' },
    ];

    const updateStage = (
      index: number,
      status: TestStage['status'],
      message?: string,
      durationMs?: number
    ) => {
      stages[index].status = status;
      if (message) stages[index].message = message;
      if (durationMs !== undefined) stages[index].durationMs = durationMs;
      if (onStageUpdate) onStageUpdate({ ...stages[index] });
    };

    let firstCatalog: Catalog | null = null;
    let firstPost: Post | null = null;
    let fetchedMeta: Info | null = null;
    let streamLinkToTest: string | null = null;
    let streamTypeToTest: string = 'movie';

    // Stage 1: Catalog
    updateStage(0, 'running');
    const s1Start = Date.now();
    try {
      const catalogs = await this.getCatalog(providerValue, sourceUrl);
      if (!catalogs || catalogs.length === 0) {
        throw new Error('No catalog categories found');
      }
      firstCatalog = catalogs[0];
      updateStage(0, 'success', `Found ${catalogs.length} categories (e.g. "${firstCatalog.title}")`, Date.now() - s1Start);
    } catch (err: any) {
      updateStage(0, 'failed', err.message || 'Catalog loading failed', Date.now() - s1Start);
      return stages;
    }

    // Stage 2: Posts (Show List)
    updateStage(1, 'running');
    const s2Start = Date.now();
    try {
      const posts = await this.getPosts(providerValue, firstCatalog?.filter || '', 1, sourceUrl);
      if (!posts || posts.length === 0) {
        throw new Error('No items returned in show list');
      }
      firstPost = posts[0];
      updateStage(1, 'success', `Retrieved ${posts.length} items (top: "${firstPost.title.slice(0, 30)}")`, Date.now() - s2Start);
    } catch (err: any) {
      updateStage(1, 'failed', err.message || 'Posts fetch failed', Date.now() - s2Start);
      return stages;
    }

    // Stage 3: Metadata
    updateStage(2, 'running');
    const s3Start = Date.now();
    try {
      if (!firstPost?.link) throw new Error('No valid post link to test');
      fetchedMeta = await this.getMeta(providerValue, firstPost.link, sourceUrl);
      if (!fetchedMeta || !fetchedMeta.title) {
        throw new Error('Invalid metadata returned (missing title)');
      }
      updateStage(2, 'success', `Loaded meta for "${fetchedMeta.title.slice(0, 30)}"`, Date.now() - s3Start);
    } catch (err: any) {
      updateStage(2, 'failed', err.message || 'Metadata loading failed', Date.now() - s3Start);
      return stages;
    }

    // Stage 4: Playback Info
    updateStage(3, 'running');
    const s4Start = Date.now();
    try {
      if (!fetchedMeta?.linkList || fetchedMeta.linkList.length === 0) {
        // Some providers directly use post link
        streamLinkToTest = firstPost.link;
        streamTypeToTest = fetchedMeta?.type || 'movie';
        updateStage(3, 'success', `Direct playback link resolved`, Date.now() - s4Start);
      } else {
        const firstLinkGroup = fetchedMeta.linkList[0];
        if (firstLinkGroup.directLinks && firstLinkGroup.directLinks.length > 0) {
          streamLinkToTest = firstLinkGroup.directLinks[0].link;
          streamTypeToTest = firstLinkGroup.directLinks[0].type || fetchedMeta.type || 'movie';
        } else {
          streamLinkToTest = (firstLinkGroup as any).link || firstPost.link;
        }
        updateStage(3, 'success', `Found ${fetchedMeta.linkList.length} link group(s)`, Date.now() - s4Start);
      }
    } catch (err: any) {
      updateStage(3, 'failed', err.message || 'Playback resolution failed', Date.now() - s4Start);
      return stages;
    }

    // Stage 5: Streams
    updateStage(4, 'running');
    const s5Start = Date.now();
    try {
      if (!streamLinkToTest) throw new Error('No stream link available');
      const streams = await this.getStream(providerValue, streamLinkToTest, streamTypeToTest, sourceUrl);
      if (!streams || streams.length === 0) {
        throw new Error('No streams resolved from provider');
      }
      const topStream = streams[0];
      updateStage(4, 'success', `Resolved ${streams.length} stream(s) (${topStream.server || 'Direct'} - ${topStream.quality || 'Auto'})`, Date.now() - s5Start);
    } catch (err: any) {
      updateStage(4, 'failed', err.message || 'Stream extraction failed', Date.now() - s5Start);
    }

    return stages;
  }
}
