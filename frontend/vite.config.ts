import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Proxy para a API: use http://localhost:5291 (perfil "http") ou altere para https://localhost:7171 (perfil "https")
    proxy: {
      '/api': {
        target: 'http://localhost:5291',
        changeOrigin: true,
      },
      '/swagger': {
        target: 'http://localhost:5291',
        changeOrigin: true,
      },
      '/health': { target: 'http://localhost:5291', changeOrigin: true },
      '/ready': { target: 'http://localhost:5291', changeOrigin: true },
    },
  },
})
