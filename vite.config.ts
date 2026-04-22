import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Affiliate auth: /proxy/auth/... → https://auth-staging.creditas.com.br/...
      '/proxy/auth': {
        target: 'https://auth-staging.creditas.com.br',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy\/auth/, ''),
      },
      // B2B API: /proxy/b2b/... → https://stg-api.creditas.io/b2b/...
      '/proxy/b2b': {
        target: 'https://stg-api.creditas.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy\/b2b/, '/b2b'),
      },
      // Partner internal API: /proxy/partner/... → https://stg-api.creditas.io/partner/...
      '/proxy/partner': {
        target: 'https://stg-api.creditas.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy\/partner/, '/partner'),
      },
    },
  },
})
