import axios, { AxiosInstance } from 'axios';

export interface ProxyCandidate {
  name: string;
  urlPattern: string; // e.g. "https://my-proxy.workers.dev/?url=" or "/api/proxy?url="
  active: boolean;
}

export const KNOWN_PROXIES: ProxyCandidate[] = [
  {
    name: 'Vercel / Cloudflare Edge (/api/proxy)',
    urlPattern: '/api/proxy?url=',
    active: true,
  },
  {
    name: 'CORS Proxy Org',
    urlPattern: 'https://corsproxy.org/?',
    active: true,
  },
  {
    name: 'CodeTabs Proxy',
    urlPattern: 'https://api.codetabs.com/v1/proxy?quest=',
    active: true,
  },
  {
    name: 'AllOrigins Win',
    urlPattern: 'https://api.allorigins.win/raw?url=',
    active: true,
  },
];

export class SmartProxyManager {
  private static instance: SmartProxyManager;
  private customProxyUrl: string = '';
  private currentProxyIndex: number = 0;

  private constructor() {}

  public static getInstance(): SmartProxyManager {
    if (!SmartProxyManager.instance) {
      SmartProxyManager.instance = new SmartProxyManager();
    }
    return SmartProxyManager.instance;
  }

  public setCustomProxy(url: string) {
    this.customProxyUrl = url.trim();
  }

  public getCustomProxy(): string {
    return this.customProxyUrl;
  }

  /**
   * Checks if URL can be fetched directly without CORS issues
   */
  public isDirectCorsFriendly(url: string): boolean {
    if (!url) return true;
    if (url.startsWith('data:') || url.startsWith('blob:')) return true;
    if (url.includes('raw.githubusercontent.com')) return true;
    if (url.includes('cdn.jsdelivr.net')) return true;
    if (url.includes('image.tmdb.org')) return true;
    if (url.includes('images.unsplash.com')) return true;
    if (url.includes('test-streams.mux.dev')) return true;
    if (url.includes('googleapis.com')) return true;
    return false;
  }

  /**
   * Formats a target URL with the active proxy
   */
  public formatUrl(targetUrl: string, candidateIndex?: number): string {
    if (this.isDirectCorsFriendly(targetUrl)) {
      return targetUrl;
    }

    // Custom user proxy takes absolute priority
    if (this.customProxyUrl) {
      const clean = this.customProxyUrl.replace(/\/+$/, '');
      if (clean.includes('?url=') || clean.endsWith('=')) {
        return `${clean}${encodeURIComponent(targetUrl)}`;
      }
      return `${clean}/${targetUrl}`;
    }

    // Try relative /api/proxy if running on fullstack host (Vercel / Cloudflare Pages)
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('github.io')) {
      return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
    }

    const idx = candidateIndex !== undefined ? candidateIndex : this.currentProxyIndex;
    const candidate = KNOWN_PROXIES[idx % KNOWN_PROXIES.length];

    if (candidate.urlPattern.includes('?quest=') || candidate.urlPattern.includes('?url=')) {
      return `${candidate.urlPattern}${encodeURIComponent(targetUrl)}`;
    }
    return `${candidate.urlPattern}${targetUrl}`;
  }

  /**
   * Fetch with automatic failover across proxy pool
   */
  public async fetchWithFailover(url: string, init?: RequestInit): Promise<Response> {
    if (this.isDirectCorsFriendly(url)) {
      return await fetch(url, init);
    }

    // If custom proxy set, try it first
    if (this.customProxyUrl) {
      try {
        const proxied = this.formatUrl(url);
        const res = await fetch(proxied, init);
        if (res.ok) return res;
      } catch (e) {
        console.warn('Custom proxy failed, trying fallbacks...', e);
      }
    }

    // Try through candidates
    for (let i = 0; i < KNOWN_PROXIES.length; i++) {
      const proxiedUrl = this.formatUrl(url, i);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(proxiedUrl, {
          ...init,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          this.currentProxyIndex = i; // remember working proxy
          return res;
        }
      } catch (err) {
        // try next
      }
    }

    // Final attempt: try direct fetch
    return await fetch(url, init);
  }

  /**
   * Creates an Axios instance that routes through the proxy manager
   */
  public createAxiosInstance(): AxiosInstance {
    const inst = axios.create({
      timeout: 25000,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    inst.interceptors.request.use((config) => {
      if (config.url) {
        config.url = this.formatUrl(config.url);
      }
      return config;
    });

    return inst;
  }
}

export const smartProxy = SmartProxyManager.getInstance();
