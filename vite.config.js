import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // During local dev (`netlify dev` covers this automatically); this proxy
      // is only used when running `vite` standalone against a running
      // `netlify functions:serve` on port 9999.
      '/.netlify/functions': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
    },
  },
})
