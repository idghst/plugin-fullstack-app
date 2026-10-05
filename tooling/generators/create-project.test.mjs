import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  access,
  rm,
  symlink,
  readdir,
} from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let generateProject;
try {
  ({ generateProject } = await import('./create-project.mjs'));
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}

async function fixture(t) {
  assert.equal(typeof generateProject, 'function', 'project generator must exist');
  const base = await mkdtemp(join(tmpdir(), 'starter-generator-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const source = join(base, 'source');
  const cwd = join(base, 'output');
  await mkdir(source);
  await mkdir(cwd);
  await writeFile(
    join(source, 'package.json'),
    JSON.stringify({
      name: 'fullstack-starter',
      scripts: {
        dev: 'turbo run dev --filter=@starter/web --filter=@starter/api',
        'dev:mobile': 'pnpm --filter @starter/mobile dev',
        'dev:desktop': 'pnpm --filter @starter/desktop dev',
        'test:e2e': 'pnpm --filter @starter/web test:e2e',
      },
    }),
  );
  await writeFile(join(source, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0');
  await mkdir(join(source, '.github/workflows'), { recursive: true });
  await writeFile(join(source, '.github/workflows/native.yml'), 'name: Native desktop build\n');
  for (const app of ['api', 'web', 'mobile', 'desktop']) {
    await mkdir(join(source, 'apps', app), { recursive: true });
    await writeFile(
      join(source, 'apps', app, 'package.json'),
      JSON.stringify({ name: `@starter/${app}` }),
    );
  }
  return { source, cwd };
}

test('copies a runnable source and changes only root project identity', async (t) => {
  const options = await fixture(t);
  await mkdir(join(options.source, 'docker'));
  await mkdir(join(options.source, '.githooks'));
  await writeFile(
    join(options.source, '.githooks', 'pre-commit'),
    '#!/bin/sh\nnode tooling/scripts/staged-files.mjs',
  );
  await writeFile(join(options.source, 'docker', 'api.Dockerfile'), 'FROM node:22-alpine');
  const destination = await generateProject({ ...options, name: 'my-service' });
  assert.equal(
    JSON.parse(await readFile(join(destination, 'package.json'), 'utf8')).name,
    'my-service',
  );
  assert.equal(
    JSON.parse(await readFile(join(destination, 'apps/api/package.json'), 'utf8')).name,
    '@starter/api',
  );
  await access(join(destination, 'pnpm-lock.yaml'));
  await access(join(destination, 'docker', 'api.Dockerfile'));
  await access(join(destination, '.githooks', 'pre-commit'));
  await access(join(destination, '.github/workflows/native.yml'));
});

function runWithRenamePolicy(options, policy) {
  const script = `
    import fs from 'node:fs/promises';
    import { syncBuiltinESMExports } from 'node:module';
    const originalRename = fs.rename;
    let moves = 0;
    fs.rename = async (source, destination) => {
      ${policy}
      return originalRename(source, destination);
    };
    syncBuiltinESMExports();
    const { generateProject } = await import(${JSON.stringify(new URL('./create-project.mjs', import.meta.url).href)});
    await generateProject(${JSON.stringify(options)});
  `;
  return spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
}

test('publishes entries without replacing an existing directory under Windows rename semantics', async (t) => {
  const options = await fixture(t);
  const result = runWithRenamePolicy(
    { ...options, name: 'portable-service' },
    `
    let info;
    try { info = await fs.lstat(destination); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (info?.isDirectory()) throw Object.assign(new Error('Windows blocks existing-directory replacement'), { code: 'EPERM' });
  `,
  );
  assert.equal(result.status, 0, result.stderr);
  await access(join(options.cwd, 'portable-service/apps/api/package.json'));
  assert.deepEqual((await readdir(options.cwd)).sort(), ['portable-service']);
});

test('rolls back its reserved destination and staging after a partial publish failure', async (t) => {
  const options = await fixture(t);
  await writeFile(join(options.cwd, 'unrelated.txt'), 'keep user data');
  const result = runWithRenamePolicy(
    { ...options, name: 'failed-service' },
    `
    if (++moves === 2) throw new Error('Forced move failure');
  `,
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Forced move failure/);
  assert.deepEqual((await readdir(options.cwd)).sort(), ['unrelated.txt']);
  assert.equal(await readFile(join(options.cwd, 'unrelated.txt'), 'utf8'), 'keep user data');
});

test('rejects escaping and invalid project names', async (t) => {
  const options = await fixture(t);
  for (const name of [
    '../escape',
    '/tmp/escape',
    '.',
    'a/b',
    'a\\b',
    'UPPER',
    '--flag',
    'a'.repeat(65),
  ]) {
    await assert.rejects(generateProject({ ...options, name }), /project name/i);
  }
});

test('does not overwrite any existing destination', async (t) => {
  const options = await fixture(t);
  await mkdir(join(options.cwd, 'existing'));
  await writeFile(join(options.cwd, 'existing', 'keep'), 'user data');
  await assert.rejects(generateProject({ ...options, name: 'existing' }), /already exists/i);
  assert.equal(await readFile(join(options.cwd, 'existing', 'keep'), 'utf8'), 'user data');
});

test('excludes recursive secrets, caches, native output and symlinks', async (t) => {
  const options = await fixture(t);
  for (const file of [
    '.env',
    '.env.local',
    'apps/api/.env.production',
    '.git/config',
    'node_modules/private.js',
    'apps/web/.next/data',
    'apps/desktop/src-tauri/target/binary',
    'artifacts/private.log',
    'keys/token.pem',
    'credentials.json',
  ]) {
    await mkdir(join(options.source, file, '..'), { recursive: true });
    await writeFile(join(options.source, file), 'secret');
  }
  await writeFile(join(options.source, '.env.example'), 'PUBLIC=example');
  await symlink(join(options.source, '.env'), join(options.source, 'linked-secret'));
  const destination = await generateProject({ ...options, name: 'safe-copy' });
  for (const file of [
    '.env',
    '.env.local',
    'apps/api/.env.production',
    '.git',
    'node_modules',
    'apps/web/.next',
    'apps/desktop/src-tauri/target',
    'artifacts',
    'keys/token.pem',
    'credentials.json',
    'linked-secret',
  ]) {
    await assert.rejects(access(join(destination, file)), { code: 'ENOENT' });
  }
  assert.equal(await readFile(join(destination, '.env.example'), 'utf8'), 'PUBLIC=example');
});

test('omits selected UI apps and adjusts scripts without changing package namespaces', async (t) => {
  const options = await fixture(t);
  const destination = await generateProject({
    ...options,
    name: 'api-service',
    omit: ['web', 'mobile', 'desktop'],
  });
  await access(join(destination, 'apps/api/package.json'));
  for (const app of ['web', 'mobile', 'desktop'])
    await assert.rejects(access(join(destination, 'apps', app)), { code: 'ENOENT' });
  const root = JSON.parse(await readFile(join(destination, 'package.json'), 'utf8'));
  assert.equal(root.scripts.dev, 'turbo run dev --filter=@starter/api');
  assert.equal(root.scripts['dev:mobile'], undefined);
  assert.equal(root.scripts['dev:desktop'], undefined);
  assert.equal(root.scripts['test:e2e'], undefined);
  await assert.rejects(access(join(destination, 'pnpm-lock.yaml')), { code: 'ENOENT' });
  await assert.rejects(access(join(destination, '.github/workflows/native.yml')), {
    code: 'ENOENT',
  });
});

test('rejects unsupported auth/database removal before writing destination', async (t) => {
  const options = await fixture(t);
  for (const omit of [['auth'], ['database'], ['unknown']]) {
    await assert.rejects(
      generateProject({ ...options, name: 'unsupported', omit }),
      /unsupported|requires/i,
    );
    await assert.rejects(access(join(options.cwd, 'unsupported')), { code: 'ENOENT' });
  }
});

test('copies marketplace catalogs without copying personal agent files', async (t) => {
  const options = await fixture(t);
  await mkdir(join(options.source, '.agents/plugins'), { recursive: true });
  await mkdir(join(options.source, '.agents/skills'), { recursive: true });
  await mkdir(join(options.source, '.claude-plugin'), { recursive: true });
  const catalog =
    '{"name":"idghst-fullstack","plugins":[{"name":"fullstack-starter","source":"./"}]}';
  await writeFile(join(options.source, '.agents/plugins/marketplace.json'), catalog);
  await writeFile(join(options.source, '.agents/plugins/personal.json'), 'private configuration');
  await writeFile(join(options.source, '.agents/skills/private.md'), 'private instructions');
  await writeFile(join(options.source, '.claude-plugin/marketplace.json'), catalog);
  const destination = await generateProject({ ...options, name: 'catalog-service' });
  assert.equal(
    await readFile(join(destination, '.agents/plugins/marketplace.json'), 'utf8'),
    catalog,
  );
  assert.equal(
    await readFile(join(destination, '.claude-plugin/marketplace.json'), 'utf8'),
    catalog,
  );
  await assert.rejects(access(join(destination, '.agents/plugins/personal.json')), {
    code: 'ENOENT',
  });
  await assert.rejects(access(join(destination, '.agents/skills')), { code: 'ENOENT' });
});

test('excludes framework-generated environment declarations', async (t) => {
  const options = await fixture(t);
  await writeFile(join(options.source, 'apps/web/next-env.d.ts'), 'generated Next.js declaration');
  await writeFile(join(options.source, 'apps/mobile/expo-env.d.ts'), 'generated Expo declaration');
  const destination = await generateProject({ ...options, name: 'clean-service' });
  await assert.rejects(access(join(destination, 'apps/web/next-env.d.ts')), { code: 'ENOENT' });
  await assert.rejects(access(join(destination, 'apps/mobile/expo-env.d.ts')), { code: 'ENOENT' });
});

test('rejects oversized unrelated files and leaves destination absent after failure', async (t) => {
  const options = await fixture(t);
  await writeFile(join(options.source, 'dump.bin'), Buffer.alloc(6 * 1024 * 1024));
  const destination = await generateProject({ ...options, name: 'lean-service' });
  await assert.rejects(access(join(destination, 'dump.bin')), { code: 'ENOENT' });
});
