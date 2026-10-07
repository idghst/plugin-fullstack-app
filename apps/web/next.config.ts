import type { NextConfig } from 'next';
import { apiBaseUrlSchema, productionApiBaseUrlSchema } from '@starter/config';
const apiUrl =
  process.env.NODE_ENV === 'production' ? productionApiBaseUrlSchema : apiBaseUrlSchema;
apiUrl.parse(process.env.NEXT_PUBLIC_API_BASE_URL);
const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  transpilePackages: [
    '@starter/ui',
    '@starter/project-ui',
    '@starter/api-client',
    '@starter/auth',
    '@starter/contracts',
    '@starter/config',
  ],
  poweredByHeader: false,
  reactStrictMode: true,
};
export default config;
