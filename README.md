# Vega Web 🎬

> Premium, commercial-grade video streaming web application designed for Smart TV browsers (Samsung Tizen, LG webOS, Android TV) and desktop/mobile web.

Built with **React 18**, **TypeScript**, **Tailwind CSS 3**, **Zustand**, and **HLS.js**. Designed specifically around the Vega Provider specification with pure AMOLED black (`#000000`) aesthetics and seamless 10-foot D-pad spatial navigation.

---

## 🌟 Key Features

- **📺 Smart TV & 10-Foot UI First**:
  - Full spatial D-pad and arrow key navigation (`useSpatialNavigation`)
  - Minimum 44px touch / remote targets
  - Visual focus ring with glowing pulse (`data-focused="true"`)
  - No hover-dependent UI elements
  - Smooth horizontal carousel scroll-into-view
- **⚡ Client-Side Sandboxed Provider Engine**:
  - Directly executes CommonJS provider bundles from Vega repositories
  - Sandboxed execution scope with injected `axios`, `cheerio`, `commonHeaders`, and `kvStore` (backed by localStorage)
  - Configurable CORS proxy support with instant presets (AllOrigins, CorsProxy.io, or custom)
  - 5-stage automated provider verification pipeline: *Catalog → Show List → Metadata → Playback → Streams*
- **🎥 Premium Full-Screen Video Player**:
  - Native HLS (`hls.js`) adaptive bitrate streaming with auto/resolution switching
  - Direct MP4 fallback playback
  - Auto-hiding TV controls overlay (3s timeout)
  - Throttled watch progress saving (every 5 seconds)
  - Resume from last playback timestamp
  - Double-tap sides to seek (±10s)
  - Keyboard shortcuts (`Space`, `Left/Right`, `Up/Down`, `F`, `M`)
- **📱 Rich App Experience**:
  - **Home**: Dynamic hero banner with pagination capsules, continue watching row, category carousels
  - **Search**: Auto-focused search input, real-time debounced results, clearable search history chips
  - **Category Grid**: Full catalog viewing with infinite scroll / "Load More" pagination
  - **Detail View**: Large backdrop vignette, expandable synopsis, season/episode picker with resume progress
  - **Library**: Segmented tabs for Watchlist, Continue Watching, and History
  - **Settings**: Provider repository manager, CORS proxy selector, player speed/skip toggles, backup export/import

---

## 🎨 Design System

| Token | Color Hex | Usage |
| :--- | :--- | :--- |
| **Canvas** | `#000000` | Pure AMOLED Black Background |
| **Surface 1** | `#18181c` | Cards, TopBar, BottomNav scrim |
| **Surface 2** | `#1e1e24` | Elevated dialogs, search input, chips |
| **Surface 3** | `#28272f` | Action pills, player buttons |
| **Active Nav Pill** | `#383740` | Material 3 navigation capsule |
| **Primary CTA** | `#ede7eb` | Cream pill CTA button with `#1c1b1f` text |
| **Secondary Pill**| `#202024` | Secondary pill buttons |
| **Text Primary** | `#ffffff` | Primary text |
| **Text Secondary**| `#8e8e93` | Captions, durations, subtitles |
| **Error** | `#8e0e1b` | Error badges and notifications |

---

## 🛠️ Project Structure

