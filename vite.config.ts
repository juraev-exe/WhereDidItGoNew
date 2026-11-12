import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  root: './src',
  publicDir: '../public',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split the vendors that dominate the bundle so a release that only
        // touches app code does not invalidate the icon and framework chunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('tesseract.js')) return 'ocr'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('@revenuecat')) return 'revenuecat'
          if (id.includes('@capacitor') || id.includes('@capawesome') || id.includes('@aparajita')) {
            return 'capacitor'
          }
          if (id.includes('@lucide')) return 'icons'
          if (id.includes('dexie')) return 'db'
          if (id.includes('date-fns')) return 'dates'
          if (id.includes('@number-flow') || id.includes('vue-sonner')) return 'ui-vendor'
          if (id.includes('papaparse') || id.includes('qrcode')) return 'export-utils'
          if (id.includes('/vue/') || id.includes('vue-router') || id.includes('pinia') || id.includes('vue-i18n') || id.includes('@intlify')) {
            return 'vue-vendor'
          }
        },
      },
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: 'localhost',
    port: 4173,
  },
})
