import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.WEAA_BASE || '/',
  // The assistant server (`node server.js` on 3008) accepts a request only when its Origin matches its Host. A string
  // target would make Vite rewrite Host to the target and every browser POST would be refused with 403.
  server: { proxy: { '/api/assistant': { target: 'http://127.0.0.1:3008', changeOrigin: false } } },
  test: { environment: 'jsdom' },
});
