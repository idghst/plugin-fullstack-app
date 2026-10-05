import { readFile, readdir, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const expectedCommands = [
  'dev',
  'lint',
  'typecheck',
  'test',
  'test:integration',
  'test:e2e',
  'build',
  'check',
  'db:migrate',
  'env:setup',
];

// Read manifests only. Never execute scripts or read private environment files.
export async function inspectProject(directory = process.cwd()) {
  const root = resolve(directory);
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const workspaces = [];
  for (const group of ['apps', 'packages']) {
    let entries;
    try {
      entries = await readdir(join(root, group));
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    for (const entry of entries.sort()) {
      const path = join(root, group, entry);
      if (!(await lstat(path)).isDirectory()) continue;
      let workspace;
      try {
        workspace = JSON.parse(await readFile(join(path, 'package.json'), 'utf8'));
      } catch (error) {
        if (error.code === 'ENOENT') continue;
        throw error;
      }
      workspaces.push({
        path: `${group}/${entry}`,
        name: workspace.name,
        commands: Object.keys(workspace.scripts ?? {}).sort(),
        workspaceDependencies: Object.entries(workspace.dependencies ?? {})
          .filter(([, version]) => String(version).startsWith('workspace:'))
          .map(([name]) => name)
          .sort(),
      });
    }
  }
  const availableCommands = Object.keys(manifest.scripts ?? {}).sort();
  return {
    root,
    project: {
      name: manifest.name,
      packageManager: manifest.packageManager,
      engines: manifest.engines ?? {},
    },
    availableCommands,
    missingCommands: expectedCommands.filter((command) => !availableCommands.includes(command)),
    workspaces,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  inspectProject(process.argv[2])
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
