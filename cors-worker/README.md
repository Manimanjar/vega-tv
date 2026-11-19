# ⚡ Vega High-Speed Cloudflare Worker CORS Proxy

This free edge worker solves all browser CORS restrictions and automatically injects custom `Referer` and `Origin` headers so video CDNs stream at full speed without HTTP 403 Forbidden errors.

---

## 🚀 1-Minute Free Setup on Cloudflare

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) (Sign up for free if you don't have an account).
2. Click **Compute (Workers & Pages)** in the left sidebar.
3. Click **Create Application** → **Create Worker**.
4. Name it `vega-proxy` and click **Deploy**.
5. Click **Edit Code**, delete the sample code, and paste the contents of `worker.js`.
6. Click **Save and Deploy**.
7. Copy your worker URL (e.g. `https://vega-proxy.<your-subdomain>.workers.dev`).
8. In **Vega Web**, open **Settings** (or the Provider Drawer) → paste your Worker URL into **CORS Proxy URL**.

That's it! You now have a private, dedicated, high-speed streaming proxy with 100,000 free requests per day!
