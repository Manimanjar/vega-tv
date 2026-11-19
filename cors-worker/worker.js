/**
 * Vega Web - High-Speed Cloudflare Edge CORS & Video Stream Proxy
 * 
 * Deploy to Cloudflare Workers for 100% free, unlimited, ultra-low latency video streaming.
 * Handles custom Referer/Origin headers required by video CDNs and bypasses browser CORS.
 */

export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS Preflight OPTIONS requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const reqUrl = new URL(request.url);

    // 2. Extract target URL from query parameter or path
    let targetUrl = reqUrl.searchParams.get("url");
    if (!targetUrl) {
      // Path based: e.g. https://worker.dev/https://example.com/video.m3u8
      const pathname = reqUrl.pathname.slice(1);
      if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
        targetUrl = pathname + reqUrl.search;
      }
    }

    if (!targetUrl) {
      return new Response(
        JSON.stringify({
          app: "Vega Web CORS Proxy",
          status: "online",
          usage: `${reqUrl.origin}/?url=https://target.com/video.m3u8`,
          version: "2.0.0",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    try {
      const parsedTarget = new URL(targetUrl);

      // 3. Clone and customize request headers for video CDN compatibility
      const newHeaders = new Headers(request.headers);
      newHeaders.delete("host");
      newHeaders.delete("origin");
      newHeaders.delete("referer");

      // Set target origin as Referer to prevent HTTP 403 Forbidden on video CDNs
      newHeaders.set("Referer", `${parsedTarget.origin}/`);
      newHeaders.set("Origin", parsedTarget.origin);
      newHeaders.set(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      );

      // 4. Fetch from upstream target
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: newHeaders,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
        redirect: "follow",
      });

      // 5. Construct response with universal CORS headers
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, DELETE, OPTIONS");
      responseHeaders.set("Access-Control-Allow-Headers", "*");
      responseHeaders.set("Access-Control-Expose-Headers", "*");

      // Remove restrictive security headers that break iframe or video playback
      responseHeaders.delete("content-security-policy");
      responseHeaders.delete("content-security-policy-report-only");
      responseHeaders.delete("x-frame-options");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Proxy Fetch Failed", message: err.message }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};
