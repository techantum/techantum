import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(appDir, '.env');
if (existsSync(dest)) {
  console.log('.env already exists.');
  process.exit(0);
}
const parent = path.join(appDir, '../..', '.env');
if (!existsSync(parent)) {
  console.error('No parent .env found. Copy .env.example to .env and fill in values.');
  process.exit(1);
}
copyFileSync(parent, dest);
console.log('Copied the parent .env into this folder. You can keep using the same keys after you move Revealeo.');
