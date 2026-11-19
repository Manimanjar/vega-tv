import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Determine base path:
// - Vercel serves from root domain (base: '/')
// - GitHub Actions for vega-web serves from subpath (base: '/vega-web/')
// - Local dev or fallback (base: '/')
const isVercel = Boolean(process.env.VERCEL);
const isGitHubPages = Boolean(process.env.GITHUB_ACTIONS);
const base = isVercel ? '/' : (isGitHubPages ? '/vega-web/' : './');

export default defineConfig({
  plugins: [react()],
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
