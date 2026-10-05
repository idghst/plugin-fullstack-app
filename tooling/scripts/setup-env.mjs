import { readFile, writeFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function setupEnvironment(root = process.cwd()) {
  const example = await readFile(join(root, '.env.example'), 'utf8');
  const privateEnv = example.replace(
    /^JWT_SECRET=\s*$/m,
    `JWT_SECRET=${randomBytes(32).toString('hex')}`,
  );
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
      .filter(
        (line) => line.startsWith(prefix) || (app === 'web' && line.startsWith('API_BASE_URL=')),
      )
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
  setupEnvironment()
    .then((results) => {
      for (const result of results)
        console.log(`${result.created ? 'Created' : 'Kept existing'} ${result.file}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
