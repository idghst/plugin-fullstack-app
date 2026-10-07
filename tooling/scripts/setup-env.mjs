import { readFile, writeFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function setupEnvironment(root = process.cwd(), { database } = {}) {
  if (database === undefined) {
    try {
      database = JSON.parse(await readFile(join(root, 'starter.config.json'), 'utf8')).database;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  database ??= 'external';
  if (!['external', 'local'].includes(database))
    throw new Error(
      'Database profile must be external or local. Set private connection URLs in .env.',
    );
  const example = await readFile(join(root, '.env.example'), 'utf8');
  let privateEnv = example.replace(
    /^JWT_SECRET=\s*$/m,
    `JWT_SECRET=${randomBytes(32).toString('hex')}`,
  );
  for (const [key, local] of [
    ['DATABASE_URL', 'postgresql://starter:starter@localhost:55432/starter'],
    ['TEST_DATABASE_URL', 'postgresql://starter:starter@localhost:55433/starter_test'],
  ]) {
    const line = `${key}=${database === 'local' ? local : ''}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    privateEnv = pattern.test(privateEnv)
      ? privateEnv.replace(pattern, line)
      : `${privateEnv.trimEnd()}\n${line}\n`;
  }
  const sslLine = `DATABASE_SSL_MODE=${database === 'local' ? 'disable' : 'verify-full'}`;
  privateEnv = /^DATABASE_SSL_MODE=.*$/m.test(privateEnv)
    ? privateEnv.replace(/^DATABASE_SSL_MODE=.*$/m, sslLine)
    : `${privateEnv.trimEnd()}\n${sslLine}\n`;
  const files = [[join(root, '.env'), privateEnv]];
  for (const [app, prefix, filename] of [
    ['web', 'NEXT_PUBLIC_', '.env.local'],
    ['mobile', 'EXPO_PUBLIC_', '.env'],
    ['desktop', 'VITE_', '.env'],
  ]) {
    const directory = join(root, 'apps', app);
    try {
      await access(directory);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    let appExample = example;
    try {
      appExample = await readFile(join(directory, '.env.example'), 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const publicEnv = appExample
      .split('\n')
      .filter((line) => line.startsWith(prefix))
      .join('\n');
    if (publicEnv) files.push([join(directory, filename), `${publicEnv}\n`]);
  }
  const results = [];
  for (const [file, content] of files) {
    try {
      await writeFile(file, content, { flag: 'wx', mode: 0o600 });
      results.push({ file, created: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      results.push({ file, created: false });
    }
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const valid =
    args.length === 0 ||
    (args.length === 2 && args[0] === '--database' && ['external', 'local'].includes(args[1]));
  if (!valid) {
    console.error('Usage: pnpm env:setup [--database external|local]');
    process.exitCode = 1;
  } else
    setupEnvironment(process.cwd(), { database: args[1] })
      .then((results) => {
        for (const result of results)
          console.log(`${result.created ? 'Created' : 'Kept existing'} ${result.file}`);
        console.log(
          'Configure DATABASE_URL and a separate TEST_DATABASE_URL in private .env. Existing files are preserved. No database is started, migrated or seeded. See docs/database.md.',
        );
      })
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
}
