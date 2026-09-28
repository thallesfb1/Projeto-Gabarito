import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

for (const entry of ['dist', 'dist-standalone', 'server.js']) {
  await rm(resolve(projectRoot, entry), { recursive: true, force: true });
}

console.log('Artefatos de build removidos.');
