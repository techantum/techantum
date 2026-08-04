import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { regenerateProjectLink } from '@/lib/client-requirements/service';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await context.params;
  try {
    const project = await regenerateProjectLink(id);
    return NextResponse.json({ token: project.public_token, shareUrl: project.share_url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Link generation failed' }, { status: 400 });
  }
}
