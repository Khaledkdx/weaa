import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const collection = require('@iconify-json/solar/icons.json');
const root = fileURLToPath(new URL('../src/', import.meta.url));
const names = new Set();

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(file);
    else if (/\.tsx?$/.test(entry.name)) {
      const source = await readFile(file, 'utf8');
      for (const match of source.matchAll(/solar:([a-z0-9-]+)/g)) names.add(match[1]);
    }
  }
}

await collect(root);
const icons = Object.fromEntries([...names].sort().map(name => {
  const icon = collection.icons[name];
  if (!icon) throw new Error(`Unknown Solar icon: ${name}`);
  return [name, icon];
}));
await writeFile(path.join(root, 'solar-icons.json'), `${JSON.stringify({
  prefix: 'solar', width: collection.width, height: collection.height, icons,
}, null, 2)}\n`);
console.log(`Bundled ${names.size} Solar icons for offline rendering.`);
