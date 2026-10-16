import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 3000,
  },
  server: { host: '127.0.0.1' },
});
