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

const files = [
  'supabase/migrations/20261007120000_finance.sql',
  'supabase/migrations/20261007140000_finance_receipts_clients_payslips.sql',
];
const client = new pg.Client({ connectionString: url, ssl: /supabase\.com/i.test(url) ? { rejectUnauthorized: false } : undefined });
await client.connect();
for (const file of files) {
  const sql = readFileSync(resolve(process.cwd(), file), 'utf8');
  await client.query(sql);
  console.log(`applied ${file}`);
}
const { rows } = await client.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'finance_%' ORDER BY table_name`
);
console.log(`finance tables ready: ${rows.map((r) => r.table_name).join(', ')}`);
await client.end();
