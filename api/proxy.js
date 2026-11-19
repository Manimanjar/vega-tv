/**
 * Vercel Serverless Edge Function for CORS & Video Stream Proxy
 */
export default async function handler(req, res) {
  // CORS Preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing ?url= parameter" });
  }

  try {
    const parsedTarget = new URL(targetUrl);
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": `${parsedTarget.origin}/`,
      "Origin": parsedTarget.origin,
      "Accept": "*/*",
    };

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);

    const data = await response.arrayBuffer();
    return res.status(response.status).send(Buffer.from(data));
  } catch (err) {
    return res.status(502).json({ error: "Upstream fetch failed", message: err.message });
  }
}
