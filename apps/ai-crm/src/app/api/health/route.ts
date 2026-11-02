import { ensureEnv, crmMode } from '@/lib/env';
import { query } from '@/lib/db';
import { ok, fail } from '@/lib/http';

export async function GET() {
  try {
    ensureEnv();
    await query('SELECT 1');
    return ok({
      status: 'ok',
      app: process.env.CRM_APP_NAME || 'AI Lead CRM',
      mode: crmMode(),
      schema: 'crm',
      port: process.env.CRM_WEB_PORT || '4300',
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'unhealthy', 503);
  }
}
