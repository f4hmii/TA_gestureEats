import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/coworking': {
          target: env.VITE_AIRGESTURE_DOMAIN || env.VITE_COWORKING_API_URL || 'https://geasture.kolab.top',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/coworking/, '/api'),
        },
        '/api/ngolab': {
          target: env.VITE_KASIR_DOMAIN || env.VITE_NGOLAB_API_URL || 'https://smarttag.kolab.top',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ngolab/, '/api'),
        },
        '/api': {
          target: env.VITE_AIRGESTURE_DOMAIN || env.VITE_COWORKING_API_URL || 'https://geasture.kolab.top',
          changeOrigin: true,
        },
        '/uploads': {
          target: env.VITE_AIRGESTURE_DOMAIN || env.VITE_COWORKING_API_URL || 'https://geasture.kolab.top',
          changeOrigin: true,
        },
      },
    },
  };
});
