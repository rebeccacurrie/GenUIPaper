import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load ALL env vars (not just VITE_-prefixed) into process.env
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      react(),
      {
        name: 'api-routes',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/table' && req.method === 'POST') {
              const { handleApiTable } = await import('./server/apiTable')
              await handleApiTable(req, res)
            } else if (req.url === '/api/logs' && req.method === 'GET') {
              const { handleApiLogs } = await import('./server/apiLogs')
              await handleApiLogs(req, res)
            } else if (req.url === '/api/run-batch' && req.method === 'POST') {
              const { handleApiRunBatch } = await import('./server/apiRunBatch')
              await handleApiRunBatch(req, res)
            } else if (req.url === '/api/config' && req.method === 'GET') {
              const { handleApiConfig } = await import('./server/apiConfig')
              await handleApiConfig(req, res)
            } else {
              next()
            }
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@json-render/core': path.resolve(__dirname, 'lib/json-render-core/index.mjs'),
        '@json-render/react/schema': path.resolve(__dirname, 'lib/json-render-react/schema.mjs'),
        '@json-render/react': path.resolve(__dirname, 'lib/json-render-react/index.mjs'),
      },
    },
  }
})
