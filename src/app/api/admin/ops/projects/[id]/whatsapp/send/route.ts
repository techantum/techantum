import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getProject, sendClientMessage } from '@/lib/ops/service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = await request.json();
    const detail = await getProject(id);
    if (!detail) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    const communication = await sendClientMessage({
      clientId: detail.project.client_id,
      projectId: id,
      messageType: body.kind === 'welcome' ? 'welcome' : 'project_update',
      message: String(body.message || ''),
      userId: auth.user.id,
    });
    return NextResponse.json(communication);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send message' }, { status: 400 });
  }
}
