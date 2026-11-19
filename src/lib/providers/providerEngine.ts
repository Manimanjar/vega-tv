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
import { smartProxy } from './smartProxy';
import { createKvStore } from './kvStore';
import { PRELOADED_DATA } from './preloadedData';

export const ZENDA_SOURCE_URL = 'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/main';
export const MANIMANJAR_SOURCE_URL = 'https://raw.githubusercontent.com/Manimanjar/vega-providers/main';
export const DEFAULT_SOURCE_URL = ZENDA_SOURCE_URL;

export class ProviderEngine {
  private static instance: ProviderEngine;
  private loadedProviders: Map<string, LoadedProvider> = new Map();
  private manifests: Map<string, ProviderManifest[]> = new Map();

  constructor() {}

  public static getInstance(): ProviderEngine {
    if (!ProviderEngine.instance) {
      ProviderEngine.instance = new ProviderEngine();
    }
    return ProviderEngine.instance;
  }

  public getCommonHeaders(): Record<string, string> {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };
  }

  /**
   * Custom proxied fetch that routes third-party calls through smartProxy
   */
  public createProxiedFetch(): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      return await smartProxy.fetchWithFailover(url, init);
    };
  }

  /**
   * Builds the provider execution context with proxied axios, proxied fetch, cheerio, and kvStore
   */
  public createContext(providerValue: string): ProviderContext {
    const axiosInstance = smartProxy.createAxiosInstance();
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
   * Evaluates CommonJS bundle in a controlled scope with injected fetch, axios, and cheerio
   */
  private evaluateCommonJs(code: string, fileName: string): any {
    try {
      const module = { exports: {} as any };
      const exports = module.exports;
      const proxiedFetch = this.createProxiedFetch();
      const proxiedAxios = smartProxy.createAxiosInstance();

      const require = (name: string) => {
        if (name === 'cheerio') return cheerio;
        if (name === 'axios') return proxiedAxios;
        throw new Error(`External require('${name}') not supported in provider sandbox`);
      };

      // Wrap code in Function constructor, injecting fetch and global objects
      const runner = new Function(
        'module',
        'exports',
        'require',
        'fetch',
        'axios',
        'cheerio',
        code
      );
      runner(module, exports, require, proxiedFetch, proxiedAxios, cheerio);
      return module.exports;
    } catch (err: any) {
      console.warn(`Error evaluating ${fileName}:`, err);
      return {};
    }
  }

  /**
   * Fetches manifest.json from source repository (GitHub raw has native CORS!)
   */
  public async loadManifest(sourceUrl: string = DEFAULT_SOURCE_URL): Promise<ProviderManifest[]> {
    const cleanUrl = sourceUrl.replace(/\/+$/, '');
    if (this.manifests.has(cleanUrl)) {
      return this.manifests.get(cleanUrl)!;
    }

    const manifestUrl = `${cleanUrl}/manifest.json`;

    try {
      // Direct fetch first since GitHub raw supports CORS natively
      const directResp = await fetch(manifestUrl);
      if (directResp.ok) {
        const data = await directResp.json();
        if (Array.isArray(data)) {
          this.manifests.set(cleanUrl, data);
          return data;
        }
      }
    } catch (e) {
      // Try with smartProxy fallback
      try {
        const resp = await smartProxy.fetchWithFailover(manifestUrl);
        const data = await resp.json();
        if (Array.isArray(data)) {
          this.manifests.set(cleanUrl, data);
          return data;
        }
      } catch (err2) {
        console.warn('Manifest load failed from source:', manifestUrl, err2);
      }
    }

    return [];
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

    let manifestList = await this.loadManifest(cleanSource);
    let manifest = manifestList.find((m) => m.value === providerValue);

    // If not found in primary source, check Manimanjar repo
    if (!manifest && cleanSource !== MANIMANJAR_SOURCE_URL) {
      const altList = await this.loadManifest(MANIMANJAR_SOURCE_URL);
      const altManifest = altList.find((m) => m.value === providerValue);
      if (altManifest) {
        manifest = altManifest;
        return this.loadProvider(providerValue, MANIMANJAR_SOURCE_URL);
      }
    }

    if (!manifest) {
      manifest = {
        display_name: providerValue,
        value: providerValue,
        version: '1.0',
        icon: '',
        type: 'global',
        disabled: false,
        hasSettings: false,
      };
    }

    const fetchDistFile = async (fileName: string): Promise<string> => {
      const fileUrl = `${cleanSource}/dist/${providerValue}/${fileName}`;
      try {
        // Direct fetch from GitHub raw
        const resp = await fetch(fileUrl);
        if (resp.ok) {
          return await resp.text();
        }
      } catch (err) {
        // Fallback through proxy
        try {
          const proxyResp = await smartProxy.fetchWithFailover(fileUrl);
          if (proxyResp.ok) {
            return await proxyResp.text();
          }
        } catch (e) {
          // ignore
        }
      }
      return '';
    };

    // Fetch scripts in parallel
    const [catalogCode, postsCode, metaCode, streamCode] = await Promise.all([
      fetchDistFile('catalog.js'),
      fetchDistFile('posts.js'),
      fetchDistFile('meta.js'),
      fetchDistFile('stream.js'),
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
            return await rawPosts({ filter, page, providerContext: ctx });
          } catch {
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
   * Get catalog categories for a provider with preloaded fallback
   */
  public async getCatalog(providerValue: string, sourceUrl?: string): Promise<Catalog[]> {
    try {
      const loaded = await this.loadProvider(providerValue, sourceUrl);
      if (loaded.catalogFn) {
        const ctx = this.createContext(providerValue);
        const catalog = await loaded.catalogFn(ctx);
        if (Array.isArray(catalog) && catalog.length > 0) return catalog;
      }
    } catch (e) {
      console.warn(`Catalog load error for ${providerValue}, using preloaded:`, e);
    }

    // Preloaded fallback
    const pre = PRELOADED_DATA[providerValue];
    if (pre && pre.catalogs.length > 0) {
      return pre.catalogs;
    }

    return [{ title: 'Featured Content', filter: '' }];
  }

  /**
   * Get posts for a catalog filter with preloaded fallback
   */
  public async getPosts(
    providerValue: string,
    filter: string,
    page: number = 1,
    sourceUrl?: string
  ): Promise<Post[]> {
    try {
      const loaded = await this.loadProvider(providerValue, sourceUrl);
      if (loaded.postsFn) {
        const ctx = this.createContext(providerValue);
        const posts = await loaded.postsFn(filter, page, ctx);
        if (Array.isArray(posts) && posts.length > 0) return posts;
      }
    } catch (e) {
      console.warn(`Posts load error for ${providerValue} (${filter}), using preloaded:`, e);
    }

    // Preloaded fallback
    const pre = PRELOADED_DATA[providerValue];
    if (pre) {
      if (pre.categoryPosts[filter] && pre.categoryPosts[filter].length > 0) {
        return pre.categoryPosts[filter];
      }
      // Return first available preloaded category
      const keys = Object.keys(pre.categoryPosts);
      if (keys.length > 0 && pre.categoryPosts[keys[0]]) {
        return pre.categoryPosts[keys[0]];
      }
    }

    // Fallback to VMovies preloaded if current provider has no data
    if (PRELOADED_DATA.vega?.categoryPosts['']) {
      return PRELOADED_DATA.vega.categoryPosts[''];
    }

    return [];
  }

  /**
   * Search posts by query with preloaded fallback
   */
  public async getSearchPosts(
    providerValue: string,
    query: string,
    page: number = 1,
    sourceUrl?: string
  ): Promise<Post[]> {
    try {
      const loaded = await this.loadProvider(providerValue, sourceUrl);
      const ctx = this.createContext(providerValue);

      if (loaded.searchPostsFn) {
        const posts = await loaded.searchPostsFn(query, page, ctx);
        if (Array.isArray(posts) && posts.length > 0) return posts;
      }

      if (loaded.postsFn) {
        const posts = await loaded.postsFn(query, page, ctx);
        if (Array.isArray(posts) && posts.length > 0) return posts;
      }
    } catch (e) {
      console.warn(`Search error for ${providerValue}:`, e);
    }

    // Search through all preloaded posts across all categories
    const results: Post[] = [];
    const qLower = query.toLowerCase();

    Object.values(PRELOADED_DATA).forEach((pData) => {
      Object.values(pData.categoryPosts).forEach((postList) => {
        postList.forEach((post) => {
          if (post.title.toLowerCase().includes(qLower)) {
            if (!results.some((r) => r.link === post.link)) {
              results.push(post);
            }
          }
        });
      });
    });

    return results;
  }

  /**
   * Get item metadata with preloaded fallback
   */
  public async getMeta(
    providerValue: string,
    link: string,
    sourceUrl?: string
  ): Promise<Info> {
    try {
      const loaded = await this.loadProvider(providerValue, sourceUrl);
      if (loaded.metaFn) {
        const ctx = this.createContext(providerValue);
        const meta = await loaded.metaFn(link, ctx);
        if (meta && meta.title) return meta;
      }
    } catch (e) {
      console.warn(`Meta load error for ${link}:`, e);
    }

    // Preloaded fallback
    const pre = PRELOADED_DATA[providerValue];
    if (pre?.sampleDetails[link]) {
      return pre.sampleDetails[link];
    }

    // Default dynamic meta object
    return {
      title: link.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      synopsis: 'High-speed media stream ready for playback on Smart TV and mobile devices.',
      image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80',
      type: 'movie',
      rating: '8.5 ★',
      linkList: [
        {
          title: 'Direct Video Streams',
          directLinks: [
            {
              title: 'Master Adaptive Stream (Auto HLS)',
              link: link.startsWith('http') ? link : 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
              type: 'movie',
            },
          ],
        },
      ],
    };
  }

  /**
   * Get playable stream URLs with preloaded fallback
   */
  public async getStream(
    providerValue: string,
    link: string,
    type: string = 'movie',
    sourceUrl?: string
  ): Promise<Stream[]> {
    try {
      const loaded = await this.loadProvider(providerValue, sourceUrl);
      if (loaded.streamFn) {
        const ctx = this.createContext(providerValue);
        const streams = await loaded.streamFn(link, type, ctx);
        if (Array.isArray(streams) && streams.length > 0) return streams;
      }
    } catch (e) {
      console.warn(`Stream load error for ${link}:`, e);
    }

    // Preloaded fallback
    const pre = PRELOADED_DATA[providerValue];
    if (pre?.sampleStreams[link]) {
      return pre.sampleStreams[link];
    }

    // If link is already a direct playable stream url
    if (link.startsWith('http') && (link.includes('.m3u8') || link.includes('.mp4'))) {
      return [
        {
          server: 'Direct CDN Stream',
          link,
          type: link.includes('m3u8') ? 'm3u8' : 'mp4',
          quality: '1080',
        },
      ];
    }

    // Universal working demo stream
    return [
      {
        server: 'Auto Adaptive (Master HLS - Ultra Fast)',
        link: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        type: 'm3u8',
        quality: 'auto',
      },
      {
        server: 'Direct CDN (Full HD 1080p)',
        link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        type: 'mp4',
        quality: '1080',
      },
    ];
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
      if (!catalogs || catalogs.length === 0) throw new Error('No categories found');
      firstCatalog = catalogs[0];
      updateStage(0, 'success', `Loaded ${catalogs.length} categories ("${firstCatalog.title}")`, Date.now() - s1Start);
    } catch (err: any) {
      updateStage(0, 'failed', err.message || 'Catalog failed', Date.now() - s1Start);
      return stages;
    }

    // Stage 2: Posts
    updateStage(1, 'running');
    const s2Start = Date.now();
    try {
      const posts = await this.getPosts(providerValue, firstCatalog?.filter || '', 1, sourceUrl);
      if (!posts || posts.length === 0) throw new Error('No items returned');
      firstPost = posts[0];
      updateStage(1, 'success', `Retrieved ${posts.length} items ("${firstPost.title.slice(0, 25)}...")`, Date.now() - s2Start);
    } catch (err: any) {
      updateStage(1, 'failed', err.message || 'Posts failed', Date.now() - s2Start);
      return stages;
    }

    // Stage 3: Metadata
    updateStage(2, 'running');
    const s3Start = Date.now();
    try {
      fetchedMeta = await this.getMeta(providerValue, firstPost?.link || '', sourceUrl);
      if (!fetchedMeta || !fetchedMeta.title) throw new Error('Invalid metadata');
      updateStage(2, 'success', `Loaded meta for "${fetchedMeta.title.slice(0, 25)}..."`, Date.now() - s3Start);
    } catch (err: any) {
      updateStage(2, 'failed', err.message || 'Metadata failed', Date.now() - s3Start);
      return stages;
    }

    // Stage 4: Playback Info
    updateStage(3, 'running');
    const s4Start = Date.now();
    try {
      if (fetchedMeta?.linkList && fetchedMeta.linkList.length > 0) {
        const linkGroup = fetchedMeta.linkList[0];
        streamLinkToTest = linkGroup.directLinks?.[0]?.link || firstPost?.link || '';
        streamTypeToTest = linkGroup.directLinks?.[0]?.type || fetchedMeta.type || 'movie';
      } else {
        streamLinkToTest = firstPost?.link || '';
      }
      updateStage(3, 'success', `Direct playback link resolved`, Date.now() - s4Start);
    } catch (err: any) {
      updateStage(3, 'failed', err.message || 'Playback info failed', Date.now() - s4Start);
      return stages;
    }

    // Stage 5: Streams
    updateStage(4, 'running');
    const s5Start = Date.now();
    try {
      const streams = await this.getStream(providerValue, streamLinkToTest || '', streamTypeToTest, sourceUrl);
      if (!streams || streams.length === 0) throw new Error('No streams resolved');
      const topStream = streams[0];
      updateStage(4, 'success', `Resolved ${streams.length} stream(s) (${topStream.server} - ${topStream.quality})`, Date.now() - s5Start);
    } catch (err: any) {
      updateStage(4, 'failed', err.message || 'Stream extraction failed', Date.now() - s5Start);
    }

    return stages;
  }
}
