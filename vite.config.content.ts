import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    copyPublicDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/content.ts'),
      formats: ['iife'],
      name: 'ContentScript',
      fileName: () => 'content.js',
    },
    outDir: 'dist/assets/js',
    emptyOutDir: false,
  },
});
