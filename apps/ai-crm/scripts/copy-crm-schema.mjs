import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = readFileSync(path.join(appDir, '../..', '.env'), 'utf8');
const line = parent.split(/\r?\n/).find((entry) => entry.startsWith('DIRECT_URL='));
if (!line) {
  console.log('no source database url');
  process.exit(1);
}
let source = line.slice('DIRECT_URL='.length);
if ((source.startsWith('"') && source.endsWith('"')) || (source.startsWith("'") && source.endsWith("'"))) {
  source = source.slice(1, -1);
}
if (!source.includes('sslmode=')) source += `${source.includes('?') ? '&' : '?'}sslmode=require`;

const dump = await new Promise((resolve, reject) => {
  const child = spawn('docker', ['run', '--rm', 'postgres:17-alpine', 'pg_dump', source, '--schema=crm', '--no-owner', '--no-acl'], { cwd: appDir });
  const chunks = [];
  let error = '';
  child.stdout.on('data', (chunk) => chunks.push(chunk));
  child.stderr.on('data', (chunk) => {
    error += chunk.toString();
  });
  child.on('exit', (code) => {
    if (code === 0) resolve(Buffer.concat(chunks));
    else reject(new Error(error.replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted]').split('\n')[0] || `pg_dump exited ${code}`));
  });
});

await new Promise((resolve, reject) => {
  const child = spawn('docker', ['compose', 'exec', '-T', 'ai-crm-db', 'psql', '-U', 'ai_crm', '-d', 'ai_crm', '-v', 'ON_ERROR_STOP=1'], {
    cwd: appDir,
  });
  let error = '';
  child.stderr.on('data', (chunk) => {
    error += chunk.toString();
  });
  child.stdin.end(dump);
  child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(error.split('\n').slice(0, 4).join(' ') || `psql exited ${code}`))));
});
console.log(`copied crm schema (${dump.length} bytes)`);
