import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// 'http://localhost:8000'
// VITE_API_URL = 'http://103.146.220.225:223';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://103.146.220.225:223',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
