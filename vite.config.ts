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
    rollupOptions: {
      output: {
        // Split the vendors that dominate the bundle so a release that only
        // touches app code does not invalidate the icon and framework chunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@lucide')) return 'icons'
          if (id.includes('dexie')) return 'db'
          if (id.includes('date-fns')) return 'dates'
          if (id.includes('@number-flow') || id.includes('vue-sonner')) return 'ui-vendor'
          if (id.includes('/vue/') || id.includes('vue-router') || id.includes('pinia') || id.includes('vue-i18n') || id.includes('@intlify')) {
            return 'vue-vendor'
          }
        },
      },
    },
  },
  server: {
    host: true, // Listen on all network interfaces (localhost, 127.0.0.1, LAN IP)
    port: 5173,
    strictPort: false,
    cors: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
})
