import { describe, expect, it } from 'vitest';
import { readDatabaseOptions } from '../src/options';
import { createDatabase } from '../src/index';
import { Client } from 'pg';

describe('database connection options', () => {
  it('keeps small finite pool and timeout defaults', () => {
    expect(readDatabaseOptions({})).toMatchObject({
      max: 5,
      connectionTimeoutMillis: 5000,
      query_timeout: 5000,
      ssl: false,
    });
  });
  it('never disables certificate validation when TLS is selected', () => {
    expect(readDatabaseOptions({ DATABASE_SSL_MODE: 'verify-full' }).ssl).toEqual({
      rejectUnauthorized: true,
    });
    expect(() => readDatabaseOptions({ DATABASE_SSL_MODE: 'require' })).toThrow(
      /DATABASE_SSL_MODE/,
    );
  });
  it('rejects resource bounds before opening a connection', () => {
    expect(() => readDatabaseOptions({ DATABASE_POOL_MAX: '0' })).toThrow(/DATABASE_POOL_MAX/);
    expect(() => readDatabaseOptions({ DATABASE_QUERY_TIMEOUT_MS: 'NaN' })).toThrow(
      /DATABASE_QUERY_TIMEOUT_MS/,
    );
  });
  it('redacts inaccessible CA paths in configuration errors', () => {
    expect(() =>
      readDatabaseOptions({
        DATABASE_SSL_MODE: 'verify-full',
        DATABASE_SSL_CA_FILE: '/missing/private/ca.pem',
      }),
    ).toThrow('Unable to read DATABASE_SSL_CA_FILE.');
  });
  it('blocks driver URL options that override validated TLS', async () => {
    const options = readDatabaseOptions({ DATABASE_SSL_MODE: 'verify-full' });
    for (const query of [
      'ssl=0',
      'ssl=no-verify',
      'sslmode=disable',
      'SSL=0',
      'host=remote.example',
      'statement_timeout=0',
    ])
      expect(() =>
        createDatabase(`postgresql://app:private@db.example/app?${query}`, options),
      ).toThrow(/TLS/);
    const connection = createDatabase('postgresql://app:private@db.example/app', options);
    const client = new Client(connection.pool.options);
    expect(client.ssl).toEqual({ rejectUnauthorized: true });
    await connection.pool.end();
  });
});
