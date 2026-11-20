import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import type { Plugin } from 'vite';

function localProxyPlugin(): Plugin {
  return {
    name: 'local-edge-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/proxy')) return next();

        // Handle CORS Preflight
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        try {
          const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
          const targetUrl = reqUrl.searchParams.get('url');
          if (!targetUrl) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            return res.end(JSON.stringify({ status: 'online', app: 'Vega Web Local Proxy' }));
          }

          const parsedTarget = new URL(targetUrl);
          const customReferer = reqUrl.searchParams.get('referer');
          const customOrigin = reqUrl.searchParams.get('origin');

          const fetchHeaders: Record<string, string> = {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          };
          if (customReferer) fetchHeaders['Referer'] = customReferer;
          else fetchHeaders['Referer'] = `${parsedTarget.origin}/`;

          if (customOrigin) fetchHeaders['Origin'] = customOrigin;
          else if (customReferer) {
            try {
              fetchHeaders['Origin'] = new URL(customReferer).origin;
            } catch {
              fetchHeaders['Origin'] = parsedTarget.origin;
            }
          } else {
            fetchHeaders['Origin'] = parsedTarget.origin;
          }

          if (req.headers.range) {
            fetchHeaders['Range'] = req.headers.range as string;
          }

          const upstream = await fetch(targetUrl, {
            headers: fetchHeaders,
            method: req.method,
          });

          res.statusCode = upstream.status;
          upstream.headers.forEach((val, key) => {
            if (!['content-security-policy', 'x-frame-options'].includes(key.toLowerCase())) {
              res.setHeader(key, val);
            }
          });
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Expose-Headers', '*');

          const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
          const isM3u8 =
            contentType.includes('mpegurl') ||
            targetUrl.includes('.m3u8') ||
            targetUrl.includes('m3u8');

          if (isM3u8 && upstream.ok && req.method === 'GET') {
            const text = await upstream.text();
            if (text.includes('#EXTM3U')) {
              const targetBase = new URL(targetUrl);
              const refParam = customReferer ? `&referer=${encodeURIComponent(customReferer)}` : '';
              const origParam = customOrigin ? `&origin=${encodeURIComponent(customOrigin)}` : '';
              const proxyPath = '/api/proxy';

              const rewritten = text
                .split('\n')
                .map((line) => {
                  const trimmed = line.trim();
                  if (!trimmed) return line;

                  if (trimmed.startsWith('#EXT-X-KEY:') || trimmed.startsWith('#EXT-X-MAP:')) {
                    const match = trimmed.match(/URI=["']?([^"',\s]+)["']?/);
                    if (match) {
                      try {
                        const resolved = new URL(match[1], targetBase).href;
                        return trimmed.replace(
                          match[1],
                          `${proxyPath}?url=${encodeURIComponent(resolved)}${refParam}${origParam}`
                        );
                      } catch {
                        return line;
                      }
                    }
                  }

                  if (trimmed.startsWith('#')) return line;

                  try {
                    const resolved = new URL(trimmed, targetBase).href;
                    return `${proxyPath}?url=${encodeURIComponent(resolved)}${refParam}${origParam}`;
                  } catch {
                    return line;
                  }
                })
                .join('\n');

              res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
              return res.end(rewritten);
            }
          }

          const arrayBuffer = await upstream.arrayBuffer();
          return res.end(Buffer.from(arrayBuffer));
        } catch (e: any) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}

// Determine base path:
// - Vercel serves from root domain (base: '/')
// - GitHub Actions for vega-web serves from subpath (base: '/vega-web/')
// - Local dev or fallback (base: '/')
const isVercel = Boolean(process.env.VERCEL);
const isGitHubPages = Boolean(process.env.GITHUB_ACTIONS);
const base = isVercel ? '/' : isGitHubPages ? '/vega-web/' : './';

export default defineConfig({
  plugins: [react(), localProxyPlugin()],
  base,
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          hls: ['hls.js'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
