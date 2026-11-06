import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Classroom LAN: Vite binds 0.0.0.0:5174; Spring stays on 127.0.0.1:8080.
// Empty VITE_CORE_API_URL → browser calls same origin; these proxies forward to Core.
const spring = 'http://127.0.0.1:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: spring,
        changeOrigin: true,
      },
      '/oauth2': {
        target: spring,
        changeOrigin: true,
      },
      '/login/oauth2': {
        target: spring,
        changeOrigin: true,
      },
      '/health': {
        target: spring,
        changeOrigin: true,
      },
      '/actuator': {
        target: spring,
        changeOrigin: true,
      },
      '/v3': {
        target: spring,
        changeOrigin: true,
      },
    },
  },
});
