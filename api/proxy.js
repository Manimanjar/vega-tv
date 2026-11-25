/**
 * Vega Web - High-Speed Vercel Edge Serverless CORS & Video Streaming Proxy
 * 
 * Powered by Vercel Edge Runtime (global CDN nodes in 300+ locations):
 * - Unlimited video streaming via direct Web Stream piping (no memory buffering)
 * - Automatic Referer & Origin injection to bypass video CDN 403 Forbidden blocks
 * - HLS M3U8 Playlist rewriting (routes all child playlists and segments through proxy)
 * - HTTP 206 Partial Content range requests for instant scrubbing/seeking
 * - Universal CORS headers for web browsers and Smart TVs
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // 1. CORS Preflight OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const reqUrl = new URL(request.url);
  const targetUrl = reqUrl.searchParams.get('url');

  if (!targetUrl) {
    return new Response(
      JSON.stringify({
        app: 'Vega Web Edge Proxy',
        status: 'online',
        usage: `${reqUrl.origin}/api/proxy?url=https://example.com/stream.m3u8`,
        version: '3.2.0',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  let cleanTargetUrl = targetUrl;
  if (cleanTargetUrl.includes('hubcloud.cx')) {
    cleanTargetUrl = cleanTargetUrl.replace('hubcloud.cx', 'hubcloud.mov');
  }
  if (cleanTargetUrl.includes('hubcloud.club')) {
    cleanTargetUrl = cleanTargetUrl.replace('hubcloud.club', 'hubcloud.mov');
  }

  try {
    const parsedTarget = new URL(cleanTargetUrl);

    // Build upstream request headers - strip all proxy and datacenter fingerprints
    const upstreamHeaders = new Headers();

    // Copy only safe headers from request
    for (const [key, value] of request.headers.entries()) {
      const lower = key.toLowerCase();
      if (
        !lower.startsWith('x-vercel') &&
        !lower.startsWith('x-forwarded') &&
        lower !== 'x-real-ip' &&
        lower !== 'via' &&
        lower !== 'host' &&
        lower !== 'origin' &&
        lower !== 'referer' &&
        lower !== 'cookie'
      ) {
        upstreamHeaders.set(key, value);
      }
    }

    // Extract custom referer / origin if passed
    const customReferer = reqUrl.searchParams.get('referer') || request.headers.get('x-proxy-referer');
    const customOrigin = reqUrl.searchParams.get('origin') || request.headers.get('x-proxy-origin');

    if (customReferer) {
      upstreamHeaders.set('Referer', customReferer);
    } else {
      upstreamHeaders.set('Referer', `${parsedTarget.origin}/`);
    }

    if (customOrigin) {
      upstreamHeaders.set('Origin', customOrigin);
    } else if (customReferer) {
      try {
        upstreamHeaders.set('Origin', new URL(customReferer).origin);
      } catch {
        upstreamHeaders.set('Origin', parsedTarget.origin);
      }
    } else {
      upstreamHeaders.set('Origin', parsedTarget.origin);
    }

    upstreamHeaders.set(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );
    upstreamHeaders.set('Accept-Language', 'en-US,en;q=0.9');
    upstreamHeaders.set('Sec-Ch-Ua', '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"');
    upstreamHeaders.set('Sec-Ch-Ua-Mobile', '?0');
    upstreamHeaders.set('Sec-Ch-Ua-Platform', '"Windows"');

    // Forward range header for video player scrubbing
    const range = request.headers.get('range');
    if (range) {
      upstreamHeaders.set('Range', range);
    }

    const upstreamResponse = await fetch(cleanTargetUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });

    // Build response headers with universal CORS
    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Access-Control-Expose-Headers', '*');
    responseHeaders.set('Accept-Ranges', 'bytes');

    // Remove security headers that prevent iframe/video playback
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('content-security-policy-report-only');
    responseHeaders.delete('x-frame-options');

    // Check if response is an M3U8 HLS playlist
    const contentType = (upstreamResponse.headers.get('content-type') || '').toLowerCase();
    const isM3u8 =
      contentType.includes('mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      cleanTargetUrl.includes('.m3u8') ||
      cleanTargetUrl.includes('m3u8');

    if (isM3u8 && upstreamResponse.ok && request.method === 'GET') {
      const text = await upstreamResponse.text();
      if (text.includes('#EXTM3U')) {
        const targetBase = new URL(cleanTargetUrl);
        const refParam = customReferer ? `&referer=${encodeURIComponent(customReferer)}` : '';
        const origParam = customOrigin ? `&origin=${encodeURIComponent(customOrigin)}` : '';
        const proxyPath = reqUrl.pathname;

        const rewritten = text
          .split('\n')
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;

            // Handle #EXT-X-KEY:METHOD=...,URI="..."
            if (trimmed.startsWith('#EXT-X-KEY:')) {
              const match = trimmed.match(/URI=["']?([^"',\s]+)["']?/);
              if (match) {
                try {
                  const keyUrl = new URL(match[1], targetBase).href;
                  const proxied = `${proxyPath}?url=${encodeURIComponent(keyUrl)}${refParam}${origParam}`;
                  return trimmed.replace(match[1], proxied);
                } catch {
                  return line;
                }
              }
            }

            // Handle #EXT-X-MAP:URI="init.mp4"
            if (trimmed.startsWith('#EXT-X-MAP:')) {
              const match = trimmed.match(/URI=["']?([^"',\s]+)["']?/);
              if (match) {
                try {
                  const segUrl = new URL(match[1], targetBase).href;
                  const proxied = `${proxyPath}?url=${encodeURIComponent(segUrl)}${refParam}${origParam}`;
                  return trimmed.replace(match[1], proxied);
                } catch {
                  return line;
                }
              }
            }

            // Keep all comment / directive lines untouched
            if (trimmed.startsWith('#')) return line;

            // Rewrite stream/segment URIs to route through edge proxy
            try {
              const resolved = new URL(trimmed, targetBase).href;
              return `${proxyPath}?url=${encodeURIComponent(resolved)}${refParam}${origParam}`;
            } catch {
              return line;
            }
          })
          .join('\n');

        responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
        return new Response(rewritten, {
          status: 200,
          headers: responseHeaders,
        });
      }
    }

    // Direct stream piping via Web Streams (zero memory buffer, line rate)
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Upstream fetch failed', message: err.message }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
