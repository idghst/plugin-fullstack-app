import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setupEnvironment } from './setup-env.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'starter-env-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(
    join(root, '.env.example'),
    'JWT_SECRET=\nDATABASE_URL=postgresql://unsafe-default\nTEST_DATABASE_URL=postgresql://unsafe-test\n',
  );
  return root;
}

test('external is default and never inherits database credentials from examples', async (t) => {
  const root = await fixture(t);
  await setupEnvironment(root);
  const env = await readFile(join(root, '.env'), 'utf8');
  assert.match(env, /^DATABASE_URL=$/m);
  assert.match(env, /^TEST_DATABASE_URL=$/m);
  assert.doesNotMatch(env, /unsafe/);
  assert.match(env, /^DATABASE_SSL_MODE=verify-full$/m);
});

test('local profile is explicit, persists nonsecret selection and uses separate local test DB', async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, 'starter.config.json'), '{"database":"local"}\n');
  await setupEnvironment(root);
  const env = await readFile(join(root, '.env'), 'utf8');
  assert.match(env, /DATABASE_URL=postgresql:\/\/starter:starter@localhost:55432\/starter/);
  assert.match(
    env,
    /TEST_DATABASE_URL=postgresql:\/\/starter:starter@localhost:55433\/starter_test/,
  );
  assert.match(env, /^DATABASE_SSL_MODE=disable$/m);
});

test('explicit profile overrides project selection without overwriting existing private env', async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, 'starter.config.json'), '{"database":"local"}\n');
  await mkdir(join(root, 'apps/mobile'), { recursive: true });
  await writeFile(
    join(root, 'apps/mobile/.env.example'),
    'EXPO_PUBLIC_API_BASE_URL=http://localhost\nDATABASE_URL=private\n',
  );
  await writeFile(join(root, '.env'), 'DATABASE_URL=existing-private\n');
  await writeFile(join(root, 'apps/mobile/.env'), 'EXPO_PUBLIC_API_BASE_URL=existing\n');
  await setupEnvironment(root, { database: 'external' });
  assert.equal(await readFile(join(root, '.env'), 'utf8'), 'DATABASE_URL=existing-private\n');
  assert.equal(
    await readFile(join(root, 'apps/mobile/.env'), 'utf8'),
    'EXPO_PUBLIC_API_BASE_URL=existing\n',
  );
});

test('invalid profiles fail before creating env files', async (t) => {
  const root = await fixture(t);
  await assert.rejects(
    setupEnvironment(root, { database: 'postgresql://secret' }),
    /external.*local/,
  );
  await assert.rejects(access(join(root, '.env')), { code: 'ENOENT' });
});

test('explicit external choice overrides a saved local profile for fresh env', async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, 'starter.config.json'), '{"database":"local"}\n');
  await setupEnvironment(root, { database: 'external' });
  assert.match(await readFile(join(root, '.env'), 'utf8'), /^DATABASE_URL=$/m);
});
