import type { ExpoConfig } from 'expo/config';
import { withAndroidManifest, type ConfigPlugin } from 'expo/config-plugins';
import { z } from 'zod';
import { loadEnvFile } from 'node:process';
import { join } from 'node:path';
// Expo evaluates dynamic config before its export command loads dotenv.
// Node preserves explicit process environment values when loading these files.
for (const file of ['.env.local', '.env']) {
  try {
    loadEnvFile(join(__dirname, file));
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
}
const api = new URL(z.url().parse(process.env.EXPO_PUBLIC_API_BASE_URL));
if (
  !['http:', 'https:'].includes(api.protocol) ||
  api.username ||
  api.password ||
  api.search ||
  api.hash ||
  !api.pathname.endsWith('/api/v1')
)
  throw new Error('EXPO_PUBLIC_API_BASE_URL must be an HTTP(S) URL ending in /api/v1');
const config: ExpoConfig = {
  name: 'Project Studio',
  slug: 'project-studio',
  scheme: 'projectstudio',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  plugins: ['expo-router', 'expo-secure-store', withLocalApi],
  ios: {
    bundleIdentifier: 'com.starter.projectstudio',
    supportsTablet: true,
    infoPlist: { NSAppTransportSecurity: { NSAllowsLocalNetworking: true } },
  },
  android: { package: 'com.starter.projectstudio' },
  web: { bundler: 'metro', output: 'static' },
};
function withLocalApi(config: Parameters<ConfigPlugin>[0]) {
  return withAndroidManifest(config, (native) => {
    const application = native.modResults.manifest.application?.[0];
    if (application?.$)
      application.$['android:usesCleartextTraffic'] = String(api.protocol === 'http:');
    return native;
  });
}
export default config;
