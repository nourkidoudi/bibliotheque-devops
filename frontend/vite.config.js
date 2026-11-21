import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/users': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/books': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/categories': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/loans': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      '/api/notifications': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      '/api/stats': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
});
