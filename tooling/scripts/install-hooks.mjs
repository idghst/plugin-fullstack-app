import { spawnSync } from 'node:child_process';
import { chmod } from 'node:fs/promises';

const current = spawnSync('git', ['config', '--get', 'core.hooksPath'], { encoding: 'utf8' });
const path = current.stdout.trim();
if (path && path !== '.githooks')
  throw new Error(
    `Existing Git hooks retained (${path}); integrate .githooks/pre-commit manually.`,
  );
await chmod('.githooks/pre-commit', 0o755);
const result = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('Installed repository-local Git hook.');
