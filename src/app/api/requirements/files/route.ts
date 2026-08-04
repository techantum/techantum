import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicRequirement, listRequirementAttachments } from '@/lib/client-requirements/service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const password = url.searchParams.get('password') || '';
  const requirementId = url.searchParams.get('requirementId') || '';
  const payload = await getPublicRequirement(token, password);
  if (payload.requirement.id !== requirementId) {
    return NextResponse.json({ error: 'Requirement mismatch' }, { status: 400 });
  }
  return NextResponse.json(await listRequirementAttachments(requirementId));
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const password = url.searchParams.get('password') || '';
  const requirementId = url.searchParams.get('requirementId') || '';
  const fileId = url.searchParams.get('fileId') || '';
  const payload = await getPublicRequirement(token, password);
  if (payload.requirement.id !== requirementId) {
    return NextResponse.json({ error: 'Requirement mismatch' }, { status: 400 });
  }
  await createAdminClient().from('attachments').delete().eq('id', fileId).eq('requirement_id', requirementId);
  return NextResponse.json({ ok: true });
}
