import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getProject } from '@/lib/client-requirements/service';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await context.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  await createAdminClient().from('notifications').insert({
    project_id: id,
    audience: 'client',
    type: 'reminder',
    title: 'Requirement reminder',
    message: `Reminder queued for ${project.email}`,
    recipient_email: project.email,
  });
  return NextResponse.json({ message: 'Reminder queued.' });
}
