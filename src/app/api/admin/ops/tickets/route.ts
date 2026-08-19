import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createTicket, listTickets } from '@/lib/ops/service';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const url = new URL(request.url);
    return NextResponse.json(
      await listTickets({
        status: url.searchParams.get('status') ?? undefined,
        type: url.searchParams.get('type') ?? undefined,
        clientId: url.searchParams.get('clientId') ?? undefined,
        projectId: url.searchParams.get('projectId') ?? undefined,
        projectType: url.searchParams.get('projectType') ?? undefined,
        search: url.searchParams.get('search') ?? undefined,
        from: url.searchParams.get('from') ?? undefined,
        to: url.searchParams.get('to') ?? undefined,
      })
    );
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load tickets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const body = await request.json();
    return NextResponse.json(await createTicket(body, auth.user.id));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create ticket' }, { status: 400 });
  }
}
