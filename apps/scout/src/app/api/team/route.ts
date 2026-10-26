import { NextResponse } from 'next/server';
import { canManageTeam, isSuperAdmin } from '@/lib/admin/roles';
import { getPlatformActor } from '@/lib/saas/session';
import { inviteTeamMember, listTeam, removeTeamMember, updateTeamMember } from '@/lib/saas/team';

export async function GET() {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageTeam(actor.role) || !actor.account) {
    return NextResponse.json({ error: 'Only a Subscriber Admin can manage this workspace team.' }, { status: 403 });
  }
  return NextResponse.json({ rows: await listTeam(actor.account.id), role: actor.role });
}

export async function POST(request: Request) {
  const actor = await getPlatformActor();
  if (!actor?.account || !canManageTeam(actor.role) || isSuperAdmin(actor.role)) {
    return NextResponse.json({ error: 'Only a Subscriber Admin can invite people to this workspace.' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const member = await inviteTeamMember(actor.account, {
      email: String(body.email || ''),
      name: String(body.name || ''),
      password: String(body.password || ''),
      role: String(body.role || ''),
    });
    return NextResponse.json(member);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not invite the user' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const actor = await getPlatformActor();
  if (!actor?.account || !canManageTeam(actor.role)) {
    return NextResponse.json({ error: 'Only a Subscriber Admin can change roles.' }, { status: 403 });
  }
  try {
    const body = await request.json();
    return NextResponse.json(await updateTeamMember(actor.account.id, String(body.user_id || ''), String(body.role || ''), actor.userId));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not update the user' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const actor = await getPlatformActor();
  if (!actor?.account || !canManageTeam(actor.role)) {
    return NextResponse.json({ error: 'Only a Subscriber Admin can remove people.' }, { status: 403 });
  }
  try {
    const body = await request.json();
    return NextResponse.json(await removeTeamMember(actor.account.id, String(body.user_id || ''), actor.userId));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not remove the user' }, { status: 400 });
  }
}
