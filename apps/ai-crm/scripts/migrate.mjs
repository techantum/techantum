import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadAppEnv } from './load-env.mjs';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
loadAppEnv(appDir);

function loadPg() {
  const roots = [process.env.NODE_PATH, path.resolve(appDir, 'node_modules'), path.resolve(appDir, '../../node_modules')].filter(Boolean);
  for (const root of roots) {
    try {
      const require = createRequire(pathToFileURL(path.join(root, 'pg/package.json')));
      return require('pg');
    } catch {
      /* next */
    }
  }
  throw new Error('Cannot find package pg. Run npm install in apps/ai-crm or the monorepo root.');
}

const url = process.env.CRM_DIRECT_URL || process.env.DIRECT_URL || process.env.CRM_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('Missing CRM_DATABASE_URL / DATABASE_URL');
  process.exit(1);
}

const pg = loadPg();
const client = new pg.Client({
  connectionString: url,
  ssl: /supabase\.com/i.test(url) ? { rejectUnauthorized: false } : undefined,
});

const dir = path.join(appDir, 'supabase/migrations');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

await client.connect();
await client.query(`CREATE SCHEMA IF NOT EXISTS crm`);
await client.query(`
  CREATE TABLE IF NOT EXISTS crm.schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

for (const file of files) {
  const { rows } = await client.query(`SELECT 1 FROM crm.schema_migrations WHERE filename=$1`, [file]);
  if (rows.length) {
    console.log(`skip ${file}`);
    continue;
  }
  const sql = readFileSync(path.join(dir, file), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(`INSERT INTO crm.schema_migrations (filename) VALUES ($1)`, [file]);
    await client.query('COMMIT');
    console.log(`applied ${file}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`failed ${file}`, error);
    process.exit(1);
  }
}

await client.end();
console.log('AI CRM migrations complete (schema: crm).');
