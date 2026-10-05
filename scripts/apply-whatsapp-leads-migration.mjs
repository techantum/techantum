/**
 * Applies WhatsApp leads pipeline + AI provider organization migrations using DIRECT_URL.
 * Usage: NODE_PATH=./node_modules node scripts/apply-whatsapp-leads-migration.mjs
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

const files = [
  'supabase/migrations/20260926120000_whatsapp_leads_pipeline.sql',
  'supabase/migrations/20260926121000_ai_provider_organization.sql',
];

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  for (const file of files) {
    const sql = readFileSync(resolve(process.cwd(), file), 'utf8');
    await client.query(sql);
    console.log(`Applied ${file}`);
  }
  const { rows: stages } = await client.query(`
    SELECT lead_stage, COUNT(*)::int AS count
    FROM public.whatsapp_conversations
    GROUP BY lead_stage
    ORDER BY lead_stage
  `);
  const { rows: orgCol } = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_provider_credentials'
      AND column_name = 'organization_id'
  `);
  console.log('Conversation stages:', stages.map((row) => `${row.lead_stage}=${row.count}`).join(', '));
  console.log(orgCol.length ? 'organization_id column ready' : 'organization_id column missing');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
