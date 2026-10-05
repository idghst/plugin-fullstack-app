import { spawnSync } from 'node:child_process';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

export function isSensitivePath(path) {
  const name = basename(path);
  return (
    (name.startsWith('.env') && !/^\.env(?:\.[a-z0-9-]+)*\.example$/.test(name)) ||
    /\.(?:pem|key|p12|pfx)$/i.test(name) ||
    /^(?:credentials|secrets)(?:\.|$)/i.test(name)
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const diff = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], {
    encoding: 'utf8',
  });
  if (diff.status !== 0) {
    console.error(diff.stderr);
    process.exit(diff.status ?? 1);
  }
  const files = diff.stdout.split('\0').filter(Boolean);
  const blocked = files.filter(isSensitivePath);
  if (blocked.length) {
    console.error(`Private files cannot be committed:\n${blocked.join('\n')}`);
    process.exit(1);
  }
  if (files.length) {
    const prettier = createRequire(import.meta.url).resolve('prettier/bin/prettier.cjs');
    const checked = spawnSync(
      process.execPath,
      [prettier, '--check', '--ignore-unknown', '--', ...files],
      { stdio: 'inherit' },
    );
    process.exitCode = checked.status ?? 1;
  }
}
