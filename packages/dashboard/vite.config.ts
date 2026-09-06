import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Collector URL for dev proxy — override with VITE_COLLECTOR_URL if needed
const collectorTarget = process.env.VITE_COLLECTOR_URL ?? 'http://localhost:4000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/traces': { target: collectorTarget, changeOrigin: true },
      '/health': { target: collectorTarget, changeOrigin: true },
      '/instance': { target: collectorTarget, changeOrigin: true },
    },
  },
})
