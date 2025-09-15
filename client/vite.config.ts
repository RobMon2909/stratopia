// client/vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // <-- 1. IMPORTAR 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 2. AÑADIR LA SECCIÓN 'resolve'
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost/stratopia',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
})