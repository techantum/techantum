import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(appDir, '.env');

function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\uFEFF/, '');
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    let value = line.slice(eq + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[line.slice(0, eq).trim()] = value;
  }
  return out;
}

function writeEnv(map) {
  const header = [
    '# AI Lead CRM — independent product configuration.',
    '# Database is the dedicated ai_crm Postgres instance.',
    '# Provider API keys may still be mapped from a local secrets file.',
    '# Do not commit this file.',
    '',
  ];
  const lines = Object.entries(map).map(([key, value]) => {
    const needsQuote = /[\n#\s]/.test(value);
    return `${key}=${needsQuote ? JSON.stringify(value) : value}`;
  });
  writeFileSync(envPath, `${header.join('\n')}${lines.join('\n')}\n`);
}

function run(command, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: appDir, stdio: ['pipe', 'inherit', 'inherit'], shell: false });
    if (input) child.stdin.end(input);
    else child.stdin.end();
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
  });
}

const current = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
const sourceUrl = current.CRM_DIRECT_URL || current.DIRECT_URL || current.CRM_DATABASE_URL || current.DATABASE_URL || '';
const password = current.CRM_DB_PASSWORD && !/supabase\.com/i.test(current.CRM_DATABASE_URL || '')
  ? current.CRM_DB_PASSWORD
  : randomBytes(18).toString('hex');
const localUrl = `postgresql://ai_crm:${password}@127.0.0.1:5433/ai_crm`;

current.CRM_DATA_ISOLATED = 'true';
current.CRM_DB_PASSWORD = password;
current.CRM_DATABASE_URL = localUrl;
current.CRM_DIRECT_URL = localUrl;
delete current.DATABASE_URL;
delete current.DIRECT_URL;
writeEnv(current);

await run('docker', ['compose', 'up', '-d', 'ai-crm-db']);

const source = sourceUrl.includes('sslmode=') ? sourceUrl : `${sourceUrl}${sourceUrl.includes('?') ? '&' : '?'}sslmode=require`;
let copied = false;
if (/supabase\.com/i.test(sourceUrl)) {
  try {
    const dump = await new Promise((resolve, reject) => {
      const child = spawn('docker', ['run', '--rm', 'postgres:17-alpine', 'pg_dump', source, '--schema=crm', '--no-owner', '--no-acl'], {
        cwd: appDir,
      });
      const chunks = [];
      let error = '';
      child.stdout.on('data', (chunk) => chunks.push(chunk));
      child.stderr.on('data', (chunk) => {
        error += chunk.toString();
      });
      child.on('exit', (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(error || `pg_dump exited ${code}`))));
    });
    await run('docker', ['compose', 'exec', '-T', 'ai-crm-db', 'psql', '-U', 'ai_crm', '-d', 'ai_crm', '-v', 'ON_ERROR_STOP=1'], dump);
    copied = true;
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : 'dump failed';
    console.log(`copy skipped: ${message.replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted]')}`);
  }
}

console.log(copied ? 'isolated database ready with copied crm schema' : 'isolated database ready; migrations will create the schema');