```
vega-web/
├── index.html                  # AMOLED black root template with TV meta tags
├── package.json                # Project dependencies and build scripts
├── postcss.config.js           # PostCSS Tailwind plugins
├── tailwind.config.js          # Vega design system color tokens and radii
├── tsconfig.json               # TypeScript strict configuration
├── vite.config.ts              # Vite config with manual chunking & GitHub Pages base
├── src/
│   ├── main.tsx                # App entrypoint
│   ├── App.tsx                 # React Router (HashRouter) configuration
│   ├── index.css               # Tailwind directives, focus glow, shimmer skeletons
│   ├── lib/
│   │   ├── providers/
│   │   │   ├── types.ts        # Vega Post, Info, Stream, Manifest interfaces
│   │   │   ├── corsProxy.ts    # Configurable CORS proxy interceptor
│   │   │   ├── kvStore.ts      # Provider key-value storage backed by localStorage
│   │   │   └── providerEngine.ts # Provider loader, sandbox eval, 5-stage pipeline
│   │   └── spatial/
│   │       └── useSpatialNavigation.ts # TV remote arrow-key navigation hook
│   ├── stores/
│   │   ├── providerStore.ts    # Installed providers & repository sources
│   │   ├── contentStore.ts     # Catalogs, posts, hero items, search results
│   │   ├── watchHistoryStore.ts # Watch progress & resume positions
│   │   ├── watchlistStore.ts   # Bookmarks & favorites
│   │   ├── settingsStore.ts    # CORS proxy, quality, speed settings
│   │   └── uiStore.ts          # Active modals & toast notifications
│   ├── components/
│   │   ├── cards/
│   │   │   ├── PosterCard.tsx  # 2:3 poster with badges & resume progress
│   │   │   └── HeroCard.tsx    # 16:9 featured carousel with vignette
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx   # 4-tab bottom navigation with active pills
│   │   │   ├── TopBar.tsx      # Provider selector dropdown & logo
│   │   │   └── Layout.tsx      # App wrapper with spatial navigation
│   │   ├── modals/
│   │   │   ├── Modal.tsx       # Reusable 3xl modal with dark scrim
│   │   │   ├── AddSourceModal.tsx # Add custom GitHub raw provider source
│   │   │   └── ProviderTestProgress.tsx # 5-stage verification modal
│   │   ├── player/
│   │   │   ├── VideoPlayer.tsx # HLS/MP4 video engine & touch/remote handling
│   │   │   ├── PlayerControls.tsx # Auto-hiding overlay with TV navigation
│   │   │   ├── ProgressBar.tsx # Seekable timeline with buffer indicator
│   │   │   ├── QualitySelector.tsx # HLS quality level picker
│   │   │   └── ServerSelector.tsx # Multi-source stream switcher
│   │   ├── skeletons/
│   │   │   ├── PosterSkeleton.tsx
│   │   │   ├── HeroSkeleton.tsx
│   │   │   └── DetailSkeleton.tsx
│   │   └── ui/
│   │       ├── Button.tsx      # Vega primary & secondary pills
│   │       ├── Badge.tsx       # Frosted glass badge
│   │       ├── SearchInput.tsx # TV-friendly search input
│   │       ├── Skeleton.tsx    # Shimmer animation primitive
│   │       ├── FocusableCard.tsx # D-pad focus wrapper
│   │       └── ScrollRow.tsx   # Horizontal scroll container
│   └── pages/
│       ├── HomePage.tsx        # Hero banner & catalog carousels
│       ├── SearchPage.tsx      # Real-time search & history chips
│       ├── CategoryPage.tsx    # Responsive grid with pagination
│       ├── DetailPage.tsx      # Content synopsis, episodes & links
│       ├── PlayerPage.tsx      # Fullscreen video experience
│       ├── LibraryPage.tsx     # Watchlist, continue watching, history
│       └── SettingsPage.tsx    # Sources, CORS proxies, data backup
```

---

## 🚀 Running & Building

### Development Server:
```bash
npm run dev
```

### Production Build:
```bash
npm run build
```
Build output is generated in `./dist`.

### Preview Production Build:
```bash
npm run preview
```

---

## ⚡ Deployment & Streaming Proxy (Smart TV & Mobile)

Because web browsers enforce Cross-Origin Resource Sharing (CORS), client-side scrapers require an HTTPS proxy to fetch provider endpoints and video streams.

### Option 1: 1-Click Free Vercel Deploy (Zero Setup - Recommended for TV & Mobile)

Deploying to Vercel provides both the web application and its built-in Serverless Edge Proxy (`/api/proxy`) on the exact same HTTPS origin. **No local terminal, no daemon, and zero manual proxy configuration needed on your Smart TV!**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Manimanjar/vega-web)

1. Click the **Deploy with Vercel** button above.
2. Sign in with GitHub and click **Create**.
3. Vercel automatically deploys your streaming app with the `/api/proxy` edge function in ~30 seconds.
4. Open the assigned `.vercel.app` URL on your Smart TV browser or mobile phone—everything works out of the box!

---

### Option 2: Free Cloudflare Worker (For GitHub Pages Users)

If you prefer hosting on GitHub Pages (`https://manimanjar.github.io/vega-web/`):
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Workers & Pages** $\to$ **Create Worker**.
2. Click **Deploy** $\to$ **Edit code**.
3. Copy and paste the contents of [`cors-worker/worker.js`](./cors-worker/worker.js), then click **Save and deploy**.
4. Copy your assigned URL (e.g. `https://my-proxy.<subdomain>.workers.dev/?url=`).
5. Open `https://manimanjar.github.io/vega-web/`, click the top **Streaming Proxy** button, paste your worker URL, and click **Save & Connect**.

---

### Option 3: Local Network Proxy (For Local Testing)

Run the included high-speed streaming proxy locally:
```bash
node scripts/local-proxy.js
```
*Note: Due to browser Mixed Content security rules, plain `http://` proxies are blocked when viewing `https://` GitHub Pages. For local testing, run the web app over HTTP via `npm run preview` on `http://localhost:5173`.*
