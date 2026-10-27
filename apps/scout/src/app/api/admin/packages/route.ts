import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin/auth';
import { financeErrorResponse } from '@/lib/finance/http';
import { listPackages, savePackage } from '@/lib/saas/catalog';

export async function GET() {
  const auth = await requireSuperAdmin();
  if ('error' in auth) return auth.error;
  return NextResponse.json({ rows: await listPackages() });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if ('error' in auth) return auth.error;
  try {
    const body = await request.json();
    return NextResponse.json(await savePackage(body));
  } catch (err) {
    return financeErrorResponse(err);
  }
}
