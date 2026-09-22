/**
 * Applies supabase/migrations/20260922180000_meta_ads.sql using DIRECT_URL.
 * Usage: npx --yes -p pg node scripts/apply-meta-ads-migration.mjs
 */
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';

function loadPg() {
  const roots = [process.env.NODE_PATH, resolve(process.cwd(), 'node_modules')].filter(Boolean);
  for (const root of roots) {
    try {
      const require = createRequire(pathToFileURL(join(root, 'pg/package.json')));
      return require('pg');
    } catch {
      /* try next */
    }
  }
  throw new Error('Cannot find package pg. Install it in a temp node_modules and set NODE_PATH.');
}

const pg = loadPg();

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\uFEFF/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]?.trim()) process.env[key] = val;
  }
}

loadEnv();

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('Missing DIRECT_URL / DATABASE_URL in .env');
  process.exit(1);
}

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260922180000_meta_ads.sql'), 'utf8');
const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  const { rows } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE 'meta_ads_%'
    ORDER BY table_name
  `);
  console.log(`Meta Ads tables ready: ${rows.map((row) => row.table_name).join(', ')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
