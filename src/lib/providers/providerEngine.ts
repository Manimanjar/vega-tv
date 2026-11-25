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
export const DEFAULT_SOURCE_URL = ZENDA_SOURCE_URL;

export function normalizeSourceUrl(url: string): string {
  if (!url) return ZENDA_SOURCE_URL;
  const clean = url.trim().replace(/\/+$/, '');
  if (
    clean.includes('raw.githubusercontent.com/Zenda-Cross/vega-providers/main') ||
    clean.includes('Manimanjar')
  ) {
    return ZENDA_SOURCE_URL;
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
      'https://fastly.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/urls.json',
      'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/main/urls.json',
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

        // Provider alias map for Zenda urls.json keys
        const URL_ALIAS_MAP: Record<string, string> = {
          mod: 'Moviesmod',
          moviesmod: 'Moviesmod',
          uhd: 'UhdMovies',
          uhdmovies: 'UhdMovies',
          netflixmirror: 'nfMirror',
          primemirror: 'nfMirror',
          disneymirror: 'nfMirror',
          katmovies: 'kat',
          katmoviehd: 'kat',
          hdhub4u: 'hdhub',
          hdhub: 'hdhub',
          luxmovies: 'lux',
          rogmovies: 'lux',
          dramacool: 'dramacool',
          asianc: 'dramacool',
          movielinkdb: 'movielinkbd',
          movielinkbd: 'movielinkbd',
          extraflix: 'ExtraFlix',
          rareanimes: 'RareAnimes',
          vega: 'Vega',
          vegamovies: 'Vega',
          topmovies: 'Topmovies',
          showbox: 'showbox',
          kisskh: 'kissKh',
          gokuhd: 'gokuHD',
          eonmovies: 'eonMovies',
          movieboxweb: 'movieBoxWeb',
          moviezwap: 'moviezwap',
          '4khdhub': '4khdhub',
          drive: 'drive',
        };

        const aliasKey = URL_ALIAS_MAP[providerValue.toLowerCase()];
        if (aliasKey && this.dynamicUrls[aliasKey]?.url) {
          return this.dynamicUrls[aliasKey].url;
        }

        // Case-insensitive lookup (e.g. Vega vs vega)
        const found = Object.entries(this.dynamicUrls).find(
          ([k]) => k.toLowerCase() === providerValue.toLowerCase()
        );
        if (found && found[1]?.url) {
          return found[1].url;
        }

        // Static fallbacks for popular official Vega providers
        const staticBases: Record<string, string> = {
          autoembed: 'https://vidsrc.cc',
          vega: 'https://vegamovies.latino',
          drive: 'https://new4.moviesdrive.cyou/',
          kat: 'https://new.katmoviehd.top',
          katmovies: 'https://new.katmoviehd.top',
          hdhub: 'https://new16.hdhub4u.cl',
          hdhub4u: 'https://new16.hdhub4u.cl',
          '4khdhub': 'https://4khdhub.one',
          mod: 'https://moviesmod.fi',
          moviesmod: 'https://moviesmod.fi',
          uhd: 'https://uhdmovies.ceo',
          uhdmovies: 'https://uhdmovies.ceo',
          movieboxweb: 'https://officialmoviebox.com',
          gokuhd: 'https://gokuhd.nl',
          netflixmirror: 'https://net77.cc',
          primemirror: 'https://net77.cc',
          dramacool: 'https://asianc.id',
          showbox: 'https://www.showbox.media',
          kisskh: 'https://kisskh.is',
          extraflix: 'https://e14.extraflix.mobi',
          topmovies: 'https://moviesleech.help',
          luxmovies: 'https://rogmovies.beauty',
        };

        return staticBases[providerValue.toLowerCase()] || '';
      },
      openWebView: async (url: string, _options?: any) => {
        try {
          const resp = await smartProxy.fetchWithFailover(url);
          const data = await resp.text();
          return {
            url,
            data,
            cookies: {},
          };
        } catch {
          return {
            url,
            data: '',
            cookies: {},
          };
        }
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

    if (['xvideos', 'pornhub', 'rule34video'].includes(providerValue.toLowerCase())) {
      throw new Error(`Provider "${providerValue}" is not supported`);
    }

    let manifestList = await this.loadManifest(cleanSource);
    let manifest = manifestList.find((m) => m.value === providerValue);

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
        `https://raw.githubusercontent.com/Zenda-Cross/vega-providers/main/dist/${providerValue}/${fileName}`,
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
    const [catalogCode, postsCode, metaCode, episodesCode, streamCode] = await Promise.all([
      fetchDistFile('catalog.js'),
      fetchDistFile('posts.js'),
      fetchDistFile('meta.js'),
      fetchDistFile('episodes.js'),
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

    // Parse episodes module
    let episodesFn: LoadedProvider['episodesFn'];
    if (episodesCode) {
      const mod = this.evaluateCommonJs(episodesCode, `${providerValue}/episodes.js`);
      const rawEpisodes = mod.getEpisodes || mod.episodes || mod.default;
      if (typeof rawEpisodes === 'function') {
        episodesFn = async (url: string, ctx: ProviderContext) => {
          try {
            return await rawEpisodes({
              url,
              providerValue,
              signal: new AbortController().signal,
              providerContext: ctx,
            });
          } catch {
            return await rawEpisodes(url, ctx);
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
      episodesFn,
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
      try {
        const catalog = await loaded.catalogFn(ctx);
        if (Array.isArray(catalog) && catalog.length > 0) return catalog;
      } catch {
        try {
          const catalog2 = await (loaded.catalogFn as any)({
            providerContext: ctx,
            signal: new AbortController().signal,
          });
          if (Array.isArray(catalog2) && catalog2.length > 0) return catalog2;
        } catch {}
      }
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
    const rawPosts = await loaded.postsFn(filter, page, ctx);
    if (!Array.isArray(rawPosts)) return [];

    const baseUrl = await ctx.getBaseUrl();
    return rawPosts.map((p) => {
      let image = p.image || '';
      if (image && !image.startsWith('http') && !image.startsWith('data:') && !image.startsWith('//')) {
        image = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/${image.replace(/^\/+/, '')}` : image;
      }
      return {
        ...p,
        image,
      };
    });
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
    const baseUrl = await ctx.getBaseUrl();

    let rawPosts: Post[] = [];
    if (loaded.searchPostsFn) {
      const posts = await loaded.searchPostsFn(query, page, ctx);
      if (Array.isArray(posts) && posts.length > 0) rawPosts = posts;
    }

    if (rawPosts.length === 0 && loaded.postsFn) {
      const posts = await loaded.postsFn(query, page, ctx);
      if (Array.isArray(posts)) rawPosts = posts;
    }

    return rawPosts.map((p) => {
      let image = p.image || '';
      if (image && !image.startsWith('http') && !image.startsWith('data:') && !image.startsWith('//')) {
        image = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/${image.replace(/^\/+/, '')}` : image;
      }
      return {
        ...p,
        image,
      };
    });
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
    const ctx = this.createContext(providerValue);
    const baseUrl = await ctx.getBaseUrl();

    const targetLink =
      link.startsWith('http') || link.startsWith('{')
        ? link
        : baseUrl
        ? `${baseUrl.replace(/\/+$/, '')}/${link.replace(/^\/+/, '')}`
        : link;

    if (loaded.metaFn) {
      let meta: any = null;
      try {
        meta = await loaded.metaFn(targetLink, ctx);
      } catch (e1) {
        if (targetLink !== link) {
          try {
            meta = await loaded.metaFn(link, ctx);
          } catch {}
        }
      }

      if (meta && meta.title) {
        let image = meta.image || meta.poster || '';
        let poster = meta.poster || meta.image || '';
        if (image && !image.startsWith('http') && !image.startsWith('data:') && !image.startsWith('//')) {
          image = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/${image.replace(/^\/+/, '')}` : image;
        }
        if (poster && !poster.startsWith('http') && !poster.startsWith('data:') && !poster.startsWith('//')) {
          poster = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/${poster.replace(/^\/+/, '')}` : poster;
        }

        let resolvedLinkList = meta.linkList || [];
        if (Array.isArray(resolvedLinkList) && resolvedLinkList.length > 0) {
          resolvedLinkList = await Promise.all(
            resolvedLinkList.map(async (group: any) => {
              if (group.episodesLink && (!group.directLinks || group.directLinks.length === 0)) {
                try {
                  const targetEpUrl = group.episodesLink.startsWith('http')
                    ? group.episodesLink
                    : baseUrl
                    ? `${baseUrl.replace(/\/+$/, '')}/${group.episodesLink.replace(/^\/+/, '')}`
                    : group.episodesLink;

                  if (loaded.episodesFn) {
                    const eps = await loaded.episodesFn(targetEpUrl, ctx);
                    if (Array.isArray(eps) && eps.length > 0) {
                      return {
                        ...group,
                        episodesLink: targetEpUrl,
                        directLinks: eps.map((ep: any) => ({
                          title: ep.title || 'Episode',
                          link: ep.link || '',
                          type: 'series' as const,
                        })),
                      };
                    }
                  } else {
                    const epResp = await ctx.axios.get(targetEpUrl);
                    if (epResp?.data) {
                      const $ = cheerio.load(epResp.data);
                      const container = $('.entry-content, .entry-inner, .post-content, .page-body');
                      const episodes: any[] = [];
                      container.find('h3, h4, h5, p').each((_, element) => {
                        const el = $(element);
                        const text = el.text().trim();
                        if (/episodes?\s*[:\d\-]/i.test(text) || /e\d{1,3}\b/i.test(text) || /^episode\s*\d+/i.test(text)) {
                          const title = text.replace(/\s+/g, ' ').trim().replace(/^[-:\s]+|[-:\s]+$/g, '').replace(/^episodes?\s*:\s*/i, 'Episode ');
                          let nextP = el.next();
                          for (; nextP.length && !nextP.is('p') && !nextP.find('a[href]').length;) {
                            if (nextP.is('h1, h2, h3, h4, h5, h6')) break;
                            nextP = nextP.next();
                          }
                          const vcloud = nextP.find("a[href*='vcloud'], a[href*='hubcloud']").attr('href');
                          const vegadrive = nextP.find("a[href*='vegadrive']").attr('href');
                          const epLink = vcloud && vegadrive
                            ? JSON.stringify({ hubcloud: vcloud, vegadrive })
                            : vcloud || vegadrive || nextP.find("a[href*='fastdl']").attr('href') || nextP.find('a[href]').first().attr('href') || '';
                          if (title && epLink && !episodes.some((e) => e.title === title)) {
                            episodes.push({ title, link: epLink, type: 'series' as const });
                          }
                        }
                      });
                      if (episodes.length > 0) {
                        return {
                          ...group,
                          episodesLink: targetEpUrl,
                          directLinks: episodes,
                        };
                      }
                    }
                  }
                } catch (epErr) {
                  console.warn('[ProviderEngine] Failed to resolve episodes for:', group.title, epErr);
                }
              }
              return group;
            })
          );
        }

        return {
          ...meta,
          image: image || poster,
          poster: poster || image,
          linkList: resolvedLinkList,
        };
      }
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
    const resolvedLink = (link.startsWith('http') || link.startsWith('{'))
      ? link
      : baseUrl
      ? `${baseUrl.replace(/\/+$/, '')}/${link.replace(/^\/+/, '')}`
      : link;

    const normalizeStreams = (list: Stream[]): Stream[] => {
      return list
        .filter((s) => s && s.link)
        .map((s) => {
          let streamLink = s.link;
          if (!streamLink.startsWith('http') && !streamLink.startsWith('blob:') && !streamLink.startsWith('{')) {
            streamLink = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/${streamLink.replace(/^\/+/, '')}` : streamLink;
          }
          const isHls =
            s.type === 'm3u8' ||
            streamLink.includes('.m3u8') ||
            streamLink.includes('m3u8');
          return {
            ...s,
            link: streamLink,
            type: isHls ? 'm3u8' : s.type || 'mp4',
            server: s.server || 'Direct Server',
            quality: s.quality || (isHls ? 'Auto' : '1080'),
          };
        });
    };

    if (loaded.streamFn) {
      const primaryLink = resolvedLink || link;
      try {
        const streams = await loaded.streamFn(primaryLink, type, ctx);
        if (Array.isArray(streams) && streams.length > 0) {
          return normalizeStreams(streams);
        }
      } catch (e1) {
        // Fallback to raw link if primary was resolvedLink
        if (primaryLink !== link) {
          try {
            const streams2 = await loaded.streamFn(link, type, ctx);
            if (Array.isArray(streams2) && streams2.length > 0) {
              return normalizeStreams(streams2);
            }
          } catch {}
        }
      }
    }

    // Direct fallback ONLY if targetLink is genuinely a media stream URL (not a webpage, HTML or JSON)
    const targetLink = resolvedLink.startsWith('http') ? resolvedLink : link;
    const isRealMediaStream =
      typeof targetLink === 'string' &&
      (targetLink.startsWith('http://') || targetLink.startsWith('https://')) &&
      !targetLink.startsWith('{') &&
      !targetLink.endsWith('/') &&
      !targetLink.endsWith('.html') &&
      !targetLink.includes('/download-') &&
      !targetLink.includes('/archives/') &&
      !targetLink.includes('thenaukriadda') &&
      (targetLink.includes('.m3u8') || targetLink.includes('.mp4') || targetLink.endsWith('.mkv') || targetLink.includes('.mkv?'));

    if (isRealMediaStream) {
      return [
        {
          server: 'Direct Media Stream',
          link: targetLink,
          type: targetLink.includes('.m3u8') ? 'm3u8' : targetLink.includes('.mkv') ? 'mkv' : 'mp4',
          quality: 'Original',
        },
      ];
    }

    return [];
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
