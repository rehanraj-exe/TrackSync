import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': 'http://127.0.0.1:8000',
      '/predictions': 'http://127.0.0.1:8000',
      '/tasks': 'http://127.0.0.1:8000',
      '/plans': 'http://127.0.0.1:8000',
      '/what-if': 'http://127.0.0.1:8000',
      '/audit': 'http://127.0.0.1:8000',
      '/chat': 'http://127.0.0.1:8000',
      '/corridors': 'http://127.0.0.1:8000'
    }
  }
})
