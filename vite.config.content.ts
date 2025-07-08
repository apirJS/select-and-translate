import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

// Plugin to handle CSS as text imports
function cssAsTextPlugin() {
  return {
    name: 'css-as-text',
    load(id: string) {
      if (id.endsWith('.css?raw')) {
        const cssPath = id.replace('?raw', '');
        if (fs.existsSync(cssPath)) {
          const content = fs.readFileSync(cssPath, 'utf-8');
          return `export default ${JSON.stringify(content)};`;
        }
      }
      return null;
    },
  };
}

export default defineConfig(({ mode }) => ({
  publicDir: false,
  plugins: [cssAsTextPlugin()],
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
