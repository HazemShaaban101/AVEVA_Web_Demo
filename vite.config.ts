import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// Demo build: a static site with simulated data. `base: './'` keeps asset paths relative, so the
// build works from any folder (e.g. https://<user>.github.io/<repo>/).
export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
    server: { port: 5190 },
    preview: { port: 5191 },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (/[\\/]node_modules[\\/](three|@react-three)[\\/]/.test(id)) return 'three';
            // zustand is shared by the app and @react-three/fiber; keep it here so the entry never
            // has to load the 3D chunk just for it.
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|zustand|use-sync-external-store)[\\/]/.test(id)) return 'react';
            if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'motion';
            return undefined;
          },
        },
      },
    },
  };
});
