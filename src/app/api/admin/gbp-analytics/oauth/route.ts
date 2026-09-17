import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import {
  getGbpOAuthStatus,
  gbpOAuthRedirectUri,
  saveGbpOAuthClient,
} from '@/lib/gbp/oauth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const status = await getGbpOAuthStatus();
  return NextResponse.json(
    {
      ...status,
      redirectUri: gbpOAuthRedirectUri(),
      canStart: Boolean(status.clientId && status.hasClientSecret),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as {
    clientId?: string;
    clientSecret?: string;
  };

  try {
    await saveGbpOAuthClient({
      clientId: body.clientId || '',
      clientSecret: body.clientSecret,
      updatedBy: auth.user.id,
    });
    const status = await getGbpOAuthStatus();
    return NextResponse.json({
      ok: true,
      ...status,
      redirectUri: gbpOAuthRedirectUri(),
      canStart: Boolean(status.clientId && status.hasClientSecret),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to save OAuth client' },
      { status: 400 }
    );
  }
}


