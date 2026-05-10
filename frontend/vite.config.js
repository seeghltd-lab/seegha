import { readFileSync } from 'fs';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '1.0.0'),
  },

  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,

      includeAssets: [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon-48x48.png',
        'apple-touch-icon.png',
        'apple-touch-icon-57x57.png',
        'apple-touch-icon-60x60.png',
        'apple-touch-icon-72x72.png',
        'apple-touch-icon-76x76.png',
        'apple-touch-icon-114x114.png',
        'apple-touch-icon-120x120.png',
        'apple-touch-icon-144x144.png',
        'apple-touch-icon-152x152.png',
        'apple-touch-icon-180x180.png',
        'pwa-72x72.png',
        'pwa-96x96.png',
        'pwa-128x128.png',
        'pwa-144x144.png',
        'pwa-152x152.png',
        'pwa-192x192.png',
        'pwa-384x384.png',
        'pwa-512x512.png',
        'maskable-icon-192x192.png',
        'maskable-icon-512x512.png',
        'mstile-70x70.png',
        'mstile-144x144.png',
        'mstile-150x150.png',
        'mstile-310x150.png',
        'mstile-310x310.png',
        'screenshots/desktop.png',
        'screenshots/mobile.png',
      ],

      manifest: {
        name: 'SEEGH LTD',
        short_name: 'SEEGH',
        description: 'The next generation of asset management and real-time ledger accuracy.',
        theme_color: '#f7f7fb',
        background_color: '#f7f7fb',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'en',
        dir: 'ltr',
        categories: ['business', 'productivity', 'finance'],
        prefer_related_applications: false,

        icons: [
          { src: '/pwa-72x72.png',             sizes: '72x72',   type: 'image/png' },
          { src: '/pwa-96x96.png',             sizes: '96x96',   type: 'image/png' },
          { src: '/pwa-128x128.png',           sizes: '128x128', type: 'image/png' },
          { src: '/pwa-144x144.png',           sizes: '144x144', type: 'image/png' },
          { src: '/pwa-152x152.png',           sizes: '152x152', type: 'image/png' },
          { src: '/pwa-384x384.png',           sizes: '384x384', type: 'image/png' },
          { src: '/pwa-192x192.png',           sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png',           sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-192x192.png',           sizes: '192x192', type: 'image/png', purpose: 'monochrome' },
          { src: '/maskable-icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],

        screenshots: [
          {
            src: '/screenshots/desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Desktop view of SEEGH LTD',
          },
          {
            src: '/screenshots/mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Mobile view of SEEGH LTD',
          },
        ],
      },

      workbox: {
        globPatterns: [],
      },

      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],

  optimizeDeps: {
    exclude: ['axios'],
    include: ['react', 'react-dom', 'lucide-react'],
  },

  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },

  server: {
    host: true,
    port: 5173,
  },
})
