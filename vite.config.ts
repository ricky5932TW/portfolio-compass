import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/.tools/**', '**/.promo-tools/**'],
    },
  },
  build: {
    rollupOptions: {
      input: ['index.html', 'privacy.html'],
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
