import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export function checkSource(path, source) {
  const errors = [];
  const imports = [
    ...source.matchAll(/(?:from\s*|import\s*\(|require\s*\(|import\s*)['"]([^'"]+)['"]/g),
  ].map((match) => match[1]);
  const pureDomain = path.startsWith('packages/core/') || path.includes('/domain/');
  const application = path.includes('/application/');
  const consumer =
    /^apps\/(web|mobile|desktop)\//.test(path) ||
    /^packages\/(api-client|auth|contracts|ui)\//.test(path);
  for (const specifier of imports) {
    if (
      pureDomain &&
      !specifier.startsWith('.') &&
      !(path.includes('/domain/') && specifier === '@starter/core')
    )
      errors.push(`${path}: Domain must use only pure local TypeScript imports (${specifier})`);
    if (application && /@starter\/db|drizzle|@nestjs|\/infrastructure\//.test(specifier))
      errors.push(`${path}: Application imports Infrastructure/framework (${specifier})`);
    if (
      consumer &&
      /@starter\/db|\/db\/|(?:^|\/)apps\/api(?:\/|$)|^@starter\/api(?:\/|$)/.test(specifier)
    )
      errors.push(`${path}: Client imports server-only code (${specifier})`);
  }
  return errors;
}

async function inspect(directory, root) {
  const errors = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.next', '.expo', 'target', '.turbo'].includes(entry.name))
      continue;
    const full = resolve(directory, entry.name);
    if (entry.isDirectory()) errors.push(...(await inspect(full, root)));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name))
      errors.push(
        ...checkSource(relative(root, full).replaceAll('\\', '/'), await readFile(full, 'utf8')),
      );
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve(import.meta.dirname, '../..');
  const errors = [
    ...(await inspect(resolve(root, 'apps'), root)),
    ...(await inspect(resolve(root, 'packages'), root)),
  ];
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else console.log('Architecture boundaries verified.');
}
