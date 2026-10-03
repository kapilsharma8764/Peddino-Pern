import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { cpSync, existsSync, readFileSync } from 'node:fs'

/**
 * Where the template files come from when they are not on this machine's disk.
 *
 * In production the ~5,400 template files live in MongoDB behind the API, and
 * the host (Vercel) forwards `/original-templates/*` and `/templates/<folder>/*`
 * to it — see vercel.json. Set `SITEBUILDER_TEMPLATE_PROXY=http://localhost:8001`
 * to make the dev server and `vite preview` do the same, which is how to see
 * exactly what the live site will show. `/templates` on its own is the gallery
 * page, so only paths *under* it are forwarded.
 */
function templateProxy(target: string | undefined) {
  if (!target) return undefined
  const forward = { target, changeOrigin: true }
  return { '^/original-templates/.*': forward, '^/templates/.+': forward }
}

/**
 * A production build for Vercel must not carry the template files: they are
 * ~1.2 GB under public/, they live in MongoDB now, and the host forwards their
 * URLs to the API. So `public/` is not copied wholesale; only the few small
 * files the app itself needs (`favicon.svg`, `media/`) are.
 */
function leanPublic(): Plugin {
  let root = '', outDir = ''
  return {
    name: 'lean-public',
    apply: 'build',
    configResolved(config) { root = config.root; outDir = path.resolve(config.root, config.build.outDir) },
    closeBundle() {
      for (const name of ['favicon.svg', 'media']) {
        const from = path.join(root, 'public', name)
        if (existsSync(from)) cpSync(from, path.join(outDir, name), { recursive: true })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  // A live build with no API address would quietly call http://localhost:8001
  // from every visitor's browser. Stop the build instead of shipping that.
  if (env.VERCEL && mode === 'production') {
    if (!env.VITE_API_URL) throw new Error('VITE_API_URL is not set. Add it in Vercel → Settings → Environment Variables (the https:// address of the API), then redeploy.')
    if (!/^https:\/\//.test(env.VITE_API_URL)) throw new Error(`VITE_API_URL must be an https:// address on Vercel (got "${env.VITE_API_URL}") — a browser blocks an https page from calling http.`)
    // vercel.json forwards the template URLs to the API. If its address is still
    // the placeholder, every template would open blank on the live site.
    const config = path.resolve(__dirname, 'vercel.json')
    if (existsSync(config) && readFileSync(config, 'utf8').includes('YOUR-API-HOST')) {
      throw new Error("client/vercel.json still says YOUR-API-HOST. Replace it with your API's host name (e.g. sitebuilder-api.onrender.com, no https://) — templates are served through it.")
    }
  }
  const lean = Boolean(env.VERCEL || env.SITEBUILDER_LEAN_BUILD) && mode === 'production'
  const proxy = templateProxy(env.SITEBUILDER_TEMPLATE_PROXY)
  return {
    publicDir: lean ? false : 'public',
    plugins: [react(), tailwindcss(), ...(lean ? [leanPublic()] : []), {
      name: 'sandbox-template-fonts',
      // Sandboxed previews have an opaque origin. Only the public template assets
      // are cross-origin readable; editor source and account APIs are unaffected.
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/original-templates/')) res.setHeader('Access-Control-Allow-Origin', '*')
          next()
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/original-templates/')) res.setHeader('Access-Control-Allow-Origin', '*')
          next()
        })
      },
    }],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/src/templates/library/imported/') || id.includes('\\src\\templates\\library\\imported\\')) {
              return 'templates'
            }
            if (!id.includes('node_modules')) return undefined
            return 'vendor'
          },
        },
      },
    },
    // 5173 is often taken by another project on this machine; pin ours so the
    // dev URL is always the same and never silently shifts to a spare port.
    server: {
      port: 5200,
      strictPort: true,
      proxy,
      // Test runs and screenshot scripts write here constantly; watching those
      // files is what crashed the dev server with EBUSY on Windows.
      watch: {
        ignored: [
          '**/public/original-templates/**',
          '**/scripts/**',
          '**/e2e/**',
          '**/test-results/**',
          '**/playwright-report/**',
          '**/artifacts/**',
          '**/dist/**',
          '**/*.log',
          '**/*.png',
        ],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    preview: { proxy },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    },
  }
})

