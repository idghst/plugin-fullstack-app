import type { NextConfig } from 'next';
import { z } from 'zod';
const apiUrl = z.url().refine((value) => {
  const url = new URL(value);
  return (
    ['http:', 'https:'].includes(url.protocol) &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    url.pathname.endsWith('/api/v1')
  );
}, 'API URL must use HTTP(S) and end with /api/v1');
z.object({ NEXT_PUBLIC_API_BASE_URL: apiUrl, API_BASE_URL: apiUrl }).parse(process.env);
const config: NextConfig = {
  transpilePackages: [
    '@starter/ui',
    '@starter/project-ui',
    '@starter/api-client',
    '@starter/auth',
    '@starter/contracts',
  ],
  poweredByHeader: false,
  reactStrictMode: true,
};
export default config;
