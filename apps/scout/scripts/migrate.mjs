import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadAppEnv } from './load-env.mjs';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
loadAppEnv(appDir);

const dir = path.join(appDir, 'supabase/migrations');
const files = fs.readdirSync(dir).filter((name) => name.endsWith('.sql')).sort();
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL or DIRECT_URL is missing. Put it in .env in this folder (or copy the parent .env with npm run env:copy).');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: /supabase\.com/i.test(url) ? { rejectUnauthorized: false } : undefined,
});
await client.connect();
for (const file of files) {
  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  process.stdout.write(`Applying ${file}… `);
  await client.query(sql);
  console.log('ok');
}
await client.end();
console.log(`Applied ${files.length} Revealeo migrations.`);
