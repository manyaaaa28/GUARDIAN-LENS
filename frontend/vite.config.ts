import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  css: {
    postcss: {},
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser.js',
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE || 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        headers: { 'ngrok-skip-browser-warning': 'true' }
      }
    }
  }
})
