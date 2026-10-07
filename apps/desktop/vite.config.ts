import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { apiBaseUrlSchema, productionApiBaseUrlSchema } from '@starter/config';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const schema = mode === 'production' ? productionApiBaseUrlSchema : apiBaseUrlSchema;
  schema.parse(process.env.VITE_API_BASE_URL ?? env.VITE_API_BASE_URL);
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
