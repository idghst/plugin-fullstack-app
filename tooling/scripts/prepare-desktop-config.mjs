import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const desktop = join(root, 'apps/desktop');
const requireDesktop = createRequire(join(desktop, 'package.json'));
const { productionApiBaseUrlSchema } = requireDesktop('@starter/config');

export function productionDesktopConfig(baseConfig, apiBaseUrl) {
  const apiOrigin = new URL(productionApiBaseUrlSchema.parse(apiBaseUrl)).origin;
  const csp = baseConfig.app.security.csp
    .split(';')
    .map((directive) => {
      const value = directive.trim();
      return value.startsWith('connect-src ')
        ? `connect-src 'self' ipc: http://ipc.localhost ${apiOrigin}`
        : value;
    })
    .join('; ');
  return { app: { security: { csp } } };
}

async function main() {
  const { loadEnv } = await import(pathToFileURL(requireDesktop.resolve('vite')).href);
  const env = loadEnv('production', desktop, 'VITE_');
  const baseConfig = JSON.parse(await readFile(join(desktop, 'src-tauri/tauri.conf.json'), 'utf8'));
  const config = productionDesktopConfig(
    baseConfig,
    process.env.VITE_API_BASE_URL ?? env.VITE_API_BASE_URL,
  );
  const directory = join(desktop, '.tauri-build');
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'production.json'), `${JSON.stringify(config, null, 2)}\n`);
  process.stdout.write('Prepared desktop production CSP for the configured HTTPS API.\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
