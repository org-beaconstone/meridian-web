import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  base: './',
  server: { port: 5175 },
  // Keep fonts as same-origin files so the hosted CSP can remain font-src 'self'.
  build: { outDir: 'dist', sourcemap: false, assetsInlineLimit: 0 },
});
