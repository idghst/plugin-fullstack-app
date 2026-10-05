import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
async function catalog(path) {
  const exists = await access(join(root, path)).then(
    () => true,
    () => false,
  );
  assert.equal(exists, true, `${path} must exist`);
  return JSON.parse(await readFile(join(root, path), 'utf8'));
}

test('Codex marketplace resolves the existing root plugin with explicit install policy', async () => {
  const manifest = await catalog('plugin.json');
  const marketplace = await catalog('.agents/plugins/marketplace.json');
  assert.equal(marketplace.name, 'idghst-fullstack');
  assert.equal(typeof marketplace.interface.displayName, 'string');
  assert.equal(marketplace.plugins.length, 1);
  const plugin = marketplace.plugins[0];
  assert.equal(plugin.name, manifest.name);
  assert.deepEqual(plugin.source, { source: 'local', path: './' });
  assert.deepEqual(plugin.policy, { installation: 'AVAILABLE', authentication: 'ON_INSTALL' });
  assert.equal(plugin.category, 'Developer Tools');
  const pluginRoot = resolve(root, plugin.source.path);
  assert.equal(pluginRoot, root);
  await access(join(pluginRoot, '.codex-plugin/plugin.json'));
  await access(join(pluginRoot, 'skills', plugin.name, 'SKILL.md'));
});

test('Claude marketplace matches identity and description and resolves the existing root plugin', async () => {
  const manifest = await catalog('.claude-plugin/plugin.json');
  const marketplace = await catalog('.claude-plugin/marketplace.json');
  assert.equal(marketplace.name, 'idghst-fullstack');
  assert.deepEqual(marketplace.owner, { name: 'idghst' });
  assert.equal(typeof marketplace.description, 'string');
  assert.ok(marketplace.description.length > 0);
  assert.equal(marketplace.plugins.length, 1);
  const plugin = marketplace.plugins[0];
  assert.equal(plugin.name, manifest.name);
  assert.equal(plugin.description, manifest.description);
  assert.equal(plugin.source, './');
  const pluginRoot = resolve(root, plugin.source);
  assert.equal(pluginRoot, root);
  await access(join(pluginRoot, '.claude-plugin/plugin.json'));
  await access(join(pluginRoot, 'skills', plugin.name, 'SKILL.md'));
});
