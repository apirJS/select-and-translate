import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => ({
  publicDir: false,
  build: {
    emptyOutDir: false,
    sourcemap: mode === 'development',
    minify: false,
    rollupOptions: {
      external: ['playwright', '@playwright/test', /playwright-.*/],
      input: {
        content: path.resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: 'assets/js/[name].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        manualChunks: undefined,
        format: 'iife',
      },
    },
  },
}));
