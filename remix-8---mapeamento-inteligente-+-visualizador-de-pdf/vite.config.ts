import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import {defineConfig, loadEnv} from 'vite';
import { createAIApp } from './server/ai.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, rootDir, ''), ...process.env };
  const aiServer = { name: 'gabarito-ai-server', configureServer(server: import('vite').ViteDevServer) { server.middlewares.use(createAIApp(env)); }, configurePreviewServer(server: import('vite').PreviewServer) { server.middlewares.use(createAIApp(env)); } };
  return {
    plugins: [react(), tailwindcss(), aiServer],
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
              { name: 'supabase', test: /node_modules[\\/](@supabase|iceberg-js)[\\/]/, priority: 15 },
            ],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
