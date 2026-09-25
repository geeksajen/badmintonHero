import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * GitHub Pages 的子路徑，必須與 repo 名稱一致（spec §2.2 ①）。
 * 若 repo 名稱不同，build 時設 BASE_PATH=/your-repo/ 覆寫。
 */
const BASE = process.env.BASE_PATH ?? '/badmintonHero/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg', 'sounds/*'],
      manifest: {
        name: '羽球勇者冒險記 Badminton Hero Quest',
        short_name: '羽球勇者',
        description: '把羽球練習變成 RPG 冒險',
        lang: 'zh-Hant',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#7c3aed',
        background_color: '#1e1b4b',
        // ★ 必須含 base path 與 hash，否則從主畫面開啟會白畫面（spec §8.5）
        start_url: `${BASE}#/`,
        scope: BASE,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,wav,mp3}'],
        navigateFallback: `${BASE}index.html`,
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
