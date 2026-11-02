import pg from 'pg';
import { databaseUrl, ensureEnv } from './env';

type PgPool = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>;
  end: () => Promise<void>;
  connect?: () => Promise<any>;
};

declare global {
  // eslint-disable-next-line no-var
  var __crmPgPool: PgPool | undefined;
}

function loadPg() {
  return pg as unknown as { Pool: new (cfg: object) => PgPool };
}

export function getPool() {
  ensureEnv();
  if (globalThis.__crmPgPool) return globalThis.__crmPgPool;
  const url = databaseUrl();
  const pgLib = loadPg();
  // Supabase session pooler is small; keep CRM footprint tiny and reuse across HMR.
  globalThis.__crmPgPool = new pgLib.Pool({
    connectionString: url,
    ssl: /supabase\.com/i.test(url) ? { rejectUnauthorized: false } : undefined,
    max: 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 20_000,
    allowExitOnIdle: true,
    options: '-c search_path=crm,public',
  });
  return globalThis.__crmPgPool;
}

export async function query<T = any>(text: string, params?: unknown[]) {
  const res = await getPool().query(text, params);
  return res as { rows: T[]; rowCount: number | null };
}

export async function withTransaction<T>(fn: (q: typeof query) => Promise<T>) {
  const client = await (getPool() as any).connect();
  try {
    await client.query('BEGIN');
    const txQuery = async <R = any>(text: string, params?: unknown[]) => {
      const res = await client.query(text, params);
      return res as { rows: R[]; rowCount: number | null };
    };
    const result = await fn(txQuery);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
