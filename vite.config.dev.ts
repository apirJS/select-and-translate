import fs from 'fs-extra';
import { defineConfig } from 'vite';
import path from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

function moveHtmlToRoot(): import('vite').Plugin {
  return {
    name: 'move-html-to-root',
    closeBundle: async () => {
      const htmlDir = path.resolve(__dirname, 'dist/src/html');
      const distDir = path.resolve(__dirname, 'dist');

      if (await fs.pathExists(htmlDir)) {
        const files = await fs.readdir(htmlDir);
        for (const file of files) {
          if (file.endsWith('.html')) {
            const from = path.resolve(htmlDir, file);
            const to = path.resolve(distDir, file);
            await fs.move(from, to, { overwrite: true });
          }
        }
        await fs.remove(path.resolve(__dirname, 'dist/src'));
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  publicDir: false,
  define: {
    Module: {},
  },
  plugins: [
    moveHtmlToRoot(),
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '' },
        { src: 'public/*.png', dest: 'assets/img' },
      ],
    }),
  ],
  build: {
    emptyOutDir: true,
    sourcemap: mode === 'development',
    minify: false,
    rollupOptions: {
      external: ['playwright', '@playwright/test', /playwright-.*/],
      input: {
        popup: path.resolve(__dirname, 'src/html/popup.html'),
        background: path.resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: 'assets/js/[name].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          if (name && name.endsWith('.css')) {
            return 'assets/css/[name].[ext]';
          } else if (name && name.endsWith('.html')) {
            return '[name].[ext]';
          }
          return 'assets/[name].[ext]';
        },
        esModule: true,
        manualChunks: undefined,
      },
    },
  },
}));
