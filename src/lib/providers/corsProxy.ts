import axios, { AxiosInstance } from 'axios';

/**
 * Normalizes proxy URL and target URL concatenation.
 * Handles both prefix-style proxies (e.g., "https://proxy.workers.dev/")
 * and query-parameter style proxies (e.g., "https://api.allorigins.win/raw?url=").
 */
export function formatProxiedUrl(targetUrl: string, proxyUrl?: string): string {
  if (!proxyUrl || !proxyUrl.trim()) {
    return targetUrl;
  }

  const cleanProxy = proxyUrl.trim();
  // If targetUrl already starts with proxyUrl, avoid double wrapping
  if (targetUrl.startsWith(cleanProxy)) {
    return targetUrl;
  }

  // Handle data URIs or blob URIs directly
  if (targetUrl.startsWith('data:') || targetUrl.startsWith('blob:')) {
    return targetUrl;
  }

  if (cleanProxy.includes('?url=') || cleanProxy.endsWith('=')) {
    return `${cleanProxy}${encodeURIComponent(targetUrl)}`;
  }

  const separator = cleanProxy.endsWith('/') ? '' : '/';
  return `${cleanProxy}${separator}${targetUrl}`;
}

/**
 * Creates an Axios instance that prepends the configured CORS proxy URL
 * to all outgoing requests.
 */
export function createProxiedAxios(getProxyUrl: () => string): AxiosInstance {
  const instance = axios.create({
    timeout: 25000,
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  instance.interceptors.request.use((config) => {
    const proxyUrl = getProxyUrl();
    if (config.url && proxyUrl) {
      config.url = formatProxiedUrl(config.url, proxyUrl);
    }
    return config;
  });

  return instance;
}
