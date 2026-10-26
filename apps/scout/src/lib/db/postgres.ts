import { Pool, type QueryResultRow } from 'pg';

const globalForPg = globalThis as typeof globalThis & { revealeoPgPool?: Pool };

function trimEnv(name: string) {
  return (process.env[name] || '').trim();
}

function portOf(connectionString: string) {
  try {
    return Number(new URL(connectionString).port || '5432');
  } catch {
    return 0;
  }
}

function isSupabasePooler(connectionString: string) {
  return /pooler\.supabase\.com/i.test(connectionString) || /pgbouncer=true/i.test(connectionString);
}

/** Session-mode pooler (Supabase port 5432) allows about 15 clients total — not per app. */
function isSessionPooler(connectionString: string) {
  return /pooler\.supabase\.com/i.test(connectionString) && portOf(connectionString) === 5432;
}

function isTransactionPooler(connectionString: string) {
  return portOf(connectionString) === 6543 || /pgbouncer=true/i.test(connectionString);
}

/**
 * App traffic must use the transaction pooler (DATABASE_URL, port 6543).
 * DIRECT_URL on *.pooler.supabase.com:5432 is session mode and is why EMAXCONNSESSION appears.
 */
function getConnectionString() {
  const pooled = trimEnv('DATABASE_URL');
  const direct = trimEnv('DIRECT_URL');
  if (pooled && isTransactionPooler(pooled)) return pooled;
  if (direct && !isSessionPooler(direct)) return direct;
  if (pooled) return pooled;
  return direct;
}

function poolMax(connectionString: string) {
  const configured = Number(process.env.PG_POOL_MAX);
  const hardCap = isSessionPooler(connectionString) ? 2 : 3;
  if (Number.isFinite(configured) && configured > 0) {
    return Math.min(hardCap, Math.max(1, configured));
  }
  return isSupabasePooler(connectionString) ? Math.min(3, hardCap) : 4;
}

export function getPool(): Pool {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error('DIRECT_URL or DATABASE_URL is not set');
  }
  const max = poolMax(connectionString);
  if (globalForPg.revealeoPgPool && globalForPg.revealeoPgPool.options.max !== max) {
    void globalForPg.revealeoPgPool.end().catch(() => undefined);
    globalForPg.revealeoPgPool = undefined;
  }
  if (!globalForPg.revealeoPgPool) {
    globalForPg.revealeoPgPool = new Pool({
      connectionString,
      max,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
      allowExitOnIdle: true,
      ssl: /supabase\.com/i.test(connectionString) ? { rejectUnauthorized: false } : undefined,
    });
    globalForPg.revealeoPgPool.on('error', (err) => {
      console.error('[postgres] pool error', err);
    });
  }
  return globalForPg.revealeoPgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
  return getPool().query<T>(text, params);
}
