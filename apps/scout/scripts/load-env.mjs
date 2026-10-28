import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');

function applyMissingFromFile(file) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!value) continue;
    if (!String(process.env[match[1]] || '').trim()) process.env[match[1]] = value;
  }
}

export function loadAppEnv(appDir) {
  loadEnvConfig(appDir);
  const parent = path.join(appDir, '../..');
  applyMissingFromFile(path.join(parent, '.env'));
  applyMissingFromFile(path.join(parent, '.env.local'));
}
