import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 7777,
  },
  preview: {
    host: '0.0.0.0',
    port: 7777,
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 4096,
    sourcemap: false,
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: { reporter: ['text', 'json-summary'] },
  },
});
