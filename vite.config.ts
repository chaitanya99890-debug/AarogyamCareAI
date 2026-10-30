import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // The user and admin Vite processes run simultaneously in `dev:all`.
  // They need independent optimizer caches on Windows to avoid an EPERM race on _metadata.json.
  cacheDir: mode === 'admin' ? 'node_modules/.vite-admin' : 'node_modules/.vite-user',
  // Keep Vite's optimized-dependency cache between restarts. Forcing a fresh
  // bundle here made both local sites wait 40–60 seconds on every launch.
  server: {
    // Windows cannot watch the embedded Python executable while FastAPI has it open.
    // A predicate is used because the glob was not consistently applied before
    // chokidar attempted to open python.exe, which caused EBUSY crashes.
    watch: {
      ignored: (path) => path.replace(/\\/g, '/').includes('/ml_backend/.python-runtime/'),
    },
  },
}))
