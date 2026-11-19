/**
 * Vega High-Speed Streaming & CORS Proxy (Node.js ESM)
 * 
 * Supports:
 * - Full CORS bypass for all web browsers and Smart TVs
 * - Video streaming with Range requests (HTTP 206 Partial Content) & instant seeking
 * - Automatic Referer & Origin header injection for video CDNs (prevents 403 Forbidden)
 * - M3U8 Playlist rewriting (routes HLS segments through proxy)
 * - Automatic HTTP redirect following (up to 5 hops)
 * - Zero external dependencies (pure Node.js built-in modules)
 */

import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import os from 'node:os';

const PORT = parseInt(process.env.PORT || '8080', 10);
const MAX_REDIRECTS = 5;

// Find local network IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function fetchWithRedirects(targetUrl, incomingReq, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      return reject(new Error('Too many redirects (max ' + MAX_REDIRECTS + ')'));
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (e) {
      return reject(new Error('Invalid URL: ' + targetUrl));
    }

    const client = parsedUrl.protocol === 'https:' ? https : http;

    // Filter and build upstream request headers
    const headers = {};

    // Forward range header for video seeking
    if (incomingReq.headers.range) {
      headers['range'] = incomingReq.headers.range;
    }

    // Forward accept header
    if (incomingReq.headers.accept) {
      headers['accept'] = incomingReq.headers.accept;
    } else {
      headers['accept'] = '*/*';
    }

    // Set Referer and Origin to target domain to prevent CDN 403 Forbidden
    headers['referer'] = `${parsedUrl.origin}/`;
    headers['origin'] = parsedUrl.origin;
    headers['user-agent'] =
      incomingReq.headers['user-agent'] ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    const reqOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: incomingReq.method,
      headers,
      timeout: 30000,
    };

    const upstreamReq = client.request(reqOptions, (upstreamRes) => {
      // Check for redirects
      const statusCode = upstreamRes.statusCode || 200;
      if (
        (statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307 || statusCode === 308) &&
        upstreamRes.headers.location
      ) {
        upstreamRes.resume(); // drain response
        const nextUrl = new URL(upstreamRes.headers.location, targetUrl).toString();
        return resolve(fetchWithRedirects(nextUrl, incomingReq, redirectCount + 1));
      }

      resolve({ upstreamRes, finalUrl: targetUrl });
    });

    upstreamReq.on('error', reject);
    upstreamReq.on('timeout', () => {
      upstreamReq.destroy(new Error('Upstream timeout'));
    });

    // Pipe POST/PUT body if applicable
    if (incomingReq.method !== 'GET' && incomingReq.method !== 'HEAD') {
      incomingReq.pipe(upstreamReq);
    } else {
      upstreamReq.end();
    }
  });
}

const server = http.createServer(async (req, res) => {
  // 1. Universal CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 2. Extract target URL from query parameter or path
  let targetUrl = '';
  try {
    const parsedReq = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    targetUrl = parsedReq.searchParams.get('url') || '';
    if (!targetUrl) {
      const pathname = parsedReq.pathname.slice(1);
      if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
        targetUrl = pathname + parsedReq.search;
      }
    }
  } catch {
    // ignore
  }

  // Health check / welcome page
  if (!targetUrl) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        app: 'Vega High-Speed Streaming Proxy',
        status: 'online',
        version: '2.5.0',
        lanUrl: `http://${getLocalIp()}:${PORT}/?url=`,
        usage: `http://${getLocalIp()}:${PORT}/?url=https://example.com/stream.m3u8`,
      })
    );
    return;
  }

  try {
    const { upstreamRes, finalUrl } = await fetchWithRedirects(targetUrl, req);

    // Forward status code (200, 206 for ranges, etc.)
    const status = upstreamRes.statusCode || 200;

    // Filter headers to forward
    const responseHeaders = { ...upstreamRes.headers };
    responseHeaders['access-control-allow-origin'] = '*';
    responseHeaders['access-control-allow-methods'] = 'GET, HEAD, POST, PUT, DELETE, OPTIONS';
    responseHeaders['access-control-allow-headers'] = '*';
    responseHeaders['access-control-expose-headers'] = '*';
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['content-security-policy-report-only'];
    delete responseHeaders['x-frame-options'];

    // Check if this is an m3u8 playlist that needs relative URL rewriting
    const contentType = (responseHeaders['content-type'] || '').toLowerCase();
    const isM3u8 =
      targetUrl.includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('application/x-mpegurl');

    if (isM3u8 && req.method === 'GET' && status >= 200 && status < 300) {
      // Buffer playlist and rewrite relative segment URLs
      const chunks = [];
      upstreamRes.on('data', (chunk) => chunks.push(chunk));
      upstreamRes.on('end', () => {
        const bodyText = Buffer.concat(chunks).toString('utf-8');
        const baseUrl = new URL(finalUrl);

        // Rewrite relative URLs to route through proxy
        const lines = bodyText.split('\n');
        const rewrittenLines = lines.map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return line;

          let absoluteSegmentUrl = '';
          try {
            absoluteSegmentUrl = new URL(trimmed, baseUrl).toString();
          } catch {
            return line;
          }

          // Return proxied segment URL
          return `/?url=${encodeURIComponent(absoluteSegmentUrl)}`;
        });

        const rewrittenBody = rewrittenLines.join('\n');
        responseHeaders['content-length'] = Buffer.byteLength(rewrittenBody, 'utf-8');
        res.writeHead(status, responseHeaders);
        res.end(rewrittenBody);
      });
      return;
    }

    // Direct streaming pipe for MP4, TS segments, audio, and documents
    res.writeHead(status, responseHeaders);
    upstreamRes.pipe(res);
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'Proxy Fetch Failed',
        message: err.message,
        url: targetUrl,
      })
    );
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`\n======================================================`);
  console.log(`🚀 Vega High-Speed Streaming & CORS Proxy is RUNNING!`);
  console.log(`======================================================`);
  console.log(`📡 Local Device:   http://localhost:${PORT}/?url=`);
  console.log(`📺 Smart TV / LAN: http://${localIp}:${PORT}/?url=`);
  console.log(`⚡ Range requests, CDN Referers & M3U8 rewrites enabled.`);
  console.log(`======================================================\n`);
});
