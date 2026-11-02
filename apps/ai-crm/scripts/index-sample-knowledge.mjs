import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadAppEnv } from './load-env.mjs';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
loadAppEnv(appDir);
const require = createRequire(pathToFileURL(path.join(appDir, 'node_modules/pg/package.json')));
const pg = require('pg');
const url = process.env.CRM_DIRECT_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
const client = new pg.Client({ connectionString: url, ssl: /supabase\.com/i.test(url) ? { rejectUnauthorized: false } : undefined });
await client.connect();
const doc = (
  await client.query(`SELECT id, workspace_id, agent_id, content FROM crm.knowledge_documents WHERE id=$1`, [
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  ])
).rows[0];
if (!doc) {
  console.log('sample knowledge document not found');
  await client.end();
  process.exit(0);
}
const vector = new Array(32).fill(0);
for (let i = 0; i < doc.content.length; i += 1) vector[i % 32] += doc.content.charCodeAt(i) / 255;
await client.query(`DELETE FROM crm.knowledge_chunks WHERE document_id=$1`, [doc.id]);
await client.query(
  `INSERT INTO crm.knowledge_chunks (workspace_id, document_id, agent_id, chunk_index, content, embedding, token_estimate)
   VALUES ($1,$2,$3,0,$4,$5::jsonb,$6)`,
  [doc.workspace_id, doc.id, doc.agent_id, doc.content, JSON.stringify(vector), Math.ceil(doc.content.length / 4)],
);
console.log(JSON.stringify({ chunks: 1 }));
await client.end();
