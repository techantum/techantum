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
  if (!globalForPg.techantumPgPool) {
    globalForPg.techantumPgPool = new Pool({
      connectionString,
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
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
