/**
 * Vega Local LAN CORS Proxy
 * 
 * Run with: node scripts/local-proxy.js
 * Serves CORS proxy on port 8080 (or PORT env var)
 * Allows Smart TVs on the same home WiFi network to stream at full local LAN speeds!
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  // CORS universal headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  let targetUrl = parsedUrl.query.url;

  if (!targetUrl && parsedUrl.pathname.length > 1) {
    targetUrl = parsedUrl.pathname.slice(1);
  }

  if (!targetUrl) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      app: 'Vega Web Local Proxy',
      status: 'running',
      usage: `http://localhost:${PORT}/?url=https://target.com/video.m3u8`,
    }));
    return;
  }

  try {
    const target = new URL(targetUrl);
    const client = target.protocol === 'https:' ? https : http;

    const options = {
      method: req.method,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': `${target.origin}/`,
        'Origin': target.origin,
        'Accept': '*/*',
      },
    };

    const proxyReq = client.request(targetUrl, options, (proxyRes) => {
      // Forward headers with CORS allowed
      const headers = { ...proxyRes.headers };
      headers['access-control-allow-origin'] = '*';
      headers['access-control-allow-methods'] = 'GET, HEAD, POST, PUT, DELETE, OPTIONS';
      headers['access-control-allow-headers'] = '*';
      delete headers['x-frame-options'];
      delete headers['content-security-policy'];

      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy request failed', message: err.message }));
    });

    req.pipe(proxyReq);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid URL', message: err.message }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Vega Local LAN Proxy is running!`);
  console.log(`📡 Local: http://localhost:${PORT}`);
  console.log(`📺 Smart TV Setup: Set Vega Web CORS Proxy to http://<your-ip>:${PORT}/?url=\n`);
});
