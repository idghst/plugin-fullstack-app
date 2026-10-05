import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { z } from 'zod';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const value = z.url().parse(env.VITE_API_BASE_URL);
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.endsWith('/api/v1')
  )
    throw new Error('VITE_API_BASE_URL must be an HTTP(S) URL ending in /api/v1');
  return {
    plugins: [react(), tailwindcss()],
    clearScreen: false,
    server: { host: '0.0.0.0', port: 5173, strictPort: true },
    optimizeDeps: { include: ['@starter/api-client', '@starter/auth', '@starter/contracts'] },
    build: {
      target: 'es2022',
      commonjsOptions: { include: [/node_modules/, /packages\/[^/]+\/dist/] },
    },
  };
});
