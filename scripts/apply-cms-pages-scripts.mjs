import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

function loadEnv() {
  try {
    const text = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnv();
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('Missing DATABASE_URL or DIRECT_URL');
  process.exit(1);
}

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261027120000_cms_pages_scripts.sql'), 'utf8');
const client = new pg.Client({
  connectionString: url,
  ssl: /supabase\.com/i.test(url) ? { rejectUnauthorized: false } : undefined,
});
await client.connect();
await client.query(sql);
await client.end();
console.log('Applied cms pages / scripts migration.');
