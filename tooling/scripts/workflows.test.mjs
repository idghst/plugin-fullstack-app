import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

let setupEnvironment, packagePlugin, validatePlugin, inspectProject;
try {
  ({ setupEnvironment } = await import('./setup-env.mjs'));
} catch (e) {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
}
try {
  ({ packagePlugin, validatePlugin } = await import('./package-plugin.mjs'));
} catch (e) {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
}
async function temp(t) {
  const root = await mkdtemp(join(tmpdir(), 'starter-workflow-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

try {
  ({ inspectProject } = await import('../../skills/fullstack-starter/scripts/inspect-project.mjs'));
} catch (e) {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
}

test('creates ignored private env with random secret and public-only client variables', async (t) => {
  assert.equal(typeof setupEnvironment, 'function', 'env setup must exist');
  const root = await temp(t);
  await writeFile(
    join(root, '.env.example'),
    'JWT_SECRET=\nDATABASE_URL=postgresql://local\nNEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1\n',
  );
  await mkdir(join(root, 'apps/web'), { recursive: true });
  await setupEnvironment(root);
  const env = await readFile(join(root, '.env'), 'utf8');
  assert.match(env, /JWT_SECRET=[a-f0-9]{64}/);
  assert.equal((await stat(join(root, '.env'))).mode & 0o777, 0o600);
  const client = await readFile(join(root, 'apps/web/.env.local'), 'utf8');
  assert.equal(client, 'NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1\n');
  assert.doesNotMatch(client, /JWT_SECRET|DATABASE_URL/);
});

test('env setup never overwrites a developer existing file', async (t) => {
  assert.equal(typeof setupEnvironment, 'function', 'env setup must exist');
  const root = await temp(t);
  await writeFile(join(root, '.env.example'), 'JWT_SECRET=\n');
  await writeFile(join(root, '.env'), 'JWT_SECRET=existing\n');
  await setupEnvironment(root);
  assert.equal(await readFile(join(root, '.env'), 'utf8'), 'JWT_SECRET=existing\n');
});

test('web env respects app example public names without server variables or secrets', async (t) => {
  assert.equal(typeof setupEnvironment, 'function', 'env setup must exist');
  const root = await temp(t);
  await writeFile(
    join(root, '.env.example'),
    'JWT_SECRET=\nNEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1\n',
  );
  await mkdir(join(root, 'apps/web'), { recursive: true });
  await writeFile(
    join(root, 'apps/web/.env.example'),
    'API_BASE_URL=http://localhost:4000/api/v1\nNEXT_PUBLIC_API_URL=http://localhost:4000/api/v1\nJWT_SECRET=never-copy\n',
  );
  await setupEnvironment(root);
  const env = await readFile(join(root, 'apps/web/.env.local'), 'utf8');
  assert.doesNotMatch(env, /^API_BASE_URL=/m);
  assert.match(env, /NEXT_PUBLIC_API_URL=http/);
  assert.doesNotMatch(env, /JWT_SECRET|never-copy/);
});

test('validates synchronized portable manifests and packages only skill files', async (t) => {
  assert.equal(typeof packagePlugin, 'function', 'plugin packager must exist');
  const root = await temp(t);
  const identity = {
    name: 'fullstack-starter',
    version: '0.1.0',
    description: 'Reusable fullstack development skill',
    author: { name: 'Fullstack Starter contributors' },
  };
  await writeFile(
    join(root, 'plugin.json'),
    JSON.stringify({
      ...identity,
      $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
      extensions: {
        'com.openai': {
          interface: { displayName: 'Fullstack Starter', shortDescription: 'Build fullstack apps' },
        },
      },
    }),
  );
  for (const overlay of ['.codex-plugin', '.claude-plugin']) {
    await mkdir(join(root, overlay));
    await writeFile(join(root, overlay, 'plugin.json'), JSON.stringify(identity));
  }
  await mkdir(join(root, 'skills/fullstack-starter'), { recursive: true });
  await writeFile(
    join(root, 'skills/fullstack-starter/SKILL.md'),
    '---\nname: fullstack-starter\ndescription: Build fullstack apps\n---\nRead references.\n',
  );
  await writeFile(join(root, 'skills/fullstack-starter/.env'), 'SECRET=private');
  await writeFile(
    join(root, 'skills/fullstack-starter/.env.fixture.json'),
    '{"SECRET":"private-nested-json"}',
  );
  await mkdir(join(root, 'skills/fullstack-starter/scripts'));
  await writeFile(
    join(root, 'skills/fullstack-starter/scripts/inspect-project.mjs'),
    'export const inspected = true;',
  );
  await writeFile(join(root, 'unrelated.txt'), 'unrelated');
  const archive = await packagePlugin(root, join(root, 'out'));
  const tar = gunzipSync(await readFile(archive)).toString();
  assert.match(tar, /fullstack-starter\/plugin.json/);
  assert.match(tar, /\.codex-plugin\/plugin.json/);
  assert.match(tar, /skills\/fullstack-starter\/SKILL.md/);
  assert.match(tar, /skills\/fullstack-starter\/scripts\/inspect-project.mjs/);
  assert.doesNotMatch(tar, /SECRET=private|unrelated.txt/);
  assert.ok(!tar.includes('private-nested-json'), 'env files with JSON suffix must be excluded');
  const portable = JSON.parse(await readFile(join(root, 'plugin.json'), 'utf8'));
  portable.version = '0.2.0';
  await writeFile(join(root, 'plugin.json'), JSON.stringify(portable));
  await assert.rejects(validatePlugin(root), /version/i);
});

test('skill inspector reports actual manifests without reading private env', async (t) => {
  assert.equal(typeof inspectProject, 'function', 'skill inspector must exist');
  const root = await temp(t);
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'example',
      packageManager: 'pnpm@10.32.1',
      scripts: { test: 'node --test' },
    }),
  );
  await mkdir(join(root, 'apps/api'), { recursive: true });
  await writeFile(
    join(root, 'apps/api/package.json'),
    JSON.stringify({ name: '@starter/api', scripts: { dev: 'tsx src/main.ts' } }),
  );
  await writeFile(join(root, '.env'), 'JWT_SECRET=must-not-report');
  const result = await inspectProject(root);
  assert.equal(result.project.name, 'example');
  assert.equal(result.workspaces[0].name, '@starter/api');
  assert.deepEqual(result.availableCommands, ['test']);
  assert.ok(result.missingCommands.includes('typecheck'));
  assert.doesNotMatch(JSON.stringify(result), /must-not-report|JWT_SECRET/);
});
