import { getSession } from '@/lib/auth';
import { getWorkspace, getWorkspaceSettings } from '@/lib/settings';
import { query } from '@/lib/db';
import { crmMode, ensureEnv } from '@/lib/env';
import { ok, unauthorized } from '@/lib/http';

export async function GET() {
  ensureEnv();
  const session = await getSession();
  if (!session) return unauthorized();
  const [workspace, settings, inbox] = await Promise.all([
    getWorkspace(session.workspaceId),
    getWorkspaceSettings(session.workspaceId),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM crm.conversations WHERE workspace_id=$1 AND status='open'`,
      [session.workspaceId],
    ),
  ]);
  return ok({
    user: session,
    workspace,
    settings,
    inboxCount: Number(inbox.rows[0]?.count || 0),
    mode: crmMode(),
    providers: {
      whatsapp: Boolean(process.env.CRM_WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN),
      llm: Boolean(process.env.CRM_LLM_API_KEY || process.env.OPENAI_API_KEY),
      telephony:
        (process.env.CRM_TELEPHONY_PROVIDER || '').toLowerCase() === 'mock'
          ? Boolean(process.env.CRM_TELEPHONY_API_KEY)
          : Boolean(process.env.CRM_TELEPHONY_API_KEY && process.env.CRM_TELEPHONY_BASE_URL),
      database: true,
    },
  });
}
