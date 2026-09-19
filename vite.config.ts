import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  base: './',
  server: {
    port: 5175,
    proxy: {
      '/api/v1': {
        target: process.env.MERIDIAN_API_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  // Keep fonts as same-origin files so the hosted CSP can remain font-src 'self'.
  build: { outDir: 'dist', sourcemap: false, assetsInlineLimit: 0 },
});
