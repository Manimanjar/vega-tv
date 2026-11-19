import axios, { AxiosInstance } from 'axios';

export interface ProxyPingResult {
  ok: boolean;
  latencyMs: number;
  message?: string;
  url: string;
}

const LOCAL_STORAGE_KEY = 'vega_custom_proxy';

export class SmartProxyManager {
  private static instance: SmartProxyManager;
  private customProxyUrl: string = '';
  private isLocalProxyAvailable: boolean = false;
  private isTesting: boolean = false;
  private listeners: Set<(proxyUrl: string, isConnected: boolean) => void> = new Set();

  private constructor() {
    this.initFromStorage();
    this.probeLocalProxy();
  }

  public static getInstance(): SmartProxyManager {
    if (!SmartProxyManager.instance) {
      SmartProxyManager.instance = new SmartProxyManager();
    }
    return SmartProxyManager.instance;
  }

  private initFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored && stored.trim()) {
        this.customProxyUrl = stored.trim();
        return;
      }
      // Check vega_settings_v5, then legacy keys
      for (const key of ['vega_settings_v5', 'vega_settings_v1']) {
        const settingsRaw = localStorage.getItem(key);
        if (settingsRaw) {
          const parsed = JSON.parse(settingsRaw);
          if (parsed.corsProxyUrl && typeof parsed.corsProxyUrl === 'string' && parsed.corsProxyUrl.trim()) {
            this.customProxyUrl = parsed.corsProxyUrl.trim();
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[SmartProxy] Failed to load proxy from storage:', e);
    }
  }

  /**
   * Automatically probes if local Node.js proxy is running on port 8080
   */
  public async probeLocalProxy(): Promise<boolean> {
    if (typeof window === 'undefined' || this.isTesting) return false;
    this.isTesting = true;

    const testPorts = [8080, 3000];
    const hosts = ['localhost', '127.0.0.1'];

    for (const host of hosts) {
      for (const port of testPorts) {
        const testEndpoint = `http://${host}:${port}/`;
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1200);

          const resp = await fetch(testEndpoint, {
            mode: 'cors',
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (resp.ok) {
            const data = await resp.json().catch(() => null);
            if (data && (data.app?.includes('Vega') || data.status === 'online')) {
              this.isLocalProxyAvailable = true;
              if (!this.customProxyUrl) {
                this.setCustomProxy(`http://${host}:${port}/?url=`);
              }
              this.notifyListeners(true);
              this.isTesting = false;
              return true;
            }
          }
        } catch {
          // continue probe
        }
      }
    }

    this.isTesting = false;
    this.notifyListeners(!!this.customProxyUrl);
    return false;
  }

  public subscribe(cb: (proxyUrl: string, isConnected: boolean) => void): () => void {
    this.listeners.add(cb);
    cb(this.customProxyUrl, !!this.customProxyUrl);
    return () => this.listeners.delete(cb);
  }

  private notifyListeners(isConnected: boolean) {
    this.listeners.forEach((cb) => cb(this.customProxyUrl, isConnected));
  }

  public setCustomProxy(url: string) {
    this.customProxyUrl = url.trim();
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, this.customProxyUrl);
      } catch (e) {
        // ignore
      }
    }
    this.notifyListeners(!!this.customProxyUrl);
  }

  public getCustomProxy(): string {
    return this.customProxyUrl;
  }

  public isLocalAvailable(): boolean {
    return this.isLocalProxyAvailable;
  }

  /**
   * URLs that never need a CORS proxy (have native Access-Control-Allow-Origin: *)
   */
  public isDirectCorsFriendly(url: string): boolean {
    if (!url) return true;
    if (url.startsWith('data:') || url.startsWith('blob:')) return true;
    if (url.includes('raw.githubusercontent.com')) return true;
    if (url.includes('cdn.jsdelivr.net')) return true;
    if (url.includes('image.tmdb.org')) return true;
    if (url.includes('images.metahub.space')) return true;
    if (url.includes('imgbb.fit')) return true;
    if (url.includes('images.unsplash.com')) return true;
    if (url.includes('test-streams.mux.dev')) return true;
    return false;
  }

  /**
   * Formats any target URL to route through the active proxy
   */
  public formatUrl(targetUrl: string): string {
    if (!targetUrl || this.isDirectCorsFriendly(targetUrl)) {
      return targetUrl;
    }

    // If already routed through proxy, don't double proxy
    if (targetUrl.includes('?url=') || targetUrl.includes('/api/proxy')) {
      return targetUrl;
    }

    // 1. User configured proxy or detected local proxy
    if (this.customProxyUrl) {
      const clean = this.customProxyUrl.replace(/\/+$/, '');
      if (clean.includes('?url=') || clean.endsWith('=')) {
        return `${clean}${encodeURIComponent(targetUrl)}`;
      }
      return `${clean}/${encodeURIComponent(targetUrl)}`;
    }

    // 2. Fullstack host with /api/proxy (Vercel / Cloudflare Pages)
    if (
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      !window.location.hostname.includes('github.io')
    ) {
      return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
    }

    // 3. Default fallback to local port 8080
    return `http://localhost:8080/?url=${encodeURIComponent(targetUrl)}`;
  }

  /**
   * Test latency and connectivity to a proxy URL
   */
  public async testProxy(proxyUrlToTest: string): Promise<ProxyPingResult> {
    const clean = proxyUrlToTest.trim().replace(/\/+$/, '');
    const testTarget = 'https://raw.githubusercontent.com/Manimanjar/vega-providers/main/manifest.json';
    const finalUrl = clean.includes('?url=') || clean.endsWith('=')
      ? `${clean}${encodeURIComponent(testTarget)}`
      : `${clean}/${encodeURIComponent(testTarget)}`;

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);

      const resp = await fetch(finalUrl, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      const latencyMs = Date.now() - startTime;
      if (resp.ok) {
        return {
          ok: true,
          latencyMs,
          url: clean,
          message: `Connected successfully (${latencyMs}ms)`,
        };
      }
      return {
        ok: false,
        latencyMs,
        url: clean,
        message: `HTTP ${resp.status} ${resp.statusText}`,
      };
    } catch (err: any) {
      return {
        ok: false,
        latencyMs: Date.now() - startTime,
        url: clean,
        message: err.message || 'Connection timed out or refused',
      };
    }
  }

  /**
   * Fetch with automatic failover and timeout
   */
  public async fetchWithFailover(url: string, init?: RequestInit): Promise<Response> {
    if (this.isDirectCorsFriendly(url)) {
      return await fetch(url, init);
    }

    const proxiedUrl = this.formatUrl(url);
    try {
      const res = await fetch(proxiedUrl, init);
      if (res.ok || res.status === 206) return res;
    } catch (err) {
      // Fallback: try direct fetch
      console.warn(`[SmartProxy] Proxy fetch failed for ${url}, trying direct:`, err);
    }

    return await fetch(url, init);
  }

  /**
   * Creates an Axios instance that routes through the proxy and sanitizes browser headers
   */
  public createAxiosInstance(): AxiosInstance {
    const inst = axios.create({
      timeout: 30000,
      headers: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    inst.interceptors.request.use((config) => {
      if (config.url) {
        config.url = this.formatUrl(config.url);
      }
      // In browsers, strip forbidden request headers that trigger XHR errors
      if (typeof window !== 'undefined' && config.headers) {
        delete (config.headers as any)['User-Agent'];
        delete (config.headers as any)['user-agent'];
        delete (config.headers as any)['Referer'];
        delete (config.headers as any)['referer'];
        delete (config.headers as any)['Origin'];
        delete (config.headers as any)['origin'];
        delete (config.headers as any)['Host'];
        delete (config.headers as any)['host'];
      }
      return config;
    });

    return inst;
  }
}

export const smartProxy = SmartProxyManager.getInstance();
