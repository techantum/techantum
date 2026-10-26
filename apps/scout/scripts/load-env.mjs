import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');

export function loadAppEnv(appDir) {
  loadEnvConfig(appDir);
  if (process.env.DATABASE_URL || process.env.DIRECT_URL) return;
  const parent = path.join(appDir, '../..');
  if (existsSync(path.join(parent, '.env')) || existsSync(path.join(parent, '.env.local'))) {
    loadEnvConfig(parent);
  }
}
