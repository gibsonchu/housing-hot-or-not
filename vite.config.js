import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Serves the /api handlers during `npm run dev`, so local development behaves
 * like production without needing `vercel dev`. Vercel itself ignores this and
 * runs the same files as serverless functions.
 */
function apiRoutes() {
  return {
    name: 'building-taste-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()
        const url = new URL(req.url, 'http://localhost')
        const name = url.pathname.replace(/^\/api\//, '').replace(/\/+$/, '')
        if (!/^[a-z0-9_-]+$/i.test(name)) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`)
          req.query = Object.fromEntries(url.searchParams)
          await mod.default(req, res)
        } catch (e) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'Dev API error', detail: String(e.message || e) }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiRoutes()],
  build: {
    // Without this the minifier rewrites `(max-width: 760px)` to the range form
    // `(width <= 760px)`, which iOS Safari below 16.4 ignores — silently losing
    // the stacked mobile layout on the devices that need it most.
    cssTarget: 'safari14',
  },
})
