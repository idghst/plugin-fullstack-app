import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  rmdir,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline/promises';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const excludedDirectories = new Set([
  '.git',
  'node_modules',
  '.next',
  '.turbo',
  '.expo',
  '.cache',
  'dist',
  'build',
  'coverage',
  'target',
  'artifacts',
  'test-results',
  'playwright-report',
  'ios',
  'android',
  '.DS_Store',
  'next-env.d.ts',
  'expo-env.d.ts',
]);
const rootDirectories = new Set([
  'apps',
  'packages',
  'tooling',
  'skills',
  'docs',
  'docker',
  '.github',
  '.agents',
  '.githooks',
  '.codex-plugin',
  '.claude-plugin',
  'templates',
  'assets',
]);
const rootFiles =
  /^(?:package\.json|pnpm-(?:workspace\.yaml|lock\.yaml)|turbo\.json|tsconfig[^/]*\.json|eslint\.config\.[cm]?[jt]s|prettier\.config\.[cm]?[jt]s|vitest\.config\.[cm]?[jt]s|playwright\.config\.[cm]?[jt]s|\.prettier(?:rc(?:\.[a-z]+)?|ignore)|\.gitignore|\.dockerignore|\.node-version|\.nvmrc|\.editorconfig|\.env(?:\.[a-z0-9-]+)?\.example|Dockerfile(?:\.[a-z-]+)?|(?:docker-)?compose(?:\.[a-z-]+)?\.ya?ml|AGENTS\.md|CLAUDE\.md|README\.md|LICENSE|plugin\.json)$/;

export async function generateProject({
  source = repository,
  cwd = process.cwd(),
  name,
  omit = [],
}) {
  if (typeof name !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(name))
    throw new Error(
      'Project name must be 1–64 lowercase letters, digits or hyphens and begin with a letter.',
    );
  for (const option of omit) {
    if (option === 'auth' || option === 'database')
      throw new Error(
        `This starter requires auth and database for owner-scoped CRUD and refresh sessions; --no-${option} is unsupported. See docs/generator.md.`,
      );
    if (!['web', 'mobile', 'desktop'].includes(option))
      throw new Error(`Unsupported option: ${option}`);
  }
  source = resolve(source);
  cwd = resolve(cwd);
  const destination = join(cwd, name);
  try {
    await lstat(destination);
    throw new Error(`Destination already exists: ${destination}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const stage = await mkdtemp(join(cwd, '.starter-stage-'));
  let reserved = false;
  try {
    const entries = await readdir(source);
    for (const entry of entries) {
      if (!rootDirectories.has(entry) && !rootFiles.test(entry)) continue;
      await cp(join(source, entry), join(stage, entry), {
        recursive: true,
        filter: async (path) => {
          const local = relative(source, path);
          const segments = local.split(sep);
          if (
            segments[0] === '.agents' &&
            !['.agents', '.agents/plugins', '.agents/plugins/marketplace.json'].includes(
              segments.join('/'),
            )
          )
            return false;
          if (segments.some((part) => excludedDirectories.has(part))) return false;
          if (segments[0] === 'apps' && omit.includes(segments[1])) return false;
          if (omit.includes('desktop') && segments.join('/') === '.github/workflows/native.yml')
            return false;
          const file = segments.at(-1);
          if (file.startsWith('.env') && !/^\.env(?:\.[a-z0-9-]+)*\.example$/.test(file))
            return false;
          if (
            /\.(?:pem|key|p12|pfx|sqlite|db|zip|tar|gz|dmg|apk|ipa)$/i.test(file) ||
            /^(?:credentials|secrets|token)(?:\.|$)/i.test(file) ||
            file === '.npmrc'
          )
            return false;
          const stat = await lstat(path);
          return !stat.isSymbolicLink() && (stat.isDirectory() || stat.size <= 5 * 1024 * 1024);
        },
      });
    }
    const packageFile = join(stage, 'package.json');
    const root = JSON.parse(await readFile(packageFile, 'utf8'));
    root.name = name;
    if (omit.includes('web')) {
      if (root.scripts?.dev)
        root.scripts.dev = root.scripts.dev.replace(/\s+--filter(?:=|\s+)@starter\/web\b/g, '');
      delete root.scripts?.['dev:web'];
      delete root.scripts?.['test:e2e'];
    }
    if (omit.includes('mobile')) delete root.scripts?.['dev:mobile'];
    if (omit.includes('desktop')) delete root.scripts?.['dev:desktop'];
    await writeFile(packageFile, `${JSON.stringify(root, null, 2)}\n`);
    if (omit.length) await rm(join(stage, 'pnpm-lock.yaml'), { force: true });
    // mkdir is exclusive: another creator cannot reserve the destination first.
    try {
      await mkdir(destination);
      reserved = true;
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error(`Destination already exists: ${destination}`);
      throw error;
    }
    // Move entries into the reserved directory; Windows cannot rename over that directory.
    for (const entry of await readdir(stage)) {
      await rename(join(stage, entry), join(destination, entry));
    }
    await rmdir(stage);
    return destination;
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    if (reserved) await rm(destination, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log(
      'Usage: pnpm create:project <project-name> [--no-web] [--no-mobile] [--no-desktop] [--interactive]\nAuth and PostgreSQL are required by this sample; --no-auth and --no-database fail explicitly.',
    );
    return;
  }
  let name;
  const omit = [];
  for (const arg of args) {
    if (arg === '--interactive') continue;
    if (/^--no-(web|mobile|desktop|auth|database)$/.test(arg)) omit.push(arg.slice(5));
    else if (arg.startsWith('-') || name) throw new Error(`Unknown argument: ${arg}`);
    else name = arg;
  }
  if (args.includes('--interactive')) {
    if (!process.stdin.isTTY)
      throw new Error(
        '--interactive requires a terminal. Supply a project name and flags in scripts/CI.',
      );
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    try {
      name ||= (await prompt.question('Project name: ')).trim();
      for (const app of ['web', 'mobile', 'desktop']) {
        if (
          !omit.includes(app) &&
          /^(?:n|no)$/i.test((await prompt.question(`Include ${app}? [Y/n] `)).trim())
        )
          omit.push(app);
      }
    } finally {
      prompt.close();
    }
  }
  const destination = await generateProject({ name, omit });
  console.log(
    `Created ${destination}\nNext: cd ${name} && pnpm install && pnpm env:setup\nThen follow README.md for PostgreSQL migration and development.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
