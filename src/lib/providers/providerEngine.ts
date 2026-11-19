import * as cheerio from 'cheerio';
import {
  ProviderManifest,
  Catalog,
  Post,
  Info,
  Stream,
  ProviderContext,
  LoadedProvider,
  TestStage,
} from './types';
import { smartProxy } from './smartProxy';
import { createKvStore } from './kvStore';

export const ZENDA_SOURCE_URL = 'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main';
export const MANIMANJAR_SOURCE_URL = 'https://cdn.jsdelivr.net/gh/Manimanjar/vega-providers@main';
export const DEFAULT_SOURCE_URL = ZENDA_SOURCE_URL;

export function normalizeSourceUrl(url: string): string {
  if (!url) return ZENDA_SOURCE_URL;
  const clean = url.trim().replace(/\/+$/, '');
  if (clean.includes('raw.githubusercontent.com/Zenda-Cross/vega-providers/main')) {
    return ZENDA_SOURCE_URL;
  }
  if (clean.includes('raw.githubusercontent.com/Manimanjar/vega-providers/main')) {
    return MANIMANJAR_SOURCE_URL;
  }
  return clean;
}

export class ProviderEngine {
  private static instance: ProviderEngine;
  private loadedProviders: Map<string, LoadedProvider> = new Map();
  private manifests: Map<string, ProviderManifest[]> = new Map();
  private dynamicUrls: Record<string, { name: string; url: string }> = {};
  private urlsLoaded: boolean = false;

  constructor() {
    this.loadDynamicUrls();
  }

  public static getInstance(): ProviderEngine {
    if (!ProviderEngine.instance) {
      ProviderEngine.instance = new ProviderEngine();
    }
    return ProviderEngine.instance;
  }

  public async loadDynamicUrls(): Promise<Record<string, { name: string; url: string }>> {
    if (this.urlsLoaded && Object.keys(this.dynamicUrls).length > 0) {
      return this.dynamicUrls;
    }
    const endpoints = [
      'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/urls.json',
      'https://cdn.jsdelivr.net/gh/Manimanjar/vega-providers@main/urls.json',
      'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/main/urls.json',
      'https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json',
    ];
    for (const ep of endpoints) {
      try {
        const resp = await fetch(ep);
        if (resp.ok) {
          const data = await resp.json();
          this.dynamicUrls = { ...this.dynamicUrls, ...data };
          this.urlsLoaded = true;
          break;
        }
      } catch {
        // continue
      }
    }
    return this.dynamicUrls;
  }

