import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { readDatabaseOptions, type DatabaseOptions } from './options';
export * from './schema';
export { readDatabaseOptions, type DatabaseOptions } from './options';
export { requireTestDatabaseUrl } from './test-database';
export function createDatabase(
  connectionString: string,
  options: DatabaseOptions = readDatabaseOptions(),
) {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('Invalid PostgreSQL connection URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('Use a PostgreSQL connection URL.');
  if ([...url.searchParams.keys()].some((key) => key !== 'application_name'))
    throw new Error(
      'PostgreSQL URL only supports application_name; configure TLS and pool options with DATABASE_* variables.',
    );
  if (
    process.env.NODE_ENV === 'production' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
    !options.ssl
  )
    throw new Error('Production remote database connections require verified TLS.');
  const pool = new Pool({
    ...options,
    connectionString,
  });
  return { pool, db: drizzle(pool, { schema }) };
}
export type Database = ReturnType<typeof createDatabase>['db'];
