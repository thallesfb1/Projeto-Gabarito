import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(projectRoot, 'dist-standalone', 'index.html');
const targets = [
  resolve(projectRoot, 'public', 'gabarito-offline.html'),
  resolve(projectRoot, 'gabarito.html'),
];

if (!process.argv.includes('--standalone-only')) {
  targets.unshift(resolve(projectRoot, 'dist', 'gabarito-offline.html'));
}

for (const target of targets) {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}

console.log(`Arquivo offline atualizado em ${targets.length} destino(s).`);
