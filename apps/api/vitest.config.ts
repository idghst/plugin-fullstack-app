import { defineConfig } from 'vitest/config';
try {
  process.loadEnvFile('../../.env');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
export default defineConfig({
  test: { testTimeout: 20_000, hookTimeout: 30_000, fileParallelism: false },
});
