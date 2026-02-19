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
        name: 'api-table',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/table' && req.method === 'POST') {
              const { handleApiTable } = await import('./server/apiTable')
              await handleApiTable(req, res)
            } else {
              next()
            }
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@json-render/core': path.resolve(__dirname, 'json-render/packages/core/dist/index.mjs'),
        '@json-render/react/schema': path.resolve(__dirname, 'json-render/packages/react/dist/schema.mjs'),
        '@json-render/react': path.resolve(__dirname, 'json-render/packages/react/dist/index.mjs'),
      },
    },
  }
})
