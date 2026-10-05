import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: Object.fromEntries(
      ['contracts', 'core', 'auth', 'config', 'utils', 'api-client'].map((name) => [
        `@starter/${name}`,
        fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url)),
      ]),
    ),
  },
  test: { include: ['packages/**/*.test.ts'], environment: 'node' },
});
