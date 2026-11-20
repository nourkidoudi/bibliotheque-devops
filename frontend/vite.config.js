import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En dev local : proxy vers les services lancés sur la machine
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/users': 'http://localhost:3001',
      '/api/books': 'http://localhost:3002',
      '/api/loans': 'http://localhost:3003',
    },
  },
});
