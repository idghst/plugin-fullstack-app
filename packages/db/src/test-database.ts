export function requireTestDatabaseUrl(value: string | undefined): string {
  if (!value)
    throw new Error('Set TEST_DATABASE_URL to the dedicated starter_test database on port 55433.');
  const url = new URL(value);
  if (
    !['localhost', '127.0.0.1', 'postgres-test'].includes(url.hostname) ||
    url.pathname !== '/starter_test' ||
    (url.hostname !== 'postgres-test' && url.port !== '55433')
  ) {
    throw new Error('Refusing test database operation: use local starter_test on port 55433.');
  }
  return value;
}
