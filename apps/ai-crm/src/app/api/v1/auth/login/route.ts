import { login, sessionCookie } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { fail, ok } from '@/lib/http';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim();
    const password = String(body.password || '');
    if (!email || !password) return fail('Email and password required');
    const result = await login(email, password);
    if (!result) return fail('Invalid credentials', 401);
    await writeAudit({
      workspaceId: result.session.workspaceId,
      actorUserId: result.session.id,
      action: 'auth.login',
      targetType: 'user',
      targetId: result.session.id,
      ip: req.headers.get('x-forwarded-for'),
    });
    const res = ok({ user: result.session });
    res.cookies.set(sessionCookie(result.token));
    return res;
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Login failed', 500);
  }
}
