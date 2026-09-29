import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-512-maskable.png'],
      manifest: false,  // ← we already have our own manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Cache cover images from Unsplash
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unsplash-covers',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Cache API responses briefly (library list)
            urlPattern: /\/api\/library\/songs.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'library-api',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 },
            },
          },
          {
            // Audio stream — CacheFirst would fill disk; use NetworkOnly and rely on IDB downloads
            urlPattern: /\/api\/stream\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});