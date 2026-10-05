import { mkdir, readFile, readdir, lstat, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

export async function validatePlugin(root) {
  const portable = JSON.parse(await readFile(join(root, 'plugin.json'), 'utf8'));
  if (portable.$schema !== 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json')
    throw new Error('Portable manifest requires Agent Plugins 1.0 schema.');
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(portable.name) || !/^\d+\.\d+\.\d+$/.test(portable.version))
    throw new Error('Invalid plugin name or version.');
  for (const key of ['skills', 'mcpServers', 'apps', 'interface'])
    if (key in portable) throw new Error(`Portable manifest must not contain ${key}.`);
  const presentation = portable.extensions?.['com.openai']?.interface;
  if (!presentation || [...presentation.shortDescription].length > 30)
    throw new Error('Plugin shortDescription must be at most 30 characters.');
  for (const overlay of ['.codex-plugin', '.claude-plugin']) {
    const manifest = JSON.parse(await readFile(join(root, overlay, 'plugin.json'), 'utf8'));
    for (const key of ['name', 'version', 'description'])
      if (manifest[key] !== portable[key]) throw new Error(`${overlay} ${key} is out of sync.`);
    if ('mcpServers' in manifest || manifest.apps)
      throw new Error('This skills-only plugin must not declare apps or MCP servers.');
  }
  const skill = await readFile(join(root, 'skills', portable.name, 'SKILL.md'), 'utf8');
  if (
    !skill.startsWith('---\n') ||
    !skill.includes(`\nname: ${portable.name}\n`) ||
    !/\ndescription: .+\n/.test(skill)
  )
    throw new Error('Skill frontmatter must contain the matching name and description.');
  return portable;
}

function tarEntry(path, content) {
  if (Buffer.byteLength(path) > 100)
    throw new Error(`Plugin path exceeds portable tar limit: ${path}`);
  const header = Buffer.alloc(512);
  header.write(path, 0, 100);
  header.write('0000644\0', 100, 8);
  header.write('0000000\0', 108, 8);
  header.write('0000000\0', 116, 8);
  header.write(`${content.length.toString(8).padStart(11, '0')}\0`, 124, 12);
  header.write('00000000000\0', 136, 12);
  header.fill(32, 148, 156);
  header.write('0', 156, 1);
  header.write('ustar\0', 257, 6);
  header.write('00', 263, 2);
  const sum = header.reduce((total, byte) => total + byte, 0);
  header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 8);
  return Buffer.concat([header, content, Buffer.alloc((512 - (content.length % 512)) % 512)]);
}

export async function packagePlugin(root = process.cwd(), output = join(root, 'artifacts')) {
  const manifest = await validatePlugin(root);
  const entries = [];
  async function collect(local) {
    if (
      local
        .split('/')
        .some(
          (part) =>
            part.startsWith('.env') ||
            ['node_modules', '.git', '.cache', 'dist', 'build'].includes(part),
        )
    )
      return;
    const path = join(root, local);
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error(`Plugin package rejects symlinks: ${local}`);
    if (info.isDirectory()) {
      for (const entry of (await readdir(path)).sort()) await collect(`${local}/${entry}`);
    } else if (
      /\.(?:md|json|yaml|yml|svg|png|mjs)$/.test(local) &&
      !/(?:^|\/)(?:credentials|secrets|token)(?:\.|\/)/i.test(local)
    ) {
      if (info.size > 5 * 1024 * 1024) throw new Error(`Plugin file too large: ${local}`);
      entries.push(tarEntry(`${manifest.name}/${local}`, await readFile(path)));
    }
  }
  for (const path of [
    'plugin.json',
    '.codex-plugin/plugin.json',
    '.claude-plugin/plugin.json',
    'skills',
  ])
    await collect(path);
  for (const optional of ['LICENSE']) {
    try {
      entries.push(tarEntry(`${manifest.name}/${optional}`, await readFile(join(root, optional))));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const readme = `# Fullstack Starter Plugin\n\nVersion: ${manifest.version}\n\nThis is a skills-only plugin. Read skills/fullstack-starter/SKILL.md and its references to work in your own project. The archive does not contain the starter application source, package scripts or a hosted service.\n\nAgent Plugins 1.0 portable metadata is in plugin.json; Codex and Claude compatibility manifests are included. Install with your host's supported plugin flow. The inspector script is read-only and takes the target project path as its argument.\n`;
  entries.push(tarEntry(`${manifest.name}/README.md`, Buffer.from(readme)));
  await mkdir(output, { recursive: true });
  const archive = join(output, `${manifest.name}-${manifest.version}.tar.gz`);
  await writeFile(archive, gzipSync(Buffer.concat([...entries, Buffer.alloc(1024)])), {
    flag: 'wx',
  });
  return archive;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  packagePlugin()
    .then((archive) => console.log(`Created ${archive}`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
