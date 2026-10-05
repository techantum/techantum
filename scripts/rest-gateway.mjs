#!/usr/bin/env node
/**
 * Local PostgREST gateway.
 * Supabase HTTP is restricted (cached egress quota) but Postgres still works.
 * This process:
 *   1. Starts PostgREST against DIRECT_URL
 *   2. Proxies /rest/v1/* to PostgREST so supabase-js keeps working
 */
import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnv(path.join(root, '.env'));

const POSTGREST_BIN = process.env.POSTGREST_BIN || path.join(root, 'bin/postgrest');
const POSTGREST_HOST = '127.0.0.1';
const POSTGREST_PORT = Number(process.env.POSTGREST_PORT || 3051);
const GATEWAY_PORT = Number(process.env.LOCAL_REST_PORT || 3050);
const jwtSecret = process.env.POSTGREST_JWT_SECRET?.trim();
const dbUri = withSsl(process.env.DIRECT_URL || process.env.DATABASE_URL || '');

if (!dbUri) {
  console.error('[rest-gateway] DIRECT_URL / DATABASE_URL is missing');
  process.exit(1);
}
if (!jwtSecret) {
  console.error('[rest-gateway] POSTGREST_JWT_SECRET is missing');
  process.exit(1);
}
if (!fs.existsSync(POSTGREST_BIN)) {
  console.error('[rest-gateway] postgrest binary not found at', POSTGREST_BIN);
  process.exit(1);
}

const postgrest = spawn(
  POSTGREST_BIN,
  [],
  {
    env: {
      ...process.env,
      PGRST_DB_URI: dbUri,
      PGRST_DB_SCHEMAS: 'public',
      PGRST_DB_ANON_ROLE: 'anon',
      PGRST_DB_EXTRA_SEARCH_PATH: 'public, extensions',
      PGRST_DB_AGGREGATES_ENABLED: 'true',
      PGRST_SERVER_HOST: POSTGREST_HOST,
      PGRST_SERVER_PORT: String(POSTGREST_PORT),
      PGRST_JWT_SECRET: jwtSecret,
      PGRST_ROLE_CLAIM_KEY: '$.role',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  }
);

postgrest.stdout.on('data', (chunk) => process.stdout.write(`[postgrest] ${chunk}`));
postgrest.stderr.on('data', (chunk) => process.stderr.write(`[postgrest] ${chunk}`));
postgrest.on('exit', (code, signal) => {
  console.error('[rest-gateway] postgrest exited', { code, signal });
  process.exit(code || 1);
});

const hopByHop = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
]);

const server = http.createServer((req, res) => {
  const incoming = req.url || '/';
  const url = new URL(incoming, `http://${POSTGREST_HOST}:${GATEWAY_PORT}`);
  let targetPath = url.pathname;
  if (targetPath === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (targetPath.startsWith('/rest/v1')) {
    targetPath = targetPath.slice('/rest/v1'.length) || '/';
  }
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || hopByHop.has(key.toLowerCase())) continue;
    headers[key] = value;
  }
  headers.host = `${POSTGREST_HOST}:${POSTGREST_PORT}`;

  const proxy = http.request(
    {
      hostname: POSTGREST_HOST,
      port: POSTGREST_PORT,
      path: `${targetPath}${url.search}`,
      method: req.method,
      headers,
    },
    (upstream) => {
      const outHeaders = { ...upstream.headers };
      delete outHeaders.connection;
      res.writeHead(upstream.statusCode || 502, outHeaders);
      upstream.pipe(res);
    }
  );
  proxy.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'local rest gateway unavailable', detail: err.message }));
  });
  req.pipe(proxy);
});

server.listen(GATEWAY_PORT, '127.0.0.1', () => {
  console.log(`[rest-gateway] listening on 127.0.0.1:${GATEWAY_PORT} -> postgrest ${POSTGREST_PORT}`);
});

function shutdown() {
  server.close();
  postgrest.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function withSsl(uri) {
  if (!uri) return uri;
  if (/sslmode=/i.test(uri)) return uri;
  return uri.includes('?') ? `${uri}&sslmode=require` : `${uri}?sslmode=require`;
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const map = new Map();
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const key = line.slice(0, i).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = line.slice(i + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!map.has(key)) map.set(key, val);
  }
  for (const [key, val] of map) {
    if (process.env[key] == null) process.env[key] = val;
  }
}
