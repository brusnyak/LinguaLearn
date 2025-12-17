import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'LinguaLearn',
        short_name: 'Lingua',
        description: 'Offline-first language learning app',
        theme_color: '#6D28D9',
        background_color: '#F3F4F6',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
        '/api/translate': {
            target: 'https://de.libretranslate.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/translate/, '/translate')
        }
    }
  }
})
