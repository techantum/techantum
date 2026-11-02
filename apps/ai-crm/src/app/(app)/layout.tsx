import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { crmMode, ensureEnv } from '@/lib/env';
import CrmShell from '@/components/CrmShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  ensureEnv();
  const session = await getSession();
  if (!session) redirect('/login');

  let inboxCount = 0;
  try {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM crm.conversations
       WHERE workspace_id=$1 AND status='open' AND last_message_at IS NOT NULL`,
      [session.workspaceId],
    );
    inboxCount = Number(rows[0]?.count || 0);
  } catch {
    inboxCount = 0;
  }

  return (
    <CrmShell user={session} inboxCount={inboxCount} mode={crmMode()}>
      {children}
    </CrmShell>
  );
}
