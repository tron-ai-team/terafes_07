import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174, // Running on port 5174 to avoid conflict
    host: true,
    proxy: {
      // Optional same-origin proxy; primary FE still uses VITE_CORE_API_URL (8080) + CORS.
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
});
