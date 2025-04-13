import { defineConfig } from 'vite';
import path from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => ({
  publicDir: false,
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '' },
        { src: 'src/html/*', dest: '' },
        { src: 'public/*.png', dest: 'assets/img' },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    emptyOutDir: true,
    sourcemap: mode === 'development',
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/popup.ts'),
        background: path.resolve(__dirname, 'src/background.ts'),
        content: path.resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: 'assets/js/[name].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
        esModule: true,
      },
    },
  },
}));
