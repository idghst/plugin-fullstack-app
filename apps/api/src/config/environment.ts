import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.enum(['127.0.0.1', '0.0.0.0', '::1', '::']).default('127.0.0.1'),
  TRUST_PROXY: z.enum(['off', 'loopback']).default('off'),
  DATABASE_URL: z.url().pipe(
    z
      .string()
      .refine(
        (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
        'Use a PostgreSQL URL',
      )
      .refine(
        (value) =>
          [...new URL(value).searchParams.keys()].every((key) => key === 'application_name'),
        'Only application_name is supported in the URL; configure options with DATABASE_* variables',
      ),
  ),
  DATABASE_SSL_MODE: z.enum(['disable', 'verify-full']).default('disable'),
  DATABASE_SSL_CA_FILE: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1).optional(),
  ),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(5_000),
  DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().min(100).max(300_000).default(30_000),
  DATABASE_QUERY_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(5_000),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).max(3_600_000).default(60_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1_000).default(20),
  AUTH_RATE_LIMIT_MAX_KEYS: z.coerce.number().int().min(1).max(100_000).default(10_000),
  AUTH_MAX_CONCURRENT_REQUESTS: z.coerce.number().int().min(1).max(16).default(2),
  JWT_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().min(3600).max(2_592_000).default(604_800),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(
      z
        .array(
          z
            .url()
            .pipe(
              z
                .string()
                .refine(
                  (origin) =>
                    origin === 'tauri://localhost' ||
                    (['http:', 'https:'].includes(new URL(origin).protocol) &&
                      new URL(origin).origin === origin),
                ),
            ),
        )
        .min(1),
    ),
});
export type AppConfig = z.infer<typeof schema>;
export const CONFIG = Symbol('CONFIG');
export function readConfig(): AppConfig {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    // Never print environment values, database URLs or secret content.
    throw new Error(
      `Invalid environment variables: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  }
  if (
    result.data.NODE_ENV === 'production' &&
    /development|integration-test|change.me|replace.me/i.test(result.data.JWT_SECRET)
  ) {
    throw new Error('Production requires a freshly generated JWT_SECRET.');
  }
  if (result.data.NODE_ENV === 'production') {
    if (
      result.data.CORS_ORIGIN.some(
        (origin) =>
          !origin.startsWith('https://') &&
          !['tauri://localhost', 'http://tauri.localhost'].includes(origin),
      )
    )
      throw new Error('Production CORS_ORIGIN requires HTTPS browser origins.');
    const database = new URL(result.data.DATABASE_URL);
    if (
      !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) &&
      result.data.DATABASE_SSL_MODE !== 'verify-full'
    )
      throw new Error('Production remote DATABASE_URL requires DATABASE_SSL_MODE=verify-full.');
  }
  return result.data;
}
