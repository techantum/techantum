import { Pool, type QueryResultRow } from 'pg';

const globalForPg = globalThis as typeof globalThis & { techantumPgPool?: Pool };

function getConnectionString() {
  return (process.env.DIRECT_URL || process.env.DATABASE_URL || '').trim();
}

export function getPool(): Pool {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error('DIRECT_URL or DATABASE_URL is not set');
  }
  const configured = Number(process.env.PG_POOL_MAX);
  const pgbouncer = /:6543\b|pgbouncer|pooler\.supabase/i.test(connectionString);
  const fallback = pgbouncer ? 3 : 8;
  const max = Math.min(12, Math.max(1, Number.isFinite(configured) && configured > 0 ? configured : fallback));
  if (globalForPg.techantumPgPool && globalForPg.techantumPgPool.options.max !== max) {
    void globalForPg.techantumPgPool.end().catch(() => undefined);
    globalForPg.techantumPgPool = undefined;
  }
  if (!globalForPg.techantumPgPool) {
    globalForPg.techantumPgPool = new Pool({
      connectionString,
      max,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      allowExitOnIdle: true,
      ssl: /supabase\.com/i.test(connectionString) ? { rejectUnauthorized: false } : undefined,
    });
    globalForPg.techantumPgPool.on('error', (err) => {
      console.error('[postgres] pool error', err);
    });
  }
  return globalForPg.techantumPgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
  return getPool().query<T>(text, params);
}
