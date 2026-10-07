import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('starting development never automatically migrates the selected database', async () => {
  const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url)));
  assert.doesNotMatch(manifest.scripts.dev, /db:(?:migrate|seed)|drizzle-kit\s+push/);
  assert.match(manifest.scripts['db:migrate'], /migrate/);
});
