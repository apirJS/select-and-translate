import fs from 'fs-extra';
import { defineConfig } from 'vite';
import path from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

function moveHtmlToRoot(): import('vite').Plugin {
  return {
    name: 'move-html-to-root',
    closeBundle: async () => {
      const from = path.resolve(__dirname, 'dist/src/html/popup.html');
      const to = path.resolve(__dirname, 'dist/popup.html');

      if (await fs.pathExists(from)) {
        await fs.move(from, to, { overwrite: true });
        await fs.remove(path.resolve(__dirname, 'dist/src'));
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  publicDir: false,
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
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/html/popup.html'),
        background: path.resolve(__dirname, 'src/background.ts'),
        content: path.resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: 'assets/js/[name].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
        esModule: true,
        manualChunks: undefined,
      },
    },
  },
}));
