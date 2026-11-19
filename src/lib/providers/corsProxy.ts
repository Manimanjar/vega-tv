import { AxiosInstance } from 'axios';
import { smartProxy } from './smartProxy';

export function formatProxiedUrl(targetUrl: string, proxyUrl?: string): string {
  if (proxyUrl) {
    smartProxy.setCustomProxy(proxyUrl);
  }
  return smartProxy.formatUrl(targetUrl);
}

export function createProxiedAxios(getProxyUrl?: () => string): AxiosInstance {
  if (getProxyUrl) {
    const custom = getProxyUrl();
    if (custom) smartProxy.setCustomProxy(custom);
  }
  return smartProxy.createAxiosInstance();
}
