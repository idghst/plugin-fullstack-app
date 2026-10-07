import { afterEach, describe, expect, it, vi } from 'vitest';
import { readConfig } from '../src/config/environment';

const environment = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://app:private@localhost/app',
  JWT_SECRET: 'a'.repeat(48),
  CORS_ORIGIN: 'https://app.example.com,tauri://localhost,http://tauri.localhost',
};
afterEach(() => vi.unstubAllEnvs());
function configure(overrides: Record<string, string> = {}) {
  for (const [name, value] of Object.entries({ ...environment, ...overrides }))
    vi.stubEnv(name, value);
}
describe('production environment', () => {
  it('rejects insecure browser origins and origins with paths', () => {
    configure({ CORS_ORIGIN: 'http://app.example.com' });
    expect(() => readConfig()).toThrow(/CORS_ORIGIN/);
    configure({ CORS_ORIGIN: 'https://app.example.com/path' });
    expect(() => readConfig()).toThrow(/CORS_ORIGIN/);
  });
  it('defaults to private listening and does not trust arbitrary forwarding headers', () => {
    configure();
    expect(readConfig()).toMatchObject({ HOST: '127.0.0.1', TRUST_PROXY: 'off' });
    configure({ TRUST_PROXY: 'true' });
    expect(() => readConfig()).toThrow(/TRUST_PROXY/);
  });
  it('rejects database URL options that can override verified TLS', () => {
    configure({ DATABASE_URL: 'postgresql://app:private@db.example/app?sslmode=no-verify' });
    expect(() => readConfig()).toThrow(/DATABASE_URL/);
    configure({
      DATABASE_URL: 'postgresql://app:private@db.example/app?ssl=0',
      DATABASE_SSL_MODE: 'verify-full',
    });
    expect(() => readConfig()).toThrow(/DATABASE_URL/);
  });
  it('validates pool and auth limiter bounds without disclosing values', () => {
    configure({ DATABASE_POOL_MAX: '0', AUTH_RATE_LIMIT_MAX: '0' });
    expect(() => readConfig()).toThrow(/DATABASE_POOL_MAX/);
    configure({ DATABASE_URL: 'private-secret-value' });
    expect(() => readConfig()).toThrow(/DATABASE_URL/);
    expect(() => readConfig()).not.toThrow(/private-secret-value/);
  });
  it('treats blank optional CA and migration settings as absent', () => {
    configure({ DATABASE_SSL_CA_FILE: '', DATABASE_MIGRATION_URL: '' });
    expect(readConfig().DATABASE_SSL_CA_FILE).toBeUndefined();
  });
  it('rejects URL host and timeout overrides that bypass production validation', () => {
    configure({ DATABASE_URL: 'postgresql://app:private@localhost/app?host=db.example' });
    expect(() => readConfig()).toThrow(/DATABASE_URL/);
  });
});
