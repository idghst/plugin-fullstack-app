import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSensitivePath } from './staged-files.mjs';

test('rejects private env and key files while allowing documentation and examples', () => {
  for (const name of ['.env', 'apps/web/.env.local', 'secrets/server.pem', 'credentials.json'])
    assert.equal(isSensitivePath(name), true);
  for (const name of [
    '.env.example',
    '.env.production.example',
    'apps/mobile/src/token-store.ts',
    'docs/security.md',
  ])
    assert.equal(isSensitivePath(name), false);
});
