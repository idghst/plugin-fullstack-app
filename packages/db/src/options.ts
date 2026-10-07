import type { PoolConfig } from 'pg';
import { readFileSync } from 'node:fs';
export type DatabaseOptions = Pick<
  PoolConfig,
  | 'max'
  | 'connectionTimeoutMillis'
  | 'idleTimeoutMillis'
  | 'query_timeout'
  | 'statement_timeout'
  | 'ssl'
>;
export function readDatabaseOptions(
  environment: Record<string, string | undefined> = process.env,
): DatabaseOptions {
  const number = (key: string, fallback: number, min: number, max: number) => {
    const value = environment[key] === undefined ? fallback : Number(environment[key]);
    if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${key}.`);
    return value;
  };
  const mode = environment.DATABASE_SSL_MODE ?? 'disable';
  if (!['disable', 'verify-full'].includes(mode)) throw new Error('Invalid DATABASE_SSL_MODE.');
  let ca: string | undefined;
  if (environment.DATABASE_SSL_CA_FILE) {
    if (mode !== 'verify-full')
      throw new Error('DATABASE_SSL_CA_FILE requires DATABASE_SSL_MODE=verify-full.');
    try {
      ca = readFileSync(environment.DATABASE_SSL_CA_FILE, 'utf8');
    } catch {
      throw new Error('Unable to read DATABASE_SSL_CA_FILE.');
    }
  }
  const timeout = number('DATABASE_QUERY_TIMEOUT_MS', 5000, 100, 60_000);
  return {
    max: number('DATABASE_POOL_MAX', 5, 1, 50),
    connectionTimeoutMillis: number('DATABASE_CONNECTION_TIMEOUT_MS', 5000, 100, 60_000),
    idleTimeoutMillis: number('DATABASE_IDLE_TIMEOUT_MS', 30_000, 100, 300_000),
    query_timeout: timeout,
    statement_timeout: timeout,
    ssl: mode === 'verify-full' ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) } : false,
  };
}
