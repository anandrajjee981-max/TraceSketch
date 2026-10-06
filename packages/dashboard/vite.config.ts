import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// Collector URL for dev proxy — override with VITE_COLLECTOR_URL if needed
const collectorTarget = process.env.VITE_COLLECTOR_URL ?? 'http://localhost:4000'

// The collector's /instance endpoint intentionally returns only instance_id —
// it never exposes the secret over HTTP. So the dashboard picks the secret up
// from the same on-disk file the CLI reads. Real env vars still win, so CI and
// multi-user setups can inject credentials without touching that file.
function readLocalInstance(): { id?: string; secret?: string } {
  if (process.env.VITE_INSTANCE_ID && process.env.VITE_INSTANCE_SECRET) {
    return {
      id: process.env.VITE_INSTANCE_ID,
      secret: process.env.VITE_INSTANCE_SECRET,
    }
  }
  try {
    const raw = readFileSync(join(homedir(), '.tracesketch', 'config', 'instance.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { instance_id?: string; secret?: string }
    return {
      id: process.env.VITE_INSTANCE_ID ?? parsed.instance_id,
      secret: process.env.VITE_INSTANCE_SECRET ?? parsed.secret,
    }
  } catch {
    // No local instance yet — collector will create one on first run.
    return { id: process.env.VITE_INSTANCE_ID, secret: process.env.VITE_INSTANCE_SECRET }
  }
}

const localInstance = readLocalInstance()

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_INSTANCE_ID': JSON.stringify(localInstance.id ?? ''),
    'import.meta.env.VITE_INSTANCE_SECRET': JSON.stringify(localInstance.secret ?? ''),
  },
  server: {
    port: 5173,
    proxy: {
      '/traces': { target: collectorTarget, changeOrigin: true },
      '/health': { target: collectorTarget, changeOrigin: true },
      '/instance': { target: collectorTarget, changeOrigin: true },
      '/groups': { target: collectorTarget, changeOrigin: true },
    },
  },
})
