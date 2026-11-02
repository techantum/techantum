import { clearSessionCookie, getSession } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { ok } from '@/lib/http';

export async function POST() {
  const session = await getSession();
  if (session) {
    await writeAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.id,
      action: 'auth.logout',
      targetType: 'user',
      targetId: session.id,
    });
  }
  const res = ok({ ok: true });
  res.cookies.set(clearSessionCookie());
  return res;
}
