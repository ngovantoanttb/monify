import path from 'path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function apiDevMiddleware(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next()
        }

        const url = new URL(req.url, 'http://localhost:3000')
        const pathname = url.pathname

        let handlerPath = ''
        const query: Record<string, string> = {}
        url.searchParams.forEach((v, k) => {
          query[k] = v
        })

        if (pathname === '/api/health') handlerPath = './api/health.ts'
        else if (pathname === '/api/auth/login') handlerPath = './api/auth/login.ts'
        else if (pathname === '/api/auth/refresh') handlerPath = './api/auth/refresh.ts'
        else if (pathname === '/api/auth/logout') handlerPath = './api/auth/logout.ts'
        else if (pathname === '/api/auth/me') handlerPath = './api/auth/me.ts'
        else if (pathname === '/api/admin/users') handlerPath = './api/admin/users/index.ts'
        else if (pathname === '/api/admin/stats') handlerPath = './api/admin/stats.ts'
        else if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/status')) {
          handlerPath = './api/admin/users/[uid]/status.ts'
          const parts = pathname.split('/')
          query.uid = parts[4]
        } else if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/role')) {
          handlerPath = './api/admin/users/[uid]/role.ts'
          const parts = pathname.split('/')
          query.uid = parts[4]
        }

        if (handlerPath) {
          try {
            req.query = query
            const module = await server.ssrLoadModule(handlerPath)
            await module.default(req, res)
            return
          } catch (err: any) {
            console.error('[API Middleware Error]', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message, stack: err.stack }))
            return
          }
        }

        next()
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiDevMiddleware()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/__/auth': {
        target: 'https://monify-f0597.firebaseapp.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/database'],
          'vendor-recharts': ['recharts'],
          'vendor-ui': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