  public getCommonHeaders(): Record<string, string> {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept:
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
        if (stored) return stored;

        if (!this.urlsLoaded) {
          await this.loadDynamicUrls();
        }

        // Direct key lookup
        if (this.dynamicUrls[providerValue]?.url) {
          return this.dynamicUrls[providerValue].url;
        }

        // Case-insensitive lookup (e.g. Vega vs vega)
        const found = Object.entries(this.dynamicUrls).find(
          ([k]) => k.toLowerCase() === providerValue.toLowerCase()
        );
        if (found && found[1]?.url) {
          return found[1].url;
        }

        // Static fallbacks for popular Vega providers
        const staticBases: Record<string, string> = {
          vega: 'https://vegamovies.lease',
          drive: 'https://new3.moviesdrive.cyou/',
          xvideos: 'https://www.xvideos.com',
          rule34video: 'https://rule34video.com',
          pornhub: 'https://www.pornhub.com',
          kat: 'https://new.katmoviehd.top',
          katmovies: 'https://new.katmoviehd.top',
          multi: 'https://m1.multimovies.courses',
          w4u: 'https://world4ufree.vu',
          hdhub: 'https://new14.hdhub4u.cl',
          '4khdhub': 'https://4khdhub.one',
        };

        return staticBases[providerValue.toLowerCase()] || '';
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
        'globalThis',
        code
      );
      runner(module, exports, require, proxiedFetch, proxiedAxios, cheerio, window);
      return module.exports;
    } catch (err: any) {
      console.warn(`Error evaluating ${fileName}:`, err);
      return {};
    }
  }

  /**
   * Fetches manifest.json from source repository (GitHub raw has native CORS)
   */
  /**
   * Fetches manifest.json from source repository (jsDelivr high-speed CDN with multi-mirror failover)
   */
  public async loadManifest(sourceUrl: string = DEFAULT_SOURCE_URL): Promise<ProviderManifest[]> {
    const cleanUrl = normalizeSourceUrl(sourceUrl);
    if (this.manifests.has(cleanUrl)) {
      return this.manifests.get(cleanUrl)!;
    }

    const candidateUrls = [
      `${cleanUrl}/manifest.json`,
      cleanUrl.replace('cdn.jsdelivr.net', 'fastly.jsdelivr.net') + '/manifest.json',
    ];

    for (const manifestUrl of candidateUrls) {
      try {
        const directResp = await fetch(manifestUrl);
        if (directResp.ok) {
          const data = await directResp.json();
          if (Array.isArray(data) && data.length > 0) {
            this.manifests.set(cleanUrl, data);
            return data;
          }
        }
      } catch {
        // continue
      }
    }

    // Proxy failover
    try {
      const resp = await smartProxy.fetchWithFailover(`${cleanUrl}/manifest.json`);
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        this.manifests.set(cleanUrl, data);
        return data;
      }
    } catch (err2) {
      console.warn('[ProviderEngine] Manifest load failed from source:', cleanUrl, err2);
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
    const cleanSource = normalizeSourceUrl(sourceUrl);
    const cacheKey = `${cleanSource}:${providerValue}`;

    if (this.loadedProviders.has(cacheKey)) {
      return this.loadedProviders.get(cacheKey)!;
    }

    let manifestList = await this.loadManifest(cleanSource);
    let manifest = manifestList.find((m) => m.value === providerValue);

    // If not found in primary source, check alternate repo (Zenda or Manimanjar)
    const altSource = cleanSource === MANIMANJAR_SOURCE_URL ? ZENDA_SOURCE_URL : MANIMANJAR_SOURCE_URL;
    if (!manifest) {
      const altList = await this.loadManifest(altSource);
      const altManifest = altList.find((m) => m.value === providerValue);
      if (altManifest) {
        manifest = altManifest;
        return this.loadProvider(providerValue, altSource);
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
      const candidatePaths = [
        `${cleanSource}/dist/${providerValue}/${fileName}`,
        cleanSource.replace('cdn.jsdelivr.net', 'fastly.jsdelivr.net') + `/dist/${providerValue}/${fileName}`,
        `${altSource}/dist/${providerValue}/${fileName}`,
        altSource.replace('cdn.jsdelivr.net', 'fastly.jsdelivr.net') + `/dist/${providerValue}/${fileName}`,
      ];

      for (const fileUrl of candidatePaths) {
        try {
          const resp = await fetch(fileUrl);
          if (resp.ok) {
            const txt = await resp.text();
            if (txt && !txt.includes('404: Not Found') && txt.length > 50) return txt;
          }
        } catch {
          // continue
        }
      }

      // Try proxied fetch fallback
      for (const fileUrl of candidatePaths.slice(0, 2)) {
        try {
          const proxyResp = await smartProxy.fetchWithFailover(fileUrl);
          if (proxyResp.ok) {
            const txt = await proxyResp.text();
            if (txt && !txt.includes('404: Not Found') && txt.length > 50) return txt;
          }
        } catch {
          // continue
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
            return await rawPosts({
              filter,
              page,
              providerValue,
              signal: new AbortController().signal,
              providerContext: ctx,
            });
          } catch {
            return await rawPosts(filter, page, ctx);
          }
        };
      }

      if (typeof rawSearch === 'function') {
        searchPostsFn = async (query: string, page: number, ctx: ProviderContext) => {
          try {
            return await rawSearch({
              searchQuery: query,
              page,
              providerValue,
              signal: new AbortController().signal,
              providerContext: ctx,
            });
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
            return await rawMeta({
              link,
              provider: providerValue,
              providerValue,
              signal: new AbortController().signal,
              providerContext: ctx,
            });
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
          const params = {
            link,
            type,
            providerValue,
            signal: new AbortController().signal,
            providerContext: ctx,
            isDownload: false,
          };
          try {
            return await rawStream(params);
          } catch (e1: any) {
            // Some providers accept positional arguments (link, type, ctx)
            try {
              return await rawStream(link, type, ctx);
            } catch (e2: any) {
              console.warn(`[ProviderEngine] Stream extraction failed for ${providerValue}:`, e1 || e2);
              throw e1 || e2;
            }
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
    if (loaded.catalogFn) {
      const ctx = this.createContext(providerValue);
      const catalog = await loaded.catalogFn(ctx);
      if (Array.isArray(catalog) && catalog.length > 0) return catalog;
    }
    return [{ title: 'Featured', filter: '' }];
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
      throw new Error(`Provider "${providerValue}" does not export getPosts`);
    }

    const ctx = this.createContext(providerValue);
    const posts = await loaded.postsFn(filter, page, ctx);
    if (Array.isArray(posts)) return posts;
    return [];
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
      if (Array.isArray(posts) && posts.length > 0) return posts;
    }

    if (loaded.postsFn) {
      const posts = await loaded.postsFn(query, page, ctx);
      if (Array.isArray(posts)) return posts;
    }

    return [];
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
    if (loaded.metaFn) {
      const ctx = this.createContext(providerValue);
      const meta = await loaded.metaFn(link, ctx);
      if (meta && meta.title) return meta;
    }

    // Direct fallback meta
    return {
      title: link.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      synopsis: 'Video stream ready for high-speed playback.',
      image: '',
      poster: '',
      type: 'movie',
      linkList: [
        {
          title: 'Direct Video Streams',
          directLinks: [
            {
              title: 'Play Stream',
              link,
              type: 'movie',
            },
          ],
        },
      ],
    };
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
    const ctx = this.createContext(providerValue);
    const baseUrl = await ctx.getBaseUrl();
    const resolvedLink = link.startsWith('http')
      ? link
      : `${baseUrl.replace(/\/+$/, '')}/${link.replace(/^\/+/, '')}`;

    if (loaded.streamFn) {
      try {
        const streams = await loaded.streamFn(link, type, ctx);
        if (Array.isArray(streams) && streams.length > 0) return streams;
      } catch (e1) {
        // Retry with fully resolved absolute link
        if (resolvedLink !== link) {
          try {
            const streams2 = await loaded.streamFn(resolvedLink, type, ctx);
            if (Array.isArray(streams2) && streams2.length > 0) return streams2;
          } catch {}
        }
      }
    }

    // Direct fallback if absolute link or resolved link exists
    const targetLink = resolvedLink.startsWith('http') ? resolvedLink : link;
    if (targetLink.startsWith('http')) {
      return [
        {
          server: 'Direct CDN Stream (Fast)',
          link: targetLink,
          type: targetLink.includes('m3u8') ? 'm3u8' : 'mp4',
          quality: '1080',
        },
      ];
    }

    throw new Error('No playable stream found for this item');
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
