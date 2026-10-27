import { NextResponse } from 'next/server';
import { canManageTeam, isSuperAdmin } from '@/lib/admin/roles';
import { FEATURE_TEAM, resolveAccess } from '@/lib/saas/catalog';
import { getPlatformActor } from '@/lib/saas/session';
import { inviteTeamMember, listTeam, removeTeamMember, updateTeamMember } from '@/lib/saas/team';

async function requireTeamAdmin() {
  const actor = await getPlatformActor();
  if (!actor) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!canManageTeam(actor.role) || !actor.account || isSuperAdmin(actor.role)) {
    return { error: NextResponse.json({ error: 'Only a Subscriber Admin can manage this workspace team.' }, { status: 403 }) };
  }
  const access = await resolveAccess(actor.account, actor.role);
  if (!access.has(FEATURE_TEAM)) {
    return { error: NextResponse.json({ error: 'Team is not included in your package.' }, { status: 402 }) };
  }
  return actor;
}

export async function GET() {
  const actor = await requireTeamAdmin();
  if ('error' in actor) return actor.error;
  return NextResponse.json({ rows: await listTeam(actor.account.id), role: actor.role });
}

export async function POST(request: Request) {
  const actor = await requireTeamAdmin();
  if ('error' in actor) return actor.error;
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
  const actor = await requireTeamAdmin();
  if ('error' in actor) return actor.error;
  try {
    const body = await request.json();
    return NextResponse.json(await updateTeamMember(actor.account.id, String(body.user_id || ''), String(body.role || ''), actor.userId));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not update the user' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const actor = await requireTeamAdmin();
  if ('error' in actor) return actor.error;
  try {
    const body = await request.json();
    return NextResponse.json(await removeTeamMember(actor.account.id, String(body.user_id || ''), actor.userId));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not remove the user' }, { status: 400 });
  }
}
