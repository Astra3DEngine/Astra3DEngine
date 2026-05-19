import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    react(),
    svgr(),
    electron([
      {
        entry: 'electron/main.js',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        entry: 'electron/preload.js',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs'
              }
            }
          }
        }
      }
    ])
  ],
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
