import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z
    .url()
    .refine(
      (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
      'Use a PostgreSQL URL',
    ),
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
            .refine(
              (origin) =>
                origin === 'tauri://localhost' ||
                ['http:', 'https:'].includes(new URL(origin).protocol),
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
  return result.data;
}
