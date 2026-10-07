import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { financeCapability, type FinanceAction } from './capability';

export type { FinanceAction, FinanceCapability } from './access-types';
export { financeCapability } from './capability';

export async function requireFinanceAccess(action: FinanceAction = 'read') {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return { error: auth.error };
  const capability = financeCapability(auth.role);
  if (!capability) {
    return { error: NextResponse.json({ error: 'Finance access required' }, { status: 403 }) };
  }
  if (!capability[action]) {
    return {
      error: NextResponse.json(
        { error: action === 'export' ? 'Export permission required' : 'Finance write access required' },
        { status: 403 }
      ),
    };
  }
  return { ...auth, capability };
}

export function requestMeta(request?: Request) {
  return {
    ip: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers.get('x-real-ip') || null,
    userAgent: request?.headers.get('user-agent') || null,
  };
}
