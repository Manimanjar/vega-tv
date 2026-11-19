/**
 * Vega Web - High-Speed Vercel Edge Serverless CORS & Video Streaming Proxy
 * 
 * Powered by Vercel Edge Runtime (global CDN nodes in 300+ locations):
 * - Unlimited video streaming via direct Web Stream piping (no memory buffering)
 * - HTTP 206 Partial Content range requests for instant scrubbing/seeking
 * - Automatic Referer & Origin injection to bypass video CDN 403 Forbidden blocks
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
        version: '3.0.0',
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

  try {
    const parsedTarget = new URL(targetUrl);

    // Filter and build upstream request headers
    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.delete('host');
    upstreamHeaders.delete('origin');
    upstreamHeaders.delete('referer');

    upstreamHeaders.set('Referer', `${parsedTarget.origin}/`);
    upstreamHeaders.set('Origin', parsedTarget.origin);
    upstreamHeaders.set(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    // Forward range header for video player scrubbing
    const range = request.headers.get('range');
    if (range) {
      upstreamHeaders.set('Range', range);
    }

    const upstreamResponse = await fetch(targetUrl, {
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
