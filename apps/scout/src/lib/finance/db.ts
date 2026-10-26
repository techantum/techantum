import { types, type PoolClient, type QueryResultRow } from 'pg';
import { getPool } from '@/lib/db/postgres';

types.setTypeParser(types.builtins.DATE, (value) => value);
types.setTypeParser(types.builtins.NUMERIC, (value) => value);

export async function withFinanceTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function financeQuery<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
  return getPool().query<T>(text, params);
}

export type DbClient = PoolClient | { query: PoolClient['query'] };

export async function q<T extends QueryResultRow = QueryResultRow>(
  client: DbClient | undefined,
  text: string,
  params?: unknown[]
) {
  if (client) return client.query<T>(text, params);
  return financeQuery<T>(text, params);
}
