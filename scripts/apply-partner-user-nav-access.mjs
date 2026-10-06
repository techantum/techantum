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
  throw new Error('Cannot find package pg.');
}

const pg = loadPg();
const text = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
for (const raw of text.split(/\r?\n/)) {
  const line = raw.replace(/^\uFEFF/, '').trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq <= 0) continue;
  const key = line.slice(0, eq).trim();
  let val = line.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  if (!process.env[key]?.trim()) process.env[key] = val;
}

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('Missing database URL');
  process.exit(1);
}

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261006140000_partner_user_nav_access.sql'), 'utf8');
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(sql);
const { rows } = await client.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name = 'partner_users' AND column_name = 'nav_access'`
);
console.log(rows.length ? 'partner_users.nav_access is ready' : 'column missing');
await client.end();
